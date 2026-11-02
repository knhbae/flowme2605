import { canonicalJson, detached } from './alpha-persistence/json';
import { textWorkspaceModel as M, type TextWorkspaceState, type TextFolder, type TextScopeBinding, type TextLine } from './text-workspace';
import { ro } from './folder-notice';

const same = (a: unknown, b: unknown) => a === b || a !== undefined && b !== undefined && canonicalJson(a) === canonicalJson(b);
const docs = (state: TextWorkspaceState) => [...state.documents, ...state.flows];
const scopeKey = (row: TextScopeBinding) => `${row.docId}\n${row.lineId}`;
const folderLine = (text: string, title: string) => `${/^ */.exec(text)![0]}- /${title}`;
const plainLine = (text: string) => text.replace(/^( *- )\//, '$1');
type Delta<T> = { key: string; before: T | null; after: T | null; index: number; born?: boolean };
type LineChange = { docId: string; lineId: string; expected: string | null; restore: string; order: string[] };
type Region = { docId: string; previous: string | null; next: string | null; ids: string[]; headId?: string };
type UseGuard = { folderId: string; uses: string[] };
/** Ephemeral inverse of folder effects only. No whole-workspace preimage is retained or installed. */
export type ProgramFolderOperation = {
  kind: 'create' | 'link' | 'move' | 'rename' | 'unlink' | 'scopes' | 'reparent' | 'paste';
  folders: Delta<TextFolder>[]; bindings: Delta<TextScopeBinding>[];
  taskScopes: Delta<string>[]; itemScopes: Delta<string>[];
  lines: LineChange[]; regions: Region[]; users: UseGuard[];
  documentNames: { docId: string; expected: string; restore: string }[];
  createdFolders: string[]; createdLines: { docId: string; lineId: string; folderId: string }[];
};
const rejected = () => ({ ok: false as const, reason: '그 뒤에 관련 내용이나 연결이 바뀌어 되돌리지 않았습니다. 현재 입력은 유지했습니다.' });
export function programFolderOperationNotice(state: TextWorkspaceState, operation: ProgramFolderOperation): string {
  const changes = [...new Map([...operation.taskScopes, ...operation.itemScopes].filter(row => !row.born && row.before !== row.after).map(row => [row.key, row])).values()];
  if (operation.kind !== 'scopes') return changes.length ? `할 일 ${changes.length}개의 소속도 옮겼습니다` : '';
  const names = [...new Set(changes.map(row => M.scopes(state).find(scope => scope.id === row.after)?.title).filter((title): title is string => !!title))];
  const places = names.slice(0, 2).map(name => `‘${name}’`).join(' · ') + (names.length > 2 ? ` 외 ${names.length - 2}곳` : '');
  return `할 일 ${changes.length}개를 ${places}${names.length > 2 ? '으로' : ro(names.at(-1) ?? '')} 옮겼습니다`;
}

function deltas<T>(before: T[], after: T[], key: (row: T) => string): Delta<T>[] {
  const a = new Map(before.map(row => [key(row), row])), b = new Map(after.map(row => [key(row), row]));
  return [...new Set([...a.keys(), ...b.keys()])].filter(id => !same(a.get(id), b.get(id)))
    .map(id => ({ key: id, before: detached(a.get(id) ?? null), after: detached(b.get(id) ?? null), index: before.findIndex(row => key(row) === id) }));
}
function dictionary(before: Record<string, string>, after: Record<string, string>): Delta<string>[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => before[key] !== after[key])
    .map(key => ({ key, before: before[key] ?? null, after: after[key] ?? null, index: 0 }));
}
/** Every use that matters for deleting/reparenting a folder; an occurrence in this document is still a use. */
export function programFolderUses(state: TextWorkspaceState, folderId: string, except?: { docId: string; lineId: string }): string[] {
  return [
    ...state.bindings.filter(row => row.kind === 'scope' && row.scopeId === folderId && !(row.docId === except?.docId && row.lineId === except.lineId))
      .map(row => `line:${row.docId}:${row.lineId}`),
    ...docs(state).filter(doc => doc.folderId === folderId).map(doc => `document:${doc.id}`),
    ...Object.entries(state.taskScopes).filter(([, id]) => id === folderId).map(([id]) => `task:${id}`),
    ...Object.entries(state.itemScopes).filter(([, id]) => id === folderId).map(([id]) => `item:${id}`),
    ...state.folders.filter(folder => folder.parentId === folderId).map(folder => `child:${folder.id}`),
  ].sort();
}
/** N6 review (11/2): the folder is used by document `docId` alone there (its lines, their tasks and items), under
 *  `parentId`. A draft kept from syncing (its input unsaved) holds the folder as it was; another tab may have filed
 *  a document in it, linked it from another document or moved it since. Absent there (not saved yet), it is free.
 *  N7 (review n6-fix, 11/2): each of those uses is one of `known` too (the draft's base and its input). Another tab
 *  may have filed another task or item of this same document in it; the move would take that along. */
