'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const S = require('./workspace-storage.js');
const clone = value => JSON.parse(JSON.stringify(value));
const operatingKey = 'flow:operating:storage-test';
const operatingRaw = '  원본\r\n☃\t\"byte-for-byte\"  ';
const legacyState = () => ({ version: 1, revision: 0, updatedAt: null, folders: [], flows: [],
  tasks: [{ id: 'a', title: '할 일', flowId: null, folderId: null, date: M.TODAY, sourceDate: null,
    time: '', memo: '', done: false, completedAt: null }], orders: {}, occurrenceOverrides: {}, trashEntries: [] });
const oldRaw = () => ' \n' + JSON.stringify({ version: 1, state: legacyState(), undo: null }, null, 2) + '\n';
const snapshot = store => Object.fromEntries(store.map);
const writes = store => store.calls.filter(call => call[0] !== 'get');
function storage(initial = {}, hooks = {}) {
  const map = new Map([[operatingKey, operatingRaw], ...Object.entries(initial)]);
  const calls = [];
  const store = {
    map, calls, hooks,
    getItem(key) {
      calls.push(['get', key]);
      const raw = map.has(key) ? map.get(key) : null;
      return hooks.get ? hooks.get({ key, raw, store }) : raw;
    },
    setItem(key, raw) {
      calls.push(['set', key, raw]);
      if (hooks.before) hooks.before({ key, raw, method: 'set', store });
      map.set(key, String(raw));
      if (hooks.after) hooks.after({ key, raw, method: 'set', store });
    },
    removeItem(key) {
      calls.push(['remove', key]);
      if (hooks.before) hooks.before({ key, raw: null, method: 'remove', store });
      map.delete(key);
      if (hooks.after) hooks.after({ key, raw: null, method: 'remove', store });
    },
    clear() { calls.push(['clear']); throw new Error('forbidden-clear'); }
  };
  return store;
}
function boundary(store, allowLegacy = false) {
  assert.equal(store.map.get(operatingKey), operatingRaw);
  assert.equal(writes(store).some(call => call[0] === 'clear' || !call[1].startsWith('flow:poc:personal-workspace:v1:')), false);
  if (!allowLegacy) assert.equal(writes(store).some(call => call[1] === S.LEGACY_KEY), false);
}
function fixture(operation = 'workspace', seed = false) {
  const initial = seed ? {} : { [S.LEGACY_KEY]: oldRaw() };
  if (operation === 'authoring-handoff' || operation === 'reset') initial[S.DRAFT_KEY] = ' exact draft\r\n';
  if (operation === 'reset') {
    initial[S.CREATOR_KEY] = ' creator bytes ';
    initial[S.SOURCE_KEY] = ' source candidate bytes ';
  }
  const store = storage(initial);
  let packet = S.loadWorkspace(store);
  assert.equal(packet.ok, true, packet.reason);
  if (operation === 'undo' || operation === 'reset') {
    const changed = C.transitionCheckpoint(packet.checkpoint, { type: 'add-quick', title: '먼저 저장', folderId: null, date: null });
    assert.equal(changed.changed, true, changed.reason);
    store.map.set(S.STORAGE_KEY, JSON.stringify(changed.checkpoint));
    packet = S.loadWorkspace(store);
  }
  const candidate = operation === 'undo' ? C.undoCheckpoint(packet.checkpoint)
    : C.transitionCheckpoint(packet.checkpoint, { type: 'add-quick', title: '다음 후보', folderId: null, date: null });
  assert.equal(candidate.changed, true, candidate.reason);
  const preparation = operation === 'reset' ? S.prepareReset(store, packet, 'operation-reset')
    : S.prepareWrite(packet, candidate.checkpoint, { operation, operationId: 'operation-' + operation, expectedDraftRaw: initial[S.DRAFT_KEY] });
  assert.equal(preparation.ok, true, preparation.reason);
  return { store, packet, candidate: candidate.checkpoint, prepared: preparation.prepared, before: snapshot(store) };
}

