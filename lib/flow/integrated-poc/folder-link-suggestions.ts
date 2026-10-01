import { programFolderLineTitle } from './folder-link-slot';
import type { TextWorkspaceState } from './text-workspace';

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
  const title = programFolderLineTitle(state, docId, lineId);
  return title === null ? [] : state.folders.filter(folder => folder.title === title)
    .map(folder => ({ id: folder.id, title: folder.title, path: programFolderPath(state, folder.id) }));
}
