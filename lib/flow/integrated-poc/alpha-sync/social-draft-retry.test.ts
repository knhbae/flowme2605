import assert from 'node:assert/strict';
import test from 'node:test';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { type AlphaSocialIntent } from '../alpha-social/contract';
import { executeAlphaSocialIntent } from '../alpha-social/dispatch';
import { alphaSocialReferences, ALPHA_SOCIAL_CONTEXT_SCHEMA } from '../alpha-social/projection';
import { ALPHA_SCHEMA, type AlphaAccount, type AlphaCommand, type AlphaError, type AlphaReceipt, type AlphaRepository } from '../alpha-persistence/contract';
import { canonicalJson, detached } from '../alpha-persistence/json';
import { createAlphaMemoryRecovery } from '../alpha-persistence/local-recovery';
import { createAlphaClient } from '../alpha-persistence/client';
import { materializeAccount } from '../alpha-persistence/program-adapter';
import { PROGRAM_SCHEMA } from '../contract';
import { newProgramParticipationDraft } from '../participation-editor';
import { createProgramPrivateSpace } from '../program-data';
import { createAlphaSyncController } from './controller';

const owner = '11111111-1111-4111-8111-111111111111', alias = 'member-22222222-2222-4222-8222-222222222222';
const now = '2026-10-02T03:00:00.000Z';
type SaveIntent = Extract<AlphaSocialIntent, { type: 'participation-save' }>;
const corrected = (intent: SaveIntent): SaveIntent => ({ ...intent, draft: { ...intent.draft, title: '수정한 제목', body: '수정한 입력',
  topic: '합성 주제', requestId: 'changed-content', cursor: { start: 3, end: 3 } } });
function fixture(reason: AlphaError = 'rate-limited') {
  let account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0,
    source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] };
  let references = alphaSocialReferences({ schema: ALPHA_SOCIAL_CONTEXT_SCHEMA, revision: 0, ownActorId: alias,
    actors: [{ id: alias, name: 'Member' }], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } }, owner);
  const calls: AlphaCommand[] = [], lookups: string[] = [], ledger = new Map<string, { command: AlphaCommand; receipt: AlphaReceipt }>();
  const backing = createAlphaMemoryRecovery(); let writable = true, sequence = 0;
  const recovery = { load: backing.load, save: (value: Parameters<typeof backing.save>[0]) => writable && backing.save(value) };
  const commit: AlphaRepository['execute'] = async command => {
    const prior = ledger.get(command.requestId);
    if (prior) return canonicalJson(prior.command) === canonicalJson(command) ? { ok: true, value: detached(prior.receipt) } : { ok: false, reason: 'idempotency-conflict' };
    if (command.kind !== 'social') return { ok: false, reason: 'invalid' };
    if (command.expectedRevision !== account.revision || command.expectedPublicRevision !== references.social!.revision) return { ok: false, reason: 'revision-conflict' };
    const transition = executeAlphaSocialIntent(materializeAccount(account, references).data, owner, command.intent, command.requestId, now);
    if (!transition.ok) return { ok: false, reason: 'invalid' };
    if (!transition.changed) return { ok: false, reason: 'no-change' };
    const publicChanged = canonicalJson(transition.data.public) !== canonicalJson(references.public);
    account = { ...account, revision: account.revision + 1, space: detached(transition.data.spaces[owner]) };
    references = { ...references, public: detached(transition.data.public), social: { ...references.social!, revision: references.social!.revision + (publicChanged ? 1 : 0) } };
    const receipt: AlphaReceipt = { requestId: command.requestId, revision: account.revision, kind: 'social', changed: true,
      resultId: transition.result, publicRevision: references.social!.revision };
    assert(isAccountForOwner(account, owner, references)); ledger.set(command.requestId, { command: detached(command), receipt });
    return { ok: true, value: detached(receipt) };
  };
  let read: AlphaRepository['read'] = async () => ({ ok: true, value: detached(account) });
  let execute: AlphaRepository['execute'] = async command => calls.length === 1 ? { ok: false, reason } : commit(command);
  const repository: AlphaRepository = { references: () => detached(references), read: () => read(),
    execute: command => { calls.push(detached(command)); return execute(command); },
    lookup: async requestId => { lookups.push(requestId); return { ok: true, value: detached(ledger.get(requestId)?.receipt ?? null) }; } };
  const controller = createAlphaSyncController({ recovery, requestId: () => `social-wire-${++sequence}` }); controller.bindSession(owner, repository);
  const intent: SaveIntent = { type: 'participation-save', draft: { ...newProgramParticipationDraft(), title: '합성 질문', body: '거절 전 입력' }, expected: null };
  const run = (next: AlphaSocialIntent = intent) => controller.mutate('작성 중인 글 저장', data => executeAlphaSocialIntent(data, owner, next, 'preview', now), { alphaSocial: next, history: false });
  return { controller, repository, recovery, backing, calls, lookups, ledger, intent, run, commit,
    account: () => detached(account), references: () => detached(references),
    setAccount: (next: AlphaAccount) => { account = detached(next); }, setReferences: (next: typeof references) => { references = detached(next); },
    setRead: (next: AlphaRepository['read']) => { read = next; }, setExecute: (next: AlphaRepository['execute']) => { execute = next; },
    setWritable: (next: boolean) => { writable = next; } };
}

