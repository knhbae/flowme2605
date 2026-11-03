import { programShape } from '../program-data';
import { ALPHA_BACKUP_SCHEMA, type AlphaAccount, type AlphaBackup, type AlphaReferenceContext, type AlphaOperation } from './contract';
import { canonicalJson, detached, hashJson, parseAlphaJson, sha256 } from './json';
import { validateAlphaAccount } from './program-adapter';
import { validateAlphaOperations } from './fake-server';

async function mediaManifest(value: unknown): Promise<AlphaBackup['manifest']['files']> {
  const files: AlphaBackup['manifest']['files'] = [];
  async function visit(part: unknown, path: string[]) {
    if (!part || typeof part !== 'object') return;
    if ('dataUrl' in part) {
      const media = part as { id: unknown; dataUrl: unknown };
      if (typeof media.id !== 'string' || typeof media.dataUrl !== 'string') throw Error('alpha-media');
      const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(media.dataUrl);
      if (!match) throw Error('alpha-media');
      const bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0));
      files.push({ path: JSON.stringify(path), mediaId: media.id, mime: match[1], bytes: bytes.length, sha256: await sha256(bytes) });
    }
    for (const [key, child] of Object.entries(part).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) await visit(child, [...path, key]);
  }
  await visit(value, []);
  return files;
}
/** Offline package. References are evidence, not a service publication/import instruction. */
export async function createAlphaBackup(account: AlphaAccount, references: AlphaReferenceContext, operations: AlphaOperation[] = []): Promise<AlphaBackup> {
  const payload = detached({ account, references, operations });
  if (!validateAlphaAccount(payload.account, payload.references) || !validateAlphaOperations(payload.account, payload.references, payload.operations)) throw Error('alpha-invalid-backup');
  const backup: AlphaBackup = { schema: ALPHA_BACKUP_SCHEMA, ...payload, manifest: {
    ownerId: payload.account.ownerId, payloadSha256: await hashJson(payload), files: await mediaManifest(payload),
  } };
  canonicalJson(backup);
  return backup;
}
export async function restoreAlphaBackup(raw: string, ownerId: string): Promise<
  { ok: true; account: AlphaAccount; references: AlphaReferenceContext; operations: AlphaOperation[] } | { ok: false; reason: 'invalid-backup' }> {
  try {
    const value = parseAlphaJson(raw);
    if (!programShape(value, ['schema', 'account', 'references', 'operations', 'manifest']) || value.schema !== ALPHA_BACKUP_SCHEMA
      || !programShape(value.manifest, ['ownerId', 'payloadSha256', 'files']) || value.manifest.ownerId !== ownerId
      || !validateAlphaAccount(value.account, value.references as AlphaReferenceContext, ownerId)) return { ok: false, reason: 'invalid-backup' };
    const expected = await createAlphaBackup(value.account, value.references as AlphaReferenceContext, value.operations as AlphaOperation[]);
    if (canonicalJson(expected.manifest) !== canonicalJson(value.manifest)) return { ok: false, reason: 'invalid-backup' };
    return { ok: true, account: expected.account, references: expected.references, operations: expected.operations };
  } catch { return { ok: false, reason: 'invalid-backup' }; }
}
