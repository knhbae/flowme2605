import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlphaCreatorCommandHandler, ALPHA_CREATOR_COMMIT_SCHEMA } from './creator-command-handler';
import { signAlphaCommand, createAlphaCommandHandler } from './command-handler';
import { ALPHA_CREATOR_COMMAND_SCHEMA, type AlphaCreatorCommand } from '../alpha-creator/contract';
import { ALPHA_SCHEMA, type AlphaAccount, type AlphaCreatorUndoCommand } from '../alpha-persistence/contract';
import { PROGRAM_SCHEMA } from '../contract';
import { createProgramPrivateSpace } from '../program-data';
import { canonicalJson } from '../alpha-persistence/json';
import { createProgramCreatorWorkspace } from '../creator-workspace';
import { createTextAuthoringDocument } from '../native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner, updateNativeCreatorRecordUi } from '../native-creator-document';

const owner = '11111111-1111-4111-8111-111111111111', key = 'ab'.repeat(32), token = 'fixture-only-no-real-secret-token';
const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'development', FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co', FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback', FLOWME_ALPHA_M3_SIGNING_KEY: key };
function fixture() {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] };
  const command: AlphaCreatorCommand = { schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'creator', requestId: 'creator-request', expectedRevision: 0,
    intent: { type: 'working', now: '2026-09-21T00:00:00.000Z', working: { draftId: 'draft-one', title: '제작 초안', rawText: '# 첫 초안', baseRecordRevision: null } } };
  const state = { account, userId: owner, expired: false, anonymous: false, loseCommit: false, malformed: false, receipt: null as unknown };
  const calls: { path: string; body: any; authorization: string | null }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname, body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, body, authorization: new Headers(init?.headers).get('authorization') });
    if (path === '/auth/v1/user') return Response.json({ id: state.userId, is_anonymous: state.anonymous }, { status: state.expired ? 401 : 200 });
    if (path === '/rest/v1/flowme_alpha_accounts') return Response.json([{ account: state.account }]);
    if (path.endsWith('lookup_v1')) return Response.json({ ok: true, value: state.receipt });
    assert.equal(path, '/rest/v1/rpc/flowme_alpha_creator_execute_v1');
    assert.equal(body.proof, signAlphaCommand(owner, body.commit_text, key));
    if (state.loseCommit) throw Error('simulated response loss');
    const commit = JSON.parse(body.commit_text);
    const receipt = { requestId: commit.command.requestId, revision: commit.command.expectedRevision + 1, changed: true, kind: commit.command.kind,
      ...(commit.command.kind === 'creator' ? { resultId: commit.resultId ?? 'first-confirmed-id' } : {}), ...(state.malformed ? { unexpected: true } : {}) };
    return Response.json({ ok: true, value: receipt });
  };
  const request = (value: unknown, options?: { url?: string; origin?: string; authorization?: string }) => new Request(options?.url ?? 'http://localhost:3104/api/alpha/creator', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: options?.origin ?? 'http://localhost:3104', Authorization: options?.authorization ?? `Bearer ${token}` }, body: JSON.stringify(value),
  });
  return { state, calls, fetcher, request, command, handler: createAlphaCreatorCommandHandler(env, fetcher) };
}

