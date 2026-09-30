import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isAlphaAuthConfig, isAlphaBrowserOrigin, readAlphaAuthConfig, readAlphaCallback } from '../alpha-auth/config';
import { validateAlphaDevelopmentEnvironment } from '../alpha-persistence/environment';
import { isAlphaHostedTrialReady, isAlphaRenderTrialReady } from './render-readiness';
import { alphaInternalMediaRequest, alphaRequestOrigin } from './request-origin';
import { createAlphaCommandHandler } from './command-handler';
import { createAlphaCreatorCommandHandler } from './creator-command-handler';
import { createAlphaSocialCommandHandler } from './social-command-handler';
import { createAlphaPreservationHandler } from './preservation-handler';
import { createAlphaMediaHandler } from './media-handler';

const origin = 'https://alpha.wikiplans.com';
const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'preview',
  FLOWME_ALPHA_HOSTING: 'cloudflare-laptop-v1', FLOWME_ALPHA_TUNNEL_ORIGIN: origin,
  FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw', FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co',
  FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_synthetic', FLOWME_ALPHA_REDIRECT_URL: `${origin}/auth/callback`,
  FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1', FLOWME_ALPHA_M3_SIGNING_KEY: 'a'.repeat(64) };
const config = readAlphaAuthConfig(env);
assert(config);

test('Cloudflare trial accepts only its explicit preview DEV/on-demand configuration', () => {
  assert.equal(config.tunnelOrigin, origin);
  assert.equal(isAlphaAuthConfig(config), true);
  assert.equal(isAlphaHostedTrialReady(env), true);
  assert.equal(isAlphaRenderTrialReady(env), false);
  for (const override of [
    { FLOWME_ALPHA_ENABLED: undefined }, { FLOWME_ALPHA_ENABLED: 'production' },
    { FLOWME_ALPHA_STAGE: 'development' }, { FLOWME_ALPHA_STAGE: 'test' }, { FLOWME_ALPHA_STAGE: 'production' },
    { FLOWME_ALPHA_PROJECT_REF: 'ldellkztijrijbpwthjl' },
    { FLOWME_ALPHA_SUPABASE_URL: 'https://ldellkztijrijbpwthjl.supabase.co' },
    { FLOWME_ALPHA_HOSTING: undefined }, { FLOWME_ALPHA_HOSTING: 'render-trial-v1' },
    { FLOWME_ALPHA_HOSTING: 'cloudflare-production' }, { FLOWME_ALPHA_TUNNEL_ORIGIN: undefined },
    { FLOWME_ALPHA_M3_CAPACITY: undefined }, { FLOWME_ALPHA_M3_CAPACITY: 'checkpoint-v1' },
    { VERCEL_ENV: 'production' },
  ]) {
    assert.equal(readAlphaAuthConfig({ ...env, ...override }), null, JSON.stringify(override));
    assert.equal(isAlphaHostedTrialReady({ ...env, ...override }), false);
  }
  for (const key of [undefined, '', 'weak', 'A'.repeat(64)])
    assert.equal(isAlphaHostedTrialReady({ ...env, FLOWME_ALPHA_M3_SIGNING_KEY: key }), false);
});

