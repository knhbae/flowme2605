import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_LIMITS, type ProgramData, type ProgramMedia, type ProgramTransition } from './contract';
import { createProgramPrivateSpace, validateProgramData } from './program-data';
import {
  createProgramPost, editProgramPost, deleteProgramPost, createProgramReply, editProgramReply,
  deleteProgramReply, toggleProgramReaction, listProgramActivity, programPostEditToken, programReplyEditToken,
} from './community';

const now = '2026-09-12T10:00:00.000Z', later = '2026-09-13T10:00:00.000Z';
function fixture(): ProgramData {
  return {
    actors: [{ id: 'a', name: '작성자', simulated: true }, { id: 'b', name: '참여자', simulated: true }],
    activeActorId: 'a', spaces: { a: createProgramPrivateSpace(), b: createProgramPrivateSpace() }, receipts: [],
    public: { posts: [], replies: [], reactions: [], proposals: [],
      flows: [{ id: 'flow', ownerId: 'a', currentVersionId: 'v2', category: '생활', situations: [], archived: false, derivedFrom: null }],
      versions: ['v1', 'v2'].map((id, index) => ({ id, flowId: 'flow', number: index + 1, parentVersionId: index ? 'v1' : null,
        title: '원본', summary: '', items: [{ id: index ? 'new-item' : 'old-item', title: '항목', description: '', completionCriteria: '',
          sourceUrl: null, schedule: { kind: 'undated' as const }, subchecks: [] }], source: { kind: 'simulated-example' as const, label: '예시', url: null, checkedAt: null },
        createdBy: 'a', createdAt: now })),
    },
  };
}
function ok<T>(result: ProgramTransition<T>) { if (!result.ok) assert.fail(result.reason); assert(validateProgramData(result.data)); return result; }
function failure<T>(result: ProgramTransition<T>, reason: string, before: ProgramData) {
  assert.equal(result.ok, false); if (result.ok) throw new Error('expected failure');
  assert.equal(result.reason, reason); assert.equal(result.data, before);
}
const postInput = (requestId = 'p1') => ({ actorId: 'a', requestId, kind: 'question' as const, title: '연결 없는 질문', body: '어떻게 정리하나요?', topic: '' });
const image: ProgramMedia = { id: 'photo', dataUrl: 'data:image/png;base64,iVBORw0KGgo=', alt: '선택 이미지', synthetic: false };

test('standalone posts persist independent kinds with only explicit public fields', () => {
  const before = fixture(), frozen = JSON.stringify(before);
  const input = { ...postInput(), privateNote: '비밀', progress: [10, 20], media: [{ ...image, localPath: 'C:/private.png' }] };
  const made = ok(createProgramPost(before, input, now));
  assert.equal(made.changed, true); assert.equal(JSON.stringify(before), frozen);
  const post = made.data.public.posts[0];
  assert.equal(post.flowId, null); assert.equal(post.versionId, null); assert.equal(post.itemId, null);
  assert(!JSON.stringify(post).includes('privateNote')); assert(!JSON.stringify(post).includes('private.png'));
  for (const kind of ['knowledge', 'experience'] as const) {
    assert(ok(createProgramPost(before, { ...postInput(), kind }, now)).data.public.posts.length === 1);
  }
});

test('unknown actors, blank/oversize text, invalid time and request are rejected without mutation', () => {
  const data = fixture();
  failure(createProgramPost(data, { ...postInput(), actorId: 'unknown' }, now), 'forbidden', data);
  for (const patch of [{ title: ' ' }, { body: '' }, { body: 'a'.repeat(PROGRAM_LIMITS.bodyChars + 1) }, { requestId: '' }, { topic: 'x'.repeat(121) }, { media: [{ ...image, alt: '' }] }, { media: Array.from({ length: 5 }, (_, i) => ({ ...image, id: `image-${i}` })) }]) {
    failure(createProgramPost(data, { ...postInput(), ...patch }, now), 'invalid', data);
  }
  failure(createProgramPost(data, postInput(), 'bad'), 'invalid', data);
  failure(createProgramPost(data, postInput(), '2026-09-12'), 'invalid', data);
  assert.deepEqual(listProgramActivity(data, 'unknown'), { posts: [], replies: [], reactions: [], receivedReplies: [], proposals: [], incomingProposals: [] });
});

