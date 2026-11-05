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
  /** Copies that should go (every task, the limit aside) and, of those that stay, how many for each reason; and how
   *  many date properties one press adds (lines dated already only change theirs). */
  copies: number; blocked: Partial<Record<ProgramCarryoverBlock, number>>; newDateLines: number;
};

const words = (task: TextTask) => task.title.trim().replace(/\s+/g, ' ');
const firstDay = (task: TextTask) => task.groupDate ?? task.date ?? '';
const dateProperty = (row: TextRow) => row.kind === 'property' && /^ *-\s+날짜:/.test(row.text);

/** Why a copy stays (null: it may be taken out). `linked:<field>`: its ID is in that field of the space (a legacy map,
 *  a copy, a Flow or repeat source, …), which would no longer hold without the line. `shape:*`: the line itself:
 *  under a task, a progress box, under a line of that kind, tasks or held lines under it, or lines under it (a memo,
 *  say) that the line which stays does not have. */
export type ProgramCarryoverBlock = 'repeat' | 'locked' | 'progress-complete' | 'recorded' | 'recorded-finished' | 'bound' | `linked:${string}` | `shape:${string}`;
const own = new Set(['text', 'timelineOrders', 'executionTimelineOrders', 'position']);
type Shape = { block: ProgramCarryoverBlock } | { under: string };

