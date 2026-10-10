import assert from 'node:assert/strict';
import test from 'node:test';
import { CLOUDFLARE_RELEASE, releaseArguments, releaseEnvironment } from './cloudflare-release-contract';

const syntheticSettings = {
  FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'preview', FLOWME_ALPHA_HOSTING: 'cloudflare-laptop-v1',
  FLOWME_ALPHA_TUNNEL_ORIGIN: CLOUDFLARE_RELEASE.origin, FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co', FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_synthetic_release',
  FLOWME_ALPHA_REDIRECT_URL: `${CLOUDFLARE_RELEASE.origin}/auth/callback`, FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1',
  FLOWME_ALPHA_CATALOG_PACK_FILE: process.platform === 'win32' ? 'D:/synthetic/catalog.json' : '/synthetic/catalog.json',
};
const signing = 'a'.repeat(64);
test('release explicitly targets loopback live/QA ports without experimental flags', () => {
  const root = process.platform === 'win32' ? 'D:/synthetic/settings' : '/synthetic/settings';
  assert.equal(releaseArguments([`--settings-root=${root}`])?.port, 3105);
  assert.equal(releaseArguments([`--settings-root=${root}`, '--qa', '--check'])?.port, 3106);
  for (const args of [[], ['--settings-root=.'], [`--settings-root=${root}`, '--candidate-backup-jobs'],
    [`--settings-root=${root}`, '--check', '--check'], [`--settings-root=${root}`, '--port=3000'],
    [`--settings-root=${root}`, '--qa', '--qa']]) assert.equal(releaseArguments(args), null);
});
test('release never inherits app flags, secrets, proxy or Node injection from ambient environment', () => {
  const env = releaseEnvironment(syntheticSettings, signing, { PATH: 'synthetic-path', NODE_OPTIONS: '--require unsafe',
    FLOWME_ALPHA_BACKUP_JOBS: 'candidate-v1', SERVICE_ROLE_KEY: 'not-forwarded', HTTP_PROXY: 'not-forwarded', VERCEL_ENV: 'production' });
  assert.ok(env); assert.equal(env.PATH, 'synthetic-path'); assert.equal(env.NODE_ENV, 'production');
  for (const key of ['NODE_OPTIONS', 'FLOWME_ALPHA_BACKUP_JOBS', 'SERVICE_ROLE_KEY', 'HTTP_PROXY', 'VERCEL_ENV']) assert.equal(env[key], undefined);
});
test('release rejects extra/missing settings, invalid signing and unsafe catalog path', () => {
  assert.equal(releaseEnvironment({ ...syntheticSettings, FLOWME_ALPHA_BACKUP_JOBS: 'candidate-v1' }, signing, {}), null);
  assert.equal(releaseEnvironment({ ...syntheticSettings, FLOWME_ALPHA_CATALOG_PACK_FILE: '.' }, signing, {}), null);
  assert.equal(releaseEnvironment({ ...syntheticSettings, FLOWME_ALPHA_STAGE: 'production' }, signing, {}), null);
  assert.equal(releaseEnvironment({ ...syntheticSettings, FLOWME_ALPHA_TUNNEL_ORIGIN: 'https://elsewhere.invalid' }, signing, {}), null);
  assert.equal(releaseEnvironment(syntheticSettings, 'bad', {}), null);
  assert.equal(releaseEnvironment(null, signing, {}), null);
});
