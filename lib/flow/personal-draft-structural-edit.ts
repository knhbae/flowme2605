import {
  createEmptyPersonalStructuralOverlay,
  resolvePersonalStructuralItems,
  restorePersonalStructuralItem,
  setPersonalStructuralOrder,
  tombstonePersonalStructuralItem,
  upsertPersonalStructuralUserItem,
  type PersonalStructuralItemOwnership,
  type PersonalStructuralOverlay,
  type PersonalStructuralSchedule,
  type PersonalStructuralSourceItem,
  type PersonalStructuralUserItem,
  type ResolvePersonalStructuralItemsResult,
} from './personal-structural-overlay';
import type { FlowBundle, FlowItem } from './types';
import {
  PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES,
  PERSONAL_STRUCTURAL_MAX_DURATION_MINUTES,
  PERSONAL_STRUCTURAL_MIN_DURATION_MINUTES,
  isPersonalStructuralIanaTimeZone,
  isPersonalStructuralLocalTime,
} from './personal-structural-schedule';
import {
  appendPersonalStructuralRecurrenceRevision,
  createPersonalStructuralRecurrenceSeries,
  normalizePersonalStructuralRecurrence,
  normalizePersonalStructuralRecurrenceRule,
  PERSONAL_STRUCTURAL_RECURRENCE_MAX_COUNT,
  PERSONAL_STRUCTURAL_RECURRENCE_MAX_INTERVAL,
  type PersonalStructuralRecurrenceEnd,
  type PersonalStructuralRecurrenceRule,
  type PersonalStructuralWeekday,
} from './personal-structural-recurrence';

const PERSONAL_DRAFT_TAG = '내 초안';
const PERSONAL_DRAFT_SOURCE_TITLES = new Set(['내 메모', '사용자가 넣은 링크']);

export type PersonalDraftStructuralUndo = {
  flowSlug: string;
  itemId: string;
  ownership: PersonalStructuralItemOwnership;
  title: string;
};

export type PersonalDraftStructuralMoveDirection = 'up' | 'down';
export type PersonalDraftUserItemScheduleMode = 'all_day' | 'timed';
export type PersonalDraftUserItemRecurrenceMode =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly';
export type PersonalDraftUserItemRecurrenceEndMode = 'never' | 'until' | 'count';

