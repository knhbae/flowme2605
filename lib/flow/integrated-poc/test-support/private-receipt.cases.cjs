'use strict';

// Consumer-only synthetic regression: actual candidate shell callbacks, receipt
// predicate and draft controller, with fictional snapshots and in-memory ports.
// A hand-authored lastReceipt is an input to the consumer, never server proof.
// No real account, HTTP repository, DOM, filesystem storage or deployment is used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { declaration, initializer, evaluate, load, ast, find, ts, read } = require('./consumer-source.cjs');
const SHELL = 'components/flow/integrated-poc/AlphaWorkspace.tsx';
const EDITOR = 'components/flow/integrated-poc/ProgramTextEditor.tsx';
const { textWorkspaceModel: M } = load('lib/flow/integrated-poc/text-workspace.ts');
const { createProgramPrivateSpace } = load('lib/flow/integrated-poc/program-data.ts');
const { createProgramTextDraft } = load('lib/flow/integrated-poc/program-text-draft.ts');
const { confirmedAlphaPrivateTextSave } = load('lib/flow/integrated-poc/alpha-private-save-ack.ts');
const { materializeAccount, privateChanges } = load('lib/flow/integrated-poc/alpha-persistence/program-adapter.ts');
const { canonicalJson, detached } = load('lib/flow/integrated-poc/alpha-persistence/json.ts');
const { ALPHA_SCHEMA, ALPHA_COMMAND_SCHEMA } = load('lib/flow/integrated-poc/alpha-persistence/contract.ts');
const { PROGRAM_SCHEMA } = load('lib/flow/integrated-poc/contract.ts');
const { createAlphaUiRecovery } = load('lib/flow/integrated-poc/alpha-ui-recovery.ts');
const OWNER = 'consumer-owner';
const PUBLIC = { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] };
// Shared fixture construction lets the interaction cases replace the structural
// stubs with the actual shell capture/cleanup and real in-memory controller.
module.exports = { shellHarness, fixture, snapshot, retained, OWNER, PUBLIC };
const declarations = Object.fromEntries(['present', 'reviewAnnouncementState', 'captureInput', 'captureCreator', 'mergeRecoveryDrafts']
  .map(name => [name, declaration(SHELL, name)]));
const isolationDeclaration = declaration(SHELL, 'privateTextChangeIsolatedToDocument');
const initializers = Object.fromEntries(['allEditors', 'hasInput', 'mutate'].map(name => [name, initializer(SHELL, name)]));
const editorAst = ast(EDITOR);
const registerConfirmation = find(editorAst, node => ts.isCallExpression(node)
  && node.expression.getText(editorAst) === 'propsRef.current.onRegisterConfirmedSave');
const confirmationCallback = registerConfirmation.arguments[0].getText(editorAst);

function snapshot(text, revision = 1) {
  const account = { schema: ALPHA_SCHEMA, ownerId: OWNER, revision,
    source: { schema: PROGRAM_SCHEMA, actorId: OWNER, revision: 0 },
    space: { ...createProgramPrivateSpace(), text }, legacyUndo: [], legacyReceipts: [] };
  return { ownerId: OWNER, account, envelope: materializeAccount(account, { actorIds: [OWNER], public: PUBLIC }),
    status: 'ready', busy: false, pending: null, draft: null, canUndo: false, canRedo: false };
}

