import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlphaCommandHandler, signAlphaCommand } from './command-handler';
import { ALPHA_COMMAND_SCHEMA, ALPHA_SCHEMA, type AlphaAccount, type AlphaCommand } from '../alpha-persistence/contract';
import { PROGRAM_SCHEMA } from '../contract';
import { createProgramPrivateSpace } from '../program-data';
import { createProgramDocument } from '../private-space';
import { commandFromProgramTransition } from '../alpha-persistence/program-adapter';
import { canonicalJson } from '../alpha-persistence/json';
import { readAlphaAuthConfig } from '../alpha-auth/config';
import { createAlphaFakeServer } from '../alpha-persistence/fake-server';
import { createAlphaMemoryRecovery } from '../alpha-persistence/local-recovery';
import { createAlphaSyncController } from '../alpha-sync/controller';
import { createAlphaHttpRepository } from '../alpha-sync/http-repository';

const owner = '11111111-1111-4111-8111-111111111111';
const key = 'ab'.repeat(32), token = 'fixture-only-no-real-secret-token';
const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'development',
  FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw', FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co',
  FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture', FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback',
  FLOWME_ALPHA_M3_SIGNING_KEY: key };
const references = { actorIds: [owner], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
function fixture() {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0,
    source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] };
  const calls: { path: string; body?: unknown; authorization: string | null }[] = [];
  const state = { account, userId: owner, expired: false, loseCommit: false, receipt: null as unknown };
  const fetcher: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname, body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const authorization = new Headers(init?.headers).get('authorization');
    calls.push({ path, body, authorization });
    if (path === '/auth/v1/user') return Response.json({ id: state.userId, is_anonymous: false }, { status: state.expired ? 401 : 200 });
    if (path === '/rest/v1/flowme_alpha_accounts') return Response.json([{ account: state.account }]);
    if (path.endsWith('lookup_v1')) return Response.json({ ok: true, value: state.receipt });
    assert.equal(path, '/rest/v1/rpc/flowme_alpha_execute_v1');
    assert.equal(body.proof, signAlphaCommand(owner, body.command_text, key));
    if (state.loseCommit) throw Error('simulated response loss');
    const command = JSON.parse(body.command_text) as AlphaCommand;
    return Response.json({ ok: true, value: { requestId: command.requestId, revision: 1, changed: true, kind: command.kind } });
  };
  const handler = createAlphaCommandHandler(env, fetcher);
  const request = (body: unknown, overrides?: { origin?: string; authorization?: string; url?: string }) => new Request(overrides?.url ?? 'http://localhost:3104/api/alpha/account', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: overrides?.origin ?? 'http://localhost:3104', Authorization: overrides?.authorization ?? `Bearer ${token}` }, body: JSON.stringify(body),
  });
  const command = commandFromProgramTransition(account, references, 'request-create', data => createProgramDocument(data, {
    actorId: owner, requestId: 'domain-create', expectedSpace: data.spaces[owner], title: '개인 원문',
  }));
  return { state, calls, handler, request, command, fetcher };
}
test('server reuses full domain validation before producing private signed RPC; fixed user token only', async () => {
  const f = fixture(), response = await f.handler(f.request({ kind: 'execute', command: f.command }));
  assert.equal((await response.json()).ok, true);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(f.calls.map(c => c.path), ['/auth/v1/user', '/rest/v1/flowme_alpha_accounts', '/rest/v1/rpc/flowme_alpha_execute_v1']);
  assert.ok(f.calls.every(c => c.authorization === `Bearer ${token}`));
  assert.ok(!JSON.stringify(await (await f.handler(f.request({ kind: 'lookup', requestId: 'request-create' }))).json()).includes(key));
});
test('invalid nested identity, missing folder, unsupported creator field and owner envelope never reach write RPC', async () => {
  for (const corrupt of [
    (c: any) => { c.changes[0].value.documents[0].folderId = 'missing'; },
    (c: any) => { c.changes[0].value.documents[0].lines = [{ id: 'constructor', text: 'a' }]; },
    (c: any) => { c.changes = [{ field: 'creatorWorkspace', present: true, value: {} }]; },
    (c: any) => { c.ownerId = '22222222-2222-4222-8222-222222222222'; },
  ]) {
    const f = fixture(), command = structuredClone(f.command); corrupt(command);
    assert.equal((await (await f.handler(f.request({ kind: 'execute', command }))).json()).reason, 'invalid');
    assert.ok(f.calls.every(c => !c.path.endsWith('execute_v1')));
  }
});
test('anonymous, expired, foreign account payload and cross-origin requests fail closed', async () => {
  const f = fixture();
  for (const overrides of [{ authorization: 'Bearer bad' }, { origin: 'https://attacker.invalid' }, { url: 'http://localhost:3104/api/alpha/account?next=https://attacker.invalid' }]) {
    await f.handler(f.request({ kind: 'execute', command: f.command }, overrides));
    assert.equal(f.calls.length, 0);
  }
  f.state.expired = true;
  assert.equal((await (await f.handler(f.request({ kind: 'execute', command: f.command }))).json()).reason, 'unauthenticated');
  f.state.expired = false; f.state.userId = '22222222-2222-4222-8222-222222222222';
  assert.equal((await (await f.handler(f.request({ kind: 'execute', command: f.command }))).json()).reason, 'invalid');
  assert.ok(f.calls.every(c => !c.path.endsWith('execute_v1')));
});
test('production/missing signing configuration performs zero network calls', async () => {
  const f = fixture();
  for (const config of [{ ...env, VERCEL_ENV: 'production' }, { ...env, FLOWME_ALPHA_M3_SIGNING_KEY: '' }, { ...env, FLOWME_ALPHA_PROJECT_REF: 'ldellkztijrijbpwthjl' }]) {
    assert.equal((await createAlphaCommandHandler(config, f.fetcher)(f.request({ kind: 'execute', command: f.command }))).status, 503);
  }
  assert.equal(f.calls.length, 0);
});
test('M7 Render trial accepts only its exact public request origin before any upstream call', async () => {
  const f = fixture(), origin = 'https://flowme-trial-1.onrender.com';
  const hostedEnv = { ...env, FLOWME_ALPHA_STAGE: 'preview', FLOWME_ALPHA_HOSTING: 'render-trial-v1',
    FLOWME_ALPHA_REDIRECT_URL: `${origin}/auth/callback`, FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1' };
  const request = (overrides: Record<string, string> = {}) => new Request('http://127.0.0.1:3105/api/alpha/account', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Host: new URL(origin).host,
      'X-Forwarded-Host': new URL(origin).host, 'X-Forwarded-Proto': 'https', Origin: origin,
      Authorization: `Bearer ${token}`, ...overrides }, body: JSON.stringify({ kind: 'lookup', requestId: 'request-create' }),
  });
  assert.equal((await createAlphaCommandHandler({ ...hostedEnv, FLOWME_ALPHA_M3_CAPACITY: undefined }, f.fetcher)(request())).status, 503);
  assert.equal(f.calls.length, 0);
  const handler = createAlphaCommandHandler(hostedEnv, f.fetcher);
  const wrongHeaders: Record<string, string>[] = [{ Origin: 'https://other.onrender.com' }, { Host: 'other.onrender.com' },
    { 'X-Forwarded-Host': 'other.onrender.com' }, { 'X-Forwarded-Proto': 'http' }];
  for (const overrides of wrongHeaders) {
    assert.equal((await handler(request(overrides))).status, 400);
    assert.equal(f.calls.length, 0);
  }
  assert.equal((await (await handler(request())).json()).ok, true);
  assert.deepEqual(f.calls.map(call => call.path), ['/auth/v1/user', '/rest/v1/rpc/flowme_alpha_lookup_v1']);
});
test('same state is zero write; response loss is unavailable, never claimed cancelled', async () => {
  const f = fixture(), noOp: AlphaCommand = { schema: ALPHA_COMMAND_SCHEMA, requestId: 'no-op', expectedRevision: 0, kind: 'change-private', changes: [] };
  assert.equal((await (await f.handler(f.request({ kind: 'execute', command: noOp }))).json()).reason, 'no-change');
  assert.ok(f.calls.every(c => !c.path.endsWith('execute_v1')));
  f.state.loseCommit = true;
  assert.equal((await (await f.handler(f.request({ kind: 'execute', command: f.command }))).json()).reason, 'unavailable');
});

