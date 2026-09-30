import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

/** Only an unbound, childless list note can be explicitly converted in place.
 * Tasks, properties, references and existing scopes retain their original slot. */
export function programFolderLineTitle(state: TextWorkspaceState, docId: string, lineId: string | null): string | null {
  const row = M.rowMeta(state, docId).find(entry => entry.id === lineId);
  if (!row || row.kind !== 'note' || row.subtreeEndIndex !== row.index + 1 ||
      state.bindings.some(binding => binding.docId === docId && binding.lineId === lineId)) return null;
  const match = /^ *- +([^\r\n]+)$/.exec(row.text);
  return match?.[1].trim() || null;
}

export function prepareProgramFolderSlot(state: TextWorkspaceState, docId: string, lineId: string | null) {
  const doc = M.getDocument(state, docId);
  if (!doc) return null;
  const row = M.rowMeta(state, docId).find(entry => entry.id === lineId);
  if (row && (/^ *-\s*$/.test(row.text) || programFolderLineTitle(state, docId, lineId) !== null)) {
    // The transient blank never goes to a writer; the final scope keeps this ID.
    const lines = doc.lines.map(line => line.id === lineId ? { ...line, text: `${'  '.repeat(row.depth)}- ` } : line);
    const prepared = { ...state, documents: state.documents.map(entry => entry.id === docId ? { ...entry, lines } : entry) };
    return { state: prepared, index: row.index, lineId: row.id, inPlace: true };
  }
  const index = row?.subtreeEndIndex ?? doc.lines.length;
  const depth = row?.kind === 'scope' ? row.depth + 1 : row?.kind === 'date' ? 0 : row?.depth ?? 0;
  const lines = doc.lines.map(line => line.text);
  lines.splice(index, 0, `${'  '.repeat(depth)}- `);
  const prepared = M.editText(state, docId, lines.join('\n'));
  const inserted = M.getDocument(prepared, docId)?.lines[index];
  if (!inserted || !/^ *-\s*$/.test(inserted.text)) return null;
  return { state: prepared, index, lineId: inserted.id, inPlace: false };
}

export function linkProgramFolder(state: TextWorkspaceState, docId: string, lineId: string | null,
  target: { scopeId: string } | { title: string }): TextWorkspaceState {
  const slot = prepareProgramFolderSlot(state, docId, lineId);
  if (!slot) return state;
  const next = 'scopeId' in target ? M.attachScope(slot.state, docId, slot.index, target.scopeId) : M.createFolderAt(slot.state, docId, slot.index, target.title.trim());
  // Reject all preparation if the existing model refuses the folder operation.
  return next === slot.state || !M.validate(next) ? state : next;
}