function shellHarness(before, pending) {
  const writes = new Map();
  const memoryStorage = { getItem: key => writes.get(key) ?? null,
    setItem: (key, raw) => { writes.set(key, raw); }, removeItem: key => { writes.delete(key); } };
  const epoch = {};
  const c = {
    session: { userId: OWNER }, currentOwnerRef: { current: OWNER }, disposed: { current: false },
    sessionEpochRef: { current: epoch }, ownMutation: { current: 0 }, externalRef: { current: false }, external: false,
    currentData: { current: before.envelope.data }, currentRevision: { current: 1 }, currentPublicRevision: { current: null },
    previousSnapshot: { current: { ...before, pending, draft: pending, status: 'checking-result' } },
    reviewAnnouncementGeneration: { current: 0 }, snapshot: before, data: before.envelope.data,
    editors: { current: null }, legacyEditors: { current: null }, creatorEditors: { current: null },
    publisherEditors: { current: null }, communityEditors: { current: null }, inspectorEditors: { current: null },
    discoveryStateRef: { current: { url: '', pastedText: '', pastedTitle: '', transient: null } },
    programDiscoveryHasUnstoredInput: value => !!(value.url || value.pastedText || value.pastedTitle || value.transient),
    modalRef: { current: false }, uiRecovery: { current: createAlphaUiRecovery(memoryStorage, { ownerId: OWNER, slotId: 'case-b' }) },
    creatorRecovery: { current: null }, socialRecovery: { current: null }, confirmedParticipation: { current: null },
    parkedDrafts: { current: [] }, activeDrafts: { current: [] }, parkedCreator: { current: [] }, activeCreator: { current: null },
    parkedSocial: { current: [] }, activeSocial: { current: [] }, recoveryRecord: null, storageError: false,
    storageErrorRef: { current: false }, preservationRef: { current: false }, automaticRead: { current: null },
    reviewContext: { current: null }, PROGRAM_BUSY_NOTICE: 'busy', message: '', M, canonicalJson, detached,
    confirmedAlphaPrivateTextSave, connectConfirmedReview: () => false,
    // Bundle A owns the actual structural recovery capture chain. Bundle B
    // isolates receipt classification without inventing structural acceptance.
    captureStructuralInput: () => true, clearConfirmedStructuralInput: () => {},
    executeAlphaSocialIntent: () => { throw Error('social execution is outside this fixture'); },
    setSnapshot: value => { c.snapshot = value; }, setData: value => { c.data = value; },
    setExternal: value => { c.external = value; }, setRecoveries: value => { c.recoveryRecord = value; },
    setStorageError: value => { c.storageError = value; }, setCreatorRecoveries: () => {}, setSocialRecoveries: () => {},
    setMessage: value => { c.message = typeof value === 'function' ? value(c.message) : value; },
    setOutput: () => {}, programErrorMessage: value => value,
    fetch: () => { throw Error('network prohibited'); },
  };
  assert(c.uiRecovery.current.read().ok);
  for (const name of ['reviewAnnouncementState', 'mergeRecoveryDrafts', 'captureCreator']) c[name] = evaluate(`(${declarations[name]})`, c);
  c.allEditors = evaluate(initializers.allEditors, c);
  c.hasInput = evaluate(initializers.hasInput, c);
  c.captureInput = evaluate(`(${declarations.captureInput})`, c);
  if (isolationDeclaration) c.privateTextChangeIsolatedToDocument = evaluate(`(${isolationDeclaration})`, c);
  const present = evaluate(`(${declarations.present})`, c);
  const store = { snapshot: () => c.snapshot, mutate: async () => { throw Error('fixture must provide its own owned mutation'); } };
  c.controller = { current: store };
  return { c, present, store, writes, mutate: (...args) => evaluate(initializers.mutate, c)(...args) };
}

