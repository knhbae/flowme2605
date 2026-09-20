import type { ProgramData, ProgramPrivateSpace, ProgramTransition } from './contract';
import { programFailure } from './contract';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';

export function programDocumentDisposition(space: ProgramPrivateSpace, documentId: string) {
  return !M.getDocument(space.text, documentId) ? 'missing' : space.documentTrash?.[documentId] ? 'trashed'
    : space.archivedDocumentIds.includes(documentId) ? 'archived' : 'active';
}

/** No permanent deletion: public versions, backlinks, source bindings and private history survive. */
export function setProgramDocumentTrashed(data: ProgramData, input: ProgramPrivateMutationBase & {
  documentId: string; trashed: boolean; now: string;
}): ProgramTransition<string> {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  return transitionProgramPrivateSpace(data, input, 'private-document-trash', { documentId: input.documentId, trashed: input.trashed, now: input.now }, space => {
    const result = input.documentId;
    if (typeof input.trashed !== 'boolean' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(input.now) || !Number.isFinite(Date.parse(input.now))) return { result, reason: 'invalid' };
    if (!M.getDocument(space.text, result)) return { result, reason: 'missing' };
    if (Object.values(space.retentionDocuments ?? {}).includes(result)) return { result, reason: 'forbidden' };
    const prior = space.documentTrash?.[result];
    if (!!prior === input.trashed) return { result };
    if (input.trashed) {
      space.documentTrash ??= {};
      space.documentTrash[result] = { trashedAt: input.now, wasArchived: space.archivedDocumentIds.includes(result) };
      if (!space.archivedDocumentIds.includes(result)) space.archivedDocumentIds.push(result);
    } else {
      delete space.documentTrash![result];
      if (!prior!.wasArchived) space.archivedDocumentIds = space.archivedDocumentIds.filter(id => id !== result);
    }
    return { result };
  });
}
