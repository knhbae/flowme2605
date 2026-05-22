import Link from 'next/link';
import {
  convertedPilotSlugs,
  expansionCreatorLabs,
  getContentLabSummary,
  pilotCreatorLabs,
  scoreCandidate,
} from '@/lib/flow/content-lab';
import { seedBundles } from '@/lib/flow/seed-flows';
import { sourceFitAudits, type SourceFitDecision } from '@/lib/flow/source-fit';
import {
  realSourceNaturalArtifactAudits,
  type NaturalArtifactAuditDecision,
} from '@/lib/flow/natural-artifact-audit';

type SeedBundle = (typeof seedBundles)[number];

function targetLabel(value: string): string {
  const labels: Record<string, string> = {
    calendar: 'Calendar',
    todo: 'Todo',
    notion: 'Notion',
    sheet: 'Sheet',
  };
  return labels[value] ?? value;
}

function sourceKindLabel(value: string): string {
  const labels: Record<string, string> = {
    video: '영상',
    channel: '채널',
    article: '글',
    official: '공식',
    community: '커뮤니티',
  };
  return labels[value] ?? value;
}

function convertedPilotLinkLabel(slug: string, title: string): string {
  const labels: Record<string, string> = {
    'samsung-aircon-seasonal-check': '삼성전자서비스 에어컨 계절 전 점검 Flow',
    'vehicle-inspection-prep': '자동차검사 준비 Flow',
    'diet-meal-exercise-log': '다이어트 식단·운동 기록 Flow',
  };
  return labels[slug] ?? title;
}

function sourceFitDecisionLabel(value: SourceFitDecision): string {
  const labels: Record<SourceFitDecision, string> = {
    keep_representative: '대표 유지',
    reshape_before_featured: '보강 후 대표',
    catalog_preview_only: '카탈로그 미리보기',
    hide_from_public_catalog: '공개 숨김',
  };
  return labels[value];
}

function sourceFitDecisionClass(value: SourceFitDecision): string {
  const classes: Record<SourceFitDecision, string> = {
    keep_representative: 'bg-emerald-50 text-emerald-800',
    reshape_before_featured: 'bg-amber-50 text-amber-800',
    catalog_preview_only: 'bg-blue-50 text-blue-800',
    hide_from_public_catalog: 'bg-red-50 text-red-800',
  };
  return classes[value];
}

function naturalArtifactDecisionLabel(value: NaturalArtifactAuditDecision): string {
  const labels: Record<NaturalArtifactAuditDecision, string> = {
    promote_to_manual_source_fit: '수동 audit 승격',
    reshape_content_or_ux: '콘텐츠/UX 보강',
    keep_catalog_review: '카탈로그 검토',
    replace_or_hide_source: '교체/숨김 후보',
  };
  return labels[value];
}

function naturalArtifactDecisionClass(value: NaturalArtifactAuditDecision): string {
  const classes: Record<NaturalArtifactAuditDecision, string> = {
    promote_to_manual_source_fit: 'bg-emerald-50 text-emerald-800',
    reshape_content_or_ux: 'bg-amber-50 text-amber-800',
    keep_catalog_review: 'bg-blue-50 text-blue-800',
    replace_or_hide_source: 'bg-red-50 text-red-800',
  };
  return classes[value];
}

function isSeedBundle(bundle: SeedBundle | undefined): bundle is SeedBundle {
  return Boolean(bundle);
}

