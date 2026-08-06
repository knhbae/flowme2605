'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createFlowEditorSession,
  executeFlowEditorCommit,
  getActiveFlowEditorTransaction,
  reduceFlowEditorSession,
  type FlowEditorCloseEvent,
  type FlowEditorCommitHandlers,
  type FlowEditorEffect,
  type FlowEditorEvent,
  type FlowEditorReturnPoint,
  type FlowEditorSession,
  type OpenFlowEditorItemInput,
  type OpenFlowEditorPlanInput,
} from '../../lib/flow/flow-editor-transaction';

type FlowEditorControllerOptions<PlanDraft, ItemDraft> = Readonly<{
  handlers: FlowEditorCommitHandlers<PlanDraft, ItemDraft>;
  onRestoreReturnPoint?: (
    returnPoint: FlowEditorReturnPoint,
    cause: Extract<FlowEditorEffect<PlanDraft, ItemDraft>, { type: 'restore-return-point' }>['cause'],
  ) => void;
  onTransactionClosed?: (
    level: Extract<FlowEditorEffect<PlanDraft, ItemDraft>, { type: 'restore-return-point' }>['level'],
    cause: Extract<FlowEditorEffect<PlanDraft, ItemDraft>, { type: 'restore-return-point' }>['cause'],
  ) => void;
  onRearmHistoryBoundary?: (returnPoint: FlowEditorReturnPoint) => void;
  onCloseBlocked?: (message: string) => void;
  onCommitSucceeded?: (level: 'plan' | 'item') => void;
}>;

let returnPointCaptureSequence = 0;

