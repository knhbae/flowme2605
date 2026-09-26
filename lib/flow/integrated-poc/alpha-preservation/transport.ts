import { accountBackupRestoreRequestBytes, PRESERVATION_PROTOCOL } from './contract';
import { encodeBackupFile } from './file-codec';

/** Bounded transport only. This does not authenticate a server seal, authorize
 * restoration, change backup content, or bypass the expanded file limit. */
const requestBytes = (value: Record<string, unknown>) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export async function preparePreservationWireRequest(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (requestBytes(input) <= PRESERVATION_PROTOCOL.bytes) return input;
  const restore = input.kind === 'preview' && input.mode === 'restore'
    || input.kind === 'commit' && record(input.command) && input.command.mode === 'restore';
  if (!restore || typeof input.sourceRaw !== 'string' || Object.hasOwn(input, 'sourceFile')) throw Error('preservation-request-limit');
  // The existing codec enforces UTF-8 exactness, sealed-backup envelope and the
  // unchanged 30 MB expanded limit. Server verification still follows decoding.
  const sourceFile = await encodeBackupFile(input.sourceRaw);
  const { sourceRaw: _sourceRaw, ...rest } = input;
  const prepared = { ...rest, sourceFile };
  if (requestBytes(prepared) > PRESERVATION_PROTOCOL.bytes) throw Error('preservation-request-limit');
  return prepared;
}

export async function accountBackupRestoreTransportBytes(raw: string): Promise<{ bytes: number; encoding: 'sourceRaw' | 'sourceFile' }> {
  const legacyBytes = accountBackupRestoreRequestBytes(raw);
  if (legacyBytes <= PRESERVATION_PROTOCOL.bytes) return { bytes: legacyBytes, encoding: 'sourceRaw' };
  // Keep the same conservative reservation as accountBackupRestoreRequestBytes:
  // maximum escaped UTF-16 request ID, safe integer revisions and UUID actor.
  const prepared = await preparePreservationWireRequest({ kind: 'commit', client: PRESERVATION_PROTOCOL.client,
    command: { schema: PRESERVATION_PROTOCOL.schema, kind: 'preservation', requestId: '\u0000'.repeat(160),
      expectedRevision: Number.MAX_SAFE_INTEGER, expectedPublicRevision: Number.MAX_SAFE_INTEGER,
      mode: 'restore', sourceSha256: 'a'.repeat(64) }, sourceRaw: raw, actorId: 'a'.repeat(36) });
  return { bytes: requestBytes(prepared), encoding: 'sourceFile' };
}
