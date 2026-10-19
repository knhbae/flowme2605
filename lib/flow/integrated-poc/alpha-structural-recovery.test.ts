import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAlphaStructuralDraft,
  createAlphaStructuralRecovery,
  resolveAlphaStructuralRecovery,
  validateAlphaStructuralRecoveryEntry,
  type AlphaStructuralRecoveryEntry,
} from './alpha-structural-recovery';
import { canonicalJson } from './alpha-persistence/json';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

const identity = { ownerId: 'synthetic-owner', slotId: 'synthetic-structural-slot' };
const baseRevision = 7;
type FolderFixture = { before: TextWorkspaceState; documentId: string; raw: string };

// This synthetic port never reads operating storage. External replacement models
// another writer; counters track only calls through the tested storage interface.
function memoryStorage() {
  const bytes = new Map<string, string>();
  return {
    writes: 0,
    removes: 0,
    getItem(key: string) { return bytes.get(key) ?? null; },
    setItem(key: string, value: string) { this.writes++; bytes.set(key, value); },
    removeItem(key: string) { this.removes++; bytes.delete(key); },
    replaceExternally(key: string, value: string) { bytes.set(key, value); },
  };
}

function folderFixture(): FolderFixture {
  const before = M.addDocument(createEmptyTextWorkspace(), { title: 'Synthetic folder source' });
  const documentId = before.documents[before.documents.length - 1].id;
  assert.equal(M.validate(before), true);
  return { before, documentId, raw: '- /Synthetic new folder' };
}

function sharedFolderFixture() {
  const fixture = folderFixture();
  let before = M.createFolderAt(fixture.before, fixture.documentId, 0, 'Shared old');
  const binding = before.bindings.find(value => value.kind === 'scope' && value.docId === fixture.documentId);
  assert(binding?.kind === 'scope');
  const folderId = binding.scopeId;
  before = M.addDocument(before, { title: 'Synthetic other occurrence' });
  const otherId = before.documents[before.documents.length - 1].id;
  const linked = M.editTextResult(before, otherId, '- /Shared old', { folderText: true });
  assert.equal(linked.reason, null);
  before = linked.state;
  assert.equal(M.validate(before), true);
  assert(before.bindings.some(value => value.kind === 'scope' && value.docId === otherId && value.scopeId === folderId));
  return { ...fixture, before, otherId, folderId, raw: '- /Shared renamed' };
}

function documentIds(state: TextWorkspaceState) {
  return [...state.documents, ...state.flows].map(document => document.id);
}

function folderNext(fixture: FolderFixture, raw = fixture.raw) {
  const result = M.editTextResult(fixture.before, fixture.documentId, raw, { folderText: true });
  assert.equal(result.reason, null);
  assert.equal(M.validate(fixture.before), true);
  assert.equal(M.validate(result.state), true);
  assert.deepEqual(documentIds(result.state), documentIds(fixture.before), 'no document is added');
  return result.state;
}

function assertDetachedCopy(copy: unknown, source: unknown) {
  assert.deepEqual(copy, source);
  if (source !== null && typeof source === 'object') {
    assert.notStrictEqual(copy, source);
    for (const key of Object.keys(source)) {
      assertDetachedCopy((copy as Record<string, unknown>)[key], (source as Record<string, unknown>)[key]);
    }
  }
}

function capturedEntry(fixture: FolderFixture, next: TextWorkspaceState) {
  assert.equal(M.validate(fixture.before), true);
  assert.equal(M.validate(next), true);
  const draft = createAlphaStructuralDraft(fixture.before, next, fixture.documentId);
  assert(draft);
  assert.equal(draft.documentId, fixture.documentId);
  assertDetachedCopy(draft.before, fixture.before);
  assertDetachedCopy(draft.next, next);
  const entry = { ...draft, baseRevision };
  assert.equal(validateAlphaStructuralRecoveryEntry(entry), true, 'capture and entry validation agree');
  return entry;
}

