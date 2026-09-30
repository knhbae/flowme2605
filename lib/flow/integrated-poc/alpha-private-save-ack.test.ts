import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmedAlphaPrivateTextSave } from './alpha-private-save-ack';
import { createProgramPrivateSpace } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { ALPHA_SCHEMA, ALPHA_COMMAND_SCHEMA, type AlphaAccount, type AlphaCommand, type AlphaPrivateCommand, type AlphaReferenceContext } from './alpha-persistence/contract';
import { materializeAccount, privateChanges } from './alpha-persistence/program-adapter';
import { createAlphaFakeServer } from './alpha-persistence/fake-server';
import { createAlphaMemoryRecovery } from './alpha-persistence/local-recovery';
import { createAlphaSyncController, type AlphaSyncSnapshot } from './alpha-sync/controller';

function seed(ownerId = 'a') {
  const space = createProgramPrivateSpace();
  space.text = M.addDocument(space.text, { title: '저장 확인 문서' });
  const documentId = space.text.documents.at(-1)!.id;
  space.text = M.editText(space.text, documentId, '- 기존 할 일');
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId, revision: 0,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: ownerId, revision: 0 }, space, legacyUndo: [], legacyReceipts: [] };
  const references: AlphaReferenceContext = { actorIds: [ownerId], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
  return { account, references, documentId };
}

function fixture() {
  const seeded = seed();
  const before = materializeAccount(structuredClone(seeded.account), seeded.references).data;
  const account = structuredClone(seeded.account);
  account.revision = 1;
  account.space.text = M.editText(account.space.text, seeded.documentId, '- 수정한 할 일');
  const pending: AlphaPrivateCommand = { schema: ALPHA_COMMAND_SCHEMA, kind: 'change-private', requestId: 'same-request', expectedRevision: 0,
    changes: privateChanges(before.spaces.a, account.space) };
  const next: AlphaSyncSnapshot = { ownerId: 'a', account, envelope: materializeAccount(account, seeded.references),
    status: 'saved', busy: false, pending: null, draft: null, canUndo: true, canRedo: false,
    lastReceipt: { requestId: pending.requestId, kind: 'change-private', changed: true, revision: 1 } };
  return { before, next, pending, documentId: seeded.documentId, revision: 0 as number | null, publicRevision: null as number | null };
}
type Fixture = ReturnType<typeof fixture>;
const proof = (f: Fixture) => confirmedAlphaPrivateTextSave('a', f.before, f.revision, f.publicRevision, f.pending, f.next);

test('private text acknowledgment proves the complete same-request result without changing either snapshot', () => {
  const f = fixture(), before = structuredClone(f);
  assert.deepEqual(proof(f), { before: f.before.spaces.a.text, next: f.next.account!.space.text });
  assert.deepEqual(f, before);
});

test('text save may also contain its owned position and metadata changes', () => {
  const f = fixture();
  f.next.account!.space.position = { documentId: f.documentId, lineId: M.getDocument(f.next.account!.space.text, f.documentId)!.lines[0].id, start: 2, end: 2, scrollTop: 30 };
  f.pending.changes = privateChanges(f.before.spaces.a, f.next.account!.space);
  assert(proof(f));
});

test('unchanged public revision and bytes allow a private text acknowledgment', () => {
  const f = fixture(); f.publicRevision = 7; f.next.publicRevision = 7;
  assert(proof(f));
});