/** Which lines of the space may be touched, what each carries under it, and which of those may be taken out. */
function carryoverRules(space: ProgramPrivateSpace) {
  // A line ID anywhere outside the writing itself (Flow sources, copies, repeat logs, legacy maps, …) keeps that line.
  const outside = Object.entries(space).filter(([key]) => !own.has(key)).map(([key, value]) => [key, JSON.stringify(value) ?? ''] as const);
  const elsewhere = (id: string) => outside.find(([, json]) => json.includes(id))?.[0] ?? null;
  const documents = new Set(space.text.documents.map(doc => doc.id)), rows = new Map<string, { list: TextRow[]; at: Map<string, number> }>();
  const rowsOf = (docId: string) => {
    if (!rows.has(docId)) {
      const doc = M.getDocument(space.text, docId), list = doc ? M.parseDocument(doc, space.text).rows : [];
      rows.set(docId, { list, at: new Map(list.map((row, index) => [row.id, index])) });
    }
    return rows.get(docId)!;
  };
  // Read once for the whole space: one by one, these checks took seconds on a few hundred lines.
  const repeat = programTaskRepeatMembers(space), progress = programTaskProgress(space.text), states = programTaskDateStates(space);
  const recorded = new Set(space.text.progressRecords.map(record => record.taskId));
  const bound = new Set(space.text.bindings.flatMap(binding => binding.kind === 'task' ? [binding.lineId, binding.taskId] : [binding.lineId]));
  const touches = new Map<string, ProgramCarryoverBlock | null>(), shapes = new Map<string, Shape>(), labels = new Map<string, string>();
  // The reference check (locked documents, legacy holds and exclusions, Flow sources) comes last: it is the dear one.
  const touchBlock = (task: TextTask): ProgramCarryoverBlock | null => {
    if (repeat.has(task.id)) return 'repeat';
    if (task.done || !documents.has(task.docId) || space.documentTrash?.[task.docId] || space.archivedDocumentIds.includes(task.docId)) return 'locked';
    // A line with a progress record may move (as C6 moves it) but never goes; one at 100% is finished in all but its box.
    if (progress(task.id).current === 100) return 'progress-complete';
    if (bound.has(task.id)) return 'bound';
    const field = elsewhere(task.id);
    if (field) return `linked:${field}`;
    return programReferenceExecutionAccess(space, task.id).kind === 'active' ? null : 'locked';
  };
  const untouchable = (task: TextTask) => { if (!touches.has(task.id)) touches.set(task.id, touchBlock(task)); return touches.get(task.id)!; };
  // A `- /이름` line never made a folder (still text) names a 분류 for the user all the same: tasks under two such
  // lines of different names are not one task.
  const labelOf = (task: TextTask) => {
    if (!labels.has(task.id)) {
      const { list, at } = rowsOf(task.docId);
      let row = list[at.get(task.id) ?? -1], label = '';
      while (row?.parentLineId) {
        row = list[at.get(row.parentLineId) ?? -1];
        if (!row || row.kind === 'scope') break;
        const name = row.kind === 'note' ? /^ *- \/(.+)$/.exec(row.text)?.[1].trim() : undefined;
        if (name) { label = name; break; }
      }
      labels.set(task.id, label);
    }
    return labels.get(task.id)!;
  };
  const kindOf = (task: TextTask) => `${task.scopeId}\n${labelOf(task)}\n${words(task)}`;
  // What a line carries under it, as words with their indents below it (its own 날짜 property and blank lines aside),
  // or why it can never go: under a task, a progress box, under a line of another kind, a task or a held line under it.
  const shapeOf = (task: TextTask): Shape => {
    if (shapes.has(task.id)) return shapes.get(task.id)!;
    const { list, at } = rowsOf(task.docId), index = at.get(task.id) ?? -1, row = list[index];
    const parent = row?.parentLineId ? list[at.get(row.parentLineId) ?? -1] : null;
    // Only the task's own 날짜 property is left out: a date under one of its checks or notes is part of what it says
    // (QA F1: copies differing there were taken for one, and a date written was lost).
    const under = row ? list.slice(index + 1, row.subtreeEndIndex).filter(item => item.kind !== 'blank'
      && !(dateProperty(item) && item.depth === row.depth + 1 && item.parentLineId === row.id)) : [];
    const shape: Shape = !row ? { block: 'shape:missing' } : task.parentTaskId !== null ? { block: 'shape:under-task' }
      : task.inputPercent !== undefined ? { block: 'shape:progress-box' }
      : parent && !['scope', 'note', 'heading'].includes(parent.kind) ? { block: `shape:under-${parent.kind}` }
      : under.some(item => !['property', 'note', 'subcheck'].includes(item.kind)) ? { block: 'shape:tasks-under' }
      : under.some(item => recorded.has(item.id) || bound.has(item.id) || elsewhere(item.id)) ? { block: 'shape:held-under' }
      : { under: under.map(item => `${'  '.repeat(Math.max(0, item.depth - row.depth - 1))}${item.text.trimStart()}`).join('\n') };
    shapes.set(task.id, shape);
    return shape;
  };
  const underOf = (task: TextTask) => { const shape = shapeOf(task); return 'under' in shape ? shape.under : null; };
  /** Why this copy stays when the lines that stay carry `kept` under them; null: it goes and nothing it says is lost. */
  const takeBlock = (task: TextTask, kept: ReadonlySet<string>): ProgramCarryoverBlock | null => {
    const block = untouchable(task); if (block) return block;
    if (recorded.has(task.id)) return 'recorded';
    const shape = shapeOf(task); if ('block' in shape) return shape.block;
    return shape.under === '' || kept.has(shape.under) ? null : 'shape:different-under';
  };
  const touchable = (task: TextTask) => untouchable(task) === null, isRecorded = (task: TextTask) => recorded.has(task.id);
  return { touchable, untouchable, isRecorded, kindOf, labelOf, underOf, takeBlock, repeat, states, rowsOf };
}

/** What one press of [오늘로 옮기기] would do now, from the space as the screen shows it. Oldest tasks first, at most
 *  `limit` lines changed; a task's copies always go together. */
