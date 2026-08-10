export type MyFlowLocalView = 'now' | 'flows' | 'completed';

export type MyFlowWorkspaceView = 'flow';

export type MyFlowLibraryFilter = 'all' | 'open' | 'done' | 'archived';

export type MyFlowLibrarySort = 'next' | 'saved' | 'name';

export type MyFlowLibraryRouteState = {
  query: string;
  filter: MyFlowLibraryFilter;
  sort: MyFlowLibrarySort;
  target: MyFlowWorkspaceTarget | null;
  scrollY: number;
  railScrollTop: number;
};

export type MyFlowCompactTodayInput<TRow> = {
  key: string;
  stableItemId: string;
  flowSlug: string;
  groupId: string;
  completed: boolean;
  row: TRow;
};

export type MyFlowCompactTodayModel<
  TEntry extends MyFlowCompactTodayInput<unknown>,
> = {
  items: TEntry[];
  total: number;
  hiddenCount: number;
  source: 'effective_execution';
  writeOwner: 'none';
};

export type MyFlowWorkspaceTarget = {
  flowSlug: string;
  itemKey?: string;
  itemDate?: string;
};

export type MyFlowLocalSummaryInput = {
  id: string;
  executionHeld?: boolean;
  nowItemIds?: string[];
  completedItemIds?: string[];
};

export type MyFlowLocalSummary = {
  flowCount: number;
  nowCount: number;
  completedCount: number;
};

export type MyFlowLibraryControlVisibilityInput = {
  flowCount: number;
  archivedCount?: number;
  query?: string;
  filter?: string;
  searchThreshold?: number;
};

export type MyFlowLibraryControlVisibility = {
  search: boolean;
  filters: boolean;
  mode: 'compact' | 'searchable';
};

export type MyFlowSavedLibraryEntry<TValue> = {
  stableId: string;
  title: string;
  searchText?: string;
  copyOrdinal?: number;
  savedAt?: string;
  nextIncompleteAt?: string;
  /** @deprecated Visit time is presentation history, never a library sort key. */
  lastVisited?: string;
  done: number;
  total: number;
  archived: boolean;
  value: TValue;
};

export type MyFlowCopyOrdinalInput = {
  planId: string;
  sourceId: string;
  savedAt?: string;
};

export type MyFlowLibrarySortContext = {
  sort: MyFlowLibrarySort;
  now: string | number | Date;
  timeZone: string;
};

// P0-07 rollback keeps the established five-plan threshold. The Q2 saved-plan
// shell passes the dedicated twenty-plan threshold explicitly.
export const MY_FLOW_SEARCH_THRESHOLD = 5;
export const MY_FLOW_SAVED_LIBRARY_SEARCH_THRESHOLD = 20;
export const MY_FLOW_COMPACT_TODAY_LIMIT = 3;
export const MY_FLOW_LIBRARY_HISTORY_STATE_KEY = 'flowmeMyFlowLibrary';
export const MY_FLOW_FIRST_ENTRY_PLAN_SESSION_KEY =
  'flowme:my-flow:first-entry-plan';
// Keep the established session key so existing save receipts survive the P0
// presentation correction. The marker now means "focus the compact first
// entry"; it must no longer imply that the whole plan should expand.
export const MY_FLOW_FIRST_ENTRY_SESSION_KEY =
  MY_FLOW_FIRST_ENTRY_PLAN_SESSION_KEY;

type MyFlowSessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function normalizeMyFlowLibraryFilter(value: string | null): MyFlowLibraryFilter {
  return value === 'open' || value === 'done' || value === 'archived'
    ? value
    : 'all';
}

export function normalizeMyFlowLibrarySort(value: unknown): MyFlowLibrarySort {
  return value === 'saved' || value === 'name' ? value : 'next';
}

export function getCanonicalMyFlowLibrarySortHref(currentHref: string): string {
  const url = new URL(currentHref, 'https://flowme.local');
  const sort = normalizeMyFlowLibrarySort(url.searchParams.get('sort'));
  url.searchParams.set('sort', sort);
  return `${url.pathname}${url.search}${url.hash}`;
}

const MY_FLOW_TITLE_COLLATOR = new Intl.Collator('ko-KR', {
  usage: 'sort',
  numeric: true,
  sensitivity: 'base',
});

