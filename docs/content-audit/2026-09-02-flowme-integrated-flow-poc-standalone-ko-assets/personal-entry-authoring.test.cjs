'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const M = require('./model.js');
const file = path.join(__dirname, 'personal-entry-authoring.js');
const A = fs.existsSync(file) ? require(file) : {};
const KEY = M.DRAFT_STORAGE_KEY, LIBRARY = M.CREATOR_DRAFT_STORAGE_KEY;
const bytes = JSON.stringify;
const hash = file => fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;
const sourceFiles = [file, __filename, path.join(__dirname, 'model.js')];
const beforeSources = sourceFiles.map(file => ({ file: path.basename(file), sha256: hash(file) }));
const evidence = [];
test.after(() => {
  assert.deepEqual(sourceFiles.map(file => ({ file: path.basename(file), sha256: hash(file) })), beforeSources);
  console.log('ENTRY_AUTHORING_BOUNDARY ' + bytes({ sources: beforeSources, sourceExact: true, runs: evidence,
    scope: 'actual M draft CAS/rollback with isolated memory storage; no browser/OS/native-history claim' }));
});
function api(module = A) { assert.equal(typeof module.create, 'function', 'new entry authoring adapter exists'); return module; }
function authoring(rawText = '# Existing A\n- [ ] preserved', draftId = 'old-A') {
  return { draftId, rawText, templateId: null, folderId: null, creatorDraftId: null, creatorDraftRevision: null };
}
function encoded(value) { const memory = M.createMemoryStorage(); M.writeAuthoringDraft(memory, value); return memory.getItem(KEY); }
function setup(options = {}) {
  const initial = options.empty ? null : encoded(authoring());
  const map = new Map([[KEY, initial], [LIBRARY, bytes(M.initialCreatorDraftLibrary())], ['flow:operating:sentinel', '  OPERATING\r\n '], ['flow:poc:personal-workspace:v1:workspace-sentinel', 'WORKSPACE']]);
  const f = { map, initial, writes: [], reads: 0, readCount: 0, idCount: 0, forbidden: [], sourceEpoch: 0, workspaceEpoch: 0,
    hook: {}, inRead: false, label: options.label || 'isolated', model: options.model || M };
  const initialOthers = [...map].filter(([key]) => key !== KEY);
  f.storage = {
    getItem(key) { f.reads++; const packet = { key, authority: f.inRead, value: map.get(key) ?? null };
      const overridden = f.hook.get && f.hook.get(packet); return overridden && Object.hasOwn(overridden, 'value') ? overridden.value : packet.value; },
    setItem(key, value) { const call = { api: 'setItem', key, changed: false }; f.writes.push(call);
      if (key !== KEY) f.forbidden.push(call); if (f.hook.beforeSet) f.hook.beforeSet(key, value);
      call.changed = (map.get(key) ?? null) !== value; map.set(key, value); if (f.hook.afterSet) f.hook.afterSet(key, value); },
    removeItem(key) { const call = { api: 'removeItem', key, changed: false }; f.writes.push(call);
      if (key !== KEY) f.forbidden.push(call); if (f.hook.beforeRemove) f.hook.beforeRemove(key);
      call.changed = map.has(key) && map.get(key) !== null; map.delete(key); },
    clear() { f.forbidden.push({ api: 'clear' }); throw Error('clear-forbidden'); },
  };
  f.scope = () => bytes([f.sourceEpoch, f.workspaceEpoch, map.get(LIBRARY)]);
  f.binding = () => bytes([f.scope(), map.get(KEY) ?? null]);
  f.read = () => {
    f.readCount++; if (f.hook.read) { const result = f.hook.read(); if (result !== undefined) return result; }
    f.inRead = true;
    try { return { ok: true, binding: f.binding(), scopeBinding: f.scope(), draftRaw: f.storage.getItem(KEY), libraryRaw: f.storage.getItem(LIBRARY) }; }
    finally { f.inRead = false; }
  };
  f.adapter = api(options.module).create({ model: f.model, storage: f.storage, read: f.read,
    makeDraftId: () => { f.idCount++; return f.hook.id ? f.hook.id() : 'entry-' + f.idCount; } });
  f.prepare = raw => f.adapter.prepare(raw === undefined ? '# New B\n- [ ] new item' : raw, f.binding());
  f.finish = () => {
    assert.deepEqual(f.forbidden, []); assert.deepEqual([...map].filter(([key]) => key !== KEY), initialOthers);
    evidence.push({ label: f.label, targetApiCalls: f.writes.length, targetChangedCalls: f.writes.filter(c => c.changed).length,
      otherKeyCalls: 0, clear: 0 });
  };
  return f;
}
function ready(f, raw) { const result = f.prepare(raw); assert.equal(result.status, 'ready', result.reason); return result; }
function unchanged(f) { assert.equal(f.map.get(KEY) ?? null, f.initial); assert.equal(f.writes.length, 0); f.finish(); }

