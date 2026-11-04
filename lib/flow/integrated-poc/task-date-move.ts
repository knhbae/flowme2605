import { programFailure, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { patchProgramTask, transitionProgramPrivateSpace } from './private-space';
import { programSeriesMetadata } from './recurrence-target';
import { textWorkspaceModel as M } from './text-workspace';
import { programShiftDate } from './execution';
import { programCalendarDate } from './date-label';
import { ALPHA_TASK_DATE_MOVE_LIMIT, isAlphaTaskDateMoves, type AlphaTaskDateMove } from './alpha-social/contract';
import { resolveAlphaPrivateTaskSchedule } from './alpha-social/private-task-schedule';
import { detached } from './alpha-persistence/json';
import { readProgramRepeatMarker } from './repeat-line';

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
export function moveProgramTaskDates(data: ProgramData, input: { actorId: string; requestId: string; moves: ProgramTaskDateMove[] }): ProgramTransition<string> {
  if (!isAlphaTaskDateMoves(input.moves) || !Object.hasOwn(data.spaces, input.actorId)) return programFailure(data, 'invalid');
  const current = data.spaces[input.actorId];
  return transitionProgramPrivateSpace(data, { actorId: input.actorId, requestId: input.requestId, expectedSpace: current }, 'private-task-dates', { moves: input.moves }, space => {
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
      if (move.clearOverride && copy) {
        const itemId = Object.keys(copy.itemLines).find(id => copy.itemLines[id] === move.taskId)!;
        const { date: _date, ...rest } = copy.itemOverrides[itemId] ?? {};
        if (Object.keys(rest).length) copy.itemOverrides[itemId] = rest; else delete copy.itemOverrides[itemId];
      }
    }
    return { result: input.moves[0].taskId };
  });
}

/** 되돌리기 of a list, made from the space the move applied to (`before`) and the one it made (`after`): each moved task
 *  back to its old date, expecting it exactly as the move left it, and a copy's override taken away again where it had
 *  none when the move applied. */
export function programTaskDateUndo(before: ProgramPrivateSpace, after: ProgramPrivateSpace, moves: readonly ProgramTaskDateMove[]): ProgramTaskDateMove[] {
  return moves.filter(move => move.date !== move.expected.date).map(move => {
    const copy = copyOf(before, move.taskId), itemId = copy && Object.keys(copy.itemLines).find(id => copy.itemLines[id] === move.taskId);
    const hadOverride = !!copy && !!itemId && copy.itemOverrides[itemId]?.date !== undefined;
    return { taskId: move.taskId, expected: { date: move.date, time: move.expected.time, state: programTaskDateState(after, move.taskId)! }, date: move.expected.date,
      ...(copy && !hadOverride ? { clearOverride: true as const } : {}) };
  });
}

/** The date sheet's choices (2-4), each with its real date from today: 오늘, 내일, 다음 주 월요일 (weeks start on
 *  Monday), then 날짜 고르기… and 날짜 없음 in the sheet itself. A choice every picked task already has is off. */
export function programTaskDateChoices(today: string, picked: readonly (string | null)[]): { key: string; label: string; date: string | null; detail: string; off: boolean }[] {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay() || 7, monday = programShiftDate(today, 8 - weekday);
  const off = (date: string | null) => picked.length > 0 && picked.every(value => value === date);
  return [
    { key: 'today', label: '오늘', date: today, detail: programCalendarDate(today, today) },
    { key: 'tomorrow', label: '내일', date: programShiftDate(today, 1), detail: programCalendarDate(programShiftDate(today, 1), today) },
    { key: 'monday', label: '다음 주 월요일', date: monday, detail: programCalendarDate(monday, today, false) },
    { key: 'none', label: '날짜 없음', date: null, detail: '' },
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
/** 로 or 으로 after a word, by its last Hangul syllable (ㄹ and no final take 로). */
const ro = (word: string) => { const last = [...word].reverse().find(char => char >= '가' && char <= '힣'); const final = last ? (last.charCodeAt(0) - 0xac00) % 28 : 0; return final === 0 || final === 8 ? '로' : '으로'; };
/** The notice after a move (2-6): "3개를 11월 2일 (월)로 옮겼습니다", or 날짜 없음으로. */
export function programTaskDatesMovedText(count: number, date: string | null, today: string): string {
  const name = date ? programCalendarDate(date, today) : '날짜 없음';
  return `${count}개를 ${name}${ro(name)} 옮겼습니다`;
}
