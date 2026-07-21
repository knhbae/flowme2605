import {
  generatePersonalStructuralOccurrences,
  type PersonalStructuralOccurrenceExecutionRecord,
  type PersonalStructuralOccurrenceExecutionState,
} from './personal-structural-occurrence';
import type { PersonalStructuralSchedule } from './personal-structural-overlay';
import {
  type PersonalStructuralRecurrenceEnd,
  type PersonalStructuralRecurrenceRule,
  type PersonalStructuralRecurrenceSeries,
  type PersonalStructuralRepeat,
  type PersonalStructuralWeekday,
} from './personal-structural-recurrence';
import {
  buildPersonalStructuralScheduleProjection,
  type PersonalStructuralScheduleProjection,
} from './personal-structural-schedule';

const KOREAN_WEEKDAY_TO_ISO: Record<string, PersonalStructuralWeekday> = {
  월: 'MO',
  화: 'TU',
  수: 'WE',
  목: 'TH',
  금: 'FR',
  토: 'SA',
  일: 'SU',
};

const ISO_WEEKDAYS = new Set<PersonalStructuralWeekday>([
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
]);

export type SavedRoutineOccurrenceOrigin = 'saved_routine';

export type SavedRoutineRecurrenceDefinition = {
  itemId: string;
  startDate: string;
  sourceRepeatRule?: string;
  repeatPreset?: string;
  selectedWeekdays?: string[];
  endDate?: string;
  occurrenceCount?: number;
  projectionWeeks?: number;
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
  updatedAt?: string;
};

export type SavedRoutineOccurrenceRow = {
  id: string;
  date?: string;
  timing?: string;
  structuralScheduleProjection?: PersonalStructuralScheduleProjection;
  structuralRepeat?: PersonalStructuralRepeat;
  structuralOccurrenceId?: string;
  structuralOccurrenceSeriesId?: string;
  structuralOccurrenceRevisionId?: string;
  structuralOccurrenceOriginalDate?: string;
  structuralOccurrenceExecutionState?: PersonalStructuralOccurrenceExecutionState;
  structuralOccurrenceOrigin?: SavedRoutineOccurrenceOrigin;
  structuralOccurrenceDateOverrideKey?: string;
};

export type SavedRoutineOccurrenceDateResolution = {
  date?: string;
  overrideKey: string;
};

export type SavedRoutineRecurrenceResolution = {
  series?: PersonalStructuralRecurrenceSeries;
  warnings: string[];
};

function isPlainDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

function getWeekday(date: string): PersonalStructuralWeekday {
  const weekdays: PersonalStructuralWeekday[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const [year, month, day] = date.split('-').map(Number);
  return weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function parseRrule(value?: string): Record<string, string> {
  const rule = (value ?? '').trim().replace(/^RRULE:/i, '');
  if (!rule) return {};
  return Object.fromEntries(
    rule.split(';').flatMap((part) => {
      const [rawKey, ...rawValue] = part.split('=');
      const key = rawKey?.trim().toUpperCase();
      const parsed = rawValue.join('=').trim();
      return key && parsed ? [[key, parsed] as const] : [];
    }),
  );
}

function parseNaturalRepeatRule(
  value: string | undefined,
  warnings: string[],
): Record<string, string> {
  const label = (value ?? '').trim();
  if (!label || /(?:^|;)FREQ=/i.test(label)) return {};
  const compact = label.replace(/\s+/g, '');

  if (/\d+~\d+일마다/.test(compact)) {
    warnings.push('ambiguous_natural_repeat_range_not_projected');
    return {};
  }

  const explicitWeekdays = label
    .split(/[\s,/·]+/)
    .flatMap((part) => {
      const normalized = part.replace(/요일$/, '');
      const weekday = KOREAN_WEEKDAY_TO_ISO[normalized];
      return weekday ? [weekday] : [];
    });
  const byday = Array.from(new Set(explicitWeekdays)).join(',');

  const monthInterval = compact.match(/(\d+)개월마다/);
  if (monthInterval || /매월|월\d+회/.test(compact)) {
    return {
      FREQ: 'MONTHLY',
      ...(monthInterval ? { INTERVAL: monthInterval[1] } : {}),
    };
  }

  const weekInterval = compact.match(/(\d+)주마다/);
  if (weekInterval || /매주|주\d+회|주마다/.test(compact)) {
    return {
      FREQ: 'WEEKLY',
      ...(weekInterval ? { INTERVAL: weekInterval[1] } : {}),
      ...(byday ? { BYDAY: byday } : {}),
    };
  }

  const dayInterval = compact.match(/(\d+)일마다/);
  if (dayInterval || /매일|하루/.test(compact)) {
    return {
      FREQ: 'DAILY',
      ...(dayInterval ? { INTERVAL: dayInterval[1] } : {}),
    };
  }

  return {};
}

function parseFrequency(
  fields: Record<string, string>,
  repeatPreset?: string,
): PersonalStructuralRecurrenceRule['frequency'] | undefined {
  const preset = repeatPreset?.trim().toLowerCase();
  if (preset === 'daily' || preset === 'weekly' || preset === 'monthly') return preset;
  const frequency = fields.FREQ?.toLowerCase();
  return frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly'
    ? frequency
    : undefined;
}

function parseInterval(value: string | undefined, warnings: string[]): number {
  if (!value) return 1;
  const interval = Number(value);
  if (Number.isInteger(interval) && interval >= 1 && interval <= 365) return interval;
  warnings.push('invalid_saved_routine_interval_defaulted');
  return 1;
}

function normalizeWeekdays(values: string[] | undefined): PersonalStructuralWeekday[] {
  return Array.from(
    new Set(
      (values ?? []).flatMap((value) => {
        const normalized = value.trim().toUpperCase();
        if (ISO_WEEKDAYS.has(normalized as PersonalStructuralWeekday)) {
          return [normalized as PersonalStructuralWeekday];
        }
        const korean = KOREAN_WEEKDAY_TO_ISO[value.trim()];
        return korean ? [korean] : [];
      }),
    ),
  );
}

function parseUntil(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})(?:T\d{6}Z?)?$/);
  const date = compact
    ? `${compact[1]}-${compact[2]}-${compact[3]}`
    : value.slice(0, 10);
  return isPlainDate(date) ? date : undefined;
}

