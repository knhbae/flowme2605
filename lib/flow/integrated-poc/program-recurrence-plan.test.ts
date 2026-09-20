import assert from 'node:assert/strict';
import test from 'node:test';
import { expandPersonalWorkspacePocOccurrences } from '../personal-workspace-poc-occurrence';
import { planDateMovement } from '../date-movement';
import { generatePersonalStructuralOccurrences } from '../personal-structural-occurrence';
import { toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocFlowRef } from '../personal-workspace-poc-contract';
import { createProgramRecurrencePlanOwner, validateProgramRecurrencePlanOwner, readProgramRecurrencePlan, previewProgramRecurrencePlan,
  applyProgramRecurrencePlan, undoProgramRecurrencePlan } from './program-recurrence-plan';
import type { ProgramRecurrencePlanOwner, ProgramRecurrencePlanOperation } from './program-recurrence-plan-contract';
import type { ProgramOccurrenceIdentity, ProgramOccurrenceExecution } from './recurrence-state-contract';
const at = '2026-09-12T00:00:00.000Z', later = '2026-09-12T01:00:00.000Z';
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
function fixture(recurrence = '매일', recurrenceEnd: string | null = '10회', startDate = '2026-09-01') {
  const savedCopyId = 'saved-copy', flowId = 'flow', itemId = 'item';
  const sourceItemRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId);
  const read = expandPersonalWorkspacePocOccurrences({ sourceItemRef, startDate, recurrence, ...(recurrenceEnd ? { recurrenceEnd } : {}), finiteLimit: 100 });
  assert.ok(read.ok);
  const sources = read.manifest.rows.map<ProgramOccurrenceIdentity>(row => ({ sourceWorkspaceId: 'original-workspace', sourceFlowRef: toPersonalWorkspacePocFlowRef(savedCopyId, flowId),
    sourceRevisionToken: 'immutable-actual-source-token', savedCopyId, flowId, itemId, sourceItemRef, seriesId: row.seriesId,
    occurrenceId: row.occurrenceId, occurrenceIndex: row.occurrenceIndex, originalDate: row.originalDate, sourceRule: { startDate, recurrence, recurrenceEnd } }));
  const created = createProgramRecurrencePlanOwner({ ownerId: 'plan', actorId: 'local-user', source: sources[0], template: { time: '09:00', durationMinutes: 30, timeZone: 'America/New_York' },
    createdAt: at, retainedSourceExecutions: [], retainedTaskRecordsRaw: '[]' });
  assert.ok(created.ok); return { owner: created.value, sources };
}
function op(owner: ProgramRecurrencePlanOwner, sourceCutover: ProgramOccurrenceIdentity, targetDate = '2026-09-05', scope: ProgramRecurrencePlanOperation['scope'] = 'whole_series') {
  const read = readProgramRecurrencePlan(owner, { start: sourceCutover.originalDate, end: sourceCutover.originalDate }); assert.ok(read.ok);
  assert.ok(read.value.targets[0]);
  return { scope, targetDate, target: read.value.targets[0], sourceCutover: owner.operations.length ? null : sourceCutover, at: later };
}
function preview(owner: ProgramRecurrencePlanOwner, operation: ProgramRecurrencePlanOperation) {
  const result = previewProgramRecurrencePlan(owner, { actorId: owner.actorId, expected: copy(owner), currentSource: copy(owner.source), operation });
  assert.ok(result.ok, result.ok ? '' : result.reason); return result.value;
}
function record(source: ProgramOccurrenceIdentity): ProgramOccurrenceExecution {
  return { ...copy(source), schedule: { mode: 'inherit', date: null }, completion: { status: 'unrecorded', completedAt: null }, participation: 'included' };
}
test('RP01 genuine source identity creates separate personal owner without changing source', () => {
  const { owner } = fixture(); const before = JSON.stringify(owner.source);
  const result = preview(owner, op(owner, owner.source));
  assert.equal(JSON.stringify(result.after.source), before); assert.deepEqual(result.before, owner);
  const first = readProgramRecurrencePlan(owner, { start: '2026-09-01', end: '2026-10-01' });
  const after = readProgramRecurrencePlan(result.after, { start: '2026-09-01', end: '2026-10-01' });
  assert.ok(first.ok && after.ok); assert.equal(after.value.projection.occurrences[0].originalDate, '2026-09-05');
  assert.equal(first.value.projection.series?.seriesId, after.value.projection.series?.seriesId);
  assert.equal(first.value.projection.series?.revisions[0].revisionId, after.value.projection.series?.revisions[0].revisionId);
  assert.notEqual(after.value.projection.series?.seriesId, owner.source.seriesId);
});
test('RP02 source fixed, undated, completed and held records plus cumulative records remain exact through apply/Undo/reload', () => {
  const { owner, sources } = fixture();
  owner.retainedSourceExecutions = [record(sources[0]), record(sources[1]), record(sources[2])];
  owner.retainedSourceExecutions[0].schedule = { mode: 'fixed_date', date: '2026-12-24' };
  owner.retainedSourceExecutions[0].completion = { status: 'completed', completedAt: at };
  owner.retainedSourceExecutions[1].schedule = { mode: 'unscheduled', date: null };
  owner.retainedSourceExecutions[2].participation = 'held';
  owner.retainedTaskRecordsRaw = '[ {"taskId":"original-id","date":"2026-09-01","percent":45,"memo":"원래 기록"} ]';
  const before = copy(owner), p = preview(owner, op(owner, sources[3], '2026-09-08'));
  const applied = applyProgramRecurrencePlan(owner, p); assert.ok(applied.ok);
  assert.deepEqual(applied.value.retainedSourceExecutions, before.retainedSourceExecutions);
  assert.equal(applied.value.retainedTaskRecordsRaw, before.retainedTaskRecordsRaw);
  const reread = readProgramRecurrencePlan(copy(applied.value), { start: '2026-12-24', end: '2026-12-24' }); assert.ok(reread.ok);
  assert.equal(reread.value.retainedSourceExecutions.length, 2); // Fixed + undated are not lost outside the source generation window.
  assert.equal(reread.value.projection.series?.revisions.length, 2);
  const undone = undoProgramRecurrencePlan(copy(applied.value), p); assert.ok(undone.ok); assert.deepEqual(undone.value, before);
});
test('RP03 future cutover gap is excluded by actual owner and earlier source records are not relinked', () => {
  const { owner, sources } = fixture(); owner.retainedSourceExecutions = [record(sources[0])];
  const p = preview(owner, op(owner, sources[2], '2026-09-06', 'future_series'));
  const read = readProgramRecurrencePlan(p.after, { start: '2026-09-01', end: '2026-09-10' }); assert.ok(read.ok);
  assert.ok(read.value.projection.series!.occurrenceOverrides.length >= 3);
  assert.deepEqual(p.after.retainedSourceExecutions, owner.retainedSourceExecutions);
  assert.equal(read.value.sourceCoverage.mode, 'cutover');
  assert.equal(read.value.sourceCoverage.untilExclusive, '2026-09-03');
  assert.ok(read.value.personalOccurrences.every(row => row.localDate >= '2026-09-06'));
  assert.ok(read.value.targets.every(row => row.currentDate >= '2026-09-06'));
});
test('RP04 missing owner, foreign actor, stale source and stale owner fail closed', () => {
  const { owner } = fixture(), operation = op(owner, owner.source);
  const base = { actorId: owner.actorId, expected: owner, currentSource: owner.source, operation };
  assert.equal(previewProgramRecurrencePlan(null, base).ok, false);
  assert.equal(previewProgramRecurrencePlan(owner, { ...base, actorId: 'other' }).ok, false);
  assert.equal(previewProgramRecurrencePlan(owner, { ...base, currentSource: { ...owner.source, sourceRevisionToken: 'changed' } }).ok, false);
  assert.equal(previewProgramRecurrencePlan(owner, { ...base, expected: { ...owner, retainedTaskRecordsRaw: '[1]' } }).ok, false);
});
test('RP05 same date with a different actual source occurrence index never establishes a handoff', () => {
  const { owner } = fixture(), operation = op(owner, owner.source);
  operation.sourceCutover = { ...owner.source, occurrenceIndex: 2 };
  assert.equal(previewProgramRecurrencePlan(owner, { actorId: owner.actorId, expected: owner, currentSource: owner.source, operation }).ok, false);
  assert.equal(createProgramRecurrencePlanOwner({ ...owner, source: { ...owner.source, occurrenceIndex: 2 } }).ok, false);
});
test('RP06 done, held, excluded, and fixed source cutover cannot become fabricated pending private execution', () => {
  for (const variant of ['done','held','excluded','fixed'] as const) {
    const { owner } = fixture(), r = record(owner.source);
    if (variant === 'done') r.completion = { status: 'completed', completedAt: at };
    else if (variant === 'fixed') r.schedule = { mode: 'fixed_date', date: owner.source.originalDate };
    else r.participation = variant;
    owner.retainedSourceExecutions = [r];
    assert.equal(previewProgramRecurrencePlan(owner, { actorId: owner.actorId, expected: owner, currentSource: owner.source, operation: op(owner, owner.source) }).ok, false);
  }
});
test('RP07 backward future and history-bearing whole-series remain rejected by the existing policy', () => {
  for (const scope of ['whole_series','future_series'] as const) {
    const { owner, sources } = fixture(); owner.retainedSourceExecutions = [record(sources[0])];
    const p = previewProgramRecurrencePlan(owner, { actorId: owner.actorId, expected: owner, currentSource: owner.source, operation: op(owner, sources[3], '2026-09-02', scope) });
    assert.equal(p.ok, false); if (!p.ok) assert.equal(p.reason, 'backward_series_shift_requires_explicit_cutover_policy');
  }
});
test('RP08 forged private tuple and tampered preview cannot commit; newly added history prevents stale Undo', () => {
  const { owner } = fixture(), operation = op(owner, owner.source), p = preview(owner, operation);
  const tampered = copy(p); tampered.after.source.sourceRevisionToken = 'fake';
  assert.equal(applyProgramRecurrencePlan(owner, tampered).ok, false);
  const changed = copy(p.after); changed.retainedSourceExecutions.push(record(owner.source));
  assert.equal(undoProgramRecurrencePlan(changed, p).ok, false);
  operation.target.occurrenceId += '-foreign';
  assert.equal(previewProgramRecurrencePlan(owner, { actorId: owner.actorId, expected: owner, currentSource: owner.source, operation }).ok, false);
});
test('RP09 invalid persisted owner versions, duplicate source keys and invalid templates do not normalize into success', () => {
  const { owner } = fixture();
  for (const bad of [{ ...owner, version: 2 }, { ...owner, surprise: true }, { ...owner, template: { time: '25:00' } },
    { ...owner, retainedSourceExecutions: [record(owner.source), record(owner.source)] }, { ...owner, retainedTaskRecordsRaw: '{}' }]) assert.equal(validateProgramRecurrencePlanOwner(bad), false);
});
test('RP10 bounded period reads agree across split windows and preserve wall-clock attributes', () => {
  const { owner } = fixture('매일', null, '2026-03-01'), p = preview(owner, op(owner, owner.source, '2026-03-07'));
  const all = readProgramRecurrencePlan(p.after, { start: '2026-03-07', end: '2026-03-12' });
  const a = readProgramRecurrencePlan(p.after, { start: '2026-03-07', end: '2026-03-09' });
  const b = readProgramRecurrencePlan(p.after, { start: '2026-03-10', end: '2026-03-12' });
  assert.ok(all.ok && a.ok && b.ok); assert.deepEqual([...a.value.projection.occurrences, ...b.value.projection.occurrences], all.value.projection.occurrences);
  assert.ok(all.value.projection.occurrences.every(row => row.scheduleProjection.startTime === '09:00' && row.scheduleProjection.timeZone === 'America/New_York'));
  assert.equal(all.value.truncated, false);
});
test('RP11 actual weekly and monthly planners retain rule-owned generation, not translated source date strings', () => {
  for (const [rule, start, target, dates] of [
    ['매주 화요일','2026-09-01','2026-09-03',['2026-09-03','2026-09-10','2026-09-17']],
    ['매월 31일','2026-01-31','2026-02-28',['2026-02-28','2026-03-28','2026-04-28']],
  ] as const) {
    const { owner } = fixture(rule, '3회', start), p = preview(owner, op(owner, owner.source, target));
    const read = readProgramRecurrencePlan(p.after, { start: target, end: '2026-12-31' }); assert.ok(read.ok);
    assert.deepEqual(read.value.personalOccurrences.map(row => row.localDate), dates); assert.deepEqual(p.after.source, owner.source);
    const revisedRule = read.value.projection.series!.revisions.at(-1)!.rule;
    assert.deepEqual(revisedRule.end, { mode: 'count', count: 3 });
    if (rule === '매월 31일') assert.equal(revisedRule.dayOfMonth, 28);
    else assert.deepEqual(revisedRule.weekdays, ['TH']);
  }
});
test('RP12 all functions operate with global storage and fetch forbidden', () => {
  const originals = ['localStorage','sessionStorage','fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  try { for (const [key] of originals) Object.defineProperty(globalThis, key, { configurable: true, get() { throw new Error('forbidden capability'); } });
    const { owner } = fixture(), p = preview(owner, op(owner, owner.source)); assert.ok(applyProgramRecurrencePlan(owner, p).ok);
  } finally { for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } }
});
test('RP13 repeated personal revision uses actual private owner and cannot edit source-basis preview rows', () => {
  const { owner, sources } = fixture(), first = preview(owner, op(owner, sources[2], '2026-09-06', 'future_series'));
  const read = readProgramRecurrencePlan(first.after, { start: '2026-09-06', end: '2026-09-06' }); assert.ok(read.ok);
  const operation: ProgramRecurrencePlanOperation = { scope: 'future_series', targetDate: '2026-09-08', target: read.value.targets[0], sourceCutover: null, at: '2026-09-12T02:00:00.000Z' };
  const second = preview(first.after, operation); assert.deepEqual(second.after.source, owner.source);
  const bad = { ...operation, target: op(owner, sources[0]).target };
  assert.equal(previewProgramRecurrencePlan(first.after, { actorId: owner.actorId, expected: first.after, currentSource: owner.source, operation: bad }).ok, false);
});
test('RP14 owner validation rejects extra source fields and no-change operations without accumulating revisions', () => {
  const { owner } = fixture(); assert.equal(validateProgramRecurrencePlanOwner({ ...owner, source: { ...owner.source, schedule: {} } }), false);
  const operation = op(owner, owner.source, owner.source.originalDate);
  assert.equal(previewProgramRecurrencePlan(owner, { actorId: owner.actorId, expected: owner, currentSource: owner.source, operation }).ok, false);
  assert.equal(owner.operations.length, 0);
});
test('RP15 retained-history whole-series produces the same rule/revisions/gap exclusions as actual development1 whole-series policy', () => {
  const { owner, sources } = fixture(); owner.retainedSourceExecutions = [record(sources[0])];
  owner.retainedSourceExecutions[0].completion = { status: 'completed', completedAt: at };
  const operation = op(owner, sources[3], '2026-09-08', 'whole_series');
  const initial = readProgramRecurrencePlan(owner, { start: '2026-09-01', end: '2026-09-12' }); assert.ok(initial.ok);
  // Explicit generated private fixture record for policy comparison only; production never maps a source record to this tuple.
  const first = initial.value.targets[0], state = copy(initial.value.state);
  state.occurrenceExecutionRecords = [{ seriesId: first.seriesId, occurrenceId: first.occurrenceId, revisionId: first.revisionId,
    state: 'done', updatedAt: at, completedAt: at, history: [{ from: 'pending', to: 'done', at }] }];
  const actual = planDateMovement(state, { scope: 'whole_series', operation: 'set_date', targetDate: operation.targetDate, occurrence: operation.target, updatedAt: operation.at });
  assert.ok(actual.canApply); assert.ok(actual.warnings.includes('whole_series_history_preserved_as_new_revision'));
  const p = preview(owner, operation), ours = readProgramRecurrencePlan(p.after, { start: '2026-09-01', end: '2026-09-20' }); assert.ok(ours.ok);
  assert.deepEqual(ours.value.state.items, actual.nextState.items);
  assert.deepEqual(actual.nextState.occurrenceExecutionRecords, state.occurrenceExecutionRecords);
  assert.deepEqual(p.after.retainedSourceExecutions, owner.retainedSourceExecutions);
  assert.equal(p.after.operations[0].scope, 'whole_series');
});
test('RP16 whitespace-empty records are not execution history and missing/no-op dates cannot produce a receipt', () => {
  const { owner } = fixture(); owner.retainedTaskRecordsRaw = ' \n[ ]\n ';
  const p = preview(owner, op(owner, owner.source));
  const read = readProgramRecurrencePlan(p.after, { start: '2026-09-01', end: '2026-09-20' }); assert.ok(read.ok);
  assert.equal(read.value.projection.series?.revisions.length, 1); assert.equal(read.value.sourceCoverage.mode, 'replaced');
  const operation = op(owner, owner.source); Reflect.deleteProperty(operation, 'targetDate');
  assert.equal(previewProgramRecurrencePlan(owner, { actorId: owner.actorId, expected: owner, currentSource: owner.source, operation }).ok, false);
  assert.equal(owner.operations.length, 0);
});
test('RP17 source-owner range plus personal-owner range execute no base-preview duplicates across cutover or split periods', () => {
  const { owner, sources } = fixture(), p = preview(owner, op(owner, sources[3], '2026-09-08', 'future_series'));
  const read = readProgramRecurrencePlan(p.after, { start: '2026-09-01', end: '2026-09-20' }); assert.ok(read.ok);
  const sourceRows = sources.filter(row => row.originalDate < read.value.sourceCoverage.untilExclusive!);
  assert.deepEqual(sourceRows.map(row => row.originalDate), ['2026-09-01','2026-09-02','2026-09-03']);
  assert.ok(read.value.personalOccurrences.every(row => row.localDate >= '2026-09-08'));
  assert.ok(read.value.personalOccurrences.every(row => row.revisionId !== read.value.sourceCoverage.baseRevisionId));
  const keys = [...sourceRows.map(row => row.occurrenceId), ...read.value.personalOccurrences.map(row => row.occurrenceId)];
  assert.equal(new Set(keys).size, keys.length);
  const before = readProgramRecurrencePlan(p.after, { start: '2026-09-01', end: '2026-09-07' }); assert.ok(before.ok);
  assert.equal(before.value.personalOccurrences.length, 0);
});
test('RP18 a later no-history whole personal revision stays visible without reactivating old source-basis rows', () => {
  const { owner, sources } = fixture(), first = preview(owner, op(owner, sources[2], '2026-09-06', 'future_series'));
  const initial = readProgramRecurrencePlan(first.after, { start: '2026-09-06', end: '2026-09-06' }); assert.ok(initial.ok);
  const second = preview(first.after, { scope: 'whole_series', targetDate: '2026-09-08', target: initial.value.targets[0], sourceCutover: null, at: '2026-09-12T02:00:00.000Z' });
  const read = readProgramRecurrencePlan(second.after, { start: '2026-09-01', end: '2026-09-20' }); assert.ok(read.ok);
  assert.equal(read.value.sourceCoverage.untilExclusive, '2026-09-03');
  assert.equal(read.value.sourceCoverage.sourceBasisActive, false);
  assert.ok(read.value.personalOccurrences.length > 0);
  assert.ok(read.value.personalOccurrences.every(row => row.localDate >= '2026-09-08'));
  const crossing: ProgramRecurrencePlanOperation = { scope: 'whole_series', targetDate: '2026-09-01', target: initial.value.targets[0], sourceCutover: null, at: '2026-09-12T02:00:00.000Z' };
  assert.equal(previewProgramRecurrencePlan(first.after, { actorId: owner.actorId, expected: first.after, currentSource: owner.source, operation: crossing }).ok, false);
});
test('RP19 recursively canonicalized storage key order preserves validate/read/preview/apply/Undo semantics', () => {
  const sorted = <T,>(v: T): T => JSON.parse(JSON.stringify(v, (_key, x) => x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map(key => [key, x[key]])) : x));
  const { owner, sources } = fixture(); owner.retainedSourceExecutions = [record(sources[0])];
  owner.retainedTaskRecordsRaw = '[ {"percent":45,"date":"2026-09-01"} ]';
  const p = preview(owner, op(owner, sources[2], '2026-09-06', 'future_series')), canonicalAfter = sorted(p.after);
  assert.equal(validateProgramRecurrencePlanOwner(canonicalAfter), true);
  const read = readProgramRecurrencePlan(canonicalAfter, { start: '2026-09-06', end: '2026-09-10' }); assert.ok(read.ok);
  const applied = applyProgramRecurrencePlan(sorted(owner), sorted(p)); assert.ok(applied.ok);
  const undo = undoProgramRecurrencePlan(canonicalAfter, p); assert.ok(undo.ok); assert.deepEqual(sorted(undo.value), sorted(owner));
  assert.equal(undo.value.retainedTaskRecordsRaw, owner.retainedTaskRecordsRaw);
  assert.ok(previewProgramRecurrencePlan(canonicalAfter, { actorId: owner.actorId, expected: p.after, currentSource: sorted(owner.source),
    operation: { scope: 'future_series', targetDate: '2026-09-08', target: sorted(read.value.targets[0]), sourceCutover: null, at: '2026-09-12T02:00:00.000Z' } }).ok);
});

