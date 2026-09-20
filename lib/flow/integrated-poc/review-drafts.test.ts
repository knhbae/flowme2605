import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramController, programSame } from './controller';
import { createProgramProposal, programProposalReviewToken, publishProgramFlow, reviewProgramProposal } from './publication';
import { discardProgramProposalReviewDraft, readProgramProposalReviewDraft, saveProgramProposalReviewDraft, submitProgramProposalReviewDraft } from './review-drafts';
const actorId = 'local-user', now = '2026-09-12T10:00:00.000Z';
function ok<T>(result: ProgramTransition<T>) { if (!result.ok) assert.fail(result.reason); return result; }
function fixture() {
  const published = ok(publishProgramFlow(createProgramData(), { actorId, requestId: 'review-publish', title: '검토', summary: '검토 예시', category: '생활', situations: [],
    source: { kind: 'simulated-example', label: '예시', url: null, checkedAt: null }, items: [{ id: 'item-review', title: '준비', description: '기존', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }] }, now));
  const flow = published.data.public.flows.at(-1)!;
  const proposed = ok(createProgramProposal(published.data, { actorId: 'participant-jihun', requestId: 'review-propose', flowId: flow.id, baseVersionId: flow.currentVersionId, itemId: 'item-review', reason: '설명 보완', patch: { description: '추가 설명' } }, now));
  const proposalId = proposed.result, data = proposed.data;
  const draft = { note: '개인 의견\r\n  공백 보존', expectedProposalToken: programProposalReviewToken(data, proposalId)! };
  return { data, proposalId, draft, flow };
}
test('review draft saves exact private text, structural CAS, owner only and unchanged no-op', () => {
  const f = fixture(), before = JSON.stringify(f.data.public);
  const saved = ok(saveProgramProposalReviewDraft(f.data, { actorId, proposalId: f.proposalId, draft: f.draft, expected: null }));
  assert.equal(JSON.stringify(saved.data.public), before); assert(validateProgramData(saved.data));
  const reordered = { expectedProposalToken: f.draft.expectedProposalToken, note: f.draft.note };
  assert.equal(ok(saveProgramProposalReviewDraft(saved.data, { actorId, proposalId: f.proposalId, draft: f.draft, expected: reordered })).changed, false);
  for (const input of [{ actorId, expected: null }, { actorId: 'participant-jihun', expected: f.draft }]) {
    const result = saveProgramProposalReviewDraft(saved.data, { ...input, proposalId: f.proposalId, draft: { ...f.draft, note: 'overwrite' } });
    assert.equal(result.ok, false); assert.equal(result.data, saved.data);
  }
  assert.equal(discardProgramProposalReviewDraft(saved.data, { actorId, proposalId: f.proposalId, expected: null }).ok, false);
});
test('peer hold with unchanged version invalidates the review token and preserves private note atomically', () => {
  const f = fixture(), saved = ok(saveProgramProposalReviewDraft(f.data, { actorId, proposalId: f.proposalId, draft: f.draft, expected: null }));
  const peer = ok(reviewProgramProposal(saved.data, { actorId, proposalId: f.proposalId, expectedVersionId: f.flow.currentVersionId, decision: 'hold', note: '동료 보류' }, now));
  assert.equal(peer.data.public.flows.find(flow => flow.id === f.flow.id)!.currentVersionId, f.flow.currentVersionId);
  const rejected = submitProgramProposalReviewDraft(peer.data, { actorId, proposalId: f.proposalId, expectedVersionId: f.flow.currentVersionId, decision: 'accept', draft: f.draft }, now);
  assert.equal(rejected.ok, false); assert.equal(rejected.data, peer.data); assert.deepEqual(readProgramProposalReviewDraft(peer.data, actorId, f.proposalId), f.draft);
  const confirmed = { ...f.draft, expectedProposalToken: programProposalReviewToken(peer.data, f.proposalId)! };
  const renewed = ok(saveProgramProposalReviewDraft(peer.data, { actorId, proposalId: f.proposalId, draft: confirmed, expected: f.draft }));
  const accepted = ok(submitProgramProposalReviewDraft(renewed.data, { actorId, proposalId: f.proposalId, expectedVersionId: f.flow.currentVersionId, decision: 'accept', draft: confirmed }, now));
  assert.equal(readProgramProposalReviewDraft(accepted.data, actorId, f.proposalId), null);
  assert.equal(accepted.data.public.proposals.find(p => p.id === f.proposalId)!.reviewNote, f.draft.note.trim());
});
test('actual controller/store canonical roundtrip retains token; atomic review writes once; quota preserves state', async () => {
  const f = fixture(), values = new Map([['flow:operating', '  sentinel  ']]), writes: string[] = []; let quota = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { if (quota) throw new Error('quota'); writes.push(key); values.set(key, value); }, removeItem: (key: string) => values.delete(key) };
  const options = { initialData: f.data, storage, exclusive: async <T>(work: () => T | Promise<T>) => work() };
  const controller = createProgramController(options); assert(controller.ok);
  assert((await controller.mutate('save', data => saveProgramProposalReviewDraft(data, { actorId, proposalId: f.proposalId, draft: f.draft, expected: null }), { actorId, history: false })).ok);
  const reloaded = createProgramController(options); assert(reloaded.ok);
  const data = reloaded.snapshot().envelope.data;
  assert(programSame(readProgramProposalReviewDraft(data, actorId, f.proposalId), f.draft));
  assert.equal(programProposalReviewToken(data, f.proposalId), f.draft.expectedProposalToken);
  const before = values.get(PROGRAM_STATE_KEY), count = writes.length; quota = true;
  const submit = (current: typeof data) => submitProgramProposalReviewDraft(current, { actorId, proposalId: f.proposalId, expectedVersionId: f.flow.currentVersionId, decision: 'accept', draft: f.draft }, now);
  assert.equal((await reloaded.mutate('review', submit, { actorId })).ok, false); assert.equal(values.get(PROGRAM_STATE_KEY), before); assert.equal(writes.length, count);
  quota = false; assert((await reloaded.mutate('review', submit, { actorId })).ok); assert.equal(writes.length, count + 1);
  assert.equal(readProgramProposalReviewDraft(reloaded.snapshot().envelope.data, actorId, f.proposalId), null);
  assert.equal(values.get('flow:operating'), '  sentinel  '); assert(writes.every(key => key === PROGRAM_STATE_KEY));
});
