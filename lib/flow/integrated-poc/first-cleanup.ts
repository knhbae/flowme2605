import { programClone, programId, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { programDate } from './program-data';
import { programExecutionDocument, transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programSameTaskKey } from './continue-band';
import { programContinuedLines, programFolderPath } from './continuation';
import { programStateHash, programTaskRepeatMembers } from './task-date-move';
import { programDaysBetween } from './date-label';
import { moveTaskLocation } from './task-location-move';
import { PROGRAM_MERGE_ARCHIVE_TITLE, programArchiveOriginals, programDocumentStateHash } from './text-cleanup';
import { textWorkspaceModel as M, type TextBinding, type TextLine, type TextTask, type TextWorkspaceState } from './text-workspace';

/** 오늘 탭 처음 정리 ② (W-CARRY-13, 총괄 11/12; mockup ②): a past open task already written again on a later day is
 *  closed as a day's record: `[>]` and `- 이어감: <that day>` (with its % when its line has one). Asked once, listed
 *  first, applied only to the lines the person keeps chosen; one save, ↶ once (restoreProgramCarryover's exact proof).
 *
 *  A line is listed only when its closing can be read back without a guess: the later line is the one task of the same
 *  words (programSameTaskKey) on the nearest later day up to today, in the same folder path (the same document first),
 *  and nothing would change but the line's mark and its new 이어감 line. Left as they are: a line with progress records
 *  (they belong to its task, which a [>] line is not), a linked line (a reference, or one referenced), a repeat line,
 *  one with an open subtask (it would stand on its own), one in a copy's, a Flow run's, an archived or a deleted
 *  document. */
export type ProgramContinuedClose = { documentId: string; lineId: string; title: string; day: string; to: string; percent: number | null };

const TASK_MARK = /^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))(.*?)(\s*)$/;

function usableDocument(space: ProgramPrivateSpace, documentId: string): boolean {
  return space.text.documents.some(doc => doc.id === documentId) && !space.archivedDocumentIds.includes(documentId) && !space.documentTrash?.[documentId]
    && !space.copies.some(copy => copy.documentId === documentId) && !space.savedBindings.some(binding => binding.documentId === documentId)
    && !programExecutionDocument(space, documentId);
}

/** The lines the sheet lists, oldest day first, in document order within a day. */
export function programAlreadyContinuedPlan(space: ProgramPrivateSpace, today: string): ProgramContinuedClose[] {
  if (!programDate(today)) return [];
  const text = space.text, repeats = programTaskRepeatMembers(space);
  const usable = new Map(text.documents.map(doc => [doc.id, usableDocument(space, doc.id)]));
  const recorded = new Set(text.progressRecords.map(record => record.taskId));
  const linked = new Set(text.bindings.flatMap(binding => binding.kind === 'task' ? [binding.taskId, binding.lineId] : []));
  const tasks = M.tasks(text).filter(task => usable.get(task.docId) && task.scopeKind === 'folder' && task.date && task.date <= today);
  const place = (task: TextTask) => `${programSameTaskKey(task.title)}|${programFolderPath(text, task.scopeId)}`;
  const byPlace = new Map<string, TextTask[]>();
  for (const task of tasks) byPlace.set(place(task), [...byPlace.get(place(task)) ?? [], task]);
  const out: ProgramContinuedClose[] = [];
  for (const task of tasks) {
    if (task.done || task.date! >= today || task.explicitDate || task.groupDate !== task.date) continue;
    if (recorded.has(task.id) || linked.has(task.id) || repeats.has(task.id) || task.subchecks.some(sub => !sub.done)) continue;
    const percent = task.inputPercent ?? null;
    if (percent === 100) continue;
    const later = (byPlace.get(place(task)) ?? []).filter(other => other.id !== task.id && other.date! > task.date!);
    if (!later.length) continue;
    const to = later.reduce((day, other) => other.date! < day ? other.date! : day, '9999-99-99');
    const there = later.filter(other => other.date === to), here = there.filter(other => other.docId === task.docId);
    if ((here.length ? here : there).length !== 1) continue;
    out.push({ documentId: task.docId, lineId: task.id, title: task.title, day: task.date!, to, percent: percent && percent > 0 ? percent : null });
  }
  // Two past lines of one later line would read back as ambiguous (programContinuedLines): neither is listed.
  const receivers = new Map<string, number>();
  const receiverOf = (entry: ProgramContinuedClose) => `${programSameTaskKey(entry.title)}|${entry.to}|${programFolderPath(text, M.tasks(text).find(task => task.id === entry.lineId)?.scopeId)}`;
  for (const entry of out) receivers.set(receiverOf(entry), (receivers.get(receiverOf(entry)) ?? 0) + 1);
  return out.filter(entry => receivers.get(receiverOf(entry)) === 1).sort((a, b) => a.day.localeCompare(b.day));
}

