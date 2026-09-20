/* Explicit entry -> new draft adapter. No app/global state or implicit handoff. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlowPocPersonalEntryAuthoring = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const CONTRACT = 'flowme-standalone-entry-authoring-v1';
  const DRAFT_KEY = 'flow:poc:personal-workspace:v1:standalone-integrated:draft';
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const nullable = value => value === null || typeof value === 'string';
  const result = (status, reason, extra) => Object.freeze(Object.assign({ status }, reason ? { reason } : {}, extra || {}));

  // Only own data fields are consumed. Accessors, symbols, custom prototypes,
  // unknown keys and inherited fields are not current-read evidence.
  function fields(value, names) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    try {
      const proto = Object.getPrototypeOf(value);
      if (proto !== null) {
        const ctor = Object.getOwnPropertyDescriptor(proto, 'constructor');
        if (Object.getPrototypeOf(proto) !== null || !ctor || !own(ctor, 'value') || typeof ctor.value !== 'function'
          || Function.prototype.toString.call(ctor.value) !== 'function Object() { [native code] }'
          || Object.getOwnPropertyDescriptor(ctor.value, 'prototype')?.value !== proto) return null;
      }
      const keys = Reflect.ownKeys(value);
      if (keys.length !== names.length || keys.some(key => typeof key !== 'string' || !names.includes(key))) return null;
      const values = {};
      for (const key of names) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) return null;
        values[key] = descriptor.value;
      }
      return values;
    } catch (_) { return null; }
  }
  function rollbackInfo(value) {
    if (!value || !['restored', 'recovery-required'].includes(value.status)) return Object.freeze({ status: 'recovery-required', reason: 'rollback-unverified' });
    const out = { status: value.status };
    if (typeof value.reason === 'string') out.reason = value.reason;
    if (Number.isSafeInteger(value.rollbackWriteCount) && value.rollbackWriteCount >= 0) out.rollbackWriteCount = value.rollbackWriteCount;
    return Object.freeze(out);
  }
  function create(options) {
    const config = fields(options, ['model', 'storage', 'read', 'makeDraftId']);
    const tickets = new WeakMap(), ids = new Set();
    let recoveryRequired = false, inFlight = false, valid = false;
    let model, storage, read, makeDraftId, loadDraft, writeCandidate, restoreCandidate;
    try {
      if (config) {
        ({ model, storage, read, makeDraftId } = config);
        valid = Boolean(model && model.VERSION === VERSION && model.DRAFT_STORAGE_KEY === DRAFT_KEY
          && ['loadAuthoringDraft', 'writeAuthoringDraftCandidate', 'restoreAuthoringDraftCandidate'].every(key => typeof model[key] === 'function')
          && storage && ['getItem', 'setItem', 'removeItem'].every(key => typeof storage[key] === 'function')
          && typeof read === 'function' && typeof makeDraftId === 'function');
        if (valid) {
          loadDraft = model.loadAuthoringDraft.bind(model);
          writeCandidate = model.writeAuthoringDraftCandidate.bind(model);
          restoreCandidate = model.restoreAuthoringDraftCandidate.bind(model);
        }
      }
    } catch (_) { valid = false; }
    // The injected read is an app I/O boundary, not caller-supplied permission.
    // Its source/workspace observation epochs must be monotonic across ABA.
    // Direct draft CAS additionally verifies its captured draft bytes below.
    function currentRead() {
      try {
        const packet = fields(read(), ['ok', 'binding', 'scopeBinding', 'draftRaw', 'libraryRaw']);
        if (!packet || packet.ok !== true || !text(packet.binding) || !text(packet.scopeBinding)
          || !nullable(packet.draftRaw) || !nullable(packet.libraryRaw)) return null;
        return Object.freeze(packet);
      } catch (_) { return null; }
    }
    function capturedDraft(raw) {
      return loadDraft(Object.freeze({ getItem(key) { if (key !== DRAFT_KEY) throw Error('wrong-draft-key'); return raw; } }));
    }
    function ticketRecord(ticket) {
      return ticket && typeof ticket === 'object' ? tickets.get(ticket) : undefined;
    }
    function prepare(raw, expectedBinding) {
      if (!valid) return result('failed', 'entry-authoring-unavailable');
      if (recoveryRequired) return result('recovery-required', 'entry-recovery-required');
      if (inFlight) return result('failed', 'entry-attempt-pending');
      if (!text(raw) || !text(expectedBinding)) return result('failed', 'invalid-entry-source');
      const packet = currentRead();
      if (!packet) return result('failed', 'entry-read-failed');
      if (packet.binding !== expectedBinding) return result('stale', 'entry-binding-changed');
      try {
        const old = capturedDraft(packet.draftRaw);
        if (!old || !['empty', 'restored'].includes(old.status)) return result('failed', 'invalid-existing-draft');
        const draftId = makeDraftId();
        if (!text(draftId) || ids.has(draftId) || old.status === 'restored' && draftId === old.authoring.draftId) return result('failed', 'invalid-new-draft-id');
        const candidate = Object.freeze({ version: VERSION, draftId, rawText: raw, templateId: null, folderId: null,
          creatorDraftId: null, creatorDraftRevision: null });
        const candidateBytes = JSON.stringify(candidate), decoded = capturedDraft(candidateBytes);
        if (decoded.status !== 'restored' || decoded.authoring.rawText !== raw || decoded.authoring.draftId !== draftId) return result('failed', 'invalid-new-draft');
        ids.add(draftId);
        const ticket = Object.freeze({ version: VERSION, contract: CONTRACT });
        tickets.set(ticket, Object.freeze({ packet, candidate, candidateBytes, authoring: Object.freeze(decoded.authoring) }));
        return result('ready', null, { ticket, replacesDraft: packet.draftRaw !== null });
      } catch (_) { return result('failed', 'entry-prepare-failed'); }
    }
    function cancel(ticket) {
      if (!ticketRecord(ticket)) return result('failed', 'invalid-entry-ticket');
      tickets.delete(ticket);
      return result('canceled');
    }
    function commit(ticket) {
      const record = ticketRecord(ticket);
      if (!record) return result('failed', 'invalid-entry-ticket');
      // Consume before any callback/storage call, including reentrant callbacks.
      tickets.delete(ticket);
      if (recoveryRequired) return result('recovery-required', 'entry-recovery-required');
      if (inFlight) return result('failed', 'entry-attempt-pending');
      inFlight = true;
      try { return commitRecord(record); }
      finally { inFlight = false; }
    }
    function commitRecord(record) {
      const packet = currentRead();
      if (!packet) return result('failed', 'entry-read-failed');
      if (packet.binding !== record.packet.binding || packet.scopeBinding !== record.packet.scopeBinding
        || packet.draftRaw !== record.packet.draftRaw || packet.libraryRaw !== record.packet.libraryRaw) return result('stale', 'entry-binding-changed');
      const calls = { setItem: 0, removeItem: 0 };
      const facade = Object.freeze({
        getItem(key) { if (key !== DRAFT_KEY) throw Error('wrong-draft-key'); const raw = storage.getItem(key);
          if (!nullable(raw)) throw Error('invalid-draft-read'); return raw; },
        setItem(key, raw) { if (key !== DRAFT_KEY || typeof raw !== 'string') throw Error('wrong-draft-key'); calls.setItem++; storage.setItem(key, raw); },
        removeItem(key) { if (key !== DRAFT_KEY) throw Error('wrong-draft-key'); calls.removeItem++; storage.removeItem(key); },
      });
      const counters = () => ({ apiCalls: Object.freeze({ setItem: calls.setItem, removeItem: calls.removeItem }) });
      function restore(status, reason) {
        let rollback;
        try { rollback = rollbackInfo(restoreCandidate(facade, record.packet.draftRaw, record.candidateBytes)); }
        catch (_) { rollback = rollbackInfo(null); }
        if (rollback.status !== 'restored') recoveryRequired = true;
        return result(recoveryRequired ? 'recovery-required' : status, reason, Object.assign({ rollback }, counters()));
      }
      let written;
      try { written = writeCandidate(facade, record.candidate, record.packet.draftRaw); }
      catch (_) { return restore('failed', 'draft-writer-threw'); }
      if (!written || written.status !== 'success') {
        if (!written || !['failed', 'stale', 'recovery-required'].includes(written.status)) return restore('failed', 'invalid-draft-writer-result');
        const extra = counters();
        if (written.rollback) extra.rollback = rollbackInfo(written.rollback);
        if (written.status === 'recovery-required' || extra.rollback && extra.rollback.status !== 'restored') recoveryRequired = true;
        return result(recoveryRequired ? 'recovery-required' : written.status, written.reason || 'draft-write-failed', extra);
      }
      if (written.candidateBytes !== record.candidateBytes) return restore('failed', 'candidate-bytes-mismatch');
      const after = currentRead();
      if (!after) return restore('failed', 'entry-post-read-failed');
      if (after.scopeBinding !== record.packet.scopeBinding || after.libraryRaw !== record.packet.libraryRaw) return restore('stale', 'entry-scope-changed');
      if (after.draftRaw !== record.candidateBytes) return restore('stale', 'entry-draft-changed');
      try { if (facade.getItem(DRAFT_KEY) !== record.candidateBytes) return restore('stale', 'entry-draft-changed'); }
      catch (_) { return restore('failed', 'entry-post-draft-read-failed'); }
      // Only this confirmed branch exposes the new document. No source/error
      // bytes escape through failed results or opaque tickets.
      return result('success', null, Object.assign({ authoring: record.authoring, candidateBytes: record.candidateBytes,
        targetWriteCount: written.targetWriteCount }, counters()));
    }
    // No latch-clear API: uncertain writes require the app's explicit recovery
    // boundary. Reloaded instances still decode actual bytes and recapture scope.
    return Object.freeze({ prepare, cancel, commit });
  }
  return Object.freeze({ VERSION, CONTRACT, create });
});
