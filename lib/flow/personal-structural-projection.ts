import {
  resolvePersonalStructuralItems,
  type PersonalItemValueOverlay,
  type PersonalStructuralExecutionState,
  type PersonalStructuralItemOwnership,
  type PersonalStructuralOverlay,
  type PersonalStructuralSchedule,
  type PersonalStructuralSourceItem,
  type PersonalStructuralUserItem,
} from './personal-structural-overlay';
import {
  getPersonalDraftStructuralSourceItems,
  isPersonalDraftStructuralEditEligible,
} from './personal-draft-structural-edit';
import {
  buildPersonalStructuralScheduleProjection,
  type PersonalStructuralScheduleProjection,
} from './personal-structural-schedule';
import type { FlowBundle, FlowItem } from './types';

export const PERSONAL_STRUCTURAL_PROJECTION_DESTINATIONS = [
  'myFlow',
  'calendarScreen',
  'calendarIcs',
  'checklist',
  'sheet',
  'memo',
] as const;

export type PersonalStructuralProjectionDestination =
  (typeof PERSONAL_STRUCTURAL_PROJECTION_DESTINATIONS)[number];

export type PersonalStructuralProjectionDestinationEligibility = Record<
  PersonalStructuralProjectionDestination,
  boolean
>;

export type PersonalStructuralProjectionRow<TSource = unknown> = {
  itemId: string;
  ownership: PersonalStructuralItemOwnership;
  title: string;
  personalMemo?: string;
  schedule?: PersonalStructuralSchedule;
  scheduleProjection: PersonalStructuralScheduleProjection;
  calendarDate?: string;
  personalOrderRank: number;
  included: boolean;
  excluded: boolean;
  tombstoned: boolean;
  destinationEligibility: PersonalStructuralProjectionDestinationEligibility;
  executionState?: PersonalStructuralExecutionState;
  sourceItem?: PersonalStructuralSourceItem<TSource>;
  userItem?: PersonalStructuralUserItem;
};

export type PersonalStructuralProjectionResult<TSource = unknown> = {
  allRows: PersonalStructuralProjectionRow<TSource>[];
  effectiveRows: PersonalStructuralProjectionRow<TSource>[];
  tombstonedRows: PersonalStructuralProjectionRow<TSource>[];
  excludedRows: PersonalStructuralProjectionRow<TSource>[];
  rowsByDestination: Record<
    PersonalStructuralProjectionDestination,
    PersonalStructuralProjectionRow<TSource>[]
  >;
  warnings: string[];
};

function compareCalendarRows<TSource>(
  left: PersonalStructuralProjectionRow<TSource>,
  right: PersonalStructuralProjectionRow<TSource>,
): number {
  const leftSchedule = left.scheduleProjection;
  const rightSchedule = right.scheduleProjection;
  const stateRank = (state: PersonalStructuralScheduleProjection['scheduleState']) =>
    state === 'all_day' ? 0 : state === 'timed' ? 1 : 2;
  return (
    (left.calendarDate ?? '').localeCompare(right.calendarDate ?? '') ||
    stateRank(leftSchedule.scheduleState) - stateRank(rightSchedule.scheduleState) ||
    (leftSchedule.startTime ?? '').localeCompare(rightSchedule.startTime ?? '') ||
    left.personalOrderRank - right.personalOrderRank ||
    left.itemId.localeCompare(right.itemId)
  );
}

function createRowsByDestination<TSource>(
  rows: PersonalStructuralProjectionRow<TSource>[],
): PersonalStructuralProjectionResult<TSource>['rowsByDestination'] {
  const result = Object.fromEntries(
    PERSONAL_STRUCTURAL_PROJECTION_DESTINATIONS.map((destination) => [
      destination,
      rows.filter((row) => row.destinationEligibility[destination]),
    ]),
  ) as PersonalStructuralProjectionResult<TSource>['rowsByDestination'];
  result.calendarScreen = [...result.calendarScreen].sort(compareCalendarRows);
  result.calendarIcs = [...result.calendarIcs].sort(compareCalendarRows);
  return result;
}

