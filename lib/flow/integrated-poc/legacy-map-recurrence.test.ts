import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles, getSourceBackedFlowMapQualityDecision } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { generatePersonalStructuralOccurrences } from '../personal-structural-occurrence';
import { resolveSavedRoutineRecurrence } from '../saved-routine-occurrence';
import { readProgramLegacyCurrentMapSource } from './legacy-map-source';
import { sourceCanonical, programLegacySourceChanges, type ProgramLegacySourceOwner } from './legacy-source-lifecycle-contract';
import { transitionProgramLegacySourcePayload, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import type { ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { inspectProgramMapRrule, readProgramMapRevisionRecurrences, readProgramSelectedMapRecurrences, projectProgramSelectedMapRecurrences } from './legacy-map-recurrence';

const NOW = '2026-09-13T00:00:00.000Z', START = '2026-09-30', RANGE = { start: START, end: '2026-10-27' };
function fixture(mapId: string, flowIndex = 0) {
  const saved = buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: NOW, anchor: START })!;
  const persistence = buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: NOW, anchor: START })!;
  const entries: Record<string, string> = { [`flow:map:saved:${mapId}`]: JSON.stringify(saved), [`flow:map:persistence:${mapId}`]: JSON.stringify(persistence) };
  const read = buildPersonalWorkspacePocReadModel({ length: 2, key: index => Object.keys(entries)[index] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles);
  assert(read.ok);
  // The read model sorts children for presentation; array position is not source identity.
  const wanted = mapId === 'curated-allblanc-workout-park'
    ? flowIndex === 0 ? 'flow-curated-allblanc-morning-workout' : 'flow-curated-allblanc-no-jump-cardio' : null;
  const original = wanted ? read.model.flows.find(flow => flow.flowId === wanted)! : read.model.flows[0];
  assert(original);
  let payload: ProgramLegacySnapshotPayload = { model: read.model, state: createPersonalWorkspacePocState(NOW) };
  const inputBytes = JSON.stringify({ entries, payload });
  const step = (action: ProgramLegacySourceAction) => {
    const next = transitionProgramLegacySourcePayload(payload, action); assert(next.ok, JSON.stringify(next)); payload = next.payload;
  };
  step({ type: 'connect-map', flowRef: original.ref, requestId: `connect-${flowIndex}`, expectedSourceToken: sourceCanonical(original), now: NOW });
  const connected = structuredClone(payload.sourceLifecycle!.owners[original.ref]);
  step({ type: 'stage-map', flowRef: original.ref, requestId: `compare-${flowIndex}`, now: NOW });
  const pending = structuredClone(payload.sourceLifecycle!.owners[original.ref]), review = pending.reviews.at(-1)!;
  for (const change of programLegacySourceChanges(pending, review.incomingRevisionId)) step({ type: 'choice', flowRef: original.ref, reviewId: review.id, changeId: change.id, choice: 'incoming', now: NOW });
  step({ type: 'apply', flowRef: original.ref, reviewId: review.id, now: NOW });
  return { original, owner: payload.sourceLifecycle!.owners[original.ref], connected, pending, payload, entries, inputBytes };
}

test('MR01 all three real recurring Map items keep genuine tuples and no fabricated authoring lineage', () => {
  for (const [mapId, index, expected] of [['aircon-filter-cleaning', 0, 'FREQ=WEEKLY;INTERVAL=2'], ['curated-allblanc-workout-park', 0, 'FREQ=WEEKLY;BYDAY=MO,WE,FR'], ['curated-allblanc-workout-park', 1, 'FREQ=WEEKLY;BYDAY=TU,TH']] as const) {
    const f = fixture(mapId, index), before = JSON.stringify(f.owner), read = readProgramSelectedMapRecurrences(f.owner, f.original);
    assert(read.ok); assert.equal(read.contexts.size, 1);
    const context = [...read.contexts.values()][0];
    assert.equal(context.sourceRepeatRule, expected); assert.equal(context.sourceCalendar.repeatRule, expected);
    assert.equal(context.flowId, f.original.flowId); assert.equal(context.savedCopyId, f.original.savedCopyId);
    assert.equal(context.itemRef, f.original.items[0].ref); assert.equal(context.startDate, START);
    assert.equal(context.revisionId, f.owner.effective.itemRevisions[context.itemRef]);
    assert.equal('sourceLine' in context, false); assert.equal('authoring' in context, false); assert.equal('rawText' in context, false);
    assert.equal(JSON.stringify(f.owner), before);
  }
});

