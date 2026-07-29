import assert from 'node:assert/strict';
import test from 'node:test';
import curatedSourceAppSeed from '../../docs/content-audit/2026-07-01-curated-source-app-seed-v1.json';
import { buildIcsCalendar, buildWorkbookSheets } from './export';
import { seedBundles } from './seed-flows';
import {
  assessProgressStepNeed,
  assessSourceBackedFlowMapUpdate,
  buildSourceBackedFlowMapPersistenceRecord,
  buildSourceBackedFlowMapSavedSnapshot,
  buildSourceBackedFlowMapPublishPackage,
  buildSourceBackedMyFlowRows,
  getSourceBackedFlowMapQualityDecision,
  getSourceBackedHomepageFlowMaps,
  getSourceBackedFlowMapPersistenceStorageKey,
  getSourceBackedFlowMapSnapshotStorageKey,
  getSourceBackedMyFlowMapForBundle,
  listSourceBackedFlowMapQualityDecisions,
  listSourceBackedFlowMapPublishPackages,
  mergeSourceBackedMyFlowBundles,
  sourceBackedMyFlowMaps,
  sourceBackedMyFlowBundles,
} from './source-backed-my-flow';

function bundleBySlug(slug: string) {
  const bundle = sourceBackedMyFlowBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(bundle, slug);
  return bundle;
}

const addedMapIds = [
  'postal-address-transfer',
  'smishing-response',
  'year-end-tax-submit',
  'aircon-filter-cleaning',
  'picnic-food-safety',
];

const addedFlowSlugs = [
  'source-backed-postal-address-transfer',
  'source-backed-smishing-response',
  'source-backed-year-end-tax-submit',
  'source-backed-aircon-filter-cleaning',
  'source-backed-picnic-food-safety',
];

const curatedMapIds = [
  'curated-funmom-learning-park',
  'curated-opic-mock-course',
  'curated-baby-food-meal-log',
  'curated-reading-routine-log',
  'curated-new-car-purchase-guide',
  'curated-child-vaccination-schedule',
  'curated-ajd-moving-d30',
  'curated-wedding-checklist-family',
  'curated-allblanc-workout-park',
];

const curatedFlowSlugs = [
  'curated-funmom-weekly-print-picker',
  'curated-opic-single-mock-review',
  'curated-opic-course-row-import',
  'curated-baby-food-daily-meal-row',
  'curated-baby-food-cube-stock',
  'curated-reading-monthly-log',
  'curated-new-car-basic',
  'curated-child-vaccination-first-year',
  'curated-child-vaccination-booster-school-age',
  'curated-ajd-moving-d30',
  'curated-wedding-naver-timeline',
  'curated-wedding-gongysd-atoz',
  'curated-allblanc-morning-workout',
  'curated-allblanc-no-jump-cardio',
  'curated-allblanc-lower-body',
];

const curatedSourceAppSeedBundleIds = curatedSourceAppSeed.contentBundles.map((bundle) => bundle.bundleId);
const curatedSourceAppSeedRecommendedFlowSlugs = curatedSourceAppSeed.contentBundles.map((bundle) => bundle.recommendedFlowId);

test('source-backed quality decisions separate homepage candidates from direct-route experiments', () => {
  assert.deepEqual(
    getSourceBackedHomepageFlowMaps().map((map) => map.id),
    ['moving-d30', 'middle-school-math-1'],
  );

  assert.equal(getSourceBackedFlowMapQualityDecision('moving-d30').status, 'representative');
  assert.equal(getSourceBackedFlowMapQualityDecision('middle-school-math-1').status, 'candidate');
  assert.equal(getSourceBackedFlowMapQualityDecision('baby-health-schedule').status, 'revise');
  assert.equal(getSourceBackedFlowMapQualityDecision('baby-health-schedule').homepageEligible, false);

  for (const mapId of addedMapIds) {
    const decision = getSourceBackedFlowMapQualityDecision(mapId);
    assert.equal(decision.homepageEligible, false, mapId);
    assert.equal(decision.directRouteEnabled, true, mapId);
    assert.notEqual(decision.status, 'representative', mapId);
  }

  for (const mapId of curatedMapIds) {
    const decision = getSourceBackedFlowMapQualityDecision(mapId);
    assert.equal(decision.homepageEligible, false, mapId);
    assert.equal(decision.directRouteEnabled, true, mapId);
    assert.notEqual(decision.status, 'representative', mapId);
  }

  const decisionIds = listSourceBackedFlowMapQualityDecisions().map((decision) => decision.mapId);
  assert.deepEqual(decisionIds, sourceBackedMyFlowMaps.map((map) => map.id));
});

