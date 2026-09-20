import assert from 'node:assert/strict';
import test from 'node:test';
import { type ProgramData, type ProgramPublicItem, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramPost } from './community';
import {
  publishProgramFlow, createProgramProposal, reviewProgramProposal, archiveProgramPublicFlow,
  type PublishProgramFlowInput,
} from './publication';

const now = '2026-09-12T10:00:00.000Z', later = '2026-09-13T10:00:00.000Z';
const owner = 'local-user', contributor = 'participant-jihun';
const item = (): ProgramPublicItem => ({ id: 'stable-item', title: '준비하기', description: '공개 설명', completionCriteria: '준비 확인',
  sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [{ id: 'sub', title: '내용' }] });
function input(requestId = 'publish-1'): PublishProgramFlowInput {
  return { actorId: owner, requestId, title: '경험 Flow', summary: '공개 요약', category: '생활', situations: ['처음'], items: [item()],
    source: { kind: 'simulated-example', label: '가상 예시', url: null, checkedAt: null } };
}
function ok<T>(transition: ProgramTransition<T>) {
  if (!transition.ok) assert.fail(transition.reason);
  assert(validateProgramData(transition.data)); return transition;
}
function fail<T>(transition: ProgramTransition<T>, data: ProgramData, reason: string) {
  assert.equal(transition.ok, false); if (transition.ok) throw new Error('expected failure');
  assert.equal(transition.reason, reason); assert.equal(transition.data, data); assert(validateProgramData(data));
}
function published() {
  const first = ok(publishProgramFlow(createProgramData(), input(), now));
  return { ...first, flowId: first.data.public.flows[0].id };
}
function proposalInput(flowId: string, baseVersionId: string, requestId = 'proposal-1') {
  return { actorId: contributor, requestId, flowId, baseVersionId, itemId: 'stable-item', reason: '이 조건을 보충합니다', patch: { description: '보충된 설명' } };
}

test('publication whitelists every public layer and never copies private execution fields', () => {
  const data = createProgramData(), before = JSON.stringify(data);
  const payload = { ...input(), privateMemo: '비공개 메모', executionDate: '2026-12-24', progress: 80,
    items: [{ ...item(), privateMemo: '비공개 메모', date: '2026-12-24', progressRecords: [{ percent: 80 }],
      schedule: { kind: 'undated' as const, privateDate: '2026-12-24' }, subchecks: [{ id: 'sub', title: '내용', privateMemo: '비밀' }] }],
    source: { ...input().source, localPath: 'C:/private.txt' } };
  const created = ok(publishProgramFlow(data, payload, now));
  assert.equal(JSON.stringify(data), before); assert.equal(created.data.public.flows[0].ownerId, owner);
  const publicJson = JSON.stringify(created.data.public);
  for (const secret of ['비공개', '2026-12-24', 'progressRecords', 'privateDate', 'C:/private.txt']) assert(!publicJson.includes(secret));
  assert.deepEqual(created.data.spaces, data.spaces);
  assert.equal(created.data.public.versions[0].items[0].id, 'stable-item');
});

test('owner updates append immutable versions with stable IDs, expected revision and source origin', () => {
  const first = published(), old = JSON.stringify(first.data.public.versions[0]);
  const update = { ...input('update'), flowId: first.flowId, expectedVersionId: first.result, title: '수정한 Flow', items: [{ ...item(), title: '준비 확인' }] };
  fail(publishProgramFlow(first.data, { ...update, actorId: contributor }, later), first.data, 'forbidden');
  fail(publishProgramFlow(first.data, { ...update, expectedVersionId: 'stale' }, later), first.data, 'conflict');
  fail(publishProgramFlow(first.data, { ...update, source: { ...input().source, kind: 'repository-source' } }, later), first.data, 'conflict');
  const second = ok(publishProgramFlow(first.data, update, later));
  assert.equal(JSON.stringify(second.data.public.versions[0]), old);
  assert.equal(second.data.public.versions[1].number, 2); assert.equal(second.data.public.versions[1].parentVersionId, first.result);
  assert.equal(second.data.public.versions[1].items[0].id, 'stable-item');
  assert.equal(second.data.public.flows[0].currentVersionId, second.result);
});

