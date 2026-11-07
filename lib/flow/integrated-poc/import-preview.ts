import type { ProgramPublicVersion } from './contract';
import { resolveProgramItemDate } from './private-space';
import { programRecurringScheduleLabel } from './public-recurrence-contract';
import { programImportRepeatRule, type ProgramImportRepeat } from './public-repeat-import';
import { programRepeatLabel } from './repeat-line';

/** Flow pipeline stage 1 (S1 '이렇게 놓입니다'): where the import sheet's choices put each item, worked out with the very
 *  functions the import writes with (resolveProgramItemDate for the copy items, the sheet's own repeat choice for the
 *  repeat lines), so the preview is the calendar after the import. Nothing is saved. */
export type ProgramImportPreview = {
  /** Dated one-time items, day by day in date order. */
  dated: { date: string; count: number; titles: string[] }[];
  /** Repeats: an official repeat line (its rule and first date) or a public series (its rule, its start). */
  repeats: { itemId: string; title: string; label: string; first: string | null }[];
  /** No date: relative without a 기준일, undated, a `@?개월마다` item left without months. */
  undated: { count: number; titles: string[] };
  /** Repeat items I already have a line for: not written (the sheet says so on their rows). */
  skipped: number;
};
/** What the sheet sends for the repeat lines (programImportRepeatChoice) and the public series' chosen starts. */
export type ProgramImportPreviewChoice = {
  repeatStarts?: Record<string, string>; repeatMonths?: Record<string, number>;
  recurrenceStarts?: Record<string, string>;
};

export function programImportPreview(version: Pick<ProgramPublicVersion, 'items'>, selectedItemIds: readonly string[], anchor: string | null,
  sheetRepeats: readonly ProgramImportRepeat[], _today: string, choice: ProgramImportPreviewChoice = {}): ProgramImportPreview {
  const byDate = new Map<string, string[]>(), repeats: ProgramImportPreview['repeats'] = [], undated: string[] = [];
  let skipped = 0;
  for (const item of version.items.filter(row => selectedItemIds.includes(row.id))) {
    const repeat = sheetRepeats.find(row => row.itemId === item.id);
    if (repeat) {
      if (repeat.existing) { skipped++; continue; }
      const rule = programImportRepeatRule(repeat, choice.repeatMonths?.[item.id] ?? null);
      // Months left empty: a plain task in 날짜 미정 (programImportRepeatLines writes `- 날짜: 미정`).
      if (!rule) { undated.push(repeat.title); continue; }
      repeats.push({ itemId: item.id, title: repeat.title, label: programRepeatLabel(rule), first: choice.repeatStarts?.[item.id] ?? null });
      continue;
    }
    if (item.schedule.kind === 'recurring') {
      const chosen = choice.recurrenceStarts?.[item.id];
      repeats.push({ itemId: item.id, title: item.title, label: programRecurringScheduleLabel(item.schedule).split(' · ')[0],
        first: chosen ?? resolveProgramItemDate(item, anchor) });
      continue;
    }
    const date = resolveProgramItemDate(item, anchor);
    if (!date) { undated.push(item.title); continue; }
    byDate.set(date, [...(byDate.get(date) ?? []), item.title]);
  }
  const dated = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, titles]) => ({ date, count: titles.length, titles }));
  return { dated, repeats, undated: { count: undated.length, titles: undated }, skipped };
}

/** The arrival notice's span (S2): the first and last day of the dated items, how many, and how many have no date. */
export type ProgramImportSpan = { first: string | null; last: string | null; dated: number; undated: number };
export function programImportSpan(tasks: readonly { date: string | null }[]): ProgramImportSpan {
  const dates = tasks.flatMap(task => task.date ? [task.date] : []).sort();
  return { first: dates[0] ?? null, last: dates[dates.length - 1] ?? null, dated: dates.length, undated: tasks.length - dates.length };
}