test('C2 fixed lazy UMD module performs no read/write at load and exposes no arbitrary-key writer', () => {
  const source = fs.readFileSync(require.resolve('./workspace-storage.js'), 'utf8');
  const sandbox = vm.createContext({ module: { exports: {} }, require() { throw new Error('eager'); } });
  vm.runInContext(source, sandbox);
  assert.deepEqual(Object.keys(sandbox.module.exports), Object.keys(S));
  assert.deepEqual(S.RESET_KEYS, [C.STORAGE_KEY, M.STORAGE_KEY, M.DRAFT_STORAGE_KEY, M.CREATOR_DRAFT_STORAGE_KEY, M.SOURCE_CANDIDATE_STORAGE_KEY]);
  assert.equal(S.RECOVERY_KEY.endsWith(':v2'), true);
});

for (const hasOld of [false, true]) test('C2 read-only ' + (hasOld ? 'legacy' : 'seed') + ' projection and first no-op create no keys', () => {
  const store = storage(hasOld ? { [S.LEGACY_KEY]: oldRaw() } : {});
  const before = snapshot(store);
  const packet = S.loadWorkspace(store);
  assert.equal(packet.ok, true);
  assert.equal(packet.origin, hasOld ? 'legacy' : 'seed');
  const noOp = S.prepareWrite(packet, packet.checkpoint, { operation: 'workspace', operationId: 'noop' });
  assert.equal(noOp.changed, false);
  assert.deepEqual(snapshot(store), before);
  assert.equal(writes(store).length, 0);
});

for (const key of [S.STORAGE_KEY, S.LEGACY_KEY, S.RECOVERY_KEY, S.LEGACY_RECOVERY_KEY]) test('C2 specific read error locks without fallback: ' + key, () => {
  const store = storage({ [S.LEGACY_KEY]: oldRaw() }, { get(event) { if (event.key === key) throw new Error('read fault'); return event.raw; } });
  const packet = S.loadWorkspace(store);
  assert.equal(packet.ok, false);
  assert.equal(packet.reason, 'storage-unverified');
  assert.equal(packet.checkpoint, null);
  assert.equal(writes(store).length, 0);
});

for (const malformed of ['{broken', '{"version":999}', '{"contract":"unknown"}']) test('C2 existing invalid new payload never falls back: ' + malformed, () => {
  const store = storage({ [S.LEGACY_KEY]: oldRaw(), [S.STORAGE_KEY]: malformed });
  assert.equal(S.loadWorkspace(store).reason, 'checkpoint-invalid');
  assert.equal(writes(store).length, 0);
});

test('C2 byte-drift old base locks an otherwise valid checkpoint; exact whitespace matters', () => {
  const f = fixture('undo');
  f.store.map.set(S.LEGACY_KEY, f.packet.expectedLegacyRaw.trim());
  assert.equal(S.loadWorkspace(f.store).reason, 'legacy-drift');
  const result = S.commitPrepared(f.store, f.prepared);
  assert.equal(result.status, 'stale');
  assert.equal(writes(f.store).length, 0);
});

for (const combination of ['old', 'new', 'both', 'old-and-checkpoint']) test('C2 recovery precedes normal authority: ' + combination, () => {
  const store = storage({ [S.LEGACY_KEY]: oldRaw() });
  if (combination !== 'new') store.map.set(S.LEGACY_RECOVERY_KEY, 'old journal');
  if (combination === 'new' || combination === 'both') store.map.set(S.RECOVERY_KEY, 'new journal');
  if (combination === 'old-and-checkpoint') store.map.set(S.STORAGE_KEY, JSON.stringify(C.fromLegacy(oldRaw()).checkpoint));
  const packet = S.loadWorkspace(store);
  assert.equal(packet.ok, false);
  assert.equal(packet.reason, combination === 'both' || combination === 'old-and-checkpoint' ? 'multiple-authorities' : combination === 'old' ? 'legacy-recovery-required' : 'checkpoint-recovery-required');
  assert.equal(writes(store).length, 0);
});

