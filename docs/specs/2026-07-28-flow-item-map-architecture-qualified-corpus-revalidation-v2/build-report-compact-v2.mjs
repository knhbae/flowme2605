// Historical compact report generator retained after the expanded presentation redesign.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SPEC_DIR, '..', '..', '..');
const OUTPUT = path.join(
  REPO_ROOT,
  'docs',
  'content-audit',
  '2026-07-28-flow-item-map-architecture-qualified-portfolio-fit-review-v2-ko.html',
);

const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(SPEC_DIR, name), 'utf8'));

const fixture = read('qualified-corpus-fixture-v2.json');
const delta = read('baseline-delta-v2.json');
const readiness = read('rights-and-readiness-matrix-v2.json');
const scorecard = read('architecture-scorecard-v2.json');
const projections = read('projection-matrix-v2.json');
const losses = read('projection-loss-manifest-v2.json');
const roundTrip = read('round-trip-results-v2.json');
const vertical = read('vertical-opportunity-appendix-v1.json');
const adjudication = read('final-adjudication-v2.json');

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeVerdict(value = '') {
  const lower = String(value).toLowerCase();
  if (lower.includes('go') || lower.includes('adopt')) return 'go';
  if (lower.includes('modify') || lower.includes('conditional')) return 'modify';
  if (lower.includes('hold') || lower.includes('reject')) return 'hold';
  return 'neutral';
}

function flattenItems(record) {
  return record.bundle.map.flows.flatMap((flow) =>
    flow.steps.flatMap((step) =>
      step.items.map((item) => ({
        ...item,
        flowId: flow.flowId,
        flowTitle: flow.title,
        stepId: step.stepId,
        stepTitle: step.title,
      })),
    ),
  );
}

function scheduleLabel(schedule) {
  if (!schedule) return '날짜 없음';
  if (typeof schedule === 'string') return schedule;
  const parts = [];
  if (schedule.type) parts.push(schedule.type);
  if (schedule.dayOffset !== undefined) parts.push(`D${schedule.dayOffset >= 0 ? '+' : ''}${schedule.dayOffset}`);
  if (schedule.day_offset !== undefined) parts.push(`D${schedule.day_offset >= 0 ? '+' : ''}${schedule.day_offset}`);
  if (schedule.day !== undefined) parts.push(`Day ${schedule.day}`);
  if (schedule.week !== undefined) parts.push(`${schedule.week}주차`);
  if (schedule.weekday) parts.push(schedule.weekday);
  if (schedule.date) parts.push(schedule.date);
  return parts.length ? parts.join(' · ') : '원문 일정';
}

function naturalProjection(record) {
  const primary = record.taxonomy.primaryArtifact;
  const secondary = record.taxonomy.secondaryArtifacts ?? [];
  const scheduled = record.metrics.scheduledItems;
  const tags = [primary, ...secondary];
  if (scheduled) tags.unshift('VEVENT');
  else tags.unshift('Calendar 없음');
  if (!scheduled) tags.push('VTODO는 지원 시에만');
  return [...new Set(tags)];
}

const readinessByBundle = new Map(
  readiness.records
    .filter((record) => record.includedInNormalCorpusTotals === true)
    .map((record) => [record.bundleId, record]),
);

const projectionRecords =
  projections.records ??
  projections.items ??
  projections.itemProjections ??
  projections.projectionRecords ??
  [];

const projectionByItem = new Map(
  projectionRecords
    .filter((record) => record.itemId)
    .map((record) => [record.itemId, record]),
);

const architectures =
  scorecard.architectures ??
  scorecard.records ??
  scorecard.options ??
  [];

const architectureById = new Map(
  architectures.map((architecture) => [
    architecture.id ?? architecture.architectureId,
    architecture,
  ]),
);

const currentArchitecture =
  architectureById.get('current_canonical') ??
  architectureById.get('current_canonical_v2') ??
  architectureById.get('current_canonical_v1') ??
  architectures[0] ??
  {};

function architectureScore(architecture) {
  return (
    architecture.score ??
    architecture.totalScore ??
    architecture.total ??
    architecture.weightedScore ??
    0
  );
}

function architectureVerdict(architecture) {
  return (
    architecture.verdict ??
    architecture.decision ??
    architecture.status ??
    '검토'
  );
}

function architectureLabel(architecture) {
  const raw =
    architecture.label ??
    architecture.name ??
    architecture.id ??
    architecture.architectureId ??
    'Architecture';
  return (
    {
      'Current canonical': '현 Canonical Item 구조',
      'Literal ICS-first': '문자 그대로의 ICS-first',
      'Item-first shared context': 'Item-first + SharedContext',
    }[raw] ?? raw
  );
}

const architectureSummaryKo = {
  current_canonical_v1:
    '160 Item과 210 SourceRow를 원본 데이터로 보존하면서 일정이 있는 112개만 VEVENT로 투영합니다. 전체 canonical 계약을 유지하고 목적지에 맞춰 Calendar 출력을 바꿀 수 있습니다.',
  literal_ics_first:
    '48개 날짜 없는 Item과 provenance 보존이 VTODO·RELATED-TO·X-property 지원에 의존해 두 필수 조건을 통과하지 못했습니다. 로컬 구문은 맞아도 외부 도구에서 완료 상태와 출처가 보존된다는 뜻은 아닙니다.',
  item_first_shared_context:
    '의미 보존은 통과하지만 공유 일정이 필요한 corpus가 이사 1개뿐이라 새 canonical entity 비용을 정당화하지 못했습니다. 묶기의 장점은 projection 시점에만 적용하는 편이 낫습니다.',
};

function architectureFitForBundle(record) {
  const direct =
    projections.bundleResults?.find?.((entry) => entry.bundleId === record.bundleId)
      ?.architectureFit ??
    projections.bundles?.find?.((entry) => entry.bundleId === record.bundleId)
      ?.architectureFit ??
    adjudication.bundleResults?.find?.((entry) => entry.bundleId === record.bundleId)
      ?.architectureFit ??
    projectionRecords.find((entry) => entry.bundleId === record.bundleId)
      ?.readiness?.architectureFit;
  if (direct) return direct;
  const verdict = architectureVerdict(currentArchitecture);
  return normalizeVerdict(verdict) === 'go' ? 'Go' : verdict;
}

const imageByCreator = {
  'home-ajd': 'creator-home-ajd-source.png',
  'family-babyfood016': 'creator-family-babyfood016-source.png',
  'study-mansour': 'creator-study-mansour-source.png',
  'study-opentutorials': 'creator-study-opentutorials-source.png',
  'money-getcha': 'creator-money-getcha-source.png',
  'health-allblanc': 'creator-health-allblanc-source.png',
  'meals-wtable': 'creator-meals-wtable-source.png',
  'work-andstudio': 'creator-work-andstudio-source.png',
};

