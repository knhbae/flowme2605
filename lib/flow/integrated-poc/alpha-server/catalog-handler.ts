import { readAlphaAuthConfig } from '../alpha-auth/config';
import { buildCatalogLibrarySnapshot } from '../catalog-library-source';
import { alphaRequestOrigin } from './request-origin';

const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const fail = (status: number) => Response.json({ ok: false }, { status, headers });

/** Trial-only authenticated source read. The immutable pack never enters a
 * static asset; each account imports its own private copy via creator intent. */
export function createAlphaCatalogHandler(env: Record<string, string | undefined>, request: typeof fetch = fetch) {
  const config = readAlphaAuthConfig(env);
  return async (input: Request): Promise<Response> => {
    if (!config) return fail(503);
    const url = new URL(input.url);
    if (input.method !== 'GET' || url.search || !alphaRequestOrigin(config, input)) return fail(400);
    const authorization = input.headers.get('authorization');
    if (!authorization || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization)) return fail(401);
    try {
      const identity = await request(`${config.url}/auth/v1/user`, {
        headers: { apikey: config.publishableKey, Authorization: authorization },
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
      });
      if (!identity.ok) return fail(identity.status === 401 || identity.status === 403 ? 401 : 503);
      const user: unknown = await identity.json();
      if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string'
        || !/^[0-9a-f-]{36}$/.test(user.id) || 'is_anonymous' in user && user.is_anonymous) return fail(401);
      return Response.json(buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z'), { headers });
    } catch { return fail(503); }
  };
}
