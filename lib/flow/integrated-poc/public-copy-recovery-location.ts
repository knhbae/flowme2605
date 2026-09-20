import type { ProgramPrivateSpace } from './contract';
import type { ProgramOccurrenceIdentity } from './recurrence-state-contract';
import { validateProgramPublicCopyOccurrenceIdentity } from './public-copy-recurrence';

type Location = { visibleDocumentIds: string[]; documentId?: string; lineId?: string };

/** Resolve retained private ownership, not the latest public schedule. A source
 * may be unavailable while its exact private canonical row remains readable.
 * Reference documents expose the same recovery; the action opens the canonical
 * source row, never a guessed task with the same title or occurrence number. */
export function readProgramPublicCopyRecoveryLocation(space: ProgramPrivateSpace, source: ProgramOccurrenceIdentity): Location | null {
  try {
    if (!validateProgramPublicCopyOccurrenceIdentity(source)) return null;
    const owner = source.publicOwner!, copies = space.copies.filter(copy => copy.id === owner.copyId);
    if (copies.length !== 1 || copies[0].flowId !== owner.flowId) return null;
    const copy = copies[0], docs = [...space.text.documents, ...space.text.flows];
    const uniqueDocument = (id: string) => docs.filter(doc => doc.id === id).length === 1;
    const locations = (lineId: string) => docs.flatMap(doc => doc.lines.filter(line => line.id === lineId).map(() => doc.id));
    const visible = new Set<string>(uniqueDocument(copy.documentId) ? [copy.documentId] : []);
    const unresolved = (): Location => ({ visibleDocumentIds: [...visible] });
    const lineId = copy.kindHandoffs?.items[owner.itemId]?.recurring.lineId ?? copy.itemLines[owner.itemId];
    if (!lineId || space.copies.filter(row => Object.values(row.itemLines).includes(lineId)
      || Object.values(row.kindHandoffs?.items ?? {}).some(pair => pair.recurring.lineId === lineId)).length !== 1) return unresolved();
    const matches = locations(lineId);
    if (matches.length !== 1 || !uniqueDocument(matches[0])) return unresolved();
    visible.add(matches[0]);
    for (const ref of copy.recurrence?.references ?? []) {
      if (ref.itemId !== owner.itemId || !uniqueDocument(ref.documentId) || ref.lineId === lineId) continue;
      const positions = locations(ref.lineId);
      if (positions.length !== 1 || positions[0] !== ref.documentId
        || space.copies.some(row => Object.values(row.itemLines).includes(ref.lineId))
        || space.copies.flatMap(row => row.recurrence?.references ?? []).filter(row => row.lineId === ref.lineId).length !== 1
        || space.text.bindings.some(row => row.lineId === ref.lineId)) continue;
      visible.add(ref.documentId);
    }
    return { visibleDocumentIds: [...visible], documentId: matches[0], lineId };
  } catch { return null; }
}
