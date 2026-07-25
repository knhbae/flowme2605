'use client';

import { useState, type ReactNode } from 'react';

import { FLOW_UI_DISCLOSURE_CLASS } from './flow-ui';

type RoutineScheduleSummaryProps = {
  summary: string;
  occurrenceLabels: string[];
  children: ReactNode;
  testId?: string;
};

export function RoutineScheduleSummary({
  summary,
  occurrenceLabels,
  children,
  testId = 'routine-schedule-summary',
}: RoutineScheduleSummaryProps) {
  const [open, setOpen] = useState(false);
  const editorId = `${testId}-editor`;

  return (
    <section
      data-testid={testId}
      data-p29-marker="P29-ROUTINE-SUMMARY-FIRST"
      data-p30-marker="P30-ROUTINE-ADVANCED-DENSITY"
      data-p34-marker="P34-06-ROUTINE-SUMMARY"
      className="border-y border-[var(--flowme-border)] bg-[var(--flowme-surface)] py-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">반복 일정</p>
          <p data-testid={`${testId}-value`} className="mt-1 break-keep text-sm font-semibold text-[var(--flowme-text)]">
            {summary}
          </p>
        </div>
        <button
          type="button"
          data-testid={`${testId}-toggle`}
          className={FLOW_UI_DISCLOSURE_CLASS}
          aria-expanded={open}
          aria-controls={editorId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? '반복 일정 조정 닫기' : '반복 일정 조정'}
        </button>
      </div>

      {occurrenceLabels.length > 0 ? (
        <div data-testid={`${testId}-next-occurrences`} data-p29-marker="P29-ROUTINE-NEXT-3" className="mt-3 border-t border-[var(--flowme-border)] px-1 pt-3">
          <p className="text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">다음 일정</p>
          <ol className="mt-2 flex flex-wrap gap-2">
            {occurrenceLabels.slice(0, 3).map((label) => (
              <li key={label} className="rounded-md bg-[var(--flowme-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--flowme-text-secondary)]">
                {label}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {open ? (
        <div id={editorId} className="mt-4 border-t border-[var(--flowme-border)] px-1 pt-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