function parseValidTimestamp(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function resolveLatestMyFlowSavedAt(
  values: readonly (string | null | undefined)[],
): string | undefined {
  let latest: { value: string; timestamp: number } | undefined;
  values.forEach((value) => {
    const normalized = value?.trim();
    const timestamp = parseValidTimestamp(normalized);
    if (!normalized || timestamp === null) return;
    if (!latest || timestamp > latest.timestamp) latest = { value: normalized, timestamp };
  });
  return latest?.value;
}

function normalizeDateKey(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? value
    : null;
}

function getDateKeyAtTimeZone(
  value: string | number | Date,
  timeZone: string,
): string {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) return '1970-01-01';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function compareSavedAtDescending(
  left: string | undefined,
  right: string | undefined,
): number {
  const leftTimestamp = parseValidTimestamp(left);
  const rightTimestamp = parseValidTimestamp(right);
  if (leftTimestamp === null && rightTimestamp === null) return 0;
  if (leftTimestamp === null) return 1;
  if (rightTimestamp === null) return -1;
  return rightTimestamp - leftTimestamp;
}

function getCopyOrdinal(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 1;
}

function compareTitleAndStableTies<TValue>(
  left: MyFlowSavedLibraryEntry<TValue>,
  right: MyFlowSavedLibraryEntry<TValue>,
): number {
  return MY_FLOW_TITLE_COLLATOR.compare(left.title, right.title)
    || getCopyOrdinal(left.copyOrdinal) - getCopyOrdinal(right.copyOrdinal)
    || compareSavedAtDescending(left.savedAt, right.savedAt)
    || left.stableId.localeCompare(right.stableId);
}

function getNextSortBucket<TValue>(
  entry: MyFlowSavedLibraryEntry<TValue>,
  today: string,
): { bucket: 0 | 1 | 2 | 3 | 4; date: string | null } {
  const allCompleted = entry.total > 0 && entry.done >= entry.total;
  if (allCompleted) return { bucket: 4, date: null };
  const date = normalizeDateKey(entry.nextIncompleteAt);
  if (!date) return { bucket: 3, date: null };
  if (date < today) return { bucket: 0, date };
  if (date === today) return { bucket: 1, date };
  return { bucket: 2, date };
}

export function compareMyFlowSavedLibraryEntries<TValue>(
  left: MyFlowSavedLibraryEntry<TValue>,
  right: MyFlowSavedLibraryEntry<TValue>,
  context: MyFlowLibrarySortContext,
): number {
  if (context.sort === 'saved') {
    return compareSavedAtDescending(left.savedAt, right.savedAt)
      || left.stableId.localeCompare(right.stableId);
  }
  if (context.sort === 'name') return compareTitleAndStableTies(left, right);

  const today = getDateKeyAtTimeZone(context.now, context.timeZone);
  const leftNext = getNextSortBucket(left, today);
  const rightNext = getNextSortBucket(right, today);
  return leftNext.bucket - rightNext.bucket
    || (leftNext.date ?? '').localeCompare(rightNext.date ?? '')
    || compareTitleAndStableTies(left, right);
}

export function buildMyFlowCopyOrdinalMap(
  entries: readonly MyFlowCopyOrdinalInput[],
): Map<string, number> {
  const groups = new Map<string, MyFlowCopyOrdinalInput[]>();
  entries.forEach((entry) => {
    const sourceId = entry.sourceId.trim() || entry.planId;
    const group = groups.get(sourceId) ?? [];
    group.push(entry);
    groups.set(sourceId, group);
  });
  const ordinals = new Map<string, number>();
  groups.forEach((group) => {
    group
      .slice()
      .sort((left, right) => {
        const leftTimestamp = parseValidTimestamp(left.savedAt);
        const rightTimestamp = parseValidTimestamp(right.savedAt);
        if (leftTimestamp === null && rightTimestamp !== null) return 1;
        if (leftTimestamp !== null && rightTimestamp === null) return -1;
        if (leftTimestamp !== null && rightTimestamp !== null && leftTimestamp !== rightTimestamp) {
          return leftTimestamp - rightTimestamp;
        }
        return left.planId.localeCompare(right.planId);
      })
      .forEach((entry, index) => ordinals.set(entry.planId, index + 1));
  });
  return ordinals;
}

function normalizeScrollY(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

export function readMyFlowLibraryScrollY(historyState: unknown): number {
  if (!historyState || typeof historyState !== 'object') return 0;
  const marker = (historyState as Record<string, unknown>)[MY_FLOW_LIBRARY_HISTORY_STATE_KEY];
  if (!marker || typeof marker !== 'object') return 0;
  return normalizeScrollY((marker as Record<string, unknown>).scrollY);
}

export function readMyFlowLibraryRailScrollTop(historyState: unknown): number {
  if (!historyState || typeof historyState !== 'object') return 0;
  const marker = (historyState as Record<string, unknown>)[MY_FLOW_LIBRARY_HISTORY_STATE_KEY];
  if (!marker || typeof marker !== 'object') return 0;
  return normalizeScrollY((marker as Record<string, unknown>).railScrollTop);
}

export function withMyFlowLibraryScrollY(
  historyState: unknown,
  scrollY: number,
  railScrollTop = readMyFlowLibraryRailScrollTop(historyState),
): Record<string, unknown> {
  const state = historyState && typeof historyState === 'object'
    ? historyState as Record<string, unknown>
    : {};
  return {
    ...state,
    [MY_FLOW_LIBRARY_HISTORY_STATE_KEY]: {
      scrollY: normalizeScrollY(scrollY),
      railScrollTop: normalizeScrollY(railScrollTop),
    },
  };
}

export function parseMyFlowLibraryRoute(
  search: string,
  historyState?: unknown,
): MyFlowLibraryRouteState {
  const queryString = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(queryString);
  return {
    query: params.get('q')?.trim() ?? '',
    filter: normalizeMyFlowLibraryFilter(params.get('status')),
    sort: normalizeMyFlowLibrarySort(params.get('sort')),
    target: parseMyFlowWorkspaceTarget(search),
    scrollY: readMyFlowLibraryScrollY(historyState),
    railScrollTop: readMyFlowLibraryRailScrollTop(historyState),
  };
}

export function getMyFlowLibraryHref(
  currentHref: string,
  input: {
    query?: string;
    filter?: MyFlowLibraryFilter;
    sort?: MyFlowLibrarySort;
    target?: MyFlowWorkspaceTarget | null;
  },
): string {
  const url = new URL(currentHref, 'https://flowme.local');
  const query = input.query?.trim() ?? '';
  const filter = input.filter ?? 'all';
  const target = input.target ?? null;
  url.searchParams.set('view', 'flows');
  url.searchParams.delete('mode');
  if (query) url.searchParams.set('q', query);
  else url.searchParams.delete('q');
  if (filter === 'all') url.searchParams.delete('status');
  else url.searchParams.set('status', filter);
  if (input.sort !== undefined) {
    const sort = normalizeMyFlowLibrarySort(input.sort);
    url.searchParams.set('sort', sort);
  } else {
    const currentSort = normalizeMyFlowLibrarySort(url.searchParams.get('sort'));
    url.searchParams.set('sort', currentSort);
  }
  if (target?.flowSlug.trim()) url.searchParams.set('flow', target.flowSlug.trim());
  else url.searchParams.delete('flow');
  if (target?.itemKey?.trim()) {
    url.searchParams.set('item', target.itemKey.trim());
    const itemDate = target.itemDate?.trim() ?? '';
    if (/^\d{4}-\d{2}-\d{2}$/u.test(itemDate)) url.searchParams.set('date', itemDate);
    else url.searchParams.delete('date');
  } else {
    url.searchParams.delete('item');
    url.searchParams.delete('date');
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildMyFlowCompactTodayModel<
  TEntry extends MyFlowCompactTodayInput<unknown>,
>(
  rows: TEntry[],
  limit = MY_FLOW_COMPACT_TODAY_LIMIT,
): MyFlowCompactTodayModel<TEntry> {
  const normalizedLimit = Math.max(0, Math.floor(limit));
  const seenKeys = new Set<string>();
  const eligible = rows.filter((row) => {
    if (row.groupId !== 'today' || row.completed || !row.key.trim() || seenKeys.has(row.key)) {
      return false;
    }
    seenKeys.add(row.key);
    return true;
  });
  return {
    items: eligible.slice(0, normalizedLimit),
    total: eligible.length,
    hiddenCount: Math.max(0, eligible.length - normalizedLimit),
    source: 'effective_execution',
    writeOwner: 'none',
  };
}

export function selectMyFlowSavedLibraryEntries<TValue>(
  entries: Array<MyFlowSavedLibraryEntry<TValue>>,
  input: {
    query?: string;
    filter?: MyFlowLibraryFilter;
    sort?: MyFlowLibrarySort;
    now?: string | number | Date;
    timeZone?: string;
  } = {},
): Array<MyFlowSavedLibraryEntry<TValue>> {
  const query = input.query?.trim().toLowerCase() ?? '';
  const filter = input.filter ?? 'all';
  const filtered = entries
    .filter((entry) => {
      if (filter === 'archived') return entry.archived;
      if (entry.archived) return false;
      if (filter === 'open') return entry.done < entry.total;
      if (filter === 'done') return entry.done >= entry.total;
      return true;
    })
    .filter((entry) => (
      !query || `${entry.title} ${entry.searchText ?? ''}`.toLowerCase().includes(query)
    ))
    .slice();
  if (input.sort === undefined) {
    return filtered.sort((left, right) =>
      (right.lastVisited ?? '').localeCompare(left.lastVisited ?? '')
      || left.title.localeCompare(right.title)
      || left.stableId.localeCompare(right.stableId),
    );
  }
  const context: MyFlowLibrarySortContext = {
    sort: normalizeMyFlowLibrarySort(input.sort),
    now: input.now ?? new Date(),
    timeZone: input.timeZone ?? 'Asia/Seoul',
  };
  return filtered.sort((left, right) => compareMyFlowSavedLibraryEntries(left, right, context));
}

export function parseMyFlowViewQuery(search: string): MyFlowWorkspaceView | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const view = new URLSearchParams(query).get('view');
  return view === 'now' || view === 'flows' || view === 'completed' ? 'flow' : null;
}

export function getMyFlowViewHref(currentHref: string, _view: MyFlowWorkspaceView): string {
  const url = new URL(currentHref, 'https://flowme.local');
  url.searchParams.set('view', 'flows');
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getMyFlowWorkspaceHref(target: MyFlowWorkspaceTarget): string {
  const params = new URLSearchParams({ view: 'flows', flow: target.flowSlug.trim() });
  const itemKey = target.itemKey?.trim();
  if (itemKey) params.set('item', itemKey);
  const itemDate = target.itemDate?.trim() ?? '';
  if (itemKey && /^\d{4}-\d{2}-\d{2}$/u.test(itemDate)) params.set('date', itemDate);
  return `/my?${params.toString()}`;
}

export function parseMyFlowWorkspaceTarget(search: string): MyFlowWorkspaceTarget | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const flowSlug = params.get('flow')?.trim() ?? '';
  if (!flowSlug) return null;
  const itemKey = params.get('item')?.trim() ?? '';
  const itemDate = params.get('date')?.trim() ?? '';
  return {
    flowSlug,
    ...(itemKey ? { itemKey } : {}),
    ...(itemKey && /^\d{4}-\d{2}-\d{2}$/u.test(itemDate) ? { itemDate } : {}),
  };
}

export function markMyFlowFirstEntry(
  storage: MyFlowSessionStorage,
  flowSlug: string,
): void {
  const normalized = flowSlug.trim();
  if (!normalized) return;
  storage.setItem(MY_FLOW_FIRST_ENTRY_SESSION_KEY, normalized);
}

export function consumeMyFlowFirstEntry(
  storage: MyFlowSessionStorage,
  flowSlug: string,
): boolean {
  const normalized = flowSlug.trim();
  if (!normalized || storage.getItem(MY_FLOW_FIRST_ENTRY_SESSION_KEY) !== normalized) {
    return false;
  }
  storage.removeItem(MY_FLOW_FIRST_ENTRY_SESSION_KEY);
  return true;
}

/** @deprecated Use markMyFlowFirstEntry; the first entry no longer opens the plan. */
export function markMyFlowFirstEntryPlan(
  storage: MyFlowSessionStorage,
  flowSlug: string,
): void {
  markMyFlowFirstEntry(storage, flowSlug);
}

/** @deprecated Use consumeMyFlowFirstEntry; the first entry no longer opens the plan. */
export function consumeMyFlowFirstEntryPlan(
  storage: MyFlowSessionStorage,
  flowSlug: string,
): boolean {
  return consumeMyFlowFirstEntry(storage, flowSlug);
}

export function summarizeMyFlowLocalIa(flows: MyFlowLocalSummaryInput[]): MyFlowLocalSummary {
  const visibleFlows = flows.filter((flow) => !flow.executionHeld);
  const uniqueFlowIds = new Set<string>();
  const uniqueNowItems = new Set<string>();
  const uniqueCompletedItems = new Set<string>();

  visibleFlows.forEach((flow) => {
    if (!flow.id) return;
    uniqueFlowIds.add(flow.id);
    flow.nowItemIds?.forEach((itemId) => {
      if (itemId) uniqueNowItems.add(`${flow.id}::${itemId}`);
    });
    flow.completedItemIds?.forEach((itemId) => {
      if (itemId) uniqueCompletedItems.add(`${flow.id}::${itemId}`);
    });
  });

  return {
    flowCount: uniqueFlowIds.size,
    nowCount: uniqueNowItems.size,
    completedCount: uniqueCompletedItems.size,
  };
}

export function getMyFlowLibraryControlVisibility(
  input: MyFlowLibraryControlVisibilityInput,
): MyFlowLibraryControlVisibility {
  const flowCount = Math.max(0, Math.floor(input.flowCount));
  const archivedCount = Math.max(0, Math.floor(input.archivedCount ?? 0));
  const hasQuery = Boolean(input.query?.trim());
  const hasNonDefaultFilter = Boolean(input.filter && input.filter !== 'all');
  const searchThreshold = Math.max(
    1,
    Math.floor(input.searchThreshold ?? MY_FLOW_SEARCH_THRESHOLD),
  );
  const searchable = flowCount >= searchThreshold;

  return {
    search: searchable || hasQuery,
    filters: searchable || archivedCount > 0 || hasNonDefaultFilter,
    mode: searchable ? 'searchable' : 'compact',
  };
}
