import { programClone, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programDate } from './program-data';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programDateHeaderPlan } from './input-bar';
import { programFolderAncestry, programTaskFolderId, PROGRAM_UNFILED_FOLDER } from './folder-screen';
import { programCarryoverBefore, programCarryoverProof, type ProgramCarryoverBefore } from './carryover';
import { programDocumentContentLock, programPreservesLockedDocumentContent } from './reference-execution-guard';
import { PROGRAM_WRITING_ENTRY_TITLE } from './writing-entry';
import { textWorkspaceModel as M, type TextRow, type TextTask } from './text-workspace';

/** F4-b (11/9, PRD FR-7): the folder screen's '＋ 오늘 할 일'. One line written into the document I write in (home), under
 *  today's head line, under this folder's line there. What is missing is made in the fewest lines, never moving another:
 *  - today's head line only where 쓰기's date chip would put it (R1: right before another head line, or at the end);
 *  - the folder's line at the end of today's part, or, for a subfolder, under its nearest parent line written today
 *    (a subfolder's line has to sit under its parent's to be that folder);
 *  - 미분류: no folder line, at the end of today's part.
 *  Never the old '빠른 할 일' document. One save; its 되돌리기 puts the writing back exactly (one ↶). */

export const PROGRAM_FOLDER_TODAY_TITLE_MAX = 500;

/** Home: the writing document whose place was kept last (the one 쓰기 opens), while it is a document of mine to write in:
 *  not a Flow document or a Flow's copy (saved or taken), not archived, trashed or kept aside, no input waiting in it.
 *  Otherwise the document of mine with the latest day up to today (its days, not a write time: none is stored), then
 *  the first one. None: null (a new '작성한 글' takes the line). */
export function programFolderTodayHome(space: ProgramPrivateSpace, today: string, pending: readonly string[] = []): string | null {
  const copies = new Set(space.copies.map(copy => copy.documentId)), bound = new Set(space.savedBindings.map(binding => binding.documentId));
  const mine = space.text.documents.filter(doc => !copies.has(doc.id) && !bound.has(doc.id) && !pending.includes(doc.id)
    && programDocumentContentLock(space, doc.id) === 'active');
  const kept = space.position?.documentId;
  if (kept && mine.some(doc => doc.id === kept)) return kept;
  const latest = (id: string) => M.rowMeta(space.text, id).reduce((day, row) => row.kind === 'date' && programDate(row.date) && row.date! <= today && row.date! > day ? row.date! : day, '');
  const ranked = mine.map((doc, order) => ({ id: doc.id, day: latest(doc.id), order })).sort((a, b) => b.day.localeCompare(a.day) || a.order - b.order);
  return ranked[0]?.id ?? null;
}

/** One insertion into the raw (`text` at `start`), and what it made besides the task. */
export type ProgramFolderTodayInsert = { start: number; text: string; head: boolean; folderLines: number };

const folderLine = (depth: number, folder: { id: string; title: string }) => `${'  '.repeat(depth)}- /${folder.title} <!-- flowme-folder:v1 id=${encodeURIComponent(folder.id)} -->`;
const taskLine = (depth: number, title: string) => `${'  '.repeat(depth)}- [ ] ${title}`;
/** The text without the folder ID tags (the model reads them and keeps only `- /name`). */
export const programFolderTagsOut = (raw: string) => raw.replace(/ <!-- flowme-folder:v1 id=[^\s<>]+ -->/g, '');

/** Where the line goes in `raw` (whose rows the model gave), `chain` being the folder and its parents (root first; empty
 *  for 미분류). Null when the line cannot go anywhere without moving another (too deep). */