export function programFolderStillFree(state: TextWorkspaceState, docId: string, folderId: string, parentId: string | null, known: TextWorkspaceState[]): boolean {
  const folder = state.folders.find(entry => entry.id === folderId);
  if (!folder) return true;
  if ((folder.parentId ?? null) !== parentId) return false;
  const own = new Set(M.getDocument(state, docId)?.lines.map(line => line.id) ?? []);
  const seen = new Set(known.flatMap(entry => programFolderUses(entry, folderId)));
  return programFolderUses(state, folderId).every(use => seen.has(use)
    && (use.startsWith(`line:${docId}:`) || /^(task|item):/.test(use) && own.has(use.slice(5))));
}
/** N7 (review n6-phone-3, 11/2): the folder's uses outside document `docId` there: a line, task or item of another
 *  document, or a document filed in it. Absent there, none. */
function usesElsewhere(state: TextWorkspaceState, docId: string, folderId: string): string[] {
  if (!state.folders.some(entry => entry.id === folderId)) return [];
  const own = new Set(M.getDocument(state, docId)?.lines.map(line => line.id) ?? []);
  return programFolderUses(state, folderId).filter(use => use.startsWith('line:') ? !use.startsWith(`line:${docId}:`)
    : use.startsWith('document:') ? use !== `document:${docId}` : /^(task|item):/.test(use) && !own.has(use.slice(5)));
}
export function programFolderUsedElsewhere(state: TextWorkspaceState, docId: string, folderId: string): boolean {
  return usesElsewhere(state, docId, folderId).length > 0;
}
/** N7 review 5: a use outside document `docId` in `latest` that `known` does not have. D3 B judges a linked line from
 *  what the draft knows (W15: rename when this document alone uses the folder, else move the line); the draft, its
 *  input unsaved, may not have taken in another tab's new use. Uses it knows keep W15's own judgement. */
export function programFolderNewUsesElsewhere(known: TextWorkspaceState, latest: TextWorkspaceState, docId: string, folderId: string): boolean {
  const seen = new Set(usesElsewhere(known, docId, folderId));
  return usesElsewhere(latest, docId, folderId).some(use => !seen.has(use));
}
/** N7: a save that renames a folder from its line (D3 B) is refused when, in the workspace it is saved into, another
 *  document has started using it since the draft's base (review 5: uses the base had kept W15's judgement). */
export function programFolderRenamesStillOwn(expected: TextWorkspaceState, next: TextWorkspaceState, before: TextWorkspaceState, docId: string): boolean {
  return next.folders.every(folder => {
    const was = expected.folders.find(entry => entry.id === folder.id);
    return !was || was.title === folder.title || !programFolderNewUsesElsewhere(expected, before, docId, folder.id);
  });
}
/** N6 review: a save that moves a folder this document alone used (D11 B) is refused when, in the workspace it is
 *  saved into, the folder is gone, moved, or used elsewhere, or (N7) by anything of this document the save does not know. */
