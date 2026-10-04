import type { Page, Route } from 'playwright';
import { createProgramPrivateSpace, programRecord } from '../../lib/flow/integrated-poc/program-data';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import { createAlphaFakeServer, validateAlphaCommand } from '../../lib/flow/integrated-poc/alpha-persistence/fake-server';
import { privateChanges, validateAlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { canonicalJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import type { AlphaAccount, AlphaPrivateCommand } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { alphaSocialReferences, type AlphaSocialContext } from '../../lib/flow/integrated-poc/alpha-social/projection';

export const ORIGIN = 'https://alpha.wikiplans.com';
export const LOCAL_ORIGIN = 'http://127.0.0.1:3106';
const AUTH_ORIGIN = 'https://wkmzcxpnojobxrgebapw.supabase.co';
const PREFIX = 'flow:poc:personal-workspace:v1:';
const SESSION_KEY = `${PREFIX}alpha-auth:session`;
const SEED_MARKER = `${PREFIX}memo-date-fixture-seeded:20261004`;
const SENTINELS = {
  'flow:saved-plans': '  synthetic memo-date sentinel\r\n',
  'flow:completion:v1': '{"untouched":true}',
  'other-app:key': 'exact bytes  ',
};
const USER = {
  id: '11111111-1111-4111-8111-111111111111', email: 'memo-date@example.invalid',
  aud: 'authenticated', role: 'authenticated', is_anonymous: false,
  app_metadata: {}, user_metadata: {}, created_at: '2026-10-04T00:00:00Z',
};
export const DOCUMENT_TITLE = '합성 메모·날짜 검증';
export const SEED_RAW = [
  '[2026-10-04]',
  '- [ ] 구획 날짜 작업',
  '  - 메모: 부모 첫 메모',
  '  - 메모: 부모 둘째 메모',
  '  - [ ] 하위 체크 <img src=x onerror=alert(1)>',
  '    - 메모: 하위 첫 메모',
  '- [ ] 개별 날짜 작업',
  '  - 날짜: 2026-10-06',
  '  - 메모: 개별 날짜 메모',
  '일반 메모 문장',
].join('\n');

function fixtureSession() {
  const expires_at = Math.floor(Date.now() / 1000) + 3600;
  // Synthetic ASCII claims only. This is not a signed token or a real login.
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: USER.id, exp: expires_at, aud: 'authenticated', role: 'authenticated' })}.browser-fixture-only`,
    refresh_token: 'memo-date-fixture-refresh', expires_in: 3600, expires_at, token_type: 'bearer', user: USER,
  };
}

/** Personal text only: no public copy, creator source, reference or recurrence seed. */
export function createMemoDateSeed(raw = SEED_RAW) {
  const context: AlphaSocialContext = {
    schema: 'flowme-alpha-social-context/1', revision: 0,
    ownActorId: 'member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    actors: [{ id: 'member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: '합성 참여자' }],
    public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] },
  };
  const account: AlphaAccount = {
    schema: 'flowme-alpha-account/1', ownerId: USER.id, revision: 0,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: USER.id, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [],
  };
  account.space.text = M.addDocument(account.space.text, { title: DOCUMENT_TITLE });
  const documentId = account.space.text.documents.at(-1)!.id;
  account.space.text = M.editText(account.space.text, documentId, raw);
  account.space.position.documentId = documentId;
  const references = alphaSocialReferences(context, USER.id);
  if (!validateAlphaAccount(account, references, USER.id)) throw Error('memo-date-invalid-synthetic-seed');
  return { account, context, references, documentId };
}

/** The only forwarding capability: fixed localhost GET document/static/icon. */
export function memoDateResourceTarget(address: string, method: string): string | null {
  try {
    if (method !== 'GET') return null;
    const url = new URL(address);
    if (![ORIGIN, LOCAL_ORIGIN].includes(url.origin) || url.username || url.password || url.hash) return null;
    const path = url.pathname;
    if (path !== '/alpha' && path !== '/icon.svg' && path !== '/favicon.ico'
      && !/^\/_next\/static\/[A-Za-z0-9_./%-]+$/.test(path)) return null;
    if (/%2f|%5c|%2e/i.test(address) || path.includes('..') || address.includes('\\')) return null;
    return `${LOCAL_ORIGIN}${path}${url.search}`;
  } catch { return null; }
}

/** CLI callbacks and Playwright Request objects can inhabit different realms.
 * Decode wire bytes here rather than relaxing the shipped plain-object guard. */
export function decodeMemoDateRequestBody(raw: string | null): Record<string, unknown> | null {
  try {
    if (typeof raw !== 'string') return null;
    const body: unknown = JSON.parse(raw);
    return programRecord(body) ? body : null;
  } catch { return null; }
}

/** The author invokes this with an object from outside the bundle's VM realm. */
export function memoDateFixtureRealmSelfCheck(foreignBody: { command: unknown }) {
  const localBody = decodeMemoDateRequestBody(JSON.stringify(foreignBody));
  const foreignRealmRejected = !validateAlphaCommand(foreignBody.command);
  const locallyDecodedAccepted = !!localBody && validateAlphaCommand(localBody.command);
  const malformed = [null, '', '{bad', '[]', 'null', '42'];
  if (!foreignRealmRejected || !locallyDecodedAccepted || malformed.some(raw => decodeMemoDateRequestBody(raw) !== null))
    throw Error('memo-date-wire-realm-boundary-mismatch');
  return { foreignRealmRejected, locallyDecodedAccepted, malformedDenied: malformed.length,
    validatorUnchanged: true, allowedPrivateFields: ['text', 'position'] };
}

/** In-memory verification of the generated bundle, NOT browser QA. */
export async function memoDateFixtureSelfCheck() {
  const seed = createMemoDateSeed(), doc = M.getDocument(seed.account.space.text, seed.documentId);
  const items = M.parseDocument(doc, seed.account.space.text).items;
  const inherited = items.find(item => item.title === '구획 날짜 작업');
  const explicit = items.find(item => item.title === '개별 날짜 작업');
  const child = items.find(item => item.parentItemId === inherited?.id);
  if (!inherited || inherited.date !== '2026-10-04' || inherited.explicitDate
    || !explicit || explicit.date !== '2026-10-06' || !explicit.explicitDate
    || child?.note !== '하위 첫 메모') throw Error('memo-date-seed-contract-mismatch');
  const server = createAlphaFakeServer([{ account: seed.account, references: seed.references }]);
  const repository = server.connect(server.issueSession(USER.id));
  const text = M.updateTask(seed.account.space.text, inherited.id, { date: '2026-10-08' });
  const command: AlphaPrivateCommand = {
    schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: 'memo-date-selfcheck', expectedRevision: 0,
    changes: privateChanges(seed.account.space, { ...seed.account.space, text }),
  };
  const result = await repository.execute(command), reloaded = await repository.read();
  if (!result.ok || !reloaded.ok || reloaded.value.revision !== 1
    || M.parseDocument(M.getDocument(reloaded.value.space.text, seed.documentId), reloaded.value.space.text).items.find(item => item.id === inherited.id)?.date !== '2026-10-08'
    || M.raw(M.getDocument(reloaded.value.space.text, seed.documentId)).split('\n')[0] !== '[2026-10-04]'
    || canonicalJson(reloaded.value.source) !== canonicalJson(seed.account.source)) throw Error('memo-date-fake-save-reload-mismatch');
  const forbidden = [
    [ORIGIN + '/api/alpha/account', 'GET'], [ORIGIN + '/alpha', 'POST'],
    [AUTH_ORIGIN + '/auth/v1/user', 'GET'], ['https://example.invalid/alpha', 'GET'],
    [LOCAL_ORIGIN + '/api/alpha/account', 'GET'], [ORIGIN + '/_next/static/%2e%2e/secret', 'GET'],
    [ORIGIN + '/_next/static/a%2fb.js', 'GET'], ['https://user:password@alpha.wikiplans.com/alpha', 'GET'],
  ];
  if (forbidden.some(([url, method]) => memoDateResourceTarget(url, method) !== null)
    || memoDateResourceTarget(ORIGIN + '/alpha', 'GET') !== LOCAL_ORIGIN + '/alpha'
    || memoDateResourceTarget(ORIGIN + '/_next/static/chunks/app.js', 'GET') !== LOCAL_ORIGIN + '/_next/static/chunks/app.js')
    throw Error('memo-date-resource-boundary-mismatch');
  return { evidence: 'Bundle/in-memory checks only; no browser or real backend', seedItems: items.length,
    inheritedDate: inherited.date, explicitDate: explicit.date, fakeSaveReload: true,
    deniedResourceCases: forbidden.length, ...server.diagnostics() };
}

/** Install in a fresh, isolated CLI browser session before opening /alpha. */
export async function installMemoDateBrowserFixture(page: Page, options: {
  seedRaw?: string; enableFaultControl?: boolean; expectedBuildId?: string;
} = {}) {
  const context = page.context();
  if (context.pages().length !== 1 || context.serviceWorkers().length || !['about:blank', 'chrome://newtab/'].includes(page.url()))
    throw Error('memo-date-requires-fresh-isolated-about-blank-session');
  const stored = await context.storageState({ indexedDB: true });
  if (stored.cookies.length || stored.origins.length)
    throw Error('memo-date-rejects-existing-profile-state');
  const seed = createMemoDateSeed(options.seedRaw);
  const server = createAlphaFakeServer([{ account: seed.account, references: seed.references }]);
  const repository = server.connect(server.issueSession(USER.id));
  const commands: AlphaPrivateCommand[] = [], lookups: string[] = [], reads: number[] = [];
  const prohibitedRequests: string[] = [], deniedWebSockets: string[] = [], pageErrors: string[] = [], consoleErrors: string[] = [];
  const storageCalls: { method: string; key: string | null; area: string }[] = [];
  const resources: { request: string; target: string; status: number }[] = [];
  let authIntercepted = 0, apiIntercepted = 0, documentLoads = 0;
  let rejectNext = false;
  let holdNext = false;
  let releaseHeld: (() => void) | null = null;
  const rejectedCommands: string[] = [];
  const heldCommands: string[] = [];
  async function current() {
    const result = await repository.read();
    if (!result.ok) throw Error('memo-date-synthetic-account-unavailable');
    return result.value;
  }
  const json = (route: Route, value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'X-Supabase-Api-Version': '2024-01-01' }, body: JSON.stringify(value) });
  const deny = (route: Route, description: string) => { prohibitedRequests.push(description); return route.abort('blockedbyclient'); };
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.exposeFunction('__memoDateFixtureStorageCall', (call: typeof storageCalls[number]) => storageCalls.push(call));
  // Opt-in synthetic failure only. This has no server/API forwarding capability.
  if (options.enableFaultControl) {
    await page.exposeFunction('__memoDateFixtureRejectNext', () => { rejectNext = true; });
    await page.exposeFunction('__memoDateFixtureHoldNext', () => { holdNext = true; });
    await page.exposeFunction('__memoDateFixtureRelease', () => { const release = releaseHeld; releaseHeld = null; release?.(); });
  }
  await page.exposeFunction('__memoDateFixtureState', async () => {
    const account = await current(), doc = M.getDocument(account.space.text, seed.documentId);
    return {
      evidence: 'Synthetic SDK Auth + real app UI + in-memory account CAS. Not live Auth/RLS/DB, OS IME or observed-user validation.',
      documentId: seed.documentId, title: DOCUMENT_TITLE, raw: M.raw(doc), account,
      rows: M.rowMeta(account.space.text, seed.documentId), items: M.parseDocument(doc, account.space.text).items,
      commandCount: commands.length, commands, lookups, reads, ...server.diagnostics(),
      prohibitedRequests, deniedWebSockets, pageErrors, consoleErrors, storageCalls, resources,
      authIntercepted, apiIntercepted, documentLoads, rejectedCommands, heldCommands, requestHeld: !!releaseHeld,
      expectedBuildId: options.expectedBuildId ?? null, forwardedAuth: 0, forwardedApi: 0,
      forbiddenStorageCalls: storageCalls.filter(call => call.method === 'clear' || !call.key?.startsWith(PREFIX)),
      publicUnchanged: canonicalJson(seed.context.public) === canonicalJson(seed.references.public),
    };
  });
  await page.addInitScript(({ origin, prefix, sessionKey, marker, sentinels, session }) => {
    if (location.origin !== origin) return;
    const set = Storage.prototype.setItem;
    const bootstrapErrors: string[] = [];
    const markerValue = sessionStorage.getItem(marker);
    if (!markerValue) {
      // Never overwrite an existing auth session or unrelated bytes. Reload does
      // not reseed/repair anything, so destructive writes stay observable.
      if (localStorage.getItem(sessionKey) !== null || Object.entries(sentinels).some(([key, value]) => localStorage.getItem(key) !== null && localStorage.getItem(key) !== value)) {
        bootstrapErrors.push('synthetic-bootstrap-rejected-existing-storage');
      } else {
        for (const [key, value] of Object.entries(sentinels)) if (localStorage.getItem(key) === null) set.call(localStorage, key, value);
        set.call(localStorage, sessionKey, JSON.stringify(session));
        set.call(sessionStorage, marker, 'seeded-once');
      }
    }
    const auditCalls: { method: string; key: string | null; area: string }[] = [];
    for (const name of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[name];
      Object.defineProperty(Storage.prototype, name, { configurable: true, value: function(this: Storage, ...args: string[]) {
        const call = { method: name, key: name === 'clear' ? null : String(args[0]), area: this === localStorage ? 'local' : 'session' };
        auditCalls.push(call);
        void (window as any).__memoDateFixtureStorageCall(call).catch(() => undefined);
        return Reflect.apply(original, this, args);
      } });
    }
    const workerAttempts: string[] = [];
    if (navigator.serviceWorker) Object.defineProperty(navigator.serviceWorker, 'register', { configurable: true,
      value: (address: string) => { workerAttempts.push(String(address)); return Promise.reject(Error('memo-date-service-worker-denied')); } });
    Object.defineProperty(window, '__memoDateFixtureReport', { value: async () => {
      const state = await (window as any).__memoDateFixtureState();
      const currentSentinels = Object.fromEntries(Object.keys(sentinels).map(key => [key, localStorage.getItem(key)]));
      const authKeys = Object.keys(localStorage).filter(key => key.startsWith(`${prefix}alpha-auth:session`));
      return { ...state, bootstrapErrors, workerAttempts, browserStorageCalls: auditCalls,
        expectedSentinels: sentinels, currentSentinels,
        sentinelsExact: Object.entries(sentinels).every(([key, value]) => currentSentinels[key] === value),
        localAuthKeys: authKeys, localAuthKeyPrefixValid: authKeys.every(key => key === sessionKey || key.startsWith(`${sessionKey}-`)) };
    } });
  }, { origin: ORIGIN, prefix: PREFIX, sessionKey: SESSION_KEY, marker: SEED_MARKER, sentinels: SENTINELS, session: fixtureSession() });
  await context.routeWebSocket('**/*', socket => { deniedWebSockets.push(socket.url()); socket.close(); });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const exact = !url.username && !url.password && !url.search && !url.hash;
    if (url.origin === AUTH_ORIGIN) {
      authIntercepted++;
      const endpoint = url.pathname;
      if (method === 'OPTIONS' && ['/auth/v1/settings', '/auth/v1/token', '/auth/v1/user', '/rest/v1/flowme_alpha_accounts',
        '/rest/v1/rpc/flowme_alpha_social_open_v1', '/rest/v1/rpc/flowme_alpha_social_read_v1'].includes(endpoint)) return json(route, {});
      if (exact && method === 'GET' && endpoint === '/auth/v1/settings') return json(route, { external: { google: false }, disable_signup: false });
      if (exact && method === 'GET' && endpoint === '/auth/v1/user') return json(route, USER);
      if (method === 'POST' && endpoint === '/auth/v1/token' && !url.username && !url.password
        && url.searchParams.size === 1 && url.searchParams.get('grant_type') === 'refresh_token') {
        const body = decodeMemoDateRequestBody(request.postData());
        if (body?.refresh_token === 'memo-date-fixture-refresh') return json(route, fixtureSession());
      }
      if (method === 'GET' && endpoint === '/rest/v1/flowme_alpha_accounts' && !url.username && !url.password) {
        const account = await current(); reads.push(account.revision); return json(route, [{ account }]);
      }
      if (exact && method === 'POST' && endpoint === '/rest/v1/rpc/flowme_alpha_social_open_v1')
        return json(route, { ok: true, value: { ownActorId: seed.context.ownActorId } });
      if (exact && method === 'POST' && endpoint === '/rest/v1/rpc/flowme_alpha_social_read_v1') {
        const account = await current(); reads.push(account.revision);
        return json(route, { ok: true, value: { account, context: seed.context } });
      }
      return deny(route, `${method}:${url.origin}${endpoint}:auth-denied`);
    }
    if ([ORIGIN, LOCAL_ORIGIN].includes(url.origin) && url.pathname.startsWith('/api/alpha/')) {
      apiIntercepted++;
      if (exact && method === 'GET' && url.pathname === '/api/alpha/catalog') return json(route, { ok: false, reason: 'unavailable' });
      if (exact && method === 'POST' && url.pathname === '/api/alpha/account') {
        const body = decodeMemoDateRequestBody(request.postData());
        if (body?.kind === 'lookup' && typeof body.requestId === 'string') { lookups.push(body.requestId); return json(route, await repository.lookup(body.requestId)); }
        if (body?.kind === 'execute' && validateAlphaCommand(body.command)
          && (body.command.kind === 'undo-private' || body.command.changes.every(change => ['text', 'position'].includes(change.field)))) {
          if (rejectNext) { rejectNext = false; rejectedCommands.push(body.command.requestId); return json(route, { ok: false, reason: 'limit' }); }
          if (holdNext) { holdNext = false; heldCommands.push(body.command.requestId); await new Promise<void>(resolve => { releaseHeld = resolve; }); }
          commands.push(structuredClone(body.command)); return json(route, await repository.execute(body.command));
        }
      }
      // Public-copy schedule and all creator/social writes are deliberately out
      // of this personal-text fixture. No API request ever reaches localhost.
      return deny(route, `${method}:${url.origin}${url.pathname}:api-or-command-denied`);
    }
    const target = memoDateResourceTarget(request.url(), method);
    if (!target) return deny(route, `${method}:${url.origin}${url.pathname}:resource-denied`);
    const response = await route.fetch({ url: target, method: 'GET', maxRedirects: 0, maxRetries: 2,
      headers: { Host: 'alpha.wikiplans.com', 'X-Forwarded-Host': 'alpha.wikiplans.com', 'X-Forwarded-Proto': 'https',
        Accept: request.headers().accept ?? '*/*', 'Cache-Control': 'no-cache' } });
    resources.push({ request: request.url(), target, status: response.status() });
    if (!response.ok()) { await response.dispose(); return deny(route, `GET:${url.pathname}:local-resource-status`); }
    const body = await response.body();
    if (url.pathname === '/alpha') {
      if (options.expectedBuildId && !body.toString('utf8').includes(options.expectedBuildId)) {
        await response.dispose(); return deny(route, 'GET:/alpha:wrong-candidate-build');
      }
      documentLoads++;
    }
    try { await route.fulfill({ response, body }); } finally { await response.dispose(); }
  });
  await page.goto(`${ORIGIN}/alpha`, { waitUntil: 'domcontentloaded' });
  return { installed: true, documentId: seed.documentId, title: DOCUMENT_TITLE, origin: ORIGIN,
    report: 'await page.evaluate(() => window.__memoDateFixtureReport())',
    evidence: 'Fixture installation only; UI checks remain for the CLI operator.' };
}
