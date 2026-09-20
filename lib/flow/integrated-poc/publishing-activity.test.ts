import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { createProgramPost, createProgramReply, deleteProgramReply } from './community';
import { publishProgramFlow } from './publication';
import { programClone, type ProgramTransition } from './contract';
import { programPostFlowDestination, programReplyDestination, readProgramPublishingActivity } from './publishing-activity';

const actorId = 'local-user', otherId = 'participant-jihun', now = '2026-09-12T12:00:00.000Z';
function ok<T>(result: ProgramTransition<T>) { assert(result.ok); assert(validateProgramData(result.data)); return result; }
function fixture() {
  const initial = createProgramData();
  const document = ok(createProgramDocument(initial, { actorId, requestId: 'doc', expectedSpace: initial.spaces[actorId], title: '개인 원문', raw: '비공개 메모입니다.' }));
  const first = ok(publishProgramFlow(document.data, { actorId, requestId: 'flow', title: '공개 제목', summary: '공개 소개', category: '생활', situations: [],
    source: { kind: 'user-text', label: '직접 작성', url: null, checkedAt: null },
    items: [{ id: 'stable-item', title: '첫 항목', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] }, now));
  const flow = first.data.public.flows.find(flow => flow.currentVersionId === first.result)!;
  const data = programClone(first.data), space = data.spaces[actorId];
  space.publications.push({ flowId: flow.id, documentId: document.result, creatorDraftId: null });
  space.publicationDrafts.push({ id: 'public-draft', documentId: document.result, requestId: 'draft-request', flowId: flow.id,
    expectedVersionId: first.result, sourceDocumentFingerprint: '{}', title: '작성 중인 공개 제목', summary: '외부에 보이면 안 되는 초안 본문', category: '생활', situationsText: '',
    sourceKind: 'user-text', sourceLabel: '개인 작성', sourceUrl: '', derivedFrom: null, rows: [], updatedAt: now });
  assert(validateProgramData(data));
  return { data, documentId: document.result, flowId: flow.id, versionId: first.result };
}

test('publishing activity uses exact private bindings and whitelists summaries without mutating input', () => {
  const base = fixture(), before = JSON.stringify(base.data), result = readProgramPublishingActivity(base.data, actorId);
  assert.deepEqual(result.flows[0].documents, [{ id: base.documentId, title: '개인 원문', archived: false, canEditPublication: true }]);
  assert.equal(result.flows[0].versionId, base.versionId); assert.equal(result.drafts[0].document?.id, base.documentId);
  assert.doesNotMatch(JSON.stringify(result), /비공개 메모|초안 본문|sourceDocumentFingerprint|requestId/);
  assert.equal(JSON.stringify(base.data), before);
});

test('a document retained for another publication cannot open the wrong Flow editor', () => {
  const base = fixture();
  const another = ok(publishProgramFlow(base.data, { actorId, requestId: 'another-flow', title: '다른 공개 Flow', summary: '', category: '생활', situations: [],
    source: { kind: 'user-text', label: '직접 작성', url: null, checkedAt: null },
    items: [{ id: 'another-item', title: '확인', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] }, now));
  const otherFlow = another.data.public.versions.find(version => version.id === another.result)!.flowId;
  another.data.spaces[actorId].publications.push({ flowId: otherFlow, documentId: base.documentId, creatorDraftId: null });
  assert(validateProgramData(another.data));
  const activity = readProgramPublishingActivity(another.data, actorId);
  assert.equal(activity.flows.find(flow => flow.id === base.flowId)?.documents[0].canEditPublication, true);
  assert.equal(activity.flows.find(flow => flow.id === otherFlow)?.documents[0].canEditPublication, false);
});

test('unknown and inactive actors cannot enumerate another private publishing activity', () => {
  const { data } = fixture();
  assert.deepEqual(readProgramPublishingActivity(data, otherId), { flows: [], drafts: [] });
  assert.deepEqual(readProgramPublishingActivity(data, 'unknown'), { flows: [], drafts: [] });
  const switched = programClone(data); switched.activeActorId = otherId;
  assert.deepEqual(readProgramPublishingActivity(switched, otherId), { flows: [], drafts: [] });
});

test('archives stay visible with non-editable document state and no invented replacement link', () => {
  const base = fixture();
  base.data.spaces[actorId].archivedDocumentIds.push(base.documentId); base.data.public.flows[0].archived = true;
  assert(validateProgramData(base.data));
  const result = readProgramPublishingActivity(base.data, actorId);
  assert.equal(result.flows[0].archived, true); assert.equal(result.flows[0].documents[0].archived, true);
  assert.equal(result.drafts[0].flowArchived, true); assert.equal(result.drafts[0].document?.archived, true);
  base.data.spaces[actorId].publications = [];
  assert.deepEqual(readProgramPublishingActivity(base.data, actorId).flows[0].documents, []);
});

test('old-version post keeps its fixed version and item after a newer publication', () => {
  const base = fixture();
  const post = ok(createProgramPost(base.data, { actorId, requestId: 'post', title: '예전 경험', kind: 'experience', body: '첫 판본 경험', topic: '',
    flowId: base.flowId, versionId: base.versionId, itemId: 'stable-item' }, now));
  const latest = ok(publishProgramFlow(post.data, { actorId, requestId: 'second', flowId: base.flowId, expectedVersionId: base.versionId,
    title: '새 공개 제목', summary: '', category: '생활', situations: [], source: { kind: 'user-text', label: '직접 작성', url: null, checkedAt: null },
    items: [{ id: 'stable-item', title: '바뀐 항목', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] }, now));
  assert.deepEqual(programPostFlowDestination(latest.data, latest.data.public.posts[0]), { view: 'flow', id: base.flowId, versionId: base.versionId, itemId: 'stable-item' });
  assert.equal(programPostFlowDestination(latest.data, { ...latest.data.public.posts[0], itemId: 'missing' }), null);
  assert.equal(programPostFlowDestination(latest.data, { ...latest.data.public.posts[0], versionId: null }), null);
});

test('reply navigation retains exact and deleted targets, rejects mismatched post parents', () => {
  const base = fixture();
  const post = ok(createProgramPost(base.data, { actorId, requestId: 'post', title: '질문', kind: 'question', body: '질문 내용', topic: '' }, now));
  const reply = ok(createProgramReply(post.data, { actorId: otherId, requestId: 'reply', postId: post.result, body: '답변' }, now));
  assert.deepEqual(programReplyDestination(reply.data, post.result, reply.result), { view: 'community', id: post.result, replyId: reply.result });
  const removed = ok(deleteProgramReply(reply.data, otherId, reply.result, now));
  assert.deepEqual(programReplyDestination(removed.data, post.result, reply.result), { view: 'community', id: post.result, replyId: reply.result });
  assert.equal(programReplyDestination(removed.data, 'different-post', reply.result), null);
});
