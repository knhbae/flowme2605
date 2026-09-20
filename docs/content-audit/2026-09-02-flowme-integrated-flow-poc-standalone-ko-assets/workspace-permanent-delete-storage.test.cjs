'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const S = require('./workspace-storage.js');
const NOW = '2026-09-05T06:20:00.000Z';
const PRIVATE = 'DELETE_ONLY_SELECTED_PRIVATE_PAYLOAD_한글';
const OPERATING = 'flow:permanent-delete:operating-sentinel';
function store(initial) {
  const values = new Map([[OPERATING, ' 원본\r\n  bytes unchanged '], ...Object.entries(initial)]);
  const calls = []; const hooks = {};
  return { values, calls, hooks,
    getItem(key) { if (hooks.read) hooks.read(key); return values.has(key) ? values.get(key) : null; },
    setItem(key, raw) { calls.push(['set', key]); if (hooks.before) hooks.before(key, raw); values.set(key, String(raw)); if (hooks.after) hooks.after(key, raw); },
    removeItem(key) { calls.push(['remove', key]); if (hooks.before) hooks.before(key, null); values.delete(key); if (hooks.after) hooks.after(key, null); },
    clear() { calls.push(['clear']); throw new Error('forbidden-clear'); }
  };
}
const snapshot = storage => Object.fromEntries(storage.values);
function apply(state, action) { const result = M.apply(state, { ...action, now: NOW }); assert.equal(result.changed, true, result.error || result.message); return result.state; }
function fixture(kind = 'flow', withSource = false, newKeyAbsent = false) {
  let state = M.seedState(); let target; let sourceRaw = null;
  if (kind === 'flow') {
    const handoff = M.makeHandoff('# ' + PRIVATE + '\n- [x] ' + PRIVATE + ' 항목', { draftId: 'delete-private-draft', handoffId: 'delete-private-handoff', sourceConfirmed: true });
    state = apply(state, { type: 'commit-authoring', handoff });
    const flow = state.flows.find(entry => entry.handoffId === handoff.handoffId);
    target = { kind, id: flow.id, savedCopyId: flow.savedCopyId, sourceFlowId: flow.sourceFlowId, ref: flow.ref };
    if (withSource) {
      const candidate = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), state, flow.id, { now: NOW, createdAt: NOW });
      assert.equal(candidate.ok, true, candidate.reason);
      sourceRaw = JSON.stringify(candidate.store);
    }
  } else {
    const task = state.tasks.find(entry => entry.flowId === null);
    state = apply(state, { type: 'update-quick', id: task.id, title: PRIVATE, memo: PRIVATE, date: task.date, folderId: task.folderId });
    target = { kind, id: task.id };
  }
  const previous = state;
  state = apply(state, { type: 'move-to-trash', kind, id: target.id });
  const legacyRaw = ' \n' + JSON.stringify({ version: 1, state, undo: previous }, null, 2) + '\n';
  const checkpoint = C.fromLegacy(legacyRaw).checkpoint;
  const initial = { [S.LEGACY_KEY]: legacyRaw, [S.CREATOR_KEY]: 'independent creator raw', [S.DRAFT_KEY]: 'independent writing draft' };
  if (!newKeyAbsent) initial[S.STORAGE_KEY] = JSON.stringify(checkpoint);
  if (sourceRaw !== null) initial[S.SOURCE_KEY] = sourceRaw;
  const storage = store(initial);
  const packet = S.loadWorkspace(storage);
  assert.equal(packet.ok, true, packet.reason);
  const input = { target, confirmed: true, expectedRevision: packet.checkpoint.state.revision, sourceCandidateRaw: sourceRaw, now: NOW };
  const planned = S.preparePermanentDelete(packet, input, 'delete-' + kind);
  assert.equal(planned.ok, true, planned.reason);
  return { storage, packet, input, planned, before: snapshot(storage) };
}
function boundary(storage) {
  assert.equal(storage.values.get(OPERATING), ' 원본\r\n  bytes unchanged ');
  assert.equal(storage.calls.some(call => call[0] === 'clear' || ![S.STORAGE_KEY, S.LEGACY_KEY, S.SOURCE_KEY, S.RECOVERY_KEY].includes(call[1])), false);
}

