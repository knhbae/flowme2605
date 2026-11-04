// Self-contained date arithmetic: text-workspace paints the chip from here, so this module imports nothing of the
// Program data layer (which itself imports text-workspace). Same results as execution.ts programShiftDate/Month.
function programDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function programShiftDate(date: string, days: number): string {
  if (!programDate(date)) return '';
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days);
  const shifted = value.toISOString().slice(0, 10);
  return programDate(shifted) ? shifted : '';
}
function programShiftMonth(date: string, months: number): string {
  if (!programDate(date)) return '';
  const [year, month, day] = date.split('-').map(Number), target = year * 12 + month - 1 + months;
  if (target < 0 || target >= 10000 * 12) return '';
  const targetYear = Math.floor(target / 12), targetMonth = target % 12 + 1;
  return ymd(targetYear, targetMonth, Math.min(day, lastDayOf(targetYear, targetMonth)));
}

/** N10 repeat lines (SPEC 1): a task line ending in " @매주 월 목", " @6개월마다" and the like. Fixed rules move to the
 *  next calendar day they name; interval rules count from the day the round was finished. Weekdays use Sunday = 0. */
export type ProgramRepeatRule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] }
  | { kind: 'days'; every: number }
  | { kind: 'weeks'; every: number }
  | { kind: 'month-day'; day: number | 'last' }
  | { kind: 'yearly'; month: number; day: number }
  | { kind: 'months'; every: number };
