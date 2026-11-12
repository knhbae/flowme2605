import type { ProgramPrivateSpace } from './contract';
import { programSame } from './controller';
import { programExecutionDocument } from './private-space';
import { programDocumentContentLock, programReferenceExecutionAccess } from './reference-execution-guard';
import { programTaskRepeatMembers } from './task-date-move';
import { moveTaskLocation } from './task-location-move';
import { readProgramRepeatMarker } from './repeat-line';
import { textWorkspaceModel as M, type TextRow, type TextTask, type TextWorkspaceState } from './text-workspace';

/** Redesign 3 (DECISION-1, W-TXT-03, mockup ③; 총괄 11/12: the whole account at once). The day of a task is the date
 *  section it sits in, so the '- 날짜:' lines go, once, on the person's word. A line saying the day the task reads
 *  without it is only deleted; one saying another day either takes the task to that day's section (그날로 옮기기, as
 *  위치 옮기기 does: the default) or becomes its '- 마감:' (마감으로 바꾸기). In a document without date headings a task's
 *  date is its 마감 (decision 11/12 12:4x): only 마감, no heading is made. A subtask cannot leave its parent, so it only
 *  takes 마감. A copy's document, a Flow run's, a Flow's own, a reference line, a repeat line and a line whose value
 *  cannot be read stay as they are (redesign step 5). The account's plan is one list; text-cleanup.ts applies it in one
 *  save after a snapshot, and 되돌리기 is the writing back as it was. */
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
export type ProgramDateLinePlan = { documentId: string; title: string; headless: boolean; items: ProgramDateLineItem[]; lines: number };
export type ProgramDateLineChoices = Record<string, ProgramDateLineChoice>;

const DATE_LINE = /^( *-\s+)날짜:\s*(.*)$/;
const DUE_LINE = /^ *-\s+마감:/;

/** Documents whose dates step 5 changes with the run and copy writing (none of their lines is offered). */
function excludedDocument(space: ProgramPrivateSpace, documentId: string): boolean {
  return !space.text.documents.some(doc => doc.id === documentId) || programDocumentContentLock(space, documentId) !== 'active'
    || space.copies.some(copy => copy.documentId === documentId) || space.savedBindings.some(binding => binding.documentId === documentId)
    || programExecutionDocument(space, documentId);
}

type Shared = { canonical: Map<string, TextTask>; repeats: Set<string>; external: Set<string> };
function shared(space: ProgramPrivateSpace): Shared {
  return { canonical: new Map(M.tasks(space.text).map(task => [task.id, task])), repeats: programTaskRepeatMembers(space),
    external: new Set([...space.copies.flatMap(copy => [...Object.values(copy.itemLines), ...Object.values(copy.subcheckLines).flatMap(lines => Object.values(lines))]),
      ...space.savedBindings.flatMap(binding => Object.values(binding.itemLines))]) };
}

