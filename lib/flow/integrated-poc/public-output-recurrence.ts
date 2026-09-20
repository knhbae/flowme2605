import type { ProgramPublicItem } from './contract';
import { programDate, programRecord, programShape } from './program-data';
import { PROGRAM_PUBLIC_RECURRENCE_WINDOW, programRecurringScheduleLabel, programRecurringScheduleStart,
  projectProgramPublicRecurrence, type ProgramPublicRecurringScheduleV1 } from './public-recurrence-contract';

export type ProgramOutputRecurrenceWindow = { version: 1; offset: number; limit: number; openEndedWeeks: number; openEndedOffsetWeeks: number };
export const defaultProgramOutputRecurrenceWindow = (): ProgramOutputRecurrenceWindow => ({ version: 1, offset: 0, limit: 30, openEndedWeeks: 4, openEndedOffsetWeeks: 0 });
export type ProgramOutputSeries = { itemId: string; startDate: string | null; label: string; time: string | null; timeZone: string | null;
  dates: string[]; indices: number[]; hasMore: boolean; totalCount: number | null; scope: string | null };

export function isProgramOutputRecurrenceWindow(value: unknown): value is ProgramOutputRecurrenceWindow {
  const bounds = PROGRAM_PUBLIC_RECURRENCE_WINDOW;
  return programShape(value, ['version', 'offset', 'limit', 'openEndedWeeks', 'openEndedOffsetWeeks']) && Object.getOwnPropertySymbols(value).length === 0 && value.version === 1
    && [[value.offset, 0, bounds.maxOffset], [value.limit, 1, bounds.maxLimit], [value.openEndedWeeks, 1, bounds.maxWeeks], [value.openEndedOffsetWeeks, 0, bounds.maxWeekOffset]]
      .every(([n, min, max]) => Number.isSafeInteger(n) && Number(n) >= Number(min) && Number(n) <= Number(max));
}
/** Invalid numeric input may survive Back/Forward, but must never pass the executable window validator. */
export function isProgramOutputRecurrencePresentation(value: unknown): value is ProgramOutputRecurrenceWindow {
  return programShape(value, ['version', 'offset', 'limit', 'openEndedWeeks', 'openEndedOffsetWeeks']) && Object.getOwnPropertySymbols(value).length === 0 && value.version === 1
    && [value.offset, value.limit, value.openEndedWeeks, value.openEndedOffsetWeeks].every(n => Number.isSafeInteger(n) && Math.abs(Number(n)) <= 1000000);
}
/** Only public-undated series may receive an explicit, transient personal start. */
export function validProgramOutputRecurrenceStarts(value: unknown, items: readonly ProgramPublicItem[]): value is Record<string, string> {
  return programRecord(value) && Object.getOwnPropertySymbols(value).length === 0 && Object.entries(value).every(([id, date]) => programDate(date)
    && items.some(item => item.id === id && item.schedule.kind === 'recurring' && item.schedule.start.kind === 'undated'));
}
export function inspectProgramOutputSeries(item: ProgramPublicItem & { schedule: ProgramPublicRecurringScheduleV1 }, anchor: string | null,
  startOverride: string | undefined, window: ProgramOutputRecurrenceWindow | undefined): ProgramOutputSeries | null {
  const schedule = item.schedule;
  const startDate = schedule.start.kind === 'undated' ? startOverride ?? null : programRecurringScheduleStart(schedule, anchor);
  if (schedule.start.kind !== 'undated' && !startDate || startDate && schedule.rule.end?.mode === 'until' && schedule.rule.end.date < startDate) return null;
  const base = { itemId: item.id, startDate, label: programRecurringScheduleLabel(schedule), time: schedule.time, timeZone: schedule.timeZone,
    dates: [] as string[], indices: [] as number[], hasMore: false, totalCount: null, scope: null };
  if (!window || !startDate) return base;
  const projected = projectProgramPublicRecurrence({ itemId: item.id, startDate, rule: schedule.rule, ...window });
  if (!projected.ok) return null;
  const { occurrences, hasMore, totalCount, window: dateWindow } = projected.projection;
  const scope = dateWindow ? `${dateWindow.start} ~ ${dateWindow.end} · ${occurrences.length}회차 · 기간 밖 반복은 포함하지 않음`
    : `${window.offset + 1}회차부터 최대 ${window.limit}회차 · 실제 ${occurrences.length}회차${totalCount === undefined ? '' : ` / 전체 ${totalCount}회차`}`;
  return { ...base, dates: occurrences.map(row => row.date), indices: occurrences.map(row => row.occurrenceIndex), hasMore, totalCount: totalCount ?? null, scope };
}

/** Explicit finite occurrences let us preserve IANA wall-clock time across DST without an incomplete VTIMEZONE. */
export function programCalendarDateTime(date: string, time: string | null, timeZone: string | null): string | null {
  try {
    if (!programDate(date) || time !== null && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
    if (!time) return date.replaceAll('-', '');
    const local = `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;
    if (!timeZone) return local;
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone, calendar: 'iso8601', numberingSystem: 'latn',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    const target = Date.parse(`${date}T${time}:00Z`);
    const wall = (stamp: number) => {
      const p = Object.fromEntries(formatter.formatToParts(new Date(stamp)).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
      return Date.parse(`${p.year.padStart(4, '0')}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
    };
    // Nearby offsets cover both sides of DST, half-hour changes and skipped civil days.
    const offsets = new Set([-48, -24, 0, 24, 48].map(hours => { const sample = target + hours * 3600000; return wall(sample) - sample; }));
    const candidates = [...offsets].map(offset => target - offset).filter(Number.isFinite).sort((a, b) => a - b);
    const exact = candidates.filter(stamp => wall(stamp) === target);
    // RFC 5545 3.3.5: first occurrence for a fold; offset before a nonexistent time's gap.
    const stamp = exact[0] ?? candidates.filter(stamp => wall(stamp) > target).sort((a, b) => wall(a) - wall(b))[0];
    if (stamp === undefined) return null;
    const utc = new Date(stamp).toISOString();
    return /^\d{4}-/.test(utc) ? utc.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z') : null;
  } catch { return null; }
}
