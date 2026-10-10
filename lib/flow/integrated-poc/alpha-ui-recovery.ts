import { PROGRAM_LIMITS } from './contract';
import type { ProgramEditorDraft } from './document-action';
import { programIdentifier, programShape } from './program-data';
import type { ProgramStorage } from './program-store';
import { canonicalJson, parseAlphaJson } from './alpha-persistence/json';

export const ALPHA_UI_RECOVERY_SCHEMA = 'flowme-alpha-ui-recovery/1' as const;
export const ALPHA_UI_RECOVERY_PREFIX = 'flow:poc:personal-workspace:v1:alpha-ui-recovery:v1:';
export const ALPHA_UI_RECOVERY_LIMITS = Object.freeze({ drafts: PROGRAM_LIMITS.entries, rawChars: 100_000, titleChars: 1200 });
export type AlphaUiDraft = ProgramEditorDraft;
export type AlphaUiRecoveryRecord = {
  schema: typeof ALPHA_UI_RECOVERY_SCHEMA;
  ownerId: string;
  slotId: string;
  drafts: AlphaUiDraft[];
};
export type AlphaUiRecoveryError = 'invalid' | 'not-read' | 'corrupt' | 'conflict' | 'storage-unavailable' | 'readback-failed';
export type AlphaUiRecoveryResult<T> = { ok: true; value: T } | { ok: false; reason: AlphaUiRecoveryError };
export type AlphaUiRecoverySave = { ok: true; changed: boolean; value: AlphaUiRecoveryRecord | null } | { ok: false; reason: AlphaUiRecoveryError };
export interface AlphaUiRecoveryPort {
  readonly key: string;
  read(): AlphaUiRecoveryResult<AlphaUiRecoveryRecord | null>;
  save(drafts: readonly AlphaUiDraft[]): AlphaUiRecoverySave;
  /** Explicit discard only when omitted. Server confirmation must pass its captured record. */
  clear(expected?: AlphaUiRecoveryRecord): { ok: true; changed: boolean } | { ok: false; reason: AlphaUiRecoveryError };
}

export function alphaUiRecoveryKey(ownerId: string, slotId: string): string {
  if (!programIdentifier(ownerId) || !programIdentifier(slotId)) throw Error('alpha-ui-invalid-identity');
  return `${ALPHA_UI_RECOVERY_PREFIX}${encodeURIComponent(ownerId)}:${encodeURIComponent(slotId)}`;
}

/** Validate without normalizing titles, newlines, Unicode, empty raw text or draft order. */
export function validateAlphaUiRecovery(value: unknown, ownerId: string, slotId: string): value is AlphaUiRecoveryRecord {
  try {
    canonicalJson(value);
    if (!programIdentifier(ownerId) || !programIdentifier(slotId)
      || !programShape(value, ['schema', 'ownerId', 'slotId', 'drafts'])
      || value.schema !== ALPHA_UI_RECOVERY_SCHEMA || value.ownerId !== ownerId || value.slotId !== slotId
      || !Array.isArray(value.drafts) || value.drafts.length === 0 || value.drafts.length > ALPHA_UI_RECOVERY_LIMITS.drafts) return false;
    return value.drafts.every(draft => programShape(draft, ['title', 'raw', ...(Object.hasOwn(draft ?? {}, 'documentId') ? ['documentId'] : [])])
      && typeof draft.title === 'string' && draft.title.length <= ALPHA_UI_RECOVERY_LIMITS.titleChars
      && typeof draft.raw === 'string' && draft.raw.length <= ALPHA_UI_RECOVERY_LIMITS.rawChars
      && (!Object.hasOwn(draft, 'documentId') || programIdentifier(draft.documentId)));
  } catch { return false; }
}

/** A fixed account and tab own exactly one key. No enumeration or server writes.
 * Read must succeed before saving. A corrupt or externally replaced record is never
 * repaired automatically. Recovery failure stays closed for this port's lifetime.
 * An empty capture is not a request to erase the last recovery record.
 */
export function createAlphaUiRecovery(storage: ProgramStorage,
  identity: { ownerId: string; slotId: string }): AlphaUiRecoveryPort {
  const { ownerId, slotId } = identity, key = alphaUiRecoveryKey(ownerId, slotId);
  let observed: string | null | undefined, blocked: AlphaUiRecoveryError | null = null;
  const fail = (reason: AlphaUiRecoveryError) => ({ ok: false as const, reason });
  function block(reason: AlphaUiRecoveryError) { blocked = reason; return fail(reason); }
  return {
    key,
    read() {
      if (blocked) return fail(blocked);
      try {
        const raw = storage.getItem(key);
        if (observed !== undefined && raw !== observed) return block('conflict');
        if (raw === null) { observed = null; return { ok: true, value: null }; }
        let value: unknown;
        try { value = parseAlphaJson(raw); } catch { return block('corrupt'); }
        // Only the canonical bytes emitted here are accepted. This also rejects
        // duplicate JSON keys instead of silently accepting JSON.parse's last one.
        if (!validateAlphaUiRecovery(value, ownerId, slotId) || canonicalJson(value) !== raw) return block('corrupt');
        observed = raw; return { ok: true, value };
      } catch { return block('storage-unavailable'); }
    },
    save(drafts) {
      if (blocked) return fail(blocked);
      if (observed === undefined) return fail('not-read');
      if (Array.isArray(drafts) && drafts.length === 0) {
        try {
          if (canonicalJson(drafts) !== '[]') return fail('invalid');
          if (storage.getItem(key) !== observed) return block('conflict');
          return { ok: true, changed: false, value: observed === null ? null : JSON.parse(observed) as AlphaUiRecoveryRecord };
        } catch { return block('storage-unavailable'); }
      }
      const record: AlphaUiRecoveryRecord = { schema: ALPHA_UI_RECOVERY_SCHEMA, ownerId, slotId, drafts: drafts as AlphaUiDraft[] };
      if (!validateAlphaUiRecovery(record, ownerId, slotId)) return fail('invalid');
      const raw = canonicalJson(record);
      try {
        if (storage.getItem(key) !== observed) return block('conflict');
        if (raw === observed) return { ok: true, changed: false, value: JSON.parse(raw) as AlphaUiRecoveryRecord };
        storage.setItem(key, raw);
        if (storage.getItem(key) !== raw) return block('readback-failed');
        observed = raw;
        return { ok: true, changed: true, value: JSON.parse(raw) as AlphaUiRecoveryRecord };
      } catch { return block('storage-unavailable'); }
    },
    clear(expected) {
      if (blocked) return fail(blocked);
      if (observed === undefined) return fail('not-read');
      if (expected !== undefined) {
        if (!validateAlphaUiRecovery(expected, ownerId, slotId)) return fail('invalid');
        // A later local capture supersedes the confirmed request's recovery.
        // Reject that stale cleanup without blocking future local captures.
        if (canonicalJson(expected) !== observed) return fail('conflict');
      }
      try {
        if (storage.getItem(key) !== observed) return block('conflict');
        if (observed === null) return { ok: true, changed: false };
        storage.removeItem(key);
        if (storage.getItem(key) !== null) return block('readback-failed');
        observed = null; return { ok: true, changed: true };
      } catch { return block('storage-unavailable'); }
    },
  };
}
