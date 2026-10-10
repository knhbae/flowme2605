import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramPrivateSpace } from '../program-data';
import type { AlphaAccount } from '../alpha-persistence/contract';
import { ALPHA_AUTH_STORAGE_KEY, alphaAuthStorage, isAlphaBrowserOrigin, readAlphaAuthConfig, readAlphaCallback } from './config';
import { createAlphaAccountAccess, createAlphaSessionBoundary, type AlphaAccessResult } from './account-access';
import { isConfirmedAlphaLogout } from './logout';
import { updateAlphaRecoveryPassword } from './recovery-password';

const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'test', FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co', FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_test', FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback' };
const config = readAlphaAuthConfig(env)!;
const account = (ownerId: string): AlphaAccount => ({ schema: 'flowme-alpha-account/1', ownerId, revision: 0,
  source: { schema: 'flowme-integrated-product-poc/1', actorId: ownerId, revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { resolve, promise }; }

test('M2 recovery password refuses changed context before any request or between identity and update', async () => {
  let calls = 0, current = false;
  const request: typeof fetch = async () => { calls++; current = false; return Response.json({ id: 'a' }); };
  const session = { userId: 'a', accessToken: 'token-a' };
  assert.deepEqual(await updateAlphaRecoveryPassword(config, session, 'fixture-password', () => current, request), { ok: false, reason: 'context-changed' });
  assert.equal(calls, 0); current = true;
  assert.deepEqual(await updateAlphaRecoveryPassword(config, session, 'fixture-password', () => current, request), { ok: false, reason: 'context-changed' });
  assert.equal(calls, 1);
});

test('M2 recovery freezes intended identity/token and never saves the session returned by a password writer', async () => {
  const input = { userId: 'a', accessToken: 'token-a' }, mutableConfig = { ...config }, calls: RequestInit[] = [];
  const result = await updateAlphaRecoveryPassword(mutableConfig, input, 'fixture-password', () => true, async (url, init) => {
    assert.equal(String(url), `${config.url}/auth/v1/user`); calls.push(init!);
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer token-a');
    input.userId = 'b'; input.accessToken = 'token-b'; mutableConfig.url = 'https://invalid.example';
    return Response.json({ id: 'a' });
  });
  assert.deepEqual(result, { ok: true }); assert.equal(calls.length, 2);
  assert.equal(calls[1].method, 'PUT'); assert.equal(calls[1].body, JSON.stringify({ password: 'fixture-password' }));
  for (const call of calls) { assert.equal(call.cache, 'no-store'); assert.equal(call.redirect, 'error'); }
});

test('M2 recovery rejects foreign/anonymous identity, expired auth and production without changing password', async () => {
  for (const user of [{ id: 'b' }, { id: 'a', is_anonymous: true }]) {
    let calls = 0;
    assert.deepEqual(await updateAlphaRecoveryPassword(config, { userId: 'a', accessToken: 'a' }, 'fixture-password', () => true,
      async () => { calls++; return Response.json(user); }), { ok: false, reason: 'context-changed' });
    assert.equal(calls, 1);
  }
  let calls = 0;
  assert.deepEqual(await updateAlphaRecoveryPassword(config, { userId: 'a', accessToken: 'a' }, 'fixture-password', () => true,
    async () => { calls++; return Response.json({ code: 'bad_jwt' }, { status: 401 }); }), { ok: false, reason: 'auth-error', code: 'bad_jwt' });
  assert.equal(calls, 1);
  const blocked = await updateAlphaRecoveryPassword({ ...config, url: 'https://ldellkztijrijbpwthjl.supabase.co' },
    { userId: 'a', accessToken: 'a' }, 'fixture-password', () => true, async () => { calls++; throw Error(); });
  assert.deepEqual(blocked, { ok: false, reason: 'auth-error' }); assert.equal(calls, 1);
});

test('M2 recovery hides late success after context changes and preserves typed Auth/network failures', async () => {
  let current = true, calls = 0;
  const result = await updateAlphaRecoveryPassword(config, { userId: 'a', accessToken: 'a' }, 'fixture-password', () => current,
    async () => { if (++calls === 2) current = false; return Response.json({ id: 'a' }); });
  assert.deepEqual(result, { ok: false, reason: 'context-changed' }); assert.equal(calls, 2);
  const failure = await updateAlphaRecoveryPassword(config, { userId: 'a', accessToken: 'a' }, 'fixture-password', () => true,
    async (_url, init) => init?.method === 'PUT' ? Response.json({ error_code: 'weak_password' }, { status: 422 }) : Response.json({ id: 'a' }));
  assert.deepEqual(failure, { ok: false, reason: 'auth-error', code: 'weak_password' });
  assert.deepEqual(await updateAlphaRecoveryPassword(config, { userId: 'a', accessToken: 'a' }, 'fixture-password', () => true,
    async () => { throw Error('offline'); }), { ok: false, reason: 'auth-error' });
});

test('M2 runtime config is opt-in, dev-only, modern publishable-only and requires every setting', () => {
  assert(config); for (const key of Object.keys(env)) assert.equal(readAlphaAuthConfig({ ...env, [key]: undefined }), null, key);
  for (const overrides of [{ FLOWME_ALPHA_STAGE: 'production' }, { VERCEL_ENV: 'production' }, { FLOWME_ALPHA_PROJECT_REF: 'ldellkztijrijbpwthjl' },
    { FLOWME_ALPHA_SUPABASE_URL: 'https://ldellkztijrijbpwthjl.supabase.co' }, { FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_secret_not-allowed' },
    { FLOWME_ALPHA_REDIRECT_URL: 'https://flowme.example/auth/callback' }, { FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback?next=https://evil.example' }]) assert.equal(readAlphaAuthConfig({ ...env, ...overrides }), null);
  assert(isAlphaBrowserOrigin(config, 'http://localhost:3104')); assert(!isAlphaBrowserOrigin(config, 'https://flowme.example'));
  assert(!isAlphaBrowserOrigin(config, 'http://localhost:3000'));
});
test('M2 storage adapter permits SDK PKCE keys only under the PoC namespace and never clear', () => {
  const values = new Map([['flow:operating', 'unchanged']]), writes: string[] = [];
  const scoped = alphaAuthStorage({ getItem: k => values.get(k) ?? null, setItem: (k, v) => { writes.push(k); values.set(k, v); }, removeItem: k => { writes.push(k); values.delete(k); } });
  for (const suffix of ['', '-code-verifier', '-flow-random-code-verifier', '-flows-code-verifier', '-user']) {
    const key = `${ALPHA_AUTH_STORAGE_KEY}${suffix}`; scoped.setItem(key, 'value'); assert.equal(scoped.getItem(key), 'value'); scoped.removeItem(key);
  }
  for (const key of ['flow:operating', 'sb-auth-token', `${ALPHA_AUTH_STORAGE_KEY}evil`]) {
    assert.throws(() => scoped.setItem(key, 'changed')); assert.throws(() => scoped.removeItem(key)); assert.throws(() => scoped.getItem(key));
  }
  assert.equal(values.get('flow:operating'), 'unchanged'); assert(writes.every(key => key.startsWith('flow:poc:personal-workspace:v1:'))); assert(!('clear' in scoped));
});
test('M2 callback rejects implicit tokens, external next, duplicate and unsupported parameters', () => {
  const base = 'http://localhost:3104/auth/callback';
  assert.deepEqual(readAlphaCallback(`${base}?code=12345678&sb_flow_id=abcdefgh`, config), { code: '12345678', flowId: 'abcdefgh' });
  for (const value of [base, `${base}?code=x`, `${base}?code=12345678&code=abcdefgh`, `${base}?code=12345678&next=/my`, `${base}?code=12345678#access_token=x`, 'https://evil.example/auth/callback?code=12345678']) assert.equal(readAlphaCallback(value, config), null);
});
test('M7 Render trial accepts only one configured HTTPS host and the development Supabase project', () => {
  const origin = 'https://flowme-trial-1.onrender.com';
  const renderEnv = { ...env, FLOWME_ALPHA_STAGE: 'preview', FLOWME_ALPHA_HOSTING: 'render-trial-v1',
    FLOWME_ALPHA_REDIRECT_URL: `${origin}/auth/callback`, FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1', NODE_ENV: 'production' };
  const hosted = readAlphaAuthConfig(renderEnv);
  assert(hosted); assert.equal(hosted.hosting, 'render-trial-v1'); assert.equal(hosted.capacity, 'on-demand-v1');
  assert(isAlphaBrowserOrigin(hosted, origin));
  for (const wrong of ['http://localhost:3104', 'https://other.onrender.com', 'http://flowme-trial-1.onrender.com',
    'https://flowme-trial-1.onrender.com.evil.example']) assert(!isAlphaBrowserOrigin(hosted, wrong));
  assert.deepEqual(readAlphaCallback(`${origin}/auth/callback?code=12345678`, hosted), { code: '12345678' });
  assert.equal(readAlphaCallback('https://other.onrender.com/auth/callback?code=12345678', hosted), null);
  assert.equal(isAlphaBrowserOrigin({ ...hosted, hosting: undefined }, origin), false);
  assert.equal(isAlphaBrowserOrigin({ ...hosted, capacity: undefined }, origin), false);
  for (const override of [
    { FLOWME_ALPHA_HOSTING: undefined }, { FLOWME_ALPHA_HOSTING: 'render-production' }, { FLOWME_ALPHA_STAGE: 'development' },
    { FLOWME_ALPHA_M3_CAPACITY: undefined }, { FLOWME_ALPHA_M3_CAPACITY: 'legacy' },
    { FLOWME_ALPHA_M3_CAPACITY: 'checkpoint-v1' }, { FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1 ' },
    { FLOWME_ALPHA_STAGE: 'production' }, { VERCEL_ENV: 'production' }, { FLOWME_ALPHA_ENABLED: 'production' },
    { FLOWME_ALPHA_PROJECT_REF: 'ldellkztijrijbpwthjl' },
    { FLOWME_ALPHA_REDIRECT_URL: 'http://flowme-trial-1.onrender.com/auth/callback' },
    { FLOWME_ALPHA_REDIRECT_URL: 'https://other.example/auth/callback' },
    { FLOWME_ALPHA_REDIRECT_URL: 'https://sub.flowme-trial-1.onrender.com/auth/callback' },
    { FLOWME_ALPHA_REDIRECT_URL: 'https://flowme-trial-1.onrender.com:8443/auth/callback' },
    { FLOWME_ALPHA_REDIRECT_URL: `${origin}/auth/callback?next=/alpha` },
  ]) assert.equal(readAlphaAuthConfig({ ...renderEnv, ...override }), null);
});
test('M2 account requests verify real Auth identity and use fixed token/no-store, owner never submitted', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const request: typeof fetch = async (url, init) => { calls.push({ url: String(url), init }); return Response.json(String(url).endsWith('/user') ? { id: 'a' } : account('a')); };
  const result = await createAlphaAccountAccess(config, { userId: 'a', accessToken: 'token-a' }, request).open();
  assert(result.ok); assert.equal(calls.length, 2); assert.equal(calls[1].init?.body, '{}');
  for (const call of calls) { assert.equal((call.init?.headers as Record<string,string>).Authorization, 'Bearer token-a'); assert.equal(call.init?.cache, 'no-store'); assert.equal(call.init?.redirect, 'error'); }
});
test('M2 production config rejects before any API request', async () => {
  let calls = 0;
  const result = await createAlphaAccountAccess({ ...config, url: 'https://ldellkztijrijbpwthjl.supabase.co' }, { userId: 'a', accessToken: 'x' }, async () => { calls++; return Response.json({}); }).open();
  assert.deepEqual(result, { ok: false, reason: 'invalid' }); assert.equal(calls, 0);
});
test('M2 gateway freezes caller-owned config and identity before an async request', async () => {
  const mutableConfig = { ...config }, mutableSession = { userId: 'a', accessToken: 'token-a' };
  const held = deferred<Response>(), calls: string[] = [];
  const access = createAlphaAccountAccess(mutableConfig, mutableSession, async (url, init) => {
    calls.push(String(url)); assert.equal((init?.headers as Record<string,string>).Authorization, 'Bearer token-a');
    return calls.length === 1 ? held.promise : Response.json(account('a'));
  });
  const pending = access.open(); mutableConfig.url = 'https://ldellkztijrijbpwthjl.supabase.co'; mutableSession.userId = 'b'; mutableSession.accessToken = 'token-b';
  held.resolve(Response.json({ id: 'a' })); assert((await pending).ok);
  assert(calls.every(url => url.startsWith(config.url)));
});
test('M2 rejects expired/anonymous/foreign identity without database request', async () => {
  for (const user of [new Response('{}', { status: 401 }), Response.json({ id: 'b' }), Response.json({ id: 'a', is_anonymous: true })]) {
    let calls = 0; const result = await createAlphaAccountAccess(config, { userId: 'a', accessToken: 'x' }, async () => { calls++; return user; }).open();
    assert.deepEqual(result, { ok: false, reason: 'session-expired' }); assert.equal(calls, 1);
  }
});
test('M2 read distinguishes empty account, wrong-owner and malformed payload', async () => {
  for (const [data, expected] of [[[], 'empty'], [[{ account: account('b') }], 'invalid'], [[{ account: { ownerId: 'a' } }], 'invalid'], [[{ account: account('a') }, { account: account('a') }], 'invalid']] as const) {
    let calls = 0; const result = await createAlphaAccountAccess(config, { userId: 'a', accessToken: 'x' }, async () => Response.json(++calls === 1 ? { id: 'a' } : data)).read();
    assert.deepEqual(result, expected === 'empty' ? { ok: true, account: null } : { ok: false, reason: 'invalid' });
  }
});
test('M2 network and database authorization errors never become an empty success', async () => {
  for (const code of [401, 403, 500]) {
    let calls = 0; const result = await createAlphaAccountAccess(config, { userId: 'a', accessToken: 'x' }, async () => ++calls === 1 ? Response.json({ id: 'a' }) : new Response('{}', { status: code })).read();
    assert.deepEqual(result, { ok: false, reason: code === 500 ? 'unavailable' : 'session-expired' });
  }
  assert.deepEqual(await createAlphaAccountAccess(config, { userId: 'a', accessToken: 'x' }, async () => { throw Error('offline'); }).open(), { ok: false, reason: 'unavailable' });
});
test('M2 A slow read is discarded after B login; logout empties memory immediately', async () => {
  const hold = deferred<AlphaAccessResult>(), state = createAlphaSessionBoundary();
  state.bind('a', { read: () => hold.promise, open: () => hold.promise }); const pending = state.load();
  state.bind('b', { read: async () => ({ ok: true, account: account('b') }), open: async () => ({ ok: true, account: account('b') }) }); await state.load();
  hold.resolve({ ok: true, account: account('a') }); assert.equal(await pending, false); assert.equal(state.snapshot().account?.ownerId, 'b');
  state.bind(null, null); assert.deepEqual(state.snapshot(), { ownerId: null, account: null, status: 'signed-out' });
});
test('M2 old empty response cannot replace a newer successful open in same account', async () => {
  const hold = deferred<AlphaAccessResult>(), state = createAlphaSessionBoundary();
  state.bind('a', { read: () => hold.promise, open: async () => ({ ok: true, account: account('a') }) }); const pending = state.load(); await state.load(true);
  hold.resolve({ ok: true, account: null }); assert.equal(await pending, false); assert.equal(state.snapshot().status, 'ready');
});
test('M2 revoked session/invalid data erase previous account view without creating anything', async () => {
  const state = createAlphaSessionBoundary(); let ok = true;
  state.bind('a', { read: async () => ok ? ({ ok: true, account: account('a') }) : ({ ok: false, reason: 'session-expired' }), open: async () => ({ ok: false, reason: 'invalid' }) });
  await state.load(); assert(state.snapshot().account); ok = false; await state.load(); assert.equal(state.snapshot().account, null); assert.equal(state.snapshot().status, 'session-expired');
});

test('M2 logout accepts an already-revoked session in current and legacy Auth responses', async () => {
  for (const response of [new Response(null, { status: 204 }), new Response(null, { status: 401 }),
    Response.json({ code: 'session_not_found' }, { status: 403 }),
    Response.json({ code: 403, error_code: 'session_not_found', msg: 'session gone' }, { status: 403 })]) {
    assert.equal(await isConfirmedAlphaLogout(response), true);
  }
});

test('M2 logout preserves the closed retry state for unknown forbidden, missing endpoint, malformed and server errors', async () => {
  for (const response of [Response.json({ code: 'unexpected_failure' }, { status: 403 }),
    Response.json({ code: 'unexpected_failure', error_code: 'session_not_found' }, { status: 403 }),
    Response.json({ code: 'session_not_found' }, { status: 404 }),
    Response.json({ code: 'session_not_found' }, { status: 500 }),
    Response.json(null, { status: 403 }), new Response('not-json', { status: 403 })]) {
    assert.equal(await isConfirmedAlphaLogout(response), false);
  }
});
