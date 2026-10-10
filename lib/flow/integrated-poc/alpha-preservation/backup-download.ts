import { canonicalJson, parseAlphaJson } from '../alpha-persistence/json';
import { programShape } from '../program-data';
import { validateAccountBackup } from './backup';
import { SEALED_BACKUP_SCHEMA } from './contract';
import { BACKUP_FILE_SCHEMA, decodeBackupFile, encodeBackupFile } from './file-codec';

export const BACKUP_DOWNLOAD_SCHEMA = 'flowme-alpha-backup-download/1' as const;
export const BACKUP_DOWNLOAD_FORMAT = 'checked-file-v1' as const;

/** Owner/integrity/codec validation, NOT seal authentication. The server must
 * authenticate the seal; the browser has no signing key. Never re-compress an
 * already checked download file. Legacy sealed responses remain readable. */
export async function readBackupDownload(value: unknown, ownerId: string) {
  let raw: string, file: string | undefined;
  if (programShape(value, ['schema', 'file']) && value.schema === BACKUP_DOWNLOAD_SCHEMA && typeof value.file === 'string') {
    file = value.file;
    const wrapper = parseAlphaJson(file);
    if (!wrapper || typeof wrapper !== 'object' || !('schema' in wrapper) || wrapper.schema !== BACKUP_FILE_SCHEMA) throw Error('invalid-backup-file');
    raw = await decodeBackupFile(file);
  } else raw = canonicalJson(value);
  const sealed = parseAlphaJson(raw);
  if (!programShape(sealed, ['schema', 'backup', 'proof']) || sealed.schema !== SEALED_BACKUP_SCHEMA
    || typeof sealed.proof !== 'string' || !/^[a-f0-9]{64}$/.test(sealed.proof)) throw Error('invalid-backup-file');
  const checked = await validateAccountBackup(canonicalJson(sealed.backup), ownerId);
  if (!checked.ok) throw Error('invalid-backup-file');
  return { file: file ?? await encodeBackupFile(raw), raw, backup: checked.value, proof: sealed.proof, createdAt: checked.value.createdAt };
}