export function buildPersonalStructuralProjection<TSource>(options: {
  sourceItems: PersonalStructuralSourceItem<TSource>[];
  structuralOverlay: PersonalStructuralOverlay;
  valueOverlays?: PersonalItemValueOverlay[];
  executionStates?: PersonalStructuralExecutionState[];
  anchorDate?: string;
}): PersonalStructuralProjectionResult<TSource> {
  const resolved = resolvePersonalStructuralItems({
    sourceItems: options.sourceItems,
    structuralOverlay: options.structuralOverlay,
    valueOverlays: options.valueOverlays,
    executionStates: options.executionStates,
  });
  const warnings = [...resolved.warnings];

  const allRows = resolved.allItems.map((item) => {
    const scheduleProjection = buildPersonalStructuralScheduleProjection({
      schedule: item.schedule,
      anchorDate: options.anchorDate,
      identityNamespace: options.structuralOverlay.savedCopyId,
      itemId: item.itemId,
    });
    const calendarDate = scheduleProjection.calendarDate;
    scheduleProjection.validationWarnings.forEach((warning) => {
      warnings.push(`schedule:${item.itemId}:${warning}`);
    });
    if (item.projectionEligibility.calendar && !calendarDate) {
      warnings.push(
        item.schedule?.mode === 'fixed_date'
          ? `invalid_fixed_date:${item.itemId}`
          : `unresolved_anchor_offset:${item.itemId}`,
      );
    }
    const visible = item.included && !item.tombstoned;
    const calendarReady = item.projectionEligibility.calendar && Boolean(calendarDate);
    return {
      itemId: item.itemId,
      ownership: item.ownership,
      title: item.title,
      ...(item.personalMemo ? { personalMemo: item.personalMemo } : {}),
      ...(item.schedule ? { schedule: item.schedule } : {}),
      scheduleProjection,
      ...(calendarDate ? { calendarDate } : {}),
      personalOrderRank: item.orderIndex,
      included: item.included,
      excluded: !item.included,
      tombstoned: item.tombstoned,
      destinationEligibility: {
        myFlow: visible,
        calendarScreen: calendarReady,
        calendarIcs: calendarReady,
        checklist: item.projectionEligibility.checklist,
        sheet: item.projectionEligibility.sheet,
        memo: item.projectionEligibility.memo,
      },
      ...(item.executionState ? { executionState: item.executionState } : {}),
      ...(item.sourceItem ? { sourceItem: item.sourceItem } : {}),
      ...(item.userItem ? { userItem: item.userItem } : {}),
    } satisfies PersonalStructuralProjectionRow<TSource>;
  });

  return {
    allRows,
    effectiveRows: allRows.filter((row) => row.destinationEligibility.myFlow),
    tombstonedRows: allRows.filter((row) => row.tombstoned),
    excludedRows: allRows.filter((row) => !row.included && !row.tombstoned),
    rowsByDestination: createRowsByDestination(allRows),
    warnings,
  };
}

export function buildPersonalDraftStructuralProjection(options: {
  bundle: FlowBundle;
  structuralOverlay: PersonalStructuralOverlay;
  valueOverlays?: PersonalItemValueOverlay[];
  executionStates?: PersonalStructuralExecutionState[];
  anchorDate?: string;
}): PersonalStructuralProjectionResult<FlowItem> | undefined {
  if (!isPersonalDraftStructuralEditEligible(options.bundle)) return undefined;
  return buildPersonalStructuralProjection({
    sourceItems: getPersonalDraftStructuralSourceItems(options.bundle),
    structuralOverlay: options.structuralOverlay,
    valueOverlays: options.valueOverlays,
    executionStates: options.executionStates,
    anchorDate: options.anchorDate,
  });
}
