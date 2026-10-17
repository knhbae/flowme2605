import type { AlphaAuthConfig } from '../alpha-auth/config';
import type { VerifiedAlphaSession } from '../alpha-auth/account-access';
import { ALPHA_ENVIRONMENT_POLICY } from '../alpha-persistence/environment';

export type AlphaSyntheticRequest = { url: string; init: RequestInit };
export type SyntheticAlphaWorkspaceRuntime = Readonly<{
  kind: 'alpha-workspace-synthetic-only/1'; request: typeof fetch;
  tabStorage: Storage; documentStorage: Storage;
}>;
const instances = new WeakSet<object>();
const devOrigin = `https://${ALPHA_ENVIRONMENT_POLICY.developmentProject}.supabase.co`;

/** Test transport is mandatory: there is no ambient fetch fallback or auth bypass.
 * The supplied dispatch must be an in-memory/loopback fixture, never a forwarder.
 * Production AlphaWorkspace has no runtime prop; only its named fixture entry does.
 */
export function createSyntheticAlphaWorkspaceRuntime(options: {
  dispatch: (request: AlphaSyntheticRequest) => Promise<Response>;
  tabStorage: Storage; documentStorage: Storage;
}): SyntheticAlphaWorkspaceRuntime {
  if (typeof options.dispatch !== 'function' || !options.tabStorage || !options.documentStorage) throw Error('synthetic-runtime-required');
  const dispatch = options.dispatch;
  const request = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(address, 'http://alpha-fixture.invalid');
    const method = (init.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    const auth = url.origin === devOrigin && url.pathname === '/auth/v1/user' && method === 'GET' && !url.search;
    const read = url.origin === devOrigin && ['/rest/v1/rpc/flowme_alpha_social_open_v1', '/rest/v1/rpc/flowme_alpha_social_read_v1'].includes(url.pathname) && method === 'POST' && !url.search;
    const api = address.startsWith('/api/alpha/') && url.origin === 'http://alpha-fixture.invalid'
      && ['/api/alpha/account','/api/alpha/social','/api/alpha/creator'].includes(url.pathname) && method === 'POST' && !url.search;
    const media = address.startsWith('/api/alpha/media') && url.origin === 'http://alpha-fixture.invalid' && url.pathname === '/api/alpha/media'
      && (method === 'POST' && !url.search || ['GET','DELETE'].includes(method) && [...url.searchParams.keys()].every(key=>key==='id') && url.searchParams.getAll('id').length===1);
    if (url.username || url.password || url.hash || !(auth || read || api || media)) throw Error('synthetic-request-denied');
    return dispatch({ url: address, init: { ...init, method } });
  }) as typeof fetch;
  const runtime: SyntheticAlphaWorkspaceRuntime = Object.freeze({ kind:'alpha-workspace-synthetic-only/1', request,
    tabStorage:options.tabStorage, documentStorage:options.documentStorage });
  instances.add(runtime); return runtime;
}

export function isSyntheticAlphaWorkspaceInput(runtime: SyntheticAlphaWorkspaceRuntime, config: AlphaAuthConfig, session: VerifiedAlphaSession): boolean {
  return !!runtime && instances.has(runtime) && config.stage === 'test' && config.url === devOrigin
    && config.publishableKey.startsWith('sb_publishable_synthetic_')
    && /^synthetic-owner-[A-Za-z0-9_-]+$/.test(session.userId)
    && /^synthetic-token-[A-Za-z0-9_-]+$/.test(session.accessToken);
}
