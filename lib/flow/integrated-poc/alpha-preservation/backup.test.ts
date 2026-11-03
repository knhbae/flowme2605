import assert from 'node:assert/strict';
import test from 'node:test';
import { ALPHA_SCHEMA, ALPHA_LIMITS } from '../alpha-persistence/contract';
import { canonicalJson, detached, hashJson } from '../alpha-persistence/json';
import { PROGRAM_SCHEMA } from '../contract';
import { createProgramPrivateSpace } from '../program-data';
import { emptyAlphaReferences } from '../alpha-social/projection';
import { ACCOUNT_BACKUP_SCHEMA, ACCOUNT_BACKUP_COVERAGE, createAccountBackup, validateAccountBackup, type AccountBackupInput } from './backup';

const owner = '11111111-1111-4111-8111-111111111111';
const media = 'media-22222222-2222-4222-8222-222222222222';
const now = '2026-09-21T14:00:00.000Z';
function seed(): AccountBackupInput {
  return { account: { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] }, references: emptyAlphaReferences(owner), operations: [], importArchives: [], createdAt: now };
}
const resolver = async () => ({ mime: 'image/webp', bytes: new Uint8Array([82, 73, 70, 70, 1, 2, 3]) });
async function resign(value: any) { const { integrity: _, ...payload } = value; value.integrity = { payloadSha256: await hashJson(payload) }; return canonicalJson(value); }
test('v2 round trip preserves detached account, references, original and archive bytes', async () => {
  const input = seed(); input.importArchives = [{ raw: '  원문\r\n그대로  ', id: 'archive' }];
  const before = canonicalJson(input), backup = await createAccountBackup(input, resolver);
  assert.equal(backup.schema, ACCOUNT_BACKUP_SCHEMA); assert.equal(canonicalJson(input), before);
  assert.deepEqual(await validateAccountBackup(canonicalJson(backup), owner), { ok: true, value: backup });
  input.importArchives.length = 0; assert.equal(backup.importArchives.length, 1);
});
test('deduplicates exact remote and inline images including nested archives', async () => {
  const input = seed(), photo = { id: media, dataUrl: `flowme-media:${media}` };
  input.importArchives = [{ photo, nested: [photo, { id: 'inline-photo', dataUrl: 'data:image/png;base64,AQID' }] }];
  let calls = 0; const backup = await createAccountBackup(input, async id => { assert.equal(id, media); calls++; return resolver(); });
  assert.equal(calls, 1); assert.equal(backup.files.length, 2); assert((await validateAccountBackup(canonicalJson(backup), owner)).ok);
});
test('own server operations preserved as evidence without fake-server replay', async () => {
  const input = seed(); input.account.revision = 7;
  input.operations = [{ owner_id: owner, request_id: 'cleanup-7', command: { schema: 'flowme-alpha-test-cleanup/1', requestId: 'cleanup-7', kind: 'social' },
    receipt: { requestId: 'cleanup-7', revision: 7, changed: true, kind: 'social', publicRevision: 4 }, inverse: [], undone: true }];
  const backup = await createAccountBackup(input, resolver); assert.deepEqual(backup.operations, input.operations); assert((await validateAccountBackup(canonicalJson(backup), owner)).ok);
});
test('historical deleted media remains exact journal evidence without resurrection or mandatory bytes', async () => {
  const input = seed(); input.account.revision = 7;
  input.operations = [{ owner_id: owner, request_id: 'cleanup-7', command: { schema: 'flowme-alpha-test-cleanup/1', requestId: 'cleanup-7', kind: 'social', publicBefore: { media: [{ id: media, dataUrl: `flowme-media:${media}` }] }, productUndoAllowed: false },
    receipt: { requestId: 'cleanup-7', revision: 7, changed: true, kind: 'social', publicRevision: 4, resultId: 'test-fixture-cleanup' }, inverse: [{ field: 'participationDrafts', present: true, value: [{ media: [{ id: media, dataUrl: `flowme-media:${media}` }] }] }], undone: true }];
  const backup = await createAccountBackup(input, async () => { throw Error('historical bytes unavailable'); });
  assert.deepEqual(backup.coverage, ACCOUNT_BACKUP_COVERAGE); assert.deepEqual(backup.operations, input.operations); assert.deepEqual(backup.files, []);
  assert((await validateAccountBackup(canonicalJson(backup), owner)).ok);
  const wrong = { ...backup, coverage: { currentAttachments: 'complete', operationHistory: 'complete' } };
  assert(!(await validateAccountBackup(await resign(wrong), owner)).ok);
  input.importArchives = [{ id: media, dataUrl: `flowme-media:${media}` }];
  await assert.rejects(createAccountBackup(input, async () => { throw Error('current bytes required'); }));
});
test('raw archive strings stay exact but cannot hide missing remote media dependencies', async () => {
  const input = seed(), raw = JSON.stringify({ id: media, dataUrl: `flowme-media:${media}` });
  input.importArchives = [{ raw }]; await assert.rejects(createAccountBackup(input, resolver));
  input.importArchives.push({ id: media, dataUrl: `flowme-media:${media}` });
  const backup = await createAccountBackup(input, resolver); assert.deepEqual(backup.importArchives, input.importArchives);
  assert((await validateAccountBackup(canonicalJson(backup), owner)).ok);
});
for (const mutation of ['owner', 'schema', 'digest', 'body', 'missing', 'extra', 'duplicate', 'hash', 'mime', 'bytes', 'base64'] as const) {
  test(`rejects ${mutation} tampering including recomputed integrity`, async () => {
    const input = seed(); input.importArchives = [{ id: media, dataUrl: `flowme-media:${media}` }];
    const backup: any = await createAccountBackup(input, resolver);
    if (mutation === 'owner') backup.account.ownerId = 'other';
    if (mutation === 'schema') backup.schema = 'flowme-alpha-account-backup/999';
    if (mutation === 'digest') backup.integrity.payloadSha256 = '0'.repeat(64);
    if (mutation === 'body') backup.account.space.text = {};
    if (mutation === 'missing') backup.files = [];
    if (mutation === 'extra') backup.files.push({ ...backup.files[0], id: 'extra' });
    if (mutation === 'duplicate') backup.files.push(backup.files[0]);
    if (mutation === 'hash') backup.files[0].sha256 = '0'.repeat(64);
    if (mutation === 'mime') backup.files[0].mime = 'text/html';
    if (mutation === 'bytes') backup.files[0].bytes++;
    if (mutation === 'base64') backup.files[0].base64 = '!!!!';
    const raw = mutation === 'digest' ? canonicalJson(backup) : await resign(backup);
    assert.deepEqual(await validateAccountBackup(raw, owner), { ok: false, reason: 'invalid-backup' });
  });
}
test('rejects foreign operation, credential fields and unsafe media paths before resolving', async () => {
  for (const archive of [{ access_token: 'secret' }, { dataUrl: 'https://foreign/image.png' }, { id: media, dataUrl: 'flowme-media:../../bad' }]) {
    const input = seed(); input.importArchives = [archive]; await assert.rejects(createAccountBackup(input, resolver));
  }
  const input = seed(); input.account.revision = 1;
  input.operations = [{ owner_id: 'foreign', request_id: 'a', command: {}, receipt: {}, inverse: [], undone: false }];
  await assert.rejects(createAccountBackup(input, resolver));
});
test('rejects old schema, other owner, unknown properties, invalid dates and malformed JSON', async () => {
  const backup = await createAccountBackup(seed(), resolver);
  assert(!(await validateAccountBackup(canonicalJson(backup), 'other')).ok);
  for (const raw of ['{', canonicalJson({ ...backup, schema: 'flowme-alpha-backup/1' }), canonicalJson({ ...backup, extra: 1 })]) assert(!(await validateAccountBackup(raw, owner)).ok);
  const input = seed(); input.createdAt = '2026-02-30T14:00:00.000Z'; await assert.rejects(createAccountBackup(input, resolver));
});
test('resolver failures and excessive files fail without returning a partial package', async () => {
  const input = seed(); input.importArchives = [{ id: media, dataUrl: `flowme-media:${media}` }];
  await assert.rejects(createAccountBackup(input, async () => { throw Error('offline'); }));
  await assert.rejects(createAccountBackup(input, async () => ({ mime: 'image/webp', bytes: new Uint8Array(2_000_001) })));
  const bad = detached(input); bad.importArchives = Array.from({ length: 129 }, () => ({})); await assert.rejects(createAccountBackup(bad, resolver));
});