test('SR01 definitive rate-limited draft save can directly save corrected input with a fresh request and the same CAS', async () => {
  const f = fixture(); assert(await f.controller.refresh()); const before = f.controller.snapshot();
  assert.equal((await f.run()).ok, false); assert.equal(f.ledger.size, 0); assert.equal(f.controller.snapshot().pending, null);
  assert.deepEqual(f.controller.snapshot().account, before.account);
  const corrected: SaveIntent = { ...f.intent, draft: { ...f.intent.draft, body: '수정한 입력', requestId: 'changed-content', cursor: { start: 3, end: 3 } } };
  const result = await f.run(corrected); assert(result.ok, JSON.stringify(result));
  assert.equal(f.calls.length, 2); assert.equal(f.ledger.size, 1); assert.notEqual(f.calls[0].requestId, f.calls[1].requestId);
  assert.equal(f.calls[1].expectedRevision, 0); assert.equal(f.calls[1].kind, 'social');
  if (f.calls[1].kind !== 'social') assert.fail('social command');
  assert.equal(f.calls[1].expectedPublicRevision, 0); assert.deepEqual(f.calls[1].intent, corrected);
  assert.equal(f.account().revision, 1); assert.equal(f.references().social!.revision, 0);
  assert.deepEqual(f.account().space.participationDrafts, [corrected.draft]); assert.deepEqual(f.references().public, before.references!.public);
  assert.equal(f.controller.snapshot().draft, null); assert.equal(f.controller.snapshot().pending, null);
  assert.equal(f.controller.snapshot().status, 'saved'); assert.equal(f.controller.snapshot().canUndo, false);
});

async function reject(f: ReturnType<typeof fixture>) {
  assert(await f.controller.refresh()); const before = f.controller.snapshot();
  assert.equal((await f.run()).ok, false); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, true);
  assert.equal(f.controller.snapshot().retryableRejectedDraft, false); assert.equal(f.controller.snapshot().retryableNativeHandoff, false);
  assert.deepEqual(f.controller.snapshot().account, before.account); assert.deepEqual(f.controller.snapshot().references, before.references);
  assert.equal(f.controller.snapshot().pending, null); assert.equal(f.ledger.size, 0); return before;
}

for (const reason of ['invalid', 'limit', 'rate-limited'] as const) test(`SR02 definitive ${reason} permits exact or corrected participation-save only`, async () => {
  const f = fixture(reason); await reject(f); const draft = f.controller.snapshot().draft;
  assert(await f.controller.refresh()); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, true);
  assert.deepEqual(f.controller.snapshot().draft, draft); assert.equal(f.calls.length, 1);
  const next = reason === 'rate-limited' ? f.intent : corrected(f.intent);
  // Canonical comparison does not depend on object insertion order.
  const reordered: SaveIntent = { expected: next.expected, draft: Object.fromEntries(Object.entries(next.draft).reverse()) as SaveIntent['draft'], type: 'participation-save' };
  assert((await f.run(reordered)).ok); assert.equal(f.ledger.size, 1);
  assert.deepEqual(f.account().space.participationDrafts, [next.draft]); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false);
  assert.equal(f.references().public.posts.length, 0);
});

