import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeBackupFile } from '../../lib/flow/integrated-poc/alpha-preservation/file-codec';
import { mkdtemp, writeFile, readFile, unlink, rmdir, link, truncate } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ALPHA_SCHEMA } from '../../lib/flow/integrated-poc/alpha-persistence/contract';
import { canonicalJson, hashJson } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { createAccountBackup } from '../../lib/flow/integrated-poc/alpha-preservation/backup';
import { SEALED_BACKUP_SCHEMA } from '../../lib/flow/integrated-poc/alpha-preservation/contract';
import { PROGRAM_SCHEMA } from '../../lib/flow/integrated-poc/contract';
import { createProgramPrivateSpace } from '../../lib/flow/integrated-poc/program-data';
import { emptyAlphaReferences } from '../../lib/flow/integrated-poc/alpha-social/projection';
import { inspectPersonalBackup, checkPersonalBackupFiles, parseBackupCheckArgs } from './m7-personal-backup-check';
import { buildCatalogLibrarySnapshot } from '../../lib/flow/integrated-poc/catalog-library-source';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const original = '개인원문-DO-NOT-PRINT\r\n  그대로  ';
async function fixture() {
  const backup = await createAccountBackup({
    account: { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0,
      source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] },
    references: emptyAlphaReferences(owner), operations: [], importArchives: [{ original,
      photo: { id: 'inline-photo', dataUrl: 'data:image/png;base64,AQID' } }], createdAt: '2026-09-23T03:30:00.000Z',
  }, async () => { throw Error('network-not-allowed'); });
  return { schema: SEALED_BACKUP_SCHEMA, backup, proof: 'a'.repeat(64) };
}
const bytes = (value: unknown) => Buffer.from(canonicalJson(value));

test('compressed file retains original integrity, owner checks and uncompressed restore request limits', async () => {
  const raw = canonicalJson(await fixture()), packed = await encodeBackupFile(raw);
  const legacy = await inspectPersonalBackup(Buffer.from(raw), owner), compressed = await inspectPersonalBackup(Buffer.from(packed), owner);
  assert(legacy.ok && compressed.ok);
  assert.equal(compressed.decodedFileSha256, legacy.fileSha256); assert.notEqual(compressed.fileSha256, legacy.fileSha256);
  assert.equal(compressed.payloadSha256, legacy.payloadSha256); assert.equal(compressed.restoreRequestBytes, legacy.restoreRequestBytes);
  assert.equal(compressed.serverSeal, 'format-only-not-authenticated');
  assert.deepEqual(await inspectPersonalBackup(Buffer.from(packed), other), { ok: false, reason: 'owner-mismatch' });
});

