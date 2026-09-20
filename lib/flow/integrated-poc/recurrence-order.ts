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
