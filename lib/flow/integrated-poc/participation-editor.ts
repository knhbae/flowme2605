import { programClone, programFailure, programId, programResult, type ProgramData, type ProgramParticipationDraft, type ProgramTransition } from './contract';
import { validateProgramData } from './program-data';
import { programSame } from './controller';
import { createProgramPost, createProgramReply, editProgramPost, editProgramReply } from './community';

export function newProgramParticipationDraft(kind: ProgramParticipationDraft['kind'] = 'question'): ProgramParticipationDraft {
  return { id: programId('participation'), kind, title: '', body: '', topic: '', postId: null,
    flowId: null, versionId: null, itemId: null, media: [], parentReplyId: null, editTargetId: null,
    expectedUpdatedAt: null, expectedContent: null, requestId: programId('request'), evidencePostIds: [], cursor: { start: 0, end: 0 } };
}
export function saveProgramParticipationDraft(data: ProgramData, actorId: string, draft: ProgramParticipationDraft,
  guard?: { expected: ProgramParticipationDraft | null }): ProgramTransition<string> {
  if (!data.actors.some(actor => actor.id === actorId) || !data.spaces[actorId]) return programFailure(data, 'forbidden');
  const previous = data.spaces[actorId].participationDrafts.find(entry => entry.id === draft.id) ?? null;
  if (guard && !programSame(previous, guard.expected)) return programFailure(data, 'conflict');
  const next = programClone(data), drafts = next.spaces[actorId].participationDrafts;
  const index = drafts.findIndex(entry => entry.id === draft.id);
  if (index >= 0) drafts[index] = programClone(draft); else drafts.push(programClone(draft));
  return validateProgramData(next) ? programResult(data, next, draft.id) : programFailure(data, 'invalid');
}
export function discardProgramParticipationDraft(data: ProgramData, actorId: string, draftId: string,
  guard?: { expected: ProgramParticipationDraft | null }): ProgramTransition<string> {
  if (!data.actors.some(actor => actor.id === actorId) || !data.spaces[actorId]) return programFailure(data, 'forbidden');
  if (guard && !programSame(data.spaces[actorId].participationDrafts.find(entry => entry.id === draftId) ?? null, guard.expected)) return programFailure(data, 'conflict');
  const next = programClone(data);
  next.spaces[actorId].participationDrafts = next.spaces[actorId].participationDrafts.filter(draft => draft.id !== draftId);
  return programResult(data, next, draftId);
}
/** Publication and removal of its private draft are one serialized transition. */
export function submitProgramParticipation(data: ProgramData, actorId: string, draft: ProgramParticipationDraft, now: string,
  guard?: { expected: ProgramParticipationDraft | null }): ProgramTransition<string> {
  if (guard && !programSame(data.spaces[actorId]?.participationDrafts.find(entry => entry.id === draft.id) ?? null, guard.expected)) return programFailure(data, 'conflict');
  let transition: ProgramTransition<string>;
  if (draft.kind === 'reply') {
    transition = draft.editTargetId ? editProgramReply(data, { actorId, replyId: draft.editTargetId, body: draft.body,
      expectedUpdatedAt: draft.expectedUpdatedAt ?? '', expectedContent: draft.expectedContent ?? '' }, now)
      : createProgramReply(data, { actorId, requestId: draft.requestId, postId: draft.postId ?? '', parentReplyId: draft.parentReplyId, body: draft.body }, now);
  } else {
    const fields = { title: draft.title, body: draft.body, topic: draft.topic, media: draft.media, evidencePostIds: draft.evidencePostIds };
    transition = draft.editTargetId ? editProgramPost(data, { actorId, postId: draft.editTargetId, ...fields,
      expectedUpdatedAt: draft.expectedUpdatedAt ?? '', expectedContent: draft.expectedContent ?? '' }, now)
      : createProgramPost(data, { actorId, requestId: draft.requestId, kind: draft.kind, flowId: draft.flowId,
        versionId: draft.versionId, itemId: draft.itemId, ...fields }, now);
  }
  if (!transition.ok) return transition;
  const removed = discardProgramParticipationDraft(transition.data, actorId, draft.id);
  if (!removed.ok) return programFailure(data, removed.reason);
  return validateProgramData(removed.data) ? programResult(data, removed.data, transition.result) : programFailure(data, 'invalid');
}
