export type NaturalTaskDateRule =
  | 'relative-day' | 'week-day' | 'nearest-weekday' | 'weekend'
  | 'next-month-day' | 'month-day' | 'day-of-month' | 'days-later' | 'month-end';

export type NaturalTaskDateContext = {
  /** The caller supplies the line-finish date in KST, not the task's date section. */
  today: string;
  /** Only KST is supported. No clock, locale, or host time zone is consulted. */
  timeZone?: 'Asia/Seoul';
  /** Optional cross-check: ISO weekday, Monday = 1 ... Sunday = 7. */
  weekday?: number;
  /** An existing date property, including an invalid/empty one, blocks a suggestion. */
  hasDateProperty?: boolean;
  /** The caller must pass false for folder, reference, or Flow-copy contexts. */
  eligible?: boolean;
};

export type NaturalTaskDateCandidate = {
  date: string;
  rule: NaturalTaskDateRule;
  /** Exact half-open UTF-16 offsets into the original full task line. */
  evidence: { start: number; end: number; text: string };
};

const DAY_MS = 86_400_000;
const WEEKDAYS = '월화수목금토일';
const EXPRESSION = /(?:이번|다음)[ \t]*주[ \t]*[월화수목금토일](?:요일)?|이번[ \t]*주말|다음[ \t]*달[ \t]*\d{1,2}일|\d{1,7}[ \t]*일[ \t]*뒤|\d{1,2}월[ \t]*\d{1,2}일|\d{1,2}\/\d{1,2}|오늘|내일|모레|글피|[월화수목금토일]요일|월말|\d{1,2}일/gu;
const PARTICLE = /^(?:까지|에는|에도|에|은|는)(?=$|[ \t,.;:!?])/u;
const WORD = /[\p{L}\p{N}_]/u;
// These contexts need more than a one-date parser: recurrence, ranges, quantities,
// negation, named works, or an unsupported explicit year/calendar qualifier.
const AMBIGUOUS = /(?:매주|매월|매일|매년|격주|다다음|지난|저번|어제|그제|작년|내년|올해|내후년|음력|양력|\d{2,4}[ \t]*년|부터|이후|이전|이내|동안|말고|아니|아닌|아님|아닐|아닙|아냐|대신|또는|혹은|사이|분기|정도|비율|이름|제목|회의명|프로젝트명|노래|영화|소설|드라마|브랜드|취소|불가|제외|빼고|빼면|않|안[ \t]*(?:되|된|될|됨|돼|됐)|(?:되면|하면|라면|다면|으면|경우)(?=$|[ \t,.;:!?])|(?:^|[ \t])(?:안|못)[ \t]|[~∼～?]|["'`“”‘’「」『』])/u;
const QUANTITY = /^[ \t]*(?:전|간|째|차|개|명|원|배|회|컵|쪽|페이지|퍼센트|%|분의|연속|치|어치|분량|만큼|스푼|큰술|작은술|숟갈|숟가락|시간|분|초|리터|ml|kg|g)(?=$|[ \t,.;:!?])/iu;
const WEEKDAY_ACTION = /(?:제출|보내기|보내다|전송|참석|방문|예약|확인|마감|완료|정리|준비|구매|신청|결제|납부|운동|출발|검토|하기|하기로|한다|하기!)[.!?]?[ \t]*$/u;

function civilDate(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(year) || year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

function readDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  return civilDate(Number(value.slice(0, 4)), Number(value.slice(5, 7)), Number(value.slice(8, 10)));
}

function dateText(date: Date): string | null {
  const year = date.getUTCFullYear();
  return year >= 1 && year <= 9999 ? date.toISOString().slice(0, 10) : null;
}

function shift(date: Date, days: number): string | null {
  return dateText(new Date(date.getTime() + days * DAY_MS));
}

function monthDate(today: Date, offset: number, day: number): string | null {
  const monthIndex = today.getUTCMonth() + offset;
  const year = today.getUTCFullYear() + Math.floor(monthIndex / 12);
  const date = civilDate(year, (monthIndex % 12 + 12) % 12 + 1, day);
  return date && dateText(date);
}

function resolve(expression: string, today: Date, todayText: string): { date: string | null; rule: NaturalTaskDateRule } {
  const compact = expression.replace(/[ \t]/gu, '');
  const weekday = today.getUTCDay() || 7;
  const relative = ['오늘', '내일', '모레', '글피'].indexOf(compact);
  if (relative !== -1) return { date: shift(today, relative), rule: 'relative-day' };
  if (compact === '이번주말') {
    // Matches programLineDateChips: weekdays -> Saturday; Saturday/Sunday -> today.
    return { date: shift(today, weekday >= 6 ? 0 : 6 - weekday), rule: 'weekend' };
  }
  let match = /^(이번|다음)주([월화수목금토일])(?:요일)?$/u.exec(compact);
  if (match) {
    const offset = WEEKDAYS.indexOf(match[2]) + 1 - weekday + (match[1] === '다음' ? 7 : 0);
    return { date: offset < 0 ? null : shift(today, offset), rule: 'week-day' };
  }
  match = /^([월화수목금토일])요일$/u.exec(compact);
  if (match) return { date: shift(today, (WEEKDAYS.indexOf(match[1]) + 1 - weekday + 7) % 7), rule: 'nearest-weekday' };
  match = /^다음달(\d{1,2})일$/u.exec(compact);
  if (match) return { date: monthDate(today, 1, Number(match[1])), rule: 'next-month-day' };
  match = /^(\d{1,7})일뒤$/u.exec(compact);
  if (match) return { date: shift(today, Number(match[1])), rule: 'days-later' };
  match = /^(\d{1,2})(?:월|\/)(\d{1,2})일?$/u.exec(compact);
  if (match) {
    const month = Number(match[1]), day = Number(match[2]);
    const year = today.getUTCFullYear();
    const current = civilDate(year, month, day);
    // Do not silently skip invalid years (e.g. February 29 in a non-leap year).
    if (!current) return { date: null, rule: 'month-day' };
    const target = dateText(current)! < todayText ? civilDate(year + 1, month, day) : current;
    return { date: target && dateText(target), rule: 'month-day' };
  }
  if (compact === '월말') {
    const nextMonth = new Date(today.getTime());
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 0);
    return { date: dateText(nextMonth), rule: 'month-end' };
  }
  match = /^(\d{1,2})일$/u.exec(compact);
  if (match) {
    const day = Number(match[1]);
    return { date: monthDate(today, day < today.getUTCDate() ? 1 : 0, day), rule: 'day-of-month' };
  }
  return { date: null, rule: 'relative-day' };
}

/**
 * A conservative, pure proposal for ONE raw unchecked writing-task line.
 * This does not apply a date, change text, inspect a document, or read a clock.
 * Weeks are Monday–Sunday; a bare weekday includes today. A past explicit
 * this-week weekday, an invalid immediate month/year, or multiple expressions
 * produces null. A bare weekday followed only by a noun also abstains: it may be
 * a meeting/work name. Add a date particle or an execution verb to disambiguate.
 */
export function suggestTaskLineDate(line: string, context: NaturalTaskDateContext): NaturalTaskDateCandidate | null {
  if (context.eligible === false || context.hasDateProperty || (context.timeZone !== undefined && context.timeZone !== 'Asia/Seoul')) return null;
  const today = readDate(context.today);
  if (!today || (context.weekday !== undefined && context.weekday !== (today.getUTCDay() || 7))) return null;
  if (/[\r\n\u2028\u2029]/u.test(line)) return null;
  const task = /^[ \t]*- \[ \][ \t]+/u.exec(line);
  if (!task) return null;
  const title = line.slice(task[0].length);
  if (/(?:[a-z][a-z\d+.-]*:\/\/|www\.|(?:^|[ \t])[^ \t]+\.[\p{L}]{2,63}(?:[\/:#? \t]|$)|날짜[ \t]*:)/iu.test(title) || AMBIGUOUS.test(title)) return null;
  const matches = [...title.matchAll(EXPRESSION)];
  if (matches.length !== 1) return null;
  const match = matches[0], start = match.index!, end = start + match[0].length;
  const before = title.slice(0, start), after = title.slice(end);
  const particle = PARTICLE.exec(after)?.[0] ?? '';
  if ((start > 0 && (WORD.test(title[start - 1]) || /[\/.,+\-]/u.test(title[start - 1])))
    || (after && WORD.test(after[0]) && !particle) || /^[\/\d+\-]/u.test(after)) return null;
  if (QUANTITY.test(after) || /^[ \t]*[-–—(（]/u.test(after)) return null;
  // An interior date needs an explicit date particle; otherwise a number/name in
  // the object of the task is too easy to mistake for a schedule.
  if (before.trim() && !particle) return null;
  const resolved = resolve(match[0], today, context.today);
  if (!resolved.date) return null;
  if (resolved.rule === 'nearest-weekday' && after.trim() && !particle && !WEEKDAY_ACTION.test(after)) return null;
  const absoluteStart = task[0].length + start;
  return { date: resolved.date, rule: resolved.rule, evidence: { start: absoluteStart, end: absoluteStart + match[0].length, text: match[0] } };
}