test('publication retries cannot duplicate versions or change request payload', () => {
  const first = published();
  assert.equal(ok(publishProgramFlow(first.data, input(), later)).changed, false);
  fail(publishProgramFlow(first.data, { ...input(), title: '다른 요청' }, later), first.data, 'duplicate-request');
  fail(createProgramProposal(first.data, { ...proposalInput(first.flowId, first.result), actorId: owner, requestId: 'publish-1' }, later), first.data, 'duplicate-request');
});

test('new derivatives refer to an actual fixed source version and cannot later retarget origin', () => {
  const original = published();
  const derivative = { ...input('derived'), actorId: contributor, derivedFrom: { flowId: original.flowId, versionId: original.result } };
  const made = ok(publishProgramFlow(original.data, derivative, now));
  assert.deepEqual(made.data.public.flows[1].derivedFrom, derivative.derivedFrom);
  fail(publishProgramFlow(original.data, { ...derivative, derivedFrom: { flowId: 'not-source', versionId: original.result } }, now), original.data, 'missing');
  fail(publishProgramFlow(made.data, { ...input('retarget'), actorId: contributor, flowId: made.data.public.flows[1].id, expectedVersionId: made.result, derivedFrom: null }, later), made.data, 'conflict');
});

test('invalid payload, duplicate IDs, secret URL and empty proposals fail without a write', () => {
  const first = published();
  for (const patch of [{ actorId: 'unknown' }, { items: [] }, { items: [item(), item()] }, { category: '' },
    { source: { ...input().source, url: 'https://example.com/?token=secret' } }]) {
    fail(publishProgramFlow(first.data, { ...input('invalid'), ...patch }, now), first.data, patch.actorId ? 'forbidden' : 'invalid');
  }
  const draft = proposalInput(first.flowId, first.result), snapshot = JSON.stringify(first.data);
  for (const patch of [{ patch: {} }, { reason: '' }, { patch: { description: item().description } }, { patch: { progress: 50 } }]) {
    fail(createProgramProposal(first.data, { ...draft, ...patch } as typeof draft, now), first.data, 'invalid');
  }
  fail(createProgramProposal(first.data, { ...draft, baseVersionId: 'missing' }, now), first.data, 'missing');
  fail(createProgramProposal(first.data, { ...draft, itemId: 'missing' }, now), first.data, 'missing');
  assert.equal(JSON.stringify(first.data), snapshot); assert.equal(first.data.public.proposals.length, 0);
});

test('historical item proposal merges only its selected fields into latest version', () => {
  const first = published();
  const changedTitle = ok(publishProgramFlow(first.data, { ...input('update'), flowId: first.flowId, expectedVersionId: first.result,
    items: [{ ...item(), title: '최신 제목' }] }, later));
  const proposed = ok(createProgramProposal(changedTitle.data, proposalInput(first.flowId, first.result), later));
  const beforeSpaces = JSON.stringify(proposed.data.spaces), beforeVersions = JSON.stringify(proposed.data.public.versions);
  const accepted = ok(reviewProgramProposal(proposed.data, { actorId: owner, proposalId: proposed.result, decision: 'accept', expectedVersionId: changedTitle.result }, later));
  assert.equal(accepted.data.public.versions.length, 3);
  const newest = accepted.data.public.versions[2];
  assert.equal(newest.items[0].title, '최신 제목'); assert.equal(newest.items[0].description, '보충된 설명');
  assert.equal(newest.parentVersionId, changedTitle.result); assert.equal(newest.number, 3);
  assert.equal(JSON.stringify(accepted.data.public.versions.slice(0, 2)), beforeVersions);
  assert.equal(JSON.stringify(accepted.data.spaces), beforeSpaces);
  assert.equal(accepted.data.public.proposals[0].resultVersionId, accepted.result);
  const repeated = ok(reviewProgramProposal(accepted.data, { actorId: owner, proposalId: proposed.result, decision: 'accept', expectedVersionId: changedTitle.result }, later));
  assert.equal(repeated.changed, false); assert.equal(repeated.result, accepted.result); assert.equal(repeated.data.public.versions.length, 3);
});

