import {
  appendPersonalStructuralRecurrenceRevision,
  normalizePersonalStructuralRecurrence,
  setPersonalStructuralOccurrenceOverride,
  type PersonalStructuralRecurrenceRule,
  type PersonalStructuralRecurrenceSeries,
  type PersonalStructuralWeekday,
} from './personal-structural-recurrence';
import {
  generatePersonalStructuralOccurrences,
  type PersonalStructuralOccurrenceExecutionRecord,
  type PersonalStructuralOccurrenceExecutionState,
} from './personal-structural-occurrence';
import {
  isPersonalStructuralPlainDate,
} from './personal-structural-schedule';
import type { PersonalStructuralSchedule } from './personal-structural-overlay';

export type DateMovementScope =
  | 'single'
  | 'selected'
  | 'anchor'
  | 'occurrence'
  | 'future_series'
  | 'whole_series';

export type DateMovementOperation = 'set_date' | 'shift_days' | 'remove_date';
export type DateMovementOwnership = 'linked' | 'fixed' | 'unscheduled';
export type DateMovementChangeKind =
  | 'item_schedule'
  | 'anchor_projection'
  | 'occurrence_override'
  | 'series_revision';

export type DateMovementItem = {
  itemId: string;
  title?: string;
  schedule?: PersonalStructuralSchedule;
  effectiveDate?: string;
  dateOwnership?: DateMovementOwnership;
  linkedDayOffset?: number;
  included?: boolean;
  tombstoned?: boolean;
  personalOrderRank?: number;
  executionState?: PersonalStructuralOccurrenceExecutionState;
};

export type DateMovementState = {
  identityNamespace: string;
  anchorDate?: string;
  items: DateMovementItem[];
  occurrenceExecutionRecords?: PersonalStructuralOccurrenceExecutionRecord[];
};

export type DateMovementOccurrenceTarget = {
  itemId: string;
  occurrenceId: string;
  seriesId: string;
  revisionId: string;
  originalDate: string;
  currentDate: string;
  executionState: PersonalStructuralOccurrenceExecutionState;
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
};

export type DateMovementRequest = {
  scope: DateMovementScope;
  operation: DateMovementOperation;
  itemIds?: string[];
  targetDate?: string;
  deltaDays?: number;
  occurrence?: DateMovementOccurrenceTarget;
  updatedAt: string;
};

export type DateMovementProjectionEligibility = {
  calendar: boolean;
  calendarIcs: boolean;
  checklist: boolean;
  sheet: boolean;
  memo: boolean;
};

export type DateMovementChange = {
  itemId: string;
  kind: DateMovementChangeKind;
  beforeDate?: string;
  afterDate?: string;
  beforeOwnership: DateMovementOwnership;
  afterOwnership: DateMovementOwnership;
  beforeSchedule?: PersonalStructuralSchedule;
  afterSchedule?: PersonalStructuralSchedule;
  occurrenceId?: string;
  seriesId?: string;
  revisionIdBefore?: string;
  revisionIdAfter?: string;
  executionState?: PersonalStructuralOccurrenceExecutionState;
  executionHistoryPreserved: true;
  structuralMembershipChanged: false;
  projectionEligibilityBefore: DateMovementProjectionEligibility;
  projectionEligibilityAfter: DateMovementProjectionEligibility;
};

export type DateMovementAffectedCounts = {
  selectedCount: number;
  changedCount: number;
  linkedRecalculatedCount: number;
  fixedChangedCount: number;
  fixedKeptCount: number;
  unscheduledChangedCount: number;
  unscheduledKeptCount: number;
  occurrenceChangedCount: number;
  seriesRevisionCount: number;
  doneStateCount: number;
  reopenedStateCount: number;
  skippedStateCount: number;
  heldStateCount: number;
};

export type DateMovementPreview = {
  scope: DateMovementScope;
  operation: DateMovementOperation;
  counts: DateMovementAffectedCounts;
  requiresConfirmation: boolean;
  isAtomic: true;
};

