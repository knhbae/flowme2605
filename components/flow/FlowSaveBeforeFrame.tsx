import type { ReactNode } from 'react';

import {
  FlowArtifactSummary,
  FlowScheduleIntent,
} from './FlowExecutionPrimitives';

export type FlowSaveBeforePreviewRow = {
  id: string;
  timing?: string;
  title: string;
  summary?: string;
};

type FlowSaveBeforeFrameProps = {
  rootTestId: string;
  previewTestId: string;
  previewRowTestId: string;
  eyebrow?: string;
  title: string;
  categoryLabel?: string;
  sourceLabel?: string;
  sourceHref?: string;
  inputLabel?: string;
  resultLabel: string;
  itemCount: number;
  previewRows: FlowSaveBeforePreviewRow[];
  setup?: ReactNode;
  actions?: ReactNode;
};

export function FlowSaveBeforeFrame({
  rootTestId,
  previewTestId,
  previewRowTestId,
  eyebrow = 'Flow 미리보기',
  title,
  categoryLabel,
  sourceLabel,
  sourceHref,
  inputLabel,
  resultLabel,
  itemCount,
  previewRows,
  setup,
  actions,
}: FlowSaveBeforeFrameProps) {
  const rows = previewRows.slice(0, 5);
  const remainingCount = Math.max(itemCount - rows.length, 0);
  const hasSideActions = Boolean(setup || actions);

  return (
    <section data-testid={rootTestId} data-visual-structure="artifact-first" className="border-y border-[var(--flowme-border-strong)] py-5 sm:py-7">
      <FlowArtifactSummary
        eyebrow={eyebrow}
        title={title}
        categoryLabel={categoryLabel}
        sourceLabel={sourceLabel}
        sourceHref={sourceHref}
      />
      <FlowScheduleIntent
        inputLabel={inputLabel}
        resultLabel={resultLabel}
        itemCount={itemCount}
      />

      <div className={`mt-4 grid gap-5 ${hasSideActions ? 'md:grid-cols-[minmax(0,1.25fr)_minmax(17rem,0.75fr)] md:items-start md:gap-7' : ''}`}>
        <section data-testid={previewTestId} aria-label="저장될 Flow 요약" className="min-w-0 border-y border-[var(--flowme-border)] bg-[var(--flowme-surface)]">
          <div className="flex items-center justify-between gap-3 px-1 py-2.5">
            <p className="text-xs font-semibold text-[var(--flowme-text-secondary)]">저장될 전체 Flow</p>
            <span className="shrink-0 text-xs font-semibold text-[var(--flowme-action)]">{itemCount}개</span>
          </div>
          <ol>
            {rows.map((row, index) => (
              <li
                key={row.id}
                data-testid={previewRowTestId}
                className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-2.5 border-t border-[var(--flowme-border)] px-1 py-2.5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--flowme-action-soft)] text-[11px] font-semibold text-[var(--flowme-action)]" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  {row.timing ? <span className="block text-[11px] font-semibold text-[var(--flowme-text-secondary)]">{row.timing}</span> : null}
                  <span className="block break-keep text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</span>
                  {row.summary ? <span className="mt-0.5 line-clamp-1 block text-xs leading-5 text-[var(--flowme-text-secondary)]">{row.summary}</span> : null}
                </span>
              </li>
            ))}
          </ol>
          {remainingCount > 0 ? <p className="border-t border-[var(--flowme-border)] px-1 py-2 text-xs font-semibold text-[var(--flowme-text-secondary)]">외 {remainingCount}개</p> : null}
        </section>

        {hasSideActions ? (
          <div data-testid="flow-save-before-decision" className="grid min-w-0 gap-3 md:border-l md:border-[var(--flowme-border)] md:pl-7">
            {setup}
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
