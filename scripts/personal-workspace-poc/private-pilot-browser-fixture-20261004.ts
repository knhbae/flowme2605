import type { Page, Route } from 'playwright';
import { createProgramPrivateSpace, programIdentifier, programRecord, programShape } from '../../lib/flow/integrated-poc/program-data';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import { createAlphaFakeServer } from '../../lib/flow/integrated-poc/alpha-persistence/fake-server';
import { privateChanges, validateAlphaAccount, materializeAccount } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { canonicalJson, detached } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import type { AlphaAccount, AlphaChange, AlphaCommand, AlphaReceipt, AlphaRepository, AlphaResult } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { alphaSocialReferences, type AlphaSocialContext } from '../../lib/flow/integrated-poc/alpha-social/projection';
import { validateAlphaCreatorCommand } from '../../lib/flow/integrated-poc/alpha-creator/contract';
import { dispatchAlphaCreatorCommand } from '../../lib/flow/integrated-poc/alpha-creator/dispatch';
import { isM3Command } from '../../lib/flow/integrated-poc/alpha-sync/contract';
import { isAlphaCreatorUndo, isAlphaWireReceipt } from '../../lib/flow/integrated-poc/alpha-sync/wire';
import { preservesAlphaPrivateSources, preservesAlphaPrivateExecutionHolds } from '../../lib/flow/integrated-poc/alpha-server/private-boundary';
import { makeProgramPrivateOutput } from '../../lib/flow/integrated-poc/private-output';

export const PRIVATE_PILOT_ORIGIN = 'https://alpha.wikiplans.com';
export const PRIVATE_PILOT_LOCAL_ORIGIN = 'http://127.0.0.1:3115';
const AUTH_ORIGIN = 'https://wkmzcxpnojobxrgebapw.supabase.co';
const PREFIX = 'flow:poc:personal-workspace:v1:';
const SESSION_KEY = `${PREFIX}alpha-auth:session`;
const SEED_MARKER = `${PREFIX}private-pilot-fixture-seeded:20261004`;
const SENTINELS = { 'flow:saved-plans': '  synthetic private-pilot sentinel\r\n',
  'flow:completion:v1': '{"untouched":true}', 'other-app:key': 'exact bytes  ' };
const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'private-pilot@example.invalid',
  aud: 'authenticated', role: 'authenticated', is_anonymous: false,
  app_metadata: {}, user_metadata: {}, created_at: '2026-10-04T00:00:00Z' };
