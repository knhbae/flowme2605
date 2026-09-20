import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData, validateProgramData } from './program-data';
import { programClone, type ProgramData } from './contract';
import { importProgramCreatorDraft, readProgramCreatorDraftLibrary, type ProgramCreatorDraftImportInput } from './creator-draft-bridge';
import { textWorkspaceModel as M } from './text-workspace';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocCreatorDraftLibrary, transitionPersonalWorkspacePocCreatorDraftLibrary,
  PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY, type PersonalWorkspacePocCreatorDraftLibrary } from '../personal-workspace-poc-creator-drafts';
import { PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY } from '../personal-workspace-poc-creator-draft-storage-transaction';

const T0 = '2026-09-12T00:00:00.000Z', T1 = '2026-09-12T00:01:00.000Z', T2 = '2026-09-12T00:02:00.000Z', T3 = '2026-09-12T00:03:00.000Z';
function save(library: PersonalWorkspacePocCreatorDraftLibrary, rawText: string, draftId = 'creator-one', now = T1) {
  const result = transitionPersonalWorkspacePocCreatorDraftLibrary(library, { type: 'save', expectedLibraryRevision: library.revision,
    ...(library.records[draftId] ? { expectedRecordRevision: library.records[draftId].recordRevision } : {}), draftId, rawText,
    sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText), now });
  assert.equal(result.code, 'saved'); return result.library;
}
function fixture() {
  const first = save(createPersonalWorkspacePocCreatorDraftLibrary(T0), '# 원래 제목\r\n- [ ] 원래 일\r\n');
  const library = save(first, '# 현재 제목\r\n- [ ] 현재 일\r\n', 'creator-one', T2);
  const data = createProgramData(); return { data, first, library };
}
function input(data: ProgramData, library: PersonalWorkspacePocCreatorDraftLibrary, requestId = 'import-request'): ProgramCreatorDraftImportInput {
  const current = library.records['creator-one'];
  return { actorId: 'local-user', requestId, creatorDraftId: current.draftId, expectedLibraryRevision: library.revision,
    expectedRecordRevision: current.recordRevision, expectedSourceFingerprint: current.sourceFingerprint, expectedSpace: data.spaces['local-user'] };
}
function accepted(data: ProgramData, library: PersonalWorkspacePocCreatorDraftLibrary, requestId = 'import-request') {
  const result = importProgramCreatorDraft(data, library, input(data, library, requestId), T3);
  assert.ok(result.ok, result.ok ? undefined : result.reason); assert.equal(validateProgramData(result.data), true); return result;
}
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

test('B01 current plus actual one-Undo import privately with exact original bytes and raw-only historic identity', () => {
  const { data, library } = fixture(), before = JSON.stringify({ data, library });
  const result = accepted(freeze(data), freeze(library)), space = result.data.spaces['local-user'], provenance = space.creatorDraftImports![0];
  assert.equal(space.text.documents.length, 1); assert.equal(space.text.flows.length, 0); assert.equal(space.draftRevisions.length, 1);
  assert.equal(M.raw(space.text.documents[0]), library.records['creator-one'].rawText.replace(/\r\n/g, '\n'));
  assert.equal(provenance.creatorDraftId, 'creator-one'); assert.deepEqual(provenance.source.current, library.records['creator-one']);
  assert.deepEqual(provenance.source.undo!.record, library.undo!.snapshot.records['creator-one']);
  assert.equal(space.draftRevisions[0].identity, null); assert.equal(space.draftRevisions[0].createdAt, T1);
  assert.equal(space.draftRevisions[0].raw, '# 원래 제목\n- [ ] 원래 일\n');
  assert.equal(space.text.progressRecords.length, 0); assert.deepEqual(result.data.public, data.public);
  assert.deepEqual(result.data.spaces['creator-minji'], data.spaces['creator-minji']); assert.equal(JSON.stringify({ data, library }), before);
});

test('B02 first-save and unrelated library Undo do not manufacture revisions or copy another draft', () => {
  const { data, first } = fixture();
  const unrelated = save(first, '# 다른 초안\n개인 내용', 'unselected', T2);
  for (const library of [first, unrelated]) {
    const space = accepted(data, library).data.spaces['local-user'];
    assert.equal(space.draftRevisions.length, 0); assert.equal(space.creatorDraftImports![0].source.undo, null);
    assert.doesNotMatch(JSON.stringify(space.creatorDraftImports), /다른 초안|unselected/u);
  }
});

test('B03 archive metadata-only Undo remains provenance but creates no false text version', () => {
  const { data, first } = fixture();
  const archived = transitionPersonalWorkspacePocCreatorDraftLibrary(first, { type: 'archive', draftId: 'creator-one', expectedLibraryRevision: first.revision,
    expectedRecordRevision: 1, now: T2 }); assert.equal(archived.code, 'archived');
  const space = accepted(data, archived.library).data.spaces['local-user'];
  assert.equal(space.creatorDraftImports![0].source.current.status, 'archived'); assert.equal(space.creatorDraftImports![0].source.undo!.record.status, 'active');
  assert.equal(space.creatorDraftImports![0].undoRevisionId, null); assert.equal(space.draftRevisions.length, 0);
});

