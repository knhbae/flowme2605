import { programClone, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programDate } from './program-data';
import { patchProgramTask, transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programExecutionTasks, programTaskProgress } from './execution';
import { programStateHash, programTaskDateStates, programTaskRepeatMembers } from './task-date-move';
import { textWorkspaceModel as M, type TextRow, type TextTask, type TextWorkspaceState } from './text-workspace';
import { programPreservesLockedDocumentContent, programReferenceExecutionAccess } from './reference-execution-guard';
import { programPreservesSeriesMetadata } from './recurrence-target';
import { programPreservesLegacyQualityHold } from './legacy-map-review';
import { programPreservesLegacyPlanExcluded } from './program-legacy-plan-target';

/** N11a 밀린 일 정리 (PROPOSAL 5): the past unfinished tasks of 오늘 go to today in one save. A line stays where it was
 *  first written and gets `- 날짜: 오늘` (as C6 does), so the day it was first meant for stays in the text. Copies of one
 *  task (same words, same 분류, unfinished, nothing under them) become one line across documents, and the unfinished
 *  copies left over from a task finished later are taken out. Lines anything else points at (progress records,
 *  references, Flow or repeat sources, public copies) are never touched. */
export const PROGRAM_CARRYOVER_LIMIT = 100;
export type ProgramCarryoverAction = 'date' | 'remove' | 'hold';
/** One line of the plan with its state as the screen saw it (C6b's token): `hold` lines only have to stay so. */
export type ProgramCarryoverLine = { taskId: string; state: string; action: ProgramCarryoverAction };
export type ProgramCarryoverPlan = {
  lines: ProgramCarryoverLine[];
  /** The card: past unfinished tasks (repeat lines apart), how many different ones, the earliest day, any twice. */
  count: number; kinds: number; first: string | null; repeated: boolean;
  /** What one press does: lines getting today's date, lines taken out, tasks found today, tasks finished since. */
  moved: number; removed: number; today: number; finished: number;
  /** Repeat lines (they go on by their own check), lines left for another press (the limit), words in two 분류. */
  repeats: number; left: number; split: number;
};

const words = (task: TextTask) => task.title.trim().replace(/\s+/g, ' ');
const kindOf = (task: TextTask) => `${task.scopeId}\n${words(task)}`;
const firstDay = (task: TextTask) => task.groupDate ?? task.date ?? '';

/** Which lines of the space may be touched, and which of those may be taken out. */
function carryoverRules(space: ProgramPrivateSpace) {
  // A line ID anywhere outside the writing itself (Flow sources, copies, repeat logs, legacy maps, …) keeps that line.
  const elsewhere = JSON.stringify({ ...space, text: null, timelineOrders: null, executionTimelineOrders: null, position: null });
  const documents = new Set(space.text.documents.map(doc => doc.id)), rows = new Map<string, TextRow[]>();
  const rowsOf = (docId: string) => {
    if (!rows.has(docId)) { const doc = M.getDocument(space.text, docId); rows.set(docId, doc ? M.parseDocument(doc, space.text).rows : []); }
    return rows.get(docId)!;
  };
  // Read once for the whole space: one by one, these checks took seconds on a few hundred lines.
  const repeat = programTaskRepeatMembers(space), progress = programTaskProgress(space.text), states = programTaskDateStates(space);
  const recorded = new Set(space.text.progressRecords.map(record => record.taskId));
  const bound = new Set(space.text.bindings.flatMap(binding => binding.kind === 'task' ? [binding.lineId, binding.taskId] : [binding.lineId]));
  // The reference check (locked documents, legacy holds and exclusions, Flow sources) comes last: it is the dear one.
  const touchable = (task: TextTask) => !task.done && documents.has(task.docId) && !space.documentTrash?.[task.docId]
    && !space.archivedDocumentIds.includes(task.docId) && !repeat.has(task.id) && !recorded.has(task.id) && !bound.has(task.id)
    && progress(task.id).current !== 100 && !elsewhere.includes(task.id) && programReferenceExecutionAccess(space, task.id).kind === 'active';
  // Taken out only as a line alone, right under its day (not under a folder line): no child task, check, memo, time or
  // progress box; its own 날짜 property may go with it (removeTask takes those, and leaves blank lines where they are).
  const removable = (task: TextTask) => {
    if (!touchable(task) || task.parentTaskId !== null || task.subchecks.length || task.note || task.time !== null || task.inputPercent !== undefined) return false;
    const list = rowsOf(task.docId), at = list.findIndex(row => row.id === task.id);
    return at >= 0 && list[at].depth === 0 && !list[at].ancestorScopeId && list.slice(at + 1, list[at].subtreeEndIndex)
      .every(row => row.kind === 'blank' || row.kind === 'property' && /^ *-\s+날짜:/.test(row.text));
  };
  return { touchable, removable, repeat, states };
}

/** What one press of [오늘로 옮기기] would do now, from the space as the screen shows it. Oldest tasks first, at most
 *  `limit` lines changed; a task's copies always go together. */
