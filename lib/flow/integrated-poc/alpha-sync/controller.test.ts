import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramPrivateSpace } from '../program-data';
import { ALPHA_SCHEMA, type AlphaAccount, type AlphaRepository } from '../alpha-persistence/contract';
import { createAlphaFakeServer } from '../alpha-persistence/fake-server';
import { createAlphaMemoryRecovery } from '../alpha-persistence/local-recovery';
import { createAlphaSyncController } from './controller';
import { createAlphaTabRecovery, ALPHA_SYNC_PREFIX } from './recovery';
import type { ProgramData } from '../contract';
function seed(ownerId: string) {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId, revision: 0,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: ownerId, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  return { account, references: { actorIds: [ownerId], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } } };
}
function setup() {
  const server = createAlphaFakeServer([seed('a'), seed('b')]);
  const a = server.connect(server.issueSession('a')), b = server.connect(server.issueSession('b'));
  let serial = 0;
  const controller = createAlphaSyncController({ recovery: createAlphaMemoryRecovery(), requestId: () => `id-${++serial}` });
  controller.bindSession('a', a);
  return { server, a, b, controller };
}
const rename = (title: string) => (data: ProgramData) => {
  data.spaces[data.activeActorId].text.folders[0].title = title;
  return { ok: true as const, data, changed: true, result: title };
};
test('M3 preserves transition result; receipt/read confirmed edit, undo, redo use three commits', async () => {
  const { controller: c, server } = setup(); assert(await c.refresh());
  assert.deepEqual(await c.mutate('rename', rename('name')), { ok: true, result: 'name', changed: true });
  assert.equal(c.snapshot().status, 'saved'); assert.equal(c.snapshot().canUndo, true);
  assert((await c.undo()).ok); assert.equal(c.snapshot().account?.space.text.folders[0].title, '미분류');
  assert.equal(c.snapshot().canRedo, true); assert((await c.redo()).ok);
  assert.equal(c.snapshot().account?.space.text.folders[0].title, 'name'); assert.equal(server.diagnostics().mutations, 3);
});
test('M3 no-op, invalid and foreign actor changes have zero storage/network writes', async () => {
  const f = setup(); let writes = 0;
  const base = createAlphaMemoryRecovery(), recovery = { load: base.load, save: (value: Parameters<typeof base.save>[0]) => { writes++; return base.save(value); } };
  const c = createAlphaSyncController({ recovery }); c.bindSession('a', f.a); await c.refresh(); writes = 0;
  assert((await c.mutate('noop', data => ({ ok: true, data, changed: false, result: 'unchanged' }))).ok);
  assert.equal(c.snapshot().status, 'same-location');
  assert.equal((await c.mutate('invalid', data => ({ ok: false, data, reason: 'invalid' }))).ok, false);
  assert.equal((await c.mutate('foreign', data => { data.actors[0].name = 'tampered'; return { ok: true, data, changed: true, result: '' }; })).ok, false);
  assert.equal(writes, 0); assert.equal(f.server.diagnostics().mutations, 0);
});
test('M3 concurrent local mutation is rejected while first receipt/read is in flight', async () => {
  const f = setup(); let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const c = createAlphaSyncController({ recovery: createAlphaMemoryRecovery() });
  c.bindSession('a', { ...f.a, execute: async command => { await hold; return f.a.execute(command); } }); await c.refresh();
  const first = c.mutate('first', rename('first'));
  assert.equal(c.snapshot().status, 'saving'); assert(c.snapshot().pending);
  let rebuilt = false;
  assert.deepEqual(await c.mutate('second', data => { rebuilt = true; return rename('second')(data); }), { ok: false, reason: 'busy' });
  assert.equal(rebuilt, false);
  release(); assert((await first).ok); assert.equal(f.server.diagnostics().mutations, 1);
});
test('M3 cross-device conflict retains proposal until explicit discard; refresh never overwrites draft', async () => {
  const f = setup(), other = createAlphaSyncController({ recovery: createAlphaMemoryRecovery() });
  other.bindSession('a', f.a); await other.refresh(); await f.controller.refresh();
  await other.mutate('device 2', rename('server'));
  assert.equal((await f.controller.mutate('device 1', rename('mine'))).ok, false);
  assert.equal(f.controller.snapshot().status, 'conflict'); assert(f.controller.snapshot().draft); assert.equal(f.controller.snapshot().pending, null);
  await f.controller.refresh(); assert(f.controller.snapshot().draft);
  assert.deepEqual(await f.controller.mutate('overwrite', rename('bad')), { ok: false, reason: 'unresolved' });
  assert(await f.controller.discardConflict()); assert.equal(f.controller.snapshot().draft, null);
  assert.equal(f.controller.snapshot().account?.space.text.folders[0].title, 'server');
});