test('MR02 ALLBLANC weekday is a saved calendar choice, with source caution and conversion note preserved', () => {
  const f = fixture('curated-allblanc-workout-park', 1), read = readProgramSelectedMapRecurrences(f.owner, f.original); assert(read.ok);
  const context = [...read.contexts.values()][0];
  assert.equal(context.ruleBasis, 'saved-calendar-setting'); assert.match(context.warning!, /낮은 강도/);
  assert.match(context.conversionNote!, /반복 처방은 가져오지 않았습니다/);
  assert.equal(context.sourceUrl, 'https://www.youtube.com/watch?v=2dail5Imi04');
  assert.equal(context.dateBasis, 'saved-flow-anchor');
});

test('MR03 actual Tue/Thu rule does not invent a Wednesday first occurrence; exact D1 dates are reused', () => {
  const f = fixture('curated-allblanc-workout-park', 1), projected = projectProgramSelectedMapRecurrences(f.owner, f.original, RANGE); assert(projected.ok);
  const { context, projection } = projected.projections[0];
  const dates = projection.projectedOccurrences.map(row => row.originalDate);
  assert.deepEqual(dates, ['2026-10-01', '2026-10-06', '2026-10-08', '2026-10-13', '2026-10-15', '2026-10-20', '2026-10-22', '2026-10-27']);
  const originalSeries = resolveSavedRoutineRecurrence({ itemId: context.itemId, startDate: START, sourceRepeatRule: context.sourceRepeatRule }, 'd1-parity').series!;
  const original = generatePersonalStructuralOccurrences({ identityNamespace: 'd1-parity', itemId: context.itemId, schedule: { mode: 'fixed_date', date: START, repeat: originalSeries }, range: RANGE, fallbackTimestamp: originalSeries.updatedAt });
  assert.deepEqual(dates, original.projectedOccurrences.map(row => row.originalDate));
});

test('MR04 genuine two-week cadence and Mon/Wed/Fri cadence remain different', () => {
  const aircon = fixture('aircon-filter-cleaning'), allblanc = fixture('curated-allblanc-workout-park');
  const a = projectProgramSelectedMapRecurrences(aircon.owner, aircon.original, RANGE), b = projectProgramSelectedMapRecurrences(allblanc.owner, allblanc.original, RANGE);
  assert(a.ok && b.ok);
  assert.deepEqual(a.projections[0].projection.projectedOccurrences.map(row => row.originalDate), [START, '2026-10-14']);
  assert.deepEqual(b.projections[0].projection.projectedOccurrences.slice(0, 4).map(row => row.originalDate), [START, '2026-10-02', '2026-10-05', '2026-10-07']);
});

test('MR05 connecting and staging are not source acceptance or automatic recurrence activation', () => {
  const f = fixture('aircon-filter-cleaning');
  for (const owner of [f.connected, f.pending]) {
    const read = readProgramSelectedMapRecurrences(owner, f.original); assert(read.ok); assert.equal(read.contexts.size, 0);
  }
  const undone = transitionProgramLegacySourcePayload(f.payload, { type: 'undo', flowRef: f.original.ref, now: NOW }); assert(undone.ok);
  const read = readProgramSelectedMapRecurrences(undone.payload.sourceLifecycle!.owners[f.original.ref], f.original); assert(read.ok); assert.equal(read.contexts.size, 0);
});

