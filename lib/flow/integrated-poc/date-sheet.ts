import { programCalendarDate } from './date-label';
import { programDeferChips } from './task-date-move';

/** F9 W-MENU-24 (11/11): ⋮ [고르기] opens one sheet: the quick chips [내일][이번 주말][다음 주][날짜 미정], then this
 *  month's calendar (a dot on a day with an open task, today outlined, past days dimmed). A press moves at once. */
export type ProgramDateSheetChip = { key: string; label: string; date: string | null; detail: string; off: boolean };
/** The quick chips with their day ('11월 12일 (목)'); [다음 주] is next Monday. One that would leave the task where it is
 *  (its own day, or 날짜 미정 for an undated task), or lands on the day of a chip before it, is off. */
export function programDateSheetChips(today: string, current: string | null): ProgramDateSheetChip[] {
  const [tomorrow, weekend, week] = programDeferChips(today, current);
  const dated = [tomorrow, weekend, week].map((chip, index, all) => ({ key: chip.key, label: chip.label, date: chip.date, detail: programCalendarDate(chip.date, today),
    off: chip.date === current || all.slice(0, index).some(prior => prior.date === chip.date) }));
  return [...dated, { key: 'none', label: '날짜 미정', date: null, detail: '', off: current === null }];
}

export type ProgramMonthCell = { date: string; day: number; past: boolean; today: boolean; current: boolean; marked: boolean };
/** One month as weeks of seven (Sunday first, as the mockup); null pads the first and last week. */
export function programMonthGrid(month: string, today: string, current: string | null, marked: ReadonlySet<string>): (ProgramMonthCell | null)[][] {
  const [year, monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1)), days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells: (ProgramMonthCell | null)[] = Array.from({ length: first.getUTCDay() }, () => null);
  for (let day = 1; day <= days; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    cells.push({ date, day, past: date < today, today: date === today, current: date === current, marked: marked.has(date) });
  }
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}
/** 'YYYY-MM' moved by `by` months. */
export function programShiftMonth(month: string, by: number): string {
  const [year, monthNumber] = month.split('-').map(Number), at = new Date(Date.UTC(year, monthNumber - 1 + by, 1));
  return at.toISOString().slice(0, 7);
}
/** '2026년 11월'. */
export const programMonthLabel = (month: string) => `${Number(month.slice(0, 4))}년 ${Number(month.slice(5, 7))}월`;
