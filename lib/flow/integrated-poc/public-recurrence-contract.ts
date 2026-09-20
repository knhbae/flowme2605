import { isValidAuthoringDate, parseAuthoringRecurrenceRule, projectAuthoringRecurrenceDates } from './native-creator-vendor/text-authoring/recurrence';
import type { AuthoringRecurrenceRule, AuthoringWeekday } from './native-creator-vendor/text-authoring/types';

/** Additive PoC contract. Not enabled in stored PublicSchedule until every consumer is ready. */
export type ProgramPublicRecurrenceV1 = {
  version: 1; semantics: 'authoring-v1'; frequency: 'daily' | 'weekly' | 'monthly'; interval: number;
  weekdays?: AuthoringWeekday[]; dayOfMonth?: number;
  end: { mode: 'count'; count: number } | { mode: 'until'; date: string } | null;
};
export type ProgramPublicationStart = { kind: 'undated' } | { kind: 'fixed'; date: string } | { kind: 'relative'; days: number };
export type ProgramPublicRecurringScheduleV1 = { kind: 'recurring'; version: 1; rule: ProgramPublicRecurrenceV1;
  start: ProgramPublicationStart; time: string | null; timeZone: string | null };
/** Invalid in-progress text is private draft input, not an executable public rule. */
export type ProgramPublicationRecurrenceDraft = { version: 1; raw: string; end: string;
  startKind: ProgramPublicationStart['kind']; startValue: string; time: string; timeZone: string };
export const PROGRAM_PUBLIC_RECURRENCE_WINDOW = Object.freeze({ maxOffset: 10000, maxLimit: 200, maxWeeks: 8, maxWeekOffset: 512 });
export const PROGRAM_PUBLICATION_RECURRENCE_DRAFT_LIMITS = Object.freeze({ raw: 500, end: 100, startValue: 100, time: 100, timeZone: 120 });
const weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
const weekdayKo = { MO: '월', TU: '화', WE: '수', TH: '목', FR: '금', SA: '토', SU: '일' };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v))
  && Object.getOwnPropertySymbols(v).length === 0
  && Object.entries(Object.getOwnPropertyDescriptors(v)).every(([key, d]) => !['__proto__', 'constructor', 'prototype'].includes(key) && d.enumerable && Object.hasOwn(d, 'value'));
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(key => Object.hasOwn(v, key));
const positive = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) && isValidAuthoringDate(v);