test('source-backed moving D-30 keeps one Step as one dated FlowItem with item text fallback', () => {
  const moving = bundleBySlug('source-backed-moving-d30');
  const rows = buildSourceBackedMyFlowRows(moving);

  assert.equal(moving.flow.structure_type, 'timeline');
  assert.equal(moving.flow.anchor_type, 'end_date');
  assert.equal(moving.flow.primary_destination, 'hybrid');
  assert.ok(moving.flow.source_url?.startsWith('https://'));
  assert.equal(rows.length, moving.items.length);

  const first = rows[0];
  assert.equal(first.mapId, 'moving-d30');
  assert.equal(first.destination, 'calendar');
  assert.equal(first.calendar?.mode, 'anchor_offset');
  assert.equal(first.calendar?.anchorType, 'end_date');
  assert.equal(first.calendar?.dayOffset, -30);
  assert.ok(first.textFallback.items && first.textFallback.items.length >= 3);
  assert.match(first.textFallback.items?.join('\n') ?? '', /이사 방식/);
  assert.match(first.textFallback.items?.join('\n') ?? '', /견적/);
  assert.match(first.textFallback.doneWhen ?? '', /후보/);

  const ics = buildIcsCalendar(moving, {}, '2026-07-22');
  assert.match(ics, /SUMMARY:원룸 이사 D-30 준비 - 이사 방식과 견적 후보 정하기/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260622/);
  assert.match(ics, /이사 방식/);
  assert.match(ics, /견적 후보/);
});

test('source-backed middle-school math stays a progress destination without inventing progress_step yet', () => {
  const math = bundleBySlug('source-backed-middle-school-math-1');
  const rows = buildSourceBackedMyFlowRows(math);

  assert.equal(math.flow.structure_type, 'phase');
  assert.equal(math.flow.primary_destination, 'sheet');
  assert.ok(math.flow.source_url?.includes('mathbang.net/13'));
  assert.ok(math.flow.tags?.includes('flow-map:middle-school-math-1'));
  assert.equal(rows.length, math.items.length);
  assert.equal(rows.length, 8);

  const first = rows[0];
  assert.equal(first.mapId, 'middle-school-math-1');
  assert.equal(first.destination, 'progress');
  assert.equal(first.calendar?.mode, 'none');
  assert.match(first.textFallback.title, /소인수분해/);
  assert.match(first.textFallback.items?.join('\n') ?? '', /거듭제곱/);
  assert.match(first.textFallback.items?.join('\n') ?? '', /최대공약수/);
  assert.doesNotMatch(first.textFallback.items?.join('\n') ?? '', /오늘 본 범위|오답 번호/);

  const progressDecision = assessProgressStepNeed(math);
  assert.equal(progressDecision.decision, 'not_needed_yet');
  assert.match(progressDecision.reason, /FlowItem/);
  assert.match(progressDecision.reason, /progress/);
});

test('source-backed My Flow bundles can be merged into a product bundle list without publishing duplicates', () => {
  const existing = sourceBackedMyFlowBundles[0];
  const localDraft = {
    ...existing,
    flow: {
      ...existing.flow,
      id: 'flow-local-draft',
      slug: 'local-draft',
      title: 'Local draft',
    },
  };

  const merged = mergeSourceBackedMyFlowBundles([existing, localDraft]);

  assert.equal(merged.filter((bundle) => bundle.flow.slug === existing.flow.slug).length, 1);
  assert.ok(merged.some((bundle) => bundle.flow.slug === 'local-draft'));
  assert.ok(merged.some((bundle) => bundle.flow.slug === 'source-backed-middle-school-math-1'));
});

test('curated source app seed uses canonical seed bundles without source-backed merge duplicates', () => {
  const seedSlugs = new Set(seedBundles.map((bundle) => bundle.flow.slug));
  assert.deepEqual(
    curatedSourceAppSeedRecommendedFlowSlugs.filter((slug) => !seedSlugs.has(slug)),
    [],
  );

  const merged = mergeSourceBackedMyFlowBundles(seedBundles);
  for (const slug of curatedSourceAppSeedRecommendedFlowSlugs) {
    assert.equal(
      merged.filter((bundle) => bundle.flow.slug === slug).length,
      1,
      slug,
    );
  }
});

test('source-backed Flow Map metadata keeps parent map separate from the executable Flow rows', () => {
  const math = bundleBySlug('source-backed-middle-school-math-1');
  const moving = bundleBySlug('source-backed-moving-d30');

  const mathMap = getSourceBackedMyFlowMapForBundle(math);
  const movingMap = getSourceBackedMyFlowMapForBundle(moving);

  assert.ok(sourceBackedMyFlowMaps.length >= 8);
  assert.ok(movingMap);
  assert.equal(movingMap.id, 'moving-d30');
  assert.equal(movingMap.userLabel, '이사 D-30 지도');
  assert.deepEqual(movingMap.flowSlugs, ['source-backed-moving-d30']);
  assert.ok(mathMap);
  assert.equal(mathMap.id, 'middle-school-math-1');
  assert.equal(mathMap.userLabel, '중1 수학 지도');
  assert.deepEqual(mathMap.flowSlugs, ['source-backed-middle-school-math-1']);
  assert.equal(buildSourceBackedMyFlowRows(moving)[0].mapId, movingMap.id);
  assert.equal(buildSourceBackedMyFlowRows(math)[0].mapId, mathMap.id);
});