test('fixed historical version/item association and public evidence are validated', () => {
  let data = fixture();
  const made = ok(createProgramPost(data, { ...postInput(), flowId: 'flow', versionId: 'v1', itemId: 'old-item' }, now));
  assert.equal(made.data.public.posts[0].versionId, 'v1');
  for (const patch of [{ flowId: 'flow' }, { versionId: 'v1' }, { flowId: 'flow', versionId: 'v2', itemId: 'old-item' }, { evidencePostIds: ['private-document'] }]) {
    failure(createProgramPost(data, { ...postInput(), ...patch }, now), 'missing', data);
  }
  data = made.data;
  const knowledge = ok(createProgramPost(data, { ...postInput('k'), kind: 'knowledge', evidencePostIds: [made.result, made.result] }, now));
  assert.deepEqual(knowledge.data.public.posts[1].evidencePostIds, [made.result]);
  data = ok(deleteProgramPost(data, 'a', made.result, later)).data;
  failure(createProgramPost(data, { ...postInput('k'), evidencePostIds: [made.result] }, later), 'missing', data);
  data.public.flows[0].archived = true;
  failure(createProgramPost(data, { ...postInput('archived'), flowId: 'flow', versionId: 'v1' }, later), 'missing', data);
});

test('request retries are actor scoped and reject changed payload or operation', () => {
  const first = ok(createProgramPost(fixture(), postInput(), now));
  const repeat = ok(createProgramPost(first.data, postInput(), later));
  assert.equal(repeat.changed, false); assert.equal(repeat.data, first.data); assert.equal(repeat.result, first.result);
  failure(createProgramPost(first.data, { ...postInput(), body: '변조' }, later), 'duplicate-request', first.data);
  failure(createProgramReply(first.data, { actorId: 'a', requestId: 'p1', postId: first.result, body: '답' }, later), 'duplicate-request', first.data);
  assert.equal(ok(createProgramPost(first.data, { ...postInput(), actorId: 'b' }, now)).data.public.posts.length, 2);
  const deleted = ok(deleteProgramPost(first.data, 'a', first.result, later));
  const retriedDeleted = ok(createProgramPost(deleted.data, postInput(), later));
  assert.equal(retriedDeleted.changed, false); assert.equal(retriedDeleted.data.public.posts[0].deleted, true);
});

test('post editing is owner only, no-op keeps identity/time, deletion preserves reply navigation', () => {
  const made = ok(createProgramPost(fixture(), { ...postInput(), media: [image] }, now));
  let data = made.data;
  failure(editProgramPost(data, { ...postInput(), actorId: 'b', postId: made.result }, later), 'forbidden', data);
  failure(deleteProgramPost(data, 'b', made.result, later), 'forbidden', data);
  const noop = ok(editProgramPost(data, { ...postInput(), postId: made.result }, later));
  assert.equal(noop.changed, false); assert.equal(noop.data, data); assert.equal(noop.data.public.posts[0].updatedAt, now);
  data = ok(editProgramPost(data, { ...postInput(), title: '바뀐 제목', postId: made.result }, later)).data;
  assert.equal(data.public.posts[0].id, made.result); assert.equal(data.public.posts[0].media.length, 1);
  const reply = ok(createProgramReply(data, { actorId: 'b', requestId: 'r1', postId: made.result, body: '내 답글' }, now));
  data = ok(deleteProgramPost(reply.data, 'a', made.result, later)).data;
  assert.equal(data.public.posts[0].title, '삭제된 글'); assert.equal(data.public.posts[0].body, ''); assert.deepEqual(data.public.posts[0].media, []);
  assert.equal(listProgramActivity(data, 'b').replies[0].postId, made.result);
  assert.equal(ok(deleteProgramPost(data, 'a', made.result, later)).changed, false);
  failure(editProgramPost(data, { ...postInput(), postId: made.result }, later), 'missing', data);
  failure(createProgramReply(data, { actorId: 'b', requestId: 'r2', postId: made.result, body: '추가' }, later), 'missing', data);
  failure(editProgramReply(data, { actorId: 'b', replyId: reply.result, body: '변경' }, later), 'missing', data);
  // Reply author can still remove their own personal content from a deleted thread.
  assert.equal(ok(deleteProgramReply(data, 'b', reply.result, later)).data.public.replies[0].deleted, true);
});

