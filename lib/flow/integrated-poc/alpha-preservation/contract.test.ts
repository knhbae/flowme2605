import assert from 'node:assert/strict';
import test from 'node:test';
import { accountBackupRestoreRequestBytes, isPreservationCommand, PRESERVATION_PROTOCOL } from './contract';

test('restore transport budget retains the full 30 MB request cap', () => {
  const overhead = accountBackupRestoreRequestBytes('');
  const source = 'a'.repeat(PRESERVATION_PROTOCOL.bytes - overhead);
  assert.equal(accountBackupRestoreRequestBytes(source), PRESERVATION_PROTOCOL.bytes);
  assert.equal(accountBackupRestoreRequestBytes(source + 'a'), PRESERVATION_PROTOCOL.bytes + 1);
});

test('restore transport budget counts escaped JSON and UTF-8 rather than file characters', () => {
  const overhead = accountBackupRestoreRequestBytes('');
  for (const source of ['plain', '한글', '\\"\n\r\t', '🙂']) {
    assert.equal(accountBackupRestoreRequestBytes(source) - overhead, Buffer.byteLength(JSON.stringify(source)) - 2);
  }
});

test('restore transport budget reserves every supported 160-code-unit request ID', () => {
  const sourceRaw = '한글\\"\n';
  const budget = accountBackupRestoreRequestBytes(sourceRaw);
  for (const requestId of ['r'.repeat(160), '한'.repeat(160), '🙂'.repeat(80), '\\'.repeat(160), '\u0000'.repeat(160), '\ud800'.repeat(160)]) {
    const command = {schema:PRESERVATION_PROTOCOL.schema,kind:'preservation',requestId,
      expectedRevision:Number.MAX_SAFE_INTEGER,expectedPublicRevision:Number.MAX_SAFE_INTEGER,
      mode:'restore',sourceSha256:'a'.repeat(64)};
    assert(isPreservationCommand(command));
    const bytes = Buffer.byteLength(JSON.stringify({kind:'commit',client:PRESERVATION_PROTOCOL.client,
      command,sourceRaw,actorId:'a'.repeat(36)}));
    assert(bytes <= budget);
    if (requestId === '\u0000'.repeat(160) || requestId === '\ud800'.repeat(160)) assert.equal(bytes, budget);
  }
});
