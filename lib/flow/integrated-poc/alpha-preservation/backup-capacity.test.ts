import test from 'node:test';
import assert from 'node:assert/strict';
import { ALPHA_SCHEMA, type AlphaAccount } from '../alpha-persistence/contract';
import { canonicalJson } from '../alpha-persistence/json';
import { PROGRAM_SCHEMA } from '../contract';
import { createProgramPrivateSpace } from '../program-data';
import { ALPHA_SOCIAL_CONTEXT_SCHEMA, alphaSocialReferences, type AlphaSocialContext } from '../alpha-social/projection';
import { createAccountBackup, type AccountBackupMediaResolver } from './backup';
import { SEALED_BACKUP_SCHEMA } from './contract';
import { encodeBackupFile, decodeBackupFile } from './file-codec';
import { accountBackupRestoreTransportBytes } from './transport';
import { evaluateSqlReadBudget, inspectBackupCapacity, prepareBackupCapacity, type BackupCapacityReport, type SqlReadBudget } from './backup-capacity';

const owner = '11111111-1111-4111-8111-111111111111', now = '2026-09-24T00:00:00.000Z';
const alias = 'member-22222222-2222-4222-8222-222222222222';
const proof = 'abcd'.repeat(16), sealDigest = async () => proof;
const noMedia: AccountBackupMediaResolver = async () => { throw Error('unexpected-media'); };
const bytes = (value: unknown) => Buffer.byteLength(canonicalJson(value));
const gate = (report: BackupCapacityReport, name: string) => { const found = report.checks.find(row => row.gate === name); assert(found, name); return found; };
function fixture() {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0,
    source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] };
  const context: AlphaSocialContext = { schema: ALPHA_SOCIAL_CONTEXT_SCHEMA, revision: 0, ownActorId: alias,
    actors: [{ id: alias, name: '테스트 👋' }], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
  const value = { account, context, operations: [] as unknown[], importArchives: [] as unknown[] };
  return { value, raw: () => JSON.stringify({ ok: true, value }), backupInput: () => ({ account, references: alphaSocialReferences(context, owner),
    operations: value.operations, importArchives: value.importArchives, createdAt: now }) };
}
const inspect = (rawReadResponse: string, resolveMedia = noMedia, sqlBudget?: SqlReadBudget) =>
  inspectBackupCapacity({ rawReadResponse, ownerId: owner, createdAt: now, sqlBudget }, { resolveMedia, sealDigest });
const mediaId = (n: number) => `media-33333333-3333-4333-8333-${String(n).padStart(12, '0')}`;
const mediaRef = (n: number) => ({ id: mediaId(n), dataUrl: `flowme-media:${mediaId(n)}` });

test('successful preparation returns the exact measured file and fixed-date sealed backup, not report content', async () => {
  const f = fixture(), input = { rawReadResponse: f.raw(), ownerId: owner, createdAt: now,
    sqlBudget: { pairedValueBytes: 2000, operationRowBytes: [], archiveRowBytes: [] } };
  let seals = 0;
  const result = await prepareBackupCapacity(input, { resolveMedia: noMedia, sealDigest: async () => {
    seals++; input.createdAt = '2027-01-01T00:00:00.000Z'; return proof;
  } });
  assert.equal(result.report.status, 'passed'); assert(result.artifact); assert.equal(seals, 1);
  assert.equal(result.artifact.createdAt, now); assert.equal(JSON.parse(result.artifact.raw).backup.createdAt, now);
  assert.equal(await decodeBackupFile(result.artifact.file), result.artifact.raw);
  assert.equal(Buffer.byteLength(result.artifact.raw), gate(result.report, 'sealed-backup').actual);
  assert.equal(Buffer.byteLength(result.artifact.file), gate(result.report, 'download-file').actual);
  assert.equal((await accountBackupRestoreTransportBytes(result.artifact.raw)).bytes, gate(result.report, 'restore-request').actual);
  for (const sensitive of [owner, proof, result.artifact.raw, result.artifact.file]) assert(!JSON.stringify(result.report).includes(sensitive));
  const diagnostic = await inspectBackupCapacity({ ...input, createdAt: now }, { resolveMedia: noMedia, sealDigest });
  assert.deepEqual(diagnostic, result.report); assert(!Object.hasOwn(diagnostic, 'artifact'));
});

