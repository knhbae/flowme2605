import test from 'node:test';
import assert from 'node:assert/strict';
import { createContext, runInContext, Script } from 'node:vm';
import type { Page, Route } from '@playwright/test';
import { mockFolderContentEntry, publicIds } from './folder-content-entry.fixture';
import { emptyAccount, prefix } from './alpha-auth.fixture';
import { seedJourneyNative, journeyDraftId, journeyStamp } from './flow-execution-journey.fixture';
import { RELEASE_ORIGIN } from './cloudflare-release.fixture';
import { alphaSocialReferences, emptyAlphaReferences } from '../../lib/flow/integrated-poc/alpha-social/projection';
import { materializeAccount, validateAlphaAccount, privateChanges } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { canonicalJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { inspectProgramNativeCreatorHandoff } from '../../lib/flow/integrated-poc/creator-native-execution-adapter';
import { isAlphaCreatorCommand, type AlphaCreatorCommand } from '../../lib/flow/integrated-poc/alpha-creator/contract';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import { selectJourneyScenarios, assertJourneyMatrixComplete, journeyCopySourceIdentity } from '../../scripts/alpha/flow-execution-journey-contract';
import { updateProgramTask } from '../../lib/flow/integrated-poc/private-space';

/** Exercise the real registered fixture handlers without a browser, server,
 * Auth configuration, storage or network. This is not an app UI test. */
function routeHarness() {
  type Handler = (route: Route) => unknown;
  let pageHandler: Handler | undefined, contextHandler: Handler | undefined, fetches = 0;
  const initScripts: string[] = [], bindings = new Map<string, (...args: unknown[]) => unknown>();
  const page = {
    exposeBinding: async (name: string, binding: (...args: unknown[]) => unknown) => { bindings.set(name, binding); },
    addInitScript: async (script: string) => { initScripts.push(script); }, on: () => {},
    context: () => ({ routeWebSocket: async () => {}, route: async (_pattern: string, handler: Handler) => { contextHandler = handler; } }),
    route: async (_pattern: string, handler: Handler) => { pageHandler = handler; },
  } as unknown as Page;
  async function request(path: string, body: unknown, method = 'POST', origin = RELEASE_ORIGIN) {
    let response: unknown, aborted: string | null = null;
    const route = {
      request: () => ({ url: () => `${origin}${path}`, method: () => method, postDataJSON: () => structuredClone(body) }),
      fulfill: async (options: { body?: string }) => { response = options.body ? JSON.parse(options.body) : null; },
      abort: async (reason: string) => { aborted = reason; },
      fallback: async () => { assert(contextHandler); await contextHandler(route as unknown as Route); },
      fetch: async () => { fetches++; throw Error('Fixture unit test must never fetch a resource'); },
    };
    assert(pageHandler); await pageHandler(route as unknown as Route);
    return { response, aborted };
  }
  return { page, request, initScripts, bindings, get fetches() { return fetches; } };
}

test('JF12 plain browser storage probes execute without transpiler helpers and capture all mutators in either registration order', async () => {
  const harness = routeHarness(); await mockFolderContentEntry(harness.page, { creatorExecution: true });
  assert.equal(harness.initScripts.length, 2);
  for (const script of harness.initScripts) { assert.equal(typeof script, 'string'); assert(!script.includes('__name')); new Script(script); }
  for (const order of [harness.initScripts, [...harness.initScripts].reverse()]) {
    const calls: unknown[] = [];
    const sandbox = createContext({ location: { origin: RELEASE_ORIGIN },
      __cloudflareReleaseStorageCall: (call: unknown) => { calls.push(call); } });
    runInContext(`class Storage {
      constructor(){ this.values = new Map(); }
      getItem(key){ return this.values.get(key) ?? null; }
      setItem(key, value){ this.values.set(key, String(value)); }
      removeItem(key){ this.values.delete(key); }
      clear(){ this.values.clear(); }
    }
    globalThis.Storage=Storage; globalThis.localStorage=new Storage(); globalThis.sessionStorage=new Storage(); globalThis.window=globalThis;`, sandbox);
    for (const script of order) runInContext(script, sandbox);
    assert.equal(runInContext("localStorage.getItem('flow:saved-plans')", sandbox), '  synthetic release sentinel\r\n');
    const key = `${prefix}unit-instrumentation`;
    runInContext(`localStorage.setItem(${JSON.stringify(key)}, 'x'); localStorage.removeItem(${JSON.stringify(key)}); localStorage.clear();`, sandbox);
    assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ method: 'setItem', key }, { method: 'removeItem', key }, { method: 'clear', key: null }]);
    assert(runInContext('__folderContentStorage.calls', sandbox) >= 3);
  }
  assert.equal(harness.fetches, 0);
});
type Mock = Awaited<ReturnType<typeof mockFolderContentEntry>>;
async function nativeCommand(mock: Mock, requestId: string): Promise<AlphaCreatorCommand> {
  const account = await mock.current();
  const data = materializeAccount(account, alphaSocialReferences(mock.context, account.ownerId)).data;
  const review = inspectProgramNativeCreatorHandoff(data, { actorId: account.ownerId, draftId: journeyDraftId }, journeyStamp);
  assert(review.ok);
  return { schema: 'flowme-alpha-creator-command/1', kind: 'creator', requestId, expectedRevision: account.revision,
    intent: { type: 'native-handoff', now: journeyStamp, draftId: journeyDraftId,
      choices: Object.fromEntries(review.preview.rows.map(row => [row.itemId,
        { source: 'incoming', date: 'incoming', time: 'incoming', children: 'incoming' }])) } };
}