export function programFolderMovesStillFree(expected: TextWorkspaceState, next: TextWorkspaceState, before: TextWorkspaceState, docId: string): boolean {
  return next.folders.every(folder => {
    const was = expected.folders.find(entry => entry.id === folder.id);
    if (!was || (was.parentId ?? null) === (folder.parentId ?? null) || !programFolderStillFree(expected, docId, folder.id, was.parentId ?? null, [expected])) return true;
    return before.folders.some(entry => entry.id === folder.id) && programFolderStillFree(before, docId, folder.id, was.parentId ?? null, [expected, next]);
  });
}
function regionIds(state: TextWorkspaceState, region: Region): string[] | null {
  const doc = M.getDocument(state, region.docId); if (!doc) return null;
  if (region.headId) {
    const at = doc.lines.findIndex(line => line.id === region.headId); if (at < 0) return null;
    return doc.lines.slice(at, M.rowMeta(state, doc.id)[at]?.subtreeEndIndex ?? at + 1).map(line => line.id);
  }
  const previous = region.previous === null ? -1 : doc.lines.findIndex(line => line.id === region.previous);
  const next = region.next === null ? doc.lines.length : doc.lines.findIndex(line => line.id === region.next);
  if (region.previous !== null && previous < 0 || next < 0 || previous >= next) return null;
  const inside = doc.lines.slice(previous + 1, next).map(line => line.id);
  // A dissolved group's known children must stay together. A new sibling after
  // them is unrelated input and is not part of the inverse's region.
  if (region.ids.length) {
    const start = inside.indexOf(region.ids[0]); if (start < 0) return null;
    return inside.slice(start, start + region.ids.length);
  }
  return inside;
}

