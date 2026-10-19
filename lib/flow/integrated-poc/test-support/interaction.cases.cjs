'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { load, declaration, initializer, evaluate } = require('./consumer-source.cjs');
const { shellHarness, fixture: receiptFixture, snapshot, OWNER, PUBLIC } = require('./private-receipt.cases.cjs');
const LIB = 'lib/flow/integrated-poc/', SHELL = 'components/flow/integrated-poc/AlphaWorkspace.tsx';
const { textWorkspaceModel: M } = load(LIB + 'text-workspace.ts');
const { createProgramPrivateSpace } = load(LIB + 'program-data.ts');
const { createProgramTextDraft } = load(LIB + 'program-text-draft.ts');
const { readProgramFolderCopyPreview, copyProgramFolderOccurrence } = load(LIB + 'folder-copy.ts');
const { createAlphaStructuralDraft, createAlphaStructuralRecovery, resolveAlphaStructuralRecovery } = load(LIB + 'alpha-structural-recovery.ts');
const { createAlphaSyncController } = load(LIB + 'alpha-sync/controller.ts');
const { createAlphaFakeServer } = load(LIB + 'alpha-persistence/fake-server.ts');
const { createAlphaMemoryRecovery } = load(LIB + 'alpha-persistence/local-recovery.ts');
const { canonicalJson, detached } = load(LIB + 'alpha-persistence/json.ts');
const evaluateShell = (name, c) => evaluate('(' + declaration(SHELL, name) + ')', c);
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function connectStructural(c, memory, entries = []) {
  const port = createAlphaStructuralRecovery(memory, { ownerId: OWNER, slotId: 'integrated-structure' });
  assert(port.read().ok);
  const saved = entries.length ? port.save(entries) : { ok: true, value: null }; assert(saved.ok);
  Object.assign(c, { structuralRecovery: { current: port }, parkedStructural: { current: entries },
    activeStructural: { current: [] }, structuralRecoveries: saved.value });
  c.setStructuralRecoveries = value => { c.structuralRecoveries = value; };
  c.mergeStructuralRecoveryEntries = evaluateShell('mergeStructuralRecoveryEntries', c);
  c.captureStructuralInput = evaluateShell('captureStructuralInput', c);
  c.clearConfirmedStructuralInput = evaluateShell('clearConfirmedStructuralInput', c);
  c.captureInput = evaluateShell('captureInput', c);
  return port;
}
function copiedFixture() {
  let source = M.addDocument(createProgramPrivateSpace().text, { title: 'Integrated source' });
  const docId = source.documents[0].id;
  source = M.createFolderAt(source, docId, 0, 'Integrated folder');
  source = M.editText(source, docId, M.raw(M.getDocument(source, docId))
    + '\n  - [ ] Parent current\n    - [ ] Child current');
  const parent = M.tasks(source).find(task => task.title === 'Parent current');
  source = M.recordProgress(source, parent.id, '2026-01-01', 20);
  source = M.recordProgress(source, parent.subchecks[0].id, '2026-01-01', 45);
  const preview = readProgramFolderCopyPreview(source, docId, M.getDocument(source, docId).lines[0].id);
  assert(preview); const copied = copyProgramFolderOccurrence(source, preview, 'Integrated copy'); assert(copied.ok);
  return { source, docId, parentIds: [parent.id, parent.subchecks[0].id], copied };
}
async function realRestore(mode = 'success') {
  const f = copiedFixture(), before = snapshot(f.source, 0), h = shellHarness(before, null), c = h.c;
  c.currentRevision.current = 0; c.previousSnapshot.current = before;
  const entry = { ...createAlphaStructuralDraft(f.source, f.copied.workspace, f.docId), baseRevision: 0 };
  const port = connectStructural(c, storage(), [entry]);
  assert(c.uiRecovery.current.save([{ documentId: f.docId, title: 'Independent rejected raw', raw: 'KEEP INDEPENDENT RAW' }]).ok);
  c.resolveAlphaStructuralRecovery = resolveAlphaStructuralRecovery;
  c.destinations = []; c.setDestination = value => c.destinations.push(value);
  c.setPresentation = () => {};
  const errors = [], present = evaluateShell('present', c);
  const references = { actorIds: [OWNER], public: PUBLIC };
  const server = createAlphaFakeServer([{ account: before.account, references }]), token = server.issueSession(OWNER), base = server.connect(token);
  let lose = mode === 'lost-response';
  const repository = { ...base, execute: async command => {
    const result = await base.execute(command);
    if (lose && result.ok) { lose = false; throw Error('synthetic lost response after atomic commit'); }
    return result;
  } };
  const controller = createAlphaSyncController({ recovery: createAlphaMemoryRecovery(), requestId: () => 'integrated-restore-request',
    onChange(next) { try { present(next); } catch (error) { errors.push(error); } } });
  c.controller.current = controller;
  controller.bindSession(OWNER, repository); assert.equal(await controller.refresh(), true);
  assert.deepEqual(errors, []);
  assert.equal(c.currentRevision.current, 0); assert.equal(c.external, false);
  c.mutate = evaluate(initializer(SHELL, 'mutate'), c);
  const restore = evaluateShell('restoreStructuralDraft', c);
  if (mode === 'revoked') server.revokeSession(token);
  await restore(0);
  assert.deepEqual(errors, [], 'presentation exceptions may not be swallowed by the controller fixture');
  return { f, c, controller, server, port, entry, restore: () => restore(0), errors };
}

