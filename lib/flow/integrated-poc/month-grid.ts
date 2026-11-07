import { programDate } from './program-data';
import { programShiftDate, programShiftMonth } from './execution';
import type { ProgramOrderedExecutionRow } from './recurrence-order';

/** C5 month calendar (10-month-calendar.md 2·5): a Monday-first grid of one month. Its days count the very rows the
 *  list heads them with (the same query: filters, held and excluded occurrences), finished ones and occurrences too. */
export type ProgramMonthState = 'late' | 'open' | 'done';
export type ProgramMonthCell = {
  date: string; day: number; count: number; late: number; done: number;
  /** One dot per row by urgency (지남, 남음, 끝냄), three at most; `more` is the rest. Flow pipeline S3: a day with rows of
   *  the marked Flow starts with one 'flow' dot standing for them. */
  dots: (ProgramMonthState | 'flow')[]; more: number;
  /** Wide screens: three titles in list order, or two and `titleMore`; a marked Flow's titles say so. */
  titles: { text: string; state: ProgramMonthState; flow?: true }[]; titleMore: number;
  label: string; today: boolean; selected: boolean;
  /** S3: how many of the day's rows belong to the marked Flow. */
  flow: number;
};

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const LONG = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
/** 0 for Monday … 6 for Sunday. */
const weekday = (date: string) => (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
const rank: Record<ProgramMonthState, number> = { late: 0, open: 1, done: 2 };

/** "10월" this year, "2027년 1월" in another. */
export function programMonthTitle(date: string, today: string): string {
  if (!programDate(date)) return '월간';
  const month = Number(date.slice(5, 7));
  return programDate(today) && date.slice(0, 4) !== today.slice(0, 4) ? `${Number(date.slice(0, 4))}년 ${month}월` : `${month}월`;
}

function state(row: ProgramOrderedExecutionRow, today: string): ProgramMonthState {
  const done = row.kind === 'text-task' ? row.task.done : row.row.completion === 'completed';
  return done ? 'done' : row.date && row.date < today ? 'late' : 'open';
}
const title = (row: ProgramOrderedExecutionRow) => row.kind === 'text-task' ? row.task.title : row.row.title;

export function programMonthGrid(rows: readonly ProgramOrderedExecutionRow[], date: string, today: string, selected: string,
  flow?: { test: (row: ProgramOrderedExecutionRow) => boolean; title: string }) {
  const first = `${date.slice(0, 7)}-01`, byDay = new Map<string, ProgramOrderedExecutionRow[]>();
  for (const row of rows) if (row.date && row.date.slice(0, 7) === first.slice(0, 7)) byDay.set(row.date, [...(byDay.get(row.date) ?? []), row]);
  const cells: (ProgramMonthCell | null)[] = Array.from({ length: weekday(first) }, () => null);
  for (let day = first; day.slice(0, 7) === first.slice(0, 7); day = programShiftDate(day, 1)!) {
    const list = byDay.get(day) ?? [], states = list.map(row => state(row, today)), marked = list.map(row => !!flow?.test(row));
    const late = states.filter(entry => entry === 'late').length, done = states.filter(entry => entry === 'done').length;
    const flowCount = marked.filter(Boolean).length;
    // S3: the marked Flow's rows are one 'flow' dot, first; the others keep theirs by urgency.
    const dots: (ProgramMonthState | 'flow')[] = [...(flowCount ? ['flow' as const] : []), ...states.filter((_, index) => !marked[index]).sort((a, b) => rank[a] - rank[b])];
    const shown = list.length > 3 ? 2 : list.length;
    const [month, number] = [Number(day.slice(5, 7)), Number(day.slice(8, 10))];
    const label = `${day === today ? '오늘, ' : ''}${month}월 ${number}일 ${LONG[weekday(day)]}, ${list.length
      ? `할 일 ${list.length}개${late ? `, ${late}개 지남` : ''}${done === list.length ? ', 모두 끝냄' : ''}${flowCount && flow ? `, ${flow.title} ${flowCount}개` : ''}` : '할 일 없음'}`;
    cells.push({ date: day, day: number, count: list.length, late, done, dots: dots.slice(0, 3), more: Math.max(0, dots.length - 3),
      titles: list.slice(0, shown).map((row, index) => ({ text: title(row), state: states[index], ...(marked[index] ? { flow: true as const } : {}) })), titleMore: list.length - shown,
      label, today: day === today, selected: day === selected, flow: flowCount });
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (ProgramMonthCell | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return { title: programMonthTitle(date, today), weekdays: WEEKDAYS, weeks };
}

/** The day that takes Tab: the focused one while it is in the shown month, else the chosen day (C5 review P2: a
 *  month change refused, to keep a written ＋ line, must not leave the grid without a way in). */
export function programMonthTabStop(grid: ReturnType<typeof programMonthGrid>, focusDate: string, date: string): string {
  return grid.weeks.some(week => week.some(cell => cell?.date === focusDate)) ? focusDate : date;
}

/** The day a key moves the grid's focus to (2: ←→ a day, ↑↓ a week, Home/End the week's ends, PageUp/PageDown a
 *  month); null for any other key. Past the month's edge the caller changes the month. */
export function programMonthKeyTarget(date: string, key: string): string | null {
  const shift = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday(date), End: 6 - weekday(date) }[key];
  if (shift !== undefined) return programShiftDate(date, shift) || null;
  if (key === 'PageUp' || key === 'PageDown') return programShiftMonth(date, key === 'PageUp' ? -1 : 1) || null;
  return null;
}

/** C5: what the day's one dialog is: a modal sheet on a narrow screen, a panel beside the grid when wide, closed with
 *  no day. A switch between sheet and panel while Korean is composed in it waits for the composition to end (closing
 *  the dialog to show it again would blur the ＋ line mid-syllable); opening and closing never wait. */
export type ProgramDayDialogMode = 'sheet' | 'panel' | null;
export function programDayDialogStep(input: { day: string | null; wide: boolean; current: ProgramDayDialogMode; composing: boolean }): { mode: ProgramDayDialogMode; wait: boolean } {
  const mode: ProgramDayDialogMode = !input.day ? null : input.wide ? 'panel' : 'sheet';
  return { mode, wait: mode !== input.current && mode !== null && input.current !== null && input.composing };
}
