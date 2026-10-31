import assert from 'node:assert/strict';
import test from 'node:test';
import { type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { createProgramData, createProgramEnvelope, validateProgramData } from './program-data';
import { addProgramQuickTask, completeProgramTask, createProgramDocument, importProgramPublicVersion, updateProgramTask } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { ALPHA_SOCIAL_COMMAND_SCHEMA, isAlphaSocialCommand, type AlphaSocialCommand } from './alpha-social/contract';
import { alphaSocialReferences, isAlphaSocialContext, readAlphaSocialResponse, type AlphaSocialContext } from './alpha-social/projection';
import { ALPHA_ENVIRONMENT_POLICY } from './alpha-persistence/environment';
import type { AlphaAccount, AlphaChange, AlphaReceipt } from './alpha-persistence/contract';
import { canonicalJson, detached } from './alpha-persistence/json';
import { captureAlphaAccount, materializeAccount, validateAlphaAccount } from './alpha-persistence/program-adapter';
import { signAlphaCommand } from './alpha-server/command-handler';
import { ALPHA_SOCIAL_COMMIT_SCHEMA, createAlphaSocialCommandHandler } from './alpha-server/social-command-handler';
import { isAlphaWireReceipt } from './alpha-sync/wire';
import { programTaskDateState, type ProgramTaskDateMove } from './task-date-move';

// C6b server-boundary integration: run the actual request handler and its social
// dispatch/compiler. Every upstream request is memory-only; the SQL transaction,
// a live account and the browser surface are deliberately outside this test.
const OWNER = '11111111-1111-4111-8111-111111111111';
const OWNER_ALIAS = `member-${OWNER}`;
const CREATOR_ALIAS = 'member-22222222-2222-4222-8222-222222222222';
const ORIGIN = 'http://localhost:3000';
const UPSTREAM = `https://${ALPHA_ENVIRONMENT_POLICY.developmentProject}.supabase.co`;
const TOKEN = 'synthetic_c6b_server_dispatch_access_token';
const KEY = 'a'.repeat(64); // Synthetic signing input, never read from a file or real environment.
const CLOCK = '2026-11-01T01:02:03.000Z';
const AUTH_PATH = '/auth/v1/user';
const READ_PATH = '/rest/v1/rpc/flowme_alpha_social_server_read_v1';
const COMMIT_PATH = '/rest/v1/rpc/flowme_alpha_social_execute_v1';
const ENV = {
  FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'test',
  FLOWME_ALPHA_PROJECT_REF: ALPHA_ENVIRONMENT_POLICY.developmentProject,
  FLOWME_ALPHA_SUPABASE_URL: UPSTREAM, FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_synthetic_c6b_dispatch',
  FLOWME_ALPHA_REDIRECT_URL: `${ORIGIN}/auth/callback`, FLOWME_ALPHA_M3_SIGNING_KEY: KEY,
};

const accept = <T,>(result: ProgramTransition<T>) => {
  assert(result.ok, result.ok ? '' : result.reason);
  return result;
};
const own = (data: ProgramData) => data.spaces[OWNER];

/** Same general-two-documents plus one public-copy arrangement as c6b-dates.test.ts. */
function fixture() {
  let data = createProgramData(), request = 0;
  data.actors = [{ id: OWNER, name: '합성 소유자', simulated: true }, { id: CREATOR_ALIAS, name: '합성 작성자', simulated: true }];
  data.spaces = { [OWNER]: data.spaces['local-user'], [CREATOR_ALIAS]: data.spaces['creator-minji'] };
  data.activeActorId = OWNER;
  const base = () => ({ actorId: OWNER, requestId: `c6b-fixture-${++request}`, expectedSpace: own(data) });
  data.public.flows.push({ id: 'flow-a', ownerId: CREATOR_ALIAS, currentVersionId: 'version-a', category: '생활', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'version-a', flowId: 'flow-a', number: 1, parentVersionId: null, title: '공개 흐름', summary: '',
    source: { kind: 'simulated-example', label: '예시', url: null, checkedAt: null }, createdBy: CREATOR_ALIAS, createdAt: '2026-10-01T00:00:00.000Z',
    items: [{ id: 'item-a', title: '사본 할 일', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'fixed', date: '2026-10-30' }, subchecks: [] }] });
  const ids: Record<'first' | 'second' | 'copy', string> = { first: '', second: '', copy: '' };
  for (const [key, title, date] of [['first', '첫 글', '2026-10-29'], ['second', '둘째 글', '2026-10-30']] as const) {
    const created = accept(createProgramDocument(data, { ...base(), title })); data = created.data;
    const added = accept(addProgramQuickTask(data, { ...base(), documentId: created.result, title: `${title} 할 일`, date }));
    data = added.data; ids[key] = added.result;
  }
  data = accept(updateProgramTask(data, { ...base(), taskId: ids.second, patch: { time: '09:30' } })).data;
  data = accept(completeProgramTask(data, { ...base(), taskId: ids.first, date: '2026-10-28', done: false })).data;
  data = accept(importProgramPublicVersion(data, { ...base(), versionId: 'version-a', itemIds: ['item-a'], anchor: '2026-10-29' })).data;
  ids.copy = own(data).copies[0].itemLines['item-a'];
  assert(validateProgramData(data));
  const { account } = captureAlphaAccount(createProgramEnvelope(data), OWNER, OWNER);
  account.revision = 17;
  const context: AlphaSocialContext = {
    schema: 'flowme-alpha-social-context/1', revision: 4, ownActorId: OWNER_ALIAS,
    actors: [{ id: OWNER_ALIAS, name: '합성 소유자' }, { id: CREATOR_ALIAS, name: '합성 작성자' }], public: detached(data.public),
  };
  const references = alphaSocialReferences(context, OWNER);
  assert(isAlphaSocialContext(context, { server: true }));
  assert(validateAlphaAccount(account, references, OWNER));
  assert.deepEqual(references.actorIds, [OWNER, CREATOR_ALIAS]);
  assert.equal(references.public.flows[0].ownerId, CREATOR_ALIAS, 'foreign public creator alias is preserved');
  assert(readAlphaSocialResponse({ ok: true, value: { account, context } }, OWNER, { server: true }), 'actual server read framing validates');
  return { account, context, ids };
}

