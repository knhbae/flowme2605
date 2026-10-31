import type { ProgramPrivateSpace } from './contract';
import { programLegacyTaskQualityHold } from './legacy-map-review';
import { programLegacyPlanTaskExcluded } from './program-legacy-plan-target';
import type { ProgramOrderedExecutionRow } from './recurrence-order';
import { programReferenceExecutionAccess } from './reference-execution-guard';

/** C6a 여러 개 고르기 (C6-C9-I7 2-2): why a row cannot be picked, or null when it can. Occurrences move one by one
 *  (총괄 10/30), finished tasks stay (결정 1), and a task the row's detail could not move (the same checks as its
 *  date change: the task's document locked, archived, in the trash or under a hold) is left too. */
export type ProgramSelectBlock = 'occurrence' | 'done' | 'locked';
export const PROGRAM_SELECT_REASON: Record<ProgramSelectBlock, string> = {
  occurrence: '반복 회차는 회차마다 날짜를 바꿉니다',
  done: '끝낸 할 일은 고를 수 없습니다',
  locked: '이 할 일은 지금 날짜를 바꿀 수 없습니다',
};
export function programSelectBlock(space: ProgramPrivateSpace, row: ProgramOrderedExecutionRow, done: boolean): ProgramSelectBlock | null {
  if (row.kind === 'occurrence') return 'occurrence';
  if (done) return 'done';
  if (programReferenceExecutionAccess(space, row.task.id).kind !== 'active'
    || programLegacyTaskQualityHold(space, row.task.id) || programLegacyPlanTaskExcluded(space, row.task.id)) return 'locked';
  return null;
}

/** One row picked or let go. */
export function programToggleSelection(selected: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(selected);
  if (!next.delete(key)) next.add(key);
  return next;
}

/** A day heading's [모두]: picks the day's pickable rows; when they are all picked already it is [풀기] and lets them
 *  go. Rows of other days stay as they were. `state` is the day's after it. */
export function programSelectDay(selected: ReadonlySet<string>, keys: readonly string[]): { selected: Set<string>; state: 'all' | 'none' } {
  const next = new Set(selected), all = keys.length > 0 && keys.every(key => selected.has(key));
  for (const key of keys) if (all) next.delete(key); else next.add(key);
  return { selected: next, state: all ? 'none' : 'all' };
}
/** Whether a day's pickable rows are all picked, for its [모두]/[풀기]. */
export const programDayPicked = (selected: ReadonlySet<string>, keys: readonly string[]) => keys.length > 0 && keys.every(key => selected.has(key));

/** Shift+click (PC): every pickable row from the last one pressed to this one, in the list's order, is picked; with
 *  no earlier press only this one. */
export function programSelectRange(selected: ReadonlySet<string>, order: readonly string[], pickable: ReadonlySet<string>, anchor: string | null, key: string): Set<string> {
  const next = new Set(selected), from = anchor === null ? -1 : order.indexOf(anchor), to = order.indexOf(key);
  if (from < 0 || to < 0) { if (pickable.has(key)) next.add(key); return next; }
  for (const at of order.slice(Math.min(from, to), Math.max(from, to) + 1)) if (pickable.has(at)) next.add(at);
  return next;
}
