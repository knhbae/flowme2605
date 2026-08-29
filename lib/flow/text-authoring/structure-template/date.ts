import { isValidAuthoringDate } from "../recurrence";
import type { StructureTemplateWeekday } from "./types";

export const STRUCTURE_TEMPLATE_WEEKDAYS = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU",
] as const;

const DAY_MILLISECONDS = 86_400_000;

const WEEKDAY_OFFSET: Record<StructureTemplateWeekday, number> = {
  MO: 0,
  TU: 1,
  WE: 2,
  TH: 3,
  FR: 4,
  SA: 5,
  SU: 6,
};

const WEEKDAY_LABEL: Record<StructureTemplateWeekday, string> = {
  MO: "월",
  TU: "화",
  WE: "수",
  TH: "목",
  FR: "금",
  SA: "토",
  SU: "일",
};

function utcDay(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MILLISECONDS;
}

function fromUtcDay(value: number): string {
  return new Date(value * DAY_MILLISECONDS).toISOString().slice(0, 10);
}

export function addStructureTemplateDays(
  date: string,
  amount: number,
): string {
  if (!isValidAuthoringDate(date) || !Number.isSafeInteger(amount)) {
    throw new RangeError("A valid date and integer day offset are required.");
  }
  return fromUtcDay(utcDay(date) + amount);
}

export function normalizeStructureTemplateWeekdays(
  values: readonly unknown[],
): StructureTemplateWeekday[] {
  const selected = new Set(
    values.filter((value): value is StructureTemplateWeekday => (
      typeof value === "string"
      && STRUCTURE_TEMPLATE_WEEKDAYS.includes(value as StructureTemplateWeekday)
    )),
  );
  return STRUCTURE_TEMPLATE_WEEKDAYS.filter((weekday) => selected.has(weekday));
}

export function formatStructureTemplateWeekdays(
  values: readonly unknown[],
): string {
  return `매주 ${normalizeStructureTemplateWeekdays(values)
    .map((weekday) => WEEKDAY_LABEL[weekday])
    .join(", ")}`;
}

export function formatStructureTemplateDayOffset(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("A relative day offset must be an integer.");
  }
  if (value === 0) return "D-Day";
  return value < 0 ? `D${value}` : `D+${value}`;
}

export function firstStructureTemplateOccurrence(
  startDate: string,
  weekdays: readonly unknown[],
): string | undefined {
  if (!isValidAuthoringDate(startDate)) return undefined;
  const normalized = normalizeStructureTemplateWeekdays(weekdays);
  if (normalized.length === 0) return undefined;
  const jsWeekday = new Date(`${startDate}T00:00:00Z`).getUTCDay();
  const startMondayOffset = (jsWeekday + 6) % 7;
  let smallestDelta = Number.POSITIVE_INFINITY;
  normalized.forEach((weekday) => {
    const delta = (WEEKDAY_OFFSET[weekday] - startMondayOffset + 7) % 7;
    smallestDelta = Math.min(smallestDelta, delta);
  });
  return addStructureTemplateDays(startDate, smallestDelta);
}

export function structureTemplateOccurrenceDatesUntil(
  startDate: string,
  weekdays: readonly unknown[],
  untilDate: string,
): string[] {
  if (!isValidAuthoringDate(startDate) || !isValidAuthoringDate(untilDate)) {
    return [];
  }
  const selected = new Set(normalizeStructureTemplateWeekdays(weekdays));
  if (selected.size === 0 || untilDate < startDate) return [];
  const dates: string[] = [];
  for (let day = utcDay(startDate); day <= utcDay(untilDate); day += 1) {
    const date = fromUtcDay(day);
    const jsWeekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const mondayOffset = (jsWeekday + 6) % 7;
    const weekday = STRUCTURE_TEMPLATE_WEEKDAYS[mondayOffset];
    if (selected.has(weekday)) dates.push(date);
  }
  return dates;
}

export function isValidStructureTemplateTimezone(value: string): boolean {
  const timezone = value.trim();
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function isValidStructureTemplateDate(value: unknown): value is string {
  return typeof value === "string" && isValidAuthoringDate(value);
}