test('reply parent must be live and belong to the same post; nested relationships survive deletion', () => {
  const p1 = ok(createProgramPost(fixture(), postInput(), now));
  const p2 = ok(createProgramPost(p1.data, postInput('p2'), now));
  const replyInput = { actorId: 'b', requestId: 'r1', postId: p1.result, body: '답글' };
  const reply = ok(createProgramReply(p2.data, replyInput, now));
  assert.equal(ok(createProgramReply(reply.data, replyInput, later)).changed, false);
  failure(createProgramReply(reply.data, { ...replyInput, body: '바뀐 답글' }, now), 'duplicate-request', reply.data);
  failure(createProgramReply(reply.data, { ...replyInput, actorId: 'unknown' }, now), 'forbidden', reply.data);
  failure(createProgramReply(reply.data, { ...replyInput, requestId: 'cross', postId: p2.result, parentReplyId: reply.result }, now), 'missing', reply.data);
  const child = ok(createProgramReply(reply.data, { ...replyInput, requestId: 'child', parentReplyId: reply.result }, now));
  failure(editProgramReply(child.data, { actorId: 'a', replyId: reply.result, body: '변조' }, later), 'forbidden', child.data);
  failure(deleteProgramReply(child.data, 'a', reply.result, later), 'forbidden', child.data);
  assert.equal(ok(editProgramReply(child.data, { actorId: 'b', replyId: reply.result, body: '답글' }, later)).changed, false);
  const edited = ok(editProgramReply(child.data, { actorId: 'b', replyId: reply.result, body: '수정한 답글' }, later));
  assert.equal(edited.data.public.replies[0].updatedAt, later);
  const deleted = ok(deleteProgramReply(edited.data, 'b', reply.result, later));
  assert.equal(deleted.data.public.replies[0].body, ''); assert.equal(deleted.data.public.replies[1].parentReplyId, reply.result);
  assert.equal(ok(deleteProgramReply(deleted.data, 'b', reply.result, later)).changed, false);
  failure(createProgramReply(deleted.data, { ...replyInput, requestId: 'after', parentReplyId: reply.result }, later), 'missing', deleted.data);
});

test('reaction toggle is reversible, actor specific and rejects deleted targets', () => {
  const post = ok(createProgramPost(fixture(), postInput(), now));
  const reply = ok(createProgramReply(post.data, { actorId: 'b', requestId: 'r', postId: post.result, body: '답' }, now));
  let data = ok(toggleProgramReaction(reply.data, 'b', 'post', post.result)).data;
  data = ok(toggleProgramReaction(data, 'a', 'post', post.result)).data;
  assert.equal(data.public.reactions.length, 2);
  data = ok(toggleProgramReaction(data, 'b', 'post', post.result)).data;
  assert.equal(data.public.reactions.length, 1); assert.equal(data.public.reactions[0].actorId, 'a');
  data = ok(toggleProgramReaction(data, 'a', 'reply', reply.result)).data;
  assert.equal(listProgramActivity(data, 'a').reactions.length, 2);
  failure(toggleProgramReaction(data, 'unknown', 'reply', reply.result), 'forbidden', data);
  data = ok(deleteProgramReply(data, 'b', reply.result, later)).data;
  assert.equal(data.public.reactions.length, 1);
  failure(toggleProgramReaction(data, 'a', 'reply', reply.result), 'missing', data);
  data = ok(deleteProgramPost(data, 'a', post.result, later)).data;
  assert.equal(data.public.reactions.length, 0);
  failure(toggleProgramReaction(data, 'a', 'post', post.result), 'missing', data);
});

