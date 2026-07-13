export const PERSONAL_STRUCTURAL_RECURRENCE_SCHEMA_VERSION = 1 as const;
export const PERSONAL_STRUCTURAL_RECURRENCE_MAX_INTERVAL = 365;
export const PERSONAL_STRUCTURAL_RECURRENCE_MAX_COUNT = 10_000;

export const PERSONAL_STRUCTURAL_WEEKDAYS = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
] as const;

export type PersonalStructuralWeekday =
  (typeof PERSONAL_STRUCTURAL_WEEKDAYS)[number];

export type PersonalStructuralLegacyRepeat = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
};

export type PersonalStructuralRecurrenceEnd =
  | { mode: 'until'; date: string }
  | { mode: 'count'; count: number };

export type PersonalStructuralRecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  weekdays?: PersonalStructuralWeekday[];
  dayOfMonth?: number;
  invalidMonthDayPolicy?: 'skip';
  end?: PersonalStructuralRecurrenceEnd;
};

export type PersonalStructuralRecurrenceScheduleTemplate = {
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
};

export type PersonalStructuralRecurrenceRevision = {
  revision: number;
  revisionId: string;
  effectiveFrom: string;
  rule: PersonalStructuralRecurrenceRule;
  scheduleTemplate?: PersonalStructuralRecurrenceScheduleTemplate;
  updatedAt: string;
};

export type PersonalStructuralRecurrenceOccurrenceSchedule = {
  date: string;
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
};

export type PersonalStructuralRecurrenceOccurrenceOverride = {
  occurrenceId: string;
  mode: 'reschedule' | 'exclude';
  schedule?: PersonalStructuralRecurrenceOccurrenceSchedule;
  updatedAt: string;
};

export type PersonalStructuralRecurrenceSeries = {
  schemaVersion: typeof PERSONAL_STRUCTURAL_RECURRENCE_SCHEMA_VERSION;
  seriesId: string;
  status: 'active' | 'paused' | 'ended';
  statusEffectiveFrom?: string;
  revisions: PersonalStructuralRecurrenceRevision[];
  occurrenceOverrides: PersonalStructuralRecurrenceOccurrenceOverride[];
  updatedAt: string;
};

export type PersonalStructuralRepeat =
  | PersonalStructuralLegacyRepeat
  | PersonalStructuralRecurrenceSeries;

export type PersonalStructuralRecurrenceNormalizationResult = {
  series?: PersonalStructuralRecurrenceSeries;
  warnings: string[];
  legacyMigrated: boolean;
};

export type PersonalStructuralRecurrenceEditScope = 'this' | 'future' | 'all';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= 500 ? normalized : undefined;
}

function normalizeTimestamp(value: unknown, fallback: string): string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? value
    : fallback;
}

function isPlainDate(value: unknown): value is string {
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

function isLocalTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isIanaTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function getWeekday(date: string): PersonalStructuralWeekday {
  const [year, month, day] = date.split('-').map(Number);
  const index = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return PERSONAL_STRUCTURAL_WEEKDAYS[(index + 6) % 7];
}

function getDayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

function normalizeInterval(value: unknown, warnings: string[]): number {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= PERSONAL_STRUCTURAL_RECURRENCE_MAX_INTERVAL
  ) {
    return value;
  }
  warnings.push('invalid_recurrence_interval_defaulted');
  return 1;
}

function normalizeWeekdays(
  value: unknown,
  fallbackDate: string,
  warnings: string[],
): PersonalStructuralWeekday[] {
  const weekdays = Array.isArray(value)
    ? Array.from(
        new Set(
          value.filter((entry): entry is PersonalStructuralWeekday =>
            PERSONAL_STRUCTURAL_WEEKDAYS.includes(entry as PersonalStructuralWeekday),
          ),
        ),
      )
    : [];
  if (weekdays.length > 0) {
    return [...weekdays].sort(
      (left, right) =>
        PERSONAL_STRUCTURAL_WEEKDAYS.indexOf(left) -
        PERSONAL_STRUCTURAL_WEEKDAYS.indexOf(right),
    );
  }
  warnings.push('missing_weekdays_defaulted_to_start_day');
  return [getWeekday(fallbackDate)];
}