test('Cloudflare origin and callback reject normalization tricks, ports, wildcards and surplus fields', () => {
  for (const invalid of ['https://other.wikiplans.com', 'http://alpha.wikiplans.com',
    'https://*.wikiplans.com', 'https://alpha.wikiplans.com:443', 'https://alpha.wikiplans.com:8443',
    'https://ALPHA.wikiplans.com', `${origin}/`, `${origin}?x=1`, `${origin}#fragment`,
    'https://user@alpha.wikiplans.com', 'https://alpha.wikiplans.com.attacker.example']) {
    assert.equal(readAlphaAuthConfig({ ...env, FLOWME_ALPHA_TUNNEL_ORIGIN: invalid,
      FLOWME_ALPHA_REDIRECT_URL: `${invalid}/auth/callback` }), null, invalid);
    assert.equal(readAlphaAuthConfig({ ...env, FLOWME_ALPHA_TUNNEL_ORIGIN: invalid }), null, invalid);
  }
  for (const invalid of [`${origin}/auth/callback?extra=1`, `${origin}/auth/callback#fragment`,
    `${origin}/auth/callback/`, 'https://alpha.wikiplans.com:443/auth/callback',
    'https://elsewhere.example/auth/callback'])
    assert.equal(readAlphaAuthConfig({ ...env, FLOWME_ALPHA_REDIRECT_URL: invalid }), null, invalid);
  const model = { stage: 'preview', projectRef: env.FLOWME_ALPHA_PROJECT_REF,
    databaseUrl: env.FLOWME_ALPHA_SUPABASE_URL, authUrl: env.FLOWME_ALPHA_SUPABASE_URL,
    storageUrl: env.FLOWME_ALPHA_SUPABASE_URL, redirectUrl: env.FLOWME_ALPHA_REDIRECT_URL,
    hosting: env.FLOWME_ALPHA_HOSTING, tunnelOrigin: origin };
  assert.equal(validateAlphaDevelopmentEnvironment(model), true);
  assert.equal(validateAlphaDevelopmentEnvironment({ ...model, wildcard: true }), false);
  assert.equal(validateAlphaDevelopmentEnvironment({ ...model, storageUrl: 'https://elsewhere.example' }), false);
  assert.equal(isAlphaAuthConfig({ ...config, tunnelOrigin: undefined }), false);
  assert.equal(isAlphaBrowserOrigin(config, 'https://other.wikiplans.com'), false);
  assert.deepEqual(readAlphaCallback(`${origin}/auth/callback?code=synthetic_code`, config), { code: 'synthetic_code' });
  assert.equal(readAlphaCallback(`${origin}/auth/callback?code=synthetic_code&next=/my`, config), null);
});

function request(path: string, method: string, overrides: Record<string, string> = {}) {
  return new Request(`http://127.0.0.1:3105/api/alpha/${path}`, { method,
    headers: { Host: 'alpha.wikiplans.com', 'X-Forwarded-Host': 'alpha.wikiplans.com',
      'X-Forwarded-Proto': 'https', Origin: origin, Authorization: 'Bearer short',
      'Content-Type': 'application/json', ...overrides }, ...(method === 'GET' ? {} : { body: '{}' }) });
}

test('Cloudflare proxy keeps exact Host, forwarded HTTPS and browser Origin gates', () => {
  assert.equal(alphaRequestOrigin(config, request('account', 'POST')), origin);
  for (const bad of [{ Host: 'other.wikiplans.com' }, { Host: 'alpha.wikiplans.com:443' },
    { 'X-Forwarded-Host': 'other.wikiplans.com' }, { 'X-Forwarded-Host': 'alpha.wikiplans.com,other.example' },
    { 'X-Forwarded-Proto': 'http' }, { 'X-Forwarded-Proto': 'https,http' },
    { Origin: 'https://other.wikiplans.com' }, { Origin: `${origin}:443` }, { Origin: 'null' }])
    assert.equal(alphaRequestOrigin(config, request('account', 'POST', bad)), null, JSON.stringify(bad));
  assert.equal(alphaRequestOrigin(config, new Request('http://127.0.0.1:3105/api/alpha/account')), null);
  assert.equal(alphaRequestOrigin(config, alphaInternalMediaRequest(origin, 'synthetic photo', 'Bearer fixture', true)), origin);
});

test('Cloudflare endpoints reject foreign origin before authentication or upstream access', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; throw Error('unexpected-network'); };
  const routes = [
    ['account', 'POST', createAlphaCommandHandler(env, fetcher)],
    ['creator', 'POST', createAlphaCreatorCommandHandler(env, fetcher)],
    ['social', 'POST', createAlphaSocialCommandHandler(env, fetcher)],
    ['preservation', 'POST', createAlphaPreservationHandler(env, fetcher)],
    ['media', 'GET', createAlphaMediaHandler(env, fetcher)],
  ] as const;
  for (const [path, method, handler] of routes) {
    assert.equal((await handler(request(path, method))).status, 401, path);
    assert.equal((await handler(request(path, method, { Origin: 'https://other.wikiplans.com' }))).status, 400, path);
  }
  assert.equal(calls, 0);
});

test('health route uses combined hosted readiness and an empty uncached response', () => {
  const source = readFileSync('app/api/alpha/health/route.ts', 'utf8');
  assert.match(source, /status: isAlphaHostedTrialReady\(process\.env\) \? 200 : 503/);
  assert.match(source, /new Response\(null/);
  assert.match(source, /'Cache-Control': 'no-store'/);
});
