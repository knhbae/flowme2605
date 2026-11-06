import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProgramData, ProgramPost, ProgramTransition } from './contract';
import { createProgramData, createProgramEnvelope, validateProgramData } from './program-data';
import { importProgramPublicVersion } from './private-space';
import { listProgramActivity } from './community';
import { programFlowReviews } from './flow-loop';
import { ALPHA_DEPARTED_ACTOR_NAME, alphaSocialReferences, isAlphaSocialContext, readAlphaSocialResponse, type AlphaSocialContext } from './alpha-social/projection';
import { executeAlphaSocialIntent } from './alpha-social/dispatch';
import { detached } from './alpha-persistence/json';
import { captureAlphaAccount, materializeAccount } from './alpha-persistence/program-adapter';
import { PRIVACY_NOTICE_DELETION } from './privacy-notice';

// R6 (11/6, 사용자 결정 '남김'): an account's public Flows and posts stay when the account is deleted. Once its public
// identity is gone, the public rows name an alias no actor carries; every read checks that graph and refused it.
const OWNER = '11111111-1111-4111-8111-111111111111', OWNER_ALIAS = `member-${OWNER}`;
const GONE = 'member-22222222-2222-4222-8222-222222222222', NOW = '2026-11-06T00:00:00.000Z';
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const post = (id: string, authorId: string, flowId: string | null, title: string): ProgramPost => ({ id, authorId, kind: 'experience', title, body: '두 주 해 봤어요.', topic: '',
  flowId, versionId: flowId && `${flowId}-v1`, itemId: null, evidencePostIds: [], media: [], createdAt: NOW, updatedAt: NOW, deleted: false });