function normalizeEnd(
  value: unknown,
  record: Record<string, unknown>,
  warnings: string[],
): PersonalStructuralRecurrenceEnd | undefined {
  const endRecord = isRecord(value) ? value : undefined;
  const untilCandidate = endRecord?.mode === 'until'
    ? endRecord.date
    : record.untilDate;
  const countCandidate = endRecord?.mode === 'count'
    ? endRecord.count
    : record.occurrenceCount;
  const until = isPlainDate(untilCandidate) ? untilCandidate : undefined;
  const count =
    typeof countCandidate === 'number' &&
    Number.isInteger(countCandidate) &&
    countCandidate >= 1 &&
    countCandidate <= PERSONAL_STRUCTURAL_RECURRENCE_MAX_COUNT
      ? countCandidate
      : undefined;

  if (until && count) {
    warnings.push('recurrence_until_count_conflict_until_kept');
    return { mode: 'until', date: until };
  }
  if (untilCandidate !== undefined && !until) warnings.push('invalid_recurrence_until_ignored');
  if (countCandidate !== undefined && !count) warnings.push('invalid_recurrence_count_ignored');
  if (until) return { mode: 'until', date: until };
  if (count) return { mode: 'count', count };
  return undefined;
}

export function normalizePersonalStructuralRecurrenceRule(
  value: unknown,
  options: { effectiveFrom: string },
): { rule?: PersonalStructuralRecurrenceRule; warnings: string[] } {
  const warnings: string[] = [];
  if (!isRecord(value) || !isPlainDate(options.effectiveFrom)) {
    return { warnings: ['invalid_recurrence_rule'] };
  }
  const frequency = value.frequency;
  if (frequency !== 'daily' && frequency !== 'weekly' && frequency !== 'monthly') {
    return { warnings: ['invalid_recurrence_frequency'] };
  }
  const interval = normalizeInterval(value.interval, warnings);
  const end = normalizeEnd(value.end, value, warnings);
  const rule: PersonalStructuralRecurrenceRule = {
    frequency,
    interval,
    ...(end ? { end } : {}),
  };

  if (frequency === 'weekly') {
    rule.weekdays = normalizeWeekdays(value.weekdays, options.effectiveFrom, warnings);
  }
  if (frequency === 'monthly') {
    const dayOfMonth =
      typeof value.dayOfMonth === 'number' &&
      Number.isInteger(value.dayOfMonth) &&
      value.dayOfMonth >= 1 &&
      value.dayOfMonth <= 31
        ? value.dayOfMonth
        : getDayOfMonth(options.effectiveFrom);
    if (value.dayOfMonth !== undefined && dayOfMonth !== value.dayOfMonth) {
      warnings.push('invalid_month_day_defaulted_to_start_day');
    }
    rule.dayOfMonth = dayOfMonth;
    rule.invalidMonthDayPolicy = 'skip';
  }
  return { rule, warnings };
}

export function buildPersonalStructuralRecurrenceSeriesId(options: {
  identityNamespace: string;
  itemId: string;
}): string {
  return `personal-recurrence:${encodeURIComponent(options.identityNamespace.trim())}:${encodeURIComponent(options.itemId.trim())}`;
}

export function buildPersonalStructuralRecurrenceRevisionId(options: {
  seriesId: string;
  revision: number;
  effectiveFrom: string;
}): string {
  return `${options.seriesId}:revision:${options.revision}:${options.effectiveFrom}`;
}

export function buildPersonalStructuralOccurrenceId(options: {
  revisionId: string;
  scheduledDate: string;
  startTime?: string;
}): string {
  return `${options.revisionId}:occurrence:${options.scheduledDate}T${options.startTime ?? 'all-day'}`;
}

