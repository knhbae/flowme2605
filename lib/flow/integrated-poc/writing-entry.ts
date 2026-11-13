import { programClone, programFailure, programResult, type ProgramData, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { programDate, programIdentifier, validateProgramData } from './program-data';
import { createProgramDocument, type ProgramPrivateMutationBase } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';

export const PROGRAM_WRITING_ENTRY_TITLE = '작성한 글';

export type ProgramWritingEntryInput = ProgramPrivateMutationBase & {
  today: string;
  /** Only the document currently displayed by the caller, never a title lookup. */
  reuseDocumentId?: string;
};

/** W-TXT-10: seed only a newly created ordinary writing document. Never a reopen hook. */
export function programNewWritingRaw(today: string): string {
  return programDate(today) ? `[${today}]\n` : '';
}

/** Explicit writing entry over the existing document transition. Filing and Item
 * ownership remain unchanged; this does not introduce a new storage model or an
 * automatic first-entry selection policy. The caller owns input locks/navigation.
 */
export function createProgramWritingEntry(data: ProgramData, input: ProgramWritingEntryInput): ProgramTransition<string> {
  if (!validateProgramData(data) || !programIdentifier(input.requestId) || !programDate(input.today)
    || input.reuseDocumentId !== undefined && !programIdentifier(input.reuseDocumentId)) return programFailure(data, 'invalid');
  if (!Object.hasOwn(data.spaces, input.actorId)) return programFailure(data, 'forbidden');
  if (data.activeActorId !== input.actorId) return programFailure(data, 'conflict');

  const creation = { actorId: input.actorId, requestId: input.requestId, expectedSpace: input.expectedSpace,
    title: PROGRAM_WRITING_ENTRY_TITLE, folderId: 'folder-unfiled', raw: programNewWritingRaw(input.today) };
  // Reuse is a presentation hint, not a new create payload. An existing request
  // must replay its original result even after that document gains content.
  const receipt = data.receipts.find(row => row.actorId === input.actorId && row.id === input.requestId);
  if (receipt) {
    // A response can be lost across midnight. Replaying this creation must use
    // its original seed, even if the user later deleted the heading. The usual
    // transition still checks the whole fingerprint and kind, not just the ID.
    if (receipt.kind === 'private-document-create') try {
      const fields = JSON.parse(receipt.fingerprint);
      if (fields.title === creation.title && fields.folderId === creation.folderId && typeof fields.raw === 'string'
        && (fields.raw === '' || fields.raw === programNewWritingRaw(fields.raw.slice(1, 11)))) creation.raw = fields.raw;
    } catch { /* A malformed or different fingerprint remains a duplicate-request failure. */ }
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
  // Remember the position after the date heading in the same write. Reload
  // restores this ID; deleting the heading does not seed it again.
  const next = programClone(created.data);
  const start = creation.raw.length;
  next.spaces[input.actorId].position = { documentId: created.result, lineId: null, start, end: start, scrollTop: 0 };
  return programResult(data, next, created.result);
}
