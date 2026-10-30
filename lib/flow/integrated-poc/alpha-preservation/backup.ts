import type { AlphaAccount, AlphaReferenceContext } from '../alpha-persistence/contract';
import { canonicalJson, detached, hashJson, parseAlphaJson, sha256 } from '../alpha-persistence/json';
import { validateAlphaAccount } from '../alpha-persistence/program-adapter';
import { programShape } from '../program-data';

/** Account evidence, not instructions to publish references or replay server operations. */
export const ACCOUNT_BACKUP_SCHEMA = 'flowme-alpha-account-backup/2' as const;
export const ACCOUNT_BACKUP_COVERAGE = Object.freeze({ currentAttachments: 'complete', operationHistory: 'evidence-only-no-attachment-recovery' } as const);
export const ACCOUNT_BACKUP_LIMITS = Object.freeze({ files: 512, fileBytes: 2_000_000, archives: 128, operations: 100_000 });
export type AccountBackupFile = { id: string; mime: string; base64: string; bytes: number; sha256: string };
export type AccountBackupInput = { account: AlphaAccount; references: AlphaReferenceContext; operations: unknown[]; importArchives: unknown[]; createdAt: string };
export type AccountBackup = AccountBackupInput & { schema: typeof ACCOUNT_BACKUP_SCHEMA; coverage: typeof ACCOUNT_BACKUP_COVERAGE; files: AccountBackupFile[]; integrity: { payloadSha256: string } };
export type AccountBackupMediaResolver = (id: string) => Promise<{ mime: string; bytes: Uint8Array }>;
const mediaId = /^media-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const mimePattern = /^image\/(png|jpeg|webp|gif)$/;
const secretKeys = new Set(['access_token', 'refresh_token', 'service_role', 'secret_key', 'password', 'authorization']);
const need = (condition: unknown) => { if (!condition) throw Error('invalid-account-backup'); };
function base64(bytes: Uint8Array): string {
  let result = ''; for (let offset = 0; offset < bytes.length; offset += 8192) result += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(result);
}
function decode(value: string): Uint8Array {
  need(typeof value === 'string' && value.length <= Math.ceil(ACCOUNT_BACKUP_LIMITS.fileBytes / 3) * 4 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value));
  const bytes = Uint8Array.from(atob(value), char => char.charCodeAt(0)); need(bytes.length > 0 && bytes.length <= ACCOUNT_BACKUP_LIMITS.fileBytes && base64(bytes) === value); return bytes;
}
/** Called only with detached(input): descriptor/depth/byte validation already
 * ran before cloning. Keep domain checks here and final envelope checks below. */