/** Capture the semantic folder part of a finished edit. Pasted ordinary text/tasks stay pasted on undo. */
export function captureProgramFolderOperation(before: TextWorkspaceState, after: TextWorkspaceState, extraLineIds: string[] = []): ProgramFolderOperation | null {
  if (!M.validate(before) || !M.validate(after)) return null;
  const folders = deltas(before.folders, after.folders, row => row.id);
  const folderIds = new Set([...before.folders, ...after.folders].map(folder => folder.id));
  const beforeBindings = before.bindings.filter((row): row is TextScopeBinding => row.kind === 'scope' && folderIds.has(row.scopeId));
  const afterBindings = after.bindings.filter((row): row is TextScopeBinding => row.kind === 'scope' && folderIds.has(row.scopeId));
  const bindings = deltas(beforeBindings, afterBindings, scopeKey).map(row => ({ ...row,
    index: before.bindings.findIndex(binding => binding.kind === 'scope' && scopeKey(binding) === row.key) }));
  const structural = folders.length > 0 || bindings.length > 0;
  const changedFolders = new Set(folders.map(row => row.key));
  const heads = new Map<string, { before?: TextScopeBinding; after?: TextScopeBinding }>();
  for (const row of bindings) heads.set(row.key, { before: row.before ?? undefined, after: row.after ?? undefined });
  for (const row of [...beforeBindings, ...afterBindings]) if (changedFolders.has(row.scopeId)) {
    const key = scopeKey(row); heads.set(key, { before: beforeBindings.find(value => scopeKey(value) === key), after: afterBindings.find(value => scopeKey(value) === key) });
  }
  const affected = new Set(extraLineIds), regions: Region[] = [], lines = new Map<string, LineChange>();
  for (const [key, head] of heads) {
    const binding = head.after ?? head.before!, docId = binding.docId;
    const old = M.getDocument(before, docId), next = M.getDocument(after, docId); if (!old || !next) return null;
    const oldLine = old.lines.find(line => line.id === binding.lineId), newLine = next.lines.find(line => line.id === binding.lineId);
    const oldFolder = head.before && before.folders.find(folder => folder.id === head.before!.scopeId);
    const restore = oldFolder && oldLine ? folderLine(oldLine.text, oldFolder.title) : newLine ? plainLine(newLine.text) : null;
    if (restore === null) return null;
    lines.set(key, { docId, lineId: binding.lineId, expected: newLine?.text ?? null, restore, order: old.lines.map(line => line.id) });
    const ids = new Set<string>();
    for (const [state, owner] of [[before, old], [after, next]] as const) {
      const at = owner.lines.findIndex(line => line.id === binding.lineId), row = at >= 0 ? M.rowMeta(state, docId)[at] : null;
      if (at >= 0) for (const line of owner.lines.slice(at, row?.subtreeEndIndex ?? at + 1)) { ids.add(line.id); affected.add(line.id); }
    }
    const indexes = next.lines.flatMap((line, index) => ids.has(line.id) ? [index] : []);
    const oldIndex = old.lines.findIndex(line => line.id === binding.lineId);
    let low = indexes.length ? Math.min(...indexes) : -1, high = indexes.length ? Math.max(...indexes) : -1;
    if (low < 0) {
      const following = old.lines.slice(oldIndex + 1).find(line => next.lines.some(value => value.id === line.id));
      low = following ? next.lines.findIndex(line => line.id === following.id) : next.lines.length; high = low - 1;
    }
    regions.push({ docId, ...(newLine && head.after ? { headId: newLine.id } : {}), previous: next.lines[low - 1]?.id ?? null, next: next.lines[high + 1]?.id ?? null,
      ids: next.lines.slice(low, high + 1).map(line => line.id) });
  }
  const taskIds = new Set(M.tasks(after).map(task => task.id));
  const relevant = (row: Delta<string>) => taskIds.has(row.key) && (row.before !== null || structural && affected.has(row.key));
  // Pasted new tasks stay present. Their inverse owner is the nearest pre-existing folder,
  // or the document's storage folder, rather than an absent (invalid) task owner.
  const existingOwner = (row: Delta<string>) => {
    if (row.before !== null) return row;
    let folder = after.folders.find(folder => folder.id === row.after);
    while (folder && !before.folders.some(old => old.id === folder!.id)) folder = after.folders.find(parent => parent.id === folder!.parentId);
    const owner = docs(after).find(doc => doc.lines.some(line => line.id === row.key));
    return { ...row, born: true, before: folder?.id ?? (after.flows.some(flow => flow.id === owner?.id) ? owner!.id : owner?.folderId) ?? 'folder-unfiled' };
  };
  const taskScopes = dictionary(before.taskScopes, after.taskScopes).filter(relevant).map(existingOwner);
  const itemScopes = dictionary(before.itemScopes, after.itemScopes).filter(row => row.before !== null && docs(after).some(doc => doc.lines.some(line => line.id === row.key)) || structural && affected.has(row.key)).map(existingOwner);
  if (!structural && !taskScopes.length && !itemScopes.length) return null;
  // Only structural indentation belongs to the inverse; association-only undo leaves typed text alone.
  for (const doc of docs(before)) {
    const next = M.getDocument(after, doc.id); if (!next) continue;
    for (const line of doc.lines) {
      const current = next.lines.find(value => value.id === line.id), key = `${doc.id}\n${line.id}`;
      if (structural && affected.has(line.id) && current && line.text !== current.text && line.text.trimStart() === current.text.trimStart() && !lines.has(key)) {
        lines.set(key, { docId: doc.id, lineId: line.id, expected: current.text, restore: line.text, order: doc.lines.map(value => value.id) });
      }
    }
  }
  // Touched associations must still refer to the picked line; later edits to that line refuse the inverse.
  for (const id of new Set([...taskScopes, ...itemScopes].map(row => row.key))) {
    const owner = docs(after).find(doc => doc.lines.some(line => line.id === id)), line = owner?.lines.find(line => line.id === id);
    if (owner && line && !lines.has(`${owner.id}\n${id}`)) lines.set(`${owner.id}\n${id}`, { docId: owner.id, lineId: id, expected: line.text, restore: line.text, order: owner.lines.map(value => value.id) });
  }
  const createdFolders = folders.filter(row => !row.before && row.after).map(row => row.key);
  const createdLines = bindings.filter(row => !row.before && row.after).map(row => ({ docId: row.after!.docId, lineId: row.after!.lineId, folderId: row.after!.scopeId }));
  const kind = folders.some(row => row.before && row.after && row.before.parentId !== row.after.parentId) ? 'reparent'
    : bindings.some(row => row.before && row.after && row.before.scopeId !== row.after.scopeId) ? 'move'
    : folders.some(row => row.before && row.after && row.before.title !== row.after.title) ? 'rename'
    : bindings.some(row => row.before && !row.after) ? 'unlink'
    : createdLines.length > 1 ? 'paste' : createdLines.length ? createdFolders.length ? 'create' : 'link' : 'scopes';
  return { kind, folders, bindings, taskScopes, itemScopes, lines: [...lines.values()], regions,
    users: folders.filter(row => row.before && row.after).map(row => ({ folderId: row.key, uses: programFolderUses(after, row.key) })),
    documentNames: docs(before).flatMap(doc => { const next = M.getDocument(after, doc.id); return next && next.folderId === doc.folderId && next.folder !== doc.folder ? [{ docId: doc.id, expected: next.folder, restore: doc.folder }] : []; }),
    createdFolders, createdLines };
}

