import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlphaSocialCommandHandler } from './social-command-handler';
import { createAlphaCommandHandler, signAlphaCommand } from './command-handler';
import { readAlphaAuthConfig } from '../alpha-auth/config';
import { createAlphaHttpRepository } from '../alpha-sync/http-repository';
import { createAlphaSyncController } from '../alpha-sync/controller';
import { createAlphaMemoryRecovery } from '../alpha-persistence/local-recovery';
import { ALPHA_SCHEMA, type AlphaAccount, type AlphaChange, type AlphaCommand, type AlphaReceipt } from '../alpha-persistence/contract';
import { canonicalJson, detached } from '../alpha-persistence/json';
import { materializeAccount, privateChanges, validateAlphaAccount } from '../alpha-persistence/program-adapter';
import { PROGRAM_SCHEMA, type ProgramPrivateSpace, type ProgramPublicRepository } from '../contract';
import { createProgramPrivateSpace } from '../program-data';
import { publishProgramFlow } from '../publication';
import { importProgramPublicVersion, updateProgramTask } from '../private-space';
import { textWorkspaceModel as M } from '../text-workspace';
import { ALPHA_SOCIAL_COMMAND_SCHEMA, type AlphaSocialCommand } from '../alpha-social/contract';
import { ALPHA_SOCIAL_CONTEXT_SCHEMA, alphaSocialReferences, mapAlphaPublicActor, type AlphaSocialContext } from '../alpha-social/projection';
import type { AlphaPrivateTaskScheduleIntent } from '../alpha-social/private-task-schedule';

const owner = '11111111-1111-4111-8111-111111111111', alias = 'member-22222222-2222-4222-8222-222222222222';
const foreignOwner = '33333333-3333-4333-8333-333333333333', key = 'ab'.repeat(32), token = 'synthetic-session-token-for-tests', now = '2026-10-02T12:00:00.000Z';
const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'development', FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co', FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback', FLOWME_ALPHA_M3_SIGNING_KEY: key };
type Commit = { schema: 'flowme-alpha-social-commit/1'; command: AlphaCommand; changes: AlphaChange[]; publicRepository: ProgramPublicRepository | null; resultId: string | null };
type Operation = { fingerprint: string; receipt: AlphaReceipt; inverse: AlphaChange[]; undone: boolean };
function applyChanges(space: ProgramPrivateSpace, changes: AlphaChange[]) {
  const next = detached(space) as unknown as Record<string, unknown>;
  for (const change of changes) { if (change.present) next[change.field] = detached(change.value); else delete next[change.field]; }
  return next as unknown as ProgramPrivateSpace;
}

/** Every request remains in memory. The real HTTP repository/client/controller
 * and server handler run over a synthetic dual-CAS/ledger port, not a real DB. */