type Commit = {
  schema: typeof ALPHA_SOCIAL_COMMIT_SCHEMA; command: AlphaSocialCommand;
  changes: AlphaChange[]; publicRepository: ProgramData['public'] | null; resultId: string | null;
};

/** Only the handler's three permitted upstream paths exist. No global fetch fallback. */
function memoryServer(seed: ReturnType<typeof fixture>) {
  let account = detached(seed.account);
  const context = detached(seed.context);
  const calls: string[] = [], commits: Commit[] = [], unexpected: string[] = [];
  const receipts: AlphaReceipt[] = [{ requestId: 'c6b-existing-receipt', revision: 17, changed: true, kind: 'social', resultId: seed.ids.first, publicRevision: 4 }];
  let privateCommits = 0;
  const snapshot = () => detached({ account, context, receipts });
  const fetcher = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    if (url.origin !== UPSTREAM || ![AUTH_PATH, READ_PATH, COMMIT_PATH].includes(url.pathname)) {
      if (url.pathname === '/api/alpha/account' || url.pathname === '/rest/v1/rpc/flowme_alpha_execute_v1') privateCommits++;
      unexpected.push(url.pathname); throw Error(`unexpected memory path: ${url.pathname}`);
    }
    const headers = new Headers(init.headers);
    assert.equal(headers.get('authorization'), `Bearer ${TOKEN}`);
    assert.equal(headers.get('apikey'), ENV.FLOWME_ALPHA_PUBLISHABLE_KEY);
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    if (url.pathname === AUTH_PATH) {
      assert.equal(init.method, 'GET'); assert.equal(init.body, undefined);
      return Response.json({ id: OWNER, is_anonymous: false });
    }
    assert.equal(init.method, 'POST');
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    if (url.pathname === READ_PATH) {
      const readText = canonicalJson({ schema: 'flowme-alpha-social-server-read/1' });
      assert.deepEqual(body, { read_text: readText, proof: signAlphaCommand(OWNER, readText, KEY) });
      return Response.json({ ok: true, value: { account, context } });
    }
    assert.deepEqual(Object.keys(body).sort(), ['commit_text', 'proof']);
    assert.equal(typeof body.commit_text, 'string');
    assert.equal(body.proof, signAlphaCommand(OWNER, body.commit_text as string, KEY));
    const commit = JSON.parse(body.commit_text as string) as Commit;
    assert.equal(commit.schema, ALPHA_SOCIAL_COMMIT_SCHEMA);
    assert(isAlphaSocialCommand(commit.command));
    assert.equal(commit.command.intent.type, 'private-task-dates');
    assert.equal(commit.command.expectedRevision, account.revision, 'test reaches fresh dispatch, never a stale SQL replay');
    assert.equal(commit.command.expectedPublicRevision, context.revision);
    commits.push(detached(commit));
    // This is a memory acknowledgment of the generated aggregate, not an SQL atomicity model.
    assert.equal(commit.publicRepository, null); assert.equal(typeof commit.resultId, 'string');
    const next = detached(account);
    for (const change of commit.changes) {
      assert(change.present, 'this date move only replaces present text/copies fields');
      Object.assign(next.space, { [change.field]: detached(change.value) });
    }
    next.revision++;
    assert(validateAlphaAccount(next, alphaSocialReferences(context, OWNER), OWNER));
    const receipt: AlphaReceipt = { requestId: commit.command.requestId, revision: next.revision, changed: true, kind: 'social',
      resultId: commit.resultId!, publicRevision: context.revision };
    assert(isAlphaWireReceipt(receipt));
    account = next; receipts.push(receipt);
    return Response.json({ ok: true, value: receipt });
  }) as typeof fetch;
  const handler = createAlphaSocialCommandHandler(ENV, fetcher, () => CLOCK);
  const send = async (command: AlphaSocialCommand) => {
    assert(isAlphaSocialCommand(command));
    assert.equal(command.expectedRevision, account.revision);
    assert.equal(command.expectedPublicRevision, context.revision);
    const response = await handler(new Request(`${ORIGIN}/api/alpha/social`, { method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ kind: 'execute', command }) }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    return await response.json() as { ok: true; value: AlphaReceipt } | { ok: false; reason: string };
  };
  return { send, snapshot, calls, commits, unexpected, privateCommits: () => privateCommits };
}

