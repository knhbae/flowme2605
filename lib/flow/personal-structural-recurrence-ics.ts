import { foldIcsContentLine } from './ics';
import {
  generatePersonalStructuralOccurrences,
} from './personal-structural-occurrence';
import type { PersonalStructuralSchedule } from './personal-structural-overlay';
import {
  normalizePersonalStructuralRecurrence,
  type PersonalStructuralRecurrenceOccurrenceSchedule,
  type PersonalStructuralRecurrenceRevision,
  type PersonalStructuralRecurrenceRule,
  type PersonalStructuralRecurrenceSeries,
  type PersonalStructuralRepeat,
} from './personal-structural-recurrence';
import {
  PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES,
  buildPersonalStructuralScheduleProjection,
  isPersonalStructuralIanaTimeZone,
  type PersonalStructuralScheduleProjection,
} from './personal-structural-schedule';

export type PersonalStructuralRecurrenceIcsInput = {
  identityNamespace: string;
  itemId: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
  repeat: PersonalStructuralRepeat;
  location?: string;
  sourceUrl?: string;
  generatedAt?: string;
  finiteRangeEnd?: string;
  finiteOccurrenceLimit?: number;
};

export type PersonalStructuralRecurrenceIcsResult = {
  ics: string;
  mode: 'rrule' | 'finite_events';
  uid: string;
  eventCount: number;
  exceptionEventCount: number;
  excludedOccurrenceCount: number;
  warnings: string[];
};

type RecurrenceSlot = {
  date: string;
  time?: string;
};

function clean(value?: string): string {
  return (value ?? '').trim();
}

function compactDate(value: string): string {
  return value.replaceAll('-', '');
}

function compactTime(value: string): string {
  return value.replace(':', '');
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(/\r?\n/g, '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function addDays(date: string, amount: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + amount));
  return value.toISOString().slice(0, 10);
}

function addYears(date: string, amount: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const targetYear = year + amount;
  const maxDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return `${String(targetYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;
}

function formatTimestamp(value?: string): string {
  const date = value && Number.isFinite(Date.parse(value)) ? new Date(value) : new Date();
  return date.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
}

function toUid(value: string): string {
  return `${clean(value).replaceAll(/[^a-zA-Z0-9._:%-]+/g, '-') || 'calendar-event'}@flowme.local`;
}

function parseOccurrenceSlot(occurrenceId: string): RecurrenceSlot | undefined {
  const marker = ':occurrence:';
  const markerIndex = occurrenceId.lastIndexOf(marker);
  if (markerIndex < 0) return undefined;
  const value = occurrenceId.slice(markerIndex + marker.length);
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(all-day|\d{2}:\d{2})$/);
  if (!match) return undefined;
  return {
    date: match[1],
    ...(match[2] !== 'all-day' ? { time: match[2] } : {}),
  };
}

function buildScheduleProjection(options: {
  identityNamespace: string;
  itemId: string;
  schedule: PersonalStructuralRecurrenceOccurrenceSchedule;
}): PersonalStructuralScheduleProjection {
  return buildPersonalStructuralScheduleProjection({
    identityNamespace: options.identityNamespace,
    itemId: options.itemId,
    schedule: {
      mode: 'fixed_date',
      date: options.schedule.date,
      ...(options.schedule.time ? { time: options.schedule.time } : {}),
      ...(options.schedule.time && options.schedule.durationMinutes
        ? { durationMinutes: options.schedule.durationMinutes }
        : {}),
      ...(options.schedule.time && options.schedule.timeZone
        ? { timeZone: options.schedule.timeZone }
        : {}),
    },
  });
}

function buildDateProperty(
  name: 'DTSTART' | 'DTEND' | 'RECURRENCE-ID' | 'EXDATE',
  slot: RecurrenceSlot,
  timeZone?: string,
): string {
  if (!slot.time) return `${name};VALUE=DATE:${compactDate(slot.date)}`;
  const parameter = isPersonalStructuralIanaTimeZone(timeZone)
    ? `;TZID=${timeZone.trim()}`
    : '';
  return `${name}${parameter}:${compactDate(slot.date)}T${compactTime(slot.time)}00`;
}

function buildProjectionDateLines(projection: PersonalStructuralScheduleProjection): string[] {
  if (projection.scheduleState === 'timed' && projection.calendarDate && projection.startTime) {
    return [
      buildDateProperty('DTSTART', {
        date: projection.calendarDate,
        time: projection.startTime,
      }, projection.timeZone),
      buildDateProperty('DTEND', {
        date: projection.endDate ?? projection.calendarDate,
        time: projection.endTime ?? projection.startTime,
      }, projection.timeZone),
    ];
  }
  if (!projection.calendarDate) return [];
  return [
    buildDateProperty('DTSTART', { date: projection.calendarDate }),
    buildDateProperty('DTEND', {
      date: projection.endDate ?? addDays(projection.calendarDate, 1),
    }),
  ];
}

function buildRule(rule: PersonalStructuralRecurrenceRule, timed: boolean): string | undefined {
  if (timed && rule.end?.mode === 'until') return undefined;
  const parts = [`FREQ=${rule.frequency.toUpperCase()}`];
  if (rule.interval > 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.frequency === 'weekly' && rule.weekdays?.length) {
    parts.push(`BYDAY=${rule.weekdays.join(',')}`);
  }
  if (rule.frequency === 'monthly' && rule.dayOfMonth) {
    parts.push(`BYMONTHDAY=${rule.dayOfMonth}`);
  }
  if (rule.end?.mode === 'count') parts.push(`COUNT=${rule.end.count}`);
  if (rule.end?.mode === 'until') parts.push(`UNTIL=${compactDate(rule.end.date)}`);
  return parts.join(';');
}

function buildEventLines(options: {
  uid: string;
  timestamp: string;
  title: string;
  description: string;
  projection: PersonalStructuralScheduleProjection;
  rrule?: string;
  recurrenceId?: RecurrenceSlot;
  recurrenceTimeZone?: string;
  exdates?: Array<{ slot: RecurrenceSlot; timeZone?: string }>;
  location?: string;
  sourceUrl?: string;
}): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(options.uid)}`,
    `DTSTAMP:${options.timestamp}`,
  ];
  if (options.recurrenceId) {
    lines.push(buildDateProperty(
      'RECURRENCE-ID',
      options.recurrenceId,
      options.recurrenceTimeZone,
    ));
  }
  lines.push(...buildProjectionDateLines(options.projection));
  if (options.rrule) lines.push(`RRULE:${options.rrule}`);
  options.exdates?.forEach((entry) => {
    lines.push(buildDateProperty('EXDATE', entry.slot, entry.timeZone));
  });
  lines.push(
    `SUMMARY:${escapeIcsText(clean(options.title) || '할 일')}`,
    `DESCRIPTION:${escapeIcsText(options.description)}`,
  );
  if (clean(options.location)) lines.push(`LOCATION:${escapeIcsText(clean(options.location))}`);
  if (clean(options.sourceUrl)) lines.push(`URL:${clean(options.sourceUrl)}`);
  lines.push('END:VEVENT');
  return lines;
}

