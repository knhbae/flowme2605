'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const S = require('./workspace-storage.js');
const E = require('./plan-item-session.js').createForWorkspace('checkpoint-v2');
const NOW = '2026-09-05T14:15:00.000Z';
const SENTINEL = 'flow:operating:b2-structure-routing';
const RAW = ' \r\n운영 저장 그대로 🙂\t ';
const clone = value => JSON.parse(JSON.stringify(value));
function fixture(coreOnly = false) {
  const converted = C.fromLegacy(null); assert.equal(converted.ok, true);
  const moved = C.transitionCheckpoint(converted.checkpoint, { type: 'move-to-trash', kind: 'quick', id: 'meeting', now: NOW });
  assert.equal(moved.changed, true, moved.reason); const checkpoint = moved.checkpoint;
  const flow = checkpoint.state.flows.find(entry => entry.id === 'moving'); assert.ok(flow);
  const map = new Map([[E.STORAGE_KEY, JSON.stringify(checkpoint)], [SENTINEL, RAW]]), calls = [];
  const storage = {
    getItem(key) { return map.get(key) ?? null; },
    setItem(key, value) { assert.ok([E.STORAGE_KEY, E.RECOVERY_KEY].includes(key)); calls.push({ method: 'setItem', key }); map.set(key, value); },
    removeItem(key) { assert.ok([E.STORAGE_KEY, E.RECOVERY_KEY].includes(key)); calls.push({ method: 'removeItem', key }); map.delete(key); },
    clear() { assert.fail('clear forbidden'); },
  };
  assert.equal(typeof E.createSourceBoundPersonalPlanStructureSession, 'function', 'actual v4 session required');
  const readSourceEpoch = () => 4;
  const opened = E.createSourceBoundPersonalPlanStructureSession(storage, { checkpoint, flowRef: flow.ref,
    sessionId: 'structure-routing-' + (coreOnly ? 'core' : 'order'), readSourceEpoch });
  assert.equal(calls.length, 0);
  const draft = clone(opened.draft);
  if (coreOnly) draft.title = { mode: 'override', value: '구조 초안에서 바꾼 개인 제목' };
  else draft.orderedItemRefs.reverse();
  const updated = E.updateDraft(opened, draft); assert.equal(updated.ok, true, updated.error);
  const attempt = E.beginSourceBoundPersonalPlanStructureSave(storage, updated.session,
    { checkpoint, expectedRaw: map.get(E.STORAGE_KEY), readSourceEpoch, attemptId: 'structure-routing-save', now: NOW });
  assert.equal(attempt.ok, true, attempt.error); assert.ok(attempt.attempt);
  const outcome = E.writeDurableAttempt(storage, attempt.session, attempt.attempt, { readSourceEpoch });
  assert.equal(outcome.status, 'committed', outcome.error);
  const journal = JSON.parse(outcome.journalRaw); assert.equal(journal.version, 4);
  assert.equal(journal.draftContract, 'flowme-standalone-source-bound-personal-plan-draft-v2');
  assert.equal(calls.length, 3, 'one target and two journal writes; cleanup is separate');
  return { checkpoint, flow, map, calls, storage, outcome, journal };
}
function boundary(f) {
  assert.equal(f.map.get(SENTINEL), RAW);
  assert.equal(f.map.has(M.SOURCE_CANDIDATE_STORAGE_KEY), false);
  assert.equal(f.map.has(M.STORAGE_KEY), false);
}
for (const phase of ['prepared', 'confirmed']) {
  test(`B2S ${phase} actual v4 record routes to E2 without workspace authority or read writes`, () => {
    const f = fixture();
    // Native Map injection simulates persisted phases; it is not a product API.
    const journal = { ...f.journal, phase }; f.map.set(E.RECOVERY_KEY, JSON.stringify(journal));
    const count = f.calls.length, packet = S.loadWorkspace(f.storage);
    assert.equal(packet.ok, false); assert.equal(packet.checkpoint, null);
    assert.equal(packet.reason, 'checkpoint-recovery-required'); assert.equal(packet.journals.currentFamily, 'editor');
    assert.equal(E.loadRecovery(f.storage).status, phase); assert.equal(f.calls.length, count); boundary(f);
  });
}
test('B2S03 version contract target and action-family mixtures remain unknown and blocked', () => {
  const f = fixture();
  for (const change of [v => { v.version = 3; }, v => { v.draftContract = E.SOURCE_PLAN_DRAFT_CONTRACT; },
    v => { v.targetKey = SENTINEL; }, v => { v.contract = 'unknown-action'; }, v => { v.version = 5; }]) {
    const bad = clone(f.journal); change(bad); f.map.set(E.RECOVERY_KEY, JSON.stringify(bad));
    const count = f.calls.length;
    assert.equal(S.loadWorkspace(f.storage).journals.currentFamily, 'unknown');
    assert.equal(E.loadRecovery(f.storage).status, 'blocked'); assert.equal(f.calls.length, count);
  }
  boundary(f);
});
test('B2S04 known v4 hint cannot authorize malformed draft or historical source snapshot', () => {
  const f = fixture();
  for (const change of [v => { v.draft.orderedItemRefs.pop(); }, v => { v.sourceReadSnapshot.raw = '{broken'; },
    v => { v.baseline.sectionTitles.foreign = { mode: 'inherit' }; }]) {
    const bad = clone(f.journal); change(bad); f.map.set(E.RECOVERY_KEY, JSON.stringify(bad));
    const count = f.calls.length, packet = S.loadWorkspace(f.storage);
    assert.equal(packet.journals.currentFamily, 'editor'); assert.equal(packet.ok, false);
    assert.equal(E.loadRecovery(f.storage).status, 'blocked'); assert.equal(f.calls.length, count);
  }
  boundary(f);
});
test('B2S05 v4 pending blocks write reset deletion and confirmed cleanup enables only preparation', () => {
  const f = fixture(), currentRaw = f.map.get(E.STORAGE_KEY), current = JSON.parse(currentRaw);
  const next = C.transitionCheckpoint(current, { type: 'add-quick', title: '준비만 검증', date: null, folderId: null, now: NOW });
  assert.equal(next.changed, true, next.reason);
  const deletion = { target: { kind: 'quick', id: 'meeting' }, confirmed: true, expectedRevision: current.state.revision,
    sourceCandidateRaw: null, now: NOW };
  function preparations(packet) {
    return [S.prepareWrite(packet, next.checkpoint, { operation: 'workspace', operationId: 'b2s-write' }),
      S.prepareReset(f.storage, packet, 'b2s-reset'), S.preparePermanentDelete(packet, deletion, 'b2s-delete')];
  }
  const count = f.calls.length;
  for (const result of preparations(S.loadWorkspace(f.storage))) assert.equal(result.ok, false);
  assert.equal(f.calls.length, count);
  const cleanup = E.clearConfirmedRecovery(f.storage, { expectedJournalRaw: f.outcome.journalRaw }); assert.equal(cleanup.ok, true, cleanup.error);
  assert.deepEqual(f.calls.slice(count), [{ method: 'removeItem', key: E.RECOVERY_KEY }]);
  const ready = S.loadWorkspace(f.storage); assert.equal(ready.ok, true, ready.reason);
  for (const result of preparations(ready)) { assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true); }
  // None of the ordinary write/reset/permanent-delete candidates is dispatched.
  assert.equal(f.calls.length, count + 1); assert.equal(f.map.get(E.STORAGE_KEY), currentRaw); boundary(f);
});
test('B2S06 explicit prepared recovery restores before and clears journal without a v4 automatic editor rebase', () => {
  const f = fixture(), journalRaw = JSON.stringify({ ...f.journal, phase: 'prepared' }); f.map.set(E.RECOVERY_KEY, journalRaw);
  const count = f.calls.length, inspected = E.loadRecovery(f.storage); assert.equal(inspected.status, 'prepared');
  assert.equal(f.calls.length, count);
  const recovered = E.recoverDurableAttempt(f.storage, { expectedJournalRaw: journalRaw });
  assert.equal(recovered.ok, true, recovered.error); assert.equal(recovered.requiresSourceReopen, true);
  assert.equal(recovered.review.viewOnly, true); assert.deepEqual(recovered.review.draft, f.journal.draft);
  assert.equal(f.map.get(E.STORAGE_KEY), f.journal.beforeRaw); assert.equal(f.map.has(E.RECOVERY_KEY), false);
  assert.equal(S.loadWorkspace(f.storage).ok, true); boundary(f);
});
test('B2S07 pending legacy journal or a failed read cannot create authority beside a v4 record', () => {
  const f = fixture(), count = f.calls.length;
  f.map.set(S.LEGACY_RECOVERY_KEY, '{legacy pending');
  assert.equal(S.loadWorkspace(f.storage).reason, 'multiple-authorities');
  f.map.delete(S.LEGACY_RECOVERY_KEY);
  const failed = { ...f.storage, getItem(key) { if (key === E.RECOVERY_KEY) throw new Error('read denied'); return f.storage.getItem(key); } };
  assert.equal(S.loadWorkspace(failed).reason, 'storage-unverified');
  assert.equal(f.calls.length, count); boundary(f);
});
test('B2S08 core-only structure session still uses actual v4 journal when personal metadata stays v1', () => {
  const f = fixture(true);
  assert.equal(JSON.parse(f.map.get(E.STORAGE_KEY)).state.personalPlanContextV1.version, 1);
  const count = f.calls.length;
  assert.equal(S.loadWorkspace(f.storage).journals.currentFamily, 'editor');
  assert.equal(E.loadRecovery(f.storage).status, 'confirmed'); assert.equal(f.calls.length, count); boundary(f);
});