for (const [kind, source] of [['flow', false], ['flow', true], ['quick', false]]) {
  const label = kind + (source ? '-source-candidate' : '');
  test('PD storage ' + label + ': deletion completes only after exact journal cleanup', () => {
    const f = fixture(kind, source);
    const result = S.commitPrepared(f.storage, f.planned.prepared);
    assert.equal(result.status, 'committed', result.reason);
    assert.equal(result.requiresDeletionCleanup, true);
    assert.equal(result.deletionComplete, false);
    assert.equal(f.storage.values.get(S.RECOVERY_KEY).includes(PRIVATE), true);
    assert.equal(S.loadWorkspace(f.storage).ok, false);
    const cleanup = S.cleanupCommitted(f.storage, result.receipt);
    assert.equal(cleanup.ok, true, cleanup.reason);
    assert.equal(cleanup.deletionComplete, true);
    for (const key of [S.LEGACY_KEY, S.STORAGE_KEY, S.SOURCE_KEY, S.RECOVERY_KEY]) assert.equal((f.storage.values.get(key) || '').includes(PRIVATE), false, key);
    const current = S.loadWorkspace(f.storage);
    assert.equal(current.ok, true, current.reason);
    assert.equal(current.checkpoint.undo, null);
    assert.equal(f.storage.values.get(S.CREATOR_KEY), f.before[S.CREATOR_KEY]);
    assert.equal(f.storage.values.get(S.DRAFT_KEY), f.before[S.DRAFT_KEY]);
    boundary(f.storage);
  });

  test('PD storage ' + label + ': every interrupted snapshot restores all before or cleans all confirmed after', () => {
    const f = fixture(kind, source); const frames = [];
    f.storage.hooks.after = () => frames.push(snapshot(f.storage));
    assert.equal(S.commitPrepared(f.storage, f.planned.prepared).ok, true);
    for (const frame of frames) {
      const fresh = store(frame);
      assert.equal(S.loadWorkspace(fresh).ok, false);
      const pending = S.loadActionRecovery(fresh);
      assert.equal(pending.ok, true, pending.reason);
      assert.equal(fresh.calls.length, 0);
      const recovered = S.recoverAction(fresh, { expectedJournalRaw: pending.journalRaw });
      assert.equal(recovered.ok, true, recovered.reason);
      if (pending.status === 'prepared') {
        assert.equal(recovered.deletionComplete, false);
        assert.deepEqual(snapshot(fresh), f.before);
      } else {
        assert.equal(recovered.deletionComplete, true);
        assert.equal([...fresh.values.values()].some(raw => raw.includes(PRIVATE)), false);
      }
      assert.equal(S.loadWorkspace(fresh).ok, true);
      boundary(fresh);
    }
  });

  test('PD storage ' + label + ': fault at each write retains explicit recovery and unrelated stores', () => {
    const example = fixture(kind, source);
    const count = example.planned.prepared.journal.entries.filter(entry => entry.beforeRaw !== entry.afterRaw).length + 2;
    for (let nth = 1; nth <= count; nth += 1) {
      const f = fixture(kind, source); let calls = 0;
      f.storage.hooks.before = () => { calls += 1; if (calls === nth) throw new Error('write fault'); };
      const result = S.commitPrepared(f.storage, f.planned.prepared);
      assert.equal(result.ok, false);
      delete f.storage.hooks.before;
      const raw = f.storage.values.get(S.RECOVERY_KEY) || f.planned.prepared.raw;
      const recovered = S.recoverAction(f.storage, { expectedJournalRaw: raw });
      assert.equal(recovered.ok, true, recovered.reason);
      assert.deepEqual(snapshot(f.storage), f.before);
      boundary(f.storage);
    }
  });

  test('PD storage ' + label + ': throw-after writes are decided by bytes, not the exception', () => {
    const probe = fixture(kind, source);
    const count = probe.planned.prepared.journal.entries.filter(entry => entry.beforeRaw !== entry.afterRaw).length + 2;
    for (let nth = 1; nth <= count; nth += 1) {
      const f = fixture(kind, source); let calls = 0;
      f.storage.hooks.after = () => { if (++calls === nth) throw new Error('write succeeded then threw'); };
      const outcome = S.commitPrepared(f.storage, f.planned.prepared);
      assert.equal(outcome.status, 'committed', outcome.reason);
      assert.equal(outcome.deletionComplete, false);
      delete f.storage.hooks.after;
      assert.equal(S.cleanupCommitted(f.storage, outcome.receipt).deletionComplete, true);
      assert.equal([...f.storage.values.values()].some(raw => raw.includes(PRIVATE)), false);
      boundary(f.storage);
    }
  });

  test('PD storage ' + label + ': read loss after each write survives reload with its explicit owner', () => {
    const probe = fixture(kind, source);
    const count = probe.planned.prepared.journal.entries.filter(entry => entry.beforeRaw !== entry.afterRaw).length + 2;
    for (let nth = 1; nth <= count; nth += 1) {
      const f = fixture(kind, source); let calls = 0; let failed = false;
      f.storage.hooks.after = () => { if (++calls === nth) failed = true; };
      f.storage.hooks.read = () => { if (failed) throw new Error('runtime cannot read storage'); };
      const outcome = S.commitPrepared(f.storage, f.planned.prepared);
      assert.equal(outcome.ok, false);
      assert.notEqual(outcome.deletionComplete, true);
      const fresh = store(snapshot(f.storage));
      assert.equal(S.loadWorkspace(fresh).ok, false);
      const pending = S.loadActionRecovery(fresh);
      assert.equal(pending.ok, true, pending.reason);
      const recovered = S.recoverAction(fresh, { expectedJournalRaw: pending.journalRaw });
      assert.equal(recovered.ok, true, recovered.reason);
      if (pending.status === 'prepared') assert.deepEqual(snapshot(fresh), f.before);
      else {
        assert.equal(recovered.deletionComplete, true);
        assert.equal([...fresh.values.values()].some(raw => raw.includes(PRIVATE)), false);
      }
      boundary(fresh);
    }
  });
}

