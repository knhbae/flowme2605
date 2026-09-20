import type { PublicSchedule } from './contract';

/** Optional Program-only source timing. Absence leaves old payloads byte-compatible. */
export type ProgramOrdinaryTiming = { version: 1; time: string | null; timeZone: string | null };
export type ProgramOrdinaryTimingDraft = { version: 1; time: string; timeZone: string };
export const PROGRAM_ORDINARY_TIME_LIMITS = Object.freeze({ version: 1, time: 100, timeZone: 120 });
function exact(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  return Reflect.ownKeys(value).length === 3
    && ['version', 'time', 'timeZone'].every(key => { const d = Object.getOwnPropertyDescriptor(value, key); return !!d?.enumerable && Object.hasOwn(d, 'value'); });
}
export function validateProgramOrdinaryTiming(value: unknown): value is ProgramOrdinaryTiming {
  try {
    if (!exact(value) || value.version !== 1) return false;
    if (value.time !== null && (typeof value.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time))) return false;
    if (value.timeZone !== null) {
      if (typeof value.timeZone !== 'string' || !value.timeZone || value.timeZone !== value.timeZone.trim() || value.timeZone.length > PROGRAM_ORDINARY_TIME_LIMITS.timeZone) return false;
      new Intl.DateTimeFormat('en', { timeZone: value.timeZone });
    }
    return true;
  } catch { return false; }
}
/** Invalid user text is private recovery input, never a public schedule. */
export function validateProgramOrdinaryTimingDraft(value: unknown): value is ProgramOrdinaryTimingDraft {
  try {
    return exact(value) && value.version === 1 && typeof value.time === 'string' && value.time.length <= PROGRAM_ORDINARY_TIME_LIMITS.time
      && typeof value.timeZone === 'string' && value.timeZone.length <= PROGRAM_ORDINARY_TIME_LIMITS.timeZone;
  } catch { return false; }
}
export function programOrdinaryTimingFromDraft(draft: ProgramOrdinaryTimingDraft): ProgramOrdinaryTiming | null {
  if (!validateProgramOrdinaryTimingDraft(draft)) return null;
  const timing = { version: 1 as const, time: draft.time.trim() || null, timeZone: draft.timeZone.trim() || null };
  return validateProgramOrdinaryTiming(timing) ? timing : null;
}
export function programOrdinaryTimingDraft(timing?: ProgramOrdinaryTiming): ProgramOrdinaryTimingDraft {
  return { version: 1, time: timing?.time ?? '', timeZone: timing?.timeZone ?? '' };
}
export function programOrdinaryTimingLabel(timing?: ProgramOrdinaryTiming): string {
  if (!timing) return '';
  return [timing.time, timing.timeZone].filter(Boolean).join(' · ');
}
export function programOrdinaryScheduleLabel(schedule: Exclude<PublicSchedule, { kind: 'recurring' }>): string {
  const date = schedule.kind === 'undated' ? '날짜 미정' : schedule.kind === 'fixed' ? schedule.date : `기준일 ${schedule.days >= 0 ? '+' : ''}${schedule.days}일`;
  return [date, programOrdinaryTimingLabel(schedule.timing)].filter(Boolean).join(' · ');
}