test('INTEGRATION actual restore, shell mutate and sync controller commit current-preserving copy once and clean only its structural record', async () => {
  const h = await realRestore();
  assert.deepEqual(h.server.diagnostics(), { mutations: 1, operations: 1 });
  const live = h.controller.snapshot();
  assert.equal(live.status, 'saved'); assert.equal(live.busy, false);
  assert.equal(live.pending, null); assert.equal(live.draft, null); assert.equal(live.account.revision, 1);
  assert.deepEqual(live.account.space.text, h.f.copied.workspace);
  assert.deepEqual(h.f.parentIds.map(id => M.currentProgress(live.account.space.text, h.f.copied.lineIds[id])), [20, 45]);
  assert.deepEqual(h.f.parentIds.map(id => M.progressHistory(live.account.space.text, h.f.copied.lineIds[id])), [[], []]);
  assert.equal(h.c.currentRevision.current, 1); assert.equal(h.c.external, false); assert.equal(h.c.ownMutation.current, 0);
  assert.equal(h.port.read().value, null);
  assert.equal(h.c.uiRecovery.current.read().value.drafts[0].raw, 'KEEP INDEPENDENT RAW');
  assert.deepEqual(h.c.destinations, [{ view: 'space', id: h.f.docId }]);
  await h.restore(); assert.deepEqual(h.server.diagnostics(), { mutations: 1, operations: 1 });
});

test('INTEGRATION revoked in-memory session cannot restore structure or certify a successful mutation', async () => {
  const h = await realRestore('revoked');
  assert.deepEqual(h.server.diagnostics(), { mutations: 0, operations: 0 });
  assert.equal(h.controller.snapshot().status, 'session-expired');
  assert.equal(h.c.destinations.length, 0); assert.deepEqual(h.port.read().value.entries, [h.entry]);
});

test('INTEGRATION lost response preserves pending structure and resolves once through actual idempotent lookup', async () => {
  const h = await realRestore('lost-response');
  assert.equal(h.controller.snapshot().status, 'checking-result'); assert(h.controller.snapshot().pending);
  assert.deepEqual(h.server.diagnostics(), { mutations: 1, operations: 1 });
  assert.deepEqual(h.port.read().value.entries, [h.entry]); assert.equal(h.c.destinations.length, 0);
  assert.equal(await h.controller.resolvePending(true), true);
  assert.deepEqual(h.errors, []);
  assert.deepEqual(h.controller.snapshot().account.space.text, h.f.copied.workspace);
  await h.restore();
  assert.deepEqual(h.server.diagnostics(), { mutations: 1, operations: 1 });
  assert.equal(h.port.read().value, null);
});