for (const operation of ['workspace', 'undo', 'authoring-handoff', 'reset']) {
  test('C2 ' + operation + ' commits one checkpoint authority and cleanup is journal-only', () => {
    const f = fixture(operation);
    const result = S.commitPrepared(f.store, f.prepared);
    assert.equal(result.status, 'committed', result.reason);
    assert.equal(S.loadWorkspace(f.store).reason, 'checkpoint-recovery-required');
    const recovery = S.loadActionRecovery(f.store);
    assert.equal(recovery.status, 'confirmed');
    const callCount = writes(f.store).length;
    const cleanup = S.cleanupCommitted(f.store, result.receipt);
    assert.equal(cleanup.ok, true, cleanup.reason);
    assert.deepEqual(writes(f.store).slice(callCount).map(call => call.slice(0, 2)), [['remove', S.RECOVERY_KEY]]);
    const restored = S.loadWorkspace(f.store);
    assert.equal(restored.ok, true, restored.reason);
    assert.equal(restored.origin, operation === 'reset' ? 'seed' : 'checkpoint');
    if (operation !== 'reset') assert.equal(f.store.map.get(S.LEGACY_KEY), f.before[S.LEGACY_KEY]);
    if (operation === 'authoring-handoff' || operation === 'reset') assert.equal(f.store.map.has(S.DRAFT_KEY), false);
    if (operation === 'reset') for (const key of S.RESET_KEYS) assert.equal(f.store.map.has(key), false);
    boundary(f.store, operation === 'reset');
  });

  test('C2 ' + operation + ' replay and foreign initial target perform zero further mutations', () => {
    const f = fixture(operation);
    const result = S.commitPrepared(f.store, f.prepared);
    assert.equal(result.ok, true);
    const baseline = writes(f.store).length;
    assert.equal(S.commitPrepared(f.store, f.prepared).reason, 'invalid-or-replayed-preparation');
    assert.equal(writes(f.store).length, baseline);
    const stale = fixture(operation);
    stale.store.map.set(S.STORAGE_KEY, 'foreign target');
    assert.equal(S.commitPrepared(stale.store, stale.prepared).status, 'stale');
    assert.equal(writes(stale.store).length, 0);
  });

  test('C2 ' + operation + ' every recorded intermediate reload is gated and restores exactly', () => {
    const f = fixture(operation);
    const frames = [];
    f.store.hooks.after = () => frames.push(snapshot(f.store));
    const result = S.commitPrepared(f.store, f.prepared);
    assert.equal(result.ok, true);
    assert.equal(frames.length, f.prepared.journal.entries.filter(entry => entry.beforeRaw !== entry.afterRaw).length + 2);
    for (const frame of frames) {
      const fresh = storage(frame);
      const packet = S.loadWorkspace(fresh);
      assert.equal(packet.ok, false);
      assert.equal(writes(fresh).length, 0);
      const pending = S.loadActionRecovery(fresh);
      assert.equal(pending.ok, true, pending.reason);
      assert.equal(writes(fresh).length, 0);
      const recovered = S.recoverAction(fresh, { expectedJournalRaw: pending.journalRaw });
      assert.equal(recovered.ok, true, recovered.reason);
      const expected = pending.status === 'prepared' ? f.before : snapshot(f.store);
      const withoutJournal = { ...expected }; delete withoutJournal[S.RECOVERY_KEY];
      assert.deepEqual(snapshot(fresh), withoutJournal);
      assert.equal(S.loadWorkspace(fresh).ok, true);
      boundary(fresh, operation === 'reset');
    }
  });

  for (const phase of ['before', 'after']) test('C2 ' + operation + ' throw-' + phase + ' at every write stays recoverable without foreign writes', () => {
    const probe = fixture(operation);
    const count = probe.prepared.journal.entries.filter(entry => entry.beforeRaw !== entry.afterRaw).length + 2;
    for (let target = 1; target <= count; target += 1) {
      const f = fixture(operation);
      let counter = 0;
      f.store.hooks[phase] = () => { counter += 1; if (counter === target) throw new Error('injected write fault'); };
      const result = S.commitPrepared(f.store, f.prepared);
      delete f.store.hooks[phase];
      if (phase === 'after') assert.equal(result.status, 'committed', 'throw-after exact bytes should be verified');
      else assert.equal(['recovery-required', 'commit-uncertain'].includes(result.status), true, result.status);
      const current = f.store.map.get(S.RECOVERY_KEY) || null;
      const expectedJournalRaw = current || f.prepared.raw;
      const recovered = S.recoverAction(f.store, { expectedJournalRaw });
      assert.equal(recovered.ok, true, recovered.reason);
      assert.equal(S.loadWorkspace(f.store).ok, true);
      if (result.status !== 'committed') assert.deepEqual(snapshot(f.store), f.before);
      boundary(f.store, operation === 'reset');
    }
  });

  test('C2 ' + operation + ' readback loss after each write survives new-runtime recovery', () => {
    const probe = fixture(operation);
    const count = probe.prepared.journal.entries.filter(entry => entry.beforeRaw !== entry.afterRaw).length + 2;
    for (let target = 1; target <= count; target += 1) {
      const f = fixture(operation);
      let counter = 0; let crashed = false;
      f.store.hooks.after = () => { counter += 1; if (counter === target) crashed = true; };
      f.store.hooks.get = event => { if (crashed) throw new Error('runtime read loss'); return event.raw; };
      const outcome = S.commitPrepared(f.store, f.prepared);
      assert.equal(outcome.ok, false);
      const fresh = storage(snapshot(f.store));
      const pending = S.loadActionRecovery(fresh);
      assert.equal(pending.ok, true, pending.reason);
      const recovered = S.recoverAction(fresh, { expectedJournalRaw: pending.journalRaw });
      assert.equal(recovered.ok, true, recovered.reason);
      if (pending.status === 'prepared') assert.deepEqual(snapshot(fresh), f.before);
      else assert.equal(S.loadWorkspace(fresh).ok, true);
      boundary(fresh, operation === 'reset');
    }
  });
}

