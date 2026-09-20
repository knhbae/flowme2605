import test from 'node:test';
import assert from 'node:assert/strict';
import { programClone, type ProgramData, type ProgramPublicItem, type ProgramTransition, type PublicSchedule } from './contract';
import { createProgramData, validateProgramData, validateProgramSchedule } from './program-data';
import { programOrdinaryTimingFromDraft, validateProgramOrdinaryTiming, validateProgramOrdinaryTimingDraft } from './public-ordinary-time';
import { publishProgramFlow, createProgramProposal, reviewProgramProposal, type PublishProgramFlowInput } from './publication';
import { makeProgramOutput } from './output';
import { importProgramPublicVersion, compareProgramCopyVersion, applyProgramCopyVersion } from './private-space';
import { inspectProgramPrivateOutput, makeProgramPrivateOutput } from './private-output';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramCreatorTaskSourceFactsReader } from './execution-source';

const now = '2026-09-14T09:00:00.000Z';
const timing = { version: 1 as const, time: '15:00', timeZone: 'Asia/Tokyo' };
const unfold = (text: string) => text.replace(/\r\n[ \t]/g, '');
function ok<T>(value: ProgramTransition<T>) { assert(value.ok, value.ok ? '' : value.reason); assert(validateProgramData(value.data)); return value; }
function input(actorId: string, schedule: PublicSchedule = { kind: 'fixed', date: '2026-09-20', timing }): PublishProgramFlowInput {
  const item: ProgramPublicItem = { id: 'airport', title: '공항에서 숙소로 이동', description: '예약한 이동 수단 확인', completionCriteria: '숙소 도착', sourceUrl: 'https://example.com/travel', schedule, subchecks: [] };
  return { actorId, requestId: 'ordinary-time-publish', title: '여행', summary: '여행 원문', category: '여행', situations: [], items: [item], source: { kind: 'user-text', label: '직접 작성', url: null, checkedAt: null } };
}
function published(schedule?: PublicSchedule) {
  const initial = createProgramData(), actorId = initial.activeActorId, fields = input(actorId, schedule);
  const made = ok(publishProgramFlow(initial, fields, now));
  return { data: made.data, actorId, fields, version: made.data.public.versions.find(v => v.id === made.result)! };
}

test('ordinary timing is optional and validates fixed, relative, undated without changing input', () => {
  for (const schedule of [{ kind: 'fixed', date: '2026-09-20' }, { kind: 'relative', days: -1 }, { kind: 'undated' }]) {
    const before = JSON.stringify(schedule); assert(validateProgramSchedule(schedule)); assert.equal(JSON.stringify(schedule), before);
    assert(validateProgramSchedule({ ...schedule, timing }));
  }
  assert(validateProgramOrdinaryTiming({ version: 1, time: null, timeZone: null }));
  assert(validateProgramOrdinaryTiming({ version: 1, time: '00:00', timeZone: null }));
  assert.deepEqual(programOrdinaryTimingFromDraft({ version: 1, time: ' 15:00 ', timeZone: ' Asia/Tokyo ' }), timing);
});

test('invalid private timing text is recoverable but cannot become public timing', () => {
  for (const [time, timeZone] of [['25:00', 'Asia/Tokyo'], ['15:60', 'Asia/Tokyo'], ['15:00', 'Not/AZone'], ['3pm', '']]) {
    const draft = { version: 1, time, timeZone };
    assert(validateProgramOrdinaryTimingDraft(draft)); assert.equal(programOrdinaryTimingFromDraft(draft as never), null);
    assert(!validateProgramSchedule({ kind: 'undated', timing: { ...draft, timeZone: timeZone || null } }));
  }
});

test('timing rejects unknown versions, hidden/private fields, symbols, getters and proxies without executing accessors', () => {
  let reads = 0;
  const getter = Object.defineProperty({ version: 1, timeZone: 'Asia/Tokyo' }, 'time', { enumerable: true, get() { reads++; return '15:00'; } });
  const hidden = Object.defineProperty({ ...timing }, 'privateMemo', { value: 'PRIVATE' });
  const proxy = new Proxy({}, { getPrototypeOf() { throw Error('blocked'); } });
  for (const value of [{ ...timing, version: 2 }, { ...timing, privateMemo: 'PRIVATE' }, { ...timing, [Symbol('private')]: 'PRIVATE' }, getter, hidden, proxy, null, []]) {
    assert(!validateProgramOrdinaryTiming(value)); assert(!validateProgramOrdinaryTimingDraft(value));
  }
  assert.equal(reads, 0);
});

