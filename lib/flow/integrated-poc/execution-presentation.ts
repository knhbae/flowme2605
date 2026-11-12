import { programDate } from './program-data';
import { programDateRange, programLocalDate, programShiftDate, type ProgramPeriod } from './execution';
import type { ProgramOrderedExecutionRow } from './recurrence-order';
import { textWorkspaceModel as M, type TextTask, type TextWorkspaceState } from './text-workspace';
import { programCalendarDate, programDateLabel, programDaysBetween, programOverdueLabel } from './date-label';

export type ProgramExecutionDayGroup = 'on-date' | 'past-incomplete';
export type ProgramExecutionListItem =
  /** `orderDate`: I7, this one day is ordered by hand and differs from time order ('직접 정렬 · 시간순으로'). */
  | { kind: 'heading'; key: string; label: string; late: boolean; addDate: string | null; orderDate?: string }
  /** `dated`: a heading above already says this row's date. */
  | { kind: 'row'; entry: ProgramOrderedExecutionRow; group: ProgramExecutionDayGroup | null; dated: boolean }
  | { kind: 'empty-days'; dates: string[]; open: boolean };

const dayHeading = (date: string, today: string) => date === today ? `오늘 · ${programCalendarDate(date, today)}` : programCalendarDate(date, today);
const incomplete = (entry: ProgramOrderedExecutionRow) => entry.kind === 'text-task' ? !entry.task.done : entry.row.completion !== 'completed';

/** Day headings over the existing ordered rows. This never filters, sorts, or changes a date bucket.
 * Today splits into past incomplete and the viewed day; week and month get one heading per day,
 * and their days without rows fold into one line (shown as empty headings when open). */
export function programExecutionList(rows: readonly ProgramOrderedExecutionRow[], period: ProgramPeriod,
  date: string, today: string, emptyDaysOpen = false, manual: ReadonlyMap<string, unknown> = new Map()): ProgramExecutionListItem[] {
  const items: ProgramExecutionListItem[] = [];
  // I7: only a heading of one day carries it (지난 미완료 mixes days).
  const order = (day: string) => manual.has(day) ? { orderDate: day } : {};
  if (period === 'today') {
    const groups = rows.map(entry => !programDate(date) || !programDate(entry.date) ? null
      : entry.date === date ? 'on-date' as const : entry.date! < date && incomplete(entry) ? 'past-incomplete' as const : null);
    const late = groups.filter(group => group === 'past-incomplete').length;
    rows.forEach((entry, index) => {
      const group = groups[index];
      if (group && group !== groups[index - 1]) items.push(group === 'past-incomplete'
        ? { kind: 'heading', key: 'heading:past', label: `지난 미완료 · ${late}`, late: true, addDate: null }
        : { kind: 'heading', key: `heading:${date}`, label: dayHeading(date, today), late: false, addDate: date, ...order(date) });
      items.push({ kind: 'row', entry, group, dated: group === 'on-date' });
    });
    return items;
  }
  // 날짜 없음 has no headings; a hand-made order gets one, to carry its button.
  if (period === 'undated' && manual.has('undated') && rows.length)
    items.push({ kind: 'heading', key: 'heading:undated', label: '날짜 없음', late: false, addDate: null, orderDate: 'undated' });
  if (period !== 'week' && period !== 'month') return [...items, ...rows.map(entry => ({ kind: 'row' as const, entry, group: null, dated: period === 'undated' }))];
  const range = programDateRange(period, date), days: string[] = [];
  for (let day = range.from ?? ''; programDate(day) && day <= range.to!; day = programShiftDate(day, 1)) days.push(day);
  const counts = new Map<string, number>();
  for (const entry of rows) counts.set(entry.date ?? '', (counts.get(entry.date ?? '') ?? 0) + 1);
  const empty = days.filter(day => !counts.has(day));
  const emptyHeading = (day: string): ProgramExecutionListItem => ({ kind: 'heading', key: `heading:${day}`, label: dayHeading(day, today), late: false, addDate: day });
  let next = 0;
  rows.forEach((entry, index) => {
    if (index === 0 || entry.date !== rows[index - 1].date) {
      if (emptyDaysOpen) while (next < empty.length && (!entry.date || empty[next] < entry.date)) items.push(emptyHeading(empty[next++]));
      items.push(entry.date
        ? { kind: 'heading', key: `heading:${entry.date}`, label: `${dayHeading(entry.date, today)} · ${counts.get(entry.date)}`, late: false, addDate: programDate(entry.date) ? entry.date : null, ...order(entry.date) }
        : { kind: 'heading', key: 'heading:undated', label: `날짜 없음 · ${counts.get('')}`, late: false, addDate: null, ...order('undated') });
    }
    items.push({ kind: 'row', entry, group: null, dated: true });
  });
  if (emptyDaysOpen) while (next < empty.length) items.push(emptyHeading(empty[next++]));
  if (empty.length) items.push({ kind: 'empty-days', dates: empty, open: emptyDaysOpen });
  return items;
}

