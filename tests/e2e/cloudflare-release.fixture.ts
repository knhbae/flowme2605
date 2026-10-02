import { createHash } from 'node:crypto';
import { expect, type Page, type Route, type TestInfo } from '@playwright/test';
import { emptyAccount, accountWithDocument, pairedSocialAccount, prefix, session, users } from './alpha-auth.fixture';
import { createAlphaFakeServer, validateAlphaCommand } from '../../lib/flow/integrated-poc/alpha-persistence/fake-server';
import { emptyAlphaReferences } from '../../lib/flow/integrated-poc/alpha-social/projection';
import type { AlphaPrivateCommand } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { validateAlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { textWorkspaceModel as M, type TextWorkspaceState } from '../../lib/flow/integrated-poc/text-workspace';

export const RELEASE_ORIGIN = 'https://alpha.wikiplans.com';
const AUTH_ORIGIN = 'https://wkmzcxpnojobxrgebapw.supabase.co';
export type ReleaseQaMode = 'local' | 'remote-readonly';
export function releaseQaLocalPort(value?: string): 3106 | 3107 {
  if (value === undefined || value === '3106') return 3106;
  if (value === '3107') return 3107;
  throw Error('release-qa-local-port-rejected');
}
export function expectedReleaseTelemetryCount(mode: ReleaseQaMode, documentLoads: number): number {
  if (!Number.isSafeInteger(documentLoads) || documentLoads < 1) throw Error('release-qa-document-load-count-rejected');
  return mode === 'remote-readonly' ? documentLoads : 0;
}
const SENTINELS = { 'flow:saved-plans': '  synthetic release sentinel\r\n', 'flow:completion:v1': '{"untouched":true}', 'other-app:key': 'exact bytes  ' };
const OBSERVED_TELEMETRY_SCRIPT = 'https://static.cloudflareinsights.com/beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba1788362987495';

/** The edge injects this optional script into deployed HTML. It is replaced,
 * never fetched or executed: telemetry itself is explicitly outside this QA. */
export function isSyntheticReleaseTelemetry(address: string, method: string, mode: ReleaseQaMode): boolean {
  return mode === 'remote-readonly' && method === 'GET' && address === OBSERVED_TELEMETRY_SCRIPT;
}
const EMPTY_SCRIPT_SRI = createHash('sha512').update('').digest('base64');
const SYNTHETIC_TELEMETRY_ERROR = `Failed to find a valid digest in the 'integrity' attribute for resource '${OBSERVED_TELEMETRY_SCRIPT}' with computed SHA-512 integrity '${EMPTY_SCRIPT_SRI}'. The resource has been blocked.`;
export function isExpectedSyntheticTelemetryError(message: string, mode: ReleaseQaMode): boolean {
  return mode === 'remote-readonly' && message === SYNTHETIC_TELEMETRY_ERROR;
}

/** The only real network capability in this fixture: a fixed origin's GET
 * document/static files. APIs, redirects, credentials and arbitrary hosts are
 * never delegated, including when checking the already-serving bundle. */
export function releaseResourceTarget(address: string, method: string, mode: ReleaseQaMode, localPort: 3106 | 3107 = 3106): string | null {
  if (method !== 'GET' || !['local', 'remote-readonly'].includes(mode)) return null;
  if (localPort !== 3106 && localPort !== 3107) return null;
  const url = new URL(address);
  if (url.origin !== RELEASE_ORIGIN || url.username || url.password) return null;
  const path = url.pathname;
  if (path !== '/alpha' && path !== '/icon.svg' && path !== '/favicon.ico'
    && !/^\/_next\/static\/[A-Za-z0-9_./%-]+$/.test(path)) return null;
  if (/%2f|%5c|%2e/i.test(path) || path.includes('..') || path.includes('\\')) return null;
  return `${mode === 'local' ? `http://127.0.0.1:${localPort}` : RELEASE_ORIGIN}${path}${url.search}`;
}

export async function mockCloudflareRelease(page: Page, options: {
  document?: { title: string; raw: string; scopeAt?: number };
  prepareText?: (text: TextWorkspaceState) => TextWorkspaceState;
} = {}) {
  const mode = (process.env.FLOWME_CLOUDFLARE_QA_MODE ?? 'local') as ReleaseQaMode;
  if (!['local', 'remote-readonly'].includes(mode)) throw Error('cloudflare-qa-mode-rejected');
  const localPort = releaseQaLocalPort(process.env.FLOWME_CLOUDFLARE_QA_LOCAL_PORT);
  // Bind a synthetic scope before adding descendants: production deliberately
  // refuses to reinterpret a nonempty subtree as a newly created folder.
  const initialRaw = options.document?.scopeAt !== undefined
    ? options.document.raw.split('\n').slice(0, options.document.scopeAt + 1).join('\n') : options.document?.raw;
  const account = options.document ? accountWithDocument('a', options.document.title, initialRaw!) : emptyAccount('a');
  if (options.document?.scopeAt !== undefined) {
    const doc = account.space.text.documents[0], index = options.document.scopeAt;
    if (!Number.isInteger(index) || index < 0 || index >= doc.lines.length) throw Error('synthetic-scope-row-invalid');
    account.space.text = M.createFolderAt(account.space.text, doc.id, index, '합성 접힘 폴더');
    if (M.rowMeta(account.space.text, doc.id)[index]?.kind !== 'scope') throw Error('synthetic-scope-not-created');
    const descendants = options.document.raw.split('\n').slice(index + 1);
    account.space.text = M.editText(account.space.text, doc.id,
      [M.raw(M.getDocument(account.space.text, doc.id)), ...descendants].join('\n'));
  }
  if (options.prepareText) account.space.text = options.prepareText(account.space.text);
  const references = emptyAlphaReferences(users.a.id);
  if (!validateAlphaAccount(account, references, users.a.id)) throw Error('synthetic-account-invalid');
  const server = createAlphaFakeServer([{ account, references }]);
  const repository = server.connect(server.issueSession(users.a.id));
  const commands: AlphaPrivateCommand[] = [], lookups: string[] = [], reads: number[] = [];
  const unexpected: string[] = [], pageErrors: string[] = [], consoleErrors: string[] = [];
  const storageCalls: { method: string; key: string | null }[] = [];
  const resources = new Map<string, string>();
  const state = { loseNextReceipt: false, rejectNextExecute: null as 'limit' | 'revision-conflict' | null,
    lostRequestId: null as string | null, apiIntercepted: 0, authIntercepted: 0, suppressedTelemetry: 0, documentLoads: 0 };
  async function current() {
    const value = await repository.read();
    if (!value.ok) throw Error('synthetic-account-unavailable');
    return value.value;
  }
  const json = (route: Route, value: unknown) => route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': RELEASE_ORIGIN, 'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'X-Supabase-Api-Version': '2024-01-01' }, body: JSON.stringify(value) });

  await page.exposeBinding('__cloudflareReleaseStorageCall', (_source, call) => storageCalls.push(call));
  await page.addInitScript(`(() => {
    const {origin, prefix, sentinels} = ${JSON.stringify({origin:RELEASE_ORIGIN,prefix,sentinels:SENTINELS})};
    if (location.origin !== origin) return;
    // Seed once, before instrumentation. Reload must never repair changed bytes.
    if (!sessionStorage.getItem(prefix + 'cloudflare-release-fixture-seeded')) {
      for (const [key, value] of Object.entries(sentinels)) localStorage.setItem(key, value);
      sessionStorage.setItem(prefix + 'cloudflare-release-fixture-seeded', '1');
    }
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: function(...args) {
        void window.__cloudflareReleaseStorageCall({ method, key: args[0] ?? null });
        return Reflect.apply(original, this, args);
      } });
    }
  })()`);
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.context().routeWebSocket('**/*', socket => { unexpected.push('websocket'); socket.close(); });
  await page.context().route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    if (isSyntheticReleaseTelemetry(request.url(), method, mode)) {
      state.suppressedTelemetry++;
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    }
    if (url.origin === AUTH_ORIGIN) {
      state.authIntercepted++;
      if (method === 'OPTIONS') return json(route, {});
      if (method === 'GET' && url.pathname === '/auth/v1/settings') return json(route, { external: { google: false }, disable_signup: false });
      if (method === 'POST' && url.pathname === '/auth/v1/token') {
        const body = request.postDataJSON();
        if (url.searchParams.get('grant_type') === 'password'
          && body.email === users.a.email && body.password === 'Fixture-password-123!') return json(route, session('a'));
        if (url.searchParams.get('grant_type') === 'refresh_token' && body.refresh_token === 'fixture-refresh-a') return json(route, session('a'));
      }
      if (method === 'GET' && url.pathname === '/auth/v1/user') return json(route, users.a);
      if (method === 'GET' && url.pathname === '/rest/v1/flowme_alpha_accounts') return json(route, [{ account: await current() }]);
      if (method === 'POST' && url.pathname === '/rest/v1/rpc/flowme_alpha_social_open_v1')
        return json(route, { ok: true, value: { ownActorId: 'member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } });
      if (method === 'POST' && url.pathname === '/rest/v1/rpc/flowme_alpha_social_read_v1') {
        const value = await current(); reads.push(value.revision); return json(route, pairedSocialAccount('a', value));
      }
      unexpected.push(`blocked-synthetic-auth:${method}:${url.pathname}`); return route.abort('blockedbyclient');
    }
    // All methods and all alpha endpoints stop here; API requests cannot reach
    // the GET proxy below even if a future product feature introduces a route.
    if (url.origin === RELEASE_ORIGIN && url.pathname.startsWith('/api/alpha/')) {
      state.apiIntercepted++;
      if (method === 'POST' && url.pathname === '/api/alpha/account') {
        const body = request.postDataJSON();
        if (body.kind === 'lookup' && typeof body.requestId === 'string') {
          lookups.push(body.requestId); return json(route, await repository.lookup(body.requestId));
        }
        if (body.kind === 'execute' && validateAlphaCommand(body.command)) {
          commands.push(structuredClone(body.command));
          if (state.rejectNextExecute) {
            const reason = state.rejectNextExecute; state.rejectNextExecute = null;
            return json(route, { ok: false, reason });
          }
          const result = await repository.execute(body.command);
          if (state.loseNextReceipt && result.ok) {
            state.loseNextReceipt = false; state.lostRequestId = body.command.requestId;
            // The server committed, but the transport cannot prove the result.
            // Return its normal unknown-result envelope without browser noise.
            return json(route, { ok: false, reason: 'unavailable' });
          }
          return json(route, result);
        }
      }
      unexpected.push(`blocked-synthetic-api:${method}:${url.pathname}`);
      return json(route, { ok: false, reason: 'unavailable' });
    }
    const target = releaseResourceTarget(request.url(), method, mode, localPort);
    if (!target) { unexpected.push(`blocked-network:${method}:${url.origin}${url.pathname}`); return route.abort('blockedbyclient'); }
    // Retry only connection resets on the fixed local document/static GET.
    // This never retries Auth, API commands, HTTP errors or remote resources.
    const response = await route.fetch({ url: target, method: 'GET', maxRedirects: 0,
      maxRetries: mode === 'local' ? 2 : 0, headers: {
      Host: 'alpha.wikiplans.com', 'X-Forwarded-Host': 'alpha.wikiplans.com', 'X-Forwarded-Proto': 'https',
      Accept: request.headers().accept ?? '*/*', 'Cache-Control': 'no-cache',
    } });
    if (!response.ok()) {
      unexpected.push(`resource-status:${response.status()}:${url.pathname}`);
      await response.dispose(); return route.abort('failed');
    }
    const body = await response.body();
    if (url.pathname === '/alpha' && request.isNavigationRequest() && request.resourceType() === 'document') state.documentLoads++;
    // Hash actual JS/CSS, never persist HTML, configuration or source text.
    if (url.pathname.startsWith('/_next/static/')) resources.set(url.pathname, createHash('sha256').update(body).digest('hex'));
    await route.fulfill({ response, body }); await response.dispose();
  });

  async function assertBoundary(info: TestInfo) {
    expect(unexpected, 'No unrecognized request may leave the fixture').toEqual([]);
    expect(state.suppressedTelemetry, 'One exact synthetic edge script per successfully served document; never forwarded')
      .toBe(expectedReleaseTelemetryCount(mode, state.documentLoads));
    expect(pageErrors, 'Uncaught page errors').toEqual([]);
    const expectedSyntheticTelemetryErrors = consoleErrors.filter(message => isExpectedSyntheticTelemetryError(message, mode));
    const unexpectedConsoleErrors = consoleErrors.filter(message => !isExpectedSyntheticTelemetryError(message, mode));
    expect(expectedSyntheticTelemetryErrors, 'Only the exact empty-script SRI errors match synthetic script responses')
      .toHaveLength(state.suppressedTelemetry);
    expect(unexpectedConsoleErrors, 'Console errors other than explicitly synthesized telemetry SRI').toEqual([]);
    expect(storageCalls.filter(call => call.method === 'clear' || !call.key?.startsWith(prefix)), 'Outside-prefix storage calls').toEqual([]);
    const actual = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(SENTINELS));
    expect(actual, 'Operating sentinel bytes survive every reload unchanged').toEqual(SENTINELS);
    expect(resources.size, 'The real production bundle was fetched').toBeGreaterThan(0);
    const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth - innerWidth, body: document.body.scrollWidth - innerWidth }));
    expect(overflow.document).toBeLessThanOrEqual(1); expect(overflow.body).toBeLessThanOrEqual(1);
    await info.attach('release-boundary', { contentType: 'application/json', body: JSON.stringify({
      evidence: 'Headless Chromium; real production assets with synthetic Auth/account/CAS/receipt. Not live DB or real-device QA.',
      mode, viewport: page.viewportSize(), realApiRequests: 0, forwardedSupabaseRequests: 0,
      syntheticApiRequests: state.apiIntercepted, syntheticAuthRequests: state.authIntercepted,
      documentLoads: state.documentLoads, suppressedTelemetry: state.suppressedTelemetry, forwardedTelemetryRequests: 0, telemetryValidated: false,
      mutations: server.diagnostics().mutations, operations: server.diagnostics().operations,
      outsidePrefixWrites: 0, sentinelBytesUnchanged: true, pageErrors,
      consoleErrors: unexpectedConsoleErrors, totalConsoleErrorCount: consoleErrors.length,
      expectedSyntheticTelemetryErrors, overflow,
      assets: [...resources].map(([path, sha256]) => ({ path, sha256 })),
    }) });
  }
  let externalSequence = 0;
  async function externalTextEdit(docId: string, raw: string) {
    // Test-only: mutate the in-memory fake repository, never a browser/network API.
    const before = await current(), edited = M.editTextResult(before.space.text, docId, raw);
    if (edited.reason) throw Error(`synthetic-external-edit:${edited.reason}`);
    const candidate = { ...before, space: { ...before.space, text: edited.state } };
    if (!validateAlphaAccount(candidate, references, users.a.id)) throw Error('synthetic-external-account-invalid');
    const result = await repository.execute({ schema: 'flowme-alpha-command/1', kind: 'change-private',
      requestId: `synthetic-external-${++externalSequence}`, expectedRevision: before.revision,
      changes: [{ field: 'text', present: true, value: edited.state }] });
    if (!result.ok) throw Error(`synthetic-external-save:${result.reason}`);
    return current();
  }
  return { state, current, commands, lookups, reads, externalTextEdit, diagnostics: server.diagnostics, assertBoundary };
}
