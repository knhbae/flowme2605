import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, programId, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { archiveProgramPublication, createProgramPublicationDraft, publicationDraftAt, publishProgramDocument, saveProgramPublicationDraft } from './publication-editor';
import { createProgramPost, createProgramReply, toggleProgramReaction } from './community';
import { programPublicationDocumentEntry, readProgramPublicationManagement } from './publication-management';

const NOW = '2026-11-09T03:00:00.000Z';
function accept(transition: ProgramTransition<string>) { assert(transition.ok, transition.ok ? '' : transition.reason); return transition.data; }
function fixture(initial = createProgramData()) {
  let data = programClone(initial); const actorId = data.activeActorId;
  let text = M.addDocument(data.spaces[actorId].text, { title: '관리 합성 원문' });
  const documentId = text.documents.at(-1)!.id;
  text = M.editTextResult(text, documentId, '- [ ] 확인할 일\n공개하지 않은 메모', { folderText: true }).state;
  data.spaces[actorId].text = text;
  const draft = createProgramPublicationDraft(data, documentId, NOW)!;
  draft.title = '관리할 합성 Flow'; draft.rows.forEach(row => { row.selected = row.origin === 'task'; });
  data = accept(saveProgramPublicationDraft(data, actorId, draft, null));
  const published = publishProgramDocument(data, actorId, draft, NOW); assert(published.ok);
  data = published.data;
  const version = data.public.versions.find(row => row.id === published.result)!;
  return { data, actorId, documentId, flowId: version.flowId, version };
}

test('document-menu handoff selects publish, manage and retained resume without changing any data', () => {
  const f = fixture(), before = programClone(f.data);
  assert.deepEqual(programPublicationDocumentEntry(f.data, f.documentId), { kind: 'manage', label: '공개 관리 · 버전 1', documentId: f.documentId, initialStep: 'pick', flowId: f.flowId });
  let text = M.addDocument(f.data.spaces[f.actorId].text, { title: '아직 비공개' });
  const unpublished = text.documents.at(-1)!.id; f.data.spaces[f.actorId].text = text;
  assert.deepEqual(programPublicationDocumentEntry(f.data, unpublished), { kind: 'publish', label: '공개하기', documentId: unpublished, initialStep: 'pick', flowId: null });
  const draft = createProgramPublicationDraft(f.data, f.documentId, NOW)!;
  f.data = accept(saveProgramPublicationDraft(f.data, f.actorId, draft, null));
  assert.deepEqual(programPublicationDocumentEntry(f.data, f.documentId), { kind: 'resume', label: '공개 이어서', documentId: f.documentId, initialStep: 'refine', flowId: f.flowId });
  assert.equal(before.public.flows.find(row => row.id === f.flowId)?.currentVersionId, f.version.id);
  assert.equal(programPublicationDocumentEntry(f.data, 'missing-document'), null);
  f.data.spaces[f.actorId].archivedDocumentIds.push(f.documentId);
  assert.equal(programPublicationDocumentEntry(f.data, f.documentId), null);
});

test('source-change notice is unknown without a retained baseline, then unchanged and changed against the exact draft', () => {
  const f = fixture();
  assert.equal(readProgramPublicationManagement(f.data, f.actorId, f.flowId)?.documents[0].sourceChanged, null);
  const draft = createProgramPublicationDraft(f.data, f.documentId, NOW)!;
  f.data = accept(saveProgramPublicationDraft(f.data, f.actorId, draft, null));
  assert.equal(readProgramPublicationManagement(f.data, f.actorId, f.flowId)?.documents[0].sourceChanged, false);
  const before = programClone(f.data);
  f.data.spaces[f.actorId].text = M.editTextResult(f.data.spaces[f.actorId].text, f.documentId, '- [ ] 바뀐 원래 할 일\n공개하지 않은 메모', { folderText: true }).state;
  assert.equal(readProgramPublicationManagement(f.data, f.actorId, f.flowId)?.documents[0].sourceChanged, true);
  assert.deepEqual(f.data.public, before.public);
  assert.deepEqual(publicationDraftAt(f.data, f.actorId, f.documentId), draft);
});

test('management only exposes the active owner and preserves honest zero review/reaction counts', () => {
  const f = fixture(), before = programClone(f.data);
  const management = readProgramPublicationManagement(f.data, f.actorId, f.flowId)!;
  assert.equal(management.reviews.length, 0); assert.equal(management.reactions.length, 0);
  assert.equal(readProgramPublicationManagement(f.data, 'participant-jihun', f.flowId), null);
  f.data.activeActorId = 'participant-jihun';
  assert.equal(readProgramPublicationManagement(f.data, f.actorId, f.flowId), null);
  assert.equal(readProgramPublicationManagement(f.data, 'participant-jihun', f.flowId), null);
  f.data.activeActorId = f.actorId;
  assert.deepEqual(f.data, before);
});

test('feedback is scoped to one Flow: other people reviews and reactions received on owner posts and replies', () => {
  const f = fixture(), other = 'participant-jihun';
  const second = fixture(f.data); f.data = second.data;
  const addPost = (actorId: string, flowId: string, versionId: string, kind: 'experience' | 'question') => {
    const result = createProgramPost(f.data, { actorId, requestId: programId('review-request'), kind, title: `${kind} 합성`, body: '합성 본문', topic: '', flowId, versionId }, NOW);
    assert(result.ok); f.data = result.data; return result.result;
  };
  const review = addPost(other, f.flowId, f.version.id, 'experience');
  addPost(other, second.flowId, second.version.id, 'experience');
  const mine = addPost(f.actorId, f.flowId, f.version.id, 'question');
  const unrelated = addPost(f.actorId, second.flowId, second.version.id, 'question');
  const reply = createProgramReply(f.data, { actorId: f.actorId, requestId: programId('reply-request'), postId: review, body: '작성자의 답글' }, NOW);
  assert(reply.ok); f.data = reply.data;
  for (const [kind, id] of [['post', mine], ['post', unrelated], ['reply', reply.result], ['post', review]] as const) f.data = accept(toggleProgramReaction(f.data, other, kind, id));
  const management = readProgramPublicationManagement(f.data, f.actorId, f.flowId)!;
  assert.deepEqual(management.reviews.map(row => row.id), [review]);
  assert.deepEqual(new Set(management.reactions.map(row => row.reaction.targetId)), new Set([mine, reply.result]));
  assert(management.reactions.every(row => row.post.flowId === f.flowId));
  assert(validateProgramData(f.data));
});

test('archival still requires the displayed version and keeps source, versions, other copies and retained draft intact', () => {
  const f = fixture(), draft = createProgramPublicationDraft(f.data, f.documentId, NOW)!;
  f.data = accept(saveProgramPublicationDraft(f.data, f.actorId, draft, null));
  const before = programClone(f.data);
  const stale = archiveProgramPublication(f.data, f.actorId, f.documentId, f.flowId, 'outdated-version');
  assert(!stale.ok); assert.equal(stale.reason, 'conflict'); assert.deepEqual(stale.data, before);
  f.data = accept(archiveProgramPublication(f.data, f.actorId, f.documentId, f.flowId, f.version.id));
  assert(readProgramPublicationManagement(f.data, f.actorId, f.flowId)?.flow.archived);
  assert.equal(programPublicationDocumentEntry(f.data, f.documentId)?.kind, 'resume');
  assert.deepEqual(f.data.spaces, before.spaces); assert.deepEqual(f.data.public.versions, before.public.versions);
  f.data.spaces[f.actorId].publicationDrafts = [];
  assert.equal(programPublicationDocumentEntry(f.data, f.documentId)?.kind, 'manage');
});
