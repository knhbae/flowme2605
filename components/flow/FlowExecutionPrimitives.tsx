'use client';

import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from 'react';

import {
  FLOW_UI_EXECUTION_ROW_CLASS,
  FLOW_UI_SURFACE_CLASS,
} from './flow-ui';

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
    <header data-flow-ui="artifact-summary">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--flowme-text-secondary)]">
        <span className="text-[var(--flowme-action)]">{eyebrow}</span>
        {categoryLabel ? <span>{categoryLabel}</span> : null}
      </p>
      <h1 className="mt-2 max-w-4xl break-keep text-2xl font-semibold text-[var(--flowme-text)] sm:text-3xl">
        {title}
      </h1>
      {sourceLabel ? (
        <p className="mt-2 max-w-3xl text-xs font-medium text-[var(--flowme-text-secondary)]">
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
};

export function FlowExecutionRow({
  compact = false,
  active = false,
  className = '',
  children,
  ...articleProps
}: FlowExecutionRowProps) {
  return (
    <article
      {...articleProps}
      data-flow-ui="execution-row"
      className={`${compact ? FLOW_UI_EXECUTION_ROW_CLASS : 'min-h-14 border-b border-[var(--flowme-border)] bg-[var(--flowme-surface)] py-2.5 text-sm last:border-b-0'} ${active ? 'bg-[var(--flowme-surface-selected)]' : ''} ${className}`}
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