for (const kind of ['getter', 'cycle', '__proto__', 'constructor', 'prototype', 'sparse', 'undefined', 'NaN', '-0', 'class', 'symbol'] as const) {
  test(`input JSON rejects ${kind} before getters or media resolution`, async () => {
    const input = seed(); let getters = 0, resolved = 0;
    let malformed: unknown;
    if (kind === 'getter') malformed = Object.defineProperty({}, 'value', { enumerable: true, get() { getters++; return 'secret'; } });
    else if (kind === 'cycle') { const value: any = {}; value.self = value; malformed = value; }
    else if (['__proto__', 'constructor', 'prototype'].includes(kind)) malformed = JSON.parse(`{"${kind}":1}`);
    else if (kind === 'sparse') malformed = new Array(1);
    else if (kind === 'undefined') malformed = { value: undefined };
    else if (kind === 'NaN') malformed = { value: NaN };
    else if (kind === '-0') malformed = { value: -0 };
    else if (kind === 'class') malformed = Object.assign(Object.create({ inherited: true }), { value: 'own' });
    else malformed = { [Symbol('hidden')]: 'secret' };
    input.importArchives = [{ malformed, photo: { id: media, dataUrl: `flowme-media:${media}` } }];
    await assert.rejects(createAccountBackup(input, async () => { resolved++; return resolver(); }), /alpha-/);
    assert.equal(getters, 0); assert.equal(resolved, 0);
  });
}