const categoryLabels = {
  home_living: '집·살림',
  family_parenting: '가족·육아',
  study_reading: '공부·독서',
  money_admin_purchase: '돈·행정·구매',
  health_fitness: '건강·운동',
  meals_grocery: '식사·장보기',
  work_career: '일·커리어',
  travel_outings: '여행·외출',
  hobby_pet: '취미·반려',
};

const artifactLabels = {
  calendar: 'Calendar',
  checklist: 'Checklist',
  todo: 'Todo',
  sheet: 'Sheet',
  memo: 'Memo',
};

function tag(value, tone = '') {
  return `<span class="tag ${tone}">${esc(artifactLabels[value] ?? value)}</span>`;
}

function statusCell(label, value) {
  const tone = normalizeVerdict(value);
  return `<div class="status-cell"><span>${esc(label)}</span><strong class="${tone}">${esc(value)}</strong></div>`;
}

function itemProjection(item, record) {
  const fromMatrix = projectionByItem.get(item.itemId);
  let names =
    fromMatrix?.enabledProjections ??
    fromMatrix?.projections ??
    fromMatrix?.destinations ??
    [];
  if (names && !Array.isArray(names) && typeof names === 'object') {
    names = Object.entries(names)
      .filter(([, value]) => value?.eligible === true)
      .map(([key, value]) => {
        if (key === 'calendar' && value.component) return value.component;
        if (key === 'vtodo') {
          return value.defaultEnabled
            ? 'VTODO'
            : 'VTODO 후보(기본 off)';
        }
        return key;
      });
    if (fromMatrix.vtodoFallback) names.push('Fallback 필수');
  }
  if (Array.isArray(names) && names.length) return names;
  return item.schedule
    ? ['VEVENT', record.taxonomy.primaryArtifact, ...record.taxonomy.secondaryArtifacts]
    : ['no-calendar', record.taxonomy.primaryArtifact, ...record.taxonomy.secondaryArtifacts];
}

function compactItems(record, limit = 4) {
  const items = flattenItems(record);
  return `<ol class="compact-items">
    ${items
      .slice(0, limit)
      .map(
        (item) => `<li>
          <span class="checkmark">✓</span>
          <div><strong>${esc(item.itemTitle)}</strong><small>${esc(item.stepTitle)} · ${esc(scheduleLabel(item.schedule))}</small></div>
        </li>`,
      )
      .join('')}
  </ol>
  ${items.length > limit ? `<p class="more">외 ${items.length - limit}개 Item · 아래 전체 카드에서 모두 확인</p>` : ''}`;
}

function sourceToItemExample(record) {
  const item = flattenItems(record)[0];
  const rows = item.sourceRowIds
    .map((id) => record.sourceRows.find((row) => row.sourceRowId === id))
    .filter(Boolean);
  return `<div class="trace">
    <div class="trace-part source">
      <span>SourceRow</span>
      ${rows.map((row) => `<strong>${esc(row.label)}</strong><small>${esc(row.sourceLocator)}</small>`).join('')}
    </div>
    <i>→</i>
    <div class="trace-part item">
      <span>Canonical Item</span>
      <strong>${esc(item.itemTitle)}</strong>
      <small>${esc(item.memo || '상세 설명은 원문 링크와 함께 보존')}</small>
    </div>
    <i>→</i>
    <div class="trace-part projection">
      <span>Projection</span>
      <strong>${itemProjection(item, record).map((value) => artifactLabels[value] ?? value).join(' · ')}</strong>
      <small>${item.schedule ? '일정 근거 있음' : '날짜를 발명하지 않음'}</small>
    </div>
  </div>`;
}

function heroCase(record) {
  const r = readinessByBundle.get(record.bundleId) ?? record.readiness;
  const image = imageByCreator[record.creatorId];
  const setupCount = record.bundle.setupFields?.length ?? 0;
  return `<article class="hero-case">
    <a class="case-image" href="${esc(record.bundle.sourceUrls[0])}" target="_blank" rel="noreferrer">
      <img src="2026-07-27-creator-portfolio-qualified-assets/${esc(image)}" alt="${esc(record.creatorName)} 원문 근거 화면">
    </a>
    <div class="case-body">
      <div class="case-kicker"><span>${esc(categoryLabels[record.taxonomy.lifeArea])}</span><b>${record.metrics.items} Item</b></div>
      <h3>${esc(record.title)}</h3>
      <p>${esc(record.userJob)}</p>
      <div class="case-meta">
        <span>입력 ${setupCount}개</span>
        <span>${record.metrics.scheduledItems ? `일정 ${record.metrics.scheduledItems}` : '날짜 발명 0'}</span>
        <span>Public ${esc(r.publicReadiness)}</span>
      </div>
      ${sourceToItemExample(record)}
    </div>
  </article>`;
}

function fullItemRows(record) {
  const items = flattenItems(record);
  return `<div class="item-table" role="table" aria-label="${esc(record.title)} 전체 Item">
    ${items
      .map((item, index) => {
        const projectionsForItem = itemProjection(item, record);
        return `<div class="item-table-row" role="row">
          <span class="item-no">${index + 1}</span>
          <div class="item-main">
            <strong>${esc(item.itemTitle)}</strong>
            <small>${esc(item.flowTitle)} › ${esc(item.stepTitle)}</small>
          </div>
          <span class="schedule ${item.schedule ? 'dated' : 'undated'}">${esc(scheduleLabel(item.schedule))}</span>
          <div class="tiny-tags">${projectionsForItem.slice(0, 4).map((value) => tag(value)).join('')}</div>
          <span class="provenance">${item.sourceRowIds.length} source</span>
        </div>`;
      })
      .join('')}
  </div>`;
}

function fullSourceRows(record) {
  return `<div class="source-row-list">
    ${record.sourceRows
      .map(
        (row) => `<div>
          <code>${esc(row.sourceRowId)}</code>
          <strong>${esc(row.label)}</strong>
          <small>${esc(row.sourceLocator)}</small>
        </div>`,
      )
      .join('')}
  </div>`;
}

