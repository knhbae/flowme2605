import { programFolderLineTitle } from './folder-link-slot';
import { programFolderCreationLocation, programFolderInputSuggestion, programFolderPath } from './folder-link-suggestions';
import { textWorkspaceModel as M, type TextRowKind, type TextWorkspaceState } from './text-workspace';

export type ProgramFolderLinkMode = 'direct' | 'proposal';
export type ProgramFolderLinkRelation = 'same-line' | 'after-line' | 'after-subtree' | 'inside-scope' | 'document-end';

export interface ProgramFolderLinkPreview {
  docId: string;
  lineId: string | null;
  mode: ProgramFolderLinkMode;
  source: { lineId: string; index: number; text: string; kind: TextRowKind; depth: number; subtreeEndIndex: number } | null;
  destination: {
    relation: ProgramFolderLinkRelation;
    index: number;
    depth: number;
    /** Same-line conversion retains this ID; a new ID exists only after explicit linking. */
    lineId: string | null;
    afterLineId: string | null;
    beforeLineId: string | null;
    parentLineId: string | null;
    scopeId: string | null;
    scopeKind: 'folder' | 'flow' | null;
    scopePath: string | null;
  };
  creationLocation: string | null;
  locationLabel: string;
  /** Ephemeral source/placement snapshot, never a saved model field. */
  selectionKey: string;
}

/** Inspect prepareProgramFolderSlot's existing placement without preparing a
 * blank, serializing source, consuming IDs, or creating a folder. */
export function programFolderLinkPreview(
  state: TextWorkspaceState, docId: string, lineId: string | null, mode: ProgramFolderLinkMode = 'direct',
): ProgramFolderLinkPreview | null {
  if (!M.validate(state)) return null;
  const doc = M.getDocument(state, docId);
  if (!doc) return null;
  const row = M.rowMeta(state, docId).find(entry => entry.id === lineId);
  // An explicit end-of-document choice is different from a disappeared row.
  if (lineId !== null && !row) return null;
  if (mode === 'proposal' && !programFolderInputSuggestion(state, docId, lineId)) return null;
  const inPlace = !!row && (/^ *-\s*$/.test(row.text) || programFolderLineTitle(state, docId, lineId) !== null);
  const index = inPlace ? row!.index : row?.subtreeEndIndex ?? doc.lines.length;
  const depth = inPlace ? row!.depth : row?.kind === 'scope' ? row.depth + 1 : row?.kind === 'date' ? 0 : row?.depth ?? 0;
  const context = M.insertionContext(state, docId, index, depth);
  if (!context.valid) return null;
  const relation: ProgramFolderLinkRelation = inPlace ? 'same-line' : !row ? 'document-end'
    : row.kind === 'scope' ? 'inside-scope'
      : row.subtreeEndIndex > row.index + 1 ? 'after-subtree' : 'after-line';
  const source = row ? { lineId: row.id, index: row.index, text: row.text, kind: row.kind, depth: row.depth, subtreeEndIndex: row.subtreeEndIndex } : null;
  const scope = M.scopes(state).find(entry => entry.id === context.scopeId);
  const destination = {
    relation, index, depth, lineId: inPlace ? row!.id : null,
    afterLineId: doc.lines[index - 1]?.id ?? null,
    beforeLineId: doc.lines[inPlace ? index + 1 : index]?.id ?? null,
    parentLineId: context.parentLineId, scopeId: context.scopeId, scopeKind: context.scopeKind,
    scopePath: scope?.kind === 'folder' ? programFolderPath(state, scope.id) : scope?.title ?? null,
  };
  const hasChildren = !!row && row.subtreeEndIndex > row.index + 1;
  const locationLabel = relation === 'same-line' ? `${index + 1}번째 현재 줄에서 연결`
    : relation === 'document-end' ? `문서 끝 ${index + 1}번째 줄에 연결`
      : relation === 'inside-scope' ? `${row!.scopeKind === 'folder' ? '폴더' : 'Flow'} 안${hasChildren ? ', 하위 묶음 뒤' : ''} ${index + 1}번째 줄에 연결`
        : relation === 'after-subtree' ? `하위 묶음 뒤 ${index + 1}번째 줄에 연결`
          : `현재 줄 바로 아래 ${index + 1}번째 줄에 연결`;
  const selectionKey = JSON.stringify({
    docId, lineId, mode, source, destination,
    document: { folderId: doc.folderId, lines: doc.lines },
    bindings: state.bindings.filter(binding => binding.docId === docId),
    scopes: M.scopes(state).map(({ id, title, kind, parentId }) => ({ id, title, kind, parentId })),
  });
  return { docId, lineId, mode, source, destination,
    creationLocation: programFolderCreationLocation(state, docId, lineId), locationLabel, selectionKey };
}

/** Recheck the captured selection immediately before linking. Never silently
 * adopt a different current row, subtree boundary, scope, or source revision. */
export function isProgramFolderLinkPreviewCurrent(state: TextWorkspaceState, preview: ProgramFolderLinkPreview | null | undefined): boolean {
  if (!preview) return false;
  return programFolderLinkPreview(state, preview.docId, preview.lineId, preview.mode)?.selectionKey === preview.selectionKey;
}
