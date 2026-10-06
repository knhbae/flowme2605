import assert from 'node:assert/strict';
import test from 'node:test';
import { alphaDocumentCollectionsKey, createAlphaDocumentCollections, type AlphaDocumentCollectionsAuthority,
  type AlphaDocumentCollectionsExclusive, type AlphaDocumentCollectionsStorage } from './alpha-document-collections';
import { addDocumentCollection, emptyDocumentCollections, setDocumentCollectionLink, type DocumentCollections } from './document-collections';

const owner = 'owner-a';
const key = alphaDocumentCollectionsKey(owner);
const collections = () => addDocumentCollection(addDocumentCollection(emptyDocumentCollections(), 'a', '모음 A'), 'b', '모음 B');
const current = (): AlphaDocumentCollectionsAuthority => ({ ownerId: owner, documentIds: ['doc-a', 'doc-b'],
  busy: false, pending: false, blocked: false, sessionValid: true });
function disk(initial?: DocumentCollections) {
  const values = new Map<string, string>();
  if (initial) values.set(key, JSON.stringify(initial));
  let reads = 0, writes = 0;
  const writeKeys: string[] = [];
  const port: AlphaDocumentCollectionsStorage = {
    getItem(key) { reads++; return values.get(key) ?? null; },
    setItem(key, raw) { writes++; writeKeys.push(key); values.set(key, raw); },
  };
  return { values, port, writeKeys, reads: () => reads, writes: () => writes };
}
const immediate: AlphaDocumentCollectionsExclusive = async (_name, work) => work();
function queued() {
  let release: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const exclusive: AlphaDocumentCollectionsExclusive = async (_name, work) => { await gate; return work(); };
  return { exclusive, release: () => release!() };
}

test('account keys and locks isolate owners without reading trial/server/unrelated keys', async () => {
  const storage = disk(), names: string[] = [];
  storage.values.set('flowme:document-collections:trial-links:v1', 'trial bytes');
  storage.values.set('server-document-cache', 'original document bytes');
  const before = [...storage.values.entries()];
  const lock: AlphaDocumentCollectionsExclusive = async (name, work) => { names.push(name); return work(); };
  const a = createAlphaDocumentCollections(owner, storage.port, lock, current);
  const b = createAlphaDocumentCollections('owner-b', storage.port, lock, () => ({ ...current(), ownerId: 'owner-b', documentIds: ['b-doc'] }));
  assert.deepEqual(await a.change(() => collections()), { ok: true, changed: true });
  assert.deepEqual(b.snapshot().value, emptyDocumentCollections());
  assert.deepEqual(await b.change(state => addDocumentCollection(state, 'b-only', 'B')), { ok: true, changed: true });
  assert.deepEqual(names, [`${key}:write`, `${alphaDocumentCollectionsKey('owner-b')}:write`]);
  assert.deepEqual(storage.writeKeys, [key, alphaDocumentCollectionsKey('owner-b')]);
  for (const [key, bytes] of before) assert.equal(storage.values.get(key), bytes);
  assert.notEqual(alphaDocumentCollectionsKey('a:b'), alphaDocumentCollectionsKey('a%3Ab'));
  assert.throws(() => alphaDocumentCollectionsKey(' '));
});

test('only absent bytes load empty and unchanged empty state writes nothing', async () => {
  const storage = disk(), adapter = createAlphaDocumentCollections(owner, storage.port, immediate, current);
  assert.deepEqual(adapter.snapshot().value, emptyDocumentCollections());
  assert.deepEqual(await adapter.change(state => state), { ok: true, changed: false });
  assert.equal(storage.writes(), 0); assert.equal(storage.values.has(key), false);
  assert.equal(adapter.snapshot().writable, true);
});

test('invalid existing bytes stay untouched and never become an empty writable relation', async () => {
  for (const raw of ['', '{', 'null', '[]', '{"version":1,"collections":[],"body":"hidden"}',
    '{"version":2,"version":1,"collections":[]}', JSON.stringify({ version: 1, collections: [{ id: 'a', title: 'A', documentIds: ['x', 'x'] }] })]) {
    const storage = disk(); storage.values.set(key, raw);
    const adapter = createAlphaDocumentCollections(owner, storage.port, immediate, current);
    assert.equal(adapter.snapshot().value, null); assert.equal(adapter.snapshot().reason, 'invalid-storage');
    let callbacks = 0;
    assert.deepEqual(await adapter.change(() => { callbacks++; return collections(); }), { ok: false, reason: 'invalid-storage' });
    assert.equal(callbacks, 0); assert.equal(storage.writes(), 0); assert.equal(storage.values.get(key), raw);
  }
});

