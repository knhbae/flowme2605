import { programFolderLineTitle } from './folder-link-slot';
import { textWorkspaceModel as M, type TextContext, type TextWorkspaceState } from './text-workspace';

export interface ProgramFolderInputSuggestion {
  lineId: string;
  title: string;
  folders: { id: string; title: string; path: string }[];
}

// Existing text-model.cjs validator limits, not additional folder policy.
const MODEL_MAX_FOLDER_COUNT = 100;
const MODEL_MAX_BINDING_COUNT = 5_000;

/** Inspect an explicit transition only; proposing a folder must not consume IDs. */
export function programFolderSuggestionPreservesSource(before: TextWorkspaceState, next: TextWorkspaceState): boolean {
  const sameLines = (left: TextWorkspaceState['documents'], right: TextWorkspaceState['documents']) =>
    left.length === right.length && left.every((doc, index) => {
      const other = right[index];
      return doc.id === other.id && doc.lines.length === other.lines.length
        && doc.lines.every((line, lineIndex) => line.id === other.lines[lineIndex].id && line.text === other.lines[lineIndex].text);
    });
  return sameLines(before.documents, next.documents) && sameLines(before.flows, next.flows);
}

/** Display only: IDs, rather than the displayed name/path, identify a choice. */
export function programFolderPath(state: TextWorkspaceState, folderId: string): string {
  const names: string[] = [], seen = new Set<string>();
  let id: string | null = folderId;
  while (id && !seen.has(id)) {
    seen.add(id);
    const folder = state.folders.find(entry => entry.id === id);
    if (!folder) break;
    names.unshift(folder.title); id = folder.parentId;
  }
  return names.join(' / ');
}

export function programFolderSuggestions(state: TextWorkspaceState, docId: string, lineId: string | null): { id: string; title: string; path: string }[] {
  return programFolderInputSuggestion(state, docId, lineId)?.folders ?? [];
}

function folderCreationLocation(state: TextWorkspaceState, depth: number, context: TextContext): string | null {
  if (!context.valid || depth > 0 && context.scopeKind !== 'folder') return null;
  const parentId = depth > 0 ? context.scopeId : null;
  let parent = state.folders.find(folder => folder.id === parentId), catalogDepth = 0;
  while (parent) { const nextId = parent.parentId; catalogDepth++; parent = state.folders.find(folder => folder.id === nextId); }
  return catalogDepth >= M.MAX_DEPTH ? null : parentId ? programFolderPath(state, parentId) : '최상위';
}

/** Display the same slot/parent used by explicit linkProgramFolder creation. */
export function programFolderCreationLocation(state: TextWorkspaceState, docId: string, lineId: string | null): string | null {
  const doc = M.getDocument(state, docId);
  if (!doc) return null;
  const row = M.rowMeta(state, docId).find(entry => entry.id === lineId);
  const inPlace = !!row && (/^ *-\s*$/.test(row.text) || programFolderLineTitle(state, docId, lineId) !== null);
  const index = inPlace ? row!.index : row?.subtreeEndIndex ?? doc.lines.length;
  const depth = inPlace ? row!.depth : row?.kind === 'scope' ? row.depth + 1 : row?.kind === 'date' ? 0 : row?.depth ?? 0;
  return folderCreationLocation(state, depth, M.insertionContext(state, docId, index, depth));
}

/** A proposal only: an unmatched name may open the existing creation panel. */
export function programFolderInputSuggestion(state: TextWorkspaceState, docId: string, lineId: string | null): ProgramFolderInputSuggestion | null {
  if (state.bindings.length >= MODEL_MAX_BINDING_COUNT) return null;
  const title = programFolderLineTitle(state, docId, lineId);
  if (title === null || lineId === null) return null;
  const row = M.rowMeta(state, docId).find(entry => entry.id === lineId);
  // attachScope serializes this spelling; other whitespace remains plain input.
  if (!row || row.text !== `${'  '.repeat(row.depth)}- ${title}`) return null;
  const context = M.insertionContext(state, docId, row.index, row.depth);
  if (!context.valid) return null;
  const matches = state.folders.filter(folder => folder.title === title);
  const folders = matches.filter(folder => !context.ancestorScopeIds.includes(folder.id))
    .map(folder => ({ id: folder.id, title: folder.title, path: programFolderPath(state, folder.id) }));
  if (matches.length) return folders.length ? { lineId, title, folders } : null;
  // Match createFolderAt's existing position/name/catalog limits without making
  // a speculative folder or consuming an ID merely to display a proposal.
  return state.folders.length >= MODEL_MAX_FOLDER_COUNT || title.length > 100
    || folderCreationLocation(state, row.depth, context) === null ? null : { lineId, title, folders };
}
