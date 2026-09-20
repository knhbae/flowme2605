export const PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT = Object.freeze({
  version: 1 as const,
  finitePageSize: 30,
  openEndedWindowWeeks: 4,
  maxFiniteLimit: 10_000,
  maxFiniteOffset: 10_000,
  maxOpenEndedWindowWeeks: 520,
  weekStartsOn: 'monday' as const,
  firstOccurrence: 'start-date' as const,
  invalidMonthDayPolicy: 'skip' as const,
});

const DAY_MILLISECONDS = 86_400_000;

const WEEKDAY_CODES = Object.freeze({
  '일': 'SU',
  '월': 'MO',
  '화': 'TU',
  '수': 'WE',
  '목': 'TH',
  '금': 'FR',
  '토': 'SA',
} as const);

export const PERSONAL_WORKSPACE_POC_OCCURRENCE_WEEKDAYS = Object.freeze([
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
] as const);

export type PersonalWorkspacePocOccurrenceWeekday =
  (typeof PERSONAL_WORKSPACE_POC_OCCURRENCE_WEEKDAYS)[number];

export type PersonalWorkspacePocOccurrenceEnd = Readonly<
  | { mode: 'count'; count: number; raw: string }
  | { mode: 'until'; date: string; raw: string }
>;

export type PersonalWorkspacePocRecurrenceRule = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.version;
  raw: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  weekdays?: readonly PersonalWorkspacePocOccurrenceWeekday[];
  dayOfMonth?: number;
  end?: PersonalWorkspacePocOccurrenceEnd;
}>;

export type PersonalWorkspacePocRecurrenceFailureReason =
  | 'invalid-recurrence'
  | 'invalid-recurrence-end';

export type PersonalWorkspacePocRecurrenceParseResult =
  | Readonly<{ ok: true; rule: PersonalWorkspacePocRecurrenceRule }>
  | Readonly<{ ok: false; reason: PersonalWorkspacePocRecurrenceFailureReason }>;

export type PersonalWorkspacePocOccurrenceRow = Readonly<{
  rowId: string;
  occurrenceId: string;
  seriesId: string;
  sourceItemRef: string;
  originalDate: string;
  occurrenceIndex: number;
}>;

export type PersonalWorkspacePocOccurrenceManifest = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.version;
  sourceItemRef: string;
  seriesId: string;
  rule: PersonalWorkspacePocRecurrenceRule;
  mode: 'finite' | 'open-ended';
  rows: readonly PersonalWorkspacePocOccurrenceRow[];
  occurrenceIds: readonly string[];
  rowIds: readonly string[];
  originalDates: readonly string[];
  hasMore: boolean;
  totalCount?: number;
  window?: Readonly<{
    start: string;
    end: string;
    offsetWeeks: number;
    weeks: number;
  }>;
  finitePage?: Readonly<{
    offset: number;
    limit: number;
  }>;
}>;

export type PersonalWorkspacePocOccurrenceExpansionFailureReason =
  | PersonalWorkspacePocRecurrenceFailureReason
  | 'invalid-source-item-ref'
  | 'invalid-start-date'
  | 'recurrence-end-before-start'
  | 'invalid-finite-window'
  | 'invalid-open-ended-window'
  | 'projection-range-overflow';

export type PersonalWorkspacePocOccurrenceExpansionResult =
  | Readonly<{ ok: true; manifest: PersonalWorkspacePocOccurrenceManifest }>
  | Readonly<{
      ok: false;
      reason: PersonalWorkspacePocOccurrenceExpansionFailureReason;
    }>;

export type ParsePersonalWorkspacePocRecurrenceInput = Readonly<{
  recurrence: string;
  recurrenceEnd?: string;
}>;