export function planProgramCarryover(space: ProgramPrivateSpace, today: string, limit = PROGRAM_CARRYOVER_LIMIT): ProgramCarryoverPlan {
  const plan: ProgramCarryoverPlan = { lines: [], count: 0, kinds: 0, first: null, repeated: false, moved: 0, removed: 0, today: 0, finished: 0, repeats: 0, left: 0, split: 0 };
  if (!programDate(today)) return plan;
  const { touchable, removable, repeat, states } = carryoverRules(space);
  const past = programExecutionTasks(space, { period: 'today', date: today }).filter(task => task.date! < today && !task.done);
  const plain = past.filter(task => !repeat.has(task.id));
  plan.repeats = past.length - plain.length; plan.count = plain.length;
  const kinds = new Map<string, TextTask[]>();
  for (const task of plain) kinds.set(kindOf(task), [...kinds.get(kindOf(task)) ?? [], task]);
  plan.kinds = kinds.size; plan.repeated = [...kinds.values()].some(group => group.length > 1);
  // Since the day the oldest of them was first written (its date section), as '7일째' counts.
  plan.first = plain.reduce<string | null>((first, task) => !first || firstDay(task) < first ? firstDay(task) : first, null);
  const scopes = new Map<string, Set<string>>();
  for (const task of plain) scopes.set(words(task), new Set([...scopes.get(words(task)) ?? [], task.scopeId]));
  plan.split = [...scopes.values()].filter(set => set.size > 1).length;
  // Every line up to today of the same task, finished or not, in any document: the newest says whether it was done.
  const archived = new Set(space.archivedDocumentIds);
  const near = M.tasks(space.text, { to: today }).filter(task => !archived.has(task.docId) && !space.documentTrash?.[task.docId] && !repeat.has(task.id));
  const order = new Map(space.text.documents.map((doc, index) => [doc.id, index]));
  const groups = [...kinds.entries()].sort(([a, left], [b, right]) => left.reduce((day, task) => task.date! < day ? task.date! : day, '9999')
    .localeCompare(right.reduce((day, task) => task.date! < day ? task.date! : day, '9999')) || a.localeCompare(b));
  let changed = 0, cut = false;
  for (const [kind, group] of groups) {
    const same = near.filter(task => kindOf(task) === kind), latest = same.reduce((day, task) => task.date! > day ? task.date! : day, '');
    const finished = same.filter(task => task.date === latest).every(task => task.done);
    const written = same.filter(task => task.date === today && !task.done);
    const lines = group.filter(touchable), merge = lines.filter(removable);
    const steps: ProgramCarryoverLine[] = [];
    const step = (task: TextTask, action: ProgramCarryoverAction) => { const state = states(task.id); if (state) steps.push({ taskId: task.id, state, action }); };
    if (finished || written.length) {
      // Finished later: the copies left behind go. Written again today: today's line is the one, the old copies go.
      for (const task of lines) step(task, merge.includes(task) ? 'remove' : 'date');
      if (!finished && steps.some(line => line.action === 'remove')) for (const task of written) step(task, 'hold');
    } else {
      // The document written in now holds the newest copy (the open one, then the later document, on a tie); its
      // earliest copy stays, so the day the task was first meant for stays too.
      const newest = [...merge].sort((a, b) => b.date!.localeCompare(a.date!) || Number(b.docId === space.position.documentId) - Number(a.docId === space.position.documentId)
        || (order.get(b.docId) ?? 0) - (order.get(a.docId) ?? 0))[0];
      const keep = newest && merge.filter(task => task.docId === newest.docId).sort((a, b) => firstDay(a).localeCompare(firstDay(b)) || a.sourceIndex - b.sourceIndex)[0];
      for (const task of lines) step(task, task === keep || !merge.includes(task) ? 'date' : 'remove');
    }
    const size = steps.filter(line => line.action !== 'hold').length;
    if (!size) continue;
    if (cut || changed && changed + size > limit) { cut = true; plan.left += group.length; continue; }
    changed += size; plan.lines.push(...steps);
    plan.moved += steps.filter(line => line.action === 'date').length; plan.removed += steps.filter(line => line.action === 'remove').length;
    if (finished) plan.finished++; else if (written.length) plan.today++;
  }
  return plan;
}

const validLines = (lines: unknown): lines is ProgramCarryoverLine[] => Array.isArray(lines) && lines.length > 0 && lines.length <= PROGRAM_CARRYOVER_LIMIT * 4
  && new Set(lines.map(line => line?.taskId)).size === lines.length
  && lines.every(line => line && typeof line.taskId === 'string' && typeof line.state === 'string' && /^[0-9a-z]{1,64}$/.test(line.state)
    && ['date', 'remove', 'hold'].includes(line.action) && Object.keys(line).length === 3);