/** C5: one day's group for the calendar's sheet or panel, as the list heads it: the heading (its count, ＋ and
 *  I7's '시간순으로' when ordered by hand), then that day's rows in list order. A day without rows is its heading. */
export function programExecutionDay(rows: readonly ProgramOrderedExecutionRow[], day: string, today: string,
  manual: ReadonlyMap<string, unknown> = new Map()): ProgramExecutionListItem[] {
  const own = rows.filter(entry => entry.date === day);
  return [{ kind: 'heading', key: `heading:${day}`, label: own.length ? `${dayHeading(day, today)} · ${own.length}` : dayHeading(day, today), late: false,
    addDate: programDate(day) ? day : null, ...(manual.has(day) ? { orderDate: day } : {}) },
  ...own.map(entry => ({ kind: 'row' as const, entry, group: null, dated: true }))];
}

/** One row's date words: "20일 지남" stays apart so it can carry the warning colour. `since`: the day a line moved on
 *  by its date property was first written (its date section), or its 이어감 chain began. 총괄 11/12 ②: that first day is\n *  '1일째', so the third day is '3일째'; it shows from '2일째'. */
/** 'n일째' (총괄 11/12 ②; Codex re-review P2-2: one count wherever it shows, 오늘 and the 밀린 일 sheet alike). `since` is
 *  the day the task's 이어감 chain began (programContinuationStarts), else its own first day; that day is 1일째, so the
 *  third day is 3일째. Null on that first day (nothing to show) or for no day. */
export function programDayCount(since: string | null | undefined, today: string): number | null {
  return since && programDate(since) && programDate(today) && since < today ? programDaysBetween(since, today) + 1 : null;
}
export function programExecutionRowMeta(input: { date: string | null; done: boolean; progress: { date: string; percent: number } | null;
  today: string; dated: boolean; since?: string | null }): { late: string | null; parts: string[] } {
  const { date, today } = input;
  const late = !input.dated && !input.done ? programOverdueLabel(date, today) : null;
  const dateText = input.dated ? null : late ? programCalendarDate(date!, today, false) : programDateLabel(date, today);
  const progress = input.progress && programDate(input.progress.date) && !(input.dated && input.progress.date === date)
    ? `${input.progress.percent}% 기록` : null;
  const days = !late && !input.done && input.since && programDate(input.since) && programDate(date) && input.since < date! && programDate(today) ? programDayCount(input.since, today) ?? 0 : 0;
  const since = days >= 2 ? [`${days}일째`] : [];
  if (progress && input.progress!.date === date) return { late, parts: [progress, dateText ?? programDateLabel(date, today, false), ...since] };
  return { late, parts: [...(dateText ? [dateText] : []), ...(progress ? [`${progress} · ${programDateLabel(input.progress!.date, today, false)}`] : []), ...since] };
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
  task: Pick<TextTask, 'id' | 'docId'>, today = programLocalDate()): ProgramTaskDatePresentation | null {
  const document = M.getDocument(state, task.docId);
  if (!document || state.bindings.some(binding => binding.kind === 'task' && binding.docId === task.docId && binding.lineId === task.id)) return null;
  const analysis = M.parseDocument(document, state), item = analysis.tasks.find(row => row.id === task.id);
  const row = analysis.rows.find(row => row.id === task.id);
  if (!item || !row || row.kind !== 'task' || row.isReference) return null;
  if (analysis.issues.some(issue => issue.code === 'invalid-date' && issue.lineId === row.dateLineId
    || issue.code === 'invalid-date-property' && analysis.rows.find(entry => entry.id === issue.lineId)?.taskId === task.id)) return null;
  const section = row.dateLineId ? analysis.rows.find(entry => entry.id === row.dateLineId && entry.kind === 'date' && entry.valid) : null;
  const effectiveDate = item.date, sectionDate = section?.date ?? null;
  const day = (value: string | null) => value ? programCalendarDate(value, today, false) : '미정';
  if (item.explicitDate) return {
    source: 'individual', effectiveDate, sectionDate, label: `이 할 일의 날짜 · ${day(effectiveDate)}`,
    context: section && effectiveDate !== sectionDate ? `위 날짜 묶음은 ${day(sectionDate)}` : null,
  };
  if (section) return { source: 'section', effectiveDate, sectionDate, label: `날짜 묶음 · ${day(sectionDate)}`, context: null };
  return { source: 'unscheduled', effectiveDate, sectionDate: null, label: '날짜 미정', context: null };
}
