import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createProgramData, createProgramEnvelope } from '../program-data';
import { programClone } from '../contract';
import { textWorkspaceModel as M } from '../text-workspace';
import { createAlphaFakeServer } from '../alpha-persistence/fake-server';
import { captureAlphaAccount, commandFromProgramTransition } from '../alpha-persistence/program-adapter';
import { createAlphaClient } from '../alpha-persistence/client';
import { canonicalJson } from '../alpha-persistence/json';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { ALPHA_ENVIRONMENT_POLICY } from '../alpha-persistence/environment';
import { createAlphaHttpRepository } from './http-repository';
import { ALPHA_READ_FULL_RPC, ALPHA_READ_PROBE_RPC } from './read-frame';

// Egress probe, phase 1 (inbox/supabase-egress-20261030-0944/server-design.md): the host's automatic reads
// ask for two tokens first. Unchanged → no full read; changed → one full read; saves, ACK readback and
// protection stay as they were. A synthetic Supabase in front of the fake server stands in for the v2 RPCs.

const OWNER = '11111111-1111-4111-8111-111111111111', ALIAS = 'member-11111111-1111-4111-8111-111111111111';
const URL_BASE = `https://${ALPHA_ENVIRONMENT_POLICY.developmentProject}.supabase.co`;
const CONFIG = { stage: 'test' as const, url: URL_BASE, publishableKey: 'sb_publishable_synthetic_probe', redirectUrl: 'http://localhost:3104/auth/callback' };
const sha = (value: unknown) => createHash('sha256').update(canonicalJson(value)).digest('hex');
const doc = (text: { documents: { id: string; title: string }[] }) => text.documents.find(entry => entry.title === '문서')!.id;

function seed() {
  const data = createProgramData(), space = data.spaces[data.activeActorId];
  const added = M.addDocument(space.text, { title: '문서' }); space.text = M.editText(added, doc(added), '- [ ] 첫 할 일');
  data.actors = [{ id: OWNER, name: '확인', simulated: true }]; data.spaces = { [OWNER]: space }; data.activeActorId = OWNER;
  return captureAlphaAccount(createProgramEnvelope(data), OWNER, OWNER);
}
/** Supabase in front of the fake server: auth user, social open/read v1, read v2 (when `v2`), and the
 *  account command route. Counts calls and bytes per route; `session` can be expired. */
function supabase(options: { v2: boolean }) {
  const initial = seed(), server = createAlphaFakeServer([initial]), port = server.connect(server.issueSession(OWNER));
  const context = { schema: 'flowme-alpha-social-context/1', revision: 0, ownActorId: ALIAS, actors: [{ id: ALIAS, name: '확인' }],
    public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
  const calls: Record<string, number> = {}, bytes: Record<string, number> = {}, live = { session: true, loseNextReply: false, failNextFull: false };
  const account = () => server.exportForBackup(OWNER).account;
  const tokens = () => ({ privateToken: `account-sha256-v2:${sha(account())}`, publicToken: `authorized-context-sha256-v2:${sha(context)}` });
  const reply = (name: string, value: unknown, status = 200) => {
    calls[name] = (calls[name] ?? 0) + 1; const body = JSON.stringify(value); bytes[name] = (bytes[name] ?? 0) + Buffer.byteLength(body);
    return new Response(body, { status, headers: { 'content-type': 'application/json' } });
  };
  const request = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const address = String(input), path = address.startsWith('/') ? address : new URL(address).pathname, body = init.body ? JSON.parse(String(init.body)) : null;
    if (!live.session) return reply(path, { code: '401', message: 'JWT expired' }, 401);
    if (path === '/auth/v1/user') return reply(path, { id: OWNER, is_anonymous: false });
    if (path === '/rest/v1/rpc/flowme_alpha_social_open_v1') return reply('open', { ok: true, value: true });
    if (path === '/rest/v1/rpc/flowme_alpha_social_read_v1') return reply('read-v1', { ok: true, value: { account: account(), context } });
    if (path === `/rest/v1/rpc/${ALPHA_READ_FULL_RPC}` || path === `/rest/v1/rpc/${ALPHA_READ_PROBE_RPC}`) {
      const name = path.endsWith(ALPHA_READ_FULL_RPC) ? 'full-v2' : 'probe-v2';
      if (name === 'full-v2' && live.failNextFull) { live.failNextFull = false; return reply(name, { message: 'upstream unavailable' }, 503); }
      if (!options.v2) return reply(name, { code: 'PGRST202', details: null, hint: null, message: 'Could not find the function' }, 404);
      return reply(name, { ok: true, value: name === 'full-v2'
        ? { schema: 'flowme-alpha-read-frame/2', tokens: tokens(), snapshot: { account: account(), context } }
        : { schema: 'flowme-alpha-read-probe/2', tokens: tokens() } });
    }
    if (path === '/api/alpha/account' && body?.kind === 'execute') { const receipt = await port.execute(body.command); if (live.loseNextReply) { live.loseNextReply = false; throw Error('synthetic lost reply after commit'); } return reply('execute', receipt); }
    if (path === '/api/alpha/account' && body?.kind === 'lookup') return reply('lookup', await port.lookup(body.requestId));
    throw Error(`unexpected ${path}`);
  }) as typeof fetch;
  // Another device changes the account directly on the server.
  async function remoteEdit(text: string) {
    const current = account(), command = commandFromProgramTransition(current, initial.references, `remote-${text.length}-${current.revision}`, data => {
      const next = programClone(data), space = next.spaces[OWNER]; space.text = M.editText(space.text, doc(space.text), text);
      return { ok: true, data: next, changed: true, result: 'remote' };
    });
    assert((await port.execute(command)).ok);
  }
  return { request, calls, bytes, live, context, initial, account, remoteEdit };
}
function connect(backend: ReturnType<typeof supabase>, readProbe = true) {
  const client = createAlphaClient(isAccountForOwner);
  client.bindSession(OWNER, createAlphaHttpRepository(CONFIG, { accessToken: 'synthetic-token-probe', userId: OWNER }, backend.request, { social: true, readProbe }));
  return client;
}