test('offline integrity exposes counts/hashes, not content, owner or a false server-authenticity claim', async () => {
  const input = await fixture(), before = canonicalJson(input);
  const result = await inspectPersonalBackup(bytes(input), owner); assert(result.ok);
  assert.equal(result.counts.files, 1); assert.equal(result.counts.fileBytes, 3);
  assert.equal(result.counts.importArchives, 1); assert.equal(result.ownerCheck, 'matches-expected');
  assert.equal(result.serverSeal, 'format-only-not-authenticated'); assert.equal(result.serverPreviewRequired, true);
  assert.equal(result.independentStorage, 'not-verified'); assert.equal(result.encrypted, false);
  assert.equal(result.privateSpaceSha256, await hashJson(input.backup.account.space));
  assert.equal(canonicalJson(input), before);
  assert(!JSON.stringify(result).includes(owner)); assert(!JSON.stringify(result).includes('DO-NOT-PRINT'));
});
test('owner is never inferred as an authenticated target when no expected owner is supplied', async () => {
  const result = await inspectPersonalBackup(bytes(await fixture())); assert(result.ok);
  assert.equal(result.ownerCheck, 'not-requested');
});
test('catalog-only backup reports original content separately from text and execution copies without changing bytes', async () => {
  const sealed = await fixture();
  sealed.backup.account.space.catalogLibrary = buildCatalogLibrarySnapshot('2026-09-23T03:30:00.000Z');
  const { integrity: _, ...payload } = sealed.backup;
  sealed.backup.integrity.payloadSha256 = await hashJson(payload);
  const raw = bytes(sealed), before = Buffer.from(raw);
  const result = await inspectPersonalBackup(raw, owner); assert(result.ok);
  assert.deepEqual([result.counts.catalogFlows, result.counts.catalogItems, result.counts.catalogSections, result.counts.catalogMaps, result.counts.catalogVariants], [177, 957, 371, 26, 2]);
  assert.equal(result.counts.documents, 0); assert.equal(result.counts.savedFlows, 0);
  assert.equal(result.counts.creatorWorkingCopies, 0); assert.deepEqual(raw, before);
  for (const hidden of [owner, original, sealed.backup.account.space.catalogLibrary.bundles[0].flow.title]) assert(!JSON.stringify(result).includes(hidden));
});
test('explicit wrong owner and malformed owner are refused', async () => {
  const raw = bytes(await fixture());
  assert.deepEqual(await inspectPersonalBackup(raw, other), { ok: false, reason: 'owner-mismatch' });
  assert.deepEqual(await inspectPersonalBackup(raw, 'email@example.test'), { ok: false, reason: 'invalid-options' });
});
for (const variant of ['schema', 'extra', 'seal', 'digest', 'text', 'missing-image', 'image-bytes', 'secret'] as const) {
  test(`offline check rejects ${variant} without partial summaries`, async () => {
    const value = await fixture();
    const raw: any = value;
    if (variant === 'schema') raw.schema = 'future';
    if (variant === 'extra') raw.extra = true;
    if (variant === 'seal') raw.proof = 'not-a-seal';
    if (variant === 'digest') raw.backup.integrity.payloadSha256 = '0'.repeat(64);
    if (variant === 'text') raw.backup.importArchives[0].original += 'changed';
    if (variant === 'missing-image') raw.backup.files = [];
    if (variant === 'image-bytes') raw.backup.files[0].base64 = 'AQIE';
    if (variant === 'secret') raw.backup.importArchives[0].password = 'DO-NOT-PRINT';
    assert.deepEqual(await inspectPersonalBackup(bytes(raw)), { ok: false, reason: 'invalid-backup' });
  });
}
test('malformed JSON and invalid UTF-8 are rejected rather than repaired', async () => {
  for (const raw of [Buffer.from('{'), Buffer.from([0xff, 0xfe]), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes(await fixture())])]) {
    assert.deepEqual(await inspectPersonalBackup(raw), { ok: false, reason: 'invalid-backup' });
  }
});
test('escape-heavy bounded backup can restore by compressed transport without increasing the file limit', async () => {
  const value = await fixture(); value.backup.importArchives = [{ original: '\\'.repeat(7_500_000) }]; value.backup.files = [];
  const { integrity: _, ...payload } = value.backup; value.backup.integrity.payloadSha256 = await hashJson(payload);
  const raw = bytes(value); assert(raw.byteLength < 30_000_000);
  const checked = await inspectPersonalBackup(raw); assert(checked.ok);
  assert.equal(checked.restoreEncoding, 'sourceFile'); assert(checked.restoreRequestBytes < 30_000_000);
  assert.deepEqual(await inspectPersonalBackup(new Uint8Array(30_000_001)), { ok: false, reason: 'limit' });
});
test('explicit files remain byte-exact, aliases are not a second copy, and mismatches fail', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'flowme-m72-backup-check-'));
  const primary = path.join(directory, 'private-original.json'), copy = path.join(directory, 'private-copy.json'), alias = path.join(directory, 'alias.json');
  const owned: string[] = [];
  t.after(async () => { for (const file of owned) await unlink(file); await rmdir(directory); });
  const raw = bytes(await fixture());
  await writeFile(primary, raw, { flag: 'wx' }); owned.push(primary);
  await writeFile(copy, raw, { flag: 'wx' }); owned.push(copy);
  const one = await checkPersonalBackupFiles({ backupPath: primary }); assert(one.ok); assert.equal(one.copy, 'not-provided');
  const two = await checkPersonalBackupFiles({ backupPath: primary, copyPath: copy, expectedOwner: owner }); assert(two.ok);
  assert.equal(two.copy, 'byte-identical-separate-file'); assert.equal(two.independentStorage, 'not-verified');
  assert(!JSON.stringify(two).includes(directory));
  assert.deepEqual(await checkPersonalBackupFiles({ backupPath: primary, copyPath: primary }), { ok: false, reason: 'same-file' });
  await link(primary, alias); owned.push(alias);
  assert.deepEqual(await checkPersonalBackupFiles({ backupPath: primary, copyPath: alias }), { ok: false, reason: 'same-file' });
  await writeFile(copy, Buffer.concat([raw, Buffer.from('\n')]));
  assert.deepEqual(await checkPersonalBackupFiles({ backupPath: primary, copyPath: copy }), { ok: false, reason: 'copy-mismatch' });
  assert.deepEqual(await readFile(primary), raw);
  assert.deepEqual(await checkPersonalBackupFiles({ backupPath: directory }), { ok: false, reason: 'unreadable-file' });
  assert.deepEqual(await checkPersonalBackupFiles({ backupPath: path.join(directory, 'missing') }), { ok: false, reason: 'unreadable-file' });
});
test('CLI arguments require an explicit file and reject silent extras/duplicates', () => {
  assert.deepEqual(parseBackupCheckArgs(['--backup', 'one file.json', '--copy', 'copy.json', '--expected-owner', owner]), {
    backupPath: 'one file.json', copyPath: 'copy.json', expectedOwner: owner });
  for (const args of [[], ['file.json'], ['--backup'], ['--backup', 'a', '--backup', 'b'], ['--backup', 'a', '--upload', 'b'],
    ['--copy', 'b'], ['--backup', '--copy'], ['--backup', 'a', '--expected-owner', 'bad']]) assert.equal(parseBackupCheckArgs(args), null);
});
test('CLI failure is nonzero and never echoes a private path or raw contents', () => {
  const child = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/alpha/m7-personal-backup-check.ts', '--backup', 'DO-NOT-PRINT/missing.json'], { encoding: 'utf8', timeout: 30_000, windowsHide: true });
  assert.equal(child.status, 1, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), { ok: false, reason: 'unreadable-file' });
  assert(!`${child.stdout}${child.stderr}`.includes('DO-NOT-PRINT'));
});
test('CLI success preserves privacy and requires server preview despite a formatted fake seal', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'flowme-m72-backup-cli-'));
  const file = path.join(directory, 'DO-NOT-PRINT.json');
  t.after(async () => { await unlink(file); await rmdir(directory); });
  const raw = bytes(await fixture()); await writeFile(file, raw, { flag: 'wx' });
  const child = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/alpha/m7-personal-backup-check.ts', '--backup', file, '--expected-owner', owner], { encoding: 'utf8', timeout: 30_000, windowsHide: true });
  assert.equal(child.status, 0, child.stderr); const result = JSON.parse(child.stdout);
  assert.equal(result.ok, true); assert.equal(result.serverPreviewRequired, true);
  assert.equal(result.serverSeal, 'format-only-not-authenticated'); assert.equal(result.ownerCheck, 'matches-expected');
  assert.equal(result.copy, 'not-provided'); assert.equal(result.independentStorage, 'not-verified');
  for (const privateValue of [owner, directory, 'DO-NOT-PRINT']) assert(!`${child.stdout}${child.stderr}`.includes(privateValue));
  assert.deepEqual(await readFile(file), raw);
});
test('oversized disk file is rejected before reading or parsing its contents', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'flowme-m72-backup-limit-'));
  const file = path.join(directory, 'large.json');
  t.after(async () => { await unlink(file); await rmdir(directory); });
  await writeFile(file, '', { flag: 'wx' }); await truncate(file, 30_000_001);
  assert.deepEqual(await checkPersonalBackupFiles({ backupPath: file }), { ok: false, reason: 'limit' });
});