test('JF01 native journey seed preserves the input account and starts without a personal handoff', () => {
  const initial = emptyAccount('a');
  assert(validateAlphaAccount(initial, emptyAlphaReferences(initial.ownerId), initial.ownerId));
  const before = canonicalJson(initial), seeded = seedJourneyNative(initial);
  assert.equal(canonicalJson(initial), before);
  const workspace = seeded.space.creatorWorkspace!;
  assert.equal(workspace.library.records[journeyDraftId].status, 'active');
  assert(workspace.structureDrafts![journeyDraftId].nativeDocument);
  assert.equal(workspace.handoffs[journeyDraftId], undefined);
  assert.equal(seeded.space.text.progressRecords.length, 0);
});

test('JF02 the default folder fixture denies the new native handoff unless explicitly opted in', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page, { prepareAccount: seedJourneyNative });
  const before = canonicalJson(await mock.current()), command = await nativeCommand(mock, 'fixture-default-denied');
  assert.deepEqual((await harness.request('/api/alpha/creator', { kind: 'execute', command })).response, { ok: false, reason: 'invalid' });
  assert.equal(canonicalJson(await mock.current()), before);
  assert.deepEqual(mock.diagnostics(), { mutations: 0, operations: 0 });
  assert.equal(harness.fetches, 0);
});

test('JF03 limit rejection preserves bytes; explicit retry commits once and receipt replay never duplicates the document', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page, { prepareAccount: seedJourneyNative, creatorExecution: true });
  const before = await mock.current(), source = canonicalJson(before.space.creatorWorkspace!.library);
  const command = await nativeCommand(mock, 'fixture-native-retry');
  mock.state.rejectNextExecute = 'limit';
  assert.deepEqual((await harness.request('/api/alpha/creator', { kind: 'execute', command })).response, { ok: false, reason: 'limit' });
  assert.equal(canonicalJson(await mock.current()), canonicalJson(before));
  assert.deepEqual(mock.diagnostics(), { mutations: 0, operations: 0 });
  const retry = await harness.request('/api/alpha/creator', { kind: 'execute', command });
  assert.equal((retry.response as { ok: boolean }).ok, true);
  assert.deepEqual(mock.diagnostics(), { mutations: 1, operations: 1 });
  const saved = await mock.current(), owner = saved.space.creatorWorkspace!.nativeExecutionSources![journeyDraftId];
  assert(M.getDocument(saved.space.text, owner.documentId));
  assert.equal(canonicalJson(saved.space.creatorWorkspace!.library), source);
  const replay = await harness.request('/api/alpha/creator', { kind: 'execute', command });
  assert.deepEqual(replay.response, retry.response);
  assert.equal(canonicalJson(await mock.current()), canonicalJson(saved));
  assert.deepEqual(mock.diagnostics(), { mutations: 1, operations: 1 });
  assert.equal(saved.space.text.documents.filter(doc => doc.id === owner.documentId).length, 1);
  assert.equal(mock.commands.length, 3); assert.equal(harness.fetches, 0);
});