test('unchanged: the automatic read gets two tokens and no account', async () => {
  const backend = supabase({ v2: true }), client = connect(backend);
  assert.equal(await client.refreshIfChanged(), true, 'first read has no tokens yet: a full read');
  assert.equal(backend.calls['full-v2'], 1);
  const confirmed = client.snapshot().state!.confirmed;
  for (let i = 0; i < 3; i++) assert.equal(await client.refreshIfChanged(), true);
  assert.equal(backend.calls['probe-v2'], 3); assert.equal(backend.calls['full-v2'], 1, 'no full read while unchanged');
  assert.equal(backend.calls['read-v1'] ?? 0, 0);
  assert.deepEqual(client.snapshot().state!.confirmed, confirmed);
  assert(backend.bytes['probe-v2'] / 3 < 300, `probe reply ${backend.bytes['probe-v2'] / 3} bytes`);
});

test('changed: one full read, then quiet again', async () => {
  const backend = supabase({ v2: true }), client = connect(backend);
  await client.refreshIfChanged(); await backend.remoteEdit('- [ ] 다른 기기에서 고침');
  assert.equal(await client.refreshIfChanged(), true);
  assert.equal(backend.calls['full-v2'], 2, 'the changed private token costs exactly one full read');
  assert.equal(client.snapshot().state!.confirmed!.revision, backend.account().revision);
  backend.context.actors.push({ id: 'member-22222222-2222-4222-8222-222222222222', name: '새 참여자' });
  assert.equal(await client.refreshIfChanged(), true);
  assert.equal(backend.calls['full-v2'], 3, 'a new actor changes only the public token, and that is enough');
  await client.refreshIfChanged(); await client.refreshIfChanged();
  assert.equal(backend.calls['full-v2'], 3); assert.equal(backend.calls['probe-v2'], 4);
});

test('saves, the ACK readback and pending protection are unchanged', async () => {
  const backend = supabase({ v2: true }), client = connect(backend);
  await client.refreshIfChanged();
  const before = client.snapshot().state!.confirmed!;
  const command = commandFromProgramTransition(before, backend.initial.references, 'local-save', data => {
    const next = programClone(data), space = next.spaces[OWNER]; space.text = M.editText(space.text, doc(space.text), '- [ ] 첫 할 일\n- [ ] 저장한 줄');
    return { ok: true, data: next, changed: true, result: 'local' };
  });
  assert.equal(await client.execute(command), true);
  assert.equal(backend.calls.execute, 1); assert.equal(backend.calls['full-v2'], 2, 'the ACK still reads the full account back');
  assert.equal(client.snapshot().state!.confirmed!.revision, before.revision + 1);
  assert.equal(await client.refreshIfChanged(), true); assert.equal(backend.calls['full-v2'], 2, 'tokens of the ACK readback are current');
  // A save whose reply is lost stays pending: the automatic read neither probes nor clears it.
  const lost = commandFromProgramTransition(client.snapshot().state!.confirmed!, backend.initial.references, 'lost-save', data => {
    const next = programClone(data), space = next.spaces[OWNER]; space.text = M.editText(space.text, doc(space.text), '- [ ] 첫 할 일\n- [ ] 저장한 줄\n- [ ] 잃은 응답');
    return { ok: true, data: next, changed: true, result: 'lost' };
  });
  const probes = backend.calls['probe-v2'];
  backend.live.loseNextReply = true; assert.equal(await client.execute(lost), false); assert.equal(backend.account().revision, before.revision + 2, 'applied on the server');
  assert(client.snapshot().state!.pending, 'pending kept');
  assert.equal(await client.refreshIfChanged(), false); assert.equal(backend.calls['probe-v2'], probes, 'no probe while pending');
  assert(client.snapshot().state!.pending);
});