export function ContentLab() {
  const summary = getContentLabSummary(seedBundles);
  const bundleBySlug = new Map(seedBundles.map((bundle) => [bundle.flow.slug, bundle]));
  const convertedPilotBundles = convertedPilotSlugs
    .map((slug) => bundleBySlug.get(slug))
    .filter(isSeedBundle);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <Link className="text-lg font-semibold tracking-tight text-gray-950" href="/">
          FLOW
        </Link>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-white" href="/flows">
            공개 Flow
          </Link>
          <Link className="rounded-md bg-[#2563EB] px-3 py-2 font-semibold text-white" href="/flow-lab">
            Flow Lab
          </Link>
        </div>
      </nav>

      <header className="mb-8">
        <p className="text-sm font-semibold text-blue-700">Creator x Flow validation</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-gray-950">
          실제 제작자 콘텐츠가 여러 Flow로 관리되는지 검증
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-gray-600">
          공개 채널, 제작자 사이트, 공식 안내를 원천 소스로 두고 기존 작동 Flow와 확장 후보를 나눠 검증합니다.
          원문을 복사하지 않고 실행 구조, 날짜, 체크 기준, 외부 도구 연동 가능성만 Flow로 재구성합니다.
        </p>
      </header>

      <section className="mb-8 grid gap-3 md:grid-cols-5">
        {[
          ['파일럿 소스 그룹', summary.pilotCreatorCount],
          ['파일럿 Flow', summary.pilotFlowCount],
          ['확장 소스', summary.expansionCreatorCount],
          ['확장 후보', summary.expansionCandidateCount],
          ['평균 점수', summary.averageCandidateScore],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-blue-700">Content Inventory</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-950">전체 콘텐츠 인벤토리</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          실제 원본 Flow는 전수 분류하고, 생성형 채널 Flow는 검증 완료 콘텐츠가 아닌 샘플 후보로 분리합니다.
          현재 seed 기준으로 수동 audit 10개와 원본 metadata 기반 1차 분류 40개가 별도 관리됩니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            { label: '전체', value: summary.inventoryTotalCount, className: 'bg-gray-50 text-gray-950' },
            { label: '실제 원본', value: summary.realSourceFlowCount, className: 'bg-emerald-50 text-emerald-950' },
            { label: '샘플 후보', value: summary.previewCandidateFlowCount, className: 'bg-blue-50 text-blue-950' },
            { label: '수동 검토', value: summary.manualSourceFitAuditedCount, className: 'bg-amber-50 text-amber-950' },
            { label: '1차 분류', value: summary.derivedRealSourceReviewedCount, className: 'bg-gray-50 text-gray-950' },
            { label: 'legacy 접근', value: summary.legacyAccessibleFlowCount, className: 'bg-gray-50 text-gray-950' },
          ].map((item) => (
            <div key={item.label} className={`rounded-lg p-3 ${item.className}`}>
              <p className="text-sm opacity-75">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-gray-600">
          원본 기반 분류 커버리지: {summary.sourceBackedInventoryReviewedCount}개
          {' '}· preview candidate: {summary.inventoryPublicHandlingCounts.preview_candidate}개
        </p>
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">Natural Artifact Audit</p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-950">사용자가 실제로 만들 산출물 기준 검토</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              원본을 보고 사용자가 FLOW 없이 만들 법한 달력, 체크리스트, 메모, 엑셀표를 실제 입력값으로 먼저
              시뮬레이션한 뒤 현재 Flow 콘텐츠와 UX가 얼마나 맞는지 비교합니다.
            </p>
          </div>
          <div className="grid min-w-[260px] grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-950">
              <p className="text-emerald-800">첫 batch</p>
              <p className="mt-1 text-2xl font-semibold">{summary.naturalArtifactRealSourceAuditedCount}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-gray-950">
              <p className="text-gray-500">남은 real-source</p>
              <p className="mt-1 text-2xl font-semibold">{summary.naturalArtifactRealSourceRemainingCount}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {Object.entries(summary.naturalArtifactDecisionCounts).map(([decision, count]) => (
            <span
              key={decision}
              className={`rounded-full px-3 py-1 font-semibold ${naturalArtifactDecisionClass(decision as NaturalArtifactAuditDecision)}`}
            >
              {naturalArtifactDecisionLabel(decision as NaturalArtifactAuditDecision)} {count}
            </span>
          ))}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {realSourceNaturalArtifactAudits.slice(0, 4).map((audit) => (
            <div key={audit.slug} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{audit.slug}</p>
                  <h3 className="mt-1 text-base font-semibold text-gray-950">{audit.sourceTitle}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${naturalArtifactDecisionClass(audit.decision)}`}>
                  {naturalArtifactDecisionLabel(audit.decision)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{audit.naturalArtifacts[0]?.artifactTitle}</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                입력값: {audit.naturalArtifacts[0]?.simulatedInputs.join(' · ')}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Gap: {audit.naturalArtifacts[0]?.gap}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">수동 Source-Fit Audit</p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-950">원본 콘텐츠가 FLOW화될 가치가 있는지 점검</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              대표 Flow 10개를 먼저 실제 원본 기준으로 평가했습니다. 이번 배치에서는 공개 삭제를 하지 않고,
              원본 적합성 점수와 보강 필요 지점을 내부 Lab에 먼저 노출합니다.
            </p>
          </div>
          <div className="grid min-w-[220px] grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-500">감사 완료</p>
              <p className="mt-1 text-2xl font-semibold text-gray-950">{summary.sourceFitAuditedCount}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-gray-500">평균 점수</p>
              <p className="mt-1 text-2xl font-semibold text-gray-950">{summary.sourceFitAverageScore}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {Object.entries(summary.sourceFitDecisionCounts).map(([decision, count]) => (
            <span
              key={decision}
              className={`rounded-full px-3 py-1 font-semibold ${sourceFitDecisionClass(decision as SourceFitDecision)}`}
            >
              {sourceFitDecisionLabel(decision as SourceFitDecision)} {count}
            </span>
          ))}
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="border-b border-gray-200 py-2 pr-4">Flow</th>
                <th className="border-b border-gray-200 py-2 pr-4">점수</th>
                <th className="border-b border-gray-200 py-2 pr-4">판정</th>
                <th className="border-b border-gray-200 py-2 pr-4">원본</th>
                <th className="border-b border-gray-200 py-2 pr-4">간극</th>
                <th className="border-b border-gray-200 py-2">다음 액션</th>
              </tr>
            </thead>
            <tbody>
              {sourceFitAudits.map((audit) => {
                const bundle = bundleBySlug.get(audit.slug);
                return (
                  <tr key={audit.slug} className="align-top">
                    <td className="border-b border-gray-100 py-3 pr-4">
                      <Link className="font-semibold text-gray-950 hover:text-blue-700" href={bundle ? `/f/${bundle.flow.slug}` : '/flows'}>
                        {bundle?.flow.title ?? audit.slug}
                      </Link>
                      <p className="mt-1 text-xs text-gray-500">{audit.slug}</p>
                    </td>
                    <td className="border-b border-gray-100 py-3 pr-4 font-semibold text-gray-950">{audit.score}</td>
                    <td className="border-b border-gray-100 py-3 pr-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${sourceFitDecisionClass(audit.decision)}`}>
                        {sourceFitDecisionLabel(audit.decision)}
                      </span>
                    </td>
                    <td className="border-b border-gray-100 py-3 pr-4">
                      <a className="font-medium text-blue-700 hover:text-blue-900" href={audit.sourceUrl} target="_blank" rel="noreferrer">
                        {audit.sourcePrecision}
                      </a>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{audit.sourceTitle}</p>
                    </td>
                    <td className="max-w-[280px] border-b border-gray-100 py-3 pr-4 text-gray-600">{audit.currentGap}</td>
                    <td className="max-w-[280px] border-b border-gray-100 py-3 text-gray-600">{audit.contentAction}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-500">Phase 1</p>
            <h2 className="text-2xl font-semibold text-gray-950">3 x 4 파일럿 검증</h2>
          </div>
          <p className="text-sm text-gray-500">
            실제 공개 Flow 연결: {summary.missingPilotFlowSlugs.length === 0 ? '정상' : '누락 있음'}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {pilotCreatorLabs.map((creator) => (
            <article key={creator.id} className="border-t border-gray-200 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-950">{creator.name}</h3>
                  <a
                    className="mt-1 inline-block text-sm font-medium text-blue-700 hover:text-blue-900"
                    href={creator.creatorUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    소스 검색 열기
                  </a>
                </div>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  4 flows
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{creator.thesis}</p>
              <p className="mt-3 rounded-md bg-blue-50 p-3 text-sm font-medium leading-6 text-blue-900">
                {creator.managementQuestion}
              </p>
              <div className="mt-4 space-y-2">
                {creator.flowSlugs.map((slug) => {
                  const bundle = bundleBySlug.get(slug);
                  const source = creator.sources.find((item) => item.flowSlug === slug);
                  return (
                    <div key={slug} className="border-t border-gray-200 py-3 text-sm first:border-t-0 first:pt-0">
                      <Link
                        className="block hover:text-blue-700"
                        href={bundle ? `/f/${bundle.flow.slug}` : '/flows'}
                      >
                        <span className="block font-semibold text-gray-950">{bundle?.flow.title ?? slug}</span>
                        <span className="mt-1 block text-gray-500">
                          {bundle
                            ? `${bundle.flow.category} · ${bundle.flow.structure_type} · ${
                                bundle.items.length || bundle.mealSlots?.length || 0
                              } items`
                            : 'missing'}
                        </span>
                      </Link>
                      {source ? (
                        <a
                          className="mt-2 inline-flex text-xs font-medium text-blue-700 hover:text-blue-900"
                          href={source.sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {source.creatorName} · {sourceKindLabel(source.sourceKind)} · {source.sourceTitle}
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-500">Phase B</p>
            <h2 className="text-2xl font-semibold text-gray-950">B 파일럿 실제 Flow 변환</h2>
            <p className="mt-2 text-sm text-gray-600">
              실제 공식/제작자 소스를 원문 복사가 아닌 실행 구조로 바꾼 10개 대표 Flow입니다.
            </p>
          </div>
          <span className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
            {summary.convertedPilotFlowCount} converted
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {convertedPilotBundles.map((bundle) => (
            <Link
              key={bundle.flow.slug}
              aria-label={convertedPilotLinkLabel(bundle.flow.slug, bundle.flow.title)}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:text-blue-800"
              href={`/f/${bundle.flow.slug}`}
            >
              <span className="block text-xs font-semibold text-gray-500">{bundle.flow.category}</span>
              <span className="mt-1 block text-sm font-semibold text-gray-950">{bundle.flow.title}</span>
              <span className="mt-2 block text-xs text-gray-500">
                {bundle.flow.structure_type} · {bundle.flow.anchor_type} · {bundle.items.length} items
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-500">Phase 2</p>
          <h2 className="text-2xl font-semibold text-gray-950">200+ 제작자 채널 Flow 검증</h2>
          <p className="mt-2 text-sm text-gray-600">
            후보 매트릭스가 아니라, 제작자 채널 안에서 실제 열 수 있는 Preview Flow로 전환된 항목입니다.
            현재 {summary.previewGeneratedFlowCount}개가 공개 Flow 라우트로 연결됩니다.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-800">Actual source-backed batch</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-950">{summary.realSourceFlowCount}</p>
            </div>
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-semibold text-blue-800">Preview-generated library</p>
              <p className="mt-1 text-2xl font-semibold text-blue-950">{summary.previewGeneratedFlowCount}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {expansionCreatorLabs.map((creator) => {
            const average =
              Math.round(
                creator.candidates.reduce((sum, candidate) => sum + scoreCandidate(candidate), 0) /
                  creator.candidates.length,
              );
            return (
              <article key={creator.id} className="border-t border-gray-200 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">{creator.category}</p>
                    <h3 className="text-xl font-semibold text-gray-950">{creator.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">{creator.thesis}</p>
                    <a
                      className="mt-2 inline-block text-sm font-medium text-blue-700 hover:text-blue-900"
                      href={creator.creatorUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      제작자/공식 소스 열기
                    </a>
                  </div>
                  <span className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
                    평균 {average}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {creator.candidates.map((candidate) => (
                    <div key={candidate.id} className="rounded-md border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-5 text-gray-950">{candidate.title}</p>
                        <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                          {scoreCandidate(candidate)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {candidate.structure_type} · {candidate.anchor_type}
                      </p>
                      <a
                        className="mt-2 block text-xs font-medium text-blue-700 hover:text-blue-900"
                        href={candidate.sourceUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {candidate.sourceTitle}
                      </a>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {candidate.externalTargets.map((target) => (
                          <span
                            key={target}
                            className="rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600"
                          >
                            {targetLabel(target)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