test('MR06 projections are stable across overlapping windows, reload and separately selected child owners', () => {
  const a = fixture('curated-allblanc-workout-park'), b = fixture('curated-allblanc-workout-park', 1);
  const full = projectProgramSelectedMapRecurrences(a.owner, a.original, RANGE);
  const part = projectProgramSelectedMapRecurrences(JSON.parse(JSON.stringify(a.owner)), a.original, { start: '2026-10-07', end: '2026-10-14' });
  const sibling = projectProgramSelectedMapRecurrences(b.owner, b.original, RANGE); assert(full.ok && part.ok && sibling.ok);
  assert.deepEqual(part.projections[0].projection.projectedOccurrences, full.projections[0].projection.projectedOccurrences.filter(row => row.originalDate >= '2026-10-07' && row.originalDate <= '2026-10-14'));
  const ids = new Set(full.projections[0].projection.projectedOccurrences.map(row => row.occurrenceId));
  assert(sibling.projections[0].projection.projectedOccurrences.every(row => !ids.has(row.occurrenceId)));
  assert.notEqual(full.projections[0].context.series.seriesId, sibling.projections[0].context.series.seriesId);
});

test('MR07 raw RRULE support is strict; tolerant resolver defaults never cross the Program boundary', () => {
  for (const rule of ['FREQ=DAILY', 'FREQ=WEEKLY;INTERVAL=2', 'FREQ=WEEKLY;BYDAY=TU,TH', 'FREQ=MONTHLY;BYMONTHDAY=31;COUNT=12', 'RRULE:FREQ=DAILY;UNTIL=20261231']) assert(inspectProgramMapRrule(rule).ok, rule);
  for (const rule of ['', '매주 화 목', 'freq=weekly', 'FREQ=WEEKLY;', 'FREQ=WEEKLY;FREQ=DAILY', 'FREQ=WEEKLY;INTERVAL=0', 'FREQ=WEEKLY;INTERVAL=366', 'FREQ=WEEKLY;BYDAY=TU,TU', 'FREQ=WEEKLY;BYDAY=TU,XY', 'FREQ=WEEKLY;BYDAY=1MO', 'FREQ=WEEKLY;WKST=SU', 'FREQ=DAILY;BYDAY=MO', 'FREQ=MONTHLY;BYMONTHDAY=0', 'FREQ=MONTHLY;BYMONTHDAY=32', 'FREQ=YEARLY', 'FREQ=WEEKLY;COUNT=10001', 'FREQ=WEEKLY;UNTIL=20260230', 'FREQ=WEEKLY;UNTIL=20261001T000000Z', 'FREQ=WEEKLY;COUNT=2;UNTIL=20261231', 'FREQ=DAILY;BYHOUR=9', 'FREQ=DAILY;INTERVAL= 2', null, 4]) assert.equal(inspectProgramMapRrule(rule).ok, false, String(rule));
});

test('MR08 foreign, corrupt, and mixed authoring evidence fail closed without mutating the owner', () => {
  const f = fixture('aircon-filter-cleaning'), revision = readProgramLegacyCurrentMapSource(f.original, NOW)!;
  for (const patch of [
    (r: typeof revision) => { r.persistence.childFlows[0].steps[0].stepId = 'foreign'; },
    (r: typeof revision) => { r.bundles[0].items[0].repeat_rule = 'FREQ=DAILY'; },
    (r: typeof revision) => { r.flow = { ...r.flow, flowId: 'foreign' }; },
    (r: typeof revision) => { r.flow = { ...r.flow, authoring: { rawText: '# fake' } } as never; },
  ]) { const bad = structuredClone(revision); patch(bad); const bytes = JSON.stringify(bad); assert.equal(readProgramMapRevisionRecurrences(bad, f.original).ok, false); assert.equal(JSON.stringify(bad), bytes); }
  const corrupt = structuredClone(f.owner); corrupt.effective.itemRevisions[f.original.items[0].ref] = 'missing';
  assert.equal(readProgramSelectedMapRecurrences(corrupt, f.original).ok, false);
});

test('MR09 exact per-item retention is not silently reactivated by a recurring source', () => {
  const f = fixture('aircon-filter-cleaning'), retained: ProgramLegacySourceOwner = structuredClone(f.owner);
  retained.effective.retainedItemRefs = [f.original.items[0].ref];
  const read = readProgramSelectedMapRecurrences(retained, f.original); assert(read.ok); assert.equal(read.contexts.size, 0);
});