test('loaded relations and snapshots are detached; links save under lock with exact CAS and readback', async () => {
  const storage = disk(collections()); let locked = false, lockCalls = 0;
  const port: AlphaDocumentCollectionsStorage = { getItem: storage.port.getItem,
    setItem(key, bytes) { assert.equal(locked, true); storage.port.setItem(key, bytes); } };
  const exclusive: AlphaDocumentCollectionsExclusive = async (_name, work) => {
    lockCalls++; locked = true; try { return await work(); } finally { locked = false; }
  };
  const adapter = createAlphaDocumentCollections(owner, port, exclusive, current);
  const snapshot = adapter.snapshot(); snapshot.value!.collections[0].documentIds.push('snapshot-only');
  const initialReads = storage.reads();
  assert.deepEqual(await adapter.change(state => setDocumentCollectionLink(state, 'a', 'doc-a', true)), { ok: true, changed: true });
  assert.equal(lockCalls, 1); assert.equal(storage.reads(), initialReads + 2); assert.equal(storage.writes(), 1);
  assert.deepEqual(adapter.snapshot().value!.collections[0].documentIds, ['doc-a']);
  assert.deepEqual(await adapter.change(state => setDocumentCollectionLink(state, 'a', 'doc-a', true)), { ok: true, changed: false });
  assert.equal(storage.writes(), 1);
  const reloaded = createAlphaDocumentCollections(owner, storage.port, immediate, current);
  assert.deepEqual(reloaded.snapshot().value, adapter.snapshot().value);
});

test('new links require actual owner document IDs; old unknown/deleted links are preserved per collection', async () => {
  const initial = setDocumentCollectionLink(collections(), 'a', 'deleted-doc', true);
  const storage = disk(initial), adapter = createAlphaDocumentCollections(owner, storage.port, immediate, current);
  assert.deepEqual(await adapter.change(state => setDocumentCollectionLink(state, 'b', 'foreign-doc', true)), { ok: false, reason: 'foreign-document' });
  assert.deepEqual(await adapter.change(state => setDocumentCollectionLink(state, 'b', 'deleted-doc', true)), { ok: false, reason: 'foreign-document' });
  assert.deepEqual(await adapter.change(state => setDocumentCollectionLink(state, 'a', 'deleted-doc', false)), { ok: false, reason: 'unavailable-document' });
  assert.equal(storage.writes(), 0);
  assert.deepEqual(await adapter.change(state => setDocumentCollectionLink(state, 'b', 'doc-b', true)), { ok: true, changed: true });
  assert.deepEqual(adapter.snapshot().value!.collections[0].documentIds, ['deleted-doc']);
  assert.deepEqual(adapter.snapshot().value!.collections[1].documentIds, ['doc-b']);
});

test('link/unlink keeps other collections and unrelated input data byte-identical', async () => {
  const initial = setDocumentCollectionLink(setDocumentCollectionLink(collections(), 'a', 'doc-a', true), 'b', 'doc-a', true);
  const document = { id: 'doc-a', raw: '기존 메모\n- [x] 보존', folderId: 'old-folder', progress: [{ date: '2026-10-05', percent: 40 }], origin: 'original-flow' };
  const documentBytes = JSON.stringify(document), storage = disk(initial);
  storage.values.set('existing-server-recovery', documentBytes);
  const adapter = createAlphaDocumentCollections(owner, storage.port, immediate, current);
  assert.deepEqual(await adapter.change(state => setDocumentCollectionLink(state, 'a', document.id, false)), { ok: true, changed: true });
  assert.deepEqual(adapter.snapshot().value!.collections[0].documentIds, []);
  assert.deepEqual(adapter.snapshot().value!.collections[1], initial.collections[1]);
  assert.equal(JSON.stringify(document), documentBytes); assert.equal(storage.values.get('existing-server-recovery'), documentBytes);
});