test('source-backed baby health map keeps official schedule rows behind one birthdate input', () => {
  const healthCheckups = bundleBySlug('source-backed-baby-health-checkups');
  const vaccinations = bundleBySlug('source-backed-baby-vaccination-schedule');

  const checkupRows = buildSourceBackedMyFlowRows(healthCheckups);
  const vaccinationRows = buildSourceBackedMyFlowRows(vaccinations);

  assert.equal(healthCheckups.flow.anchor_type, 'baby_birth_date');
  assert.equal(vaccinations.flow.anchor_type, 'baby_birth_date');
  assert.equal(healthCheckups.flow.risk_level, 'medical_sensitive');
  assert.equal(vaccinations.flow.risk_level, 'medical_sensitive');
  assert.equal(checkupRows.length, 12);
  assert.equal(vaccinationRows.length, 6);
  assert.equal(checkupRows[0].calendar.mode, 'anchor_offset');
  assert.equal(checkupRows[0].calendar.anchorType, 'baby_birth_date');
  assert.equal(checkupRows[0].calendar.dayOffset, 14);
  assert.match(checkupRows[0].textFallback.title, /1차 건강검진/);
  assert.match(checkupRows[0].textFallback.items?.join('\n') ?? '', /문진표/);
  assert.match(vaccinationRows[0].textFallback.url ?? '', /kdca/);

  const babyMap = getSourceBackedMyFlowMapForBundle(healthCheckups);
  assert.ok(babyMap);
  assert.equal(babyMap.id, 'baby-health-schedule');
  assert.deepEqual(babyMap.flowSlugs, [
    'source-backed-baby-health-checkups',
    'source-backed-baby-vaccination-schedule',
  ]);
});

test('source-backed baby health date windows export as one reminder with official period detail', () => {
  const healthCheckups = bundleBySlug('source-backed-baby-health-checkups');
  const checkupRows = buildSourceBackedMyFlowRows(healthCheckups);

  assert.equal(checkupRows[0].calendar.mode, 'anchor_offset');
  assert.equal(checkupRows[0].calendar.dayOffset, 14);
  assert.deepEqual(checkupRows[0].calendar.window, {
    label: '생후 14~35일',
    startDayOffset: 14,
    endDayOffset: 35,
  });

  const ics = buildIcsCalendar(healthCheckups, {}, '2026-01-15');
  const unfoldedIcs = ics.replace(/\r\n /g, '');

  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 12);
  assert.match(unfoldedIcs, /SUMMARY:영유아 건강검진 일정 - 1차 건강검진 · 생후 14~35일/);
  assert.match(unfoldedIcs, /DTSTART;VALUE=DATE:20260129/);
  assert.match(unfoldedIcs, /DTEND;VALUE=DATE:20260130/);
  assert.match(unfoldedIcs, /공식 기간: 생후 14~35일/);
  assert.match(unfoldedIcs, /예상 기간: 2026-01-29 ~ 2026-02-19/);

  const sheets = buildWorkbookSheets(healthCheckups, {}, '2026-01-15');
  const execution = sheets.find((sheet) => sheet.name === '실행표');
  const monthly = sheets.find((sheet) => sheet.name === '월간 보기');
  assert.ok(execution);
  assert.ok(monthly);
  assert.ok(execution.rows.some((row) => row.includes('생후 14~35일') && row.includes('2026-01-29 ~ 2026-02-19')));
  assert.equal(
    monthly.rows
      .flat()
      .map(String)
      .filter((cell) => cell.includes('1차 건강검진')).length,
    1,
  );
});

