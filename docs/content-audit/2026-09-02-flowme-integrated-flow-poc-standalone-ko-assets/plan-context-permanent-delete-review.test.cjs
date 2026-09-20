'use strict';
// Actual S coordinator with deterministic memory storage; not browser/device QA.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { M, C, NOW, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const P = require('./personal-plan-context.js');
const S = require('./workspace-storage.js');
const PRIVATE = 'REVIEW_PLAN_TARGET_PRIVATE';
const OP = 'flow:delete-review:operating-sentinel';
const PREFIX = 'flow:poc:personal-workspace:v1:';
const clone = value => JSON.parse(JSON.stringify(value));
const stores = [];
const snapshot = storage => Object.fromEntries(storage.values);
function memory(initial, label) {
  const values = new Map([[OP, ' 운영 원본\r\n😀\t '], ...Object.entries(initial)]);
  const calls = []; const hooks = {};
  const store = {
    label, values, calls, hooks,
    protected: Object.fromEntries([OP, S.CREATOR_KEY, S.DRAFT_KEY].map(key => [key, values.get(key)])),
    getItem(key) { calls.push(['getItem', key]); return values.has(key) ? values.get(key) : null; },
    setItem(key, raw) { calls.push(['setItem', key]); assert.ok(key.startsWith(PREFIX)); values.set(key, String(raw)); if (hooks.after) hooks.after(); },
    removeItem(key) { calls.push(['removeItem', key]); assert.ok(key.startsWith(PREFIX)); values.delete(key); if (hooks.after) hooks.after(); },
    clear() { calls.push(['clear', null]); throw new Error('forbidden-clear'); },
  };
  stores.push(store); return store;
}
function boundary(storage) {
  for (const [key, raw] of Object.entries(storage.protected)) assert.equal(storage.values.get(key), raw, key);
  const writes = storage.calls.filter(call => call[0] !== 'getItem');
  assert.equal(writes.some(call => call[0] === 'clear' || ![S.LEGACY_KEY, S.STORAGE_KEY, S.SOURCE_KEY, S.RECOVERY_KEY].includes(call[1])), false);
}
function overlay(checkpoint, flowId, value) {
  const flow = checkpoint.state.flows.find(item => item.id === flowId);
  const opened = C.inspectPersonalPlanContext(checkpoint, flow.ref); assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft); draft.title = { mode: 'override', value };
  draft.items[Object.keys(draft.items)[0]].memo = { mode: 'override', value: value + '\r\n  ' };
  const result = C.transitionCheckpoint(checkpoint, { type: 'commit-personal-plan-context', context: opened.context, draft, now: NOW });
  assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true); return result.checkpoint;
}
function fixture(label, seed = false) {
  let checkpoint; let flowId; let sourceRaw = null;
  if (seed) { checkpoint = C.fromLegacy(null).checkpoint; flowId = 'moving'; }
  else {
    const source = sourceUpdateFixture(); flowId = source.flow.id;
    assert.ok(source.store.effectiveVersions[source.flow.ref]);
    assert.equal(source.store.undo.flowRef, source.flow.ref);
    sourceRaw = JSON.stringify(source.store);
    checkpoint = C.fromLegacy(' \r\n' + JSON.stringify({ version: 1, state: source.state, undo: clone(source.state) }, null, 2) + '\r\n ').checkpoint;
  }
  checkpoint = overlay(checkpoint, 'memo', 'REVIEW_NEIGHBOR_PLAN');
  checkpoint = overlay(checkpoint, flowId, PRIVATE);
  const trashed = C.transitionCheckpoint(checkpoint, { type: 'move-to-trash', kind: 'flow', id: flowId, now: NOW });
  assert.equal(trashed.ok, true, trashed.reason); checkpoint = trashed.checkpoint;
  const flow = checkpoint.state.flows.find(item => item.id === flowId);
  const neighborRef = checkpoint.state.flows.find(item => item.id === 'memo').ref;
  const neighbor = clone(checkpoint.state[P.METADATA_KEY].entries[neighborRef]);
  const initial = { [S.STORAGE_KEY]: JSON.stringify(checkpoint), [S.CREATOR_KEY]: 'creator\r\n독립 원본', [S.DRAFT_KEY]: 'working draft\r\n독립 원본' };
  if (checkpoint.legacyBaseRaw !== null) initial[S.LEGACY_KEY] = checkpoint.legacyBaseRaw;
  if (sourceRaw !== null) initial[S.SOURCE_KEY] = sourceRaw;
  const storage = memory(initial, label); const before = snapshot(storage);
  const packet = S.loadWorkspace(storage); assert.equal(packet.ok, true, packet.reason);
  const target = { kind: 'flow', id: flow.id, ref: flow.ref, savedCopyId: flow.savedCopyId, sourceFlowId: flow.sourceFlowId };
  const planned = S.preparePermanentDelete(packet, { target, confirmed: true, expectedRevision: checkpoint.state.revision, sourceCandidateRaw: sourceRaw, now: NOW }, label);
  assert.equal(planned.ok, true, planned.reason);
  assert.equal(storage.calls.filter(call => call[0] !== 'getItem').length, 0);
  return { storage, before, planned, target, neighborRef, neighbor, seed };
}
function deleted(fixture, storage) {
  for (const key of [S.LEGACY_KEY, S.STORAGE_KEY, S.SOURCE_KEY, S.RECOVERY_KEY]) assert.equal((storage.values.get(key) || '').includes(PRIVATE), false, key);
  const packet = S.loadWorkspace(storage); assert.equal(packet.ok, true, packet.reason);
  assert.equal(packet.checkpoint.undo, null);
  assert.equal(packet.checkpoint.state.flows.some(flow => flow.ref === fixture.target.ref), false);
  assert.deepEqual(packet.checkpoint.state[P.METADATA_KEY].entries[fixture.neighborRef], fixture.neighbor);
  assert.equal(Object.hasOwn(packet.checkpoint.state[P.METADATA_KEY].entries, fixture.target.ref), false);
  const sourceRaw = storage.values.get(S.SOURCE_KEY);
  if (fixture.seed) { assert.equal(sourceRaw, undefined); assert.notEqual(packet.checkpoint.legacyBaseRaw, null); }
  else {
    const source = JSON.parse(sourceRaw);
    assert.equal(Object.values(source.envelopes).some(value => value.target.flowRef === fixture.target.ref), false);
    assert.equal(Object.hasOwn(source.effectiveVersions, fixture.target.ref), false);
    assert.equal(Boolean(source.undo && source.undo.flowRef === fixture.target.ref), false);
  }
  boundary(storage); return packet.checkpoint;
}

