import type { ProgramPrivateSpace } from './contract';
import { PROGRAM_REPEAT_LOG_DAYS } from './repeat-log-shape';

/** N10 (SPEC 2·3·7): the days each repeat line was finished, one per day, ascending. They are kept in
 *  recurrenceExecution.lines: the production account check allows that field and not a new one, so no database
 *  change is needed. This module is the only reader and writer of that place; an account that never finished a
 *  repeat line has nothing there. */
export type ProgramRepeatLog = Record<string, string[]>;
type LogSpace = Pick<ProgramPrivateSpace, 'recurrenceExecution'>;

export function programRepeatDays(space: LogSpace, lineId: string): string[] {
  const lines = space.recurrenceExecution?.lines;
  return lines && Object.hasOwn(lines, lineId) ? [...lines[lineId]] : [];
}
export function programRepeatDayCount(space: LogSpace): number {
  return Object.values(space.recurrenceExecution?.lines ?? {}).reduce((sum, days) => sum + days.length, 0);
}
/** Adds a finished day in place. inserted: false when the day was already there (finished elsewhere first);
 *  limit: true when the account already holds every day it may. */
export function addProgramRepeatDay(space: ProgramPrivateSpace, lineId: string, day: string): { inserted: boolean; limit: boolean } {
  const days = programRepeatDays(space, lineId);
  if (days.includes(day)) return { inserted: false, limit: false };
  if (programRepeatDayCount(space) >= PROGRAM_REPEAT_LOG_DAYS) return { inserted: false, limit: true };
  const state = space.recurrenceExecution ?? { version: 1 as const, entries: {} };
  space.recurrenceExecution = { ...state, lines: { ...state.lines, [lineId]: [...days, day].sort() } };
  return { inserted: true, limit: false };
}
/** Takes back one day a check put in (되돌리기). A line left with no day loses its key, and the field loses `lines`
 *  (or goes, when it held nothing else), so taking back a first check leaves the account as it was. */
export function removeProgramRepeatDay(space: ProgramPrivateSpace, lineId: string, day: string): boolean {
  const state = space.recurrenceExecution, days = programRepeatDays(space, lineId);
  if (!state || !days.includes(day)) return false;
  const lines = { ...state.lines, [lineId]: days.filter(value => value !== day) };
  if (!lines[lineId].length) delete lines[lineId];
  const next: NonNullable<ProgramPrivateSpace['recurrenceExecution']> = { ...state, lines };
  if (!Object.keys(lines).length) delete next.lines;
  if (!next.lines && !Object.keys(next.entries).length) delete space.recurrenceExecution; else space.recurrenceExecution = next;
  return true;
}
// Two saves of the same account (SPEC 7) are not merged by unioning their logs: a stale save would bring back a day
// another device's 되돌리기 took out. A check refused for a newer revision is built again on the newer account
// instead (completeProgramRepeat, rebuildOnConflict), so each day comes from one person's own press.