test('compressed-transport preparation encodes once and preserves that exact output', async () => {
  const f = fixture(); f.value.importArchives = [{ raw: '\\'.repeat(7_500_000) }];
  const NativeCompressionStream = globalThis.CompressionStream; let encodes = 0;
  globalThis.CompressionStream = class extends NativeCompressionStream {
    constructor(format: CompressionFormat) { encodes++; super(format); }
  };
  let result: Awaited<ReturnType<typeof prepareBackupCapacity>>;
  try {
    result = await prepareBackupCapacity({ rawReadResponse: f.raw(), ownerId: owner, createdAt: now,
      sqlBudget: { pairedValueBytes: 2000, operationRowBytes: [], archiveRowBytes: [15_000_050] } }, { resolveMedia: noMedia, sealDigest });
  } finally { globalThis.CompressionStream = NativeCompressionStream; }
  assert.equal(encodes, 1); assert.equal(result!.report.status, 'passed'); assert(result!.artifact);
  assert.equal(result!.report.restoreEncoding, 'sourceFile');
  assert.equal(await decodeBackupFile(result!.artifact.file), result!.artifact.raw);
  assert.equal(gate(result!.report, 'restore-request').actual, (await accountBackupRestoreTransportBytes(result!.artifact.raw)).bytes);
});

test('unmeasured or rejected preparation never returns any partial artifact', async () => {
  const f = fixture(), input = { rawReadResponse: f.raw(), ownerId: owner, createdAt: now };
  const unmeasured = await prepareBackupCapacity(input, { resolveMedia: noMedia, sealDigest });
  assert.equal(unmeasured.report.status, 'incomplete'); assert(!Object.hasOwn(unmeasured, 'artifact'));
  const failed = await prepareBackupCapacity({ ...input, sqlBudget: { pairedValueBytes: 30_000_000, operationRowBytes: [], archiveRowBytes: [] } },
    { resolveMedia: noMedia, sealDigest });
  assert.equal(failed.report.status, 'failed'); assert(!Object.hasOwn(failed, 'artifact'));
  const badSeal = await prepareBackupCapacity({ ...input, sqlBudget: { pairedValueBytes: 2000, operationRowBytes: [], archiveRowBytes: [] } },
    { resolveMedia: noMedia, sealDigest: async () => 'bad-proof' });
  assert.equal(badSeal.report.status, 'failed'); assert(!Object.hasOwn(badSeal, 'artifact'));
});

test('seal-wrapper capacity boundary cannot expose a partial prepared artifact', async () => {
  const f = fixture(); f.value.importArchives = [{ raw: '' }];
  const base = await createAccountBackup(f.backupInput(), noMedia);
  f.value.importArchives = [{ raw: 'a'.repeat(30_000_000 - bytes(base) - 1) }];
  const result = await prepareBackupCapacity({ rawReadResponse: f.raw(), ownerId: owner, createdAt: now,
    sqlBudget: { pairedValueBytes: 2000, operationRowBytes: [], archiveRowBytes: [29_990_000] } }, { resolveMedia: noMedia, sealDigest });
  assert.deepEqual(result.report.failure, { stage: 'sealed-backup', reason: 'limit-exceeded' });
  assert(!Object.hasOwn(result, 'artifact'));
});