export type PrivatePilotInput = { title: string; raw: string };
export function validatePrivatePilotInput(value: unknown): value is PrivatePilotInput {
  return programShape(value, ['title', 'raw']) && typeof value.title === 'string' && value.title.trim().length > 0
    && value.title.length <= 200 && typeof value.raw === 'string' && value.raw.trim().length > 0 && value.raw.length <= 100000;
}
function fixtureSession() {
  const expires_at = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: USER.id, exp: expires_at, aud: 'authenticated', role: 'authenticated' })}.private-pilot-fixture-only`,
    refresh_token: 'private-pilot-fixture-refresh', expires_in: 3600, expires_at, token_type: 'bearer', user: USER };
}
/** Empty account: no creator record, source import or resulting execution document is seeded. */
export function createPrivatePilotSeed() {
  const context: AlphaSocialContext = { schema: 'flowme-alpha-social-context/1', revision: 0,
    ownActorId: 'member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    actors: [{ id: 'member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: '합성 참여자' }],
    public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
  const account: AlphaAccount = { schema: 'flowme-alpha-account/1', ownerId: USER.id, revision: 0,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: USER.id, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const references = alphaSocialReferences(context, USER.id);
  if (!validateAlphaAccount(account, references, USER.id)) throw Error('private-pilot-invalid-empty-seed');
  return { account, context, references };
}
/** Same fixed resource boundary as memo-date QA, narrowed to the approved listener. */
export function privatePilotResourceTarget(address: string, method: string, localOrigin = PRIVATE_PILOT_LOCAL_ORIGIN): string | null {
  if (localOrigin !== PRIVATE_PILOT_LOCAL_ORIGIN || method !== 'GET') return null;
  try {
    const url = new URL(address);
    if (![PRIVATE_PILOT_ORIGIN, localOrigin].includes(url.origin) || url.username || url.password || url.hash) return null;
    const path = url.pathname;
    if (path !== '/alpha' && path !== '/icon.svg' && path !== '/favicon.ico'
      && !/^\/_next\/static\/[A-Za-z0-9_./%-]+$/.test(path)) return null;
    if (/%2f|%5c|%2e/i.test(address) || path.includes('..') || address.includes('\\')) return null;
    return `${localOrigin}${path}${url.search}`;
  } catch { return null; }
}
export function decodePrivatePilotRequestBody(raw: string | null): Record<string, unknown> | null {
  try { const body: unknown = typeof raw === 'string' ? JSON.parse(raw) : null; return programRecord(body) ? body : null; }
  catch { return null; }
}
/** Product validators remain authoritative; the fixture allows only the B workflow. */
export function validatePrivatePilotCommand(value: unknown, approved: PrivatePilotInput): value is AlphaCommand {
  if (!validatePrivatePilotInput(approved)) return false;
  if (isM3Command(value)) return value.kind === 'undo-private'
    || value.changes.every(change => ['text', 'position'].includes(change.field));
  if (isAlphaCreatorUndo(value)) return true;
  if (!validateAlphaCreatorCommand(value)) return false;
  if (value.intent.type === 'working') return value.intent.working === null
    || !value.intent.working.nativeDocument && !value.intent.working.nativeSelection && !value.intent.working.nativePendingRawText;
  if (value.intent.type === 'raw-handoff') return true;
  return value.intent.type === 'library-action' && value.intent.action.type === 'save'
    && value.intent.action.title === approved.title && value.intent.action.rawText === approved.raw;
}
/** Match the shipped HTTP repository's family endpoints without forwarding API requests. */
export function privatePilotCommandTarget(address: string, method: string, body: unknown, approved: PrivatePilotInput): 'lookup' | 'execute' | null {
  try {
    const url = new URL(address);
    if (![PRIVATE_PILOT_ORIGIN, PRIVATE_PILOT_LOCAL_ORIGIN].includes(url.origin) || url.username || url.password
      || url.search || url.hash || method !== 'POST') return null;
    if (url.pathname === '/api/alpha/account' && programShape(body, ['kind', 'requestId'])
      && body.kind === 'lookup' && programIdentifier(body.requestId) && body.requestId.length <= 160) return 'lookup';
    if (!programShape(body, ['kind', 'command']) || body.kind !== 'execute'
      || !validatePrivatePilotCommand(body.command, approved)) return null;
    const endpoint = isM3Command(body.command) ? '/api/alpha/account' : '/api/alpha/creator';
    return url.pathname === endpoint ? 'execute' : null;
  } catch { return null; }
}
type PilotEntry = { command: AlphaCommand; receipt: AlphaReceipt; inverse: AlphaChange[] };
/** Synthetic transport adapter, not a product schema or a browser mutation port.
 * Creator intents pass the shipped reducer/boundary, then the existing fake CAS.
 * The original wire identity and inverse ledger preserve normal Undo/Redo receipts. */
export function createPrivatePilotRepository(approved: PrivatePilotInput) {
  if (!validatePrivatePilotInput(approved)) throw Error('private-pilot-approved-input-required');
  const input = detached(approved), seed = createPrivatePilotSeed();
  const server = createAlphaFakeServer([{ account: seed.account, references: seed.references }]);
  const backing = server.connect(server.issueSession(USER.id));
  const ledger = new Map<string, PilotEntry>(), commands: AlphaCommand[] = [], deniedCommands: string[] = [];
  let queue: Promise<unknown> = Promise.resolve();
  const repository: AlphaRepository = {
    read: () => backing.read(),
    lookup: async id => programIdentifier(id) && id.length <= 160
      ? { ok: true, value: detached(ledger.get(id)?.receipt ?? null) } : { ok: false, reason: 'invalid' },
    execute: async original => {
      let command: AlphaCommand;
      try { command = detached(original); } catch { return { ok: false, reason: 'invalid' }; }
      const attemptedKind = String(command?.kind ?? 'invalid');
      const run = async (): Promise<AlphaResult<AlphaReceipt>> => {
        if (!validatePrivatePilotCommand(command, input)) { deniedCommands.push(attemptedKind); return { ok: false, reason: 'invalid' }; }
        const prior = ledger.get(command.requestId);
        if (prior) return canonicalJson(prior.command) === canonicalJson(command)
          ? { ok: true, value: detached(prior.receipt) } : { ok: false, reason: 'idempotency-conflict' };
        const read = await backing.read(); if (!read.ok) return read;
        const before = read.value;
        if (command.expectedRevision !== before.revision) return { ok: false, reason: 'revision-conflict' };
        let changes: AlphaChange[], resultId: string | undefined;
        if (command.kind === 'creator') {
          const result = dispatchAlphaCreatorCommand(before, command, seed.references);
          if (!result.ok) return { ok: false, reason: result.reason === 'limit' ? 'limit' : result.reason === 'conflict' || result.reason === 'revision-conflict' ? 'revision-conflict' : 'invalid' };
          if (!result.changed) return { ok: false, reason: 'no-change' };
          changes = result.changes; resultId = result.result;
        } else if (command.kind === 'change-private') changes = command.changes;
        else if (command.kind === 'undo-private' || command.kind === 'undo-creator') {
          const old = ledger.get(command.operationId);
          const family = command.kind === 'undo-creator' ? ['creator', 'undo-creator'] : ['change-private', 'undo-private'];
          if (!old || old.receipt.revision !== before.revision || !family.includes(old.command.kind)) return { ok: false, reason: 'undo-conflict' };
          changes = old.inverse;
        } else return { ok: false, reason: 'invalid' };
        const candidate = detached(before);
        for (const change of changes) {
          if (change.present) Object.assign(candidate.space, { [change.field]: detached(change.value) });
          else Reflect.deleteProperty(candidate.space, change.field);
        }
        if (!validateAlphaAccount(candidate, seed.references, USER.id)
          || !preservesAlphaPrivateSources(before, candidate, seed.references)
          || !preservesAlphaPrivateExecutionHolds(before, candidate)) return { ok: false, reason: 'invalid' };
        const result = await backing.execute({ schema: 'flowme-alpha-command/1', kind: 'change-private',
          requestId: command.requestId, expectedRevision: command.expectedRevision, changes });
        if (!result.ok) return result;
        const receipt: AlphaReceipt = { ...result.value, kind: command.kind, ...(resultId ? { resultId } : {}) };
        if (!isAlphaWireReceipt(receipt)) throw Error('private-pilot-invalid-wire-receipt');
        ledger.set(command.requestId, { command: detached(command), receipt, inverse: privateChanges(candidate.space, before.space) });
        commands.push(detached(command));
        return { ok: true, value: detached(receipt) };
      };
      const result = queue.then(run); queue = result.then(() => undefined, () => undefined); return result;
    },
  };
  return { seed, approved: input, repository, diagnostics: () => ({ ...server.diagnostics(), commandCount: commands.length,
    commands: detached(commands), deniedCommands: [...deniedCommands], ledgerCount: ledger.size,
    initialDocumentCount: seed.account.space.text.documents.length, initialTaskCount: M.tasks(seed.account.space.text).length }) };
}
/** Bundle/memory self-check only. The supplied pilot text is never seeded into personal state. */
export async function privatePilotFixtureSelfCheck(approved: PrivatePilotInput) {
  const f = createPrivatePilotRepository(approved), read = await f.repository.read();
  if (!read.ok || read.value.revision || read.value.space.creatorWorkspace || M.tasks(read.value.space.text).length
    || read.value.space.text.documents.length) throw Error('private-pilot-not-empty');
  const forbidden = [[PRIVATE_PILOT_ORIGIN + '/api/alpha/account', 'GET'], [PRIVATE_PILOT_ORIGIN + '/alpha', 'POST'],
    [AUTH_ORIGIN + '/auth/v1/user', 'GET'], ['https://example.invalid/alpha', 'GET'],
    ['http://127.0.0.1:3106/alpha', 'GET'], [PRIVATE_PILOT_ORIGIN + '/_next/static/%2e%2e/secret', 'GET'],
    [PRIVATE_PILOT_ORIGIN + '/_next/static/a%2fb.js', 'GET'], ['https://user:password@alpha.wikiplans.com/alpha', 'GET']];
  if (forbidden.some(([url, method]) => privatePilotResourceTarget(url, method) !== null)
    || privatePilotResourceTarget(PRIVATE_PILOT_ORIGIN + '/alpha', 'GET') !== PRIVATE_PILOT_LOCAL_ORIGIN + '/alpha') throw Error('private-pilot-resource-boundary');
  return { evidence: 'Bundle/in-memory only; no rendered browser or real backend', emptyAccount: true,
    deniedResourceCases: forbidden.length, ...f.diagnostics() };
}
/** Fresh ephemeral context only; no existing/disk storage state is loaded. */
export async function installPrivatePilotBrowserFixture(page: Page, options: { approved: PrivatePilotInput; expectedBuildId: string; enableFaultControl?: boolean }) {
  if (!validatePrivatePilotInput(options.approved) || typeof options.expectedBuildId !== 'string' || !options.expectedBuildId || /\s/.test(options.expectedBuildId))
    throw Error('private-pilot-approved-input-and-build-required');
  const context = page.context();
  if (context.pages().length !== 1 || context.serviceWorkers().length || !['about:blank', 'chrome://newtab/'].includes(page.url())) throw Error('private-pilot-fresh-isolated-session-required');
  const stored = await context.storageState({ indexedDB: true });
  if (stored.cookies.length || stored.origins.length) throw Error('private-pilot-existing-profile-denied');
  const f = createPrivatePilotRepository(options.approved), lookups: string[] = [], reads: number[] = [], commandAttempts: unknown[] = [];
  const commandResponses: { requestId: string; result: AlphaResult<AlphaReceipt> }[] = [];
  const publicBefore = canonicalJson(f.seed.context.public), sourceBefore = canonicalJson(f.seed.account.source);
  const prohibitedRequests: string[] = [], deniedWebSockets: string[] = [], pageErrors: string[] = [], consoleErrors: string[] = [];
  const storageCalls: { method: string; key: string | null; area: string }[] = [], resources: { request: string; target: string; status: number }[] = [];
  let authIntercepted = 0, apiIntercepted = 0, documentLoads = 0, rejectNext = false, holdNext = false;
  let releaseHeld: (() => void) | null = null;
  const rejectedCommands: string[] = [], heldCommands: string[] = [];
  const current = async () => { const read = await f.repository.read(); if (!read.ok) throw Error('private-pilot-account-unavailable'); return read.value; };
  const json = (route: Route, value: unknown) => route.fulfill({ status: 200, contentType: 'application/json', headers: {
    'Access-Control-Allow-Origin': PRIVATE_PILOT_ORIGIN, 'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'X-Supabase-Api-Version': '2024-01-01' }, body: JSON.stringify(value) });
  const deny = (route: Route, description: string) => { prohibitedRequests.push(description); return route.abort('blockedbyclient'); };
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.exposeFunction('__privatePilotFixtureStorageCall', (call: typeof storageCalls[number]) => storageCalls.push(call));
  if (options.enableFaultControl) {
    await page.exposeFunction('__privatePilotFixtureRejectNext', () => { rejectNext = true; });
    await page.exposeFunction('__privatePilotFixtureHoldNext', () => { holdNext = true; });
    await page.exposeFunction('__privatePilotFixtureRelease', () => { const release = releaseHeld; releaseHeld = null; release?.(); });
  }
  await page.exposeFunction('__privatePilotFixtureState', async () => {
    const account = await current(), documents = account.space.text.documents.map(doc => ({ id: doc.id, title: doc.title,
      raw: M.raw(doc), rows: M.rowMeta(account.space.text, doc.id), items: M.parseDocument(doc, account.space.text).items }));
    const data = materializeAccount(account, f.seed.references).data;
    const beforeOutput = canonicalJson(account);
    const outputs = documents.map(doc => ({ documentId: doc.id, txt: makeProgramPrivateOutput(data, {
      actorId: USER.id, documentId: doc.id, mode: 'raw', selectedItemIds: [], format: 'txt' }, '2026-10-04T00:00:00.000Z') }));
    if (canonicalJson(account) !== beforeOutput) throw Error('private-pilot-output-mutation');
    return { evidence: 'Synthetic SDK Auth + real app UI + in-memory CAS/reducer. Not live Auth/RLS/DB, OS IME or observed-user validation.',
      approved: f.approved, actorId: account.ownerId, ownActorId: f.seed.context.ownActorId,
      account, context: f.seed.context, creatorRecords: account.space.creatorWorkspace?.library.records ?? {},
      documents, items: M.tasks(account.space.text), outputs, ...f.diagnostics(),
      commandAttempts, commandResponses, lookups, reads, prohibitedRequests, deniedWebSockets, pageErrors, consoleErrors, storageCalls, resources,
      authIntercepted, apiIntercepted, documentLoads, rejectedCommands, heldCommands, requestHeld: !!releaseHeld, expectedBuildId: options.expectedBuildId,
      forwardedAuth: 0, forwardedApi: 0, publicWrites: 0, socialWrites: 0,
      forbiddenStorageCalls: storageCalls.filter(call => call.method === 'clear' || !call.key?.startsWith(PREFIX)),
      forbiddenStorage: storageCalls.filter(call => call.method === 'clear' || !call.key?.startsWith(PREFIX)).length,
      realAuthCalls: 0, realApiCalls: 0, liveBackendWrites: 0,
      sourceUnchanged: canonicalJson(account.source) === sourceBefore,
      publicUnchanged: canonicalJson(f.seed.context.public) === publicBefore && canonicalJson(f.seed.references.public) === publicBefore };
  });
  await page.addInitScript(({ origin, prefix, sessionKey, marker, sentinels, session }) => {
    if (location.origin !== origin) return;
    const set = Storage.prototype.setItem, bootstrapErrors: string[] = [];
    if (!sessionStorage.getItem(marker)) {
      if (localStorage.getItem(sessionKey) !== null || Object.entries(sentinels).some(([key, value]) => localStorage.getItem(key) !== null && localStorage.getItem(key) !== value))
        bootstrapErrors.push('private-pilot-existing-storage-bootstrap-denied');
      else { for (const [key, value] of Object.entries(sentinels)) if (localStorage.getItem(key) === null) set.call(localStorage, key, value);
        set.call(localStorage, sessionKey, JSON.stringify(session)); set.call(sessionStorage, marker, 'seeded-once'); }
    }
    const auditCalls: { method: string; key: string | null; area: string }[] = [];
    for (const name of ['setItem', 'removeItem', 'clear'] as const) {
      const original = Storage.prototype[name];
      Object.defineProperty(Storage.prototype, name, { configurable: true, value: function(this: Storage, ...args: string[]) {
        const call = { method: name, key: name === 'clear' ? null : String(args[0]), area: this === localStorage ? 'local' : 'session' };
        auditCalls.push(call); void (window as any).__privatePilotFixtureStorageCall(call).catch(() => undefined);
        if (name === 'clear' || !call.key?.startsWith(prefix)) throw Error('private-pilot-forbidden-storage-write');
        return Reflect.apply(original, this, args);
      } });
    }
    const workerAttempts: string[] = [];
    if (navigator.serviceWorker) Object.defineProperty(navigator.serviceWorker, 'register', { configurable: true,
      value: (address: string) => { workerAttempts.push(String(address)); return Promise.reject(Error('private-pilot-service-worker-denied')); } });
    Object.defineProperty(window, '__privatePilotFixtureReport', { value: async () => {
      const state = await (window as any).__privatePilotFixtureState();
      const currentSentinels = Object.fromEntries(Object.keys(sentinels).map(key => [key, localStorage.getItem(key)]));
      const authKeys = Object.keys(localStorage).filter(key => key.startsWith(`${prefix}alpha-auth:session`));
      return { ...state, bootstrapErrors, workerAttempts, browserStorageCalls: auditCalls,
        expectedSentinels: sentinels, currentSentinels,
        sentinelsExact: Object.entries(sentinels).every(([key, value]) => currentSentinels[key] === value),
        localAuthKeys: authKeys, localAuthKeyPrefixValid: authKeys.every(key => key === sessionKey || key.startsWith(`${sessionKey}-`)) };
    } });
  }, { origin: PRIVATE_PILOT_ORIGIN, prefix: PREFIX, sessionKey: SESSION_KEY, marker: SEED_MARKER, sentinels: SENTINELS, session: fixtureSession() });
  await context.routeWebSocket('**/*', socket => { deniedWebSockets.push(socket.url()); socket.close(); });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const exact = !url.username && !url.password && !url.search && !url.hash;
    if (url.origin === AUTH_ORIGIN) {
      authIntercepted++; const endpoint = url.pathname;
      if (method === 'OPTIONS' && exact && ['/auth/v1/settings', '/auth/v1/token', '/auth/v1/user', '/rest/v1/flowme_alpha_accounts',
        '/rest/v1/rpc/flowme_alpha_social_open_v1', '/rest/v1/rpc/flowme_alpha_social_read_v1'].includes(endpoint)) return json(route, {});
      if (exact && method === 'GET' && endpoint === '/auth/v1/settings') return json(route, { external: { google: false }, disable_signup: false });
      if (exact && method === 'GET' && endpoint === '/auth/v1/user') return json(route, USER);
      if (method === 'POST' && endpoint === '/auth/v1/token' && !url.username && !url.password && url.searchParams.size === 1 && url.searchParams.get('grant_type') === 'refresh_token'
        && decodePrivatePilotRequestBody(request.postData())?.refresh_token === 'private-pilot-fixture-refresh') return json(route, fixtureSession());
      if (method === 'GET' && endpoint === '/rest/v1/flowme_alpha_accounts' && !url.username && !url.password) { const account = await current(); reads.push(account.revision); return json(route, [{ account }]); }
      if (exact && method === 'POST' && endpoint === '/rest/v1/rpc/flowme_alpha_social_open_v1') return json(route, { ok: true, value: { ownActorId: f.seed.context.ownActorId } });
      if (exact && method === 'POST' && endpoint === '/rest/v1/rpc/flowme_alpha_social_read_v1') { const account = await current(); reads.push(account.revision); return json(route, { ok: true, value: { account, context: f.seed.context } }); }
      return deny(route, `${method}:${url.origin}${endpoint}:auth-denied`);
    }
    if ([PRIVATE_PILOT_ORIGIN, PRIVATE_PILOT_LOCAL_ORIGIN].includes(url.origin) && url.pathname.startsWith('/api/alpha/')) {
      apiIntercepted++;
      if (exact && method === 'GET' && url.pathname === '/api/alpha/catalog') return json(route, { ok: false, reason: 'unavailable' });
      if (exact && method === 'POST' && ['/api/alpha/account', '/api/alpha/creator'].includes(url.pathname)) {
        const body = decodePrivatePilotRequestBody(request.postData());
        const target = privatePilotCommandTarget(request.url(), method, body, f.approved);
        if (target === 'lookup') { lookups.push(body!.requestId as string); return json(route, await f.repository.lookup(body!.requestId as string)); }
        if (target === 'execute' && body && validatePrivatePilotCommand(body.command, f.approved)) {
          commandAttempts.push(detached(body.command));
          if (rejectNext) { rejectNext = false; rejectedCommands.push(body.command.requestId); return json(route, { ok: false, reason: 'limit' }); }
          if (holdNext) { holdNext = false; heldCommands.push(body.command.requestId); await new Promise<void>(resolve => { releaseHeld = resolve; }); }
          const result = await f.repository.execute(body.command);
          commandResponses.push({ requestId: body.command.requestId, result: detached(result) });
          return json(route, result);
        }
      }
      return deny(route, `${method}:${url.origin}${url.pathname}:api-or-command-denied`);
    }
    const target = privatePilotResourceTarget(request.url(), method);
    if (!target) return deny(route, `${method}:${url.origin}${url.pathname}:resource-denied`);
    const response = await route.fetch({ url: target, method: 'GET', maxRedirects: 0, maxRetries: 2, headers: {
      Host: 'alpha.wikiplans.com', 'X-Forwarded-Host': 'alpha.wikiplans.com', 'X-Forwarded-Proto': 'https',
      Accept: request.headers().accept ?? '*/*', 'Cache-Control': 'no-cache' } });
    resources.push({ request: request.url(), target, status: response.status() });
    if (!response.ok()) { await response.dispose(); return deny(route, `GET:${url.pathname}:local-resource-status`); }
    const body = await response.body();
    if (url.pathname === '/alpha') { if (!body.toString('utf8').includes(options.expectedBuildId)) { await response.dispose(); return deny(route, 'GET:/alpha:wrong-candidate-build'); } documentLoads++; }
    try { await route.fulfill({ response, body }); } finally { await response.dispose(); }
  });
  await page.goto(`${PRIVATE_PILOT_ORIGIN}/alpha`, { waitUntil: 'domcontentloaded' });
  return { installed: true, origin: PRIVATE_PILOT_ORIGIN, localOrigin: PRIVATE_PILOT_LOCAL_ORIGIN, emptyAccount: true,
    report: 'await page.evaluate(() => window.__privatePilotFixtureReport())',
    evidence: 'Fixture installation only; UI checks remain for the CLI operator.' };
}
