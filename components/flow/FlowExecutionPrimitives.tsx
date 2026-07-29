'use client';

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

import {
  FLOW_UI_EXECUTION_ROW_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
  FLOW_UI_SHEET_CLASS,
  FLOW_UI_SURFACE_CLASS,
} from './flow-ui';
import { formatKoreanShortDate } from '@/lib/flow/date';

export function FlowArtifactSummary({
  eyebrow,
  categoryLabel,
  title,
  sourceLabel,
  sourceHref,
}: {
  eyebrow: string;
  categoryLabel?: string;
  title: string;
  sourceLabel?: string;
  sourceHref?: string;
}) {
  return (
    <header
      data-flow-ui="artifact-summary"
      data-flow-anatomy="flow-identity"
      data-p29-marker="P29-CONSISTENT-FLOW-IDENTITY"
    >
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--flowme-text-secondary)]">
        <span className="text-[var(--flowme-action)]">{eyebrow}</span>
        {categoryLabel ? <span>{categoryLabel}</span> : null}
      </p>
      <h1 data-flow-identity-slot="title" className="mt-2 max-w-4xl break-keep text-2xl font-semibold text-[var(--flowme-text)] sm:text-3xl">
        {title}
      </h1>
      {sourceLabel ? (
        <p data-flow-identity-slot="source" className="mt-2 max-w-3xl text-xs font-medium text-[var(--flowme-text-secondary)]">
          <span className="text-[var(--flowme-text-tertiary)]">원문</span>
          <span aria-hidden="true"> · </span>
          {sourceHref ? (
            <a
              className="underline decoration-[var(--flowme-border-strong)] underline-offset-4 hover:text-[var(--flowme-action)]"
              href={sourceHref}
              target="_blank"
              rel="noreferrer"
            >
              {sourceLabel}
            </a>
          ) : sourceLabel}
        </p>
      ) : null}
    </header>
  );
}

