import { programSame } from './controller';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

/** Explicit private row permutation: no reparsing-generated identities or source edits. */
export function applyProgramLinePermutation(state: TextWorkspaceState, documentId: string, lineIds: readonly string[]): TextWorkspaceState | null {
  if (!M.validate(state)) return null;
  const doc = M.getDocument(state, documentId);
  if (!doc || lineIds.length !== doc.lines.length || new Set(lineIds).size !== lineIds.length) return null;
  const byId = new Map(doc.lines.map(line => [line.id, line]));
  if (lineIds.some(id => !byId.has(id))) return null;
  if (lineIds.every((id, index) => id === doc.lines[index].id)) return state;
  const next = { ...state,
    documents: state.documents.map(entry => entry.id === documentId ? { ...entry, lines: lineIds.map(id => byId.get(id)!) } : entry),
    flows: state.flows.map(entry => entry.id === documentId ? { ...entry, lines: lineIds.map(id => byId.get(id)!) } : entry) };
  if (!M.validate(next)) return null;
  const facts = (value: TextWorkspaceState) => [...value.documents, ...value.flows].flatMap(entry => {
    const parsed = M.parseDocument(entry, value);
    return parsed.items.map(({ sourceIndex: _index, ...item }) => item);
  }).sort((a, b) => a.id.localeCompare(b.id));
  // Preserve owned child/property/note order, not only the flattened item facts.
  // Blank separator slots intentionally remain outside movable bodies (K4-W).
  const children = (value: TextWorkspaceState) => [...value.documents, ...value.flows].flatMap(entry => {
    const groups = new Map<string, string[]>();
    for (const row of M.parseDocument(entry, value).rows) if (row.kind !== 'blank' && row.parentLineId) {
      groups.set(row.parentLineId, [...(groups.get(row.parentLineId) ?? []), row.id]);
    }
    return [...groups].map(([parentId, lineIds]) => ({ parentId, lineIds }));
  }).sort((a, b) => a.parentId.localeCompare(b.parentId));
  return programSame(facts(state), facts(next)) && programSame(children(state), children(next)) ? next : null;
}

/** In-memory bridge for genuine browser history events, never an alternate Undo writer. */
export function createProgramPermutationHistory(documentId: string) {
  const entries: { before: TextWorkspaceState; after: TextWorkspaceState }[] = [];
  return {
    hasEntries: () => entries.length > 0,
    record(before: TextWorkspaceState, after: TextWorkspaceState) {
      const doc = M.getDocument(after, documentId);
      if (!doc || !programSame(applyProgramLinePermutation(before, documentId, doc.lines.map(line => line.id)), after)) return false;
      entries.push({ before, after }); return true;
    },
    resolve(current: TextWorkspaceState, raw: string, type: string): TextWorkspaceState | null {
      if (type !== 'historyUndo' && type !== 'historyRedo') return null;
      for (const entry of entries.slice().reverse()) {
        const from = type === 'historyUndo' ? entry.after : entry.before;
        const to = type === 'historyUndo' ? entry.before : entry.after;
        if (programSame(M.getDocument(current, documentId), M.getDocument(from, documentId)) && raw === M.raw(M.getDocument(to, documentId))) {
          return applyProgramLinePermutation(current, documentId, M.getDocument(to, documentId)!.lines.map(line => line.id));
        }
      }
      return null;
    },
    can(current: TextWorkspaceState, type: 'historyUndo' | 'historyRedo') {
      return entries.some(entry => programSame(M.getDocument(current, documentId), M.getDocument(type === 'historyUndo' ? entry.after : entry.before, documentId)));
    },
    clear() { entries.length = 0; },
  };
}
