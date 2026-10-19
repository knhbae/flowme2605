'use strict';

// Consumer-side synthetic boundary probes. No server, account, API or real data.
// Actual source declarations are evaluated; native UI/React lifetime is outside this fixture.
const assert = require('node:assert/strict');
const test = require('node:test');
const { ts, ast, find, declaration, evaluate, load } = require('./consumer-source.cjs');
const LIB = 'lib/flow/integrated-poc/';
const EDITOR = 'components/flow/integrated-poc/ProgramTextEditor.tsx';
const SPACE = 'components/flow/integrated-poc/ProgramSpace.tsx';
const ALPHA = 'components/flow/integrated-poc/AlphaWorkspace.tsx';
const { createEmptyTextWorkspace, textWorkspaceModel: M } = load(LIB + 'text-workspace.ts');
const { readProgramFolderCopyPreview, copyProgramFolderOccurrence } = load(LIB + 'folder-copy.ts');
const { createProgramTextDraft } = load(LIB + 'program-text-draft.ts');
const { createAlphaUiRecovery } = load(LIB + 'alpha-ui-recovery.ts');
const { createAlphaStructuralDraft, createAlphaStructuralRecovery, resolveAlphaStructuralRecovery,
  alphaStructuralRecoveryKey, validateAlphaStructuralRecoveryEntry, ALPHA_STRUCTURAL_RECOVERY_LIMITS } = load(LIB + 'alpha-structural-recovery.ts');
const { canonicalJson } = load(LIB + 'alpha-persistence/json.ts');