test('PD storage refuses a mutated deletion intent or arbitrary valid replacement checkpoint', () => {
  const f = fixture();
  for (const mutate of [journal => { journal.intent.target.id = 'moving'; }, journal => { journal.intent.extra = true; },
    journal => { journal.entries[0].afterRaw = journal.entries[0].beforeRaw; }, journal => { journal.entries[1].afterRaw = null; },
    journal => { journal.entries[2].afterRaw = '{}'; }]) {
    const journal = JSON.parse(f.planned.prepared.raw); mutate(journal);
    const raw = JSON.stringify(journal);
    assert.equal(S.decodeJournal(raw), null);
    const fresh = store({ ...f.before, [S.RECOVERY_KEY]: raw });
    assert.equal(S.recoverAction(fresh, { expectedJournalRaw: raw }).ok, false);
    assert.equal(fresh.calls.length, 0);
  }
});

test('PD storage confirmed cleanup failure cannot claim deletion complete or roll back private content', () => {
  const f = fixture('flow', true);
  const result = S.commitPrepared(f.storage, f.planned.prepared);
  const after = snapshot(f.storage);
  f.storage.hooks.before = (key, raw) => { if (key === S.RECOVERY_KEY && raw === null) throw new Error('cleanup fault'); };
  const failed = S.cleanupCommitted(f.storage, result.receipt);
  assert.equal(failed.ok, false);
  assert.notEqual(failed.deletionComplete, true);
  assert.deepEqual(snapshot(f.storage), after);
  delete f.storage.hooks.before;
  const fresh = store(snapshot(f.storage));
  assert.equal(S.loadActionRecovery(fresh).status, 'confirmed');
  assert.equal(S.recoverAction(fresh, { expectedJournalRaw: result.journalRaw }).deletionComplete, true);
  boundary(fresh);
});