test('input depth boundary accepts depth 120 and rejects 121 without resolving media', async () => {
  for (const depth of [ALPHA_LIMITS.depth, ALPHA_LIMITS.depth + 1]) {
    const input = seed(); let child: unknown = '원문\r\n';
    // Root -> importArchives -> element is depth 2.
    for (let level = 2; level < depth; level++) child = { child };
    input.importArchives = [child]; let resolved = 0;
    const create = () => createAccountBackup(input, async () => { resolved++; return resolver(); });
    if (depth === ALPHA_LIMITS.depth) {
      const result = await create(); assert.deepEqual(result.importArchives, input.importArchives);
    } else await assert.rejects(create(), /alpha-json-depth/);
    assert.equal(resolved, 0);
  }
});

test('input byte overflow fails before resolution, independently of final backup overhead', async () => {
  const input = seed(); input.importArchives = [{ raw: '' }];
  const overhead = new TextEncoder().encode(canonicalJson(input)).length;
  (input.importArchives[0] as { raw: string }).raw = 'x'.repeat(ALPHA_LIMITS.bytes - overhead + 1);
  let resolved = 0;
  await assert.rejects(createAccountBackup(input, async () => { resolved++; return resolver(); }), /alpha-too-large/);
  assert.equal(resolved, 0);
});

test('final byte boundary includes integrity even when input and hashed payload are within limit', async () => {
  const empty = seed(); empty.importArchives = [{ raw: '' }];
  const emptyBackup = await createAccountBackup(empty, resolver);
  const finalOverhead = new TextEncoder().encode(canonicalJson(emptyBackup)).length;
  for (const excess of [0, 1]) {
    const input = seed(); input.importArchives = [{ raw: 'x'.repeat(ALPHA_LIMITS.bytes - finalOverhead + excess) }];
    assert(new TextEncoder().encode(canonicalJson(input)).length < ALPHA_LIMITS.bytes);
    const { integrity: _integrity, ...emptyPayload } = emptyBackup;
    const payload = { ...emptyPayload, importArchives: input.importArchives };
    assert(new TextEncoder().encode(canonicalJson(payload)).length < ALPHA_LIMITS.bytes);
    if (excess) await assert.rejects(createAccountBackup(input, resolver), /alpha-too-large/);
    else assert.equal(new TextEncoder().encode(canonicalJson(await createAccountBackup(input, resolver))).length, ALPHA_LIMITS.bytes);
  }
});

test('creation rejects owner and source actor disagreement before media resolution', async () => {
  const input = seed(); input.account.source.actorId = '22222222-2222-4222-8222-222222222222';
  let resolved = 0;
  await assert.rejects(createAccountBackup(input, async () => { resolved++; return resolver(); }));
  assert.equal(resolved, 0);
});

for (const kind of ['command-id', 'receipt-id', 'unchanged', 'future-revision', 'zero-revision', 'duplicate-id', 'duplicate-revision', 'inverse', 'undone'] as const) {
  test(`creation rejects invalid operation ${kind}`, async () => {
    const input = seed(); input.account.revision = 2;
    const operation: any = { owner_id: owner, request_id: 'op', command: { schema: 'flowme-alpha-example/1', requestId: 'op' },
      receipt: { requestId: 'op', revision: 1, changed: true }, inverse: [], undone: false };
    input.operations = [operation];
    if (kind === 'command-id') operation.command.requestId = 'other';
    if (kind === 'receipt-id') operation.receipt.requestId = 'other';
    if (kind === 'unchanged') operation.receipt.changed = false;
    if (kind === 'future-revision') operation.receipt.revision = 3;
    if (kind === 'zero-revision') operation.receipt.revision = 0;
    if (kind === 'duplicate-id') input.operations.push(detached(operation));
    if (kind === 'duplicate-revision') input.operations.push({ ...detached(operation), request_id: 'other', command: { ...operation.command, requestId: 'other' }, receipt: { ...operation.receipt, requestId: 'other' } });
    if (kind === 'inverse') operation.inverse = {};
    if (kind === 'undone') operation.undone = 'false';
    await assert.rejects(createAccountBackup(input, async () => { throw Error('must not resolve'); }), /invalid-account-backup/);
  });
}

test('resolver wait cannot expose later caller mutations to account, references, archive or journal', async () => {
  const input = seed(); input.account.revision = 1;
  input.operations = [{ owner_id: owner, request_id: 'op', command: { schema: 'flowme-alpha-example/1', requestId: 'op' },
    receipt: { requestId: 'op', revision: 1, changed: true }, inverse: [], undone: false }];
  input.importArchives = [{ raw: '  원문\r\n', id: media, dataUrl: `flowme-media:${media}` }];
  const expected = detached(input);
  let release!: () => void, entered!: () => void;
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  const output = createAccountBackup(input, async () => { entered(); await new Promise<void>(resolve => { release = resolve; }); return resolver(); });
  await waiting;
  input.account.ownerId = 'other'; input.account.source.actorId = 'other'; input.references.actorIds.push('foreign');
  (input.importArchives[0] as { raw: string }).raw = 'changed'; input.operations.length = 0;
  release(); const result = await output;
  for (const key of ['account', 'references', 'operations', 'importArchives', 'createdAt'] as const) assert.deepEqual(result[key], expected[key]);
  assert((await validateAccountBackup(canonicalJson(result), owner)).ok);
});
