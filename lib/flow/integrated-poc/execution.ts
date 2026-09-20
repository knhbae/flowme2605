import { programClone, programFailure, programResult, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programDate, validateProgramData } from './program-data';
import { textWorkspaceModel as M, type TextTask } from './text-workspace';
import { programSame } from './controller';
import { programLegacyTaskQualityHold } from './legacy-map-review';
import { programLegacyPlanExcludedTargets } from './program-legacy-plan-target';

export type ProgramPeriod = 'documents' | 'today' | 'week' | 'month' | 'all' | 'undated';
export function programLocalDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function programShiftDate(date: string, days: number): string {
  if (!programDate(date) || !Number.isSafeInteger(days)) return '';
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days);
  if (!Number.isFinite(value.getTime())) return '';
  const shifted = value.toISOString().slice(0, 10);
  return programDate(shifted) ? shifted : '';
}
/** Calendar-month navigation clamps the day rather than skipping a short month. */
export function programShiftMonth(date: string, months: number): string {
  if (!programDate(date) || !Number.isSafeInteger(months)) return '';
  const [year, month, day] = date.split('-').map(Number);
  const target = year * 12 + month - 1 + months;
  if (!Number.isSafeInteger(target) || target < 0 || target >= 10000 * 12) return '';
  const targetYear = Math.floor(target / 12), targetMonth = target % 12;
  const leap = targetYear % 4 === 0 && (targetYear % 100 !== 0 || targetYear % 400 === 0);
  const lastDay = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][targetMonth];
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}
export function programDateRange(period: ProgramPeriod, date: string): { from?: string; to?: string; undatedOnly?: boolean } {
  if (!programDate(date)) return {};
  if (period === 'today') return { from: date, to: date };
  if (period === 'undated') return { undatedOnly: true };
  if (period === 'week') { const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); const from = programShiftDate(date, -(weekday + 6) % 7); return { from, to: programShiftDate(from, 6) }; }
  if (period === 'month') { const next = new Date(`${date.slice(0, 7)}-01T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() + 1); next.setUTCDate(0); return { from: `${date.slice(0, 7)}-01`, to: next.toISOString().slice(0, 10) }; }
  return {};
}
/** A projection label only: do not move the source date or manufacture a progress record. */
export function programIsContinuingTask(task: Pick<TextTask, 'date' | 'done'>, date: string): boolean {
  return programDate(date) && programDate(task.date) && task.date! < date && !task.done;
}
export function programExecutionTasks(space: ProgramPrivateSpace, input: { period?: ProgramPeriod; date?: string; folderId?: string; query?: string } = {}): TextTask[] {
  const today = input.period === 'today' ? input.date : undefined;
  if (input.period === 'today' && !programDate(today)) return [];
  const range = today ? { to: today } : input.period && input.date ? programDateRange(input.period, input.date) : {};
  const folderIds = new Set(input.folderId ? [input.folderId] : []);
  if (input.folderId) for (let i = 0; i < space.text.folders.length; i++) for (const folder of space.text.folders) if (folder.parentId && folderIds.has(folder.parentId)) folderIds.add(folder.id);
  const excludedSourceTargets = programLegacyPlanExcludedTargets(space);
  for (const copy of space.copies) {
    for (const [itemId, lineId] of Object.entries(copy.itemLines)) if (!copy.includedItemIds.includes(itemId)) excludedSourceTargets.add(lineId);
    // Source subchecks remain part of their original item, even after an outline
    // depth edit promotes the row. Private additions have no source sidecar.
    for (const children of Object.values(copy.subcheckLines)) for (const lineId of Object.values(children)) excludedSourceTargets.add(lineId);
  }
  const tasks = M.tasks(space.text, range).filter(task => {
    if (programLegacyTaskQualityHold(space, task.id)) return false;
    if (today && task.date !== today && !programIsContinuingTask(task, today)) return false;
    if (space.archivedDocumentIds.includes(task.docId)) return false;
    if (space.legacyTimelinePolicies[task.id] === 'excluded') return false;
    if (excludedSourceTargets.has(task.id)) return false;
    const actualFolder = space.text.flows.find(doc => doc.id === task.scopeId)?.folderId ?? task.folderId;
    return (!input.folderId || folderIds.has(actualFolder)) && (!input.query || `${task.title}\n${task.note}\n${task.docTitle}`.toLocaleLowerCase().includes(input.query.toLocaleLowerCase()));
  });
  const naturalOrder = new Map(tasks.map((task, index) => [task.id, index]));
  return tasks.sort((a, b) => {
    const dateOrder = (a.date ?? '9999-99-99').localeCompare(b.date ?? '9999-99-99'); if (dateOrder) return dateOrder;
    const order = space.timelineOrders[a.date ?? 'undated'] ?? [];
    const index = (task: TextTask) => { const saved = order.indexOf(task.id); return saved < 0 ? order.length + (naturalOrder.get(task.id) ?? 0) : saved; };
    return index(a) - index(b);
  });
}
/** All gestures and non-drag order controls call this single transition. Source rows stay unchanged. */
export function reorderProgramTimeline(data: ProgramData, input: { actorId: string; taskId: string; beforeTaskId: string | null; expectedIds: string[] }): ProgramTransition<string> {
  const space = data.spaces[input.actorId]; if (!space) return programFailure(data, 'forbidden');
  const tasks = programExecutionTasks(space), task = tasks.find(row => row.id === input.taskId);
  if (!task) return programFailure(data, 'missing');
  const bucket = tasks.filter(row => row.date === task.date).map(row => row.id);
  if (!programSame(bucket, input.expectedIds)) return programFailure(data, 'conflict');
  if (input.beforeTaskId === input.taskId) return programResult(data, data, task.id);
  if (input.beforeTaskId !== null && !bucket.includes(input.beforeTaskId)) return programFailure(data, 'invalid');
  const nextOrder = bucket.filter(id => id !== task.id);
  nextOrder.splice(input.beforeTaskId === null ? nextOrder.length : nextOrder.indexOf(input.beforeTaskId), 0, task.id);
  if (programSame(bucket, nextOrder)) return programResult(data, data, task.id);
  const next = programClone(data); next.spaces[input.actorId].timelineOrders[task.date ?? 'undated'] = nextOrder;
  return validateProgramData(next) ? programResult(data, next, task.id) : programFailure(data, 'invalid');
}