test('MR10 view range is bounded and never becomes a source recurrence end', () => {
  const f = fixture('aircon-filter-cleaning'), before = JSON.stringify(f.owner);
  for (const range of [{ start: 'bad', end: START }, { start: START, end: '2026-09-29' }, { start: START, end: '2027-10-01' }, { start: START, end: '2026-11-31' }]) assert.equal(projectProgramSelectedMapRecurrences(f.owner, f.original, range).ok, false);
  const read = projectProgramSelectedMapRecurrences(f.owner, f.original, RANGE); assert(read.ok);
  assert.equal(read.projections[0].context.endDate, null); assert.equal(read.projections[0].context.series.revisions[0].rule.end, undefined);
  assert.equal(read.writes, 0); assert.equal(JSON.stringify(f.owner), before);
});

test('MR11 existing factory quality decisions and all input storage bytes stay identical', () => {
  for (const id of ['aircon-filter-cleaning', 'curated-allblanc-workout-park', 'curated-child-vaccination-schedule']) {
    const f = fixture(id), quality = JSON.stringify(getSourceBackedFlowMapQualityDecision(id));
    const before = JSON.stringify({ payload: f.payload, entries: f.entries });
    const read = projectProgramSelectedMapRecurrences(f.owner, f.original, RANGE); assert(read.ok);
    assert.equal(JSON.stringify({ payload: f.payload, entries: f.entries }), before);
    assert.equal(JSON.stringify(getSourceBackedFlowMapQualityDecision(id)), quality);
    if (id === 'curated-child-vaccination-schedule') assert.equal(read.projections.length, 0);
  }
});

/** Explicit test-only future evidence variants, not additional real factories
 * or claimed user data. Rebuild the actual reader after changing its inputs. */
function ruleVariant(raw: string, duration?: number) {
  const f = fixture('aircon-filter-cleaning'), revision = readProgramLegacyCurrentMapSource(f.original, NOW)!;
  revision.persistence.childFlows[0].steps[0].calendar.repeatRule = raw;
  revision.bundles[0].items[0].repeat_rule = raw;
  if (duration !== undefined) revision.bundles[0].flow.routine_duration_days = duration;
  const entries: Record<string, string> = { [`flow:map:saved:${revision.snapshot.mapId}`]: JSON.stringify(revision.snapshot), [`flow:map:persistence:${revision.snapshot.mapId}`]: JSON.stringify(revision.persistence) };
  const read = buildPersonalWorkspacePocReadModel({ length: 2, key: index => Object.keys(entries)[index] ?? null, getItem: key => entries[key] ?? null }, revision.bundles); assert(read.ok);
  revision.flow = read.model.flows.find(flow => flow.ref === f.original.ref)!;
  return { ...f, revision };
}

test('MR12 explicit finite count and source-duration bounds survive; monthly invalid dates skip', () => {
  for (const [raw, duration, expected] of [
    ['FREQ=WEEKLY;BYDAY=TU,TH;COUNT=3', undefined, ['2026-10-01', '2026-10-06', '2026-10-08']],
    ['FREQ=DAILY', 3, ['2026-09-30', '2026-10-01', '2026-10-02']],
    ['FREQ=DAILY;UNTIL=20261002', undefined, ['2026-09-30', '2026-10-01', '2026-10-02']],
    ['FREQ=MONTHLY;BYMONTHDAY=31;COUNT=2', undefined, ['2026-10-31', '2026-12-31']],
  ] as const) {
    const f = ruleVariant(raw, duration), read = readProgramMapRevisionRecurrences(f.revision, f.original); assert(read.ok, JSON.stringify(read));
    const context = [...read.contexts.values()][0];
    const projection = generatePersonalStructuralOccurrences({ identityNamespace: context.identityNamespace, itemId: context.itemId,
      schedule: { mode: 'fixed_date', date: context.startDate, repeat: context.series }, range: { start: START, end: '2027-01-31' }, fallbackTimestamp: context.series.updatedAt });
    assert.deepEqual(projection.projectedOccurrences.map(row => row.originalDate), expected); assert.deepEqual(projection.warnings, []);
    assert.equal(context.sourceRepeatRule, raw);
  }
});

