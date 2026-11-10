import { programId } from './contract';
import { programDate } from './program-data';
import { readProgramRepeatMarker } from './repeat-line';
import { textWorkspaceModel as M, type TextLine, type TextRow, type TextTask, type TextWorkspaceState } from './text-workspace';

export type TaskLocationTarget = { kind: 'date'; date: string | null; time?: string }
  | { kind: 'folder'; folderId: string } | { kind: 'new-folder'; title: string };
export type TaskLocationFailure = 'missing' | 'protected' | 'mixed-subtree' | 'invalid-date' | 'invalid-folder'
  | 'duplicate-folder' | 'too-deep' | 'unsafe-position' | 'meaning-changed';
export type TaskLocationMove = { ok: true; next: TextWorkspaceState; documentId: string; taskId: string;
  lineIds: string[]; date: string | null; folderId: string; createdFolder: boolean; declarations: number;
  changed: boolean } | { ok: false; reason: TaskLocationFailure };

export const TASK_LOCATION_FAILURE_TEXT: Record<TaskLocationFailure, string> = {
  missing: '옮길 할 일을 다시 확인해 주세요. 원문은 유지했습니다.',
  protected: '이 항목은 자리 그대로 날짜만 바꿀 수 있습니다.',
  'mixed-subtree': '연결된 항목이나 폴더 줄이 함께 있어 이 묶음은 옮기지 않았습니다.',
  'invalid-date': '옮길 날짜를 확인해 주세요.',
  'invalid-folder': '옮길 폴더를 확인해 주세요.',
  'duplicate-folder': '같은 이름의 폴더가 있습니다. 그 폴더를 골라 주세요.',
  'too-deep': '옮길 자리가 너무 깊어 원문을 유지했습니다.',
  'unsafe-position': '안전한 자리를 찾지 못해 원문을 유지했습니다.',
  'meaning-changed': '다른 항목이 바뀔 수 있어 옮기지 않았습니다. 원문은 유지했습니다.',
};

export function readTaskLocationSource(state: TextWorkspaceState, documentId: string, taskId: string) {
  if (!M.validate(state)) return null;
  const doc = state.documents.find(item => item.id === documentId), rows = doc && M.rowMeta(state, documentId);
  const row = rows?.find(item => item.id === taskId), task = M.tasks(state).find(item => item.id === taskId);
  const selection = row && M.selectionForMove(state, documentId, taskId);
  if (!doc || !rows || !row || !task || !selection || !task.isCanonical || row.isReference
    || !['task', 'subcheck'].includes(row.kind) || task.docId !== documentId || task.scopeKind !== 'folder' || readProgramRepeatMarker(task.title)) return null;
  return { doc, rows, row, task, selection };
}

/** Read-only placement for the shared folder sheet; no IDs are allocated while it renders. */
export function readTaskLocationFolder(state: TextWorkspaceState, documentId: string, taskId: string, folderId: string, givenSource?: ReturnType<typeof readTaskLocationSource>) {
  const source = givenSource === undefined ? readTaskLocationSource(state, documentId, taskId) : givenSource;
  if (!source || !state.folders.some(folder => folder.id === folderId)) return null;
  const start = source.row.dateLineId ? source.rows.find(item => item.id === source.row.dateLineId)!.index + 1 : 0;
  const end = source.rows.find(item => item.index >= start && item.kind === 'date')?.index ?? source.doc.lines.length;
  return { present: source.rows.some(item => item.index >= start && item.index < end && item.kind === 'scope' && item.scopeId === folderId),
    current: source.task.scopeId === folderId && (folderId === 'folder-unfiled' ? source.row.ancestorScopeId === null : source.row.ancestorScopeId === folderId),
    date: source.row.groupDate, hasDateHead: source.row.dateLineId !== null };
}

