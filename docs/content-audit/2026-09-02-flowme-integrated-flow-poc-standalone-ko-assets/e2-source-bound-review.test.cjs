'use strict';
// Independent E2 v3 negative review. Actual modules; generated data and memory I/O only.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { M, C, NOW, clone, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const E0 = require('./plan-item-session.js');
const E = E0.createForWorkspace('checkpoint-v2');
const SOURCE = M.SOURCE_CANDIDATE_STORAGE_KEY;
const SENTINEL = 'flow:review-v3:production-sentinel';
let sequence = 0;
const audits = [];
const auditRecords = [];

function setup() {
  const f = sourceUpdateFixture(); f.task.title = f.task.sourceTitle;
  const legacy = JSON.stringify({ version: 1, state: f.state, undo: null });
  const converted = C.fromLegacy(legacy); assert.equal(converted.ok, true, converted.reason);
  const checkpoint = converted.checkpoint, before = JSON.stringify(checkpoint), sourceRaw = JSON.stringify(f.store);
  const map = new Map([[E.STORAGE_KEY, before], [M.STORAGE_KEY, legacy], [SOURCE, sourceRaw], [SENTINEL, ' \r\n보존 🙂\t ']]);
  const calls = [], reads = [], hooks = {}; let forbidden = 0;
  const db = {
    getItem(key) {
      reads.push(key); if (hooks.beforeRead) hooks.beforeRead(key);
      const value = map.has(key) ? map.get(key) : null;
      if (hooks.afterRead) hooks.afterRead(key, value); return value;
    },
    setItem(key, value) {
      calls.push({ method: 'setItem', key });
      if (![E.STORAGE_KEY, E.RECOVERY_KEY].includes(key)) { forbidden += 1; throw Error('outside-review-boundary'); }
      if (hooks.beforeWrite) hooks.beforeWrite(key, value);
      map.set(key, value); if (hooks.afterWrite) hooks.afterWrite(key, value);
    },
    removeItem(key) {
      calls.push({ method: 'removeItem', key });
      if (![E.STORAGE_KEY, E.RECOVERY_KEY].includes(key)) { forbidden += 1; throw Error('outside-review-boundary'); }
      if (hooks.beforeRemove) hooks.beforeRemove(key);
      map.delete(key); if (hooks.afterRemove) hooks.afterRemove(key);
    },
    clear() { forbidden += 1; throw Error('forbidden-clear'); },
  };
  const clock = { epoch: 10 }, readSourceEpoch = () => clock.epoch;
  const session = E.createSourceBoundPersonalPlanSession(db, { checkpoint, flowRef: f.flow.ref, sessionId: 'review-' + (++sequence), readSourceEpoch });
  const x = { f, checkpoint, before, sourceRaw, legacy, map, calls, reads, hooks, clock, readSourceEpoch, db, session };
  auditRecords.push({ calls, reads });
  audits.push(() => {
    assert.equal(forbidden, 0);
    assert.equal(map.get(SENTINEL) === ' \r\n보존 🙂\t ', true);
    assert.equal(map.get(M.STORAGE_KEY) === legacy, true);
    assert.ok(calls.every(call => [E.STORAGE_KEY, E.RECOVERY_KEY].includes(call.key)));
  });
  return x;
}
function update(session, change = draft => { draft.title = { mode: 'override', value: '원문 제목' }; }) {
  const draft = clone(session.draft); change(draft);
  const result = E.updateDraft(session, draft); assert.equal(result.ok, true, result.error);
  return result.session;
}
function begin(x, session = update(x.session)) {
  const result = E.beginSourceBoundPersonalPlanSave(x.db, session, { checkpoint: x.checkpoint, expectedRaw: x.before,
    attemptId: 'review-attempt-' + (++sequence), now: NOW, readSourceEpoch: x.readSourceEpoch });
  assert.equal(result.ok, true, result.error); assert.ok(result.attempt);
  return result;
}
function dispatch(x, pending) { return E.writeDurableAttempt(x.db, pending.session, pending.attempt, { readSourceEpoch: x.readSourceEpoch }); }
function committed(x) {
  const pending = begin(x), result = dispatch(x, pending);
  assert.equal(result.status, 'committed', result.error); return { pending, result };
}
function targetCalls(x) { return x.calls.filter(call => call.key === E.STORAGE_KEY).length; }
function exact(actual, expected, reason) { assert.equal(actual === expected, true, reason); }