export function validateProgramPublicRecurringSchedule(value: unknown): value is ProgramPublicRecurringScheduleV1 {
  try {
    if (!record(value) || !exact(value, ['kind', 'version', 'rule', 'start', 'time', 'timeZone']) || value.kind !== 'recurring' || value.version !== 1
      || !validateProgramPublicRecurrence(value.rule) || !record(value.start)) return false;
    const start = value.start;
    if (!(exact(start, ['kind']) && start.kind === 'undated' || exact(start, ['kind', 'date']) && start.kind === 'fixed' && date(start.date)
      || exact(start, ['kind', 'days']) && start.kind === 'relative' && Number.isSafeInteger(start.days) && Math.abs(Number(start.days)) <= 36600)) return false;
    if (start.kind === 'fixed' && value.rule.end?.mode === 'until' && value.rule.end.date < String(start.date)) return false;
    if (value.time !== null && (typeof value.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time))) return false;
    if (value.timeZone !== null) {
      if (typeof value.timeZone !== 'string' || !value.timeZone || value.timeZone.length > 120) return false;
      new Intl.DateTimeFormat('en', { timeZone: value.timeZone });
    }
    return true;
  } catch { return false; }
}
export function programRecurringScheduleFromDraft(draft: ProgramPublicationRecurrenceDraft): ProgramPublicRecurringScheduleV1 | null {
  if (!validateProgramPublicationRecurrenceDraft(draft)) return null;
  const parsed = parseAuthoringRecurrenceRule({ raw: draft.raw, repeatEnd: draft.end });
  const rule = parsed.ok && programPublicRecurrenceFromAuthoring(parsed.rule);
  if (!rule || draft.version !== 1 || draft.startKind === 'relative' && !/^[+-]?\d+$/.test(draft.startValue)) return null;
  const schedule = { kind: 'recurring' as const, version: 1 as const, rule,
    start: draft.startKind === 'fixed' ? { kind: 'fixed' as const, date: draft.startValue }
      : draft.startKind === 'relative' ? { kind: 'relative' as const, days: Number(draft.startValue) } : { kind: 'undated' as const },
    time: draft.time.trim() || null, timeZone: draft.timeZone.trim() || null };
  return validateProgramPublicRecurringSchedule(schedule) ? schedule : null;
}
/** Preserve incomplete/invalid user input for recovery. Execution validation is deliberately separate. */
export function validateProgramPublicationRecurrenceDraft(value: unknown): value is ProgramPublicationRecurrenceDraft {
  try {
    return record(value) && exact(value, ['version', 'raw', 'end', 'startKind', 'startValue', 'time', 'timeZone']) && value.version === 1
      && ['undated', 'fixed', 'relative'].includes(value.startKind as string)
      && Object.entries(PROGRAM_PUBLICATION_RECURRENCE_DRAFT_LIMITS).every(([key, max]) => typeof value[key] === 'string' && value[key].length <= max);
  } catch { return false; }
}
export function programRecurringDraftFromSchedule(schedule: ProgramPublicRecurringScheduleV1): ProgramPublicationRecurrenceDraft {
  const rule = programPublicRecurrenceToAuthoring(schedule.rule)!;
  return { version: 1, raw: rule.raw, end: rule.end?.raw ?? '', startKind: schedule.start.kind,
    startValue: schedule.start.kind === 'fixed' ? schedule.start.date : schedule.start.kind === 'relative' ? String(schedule.start.days) : '',
    time: schedule.time ?? '', timeZone: schedule.timeZone ?? '' };
}
export function programRecurringScheduleStart(schedule: ProgramPublicRecurringScheduleV1, anchor: string | null): string | null {
  if (!validateProgramPublicRecurringSchedule(schedule)) return null;
  if (schedule.start.kind === 'undated') return null;
  if (schedule.start.kind === 'fixed') return schedule.start.date;
  if (!date(anchor)) return null;
  const value = new Date(`${anchor}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + schedule.start.days);
  const resolved = value.toISOString().slice(0, 10); return date(resolved) ? resolved : null;
}
export function programRecurringScheduleLabel(schedule: ProgramPublicRecurringScheduleV1): string {
  const rule = programPublicRecurrenceToAuthoring(schedule.rule); if (!rule) return '지원하지 않는 반복';
  const start = schedule.start.kind === 'fixed' ? `${schedule.start.date} 시작` : schedule.start.kind === 'relative'
    ? `기준일 ${schedule.start.days >= 0 ? '+' : ''}${schedule.start.days}일 시작` : '시작일 미정';
  return [rule.raw, rule.end?.raw ?? '종료 미정', start, schedule.time, schedule.timeZone].filter(Boolean).join(' · ');
}

export function validateProgramPublicRecurrence(value: unknown): value is ProgramPublicRecurrenceV1 {
  try { return validRecurrence(value); } catch { return false; }
}
function validRecurrence(value: unknown): value is ProgramPublicRecurrenceV1 {
  if (!record(value) || value.version !== 1 || value.semantics !== 'authoring-v1' || !positive(value.interval)) return false;
  const keys = ['version', 'semantics', 'frequency', 'interval', 'end'];
  if (value.frequency === 'weekly') {
    keys.push('weekdays');
    if (!Array.isArray(value.weekdays) || !value.weekdays.length || value.weekdays.length > 7
      || value.weekdays.some(day => !weekdays.includes(day)) || new Set(value.weekdays).size !== value.weekdays.length) return false;
  } else if (value.frequency === 'monthly') {
    keys.push('dayOfMonth');
    if (!positive(value.dayOfMonth) || value.dayOfMonth > 31) return false;
  } else if (value.frequency !== 'daily') return false;
  if (!exact(value, keys)) return false;
  return value.end === null || record(value.end) && (exact(value.end, ['mode', 'count']) && value.end.mode === 'count' && positive(value.end.count)
    || exact(value.end, ['mode', 'date']) && value.end.mode === 'until' && date(value.end.date));
}

/** Project only a previously validated author's rule; never spread source metadata into public data. */
export function programPublicRecurrenceFromAuthoring(rule: Pick<AuthoringRecurrenceRule, 'frequency' | 'interval' | 'weekdays' | 'dayOfMonth' | 'end'>): ProgramPublicRecurrenceV1 | null {
  const result = {
    version: 1 as const, semantics: 'authoring-v1' as const, frequency: rule.frequency, interval: rule.interval,
    ...(rule.frequency === 'weekly' ? { weekdays: rule.weekdays ? [...rule.weekdays] : undefined } : {}),
    ...(rule.frequency === 'monthly' ? { dayOfMonth: rule.dayOfMonth } : {}),
    end: rule.end?.mode === 'count' ? { mode: 'count' as const, count: rule.end.count }
      : rule.end?.mode === 'until' ? { mode: 'until' as const, date: rule.end.date } : null,
  };
  return validateProgramPublicRecurrence(result) ? result : null;
}

/** Reconstruct only the supported grammar needed by the existing expander, without source row IDs. */
export function programPublicRecurrenceToAuthoring(value: unknown): AuthoringRecurrenceRule | null {
  if (!validateProgramPublicRecurrence(value)) return null;
  const raw = value.frequency === 'daily' ? value.interval === 1 ? '매일' : `${value.interval}일마다`
    : value.frequency === 'weekly' ? `${value.interval === 1 ? '매주' : `${value.interval}주마다`} ${value.weekdays!.map(day => weekdayKo[day]).join(', ')}`
      : `${value.interval === 1 ? '매월' : `${value.interval}개월마다`} ${value.dayOfMonth}일`;
  const repeatEnd = value.end?.mode === 'count' ? `${value.end.count}회` : value.end?.date;
  const result = parseAuthoringRecurrenceRule({ raw, ...(repeatEnd ? { repeatEnd } : {}) });
  return result.ok ? result.rule : null;
}

/** A view page does not cap/change the source rule. The author's explicit start remains occurrence 1. */
export function projectProgramPublicRecurrence(input: {
  itemId: string; startDate: string; rule: unknown;
  offset?: number; limit?: number; openEndedWeeks?: number; openEndedOffsetWeeks?: number;
}) {
  const rule = programPublicRecurrenceToAuthoring(input.rule), limits = PROGRAM_PUBLIC_RECURRENCE_WINDOW;
  if (!rule || typeof input.itemId !== 'string' || !input.itemId.trim() || input.itemId.length > 1200 || !date(input.startDate)) return { ok: false as const, reason: 'invalid-source' };
  const offset = input.offset ?? 0, limit = input.limit ?? 30, weeks = input.openEndedWeeks ?? 4, weekOffset = input.openEndedOffsetWeeks ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > limits.maxOffset || !Number.isSafeInteger(limit) || limit < 1 || limit > limits.maxLimit
    || !Number.isSafeInteger(weeks) || weeks < 1 || weeks > limits.maxWeeks || !Number.isSafeInteger(weekOffset) || weekOffset < 0 || weekOffset > limits.maxWeekOffset) return { ok: false as const, reason: 'invalid-window' };
  try {
    const projection = projectAuthoringRecurrenceDates({ itemId: input.itemId, startDate: input.startDate, rule,
      offset, limit, openEndedWeeks: weeks, openEndedOffsetWeeks: weekOffset });
    if (projection.occurrences.some(row => !date(row.date))) return { ok: false as const, reason: 'out-of-range' };
    return { ok: true as const, projection };
  } catch { return { ok: false as const, reason: 'out-of-range' }; }
}