test('external byte replacement blocks CAS without writes and retains prior confirmed state', async () => {
  const initial = collections(), storage = disk(initial), adapter = createAlphaDocumentCollections(owner, storage.port, immediate, current);
  const external = JSON.stringify(addDocumentCollection(initial, 'other-tab', '외부 변경')); storage.values.set(key, external);
  assert.deepEqual(await adapter.change(state => setDocumentCollectionLink(state, 'a', 'doc-a', true)), { ok: false, reason: 'conflict' });
  assert.equal(storage.writes(), 0); assert.equal(storage.values.get(key), external);
  assert.deepEqual(adapter.snapshot().value, initial); assert.equal(adapter.snapshot().writable, false);
  assert.deepEqual(await adapter.change(state => state), { ok: false, reason: 'conflict' });
});

test('unchanged relation still checks CAS and cannot ignore an external replacement', async () => {
  const initial = collections(), storage = disk(initial), adapter = createAlphaDocumentCollections(owner, storage.port, immediate, current);
  storage.values.set(key, JSON.stringify(emptyDocumentCollections()));
  assert.deepEqual(await adapter.change(state => state), { ok: false, reason: 'conflict' }); assert.equal(storage.writes(), 0);
});

test('no-op cannot acknowledge a session that changed during its CAS read', async () => {
  const storage = disk(collections()); let authority = current(), reads = 0;
  const port = { getItem(key: string) {
    if (++reads === 2) authority = { ...authority, ownerId: 'owner-b' };
    return storage.port.getItem(key);
  }, setItem: storage.port.setItem };
  const adapter = createAlphaDocumentCollections(owner, port, immediate, () => authority);
  assert.deepEqual(await adapter.change(state => state), { ok: false, reason: 'session' });
  assert.equal(storage.writes(), 0); assert.equal(adapter.snapshot().value, null);
});

test('unconfirmed readback blocks further edits and retains previous value', async () => {
  const initial = collections(), storage = disk(initial); let writes = 0;
  const port = { getItem: storage.port.getItem, setItem() { writes++; } };
  const adapter = createAlphaDocumentCollections(owner, port, immediate, current);
  assert.deepEqual(await adapter.change(state => setDocumentCollectionLink(state, 'a', 'doc-a', true)), { ok: false, reason: 'readback-failed' });
  assert.deepEqual(adapter.snapshot().value, initial); assert.equal(adapter.snapshot().reason, 'readback-failed');
  assert.deepEqual(await adapter.change(state => state), { ok: false, reason: 'readback-failed' }); assert.equal(writes, 1);
});

test('local-storage read/quota failures are distinct from missing locks and retain loaded relation', async () => {
  const initial = collections(), storage = disk(initial);
  const unavailable = createAlphaDocumentCollections(owner, { getItem() { throw Error('unavailable'); }, setItem() {} }, immediate, current);
  assert.equal(unavailable.snapshot().reason, 'local-storage-unavailable'); assert.equal(unavailable.snapshot().value, null);
  const quota = createAlphaDocumentCollections(owner, { getItem: storage.port.getItem, setItem() { throw Error('quota'); } }, immediate, current);
  assert.deepEqual(await quota.change(state => setDocumentCollectionLink(state, 'a', 'doc-a', true)), { ok: false, reason: 'local-storage-unavailable' });
  assert.deepEqual(quota.snapshot().value, initial); assert.equal(storage.values.get(key), JSON.stringify(initial));
  const noLocks = createAlphaDocumentCollections(owner, storage.port, null, current);
  assert.equal(noLocks.snapshot().reason, 'locks-unavailable'); assert.deepEqual(noLocks.snapshot().value, initial);
  let callbacks = 0;
  assert.deepEqual(await noLocks.change(() => { callbacks++; return emptyDocumentCollections(); }), { ok: false, reason: 'locks-unavailable' });
  assert.equal(callbacks, 0); assert.equal(storage.writes(), 0);
});

test('lock rejection never falls back to an unlocked write', async () => {
  const storage = disk(collections()); let callbacks = 0;
  const unavailable: AlphaDocumentCollectionsExclusive = async () => { throw Error('no locks'); };
  const adapter = createAlphaDocumentCollections(owner, storage.port, unavailable, current);
  assert.deepEqual(await adapter.change(state => { callbacks++; return state; }), { ok: false, reason: 'locks-unavailable' });
  assert.equal(callbacks, 0); assert.equal(storage.writes(), 0); assert.deepEqual(adapter.snapshot().value, collections());
});

