import { programFailure, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { patchProgramTask, transitionProgramPrivateSpace } from './private-space';
import { programSeriesMetadata } from './recurrence-target';
import { textWorkspaceModel as M, type TextDocument, type TextRow, type TextTask } from './text-workspace';
import { programShiftDate, programTaskProgress } from './execution';
import { programCalendarDate } from './date-label';
import { ALPHA_TASK_DATE_MOVE_LIMIT, isAlphaTaskDateMoves, type AlphaTaskDateMove } from './alpha-social/contract';
import { resolveAlphaPrivateTaskSchedule } from './alpha-social/private-task-schedule';
import { detached } from './alpha-persistence/json';
import { readProgramRepeatMarker } from './repeat-line';
import { programReferenceExecutionAccess } from './reference-execution-guard';
import { programLegacyTaskQualityHold } from './legacy-map-review';
import { programLegacyPlanTaskExcluded } from './program-legacy-plan-target';

/** C6b 날짜 한꺼번에 바꾸기 (C6-C9-I7 2-4~2-6): one task of the list, its date and time when picked, its new date. */
export type ProgramTaskDateMove = AlphaTaskDateMove;
export const PROGRAM_TASK_DATE_MOVE_LIMIT = ALPHA_TASK_DATE_MOVE_LIMIT;

const copyOf = (space: ProgramPrivateSpace, taskId: string) => space.copies.find(copy => Object.values(copy.itemLines).includes(taskId));
/** A task its repeat owns: a personal repeat's source or a round it made, a copy's item in its repeat, or any other
 *  series line. They move one by one (occurrence by occurrence), never in a list (C6a, and again in the command). */
export function programTaskRepeatMember(space: ProgramPrivateSpace, taskId: string): boolean {
  if (programTaskSeriesMember(space, taskId)) return true;
  // N10 (SPEC 4): a repeat line moves one at a time too; its date is its current round.
  const task = M.tasks(space.text).find(item => item.id === taskId);
  return !!task && !task.done && !!readProgramRepeatMarker(task.title);
}
/** The repeats that existed before repeat lines: a personal repeat, a copy's repeat, a series line. A repeat line may
 *  not be one of these too (N10 SPEC 1). */
export function programTaskSeriesMember(space: ProgramPrivateSpace, taskId: string): boolean {
  if (space.personalAuthoring?.series.some(series => !series.stopped && series.source.kind === 'task' && series.source.taskId === taskId
    || series.rounds.some(round => Object.values(round.taskIds).includes(taskId)))) return true;
  if (space.copies.some(copy => (copy.recurrence?.itemIds ?? []).some(itemId => copy.itemLines[itemId] === taskId))) return true;
  return programSeriesMetadata(space).some(row => row.lineId === taskId);
}
/** A token of a task's whole state: its line and the lines under it (words, date, time, memo), finished or not, its
 *  progress, and a copy's override (present or not, and its value). A list expects it as picked; 되돌리기 expects it
 *  as the move left it (C6b review). */
export function programTaskDateState(space: ProgramPrivateSpace, taskId: string): string | null {
  for (const doc of [...space.text.documents, ...space.text.flows]) {
    const at = doc.lines.findIndex(line => line.id === taskId);
    if (at < 0) continue;
    // A blank does not end the parser-owned block: a later indented memo (or
    // independent child task) still belongs to this task's picked state.
    const row = M.parseDocument(doc, space.text).rows[at];
    const lines = doc.lines.slice(at, row?.subtreeEndIndex ?? at + 1).map(line => line.text);
    const task = M.tasks(space.text).find(row => row.id === taskId), copy = copyOf(space, taskId);
    const itemId = copy && Object.keys(copy.itemLines).find(id => copy.itemLines[id] === taskId);
    return programStateHash(JSON.stringify({ lines, done: task?.done ?? null, progress: M.currentProgress(space.text, taskId), override: copy && itemId ? detached(copy.itemOverrides[itemId] ?? null) : null }));
  }
  return null;
}
/** programTaskDateState for many tasks of one space (N11a): the same tokens, with each document parsed once and the
 *  tasks and their progress read once (one by one, a hundred lines took seconds). */
export function programTaskDateStates(space: ProgramPrivateSpace): (taskId: string) => string | null {
  const docs = [...space.text.documents, ...space.text.flows], rows = new Map<string, TextRow[]>();
  let tasks: Map<string, TextTask> | null = null, progress: ReturnType<typeof programTaskProgress> | null = null;
  return taskId => {
    for (const doc of docs) {
      const at = doc.lines.findIndex(line => line.id === taskId);
      if (at < 0) continue;
      if (!rows.has(doc.id)) rows.set(doc.id, M.parseDocument(doc, space.text).rows);
      const row = rows.get(doc.id)![at], lines = doc.lines.slice(at, row?.subtreeEndIndex ?? at + 1).map(line => line.text);
      tasks ??= new Map(M.tasks(space.text).map(task => [task.id, task])); progress ??= programTaskProgress(space.text);
      const task = tasks.get(taskId), copy = copyOf(space, taskId), itemId = copy && Object.keys(copy.itemLines).find(id => copy.itemLines[id] === taskId);
      return programStateHash(JSON.stringify({ lines, done: task?.done ?? null, progress: progress(taskId).current, override: copy && itemId ? detached(copy.itemOverrides[itemId] ?? null) : null }));
    }
    return null;
  };
}
/** programTaskRepeatMember for every task at once (N11a): the IDs a repeat owns. */
export function programTaskRepeatMembers(space: ProgramPrivateSpace): Set<string> {
  const ids = new Set<string>(programSeriesMetadata(space).map(row => row.lineId));
  for (const series of space.personalAuthoring?.series ?? []) {
    if (!series.stopped && series.source.kind === 'task') ids.add(series.source.taskId);
    for (const round of series.rounds) for (const id of Object.values(round.taskIds)) ids.add(id);
  }
  for (const copy of space.copies) for (const itemId of copy.recurrence?.itemIds ?? []) if (copy.itemLines[itemId]) ids.add(copy.itemLines[itemId]);
  for (const task of M.tasks(space.text)) if (!task.done && readProgramRepeatMarker(task.title)) ids.add(task.id);
  return ids;
}
/** cyrb53: a short, stable token (not a secret; it only tells a change). */
export function programStateHash(text: string): string {
  let a = 0xdeadbeef, b = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
}
/** Whether the list holds a public copy's task: then the whole list goes to the server as one social intent. */
export const programTaskDateMovesSocial = (space: ProgramPrivateSpace, moves: readonly ProgramTaskDateMove[]) => moves.some(move => !!copyOf(space, move.taskId));

/** Moves the listed tasks, all or none, in one change. Each must still be as it was when picked (its date, time and
 *  whole state) and be open, active and outside a repeat, also one already on the new date (it is checked, not moved);
 *  a copy's task must resolve to exactly its copy (as for one task). Only the
 *  date (with a copy's date override) changes: ids, progress, time, text and the lines' places stay, the day orders
 *  too. The whole space is not compared, only these tasks, so an unrelated save in between does not block it.
 *  되돌리기 is the same command (programTaskDateUndo). A retry of the request changes nothing again. */
export function moveProgramTaskDates(data: ProgramData, input: { actorId: string; requestId: string; moves: ProgramTaskDateMove[]; time?: ProgramTaskDateTime }): ProgramTransition<string> {
  if (!isAlphaTaskDateMoves(input.moves) || !Object.hasOwn(data.spaces, input.actorId)) return programFailure(data, 'invalid');
  // Codex f12a review P2-2 (11/12): a time picked with the date of a Flow step whose plan moves several steps is saved in
  // the same change (and comes back with 되돌리기). Only on this device: a list with a copy's task goes to the server
  // without it (the server's command has no time), so the screen never sends one there.
  const time = input.time;
  if (time && (typeof time.taskId !== 'string' || typeof time.time !== 'string' || !input.moves.some(move => move.taskId === time.taskId))) return programFailure(data, 'invalid');
  const current = data.spaces[input.actorId];
  return transitionProgramPrivateSpace(data, { actorId: input.actorId, requestId: input.requestId, expectedSpace: current }, 'private-task-dates', time ? { moves: input.moves, time } : { moves: input.moves }, space => {
    const tasks = M.tasks(space.text);
    // Every expectation reads the same untouched transaction snapshot. A prior
    // pick's date change must not invalidate a selected ancestor's state token.
    for (const move of input.moves) {
      const copy = copyOf(space, move.taskId);
      if (move.clearOverride && !copy) return { result: move.taskId, reason: 'invalid' };
      if (programTaskRepeatMember(space, move.taskId)) return { result: move.taskId, reason: 'unresolved' };
      if (copy && !resolveAlphaPrivateTaskSchedule(data, input.actorId, move.taskId)) return { result: move.taskId, reason: 'unresolved' };
      const before = tasks.find(task => task.id === move.taskId);
      if (!before) return { result: move.taskId, reason: 'missing' };
      // Changed since it was picked (its date, its time, anything of it, or finished): nothing moves.
      if (before.date !== move.expected.date || (before.time ?? '') !== move.expected.time
        || move.expected.state !== undefined && programTaskDateState(space, move.taskId) !== move.expected.state
        || before.done || M.currentProgress(space.text, move.taskId) === 100) return { result: move.taskId, reason: 'conflict' };
    }
    for (const move of input.moves) {
      const copy = copyOf(space, move.taskId);
      // The row detail's checks run for every task, also one already on the new date (it then does not change).
      const patched = patchProgramTask(space, move.taskId, { date: move.date });
      if (patched.reason) return patched;
      // Core3 P3b: a date the line already takes from its day heading needs no 날짜 line. So 되돌리기 (the same
      // command back) leaves the writing exactly as before the move, as ↶ does, and a move onto the heading's day
      // writes nothing extra either. Codex f12a13 review P1-1 (11/12): a task already on the new date is checked, not moved:
      // its lines stay as they are (a 날짜 line equal to its heading's date too), as 되돌리기 takes back only the tasks it moved.
      const inherited = move.date === move.expected.date ? space.text : M.restoreTaskDate(space.text, move.taskId);
      if (inherited !== space.text && M.tasks(inherited).find(task => task.id === move.taskId)?.date === move.date) space.text = inherited;
      if (move.clearOverride && copy) {
        const itemId = Object.keys(copy.itemLines).find(id => copy.itemLines[id] === move.taskId)!;
        const { date: _date, ...rest } = copy.itemOverrides[itemId] ?? {};
        if (Object.keys(rest).length) copy.itemOverrides[itemId] = rest; else delete copy.itemOverrides[itemId];
      }
    }
    if (time) {
      if (copyOf(space, time.taskId)) return { result: time.taskId, reason: 'invalid' };
      const patched = patchProgramTask(space, time.taskId, { time: time.time });
      if (patched.reason) return patched;
    }
    return { result: input.moves[0].taskId };
  });
}
/** The time set with a list's dates (P2-2): one moved task's new time. */
export type ProgramTaskDateTime = { taskId: string; time: string };

/** Codex f12a review P1 (11/12): what 되돌리기 puts back for each task of a list with no copy's task: its lines exactly as
 *  they were before the move: a 날짜 line there or not, with its words, place and line ID, and a time set with the move. */
export type ProgramTaskDateLines = { taskId: string; lines: { id: string; text: string }[] };
/** A task's lines (the task and the lines under it, as its state token reads them), in the document holding it. */
function programTaskBlock(space: ProgramPrivateSpace, taskId: string): { doc: TextDocument; at: number; end: number } | null {
  for (const doc of [...space.text.documents, ...space.text.flows]) {
    const at = doc.lines.findIndex(line => line.id === taskId);
    if (at < 0) continue;
    const row = M.parseDocument(doc, space.text).rows[at];
    return { doc, at, end: row?.subtreeEndIndex ?? at + 1 };
  }
  return null;
}
/** The lines of each task 되돌리기 moves back, read in the space the move applied to (`before`). */
export function programTaskDateUndoLines(before: ProgramPrivateSpace, undo: readonly ProgramTaskDateMove[]): ProgramTaskDateLines[] | null {
  const out: ProgramTaskDateLines[] = [];
  for (const move of undo) {
    const block = programTaskBlock(before, move.taskId);
    if (!block) return null;
    out.push({ taskId: move.taskId, lines: block.doc.lines.slice(block.at, block.end).map(line => ({ id: line.id, text: line.text })) });
  }
  return out;
}
/** 되돌리기 of a list with no copy's task (P1): each task's lines back exactly as before the move. The date command alone
 *  cannot: a 날짜 line equal to its day heading's date is dropped by it (Core3 P3b), also one written before the move.
 *  Each task must still be exactly as the move left it (its date, time and state token, as the date command checks); a
 *  save elsewhere in between does not block it. A task inside another undone task's lines comes back with them. Its
 *  receipt is the date command's (kind and moves). A list with a copy's task keeps the date command (the server runs it). */
export function restoreProgramTaskDates(data: ProgramData, input: { actorId: string; requestId: string; moves: ProgramTaskDateMove[]; lines: ProgramTaskDateLines[] }): ProgramTransition<string> {
  if (!isAlphaTaskDateMoves(input.moves) || !Object.hasOwn(data.spaces, input.actorId) || input.lines.length !== input.moves.length
    || input.moves.some((move, index) => input.lines[index]?.taskId !== move.taskId || !input.lines[index].lines.length || input.lines[index].lines[0].id !== move.taskId)) return programFailure(data, 'invalid');
  const current = data.spaces[input.actorId];
  return transitionProgramPrivateSpace(data, { actorId: input.actorId, requestId: input.requestId, expectedSpace: current }, 'private-task-dates', { moves: input.moves }, space => {
    const tasks = M.tasks(space.text);
    for (const move of input.moves) {
      if (copyOf(space, move.taskId)) return { result: move.taskId, reason: 'invalid' };
      if (programTaskRepeatMember(space, move.taskId)) return { result: move.taskId, reason: 'unresolved' };
      // Codex f12a13 review P2-1: the date command's own checks (patchProgramTask): an archived or held document, a reference
      // not active here, a legacy task on hold or out of the plan is not changed.
      if (programReferenceExecutionAccess(space, move.taskId).kind !== 'active' || programLegacyTaskQualityHold(space, move.taskId)
        || programLegacyPlanTaskExcluded(space, move.taskId)) return { result: move.taskId, reason: 'unresolved' };
      const now = tasks.find(task => task.id === move.taskId);
      if (!now) return { result: move.taskId, reason: 'missing' };
      if (now.date !== move.expected.date || (now.time ?? '') !== move.expected.time
        || move.expected.state !== undefined && programTaskDateState(space, move.taskId) !== move.expected.state
        || now.done || M.currentProgress(space.text, move.taskId) === 100) return { result: move.taskId, reason: 'conflict' };
    }
    const blocks = input.moves.map((move, index) => ({ block: programTaskBlock(space, move.taskId)!, lines: input.lines[index].lines }));
    const inside = (a: { doc: TextDocument; at: number; end: number }, b: { doc: TextDocument; at: number; end: number }) =>
      a !== b && a.doc === b.doc && b.at <= a.at && a.end <= b.end && (b.at < a.at || a.end < b.end);
    const outer = blocks.filter(entry => !blocks.some(other => inside(entry.block, other.block)));
    for (const doc of new Set(outer.map(entry => entry.block.doc))) {
      const lines = doc.lines.slice();
      // From the bottom up, so each block's place is still where it was read.
      for (const entry of outer.filter(item => item.block.doc === doc).sort((a, b) => b.block.at - a.block.at)) {
        lines.splice(entry.block.at, entry.block.end - entry.block.at, ...entry.lines.map(line => ({ id: line.id, text: line.text })));
      }
      space.text = { ...space.text, documents: space.text.documents.map(item => item === doc ? { ...item, lines } : item), flows: space.text.flows.map(item => item === doc ? { ...item, lines } : item) };
    }
    const back = M.tasks(space.text);
    if (input.moves.some(move => back.find(task => task.id === move.taskId)?.date !== move.date)) return { result: input.moves[0].taskId, reason: 'conflict' };
    return { result: input.moves[0].taskId };
  });
}

/** 되돌리기 of a list, made from the space the move applied to (`before`) and the one it made (`after`): each moved task
 *  back to its old date, expecting it exactly as the move left it, and a copy's override taken away again where it had
 *  none when the move applied. */
export function programTaskDateUndo(before: ProgramPrivateSpace, after: ProgramPrivateSpace, moves: readonly ProgramTaskDateMove[]): ProgramTaskDateMove[] {
  const moved = new Map(M.tasks(after.text).map(task => [task.id, task]));
  return moves.filter(move => move.date !== move.expected.date).map(move => {
    const copy = copyOf(before, move.taskId), itemId = copy && Object.keys(copy.itemLines).find(id => copy.itemLines[id] === move.taskId);
    const hadOverride = !!copy && !!itemId && copy.itemOverrides[itemId]?.date !== undefined;
    // P2-2: a time set with the move is the time it is expected with (the move left it). Codex f12a13 review P1-2: a time
    // taken away is no time (''), not the time before.
    const left = moved.get(move.taskId);
    return { taskId: move.taskId, expected: { date: move.date, time: left ? left.time ?? '' : move.expected.time, state: programTaskDateState(after, move.taskId)! }, date: move.expected.date,
      ...(copy && !hadOverride ? { clearOverride: true as const } : {}) };
  });
}

/** The date sheet's choices (2-4), each with its real date from today: 오늘, 내일, 다음 주 월요일 (weeks start on
 *  Monday), then 날짜 고르기… and 날짜 미정 in the sheet itself. A choice every picked task already has is off. */
export function programTaskDateChoices(today: string, picked: readonly (string | null)[]): { key: string; label: string; date: string | null; detail: string; off: boolean }[] {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay() || 7, monday = programShiftDate(today, 8 - weekday);
  const off = (date: string | null) => picked.length > 0 && picked.every(value => value === date);
  return [
    { key: 'today', label: '오늘', date: today, detail: programCalendarDate(today, today) },
    { key: 'tomorrow', label: '내일', date: programShiftDate(today, 1), detail: programCalendarDate(programShiftDate(today, 1), today) },
    { key: 'monday', label: '다음 주 월요일', date: monday, detail: programCalendarDate(monday, today, false) },
    { key: 'none', label: '날짜 미정', date: null, detail: '' },
  ].map(choice => ({ ...choice, off: off(choice.date) }));
}
/** N9 line menu chips: the sheet's 오늘 and 내일, then 이번 주말, the coming Saturday (today on a Saturday or Sunday).
 *  날짜 고르기 stays the row's own date form. */
export function programLineDateChips(today: string): { key: string; label: string; date: string; detail: string }[] {
  const [todayChoice, tomorrow] = programTaskDateChoices(today, []), weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const weekend = weekday === 0 || weekday === 6 ? today : programShiftDate(today, 6 - weekday);
  return [todayChoice, tomorrow, { key: 'weekend', label: '이번 주말', date: weekend, detail: programCalendarDate(weekend, today) }]
    .map(({ key, label, date, detail }) => ({ key, label, date: date!, detail }));
}
/** Core3 P3 (UX F2): the 미루기 chips at the top of a row's ⋯ — the writing chips' 내일 and 이번 주말, then the date
 *  sheet's 다음 주 (its Monday) — each with its date. One that is the task's own day, or not after today, is off (on a
 *  weekend 이번 주말 is today). 날짜 고르기 is the row's own date picker. */
export function programDeferChips(today: string, current: string | null): { key: string; label: string; date: string; detail: string; off: boolean }[] {
  const [, tomorrow, weekend] = programLineDateChips(today), monday = programTaskDateChoices(today, [])[2];
  // P3b (UX): a chip landing on the same day as one before it is off too (Sunday: 다음 주 = 내일; Friday: 이번 주말 = 내일).
  return [tomorrow, weekend, { key: 'next-week', label: '다음 주', date: monday.date!, detail: monday.detail }]
    .map((chip, index, all) => ({ ...chip, off: chip.date === current || chip.date <= today || all.slice(0, index).some(prior => prior.date === chip.date) }));
}
/** 로 or 으로 after a word, by its last Hangul syllable (ㄹ and no final take 로). */
const ro = (word: string) => { const last = [...word].reverse().find(char => char >= '가' && char <= '힣'); const final = last ? (last.charCodeAt(0) - 0xac00) % 28 : 0; return final === 0 || final === 8 ? '로' : '으로'; };
/** The notice after a move (2-6): "3개를 11월 2일 (월)로 옮겼습니다", or 날짜 미정으로 (N11b: as the 날짜 미정 view is named). */
export function programTaskDatesMovedText(count: number, date: string | null, today: string): string {
  const name = date ? programCalendarDate(date, today) : '날짜 미정';
  // Core3 P3b (UX): one task is said by its new day alone ("11월 9일 (월)로 옮겼습니다"); several keep their count.
  return `${count === 1 ? '' : `${count}개를 `}${name}${ro(name)} 옮겼습니다`;
}
