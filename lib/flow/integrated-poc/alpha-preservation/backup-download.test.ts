import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramPrivateSpace } from '../program-data';
import { canonicalJson } from '../alpha-persistence/json';
import { emptyAlphaReferences } from '../alpha-social/projection';
import { createAccountBackup } from './backup';
import { SEALED_BACKUP_SCHEMA } from './contract';
import { encodeBackupFile, decodeBackupFile } from './file-codec';
import { BACKUP_DOWNLOAD_FORMAT, BACKUP_DOWNLOAD_SCHEMA, readBackupDownload } from './backup-download';

const owner = '11111111-1111-4111-8111-111111111111';
const createdAt = '2026-09-20T00:01:02.003Z';
async function fixture() {
  const backup = await createAccountBackup({ account: { schema: 'flowme-alpha-account/1', ownerId: owner, revision: 0,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] },
    references: emptyAlphaReferences(owner), operations: [], importArchives: [], createdAt }, async () => { throw Error('unexpected-media'); });
  // Deliberately not an authenticated seal. Browser-side syntax validation cannot authenticate one.
  const sealed = { schema: SEALED_BACKUP_SCHEMA, backup, proof: '0'.repeat(64) };
  const raw = canonicalJson(sealed), file = await encodeBackupFile(raw);
  return { sealed, raw, file, value: { schema: BACKUP_DOWNLOAD_SCHEMA, file } };
}

test('checked download preserves exact supplied file bytes and recorded backup date', async () => {
  const f = await fixture();
  // Whitespace makes accidental parse-and-regeneration observable.
  const file = JSON.stringify(JSON.parse(f.file), null, 2);
  const result = await readBackupDownload({ schema: BACKUP_DOWNLOAD_SCHEMA, file }, owner);
  assert.equal(result.file, file); assert.equal(result.raw, f.raw);
  assert.equal(await decodeBackupFile(result.file), f.raw); assert.equal(result.createdAt, createdAt);
  assert.equal(result.backup.createdAt, createdAt); assert.equal(BACKUP_DOWNLOAD_FORMAT, 'checked-file-v1');
});

test('checked compressed file needs no CompressionStream and is never recompressed', async () => {
  const f = await fixture(), descriptor = Object.getOwnPropertyDescriptor(globalThis, 'CompressionStream')!;
  Object.defineProperty(globalThis, 'CompressionStream', { configurable: true, value: undefined });
  try { const result = await readBackupDownload(f.value, owner); assert.equal(result.file, f.file); assert.equal(result.raw, f.raw); }
  finally { Object.defineProperty(globalThis, 'CompressionStream', descriptor); }
});

test('legacy sealed response remains compatible and uses its recorded date', async () => {
  const f = await fixture(), result = await readBackupDownload(f.sealed, owner);
  assert.equal(await decodeBackupFile(result.file), f.raw); assert.equal(result.createdAt, createdAt);
  assert.deepEqual(result.backup, f.sealed.backup);
});

test('64-hex seal shape is not presented as browser authentication', async () => {
  const f = await fixture(), result = await readBackupDownload(f.value, owner);
  assert.equal(result.proof, '0'.repeat(64));
  assert(!Object.hasOwn(result, 'authenticated')); assert(!Object.hasOwn(result, 'sealVerified'));
  await assert.rejects(readBackupDownload({ ...f.sealed, proof: 'not-a-seal' }, owner));
});

test('foreign owner, damaged backup and damaged compressed file are rejected', async () => {
  const f = await fixture();
  await assert.rejects(readBackupDownload(f.value, '22222222-2222-4222-8222-222222222222'));
  const changed = structuredClone(f.sealed); changed.backup.account.revision = 1;
  await assert.rejects(readBackupDownload(changed, owner));
  const damaged = JSON.parse(f.file); damaged.sha256 = 'f'.repeat(64);
  await assert.rejects(readBackupDownload({ schema: BACKUP_DOWNLOAD_SCHEMA, file: JSON.stringify(damaged) }, owner));
});

test('wrong or extra wrapper fields and uncompressed checked-file payload are rejected', async () => {
  const f = await fixture();
  for (const value of [{ ...f.value, extra: true }, { ...f.value, schema: 'unknown' }, { ...f.value, file: null },
    { schema: BACKUP_DOWNLOAD_SCHEMA, file: f.raw }, { schema: BACKUP_DOWNLOAD_SCHEMA, file: '' }, {}, null])
    await assert.rejects(readBackupDownload(value, owner));
});

test('empty or impossible backup date is never converted into today', async () => {
  const f = await fixture();
  for (const invalid of ['', '2026-02-30T00:00:00.000Z']) {
    const sealed = structuredClone(f.sealed); sealed.backup.createdAt = invalid;
    await assert.rejects(readBackupDownload(sealed, owner));
    await assert.rejects(readBackupDownload({ schema: BACKUP_DOWNLOAD_SCHEMA, file: await encodeBackupFile(canonicalJson(sealed)) }, owner));
  }
});