function corpusCard(record) {
  const r = readinessByBundle.get(record.bundleId) ?? record.readiness;
  const scheduleClass =
    record.metrics.scheduledItems === 0
      ? 'undated'
      : record.metrics.undatedItems === 0
        ? 'scheduled'
        : 'mixed';
  const image = imageByCreator[record.creatorId];
  const architectureFit = architectureFitForBundle(record);
  const personal =
    r.personalConversionAvailability?.status ??
    record.readiness.personalConversionAvailability?.status ??
    '확인 필요';
  const reviews = r.reviews ?? record.readiness.reviews ?? {};
  return `<article class="corpus-card" data-card data-category="${esc(record.taxonomy.lifeArea)}" data-schedule="${scheduleClass}" data-public="${esc(String(r.publicReadiness).toLowerCase())}">
    <header class="corpus-head">
      <div>
        <span class="eyebrow">${esc(categoryLabels[record.taxonomy.lifeArea])} · ${esc(record.taxonomy.executionPattern)}</span>
        <h3>${esc(record.title)}</h3>
        <p>${esc(record.userJob)}</p>
      </div>
      <div class="artifact-stack">
        ${tag(record.taxonomy.primaryArtifact, 'primary')}
        ${(record.taxonomy.secondaryArtifacts ?? []).map((value) => tag(value)).join('')}
      </div>
    </header>
    <div class="corpus-grid">
      <figure class="source-figure">
        <a href="${esc(record.bundle.sourceUrls[0])}" target="_blank" rel="noreferrer">
          <img src="2026-07-27-creator-portfolio-qualified-assets/${esc(image)}" alt="${esc(record.creatorName)} 원문 캡처">
        </a>
        <figcaption><strong>${esc(record.creatorName)}</strong><span>${record.metrics.sourceRows} SourceRow</span></figcaption>
      </figure>
      <section class="card-summary">
        <div class="metrics-row">
          <div><span>Flow</span><strong>${record.metrics.flows}</strong></div>
          <div><span>Step</span><strong>${record.metrics.steps}</strong></div>
          <div><span>Item</span><strong>${record.metrics.items}</strong></div>
          <div><span>일정 / 없음</span><strong>${record.metrics.scheduledItems} / ${record.metrics.undatedItems}</strong></div>
        </div>
        ${compactItems(record, 5)}
        <div class="projection-strip">
          ${naturalProjection(record).map((value, index) => tag(value, index === 0 ? 'primary' : '')).join('')}
        </div>
      </section>
    </div>
    <div class="status-grid">
      ${statusCell('Architecture fit', architectureFit)}
      ${statusCell('Logic readiness', r.logicReadiness)}
      ${statusCell('Public readiness', r.publicReadiness)}
      ${statusCell('Rights', r.rightsStatus)}
      ${statusCell('개인 변환', personal)}
      ${statusCell('Source completeness', reviews.sourceCompleteness ?? '기록 없음')}
      ${statusCell('Safety / locale', `${reviews.safetyReview ?? '미기록'} / ${reviews.localeReview ?? '미기록'}`)}
      ${statusCell('Privacy / promotion', `${reviews.privacyReview ?? '미기록'} / ${r.promotionState ?? '미기록'}`)}
    </div>
    <details>
      <summary>전체 ${record.metrics.items} Item과 projection 보기</summary>
      ${fullItemRows(record)}
    </details>
    <details>
      <summary>전체 ${record.metrics.sourceRows} SourceRow 보기</summary>
      ${fullSourceRows(record)}
    </details>
  </article>`;
}

function architectureCard(architecture, index) {
  const dimensions =
    architecture.dimensions ??
    architecture.criteria ??
    architecture.dimensionScores ??
    [];
  const score = architectureScore(architecture);
  const verdict = architectureVerdict(architecture);
  const tone = normalizeVerdict(verdict);
  const architectureId = architecture.id ?? architecture.architectureId;
  const baselineScore =
    delta.baseline.architectureScores?.[architectureId] ?? '—';
  const scoreDelta =
    typeof baselineScore === 'number' ? score - baselineScore : null;
  const keyEvidence =
    architectureSummaryKo[architectureId] ??
    architecture.summary ??
    architecture.rationale ??
    architecture.conclusion ??
    architecture.evidence ??
    '';
  return `<article class="architecture-card ${tone}">
    <header><span>${String.fromCharCode(65 + index)}</span><div><small>${esc(verdict)} · v1 ${baselineScore} → v2 ${score}${scoreDelta === null ? '' : ` (${scoreDelta >= 0 ? '+' : ''}${scoreDelta})`}</small><h3>${esc(architectureLabel(architecture))}</h3></div><strong>${score}</strong></header>
    <p>${esc(typeof keyEvidence === 'string' ? keyEvidence : JSON.stringify(keyEvidence))}</p>
    <div class="dimension-list">
      ${dimensions
        .map((dimension) => {
          const value = dimension.score ?? dimension.value ?? 0;
          const max = dimension.max ?? dimension.maxScore ?? 10;
          const width = max ? Math.min(100, (value / max) * 100) : 0;
          return `<div><span>${esc(dimension.label ?? dimension.id ?? dimension.name)}</span><b>${value}/${max}</b><i><em style="width:${width}%"></em></i></div>`;
        })
        .join('')}
    </div>
  </article>`;
}

function boundaryCard(record) {
  const boundaryReason =
    record.boundaryReason ??
    record.reason ??
    record.publicReason ??
    record.exclusionReason ??
    '최신 정상 corpus 수치에서 제외';
  const promotionCondition =
    record.promotionCondition && record.promotionCondition !== boundaryReason
      ? ` 승격 조건: ${record.promotionCondition}`
      : '';
  return `<article class="boundary-card">
    <span>Historical / boundary</span>
    <h3>${esc(record.title ?? record.displayName ?? record.bundleId)}</h3>
    <div class="boundary-status">
      ${tag(`Logic ${record.logicReadiness}`, normalizeVerdict(record.logicReadiness))}
      ${tag(`Public ${record.publicReadiness}`, normalizeVerdict(record.publicReadiness))}
    </div>
    <p>${esc(`${boundaryReason}${promotionCondition}`)}</p>
    <strong>${esc(record.rightsStatus ?? '')}</strong>
  </article>`;
}

function verticalCard(opportunity) {
  return `<article class="vertical-card">
    <span>#${opportunity.rank ?? ''} · ${esc(opportunity.opportunityStatus ?? opportunity.decision ?? opportunity.status)}</span>
    <h3>${esc(opportunity.title)}</h3>
    <dl>
      <div><dt>user moment</dt><dd>${esc(opportunity.userMoment ?? opportunity.userMomentContract ?? '발굴 시 확인')}</dd></div>
      <div><dt>natural artifact</dt><dd>${esc(opportunity.naturalArtifact)}</dd></div>
      <div><dt>minimum anchor</dt><dd>${esc(opportunity.minimumAnchor ?? opportunity.expectedInputs?.join(', ') ?? '')}</dd></div>
      <div><dt>required rows</dt><dd>${esc((opportunity.requiredSourceRows ?? []).join(' · '))}</dd></div>
      <div><dt>canonical category</dt><dd>${esc(opportunity.canonicalCategoryMapping?.canonicalLifeArea ?? opportunity.canonicalCategory ?? opportunity.categoryCanonical ?? opportunity.category)}</dd></div>
    </dl>
    <p>${esc(opportunity.doNotBuildBoundary ?? opportunity.publicUseBoundary ?? '')}</p>
  </article>`;
}