test('MR13 ambiguous ends and schedules are rejected, not silently normalized or expanded', () => {
  for (const [raw, duration] of [['FREQ=DAILY;COUNT=2', 3], ['FREQ=DAILY;UNTIL=20261010', 3], ['FREQ=DAILY;UNTIL=20260929', undefined], ['FREQ=DAILY', 0], ['FREQ=DAILY', 1.5], ['FREQ=WEEKLY;BYDAY=TU,XY', undefined]] as const) {
    const f = ruleVariant(raw, duration), before = JSON.stringify(f.revision);
    assert.equal(readProgramMapRevisionRecurrences(f.revision, f.original).ok, false); assert.equal(JSON.stringify(f.revision), before);
  }
  for (const patch of [{ allDay: false }, { dayOffset: 1 }, { anchorType: 'end_date' }, { unexpectedCadence: 'later' }]) {
    const f = ruleVariant('FREQ=DAILY'); Object.assign(f.revision.persistence.childFlows[0].steps[0].calendar, patch);
    assert.equal(readProgramMapRevisionRecurrences(f.revision, f.original).ok, false);
  }
});

test('MR14 empty range result retains the source series and long bounded windows are not truncated', () => {
  const f = fixture('aircon-filter-cleaning');
  const empty = projectProgramSelectedMapRecurrences(f.owner, f.original, { start: '2026-10-01', end: '2026-10-02' }); assert(empty.ok);
  assert.equal(empty.projections.length, 1); assert.deepEqual(empty.projections[0].projection.projectedOccurrences, []);
  assert.equal(empty.projections[0].context.series.status, 'active');
  const later = projectProgramSelectedMapRecurrences(f.owner, f.original, { start: '2030-09-30', end: '2031-09-30' }); assert(later.ok);
  assert(later.projections[0].projection.projectedOccurrences.length > 20);
  assert.equal(later.projections[0].projection.generationLimitReached, false);
  assert.equal(later.projections[0].context.series.revisions[0].rule.end, undefined);
});

test('MR15 re-reading identical source schedules preserves series identity despite a different snapshot timestamp', () => {
  const f = fixture('aircon-filter-cleaning');
  const earlier = readProgramMapRevisionRecurrences(readProgramLegacyCurrentMapSource(f.original, NOW)!, f.original);
  const later = readProgramMapRevisionRecurrences(readProgramLegacyCurrentMapSource(f.original, '2026-09-13T01:00:00.000Z')!, f.original);
  assert(earlier.ok && later.ok);
  const a = [...earlier.contexts.values()][0], b = [...later.contexts.values()][0];
  assert.notEqual(a.revisionId, b.revisionId);
  assert.equal(a.series.seriesId, b.series.seriesId);
  assert.deepEqual(a.series.revisions, b.series.revisions);
});

test('MR16 different schedule semantics get different series even for the same saved-copy Flow Item', () => {
  const a = ruleVariant('FREQ=WEEKLY;INTERVAL=2'), b = ruleVariant('FREQ=WEEKLY;INTERVAL=3');
  const left = readProgramMapRevisionRecurrences(a.revision, a.original), right = readProgramMapRevisionRecurrences(b.revision, b.original); assert(left.ok && right.ok);
  const x = [...left.contexts.values()][0], y = [...right.contexts.values()][0];
  assert.equal(x.itemRef, y.itemRef); assert.notEqual(x.series.seriesId, y.series.seriesId);
});

test('MR17 equivalent RRULE field/weekday order is not a new series; raw source text remains exact', () => {
  const a = ruleVariant('FREQ=WEEKLY;BYDAY=MO,WE,FR'), b = ruleVariant('BYDAY=FR,MO,WE;FREQ=WEEKLY');
  const left = readProgramMapRevisionRecurrences(a.revision, a.original), right = readProgramMapRevisionRecurrences(b.revision, b.original); assert(left.ok && right.ok);
  const x = [...left.contexts.values()][0], y = [...right.contexts.values()][0];
  assert.equal(x.series.seriesId, y.series.seriesId); assert.notEqual(x.sourceRepeatRule, y.sourceRepeatRule);
});