test('SR03 different draft, action, target and CAS expectations are blocked before preview or dispatch', async () => {
  const f = fixture(); await reject(f); const before = f.controller.snapshot(); let built = 0;
  const targets: Partial<SaveIntent['draft']>[] = [{ id: 'other-draft' }, { kind: 'knowledge' }, { postId: 'other-post' }, { flowId: 'other-flow' },
    { versionId: 'other-version' }, { itemId: 'other-item' }, { parentReplyId: 'other-parent' }, { editTargetId: 'other-edit' },
    { expectedUpdatedAt: now }, { expectedContent: 'other-edit-token' }];
  const variants: AlphaSocialIntent[] = [...targets.map(target => ({ ...f.intent, draft: { ...corrected(f.intent).draft, ...target } })),
    { ...corrected(f.intent), expected: f.intent.draft }, { type: 'participation-submit', draft: f.intent.draft, expected: null },
    { type: 'participation-discard', draftId: f.intent.draft.id, expected: null }, { type: 'reaction-set', targetKind: 'post', targetId: 'other-post', desired: true }];
  for (const intent of variants) {
    assert.deepEqual(await f.controller.mutate('blocked social', data => { built++; return executeAlphaSocialIntent(data, owner, intent, 'preview', now); }, { alphaSocial: intent }), { ok: false, reason: 'unresolved' });
    assert.deepEqual(f.controller.snapshot(), before);
  }
  for (const options of [undefined, { alphaCreator: { type: 'working' as const, working: null, now } }]) {
    assert.deepEqual(await f.controller.mutate('unrelated', () => { built++; throw Error('must not build'); }, options), { ok: false, reason: 'unresolved' });
  }
  assert.deepEqual(await f.controller.undo(), { ok: false, reason: 'undo-conflict' }); assert.deepEqual(await f.controller.redo(), { ok: false, reason: 'undo-conflict' });
  assert.equal(built, 0); assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
});

test('SR04 lazy intent, failed preview and no-op never erase or retarget the rejected draft', async () => {
  const f = fixture(); await reject(f); const before = f.controller.snapshot(); let built = false;
  assert.deepEqual(await f.controller.mutate('lazy retarget', data => { built = true; return executeAlphaSocialIntent(data, owner, corrected(f.intent), 'preview', now); },
    { alphaSocial: () => { assert(built); return { ...corrected(f.intent), draft: { ...f.intent.draft, id: 'other-draft' } }; } }), { ok: false, reason: 'unresolved' });
  assert.deepEqual(await f.controller.mutate('no-op', data => ({ ok: true, data, changed: false, result: 'same' }), { alphaSocial: corrected(f.intent) }), { ok: false, reason: 'unresolved' });
  assert.deepEqual(await f.controller.mutate('failed', data => ({ ok: false, data, reason: 'invalid' }), { alphaSocial: corrected(f.intent) }), { ok: false, reason: 'invalid' });
  assert.deepEqual(f.controller.snapshot(), before); assert.equal(f.calls.length, 1);
  assert((await f.controller.mutate('lazy corrected', data => executeAlphaSocialIntent(data, owner, corrected(f.intent), 'preview', now),
    { alphaSocial: () => corrected(f.intent), history: false })).ok); assert.equal(f.ledger.size, 1);
});