test('JF04 stale CAS and changed reuse of a request ID cannot mutate the accepted personal handoff', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page, { prepareAccount: seedJourneyNative, creatorExecution: true });
  const command = await nativeCommand(mock, 'fixture-native-first');
  assert.equal(((await harness.request('/api/alpha/creator', { kind: 'execute', command })).response as { ok: boolean }).ok, true);
  const before = canonicalJson(await mock.current()), counts = mock.diagnostics();
  const stale = { ...command, requestId: 'fixture-native-stale' };
  assert.deepEqual((await harness.request('/api/alpha/creator', { kind: 'execute', command: stale })).response, { ok: false, reason: 'revision-conflict' });
  const changed = { ...command, expectedRevision: command.expectedRevision + 1 };
  assert.deepEqual((await harness.request('/api/alpha/creator', { kind: 'execute', command: changed })).response, { ok: false, reason: 'idempotency-conflict' });
  assert.equal(canonicalJson(await mock.current()), before); assert.deepEqual(mock.diagnostics(), counts);
  assert.equal(harness.fetches, 0);
});

test('JF05 unknown, nonexact, foreign and mutation requests cannot reach the resource fetch branch', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page, { creatorExecution: true });
  const before = canonicalJson(await mock.current());
  for (const [path, method, origin] of [
    ['/api/alpha/unknown', 'POST', RELEASE_ORIGIN], ['/api/alpha/creator?extra=1', 'POST', RELEASE_ORIGIN],
    ['/api/alpha/creator', 'PUT', RELEASE_ORIGIN], ['/alpha', 'POST', RELEASE_ORIGIN],
    ['/api/alpha/creator', 'POST', 'https://other.example.invalid'],
    ['/rest/v1/unknown', 'POST', 'https://wkmzcxpnojobxrgebapw.supabase.co'],
  ]) {
    const result = await harness.request(path, {}, method, origin);
    assert(result.aborted || (result.response as { ok?: boolean })?.ok === false);
  }
  assert.equal(canonicalJson(await mock.current()), before);
  assert.deepEqual(mock.diagnostics(), { mutations: 0, operations: 0 }); assert.equal(harness.fetches, 0);
});

test('JF06 synthetic public catalog is detached from account bytes and never changes during native dispatch', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page, { prepareAccount: seedJourneyNative, creatorExecution: true, catalog: true });
  const source = canonicalJson(mock.context.public);
  assert.equal(mock.context.public.versions[0].id, publicIds.version);
  const command = await nativeCommand(mock, 'fixture-source-unchanged');
  assert.equal(((await harness.request('/api/alpha/creator', { kind: 'execute', command })).response as { ok: boolean }).ok, true);
  assert.equal(canonicalJson(mock.context.public), source); assert.equal(harness.fetches, 0);
});

test('JF07 journey opt-in rejects unused native correction, raw update and library rename/archive/duplicate intents', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page, { prepareAccount: seedJourneyNative, creatorExecution: true });
  const initial = await mock.current(), before = canonicalJson(initial), command = await nativeCommand(mock, 'fixture-unused-intent');
  const workspace = initial.space.creatorWorkspace!, record = workspace.library.records[journeyDraftId];
  const intents = [
    { type: 'native-operation', draftId: journeyDraftId, now: journeyStamp, operation: { type: 'test-only-unused-operation' } },
    { type: 'raw-update', draftId: journeyDraftId, now: journeyStamp, choices: {} },
    { type: 'library-action', now: journeyStamp, action: { type: 'rename', draftId: journeyDraftId, title: '불필요한 변경',
      expectedLibraryRevision: workspace.library.revision, expectedRecordRevision: record.recordRevision, now: journeyStamp } },
    { type: 'library-action', now: journeyStamp, action: { type: 'archive', draftId: journeyDraftId,
      expectedLibraryRevision: workspace.library.revision, expectedRecordRevision: record.recordRevision, now: journeyStamp } },
    { type: 'library-action', now: journeyStamp, action: { type: 'duplicate', sourceDraftId: journeyDraftId, newDraftId: 'fixture-unused-duplicate',
      expectedLibraryRevision: workspace.library.revision, expectedSourceRecordRevision: record.recordRevision, now: journeyStamp } },
  ];
  for (const intent of intents) {
    const attempted = { ...command, intent }; assert(isAlphaCreatorCommand(attempted));
    assert.deepEqual((await harness.request('/api/alpha/creator', { kind: 'execute', command: attempted })).response,
      { ok: false, reason: 'invalid' });
  }
  assert.equal(canonicalJson(await mock.current()), before); assert.deepEqual(mock.diagnostics(), { mutations: 0, operations: 0 });
  assert.equal(mock.commands.length, 0); assert.equal(harness.fetches, 0);
});