test('public ordinary TXT CSV ICS retain source timing, fixed-date semantics and stable UID without data writes', () => {
  const f = published(), before = JSON.stringify(f.data);
  for (const format of ['txt', 'csv', 'ics'] as const) {
    const output = makeProgramOutput(f.version, { format, selectedItemIds: ['airport'], anchor: null }, now); assert(output.ok);
    const payload = unfold(output.payload); assert.match(payload, /Asia\/Tokyo/); assert.match(payload, /15:00/);
    if (format === 'ics') { assert.match(payload, /DTSTART:20260920T060000Z/); assert.doesNotMatch(payload, /DTEND/); }
  }
  assert.equal(JSON.stringify(f.data), before);
});

for (const [label, schedule, expected] of [
  ['floating', { kind: 'fixed', date: '2026-09-20', timing: { ...timing, timeZone: null } }, 'DTSTART:20260920T150000'],
  ['relative', { kind: 'relative', days: -1, timing }, 'DTSTART:20260919T060000Z'],
  ['last supported day', { kind: 'fixed', date: '9999-12-31', timing }, 'DTSTART:99991231T060000Z'],
  ['zone without clock', { kind: 'fixed', date: '2026-09-20', timing: { ...timing, time: null } }, 'DTSTART;VALUE=DATE:20260920'],
] as const) test(`ordinary ICS ${label} uses existing calendar conversion without invented duration`, () => {
  const f = published(schedule), output = makeProgramOutput(f.version, { format: 'ics', selectedItemIds: ['airport'], anchor: '2026-09-20' }, now); assert(output.ok, JSON.stringify(output));
  assert(unfold(output.payload).includes(expected));
  if (label === 'floating') assert.doesNotMatch(output.payload, /DTSTART:.*Z/);
  if (label === 'zone without clock') assert.match(unfold(output.payload), /Asia\/Tokyo/);
});

test('undated source keeps time in text but is not fabricated into an ICS date', () => {
  const f = published({ kind: 'undated', timing });
  const txt = makeProgramOutput(f.version, { format: 'txt', selectedItemIds: ['airport'], anchor: null }, now); assert(txt.ok); assert.match(txt.payload, /15:00/);
  const ics = makeProgramOutput(f.version, { format: 'ics', selectedItemIds: ['airport'], anchor: null }, now);
  assert(!ics.ok); assert.equal(JSON.stringify(f.data.public.versions[0].items[0].schedule), JSON.stringify({ kind: 'undated', timing }));
});