test('creator capacity rejection is explicit and never reaches signing writer RPC', async () => {
  const f=fixture(),now=f.command.intent.now;
  const document=JSON.parse(JSON.stringify(createTextAuthoringDocument('# Fixture\n- [ ] task',{documentId:'capacity-source',ownership:'creator',now})));
  const source={storageKey:'flow:text-authoring:drafts:v1' as const,draftId:'capacity-source',versionId:'fixture',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)};
  const initial=createNativeCreatorDocumentOwner({id:'capacity-draft',source},now);assert(initial.ok);let native=initial.owner;
  for(let i=0;i<128;i++){const next=updateNativeCreatorRecordUi(native,{expectedOwner:native,requestId:`capacity-${i}`,recordUi:{activeStage:i%2?'input':'structure'}},now);assert(next.ok&&next.changed);native=next.owner;}
  const workspace=createProgramCreatorWorkspace(now);
  workspace.working={draftId:'capacity-draft',title:document.title,rawText:document.rawText,baseRecordRevision:null,nativeDocument:native,nativeSelection:source};
  f.state.account.space.creatorWorkspace=workspace;const before=canonicalJson(f.state.account);
  const command:AlphaCreatorCommand={...f.command,intent:{type:'native-operation',draftId:'capacity-draft',operation:{type:'rename',itemId:document.parseResult.canonical.items[0].itemId,title:'Changed'},now}};
  assert.deepEqual(await (await f.handler(f.request({kind:'execute',command}))).json(),{ok:false,reason:'limit'});
  assert.equal(canonicalJson(f.state.account),before);assert(f.calls.every(c=>!c.path.endsWith('creator_execute_v1')));
});
test('creator intent compiles and signs exact full-domain change with fixed owner token and private result ID', async () => {
  const f = fixture(), response = await f.handler(f.request({ kind: 'execute', command: f.command })), value = await response.json();
  assert.equal(value.ok, true); assert.equal(value.value.resultId, 'draft-one'); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(f.calls.map(call => call.path), ['/auth/v1/user', '/rest/v1/flowme_alpha_accounts', '/rest/v1/rpc/flowme_alpha_creator_execute_v1']);
  assert(f.calls.every(call => call.authorization === `Bearer ${token}`));
  const commit = JSON.parse(f.calls.at(-1)!.body.commit_text);
  assert.equal(commit.schema, ALPHA_CREATOR_COMMIT_SCHEMA); assert.deepEqual(commit.command, f.command);
  assert.deepEqual(commit.changes.map((change: any) => change.field), ['creatorWorkspace']);
  assert.equal(commit.changes[0].value.working.rawText, '# 첫 초안'); assert.equal(f.state.account.space.creatorWorkspace, undefined);
  assert(!JSON.stringify(value).includes(key)); assert(!JSON.stringify(value).includes('commit_text'));
});

test('creator endpoint rejects field patches, owner overrides, unknown intent and malformed nested working before signing', async () => {
  for (const corrupt of [
    (c: any) => { c.ownerId = owner; },
    (c: any) => { c.changes = [{ field: 'creatorWorkspace', present: true, value: {} }]; },
    (c: any) => { c.intent.type = 'publish'; },
    (c: any) => { c.intent.working.draftId = 'constructor'; },
    (c: any) => { c.intent.working.nativeDocument = { source: 'forged' }; },
    (c: any) => { c.schema = 'flowme-alpha-command/1'; },
  ]) {
    const f = fixture(), command = structuredClone(f.command); corrupt(command);
    assert.equal((await (await f.handler(f.request({ kind: 'execute', command }))).json()).reason, 'invalid');
    assert(f.calls.every(call => !call.path.endsWith('creator_execute_v1')));
  }
});

test('unchanged intent is no-change; future revision does not reach writer', async () => {
  const f = fixture(), empty: AlphaCreatorCommand = { ...f.command, intent: { type: 'working', now: f.command.intent.now, working: null } };
  assert.equal((await (await f.handler(f.request({ kind: 'execute', command: empty }))).json()).reason, 'no-change');
  assert.equal((await (await f.handler(f.request({ kind: 'execute', command: { ...f.command, expectedRevision: 1 } }))).json()).reason, 'revision-conflict');
  assert(f.calls.every(call => !call.path.endsWith('creator_execute_v1')));
});

test('stale retry retains exact original intent and returns first result without recomputing a patch', async () => {
  const f = fixture(); f.state.account.revision = 3;
  const value = await (await f.handler(f.request({ kind: 'execute', command: f.command }))).json();
  assert.equal(value.value.resultId, 'first-confirmed-id');
  const commit = JSON.parse(f.calls.at(-1)!.body.commit_text);
  assert.equal(canonicalJson(commit.command), canonicalJson(f.command)); assert.deepEqual(commit.changes, []); assert.equal(commit.resultId, null);
  assert.equal(f.state.account.space.creatorWorkspace, undefined);
});

