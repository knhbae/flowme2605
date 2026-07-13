import type { PersonalStructuralSchedule } from './personal-structural-overlay';
import {
  buildPersonalStructuralOccurrenceId,
  buildPersonalStructuralRecurrenceRevisionId,
  buildPersonalStructuralRecurrenceSeriesId,
  normalizePersonalStructuralRecurrence,
  type PersonalStructuralRecurrenceRevision,
  type PersonalStructuralRecurrenceSeries,
  type PersonalStructuralWeekday,
} from './personal-structural-recurrence';
import {
  buildPersonalStructuralScheduleProjection,
  isPersonalStructuralPlainDate,
  type PersonalStructuralScheduleProjection,
} from './personal-structural-schedule';

export const PERSONAL_STRUCTURAL_OCCURRENCE_DEFAULT_LIMIT = 512;
export const PERSONAL_STRUCTURAL_OCCURRENCE_MAX_LIMIT = 1_000;
const PERSONAL_STRUCTURAL_OCCURRENCE_MAX_SCAN = 100_000;

export type PersonalStructuralOccurrenceExecutionState =
  | 'pending'
  | 'done'
  | 'reopened'
  | 'skipped'
  | 'held';

export type PersonalStructuralOccurrenceExecutionTransition = {
  from: PersonalStructuralOccurrenceExecutionState;
  to: PersonalStructuralOccurrenceExecutionState;
  at: string;
};

export type PersonalStructuralOccurrenceExecutionRecord = {
  occurrenceId: string;
  seriesId: string;
  revisionId: string;
  state: PersonalStructuralOccurrenceExecutionState;
  updatedAt: string;
  completedAt?: string;
  reopenedAt?: string;
  skippedAt?: string;
  heldAt?: string;
  history: PersonalStructuralOccurrenceExecutionTransition[];
};

export type PersonalStructuralOccurrence = {
  itemId: string;
  seriesId: string;
  revisionId: string;
  occurrenceId: string;
  originalDate: string;
  localDate: string;
  scheduleProjection: PersonalStructuralScheduleProjection;
  personalOrderRank: number;
  executionState: PersonalStructuralOccurrenceExecutionState;
  projectionEligibility: {
    calendarScreen: boolean;
    calendarIcs: boolean;
  };
  occurrenceOverrideApplied: boolean;
  validationWarnings: string[];
};

export type PersonalStructuralOccurrenceProjectionResult = {
  series?: PersonalStructuralRecurrenceSeries;
  occurrences: PersonalStructuralOccurrence[];
  projectedOccurrences: PersonalStructuralOccurrence[];
  executionRecords: PersonalStructuralOccurrenceExecutionRecord[];
  warnings: string[];
  generationLimitReached: boolean;
};

type ProjectionRange = { start: string; end: string };

