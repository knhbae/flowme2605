import { ALPHA_ENVIRONMENT_POLICY, validateAlphaDevelopmentEnvironment } from '../alpha-persistence/environment';

export type AlphaAuthConfig = { stage: 'development' | 'test' | 'preview'; url: string; publishableKey: string; redirectUrl: string;
  hosting?: typeof ALPHA_ENVIRONMENT_POLICY.renderTrialHosting; capacity?: typeof ALPHA_ENVIRONMENT_POLICY.renderTrialCapacity };
export const ALPHA_AUTH_STORAGE_KEY = 'flow:poc:personal-workspace:v1:alpha-auth:session';
export const ALPHA_PRIVATE_BUCKET = 'flowme-alpha-private';

/** No defaults and no network at module/build time. A public deployment is not authorized by this flag. */
export function readAlphaAuthConfig(env: Record<string, string | undefined>): AlphaAuthConfig | null {
  if (env.FLOWME_ALPHA_ENABLED !== 'development-only' || env.VERCEL_ENV === 'production') return null;
  const stage = env.FLOWME_ALPHA_STAGE, url = env.FLOWME_ALPHA_SUPABASE_URL;
  const publishableKey = env.FLOWME_ALPHA_PUBLISHABLE_KEY, redirectUrl = env.FLOWME_ALPHA_REDIRECT_URL, hosting = env.FLOWME_ALPHA_HOSTING;
  if (!publishableKey || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey) || !url || !redirectUrl) return null;
  if (hosting !== undefined && hosting !== ALPHA_ENVIRONMENT_POLICY.renderTrialHosting) return null;
  // Hosted trial uses the deployed DEV writer and explicit on-demand backups.
  // The unapplied checkpoint experiment must not become a hosting prerequisite.
  if (hosting && env.FLOWME_ALPHA_M3_CAPACITY !== ALPHA_ENVIRONMENT_POLICY.renderTrialCapacity) return null;
  if (!validateAlphaDevelopmentEnvironment({ stage, projectRef: env.FLOWME_ALPHA_PROJECT_REF,
    databaseUrl: url, authUrl: url, storageUrl: url, redirectUrl, ...(hosting ? { hosting } : {}) })) return null;
  return { stage: stage as AlphaAuthConfig['stage'], url, publishableKey, redirectUrl,
    ...(hosting ? { hosting, capacity: ALPHA_ENVIRONMENT_POLICY.renderTrialCapacity } : {}) };
}

export function isAlphaBrowserOrigin(config: AlphaAuthConfig, origin: string): boolean {
  return isAlphaAuthConfig(config) && new URL(config.redirectUrl).origin === origin;
}

export function isAlphaAuthConfig(config: AlphaAuthConfig): boolean {
  return readAlphaAuthConfig({ FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: config.stage,
    FLOWME_ALPHA_PROJECT_REF: ALPHA_ENVIRONMENT_POLICY.developmentProject, FLOWME_ALPHA_SUPABASE_URL: config.url,
    FLOWME_ALPHA_PUBLISHABLE_KEY: config.publishableKey, FLOWME_ALPHA_REDIRECT_URL: config.redirectUrl,
    FLOWME_ALPHA_HOSTING: config.hosting, FLOWME_ALPHA_M3_CAPACITY: config.capacity }) !== null;
}

export function alphaAuthStorage(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
  // Includes the SDK's versioned PKCE verifier/user keys, but never its default storage probe.
  const allowed = (key: string) => key === ALPHA_AUTH_STORAGE_KEY || key.startsWith(`${ALPHA_AUTH_STORAGE_KEY}-`);
  return {
    getItem(key: string): string | null { if (!allowed(key)) throw Error('alpha-storage-boundary'); return storage.getItem(key); },
    setItem(key: string, value: string) { if (!allowed(key)) throw Error('alpha-storage-boundary'); storage.setItem(key, value); },
    removeItem(key: string) { if (!allowed(key)) throw Error('alpha-storage-boundary'); storage.removeItem(key); },
  };
}

/** Only PKCE callback params. Never honor user-provided next/redirect or implicit tokens. */
export function readAlphaCallback(url: string, config: AlphaAuthConfig): { code: string; flowId?: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.pathname !== '/auth/callback' || parsed.hash || !isAlphaBrowserOrigin(config, parsed.origin)) return null;
    const params = parsed.searchParams;
    if ([...params.keys()].some(key => !['code', 'sb_flow_id'].includes(key)) || params.getAll('code').length !== 1 || params.getAll('sb_flow_id').length > 1) return null;
    const code = params.get('code'), flowId = params.get('sb_flow_id') ?? undefined;
    if (!code || !/^[A-Za-z0-9_-]{8,200}$/.test(code) || (flowId && !/^[A-Za-z0-9_-]{8,200}$/.test(flowId))) return null;
    return { code, ...(flowId ? { flowId } : {}) };
  } catch { return null; }
}
