export type MyFlowLocalView = 'now' | 'flows' | 'completed';

export type MyFlowWorkspaceView = 'flow';

export type MyFlowLibraryFilter = 'all' | 'open' | 'done' | 'archived';

export type MyFlowLibraryRouteState = {
  query: string;
  filter: MyFlowLibraryFilter;
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
  lastVisited?: string;
  done: number;
  total: number;
  archived: boolean;
  value: TValue;
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
  input: { query?: string; filter?: MyFlowLibraryFilter } = {},
): Array<MyFlowSavedLibraryEntry<TValue>> {
  const query = input.query?.trim().toLowerCase() ?? '';
  const filter = input.filter ?? 'all';
  return entries
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
    .slice()
    .sort((left, right) =>
      (right.lastVisited ?? '').localeCompare(left.lastVisited ?? '') ||
      left.title.localeCompare(right.title) ||
      left.stableId.localeCompare(right.stableId),
    );
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
