import type { ProgramPrivateSpace } from './contract';
import { programDate } from './program-data';
import { programExecutionTasks, programShiftDate } from './execution';
import { readProgramFolderRegions } from './folder-document-regions';
import { PROGRAM_RECENT_WRITING } from './recent-writing';
import type { TextRow, TextTask } from './text-workspace';

/** F4-a (11/9, PRD 2판 5절): the 폴더 tab. Its first screen is the folder tree with each folder's open tasks (a parent counts
 *  its subfolders'); a folder opens one screen of two tabs, [할 일] (every document's open tasks of the folder, by
 *  지난·오늘·앞으로·미정, the finished ones folded) and [글] (each document's part of the folder, the most recent one open).
 *  Presentation only: nothing here is saved, and the text and its folders stay as they are. */

/** Over this many folders the list gets a find field and folds subfolders (A6). */
export const PROGRAM_FOLDER_SEARCH_OVER = 12;
/** A folded parent with more children than this shows the ones with the most open tasks, then '하위 n개 더'. */
export const PROGRAM_FOLDER_CHILDREN_SHOWN = 3;
export const PROGRAM_UNFILED_FOLDER = 'folder-unfiled';

export interface ProgramFolderTreeRow {
  id: string; title: string; parentId: string | null; depth: number;
  /** Open tasks of this folder and its subfolders. */
  open: number;
  /** Direct subfolders. */
  children: number;
}

/** The folder a task counts in, as the 분류 view filters it (a Flow's tasks by the Flow's folder). */
export function programTaskFolderId(space: ProgramPrivateSpace, task: Pick<TextTask, 'scopeId' | 'folderId'>): string {
  return space.text.flows.find(doc => doc.id === task.scopeId)?.folderId ?? task.folderId;
}

/** A folder and its ancestors, the folder itself last; a cycle stops it. */
export function programFolderAncestry(space: ProgramPrivateSpace, folderId: string): { id: string; title: string }[] {
  const chain: { id: string; title: string }[] = [], seen = new Set<string>();
  let id: string | null | undefined = folderId;
  while (id && !seen.has(id)) {
    seen.add(id);
    const folder = space.text.folders.find(row => row.id === id);
    if (!folder) break;
    chain.unshift({ id: folder.id, title: folder.title }); id = folder.parentId;
  }
  return chain;
}