function wrapCalendar(lines: string[]): string {
  return `${[
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FlowMe//Personal Calendar Export//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...lines,
    'END:VCALENDAR',
  ].map(foldIcsContentLine).join('\r\n')}\r\n`;
}

function getRevisionSchedule(
  revision: PersonalStructuralRecurrenceRevision,
  input: PersonalStructuralRecurrenceIcsInput,
): PersonalStructuralRecurrenceOccurrenceSchedule {
  const time = revision.scheduleTemplate?.time ?? (clean(input.time) || undefined);
  return {
    date: revision.effectiveFrom,
    ...(time ? { time } : {}),
    ...(time
      ? {
          durationMinutes:
            revision.scheduleTemplate?.durationMinutes ??
            input.durationMinutes ??
            PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES,
        }
      : {}),
    ...(time && (revision.scheduleTemplate?.timeZone ?? input.timeZone)
      ? { timeZone: revision.scheduleTemplate?.timeZone ?? input.timeZone }
      : {}),
  };
}

function canUseSingleRrule(
  series: PersonalStructuralRecurrenceSeries,
  input: PersonalStructuralRecurrenceIcsInput,
): boolean {
  if (series.status !== 'active' || series.revisions.length !== 1) return false;
  const revisionSchedule = getRevisionSchedule(series.revisions[0], input);
  return Boolean(buildRule(series.revisions[0].rule, Boolean(revisionSchedule.time)));
}

