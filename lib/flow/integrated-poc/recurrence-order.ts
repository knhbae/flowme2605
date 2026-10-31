import { programClone, programFailure, programResult, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { validateProgramData } from './program-data';
import { programSame } from './controller';
import { programExecutionTasks } from './execution';
import { programRecurrencePeriodRows } from './recurrence-target';
import { type ProgramExecutionOccurrenceRow } from './recurrence-state';
import { type TextTask } from './text-workspace';
import { type ProgramExecutionTimelineOrders } from './recurrence-order-contract';
type Space = ProgramPrivateSpace & { executionTimelineOrders?: ProgramExecutionTimelineOrders };
export type ProgramExecutionQuery = Parameters<typeof programRecurrencePeriodRows>[1];
export type ProgramOrderedExecutionRow = { kind: 'text-task'; key: string; date: string | null; task: TextTask } | { kind: 'occurrence'; key: string; date: string | null; row: ProgramExecutionOccurrenceRow };
export const programTextExecutionKey = (task: Pick<TextTask, 'docId' | 'id'>) => JSON.stringify(['text-task', task.docId, task.id]);
export const programOccurrenceTargetKey = (row: ProgramExecutionOccurrenceRow) => JSON.stringify(['occurrence', ...JSON.parse(row.key)]);
export function programOrderedExecutionRows(data: ProgramData, query: ProgramExecutionQuery) {
  const space = data.spaces[data.activeActorId] as Space, recurrence = programRecurrencePeriodRows(data, query);
  const rows: ProgramOrderedExecutionRow[] = [...programExecutionTasks(space, query).map(task => ({ kind: 'text-task' as const, key: programTextExecutionKey(task), date: task.date, task })),
    ...recurrence.rows.map(row => ({ kind: 'occurrence' as const, key: programOccurrenceTargetKey(row), date: row.executionDate, row }))];
  const natural = new Map(rows.map((row, index) => [row.key, index])), authoritative = new Map<string, string[]>();
  // A day nobody has ordered by hand runs by time; rows without a time go last. A saved order wins.
  const time = (row: ProgramOrderedExecutionRow) => (row.kind === 'text-task' ? row.task.time : row.row.time) || '99:99';
  for (const date of new Set(rows.map(row => row.date ?? 'undated'))) {
    if (space.executionTimelineOrders?.[date]?.length || space.timelineOrders[date]?.length) continue;
    const bucket = rows.filter(row => (row.date ?? 'undated') === date), slots = bucket.map(row => natural.get(row.key)!);
    bucket.sort((a, b) => (time(a) < time(b) ? -1 : time(a) > time(b) ? 1 : 0) || natural.get(a.key)! - natural.get(b.key)!)
      .forEach((row, index) => natural.set(row.key, slots[index]));
  }
  for (const date of new Set(rows.map(row => row.date ?? 'undated'))) {
    const mixed = space.executionTimelineOrders?.[date] ?? [], old = space.timelineOrders[date] ?? [];
    const current = new Set(rows.filter(row => (row.date ?? 'undated') === date && row.kind === 'text-task').map(row => row.kind === 'text-task' ? row.task.id : ''));
    const mixedTaskIds = mixed.flatMap(key => { try { const tuple = JSON.parse(key); return tuple[0] === 'text-task' && current.has(tuple[2]) ? [tuple[2] as string] : []; } catch { return []; } });
    // Read-only rebase: legacy actions replace ordinary slots, never occurrence slots.
    // Moved/deleted targets are not slots in the current bucket. New rows append.
    const currentRows = rows.filter(row => (row.date ?? 'undated') === date);
    const live = new Set(currentRows.map(row => row.key));
    const slots = new Set(mixedTaskIds);
    const ordinary = currentRows.filter((row): row is Extract<ProgramOrderedExecutionRow, { kind: 'text-task' }> => row.kind === 'text-task' && slots.has(row.task.id));
    ordinary.sort((a, b) => { const index = (row: typeof a) => old.includes(row.task.id) ? old.indexOf(row.task.id) : old.length + natural.get(row.key)!; return index(a) - index(b); });
    let cursor = 0;
    authoritative.set(date, mixed.filter(key => live.has(key)).map(key => JSON.parse(key)[0] === 'text-task' ? ordinary[cursor++].key : key));
  }
  rows.sort((a, b) => {
    const date = (a.date ?? '9999-99-99').localeCompare(b.date ?? '9999-99-99'); if (date) return date;
    const order = authoritative.get(a.date ?? 'undated') ?? [];
    const index = (row: ProgramOrderedExecutionRow) => { const found = order.indexOf(row.key); return found < 0 ? order.length + natural.get(row.key)! : found; };
    return index(a) - index(b);
  });
  return { ...recurrence, rows };
}
export function reorderProgramExecutionTimeline(data: ProgramData, input: { actorId: string; query: ProgramExecutionQuery; targetKey: string; beforeKey: string | null; expectedKeys: string[]; expectedOrder: string[] | null }): ProgramTransition<string> {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  if (!validateProgramData(data)) return programFailure(data, 'invalid');
  const rows = programOrderedExecutionRows(data, input.query).rows, target = rows.find(row => row.key === input.targetKey);
  if (!target) return programFailure(data, 'missing');
  const date = target.date ?? 'undated', bucket = rows.filter(row => row.date === target.date), keys = bucket.map(row => row.key), space = data.spaces[input.actorId] as Space;
  if (!programSame(keys, input.expectedKeys) || !programSame(space.executionTimelineOrders?.[date] ?? null, input.expectedOrder)) return programFailure(data, 'conflict');
  if (input.beforeKey === input.targetKey) return { ok: true, data, changed: false, result: input.targetKey };
  if (input.beforeKey !== null && !keys.includes(input.beforeKey)) return programFailure(data, 'invalid');
  const ordered = keys.filter(key => key !== input.targetKey); ordered.splice(input.beforeKey === null ? ordered.length : ordered.indexOf(input.beforeKey), 0, input.targetKey);
  if (programSame(ordered, keys)) return { ok: true, data, changed: false, result: input.targetKey };
  const next = programClone(data), owner = next.spaces[input.actorId] as Space;
  const oldMixed = owner.executionTimelineOrders?.[date] ?? [];
  // Keep keys outside this filtered view; only visible slots are permuted.
  let cursor = 0; const merged = oldMixed.map(key => keys.includes(key) ? ordered[cursor++] : key);
  merged.push(...ordered.slice(cursor));
  owner.executionTimelineOrders = { ...owner.executionTimelineOrders, [date]: [...new Set(merged)] };
  const ordinary = ordered.flatMap(key => { const row = bucket.find(row => row.key === key); return row?.kind === 'text-task' ? [row.task.id] : []; });
  const ordinarySet = new Set(ordinary); let oldCursor = 0;
  const legacy = (owner.timelineOrders[date] ?? []).map(id => ordinarySet.has(id) ? ordinary[oldCursor++] : id); legacy.push(...ordinary.slice(oldCursor));
  owner.timelineOrders[date] = [...new Set(legacy)];
  return validateProgramData(next) ? programResult(data, next, input.targetKey) : programFailure(data, 'invalid');
}

/** I7: one day's saved order, both arrays, each null when the day has none (absent is not the same as empty). */
export type ProgramDayOrder = { date: string; mixed: string[] | null; legacy: string[] | null };
const own = (record: object | undefined, key: string) => !!record && Object.prototype.hasOwnProperty.call(record, key);
export function readProgramDayOrder(space: ProgramPrivateSpace, date: string): ProgramDayOrder {
  const saved = space as Space;
  return { date, mixed: own(saved.executionTimelineOrders, date) ? [...saved.executionTimelineOrders![date]] : null,
    legacy: own(saved.timelineOrders, date) ? [...saved.timelineOrders[date]] : null };
}
const dayOf = (row: ProgramOrderedExecutionRow) => row.date ?? 'undated';
const keysOn = (rows: readonly ProgramOrderedExecutionRow[], date: string) => rows.filter(row => dayOf(row) === date).map(row => row.key);
/** I7 '직접 정렬': the days of this view whose saved order now differs from time order, with how many of that day's
 *  rows the saved order places but a filter (분류, 글 찾기) hides here. A saved order that happens to match time
 *  order is not shown. */
export function programManualOrderDays(data: ProgramData, query: ProgramExecutionQuery,
  ordered: readonly ProgramOrderedExecutionRow[] = programOrderedExecutionRows(data, query).rows): Map<string, { hidden: number }> {
  const actorId = data.activeActorId, space = data.spaces[actorId] as Space;
  const dates = [...new Set(ordered.map(dayOf))].filter(date => !!space.executionTimelineOrders?.[date]?.length || !!space.timelineOrders[date]?.length);
  const days = new Map<string, { hidden: number }>();
  if (!dates.length) return days;
  const without = (orders: Record<string, string[]>) => Object.fromEntries(Object.entries(orders).filter(([date]) => !dates.includes(date)));
  const plain: ProgramData = { ...data, spaces: { ...data.spaces, [actorId]: { ...space, timelineOrders: without(space.timelineOrders),
    ...(space.executionTimelineOrders ? { executionTimelineOrders: without(space.executionTimelineOrders) } : {}) } as Space } };
  const byTime = programOrderedExecutionRows(plain, query).rows;
  const whole = query.folderId || query.query ? programOrderedExecutionRows(data, { ...query, folderId: '', query: '' }).rows : ordered;
  for (const date of dates) {
    if (programSame(keysOn(ordered, date), keysOn(byTime, date))) continue;
    const shown = new Set(keysOn(ordered, date)), placed = new Set([...(space.executionTimelineOrders?.[date] ?? []), ...(space.timelineOrders[date] ?? [])]);
    const hidden = whole.filter(row => dayOf(row) === date && !shown.has(row.key) && (placed.has(row.key) || row.kind === 'text-task' && placed.has(row.task.id))).length;
    days.set(date, { hidden });
  }
  return days;
}
/** I7 '시간순으로': forget the day's hand-made order, both arrays in one change and with them the places of rows a
 *  filter hides, only while it is the order the screen showed. The day then runs by time, untimed rows last,
 *  occurrences among them. Its result is the day. */
export function resetProgramExecutionDayOrder(data: ProgramData, input: { actorId: string; expected: ProgramDayOrder }): ProgramTransition<string> {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  if (!validateProgramData(data)) return programFailure(data, 'invalid');
  const date = input.expected.date;
  if (!programSame(readProgramDayOrder(data.spaces[input.actorId], date), input.expected)) return programFailure(data, 'conflict');
  if (input.expected.mixed === null && input.expected.legacy === null) return { ok: true, data, changed: false, result: date };
  const next = programClone(data), owner = next.spaces[input.actorId] as Space;
  if (owner.executionTimelineOrders) owner.executionTimelineOrders = Object.fromEntries(Object.entries(owner.executionTimelineOrders).filter(([key]) => key !== date));
  owner.timelineOrders = Object.fromEntries(Object.entries(owner.timelineOrders).filter(([key]) => key !== date));
  return validateProgramData(next) ? programResult(data, next, date) : programFailure(data, 'invalid');
}
/** Its 되돌리기, a new change (I10): both arrays back as they were, each present or not, only while the day still
 *  has no saved order; one saved since (here or on another device) refuses it. A task deleted since loses its
 *  place in the old array, as a text edit drops it. */
export function restoreProgramExecutionDayOrder(data: ProgramData, input: { actorId: string; removed: ProgramDayOrder }): ProgramTransition<string> {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  if (!validateProgramData(data)) return programFailure(data, 'invalid');
  const { date, mixed, legacy } = input.removed, now = readProgramDayOrder(data.spaces[input.actorId], date);
  if (now.mixed !== null || now.legacy !== null) return programFailure(data, 'conflict');
  if (mixed === null && legacy === null) return { ok: true, data, changed: false, result: date };
  const next = programClone(data), owner = next.spaces[input.actorId] as Space;
  if (mixed !== null) owner.executionTimelineOrders = { ...owner.executionTimelineOrders, [date]: [...mixed] };
  if (legacy !== null) {
    const lines = new Set([...owner.text.documents, ...owner.text.flows].flatMap(doc => doc.lines.map(line => line.id)));
    owner.timelineOrders = { ...owner.timelineOrders, [date]: legacy.filter(id => lines.has(id)) };
  }
  return validateProgramData(next) ? programResult(data, next, date) : programFailure(data, 'invalid');
}