/** OWNER took a Flow of the departed author and posted a review on it; the departed author posted too and reacted. */
function seed() {
  let data = createProgramData();
  data.actors = [{ id: OWNER, name: '합성 소유자', simulated: true }, { id: GONE, name: '합성 작성자', simulated: true }];
  data.spaces = { [OWNER]: data.spaces['local-user'], [GONE]: data.spaces['creator-minji'] };
  data.activeActorId = OWNER;
  for (const id of ['flow-a', 'flow-b']) {
    data.public.flows.push({ id, ownerId: GONE, currentVersionId: `${id}-v1`, category: '생활', situations: [], derivedFrom: null, archived: false });
    data.public.versions.push({ id: `${id}-v1`, flowId: id, number: 1, parentVersionId: null, title: `지운 작성자의 Flow ${id}`, summary: '',
      source: { kind: 'user-text', label: '직접 작성한 내용', url: null, checkedAt: null }, createdBy: GONE, createdAt: NOW,
      items: [{ id: 'item', title: '할 일 하나', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] });
  }
  data.public.posts.push(post('post-gone', GONE, 'flow-a', '작성자가 남긴 글'), post('post-mine', OWNER, 'flow-a', '해 봤어요 · 지운 작성자의 Flow'));
  data.public.reactions.push({ actorId: GONE, targetKind: 'post', targetId: 'post-mine' });
  data = ok(importProgramPublicVersion(data, { actorId: OWNER, requestId: 'r6-import', expectedSpace: data.spaces[OWNER], versionId: 'flow-a-v1', itemIds: ['item'], anchor: null })).data;
  assert(validateProgramData(data), 'the seed is valid while the author is there');
  const { account } = captureAlphaAccount(createProgramEnvelope(data), OWNER, OWNER);
  const publicRows = detached(data.public);
  for (const row of publicRows.posts) if (row.authorId === OWNER) row.authorId = OWNER_ALIAS;
  // The server's read after the deletion: the public rows as they were, the departed author's identity gone.
  const context: AlphaSocialContext = { schema: 'flowme-alpha-social-context/1', revision: 9, ownActorId: OWNER_ALIAS,
    actors: [{ id: OWNER_ALIAS, name: 'FlowMe 참여자' }], public: publicRows };
  return { account, context };
}

test('R6: a public Flow, post and reaction of a deleted author no longer fail the read, for the client and the server', () => {
  const { account, context } = seed();
  assert.equal(isAlphaSocialContext(context, { server: true }), false, 'the graph check alone refuses it (the failure before)');
  for (const server of [false, true]) {
    const read = readAlphaSocialResponse({ ok: true, value: { account, context } }, OWNER, { server });
    assert(read, server ? 'server read' : 'client read');
    assert.deepEqual(read.context.actors, [{ id: OWNER_ALIAS, name: 'FlowMe 참여자' }, { id: GONE, name: ALPHA_DEPARTED_ACTOR_NAME }]);
    assert.deepEqual(read.context.public, context.public, 'the public rows are read as they are');
  }
  // What the screens read: the detail's 관련 이야기, 이야기 and 내 활동 name the author as every author is shown.
  const read = readAlphaSocialResponse({ ok: true, value: { account, context } }, OWNER)!;
  const references = alphaSocialReferences(read.context, OWNER), data = materializeAccount(read.account, references).data;
  assert(validateProgramData(data));
  const nameOf = (id: string) => data.actors.find(actor => actor.id === id)?.name;
  assert.equal(nameOf(data.public.posts.find(row => row.id === 'post-gone')!.authorId), 'FlowMe 참여자');
  assert.equal(nameOf(data.public.flows[0].ownerId), 'FlowMe 참여자');
  const activity = listProgramActivity(data, OWNER);
  assert.deepEqual(activity.posts.map(row => row.id), ['post-mine'], '내 활동: my review on the departed author\'s Flow');
  assert.equal(programFlowReviews(data, OWNER).posts.length, 0, 'none of my Flows: nothing to list there, and no throw');
  // The server runs commands against it: taking another of its Flows, reacting to its post.
  const taken = executeAlphaSocialIntent(data, OWNER, { type: 'copy-import', versionId: 'flow-b-v1', itemIds: ['item'], anchor: null }, 'r6-take', NOW);
  assert(taken.ok && taken.changed, 'copy-import of a departed author\'s Flow');
  const reacted = executeAlphaSocialIntent(data, OWNER, { type: 'reaction-set', targetKind: 'post', targetId: 'post-gone', desired: true }, 'r6-react', NOW);
  assert(reacted.ok && reacted.changed, 'a reaction on a departed author\'s post');
});

test('R6: only well-formed aliases the public rows name are added; a missing own identity or a malformed id still fails', () => {
  const { account, context } = seed();
  const malformed = detached(context); malformed.public.posts[0].authorId = 'not-an-alias';
  assert.equal(readAlphaSocialResponse({ ok: true, value: { account, context: malformed } }, OWNER, { server: true }), null);
  const noSelf = detached(context); noSelf.actors = [{ id: 'member-33333333-3333-4333-8333-333333333333', name: 'FlowMe 참여자' }];
  assert.equal(readAlphaSocialResponse({ ok: true, value: { account, context: noSelf } }, OWNER, { server: true }), null);
  // With the identity still there nothing is added (and nothing changes).
  const kept = detached(context); kept.actors.push({ id: GONE, name: 'FlowMe 참여자' });
  assert.deepEqual(readAlphaSocialResponse({ ok: true, value: { account, context: kept } }, OWNER, { server: true })!.context, kept);
});

test('R6 wording: the notice, the publisher and the post preview say public things stay when the account goes', () => {
  assert.equal(PRIVACY_NOTICE_DELETION[1], '계정을 지워도 공개한 글과 Flow는 남습니다. 내리려면 먼저 공개를 철회하세요.');
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  assert(read('components/flow/integrated-poc/ProgramPublisher.tsx').includes("'개발계의 다른 사용자에게 선택한 내용을 공개합니다. 계정을 지워도 공개한 Flow는 남습니다.'"));
  assert(read('components/flow/integrated-poc/ProgramCommunity.tsx').includes("'확인한 내용만 개발계의 다른 사용자에게 공개합니다. 작성 중인 다른 초안은 공개하지 않습니다. 계정을 지워도 공개한 글은 남습니다.'"));
});
