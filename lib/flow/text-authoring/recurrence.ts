import { stableAuthoringId } from "./identity";
import type {
  AuthoringRecurrenceRule,
  AuthoringSchedule,
  AuthoringWeekday,
} from "./types";

const DAY_MILLISECONDS = 86_400_000;

const WEEKDAY_CODES: Record<string, AuthoringWeekday> = {
  일: "SU",
  월: "MO",
  화: "TU",
  수: "WE",
  목: "TH",
  금: "FR",
  토: "SA",
};

const WEEKDAY_MONDAY_OFFSET: Record<AuthoringWeekday, number> = {
  MO: 0,
  TU: 1,
  WE: 2,
  TH: 3,
  FR: 4,
  SA: 5,
  SU: 6,
};

export type AuthoringRecurrenceParseFailureReason =
  "unsupported_rule" | "invalid_end";

export type AuthoringRecurrenceParseResult =
  | { ok: true; rule: AuthoringRecurrenceRule }
  | { ok: false; reason: AuthoringRecurrenceParseFailureReason };

export type ParseAuthoringRecurrenceRuleInput = {
  raw: string;
  repeatEnd?: string;
  executionCondition?: string;
  sourceRowIds?: string[];
};

export type AuthoringRecurrenceOccurrence = {
  occurrenceId: string;
  itemId: string;
  date: string;
  /** One-based position in the full series, not just the visible page. */
  occurrenceIndex: number;
};

export type ProjectAuthoringRecurrenceDatesInput = {
  itemId: string;
  startDate: string;
  rule: AuthoringRecurrenceRule;
  /** Finite-series page size. Defaults to 30. */
  limit?: number;
  /** Finite-series occurrence offset. Defaults to 0. */
  offset?: number;
  /** Open-ended date window size. Defaults to 4 weeks. */
  openEndedWeeks?: number;
  /** Open-ended date-window offset. Defaults to 0 weeks. */
  openEndedOffsetWeeks?: number;
};

export type AuthoringRecurrenceDateProjection = {
  occurrences: AuthoringRecurrenceOccurrence[];
  hasMore: boolean;
  totalCount?: number;
  window?: {
    start: string;
    end: string;
  };
};

export function isValidAuthoringDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function utcDay(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MILLISECONDS;
}

function dateFromUtcDay(value: number): string {
  return new Date(value * DAY_MILLISECONDS).toISOString().slice(0, 10);
}

function addDays(value: string, amount: number): string {
  return dateFromUtcDay(utcDay(value) + amount);
}