test('INTEGRATION late record-only receipt preserves a newer copied structure and raw until exact confirmation cleanup', async () => {
  const f = await receiptFixture({ folderSource: true }), c = f.c;
  const working = f.controller.getState().working;
  const lineId = M.rowMeta(working, f.docId).find(row => row.kind === 'scope' && row.scopeKind === 'folder').id;
  const preview = readProgramFolderCopyPreview(working, f.docId, lineId); assert(preview);
  const copy = copyProgramFolderOccurrence(working, preview, 'Newer dirty copy'); assert(copy.ok);
  assert(f.controller.apply(copy.workspace, 'Newer unsubmitted copy'));
  const raw = f.controller.getState().raw;
  f.native.value = raw; const nativeBefore = { ...f.native };
  const capture = evaluate('(' + declaration('components/flow/integrated-poc/ProgramTextEditor.tsx', 'captureStructuralDraft') + ')', {
    draftRef: { current: f.controller }, propsRef: { current: { docId: f.docId } }, createAlphaStructuralDraft,
  });
  c.editors.current.captureStructuralDrafts = () => { const value = capture(); return value ? [value] : []; };
  const port = connectStructural(c, storage());
  assert.equal(c.captureInput(), true);
  const stored = port.read().value; assert(stored);
  const present = evaluateShell('present', c); present(f.result);
  assert.equal(f.accepted(), 1); assert.equal(c.external, false); assert.equal(c.currentRevision.current, 2);
  assert.equal(f.controller.getState().dirty, true); assert.equal(f.controller.getState().raw, raw);
  assert(M.getDocument(f.controller.getState().working, copy.documentId));
  assert.deepEqual(f.native, nativeBefore);
  assert.equal(c.captureInput(), true);
  const refreshed = port.read().value;
  assert.equal(refreshed.entries[0].baseRevision, 2);
  assert.deepEqual(refreshed.entries[0].before, f.submittedText);
  assert(M.getDocument(refreshed.entries[0].next, copy.documentId));
  c.clearConfirmedStructuralInput(f.submittedText);
  assert(port.read().value, 'older exact receipt may not clear newer structure');
  // A matching confirmed workspace is the only cleanup authority here. The
  // independent raw record remains available after structural cleanup.
  c.editors.current.captureStructuralDrafts = () => [];
  c.clearConfirmedStructuralInput(refreshed.entries[0].next);
  assert.equal(port.read().value, null);
  assert(c.uiRecovery.current.read().value.drafts.some(draft => draft.raw === raw));
});

test('INTEGRATION structurally valid capture exceeding total character limit preserves previous record and working state', () => {
  const f = copiedFixture(); let source = f.source;
  for (let i = 0; i < 7; i++) {
    source = M.addDocument(source, { title: 'Synthetic bounded payload ' + i });
    source = M.editText(source, source.documents.at(-1).id, 'Synthetic note ' + 'x'.repeat(90000));
  }
  assert(M.validate(source));
  const preview = readProgramFolderCopyPreview(source, f.docId, M.getDocument(source, f.docId).lines[0].id);
  const copied = copyProgramFolderOccurrence(source, preview, 'Bounded payload copy'); assert(copied.ok);
  const draft = createProgramTextDraft(source, f.docId, async () => false, () => {}); assert(draft.apply(copied.workspace, 'Bounded copy'));
  const beforeWorking = canonicalJson(draft.getState().working), h = shellHarness(snapshot(source), null), c = h.c;
  const oldEntry = { ...createAlphaStructuralDraft(f.source, f.copied.workspace, f.docId), baseRevision: 0 };
  const memory = storage(), port = connectStructural(c, memory, [oldEntry]), previous = memory.getItem(port.key);
  c.editors.current = { captureStructuralDrafts: () => [createAlphaStructuralDraft(source, copied.workspace, f.docId)] };
  assert.equal(c.captureStructuralInput(), false); assert.equal(c.storageError, true);
  assert.equal(memory.getItem(port.key), previous);
  assert.equal(canonicalJson(draft.getState().working), beforeWorking); assert.equal(draft.getState().dirty, true);
});

