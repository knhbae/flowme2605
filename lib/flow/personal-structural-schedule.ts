import type { PersonalStructuralSchedule } from './personal-structural-overlay';
import { normalizePersonalStructuralRepeatForStorage } from './personal-structural-recurrence';

export const PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES = 30;
export const PERSONAL_STRUCTURAL_MIN_DURATION_MINUTES = 5;
export const PERSONAL_STRUCTURAL_MAX_DURATION_MINUTES = 24 * 60;

export type PersonalStructuralScheduleState = 'unscheduled' | 'all_day' | 'timed';
export type PersonalStructuralTimeZonePolicy =
  | 'not_applicable'
  | 'iana'
  | 'floating_local';

export type PersonalStructuralScheduleNormalizationResult = {
  schedule?: PersonalStructuralSchedule;
  warnings: string[];
  legacyTimeOnlyMigrated: boolean;
};

export type PersonalStructuralScheduleProjection = {
  scheduleState: PersonalStructuralScheduleState;
  calendarDate?: string;
  startTime?: string;
  durationMinutes?: number;
  endDate?: string;
  endTime?: string;
  timeZone?: string;
  timeZonePolicy: PersonalStructuralTimeZonePolicy;
  floatingTime: boolean;
  displayLabel: string;
  stableEventIdentitySeed: string;
  validationWarnings: string[];
};

type FixedDateSchedule = Extract<PersonalStructuralSchedule, { mode: 'fixed_date' }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

export function isPersonalStructuralPlainDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
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

export function isPersonalStructuralLocalTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function isPersonalStructuralIanaTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function normalizeDuration(value: unknown): number | undefined {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= PERSONAL_STRUCTURAL_MIN_DURATION_MINUTES &&
    value <= PERSONAL_STRUCTURAL_MAX_DURATION_MINUTES
    ? value
    : undefined;
}

function normalizeRepeat(value: unknown): FixedDateSchedule['repeat'] | undefined {
  return normalizePersonalStructuralRepeatForStorage(value).repeat;
}

function normalizeTimedFields(
  value: Record<string, unknown>,
  warnings: string[],
): { time?: string; durationMinutes?: number; timeZone?: string } {
  const rawTime = normalizeText(value.time, 16);
  const time = isPersonalStructuralLocalTime(rawTime) ? rawTime : undefined;
  if (rawTime && !time) warnings.push('invalid_time');

  const durationMinutes = normalizeDuration(value.durationMinutes);
  if (value.durationMinutes !== undefined && durationMinutes === undefined) {
    warnings.push('invalid_duration');
  }

  const rawTimeZone = normalizeText(value.timeZone, 120);
  const timeZone = isPersonalStructuralIanaTimeZone(rawTimeZone)
    ? rawTimeZone
    : undefined;
  if (rawTimeZone && !timeZone) warnings.push('invalid_time_zone');

  if (!time) {
    if (durationMinutes !== undefined) warnings.push('duration_without_timed_schedule');
    if (timeZone) warnings.push('time_zone_without_timed_schedule');
    return {};
  }

  return {
    time,
    ...(durationMinutes !== undefined ? { durationMinutes } : {}),
    ...(timeZone ? { timeZone } : {}),
  };
}

export function normalizePersonalStructuralSchedule(
  value: unknown,
): PersonalStructuralScheduleNormalizationResult {
  const warnings: string[] = [];
  if (value === undefined || value === null) {
    return { warnings, legacyTimeOnlyMigrated: false };
  }
  if (!isRecord(value)) {
    return {
      warnings: ['invalid_schedule'],
      legacyTimeOnlyMigrated: false,
    };
  }

  const timedFields = normalizeTimedFields(value, warnings);
  const legacyTimeOnlyMigrated = Boolean(
    timedFields.time && value.durationMinutes === undefined && value.timeZone === undefined,
  );

  if (value.mode === 'fixed_date') {
    const date = normalizeText(value.date, 32);
    if (!isPersonalStructuralPlainDate(date)) {
      return {
        warnings: [...warnings, 'invalid_fixed_date'],
        legacyTimeOnlyMigrated,
      };
    }
    const repeat = normalizeRepeat(value.repeat);
    if (value.repeat !== undefined && !repeat) warnings.push('invalid_repeat');
    return {
      schedule: {
        mode: 'fixed_date',
        date,
        ...timedFields,
        ...(repeat ? { repeat } : {}),
      },
      warnings,
      legacyTimeOnlyMigrated,
    };
  }

  if (
    value.mode === 'anchor_offset' &&
    typeof value.dayOffset === 'number' &&
    Number.isFinite(value.dayOffset)
  ) {
    const anchorFieldId = normalizeText(value.anchorFieldId, 240);
    return {
      schedule: {
        mode: 'anchor_offset',
        dayOffset: value.dayOffset,
        ...(anchorFieldId ? { anchorFieldId } : {}),
        ...timedFields,
      },
      warnings,
      legacyTimeOnlyMigrated,
    };
  }

  return {
    warnings: [...warnings, 'invalid_schedule_mode'],
    legacyTimeOnlyMigrated,
  };
}