function call(relative, name, context) {
  return evaluate('(' + declaration(relative, name).replace(/^export\s+/, '') + ')', context);
}
function registration(relative, marker, context) {
  const root = ast(relative);
  const node = find(root, item => ts.isCallExpression(item) && item.expression.getText(root) === 'useEffect'
    && item.arguments[0]?.getText(root).includes(marker));
  return evaluate(node.arguments[0].getText(root), context)();
}
function memoryStorage() {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key) };
}
function fixture(progress = false) {
  let source = M.addDocument(createEmptyTextWorkspace(), { title: 'Synthetic source document' });
  const sourceId = source.documents.at(-1).id;
  source = M.createFolderAt(source, sourceId, 0, 'Synthetic source folder');
  source = M.editText(source, sourceId, M.raw(M.getDocument(source, sourceId))
    + (progress ? '\n  - [ ] Synthetic parent\n    - [ ] Synthetic child' : '\n  - [ ] Synthetic task\n    - memo: Synthetic note'));
  if (progress) {
    const parent = M.tasks(source).find(task => task.title === 'Synthetic parent');
    source = M.recordProgress(source, parent.id, '2026-01-01', 20);
    source = M.recordProgress(source, parent.subchecks[0].id, '2026-01-01', 45);
  }
  assert(M.validate(source), 'source fixture must be a valid production workspace');
  const sourceDoc = M.getDocument(source, sourceId), before = canonicalJson(source);
  const preview = readProgramFolderCopyPreview(source, sourceId, sourceDoc.lines[0].id);
  assert(preview, 'fixture must expose an explicit ordinary folder occurrence');
  const copied = copyProgramFolderOccurrence(source, preview, 'Synthetic copied folder');
  assert(copied.ok, copied.message);
  assert.equal(canonicalJson(source), before, 'copy preparation leaves source untouched');
  assert(M.getDocument(copied.workspace, copied.documentId), 'copy fixture must really create a document');
  assert(copied.workspace.folders.some(folder => folder.id === copied.folderId), 'copy fixture must really create a folder');
  assert(Object.values(copied.lineIds).length > 1, 'copy fixture must really create copied rows');
  return { source, sourceId, sourceDoc, copied, before };
}
function registeredRecoveryCapture(f, draft, options = {}) {
  const draftRef = { current: draft }, propsRef = { current: { docId: f.sourceId } };
  const readRaw = call(EDITOR, 'captureDraftRaw', {
    draftRef, regionPortRef: { current: null }, textArea: () => null,
  });
  const readStructure = call(EDITOR, 'captureStructuralDraft', { draftRef, propsRef,
    createAlphaStructuralDraft: options.captureFactory ?? createAlphaStructuralDraft });
  let registeredRead, registeredStructure;
  propsRef.current.onRegisterDraft = read => { registeredRead = read; };
  propsRef.current.onRegisterStructuralDraft = read => { registeredStructure = read; };
  const cleanupEditor = registration(EDITOR, 'onRegisterDraft?.(captureDraftRaw)', {
    propsRef, saveNow: () => draft.save(), composingRef: { current: false }, draftRef,
    focusSourceRow() {}, captureDraftRaw: readRaw, captureStructuralDraft: readStructure, inputLockedRef: { current: false },
    setInputLocked() {}, textArea: () => null, orderEpochRef: { current: 0 }, cancelMove() {},
    dialogRef: { current: null }, setPanel() {}, setOrderPreview() {}, editorRef: { current: null },
  });
  assert.equal(typeof registeredRead, 'function', 'actual editor effect must register recovery reader');
  assert.equal(typeof registeredStructure, 'function', 'actual editor effect must register structural reader');
  let editors;
  const cleanupSpace = registration(SPACE, 'props.onRegisterEditors?.({ lockInput,', {
    props: { onRegisterEditors: port => { editors = port; } }, lockInput: () => () => {},
    confirmedSaveReaders: { current: {} }, dirty: { current: { [f.sourceId]: draft.getState().dirty } },
    recurrencePorts: { current: {} }, documentsRef: { current: f.source.documents },
    draftReaders: { current: { [f.sourceId]: registeredRead } }, flushAllEditors: () => draft.save(),
    structuralDraftReaders: { current: { [f.sourceId]: registeredStructure } },
  });
  assert(editors?.captureDrafts, 'actual space effect must register a recovery capture port');
  const storage = options.storage ?? memoryStorage();
  const uiRecovery = createAlphaUiRecovery(storage, { ownerId: 'synthetic-owner', slotId: 'synthetic-slot' });
  assert(uiRecovery.read().ok);
  const structuralRecovery = createAlphaStructuralRecovery(storage, { ownerId: 'synthetic-owner', slotId: 'synthetic-slot' });
  const loadedStructure = structuralRecovery.read(); assert(loadedStructure.ok);
  let recovered, recoveredStructure, storageError = false;
  const setStorageError = value => { storageError = value; };
  const captureStructuralInput = call(ALPHA, 'captureStructuralInput', {
    structuralRecovery: { current: structuralRecovery }, editors: { current: editors },
    activeStructural: options.activeStructural ?? { current: [] }, parkedStructural: { current: loadedStructure.value?.entries ?? [] }, currentRevision: { current: 0 },
    detached: structuredClone, mergeStructuralRecoveryEntries: call(ALPHA, 'mergeStructuralRecoveryEntries', { canonicalJson, detached: structuredClone }),
    setStorageError, setStructuralRecoveries: value => { recoveredStructure = value; },
  });
  const capture = call(ALPHA, 'captureInput', {
    captureStructuralInput,
    captureCreator: () => true, publisherEditors: { current: null }, communityEditors: { current: null },
    inspectorEditors: { current: null }, activeSocial: { current: [] }, socialRecovery: { current: null },
    parkedSocial: { current: [] }, canonicalJson, setStorageError, setSocialRecoveries() {},
    editors: { current: editors }, legacyEditors: { current: null }, discoveryStateRef: { current: {} },
    programDiscoveryHasUnstoredInput: () => false, activeDrafts: { current: [] },
    uiRecovery: { current: uiRecovery }, mergeRecoveryDrafts: call(ALPHA, 'mergeRecoveryDrafts', {}),
    parkedDrafts: { current: [] }, setRecoveries: value => { recovered = value; },
  });
  const captured = capture();
  assert.equal(captured, !options.expectFailure, 'actual shell capture must report structural preservation failure');
  assert.equal(storageError, !!options.expectFailure);
  const reread = createAlphaUiRecovery(storage, { ownerId: 'synthetic-owner', slotId: 'synthetic-slot' }).read();
  assert(reread.ok);
  assert.deepEqual(reread.value, recovered, 'actual recovery bytes survive a new consumer instance');
  const rereadStructure = createAlphaStructuralRecovery(storage, { ownerId: 'synthetic-owner', slotId: 'synthetic-slot' }).read();
  assert(rereadStructure.ok);
  if (!options.expectFailure) assert.deepEqual(rereadStructure.value, recoveredStructure, 'actual structural bytes survive a new consumer instance');
  cleanupSpace?.(); cleanupEditor?.();
  assert.equal(editors, null); assert.equal(registeredRead, null); assert.equal(registeredStructure, null);
  return { record: recovered, structuralRecord: rereadStructure.value, captured, storageError };
}
function presence(f, record) {
  const raw = canonicalJson(record);
  return {
    copiedDocument: record.drafts.some(draft => draft.documentId === f.copied.documentId),
    copiedFolderId: raw.includes(f.copied.folderId),
    copiedRowIds: Object.values(f.copied.lineIds).every(id => raw.includes(id)),
  };
}
function structuralPresence(f, record) {
  const next = record?.entries.find(entry => entry.documentId === f.sourceId)?.next;
  return {
    copiedDocument: !!next?.documents.some(doc => doc.id === f.copied.documentId),
    copiedFolderId: !!next?.folders.some(folder => folder.id === f.copied.folderId),
    copiedRowIds: Object.values(f.copied.lineIds).every(id => next?.documents.some(doc => doc.lines.some(line => line.id === id))),
  };
}
async function uiScenario(phase) {
  const f = fixture(); let commits = 0, rejectedCommand;
  const draft = createProgramTextDraft(f.source, f.sourceId, async next => {
    commits++;
    assert.deepEqual(next, f.copied.workspace);
    rejectedCommand = await commandScenario('rejected-invalid-fixture', f);
    return rejectedCommand.accepted;
  }, () => {});
  assert.equal(draft.apply(f.copied.workspace, 'Synthetic folder copy'), true);
  assert.equal(draft.getState().raw, M.raw(f.sourceDoc), 'source raw is unchanged by creating another document');
  if (phase === 'rejected-invalid-client-fixture') {
    assert.equal(await draft.save(), false);
    assert.equal(rejectedCommand.snapshot.status, 'recovery-required');
    assert.equal(rejectedCommand.persisted.pending, null);
    assert.deepEqual(rejectedCommand.persisted.draft.changes.find(change => change.field === 'text').value, f.copied.workspace);
  }
  assert.equal(commits, phase === 'before-saveNow' ? 0 : 1);
  assert.equal(draft.getState().dirty, true);
  assert.equal(draft.getState().saving, false);
  assert(M.getDocument(draft.getState().working, f.copied.documentId), 'unsaved working workspace retains the copy');
  const { record, structuralRecord } = registeredRecoveryCapture(f, draft);
  return { f, draft, record, structuralRecord, presence: presence(f, record), structuralPresence: structuralPresence(f, structuralRecord), commits, rejectedCommand };
}

