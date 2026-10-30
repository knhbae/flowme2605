import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlphaCatalogHandler } from './catalog-handler';
import { CATALOG_LIBRARY_VERSION } from '../catalog-library';

const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'development',
  FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw', FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co',
  FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture', FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback' };
const address = 'http://localhost:3104/api/alpha/catalog';
const token = 'Bearer fixture_token_with_sufficient_length';
const input = (authorization?: string, origin?: string) => new Request(address, { headers: {
  ...(authorization ? { Authorization: authorization } : {}), ...(origin ? { Origin: origin } : {}),
} });

test('private catalog read denies missing or invalid sessions without returning source', async () => {
  let upstream = 0;
  const handler = createAlphaCatalogHandler(env, async () => { upstream++; return new Response('{}', { status: 401 }); });
  const missing = await handler(input());
  assert.equal(missing.status, 401); assert.equal(upstream, 0);
  const invalid = await handler(input(token));
  assert.equal(invalid.status, 401); assert.equal(upstream, 1);
  assert.equal((await invalid.text()).includes(CATALOG_LIBRARY_VERSION), false);
  assert.equal(invalid.headers.get('cache-control'), 'private, no-store');
});

test('same immutable source is available to every non-anonymous verified account only', async () => {
  const seen: string[] = [];
  const handler = createAlphaCatalogHandler(env, async (_url, init) => {
    seen.push(String((init?.headers as Record<string, string>).Authorization));
    const id = seen.length === 1 ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222';
    return Response.json({ id });
  });
  for (let i = 0; i < 2; i++) {
    const response = await handler(input(token));
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.catalogVersion, CATALOG_LIBRARY_VERSION);
    assert.equal(payload.bundles.length, 177); assert.equal(payload.maps.length, 26);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
  assert.equal(seen.length, 2);
});

test('catalog read refuses cross-origin, query and anonymous identity', async () => {
  const anonymous = createAlphaCatalogHandler(env, async () => Response.json({ id: '11111111-1111-4111-8111-111111111111', is_anonymous: true }));
  assert.equal((await anonymous(input(token))).status, 401);
  assert.equal((await anonymous(input(token, 'https://elsewhere.example'))).status, 400);
  assert.equal((await anonymous(new Request(`${address}?x=1`, { headers: { Authorization: token } }))).status, 400);
});