test('creator undo and redo submit ledger operation IDs with no client-authored inverse', async () => {
  for (const operationId of ['creator-request', 'creator-undo-request']) {
    const f = fixture(); f.state.account.revision = 2;
    const undo: AlphaCreatorUndoCommand = { schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'undo-creator', requestId: 'undo-or-redo', expectedRevision: 2, operationId };
    const value = await (await f.handler(f.request({ kind: 'execute', command: undo }))).json();
    assert.equal(value.ok, true); assert.equal(value.value.kind, 'undo-creator'); assert.equal(value.value.resultId, undefined);
    const commit = JSON.parse(f.calls.at(-1)!.body.commit_text);
    assert.deepEqual(commit.command, undo); assert.deepEqual(commit.changes, []); assert.equal(commit.resultId, null);
    assert.equal((await (await f.handler(f.request({ kind: 'execute', command: { ...undo, changes: [] } }))).json()).reason, 'invalid');
  }
});

test('creator receipt lookup shares M3 ledger and M3 write endpoint refuses new command schema', async () => {
  const f = fixture(); f.state.receipt = { requestId: f.command.requestId, kind: 'creator', revision: 1, changed: true, resultId: 'first-confirmed-id' };
  for (const handler of [f.handler, createAlphaCommandHandler(env, f.fetcher)]) {
    assert.deepEqual((await (await handler(f.request({ kind: 'lookup', requestId: f.command.requestId }))).json()).value, f.state.receipt);
  }
  f.calls.length = 0;
  assert.equal((await (await createAlphaCommandHandler(env, f.fetcher)(f.request({ kind: 'execute', command: f.command }))).json()).reason, 'invalid');
  assert.equal(f.calls.length, 0);
});

test('foreign account, revoked auth, cross origin and production config fail closed', async () => {
  for (const mutation of [(f: ReturnType<typeof fixture>) => { f.state.expired = true; },
    (f: ReturnType<typeof fixture>) => { f.state.anonymous = true; }, (f: ReturnType<typeof fixture>) => { f.state.userId = '22222222-2222-4222-8222-222222222222'; }]) {
    const f = fixture(); mutation(f); assert.equal((await (await f.handler(f.request({ kind: 'execute', command: f.command }))).json()).ok, false);
    assert(f.calls.every(call => !call.path.endsWith('creator_execute_v1')));
  }
  const f = fixture();
  for (const options of [{ origin: 'https://attacker.invalid' }, { url: 'http://localhost:3104/api/alpha/creator?ownerId=foreign' }, { authorization: 'Bearer bad' }])
    assert.equal((await (await f.handler(f.request({ kind: 'execute', command: f.command }, options))).json()).ok, false);
  for (const config of [{ ...env, VERCEL_ENV: 'production' }, { ...env, FLOWME_ALPHA_M3_SIGNING_KEY: '' }, { ...env, FLOWME_ALPHA_PROJECT_REF: 'ldellkztijrijbpwthjl' }])
    assert.equal((await createAlphaCreatorCommandHandler(config, f.fetcher)(f.request({ kind: 'execute', command: f.command }))).status, 503);
  assert.equal(f.calls.length, 0);
});

test('response loss and malformed success retain uncertainty instead of manufacturing a successful result', async () => {
  const f = fixture(); f.state.loseCommit = true;
  assert.equal((await (await f.handler(f.request({ kind: 'execute', command: f.command }))).json()).reason, 'unavailable');
  f.state.loseCommit = false; f.state.malformed = true;
  assert.equal((await (await f.handler(f.request({ kind: 'execute', command: f.command }))).json()).reason, 'unavailable');
});

test('oversized streaming request cannot bypass the byte bound through a false Content-Length', async () => {
  const f = fixture(); let sent = 0;
  const request = new Request('http://localhost:3104/api/alpha/creator', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Content-Length': '2' },
    body: new ReadableStream({ pull(controller) { if (++sent <= 31) controller.enqueue(new Uint8Array(1_000_000)); else controller.close(); } }), duplex: 'half' } as RequestInit);
  assert.equal((await f.handler(request)).status, 400); assert.equal(f.calls.length, 0);
});
