import assert from 'node:assert/strict';
import test from 'node:test';
import { stableAuthoringJson } from './native-creator-vendor/text-authoring/identity';
import { programRecurringScheduleFromDraft, projectProgramPublicRecurrence, programPublicRecurrenceToAuthoring } from './public-recurrence-contract';
import { programPublicCopyExecutionRef, programPublicCopyItemRef, programPublicCopySeriesKey, validateProgramPublicCopyOccurrenceIdentity } from './public-copy-recurrence';
import { createProgramRecurrencePlanOwner, readProgramRecurrencePlan, resolveProgramRecurrencePlanTarget, previewProgramRecurrencePlan,
  applyProgramRecurrencePlan, undoProgramRecurrencePlan, appendProgramPersonalOccurrenceEvent, programPersonalOccurrenceIdentity,
  validateProgramRecurrencePlanOwner, sameProgramRecurrencePlanSource, programRecurrencePlanHasMore } from './program-recurrence-plan';
import { programOriginalOccurrenceIdentityAt, programRecurrencePlanSuppresses, readProgramPersonalRecurrences, prepareProgramRecurrencePlan } from './program-recurrence-plan-state';
import { readProgramOccurrencePeriod } from './recurrence-state';
import { validateProgramRecurrencePlans } from './program-recurrence-plan-state-validation';
import { createProgramData, validateProgramData, validateProgramSchedule, canPublishProgramSchedule } from './program-data';
import type { ProgramOccurrenceExecution, ProgramOccurrenceIdentity } from './recurrence-state-contract';
import type { ProgramRecurrencePlanOwner, ProgramPersonalOccurrenceExecution } from './program-recurrence-plan-contract';