function movesFor(account: AlphaAccount, ids: string[]): ProgramTaskDateMove[] {
  const tasks = M.tasks(account.space.text);
  return ids.map(taskId => {
    const task = tasks.find(row => row.id === taskId); assert(task);
    return { taskId, expected: { date: task.date, time: task.time ?? '', state: programTaskDateState(account.space, taskId)! }, date: '2026-11-02' };
  });
}
function commandFor(seed: ReturnType<typeof fixture>, ids: string[], requestId: string): AlphaSocialCommand {
  return { schema: ALPHA_SOCIAL_COMMAND_SCHEMA, kind: 'social', requestId,
    expectedRevision: seed.account.revision, expectedPublicRevision: seed.context.revision,
    intent: { type: 'private-task-dates', moves: movesFor(seed.account, ids) } };
}
const nonDateLines = (space: ProgramPrivateSpace) => [...space.text.documents, ...space.text.flows]
  .map(doc => [doc.id, doc.lines.filter(line => !/^\s*- 날짜: /.test(line.text)).map(line => [line.id, line.text])]);
function withoutDates(space: ProgramPrivateSpace) {
  const copy = detached(space);
  for (const doc of [...copy.text.documents, ...copy.text.flows]) {
    // A task formerly inheriting its document date gains a date property line.
    // Those lines alone may be inserted/changed; every other RAW line and ID stays.
    doc.lines = doc.lines.filter(line => !/^\s*- 날짜: /.test(line.text));
  }
  for (const imported of copy.copies) {
    for (const [id, override] of Object.entries(imported.itemOverrides)) {
      delete override.date;
      if (!Object.keys(override).length) delete imported.itemOverrides[id];
    }
  }
  return copy;
}