/** The chosen lines closed in one document's text, every other line kept with its id. Null when the model refuses it. */
function closeLines(text: TextWorkspaceState, documentId: string, chosen: ReadonlyMap<string, ProgramContinuedClose>): TextWorkspaceState | null {
  const doc = M.getDocument(text, documentId);
  if (!doc) return null;
  const rows = new Map(M.parseDocument(doc, text).rows.map(row => [row.id, row]));
  const lines: (TextLine | { id: null; text: string })[] = [];
  for (const line of doc.lines) {
    const entry = chosen.get(line.id), parts = entry ? TASK_MARK.exec(line.text) : null;
    if (!entry) { lines.push(line); continue; }
    if (!parts) return null;
    lines.push({ id: line.id, text: `${parts[1]}>${parts[3]}${parts[4]}${parts[5]}` });
    lines.push({ id: null, text: `${'  '.repeat((rows.get(line.id)?.depth ?? 0) + 1)}- 이어감: ${entry.to}${entry.percent !== null ? ` · ${entry.percent}%` : ''}` });
  }
  const edited = M.editTextResult(text, documentId, lines.map(line => line.text).join('\n'), { folderText: true, lineIds: lines.map(line => line.id) });
  return edited.reason === null ? edited.state : null;
}

/** [다시 쓴 것으로 정리]: the chosen lines, each still listed as it was shown; one save. */
export function closeProgramAlreadyContinued(data: ProgramData, input: ProgramPrivateMutationBase & { today: string; lines: ProgramContinuedClose[] }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-first-cleanup-close', { today: input.today, lines: input.lines }, space => {
    if (!input.lines.length) return { result: '0', reason: 'invalid' };
    const listed = new Map(programAlreadyContinuedPlan(space, input.today).map(entry => [entry.lineId, entry]));
    if (new Set(input.lines.map(entry => entry.lineId)).size !== input.lines.length
      || input.lines.some(entry => !listed.has(entry.lineId) || !programSame(listed.get(entry.lineId), entry))) return { result: '0', reason: 'conflict' };
    const before = space.text, chosen = new Map(input.lines.map(entry => [entry.lineId, entry]));
    let next = before;
    for (const documentId of new Set(input.lines.map(entry => entry.documentId))) {
      const closed = closeLines(next, documentId, chosen);
      if (!closed) return { result: '0', reason: 'unresolved' };
      next = closed;
    }
    if (!M.validate(next) || !keepsEverythingElse(before, next, chosen)) return { result: '0', reason: 'unresolved' };
    // Read back: each closed line is received by its later line, with nothing guessed.
    const read = new Map(programContinuedLines(next).map(line => [line.lineId, line]));
    if (input.lines.some(entry => { const line = read.get(entry.lineId); return !line || line.to !== entry.to || !line.received || line.ambiguous; })) return { result: '0', reason: 'unresolved' };
    space.text = next;
    return { result: String(input.lines.length) };
  });
}

/** W-CARRY-13's machine check: every line is still there with its words (a closed line's mark aside), the only new
 *  lines are the 이어감 lines, and every other task and subtask, every record and link reads as before. */