test('C2 strict action journal rejects unknown fields, mixed editor payload, foreign keys and reordered reset entries', () => {
  const f = fixture('reset');
  const variants = [];
  for (const change of [value => { value.extra = true; }, value => { value.entries[0].extra = true; },
    value => { value.operation = 'arbitrary'; }, value => { value.entries[0].key = operatingKey; },
    value => { value.entries.reverse(); }, value => { value.entries.push(clone(value.entries[0])); },
    value => { value.entries[1].beforeRaw = 'other'; }, value => { value.contract = 'editor'; },
    value => { value.entries[0].afterRaw = '{}'; }]) {
    const value = clone(f.prepared.journal); change(value); variants.push(JSON.stringify(value));
  }
  variants.push(JSON.stringify({ version: 1, targetKey: S.STORAGE_KEY, phase: 'prepared', kind: 'plan' }));
  for (const raw of variants) {
    assert.equal(S.decodeJournal(raw), null);
    const store = storage({ [S.RECOVERY_KEY]: raw });
    assert.equal(S.loadActionRecovery(store).ok, false);
    assert.equal(S.recoverAction(store, { expectedJournalRaw: raw }).ok, false);
    assert.equal(writes(store).length, 0);
  }
});

test('C2 prepared legacy drift preserves foreign old raw while explicit owned new target recovery stays locked', () => {
  const f = fixture();
  f.store.hooks.after = event => { if (event.key === S.STORAGE_KEY) f.store.map.set(S.LEGACY_KEY, 'foreign old raw'); };
  assert.equal(S.commitPrepared(f.store, f.prepared).status, 'recovery-required');
  delete f.store.hooks.after;
  const pending = S.loadActionRecovery(f.store);
  assert.equal(pending.status, 'prepared');
  assert.equal(pending.canResume, false);
  const recovered = S.recoverAction(f.store, { expectedJournalRaw: pending.journalRaw });
  assert.equal(recovered.ok, true);
  assert.equal(recovered.legacyStatus, 'drift');
  assert.equal(f.store.map.get(S.LEGACY_KEY), 'foreign old raw');
  assert.equal(S.loadWorkspace(f.store).ok, false);
  boundary(f.store);
});