function positiveInteger(value: string): number | undefined {
  if (!/^[1-9]\d*$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseWeekdays(value: string): AuthoringWeekday[] | undefined {
  const tokens = value
    .replace(/요일/gu, "")
    .split(/[\s,/·]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return undefined;
  const weekdays = tokens.map((token) => WEEKDAY_CODES[token]);
  if (weekdays.some((weekday) => !weekday)) return undefined;
  return Array.from(new Set(weekdays)).sort(
    (left, right) => WEEKDAY_MONDAY_OFFSET[left] - WEEKDAY_MONDAY_OFFSET[right],
  );
}

export function parseAuthoringRecurrenceRule({
  raw,
  repeatEnd,
  executionCondition,
  sourceRowIds = [],
}: ParseAuthoringRecurrenceRuleInput): AuthoringRecurrenceParseResult {
  const label = raw.trim();
  const compact = label.replace(/\s+/gu, "");
  let base:
    | Omit<
        AuthoringRecurrenceRule,
        "raw" | "end" | "executionCondition" | "sourceRowIds"
      >
    | undefined;

  if (compact === "매일") {
    base = { frequency: "daily", interval: 1 };
  } else {
    const daily = /^(\d+)일마다$/u.exec(compact);
    if (daily) {
      const interval = positiveInteger(daily[1]);
      if (interval) base = { frequency: "daily", interval };
    }
  }

  if (!base) {
    const weekly =
      /^매주\s+(.+)$/u.exec(label) ?? /^(\d+)\s*주마다\s+(.+)$/u.exec(label);
    if (weekly) {
      const hasInterval = weekly.length === 3;
      const interval = hasInterval ? positiveInteger(weekly[1]) : 1;
      const weekdays = parseWeekdays(hasInterval ? weekly[2] : weekly[1]);
      if (interval && weekdays) {
        base = { frequency: "weekly", interval, weekdays };
      }
    }
  }

  if (!base) {
    const monthly =
      /^매월\s*(\d{1,2})일$/u.exec(label) ??
      /^(\d+)\s*개월마다\s*(\d{1,2})일$/u.exec(label);
    if (monthly) {
      const hasInterval = monthly.length === 3;
      const interval = hasInterval ? positiveInteger(monthly[1]) : 1;
      const dayOfMonth = Number(hasInterval ? monthly[2] : monthly[1]);
      if (interval && dayOfMonth >= 1 && dayOfMonth <= 31) {
        base = { frequency: "monthly", interval, dayOfMonth };
      }
    }
  }

  if (!base) return { ok: false, reason: "unsupported_rule" };

  const rawEnd = repeatEnd?.trim();
  let end: AuthoringRecurrenceRule["end"];
  if (rawEnd) {
    const countMatch = /^([1-9]\d*)\s*회$/u.exec(rawEnd);
    if (countMatch) {
      const count = positiveInteger(countMatch[1]);
      if (!count) return { ok: false, reason: "invalid_end" };
      end = { mode: "count", count, raw: rawEnd };
    } else if (isValidAuthoringDate(rawEnd)) {
      end = { mode: "until", date: rawEnd, raw: rawEnd };
    } else {
      return { ok: false, reason: "invalid_end" };
    }
  }

  const condition = executionCondition?.trim();
  return {
    ok: true,
    rule: {
      raw: label,
      ...base,
      ...(end ? { end } : {}),
      ...(condition ? { executionCondition: condition } : {}),
      sourceRowIds: Array.from(new Set(sourceRowIds)),
    },
  };
}

export function resolveAuthoringScheduleDate(
  schedule: AuthoringSchedule | undefined,
): string | undefined {
  if (!schedule) return undefined;
  if (schedule.kind === "absolute") {
    return isValidAuthoringDate(schedule.date) ? schedule.date : undefined;
  }
  if (!schedule.anchorLabel || !isValidAuthoringDate(schedule.anchorLabel)) {
    return undefined;
  }
  return addDays(schedule.anchorLabel, schedule.dayOffset);
}

function recurrenceSignature(rule: AuthoringRecurrenceRule): string {
  return JSON.stringify({
    frequency: rule.frequency,
    interval: rule.interval,
    weekdays: rule.weekdays,
    dayOfMonth: rule.dayOfMonth,
    end:
      rule.end?.mode === "count"
        ? { mode: "count", count: rule.end.count }
        : rule.end?.mode === "until"
          ? { mode: "until", date: rule.end.date }
          : undefined,
  });
}

function monthDate(
  startDate: string,
  monthOffset: number,
  dayOfMonth: number,
): string | undefined {
  const [year, month] = startDate.split("-").map(Number);
  const absoluteMonth = year * 12 + month - 1 + monthOffset;
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonth = absoluteMonth % 12;
  const daysInMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  if (dayOfMonth > daysInMonth) return undefined;
  return [
    String(targetYear).padStart(4, "0"),
    String(targetMonth + 1).padStart(2, "0"),
    String(dayOfMonth).padStart(2, "0"),
  ].join("-");
}

function* recurrenceDateSequence(
  startDate: string,
  rule: AuthoringRecurrenceRule,
): Generator<string> {
  yield startDate;

  if (rule.frequency === "daily") {
    let current = addDays(startDate, rule.interval);
    while (true) {
      yield current;
      current = addDays(current, rule.interval);
    }
  }

  if (rule.frequency === "weekly") {
    const startWeekday = new Date(`${startDate}T00:00:00Z`).getUTCDay();
    const firstMonday = addDays(startDate, -((startWeekday + 6) % 7));
    let weekOffset = 0;
    while (true) {
      for (const weekday of rule.weekdays ?? []) {
        const current = addDays(
          firstMonday,
          weekOffset * 7 + WEEKDAY_MONDAY_OFFSET[weekday],
        );
        if (current > startDate) yield current;
      }
      weekOffset += rule.interval;
    }
  }

  let monthOffset = 0;
  while (true) {
    const current = monthDate(
      startDate,
      monthOffset,
      rule.dayOfMonth as number,
    );
    if (current && current > startDate) yield current;
    monthOffset += rule.interval;
  }
}

function finiteTotalCount(
  startDate: string,
  rule: AuthoringRecurrenceRule,
): number | undefined {
  if (rule.end?.mode === "count") return rule.end.count;
  if (rule.end?.mode !== "until") return undefined;
  const until = rule.end.date;
  if (until < startDate) return 0;

  if (rule.frequency === "daily") {
    return Math.floor((utcDay(until) - utcDay(startDate)) / rule.interval) + 1;
  }

  if (rule.frequency === "weekly") {
    const startWeekday = new Date(`${startDate}T00:00:00Z`).getUTCDay();
    const firstMondayDay = utcDay(startDate) - ((startWeekday + 6) % 7);
    const periodDays = rule.interval * 7;
    let total = 1;
    for (const weekday of rule.weekdays ?? []) {
      const firstCandidateDay = firstMondayDay + WEEKDAY_MONDAY_OFFSET[weekday];
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
    const candidate = monthDate(
      startDate,
      monthOffset,
      rule.dayOfMonth as number,
    );
    if (candidate && candidate > startDate && candidate <= until) total += 1;
    monthOffset += rule.interval;
  }
  return total;
}

export function projectAuthoringRecurrenceDates({
  itemId,
  startDate,
  rule,
  limit = 30,
  offset = 0,
  openEndedWeeks = 4,
  openEndedOffsetWeeks = 0,
}: ProjectAuthoringRecurrenceDatesInput): AuthoringRecurrenceDateProjection {
  if (!itemId || !isValidAuthoringDate(startDate)) {
    return { occurrences: [], hasMore: false };
  }
  if (rule.interval < 1 || !Number.isSafeInteger(rule.interval)) {
    return { occurrences: [], hasMore: false };
  }
  if (rule.end?.mode === "until" && rule.end.date < startDate) {
    return { occurrences: [], hasMore: false, totalCount: 0 };
  }

  const finite = Boolean(rule.end);
  const safeLimit = Math.max(1, Math.floor(limit));
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeWeeks = Math.max(1, Math.floor(openEndedWeeks));
  const safeWeekOffset = Math.max(0, Math.floor(openEndedOffsetWeeks));
  const windowStart = finite
    ? undefined
    : addDays(startDate, safeWeekOffset * 7);
  const windowEndExclusive = finite
    ? undefined
    : addDays(windowStart as string, safeWeeks * 7);
  const totalCount = finiteTotalCount(startDate, rule);
  const signature = recurrenceSignature(rule);
  const occurrences: AuthoringRecurrenceOccurrence[] = [];

  let occurrenceIndex = 0;
  for (const date of recurrenceDateSequence(startDate, rule)) {
    occurrenceIndex += 1;
    if (rule.end?.mode === "count" && occurrenceIndex > rule.end.count) break;
    if (rule.end?.mode === "until" && date > rule.end.date) break;

    if (finite) {
      if (occurrenceIndex <= safeOffset) continue;
      if (occurrences.length >= safeLimit) break;
    } else {
      if (date < (windowStart as string)) continue;
      if (date >= (windowEndExclusive as string)) break;
    }

    occurrences.push({
      occurrenceId: stableAuthoringId(
        "authoring-occurrence",
        itemId,
        signature,
        date,
      ),
      itemId,
      date,
      occurrenceIndex,
    });
  }

  const hasMore = finite
    ? safeOffset + occurrences.length < (totalCount ?? occurrenceIndex)
    : true;
  return {
    occurrences,
    hasMore,
    ...(totalCount !== undefined ? { totalCount } : {}),
    ...(!finite && windowStart && windowEndExclusive
      ? {
          window: {
            start: windowStart,
            end: addDays(windowEndExclusive, -1),
          },
        }
      : {}),
  };
}
