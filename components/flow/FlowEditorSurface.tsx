'use client';

import React, {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

import {
  FlowBottomSheet,
  type FlowBottomSheetCloseCause,
} from './FlowExecutionPrimitives';
import {
  FLOW_UI_DANGER_ACTION_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from './flow-ui';
import type { FlowEditorSemanticRole } from '@/lib/flow/flow-editor-schema';
import type {
  FlowEditorCommitRole,
  FlowEditorContext,
  FlowEditorLevel,
  FlowEditorStatus,
} from '@/lib/flow/flow-editor-transaction';

export type FlowEditorSurfaceLayout =
  | 'responsive'
  | 'mobile-full-screen'
  | 'wide-inspector'
  | 'wide-detail-pane';

export type FlowEditorSurfaceAction = Readonly<{
  label: string;
  onAction: () => void;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
}>;

export type FlowEditorSurfaceError = Readonly<{
  id: string;
  message: string;
  fieldId?: string;
}>;

export type FlowEditorSurfaceErrorSummary = Readonly<{
  title: string;
  errors: readonly FlowEditorSurfaceError[];
  testId?: string;
}>;

export type FlowEditorDiscardConfirmation = Readonly<{
  open: boolean;
  title?: string;
  description?: string;
  continueLabel?: string;
  discardLabel?: string;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
  testId?: string;
}>;

export type FlowEditorSurfaceProps = Readonly<{
  testId: string;
  headingId: string;
  context: FlowEditorContext;
  level: FlowEditorLevel;
  status: FlowEditorStatus;
  layout: FlowEditorSurfaceLayout;
  semanticRole: FlowEditorSemanticRole;
  commitRole: FlowEditorCommitRole;
  eyebrow?: string;
  title: string;
  marker?: string;
  p35Marker?: string;
  dismissible?: boolean;
  initialFocusSelector?: string;
  returnFocusSelector?: string;
  onRequestClose: (cause: FlowBottomSheetCloseCause) => void;
  errorSummary?: FlowEditorSurfaceErrorSummary;
  discardConfirmation?: FlowEditorDiscardConfirmation;
  cancelAction: FlowEditorSurfaceAction;
  primaryAction: FlowEditorSurfaceAction;
  retryAction?: FlowEditorSurfaceAction;
  dialogProps?: Omit<
    ComponentPropsWithoutRef<'section'>,
    'children' | 'className' | 'role' | 'aria-modal' | 'aria-labelledby'
  > & {
    [key: `data-${string}`]: string | number | undefined;
  };
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}>;

const EDITOR_LAYOUT_CLASS: Record<FlowEditorSurfaceLayout, string> = {
  responsive:
    'inset-0 flex max-h-none flex-col overflow-hidden rounded-none md:inset-x-auto md:inset-y-0 md:left-auto md:right-0 md:w-[min(42rem,100vw)] md:rounded-none md:border-l md:border-[var(--flowme-border)]',
  'mobile-full-screen': 'inset-0 flex max-h-none flex-col overflow-hidden rounded-none',
  'wide-inspector':
    'inset-y-0 left-auto right-0 flex w-[min(42rem,100vw)] max-h-none flex-col overflow-hidden rounded-none border-l border-[var(--flowme-border)]',
  'wide-detail-pane':
    'inset-y-0 left-auto right-0 flex w-[min(42rem,100vw)] max-h-none flex-col overflow-hidden rounded-none border-l border-[var(--flowme-border)]',
};

/**
 * Editor commit actions must describe Save or Apply. "완료" is reserved for
 * Item execution state and must never be used as an editor commit label.
 */
export function assertFlowEditorCommitLabel(label: string): string {
  const normalized = label.trim();
  if (!normalized) {
    throw new TypeError('Flow editor commit label must not be empty');
  }
  if (normalized.includes('완료')) {
    throw new TypeError('Flow editor commit label must not contain "완료"');
  }
  return normalized;
}

export function FlowEditorSurface({
  testId,
  headingId,
  context,
  level,
  status,
  layout,
  semanticRole,
  commitRole,
  eyebrow,
  title,
  marker,
  p35Marker = 'P35-P0-06-SHARED-EDITOR-SURFACE',
  dismissible = true,
  initialFocusSelector,
  returnFocusSelector,
  onRequestClose,
  errorSummary,
  discardConfirmation,
  cancelAction,
  primaryAction,
  retryAction,
  dialogProps,
  className = '',
  bodyClassName = '',
  children,
}: FlowEditorSurfaceProps) {
  const primaryLabel = assertFlowEditorCommitLabel(primaryAction.label);
  const discardOpen = Boolean(discardConfirmation?.open);
  const discardContinueRef = useRef<HTMLButtonElement | null>(null);
  const discardButtonRef = useRef<HTMLButtonElement | null>(null);
  const discardReturnFocusRef = useRef<HTMLElement | null>(null);
  const errorSummaryId = `${headingId}-error-summary`;
  const discardHeadingId = `${headingId}-discard-heading`;
  const discardDescriptionId = discardConfirmation?.description
    ? `${headingId}-discard-description`
    : undefined;
  const visibleErrorSummary: FlowEditorSurfaceErrorSummary | undefined = errorSummary ?? (status === 'dirty-invalid'
    ? {
        title: '확인이 필요한 항목이 있습니다',
        errors: [{ id: 'invalid-draft', message: '표시된 항목을 확인한 뒤 다시 시도해 주세요.' }],
      }
    : undefined);
  const commitBlocked =
    discardOpen || status === 'submitting' || status === 'success' || status === 'recovery-required';
  const retryBlocked = discardOpen || status === 'submitting' || status === 'recovery-required';
  const hasUncommittedDraft = status !== 'clean' && status !== 'success';
  const editorLocked = status === 'submitting' || status === 'recovery-required';

  useEffect(() => {
    if (!discardOpen) return;
    const activeElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    discardReturnFocusRef.current = activeElement?.closest(
      '[data-flow-editor-surface="true"]',
    )?.getAttribute('data-testid') === testId
      ? activeElement
      : null;
    const frame = window.requestAnimationFrame(() => {
      discardContinueRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [discardOpen]);

  const continueEditing = () => {
    const returnTarget = discardReturnFocusRef.current;
    discardConfirmation?.onContinueEditing();
    window.requestAnimationFrame(() => {
      if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
    });
  };

  const handleDiscardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      continueEditing();
      return;
    }
    if (event.key !== 'Tab') return;
    const first = discardContinueRef.current;
    const last = discardButtonRef.current;
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <FlowBottomSheet
      testId={testId}
      headingId={headingId}
      marker={marker}
      p35Marker={p35Marker}
      eyebrow={eyebrow}
      title={title}
      onClose={() => onRequestClose('x')}
      onRequestClose={onRequestClose}
      dismissible={dismissible && !discardOpen}
      initialFocusSelector={initialFocusSelector}
      returnFocusSelector={returnFocusSelector}
      layerClassName="z-[100]"
      dialogProps={{
        ...dialogProps,
        'aria-busy': status === 'submitting' ? 'true' : undefined,
        'aria-describedby': visibleErrorSummary?.errors.length ? errorSummaryId : undefined,
        'data-editor-context': context,
        'data-editor-level': level,
        'data-editor-status': status,
        'data-editor-layout': layout,
        'data-editor-semantic-role': semanticRole,
        'data-editor-commit-role': commitRole,
        'data-editor-dirty': hasUncommittedDraft ? 'true' : 'false',
        'data-editor-frame': 'shared',
        'data-editor-adapter': 'shared',
        'data-flow-editor-surface': 'true',
        'data-editor-transaction': level === 'plan' ? 'atomic' : 'atomic-child',
      }}
      className={`${EDITOR_LAYOUT_CLASS[layout]} ${className}`}
    >
      <div className={`mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 pr-1 ${bodyClassName}`}>
        {visibleErrorSummary?.errors.length ? (
          <section
            id={errorSummaryId}
            data-testid={visibleErrorSummary.testId ?? `${testId}-error-summary`}
            data-editor-error-summary="true"
            role="alert"
            tabIndex={-1}
            className="mb-4 border-l-2 border-[var(--flowme-danger)] bg-[var(--flowme-danger-soft)] px-3 py-3 text-[var(--flowme-danger-strong)]"
          >
            <h3 className="text-sm font-semibold">{visibleErrorSummary.title}</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm font-medium">
              {visibleErrorSummary.errors.map((error) => (
                <li
                  key={error.id}
                  data-editor-error-id={error.id}
                  data-editor-error-field={error.fieldId}
                >
                  {error.message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <fieldset
          disabled={editorLocked}
          aria-disabled={editorLocked ? 'true' : undefined}
          data-editor-fields-locked={editorLocked ? 'true' : 'false'}
          className="m-0 min-w-0 border-0 p-0"
        >
          {children}
        </fieldset>
      </div>

      <footer
        data-testid={`${testId}-actions`}
        data-editor-actions-sticky="true"
        className="shrink-0 border-t border-[var(--flowme-border)] bg-[var(--flowme-surface)] pt-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            data-testid={cancelAction.testId ?? `${testId}-cancel`}
            data-editor-action-role="cancel"
            aria-label={cancelAction.ariaLabel}
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            disabled={discardOpen || cancelAction.disabled}
            onClick={cancelAction.onAction}
          >
            {cancelAction.label}
          </button>
          <div className="flex flex-wrap justify-end gap-2">
            {retryAction ? (
              <button
                type="button"
                data-testid={retryAction.testId ?? `${testId}-retry`}
                data-editor-action-role="retry"
                aria-label={retryAction.ariaLabel}
                className={FLOW_UI_SECONDARY_ACTION_CLASS}
                disabled={retryBlocked || retryAction.disabled}
                onClick={retryAction.onAction}
              >
                {retryAction.label}
              </button>
            ) : null}
            <button
              type="button"
              data-testid={primaryAction.testId ?? `${testId}-primary`}
              data-editor-action-role="commit"
              data-editor-commit-role={commitRole}
              aria-label={primaryAction.ariaLabel}
              className={FLOW_UI_PRIMARY_ACTION_CLASS}
              disabled={commitBlocked || primaryAction.disabled}
              onClick={primaryAction.onAction}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </footer>

      {discardOpen && discardConfirmation ? (
        <div
          data-testid={discardConfirmation.testId ?? `${testId}-discard-confirmation`}
          data-editor-discard-confirmation="true"
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 px-4 py-6"
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={discardHeadingId}
            aria-describedby={discardDescriptionId}
            className="w-full max-w-sm rounded-lg border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] p-4 shadow-xl"
            onKeyDown={handleDiscardKeyDown}
          >
            <h3 id={discardHeadingId} className="break-keep text-base font-semibold text-[var(--flowme-text)]">
              {discardConfirmation.title ?? '저장하지 않은 변경을 버릴까요?'}
            </h3>
            {discardConfirmation.description ? (
              <p id={discardDescriptionId} className="mt-2 break-keep text-sm font-medium text-[var(--flowme-text-secondary)]">
                {discardConfirmation.description}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                ref={discardContinueRef}
                type="button"
                data-testid={`${testId}-continue-editing`}
                data-editor-discard-action="continue-editing"
                className={FLOW_UI_SECONDARY_ACTION_CLASS}
                onClick={continueEditing}
              >
                {discardConfirmation.continueLabel ?? '계속 수정'}
              </button>
              <button
                ref={discardButtonRef}
                type="button"
                data-testid={`${testId}-discard-changes`}
                data-editor-discard-action="discard-changes"
                className={FLOW_UI_DANGER_ACTION_CLASS}
                onClick={discardConfirmation.onDiscardChanges}
              >
                {discardConfirmation.discardLabel ?? '변경 버리기'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </FlowBottomSheet>
  );
}
