import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIcsCalendar, buildWorkbookSheets } from './export';
import {
  assessProgressStepNeed,
  assessSourceBackedFlowMapUpdate,
  buildSourceBackedFlowMapPersistenceRecord,
  buildSourceBackedFlowMapSavedSnapshot,
  buildSourceBackedFlowMapPublishPackage,
  buildSourceBackedMyFlowRows,
  getSourceBackedFlowMapPersistenceStorageKey,
  getSourceBackedFlowMapSnapshotStorageKey,
  getSourceBackedMyFlowMapForBundle,
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
    ],
  );
});

test('source-backed expansion adds five real Korean-source flow maps without review blockers', () => {
  const packages = listSourceBackedFlowMapPublishPackages();
  const packageIds = packages.map((item) => item.map.id);

  for (const mapId of addedMapIds) {
    assert.ok(packageIds.includes(mapId), mapId);
    const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
    assert.ok(publishPackage, mapId);
    assert.equal(publishPackage.creator.publishBlockers.length, 0);
    assert.equal(publishPackage.public.childFlows.length, 1);
    assert.ok(publishPackage.public.sourceUrl.startsWith('https://'));
    assert.ok(publishPackage.creator.sourceRows.length >= 1);
    assert.ok(publishPackage.creator.sourceRows.every((row) => row.reviewStatus === 'ready'));
    assert.ok(publishPackage.creator.sourceRows.every((row) => row.itemCount >= 3));
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

test('source-backed expansion preserves destination and input shape per source', () => {
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
    assert.ok(rows.every((row) => (row.textFallback.items?.length ?? 0) >= 3));
  }

  const aircon = bundleBySlug('source-backed-aircon-filter-cleaning');
  const [airconRow] = buildSourceBackedMyFlowRows(aircon);
  assert.equal(airconRow.calendar.mode, 'routine');
  assert.equal(airconRow.calendar.repeatRule, 'FREQ=WEEKLY;INTERVAL=2');

  const smishing = bundleBySlug('source-backed-smishing-response');
  assert.ok(buildSourceBackedMyFlowRows(smishing).every((row) => row.calendar.mode === 'none'));
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
  assert.deepEqual(record.childFlows[0], {
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