const rejectedCases: Array<[string, (f: Fixture) => void]> = [
  ['receipt belongs to another request', f => { f.next.lastReceipt!.requestId = 'another-request'; }],
  ['receipt kind differs', f => { f.next.lastReceipt!.kind = 'undo-private'; }],
  ['receipt is absent', f => { f.next.lastReceipt = null; }],
  ['receipt did not change state', f => { f.next.lastReceipt!.changed = false; }],
  ['receipt is stale', f => { f.next.lastReceipt!.revision = 0; }],
  ['receipt skipped a revision', f => { f.next.lastReceipt!.revision = 2; f.next.account!.revision = 2; }],
  ['server advanced after our receipt', f => { f.next.account!.revision = 2; }],
  ['displayed baseline revision differs', f => { f.revision = 1; }],
  ['displayed baseline revision is missing', f => { f.revision = null; }],
  ['pending expected revision differs', f => { f.pending.expectedRevision = 1; }],
  ['public revision changed', f => { f.publicRevision = 7; f.next.publicRevision = 8; }],
  ['public revision disappeared', f => { f.publicRevision = 7; }],
  ['public bytes changed at the same public revision', f => {
    f.publicRevision = 7; f.next.publicRevision = 7;
    f.next.envelope!.data.public = { ...f.next.envelope!.data.public, posts: [{ id: 'foreign-post' } as never] };
  }],
  ['unrequested private position changed', f => { f.next.account!.space.position.scrollTop = 300; }],
  ['request body contains a different title', f => {
    const changed = structuredClone(f.next.account!.space);
    changed.text = M.editText(changed.text, f.documentId, '- 다른 요청 내용');
    f.pending.changes = privateChanges(f.before.spaces.a, changed);
  }],
  ['raw matches but server line identity differs', f => { M.getDocument(f.next.account!.space.text, f.documentId)!.lines[0].id = 'foreign-line-id'; }],
  ['text field is not in the request', f => { f.pending.changes = [{ field: 'position', present: true, value: f.next.account!.space.position }]; }],
  ['text field was deleted', f => { f.pending.changes = [{ field: 'text', present: false }]; }],
  ['snapshot belongs to another owner', f => { f.next.ownerId = 'b'; }],
  ['account belongs to another owner', f => { f.next.account!.ownerId = 'b'; }],
  ['account source belongs to another actor', f => { f.next.account!.source.actorId = 'b'; }],
  ['displayed actor changed', f => { f.before.activeActorId = 'b'; }],
  ['returned actor changed', f => { f.next.envelope!.data.activeActorId = 'b'; }],
  ['save is still busy', f => { f.next.busy = true; }],
  ['pending request remains unresolved', f => { f.next.pending = f.pending; }],
  ['draft remains unresolved', f => { f.next.draft = f.pending; }],
  ['account is unavailable', f => { f.next.account = null; }],
  ['envelope is unavailable', f => { f.next.envelope = null; }],
];
for (const [name, change] of rejectedCases) test(`private text acknowledgment rejects ${name}`, () => {
  const f = fixture(); change(f); assert.equal(proof(f), null);
});
for (const status of ['ready', 'saving', 'same-location', 'conflict', 'checking-result', 'recovery-required', 'session-expired', 'signed-out', 'cancelled'] as const) {
  test(`private text acknowledgment rejects ${status} status even with equal request bytes`, () => {
    const f = fixture(); f.next.status = status; assert.equal(proof(f), null);
  });
}

test('refresh with equal text but no pending request cannot prove ownership', () => {
  const f = fixture();
  assert.equal(confirmedAlphaPrivateTextSave('a', f.before, 0, null, null, f.next), null);
  assert.equal(confirmedAlphaPrivateTextSave('a', null, 0, null, f.pending, f.next), null);
  const undo: AlphaPrivateCommand = { schema: ALPHA_COMMAND_SCHEMA, kind: 'undo-private', requestId: f.pending.requestId, expectedRevision: 0, operationId: 'old' };
  assert.equal(confirmedAlphaPrivateTextSave('a', f.before, 0, null, undo, f.next), null);
});

