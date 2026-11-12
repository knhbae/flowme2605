import type { ProgramData, ProgramPrivateSpace, ProgramTransition } from './contract';
import { programSame } from './controller';
import { programExecutionDocument, transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programDocumentContentLock, programReferenceExecutionAccess } from './reference-execution-guard';
import { programTaskRepeatMembers } from './task-date-move';
import { moveTaskLocation } from './task-location-move';
import { readProgramRepeatMarker } from './repeat-line';
import { textWorkspaceModel as M, type TextRow, type TextTask, type TextWorkspaceState } from './text-workspace';

/** Redesign 3 (DECISION-1, 총괄 11/12, mockup ③): the day of a task is the date section it sits in, so a document's
 *  '- 날짜:' lines go, once, on the person's word. A line saying the day the task reads without it is only deleted; one
 *  saying another day either takes the task to that day's section (그날로 옮기기, as 위치 옮기기 does: the default) or
 *  becomes its '- 마감:' (마감으로 바꾸기). A subtask cannot leave its parent, so it only takes 마감. A copy's document,
 *  a Flow run's, a Flow's own, a reference line, a repeat line and a line whose value cannot be read stay as they are
 *  (redesign step 5). One document at a time, in one save; 되돌리기 is the writing back as it was. */
export type ProgramDateLineChoice = 'move' | 'due';
export type ProgramDateLineItem = {
  /** The task (or subtask) line the '- 날짜:' lines are under, and those lines in order (the last one counts). */
  ownerId: string; lineIds: string[]; title: string; subtask: boolean;
  /** What the lines say (null: 미정), and the day the task reads without them. */
  value: string | null; section: string | null;
  kind: 'same' | 'other';
  /** For 'other': what this line can take, the default first (empty for 'same'). */
  choices: ProgramDateLineChoice[];
};
export type ProgramDateLinePlan = { documentId: string; items: ProgramDateLineItem[]; lines: number };
export type ProgramDateLineChoices = Record<string, ProgramDateLineChoice>;

const DATE_LINE = /^( *-\s+)날짜:\s*(.*)$/;
const DUE_LINE = /^ *-\s+마감:/;

/** Documents whose dates step 5 changes with the run and copy writing (none of their lines is offered). */
function excludedDocument(space: ProgramPrivateSpace, documentId: string): boolean {
  return !space.text.documents.some(doc => doc.id === documentId) || programDocumentContentLock(space, documentId) !== 'active'
    || space.copies.some(copy => copy.documentId === documentId) || space.savedBindings.some(binding => binding.documentId === documentId)
    || programExecutionDocument(space, documentId);
}