function keepsEverythingElse(before: TextWorkspaceState, after: TextWorkspaceState, chosen: ReadonlyMap<string, ProgramContinuedClose>): boolean {
  if (!programSame(before.progressRecords, after.progressRecords) || !programSame(before.folders, after.folders)) return false;
  const now = new Map(after.documents.flatMap(doc => doc.lines.map(line => [line.id, line.text] as const)));
  const was = new Set(before.documents.flatMap(doc => doc.lines.map(line => line.id)));
  for (const doc of before.documents) for (const line of doc.lines) {
    const text = now.get(line.id);
    if (text === undefined) return false;
    if (chosen.has(line.id) ? text.replace(/^( *-\s+\[)>\]/, '') !== line.text.replace(/^( *-\s+\[)[^\]]*\]/, '') : text !== line.text) return false;
  }
  if ([...now].some(([id, text]) => !was.has(id) && !/^ *- 이어감: \d{4}-\d{2}-\d{2}( · \d{1,2}%)?$/.test(text))) return false;
  if ([...now].filter(([id]) => !was.has(id)).length !== chosen.size) return false;
  const items = (text: TextWorkspaceState) => new Map(text.documents.flatMap(doc => M.parseDocument(doc, text).items.map(item => [item.id, item] as const)));
  const old = items(before), fresh = items(after);
  const under = new Set([...chosen.keys()].flatMap(id => old.get(id)?.subchecks.map(sub => sub.id) ?? []));
  for (const [id, item] of old) {
    if (chosen.has(id)) { if (fresh.has(id)) return false; continue; }
    const current = fresh.get(id);
    if (!current || (['title', 'done', 'date', 'time', 'docId'] as const).some(key => current[key] !== item[key])) return false;
    // A closed line's done subtasks stay that day's done lines, now on their own.
    if (!under.has(id) && (current.note !== item.note || current.parentItemId !== item.parentItemId || (current.due ?? null) !== (item.due ?? null))) return false;
  }
  return true;
}

/** 오늘 탭 처음 정리 ③ (W-CARRY-15·18·19, 총괄 11/12, mockup ②·⑦): a past open task left alone more than 14 days (its
 *  section's day; no record since, not continued) goes, line by line as chosen, to 날짜 미정 (the document's `[미정]`
 *  section, under the same folder, as 위치 옮기기 does) or to 휴지통: the account's one '버린 할 일' document, known by
 *  its fixed id and kept in documentTrash (so every list, count and search already leaves it out), the block moved whole
 *  with its line ids (records and owners follow) under `[원래 날짜]` → `- 원래 글: 이름` → its folder lines (written once
 *  per day and document there). Not to 휴지통: a linked task. Not listed: a block holding a folder line, a reference or
 *  a repeat line, and tasks in copies, Flow runs, archived or deleted documents. One save; ↶ is restoreProgramFirstCleanup. */
export const PROGRAM_TRASH_DOCUMENT_ID = 'doc-flowme-trash', PROGRAM_TRASH_TITLE = '버린 할 일', PROGRAM_STALE_DAYS = 14;
export type ProgramStaleLine = { documentId: string; lineId: string; title: string; day: string; folder: string; trashable: boolean };
export type ProgramStaleChoice = 'undated' | 'trash';

