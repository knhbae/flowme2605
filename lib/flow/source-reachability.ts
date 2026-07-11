import type { FlowBundle } from './types';

export type SourceReachabilityBucket =
  | 'reachable'
  | 'redirected'
  | 'access_blocked'
  | 'not_found'
  | 'server_error'
  | 'request_error'
  | 'timeout'
  | 'network_error';

export type SourceReachabilityInput = {
  sourceUrl: string;
  finalUrl?: string;
  status?: number;
  errorKind?: 'timeout' | 'network';
};

export type SourceLinkRole = 'flow_source' | 'item_detail';

export type SourceReachabilityTarget = {
  sourceUrl: string;
  slugs: string[];
  titles: string[];
  linkRoles: SourceLinkRole[];
};

export function collectSourceReachabilityTargets(
  bundles: FlowBundle[],
): SourceReachabilityTarget[] {
  const byUrl = new Map<string, SourceReachabilityTarget>();

  const addTarget = (bundle: FlowBundle, sourceUrl: string | undefined, role: SourceLinkRole) => {
    if (!sourceUrl) return;
    const current = byUrl.get(sourceUrl) ?? {
      sourceUrl,
      slugs: [],
      titles: [],
      linkRoles: [],
    };
    current.slugs.push(bundle.flow.slug);
    current.titles.push(bundle.flow.title);
    current.linkRoles.push(role);
    byUrl.set(sourceUrl, current);
  };

  for (const bundle of bundles) {
    addTarget(bundle, bundle.flow.source_url, 'flow_source');
    for (const detail of bundle.itemDetails ?? []) {
      for (const link of detail.links ?? []) {
        addTarget(bundle, link.url, 'item_detail');
      }
    }
  }

  return [...byUrl.values()]
    .map((target) => ({
      ...target,
      slugs: [...new Set(target.slugs)].sort(),
      titles: [...new Set(target.titles)].sort(),
      linkRoles: [...new Set(target.linkRoles)].sort(),
    }))
    .sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));
}

function normalizeComparableUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = '';
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/u, '');
    }
    return url.toString();
  } catch {
    return value;
  }
}

export function classifySourceReachability(
  input: SourceReachabilityInput,
): SourceReachabilityBucket {
  if (input.errorKind === 'timeout') return 'timeout';
  if (input.errorKind === 'network') return 'network_error';

  const status = input.status ?? 0;
  if (status >= 200 && status < 400) {
    const finalUrl = input.finalUrl ?? input.sourceUrl;
    return normalizeComparableUrl(finalUrl) === normalizeComparableUrl(input.sourceUrl)
      ? 'reachable'
      : 'redirected';
  }
  if ([401, 403, 407, 418, 429].includes(status)) return 'access_blocked';
  if (status === 404 || status === 410) return 'not_found';
  if (status >= 500) return 'server_error';
  return 'request_error';
}

export function sourceReachabilityNeedsManualReview(bucket: SourceReachabilityBucket) {
  return bucket !== 'reachable';
}

export function sourceReachabilityIsHardBroken(bucket: SourceReachabilityBucket) {
  return bucket === 'not_found';
}