const exampleIds = [
  'bundle-opentutorials-web1-progress',
  'bundle-moving-d30',
  'bundle-wtable-summer-banchan-five',
];
const examples = exampleIds.map((id) => fixture.bundles.find((record) => record.bundleId === id));
if (examples.some((record) => !record)) {
  throw new Error('Required hero examples are missing from the Qualified v2 fixture.');
}

const current = delta.currentCorpus.counts;
const baseline = delta.baseline.counts;
const publicCounts = fixture.publicReadinessCounts;
const boundaries =
  readiness.records.filter(
    (record) => record.includedInNormalCorpusTotals === false,
  ) ?? [];

const projectionSummary =
  projections.summary ??
  projections.counts ??
  projections.projectionSummary ??
  {};
const lossSummary =
  losses.summary ??
  losses.counts ??
  losses.lossSummary ??
  {};
const roundTripSummary =
  roundTrip.summary ??
  roundTrip.verification ??
  roundTrip.resultsSummary ??
  {};

const finalDecisionCode =
  adjudication.decision ??
  adjudication.finalDecision ??
  adjudication.verdict ??
  'Item canonical 유지';
const finalDecision =
  finalDecisionCode === 'keep_current_canonical_v1_add_projection_time_grouping'
    ? 'Canonical Item 유지 + 내보낼 때만 묶기'
    : finalDecisionCode;
const finalRationale =
  adjudication.rationale ??
  adjudication.summary ??
  adjudication.conclusion ??
  '';
const finalRationaleText = Array.isArray(finalRationale)
  ? finalRationale
      .map(
        (line) =>
          ({
            'Current canonical scored 95/100 on the new 160-Item corpus and passed every hard gate.':
              '현 canonical 구조는 새 160 Item corpus에서 95점을 받았고 모든 필수 조건을 통과했습니다.',
            '48/160 Items are undated; forcing ICS-first makes their usable behavior depend on VTODO support that was not externally tested.':
              '160개 중 48개는 날짜가 없습니다. ICS-first를 강제하면 이 실행 경험이 아직 외부 검증하지 않은 VTODO 지원에 의존합니다.',
            'Only one distinct bundle needs equal-schedule multi-Item grouping, below the frozen three-bundle threshold for a persisted SharedContext entity.':
              '같은 일정의 여러 Item을 묶어야 하는 Bundle은 이사 1개뿐이라, 영속 SharedContext 도입 기준 3개에 미달했습니다.',
            'Literal ICS-first can pass a local syntax parser but cannot portably own FlowMe completion, provenance, rights/review, and private overlay without X-properties or a sidecar.':
              'Literal ICS-first는 로컬 문법 parser는 통과했지만 X-property나 sidecar 없이 완료·출처·권리 검토·개인 overlay를 이식성 있게 소유할 수 없습니다.',
          })[line] ?? line,
      )
      .join(' ')
  : typeof finalRationale === 'string'
    ? finalRationale
    : JSON.stringify(finalRationale);

const backendRules =
  adjudication.backendRules ??
  adjudication.adoptNow ??
  adjudication.recommendations ??
  [];