test('C6b actual server handler dispatches a fresh mixed batch into exactly one social text+copies commit', async () => {
  const seed = fixture(), server = memoryServer(seed), before = server.snapshot();
  const command = commandFor(seed, [seed.ids.first, seed.ids.second, seed.ids.copy], 'c6b-http-mixed');
  const response = await server.send(command);
  assert(response.ok, response.ok ? '' : response.reason);
  assert(isAlphaWireReceipt(response.value));
  assert.deepEqual(server.calls, [AUTH_PATH, READ_PATH, COMMIT_PATH]);
  assert.equal(server.commits.length, 1); assert.equal(server.privateCommits(), 0); assert.deepEqual(server.unexpected, []);
  const commit = server.commits[0];
  assert.deepEqual(Object.keys(commit).sort(), ['changes', 'command', 'publicRepository', 'resultId', 'schema']);
  assert.deepEqual(commit.command, command);
  assert.deepEqual(commit.changes.map(change => change.field).sort(), ['copies', 'text']);
  assert(commit.changes.every(change => change.present));
  assert.equal(commit.publicRepository, null); assert.equal(commit.resultId, seed.ids.first);
  const after = server.snapshot();
  assert.deepEqual(after.context, before.context, 'public repository, creator aliases and public revision are untouched');
  assert.deepEqual({ ...after.account, revision: 17, space: before.account.space }, before.account, 'account metadata/source/legacy history are preserved');
  assert.equal(after.account.revision, 18); assert.equal(after.receipts.length, before.receipts.length + 1);
  assert.deepEqual(after.receipts.slice(0, -1), before.receipts);
  assert.deepEqual(after.receipts.at(-1), response.value);
  assert.deepEqual(nonDateLines(after.account.space), nonDateLines(before.account.space));
  const oldIds = new Set([...before.account.space.text.documents, ...before.account.space.text.flows].flatMap(doc => doc.lines.map(line => line.id)));
  const newLines = [...after.account.space.text.documents, ...after.account.space.text.flows].flatMap(doc => doc.lines).filter(line => !oldIds.has(line.id));
  assert(newLines.every(line => /^\s*- 날짜: /.test(line.text)), 'only newly explicit date properties may gain IDs');
  assert.deepEqual(withoutDates(after.account.space), withoutDates(before.account.space), 'only date properties and copy date override differ');
  assert.deepEqual(after.account.space.text.progressRecords, before.account.space.text.progressRecords);
  assert.deepEqual(M.tasks(after.account.space.text).map(row => [row.id, row.title, row.time ?? '']),
    M.tasks(before.account.space.text).map(row => [row.id, row.title, row.time ?? '']));
  for (const id of [seed.ids.first, seed.ids.second, seed.ids.copy]) assert.equal(M.tasks(after.account.space.text).find(row => row.id === id)!.date, '2026-11-02');
  assert.equal(M.tasks(after.account.space.text).find(row => row.id === seed.ids.second)!.time, '09:30');
  const beforeCopy = before.account.space.copies[0], afterCopy = after.account.space.copies[0];
  assert.deepEqual({ ...afterCopy, itemOverrides: {} }, { ...beforeCopy, itemOverrides: {} });
  assert.deepEqual(afterCopy.itemOverrides, { 'item-a': { date: '2026-11-02' } });
  const projected = materializeAccount(after.account, alphaSocialReferences(after.context, OWNER));
  assert.equal(projected.data.activeActorId, OWNER); assert.equal(projected.data.public.flows[0].ownerId, CREATOR_ALIAS);
});

for (const position of ['first', 'last'] as const) {
  test(`C6b actual server dispatch refuses a current-revision batch with locked member ${position}; no commit or partial memory mutation`, async () => {
    const seed = fixture();
    const lockedDocument = seed.account.space.text.documents.find(doc => doc.lines.some(line => line.id === seed.ids.second)); assert(lockedDocument);
    seed.account.space.archivedDocumentIds = [lockedDocument.id];
    assert(validateAlphaAccount(seed.account, alphaSocialReferences(seed.context, OWNER), OWNER));
    const ids = position === 'first' ? [seed.ids.second, seed.ids.first, seed.ids.copy] : [seed.ids.first, seed.ids.copy, seed.ids.second];
    const command = commandFor(seed, ids, `c6b-http-locked-${position}`);
    assert.equal(command.expectedRevision, 17); assert.equal(command.expectedPublicRevision, 4);
    assert.equal(command.expectedRevision, seed.account.revision, 'not a stale request that bypasses the dispatch/compiler');
    assert.equal(command.expectedPublicRevision, seed.context.revision);
    const server = memoryServer(seed), before = server.snapshot();
    const response = await server.send(command);
    assert.deepEqual(response, { ok: false, reason: 'invalid' }, 'domain unresolved maps to handler invalid, not revision-conflict');
    assert.deepEqual(server.calls, [AUTH_PATH, READ_PATH], 'auth and valid current server context reached; dispatch refuses before social execute');
    assert.equal(server.commits.length, 0); assert.equal(server.privateCommits(), 0); assert.deepEqual(server.unexpected, []);
    assert.deepEqual(server.snapshot(), before, 'whole account, public context and existing receipt ledger are byte-for-byte equivalent');
    assert.equal(canonicalJson(server.snapshot()), canonicalJson(before), 'canonical serialized account/context/receipts are unchanged');
    assert.deepEqual(seed.account, before.account, 'the fixture passed into the handler stays intact too');
  });
}
