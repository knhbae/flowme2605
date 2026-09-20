/* K2B-C2: fixed PoC workspace authorities and explicit interrupted-action recovery. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => require('./workspace-checkpoint.js'), () => require('./workspace-permanent-delete.js'));
  else root.FlowPocWorkspaceStorage = factory(() => root.FlowPocWorkspaceCheckpoint, () => root.FlowPocWorkspacePermanentDelete);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (getCheckpoint, getPermanentDelete) {
  'use strict';

  const LEGACY_KEY = 'flow:poc:personal-workspace:v1:standalone-integrated';
  const STORAGE_KEY = LEGACY_KEY + ':workspace-v2';
  const DRAFT_KEY = LEGACY_KEY + ':draft';
  const CREATOR_KEY = 'flow:poc:personal-workspace:v1:creator-drafts';
  const SOURCE_KEY = 'flow:poc:personal-workspace:v1:source-candidates';
  const LEGACY_RECOVERY_KEY = 'flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v1';
  const RECOVERY_KEY = 'flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2';
  const CONTRACT = 'flowme-workspace-action-journal-v2';
  const RESET_KEYS = Object.freeze([STORAGE_KEY, LEGACY_KEY, DRAFT_KEY, CREATOR_KEY, SOURCE_KEY]);
  const CORE_KEYS = [STORAGE_KEY, LEGACY_KEY, LEGACY_RECOVERY_KEY, RECOVERY_KEY];
  const packets = new WeakSet();
  const preparations = new WeakSet();
  const dispatched = new WeakSet();
  const receipts = new WeakSet();
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;
  const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => own(value, key));
  const rawValue = value => value === null || typeof value === 'string';
  function sameData(left, right) {
    if (left === right) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return false;
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key => own(right, key) && sameData(left[key], right[key]));
  }
  const freeze = value => {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  };
  function read(storage, key) {
    try {
      const raw = storage.getItem(key);
      return rawValue(raw) ? { ok: true, raw } : { ok: false, reason: 'invalid-storage-read' };
    } catch (_) { return { ok: false, reason: 'storage-read-error' }; }
  }
  function decodeCheckpoint(raw) {
    if (typeof raw !== 'string') return null;
    try {
      const value = JSON.parse(raw);
      return getCheckpoint().validateCheckpoint(value).ok ? value : null;
    } catch (_) { return null; }
  }
  function actionKeys(operation) {
    if (operation === 'workspace' || operation === 'undo') return [STORAGE_KEY];
    if (operation === 'authoring-handoff') return [STORAGE_KEY, DRAFT_KEY];
    if (operation === 'permanent-delete') return [STORAGE_KEY, LEGACY_KEY, SOURCE_KEY];
    if (operation === 'reset') return RESET_KEYS;
    return null;
  }
  function decodeJournal(raw) {
    if (typeof raw !== 'string') return null;
    try {
      const value = JSON.parse(raw);
      const fields = ['version', 'contract', 'phase', 'operation', 'operationId', 'legacyBaseRaw', 'entries'];
      if (plain(value) && value.operation === 'permanent-delete') fields.push('intent');
      if (!exact(value, fields)
        || value.version !== 2 || value.contract !== CONTRACT || !['prepared', 'confirmed'].includes(value.phase)
        || typeof value.operationId !== 'string' || !value.operationId.trim() || !rawValue(value.legacyBaseRaw)) return null;
      const keys = actionKeys(value.operation);
      if (!keys || !Array.isArray(value.entries) || value.entries.length !== keys.length) return null;
      if (!value.entries.every((entry, index) => exact(entry, ['key', 'beforeRaw', 'afterRaw'])
        && entry.key === keys[index] && rawValue(entry.beforeRaw) && rawValue(entry.afterRaw))) return null;
      const target = value.entries[0];
      const before = target.beforeRaw === null ? null : decodeCheckpoint(target.beforeRaw);
      if (target.beforeRaw !== null && (!before || before.legacyBaseRaw !== value.legacyBaseRaw)) return null;
      if (value.operation === 'reset') {
        if (value.entries.some(entry => entry.afterRaw !== null) || value.entries[1].beforeRaw !== value.legacyBaseRaw) return null;
        if (value.entries.every(entry => entry.beforeRaw === null)) return null;
        if (!getCheckpoint().fromLegacy(value.legacyBaseRaw).ok) return null;
      } else if (value.operation === 'permanent-delete') {
        if (!exact(value.intent, ['target', 'expectedRevision', 'now'])) return null;
        const previous = before || getCheckpoint().fromLegacy(value.legacyBaseRaw).checkpoint;
        const after = decodeCheckpoint(target.afterRaw);
        if (!previous || !after || after.legacyBaseRaw !== value.entries[1].afterRaw
          || value.entries[1].beforeRaw !== value.legacyBaseRaw) return null;
        // A recovered delete journal must reproduce the same owner-scoped plan.
        // Valid arbitrary checkpoints are not sufficient authority to scrub data.
        const planned = getPermanentDelete().planPermanentDelete({ checkpoint: previous, target: value.intent.target,
          expectedRevision: value.intent.expectedRevision, confirmed: true, sourceCandidateRaw: value.entries[2].beforeRaw, now: value.intent.now });
        if (!planned.ok || !planned.changed || !sameData(planned.checkpoint, after)
          || planned.legacyRaw !== value.entries[1].afterRaw || planned.sourceCandidateRaw !== value.entries[2].afterRaw) return null;
      } else {
        const after = decodeCheckpoint(target.afterRaw);
        if (!after || after.legacyBaseRaw !== value.legacyBaseRaw || target.afterRaw === target.beforeRaw) return null;
        const previous = before || getCheckpoint().fromLegacy(value.legacyBaseRaw).checkpoint;
        if (!previous || sameData(previous, after)) return null;
        if (value.operation === 'authoring-handoff' && value.entries[1].afterRaw !== null) return null;
      }
      return freeze(value);
    } catch (_) { return null; }
  }
  function journalFamily(raw) {
    if (raw === null) return 'none';
    try {
      const value = JSON.parse(raw);
      if (plain(value) && own(value, 'contract')) return value.contract === CONTRACT && decodeJournal(raw) ? 'action' : 'unknown';
      if (!plain(value) || value.targetKey !== STORAGE_KEY) return 'unknown';
      // Dispatch hint only. E2 still validates the entire versioned record and
      // reproduces its candidate before any recovery/cleanup can be authorized.
      return value.version === 1
        || value.version === 2 && value.draftContract === 'flowme-standalone-personal-plan-draft-v1'
        || value.version === 3 && value.draftContract === 'flowme-standalone-source-bound-personal-plan-draft-v1'
        || value.version === 4 && value.draftContract === 'flowme-standalone-source-bound-personal-plan-draft-v2'
        ? 'editor' : 'unknown';
    } catch (_) { return 'unknown'; }
  }
  /** All reads are explicit; null is never a substitute for a failed getItem. */
  function loadWorkspace(storage) {
    const reads = Object.fromEntries(CORE_KEYS.map(key => [key, read(storage, key)]));
    const packet = { ok: false, status: 'blocked', origin: 'blocked', checkpoint: null, reads };
    function finish(reason) {
      if (reason) packet.reason = reason;
      freeze(packet); packets.add(packet); return packet;
    }
    if (CORE_KEYS.some(key => !reads[key].ok)) return finish('storage-unverified');
    const raw = reads[STORAGE_KEY].raw;
    const legacyRaw = reads[LEGACY_KEY].raw;
    packet.expectedCheckpointRaw = raw;
    packet.expectedLegacyRaw = legacyRaw;
    packet.journals = { legacyRaw: reads[LEGACY_RECOVERY_KEY].raw, currentRaw: reads[RECOVERY_KEY].raw,
      currentFamily: journalFamily(reads[RECOVERY_KEY].raw) };
    if (packet.journals.legacyRaw !== null && (packet.journals.currentRaw !== null || raw !== null)) return finish('multiple-authorities');
    if (packet.journals.legacyRaw !== null) return finish('legacy-recovery-required');
    if (packet.journals.currentRaw !== null) return finish('checkpoint-recovery-required');
    if (raw !== null) {
      const checkpoint = decodeCheckpoint(raw);
      if (!checkpoint) return finish('checkpoint-invalid');
      if (checkpoint.legacyBaseRaw !== legacyRaw) return finish('legacy-drift');
      packet.checkpoint = checkpoint; packet.origin = 'checkpoint';
    } else {
      let projected;
      try { projected = getCheckpoint().fromLegacy(legacyRaw); } catch (_) { return finish('checkpoint-runtime-unavailable'); }
      if (!projected.ok) return finish(projected.reason || 'legacy-invalid');
      packet.checkpoint = projected.checkpoint; packet.origin = legacyRaw === null ? 'seed' : 'legacy';
    }
    packet.ok = true; packet.status = 'ready'; return finish();
  }
  function sameAuthority(storage, packet) {
    if (!packet || !packets.has(packet) || !packet.ok) return { ok: false, reason: 'invalid-authority' };
    for (const key of CORE_KEYS) {
      const current = read(storage, key);
      if (!current.ok) return { ok: false, reason: 'storage-unverified' };
      if (current.raw !== packet.reads[key].raw) return { ok: false, reason: key === LEGACY_KEY ? 'legacy-drift' : 'authority-stale' };
    }
    return { ok: true };
  }
  function issue(packet, operation, operationId, entries, intent) {
    const journal = { version: 2, contract: CONTRACT, phase: 'prepared', operation, operationId,
      legacyBaseRaw: packet.expectedLegacyRaw, entries };
    if (intent) journal.intent = intent;
    const raw = JSON.stringify(journal);
    if (!decodeJournal(raw)) return { ok: false, reason: 'invalid-action-journal' };
    const prepared = freeze({ journal, raw }); preparations.add(prepared);
    return { ok: true, changed: true, prepared };
  }
  function prepareWrite(packet, checkpoint, options) {
    if (!packet || !packets.has(packet) || !packet.ok || !options
      || !['workspace', 'undo', 'authoring-handoff'].includes(options.operation)
      || typeof options.operationId !== 'string' || !options.operationId.trim()) return { ok: false, reason: 'invalid-preparation' };
    let valid;
    try { valid = getCheckpoint().validateCheckpoint(checkpoint).ok; } catch (_) { valid = false; }
    if (!valid || checkpoint.legacyBaseRaw !== packet.expectedLegacyRaw) return { ok: false, reason: 'invalid-candidate' };
    const candidateRaw = JSON.stringify(checkpoint);
    if (sameData(checkpoint, packet.checkpoint)) return { ok: true, changed: false, status: 'no-op' };
    const entries = [{ key: STORAGE_KEY, beforeRaw: packet.expectedCheckpointRaw, afterRaw: candidateRaw }];
    if (options.operation === 'authoring-handoff') {
      if (!own(options, 'expectedDraftRaw') || !rawValue(options.expectedDraftRaw)) return { ok: false, reason: 'draft-unverified' };
      entries.push({ key: DRAFT_KEY, beforeRaw: options.expectedDraftRaw, afterRaw: null });
    }
    return issue(packet, options.operation, options.operationId, entries);
  }
  function prepareReset(storage, packet, operationId) {
    const guard = sameAuthority(storage, packet);
    if (!guard.ok) return guard;
    if (typeof operationId !== 'string' || !operationId.trim()) return { ok: false, reason: 'invalid-operation-id' };
    const entries = [];
    for (const key of RESET_KEYS) {
      const value = read(storage, key);
      if (!value.ok) return { ok: false, reason: 'reset-unverified' };
      if ((key === STORAGE_KEY && value.raw !== packet.expectedCheckpointRaw)
        || (key === LEGACY_KEY && value.raw !== packet.expectedLegacyRaw)) return { ok: false, reason: 'reset-authority-stale' };
      entries.push({ key, beforeRaw: value.raw, afterRaw: null });
    }
    const checked = sameAuthority(storage, packet);
    if (!checked.ok) return checked;
    if (entries.every(entry => entry.beforeRaw === null)) return { ok: true, changed: false, status: 'no-op' };
    return issue(packet, 'reset', operationId, entries);
  }
  function preparePermanentDelete(packet, input, operationId) {
    if (!packet || !packets.has(packet) || !packet.ok || !input || typeof operationId !== 'string' || !operationId.trim()) return { ok: false, reason: 'invalid-delete-preparation' };
    let plan;
    try {
      plan = getPermanentDelete().planPermanentDelete({ checkpoint: packet.checkpoint, target: input.target,
        confirmed: input.confirmed, expectedRevision: input.expectedRevision, sourceCandidateRaw: input.sourceCandidateRaw, now: input.now });
    } catch (_) { return { ok: false, reason: 'delete-runtime-unavailable' }; }
    if (!plan.ok || !plan.changed) return { ok: plan.ok, changed: false, reason: plan.reason, status: plan.ok ? 'no-op' : 'blocked' };
    const entries = [
      { key: STORAGE_KEY, beforeRaw: packet.expectedCheckpointRaw, afterRaw: JSON.stringify(plan.checkpoint) },
      { key: LEGACY_KEY, beforeRaw: packet.expectedLegacyRaw, afterRaw: plan.legacyRaw },
      { key: SOURCE_KEY, beforeRaw: input.sourceCandidateRaw, afterRaw: plan.sourceCandidateRaw }
    ];
    return issue(packet, 'permanent-delete', operationId, entries,
      { target: input.target, expectedRevision: input.expectedRevision, now: input.now });
  }
  function readEntries(storage, journal) {
    const values = journal.entries.map(entry => read(storage, entry.key));
    if (values.some(value => !value.ok)) return { ok: false, reason: 'target-read-error' };
    return { ok: true, values: values.map(value => value.raw) };
  }
  function legacyStatus(storage, journal, position) {
    const oldJournal = read(storage, LEGACY_RECOVERY_KEY);
    if (!oldJournal.ok) return 'journal-read-error';
    if (oldJournal.raw !== null) return 'journal-present';
    const old = read(storage, LEGACY_KEY);
    if (!old.ok) return 'read-error';
    if (journal.operation === 'reset' || journal.operation === 'permanent-delete') {
      const afterRaw = journal.entries[1].afterRaw;
      if (position === 'after') return old.raw === afterRaw ? 'matching' : 'drift';
      if (position === 'owned') return old.raw === journal.legacyBaseRaw || old.raw === afterRaw ? 'matching' : 'drift';
    }
    return old.raw === journal.legacyBaseRaw ? 'matching' : 'drift';
  }
  function mutate(storage, key, raw, counts) {
    if (key === RECOVERY_KEY) counts.journalWriteCount += 1;
    else counts.writeCount += 1;
    try { if (raw === null) storage.removeItem(key); else storage.setItem(key, raw); }
    catch (_) { /* A throw-after is decided by exact readback, not by the exception alone. */ }
    const actual = read(storage, key);
    return actual.ok && actual.raw === raw;
  }
  function counts() { return { writeCount: 0, journalWriteCount: 0 }; }
  function commitPrepared(storage, prepared) {
    const tally = counts();
    const result = (status, reason, extra) => Object.assign({ ok: status === 'committed', status, reason: reason || null }, tally, extra || {});
    if (!prepared || !preparations.has(prepared) || dispatched.has(prepared)) return result('blocked', 'invalid-or-replayed-preparation');
    dispatched.add(prepared);
    const journal = prepared.journal;
    const before = readEntries(storage, journal);
    const currentJournal = read(storage, RECOVERY_KEY);
    if (!before.ok || !currentJournal.ok) return result('blocked', 'storage-unverified');
    if (legacyStatus(storage, journal, 'before') !== 'matching' || currentJournal.raw !== null
      || before.values.some((raw, index) => raw !== journal.entries[index].beforeRaw)) return result('stale', 'authority-stale');
    if (!mutate(storage, RECOVERY_KEY, prepared.raw, tally)) return result('recovery-required', 'prepared-unverified', { journalRaw: prepared.raw });
    for (let index = 0; index < journal.entries.length; index += 1) {
      const current = readEntries(storage, journal);
      const owner = read(storage, RECOVERY_KEY);
      if (!current.ok || !owner.ok || owner.raw !== prepared.raw || legacyStatus(storage, journal, ['reset', 'permanent-delete'].includes(journal.operation) ? 'owned' : 'before') !== 'matching'
        || current.values.some((raw, i) => raw !== journal.entries[i][i < index ? 'afterRaw' : 'beforeRaw'])) return result('recovery-required', 'prepared-owner-drift', { journalRaw: prepared.raw });
      const entry = journal.entries[index];
      if (entry.beforeRaw !== entry.afterRaw && !mutate(storage, entry.key, entry.afterRaw, tally)) return result('recovery-required', 'target-unverified', { journalRaw: prepared.raw });
    }
    const targets = readEntries(storage, journal);
    const owner = read(storage, RECOVERY_KEY);
    if (!targets.ok || !owner.ok || owner.raw !== prepared.raw || legacyStatus(storage, journal, 'after') !== 'matching'
      || targets.values.some((raw, index) => raw !== journal.entries[index].afterRaw)) return result('recovery-required', 'confirmation-owner-drift', { journalRaw: prepared.raw });
    const confirmedRaw = JSON.stringify(Object.assign({}, journal, { phase: 'confirmed' }));
    const confirmed = mutate(storage, RECOVERY_KEY, confirmedRaw, tally);
    const finalTargets = readEntries(storage, journal);
    const finalJournal = read(storage, RECOVERY_KEY);
    if (!confirmed || !finalJournal.ok || finalJournal.raw !== confirmedRaw || !finalTargets.ok
      || finalTargets.values.some((raw, index) => raw !== journal.entries[index].afterRaw)) return result('commit-uncertain', 'confirmation-unverified', { journalRaw: confirmedRaw });
    // A later base conflict locks future work; it does not undo an observed
    // confirmed commit or turn it back into an unconfirmed candidate.
    const baseStatus = legacyStatus(storage, journal, 'after');
    const receipt = freeze({ journalRaw: confirmedRaw, operationId: journal.operationId }); receipts.add(receipt);
    return result('committed', null, { journalRaw: confirmedRaw, receipt, legacyStatus: baseStatus, canResume: baseStatus === 'matching',
      // Old private bytes remain inside the journal until verified cleanup.
      deletionComplete: false, requiresDeletionCleanup: journal.operation === 'permanent-delete' });
  }
  function loadActionRecovery(storage) {
    const current = read(storage, RECOVERY_KEY);
    if (!current.ok) return { ok: false, status: 'blocked', reason: 'journal-read-error' };
    if (current.raw === null) return { ok: true, status: 'none', journalRaw: null };
    const journal = decodeJournal(current.raw);
    if (!journal) return { ok: false, status: 'blocked', reason: 'unknown-action-journal', journalRaw: current.raw };
    const targets = readEntries(storage, journal);
    const old = read(storage, LEGACY_RECOVERY_KEY);
    const baseStatus = legacyStatus(storage, journal, journal.phase === 'confirmed' ? 'after' : 'owned');
    if (!old.ok || old.raw !== null || !targets.ok) return { ok: false, status: 'blocked', reason: !targets.ok ? targets.reason : 'legacy-journal-present', journalRaw: current.raw, journal, legacyStatus: baseStatus };
    const owned = targets.values.every((raw, index) => raw === journal.entries[index].beforeRaw || raw === journal.entries[index].afterRaw);
    const exactAfter = targets.values.every((raw, index) => raw === journal.entries[index].afterRaw);
    return { ok: owned && (journal.phase === 'prepared' || exactAfter), status: owned && (journal.phase === 'prepared' || exactAfter) ? journal.phase : 'blocked',
      reason: owned && (journal.phase === 'prepared' || exactAfter) ? null : 'target-foreign', journalRaw: current.raw, journal,
      legacyStatus: baseStatus, canResume: baseStatus === 'matching' };
  }
  function recoverAction(storage, options) {
    const tally = counts();
    const done = (ok, reason, journal, status) => {
      const baseStatus = journal ? legacyStatus(storage, journal, journal.phase === 'confirmed' ? 'after' : 'before') : 'unverified';
      return Object.assign({ ok, status: status || (ok ? 'recovered' : 'blocked'), reason: reason || null,
        legacyStatus: baseStatus, canResume: ok && baseStatus === 'matching' }, tally);
    };
    const expectedRaw = options && options.expectedJournalRaw;
    const journal = decodeJournal(expectedRaw);
    if (!journal) return done(false, 'invalid-recovery');
    const position = journal.phase === 'confirmed' ? 'afterRaw' : 'beforeRaw';
    const old = read(storage, LEGACY_RECOVERY_KEY);
    const owner = read(storage, RECOVERY_KEY);
    const current = readEntries(storage, journal);
    if (!old.ok || old.raw !== null || !owner.ok || !current.ok) return done(false, 'recovery-unverified', journal);
    const allExpected = current.values.every((raw, index) => raw === journal.entries[index][position]);
    if (owner.raw !== expectedRaw && !(owner.raw === null && allExpected)) return done(false, 'journal-foreign', journal);
    if (!current.values.every((raw, index) => raw === journal.entries[index].beforeRaw || raw === journal.entries[index].afterRaw)) return done(false, 'target-foreign', journal);
    if (journal.phase === 'confirmed' && !allExpected) return done(false, 'confirmed-target-drift', journal);
    if (journal.phase === 'prepared') {
      for (let index = journal.entries.length - 1; index >= 0; index -= 1) {
        const entry = journal.entries[index];
        const values = readEntries(storage, journal);
        const exactOwner = read(storage, RECOVERY_KEY);
        const oldOwner = read(storage, LEGACY_RECOVERY_KEY);
        if (!values.ok || !exactOwner.ok || !oldOwner.ok || oldOwner.raw !== null
          || (exactOwner.raw !== expectedRaw && !(exactOwner.raw === null && values.values.every((raw, i) => raw === journal.entries[i].beforeRaw)))
          || !values.values.every((raw, i) => raw === journal.entries[i].beforeRaw || raw === journal.entries[i].afterRaw)) return done(false, 'recovery-owner-drift', journal);
        if (values.values[index] !== entry.beforeRaw && !mutate(storage, entry.key, entry.beforeRaw, tally)) return done(false, 'restore-unverified', journal);
      }
    }
    const restored = readEntries(storage, journal);
    const lastOwner = read(storage, RECOVERY_KEY);
    const lastOldOwner = read(storage, LEGACY_RECOVERY_KEY);
    if (!restored.ok || !lastOwner.ok || !lastOldOwner.ok || lastOldOwner.raw !== null
      || !restored.values.every((raw, index) => raw === journal.entries[index][position])
      || (lastOwner.raw !== expectedRaw && lastOwner.raw !== null)) return done(false, 'cleanup-owner-drift', journal);
    if (lastOwner.raw !== null && !mutate(storage, RECOVERY_KEY, null, tally)) return done(false, 'cleanup-unverified', journal);
    const final = readEntries(storage, journal);
    const finalJournal = read(storage, RECOVERY_KEY);
    const finalOldOwner = read(storage, LEGACY_RECOVERY_KEY);
    if (!final.ok || !finalJournal.ok || !finalOldOwner.ok || finalOldOwner.raw !== null || finalJournal.raw !== null
      || !final.values.every((raw, index) => raw === journal.entries[index][position])) return done(false, 'cleanup-readback-unverified', journal);
    const completed = done(true, null, journal, journal.phase === 'confirmed' ? 'cleared' : 'recovered');
    // Cleanup remains an observed fact, but a later conflicting/unknown base
    // cannot certify that the selected private bytes are absent everywhere.
    return Object.assign(completed,
      { deletionComplete: journal.operation === 'permanent-delete' && journal.phase === 'confirmed' && completed.canResume });
  }
  function cleanupCommitted(storage, receipt) {
    if (!receipt || !receipts.has(receipt)) return Object.assign({ ok: false, status: 'blocked', reason: 'invalid-receipt' }, counts());
    const result = recoverAction(storage, { expectedJournalRaw: receipt.journalRaw });
    if (result.ok) receipts.delete(receipt);
    return result;
  }
  return Object.freeze({ CONTRACT, STORAGE_KEY, LEGACY_KEY, DRAFT_KEY, CREATOR_KEY, SOURCE_KEY, RECOVERY_KEY, LEGACY_RECOVERY_KEY, RESET_KEYS,
    loadWorkspace, sameAuthority, prepareWrite, prepareReset, preparePermanentDelete, commitPrepared, decodeJournal, loadActionRecovery, recoverAction, cleanupCommitted });
});
