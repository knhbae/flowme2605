import { programClone, programFailure, programResult, type ProgramData, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { programIdentifier, validateProgramData } from './program-data';
import { createProgramDocument, type ProgramPrivateMutationBase } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';

export const PROGRAM_WRITING_ENTRY_TITLE = '작성한 글';

export type ProgramWritingEntryInput = ProgramPrivateMutationBase & {
  /** Only the document currently displayed by the caller, never a title lookup. */
  reuseDocumentId?: string;
};

/** Explicit writing entry over the existing document transition. Filing and Item
 * ownership remain unchanged; this does not introduce a new storage model or an
 * automatic first-entry selection policy. The caller owns input locks/navigation.
 */
export function createProgramWritingEntry(data: ProgramData, input: ProgramWritingEntryInput): ProgramTransition<string> {
  if (!validateProgramData(data) || !programIdentifier(input.requestId)
    || input.reuseDocumentId !== undefined && !programIdentifier(input.reuseDocumentId)) return programFailure(data, 'invalid');
  if (!Object.hasOwn(data.spaces, input.actorId)) return programFailure(data, 'forbidden');
  if (data.activeActorId !== input.actorId) return programFailure(data, 'conflict');

  const creation = { actorId: input.actorId, requestId: input.requestId, expectedSpace: input.expectedSpace,
    title: PROGRAM_WRITING_ENTRY_TITLE, folderId: 'folder-unfiled', raw: '' };
  // Reuse is a presentation hint, not a new create payload. An existing request
  // must replay its original result even after that document gains content.
  if (data.receipts.some(receipt => receipt.actorId === input.actorId && receipt.id === input.requestId)) {
    return createProgramDocument(data, creation);
  }

  const space = data.spaces[input.actorId];
  if (!programSame(input.expectedSpace, space)) return programFailure(data, 'conflict');
  const current = space.text.documents.find(doc => doc.id === input.reuseDocumentId);
  if (current && !M.raw(current).trim()
    && !space.archivedDocumentIds.includes(current.id) && !space.documentTrash?.[current.id]
    && !Object.hasOwn(space.retentionDocuments ?? {}, current.id)
    && !Object.values(space.retentionDocuments ?? {}).includes(current.id)
    && !space.savedBindings.some(binding => binding.documentId === current.id)
    && !space.copies.some(copy => copy.documentId === current.id)) {
    // An already remembered entry preserves its native selection as well.
    if (space.position.documentId === current.id) return programResult(data, data, current.id);
    const next = programClone(data);
    next.spaces[input.actorId].position = { documentId: current.id, lineId: null, start: 0, end: 0, scrollTop: 0 };
    return programResult(data, next, current.id);
  }
  const created = createProgramDocument(data, creation);
  if (!created.ok || !created.changed) return created;
  // Remember this explicit entry in the same write, including an empty first
  // document. Reload then restores its exact ID without creating a fallback.
  const next = programClone(created.data);
  next.spaces[input.actorId].position = { documentId: created.result, lineId: null, start: 0, end: 0, scrollTop: 0 };
  return programResult(data, next, created.result);
}