test('SR05 changed private/public baseline, reference bytes and failed reads permanently remove retry proof', async () => {
  for (const scenario of ['private-revision', 'private-bytes', 'public-revision', 'reference-bytes', 'invalid', 'unauthenticated', 'unavailable', 'transport', 'persistence'] as const) {
    const f = fixture(); await reject(f); const draft = f.controller.snapshot().draft, account = f.account(), references = f.references();
    if (scenario === 'private-revision') f.setAccount({ ...account, revision: account.revision + 1 });
    if (scenario === 'private-bytes') { const next = detached(account); next.space.text.folders[0].title = 'other device'; f.setAccount(next); }
    if (scenario === 'public-revision') f.setReferences({ ...references, social: { ...references.social!, revision: 1 } });
    if (scenario === 'reference-bytes') f.setReferences({ ...references, social: { ...references.social!, actorNames: { ...references.social!.actorNames, [alias]: 'Changed alias' } } });
    if (scenario === 'invalid' || scenario === 'unauthenticated' || scenario === 'unavailable') f.setRead(async () => ({ ok: false, reason: scenario }));
    if (scenario === 'transport') f.setRead(async () => { throw Error('read lost'); });
    if (scenario === 'persistence') f.setWritable(false);
    await f.controller.refresh(); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false, scenario);
    assert.deepEqual(f.controller.snapshot().draft, draft); assert.deepEqual(await f.run(corrected(f.intent)), { ok: false, reason: 'unresolved' });
    assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
    f.setAccount(account); f.setReferences(references); f.setRead(async () => ({ ok: true, value: account })); f.setWritable(true);
    await f.controller.refresh(); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false, `${scenario}: cannot regain proof`);
  }
});

test('SR06 live reference change invalidates retry before polling and cannot be reversed into permission', async () => {
  const f = fixture(); await reject(f); const references = f.references(), draft = f.controller.snapshot().draft;
  f.setReferences({ ...references, social: { ...references.social!, revision: 1 } });
  assert.deepEqual(await f.run(corrected(f.intent)), { ok: false, reason: 'unresolved' });
  f.setReferences(references); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false);
  assert.deepEqual(f.controller.snapshot().draft, draft); assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
});

test('SR07 same-owner bind, owner switch, logout and reload never reconstruct rejection proof', async () => {
  for (const scenario of ['same-owner', 'owner-switch', 'logout', 'reload'] as const) {
    const f = fixture(); await reject(f); const draft = f.controller.snapshot().draft; let controller = f.controller;
    if (scenario === 'owner-switch') { controller.bindSession('another-owner', f.repository); assert.equal(controller.snapshot().draft, null); assert.equal(controller.snapshot().account, null); }
    if (scenario === 'logout') { controller.bindSession(null, null); assert.equal(controller.snapshot().draft, null); assert.equal(controller.snapshot().envelope, null); }
    if (scenario === 'reload') controller = createAlphaSyncController({ recovery: f.recovery });
    controller.bindSession(owner, f.repository); await controller.refresh(); assert.equal(controller.snapshot().retryableRejectedSocialDraft, false);
    assert.deepEqual(controller.snapshot().draft, draft); let built = false;
    assert.deepEqual(await controller.mutate('blocked recovered draft', data => { built = true; return executeAlphaSocialIntent(data, owner, corrected(f.intent), 'preview', now); },
      { alphaSocial: corrected(f.intent) }), { ok: false, reason: 'unresolved' });
    assert.equal(built, false); assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
  }
});

test('SR08 delayed rejection after session change cannot clear pending or grant fresh-write permission', async () => {
  const f = fixture(); let release!: (value: Awaited<ReturnType<AlphaRepository['execute']>>) => void;
  f.setExecute(() => new Promise(resolve => { release = resolve; })); assert(await f.controller.refresh());
  const pending = f.run(); const original = f.controller.snapshot().pending; assert(original);
  f.controller.bindSession(null, null); release({ ok: false, reason: 'rate-limited' });
  assert.deepEqual(await pending, { ok: false, reason: 'session-expired' }); assert.equal(f.controller.snapshot().envelope, null);
  f.controller.bindSession(owner, f.repository); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false);
  assert.deepEqual(f.controller.snapshot().pending, original); assert.deepEqual(await f.run(corrected(f.intent)), { ok: false, reason: 'unresolved' });
  assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
});