async function fixture({ documentChange = false, otherDocumentResult = false, failedSave = true, targetSubcheck = false, folderSource = false } = {}) {
  let text = M.addDocument(createProgramPrivateSpace().text, { title: 'Receipt source' });
  const docId = text.documents[0].id;
  const tasksRaw = targetSubcheck ? '- [25%] Parent numeric task\n  - [25%] Source child' : '- [25%] Same numeric task';
  if (folderSource) {
    text = M.createFolderAt(text, docId, 0, 'Receipt source folder');
    text = M.editText(text, docId, M.raw(M.getDocument(text, docId)) + '\n' + tasksRaw.split('\n').map(line => '  ' + line).join('\n'));
  } else text = M.editText(text, docId, tasksRaw);
  const taskId = targetSubcheck ? M.rowMeta(text, docId).find(row => row.kind === 'subcheck').progressTargetId
    : M.tasks(text).find(task => task.docId === docId).id;
  assert(taskId, 'source progress target must exist');
  text = M.recordProgress(text, taskId, '2026-10-18', 25);
  text = M.addDocument(text, { title: 'Other document' });
  const otherId = text.documents.at(-1).id;
  text = M.editText(text, otherId, '- [25%] Other task');
  const otherTaskId = M.tasks(text).find(task => task.docId === otherId).id;
  const submittedText = documentChange ? M.editText(text, docId, `${M.raw(M.getDocument(text, docId))}\nsubmitted memo`)
    : M.recordProgress(text, taskId, '2026-10-19', 25);
  assert(M.validate(text)); assert(M.validate(submittedText));
  if (!documentChange) {
    assert.deepEqual(submittedText.documents, text.documents, 'record-only submission must not alter document arrays');
    assert.deepEqual({ ...submittedText, progressRecords: text.progressRecords }, text, 'only progressRecords may change');
    assert.notDeepEqual(submittedText.progressRecords, text.progressRecords);
  }
  const before = snapshot(text), next = snapshot(submittedText, 2);
  let resolveCommit;
  const controller = createProgramTextDraft(text, docId,
    () => new Promise(resolve => { resolveCommit = resolve; }), () => {});
  assert(controller.apply(submittedText, 'synthetic progress record'));
  const flight = controller.save();
  assert(controller.getState().saving);
  const newerRaw = `${M.raw(M.getDocument(submittedText, docId))}\nNEWER UNSAVED MEMO`;
  assert(controller.updateRaw(newerRaw));
  if (failedSave) { resolveCommit(false); assert.equal(await flight, false); }
  if (otherDocumentResult) {
    next.account.space.text = M.recordProgress(text, otherTaskId, '2026-10-19', 25);
    next.envelope = materializeAccount(next.account, { actorIds: [OWNER], public: PUBLIC });
  }
  const pending = { schema: ALPHA_COMMAND_SCHEMA, kind: 'change-private', requestId: 'exact-consumer-request', expectedRevision: 1,
    changes: privateChanges(before.account.space, next.account.space) };
  const result = { ...next, status: 'saved', lastReceipt: { requestId: pending.requestId, kind: pending.kind, changed: true, revision: 2 } };
  const h = shellHarness(before, pending);
  // Fictional native textarea sentinel: actual registered consumer callback is
  // exercised, but no browser DOM, editor paint, composition or device is tested.
  const native = { value: newerRaw, selectionStart: 6, selectionEnd: 12, selectionDirection: 'backward', scrollTop: 37 };
  const selection = { ...native };
  const acceptConfirmation = evaluate(confirmationCallback, { alive: true, composingRef: { current: false },
    inputLockedRef: { current: false }, textArea: () => native, controller });
  let acknowledgments = 0, accepted = 0;
  h.c.editors.current = {
    hasPendingInput: () => controller.getState().dirty,
    pendingDocumentIds: () => controller.getState().dirty ? [docId] : [],
    captureDrafts: () => controller.getState().dirty ? [{ documentId: docId, title: 'Receipt source', raw: controller.getState().raw }] : [],
    blocksExternalSnapshot: () => false,
    acceptConfirmedPrivateText: (expected, confirmed) => {
      acknowledgments++; const consumed = acceptConfirmation(expected, confirmed); if (consumed) accepted++; return consumed;
    },
  };
  return { ...h, before, result, pending, docId, taskId, otherId, otherTaskId, controller, newerRaw, submittedText, flight, resolveCommit,
    native, selection,
    acknowledgments: () => acknowledgments, accepted: () => accepted };
}

function retained(f) {
  assert.equal(f.controller.getState().raw, f.newerRaw, 'newer raw must remain in draft');
  assert.equal(f.controller.getState().dirty, true, 'newer input must stay dirty');
  assert.deepEqual(f.native, f.selection, 'registered confirmation must retain fictional native value and selection');
}
function observed(f, label) {
  console.log('CASE_B_OBSERVED ' + JSON.stringify({ label, exactConsumerReceipt: !!confirmedAlphaPrivateTextSave(OWNER,
    f.before.envelope.data, 1, null, f.pending, f.result), accepted: f.accepted(), external: f.c.external,
    displayedRevision: f.c.currentRevision.current, dirty: f.controller.getState().dirty,
    newerRawRetained: f.controller.getState().raw === f.newerRaw,
    selectionSentinelRetained: canonicalJson(f.native) === canonicalJson(f.selection),
    capturedRecoveryRaw: f.c.recoveryRecord?.drafts?.map(draft => draft.raw) ?? [] }));
}

test('B consumer predicate accepts exact progressRecords-only receipt and real draft preserves newer input', async () => {
  const f = await fixture();
  const proof = confirmedAlphaPrivateTextSave(OWNER, f.before.envelope.data, 1, null, f.pending, f.result);
  assert(proof);
  assert.equal(f.controller.acceptConfirmedSave(proof.before, proof.next), true);
  assert.deepEqual(f.controller.getState().committed, f.submittedText); retained(f);
});

test('B normal actual mutate wrapper owns receipt delivery while ownMutation is nonzero', async () => {
  const f = await fixture({ failedSave: false });
  let seenMutation;
  f.store.mutate = async () => {
    seenMutation = f.c.ownMutation.current; f.present(f.result);
    return { ok: true, changed: true, result: f.docId };
  };
  assert.equal((await f.mutate('synthetic own mutation', () => { throw Error('build unused by consumer fixture'); })).ok, true);
  assert.equal(seenMutation, 1); assert.equal(f.c.ownMutation.current, 0);
  assert.equal(f.accepted(), 1); assert.equal(f.c.external, false); assert.equal(f.c.currentRevision.current, 2); retained(f);
  observed(f, 'normal-ownMutation');
  f.resolveCommit(false); assert.equal(await f.flight, false);
});

