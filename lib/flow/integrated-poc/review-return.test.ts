import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramParticipationDraft, type ProgramTransition } from './contract';
import { createProgramPrivateSpace, validateProgramData } from './program-data';
import { newProgramParticipationDraft, saveProgramParticipationDraft, submitProgramParticipation } from './participation-editor';
import { newProgramReviewDraft, programReviewOriginReason, programReviewPublicRelationValid } from './review-return';
import { textWorkspaceModel as M } from './text-workspace';

const now = '2026-10-16T10:00:00.000Z';
const privateNote = 'PRIVATE_REVIEW_ORIGIN_NOTE_83';

function fixture() {
  const data: ProgramData = {
    actors: [{ id: 'review-author', name: '합성 작성자', simulated: true }, { id: 'other-actor', name: '합성 다른 인물', simulated: true }],
    activeActorId: 'review-author',
    spaces: { 'review-author': createProgramPrivateSpace(), 'other-actor': createProgramPrivateSpace() }, receipts: [],
    public: {
      posts: [], replies: [], reactions: [], proposals: [],
      flows: [{ id: 'review-flow', ownerId: 'review-author', currentVersionId: 'review-v2', category: '생활', situations: [], archived: false, derivedFrom: null }],
      versions: ['review-v1', 'review-v2'].map((id, index) => ({
        id, flowId: 'review-flow', number: index + 1, parentVersionId: index ? 'review-v1' : null,
        title: `합성 공개 판본 ${index + 1}`, summary: '',
        items: [{ id: index ? 'review-new-item' : 'review-old-item', title: '합성 공개 항목', description: '', completionCriteria: '',
          sourceUrl: null, schedule: { kind: 'undated' as const }, subchecks: [] }],
        source: { kind: 'simulated-example' as const, label: '합성 예시', url: null, checkedAt: null },
        createdBy: 'review-author', createdAt: now,
      })),
    },
  };
  const space = data.spaces['review-author'];
  space.text = M.addDocument(space.text, { title: '비공개 후기 원문', folderId: 'folder-unfiled' });
  const documentId = space.text.documents.at(-1)!.id;
  space.text = M.editText(space.text, documentId, privateNote);
  space.text = M.addTask(space.text, { docId: documentId, title: '합성 개인 진행', date: '2026-10-16' });
  const task = M.tasks(space.text).find(entry => entry.docId === documentId)!;
  assert.ok(task, 'fixture must contain a real private task');
  space.text = M.recordProgress(space.text, task.id, '2026-10-16', 37);
  assert.ok(space.text.progressRecords.length > 0, 'preservation assertion must cover nonempty progress');
  assert.ok(validateProgramData(data));
  return { data, origin: { actorId: data.activeActorId, documentId, raw: M.raw(M.getDocument(space.text, documentId)) } };
}

function success<T>(result: ProgramTransition<T>) {
  if (!result.ok) assert.fail(result.reason);
  assert.ok(validateProgramData(result.data));
  return result;
}

function failure<T>(result: ProgramTransition<T>, before: ProgramData, reason: string) {
  assert.equal(result.ok, false);
  if (result.ok) assert.fail('expected rejected transition');
  assert.equal(result.reason, reason);
  assert.equal(result.data, before);
}

function selectedReview(): ProgramParticipationDraft {
  return { ...newProgramReviewDraft(), title: '내가 직접 쓴 공개 후기', body: '공개할 경험만 직접 입력했습니다.',
    flowId: 'review-flow', versionId: 'review-v1', itemId: 'review-old-item' };
}

test('RR01 a new review is an empty experience draft with no private origin or inferred public relation', () => {
  const { data, origin } = fixture();
  const before = JSON.stringify(data), draft = newProgramReviewDraft();
  assert.equal(draft.kind, 'experience');
  assert.equal(draft.title, ''); assert.equal(draft.body, '');
  assert.equal(draft.flowId, null); assert.equal(draft.versionId, null); assert.equal(draft.itemId, null);
  assert.equal(draft.editTargetId, null); assert.deepEqual(draft.evidencePostIds, []);
  for (const key of ['origin', 'documentId', 'raw', 'checkpoint', 'editor', 'privateNote', 'progressRecords']) assert.equal(key in draft, false);
  assert.equal(JSON.stringify(draft).includes(origin.documentId), false);
  assert.equal(JSON.stringify(draft).includes(privateNote), false);
  assert.equal(JSON.stringify(data), before);
});

