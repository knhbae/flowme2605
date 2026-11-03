/** Read-only, explicit-file preflight. No auth, remote API client, credentials, or restore writer.
 * A user-selected network filesystem path still uses that filesystem's transport.
 */
import { constants, type BigIntStats } from 'node:fs';
import { decodeBackupFile } from '../../lib/flow/integrated-poc/alpha-preservation/file-codec';
import { open, realpath, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonicalJson, hashJson, parseAlphaJson, sha256 } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { validateAccountBackup } from '../../lib/flow/integrated-poc/alpha-preservation/backup';
import { PRESERVATION_PROTOCOL, SEALED_BACKUP_SCHEMA } from '../../lib/flow/integrated-poc/alpha-preservation/contract';
import { accountBackupRestoreTransportBytes } from '../../lib/flow/integrated-poc/alpha-preservation/transport';
import { programShape } from '../../lib/flow/integrated-poc/program-data';
import { summarizePreservationContent } from '../../lib/flow/integrated-poc/alpha-preservation/content-summary';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const failure = (reason: 'invalid-options' | 'unreadable-file' | 'file-changed' | 'limit' | 'invalid-backup' | 'owner-mismatch' | 'same-file' | 'copy-mismatch') => ({ ok: false as const, reason });
export type BackupCheckOptions = { backupPath: string; copyPath?: string; expectedOwner?: string };

/** Integrity is not authenticity: a well-formed fake seal still requires server preview. */
export async function inspectPersonalBackup(bytes: Uint8Array, expectedOwner?: string) {
  if (expectedOwner !== undefined && !uuid.test(expectedOwner)) return failure('invalid-options');
  if (bytes.byteLength > PRESERVATION_PROTOCOL.bytes) return failure('limit');
  try {
    // Reject malformed UTF-8/BOM instead of silently changing the selected bytes.
    const raw = await decodeBackupFile(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes));
    const sealed = parseAlphaJson(raw);
    if (!programShape(sealed, ['schema', 'backup', 'proof']) || sealed.schema !== SEALED_BACKUP_SCHEMA
      || typeof sealed.proof !== 'string' || !/^[a-f0-9]{64}$/.test(sealed.proof)) return failure('invalid-backup');
    const backup = sealed.backup as { account?: { ownerId?: unknown } } | null;
    const embeddedOwner = backup?.account?.ownerId;
    if (typeof embeddedOwner !== 'string' || !uuid.test(embeddedOwner)) return failure('invalid-backup');
    if (expectedOwner !== undefined && embeddedOwner !== expectedOwner) return failure('owner-mismatch');
    const checked = await validateAccountBackup(canonicalJson(backup), embeddedOwner);
    if (!checked.ok) return failure('invalid-backup');
    const { bytes: restoreRequestBytes, encoding: restoreEncoding } = await accountBackupRestoreTransportBytes(raw);
    if (restoreRequestBytes > PRESERVATION_PROTOCOL.bytes) return failure('limit');
    const value = checked.value, space = value.account.space;
    return { ok: true as const, schema: 'flowme-alpha-offline-backup-check/1' as const,
      bytes: bytes.byteLength, fileSha256: await sha256(bytes), decodedFileSha256: await sha256(new TextEncoder().encode(raw)), payloadSha256: value.integrity.payloadSha256,
      privateSpaceSha256: await hashJson(space), createdAt: value.createdAt, revision: value.account.revision,
      counts: { ...summarizePreservationContent(space),
        importArchives: value.importArchives.length, operations: value.operations.length,
        files: value.files.length, fileBytes: value.files.reduce((sum, file) => sum + file.bytes, 0) },
      restoreRequestBytes, restoreEncoding, ownerCheck: expectedOwner === undefined ? 'not-requested' as const : 'matches-expected' as const,
      serverSeal: 'format-only-not-authenticated' as const, serverPreviewRequired: true as const,
      independentStorage: 'not-verified' as const, encrypted: false as const };
  } catch { return failure('invalid-backup'); }
}

