import type { ProgramStorage } from './program-store';
import { programIdentifier, programShape } from './program-data';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { canonicalJson, detached, parseAlphaJson } from './alpha-persistence/json';

/** Off-document additions cannot be recovered from the source editor's raw text. */
export type AlphaStructuralDraft = { documentId: string; before: TextWorkspaceState; next: TextWorkspaceState };
export type AlphaStructuralEditorPort = { captureStructuralDrafts?: () => AlphaStructuralDraft[] };
export type AlphaStructuralRecoveryEntry = AlphaStructuralDraft & { baseRevision: number };
export const ALPHA_STRUCTURAL_RECOVERY_SCHEMA = 'flowme-alpha-structural-recovery/1' as const;
export const ALPHA_STRUCTURAL_RECOVERY_PREFIX = 'flow:poc:personal-workspace:v1:alpha-structural-recovery:v1:';
export const ALPHA_STRUCTURAL_RECOVERY_LIMITS = Object.freeze({ entries: 8, chars: 1_000_000 });
export type AlphaStructuralRecoveryRecord = {
  schema: typeof ALPHA_STRUCTURAL_RECOVERY_SCHEMA;
  ownerId: string;
  slotId: string;
  entries: AlphaStructuralRecoveryEntry[];
};
type RecoveryError = 'invalid' | 'not-read' | 'corrupt' | 'conflict' | 'storage-unavailable' | 'readback-failed';
type RecoveryResult<T> = { ok: true; value: T } | { ok: false; reason: RecoveryError };
type RecoverySave = { ok: true; changed: boolean; value: AlphaStructuralRecoveryRecord | null } | { ok: false; reason: RecoveryError };

function structuralTransition(documentId: unknown, before: TextWorkspaceState, next: TextWorkspaceState): boolean {
  if (!programIdentifier(documentId) || !M.validate(before) || !M.validate(next)
    || !M.getDocument(before, documentId) || !M.getDocument(next, documentId)) return false;
  const oldIds = new Set([...before.documents, ...before.flows].map(doc => doc.id));
  return next.documents.some(doc => !oldIds.has(doc.id));
}

/** Capture valid working structure even when a later raw edit is invalid. */
export function createAlphaStructuralDraft(before: TextWorkspaceState, next: TextWorkspaceState, documentId: string): AlphaStructuralDraft | null {
  if (!structuralTransition(documentId, before, next)) return null;
  // A capture failure must reach the shell's preservation guard. Returning null
  // would incorrectly certify an oversized structural edit as raw-only input.
  return detached({ documentId, before, next });
}

export function validateAlphaStructuralRecoveryEntry(value: unknown): value is AlphaStructuralRecoveryEntry {
  try {
    return programShape(value, ['documentId', 'before', 'next', 'baseRevision'])
      && Number.isSafeInteger(value.baseRevision) && (value.baseRevision as number) >= 0
      && structuralTransition(value.documentId, value.before as TextWorkspaceState, value.next as TextWorkspaceState)
      && canonicalJson(value).length <= ALPHA_STRUCTURAL_RECOVERY_LIMITS.chars;
  } catch { return false; }
}

/** A caller must also prove current owner/revision and reject pending commands. */
export function resolveAlphaStructuralRecovery(current: TextWorkspaceState, entry: AlphaStructuralRecoveryEntry):
  { status: 'ready'; workspace: TextWorkspaceState } | { status: 'already-present' | 'stale' | 'invalid' } {
  try {
    if (!M.validate(current) || !validateAlphaStructuralRecoveryEntry(entry)) return { status: 'invalid' };
    const raw = canonicalJson(current);
    // Never allocate another copy when the exact generated IDs already exist.
    if (raw === canonicalJson(entry.next)) return { status: 'already-present' };
    if (raw !== canonicalJson(entry.before)) return { status: 'stale' };
    return { status: 'ready', workspace: detached(entry.next) };
  } catch { return { status: 'invalid' }; }
}

export function alphaStructuralRecoveryKey(ownerId: string, slotId: string): string {
  if (!programIdentifier(ownerId) || !programIdentifier(slotId)) throw Error('alpha-structural-invalid-identity');
  return `${ALPHA_STRUCTURAL_RECOVERY_PREFIX}${encodeURIComponent(ownerId)}:${encodeURIComponent(slotId)}`;
}

