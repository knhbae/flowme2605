export const NON_INDEXABLE_ROUTE_ROBOTS = {
  index: false,
  follow: false,
} as const;

export type FlowRouteIndexingTier =
  | 'public-discovery'
  | 'personal-workspace'
  | 'creator-workspace'
  | 'release-preview'
  | 'internal-review'
  | 'internal-console';

function normalizePathname(route: string) {
  const withoutHash = route.split('#', 1)[0] ?? route;
  const withoutQuery = withoutHash.split('?', 1)[0] ?? withoutHash;
  const pathname = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return pathname !== '/' ? pathname.replace(/\/+$/u, '') : pathname;
}

export function getFlowRouteIndexingTier(route: string): FlowRouteIndexingTier {
  const pathname = normalizePathname(route);

  if (pathname === '/flow-lab' || pathname.startsWith('/flow-lab/')) {
    return 'internal-console';
  }
  if (
    pathname === '/content-flows' ||
    pathname === '/creators' ||
    pathname === '/ia-compare' ||
    pathname.startsWith('/ia-compare/')
  ) {
    return 'internal-review';
  }
  if (pathname === '/restart' || pathname.startsWith('/restart/')) {
    return 'release-preview';
  }
  if (pathname === '/my' || pathname === '/calendar') {
    return 'personal-workspace';
  }
  if (
    pathname === '/flows/new' ||
    /^\/flows\/[^/]+\/edit$/u.test(pathname) ||
    /^\/flow-maps\/[^/]+\/creator$/u.test(pathname) ||
    pathname === '/u/my-flow-studio'
  ) {
    return 'creator-workspace';
  }
  return 'public-discovery';
}

export function routeRequiresNoindex(route: string) {
  return getFlowRouteIndexingTier(route) !== 'public-discovery';
}
