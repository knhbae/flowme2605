import assert from 'node:assert/strict';
import test from 'node:test';
import { readAlphaAuthConfig } from '../alpha-auth/config';
import { createAlphaCommandHandler } from './command-handler';
import { createAlphaCreatorCommandHandler } from './creator-command-handler';
import { createAlphaSocialCommandHandler } from './social-command-handler';
import { createAlphaPreservationHandler } from './preservation-handler';
import { createAlphaMediaHandler } from './media-handler';
import { alphaInternalMediaRequest, alphaRequestOrigin } from './request-origin';

const publicOrigin = 'https://flowme-render-proxy-fixture.onrender.com';
const base = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'preview',
  FLOWME_ALPHA_HOSTING: 'render-trial-v1', FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co',
  FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  FLOWME_ALPHA_REDIRECT_URL: `${publicOrigin}/auth/callback`, FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1' };
const hosted = readAlphaAuthConfig(base);
assert(hosted);

function proxy(headers: Record<string, string> = {}) {
  return new Request('http://127.0.0.1:3105/api/alpha/account', { headers: {
    Host: new URL(publicOrigin).host, 'X-Forwarded-Host': new URL(publicOrigin).host,
    'X-Forwarded-Proto': 'https', Origin: publicOrigin, ...headers,
  } });
}

test('hosted request uses only the configured external HTTPS origin', () => {
  assert.equal(alphaRequestOrigin(hosted, proxy()), publicOrigin);
  const wrongHeaders: Record<string, string>[] = [
    { Host: 'other.onrender.com' }, { 'X-Forwarded-Host': 'other.onrender.com' },
    { 'X-Forwarded-Proto': 'http' }, { Origin: 'https://other.onrender.com' },
  ];
  for (const headers of wrongHeaders) assert.equal(alphaRequestOrigin(hosted, proxy(headers)), null);
  const internal = alphaInternalMediaRequest(publicOrigin, 'photo 1', 'Bearer fixture-token', true);
  assert.equal(alphaRequestOrigin(hosted, internal), publicOrigin);
  assert.equal(new URL(internal.url).searchParams.get('id'), 'photo 1');
});

test('local request keeps its original origin and rejects a foreign browser Origin', () => {
  const local = readAlphaAuthConfig({ ...base, FLOWME_ALPHA_STAGE: 'development',
    FLOWME_ALPHA_HOSTING: undefined, FLOWME_ALPHA_M3_CAPACITY: undefined,
    FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback' });
  assert(local);
  assert.equal(alphaRequestOrigin(local, new Request('http://localhost:3104/api/alpha/account')), 'http://localhost:3104');
  assert.equal(alphaRequestOrigin(local, new Request('http://localhost:3104/api/alpha/account', {
    headers: { Origin: 'https://other.onrender.com' },
  })), null);
});

test('all hosted alpha endpoints pass the exact proxy origin and reject another one before upstream', async () => {
  let upstreamCalls = 0;
  const fetcher: typeof fetch = async () => { upstreamCalls++; throw Error('unexpected upstream request'); };
  const env = { ...base, FLOWME_ALPHA_M3_SIGNING_KEY: 'a'.repeat(64) };
  const routes = [
    ['account', 'POST', createAlphaCommandHandler(env, fetcher)],
    ['creator', 'POST', createAlphaCreatorCommandHandler(env, fetcher)],
    ['social', 'POST', createAlphaSocialCommandHandler(env, fetcher)],
    ['preservation', 'POST', createAlphaPreservationHandler(env, fetcher)],
    ['media', 'GET', createAlphaMediaHandler(env, fetcher)],
  ] as const;
  const request = (path: string, method: string, overrides: Record<string, string> = {}) => new Request(
    `http://127.0.0.1:3105/api/alpha/${path}`, { method, headers: {
      Host: new URL(publicOrigin).host, 'X-Forwarded-Host': new URL(publicOrigin).host,
      'X-Forwarded-Proto': 'https', Origin: publicOrigin,
      Authorization: 'Bearer short', 'Content-Type': 'application/json', ...overrides,
    }, ...(method === 'GET' ? {} : { body: '{}' }) });
  for (const [path, method, handler] of routes) {
    assert.equal((await handler(request(path, method))).status, 401, path);
    assert.equal((await handler(request(path, method, { Origin: 'https://other.onrender.com' }))).status, 400, path);
  }
  assert.equal(upstreamCalls, 0);
});
