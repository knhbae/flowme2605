export type CalendarGridNavigationKey =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getTime() + amount * DAY_MS);
}

function addMonthsClamped(date: Date, amount: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + amount;
  const day = date.getUTCDate();
  const targetMonthStart = new Date(Date.UTC(year, month, 1, 12));
  const targetMonthEnd = new Date(Date.UTC(
    targetMonthStart.getUTCFullYear(),
    targetMonthStart.getUTCMonth() + 1,
    0,
    12,
  ));
  return new Date(Date.UTC(
    targetMonthStart.getUTCFullYear(),
    targetMonthStart.getUTCMonth(),
    Math.min(day, targetMonthEnd.getUTCDate()),
    12,
  ));
}

export function getCalendarGridNavigationDate(
  currentDate: string,
  key: CalendarGridNavigationKey,
): string | null {
  const date = parseDate(currentDate);
  if (!date) return null;

  if (key === 'ArrowLeft') return formatDate(addDays(date, -1));
  if (key === 'ArrowRight') return formatDate(addDays(date, 1));
  if (key === 'ArrowUp') return formatDate(addDays(date, -7));
  if (key === 'ArrowDown') return formatDate(addDays(date, 7));
  if (key === 'Home') return formatDate(addDays(date, -date.getUTCDay()));
  if (key === 'End') return formatDate(addDays(date, 6 - date.getUTCDay()));
  if (key === 'PageUp') return formatDate(addMonthsClamped(date, -1));
  if (key === 'PageDown') return formatDate(addMonthsClamped(date, 1));
  return null;
}