test('media rejects external, SVG, malformed, forged MIME and oversized payloads', () => {
  const data = fixture();
  const badUrls = ['https://example.com/photo.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,%%%%',
    'data:image/png;base64,YWJjZA==', `data:image/png;base64,${Buffer.alloc(PROGRAM_LIMITS.mediaBytes + 1).toString('base64')}`];
  for (const dataUrl of badUrls) failure(createProgramPost(data, { ...postInput(), media: [{ ...image, dataUrl }] }, now), 'invalid', data);
  for (const [mime, signature] of [['jpeg', '\xff\xd8\xff'], ['gif', 'GIF89a'], ['webp', 'RIFF0000WEBP']] as const) {
    const dataUrl = `data:image/${mime};base64,${Buffer.from(signature, 'binary').toString('base64')}`;
    assert.equal(ok(createProgramPost(data, { ...postInput(), media: [{ ...image, dataUrl }] }, now)).data.public.posts[0].media.length, 1);
  }
});

test('activity returns copied public entries in recency order and cannot mutate storage', () => {
  const p1 = ok(createProgramPost(fixture(), postInput(), now));
  const p2 = ok(createProgramPost(p1.data, postInput('second'), later));
  const list = listProgramActivity(p2.data, 'a');
  assert.deepEqual(list.posts.map(post => post.id), [p2.result, p1.result]);
  list.posts[0].body = '외부 수정';
  assert.notEqual(p2.data.public.posts[1].body, '외부 수정');
});

test('post and reply stale expectations reject a same-time competing edit', () => {
  const made = ok(createProgramPost(fixture(), postInput(), now)), original = made.data.public.posts[0];
  const changed = ok(editProgramPost(made.data, { ...postInput(), postId: made.result, title: '다른 탭 제목' }, now));
  failure(editProgramPost(changed.data, { ...postInput(), postId: made.result, body: '옛 폼 본문', expectedUpdatedAt: now,
    expectedContent: programPostEditToken(original) }, later), 'conflict', changed.data);
  const reply = ok(createProgramReply(changed.data, { actorId: 'b', requestId: 'reply-stale', postId: made.result, body: '첫 답변' }, now));
  const replyOriginal = reply.data.public.replies[0];
  const edited = ok(editProgramReply(reply.data, { actorId: 'b', replyId: reply.result, body: '다른 답변' }, now));
  failure(editProgramReply(edited.data, { actorId: 'b', replyId: reply.result, body: '옛 폼', expectedUpdatedAt: now,
    expectedContent: programReplyEditToken(replyOriginal) }, later), 'conflict', edited.data);
  assert.equal(ok(editProgramReply(edited.data, { actorId: 'b', replyId: reply.result, body: '다른 답변', expectedUpdatedAt: now,
    expectedContent: programReplyEditToken(replyOriginal) }, later)).changed, false);
});

test('knowledge author can remove deleted evidence or replace it with a live public post', () => {
  const source = ok(createProgramPost(fixture(), postInput(), now));
  const replacement = ok(createProgramPost(source.data, postInput('replacement'), now));
  const knowledge = ok(createProgramPost(replacement.data, { ...postInput('knowledge'), kind: 'knowledge', evidencePostIds: [source.result] }, now));
  const deleted = ok(deleteProgramPost(knowledge.data, 'a', source.result, later));
  const fields = { ...postInput(), postId: knowledge.result, evidencePostIds: [replacement.result] };
  const repaired = ok(editProgramPost(deleted.data, fields, later));
  assert.deepEqual(repaired.data.public.posts[2].evidencePostIds, [replacement.result]);
  failure(editProgramPost(repaired.data, { ...fields, evidencePostIds: [source.result] }, later), 'missing', repaired.data);
  failure(editProgramPost(repaired.data, { ...fields, evidencePostIds: [knowledge.result] }, later), 'missing', repaired.data);
  assert.deepEqual(ok(editProgramPost(repaired.data, { ...fields, evidencePostIds: [] }, later)).data.public.posts[2].evidencePostIds, []);
});

test('activity finds replies to own posts or own replies without double counting', () => {
  const post = ok(createProgramPost(fixture(), postInput(), now));
  const mine = ok(createProgramReply(post.data, { actorId: 'a', requestId: 'mine', postId: post.result, body: '내 추가 설명' }, now));
  const received = ok(createProgramReply(mine.data, { actorId: 'b', requestId: 'received', postId: post.result, parentReplyId: mine.result, body: '답변' }, later));
  assert.deepEqual(listProgramActivity(received.data, 'a').receivedReplies.map(reply => reply.id), [received.result]);
  assert.equal(listProgramActivity(received.data, 'b').receivedReplies.length, 0);
});