test('B document-array change control accepts late exact receipt with newer input', async () => {
  const f = await fixture({ documentChange: true }); f.present(f.result);
  assert.equal(f.accepted(), 1); retained(f); assert.equal(f.c.external, false); assert.equal(f.c.currentRevision.current, 2);
  observed(f, 'document-array-control');
});

test('B REGRESSION late exact progressRecords-only own receipt should not become external conflict', async () => {
  const f = await fixture(); f.present(f.result); retained(f);
  assert.equal(f.accepted(), 1, 'exact submitted receipt is consumed by actual draft controller');
  observed(f, 'late-record-only');
  assert.equal(f.c.external, false, 'exact record-only own receipt plus isolated newer dirty must advance shell baseline');
  assert.equal(f.c.currentRevision.current, 2);
});

test('B REGRESSION pending read then recovered exact progressRecords-only receipt should not become external conflict', async () => {
  const f = await fixture();
  f.present({ ...f.result, status: 'checking-result', pending: f.pending, draft: f.pending });
  assert.equal(f.acknowledgments(), 0); assert.equal(f.c.external, false); assert.equal(f.c.currentRevision.current, 1); retained(f);
  f.present(f.result); retained(f); assert.equal(f.accepted(), 1);
  observed(f, 'pending-then-recovery-record-only');
  assert.equal(f.c.external, false, 'consumer recovery lookup must retain same-document newer dirty without a false conflict');
  assert.equal(f.c.currentRevision.current, 2);
});

test('B exact source-subcheck record-only receipt retains same-document newer input without false conflict', async () => {
  const f = await fixture({ targetSubcheck: true }); f.present(f.result);
  assert.equal(f.accepted(), 1); assert.equal(f.c.external, false); assert.equal(f.c.currentRevision.current, 2); retained(f);
});

test('B other document receipt does not exempt a dirty source editor', async () => {
  const f = await fixture({ otherDocumentResult: true }); f.present(f.result);
  assert.equal(f.accepted(), 0); assert.equal(f.c.external, true); assert.equal(f.c.currentRevision.current, 1); retained(f);
});

test('B another dirty editor remains blocking even when exact document receipt is accepted', async () => {
  const f = await fixture({ documentChange: true });
  f.c.legacyEditors.current = { hasPendingInput: () => true, captureDrafts: () => [{ title: 'other dirty editor', raw: 'OTHER UNSAVED INPUT' }] };
  f.present(f.result); assert.equal(f.accepted(), 1); assert.equal(f.c.external, true); assert.equal(f.c.currentRevision.current, 1); retained(f);
  assert(f.c.recoveryRecord.drafts.some(draft => draft.raw === 'OTHER UNSAVED INPUT'));
});

test('B record-only exact receipt cannot exempt another dirty editor', async () => {
  const f = await fixture();
  f.c.legacyEditors.current = { hasPendingInput: () => true, captureDrafts: () => [{ title: 'other dirty editor', raw: 'OTHER UNSAVED INPUT' }] };
  f.present(f.result); assert.equal(f.accepted(), 1); assert.equal(f.c.external, true); assert.equal(f.c.currentRevision.current, 1); retained(f);
  assert(f.c.recoveryRecord.drafts.some(draft => draft.raw === 'OTHER UNSAVED INPUT'));
});

test('B record-only exact receipt cannot exempt dirty input registered to another document', async () => {
  const f = await fixture();
  f.c.editors.current.pendingDocumentIds = () => [f.otherId];
  f.c.editors.current.captureDrafts = () => [{ documentId: f.otherId, title: 'Other document', raw: f.newerRaw }];
  f.present(f.result); assert.equal(f.accepted(), 1); assert.equal(f.c.external, true); assert.equal(f.c.currentRevision.current, 1); retained(f);
});

for (const mode of ['revision', 'bytes']) test(`B changed public ${mode} cannot consume private receipt or bypass dirty input`, async () => {
  const f = await fixture();
  if (mode === 'revision') f.result.publicRevision = 1;
  else f.result.envelope.data.public = { ...PUBLIC, posts: [{ id: 'foreign-public-post' }] };
  assert.equal(confirmedAlphaPrivateTextSave(OWNER, f.before.envelope.data, 1, null, f.pending, f.result), null);
  f.present(f.result); assert.equal(f.acknowledgments(), 0); assert.equal(f.c.external, true);
  assert.equal(f.c.currentRevision.current, 1); retained(f);
});

