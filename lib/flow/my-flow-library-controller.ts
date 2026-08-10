import {
  MY_FLOW_LIBRARY_HISTORY_STATE_KEY,
  getMyFlowLibraryHref,
  type MyFlowLibraryFilter,
  type MyFlowLibraryRouteState,
  type MyFlowLibrarySort,
  type MyFlowWorkspaceTarget,
} from './my-flow-local-ia';

export type MyFlowLibraryHistoryLevel = 'list' | 'plan' | 'item';

export type MyFlowLibraryControllerState = Readonly<{
  query: string;
  filter: MyFlowLibraryFilter;
  sort: MyFlowLibrarySort;
  selectedFlowSlug: string;
  itemTarget: MyFlowWorkspaceTarget | null;
}>;

export type MyFlowLibraryControllerAction =
  | Readonly<{ kind: 'replace_controls'; query: string; filter: MyFlowLibraryFilter }>
  | Readonly<{ kind: 'replace_sort'; sort: MyFlowLibrarySort }>
  | Readonly<{ kind: 'open_plan'; flowSlug: string }>
  | Readonly<{ kind: 'open_item'; target: MyFlowWorkspaceTarget }>
  | Readonly<{ kind: 'return_to_list' }>
  | Readonly<{ kind: 'request_item_back' }>
  | Readonly<{ kind: 'sync_route'; route: MyFlowLibraryRouteState; returnFlowSlug?: string }>;

export type MyFlowLibraryHistoryWrite = Readonly<{
  kind: 'replace' | 'push';
  href: string;
  level: MyFlowLibraryHistoryLevel | null;
  scrollY: number;
  railScrollTop: number;
}>;

export type MyFlowLibraryHistoryEffect =
  | MyFlowLibraryHistoryWrite
  | Readonly<{ kind: 'back' }>
  | Readonly<{
      kind: 'back_then_replace';
      replace: MyFlowLibraryHistoryWrite;
    }>;

export type MyFlowLibraryControllerPlan = Readonly<{
  applied: boolean;
  state: MyFlowLibraryControllerState;
  history: readonly MyFlowLibraryHistoryEffect[];
  discard: 'allow' | 'block_if_dirty';
  transient: 'preserve' | 'close';
  planReturn: 'preserve' | 'capture' | 'clear';
  workspaceSection: 'preserve' | 'execute';
  focus:
    | Readonly<{ kind: 'none' }>
    | Readonly<{ kind: 'preserve_control' }>
    | Readonly<{ kind: 'capture_plan_opener'; flowSlug: string }>
    | Readonly<{ kind: 'restore_item_opener_after_frame' }>
    | Readonly<{ kind: 'restore_plan_opener_after_frame'; flowSlug: string }>;
  scroll:
    | Readonly<{ kind: 'none' }>
    | Readonly<{ kind: 'capture_library_position' }>
    | Readonly<{
        kind: 'restore_library_position_after_frame';
        scrollY: number;
        railScrollTop: number;
      }>;
  itemClose: 'not_applicable' | 'handled_by_history_back' | 'continue_local_close';
}>;

export type MyFlowLibraryControllerContext = Readonly<{
  currentHref: string;
  currentRoute: MyFlowLibraryRouteState;
  historyLevel: MyFlowLibraryHistoryLevel | null;
  scrollY: number;
  railScrollTop: number;
}>;