test('RR02 origin lookup accepts only the same actor and exact raw without modifying private state', () => {
  const { data, origin } = fixture(), before = JSON.stringify(data);
  assert.equal(programReviewOriginReason(data, origin), null);
  assert.equal(programReviewOriginReason(data, { ...origin, actorId: 'other-actor' }), 'actor');
  const switched = programClone(data); switched.activeActorId = 'other-actor';
  assert.equal(programReviewOriginReason(switched, origin), 'actor');
  assert.equal(programReviewOriginReason(data, { ...origin, raw: `${origin.raw}\n` }), 'changed');
  assert.equal(JSON.stringify(data), before);
});

test('RR03 removed documents, absent actor spaces and changed current raw never authorize origin restoration', () => {
  const { data, origin } = fixture();
  const removed = programClone(data); removed.spaces[origin.actorId].text.documents = [];
  assert.equal(programReviewOriginReason(removed, origin), 'missing');
  const absentSpace = programClone(data); delete absentSpace.spaces[origin.actorId];
  assert.equal(programReviewOriginReason(absentSpace, origin), 'missing');
  const changed = programClone(data);
  changed.spaces[origin.actorId].text = M.editText(changed.spaces[origin.actorId].text, origin.documentId, `${origin.raw}\n새 개인 메모`);
  assert.equal(programReviewOriginReason(changed, origin), 'changed');
});

test('RR04 archived, trashed and retained origin documents fail closed even with matching raw', () => {
  const { data, origin } = fixture();
  const archived = programClone(data); archived.spaces[origin.actorId].archivedDocumentIds.push(origin.documentId);
  assert.equal(programReviewOriginReason(archived, origin), 'unavailable');
  const trashed = programClone(data);
  trashed.spaces[origin.actorId].documentTrash = { [origin.documentId]: { trashedAt: now, wasArchived: false } };
  assert.equal(programReviewOriginReason(trashed, origin), 'unavailable');
  // A partial/inconsistent projection must not bypass the independent retention guard.
  const retained = programClone(data); retained.spaces[origin.actorId].retentionDocuments = { 'synthetic-source': origin.documentId };
  assert.equal(programReviewOriginReason(retained, origin), 'unavailable');
  assert.equal(programReviewOriginReason(data, origin), null);
});

test('RR05 opting out requires the entire public tuple to be null and never infers a current version', () => {
  const { data } = fixture(), draft = newProgramReviewDraft();
  assert.equal(programReviewPublicRelationValid(data, draft), true);
  assert.equal(programReviewPublicRelationValid(data, { ...draft, versionId: 'review-v1' }), false);
  assert.equal(programReviewPublicRelationValid(data, { ...draft, itemId: 'review-old-item' }), false);
  assert.equal(programReviewPublicRelationValid(data, { ...draft, flowId: 'review-flow' }), false);
  assert.equal(programReviewPublicRelationValid(data, { ...draft, flowId: 'review-flow', versionId: 'review-v1' }), true);
  assert.equal(draft.flowId, null); assert.equal(draft.versionId, null); assert.equal(draft.itemId, null);
});

test('RR06 an explicit historical version/item stays exact while cross-version or unavailable relations reject', () => {
  const { data } = fixture(), draft = selectedReview(), before = JSON.stringify(draft);
  assert.equal(data.public.flows[0].currentVersionId, 'review-v2');
  assert.equal(programReviewPublicRelationValid(data, draft), true);
  assert.equal(programReviewPublicRelationValid(data, { ...draft, versionId: 'review-v2' }), false);
  assert.equal(programReviewPublicRelationValid(data, { ...draft, itemId: 'review-new-item' }), false);
  assert.equal(programReviewPublicRelationValid(data, { ...draft, flowId: 'different-flow' }), false);
  const archived = programClone(data); archived.public.flows[0].archived = true;
  assert.equal(programReviewPublicRelationValid(archived, draft), false);
  assert.equal(JSON.stringify(draft), before);
});

