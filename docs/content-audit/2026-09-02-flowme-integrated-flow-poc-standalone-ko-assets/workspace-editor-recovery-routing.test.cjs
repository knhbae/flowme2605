'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { M, C, NOW, clone, legacyFixture, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const S = require('./workspace-storage.js');
const E = require('./plan-item-session.js').createForWorkspace('checkpoint-v2');
const SOURCE = M.SOURCE_CANDIDATE_STORAGE_KEY;
const SENTINEL = 'flow:operating:editor-routing';
const BYTES = ' \r\n유지 🙂\t ';
function fixture(version, trashTarget = false) {
  let checkpoint, flowRef, sourceRaw = null, deleteTarget = null;
  if (version === 3) {
    const f = sourceUpdateFixture(); f.task.title = f.task.sourceTitle;
    checkpoint = C.fromLegacy(JSON.stringify({ version: 1, state: f.state, undo: null })).checkpoint;
    flowRef = f.flow.ref; sourceRaw = JSON.stringify(f.store);
  } else {
    // Keep the unknown-field legacy fixture for the routing tests. The deletion
    // positive control needs an independently valid, proven-owner seed fixture;
    // removing unknown user fields from the legacy fixture would be misleading.
    checkpoint = trashTarget ? C.fromLegacy(null).checkpoint : legacyFixture().checkpoint;
    flowRef = checkpoint.state.flows.find(f => f.id === 'moving').ref;
  }
  if (trashTarget) {
    const quick = checkpoint.state.tasks.find(task => task.id === 'meeting' && task.flowId === null);
    assert.ok(quick, 'the seed contains the exact independent Quick meeting');
    deleteTarget = { kind: 'quick', id: quick.id };
    const trashed = C.transitionCheckpoint(checkpoint, { type: 'move-to-trash', ...deleteTarget, now: NOW });
    assert.equal(trashed.ok, true, trashed.reason); assert.equal(trashed.changed, true);
    checkpoint = trashed.checkpoint;
    assert.equal(M.isTrashedTask(checkpoint.state, checkpoint.state.tasks.find(task => task.id === quick.id)), true);
  }
  const map = new Map([[E.STORAGE_KEY, JSON.stringify(checkpoint)], [SENTINEL, BYTES]]), calls = [];
  if (checkpoint.legacyBaseRaw !== null) map.set(M.STORAGE_KEY, checkpoint.legacyBaseRaw);
  if (sourceRaw !== null) map.set(SOURCE, sourceRaw);
  const db = {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { assert.ok([E.STORAGE_KEY, E.RECOVERY_KEY].includes(key)); calls.push({ method: 'setItem', key }); map.set(key, value); },
    removeItem(key) { assert.ok([E.STORAGE_KEY, E.RECOVERY_KEY].includes(key)); calls.push({ method: 'removeItem', key }); map.delete(key); },
    clear() { assert.fail('clear forbidden'); },
  };
  const opts = { checkpoint, flowRef, sessionId: 'routing-' + version, readSourceEpoch: () => 3 };
  const opened = version === 3 ? E.createSourceBoundPersonalPlanSession(db, opts) : E.createPersonalPlanSession(opts);
  const draft = clone(opened.draft); draft.title = { mode: 'override', value: '복구할 개인 제목' };
  const session = E.updateDraft(opened, draft).session;
  const saveOpts = { checkpoint, expectedRaw: map.get(E.STORAGE_KEY), attemptId: 'routing-save-' + version, now: NOW, readSourceEpoch: opts.readSourceEpoch };
  const b = version === 3 ? E.beginSourceBoundPersonalPlanSave(db, session, saveOpts) : E.beginPersonalPlanSave(session, saveOpts);
  assert.equal(b.ok, true, b.error);
  const out = E.writeDurableAttempt(db, b.session, b.attempt, { readSourceEpoch: opts.readSourceEpoch });
  assert.equal(out.status, 'committed', out.error);
  return { checkpoint, sourceRaw, map, calls, db, deleteTarget, journal: JSON.parse(out.journalRaw), out };
}
function boundary(f) {
  assert.equal(f.map.get(SENTINEL), BYTES);
  assert.equal(f.map.get(SOURCE) ?? null, f.sourceRaw);
  assert.equal(f.map.get(M.STORAGE_KEY) ?? null, f.checkpoint.legacyBaseRaw);
}
for (const version of [2, 3]) for (const phase of ['prepared', 'confirmed']) {
  test(`ER01 v${version} ${phase} actual E2 record routes to its decoder without authorizing a workspace`, () => {
    const f = fixture(version); f.journal.phase = phase;
    f.map.set(E.RECOVERY_KEY, JSON.stringify(f.journal));
    const count = f.calls.length, packet = S.loadWorkspace(f.db);
    assert.equal(packet.ok, false); assert.equal(packet.reason, 'checkpoint-recovery-required');
    assert.equal(packet.journals.currentFamily, 'editor'); assert.equal(packet.checkpoint, null);
    assert.equal(E.loadRecovery(f.db).status, phase);
    assert.equal(f.calls.length, count); boundary(f);
  });
}
test('ER02 foreign version/contract/target never gains an editor route or write authority', () => {
  const f = fixture(3);
  for (const change of [v => { v.version = 4; }, v => { v.draftContract = 'unknown'; },
    v => { v.targetKey = 'flow:operating'; }, v => { v.version = 2; }, v => { v.contract = 'foreign'; }]) {
    const bad = clone(f.journal); change(bad); f.map.set(E.RECOVERY_KEY, JSON.stringify(bad));
    const count = f.calls.length, packet = S.loadWorkspace(f.db);
    assert.equal(packet.journals.currentFamily, 'unknown'); assert.equal(packet.ok, false);
    assert.equal(E.loadRecovery(f.db).status, 'blocked'); assert.equal(f.calls.length, count);
  }
  boundary(f);
});
test('ER03 known-family hint cannot make a corrupt snapshot/baseline pass the actual E2 decoder', () => {
  for (const version of [2, 3]) {
    const f = fixture(version);
    if (version === 3) f.journal.sourceReadSnapshot.raw = '{broken'; else f.journal.baseline.title = { mode: 'override', value: 'foreign' };
    f.map.set(E.RECOVERY_KEY, JSON.stringify(f.journal)); const count = f.calls.length;
    assert.equal(S.loadWorkspace(f.db).journals.currentFamily, 'editor');
    assert.equal(E.loadRecovery(f.db).status, 'blocked'); assert.equal(f.calls.length, count); boundary(f);
  }
});
test('ER04 pending editor snapshot blocks workspace write, reset, and permanent-delete preparations', () => {
  for (const version of [2, 3]) {
    const f = fixture(version, true), count = f.calls.length, packet = S.loadWorkspace(f.db);
    const currentRaw = f.map.get(E.STORAGE_KEY), current = JSON.parse(currentRaw);
    const deletion = { target: f.deleteTarget, confirmed: true, expectedRevision: current.state.revision,
      sourceCandidateRaw: f.sourceRaw, now: NOW };
    const next = C.transitionCheckpoint(current, { type: 'add-quick', title: '준비만 검사할 항목', date: null, folderId: null, now: NOW });
    assert.equal(next.ok, true, next.reason); assert.equal(next.changed, true);
    const blockedWrite = S.prepareWrite(packet, next.checkpoint, { operation: 'workspace', operationId: 'blocked' });
    assert.equal(blockedWrite.ok, false); assert.equal(blockedWrite.reason, 'invalid-preparation');
    const blockedReset = S.prepareReset(f.db, packet, 'blocked');
    assert.equal(blockedReset.ok, false); assert.equal(blockedReset.reason, 'invalid-authority');
    const blockedDelete = S.preparePermanentDelete(packet, deletion, 'blocked');
    assert.equal(blockedDelete.ok, false); assert.equal(blockedDelete.reason, 'invalid-delete-preparation');
    assert.equal(f.calls.length, count); assert.equal(f.map.has(E.RECOVERY_KEY), true); boundary(f);

    const cleanup = E.clearConfirmedRecovery(f.db, { expectedJournalRaw: f.out.journalRaw });
    assert.equal(cleanup.ok, true, cleanup.error);
    assert.deepEqual(f.calls.slice(count), [{ method: 'removeItem', key: E.RECOVERY_KEY }]);
    const ready = S.loadWorkspace(f.db), afterCleanup = f.calls.length;
    assert.equal(ready.ok, true, ready.reason);
    for (const result of [
      S.prepareWrite(ready, next.checkpoint, { operation: 'workspace', operationId: 'positive-write' }),
      S.prepareReset(f.db, ready, 'positive-reset'),
      S.preparePermanentDelete(ready, deletion, 'positive-delete'),
    ]) { assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true); assert.ok(result.prepared); }
    // Preparation only: never dispatch reset/write/permanent-delete actions.
    assert.equal(f.calls.length, afterCleanup); assert.equal(f.map.get(E.STORAGE_KEY), currentRaw);
    assert.equal(f.map.has(E.RECOVERY_KEY), false);
    assert.equal(JSON.parse(f.map.get(E.STORAGE_KEY)).state.tasks.some(task => task.id === f.deleteTarget.id), true);
    boundary(f);
  }
});
test('ER05 explicit confirmed cleanup removes the snapshot journal and only then restores workspace authority', () => {
  for (const version of [2, 3]) {
    const f = fixture(version), before = f.map.get(E.STORAGE_KEY), count = f.calls.length;
    const result = E.clearConfirmedRecovery(f.db, { expectedJournalRaw: f.out.journalRaw });
    assert.equal(result.ok, true, result.error); assert.equal(f.map.has(E.RECOVERY_KEY), false);
    assert.equal(f.map.get(E.STORAGE_KEY), before); assert.deepEqual(f.calls.slice(count), [{ method: 'removeItem', key: E.RECOVERY_KEY }]);
    assert.equal(S.loadWorkspace(f.db).ok, true); boundary(f);
  }
});