function addDaysToPlainDate(date: string, days: number): string | undefined {
  if (!isPersonalStructuralPlainDate(date)) return undefined;
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function resolveCalendarDate(
  schedule: PersonalStructuralSchedule,
  anchorDate: string | undefined,
): string | undefined {
  if (schedule.mode === 'fixed_date') return schedule.date;
  if (!isPersonalStructuralPlainDate(anchorDate)) return undefined;
  return addDaysToPlainDate(anchorDate, schedule.dayOffset);
}

function addMinutesToPlainLocalDateTime(
  date: string,
  time: string,
  durationMinutes: number,
): { endDate: string; endTime: string } | undefined {
  if (!isPersonalStructuralPlainDate(date) || !isPersonalStructuralLocalTime(time)) {
    return undefined;
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const end = new Date(Date.UTC(year, month - 1, day, hour, minute + durationMinutes));
  return {
    endDate: end.toISOString().slice(0, 10),
    endTime: end.toISOString().slice(11, 16),
  };
}

export function buildPersonalStructuralStableEventIdentitySeed(options: {
  identityNamespace: string;
  itemId: string;
}): string {
  return `personal-structural:${encodeURIComponent(options.identityNamespace.trim())}:${encodeURIComponent(options.itemId.trim())}`;
}

export function buildPersonalStructuralScheduleProjection(options: {
  schedule: unknown;
  anchorDate?: string;
  identityNamespace: string;
  itemId: string;
}): PersonalStructuralScheduleProjection {
  const normalized = normalizePersonalStructuralSchedule(options.schedule);
  const stableEventIdentitySeed = buildPersonalStructuralStableEventIdentitySeed(options);
  if (!normalized.schedule) {
    return {
      scheduleState: 'unscheduled',
      timeZonePolicy: 'not_applicable',
      floatingTime: false,
      displayLabel: '날짜 없음',
      stableEventIdentitySeed,
      validationWarnings: normalized.warnings,
    };
  }

  const schedule = normalized.schedule;
  const calendarDate = resolveCalendarDate(schedule, options.anchorDate);
  const validationWarnings = [...normalized.warnings];
  if (!calendarDate && schedule.mode === 'anchor_offset') {
    validationWarnings.push('unresolved_anchor_date');
  }
  const startTime = schedule.time;
  if (!startTime) {
    return {
      scheduleState: 'all_day',
      ...(calendarDate ? { calendarDate } : {}),
      timeZonePolicy: 'not_applicable',
      floatingTime: false,
      displayLabel: calendarDate ? `${calendarDate} 종일` : '기준일 필요',
      stableEventIdentitySeed,
      validationWarnings,
    };
  }

  const durationMinutes = schedule.durationMinutes ?? PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES;
  const end = calendarDate
    ? addMinutesToPlainLocalDateTime(calendarDate, startTime, durationMinutes)
    : undefined;
  const timeZone = schedule.timeZone;
  return {
    scheduleState: 'timed',
    ...(calendarDate ? { calendarDate } : {}),
    startTime,
    durationMinutes,
    ...(end ? { endDate: end.endDate, endTime: end.endTime } : {}),
    ...(timeZone ? { timeZone } : {}),
    timeZonePolicy: timeZone ? 'iana' : 'floating_local',
    floatingTime: !timeZone,
    displayLabel: calendarDate ? `${calendarDate} ${startTime}` : `기준일 ${startTime}`,
    stableEventIdentitySeed,
    validationWarnings,
  };
}