for (const mode of ['unavailable-before-dispatch', 'lost-response-after-commit'] as const) {
  test(`real controller acknowledgment follows ${mode} with the identical command and exactly one server mutation`, async () => {
    const a = seed(), server = createAlphaFakeServer([a]);
    const port = server.connect(server.issueSession('a')), requests: AlphaCommand[] = [];
    const controller = createAlphaSyncController({ recovery: createAlphaMemoryRecovery(), requestId: () => 'request-owned-by-editor' });
    controller.bindSession('a', { ...port, execute: async command => {
      requests.push(structuredClone(command));
      if (requests.length === 1) {
        if (mode === 'unavailable-before-dispatch') return { ok: false, reason: 'unavailable' };
        await port.execute(command); throw Error('synthetic lost response');
      }
      return port.execute(command);
    } });
    assert(await controller.refresh());
    const before = controller.snapshot().envelope!.data;
    assert.equal((await controller.mutate('문서 수정', data => {
      data.spaces.a.text = M.editText(data.spaces.a.text, a.documentId, '- 수정한 할 일');
      return { ok: true, changed: true, data, result: a.documentId };
    })).ok, false);
    const pending = controller.snapshot().pending;
    assert(pending); assert.equal(controller.snapshot().lastReceipt, null);
    assert(await controller.resolvePending(true));
    const next = controller.snapshot();
    assert.equal(next.lastReceipt!.requestId, pending.requestId);
    assert(confirmedAlphaPrivateTextSave('a', before, 0, null, pending, next));
    assert.equal(next.account!.revision, 1); assert.equal(server.diagnostics().mutations, 1);
    assert.equal(requests.length, mode === 'unavailable-before-dispatch' ? 2 : 1);
    if (requests.length === 2) assert.deepEqual(requests[0], requests[1]);
    assert.equal(await controller.resolvePending(true), false);
    assert.equal(server.diagnostics().mutations, 1);
    controller.bindSession(null, null);
    assert.equal(controller.snapshot().lastReceipt, null);
    assert.equal(confirmedAlphaPrivateTextSave('a', before, 0, null, pending, controller.snapshot()), null);
  });
}

test('a valid recovered receipt does not acknowledge a newer server snapshot containing a foreign write', async () => {
  const a = seed(), server = createAlphaFakeServer([a]);
  const port = server.connect(server.issueSession('a'));
  const controller = createAlphaSyncController({ recovery: createAlphaMemoryRecovery(), requestId: () => 'own-request' });
  controller.bindSession('a', { ...port, execute: async command => { await port.execute(command); throw Error('lost response'); } });
  assert(await controller.refresh()); const before = controller.snapshot().envelope!.data;
  assert.equal((await controller.mutate('own edit', data => {
    data.spaces.a.text = M.editText(data.spaces.a.text, a.documentId, '- 저장한 입력');
    return { ok: true, changed: true, data, result: a.documentId };
  })).ok, false);
  const pending = controller.snapshot().pending;
  const latest = await port.read(); assert(latest.ok);
  const after = structuredClone(latest.value.space); after.position.scrollTop = 500;
  assert((await port.execute({ schema: ALPHA_COMMAND_SCHEMA, kind: 'change-private', requestId: 'foreign-request', expectedRevision: 1,
    changes: privateChanges(latest.value.space, after) })).ok);
  assert(await controller.resolvePending());
  const next = controller.snapshot();
  assert.equal(next.status, 'saved'); assert.equal(next.lastReceipt!.revision, 1); assert.equal(next.account!.revision, 2);
  assert.equal(confirmedAlphaPrivateTextSave('a', before, 0, null, pending, next), null);
  assert.equal(server.diagnostics().mutations, 2);
});

test('an old session lookup completing after an account switch cannot publish its acknowledgment', async () => {
  const a = seed('a'), b = seed('b'), server = createAlphaFakeServer([a, b]);
  const portA = server.connect(server.issueSession('a')), portB = server.connect(server.issueSession('b'));
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const controller = createAlphaSyncController({ recovery: createAlphaMemoryRecovery(), requestId: () => 'old-owner-request' });
  controller.bindSession('a', { ...portA,
    execute: async command => { await portA.execute(command); throw Error('lost response'); },
    lookup: async requestId => { await gate; return portA.lookup(requestId); },
  });
  assert(await controller.refresh()); const before = controller.snapshot().envelope!.data;
  await controller.mutate('old owner edit', data => {
    data.spaces.a.text = M.editText(data.spaces.a.text, a.documentId, '- 이전 계정 입력');
    return { ok: true, changed: true, data, result: a.documentId };
  });
  const pending = controller.snapshot().pending, lookup = controller.resolvePending();
  controller.bindSession('b', portB); assert(await controller.refresh()); release();
  assert.equal(await lookup, false);
  const next = controller.snapshot();
  assert.equal(next.ownerId, 'b'); assert.equal(next.lastReceipt, null); assert.equal(next.account!.revision, 0);
  assert.equal(confirmedAlphaPrivateTextSave('a', before, 0, null, pending, next), null);
});
