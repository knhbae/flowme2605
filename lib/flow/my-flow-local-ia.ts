export type MyFlowLocalView = 'now' | 'flows' | 'completed';

export type MyFlowWorkspaceView = 'today' | 'flow' | 'completed';

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

const QUERY_TO_WORKSPACE_VIEW: Record<MyFlowLocalView, MyFlowWorkspaceView> = {
  now: 'today',
  flows: 'flow',
  completed: 'completed',
};

const WORKSPACE_TO_QUERY_VIEW: Record<MyFlowWorkspaceView, MyFlowLocalView> = {
  today: 'now',
  flow: 'flows',
  completed: 'completed',
};

export function parseMyFlowViewQuery(search: string): MyFlowWorkspaceView | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const view = new URLSearchParams(query).get('view');
  return view === 'now' || view === 'flows' || view === 'completed'
    ? QUERY_TO_WORKSPACE_VIEW[view]
    : null;
}

export function getMyFlowViewHref(currentHref: string, view: MyFlowWorkspaceView): string {
  const url = new URL(currentHref, 'https://flowme.local');
  url.searchParams.set('view', WORKSPACE_TO_QUERY_VIEW[view]);
  return `${url.pathname}${url.search}${url.hash}`;
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