test('Render on-demand trial uses the existing signed writer, never a checkpoint RPC or error fallback', async () => {
  for (const failure of [false, true]) {
    const f = fixture(), origin = 'https://flowme-trial-1.onrender.com';
    const hostedEnv = { ...env, FLOWME_ALPHA_STAGE: 'preview', FLOWME_ALPHA_HOSTING: 'render-trial-v1',
      FLOWME_ALPHA_REDIRECT_URL: `${origin}/auth/callback`, FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1' };
    f.state.loseCommit = failure;
    const response = await createAlphaCommandHandler(hostedEnv, f.fetcher)(new Request('http://127.0.0.1:3105/api/alpha/account', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Host: new URL(origin).host,
        'X-Forwarded-Proto': 'https', Origin: origin, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind: 'execute', command: f.command }),
    }));
    const body = await response.json(); assert.equal(body.ok, !failure);
    if (failure) assert.equal(body.reason, 'unavailable');
    assert.deepEqual(f.calls.map(c => c.path), ['/auth/v1/user', '/rest/v1/flowme_alpha_accounts', '/rest/v1/rpc/flowme_alpha_execute_v1']);
    assert(f.calls.every(c => c.authorization === `Bearer ${token}`));
    assert(!JSON.stringify(body).includes(key));
  }
});
test('stale command goes to authoritative idempotency/CAS without reapplying onto latest content', async () => {
  const f = fixture(); f.state.account.revision = 3;
  assert.equal((await (await f.handler(f.request({ kind: 'execute', command: f.command }))).json()).ok, true);
  assert.equal((f.calls.at(-1)?.body as any).command_text, canonicalJson(f.command));
  assert.equal(f.state.account.space.text.documents.length, 0);
});

