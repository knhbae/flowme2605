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

/** Read placement without preparing text or allocating a line/folder ID. */
export function readProgramFolderSlot(state: TextWorkspaceState, docId: string, lineId: string | null) {
  const doc = M.getDocument(state, docId);
  if (!doc) return null;
  const row = M.rowMeta(state, docId).find(entry => entry.id === lineId);
  if (lineId !== null && !row) return null;
  const inPlace = !!row && row.subtreeEndIndex === row.index + 1
    && (/^ *-\s*$/.test(row.text) || programFolderLineTitle(state, docId, lineId) !== null);
  const index = inPlace ? row!.index : row?.subtreeEndIndex ?? doc.lines.length;
  const depth = inPlace ? row!.depth : row?.kind === 'scope' ? row.depth + 1 : row?.kind === 'date' ? 0 : row?.depth ?? 0;
  return { doc, row, index, depth, inPlace };
}

type FolderLinkProblem = { code: string; message: string };

/** Read placement once for the whole menu; never try mutations while rendering. */
export function programFolderLinkProblems(state: TextWorkspaceState, docId: string, lineId: string | null): Map<string, FolderLinkProblem | null> {
  const slot = readProgramFolderSlot(state, docId, lineId);
  const context = slot && M.insertionContext(state, docId, slot.index, slot.depth);
  return new Map(state.folders.map(scope => {
    let problem: FolderLinkProblem | null = null;
    if (!slot || !context?.valid) problem = { code: 'invalid-position', message: '이 위치에는 폴더를 연결할 수 없습니다.' };
    else if (context.ancestorScopeIds.includes(scope.id)) problem = { code: 'ancestor-folder', message: '이미 이 위치를 포함하는 폴더라 다시 연결할 수 없습니다.' };
    else {
      // Lexical scope serialization only: no records, other documents, generated IDs or writes.
      const probeId = '__program-folder-title-probe__';
      const probe = { ...slot.doc, lines: [{ id: probeId, text: `- ${scope.title}` }] };
      const analysis = M.parseDocument(probe, { ...state, folders: [scope], flows: [], taskScopes: {}, itemScopes: {}, progressRecords: [],
        bindings: [{ kind: 'scope', docId, lineId: probeId, scopeId: scope.id }] });
      if (analysis.rows[0]?.kind !== 'scope' || analysis.issues.some(issue => issue.blocking)) {
        problem = { code: 'title-syntax', message: '폴더 이름이 TXT 문법과 겹쳐 연결할 수 없습니다. 폴더 이름을 확인해 주세요.' };
      }
    }
    return [scope.id, problem];
  }));
}

export function programFolderLinkProblem(state: TextWorkspaceState, docId: string, lineId: string | null, scopeId: string): FolderLinkProblem | null {
  return programFolderLinkProblems(state, docId, lineId).get(scopeId)
    ?? (state.folders.some(folder => folder.id === scopeId) ? null : { code: 'missing-folder', message: '이 폴더가 없어졌습니다. 닫고 다시 선택해 주세요.' });
}

export function prepareProgramFolderSlot(state: TextWorkspaceState, docId: string, lineId: string | null) {
  const slot = readProgramFolderSlot(state, docId, lineId);
  if (!slot) return null;
  const { doc, row, index, depth, inPlace } = slot;
  if (inPlace && row) {
    // The transient blank never goes to a writer; the final scope keeps this ID.
    const lines = doc.lines.map(line => line.id === lineId ? { ...line, text: `${'  '.repeat(row.depth)}- ` } : line);
    const prepared = { ...state, documents: state.documents.map(entry => entry.id === docId ? { ...entry, lines } : entry) };
    return { state: prepared, index: row.index, lineId: row.id, inPlace: true };
  }
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
