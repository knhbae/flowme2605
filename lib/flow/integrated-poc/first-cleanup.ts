import type { ProgramData, ProgramPrivateSpace, ProgramTransition } from './contract';
import { programSame } from './controller';
import { programDate } from './program-data';
import { programExecutionDocument, transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programSameTaskKey } from './continue-band';
import { programContinuedLines, programFolderPath } from './continuation';
import { programTaskRepeatMembers } from './task-date-move';
import { textWorkspaceModel as M, type TextLine, type TextTask, type TextWorkspaceState } from './text-workspace';

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