test('source-backed Flow Map publish package separates creator, public, and my flow surfaces', () => {
  const publishPackage = buildSourceBackedFlowMapPublishPackage('middle-school-math-1');

  assert.ok(publishPackage);
  assert.equal(publishPackage.map.id, 'middle-school-math-1');
  assert.equal(publishPackage.creator.surface, 'creator_publish');
  assert.equal(publishPackage.public.surface, 'public_save');
  assert.equal(publishPackage.myFlow.surface, 'my_flow_saved');
  assert.deepEqual(publishPackage.myFlow.savedSlugs, ['source-backed-middle-school-math-1']);
  assert.equal(publishPackage.myFlow.demoHref, '/my?demo=source-backed&savedMap=middle-school-math-1');
  assert.equal(publishPackage.public.setupInputs.length, 0);
  assert.equal(publishPackage.public.setupInput, undefined);
  assert.equal(publishPackage.public.primaryCta.href, '/my');
  assert.equal(publishPackage.creator.sourceRows.length, 8);
  assert.equal(publishPackage.creator.draft.storageKey, 'flow:map:creator-draft:middle-school-math-1');
  assert.equal(publishPackage.creator.draft.publishedVersion, publishPackage.map.version);
  assert.deepEqual(publishPackage.creator.draft.editableFields, [
    'step_title',
    'step_destination',
    'source_url',
    'item_fallback',
    'creator_note',
  ]);
  assert.ok(publishPackage.creator.sourceRows.every((row) => row.reviewStatus === 'ready'));
  assert.ok(publishPackage.creator.sourceRows.every((row) => row.reviewLabel === '준비됨'));
  assert.equal(publishPackage.creator.sourceRows[0].sourceRowTitle, publishPackage.creator.sourceRows[0].stepTitle);
  assert.equal(publishPackage.creator.sourceRows[0].generatedStepTitle, publishPackage.creator.sourceRows[0].stepTitle);
  assert.equal(
    publishPackage.creator.sourceRows[0].itemFallbackText,
    publishPackage.creator.sourceRows[0].detailItems.join('\n'),
  );
  assert.equal(publishPackage.creator.sourceRows[0].scheduleSummary, 'no date');
  assert.match(publishPackage.creator.sourceRows[0].detailItems.join('\n'), /거듭제곱/);
  assert.match(publishPackage.creator.sourceRows[0].detailItems.join('\n'), /최대공약수/);
  assert.equal(publishPackage.creator.sourceRows[0].sourceType, 'reference');
  assert.ok(publishPackage.creator.publishBlockers.length === 0);
  assert.ok(publishPackage.public.childFlows.every((flow) => flow.steps.length > 0));
  assert.ok(publishPackage.public.childFlows.every((flow) => flow.steps.every((step) => step.detailItems.length === step.detailItemCount)));
  assert.match(publishPackage.public.childFlows[0].steps[0].detailItems.join('\n'), /거듭제곱/);
  assert.doesNotMatch(
    [
      publishPackage.public.title,
      publishPackage.public.summary,
      publishPackage.public.primaryCta.label,
      ...publishPackage.public.artifacts,
    ].join(' '),
    /source fit|PoC|개발자|평가 점수/i,
  );

  assert.deepEqual(
    listSourceBackedFlowMapPublishPackages().map((item) => item.map.id),
    [
      'moving-d30',
      'middle-school-math-1',
      'baby-health-schedule',
      ...addedMapIds,
      ...curatedMapIds,
      ...curatedSourceAppSeedBundleIds,
    ],
  );
});

test('source-backed expansion maps remain direct-route experiments pending representative review', () => {
  const packages = listSourceBackedFlowMapPublishPackages();
  const packageIds = packages.map((item) => item.map.id);

  for (const mapId of addedMapIds) {
    assert.ok(packageIds.includes(mapId), mapId);
    const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
    assert.ok(publishPackage, mapId);
    assert.equal(publishPackage.public.childFlows.length, 1);
    assert.ok(publishPackage.public.sourceUrl.startsWith('https://'));
    assert.ok(publishPackage.creator.sourceRows.length >= 1);
    assert.doesNotMatch(
      [
        publishPackage.public.title,
        publishPackage.public.summary,
        publishPackage.public.primaryCta.label,
        ...publishPackage.public.artifacts,
      ].join(' '),
      /source fit|PoC|개발자|평가 점수/i,
    );
  }
});

test('source-backed expansion direct-route experiments preserve technical destination and input shape', () => {
  const expectations = [
    ['postal-address-transfer', 'source-backed-postal-address-transfer', '전입신고일', 'hybrid', 3],
    ['smishing-response', 'source-backed-smishing-response', undefined, 'internal_check', 3],
    ['year-end-tax-submit', 'source-backed-year-end-tax-submit', '회사 제출 마감일', 'hybrid', 3],
    ['aircon-filter-cleaning', 'source-backed-aircon-filter-cleaning', '다음 청소일', 'calendar', 1],
    ['picnic-food-safety', 'source-backed-picnic-food-safety', '나들이일', 'hybrid', 3],
  ] as const;

  for (const [mapId, slug, inputLabel, destination, stepCount] of expectations) {
    const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
    const bundle = bundleBySlug(slug);
    const rows = buildSourceBackedMyFlowRows(bundle);

    assert.ok(publishPackage, mapId);
    assert.equal(publishPackage.public.setupInput?.label, inputLabel);
    assert.equal(bundle.flow.primary_destination, destination);
    assert.equal(rows.length, stepCount);
    assert.equal(rows.length, publishPackage.creator.sourceRows.length);
    assert.ok(rows.every((row) => row.sourceUrl?.startsWith('https://')));
  }

  const aircon = bundleBySlug('source-backed-aircon-filter-cleaning');
  const [airconRow] = buildSourceBackedMyFlowRows(aircon);
  assert.equal(airconRow.calendar.mode, 'routine');
  assert.equal(airconRow.calendar.repeatRule, 'FREQ=WEEKLY;INTERVAL=2');

  const smishing = bundleBySlug('source-backed-smishing-response');
  assert.ok(buildSourceBackedMyFlowRows(smishing).every((row) => row.calendar.mode === 'none'));
});