for (const phase of ['before-saveNow', 'rejected-invalid-client-fixture']) {
  test(`A characterization ${phase}: registered UI recovery keeps source raw while copied structure remains in working memory`, async () => {
    const h = await uiScenario(phase);
    assert.deepEqual(h.record.drafts, [{ documentId: h.f.sourceId, title: h.f.sourceDoc.title, raw: M.raw(h.f.sourceDoc) }]);
    assert.deepEqual(h.presence, { copiedDocument: false, copiedFolderId: false, copiedRowIds: false });
    assert.equal(canonicalJson(h.f.source), h.f.before);
    console.log('CASE_A_EVIDENCE ' + JSON.stringify({ phase, commits: h.commits, workingHasCopy: true,
      dirty: h.draft.getState().dirty, uiRecoveryDrafts: h.record.drafts.length, recoveryPresence: h.presence,
      structuralRecoveryPresence: h.structuralPresence,
      commandRecoveryRetainsCopy: !!h.rejectedCommand,
      resultMeaning: phase === 'rejected-invalid-client-fixture'
        ? 'actual client rejected-invalid repository fixture; no deployed server proof' : 'saveNow never invoked' }));
  });
  test(`A REGRESSION expected preservation ${phase}: registered recovery retains copied document, folder and row identities`, async () => {
    const h = await uiScenario(phase);
    assert.deepEqual(h.structuralPresence, { copiedDocument: true, copiedFolderId: true, copiedRowIds: true },
      'registered structural recovery must reconstruct the newly generated folder-copy artifact');
    assert.deepEqual(resolveAlphaStructuralRecovery(h.f.source, h.structuralRecord.entries[0]), { status: 'ready', workspace: h.f.copied.workspace });
  });
}
test('A invalid raw after folder copy keeps rejected raw and valid copied structure in independent recovery records', () => {
  const f = fixture(), draft = createProgramTextDraft(f.source, f.sourceId, async () => false, () => {});
  assert(draft.apply(f.copied.workspace, 'Synthetic copy'));
  const invalidRaw = 'Synthetic rejected raw input';
  draft.rejectRaw(invalidRaw);
  const { record, structuralRecord } = registeredRecoveryCapture(f, draft);
  assert.equal(record.drafts[0].raw, invalidRaw);
  assert.deepEqual(structuralPresence(f, structuralRecord), { copiedDocument: true, copiedFolderId: true, copiedRowIds: true });
});

