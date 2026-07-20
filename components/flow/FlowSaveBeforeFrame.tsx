import type { ReactNode } from 'react';

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
    <section data-testid={rootTestId} data-visual-structure="artifact-first" className="border-y border-[#DDE4E0] py-5 sm:py-7">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6E6B64]">
        <span className="text-[#3654FF]">{eyebrow}</span>
        {categoryLabel ? <><span aria-hidden="true">·</span><span>{categoryLabel}</span></> : null}
      </div>

      <h1 className="mt-2 max-w-4xl break-keep text-2xl font-semibold tracking-tight text-[#1B1A17] sm:text-3xl">{title}</h1>

      {sourceLabel ? (
        <p className="mt-2 max-w-3xl text-xs font-medium text-[#6E6B64]">
          <span className="text-[#989288]">원문</span>
          <span aria-hidden="true"> · </span>
          {sourceHref ? (
            <a className="underline decoration-[#C7C2B8] underline-offset-4 hover:text-[#3654FF]" href={sourceHref} target="_blank" rel="noreferrer">
              {sourceLabel}
            </a>
          ) : sourceLabel}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
        {inputLabel ? <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 text-[#5F5A52]">{inputLabel}</span> : null}
        <span className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[#3654FF]">{resultLabel}</span>
        <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 text-[#5F5A52]">할 일 {itemCount}개</span>
      </div>

      <div className={`mt-4 grid gap-5 ${hasSideActions ? 'md:grid-cols-[minmax(0,1.25fr)_minmax(17rem,0.75fr)] md:items-start md:gap-7' : ''}`}>
        <section data-testid={previewTestId} aria-label="저장될 Flow 요약" className="min-w-0 border-y border-[#E7E4DD] bg-white">
          <div className="flex items-center justify-between gap-3 px-1 py-2.5">
            <p className="text-xs font-semibold text-[#5F5A52]">저장될 전체 Flow</p>
            <span className="shrink-0 text-xs font-semibold text-[#3654FF]">{itemCount}개</span>
          </div>
          <ol>
            {rows.map((row, index) => (
              <li
                key={row.id}
                data-testid={previewRowTestId}
                className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-2.5 border-t border-[#F0EEE9] px-1 py-2.5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#EEF1FF] text-[11px] font-semibold text-[#3654FF]" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  {row.timing ? <span className="block text-[11px] font-semibold text-[#6E6B64]">{row.timing}</span> : null}
                  <span className="block break-keep text-sm font-semibold leading-5 text-[#1B1A17]">{row.title}</span>
                  {row.summary ? <span className="mt-0.5 line-clamp-1 block text-xs leading-5 text-[#777269]">{row.summary}</span> : null}
                </span>
              </li>
            ))}
          </ol>
          {remainingCount > 0 ? <p className="border-t border-[#F0EEE9] px-1 py-2 text-xs font-semibold text-[#6E6B64]">외 {remainingCount}개</p> : null}
        </section>

        {hasSideActions ? (
          <div data-testid="flow-save-before-decision" className="grid min-w-0 gap-3 md:border-l md:border-[#E7E4DD] md:pl-7">
            {setup}
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