export function FlowScheduleIntent({
  inputLabel,
  resultLabel,
  itemCount,
}: {
  inputLabel?: string;
  resultLabel: string;
  itemCount: number;
}) {
  const entries = [
    inputLabel ? { label: '내 조건', value: inputLabel } : null,
    { label: '저장 결과', value: resultLabel },
    { label: '전체', value: `할 일 ${itemCount}개` },
  ].filter((entry): entry is { label: string; value: string } => Boolean(entry));

  return (
    <dl
      data-flow-ui="schedule-intent"
      data-flow-anatomy="flow-context"
      className={`mt-4 grid border-y border-[var(--flowme-border)] bg-[var(--flowme-surface)] ${entries.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}
    >
      {entries.map((entry, index) => (
        <div
          key={entry.label}
          className={`min-w-0 px-2.5 py-2.5 sm:px-3 ${index > 0 ? 'border-l border-[var(--flowme-border)]' : ''}`}
        >
          <dt className="text-[10px] font-semibold text-[var(--flowme-text-tertiary)] sm:text-[11px]">
            {entry.label}
          </dt>
          <dd className="mt-0.5 break-keep text-xs font-semibold text-[var(--flowme-text)] sm:text-sm">
            {entry.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type FlowDateRailGroupProps = Omit<ComponentPropsWithoutRef<'section'>, 'children'> & {
  date?: string;
  undatedLabel?: string;
  showMonth?: boolean;
  dateContextLabel?: string;
  children: ReactNode;
};

export function FlowDateRailGroup({
  date,
  undatedLabel = '날짜 없음',
  showMonth = false,
  dateContextLabel,
  className = '',
  children,
  ...sectionProps
}: FlowDateRailGroupProps) {
  const hasDate = Boolean(date);
  const monthLabel = date ? `${Number(date.slice(5, 7))}월` : '';
  const weekdayLabel = date
    ? formatKoreanShortDate(date, { includeWeekday: true }).replace(/^\d+월 \d+일\s*/u, '')
    : undatedLabel;

  return (
    <section
      {...sectionProps}
      data-flow-ui="date-rail-group"
      className={`grid grid-cols-[4.25rem_minmax(0,1fr)] border-b border-[var(--flowme-border)] last:border-b-0 ${className}`}
    >
      <div
        data-testid="flow-date-rail"
        className="bg-[var(--flowme-surface-subtle)] px-2 py-3 text-center"
      >
        <span className="block text-lg font-semibold text-[var(--flowme-text)]">
          {hasDate ? date?.slice(8) : '-'}
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">
          {hasDate && showMonth
            ? [monthLabel, dateContextLabel ?? weekdayLabel].filter(Boolean).join(' · ')
            : dateContextLabel ?? weekdayLabel}
        </span>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

type FlowOutlineRowProps = {
  label: string;
  meta: string;
  open: boolean;
  collapsible: boolean;
  contentId: string;
  onToggle?: () => void;
  testId?: string;
  toggleTestId?: string;
  contentTestId?: string;
  children?: ReactNode;
};

export function FlowOutlineRow({
  label,
  meta,
  open,
  collapsible,
  contentId,
  onToggle,
  testId,
  toggleTestId,
  contentTestId,
  children,
}: FlowOutlineRowProps) {
  const heading = (
    <>
      <span className="min-w-0 text-left">
        <span className="block break-keep text-sm font-semibold text-[var(--flowme-text)]">{label}</span>
        <span className="mt-0.5 block text-[11px] font-semibold text-[var(--flowme-text-secondary)]">{meta}</span>
      </span>
      {collapsible ? (
        <span aria-hidden="true" className="shrink-0 text-sm text-[var(--flowme-text-tertiary)]">
          {open ? '⌃' : '⌄'}
        </span>
      ) : null}
    </>
  );

  return (
    <section
      data-testid={testId}
      data-flow-ui="outline-row"
      data-group-open={open ? 'true' : 'false'}
      className="border-b border-[var(--flowme-border)] bg-[var(--flowme-surface)] first:border-t"
    >
      {collapsible ? (
        <button
          type="button"
          data-testid={toggleTestId}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-2 py-2 text-left transition hover:bg-[var(--flowme-surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)]"
          onClick={onToggle}
        >
          {heading}
        </button>
      ) : (
        <div className="flex min-h-12 items-center justify-between gap-3 px-2 py-2">{heading}</div>
      )}
      {open ? (
        <div
          id={contentId}
          data-testid={contentTestId}
          className="border-t border-[var(--flowme-border)] px-2"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

type FlowExecutionRowProps = ComponentPropsWithoutRef<'article'> & {
  compact?: boolean;
  active?: boolean;
  presentation?: 'default' | 'timeline';
};

export function FlowExecutionRow({
  compact = false,
  active = false,
  presentation = 'default',
  className = '',
  children,
  ...articleProps
}: FlowExecutionRowProps) {
  const presentationClassName = presentation === 'timeline'
    ? 'min-h-14 border-b border-[var(--flowme-border)] bg-[var(--flowme-surface)] text-sm transition last:border-b-0'
    : compact
      ? FLOW_UI_EXECUTION_ROW_CLASS
      : 'min-h-14 border-b border-[var(--flowme-border)] bg-[var(--flowme-surface)] py-2.5 text-sm last:border-b-0';

  return (
    <article
      {...articleProps}
      data-flow-ui="execution-row"
      data-flow-presentation={presentation}
      data-flow-row-mode="saved"
      data-completion-position="trailing"
      data-p35-r9-marker="P35-R9-SHARED-EXECUTION-ROW"
      className={`${presentationClassName} ${active ? 'bg-[var(--flowme-surface-selected)]' : ''} ${className}`}
    >
      {children}
    </article>
  );
}

export type FlowReceiptTone = 'success' | 'info' | 'warning' | 'error';

const receiptToneClass: Record<FlowReceiptTone, string> = {
  success: 'border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)] text-[var(--flowme-positive-strong)]',
  info: 'border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] text-[var(--flowme-action-strong)]',
  warning: 'border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] text-[var(--flowme-warning-strong)]',
  error: 'border-[var(--flowme-danger)] bg-[var(--flowme-danger-soft)] text-[var(--flowme-danger-strong)]',
};

export function FlowReceipt({
  tone,
  label,
  title,
  summary,
  compact = false,
  children,
  ...props
}: ComponentPropsWithoutRef<'div'> & {
  tone: FlowReceiptTone;
  label: string;
  title: string;
  summary?: string;
  compact?: boolean;
}) {
  const { className = '', ...divProps } = props;
  return (
    <div
      {...divProps}
      data-flow-ui="receipt"
      data-flow-anatomy="result-receipt"
      className={`border-l-2 ${compact ? 'px-3 py-2' : 'px-4 py-3 sm:px-5 sm:py-4'} ${receiptToneClass[tone]} ${className}`}
    >
      <p className="text-xs font-semibold">{label}</p>
      <p className={`${compact ? 'mt-0.5 text-sm' : 'mt-1 text-xl sm:text-2xl'} break-keep font-semibold text-[var(--flowme-text)]`}>{title}</p>
      {summary ? <p className="mt-1 break-keep text-sm font-medium text-[var(--flowme-text-secondary)]">{summary}</p> : null}
      {children}
    </div>
  );
}

type FlowEditorShellProps = ComponentPropsWithoutRef<'section'> & {
  editing: boolean;
  mobileFullscreen: boolean;
  mode: 'inline' | 'panel' | 'plain';
};

export function FlowEditorShell({
  editing,
  mobileFullscreen,
  mode,
  className = '',
  children,
  ...props
}: FlowEditorShellProps) {
  const layoutClass = editing && mobileFullscreen
    ? 'fixed inset-0 z-[80] overflow-y-auto bg-[var(--flowme-bg)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]'
    : mode === 'inline'
      ? 'mt-2 border-l-2 border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] p-3'
      : mode === 'panel'
        ? 'border border-[var(--flowme-border)] bg-[var(--flowme-surface)] p-3'
        : 'space-y-3';

  return (
    <section {...props} data-flow-ui="editor-shell" className={`${layoutClass} ${className}`}>
      {children}
    </section>
  );
}

export function FlowBottomSheet({
  testId,
  headingId,
  marker,
  p35Marker,
  eyebrow,
  title,
  onClose,
  initialFocusSelector,
  returnFocusSelector,
  className = '',
  children,
}: {
  testId: string;
  headingId: string;
  marker?: string;
  p35Marker?: string;
  eyebrow?: string;
  title: string;
  onClose: () => void;
  initialFocusSelector?: string;
  returnFocusSelector?: string;
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      const requestedTarget = initialFocusSelector
        ? dialogRef.current?.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      (requestedTarget ?? closeButtonRef.current)?.focus({ preventScroll: true });
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', closeOnEscape, true);
      document.body.style.overflow = previousOverflow;
      const requestedReturnTarget = returnFocusSelector
        ? document.querySelector<HTMLElement>(returnFocusSelector)
        : null;
      (requestedReturnTarget ?? returnFocus)?.focus({ preventScroll: true });
    };
  }, [initialFocusSelector, returnFocusSelector]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/40" data-flow-ui="bottom-sheet-layer">
      <button
        className="absolute inset-0 h-full w-full cursor-default"
        type="button"
        tabIndex={-1}
        aria-label={`${title} 닫기`}
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-testid={testId}
        data-p31-marker={marker}
        data-p35-marker={p35Marker}
        data-flow-ui="bottom-sheet"
        data-layer-priority="dialog"
        className={`${FLOW_UI_SHEET_CLASS} ${className}`}
        onKeyDown={handleKeyDown}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <p className="text-sm font-semibold text-[var(--flowme-action)]">{eyebrow}</p> : null}
            <h2 id={headingId} className="mt-1 break-keep text-xl font-semibold text-[var(--flowme-text)]">{title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            data-testid={`${testId}-close`}
            className={`${FLOW_UI_SECONDARY_ACTION_CLASS} shrink-0`}
            onClick={onClose}
          >
            닫기
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function FlowExportPlan({
  className = '',
  children,
  ...props
}: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      {...props}
      data-flow-ui="export-plan"
      className={`border-t border-[var(--flowme-border)] pt-3 ${className}`}
    >
      {children}
    </section>
  );
}

export function FlowPlanStep({ index, label }: { index: number; label: string }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--flowme-text-secondary)]">
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--flowme-soft)] text-[10px] text-[var(--flowme-text)]" aria-hidden="true">
        {index}
      </span>
      <span>{label}</span>
    </div>
  );
}