export function programFolderTodayInsert(raw: string, rows: readonly TextRow[], today: string, chain: readonly { id: string; title: string }[], title: string): ProgramFolderTodayInsert | null {
  if (!programDate(today)) return null;
  const lines = raw.split('\n'), lineEnd = (index: number) => lines.slice(0, index + 1).reduce((sum, line) => sum + line.length + 1, 0) - 1;
  const block = (from: number, depth: number) => {
    const out = chain.slice(from).map((folder, index) => folderLine(depth + index, folder));
    const taskDepth = depth + chain.length - from;
    return taskDepth > M.MAX_DEPTH ? null : [...out, taskLine(taskDepth, title)].join('\n');
  };
  const own = rows.find(row => row.kind === 'date' && row.date === today && row.depth === 0);
  if (!own) {
    const plan = programDateHeaderPlan(raw, 0, today), text = block(0, 0);
    if (!plan || text === null) return null;
    const at = plan.caret - plan.offset;
    return { start: plan.offset, text: plan.text.slice(0, at) + text + plan.text.slice(at), head: true, folderLines: chain.length };
  }
  const end = rows.find(row => row.index > own.index && row.kind === 'date')?.index ?? lines.length;
  const part = rows.filter(row => row.index > own.index && row.index < end);
  /** The last line of a row's own lines (its subtree, blank lines at its end left out), within today's part. */
  const lastOf = (row: TextRow) => {
    let last = Math.min(Math.max(row.subtreeEndIndex, row.index + 1), end) - 1;
    while (last > row.index && !lines[last].trim()) last -= 1;
    return last;
  };
  // The folder's own line written today (the last one), else its nearest parent's: the rest goes under it.
  for (let from = chain.length - 1; from >= 0; from -= 1) {
    const line = [...part].reverse().find(row => row.kind === 'scope' && row.scopeKind !== 'flow' && row.scopeId === chain[from].id);
    if (!line) continue;
    const text = block(from + 1, line.depth + 1);
    return text === null ? null : { start: lineEnd(lastOf(line)), text: `\n${text}`, head: false, folderLines: chain.length - from - 1 };
  }
  let last = end - 1;
  while (last > own.index && !lines[last].trim()) last -= 1;
  const text = block(0, 0);
  return text === null ? null : { start: lineEnd(last), text: `\n${text}`, head: false, folderLines: chain.length };
}

/** What the line will be written into, for the place line under the field ('늘 쓰는 글 · 오늘 › / 보고 아래에 적습니다'). */
export function programFolderTodayPlace(space: ProgramPrivateSpace, folderId: string, today: string, pending: readonly string[] = []): { documentId: string | null; title: string; label: string } {
  const home = programFolderTodayHome(space, today, pending);
  const title = home ? space.text.documents.find(doc => doc.id === home)?.title || '제목 없는 글' : '새 글';
  const folder = folderId === PROGRAM_UNFILED_FOLDER ? null : programFolderAncestry(space, folderId).at(-1);
  return { documentId: home, title, label: `${title} · 오늘${folder ? ` › / ${folder.title}` : ''} 아래에 적습니다` };
}

const taskKey = (task: TextTask) => JSON.stringify([task.docId, task.title, task.done, task.date, task.groupDate, task.scopeId, task.folderId, task.time, task.note]);

/** [적기]: the line, in one save. Refused (nothing written) unless the writing gained exactly that task, under today, in
 *  this folder, every other line, task, folder and document staying as it was. */