function isPlainIsoDate(value: string): boolean {
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

function mergeKnownOrderWithPreservedUnknownIds(
  currentOrderOverride: string[],
  orderedKnownIds: string[],
): string[] {
  const knownIds = new Set(orderedKnownIds);
  const pendingKnownIds = [...orderedKnownIds];
  const merged: string[] = [];

  currentOrderOverride.forEach((itemId) => {
    if (!knownIds.has(itemId)) {
      merged.push(itemId);
      return;
    }
    const nextKnownId = pendingKnownIds.shift();
    if (nextKnownId) merged.push(nextKnownId);
  });

  return [...merged, ...pendingKnownIds];
}

export function isPersonalDraftStructuralEditEligible(bundle: FlowBundle): boolean {
  return Boolean(
    bundle.flow.status === 'draft' &&
      bundle.flow.slug.startsWith('url-draft-') &&
      bundle.flow.tags?.includes(PERSONAL_DRAFT_TAG) &&
      bundle.flow.source_title &&
      PERSONAL_DRAFT_SOURCE_TITLES.has(bundle.flow.source_title),
  );
}

export function createPersonalDraftStructuralOverlay(bundle: FlowBundle): PersonalStructuralOverlay {
  return createEmptyPersonalStructuralOverlay({
    savedCopyId: bundle.flow.slug,
    flowId: bundle.flow.id,
  });
}

export function getPersonalDraftStructuralSourceItems(
  bundle: FlowBundle,
): PersonalStructuralSourceItem<FlowItem>[] {
  return bundle.items.map((item) => ({
    itemId: item.id,
    title: item.title,
    order: item.order,
    ...(typeof item.day_offset === 'number'
      ? { schedule: { mode: 'anchor_offset' as const, dayOffset: item.day_offset } }
      : {}),
    source: item,
  }));
}

export function resolvePersonalDraftStructuralItems(
  bundle: FlowBundle,
  overlay: PersonalStructuralOverlay,
): ResolvePersonalStructuralItemsResult<FlowItem> {
  return resolvePersonalStructuralItems({
    sourceItems: getPersonalDraftStructuralSourceItems(bundle),
    structuralOverlay: overlay,
  });
}

export function createPersonalDraftUserItem(options: {
  overlay: PersonalStructuralOverlay;
  title: string;
  itemId: string;
  createdAt?: string;
}): { overlay: PersonalStructuralOverlay; userItem: PersonalStructuralUserItem } | undefined {
  const title = options.title.replace(/\s+/g, ' ').trim();
  const itemId = options.itemId.trim();
  if (!title || !itemId) return undefined;

  const createdAt = options.createdAt ?? new Date().toISOString();
  const orderKey = options.overlay.userItems.reduce(
    (largest, item) => Math.max(largest, item.orderKey),
    options.overlay.orderOverride.length - 1,
  ) + 1;
  const userItem: PersonalStructuralUserItem = {
    itemId,
    provenance: 'user_created',
    title,
    createdAt,
    orderKey,
  };
  const nextOverlay = upsertPersonalStructuralUserItem(
    options.overlay,
    userItem,
    createdAt,
  );

  return {
    overlay: nextOverlay,
    userItem,
  };
}

export function setPersonalDraftUserItemDate(options: {
  overlay: PersonalStructuralOverlay;
  itemId: string;
  date: string;
  updatedAt?: string;
}): { overlay: PersonalStructuralOverlay; userItem: PersonalStructuralUserItem } | undefined {
  const current = options.overlay.userItems.find(
    (item) => item.itemId === options.itemId.trim(),
  );
  const currentSchedule = current?.schedule?.mode === 'fixed_date'
    ? current.schedule
    : undefined;
  return setPersonalDraftUserItemSchedule({
    ...options,
    mode: currentSchedule?.time ? 'timed' : 'all_day',
    time: currentSchedule?.time,
    durationMinutes: currentSchedule?.durationMinutes,
    timeZone: currentSchedule?.timeZone,
  });
}

export function setPersonalDraftUserItemSchedule(options: {
  overlay: PersonalStructuralOverlay;
  itemId: string;
  date: string;
  mode: PersonalDraftUserItemScheduleMode;
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
  updatedAt?: string;
}): { overlay: PersonalStructuralOverlay; userItem: PersonalStructuralUserItem } | undefined {
  const itemId = options.itemId.trim();
  const date = options.date.trim();
  const current = options.overlay.userItems.find((item) => item.itemId === itemId);
  if (!current || (date && !isPlainIsoDate(date))) return undefined;

  const { schedule: currentSchedule, ...userItemWithoutSchedule } = current;
  const preservedRepeat = currentSchedule?.mode === 'fixed_date'
    ? currentSchedule.repeat
    : undefined;
  let schedule: PersonalStructuralSchedule | undefined;

  if (date) {
    if (options.mode === 'timed') {
      const time = options.time?.trim();
      if (!isPersonalStructuralLocalTime(time)) return undefined;
      const durationMinutes =
        typeof options.durationMinutes === 'number' &&
        Number.isInteger(options.durationMinutes) &&
        options.durationMinutes >= PERSONAL_STRUCTURAL_MIN_DURATION_MINUTES &&
        options.durationMinutes <= PERSONAL_STRUCTURAL_MAX_DURATION_MINUTES
          ? options.durationMinutes
          : PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES;
      const timeZone = isPersonalStructuralIanaTimeZone(options.timeZone)
        ? options.timeZone.trim()
        : undefined;
      schedule = {
        mode: 'fixed_date',
        date,
        time,
        durationMinutes,
        ...(timeZone ? { timeZone } : {}),
        ...(preservedRepeat ? { repeat: preservedRepeat } : {}),
      };
    } else {
      schedule = {
        mode: 'fixed_date',
        date,
        ...(preservedRepeat ? { repeat: preservedRepeat } : {}),
      };
    }
  }

  const userItem: PersonalStructuralUserItem = {
    ...userItemWithoutSchedule,
    ...(schedule ? { schedule } : {}),
  };
  const updatedAt = options.updatedAt ?? new Date().toISOString();

  return {
    overlay: upsertPersonalStructuralUserItem(options.overlay, userItem, updatedAt),
    userItem,
  };
}

export function setPersonalDraftUserItemRecurrence(options: {
  overlay: PersonalStructuralOverlay;
  itemId: string;
  mode: PersonalDraftUserItemRecurrenceMode;
  interval?: number;
  weekdays?: PersonalStructuralWeekday[];
  endMode?: PersonalDraftUserItemRecurrenceEndMode;
  untilDate?: string;
  occurrenceCount?: number;
  executionRecordCount?: number;
  updatedAt?: string;
}): { overlay: PersonalStructuralOverlay; userItem: PersonalStructuralUserItem } | undefined {
  const itemId = options.itemId.trim();
  const current = options.overlay.userItems.find((item) => item.itemId === itemId);
  if (!current || current.schedule?.mode !== 'fixed_date') return undefined;

  const updatedAt = options.updatedAt ?? new Date().toISOString();
  const { repeat: _currentRepeat, ...scheduleWithoutRepeat } = current.schedule;

  if (options.mode === 'none') {
    const userItem: PersonalStructuralUserItem = {
      ...current,
      schedule: scheduleWithoutRepeat,
    };
    return {
      overlay: upsertPersonalStructuralUserItem(options.overlay, userItem, updatedAt),
      userItem,
    };
  }

  const interval = options.interval ?? 1;
  if (
    !Number.isInteger(interval) ||
    interval < 1 ||
    interval > PERSONAL_STRUCTURAL_RECURRENCE_MAX_INTERVAL
  ) {
    return undefined;
  }
  if (options.mode === 'weekly' && !options.weekdays?.length) return undefined;

  let end: PersonalStructuralRecurrenceEnd | undefined;
  if (options.endMode === 'until') {
    if (
      !options.untilDate ||
      !isPlainIsoDate(options.untilDate) ||
      options.untilDate < current.schedule.date
    ) {
      return undefined;
    }
    end = { mode: 'until', date: options.untilDate };
  } else if (options.endMode === 'count') {
    if (
      typeof options.occurrenceCount !== 'number' ||
      !Number.isInteger(options.occurrenceCount) ||
      options.occurrenceCount < 1 ||
      options.occurrenceCount > PERSONAL_STRUCTURAL_RECURRENCE_MAX_COUNT
    ) {
      return undefined;
    }
    end = { mode: 'count', count: options.occurrenceCount };
  }
  const normalizedRule = normalizePersonalStructuralRecurrenceRule(
    {
      frequency: options.mode,
      interval,
      ...(options.mode === 'weekly' ? { weekdays: options.weekdays } : {}),
      ...(options.mode === 'monthly'
        ? {
            dayOfMonth: Number(current.schedule.date.slice(8, 10)),
            invalidMonthDayPolicy: 'skip',
          }
        : {}),
      ...(end ? { end } : {}),
    },
    { effectiveFrom: current.schedule.date },
  );
  if (!normalizedRule.rule) return undefined;

  const scheduleTemplate = {
    ...(current.schedule.time ? { time: current.schedule.time } : {}),
    ...(current.schedule.durationMinutes
      ? { durationMinutes: current.schedule.durationMinutes }
      : {}),
    ...(current.schedule.timeZone ? { timeZone: current.schedule.timeZone } : {}),
  };
  const existing = normalizePersonalStructuralRecurrence({
    value: current.schedule.repeat,
    identityNamespace: options.overlay.savedCopyId,
    itemId,
    startDate: current.schedule.date,
    time: current.schedule.time,
    durationMinutes: current.schedule.durationMinutes,
    timeZone: current.schedule.timeZone,
    fallbackTimestamp: updatedAt,
  }).series;
  const repeat = existing
    ? appendPersonalStructuralRecurrenceRevision({
        series: existing,
        scope: (options.executionRecordCount ?? 0) > 0 ? 'future' : 'all',
        effectiveFrom: current.schedule.date,
        rule: normalizedRule.rule,
        ...(Object.keys(scheduleTemplate).length > 0 ? { scheduleTemplate } : {}),
        updatedAt,
        executionRecordCount: options.executionRecordCount ?? 0,
      })
    : createPersonalStructuralRecurrenceSeries({
        identityNamespace: options.overlay.savedCopyId,
        itemId,
        effectiveFrom: current.schedule.date,
        rule: normalizedRule.rule,
        ...(Object.keys(scheduleTemplate).length > 0 ? { scheduleTemplate } : {}),
        updatedAt,
      });
  const userItem: PersonalStructuralUserItem = {
    ...current,
    schedule: {
      ...scheduleWithoutRepeat,
      repeat,
    },
  };
  return {
    overlay: upsertPersonalStructuralUserItem(options.overlay, userItem, updatedAt),
    userItem,
  };
}

export function deletePersonalDraftStructuralItem(options: {
  bundle: FlowBundle;
  overlay: PersonalStructuralOverlay;
  itemId: string;
  deletedAt?: string;
}): { overlay: PersonalStructuralOverlay; undo: PersonalDraftStructuralUndo } | undefined {
  const resolved = resolvePersonalDraftStructuralItems(options.bundle, options.overlay);
  const item = resolved.effectiveItems.find((entry) => entry.itemId === options.itemId);
  if (!item) return undefined;

  const deletedAt = options.deletedAt ?? new Date().toISOString();
  const orderedOverlay = setPersonalStructuralOrder(
    options.overlay,
    mergeKnownOrderWithPreservedUnknownIds(
      options.overlay.orderOverride,
      resolved.allItems.map((entry) => entry.itemId),
    ),
    deletedAt,
  );
  return {
    overlay: tombstonePersonalStructuralItem(orderedOverlay, {
      itemId: item.itemId,
      ownership: item.ownership,
      deletedAt,
    }),
    undo: {
      flowSlug: options.bundle.flow.slug,
      itemId: item.itemId,
      ownership: item.ownership,
      title: item.title,
    },
  };
}

export function undoPersonalDraftStructuralDelete(options: {
  overlay: PersonalStructuralOverlay;
  undo: PersonalDraftStructuralUndo;
  restoredAt?: string;
}): PersonalStructuralOverlay {
  return restorePersonalStructuralItem(
    options.overlay,
    options.undo.itemId,
    options.restoredAt,
  );
}

export function restorePersonalDraftStructuralItem(options: {
  bundle: FlowBundle;
  overlay: PersonalStructuralOverlay;
  itemId: string;
  restoredAt?: string;
}): PersonalStructuralOverlay | undefined {
  const resolved = resolvePersonalDraftStructuralItems(options.bundle, options.overlay);
  if (!resolved.tombstonedItems.some((item) => item.itemId === options.itemId)) return undefined;
  return restorePersonalStructuralItem(options.overlay, options.itemId, options.restoredAt);
}

export function movePersonalDraftStructuralItem(options: {
  bundle: FlowBundle;
  overlay: PersonalStructuralOverlay;
  itemId: string;
  direction: PersonalDraftStructuralMoveDirection;
  movedAt?: string;
}): PersonalStructuralOverlay | undefined {
  const resolved = resolvePersonalDraftStructuralItems(options.bundle, options.overlay);
  const visibleItemIds = resolved.effectiveItems.map((item) => item.itemId);
  const currentIndex = visibleItemIds.indexOf(options.itemId);
  if (currentIndex < 0) return undefined;

  const targetIndex = options.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= visibleItemIds.length) return undefined;

  const reorderedVisibleIds = [...visibleItemIds];
  [reorderedVisibleIds[currentIndex], reorderedVisibleIds[targetIndex]] = [
    reorderedVisibleIds[targetIndex],
    reorderedVisibleIds[currentIndex],
  ];

  let visibleIndex = 0;
  const reorderedKnownIds = resolved.allItems.map((item) => {
    if (!item.included || item.tombstoned) return item.itemId;
    const nextItemId = reorderedVisibleIds[visibleIndex];
    visibleIndex += 1;
    return nextItemId;
  });

  return setPersonalStructuralOrder(
    options.overlay,
    mergeKnownOrderWithPreservedUnknownIds(options.overlay.orderOverride, reorderedKnownIds),
    options.movedAt,
  );
}
