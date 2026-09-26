import { isAlphaBrowserOrigin, type AlphaAuthConfig } from '../alpha-auth/config';

/** Resolve the configured public origin without trusting an arbitrary proxy host. */
export function alphaRequestOrigin(config: AlphaAuthConfig, request: Request): string | null {
  try {
    const url = new URL(request.url);
    const browserOrigin = request.headers.get('origin');
    if (!config.hosting) {
      return isAlphaBrowserOrigin(config, url.origin) && (browserOrigin === null || browserOrigin === url.origin)
        ? url.origin : null;
    }
    const expected = new URL(config.redirectUrl).origin;
    const host = new URL(expected).host;
    const forwardedHost = request.headers.get('x-forwarded-host');
    return isAlphaBrowserOrigin(config, expected)
      && request.headers.get('host') === host
      && (forwardedHost === null || forwardedHost === host)
      && request.headers.get('x-forwarded-proto') === 'https'
      && (browserOrigin === null || browserOrigin === expected)
      ? expected : null;
  } catch { return null; }
}

/** A server-to-server read through the same guarded media handler. */
export function alphaInternalMediaRequest(origin: string, id: string, authorization: string, hosted: boolean): Request {
  const host = new URL(origin).host;
  return new Request(`${origin}/api/alpha/media?id=${encodeURIComponent(id)}`, {
    headers: hosted ? { Authorization: authorization, Host: host,
      'X-Forwarded-Host': host, 'X-Forwarded-Proto': 'https' } : { Authorization: authorization },
  });
}
