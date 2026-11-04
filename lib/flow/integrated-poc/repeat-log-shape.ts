/** N10 repeat line days (SPEC 7, kept in recurrenceExecution.lines): a line ID and the days it was finished, ascending
 *  and once each, 10,000 days in all. An emptied line and a line that is gone are kept as written (a stopped repeat
 *  keeps its days). No imports, so the recurrence validator and the data layer can both use it. */
export const PROGRAM_REPEAT_LOG_DAYS = 10_000;
const day = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value))
  && Object.values(Object.getOwnPropertyDescriptors(value)).every(descriptor => 'value' in descriptor && descriptor.enumerable);
const lineId = (value: string) => value.trim().length > 0 && value.length <= 1200 && !['__proto__', 'prototype', 'constructor'].includes(value);
export function isProgramRepeatLog(value: unknown): value is Record<string, string[]> {
  if (!plain(value)) return false;
  let days = 0;
  return Object.entries(value).every(([id, dates]) => lineId(id) && Array.isArray(dates)
    && dates.every((date, index) => day(date) && (index === 0 || dates[index - 1] < date))
    && (days += dates.length) <= PROGRAM_REPEAT_LOG_DAYS);
}