export function planProgramCarryover(space: ProgramPrivateSpace, today: string, limit = PROGRAM_CARRYOVER_LIMIT): ProgramCarryoverPlan {
  const plan: ProgramCarryoverPlan = { lines: [], count: 0, kinds: 0, first: null, repeated: false, moved: 0, removed: 0, today: 0, finished: 0, repeats: 0, left: 0, split: 0,
    copies: 0, blocked: {}, newDateLines: 0 };
  if (!programDate(today)) return plan;
  const { touchable, isRecorded, kindOf, labelOf, underOf, takeBlock, repeat, states } = carryoverRules(space);
  const past = programExecutionTasks(space, { period: 'today', date: today }).filter(task => task.date! < today && !task.done);
  const plain = past.filter(task => !repeat.has(task.id));
  plan.repeats = past.length - plain.length; plan.count = plain.length;
  const kinds = new Map<string, TextTask[]>();
  for (const task of plain) kinds.set(kindOf(task), [...kinds.get(kindOf(task)) ?? [], task]);
  plan.kinds = kinds.size; plan.repeated = [...kinds.values()].some(group => group.length > 1);
  // Since the day the oldest of them was first written (its date section), as '7일째' counts.
  plan.first = plain.reduce<string | null>((first, task) => !first || firstDay(task) < first ? firstDay(task) : first, null);
  const places = new Map<string, Set<string>>();
  for (const task of plain) places.set(words(task), new Set([...places.get(words(task)) ?? [], `${task.scopeId}\n${labelOf(task)}`]));
  plan.split = [...places.values()].filter(set => set.size > 1).length;
  // Every line up to today of the same task, finished or not, in any document: the newest says whether it was done.
  const archived = new Set(space.archivedDocumentIds);
  const near = M.tasks(space.text, { to: today }).filter(task => !archived.has(task.docId) && !space.documentTrash?.[task.docId] && !repeat.has(task.id));
  const order = new Map(space.text.documents.map((doc, index) => [doc.id, index]));
  const newestFirst = (a: TextTask, b: TextTask) => b.date!.localeCompare(a.date!) || Number(b.docId === space.position.documentId) - Number(a.docId === space.position.documentId)
    || (order.get(b.docId) ?? 0) - (order.get(a.docId) ?? 0);
  const groups = [...kinds.entries()].sort(([a, left], [b, right]) => left.reduce((day, task) => task.date! < day ? task.date! : day, '9999')
    .localeCompare(right.reduce((day, task) => task.date! < day ? task.date! : day, '9999')) || a.localeCompare(b));
  let changed = 0, cut = false;
  for (const [kind, group] of groups) {
    const same = near.filter(task => kindOf(task) === kind), latest = same.reduce((day, task) => task.date! > day ? task.date! : day, '');
    const finished = same.filter(task => task.date === latest).every(task => task.done);
    const written = same.filter(task => task.date === today && !task.done);
    // A copy with a progress record never goes. While the task goes on it stays as one of its lines (dated today),
    // each of them; a task finished since leaves it where it is, a day's record of the past.
    const recordedLines = group.filter(task => touchable(task) && isRecorded(task));
    const lines = group.filter(task => touchable(task) && !(finished && isRecorded(task))), steps: ProgramCarryoverLine[] = [];
    const step = (task: TextTask, action: ProgramCarryoverAction) => { const state = states(task.id); if (state) steps.push({ taskId: task.id, state, action }); };
    // The lines that stay as they are: finished later, the finished ones; written again today, today's. Of the past
    // copies, the recorded ones stay, and one more (dated today) for each thing carried under them (a memo, say) that
    // no line staying carries, so nothing written is lost; copies with nothing under them, or what a staying line has,
    // go. With nothing carried and nothing recorded, one plain copy stays. It is the copy in the document written in now
    // (the newest copy's), the earliest there, so the first day stays too.
    const keepers = finished ? same.filter(task => task.date === latest) : written, pinned = finished ? [] : recordedLines;
    const kept = new Set([...keepers, ...pinned].flatMap(task => underOf(task) ?? [])), classes = new Map<string, TextTask[]>();
    for (const task of lines) { const under = underOf(task); if (under !== null && !pinned.includes(task)) classes.set(under, [...classes.get(under) ?? [], task]); }
    const pick = (pool: TextTask[]) => { const newest = [...pool].sort(newestFirst)[0];
      return pool.filter(task => task.docId === newest.docId).sort((a, b) => firstDay(a).localeCompare(firstDay(b)) || a.sourceIndex - b.sourceIndex)[0]; };
    const chosen: TextTask[] = [];
    for (const [under, pool] of [...classes.entries()].sort(([, a], [, b]) => newestFirst(a.sort(newestFirst)[0], b.sort(newestFirst)[0])))
      if (under && !kept.has(under)) { chosen.push(pick(pool)); kept.add(under); }
    if (!keepers.length && !pinned.length && !chosen.length && classes.get('')?.length) chosen.push(pick(classes.get('')!));
    const staying = keepers.length + pinned.length + chosen.length > 0;
    for (const task of lines) step(task, chosen.includes(task) || !staying || takeBlock(task, kept) !== null ? 'date' : 'remove');
    // A copy goes only beside a line that stays as it was seen (its token): today's line, the finished one.
    if (steps.some(line => line.action === 'remove')) for (const task of keepers) step(task, 'hold');
    // The copies that should go (all but the one that stays) and, of those that stay, why: counted for every task,
    // also past the limit. Another line kept for its record or for another memo counts as a copy kept for that reason.
    const spare = keepers.length ? null : pinned[0] ?? chosen[0] ?? [...group].sort(newestFirst)[0];
    for (const task of group.filter(task => task !== spare)) {
      plan.copies++;
      if (steps.some(line => line.taskId === task.id && line.action === 'remove')) continue;
      const block = finished && recordedLines.includes(task) ? 'recorded-finished' : takeBlock(task, new Set()) ?? 'shape:different-under';
      plan.blocked[block] = (plan.blocked[block] ?? 0) + 1;
    }
    const size = steps.filter(line => line.action !== 'hold').length;
    if (!size) continue;
    if (cut || changed && changed + size > limit) { cut = true; plan.left += group.length; continue; }
    // The first task alone may need more than one press may change (QA F2): the lines that stay go first, then the
    // copies, up to the limit; the rest waits for the next press, where the line kept is today's and they go beside it.
    let taken = steps;
    if (size > limit) {
      const changes = [...steps.filter(line => line.action === 'date'), ...steps.filter(line => line.action === 'remove')].slice(0, limit);
      taken = [...changes, ...steps.filter(line => line.action === 'hold')];
      plan.left += size - changes.length; cut = true;
    }
    changed += taken.length - taken.filter(line => line.action === 'hold').length; plan.lines.push(...taken);
    const dated = taken.filter(line => line.action === 'date');
    plan.moved += dated.length; plan.removed += taken.filter(line => line.action === 'remove').length;
    plan.newDateLines += dated.filter(line => !group.find(task => task.id === line.taskId)?.explicitDate).length;
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
    const start = { ...space }, { touchable, untouchable, isRecorded, kindOf, underOf, states } = carryoverRules(start), tasks = new Map(M.tasks(start.text).map(task => [task.id, task]));
    if (input.lines.some(line => states(line.taskId) !== line.state)) return { result: '', reason: 'conflict' };
    // A copy goes only when nothing it says is lost: nothing under it, or just what a line of the same task that
    // stays (in this plan, as it was seen) has under it.
    const stay = input.lines.filter(line => line.action !== 'remove').flatMap(line => tasks.get(line.taskId) ?? []);
    const goes = (task: TextTask) => untouchable(task) === null && !isRecorded(task) && underOf(task) !== null
      && (underOf(task) === '' || stay.some(other => other !== task && kindOf(other) === kindOf(task) && underOf(other) === underOf(task)));
    for (const line of input.lines) {
      const task = tasks.get(line.taskId);
      const fits = !!task && (line.action === 'hold' || (line.action === 'remove' ? goes(task)
        : touchable(task) && task.date !== null && task.date < input.today));
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
