import { programId } from './contract';
import { programDate } from './program-data';
import { programDateHeadIndex } from './input-bar';
import { readProgramRepeatMarker } from './repeat-line';
import { textWorkspaceModel as M, type TextLine, type TextRow, type TextTask, type TextWorkspaceState } from './text-workspace';

export type TaskLocationTarget = { kind: 'date'; date: string | null; time?: string }
  | { kind: 'folder'; folderId: string } | { kind: 'new-folder'; title: string };
export type TaskLocationFailure = 'missing' | 'protected' | 'mixed-subtree' | 'invalid-date' | 'invalid-folder'
  | 'duplicate-folder' | 'too-deep' | 'unsafe-position' | 'meaning-changed';
export type TaskLocationMove = { ok: true; next: TextWorkspaceState; documentId: string; taskId: string;
  lineIds: string[]; date: string | null; folderId: string; createdFolder: boolean; declarations: number;
  changed: boolean; /** Redesign 3: set when a document without date headings took the date as its 마감 (null: none). */
  due?: string | null } | { ok: false; reason: TaskLocationFailure };

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

/** Codex P2-1 (11/12): a '- 마감:' written without its year (M/D) reads the year of the date section it sits in. A move
 *  into a section of another year (or none) writes the year it had, so the day it meant stays. */