// These contrast the raw UI port with the actual client's command recovery.
// Repository responses are synthetic inputs; none certify a deployed server result.
const { createProgramData, createProgramEnvelope } = load(LIB + 'program-data.ts');
const { captureAlphaAccount, validateAlphaAccount } = load(LIB + 'alpha-persistence/program-adapter.ts');
const { createAlphaClient } = load(LIB + 'alpha-persistence/client.ts');
const { createAlphaMemoryRecovery } = load(LIB + 'alpha-persistence/local-recovery.ts');
async function commandScenario(mode, f = fixture()) {
  const data = createProgramData(), actorId = data.activeActorId;
  data.spaces[actorId].text = f.source;
  const { account, references } = captureAlphaAccount(createProgramEnvelope(data), actorId, 'synthetic-owner');
  const recovery = createAlphaMemoryRecovery(); let release, executeCount = 0;
  const repository = { references: () => references, read: async () => ({ ok: true, value: structuredClone(account) }),
    lookup: async () => ({ ok: true, value: null }), execute: async () => {
      executeCount++;
      if (mode === 'unknown-response') throw Error('synthetic missing transport result');
      if (mode === 'pendingServer') return new Promise(resolve => { release = resolve; });
      return { ok: false, reason: 'invalid' };
    } };
  const client = createAlphaClient((value, owner, refs) => validateAlphaAccount(value, refs ?? references, owner), recovery);
  client.bindSession(account.ownerId, repository); assert.equal(await client.refresh(), true);
  const command = { schema: 'flowme-alpha-command/1', requestId: 'synthetic-copy-request', expectedRevision: 0,
    kind: 'change-private', changes: [{ field: 'text', present: true, value: f.copied.workspace }] };
  const operation = client.execute(command);
  const accepted = mode === 'pendingServer' ? undefined : await operation;
  if (mode !== 'pendingServer') assert.equal(accepted, false);
  const snapshot = client.snapshot(), persisted = recovery.load(account.ownerId);
  assert(persisted.ok);
  return { f, client, snapshot, persisted: persisted.value, executeCount, accepted,
    finish: async () => { if (release) { release({ ok: false, reason: 'invalid' }); assert.equal(await operation, false); } } };
}
for (const mode of ['rejected-invalid-fixture', 'unknown-response', 'pendingServer']) {
  test(`A command recovery control ${mode}: actual client retains full text command independently of raw UI capture`, async () => {
    const h = await commandScenario(mode);
    try {
      assert.equal(h.executeCount, 1);
      assert(h.persisted.draft, 'submitted draft command remains available in command recovery');
      assert.deepEqual(h.persisted.draft.changes.find(change => change.field === 'text').value, h.f.copied.workspace);
      const pending = mode !== 'rejected-invalid-fixture';
      assert.equal(!!h.persisted.pending, pending);
      assert.equal(h.snapshot.status, mode === 'unknown-response' ? 'checking-result' : mode === 'pendingServer' ? 'saving' : 'recovery-required');
      if (pending) assert.deepEqual(h.persisted.pending.changes.find(change => change.field === 'text').value, h.f.copied.workspace);
      console.log('CASE_A_COMMAND_EVIDENCE ' + JSON.stringify({ mode, status: h.snapshot.status,
        pendingRetained: pending, draftRetainsCopyWorkspace: true, serverProof: false }));
    } finally { await h.finish(); }
  });
}

