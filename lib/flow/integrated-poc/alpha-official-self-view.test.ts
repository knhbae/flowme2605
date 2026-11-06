import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramPublicRepository } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { alphaSocialReferences, readAlphaSocialResponse, type AlphaSocialContext } from './alpha-social/projection';
import { programFlowAttributionLabel } from './alpha-official-actors';

// All identities are synthetic. Real official identities are never fixtures.
const owner = '00000000-0000-4000-8000-000000000001';
const official = 'member-00000000-0000-4000-8000-000000000002';
const other = 'member-00000000-0000-4000-8000-000000000003';
function view(ownActorId: string) {
  const repository: ProgramPublicRepository = {
    flows: [{ id: 'synthetic-flow', ownerId: official, currentVersionId: 'synthetic-version', category: 'synthetic', situations: [], derivedFrom: null, archived: false }],
    versions: [{ id: 'synthetic-version', flowId: 'synthetic-flow', number: 1, parentVersionId: null, title: '합성 자료', summary: '',
      items: [{ id: 'synthetic-item', title: '합성 할 일', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }],
      source: { kind: 'user-text', label: '합성 출처', url: null, checkedAt: null }, createdBy: official, createdAt: '2026-11-06T00:00:00.000Z' }],
    posts: [], replies: [], reactions: [], proposals: [],
  };
  const context: AlphaSocialContext = { schema: 'flowme-alpha-social-context/1', revision: 0, ownActorId,
    actors: [{ id: official, name: '합성 작성자' }, { id: other, name: '합성 조회자' }], public: repository };
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0,
    source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const frame = { ok: true, value: { account, context } };
  assert.notEqual(readAlphaSocialResponse(frame, owner), null);
  const data = materializeAccount(account, alphaSocialReferences(context, owner)).data;
  return { data, account, frame };
}

test('the official author sees the same mark after the authenticated alias projection', () => {
  const { data, account } = view(official), before = JSON.stringify({ data, account });
  assert.equal(data.public.flows[0].ownerId, owner);
  assert.equal(programFlowAttributionLabel(data.public.flows[0], data.public.versions[0], [official], data), 'FlowMe가 정리한 자료');
  assert.equal(JSON.stringify({ data, account }), before);
});

test('another viewer sees the official public alias, while an unlisted self never receives the mark', () => {
  const { data } = view(other);
  assert.equal(data.public.flows[0].ownerId, official);
  assert.equal(programFlowAttributionLabel(data.public.flows[0], data.public.versions[0], [official], data), 'FlowMe가 정리한 자료');
  const self = view(official).data;
  assert.equal(programFlowAttributionLabel(self.public.flows[0], self.public.versions[0], [other], self), '사용자가 정리한 자료');
});

test('missing or changed view identity fails closed without guessing an absent alias', () => {
  const { data } = view(official), copy = structuredClone(data);
  assert.equal(programFlowAttributionLabel(copy.public.flows[0], copy.public.versions[0], [official], copy), '사용자가 정리한 자료');
  data.activeActorId = 'different-viewer';
  assert.equal(programFlowAttributionLabel(data.public.flows[0], data.public.versions[0], [official], data), '사용자가 정리한 자료');
});

test('a legacy source actor different from the authenticated account owner cannot borrow its official alias', () => {
  const { account, frame } = view(official);
  account.source.actorId = other;
  frame.value.context.public.flows[0].ownerId = other;
  frame.value.context.public.versions[0].createdBy = other;
  assert.notEqual(readAlphaSocialResponse(frame, owner), null);
  const data = materializeAccount(account, alphaSocialReferences(frame.value.context, owner)).data;
  assert.equal(data.activeActorId, other);
  assert.equal(programFlowAttributionLabel(data.public.flows[0], data.public.versions[0], [official], data), '사용자가 정리한 자료');
});