const exactCalendarCases = [
  { name: 'RP20 non-leap month 31 skips February and whole shift becomes the 28th', rule: '매월 31일', end: '3회', start: '2026-01-31', target: '2026-02-28',
    sourceDates: ['2026-01-31','2026-03-31','2026-05-31'], expected: ['2026-02-28','2026-03-28','2026-04-28'], until: '2026-12-31', day: 28, endRule: { mode: 'count', count: 3 } },
  { name: 'RP21 leap month 31 shifts to genuine February 29 and a 29th rule', rule: '매월 31일', end: '4회', start: '2028-01-31', target: '2028-02-29',
    sourceDates: ['2028-01-31','2028-03-31','2028-05-31','2028-07-31'], expected: ['2028-02-29','2028-03-29','2028-04-29','2028-05-29'], until: '2028-12-31', day: 29, endRule: { mode: 'count', count: 4 } },
  { name: 'RP22 monthly until shifts its bound and follows new cadence rather than preserving old count', rule: '매월 31일', end: '2026-05-31', start: '2026-01-31', target: '2026-02-28',
    sourceDates: ['2026-01-31','2026-03-31','2026-05-31'], expected: ['2026-02-28','2026-03-28','2026-04-28','2026-05-28','2026-06-28'], until: '2026-12-31', day: 28, endRule: { mode: 'until', date: '2026-06-28' } },
  { name: 'RP23 daily inclusive until over leap day preserves all three actual dates', rule: '매일', end: '2028-03-01', start: '2028-02-28', target: '2028-03-01',
    sourceDates: ['2028-02-28','2028-02-29','2028-03-01'], expected: ['2028-03-01','2028-03-02','2028-03-03'], until: '2028-12-31', day: undefined, endRule: { mode: 'until', date: '2028-03-03' } },
  { name: 'RP24 monthly 29 skips a non-leap February before changing to the 28th', rule: '매월 29일', end: '4회', start: '2027-01-29', target: '2027-02-28',
    sourceDates: ['2027-01-29','2027-03-29','2027-04-29','2027-05-29'], expected: ['2027-02-28','2027-03-28','2027-04-28','2027-05-28'], until: '2027-12-31', day: 28, endRule: { mode: 'count', count: 4 } },
] as const;
for (const c of exactCalendarCases) test(c.name, () => {
  const { owner, sources } = fixture(c.rule, c.end, c.start);
  assert.deepEqual(sources.map(row => row.originalDate), c.sourceDates);
  const operation = op(owner, owner.source, c.target), p = preview(owner, operation);
  const initial = readProgramRecurrencePlan(owner, { start: c.start, end: c.until }); assert.ok(initial.ok);
  // Independent existing date-movement plan and real structural expander, not the Program read result reused as its own oracle.
  const directPlan = planDateMovement(initial.value.state, { scope: 'whole_series', operation: 'set_date', targetDate: c.target, occurrence: operation.target, updatedAt: operation.at });
  assert.ok(directPlan.canApply);
  const direct = generatePersonalStructuralOccurrences({ identityNamespace: directPlan.nextState.identityNamespace, itemId: owner.source.itemId,
    schedule: directPlan.nextState.items[0].schedule, range: { start: c.target, end: c.until } });
  const whole = readProgramRecurrencePlan(p.after, { start: c.target, end: c.until }); assert.ok(whole.ok);
  const rows = whole.value.personalOccurrences;
  assert.deepEqual(rows, direct.projectedOccurrences);
  assert.deepEqual(rows.map(row => row.localDate), c.expected);
  assert.equal(rows.length, c.expected.length); assert.equal(rows[0].localDate, c.expected[0]); assert.equal(rows.at(-1)!.localDate, c.expected.at(-1));
  const revised = whole.value.projection.series!.revisions.at(-1)!.rule;
  assert.equal(revised.dayOfMonth, c.day); assert.deepEqual(revised.end, c.endRule);
  const boundary = c.expected[1], nextDay = new Date(`${boundary}T00:00:00.000Z`); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const left = readProgramRecurrencePlan(p.after, { start: c.target, end: boundary });
  const right = readProgramRecurrencePlan(p.after, { start: nextDay.toISOString().slice(0,10), end: c.until }); assert.ok(left.ok && right.ok);
  const union = [...left.value.personalOccurrences, ...right.value.personalOccurrences];
  assert.deepEqual(union, rows); assert.equal(new Set(union.map(row => row.occurrenceId)).size, rows.length);
  assert.equal(whole.value.truncated, false); assert.equal(left.value.truncated, false); assert.equal(right.value.truncated, false);
  assert.deepEqual(p.after.source, owner.source);
});
test('RP25 future monthly count belongs to the new revision while old source records and split period identity remain exact', () => {
  const { owner, sources } = fixture('매월 31일', '3회', '2026-01-31');
  owner.retainedSourceExecutions = [record(sources[0])]; owner.retainedSourceExecutions[0].completion = { status: 'completed', completedAt: at };
  const operation = op(owner, sources[1], '2026-04-30', 'future_series'), p = preview(owner, operation);
  const whole = readProgramRecurrencePlan(p.after, { start: '2026-01-01', end: '2026-12-31' }); assert.ok(whole.ok);
  const latest = whole.value.projection.series!.revisions.at(-1)!;
  assert.equal(latest.rule.dayOfMonth, 30); assert.deepEqual(latest.rule.end, { mode: 'count', count: 3 });
  assert.deepEqual(whole.value.personalOccurrences.map(row => row.localDate), ['2026-04-30','2026-05-30','2026-06-30']);
  const direct = generatePersonalStructuralOccurrences({ identityNamespace: whole.value.state.identityNamespace, itemId: owner.source.itemId,
    schedule: whole.value.state.items[0].schedule, range: { start: '2026-01-01', end: '2026-12-31' } });
  assert.deepEqual(whole.value.personalOccurrences, direct.projectedOccurrences.filter(row => row.revisionId === latest.revisionId));
  const left = readProgramRecurrencePlan(p.after, { start: '2026-01-01', end: '2026-05-01' });
  const right = readProgramRecurrencePlan(p.after, { start: '2026-05-02', end: '2026-12-31' }); assert.ok(left.ok && right.ok);
  const joined = [...left.value.personalOccurrences, ...right.value.personalOccurrences];
  assert.deepEqual(joined, whole.value.personalOccurrences); assert.equal(new Set(joined.map(row => row.occurrenceId)).size, 3);
  assert.equal(whole.value.sourceCoverage.untilExclusive, '2026-03-31');
  assert.deepEqual(p.after.retainedSourceExecutions, owner.retainedSourceExecutions);
  assert.equal(whole.value.truncated, false);
});