export type ProgramRepeatMarker = { rule: ProgramRepeatRule; label: string; start: number; text: string };

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
/** Monday first, as the week reads. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const intIn = (text: string, min: number, max: number) => {
  if (!/^\d{1,3}$/.test(text)) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
};
const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every(day => b.includes(day));

/** The rule a marker's words name (the part after "@"), or null for anything else, which stays plain text. */
export function parseProgramRepeatWords(words: string): ProgramRepeatRule | null {
  const text = words.trim().replace(/\s+/g, ' ');
  if (text === '매일') return { kind: 'daily' };
  if (text === '평일') return { kind: 'weekdays', days: [1, 2, 3, 4, 5] };
  if (text === '주말') return { kind: 'weekdays', days: [6, 0] };
  if (text === '매주') return { kind: 'weeks', every: 1 };
  const weekly = /^매주 ?(.+)$/.exec(text);
  if (weekly) {
    const letters = weekly[1].replace(/[\s,·、/]+/g, '');
    if (!letters || [...letters].some(letter => !DAY_NAMES.includes(letter)) || new Set(letters).size !== letters.length) return null;
    return { kind: 'weekdays', days: WEEK_ORDER.filter(day => letters.includes(DAY_NAMES[day])) };
  }
  let match = /^(\d+)일마다$/.exec(text);
  if (match) { const every = intIn(match[1], 2, 365); return every === null ? null : { kind: 'days', every }; }
  match = /^(\d+)주마다$/.exec(text);
  if (match) { const every = intIn(match[1], 1, 52); return every === null ? null : { kind: 'weeks', every }; }
  match = /^(\d+)개월마다$/.exec(text);
  if (match) { const every = intIn(match[1], 1, 24); return every === null ? null : { kind: 'months', every }; }
  if (/^매달 ?말일$/.test(text)) return { kind: 'month-day', day: 'last' };
  match = /^매달 ?(\d+)일$/.exec(text);
  if (match) { const day = intIn(match[1], 1, 31); return day === null ? null : { kind: 'month-day', day }; }
  match = /^매년 ?(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (match) {
    const month = intIn(match[1], 1, 12), day = intIn(match[2], 1, 31);
    // 2000 is a leap year, so 2/29 is a real day here; other years read it as 2/28 (SPEC 1, 말일 규칙).
    if (month === null || day === null || !programDate(`2000-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`)) return null;
    return { kind: 'yearly', month, day };
  }
  return null;
}

/** The marker at the end of a task title: a space, "@", then words that name a rule, to the end. */
export function readProgramRepeatMarker(title: string): ProgramRepeatMarker | null {
  const match = /\s@([^@]+)$/.exec(title);
  if (!match || !title.slice(0, match.index).trim()) return null;
  const rule = parseProgramRepeatWords(match[1]);
  return rule ? { rule, label: programRepeatLabel(rule), start: match.index + 1, text: title.slice(match.index + 1) } : null;
}
/** The title without its marker, for lists that show the chip apart. */
export function programRepeatTitle(title: string): string {
  const marker = readProgramRepeatMarker(title);
  return marker ? title.slice(0, marker.start).trimEnd() : title;
}

export function programRepeatLabel(rule: ProgramRepeatRule): string {
  switch (rule.kind) {
    case 'daily': return '매일';
    case 'weekdays':
      if (sameDays(rule.days, [1, 2, 3, 4, 5])) return '평일';
      if (sameDays(rule.days, [6, 0])) return '주말';
      return `매주 ${rule.days.map(day => DAY_NAMES[day]).join('·')}`;
    case 'days': return `${rule.every}일마다`;
    case 'weeks': return rule.every === 1 ? '매주' : `${rule.every}주마다`;
    case 'month-day': return rule.day === 'last' ? '매달 말일' : `매달 ${rule.day}일`;
    case 'yearly': return `매년 ${rule.month}/${rule.day}`;
    case 'months': return `${rule.every}개월마다`;
  }
}
/** Fixed rules name calendar days; interval rules count from the finished day. */
export const programRepeatFixed = (rule: ProgramRepeatRule) => ['daily', 'weekdays', 'month-day', 'yearly'].includes(rule.kind);

const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const ymd = (year: number, month: number, day: number) => `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
/** The day a month or year rule lands on in that month: the written day, or the month's last when it has no such day. */
function landing(rule: Extract<ProgramRepeatRule, { kind: 'month-day' | 'yearly' }>, year: number, month: number): string {
  const last = lastDayOf(year, month), wanted = rule.kind === 'yearly' ? rule.day : rule.day === 'last' ? last : rule.day;
  return ymd(year, month, Math.min(wanted, last));
}
/** The first day of a fixed rule strictly after `after`. */
function fixedAfter(rule: ProgramRepeatRule, after: string): string {
  if (rule.kind === 'daily') return programShiftDate(after, 1);
  if (rule.kind === 'weekdays') {
    for (let step = 1; step <= 7; step++) { const day = programShiftDate(after, step); if (rule.days.includes(weekday(day))) return day; }
    return '';
  }
  const [year, month] = after.split('-').map(Number);
  if (rule.kind === 'month-day') {
    // Each month is reckoned from the written day again, so 31 comes back after a short month (SPEC 1).
    for (let step = 0; step <= 1; step++) {
      const total = year * 12 + month - 1 + step, candidate = landing(rule, Math.floor(total / 12), total % 12 + 1);
      if (candidate > after) return candidate;
    }
    return '';
  }
  if (rule.kind === 'yearly') {
    for (let step = 0; step <= 1; step++) { const candidate = landing(rule, year + step, rule.month); if (candidate > after) return candidate; }
    return '';
  }
  return '';
}
function interval(rule: ProgramRepeatRule, from: string): string {
  if (rule.kind === 'days') return programShiftDate(from, rule.every);
  if (rule.kind === 'weeks') return programShiftDate(from, rule.every * 7);
  // The finished day's date in the month N later, or that month's last day (SPEC 1: 1/31 → 2/28 → 3/28).
  if (rule.kind === 'months') return programShiftMonth(from, rule.every);
  return '';
}

/** The first round when the marker is settled and the line has no date: today or the next named day for a fixed
 *  rule, today plus the interval for an interval rule. '' for an invalid day. */
export function programRepeatFirstDate(rule: ProgramRepeatRule, today: string): string {
  if (!programDate(today)) return '';
  return programRepeatFixed(rule) ? fixedAfter(rule, programShiftDate(today, -1)) : interval(rule, today);
}
/** The round after finishing the one on `current` today (SPEC 2): a fixed rule's first named day after both, an
 *  interval rule's today plus the interval. Rounds skipped by a late finish are not kept. */
export function programRepeatNextDate(rule: ProgramRepeatRule, current: string | null, today: string): string {
  if (!programDate(today) || current !== null && !programDate(current)) return '';
  if (!programRepeatFixed(rule)) return interval(rule, today);
  return fixedAfter(rule, current !== null && current > today ? current : today);
}
