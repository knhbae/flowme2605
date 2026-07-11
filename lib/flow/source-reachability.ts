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