test('an expired session stops at the probe; it never falls back to a full read', async () => {
  const backend = supabase({ v2: true }), client = connect(backend);
  await client.refreshIfChanged(); backend.live.session = false;
  assert.equal(await client.refreshIfChanged(), false);
  assert.equal(backend.calls['full-v2'], 1); assert.equal(backend.calls['read-v1'] ?? 0, 0);
  assert.equal(client.snapshot().status, 'session-expired');
});

test('before the migration: v2 is missing, so reads stay v1 and the probe is never asked again', async () => {
  const backend = supabase({ v2: false }), client = connect(backend);
  for (let i = 0; i < 3; i++) assert.equal(await client.refreshIfChanged(), true);
  assert.equal(backend.calls['full-v2'], 1, 'one PGRST202, then v1 for this session'); assert.equal(backend.calls['probe-v2'] ?? 0, 0);
  assert.equal(backend.calls['read-v1'], 3, 'every automatic read is a full v1 read, as today');
});

test('flag off: the v2 functions are never called', async () => {
  const backend = supabase({ v2: true }), client = connect(backend, false);
  for (let i = 0; i < 3; i++) assert.equal(await client.refreshIfChanged(), true);
  assert.equal(backend.calls['full-v2'] ?? 0, 0); assert.equal(backend.calls['probe-v2'] ?? 0, 0); assert.equal(backend.calls['read-v1'], 3);
});

test('the host probes only on its own automatic reads; every other read stays full', async () => {
  const { readFileSync } = await import('node:fs');
  const host = readFileSync(new URL('../../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8');
  const automatic = host.slice(host.indexOf('function startAutomaticRead('), host.indexOf('function closePreservation('));
  assert.match(automatic, /promise: store\.refreshIfChanged\(\)\.catch\(\(\) => false\)/);
  assert.equal((host.match(/refreshIfChanged\(/g) ?? []).length, 1, 'nowhere else');
  assert(host.includes("onClick={() => void controller.current?.refresh()}"), 'the manual 서버에서 다시 확인 is a full read');
  assert(host.includes('createAlphaHttpRepository(config, session, request, { social: true, readProbe: readProbe === true && !syntheticRuntime })'));
  const page = readFileSync(new URL('../../../../app/alpha/page.tsx', import.meta.url), 'utf8');
  assert(page.includes("readProbe={process.env.FLOWME_ALPHA_READ_PROBE==='v2'}"), 'off unless the deployment sets FLOWME_ALPHA_READ_PROBE=v2');
});

// Codex review of 7dda62f7 (F1): a probe answered with unchanged tokens while the client was in a failure
// state returned true and left that state behind; the full read that used to clear it never ran.
test('a failed full read is not covered by unchanged tokens: the next automatic read is full and clears it', async () => {
  const backend = supabase({ v2: true }), client = connect(backend);
  await client.refreshIfChanged(); assert.equal(backend.calls['full-v2'], 1);
  backend.live.failNextFull = true; assert.equal(await client.refresh(), false, 'the manual check fails');
  assert.equal(client.snapshot().status, 'recovery-required'); assert.equal(client.snapshot().lastError, 'unavailable');
  assert.equal(await client.refreshIfChanged(), true);
  assert.equal(backend.calls['probe-v2'] ?? 0, 0, 'no probe from a failure state');
  assert.equal(backend.calls['full-v2'], 3, 'the failed read, then one full read');
  assert.equal(client.snapshot().status, 'ready'); assert.equal(client.snapshot().lastError, null);
  assert.equal(await client.refreshIfChanged(), true); assert.equal(backend.calls['full-v2'], 3, 'quiet again once it is normal');
});

test('after an expired session the account comes back only through a full read', async () => {
  const backend = supabase({ v2: true }), client = connect(backend);
  await client.refreshIfChanged(); backend.live.session = false;
  assert.equal(await client.refreshIfChanged(), false); assert.equal(client.snapshot().status, 'session-expired');
  backend.live.session = true;
  assert.equal(await client.refreshIfChanged(), true);
  assert.equal(backend.calls['/rest/v1/rpc/flowme_alpha_read_probe_v2'], 1, 'the expired probe (401) only'); assert.equal(backend.calls['probe-v2'] ?? 0, 0);
  assert.equal(backend.calls['full-v2'], 2, 'the hidden account is read in full');
  assert.equal(client.snapshot().status, 'ready');
  assert.equal(await client.refreshIfChanged(), true); assert.equal(backend.calls['full-v2'], 2); assert.equal(backend.calls['probe-v2'], 1, 'normal again: probe only');
});