function restoreEntities<T>(current: T[], changes: Delta<T>[], key: (row: T) => string): T[] {
  let result = current.slice();
  for (const change of changes) {
    const at = result.findIndex(row => key(row) === change.key);
    if (change.before === null) { if (at >= 0) result.splice(at, 1); }
    else if (at >= 0) result[at] = detached(change.before);
    else result.splice(Math.max(0, Math.min(change.index, result.length)), 0, detached(change.before));
  }
  return result;
}
/** Revalidate every touched value first, then create one forward change on CURRENT, preserving all other input. */
export function undoProgramFolderOperation(current: TextWorkspaceState, operation: ProgramFolderOperation): { ok: true; next: TextWorkspaceState } | { ok: false; reason: string } {
  if (!M.validate(current)) return rejected();
  for (const change of operation.folders) if (!same(current.folders.find(folder => folder.id === change.key) ?? null, change.after)) return rejected();
  for (const change of operation.folders) if (change.before && current.folders.some(folder => folder.id !== change.key
    && folder.title === change.before!.title && folder.parentId === change.before!.parentId)) return rejected();
  for (const change of operation.bindings) if (!same(current.bindings.find(row => row.kind === 'scope' && scopeKey(row) === change.key) ?? null, change.after)) return rejected();
  for (const [dictionary, changes] of [[current.taskScopes, operation.taskScopes], [current.itemScopes, operation.itemScopes]] as const) {
    for (const change of changes) if ((dictionary[change.key] ?? null) !== change.after) return rejected();
  }
  for (const line of operation.lines) {
    const doc = M.getDocument(current, line.docId); if (!doc || (doc.lines.find(value => value.id === line.lineId)?.text ?? null) !== line.expected) return rejected();
  }
  for (const region of operation.regions) if (!same(regionIds(current, region), region.ids)) return rejected();
  for (const user of operation.users) if (!same(programFolderUses(current, user.folderId), user.uses)) return rejected();
  for (const name of operation.documentNames) if (M.getDocument(current, name.docId)?.folder !== name.expected) return rejected();
  const next = detached(current);
  const created = new Set(operation.createdFolders);
  next.folders = restoreEntities(next.folders, operation.folders.filter(row => !created.has(row.key)), row => row.id);
  const restoredBindings = restoreEntities(next.bindings.filter((row): row is TextScopeBinding => row.kind === 'scope'), operation.bindings, scopeKey);
  const scopeKeys = new Set(operation.bindings.map(row => row.key));
  next.bindings = next.bindings.filter(row => row.kind !== 'scope' || !scopeKeys.has(scopeKey(row)));
  for (const row of restoredBindings) if (scopeKeys.has(scopeKey(row))) next.bindings.splice(Math.max(0, Math.min(operation.bindings.find(change => change.key === scopeKey(row))!.index, next.bindings.length)), 0, row);
  for (const [dictionary, changes] of [[next.taskScopes, operation.taskScopes], [next.itemScopes, operation.itemScopes]] as const) {
    for (const change of changes) if (change.before === null) delete dictionary[change.key]; else dictionary[change.key] = change.before;
  }
  for (const change of operation.lines) {
    const doc = M.getDocument(next, change.docId)!; const at = doc.lines.findIndex(line => line.id === change.lineId);
    if (at >= 0) doc.lines[at] = { id: change.lineId, text: change.restore };
    else {
      const index = change.order.indexOf(change.lineId), following = change.order.slice(index + 1).find(id => doc.lines.some(line => line.id === id));
      doc.lines.splice(following ? doc.lines.findIndex(line => line.id === following) : doc.lines.length, 0, { id: change.lineId, text: change.restore });
    }
  }
  for (const name of operation.documentNames) M.getDocument(next, name.docId)!.folder = name.restore;
  // An unrelated new use keeps a newly created folder; it is never deleted just because its originating line undid.
  // Remove newly made leaves first. A child deleted by this same inverse must
  // not keep its now-unused newly made parent; any surviving foreign use does.
  for (;;) {
    const unused = new Set(next.folders.filter(folder => created.has(folder.id) && programFolderUses(next, folder.id).length === 0).map(folder => folder.id));
    if (!unused.size) break;
    next.folders = next.folders.filter(folder => !unused.has(folder.id));
  }
  if (!M.validate(next) || docs(next).some(doc => M.parseDocument(doc, next).issues.some(issue => issue.blocking))) return rejected();
  return { ok: true, next };
}