test('curated source expansion maps produce app-ready direct-route packages without homepage promotion', () => {
  const packages = listSourceBackedFlowMapPublishPackages();
  const packageIds = packages.map((item) => item.map.id);

  for (const mapId of curatedMapIds) {
    const decision = getSourceBackedFlowMapQualityDecision(mapId);
    const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);

    assert.ok(packageIds.includes(mapId), mapId);
    assert.ok(publishPackage, mapId);
    assert.equal(decision.homepageEligible, false, mapId);
    assert.equal(decision.directRouteEnabled, true, mapId);
    assert.equal(publishPackage.creator.publishBlockers.length, 0, mapId);
    assert.ok(publishPackage.creator.sourceRows.length >= 1, mapId);
    assert.ok(publishPackage.public.sourceUrl.startsWith('https://'), mapId);
    assert.doesNotMatch(
      [
        publishPackage.public.title,
        publishPackage.public.summary,
        publishPackage.public.primaryCta.label,
        ...publishPackage.public.artifacts,
      ].join(' '),
      /source fit|PoC|개발자|평가 점수/i,
      mapId,
    );
  }

  for (const slug of curatedFlowSlugs) {
    const rows = buildSourceBackedMyFlowRows(bundleBySlug(slug));
    assert.ok(rows.length >= 1, slug);
    assert.ok(rows.every((row) => row.sourceUrl?.startsWith('https://')), slug);
  }
});

test('curated source app seed exposes nine source-backed maps without homepage promotion', () => {
  assert.equal(curatedSourceAppSeed.contentBundles.length, 9);
  assert.deepEqual(curatedSourceAppSeed.totals, {
    bundles: 9,
    flows: 19,
    steps: 91,
    items: 96,
  });

  const maps = sourceBackedMyFlowMaps.filter((map) => curatedSourceAppSeedBundleIds.includes(map.id));
  assert.deepEqual(maps.map((map) => map.id), curatedSourceAppSeedBundleIds);

  for (const seedBundle of curatedSourceAppSeed.contentBundles) {
    const decision = getSourceBackedFlowMapQualityDecision(seedBundle.bundleId);
    const publishPackage = buildSourceBackedFlowMapPublishPackage(seedBundle.bundleId);

    assert.equal(decision.homepageEligible, false, seedBundle.bundleId);
    assert.equal(decision.directRouteEnabled, true, seedBundle.bundleId);
    assert.ok(publishPackage, seedBundle.bundleId);
    assert.equal(publishPackage.public.categoryLabel, seedBundle.categoryLabel);
    assert.equal(publishPackage.public.userFacingStatus, seedBundle.userFacingStatus);
    assert.equal(publishPackage.public.recommendedFlowSlug, seedBundle.recommendedFlowId);
    assert.deepEqual(publishPackage.public.counts, seedBundle.counts);
    assert.equal(publishPackage.public.childFlows.length, seedBundle.flows.length, seedBundle.bundleId);
    assert.ok(publishPackage.public.childFlows.some((flow) => flow.slug === seedBundle.recommendedFlowId));
    assert.ok(publishPackage.public.sourceUrl.startsWith('https://'), seedBundle.bundleId);
    assert.doesNotMatch(
      [
        publishPackage.public.title,
        publishPackage.public.summary,
        publishPackage.public.primaryCta.label,
        publishPackage.public.categoryLabel,
        publishPackage.public.userFacingStatus,
        ...publishPackage.public.artifacts,
      ].join(' '),
      /source_import_required|partial_draft|ready_draft|review|audit|기획|검수/i,
      seedBundle.bundleId,
    );
  }
});

test('curated source app seed converts each recommended Flow into executable source-backed rows', () => {
  for (const seedBundle of curatedSourceAppSeed.contentBundles) {
    const seedFlow = seedBundle.flows.find((flow) => flow.flowId === seedBundle.recommendedFlowId);
    assert.ok(seedFlow, seedBundle.bundleId);

    const bundle = bundleBySlug(seedBundle.recommendedFlowId);
    const rows = buildSourceBackedMyFlowRows(bundle);

    assert.equal(bundle.flow.tags?.includes('curated-source-app-seed'), true, seedBundle.bundleId);
    assert.ok(bundle.flow.tags?.includes(`flow-map:${seedBundle.bundleId}`), seedBundle.bundleId);
    assert.equal(bundle.items.length, seedFlow.steps.length, seedBundle.bundleId);
    assert.equal(rows.length, seedFlow.steps.length, seedBundle.bundleId);
    assert.ok(rows.every((row) => row.sourceUrl?.startsWith('https://')), seedBundle.bundleId);
    assert.ok(rows.every((row) => row.textFallback.items && row.textFallback.items.length >= 1), seedBundle.bundleId);
    assert.ok(rows.every((row) => row.textFallback.memoHint === undefined), seedBundle.bundleId);
  }
});