test('C2 foreign target or old pending journal blocks recovery with no writes', () => {
  for (const foreignKey of [S.STORAGE_KEY, S.DRAFT_KEY, S.LEGACY_RECOVERY_KEY]) {
    const f = fixture('authoring-handoff');
    f.store.map.set(S.RECOVERY_KEY, f.prepared.raw);
    f.store.map.set(foreignKey, 'foreign');
    const callCount = writes(f.store).length;
    assert.equal(S.loadActionRecovery(f.store).ok, false);
    assert.equal(S.recoverAction(f.store, { expectedJournalRaw: f.prepared.raw }).ok, false);
    assert.equal(writes(f.store).length, callCount);
    assert.equal(f.store.map.get(foreignKey), 'foreign');
  }
});

test('C2 partial rollback error stays journal-gated and a later explicit retry restores both handoff keys', () => {
  const f = fixture('authoring-handoff');
  for (const entry of f.prepared.journal.entries) { if (entry.afterRaw === null) f.store.map.delete(entry.key); else f.store.map.set(entry.key, entry.afterRaw); }
  f.store.map.set(S.RECOVERY_KEY, f.prepared.raw);
  f.store.hooks.before = event => { if (event.key === S.STORAGE_KEY) throw new Error('rollback fault'); };
  assert.equal(S.recoverAction(f.store, { expectedJournalRaw: f.prepared.raw }).reason, 'restore-unverified');
  assert.equal(S.loadWorkspace(f.store).ok, false);
  delete f.store.hooks.before;
  assert.equal(S.recoverAction(f.store, { expectedJournalRaw: f.prepared.raw }).ok, true);
  assert.deepEqual(snapshot(f.store), f.before);
});

test('C2 confirmed cleanup failure never rolls back a commit; throw-after retry is idempotent', () => {
  const f = fixture('authoring-handoff');
  const result = S.commitPrepared(f.store, f.prepared);
  const target = f.store.map.get(S.STORAGE_KEY);
  f.store.hooks.before = event => { if (event.method === 'remove') throw new Error('cleanup fault'); };
  assert.equal(S.cleanupCommitted(f.store, result.receipt).ok, false);
  assert.equal(f.store.map.get(S.STORAGE_KEY), target);
  assert.equal(f.store.map.has(S.DRAFT_KEY), false);
  delete f.store.hooks.before;
  f.store.hooks.after = event => { if (event.method === 'remove') throw new Error('cleanup throw-after'); };
  assert.equal(S.cleanupCommitted(f.store, result.receipt).ok, true);
  assert.equal(f.store.map.get(S.STORAGE_KEY), target);
  assert.equal(S.recoverAction(f.store, { expectedJournalRaw: result.journalRaw }).ok, true);
  boundary(f.store);
});

test('C2 reset refuses journal/read-error and its all-null no-op removes nothing', () => {
  const empty = storage();
  assert.equal(S.prepareReset(empty, S.loadWorkspace(empty), 'empty').changed, false);
  assert.equal(writes(empty).length, 0);
  const f = fixture('reset');
  f.store.map.set(S.RECOVERY_KEY, 'unknown');
  assert.equal(S.prepareReset(f.store, f.packet, 'reset').ok, false);
  assert.equal(writes(f.store).length, 0);
  f.store.map.delete(S.RECOVERY_KEY);
  f.store.hooks.get = event => { if (event.key === S.CREATOR_KEY) throw new Error('unreadable creator'); return event.raw; };
  assert.equal(S.prepareReset(f.store, f.packet, 'reset').ok, false);
  assert.equal(writes(f.store).length, 0);
});