test('JF08 scoped private text edit and its exact Undo remain usable with one transaction each', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page, { creatorExecution: true });
  const initial = await mock.current(), documentId = initial.space.text.documents[0].id;
  const text = M.editText(initial.space.text, documentId, `${M.raw(M.getDocument(initial.space.text, documentId))}\n합성 메모`);
  const command = { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: 'fixture-private-text',
    expectedRevision: initial.revision, changes: [{ field: 'text', present: true, value: text }] };
  assert.equal(((await harness.request('/api/alpha/account', { kind: 'execute', command })).response as { ok: boolean }).ok, true);
  const saved = await mock.current(); assert.equal(canonicalJson(saved.space.text), canonicalJson(text));
  const undo = { schema: 'flowme-alpha-command/1', kind: 'undo-private', requestId: 'fixture-private-undo',
    expectedRevision: saved.revision, operationId: command.requestId };
  assert.equal(((await harness.request('/api/alpha/account', { kind: 'execute', command: undo })).response as { ok: boolean }).ok, true);
  assert.equal(canonicalJson((await mock.current()).space.text), canonicalJson(initial.space.text));
  assert.deepEqual(mock.diagnostics(), { mutations: 2, operations: 2 }); assert.equal(harness.fetches, 0);
});

test('JF09 direct creator-owner writes and Undo of an unrelated semantic transaction are denied', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page, { prepareAccount: seedJourneyNative, creatorExecution: true });
  const handoff = await nativeCommand(mock, 'fixture-creator-not-private-undo');
  assert.equal(((await harness.request('/api/alpha/creator', { kind: 'execute', command: handoff })).response as { ok: boolean }).ok, true);
  const current = await mock.current(), before = canonicalJson(current), counts = mock.diagnostics();
  const commands = [
    { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: 'fixture-private-owner', expectedRevision: current.revision,
      changes: [{ field: 'creatorWorkspace', present: true, value: current.space.creatorWorkspace }] },
    { schema: 'flowme-alpha-command/1', kind: 'undo-private', requestId: 'fixture-wrong-undo', expectedRevision: current.revision,
      operationId: handoff.requestId },
  ];
  for (const command of commands)
    assert.deepEqual((await harness.request('/api/alpha/account', { kind: 'execute', command })).response, { ok: false, reason: 'invalid' });
  assert.equal(canonicalJson(await mock.current()), before); assert.deepEqual(mock.diagnostics(), counts); assert.equal(harness.fetches, 0);
});

test('JF10 nonexact known API/RPC requests are denied before the broader underlay, even with a valid command', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page, { creatorExecution: true });
  const initial = await mock.current(), before = canonicalJson(initial), documentId = initial.space.text.documents[0].id;
  const text = M.editText(initial.space.text, documentId, `${M.raw(M.getDocument(initial.space.text, documentId))}\n금지 query 시험`);
  const command = { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: 'fixture-nonexact-private',
    expectedRevision: initial.revision, changes: [{ field: 'text', present: true, value: text }] };
  for (const [path, body, method, origin] of [
    ['/api/alpha/account?extra=1', { kind: 'execute', command }, 'POST', RELEASE_ORIGIN],
    ['/api/alpha/account', { kind: 'execute', command }, 'PUT', RELEASE_ORIGIN],
    ['/api/alpha/account', { kind: 'execute', command }, 'POST', 'https://test:invalid@alpha.wikiplans.com'],
    ['/rest/v1/rpc/flowme_alpha_social_read_v1?extra=1', {}, 'POST', 'https://wkmzcxpnojobxrgebapw.supabase.co'],
    ['/rest/v1/rpc/flowme_alpha_social_read_v1', {}, 'GET', 'https://wkmzcxpnojobxrgebapw.supabase.co'],
  ] as const) assert.deepEqual((await harness.request(path, body, method, origin)).response, { ok: false, reason: 'invalid' });
  assert.equal(canonicalJson(await mock.current()), before);
  assert.deepEqual(mock.diagnostics(), { mutations: 0, operations: 0 }); assert.equal(harness.fetches, 0);
});