test('curated source app seed preserves Step memo, detail, sourceUrl, and sourceTrace in exports', () => {
  const moving = bundleBySlug('moving-dday');
  const rows = buildSourceBackedMyFlowRows(moving);

  assert.equal(moving.flow.anchor_type, 'end_date');
  assert.equal(moving.flow.primary_destination, 'hybrid');
  assert.equal(rows.length, 5);

  const first = rows[0];
  assert.equal(first.mapId, 'moving-map');
  assert.equal(first.title, '이사/청소와 위탁 예약하기');
  assert.equal(first.calendar.mode, 'anchor_offset');
  assert.equal(first.calendar.anchorType, 'end_date');
  assert.equal(first.calendar.dayOffset, -30);
  assert.deepEqual(first.textFallback.items, ['이사/청소와 위탁 예약하기', '집 점검과 정리 시작하기']);
  assert.match(first.textFallback.description, /포장이사\/반포장이사/);
  assert.match(first.textFallback.description, /AJD D-30 table rows/);
  assert.ok(first.textFallback.url?.startsWith('https://'));

  const ics = buildIcsCalendar(moving, {}, '2026-07-22');
  const unfoldedIcs = ics.replace(/\r\n /g, '');
  assert.match(unfoldedIcs, /SUMMARY:이사 D-day 준비 - 이사\/청소와 위탁 예약하기/);
  assert.match(unfoldedIcs, /DTSTART;VALUE=DATE:20260622/);
  assert.match(unfoldedIcs, /AJD D-30 table rows/);

  const sheets = buildWorkbookSheets(moving, {}, '2026-07-22');
  const detail = sheets.find((sheet) => sheet.name === '상세');
  assert.ok(detail);
  assert.ok(
    detail.rows.some((row) => row.map(String).join('\n').includes('AJD D-30 table rows')),
    'sourceTrace should be present in workbook detail rows',
  );
});

test('curated source expansion preserves source-specific row counts and sensitive boundaries', () => {
  const expectations = [
    ['curated-funmom-learning-park', 'curated-funmom-weekly-print-picker', 6],
    ['curated-opic-mock-course', 'curated-opic-single-mock-review', 14],
    ['curated-opic-mock-course', 'curated-opic-course-row-import', 5],
    ['curated-baby-food-meal-log', 'curated-baby-food-daily-meal-row', 1],
    ['curated-baby-food-meal-log', 'curated-baby-food-cube-stock', 1],
    ['curated-reading-routine-log', 'curated-reading-monthly-log', 8],
    ['curated-new-car-purchase-guide', 'curated-new-car-basic', 7],
    ['curated-child-vaccination-schedule', 'curated-child-vaccination-first-year', 6],
    ['curated-child-vaccination-schedule', 'curated-child-vaccination-booster-school-age', 4],
    ['curated-ajd-moving-d30', 'curated-ajd-moving-d30', 5],
    ['curated-wedding-checklist-family', 'curated-wedding-naver-timeline', 6],
    ['curated-wedding-checklist-family', 'curated-wedding-gongysd-atoz', 4],
    ['curated-allblanc-workout-park', 'curated-allblanc-morning-workout', 1],
    ['curated-allblanc-workout-park', 'curated-allblanc-no-jump-cardio', 1],
    ['curated-allblanc-workout-park', 'curated-allblanc-lower-body', 1],
  ] as const;

  for (const [mapId, slug, rowCount] of expectations) {
    const bundle = bundleBySlug(slug);
    const rows = buildSourceBackedMyFlowRows(bundle);

    assert.equal(rows.length, rowCount, `${mapId}/${slug}`);
    assert.ok(rows.every((row) => row.mapId === mapId), `${mapId}/${slug}`);
  }

  const newCarRows = buildSourceBackedMyFlowRows(bundleBySlug('curated-new-car-basic'));
  assert.equal(newCarRows.length, 7);
  assert.ok(newCarRows.every((row) => row.riskLevel === 'financial_sensitive'));
  assert.match(newCarRows.map((row) => row.title).join('\n'), /보험 가입 확인/);

  const vaccinationRows = [
    ...buildSourceBackedMyFlowRows(bundleBySlug('curated-child-vaccination-first-year')),
    ...buildSourceBackedMyFlowRows(bundleBySlug('curated-child-vaccination-booster-school-age')),
  ];
  assert.ok(vaccinationRows.every((row) => row.riskLevel === 'medical_sensitive'));
  assert.ok(vaccinationRows.every((row) => row.calendar.anchorType === 'baby_birth_date'));
  assert.match(vaccinationRows.map((row) => row.textFallback.items?.join(' ') ?? '').join('\n'), /B형간염/);
  assert.match(vaccinationRows.map((row) => row.textFallback.items?.join(' ') ?? '').join('\n'), /Tdap/);

  const workoutRows = [
    ...buildSourceBackedMyFlowRows(bundleBySlug('curated-allblanc-morning-workout')),
    ...buildSourceBackedMyFlowRows(bundleBySlug('curated-allblanc-no-jump-cardio')),
    ...buildSourceBackedMyFlowRows(bundleBySlug('curated-allblanc-lower-body')),
  ];
  assert.equal(workoutRows.length, 3);
  assert.ok(workoutRows.every((row) => row.sourceUrl?.includes('youtube.com/watch')));
  assert.ok(workoutRows.every((row) => row.calendar.mode === 'routine'));
  assert.ok(workoutRows.every((row) => row.textFallback.items?.length === 3));
  assert.ok(workoutRows.every((row) => row.textFallback.items?.some((item) => item.startsWith('영상: '))));
  assert.ok(workoutRows.every((row) => row.textFallback.items?.some((item) => item.startsWith('URL: https://www.youtube.com/watch'))));
  assert.ok(workoutRows.every((row) => row.textFallback.items?.some((item) => item.startsWith('요약: '))));
  assert.doesNotMatch(workoutRows.map((row) => row.textFallback.items?.join('\n') ?? '').join('\n'), /칼로리|감량|효과 보장/);
});