test('changed target field and stale current revision conflict atomically', () => {
  const first = published(), proposal = ok(createProgramProposal(first.data, proposalInput(first.flowId, first.result), now));
  const edited = ok(publishProgramFlow(proposal.data, { ...input('changed'), flowId: first.flowId, expectedVersionId: first.result,
    items: [{ ...item(), description: '작성자가 바꾼 설명' }] }, later));
  const review = { actorId: owner, proposalId: proposal.result, decision: 'accept' as const, expectedVersionId: edited.result };
  const before = JSON.stringify(edited.data);
  fail(reviewProgramProposal(edited.data, review, later), edited.data, 'conflict');
  fail(reviewProgramProposal(edited.data, { ...review, expectedVersionId: first.result }, later), edited.data, 'conflict');
  assert.equal(JSON.stringify(edited.data), before); assert.equal(edited.data.public.proposals[0].status, 'submitted');
});

test('proposal retries are stable and a removed current item cannot be resurrected by acceptance', () => {
  const first = published(), request = proposalInput(first.flowId, first.result);
  const proposed = ok(createProgramProposal(first.data, request, now));
  const replayed = ok(createProgramProposal(proposed.data, request, later));
  assert.equal(replayed.changed, false); assert.equal(replayed.result, proposed.result);
  fail(createProgramProposal(proposed.data, { ...request, patch: { description: '변조된 내용' } }, later), proposed.data, 'duplicate-request');
  const removed = ok(publishProgramFlow(proposed.data, { ...input('removed'), flowId: first.flowId, expectedVersionId: first.result,
    items: [{ ...item(), id: 'new-independent-item' }] }, later));
  fail(reviewProgramProposal(removed.data, { actorId: owner, proposalId: proposed.result, decision: 'accept', expectedVersionId: removed.result }, later), removed.data, 'conflict');
});

test('selected schedule patch changes public plan only while other fields remain intact', () => {
  const first = published();
  const proposed = ok(createProgramProposal(first.data, { ...proposalInput(first.flowId, first.result),
    patch: { schedule: { kind: 'relative', days: -2 } } }, now));
  const accepted = ok(reviewProgramProposal(proposed.data, { actorId: owner, proposalId: proposed.result, decision: 'accept', expectedVersionId: first.result }, later));
  assert.deepEqual(accepted.data.public.versions[1].items[0], { ...item(), schedule: { kind: 'relative', days: -2 } });
  assert.deepEqual(accepted.data.spaces, first.data.spaces);
});

test('hold is revisitable, only owner reviews, rejected proposal is terminal', () => {
  const first = published(), proposal = ok(createProgramProposal(first.data, proposalInput(first.flowId, first.result), now));
  const review = { actorId: owner, proposalId: proposal.result, decision: 'hold' as const, expectedVersionId: first.result, note: '추가 확인' };
  fail(reviewProgramProposal(proposal.data, { ...review, actorId: contributor }, later), proposal.data, 'forbidden');
  const held = ok(reviewProgramProposal(proposal.data, review, later));
  assert.equal(held.data.public.proposals[0].status, 'held');
  assert.equal(ok(reviewProgramProposal(held.data, review, later)).changed, false);
  assert.equal(ok(reviewProgramProposal(held.data, { ...review, decision: 'accept' }, later)).data.public.proposals[0].status, 'accepted');
  const rejected = ok(reviewProgramProposal(held.data, { ...review, decision: 'reject' }, later));
  assert.equal(rejected.data.public.proposals[0].status, 'rejected');
  fail(reviewProgramProposal(rejected.data, { ...review, decision: 'accept' }, later), rejected.data, 'conflict');
});

test('archive keeps fixed versions, posts and personal spaces, forbids further publication', () => {
  const first = published();
  const post = ok(createProgramPost(first.data, { actorId: contributor, requestId: 'post', kind: 'experience', title: '사용 경험', body: '일부만 사용', topic: '', flowId: first.flowId, versionId: first.result }, now));
  fail(archiveProgramPublicFlow(post.data, contributor, first.flowId), post.data, 'forbidden');
  const archived = ok(archiveProgramPublicFlow(post.data, owner, first.flowId));
  assert.equal(archived.data.public.flows[0].archived, true);
  assert.deepEqual(archived.data.public.versions, post.data.public.versions); assert.deepEqual(archived.data.public.posts, post.data.public.posts);
  assert.deepEqual(archived.data.spaces, post.data.spaces); assert.equal(ok(archiveProgramPublicFlow(archived.data, owner, first.flowId)).changed, false);
  fail(publishProgramFlow(archived.data, { ...input('after'), flowId: first.flowId, expectedVersionId: first.result }, later), archived.data, 'missing');
});