function fixture() {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] };
  const context: AlphaSocialContext = { schema: ALPHA_SOCIAL_CONTEXT_SCHEMA, revision: 4, ownActorId: alias,
    actors: [{ id: alias, name: 'Member' }], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
  const data = materializeAccount(account, alphaSocialReferences(context, owner)).data;
  const published = publishProgramFlow(data, { actorId: owner, requestId: 'source', title: 'Source', summary: 'Immutable original', category: 'Test', situations: [],
    source: { kind: 'user-text', label: 'Original', url: null, checkedAt: null }, items: [
      { id: 'ordinary', title: 'My task', description: 'Source description', completionCriteria: 'Source criterion', sourceUrl: null,
        schedule: { kind: 'relative', days: 0 }, subchecks: [{ id: 'check', title: 'Original child' }] },
      { id: 'other', title: 'Other task', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'fixed', date: '2026-10-22' }, subchecks: [] },
    ] }, now); assert(published.ok);
  const imported = importProgramPublicVersion(published.data, { actorId: owner, requestId: 'copy', expectedSpace: published.data.spaces[owner],
    versionId: published.result, itemIds: ['ordinary', 'other'], anchor: '2026-10-10' }); assert(imported.ok);
  account.space = imported.data.spaces[owner]; context.public = mapAlphaPublicActor(imported.data.public, owner, alias);
  const copy = account.space.copies[0], taskId = copy.itemLines.ordinary;
  const intent: AlphaPrivateTaskScheduleIntent = { type: 'private-task-schedule', copyId: copy.id, itemId: 'ordinary', taskId, date: '2026-10-01', time: '09:30' };
  const state = { account, context, mutations: 0, commitAttempts: 0, loseAfterCommit: false, deny: false, race: false, authOwner: owner };
  const operations = new Map<string, Operation>(), commits: Commit[] = [], browserCommands: AlphaCommand[] = [], calls: string[] = [];
  let queue: Promise<unknown> = Promise.resolve();
  function atomic(work: () => Response): Promise<Response> { const result = queue.then(work); queue = result.then(() => undefined, () => undefined); return result; }
  function commit(body: { commit_text: string; proof: string }): Promise<Response> {
    assert.equal(body.proof, signAlphaCommand(owner, body.commit_text, key));
    const value = JSON.parse(body.commit_text) as Commit; assert.equal(value.schema, 'flowme-alpha-social-commit/1');
    commits.push(detached(value));
    return atomic(() => {
      state.commitAttempts++; const command = value.command, fingerprint = canonicalJson(command), prior = operations.get(command.requestId);
      if (prior) return Response.json(prior.fingerprint === fingerprint ? { ok: true, value: prior.receipt } : { ok: false, reason: 'idempotency-conflict' });
      if (command.kind !== 'social' && command.kind !== 'undo-social') return Response.json({ ok: false, reason: 'invalid' });
      if (state.race) { state.race = false; state.account = detached(state.account); state.account.revision++; state.account.space.position.scrollTop++; }
      if (command.expectedRevision !== state.account.revision || command.expectedPublicRevision !== state.context.revision) return Response.json({ ok: false, reason: 'revision-conflict' });
      if (state.deny) return Response.json({ ok: false, reason: 'rate-limited' });
      assert.equal(value.publicRepository, null, 'private schedule cannot submit any public aggregate');
      let changes: AlphaChange[], original: Operation | undefined;
      if (command.kind === 'undo-social') {
        assert.deepEqual(value.changes, []); assert.equal(value.resultId, null);
        original = operations.get(command.operationId);
        if (!original || original.undone || original.receipt.revision !== state.account.revision) return Response.json({ ok: false, reason: 'undo-conflict' });
        changes = original.inverse;
      } else {
        assert.equal(command.intent.type, 'private-task-schedule'); assert.equal(value.resultId, taskId);
        assert(value.changes.every(change => change.field === 'text' || change.field === 'copies'));
        changes = value.changes;
      }
      const next = detached(state.account); next.space = applyChanges(next.space, changes);
      const references = alphaSocialReferences(state.context, owner); assert(validateAlphaAccount(next, references, owner));
      if (canonicalJson(next.space) === canonicalJson(state.account.space)) return Response.json({ ok: false, reason: 'no-change' });
      const inverse = privateChanges(next.space, state.account.space); next.revision++;
      const receipt: AlphaReceipt = { requestId: command.requestId, revision: next.revision, kind: command.kind, changed: true,
        publicRevision: state.context.revision, ...(command.kind === 'social' ? { resultId: taskId } : {}) };
      operations.set(command.requestId, { fingerprint, receipt, inverse, undone: false }); if (original) original.undone = true;
      state.account = next; state.mutations++;
      if (state.loseAfterCommit) { state.loseAfterCommit = false; throw Error('synthetic lost ACK'); }
      return Response.json({ ok: true, value: receipt });
    });
  }
  const upstream: typeof fetch = async (url, init) => {
    const parsed = new URL(String(url)); assert.equal(parsed.origin, env.FLOWME_ALPHA_SUPABASE_URL, 'fixture refuses other network destinations');
    calls.push(parsed.pathname); const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    assert.equal(new Headers(init?.headers).get('authorization'), `Bearer ${token}`);
    if (parsed.pathname === '/auth/v1/user') return Response.json({ id: state.authOwner });
    if (parsed.pathname.endsWith('social_open_v1')) return Response.json({ ok: true, value: { ownActorId: alias } });
    if (parsed.pathname.endsWith('social_server_read_v1')) assert.equal(body.proof, signAlphaCommand(owner, body.read_text, key));
    if (parsed.pathname.endsWith('social_read_v1') || parsed.pathname.endsWith('social_server_read_v1')) return Response.json({ ok: true, value: { account: state.account, context: state.context } });
    if (parsed.pathname.endsWith('lookup_v1')) return Response.json({ ok: true, value: operations.get(body.request_id)?.receipt ?? null });
    if (parsed.pathname.endsWith('social_execute_v1')) return commit(body);
    assert.fail(`unapproved synthetic RPC ${parsed.pathname}`);
  };
  const handler = createAlphaSocialCommandHandler(env, upstream, () => now), privateHandler = createAlphaCommandHandler(env, upstream);
  const request = (command: unknown) => new Request('http://localhost:3104/api/alpha/social', { method: 'POST', headers: { Origin: 'http://localhost:3104',
    'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind: 'execute', command }) });
  const browser: typeof fetch = async (url, init) => {
    if (String(url).startsWith('https://')) return upstream(url, init);
    assert(['/api/alpha/social', '/api/alpha/account'].includes(String(url)), 'fixture refuses other browser endpoints');
    const body = JSON.parse(String(init!.body)); if (body.kind === 'execute') browserCommands.push(detached(body.command));
    const req = new Request(`http://localhost:3104${url}`, { ...init, headers: { ...Object.fromEntries(new Headers(init?.headers)), Origin: 'http://localhost:3104' } });
    return String(url) === '/api/alpha/social' ? handler(req) : privateHandler(req);
  };
  const config = readAlphaAuthConfig(env); assert(config);
  const repository = createAlphaHttpRepository(config, { userId: owner, accessToken: token }, browser, { social: true });
  const recovery = createAlphaMemoryRecovery(); let sequence = 0;
  const controller = createAlphaSyncController({ recovery, requestId: () => `schedule-${++sequence}` }); controller.bindSession(owner, repository);
  const mutate = (value = intent) => controller.mutate('Schedule', data => updateProgramTask(data, { actorId: owner, requestId: 'preview',
    expectedSpace: data.spaces[owner], taskId: value.taskId, patch: { date: value.date, time: value.time } }), { alphaSocial: value });
  const command = (requestId = 'direct'): AlphaSocialCommand => ({ schema: ALPHA_SOCIAL_COMMAND_SCHEMA, kind: 'social', requestId,
    expectedRevision: state.account.revision, expectedPublicRevision: state.context.revision, intent: detached(intent) });
  return { state, operations, commits, browserCommands, calls, handler, request, command, intent, taskId, copy, repository, recovery, controller, mutate };
}
const currentTask = (f: ReturnType<typeof fixture>) => M.tasks(f.state.account.space.text).find(row => row.id === f.taskId)!;
function protectedFacts(f: ReturnType<typeof fixture>) {
  const space = f.state.account.space, copy = detached(space.copies[0]); delete copy.itemOverrides.ordinary?.date;
  if (copy.itemOverrides.ordinary && !Object.keys(copy.itemOverrides.ordinary).length) delete copy.itemOverrides.ordinary;
  const otherLineIds = new Set([copy.itemLines.other, ...Object.values(copy.subcheckLines.ordinary)]);
  const original = space.text.flows[0].lines.filter(line => line.id.startsWith(`${f.taskId}:`) && !line.id.endsWith(':date') && !line.id.endsWith(':time'));
  return canonicalJson({ public: f.state.context, copy, source: f.state.account.source, folders: space.text.folders,
    scopes: { task: space.text.taskScopes, item: space.text.itemScopes }, bindings: space.text.bindings, records: space.text.progressRecords,
    otherLines: space.text.flows[0].lines.filter(line => otherLineIds.has(line.id) || line.id.startsWith(`${copy.itemLines.other}:`)), original });
}

test('PSS01 real handler compiles only the exact own private schedule with a signed commit', async () => {
  const f = fixture(), before = protectedFacts(f), source = canonicalJson(f.state.account.space);
  const response = await f.handler(f.request(f.command())); const result = await response.json(); assert(result.ok, JSON.stringify(result));
  assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(f.state.mutations, 1); assert.equal(f.operations.size, 1);
  assert.equal(currentTask(f).date, '2026-10-01'); assert.equal(currentTask(f).time, '09:30'); assert.equal(protectedFacts(f), before);
  assert.notEqual(canonicalJson(f.state.account.space), source); assert.deepEqual(f.commits[0].changes.map(change => change.field), ['copies', 'text']);
  assert.equal(f.commits[0].publicRepository, null); assert(!JSON.stringify(result).includes('Source description')); assert(!JSON.stringify(result).includes(key));
});

test('PSS02 missing/extra/foreign/bad locator requests never reach the synthetic writer', async () => {
  for (const mode of ['extra', 'missing', 'wrong-item', 'wrong-task', 'wrong-copy', 'bad-time', 'bad-schema', 'foreign'] as const) {
    const f = fixture(), before = canonicalJson(f.state), command = detached(f.command()) as unknown as Record<string, unknown>, intent = command.intent as Record<string, unknown>;
    if (mode === 'extra') intent.patch = { title: 'Smuggled' };
    if (mode === 'missing') delete intent.time;
    if (mode === 'wrong-item') intent.itemId = 'other';
    if (mode === 'wrong-task') intent.taskId = f.copy.itemLines.other;
    if (mode === 'wrong-copy') intent.copyId = 'foreign-copy';
    if (mode === 'bad-time') intent.time = ' 09:30 ';
    if (mode === 'bad-schema') command.schema = 'flowme-alpha-social-command/2';
    if (mode === 'foreign') f.state.authOwner = foreignOwner;
    const protectedBefore = mode === 'foreign' ? canonicalJson(f.state) : before;
    const value = await (await f.handler(f.request(command))).json(); assert.equal(value.ok, false, mode);
    assert.equal(f.state.commitAttempts, 0, mode); assert.equal(f.state.mutations, 0); assert.equal(canonicalJson(f.state), protectedBefore);
  }
});

test('PSS03 same request replays the exact ledger without writing and changed identity conflicts', async () => {
  const f = fixture(), command = f.command(); assert((await (await f.handler(f.request(command))).json()).ok);
  const first = canonicalJson(f.state.account); assert((await (await f.handler(f.request(command))).json()).ok);
  assert.equal(f.state.mutations, 1); assert.equal(f.operations.size, 1); assert.equal(canonicalJson(f.state.account), first);
  assert.deepEqual(f.commits[1].changes, []); assert.equal(f.commits[1].resultId, null);
  const value = await (await f.handler(f.request({ ...command, intent: { ...f.intent, time: '10:00' } }))).json();
  assert.equal(value.reason, 'idempotency-conflict'); assert.equal(f.state.mutations, 1); assert.equal(canonicalJson(f.state.account), first);
});

test('PSS04 stale/future account or public revisions cannot create a new operation', async () => {
  for (const patch of [{ expectedRevision: 1 }, { expectedPublicRevision: 5 }, { expectedPublicRevision: 3 }]) {
    const f = fixture(), before = canonicalJson(f.state.account);
    const value = await (await f.handler(f.request({ ...f.command(), ...patch }))).json(); assert.equal(value.reason, 'revision-conflict');
    assert.equal(f.state.mutations, 0); assert.equal(f.operations.size, 0); assert.equal(canonicalJson(f.state.account), before);
  }
  const f = fixture(), old = f.command(); f.state.account.revision++;
  const value = await (await f.handler(f.request(old))).json(); assert.equal(value.reason, 'revision-conflict'); assert.equal(f.state.mutations, 0); assert.deepEqual(f.commits[0].changes, []);
});

test('PSS05 controller→client→HTTP→handler→synthetic CAS supports schedule, Undo/Redo and reload', async () => {
  const f = fixture(), before = canonicalJson(f.state.account.space), facts = protectedFacts(f); assert(await f.controller.refresh());
  assert((await f.mutate()).ok); assert.equal(f.browserCommands[0].kind, 'social'); assert.equal(f.state.mutations, 1); assert.equal(f.controller.snapshot().canUndo, true);
  assert.equal(f.controller.snapshot().publicRevision, 4); assert.equal(protectedFacts(f), facts);
  assert((await f.controller.undo()).ok); assert.equal(canonicalJson(f.state.account.space), before); assert.equal(f.controller.snapshot().canRedo, true);
  assert.equal(f.browserCommands[1].kind, 'undo-social'); assert((await f.controller.redo()).ok); assert.equal(currentTask(f).date, '2026-10-01');
  assert.equal(currentTask(f).time, '09:30'); assert.equal(f.state.mutations, 3); assert.equal(protectedFacts(f), facts);
  const reopened = createAlphaSyncController({ recovery: f.recovery }); reopened.bindSession(owner, f.repository); assert(await reopened.refresh());
  const task = M.tasks(reopened.snapshot().envelope!.data.spaces[owner].text).find(row => row.id === f.taskId)!;
  assert.equal(task.date, '2026-10-01'); assert.equal(task.time, '09:30'); assert.equal(reopened.snapshot().publicRevision, 4);
  assert.equal(f.state.mutations, 3); assert.equal(f.operations.size, 3);
});

test('PSS06 same schedule preview, cancel/no invocation, and direct no-change write zero operations', async () => {
  const f = fixture(), before = canonicalJson(f.state.account); assert(await f.controller.refresh());
  assert.equal(f.state.mutations, 0); assert.equal(f.browserCommands.length, 0);
  const value = await f.mutate({ ...f.intent, date: '2026-10-10', time: '' }); assert(value.ok && !value.changed);
  assert.equal(f.browserCommands.length, 0); assert.equal(f.state.commitAttempts, 0);
  const command = f.command(); command.intent = { ...f.intent, date: '2026-10-10', time: '' };
  assert.equal((await (await f.handler(f.request(command))).json()).reason, 'no-change');
  assert.equal(f.state.commitAttempts, 0); assert.equal(f.operations.size, 0); assert.equal(canonicalJson(f.state.account), before);
});

test('PSS07 rate-limited commit retains private bytes and draft; direct retry sends no additional request', async () => {
  const f = fixture(); assert(await f.controller.refresh()); const before = canonicalJson(f.state.account); f.state.deny = true;
  assert(!(await f.mutate()).ok); assert.equal(f.state.mutations, 0); assert.equal(f.operations.size, 0); assert.equal(canonicalJson(f.state.account), before);
  const snapshot = f.controller.snapshot(); assert.equal(snapshot.pending, null); assert(snapshot.draft?.kind === 'social'); assert.deepEqual(snapshot.draft.intent, f.intent);
  assert.equal(snapshot.canUndo, false); assert.equal(snapshot.envelope!.data.spaces[owner].copies[0].itemOverrides.ordinary, undefined);
  assert.equal(f.browserCommands.length, 1); assert.equal(f.state.commitAttempts, 1);
  assert.deepEqual(await f.mutate(), { ok: false, reason: 'unresolved' });
  assert.equal(f.browserCommands.length, 1); assert.equal(f.state.commitAttempts, 1);
  assert.equal(f.state.mutations, 0); assert.equal(f.operations.size, 0); assert.equal(canonicalJson(f.state.account), before);
  assert.deepEqual(f.controller.snapshot().draft, snapshot.draft); assert.equal(f.controller.snapshot().pending, null);
});

test('PSS08 lost ACK resolves exact request from the ledger once, then private Undo succeeds', async () => {
  const f = fixture(); assert(await f.controller.refresh()); const before = canonicalJson(f.state.account.space); f.state.loseAfterCommit = true;
  assert(!(await f.mutate()).ok); const pending = f.controller.snapshot().pending; assert(pending); assert.equal(f.state.mutations, 1); assert.equal(f.operations.size, 1);
  const reopened = createAlphaSyncController({ recovery: f.recovery }); reopened.bindSession(owner, f.repository); assert(await reopened.resolvePending());
  assert.equal(reopened.snapshot().pending, null); assert.equal(reopened.snapshot().canUndo, true); assert.equal(f.browserCommands.length, 1);
  assert.equal(f.state.mutations, 1); assert((await reopened.undo()).ok); assert.equal(canonicalJson(f.state.account.space), before); assert.equal(f.state.mutations, 2);
});

test('PSS09 CAS change after server compile rejects the schedule and retains conflict draft', async () => {
  const f = fixture(); assert(await f.controller.refresh()); const before = canonicalJson(f.state.account.space.text), copies = canonicalJson(f.state.account.space.copies);
  f.state.race = true; assert(!(await f.mutate()).ok); assert.equal(f.state.mutations, 0); assert.equal(f.operations.size, 0);
  assert.equal(canonicalJson(f.state.account.space.text), before); assert.equal(canonicalJson(f.state.account.space.copies), copies);
  assert(f.controller.snapshot().draft?.kind === 'social'); assert.equal(f.controller.snapshot().canUndo, false);
});

test('PSS10 concurrent independent commands permit one dual-CAS winner only', async () => {
  const f = fixture(), a = f.command('a'), b = f.command('b'); b.intent = { ...f.intent, date: '2026-10-02', time: '10:00' };
  const results = await Promise.all([f.handler(f.request(a)), f.handler(f.request(b))]); const values = await Promise.all(results.map(result => result.json()));
  assert.equal(values.filter(value => value.ok).length, 1); assert.equal(values.filter(value => value.reason === 'revision-conflict').length, 1);
  assert.equal(f.state.mutations, 1); assert.equal(f.operations.size, 1); assert.equal(f.state.context.revision, 4);
});
