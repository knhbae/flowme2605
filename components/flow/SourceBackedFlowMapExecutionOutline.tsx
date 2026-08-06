import Link from 'next/link';

import { toContentDisplayTitle, toUserFacingSourceTitle } from '@/lib/flow/display-title';

export type SourceBackedFlowMapDisplayStep = {
  id: string;
  itemKey: string;
  title: string;
  stepTitle?: string;
  memo?: string;
  sourceUrl?: string;
  detailItemCount: number;
  detailItems: string[];
};

export type SourceBackedFlowMapDisplayFlow = {
  slug: string;
  title: string;
  destination: string;
  steps: SourceBackedFlowMapDisplayStep[];
};

type SourceBackedFlowMapExecutionOutlineProps = {
  sourceTitle: string;
  sourceHref: string;
  sourceLabel: string;
  sourceActionIntent: string;
  summary: string;
  inputLabel: string;
  itemCount: number;
  chooseChildBeforeSave: boolean;
  childCtaLabel: string;
  flows: SourceBackedFlowMapDisplayFlow[];
};

const destinationLabel: Record<string, string> = {
  calendar: '캘린더',
  checklist: '체크',
  hybrid: '캘린더 + 체크',
  internal_check: '체크',
  memo: '메모',
  progress: '진도',
  sheet: '시트',
  todo: '할 일',
};

function getUserFacingMapSummary(summary: string): string {
  return summary
    .replace(/\s*\d+개 묶음,\s*/g, ' ')
    .replace(/\s*\d+개 묶음 ·\s*/g, ' ')
    .replace(/\s*\d+개 묶음\s*/g, ' ');
}

export function SourceBackedFlowMapExecutionOutline({
  sourceTitle,
  sourceHref,
  sourceLabel,
  sourceActionIntent,
  summary,
  inputLabel,
  itemCount,
  chooseChildBeforeSave,
  childCtaLabel,
  flows,
}: SourceBackedFlowMapExecutionOutlineProps) {
  return (
    <details data-testid="flow-map-execution-outline" className="mt-5 border-y border-[#E7E4DD] py-3 sm:mt-6">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-800">
        <span>전체 내용과 원문</span>
        <span className="text-xs text-[#6E6B64]">할 일 {itemCount}개</span>
      </summary>
      <div className="mt-3 border-t border-[#E7E4DD] pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#6E6B64]">원문과 실행 항목</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{toUserFacingSourceTitle(sourceTitle)}</h2>
            <p className="mt-1 max-w-2xl break-keep text-sm leading-6 text-[#6E6B64]">{getUserFacingMapSummary(summary)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <p className="rounded-full bg-[#FAFAF8] px-2.5 py-1 text-xs font-semibold text-[#6E6B64]">
              {inputLabel}
            </p>
            <a
              data-testid="flow-map-source-link"
              data-flow-identity-slot="source"
              data-map-action-intent={sourceActionIntent}
              className="rounded-full border border-[#E7E4DD] bg-white px-2.5 py-1 text-xs font-semibold text-[#3654FF] hover:border-[#3654FF]/40"
              href={sourceHref}
              target="_blank"
              rel="noreferrer"
            >
              {sourceLabel}
            </a>
          </div>
        </div>
        <div className={`mt-4 grid gap-4 ${flows.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {flows.map((flow) => (
            <article key={flow.slug} className="min-w-0 rounded-lg border border-[#E7E4DD] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{toContentDisplayTitle(flow.title)}</h3>
                  <p className="mt-1 text-xs font-semibold text-[#6E6B64]">{flow.steps.length}개 할 일</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-xs font-semibold text-[#3654FF]">
                    {destinationLabel[flow.destination] ?? flow.destination}
                  </span>
                  <Link className="rounded-full border border-[#E7E4DD] bg-white px-2.5 py-1 text-xs font-semibold text-[#3654FF] hover:border-[#3654FF]/40" href={`/f/${flow.slug}`}>
                    {chooseChildBeforeSave ? childCtaLabel : '바로 시작'}
                  </Link>
                </div>
              </div>
              {chooseChildBeforeSave ? (
                <div data-testid="flow-map-child-compact-preview" className="mt-3 border-t border-[#E7E4DD] pt-3">
                  <ul className="grid gap-2">
                    {flow.steps.slice(0, 2).map((step, index) => (
                      <li key={step.itemKey} data-flow-item-id={step.itemKey} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 text-sm leading-5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F1F0EC] text-[11px] font-semibold text-[#6E6B64]" aria-hidden="true">
                          {index + 1}
                        </span>
                        <span>
                          <span className="block break-keep font-semibold text-slate-900">{step.title}</span>
                          {step.detailItems[0] ? <span className="mt-0.5 block break-keep text-xs text-slate-600">{step.detailItems[0]}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {flow.steps.length > 2 ? (
                    <p className="mt-3 text-xs font-semibold text-[#6E6B64]">나머지 {flow.steps.length - 2}개는 내용 보기에서 확인</p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 grid gap-2">
                  {flow.steps.map((step, index) => (
                    <div
                      key={step.itemKey}
                      data-testid="flow-map-execution-step-row"
                      data-flow-item-id={step.itemKey}
                      className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3 border-t border-[#E7E4DD] py-3 first:border-t-0 first:pt-0"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#EEF1FF] text-xs font-semibold text-[#3654FF]" aria-hidden="true">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        {step.stepTitle ? <p className="text-xs font-semibold text-[#6E6B64]">{toUserFacingSourceTitle(step.stepTitle)}</p> : null}
                        <p className="mt-1 text-sm font-semibold text-slate-950">{step.title}</p>
                        {step.detailItems.length > 0 ? (
                          <>
                            <p className="mt-2 text-[13px] font-medium leading-5 text-slate-700">
                              <span className="font-semibold text-slate-500">첫 체크</span> · {step.detailItems[0]}
                            </p>
                            <details data-testid="flow-map-public-step-items" className="mt-2 border-y border-[#E7E4DD] py-2.5">
                              <summary className="cursor-pointer text-xs font-semibold text-slate-600">체크 {step.detailItems.length}개 열기</summary>
                              <ul className="mt-2 grid gap-1.5 text-[13px] font-medium leading-5 text-slate-700">
                                {step.detailItems.map((item) => (
                                  <li key={item} className="flex gap-1.5">
                                    <span className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true">□</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </>
                        ) : (
                          <p className="mt-1 text-xs font-semibold text-slate-500">하위 체크 {step.detailItemCount}개</p>
                        )}
                        {step.memo || step.sourceUrl ? (
                          <details className="mt-2 min-w-0 border-y border-[#E7E4DD] py-2.5">
                            <summary className="cursor-pointer text-xs font-semibold text-slate-600">메모 · 원문</summary>
                            {step.memo ? <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-5 text-slate-700">{step.memo}</p> : null}
                            {step.sourceUrl ? (
                              <a className="mt-2 inline-flex min-h-8 items-center rounded-md border border-[#E7E4DD] bg-white px-2.5 py-1 text-xs font-semibold text-[#3654FF] hover:border-[#3654FF]/40" href={step.sourceUrl} target="_blank" rel="noreferrer">
                                이 단계 원문 보기
                              </a>
                            ) : null}
                          </details>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </details>
  );
}