/** The document's date lines, grouped by the line they are under, in line order. Null when the document is not offered. */
export function programDateLinePlan(space: ProgramPrivateSpace, documentId: string, given?: Shared): ProgramDateLinePlan | null {
  if (excludedDocument(space, documentId)) return null;
  const doc = M.getDocument(space.text, documentId)!, parsed = M.parseDocument(doc, space.text);
  const owners = new Map<string, string[]>();
  for (const row of parsed.rows) {
    if (row.kind !== 'property' || !row.taskId || row.parentLineId !== row.taskId || !DATE_LINE.test(row.text)) continue;
    owners.set(row.taskId, [...owners.get(row.taskId) ?? [], row.id]);
  }
  if (!owners.size) return null;
  const { canonical, repeats, external } = given ?? shared(space);
  const headless = !parsed.rows.some(row => row.kind === 'date');
  const items = new Map(parsed.items.map(item => [item.id, item])), rows = new Map(parsed.rows.map(row => [row.id, row]));
  const invalid = new Set(parsed.issues.filter(issue => issue.code === 'invalid-date-property').map(issue => issue.lineId));
  const references = new Set(space.text.bindings.filter(binding => binding.kind === 'task' && binding.docId === documentId).map(binding => binding.lineId));
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
    if (!headless && item.isCanonical && movable(parsed.rows, row, task, references)) choices.push('move');
    if (value !== null && !parsed.rows.some(entry => entry.kind === 'property' && entry.parentLineId === ownerId && DUE_LINE.test(entry.text))) choices.push('due');
    if (choices.length) out.push({ ...base, kind: 'other', choices });
  }
  // A block holding another task with its own date line does not move (that task's day would move with it unasked).
  for (const item of out) if (item.choices[0] === 'move') {
    const row = rows.get(item.ownerId)!;
    if (parsed.rows.slice(row.index + 1, row.subtreeEndIndex).some(entry => owners.has(entry.id) && items.get(entry.id)?.isCanonical)) item.choices = item.choices.slice(1);
  }
  const offered = out.filter(item => item.kind === 'same' || item.choices.length);
  return offered.length ? { documentId, title: doc.title || '새 문서', headless, items: offered, lines: offered.reduce((sum, item) => sum + item.lineIds.length, 0) } : null;
}

/** Every document's plan, in document order (the account's one list). */
export function programDateLineAccountPlan(space: ProgramPrivateSpace): ProgramDateLinePlan[] {
  const given = shared(space);
  return space.text.documents.flatMap(doc => { const plan = programDateLinePlan(space, doc.id, given); return plan ? [plan] : []; });
}

/** What 위치 옮기기 takes (task-location-move's own refusals, read without moving): a folder task with nothing linked,
 *  no folder line and no repeat line in its block. */
