import { isAbsolute, parse, resolve } from 'node:path';
import { readAlphaAuthConfig } from '../../lib/flow/integrated-poc/alpha-auth/config';
import { isAlphaHostedTrialReady } from '../../lib/flow/integrated-poc/alpha-server/render-readiness';

export const CLOUDFLARE_RELEASE = Object.freeze({ version: 1, origin: 'https://alpha.wikiplans.com',
  bind: '127.0.0.1', livePort: 3105, qaPort: 3106, backupJobs: 'off' });
const keys = ['FLOWME_ALPHA_ENABLED', 'FLOWME_ALPHA_STAGE', 'FLOWME_ALPHA_HOSTING', 'FLOWME_ALPHA_TUNNEL_ORIGIN',
  'FLOWME_ALPHA_PROJECT_REF', 'FLOWME_ALPHA_SUPABASE_URL', 'FLOWME_ALPHA_PUBLISHABLE_KEY',
  'FLOWME_ALPHA_REDIRECT_URL', 'FLOWME_ALPHA_M3_CAPACITY', 'FLOWME_ALPHA_CATALOG_PACK_FILE'] as const;
const osKeys = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'COMSPEC']);

export function releaseArguments(args: readonly string[]) {
  if (args.length > 3 || new Set(args).size !== args.length) return null;
  let settingsRoot: string | undefined, check = false, port: number = CLOUDFLARE_RELEASE.livePort;
  for (const arg of args) {
    if (arg === '--check' && !check) check = true;
    else if (arg.startsWith('--settings-root=') && settingsRoot === undefined) settingsRoot = arg.slice(16);
    else if (arg === '--qa' && port === CLOUDFLARE_RELEASE.livePort) port = CLOUDFLARE_RELEASE.qaPort;
    else return null;
  }
  if (!settingsRoot || !isAbsolute(settingsRoot) || resolve(settingsRoot) === parse(resolve(settingsRoot)).root) return null;
  return { settingsRoot: resolve(settingsRoot), check, port };
}

/** Values stay inside the launcher. No ambient app flags, proxy or NODE_OPTIONS can enter the child. */
export function releaseEnvironment(settings: unknown, signing: unknown, ambient: NodeJS.ProcessEnv): Record<string, string> | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)
    || Object.keys(settings).length !== keys.length || keys.some(key => !Object.hasOwn(settings, key))
    || typeof signing !== 'string' || !/^[a-f0-9]{64}$/.test(signing)) return null;
  const source = settings as Record<string, unknown>;
  if (keys.some(key => typeof source[key] !== 'string')) return null;
  const configured = Object.fromEntries(keys.map(key => [key, source[key] as string]));
  const path = configured.FLOWME_ALPHA_CATALOG_PACK_FILE;
  if (!isAbsolute(path) || resolve(path) === parse(resolve(path)).root) return null;
  const auth = readAlphaAuthConfig(configured);
  if (auth?.hosting !== 'cloudflare-laptop-v1' || new URL(auth.redirectUrl).origin !== CLOUDFLARE_RELEASE.origin
    || !isAlphaHostedTrialReady({ ...configured, FLOWME_ALPHA_M3_SIGNING_KEY: signing })) return null;
  return { ...Object.fromEntries(Object.entries(ambient).filter(([key, value]) => value !== undefined && osKeys.has(key.toUpperCase()))),
    ...configured, FLOWME_ALPHA_M3_SIGNING_KEY: signing, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' } as Record<string, string>;
}