test('JF11 public copy uses the narrow schedule intent; generic copies writes are denied and semantic Undo preserves source identity', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page, { creatorExecution: true, catalog: true });
  const initial = await mock.current(), publicBefore = canonicalJson(mock.context.public);
  const command = { schema: 'flowme-alpha-social-command/1', kind: 'social', requestId: 'fixture-public-copy', expectedRevision: initial.revision,
    expectedPublicRevision: mock.context.revision, intent: { type: 'copy-import', versionId: publicIds.version,
      itemIds: [publicIds.item], anchor: null } };
  assert.equal(((await harness.request('/api/alpha/social', { kind: 'execute', command })).response as { ok: boolean }).ok, true);
  const imported = await mock.current(), source = canonicalJson(journeyCopySourceIdentity(imported.space.copies));
  const copy = imported.space.copies[0], taskId = copy.itemLines[publicIds.item];
  assert(M.tasks(imported.space.text).some(task => task.id === taskId && task.docId === copy.documentId && task.isCanonical));
  for (const [index, date] of ['2026-10-01', null].entries()) {
    const account = await mock.current(), references = alphaSocialReferences(mock.context, account.ownerId);
    const data = materializeAccount(account, references).data;
    const result = updateProgramTask(data, { actorId: account.ownerId, requestId: `fixture-date-${index}`,
      expectedSpace: account.space, taskId, patch: { date } }); assert(result.ok);
    const edit = { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: `fixture-date-${index}`, expectedRevision: account.revision,
      changes: privateChanges(account.space, result.data.spaces[account.ownerId]) };
    const countsBefore = mock.diagnostics(), accountBefore = canonicalJson(account);
    assert.deepEqual((await harness.request('/api/alpha/account', { kind: 'execute', command: edit })).response, { ok: false, reason: 'invalid' });
    assert.equal(canonicalJson(await mock.current()), accountBefore); assert.deepEqual(mock.diagnostics(), countsBefore);
    const schedule = { schema: 'flowme-alpha-social-command/1', kind: 'social', requestId: `fixture-social-date-${index}`,
      expectedRevision: account.revision, expectedPublicRevision: mock.context.revision,
      intent: { type: 'private-task-schedule', copyId: copy.id, itemId: publicIds.item, taskId, date, time: '' } };
    assert.equal(((await harness.request('/api/alpha/social', { kind: 'execute', command: schedule })).response as { ok: boolean }).ok, true);
    const saved = await mock.current();
    assert.equal(saved.space.copies[0].itemOverrides[publicIds.item].date, date);
    assert.equal(canonicalJson(journeyCopySourceIdentity(saved.space.copies)), source);
    assert.equal(canonicalJson(mock.context.public), publicBefore);
  }
  const beforeUndo = await mock.current();
  const undo = { schema: 'flowme-alpha-social-command/1', kind: 'undo-social', requestId: 'fixture-social-date-undo',
    expectedRevision: beforeUndo.revision, expectedPublicRevision: mock.context.revision, operationId: 'fixture-social-date-1' };
  assert.equal(((await harness.request('/api/alpha/social', { kind: 'execute', command: undo })).response as { ok: boolean }).ok, true);
  assert.equal(M.tasks((await mock.current()).space.text).find(task => task.id === taskId)?.date, '2026-10-01');
  const beforeRedo = await mock.current();
  const redo = { ...undo, requestId: 'fixture-social-date-redo', expectedRevision: beforeRedo.revision, operationId: undo.requestId };
  assert.equal(((await harness.request('/api/alpha/social', { kind: 'execute', command: redo })).response as { ok: boolean }).ok, true);
  assert.equal(M.tasks((await mock.current()).space.text).find(task => task.id === taskId)?.date, null);
  assert.equal(canonicalJson(journeyCopySourceIdentity((await mock.current()).space.copies)), source);
  assert.equal(canonicalJson(mock.context.public), publicBefore);
  const current = await mock.current(), before = canonicalJson(current), counts = mock.diagnostics();
  const copies = structuredClone(current.space.copies); copies[0].baseVersionId = 'foreign-source-version';
  const invalid = { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: 'fixture-copy-source-tamper', expectedRevision: current.revision,
    changes: [{ field: 'copies', present: true, value: copies }] };
  assert.deepEqual((await harness.request('/api/alpha/account', { kind: 'execute', command: invalid })).response, { ok: false, reason: 'invalid' });
  assert.equal(canonicalJson(await mock.current()), before); assert.deepEqual(mock.diagnostics(), counts); assert.equal(harness.fetches, 0);
});