test('PD storage no new key can delete from the verified old checkpoint without reviving its old Undo', () => {
  const f = fixture('flow', false, true);
  const result = S.commitPrepared(f.storage, f.planned.prepared);
  assert.equal(result.ok, true, result.reason);
  assert.equal(S.cleanupCommitted(f.storage, result.receipt).deletionComplete, true);
  const current = S.loadWorkspace(f.storage);
  assert.equal(current.checkpoint.undo, null);
  assert.equal(C.undoCheckpoint(current.checkpoint).changed, false);
  assert.equal(current.checkpoint.legacyBaseRaw.includes(PRIVATE), false);
  boundary(f.storage);
});

for (const conflict of ['legacy-drift', 'legacy-read-error', 'legacy-journal']) {
  test('PD storage late cleanup ' + conflict + ' does not certify private-byte deletion', () => {
    const f = fixture('flow', true);
    const result = S.commitPrepared(f.storage, f.planned.prepared);
    assert.equal(result.ok, true);
    let removed = false; let oldReads = 0; let journalReads = 0;
    f.storage.hooks.after = (key, raw) => { if (key === S.RECOVERY_KEY && raw === null) removed = true; };
    f.storage.hooks.read = key => {
      if (!removed) return;
      if (key === S.LEGACY_KEY && ++oldReads === 2) {
        if (conflict === 'legacy-drift') f.storage.values.set(S.LEGACY_KEY, f.before[S.LEGACY_KEY]);
        if (conflict === 'legacy-read-error') throw new Error('late old read unavailable');
      }
      if (key === S.LEGACY_RECOVERY_KEY && ++journalReads === 2 && conflict === 'legacy-journal') {
        f.storage.values.set(S.LEGACY_RECOVERY_KEY, 'external recovery owner');
      }
    };
    const cleanup = S.cleanupCommitted(f.storage, result.receipt);
    assert.equal(cleanup.ok, true, 'observed journal cleanup stays a fact');
    assert.equal(cleanup.canResume, false);
    assert.equal(cleanup.deletionComplete, false, 'observed conflicting authority cannot certify deletion');
    assert.equal(cleanup.legacyStatus, { 'legacy-drift': 'drift', 'legacy-read-error': 'read-error', 'legacy-journal': 'journal-present' }[conflict]);
    assert.equal(f.storage.values.has(S.RECOVERY_KEY), false);
    assert.equal(f.storage.values.get(S.STORAGE_KEY).includes(PRIVATE), false, 'confirmed target never rolls back');
    boundary(f.storage);
  });
}

test('PD storage source changes before dispatch perform zero writes and preserve the foreign source', () => {
  const f = fixture('flow', true);
  const foreign = 'foreign-source-owner';
  f.storage.values.set(S.SOURCE_KEY, foreign);
  assert.equal(S.commitPrepared(f.storage, f.planned.prepared).status, 'stale');
  assert.equal(f.storage.calls.length, 0);
  assert.equal(f.storage.values.get(S.SOURCE_KEY), foreign);
});

test('PD storage foreign source during prepared or confirmed recovery is never overwritten', () => {
  const probe = fixture('flow', true); const frames = [];
  probe.storage.hooks.after = () => frames.push(snapshot(probe.storage));
  assert.equal(S.commitPrepared(probe.storage, probe.planned.prepared).ok, true);
  for (const frame of frames) {
    const f = store({ ...frame, [S.SOURCE_KEY]: 'foreign-source-owner' });
    const before = snapshot(f);
    const pending = S.loadActionRecovery(f);
    assert.equal(pending.ok, false);
    assert.equal(S.recoverAction(f, { expectedJournalRaw: frame[S.RECOVERY_KEY] }).ok, false);
    assert.equal(f.calls.length, 0);
    assert.deepEqual(snapshot(f), before);
    boundary(f);
  }
});