/** Group only association inverses; typed RAW between them never enters this record. */
export function combineProgramFolderScopes(first: ProgramFolderOperation, second: ProgramFolderOperation): ProgramFolderOperation {
  if (first.kind !== 'scopes' || second.kind !== 'scopes') return second;
  const merge = <T,>(a: Delta<T>[], b: Delta<T>[]) => [...new Set([...a, ...b].map(row => row.key))].map(key => {
    const old = a.find(row => row.key === key), next = b.find(row => row.key === key);
    return { ...(next ?? old!), before: old ? old.before : next!.before };
  }).filter(row => !same(row.before, row.after));
  const lines = new Map(first.lines.map(row => [`${row.docId}\n${row.lineId}`, row]));
  for (const row of second.lines) lines.set(`${row.docId}\n${row.lineId}`, row);
  return { ...second, taskScopes: merge(first.taskScopes, second.taskScopes), itemScopes: merge(first.itemScopes, second.itemScopes), lines: [...lines.values()] };
}

export type FolderIndentPlan = { start: number; end: number; text: string; nextRaw: string; selectionBefore: { start: number; end: number; direction?: string };
  selectionAfter: { start: number; end: number; direction?: string }; startLine: number; endLine: number; outdent: boolean };
type CreatedFolder = { docId: string; lineId: string; folderId: string; automaticBlank?: TextLine };
/** Under the new line, only its automatic blank or blank lines already below it (an earlier Enter's, a line emptied
 *  there): those are no content of the folder (N5 3b). The ⇤ leaves them as they are. */