function validateDetachedInput(value: AccountBackupInput) {
  function noSecrets(part: unknown): void {
    if (!part || typeof part !== 'object') return;
    for (const [key, child] of Object.entries(part)) { need(!secretKeys.has(key.toLowerCase())); noSecrets(child); }
  }
  noSecrets(value);
  need(programShape(value, ['account', 'references', 'operations', 'importArchives', 'createdAt']));
  need(typeof value.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.createdAt) && new Date(value.createdAt).toISOString() === value.createdAt);
  need(validateAlphaAccount(value.account, value.references, value.account?.ownerId) && value.account.source.actorId === value.account.ownerId);
  const owner = value.account.ownerId, refs = value.references;
  need(refs.actorIds.every(id => id === owner || /^member-[0-9a-f-]{36}$/.test(id)));
  need(refs.public.proposals.every(row => row.authorId === owner || refs.public.flows.some(flow => flow.id === row.flowId && flow.ownerId === owner)));
  need(Array.isArray(value.importArchives) && value.importArchives.length <= ACCOUNT_BACKUP_LIMITS.archives);
  need(Array.isArray(value.operations) && value.operations.length <= ACCOUNT_BACKUP_LIMITS.operations);
  const ids = new Set<string>(), revisions = new Set<number>();
  for (const row of value.operations) {
    need(programShape(row, ['owner_id', 'request_id', 'command', 'receipt', 'inverse', 'undone']));
    const op = row as { owner_id: string; request_id: string; command: Record<string, unknown>; receipt: Record<string, unknown>; inverse: unknown[]; undone: boolean };
    need(op.owner_id === owner && typeof op.request_id === 'string' && op.request_id.length > 0 && op.request_id.length <= 160 && !ids.has(op.request_id));
    need(op.command && typeof op.command === 'object' && !Array.isArray(op.command) && typeof op.command.schema === 'string' && /^flowme-alpha-[a-z0-9-]+\/\d+$/.test(op.command.schema));
    need(op.command.requestId === op.request_id && op.receipt && typeof op.receipt === 'object' && op.receipt.requestId === op.request_id && op.receipt.changed === true);
    const revision = op.receipt.revision as number;
    need(Number.isSafeInteger(revision) && revision > 0 && revision <= value.account.revision && !revisions.has(revision));
    need(Array.isArray(op.inverse) && typeof op.undone === 'boolean'); ids.add(op.request_id); revisions.add(revision);
  }
}
async function referencedFiles(value: unknown): Promise<Map<string, { mime: string; bytes: Uint8Array } | null>> {
  const result = new Map<string, { mime: string; bytes: Uint8Array } | null>();
  async function visit(part: unknown): Promise<void> {
    if (!part || typeof part !== 'object') return;
    for (const key of Object.keys(part)) need(!secretKeys.has(key.toLowerCase()));
    if (Object.hasOwn(part, 'dataUrl')) {
      const row = part as { id?: unknown; dataUrl?: unknown }; need(typeof row.dataUrl === 'string');
      const url = row.dataUrl as string;
      if (url.startsWith('flowme-media:')) {
        const id = url.slice('flowme-media:'.length); need(mediaId.test(id) && row.id === id); result.set(id, null);
      } else {
        const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.*)$/.exec(url); need(match);
        const bytes = decode(match![2]), id = `inline-${await sha256(bytes)}`;
        const old = result.get(id); need(!old || old.mime === match![1]); result.set(id, { mime: match![1], bytes });
      }
    }
    for (const child of Object.values(part)) await visit(child);
  }
  await visit(value); need(result.size <= ACCOUNT_BACKUP_LIMITS.files); return result;
}
export async function createAccountBackup(input: AccountBackupInput, resolveMedia: AccountBackupMediaResolver): Promise<AccountBackup> {
  const copy = detached(input); validateDetachedInput(copy);
  // Journal inverses retain historical evidence but never resurrect deleted files.
  const referenced = await referencedFiles({ account: copy.account, references: copy.references, importArchives: copy.importArchives }), files: AccountBackupFile[] = [];
  // Archive source strings remain byte-exact. Opaque remote references inside
  // them must already have a structured dependency in the current graph.
  function checkArchiveStrings(part: unknown): void {
    if (typeof part === 'string') {
      for (const match of part.matchAll(/flowme-media:([^\s"'<>\\,}\]]+)/g)) need(mediaId.test(match[1]) && referenced.has(match[1]));
    } else if (part && typeof part === 'object') for (const child of Object.values(part)) checkArchiveStrings(child);
  }
  checkArchiveStrings(copy.importArchives);
  for (const [id, inline] of [...referenced.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const file = inline ?? await resolveMedia(id);
    need(file && mimePattern.test(file.mime) && file.bytes instanceof Uint8Array && file.bytes.length > 0 && file.bytes.length <= ACCOUNT_BACKUP_LIMITS.fileBytes);
    if (!inline) need(file.mime === 'image/webp');
    files.push({ id, mime: file.mime, base64: base64(file.bytes), bytes: file.bytes.length, sha256: await sha256(file.bytes) });
  }
  const payload = { schema: ACCOUNT_BACKUP_SCHEMA, coverage: ACCOUNT_BACKUP_COVERAGE, ...copy, files };
  const result = { ...payload, integrity: { payloadSha256: await hashJson(payload) } }; canonicalJson(result); return result;
}
export async function validateAccountBackup(raw: string, ownerId: string): Promise<{ ok: true; value: AccountBackup } | { ok: false; reason: 'invalid-backup' }> {
  try {
    const value = parseAlphaJson(raw);
    need(programShape(value, ['schema', 'coverage', 'account', 'references', 'operations', 'importArchives', 'createdAt', 'files', 'integrity']));
    const backup = value as AccountBackup;
    need(backup.schema === ACCOUNT_BACKUP_SCHEMA && backup.account?.ownerId === ownerId && Array.isArray(backup.files) && backup.files.length <= ACCOUNT_BACKUP_LIMITS.files);
    need(programShape(backup.integrity, ['payloadSha256']) && /^[a-f0-9]{64}$/.test(backup.integrity.payloadSha256));
    const supplied = new Map<string, AccountBackupFile>();
    for (const file of backup.files) {
      need(programShape(file, ['id', 'mime', 'base64', 'bytes', 'sha256']) && typeof file.id === 'string' && !supplied.has(file.id));
      need(mimePattern.test(file.mime) && Number.isSafeInteger(file.bytes) && /^[a-f0-9]{64}$/.test(file.sha256));
      const bytes = decode(file.base64); need(bytes.length === file.bytes && await sha256(bytes) === file.sha256); supplied.set(file.id, file);
    }
    const { account, references, operations, importArchives, createdAt } = backup;
    const expected = await createAccountBackup({ account, references, operations, importArchives, createdAt }, async id => {
      const file = supplied.get(id); need(file); return { mime: file!.mime, bytes: decode(file!.base64) };
    });
    need(canonicalJson(expected) === canonicalJson(backup)); return { ok: true, value: expected };
  } catch { return { ok: false, reason: 'invalid-backup' }; }
}