test('B04 exact lost-response retry and another request preserve imported line IDs and personal edits', () => {
  const { data, library } = fixture(), originalInput = input(data, library), first = accepted(data, library);
  const changed = programClone(first.data), space = changed.spaces['local-user'], task = M.tasks(space.text)[0];
  space.text = M.updateTask(space.text, task.id, { title: '개인 수정' });
  for (const request of [originalInput, { ...input(changed, library, 'another-request') }]) {
    const result = importProgramCreatorDraft(changed, library, request, T3);
    assert.ok(result.ok); assert.equal(result.changed, false); assert.equal(result.result, first.result); assert.equal(result.data, changed);
    assert.equal(M.tasks(result.data.spaces['local-user'].text)[0].id, task.id); assert.equal(M.tasks(result.data.spaces['local-user'].text)[0].title, '개인 수정');
  }
  const altered = importProgramCreatorDraft(changed, library, { ...originalInput, folderId: 'changed-folder' }, T3);
  assert.equal(altered.ok, false); if (!altered.ok) assert.equal(altered.reason, 'duplicate-request');
});

test('B05 stale source/library/space, foreign actor, missing target and corrupted library cause no-write failure', () => {
  const { data, library } = fixture(), valid = input(data, library);
  for (const patch of [{ expectedLibraryRevision: 0 }, { expectedRecordRevision: 1 }, { expectedSourceFingerprint: 'wrong' },
    { expectedSpace: { ...valid.expectedSpace, archivedDocumentIds: ['missing'] } }, { actorId: 'creator-minji' }, { creatorDraftId: 'missing' }]) {
    const result = importProgramCreatorDraft(data, library, { ...valid, ...patch }, T3); assert.equal(result.ok, false); assert.equal(result.data, data);
  }
  const corrupt = programClone(library) as unknown as { records: Record<string, { rawText: string }> }; corrupt.records['creator-one'].rawText = '변조';
  const result = importProgramCreatorDraft(data, corrupt as unknown as PersonalWorkspacePocCreatorDraftLibrary, valid, T3);
  assert.equal(result.ok, false); assert.equal(result.data, data);
});

test('B06 changed source cannot silently replace an already edited imported document', () => {
  const { data, library } = fixture(), first = accepted(data, library);
  const updated = save(library, '# 나중 원문\n새로운 내용', 'creator-one', T3);
  const result = importProgramCreatorDraft(first.data, updated, input(first.data, updated, 'new-import'), T3);
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.reason, 'conflict'); assert.equal(result.data, first.data);
});

test('B07 old store reader performs reads only and fails closed during pending recovery without running recovery', () => {
  const { library } = fixture(), raw = JSON.stringify(library, null, 2), reads: string[] = []; let writes = 0;
  const values = new Map([[PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY, raw], ['flow:operating', 'unchanged']]);
  const port = { getItem(key: string) { reads.push(key); return values.get(key) ?? null; }, setItem() { writes++; }, removeItem() { writes++; } };
  const loaded = readProgramCreatorDraftLibrary(port); assert.equal(loaded.kind, 'ready'); assert.equal(loaded.raw, raw); assert.equal(writes, 0);
  assert.ok(reads.every(key => [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY, PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY].includes(key)));
  values.set(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY, '{pending}');
  assert.deepEqual(readProgramCreatorDraftLibrary(port), { kind: 'corrupt', raw: null, reason: 'recovery-required' });
  assert.equal(values.get(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), raw); assert.equal(values.get('flow:operating'), 'unchanged'); assert.equal(writes, 0);
});

test('B08 numeric source progress is not fabricated as a dated execution record on import', () => {
  const { data } = fixture(), library = save(createPersonalWorkspacePocCreatorDraftLibrary(T0), '# 숫자 원문\n- [40%] 진행\n  - 날짜: 2026-09-15');
  const result = importProgramCreatorDraft(data, library, input(data, library), T3);
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.reason, 'unresolved'); assert.equal(result.data, data);
});

test('B09 a retained global receipt cannot resurrect an import removed by private Undo', () => {
  const { data, library } = fixture(), request = input(data, library), first = accepted(data, library);
  const undone = programClone(first.data); undone.spaces['local-user'] = programClone(data.spaces['local-user']);
  assert.equal(validateProgramData(undone), true);
  const retry = importProgramCreatorDraft(undone, library, request, T3);
  assert.equal(retry.ok, false); if (!retry.ok) assert.equal(retry.reason, 'conflict'); assert.equal(retry.data, undone);
});

test('B10 oversized source and malformed read preserve data without creating a partial document', () => {
  const { data } = fixture(), library = save(createPersonalWorkspacePocCreatorDraftLibrary(T0), 'x'.repeat(100001));
  const oversized = importProgramCreatorDraft(data, library, input(data, library), T3);
  assert.equal(oversized.ok, false); if (!oversized.ok) assert.equal(oversized.reason, 'limit'); assert.equal(oversized.data, data);
  const broken = readProgramCreatorDraftLibrary({ getItem(key) { return key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY ? '{broken' : null; } });
  assert.equal(broken.kind, 'corrupt'); assert.equal(broken.raw, '{broken');
});