test('folder-only TXT creation captures the exact detached catalog, rows and binding without adding a document', () => {
  const fixture = folderFixture();
  const next = folderNext(fixture);
  const previousFolderIds = new Set(fixture.before.folders.map(folder => folder.id));
  const added = next.folders.filter(folder => !previousFolderIds.has(folder.id));
  assert.equal(added.length, 1);
  assert.equal(added[0].title, 'Synthetic new folder');
  assert.equal(next.bindings.length, fixture.before.bindings.length + 1);
  const document = M.getDocument(next, fixture.documentId);
  assert(document);
  assert.equal(M.raw(document), fixture.raw);
  assert.equal(M.getDocument(fixture.before, fixture.documentId)!.lines.length, 0);
  assert.equal(document.lines.length, 1);
  assert(next.bindings.some(binding => binding.kind === 'scope' && binding.docId === fixture.documentId
    && binding.lineId === document.lines[0].id && binding.scopeId === added[0].id));
  const entry = capturedEntry(fixture, next);
  assert.equal(canonicalJson(entry.before), canonicalJson(fixture.before));
  assert.equal(canonicalJson(entry.next), canonicalJson(next));
});

test('shared-folder TXT rename preserves existing folder/document/row identities and bindings across occurrences', () => {
  const fixture = sharedFolderFixture();
  const next = folderNext(fixture);
  assert.deepEqual(next.folders.map(folder => folder.id), fixture.before.folders.map(folder => folder.id));
  assert.equal(next.folders.find(folder => folder.id === fixture.folderId)?.title, 'Shared renamed');
  assert.deepEqual(next.bindings, fixture.before.bindings);
  for (const documentId of [fixture.documentId, fixture.otherId]) {
    const before = M.getDocument(fixture.before, documentId);
    const after = M.getDocument(next, documentId);
    assert(before && after);
    // createFolderAt serializes the source without '/', while the linked
    // occurrence retains the explicitly typed TXT marker.
    assert.equal(M.raw(before), documentId === fixture.documentId ? '- Shared old' : '- /Shared old');
    assert.equal(M.raw(after), '- /Shared renamed');
    const beforeScope = M.rowMeta(fixture.before, documentId).find(row => row.kind === 'scope');
    const afterScope = M.rowMeta(next, documentId).find(row => row.kind === 'scope');
    assert.equal(beforeScope?.scopeId, fixture.folderId); assert.equal(beforeScope?.scopeTitle, 'Shared old');
    assert.equal(afterScope?.scopeId, fixture.folderId); assert.equal(afterScope?.scopeTitle, 'Shared renamed');
    assert.deepEqual(after.lines.map(line => line.id), before.lines.map(line => line.id));
  }
  capturedEntry(fixture, next);
});

function ordinaryRowsFixture(): FolderFixture {
  const fixture = folderFixture();
  const before = M.editText(fixture.before, fixture.documentId, '- [ ] Existing task\nExisting memo');
  assert.equal(M.validate(before), true);
  assert.equal(M.tasks(before).find(task => task.docId === fixture.documentId)?.title, 'Existing task');
  return { ...fixture, before };
}

function rejectTransition(fixture: FolderFixture, next: TextWorkspaceState) {
  // Prove a valid non-folder transition first; rejection must not be attributed
  // to malformed model input or a newly added document.
  assert.equal(M.validate(fixture.before), true);
  assert.equal(M.validate(next), true);
  assert.deepEqual(documentIds(next), documentIds(fixture.before));
  assert.notEqual(canonicalJson(next), canonicalJson(fixture.before));
  assert.equal(createAlphaStructuralDraft(fixture.before, next, fixture.documentId), null);
  const entry: AlphaStructuralRecoveryEntry = { documentId: fixture.documentId, before: fixture.before, next, baseRevision };
  assert.equal(validateAlphaStructuralRecoveryEntry(entry), false);
  const storage = memoryStorage();
  const port = createAlphaStructuralRecovery(storage, identity);
  assert.deepEqual(port.read(), { ok: true, value: null });
  assert.deepEqual(port.save([entry]), { ok: false, reason: 'invalid' });
  assert.equal(storage.writes, 0);
  assert.equal(storage.removes, 0);
  assert.equal(storage.getItem(port.key), null);
}