test('C2 object-key reordering is a semantic no-op, including the first checkpoint', () => {
  const f = fixture();
  const reordered = Object.fromEntries(Object.entries(f.packet.checkpoint).reverse());
  reordered.state = Object.fromEntries(Object.entries(reordered.state).reverse());
  assert.equal(C.validateCheckpoint(reordered).ok, true);
  const prepared = S.prepareWrite(f.packet, reordered, { operation: 'workspace', operationId: 'same-json-data' });
  assert.equal(prepared.changed, false);
  assert.equal(prepared.status, 'no-op');
  assert.equal(writes(f.store).length, 0);
});

test('C2 old journal appearing after recovery preflight prevents confirmed cleanup', () => {
  const f = fixture();
  const committed = S.commitPrepared(f.store, f.prepared);
  const before = writes(f.store).length;
  f.store.hooks.get = event => {
    if (event.key === S.RECOVERY_KEY) f.store.map.set(S.LEGACY_RECOVERY_KEY, 'foreign pending recovery');
    return event.raw;
  };
  const cleanup = S.cleanupCommitted(f.store, committed.receipt);
  assert.equal(cleanup.ok, false);
  assert.equal(writes(f.store).length, before);
  assert.equal(f.store.map.get(S.RECOVERY_KEY), committed.journalRaw);
});

test('C2 exact confirmed commit followed by old drift retains committed fact and blocks resumption', () => {
  const f = fixture();
  f.store.hooks.after = event => {
    if (event.key === S.RECOVERY_KEY && JSON.parse(event.raw).phase === 'confirmed') f.store.map.set(S.LEGACY_KEY, 'late foreign legacy');
  };
  const result = S.commitPrepared(f.store, f.prepared);
  assert.equal(result.status, 'committed');
  assert.equal(result.canResume, false);
  assert.equal(result.legacyStatus, 'drift');
  assert.equal(S.loadWorkspace(f.store).ok, false);
  assert.equal(S.loadActionRecovery(f.store).status, 'confirmed');
  boundary(f.store);
});

test('C2 reset workspace snapshot stays bound to the opening packet through a detectable ABA', () => {
  const f = fixture('reset');
  const a = f.packet.expectedCheckpointRaw;
  const b = JSON.stringify(f.candidate);
  let targetReads = 0;
  f.store.hooks.get = event => {
    if (event.key === S.STORAGE_KEY) {
      targetReads += 1;
      if (targetReads === 2) { f.store.map.set(S.STORAGE_KEY, b); return b; }
      if (targetReads === 3) { f.store.map.set(S.STORAGE_KEY, a); return a; }
    }
    if (event.key === S.RECOVERY_KEY && targetReads === 3) f.store.map.set(S.STORAGE_KEY, b);
    return event.raw;
  };
  const reset = S.prepareReset(f.store, f.packet, 'reset-aba');
  assert.equal(reset.ok, false);
  assert.equal(writes(f.store).length, 0);
});

test('C2 actual authoring handoff removes its exact draft once and preserves source checks/open execution on reload', () => {
  const store = storage({ [S.LEGACY_KEY]: oldRaw() });
  const authoring = { draftId: 'source-a', rawText: '# 개인 계획\n\n- [x] 원문 체크 항목', templateId: null, folderId: null };
  M.writeAuthoringDraft(store, authoring);
  const draftRaw = store.map.get(S.DRAFT_KEY);
  const packet = S.loadWorkspace(store);
  const handoff = M.makeHandoff(authoring.rawText, { draftId: authoring.draftId, handoffId: 'handoff-a', sourceConfirmed: true });
  const action = { type: 'commit-authoring', handoff, now: '2026-09-05T06:00:00.000Z' };
  const next = C.transitionCheckpoint(packet.checkpoint, action);
  assert.equal(next.changed, true);
  const prepared = S.prepareWrite(packet, next.checkpoint, { operation: 'authoring-handoff', operationId: 'actual-handoff', expectedDraftRaw: draftRaw });
  const result = S.commitPrepared(store, prepared.prepared);
  assert.equal(result.ok, true);
  assert.equal(S.cleanupCommitted(store, result.receipt).ok, true);
  const reloaded = S.loadWorkspace(storage(snapshot(store)));
  const flow = reloaded.checkpoint.state.flows[0];
  assert.equal(flow.rawText, authoring.rawText);
  assert.equal(reloaded.checkpoint.state.tasks.filter(task => task.flowId === flow.id).every(task => task.done === false && task.completedAt === null), true);
  assert.equal(C.transitionCheckpoint(reloaded.checkpoint, action).changed, false);
  assert.equal(store.map.has(S.DRAFT_KEY), false);
  boundary(store);
});

