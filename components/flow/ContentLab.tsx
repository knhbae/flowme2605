import Link from 'next/link';
import {
  convertedPilotSlugs,
  expansionCreatorLabs,
  getContentLabSummary,
  pilotCreatorLabs,
  scoreCandidate,
} from '@/lib/flow/content-lab';
import {
  FLOW_LIFECYCLE_BUCKET_LABELS,
  type FlowLifecycleBucket,
} from '@/lib/flow/content-lifecycle';
import {
  SOURCE_REVIEW_PRIORITY_LABELS,
  type SourceReviewPriority,
} from '@/lib/flow/source-review-priority';
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

function lifecycleBucketClass(value: FlowLifecycleBucket): string {
  const classes: Record<FlowLifecycleBucket, string> = {
    keep: 'bg-emerald-50 text-emerald-950',
    fix: 'bg-amber-50 text-amber-950',
    preview_only: 'bg-blue-50 text-blue-950',
    hide: 'bg-red-50 text-red-950',
    remove_candidate: 'bg-gray-100 text-gray-950',
  };
  return classes[value];
}

function sourceReviewPriorityClass(value: SourceReviewPriority): string {
  const classes: Record<SourceReviewPriority, string> = {
    audit_now: 'bg-emerald-50 text-emerald-950',
    source_replacement: 'bg-blue-50 text-blue-950',
    risk_review: 'bg-red-50 text-red-950',
    content_backlog: 'bg-amber-50 text-amber-950',
  };
  return classes[value];
}

function representativeReadinessClass(value: string): string {
  const classes: Record<string, string> = {
    representative_candidate: 'bg-emerald-50 text-emerald-950',
    public_mvp_candidate: 'bg-blue-50 text-blue-950',
    keep_fix: 'bg-amber-50 text-amber-950',
  };
  return classes[value] ?? 'bg-gray-50 text-gray-950';
}

function representativeReadinessLabel(value: string): string {
  const labels: Record<string, string> = {
    representative_candidate: '대표 후보',
    public_mvp_candidate: 'Public MVP 후보',
    keep_fix: '보강 유지',
  };
  return labels[value] ?? value;
}

function exportFirstSimulationClass(value: string): string {
  const classes: Record<string, string> = {
    ready_for_final_promotion_qa: 'bg-emerald-50 text-emerald-950',
    public_mvp_after_ux_fix: 'bg-blue-50 text-blue-950',
    keep_fix: 'bg-amber-50 text-amber-950',
  };
  return classes[value] ?? 'bg-gray-50 text-gray-950';
}

