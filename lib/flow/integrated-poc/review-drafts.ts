import { programClone, programFailure, programResult, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { programIdentifier, validateProgramData } from './program-data';
import { reviewProgramProposal, type ReviewProgramProposalInput } from './publication';

export interface ProgramProposalReviewDraft { note: string; expectedProposalToken: string }
type ReviewSpace = ProgramPrivateSpace & { proposalReviewDrafts?: Record<string, ProgramProposalReviewDraft> };
export const readProgramProposalReviewDraft = (data: ProgramData, actorId: string, proposalId: string): ProgramProposalReviewDraft | null =>
  (data.spaces[actorId] as ReviewSpace | undefined)?.proposalReviewDrafts?.[proposalId] ?? null;
function owner(data: ProgramData, actorId: string, proposalId: string) {
  const proposal = data.public.proposals.find(entry => entry.id === proposalId);
  return data.activeActorId === actorId && !!data.spaces[actorId] && !!proposal && data.public.flows.some(flow => flow.id === proposal.flowId && flow.ownerId === actorId);
}
export function saveProgramProposalReviewDraft(data: ProgramData, input: { actorId: string; proposalId: string; draft: ProgramProposalReviewDraft; expected: ProgramProposalReviewDraft | null }): ProgramTransition<string> {
  if (!validateProgramData(data) || !programIdentifier(input.proposalId) || typeof input.draft?.note !== 'string' || input.draft.note.length > 10000 ||
    typeof input.draft.expectedProposalToken !== 'string' || !input.draft.expectedProposalToken || input.draft.expectedProposalToken.length > 120000 || Object.keys(input.draft).sort().join(',') !== 'expectedProposalToken,note') return programFailure(data, 'invalid');
  if (!owner(data, input.actorId, input.proposalId)) return programFailure(data, 'forbidden');
  const prior = readProgramProposalReviewDraft(data, input.actorId, input.proposalId);
  if (!programSame(prior, input.expected)) return programFailure(data, 'conflict');
  if (programSame(prior, input.draft)) return { ok: true, changed: false, data, result: input.proposalId };
  const next = programClone(data), space = next.spaces[input.actorId] as ReviewSpace;
  space.proposalReviewDrafts = { ...space.proposalReviewDrafts, [input.proposalId]: programClone(input.draft) };
  return validateProgramData(next) ? programResult(data, next, input.proposalId) : programFailure(data, 'invalid');
}
export function discardProgramProposalReviewDraft(data: ProgramData, input: { actorId: string; proposalId: string; expected: ProgramProposalReviewDraft | null }): ProgramTransition<string> {
  if (!owner(data, input.actorId, input.proposalId)) return programFailure(data, 'forbidden');
  if (!programSame(readProgramProposalReviewDraft(data, input.actorId, input.proposalId), input.expected)) return programFailure(data, 'conflict');
  if (!input.expected) return { ok: true, data, changed: false, result: input.proposalId };
  const next = programClone(data), space = next.spaces[input.actorId] as ReviewSpace;
  delete space.proposalReviewDrafts?.[input.proposalId];
  return validateProgramData(next) ? programResult(data, next, input.proposalId) : programFailure(data, 'invalid');
}
/** Publish exactly the saved note, then remove only that draft in one owner transaction. */
export function submitProgramProposalReviewDraft(data: ProgramData, input: Omit<ReviewProgramProposalInput, 'note' | 'expectedProposalToken'> & { draft: ProgramProposalReviewDraft }, now: string): ProgramTransition<string> {
  if (!owner(data, input.actorId, input.proposalId)) return programFailure(data, 'forbidden');
  if (!programSame(readProgramProposalReviewDraft(data, input.actorId, input.proposalId), input.draft)) return programFailure(data, 'conflict');
  const reviewed = reviewProgramProposal(data, { ...input, note: input.draft.note, expectedProposalToken: input.draft.expectedProposalToken }, now);
  if (!reviewed.ok) return reviewed;
  const removed = discardProgramProposalReviewDraft(reviewed.data, { actorId: input.actorId, proposalId: input.proposalId, expected: input.draft });
  return removed.ok ? programResult(data, removed.data, reviewed.result) : programFailure(data, removed.reason);
}