export function validateAlphaStructuralRecovery(value: unknown, ownerId: string, slotId: string): value is AlphaStructuralRecoveryRecord {
  try {
    return programIdentifier(ownerId) && programIdentifier(slotId)
      && programShape(value, ['schema', 'ownerId', 'slotId', 'entries'])
      && value.schema === ALPHA_STRUCTURAL_RECOVERY_SCHEMA && value.ownerId === ownerId && value.slotId === slotId
      && Array.isArray(value.entries) && value.entries.length > 0 && value.entries.length <= ALPHA_STRUCTURAL_RECOVERY_LIMITS.entries
      && value.entries.every(validateAlphaStructuralRecoveryEntry)
      && canonicalJson(value).length <= ALPHA_STRUCTURAL_RECOVERY_LIMITS.chars;
  } catch { return false; }
}

/** One observed account/tab key. Quota, corruption or external replacement fails
 * closed; no truncation, enumeration, server write or automatic repair occurs. */
export function createAlphaStructuralRecovery(storage: ProgramStorage, identity: { ownerId: string; slotId: string }) {
  const { ownerId, slotId } = identity, key = alphaStructuralRecoveryKey(ownerId, slotId);
  let observed: string | null | undefined, blocked: RecoveryError | null = null;
  const fail = (reason: RecoveryError) => ({ ok: false as const, reason });
  function block(reason: RecoveryError) { blocked = reason; return fail(reason); }
  return {
    key,
    read(): RecoveryResult<AlphaStructuralRecoveryRecord | null> {
      if (blocked) return fail(blocked);
      try {
        const raw = storage.getItem(key);
        if (observed !== undefined && raw !== observed) return block('conflict');
        if (raw === null) { observed = null; return { ok: true, value: null }; }
        if (raw.length > ALPHA_STRUCTURAL_RECOVERY_LIMITS.chars) return block('corrupt');
        let value: unknown;
        try { value = parseAlphaJson(raw); } catch { return block('corrupt'); }
        if (!validateAlphaStructuralRecovery(value, ownerId, slotId) || canonicalJson(value) !== raw) return block('corrupt');
        observed = raw; return { ok: true, value };
      } catch { return block('storage-unavailable'); }
    },
    save(entries: readonly AlphaStructuralRecoveryEntry[]): RecoverySave {
      if (blocked) return fail(blocked);
      if (observed === undefined) return fail('not-read');
      if (Array.isArray(entries) && entries.length === 0) {
        try {
          if (canonicalJson(entries) !== '[]') return fail('invalid');
          if (storage.getItem(key) !== observed) return block('conflict');
          return { ok: true, changed: false, value: observed === null ? null : parseAlphaJson(observed) as AlphaStructuralRecoveryRecord };
        } catch { return block('storage-unavailable'); }
      }
      const record: AlphaStructuralRecoveryRecord = { schema: ALPHA_STRUCTURAL_RECOVERY_SCHEMA, ownerId, slotId, entries: entries as AlphaStructuralRecoveryEntry[] };
      if (!validateAlphaStructuralRecovery(record, ownerId, slotId)) return fail('invalid');
      const raw = canonicalJson(record);
      try {
        if (storage.getItem(key) !== observed) return block('conflict');
        if (raw === observed) return { ok: true, changed: false, value: parseAlphaJson(raw) as AlphaStructuralRecoveryRecord };
        storage.setItem(key, raw);
        if (storage.getItem(key) !== raw) return block('readback-failed');
        observed = raw;
        return { ok: true, changed: true, value: parseAlphaJson(raw) as AlphaStructuralRecoveryRecord };
      } catch { return block('storage-unavailable'); }
    },
    clear(expected?: AlphaStructuralRecoveryRecord): { ok: true; changed: boolean } | { ok: false; reason: RecoveryError } {
      if (blocked) return fail(blocked);
      if (observed === undefined) return fail('not-read');
      if (expected !== undefined) {
        if (!validateAlphaStructuralRecovery(expected, ownerId, slotId)) return fail('invalid');
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
