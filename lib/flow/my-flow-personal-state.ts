import {
  normalizePersonalStructuralOccurrenceExecutionRecords,
  type PersonalStructuralOccurrenceExecutionRecord,
} from './personal-structural-occurrence';
import type { PersonalItemDetailOverlay } from './personal-item-detail-overlay';

export const MY_FLOW_ITEM_DRAFTS_STORAGE_KEY = 'flow:my-flow:item-drafts';
export const MY_FLOW_DATE_OVERRIDES_STORAGE_KEY = 'flow:my-flow:date-overrides';
export const MY_FLOW_OCCURRENCE_EXECUTION_STORAGE_KEY =
  'flow:my-flow:occurrence-execution';
export const MY_FLOW_DATE_REMOVED_OVERRIDE = '__flowme_unscheduled__';

export type StoredMyFlowItemDraft = {
  why?: string;
  how?: string;
  completion_criteria?: string;
  caution?: string;
  title?: string;
  date?: string;
  repeatPreset?: string;
  memo?: string;
  location?: string;
  time?: string;
  durationMinutes?: number;
  scheduleMode?: 'all_day' | 'timed';
  recurrenceInterval?: number;
  recurrenceWeekdays?: string[];
  recurrenceEndMode?: 'never' | 'until' | 'count';
  recurrenceUntil?: string;
  recurrenceCount?: number;
  logValue?: string;
  decisionStatus?: 'undecided' | 'buy' | 'hold' | 'reject';
  nextReviewDate?: string;
  detailOverlay?: PersonalItemDetailOverlay;
};

export type MyFlowPersonalExecutionState = {
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
  occurrenceRecords?: Record<string, PersonalStructuralOccurrenceExecutionRecord>;
};

export type MyFlowAnchorDatedItem = {
  itemId: string;
  date?: string;
};

export type MyFlowEffectiveDateSource =
  | 'draft'
  | 'execution_override'
  | 'personal_copy'
  | 'source'
  | 'none';

export type MyFlowEffectiveDateResolution = {
  date?: string;
  originalDate: string;
  overrideKey: string;
  source: MyFlowEffectiveDateSource;
};

export function getMyFlowDateOverrideKey(
  flowSlug: string,
  itemId: string,
  sourceDate?: string,
): string {
  return `${flowSlug}::${itemId}::${sourceDate || 'none'}`;
}