type NegativeTransition = { fixture: FolderFixture; next: TextWorkspaceState };
const negativeCases: { name: string; build: () => NegativeTransition[] }[] = [
  {
    name: 'an unsubmitted catalog-only folder addition',
    build() {
      const fixture = folderFixture();
      const next = structuredClone(folderNext(fixture));
      next.folders.push({ id: 'synthetic-unsubmitted-folder', title: 'Unsubmitted catalog only', parentId: null });
      return [{ fixture, next }];
    },
  },
  {
    name: 'a simultaneous local task title change',
    build() {
      const fixture = ordinaryRowsFixture();
      const next = folderNext(fixture, '- [ ] Changed task\nExisting memo\n- /Synthetic new folder');
      assert.equal(M.tasks(next).find(task => task.docId === fixture.documentId)?.title, 'Changed task');
      return [{ fixture, next }];
    },
  },
  {
    name: 'a simultaneous ordinary memo change',
    build() {
      const fixture = ordinaryRowsFixture();
      const next = folderNext(fixture, '- [ ] Existing task\nChanged memo\n- /Synthetic new folder');
      assert.equal(M.getDocument(next, fixture.documentId)?.lines[1].text, 'Changed memo');
      return [{ fixture, next }];
    },
  },
  {
    name: 'simultaneous progress/history changes',
    build() {
      const fixture = ordinaryRowsFixture();
      const candidate = folderNext(fixture, '- [ ] Existing task\nExisting memo\n- /Synthetic new folder');
      const task = M.tasks(candidate).find(value => value.docId === fixture.documentId);
      assert(task);
      const next = M.recordProgress(candidate, task.id, '2026-10-19', 25);
      assert.deepEqual(M.progressHistory(next, task.id), [{ date: '2026-10-19', percent: 25 }]);
      assert.notEqual(canonicalJson(next.progressRecords), canonicalJson(fixture.before.progressRecords));
      return [{ fixture, next }];
    },
  },
  {
    name: 'unrelated other-document memo changes',
    build() {
      const fixture = sharedFolderFixture();
      const candidate = folderNext(fixture);
      const raw = `${M.raw(M.getDocument(candidate, fixture.otherId))}\nUnrelated other-document memo`;
      const next = M.editText(candidate, fixture.otherId, raw);
      assert.equal(M.raw(M.getDocument(next, fixture.otherId)), raw);
      return [{ fixture, next }];
    },
  },
  {
    name: 'removal of an existing folder-scope binding',
    build() {
      const fixture = sharedFolderFixture();
      const candidate = folderNext(fixture);
      const result = M.editTextResult(candidate, fixture.documentId, 'Source occurrence removed', { folderText: true });
      assert.equal(result.reason, null);
      assert.equal(result.state.bindings.some(binding => binding.docId === fixture.documentId), false);
      return [{ fixture, next: result.state }];
    },
  },
  {
    name: 'replacement of an existing row ID even with its binding moved consistently',
    build() {
      const fixture = sharedFolderFixture();
      const next = structuredClone(folderNext(fixture));
      const line = M.getDocument(next, fixture.documentId)!.lines[0];
      const previousId = line.id;
      line.id = 'synthetic-replaced-existing-row';
      assert.notEqual(line.id, previousId);
      for (const binding of next.bindings) {
        if (binding.docId === fixture.documentId && binding.lineId === previousId) binding.lineId = line.id;
      }
      assert(next.bindings.some(binding => binding.docId === fixture.documentId && binding.lineId === line.id));
      return [{ fixture, next }];
    },
  },
  {
    name: 'document metadata changes or folder catalog reordering',
    build() {
      const fixture = sharedFolderFixture();
      const candidate = folderNext(fixture);
      const metadata = structuredClone(candidate);
      M.getDocument(metadata, fixture.otherId)!.title = 'Unsubmitted document metadata';
      const reordered = structuredClone(candidate);
      reordered.folders.reverse();
      assert.notEqual(canonicalJson(reordered.folders), canonicalJson(candidate.folders));
      return [{ fixture, next: metadata }, { fixture, next: reordered }];
    },
  },
];

for (const row of negativeCases) {
  test(`folder-only eligibility rejects ${row.name}`, () => {
    for (const { fixture, next } of row.build()) rejectTransition(fixture, next);
  });
}

test('ordinary raw-only editing does not create a structural capture', () => {
  const fixture = folderFixture();
  const next = M.editText(fixture.before, fixture.documentId, 'ordinary synthetic memo');
  assert.equal(M.validate(fixture.before), true);
  assert.equal(M.validate(next), true);
  assert.deepEqual(documentIds(next), documentIds(fixture.before));
  assert.equal(M.raw(M.getDocument(next, fixture.documentId)), 'ordinary synthetic memo');
  assert.equal(createAlphaStructuralDraft(fixture.before, next, fixture.documentId), null);
});

test('a no-op does not create a structural capture', () => {
  const fixture = folderFixture();
  assert.equal(M.validate(fixture.before), true);
  assert.equal(createAlphaStructuralDraft(fixture.before, fixture.before, fixture.documentId), null);
});

