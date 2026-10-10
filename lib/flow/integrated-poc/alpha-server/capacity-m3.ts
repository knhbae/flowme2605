import { ALPHA_LIMITS, type AlphaError, type AlphaPrivateCommand, type AlphaReceipt, type AlphaResult } from '../alpha-persistence/contract';
import { detached, sha256 } from '../alpha-persistence/json';
import { prepareBackupCapacity, type SqlReadBudget } from '../alpha-preservation/backup-capacity';
import type { AccountBackupMediaResolver } from '../alpha-preservation/backup';
import { isM3Command } from '../alpha-sync/contract';
import { isAlphaWireReceipt } from '../alpha-sync/wire';
import { programShape } from '../program-data';

/** Server-only protocol, enabled only by the coordinated checkpoint opt-in.
 * Domain/owner authorization remains the existing command handler's job.
 * A trusted RPC adapter must sign the EXACT request and use the caller's JWT;
 * neither an unsigned certificate nor this coordinator authorizes a DB write. */
export const CAPACITY_M3_SCHEMA = 'flowme-alpha-capacity-m3/2' as const;
export const CAPACITY_CERTIFICATE_SCHEMA = 'flowme-alpha-capacity-certificate/2' as const;
export type CapacityMedia = { id: string; bytes: number; sha256: string };
export type CapacityM3Certificate = { schema: typeof CAPACITY_CERTIFICATE_SCHEMA; snapshotSha256: string; createdAt: string; media: CapacityMedia[]; backupFileSha256: string };
export type CapacityM3Request = { schema: typeof CAPACITY_M3_SCHEMA; phase: 'budget' | 'snapshot'; command: AlphaPrivateCommand }
  | { schema: typeof CAPACITY_M3_SCHEMA; phase: 'commit'; command: AlphaPrivateCommand; certificate: CapacityM3Certificate; backupFile: string };
/** A 30 MB JSON snapshot can need at most double its UTF-8 bytes as a JSON
 * string, plus this small fixed envelope. This changes only candidate wire
 * transport, never the 30 MB logical account/backup/restore limits. */
