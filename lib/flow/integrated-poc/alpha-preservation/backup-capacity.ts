import { ALPHA_LIMITS } from '../alpha-persistence/contract';
import { canonicalJson, parseAlphaJson } from '../alpha-persistence/json';
import { alphaSocialReferences, readAlphaSocialResponse } from '../alpha-social/projection';
import { programShape } from '../program-data';
import { ACCOUNT_BACKUP_LIMITS, createAccountBackup, type AccountBackupMediaResolver } from './backup';
import { accountBackupRestoreRequestBytes, PRESERVATION_PROTOCOL, SEALED_BACKUP_SCHEMA } from './contract';
import { BACKUP_FILE_LIMITS, encodeBackupFile } from './file-codec';

/** Diagnostic only. Never use this snapshot report as permission to commit a
 * writer: other actors, journals and files may change after the supplied read. */
export const BACKUP_CAPACITY_SCHEMA = 'flowme-alpha-backup-capacity/1' as const;
/** Matches preservation_read_v1's PostgreSQL jsonb::text budget, not JS JSON.
 * Measurements must come from the SAME frozen SQL snapshot as the RPC reply.
 * They are caller-supplied evidence, not independently authenticated here. */
export type SqlReadBudget = {
  pairedValueBytes: number;
  operationRowBytes: number[];
  archiveRowBytes: number[];
};
export type BackupCapacityCheck = {
  gate: string; status: 'passed' | 'failed' | 'unmeasured' | 'observed';
  actual?: number; limit?: number;
};
export type BackupCapacityReport = {
  schema: typeof BACKUP_CAPACITY_SCHEMA;
  status: 'passed' | 'incomplete' | 'failed';
  checks: BackupCapacityCheck[];
  metrics: Partial<Record<'accountBytes' | 'referencesBytes' | 'operationsBytes' | 'archivesBytes'
    | 'payloadBytes' | 'filesJsonBytes' | 'fileBinaryBytes' | 'fileBase64Bytes', number>>;
  restoreEncoding?: 'sourceRaw' | 'sourceFile';
  failure?: { stage: string; reason: 'limit-exceeded' | 'invalid-input' | 'invalid-sql-budget'
    | 'backup-rejected' | 'media-unavailable' | 'seal-unavailable' | 'invalid-proof' | 'codec-unavailable' };
  assurance: {
    scope: 'provided-snapshot-only'; sqlMeasurements: 'caller-supplied' | 'not-supplied';
    snapshotConsistency: 'not-rechecked'; atomicWriteGuard: false;
    sealAuthentication: 'not-verified'; restoration: 'not-tested';
  };
};
const byteLength = (raw: string) => new TextEncoder().encode(raw).byteLength;
const jsonBytes = (value: unknown) => byteLength(canonicalJson(value));
const nonnegative = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

export function evaluateSqlReadBudget(value: SqlReadBudget, counts: { operations: number; archives: number }): number {
  // Reject accessors, hidden fields, non-JSON values and overflow, rather than
  // letting malformed measurement metadata produce a false small budget.
  canonicalJson(value);
  if (!programShape(value, ['pairedValueBytes', 'operationRowBytes', 'archiveRowBytes'])
    || !nonnegative(value.pairedValueBytes) || !nonnegative(counts.operations) || !nonnegative(counts.archives)
    || !Array.isArray(value.operationRowBytes) || !Array.isArray(value.archiveRowBytes)
    || value.operationRowBytes.length !== counts.operations || value.archiveRowBytes.length !== counts.archives
    || !value.operationRowBytes.every(nonnegative) || !value.archiveRowBytes.every(nonnegative)) throw Error('invalid-sql-budget');
  let total = value.pairedValueBytes + 128;
  for (const size of [...value.operationRowBytes, ...value.archiveRowBytes]) {
    total += size + 2;
    if (!Number.isSafeInteger(total)) throw Error('invalid-sql-budget');
  }
  if (!Number.isSafeInteger(total)) throw Error('invalid-sql-budget');
  return total;
}

