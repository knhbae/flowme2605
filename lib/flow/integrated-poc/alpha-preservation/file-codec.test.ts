import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { BACKUP_FILE_LIMITS, BACKUP_FILE_SCHEMA, decodeBackupFile, encodeBackupFile } from './file-codec';
const raw = JSON.stringify({ schema: 'flowme-alpha-sealed-account-backup/1', backup: { text: '원문\r\n'.repeat(1000) }, proof: 'a'.repeat(64) }, null, 2);
test('gzip file preserves exact UTF-8 including spacing, Korean and CRLF escapes', async () => {
  const packed = await encodeBackupFile(raw); assert(Buffer.byteLength(packed) < Buffer.byteLength(raw));
  assert.equal(await decodeBackupFile(packed), raw); assert.deepEqual(Buffer.from(await decodeBackupFile(packed)), Buffer.from(raw));
});
test('legacy sealed and local import JSON are returned byte-for-byte without codec availability', async () => {
  const previous = globalThis.DecompressionStream; Object.defineProperty(globalThis, 'DecompressionStream', { configurable: true, value: undefined });
  try { assert.equal(await decodeBackupFile(raw), raw); assert.equal(await decodeBackupFile('{ "legacy":true }'), '{ "legacy":true }'); }
  finally { Object.defineProperty(globalThis, 'DecompressionStream', { configurable: true, value: previous }); }
});
test('damaged hash, declared length, truncated gzip, extra properties and unknown encoding reject', async () => {
  const original = JSON.parse(await encodeBackupFile(raw));
  for (const patch of [{ sha256: '0'.repeat(64) }, { bytes: original.bytes - 1 }, { bytes: original.bytes + 1 },
    { bytes: 0 }, { bytes: BACKUP_FILE_LIMITS.expandedBytes + 1 }, { encoding: 'brotli' }, { extra: true }, { data: original.data.slice(0, -4) }]) {
    await assert.rejects(decodeBackupFile(JSON.stringify({ ...original, ...patch })));
  }
});
test('declared expansion bound stops a highly compressed bomb without collecting its full output', async () => {
  const gzip = gzipSync(Buffer.alloc(2_000_000, 65)).toString('base64');
  await assert.rejects(decodeBackupFile(JSON.stringify({ schema: BACKUP_FILE_SCHEMA, encoding: 'gzip-base64', bytes: 100, sha256: '0'.repeat(64), data: gzip })), /backup-file-limit/);
});
test('absolute input bounds reject oversized files and raw data without increasing existing limit', async () => {
  await assert.rejects(decodeBackupFile(' '.repeat(BACKUP_FILE_LIMITS.fileBytes + 1)), /backup-file-limit/);
  await assert.rejects(encodeBackupFile(' '.repeat(BACKUP_FILE_LIMITS.expandedBytes + 1)), /backup-file-limit/);
});
test('unsupported browser encoder fails explicitly and does not create a fallback file', async () => {
  const previous = globalThis.CompressionStream; Object.defineProperty(globalThis, 'CompressionStream', { configurable: true, value: undefined });
  try { await assert.rejects(encodeBackupFile(raw), /backup-codec-unavailable/); }
  finally { Object.defineProperty(globalThis, 'CompressionStream', { configurable: true, value: previous }); }
});
test('arbitrary payloads and nested codec wrappers cannot be encoded as account backups', async () => {
  await assert.rejects(encodeBackupFile('{}')); await assert.rejects(encodeBackupFile(await encodeBackupFile(raw)));
  await assert.rejects(encodeBackupFile(raw + '\ud800'));
});
