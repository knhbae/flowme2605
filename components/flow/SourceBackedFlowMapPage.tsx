import Link from 'next/link';
import { FLOW_ENTRY_DETAIL_CTA_LABEL, toContentDisplayTitle, toUserFacingMapTitle, toUserFacingSourceTitle } from '@/lib/flow/display-title';
import {
  buildSourceBackedFlowMapPublishPackage,
  getSourceBackedFlowMapQualityDecision,
  isSourceBackedFlowMapExecutable,
  type SourceBackedFlowMapPublishPackage,
} from '@/lib/flow/source-backed-my-flow';
import { PlatformNav } from './PlatformNav';
import { SourceBackedFlowMapSaveButton } from './SourceBackedFlowMapSaveButton';

type SourceBackedFlowMapProps = {
  mapId: string;
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

function NotFoundMap() {
  return (
    <main className="min-h-screen bg-[#FAFAF8] px-5 py-8">
      <div className="mx-auto max-w-3xl">
      <PlatformNav />
      <section className="rounded-2xl border border-dashed border-[#E7E4DD] bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">콘텐츠를 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-slate-600">다른 공개 Flow나 내 Flow 데모를 확인해 주세요.</p>
        <Link className="mt-5 inline-flex rounded-xl bg-[#3654FF] px-4 py-2 text-sm font-semibold text-white" href="/my?demo=source-backed">
          내 Flow 보기
        </Link>
      </section>
      </div>
    </main>
  );
}

function ReviewHoldMap({ publishPackage }: { publishPackage: SourceBackedFlowMapPublishPackage }) {
  const { map, public: publicSurface } = publishPackage;
  const displayTitle = toUserFacingMapTitle(publicSurface.title);
  const qualityDecision = getSourceBackedFlowMapQualityDecision(map.id);
  const needsSourceRows = qualityDecision.executionHoldReason === 'source_rows';
  const needsMedicalSourceFit = qualityDecision.executionHoldReason === 'medical_source_fit';
  const eyebrow = needsSourceRows
    ? '실행 항목 준비 중'
    : needsMedicalSourceFit
      ? '시작 시기 확인 필요'
      : '최신 공식 내용 확인 필요';
  const lead = needsSourceRows
    ? '원문 자료에서 실제로 실행할 항목을 고르는 중이에요.'
    : needsMedicalSourceFit
      ? '아이의 발달과 수유 상태를 확인한 뒤 시작 시기를 정해야 해요.'
    : '공식 원문과 현재 표시 내용을 다시 확인하고 있어요.';
  const description = needsSourceRows
    ? '개별 자료와 난이도를 확인하기 전에는 이 페이지에서 저장하거나 파일로 받지 않습니다. 아래 원문 자료를 먼저 둘러보세요.'
    : needsMedicalSourceFit
      ? '이 페이지의 150~180일 식단은 민간 참고 자료입니다. 현재 공식 안내는 대체로 생후 6개월 무렵 시작을 권하므로, 아이 상태를 확인하기 전에는 새 일정으로 저장하거나 파일로 받지 않습니다.'
    : '공식 내용이 달라질 수 있어 지금은 이 페이지에서 저장하거나 파일로 받지 않습니다. 아래 원문에서 최신 내용을 확인해 주세요.';
  const sourceLinkLabel = needsSourceRows
    ? '원문 자료 둘러보기'
    : needsMedicalSourceFit
      ? '공식 이유식 안내 보기'
      : '최신 공식 내용 확인';

  return (
    <main data-testid="flow-map-public" className="min-h-screen bg-[#FAFAF8] px-4 py-5 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <PlatformNav />
        <section
          data-testid="flow-map-review-hold"
          className="border-t-4 border-[#E2A62B] bg-white px-5 py-7 shadow-[0_18px_50px_rgba(31,35,48,0.07)] sm:px-8 sm:py-10"
        >
          <p className="text-sm font-semibold text-[#8A5A00]">{eyebrow}</p>
          <h1 className="mt-2 break-keep text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {displayTitle}
          </h1>
          <p className="mt-4 max-w-2xl break-keep text-base font-semibold leading-7 text-slate-800">
            {lead}
          </p>
          <p className="mt-2 max-w-2xl break-keep text-sm leading-6 text-slate-600">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              data-testid="flow-map-source-link"
              className="inline-flex min-h-11 items-center justify-center bg-[#3654FF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2944DB]"
              href={map.reviewUrl ?? map.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {sourceLinkLabel}
            </a>
            {needsMedicalSourceFit && map.reviewUrl && map.reviewUrl !== map.sourceUrl ? (
              <a
                data-testid="flow-map-reference-source-link"
                className="inline-flex min-h-11 items-center justify-center border border-[#D9D6CF] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#3654FF]/40 hover:text-[#3654FF]"
                href={map.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                참고 식단표 원문
              </a>
            ) : null}
            <Link
              className="inline-flex min-h-11 items-center justify-center border border-[#D9D6CF] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-[#3654FF]/40 hover:text-[#3654FF]"
              href="/flows"
            >
              다른 Flow 찾기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export function SourceBackedFlowMapPublicPage({ mapId }: SourceBackedFlowMapProps) {
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  if (!publishPackage) return <NotFoundMap />;
  if (!isSourceBackedFlowMapExecutable(publishPackage.map)) {
    return <ReviewHoldMap publishPackage={publishPackage} />;
  }

  const { map, public: publicSurface } = publishPackage;
  const firstFlow = publicSurface.childFlows[0];
  const firstStep = firstFlow?.steps[0];
  const firstStepDetail = firstStep?.detailItems[0];
  const displayTitle = toUserFacingMapTitle(publicSurface.title);
  const resultText = publicSurface.artifacts.join(' + ') || '할 일';
  const resultPromise = publicSurface.setupInput
    ? `${publicSurface.setupInput.label}만 넣으면 저장됩니다: ${resultText}`
    : `바로 저장됩니다: ${resultText}`;

  return (
    <main data-testid="flow-map-public" className="flowme-mobile-map-save-clearance min-h-screen bg-[#FAFAF8] px-4 py-5 sm:px-5 sm:py-8 sm:pb-16">
      <div className="mx-auto max-w-5xl">
      <PlatformNav />
      <section data-testid="flow-map-hero" className="rounded-2xl border border-[#E7E4DD] bg-white p-4 sm:p-6">
        <p className="text-sm font-semibold text-[#3654FF]">{FLOW_ENTRY_DETAIL_CTA_LABEL}</p>
        <h1 className="mt-1 break-keep text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{displayTitle}</h1>
        <p data-testid="flow-map-result-promise" className="mt-2 break-keep text-sm font-semibold leading-6 text-[#3654FF] sm:text-base">
          {resultPromise}
        </p>
        <div data-testid="flow-map-result-chips" className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold text-[#6E6B64]">
          {publicSurface.categoryLabel ? <span className="rounded-full bg-[#F1F0EC] px-2.5 py-1 text-[#1B1A17]">{publicSurface.categoryLabel}</span> : null}
          {publicSurface.artifacts.map((artifact) => (
            <span key={artifact} className="rounded-full bg-[#FAFAF8] px-2.5 py-1 text-[#6E6B64]">
              {artifact}
            </span>
          ))}
          {publicSurface.counts ? (
            <span className="rounded-full bg-white px-2.5 py-1 text-[#8A857B] ring-1 ring-[#E7E4DD]">
              할 일 {publicSurface.counts.steps}개
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] md:items-stretch">
          <SourceBackedFlowMapSaveButton
            mapId={map.id}
            savedFlows={publicSurface.childFlows.map((flow) => ({
              slug: flow.slug,
              artifactMode: flow.destination === 'sheet' ? 'sheet' : flow.destination === 'calendar' || flow.destination === 'hybrid' ? 'calendar' : 'checklist',
            }))}
            setupInput={publicSurface.setupInput}
          />
          {firstStep ? (
            <div data-testid="flow-map-first-action-preview" className="rounded-xl bg-[#FAFAF8] px-3 py-3 md:flex md:flex-col md:justify-center">
              <p className="text-[11px] font-semibold text-[#6E6B64]">먼저 할 일</p>
              <h2 className="mt-1 line-clamp-2 break-keep text-sm font-semibold text-slate-950">{firstStep.title}</h2>
              {firstStepDetail ? <p className="mt-1 line-clamp-2 break-keep text-xs font-medium leading-5 text-slate-600">{firstStepDetail}</p> : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-[#E7E4DD] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#6E6B64]">원문과 실행 항목</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{toUserFacingSourceTitle(publicSurface.sourceTitle)}</h2>
            <p className="mt-1 max-w-2xl break-keep text-sm leading-6 text-[#6E6B64]">{getUserFacingMapSummary(publicSurface.summary)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <p className="rounded-full bg-[#FAFAF8] px-2.5 py-1 text-xs font-semibold text-[#6E6B64]">{publicSurface.setupInput ? '입력 1개' : '입력 없음'}</p>
            <a data-testid="flow-map-source-link" className="rounded-full border border-[#E7E4DD] bg-white px-2.5 py-1 text-xs font-semibold text-[#3654FF] hover:border-[#3654FF]/40" href={map.sourceUrl} target="_blank" rel="noreferrer">
              원문 보기
            </a>
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          {publicSurface.childFlows.map((flow) => (
            <article key={flow.slug} className="min-w-0 rounded-2xl border border-[#E7E4DD] bg-white p-4">
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
                    바로 시작
                  </Link>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {flow.steps.map((step) => (
                  <div key={step.id} className="min-w-0 rounded-xl border border-[#E7E4DD] bg-[#FAFAF8] px-3 py-3">
                    {step.stepTitle ? <p className="text-xs font-semibold text-[#6E6B64]">{toUserFacingSourceTitle(step.stepTitle)}</p> : null}
                    <p className="mt-1 text-sm font-semibold text-slate-950">{step.title}</p>
                    {step.detailItems.length > 0 ? (
                      <>
                        <p className="mt-2 rounded-md bg-white px-3 py-2 text-[13px] font-medium leading-5 text-slate-700">
                          첫 체크: {step.detailItems[0]}
                        </p>
                        <details data-testid="flow-map-public-step-items" className="mt-2 rounded-xl border border-[#E7E4DD] bg-white px-3 py-2.5">
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
                      <details className="mt-2 min-w-0 rounded-xl border border-[#E7E4DD] bg-white px-3 py-2.5">
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
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      </div>
    </main>
  );
}