function normalizeScroll(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function historyWrite(
  kind: 'replace' | 'push',
  href: string,
  level: MyFlowLibraryHistoryLevel | null,
  scrollY = 0,
  railScrollTop = 0,
): MyFlowLibraryHistoryWrite {
  return {
    kind,
    href,
    level,
    scrollY: normalizeScroll(scrollY),
    railScrollTop: normalizeScroll(railScrollTop),
  };
}

function basePlan(
  state: MyFlowLibraryControllerState,
  overrides: Partial<Omit<MyFlowLibraryControllerPlan, 'state' | 'applied'>> = {},
): MyFlowLibraryControllerPlan {
  return {
    applied: true,
    state,
    history: [],
    discard: 'allow',
    transient: 'preserve',
    planReturn: 'preserve',
    workspaceSection: 'preserve',
    focus: { kind: 'none' },
    scroll: { kind: 'none' },
    itemClose: 'not_applicable',
    ...overrides,
  };
}

function unapplied(state: MyFlowLibraryControllerState): MyFlowLibraryControllerPlan {
  return { ...basePlan(state), applied: false };
}

export function parseMyFlowLibraryHistoryLevel(
  historyState: unknown,
): MyFlowLibraryHistoryLevel | null {
  if (!historyState || typeof historyState !== 'object') return null;
  const marker = (historyState as Record<string, unknown>)[MY_FLOW_LIBRARY_HISTORY_STATE_KEY];
  if (!marker || typeof marker !== 'object') return null;
  const level = (marker as Record<string, unknown>).level;
  return level === 'list' || level === 'plan' || level === 'item' ? level : null;
}

export function buildMyFlowLibraryHistoryState(
  historyState: unknown,
  level: MyFlowLibraryHistoryLevel,
  scrollY = 0,
  railScrollTop = 0,
): Record<string, unknown> {
  const base = historyState && typeof historyState === 'object'
    ? historyState as Record<string, unknown>
    : {};
  return {
    ...base,
    [MY_FLOW_LIBRARY_HISTORY_STATE_KEY]: {
      level,
      scrollY: normalizeScroll(scrollY),
      railScrollTop: normalizeScroll(railScrollTop),
    },
  };
}

export function planMyFlowLibraryTransition(
  current: MyFlowLibraryControllerState,
  action: MyFlowLibraryControllerAction,
  context: MyFlowLibraryControllerContext,
): MyFlowLibraryControllerPlan {
  if (action.kind === 'replace_sort') {
    const target = current.itemTarget ?? (
      current.selectedFlowSlug === 'all'
        ? null
        : { flowSlug: current.selectedFlowSlug }
    );
    const href = getMyFlowLibraryHref(context.currentHref, {
      query: current.query,
      filter: current.filter,
      sort: action.sort,
      target,
    });
    return basePlan({ ...current, sort: action.sort }, {
      history: [historyWrite(
        'replace',
        href,
        context.historyLevel,
        context.scrollY,
        context.railScrollTop,
      )],
      focus: { kind: 'preserve_control' },
    });
  }

  if (action.kind === 'replace_controls') {
    const href = getMyFlowLibraryHref(context.currentHref, {
      query: action.query,
      filter: action.filter,
      sort: current.sort,
      target: null,
    });
    const replace = historyWrite(
      'replace',
      href,
      'list',
      context.scrollY,
      context.railScrollTop,
    );
    return basePlan({
      query: action.query,
      filter: action.filter,
      sort: current.sort,
      selectedFlowSlug: 'all',
      itemTarget: null,
    }, {
      history: context.historyLevel === 'item'
        ? [{ kind: 'back_then_replace', replace }]
        : [replace],
      discard: 'block_if_dirty',
      transient: 'close',
      planReturn: 'clear',
      focus: { kind: 'preserve_control' },
    });
  }

  if (action.kind === 'open_plan') {
    const flowSlug = action.flowSlug.trim();
    if (!flowSlug) return unapplied(current);
    const listHref = getMyFlowLibraryHref(context.currentHref, {
      query: current.query,
      filter: current.filter,
      sort: current.sort,
      target: null,
    });
    const planHref = getMyFlowLibraryHref(context.currentHref, {
      query: current.query,
      filter: current.filter,
      sort: current.sort,
      target: { flowSlug },
    });
    const history: MyFlowLibraryHistoryEffect[] = [];
    if (context.historyLevel === 'item') {
      history.push({
        kind: 'back_then_replace',
        replace: historyWrite('replace', planHref, 'plan'),
      });
    } else if (context.currentRoute.target && context.historyLevel === null) {
      history.push(historyWrite('replace', planHref, null));
    } else if (context.currentRoute.target || context.historyLevel === 'plan') {
      history.push(historyWrite('replace', planHref, 'plan'));
    } else {
      history.push(historyWrite(
        'replace',
        listHref,
        'list',
        context.scrollY,
        context.railScrollTop,
      ));
      history.push(historyWrite('push', planHref, 'plan'));
    }
    return basePlan({
      ...current,
      selectedFlowSlug: flowSlug,
      itemTarget: null,
    }, {
      history,
      discard: 'block_if_dirty',
      transient: 'close',
      planReturn: 'capture',
      workspaceSection: 'execute',
      focus: { kind: 'capture_plan_opener', flowSlug },
      scroll: { kind: 'capture_library_position' },
    });
  }

  if (action.kind === 'open_item') {
    const flowSlug = action.target.flowSlug.trim();
    const itemKey = action.target.itemKey?.trim() ?? '';
    if (!flowSlug || !itemKey) return unapplied(current);
    const target: MyFlowWorkspaceTarget = {
      flowSlug,
      itemKey,
      ...(action.target.itemDate ? { itemDate: action.target.itemDate } : {}),
    };
    const history: MyFlowLibraryHistoryEffect[] = [];
    const entersOwningPlan = context.currentRoute.target?.flowSlug !== flowSlug;
    if (entersOwningPlan) {
      const listHref = getMyFlowLibraryHref(context.currentHref, {
        query: current.query,
        filter: current.filter,
        sort: current.sort,
        target: null,
      });
      const planHref = getMyFlowLibraryHref(context.currentHref, {
        query: current.query,
        filter: current.filter,
        sort: current.sort,
        target: { flowSlug },
      });
      if (!context.currentRoute.target) {
        history.push(historyWrite(
          'replace',
          listHref,
          'list',
          context.scrollY,
          context.railScrollTop,
        ));
        history.push(historyWrite('push', planHref, 'plan'));
      } else if (context.historyLevel === 'item') {
        history.push({
          kind: 'back_then_replace',
          replace: historyWrite('replace', planHref, 'plan'),
        });
      } else {
        history.push(historyWrite(
          'replace',
          planHref,
          context.historyLevel === null ? null : 'plan',
        ));
      }
    }
    const itemHref = getMyFlowLibraryHref(context.currentHref, {
      query: current.query,
      filter: current.filter,
      sort: current.sort,
      target,
    });
    history.push(historyWrite(
      !entersOwningPlan && context.historyLevel === 'item' ? 'replace' : 'push',
      itemHref,
      'item',
    ));
    return basePlan({
      ...current,
      selectedFlowSlug: flowSlug,
      itemTarget: target,
    }, {
      history,
      discard: 'block_if_dirty',
      planReturn: entersOwningPlan ? 'capture' : 'preserve',
      focus: entersOwningPlan
        ? { kind: 'capture_plan_opener', flowSlug }
        : { kind: 'none' },
      scroll: entersOwningPlan
        ? { kind: 'capture_library_position' }
        : { kind: 'none' },
    });
  }

  if (action.kind === 'return_to_list') {
    if (context.historyLevel === 'plan') {
      return basePlan(current, {
        history: [{ kind: 'back' }],
        discard: 'block_if_dirty',
        transient: 'close',
      });
    }
    const href = getMyFlowLibraryHref(context.currentHref, {
      query: current.query,
      filter: current.filter,
      sort: current.sort,
      target: null,
    });
    return basePlan({
      ...current,
      selectedFlowSlug: 'all',
      itemTarget: null,
    }, {
      history: [historyWrite(
        'replace',
        href,
        'list',
        context.scrollY,
        context.railScrollTop,
      )],
      discard: 'block_if_dirty',
      transient: 'close',
      planReturn: 'clear',
      focus: {
        kind: 'restore_plan_opener_after_frame',
        flowSlug: context.currentRoute.target?.flowSlug ?? '',
      },
      scroll: {
        kind: 'restore_library_position_after_frame',
        scrollY: context.scrollY,
        railScrollTop: context.railScrollTop,
      },
    });
  }

  if (action.kind === 'request_item_back') {
    if (context.historyLevel === 'item') {
      return basePlan(current, {
        history: [{ kind: 'back' }],
        discard: 'block_if_dirty',
        itemClose: 'handled_by_history_back',
      });
    }
    if (!context.currentRoute.target?.itemKey) return unapplied(current);
    const target = { flowSlug: context.currentRoute.target.flowSlug };
    const href = getMyFlowLibraryHref(context.currentHref, {
      query: context.currentRoute.query,
      filter: context.currentRoute.filter,
      sort: context.currentRoute.sort,
      target,
    });
    return basePlan({
      ...current,
      selectedFlowSlug: target.flowSlug,
      itemTarget: null,
    }, {
      history: [historyWrite('replace', href, null)],
      discard: 'block_if_dirty',
      itemClose: 'continue_local_close',
    });
  }

  const route = action.route;
  const leavesCurrentItem = Boolean(
    current.itemTarget?.itemKey && (
      route.target?.flowSlug !== current.itemTarget.flowSlug
      || route.target?.itemKey !== current.itemTarget.itemKey
      || (route.target?.itemDate ?? '') !== (current.itemTarget.itemDate ?? '')
    ),
  );
  if (route.target?.itemKey) {
    return basePlan({
      query: route.query,
      filter: route.filter,
      sort: route.sort,
      selectedFlowSlug: route.target.flowSlug,
      itemTarget: route.target,
    }, {
      discard: leavesCurrentItem ? 'block_if_dirty' : 'allow',
    });
  }
  if (route.target) {
    return basePlan({
      query: route.query,
      filter: route.filter,
      sort: route.sort,
      selectedFlowSlug: route.target.flowSlug,
      itemTarget: null,
    }, {
      discard: leavesCurrentItem ? 'block_if_dirty' : 'allow',
      transient: 'close',
      focus: { kind: 'restore_item_opener_after_frame' },
    });
  }
  return basePlan({
    query: route.query,
    filter: route.filter,
    sort: route.sort,
    selectedFlowSlug: 'all',
    itemTarget: null,
  }, {
    discard: leavesCurrentItem ? 'block_if_dirty' : 'allow',
    transient: 'close',
    planReturn: 'clear',
    focus: {
      kind: 'restore_plan_opener_after_frame',
      flowSlug: action.returnFlowSlug ?? '',
    },
    scroll: {
      kind: 'restore_library_position_after_frame',
      scrollY: route.scrollY,
      railScrollTop: route.railScrollTop,
    },
  });
}