function addPlainDateDays(value: string, days: number): string | undefined {
  if (!isPlainDate(value) || !Number.isInteger(days)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function resolveEnd(
  fields: Record<string, string>,
  endDate: string | undefined,
  occurrenceCount: number | undefined,
  startDate: string,
  projectionWeeks: number | undefined,
  warnings: string[],
): PersonalStructuralRecurrenceEnd | undefined {
  if (isPlainDate(endDate)) return { mode: 'until', date: endDate };
  if (endDate) warnings.push('invalid_saved_routine_end_date_ignored');
  if (occurrenceCount !== undefined) {
    if (Number.isInteger(occurrenceCount) && occurrenceCount >= 1 && occurrenceCount <= 10_000) {
      return { mode: 'count', count: occurrenceCount };
    }
    warnings.push('invalid_saved_routine_occurrence_count_ignored');
  }
  const until = parseUntil(fields.UNTIL);
  if (fields.UNTIL && !until) warnings.push('invalid_saved_routine_until_ignored');
  if (until) return { mode: 'until', date: until };
  const count = Number(fields.COUNT);
  if (fields.COUNT && (!Number.isInteger(count) || count < 1 || count > 10_000)) {
    warnings.push('invalid_saved_routine_count_ignored');
  }
  if (Number.isInteger(count) && count >= 1 && count <= 10_000) {
    return { mode: 'count', count };
  }
  if (projectionWeeks !== undefined) {
    if (!Number.isInteger(projectionWeeks) || projectionWeeks < 1 || projectionWeeks > 52) {
      warnings.push('invalid_saved_routine_projection_weeks_ignored');
      return undefined;
    }
    const projectedEndDate = addPlainDateDays(startDate, projectionWeeks * 7 - 1);
    if (projectedEndDate) return { mode: 'until', date: projectedEndDate };
  }
  return undefined;
}

function buildSeriesId(identityNamespace: string, itemId: string): string {
  return `saved-routine:${encodeURIComponent(identityNamespace.trim())}:${encodeURIComponent(itemId.trim())}`;
}

export function resolveSavedRoutineRecurrence(
  definition: SavedRoutineRecurrenceDefinition,
  identityNamespace: string,
): SavedRoutineRecurrenceResolution {
  const warnings: string[] = [];
  if (!identityNamespace.trim() || !definition.itemId.trim() || !isPlainDate(definition.startDate)) {
    return { warnings: ['invalid_saved_routine_identity_or_start'] };
  }
  const rruleFields = parseRrule(definition.sourceRepeatRule);
  const fields = rruleFields.FREQ
    ? rruleFields
    : parseNaturalRepeatRule(definition.sourceRepeatRule, warnings);
  const frequency = parseFrequency(fields, definition.repeatPreset);
  if (!frequency) return { warnings };
  const interval = parseInterval(fields.INTERVAL, warnings);
  const end = resolveEnd(
    fields,
    definition.endDate,
    definition.occurrenceCount,
    definition.startDate,
    definition.projectionWeeks,
    warnings,
  );
  const rule: PersonalStructuralRecurrenceRule = {
    frequency,
    interval,
    ...(end ? { end } : {}),
  };
  if (frequency === 'weekly') {
    const selectedWeekdays = normalizeWeekdays(definition.selectedWeekdays);
    const sourceWeekdays = normalizeWeekdays(fields.BYDAY?.split(','));
    rule.weekdays = selectedWeekdays.length > 0
      ? selectedWeekdays
      : sourceWeekdays.length > 0
        ? sourceWeekdays
        : [getWeekday(definition.startDate)];
  }
  if (frequency === 'monthly') {
    const sourceMonthDay = Number(fields.BYMONTHDAY);
    rule.dayOfMonth = Number.isInteger(sourceMonthDay) && sourceMonthDay >= 1 && sourceMonthDay <= 31
      ? sourceMonthDay
      : Number(definition.startDate.slice(8, 10));
    rule.invalidMonthDayPolicy = 'skip';
  }
  const seriesId = buildSeriesId(identityNamespace, definition.itemId);
  const revisionId = `${seriesId}:revision:1:${definition.startDate}`;
  const updatedAt = definition.updatedAt && Number.isFinite(Date.parse(definition.updatedAt))
    ? definition.updatedAt
    : new Date(0).toISOString();
  return {
    series: {
      schemaVersion: 1,
      seriesId,
      status: 'active',
      revisions: [
        {
          revision: 1,
          revisionId,
          effectiveFrom: definition.startDate,
          rule,
          ...((definition.time || definition.durationMinutes || definition.timeZone)
            ? {
                scheduleTemplate: {
                  ...(definition.time ? { time: definition.time } : {}),
                  ...(definition.time && definition.durationMinutes
                    ? { durationMinutes: definition.durationMinutes }
                    : {}),
                  ...(definition.time && definition.timeZone
                    ? { timeZone: definition.timeZone }
                    : {}),
                },
              }
            : {}),
          updatedAt,
        },
      ],
      occurrenceOverrides: [],
      updatedAt,
    },
    warnings,
  };
}

export function expandSavedRoutineOccurrenceRows<TRow extends SavedRoutineOccurrenceRow>(options: {
  identityNamespace: string;
  rows: TRow[];
  definitions: Record<string, SavedRoutineRecurrenceDefinition | undefined>;
  range: { start: string; end: string };
  executionRecords?: PersonalStructuralOccurrenceExecutionRecord[];
  resolveOccurrenceDate?: (input: {
    itemId: string;
    originalDate: string;
  }) => SavedRoutineOccurrenceDateResolution;
}): TRow[] {
  return options.rows.flatMap((row) => {
    if (row.structuralOccurrenceId) return [row];
    const definition = options.definitions[row.id];
    if (!definition) return [row];
    const recurrence = resolveSavedRoutineRecurrence(definition, options.identityNamespace);
    if (!recurrence.series) return [row];
    const schedule: PersonalStructuralSchedule = {
      mode: 'fixed_date',
      date: definition.startDate,
      ...(definition.time ? { time: definition.time } : {}),
      ...(definition.time && definition.durationMinutes
        ? { durationMinutes: definition.durationMinutes }
        : {}),
      ...(definition.time && definition.timeZone ? { timeZone: definition.timeZone } : {}),
      repeat: recurrence.series,
    };
    const projection = generatePersonalStructuralOccurrences({
      identityNamespace: options.identityNamespace,
      itemId: definition.itemId,
      schedule,
      range: options.range,
      executionRecords: options.executionRecords,
      fallbackTimestamp: recurrence.series.updatedAt,
    });
    return projection.projectedOccurrences.map((occurrence, index) => {
      const dateResolution = options.resolveOccurrenceDate?.({
        itemId: definition.itemId,
        originalDate: occurrence.originalDate,
      });
      const date = dateResolution?.date ?? occurrence.localDate;
      const scheduleProjection = date === occurrence.localDate
        ? occurrence.scheduleProjection
        : buildPersonalStructuralScheduleProjection({
            identityNamespace: options.identityNamespace,
            itemId: definition.itemId,
            schedule: {
              mode: 'fixed_date',
              date,
              ...(occurrence.scheduleProjection.startTime
                ? { time: occurrence.scheduleProjection.startTime }
                : {}),
              ...(occurrence.scheduleProjection.startTime && occurrence.scheduleProjection.durationMinutes
                ? { durationMinutes: occurrence.scheduleProjection.durationMinutes }
                : {}),
              ...(occurrence.scheduleProjection.startTime && occurrence.scheduleProjection.timeZone
                ? { timeZone: occurrence.scheduleProjection.timeZone }
                : {}),
            },
          });
      return {
        ...row,
        date,
        timing: `${index + 1}회차`,
        structuralScheduleProjection: scheduleProjection,
        structuralRepeat: recurrence.series,
        structuralOccurrenceId: occurrence.occurrenceId,
        structuralOccurrenceSeriesId: occurrence.seriesId,
        structuralOccurrenceRevisionId: occurrence.revisionId,
        structuralOccurrenceOriginalDate: occurrence.originalDate,
        structuralOccurrenceExecutionState: occurrence.executionState,
        structuralOccurrenceOrigin: 'saved_routine',
        ...(dateResolution?.overrideKey
          ? { structuralOccurrenceDateOverrideKey: dateResolution.overrideKey }
          : {}),
      } as TRow;
    });
  });
}