export type DateMovementPlan = {
  canApply: boolean;
  request: DateMovementRequest;
  preview: DateMovementPreview;
  changes: DateMovementChange[];
  warnings: string[];
  blockedReason?: string;
  previousState: DateMovementState;
  nextState: DateMovementState;
  sourceFingerprint: string;
  resultFingerprint: string;
  undoToken: string;
};

const WEEKDAYS: PersonalStructuralWeekday[] = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
];

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeState(state: DateMovementState): DateMovementState {
  return {
    identityNamespace: state.identityNamespace,
    ...(isPersonalStructuralPlainDate(state.anchorDate)
      ? { anchorDate: state.anchorDate }
      : {}),
    items: cloneValue(state.items),
    ...(state.occurrenceExecutionRecords
      ? { occurrenceExecutionRecords: cloneValue(state.occurrenceExecutionRecords) }
      : {}),
  };
}

function fingerprint(value: unknown): string {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function dateToUtcDay(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function addPlainDateDays(date: string, days: number): string | undefined {
  if (!isPersonalStructuralPlainDate(date) || !Number.isInteger(days)) return undefined;
  return new Date((dateToUtcDay(date) + days) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function daysBetween(left: string, right: string): number {
  return dateToUtcDay(right) - dateToUtcDay(left);
}

function getOwnership(item: DateMovementItem): DateMovementOwnership {
  if (item.dateOwnership) return item.dateOwnership;
  if (item.schedule?.mode === 'anchor_offset') return 'linked';
  if (item.schedule?.mode === 'fixed_date' || isPersonalStructuralPlainDate(item.effectiveDate)) {
    return 'fixed';
  }
  return 'unscheduled';
}

function resolveItemDate(state: DateMovementState, item: DateMovementItem): string | undefined {
  const ownership = getOwnership(item);
  if (ownership === 'linked') {
    if (
      item.schedule?.mode === 'anchor_offset' &&
      isPersonalStructuralPlainDate(state.anchorDate)
    ) {
      return addPlainDateDays(state.anchorDate, item.schedule.dayOffset);
    }
    if (isPersonalStructuralPlainDate(item.effectiveDate)) return item.effectiveDate;
    if (
      isPersonalStructuralPlainDate(state.anchorDate) &&
      Number.isInteger(item.linkedDayOffset)
    ) {
      return addPlainDateDays(state.anchorDate, item.linkedDayOffset as number);
    }
    return undefined;
  }
  if (item.schedule?.mode === 'fixed_date' && isPersonalStructuralPlainDate(item.schedule.date)) {
    return item.schedule.date;
  }
  return isPersonalStructuralPlainDate(item.effectiveDate)
    ? item.effectiveDate
    : undefined;
}

function getProjectionEligibility(
  item: DateMovementItem,
  date: string | undefined,
): DateMovementProjectionEligibility {
  const structurallyIncluded = item.included !== false && !item.tombstoned;
  return {
    calendar: structurallyIncluded && Boolean(date),
    calendarIcs: structurallyIncluded && Boolean(date),
    checklist: structurallyIncluded,
    sheet: structurallyIncluded,
    memo: structurallyIncluded,
  };
}

function getTemporalFields(schedule: PersonalStructuralSchedule | undefined) {
  if (!schedule) return {};
  return {
    ...(schedule.time ? { time: schedule.time } : {}),
    ...(schedule.time && schedule.durationMinutes
      ? { durationMinutes: schedule.durationMinutes }
      : {}),
    ...(schedule.time && schedule.timeZone ? { timeZone: schedule.timeZone } : {}),
  };
}

function buildFixedSchedule(
  schedule: PersonalStructuralSchedule | undefined,
  date: string,
): PersonalStructuralSchedule {
  return {
    mode: 'fixed_date',
    date,
    ...getTemporalFields(schedule),
  };
}

function hasRecurrence(schedule: PersonalStructuralSchedule | undefined): boolean {
  return Boolean(schedule?.mode === 'fixed_date' && schedule.repeat);
}

function targetDateFor(
  request: DateMovementRequest,
  currentDate: string | undefined,
): string | undefined {
  if (request.operation === 'remove_date') return undefined;
  if (request.operation === 'set_date') {
    return isPersonalStructuralPlainDate(request.targetDate)
      ? request.targetDate
      : undefined;
  }
  if (!Number.isInteger(request.deltaDays) || request.deltaDays === 0 || !currentDate) {
    return undefined;
  }
  return addPlainDateDays(currentDate, request.deltaDays as number);
}

function emptyCounts(): DateMovementAffectedCounts {
  return {
    selectedCount: 0,
    changedCount: 0,
    linkedRecalculatedCount: 0,
    fixedChangedCount: 0,
    fixedKeptCount: 0,
    unscheduledChangedCount: 0,
    unscheduledKeptCount: 0,
    occurrenceChangedCount: 0,
    seriesRevisionCount: 0,
    doneStateCount: 0,
    reopenedStateCount: 0,
    skippedStateCount: 0,
    heldStateCount: 0,
  };
}

function countExecutionState(
  counts: DateMovementAffectedCounts,
  state: PersonalStructuralOccurrenceExecutionState | undefined,
): void {
  if (state === 'done') counts.doneStateCount += 1;
  if (state === 'reopened') counts.reopenedStateCount += 1;
  if (state === 'skipped') counts.skippedStateCount += 1;
  if (state === 'held') counts.heldStateCount += 1;
}

function makeChange(options: {
  item: DateMovementItem;
  kind: DateMovementChangeKind;
  beforeDate?: string;
  afterDate?: string;
  beforeOwnership: DateMovementOwnership;
  afterOwnership: DateMovementOwnership;
  beforeSchedule?: PersonalStructuralSchedule;
  afterSchedule?: PersonalStructuralSchedule;
  occurrence?: DateMovementOccurrenceTarget;
  revisionIdAfter?: string;
}): DateMovementChange {
  return {
    itemId: options.item.itemId,
    kind: options.kind,
    ...(options.beforeDate ? { beforeDate: options.beforeDate } : {}),
    ...(options.afterDate ? { afterDate: options.afterDate } : {}),
    beforeOwnership: options.beforeOwnership,
    afterOwnership: options.afterOwnership,
    ...(options.beforeSchedule ? { beforeSchedule: cloneValue(options.beforeSchedule) } : {}),
    ...(options.afterSchedule ? { afterSchedule: cloneValue(options.afterSchedule) } : {}),
    ...(options.occurrence
      ? {
          occurrenceId: options.occurrence.occurrenceId,
          seriesId: options.occurrence.seriesId,
          revisionIdBefore: options.occurrence.revisionId,
          executionState: options.occurrence.executionState,
        }
      : options.item.executionState
        ? { executionState: options.item.executionState }
        : {}),
    ...(options.revisionIdAfter ? { revisionIdAfter: options.revisionIdAfter } : {}),
    executionHistoryPreserved: true,
    structuralMembershipChanged: false,
    projectionEligibilityBefore: getProjectionEligibility(options.item, options.beforeDate),
    projectionEligibilityAfter: getProjectionEligibility(options.item, options.afterDate),
  };
}

function blockPlan(
  state: DateMovementState,
  request: DateMovementRequest,
  counts: DateMovementAffectedCounts,
  reason: string,
  warnings: string[] = [],
): DateMovementPlan {
  const previousState = normalizeState(state);
  const sourceFingerprint = fingerprint(previousState);
  return {
    canApply: false,
    request: cloneValue(request),
    preview: {
      scope: request.scope,
      operation: request.operation,
      counts,
      requiresConfirmation: request.scope !== 'single',
      isAtomic: true,
    },
    changes: [],
    warnings,
    blockedReason: reason,
    previousState,
    nextState: normalizeState(state),
    sourceFingerprint,
    resultFingerprint: sourceFingerprint,
    undoToken: `date-move:${sourceFingerprint}:${sourceFingerprint}`,
  };
}

function completePlan(options: {
  previousState: DateMovementState;
  nextState: DateMovementState;
  request: DateMovementRequest;
  counts: DateMovementAffectedCounts;
  changes: DateMovementChange[];
  warnings: string[];
}): DateMovementPlan {
  const previousState = normalizeState(options.previousState);
  const nextState = normalizeState(options.nextState);
  const sourceFingerprint = fingerprint(previousState);
  const resultFingerprint = fingerprint(nextState);
  return {
    canApply: sourceFingerprint !== resultFingerprint,
    request: cloneValue(options.request),
    preview: {
      scope: options.request.scope,
      operation: options.request.operation,
      counts: options.counts,
      requiresConfirmation:
        options.request.scope !== 'single' || options.changes.length > 1,
      isAtomic: true,
    },
    changes: options.changes,
    warnings: options.warnings,
    ...(sourceFingerprint === resultFingerprint ? { blockedReason: 'date_unchanged' } : {}),
    previousState,
    nextState,
    sourceFingerprint,
    resultFingerprint,
    undoToken: `date-move:${sourceFingerprint}:${resultFingerprint}`,
  };
}

function planDirectItems(
  state: DateMovementState,
  request: DateMovementRequest,
): DateMovementPlan {
  const counts = emptyCounts();
  const requestedIds = request.scope === 'single'
    ? request.itemIds?.slice(0, 1) ?? []
    : Array.from(new Set(request.itemIds ?? []));
  if (requestedIds.length === 0) {
    return blockPlan(state, request, counts, 'item_selection_required');
  }
  const itemById = new Map(state.items.map((item) => [item.itemId, item]));
  const unknownIds = requestedIds.filter((itemId) => !itemById.has(itemId));
  const selectedItems = requestedIds
    .map((itemId) => itemById.get(itemId))
    .filter((item): item is DateMovementItem => Boolean(item));
  counts.selectedCount = selectedItems.length;
  selectedItems.forEach((item) => {
    const ownership = getOwnership(item);
    if (ownership === 'linked') counts.linkedRecalculatedCount += 1;
    if (ownership === 'fixed') counts.fixedChangedCount += 1;
    if (ownership === 'unscheduled') counts.unscheduledChangedCount += 1;
    countExecutionState(counts, item.executionState);
  });
  const warnings = unknownIds.map((itemId) => `unknown_item_ignored:${itemId}`);
  if (selectedItems.length === 0) {
    return blockPlan(state, request, counts, 'no_known_items_selected', warnings);
  }
  if (selectedItems.some((item) => hasRecurrence(item.schedule))) {
    return blockPlan(
      state,
      request,
      counts,
      'recurring_item_requires_occurrence_or_series_scope',
      warnings,
    );
  }
  if (
    request.operation === 'shift_days' &&
    selectedItems.some((item) => !resolveItemDate(state, item))
  ) {
    return blockPlan(
      state,
      request,
      counts,
      'shift_requires_every_selected_item_to_have_a_date',
      warnings,
    );
  }
  if (
    request.operation === 'set_date' &&
    !isPersonalStructuralPlainDate(request.targetDate)
  ) {
    return blockPlan(state, request, counts, 'valid_target_date_required', warnings);
  }
  if (
    request.operation === 'shift_days' &&
    (!Number.isInteger(request.deltaDays) || request.deltaDays === 0)
  ) {
    return blockPlan(state, request, counts, 'non_zero_integer_delta_required', warnings);
  }

  const nextState = normalizeState(state);
  const nextById = new Map(nextState.items.map((item) => [item.itemId, item]));
  const changes: DateMovementChange[] = [];
  selectedItems.forEach((item) => {
    const nextItem = nextById.get(item.itemId);
    if (!nextItem) return;
    const beforeDate = resolveItemDate(state, item);
    const afterDate = targetDateFor(request, beforeDate);
    const beforeOwnership = getOwnership(item);
    const afterOwnership: DateMovementOwnership = afterDate ? 'fixed' : 'unscheduled';
    const afterSchedule = afterDate
      ? buildFixedSchedule(item.schedule, afterDate)
      : undefined;
    nextItem.schedule = afterSchedule;
    nextItem.dateOwnership = afterOwnership;
    if (afterDate) nextItem.effectiveDate = afterDate;
    else delete nextItem.effectiveDate;
    delete nextItem.linkedDayOffset;
    changes.push(
      makeChange({
        item,
        kind: 'item_schedule',
        beforeDate,
        afterDate,
        beforeOwnership,
        afterOwnership,
        beforeSchedule: item.schedule,
        afterSchedule,
      }),
    );
  });
  counts.changedCount = changes.length;
  return completePlan({
    previousState: state,
    nextState,
    request,
    counts,
    changes,
    warnings,
  });
}

function planAnchorMovement(
  state: DateMovementState,
  request: DateMovementRequest,
): DateMovementPlan {
  const counts = emptyCounts();
  if (request.operation === 'remove_date') {
    return blockPlan(state, request, counts, 'anchor_date_cannot_be_removed');
  }
  if (!isPersonalStructuralPlainDate(state.anchorDate)) {
    return blockPlan(state, request, counts, 'current_anchor_date_required');
  }
  const targetDate = targetDateFor(request, state.anchorDate);
  if (!targetDate) {
    return blockPlan(state, request, counts, 'valid_target_date_required');
  }
  const nextState = normalizeState(state);
  nextState.anchorDate = targetDate;
  const changes: DateMovementChange[] = [];
  nextState.items.forEach((nextItem, index) => {
    const item = state.items[index];
    const ownership = getOwnership(item);
    if (ownership === 'fixed') {
      counts.fixedKeptCount += 1;
      return;
    }
    if (ownership === 'unscheduled') {
      counts.unscheduledKeptCount += 1;
      return;
    }
    const beforeDate = resolveItemDate(state, item);
    const explicitOffset = item.schedule?.mode === 'anchor_offset'
      ? item.schedule.dayOffset
      : item.linkedDayOffset;
    const linkedDayOffset = Number.isInteger(explicitOffset)
      ? (explicitOffset as number)
      : beforeDate
        ? daysBetween(state.anchorDate as string, beforeDate)
        : undefined;
    const afterDate = Number.isInteger(linkedDayOffset)
      ? addPlainDateDays(targetDate, linkedDayOffset as number)
      : undefined;
    if (afterDate) nextItem.effectiveDate = afterDate;
    if (Number.isInteger(linkedDayOffset)) nextItem.linkedDayOffset = linkedDayOffset;
    counts.linkedRecalculatedCount += 1;
    changes.push(
      makeChange({
        item,
        kind: 'anchor_projection',
        beforeDate,
        afterDate,
        beforeOwnership: 'linked',
        afterOwnership: 'linked',
        beforeSchedule: item.schedule,
        afterSchedule: item.schedule,
      }),
    );
  });
  counts.changedCount = changes.length;
  return completePlan({
    previousState: state,
    nextState,
    request,
    counts,
    changes,
    warnings: [],
  });
}

function normalizeSeriesForItem(
  state: DateMovementState,
  item: DateMovementItem,
): { series?: PersonalStructuralRecurrenceSeries; warnings: string[] } {
  if (item.schedule?.mode !== 'fixed_date') {
    return { warnings: ['recurrence_requires_fixed_date'] };
  }
  const normalized = normalizePersonalStructuralRecurrence({
    value: item.schedule.repeat,
    identityNamespace: state.identityNamespace,
    itemId: item.itemId,
    startDate: item.schedule.date,
    time: item.schedule.time,
    durationMinutes: item.schedule.durationMinutes,
    timeZone: item.schedule.timeZone,
    fallbackTimestamp: new Date(0).toISOString(),
  });
  return { series: normalized.series, warnings: normalized.warnings };
}

function getActiveRule(
  series: PersonalStructuralRecurrenceSeries,
  date: string,
) {
  return [...series.revisions]
    .filter((revision) => revision.effectiveFrom <= date)
    .sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom))[0];
}

function shiftWeekdays(
  weekdays: PersonalStructuralWeekday[] | undefined,
  deltaDays: number,
): PersonalStructuralWeekday[] | undefined {
  if (!weekdays) return undefined;
  return weekdays
    .map((weekday) => {
      const index = WEEKDAYS.indexOf(weekday);
      return WEEKDAYS[(index + (deltaDays % 7) + 7) % 7];
    })
    .sort((left, right) => WEEKDAYS.indexOf(left) - WEEKDAYS.indexOf(right));
}

function shiftRecurrenceRule(
  rule: PersonalStructuralRecurrenceRule,
  deltaDays: number,
  targetDate: string,
): PersonalStructuralRecurrenceRule {
  const end = rule.end?.mode === 'until'
    ? {
        mode: 'until' as const,
        date: addPlainDateDays(rule.end.date, deltaDays) ?? rule.end.date,
      }
    : rule.end
      ? cloneValue(rule.end)
      : undefined;
  return {
    ...cloneValue(rule),
    ...(rule.frequency === 'weekly'
      ? { weekdays: shiftWeekdays(rule.weekdays, deltaDays) }
      : {}),
    ...(rule.frequency === 'monthly'
      ? { dayOfMonth: Number(targetDate.slice(8, 10)) }
      : {}),
    ...(end ? { end } : {}),
  };
}

function addGapExclusions(options: {
  state: DateMovementState;
  item: DateMovementItem;
  series: PersonalStructuralRecurrenceSeries;
  fromDate: string;
  untilBeforeDate: string;
  updatedAt: string;
}): PersonalStructuralRecurrenceSeries {
  const lastGapDate = addPlainDateDays(options.untilBeforeDate, -1);
  if (!lastGapDate || options.fromDate > lastGapDate || !options.item.schedule) {
    return options.series;
  }
  const projected = generatePersonalStructuralOccurrences({
    identityNamespace: options.state.identityNamespace,
    itemId: options.item.itemId,
    schedule: {
      ...options.item.schedule,
      ...(options.item.schedule.mode === 'fixed_date'
        ? { repeat: options.series }
        : {}),
    },
    range: { start: options.fromDate, end: lastGapDate },
    executionRecords: options.state.occurrenceExecutionRecords,
    fallbackTimestamp: options.updatedAt,
  });
  return projected.occurrences.reduce(
    (series, occurrence) =>
      setPersonalStructuralOccurrenceOverride({
        series,
        override: {
          occurrenceId: occurrence.occurrenceId,
          mode: 'exclude',
          updatedAt: options.updatedAt,
        },
      }),
    options.series,
  );
}

function planRecurringMovement(
  state: DateMovementState,
  request: DateMovementRequest,
): DateMovementPlan {
  const counts = emptyCounts();
  const occurrence = request.occurrence;
  if (!occurrence) {
    return blockPlan(state, request, counts, 'occurrence_context_required');
  }
  const item = state.items.find((candidate) => candidate.itemId === occurrence.itemId);
  if (!item) {
    return blockPlan(state, request, counts, 'occurrence_item_not_found');
  }
  counts.selectedCount = 1;
  countExecutionState(counts, occurrence.executionState);
  if (request.operation === 'remove_date') {
    return blockPlan(
      state,
      request,
      counts,
      'recurrence_date_removal_requires_skip_or_series_end',
    );
  }
  if (
    !isPersonalStructuralPlainDate(occurrence.currentDate) ||
    !isPersonalStructuralPlainDate(occurrence.originalDate)
  ) {
    return blockPlan(state, request, counts, 'valid_occurrence_date_required');
  }
  const targetDate = targetDateFor(request, occurrence.currentDate);
  if (!targetDate) {
    return blockPlan(state, request, counts, 'valid_target_date_required');
  }
  const normalized = normalizeSeriesForItem(state, item);
  if (!normalized.series) {
    return blockPlan(
      state,
      request,
      counts,
      'recurring_series_required',
      normalized.warnings,
    );
  }
  if (normalized.series.seriesId !== occurrence.seriesId) {
    return blockPlan(
      state,
      request,
      counts,
      'occurrence_series_identity_mismatch',
      normalized.warnings,
    );
  }
  const nextState = normalizeState(state);
  const nextItem = nextState.items.find((candidate) => candidate.itemId === item.itemId);
  if (!nextItem || nextItem.schedule?.mode !== 'fixed_date') {
    return blockPlan(state, request, counts, 'fixed_date_series_required');
  }

  if (request.scope === 'occurrence') {
    const nextSeries = setPersonalStructuralOccurrenceOverride({
      series: normalized.series,
      override: {
        occurrenceId: occurrence.occurrenceId,
        mode: 'reschedule',
        schedule: {
          date: targetDate,
          ...(occurrence.time ? { time: occurrence.time } : {}),
          ...(occurrence.time && occurrence.durationMinutes
            ? { durationMinutes: occurrence.durationMinutes }
            : {}),
          ...(occurrence.time && occurrence.timeZone
            ? { timeZone: occurrence.timeZone }
            : {}),
        },
        updatedAt: request.updatedAt,
      },
    });
    nextItem.schedule.repeat = nextSeries;
    counts.changedCount = 1;
    counts.occurrenceChangedCount = 1;
    return completePlan({
      previousState: state,
      nextState,
      request,
      counts,
      changes: [
        makeChange({
          item,
          kind: 'occurrence_override',
          beforeDate: occurrence.currentDate,
          afterDate: targetDate,
          beforeOwnership: 'fixed',
          afterOwnership: 'fixed',
          beforeSchedule: item.schedule,
          afterSchedule: nextItem.schedule,
          occurrence,
          revisionIdAfter: occurrence.revisionId,
        }),
      ],
      warnings: normalized.warnings,
    });
  }

  const executionRecords = (state.occurrenceExecutionRecords ?? []).filter(
    (record) => record.seriesId === normalized.series?.seriesId,
  );
  const hasHistory = executionRecords.length > 0;
  const currentStateCanCutOver =
    occurrence.executionState === 'pending' || occurrence.executionState === 'reopened';
  if (hasHistory && !currentStateCanCutOver) {
    return blockPlan(
      state,
      request,
      counts,
      'series_cutover_requires_pending_or_reopened_occurrence',
      normalized.warnings,
    );
  }
  if (
    (request.scope === 'future_series' || hasHistory) &&
    targetDate < occurrence.currentDate
  ) {
    return blockPlan(
      state,
      request,
      counts,
      'backward_series_shift_requires_explicit_cutover_policy',
      normalized.warnings,
    );
  }
  const activeRevision = getActiveRule(normalized.series, occurrence.originalDate);
  if (!activeRevision) {
    return blockPlan(
      state,
      request,
      counts,
      'active_recurrence_revision_not_found',
      normalized.warnings,
    );
  }
  const deltaDays = daysBetween(occurrence.currentDate, targetDate);
  const shiftedRule = shiftRecurrenceRule(activeRevision.rule, deltaDays, targetDate);
  const scheduleTemplate = {
    ...(occurrence.time ? { time: occurrence.time } : {}),
    ...(occurrence.time && occurrence.durationMinutes
      ? { durationMinutes: occurrence.durationMinutes }
      : {}),
    ...(occurrence.time && occurrence.timeZone
      ? { timeZone: occurrence.timeZone }
      : {}),
  };
  const editScope = request.scope === 'future_series' ? 'future' : 'all';
  let seriesBeforeRevision = normalized.series;
  if (
    targetDate > occurrence.currentDate &&
    (request.scope === 'future_series' || hasHistory)
  ) {
    seriesBeforeRevision = addGapExclusions({
      state,
      item,
      series: seriesBeforeRevision,
      fromDate: occurrence.currentDate,
      untilBeforeDate: targetDate,
      updatedAt: request.updatedAt,
    });
  }
  const nextSeries = appendPersonalStructuralRecurrenceRevision({
    series: seriesBeforeRevision,
    scope: editScope,
    effectiveFrom: targetDate,
    rule: shiftedRule,
    ...(Object.keys(scheduleTemplate).length > 0 ? { scheduleTemplate } : {}),
    updatedAt: request.updatedAt,
    executionRecordCount: executionRecords.length,
  });
  nextItem.schedule.repeat = nextSeries;
  if (request.scope === 'whole_series' && !hasHistory) {
    nextItem.schedule.date = targetDate;
    nextItem.effectiveDate = targetDate;
  }
  const revisionAfter = nextSeries.revisions.find(
    (revision) =>
      revision.effectiveFrom === targetDate && revision.updatedAt === request.updatedAt,
  ) ?? nextSeries.revisions.at(-1);
  counts.changedCount = 1;
  counts.seriesRevisionCount = 1;
  const warnings = [
    ...normalized.warnings,
    ...(hasHistory && request.scope === 'whole_series'
      ? ['whole_series_history_preserved_as_new_revision']
      : []),
  ];
  return completePlan({
    previousState: state,
    nextState,
    request,
    counts,
    changes: [
      makeChange({
        item,
        kind: 'series_revision',
        beforeDate: occurrence.currentDate,
        afterDate: targetDate,
        beforeOwnership: 'fixed',
        afterOwnership: 'fixed',
        beforeSchedule: item.schedule,
        afterSchedule: nextItem.schedule,
        occurrence,
        revisionIdAfter: revisionAfter?.revisionId,
      }),
    ],
    warnings,
  });
}

export function planDateMovement(
  state: DateMovementState,
  request: DateMovementRequest,
): DateMovementPlan {
  const counts = emptyCounts();
  if (!state.identityNamespace.trim()) {
    return blockPlan(state, request, counts, 'identity_namespace_required');
  }
  if (!Number.isFinite(Date.parse(request.updatedAt))) {
    return blockPlan(state, request, counts, 'valid_updated_at_required');
  }
  if (request.scope === 'anchor') return planAnchorMovement(state, request);
  if (
    request.scope === 'occurrence' ||
    request.scope === 'future_series' ||
    request.scope === 'whole_series'
  ) {
    return planRecurringMovement(state, request);
  }
  return planDirectItems(state, request);
}

export function applyDateMovementPlan(
  state: DateMovementState,
  plan: DateMovementPlan,
): DateMovementState {
  if (!plan.canApply) {
    throw new Error(plan.blockedReason ?? 'Date movement plan cannot be applied.');
  }
  const normalized = normalizeState(state);
  if (fingerprint(normalized) !== plan.sourceFingerprint) {
    throw new Error('Date movement plan is stale.');
  }
  return normalizeState(plan.nextState);
}

export function undoDateMovementPlan(
  state: DateMovementState,
  plan: DateMovementPlan,
): DateMovementState {
  const normalized = normalizeState(state);
  if (fingerprint(normalized) !== plan.resultFingerprint) {
    throw new Error('Date movement undo target does not match the applied plan.');
  }
  return normalizeState(plan.previousState);
}