export function programKeepDueYears(lines: TextLine[], rows: ReadonlyMap<string, TextRow>, toYear: string | null): TextLine[] {
  return lines.map(line => {
    const row = rows.get(line.id), short = /^( *-\s+마감:\s*)(\d{1,2})[/.-](\d{1,2})\s*$/.exec(line.text);
    if (!row || !short || row.kind !== 'property' || !row.groupDate || row.groupDate.slice(0, 4) === toYear) return line;
    const full = `${row.groupDate.slice(0, 4)}-${short[2].padStart(2, '0')}-${short[3].padStart(2, '0')}`;
    return programDate(full) ? { id: line.id, text: short[1] + full } : line;
  });
}
const dueOf = (state: TextWorkspaceState, documentId: string) => new Map(M.parseDocument(M.getDocument(state, documentId)!, state).items.map(item => [item.id, item.due ?? null]));

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
  // Redesign 3 (DECISION-1 끝, W-TXT-03, W-NLDATE-07): in a document without date headings a date given to a task is its
  // 마감. The line stays where it is and no heading is made.
  if (target.kind === 'date' && !rows.some(item => item.kind === 'date')) return dueInPlace(state, source, target);
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
    // 11/11 dateslot: a dated head goes where the writing bar's date chip would make it (R1, the document's date order),
    // not after the oldest day of a newest-first document; `[미정]` stays at the end.
    const line = addLine(`[${date ?? '미정'}]`), index = date ? programDateHeadIndex(remaining.map(item => item.text), date) : remaining.length;
    // Redesign 3 (mockup ③): a blank line keeps the new day apart from the lines before it, as the writing bar's date chip does.
    const apart = index > 0 && remaining[index - 1].text.trim() ? [addLine('')] : [];
    remaining = [...remaining.slice(0, index), ...apart, line, ...remaining.slice(index)];
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
  moved = programKeepDueYears(moved, byId, date?.slice(0, 4) ?? null).map(line => {
    const meta = byId.get(line.id)!;
    if (!line.text.trim() || meta.kind === 'fence' && !/^ *(?:`{3,}|~{3,})/.test(line.text)) return line;
    return { id: line.id, text: '  '.repeat(meta.depth + depth - row.depth) + line.text.trimStart() };
  });
  let lines = [...remaining.slice(0, at), ...additions, ...moved, ...remaining.slice(at)], kept = bindings;
  // 총괄 11/12 (redesign 3): a folder line the block leaves with nothing under it in its day goes in the same change
  // (innermost first; one still holding a line stays, and so do those above it). Codex P1-2 (11/12): only empty lines
  // ('') are nothing; a line of spaces the person left under it is something (it stays, and the folder line with it).
  for (let up = row.parentLineId; up;) {
    const folderRow = workingRows.find(item => item.id === up);
    if (!folderRow) break;
    up = folderRow.parentLineId;
    if (folderRow.kind !== 'scope' || folderRow.scopeKind !== 'folder') continue;
    const now = M.parseDocument({ ...workingDoc, lines }, { ...working, folders, bindings: kept, documents: working.documents.map(item => item.id === doc.id ? { ...item, lines } : item) }).rows;
    const at = now.find(item => item.id === folderRow.id);
    if (!at || now.slice(at.index + 1, at.subtreeEndIndex).some(item => item.kind !== 'blank' || item.text !== '')) break;
    lines = lines.filter(line => line.id !== folderRow.id); kept = kept.filter(binding => binding.lineId !== folderRow.id);
  }
  const taskScopes = { ...working.taskScopes }, itemScopes = { ...working.itemScopes };
  for (const id of movingIds) { if (Object.hasOwn(taskScopes, id)) taskScopes[id] = folderId; if (Object.hasOwn(itemScopes, id)) itemScopes[id] = folderId; }
  const next: TextWorkspaceState = { ...working, folders, bindings: kept, taskScopes, itemScopes,
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
  // Every 마감 means the day it meant (Codex P2-1).
  const duesBefore = dueOf(state, doc.id), duesAfter = dueOf(next, doc.id);
  if ([...duesBefore].some(([id, due]) => duesAfter.has(id) && duesAfter.get(id) !== due)) return fail('meaning-changed');
  return { ok: true, next, documentId: doc.id, taskId: task.id, lineIds: moved.map(line => line.id), date, folderId,
    createdFolder, declarations: additions.length, changed: JSON.stringify(next) !== JSON.stringify(state) };
}

/** The headless case of moveTaskLocation: its own '- 날짜:' lines go; its last '- 마감:' says the day (one is made under
 *  its other property lines when it has none); 날짜 미정 takes the 마감 away. Nothing else changes. */
function dueInPlace(state: TextWorkspaceState, source: NonNullable<ReturnType<typeof readTaskLocationSource>>, target: { kind: 'date'; date: string | null; time?: string }): TaskLocationMove {
  const { doc, rows, row, task, selection } = source;
  const own = rows.filter(item => item.kind === 'property' && item.parentLineId === task.id);
  const dates = new Set(own.filter(item => /^ *-\s+날짜:/.test(item.text)).map(item => item.id));
  const dues = own.filter(item => /^ *-\s+마감:/.test(item.text)), last = dues.at(-1);
  let lines = doc.lines.filter(line => !dates.has(line.id) && !(target.date === null && dues.some(item => item.id === line.id)));
  if (target.date !== null && last) lines = lines.map(line => line.id === last.id ? { id: line.id, text: line.text.replace(/(마감:\s*).*$/, `$1${target.date}`) } : line);
  else if (target.date !== null) {
    const after = [task.id, ...own.filter(item => !dates.has(item.id)).map(item => item.id)].at(-1)!, index = lines.findIndex(line => line.id === after);
    lines = [...lines.slice(0, index + 1), { id: programId('line'), text: `${'  '.repeat(row.depth + 1)}- 마감: ${target.date}` }, ...lines.slice(index + 1)];
  }
  let next: TextWorkspaceState = { ...state, documents: state.documents.map(item => item.id === doc.id ? { ...item, lines } : item) };
  if (target.time !== undefined && target.time !== (task.time ?? '')) next = M.updateTask(next, task.id, { time: target.time });
  if (!M.validate(next)) return { ok: false, reason: 'unsafe-position' };
  const before = new Map(M.tasks(state).map(item => [item.id, item])), after = M.tasks(next), now = after.find(item => item.id === task.id);
  if (!now || now.date !== null || now.explicitDate || (target.date === null ? now.due !== undefined : now.due !== target.date) || after.length !== before.size
    || after.some(item => { const was = before.get(item.id); return !was || (['docId', 'title', 'done', 'note', 'scopeId'] as const).some(key => item[key] !== was[key])
      || item.id !== task.id && (item.date !== was.date || item.time !== was.time); })
    || JSON.stringify(state.progressRecords) !== JSON.stringify(next.progressRecords)) return { ok: false, reason: 'meaning-changed' };
  return { ok: true, next, documentId: doc.id, taskId: task.id, lineIds: selection.lineIds, date: null, folderId: task.scopeId,
    createdFolder: false, declarations: 0, changed: JSON.stringify(next) !== JSON.stringify(state), due: target.date };
}
