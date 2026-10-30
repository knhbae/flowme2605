import type { ProgramStorage } from './program-store';
import { programIdentifier, programShape } from './program-data';
import { canonicalJson, detached, parseAlphaJson } from './alpha-persistence/json';

export const ALPHA_SOCIAL_RECOVERY_PREFIX = 'flow:poc:personal-workspace:v1:alpha-social-recovery:v1:';
export type AlphaSocialRecoveryEntry = { kind: 'publication' | 'participation' | 'review'; value: unknown };
export type AlphaSocialRecoveryRecord = { schema: 'flowme-alpha-social-recovery/1'; ownerId: string; slotId: string; entries: AlphaSocialRecoveryEntry[] };
export function validateAlphaSocialRecovery(value: unknown, ownerId: string, slotId: string): value is AlphaSocialRecoveryRecord {
  try {
    return canonicalJson(value).length <= 8_000_000 && programShape(value, ['schema', 'ownerId', 'slotId', 'entries'])
      && value.schema === 'flowme-alpha-social-recovery/1' && value.ownerId === ownerId && value.slotId === slotId
      && Array.isArray(value.entries) && value.entries.length > 0 && value.entries.length <= 30
      && value.entries.every(entry => programShape(entry, ['kind', 'value']) && ['publication', 'participation', 'review'].includes(entry.kind as string));
  } catch { return false; }
}
/** Full draft input, never a private text document or automatic public replay. */
export function createAlphaSocialRecovery(storage: ProgramStorage, ownerId: string, slotId: string) {
  if (!programIdentifier(ownerId) || !programIdentifier(slotId)) throw Error('invalid-social-recovery-identity');
  const key = `${ALPHA_SOCIAL_RECOVERY_PREFIX}${encodeURIComponent(ownerId)}:${encodeURIComponent(slotId)}`;
  let observed: string | null | undefined, blocked = false;
  const fail = () => ({ ok: false as const });
  return {
    key,
    read() {
      if (blocked) return fail();
      try {
        const raw = storage.getItem(key);
        if (observed !== undefined && raw !== observed) { blocked = true; return fail(); }
        if (raw === null) { observed = null; return { ok: true as const, value: null }; }
        const parsed = parseAlphaJson(raw);
        if (!validateAlphaSocialRecovery(parsed, ownerId, slotId) || canonicalJson(parsed) !== raw) { blocked = true; return fail(); }
        observed = raw; return { ok: true as const, value: parsed };
      } catch { blocked = true; return fail(); }
    },
    save(entries: AlphaSocialRecoveryEntry[]) {
      if (blocked || observed === undefined) return fail();
      try {
        if (storage.getItem(key) !== observed) { blocked = true; return fail(); }
        if (!entries.length) return { ok: true as const, value: observed === null ? null : parseAlphaJson(observed) as AlphaSocialRecoveryRecord };
        const value: AlphaSocialRecoveryRecord = { schema: 'flowme-alpha-social-recovery/1', ownerId, slotId, entries: detached(entries) };
        if (!validateAlphaSocialRecovery(value, ownerId, slotId)) return fail();
        const raw = canonicalJson(value);
        if (raw !== observed) {
          storage.setItem(key, raw);
          if (storage.getItem(key) !== raw) { blocked = true; return fail(); }
          observed = raw;
        }
        return { ok: true as const, value };
      } catch { blocked = true; return fail(); }
    },
    clear(expected?: AlphaSocialRecoveryRecord) {
      if (blocked || observed === undefined) return fail();
      try {
        if (storage.getItem(key) !== observed || expected && canonicalJson(expected) !== observed) return fail();
        if (observed !== null) { storage.removeItem(key); if (storage.getItem(key) !== null) { blocked = true; return fail(); } }
        observed = null; return { ok: true as const };
      } catch { blocked = true; return fail(); }
    },
  };
}