test('ordinary source time initializes private execution; explicit source update preserves personal date time note progress and prior version', () => {
  const f = published(); let data = f.data;
  const imported = ok(importProgramPublicVersion(data, { actorId: f.actorId, requestId: 'copy-time', expectedSpace: data.spaces[f.actorId], versionId: f.version.id, itemIds: ['airport'], anchor: null })); data = imported.data;
  const copy = data.spaces[f.actorId].copies[0], taskId = copy.itemLines.airport;
  const first = M.tasks(data.spaces[f.actorId].text).find(task => task.id === taskId)!; assert.equal(first.time, '15:00');
  data.spaces[f.actorId].text = M.updateTask(data.spaces[f.actorId].text, taskId, { date: '2026-09-22', time: '17:30', note: 'PRIVATE-MEMO' });
  data.spaces[f.actorId].text = M.recordProgress(data.spaces[f.actorId].text, taskId, '2026-09-14', 50); assert(validateProgramData(data));
  const personalBefore = programClone(M.tasks(data.spaces[f.actorId].text).find(task => task.id === taskId)), records = programClone(data.spaces[f.actorId].text.progressRecords);
  const fields = { ...f.fields, requestId: 'time-second-version', flowId: f.version.flowId, expectedVersionId: f.version.id, items: [{ ...f.version.items[0], schedule: { kind: 'fixed' as const, date: '2026-09-21', timing: { ...timing, time: '16:00' } } }] };
  const nextVersion = ok(publishProgramFlow(data, fields, now)); data = nextVersion.data;
  const comparison = ok(compareProgramCopyVersion(data, { actorId: f.actorId, copyId: copy.id, versionId: nextVersion.result }));
  const changed = comparison.result.items[0].fields.find(field => field.field === 'schedule')!; assert(changed.sourceChanged); assert(changed.canApply);
  assert.equal(createProgramCreatorTaskSourceFactsReader(data.spaces[f.actorId], data.public)(copy.documentId, taskId)?.wallTime, '15:00');
  const accepted = ok(applyProgramCopyVersion(data, { actorId: f.actorId, requestId: 'accept-source-time', expectedSpace: data.spaces[f.actorId], copyId: copy.id, expectedBaseVersionId: copy.baseVersionId, versionId: nextVersion.result, itemIds: ['airport'], fields: ['schedule'] })); data = accepted.data;
  const task = M.tasks(data.spaces[f.actorId].text).find(task => task.id === taskId)!;
  for (const key of ['id', 'date', 'time', 'note'] as const) assert.deepEqual(task[key], personalBefore![key]);
  assert.deepEqual(data.spaces[f.actorId].text.progressRecords, records); assert.deepEqual(data.public.versions.find(v => v.id === f.version.id), f.version);
  const inspected = inspectProgramPrivateOutput(data, { actorId: f.actorId, documentId: copy.documentId }); assert(inspected.ok); const row = inspected.rows.find(r => r.id === taskId)!;
  assert.equal(row.time, '17:30'); assert.equal(row.sourceTime, '16:00'); assert.equal(row.timeZone, 'Asia/Tokyo'); assert.equal(row.progress, 50);
  const before = JSON.stringify(data);
  for (const format of ['txt', 'csv', 'ics'] as const) {
    const file = makeProgramPrivateOutput(data, { actorId: f.actorId, documentId: copy.documentId, selectedItemIds: [taskId], mode: 'tasks', format }, now); assert(file.ok, JSON.stringify(file));
    const payload = unfold(file.payload); for (const text of ['17:30', '16:00', 'Asia/Tokyo', 'PRIVATE-MEMO']) assert(payload.includes(text), text);
    if (format === 'ics') assert.match(payload, /DTSTART:20260922T083000Z/);
  }
  assert.equal(JSON.stringify(data), before);
  assert.equal(createProgramCreatorTaskSourceFactsReader(data.spaces[f.actorId], data.public)('foreign-document', taskId), null);
});

test('ordinary time proposal creates an immutable new version; same/invalid timing never mutates input', () => {
  const f = published(), before = JSON.stringify(f.data), schedule = { kind: 'fixed' as const, date: '2026-09-20', timing: { ...timing, time: '16:00' } };
  const proposed = ok(createProgramProposal(f.data, { actorId: 'creator-minji', requestId: 'time-proposal', flowId: f.version.flowId, baseVersionId: f.version.id, itemId: 'airport', reason: '원문 시각 수정', patch: { schedule } }, now));
  const accepted = ok(reviewProgramProposal(proposed.data, { actorId: f.actorId, proposalId: proposed.result, decision: 'accept', expectedVersionId: f.version.id }, now));
  assert.deepEqual(accepted.data.public.versions.at(-1)!.items[0].schedule, schedule); assert.deepEqual(accepted.data.public.versions[0], f.version);
  const same = createProgramProposal(f.data, { actorId: f.actorId, requestId: 'same-time', flowId: f.version.flowId, baseVersionId: f.version.id, itemId: 'airport', reason: 'same', patch: { schedule: f.version.items[0].schedule } }, now); assert(!same.ok); assert.equal(same.data, f.data);
  for (const invalid of [{ ...timing, time: '25:00' }, { ...timing, privateMemo: 'SECRET' }]) {
    const rejected = publishProgramFlow(f.data, { ...f.fields, items: [{ ...f.version.items[0], schedule: { kind: 'undated', timing: invalid } }] }, now); assert(!rejected.ok); assert.equal(rejected.data, f.data);
  }
  assert.equal(JSON.stringify(f.data), before);
});
