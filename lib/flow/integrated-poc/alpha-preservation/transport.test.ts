import assert from 'node:assert/strict';
import test from 'node:test';
import { accountBackupRestoreRequestBytes, PRESERVATION_PROTOCOL } from './contract';
import { decodeBackupFile } from './file-codec';
import { accountBackupRestoreTransportBytes, preparePreservationWireRequest } from './transport';

test('small legacy preservation requests retain identity and exact reserved byte count', async () => {
  const sourceRaw = JSON.stringify({ schema: 'flowme-alpha-sealed-account-backup/1', backup: { text: '작은 원문\r\n' }, proof: 'a'.repeat(64) });
  for (const input of [{ kind: 'preview', client: 1, mode: 'restore', sourceRaw, actorId: '' },
    { kind: 'commit', command: { mode: 'restore' }, sourceRaw }, { kind: 'preview', mode: 'import', sourceRaw }]) {
    assert.equal(await preparePreservationWireRequest(input), input);
  }
  assert.deepEqual(await accountBackupRestoreTransportBytes(sourceRaw), { bytes: accountBackupRestoreRequestBytes(sourceRaw), encoding: 'sourceRaw' });
});

test('escape-heavy bounded restore uses exact compressed transport without raising either limit', async () => {
  // One shared large fixture: about 18 MB expanded, over 30 MB when JSON-escaped.
  // Its fake seal is deliberately not authenticated: this tests only transport.
  const raw = JSON.stringify({ schema: 'flowme-alpha-sealed-account-backup/1', backup: { text: '"'.repeat(9_000_000) }, proof: 'a'.repeat(64) });
  assert(Buffer.byteLength(raw) < 26_000_000);
  assert(accountBackupRestoreRequestBytes(raw) > PRESERVATION_PROTOCOL.bytes);
  const input = { kind: 'preview', client: 1, mode: 'restore', sourceRaw: raw, actorId: '' };
  const compressed = await preparePreservationWireRequest(input);
  assert.equal(input.sourceRaw, raw);
  assert(!Object.hasOwn(compressed, 'sourceRaw'));
  assert.equal(typeof compressed.sourceFile, 'string');
  assert(Buffer.byteLength(JSON.stringify(compressed)) < PRESERVATION_PROTOCOL.bytes);
  assert.equal(await decodeBackupFile(compressed.sourceFile as string), raw);
  const budget = await accountBackupRestoreTransportBytes(raw);
  assert.equal(budget.encoding, 'sourceFile');
  const reserved = { kind: 'commit', client: PRESERVATION_PROTOCOL.client,
    command: { schema: PRESERVATION_PROTOCOL.schema, kind: 'preservation', requestId: '\u0000'.repeat(160),
      expectedRevision: Number.MAX_SAFE_INTEGER, expectedPublicRevision: Number.MAX_SAFE_INTEGER,
      mode: 'restore', sourceSha256: 'a'.repeat(64) }, sourceFile: compressed.sourceFile, actorId: 'a'.repeat(36) };
  assert.equal(budget.bytes, Buffer.byteLength(JSON.stringify(reserved)));
  await assert.rejects(preparePreservationWireRequest({ ...input, mode: 'import' }), /preservation-request-limit/);
  await assert.rejects(preparePreservationWireRequest({ ...input, kind: 'unknown' }), /preservation-request-limit/);
  await assert.rejects(preparePreservationWireRequest({ ...input, sourceFile: compressed.sourceFile }), /preservation-request-limit/);
  await assert.rejects(preparePreservationWireRequest({ ...input, padding: 'x'.repeat(PRESERVATION_PROTOCOL.bytes) }), /preservation-request-limit/);
  const oversized = JSON.stringify({ schema: 'flowme-alpha-sealed-account-backup/1', backup: { text: 'x'.repeat(PRESERVATION_PROTOCOL.bytes) }, proof: 'a'.repeat(64) });
  await assert.rejects(preparePreservationWireRequest({ ...input, sourceRaw: oversized }), /backup-file-limit/);
  await assert.rejects(accountBackupRestoreTransportBytes(oversized), /backup-file-limit/);
});