test('R01 captured local validity and copied public values cannot revive an observed stale source owner', () => {
  const x = setup(); let session = update(x.session);
  x.map.set(SOURCE, x.sourceRaw + ' ');
  assert.equal(E.checkSourceBoundPersonalPlanSession(x.db, session, { checkpoint: x.checkpoint, readSourceEpoch: x.readSourceEpoch }).ok, false);
  x.map.set(SOURCE, x.sourceRaw);
  const count = x.reads.length;
  session = update(session, draft => { draft.items[x.f.task.ref].memo = { mode: 'override', value: '입력은 유지' }; });
  assert.equal(session.valid, true); assert.equal(x.reads.length, count, 'local validity must not perform current I/O');
  const options = { checkpoint: x.checkpoint, expectedRaw: x.before, attemptId: 'stale', now: NOW, readSourceEpoch: x.readSourceEpoch };
  assert.equal(E.beginSourceBoundPersonalPlanSave(x.db, session, options).ok, false);
  assert.equal(E.beginSourceBoundPersonalPlanSave(x.db, { ...session, sourceBoundary: 'captured-source-bound' }, options).ok, false);
  assert.equal(E.beginPersonalPlanSave(session, options).ok, false); assert.equal(E.beginSave(session, options).ok, false);
  assert.equal(x.calls.length, 0); exact(x.map.get(SOURCE), x.sourceRaw);
});

test('R02 an epoch change inside fixed-key I/O is latched across restored bytes/counter and retry', () => {
  const x = setup(), pending = begin(x); let changed = false;
  x.hooks.afterRead = key => { if (!changed && key === SOURCE) { changed = true; x.clock.epoch += 1; } };
  const failed = dispatch(x, pending);
  assert.equal(failed.status, 'preflight-failed'); assert.equal(failed.sourceError, 'source-observation-drift');
  assert.equal(x.calls.length, 0); delete x.hooks.afterRead; x.clock.epoch -= 1;
  const finished = E.finishSave(pending.session, pending.attempt, failed);
  const retry = E.retrySourceBoundPersonalPlanSave(x.db, finished.session, { checkpoint: x.checkpoint, readSourceEpoch: x.readSourceEpoch, attemptId: pending.attempt.attemptId });
  assert.equal(retry.ok, false); assert.equal(retry.requiresSourceReopen, true);
  assert.equal(x.calls.length, 0); exact(x.map.get(SOURCE), x.sourceRaw);
});

test('R03 an old-family recovery journal arriving after v3 prepare preserves both records and blocks target/recovery writes', () => {
  const x = setup(); const oldJournal = 'foreign unresolved legacy record';
  x.hooks.afterWrite = (key, value) => { if (key === E.RECOVERY_KEY && JSON.parse(value).phase === 'prepared') x.map.set(E0.RECOVERY_KEY, oldJournal); };
  const pending = begin(x), out = dispatch(x, pending);
  assert.equal(out.status, 'recovery-required'); assert.equal(targetCalls(x), 0);
  const journal = x.map.get(E.RECOVERY_KEY); assert.equal(JSON.parse(journal).phase, 'prepared');
  const count = x.calls.length; const recovery = E.recoverDurableAttempt(x.db, { expectedJournalRaw: journal });
  assert.equal(recovery.ok, false); assert.equal(x.calls.length, count);
  exact(x.map.get(E.RECOVERY_KEY), journal); exact(x.map.get(E0.RECOVERY_KEY), oldJournal);
  exact(x.map.get(E.STORAGE_KEY), x.before); exact(x.map.get(SOURCE), x.sourceRaw);
});

test('R04 source drift plus a target throw-after never triggers automatic cross-version rollback; explicit restore does not restore source', () => {
  const x = setup(); const changed = x.sourceRaw + '\n'; let once = true;
  x.hooks.afterWrite = key => { if (key === E.STORAGE_KEY && once) { once = false; x.map.set(SOURCE, changed); throw Error('target throw-after with source drift'); } };
  const pending = begin(x), out = dispatch(x, pending);
  assert.equal(out.status, 'recovery-required'); assert.equal(out.writeCount, 1); assert.equal(out.rollbackWriteCount, 0);
  exact(x.map.get(E.STORAGE_KEY), pending.attempt.serialized); assert.equal(E.loadRecovery(x.db).status, 'prepared');
  const recovered = E.recoverDurableAttempt(x.db, { expectedJournalRaw: out.journalRaw });
  assert.equal(recovered.ok, true, recovered.error); assert.equal(recovered.requiresSourceReopen, true);
  exact(x.map.get(E.STORAGE_KEY), x.before); exact(x.map.get(SOURCE), changed);
  const count = x.calls.length;
  const reopened = E.resumeRecoveredSourceBoundPersonalPlanSession(x.db, recovered, { sessionId: 'changed-source-no-rebase', readSourceEpoch: x.readSourceEpoch });
  assert.equal(reopened.ok, false); assert.equal(reopened.requiresSourceReopen, true);
  assert.equal(x.calls.length, count); assert.deepEqual(reopened.review.draft, pending.session.draft);
});