function structuralEntry(f = fixture()) {
  const draft = createAlphaStructuralDraft(f.source, f.copied.workspace, f.sourceId);
  assert(draft);
  return { f, entry: { ...draft, baseRevision: 0 } };
}
function structuralPort(storage = memoryStorage(), ownerId = 'synthetic-owner', slotId = 'synthetic-slot') {
  return createAlphaStructuralRecovery(storage, { ownerId, slotId });
}
test('A structural capture ignores raw-only typing and detaches off-document copy snapshots', () => {
  const f = fixture(), typed = M.editText(f.source, f.sourceId, M.raw(f.sourceDoc) + '\nSynthetic typing');
  assert.equal(createAlphaStructuralDraft(f.source, typed, f.sourceId), null);
  assert.equal(createAlphaStructuralDraft(f.source, f.copied.workspace, 'missing-document'), null);
  const capture = createAlphaStructuralDraft(f.source, f.copied.workspace, f.sourceId);
  assert(capture);
  assert.notEqual(capture.before, f.source); assert.notEqual(capture.next, f.copied.workspace);
  capture.next.documents.at(-1).title = 'Changed detached return';
  assert.equal(M.getDocument(f.copied.workspace, f.copied.documentId).title, 'Synthetic copied folder');
});
test('A structural restore uses exact preimage and preserves every generated copy identity without another allocation', () => {
  const { f, entry } = structuralEntry(), resolved = resolveAlphaStructuralRecovery(f.source, entry);
  assert.equal(resolved.status, 'ready');
  assert.deepEqual(resolved.workspace, f.copied.workspace);
  assert.notEqual(resolved.workspace, entry.next);
  assert.deepEqual(resolveAlphaStructuralRecovery(f.copied.workspace, entry), { status: 'already-present' });
  const stale = M.editText(f.source, f.sourceId, M.raw(f.sourceDoc) + '\nNewer unrelated input');
  assert.deepEqual(resolveAlphaStructuralRecovery(stale, entry), { status: 'stale' });
  const collision = structuredClone(f.copied.workspace);
  collision.documents.find(doc => doc.id === f.copied.documentId).title = 'Foreign collision';
  assert(M.validate(collision));
  assert.deepEqual(resolveAlphaStructuralRecovery(collision, entry), { status: 'stale' });
});
test('A structural entries reject wrong document, invalid revision and extra fields', () => {
  const { f, entry } = structuralEntry();
  for (const invalid of [{ ...entry, documentId: 'missing-document' }, { ...entry, baseRevision: -1 },
    { ...entry, baseRevision: 0.5 }, { ...entry, unexpected: true }]) {
    assert.equal(validateAlphaStructuralRecoveryEntry(invalid), false);
    assert.deepEqual(resolveAlphaStructuralRecovery(f.source, invalid), { status: 'invalid' });
  }
});
test('A structural storage requires initial read and survives a new consumer with exact owner and slot', () => {
  const { entry } = structuralEntry(), storage = memoryStorage(), port = structuralPort(storage);
  assert.deepEqual(port.save([entry]), { ok: false, reason: 'not-read' });
  assert.deepEqual(port.read(), { ok: true, value: null });
  const saved = port.save([entry]); assert(saved.ok); assert(saved.changed);
  assert.deepEqual(structuralPort(storage).read(), { ok: true, value: saved.value });
  const originalRaw = storage.getItem(port.key);
  for (const [owner, slot] of [['other-owner', 'synthetic-slot'], ['synthetic-owner', 'other-slot']]) {
    storage.setItem(alphaStructuralRecoveryKey(owner, slot), originalRaw);
    assert.deepEqual(structuralPort(storage, owner, slot).read(), { ok: false, reason: 'corrupt' });
  }
});
test('A structural storage rejects stale cleanup, external replacement and empty-capture deletion', () => {
  const { entry } = structuralEntry(), storage = memoryStorage(), port = structuralPort(storage);
  assert(port.read().ok);
  const first = port.save([entry]); assert(first.ok);
  const second = port.save([{ ...entry, baseRevision: 1 }]); assert(second.ok);
  assert.deepEqual(port.clear(first.value), { ok: false, reason: 'conflict' });
  assert.deepEqual(port.save([]), { ok: true, changed: false, value: second.value });
  assert.deepEqual(port.read(), { ok: true, value: second.value });
  storage.setItem(port.key, '{}');
  assert.deepEqual(port.read(), { ok: false, reason: 'conflict' });
  assert.deepEqual(port.save([entry]), { ok: false, reason: 'conflict' });
});
test('A structural storage fails closed on entry and record bounds without truncating a previous capture', () => {
  const { entry } = structuralEntry(), storage = memoryStorage(), port = structuralPort(storage);
  assert(port.read().ok); assert(port.save([entry]).ok);
  const before = storage.getItem(port.key);
  assert.deepEqual(port.save(Array(ALPHA_STRUCTURAL_RECOVERY_LIMITS.entries + 1).fill(entry)), { ok: false, reason: 'invalid' });
  assert.equal(storage.getItem(port.key), before);
  // A malicious/corrupt persisted string is rejected before JSON parsing.
  const tooLargeStorage = { getItem: () => 'x'.repeat(ALPHA_STRUCTURAL_RECOVERY_LIMITS.chars + 1), setItem() { assert.fail('no repair'); }, removeItem() { assert.fail('no deletion'); } };
  assert.deepEqual(structuralPort(tooLargeStorage).read(), { ok: false, reason: 'corrupt' });
});
test('A structural storage readback and quota failures do not certify a saved recovery', () => {
  const { entry } = structuralEntry();
  let raw = null;
  const unavailable = structuralPort({ getItem: () => raw, setItem() { throw Error('synthetic quota'); }, removeItem() {} });
  assert(unavailable.read().ok);
  assert.deepEqual(unavailable.save([entry]), { ok: false, reason: 'storage-unavailable' });
  const mismatched = structuralPort({ getItem: () => null, setItem() {}, removeItem() {} });
  assert(mismatched.read().ok);
  assert.deepEqual(mismatched.save([entry]), { ok: false, reason: 'readback-failed' });
});