async function readBoundedFile(file: string) {
  const selectedPath = await realpath(file);
  // NONBLOCK avoids hanging on a named pipe before the regular-file check (where supported).
  const handle = await open(file, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw Error('unreadable-file');
    if (before.size > BigInt(PRESERVATION_PROTOCOL.bytes)) throw Error('limit');
    const matches = (value: BigIntStats) => value.isFile() && before.dev === value.dev && before.ino === value.ino
      && before.size === value.size && before.mtimeNs === value.mtimeNs && before.ctimeNs === value.ctimeNs;
    const verifyUnchanged = async () => {
      // Descriptor metadata alone misses a pathname replaced after open().
      // Keep checking the selected pathname as well, including symlink targets.
      try {
        if (!matches(await handle.stat({ bigint: true })) || !matches(await stat(file, { bigint: true }))
          || selectedPath !== await realpath(file)) throw Error('file-changed');
      } catch { throw Error('file-changed'); }
    };
    const buffer = Buffer.alloc(Number(before.size) + 1); let size = 0;
    while (size < buffer.length) {
      const read = await handle.read(buffer, size, buffer.length - size, size);
      if (!read.bytesRead) break; size += read.bytesRead;
    }
    if (size !== Number(before.size)) throw Error('file-changed');
    await verifyUnchanged();
    return { bytes: buffer.subarray(0, size), dev: before.dev, ino: before.ino, path: selectedPath,
      verifyUnchanged, close: () => handle.close() };
  } catch (error) { await handle.close(); throw error; }
}

export async function checkPersonalBackupFiles(options: BackupCheckOptions) {
  if (!options || typeof options.backupPath !== 'string' || !options.backupPath
    || options.copyPath !== undefined && (typeof options.copyPath !== 'string' || !options.copyPath)
    || options.expectedOwner !== undefined && !uuid.test(options.expectedOwner)) return failure('invalid-options');
  try {
    const opened: Awaited<ReturnType<typeof readBoundedFile>>[] = [];
    try {
      const primary = await readBoundedFile(options.backupPath); opened.push(primary);
      const inspected = await inspectPersonalBackup(primary.bytes, options.expectedOwner);
      if (!inspected.ok) return inspected;
      const copy = options.copyPath === undefined ? undefined : await readBoundedFile(options.copyPath);
      if (copy) opened.push(copy);
      // Payload verification and reading a second file may take time. Refuse a
      // changed/removed source instead of certifying only its stale in-memory bytes.
      await Promise.all(opened.map(file => file.verifyUnchanged()));
      if (copy) {
        if (primary.path === copy.path || primary.ino !== 0n && primary.ino === copy.ino && primary.dev === copy.dev) return failure('same-file');
        if (!primary.bytes.equals(copy.bytes)) return failure('copy-mismatch');
      }
      return { ...inspected, copy: copy === undefined ? 'not-provided' as const : 'byte-identical-separate-file' as const };
    } finally {
      await Promise.all(opened.map(file => file.close()));
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    return failure(reason === 'file-changed' || reason === 'limit' ? reason : 'unreadable-file');
  }
}

export function parseBackupCheckArgs(args: string[]): BackupCheckOptions | null {
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!['--backup', '--copy', '--expected-owner'].includes(key) || values.has(key) || !value || value.startsWith('--')) return null;
    values.set(key, value);
  }
  const backupPath = values.get('--backup'), expectedOwner = values.get('--expected-owner');
  if (!backupPath || expectedOwner !== undefined && !uuid.test(expectedOwner)) return null;
  return { backupPath, ...(values.has('--copy') ? { copyPath: values.get('--copy')! } : {}),
    ...(expectedOwner !== undefined ? { expectedOwner } : {}) };
}

async function main() {
  if (process.argv.slice(2).length === 1 && process.argv[2] === '--help') {
    console.log('Read-only offline check: --backup PATH [--copy PATH] [--expected-owner UUID]\nNo upload, login or restore. Output excludes paths, owner ID and document content.\nA pass does not verify the server seal, current access or independent storage. Use the app preview before restoring.'); return;
  }
  const options = parseBackupCheckArgs(process.argv.slice(2));
  const result = options ? await checkPersonalBackupFiles(options) : failure('invalid-options');
  console.log(JSON.stringify(result, null, 2)); if (!result.ok) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch(() => { console.error('backup-check-failed'); process.exitCode = 1; });
}
