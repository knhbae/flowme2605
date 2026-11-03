import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramEnvelope } from '../program-data';
import { ALPHA_COMMAND_SCHEMA, type AlphaAccount, type AlphaCommand, type AlphaRecoveryPort, type AlphaRepository, type AlphaResult } from './contract';
import { createAlphaClient } from './client';
import { createAlphaFakeServer } from './fake-server';
import { detached } from './json';
import { alphaRecoveryKey, createAlphaLocalRecovery, createAlphaMemoryRecovery } from './local-recovery';
import { captureAlphaAccount, privateChanges, validateAlphaAccount } from './program-adapter';

function setup() {
  const e = createProgramEnvelope(), a = captureAlphaAccount(e, e.data.activeActorId, 'a'), b = captureAlphaAccount(e, e.data.activeActorId, 'b');
  b.account.space.text.folders[0].title = '계정 B';
  const server = createAlphaFakeServer([a, b]), tokenA = server.issueSession('a'), tokenB = server.issueSession('b');
  const pa = server.connect(tokenA), pb = server.connect(tokenB);
  const validate = (value: unknown, owner: string): value is AlphaAccount => validateAlphaAccount(value, a.references, owner);
  return { a, b, server, tokenA, tokenB, pa, pb, validate };
}
function command(account: AlphaAccount, requestId = 'edit'): Extract<AlphaCommand, {kind:'change-private'}> {
  const next = detached(account.space); next.text.folders[0].title = '저장한 개인 입력';
  return { schema: ALPHA_COMMAND_SCHEMA, requestId, expectedRevision: account.revision, kind: 'change-private', changes: privateChanges(account.space, next) };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

test('limit diagnostic is transient; definitive rejection retains draft and ambiguous retry retains pending', async () => {
  const f = setup(), recovery = createAlphaMemoryRecovery(), client = createAlphaClient(f.validate, recovery);
  const port: AlphaRepository = { ...f.pa, execute: async () => ({ ok: false, reason: 'limit' }) };
  client.bindSession('a', port); assert(await client.refresh());
  assert.equal(await client.execute(command(f.a.account)), false);
  assert.equal(client.snapshot().lastError, 'limit'); assert.equal(client.snapshot().state?.pending, null);
  assert(client.snapshot().state?.draft); assert.equal(client.snapshot().state?.confirmed?.revision, 0);
  const loaded = recovery.load('a'); assert(loaded.ok); assert(!JSON.stringify(loaded.value).includes('lastError'));
  client.bindSession('a', port); assert.equal(client.snapshot().lastError, null);
  const other = createAlphaClient(f.validate); let calls = 0;
  other.bindSession('a', { ...port, execute: async () => { if (++calls === 1) throw Error('lost'); return { ok: false, reason: 'limit' }; } });
  assert(await other.refresh()); assert.equal(await other.execute(command(f.a.account)), false);
  const pending = other.snapshot().state?.pending;
  assert.equal(await other.resolvePending(true), false); assert.equal(other.snapshot().lastError, 'limit');
  assert.deepEqual(other.snapshot().state?.pending, pending); assert(other.snapshot().state?.draft);
  assert.equal(f.server.diagnostics().mutations, 0);
});

test('success requires server receipt and re-read; pending state never claims saved', async () => {
  const f = setup(), hold = deferred<AlphaResult<Awaited<ReturnType<AlphaRepository['execute']>> extends AlphaResult<infer V> ? V : never>>();
  const client = createAlphaClient(f.validate), port: AlphaRepository = { ...f.pa, execute: async cmd => { const saved = await f.pa.execute(cmd); hold.resolve(saved); return new Promise(resolve => { release = () => resolve(saved); }); } };
  let release!: () => void;
  client.bindSession('a', port); assert(await client.refresh()); const pending = client.execute(command(f.a.account));
  await hold.promise; assert.equal(client.snapshot().status, 'saving'); assert(client.snapshot().state?.pending);
  release(); assert(await pending); assert.equal(client.snapshot().status, 'saved'); assert.equal(client.snapshot().state?.confirmed?.revision, 1);
});
test('response loss persists request identity across reload; lookup confirms exactly one commit', async () => {
  const f = setup(), values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
  const client = createAlphaClient(f.validate, createAlphaLocalRecovery(storage, f.validate));
  client.bindSession('a', { ...f.pa, execute: async cmd => { await f.pa.execute(cmd); throw Error('lost response'); } });
  assert(await client.refresh()); assert.equal(await client.execute(command(f.a.account)), false);
  assert.equal(client.snapshot().status, 'checking-result'); assert.equal(f.server.diagnostics().mutations, 1);
  const reboot = createAlphaClient(f.validate, createAlphaLocalRecovery(storage, f.validate)); reboot.bindSession('a', f.pa);
  assert.equal(reboot.snapshot().state?.pending?.requestId, 'edit'); assert(await reboot.resolvePending());
  assert.equal(reboot.snapshot().status, 'saved'); assert.equal(reboot.snapshot().state?.pending, null);
  assert.equal(f.server.diagnostics().mutations, 1);
});
test('transport loss before dispatch retries the identical request, never invents a second intent', async () => {
  const f = setup(), recovery = createAlphaMemoryRecovery(), client = createAlphaClient(f.validate, recovery);
  client.bindSession('a', { ...f.pa, execute: async () => { throw Error('offline'); } });
  assert(await client.refresh()); await client.execute(command(f.a.account));
  assert.equal(f.server.diagnostics().mutations, 0); assert.equal(await client.resolvePending(), false);
  assert(client.snapshot().state?.pending); client.bindSession('a', f.pa);
  assert(await client.resolvePending(true)); assert.equal(f.server.diagnostics().mutations, 1);
});
test('account change and logout suppress delayed private read/commit responses, retain input for original owner', async () => {
  const f = setup(), recovery = createAlphaMemoryRecovery(), client = createAlphaClient(f.validate, recovery);
  const hold = deferred<AlphaResult<AlphaAccount>>(); client.bindSession('a', { ...f.pa, read: () => hold.promise });
  const pendingRead = client.refresh(); client.bindSession('b', f.pb); assert(await client.refresh());
  hold.resolve({ ok: true, value: f.a.account }); assert.equal(await pendingRead, false);
  assert.equal(client.snapshot().state?.confirmed?.ownerId, 'b');
  const commitHold = deferred<Awaited<ReturnType<AlphaRepository['execute']>>>();
  client.bindSession('a', { ...f.pa, execute: async cmd => { await f.pa.execute(cmd); return commitHold.promise; } });
  assert(await client.refresh()); const pendingCommit = client.execute(command(f.a.account));
  client.bindSession('b', f.pb); assert(await client.refresh());
  commitHold.resolve({ ok: true, value: { kind: 'change-private', requestId: 'edit', revision: 1, changed: true } });
  assert.equal(await pendingCommit, false); assert.equal(client.snapshot().state?.confirmed?.ownerId, 'b'); assert.equal(client.snapshot().state?.draft, null);
  client.bindSession(null, null); assert.equal(client.snapshot().state, null);
  client.bindSession('a', f.pa); assert(client.snapshot().state?.pending); assert(await client.resolvePending());
});
test('session change at receipt refresh boundary cannot clear the new account recovery', async () => {
  const f = setup(), backing = createAlphaMemoryRecovery();
  const bDraft = command(f.b.account, 'b-draft'); backing.save({ schema: 'flowme-alpha-recovery/1', ownerId: 'b', confirmed: f.b.account, pending: null, draft: bDraft });
  let switchNow = false;
  const recovery: AlphaRecoveryPort = { load: id => backing.load(id), save: state => {
    const ok = backing.save(state);
    if (switchNow && state.ownerId === 'a' && state.confirmed?.revision === 1) queueMicrotask(() => client.bindSession('b', f.pb));
    return ok;
  } };
  const client = createAlphaClient(f.validate, recovery); client.bindSession('a', f.pa); assert(await client.refresh()); switchNow = true;
  assert.equal(await client.execute(command(f.a.account)), false);
  assert.equal(client.snapshot().ownerId, 'b'); assert.deepEqual(client.snapshot().state?.draft, bDraft);
  assert.notEqual(client.snapshot().status, 'saved');
});
test('expired session and failed replay preserve ambiguous operation until authenticated lookup', async () => {
  const f = setup(), recovery = createAlphaMemoryRecovery(), client = createAlphaClient(f.validate, recovery);
  client.bindSession('a', { ...f.pa, execute: async cmd => { await f.pa.execute(cmd); throw Error('lost'); } });
  await client.refresh(); await client.execute(command(f.a.account)); f.server.revokeSession(f.tokenA);
  assert.equal(await client.resolvePending(), false); assert.equal(client.snapshot().status, 'session-expired'); assert(client.snapshot().state?.pending);
  client.bindSession('a', { read: f.pa.read, lookup: async () => ({ ok: true, value: null }), execute: async () => ({ ok: false, reason: 'unauthenticated' }) });
  assert.equal(await client.resolvePending(true), false); assert(client.snapshot().state?.pending);
  client.bindSession('a', f.server.connect(f.server.issueSession('a'))); assert(await client.resolvePending()); assert.equal(f.server.diagnostics().mutations, 1);
});
test('stale refresh, forged-owner read and malformed receipt cannot confirm saved or overwrite cache', async () => {
  const f = setup(), recovery = createAlphaMemoryRecovery(), client = createAlphaClient(f.validate, recovery);
  client.bindSession('a', f.pa); await client.refresh(); assert(await client.execute(command(f.a.account)));
  client.bindSession('a', { ...f.pa, read: async () => ({ ok: true, value: f.a.account }) });
  assert.equal(await client.refresh(), false); assert.equal(client.snapshot().state?.confirmed?.revision, 1);
  client.bindSession('a', { ...f.pa, read: async () => ({ ok: true, value: f.b.account }) });
  assert.equal(await client.refresh(), false); assert.equal(client.snapshot().state?.confirmed?.ownerId, 'a');
  const fresh = setup(), malformed = createAlphaClient(fresh.validate); malformed.bindSession('a', { ...fresh.pa,
    execute: async () => ({ ok: true, value: { requestId: 'wrong', revision: 1, changed: true, kind: 'change-private' } }) });
  await malformed.refresh(); assert.equal(await malformed.execute(command(fresh.a.account)), false); assert.equal(malformed.snapshot().status, 'recovery-required'); assert(malformed.snapshot().state?.pending);
});
test('no-op/cancel and invalid requests dispatch nothing and write no recovery state', async () => {
  const f = setup(), backing = createAlphaMemoryRecovery(); let writes = 0, dispatched = 0;
  const client = createAlphaClient(f.validate, { load: id => backing.load(id), save: value => { writes++; return backing.save(value); } });
  client.bindSession('a', { ...f.pa, execute: async cmd => { dispatched++; return f.pa.execute(cmd); } }); await client.refresh(); const before = writes;
  assert.equal(await client.execute(command(f.a.account), { cancelled: true }), false); assert.equal(client.snapshot().status, 'cancelled');
  assert.equal(await client.execute({ ...command(f.a.account), kind: 'change-private', changes: [] }), false);
  assert.equal(await client.execute({ ...command(f.a.account), kind: 'change-private', changes: [{ field: 'text', present: true, value: f.a.account.space.text }] }), false);
  assert.equal(await client.execute({ ...command(f.a.account), ownerId: 'b' } as unknown as AlphaCommand), false);
  assert.equal(writes, before); assert.equal(dispatched, 0); assert.equal(f.server.diagnostics().mutations, 0);
});
test('failed recovery write blocks dispatch; corruption is retained byte-for-byte', async () => {
  const f = setup(); let dispatched = 0;
  const client = createAlphaClient(f.validate, { load: () => ({ ok: true, value: null }), save: () => false });
  client.bindSession('a', { ...f.pa, execute: async cmd => { dispatched++; return f.pa.execute(cmd); } });
  assert.equal(await client.execute(command(f.a.account)), false); assert.equal(dispatched, 0); assert.equal(client.snapshot().status, 'recovery-required');
  const raw = '{ damaged bytes ', storage = { getItem: () => raw, setItem: () => { throw Error('must not write'); }, removeItem: () => { throw Error('must not remove'); } };
  const corrupt = createAlphaClient(f.validate, createAlphaLocalRecovery(storage, f.validate)); corrupt.bindSession('a', f.pa);
  assert.equal(await corrupt.execute(command(f.a.account)), false); assert.equal(corrupt.snapshot().state, null); assert.equal(storage.getItem(), raw);
});
test('conflict retains user draft and refresh adopts latest server without replay', async () => {
  const f = setup(), client = createAlphaClient(f.validate); client.bindSession('a', f.pa); await client.refresh();
  await f.pa.execute(command(f.a.account, 'other-device'));
  assert.equal(await client.execute(command(f.a.account, 'mine')), false); assert.equal(client.snapshot().status, 'conflict');
  assert.equal(client.snapshot().state?.draft?.requestId, 'mine'); assert.equal(client.snapshot().state?.pending, null);
  assert(await client.refresh()); assert.equal(client.snapshot().state?.confirmed?.revision, 1); assert.equal(client.snapshot().status, 'conflict');
  assert.equal(f.server.diagnostics().mutations, 1);
});
test('local adapter CAS/readback failures preserve newer bytes and never remove operational keys', () => {
  const f = setup(), values = new Map<string, string>([['flow:operating', 'original']]); let failReadback = false, sets = 0;
  const storage = { getItem: (k: string) => failReadback && sets > 0 ? 'unreadable' : values.get(k) ?? null,
    setItem: (k: string, v: string) => { sets++; values.set(k, v); }, removeItem: () => { throw Error('must not remove'); } };
  const port = createAlphaLocalRecovery(storage, f.validate); port.load('a');
  const state = { schema: 'flowme-alpha-recovery/1' as const, ownerId: 'a', confirmed: f.a.account, pending: null, draft: null };
  values.set(alphaRecoveryKey('a'), 'other tab'); assert.equal(port.save(state), false); assert.equal(sets, 0);
  values.delete(alphaRecoveryKey('a')); failReadback = true; assert.equal(port.save(state), false); assert.equal(sets, 1);
  assert.equal(port.save(state), false); assert.equal(port.reset('a'), false); assert.equal(sets, 1); assert.equal(values.get('flow:operating'), 'original');
});