test('R05 foreign journal replacement at prepared/target boundaries is never overwritten or cleared', () => {
  for (const phase of ['prepared', 'target']) {
    const x = setup(), foreign = 'newer foreign recovery bytes';
    x.hooks.afterWrite = (key, value) => {
      if (phase === 'prepared' && key === E.RECOVERY_KEY && JSON.parse(value).phase === 'prepared'
        || phase === 'target' && key === E.STORAGE_KEY) x.map.set(E.RECOVERY_KEY, foreign);
    };
    const pending = begin(x), out = dispatch(x, pending);
    assert.equal(out.status, 'recovery-required'); assert.equal(out.writeCount, phase === 'target' ? 1 : 0);
    assert.equal(out.rollbackWriteCount, 0); exact(x.map.get(E.RECOVERY_KEY), foreign);
    const count = x.calls.length; assert.equal(E.loadRecovery(x.db).status, 'blocked');
    assert.equal(E.recoverDurableAttempt(x.db, { expectedJournalRaw: out.journalRaw }).ok, false);
    assert.equal(x.calls.length, count); exact(x.map.get(E.RECOVERY_KEY), foreign); exact(x.map.get(SOURCE), x.sourceRaw);
  }
});

test('R06 verified confirmation throw-after survives current-source failure, and explicit cleanup throw-after removes the snapshot without target rollback', () => {
  const x = setup(); let confirmed = false;
  x.hooks.afterWrite = (key, value) => {
    if (key === E.RECOVERY_KEY && JSON.parse(value).phase === 'confirmed') { confirmed = true; throw Error('confirmed throw-after'); }
  };
  x.hooks.beforeRead = key => { if (confirmed && key === SOURCE) throw Error('current source unavailable'); };
  const pending = begin(x), out = dispatch(x, pending);
  assert.equal(out.status, 'committed'); assert.equal(out.canResume, false); assert.equal(out.requiresSourceReopen, true);
  assert.equal(out.rollbackWriteCount, 0); assert.equal(E.loadRecovery(x.db).status, 'confirmed');
  const count = x.calls.length;
  assert.equal(E.recoverDurableAttempt(x.db, { expectedJournalRaw: out.journalRaw }).ok, false); assert.equal(x.calls.length, count);
  x.hooks.afterRemove = key => { if (key === E.RECOVERY_KEY) throw Error('cleanup throw-after'); };
  const clean = E.clearConfirmedRecovery(x.db, { expectedJournalRaw: out.journalRaw });
  assert.equal(clean.ok, true, clean.error); assert.equal(clean.writeCount, 0);
  assert.equal(x.map.has(E.RECOVERY_KEY), false); exact(x.map.get(E.STORAGE_KEY), pending.attempt.serialized);
  exact(x.map.get(SOURCE), x.sourceRaw); assert.equal(targetCalls(x), 1);
});

test('R07 historical prepared bytes cannot roll back a confirmed v3 commit and semantically equal but non-exact target bytes block cleanup', () => {
  const x = setup(), { pending, result } = committed(x);
  const stale = JSON.parse(result.journalRaw); stale.phase = 'prepared';
  let count = x.calls.length;
  assert.equal(E.recoverDurableAttempt(x.db, { expectedJournalRaw: JSON.stringify(stale) }).ok, false);
  assert.equal(x.calls.length, count); exact(x.map.get(E.RECOVERY_KEY), result.journalRaw);
  x.map.set(E.STORAGE_KEY, ' ' + pending.attempt.serialized); count = x.calls.length;
  assert.equal(C.validateCheckpoint(JSON.parse(x.map.get(E.STORAGE_KEY))).ok, true);
  assert.equal(E.clearConfirmedRecovery(x.db, { expectedJournalRaw: result.journalRaw }).ok, false);
  assert.equal(x.calls.length, count); exact(x.map.get(E.RECOVERY_KEY), result.journalRaw);
  exact(x.map.get(SOURCE), x.sourceRaw);
});