export type BackupCapacityInput = {
  rawReadResponse: string; ownerId: string; createdAt: string; sqlBudget?: SqlReadBudget;
};
export type BackupCapacityDependencies = {
  resolveMedia: AccountBackupMediaResolver;
  /** Supply the actual sealing algorithm for exact packed bytes. Only a 64-hex
   * shape is checked here. The diagnostic report contains no sensitive values;
   * prepareBackupCapacity's successful artifact contains the complete backup. */
  sealDigest: (ownerId: string, payloadSha256: string) => Promise<string>;
};
export type PreparedBackupCapacity = {
  report: BackupCapacityReport;
  /** Sensitive server-internal result, never automatically logged, added to the
   * report, sent to a client, or persisted. Caller owns its authorized handling. */
  artifact?: { createdAt: string; raw: string; file: string };
};

/** Keeps the original diagnostic-only contract: never returns backup content. */
export async function inspectBackupCapacity(input: BackupCapacityInput, dependencies: BackupCapacityDependencies): Promise<BackupCapacityReport> {
  return (await prepareBackupCapacity(input, dependencies)).report;
}

/** Server-internal preparation. Return the exact once-encoded artifact only
 * after every gate passes, including supplied SQL measurements. This does not
 * grant authority to write, publish, download, or preserve the artifact. */