export type ExpandPersonalWorkspacePocOccurrencesInput = Readonly<{
  sourceItemRef: string;
  startDate: string;
  recurrence: string;
  recurrenceEnd?: string;
  /** Cumulative finite-series limit. Defaults to the first 30 rows. */
  finiteLimit?: number;
  /** Optional finite-series page offset. Defaults to zero. */
  finiteOffset?: number;
  /** Cumulative open-ended window. Defaults to the first four weeks. */
  windowWeeks?: number;
  /** Optional non-overlapping open-ended window offset. Defaults to zero. */
  windowOffsetWeeks?: number;
}>;

export type IsPersonalWorkspacePocOccurrenceIdForInput = Readonly<{
  occurrenceId: string;
  sourceItemRef: string;
  originalDate: string;
  recurrence: string;
  recurrenceEnd?: string;
}>;

function isValidPlainDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function utcDay(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MILLISECONDS;
}

function dateFromUtcDay(value: number): string | undefined {
  const date = new Date(value * DAY_MILLISECONDS);
  const year = date.getUTCFullYear();
  if (!Number.isFinite(date.getTime()) || year < 1000 || year > 9999) return undefined;
  return [
    String(year).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function addDays(value: string, amount: number): string | undefined {
  return dateFromUtcDay(utcDay(value) + amount);
}

function positiveInteger(value: string): number | undefined {
  if (!/^[1-9]\d*$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseWeekdays(value: string): PersonalWorkspacePocOccurrenceWeekday[] | undefined {
  const tokens = value
    .replace(/요일/gu, '')
    .split(/[\s,/·]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return undefined;
  const weekdays = tokens.map((token) => WEEKDAY_CODES[token as keyof typeof WEEKDAY_CODES]);
  if (weekdays.some((weekday) => !weekday)) return undefined;
  return Array.from(new Set(weekdays)).sort(
    (left, right) => PERSONAL_WORKSPACE_POC_OCCURRENCE_WEEKDAYS.indexOf(left)
      - PERSONAL_WORKSPACE_POC_OCCURRENCE_WEEKDAYS.indexOf(right),
  );
}

/** Parses only the recurrence subset approved by the Text Authoring v4 contract. */
export function parsePersonalWorkspacePocRecurrence(
  input: ParsePersonalWorkspacePocRecurrenceInput,
): PersonalWorkspacePocRecurrenceParseResult {
  const label = typeof input.recurrence === 'string' ? input.recurrence.trim() : '';
  const compact = label.replace(/\s+/gu, '');
  let base: Pick<PersonalWorkspacePocRecurrenceRule, 'frequency' | 'interval'>
    & Partial<Pick<PersonalWorkspacePocRecurrenceRule, 'weekdays' | 'dayOfMonth'>>
    | undefined;

  if (compact === '매일') {
    base = { frequency: 'daily', interval: 1 };
  } else {
    const daily = /^(\d+)일마다$/u.exec(compact);
    const interval = daily ? positiveInteger(daily[1]) : undefined;
    if (interval) base = { frequency: 'daily', interval };
  }

  if (!base) {
    const weekly = /^매주\s+(.+)$/u.exec(label)
      ?? /^(\d+)\s*주마다\s+(.+)$/u.exec(label);
    if (weekly) {
      const hasInterval = weekly.length === 3;
      const interval = hasInterval ? positiveInteger(weekly[1]) : 1;
      const weekdays = parseWeekdays(hasInterval ? weekly[2] : weekly[1]);
      if (interval && weekdays) {
        base = { frequency: 'weekly', interval, weekdays };
      }
    }
  }

  if (!base) {
    const monthly = /^매월\s*(\d{1,2})일$/u.exec(label)
      ?? /^(\d+)\s*개월마다\s*(\d{1,2})일$/u.exec(label);
    if (monthly) {
      const hasInterval = monthly.length === 3;
      const interval = hasInterval ? positiveInteger(monthly[1]) : 1;
      const dayOfMonth = Number(hasInterval ? monthly[2] : monthly[1]);
      if (interval && dayOfMonth >= 1 && dayOfMonth <= 31) {
        base = { frequency: 'monthly', interval, dayOfMonth };
      }
    }
  }

  if (!base) return { ok: false, reason: 'invalid-recurrence' };

  const rawEnd = input.recurrenceEnd?.trim();
  let end: PersonalWorkspacePocOccurrenceEnd | undefined;
  if (rawEnd) {
    const countMatch = /^([1-9]\d*)\s*회$/u.exec(rawEnd);
    if (countMatch) {
      const count = positiveInteger(countMatch[1]);
      if (!count) return { ok: false, reason: 'invalid-recurrence-end' };
      end = { mode: 'count', count, raw: rawEnd };
    } else if (isValidPlainDate(rawEnd)) {
      end = { mode: 'until', date: rawEnd, raw: rawEnd };
    } else {
      return { ok: false, reason: 'invalid-recurrence-end' };
    }
  }

  return {
    ok: true,
    rule: {
      version: PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.version,
      raw: label,
      ...base,
      ...(end ? { end } : {}),
    },
  };
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function recurrenceSignature(rule: PersonalWorkspacePocRecurrenceRule): string {
  return JSON.stringify({
    version: rule.version,
    frequency: rule.frequency,
    interval: rule.interval,
    ...(rule.weekdays ? { weekdays: rule.weekdays } : {}),
    ...(rule.dayOfMonth ? { dayOfMonth: rule.dayOfMonth } : {}),
    ...(rule.end?.mode === 'count'
      ? { end: { mode: 'count', count: rule.end.count } }
      : rule.end?.mode === 'until'
        ? { end: { mode: 'until', date: rule.end.date } }
        : {}),
  });
}

export function buildPersonalWorkspacePocOccurrenceSeriesId(
  sourceItemRef: string,
  rule: PersonalWorkspacePocRecurrenceRule,
): string {
  return `poc-occurrence-series:v1:${encodeURIComponent(sourceItemRef)}:${stableHash(recurrenceSignature(rule))}`;
}

export function buildPersonalWorkspacePocOccurrenceId(
  seriesId: string,
  originalDate: string,
): string {
  return `${seriesId}:occurrence:${originalDate}`;
}

function monthDate(
  startDate: string,
  monthOffset: number,
  dayOfMonth: number,
): string | undefined {
  const [year, month] = startDate.split('-').map(Number);
  const absoluteMonth = year * 12 + month - 1 + monthOffset;
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonthIndex = absoluteMonth % 12;
  if (targetYear < 1000 || targetYear > 9999) return undefined;
  const daysInMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  if (dayOfMonth > daysInMonth) return undefined;
  return [
    String(targetYear).padStart(4, '0'),
    String(targetMonthIndex + 1).padStart(2, '0'),
    String(dayOfMonth).padStart(2, '0'),
  ].join('-');
}

function* recurrenceDateSequence(
  startDate: string,
  rule: PersonalWorkspacePocRecurrenceRule,
): Generator<string> {
  // Text Authoring v4 fixes the explicit start date as occurrence one even
  // when it does not match the subsequent weekday/month-day cadence.
  yield startDate;

  if (rule.frequency === 'daily') {
    let current = addDays(startDate, rule.interval);
    while (current) {
      yield current;
      current = addDays(current, rule.interval);
    }
    return;
  }

  if (rule.frequency === 'weekly') {
    const startWeekday = new Date(`${startDate}T00:00:00Z`).getUTCDay();
    const firstMonday = addDays(startDate, -((startWeekday + 6) % 7));
    if (!firstMonday) return;
    let weekOffset = 0;
    while (true) {
      for (const weekday of rule.weekdays ?? []) {
        const weekdayOffset = PERSONAL_WORKSPACE_POC_OCCURRENCE_WEEKDAYS.indexOf(weekday);
        const current = addDays(firstMonday, weekOffset * 7 + weekdayOffset);
        if (!current) return;
        if (current > startDate) yield current;
      }
      weekOffset += rule.interval;
    }
  }

  let monthOffset = 0;
  while (true) {
    const current = monthDate(startDate, monthOffset, rule.dayOfMonth as number);
    if (current && current > startDate) yield current;
    monthOffset += rule.interval;
    const [year, month] = startDate.split('-').map(Number);
    if (year * 12 + month - 1 + monthOffset > 9999 * 12 + 11) return;
  }
}

function finiteTotalCount(
  startDate: string,
  rule: PersonalWorkspacePocRecurrenceRule,
): number | undefined {
  if (rule.end?.mode === 'count') return rule.end.count;
  if (rule.end?.mode !== 'until') return undefined;
  const until = rule.end.date;
  if (until < startDate) return 0;

  if (rule.frequency === 'daily') {
    return Math.floor((utcDay(until) - utcDay(startDate)) / rule.interval) + 1;
  }

  if (rule.frequency === 'weekly') {
    const startWeekday = new Date(`${startDate}T00:00:00Z`).getUTCDay();
    const firstMondayDay = utcDay(startDate) - ((startWeekday + 6) % 7);
    const periodDays = rule.interval * 7;
    let total = 1;
    for (const weekday of rule.weekdays ?? []) {
      const weekdayOffset = PERSONAL_WORKSPACE_POC_OCCURRENCE_WEEKDAYS.indexOf(weekday);
      const firstCandidateDay = firstMondayDay + weekdayOffset;
      const periodsAfterStart = Math.max(
        0,
        Math.ceil((utcDay(startDate) + 1 - firstCandidateDay) / periodDays),
      );
      const candidateDay = firstCandidateDay + periodsAfterStart * periodDays;
      if (candidateDay <= utcDay(until)) {
        total += Math.floor((utcDay(until) - candidateDay) / periodDays) + 1;
      }
    }
    return total;
  }

  let total = 1;
  let monthOffset = 0;
  while (true) {
    const monthStart = monthDate(startDate, monthOffset, 1);
    if (!monthStart || monthStart > until) break;
    const candidate = monthDate(startDate, monthOffset, rule.dayOfMonth as number);
    if (candidate && candidate > startDate && candidate <= until) total += 1;
    monthOffset += rule.interval;
  }
  return total;
}

function isSafeBoundedInteger(value: number, minimum: number, maximum: number): boolean {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function occurrenceRow(
  sourceItemRef: string,
  seriesId: string,
  originalDate: string,
  occurrenceIndex: number,
): PersonalWorkspacePocOccurrenceRow {
  const occurrenceId = buildPersonalWorkspacePocOccurrenceId(seriesId, originalDate);
  return {
    rowId: occurrenceId,
    occurrenceId,
    seriesId,
    sourceItemRef,
    originalDate,
    occurrenceIndex,
  };
}

function occurrenceManifestIndexes(rows: readonly PersonalWorkspacePocOccurrenceRow[]): Readonly<{
  occurrenceIds: readonly string[];
  rowIds: readonly string[];
  originalDates: readonly string[];
}> {
  return {
    occurrenceIds: rows.map((row) => row.occurrenceId),
    rowIds: rows.map((row) => row.rowId),
    originalDates: rows.map((row) => row.originalDate),
  };
}

/**
 * Expands one immutable source Item into a bounded, deterministic occurrence
 * manifest. No storage, clock, operating writer, or browser capability is used.
 */
export function expandPersonalWorkspacePocOccurrences(
  input: ExpandPersonalWorkspacePocOccurrencesInput,
): PersonalWorkspacePocOccurrenceExpansionResult {
  const sourceItemRef = input.sourceItemRef.trim();
  if (!sourceItemRef) return { ok: false, reason: 'invalid-source-item-ref' };
  if (!isValidPlainDate(input.startDate)) return { ok: false, reason: 'invalid-start-date' };
  const parsed = parsePersonalWorkspacePocRecurrence(input);
  if (!parsed.ok) return parsed;
  const { rule } = parsed;
  if (rule.end?.mode === 'until' && rule.end.date < input.startDate) {
    return { ok: false, reason: 'recurrence-end-before-start' };
  }

  const seriesId = buildPersonalWorkspacePocOccurrenceSeriesId(sourceItemRef, rule);
  if (rule.end) {
    const limit = input.finiteLimit ?? PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.finitePageSize;
    const offset = input.finiteOffset ?? 0;
    if (!isSafeBoundedInteger(
      limit,
      1,
      PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.maxFiniteLimit,
    ) || !isSafeBoundedInteger(
      offset,
      0,
      PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.maxFiniteOffset,
    )) {
      return { ok: false, reason: 'invalid-finite-window' };
    }
    const totalCount = finiteTotalCount(input.startDate, rule) ?? 0;
    const rows: PersonalWorkspacePocOccurrenceRow[] = [];
    let occurrenceIndex = 0;
    for (const date of recurrenceDateSequence(input.startDate, rule)) {
      occurrenceIndex += 1;
      if (rule.end.mode === 'count' && occurrenceIndex > rule.end.count) break;
      if (rule.end.mode === 'until' && date > rule.end.date) break;
      if (occurrenceIndex <= offset) continue;
      if (rows.length >= limit) break;
      rows.push(occurrenceRow(sourceItemRef, seriesId, date, occurrenceIndex));
    }
    return {
      ok: true,
      manifest: {
        version: PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.version,
        sourceItemRef,
        seriesId,
        rule,
        mode: 'finite',
        rows,
        ...occurrenceManifestIndexes(rows),
        hasMore: offset + rows.length < totalCount,
        totalCount,
        finitePage: { offset, limit },
      },
    };
  }

  const weeks = input.windowWeeks
    ?? PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.openEndedWindowWeeks;
  const offsetWeeks = input.windowOffsetWeeks ?? 0;
  if (!isSafeBoundedInteger(
    weeks,
    1,
    PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.maxOpenEndedWindowWeeks,
  ) || !isSafeBoundedInteger(
    offsetWeeks,
    0,
    PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.maxOpenEndedWindowWeeks,
  ) || offsetWeeks + weeks > PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.maxOpenEndedWindowWeeks) {
    return { ok: false, reason: 'invalid-open-ended-window' };
  }
  const windowStart = addDays(input.startDate, offsetWeeks * 7);
  const windowEndExclusive = windowStart ? addDays(windowStart, weeks * 7) : undefined;
  if (!windowStart || !windowEndExclusive) {
    return { ok: false, reason: 'projection-range-overflow' };
  }
  const rows: PersonalWorkspacePocOccurrenceRow[] = [];
  let occurrenceIndex = 0;
  for (const date of recurrenceDateSequence(input.startDate, rule)) {
    occurrenceIndex += 1;
    if (date < windowStart) continue;
    if (date >= windowEndExclusive) break;
    rows.push(occurrenceRow(sourceItemRef, seriesId, date, occurrenceIndex));
  }
  const windowEnd = addDays(windowEndExclusive, -1);
  if (!windowEnd) return { ok: false, reason: 'projection-range-overflow' };
  return {
    ok: true,
    manifest: {
      version: PERSONAL_WORKSPACE_POC_OCCURRENCE_CONTRACT.version,
      sourceItemRef,
      seriesId,
      rule,
      mode: 'open-ended',
      rows,
      ...occurrenceManifestIndexes(rows),
      hasMore: true,
      window: { start: windowStart, end: windowEnd, offsetWeeks, weeks },
    },
  };
}

/** Checks deterministic identity only; occurrence membership needs the start date. */
export function isPersonalWorkspacePocOccurrenceIdFor(
  input: IsPersonalWorkspacePocOccurrenceIdForInput,
): boolean {
  if (!input.sourceItemRef.trim() || !isValidPlainDate(input.originalDate)) return false;
  const parsed = parsePersonalWorkspacePocRecurrence(input);
  if (!parsed.ok) return false;
  const seriesId = buildPersonalWorkspacePocOccurrenceSeriesId(
    input.sourceItemRef.trim(),
    parsed.rule,
  );
  return input.occurrenceId === buildPersonalWorkspacePocOccurrenceId(
    seriesId,
    input.originalDate,
  );
}
