import { programDate } from './program-data';
import type { ProgramPeriod } from './execution';
import type { ProgramOrderedExecutionRow } from './recurrence-order';
import { textWorkspaceModel as M, type TextTask, type TextWorkspaceState } from './text-workspace';

export type ProgramExecutionDayGroup = 'on-date' | 'past-incomplete';
export type ProgramExecutionDayPresentation = {
  entry: ProgramOrderedExecutionRow;
  group: ProgramExecutionDayGroup | null;
  heading: string | null;
};

/** Mark existing contiguous rows. This never filters, sorts, or changes a date bucket. */
export function programExecutionDayPresentation(rows: readonly ProgramOrderedExecutionRow[], period: ProgramPeriod,
  date: string, today: string): ProgramExecutionDayPresentation[] {
  let previous: ProgramExecutionDayGroup | null = null;
  return rows.map(entry => {
    let group: ProgramExecutionDayGroup | null = null;
    if (period === 'today' && programDate(date) && programDate(entry.date)) {
      if (entry.date === date) group = 'on-date';
      else if (entry.date! < date && (entry.kind === 'text-task' ? !entry.task.done : entry.row.completion !== 'completed')) group = 'past-incomplete';
    }
    const heading = group && group !== previous
      ? group === 'past-incomplete' ? '지난 미완료' : date === today ? '오늘' : `조회 날짜 · ${date}`
      : null;
    previous = group;
    return { entry, group, heading };
  });
}

export type ProgramTaskDatePresentation = {
  source: 'individual' | 'section' | 'unscheduled';
  effectiveDate: string | null;
  sectionDate: string | null;
  label: string;
  context: string | null;
};

/** Read the actual canonical source row, including an explicit [미정] section. */
export function readProgramTaskDatePresentation(state: TextWorkspaceState,
  task: Pick<TextTask, 'id' | 'docId'>): ProgramTaskDatePresentation | null {
  const document = M.getDocument(state, task.docId);
  if (!document || state.bindings.some(binding => binding.kind === 'task' && binding.docId === task.docId && binding.lineId === task.id)) return null;
  const analysis = M.parseDocument(document, state), item = analysis.tasks.find(row => row.id === task.id);
  const row = analysis.rows.find(row => row.id === task.id);
  if (!item || !row || row.kind !== 'task' || row.isReference) return null;
  if (analysis.issues.some(issue => issue.code === 'invalid-date' && issue.lineId === row.dateLineId
    || issue.code === 'invalid-date-property' && analysis.rows.find(entry => entry.id === issue.lineId)?.taskId === task.id)) return null;
  const section = row.dateLineId ? analysis.rows.find(entry => entry.id === row.dateLineId && entry.kind === 'date' && entry.valid) : null;
  const effectiveDate = item.date, sectionDate = section?.date ?? null;
  if (item.explicitDate) return {
    source: 'individual', effectiveDate, sectionDate, label: `개별 날짜 · ${effectiveDate ?? '미정'}`,
    context: section && effectiveDate !== sectionDate ? `구획 날짜 · ${sectionDate ?? '미정'}` : null,
  };
  if (section) return { source: 'section', effectiveDate, sectionDate, label: `구획 날짜 · ${sectionDate ?? '미정'}`, context: null };
  return { source: 'unscheduled', effectiveDate, sectionDate: null, label: '날짜 미정', context: null };
}