/** Date rows of a document whose day has something written under it. */
function filledDays(text: TextWorkspaceState, docId: string): Set<string> {
  const doc = M.getDocument(text, docId), rows = doc ? M.parseDocument(doc, text).rows : [], filled = new Set<string>();
  let day: string | null = null;
  for (const row of rows) { if (row.kind === 'date') day = row.id; else if (day && row.kind !== 'blank') filled.add(day); }
  return filled;
}
/** A day this save emptied loses its heading and blank lines; a day already empty (written ahead, say) stays. */
function dropEmptiedDays(before: TextWorkspaceState, text: TextWorkspaceState, docIds: Iterable<string>): TextWorkspaceState {
  for (const docId of docIds) {
    const filled = filledDays(before, docId), now = filledDays(text, docId), doc = M.getDocument(text, docId);
    if (!doc) continue;
    const rows = M.parseDocument(doc, text).rows, drop = new Set<number>();
    let day: TextRow | null = null;
    rows.forEach((row, index) => {
      if (row.kind === 'date') day = filled.has(row.id) && !now.has(row.id) ? row : null;
      if (day) drop.add(index);
    });
    if (!drop.size) continue;
    // A document every day of which was emptied keeps one blank line, as a new document has.
    const kept = doc.lines.filter((_, index) => !drop.has(index)), lines = kept.length ? kept : [{ id: doc.lines[0].id, text: '' }];
    text = { ...text, documents: text.documents.map(item => item.id === docId ? { ...item, lines } : item) };
  }
  return text;
}

/** [오늘로 옮기기]: the plan in one save, all or none. Any planned line changed since the screen showed it (its state
 *  token), or no longer free to take out, refuses the whole save. */
export function carryProgramTasksToToday(data: ProgramData, input: ProgramPrivateMutationBase & { today: string; lines: ProgramCarryoverLine[] }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-task-carryover', { today: input.today, lines: input.lines }, space => {
    if (!programDate(input.today) || !validLines(input.lines)) return { result: '', reason: 'invalid' };
    const start = { ...space }, { touchable, removable, states } = carryoverRules(start), tasks = new Map(M.tasks(start.text).map(task => [task.id, task]));
    if (input.lines.some(line => states(line.taskId) !== line.state)) return { result: '', reason: 'conflict' };
    for (const line of input.lines) {
      const task = tasks.get(line.taskId);
      const fits = !!task && (line.action === 'hold' ? !task.done : line.action === 'remove' ? removable(task)
        : touchable(task) && task.date !== null && task.date < input.today);
      if (!fits) return { result: line.taskId, reason: 'conflict' };
    }
    for (const line of input.lines.filter(line => line.action === 'date')) {
      const patched = patchProgramTask(space, line.taskId, { date: input.today });
      if (patched.reason) return patched;
    }
    const dated = space.text, emptied = new Set<string>();
    for (const line of input.lines.filter(line => line.action === 'remove')) {
      const next = M.removeTask(space.text, line.taskId);
      if (next === space.text) return { result: line.taskId, reason: 'unresolved' };
      space.text = next; emptied.add(tasks.get(line.taskId)!.docId);
    }
    space.text = dropEmptiedDays(dated, space.text, emptied);
    if (!M.validate(space.text) || !programPreservesLockedDocumentContent(start, space.text) || !programPreservesSeriesMetadata(start, space.text)
      || !programPreservesLegacyQualityHold(start, space.text) || !programPreservesLegacyPlanExcluded(start, space.text)) return { result: '', reason: 'unresolved' };
    // As a document's own save does: a day's hand order and the saved place forget the lines taken out.
    const ids = new Set([...space.text.documents, ...space.text.flows].flatMap(doc => doc.lines.map(line => line.id)));
    space.timelineOrders = Object.fromEntries(Object.entries(space.timelineOrders).map(([day, order]) => [day, order.filter(id => ids.has(id))]));
    if (space.position.lineId && !ids.has(space.position.lineId)) space.position = { documentId: space.position.documentId, lineId: null, start: 0, end: 0, scrollTop: 0 };
    const counts = input.lines.reduce((sum, line) => ({ ...sum, [line.action]: sum[line.action] + 1 }), { date: 0, remove: 0, hold: 0 });
    return { result: `${counts.date}:${counts.remove}` };
  });
}

/** What 되돌리기 puts back: the three fields the save changes, exactly as they were. */
export type ProgramCarryoverBefore = Pick<ProgramPrivateSpace, 'text' | 'timelineOrders' | 'position'>;
const sorted = (_: string, value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value;
/** Those fields' proof, independent of key order (a save read back from the server may order keys differently). */
export const programCarryoverProof = (space: ProgramCarryoverBefore) => programStateHash(JSON.stringify([space.text, space.timelineOrders, space.position], sorted));
export const programCarryoverBefore = (space: ProgramPrivateSpace): ProgramCarryoverBefore =>
  programClone({ text: space.text, timelineOrders: space.timelineOrders, position: space.position });

/** 되돌리기: the writing exactly as before the save, only while it is exactly as the save left it. */
export function restoreProgramCarryover(data: ProgramData, input: ProgramPrivateMutationBase & { before: ProgramCarryoverBefore; after: string }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-task-carryover-undo', { after: input.after, before: programCarryoverProof(input.before) }, space => {
    if (programCarryoverProof(space) !== input.after) return { result: input.after, reason: 'conflict' };
    if (!M.validate(input.before.text)) return { result: input.after, reason: 'invalid' };
    const before = programClone(input.before);
    space.text = before.text; space.timelineOrders = before.timelineOrders; space.position = before.position;
    return { result: input.after };
  });
}
