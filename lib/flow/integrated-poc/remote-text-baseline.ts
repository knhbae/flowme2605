import { canonicalJson } from './alpha-persistence/json';
import type { ProgramData, ProgramPrivateSpace } from './contract';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// What a text save writes besides the text itself.
const TEXT_SAVE_FIELDS: readonly string[] = ['text', 'position', 'timelineOrders'];

/** A read brought another device's save while this tab still holds unsaved document input.
 * It may become the new baseline only when each typed document, its rows and the folders are
 * untouched and nothing outside the private text changed. The typed input then saves through
 * the per-document merge (text-merge) against it. A change to a typed document stays protected. */
export function remoteTextSparesDocuments(before: ProgramData, next: ProgramData, ownerId: string, documentIds: readonly string[]): boolean {
  try {
    if (!documentIds.length || before.activeActorId !== ownerId || next.activeActorId !== ownerId) return false;
    const was = before.spaces[ownerId], now = next.spaces[ownerId];
    if (!was || !now || !M.validate(was.text) || !M.validate(now.text)) return false;
    if (canonicalJson(before.actors) !== canonicalJson(next.actors) || canonicalJson(before.public) !== canonicalJson(next.public)) return false;
    const rest = (space: ProgramPrivateSpace) => canonicalJson(Object.fromEntries(Object.entries(space)
      .filter(([key, value]) => !TEXT_SAVE_FIELDS.includes(key) && value !== undefined)));
    if (rest(was) !== rest(now) || canonicalJson(was.text.folders) !== canonicalJson(now.text.folders)) return false;
    return documentIds.every(id => {
      const typed = documentFootprint(was.text, id);
      return typed !== null && typed === documentFootprint(now.text, id);
    });
  } catch { return false; }
}

/** The document and the rows keyed to its lines: bindings, progress records and scopes. */
function documentFootprint(text: TextWorkspaceState, id: string): string | null {
  const doc = M.getDocument(text, id);
  if (!doc) return null;
  const lines = new Set(doc.lines.map(line => line.id));
  const own = (record: Record<string, string>) => Object.fromEntries(Object.entries(record).filter(([key]) => lines.has(key)));
  return canonicalJson({ doc, bindings: text.bindings.filter(row => row.docId === id || lines.has(row.lineId)),
    progress: text.progressRecords.filter(row => lines.has(row.taskId)), taskScopes: own(text.taskScopes), itemScopes: own(text.itemScopes) });
}