test('SR09 uncertain transport, Auth, unknown and malformed ACKs retain exact pending through rejection replay', async () => {
  const malformed: unknown[] = [null, { ok: false, reason: 'unknown' }, { ok: false, reason: 'rate-limited', committed: true },
    { ok: 0, reason: 'rate-limited' }, { ok: true }, { ok: true, value: { kind: 'social', requestId: 'wrong', revision: 1, changed: true, publicRevision: 0 } }];
  const outcomes: AlphaRepository['execute'][] = [async () => { throw Error('network lost'); }, async () => { throw new DOMException('timed out', 'TimeoutError'); },
    async () => ({ ok: false, reason: 'unavailable' }), async () => ({ ok: false, reason: 'unauthenticated' }),
    ...malformed.map(value => async () => value as Awaited<ReturnType<AlphaRepository['execute']>>)];
  for (const outcome of outcomes) {
    const f = fixture(); f.setExecute(outcome); assert(await f.controller.refresh()); const account = f.account();
    assert.equal((await f.run()).ok, false); const original = f.controller.snapshot().pending; assert(original);
    assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false); assert.deepEqual(f.account(), account);
    assert.deepEqual(await f.run(corrected(f.intent)), { ok: false, reason: 'unresolved' }); assert.equal(f.calls.length, 1);
    f.setExecute(async command => { assert.deepEqual(command, original); return { ok: false, reason: 'rate-limited' }; });
    assert.equal(await f.controller.resolvePending(true), false); assert.deepEqual(f.controller.snapshot().pending, original);
    assert.deepEqual(f.calls[1], f.calls[0]); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false);
    assert.deepEqual(await f.run(corrected(f.intent)), { ok: false, reason: 'unresolved' }); assert.equal(f.calls.length, 2); assert.equal(f.ledger.size, 0);
  }
});

test('SR10 lost corrected save ACK restores only its fresh request through lookup with exactly one commit', async () => {
  const f = fixture(); await reject(f); const next = corrected(f.intent);
  f.setExecute(async command => { const result = await f.commit(command); assert(result.ok); return { ok: false, reason: 'unavailable' }; });
  assert.equal((await f.run(next)).ok, false); const pending = f.controller.snapshot().pending; assert(pending);
  assert.notEqual(pending.requestId, f.calls[0].requestId); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false);
  assert.deepEqual(await f.run({ ...next, draft: { ...next.draft, body: 'third attempt' } }), { ok: false, reason: 'unresolved' });
  const reopened = createAlphaSyncController({ recovery: f.recovery }); reopened.bindSession(owner, f.repository); assert(await reopened.resolvePending());
  assert.deepEqual(f.lookups, [pending.requestId]); assert.equal(f.calls.length, 2); assert.equal(f.ledger.size, 1);
  assert.equal(reopened.snapshot().pending, null); assert.equal(reopened.snapshot().draft, null);
  assert.deepEqual(reopened.snapshot().account!.space.participationDrafts, [next.draft]); assert.equal(reopened.snapshot().canUndo, false);
  assert.equal(f.references().public.posts.length, 0);
});

test('SR11 corrected save receipt requires successful re-read and cannot renew retry proof', async () => {
  const f = fixture(); await reject(f); f.setRead(async () => ({ ok: false, reason: 'unavailable' }));
  assert.equal((await f.run(corrected(f.intent))).ok, false); const pending = f.controller.snapshot().pending; assert(pending);
  assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false); assert.equal(f.controller.snapshot().account!.revision, 0);
  assert.deepEqual(await f.run(corrected(f.intent)), { ok: false, reason: 'unresolved' }); assert.equal(f.calls.length, 2); assert.equal(f.ledger.size, 1);
  f.setRead(async () => ({ ok: true, value: f.account() })); assert(await f.controller.resolvePending()); assert.equal(f.calls.length, 2);
});