/** The document's date lines, grouped by the line they are under, in line order. Null when the document is not offered. */
export function programDateLinePlan(space: ProgramPrivateSpace, documentId: string): ProgramDateLinePlan | null {
  if (excludedDocument(space, documentId)) return null;
  const doc = M.getDocument(space.text, documentId)!, parsed = M.parseDocument(doc, space.text);
  const owners = new Map<string, string[]>();
  for (const row of parsed.rows) {
    if (row.kind !== 'property' || !row.taskId || row.parentLineId !== row.taskId || !DATE_LINE.test(row.text)) continue;
    owners.set(row.taskId, [...owners.get(row.taskId) ?? [], row.id]);
  }
  if (!owners.size) return null;
  const items = new Map(parsed.items.map(item => [item.id, item])), rows = new Map(parsed.rows.map(row => [row.id, row]));
  const canonical = new Map(M.tasks(space.text).map(task => [task.id, task])), repeats = programTaskRepeatMembers(space);
  const invalid = new Set(parsed.issues.filter(issue => issue.code === 'invalid-date-property').map(issue => issue.lineId));
  const references = new Set(space.text.bindings.filter(binding => binding.kind === 'task' && binding.docId === documentId).map(binding => binding.lineId));
  const external = new Set([...space.copies.flatMap(copy => [...Object.values(copy.itemLines), ...Object.values(copy.subcheckLines).flatMap(lines => Object.values(lines))]),
    ...space.savedBindings.flatMap(binding => Object.values(binding.itemLines))]);
  const out: ProgramDateLineItem[] = [];
  for (const [ownerId, lineIds] of owners) {
    const item = items.get(ownerId), row = rows.get(ownerId);
    if (!item || !row || lineIds.some(id => invalid.has(id)) || references.has(ownerId) || external.has(ownerId)) continue;
    const task = canonical.get(item.isCanonical ? ownerId : item.parentTaskId ?? '');
    if (!task || task.scopeKind === 'flow' || repeats.has(ownerId) || readProgramRepeatMarker(item.title)) continue;
    if (programReferenceExecutionAccess(space, ownerId).kind !== 'active') continue;
    const parent = item.parentItemId ? items.get(item.parentItemId) : undefined;
    const section = item.isCanonical || !parent ? row.groupDate : parent.date;
    const value = item.date, base = { ownerId, lineIds, title: item.title, subtask: !item.isCanonical, value, section };
    if (value === section) { out.push({ ...base, kind: 'same', choices: [] }); continue; }
    const choices: ProgramDateLineChoice[] = [];
    if (item.isCanonical && movable(parsed.rows, row, task, references)) choices.push('move');
    if (value !== null && !parsed.rows.some(entry => entry.kind === 'property' && entry.parentLineId === ownerId && DUE_LINE.test(entry.text))) choices.push('due');
    if (choices.length) out.push({ ...base, kind: 'other', choices });
  }
  // A block holding another task with its own date line does not move (that task's day would move with it unasked).
  for (const item of out) if (item.choices[0] === 'move') {
    const row = rows.get(item.ownerId)!;
    if (parsed.rows.slice(row.index + 1, row.subtreeEndIndex).some(entry => owners.has(entry.id) && items.get(entry.id)?.isCanonical)) item.choices = item.choices.slice(1);
  }
  const offered = out.filter(item => item.kind === 'same' || item.choices.length);
  return offered.length ? { documentId, items: offered, lines: offered.reduce((sum, item) => sum + item.lineIds.length, 0) } : null;
}

/** What 위치 옮기기 takes (task-location-move's own refusals, read without moving): a folder task with nothing linked,
 *  no folder line and no repeat line in its block. */