test('busy, pending, conflict, invalid session and unavailable authority block callbacks', async () => {
  const cases = [
    { patch: { busy: true }, reason: 'busy' }, { patch: { pending: true }, reason: 'pending' },
    { patch: { blocked: true }, reason: 'conflict' }, { patch: { sessionValid: false }, reason: 'session' },
  ];
  for (const { patch, reason } of cases) {
    const storage = disk(collections()), authority = { ...current(), ...patch };
    const adapter = createAlphaDocumentCollections(owner, storage.port, immediate, () => authority); let callbacks = 0;
    assert.deepEqual(await adapter.change(state => { callbacks++; return state; }), { ok: false, reason });
    assert.equal(callbacks, 0); assert.equal(storage.writes(), 0); assert.equal(adapter.snapshot().writable, false);
  }
  for (const authority of [() => null, () => { throw Error('authority failed'); }]) {
    const storage = disk(collections()), adapter = createAlphaDocumentCollections(owner, storage.port, immediate, authority);
    assert.deepEqual(await adapter.change(() => emptyDocumentCollections()), { ok: false, reason: 'authority-unavailable' });
    assert.equal(adapter.snapshot().value, null); assert.equal(storage.writes(), 0);
  }
});

test('queued disposal or account switch rejects stale callbacks with zero writes', async () => {
  for (const dispose of [true, false]) {
    const storage = disk(collections()), lock = queued(); let authority = current(), callbacks = 0;
    const adapter = createAlphaDocumentCollections(owner, storage.port, lock.exclusive, () => authority);
    const pending = adapter.change(state => { callbacks++; return setDocumentCollectionLink(state, 'a', 'doc-a', true); });
    assert.equal(adapter.snapshot().busy, true);
    assert.deepEqual(await adapter.change(state => state), { ok: false, reason: 'busy' });
    if (dispose) adapter.dispose(); else authority = { ...authority, ownerId: 'owner-b' };
    lock.release();
    assert.deepEqual(await pending, { ok: false, reason: dispose ? 'disposed' : 'session' });
    assert.equal(callbacks, 0); assert.equal(storage.writes(), 0); assert.equal(adapter.snapshot().value, null);
    authority = current();
    assert.deepEqual(await adapter.change(state => state), { ok: false, reason: dispose ? 'disposed' : 'session' });
  }
});

test('authority is rechecked after transform and after CAS, immediately before write', async () => {
  for (const phase of ['transform-dispose', 'cas-owner', 'cas-document', 'cas-throw'] as const) {
    const storage = disk(collections()); let authority = current(), authorityThrows = false, reads = 0;
    const port = { getItem(key: string) {
      reads++;
      if (reads === 2 && phase === 'cas-owner') authority = { ...authority, ownerId: 'owner-b' };
      if (reads === 2 && phase === 'cas-document') authority = { ...authority, documentIds: [] };
      if (reads === 2 && phase === 'cas-throw') authorityThrows = true;
      return storage.port.getItem(key);
    }, setItem: storage.port.setItem };
    const adapter = createAlphaDocumentCollections(owner, port, immediate, () => {
      if (authorityThrows) throw Error('authority unavailable'); return authority;
    });
    const result = await adapter.change(state => {
      if (phase === 'transform-dispose') adapter.dispose();
      return setDocumentCollectionLink(state, 'a', 'doc-a', true);
    });
    const reason = phase === 'transform-dispose' ? 'disposed' : phase === 'cas-owner' ? 'session' : phase === 'cas-document' ? 'foreign-document' : 'authority-unavailable';
    assert.deepEqual(result, { ok: false, reason }); assert.equal(storage.writes(), 0);
  }
});

test('invalid transform cannot write or corrupt the previously loaded state', async () => {
  const storage = disk(collections()), adapter = createAlphaDocumentCollections(owner, storage.port, immediate, current);
  assert.deepEqual(await adapter.change(state => { state.collections[0].title = ''; return state; }), { ok: false, reason: 'invalid' });
  assert.deepEqual(await adapter.change(() => { throw Error('transform failure'); }), { ok: false, reason: 'invalid' });
  assert.deepEqual(adapter.snapshot().value, collections()); assert.equal(storage.writes(), 0); assert.equal(adapter.snapshot().writable, true);
});