test('malformed post-commit RPC response retains controller request identity and recovers by lookup without another write', async () => {
  // Pure transport/domain simulation: no real JWT, network, SQL or server assertion count.
  const f = fixture(), server = createAlphaFakeServer([{ account: f.state.account, references }]);
  const stored = server.connect(server.issueSession(owner)), lookupIds: string[] = [];
  let executeCalls = 0;
  const upstream: typeof fetch = async (url, init) => {
    assert.equal(new Headers(init?.headers).get('authorization'), `Bearer ${token}`);
    const path = new URL(String(url)).pathname;
    if (path === '/auth/v1/user') return Response.json({ id: owner, is_anonymous: false });
    if (path === '/rest/v1/flowme_alpha_accounts') {
      const read = await stored.read(); assert(read.ok);
      return Response.json([{ account: read.value }]);
    }
    const body = JSON.parse(String(init?.body));
    if (path.endsWith('lookup_v1')) {
      lookupIds.push(body.request_id);
      return Response.json(await stored.lookup(body.request_id));
    }
    assert.equal(path, '/rest/v1/rpc/flowme_alpha_execute_v1');
    assert.equal(body.proof, signAlphaCommand(owner, body.command_text, key));
    executeCalls++;
    const committed = await stored.execute(JSON.parse(body.command_text)); assert(committed.ok);
    return Response.json({ ok: true, value: { ...committed.value, unexpected: true } });
  };
  const handler = createAlphaCommandHandler(env, upstream);
  const browser: typeof fetch = (url, init) => String(url) === '/api/alpha/account'
    ? handler(new Request('http://localhost:3104/api/alpha/account', init)) : upstream(url, init);
  const config = readAlphaAuthConfig(env); assert(config);
  const repository = createAlphaHttpRepository(config, { userId: owner, accessToken: token }, browser);
  const recovery = createAlphaMemoryRecovery(), requestId = 'malformed-commit-recovery';
  const controller = createAlphaSyncController({ recovery, requestId: () => requestId });
  controller.bindSession(owner, repository); assert(await controller.refresh());
  const result = await controller.mutate('create', data => createProgramDocument(data, {
    actorId: owner, requestId: 'domain-malformed-commit', expectedSpace: data.spaces[owner], title: 'Saved despite malformed reply',
  }));
  assert.equal(result.ok, false); assert.notEqual(controller.snapshot().status, 'saved');
  assert.equal(controller.snapshot().pending?.requestId, requestId);
  assert(controller.snapshot().draft); assert.equal(server.diagnostics().mutations, 1);
  assert.equal(await controller.discardConflict(), false);
  controller.dispose();
  const reboot = createAlphaSyncController({ recovery }); reboot.bindSession(owner, repository);
  assert.equal(reboot.snapshot().pending?.requestId, requestId);
  assert(await reboot.resolvePending(false));
  assert.deepEqual(lookupIds, [requestId]); assert.equal(executeCalls, 1);
  assert.equal(server.diagnostics().mutations, 1); assert.equal(reboot.snapshot().pending, null);
  assert.equal(reboot.snapshot().status, 'saved'); assert.equal(reboot.snapshot().canUndo, true);
  assert.equal(reboot.snapshot().account?.space.text.documents[0].title, 'Saved despite malformed reply');
  reboot.dispose();
});