test('JM01 matrix selection preserves full 20 and explicit smoke/subset cardinalities', () => {
  for (const [input, expected] of [[{}, 20], [{ single: '1' }, 4], [{ selected: 'native-direct-return' }, 5],
    [{ single: '1', selected: 'native-direct-return' }, 1]] as const) {
    const selection = selectJourneyScenarios(input);
    const results = selection.viewports.flatMap(([width, height]) => selection.cases.map(name => ({ name, width, height })));
    assert.equal(results.length, expected); assert.doesNotThrow(() => assertJourneyMatrixComplete(selection, results));
  }
});

test('JF13 explicit schedule receipt barrier commits the exact transaction before acknowledgment and is released once', async () => {
  const harness = routeHarness(), mock = await mockFolderContentEntry(harness.page,
    { creatorExecution: true, catalog: true, holdFirstPrivateScheduleReceipt: true });
  const initial = await mock.current();
  const imported = { schema: 'flowme-alpha-social-command/1', kind: 'social', requestId: 'fixture-barrier-copy',
    expectedRevision: initial.revision, expectedPublicRevision: mock.context.revision,
    intent: { type: 'copy-import', versionId: publicIds.version, itemIds: [publicIds.item], anchor: null } };
  assert.equal(((await harness.request('/api/alpha/social', { kind: 'execute', command: imported })).response as { ok: boolean }).ok, true);
  const account = await mock.current(), copy = account.space.copies[0], taskId = copy.itemLines[publicIds.item];
  const schedule = { ...imported, requestId: 'fixture-barrier-schedule', expectedRevision: account.revision,
    intent: { type: 'private-task-schedule', copyId: copy.id, itemId: publicIds.item, taskId, date: '2026-10-01', time: '10:00' } };
  let settled = false;
  const response = harness.request('/api/alpha/social', { kind: 'execute', command: schedule }).then(value => { settled = true; return value; });
  for (let turn = 0; turn < 100 && !mock.isPrivateScheduleReceiptHeld(); turn++) await Promise.resolve();
  assert.equal(mock.isPrivateScheduleReceiptHeld(), true); assert.equal(settled, false);
  const saved = await mock.current(), counts = mock.diagnostics();
  assert.equal(M.tasks(saved.space.text).find(task => task.id === taskId)?.time, '10:00');
  assert.equal(saved.revision, account.revision + 1);
  mock.releaseHeldPrivateScheduleReceipt(); assert.equal(((await response).response as { ok: boolean }).ok, true);
  assert.equal(mock.isPrivateScheduleReceiptHeld(), false);
  mock.releaseHeldPrivateScheduleReceipt();
  assert.equal(canonicalJson(await mock.current()), canonicalJson(saved)); assert.deepEqual(mock.diagnostics(), counts);
  assert.equal(harness.fetches, 0);
});

test('JM02 typos, blank cases and unsupported single options reject before browser creation', () => {
  for (const selected of ['', 'native-direct-return-typo', 'raw', 'all'])
    assert.throws(() => selectJourneyScenarios({ selected }), /journey-case-option-rejected/);
  for (const single of ['', '0', 'true', '2'])
    assert.throws(() => selectJourneyScenarios({ single }), /journey-single-option-rejected/);
});

test('JM03 zero, incomplete, duplicate or foreign results can never be reported as a completed matrix', () => {
  const selection = selectJourneyScenarios({});
  const results = selection.viewports.flatMap(([width, height]) => selection.cases.map(name => ({ name, width, height })));
  for (const invalid of [[], results.slice(1), [...results.slice(1), results[1]],
    [...results.slice(1), { name: 'unrecognized', width: 390, height: 844 }]])
    assert.throws(() => assertJourneyMatrixComplete(selection, invalid), /journey-matrix-incomplete/);
  assert.throws(() => assertJourneyMatrixComplete({ cases: [], viewports: [] }, []), /journey-matrix-incomplete/);
});