test('R08 a missing shared P runtime cannot be bypassed by an always-true caller validator when decoding source history', () => {
  const x = setup(), { result } = committed(x);
  const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: require('./timeline-context.js') };
  const context = vm.createContext(sandbox);
  // Load actual C/E in one realm with P deliberately absent. A host C reference
  // would still capture host P and would not test this dependency failure.
  for (const file of ['workspace-checkpoint.js', 'plan-item-session.js']) vm.runInContext(fs.readFileSync(require.resolve('./' + file), 'utf8'), context);
  const isolated = context.FlowPocPlanItemSession.createForWorkspace('checkpoint-v2');
  const initialCount = x.calls.length;
  assert.equal(isolated.loadRecovery(x.db, () => true).status, 'blocked');
  assert.equal(isolated.clearConfirmedRecovery(x.db, { expectedJournalRaw: result.journalRaw, validateEnvelope: () => true }).ok, false);
  assert.equal(x.calls.length, initialCount); exact(x.map.get(E.RECOVERY_KEY), result.journalRaw);
  vm.runInContext(fs.readFileSync(require.resolve('./personal-plan-context.js'), 'utf8'), context);
  assert.equal(isolated.loadRecovery(x.db).status, 'confirmed', 'restoring the actual shared dependency restores read-only interpretation');
  const bad = JSON.parse(result.journalRaw); bad.sourceReadSnapshot.raw = '{}';
  const bytes = JSON.stringify(bad); x.map.set(E.RECOVERY_KEY, bytes); const count = x.calls.length;
  assert.equal(isolated.loadRecovery(x.db, () => true).status, 'blocked');
  assert.equal(isolated.clearConfirmedRecovery(x.db, { expectedJournalRaw: bytes, validateEnvelope: () => true }).ok, false);
  assert.equal(x.calls.length, count); exact(x.map.get(E.RECOVERY_KEY), bytes);
  exact(x.map.get(SOURCE), x.sourceRaw);
});

test('R09 source drift during explicit recovered-draft reopening does not consume its token or auto-save preserved input', () => {
  const x = setup(), { pending, result } = committed(x);
  const journal = JSON.parse(result.journalRaw); journal.phase = 'prepared';
  const bytes = JSON.stringify(journal); x.map.set(E.RECOVERY_KEY, bytes);
  const recovery = E.recoverDurableAttempt(x.db, { expectedJournalRaw: bytes }); assert.equal(recovery.ok, true);
  let sourceReads = 0;
  x.hooks.afterRead = key => { if (key === SOURCE && ++sourceReads === 1) { x.map.set(SOURCE, x.sourceRaw + ' '); x.clock.epoch += 1; } };
  const count = x.calls.length;
  const failed = E.resumeRecoveredSourceBoundPersonalPlanSession(x.db, recovery, { sessionId: 'failed-reopen', readSourceEpoch: x.readSourceEpoch });
  assert.equal(failed.ok, false); assert.equal(failed.requiresSourceReopen, true);
  assert.deepEqual(failed.review.draft, pending.session.draft); assert.equal(x.calls.length, count);
  delete x.hooks.afterRead; x.map.set(SOURCE, x.sourceRaw); x.clock.epoch += 1;
  const reopened = E.resumeRecoveredSourceBoundPersonalPlanSession(x.db, recovery, { sessionId: 'fresh-reopen-review', readSourceEpoch: x.readSourceEpoch });
  assert.equal(reopened.ok, true, reopened.reason); assert.deepEqual(reopened.session.draft, pending.session.draft);
  assert.equal(x.calls.length, count); exact(x.map.get(E.STORAGE_KEY), x.before);
  assert.equal(E.resumeRecoveredSourceBoundPersonalPlanSession(x.db, recovery, { sessionId: 'replay-review', readSourceEpoch: x.readSourceEpoch }).ok, false);
  exact(x.map.get(SOURCE), x.sourceRaw);
});

test.after(() => {
  audits.forEach(check => check());
  const calls = auditRecords.flatMap(record => record.calls);
  process.stdout.write('# independent-v3-boundary ' + JSON.stringify({ memoryStores: auditRecords.length,
    reads: auditRecords.reduce((total, record) => total + record.reads.length, 0),
    sourceReads: auditRecords.reduce((total, record) => total + record.reads.filter(key => key === SOURCE).length, 0),
    targetMutationCalls: calls.filter(call => call.key === E.STORAGE_KEY).length,
    journalMutationCalls: calls.filter(call => call.key === E.RECOVERY_KEY).length,
    outsidePairCalls: calls.filter(call => ![E.STORAGE_KEY, E.RECOVERY_KEY].includes(call.key)).length }) + '\n');
});