export function programStalePlan(space: ProgramPrivateSpace, today: string): ProgramStaleLine[] {
  if (!programDate(today)) return [];
  const text = space.text, repeats = programTaskRepeatMembers(space);
  const linked = new Set(text.bindings.flatMap(binding => binding.kind === 'task' ? [binding.taskId, binding.lineId] : []));
  const out: ProgramStaleLine[] = [];
  for (const task of M.tasks(text)) {
    if (!usableDocument(space, task.docId) || task.scopeKind !== 'folder' || task.done || !task.date || task.explicitDate || task.groupDate !== task.date) continue;
    if (programDaysBetween(task.date, today) <= PROGRAM_STALE_DAYS || repeats.has(task.id)) continue;
    const ids = new Set([task.id, ...task.subchecks.map(sub => sub.id)]);
    if (text.progressRecords.some(record => ids.has(record.taskId) && record.date > task.date!)) continue; // touched since
    const rows = M.parseDocument(M.getDocument(text, task.docId)!, text).rows, row = rows.find(entry => entry.id === task.id);
    if (!row || rows.slice(row.index + 1, row.subtreeEndIndex).some(entry => entry.kind === 'scope' || /^ *- \//.test(entry.text) || linked.has(entry.id)
      || (entry.kind === 'task' || entry.kind === 'subcheck') && !!entry.title && repeats.has(entry.id))) continue;
    out.push({ documentId: task.docId, lineId: task.id, title: task.title, day: task.date, folder: programFolderPath(text, task.scopeId), trashable: !linked.has(task.id) });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

/** The task block moved whole into '버린 할 일' (made when missing). Null when anything would read otherwise. */
function moveToTrash(text: TextWorkspaceState, documentId: string, taskId: string): TextWorkspaceState | null {
  const source = M.getDocument(text, documentId);
  if (!source || documentId === PROGRAM_TRASH_DOCUMENT_ID) return null;
  const rows = M.parseDocument(source, text).rows, row = rows.find(entry => entry.id === taskId);
  if (!row || !row.groupDate) return null;
  let end = row.subtreeEndIndex;
  while (end > row.index + 1 && !source.lines[end - 1].text.trim()) end -= 1;
  const block = source.lines.slice(row.index, end), blockIds = new Set(block.map(line => line.id));
  // Its folder lines, outermost first, with the folders they are linked to.
  const chain: { title: string; scopeId: string }[] = [];
  for (let up = row.parentLineId; up;) {
    const folder = rows.find(entry => entry.id === up);
    if (!folder) return null;
    if (folder.kind === 'scope' && folder.scopeKind === 'folder' && folder.scopeId) chain.unshift({ title: text.folders.find(entry => entry.id === folder.scopeId)?.title ?? '', scopeId: folder.scopeId });
    up = folder.parentLineId;
  }
  if (chain.some(entry => !entry.title)) return null;
  const next = programClone(text), bindings: TextBinding[] = next.bindings;
  let bin = M.getDocument(next, PROGRAM_TRASH_DOCUMENT_ID);
  if (!bin) {
    const unfiled = next.folders.find(folder => folder.id === 'folder-unfiled') ?? next.folders[0];
    bin = { id: PROGRAM_TRASH_DOCUMENT_ID, title: PROGRAM_TRASH_TITLE, folder: unfiled.title, folderId: unfiled.id, lines: [] };
    next.documents.push(bin);
  }
  const target = next.documents.find(doc => doc.id === PROGRAM_TRASH_DOCUMENT_ID)!;
  // The group of that day and document, if the last one is it; else a new one at the end.
  const head = `[${row.groupDate}]`, from = `- 원래 글: ${source.title || '새 문서'}`;
  const lines = target.lines, at = lines.map(line => line.text).lastIndexOf(head);
  const group = at >= 0 && lines[at + 1]?.text === from && !lines.slice(at + 2).some(line => /^\[[^\]]*\]$/.test(line.text.trim())) ? at : -1;
  const fresh = (text: string) => ({ id: programId('line'), text });
  const depth = chain.length, moved = block.map(line => ({ id: line.id, text: line.text.trim() ? '  '.repeat(depth + Math.max(0, (rows.find(entry => entry.id === line.id)?.depth ?? 0) - row.depth)) + line.text.trimStart() : line.text }));
  const declare = (index: number) => { const line = fresh(`${'  '.repeat(index)}- /${chain[index].title}`); bindings.push({ kind: 'scope', docId: PROGRAM_TRASH_DOCUMENT_ID, lineId: line.id, scopeId: chain[index].scopeId }); return line; };
  let reuse = -1;
  if (group >= 0 && depth) {
    // Folder lines are written once per day and document: the block goes under the same chain when it is there.
    const parsed = M.parseDocument(target, next).rows.slice(group + 2);
    const innermost = parsed.find(entry => entry.kind === 'scope' && entry.scopeId === chain[depth - 1].scopeId && entry.depth === depth - 1);
    if (innermost) reuse = innermost.subtreeEndIndex;
  } else if (group >= 0 && !depth) reuse = lines.length;
  if (reuse >= 0) { while (reuse > 0 && !lines[reuse - 1].text.trim()) reuse -= 1; lines.splice(reuse, 0, ...moved); }
  else lines.push(...(lines.length && lines.at(-1)!.text.trim() ? [fresh('')] : []), fresh(head), fresh(from), ...chain.map((_, index) => declare(index)), ...moved);
  // Out of its document; a folder line left with nothing under it in its day goes with its link (as a move does).
  const doc = next.documents.find(entry => entry.id === documentId)!;
  doc.lines = doc.lines.filter(line => !blockIds.has(line.id));
  for (let up = row.parentLineId; up;) {
    const folder = rows.find(entry => entry.id === up)!;
    up = folder.parentLineId;
    if (folder.kind !== 'scope') continue;
    const now = M.parseDocument(doc, next).rows, there = now.find(entry => entry.id === folder.id);
    if (!there || now.slice(there.index + 1, there.subtreeEndIndex).some(entry => entry.kind !== 'blank' || entry.text !== '')) break;
    doc.lines = doc.lines.filter(line => line.id !== folder.id);
    next.bindings = next.bindings.filter(binding => binding.lineId !== folder.id);
  }
  return M.validate(next) ? next : null;
}

/** [적용]: the chosen lines, each still listed as it was shown, to 날짜 미정 or 휴지통; one save. */
export function sendProgramStaleTasks(data: ProgramData, input: ProgramPrivateMutationBase & { today: string; now: string; lines: { lineId: string; choice: ProgramStaleChoice }[] }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-first-cleanup-stale', { today: input.today, now: input.now, lines: input.lines }, space => {
    if (!input.lines.length || new Set(input.lines.map(line => line.lineId)).size !== input.lines.length || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(input.now)) return { result: '0', reason: 'invalid' };
    const listed = new Map(programStalePlan(space, input.today).map(line => [line.lineId, line]));
    if (input.lines.some(line => !listed.has(line.lineId) || !['undated', 'trash'].includes(line.choice) || line.choice === 'trash' && !listed.get(line.lineId)!.trashable)) return { result: '0', reason: 'conflict' };
    const before = space.text;
    let text = before;
    for (const line of input.lines) {
      const entry = listed.get(line.lineId)!;
      if (line.choice === 'undated') {
        const moved = moveTaskLocation(text, { documentId: entry.documentId, taskId: entry.lineId, target: { kind: 'date', date: null } });
        if (!moved.ok || moved.due !== undefined) return { result: '0', reason: 'unresolved' };
        text = moved.next;
      } else {
        const moved = moveToTrash(text, entry.documentId, entry.lineId);
        if (!moved) return { result: '0', reason: 'unresolved' };
        text = moved;
      }
    }
    // Nothing reads otherwise but where the chosen tasks are: their words, state, memo and owners, every record.
    const items = (state: TextWorkspaceState) => new Map(state.documents.flatMap(doc => M.parseDocument(doc, state).items.map(item => [item.id, item] as const)));
    const old = items(before), now = items(text), chosen = new Map(input.lines.map(line => [line.lineId, line.choice]));
    if (!programSame(before.progressRecords, text.progressRecords) || !programSame(before.taskScopes, text.taskScopes) || !programSame(before.itemScopes, text.itemScopes) || old.size !== now.size) return { result: '0', reason: 'unresolved' };
    for (const [id, item] of old) {
      const current = now.get(id), owner = chosen.has(id) ? id : item.parentTaskId && chosen.has(item.parentTaskId) ? item.parentTaskId : null;
      if (!current || (['title', 'done', 'note', 'time'] as const).some(key => current[key] !== item[key])) return { result: '0', reason: 'unresolved' };
      if (!owner) { if (current.date !== item.date || current.docId !== item.docId) return { result: '0', reason: 'unresolved' }; continue; }
      if (chosen.get(owner) === 'undated' ? current.date !== null || current.docId !== item.docId : current.docId !== PROGRAM_TRASH_DOCUMENT_ID || current.date !== item.date) return { result: '0', reason: 'unresolved' };
    }
    if (input.lines.some(line => line.choice === 'trash')) {
      space.documentTrash ??= {};
      if (!space.documentTrash[PROGRAM_TRASH_DOCUMENT_ID]) space.documentTrash[PROGRAM_TRASH_DOCUMENT_ID] = { trashedAt: input.now, wasArchived: false };
      if (!space.archivedDocumentIds.includes(PROGRAM_TRASH_DOCUMENT_ID)) space.archivedDocumentIds = [...space.archivedDocumentIds, PROGRAM_TRASH_DOCUMENT_ID];
    }
    space.text = text;
    return { result: String(input.lines.length) };
  });
}

