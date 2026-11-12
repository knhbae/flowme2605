import type { ProgramData, ProgramPrivateSpace, ProgramTransition } from './contract';
import { programDateHeaderPlan } from './input-bar';
import { programDate } from './program-data';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programDocumentContentLock, programReferenceExecutionAccess } from './reference-execution-guard';
import { textWorkspaceModel as M, type TextTask } from './text-workspace';
import { PROGRAM_WAIT_PREFIX, programIsWaitTitle, programWaitParentTitle } from './wait-title';

export { PROGRAM_WAIT_PREFIX, programIsWaitTitle, programWaitDays, programWaitParentTitle } from './wait-title';

/** W-FLOW-07 · W-TXT-09 (총괄 11/12): a wait is a line in the text. Starting one writes, under the section of the day to
 *  look again (`[YYYY-MM-DD]`), a task `- [ ] 답 확인: <부모 제목>` with `  - 기다림: YYYY-MM-DD` (the day it began) under
 *  it. Such a task is no step of a Flow (not counted in a progress line's n/m); it is in 오늘's '다시 확인할 일', and its
 *  '기다림 n일째' counts from its '- 기다림:' day. Moving the line (its [내일]) takes the property along, as any. The F12
 *  shape before it (a checked step's open subcheck, its '- 날짜:' the day to look again) is still read. */

/** The text with the wait line written: at the end of `date`'s section, or a new section placed as a date chip places it
 *  (programDateHeaderPlan: in the document's date order, before another section or at the end, so no line changes its
 *  section). Null for a date that cannot head a section or a title that cannot be one line. */
export function programWaitLineRaw(raw: string, date: string, parentTitle: string, since: string): string | null {
  const title = parentTitle.trim();
  if (!programDate(date) || !programDate(since) || !title || /[\r\n]/.test(title)) return null;
  const plan = programDateHeaderPlan(raw, 0, date);
  if (!plan) return null;
  const next = raw.slice(0, plan.offset) + plan.text + raw.slice(plan.offset);
  return next.slice(0, plan.caret) + `- [ ] ${PROGRAM_WAIT_PREFIX} ${title}\n  - 기다림: ${since}` + next.slice(plan.caret);
}

/** The open wait line already written for a task in its document (by its title), if any. */
export function programOpenWaitFor(space: ProgramPrivateSpace, task: Pick<TextTask, 'docId' | 'title'>): TextTask | null {
  return M.tasks(space.text).find(entry => entry.docId === task.docId && !entry.done && programWaitParentTitle(entry.title) === task.title.trim()) ?? null;
}

/** Where a wait line may be written: a writing document, or a run's document (a Flow copy's, a personal run's) — never a
 *  personal Flow's own document, which is its definition. */
function programWaitHome(space: ProgramPrivateSpace, documentId: string): boolean {
  return space.text.documents.some(doc => doc.id === documentId) || space.copies.some(copy => copy.documentId === documentId)
    || (space.personalAuthoring?.executions ?? []).some(execution => execution.executionDocumentId === documentId);
}

/** Whether a wait can start on this task now: a task (not a reference) in a document a wait line may go to and open to
 *  writing, the task no wait line itself and none open for it yet. */
export function programWaitStartable(space: ProgramPrivateSpace, taskId: string): boolean {
  const task = M.tasks(space.text).find(entry => entry.id === taskId);
  if (!task || programIsWaitTitle(task.title) || !task.title.trim() || !programWaitHome(space, task.docId)) return false;
  if (programDocumentContentLock(space, task.docId) !== 'active' || programReferenceExecutionAccess(space, taskId).kind !== 'active') return false;
  return !programOpenWaitFor(space, task);
}

/** Starts a wait on a task (one save): its document takes the wait line on `date`, begun `today`. The result is the new
 *  line's id. Refused (nothing written) when it cannot start (programWaitStartable) or the text would not read back as
 *  that one new task. */
export function startProgramWait(data: ProgramData, input: ProgramPrivateMutationBase & { taskId: string; date: string; today: string }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-wait-start', { taskId: input.taskId, date: input.date, today: input.today }, space => {
    if (!programDate(input.date) || !programDate(input.today) || input.date < input.today) return { result: input.taskId, reason: 'invalid' };
    const task = M.tasks(space.text).find(entry => entry.id === input.taskId);
    if (!task) return { result: input.taskId, reason: 'missing' };
    if (!programWaitStartable(space, task.id)) return { result: input.taskId, reason: programOpenWaitFor(space, task) ? 'conflict' : 'unresolved' };
    const doc = M.getDocument(space.text, task.docId)!;
    const raw = programWaitLineRaw(M.raw(doc), input.date, task.title, input.today);
    if (raw === null) return { result: input.taskId, reason: 'invalid' };
    const before = new Set(M.tasks(space.text).map(entry => entry.id));
    const edit = M.editTextResult(space.text, doc.id, raw, { folderText: true });
    if (edit.reason !== null || M.raw(M.getDocument(edit.state, doc.id)!) !== raw) return { result: input.taskId, reason: 'unresolved' };
    const added = M.tasks(edit.state).filter(entry => !before.has(entry.id));
    const line = added.length === 1 ? added[0] : null;
    if (!line || line.docId !== doc.id || line.date !== input.date || line.waitSince !== input.today || programWaitParentTitle(line.title) !== task.title.trim())
      return { result: input.taskId, reason: 'unresolved' };
    space.text = edit.state;
    return { result: line.id };
  });
}
