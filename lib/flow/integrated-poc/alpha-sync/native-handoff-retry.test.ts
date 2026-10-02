import assert from 'node:assert/strict';
import test from 'node:test';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { type AlphaCreatorIntent } from '../alpha-creator/contract';
import { dispatchAlphaCreatorCommand, executeAlphaCreatorIntent } from '../alpha-creator/dispatch-source';
import { ALPHA_SCHEMA, type AlphaAccount, type AlphaCommand, type AlphaReceipt, type AlphaRepository } from '../alpha-persistence/contract';
import { canonicalJson, detached } from '../alpha-persistence/json';
import { createAlphaMemoryRecovery } from '../alpha-persistence/local-recovery';
import { materializeAccount, privateChanges } from '../alpha-persistence/program-adapter';
import { inspectProgramNativeCreatorHandoff } from '../creator-native-execution-adapter';
import { applyProgramCreatorAction, setProgramCreatorWorking } from '../creator-workspace';
import { createNativeCreatorDocumentOwner } from '../native-creator-document';
import { createTextAuthoringDocument } from '../native-creator-vendor/text-authoring/parser';
import { createProgramPrivateSpace } from '../program-data';
import { textWorkspaceModel as M } from '../text-workspace';
import { fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../../personal-workspace-poc-authoring';
import { createAlphaSyncController } from './controller';

const now = '2026-10-01T12:00:00.000Z', raw = '# 합성 native 준비\r\n\r\n- [ ] 챙기기\r\n  - 날짜: 2026-10-01\r\n  - 시간: 09:30\r\n\r\n- [ ] 날짜 미정 확인';
const references = { actorIds: ['a'], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
function seed(): AlphaAccount {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: 'a', revision: 0,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: 'a', revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const document = createTextAuthoringDocument(raw, { documentId: 'source-document', ownership: 'creator', now });
  const source = { storageKey: 'flow:text-authoring:drafts:v1' as const, draftId: 'source-draft', versionId: 'source-version',
    revisionId: document.revision.revisionId, documentJson: JSON.stringify(document) };
  const native = createNativeCreatorDocumentOwner({ id: 'native-draft', source }, now); assert(native.ok);
  const working = setProgramCreatorWorking(materializeAccount(account, references).data, { actorId: 'a', expectedWorking: null,
    working: { draftId: 'native-draft', title: '합성 제작', rawText: raw, baseRecordRevision: null, nativeDocument: native.owner, nativeSelection: source } }, now); assert(working.ok);
  const saved = applyProgramCreatorAction(working.data, { actorId: 'a', requestId: 'seed-save', expectedStructure: null,
    expectedNativeDocument: native.owner, expectedNativeSelection: source,
    action: { type: 'save', draftId: 'native-draft', title: '합성 제작', rawText: raw, sourceFingerprint: fingerprint(raw), expectedLibraryRevision: 0, now } }, now); assert(saved.ok);
  account.space = saved.data.spaces.a; assert(isAccountForOwner(account, 'a')); return account;
}
function setup() {
  let account = seed(), serial = 0, rejectFirst = true, writable = true;
  const calls: AlphaCommand[] = [], ledger = new Map<string, { command: AlphaCommand; receipt: AlphaReceipt; inverse: ReturnType<typeof privateChanges> }>();
  const backing = createAlphaMemoryRecovery(), recovery = { load: backing.load, save: (value: Parameters<typeof backing.save>[0]) => writable && backing.save(value) };
  const repository: AlphaRepository = { read: async () => ({ ok: true, value: detached(account) }), lookup: async id => ({ ok: true, value: detached(ledger.get(id)?.receipt ?? null) }), execute: async command => {
    calls.push(detached(command));
    if (rejectFirst && command.kind === 'creator' && command.intent.type === 'native-handoff') { rejectFirst = false; return { ok: false, reason: 'limit' }; }
    const prior = ledger.get(command.requestId);
    if (prior) return canonicalJson(prior.command) === canonicalJson(command) ? { ok: true, value: detached(prior.receipt) } : { ok: false, reason: 'idempotency-conflict' };
    if (command.expectedRevision !== account.revision) return { ok: false, reason: 'revision-conflict' };
    const before = detached(account); let changes: ReturnType<typeof privateChanges>, resultId: string | undefined;
    if (command.kind === 'creator') {
      const transition = dispatchAlphaCreatorCommand(account, command); if (!transition.ok) return { ok: false, reason: 'invalid' };
      if (!transition.changed) return { ok: false, reason: 'no-change' }; changes = transition.changes; resultId = transition.result;
    } else if (command.kind === 'undo-creator') {
      const original = ledger.get(command.operationId); if (!original || original.receipt.revision !== account.revision) return { ok: false, reason: 'undo-conflict' };
      changes = original.inverse;
    } else return { ok: false, reason: 'invalid' };
    for (const change of changes) {
      if (change.present) Object.assign(account.space, { [change.field]: detached(change.value) }); else Reflect.deleteProperty(account.space, change.field);
    }
    account.revision++; assert(isAccountForOwner(account, 'a'));
    const receipt: AlphaReceipt = { kind: command.kind, requestId: command.requestId, revision: account.revision, changed: true, ...(resultId ? { resultId } : {}) };
    ledger.set(command.requestId, { command: detached(command), receipt, inverse: privateChanges(account.space, before.space) });
    return { ok: true, value: detached(receipt) };
  } };
  const controller = createAlphaSyncController({ recovery, requestId: () => `native-wire-${++serial}` }); controller.bindSession('a', repository);
  const preview = inspectProgramNativeCreatorHandoff(materializeAccount(account, references).data, { actorId: 'a', draftId: 'native-draft', anchor: '2026-10-01' }, now); assert(preview.ok);
  const intent: AlphaCreatorIntent = { type: 'native-handoff', draftId: 'native-draft', anchor: '2026-10-01', now,
    choices: Object.fromEntries(preview.preview.rows.map(row => [row.itemId, { source: 'incoming' as const, date: 'keep' as const, time: 'keep' as const, children: 'keep' as const }])) };
  return { controller, repository, recovery, backing, calls, ledger, intent, account: () => detached(account),
    setAccount: (next: AlphaAccount) => { account = detached(next); }, setWritable: (next: boolean) => { writable = next; } };
}
const run = (f: ReturnType<typeof setup>, intent = f.intent) => f.controller.mutate('native comparison apply', data => executeAlphaCreatorIntent(data, 'a', intent, 'local-preview'), { alphaCreator: intent });
async function reject(f: ReturnType<typeof setup>) {
  assert(await f.controller.refresh()); const before = f.controller.snapshot();
  assert.deepEqual(await run(f), { ok: false, reason: 'limit' });
  assert.equal(f.controller.snapshot().retryableNativeHandoff, true); assert.equal(f.controller.snapshot().retryableRejectedDraft, false);
  assert.deepEqual(f.controller.snapshot().account, before.account); assert.equal(f.controller.snapshot().pending, null);
  assert.equal(f.ledger.size, 0); assert.equal(f.controller.snapshot().canUndo, false); return before;
}

test('NR10 exact native compare retry commits one personal document, preserves creator source and uses server Undo', async () => {
  const f = setup(), before = await reject(f), owner = before.account!.space.creatorWorkspace!, documents = before.account!.space.text.documents.length;
  const intent = detached(f.intent), stored = f.controller.snapshot().draft;
  assert(await f.controller.refresh()); assert.deepEqual(f.controller.snapshot().draft, stored); assert.deepEqual(f.intent, intent);
  const result = await run(f); assert(result.ok, JSON.stringify(result));
  assert.equal(f.calls.length, 2); assert.equal(f.ledger.size, 1); assert.notEqual(f.calls[0].requestId, f.calls[1].requestId);
  assert.deepEqual({ ...f.calls[1], requestId: f.calls[0].requestId }, f.calls[0]);
  const next = f.account(), nextOwner = next.space.creatorWorkspace!;
  assert.equal(next.revision, 1); assert.equal(next.space.text.documents.length, documents + 1);
  assert.equal(result.result, nextOwner.handoffs['native-draft'].documentId);
  assert.equal(nextOwner.nativeExecutionSources!['native-draft'].documentId, result.result);
  assert.deepEqual(nextOwner.library, owner.library); assert.deepEqual(nextOwner.working, owner.working);
  assert.deepEqual(nextOwner.structureDrafts, owner.structureDrafts); assert.deepEqual(next.source, before.account!.source);
  const tasks = M.tasks(next.space.text).filter(task => task.docId === result.result); assert.equal(tasks.length, 2);
  assert.equal(tasks[0].date, '2026-10-01'); assert.equal(tasks[0].time, '09:30'); assert.equal(tasks[0].done, false);
  assert.equal(f.controller.snapshot().draft, null); assert.equal(f.controller.snapshot().retryableNativeHandoff, false); assert.equal(f.controller.snapshot().canUndo, true);
  assert((await f.controller.undo()).ok); assert.equal(f.calls.at(-1)?.kind, 'undo-creator'); assert.deepEqual(f.account().space, before.account!.space);
});

test('NR11 changed comparison selection/anchor/now and unrelated creator/social/private cannot replace native draft', async () => {
  const f = setup(); await reject(f); assert.equal(f.intent.type, 'native-handoff'); if (f.intent.type !== 'native-handoff') assert.fail('native intent');
  const before = f.controller.snapshot(); let built = 0;
  const intents: AlphaCreatorIntent[] = [{ ...f.intent, choices: {} }, { ...f.intent, anchor: '2026-10-02' }, { ...f.intent, now: '2026-10-01T12:01:00.000Z' },
    { type: 'working', working: null, now }, { type: 'raw-handoff', draftId: 'native-draft', expectedRecordRevision: 1, today: '2026-10-01', now },
    { type: 'catalog-library-import', catalogVersion: 'catalog', now }];
  for (const intent of intents) assert.deepEqual(await f.controller.mutate('not same native', data => { built++; return executeAlphaCreatorIntent(data, 'a', intent, 'local'); }, { alphaCreator: intent }), { ok: false, reason: 'unresolved' });
  assert.deepEqual(await f.controller.mutate('private', () => { built++; throw Error('must not build'); }), { ok: false, reason: 'unresolved' });
  assert.deepEqual(await f.controller.mutate('social', () => { built++; throw Error('must not build'); }, { alphaSocial: { type: 'copy-anchor', copyId: 'copy', anchor: '2026-10-01' } }), { ok: false, reason: 'unresolved' });
  assert.deepEqual(await f.controller.undo(), { ok: false, reason: 'undo-conflict' }); assert.deepEqual(await f.controller.redo(), { ok: false, reason: 'undo-conflict' });
  assert.equal(built, 0); assert.equal(f.calls.length, 1); assert.deepEqual(f.controller.snapshot(), before);
  assert((await run(f)).ok);
});

test('NR12 lazy native intent must match retained bytes after preview; failure/no-op leaves the rejected draft intact', async () => {
  const f = setup(); await reject(f); const before = f.controller.snapshot(); let built = false;
  assert.deepEqual(await f.controller.mutate('lazy changed', data => { built = true; return executeAlphaCreatorIntent(data, 'a', f.intent, 'local'); },
    { alphaCreator: () => { assert(built); return { type: 'working', working: null, now }; } }), { ok: false, reason: 'unresolved' });
  assert.deepEqual(await f.controller.mutate('noop preview', data => ({ ok: true, data, changed: false, result: 'cancelled' }), { alphaCreator: f.intent }), { ok: false, reason: 'unresolved' });
  assert.deepEqual(await f.controller.mutate('bad preview', data => ({ ok: false, data, reason: 'invalid' }), { alphaCreator: f.intent }), { ok: false, reason: 'invalid' });
  assert.deepEqual(f.controller.snapshot(), before); assert.equal(f.calls.length, 1);
  const result = await f.controller.mutate('exact lazy', data => executeAlphaCreatorIntent(data, 'a', f.intent, 'local'), { alphaCreator: () => detached(f.intent) });
  assert(result.ok); assert.equal(f.ledger.size, 1);
});

test('NR13 changed remote revision, failed read and same-owner/reload boundary reject without rebuilding native input', async () => {
  for (const scenario of ['revision', 'read-failure', 'same-owner', 'reload'] as const) {
    const f = setup(); await reject(f); const draft = f.controller.snapshot().draft;
    let controller = f.controller;
    if (scenario === 'revision') { const next = f.account(); next.revision++; next.space.text.folders[0].title = 'other device'; f.setAccount(next); await controller.refresh(); }
    if (scenario === 'read-failure') {
      // Keep the same session generation; a failed poll must irreversibly lose proof.
      const read = f.repository.read; f.repository.read = async () => ({ ok: false, reason: 'unavailable' });
      assert.equal(await controller.refresh(), false); f.repository.read = read; assert(await controller.refresh());
    }
    if (scenario === 'same-owner') { controller.bindSession('a', f.repository); await controller.refresh(); }
    if (scenario === 'reload') { controller = createAlphaSyncController({ recovery: f.recovery }); controller.bindSession('a', f.repository); await controller.refresh(); }
    assert.equal(controller.snapshot().retryableNativeHandoff, false); assert.deepEqual(controller.snapshot().draft, draft); let built = false;
    assert.deepEqual(await controller.mutate('blocked', data => { built = true; return executeAlphaCreatorIntent(data, 'a', f.intent, 'local'); }, { alphaCreator: f.intent }), { ok: false, reason: 'unresolved' });
    assert.equal(built, false); assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
  }
});

test('NR14 ambiguous native response and replay-limit never offer a fresh semantic retry', async () => {
  const f = setup(); let attempts = 0, pendingBody: AlphaCommand | undefined;
  f.controller.bindSession('a', { ...f.repository, execute: async command => { attempts++; pendingBody ??= detached(command); if (attempts === 1) throw Error('lost'); assert.deepEqual(command, pendingBody); return { ok: false, reason: 'limit' }; } });
  assert(await f.controller.refresh()); assert(!(await run(f)).ok); const pending = f.controller.snapshot().pending; assert(pending);
  assert.equal(await f.controller.resolvePending(true), false); assert.deepEqual(f.controller.snapshot().pending, pending); assert.equal(f.controller.snapshot().retryableNativeHandoff, false);
  assert.deepEqual(await run(f), { ok: false, reason: 'unresolved' }); assert.equal(attempts, 2); assert.equal(f.ledger.size, 0);
});

test('NR15 native retry persistence failure retains selection and durable old draft with no server call', async () => {
  const f = setup(); await reject(f); const before = f.controller.snapshot(); f.setWritable(false);
  assert(!(await run(f)).ok); assert.equal(f.controller.snapshot().retryableNativeHandoff, false);
  assert.deepEqual(f.controller.snapshot().draft, before.draft); assert.deepEqual(f.controller.snapshot().account, before.account);
  assert.equal(f.controller.snapshot().pending, null); assert.equal(f.calls.length, 1); assert.equal(f.ledger.size, 0);
  const stored = f.backing.load('a'); assert(stored.ok); assert.deepEqual(stored.value?.draft, before.draft);
});
