import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, programResult } from './contract';
import { createProgramController } from './controller';
import { createProgramData, createProgramEnvelope, validateProgramEnvelope } from './program-data';
import { loadProgramStore } from './program-store';

function fixture() {
  const data = createProgramData(), initial = JSON.stringify(createProgramEnvelope(data));
  const values = new Map([[PROGRAM_STATE_KEY, initial], ['flow:operating', '  unchanged\r\n한글  ']]);
  let reads = 0, denyRead = false; const writes: string[] = [];
  const storage = {
    getItem(key: string) { assert.equal(key, PROGRAM_STATE_KEY); reads++; if (denyRead) throw Error('read denied'); return values.get(key) ?? null; },
    setItem(key: string, value: string) { assert.equal(key, PROGRAM_STATE_KEY); writes.push(key); values.set(key, value); },
    removeItem(key: string) { assert.equal(key, PROGRAM_STATE_KEY); writes.push(key); values.delete(key); },
  };
  const controller = createProgramController({ initialData: data, storage, exclusive: async work => work() });
  assert(controller.ok);
  return { data, initial, values, storage, writes, controller, reads: () => reads, deny: (value: boolean) => { denyRead = value; } };
}

test('DR01 unchanged exact disk bytes are read once without parsing the retained history again', async () => {
  const f = fixture(), beforeReads = f.reads(), originalParse = JSON.parse; let parses = 0;
  // Deterministic work-count assertion, not a machine-specific timing threshold.
  JSON.parse = ((...args: Parameters<typeof JSON.parse>) => { parses++; return originalParse(...args); }) as typeof JSON.parse;
  let result;
  try { result = await f.controller.refresh(); } finally { JSON.parse = originalParse; }
  assert.deepEqual(result, { ok: true, result: 'local-user', changed: false });
  assert.equal(f.reads() - beforeReads, 1); assert.equal(parses, 0);
  assert.equal(f.writes.length, 0); assert.equal(f.values.get(PROGRAM_STATE_KEY), f.initial);
});

test('DR02 same revision with changed bytes is fully adopted for review before old intent can write', async () => {
  const f = fixture(), foreign = JSON.parse(f.initial); foreign.data.actors[0].name = '다른 탭';
  f.values.set(PROGRAM_STATE_KEY, JSON.stringify(foreign)); let built = 0;
  assert.deepEqual(await f.controller.mutate('old intent', data => { built++; return programResult(data, data, 'same'); }, { actorId: 'local-user' }), { ok: false, reason: 'conflict' });
  assert.equal(built, 0); assert.equal(f.writes.length, 0); assert.equal(f.controller.snapshot().envelope.data.actors[0].name, '다른 탭');
  const forged = f.controller.snapshot(); forged.envelope.data.actors[0].name = 'caller mutation';
  assert((await f.controller.refresh()).ok); assert.equal(f.controller.snapshot().envelope.data.actors[0].name, '다른 탭');
});

test('DR03 changed corrupt/domain-invalid or removed bytes never reuse the old validated snapshot', async () => {
  for (const raw of ['{', JSON.stringify({ ...createProgramEnvelope(), data: null }), null]) {
    const f = fixture(); if (raw === null) f.values.delete(PROGRAM_STATE_KEY); else f.values.set(PROGRAM_STATE_KEY, raw);
    assert.deepEqual(await f.controller.refresh(), { ok: false, reason: raw === null ? 'recovery-required' : 'invalid' });
    assert.equal(f.controller.snapshot().raw, f.initial); assert.equal(f.writes.length, 0);
  }
});

test('DR04 unavailable disk read still quarantines later writes even when exact old bytes return', async () => {
  const f = fixture(); f.deny(true);
  assert.deepEqual(await f.controller.refresh(), { ok: false, reason: 'storage-unavailable' });
  f.deny(false);
  const result = await f.controller.mutate('new name', data => programResult(data, { ...data, actors: data.actors.map((actor, index) => index ? actor : { ...actor, name: '새 이름' }) }, 'name'), { actorId: 'local-user', history: false });
  assert.deepEqual(result, { ok: false, reason: 'recovery-required' });
  assert.equal(f.writes.length, 0); assert.equal(f.values.get(PROGRAM_STATE_KEY), f.initial);
});

test('DR05 standalone store loads still invoke a changing validator on every read', () => {
  const f = fixture(); let permitted = true, calls = 0;
  const validate = (value: unknown) => { calls++; return permitted && validateProgramEnvelope(value); };
  assert.equal(loadProgramStore(f.storage, validate).kind, 'ready'); permitted = false;
  assert.equal(loadProgramStore(f.storage, validate).kind, 'corrupt'); assert.equal(calls, 2); assert.equal(f.writes.length, 0);
});