test('SR12 failed recovery persistence preserves original rejected input and blocks corrected dispatch', async () => {
  const f = fixture(); await reject(f); const before = f.controller.snapshot(); f.setWritable(false);
  assert.equal((await f.run(corrected(f.intent))).ok, false); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false);
  assert.deepEqual(f.controller.snapshot().draft, before.draft); assert.deepEqual(f.controller.snapshot().account, before.account);
  assert.equal(f.controller.snapshot().pending, null); assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
  const stored = f.backing.load(owner); assert(stored.ok); assert.deepEqual(stored.value!.draft, before.draft);
  assert.deepEqual(Object.keys(stored.value!).sort(), ['confirmed', 'draft', 'ownerId', 'pending', 'references', 'schema']);
});

test('SR13 every repeated definite refusal needs its own live proof before the next corrected save', async () => {
  const f = fixture(); await reject(f); f.setExecute(async () => ({ ok: false, reason: 'invalid' }));
  const next = corrected(f.intent); assert.equal((await f.run(next)).ok, false); assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, true);
  assert.equal(f.controller.snapshot().draft?.requestId, f.calls[1].requestId); assert.equal(f.calls.length, 2); assert.equal(f.ledger.size, 0);
  f.setExecute(f.commit); const final: SaveIntent = { ...next, draft: { ...next.draft, body: '한 번 더 수정', requestId: 'third-content' } };
  assert((await f.run(final)).ok); assert.equal(f.calls.length, 3); assert.equal(f.ledger.size, 1);
  assert.equal(new Set(f.calls.map(command => command.requestId)).size, 3); assert.deepEqual(f.account().space.participationDrafts, [final.draft]);
});

test('SR14 client rejects implicit replacement, reused request ID, changed revision and mixed retry modes', async () => {
  const f = fixture(), client = createAlphaClient(isAccountForOwner, f.recovery); client.bindSession(owner, f.repository); assert(await client.refresh());
  const command: Extract<AlphaCommand, { kind: 'social' }> = { schema: 'flowme-alpha-social-command/1', kind: 'social', requestId: 'first',
    expectedRevision: 0, expectedPublicRevision: 0, intent: f.intent };
  assert.equal(await client.execute(command), false); assert.equal(client.snapshot().retryableRejectedSocialDraft, true); const before = client.snapshot();
  const valid = { ...command, requestId: 'fresh', intent: corrected(f.intent) };
  assert.equal(await client.execute(valid), false); assert.deepEqual(client.snapshot(), before);
  for (const next of [command, { ...valid, expectedRevision: 1 }, { ...valid, expectedPublicRevision: 1 },
    { ...valid, intent: { ...corrected(f.intent), expected: f.intent.draft } }]) {
    assert.equal(await client.execute(next, { retryRejectedSocialDraft: true }), false); assert.deepEqual(client.snapshot(), before);
  }
  for (const extra of [{ retryRejectedDraft: true }, { retryNativeHandoff: true }]) {
    assert.equal(await client.execute(valid, { retryRejectedSocialDraft: true, ...extra }), false); assert.deepEqual(client.snapshot(), before);
  }
  assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
  assert(await client.execute(valid, { retryRejectedSocialDraft: true })); assert.equal(f.calls.length, 2); assert.equal(f.ledger.size, 1);
});

test('SR15 non-writing or conflict rejections and stale social commands never qualify for draft replacement', async () => {
  for (const reason of ['not-found', 'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'no-change'] as const) {
    const f = fixture(reason); assert(await f.controller.refresh()); assert.equal((await f.run()).ok, reason === 'no-change');
    assert.equal(f.controller.snapshot().retryableRejectedSocialDraft, false); assert.deepEqual(await f.run(corrected(f.intent)), { ok: false, reason: 'unresolved' });
    assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
  }
  const f = fixture('invalid'), client = createAlphaClient(isAccountForOwner, f.recovery); client.bindSession(owner, f.repository); await client.refresh();
  assert.equal(await client.execute({ schema: 'flowme-alpha-social-command/1', kind: 'social', requestId: 'stale', expectedRevision: 1, expectedPublicRevision: 0, intent: f.intent }), false);
  assert.equal(client.snapshot().retryableRejectedSocialDraft, false); assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
});