/** The tree in reading order (each parent, then its subfolders), 미분류 last; `all` is every open task. */
export function programFolderTree(space: ProgramPrivateSpace, isOpen: (task: TextTask) => boolean): { all: number; rows: ProgramFolderTreeRow[] } {
  const folders = space.text.folders, known = new Set(folders.map(folder => folder.id));
  const counts = new Map<string, number>();
  let all = 0;
  for (const task of programExecutionTasks(space)) {
    if (!isOpen(task)) continue;
    all += 1;
    for (const { id } of programFolderAncestry(space, programTaskFolderId(space, task))) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const rows: ProgramFolderTreeRow[] = [], placed = new Set<string>();
  const childrenOf = (parentId: string | null) => folders.filter(folder => folder.id !== PROGRAM_UNFILED_FOLDER
    && (parentId === null ? !folder.parentId || !known.has(folder.parentId) || folder.parentId === folder.id : folder.parentId === parentId));
  const visit = (parentId: string | null, depth: number) => {
    for (const folder of childrenOf(parentId)) {
      if (placed.has(folder.id)) continue;
      placed.add(folder.id);
      rows.push({ id: folder.id, title: folder.title, parentId: depth ? parentId : null, depth, open: counts.get(folder.id) ?? 0, children: childrenOf(folder.id).length });
      visit(folder.id, depth + 1);
    }
  };
  visit(null, 0);
  // A folder only a cycle reaches is still listed, at the top level.
  for (const folder of folders) if (folder.id !== PROGRAM_UNFILED_FOLDER && !placed.has(folder.id)) {
    placed.add(folder.id); rows.push({ id: folder.id, title: folder.title, parentId: null, depth: 0, open: counts.get(folder.id) ?? 0, children: 0 });
  }
  const unfiled = folders.find(folder => folder.id === PROGRAM_UNFILED_FOLDER);
  if (unfiled) rows.push({ id: unfiled.id, title: unfiled.title, parentId: null, depth: 0, open: counts.get(unfiled.id) ?? 0, children: 0 });
  return { all, rows };
}

/** A6: the rows the list shows. A find (not while composing; the caller passes the settled words) keeps the matching
 *  folders and their parents, all open. In a long list (`many`) a parent stays folded unless it is in `open`; an open
 *  parent with more than three subfolders shows the two with the most open tasks, then '하위 n개 더' (`expanded`: all). */
export type ProgramFolderListRow = { kind: 'folder'; row: ProgramFolderTreeRow; folded: boolean | null } | { kind: 'more'; parentId: string; depth: number; count: number };
export function programFolderListRows(rows: readonly ProgramFolderTreeRow[], options: { query?: string; open?: ReadonlySet<string>; expanded?: ReadonlySet<string>; many?: boolean } = {}): ProgramFolderListRow[] {
  const query = options.query?.trim().toLocaleLowerCase() ?? '';
  const byId = new Map(rows.map(row => [row.id, row]));
  if (query) {
    const keep = new Set<string>();
    for (const row of rows) if (row.title.toLocaleLowerCase().includes(query)) {
      let current: ProgramFolderTreeRow | undefined = row;
      while (current && !keep.has(current.id)) { keep.add(current.id); current = current.parentId ? byId.get(current.parentId) : undefined; }
    }
    return rows.filter(row => keep.has(row.id)).map(row => ({ kind: 'folder' as const, row, folded: row.children ? false : null }));
  }
  const childrenOf = new Map<string | null, ProgramFolderTreeRow[]>();
  for (const row of rows) childrenOf.set(row.parentId, [...childrenOf.get(row.parentId) ?? [], row]);
  const list: ProgramFolderListRow[] = [];
  const place = (row: ProgramFolderTreeRow) => {
    const folded = row.children ? !!options.many && !options.open?.has(row.id) : null;
    list.push({ kind: 'folder', row, folded });
    if (folded) return;
    const kids = childrenOf.get(row.id) ?? [];
    if (!options.many || kids.length <= PROGRAM_FOLDER_CHILDREN_SHOWN || options.expanded?.has(row.id)) { kids.forEach(place); return; }
    const shown = new Set([...kids].sort((a, b) => b.open - a.open).slice(0, 2).map(kid => kid.id));
    kids.filter(kid => shown.has(kid.id)).forEach(place);
    list.push({ kind: 'more', parentId: row.id, depth: row.depth + 1, count: kids.length - shown.size });
  };
  (childrenOf.get(null) ?? []).forEach(place);
  return list;
}

/** The parents of a folder, to open the list with them unfolded (the last folder opened stays in view). */
export function programFolderParents(rows: readonly ProgramFolderTreeRow[], folderId: string): string[] {
  const byId = new Map(rows.map(row => [row.id, row])), parents: string[] = [], seen = new Set<string>();
  let row = byId.get(folderId);
  while (row?.parentId && !seen.has(row.parentId)) { seen.add(row.parentId); parents.push(row.parentId); row = byId.get(row.parentId); }
  return parents;
}

export type ProgramFolderTaskGroupKey = 'late' | 'today' | 'later' | 'undated';
export const PROGRAM_FOLDER_TASK_GROUPS: Record<ProgramFolderTaskGroupKey, string> = { late: '지난', today: '오늘', later: '앞으로', undated: '날짜 미정' };
/** [할 일]: open rows by 지난 (before today) · 오늘 · 앞으로 · 날짜 미정, in the list's own order; finished rows apart. */
export function programFolderTaskGroups<T extends { date: string | null }>(rows: readonly T[], today: string, done: (row: T) => boolean) {
  const groups: Record<ProgramFolderTaskGroupKey, T[]> = { late: [], today: [], later: [], undated: [] };
  const finished: T[] = [];
  for (const row of rows) {
    if (done(row)) { finished.push(row); continue; }
    const date = programDate(row.date) ? row.date! : null;
    groups[!date ? 'undated' : date < today ? 'late' : date === today ? 'today' : 'later'].push(row);
  }
  const keys: ProgramFolderTaskGroupKey[] = ['late', 'today', 'later', 'undated'];
  return { groups: keys.filter(key => groups[key].length).map(key => ({ key, rows: groups[key] })), done: finished,
    open: keys.reduce((sum, key) => sum + groups[key].length, 0) };
}

export interface ProgramFolderWritingDocument { id: string; title: string; open: number; done: number; lastDate: string | null }
/** [글]: the documents the folder appears in (archived, trashed and kept-aside ones left out), the one last written
 *  first (`recentId`: the space's writing position), then by the latest day of the folder in each, then in order.
 *  No write time is stored, so `lastDate` is that day, not when it was written. */
export function programFolderWritingDocuments(space: ProgramPrivateSpace, folderId: string, isOpen: (task: TextTask) => boolean,
  recentId?: string | null): ProgramFolderWritingDocument[] {
  const docs = [...space.text.documents, ...space.text.flows];
  if (!folderId || !docs.length) return [];
  const view = readProgramFolderRegions(space.text, docs[0].id, folderId);
  if (!view) return [];
  const retained = new Set(Object.values(space.retentionDocuments ?? {}));
  const matching = new Set(view.matchingDocumentIds.filter(id => !space.archivedDocumentIds.includes(id) && !space.documentTrash?.[id] && !retained.has(id)));
  const tasks = programExecutionTasks(space, { folderId });
  const rows = docs.filter(doc => matching.has(doc.id)).map((doc, order) => {
    const own = tasks.filter(task => task.docId === doc.id);
    const days = own.map(task => task.groupDate ?? task.date).filter((day): day is string => programDate(day)).sort();
    return { id: doc.id, title: doc.title, open: own.filter(isOpen).length, done: own.filter(task => !isOpen(task)).length, lastDate: days.at(-1) ?? null, order };
  });
  rows.sort((a, b) => Number(b.id === recentId) - Number(a.id === recentId) || (b.lastDate ?? '').localeCompare(a.lastDate ?? '') || a.order - b.order);
  return rows.map(({ order: _order, ...row }) => row);
}

/** [글]'s fold (the same 7 days as 쓰기's 최근만): a day before `since` folds under '지난 기록 n일 펼치기'. */
export const programFolderOldSince = (today: string) => programDate(today) ? programShiftDate(today, 1 - PROGRAM_RECENT_WRITING.days) : '';
/** The day a row of a document belongs to: a date line's own, else its section's. */
export const programFolderRowDay = (row: { kind: TextRow['kind'] | string; date?: string | null; groupDate?: string | null } | undefined): string | null =>
  !row ? null : row.kind === 'date' ? row.date ?? null : row.groupDate ?? null;
export const programFolderOldDay = (day: string | null, since: string) => !!since && programDate(day) && day! < since;
