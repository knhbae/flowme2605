'use client';

import React, {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

import { FlowBottomSheet } from './FlowExecutionPrimitives';

export type FlowContextDisclosureKind = 'help' | 'caution';
export type FlowContextDisclosurePresentation =
  | 'mobile-sheet'
  | 'desktop-popover'
  | 'desktop-dialog';

export type FlowContextDisclosureProps = {
  kind: FlowContextDisclosureKind;
  label: string;
  title: string;
  children: ReactNode;
  eyebrow?: string;
  testId?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

type FocusTarget = {
  focus: (options?: FocusOptions) => void;
};

const DESKTOP_DISCLOSURE_QUERY = '(min-width: 768px)';
const DESKTOP_POPOVER_WIDTH = 320;
const VIEWPORT_GUTTER = 16;
const ANCHOR_GAP = 8;

/** @internal Shared with focused contract tests. */
export function resolveFlowContextDisclosurePresentation(
  kind: FlowContextDisclosureKind,
  desktop: boolean,
): FlowContextDisclosurePresentation {
  if (!desktop) return 'mobile-sheet';
  return kind === 'help' ? 'desktop-popover' : 'desktop-dialog';
}

/** @internal Shared with focused interaction tests. */
export function isFlowContextDisclosureEscape(key: string): boolean {
  return key === 'Escape';
}

/** @internal Shared with focused interaction tests. */
export function isFlowContextDisclosureOutside(
  container: { contains: (target: Node) => boolean } | null,
  target: EventTarget | null,
): boolean {
  return Boolean(container && target && !container.contains(target as Node));
}

/** @internal Shared with focused interaction tests. */
export function restoreFlowContextDisclosureFocus(target: FocusTarget | null): void {
  target?.focus({ preventScroll: true });
}

function getInitialDesktopMatch(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DESKTOP_DISCLOSURE_QUERY).matches;
}

function useDesktopDisclosureSurface(): boolean {
  const [desktop, setDesktop] = useState(getInitialDesktopMatch);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(DESKTOP_DISCLOSURE_QUERY);
    const update = () => setDesktop(media.matches);
    update();
    if (media.addEventListener) media.addEventListener('change', update);
    else media.addListener?.(update);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', update);
      else media.removeListener?.(update);
    };
  }, []);

  return desktop;
}

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getClientRects().length > 0);
}

/**
 * Opens optional context without giving help and warnings the same weight.
 *
 * `help` is for optional choice guidance. `caution` is reserved for loss,
 * irreversible results, or compatibility consequences and must not hide a
 * required inline error or required input.
 */
