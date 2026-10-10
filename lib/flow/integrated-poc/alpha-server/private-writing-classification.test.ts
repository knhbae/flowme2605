import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlphaCommandHandler, signAlphaCommand } from './command-handler';
import { ALPHA_SCHEMA, type AlphaAccount, type AlphaCommand } from '../alpha-persistence/contract';
import { PROGRAM_SCHEMA, programResult, type ProgramData, type ProgramTransition } from '../contract';
import { createProgramPrivateSpace } from '../program-data';
import { createProgramDocument, createProgramFolder, linkProgramTask, recordProgramTaskProgress, updateProgramTask } from '../private-space';
import { createProgramWritingEntry } from '../writing-entry';
import { setProgramTaskClassification } from '../task-classification';
import { textWorkspaceModel as M } from '../text-workspace';
import { createAlphaFakeServer } from '../alpha-persistence/fake-server';
import { canonicalJson } from '../alpha-persistence/json';
import { createAlphaMemoryRecovery } from '../alpha-persistence/local-recovery';
import { createAlphaSyncController } from '../alpha-sync/controller';
import { createAlphaHttpRepository } from '../alpha-sync/http-repository';
import { readAlphaAuthConfig } from '../alpha-auth/config';

// Entire transport, Auth response and durable CAS are in memory. No request is
// forwarded to a real service; this is not a real-login/server-save result.
const owner = '11111111-1111-4111-8111-111111111111', token = 'fictional-session-for-private-writing', key = 'ab'.repeat(32);
const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'development',
  FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw', FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co',
  FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture', FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback', FLOWME_ALPHA_M3_SIGNING_KEY: key };
