import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { prepareProgramInitialData } from './legacy-entry';
import { programClone, PROGRAM_STATE_KEY } from './contract';
import { validateProgramData, createProgramEnvelope } from './program-data';
import { createProgramController, programSame } from './controller';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from './recurrence-state';
import { programOccurrenceSourceFacts, readProgramOccurrenceRecovery, reconnectProgramOccurrenceSource } from './recurrence-recovery';
const now = '2026-09-12T00:00:00.000Z', today = '2026-09-12';
function source(time = '07:00', end = '60회') {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'reconnect', documentId: 'reconnect-doc', revisionId: `reconnect-${time}-${end}`, committedAt: now,
    rawText: `# 원본 재연결\n- [ ] 같은 회차\n  - 날짜: 2026-09-12\n  - 시간: ${time}\n  - 반복: 매일\n  - 반복 종료: ${end}\n  - [ ] 하위 확인` });
  assert(made.ok); if (!made.ok) throw Error('fixture');
  return prepareProgramInitialData({ baseModel: { version: 1, flows: [made.flow] }, legacyState: createPersonalWorkspacePocState(now) }).data;
}
function fixture() {
  let data = source(); const actorId = data.activeActorId, payload = JSON.parse(data.spaces[actorId].legacySnapshot!.raw), input = { actorId, flowRef: payload.model.flows[0].ref, localToday: today };
  const read = readProgramExecutionOccurrences(data, input); assert(read.ok); if (!read.ok) throw Error('read');
  const saved = updateProgramOccurrenceExecution(data, { ...input, identity: read.rows[0].identity, expected: null, changes: { schedule: { mode: 'fixed_date', date: '2027-01-01' }, completion: { status: 'completed', completedAt: now }, participation: 'excluded' } }); assert(saved.ok); if (!saved.ok) throw Error('save');
  data = programClone(saved.data); data.spaces[actorId].legacySnapshot = source('10:30').spaces[actorId].legacySnapshot;
  assert(validateProgramData(data)); const recovery = readProgramOccurrenceRecovery(data, input)[0]; assert(recovery?.canReconnect); assert(recovery.current);
  return { data, input, recovery, request: { actorId, localToday: today, expected: recovery.stored, currentIdentity: recovery.current.identity, choice: 'reconnect' as const } };
}
test('exact source reconnection preserves tuple, individual records and immutable source; keep and current no-op write nothing', () => {
  const f = fixture(), before = JSON.stringify(f.data);
  assert(JSON.stringify(programOccurrenceSourceFacts(f.recovery.stored)).includes('07:00')); assert(JSON.stringify(programOccurrenceSourceFacts(f.recovery.current!.identity)).includes('10:30'));
  const kept = reconnectProgramOccurrenceSource(f.data, { ...f.request, choice: 'keep' }); assert(kept.ok && !kept.changed); assert.equal(kept.data, f.data);
  const result = reconnectProgramOccurrenceSource(f.data, f.request); assert(result.ok && result.changed); if (!result.ok) return;
  const entry = result.data.spaces[f.input.actorId].recurrenceExecution!.entries[f.recovery.key];
  assert.deepEqual({ ...entry, sourceRevisionToken: f.recovery.stored.sourceRevisionToken }, f.recovery.stored);
  assert.equal(result.data.spaces[f.input.actorId].legacySnapshot!.raw, f.data.spaces[f.input.actorId].legacySnapshot!.raw); assert.deepEqual(result.data.public, f.data.public); assert.equal(JSON.stringify(f.data), before);
  assert.deepEqual(readProgramOccurrenceRecovery(result.data, f.input), []);
  const noop = reconnectProgramOccurrenceSource(result.data, { ...f.request, expected: entry }); assert(noop.ok && !noop.changed); assert.equal(noop.data, result.data);
  const reread = readProgramExecutionOccurrences(result.data, f.input); assert(reread.ok); if (reread.ok) { assert.equal(reread.rows[0].executionDate, '2027-01-01'); assert.equal(reread.rows[0].completion, 'completed'); assert.equal(reread.rows[0].participation, 'excluded'); }
});
test('changed rule/series, competing source/record, actor, forged tuple and stale approval fail closed', () => {
  const f = fixture();
  const changedRule = programClone(f.data); changedRule.spaces[f.input.actorId].legacySnapshot = source('10:30', '61회').spaces[f.input.actorId].legacySnapshot;
  const row = readProgramOccurrenceRecovery(changedRule, f.input)[0]; assert(row && !row.canReconnect); assert.deepEqual(row.stored, f.recovery.stored);
  const peer = programClone(f.data); peer.spaces[f.input.actorId].recurrenceExecution!.entries[f.recovery.key].participation = 'held';
  const newerSource = programClone(f.data); newerSource.spaces[f.input.actorId].legacySnapshot = source('11:00').spaces[f.input.actorId].legacySnapshot;
  for (const [data, request] of [[changedRule, f.request], [peer, f.request], [newerSource, f.request], [f.data, { ...f.request, actorId: 'creator-minji' }],
    [f.data, { ...f.request, currentIdentity: { ...f.request.currentIdentity, itemId: 'forged' } }]] as const) {
    const result = reconnectProgramOccurrenceSource(data, request); assert.equal(result.ok, false); assert.equal(result.data, data);
  }
});
test('real controller/store canonical roundtrip, one Undo/Redo and quota/keep failure preserve private old record', async () => {
  const f = fixture(), initialRaw = JSON.stringify(createProgramEnvelope(f.data)), values = new Map([[PROGRAM_STATE_KEY, initialRaw], ['flow:original', 'unchanged bytes']]), writes: string[] = []; let fail = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (fail) throw Error('quota'); writes.push(key); values.set(key, value); }, removeItem: () => { throw Error('unexpected remove'); } };
  const options = { storage, initialData: f.data, exclusive: async <T>(work: () => T | Promise<T>) => work() }, controller = createProgramController(options); assert(controller.ok);
  assert((await controller.mutate('keep', data => reconnectProgramOccurrenceSource(data, { ...f.request, choice: 'keep' }), { actorId: f.input.actorId })).ok); assert.equal(writes.length, 0);
  fail = true; assert.equal((await controller.mutate('quota', data => reconnectProgramOccurrenceSource(data, f.request), { actorId: f.input.actorId })).ok, false); assert.equal(values.get(PROGRAM_STATE_KEY), initialRaw); assert.equal(writes.length, 0);
  fail = false; assert((await controller.mutate('reconnect', data => reconnectProgramOccurrenceSource(data, f.request), { actorId: f.input.actorId })).ok); assert.equal(writes.length, 1);
  const reopened = createProgramController(options); assert(reopened.ok); assert.equal(readProgramOccurrenceRecovery(reopened.snapshot().envelope.data, f.input).length, 0);
  assert((await controller.undo(f.input.actorId)).ok); assert(programSame(readProgramOccurrenceRecovery(controller.snapshot().envelope.data, f.input)[0].stored, f.recovery.stored));
  assert((await controller.redo(f.input.actorId)).ok); assert.equal(readProgramOccurrenceRecovery(controller.snapshot().envelope.data, f.input).length, 0);
  assert.equal(values.get('flow:original'), 'unchanged bytes'); assert(writes.every(key => key === PROGRAM_STATE_KEY));
});