function normalizeOccurrenceSchedule(
  value: unknown,
  warnings: string[],
): PersonalStructuralRecurrenceOccurrenceSchedule | undefined {
  if (!isRecord(value) || !isPlainDate(value.date)) {
    warnings.push('invalid_occurrence_override_schedule');
    return undefined;
  }
  const time = isLocalTime(value.time) ? value.time : undefined;
  if (value.time !== undefined && !time) warnings.push('invalid_occurrence_override_time');
  const durationMinutes =
    typeof value.durationMinutes === 'number' &&
    Number.isInteger(value.durationMinutes) &&
    value.durationMinutes >= 5 &&
    value.durationMinutes <= 1440
      ? value.durationMinutes
      : undefined;
  if (value.durationMinutes !== undefined && durationMinutes === undefined) {
    warnings.push('invalid_occurrence_override_duration');
  }
  const timeZone = isIanaTimeZone(value.timeZone) ? value.timeZone.trim() : undefined;
  if (value.timeZone !== undefined && !timeZone) {
    warnings.push('invalid_occurrence_override_time_zone');
  }
  return {
    date: value.date,
    ...(time ? { time } : {}),
    ...(time && durationMinutes !== undefined ? { durationMinutes } : {}),
    ...(time && timeZone ? { timeZone } : {}),
  };
}

function normalizeScheduleTemplate(
  value: unknown,
  warnings: string[],
): PersonalStructuralRecurrenceScheduleTemplate | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push('invalid_revision_schedule_template');
    return undefined;
  }
  const time = isLocalTime(value.time) ? value.time : undefined;
  if (value.time !== undefined && !time) warnings.push('invalid_revision_time');
  const durationMinutes =
    typeof value.durationMinutes === 'number' &&
    Number.isInteger(value.durationMinutes) &&
    value.durationMinutes >= 5 &&
    value.durationMinutes <= 1440
      ? value.durationMinutes
      : undefined;
  if (value.durationMinutes !== undefined && durationMinutes === undefined) {
    warnings.push('invalid_revision_duration');
  }
  const timeZone = isIanaTimeZone(value.timeZone) ? value.timeZone.trim() : undefined;
  if (value.timeZone !== undefined && !timeZone) warnings.push('invalid_revision_time_zone');
  if (!time) return undefined;
  return {
    time,
    ...(durationMinutes !== undefined ? { durationMinutes } : {}),
    ...(timeZone ? { timeZone } : {}),
  };
}

