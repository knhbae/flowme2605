import { expect, test, type Page, type Route } from '@playwright/test';
import { createProgramPrivateSpace } from '../../lib/flow/integrated-poc/program-data';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';

export const prefix = 'flow:poc:personal-workspace:v1:';
export const sessionKey = `${prefix}alpha-auth:session`;
export const users = {
  a: { id: '11111111-1111-4111-8111-111111111111', email: 'alpha-a@example.invalid', aud: 'authenticated', role: 'authenticated', is_anonymous: false, app_metadata: {}, user_metadata: {}, created_at: '2026-09-21T00:00:00Z' },
  b: { id: '22222222-2222-4222-8222-222222222222', email: 'alpha-b@example.invalid', aud: 'authenticated', role: 'authenticated', is_anonymous: false, app_metadata: {}, user_metadata: {}, created_at: '2026-09-21T00:00:00Z' },
};
export type Actor = keyof typeof users;
const aliases: Record<Actor,string> = { a:'member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', b:'member-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
export const isSocialReadOrInit = (request: string) => /^POST \/rest\/v1\/rpc\/flowme_alpha_social_(?:open|read)_v1$/.test(request);
export function pairedSocialAccount(actor: Actor, account: unknown) {
  return { ok:true,value:{ account,context:{ schema:'flowme-alpha-social-context/1',revision:0,ownActorId:aliases[actor],
    actors: [{id:aliases.a,name:'참여자 A'},{id:aliases.b,name:'참여자 B'}],
    public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]} } } };
}
export function session(actor: Actor) {
  const expires_at = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: users[actor].id, exp: expires_at, aud: 'authenticated', role: 'authenticated' })}.browser-fixture-only`,
    refresh_token: `fixture-refresh-${actor}`, expires_in: 3600, expires_at, token_type: 'bearer', user: users[actor] };
}
export function emptyAccount(actor: Actor) {
  return { schema: 'flowme-alpha-account/1', ownerId: users[actor].id, revision: 0,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: users[actor].id, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
}
export function accountWithDocument(actor: Actor, title: string, raw: string) {
  const account = emptyAccount(actor);
  account.space.text = M.addDocument(account.space.text, { title });
  const documentId = account.space.text.documents.at(-1)!.id;
  account.space.text = M.editText(account.space.text, documentId, raw);
  account.space.position.documentId = documentId;
  return account;
}
export const invalidAccountMarker = 'INVALID_ACCOUNT_PAYLOAD_MUST_NOT_APPEAR';
type StorageAudit = { writes: { method: string; key: string }[]; forbidden: string[]; operational: Record<string, string | null>; failRemove: boolean; failMarker: boolean; receivedRefreshTokens: string[] };
declare global { interface Window { __alphaStorageAudit: StorageAudit } }

export async function mockAlpha(page: Page) {
  const requests: string[] = [], unexpected: string[] = [], pageErrors: string[] = [], workspaceRequests: string[] = [];
  const consoleErrors: { text: string; url: string }[] = [];
  const accounts = new Map<Actor, unknown>();
  const state = { userFailure: false, database: 'normal' as 'normal' | 'network' | 'invalid', logoutFailure: false,
    logoutRevoked: false, logoutForbidden: false,
    pkceFailure: false, holdPkce: false, heldPkce: null as Route | null, updatedOwners: [] as Actor[],
    holdPasswordUpdate: false, heldPasswordUpdate: null as Route | null, passwordUpdateAuthorizations: [] as string[],
    holdA: false, held: null as Route | null, pkceRequests: [] as Record<string, unknown>[], refreshRequests: [] as string[] };
  await page.addInitScript(({ prefix, sessionKey }) => {
    const operational = { 'flow:saved-plans': '[{"sentinel":"untouched"}]\r\n', 'flow:completion:v1': '{"opaque":true}', 'other-app:key': 'also untouched' };
    const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
    for (const [key, value] of Object.entries(operational)) if (localStorage.getItem(key) === null) set.call(localStorage, key, value);
    const audit: StorageAudit = window.__alphaStorageAudit = { writes: [], forbidden: [], operational, failRemove: false, failMarker: false, receivedRefreshTokens: [] };
    // Observe completion of the real SDK's async message listener, not an extra
    // HTTP read (same-owner refresh intentionally keeps the personal view mounted).
    const addListener = BroadcastChannel.prototype.addEventListener, removeListener = BroadcastChannel.prototype.removeEventListener;
    const wrappedListeners = new WeakMap<EventListener, EventListener>();
    BroadcastChannel.prototype.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (!listener) return;
      if (this.name !== sessionKey || type !== 'message' || typeof listener !== 'function') return addListener.call(this, type, listener, options);
      let wrapped = wrappedListeners.get(listener);
      if (!wrapped) {
        wrapped = async event => {
          await listener.call(this, event);
          const data = (event as MessageEvent).data;
          if (data?.event === 'TOKEN_REFRESHED') audit.receivedRefreshTokens.push(String(data.session?.access_token));
        };
        wrappedListeners.set(listener, wrapped);
      }
      return addListener.call(this, type, wrapped, options);
    };
    BroadcastChannel.prototype.removeEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
      if (!listener) return;
      return removeListener.call(this, type, typeof listener === 'function' ? wrappedListeners.get(listener) ?? listener : listener, options);
    };
    Storage.prototype.setItem = function(key, value) {
      audit.writes.push({ method: 'setItem', key }); if (!key.startsWith(prefix)) audit.forbidden.push(`setItem:${key}`);
      if (audit.failMarker && key === `${sessionKey}-logout-pending`) throw new DOMException('Synthetic storage failure', 'QuotaExceededError');
      return set.call(this, key, value);
    };
    Storage.prototype.removeItem = function(key) {
      audit.writes.push({ method: 'removeItem', key }); if (!key.startsWith(prefix)) audit.forbidden.push(`removeItem:${key}`);
      if (audit.failRemove && key.startsWith(sessionKey)) throw new DOMException('Synthetic storage failure', 'SecurityError');
      return remove.call(this, key);
    };
    Storage.prototype.clear = function() { audit.forbidden.push('clear'); throw Error('clear forbidden'); };
  }, { prefix, sessionKey });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url }); });
  await page.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === 'http://localhost:3104') {
      // Auth-only regressions must never send workspace commands to the real BFF.
      if (url.pathname.startsWith('/api/alpha/')) {
        workspaceRequests.push(`${request.method()} ${url.pathname}`);
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
      }
      return route.continue();
    }
    if (url.origin !== 'https://wkmzcxpnojobxrgebapw.supabase.co') { unexpected.push(request.url()); return route.abort(); }
    requests.push(`${request.method()} ${url.pathname}${url.search}`);
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'X-Supabase-Api-Version', 'X-Supabase-Api-Version': '2024-01-01' } });
    const token = request.headers().authorization?.replace('Bearer ', '');
    const actor: Actor = token?.split('.').length === 3 && JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub === users.b.id ? 'b' : 'a';
    if (url.pathname === '/auth/v1/settings') return json({ external: { google: false }, disable_signup: false });
    if (url.pathname === '/auth/v1/token') {
      const body = request.postDataJSON() as Record<string, unknown>;
      if (url.searchParams.get('grant_type') === 'pkce') {
        state.pkceRequests.push(body);
        if (state.holdPkce) { state.heldPkce = route; return; }
        if (state.pkceFailure) return json({ code: 'bad_code_verifier', msg: 'Synthetic invalid recovery code' }, 400);
        return json(session('a'));
      }
      if (url.searchParams.get('grant_type') === 'refresh_token') { state.refreshRequests.push(String(body.refresh_token)); return json(session(body.refresh_token === 'fixture-refresh-b' ? 'b' : 'a')); }
      if (body.password === 'incorrect') return json({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
      return json(session(body.email === users.b.email ? 'b' : 'a'));
    }
    if (url.pathname === '/auth/v1/user') {
      if (request.method() === 'PUT') { state.updatedOwners.push(actor); state.passwordUpdateAuthorizations.push(request.headers().authorization ?? ''); }
      if (request.method() === 'PUT' && state.holdPasswordUpdate) { state.heldPasswordUpdate = route; return; }
      return state.userFailure ? json({ code: 'bad_jwt', msg: 'Session expired' }, 401) : json(users[actor]);
    }
    if (url.pathname === '/auth/v1/logout') {
      if (state.logoutFailure) return json({ code: 'unexpected_failure', msg: 'Synthetic logout failure' }, 500);
      if (state.logoutForbidden) return json({ code: 'unexpected_failure', msg: 'Synthetic forbidden' }, 403);
      if (state.logoutRevoked) return json({ code: 403, error_code: 'session_not_found', msg: 'Session not found' }, 403);
      return route.fulfill({ status: 204 });
    }
    if (url.pathname === '/auth/v1/recover') return json({});
    if (url.pathname === '/auth/v1/signup') return json({ user: users.a, session: null });
    if (url.pathname.startsWith('/rest/v1/')) {
      const socialRead = url.pathname === '/rest/v1/rpc/flowme_alpha_social_read_v1';
      const socialOpen = url.pathname === '/rest/v1/rpc/flowme_alpha_social_open_v1';
      if (socialRead || socialOpen) {
        expect(request.method()).toBe('POST'); expect(request.postDataJSON()).toEqual({});
        if (state.userFailure) return json({ok:false,reason:'unauthenticated'},401);
      }
      if (state.database === 'network') return route.abort('connectionfailed');
      if (state.database === 'invalid') return json(socialRead ? pairedSocialAccount(actor,accountWithDocument('b', invalidAccountMarker, invalidAccountMarker)) : [{ account: accountWithDocument('b', invalidAccountMarker, invalidAccountMarker) }]);
      if (state.holdA && actor === 'a') { state.held = route; return; }
      if (socialOpen) return json(accounts.has(actor) ? {ok:true,value:{ownActorId:aliases[actor]}} : {ok:false,reason:'not-found'});
      if (socialRead) return json(accounts.has(actor) ? pairedSocialAccount(actor,accounts.get(actor)) : {ok:false,reason:'not-found'});
      if (url.pathname === '/rest/v1/rpc/flowme_alpha_open_account_v1') {
        expect(request.postDataJSON()).toEqual({}); accounts.set(actor, emptyAccount(actor)); return json(accounts.get(actor));
      }
      if (url.pathname === '/rest/v1/flowme_alpha_accounts') return json(accounts.has(actor) ? [{ account: accounts.get(actor) }] : []);
    }
    unexpected.push(request.url()); return route.abort();
  });
  async function assertBoundary(intentionalApiErrors = false) {
    expect(unexpected, 'Unexpected external network requests').toEqual([]);
    expect(workspaceRequests, 'Auth-only flows must not issue private workspace commands').toEqual([]);
    expect(pageErrors, 'Uncaught page errors').toEqual([]);
    const consoleUnexpected = intentionalApiErrors ? consoleErrors.filter(message =>
      !(message.url.startsWith('https://wkmzcxpnojobxrgebapw.supabase.co/') && /^Failed to load resource:/.test(message.text))) : consoleErrors;
    expect(consoleUnexpected, 'Unexpected console errors').toEqual([]);
    const audit = await page.evaluate(() => ({ forbidden: window.__alphaStorageAudit.forbidden,
      actual: Object.fromEntries(Object.keys(window.__alphaStorageAudit.operational).map(key => [key, localStorage.getItem(key)])),
      expected: window.__alphaStorageAudit.operational }));
    expect.soft(audit.forbidden, 'Writes outside exact PoC prefix, including SDK probes').toEqual([]);
    expect(audit.actual, 'Operating storage bytes unchanged').toEqual(audit.expected);
    await test.info().attach('alpha-browser-boundary', { contentType: 'application/json', body: JSON.stringify({
      evidence: 'Chromium real SDK with synthetic intercepted Auth/REST; not real Supabase or a real mobile device',
      interceptedSupabaseRequests: requests.length, forwardedSupabaseRequests: 0,
      privateWorkspaceRequests: workspaceRequests,
      unexpectedExternalRequests: unexpected, outsideNamespaceCalls: audit.forbidden,
      operatingStorageBytesEqual: JSON.stringify(audit.actual) === JSON.stringify(audit.expected),
      operatingKeys: Object.keys(audit.expected).filter(key => key.startsWith('flow:')),
      pageErrors, unexpectedConsoleErrors: consoleUnexpected,
      intentionalApiConsoleErrors: intentionalApiErrors ? consoleErrors.filter(error => !consoleUnexpected.includes(error)) : [],
    }, null, 2) });
  }
  return { state, accounts, requests, workspaceRequests, pageErrors, consoleErrors, assertBoundary };
}
export async function login(page: Page, actor: Actor = 'a') {
  await page.getByLabel('이메일', { exact: true }).fill(users[actor].email);
  await page.getByLabel('비밀번호', { exact: true }).fill('Fixture-password-123!');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByText(users[actor].email, { exact: true })).toBeVisible();
}
