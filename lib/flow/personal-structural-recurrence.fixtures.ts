import {
  createPersonalStructuralRecurrenceSeries,
  type PersonalStructuralRecurrenceRule,
  type PersonalStructuralRecurrenceSeries,
} from './personal-structural-recurrence';
import type { PersonalStructuralSchedule } from './personal-structural-overlay';

export const PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP =
  '2026-07-13T00:00:00.000Z';

export const personalStructuralRecurrenceGoldenFixtureIds = [
  'no-recurrence',
  'daily',
  'every-two-days',
  'weekdays',
  'three-days-weekly',
  'every-two-weeks',
  'monthly',
  'monthly-day-31-skip',
  'until-end',
  'count-end',
  'open-ended-range-bound',
  'all-day-recurrence',
  'iana-timed-recurrence',
  'floating-timed-recurrence',
  'dst-wall-clock',
  'done-reopened',
  'skipped-occurrence',
  'held-occurrence',
  'occurrence-override',
  'future-rule-revision',
  'reorder-identity',
  'title-memo-identity',
  'tombstone-history',
  'restore-future',
  'malformed-recurrence',
  'legacy-repeat-preset',
  'source-backed-not-applied',
  'outside-range',
  'duplicate-occurrence',
  'generation-limit',
] as const;

export type PersonalStructuralRecurrenceGoldenFixtureId =
  (typeof personalStructuralRecurrenceGoldenFixtureIds)[number];

export function createRecurrenceFixtureSeries(options: {
  itemId: string;
  startDate: string;
  rule: PersonalStructuralRecurrenceRule;
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
}): PersonalStructuralRecurrenceSeries {
  return createPersonalStructuralRecurrenceSeries({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: options.itemId,
    effectiveFrom: options.startDate,
    rule: options.rule,
    ...(options.time
      ? {
          scheduleTemplate: {
            time: options.time,
            ...(options.durationMinutes !== undefined
              ? { durationMinutes: options.durationMinutes }
              : {}),
            ...(options.timeZone ? { timeZone: options.timeZone } : {}),
          },
        }
      : {}),
    updatedAt: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
}

export function createRecurrenceFixtureSchedule(options: {
  date: string;
  series?: PersonalStructuralRecurrenceSeries;
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
}): PersonalStructuralSchedule {
  return {
    mode: 'fixed_date',
    date: options.date,
    ...(options.time ? { time: options.time } : {}),
    ...(options.time && options.durationMinutes !== undefined
      ? { durationMinutes: options.durationMinutes }
      : {}),
    ...(options.time && options.timeZone ? { timeZone: options.timeZone } : {}),
    ...(options.series ? { repeat: options.series } : {}),
  };
}

export const personalStructuralOccurrenceStateMatrix = [
  { from: 'pending', to: 'done', allowed: true },
  { from: 'pending', to: 'skipped', allowed: true },
  { from: 'pending', to: 'held', allowed: true },
  { from: 'done', to: 'reopened', allowed: true },
  { from: 'done', to: 'skipped', allowed: false },
  { from: 'reopened', to: 'done', allowed: true },
  { from: 'reopened', to: 'skipped', allowed: true },
  { from: 'reopened', to: 'held', allowed: true },
  { from: 'skipped', to: 'reopened', allowed: true },
  { from: 'held', to: 'reopened', allowed: true },
] as const;