test('B1DR01 applied source effective-version and source Undo are scrubbed with the exact Plan owner only after journal cleanup', t => {
  const f = fixture('b1dr-effective-complete');
  const committed = S.commitPrepared(f.storage, f.planned.prepared);
  assert.equal(committed.status, 'committed', committed.reason); assert.equal(committed.deletionComplete, false);
  assert.equal(f.storage.values.get(S.RECOVERY_KEY).includes(PRIVATE), true);
  const cleanup = S.cleanupCommitted(f.storage, committed.receipt);
  assert.equal(cleanup.deletionComplete, true, cleanup.reason);
  deleted(f, f.storage);
  for (const key of [S.LEGACY_KEY, S.STORAGE_KEY, S.SOURCE_KEY]) assert.equal(f.storage.calls.filter(call => call[0] === 'setItem' && call[1] === key).length, 1, key);
  t.diagnostic('one target, one legacy, one source write; prepared/confirmed/cleanup are separate journal calls');
});

test('B1DR02 every interrupted applied-source+Plan frame restores prepared before or preserves confirmed deletion without target replay', t => {
  const f = fixture('b1dr-effective-interrupted'); const frames = [];
  f.storage.hooks.after = () => frames.push(snapshot(f.storage));
  const committed = S.commitPrepared(f.storage, f.planned.prepared); assert.equal(committed.ok, true, committed.reason);
  assert.equal(frames.length, 5); // prepare + three exact targets + confirm
  let prepared = 0; let confirmed = 0;
  for (const [index, frame] of frames.entries()) {
    const storage = memory(frame, 'b1dr-effective-frame-' + index);
    const pending = S.loadActionRecovery(storage); assert.equal(pending.ok, true, pending.reason);
    assert.equal(storage.calls.filter(call => call[0] !== 'getItem').length, 0);
    const restored = S.recoverAction(storage, { expectedJournalRaw: pending.journalRaw }); assert.equal(restored.ok, true, restored.reason);
    if (pending.status === 'prepared') { prepared += 1; assert.deepEqual(snapshot(storage), f.before); boundary(storage); }
    else { confirmed += 1; assert.equal(pending.status, 'confirmed'); assert.equal(restored.deletionComplete, true); deleted(f, storage); assert.equal(storage.calls.some(call => call[0] !== 'getItem' && call[1] !== S.RECOVERY_KEY), false); }
  }
  assert.equal(prepared, 4); assert.equal(confirmed, 1);
  delete f.storage.hooks.after;
  assert.equal(S.cleanupCommitted(f.storage, committed.receipt).deletionComplete, true);
  deleted(f, f.storage);
  t.diagnostic('five intermediate frames: four prepared exact rollbacks, one confirmed journal-only cleanup');
});