export function resolveMyFlowEffectiveDate(options: {
  flowSlug: string;
  itemId: string;
  sourceDate?: string;
  dateOverrides?: Record<string, string>;
  draftDateOverride?: string;
  personalCopyDateOverride?: string;
}): MyFlowEffectiveDateResolution {
  const originalDate = options.sourceDate?.trim() || 'none';
  const overrideKey = getMyFlowDateOverrideKey(
    options.flowSlug,
    options.itemId,
    options.sourceDate,
  );
  if (options.dateOverrides?.[overrideKey] === MY_FLOW_DATE_REMOVED_OVERRIDE) {
    return {
      originalDate,
      overrideKey,
      source: 'execution_override',
    };
  }
  const candidates: Array<{
    source: Exclude<MyFlowEffectiveDateSource, 'none'>;
    date?: string;
  }> = [
    { source: 'draft', date: options.draftDateOverride },
    {
      source: 'execution_override',
      date: options.dateOverrides?.[overrideKey],
    },
    { source: 'personal_copy', date: options.personalCopyDateOverride },
    { source: 'source', date: options.sourceDate },
  ];
  const resolved = candidates.find((candidate) => candidate.date?.trim());

  return {
    ...(resolved?.date?.trim() ? { date: resolved.date.trim() } : {}),
    originalDate,
    overrideKey,
    source: resolved?.source ?? 'none',
  };
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function readStoredRecord<T>(key: string): Record<string, T> {
  if (!canUseStorage()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, T>
      : {};
  } catch {
    return {};
  }
}

function cloneRecord<T>(record: Record<string, T>): Record<string, T> {
  return JSON.parse(JSON.stringify(record)) as Record<string, T>;
}

export function getStoredMyFlowItemDrafts(): Record<string, StoredMyFlowItemDraft> {
  return readStoredRecord<StoredMyFlowItemDraft>(MY_FLOW_ITEM_DRAFTS_STORAGE_KEY);
}

export function saveStoredMyFlowItemDrafts(drafts: Record<string, StoredMyFlowItemDraft>): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(MY_FLOW_ITEM_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

export function getStoredMyFlowDateOverrides(): Record<string, string> {
  return readStoredRecord<string>(MY_FLOW_DATE_OVERRIDES_STORAGE_KEY);
}

export function saveStoredMyFlowDateOverrides(overrides: Record<string, string>): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(MY_FLOW_DATE_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
}

export function rekeyMyFlowAnchorDatedRecord<T>(
  record: Record<string, T>,
  options: {
    flowSlug: string;
    previousItems: MyFlowAnchorDatedItem[];
    nextItems: MyFlowAnchorDatedItem[];
  },
): Record<string, T> {
  const next = { ...record };
  const nextDateByItemId = new Map(
    options.nextItems
      .filter((item): item is MyFlowAnchorDatedItem & { date: string } => Boolean(item.date))
      .map((item) => [item.itemId, item.date]),
  );

  options.previousItems.forEach((item) => {
    if (!item.date) return;
    const nextDate = nextDateByItemId.get(item.itemId);
    if (!nextDate || nextDate === item.date) return;
    const previousKey = `${options.flowSlug}::${item.itemId}::${item.date}`;
    if (!Object.prototype.hasOwnProperty.call(next, previousKey)) return;
    const nextKey = `${options.flowSlug}::${item.itemId}::${nextDate}`;
    next[nextKey] = next[previousKey];
    delete next[previousKey];
  });

  return next;
}

export function rekeyMyFlowPersonalExecutionStateForAnchor(
  state: MyFlowPersonalExecutionState,
  options: {
    flowSlug: string;
    previousItems: MyFlowAnchorDatedItem[];
    nextItems: MyFlowAnchorDatedItem[];
  },
): MyFlowPersonalExecutionState {
  return {
    itemDrafts: rekeyMyFlowAnchorDatedRecord(state.itemDrafts, options),
    dateOverrides: rekeyMyFlowAnchorDatedRecord(state.dateOverrides, options),
    ...(state.occurrenceRecords
      ? { occurrenceRecords: cloneRecord(state.occurrenceRecords) }
      : {}),
  };
}

export function getMyFlowOccurrenceExecutionStorageKey(
  flowSlug: string,
  occurrenceId: string,
): string {
  return `${flowSlug}::${occurrenceId}`;
}

function normalizeOccurrenceRecordMap(
  value: unknown,
): Record<string, PersonalStructuralOccurrenceExecutionRecord> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      if (!key.trim()) return [];
      const [record] = normalizePersonalStructuralOccurrenceExecutionRecords([
        entry as PersonalStructuralOccurrenceExecutionRecord,
      ]);
      return record ? [[key, record] as const] : [];
    }),
  );
}

export function getStoredMyFlowOccurrenceExecutionRecords(): Record<
  string,
  PersonalStructuralOccurrenceExecutionRecord
> {
  if (!canUseStorage()) return {};
  try {
    return normalizeOccurrenceRecordMap(
      JSON.parse(
        window.localStorage.getItem(MY_FLOW_OCCURRENCE_EXECUTION_STORAGE_KEY) ||
          'null',
      ),
    );
  } catch {
    return {};
  }
}

export function saveStoredMyFlowOccurrenceExecutionRecords(
  records: Record<string, PersonalStructuralOccurrenceExecutionRecord>,
): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(
    MY_FLOW_OCCURRENCE_EXECUTION_STORAGE_KEY,
    JSON.stringify(normalizeOccurrenceRecordMap(records)),
  );
}

export function getFlowOccurrenceExecutionRecords(
  flowSlug: string,
  records: Record<string, PersonalStructuralOccurrenceExecutionRecord> =
    getStoredMyFlowOccurrenceExecutionRecords(),
): PersonalStructuralOccurrenceExecutionRecord[] {
  const prefix = `${flowSlug}::`;
  return Object.entries(records)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, record]) => record);
}

export function cloneMyFlowPersonalExecutionState(
  state: MyFlowPersonalExecutionState,
): MyFlowPersonalExecutionState {
  return {
    itemDrafts: cloneRecord(state.itemDrafts),
    dateOverrides: { ...state.dateOverrides },
    ...(state.occurrenceRecords && Object.keys(state.occurrenceRecords).length > 0
      ? { occurrenceRecords: cloneRecord(state.occurrenceRecords) }
      : {}),
  };
}