const createdAt = '2026-09-14T00:00:00.000Z', later = '2026-09-14T00:01:00.000Z', after = '2026-09-14T00:02:00.000Z';
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
/** Explicit model fixture, not a successful user publication. The publication release gate remains closed. */
function fixture(raw = '매주 월, 수', end = '3회', start = '2026-12-01', time = '07:00') {
  const schedule = programRecurringScheduleFromDraft({ version: 1, raw, end, startKind: 'fixed', startValue: start, time, timeZone: 'Asia/Seoul' }); assert(schedule);
  const publicOwner = { kind: 'public-copy' as const, version: 1 as const, copyId: 'copy-one', flowId: 'public-flow', itemId: 'public-item', scheduleVersionId: 'public-v1', schedule };
  const sourceRevisionToken = stableAuthoringJson({ kind: 'public-copy-source/1', copyId: publicOwner.copyId, flowId: publicOwner.flowId,
    schedules: [{ itemId: publicOwner.itemId, versionId: publicOwner.scheduleVersionId, schedule }] });
  const genuine = projectProgramPublicRecurrence({ itemId: publicOwner.itemId, startDate: start, rule: schedule.rule, limit: 100 }); assert(genuine.ok);
  const rule = programPublicRecurrenceToAuthoring(schedule.rule)!;
  const sources: ProgramOccurrenceIdentity[] = genuine.projection.occurrences.map(row => ({ publicOwner: clone(publicOwner), sourceRevisionToken,
    sourceWorkspaceId: publicOwner.copyId, sourceFlowRef: programPublicCopyExecutionRef(publicOwner.copyId), itemId: publicOwner.itemId,
    sourceItemRef: programPublicCopyItemRef(publicOwner.copyId, publicOwner.flowId, publicOwner.itemId), seriesId: programPublicCopySeriesKey(publicOwner, start),
    occurrenceId: row.occurrenceId, occurrenceIndex: row.occurrenceIndex, originalDate: row.date,
    sourceRule: { startDate: start, recurrence: rule.raw, recurrenceEnd: rule.end?.raw ?? null } }));
  assert(sources.every(validateProgramPublicCopyOccurrenceIdentity));
  const result = createProgramRecurrencePlanOwner({ ownerId: 'private-plan', actorId: createProgramData().activeActorId, source: sources[0], createdAt,
    template: { ...(time ? { time } : {}), timeZone: 'Asia/Seoul' }, retainedSourceExecutions: [], retainedTaskRecordsRaw: '[]' });
  assert(result.ok, result.ok ? '' : result.reason);
  return { owner: result.value, sources, schedule };
}
function read(owner: ProgramRecurrencePlanOwner, start = '2026-12-01', end = '2027-04-30') {
  const result = readProgramRecurrencePlan(owner, { start, end }); assert(result.ok, result.ok ? '' : result.reason); return result.value;
}
function change(owner: ProgramRecurrencePlanOwner, date: string, targetDate: string, scope: 'whole_series' | 'future_series' = 'whole_series', at = later) {
  const row = read(owner, date, date).projection.occurrences.find(row => row.originalDate === date); assert(row);
  const target = resolveProgramRecurrencePlanTarget(owner, { originalDate: date,
    ...(owner.operations.length ? { personalIdentity: programPersonalOccurrenceIdentity(owner, row) } : {}) }); assert(target.ok, target.ok ? '' : target.reason);
  const sourceCutover = owner.operations.length ? null : programOriginalOccurrenceIdentityAt(owner.source, date); assert(owner.operations.length || sourceCutover);
  return previewProgramRecurrencePlan(owner, { actorId: owner.actorId, expected: clone(owner), currentSource: clone(owner.source),
    operation: { scope, targetDate, target: target.value, sourceCutover, at } });
}
function done(source: ProgramOccurrenceIdentity): ProgramOccurrenceExecution {
  return { ...clone(source), schedule: { mode: 'inherit', date: null }, completion: { status: 'completed', completedAt: createdAt }, participation: 'included' };
}
function stagedData(owner: ProgramRecurrencePlanOwner) {
  const data = createProgramData(), space = data.spaces[owner.actorId], source = owner.source.publicOwner!;
  data.public.flows.push({ id: source.flowId, ownerId: 'creator-minji', currentVersionId: source.scheduleVersionId, category: '운동', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: source.scheduleVersionId, flowId: source.flowId, number: 1, parentVersionId: null, title: '공개 주간 운동', summary: '',
    items: [{ id: source.itemId, title: '주간 운동', description: '', completionCriteria: '', sourceUrl: null, schedule: clone(source.schedule), subchecks: [] }],
    source: { kind: 'user-text', label: '직접 작성', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt });
  space.copies.push({ id: source.copyId, flowId: source.flowId, baseVersionId: source.scheduleVersionId, documentId: 'copy-doc', itemLines: { [source.itemId]: 'series-line' },
    subcheckLines: {}, inheritedDates: { [source.itemId]: null }, includedItemIds: [source.itemId], anchor: null, itemOverrides: {}, appliedFields: {}, recurrence: { version: 1, itemIds: [source.itemId] } });
  space.text.flows.push({ id: 'copy-doc', title: 'PRIVATE-TITLE', folderId: 'folder-unfiled', folder: '미분류', private: true, sourceVersion: source.scheduleVersionId,
    lines: [{ id: 'series-line', text: '반복: 주간 운동' }, { id: 'private-note', text: 'PRIVATE-NOTE' }] });
  space.recurrencePlans = { version: 1, owners: { [owner.ownerId]: clone(owner) } };
  assert(validateProgramData(data));
  return { data, space };
}

test('PPR first off-weekday start remains a genuine selectable source occurrence; no live gate is opened', () => {
  const { owner, sources, schedule } = fixture(), before = JSON.stringify(owner);
  assert.deepEqual(read(owner).projection.occurrences.map(row => row.originalDate), sources.map(row => row.originalDate));
  assert.deepEqual(sources.map(row => row.originalDate), ['2026-12-01', '2026-12-02', '2026-12-07']);
  assert.equal(read(owner).personalOccurrences.length, 0); assert.equal(validateProgramSchedule(schedule), true); assert.equal(canPublishProgramSchedule(schedule), true);
  assert.equal(JSON.stringify(owner), before); assert.equal(programOriginalOccurrenceIdentityAt(owner.source, '2026-12-03'), null);
});
test('PPR whole movement preserves explicit first start, shifted weekdays, count, pinned public original and pure Undo', () => {
  const { owner } = fixture(), before = JSON.stringify(owner), p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok, p.ok ? '' : p.reason);
  const applied = applyProgramRecurrencePlan(owner, p.value); assert(applied.ok);
  assert.deepEqual(read(applied.value).personalOccurrences.map(row => row.originalDate), ['2026-12-03', '2026-12-04', '2026-12-09']);
  assert.deepEqual(applied.value.source, owner.source); assert.equal(read(applied.value).sourceCoverage.mode, 'replaced');
  assert(validateProgramRecurrencePlanOwner(clone(applied.value))); const undo = undoProgramRecurrencePlan(clone(applied.value), p.value); assert(undo.ok);
  assert.deepEqual(undo.value, owner); assert.equal(JSON.stringify(owner), before);
  assert.equal(programRecurrencePlanHasMore(applied.value, '2026-12-08'), true); assert.equal(programRecurrencePlanHasMore(applied.value, '2026-12-09'), false);
});
test('PPR future gap excludes the author first start too, without manufacturing D1-only occurrences', () => {
  const { owner } = fixture(), p = change(owner, '2026-12-01', '2026-12-03', 'future_series'); assert(p.ok, p.ok ? '' : p.reason);
  const result = read(p.value.after); assert.equal(result.sourceCoverage.untilExclusive, '2026-12-01');
  assert.deepEqual(result.projection.series!.occurrenceOverrides.map(row => /:occurrence:(.*?)T/.exec(row.occurrenceId)![1]), ['2026-12-01', '2026-12-02']);
  assert.deepEqual(result.personalOccurrences.map(row => row.localDate), ['2026-12-03', '2026-12-04', '2026-12-09']);
});
for (const [raw, start, to, expected] of [
  ['2주마다 월, 수', '2026-12-01', '2026-12-03', ['2026-12-03', '2026-12-04', '2026-12-16']],
  ['매월 31일', '2026-12-31', '2027-02-28', ['2027-02-28', '2027-03-28', '2027-04-28']],
  ['2일마다', '2026-12-01', '2026-12-03', ['2026-12-03', '2026-12-05', '2026-12-07']],
] as const) test(`PPR ${raw} uses original authoring sequence with approved private movement policy`, () => {
  const { owner } = fixture(raw, '3회', start), p = change(owner, start, to); assert(p.ok, p.ok ? '' : p.reason);
  assert.deepEqual(read(p.value.after, start, '2027-05-31').personalOccurrences.map(row => row.localDate), expected);
});
test('PPR UNTIL shifts with the plan, not with the immutable source', () => {
  const { owner } = fixture('매주 월, 수', '2026-12-08'), p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok, p.ok ? '' : p.reason);
  assert.equal(read(p.value.after).projection.series!.revisions[0].rule.end?.mode, 'until');
  assert.deepEqual(read(p.value.after).projection.series!.revisions[0].rule.end, { mode: 'until', date: '2026-12-10' });
  assert.deepEqual(p.value.after.source, owner.source);
});
test('PPR actual retained fixed/undated/held/completed and raw task records force history-preserving cutover', () => {
  const { owner, sources } = fixture('매주 월, 수', '8회');
  const fixed = done(sources[0]); fixed.schedule = { mode: 'fixed_date', date: '2027-06-01' };
  const undated = done(sources[1]); undated.schedule = { mode: 'unscheduled', date: null }; undated.participation = 'held';
  owner.retainedSourceExecutions = [fixed, undated]; owner.retainedTaskRecordsRaw = '[ {"percent":45,"memo":"PRIVATE", "original":"keep"} ]';
  const before = clone(owner), p = change(owner, '2026-12-07', '2026-12-14'); assert(p.ok, p.ok ? '' : p.reason);
  assert.deepEqual(p.value.after.retainedSourceExecutions, before.retainedSourceExecutions); assert.equal(p.value.after.retainedTaskRecordsRaw, before.retainedTaskRecordsRaw);
  const result = read(p.value.after); assert.equal(result.sourceCoverage.mode, 'cutover'); assert.equal(result.sourceCoverage.untilExclusive, '2026-12-07');
  assert(result.personalOccurrences.every(row => row.executionState === 'pending')); assert.equal(read(p.value.after, '2027-06-01', '2027-06-01').retainedSourceExecutions.length, 2);
  const undo = undoProgramRecurrencePlan(p.value.after, p.value); assert(undo.ok); assert.deepEqual(undo.value, before);
});
test('PPR private completion, far date and reopen retain identity across a later future plan', () => {
  const { owner } = fixture('매일', '5회'), first = change(owner, '2026-12-01', '2026-12-03'); assert(first.ok);
  const row = read(first.value.after).personalOccurrences[0], identity = programPersonalOccurrenceIdentity(first.value.after, row);
  const entry: ProgramPersonalOccurrenceExecution = { ...identity, schedule: { mode: 'fixed_date', date: '2027-06-01' }, completion: { status: 'completed', completedAt: after }, participation: 'included' };
  const executed = appendProgramPersonalOccurrenceEvent(first.value.after, { afterOperationCount: 1, expected: null, next: entry, at: after }); assert(executed.ok, executed.ok ? '' : executed.reason);
  assert.equal(read(executed.value, '2027-06-01', '2027-06-01').personalOccurrences[0].occurrenceId, row.occurrenceId);
  const second = change(executed.value, '2026-12-04', '2026-12-10', 'whole_series', '2026-09-14T00:03:00.000Z'); assert(second.ok, second.ok ? '' : second.reason);
  assert.equal(read(second.value.after, '2027-06-01', '2027-06-01').personalOccurrences[0].occurrenceId, row.occurrenceId);
  assert.deepEqual(Object.values(read(second.value.after).executionEntries), [entry]);
  const reopened = appendProgramPersonalOccurrenceEvent(second.value.after, { afterOperationCount: 2, expected: entry,
    next: { ...entry, completion: { status: 'open', completedAt: null } }, at: '2026-09-14T00:04:00.000Z' }); assert(reopened.ok, reopened.ok ? '' : reopened.reason);
  assert.equal(read(reopened.value, '2027-06-01', '2027-06-01').personalOccurrences[0].executionState, 'reopened');
});
test('PPR same date, backward future and stale/corrupt receipts are rejected without modifying the owner', () => {
  const { owner } = fixture(), before = JSON.stringify(owner);
  assert.equal(change(owner, '2026-12-01', '2026-12-01').ok, false);
  assert.equal(change(owner, '2026-12-01', '2026-11-30', 'future_series').ok, false);
  const p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok);
  const bad = clone(p.value); bad.operation.target.occurrenceId = 'foreign'; assert.equal(applyProgramRecurrencePlan(owner, bad).ok, false);
  const changed = clone(owner); changed.retainedTaskRecordsRaw = '[{}]'; assert.equal(applyProgramRecurrencePlan(changed, p.value).ok, false);
  const corrupt = clone(p.value.after); corrupt.operations[0].sourceCutover!.occurrenceIndex++; assert.equal(validateProgramRecurrencePlanOwner(corrupt), false);
  const wrong = clone(owner); wrong.source.sourceRevisionToken = 'arbitrary'; assert.equal(validateProgramRecurrencePlanOwner(wrong), false);
  assert.equal(JSON.stringify(owner), before);
});
test('PPR another accepted item revision cannot duplicate a plan or re-expose its source dates', () => {
  const { owner } = fixture(), p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok);
  const changed = clone(owner.source), token = JSON.parse(changed.sourceRevisionToken);
  token.schedules.push({ itemId: 'other-item', versionId: 'other-v2', schedule: clone(owner.source.publicOwner!.schedule) }); changed.sourceRevisionToken = stableAuthoringJson(token);
  assert(validateProgramPublicCopyOccurrenceIdentity(changed)); assert(sameProgramRecurrencePlanSource(owner.source, changed));
  const data = createProgramData(), space = data.spaces[data.activeActorId]; space.recurrencePlans = { version: 1, owners: { [owner.ownerId]: p.value.after } };
  assert(programRecurrencePlanSuppresses(space, changed));
  // A second valid seeded plan still cannot claim the same pinned source merely by changing its aggregate token.
  const second = createProgramRecurrencePlanOwner({ ...clone(owner), ownerId: 'other-plan', source: changed }); assert(second.ok);
  const secondPlan = change(second.value, '2026-12-01', '2026-12-03'); assert(secondPlan.ok);
  assert.equal(validateProgramRecurrencePlans({ version: 1, owners: { [owner.ownerId]: p.value.after, 'other-plan': secondPlan.value.after } }), false);
  const ownChange = clone(changed); ownChange.publicOwner!.scheduleVersionId = 'new-own-version'; assert.equal(sameProgramRecurrencePlanSource(owner.source, ownChange), false);
});
test('PPR date-only timezone context is retained; no time is invented', () => {
  const { owner } = fixture('매일', '3회', '2026-12-01', ''), p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok);
  const row = read(p.value.after).personalOccurrences[0]; assert.equal(row.scheduleProjection.startTime, undefined); assert.equal(row.scheduleProjection.timeZone, 'Asia/Seoul');
});
test('PPR source lookup pages finite dates beyond the open-ended week bound', () => {
  const { owner } = fixture('매월 31일', '180회', '2026-01-31');
  const identity = programOriginalOccurrenceIdentityAt(owner.source, '2040-01-31'); assert(identity); assert(validateProgramPublicCopyOccurrenceIdentity(identity));
  assert.equal(programOriginalOccurrenceIdentityAt(owner.source, '2040-02-29'), null);
});
test('PPR large daily intervals are not normalized to D1 defaults', () => {
  const { owner } = fixture('366일마다', '3회');
  const result = read(owner, '2026-12-01', '2030-12-01'); assert.deepEqual(result.projection.occurrences.map(row => row.originalDate), ['2026-12-01', '2027-12-02', '2028-12-02']);
  const p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok); assert.equal(read(p.value.after).projection.series!.revisions[0].rule.interval, 366);
});
test('PPR bounded generation is disclosed, not persisted as a source end or successful partial gap movement', () => {
  const { owner } = fixture('매일', '11000회'), before = JSON.stringify(owner);
  const result = read(owner, '2026-12-01', '2060-12-01'); assert.equal(result.truncated, true); assert.equal(result.projection.occurrences.length, 1000);
  assert.equal(change(owner, '2026-12-01', '2030-12-01', 'future_series').ok, false);
  assert.equal(JSON.stringify(owner), before);
});
test('PPR shared period merges actual public source and private revisions once, across split ranges', () => {
  const { owner } = fixture(), p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok);
  const { data } = stagedData(p.value.after), before = JSON.stringify(data);
  const input = { actorId: owner.actorId, flowRef: owner.source.sourceFlowRef, localToday: '2026-12-01' };
  const whole = readProgramOccurrencePeriod(data, { ...input, from: '2026-12-01', to: '2026-12-31' }); assert(whole.ok, whole.ok ? '' : whole.reason);
  assert.deepEqual(whole.rows.map(row => row.executionDate), ['2026-12-03', '2026-12-04', '2026-12-09']); assert(whole.rows.every(row => row.personalPlan));
  const split = ['2026-12-03', '2026-12-04', '2026-12-09'].flatMap(date => { const r = readProgramOccurrencePeriod(data, { ...input, from: date, to: date }); assert(r.ok); return r.rows.map(row => row.key); });
  assert.deepEqual(split, whole.rows.map(row => row.key)); assert.equal(new Set(split).size, 3); assert.equal(JSON.stringify(data), before);
  // Storage validation and private preparation are separate from permission to publish.
  const prepared = prepareProgramRecurrencePlan(data, { ...input, sourceIdentity: owner.source, ownerId: 'new-plan', now: later });
  assert(prepared.ok); assert.deepEqual(prepared.value.expectedOwner, data.spaces[owner.actorId].recurrencePlans!.owners[owner.ownerId]);
  assert.equal(canPublishProgramSchedule(owner.source.publicOwner!.schedule), true);
});
test('PPR accepted source change or private archive keeps private history in recovery without active execution', () => {
  const { owner } = fixture(), p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok);
  const row = read(p.value.after).personalOccurrences[0];
  const entry: ProgramPersonalOccurrenceExecution = { ...programPersonalOccurrenceIdentity(p.value.after, row), schedule: { mode: 'inherit', date: null }, completion: { status: 'completed', completedAt: after }, participation: 'included' };
  const saved = appendProgramPersonalOccurrenceEvent(p.value.after, { afterOperationCount: 1, expected: null, next: entry, at: after }); assert(saved.ok);
  const { data, space } = stagedData(saved.value), original = JSON.stringify(space.recurrencePlans);
  const next = clone(data.public.versions.at(-1)!); next.id = 'public-v2'; next.parentVersionId = 'public-v1'; next.number = 2;
  next.items[0].schedule = { ...clone(owner.source.publicOwner!.schedule), time: '09:00' }; data.public.versions.push(next); space.copies[0].appliedFields[owner.source.itemId] = { schedule: next.id };
  const input = { actorId: owner.actorId, ownerId: owner.ownerId, localToday: '2026-12-01', range: { start: '2026-12-01', end: '2026-12-31' } };
  const changed = readProgramPersonalRecurrences(data, input); assert(changed.ok); assert.equal(changed.value.sourceAvailable, false); assert(changed.value.rows.every(row => row.flowInactive));
  assert.equal(JSON.stringify(space.recurrencePlans), original); assert.deepEqual(read(saved.value).executionEntries[Object.keys(read(saved.value).executionEntries)[0]], entry);
  delete space.copies[0].appliedFields[owner.source.itemId]; space.archivedDocumentIds.push('copy-doc');
  const archived = readProgramPersonalRecurrences(data, input); assert(archived.ok); assert.equal(archived.value.sourceAvailable, false); assert.equal(JSON.stringify(space.recurrencePlans), original);
});
test('PPR source token changes for a different item keep the shared personal reader active', () => {
  const { owner } = fixture(), p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok);
  const { data, space } = stagedData(p.value.after), item = clone(data.public.versions.at(-1)!.items[0]); item.id = 'other-item'; data.public.versions.at(-1)!.items.push(item);
  const copy = space.copies[0]; copy.itemLines[item.id] = 'other-series'; copy.includedItemIds.push(item.id); copy.recurrence!.itemIds.push(item.id);
  space.text.flows.at(-1)!.lines.push({ id: 'other-series', text: '다른 반복' });
  const result = readProgramPersonalRecurrences(data, { actorId: owner.actorId, ownerId: owner.ownerId, localToday: '2026-12-01', range: { start: '2026-12-01', end: '2026-12-31' } });
  assert(result.ok); assert.equal(result.value.sourceAvailable, true); assert(result.value.rows.every(row => !row.sourceConflict && !row.flowInactive));
});
test('PPR public private-plan computation never accesses storage, network or native writers', () => {
  const { owner } = fixture(), originals = new Map<string, PropertyDescriptor | undefined>(), touched: string[] = [];
  for (const name of ['localStorage', 'sessionStorage', 'fetch']) { originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name)); Object.defineProperty(globalThis, name, { configurable: true, get() { touched.push(name); throw Error('forbidden'); } }); }
  try { const p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok); assert(read(p.value.after).personalOccurrences.length); assert.deepEqual(touched, []); }
  finally { for (const [name, value] of originals) { if (value) Object.defineProperty(globalThis, name, value); else Reflect.deleteProperty(globalThis, name); } }
});
test('PPR long 31st-of-month COUNT continuation follows genuine remaining dates, not count times 31 days', () => {
  const { owner } = fixture('매월 31일', '180회', '2026-01-31'), p = change(owner, '2026-01-31', '2026-03-31'); assert(p.ok);
  const rows = read(p.value.after, '2026-01-01', '2060-12-31').personalOccurrences;
  assert.equal(rows.length, 180); assert(rows.at(-1)!.localDate > '2045-01-01');
  assert.equal(programRecurrencePlanHasMore(p.value.after, '2045-01-01'), true);
  assert.equal(programRecurrencePlanHasMore(p.value.after, rows.at(-1)!.localDate), false);
});
test('PPR source-only and maximum supported calendar date do not manufacture private continuation', () => {
  const { owner } = fixture(); assert.equal(programRecurrencePlanHasMore(owner, '2026-12-01'), false);
  const p = change(owner, '2026-12-01', '2026-12-03'); assert(p.ok);
  assert.equal(programRecurrencePlanHasMore(p.value.after, '9999-12-31'), false);
  const open = fixture('매일', ''), moved = change(open.owner, '2026-12-01', '2026-12-03'); assert(moved.ok);
  assert.equal(programRecurrencePlanHasMore(moved.value.after, '2027-01-01'), true);
});