export function addProgramFolderTodayTask(data: ProgramData, input: ProgramPrivateMutationBase & { documentId: string | null; folderId: string; title: string; today: string }): ProgramTransition<string> {
  const title = input.title.trim();
  return transitionProgramPrivateSpace(data, input, 'private-folder-today-task', { documentId: input.documentId, folderId: input.folderId, title, today: input.today }, space => {
    if (!title || title.length > PROGRAM_FOLDER_TODAY_TITLE_MAX || /[\r\n]/.test(title) || !programDate(input.today)) return { result: '', reason: 'invalid' };
    const chain = input.folderId === PROGRAM_UNFILED_FOLDER ? [] : programFolderAncestry(space, input.folderId);
    if (input.folderId !== PROGRAM_UNFILED_FOLDER && chain.at(-1)?.id !== input.folderId) return { result: '', reason: 'missing' };
    const start = programClone(space);
    let text = space.text, documentId = input.documentId;
    if (documentId === null) {
      // No document of mine to write in: a new one, as 쓰기's first entry is.
      if (text.documents.length >= 100) return { result: '', reason: 'limit' };
      const added = M.addDocument(text, { title: PROGRAM_WRITING_ENTRY_TITLE, folderId: PROGRAM_UNFILED_FOLDER });
      if (added === text) return { result: '', reason: 'missing' };
      text = added; documentId = added.documents.at(-1)!.id;
    } else {
      if (!text.documents.some(doc => doc.id === documentId) || space.copies.some(copy => copy.documentId === documentId)
        || space.savedBindings.some(binding => binding.documentId === documentId)) return { result: '', reason: 'missing' };
      if (programDocumentContentLock(space, documentId) !== 'active') return { result: documentId, reason: 'unresolved' };
    }
    const doc = M.getDocument(text, documentId)!, raw = M.raw(doc);
    const plan = programFolderTodayInsert(raw, M.rowMeta(text, documentId), input.today, chain, title);
    if (!plan) return { result: documentId, reason: 'unresolved' };
    const nextRaw = raw.slice(0, plan.start) + plan.text + raw.slice(plan.start);
    const edit = M.editTextResult(text, documentId, nextRaw, { folderText: true, inputSplice: { start: plan.start, end: plan.start, text: plan.text } });
    if (edit.reason !== null) return { result: documentId, reason: 'unresolved' };
    const after = M.getDocument(edit.state, documentId);
    if (!after || M.raw(after) !== programFolderTagsOut(nextRaw)) return { result: documentId, reason: 'unresolved' };
    // Nothing else moved: the old lines (same IDs, same words, same order), the other documents, the folders.
    const kept = after.lines.filter(line => doc.lines.some(old => old.id === line.id));
    if (JSON.stringify(kept) !== JSON.stringify(doc.lines)
      || JSON.stringify(edit.state.folders) !== JSON.stringify(text.folders) || JSON.stringify(edit.state.flows) !== JSON.stringify(text.flows)
      || JSON.stringify(edit.state.documents.filter(other => other.id !== documentId)) !== JSON.stringify(text.documents.filter(other => other.id !== documentId)))
      return { result: documentId, reason: 'unresolved' };
    const before = new Map(M.tasks(text).map(task => [task.id, taskKey(task)]));
    const tasks = M.tasks(edit.state), added = tasks.filter(task => !before.has(task.id));
    if (tasks.some(task => before.has(task.id) && before.get(task.id) !== taskKey(task))) return { result: documentId, reason: 'unresolved' };
    const next = { ...space, text: edit.state };
    if (added.length !== 1 || added[0].docId !== documentId || added[0].groupDate !== input.today
      || programTaskFolderId(next, added[0]) !== input.folderId) return { result: documentId, reason: 'unresolved' };
    if (!M.validate(edit.state) || !programPreservesLockedDocumentContent(start, edit.state)) return { result: documentId, reason: 'unresolved' };
    space.text = edit.state;
    return { result: added[0].id };
  });
}

/** What 되돌리기 puts back (the writing as it was) and the proof of the writing the line left. */
export type ProgramFolderTodayUndo = { before: ProgramCarryoverBefore; after: string };
export const programFolderTodayUndo = (before: ProgramPrivateSpace, after: ProgramPrivateSpace): ProgramFolderTodayUndo =>
  ({ before: programCarryoverBefore(before), after: programCarryoverProof(after) });

/** 되돌리기: the writing exactly as before the line, only while it is exactly as the line left it. */
export function undoProgramFolderTodayTask(data: ProgramData, input: ProgramPrivateMutationBase & ProgramFolderTodayUndo): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-folder-today-undo', { after: input.after, before: programCarryoverProof(input.before) }, space => {
    if (programCarryoverProof(space) !== input.after) return { result: input.after, reason: 'conflict' };
    if (!M.validate(input.before.text)) return { result: input.after, reason: 'invalid' };
    const before = programClone(input.before);
    space.text = before.text; space.timelineOrders = before.timelineOrders; space.position = before.position;
    return { result: input.after };
  });
}