function normalizeSeries(
  value: Record<string, unknown>,
  options: {
    identityNamespace: string;
    itemId: string;
    startDate: string;
    fallbackTimestamp: string;
  },
): PersonalStructuralRecurrenceNormalizationResult {
  const warnings: string[] = [];
  const fallbackSeriesId = buildPersonalStructuralRecurrenceSeriesId(options);
  const seriesId = normalizeId(value.seriesId) ?? fallbackSeriesId;
  if (!normalizeId(value.seriesId)) warnings.push('invalid_series_id_rebuilt');
  const revisions: PersonalStructuralRecurrenceRevision[] = [];
  const seenRevisionIds = new Set<string>();
  if (Array.isArray(value.revisions)) {
    value.revisions.forEach((entry, index) => {
      if (!isRecord(entry)) {
        warnings.push(`invalid_revision:${index}`);
        return;
      }
      const effectiveFrom = isPlainDate(entry.effectiveFrom)
        ? entry.effectiveFrom
        : undefined;
      if (!effectiveFrom) {
        warnings.push(`invalid_revision_effective_from:${index}`);
        return;
      }
      const normalizedRule = normalizePersonalStructuralRecurrenceRule(entry.rule, {
        effectiveFrom,
      });
      warnings.push(...normalizedRule.warnings.map((warning) => `revision:${index}:${warning}`));
      if (!normalizedRule.rule) return;
      const revision =
        typeof entry.revision === 'number' &&
        Number.isInteger(entry.revision) &&
        entry.revision >= 1
          ? entry.revision
          : index + 1;
      const revisionId =
        normalizeId(entry.revisionId) ??
        buildPersonalStructuralRecurrenceRevisionId({ seriesId, revision, effectiveFrom });
      if (seenRevisionIds.has(revisionId)) {
        warnings.push(`duplicate_revision_id:${revisionId}`);
        return;
      }
      seenRevisionIds.add(revisionId);
      const scheduleTemplate = normalizeScheduleTemplate(entry.scheduleTemplate, warnings);
      revisions.push({
        revision,
        revisionId,
        effectiveFrom,
        rule: normalizedRule.rule,
        ...(scheduleTemplate ? { scheduleTemplate } : {}),
        updatedAt: normalizeTimestamp(entry.updatedAt, options.fallbackTimestamp),
      });
    });
  }
  if (revisions.length === 0) {
    return { warnings: [...warnings, 'recurrence_has_no_valid_revisions'], legacyMigrated: false };
  }
  revisions.sort(
    (left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom) ||
      left.revision - right.revision,
  );

  const occurrenceOverrides: PersonalStructuralRecurrenceOccurrenceOverride[] = [];
  const overrideByOccurrence = new Map<string, PersonalStructuralRecurrenceOccurrenceOverride>();
  if (Array.isArray(value.occurrenceOverrides)) {
    value.occurrenceOverrides.forEach((entry, index) => {
      if (!isRecord(entry)) return;
      const occurrenceId = normalizeId(entry.occurrenceId);
      const mode = entry.mode;
      if (!occurrenceId || (mode !== 'reschedule' && mode !== 'exclude')) {
        warnings.push(`invalid_occurrence_override:${index}`);
        return;
      }
      const schedule = mode === 'reschedule'
        ? normalizeOccurrenceSchedule(entry.schedule, warnings)
        : undefined;
      if (mode === 'reschedule' && !schedule) return;
      overrideByOccurrence.set(occurrenceId, {
        occurrenceId,
        mode,
        ...(schedule ? { schedule } : {}),
        updatedAt: normalizeTimestamp(entry.updatedAt, options.fallbackTimestamp),
      });
    });
  }
  occurrenceOverrides.push(...overrideByOccurrence.values());

  const status =
    value.status === 'paused' || value.status === 'ended' ? value.status : 'active';
  const statusEffectiveFrom = isPlainDate(value.statusEffectiveFrom)
    ? value.statusEffectiveFrom
    : undefined;
  if (value.statusEffectiveFrom !== undefined && !statusEffectiveFrom) {
    warnings.push('invalid_series_status_effective_from');
  }
  return {
    series: {
      schemaVersion: PERSONAL_STRUCTURAL_RECURRENCE_SCHEMA_VERSION,
      seriesId,
      status,
      ...(statusEffectiveFrom ? { statusEffectiveFrom } : {}),
      revisions,
      occurrenceOverrides,
      updatedAt: normalizeTimestamp(value.updatedAt, options.fallbackTimestamp),
    },
    warnings,
    legacyMigrated: false,
  };
}

