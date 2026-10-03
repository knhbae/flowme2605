/** Pure full-domain parity probes. Auth, REST and RPC below are fake transport;
 * these tests do NOT prove live database permissions, migration or actual users. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlphaHeldMovingFixture, createAlphaSyntheticFixtures, type AlphaSyntheticFixture } from '../alpha-persistence/synthetic-fixtures';
import { captureAlphaAccount, commandFromProgramTransition, materializeAccount } from '../alpha-persistence/program-adapter';
import type { AlphaAccount, AlphaCommand } from '../alpha-persistence/contract';
import { canonicalJson } from '../alpha-persistence/json';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { createAlphaCommandHandler, signAlphaCommand } from './command-handler';
import { addProgramQuickTask, completeProgramTask, createProgramDocument, createProgramFolder, recordProgramTaskProgress, setProgramDocumentFolder, updateProgramTask } from '../private-space';
import { textWorkspaceModel as M } from '../text-workspace';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from '../recurrence-state';
import { programOrderedExecutionRows, reorderProgramExecutionTimeline } from '../recurrence-order';
import { programResult, type ProgramData, type ProgramTransition } from '../contract';
import { applyProgramLegacyAction, prepareProgramLegacyView } from '../legacy-transaction';
import { programLegacyTaskQualityHold } from '../legacy-map-review';
import { createAlphaFakeServer } from '../alpha-persistence/fake-server';
import { createProgramPrivateSpace } from '../program-data';

const owner = '11111111-1111-4111-8111-111111111111', key = 'ab'.repeat(32), NOW = '2026-09-21T02:00:00.000Z';
const refs = { actorIds: [owner], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
const fixtures = createAlphaSyntheticFixtures();
const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'development', FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co', FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback', FLOWME_ALPHA_M3_SIGNING_KEY: key };
function accountFrom(name: string) {
  const fixture = fixtures.find(row => row.name === name); assert(fixture, name);
  return accountFromFixture(fixture);
}
function accountFromFixture(fixture: AlphaSyntheticFixture) {
  const { account } = captureAlphaAccount(fixture.envelope, fixture.actorId, owner);
  // Explicit synthetic identity binding, not an approved live import/migration.
  account.source.actorId = owner;
  account.legacyReceipts = account.legacyReceipts.map(row => ({ ...row, actorId: owner }));
  assert.equal(isAccountForOwner(account, owner), true, `${fixture.name}: owner-bound full validator`);
  return account;
}
function heldExecutionAccount() {
  const account = accountFromFixture(createAlphaHeldMovingFixture()), space = account.space, raw = space.legacySnapshot!.raw;
  // Explicit pre-hold checkbox/history reconstruction with actual saved IDs;
  // this is not a user's profile or a mutation of the factory source snapshot.
  const binding = space.savedBindings[0], taskId = Object.values(binding.itemLines)[0];
  const document = M.getDocument(space.text, binding.documentId); assert(document);
  const line = document.lines.find(row => row.id === taskId); assert(line);
  line.text = '- [ ] Synthetic previously saved held task';
  const childId = 'synthetic-held-old-subcheck';
  document.lines.splice(document.lines.indexOf(line) + 1, 0, { id: childId, text: '  - [ ] Synthetic previous subcheck' });
  for (const id of [taskId, childId]) { space.text.taskScopes[id] = binding.documentId; space.text.itemScopes[id] = binding.documentId; }
  space.text = M.recordProgress(space.text, taskId, '2026-09-20', 37);
  assert(isAccountForOwner(account, owner)); assert.equal(space.legacySnapshot!.raw, raw);
  return { account, taskId, childId, documentId: binding.documentId };
}
function harness(initial: AlphaAccount) {
  let current = structuredClone(initial), serial = 0, writes = 0;
  const handler = createAlphaCommandHandler(env, (async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === '/auth/v1/user') return Response.json({ id: owner, is_anonymous: false });
    if (path === '/rest/v1/flowme_alpha_accounts') return Response.json([{ account: current }]);
    assert.equal(path, '/rest/v1/rpc/flowme_alpha_execute_v1');
    const body = JSON.parse(String(init?.body)); assert.equal(body.proof, signAlphaCommand(owner, body.command_text, key));
    const command = JSON.parse(body.command_text) as AlphaCommand; assert.equal(command.kind, 'change-private');
    if (command.kind === 'change-private') for (const change of command.changes) {
      if (change.present) Object.defineProperty(current.space, change.field, { value: structuredClone(change.value), enumerable: true, configurable: true, writable: true });
      else delete current.space[change.field];
    }
    current.revision++; writes++; assert(isAccountForOwner(current, owner));
    return Response.json({ ok: true, value: { requestId: command.requestId, revision: current.revision, changed: true, kind: command.kind } });
  }) as typeof fetch);
  const send = async (command: AlphaCommand) => (await handler(new Request('http://localhost:3104/api/alpha/account', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3104', Authorization: 'Bearer synthetic-token-not-an-actual-secret' },
    body: JSON.stringify({ kind: 'execute', command }),
  }))).json();
  return { account: () => structuredClone(current), data: () => materializeAccount(current, refs).data, writes: () => writes, send,
    async run(build: (data: ProgramData) => ProgramTransition<string>) {
      let result = '';
      const command = commandFromProgramTransition(current, refs, `parity-${++serial}`, data => { const transition = build(data); assert(transition.ok, transition.ok ? '' : transition.reason); result = transition.result; return transition; });
      assert.equal((await send(command)).ok, true); return result;
    } };
}
let domainId = 0;
const base = (data: ProgramData) => ({ actorId: owner, requestId: `domain-${++domainId}`, expectedSpace: data.spaces[owner] });

for (const origin of ['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan']) {
  test(`M3 pure server parity: saved origin ${origin} retains source and saved-copy identity after execution`, async () => {
    const h = harness(accountFrom('four-saved-origins-and-quick-item'));
    const before = h.account(), bindings = before.space.savedBindings;
    assert.equal(bindings.length, 4); assert.equal(new Set(bindings.map(row => row.flowRef)).size, 4);
    const binding = bindings.find(row => row.flowRef.includes(origin)); assert(binding, origin);
    const task = M.tasks(before.space.text).find(row => row.docId === binding.documentId); assert(task, `task:${origin}`);
    await h.run(data => completeProgramTask(data, { ...base(data), taskId: task.id, date: '2026-09-21', done: true }));
    assert.equal(M.tasks(h.account().space.text).find(row => row.id === task.id)?.done, true);
    assert.equal(canonicalJson(h.account().space.legacySnapshot), canonicalJson(before.space.legacySnapshot));
    assert.deepEqual(h.account().space.savedBindings, bindings);
  });
}
test('M3 pure server parity: actual structured Map preserves source factory snapshot during date change', async () => {
  const h = harness(accountFrom('actual-structured-map-factory')), before = h.account();
  const task = M.tasks(before.space.text)[0]; assert(task);
  await h.run(data => updateProgramTask(data, { ...base(data), taskId: task.id, patch: { date: '2026-10-05' } }));
  assert.equal(M.tasks(h.account().space.text).find(row => row.id === task.id)?.date, '2026-10-05');
  assert.equal(canonicalJson(h.account().space.legacySnapshot), canonicalJson(before.space.legacySnapshot));
  assert.deepEqual(h.account().space.savedBindings, before.space.savedBindings);
});
test('M3 pure server parity: actual held moving source remains exact and rejects new execution before fake write RPC', async () => {
  const fixture = createAlphaHeldMovingFixture(), sourceBefore = canonicalJson(fixture.envelope);
  const h = harness(accountFromFixture(fixture)), before = h.account(), data = h.data(), space = data.spaces[owner];
  assert.equal(before.space.legacySnapshot!.raw, fixture.envelope.data.spaces[fixture.actorId].legacySnapshot!.raw);
  assert.deepEqual(before.space.savedBindings, fixture.envelope.data.spaces[fixture.actorId].savedBindings);
  assert.equal(M.tasks(space.text).length, 0);
  const binding = space.savedBindings[0]; assert(binding);
  const [itemRef, taskId] = Object.entries(binding.itemLines)[0]; assert(itemRef && taskId);
  assert(programLegacyTaskQualityHold(space, taskId));
  for (const transition of [
    updateProgramTask(data, { ...base(data), taskId, patch: { date: '2026-10-05' } }),
    completeProgramTask(data, { ...base(data), taskId, date: '2026-09-21', done: true }),
  ]) {
    assert(!transition.ok); assert.equal(transition.reason, 'unresolved'); assert.equal(transition.data, data);
  }
  assert.throws(() => commandFromProgramTransition(before, refs, 'held-moving-builder', current =>
    updateProgramTask(current, { ...base(current), taskId, patch: { date: '2026-10-05' } })), /alpha-domain-unresolved/);
  const view = prepareProgramLegacyView(data, { actorId: owner, now: NOW, onlyFlowRef: binding.flowRef }); assert(view.ok);
  const completed = applyProgramLegacyAction(data, { actorId: owner, expectedToken: view.token, now: NOW, executionDate: '2026-09-21',
    action: { type: 'complete', itemRef, completed: true, now: NOW } });
  assert.equal(completed.transition.ok, false); assert.equal(completed.transition.data, data);
  const forged = structuredClone(before.space.text), document = M.getDocument(forged, binding.documentId); assert(document);
  const line = document.lines.find(row => row.id === taskId); assert(line);
  line.text = '- [ ] Synthetic held-source execution attempt';
  forged.taskScopes[taskId] = binding.documentId; forged.itemScopes[taskId] = binding.documentId;
  assert(M.validate(forged)); assert(M.tasks(forged).some(task => task.id === taskId));
  const response = await h.send({ schema: 'flowme-alpha-command/1', requestId: 'held-moving-execution', expectedRevision: before.revision,
    kind: 'change-private', changes: [{ field: 'text', present: true, value: forged }] });
  assert.equal(response.reason, 'invalid'); assert.equal(h.writes(), 0);
  assert.deepEqual(h.account(), before); assert.deepEqual(data.spaces[owner], before.space);
  assert.equal(canonicalJson(fixture.envelope), sourceBefore);
});
for (const field of ['text', 'subcheck', 'progress', 'scope'] as const) test(`M3 pure server parity: retained held ${field} mutation never reaches fake write RPC`, async () => {
  const f = heldExecutionAccount(), h = harness(f.account), before = h.account();
  let text = structuredClone(before.space.text);
  const document = M.getDocument(text, f.documentId); assert(document);
  if (field === 'text') document.lines.find(line => line.id === f.taskId)!.text += ' changed';
  if (field === 'subcheck') document.lines.find(line => line.id === f.childId)!.text = '  - [x] Synthetic previous subcheck';
  if (field === 'progress') text = M.recordProgress(text, f.taskId, '2026-09-21', 100);
  if (field === 'scope') { text.taskScopes[f.taskId] = 'folder-unfiled'; text.itemScopes[f.taskId] = 'folder-unfiled'; }
  assert(isAccountForOwner({ ...before, space: { ...before.space, text } }, owner));
  assert.notEqual(canonicalJson(text), canonicalJson(before.space.text));
  const response = await h.send({ schema: 'flowme-alpha-command/1', requestId: `held-${field}`, expectedRevision: before.revision,
    kind: 'change-private', changes: [{ field: 'text', present: true, value: text }] });
  assert.equal(response.reason, 'invalid'); assert.equal(h.writes(), 0);
  assert.deepEqual(h.account(), before);
  assert.deepEqual(M.progressHistory(h.account().space.text, f.taskId), [{ date: '2026-09-20', percent: 37 }]);
});
test('M3 pure server parity: unchanged held account remains valid and performs no fake write RPC', async () => {
  const h = harness(heldExecutionAccount().account), before = h.account();
  const response = await h.send({ schema: 'flowme-alpha-command/1', requestId: 'held-unchanged', expectedRevision: before.revision, kind: 'change-private', changes: [] });
  assert.equal(response.reason, 'no-change'); assert.equal(h.writes(), 0); assert.deepEqual(h.account(), before);
});
test('M3 pure server parity: held source does not block editing an unrelated private document', async () => {
  const h = harness(heldExecutionAccount().account), before = h.account();
  const documentId = await h.run(data => createProgramDocument(data, { ...base(data), title: 'Unrelated private document', raw: 'Original private memo' }));
  await h.run(data => {
    const next = structuredClone(data); next.spaces[owner].text = M.editText(next.spaces[owner].text, documentId, 'Edited private memo');
    return programResult(data, next, documentId);
  });
  assert.equal(M.raw(M.getDocument(h.account().space.text, documentId)), 'Edited private memo');
  for (const binding of before.space.savedBindings) assert.deepEqual(M.getDocument(h.account().space.text, binding.documentId), M.getDocument(before.space.text, binding.documentId));
  assert.deepEqual(h.account().space.legacySnapshot, before.space.legacySnapshot); assert.equal(h.writes(), 2);
});
test('M3 pure server parity: complete held saved-copy removal does not become a retention requirement', async () => {
  const h = harness(heldExecutionAccount().account), before = h.account(), empty = createProgramPrivateSpace();
  const response = await h.send({ schema: 'flowme-alpha-command/1', requestId: 'remove-held-copy', expectedRevision: before.revision,
    kind: 'change-private', changes: [{ field: 'text', present: true, value: empty.text }, { field: 'savedBindings', present: true, value: [] }, { field: 'position', present: true, value: empty.position }] });
  assert.equal(response.ok, true); assert.equal(h.writes(), 1);
  assert.equal(h.account().space.savedBindings.length, 0); assert.equal(h.account().space.text.documents.length, 0);
  assert.deepEqual(h.account().space.legacySnapshot, before.space.legacySnapshot);
});
test('M3 pure server parity: old held-account receipt replay and stale/future CAS do not apply forged latest text', async () => {
  const initial = heldExecutionAccount().account, server = createAlphaFakeServer([{ account: initial, references: refs }]);
  const port = server.connect(server.issueSession(owner)); let rpcCalls = 0;
  const handler = createAlphaCommandHandler(env, (async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === '/auth/v1/user') return Response.json({ id: owner, is_anonymous: false });
    if (path === '/rest/v1/flowme_alpha_accounts') { const read = await port.read(); assert(read.ok); return Response.json([{ account: read.value }]); }
    assert.equal(path, '/rest/v1/rpc/flowme_alpha_execute_v1'); rpcCalls++;
    const body = JSON.parse(String(init?.body)); assert.equal(body.proof, signAlphaCommand(owner, body.command_text, key));
    return Response.json(await port.execute(JSON.parse(body.command_text)));
  }) as typeof fetch);
  const send = async (command: AlphaCommand) => (await handler(new Request('http://localhost:3104/api/alpha/account', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3104', Authorization: 'Bearer synthetic-token-not-an-actual-secret' },
    body: JSON.stringify({ kind: 'execute', command }),
  }))).json();
  const command = commandFromProgramTransition(initial, refs, 'held-receipt-private-edit', data => createProgramDocument(data, { ...base(data), title: 'Unrelated receipt document' }));
  const first = await send(command); assert.equal(first.ok, true);
  const current = await port.read(); assert(current.ok);
  const baseline = canonicalJson(current.value), replay = await send(command);
  assert.deepEqual(replay, first); assert.equal(server.diagnostics().mutations, 1);
  const text = structuredClone(current.value.space.text), binding = current.value.space.savedBindings[0], taskId = Object.values(binding.itemLines)[0];
  M.getDocument(text, binding.documentId)!.lines.find(line => line.id === taskId)!.text += ' forged stale change';
  const stale: AlphaCommand = { schema: 'flowme-alpha-command/1', requestId: 'held-stale-change', expectedRevision: 0, kind: 'change-private', changes: [{ field: 'text', present: true, value: text }] };
  assert.equal((await send(stale)).reason, 'revision-conflict');
  assert.equal((await send({ ...stale, requestId: command.requestId })).reason, 'idempotency-conflict');
  const priorCalls = rpcCalls;
  assert.equal((await send({ ...stale, requestId: 'held-future-change', expectedRevision: current.value.revision + 1 })).reason, 'revision-conflict');
  assert.equal(rpcCalls, priorCalls); assert.equal(server.diagnostics().mutations, 1);
  const after = await port.read(); assert(after.ok); assert.equal(canonicalJson(after.value), baseline);
  assert.deepEqual(after.value.space.legacySnapshot, initial.space.legacySnapshot);
});
test('M3 pure server parity: recurring completion and execution date preserve recurrence source', async () => {
  const h = harness(accountFrom('recurring-occurrence-records')), before = h.account();
  const flowRef = before.space.savedBindings[0].flowRef;
  const read = readProgramExecutionOccurrences(h.data(), { actorId: owner, flowRef, localToday: '2026-09-21' }); assert(read.ok);
  const row = read.rows.find(entry => !entry.stored); assert(row);
  await h.run(data => updateProgramOccurrenceExecution(data, { actorId: owner, flowRef, localToday: '2026-09-21', identity: row.identity, expected: null,
    changes: { completion: { status: 'completed', completedAt: NOW }, schedule: { mode: 'fixed_date', date: '2026-10-07' } } }));
  assert.equal(canonicalJson(h.account().space.legacySnapshot), canonicalJson(before.space.legacySnapshot));
  assert.equal(canonicalJson(h.account().space.text), canonicalJson(before.space.text));
  assert.notDeepEqual(h.account().space.recurrenceExecution, before.space.recurrenceExecution);
});
test('M3 pure server parity: cumulative progress, folder, QuickItem date and timeline order', async () => {
  const h = harness(accountFrom('independent-documents-reference-progress-undo'));
  const initial = h.account(), originals = initial.space.text.progressRecords;
  const documentId = await h.run(data => createProgramDocument(data, { ...base(data), title: 'Parity quick items' }));
  const folderId = await h.run(data => createProgramFolder(data, { ...base(data), title: 'Parity folder' }));
  await h.run(data => setProgramDocumentFolder(data, { ...base(data), documentId, folderId }));
  const first = await h.run(data => addProgramQuickTask(data, { ...base(data), documentId, title: 'First', date: '2026-09-25' }));
  const second = await h.run(data => addProgramQuickTask(data, { ...base(data), documentId, title: 'Second', date: '2026-09-25' }));
  await h.run(data => recordProgramTaskProgress(data, { ...base(data), taskId: first, date: '2026-09-25', percent: 45 }));
  await h.run(data => updateProgramTask(data, { ...base(data), taskId: second, patch: { date: '2026-09-26' } }));
  await h.run(data => updateProgramTask(data, { ...base(data), taskId: second, patch: { date: '2026-09-25' } }));
  const query = { period: 'today' as const, date: '2026-09-25', today: '2026-09-25' };
  const rows = programOrderedExecutionRows(h.data(), query).rows; assert.equal(rows.length, 2);
  await h.run(data => reorderProgramExecutionTimeline(data, { actorId: owner, query, targetKey: rows[1].key, beforeKey: rows[0].key,
    expectedKeys: rows.map(row => row.key), expectedOrder: null }));
  assert.equal(programOrderedExecutionRows(h.data(), query).rows[0].key, rows[1].key);
  assert.deepEqual(h.account().space.text.progressRecords.filter(row => row.taskId !== first), originals);
  assert.equal(M.getDocument(h.account().space.text, documentId)?.folderId, folderId);
});
test('M3 pure server parity: corrupt nested full model and immutable creator payload never reach fake write RPC', async () => {
  const h = harness(accountFrom('four-saved-origins-and-quick-item')), original = h.account();
  const malformed = structuredClone(original.space.text); malformed.documents[0].folderId = 'nonexistent-folder';
  for (const change of [{field:'text',present:true,value:malformed}, {field:'creatorWorkspace',present:true,value:{}}]) {
    const response = await h.send({schema:'flowme-alpha-command/1',requestId:`bad-${change.field}`,expectedRevision:0,kind:'change-private',changes:[change]} as AlphaCommand);
    assert.equal(response.reason,'invalid'); assert.equal(h.writes(),0);
  }
  assert.deepEqual(h.account(), original);
});
test('M3 pure server parity: valid-shaped source mutation is refused before write RPC', async () => {
  const h=harness(accountFrom('four-saved-origins-and-quick-item')), snapshot=structuredClone(h.account().space.legacySnapshot!);
  const raw=JSON.parse(snapshot.raw); raw.model.flows[0].items[0].description='forged source'; snapshot.raw=JSON.stringify(raw);
  const response=await h.send({schema:'flowme-alpha-command/1',requestId:'forged-source',expectedRevision:0,kind:'change-private',changes:[{field:'legacySnapshot',present:true,value:snapshot}]});
  assert.equal(response.reason,'invalid'); assert.equal(h.writes(),0);
});
test('M3 pure server parity: existing legacy completion transaction can update raw.state without rewriting source model', async () => {
  const h=harness(accountFrom('four-saved-origins-and-quick-item'));
  const before=h.account(), binding=before.space.savedBindings.find(row=>row.flowRef.includes('personal-draft'))!;
  const itemRef=Object.keys(binding.itemLines)[0];
  await h.run(data=>{
    const view=prepareProgramLegacyView(data,{actorId:owner,now:NOW,onlyFlowRef:binding.flowRef}); assert(view.ok);
    const result=applyProgramLegacyAction(data,{actorId:owner,expectedToken:view.token,now:NOW,executionDate:'2026-09-21',action:{type:'complete',itemRef,completed:true,now:NOW}});
    assert(result.transition.ok, JSON.stringify(result.issues)); return result.transition;
  });
  assert.deepEqual(JSON.parse(h.account().space.legacySnapshot!.raw).model,JSON.parse(before.space.legacySnapshot!.raw).model);
  assert.notEqual(h.account().space.legacySnapshot!.raw,before.space.legacySnapshot!.raw);
});
