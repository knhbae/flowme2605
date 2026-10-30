/** Which paths the public Alpha host serves. The tunnel forwards every path to this app,
 * so legacy and lab routes stay closed here; only the Alpha app and its assets are open. */
export type AlphaRouteDecision = 'allow' | 'home' | 'block';

const ALPHA_EXACT = new Set(['/alpha', '/icon.svg', '/favicon.ico']);
const ALPHA_PREFIXES = ['/alpha/', '/auth/', '/api/alpha/', '/_next/static/'] as const;

export function alphaRouteDecision(pathname: string): AlphaRouteDecision {
  // Alpha paths never carry encoded dots, slashes or backslashes, or dot segments; refuse them before the prefix match.
  if (/%(2e|2f|5c)|\\/i.test(pathname) || /(^|\/)\.\.?(\/|$)/.test(pathname)) return 'block';
  if (pathname === '/') return 'home';
  return ALPHA_EXACT.has(pathname) || ALPHA_PREFIXES.some(prefix => pathname.startsWith(prefix)) ? 'allow' : 'block';
}

/** Where `/` sends the browser. Next builds request URLs from its own listen address (127.0.0.1:3105
 * behind the tunnel), so the public origin comes from the forwarded Host and protocol instead.
 * Returns null for a missing or malformed Host. */
export function alphaHomeLocation(host: string | null, forwardedProto: string | null, listenProtocol: string): string | null {
  if (!host || !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;
  const protocol = forwardedProto === 'https' ? 'https' : listenProtocol === 'https:' ? 'https' : 'http';
  return `${protocol}://${host}/alpha`;
}
