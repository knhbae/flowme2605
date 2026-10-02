import assert from 'node:assert/strict';
import test from 'node:test';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { ALPHA_CREATOR_COMMAND_SCHEMA, type AlphaCreatorCommand } from '../alpha-creator/contract';
import { createProgramPrivateSpace } from '../program-data';
import { createAlphaClient } from './client';
import { ALPHA_SCHEMA, type AlphaAccount, type AlphaCommand, type AlphaError, type AlphaReferenceContext, type AlphaRepository } from './contract';
import { canonicalJson, detached } from './json';
import { createAlphaMemoryRecovery } from './local-recovery';

const now = '2026-10-01T12:00:00.000Z';
const command = (requestId = 'native-first'): AlphaCreatorCommand => ({ schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'creator', requestId, expectedRevision: 0,
  intent: { type: 'native-handoff', draftId: 'native-draft', anchor: '2026-10-01', now,
    choices: { 'item-a': { source: 'incoming', date: 'keep', time: 'keep', children: 'keep' } } } });
function setup() {
  let account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: 'a', revision: 0,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: 'a', revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  let references: AlphaReferenceContext = { actorIds: ['a'], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
  const calls: AlphaCommand[] = [], lookups: string[] = [], backing = createAlphaMemoryRecovery(); let writable = true;
  let read: AlphaRepository['read'] = async () => ({ ok: true, value: detached(account) });
  // Protocol-only success: the controller tests separately exercise actual native transitions.
  let execute: AlphaRepository['execute'] = async value => {
    if (calls.length === 1) return { ok: false, reason: 'limit' };
    account = { ...account, revision: account.revision + 1 };
    return { ok: true, value: { kind: value.kind, requestId: value.requestId, revision: account.revision, changed: true, resultId: 'private-document' } };
  };
  const repository: AlphaRepository = { references: () => detached(references), read: () => read(),
    execute: value => { calls.push(detached(value)); return execute(value); }, lookup: async requestId => { lookups.push(requestId); return { ok: true, value: null }; } };
  const recovery = { load: backing.load, save: (value: Parameters<typeof backing.save>[0]) => writable && backing.save(value) };
  const client = createAlphaClient(isAccountForOwner, recovery); client.bindSession('a', repository);
  return { client, repository, recovery, backing, calls, lookups, account: () => detached(account), references: () => detached(references),
    setAccount: (value: AlphaAccount) => { account = detached(value); }, setReferences: (value: AlphaReferenceContext) => { references = detached(value); },
    setRead: (value: AlphaRepository['read']) => { read = value; }, setExecute: (value: AlphaRepository['execute']) => { execute = value; },
    setWritable: (value: boolean) => { writable = value; } };
}
async function reject(f: ReturnType<typeof setup>) {
  assert(await f.client.refresh()); const before = f.client.snapshot().state?.confirmed;
  assert.equal(await f.client.execute(command()), false);
  assert.deepEqual(f.client.snapshot().state?.confirmed, before); assert.equal(f.client.snapshot().state?.pending, null);
  assert.equal(f.client.snapshot().retryableRejectedDraft, false); assert.equal(f.client.snapshot().retryableNativeHandoff, true);
  return f.client.snapshot();
}

test('NR01 definitive native limit permits only explicit exact-body fresh-ID retry and receipt/read success', async () => {
  const f = setup(), rejected = await reject(f);
  const stored = f.backing.load('a'); assert(stored.ok);
  assert.deepEqual(Object.keys(stored.value!).sort(), ['confirmed', 'draft', 'ownerId', 'pending', 'references', 'schema']);
  assert.equal(await f.client.execute(command('implicit-new')), false);
  assert.deepEqual(f.client.snapshot(), rejected); assert.equal(f.calls.length, 1);
  assert(await f.client.execute(command('native-retry'), { retryNativeHandoff: true }));
  assert.equal(f.calls.length, 2); assert.notEqual(f.calls[0].requestId, f.calls[1].requestId);
  assert.deepEqual({ ...f.calls[1], requestId: f.calls[0].requestId }, f.calls[0]);
  assert.equal(f.client.snapshot().status, 'saved'); assert.equal(f.client.snapshot().state?.confirmed?.revision, 1);
  assert.equal(f.client.snapshot().state?.draft, null); assert.equal(f.client.snapshot().state?.pending, null);
  assert.equal(f.client.snapshot().retryableNativeHandoff, false);
});

test('NR02 changed native intent/revision, reused ID, generic creator/social/private and Undo dispatch zero', async () => {
  const f = setup(), rejected = await reject(f), original = command(); assert.equal(original.intent.type, 'native-handoff');
  if (original.intent.type !== 'native-handoff') assert.fail('native fixture');
  const variants: AlphaCommand[] = [original, { ...command('new'), expectedRevision: 1 },
    { ...command('new'), intent: { ...original.intent, now: '2026-10-01T12:01:00.000Z' } },
    { ...command('new'), intent: { ...original.intent, draftId: 'other-draft' } },
    { ...command('new'), intent: { ...original.intent, anchor: '2026-10-02' } },
    { ...command('new'), intent: { ...original.intent, choices: {} } },
    { ...command('new'), intent: { type: 'working', working: null, now } },
    { schema: 'flowme-alpha-social-command/1', kind: 'social', requestId: 'social', expectedRevision: 0, expectedPublicRevision: 0, intent: { type: 'copy-anchor', copyId: 'copy', anchor: '2026-10-01' } },
    { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: 'private', expectedRevision: 0, changes: [] },
    { schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'undo-creator', requestId: 'undo', expectedRevision: 0, operationId: 'native-first' }];
  for (const value of variants) {
    assert.equal(await f.client.execute(value, { retryNativeHandoff: true }), false);
    assert.deepEqual(f.client.snapshot(), rejected);
  }
  assert.equal(await f.client.execute(command('new'), { retryRejectedDraft: true }), false);
  assert.equal(await f.client.execute(command('new'), { retryNativeHandoff: true, retryRejectedDraft: true }), false);
  assert.equal(f.calls.length, 1);
});

test('NR03 polling only the exact baseline preserves live proof without writes to server', async () => {
  const f = setup(), rejected = await reject(f);
  for (let poll = 0; poll < 3; poll++) {
    const reading = f.client.refresh(); assert.equal(f.client.snapshot().retryableNativeHandoff, false);
    assert(await reading); assert.equal(f.client.snapshot().retryableNativeHandoff, true);
    assert.deepEqual(f.client.snapshot().state, rejected.state); assert.equal(f.calls.length, 1);
  }
  assert(await f.client.execute(command('after-poll'), { retryNativeHandoff: true }));
});

test('NR04 failed/changed baseline read permanently invalidates native proof and preserves draft', async () => {
  for (const scenario of ['invalid', 'unauthenticated', 'unavailable', 'transport', 'revision', 'same-revision-bytes', 'references', 'public-revision', 'public-bytes', 'recovery'] as const) {
    const f = setup(), rejected = await reject(f), initial = f.account(), references = f.references();
    if (['invalid', 'unauthenticated', 'unavailable'].includes(scenario)) f.setRead(async () => ({ ok: false, reason: scenario as AlphaError }));
    if (scenario === 'transport') f.setRead(async () => { throw Error('read lost'); });
    if (scenario === 'revision') f.setAccount({ ...initial, revision: 1 });
    if (scenario === 'same-revision-bytes') { const next = detached(initial); next.space.text.folders[0].title = 'different'; f.setAccount(next); }
    if (scenario === 'references') f.setReferences({ ...references, actorIds: ['a', 'b'] });
    if (scenario === 'public-revision') f.setReferences({ ...references, social: { schema: 'flowme-alpha-social-projection/1', revision: 1,
      ownActorId: 'member-11111111-1111-4111-8111-111111111111', actorNames: { a: 'A' } } });
    if (scenario === 'public-bytes') f.setReferences({ ...references, public: { ...references.public, posts: [{ id: 'changed' } as typeof references.public.posts[number]] } });
    if (scenario === 'recovery') f.setWritable(false);
    await f.client.refresh(); assert.equal(f.client.snapshot().retryableNativeHandoff, false, scenario);
    assert.deepEqual(f.client.snapshot().state?.draft, rejected.state?.draft);
    assert.equal(await f.client.execute(command('blocked'), { retryNativeHandoff: true }), false); assert.equal(f.calls.length, 1);
    f.setAccount(initial); f.setReferences(references); f.setRead(async () => ({ ok: true, value: initial })); f.setWritable(true);
    await f.client.refresh(); assert.equal(f.client.snapshot().retryableNativeHandoff, false, `${scenario}: cannot regain proof`);
  }
});

test('NR05 same-owner bind, account swap, reload and delayed session response never recover native eligibility', async () => {
  for (const scenario of ['same-owner', 'swap', 'reload'] as const) {
    const f = setup(), rejected = await reject(f);
    const client = scenario === 'reload' ? createAlphaClient(isAccountForOwner, f.recovery) : f.client;
    if (scenario === 'swap') client.bindSession(null, null);
    client.bindSession('a', f.repository); assert.equal(client.snapshot().retryableNativeHandoff, false); await client.refresh();
    assert.equal(client.snapshot().retryableNativeHandoff, false); assert.deepEqual(client.snapshot().state?.draft, rejected.state?.draft);
    assert.equal(await client.execute(command('blocked'), { retryNativeHandoff: true }), false); assert.equal(f.calls.length, 1);
  }
  const f = setup(); let finish!: (value: Awaited<ReturnType<AlphaRepository['execute']>>) => void;
  f.setExecute(() => new Promise(resolve => { finish = resolve; })); await f.client.refresh(); const pending = f.client.execute(command());
  f.client.bindSession(null, null); f.client.bindSession('a', f.repository);
  finish({ ok: false, reason: 'limit' }); assert.equal(await pending, false);
  assert.equal(f.client.snapshot().retryableNativeHandoff, false); assert(f.client.snapshot().state?.pending);
});

test('NR06 uncertain ACK and limit replay retain the identical pending body, never a fresh native request', async () => {
  for (const scenario of ['transport', 'unavailable', 'unauthenticated', 'malformed-receipt', 'malformed-receipt-shape', 'malformed-rejection', 'malformed-error'] as const) {
    const f = setup(); f.setExecute(async value => {
      if (f.calls.length > 1) return { ok: false, reason: 'limit' };
      if (scenario === 'transport') throw Error('lost response');
      if (scenario === 'unavailable' || scenario === 'unauthenticated') return { ok: false, reason: scenario };
      if (scenario === 'malformed-receipt') return { ok: true, value: { kind: 'creator', requestId: 'wrong', revision: 1, changed: true } };
      if (scenario === 'malformed-receipt-shape') return { ok: true, value: { kind: 'creator', requestId: value.requestId, revision: 1, changed: true, extra: true } };
      if (scenario === 'malformed-error') return { ok: false, reason: 'unknown-error' } as unknown as Awaited<ReturnType<AlphaRepository['execute']>>;
      return { ok: false, reason: 'limit', extra: true } as Awaited<ReturnType<AlphaRepository['execute']>>;
    });
    await f.client.refresh(); assert.equal(await f.client.execute(command()), false);
    const pending = f.client.snapshot().state?.pending; assert(pending, scenario); assert.equal(f.client.snapshot().retryableNativeHandoff, false);
    assert.equal(await f.client.execute(command('new'), { retryNativeHandoff: true }), false);
    assert.equal(await f.client.resolvePending(true), false); assert.equal(f.calls.length, 2);
    assert.deepEqual(f.calls[1], f.calls[0]); assert.deepEqual(f.client.snapshot().state?.pending, pending);
    assert.equal(f.client.snapshot().retryableNativeHandoff, false); assert.deepEqual(f.lookups, ['native-first']);
  }
});

test('NR07 only native-handoff limit, not invalid/stale or any other creator command, gains proof', async () => {
  for (const reason of ['invalid', 'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'no-change', 'rate-limited', 'not-found'] as const) {
    const f = setup(); f.setExecute(async () => ({ ok: false, reason })); await f.client.refresh(); await f.client.execute(command());
    assert.equal(f.client.snapshot().retryableNativeHandoff, false, reason); assert(f.client.snapshot().state?.draft);
  }
  for (const value of [{ ...command(), expectedRevision: 1 }, { ...command(), intent: { type: 'working' as const, working: null, now } },
    { ...command(), intent: { type: 'raw-handoff' as const, draftId: 'draft', expectedRecordRevision: 1, today: '2026-10-01', now } },
    { schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'undo-creator' as const, requestId: 'undo', expectedRevision: 0, operationId: 'first' }]) {
    const f = setup(); await f.client.refresh(); await f.client.execute(value);
    assert.equal(f.client.snapshot().retryableNativeHandoff, false); assert.equal(f.client.snapshot().retryableRejectedDraft, false);
  }
});

test('NR08 failed retry recovery persistence preserves prior rejected draft and dispatches zero', async () => {
  const f = setup(), rejected = await reject(f); f.setWritable(false);
  assert.equal(await f.client.execute(command('retry'), { retryNativeHandoff: true }), false);
  assert.deepEqual(f.client.snapshot().state, rejected.state); assert.equal(f.client.snapshot().retryableNativeHandoff, false);
  assert.equal(f.calls.length, 1); const stored = f.backing.load('a'); assert(stored.ok); assert.deepEqual(stored.value, rejected.state);
  assert.equal(f.client.snapshot().status, 'recovery-required');
});

test('NR09 live reference change invalidates proof even before polling and cannot later regain it', async () => {
  const f = setup(), rejected = await reject(f), references = f.references();
  f.setReferences({ ...references, actorIds: ['a', 'b'] }); assert.equal(f.client.snapshot().retryableNativeHandoff, false);
  f.setReferences(references); assert.equal(f.client.snapshot().retryableNativeHandoff, false);
  assert.equal(await f.client.execute(command('blocked'), { retryNativeHandoff: true }), false);
  assert.deepEqual(f.client.snapshot().state, rejected.state); assert.equal(f.calls.length, 1);
  assert.equal(canonicalJson(f.account()), canonicalJson(rejected.state?.confirmed));
});

test('NR16 uncertain explicit retry retains its new request identity and cannot invent a third attempt', async () => {
  const f = setup(); await reject(f);
  f.setExecute(async () => { if (f.calls.length === 2) throw Error('retry ACK lost'); return { ok: false, reason: 'limit' }; });
  assert.equal(await f.client.execute(command('explicit-retry'), { retryNativeHandoff: true }), false);
  const pending = f.client.snapshot().state?.pending; assert.equal(pending?.requestId, 'explicit-retry');
  assert.equal(f.client.snapshot().retryableNativeHandoff, false);
  assert.equal(await f.client.execute(command('third'), { retryNativeHandoff: true }), false);
  assert.equal(await f.client.resolvePending(true), false);
  assert.deepEqual(f.calls[2], f.calls[1]); assert.deepEqual(f.client.snapshot().state?.pending, pending);
  assert.deepEqual(f.lookups, ['explicit-retry']); assert.equal(f.client.snapshot().retryableNativeHandoff, false);
});

test('NR17 native retry cannot claim success or regain proof after receipt read failure', async () => {
  const f = setup(), rejected = await reject(f);
  f.setRead(async () => ({ ok: false, reason: 'unavailable' }));
  assert.equal(await f.client.execute(command('receipt-read-failed'), { retryNativeHandoff: true }), false);
  assert.equal(f.account().revision, 1); assert.equal(f.client.snapshot().state?.confirmed?.revision, 0);
  assert.equal(f.client.snapshot().state?.pending?.requestId, 'receipt-read-failed'); assert.equal(f.client.snapshot().retryableNativeHandoff, false);
  assert.notEqual(f.client.snapshot().status, 'saved'); assert.deepEqual(f.client.snapshot().state?.confirmed, rejected.state?.confirmed);
  f.setRead(async () => ({ ok: true, value: f.account() })); assert(await f.client.refresh());
  assert.equal(f.client.snapshot().retryableNativeHandoff, false); assert(f.client.snapshot().state?.pending);
  assert.equal(await f.client.execute(command('blocked'), { retryNativeHandoff: true }), false); assert.equal(f.calls.length, 2);
});

test('NR18 each further definite native limit requires another explicit exact-body retry', async () => {
  const f = setup(); await reject(f); f.setExecute(async () => ({ ok: false, reason: 'limit' }));
  assert.equal(await f.client.execute(command('second-limit'), { retryNativeHandoff: true }), false);
  assert.equal(f.client.snapshot().retryableNativeHandoff, true); assert.equal(f.client.snapshot().state?.pending, null);
  assert.equal(f.client.snapshot().state?.draft?.requestId, 'second-limit');
  assert.equal(await f.client.execute(command('not-explicit')), false); assert.equal(f.calls.length, 2);
  assert.equal(await f.client.execute(command('third-limit'), { retryNativeHandoff: true }), false);
  assert.equal(f.calls.length, 3); assert.equal(f.account().revision, 0);
});
