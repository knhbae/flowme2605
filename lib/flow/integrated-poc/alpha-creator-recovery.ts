import type { ProgramCreatorWorking } from './creator-workspace-contract';
import { validateProgramCreatorWorking } from './creator-workspace-validation';
import type { ProgramEditorDraft } from './document-action';
import type { ProgramStorage } from './program-store';
import { programIdentifier, programShape } from './program-data';
import { canonicalJson, detached, parseAlphaJson } from './alpha-persistence/json';

export const ALPHA_CREATOR_RECOVERY_PREFIX = 'flow:poc:personal-workspace:v1:alpha-creator-recovery:v1:';
export const ALPHA_CREATOR_RECOVERY_LIMITS = Object.freeze({ entries: 20, auxiliaryChars: 2_000_000 });
export type AlphaCreatorRecoveryEntry = { working: ProgramCreatorWorking; auxiliaries: ProgramEditorDraft[]; baseRevision: number };
export type AlphaCreatorRecoveryRecord = { schema: 'flowme-alpha-creator-recovery/1'; ownerId: string; slotId: string; entries: AlphaCreatorRecoveryEntry[] };
type Result<T> = { ok: true; value: T } | { ok: false; reason: 'invalid' | 'corrupt' | 'conflict' | 'storage-unavailable' | 'not-read' };
export function validateAlphaCreatorRecovery(value: unknown, owner: string, slot: string): value is AlphaCreatorRecoveryRecord {
  try {
    canonicalJson(value);
    return programIdentifier(owner) && programIdentifier(slot) && programShape(value, ['schema', 'ownerId', 'slotId', 'entries'])
      && value.schema === 'flowme-alpha-creator-recovery/1' && value.ownerId === owner && value.slotId === slot
      && Array.isArray(value.entries) && value.entries.length > 0 && value.entries.length <= ALPHA_CREATOR_RECOVERY_LIMITS.entries
      && value.entries.every(e => programShape(e, ['working', 'auxiliaries', 'baseRevision']) && validateProgramCreatorWorking(e.working)
        && Number.isSafeInteger(e.baseRevision) && (e.baseRevision as number) >= 0 && Array.isArray(e.auxiliaries) && e.auxiliaries.length <= 40
        && e.auxiliaries.every(d => programShape(d, ['title', 'raw', ...(d && typeof d === 'object' && Object.hasOwn(d, 'documentId') ? ['documentId'] : [])])
          && typeof d.title === 'string' && d.title.length <= 1200 && typeof d.raw === 'string' && d.raw.length <= ALPHA_CREATOR_RECOVERY_LIMITS.auxiliaryChars
          && (!Object.hasOwn(d, 'documentId') || programIdentifier(d.documentId))));
  } catch { return false; }
}
/** Account/tab CAS storage. Corrupt data is preserved; no repair or broad deletion. */
export function createAlphaCreatorRecovery(storage: ProgramStorage, ownerId: string, slotId: string) {
  if (!programIdentifier(ownerId) || !programIdentifier(slotId)) throw Error('invalid-creator-recovery-identity');
  const key = `${ALPHA_CREATOR_RECOVERY_PREFIX}${encodeURIComponent(ownerId)}:${encodeURIComponent(slotId)}`;
  let observed: string | null | undefined, blocked = false;
  const failure = (reason: Extract<Result<never>, {ok:false}>['reason']) => ({ ok: false as const, reason });
  return {
    key,
    read(): Result<AlphaCreatorRecoveryRecord | null> {
      if (blocked) return failure('corrupt');
      try {
        const raw = storage.getItem(key);
        if (observed !== undefined && raw !== observed) { blocked = true; return failure('conflict'); }
        if (raw === null) { observed = null; return { ok: true, value: null }; }
        const parsed = parseAlphaJson(raw);
        if (!validateAlphaCreatorRecovery(parsed, ownerId, slotId) || canonicalJson(parsed) !== raw) { blocked = true; return failure('corrupt'); }
        observed = raw; return { ok: true, value: parsed };
      } catch { blocked = true; return failure('storage-unavailable'); }
    },
    save(entries: AlphaCreatorRecoveryEntry[]): Result<AlphaCreatorRecoveryRecord | null> {
      if (blocked) return failure('corrupt');
      if (observed === undefined) return failure('not-read');
      try {
        if (storage.getItem(key) !== observed) { blocked = true; return failure('conflict'); }
        if (!entries.length) return { ok: true, value: observed === null ? null : parseAlphaJson(observed) as AlphaCreatorRecoveryRecord };
        const value: AlphaCreatorRecoveryRecord = { schema: 'flowme-alpha-creator-recovery/1', ownerId, slotId, entries: detached(entries) };
        if (!validateAlphaCreatorRecovery(value, ownerId, slotId)) return failure('invalid');
        const raw = canonicalJson(value);
        if (raw !== observed) {
          storage.setItem(key, raw);
          if (storage.getItem(key) !== raw) { blocked = true; return failure('storage-unavailable'); }
          observed = raw;
        }
        return { ok: true, value };
      } catch { blocked = true; return failure('storage-unavailable'); }
    },
    clear(expected?: AlphaCreatorRecoveryRecord): Result<null> {
      if (blocked) return failure('corrupt');
      if (observed === undefined) return failure('not-read');
      if (expected !== undefined && (!validateAlphaCreatorRecovery(expected, ownerId, slotId) || canonicalJson(expected) !== observed)) return failure('conflict');
      try {
        if (storage.getItem(key) !== observed) { blocked = true; return failure('conflict'); }
        if (observed !== null) { storage.removeItem(key); if (storage.getItem(key) !== null) { blocked = true; return failure('storage-unavailable'); } }
        observed = null; return { ok: true, value: null };
      } catch { blocked = true; return failure('storage-unavailable'); }
    },
  };
}
