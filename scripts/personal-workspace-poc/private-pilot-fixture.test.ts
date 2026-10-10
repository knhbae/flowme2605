import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { canonicalJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { privateChanges, materializeAccount } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import type { AlphaCommand } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../../lib/flow/personal-workspace-poc-authoring';
import { textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';
import { makeProgramPrivateOutput } from '../../lib/flow/integrated-poc/private-output';
import { createPrivatePilotRepository, createPrivatePilotSeed, decodePrivatePilotRequestBody, privatePilotFixtureSelfCheck,
  privatePilotResourceTarget, PRIVATE_PILOT_LOCAL_ORIGIN, PRIVATE_PILOT_ORIGIN, validatePrivatePilotCommand, validatePrivatePilotInput } from './private-pilot-browser-fixture-20261004';
import { privatePilotCommandTarget } from './private-pilot-browser-fixture-20261004';

// Unit fixture only. This is not the approved pilot Flow, a creator input source or browser evidence.
const INPUT = { title: '합성 계약 검사', raw: '# 합성 계약 검사\n## 검사 구간\n- [x] 합성 첫 항목\n  - 날짜: 2026-10-05\n  - 시간: 09:30\n  - [x] 합성 하위 확인\n- [ ] 합성 둘째 항목\n' };
const NOW = '2026-10-04T00:00:00.000Z', DRAFT = 'fixture-only-draft';
const creator = (requestId: string, revision: number, intent: unknown) => ({ schema: 'flowme-alpha-creator-command/1', kind: 'creator', requestId,
  expectedRevision: revision, intent: { ...(intent as object), now: NOW } }) as AlphaCommand;
async function read(f: ReturnType<typeof createPrivatePilotRepository>) { const result = await f.repository.read(); assert(result.ok); return result.value; }
async function prepared() {
  const f = createPrivatePilotRepository(INPUT);
  const working = creator('fixture-working', 0, { type: 'working', working: { draftId: DRAFT, title: INPUT.title, rawText: INPUT.raw, baseRecordRevision: null } });
  const opened = await f.repository.execute(working); assert(opened.ok); assert.equal(opened.value.kind, 'creator');
  const library = (await read(f)).space.creatorWorkspace!.library;
  const save = creator('fixture-save', 1, { type: 'library-action', action: { type: 'save', draftId: DRAFT,
    rawText: INPUT.raw, title: INPUT.title, sourceFingerprint: fingerprint(INPUT.raw), expectedLibraryRevision: library.revision, now: NOW } });
  const saved = await f.repository.execute(save); assert(saved.ok);
  const handoff = creator('fixture-handoff', 2, { type: 'raw-handoff', draftId: DRAFT, expectedRecordRevision: 1, today: '2026-10-04' });
  return { f, working, save, handoff };
}
async function handed() { const p = await prepared(), result = await p.f.repository.execute(p.handoff); assert(result.ok); assert(result.value.resultId); return { ...p, documentId: result.value.resultId, receipt: result.value }; }

test('PB01 exact nonempty approved input is mandatory; no default pilot contents', () => {
  assert(validatePrivatePilotInput(INPUT));
  for (const value of [null, {}, { title: '', raw: 'x' }, { title: 'x', raw: ' ' }, { ...INPUT, extra: true }]) {
    assert.equal(validatePrivatePilotInput(value), false); assert.throws(() => createPrivatePilotRepository(value as typeof INPUT));
  }
});
test('PB02 empty synthetic seed contains no creator record, execution document, Item or public content', async () => {
  const seed = createPrivatePilotSeed(); assert.equal(seed.account.revision, 0); assert.equal(seed.account.space.creatorWorkspace, undefined);
  assert.equal(seed.account.space.text.documents.length, 0); assert.equal(M.tasks(seed.account.space.text).length, 0);
  for (const rows of Object.values(seed.context.public)) assert.equal(rows.length, 0);
  const selfcheck = await privatePilotFixtureSelfCheck(INPUT); assert(selfcheck.emptyAccount); assert.equal(selfcheck.commandCount, 0); assert.equal(selfcheck.deniedResourceCases, 8);
});
test('PB03 shipped working/save/raw-handoff reducers create one document and retain exact saved source', async () => {
  const p = await handed(), account = await read(p.f), owner = account.space.creatorWorkspace!;
  assert.equal(account.revision, 3); assert.equal(account.space.text.documents.length, 1);
  assert.equal(owner.library.records[DRAFT].rawText, INPUT.raw); assert.equal(owner.library.records[DRAFT].recordRevision, 1);
  assert.equal(owner.handoffs[DRAFT].documentId, p.documentId); assert.equal(owner.executionSources![DRAFT].documentId, p.documentId);
  const tasks = M.tasks(account.space.text); assert.equal(tasks.length, 2); assert(tasks.every(task => !task.done));
  const document = M.getDocument(account.space.text, p.documentId); assert(document);
  assert.equal(M.parseDocument(document, account.space.text).items.length, 3);
  assert.equal(tasks[0].date, '2026-10-05'); assert.equal(tasks[0].time, '09:30');
  assert.deepEqual(account.source, p.f.seed.account.source); assert.deepEqual(p.f.seed.context.public, p.f.seed.references.public);
});
test('PB04 exact original wire receipt replay and lookup remain idempotent', async () => {
  const p = await handed(), before = canonicalJson(await read(p.f));
  assert.deepEqual(await p.f.repository.execute(p.handoff), { ok: true, value: p.receipt });
  assert.deepEqual(await p.f.repository.lookup(p.handoff.requestId), { ok: true, value: p.receipt });
  assert.equal(canonicalJson(await read(p.f)), before); assert.equal(p.f.diagnostics().ledgerCount, 3);
});
test('PB05 changed request identity and stale CAS cannot create a second document or alter source bytes', async () => {
  const p = await handed(), before = canonicalJson(await read(p.f));
  assert.deepEqual(await p.f.repository.execute({ ...p.handoff, expectedRevision: 3 }), { ok: false, reason: 'idempotency-conflict' });
  assert.deepEqual(await p.f.repository.execute({ ...p.handoff, requestId: 'stale-handoff' }), { ok: false, reason: 'revision-conflict' });
  const nochange = { ...p.handoff, requestId: 'same-revision-handoff', expectedRevision: 3 };
  assert.deepEqual(await p.f.repository.execute(nochange), { ok: false, reason: 'no-change' });
  assert.equal(canonicalJson(await read(p.f)), before); assert.equal(p.f.diagnostics().commandCount, 3);
});
test('PB06 public/social/catalog/native/update and forged aggregate private writes remain denied', async () => {
  const f = createPrivatePilotRepository(INPUT), before = canonicalJson(await read(f));
  const commands: unknown[] = [creator('catalog', 0, { type: 'catalog-library-import', catalogVersion: 'x' }),
    creator('native', 0, { type: 'native-handoff', draftId: DRAFT, choices: {} }),
    creator('update', 0, { type: 'raw-update', draftId: DRAFT, choices: {} }),
    creator('save-other', 0, { type: 'library-action', action: { type: 'save', draftId: DRAFT, title: INPUT.title, rawText: 'other', sourceFingerprint: fingerprint('other'), expectedLibraryRevision: 0, now: NOW } }),
    { schema: 'flowme-alpha-social-command/1', kind: 'social', requestId: 'social', expectedRevision: 0, intent: {} },
    { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: 'aggregate', expectedRevision: 0, changes: [{ field: 'creatorWorkspace', present: false }] }];
  for (const command of commands) { assert.equal(validatePrivatePilotCommand(command, INPUT), false); assert.deepEqual(await f.repository.execute(command as AlphaCommand), { ok: false, reason: 'invalid' }); }
  assert.equal(canonicalJson(await read(f)), before); assert.equal(f.diagnostics().mutations, 0);
});
test('PB07 creator handoff Undo and Redo use semantic wire receipts and retain the prior saved library', async () => {
  const p = await handed();
  const undo: AlphaCommand = { schema: 'flowme-alpha-creator-command/1', kind: 'undo-creator', requestId: 'undo-handoff', expectedRevision: 3, operationId: p.handoff.requestId };
  const undone = await p.f.repository.execute(undo); assert(undone.ok); assert.equal(undone.value.kind, 'undo-creator');
  const afterUndo = await read(p.f); assert.equal(afterUndo.space.text.documents.length, 0); assert.equal(afterUndo.space.creatorWorkspace!.library.records[DRAFT].rawText, INPUT.raw);
  const redone = await p.f.repository.execute({ ...undo, requestId: 'redo-handoff', expectedRevision: 4, operationId: undo.requestId }); assert(redone.ok);
  assert.equal((await read(p.f)).space.creatorWorkspace!.handoffs[DRAFT].documentId, p.documentId); assert.equal(p.f.diagnostics().ledgerCount, 5);
});
test('PB08 ordinary private date/memo/completion writes and supported inverse restore same IDs without changing creator owner', async () => {
  const p = await handed(), before = await read(p.f), source = canonicalJson(before.space.creatorWorkspace), task = M.tasks(before.space.text)[0];
  let text = M.updateTask(before.space.text, task.id, { date: '2026-10-08', note: 'unit-only private memo' });
  text = M.recordProgress(text, task.id, '2026-10-04', 100);
  const command: AlphaCommand = { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: 'private-edit', expectedRevision: 3,
    changes: privateChanges(before.space, { ...before.space, text }) };
  assert((await p.f.repository.execute(command)).ok); const edited = await read(p.f), nextTask = M.tasks(edited.space.text).find(value => value.id === task.id)!;
  assert.equal(nextTask.date, '2026-10-08'); assert.equal(nextTask.note, 'unit-only private memo'); assert(nextTask.done);
  assert.equal(canonicalJson(edited.space.creatorWorkspace), source);
  assert((await p.f.repository.execute({ schema: 'flowme-alpha-command/1', kind: 'undo-private', requestId: 'undo-private-edit', expectedRevision: 4, operationId: command.requestId })).ok);
  assert.equal(canonicalJson((await read(p.f)).space), canonicalJson(before.space));
});
test('PB09 read-only private outputs and repeat account reads preserve exact bytes and counts', async () => {
  const p = await handed(), account = await read(p.f), before = canonicalJson(account), count = p.f.diagnostics().commandCount;
  const data = materializeAccount(account, p.f.seed.references).data;
  const output = makeProgramPrivateOutput(data, { actorId: account.ownerId, documentId: p.documentId, mode: 'raw', selectedItemIds: [], format: 'txt' }, NOW);
  assert(output.ok); assert.equal(canonicalJson(await read(p.f)), before); assert.equal(p.f.diagnostics().commandCount, count);
});
test('PB10 exact3115 document/static GET forwarding rejects alternate listeners, API, auth, POST and traversal', () => {
  assert.equal(privatePilotResourceTarget(PRIVATE_PILOT_ORIGIN + '/alpha', 'GET'), PRIVATE_PILOT_LOCAL_ORIGIN + '/alpha');
  assert.equal(privatePilotResourceTarget(PRIVATE_PILOT_ORIGIN + '/_next/static/chunks/app.js', 'GET'), PRIVATE_PILOT_LOCAL_ORIGIN + '/_next/static/chunks/app.js');
  for (const [url, method] of [[PRIVATE_PILOT_ORIGIN + '/api/alpha/account', 'GET'], [PRIVATE_PILOT_ORIGIN + '/alpha', 'POST'],
    ['http://127.0.0.1:3106/alpha', 'GET'], ['http://localhost:3115/alpha', 'GET'], ['https://example.invalid/alpha', 'GET'],
    [PRIVATE_PILOT_ORIGIN + '/_next/static/a%2fb.js', 'GET'], [PRIVATE_PILOT_ORIGIN + '/_next/static/../secret', 'GET']]) assert.equal(privatePilotResourceTarget(url, method), null);
  assert.equal(privatePilotResourceTarget(PRIVATE_PILOT_ORIGIN + '/alpha', 'GET', 'http://127.0.0.1:3106'), null);
});
test('PB11 browser bundle has no external imports; wire decoding preserves shipped plain-object realm guard', async () => {
  for (const malformed of [null, '', '{bad', '[]', 'null', '42']) assert.equal(decodePrivatePilotRequestBody(malformed), null);
  const result = await build({ entryPoints: ['scripts/personal-workspace-poc/private-pilot-browser-fixture-20261004.ts'], bundle: true,
    platform: 'browser', format: 'iife', globalName: 'PrivatePilotFixture', target: 'es2022', write: false, metafile: true, logLevel: 'silent' });
  assert.equal(Object.values(result.metafile!.outputs).flatMap(value => value.imports).length, 0);
  const sandbox = vm.createContext({ crypto: globalThis.crypto, URL, URLSearchParams, TextEncoder, TextDecoder, btoa, nativeStructuredClone: structuredClone, console,
    foreignBody: { command: creator('foreign-working', 0, { type: 'working', working: null }) }, inputJson: JSON.stringify(INPUT),
    sequenceJson: JSON.stringify([
      creator('bundle-working', 0, { type: 'working', working: { draftId: DRAFT, title: INPUT.title, rawText: INPUT.raw, baseRecordRevision: null } }),
      creator('bundle-save', 1, { type: 'library-action', action: { type: 'save', draftId: DRAFT, title: INPUT.title, rawText: INPUT.raw,
        sourceFingerprint: fingerprint(INPUT.raw), expectedLibraryRevision: 0, now: NOW } }),
      creator('bundle-handoff', 2, { type: 'raw-handoff', draftId: DRAFT, expectedRecordRevision: 1, today: '2026-10-04' }),
    ]) });
  // VM lacks this intrinsic. Its bridge must return JSON records in the calling
  // realm, as real same-realm structuredClone does, not host-realm plain objects.
  new vm.Script('globalThis.structuredClone = value => JSON.parse(JSON.stringify(nativeStructuredClone(value)))').runInContext(sandbox);
  new vm.Script(result.outputFiles[0].text).runInContext(sandbox);
  const checks = new vm.Script(`(() => { const approved = JSON.parse(inputJson), local = PrivatePilotFixture.decodePrivatePilotRequestBody(JSON.stringify(foreignBody));
    return { foreignDenied: !PrivatePilotFixture.validatePrivatePilotCommand(foreignBody.command, approved),
      decodedAccepted: PrivatePilotFixture.validatePrivatePilotCommand(local.command, approved) }; })()`).runInContext(sandbox);
  assert(checks.foreignDenied); assert(checks.decodedAccepted);
  const selfcheck = await new vm.Script('PrivatePilotFixture.privatePilotFixtureSelfCheck(JSON.parse(inputJson))').runInContext(sandbox);
  assert(selfcheck.emptyAccount); assert.equal(selfcheck.commandCount, 0);
  const bundledJourney = await new vm.Script(`(async () => { const f = PrivatePilotFixture.createPrivatePilotRepository(JSON.parse(inputJson));
    const receipts = []; for (const command of JSON.parse(sequenceJson)) receipts.push(await f.repository.execute(command));
    const read = await f.repository.read(); return { receipts, revision: read.value.revision, documents: read.value.space.text.documents.length,
      raw: read.value.space.creatorWorkspace?.library.records['${DRAFT}']?.rawText, diagnostics: f.diagnostics() }; })()`).runInContext(sandbox);
  assert(bundledJourney.receipts.every((value: any) => value.ok), JSON.stringify(bundledJourney)); assert.equal(bundledJourney.revision, 3);
  assert.equal(bundledJourney.documents, 1); assert.equal(bundledJourney.raw, INPUT.raw); assert.equal(bundledJourney.diagnostics.commandCount, 3);
});
test('PB12 callback generator refuses to produce a pilot when approved artifacts are absent', () => {
  const result = spawnSync(process.execPath, ['scripts/personal-workspace-poc/build-private-pilot-browser-fixture-20261004.mjs'], { encoding: 'utf8', windowsHide: true });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /private-pilot-approved-input-title-handoff-not-provided/);
});
test('PB13 shipped family HTTP endpoints accept creator only at creator and private/lookup only at account', async () => {
  const p = await prepared(), envelope = { kind: 'execute', command: p.working };
  assert.equal(privatePilotCommandTarget(PRIVATE_PILOT_ORIGIN + '/api/alpha/creator', 'POST', envelope, INPUT), 'execute');
  assert.equal(privatePilotCommandTarget(PRIVATE_PILOT_ORIGIN + '/api/alpha/account', 'POST', envelope, INPUT), null);
  const lookup = { kind: 'lookup', requestId: 'fixture-working' };
  assert.equal(privatePilotCommandTarget(PRIVATE_PILOT_ORIGIN + '/api/alpha/account', 'POST', lookup, INPUT), 'lookup');
  assert.equal(privatePilotCommandTarget(PRIVATE_PILOT_ORIGIN + '/api/alpha/creator', 'POST', lookup, INPUT), null);
  const privateCommand = { kind: 'execute', command: { schema: 'flowme-alpha-command/1', kind: 'undo-private',
    requestId: 'private-undo', expectedRevision: 1, operationId: 'private-change' } };
  assert.equal(privatePilotCommandTarget(PRIVATE_PILOT_ORIGIN + '/api/alpha/account', 'POST', privateCommand, INPUT), 'execute');
  assert.equal(privatePilotCommandTarget(PRIVATE_PILOT_ORIGIN + '/api/alpha/creator', 'POST', privateCommand, INPUT), null);
  for (const [url, method, body] of [[PRIVATE_PILOT_ORIGIN + '/api/alpha/creator?extra=1', 'POST', envelope],
    [PRIVATE_PILOT_ORIGIN + '/api/alpha/creator', 'GET', envelope], ['https://example.invalid/api/alpha/creator', 'POST', envelope],
    [PRIVATE_PILOT_ORIGIN + '/api/alpha/social', 'POST', envelope], [PRIVATE_PILOT_ORIGIN + '/api/alpha/creator', 'POST', { ...envelope, extra: true }]])
    assert.equal(privatePilotCommandTarget(url as string, method as string, body, INPUT), null);
});
test('PB14 callback-local clone bridge preserves saved-history plain records without altering globals', async () => {
  const result = await build({ entryPoints: ['scripts/personal-workspace-poc/private-pilot-browser-fixture-20261004.ts'], bundle: true,
    platform: 'browser', format: 'iife', globalName: 'PrivatePilotFixture', target: 'es2022', write: false, logLevel: 'silent' });
  const sandbox = vm.createContext({crypto: globalThis.crypto, URL, URLSearchParams, TextEncoder, TextDecoder, btoa, structuredClone,
    inputJson:JSON.stringify(INPUT), console});
  // Simulate the CLI's foreign-realm intrinsic. No global override is allowed.
  const journey = `(async () => { const structuredClone = value => JSON.parse(JSON.stringify(globalThis.structuredClone(value)));
    ${result.outputFiles[0].text}
    const approved=JSON.parse(inputJson), f=PrivatePilotFixture.createPrivatePilotRepository(approved), now='${NOW}';
    const create=(requestId,expectedRevision,intent)=>({schema:'flowme-alpha-creator-command/1',kind:'creator',requestId,expectedRevision,intent:{...intent,now}});
    const receipts=[];
    receipts.push(await f.repository.execute(create('local-working',0,{type:'working',working:{draftId:'${DRAFT}',title:approved.title,rawText:approved.raw,baseRecordRevision:null}})));
    receipts.push(await f.repository.execute(create('local-save',1,{type:'library-action',action:{type:'save',draftId:'${DRAFT}',title:approved.title,rawText:approved.raw,sourceFingerprint:'${fingerprint(INPUT.raw)}',expectedLibraryRevision:0,now}})));
    const read=await f.repository.read(); return {receipts, revision:read.value.revision, saved:!!read.value.space.creatorWorkspace?.savedHistory,
      globalUnchanged:globalThis.structuredClone===originalClone}; })()`;
  new vm.Script('globalThis.originalClone=structuredClone').runInContext(sandbox);
  const checked = await new vm.Script(journey).runInContext(sandbox);
  assert(checked.receipts.every((v:any)=>v.ok), JSON.stringify(checked)); assert.equal(checked.revision,2);
  assert(checked.saved); assert(checked.globalUnchanged);
});
