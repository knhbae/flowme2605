export type MyFlowLocalView = 'now' | 'flows' | 'completed';

export type MyFlowWorkspaceView = 'flow';

export type MyFlowWorkspaceTarget = {
  flowSlug: string;
  itemKey?: string;
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
};

export type MyFlowLibraryControlVisibility = {
  search: boolean;
  filters: boolean;
  mode: 'compact' | 'searchable';
};

export const MY_FLOW_SEARCH_THRESHOLD = 5;
export const MY_FLOW_FIRST_ENTRY_PLAN_SESSION_KEY =
  'flowme:my-flow:first-entry-plan';

type MyFlowSessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

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
  return `/my?${params.toString()}`;
}

export function parseMyFlowWorkspaceTarget(search: string): MyFlowWorkspaceTarget | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const flowSlug = params.get('flow')?.trim() ?? '';
  if (!flowSlug) return null;
  const itemKey = params.get('item')?.trim() ?? '';
  return {
    flowSlug,
    ...(itemKey ? { itemKey } : {}),
  };
}

export function markMyFlowFirstEntryPlan(
  storage: MyFlowSessionStorage,
  flowSlug: string,
): void {
  const normalized = flowSlug.trim();
  if (!normalized) return;
  storage.setItem(MY_FLOW_FIRST_ENTRY_PLAN_SESSION_KEY, normalized);
}

export function consumeMyFlowFirstEntryPlan(
  storage: MyFlowSessionStorage,
  flowSlug: string,
): boolean {
  const normalized = flowSlug.trim();
  if (!normalized || storage.getItem(MY_FLOW_FIRST_ENTRY_PLAN_SESSION_KEY) !== normalized) {
    return false;
  }
  storage.removeItem(MY_FLOW_FIRST_ENTRY_PLAN_SESSION_KEY);
  return true;
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
  const searchable = flowCount >= MY_FLOW_SEARCH_THRESHOLD;

  return {
    search: searchable || hasQuery,
    filters: searchable || archivedCount > 0 || hasNonDefaultFilter,
    mode: searchable ? 'searchable' : 'compact',
  };
}