test('B1DR03 metadata-bearing seed-null deletion rebinds only on explicit success and interrupted rollback restores true key absence', t => {
  const f = fixture('b1dr-seed-null', true); const frames = [];
  assert.equal(Object.hasOwn(f.before, S.LEGACY_KEY), false);
  f.storage.hooks.after = () => frames.push(snapshot(f.storage));
  const committed = S.commitPrepared(f.storage, f.planned.prepared); assert.equal(committed.ok, true, committed.reason);
  assert.equal(committed.deletionComplete, false); assert.equal(frames.length, 4); // prepare + legacy/state + confirm
  let prepared = 0; let confirmed = 0;
  for (const [index, frame] of frames.entries()) {
    const storage = memory(frame, 'b1dr-seed-frame-' + index);
    const pending = S.loadActionRecovery(storage); assert.equal(pending.ok, true, pending.reason);
    assert.equal(storage.calls.filter(call => call[0] !== 'getItem').length, 0);
    const restored = S.recoverAction(storage, { expectedJournalRaw: pending.journalRaw }); assert.equal(restored.ok, true, restored.reason);
    if (pending.status === 'prepared') { prepared += 1; assert.deepEqual(snapshot(storage), f.before); assert.equal(storage.values.has(S.LEGACY_KEY), false); boundary(storage); }
    else { confirmed += 1; assert.equal(restored.deletionComplete, true); deleted(f, storage); }
  }
  assert.equal(prepared, 3); assert.equal(confirmed, 1);
  delete f.storage.hooks.after;
  assert.equal(S.cleanupCommitted(f.storage, committed.receipt).deletionComplete, true);
  const checkpoint = deleted(f, f.storage);
  assert.equal(f.storage.calls.some(call => call[0] !== 'getItem' && call[1] === S.SOURCE_KEY), false);
  const changed = C.transitionCheckpoint(checkpoint, { type: 'complete', id: 'call', done: true, completedAt: NOW, now: NOW }); assert.equal(changed.ok, true, changed.reason);
  const undone = C.undoCheckpoint(changed.checkpoint); assert.equal(undone.ok, true, undone.reason);
  assert.equal(JSON.stringify(undone).includes(PRIVATE), false);
  assert.deepEqual(M.seedState().flows.some(flow => flow.id === 'moving'), true);
  t.diagnostic('seed materialization is explicit deletion only; source key stays absent; later pure Undo cannot revive target');
});

after(() => {
  stores.forEach(boundary);
  const calls = stores.flatMap(store => store.calls);
  const mutations = calls.filter(call => call[0] !== 'getItem');
  const sourceHashes = Object.fromEntries(['workspace-checkpoint.js', 'personal-plan-context.js', 'workspace-permanent-delete.js', 'workspace-storage.js'].map(file => [file, createHash('sha256').update(fs.readFileSync(require.resolve('./' + file))).digest('hex')]));
  console.log('B1DR_BOUNDARY ' + JSON.stringify({ contexts: stores.length, registeredTests: 3, reads: calls.filter(call => call[0] === 'getItem').length,
    setItem: mutations.filter(call => call[0] === 'setItem').length, removeItem: mutations.filter(call => call[0] === 'removeItem').length,
    targetMutationCalls: mutations.filter(call => call[1] === S.STORAGE_KEY).length, journalMutationCalls: mutations.filter(call => call[1] === S.RECOVERY_KEY).length,
    outsidePrefix: mutations.filter(call => call[0] !== 'clear' && !call[1].startsWith(PREFIX)).length, clear: mutations.filter(call => call[0] === 'clear').length,
    protectedKeyComparisons: stores.length * 3, protectedMismatches: 0, execution: 'Node memory store; no browser or real device', sourceHashes }));
});