/** What ↶ of a first-cleanup step puts back: the fields its saves change, exactly as they were. */
export type ProgramFirstCleanupBefore = Pick<ProgramPrivateSpace, 'text' | 'timelineOrders' | 'position' | 'archivedDocumentIds'> & { documentTrash: ProgramPrivateSpace['documentTrash'] | null };
const sortedKeys = (_: string, value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value;
export const programFirstCleanupBefore = (space: ProgramPrivateSpace): ProgramFirstCleanupBefore =>
  programClone({ text: space.text, timelineOrders: space.timelineOrders, position: space.position, archivedDocumentIds: space.archivedDocumentIds, documentTrash: space.documentTrash ?? null });
export const programFirstCleanupProof = (space: ProgramPrivateSpace | ProgramFirstCleanupBefore) =>
  programStateHash(JSON.stringify([space.text, space.timelineOrders, space.position, space.archivedDocumentIds, space.documentTrash ?? null], sortedKeys));
/** ↶: exactly as before the step, only while everything it changed is exactly as it left it. */
export function restoreProgramFirstCleanup(data: ProgramData, input: ProgramPrivateMutationBase & { before: ProgramFirstCleanupBefore; after: string }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-first-cleanup-undo', { after: input.after, before: programFirstCleanupProof(input.before) }, space => {
    if (programFirstCleanupProof(space) !== input.after) return { result: input.after, reason: 'conflict' };
    if (!M.validate(input.before.text)) return { result: input.after, reason: 'invalid' };
    const before = programClone(input.before);
    space.text = before.text; space.timelineOrders = before.timelineOrders; space.position = before.position; space.archivedDocumentIds = before.archivedDocumentIds;
    if (before.documentTrash) space.documentTrash = before.documentTrash; else delete space.documentTrash;
    return { result: input.after };
  });
}