test('source-backed moving map saves one dated timeline flow from a move date', () => {
  const publishPackage = buildSourceBackedFlowMapPublishPackage('moving-d30');

  assert.ok(publishPackage);
  assert.equal(publishPackage.map.id, 'moving-d30');
  assert.deepEqual(publishPackage.myFlow.savedSlugs, ['source-backed-moving-d30']);
  assert.deepEqual(publishPackage.public.setupInputs, ['이사일']);
  assert.equal(publishPackage.public.setupInput?.label, '이사일');
  assert.equal(publishPackage.public.childFlows.length, 1);
  assert.equal(publishPackage.public.childFlows[0].steps.length, 5);
  assert.equal(publishPackage.public.childFlows[0].destination, 'hybrid');
  assert.equal(publishPackage.creator.publishBlockers.length, 0);
  assert.equal(publishPackage.creator.sourceRows.length, 5);
  assert.equal(publishPackage.creator.sourceRows[0].scheduleSummary, 'D-30');

  const snapshot = buildSourceBackedFlowMapSavedSnapshot('moving-d30', {
    anchor: '2026-07-22',
    savedAt: '2026-06-24T09:00:00.000Z',
  });

  assert.ok(snapshot);
  assert.equal(snapshot.version, '2026-06-24.1');
  assert.equal(snapshot.anchor, '2026-07-22');
  assert.deepEqual(snapshot.flowSlugs, ['source-backed-moving-d30']);
  assert.deepEqual(snapshot.stepCountsByFlow, {
    'source-backed-moving-d30': 5,
  });
});

test('source-backed baby health publish package separates input-bearing public save from creator review', () => {
  const publishPackage = buildSourceBackedFlowMapPublishPackage('baby-health-schedule');

  assert.ok(publishPackage);
  assert.equal(publishPackage.map.id, 'baby-health-schedule');
  assert.deepEqual(publishPackage.myFlow.savedSlugs, [
    'source-backed-baby-health-checkups',
    'source-backed-baby-vaccination-schedule',
  ]);
  assert.deepEqual(publishPackage.public.setupInputs, ['아이 생년월일']);
  assert.equal(publishPackage.public.setupInput?.label, '아이 생년월일');
  assert.equal(publishPackage.public.childFlows.length, 2);
  assert.equal(publishPackage.creator.publishBlockers.length, 0);
  assert.ok(publishPackage.creator.sourceRows.length >= 18);
  assert.ok(publishPackage.public.childFlows.every((flow) => flow.destination === 'hybrid'));
  assert.doesNotMatch(publishPackage.public.summary, /진단|판단|처방/);
});

test('source-backed Flow Map saved snapshot records package version and saved child rows', () => {
  const snapshot = buildSourceBackedFlowMapSavedSnapshot('baby-health-schedule', {
    anchor: '2026-01-15',
    savedAt: '2026-06-23T09:00:00.000Z',
  });

  assert.ok(snapshot);
  assert.equal(snapshot.mapId, 'baby-health-schedule');
  assert.equal(snapshot.version, '2026-06-23.1');
  assert.equal(snapshot.anchor, '2026-01-15');
  assert.deepEqual(snapshot.flowSlugs, [
    'source-backed-baby-health-checkups',
    'source-backed-baby-vaccination-schedule',
  ]);
  assert.deepEqual(snapshot.stepCountsByFlow, {
    'source-backed-baby-health-checkups': 12,
    'source-backed-baby-vaccination-schedule': 6,
  });
});