// Shell declarations consume fixture snapshots/results. These are not server receipts.
function restoreHarness(sourceFixture = fixture()) {
  const { f, entry } = structuralEntry(sourceFixture), owner = 'synthetic-owner', storage = memoryStorage();
  const port = structuralPort(storage, owner); assert(port.read().ok);
  const saved = port.save([entry]); assert(saved.ok);
  const rawPort = createAlphaUiRecovery(storage, { ownerId: owner, slotId: 'synthetic-slot' });
  assert(rawPort.read().ok); assert(rawPort.save([{ documentId: f.sourceId, title: 'Rejected raw', raw: 'Keep this raw separately' }]).ok);
  const h = { f, entry, storage, port, rawPort, record: saved.value, owner, dirty: false, calls: 0,
    transitions: [], destinations: [], messages: [], beforeBuild: null, afterBuild: null, result: null };
  h.live = { ownerId: owner, account: { ownerId: owner, source: { actorId: owner }, revision: 0, space: { text: f.source } },
    envelope: { data: { activeActorId: owner, spaces: { [owner]: { text: f.source } } } },
    status: 'ready', busy: false, pending: null, draft: null };
  const store = { snapshot: () => h.live };
  h.refs = { controller: { current: store }, sessionEpochRef: { current: {} }, disposed: { current: false },
    currentOwnerRef: { current: owner }, storageErrorRef: { current: false }, externalRef: { current: false },
    preservationRef: { current: false }, modalRef: { current: false } };
  const clear = call(ALPHA, 'clearConfirmedStructuralInput', {
    structuralRecovery: { current: port }, session: { userId: owner }, editors: { current: null }, canonicalJson,
    parkedStructural: { current: [entry] }, activeStructural: { current: [] }, setStructuralRecoveries: value => { h.remaining = value; },
    setStorageError: value => { h.storageError = value; },
  });
  h.clear = clear;
  const restore = call(ALPHA, 'restoreStructuralDraft', {
    structuralRecoveries: saved.value, session: { userId: owner }, ...h.refs, hasInput: () => h.dirty,
    resolveAlphaStructuralRecovery, clearConfirmedStructuralInput: clear, detached: structuredClone,
    setMessage: message => h.messages.push(message), setDestination: next => h.destinations.push(next), setPresentation() {},
    mutate: async (_label, build) => {
      h.calls++; h.beforeBuild?.();
      const transition = build(h.live.envelope.data); h.transitions.push(transition); h.afterBuild?.();
      return h.result ?? (transition.ok ? { ok: true, result: transition.result, changed: true } : { ok: false, reason: transition.reason });
    },
  });
  h.restore = () => restore(0);
  return h;
}
test('A actual shell restore submits exact saved structure once with the original source document destination', async () => {
  const h = restoreHarness(); await h.restore();
  assert.equal(h.calls, 1); assert.equal(h.transitions[0].ok, true);
  assert.deepEqual(h.transitions[0].data.spaces[h.owner].text, h.f.copied.workspace);
  assert.deepEqual(h.destinations, [{ view: 'space', id: h.f.sourceId }]);
});
test('A actual shell restore blocks pending, unknown, dirty, foreign-owner and unavailable contexts without mutation', async () => {
  for (const block of ['pending', 'draft', 'busy', 'unknown', 'dirty', 'external', 'owner', 'account-owner',
    'actor', 'active-actor', 'disposed', 'storage', 'preservation', 'modal']) {
    const h = restoreHarness();
    if (block === 'pending') h.live.pending = { requestId: 'same-request' };
    if (block === 'draft') h.live.draft = { requestId: 'rejected-or-unresolved' };
    if (block === 'busy') h.live.busy = true;
    if (block === 'unknown') h.live.status = 'checking-result';
    if (block === 'dirty') h.dirty = true;
    if (block === 'external') h.refs.externalRef.current = true;
    if (block === 'owner') h.refs.currentOwnerRef.current = 'other-owner';
    if (block === 'account-owner') h.live.account.ownerId = 'other-owner';
    if (block === 'actor') h.live.account.source.actorId = 'other-owner';
    if (block === 'active-actor') h.live.envelope.data.activeActorId = 'other-owner';
    if (block === 'disposed') h.refs.disposed.current = true;
    if (block === 'storage') h.refs.storageErrorRef.current = true;
    if (block === 'preservation') h.refs.preservationRef.current = true;
    if (block === 'modal') h.refs.modalRef.current = true;
    await h.restore();
    assert.equal(h.calls, 0, block); assert.equal(h.destinations.length, 0, block);
    assert.deepEqual(h.port.read(), { ok: true, value: h.record }, block);
  }
});
test('A actual shell restore rejects changed text and base revision before calling mutate', async () => {
  for (const stale of ['text', 'revision']) {
    const h = restoreHarness();
    if (stale === 'text') h.live.account.space.text = M.editText(h.f.source, h.f.sourceId, M.raw(h.f.sourceDoc) + '\nDifferent saved text');
    else h.live.account.revision++;
    await h.restore(); assert.equal(h.calls, 0, stale);
    assert.deepEqual(h.port.read(), { ok: true, value: h.record });
  }
});
test('A actual shell already-present restore makes no mutation and clears only structural recovery', async () => {
  const h = restoreHarness();
  h.live.account.space.text = h.f.copied.workspace; h.live.account.revision = 1;
  await h.restore();
  assert.equal(h.calls, 0); assert.deepEqual(h.port.read(), { ok: true, value: null });
  assert.equal(h.rawPort.read().value.drafts[0].raw, 'Keep this raw separately');
});
test('A actual shell restore rechecks session, owner, revision and preimage in the mutation callback', async () => {
  for (const race of ['epoch', 'owner', 'revision', 'text', 'pending']) {
    const h = restoreHarness();
    h.beforeBuild = () => {
      if (race === 'epoch') h.refs.sessionEpochRef.current = {};
      if (race === 'owner') h.refs.currentOwnerRef.current = 'other-owner';
      if (race === 'revision') h.live.account.revision++;
      if (race === 'text') h.live.envelope.data.spaces[h.owner].text = M.editText(h.f.source, h.f.sourceId, M.raw(h.f.sourceDoc) + '\nNewer text');
      if (race === 'pending') h.live.pending = { requestId: 'other-request' };
    };
    await h.restore();
    assert.equal(h.calls, 1, race); assert.equal(h.transitions[0].ok, false, race);
    assert.equal(h.destinations.length, 0, race);
    assert.deepEqual(h.port.read(), { ok: true, value: h.record });
  }
});
test('A actual shell restore does not navigate after an epoch change or an unknown fixture result', async () => {
  for (const outcome of ['epoch-changed', 'unknown']) {
    const h = restoreHarness();
    if (outcome === 'epoch-changed') h.afterBuild = () => { h.refs.sessionEpochRef.current = {}; };
    else h.result = { ok: false, reason: 'checking-result' };
    await h.restore(); assert.equal(h.calls, 1); assert.equal(h.destinations.length, 0, outcome);
    assert.deepEqual(h.port.read(), { ok: true, value: h.record });
  }
});
test('A actual shell merge retains distinct parked copies sharing the same source and base revision', () => {
  const { f, entry } = structuralEntry();
  const alternative = copyProgramFolderOccurrence(f.source, readProgramFolderCopyPreview(f.source, f.sourceId, f.sourceDoc.lines[0].id), 'Another pending copy');
  assert(alternative.ok);
  const other = { documentId: f.sourceId, before: f.source, next: alternative.workspace, baseRevision: 0 };
  const merge = call(ALPHA, 'mergeStructuralRecoveryEntries', { canonicalJson, detached: structuredClone });
  const entries = merge([entry], [other, other]);
  assert.equal(entries.length, 2); assert.deepEqual(entries, [entry, other]);
});