function createFlowEditorReturnToken(targetKey: string): string {
  returnPointCaptureSequence += 1;
  const nonce = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${returnPointCaptureSequence.toString(36)}`;
  return `${targetKey}:${returnPointCaptureSequence.toString(36)}:${nonce}`;
}

function getUsefulActiveReturnTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const activeElement = document.activeElement;
  if (
    !(activeElement instanceof HTMLElement) ||
    activeElement === document.body ||
    activeElement === document.documentElement ||
    !activeElement.isConnected ||
    activeElement.closest('[inert], [hidden], [aria-hidden="true"]') ||
    activeElement.matches(':disabled, [aria-disabled="true"]')
  ) {
    return null;
  }
  const isNativeFocusTarget = activeElement.matches(
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, object, embed, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"])',
  );
  return isNativeFocusTarget || activeElement.tabIndex >= 0 ? activeElement : null;
}

export function captureFlowEditorReturnPoint(input: Readonly<{
  targetKey: string;
  fallbackSelector?: string;
  scrollTargets?: readonly Readonly<{ targetKey: string; selector: string }>[];
  captureActiveElement?: boolean;
}>): FlowEditorReturnPoint {
  const returnToken = createFlowEditorReturnToken(input.targetKey);
  if (input.captureActiveElement !== false) {
    const returnTarget = getUsefulActiveReturnTarget();
    if (returnTarget) returnTarget.dataset.flowEditorReturnKey = returnToken;
  }
  const location = typeof window === 'undefined'
    ? { route: '/', query: '' }
    : {
        route: window.location.pathname,
        query: window.location.search,
        hash: window.location.hash,
        historyEntryKey:
          typeof window.history.state?.key === 'string' ? window.history.state.key : undefined,
      };
  return {
    location,
    scroll: [
      {
        targetKey: 'window',
        left: typeof window === 'undefined' ? 0 : window.scrollX,
        top: typeof window === 'undefined' ? 0 : window.scrollY,
      },
      ...(typeof document === 'undefined'
        ? []
        : (input.scrollTargets ?? []).flatMap((target) => {
            const element = document.querySelector<HTMLElement>(target.selector);
            return element
              ? [{ targetKey: target.targetKey, left: element.scrollLeft, top: element.scrollTop }]
              : [];
          })),
    ],
    focus: {
      targetKey: returnToken,
      ...(input.fallbackSelector ? { fallbackSelector: input.fallbackSelector } : {}),
    },
  };
}

function restoreFlowEditorReturnPoint(returnPoint: FlowEditorReturnPoint) {
  if (typeof window === 'undefined') return;
  const expectedHref = `${returnPoint.location.route}${returnPoint.location.query}${returnPoint.location.hash ?? ''}`;
  const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (expectedHref !== currentHref) {
    window.history.replaceState(window.history.state, '', expectedHref);
  }
  const windowScroll = returnPoint.scroll.find((entry) => entry.targetKey === 'window');
  if (windowScroll) window.scrollTo(windowScroll.left, windowScroll.top);
  const focusSelector = returnPoint.focus.fallbackSelector;
  const scheduleRestore = () => window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      for (const scroll of returnPoint.scroll) {
        if (scroll.targetKey === 'window') continue;
        const element = document.querySelector<HTMLElement>(
          `[data-flow-editor-scroll-key="${CSS.escape(scroll.targetKey)}"]`,
        );
        if (element) element.scrollTo(scroll.left, scroll.top);
      }
      const exactTarget = document.querySelector<HTMLElement>(
        `[data-flow-editor-return-key="${CSS.escape(returnPoint.focus.targetKey)}"]`,
      );
      const fallbackTarget = focusSelector
        ? Array.from(document.querySelectorAll<HTMLElement>(focusSelector))
            .find((element) => element.getClientRects().length > 0 && !element.matches(':disabled'))
        : null;
      const target = exactTarget?.getClientRects().length ? exactTarget : fallbackTarget;
      exactTarget?.removeAttribute('data-flow-editor-return-key');
      target?.focus({ preventScroll: true });
    });
  });
  // App surfaces remove their synthetic editor history entry after the
  // transaction closes. Restore once now and once after that immediate
  // popstate so the browser navigation cannot erase the final focus/scroll.
  const restoreAfterPopState = () => scheduleRestore();
  window.addEventListener('popstate', restoreAfterPopState, { once: true });
  window.setTimeout(() => {
    window.removeEventListener('popstate', restoreAfterPopState);
  }, 250);
  scheduleRestore();
}

export function useFlowEditorController<PlanDraft, ItemDraft>(
  options: FlowEditorControllerOptions<PlanDraft, ItemDraft>,
) {
  const [session, setSession] = useState<FlowEditorSession<PlanDraft, ItemDraft> | null>(null);
  const sessionRef = useRef(session);
  const optionsRef = useRef(options);
  const requestSequenceRef = useRef(0);
  const dispatchRef = useRef<(
    event: FlowEditorEvent<PlanDraft, ItemDraft>,
  ) => void>(() => undefined);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const runEffects = useCallback((effects: readonly FlowEditorEffect<PlanDraft, ItemDraft>[]) => {
    for (const effect of effects) {
      switch (effect.type) {
        case 'commit': {
          void executeFlowEditorCommit(effect, optionsRef.current.handlers).then((result) => {
            dispatchRef.current(result);
            if (result.type === 'commit-succeeded') {
              optionsRef.current.onCommitSucceeded?.(effect.level);
            }
          });
          break;
        }
        case 'restore-return-point': {
          // Start the owning surface/history close before scheduling the
          // double-rAF restore. Otherwise a later popstate/unmount can erase
          // the focus that was just restored to the parent editor.
          optionsRef.current.onTransactionClosed?.(effect.level, effect.cause);
          const restore = optionsRef.current.onRestoreReturnPoint ?? restoreFlowEditorReturnPoint;
          restore(effect.returnPoint, effect.cause);
          break;
        }
        case 'focus-target': {
          if (typeof window === 'undefined') break;
          const focusTarget = (attempt = 0) => {
            window.requestAnimationFrame(() => {
              const surface = Array.from(document.querySelectorAll<HTMLElement>(
                '[data-flow-editor-surface="true"]',
              )).filter((element) => element.getClientRects().length > 0).at(-1);
              const target = surface?.matches(effect.target)
                ? surface
                : surface?.querySelector<HTMLElement>(effect.target);
              if (target) {
                target.focus({ preventScroll: true });
                return;
              }
              // Async storage commits can resolve before React mounts the
              // recoverable-error summary. Retry briefly so the announced
              // error also receives keyboard focus once it exists.
              if (attempt < 4) {
                window.setTimeout(() => focusTarget(attempt + 1), 25);
              }
            });
          };
          focusTarget();
          break;
        }
        case 'rearm-history-boundary':
          optionsRef.current.onRearmHistoryBoundary?.(effect.returnPoint);
          break;
        case 'announce-close-blocked':
          optionsRef.current.onCloseBlocked?.(effect.message);
          break;
        case 'show-discard-confirmation':
          // The pendingClose state is rendered by the shared surface.
          break;
      }
    }
  }, []);

  const dispatch = useCallback((event: FlowEditorEvent<PlanDraft, ItemDraft>) => {
    const current = sessionRef.current;
    if (!current) return;
    const transition = reduceFlowEditorSession(current, event);
    sessionRef.current = transition.state;
    setSession(transition.state);
    runEffects(transition.effects);
    const active = getActiveFlowEditorTransaction(transition.state);
    if (active?.status === 'success') {
      queueMicrotask(() => dispatchRef.current({ type: 'settle-success' }));
    }
  }, [runEffects]);

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  const openPlan = useCallback((input: OpenFlowEditorPlanInput<PlanDraft>) => {
    const next = createFlowEditorSession<PlanDraft, ItemDraft>(input);
    sessionRef.current = next;
    setSession(next);
  }, []);

  const closeSession = useCallback(() => {
    sessionRef.current = null;
    setSession(null);
  }, []);

  const openItem = useCallback((input: OpenFlowEditorItemInput<ItemDraft>) => {
    dispatch({ type: 'open-item', input });
  }, [dispatch]);

  const replacePlanDraft = useCallback((
    draft: PlanDraft,
    validation: Extract<FlowEditorEvent<PlanDraft, ItemDraft>, { type: 'replace-plan-draft' }>['validation'],
  ) => {
    dispatch({ type: 'replace-plan-draft', draft, validation });
  }, [dispatch]);

  const updatePlanDraft = useCallback((
    updater: (draft: Readonly<PlanDraft>) => PlanDraft,
    validate: (draft: Readonly<PlanDraft>) => Extract<
      FlowEditorEvent<PlanDraft, ItemDraft>,
      { type: 'replace-plan-draft' }
    >['validation'],
  ) => {
    const current = sessionRef.current?.plan?.draft;
    if (!current) return;
    const draft = updater(current);
    dispatch({ type: 'replace-plan-draft', draft, validation: validate(draft) });
  }, [dispatch]);

  const replaceItemDraft = useCallback((
    draft: ItemDraft,
    validation: Extract<FlowEditorEvent<PlanDraft, ItemDraft>, { type: 'replace-item-draft' }>['validation'],
  ) => {
    dispatch({ type: 'replace-item-draft', draft, validation });
  }, [dispatch]);

  const updateItemDraft = useCallback((
    updater: (draft: Readonly<ItemDraft>) => ItemDraft,
    validate: (draft: Readonly<ItemDraft>) => Extract<
      FlowEditorEvent<PlanDraft, ItemDraft>,
      { type: 'replace-item-draft' }
    >['validation'],
  ) => {
    const current = sessionRef.current?.item?.draft;
    if (!current) return;
    const draft = updater(current);
    dispatch({ type: 'replace-item-draft', draft, validation: validate(draft) });
  }, [dispatch]);

  const requestClose = useCallback((event: FlowEditorCloseEvent) => {
    dispatch({ type: 'request-close', event });
  }, [dispatch]);

  const requestCommit = useCallback(() => {
    requestSequenceRef.current += 1;
    dispatch({
      type: 'request-commit',
      requestId: `flow-editor-${Date.now()}-${requestSequenceRef.current}`,
    });
  }, [dispatch]);

  const continueEditing = useCallback(() => {
    dispatch({ type: 'continue-editing' });
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const surface = Array.from(document.querySelectorAll<HTMLElement>(
        '[data-flow-editor-surface="true"]',
      )).filter((element) => element.getClientRects().length > 0).at(-1);
      surface?.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
      )?.focus({ preventScroll: true });
    });
  }, [dispatch]);
  const discardChanges = useCallback(() => dispatch({ type: 'discard-changes' }), [dispatch]);

  return {
    session,
    active: session ? getActiveFlowEditorTransaction(session) : null,
    openPlan,
    openItem,
    closeSession,
    replacePlanDraft,
    updatePlanDraft,
    replaceItemDraft,
    updateItemDraft,
    requestClose,
    requestCommit,
    continueEditing,
    discardChanges,
  } as const;
}