test('EA01 invalid/empty raw fails before read, id generation or storage calls', () => {
  const f = setup(); let coercions = 0;
  for (const raw of ['', ' \r\n\t ', null, undefined, 1, {}, { toString() { coercions++; return 'evil'; } }]) {
    assert.equal(f.adapter.prepare(raw, f.binding()).status, 'failed');
  }
  assert.equal(coercions, 0); assert.equal(f.readCount, 0); assert.equal(f.idCount, 0); unchanged(f);
});
test('EA02 expected binding mismatch is stale before candidate identity generation', () => {
  const f = setup(); assert.equal(f.adapter.prepare('new', 'foreign').status, 'stale'); assert.equal(f.idCount, 0); unchanged(f);
});
test('EA03 prepare only issues a frozen opaque per-instance ticket and performs no write', () => {
  const f = setup({ empty: true }), result = ready(f);
  assert.equal(result.replacesDraft, false); assert.deepEqual(Object.keys(result.ticket).sort(), ['contract', 'version']);
  assert.equal(result.ticket.version, 1); assert.equal(result.ticket.contract, A.CONTRACT);
  assert.equal(Object.isFrozen(result), true); assert.equal(Object.isFrozen(result.ticket), true);
  assert.equal(Object.hasOwn(result, 'authoring'), false); assert.equal(Object.hasOwn(result, 'candidateBytes'), false); unchanged(f);
});
test('EA04 corrupt existing draft is rejected by actual M decoder without replacement', () => {
  const f = setup(); f.map.set(KEY, '{corrupt'); f.initial = '{corrupt';
  assert.equal(f.prepare('new').status, 'failed'); assert.equal(f.idCount, 0); unchanged(f);
});
test('EA05 successful empty-to-new handoff writes only draft once and clears prior document metadata', () => {
  const f = setup({ empty: true }); const result = f.adapter.commit(ready(f).ticket);
  assert.equal(result.status, 'success'); assert.equal(result.targetWriteCount, 1); assert.equal(f.writes.length, 1);
  assert.equal(result.candidateBytes, f.map.get(KEY)); assert.equal(Object.isFrozen(result.authoring), true);
  const actual = M.loadAuthoringDraft(f.storage); assert.equal(actual.status, 'restored');
  for (const field of ['templateId', 'folderId', 'creatorDraftId', 'creatorDraftRevision']) assert.equal(actual.authoring[field], null);
  assert.notEqual(actual.authoring.draftId, 'old-A'); assert.equal(actual.authoring.rawText, '# New B\n- [ ] new item'); f.finish();
});
test('EA06 replacement keeps exact leading LF, CRLF, spaces and unicode in durable new source', () => {
  const f = setup(), raw = '\n  첫 줄\r\n둘째 줄 🧭\n끝  ', prepared = ready(f, raw);
  assert.equal(prepared.replacesDraft, true); const result = f.adapter.commit(prepared.ticket);
  assert.equal(result.status, 'success'); assert.equal(result.authoring.rawText, raw);
  assert.equal(M.loadAuthoringDraft(f.storage).authoring.rawText, raw); f.finish();
});
test('EA07 cancel consumes only its genuine ticket, then reuse and clones cause no I/O', () => {
  const f = setup(), ticket = ready(f).ticket;
  assert.equal(f.adapter.cancel(ticket).status, 'canceled'); const before = f.reads;
  assert.equal(f.adapter.commit(ticket).status, 'failed'); assert.equal(f.adapter.cancel(ticket).status, 'failed');
  assert.equal(f.adapter.commit({ ...ticket }).status, 'failed'); assert.equal(f.reads, before); unchanged(f);
});
test('EA08 commit consumes before I/O so reuse cannot save a second time', () => {
  const f = setup(), ticket = ready(f).ticket;
  assert.equal(f.adapter.commit(ticket).status, 'success'); const before = [f.reads, f.writes.length];
  assert.equal(f.adapter.commit(ticket).status, 'failed'); assert.deepEqual([f.reads, f.writes.length], before); f.finish();
});
test('EA09 another factory, forged object and accessor ticket never gain ownership', () => {
  const f = setup(), other = setup(), ticket = ready(f).ticket; let getters = 0;
  const fake = Object.defineProperty({}, 'version', { get() { getters++; return 1; } });
  assert.equal(other.adapter.commit(ticket).status, 'failed'); assert.equal(f.adapter.commit(fake).status, 'failed');
  assert.equal(getters, 0); unchanged(f); unchanged(other);
});
test('EA10 source/workspace/library/draft preflight drift denies all writes and consumes old tickets', () => {
  for (const kind of ['source', 'workspace', 'library', 'draft']) {
    const f = setup({ label: kind + '-preflight' }), ticket = ready(f).ticket, beforeLibrary = f.map.get(LIBRARY);
    if (kind === 'source') f.sourceEpoch++; if (kind === 'workspace') f.workspaceEpoch++;
    if (kind === 'library') f.map.set(LIBRARY, 'external-library'); if (kind === 'draft') f.map.set(KEY, encoded(authoring('External B', 'foreign-B')));
    const expected = f.map.get(KEY); assert.equal(f.adapter.commit(ticket).status, 'stale'); assert.equal(f.map.get(KEY), expected);
    assert.equal(f.writes.length, 0); assert.equal(f.adapter.commit(ticket).status, 'failed');
    f.map.set(LIBRARY, beforeLibrary); f.finish();
  }
});
test('EA11 direct draft CAS rejects a stale authority packet rather than trusting read callback bytes', () => {
  const f = setup(), packet = f.read(), ticket = ready(f).ticket;
  f.map.set(KEY, encoded(authoring('External B', 'foreign-B'))); const expected = f.map.get(KEY); f.hook.read = () => packet;
  assert.equal(f.adapter.commit(ticket).status, 'stale'); assert.equal(f.map.get(KEY), expected); assert.equal(f.writes.length, 0); f.finish();
});
test('EA12 quota before mutation reports failed with one attempted API and no changed bytes', () => {
  const f = setup(), ticket = ready(f).ticket; f.hook.beforeSet = () => { throw Error('QuotaExceededError'); };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'failed'); assert.equal(result.rollback.status, 'restored');
  assert.equal(f.map.get(KEY), f.initial); assert.equal(f.writes.length, 1); assert.equal(f.writes[0].changed, false); f.finish();
});
test('EA13 throw-after owned candidate restores exact original A, with both physical writes counted', () => {
  const f = setup(), ticket = ready(f).ticket; f.hook.afterSet = () => { if (f.writes.length === 1) throw Error('after-write'); };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'failed'); assert.equal(result.rollback.status, 'restored');
  assert.equal(f.map.get(KEY), f.initial); assert.equal(f.writes.length, 2); f.finish();
});
test('EA14 writer readback mismatch restores own candidate and never adopts it as success', () => {
  const f = setup(), ticket = ready(f).ticket; let injected = false;
  f.hook.get = info => { if (!info.authority && f.writes.length === 1 && !injected) { injected = true; return { value: 'mismatched-readback' }; } };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'failed'); assert.equal(result.rollback.status, 'restored');
  assert.equal(f.map.get(KEY), f.initial); assert.equal(f.writes.length, 2); f.finish();
});
test('EA15 foreign B after write error is preserved and permanently latches this adapter recovery', () => {
  const f = setup(), ticket = ready(f).ticket, foreign = encoded(authoring('External B', 'foreign-B'));
  f.hook.afterSet = () => { f.map.set(KEY, foreign); throw Error('foreign-after-write'); };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'recovery-required'); assert.equal(f.map.get(KEY), foreign);
  assert.equal(result.rollback.reason, 'draft-changed'); assert.equal(f.prepare('retry').status, 'recovery-required');
  assert.equal(f.writes.length, 1); f.finish();
});
test('EA16 uncertain own rollback latches recovery and reveals no candidate/source on failure', () => {
  const f = setup(), ticket = ready(f).ticket;
  f.hook.afterSet = () => { if (f.writes.length === 1) throw Error('after-write'); };
  f.hook.beforeSet = () => { if (f.writes.length > 1) throw Error('rollback-failure'); };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'recovery-required');
  assert.equal(Object.hasOwn(result, 'candidateBytes'), false); assert.equal(Object.hasOwn(result, 'authoring'), false);
  assert.equal(f.prepare('retry').status, 'recovery-required'); assert.equal(f.writes.length, 2); f.finish();
});
test('EA17 post-success scope drift rolls back only owned candidate, not a successful new document', () => {
  const f = setup(), ticket = ready(f).ticket;
  f.hook.read = () => { if (f.writes.length === 1) f.sourceEpoch++; };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'stale'); assert.equal(result.rollback.status, 'restored');
  assert.equal(f.map.get(KEY), f.initial); assert.equal(f.writes.length, 2); f.finish();
});
test('EA18 post-success read failure restores A and exposes no successful authoring', () => {
  const f = setup(), ticket = ready(f).ticket; f.hook.read = () => { if (f.writes.length === 1) throw Error('post-read'); };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'failed'); assert.equal(result.rollback.status, 'restored');
  assert.equal(f.map.get(KEY), f.initial); assert.equal(Object.hasOwn(result, 'authoring'), false); f.finish();
});
test('EA19 post-success foreign B survives failed ownership check with rollback zero writes', () => {
  const f = setup(), ticket = ready(f).ticket, foreign = encoded(authoring('External B', 'foreign-B'));
  f.hook.read = () => { if (f.writes.length === 1) f.map.set(KEY, foreign); };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'recovery-required');
  assert.equal(f.map.get(KEY), foreign); assert.equal(result.rollback.rollbackWriteCount, 0); assert.equal(f.writes.length, 1); f.finish();
});
test('EA20 empty baseline rollback removes only own new draft and verifies null', () => {
  const f = setup({ empty: true }), ticket = ready(f).ticket;
  f.hook.read = () => { if (f.writes.length === 1) f.workspaceEpoch++; };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'stale'); assert.equal(result.rollback.status, 'restored');
  assert.equal(f.map.get(KEY) ?? null, null); assert.deepEqual(f.writes.map(call => call.api), ['setItem', 'removeItem']); f.finish();
});
test('EA21 failed or unsafe read packets fail closed without invoking data getters', () => {
  const f = setup(); let getters = 0;
  for (const value of [{ ok: false, reason: 'read-error' }, null, { ok: true }, Object.defineProperty({}, 'ok', { get() { getters++; return true; } })]) {
    f.hook.read = () => value; assert.equal(f.prepare('new').status, 'failed');
  }
  assert.equal(getters, 0); unchanged(f);
});
test('EA22 read throws before commit without candidate write and failed attempts stay consumed', () => {
  const f = setup(), ticket = ready(f).ticket; f.hook.read = () => { throw Error('authority-unavailable'); };
  assert.equal(f.adapter.commit(ticket).status, 'failed'); assert.equal(f.adapter.commit(ticket).status, 'failed'); unchanged(f);
});
test('EA23 invalid, existing and previously allocated draft IDs cannot identify a new document', () => {
  const f = setup(); for (const id of ['', 'old-A', {}, null]) { f.hook.id = () => id; assert.equal(f.prepare('new').status, 'failed'); }
  f.hook.id = () => 'same-id'; const first = ready(f); f.adapter.cancel(first.ticket);
  assert.equal(f.prepare('new').status, 'failed'); unchanged(f);
});
test('EA24 reentrant commit during writer I/O cannot consume the same ticket twice', () => {
  const f = setup(), ticket = ready(f).ticket; let nested;
  f.hook.beforeSet = () => { nested = f.adapter.commit(ticket); };
  assert.equal(f.adapter.commit(ticket).status, 'success'); assert.equal(nested.status, 'failed'); assert.equal(f.writes.length, 1); f.finish();
});
test('EA25 post-read must match actual candidate bytes even when scope remains unchanged', () => {
  const f = setup(), ticket = ready(f).ticket;
  f.hook.read = () => { if (f.writes.length === 1) return { ok: true, binding: f.binding(), scopeBinding: f.scope(), draftRaw: f.initial, libraryRaw: f.map.get(LIBRARY) }; };
  const result = f.adapter.commit(ticket); assert.notEqual(result.status, 'success'); assert.equal(result.rollback.status, 'restored');
  assert.equal(f.map.get(KEY), f.initial); f.finish();
});
test('EA26 UMD factory has no ambient storage, clock or random access; create itself does no I/O', () => {
  api(); const source = fs.readFileSync(file, 'utf8'), context = vm.createContext({}); let ambient = 0;
  for (const key of ['localStorage', 'sessionStorage', 'document', 'fetch', 'Date']) Object.defineProperty(context, key, { get() { ambient++; throw Error('ambient'); } });
  vm.runInContext(source, context); const f = setup({ module: context.FlowPocPersonalEntryAuthoring, empty: true });
  assert.equal(f.reads, 0); assert.equal(f.readCount, 0); assert.equal(f.idCount, 0);
  const ticket = ready(f).ticket; assert.equal(f.adapter.commit(ticket).status, 'success'); assert.equal(ambient, 0); f.finish();
});
test('EA27 invalid factory and foreign-key model attempts cannot reach other storage keys', () => {
  api(); let getters = 0;
  const invalid = Object.defineProperty({}, 'model', { get() { getters++; return M; } });
  assert.equal(A.create(invalid).prepare('new', 'binding').status, 'failed'); assert.equal(getters, 0);
  let rejected = 0;
  const model = { ...M, writeAuthoringDraftCandidate(storage, candidate, before) {
    for (const action of [() => storage.getItem('flow:operating:sentinel'), () => storage.setItem(LIBRARY, 'bad'), () => storage.removeItem(LIBRARY)]) {
      assert.throws(action); rejected++;
    }
    return M.writeAuthoringDraftCandidate(storage, candidate, before);
  } };
  const f = setup({ model }); assert.equal(f.adapter.commit(ready(f).ticket).status, 'success'); assert.equal(rejected, 3); f.finish();
});
test('EA28 actual M prewrite direct draft read error writes nothing and consumes the ticket', () => {
  const f = setup(), ticket = ready(f).ticket;
  f.hook.get = info => { if (!info.authority && info.key === KEY) throw Error('draft-read-error'); };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'failed'); assert.equal(result.reason, 'draft-read-failed');
  assert.equal(f.adapter.commit(ticket).status, 'failed'); unchanged(f);
});
test('EA29 null-baseline rollback remove failure latches recovery instead of offering normal retry', () => {
  const f = setup({ empty: true }), ticket = ready(f).ticket;
  f.hook.read = () => { if (f.writes.length === 1) f.sourceEpoch++; };
  f.hook.beforeRemove = () => { throw Error('remove-failure'); };
  const result = f.adapter.commit(ticket); assert.equal(result.status, 'recovery-required'); assert.equal(result.rollback.status, 'recovery-required');
  assert.equal(f.prepare('retry').status, 'recovery-required'); assert.deepEqual(f.writes.map(call => call.api), ['setItem', 'removeItem']); f.finish();
});
test('EA30 confirmed failed rollback permits only a newly prepared current ticket, never the consumed attempt', () => {
  const f = setup(), ticket = ready(f).ticket;
  f.hook.beforeSet = () => { throw Error('quota'); }; assert.equal(f.adapter.commit(ticket).status, 'failed');
  delete f.hook.beforeSet;
  assert.equal(f.adapter.commit(ticket).status, 'failed'); const fresh = ready(f, 'retry exact raw');
  assert.notEqual(fresh.ticket, ticket); assert.equal(f.adapter.commit(fresh.ticket).status, 'success');
  assert.equal(M.loadAuthoringDraft(f.storage).authoring.rawText, 'retry exact raw'); f.finish();
});
test('EA31 another genuine pending ticket cannot commit reentrantly inside the active writer', () => {
  const f = setup(), first = ready(f, 'FIRST').ticket, second = ready(f, 'SECOND').ticket; let nested;
  f.hook.beforeSet = () => { delete f.hook.beforeSet; nested = f.adapter.commit(second); };
  const result = f.adapter.commit(first);
  assert.equal(result.status, 'success'); assert.equal(nested.status, 'failed'); assert.equal(f.writes.length, 1);
  assert.equal(M.loadAuthoringDraft(f.storage).authoring.rawText, 'FIRST'); f.finish();
});