function getLegacyRepeat(value: unknown): PersonalStructuralLegacyRepeat | undefined {
  if (!isRecord(value)) return undefined;
  const frequency = value.frequency;
  const interval = value.interval;
  return (frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly') &&
    typeof interval === 'number' &&
    Number.isInteger(interval) &&
    interval >= 1 &&
    interval <= PERSONAL_STRUCTURAL_RECURRENCE_MAX_INTERVAL
    ? { frequency, interval }
    : undefined;
}

function getLegacyPreset(value: unknown): PersonalStructuralLegacyRepeat | undefined {
  return value === 'daily' || value === 'weekly' || value === 'monthly'
    ? { frequency: value, interval: 1 }
    : undefined;
}

export function createPersonalStructuralRecurrenceSeries(options: {
  identityNamespace: string;
  itemId: string;
  effectiveFrom: string;
  rule: PersonalStructuralRecurrenceRule;
  scheduleTemplate?: PersonalStructuralRecurrenceScheduleTemplate;
  updatedAt: string;
}): PersonalStructuralRecurrenceSeries {
  const seriesId = buildPersonalStructuralRecurrenceSeriesId(options);
  const revision = 1;
  return {
    schemaVersion: PERSONAL_STRUCTURAL_RECURRENCE_SCHEMA_VERSION,
    seriesId,
    status: 'active',
    revisions: [
      {
        revision,
        revisionId: buildPersonalStructuralRecurrenceRevisionId({
          seriesId,
          revision,
          effectiveFrom: options.effectiveFrom,
        }),
        effectiveFrom: options.effectiveFrom,
        rule: options.rule,
        ...(options.scheduleTemplate ? { scheduleTemplate: options.scheduleTemplate } : {}),
        updatedAt: options.updatedAt,
      },
    ],
    occurrenceOverrides: [],
    updatedAt: options.updatedAt,
  };
}

export function migrateLegacyPersonalStructuralRepeat(options: {
  repeat?: unknown;
  repeatPreset?: unknown;
  identityNamespace: string;
  itemId: string;
  startDate: string;
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
  updatedAt?: string;
}): PersonalStructuralRecurrenceNormalizationResult {
  const updatedAt = options.updatedAt ?? new Date().toISOString();
  if (!isPlainDate(options.startDate)) {
    return { warnings: ['recurrence_requires_fixed_date'], legacyMigrated: false };
  }
  const legacy = getLegacyRepeat(options.repeat) ?? getLegacyPreset(options.repeatPreset);
  if (!legacy) {
    return {
      warnings:
        options.repeat !== undefined || options.repeatPreset
          ? ['invalid_legacy_recurrence_ignored']
          : [],
      legacyMigrated: false,
    };
  }
  const rule: PersonalStructuralRecurrenceRule = {
    frequency: legacy.frequency,
    interval: legacy.interval,
    ...(legacy.frequency === 'weekly'
      ? { weekdays: [getWeekday(options.startDate)] }
      : {}),
    ...(legacy.frequency === 'monthly'
      ? {
          dayOfMonth: getDayOfMonth(options.startDate),
          invalidMonthDayPolicy: 'skip' as const,
        }
      : {}),
  };
  const scheduleTemplate = normalizeScheduleTemplate(
    {
      time: options.time,
      durationMinutes: options.durationMinutes,
      timeZone: options.timeZone,
    },
    [],
  );
  return {
    series: createPersonalStructuralRecurrenceSeries({
      ...options,
      effectiveFrom: options.startDate,
      rule,
      ...(scheduleTemplate ? { scheduleTemplate } : {}),
      updatedAt,
    }),
    warnings: [],
    legacyMigrated: true,
  };
}

export function normalizePersonalStructuralRecurrence(options: {
  value: unknown;
  repeatPreset?: unknown;
  identityNamespace: string;
  itemId: string;
  startDate: string;
  fallbackTimestamp?: string;
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
}): PersonalStructuralRecurrenceNormalizationResult {
  const fallbackTimestamp = options.fallbackTimestamp ?? new Date().toISOString();
  if (
    isRecord(options.value) &&
    options.value.schemaVersion === PERSONAL_STRUCTURAL_RECURRENCE_SCHEMA_VERSION
  ) {
    return normalizeSeries(options.value, {
      identityNamespace: options.identityNamespace,
      itemId: options.itemId,
      startDate: options.startDate,
      fallbackTimestamp,
    });
  }
  return migrateLegacyPersonalStructuralRepeat({
    repeat: options.value,
    repeatPreset: options.repeatPreset,
    identityNamespace: options.identityNamespace,
    itemId: options.itemId,
    startDate: options.startDate,
    time: options.time,
    durationMinutes: options.durationMinutes,
    timeZone: options.timeZone,
    updatedAt: fallbackTimestamp,
  });
}

export function normalizePersonalStructuralRepeatForStorage(
  value: unknown,
): { repeat?: PersonalStructuralRepeat; warnings: string[] } {
  const legacy = getLegacyRepeat(value);
  if (legacy) return { repeat: legacy, warnings: [] };
  if (!isRecord(value) || value.schemaVersion !== PERSONAL_STRUCTURAL_RECURRENCE_SCHEMA_VERSION) {
    return { warnings: value === undefined ? [] : ['invalid_repeat'] };
  }
  const firstRevision = Array.isArray(value.revisions)
    ? value.revisions.find((entry) => isRecord(entry) && isPlainDate(entry.effectiveFrom))
    : undefined;
  const startDate = isRecord(firstRevision) && isPlainDate(firstRevision.effectiveFrom)
    ? firstRevision.effectiveFrom
    : undefined;
  const seriesId = normalizeId(value.seriesId);
  if (!startDate || !seriesId) return { warnings: ['invalid_recurrence_series'] };
  const normalized = normalizeSeries(value, {
    identityNamespace: seriesId,
    itemId: 'recovered-item',
    startDate,
    fallbackTimestamp: new Date(0).toISOString(),
  });
  return { repeat: normalized.series, warnings: normalized.warnings };
}

export function appendPersonalStructuralRecurrenceRevision(options: {
  series: PersonalStructuralRecurrenceSeries;
  scope: Exclude<PersonalStructuralRecurrenceEditScope, 'this'>;
  effectiveFrom: string;
  rule: PersonalStructuralRecurrenceRule;
  scheduleTemplate?: PersonalStructuralRecurrenceScheduleTemplate;
  updatedAt: string;
  executionRecordCount: number;
}): PersonalStructuralRecurrenceSeries {
  if (options.scope === 'all' && options.executionRecordCount === 0) {
    const first = options.series.revisions[0];
    const replacement: PersonalStructuralRecurrenceRevision = {
      revision: first.revision,
      revisionId: first.revisionId,
      effectiveFrom: options.effectiveFrom,
      rule: options.rule,
      ...(options.scheduleTemplate
        ? { scheduleTemplate: options.scheduleTemplate }
        : first.scheduleTemplate
          ? { scheduleTemplate: first.scheduleTemplate }
          : {}),
      updatedAt: options.updatedAt,
    };
    return {
      ...options.series,
      revisions: [replacement],
      updatedAt: options.updatedAt,
    };
  }
  const revision = Math.max(...options.series.revisions.map((entry) => entry.revision)) + 1;
  const previousScheduleTemplate = options.series.revisions.at(-1)?.scheduleTemplate;
  const next: PersonalStructuralRecurrenceRevision = {
    revision,
    revisionId: buildPersonalStructuralRecurrenceRevisionId({
      seriesId: options.series.seriesId,
      revision,
      effectiveFrom: options.effectiveFrom,
    }),
    effectiveFrom: options.effectiveFrom,
    rule: options.rule,
    ...(options.scheduleTemplate
      ? { scheduleTemplate: options.scheduleTemplate }
      : previousScheduleTemplate
        ? { scheduleTemplate: previousScheduleTemplate }
        : {}),
    updatedAt: options.updatedAt,
  };
  return {
    ...options.series,
    revisions: [...options.series.revisions, next].sort((left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom),
    ),
    updatedAt: options.updatedAt,
  };
}

export function setPersonalStructuralOccurrenceOverride(options: {
  series: PersonalStructuralRecurrenceSeries;
  override: PersonalStructuralRecurrenceOccurrenceOverride;
}): PersonalStructuralRecurrenceSeries {
  return {
    ...options.series,
    occurrenceOverrides: [
      ...options.series.occurrenceOverrides.filter(
        (entry) => entry.occurrenceId !== options.override.occurrenceId,
      ),
      options.override,
    ],
    updatedAt: options.override.updatedAt,
  };
}
