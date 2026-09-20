import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData, validateProgramData } from './program-data';
import { programClone, type ProgramTransition } from './contract';
import { applyProgramCreatorAction, handoffProgramCreatorDraft, setProgramCreatorWorking, fingerprintPersonalWorkspacePocAuthoringSource as fp } from './creator-workspace';
import { readProgramDocumentCreatorLink, programDocumentCreatorDestination } from './document-creator-provenance';
const NOW = '2026-09-12T09:00:00.000Z', RAW = '# 비공개 제작\n\n- [ ] 준비\n  - 날짜: 2026-09-15';
function ok(result: ProgramTransition<string>) { if (!result.ok) assert.fail(result.reason); assert.ok(validateProgramData(result.data)); return result; }
function fixture() {
  let data = ok(setProgramCreatorWorking(createProgramData(), { actorId: 'local-user', expectedWorking: null, working: { draftId: 'creator-link', rawText: RAW, title: '비공개 제작', baseRecordRevision: null } }, NOW)).data;
  data = ok(applyProgramCreatorAction(data, { actorId: 'local-user', requestId: 'save', action: { type: 'save', draftId: 'creator-link', rawText: RAW, title: '비공개 제작', sourceFingerprint: fp(RAW), expectedLibraryRevision: 0, now: NOW } }, NOW)).data;
  return ok(handoffProgramCreatorDraft(data, { actorId: 'local-user', requestId: 'handoff', draftId: 'creator-link', expectedRecordRevision: 1, today: '2026-09-12' }, NOW));
}
test('read and return preserve exact draft/document identity, handoff revision, input and public state', () => {
  const result = fixture(), before = JSON.stringify(result.data), link = readProgramDocumentCreatorLink(result.data, result.result);
  assert.equal(link.status, 'active'); if (link.status !== 'active') assert.fail('active link required');
  assert.equal(link.documentId, result.result); assert.equal(link.handoffRevision, 1); assert.equal(link.currentRevision, 1);
  assert.deepEqual(programDocumentCreatorDestination(link), { view: 'creator', id: 'creator-link' });
  assert.equal(JSON.stringify(result.data), before); assert.equal(JSON.stringify(result.data.public).includes('비공개 제작'), false);
  const again = ok(handoffProgramCreatorDraft(result.data, { actorId: 'local-user', requestId: 'return-handoff', draftId: 'creator-link', expectedRecordRevision: 1, today: '2026-09-12' }, NOW));
  assert.equal(again.result, result.result); assert.equal(again.changed, false);
});
test('later rename and archive change current revision but not captured handoff; archived route is same target', () => {
  const result = fixture(); let data = result.data;
  for (const type of ['rename', 'archive'] as const) {
    const library = data.spaces['local-user'].creatorWorkspace!.library;
    data = ok(applyProgramCreatorAction(data, { actorId: 'local-user', requestId: type, action: { type, draftId: 'creator-link', title: '새 제작 이름', expectedLibraryRevision: library.revision, expectedRecordRevision: library.records['creator-link'].recordRevision, now: NOW } }, NOW)).data;
  }
  const link = readProgramDocumentCreatorLink(data, result.result); assert.equal(link.status, 'archived');
  if (link.status !== 'archived') assert.fail('archived link required');
  assert.equal(link.handoffRevision, 1); assert.equal(link.currentRevision, 3); assert.equal(link.handoffTitle, '비공개 제작'); assert.equal(link.currentTitle, '새 제작 이름');
  assert.deepEqual(programDocumentCreatorDestination(link), { view: 'creator', id: 'creator-link' });
});
test('missing, mismatched, duplicate targets do not invent a destination or read another actor', () => {
  const result = fixture(), data = programClone(result.data), workspace = data.spaces['local-user'].creatorWorkspace!;
  workspace.library = { ...workspace.library, records: {} };
  const missing = readProgramDocumentCreatorLink(data, result.result); assert.equal(missing.status, 'missing'); assert.equal(programDocumentCreatorDestination(missing), null);
  workspace.handoffs.other = { ...workspace.handoffs['creator-link'] };
  assert.deepEqual(readProgramDocumentCreatorLink(data, result.result), { status: 'ambiguous' });
  data.activeActorId = 'participant-jihun';
  assert.deepEqual(readProgramDocumentCreatorLink(data, result.result), { status: 'unavailable' });
  assert.deepEqual(readProgramDocumentCreatorLink(result.data, 'not-a-document'), { status: 'unavailable' });
  const unknown = programClone(result.data); unknown.activeActorId = 'unknown';
  assert.deepEqual(readProgramDocumentCreatorLink(unknown, result.result), { status: 'unavailable' });
});
test('Undo removes the source link without retaining a stale route, while ordinary documents remain unlinked', () => {
  const result = fixture(), data = programClone(result.data); delete data.spaces['local-user'].creatorWorkspace;
  const link = readProgramDocumentCreatorLink(data, result.result); assert.equal(link.status, 'unlinked'); assert.equal(programDocumentCreatorDestination(link), null);
  const undone = programClone(result.data); undone.spaces['local-user'] = createProgramData().spaces['local-user'];
  assert.equal(readProgramDocumentCreatorLink(undone, result.result).status, 'unavailable');
});