test('refresh in flight rejects a new edit as busy without constructing or dispatching it', async () => {
  const f = setup(); let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const c = createAlphaSyncController({ recovery: createAlphaMemoryRecovery() });
  c.bindSession('a', f.a); await c.refresh();
  c.bindSession('a', { ...f.a, read: async () => { await hold; return f.a.read(); } });
  const reading = c.refresh(); let builds = 0;
  assert.deepEqual(await c.mutate('while reading', data => { builds++; return rename('never')(data); }), { ok: false, reason: 'busy' });
  assert.equal(builds, 0); assert.equal(f.server.diagnostics().mutations, 0);
  release(); assert(await reading); assert.equal(c.snapshot().busy, false);
  assert((await c.mutate('after reading', rename('allowed'))).ok);
  assert.equal(f.server.diagnostics().mutations, 1);
});
test('M3 response loss and reload recover same request receipt without duplicate commit', async () => {
  const f = setup(), values = new Map<string,string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key:string,value:string) => { assert(key.startsWith(ALPHA_SYNC_PREFIX)); values.set(key,value); }, removeItem: (key:string) => { values.delete(key); } };
  const c = createAlphaSyncController({ recovery: createAlphaTabRecovery(storage, 'tab-first') });
  c.bindSession('a', { ...f.a, execute: async command => { await f.a.execute(command); throw Error('lost'); } }); await c.refresh();
  assert.equal((await c.mutate('lost', rename('saved remotely'))).ok, false);
  const requestId = c.snapshot().pending?.requestId;
  assert.deepEqual(await c.mutate('new request', rename('blocked')), { ok: false, reason: 'unresolved' });
  assert.equal(await c.discardConflict(), false);
  const reboot = createAlphaSyncController({ recovery: createAlphaTabRecovery(storage, 'tab-first') }); reboot.bindSession('a', f.a);
  assert.equal(reboot.snapshot().pending?.requestId, requestId); assert(await reboot.resolvePending());
  assert.equal(reboot.snapshot().status, 'saved'); assert.equal(f.server.diagnostics().mutations, 1);
  assert.equal(reboot.snapshot().canUndo, true);
  const tab2 = createAlphaSyncController({ recovery: createAlphaTabRecovery(storage, 'tab-second') }); tab2.bindSession('a', f.a);
  assert.equal(tab2.snapshot().pending, null); assert.equal(tab2.snapshot().account, null);
});
test('M3 unknown pre-dispatch failure retries exact ID and can never discard pending', async () => {
  const f = setup(), recovery = createAlphaMemoryRecovery(), c = createAlphaSyncController({ recovery });
  c.bindSession('a', { ...f.a, execute: async () => { throw Error('network'); } }); await c.refresh(); await c.mutate('draft', rename('retry'));
  const requestId = c.snapshot().pending?.requestId; assert(requestId);
  assert.equal(await c.discardConflict(), false); c.bindSession('a', f.a);
  assert.equal(c.snapshot().pending?.requestId, requestId); assert(await c.resolvePending(true));
  assert.equal(f.server.diagnostics().mutations, 1);
});
test('M3 account swap suppresses late response and preserves A recovery only for A', async () => {
  const f = setup(); let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; }), recovery = createAlphaMemoryRecovery();
  const c = createAlphaSyncController({ recovery });
  c.bindSession('a', { ...f.a, execute: async command => { await hold; return f.a.execute(command); } }); await c.refresh();
  const pending = c.mutate('A', rename('private A')); c.bindSession('b', f.b); await c.refresh(); release();
  assert.equal((await pending).ok, false); assert.equal(c.snapshot().ownerId, 'b'); assert.equal(c.snapshot().account?.space.text.folders[0].title, '미분류');
  c.bindSession('a', f.a); assert(c.snapshot().pending); assert(await c.resolvePending());
});
test('M3 refresh invalidates undo after another device revision and same-owner token bind retains it otherwise', async () => {
  const f = setup(); await f.controller.refresh(); await f.controller.mutate('own', rename('one'));
  f.controller.bindSession('a', f.a); assert.equal(f.controller.snapshot().canUndo, true);
  const other = createAlphaSyncController({ recovery: createAlphaMemoryRecovery() }); other.bindSession('a', f.a); await other.refresh(); await other.mutate('external', rename('two'));
  await f.controller.refresh(); assert.equal(f.controller.snapshot().canUndo, false); assert.equal((await f.controller.undo()).ok, false);
});
test('M3 stale receipt read never claims saved and dispose clears private snapshot', async () => {
  const f = setup(), initial = await f.a.read(); let readCount = 0;
  const stale: AlphaRepository = { ...f.a, read: async () => { readCount++; return initial; } };
  const c = createAlphaSyncController({ recovery: createAlphaMemoryRecovery() }); c.bindSession('a', stale); await c.refresh();
  assert.equal((await c.mutate('edit', rename('remote'))).ok, false); assert.notEqual(c.snapshot().status, 'saved'); assert(c.snapshot().pending); assert(readCount >= 2);
  c.dispose(); assert.equal(c.snapshot().account, null); assert.equal(c.snapshot().ownerId, null);
});
test('M3 failed durable intent write prevents dispatch', async () => {
  const f = setup(), memory = createAlphaMemoryRecovery(); let writable = true;
  const c = createAlphaSyncController({ recovery: { load: memory.load, save: value => writable && memory.save(value) } });
  c.bindSession('a', f.a); assert(await c.refresh()); writable = false;
  assert.equal((await c.mutate('not durable', rename('cannot send'))).ok, false);
  assert.equal(c.snapshot().status, 'recovery-required'); assert.equal(f.server.diagnostics().mutations, 0);
});
test('M3 expired read hides account and blocks mutations', async () => {
  const f = setup(); let expired = false;
  const c = createAlphaSyncController({ recovery: createAlphaMemoryRecovery() });
  c.bindSession('a', { ...f.a, read: async () => expired ? { ok: false, reason: 'unauthenticated' } : f.a.read() });
  assert(await c.refresh()); expired = true; assert.equal(await c.refresh(), false);
  assert.equal(c.snapshot().status, 'session-expired'); assert.equal(c.snapshot().account, null);
  assert.equal((await c.mutate('expired', rename('bad'))).ok, false); assert.equal(f.server.diagnostics().mutations, 0);
});
test('M3 creator field mutation is rejected even when the legacy domain value is valid', async () => {
  const f = setup(); await f.controller.refresh();
  const result = await f.controller.mutate('creator', data => {
    // Optional creator-only collections remain valid legacy shape but are outside M3.
    data.spaces.a.creatorDraftImports = [];
    delete data.spaces.a.creatorDraftImports;
    return { ok: true, data, changed: true, result: 'creator' };
  });
  assert.equal(result.ok, false); assert.equal(f.server.diagnostics().mutations, 0);
});