test('invalid folder text leaves the valid workspace unchanged and creates no structural capture', () => {
  const fixture = folderFixture();
  const result = M.editTextResult(fixture.before, fixture.documentId, '  - /orphan synthetic child', { folderText: true });
  assert.equal(result.reason, 'invalid-format');
  assert.equal(result.folderProblem, 'invalid-parent');
  assert.equal(M.validate(fixture.before), true);
  assert.equal(M.validate(result.state), true);
  assert.equal(canonicalJson(result.state), canonicalJson(fixture.before));
  assert.equal(createAlphaStructuralDraft(fixture.before, result.state, fixture.documentId), null);
});

test('new-document recovery remains detached, already-present aware, stale-aware and base-revision validated', () => {
  const fixture = folderFixture();
  const next = M.addDocument(fixture.before, { title: 'Guard-only new document' });
  assert.equal(M.validate(fixture.before), true);
  assert.equal(M.validate(next), true);
  assert.equal(next.documents.length, fixture.before.documents.length + 1);
  const entry = capturedEntry(fixture, next);
  const ready = resolveAlphaStructuralRecovery(fixture.before, entry);
  assert(ready.status === 'ready');
  assertDetachedCopy(ready.workspace, entry.next);
  assert.equal(canonicalJson(ready.workspace), canonicalJson(next));
  assert.equal(resolveAlphaStructuralRecovery(next, entry).status, 'already-present');
  const stale = M.editText(fixture.before, fixture.documentId, 'later synthetic memo');
  assert.equal(M.validate(stale), true);
  assert.equal(resolveAlphaStructuralRecovery(stale, entry).status, 'stale');
  const invalidRevision = { ...entry, baseRevision: -1 };
  assert.equal(validateAlphaStructuralRecoveryEntry(invalidRevision), false);
  assert.equal(resolveAlphaStructuralRecovery(fixture.before, invalidRevision).status, 'invalid');
});

function storedFolderEntry() {
  const fixture = folderFixture();
  const entry = capturedEntry(fixture, folderNext(fixture));
  const storage = memoryStorage();
  const port = createAlphaStructuralRecovery(storage, identity);
  assert.deepEqual(port.read(), { ok: true, value: null });
  const saved = port.save([entry]);
  assert(saved.ok && saved.value);
  assert.equal(saved.changed, true);
  assert.deepEqual(saved.value.entries, [entry]);
  assert.deepEqual(port.read(), { ok: true, value: saved.value });
  return { storage, port, entry, record: saved.value };
}

test('structural port rejects a foreign-owner record on a fresh read without repairing or deleting it', () => {
  const { storage, port, entry, record } = storedFolderEntry();
  const foreignBytes = canonicalJson({ ...record, ownerId: 'synthetic-other-owner' });
  storage.replaceExternally(port.key, foreignBytes);
  const writes = storage.writes;
  const removes = storage.removes;
  const fresh = createAlphaStructuralRecovery(storage, identity);
  assert.deepEqual(fresh.read(), { ok: false, reason: 'corrupt' });
  assert.deepEqual(fresh.save([entry]), { ok: false, reason: 'corrupt' });
  assert.deepEqual(fresh.clear(), { ok: false, reason: 'corrupt' });
  assert.equal(storage.getItem(port.key), foreignBytes);
  assert.equal(storage.writes, writes);
  assert.equal(storage.removes, removes);
});

test('structural port save detects external replacement by CAS without overwriting or deleting bytes', () => {
  const { storage, port, entry, record } = storedFolderEntry();
  const externalBytes = canonicalJson({ ...record, entries: [{ ...entry, baseRevision: baseRevision + 1 }] });
  storage.replaceExternally(port.key, externalBytes);
  const writes = storage.writes;
  const removes = storage.removes;
  assert.deepEqual(port.save([entry]), { ok: false, reason: 'conflict' });
  assert.equal(storage.getItem(port.key), externalBytes);
  assert.equal(storage.writes, writes);
  assert.equal(storage.removes, removes);
});

test('structural port clear independently detects external replacement by CAS without changing bytes', () => {
  const { storage, port, entry, record } = storedFolderEntry();
  const externalBytes = canonicalJson({ ...record, entries: [{ ...entry, baseRevision: baseRevision + 1 }] });
  storage.replaceExternally(port.key, externalBytes);
  const writes = storage.writes;
  const removes = storage.removes;
  assert.deepEqual(port.clear(record), { ok: false, reason: 'conflict' });
  assert.equal(storage.getItem(port.key), externalBytes);
  assert.equal(storage.writes, writes);
  assert.equal(storage.removes, removes);
});
