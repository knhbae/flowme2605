import { programDate } from './program-data';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const day = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));

/** Whole days from `from` to `to` (negative when `to` is earlier). Both must be valid dates. */
export function programDaysBetween(from: string, to: string): number {
  return Math.round((day(to) - day(from)) / 86400000);
}

/** "10월 9일 (금)" this year, "2025년 10월 9일" in another year. Never an ISO date. */
export function programCalendarDate(date: string, today: string, weekday = true): string {
  if (!programDate(date)) return date;
  const month = Number(date.slice(5, 7)), dayOfMonth = Number(date.slice(8, 10));
  if (programDate(today) && date.slice(0, 4) !== today.slice(0, 4)) return `${Number(date.slice(0, 4))}년 ${month}월 ${dayOfMonth}일`;
  return weekday ? `${month}월 ${dayOfMonth}일 (${WEEKDAYS[new Date(day(date)).getUTCDay()]})` : `${month}월 ${dayOfMonth}일`;
}

/** A stored time (ISO, UTC) as its Seoul calendar day, YYYY-MM-DD (Seoul keeps +9 all year); null when it is not a time. */
export function programSeoulDate(instant: string): string | null {
  const time = Date.parse(instant);
  return Number.isFinite(time) ? new Date(time + 9 * 3_600_000).toISOString().slice(0, 10) : null;
}

/** int4 QA P3-INT4-1: when something was saved or published, as its Seoul day ("11월 9일 (월)"), not the start of the UTC
 *  ISO string, which reads a day early from 0 to 9 a.m. in Seoul. Another year shows its year. */
export function programStampLabel(instant: string, today = programSeoulDate(new Date().toISOString()) ?? ''): string {
  const date = programSeoulDate(instant);
  return date ? programCalendarDate(date, today) : instant.slice(0, 10);
}

/** P3 (11/11): a stored time with its Seoul clock time, "11월 10일 (화) 01:30" (another year shows its year), not the
 *  UTC ISO string or "2026-11-09 16:30 UTC". Not a time: as stored. */
export function programStampTimeLabel(instant: string, today = programSeoulDate(new Date().toISOString()) ?? ''): string {
  const time = Date.parse(instant);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(instant) || !Number.isFinite(time)) return instant;
  const seoul = new Date(time + 9 * 3_600_000).toISOString();
  return `${programCalendarDate(seoul.slice(0, 10), today)} ${seoul.slice(11, 16)}`;
}

/** 오늘 / 내일 / 어제, otherwise the calendar date. A missing date reads "날짜 없음". */
export function programDateLabel(date: string | null | undefined, today: string, weekday = true): string {
  if (!date) return '날짜 없음';
  if (programDate(date) && programDate(today)) {
    const offset = programDaysBetween(today, date);
    if (offset === 0) return '오늘';
    if (offset === 1) return '내일';
    if (offset === -1) return '어제';
  }
  return programCalendarDate(date, today, weekday);
}

/** "20일 지남" for a date before today, otherwise null. */
export function programOverdueLabel(date: string | null | undefined, today: string): string | null {
  if (!date || !programDate(date) || !programDate(today)) return null;
  const days = programDaysBetween(date, today);
  return days > 0 ? `${days}일 지남` : null;
}