test('C2 stale authoring draft prevents both target and journal writes', () => {
  const f = fixture('authoring-handoff');
  f.store.map.set(S.DRAFT_KEY, 'a newer draft');
  assert.equal(S.commitPrepared(f.store, f.prepared).status, 'stale');
  assert.equal(writes(f.store).length, 0);
  assert.equal(f.store.map.get(S.DRAFT_KEY), 'a newer draft');
});

test('C2 persisted no-op journals cannot manufacture a change from key order, whitespace or a seed projection', () => {
  for (const operation of ['workspace', 'undo', 'authoring-handoff']) {
    for (const seed of [false, true]) {
      const f = fixture(operation, seed);
      const value = clone(f.prepared.journal);
      const previous = value.entries[0].beforeRaw === null ? C.fromLegacy(value.legacyBaseRaw).checkpoint : JSON.parse(value.entries[0].beforeRaw);
      value.entries[0].afterRaw = JSON.stringify(Object.fromEntries(Object.entries(previous).reverse()), null, 2);
      assert.equal(S.decodeJournal(JSON.stringify(value)), null);
    }
  }
  const f = fixture('reset');
  const empty = clone(f.prepared.journal);
  empty.legacyBaseRaw = null;
  empty.entries.forEach(entry => { entry.beforeRaw = null; });
  assert.equal(S.decodeJournal(JSON.stringify(empty)), null);
});

test('C2 foreign confirmed journal detected during final target verification is not committed', () => {
  const f = fixture();
  let confirmed = false;
  f.store.hooks.after = event => { if (event.key === S.RECOVERY_KEY && JSON.parse(event.raw).phase === 'confirmed') confirmed = true; };
  f.store.hooks.get = event => {
    if (confirmed && event.key === S.STORAGE_KEY) f.store.map.set(S.RECOVERY_KEY, 'foreign confirmed journal');
    return event.raw;
  };
  const result = S.commitPrepared(f.store, f.prepared);
  assert.equal(result.status, 'commit-uncertain');
  assert.equal(result.receipt, undefined);
  assert.equal(f.store.map.get(S.RECOVERY_KEY), 'foreign confirmed journal');
});

test('C2 browser UMD branch runs with injected checkpoint and rejects another runtime packet/preparation', () => {
  const browser = vm.createContext({ FlowPocWorkspaceCheckpoint: C });
  vm.runInContext(fs.readFileSync(require.resolve('./workspace-storage.js'), 'utf8'), browser);
  const api = browser.FlowPocWorkspaceStorage;
  const store = storage({ [S.LEGACY_KEY]: oldRaw() });
  const packet = api.loadWorkspace(store);
  assert.equal(packet.ok, true);
  const candidate = C.transitionCheckpoint(packet.checkpoint, { type: 'add-quick', title: '다른 realm', folderId: null, date: null }).checkpoint;
  const prepared = api.prepareWrite(packet, candidate, { operation: 'workspace', operationId: 'realm' });
  assert.equal(prepared.ok, true, prepared.reason);
  assert.equal(S.prepareWrite(packet, candidate, { operation: 'workspace', operationId: 'foreign' }).ok, false);
  assert.equal(S.commitPrepared(store, prepared.prepared).status, 'blocked');
  assert.equal(writes(store).length, 0);
  const result = api.commitPrepared(store, prepared.prepared);
  assert.equal(result.ok, true, result.reason);
  assert.equal(api.cleanupCommitted(store, result.receipt).ok, true);
  assert.equal(api.loadWorkspace(store).origin, 'checkpoint');
  boundary(store);
});
