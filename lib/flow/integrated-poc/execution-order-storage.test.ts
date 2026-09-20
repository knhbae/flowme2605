import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, programClone } from './contract';
import { createProgramEnvelope, validateProgramEnvelope } from './program-data';
import { commitProgramEnvelope, loadProgramStore, makeProgramEnvelope, planProgramUndo, type ProgramStorage } from './program-store';

const task = JSON.stringify(['text-task', 'doc', 'task']);
const occurrence = JSON.stringify(['occurrence', 'workspace', 'copy', 'flow', 'item', 'series', 'occurrence']);
class Storage implements ProgramStorage {
  values = new Map<string, string>([['flow:protected-plan', 'original bytes']]);
  writes: string[] = []; fail = false;
  constructor(raw: string) { this.values.set(PROGRAM_STATE_KEY, raw); }
  getItem(key: string) { assert.equal(key, PROGRAM_STATE_KEY); return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { assert.equal(key, PROGRAM_STATE_KEY); this.writes.push(key); if (this.fail) throw Error('quota'); this.values.set(key, value); }
  removeItem(key: string) { assert.equal(key, PROGRAM_STATE_KEY); this.writes.push(key); this.values.delete(key); }
}

test('mixed order extension is optional; old envelopes load without mutation or migration', () => {
  const before = createProgramEnvelope();
  assert.equal(Object.hasOwn(before.data.spaces[before.data.activeActorId], 'executionTimelineOrders'), false);
  const raw = JSON.stringify(before), storage = new Storage(raw);
  assert.equal(loadProgramStore(storage, validateProgramEnvelope).kind, 'ready');
  assert.equal(storage.values.get(PROGRAM_STATE_KEY), raw); assert.equal(storage.writes.length, 0);
});

test('mixed typed order persists once, reopens and Undo restores the old optional shape', () => {
  const before = createProgramEnvelope(), actorId = before.data.activeActorId, data = programClone(before.data);
  data.spaces[actorId].executionTimelineOrders = { '2026-09-12': [task, occurrence], undated: [occurrence] };
  const next = makeProgramEnvelope(before, data, { actorId, historyLabel: '기간 순서 이동' }), raw = JSON.stringify(before), storage = new Storage(raw);
  assert.equal(validateProgramEnvelope(next), true);
  const saved = commitProgramEnvelope(storage, { expectedRaw: raw, next, validate: validateProgramEnvelope });
  assert.equal(saved.ok, true); if (!saved.ok) return;
  assert.equal(storage.writes.length, 1);
  const reloaded = loadProgramStore(storage, validateProgramEnvelope); assert.equal(reloaded.kind, 'ready'); if (reloaded.kind !== 'ready') return;
  assert.deepEqual(reloaded.envelope.data.spaces[actorId].executionTimelineOrders, data.spaces[actorId].executionTimelineOrders);
  const undone = planProgramUndo(reloaded.envelope, actorId); assert.equal(validateProgramEnvelope(undone), true);
  assert.equal(Object.hasOwn(undone.data.spaces[actorId], 'executionTimelineOrders'), false);
  assert.deepEqual(undone.data.public, before.data.public); assert.equal(storage.values.get('flow:protected-plan'), 'original bytes');
});

test('malformed mixed order payloads fail closed with exact raw bytes and zero writes', () => {
  for (const order of [null, [], {'2026-02-30': [task]}, { undated: [task, task] }, { undated: ['task'] }, { undated: [JSON.stringify(['occurrence', 'only-one-id'])] }, { undated: [JSON.stringify(['text-task', '', 'task'])] }]) {
    const envelope = createProgramEnvelope(); Object.assign(envelope.data.spaces[envelope.data.activeActorId], { executionTimelineOrders: order });
    const raw = JSON.stringify(envelope), storage = new Storage(raw);
    assert.equal(loadProgramStore(storage, validateProgramEnvelope).kind, 'corrupt');
    assert.equal(storage.values.get(PROGRAM_STATE_KEY), raw); assert.equal(storage.writes.length, 0);
  }
});

test('mixed order no-op and stale CAS do not write; quota preserves the last successful state', () => {
  const before = createProgramEnvelope(), actorId = before.data.activeActorId, raw = JSON.stringify(before), storage = new Storage(raw);
  const data = programClone(before.data); data.spaces[actorId].executionTimelineOrders = { undated: [occurrence, task] };
  const next = makeProgramEnvelope(before, data, { actorId, historyLabel: '혼합 순서' });
  assert.deepEqual(commitProgramEnvelope(storage, { expectedRaw: raw, next: before, validate: validateProgramEnvelope }), { ok: true, changed: false, raw, envelope: before });
  assert.equal(commitProgramEnvelope(storage, { expectedRaw: JSON.stringify(before, null, 2), next, validate: validateProgramEnvelope }).ok, false);
  assert.equal(storage.writes.length, 0);
  storage.fail = true;
  assert.equal(commitProgramEnvelope(storage, { expectedRaw: raw, next, validate: validateProgramEnvelope }).ok, false);
  assert.equal(storage.values.get(PROGRAM_STATE_KEY), raw); assert.equal(storage.values.get('flow:protected-plan'), 'original bytes');
});