export async function prepareBackupCapacity(input: BackupCapacityInput, dependencies: BackupCapacityDependencies): Promise<PreparedBackupCapacity> {
  const report: BackupCapacityReport = {
    schema: BACKUP_CAPACITY_SCHEMA, status: 'incomplete', checks: [], metrics: {},
    assurance: { scope: 'provided-snapshot-only', sqlMeasurements: 'not-supplied',
      snapshotConsistency: 'not-rechecked', atomicWriteGuard: false, sealAuthentication: 'not-verified', restoration: 'not-tested' },
  };
  let stage = 'input';
  const check = (gate: string, actual: number, limit: number) => {
    report.checks.push({ gate, actual, limit, status: actual <= limit ? 'passed' : 'failed' });
    if (actual > limit) throw Error('limit-exceeded');
  };
  try {
    // Do not execute caller accessors or let their exception messages escape.
    // Capture primitive identity/response fields once before asynchronous work.
    if (!input || ![Object.prototype, null].includes(Object.getPrototypeOf(input)) || Object.getOwnPropertySymbols(input).length) throw Error('invalid-input');
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (Object.entries(descriptors).some(([key, descriptor]) => !['rawReadResponse', 'ownerId', 'createdAt', 'sqlBudget'].includes(key)
      || !descriptor.enumerable || !('value' in descriptor))
      || !['rawReadResponse', 'ownerId', 'createdAt'].every(key => typeof descriptors[key]?.value === 'string')) throw Error('invalid-input');
    const { rawReadResponse, ownerId, createdAt, sqlBudget } = input;
    const { resolveMedia, sealDigest } = dependencies;
    report.assurance.sqlMeasurements = sqlBudget === undefined ? 'not-supplied' : 'caller-supplied';
    stage = 'rpc-read';
    if (typeof rawReadResponse !== 'string') throw Error('invalid-input');
    check('rpc-wire', byteLength(rawReadResponse), PRESERVATION_PROTOCOL.bytes);
    const decoded = parseAlphaJson(rawReadResponse);
    check('canonical-read', jsonBytes(decoded), ALPHA_LIMITS.bytes);
    if (!programShape(decoded, ['ok', 'value']) || decoded.ok !== true
      || !programShape(decoded.value, ['account', 'context', 'operations', 'importArchives'])
      || !Array.isArray(decoded.value.operations) || !Array.isArray(decoded.value.importArchives)) throw Error('invalid-input');
    const { account, context, operations, importArchives } = decoded.value;
    const read = readAlphaSocialResponse({ ok: true, value: { account, context } }, ownerId);
    if (!read) throw Error('invalid-input');
    stage = 'counts';
    check('operation-count', operations.length, ACCOUNT_BACKUP_LIMITS.operations);
    check('archive-count', importArchives.length, ACCOUNT_BACKUP_LIMITS.archives);
    stage = 'sql-read';
    if (sqlBudget === undefined) report.checks.push({ gate: 'sql-read', status: 'unmeasured', limit: PRESERVATION_PROTOCOL.bytes });
    else {
      let size: number;
      try { size = evaluateSqlReadBudget(sqlBudget, { operations: operations.length, archives: importArchives.length }); }
      catch { throw Error('invalid-sql-budget'); }
      check('sql-read', size, PRESERVATION_PROTOCOL.bytes);
    }
    stage = 'backup-input';
    const backupInput = { account: read.account, references: alphaSocialReferences(read.context, ownerId),
      operations, importArchives, createdAt };
    check('backup-input', jsonBytes(backupInput), ALPHA_LIMITS.bytes);
    report.metrics = { accountBytes: jsonBytes(read.account), referencesBytes: jsonBytes(backupInput.references),
      operationsBytes: jsonBytes(operations), archivesBytes: jsonBytes(importArchives) };
    stage = 'account-backup';
    const backup = await createAccountBackup(backupInput, async id => {
      try {
        const file = await resolveMedia(id);
        if (!(file.bytes instanceof Uint8Array)) throw Error('invalid-media');
        // Freeze returned bytes before the next await; never mutate caller media.
        return { mime: file.mime, bytes: new Uint8Array(file.bytes) };
      } catch { throw Error('media-unavailable'); }
    });
    check('account-backup', jsonBytes(backup), ALPHA_LIMITS.bytes);
    check('file-count', backup.files.length, ACCOUNT_BACKUP_LIMITS.files);
    check('largest-file', Math.max(0, ...backup.files.map(file => file.bytes)), ACCOUNT_BACKUP_LIMITS.fileBytes);
    const { integrity: _integrity, ...payload } = backup;
    Object.assign(report.metrics, { payloadBytes: jsonBytes(payload), filesJsonBytes: jsonBytes(backup.files),
      fileBinaryBytes: backup.files.reduce((sum, file) => sum + file.bytes, 0),
      fileBase64Bytes: backup.files.reduce((sum, file) => sum + file.base64.length, 0) });
    stage = 'seal';
    let proof: string;
    try { proof = await sealDigest(ownerId, backup.integrity.payloadSha256); }
    catch { throw Error('seal-unavailable'); }
    if (typeof proof !== 'string' || !/^[a-f0-9]{64}$/.test(proof)) throw Error('invalid-proof');
    const sealed = { schema: SEALED_BACKUP_SCHEMA, backup, proof };
    stage = 'sealed-backup';
    const raw = canonicalJson(sealed);
    check('sealed-backup', byteLength(raw), ALPHA_LIMITS.bytes);
    // Response.json has no additional 30 MB outbound guard in the current
    // handler. Observe it; do not silently introduce a new product limit.
    report.checks.push({ gate: 'api-response', status: 'observed', actual: byteLength(JSON.stringify({ ok: true, value: sealed })) });
    stage = 'download-file';
    const file = await encodeBackupFile(raw);
    check('download-file', byteLength(file), BACKUP_FILE_LIMITS.fileBytes);
    stage = 'restore-request';
    const rawRequestBytes = accountBackupRestoreRequestBytes(raw);
    // Reuse the same maximal request-ID/revision reservation without encoding
    // the artifact again. sourceFile differs only in the JSON property name;
    // all value escaping is measured by the existing request-byte helper.
    const transport = rawRequestBytes <= PRESERVATION_PROTOCOL.bytes
      ? { bytes: rawRequestBytes, encoding: 'sourceRaw' as const }
      : { bytes: accountBackupRestoreRequestBytes(file)
        + byteLength(JSON.stringify('sourceFile')) - byteLength(JSON.stringify('sourceRaw')), encoding: 'sourceFile' as const };
    check('restore-request', transport.bytes, PRESERVATION_PROTOCOL.bytes);
    report.restoreEncoding = transport.encoding;
    report.status = report.checks.some(row => row.status === 'unmeasured') ? 'incomplete' : 'passed';
    if (report.status === 'passed' && sqlBudget !== undefined) return { report, artifact: { createdAt, raw, file } };
  } catch (error) {
    // Never include untrusted exception text, original values or credentials.
    const message = error instanceof Error ? error.message : '';
    const safe = ['limit-exceeded', 'invalid-input', 'invalid-sql-budget', 'media-unavailable', 'seal-unavailable', 'invalid-proof'] as const;
    const reason = safe.find(value => value === message)
      ?? (['alpha-too-large', 'backup-file-limit', 'preservation-request-limit'].includes(message) ? 'limit-exceeded'
        : message === 'backup-codec-unavailable' ? 'codec-unavailable' : stage === 'account-backup' ? 'backup-rejected' : 'invalid-input');
    report.status = 'failed'; report.failure = { stage, reason };
  }
  return { report };
}
