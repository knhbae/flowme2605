import Link from 'next/link';
import { buildSourceBackedFlowMapPublishPackage } from '@/lib/flow/source-backed-my-flow';
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

const sourceTypeLabel: Record<string, string> = {
  creator_experience: '제작자 경험',
  official: '공식 정보',
  reference: '참고 원문',
};

const riskLevelLabel: Record<string, string> = {
  financial_sensitive: '재무 민감',
  legal_sensitive: '법률 민감',
  low: '낮은 위험',
  medical_sensitive: '건강 민감',
  medium: '주의 필요',
};

const reviewStatusClass: Record<string, string> = {
  needs_items: 'bg-amber-50 text-amber-900 ring-amber-200',
  needs_source: 'bg-rose-50 text-rose-900 ring-rose-200',
  ready: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

function NotFoundMap() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">Flow Map을 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm text-slate-600">다른 공개 Flow나 내 Flow 데모를 확인해 주세요.</p>
        <Link className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" href="/my?demo=source-backed">
          내 Flow 데모 보기
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
    <main data-testid="flow-map-public" className="mx-auto max-w-5xl px-4 py-5 pb-16 sm:px-5 sm:py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-blue-700">실행형 지도</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{publicSurface.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{publicSurface.summary}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <SourceBackedFlowMapSaveButton
            mapId={map.id}
            savedFlows={publicSurface.childFlows.map((flow) => ({
              slug: flow.slug,
              artifactMode: flow.destination === 'sheet' ? 'sheet' : flow.destination === 'calendar' || flow.destination === 'hybrid' ? 'calendar' : 'checklist',
            }))}
            setupInput={publicSurface.setupInput}
          />
          <a className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700" href={map.sourceUrl} target="_blank" rel="noreferrer">
            원문 열기
          </a>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {publicSurface.artifacts.map((artifact) => (
          <div key={artifact} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">{artifact}</p>
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
                <h3 className="text-lg font-semibold text-slate-950">{flow.title}</h3>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  {destinationLabel[flow.destination] ?? flow.destination}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {flow.steps.map((step) => (
                  <div key={step.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-950">{step.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">하위 항목 {step.detailItemCount}개</p>
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

export function SourceBackedFlowMapCreatorPage({ mapId }: SourceBackedFlowMapProps) {
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  if (!publishPackage) return <NotFoundMap />;

  const { creator, map, myFlow } = publishPackage;
  const readyToPublish = creator.publishBlockers.length === 0;
  const readyRowCount = creator.sourceRows.filter((row) => row.reviewStatus === 'ready').length;
  const sourceCheckCount = creator.sourceRows.filter((row) => row.reviewStatus === 'needs_source').length;
  const itemCheckCount = creator.sourceRows.filter((row) => row.reviewStatus === 'needs_items').length;

  return (
    <main data-testid="flow-map-creator" className="mx-auto max-w-6xl px-4 py-5 pb-16 sm:px-5 sm:py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-blue-700">제작자 발행 준비</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{map.title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          원문 구조가 사용자에게 저장될 Step과 하위 항목으로 옮겨졌는지 확인합니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" href={creator.publicPreviewHref}>
            공개 화면 보기
          </Link>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800" href={myFlow.demoHref}>
            사용자 저장 결과 보기
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm font-semibold text-slate-500">원문 row 검토</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Step과 Item으로 옮겨진 내용</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{map.sourceTitle}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800 ring-1 ring-emerald-200">준비됨 {readyRowCount}</span>
              <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-900 ring-1 ring-rose-200">원문 확인 {sourceCheckCount}</span>
              <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-900 ring-1 ring-amber-200">Item 확인 {itemCheckCount}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {creator.sourceRows.map((row) => (
              <article key={row.stepId} data-testid="flow-map-source-row" className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{row.stepTitle}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{[row.flowTitle, row.sectionTitle].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${reviewStatusClass[row.reviewStatus]}`}>
                      {row.reviewLabel}
                    </span>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-slate-200">
                      {destinationLabel[row.destination] ?? row.destination}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  {row.sourceType ? <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">{sourceTypeLabel[row.sourceType] ?? row.sourceType}</span> : null}
                  {row.riskLevel ? <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">{riskLevelLabel[row.riskLevel] ?? row.riskLevel}</span> : null}
                  <span className="rounded-md bg-white px-2 py-1 ring-1 ring-slate-200">Item {row.itemCount}개</span>
                </div>
                {row.detailItems.length > 0 ? (
                  <ul data-testid="flow-map-source-row-items" className="mt-3 grid gap-1.5 text-sm leading-6 text-slate-700">
                    {row.detailItems.slice(0, 4).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {row.detailItems.length > 4 ? (
                      <li className="text-xs font-semibold text-slate-500">외 {row.detailItems.length - 4}개 Item</li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
                    외부 앱에 붙을 Item 문장을 확인하세요.
                  </p>
                )}
                <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
                  {row.doneWhen ? <p><span className="font-semibold text-slate-800">완료 기준</span> {row.doneWhen}</p> : null}
                  {row.memoHint ? <p><span className="font-semibold text-slate-800">메모 힌트</span> {row.memoHint}</p> : null}
                  <p><span className="font-semibold text-slate-800">검토 메모</span> {row.reviewNote}</p>
                  {row.sourceUrl ? (
                    <a className="font-semibold text-blue-700 underline underline-offset-2" href={row.sourceUrl} target="_blank" rel="noreferrer">
                      원문 근거 열기
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">발행 전 점검</p>
            <div className="mt-3 grid gap-2">
              {creator.publishChecks.map((check) => (
                <p key={check} className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{check}</p>
              ))}
            </div>
            {readyToPublish ? (
              <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">공개 저장 전 화면으로 넘길 수 있습니다.</p>
            ) : (
              <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                {creator.publishBlockers.join(' / ')}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">사용자 저장 결과</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{myFlow.groupedAs}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">저장 후에는 내 Flow에서 진도 row와 메모만 이어서 봅니다.</p>
          </section>
        </aside>
      </section>
    </main>
  );
}