function dateToUtcDay(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function utcDayToDate(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

function addDays(date: string, amount: number): string {
  return utcDayToDate(dateToUtcDay(date) + amount);
}

function daysBetween(left: string, right: string): number {
  return dateToUtcDay(right) - dateToUtcDay(left);
}

function getWeekday(date: string): PersonalStructuralWeekday {
  const weekdays: PersonalStructuralWeekday[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const [year, month, day] = date.split('-').map(Number);
  return weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function getMonday(date: string): string {
  const weekday = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].indexOf(getWeekday(date));
  return addDays(date, -weekday);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthCandidate(
  effectiveFrom: string,
  monthOffset: number,
  dayOfMonth: number,
): string | undefined {
  const [year, month] = effectiveFrom.split('-').map(Number);
  const absoluteMonth = year * 12 + (month - 1) + monthOffset;
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonthIndex = absoluteMonth % 12;
  if (dayOfMonth > daysInMonth(targetYear, targetMonthIndex + 1)) return undefined;
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonthIndex + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
}

function earlierDate(left: string, right: string): string {
  return left.localeCompare(right) <= 0 ? left : right;
}

function getRevisionEnd(
  revisions: PersonalStructuralRecurrenceRevision[],
  index: number,
  fallbackEnd: string,
): string {
  const next = revisions[index + 1];
  return next ? earlierDate(addDays(next.effectiveFrom, -1), fallbackEnd) : fallbackEnd;
}

function getOriginalDateFromOccurrenceId(occurrenceId: string): string | undefined {
  const match = occurrenceId.match(/:occurrence:(\d{4}-\d{2}-\d{2})T/);
  return match && isPersonalStructuralPlainDate(match[1]) ? match[1] : undefined;
}

function normalizeRange(value: ProjectionRange): ProjectionRange | undefined {
  if (
    !isPersonalStructuralPlainDate(value.start) ||
    !isPersonalStructuralPlainDate(value.end) ||
    value.start > value.end
  ) {
    return undefined;
  }
  return value;
}

function getCandidateDates(options: {
  revision: PersonalStructuralRecurrenceRevision;
  end: string;
  maxScan: number;
}): { dates: string[]; scanLimitReached: boolean } {
  const { revision } = options;
  const dates: string[] = [];
  const endRule = revision.rule.end;
  const ruleEnd = endRule?.mode === 'until'
    ? earlierDate(options.end, endRule.date)
    : options.end;
  const countLimit = endRule?.mode === 'count' ? endRule.count : Number.POSITIVE_INFINITY;
  let generatedCount = 0;
  let scanCount = 0;

  if (revision.rule.frequency === 'daily') {
    let date = revision.effectiveFrom;
    while (date <= ruleEnd && generatedCount < countLimit && scanCount < options.maxScan) {
      dates.push(date);
      generatedCount += 1;
      scanCount += 1;
      date = addDays(date, revision.rule.interval);
    }
    return { dates, scanLimitReached: scanCount >= options.maxScan && date <= ruleEnd };
  }

  if (revision.rule.frequency === 'weekly') {
    const weekdays = revision.rule.weekdays ?? [getWeekday(revision.effectiveFrom)];
    const firstMonday = getMonday(revision.effectiveFrom);
    let date = revision.effectiveFrom;
    while (date <= ruleEnd && generatedCount < countLimit && scanCount < options.maxScan) {
      const weekIndex = Math.floor(daysBetween(firstMonday, getMonday(date)) / 7);
      if (weekIndex % revision.rule.interval === 0 && weekdays.includes(getWeekday(date))) {
        dates.push(date);
        generatedCount += 1;
      }
      scanCount += 1;
      date = addDays(date, 1);
    }
    return { dates, scanLimitReached: scanCount >= options.maxScan && date <= ruleEnd };
  }

  const dayOfMonth = revision.rule.dayOfMonth ?? Number(revision.effectiveFrom.slice(8, 10));
  let monthOffset = 0;
  while (generatedCount < countLimit && scanCount < options.maxScan) {
    const candidate = monthCandidate(
      revision.effectiveFrom,
      monthOffset,
      dayOfMonth,
    );
    const nextMonthStart = monthCandidate(revision.effectiveFrom, monthOffset, 1);
    if (!nextMonthStart || nextMonthStart > ruleEnd) break;
    if (candidate && candidate >= revision.effectiveFrom && candidate <= ruleEnd) {
      dates.push(candidate);
      generatedCount += 1;
    }
    scanCount += 1;
    monthOffset += revision.rule.interval;
  }
  return {
    dates,
    scanLimitReached: scanCount >= options.maxScan,
  };
}

function compareOccurrences(
  left: PersonalStructuralOccurrence,
  right: PersonalStructuralOccurrence,
): number {
  const stateRank = (state: PersonalStructuralScheduleProjection['scheduleState']) =>
    state === 'all_day' ? 0 : state === 'timed' ? 1 : 2;
  return (
    left.localDate.localeCompare(right.localDate) ||
    stateRank(left.scheduleProjection.scheduleState) -
      stateRank(right.scheduleProjection.scheduleState) ||
    (left.scheduleProjection.startTime ?? '').localeCompare(
      right.scheduleProjection.startTime ?? '',
    ) ||
    left.personalOrderRank - right.personalOrderRank ||
    left.occurrenceId.localeCompare(right.occurrenceId)
  );
}

export function normalizePersonalStructuralOccurrenceExecutionRecords(
  value: PersonalStructuralOccurrenceExecutionRecord[] | undefined,
): PersonalStructuralOccurrenceExecutionRecord[] {
  if (!value) return [];
  const byOccurrence = new Map<string, PersonalStructuralOccurrenceExecutionRecord>();
  value.forEach((entry) => {
    if (
      !entry?.occurrenceId ||
      !entry.seriesId ||
      !entry.revisionId ||
      !['pending', 'done', 'reopened', 'skipped', 'held'].includes(entry.state) ||
      !Number.isFinite(Date.parse(entry.updatedAt))
    ) {
      return;
    }
    byOccurrence.set(entry.occurrenceId, {
      ...entry,
      history: Array.isArray(entry.history) ? [...entry.history] : [],
    });
  });
  return [...byOccurrence.values()];
}

function buildSingleOccurrenceSeries(options: {
  identityNamespace: string;
  itemId: string;
  date: string;
  updatedAt: string;
}): PersonalStructuralRecurrenceSeries {
  const seriesId = buildPersonalStructuralRecurrenceSeriesId(options);
  const revisionId = buildPersonalStructuralRecurrenceRevisionId({
    seriesId,
    revision: 1,
    effectiveFrom: options.date,
  });
  return {
    schemaVersion: 1,
    seriesId,
    status: 'active',
    revisions: [
      {
        revision: 1,
        revisionId,
        effectiveFrom: options.date,
        rule: { frequency: 'daily', interval: 1, end: { mode: 'count', count: 1 } },
        updatedAt: options.updatedAt,
      },
    ],
    occurrenceOverrides: [],
    updatedAt: options.updatedAt,
  };
}

export function generatePersonalStructuralOccurrences(options: {
  identityNamespace: string;
  itemId: string;
  schedule: PersonalStructuralSchedule | undefined;
  repeatPreset?: unknown;
  range: ProjectionRange;
  personalOrderRank?: number;
  included?: boolean;
  tombstoned?: boolean;
  executionRecords?: PersonalStructuralOccurrenceExecutionRecord[];
  fallbackTimestamp?: string;
  maxOccurrences?: number;
}): PersonalStructuralOccurrenceProjectionResult {
  const warnings: string[] = [];
  const executionRecords = normalizePersonalStructuralOccurrenceExecutionRecords(
    options.executionRecords,
  );
  const range = normalizeRange(options.range);
  if (!range) {
    return {
      occurrences: [],
      projectedOccurrences: [],
      executionRecords,
      warnings: ['invalid_occurrence_projection_range'],
      generationLimitReached: false,
    };
  }
  const scheduleProjection = buildPersonalStructuralScheduleProjection({
    schedule: options.schedule,
    identityNamespace: options.identityNamespace,
    itemId: options.itemId,
  });
  if (
    !options.schedule ||
    options.schedule.mode !== 'fixed_date' ||
    !scheduleProjection.calendarDate
  ) {
    return {
      occurrences: [],
      projectedOccurrences: [],
      executionRecords,
      warnings: [...scheduleProjection.validationWarnings, 'recurrence_requires_fixed_date'],
      generationLimitReached: false,
    };
  }
  const fallbackTimestamp = options.fallbackTimestamp ?? new Date().toISOString();
  const recurrence = normalizePersonalStructuralRecurrence({
    value: options.schedule.repeat,
    repeatPreset: options.repeatPreset,
    identityNamespace: options.identityNamespace,
    itemId: options.itemId,
    startDate: scheduleProjection.calendarDate,
    time: options.schedule.time,
    durationMinutes: options.schedule.durationMinutes,
    timeZone: options.schedule.timeZone,
    fallbackTimestamp,
  });
  warnings.push(...recurrence.warnings);
  const series = recurrence.series ?? buildSingleOccurrenceSeries({
    identityNamespace: options.identityNamespace,
    itemId: options.itemId,
    date: scheduleProjection.calendarDate,
    updatedAt: fallbackTimestamp,
  });
  const repeatIsAbsent = !recurrence.series;
  const maxOccurrences = Math.min(
    Math.max(options.maxOccurrences ?? PERSONAL_STRUCTURAL_OCCURRENCE_DEFAULT_LIMIT, 1),
    PERSONAL_STRUCTURAL_OCCURRENCE_MAX_LIMIT,
  );
  const overrideOriginalDates = series.occurrenceOverrides
    .map((entry) => getOriginalDateFromOccurrenceId(entry.occurrenceId))
    .filter((date): date is string => Boolean(date));
  const generationEnd = overrideOriginalDates.reduce(
    (end, date) => (date > end ? date : end),
    range.end,
  );
  const statusEnd =
    series.status === 'active'
      ? generationEnd
      : series.statusEffectiveFrom
        ? addDays(series.statusEffectiveFrom, -1)
        : addDays(series.revisions[0].effectiveFrom, -1);
  const revisionRows: Array<{
    revision: PersonalStructuralRecurrenceRevision;
    date: string;
  }> = [];
  let generationLimitReached = false;
  const revisions = [...series.revisions].sort((left, right) =>
    left.effectiveFrom.localeCompare(right.effectiveFrom),
  );
  revisions.forEach((revision, index) => {
    if (revision.effectiveFrom > statusEnd) return;
    const revisionEnd = getRevisionEnd(revisions, index, statusEnd);
    const generated = getCandidateDates({
      revision,
      end: revisionEnd,
      maxScan: PERSONAL_STRUCTURAL_OCCURRENCE_MAX_SCAN,
    });
    if (generated.scanLimitReached) {
      generationLimitReached = true;
      warnings.push(`occurrence_scan_limit_reached:${revision.revisionId}`);
    }
    generated.dates.forEach((date) => revisionRows.push({ revision, date }));
  });

  const overrideByOccurrence = new Map(
    series.occurrenceOverrides.map((entry) => [entry.occurrenceId, entry]),
  );
  const executionByOccurrence = new Map(
    executionRecords.map((entry) => [entry.occurrenceId, entry]),
  );
  const seenOccurrenceIds = new Set<string>();
  const occurrences: PersonalStructuralOccurrence[] = [];
  for (const entry of revisionRows) {
    const template = entry.revision.scheduleTemplate;
    const startTime = template?.time ?? options.schedule.time;
    const occurrenceId = buildPersonalStructuralOccurrenceId({
      revisionId: entry.revision.revisionId,
      scheduledDate: entry.date,
      ...(startTime ? { startTime } : {}),
    });
    if (seenOccurrenceIds.has(occurrenceId)) {
      warnings.push(`duplicate_occurrence_ignored:${occurrenceId}`);
      continue;
    }
    seenOccurrenceIds.add(occurrenceId);
    const occurrenceOverride = overrideByOccurrence.get(occurrenceId);
    const effectiveSchedule = occurrenceOverride?.mode === 'reschedule'
      ? occurrenceOverride.schedule
      : {
          date: entry.date,
          ...(startTime ? { time: startTime } : {}),
          ...(startTime && (template?.durationMinutes ?? options.schedule.durationMinutes)
            ? {
                durationMinutes:
                  template?.durationMinutes ?? options.schedule.durationMinutes,
              }
            : {}),
          ...(startTime && (template?.timeZone ?? options.schedule.timeZone)
            ? { timeZone: template?.timeZone ?? options.schedule.timeZone }
            : {}),
        };
    if (!effectiveSchedule) continue;
    const occurrenceScheduleProjection = buildPersonalStructuralScheduleProjection({
      schedule: {
        mode: 'fixed_date',
        date: effectiveSchedule.date,
        ...(effectiveSchedule.time ? { time: effectiveSchedule.time } : {}),
        ...(effectiveSchedule.time && effectiveSchedule.durationMinutes
          ? { durationMinutes: effectiveSchedule.durationMinutes }
          : {}),
        ...(effectiveSchedule.time && effectiveSchedule.timeZone
          ? { timeZone: effectiveSchedule.timeZone }
          : {}),
      },
      identityNamespace: options.identityNamespace,
      itemId: options.itemId,
    });
    const localDate = occurrenceScheduleProjection.calendarDate;
    if (!localDate || localDate < range.start || localDate > range.end) continue;
    const structurallyEligible =
      options.included !== false &&
      !options.tombstoned &&
      occurrenceOverride?.mode !== 'exclude';
    const executionState = executionByOccurrence.get(occurrenceId)?.state ?? 'pending';
    occurrences.push({
      itemId: options.itemId,
      seriesId: series.seriesId,
      revisionId: entry.revision.revisionId,
      occurrenceId,
      originalDate: entry.date,
      localDate,
      scheduleProjection: occurrenceScheduleProjection,
      personalOrderRank: options.personalOrderRank ?? 0,
      executionState,
      projectionEligibility: {
        calendarScreen: structurallyEligible,
        calendarIcs: structurallyEligible,
      },
      occurrenceOverrideApplied: Boolean(occurrenceOverride),
      validationWarnings: occurrenceScheduleProjection.validationWarnings,
    });
    if (occurrences.length >= maxOccurrences) {
      generationLimitReached = revisionRows.length > occurrences.length;
      if (generationLimitReached) warnings.push('occurrence_generation_limit_reached');
      break;
    }
  }
  occurrences.sort(compareOccurrences);
  const projectedOccurrences = occurrences.filter(
    (entry) =>
      entry.projectionEligibility.calendarScreen || entry.projectionEligibility.calendarIcs,
  );
  if (repeatIsAbsent && occurrences.length > 1) {
    warnings.push('single_occurrence_contract_generated_multiple_rows');
  }
  return {
    series,
    occurrences,
    projectedOccurrences,
    executionRecords,
    warnings,
    generationLimitReached,
  };
}

const VALID_TRANSITIONS: Record<
  PersonalStructuralOccurrenceExecutionState,
  PersonalStructuralOccurrenceExecutionState[]
> = {
  pending: ['done', 'skipped', 'held'],
  done: ['reopened'],
  reopened: ['done', 'skipped', 'held'],
  skipped: ['reopened', 'held'],
  held: ['reopened', 'done', 'skipped'],
};

export function transitionPersonalStructuralOccurrenceExecution(options: {
  current?: PersonalStructuralOccurrenceExecutionRecord;
  occurrenceId: string;
  seriesId: string;
  revisionId: string;
  nextState: PersonalStructuralOccurrenceExecutionState;
  at: string;
}): PersonalStructuralOccurrenceExecutionRecord {
  if (!Number.isFinite(Date.parse(options.at))) {
    throw new Error('Occurrence execution transition timestamp is invalid.');
  }
  const currentState = options.current?.state ?? 'pending';
  if (
    options.current &&
    (options.current.occurrenceId !== options.occurrenceId ||
      options.current.seriesId !== options.seriesId ||
      options.current.revisionId !== options.revisionId)
  ) {
    throw new Error('Occurrence execution identity mismatch.');
  }
  if (
    options.nextState !== currentState &&
    !VALID_TRANSITIONS[currentState].includes(options.nextState)
  ) {
    throw new Error(`Invalid occurrence transition: ${currentState} -> ${options.nextState}`);
  }
  const history = options.nextState === currentState
    ? [...(options.current?.history ?? [])]
    : [
        ...(options.current?.history ?? []),
        { from: currentState, to: options.nextState, at: options.at },
      ];
  return {
    occurrenceId: options.occurrenceId,
    seriesId: options.seriesId,
    revisionId: options.revisionId,
    state: options.nextState,
    updatedAt: options.at,
    ...(options.nextState === 'done'
      ? { completedAt: options.at }
      : options.current?.completedAt
        ? { completedAt: options.current.completedAt }
        : {}),
    ...(options.nextState === 'reopened'
      ? { reopenedAt: options.at }
      : options.current?.reopenedAt
        ? { reopenedAt: options.current.reopenedAt }
        : {}),
    ...(options.nextState === 'skipped'
      ? { skippedAt: options.at }
      : options.current?.skippedAt
        ? { skippedAt: options.current.skippedAt }
        : {}),
    ...(options.nextState === 'held'
      ? { heldAt: options.at }
      : options.current?.heldAt
        ? { heldAt: options.current.heldAt }
        : {}),
    history,
  };
}

export function buildPersonalDraftOccurrenceProjection(options: {
  personalDraftEligible: boolean;
  ownership: 'source' | 'user_created';
  identityNamespace: string;
  itemId: string;
  schedule: PersonalStructuralSchedule | undefined;
  range: ProjectionRange;
  personalOrderRank?: number;
  executionRecords?: PersonalStructuralOccurrenceExecutionRecord[];
}): PersonalStructuralOccurrenceProjectionResult | undefined {
  if (!options.personalDraftEligible || options.ownership !== 'user_created') return undefined;
  return generatePersonalStructuralOccurrences(options);
}