const backendRuleKorean = {
  'Reject VEVENT generation when effective Item.schedule is null.':
    'effective Item.schedule이 null이면 VEVENT 생성을 거부한다.',
  'Never nest VEVENT or VTODO; emit sibling components inside VCALENDAR.':
    'VEVENT와 VTODO를 중첩하지 않고 VCALENDAR 안의 형제 component로 내보낸다.',
  'Keep stable Item ID + occurrence key as projection identity.':
    '안정적인 Item ID와 occurrence key를 projection 식별자로 유지한다.',
  'For step_bundle, include all child Item IDs and set completionOwner=canonical_item_state.':
    'step_bundle에는 모든 child Item ID를 넣고 completionOwner=canonical_item_state로 선언한다.',
  'Treat VTODO, RELATED-TO, VALARM, VJOURNAL, and X-property preservation as capability flags, not assumptions.':
    'VTODO·RELATED-TO·VALARM·VJOURNAL·X-property 보존은 가정하지 말고 destination capability flag로 다룬다.',
  'Keep rights/review/private overlay out of user exports while retaining them in canonical DTO storage.':
    '권리·검토·개인 overlay는 canonical DTO에는 보존하되 사용자 export에는 노출하지 않는다.',
  'Do not turn test-only anchor dates into source facts.':
    '실험용 anchor 날짜를 원문 사실로 승격하지 않는다.',
};
const verifiedMetrics = adjudication.verifiedMetrics ?? {};

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FlowMe Item·Map Architecture Qualified Corpus Revalidation v2</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22><rect width=%2264%22 height=%2264%22 rx=%2216%22 fill=%22%230e2920%22/><path d=%22M17 17h31v8H26v8h17v8H26v16h-9z%22 fill=%22%23dafa70%22/></svg>">
  <style>
    :root{--ink:#13201a;--muted:#66736d;--line:#dce6df;--paper:#f4f7f2;--white:#fff;--green:#166348;--deep:#0e2920;--lime:#dafa70;--mint:#dff3e7;--blue:#275da4;--amber:#a66111;--amber-bg:#fff1d5;--red:#a3453f;--red-bg:#fae7e5;--shadow:0 20px 60px rgba(20,49,37,.09)}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",Arial,sans-serif;line-height:1.55}a{color:inherit}.wrap{width:min(1360px,calc(100% - 48px));margin:auto}.slide{min-height:900px;padding:64px 0;border-bottom:1px solid var(--line);display:flex;align-items:center}.eyebrow{font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:var(--green)}h1{font-size:clamp(48px,6vw,86px);line-height:.98;letter-spacing:-.058em;margin:18px 0}h2{font-size:clamp(34px,4.4vw,62px);line-height:1.04;letter-spacing:-.048em;margin:8px 0 18px}h3{font-size:25px;line-height:1.16;letter-spacing:-.03em;margin:7px 0}.lead{font-size:20px;max-width:900px;color:var(--muted)}.hero{background:radial-gradient(circle at 82% 12%,rgba(218,250,112,.22),transparent 28%),linear-gradient(145deg,#0e2920,#1a4b38);color:white;align-items:flex-start}.hero .wrap{padding-top:18px}.hero .eyebrow{color:var(--lime)}.hero-copy{display:grid;grid-template-columns:1.45fr .55fr;gap:28px;align-items:end}.hero-copy p{color:#d8e7df;max-width:870px;font-size:20px}.decision-box{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);border-radius:24px;padding:24px}.decision-box span{font-size:12px;color:var(--lime);font-weight:900}.decision-box strong{font-size:25px;line-height:1.18;display:block;margin-top:8px}.hero-stats{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin:26px 0}.hero-stats div{border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.07);padding:13px;border-radius:16px}.hero-stats span{display:block;color:#bcd0c5;font-size:10px}.hero-stats strong{font-size:25px;color:white}.hero-stats small{display:block;color:var(--lime);font-size:10px}.hero-cases{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:20px}.hero-case{background:var(--white);color:var(--ink);border-radius:22px;overflow:hidden;box-shadow:var(--shadow)}.case-image{height:112px;display:block;background:#e5ece7}.case-image img{width:100%;height:100%;object-fit:cover;display:block}.case-body{padding:16px}.case-kicker{display:flex;justify-content:space-between;color:var(--green);font-size:11px;font-weight:900}.case-body h3{font-size:20px}.case-body>p{font-size:12px;color:var(--muted);min-height:37px}.case-meta{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.case-meta span{font-size:10px;background:#edf3ee;border-radius:99px;padding:5px 8px}.trace{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:stretch;gap:5px;margin-top:11px}.trace>i{font-style:normal;align-self:center;color:var(--green)}.trace-part{border-radius:10px;padding:8px;background:#f5f7f4;min-width:0}.trace-part span,.trace-part small{display:block;font-size:8px;color:var(--muted)}.trace-part strong{font-size:10px;line-height:1.25;display:block;margin:3px 0;word-break:keep-all}.trace-part small{max-height:24px;overflow:hidden;overflow-wrap:anywhere}.trace-part.item{background:#e7f3ea}.trace-part.projection{background:#eef2fb}.section-head{max-width:950px;margin-bottom:32px}.section-head p{font-size:18px;color:var(--muted)}.delta-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.delta-board{background:white;border:1px solid var(--line);border-radius:24px;padding:28px;box-shadow:var(--shadow)}.delta-row{display:grid;grid-template-columns:1.2fr .6fr auto .6fr .55fr;gap:12px;align-items:center;padding:13px 0;border-bottom:1px solid var(--line)}.delta-row:last-child{border-bottom:0}.delta-row span{color:var(--muted)}.delta-row b{font-size:23px}.delta-row i{font-style:normal;color:var(--green)}.delta-row em{font-style:normal;font-weight:900}.delta-row em.up{color:var(--green)}.delta-row em.down{color:var(--amber)}.replacement{display:grid;gap:12px}.replace-card{background:white;border:1px solid var(--line);border-radius:22px;padding:22px}.replace-card.added{border-color:#94c9aa}.replace-card.removed{border-color:#e0bd86}.replace-card span{font-size:11px;font-weight:900;color:var(--green)}.replace-card p{color:var(--muted);font-size:13px}.architecture-intro{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}.hierarchy{background:var(--deep);color:white;border-radius:24px;padding:28px}.hierarchy-flow{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-top:20px}.hierarchy-flow span{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.13);padding:14px 10px;border-radius:14px;font-size:12px;font-weight:900;text-align:center}.hierarchy-flow i{color:var(--lime);font-style:normal}.ics-boundary{background:white;border:1px solid var(--line);border-radius:24px;padding:28px}.ics-boundary ul{padding-left:20px;color:var(--muted)}.architecture-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.architecture-card{background:white;border:1px solid var(--line);border-radius:24px;padding:22px}.architecture-card.go{border-top:5px solid var(--green)}.architecture-card.modify{border-top:5px solid var(--amber)}.architecture-card.hold{border-top:5px solid var(--red)}.architecture-card header{display:flex;gap:12px;align-items:center}.architecture-card header>span{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#edf2ee;font-weight:900}.architecture-card header>div{flex:1}.architecture-card header small{color:var(--green);font-weight:900}.architecture-card header strong{font-size:38px}.architecture-card p{min-height:60px;color:var(--muted);font-size:13px}.dimension-list{display:grid;gap:6px}.dimension-list>div{display:grid;grid-template-columns:1fr auto;gap:5px;font-size:10px}.dimension-list i{grid-column:1/-1;height:4px;background:#e8eeea;border-radius:99px;overflow:hidden}.dimension-list em{display:block;height:100%;background:var(--green)}.filter-bar{position:sticky;top:0;z-index:20;background:rgba(244,247,242,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);padding:10px 0}.filters{display:flex;gap:7px;overflow:auto}.filter{appearance:none;background:white;border:1px solid var(--line);border-radius:99px;padding:9px 13px;white-space:nowrap;font-weight:800;color:var(--ink);cursor:pointer}.filter[aria-pressed=true]{background:var(--deep);color:white;border-color:var(--deep)}.corpus-section{padding:60px 0}.corpus-stack{display:grid;gap:22px}.corpus-card{background:white;border:1px solid var(--line);border-radius:26px;padding:26px;box-shadow:var(--shadow)}.corpus-card[hidden]{display:none}.corpus-head{display:flex;justify-content:space-between;gap:20px}.corpus-head p{color:var(--muted);margin:8px 0}.artifact-stack,.projection-strip,.tiny-tags,.boundary-status{display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start}.tag{font-size:10px;background:#edf2ee;border-radius:99px;padding:6px 9px;white-space:nowrap}.tag.primary{background:var(--deep);color:white}.tag.go{background:var(--mint);color:var(--green)}.tag.modify{background:var(--amber-bg);color:var(--amber)}.tag.hold{background:var(--red-bg);color:var(--red)}.corpus-grid{display:grid;grid-template-columns:330px 1fr;gap:26px;margin-top:18px}.source-figure{margin:0;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#edf2ee}.source-figure img{width:100%;height:260px;object-fit:cover;display:block}.source-figure figcaption{display:flex;justify-content:space-between;padding:12px;font-size:12px}.source-figure figcaption span{color:var(--muted)}.metrics-row{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.metrics-row div{background:#f2f6f2;border-radius:12px;padding:10px}.metrics-row span{font-size:9px;color:var(--muted);display:block}.metrics-row strong{font-size:18px}.compact-items{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:5px}.compact-items li{display:flex;gap:8px;padding:7px 0;border-bottom:1px solid #edf1ee}.checkmark{width:21px;height:21px;border-radius:6px;background:var(--mint);color:var(--green);display:grid;place-items:center;font-size:11px;font-weight:900}.compact-items strong{font-size:12px}.compact-items small{display:block;color:var(--muted);font-size:9px}.more{font-size:10px;color:var(--muted);overflow-wrap:anywhere}.status-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:20px}.status-cell{background:#f5f7f4;border-radius:12px;padding:10px;min-width:0}.status-cell span{font-size:9px;color:var(--muted);display:block}.status-cell strong{font-size:11px;word-break:break-word}.status-cell strong.go{color:var(--green)}.status-cell strong.modify{color:var(--amber)}.status-cell strong.hold{color:var(--red)}details{border-top:1px solid var(--line);margin-top:16px;padding-top:14px}summary{cursor:pointer;font-weight:900;color:var(--green)}.item-table{margin-top:14px;max-height:520px;overflow:auto;border:1px solid var(--line);border-radius:14px}.item-table-row{display:grid;grid-template-columns:36px minmax(220px,1.4fr) minmax(100px,.7fr) minmax(180px,1fr) 70px;gap:9px;align-items:center;padding:9px;border-bottom:1px solid var(--line);font-size:11px}.item-table-row:last-child{border-bottom:0}.item-no{font-family:ui-monospace,Consolas,monospace;color:var(--muted)}.item-main small{display:block;color:var(--muted)}.schedule{font-size:9px;padding:5px 7px;border-radius:8px;background:var(--mint);color:var(--green)}.schedule.undated{background:#eef0f6;color:#59637c}.provenance{font-size:9px;color:var(--blue)}.tiny-tags .tag{font-size:8px;padding:4px 6px}.source-row-list{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:14px;max-height:520px;overflow:auto}.source-row-list>div{background:#f5f7f4;border-radius:12px;padding:10px}.source-row-list code{display:block;color:var(--blue);font-size:9px;word-break:break-all}.source-row-list strong{display:block;font-size:11px}.source-row-list small{display:block;color:var(--muted);font-size:9px}.projection-summary{display:grid;grid-template-columns:1.1fr .9fr;gap:24px}.projection-board,.qa-board{background:white;border:1px solid var(--line);border-radius:24px;padding:28px;min-width:0}.big-number{font-size:64px;line-height:1;color:var(--green);font-weight:900}.projection-board ul,.qa-board ul{padding-left:20px;color:var(--muted)}.invariant-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:20px}.invariant{background:#f2f6f2;border-radius:14px;padding:13px;min-width:0}.invariant span{display:block;color:var(--muted);font-size:10px}.invariant strong{font-size:20px}.boundary-grid,.vertical-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.boundary-card,.vertical-card{background:white;border:1px solid var(--line);border-radius:22px;padding:22px}.boundary-card>span,.vertical-card>span{font-size:10px;color:var(--amber);font-weight:900}.boundary-card p,.vertical-card p{color:var(--muted);font-size:12px}.vertical-card dl{margin:14px 0}.vertical-card dl>div{display:grid;grid-template-columns:130px 1fr;gap:8px;border-top:1px solid var(--line);padding:7px 0;font-size:11px}.vertical-card dt{color:var(--muted)}.vertical-card dd{margin:0}.final{background:var(--deep);color:white}.final .eyebrow{color:var(--lime)}.final-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:28px}.final-grid>*{min-width:0}.final-decision{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:26px;padding:30px;min-width:0}.final-decision strong{font-size:34px;line-height:1.2;color:var(--lime);display:block}.final-decision p{color:#d3e1d9;overflow-wrap:anywhere}.final-decision code,.rule-list div{overflow-wrap:anywhere;word-break:break-word}.rule-list{display:grid;gap:8px;min-width:0}.rule-list div{background:white;color:var(--ink);border-radius:15px;padding:13px;font-size:12px}.not-run{background:#213c33;border-radius:20px;padding:22px;margin-top:18px;color:#c9d8d0}.not-run strong{color:white}.footer-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.footer-links a{border:1px solid rgba(255,255,255,.25);border-radius:99px;padding:8px 11px;font-size:11px}.empty-result{padding:40px;text-align:center;color:var(--muted);display:none}
    @media(max-width:980px){.slide{min-height:auto;padding:48px 0}.hero-copy,.delta-grid,.architecture-intro,.projection-summary,.final-grid{grid-template-columns:1fr}.hero-stats{grid-template-columns:repeat(3,1fr)}.hero-cases,.architecture-grid{grid-template-columns:1fr 1fr}.hero-case:last-child{grid-column:1/-1}.corpus-grid{grid-template-columns:1fr}.source-figure img{height:300px}.status-grid{grid-template-columns:repeat(2,1fr)}.hierarchy-flow{flex-wrap:wrap}.boundary-grid,.vertical-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:600px){.wrap{width:calc(100% - 28px)}.slide{padding:38px 0}h1{font-size:43px}.hero-copy p,.lead{font-size:16px}.hero-stats{grid-template-columns:repeat(2,1fr)}.hero-cases,.architecture-grid,.boundary-grid,.vertical-grid{grid-template-columns:1fr}.hero-case:last-child{grid-column:auto}.case-image{height:150px}.trace{grid-template-columns:1fr}.trace>i{transform:rotate(90deg);justify-self:center}.delta-row{grid-template-columns:1fr auto auto auto}.delta-row>span{grid-column:1/-1}.corpus-card{padding:17px;border-radius:20px}.corpus-head{display:block}.artifact-stack{margin-top:10px}.source-figure img{height:230px}.metrics-row{grid-template-columns:repeat(2,1fr)}.status-grid,.source-row-list{grid-template-columns:1fr}.item-table-row{grid-template-columns:28px 1fr}.item-table-row .schedule,.item-table-row .tiny-tags,.item-table-row .provenance{grid-column:2}.vertical-card dl>div{grid-template-columns:1fr}.hierarchy-flow{display:grid;grid-template-columns:1fr}.hierarchy-flow i{transform:rotate(90deg);text-align:center}.big-number{font-size:50px}}
  </style>
</head>
<body>
  <section class="slide hero" id="top">
    <div class="wrap">
      <div class="hero-copy">
        <div>
          <span class="eyebrow">2026-07-28 · Qualified corpus revalidation v2</span>
          <h1>Item은 원본,<br>ICS는 전달물</h1>
          <p>최신 자격 판정 8개 콘텐츠를 같은 160 Item·210 SourceRow로 세 구조에 다시 넣었습니다. 날짜 없는 Item이 늘어난 corpus에서도 실행 상태와 출처를 잃지 않는 구조를 확인합니다.</p>
        </div>
        <aside class="decision-box">
          <span>최종 재판정</span>
          <strong>${esc(finalDecision)}</strong>
        </aside>
      </div>
      <div class="hero-stats">
        <div><span>Bundle</span><strong>${current.bundles}</strong><small>v1 ${baseline.bundles}</small></div>
        <div><span>Flow</span><strong>${current.flows}</strong><small>v1 ${baseline.flows}</small></div>
        <div><span>Step</span><strong>${current.steps}</strong><small>v1 ${baseline.steps}</small></div>
        <div><span>Item</span><strong>${current.items}</strong><small>${delta.countDelta.items >= 0 ? '+' : ''}${delta.countDelta.items}</small></div>
        <div><span>SourceRow</span><strong>${current.sourceRows}</strong><small>${delta.countDelta.sourceRows >= 0 ? '+' : ''}${delta.countDelta.sourceRows}</small></div>
        <div><span>날짜 없음</span><strong>${current.undatedItems}</strong><small>${delta.countDelta.undatedItems >= 0 ? '+' : ''}${delta.countDelta.undatedItems}</small></div>
      </div>
      <div class="hero-cases">
        ${examples.map(heroCase).join('')}
      </div>
    </div>
  </section>

  <section class="slide" id="delta">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow">Corpus delta</span><h2>구조가 틀린 게 아니라<br>시험지가 바뀌었다</h2><p>v1 수치를 덮어쓰지 않았습니다. 7월 23일 corpus는 historical baseline으로 보존하고, 최신 Qualified v2의 로직 이관 8개만 새 정상 corpus로 계산했습니다.</p></div>
      <div class="delta-grid">
        <div class="delta-board">
          ${Object.entries({
            Bundle: 'bundles',
            Flow: 'flows',
            Step: 'steps',
            Item: 'items',
            SourceRow: 'sourceRows',
            '일정 Item': 'scheduledItems',
            '날짜 없는 Item': 'undatedItems',
          })
            .map(([label, key]) => {
              const change = delta.countDelta[key];
              return `<div class="delta-row"><span>${label}</span><b>${baseline[key]}</b><i>→</i><b>${current[key]}</b><em class="${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '+' : ''}${change}</em></div>`;
            })
            .join('')}
        </div>
        <div class="replacement">
          <article class="replace-card added"><span>신규 정상 대표</span><h3>생활코딩 WEB1 진도표</h3><p>26개 날짜 없는 lesson Item. 일정이 없어도 Sheet·Checklist에서 진도를 완전하게 보존하며 현재 유일한 Public Go입니다.</p></article>
          <article class="replace-card removed"><span>Boundary로 이동</span><h3>트리플 여행 체크</h3><p>Logic Modify / Public Modify. 최신성 관리 주체가 불명확해 정상 수치에서 제외했습니다.</p></article>
          <article class="replace-card removed"><span>Boundary로 이동</span><h3>핏펫 예방접종</h3><p>Logic Hold / Public Hold. 권리 허가와 최신 공식 수의학 근거가 필요합니다.</p></article>
        </div>
      </div>
    </div>
  </section>

  <section class="slide" id="architecture">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow">Architecture re-run</span><h2>같은 의미 계약으로<br>세 구조를 다시 계산</h2><p>SourceRow, Item 경계, 사용자 job, completion, schedule, sourceRefs, rights/review 상태를 바꾸지 않은 채 저장 구조만 비교했습니다.</p></div>
      <div class="architecture-intro">
        <article class="hierarchy"><span class="eyebrow">Canonical hierarchy</span><h3>상태는 Item이 소유한다</h3><div class="hierarchy-flow"><span>SourceRow</span><i>→</i><span>Item</span><i>→</i><span>Step</span><i>→</i><span>Flow</span><i>→</i><span>Bundle / Map</span><i>→</i><span>Projection</span></div></article>
        <article class="ics-boundary"><span class="eyebrow">VEVENT 설명서가 바꾼 범위</span><h3>projection 제약은 더 명확해졌다</h3><ul><li>VCALENDAR는 container, VEVENT·VTODO는 형제 component</li><li>VEVENT/VTODO 중첩 금지, VALARM만 하위 component</li><li>날짜 없는 Item은 VEVENT로 만들지 않음</li><li>VTODO client 보존은 확인하지 않았으므로 fallback 필수</li><li>그러나 Flow·Step·Map을 iCalendar component로 재설계하지 않음</li></ul></article>
      </div>
      <div class="architecture-grid">
        ${architectures.map(architectureCard).join('')}
      </div>
    </div>
  </section>

  <div class="filter-bar">
    <div class="wrap filters" aria-label="Qualified corpus 필터">
      <button class="filter" data-filter="all" aria-pressed="true">전체 8개</button>
      <button class="filter" data-filter="schedule:scheduled" aria-pressed="false">일정만</button>
      <button class="filter" data-filter="schedule:undated" aria-pressed="false">날짜 없음</button>
      <button class="filter" data-filter="public:go" aria-pressed="false">Public Go</button>
      <button class="filter" data-filter="public:modify" aria-pressed="false">Public Modify</button>
      <button class="filter" data-filter="public:hold" aria-pressed="false">Public Hold</button>
      ${[...new Set(fixture.bundles.map((record) => record.taxonomy.lifeArea))]
        .map((category) => `<button class="filter" data-filter="category:${esc(category)}" aria-pressed="false">${esc(categoryLabels[category])}</button>`)
        .join('')}
    </div>
  </div>

  <section class="corpus-section" id="corpus">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow">All qualified content</span><h2>8개 콘텐츠를<br>실제 Item으로 검토</h2><p>Architecture fit, Logic readiness, Public readiness와 Rights를 분리했습니다. Logic Go는 공개 Go가 아닙니다.</p></div>
      <div class="corpus-stack" id="corpusStack">${fixture.bundles.map(corpusCard).join('')}</div>
      <p class="empty-result" id="emptyResult">이 필터에 해당하는 콘텐츠가 없습니다.</p>
    </div>
  </section>

  <section class="slide" id="projection">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow">Projection experiment</span><h2>160 Item 전부를<br>목적지별로 비교</h2><p>Calendar는 가능한 projection 중 하나입니다. 날짜 없는 48개 Item은 Calendar 없이도 Checklist·Todo·Sheet·Memo에서 실행 의미를 유지해야 합니다.</p></div>
      <div class="projection-summary">
        <article class="projection-board">
          <span class="eyebrow">Scheduled / undated</span><div class="big-number">${current.scheduledItems} / ${current.undatedItems}</div>
          <ul>
            <li>일정 Item: VEVENT per-item 또는 step bundle + 비Calendar projection</li>
            <li>날짜 없는 Item: VEVENT 0, Todo/Checklist/Sheet/Memo 또는 no-calendar</li>
            <li>VTODO는 지원 destination에서만 사용하고 fallback을 함께 기록</li>
            <li>같은 날짜를 묶어도 canonical Item별 완료 상태는 유지</li>
          </ul>
        </article>
        <article class="qa-board">
          <span class="eyebrow">Hard invariants</span>
          <div class="invariant-grid">
            <div class="invariant"><span>일정 없는 VEVENT</span><strong>${projectionSummary.unscheduledVeventCount ?? projectionSummary.schedulelessVeventCount ?? projectionSummary.schedulelessVevents ?? verifiedMetrics.schedulelessVevents ?? 0}</strong></div>
            <div class="invariant"><span>VEVENT/VTODO 중첩</span><strong>${projectionSummary.nestedComponentCount ?? verifiedMetrics.nestedVeventOrVtodo ?? roundTripSummary.nestedVeventOrVtodo ?? 0}</strong></div>
            <div class="invariant"><span>발명된 행동·날짜</span><strong>${lossSummary.inventedSemanticCount ?? lossSummary.inventionCount ?? ((verifiedMetrics.inventedActions ?? 0) + (verifiedMetrics.inventedSourceDates ?? 0))}</strong></div>
            <div class="invariant"><span>provenance 누락</span><strong>${lossSummary.missingProvenanceCount ?? (verifiedMetrics.uniqueSourceRowsReferenced === current.sourceRows ? 0 : current.sourceRows - (verifiedMetrics.uniqueSourceRowsReferenced ?? 0))}</strong></div>
            <div class="invariant"><span>비Calendar 미지정</span><strong>${projectionSummary.undatedWithoutFallbackCount ?? 0}</strong></div>
            <div class="invariant"><span>외부 client 왕복</span><strong>NOT RUN</strong></div>
          </div>
          <p class="more">Per-item VEVENT ${projectionSummary.perItemVeventCount} · step bundle VEVENT ${projectionSummary.compactStepBundleVeventCount} · VTODO 후보 ${projectionSummary.vtodoEligibleUndatedItems}개는 기본 비활성 · canonical round-trip ${roundTripSummary.canonicalSemanticRoundTripsPassed}/${roundTripSummary.totalRecords}</p>
        </article>
      </div>
    </div>
  </section>

  <section class="slide" id="readiness">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow">Rights & readiness</span><h2>만들 수 있음과<br>공개할 수 있음은 다르다</h2><p>정상 8개는 모두 Logic Go지만 Public Go는 생활코딩 WEB1 하나뿐입니다. 개인 변환, 권리, source completeness, 검토 상태를 같은 칸에 뭉개지 않았습니다.</p></div>
      <div class="metrics-row" style="margin-bottom:26px">
        <div><span>Public Go</span><strong>${publicCounts.Go}</strong></div>
        <div><span>Public Modify</span><strong>${publicCounts.Modify}</strong></div>
        <div><span>Public Hold</span><strong>${publicCounts.Hold}</strong></div>
        <div><span>Logic Go</span><strong>8</strong></div>
      </div>
      <div class="boundary-grid">${boundaries.map(boundaryCard).join('')}</div>
    </div>
  </section>

  <section class="slide" id="vertical">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow">Vertical opportunity appendix</span><h2>8개 기회는<br>아직 변환된 콘텐츠가 아니다</h2><p>${vertical.sourceSummary.discovered}개 발견 → ${vertical.sourceSummary.publiclyVerified}개 공개 근거 검증 → ${vertical.sourceSummary.deepDive}개 심층 분석 → ${vertical.sourceSummary.opportunities}개 발굴 기회. Item·SourceRow 합계 기여는 모두 0입니다.</p></div>
      <div class="vertical-grid">${vertical.opportunities.map(verticalCard).join('')}</div>
    </div>
  </section>

  <section class="slide final" id="decision">
    <div class="wrap">
      <div class="section-head"><span class="eyebrow">Final adjudication</span><h2>Backend가 저장할 것과<br>내보낼 것을 분리</h2></div>
      <div class="final-grid">
        <article class="final-decision"><span>최종 결론</span><strong>${esc(finalDecision)}</strong><p><code>${esc(finalDecisionCode)}</code></p><p>${esc(finalRationaleText)}</p><div class="not-run"><strong>검증 경계</strong><br>자동 schema·validator·browser QA는 실제 사용자 검증이 아닙니다. Google·Outlook·Apple Calendar의 VTODO·RELATED-TO 실제 왕복은 수행하지 않았습니다.</div></article>
        <div>
          <div class="rule-list">
            ${(Array.isArray(backendRules) ? backendRules : Object.values(backendRules))
              .slice(0, 10)
              .map((rule) => {
                const raw =
                  typeof rule === 'string'
                    ? rule
                    : rule.rule ?? rule.title ?? JSON.stringify(rule);
                return `<div>${esc(backendRuleKorean[raw] ?? raw)}</div>`;
              })
              .join('')}
          </div>
          <div class="footer-links">
            <a href="2026-07-28-icalendar-components-easy-explainer-ko.html">VEVENT·VTODO 쉬운 설명</a>
            <a href="2026-07-27-creator-portfolio-qualified-review-ko.html">Qualified v2 콘텐츠 판정</a>
            <a href="2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-review-ko.html">Historical v1 baseline</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <script>
    const buttons = [...document.querySelectorAll('[data-filter]')];
    const cards = [...document.querySelectorAll('[data-card]')];
    const empty = document.getElementById('emptyResult');
    function applyFilter(value) {
      const [axis, expected] = value.split(':');
      let visible = 0;
      for (const card of cards) {
        const match = value === 'all' || card.dataset[axis] === expected;
        card.hidden = !match;
        if (match) visible += 1;
      }
      empty.style.display = visible ? 'none' : 'block';
      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === value));
    }
    for (const button of buttons) button.addEventListener('click', () => applyFilter(button.dataset.filter));
  </script>
</body>
</html>`;

fs.writeFileSync(OUTPUT, html, 'utf8');
console.log(
  JSON.stringify(
    {
      output: path.relative(REPO_ROOT, OUTPUT).replaceAll('\\', '/'),
      bytes: Buffer.byteLength(html),
      bundles: fixture.counts.bundles,
      items: fixture.counts.items,
      sourceRows: fixture.counts.sourceRows,
      architectures: architectures.length,
    },
    null,
    2,
  ),
);