function exportFirstSimulationLabel(value: string): string {
  const labels: Record<string, string> = {
    ready_for_final_promotion_qa: 'Final QA candidate',
    public_mvp_after_ux_fix: 'Public MVP after UX fix',
    keep_fix: 'Keep fixing',
  };
  return labels[value] ?? value;
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
          현재 seed 기준으로 수동 audit {summary.manualSourceFitAuditedCount}개와 원본 metadata 기반 1차 분류{' '}
          {summary.derivedRealSourceReviewedCount}개가 별도 관리됩니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {[
            { label: '전체', value: summary.inventoryTotalCount, className: 'bg-gray-50 text-gray-950' },
            { label: '실제 원본', value: summary.realSourceFlowCount, className: 'bg-emerald-50 text-emerald-950' },
            { label: '샘플 후보', value: summary.previewCandidateFlowCount, className: 'bg-blue-50 text-blue-950' },
            { label: '수동 검토', value: summary.manualSourceFitAuditedCount, className: 'bg-amber-50 text-amber-950' },
            { label: '1차 분류', value: summary.derivedRealSourceReviewedCount, className: 'bg-gray-50 text-gray-950' },
            { label: '검토 대기', value: summary.sourceNeedsReviewInventoryCount, className: 'bg-amber-50 text-amber-950' },
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
        <p className="text-sm font-semibold text-blue-700">Lifecycle Classification</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-950">전체 Flow 운영 분류</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Source-fit audit, real-source 자연 산출물 audit, preview/legacy inventory를 합쳐 현재 서비스에서
          유지할 것과 보강할 것, 미리보기로 둘 것, 정리 후보를 분리합니다. 이번 기준에서는 실제 원본 Flow의
          즉시 공개 숨김 대상은 없습니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(summary.lifecycleBucketCounts) as FlowLifecycleBucket[]).map((bucket) => (
            <div key={bucket} className={`rounded-lg p-3 ${lifecycleBucketClass(bucket)}`}>
              <p className="text-sm opacity-75">{FLOW_LIFECYCLE_BUCKET_LABELS[bucket]}</p>
              <p className="mt-1 text-2xl font-semibold">{summary.lifecycleBucketCounts[bucket]}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">대표 유지</p>
            <p className="mt-2 text-sm leading-6 text-emerald-950">
              {summary.lifecycleKeepSlugs.join(' · ')}
            </p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">보강 우선 샘플</p>
            <p className="mt-2 text-sm leading-6 text-amber-950">
              {summary.lifecycleFixSlugs.slice(0, 8).join(' · ')}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">삭제 후보 샘플</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              {summary.lifecycleRemoveCandidateSlugs.length > 0
                ? summary.lifecycleRemoveCandidateSlugs.slice(0, 8).join(' · ')
                : '현재 삭제 후보 없음'}
            </p>
            <p className="mt-3 text-xs leading-5 text-gray-500">
              원본 URL이 있는 legacy 항목은 삭제 후보가 아니라 보강 필요로 분류합니다. route 삭제는 별도 검토 후 진행합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-blue-700">Broad Source Guard</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-950">넓은 출처 대표 승격 차단</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          채널, 사이트, FAQ, 포털처럼 route-level 원본이 아직 넓은 실제 원본 Flow를 따로 추적합니다.
          이 목록은 exact video, exact page, source-derived row set이 붙기 전까지 public MVP나 대표 후보로 보지 않습니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-950">
            <p className="text-sm text-blue-800">Broad real sources</p>
            <p className="mt-1 text-2xl font-semibold">{summary.broadRealSourceCount}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-950">
            <p className="text-sm text-emerald-800">Representative leaks</p>
            <p className="mt-1 text-2xl font-semibold">{summary.broadRealSourceRepresentativeLeakSlugs.length}</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Exact source replacement queue</p>
          <p className="mt-2 text-sm leading-6 text-gray-700">
            {summary.broadRealSourceSlugs.length > 0 ? summary.broadRealSourceSlugs.join(' · ') : 'none'}
          </p>
          <p className="mt-3 text-xs leading-5 text-gray-500">
            Leak list: {summary.broadRealSourceRepresentativeLeakSlugs.length > 0
              ? summary.broadRealSourceRepresentativeLeakSlugs.join(' · ')
              : 'none'}
          </p>
        </div>
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-950">Hidden broad-source decisions</p>
          <p className="mt-2 text-sm leading-6 text-red-900">
            {summary.broadRealSourceHiddenSlugs.length > 0 ? summary.broadRealSourceHiddenSlugs.join(' · ') : 'none'}
          </p>
          <p className="mt-3 text-xs leading-5 text-red-800">
            These routes stay out of the active replacement queue until an exact route-level source is found.
          </p>
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-blue-700">Representative Readiness</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-950">대표 승격 1차 심사</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          PR #25와 #26에서 산출물 surface와 item copy를 보강한 source/risk route 중 먼저 3개만 평가합니다.
          실제 대표 노출은 바꾸지 않고, 사용자 행동 데이터와 화면 QA가 쌓일 때까지 운영 분류는 보강 필요로 유지합니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {Object.entries(summary.representativeReadinessDecisionCounts).map(([decision, count]) => (
            <div key={decision} className={`rounded-lg p-3 ${representativeReadinessClass(decision)}`}>
              <p className="text-sm opacity-75">{representativeReadinessLabel(decision)}</p>
              <p className="mt-1 text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {summary.representativeReadinessReviews.map((review) => (
            <article key={review.slug} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{review.slug}</p>
                  <Link className="mt-1 block font-semibold text-gray-950 hover:text-blue-700" href={`/f/${review.slug}`}>
                    {bundleBySlug.get(review.slug)?.flow.title ?? review.slug}
                  </Link>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${representativeReadinessClass(review.decision)}`}>
                  {review.label} · {review.score}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-700">{review.userNeed}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">산출물: {review.destination}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">다음: {review.nextAction}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-blue-700">Representative UX Content Review</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-950">Current user-run review queue</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          This panel tracks the current representative and public-MVP candidates as simulated user runs: first action,
          external artifact, UX gap, mobile density risk, and source/risk boundary. These labels do not mean validated.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Object.entries(summary.representativeUxContentReviewDecisionCounts).map(([decision, count]) => (
            <div key={decision} className="rounded-lg bg-gray-50 p-3 text-gray-950">
              <p className="text-sm text-gray-700">{decision}</p>
              <p className="mt-1 text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {summary.representativeUxContentReviews.map((review) => (
            <article key={review.slug} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{review.slug}</p>
                  <Link className="mt-1 block font-semibold text-gray-950 hover:text-blue-700" href={`/f/${review.slug}`}>
                    {bundleBySlug.get(review.slug)?.flow.title ?? review.slug}
                  </Link>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                  {review.decision}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-700">{review.firstAction}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Output: {review.naturalOutput}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Gap: {review.currentUxGap}</p>
              <p className="mt-2 text-xs leading-5 text-gray-500">{review.statusAfterReview}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-blue-700">Mobile Simulation Protocol</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-950">Observed-session rehearsal script</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          This panel turns hard-to-schedule user recruiting into a repeatable internal mobile rehearsal. It records task
          script, required evidence, pass/failure signals, and the next observed-session action. It does not mark any
          route as validated.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3 text-gray-950">
            <p className="text-sm text-gray-600">Routes</p>
            <p className="mt-1 text-2xl font-semibold">{summary.mobileSimulationProtocolTotalCount}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-blue-950">
            <p className="text-sm text-blue-800">Score</p>
            <p className="mt-1 text-2xl font-semibold">avg score {summary.mobileSimulationProtocolAverageScore}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-amber-950">
            <p className="text-sm text-amber-800">Validation</p>
            <p className="mt-1 text-2xl font-semibold">
              {summary.mobileSimulationProtocolValidatedCount === 0
                ? 'No validated routes'
                : `${summary.mobileSimulationProtocolValidatedCount} validated`}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {summary.mobileSimulationProtocolRecords.map((protocol) => (
            <article key={protocol.slug} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{protocol.slug}</p>
                  <Link className="mt-1 block font-semibold text-gray-950 hover:text-blue-700" href={`/f/${protocol.slug}`}>
                    {bundleBySlug.get(protocol.slug)?.flow.title ?? protocol.slug}
                  </Link>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
                  {protocol.simulationScore}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-700">{protocol.taskScript[0]}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Pass: {protocol.passSignals[0]}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Fail: {protocol.failureSignals[0]}</p>
              <p className="mt-2 text-xs leading-5 text-gray-500">{protocol.statusAfterSimulation}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-blue-700">UX Cleanup Backlog</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-950">Unresolved content and UX areas</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          This queue separates areas that are not yet fully cleaned up from routes that merely have source review.
          It keeps broad rewriting work ordered before asking another reviewer or AI to inspect the catalog.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3 text-gray-950">
            <p className="text-sm text-gray-600">Groups</p>
            <p className="mt-1 text-2xl font-semibold">{summary.uxCleanupBacklogTotalGroupCount}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-blue-950">
            <p className="text-sm text-blue-800">Routes</p>
            <p className="mt-1 text-2xl font-semibold">{summary.uxCleanupBacklogTotalRouteCount} routes</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-amber-950">
            <p className="text-sm text-amber-800">P1 groups</p>
            <p className="mt-1 text-2xl font-semibold">{summary.uxCleanupBacklogPriorityCounts.P1}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-red-950">
            <p className="text-sm text-red-800">Validation</p>
            <p className="mt-1 text-2xl font-semibold">{summary.uxCleanupBacklogValidatedCount} validated</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {summary.uxCleanupBacklogGroups.slice(0, 3).map((group) => (
            <article key={group.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{group.id}</p>
                  <h3 className="mt-1 font-semibold text-gray-950">{group.label}</h3>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                  {group.priority}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-700">{group.unresolvedGap}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Minimum: {group.requiredMinimum.slice(0, 3).join(' / ')}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Routes: {group.routeSlugs.length}</p>
              <p className="mt-2 text-xs leading-5 text-gray-500">{group.statusAfterCleanup}</p>
            </article>
          ))}
        </div>
      </section>

      <section data-testid="design-ref-gap-queue-panel" className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-blue-700">Design-ref gap queue</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-950">Reference alignment status</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          This queue separates UI work already landed from the remaining design-ref gaps. Landed means implemented in
          the current product surface; it does not mean validated by user behavior.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          <div className="rounded-lg bg-gray-50 p-3 text-gray-950">
            <p className="text-sm text-gray-600">Total</p>
            <p className="mt-1 text-2xl font-semibold">{summary.designRefGapQueueTotalCount} items</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-950">
            <p className="text-sm text-emerald-800">Landed</p>
            <p className="mt-1 text-2xl font-semibold">{summary.designRefGapQueueLandedCount} landed</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-amber-950">
            <p className="text-sm text-amber-800">Pending</p>
            <p className="mt-1 text-2xl font-semibold">{summary.designRefGapQueuePendingCount} pending</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-blue-950">
            <p className="text-sm text-blue-800">Priority</p>
            <p className="mt-1 text-2xl font-semibold">{summary.designRefGapQueueP1PendingCount} P1 pending</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-red-950">
            <p className="text-sm text-red-800">Validation</p>
            <p className="mt-1 text-2xl font-semibold">{summary.designRefGapQueueValidatedCount} validated</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Pending alignment</p>
            <div className="mt-3 space-y-3">
              {summary.designRefGapQueuePendingItems.map((item) => (
                <article key={item.id} className="rounded-lg border border-amber-100 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-amber-700">{item.id}</p>
                      <h3 className="mt-1 font-semibold text-gray-950">{item.label}</h3>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950">
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-700">{item.nextAction}</p>
                  <p className="mt-2 text-xs leading-5 text-gray-500">Routes: {item.routeSlugs.join(' / ')}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{item.statusAfterAlignment}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-950">Landed alignment</p>
            <div className="mt-3 space-y-3">
              {summary.designRefGapQueueLandedItems.map((item) => (
                <article key={item.id} className="rounded-lg border border-emerald-100 bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700">{item.id}</p>
                      <h3 className="mt-1 font-semibold text-gray-950">{item.label}</h3>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-950">
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-700">{item.nextAction}</p>
                  <p className="mt-2 text-xs leading-5 text-gray-500">Routes: {item.routeSlugs.join(' / ')}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{item.statusAfterAlignment}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-blue-700">Export-first Simulation</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-950">User execution simulation batch 1</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          This queue reviews the same three candidates as real user rehearsals: anchor input, natural artifact rows,
          copy/export destination, risk boundary, and feature diet. It keeps FLOW export-first before native record
          keeping becomes the primary behavior.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {Object.entries(summary.exportFirstSimulationDecisionCounts).map(([decision, count]) => (
            <div key={decision} className={`rounded-lg p-3 ${exportFirstSimulationClass(decision)}`}>
              <p className="text-sm opacity-75">{exportFirstSimulationLabel(decision)}</p>
              <p className="mt-1 text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {summary.exportFirstSimulationReviews.map((review) => (
            <article key={review.slug} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{review.slug}</p>
                  <Link className="mt-1 block font-semibold text-gray-950 hover:text-blue-700" href={`/f/${review.slug}`}>
                    {bundleBySlug.get(review.slug)?.flow.title ?? review.slug}
                  </Link>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${exportFirstSimulationClass(review.decision)}`}>
                  {review.label}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-700">{review.userScenario}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">External tool: {review.externalTool}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">First action: {review.firstAction}</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-gray-600">
                {review.artifactRows.slice(0, 3).map((row) => (
                  <li key={row}>Sample: {row}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm leading-6 text-gray-600">Next: {review.nextAction}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-blue-700">Needs-review Priority</p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-950">검토 대기 우선순위</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          source URL은 있지만 아직 수동 source-fit audit을 통과하지 않은 {summary.sourceReviewPriorityTotalCount}개를
          다음 작업 순서로 나눕니다. exact source와 실행 구조가 있는 Flow는 바로 audit하고, broad source는 원본을 먼저
          교체하며, 민감 영역은 공식 기준과 고지를 먼저 확인합니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(summary.sourceReviewPriorityCounts) as SourceReviewPriority[]).map((priority) => (
            <div key={priority} className={`rounded-lg p-3 ${sourceReviewPriorityClass(priority)}`}>
              <p className="text-sm opacity-75">{SOURCE_REVIEW_PRIORITY_LABELS[priority]}</p>
              <p className="mt-1 text-2xl font-semibold">{summary.sourceReviewPriorityCounts[priority]}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {summary.sourceReviewPriorityItems.slice(0, 6).map((item) => (
            <article key={item.slug} className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{item.slug}</p>
                  <Link className="mt-1 block font-semibold text-gray-950 hover:text-blue-700" href={`/f/${item.slug}`}>
                    {item.title}
                  </Link>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sourceReviewPriorityClass(item.priority)}`}>
                  {item.label} · {item.score}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{item.reason}</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">다음: {item.nextAction}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">Natural Artifact Audit</p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-950">사용자가 실제로 만들 산출물 기준 검토</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              원본을 보고 사용자가 FLOW 없이 만들 법한 달력, 체크리스트, 메모, 엑셀표를 실제 입력값으로 먼저
              시뮬레이션한 뒤 현재 Flow 콘텐츠와 UX가 얼마나 맞는지 비교합니다.
              Broad channel/site sources stay in catalog review until an exact source URL is assigned.
            </p>
          </div>
          <div className="grid min-w-[260px] grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-950">
              <p className="text-emerald-800">감사 완료</p>
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
          {realSourceNaturalArtifactAudits.slice(-8).map((audit) => (
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
              대표 Flow {summary.sourceFitAuditedCount}개를 먼저 실제 원본 기준으로 평가했습니다. 이번 배치에서는 공개 삭제를 하지 않고,
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