function buildRruleCalendar(
  series: PersonalStructuralRecurrenceSeries,
  input: PersonalStructuralRecurrenceIcsInput,
  warnings: string[],
): PersonalStructuralRecurrenceIcsResult {
  const revision = series.revisions[0];
  const schedule = getRevisionSchedule(revision, input);
  const projection = buildScheduleProjection({
    identityNamespace: input.identityNamespace,
    itemId: input.itemId,
    schedule,
  });
  const rrule = buildRule(revision.rule, Boolean(schedule.time));
  if (!rrule) throw new Error('The recurrence rule cannot be represented as one RRULE.');
  const timestamp = formatTimestamp(input.generatedAt);
  const uid = toUid(series.seriesId);
  const excludedSlots: Array<{ slot: RecurrenceSlot; timeZone?: string }> = [];
  const exceptionLines: string[] = [];
  let exceptionEventCount = 0;
  const seenOverrides = new Set<string>();

  series.occurrenceOverrides.forEach((override) => {
    if (seenOverrides.has(override.occurrenceId)) return;
    seenOverrides.add(override.occurrenceId);
    if (!override.occurrenceId.startsWith(`${revision.revisionId}:occurrence:`)) {
      warnings.push(`ignored_override_from_other_revision:${override.occurrenceId}`);
      return;
    }
    const originalSlot = parseOccurrenceSlot(override.occurrenceId);
    if (!originalSlot) {
      warnings.push(`invalid_occurrence_override_id:${override.occurrenceId}`);
      return;
    }
    if (override.mode === 'exclude') {
      excludedSlots.push({
        slot: originalSlot,
        ...(schedule.timeZone ? { timeZone: schedule.timeZone } : {}),
      });
      return;
    }
    if (!override.schedule) {
      warnings.push(`missing_reschedule_override:${override.occurrenceId}`);
      return;
    }
    const overrideProjection = buildScheduleProjection({
      identityNamespace: input.identityNamespace,
      itemId: input.itemId,
      schedule: override.schedule,
    });
    if (!overrideProjection.calendarDate) {
      warnings.push(`invalid_reschedule_override:${override.occurrenceId}`);
      return;
    }
    exceptionLines.push(...buildEventLines({
      uid,
      timestamp,
      title: input.title,
      description: input.description,
      projection: overrideProjection,
      recurrenceId: originalSlot,
      recurrenceTimeZone: schedule.timeZone,
      location: input.location,
      sourceUrl: input.sourceUrl,
    }));
    exceptionEventCount += 1;
  });

  const masterLines = buildEventLines({
    uid,
    timestamp,
    title: input.title,
    description: input.description,
    projection,
    rrule,
    exdates: excludedSlots,
    location: input.location,
    sourceUrl: input.sourceUrl,
  });
  return {
    ics: wrapCalendar([...masterLines, ...exceptionLines]),
    mode: 'rrule',
    uid,
    eventCount: 1 + exceptionEventCount,
    exceptionEventCount,
    excludedOccurrenceCount: excludedSlots.length,
    warnings,
  };
}

function buildFiniteCalendar(
  series: PersonalStructuralRecurrenceSeries,
  input: PersonalStructuralRecurrenceIcsInput,
  warnings: string[],
): PersonalStructuralRecurrenceIcsResult {
  const start = series.revisions[0].effectiveFrom;
  const end = input.finiteRangeEnd ?? addYears(start, 5);
  const schedule: PersonalStructuralSchedule = {
    mode: 'fixed_date',
    date: input.date,
    ...(clean(input.time) ? { time: clean(input.time) } : {}),
    ...(clean(input.time) && input.durationMinutes
      ? { durationMinutes: input.durationMinutes }
      : {}),
    ...(clean(input.time) && input.timeZone ? { timeZone: input.timeZone } : {}),
    repeat: series,
  };
  const generated = generatePersonalStructuralOccurrences({
    identityNamespace: input.identityNamespace,
    itemId: input.itemId,
    schedule,
    range: { start, end },
    maxOccurrences: input.finiteOccurrenceLimit ?? 1_000,
    fallbackTimestamp: input.generatedAt,
  });
  warnings.push(...generated.warnings);
  if (generated.generationLimitReached) warnings.push('finite_ics_generation_limit_reached');
  const timestamp = formatTimestamp(input.generatedAt);
  const eventLines = generated.projectedOccurrences.flatMap((occurrence) =>
    buildEventLines({
      uid: toUid(occurrence.occurrenceId),
      timestamp,
      title: input.title,
      description: input.description,
      projection: occurrence.scheduleProjection,
      location: input.location,
      sourceUrl: input.sourceUrl,
    }),
  );
  return {
    ics: wrapCalendar(eventLines),
    mode: 'finite_events',
    uid: toUid(series.seriesId),
    eventCount: generated.projectedOccurrences.length,
    exceptionEventCount: generated.projectedOccurrences.filter(
      (occurrence) => occurrence.occurrenceOverrideApplied,
    ).length,
    excludedOccurrenceCount: Math.max(
      0,
      generated.occurrences.length - generated.projectedOccurrences.length,
    ),
    warnings,
  };
}

export function buildPersonalStructuralRecurrenceIcs(
  input: PersonalStructuralRecurrenceIcsInput,
): PersonalStructuralRecurrenceIcsResult {
  const normalized = normalizePersonalStructuralRecurrence({
    value: input.repeat,
    identityNamespace: input.identityNamespace,
    itemId: input.itemId,
    startDate: input.date,
    time: input.time,
    durationMinutes: input.durationMinutes,
    timeZone: input.timeZone,
    fallbackTimestamp: input.generatedAt,
  });
  if (!normalized.series) {
    throw new Error('A valid personal recurrence series is required.');
  }
  const warnings = [...normalized.warnings];
  return canUseSingleRrule(normalized.series, input)
    ? buildRruleCalendar(normalized.series, input, warnings)
    : buildFiniteCalendar(normalized.series, input, warnings);
}