export function FlowContextDisclosure({
  kind,
  label,
  title,
  children,
  eyebrow,
  testId = 'flow-context-disclosure',
  defaultOpen = false,
  open,
  onOpenChange,
  className = '',
}: FlowContextDisclosureProps) {
  const reactId = useId();
  const idStem = `flow-context-${reactId.replace(/:/g, '')}`;
  const triggerId = `${idStem}-trigger`;
  const dialogId = `${idStem}-dialog`;
  const headingId = `${idStem}-heading`;
  const detailId = `${idStem}-detail`;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({
    left: VIEWPORT_GUTTER,
    top: VIEWPORT_GUTTER,
    width: DESKTOP_POPOVER_WIDTH,
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const desktopSurfaceRef = useRef<HTMLElement | null>(null);
  const isDesktop = useDesktopDisclosureSurface();
  const isOpen = open ?? internalOpen;
  const presentation = resolveFlowContextDisclosurePresentation(kind, isDesktop);

  const setOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (!isOpen || !isDesktop) return;

    const previousOverflow = document.body.style.overflow;
    if (kind === 'caution') document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      desktopSurfaceRef.current?.focus({ preventScroll: true });
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (!isFlowContextDisclosureEscape(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    const closeHelpOutside = (event: MouseEvent) => {
      if (kind !== 'help') return;
      if (!isFlowContextDisclosureOutside(wrapperRef.current, event.target)) return;
      setOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape, true);
    document.addEventListener('click', closeHelpOutside, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', closeOnEscape, true);
      document.removeEventListener('click', closeHelpOutside, true);
      if (kind === 'caution') document.body.style.overflow = previousOverflow;
      restoreFlowContextDisclosureFocus(triggerRef.current);
    };
  }, [isDesktop, isOpen, kind]);

  useEffect(() => {
    if (!isOpen || presentation !== 'desktop-popover') return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const surface = desktopSurfaceRef.current;
      if (!trigger || !surface) return;
      const anchor = trigger.getBoundingClientRect();
      const width = Math.min(
        DESKTOP_POPOVER_WIDTH,
        Math.max(0, window.innerWidth - VIEWPORT_GUTTER * 2),
      );
      const maxHeight = Math.max(160, window.innerHeight - VIEWPORT_GUTTER * 2);
      const panelHeight = Math.min(surface.scrollHeight, maxHeight);
      const left = Math.min(
        Math.max(VIEWPORT_GUTTER, anchor.right - width),
        Math.max(VIEWPORT_GUTTER, window.innerWidth - width - VIEWPORT_GUTTER),
      );
      const fitsBelow = anchor.bottom + ANCHOR_GAP + panelHeight <=
        window.innerHeight - VIEWPORT_GUTTER;
      const top = fitsBelow
        ? anchor.bottom + ANCHOR_GAP
        : Math.max(VIEWPORT_GUTTER, anchor.top - ANCHOR_GAP - panelHeight);
      setPopoverStyle({ left, top, width, maxHeight });
    };

    const positionFrame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(positionFrame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, presentation]);

  const handleDesktopDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (presentation !== 'desktop-dialog' || event.key !== 'Tab') return;
    const focusable = getFocusableElements(desktopSurfaceRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      desktopSurfaceRef.current?.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === desktopSurfaceRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === desktopSurfaceRef.current) {
      event.preventDefault();
      first.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const triggerToneClass = kind === 'caution'
    ? 'border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] text-[var(--flowme-warning-strong)] hover:bg-amber-100'
    : 'border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] text-[var(--flowme-action)] hover:bg-[var(--flowme-action-soft)]';
  const eyebrowToneClass = kind === 'caution'
    ? 'text-[var(--flowme-warning-strong)]'
    : 'text-[var(--flowme-action)]';

  const desktopContent = (
    <>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className={`text-xs font-semibold ${eyebrowToneClass}`}>{eyebrow}</p>
          ) : null}
          <h2 id={headingId} className="mt-1 break-keep text-base font-semibold text-[var(--flowme-text)]">
            {title}
          </h2>
        </div>
        <button
          type="button"
          data-testid={`${testId}-desktop-close`}
          className="inline-flex h-12 w-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--flowme-border)] bg-[var(--flowme-surface)] text-sm font-semibold text-[var(--flowme-text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
          aria-label={`${title} 닫기`}
          onClick={() => setOpen(false)}
        >
          닫기
        </button>
      </header>
      <div
        id={detailId}
        data-testid={`${testId}-detail`}
        className="mt-3 text-sm leading-6 text-[var(--flowme-text-secondary)]"
      >
        {children}
      </div>
    </>
  );

  return (
    <div ref={wrapperRef} className="relative inline-flex shrink-0">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        data-testid={`${testId}-trigger`}
        data-flow-context-trigger={triggerId}
        data-flow-context-kind={kind}
        data-flow-context-semantics={kind === 'caution' ? 'warning' : 'optional-help'}
        className={`inline-flex h-12 w-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full border text-base font-bold leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] focus-visible:ring-offset-2 ${triggerToneClass} ${className}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        onClick={() => setOpen(!isOpen)}
      >
        <span aria-hidden="true">{kind === 'caution' ? '!' : '?'}</span>
      </button>

      {isOpen && presentation === 'mobile-sheet' ? (
        <FlowBottomSheet
          testId={`${testId}-sheet`}
          headingId={headingId}
          eyebrow={eyebrow}
          title={title}
          onClose={() => setOpen(false)}
          returnFocusSelector={`[data-flow-context-trigger="${triggerId}"]`}
          dialogProps={{
            id: dialogId,
            'aria-describedby': detailId,
            'data-flow-context-kind': kind,
            'data-flow-context-semantics': kind === 'caution' ? 'warning' : 'optional-help',
            'data-flow-context-presentation': presentation,
            'data-flow-context-dismiss': 'escape backdrop close',
            'data-flow-context-return-focus': triggerId,
          }}
        >
          <div
            id={detailId}
            data-testid={`${testId}-detail`}
            className="mt-4 text-sm leading-6 text-[var(--flowme-text-secondary)]"
          >
            {children}
          </div>
        </FlowBottomSheet>
      ) : null}

      {isOpen && presentation === 'desktop-popover' ? (
        <section
          ref={desktopSurfaceRef}
          id={dialogId}
          tabIndex={-1}
          role="dialog"
          aria-labelledby={headingId}
          aria-describedby={detailId}
          data-testid={`${testId}-popover`}
          data-flow-ui="anchored-popover"
          data-flow-context-kind={kind}
          data-flow-context-presentation={presentation}
          data-flow-context-anchor={triggerId}
          data-flow-context-dismiss="escape outside close"
          data-flow-context-return-focus={triggerId}
          style={popoverStyle}
          className="fixed z-[90] overflow-y-auto rounded-2xl border border-[var(--flowme-border)] bg-[var(--flowme-surface)] p-4 text-left shadow-xl"
        >
          {desktopContent}
        </section>
      ) : null}

      {isOpen && presentation === 'desktop-dialog' ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 p-4"
          data-flow-ui="modal-dialog-layer"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label={`${title} 닫기`}
            data-testid={`${testId}-desktop-backdrop`}
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpen(false)}
          />
          <section
            ref={desktopSurfaceRef}
            id={dialogId}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            aria-describedby={detailId}
            data-testid={`${testId}-dialog`}
            data-flow-ui="modal-dialog"
            data-flow-context-kind={kind}
            data-flow-context-presentation={presentation}
            data-flow-context-dismiss="escape backdrop close"
            data-flow-context-return-focus={triggerId}
            className="relative z-[1] max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--flowme-border)] bg-[var(--flowme-surface)] p-5 text-left shadow-2xl"
            onKeyDown={handleDesktopDialogKeyDown}
          >
            {desktopContent}
          </section>
        </div>
      ) : null}
    </div>
  );
}