test('INTEGRATION copied parent20/subcheck45 survives draft registration, structural storage and exact restore without dated copy history', async () => {
  const f = fixture(true), draft = createProgramTextDraft(f.source, f.sourceId, async () => false, () => {});
  assert(draft.apply(f.copied.workspace, 'Synthetic current-preserving copy'));
  const { structuralRecord } = registeredRecoveryCapture(f, draft);
  const resolved = resolveAlphaStructuralRecovery(f.source, structuralRecord.entries[0]);
  assert.equal(resolved.status, 'ready');
  const parent = M.tasks(f.source).find(task => task.title === 'Synthetic parent');
  const originalIds = [parent.id, parent.subchecks[0].id], copiedIds = originalIds.map(id => f.copied.lineIds[id]);
  assert.deepEqual(copiedIds.map(id => M.currentProgress(resolved.workspace, id)), [20, 45]);
  assert.deepEqual(copiedIds.map(id => M.progressHistory(resolved.workspace, id)), [[], []]);
  assert.deepEqual(resolved.workspace.progressRecords, f.source.progressRecords);
  const h = restoreHarness(f); await h.restore();
  assert.equal(h.transitions[0].ok, true);
  assert.deepEqual(h.transitions[0].data.spaces[h.owner].text, resolved.workspace);
  assert.equal(canonicalJson(f.source), f.before);
});