test('SQL measurement absence stays incomplete, despite complete downstream encoding', async () => {
  const report = await inspect(fixture().raw());
  assert.equal(report.status, 'incomplete'); assert.equal(gate(report, 'sql-read').status, 'unmeasured');
  assert.equal(gate(report, 'download-file').status, 'passed'); assert.equal(gate(report, 'restore-request').status, 'passed');
  assert.deepEqual(report.assurance, { scope: 'provided-snapshot-only', sqlMeasurements: 'not-supplied', snapshotConsistency: 'not-rechecked',
    atomicWriteGuard: false, sealAuthentication: 'not-verified', restoration: 'not-tested' });
});
test('caller mutation while sealing cannot turn unmeasured SQL evidence into a pass', async () => {
  const input: Parameters<typeof inspectBackupCapacity>[0] = { rawReadResponse: fixture().raw(), ownerId: owner, createdAt: now };
  const report = await inspectBackupCapacity(input, { resolveMedia: noMedia, sealDigest: async () => {
    input.sqlBudget = { pairedValueBytes: 2000, operationRowBytes: [], archiveRowBytes: [] }; return proof;
  } });
  assert.equal(report.status, 'incomplete'); assert.equal(gate(report, 'sql-read').status, 'unmeasured');
  assert.equal(report.assurance.sqlMeasurements, 'not-supplied');
});
test('input accessors are never executed and hostile input errors are sanitized', async () => {
  let calls = 0;
  const input = { rawReadResponse: fixture().raw(), ownerId: owner, createdAt: now };
  Object.defineProperty(input, 'sqlBudget', { enumerable: true, get() { calls++; throw Error('PRIVATE_GETTER_ERROR'); } });
  const report = await inspectBackupCapacity(input, { resolveMedia: noMedia, sealDigest });
  assert.equal(calls, 0); assert.equal(report.status, 'failed');
  assert.deepEqual(report.failure, { stage: 'input', reason: 'invalid-input' });
  assert(!JSON.stringify(report).includes('PRIVATE_GETTER_ERROR'));
});
test('caller mutation during media resolution cannot change the validated owner or measured budget', async () => {
  const f = fixture(); f.value.importArchives = [mediaRef(1)];
  const input: Parameters<typeof inspectBackupCapacity>[0] = { rawReadResponse: f.raw(), ownerId: owner, createdAt: now,
    sqlBudget: { pairedValueBytes: 2000, operationRowBytes: [], archiveRowBytes: [100] } };
  const report = await inspectBackupCapacity(input, { resolveMedia: async () => {
    input.ownerId = '44444444-4444-4444-8444-444444444444'; input.sqlBudget = undefined;
    return { mime: 'image/webp', bytes: new Uint8Array([1]) };
  }, sealDigest: async id => { assert.equal(id, owner); return proof; } });
  assert.equal(report.status, 'passed'); assert.equal(gate(report, 'sql-read').actual, 2230);
  assert.equal(report.assurance.sqlMeasurements, 'caller-supplied');
});
test('all downstream byte counts equal real backup, seal, file codec and transport, with no content returned', async () => {
  const f = fixture(), original = f.raw();
  // Synthetic metadata tests report aggregation only; actual PG measurements have a separate engine test.
  const report = await inspect(original, noMedia, { pairedValueBytes: 2000, operationRowBytes: [], archiveRowBytes: [] });
  const backup = await createAccountBackup(f.backupInput(), noMedia), sealed = { schema: SEALED_BACKUP_SCHEMA, backup, proof }, raw = canonicalJson(sealed);
  assert.equal(report.status, 'passed'); assert.equal(gate(report, 'sql-read').actual, 2128);
  assert.equal(gate(report, 'account-backup').actual, bytes(backup)); assert.equal(gate(report, 'sealed-backup').actual, Buffer.byteLength(raw));
  const file = await encodeBackupFile(raw); assert.equal(await decodeBackupFile(file), raw);
  assert.equal(gate(report, 'download-file').actual, Buffer.byteLength(file));
  assert.equal(gate(report, 'restore-request').actual, (await accountBackupRestoreTransportBytes(raw)).bytes);
  assert.equal(gate(report, 'api-response').actual, Buffer.byteLength(JSON.stringify({ ok: true, value: sealed })));
  assert.equal(gate(report, 'api-response').status, 'observed'); assert.equal(gate(report, 'api-response').limit, undefined);
  assert.equal(report.assurance.sealAuthentication, 'not-verified');
  const summary = JSON.stringify(report); for (const privateValue of [owner, alias, proof, '테스트', backup.integrity.payloadSha256]) assert(!summary.includes(privateValue));
  assert.equal(f.raw(), original);
});
test('raw RPC whitespace and UTF8/escape bytes are distinct from canonical JSON', async () => {
  const f = fixture(); f.value.importArchives = [{ raw: '비공개👋\\\"\n\t\u0001' }];
  const compact = await inspect(f.raw()), pretty = await inspect(JSON.stringify(JSON.parse(f.raw()), null, 2));
  assert(gate(pretty, 'rpc-wire').actual! > gate(compact, 'rpc-wire').actual!);
  assert.equal(gate(pretty, 'canonical-read').actual, gate(compact, 'canonical-read').actual);
  assert.equal(pretty.metrics.archivesBytes, bytes(f.value.importArchives));
  assert.equal(gate(pretty, 'sealed-backup').actual, gate(compact, 'sealed-backup').actual);
});
for (const delta of [-1, 0, 1]) test(`SQL guard threshold ${delta}: exact fixed overhead and row separators`, async () => {
  const sqlBudget = { pairedValueBytes: 30_000_000 - 128 + delta, operationRowBytes: [], archiveRowBytes: [] };
  assert.equal(evaluateSqlReadBudget(sqlBudget, { operations: 0, archives: 0 }), 30_000_000 + delta);
  const report = await inspect(fixture().raw(), noMedia, sqlBudget);
  assert.equal(report.status, delta > 0 ? 'failed' : 'passed');
  assert.equal(gate(report, 'sql-read').actual, 30_000_000 + delta);
});
test('SQL counts and row-byte measurements include two bytes per ledger/archive row', () => {
  assert.equal(evaluateSqlReadBudget({ pairedValueBytes: 99, operationRowBytes: [100, 200], archiveRowBytes: [300] }, { operations: 2, archives: 1 }), 833);
});
test('malformed/mismatched/overflow SQL evidence cannot report a pass', async () => {
  const f = fixture();
  for (const sqlBudget of [
    { pairedValueBytes: -1, operationRowBytes: [], archiveRowBytes: [] },
    { pairedValueBytes: 1.5, operationRowBytes: [], archiveRowBytes: [] },
    { pairedValueBytes: Number.MAX_SAFE_INTEGER, operationRowBytes: [], archiveRowBytes: [] },
    { pairedValueBytes: 1, operationRowBytes: [5], archiveRowBytes: [] },
    { pairedValueBytes: 1, operationRowBytes: [], archiveRowBytes: [-1] },
    { pairedValueBytes: 1, operationRowBytes: [], archiveRowBytes: [], extra: true },
  ]) {
    const report = await inspect(f.raw(), noMedia, sqlBudget);
    assert.equal(report.status, 'failed'); assert.deepEqual(report.failure, { stage: 'sql-read', reason: 'invalid-sql-budget' });
  }
});
for (const count of [127, 128, 129]) test(`archive count ${count} preserves the existing backup limit`, async () => {
  const f = fixture(); f.value.importArchives = Array.from({ length: count }, (_, n) => ({ raw: `보존 ${n}` }));
  const report = await inspect(f.raw());
  assert.equal(gate(report, 'archive-count').status, count <= 128 ? 'passed' : 'failed');
  assert.equal(report.status, count <= 128 ? 'incomplete' : 'failed');
});
for (const count of [99_999, 100_000, 100_001]) test(`operation count gate only ${count}: invalid rows never become a valid backup`, async () => {
  const f = fixture(); f.value.operations = Array(count).fill(null);
  const report = await inspect(f.raw());
  assert.equal(gate(report, 'operation-count').status, count <= 100_000 ? 'passed' : 'failed');
  assert.equal(report.status, 'failed'); assert.equal(report.failure?.stage, count <= 100_000 ? 'account-backup' : 'counts');
});
test('ledger evidence is included, while historical photo dependencies are not resolved', async () => {
  const f = fixture(); f.value.account.revision = 1;
  f.value.operations = [{ owner_id: owner, request_id: 'one', command: { schema: 'flowme-alpha-command/1', requestId: 'one', raw: '이력 원문' },
    receipt: { requestId: 'one', changed: true, revision: 1 }, inverse: [mediaRef(1)], undone: false }];
  const report = await inspect(f.raw());
  assert.equal(report.status, 'incomplete'); assert.equal(report.metrics.operationsBytes, bytes(f.value.operations));
  assert.equal(gate(report, 'file-count').actual, 0);
});
test('remote and inline dedup/base64/metadata measured without mutating resolver buffers', async () => {
  const f = fixture(), binary = new Uint8Array(3001).fill(65), original = binary.slice();
  f.value.importArchives = [{ refs: [mediaRef(1), mediaRef(1), { dataUrl: 'data:image/png;base64,YQ==' }, { dataUrl: 'data:image/png;base64,YQ==' }] }];
  let calls = 0; const report = await inspect(f.raw(), async id => { calls++; assert.equal(id, mediaId(1)); return { mime: 'image/webp', bytes: binary }; });
  assert.equal(report.status, 'incomplete'); assert.equal(calls, 1); assert.equal(gate(report, 'file-count').actual, 2);
  assert.equal(report.metrics.fileBinaryBytes, 3002); assert.equal(report.metrics.fileBase64Bytes, 4008);
  assert(report.metrics.filesJsonBytes! > 4008); assert.deepEqual(binary, original);
});
for (const count of [511, 512, 513]) test(`unique current files ${count} use existing file-count validation`, async () => {
  const f = fixture(); f.value.importArchives = [{ files: Array.from({ length: count }, (_, i) => mediaRef(i)) }];
  let calls = 0; const report = await inspect(f.raw(), async () => { calls++; return { mime: 'image/webp', bytes: new Uint8Array([1]) }; });
  assert.equal(report.status, count <= 512 ? 'incomplete' : 'failed'); assert.equal(calls, count <= 512 ? count : 0);
  if (count <= 512) assert.equal(gate(report, 'file-count').actual, count);
});
for (const size of [1_999_999, 2_000_000, 2_000_001]) test(`individual media bytes ${size} preserve 2 MB limit`, async () => {
  const f = fixture(); f.value.importArchives = [mediaRef(1)];
  const report = await inspect(f.raw(), async () => ({ mime: 'image/webp', bytes: new Uint8Array(size) }));
  assert.equal(report.status, size <= 2_000_000 ? 'incomplete' : 'failed');
  if (size <= 2_000_000) assert.equal(gate(report, 'largest-file').actual, size);
});
test('missing media, wrong MIME and resolver secrets are rejected with sanitized reasons', async () => {
  const f = fixture(); f.value.importArchives = [mediaRef(1)];
  for (const resolveMedia of [async () => { throw Error('authorization=PRIVATE_TOKEN'); }, async () => ({ mime: 'image/png', bytes: new Uint8Array([1]) })]) {
    const report = await inspect(f.raw(), resolveMedia); assert.equal(report.status, 'failed');
    assert(!JSON.stringify(report).includes('PRIVATE_TOKEN')); assert.equal(report.failure?.stage, 'account-backup');
  }
});
test('bad owner, date, secret-bearing input and broken payload fail closed', async () => {
  const f = fixture();
  const wrongOwner = await inspectBackupCapacity({ rawReadResponse: f.raw(), ownerId: '44444444-4444-4444-8444-444444444444', createdAt: now }, { resolveMedia: noMedia, sealDigest });
  assert.equal(wrongOwner.status, 'failed');
  const badDate = await inspectBackupCapacity({ rawReadResponse: f.raw(), ownerId: owner, createdAt: 'yesterday' }, { resolveMedia: noMedia, sealDigest });
  assert.equal(badDate.status, 'failed');
  f.value.importArchives = [{ password: 'PRIVATE_PASSWORD' }];
  const secret = await inspect(f.raw()); assert.equal(secret.status, 'failed'); assert(!JSON.stringify(secret).includes('PRIVATE_PASSWORD'));
  for (const raw of ['{broken', '{"ok":false,"reason":"limit"}', '{"ok":true,"value":{}}']) assert.equal((await inspect(raw)).status, 'failed');
});
test('failed or malformed sealing cannot return success or leak the proof/error', async () => {
  for (const seal of [async () => 'short-secret', async () => { throw Error('PRIVATE_SIGNING_KEY'); }]) {
    const report = await inspectBackupCapacity({ rawReadResponse: fixture().raw(), ownerId: owner, createdAt: now }, { resolveMedia: noMedia, sealDigest: seal });
    assert.equal(report.status, 'failed'); assert.equal(report.failure?.stage, 'seal');
    assert(!JSON.stringify(report).includes('PRIVATE_SIGNING_KEY')); assert(!JSON.stringify(report).includes('short-secret'));
  }
});
test('RPC wire cap measures whitespace too, rejects before resolving or sealing', async () => {
  let calls = 0;
  const report = await inspectBackupCapacity({ rawReadResponse: ' '.repeat(30_000_001), ownerId: owner, createdAt: now },
    { resolveMedia: noMedia, sealDigest: async () => { calls++; return proof; } });
  assert.equal(report.status, 'failed'); assert.equal(report.failure?.reason, 'limit-exceeded'); assert.equal(calls, 0);
});
test('escaping-heavy valid snapshot uses actual compressed restore transport, never an estimated ratio', async () => {
  const f = fixture(); f.value.importArchives = [{ raw: '\\'.repeat(7_500_000) }];
  const report = await inspect(f.raw());
  assert.equal(report.status, 'incomplete'); assert.equal(report.restoreEncoding, 'sourceFile');
  assert(gate(report, 'sealed-backup').actual! > 15_000_000);
  assert(gate(report, 'restore-request').actual! < 30_000_000);
});
test('backup succeeds below limit but the final seal wrapper crossing it still fails', async () => {
  const f = fixture(); f.value.importArchives = [{ raw: '' }];
  const base = await createAccountBackup(f.backupInput(), noMedia);
  f.value.importArchives = [{ raw: 'a'.repeat(30_000_000 - bytes(base) - 1) }];
  const report = await inspect(f.raw());
  assert.equal(gate(report, 'account-backup').actual, 29_999_999);
  assert.equal(report.status, 'failed'); assert.deepEqual(report.failure, { stage: 'sealed-backup', reason: 'limit-exceeded' });
});
for (const delta of [-1, 0, 1]) test(`complete sealed UTF8 snapshot at 30 MB ${delta}: exact final wrapper boundary`, async () => {
  const f = fixture(); f.value.importArchives = [{ raw: '' }];
  const base = { schema: SEALED_BACKUP_SCHEMA, backup: await createAccountBackup(f.backupInput(), noMedia), proof };
  f.value.importArchives = [{ raw: 'a'.repeat(30_000_000 + delta - bytes(base)) }];
  const report = await inspect(f.raw());
  if (delta <= 0) {
    assert.equal(report.status, 'incomplete'); assert.equal(gate(report, 'sealed-backup').actual, 30_000_000 + delta);
    assert.equal(report.restoreEncoding, 'sourceFile'); assert.equal(gate(report, 'download-file').status, 'passed');
  } else {
    assert.equal(report.status, 'failed'); assert.deepEqual(report.failure, { stage: 'sealed-backup', reason: 'limit-exceeded' });
  }
});
