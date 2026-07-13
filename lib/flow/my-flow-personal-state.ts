export const MY_FLOW_ITEM_DRAFTS_STORAGE_KEY = 'flow:my-flow:item-drafts';
export const MY_FLOW_DATE_OVERRIDES_STORAGE_KEY = 'flow:my-flow:date-overrides';

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
  logValue?: string;
  decisionStatus?: 'undecided' | 'buy' | 'hold' | 'reject';
  nextReviewDate?: string;
};

export type MyFlowPersonalExecutionState = {
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
};

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

export function cloneMyFlowPersonalExecutionState(
  state: MyFlowPersonalExecutionState,
): MyFlowPersonalExecutionState {
  return {
    itemDrafts: cloneRecord(state.itemDrafts),
    dateOverrides: { ...state.dateOverrides },
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
  return { itemDrafts, dateOverrides };
}

export function getFlowScopedMyFlowPersonalExecutionState(flowSlug: string): MyFlowPersonalExecutionState {
  const prefix = `${flowSlug}::`;
  return {
    itemDrafts: Object.fromEntries(
      Object.entries(getStoredMyFlowItemDrafts()).filter(([key]) => key.startsWith(prefix)),
    ),
    dateOverrides: Object.fromEntries(
      Object.entries(getStoredMyFlowDateOverrides()).filter(([key]) => key.startsWith(prefix)),
    ),
  };
}

export function hasMyFlowPersonalExecutionState(state?: MyFlowPersonalExecutionState): boolean {
  return Boolean(state && (Object.keys(state.itemDrafts).length > 0 || Object.keys(state.dateOverrides).length > 0));
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
  saveStoredMyFlowItemDrafts(itemDrafts);
  saveStoredMyFlowDateOverrides(dateOverrides);
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