for (const mode of ['owner', 'request', 'revision']) test(`B wrong ${mode} cannot consume receipt or bypass dirty protection`, async () => {
  const f = await fixture({ documentChange: true });
  if (mode === 'owner') f.c.previousSnapshot.current.ownerId = 'foreign-owner';
  if (mode === 'request') f.result.lastReceipt.requestId = 'foreign-request';
  if (mode === 'revision') f.result.lastReceipt.revision = 3;
  f.present(f.result); assert.equal(f.acknowledgments(), 0); assert.equal(f.accepted(), 0);
  assert.equal(f.c.external, true); assert.equal(f.c.currentRevision.current, 1); retained(f);
});

test('B receipt predicate rejects next owner, account owner, source actor and materialized actor mismatches', async () => {
  const f = await fixture();
  for (const mode of ['next-owner', 'account-owner', 'source-actor', 'materialized-actor']) {
    const wrong = structuredClone(f.result);
    if (mode === 'next-owner') wrong.ownerId = 'foreign-owner';
    if (mode === 'account-owner') wrong.account.ownerId = 'foreign-owner';
    if (mode === 'source-actor') wrong.account.source.actorId = 'foreign-owner';
    if (mode === 'materialized-actor') wrong.envelope.data.activeActorId = 'foreign-owner';
    assert.equal(confirmedAlphaPrivateTextSave(OWNER, f.before.envelope.data, 1, null, f.pending, wrong), null, mode);
  }
  retained(f);
});

// The baseline has no isolated-document helper. These fail-closed helper checks
// apply to the product overlay; shell regression tests above still run against
// either source and expose the original behavioral red result directly.
const helperOnly = {};
test('B isolation helper accepts only the dirty source document for a record-only delta', helperOnly, async () => {
  const f = await fixture(), isolate = f.c.privateTextChangeIsolatedToDocument;
  assert.equal(isolate(f.before.account.space.text, f.submittedText, f.docId), true);
  assert.equal(isolate(f.before.account.space.text, f.submittedText, f.otherId), false);
});

test('B isolation helper rejects records added for a second document', helperOnly, async () => {
  const f = await fixture();
  const mixed = M.recordProgress(f.submittedText, f.otherTaskId, '2026-10-19', 25);
  assert(M.validate(mixed));
  assert.equal(f.c.privateTextChangeIsolatedToDocument(f.before.account.space.text, mixed, f.docId), false);
});

test('B isolation helper rejects foreign records even with a matching document text delta', helperOnly, async () => {
  const f = await fixture({ documentChange: true });
  const mixed = M.recordProgress(f.submittedText, f.otherTaskId, '2026-10-19', 25);
  assert(M.validate(mixed));
  assert.equal(f.c.privateTextChangeIsolatedToDocument(f.before.account.space.text, mixed, f.docId), false);
});

test('B malformed duplicate source target ownership fails closed rather than gaining an exemption', helperOnly, async () => {
  const f = await fixture();
  const before = structuredClone(f.before.account.space.text), next = structuredClone(f.submittedText);
  for (const state of [before, next]) {
    const target = M.getDocument(state, f.docId).lines.find(line => line.id === f.taskId);
    M.getDocument(state, f.otherId).lines.push({ ...target });
    assert.equal(M.validate(state), false, 'adversarial duplicate ID is an invalid consumer fixture, not a server-produced state');
  }
  assert.equal(f.c.privateTextChangeIsolatedToDocument(before, next, f.docId), false);
});

test('B malformed unknown record target fails closed rather than inferring document ownership', helperOnly, async () => {
  const f = await fixture(), next = structuredClone(f.submittedText);
  next.progressRecords.push({ taskId: 'unknown-consumer-target', date: '2026-10-19', percent: 25 });
  assert.equal(M.validate(next), false, 'unknown target fixture intentionally violates model validation');
  assert.equal(f.c.privateTextChangeIsolatedToDocument(f.before.account.space.text, next, f.docId), false);
});

test('B record-only exemption rejects unrelated workspace metadata and an empty delta', helperOnly, async () => {
  const f = await fixture(), changedFolder = structuredClone(f.submittedText);
  changedFolder.folders.push({ id: 'folder-unrelated-consumer', title: 'Unrelated folder', parentId: null });
  assert(M.validate(changedFolder));
  assert.equal(f.c.privateTextChangeIsolatedToDocument(f.before.account.space.text, changedFolder, f.docId), false);
  assert.equal(f.c.privateTextChangeIsolatedToDocument(f.before.account.space.text, f.before.account.space.text, f.docId), false);
});


