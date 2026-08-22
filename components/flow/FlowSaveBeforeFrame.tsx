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
  artifactPreview?: ReactNode;
  desktopCatalog?: ReactNode;
  onAdjustRow?: (rowId: string) => void;
  setup?: ReactNode;
  actions?: ReactNode;
  composition: 'legacy' | 'artifact-first';
  showScheduleIntent?: boolean;
  q3CopyEnabled?: boolean;
};

export function FlowSaveBeforeFrame({
  rootTestId,
  previewTestId,
  previewRowTestId,
  eyebrow,
  title,
  categoryLabel,
  sourceLabel,
  sourceHref,
  inputLabel,
  resultLabel,
  itemCount,
  previewRows,
  artifactPreview,
  desktopCatalog,
  onAdjustRow,
  setup,
  actions,
  composition,
  showScheduleIntent = true,
  q3CopyEnabled = true,
}: FlowSaveBeforeFrameProps) {
  const displayEyebrow = eyebrow ?? (q3CopyEnabled ? '계획 미리보기' : 'Flow 미리보기');
  const rows = previewRows.slice(0, 5);
  const remainingRows = previewRows.slice(5);
  const remainingCount = Math.max(itemCount - rows.length, 0);
  const hasDecisionPane = composition === 'artifact-first'
    ? Boolean(setup || actions)
    : Boolean(artifactPreview || setup || actions);
  const hasDesktopCatalog = Boolean(desktopCatalog);

  if (composition === 'artifact-first') {
    return (
      <section
      data-testid={rootTestId}
      data-visual-structure="artifact-first"
      data-experience-architecture="p35-result-first"
      data-p29-marker="P29-SAVE-BEFORE-PRIMARY-RESULT"
      data-p30-marker="P30-SAVE-BEFORE-SINGLE-DECISION"
      data-p35-marker="P35-PUBLIC-RESULT-FIRST"
      data-flow-anatomy="save-before"
        className="min-h-[calc(100dvh-5rem)] rounded-[var(--flowme-radius-card)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-4 py-5 sm:min-h-0 sm:px-5 sm:py-7"
      >
        <FlowArtifactSummary
          eyebrow={displayEyebrow}
          title={title}
          categoryLabel={categoryLabel}
          sourceLabel={sourceLabel}
          sourceHref={sourceHref}
        />

        <div
          data-approved-desktop-composition={hasDesktopCatalog ? 'catalog-result-context' : undefined}
          data-workspace-breakpoints={hasDesktopCatalog
            ? 'mobile:0-767;stacked:768-1023;desktop-compact:1024-1279;desktop-full:1280+'
            : undefined}
          data-mobile-order={hasDesktopCatalog ? 'result-context' : undefined}
          className={hasDesktopCatalog
            ? `mt-4 grid gap-4 md:grid-cols-1 md:items-start ${hasDecisionPane
              ? 'lg:grid-cols-[minmax(14rem,0.32fr)_minmax(0,1fr)] lg:gap-7 xl:grid-cols-[minmax(14rem,0.32fr)_minmax(0,1fr)_minmax(18rem,0.42fr)]'
              : 'lg:grid-cols-[minmax(14rem,0.32fr)_minmax(0,1fr)] lg:gap-7'}`
            : `mt-4 grid gap-4 ${hasDecisionPane ? 'lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] lg:items-start lg:gap-7' : ''}`}
        >
          <div
            data-testid="flow-save-before-primary-result"
            data-flow-identity-slot="primary-result"
            className={hasDesktopCatalog
              ? 'min-w-0 lg:col-start-2 lg:row-start-1'
              : 'min-w-0'}
          >
            {artifactPreview}
          </div>
          {hasDecisionPane ? (
            <aside
              data-testid="flow-save-before-decision"
              aria-label="저장 조건과 행동"
              className={hasDesktopCatalog
                ? 'grid min-w-0 gap-3 border-t border-[var(--flowme-border)] pt-4 lg:col-start-2 lg:row-start-2 lg:border-l-0 lg:pl-0 xl:col-start-3 xl:row-start-1 xl:border-l xl:border-t-0 xl:pl-7 xl:pt-0'
                : 'grid min-w-0 gap-3 border-t border-[var(--flowme-border)] pt-4 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0'}
            >
              {setup}
              {actions}
            </aside>
          ) : null}
          {hasDesktopCatalog ? (
            <aside
              data-testid="flow-save-before-desktop-catalog"
              data-catalog-visibility="stacked:visible;compact:visible;full:visible"
              aria-label="계획 카탈로그"
              className="hidden md:order-first md:block md:border-b md:border-[var(--flowme-border)] md:pb-4 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5 xl:row-span-1"
            >
              {desktopCatalog}
            </aside>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid={rootTestId}
      data-visual-structure="artifact-first"
      data-experience-architecture="hybrid"
      data-p30-marker="P30-LEGACY-COMPOSITION-ACTIVE"
      className="rounded-[var(--flowme-radius-card)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-4 py-5 sm:px-5 sm:py-7"
    >
      <FlowArtifactSummary
        eyebrow={displayEyebrow}
        title={title}
        categoryLabel={categoryLabel}
        sourceLabel={sourceLabel}
        sourceHref={sourceHref}
      />
      {showScheduleIntent ? (
        <FlowScheduleIntent
          inputLabel={inputLabel}
          resultLabel={resultLabel}
          itemCount={itemCount}
        />
      ) : null}

      <div className={`mt-4 grid gap-5 ${hasDecisionPane ? 'md:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)] md:items-start md:gap-7' : ''}`}>
        <section
          data-testid={previewTestId}
          aria-label={q3CopyEnabled ? '저장될 계획 요약' : '저장될 Flow 요약'}
          className="min-w-0 rounded-[var(--flowme-radius-card)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)]"
        >
          <div className="flex items-center justify-between gap-3 px-1 py-2.5">
            <p className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
              {q3CopyEnabled ? '저장될 전체 계획' : '저장될 전체 Flow'}
            </p>
            <span className="shrink-0 text-xs font-semibold text-[var(--flowme-action)]">{itemCount}개</span>
          </div>
          <ol>
            {rows.map((row, index) => (
              <li
                key={row.id}
                data-testid={previewRowTestId}
                data-flow-outline-row="true"
                data-flow-item-id={row.id}
                className={`grid min-w-0 gap-2.5 border-t border-[var(--flowme-border)] px-1 py-2.5 ${onAdjustRow ? 'grid-cols-[2rem_minmax(0,1fr)_auto]' : 'grid-cols-[2rem_minmax(0,1fr)]'}`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-[var(--flowme-radius-control)] bg-[var(--flowme-action-soft)] text-xs font-semibold text-[var(--flowme-action)]" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  {row.timing ? <span className="block text-xs font-semibold text-[var(--flowme-text-secondary)]">{row.timing}</span> : null}
                  <span className="block break-keep text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</span>
                  {row.summary ? <span className="mt-0.5 line-clamp-1 block text-xs leading-5 text-[var(--flowme-text-secondary)]">{row.summary}</span> : null}
                </span>
                {onAdjustRow ? (
                  <button
                    type="button"
                    className="min-h-11 self-center rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-2.5 text-xs font-semibold text-[var(--flowme-text-secondary)] transition hover:border-[var(--flowme-action)] hover:text-[var(--flowme-action)]"
                    aria-label={`${row.title} 제목·날짜·메모 수정`}
                    onClick={() => onAdjustRow(row.id)}
                  >
                    수정
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
          {remainingCount > 0 ? (
            <details data-testid={`${previewTestId}-full-outline`} className="border-t border-[var(--flowme-border)]">
              <summary
                data-testid={`${previewTestId}-expand`}
                className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-2 text-xs font-semibold text-[var(--flowme-action)] transition hover:bg-[var(--flowme-action-soft)]"
              >
                <span>외 {remainingCount}개 전체 보기</span>
                <span aria-hidden="true">⌄</span>
              </summary>
              <ol>
                {remainingRows.map((row, index) => (
                  <li
                    key={row.id}
                    data-testid={`${previewRowTestId}-remainder`}
                    data-flow-outline-row="true"
                    data-flow-item-id={row.id}
                    className={`grid min-w-0 gap-2.5 border-t border-[var(--flowme-border)] px-1 py-2.5 ${onAdjustRow ? 'grid-cols-[2rem_minmax(0,1fr)_auto]' : 'grid-cols-[2rem_minmax(0,1fr)]'}`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-[var(--flowme-radius-control)] bg-[var(--flowme-action-soft)] text-xs font-semibold text-[var(--flowme-action)]" aria-hidden="true">
                      {rows.length + index + 1}
                    </span>
                    <span className="min-w-0">
                      {row.timing ? <span className="block text-xs font-semibold text-[var(--flowme-text-secondary)]">{row.timing}</span> : null}
                      <span className="block break-keep text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</span>
                      {row.summary ? <span className="mt-0.5 line-clamp-1 block text-xs leading-5 text-[var(--flowme-text-secondary)]">{row.summary}</span> : null}
                    </span>
                    {onAdjustRow ? (
                      <button
                        type="button"
                        className="min-h-11 self-center rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-2.5 text-xs font-semibold text-[var(--flowme-text-secondary)] transition hover:border-[var(--flowme-action)] hover:text-[var(--flowme-action)]"
                        aria-label={`${row.title} 제목·날짜·메모 수정`}
                        onClick={() => onAdjustRow(row.id)}
                      >
                        수정
                      </button>
                    ) : null}
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
        </section>

        {hasDecisionPane ? (
          <div data-testid="flow-save-before-decision" className="grid min-w-0 gap-3 md:border-l md:border-[var(--flowme-border)] md:pl-7">
            {artifactPreview}
            {setup}
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