function movable(rows: TextRow[], row: TextRow, task: TextTask, references: Set<string>): boolean {
  if (task.scopeKind !== 'folder' || !task.isCanonical) return false;
  return !rows.slice(row.index, row.subtreeEndIndex).some(entry => references.has(entry.id) || entry.kind === 'scope'
    || /^ *- \//.test(entry.text) || (entry.kind === 'task' || entry.kind === 'subcheck') && !!entry.title && !!readProgramRepeatMarker(entry.title));
}

/** The defaults (mockup ③; W-TXT-03): every other day moves; in a document without date headings it is 마감. */
export function programDateLineDefaults(plans: readonly ProgramDateLinePlan[]): ProgramDateLineChoices {
  return Object.fromEntries(plans.flatMap(plan => plan.items).filter(item => item.kind === 'other').map(item => [item.ownerId, item.choices[0]]));
}

export type ProgramDateLineOutcome = 'delete' | 'move' | 'due' | 'keep';
/** What each listed line does with these choices (Codex P1-3, 11/12). A task's is its own: deleted when it says its
 *  section's day, else the choice. A subtask follows its parent's day as it will be (a parent made 마감 reads its
 *  section's day, one moved the day it moved to): its line goes when it says that day, else it becomes its 마감 (a
 *  subtask cannot leave its parent); one saying 미정, or under which a 마감 already is, stays as it is. */
export function programDateLineOutcomes(text: TextWorkspaceState, plan: ProgramDateLinePlan, choices: ProgramDateLineChoices): Map<string, ProgramDateLineOutcome> {
  const out = new Map<string, ProgramDateLineOutcome>(), doc = M.getDocument(text, plan.documentId);
  if (!doc) return out;
  const parsed = M.parseDocument(doc, text), planned = new Map(plan.items.map(item => [item.ownerId, item])), day = new Map<string, string | null>();
  for (const item of parsed.items) { // in line order: a parent before its subtasks
    const own = planned.get(item.id);
    if (item.isCanonical) {
      const outcome: ProgramDateLineOutcome | undefined = own && (own.kind === 'same' ? 'delete' : choices[own.ownerId]);
      if (own && outcome) out.set(item.id, outcome);
      day.set(item.id, !own ? item.date : outcome === 'due' ? own.section : own.value);
      continue;
    }
    const parent = item.parentItemId && day.has(item.parentItemId) ? day.get(item.parentItemId)! : item.date;
    if (!own) { day.set(item.id, item.explicitDate ? item.date : parent); continue; }
    const hasDue = parsed.rows.some(row => row.kind === 'property' && row.parentLineId === item.id && DUE_LINE.test(row.text));
    const outcome: ProgramDateLineOutcome = own.value === parent ? 'delete' : own.value !== null && !hasDue ? 'due' : 'keep';
    out.set(item.id, outcome);
    day.set(item.id, outcome === 'keep' ? own.value : parent);
  }
  return out;
}

/** One document's plan with these choices, on the text: its lines deleted, made 마감, or the task moved. Every other
 *  task, every record, link and folder stays as it was; null when something would change that should not. */
export function applyProgramDateLineChoices(text: TextWorkspaceState, plan: ProgramDateLinePlan, choices: ProgramDateLineChoices): TextWorkspaceState | null {
  const doc = M.getDocument(text, plan.documentId);
  if (!doc) return null;
  const others = plan.items.filter(item => item.kind === 'other');
  if (others.some(item => !item.choices.includes(choices[item.ownerId]))) return null;
  const outcomes = programDateLineOutcomes(text, plan, choices);
  const drop = new Set<string>(), due = new Map<string, string>();
  for (const item of plan.items) {
    const choice = outcomes.get(item.ownerId);
    if (!choice) return null;
    if (choice === 'move' || choice === 'keep') continue; // 위치 옮기기 drops the task's own date lines itself.
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
  const moves = plan.items.filter(item => outcomes.get(item.ownerId) === 'move');
  if (moves.length) {
    // The moves read this document (and those its links reach) alone: 위치 옮기기 checks the whole state it is given, and
    // a whole account read again for each move took seconds. The account is checked once after (merge + validate).
    const small = slice(next, plan.documentId), whole = !M.validate(small);
    let work = whole ? next : small;
    for (const item of moves) {
      const moved = moveTaskLocation(work, { documentId: plan.documentId, taskId: item.ownerId, target: { kind: 'date', date: item.value } });
      if (!moved.ok || moved.due !== undefined) return null;
      work = moved.next;
    }
    next = whole ? work : { ...next, documents: next.documents.map(item => item.id === plan.documentId ? M.getDocument(work, plan.documentId)! : item),
      bindings: [...next.bindings.filter(binding => binding.docId !== plan.documentId), ...work.bindings.filter(binding => binding.docId === plan.documentId)] };
  }
  // This document's part is checked here; the caller checks the whole account once (text-cleanup.ts).
  if (!M.validate(slice(next, plan.documentId)) || !programSame(text.progressRecords, next.progressRecords) || !programSame(text.taskScopes, next.taskScopes)
    || !programSame(text.itemScopes, next.itemScopes) || !programSame(text.folders, next.folders)) return null;
  // Every link there was is there as it was; a folder line a move left empty went with its own link (총괄 11/12).
  const links = new Set(next.bindings.map(binding => JSON.stringify(binding))), lineIds = new Set(next.documents.flatMap(item => item.lines.map(line => line.id)));
  if (text.bindings.some(binding => !links.has(JSON.stringify(binding)) && !(binding.kind === 'scope' && !lineIds.has(binding.lineId)))) return null;
  return keepsMeaning(text, next, plan, outcomes) ? next : null;
}

/** The part of the account one document's moves read: that document, the documents its reference lines point into, and
 *  the links, owners and records of their lines. The folders stay whole. */
function slice(text: TextWorkspaceState, documentId: string): TextWorkspaceState {
  const all = [...text.documents, ...text.flows];
  const owner = new Map(all.flatMap(item => item.lines.map(line => [line.id, item.id] as const)));
  const docs = new Set([documentId, ...text.bindings.flatMap(binding => binding.kind === 'task' && binding.docId === documentId ? [owner.get(binding.taskId) ?? ''] : [])]);
  const ids = new Set(all.filter(item => docs.has(item.id)).flatMap(item => item.lines.map(line => line.id)));
  const pick = (source: Record<string, string>) => Object.fromEntries(Object.entries(source).filter(([id]) => ids.has(id)));
  return { ...text, documents: text.documents.filter(item => docs.has(item.id)), flows: text.flows.filter(item => docs.has(item.id)),
    bindings: text.bindings.filter(binding => docs.has(binding.docId) && (binding.kind === 'scope' || ids.has(binding.taskId))),
    taskScopes: pick(text.taskScopes), itemScopes: pick(text.itemScopes), progressRecords: text.progressRecords.filter(record => ids.has(record.taskId)) };
}

/** Every task and subtask keeps its words, state, memo and time. A task's day is the planned one: what its line said
 *  (deleted, moved) or its section's (마감, with that 마감); one carried in a moved block takes the day it moved to; a
 *  subtask without its own date follows its parent, as ever; a listed subtask follows it too, its line gone only when
 *  it said that day, else its 마감 (Codex P1-3). Other documents do not change. */
function keepsMeaning(before: TextWorkspaceState, after: TextWorkspaceState, plan: ProgramDateLinePlan, outcomes: Map<string, ProgramDateLineOutcome>): boolean {
  if (before.documents.length !== after.documents.length || before.documents.some((doc, index) => doc.id !== after.documents[index].id
    || doc.id !== plan.documentId && doc !== after.documents[index] && !programSame(doc, after.documents[index])) || !programSame(before.flows, after.flows)) return false;
  const parsed = M.parseDocument(M.getDocument(before, plan.documentId)!, before), rows = new Map(parsed.rows.map(row => [row.id, row]));
  const now = new Map(M.parseDocument(M.getDocument(after, plan.documentId)!, after).items.map(item => [item.id, item]));
  if (parsed.items.length !== now.size) return false;
  const planned = new Map(plan.items.map(item => [item.ownerId, item])), carried = new Map<string, string | null>();
  for (const item of plan.items) if (outcomes.get(item.ownerId) === 'move') {
    const row = rows.get(item.ownerId)!;
    for (const entry of parsed.rows.slice(row.index + 1, row.subtreeEndIndex)) carried.set(entry.id, item.value);
  }
  for (const item of parsed.items) {
    const current = now.get(item.id);
    if (!current || (['title', 'done', 'note', 'time', 'isCanonical', 'parentItemId'] as const).some(key => current[key] !== item[key])) return false;
    const own = planned.get(item.id), choice = own && outcomes.get(item.id);
    if (own && !choice) return false;
    if (choice === 'keep') { if (!current.explicitDate || current.date !== item.date || current.due !== item.due) return false; continue; }
    if (own ? current.explicitDate : current.explicitDate !== item.explicitDate) return false;
    if (choice === 'due' && current.due !== own!.value) return false;
    // Every 마감 already there means the day it meant (Codex P2-1: a move to another year keeps a short one's year).
    if (choice !== 'due' && (current.due ?? null) !== (item.due ?? null)) return false;
    if (!item.isCanonical) {
      if (!own) { if (item.explicitDate && current.date !== item.date) return false; continue; }
      const parent = current.parentItemId ? now.get(current.parentItemId) : undefined;
      if (!parent || current.date !== parent.date || choice === 'delete' && own.value !== parent.date) return false;
      continue;
    }
    const expected = choice === 'due' ? own!.section : own ? own.value : carried.has(item.id) ? carried.get(item.id)! : item.date;
    if (current.date !== expected) return false;
  }
  return true;
}

/** W-TXT-03's machine check of the whole account: leaving out the '- 날짜:' lines (one may stay as a '- 마감:' line, the
 *  same line), every line is still there with its words (its indentation may change), and every new line is a date
 *  heading, a blank or a folder line; a folder line may go only when a move left it empty: it was linked to its folder,
 *  and everything that was under it (empty lines aside) went with the move, under that folder (Codex P1-2, 11/12). */
export function programDateLinesKeepLines(before: TextWorkspaceState, after: TextWorkspaceState): boolean {
  const docs = (text: TextWorkspaceState) => [...text.documents, ...text.flows];
  if (!programSame(docs(before).map(doc => doc.id), docs(after).map(doc => doc.id))) return false;
  const now = new Map(docs(after).flatMap(doc => doc.lines.map(line => [line.id, line.text] as const))), was = new Set(docs(before).flatMap(doc => doc.lines.map(line => line.id)));
  for (const line of docs(before).flatMap(doc => doc.lines)) {
    const text = now.get(line.id);
    // A date line left as it is (a repeat's, an unreadable one) stays; one taken on is gone or became that '- 마감:' line.
    if (DATE_LINE.test(line.text)) { if (text !== undefined && text !== line.text && !/^ *-\s+마감:/.test(text)) return false; continue; }
    if (text === undefined) { if (!/^ *- \//.test(line.text)) return false; continue; }
    if (text.trim() !== line.text.trim() && !yearWritten(line.text, text)) return false;
  }
  if (!docs(before).every(doc => emptiedFoldersOnly(before, after, doc.id))) return false;
  return [...now].every(([id, text]) => was.has(id) || !text.trim() || /^\[[^\]]*\]$/.test(text.trim()) || /^ *- \//.test(text));
}
/** A '- 마감: M/D' line given its year (moved to a section of another year, Codex P2-1); the day itself is checked by
 *  keepsMeaning. */
function yearWritten(was: string, now: string): boolean {
  const short = /^ *-\s+마감:\s*(\d{1,2})[/.-](\d{1,2})\s*$/.exec(was), full = /^ *-\s+마감:\s*\d{4}-(\d{2})-(\d{2})$/.exec(now);
  return !!short && !!full && Number(short[1]) === Number(full[1]) && Number(short[2]) === Number(full[2]);
}
/** Each folder line gone from this document was linked to a folder, and each line that was under it (empty lines and
 *  date lines aside) is now under that folder (or a folder inside it), or is itself such a gone folder line. */
function emptiedFoldersOnly(before: TextWorkspaceState, after: TextWorkspaceState, docId: string): boolean {
  const was = M.getDocument(before, docId), is = M.getDocument(after, docId);
  if (!was || !is) return true;
  const present = new Set(is.lines.map(line => line.id));
  const goneFolders = was.lines.filter(line => !present.has(line.id) && /^ *- \//.test(line.text));
  if (!goneFolders.length) return true;
  const rows = M.parseDocument(was, before).rows, nowRows = new Map(after.documents.concat(after.flows).flatMap(doc => M.parseDocument(doc, after).rows.map(row => [row.id, row] as const)));
  const gone = new Set(goneFolders.map(line => line.id));
  const within = (scopeId: string | null | undefined, folderId: string) => {
    for (let at = scopeId ? after.folders.find(folder => folder.id === scopeId) : undefined, steps = 0; at && steps < 20; at = after.folders.find(folder => folder.id === at!.parentId), steps++) if (at.id === folderId) return true;
    return false;
  };
  return goneFolders.every(line => {
    const binding = before.bindings.find(entry => entry.kind === 'scope' && entry.docId === docId && entry.lineId === line.id);
    const row = rows.find(entry => entry.id === line.id);
    if (!binding || binding.kind !== 'scope' || !row) return false;
    return rows.slice(row.index + 1, row.subtreeEndIndex).every(entry => {
      if (entry.text === '' || gone.has(entry.id) || DATE_LINE.test(entry.text) && !present.has(entry.id)) return true;
      const moved = nowRows.get(entry.id);
      return !!moved && moved.kind !== 'blank' && (within(moved.ancestorScopeId, binding.scopeId) || (moved.ancestorScopeIds ?? []).some(id => within(id, binding.scopeId)));
    });
  });
}