/** One same-document source transition. Existing lines are never reparsed to assign identities. */
export function moveTaskLocation(state: TextWorkspaceState, input: { documentId: string; taskId: string; target: TaskLocationTarget }): TaskLocationMove {
  const fail = (reason: TaskLocationFailure): TaskLocationMove => ({ ok: false, reason });
  const source = readTaskLocationSource(state, input.documentId, input.taskId);
  if (!source) return fail('protected');
  const { doc, rows, row, task, selection } = source, selected = new Set(selection.lineIds);
  const selectedRows = rows.filter(item => selected.has(item.id));
  if (selectedRows.some(item => item.isReference || item.kind === 'scope' || item.scopeKind === 'flow' || /^ *- \//.test(item.text)
    || item.title && readProgramRepeatMarker(item.title))) return fail('mixed-subtree');
  const target = input.target;
  if (target.kind === 'date' && (target.date !== null && !programDate(target.date)
    || target.time !== undefined && target.time !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(target.time))) return fail('invalid-date');
  let folders = state.folders, folderId = target.kind === 'folder' ? target.folderId : task.scopeId, createdFolder = false;
  if (target.kind === 'new-folder') {
    const title = target.title.trim();
    if (!title || title.length > 100 || /[\r\n]/.test(title)) return fail('invalid-folder');
    if (folders.some(folder => folder.parentId === null && folder.title === title)) return fail('duplicate-folder');
    folderId = programId('folder'); folders = [...folders, { id: folderId, title, parentId: null }]; createdFolder = true;
  }
  if (!folders.some(folder => folder.id === folderId)) return fail('invalid-folder');
  const chain: typeof folders = [], seen = new Set<string>();
  let parent: string | null = folderId === 'folder-unfiled' ? null : folderId;
  while (parent !== null) {
    if (seen.has(parent)) return fail('invalid-folder'); seen.add(parent);
    const folder = folders.find(item => item.id === parent); if (!folder) return fail('invalid-folder');
    chain.unshift(folder); parent = folder.parentId;
  }
  if (chain.length > M.MAX_DEPTH) return fail('too-deep');
  const removed = new Set(target.kind === 'date' ? selectedRows.filter(item => item.kind === 'property'
    && item.parentLineId === task.id && /^ *-\s+날짜:/.test(item.text)).map(item => item.id) : []);
  const editedTime = new Set(target.kind === 'date' && target.time !== undefined ? selectedRows.filter(item => item.kind === 'property'
    && item.parentLineId === task.id && /^ *-\s+시간:/.test(item.text)).map(item => item.id) : []);
  let working = state;
  if (target.kind === 'date' && target.time !== undefined && target.time !== (task.time ?? '')) working = M.updateTask(state, task.id, { time: target.time });
  const workingDoc = M.getDocument(working, doc.id)!;
  // A deliberate time edit may add/remove its own property; collect the same task block again, retaining every ID it has now.
  const workingSelection = M.selectionForMove(working, doc.id, task.id);
  if (!workingSelection) return fail('unsafe-position');
  const movingIds = new Set(workingSelection.lineIds), workingRows = M.rowMeta(working, doc.id);
  let moved = workingDoc.lines.filter(line => movingIds.has(line.id) && !removed.has(line.id));
  let remaining = workingDoc.lines.filter(line => !movingIds.has(line.id));
  const remainder = { ...workingDoc, lines: remaining };
  const remainderState = { ...working, folders, documents: working.documents.map(item => item.id === doc.id ? remainder : item) };
  // Parsing the remainder is read-only: its old owner maps can temporarily refer to the held block.
  let restRows = M.parseDocument(remainder, remainderState).rows;
  const date = target.kind === 'date' ? target.date : row.groupDate;
  const datedHeads=target.kind==='date'?restRows.filter(item=>item.kind==='date'&&item.date===date):[];
  const declaredIn=new Set(restRows.filter(item=>item.kind==='scope'&&item.scopeKind==='folder'&&item.scopeId===folderId).map(item=>item.dateLineId));
  // Equal date heads are separate source sections. Prefer one already declaring this folder before creating another.
  let head = target.kind === 'date' ? datedHeads.find(item=>declaredIn.has(item.id))??datedHeads[0]
    : row.dateLineId ? restRows.find(item => item.id === row.dateLineId) : undefined;
  const additions: TextLine[] = [], bindings = [...working.bindings];
  const addLine = (text: string) => ({ id: programId('line'), text });
  if (target.kind === 'date' && !head) {
    const line = addLine(`[${date ?? '미정'}]`); remaining = [...remaining, line];
    restRows = M.parseDocument({ ...remainder, lines: remaining }, remainderState).rows;
    head = restRows.find(item => item.id === line.id);
    if (head?.kind !== 'date') return fail('unsafe-position');
  }
  const start = head ? head.index + 1 : 0;
  const end = restRows.find(item => item.index >= start && item.kind === 'date')?.index ?? remaining.length;
  const part = restRows.filter(item => item.index >= start && item.index < end);
  let at = end, depth = 0, missingFrom = 0;
  // Reuse the last exact folder declaration, or its nearest declared ancestor, as F4-b does.
  for (let index = chain.length - 1; index >= 0; index--) {
    const own = [...part].reverse().find(item => item.kind === 'scope' && item.scopeKind === 'folder' && item.scopeId === chain[index].id);
    if (!own) continue;
    at = Math.min(own.subtreeEndIndex, end); depth = own.depth + 1; missingFrom = index + 1; break;
  }
  for (let index = missingFrom; index < chain.length; index++) {
    const folder = chain[index], line = addLine(`${'  '.repeat(depth)}- /${folder.title}`);
    additions.push(line); bindings.push({ kind: 'scope', docId: doc.id, lineId: line.id, scopeId: folder.id }); depth++;
  }
  if (depth + Math.max(...workingRows.filter(item => movingIds.has(item.id)).map(item => item.depth - row.depth)) > M.MAX_DEPTH) return fail('too-deep');
  const byId = new Map(workingRows.map(item => [item.id, item]));
  moved = moved.map(line => {
    const meta = byId.get(line.id)!;
    if (!line.text.trim() || meta.kind === 'fence' && !/^ *(?:`{3,}|~{3,})/.test(line.text)) return line;
    return { id: line.id, text: '  '.repeat(meta.depth + depth - row.depth) + line.text.trimStart() };
  });
  const lines = [...remaining.slice(0, at), ...additions, ...moved, ...remaining.slice(at)];
  const taskScopes = { ...working.taskScopes }, itemScopes = { ...working.itemScopes };
  for (const id of movingIds) { if (Object.hasOwn(taskScopes, id)) taskScopes[id] = folderId; if (Object.hasOwn(itemScopes, id)) itemScopes[id] = folderId; }
  const next: TextWorkspaceState = { ...working, folders, bindings, taskScopes, itemScopes,
    documents: working.documents.map(item => item.id === doc.id ? { ...item, lines } : item) };
  if (!M.validate(next)) return fail('unsafe-position');
  const afterRows = M.rowMeta(next, doc.id), after = M.tasks(next), beforeTasks = M.tasks(state), afterById = new Map(after.map(item => [item.id, item]));
  if (afterRows.some(item => movingIds.has(item.id) && ['task', 'subcheck'].includes(item.kind)
    && ((item.ancestorScopeId ?? 'folder-unfiled') !== folderId || item.scopeMismatch))) return fail('meaning-changed');
  if (after.length !== beforeTasks.length || beforeTasks.some(previous => {
    const now = afterById.get(previous.id); if (!now) return true;
    const keys: (keyof TextTask)[] = selected.has(previous.id) ? ['docId', 'title', 'done', 'note'] : ['docId', 'title', 'done', 'note', 'date', 'time', 'scopeId'];
    if (keys.some(key => now[key] !== previous[key])) return true;
    if (selected.has(previous.id) && (now.scopeId !== folderId || now.time !== (previous.id === task.id && target.kind === 'date' && target.time !== undefined ? target.time || null : previous.time))) return true;
    if (selected.has(previous.id) && target.kind !== 'date' && now.date !== previous.date) return true;
    if (previous.id === task.id && target.kind === 'date' && (now.date !== date || now.explicitDate)) return true;
    return false;
  }) || selectedRows.some(item => !removed.has(item.id) && !editedTime.has(item.id) && !afterRows.some(now => now.id === item.id))
    || JSON.stringify(state.progressRecords) !== JSON.stringify(next.progressRecords)) return fail('meaning-changed');
  return { ok: true, next, documentId: doc.id, taskId: task.id, lineIds: moved.map(line => line.id), date, folderId,
    createdFolder, declarations: additions.length, changed: JSON.stringify(next) !== JSON.stringify(state) };
}