test('INTEGRATION serialization failure propagates through actual editor and space readers without certifying raw-only recovery', () => {
  const f = fixture(true), draft = createProgramTextDraft(f.source, f.sourceId, async () => false, () => {});
  assert(draft.apply(f.copied.workspace, 'Synthetic copy'));
  const draftBefore = canonicalJson(draft.getState().working), storage = memoryStorage(), port = structuralPort(storage);
  assert(port.read().ok);
  const entry = { ...createAlphaStructuralDraft(f.source, f.copied.workspace, f.sourceId), baseRevision: 0 };
  assert(port.save([entry]).ok); const storedBefore = storage.getItem(port.key);
  const activeStructural = { current: [entry] };
  const helperFile = LIB + 'alpha-structural-recovery.ts';
  const transition = call(helperFile, 'structuralTransition', { programIdentifier: load(LIB + 'program-data.ts').programIdentifier, M });
  // Same actual create declaration, with the serializer's limit exception injected
  // instead of allocating a 30MB fixture or measuring performance.
  const captureFactory = call(helperFile, 'createAlphaStructuralDraft', {
    structuralTransition: transition, detached() { throw RangeError('synthetic canonical JSON size limit'); },
  });
  assert.throws(() => captureFactory(f.source, f.copied.workspace, f.sourceId), /size limit/);
  const result = registeredRecoveryCapture(f, draft, { captureFactory, storage, activeStructural, expectFailure: true });
  assert.equal(result.captured, false); assert.equal(result.storageError, true);
  assert.equal(storage.getItem(port.key), storedBefore);
  assert.deepEqual(activeStructural.current, [entry]);
  assert.equal(canonicalJson(draft.getState().working), draftBefore);
  assert.equal(draft.getState().dirty, true);
});

test('INTEGRATION confirmed cleanup retains its expected record when a structural reader fails', () => {
  const { f, entry } = structuralEntry(), storage = memoryStorage(), port = structuralPort(storage);
  assert(port.read().ok); assert(port.save([entry]).ok);
  const storedBefore = storage.getItem(port.key); let error = false;
  const clear = call(ALPHA, 'clearConfirmedStructuralInput', {
    structuralRecovery: { current: port }, session: { userId: 'synthetic-owner' },
    editors: { current: { captureStructuralDrafts() { throw RangeError('capture failed'); } } }, canonicalJson,
    parkedStructural: { current: [entry] }, activeStructural: { current: [] },
    setStructuralRecoveries() { assert.fail('failed capture cannot clear recovery'); },
    setStorageError(value) { error = value; },
  });
  assert.doesNotThrow(() => clear(f.copied.workspace));
  assert.equal(error, true); assert.equal(storage.getItem(port.key), storedBefore);
});