export const CAPACITY_SNAPSHOT_WIRE_BYTES = ALPHA_LIMITS.bytes * 2 + 256;
const errors: AlphaError[] = ['invalid', 'unauthenticated', 'not-found', 'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'unavailable', 'no-change', 'rate-limited', 'limit'];
const hashRaw = (raw: string) => sha256(new TextEncoder().encode(raw));
const failure = (reason: AlphaError): AlphaResult<AlphaReceipt> => ({ ok: false, reason });

function terminal(value: unknown, command: AlphaPrivateCommand): AlphaResult<AlphaReceipt> | null {
  if (programShape(value, ['ok', 'reason']) && value.ok === false) {
    return failure(errors.includes(value.reason as AlphaError) ? value.reason as AlphaError : 'unavailable');
  }
  if (programShape(value, ['ok', 'kind', 'value']) && value.ok === true && value.kind === 'receipt') {
    const receipt = value.value;
    return programShape(receipt, ['requestId', 'revision', 'changed', 'kind']) && isAlphaWireReceipt(receipt)
      && receipt.changed === true && receipt.requestId === command.requestId && receipt.kind === command.kind
      && receipt.revision === command.expectedRevision + 1
      ? { ok: true, value: detached(receipt) } : failure('unavailable');
  }
  return null;
}

/** Both preparation calls rollback their candidate writes. Only the last call
 * can commit. Its SQL must re-run the original writer and compare the complete
 * PostgreSQL snapshot + media under locks; a JS precheck alone is not a guard.
 * No promise about future timestamps, other accounts or media TTL is made. */
export async function executeCapacityM3(input: { ownerId: string; command: AlphaPrivateCommand; createdAt: string }, dependencies: {
  rpc: (request: CapacityM3Request) => Promise<unknown>;
  resolveMedia: AccountBackupMediaResolver;
  sealDigest: (ownerId: string, payloadSha256: string) => Promise<string>;
}): Promise<AlphaResult<AlphaReceipt>> {
  try {
    const { ownerId, createdAt } = input, command = detached(input.command);
    const { rpc, resolveMedia, sealDigest } = dependencies;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(ownerId)
      || !isM3Command(command) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(createdAt)
      || new Date(createdAt).toISOString() !== createdAt) return failure('invalid');
    // Fresh detached values keep a transport callback from modifying the command
    // or certificate subsequently validated/sent by this coordinator.
    const call = (phase: 'budget' | 'snapshot') => rpc({ schema: CAPACITY_M3_SCHEMA, phase, command: detached(command) });
    const budget = detached(await call('budget'));
    const prior = terminal(budget, command); if (prior) return prior;
    if (!programShape(budget, ['ok', 'kind', 'snapshotSha256', 'sqlBudget']) || budget.ok !== true || budget.kind !== 'budget'
      || typeof budget.snapshotSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(budget.snapshotSha256)) return failure('unavailable');
    // Do not canonicalize the outer raw-string envelope with the logical 30 MB
    // serializer: escaping that envelope must not shrink the allowed snapshot.
    const snapshot = await call('snapshot');
    const racedReceipt = terminal(snapshot, command); if (racedReceipt) return racedReceipt;
    if (!programShape(snapshot, ['ok', 'kind', 'rawReadResponse']) || snapshot.ok !== true || snapshot.kind !== 'snapshot'
      || typeof snapshot.rawReadResponse !== 'string') return failure('unavailable');
    const raw = snapshot.rawReadResponse;
    if (new TextEncoder().encode(raw).byteLength > ALPHA_LIMITS.bytes) return failure('limit');
    if (await hashRaw(raw) !== budget.snapshotSha256) return failure('revision-conflict');
    const media: CapacityMedia[] = [];
    const { report, artifact } = await prepareBackupCapacity({ rawReadResponse: raw, ownerId, createdAt, sqlBudget: budget.sqlBudget as SqlReadBudget }, {
      resolveMedia: async id => {
        const resolved = await resolveMedia(id);
        if (!(resolved.bytes instanceof Uint8Array)) throw Error('invalid-media');
        const bytes = new Uint8Array(resolved.bytes), mime = resolved.mime;
        media.push({ id, bytes: bytes.length, sha256: await sha256(bytes) });
        return { mime, bytes };
      }, sealDigest,
    });
    if (report.status !== 'passed' || !artifact) return failure(report.failure?.reason === 'limit-exceeded' ? 'limit' : 'unavailable');
    const certificate: CapacityM3Certificate = { schema: CAPACITY_CERTIFICATE_SCHEMA, snapshotSha256: budget.snapshotSha256,
      createdAt, media: media.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), backupFileSha256: await hashRaw(artifact.file) };
    // SQL retains precisely these checked bytes atomically with the new receipt.
    // Do not regenerate compression or timestamps between check and commit.
    const result = await rpc({ schema: CAPACITY_M3_SCHEMA, phase: 'commit', command: detached(command), certificate: detached(certificate), backupFile: artifact.file });
    // Unknown post-dispatch results retain the existing ambiguous-outcome lane.
    return terminal(result, command) ?? failure('unavailable');
  } catch { return failure('unavailable'); }
}

/** Bounded server-adapter decoder. The raw snapshot itself is still validated
 * with the existing 30 MB parser by executeCapacityM3/inspectBackupCapacity. */
export async function readCapacityM3Response(response: Response): Promise<unknown> {
  const reader = response.body?.getReader(); if (!reader) throw Error('capacity-response-unavailable');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const next = await reader.read(); if (next.done) break;
      length += next.value.byteLength;
      if (length > CAPACITY_SNAPSHOT_WIRE_BYTES) { await reader.cancel(); throw Error('capacity-response-limit'); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
