import assert from 'node:assert/strict';
import test from 'node:test';
import { programResult } from '../contract';
import { createProgramData, createProgramEnvelope } from '../program-data';
import { createProgramDocument } from '../private-space';
import { textWorkspaceModel as M } from '../text-workspace';
import { ALPHA_COMMAND_SCHEMA, ALPHA_LOCAL_PREFIX, type AlphaAccount, type AlphaCommand, type AlphaRecovery } from './contract';
import { createAlphaBackup, restoreAlphaBackup } from './backup';
import { ALPHA_ENVIRONMENT_POLICY, validateAlphaDevelopmentEnvironment } from './environment';
import { createAlphaFakeServer } from './fake-server';
import { canonicalJson, detached } from './json';
import { alphaRecoveryKey, createAlphaLocalRecovery } from './local-recovery';
import { captureAlphaAccount, commandFromProgramTransition, privateChanges, validateAlphaAccount } from './program-adapter';
import { createAlphaSyntheticFixtures } from './synthetic-fixtures';

function seed(ownerId = 'account-a') { const e = createProgramEnvelope(); return captureAlphaAccount(e, e.data.activeActorId, ownerId); }
function rename(account: AlphaAccount, requestId = 'rename', title = '계정 A 개인 폴더'): Extract<AlphaCommand, {kind:'change-private'}> {
  const next = detached(account.space); next.text.folders[0].title = title;
  return { schema: ALPHA_COMMAND_SCHEMA, requestId, expectedRevision: account.revision, kind: 'change-private', changes: privateChanges(account.space, next) };
}
for (const fixture of createAlphaSyntheticFixtures()) {
  test(`lossless backup/server/local round-trip: ${fixture.name}`, async () => {
    const before = canonicalJson(fixture.envelope), source = captureAlphaAccount(fixture.envelope, fixture.actorId, 'account-a');
    const backup = await createAlphaBackup(source.account, source.references);
    const restored = await restoreAlphaBackup(canonicalJson(backup), 'account-a'); assert(restored.ok);
    assert.deepEqual(restored.account.space, fixture.envelope.data.spaces[fixture.actorId]);
    assert.deepEqual(restored.account.legacyUndo, fixture.envelope.undo[fixture.actorId]);
    assert.deepEqual(restored.references.public, fixture.envelope.data.public);
    const server = createAlphaFakeServer([restored]), port = server.connect(server.issueSession('account-a'));
    const loaded = await port.read(); assert(loaded.ok); assert.deepEqual(loaded.value, restored.account);
    assert(!('public' in loaded.value) && !('spaces' in loaded.value) && !('actors' in loaded.value));
    const addDocument = commandFromProgramTransition(loaded.value, restored.references, 'roundtrip-document', data => createProgramDocument(data, {
      actorId: data.activeActorId, requestId: 'roundtrip-domain-receipt', expectedSpace: data.spaces[data.activeActorId], title: '왕복 중 새 문서', raw: '새 문서 내용',
    }));
    assert((await port.execute(addDocument)).ok);
    assert((await port.execute({ schema: ALPHA_COMMAND_SCHEMA, requestId: 'roundtrip-undo', expectedRevision: 1, kind: 'undo-private', operationId: 'roundtrip-document' })).ok);
    const successful = server.exportForBackup('account-a'); assert.deepEqual(successful.account.space, source.account.space);
    const afterCommands = await restoreAlphaBackup(canonicalJson(await createAlphaBackup(successful.account, successful.references, successful.operations)), 'account-a');
    assert(afterCommands.ok); assert.deepEqual(afterCommands.account.space, fixture.envelope.data.spaces[fixture.actorId]);
    const values = new Map<string, string>([['flow:operating', ' { "exact" : " 원본 " } ']]), writes: string[] = [];
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { writes.push(k); values.set(k, v); }, removeItem: (k: string) => { writes.push(k); values.delete(k); } };
    const validate = (v: unknown, owner: string): v is AlphaAccount => validateAlphaAccount(v, source.references, owner);
    const local = createAlphaLocalRecovery(storage, validate); assert(local.load('account-a').ok);
    const state: AlphaRecovery = { schema: 'flowme-alpha-recovery/1', ownerId: 'account-a', confirmed: successful.account, draft: null, pending: null };
    assert(local.save(state)); assert.deepEqual(createAlphaLocalRecovery(storage, validate).load('account-a'), { ok: true, value: state });
    assert(writes.every(key => key.startsWith(ALPHA_LOCAL_PREFIX))); assert.equal(values.get('flow:operating'), ' { "exact" : " 원본 " } ');
    assert.equal(canonicalJson(fixture.envelope), before); assert.equal(server.diagnostics().mutations, 2);
  });
}
test('server identity selects the account; forged owner/actor/public envelopes and anonymous fail closed', async () => {
  const a = seed(), b = seed('account-b'); b.account.space.text.folders[0].title = 'B private secret';
  const server = createAlphaFakeServer([a, b]), pa = server.connect(server.issueSession('account-a')), pb = server.connect(server.issueSession('account-b'));
  assert.equal(JSON.stringify(await pa.read()).includes('B private secret'), false);
  assert.deepEqual(await server.connect('forged').read(), { ok: false, reason: 'unauthenticated' });
  for (const extra of [{ ownerId: 'account-b' }, { actorId: 'local-user' }, { public: {} }, { spaces: {} }, { schema: 'future/2' }]) {
    assert.deepEqual(await pa.execute({ ...rename(a.account), ...extra } as AlphaCommand), { ok: false, reason: 'invalid' });
  }
  assert.deepEqual(await pb.lookup('rename'), { ok: true, value: null });
  assert.equal(server.diagnostics().mutations, 0);
});
test('CAS race gives exactly one commit; independent accounts can use identical request ids', async () => {
  const a = seed(), b = seed('account-b'), server = createAlphaFakeServer([a, b]);
  const first = server.connect(server.issueSession('account-a')), second = server.connect(server.issueSession('account-a'));
  const results = await Promise.all([first.execute(rename(a.account, 'device-1')), second.execute(rename(a.account, 'device-2', '다른 기기'))]);
  assert.equal(results.filter(r => r.ok).length, 1); assert.deepEqual(results.find(r => !r.ok), { ok: false, reason: 'revision-conflict' });
  const portB = server.connect(server.issueSession('account-b')); assert((await portB.execute(rename(b.account, 'device-1'))).ok);
  assert.equal(server.diagnostics().mutations, 2);
});
test('duplicate requests return the original receipt, different body conflicts, lookup is owner-scoped', async () => {
  const a = seed(), b = seed('account-b'), server = createAlphaFakeServer([a, b]), port = server.connect(server.issueSession('account-a'));
  const command = rename(a.account), receipt = await port.execute(command); assert(receipt.ok);
  assert.deepEqual(await port.execute(command), receipt); assert.deepEqual(await port.lookup(command.requestId), receipt);
  assert.deepEqual(await port.execute(rename(a.account, 'rename', 'changed body')), { ok: false, reason: 'idempotency-conflict' });
  assert.deepEqual(await server.connect(server.issueSession('account-b')).lookup('rename'), { ok: true, value: null });
  assert.equal(server.diagnostics().mutations, 1);
});
test('input/output aliases cannot change server bytes or an in-flight command', async () => {
  const a = seed(), server = createAlphaFakeServer([a]), port = server.connect(server.issueSession('account-a'));
  a.account.space.text.folders[0].title = 'external seed mutation';
  const before = await port.read(); assert(before.ok); assert.equal(before.value.space.text.folders[0].title, '미분류');
  const command = rename(before.value), saving = port.execute(command);
  if (command.kind === 'change-private' && command.changes[0].present) command.changes[0].value = null;
  assert((await saving).ok); before.value.space.text.folders[0].title = 'external response mutation';
  const after = await port.read(); assert(after.ok); assert.equal(after.value.space.text.folders[0].title, '계정 A 개인 폴더');
});
test('invalid references, failed transaction, same state and future schema make zero commits', async () => {
  const a = seed(), server = createAlphaFakeServer([a]), port = server.connect(server.issueSession('account-a'));
  const invalid: AlphaCommand = { ...rename(a.account), kind: 'change-private', changes: [{ field: 'archivedDocumentIds', present: true, value: ['absent'] }] };
  assert.deepEqual(await port.execute(invalid), { ok: false, reason: 'invalid' });
  assert.deepEqual(await port.execute({ ...rename(a.account), kind: 'change-private', changes: [] }), { ok: false, reason: 'no-change' });
  server.failNextCommit(); assert.deepEqual(await port.execute(rename(a.account)), { ok: false, reason: 'unavailable' });
  assert.deepEqual(server.diagnostics(), { mutations: 0, operations: 0 });
  assert.deepEqual(await port.read(), { ok: true, value: a.account });
});
test('Undo compensates private fields, preserves public and import history, rejects later device change', async () => {
  const source = seed(), server = createAlphaFakeServer([source]), port = server.connect(server.issueSession('account-a'));
  assert((await port.execute(rename(source.account))).ok);
  const undo: AlphaCommand = { schema: ALPHA_COMMAND_SCHEMA, requestId: 'undo', expectedRevision: 1, kind: 'undo-private', operationId: 'rename' };
  assert((await port.execute(undo)).ok); const restored = await port.read(); assert(restored.ok);
  assert.deepEqual(restored.value.space, source.account.space); assert.equal(restored.value.revision, 2);
  assert.deepEqual(restored.value.legacyUndo, source.account.legacyUndo);
  assert((await port.execute(rename(restored.value, 'first-edit'))).ok);
  const current = await port.read(); assert(current.ok); assert((await port.execute(rename(current.value, 'later-device', 'preserve later change'))).ok);
  assert.deepEqual(await port.execute({ ...undo, requestId: 'unsafe-undo', expectedRevision: 4, operationId: 'first-edit' }), { ok: false, reason: 'undo-conflict' });
  const final = await port.read(); assert(final.ok); assert.equal(final.value.space.text.folders[0].title, 'preserve later change');
});
test('real private transition bridge accepts owner receipts but rejects source/public/foreign edits', async () => {
  const source = seed();
  const command = commandFromProgramTransition(source.account, source.references, 'new-doc', data => createProgramDocument(data, {
    actorId: data.activeActorId, requestId: 'compat-receipt', expectedSpace: data.spaces[data.activeActorId], title: '내 메모', raw: '보존할 원문\n두 번째 행',
  }));
  const server = createAlphaFakeServer([source]), port = server.connect(server.issueSession('account-a'));
  assert((await port.execute(command)).ok); const result = await port.read(); assert(result.ok);
  assert.equal(M.raw(result.value.space.text.documents[0]), '보존할 원문\n두 번째 행');
  assert.deepEqual(result.value.legacyReceipts, source.account.legacyReceipts);
  for (const edit of [(data: ReturnType<typeof createProgramData>) => { data.activeActorId = 'creator-minji'; },
    (data: ReturnType<typeof createProgramData>) => { data.spaces['creator-minji'].text.folders[0].title = 'forged'; },
    (data: ReturnType<typeof createProgramData>) => { data.public.posts.push({} as never); }]) {
    assert.throws(() => commandFromProgramTransition(source.account, source.references, 'forged', data => { edit(data); return programResult(createProgramData(), data, 'x'); }));
  }
});
test('account capture excludes foreign spaces/receipts/history and preserves colliding legacy IDs by owner', () => {
  const envelope = createProgramEnvelope();
  envelope.data.spaces['creator-minji'].text.folders[0].title = 'private-other';
  envelope.data.receipts.push({ id: 'other-request', actorId: 'creator-minji', fingerprint: 'private-fingerprint', resultId: 'x', kind: 'test' });
  const a = captureAlphaAccount(envelope, 'local-user', 'a'), b = captureAlphaAccount(envelope, 'local-user', 'b');
  assert.equal(canonicalJson(a.account).includes('private-other'), false); assert.equal(canonicalJson(a.account).includes('private-fingerprint'), false);
  assert.deepEqual(a.account.space, b.account.space); assert.notEqual(a.account.ownerId, b.account.ownerId);
  assert.notEqual(alphaRecoveryKey('a/b'), alphaRecoveryKey('a%2Fb'));
});
test('backup rejects tampered owner/schema/body/references/files and never migrates unknown payload', async () => {
  const f = createAlphaSyntheticFixtures().find(x => x.name === 'public-versions-copy-community-photo')!;
  const source = captureAlphaAccount(f.envelope, f.actorId, 'account-a'), backup = await createAlphaBackup(source.account, source.references);
  assert(backup.manifest.files.length > 0 && backup.manifest.files[0].bytes > 0);
  const variants = [ { ...backup, schema: 'future/2' }, { ...backup, extra: true },
    { ...backup, account: { ...backup.account, ownerId: 'account-b' } },
    { ...backup, manifest: { ...backup.manifest, files: [] } },
    { ...backup, references: { ...backup.references, public: { ...backup.references.public, versions: [] } } } ];
  for (const value of variants) assert.deepEqual(await restoreAlphaBackup(JSON.stringify(value), 'account-a'), { ok: false, reason: 'invalid-backup' });
  assert.deepEqual(await restoreAlphaBackup(canonicalJson(backup), 'account-b'), { ok: false, reason: 'invalid-backup' });
  assert.deepEqual(await restoreAlphaBackup('{broken', 'account-a'), { ok: false, reason: 'invalid-backup' });
});
test('backup includes successful operation receipts and compensation journal; restored server handles lost-response retry once', async () => {
  const source = seed(), server = createAlphaFakeServer([source]), port = server.connect(server.issueSession('account-a'));
  const request = rename(source.account), success = await port.execute(request); assert(success.ok);
  const exported = server.exportForBackup('account-a');
  await assert.rejects(createAlphaBackup(exported.account, exported.references));
  const backup = await createAlphaBackup(exported.account, exported.references, exported.operations);
  const restored = await restoreAlphaBackup(canonicalJson(backup), 'account-a'); assert(restored.ok);
  const restoredServer = createAlphaFakeServer([restored]), restoredPort = restoredServer.connect(restoredServer.issueSession('account-a'));
  assert.deepEqual(await restoredPort.lookup(request.requestId), success); assert.deepEqual(await restoredPort.execute(request), success);
  assert.equal(restoredServer.diagnostics().mutations, 0);
  assert((await restoredPort.execute({ schema: ALPHA_COMMAND_SCHEMA, requestId: 'undo-restored', expectedRevision: 1, kind: 'undo-private', operationId: request.requestId })).ok);
  const undone = restoredServer.exportForBackup('account-a');
  const second = await createAlphaBackup(undone.account, undone.references, undone.operations);
  assert((await restoreAlphaBackup(canonicalJson(second), 'account-a')).ok);
  assert.deepEqual(undone.account.space, source.account.space); assert.equal(undone.operations[0].undone, true);
  const broken = detached(undone.operations); broken[0].inverse = [];
  await assert.rejects(createAlphaBackup(undone.account, undone.references, broken));
  const falseSuccess = { fingerprint: canonicalJson({ schema: ALPHA_COMMAND_SCHEMA, requestId: 'fake-noop', expectedRevision: 0, kind: 'change-private', changes: [] }),
    receipt: { requestId: 'fake-noop', revision: 1, changed: true, kind: 'change-private' as const }, inverse: [], undone: false };
  await assert.rejects(createAlphaBackup({ ...source.account, revision: 1 }, source.references, [falseSuccess]));
});
test('operating flow keys remain byte-identical across save/reload/restore/reset and every write is prefix-guarded', async () => {
  const source = seed();
  const operating = [['flow:saved:sample', ' {"id":"s", "private":"보존"} '], ['flow:map:persistence:sample', '\n{"schema":1}\n'], ['flow:my-flow:date-overrides', '{ "a": null }']] as const;
  const values = new Map<string, string>(operating), calls: { set: number; remove: number; clear: number; outside: number } = { set: 0, remove: 0, clear: 0, outside: 0 };
  const guard = (key: string) => { if (!key.startsWith(ALPHA_LOCAL_PREFIX)) { calls.outside++; throw Error('outside prefix'); } };
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { guard(key); calls.set++; values.set(key, value); },
    removeItem: (key: string) => { guard(key); calls.remove++; values.delete(key); }, clear: () => { calls.clear++; throw Error('forbidden'); } };
  const validate = (v: unknown, owner: string): v is AlphaAccount => validateAlphaAccount(v, source.references, owner);
  const local = createAlphaLocalRecovery(storage, validate); local.load('account-a');
  const restored = await restoreAlphaBackup(canonicalJson(await createAlphaBackup(source.account, source.references)), 'account-a'); assert(restored.ok);
  assert(local.save({ schema: 'flowme-alpha-recovery/1', ownerId: 'account-a', confirmed: restored.account, pending: null, draft: null }));
  const reboot = createAlphaLocalRecovery(storage, validate); assert(reboot.load('account-a').ok); assert(reboot.reset('account-a'));
  assert.deepEqual([...values], operating); assert.deepEqual(calls, { set: 1, remove: 1, clear: 0, outside: 0 });
});
test('strict JSON rejects silent data loss without invoking getters, toJSON or sparse coercion', () => {
  let invoked = 0;
  for (const value of [{ x: undefined }, { x: NaN }, { x: -0 }, { x: new Date() }, { get x() { invoked++; return 'bad'; } },
    { toJSON() { invoked++; return {}; } }, [1, , 3], Object.assign([1], { extra: true }), JSON.parse('{"__proto__":{}}')]) assert.throws(() => canonicalJson(value));
  assert.equal(invoked, 0); const circular: Record<string, unknown> = {}; circular.self = circular; assert.throws(() => canonicalJson(circular));
});
test('local recovery preserves original bytes, blocks corruption/readback faults and resets one exact key', () => {
  const source = seed(), values = new Map<string, string>([['flow:real', ' exact bytes '], [alphaRecoveryKey('account-b'), ' B bytes ']]), calls: string[] = [];
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { calls.push(`set:${k}`); values.set(k, v); }, removeItem: (k: string) => { calls.push(`remove:${k}`); values.delete(k); } };
  const validate = (v: unknown, o: string): v is AlphaAccount => validateAlphaAccount(v, source.references, o);
  const port = createAlphaLocalRecovery(storage, validate), state: AlphaRecovery = { schema: 'flowme-alpha-recovery/1', ownerId: 'account-a', confirmed: source.account, pending: null, draft: null };
  assert(port.load('account-a').ok); assert(port.save(state)); assert(port.reset('account-a'));
  assert.equal(values.get('flow:real'), ' exact bytes '); assert.equal(values.get(alphaRecoveryKey('account-b')), ' B bytes ');
  assert(calls.every(c => c.includes(ALPHA_LOCAL_PREFIX))); const count = calls.length;
  values.set(alphaRecoveryKey('account-a'), '{broken'); assert.equal(port.load('account-a').ok, false); assert.equal(port.save(state), false); assert.equal(port.reset('account-a'), false); assert.equal(calls.length, count);
});
test('environment rejects operating DB/Auth/Storage and redirect injection independently', () => {
  const url = `https://${ALPHA_ENVIRONMENT_POLICY.developmentProject}.supabase.co`;
  const config = { stage: 'test', projectRef: ALPHA_ENVIRONMENT_POLICY.developmentProject, databaseUrl: url, authUrl: url, storageUrl: url, redirectUrl: 'http://localhost:3104/auth/callback' };
  assert(validateAlphaDevelopmentEnvironment(config));
  for (const field of ['databaseUrl', 'authUrl', 'storageUrl']) {
    for (const bad of ['https://ldellkztijrijbpwthjl.supabase.co', `${url}.evil.test`, `${url}/rest/v1`, '']) assert.equal(validateAlphaDevelopmentEnvironment({ ...config, [field]: bad }), false);
  }
  for (const bad of ['https://evil.test/auth/callback', 'http://localhost:3104/auth/callback?next=evil', 'http://user@localhost:3104/auth/callback']) assert.equal(validateAlphaDevelopmentEnvironment({ ...config, redirectUrl: bad }), false);
  assert.equal(validateAlphaDevelopmentEnvironment({ ...config, projectRef: 'ldellkztijrijbpwthjl' }), false);
  assert.equal(validateAlphaDevelopmentEnvironment({ ...config, stage: 'production' }), false);
  assert.equal(validateAlphaDevelopmentEnvironment({}), false);
});