export function normalizeMyFlowPersonalExecutionState(value: unknown): MyFlowPersonalExecutionState | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Partial<MyFlowPersonalExecutionState>;
  const itemDrafts = source.itemDrafts && typeof source.itemDrafts === 'object' && !Array.isArray(source.itemDrafts)
    ? cloneRecord(source.itemDrafts as Record<string, StoredMyFlowItemDraft>)
    : {};
  const dateOverrides = source.dateOverrides && typeof source.dateOverrides === 'object' && !Array.isArray(source.dateOverrides)
    ? Object.fromEntries(
        Object.entries(source.dateOverrides).filter(
          ([key, date]) => key.trim().length > 0 && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date),
        ),
      )
    : {};
  const occurrenceRecords = normalizeOccurrenceRecordMap(source.occurrenceRecords);
  return {
    itemDrafts,
    dateOverrides,
    ...(Object.keys(occurrenceRecords).length > 0 ? { occurrenceRecords } : {}),
  };
}

export function getFlowScopedMyFlowPersonalExecutionState(flowSlug: string): MyFlowPersonalExecutionState {
  const prefix = `${flowSlug}::`;
  const occurrenceRecords = Object.fromEntries(
    Object.entries(getStoredMyFlowOccurrenceExecutionRecords()).filter(([key]) =>
      key.startsWith(prefix),
    ),
  );
  return {
    itemDrafts: Object.fromEntries(
      Object.entries(getStoredMyFlowItemDrafts()).filter(([key]) => key.startsWith(prefix)),
    ),
    dateOverrides: Object.fromEntries(
      Object.entries(getStoredMyFlowDateOverrides()).filter(([key]) => key.startsWith(prefix)),
    ),
    ...(Object.keys(occurrenceRecords).length > 0 ? { occurrenceRecords } : {}),
  };
}

export function hasMyFlowPersonalExecutionState(state?: MyFlowPersonalExecutionState): boolean {
  return Boolean(
    state &&
      (Object.keys(state.itemDrafts).length > 0 ||
        Object.keys(state.dateOverrides).length > 0 ||
        Object.keys(state.occurrenceRecords ?? {}).length > 0),
  );
}

export function replaceFlowScopedMyFlowPersonalExecutionState(
  flowSlug: string,
  state: MyFlowPersonalExecutionState = { itemDrafts: {}, dateOverrides: {} },
): MyFlowPersonalExecutionState | undefined {
  if (!canUseStorage()) return undefined;
  const prefix = `${flowSlug}::`;
  const itemDrafts = {
    ...Object.fromEntries(
      Object.entries(getStoredMyFlowItemDrafts()).filter(([key]) => !key.startsWith(prefix)),
    ),
    ...cloneRecord(state.itemDrafts),
  };
  const dateOverrides = {
    ...Object.fromEntries(
      Object.entries(getStoredMyFlowDateOverrides()).filter(([key]) => !key.startsWith(prefix)),
    ),
    ...state.dateOverrides,
  };
  const occurrenceRecords = {
    ...Object.fromEntries(
      Object.entries(getStoredMyFlowOccurrenceExecutionRecords()).filter(
        ([key]) => !key.startsWith(prefix),
      ),
    ),
    ...normalizeOccurrenceRecordMap(state.occurrenceRecords),
  };
  saveStoredMyFlowItemDrafts(itemDrafts);
  saveStoredMyFlowDateOverrides(dateOverrides);
  saveStoredMyFlowOccurrenceExecutionRecords(occurrenceRecords);
  return cloneMyFlowPersonalExecutionState(state);
}

function getReusableItemDraftKey(key: string): string | undefined {
  const [flowSlug, rowId] = key.split('::');
  if (!flowSlug?.trim() || !rowId?.trim()) return undefined;
  return `${flowSlug}::${rowId}::draft-overlay`;
}

export function prepareMyFlowPersonalExecutionStateForReuse(
  state: MyFlowPersonalExecutionState,
  options: { keepFixedDates: boolean },
): MyFlowPersonalExecutionState {
  const itemDrafts = Object.entries(state.itemDrafts).reduce<Record<string, StoredMyFlowItemDraft>>(
    (drafts, [key, draft]) => {
      const reusableKey = getReusableItemDraftKey(key);
      if (!reusableKey) return drafts;
      const reusableDraft: StoredMyFlowItemDraft = {
        ...(draft.title !== undefined ? { title: draft.title } : {}),
        ...(draft.memo !== undefined ? { memo: draft.memo } : {}),
        ...(draft.detailOverlay !== undefined
          ? { detailOverlay: JSON.parse(JSON.stringify(draft.detailOverlay)) as PersonalItemDetailOverlay }
          : {}),
      };
      if (Object.keys(reusableDraft).length === 0) return drafts;
      drafts[reusableKey] = { ...drafts[reusableKey], ...reusableDraft };
      return drafts;
    },
    {},
  );
  return {
    itemDrafts,
    dateOverrides: options.keepFixedDates ? { ...state.dateOverrides } : {},
  };
}
