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
