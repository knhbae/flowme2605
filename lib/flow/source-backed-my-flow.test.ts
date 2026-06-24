import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIcsCalendar, buildWorkbookSheets } from './export';
import {
  assessProgressStepNeed,
  assessSourceBackedFlowMapUpdate,
  buildSourceBackedFlowMapSavedSnapshot,
  buildSourceBackedFlowMapPublishPackage,
  buildSourceBackedMyFlowRows,
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

test('source-backed moving D-30 keeps one Step as one dated FlowItem with item text fallback', () => {
  const moving = bundleBySlug('source-backed-moving-d30');
  const rows = buildSourceBackedMyFlowRows(moving);

  assert.equal(moving.flow.structure_type, 'timeline');
  assert.equal(moving.flow.anchor_type, 'end_date');
  assert.equal(moving.flow.primary_destination, 'hybrid');
  assert.ok(moving.flow.source_url?.startsWith('https://'));
  assert.equal(rows.length, moving.items.length);

  const first = rows[0];
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
  assert.ok(rows.length >= 6);

  const first = rows[0];
  assert.equal(first.mapId, 'middle-school-math-1');
  assert.equal(first.destination, 'progress');
  assert.equal(first.calendar?.mode, 'none');
  assert.match(first.textFallback.title, /소인수분해/);
  assert.match(first.textFallback.items?.join('\n') ?? '', /원문 단원/);
  assert.match(first.textFallback.items?.join('\n') ?? '', /막힌 부분/);

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

  assert.equal(sourceBackedMyFlowMaps.length, 2);
  assert.ok(mathMap);
  assert.equal(mathMap.id, 'middle-school-math-1');
  assert.equal(mathMap.userLabel, '중1 수학 지도');
  assert.deepEqual(mathMap.flowSlugs, ['source-backed-middle-school-math-1']);
  assert.equal(getSourceBackedMyFlowMapForBundle(moving), undefined);
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
  assert.ok(publishPackage.creator.sourceRows.length >= 6);
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
    ['middle-school-math-1', 'baby-health-schedule'],
  );
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