function movable(rows: TextRow[], row: TextRow, task: TextTask, references: Set<string>): boolean {
  if (task.scopeKind !== 'folder' || !task.isCanonical) return false;
  return !rows.slice(row.index, row.subtreeEndIndex).some(entry => references.has(entry.id) || entry.kind === 'scope'
    || /^ *- \//.test(entry.text) || (entry.kind === 'task' || entry.kind === 'subcheck') && !!entry.title && !!readProgramRepeatMarker(entry.title));
}

/** The default of mockup ③ (decision 11/12): every other day moves (마감 where it cannot). */
export function programDateLineDefaults(plan: ProgramDateLinePlan): ProgramDateLineChoices {
  return Object.fromEntries(plan.items.filter(item => item.kind === 'other').map(item => [item.ownerId, item.choices[0]]));
}

/** The plan with these choices, on the text: its lines deleted, made 마감, or the task moved. Every other task, every
 *  record, link and folder stays as it was; null when something would change that should not. */
export function applyProgramDateLineChoices(text: TextWorkspaceState, plan: ProgramDateLinePlan, choices: ProgramDateLineChoices): TextWorkspaceState | null {
  const doc = M.getDocument(text, plan.documentId);
  if (!doc) return null;
  const others = plan.items.filter(item => item.kind === 'other');
  if (others.some(item => !item.choices.includes(choices[item.ownerId]))) return null;
  const drop = new Set<string>(), due = new Map<string, string>();
  for (const item of plan.items) {
    const choice = item.kind === 'same' ? 'delete' : choices[item.ownerId];
    if (choice === 'move') continue; // 위치 옮기기 drops the task's own date lines itself.
    const last = item.lineIds.at(-1)!;
    for (const id of item.lineIds) if (choice === 'delete' || id !== last) drop.add(id);
    if (choice === 'due') {
      const line = doc.lines.find(entry => entry.id === last), parts = line && DATE_LINE.exec(line.text);
      if (!parts || item.value === null) return null;
      due.set(last, `${parts[1]}마감: ${item.value}`);
    }
  }
  const lines = doc.lines.filter(line => !drop.has(line.id)).map(line => due.has(line.id) ? { id: line.id, text: due.get(line.id)! } : line);
  let next: TextWorkspaceState = { ...text, documents: text.documents.map(item => item.id === doc.id ? { ...item, lines } : item) };
  for (const item of others.filter(item => choices[item.ownerId] === 'move')) {
    const moved = moveTaskLocation(next, { documentId: plan.documentId, taskId: item.ownerId, target: { kind: 'date', date: item.value } });
    if (!moved.ok) return null;
    next = moved.next;
  }
  if (!M.validate(next) || !programSame(text.progressRecords, next.progressRecords) || !programSame(text.taskScopes, next.taskScopes)
    || !programSame(text.itemScopes, next.itemScopes) || !programSame(text.folders, next.folders)) return null;
  // Every link there was is there as it was (위치 옮기기 may add a folder line's own).
  const links = new Set(next.bindings.map(binding => JSON.stringify(binding)));
  if (text.bindings.some(binding => !links.has(JSON.stringify(binding)))) return null;
  return keepsMeaning(text, next, plan, choices) ? next : null;
}

/** Every task and subtask keeps its words, state, memo and time. A task's day is the planned one: what its line said
 *  (deleted, moved) or its section's (마감, with that 마감); one carried in a moved block takes the day it moved to; a
 *  subtask without its own date follows its parent, as ever. Other documents do not change. */
function keepsMeaning(before: TextWorkspaceState, after: TextWorkspaceState, plan: ProgramDateLinePlan, choices: ProgramDateLineChoices): boolean {
  if (before.documents.length !== after.documents.length || before.documents.some((doc, index) => doc.id !== after.documents[index].id
    || doc.id !== plan.documentId && doc !== after.documents[index] && !programSame(doc, after.documents[index])) || !programSame(before.flows, after.flows)) return false;
  const parsed = M.parseDocument(M.getDocument(before, plan.documentId)!, before), rows = new Map(parsed.rows.map(row => [row.id, row]));
  const now = new Map(M.parseDocument(M.getDocument(after, plan.documentId)!, after).items.map(item => [item.id, item]));
  if (parsed.items.length !== now.size) return false;
  const planned = new Map(plan.items.map(item => [item.ownerId, item])), carried = new Map<string, string | null>();
  for (const item of plan.items) if (item.kind === 'other' && choices[item.ownerId] === 'move') {
    const row = rows.get(item.ownerId)!;
    for (const entry of parsed.rows.slice(row.index + 1, row.subtreeEndIndex)) carried.set(entry.id, item.value);
  }
  for (const item of parsed.items) {
    const current = now.get(item.id);
    if (!current || (['title', 'done', 'note', 'time', 'isCanonical', 'parentItemId'] as const).some(key => current[key] !== item[key])) return false;
    const own = planned.get(item.id), choice = own && (own.kind === 'same' ? 'delete' : choices[own.ownerId]);
    if (own ? current.explicitDate : current.explicitDate !== item.explicitDate) return false;
    if (choice === 'due' && current.due !== own!.value) return false;
    if (!item.isCanonical) { if (item.explicitDate && !own && current.date !== item.date) return false; continue; }
    const expected = choice === 'due' ? own!.section : own ? own.value : carried.has(item.id) ? carried.get(item.id)! : item.date;
    if (current.date !== expected) return false;
  }
  return true;
}

/** 이대로 바꾸기: the plan as shown, applied in one save, only while the document still reads the same plan. */
export function applyProgramDateLines(data: ProgramData, input: ProgramPrivateMutationBase & { plan: ProgramDateLinePlan; choices: ProgramDateLineChoices }): ProgramTransition<string> {
  const fields = { documentId: input.plan.documentId, items: input.plan.items.map(item => ({ ownerId: item.ownerId, lineIds: item.lineIds, value: item.value, kind: item.kind })), choices: input.choices };
  return transitionProgramPrivateSpace(data, input, 'private-date-lines', fields, space => {
    const now = programDateLinePlan(space, input.plan.documentId);
    if (!now) return { result: input.plan.documentId, reason: 'conflict' };
    if (!programSame(now, input.plan)) return { result: input.plan.documentId, reason: 'conflict' };
    const next = applyProgramDateLineChoices(space.text, now, input.choices);
    if (!next) return { result: input.plan.documentId, reason: 'unresolved' };
    space.text = next;
    return { result: input.plan.documentId };
  });
}