function fixture() {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0,
    source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] };
  const references = { actorIds: [owner], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
  const server = createAlphaFakeServer([{ account, references }]), stored = server.connect(server.issueSession(owner));
  const calls: string[] = [], commands: AlphaCommand[] = []; let loseAck = false;
  const upstream: typeof fetch = async (url, init) => {
    const parsed = new URL(String(url)); assert.equal(parsed.origin, env.FLOWME_ALPHA_SUPABASE_URL);
    assert.equal(new Headers(init?.headers).get('authorization'), `Bearer ${token}`); calls.push(parsed.pathname);
    if (parsed.pathname === '/auth/v1/user') return Response.json({ id: owner, is_anonymous: false });
    if (parsed.pathname === '/rest/v1/flowme_alpha_accounts') {
      const read = await stored.read(); assert(read.ok); return Response.json([{ account: read.value }]);
    }
    const body = JSON.parse(String(init?.body));
    if (parsed.pathname.endsWith('lookup_v1')) return Response.json(await stored.lookup(body.request_id));
    assert.equal(parsed.pathname, '/rest/v1/rpc/flowme_alpha_execute_v1');
    assert.equal(body.proof, signAlphaCommand(owner, body.command_text, key));
    const command = JSON.parse(body.command_text); commands.push(command);
    const result = await stored.execute(command);
    if (loseAck) { loseAck = false; throw Error('fixture ACK loss'); }
    return Response.json(result);
  };
  const handler = createAlphaCommandHandler(env, upstream);
  const browser: typeof fetch = async (url, init) => String(url).startsWith('https:') ? upstream(url, init)
    : handler(new Request('http://localhost:3104/api/alpha/account', { ...init,
      headers: { ...Object.fromEntries(new Headers(init?.headers)), Origin: 'http://localhost:3104' } }));
  const config = readAlphaAuthConfig(env); assert(config);
  const repository = () => createAlphaHttpRepository(config, { userId: owner, accessToken: token }, browser);
  const recovery = createAlphaMemoryRecovery(); let seq = 0;
  const open = (reuseRecovery = false) => {
    const controller = createAlphaSyncController({ recovery: reuseRecovery ? recovery : createAlphaMemoryRecovery(), requestId: () => `writing-${++seq}` });
    controller.bindSession(owner, repository()); return controller;
  };
  const controller = createAlphaSyncController({ recovery, requestId: () => `writing-${++seq}` }); controller.bindSession(owner, repository());
  const base = (data: ProgramData) => ({ actorId: owner, requestId: `domain-${++seq}`, expectedSpace: data.spaces[owner] });
  const change = (build: (data: ProgramData) => ProgramTransition<string>) => controller.mutate('private writing', build);
  return { server, stored, calls, commands, controller, open, base, change, loseNextAck() { loseAck = true; } };
}
function writing(data: ProgramData, input: Parameters<typeof createProgramWritingEntry>[1], raw: string) {
  const created = createProgramWritingEntry(data, input); if (!created.ok) return created;
  const next = structuredClone(created.data); next.spaces[owner].text = M.editText(next.spaces[owner].text, created.result, raw);
  return programResult(data, next, created.result);
}
test('PWC01 writing/classification/date/progress/memo survive an empty new client without copies or schema changes', async () => {
  const f = fixture(); assert(await f.controller.refresh());
  const work = await f.change(data => createProgramFolder(data, { ...f.base(data), title: '업무' })); assert(work.ok);
  const life = await f.change(data => createProgramFolder(data, { ...f.base(data), title: '생활' })); assert(life.ok);
  const doc = await f.change(data => writing(data, f.base(data), '가상 업무·생활 메모\n- [ ] 회의 준비\n- [ ] 장보기')); assert(doc.ok);
  const initial = f.controller.snapshot().account!.space.text, [a, b] = M.tasks(initial);
  for (const [taskId, folderId] of [[a.id, work.result], [b.id, life.result]]) {
    assert((await f.change(data => setProgramTaskClassification(data, { ...f.base(data), taskId, folderId }))).ok);
    const command = f.commands.at(-1)!; assert(command.kind === 'change-private');
    assert.deepEqual(command.changes.map(row => row.field), ['text']);
  }
  const move = (date: string) => f.change(data => updateProgramTask(data, { ...f.base(data), taskId: a.id, patch: { date } }));
  assert((await move('2026-10-07')).ok); assert((await move('2026-10-08')).ok);
  assert((await f.change(data => recordProgramTaskProgress(data, { ...f.base(data), taskId: b.id, date: '2026-10-07', percent: 100 }))).ok);
  const memo = await f.change(data => createProgramDocument(data, { ...f.base(data), title: '가상 비교 메모', raw: '비교한 내용과 자료 위치' })); assert(memo.ok);
  assert((await f.change(data => linkProgramTask(data, { ...f.base(data), documentId: memo.result, taskId: a.id }))).ok);
  const count = f.server.diagnostics().mutations;
  assert((await f.change(data => linkProgramTask(data, { ...f.base(data), documentId: memo.result, taskId: a.id }))).ok);
  assert.equal(f.server.diagnostics().mutations, count);
  const confirmed = f.controller.snapshot().account!, reopened = f.open(); assert(await reopened.refresh());
  assert.equal(canonicalJson(reopened.snapshot().account), canonicalJson(confirmed));
  const text = reopened.snapshot().account!.space.text;
  assert.equal(text.documents.length, 2); assert.equal(confirmed.space.copies.length, 0);
  assert.deepEqual(M.tasks(text).map(task => task.id), [a.id, b.id]);
  assert.equal(text.taskScopes[a.id], work.result); assert.equal(text.taskScopes[b.id], life.result);
  assert.equal(M.tasks(text).find(task => task.id === a.id)!.date, '2026-10-08');
  assert.equal(M.latestProgress(text, b.id)!.percent, 100);
  assert.equal(text.bindings.filter(row => row.kind === 'task').length, 1);
  const before = canonicalJson(confirmed), binding = text.bindings.find(row => row.kind === 'task')!;
  assert((await f.change(data => {
    const next = structuredClone(data); next.spaces[owner].text = M.unlink(next.spaces[owner].text, binding.docId, binding.lineId);
    return programResult(data, next, memo.result);
  })).ok);
  const after = f.controller.snapshot().account!.space.text;
  assert.equal(after.bindings.length, 0); assert.equal(after.documents.length, 2);
  assert.match(M.raw(M.getDocument(after, memo.result)), /비교한 내용과 자료 위치/);
  assert.deepEqual(M.tasks(after), M.tasks(text)); assert.deepEqual(after.progressRecords, text.progressRecords);
  assert.notEqual(canonicalJson(f.controller.snapshot().account), before);
});
test('PWC02 failed save retains exact pending input and normal same-request retry commits once', async () => {
  const f = fixture(); assert(await f.controller.refresh()); f.server.failNextCommit();
  const raw = '가상 실패 후 보존 입력\n- [ ] 연락하기';
  assert(!(await f.change(data => writing(data, f.base(data), raw))).ok);
  const snapshot = f.controller.snapshot(); assert(snapshot.pending); assert(snapshot.draft);
  assert.equal(snapshot.account!.space.text.documents.length, 0); assert.equal(f.server.diagnostics().mutations, 0);
  const commandId = snapshot.pending.requestId, reopened = f.open(true);
  assert(await reopened.resolvePending(true)); assert.equal(reopened.snapshot().pending, null);
  assert.equal(f.server.diagnostics().mutations, 1); assert.equal(f.commands.at(-1)!.requestId, commandId);
  assert.equal(M.raw(reopened.snapshot().account!.space.text.documents[0]), raw);
  const clean = f.open(); assert(await clean.refresh()); assert.equal(clean.snapshot().account!.space.text.documents.length, 1);
});
test('PWC03 lost ACK resolves from existing receipt with no second write', async () => {
  const f = fixture(); assert(await f.controller.refresh()); f.loseNextAck();
  assert(!(await f.change(data => writing(data, f.base(data), '- [ ] 가상 할 일'))).ok);
  assert.equal(f.server.diagnostics().mutations, 1); const reopened = f.open(true);
  assert(await reopened.resolvePending()); assert.equal(f.server.diagnostics().mutations, 1); assert.equal(f.commands.length, 1);
});