test('source-backed Flow Map persistence record separates bridge snapshot from product-ready child bindings', () => {
  const record = buildSourceBackedFlowMapPersistenceRecord('moving-d30', {
    anchor: '2026-07-22',
    savedAt: '2026-06-24T11:00:00.000Z',
  });

  assert.ok(record);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.recordType, 'saved_source_backed_flow_map');
  assert.equal(record.bridgeStorageKey, getSourceBackedFlowMapSnapshotStorageKey('moving-d30'));
  assert.equal(getSourceBackedFlowMapPersistenceStorageKey('moving-d30'), 'flow:map:persistence:moving-d30');
  assert.equal(record.map.id, 'moving-d30');
  assert.equal(record.map.version, '2026-06-24.1');
  assert.equal(record.saved.anchor, '2026-07-22');
  assert.equal(record.saved.sourceSurface, 'public_save');
  assert.equal(record.readiness.content, 'ready_for_my_flow');
  assert.equal(record.readiness.update, 'up_to_date');
  assert.equal(record.childFlows.length, 1);
  const { steps, ...movingChildMeta } = record.childFlows[0];
  assert.deepEqual(movingChildMeta, {
    slug: 'source-backed-moving-d30',
    flowId: 'flow-source-backed-moving-d30',
    title: '원룸 이사 D-30 준비',
    category: '이사',
    structureType: 'timeline',
    anchorType: 'end_date',
    primaryDestination: 'hybrid',
    riskLevel: 'low',
    sourceTitle: 'AJD 이사 준비 체크리스트',
    sourceUrl:
      'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363',
    sourceCheckedAt: '2026-06-23',
    stepCount: 5,
    itemFallbackCount: 15,
    stepIds: [
      'moving-method-quotes',
      'moving-cleaning-waste',
      'moving-address-admin',
      'moving-meter-photos',
      'moving-move-day-admin',
    ],
  });
  assert.equal(steps.length, 5);
  assert.deepEqual(
    steps.map((step) => step.stepId),
    [
      'moving-method-quotes',
      'moving-cleaning-waste',
      'moving-address-admin',
      'moving-meter-photos',
      'moving-move-day-admin',
    ],
  );
  assert.equal(steps[0].destination, 'calendar');
  assert.equal(steps[0].calendar.mode, 'anchor_offset');
  assert.equal(steps[0].calendar.anchorType, 'end_date');
  assert.equal(steps[0].calendar.dayOffset, -30);
  assert.match(steps[0].textFallback.title, /이사 방식/);
  assert.match(steps[0].textFallback.items?.join('\n') ?? '', /견적 후보/);
  assert.match(steps[0].textFallback.doneWhen ?? '', /후보/);
  assert.equal(steps[0].sourceUrl, record.childFlows[0].sourceUrl);
});

test('source-backed official schedule persistence record keeps review-before-apply policy separate from current readiness', () => {
  const record = buildSourceBackedFlowMapPersistenceRecord('baby-health-schedule', {
    anchor: '2026-01-15',
    savedAt: '2026-06-24T11:00:00.000Z',
  });

  assert.ok(record);
  assert.equal(record.map.updatePolicy, 'review_before_apply');
  assert.equal(record.readiness.content, 'ready_for_my_flow');
  assert.equal(record.readiness.update, 'up_to_date');
  assert.equal(record.updateAssessment.canApplyAutomatically, false);
  assert.deepEqual(
    record.childFlows.map((flow) => [flow.slug, flow.stepCount, flow.riskLevel]),
    [
      ['source-backed-baby-health-checkups', 12, 'medical_sensitive'],
      ['source-backed-baby-vaccination-schedule', 6, 'medical_sensitive'],
    ],
  );
  assert.ok(record.childFlows.every((flow) => flow.anchorType === 'baby_birth_date'));
  assert.ok(record.childFlows.every((flow) => flow.sourceUrl?.startsWith('https://')));
  assert.ok(record.childFlows.every((flow) => flow.steps.length === flow.stepCount));
  assert.ok(record.childFlows.every((flow) => flow.steps.every((step) => step.calendar.anchorType === 'baby_birth_date')));
  assert.ok(record.childFlows.every((flow) => flow.steps.every((step) => step.sourceUrl?.startsWith('https://'))));
  assert.match(record.childFlows[0].steps[0].textFallback.items?.join('\n') ?? '', /문진표/);
});

test('source-backed Flow Map update assessment keeps same version quiet', () => {
  const snapshot = buildSourceBackedFlowMapSavedSnapshot('middle-school-math-1', {
    savedAt: '2026-06-23T09:00:00.000Z',
  });

  assert.ok(snapshot);
  const assessment = assessSourceBackedFlowMapUpdate(snapshot);

  assert.equal(assessment.status, 'up_to_date');
  assert.equal(assessment.userAction, 'none');
  assert.equal(assessment.canApplyAutomatically, false);
  assert.deepEqual(assessment.reasons, []);
});

test('source-backed Flow Map update assessment requires review for official sensitive map changes', () => {
  const snapshot = buildSourceBackedFlowMapSavedSnapshot('baby-health-schedule', {
    anchor: '2026-01-15',
    savedAt: '2026-06-23T09:00:00.000Z',
  });

  assert.ok(snapshot);
  const assessment = assessSourceBackedFlowMapUpdate({
    ...snapshot,
    version: '2026-06-01.1',
    stepCountsByFlow: {
      ...snapshot.stepCountsByFlow,
      'source-backed-baby-health-checkups': 11,
    },
  });

  assert.equal(assessment.status, 'review_before_apply');
  assert.equal(assessment.userAction, 'review_changes');
  assert.equal(assessment.canApplyAutomatically, false);
  assert.ok(assessment.reasons.some((reason) => reason.includes('공식/민감')));
  assert.ok(assessment.reasons.some((reason) => reason.includes('Step 수')));
});