test('RR07 saving and posting a review preserves private raw/progress and unrelated drafts; a consumed draft cannot be resubmitted', () => {
  const { data, origin } = fixture(), original = JSON.stringify(data);
  const privateText = programClone(data.spaces[origin.actorId].text);
  const question = { ...newProgramParticipationDraft(), title: '기존 질문 초안', body: '덮어쓰면 안 되는 별도 입력' };
  const parked = success(saveProgramParticipationDraft(data, origin.actorId, question, { expected: null }));
  const draft = selectedReview();
  const saved = success(saveProgramParticipationDraft(parked.data, origin.actorId, draft, { expected: null }));
  assert.deepEqual(saved.data.spaces[origin.actorId].text, privateText);
  const posted = success(submitProgramParticipation(saved.data, origin.actorId, draft, now, { expected: draft }));
  const post = posted.data.public.posts.find(entry => entry.id === posted.result)!;
  assert.equal(post.kind, 'experience');
  assert.equal(post.flowId, draft.flowId); assert.equal(post.versionId, 'review-v1'); assert.equal(post.itemId, 'review-old-item');
  assert.equal(post.body, draft.body);
  assert.equal(JSON.stringify(posted.data.public).includes(privateNote), false);
  assert.equal(JSON.stringify(posted.data.public).includes(origin.documentId), false);
  assert.deepEqual(posted.data.spaces[origin.actorId].text, privateText);
  assert.deepEqual(posted.data.spaces[origin.actorId].participationDrafts, [question]);
  assert.equal(programReviewOriginReason(posted.data, origin), null);
  failure(submitProgramParticipation(posted.data, origin.actorId, draft, now, { expected: draft }), posted.data, 'conflict');
  assert.equal(posted.data.public.posts.length, 1);
  assert.equal(JSON.stringify(data), original);
});

test('RR08 an invalid selected tuple leaves the saved review and private origin intact instead of retargeting on submit', () => {
  const { data, origin } = fixture();
  const draft = { ...selectedReview(), versionId: 'review-v2' };
  assert.equal(programReviewPublicRelationValid(data, draft), false);
  const saved = success(saveProgramParticipationDraft(data, origin.actorId, draft, { expected: null }));
  const before = JSON.stringify(saved.data);
  failure(submitProgramParticipation(saved.data, origin.actorId, draft, now, { expected: draft }), saved.data, 'missing');
  assert.equal(JSON.stringify(saved.data), before);
  assert.equal(saved.data.spaces[origin.actorId].participationDrafts[0].itemId, 'review-old-item');
  assert.equal(programReviewOriginReason(saved.data, origin), null);
});

test('RR09 a late submit of the old review cannot overwrite a newer private draft or publish its old confirmation', () => {
  const { data, origin } = fixture(), draft = selectedReview();
  const saved = success(saveProgramParticipationDraft(data, origin.actorId, draft, { expected: null }));
  const newer = { ...draft, body: '확인 뒤 다시 수정한 공개 초안', requestId: 'review-new-confirmation' };
  const updated = success(saveProgramParticipationDraft(saved.data, origin.actorId, newer, { expected: draft }));
  const before = JSON.stringify(updated.data);
  failure(submitProgramParticipation(updated.data, origin.actorId, draft, now, { expected: draft }), updated.data, 'conflict');
  assert.equal(JSON.stringify(updated.data), before);
  assert.deepEqual(updated.data.spaces[origin.actorId].participationDrafts, [newer]);
  assert.equal(updated.data.public.posts.length, 0);
  assert.equal(programReviewOriginReason(updated.data, origin), null);
});