/** 오늘 탭 처음 정리 ① (W-CARRY-20, 총괄 11/12): two documents of the same title whose shorter one is 90% or more the same
 *  lines word for word. [하나로 합치기] keeps the one with more lines (equal: the later one) and writes into it the
 *  lines only the other has, each where it stood among the common lines (so in the same date section, under the same
 *  task or folder), with their ids (records and owners follow); the other goes to 휴지통's [지운 글]. One save, ↶ once,
 *  and the kept document's text before it is archived ('합치기 전 원문 · when'). Not merged (only [비교해 보기]) when a
 *  common line of the other has a record or a link of its own, or one of its own lines is linked. */
export type ProgramTwinDocuments = { keep: string; drop: string; title: string; keepLines: number; dropLines: number; common: number; only: { text: string; mine: boolean }[]; blocked: boolean };
type Aligned = { keep: number | null; drop: number | null };
function align(a: readonly string[], b: readonly string[]): Aligned[] {
  const grid = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) grid[i][j] = a[i] === b[j] ? grid[i + 1][j + 1] + 1 : Math.max(grid[i + 1][j], grid[i][j + 1]);
  const out: Aligned[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push({ keep: i++, drop: j++ }); continue; }
    if (grid[i + 1][j] >= grid[i][j + 1]) out.push({ keep: i++, drop: null }); else out.push({ keep: null, drop: j++ });
  }
  while (i < a.length) out.push({ keep: i++, drop: null });
  while (j < b.length) out.push({ keep: null, drop: j++ });
  return out;
}
export function programTwinDocuments(space: ProgramPrivateSpace): ProgramTwinDocuments[] {
  const text = space.text, docs = text.documents.filter(doc => usableDocument(space, doc.id) && doc.title.trim() && doc.lines.length && doc.lines.length <= 1200);
  const linked = new Set(text.bindings.flatMap(binding => binding.kind === 'task' ? [binding.taskId, binding.lineId] : []));
  const recorded = new Set(text.progressRecords.map(record => record.taskId));
  const out: ProgramTwinDocuments[] = [], used = new Set<string>();
  docs.forEach((one, index) => docs.slice(index + 1).forEach(two => {
    if (one.title.trim() !== two.title.trim() || used.has(one.id) || used.has(two.id)) return;
    const [keep, drop] = two.lines.length > one.lines.length || two.lines.length === one.lines.length ? [two, one] : [one, two];
    const aligned = align(keep.lines.map(line => line.text), drop.lines.map(line => line.text)), common = aligned.filter(pair => pair.keep !== null && pair.drop !== null);
    if (common.length < Math.ceil(Math.min(keep.lines.length, drop.lines.length) * 0.9)) return;
    used.add(keep.id); used.add(drop.id);
    const blocked = common.some(pair => { const id = drop.lines[pair.drop!].id; return recorded.has(id) || linked.has(id); })
      || aligned.some(pair => pair.drop !== null && pair.keep === null && linked.has(drop.lines[pair.drop].id));
    out.push({ keep: keep.id, drop: drop.id, title: keep.title, keepLines: keep.lines.length, dropLines: drop.lines.length, common: common.length,
      only: aligned.filter(pair => pair.keep === null || pair.drop === null).map(pair => pair.keep !== null ? { text: keep.lines[pair.keep].text, mine: true } : { text: drop.lines[pair.drop!].text, mine: false }), blocked });
  }));
  return out;
}
/** [하나로 합치기]: only while the two read as they were shown. */
export function mergeProgramTwinDocuments(data: ProgramData, input: ProgramPrivateMutationBase & { keep: string; drop: string; now: string; when: string }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-first-cleanup-merge', { keep: input.keep, drop: input.drop, now: input.now, when: input.when }, space => {
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(input.now) || !/^[0-9][0-9 :.-]{0,39}$/.test(input.when)) return { result: input.keep, reason: 'invalid' };
    const twin = programTwinDocuments(space).find(entry => entry.keep === input.keep && entry.drop === input.drop);
    if (!twin) return { result: input.keep, reason: 'conflict' };
    if (twin.blocked) return { result: input.keep, reason: 'forbidden' };
    const before = space.text, keep = M.getDocument(before, input.keep)!, drop = M.getDocument(before, input.drop)!;
    const aligned = align(keep.lines.map(line => line.text), drop.lines.map(line => line.text));
    const moved = new Set(aligned.filter(pair => pair.keep === null).map(pair => drop.lines[pair.drop!].id));
    const merged = aligned.map(pair => pair.keep !== null ? keep.lines[pair.keep] : drop.lines[pair.drop!]);
    let next: TextWorkspaceState = { ...before,
      documents: before.documents.map(doc => doc.id === keep.id ? { ...doc, lines: merged } : doc.id === drop.id ? { ...doc, lines: doc.lines.filter(line => !moved.has(line.id)) } : doc),
      bindings: before.bindings.map(binding => binding.docId === drop.id && moved.has(binding.lineId) ? { ...binding, docId: keep.id } : binding) };
    if (!M.validate(next)) return { result: input.keep, reason: 'unresolved' };
    // Every task reads as before (its words, state, memo, day), the moved ones now in the kept document; every record too.
    const items = (state: TextWorkspaceState) => new Map(state.documents.flatMap(doc => M.parseDocument(doc, state).items.map(item => [item.id, item] as const)));
    const old = items(before), now = items(next);
    if (!programSame(before.progressRecords, next.progressRecords) || !programSame(before.taskScopes, next.taskScopes) || old.size !== now.size) return { result: input.keep, reason: 'unresolved' };
    for (const [id, item] of old) {
      const current = now.get(id);
      if (!current || (['title', 'done', 'note', 'time', 'date'] as const).some(key => current[key] !== item[key])
        || current.docId !== (moved.has(id) ? keep.id : item.docId)) return { result: input.keep, reason: 'unresolved' };
    }
    // The kept document's text before it, archived in the same save; the other to 휴지통 [지운 글] (never deleted).
    const stamp = programId('cleanup');
    const archived = programArchiveOriginals(before, [keep.id], stamp, `${PROGRAM_MERGE_ARCHIVE_TITLE} · ${input.when}`,
      new Map([[keep.id, { before: programDocumentStateHash(before, keep.id)!, after: programDocumentStateHash(next, keep.id)! }]]));
    if (!archived) return { result: input.keep, reason: 'limit' };
    next = { ...next, documents: [...next.documents, ...archived.text.documents.filter(doc => archived.ids.includes(doc.id))] };
    if (!M.validate(next)) return { result: input.keep, reason: 'unresolved' };
    const wasArchived = space.archivedDocumentIds.includes(drop.id);
    space.text = next;
    space.archivedDocumentIds = [...space.archivedDocumentIds, ...archived.ids, ...(wasArchived ? [] : [drop.id])];
    space.documentTrash = { ...space.documentTrash ?? {}, [drop.id]: { trashedAt: input.now, wasArchived } };
    return { result: input.keep };
  });
}