import Link from 'next/link';
import { buildSourceBackedFlowMapPublishPackage } from '@/lib/flow/source-backed-my-flow';
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

function NotFoundMap() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <PlatformNav />
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">콘텐츠를 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-slate-600">다른 공개 Flow나 내 Flow 데모를 확인해 주세요.</p>
        <Link className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" href="/my?demo=source-backed">
          내 Flow 보기
        </Link>
      </section>
    </main>
  );
}

export function SourceBackedFlowMapPublicPage({ mapId }: SourceBackedFlowMapProps) {
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  if (!publishPackage) return <NotFoundMap />;

  const { map, public: publicSurface } = publishPackage;

  return (
    <main data-testid="flow-map-public" className="mx-auto max-w-5xl px-4 py-5 pb-36 sm:px-5 sm:py-8 sm:pb-16">
      <PlatformNav />
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-blue-700">큰 흐름</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{publicSurface.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{publicSurface.summary}</p>
        {publicSurface.userFacingStatus || publicSurface.categoryLabel || publicSurface.counts ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            {publicSurface.categoryLabel ? <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700">{publicSurface.categoryLabel}</span> : null}
            {publicSurface.userFacingStatus ? <span className="rounded-md bg-blue-50 px-2.5 py-1 text-blue-700">{publicSurface.userFacingStatus}</span> : null}
            {publicSurface.counts ? (
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700">
                {publicSurface.counts.flows}개 흐름 · {publicSurface.counts.steps}단계 · {publicSurface.counts.items}개 체크
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <SourceBackedFlowMapSaveButton
            mapId={map.id}
            savedFlows={publicSurface.childFlows.map((flow) => ({
              slug: flow.slug,
              artifactMode: flow.destination === 'sheet' ? 'sheet' : flow.destination === 'calendar' || flow.destination === 'hybrid' ? 'calendar' : 'checklist',
            }))}
            setupInput={publicSurface.setupInput}
          />
          <a className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 sm:w-auto" href={map.sourceUrl} target="_blank" rel="noreferrer">
            원문 보기
          </a>
        </div>
      </section>

      <section className="mt-4 grid gap-2 sm:grid-cols-3">
        {publicSurface.artifacts.map((artifact) => (
          <div key={artifact} className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-semibold text-blue-700">저장되는 결과물</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{artifact}</p>
          </div>
        ))}
      </section>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">원문</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{publicSurface.sourceTitle}</h2>
          </div>
          <p className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{publicSurface.setupInput ? '입력 1개' : '입력 없음'}</p>
        </div>
        <div className="mt-4 grid gap-4">
          {publicSurface.childFlows.map((flow) => (
            <article key={flow.slug} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{flow.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{flow.steps.length}단계</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    {destinationLabel[flow.destination] ?? flow.destination}
                  </span>
                  <Link className="rounded-md border border-blue-100 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:border-blue-300" href={`/f/${flow.slug}`}>
                    바로 시작
                  </Link>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {flow.steps.map((step) => (
                  <div key={step.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
                    {step.stepTitle ? <p className="text-xs font-semibold text-slate-500">{step.stepTitle}</p> : null}
                    <p className="mt-1 text-sm font-semibold text-slate-950">{step.title}</p>
                    {step.detailItems.length > 0 ? (
                      <details open data-testid="flow-map-public-step-items" className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2.5">
                        <summary className="cursor-pointer text-xs font-semibold text-slate-600">체크 {step.detailItems.length}개</summary>
                        <ul className="mt-2 grid gap-1.5 text-[13px] font-medium leading-5 text-slate-700">
                          {step.detailItems.map((item) => (
                            <li key={item} className="flex gap-1.5">
                              <span className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true">□</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <p className="mt-1 text-xs font-semibold text-slate-500">하위 체크 {step.detailItemCount}개</p>
                    )}
                    {step.memo || step.sourceTrace || step.sourceUrl ? (
                      <details className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-2.5">
                        <summary className="cursor-pointer text-xs font-semibold text-slate-600">메모 · 원문</summary>
                        {step.memo ? <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-5 text-slate-700">{step.memo}</p> : null}
                        {step.sourceTrace ? (
                          <p className="mt-2 whitespace-pre-wrap break-words text-[12px] font-medium leading-5 text-slate-500">
                            원문 근거: {step.sourceTrace}
                          </p>
                        ) : null}
                        {step.sourceUrl ? (
                          <a className="mt-2 inline-flex min-h-8 items-center rounded-md border border-blue-100 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:border-blue-300" href={step.sourceUrl} target="_blank" rel="noreferrer">
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
    </main>
  );
}