function nothingUnder(current: TextWorkspaceState, created: CreatedFolder, lines: TextLine[]): boolean {
  return lines.every(line => line.id === created.automaticBlank?.id
    || !line.text.trim() && !current.bindings.some(row => row.docId === created.docId && row.lineId === line.id));
}
/** The automatic blank: right under the line, or the last of the same blank lines there (the draft says why). */
function automaticBlankAt(doc: { lines: TextLine[] }, at: number, blank: TextLine): number {
  const index = doc.lines.findIndex(line => line.id === blank.id);
  return index > at && doc.lines.slice(at + 1, index + 1).every(line => line.text === blank.text) ? index : -1;
}
export function programFreshFolderAvailable(current: TextWorkspaceState, created: CreatedFolder): boolean {
  const doc = M.getDocument(current, created.docId), at = doc?.lines.findIndex(line => line.id === created.lineId) ?? -1;
  if (!doc || at < 0 || programFolderUses(current, created.folderId, created).length) return false;
  const binding = current.bindings.find(row => row.kind === 'scope' && row.docId === created.docId && row.lineId === created.lineId);
  if (binding?.kind !== 'scope' || binding.scopeId !== created.folderId || !current.folders.some(folder => folder.id === created.folderId)) return false;
  const under = doc.lines.slice(at + 1, M.rowMeta(current, created.docId)[at]?.subtreeEndIndex ?? at + 1);
  return nothingUnder(current, created, under)
    && (!created.automaticBlank || automaticBlankAt(doc, at, created.automaticBlank) > at && !created.automaticBlank.text.trim());
}
/** D11 B: explicit native-action proof only; generic text/model indentation remains locked. */
export function planProgramFreshFolderIndent(current: TextWorkspaceState, created: CreatedFolder, plan: FolderIndentPlan): { next: TextWorkspaceState; plan: FolderIndentPlan } | null {
  const doc = M.getDocument(current, created.docId), at = doc?.lines.findIndex(line => line.id === created.lineId) ?? -1;
  if (!doc || at < 0 || plan.startLine !== at || plan.selectionBefore.start !== plan.selectionBefore.end || plan.selectionBefore.start < 0
    || plan.selectionBefore.start > M.raw(doc).length || plan.endLine >= doc.lines.length || !nothingUnder(current, created, doc.lines.slice(at + 1, plan.endLine + 1))) return null;
  if (!programFreshFolderAvailable(current, created)) return null;
  const folder = current.folders.find(folder => folder.id === created.folderId)!;
  const oldRaw = M.raw(doc), original = oldRaw.split('\n'), moved = plan.nextRaw.split('\n');
  if (moved.length !== original.length || !/^ *- \/[^/]+$/.test(moved[at])) return null;
  const expectedHead = plan.outdent ? original[at].slice(2) : '  ' + original[at];
  if (moved[at] !== expectedHead || plan.outdent && !original[at].startsWith('  ')) return null;
  for (let index = 0; index < original.length; index++) if (index !== at && moved[index] !== original[index]) return null;
  if (created.automaticBlank) moved[automaticBlankAt(doc, at, created.automaticBlank)] = plan.outdent ? created.automaticBlank.text.slice(2) : '  ' + created.automaticBlank.text;
  const next = detached(current), nextDoc = M.getDocument(next, created.docId)!;
  nextDoc.lines = nextDoc.lines.map((line, index) => ({ id: line.id, text: moved[index] }));
  const nextRow = M.rowMeta(next, created.docId)[at], parentId = nextRow?.ancestorScopeId ?? null;
  const parentRow = nextRow?.parentLineId ? M.rowMeta(next, created.docId).find(row => row.id === nextRow.parentLineId) : null;
  if (nextRow?.kind !== 'scope' || nextRow.scopeKind !== 'folder' || nextRow.scopeId !== folder.id || nextRow.depth > M.MAX_DEPTH
    || nextRow.depth > 0 && (!parentId || parentRow?.kind !== 'scope' || parentRow.scopeKind !== 'folder' || parentRow.depth !== nextRow.depth - 1 || !next.folders.some(folder => folder.id === parentId))
    || next.folders.some(other => other.id !== folder.id && other.title === folder.title && other.parentId === parentId)) return null;
  next.folders.find(value => value.id === folder.id)!.parentId = parentId;
  if (!M.validate(next) || M.parseDocument(nextDoc, next).issues.some(issue => issue.blocking)) return null;
  const nextRaw = moved.join('\n'); let start = 0, end = oldRaw.length, nextEnd = nextRaw.length;
  while (start < end && start < nextEnd && oldRaw[start] === nextRaw[start]) start++;
  while (end > start && nextEnd > start && oldRaw[end - 1] === nextRaw[nextEnd - 1]) { end--; nextEnd--; }
  return { next, plan: { ...plan, start, end, text: nextRaw.slice(start, nextEnd), nextRaw } };
}
