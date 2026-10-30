import { programIdentifier, programShape } from '../program-data';
import type { ProgramStorage } from '../program-store';
import { ALPHA_LOCAL_PREFIX, type AlphaAccount, type AlphaRecovery, type AlphaRecoveryPort, type AlphaReferenceContext } from './contract';
import { canonicalJson, detached, parseAlphaJson } from './json';
import { validateAlphaCommand } from './fake-server';
import { isAlphaWireCommand } from '../alpha-sync/wire';
import { decodeRecoveryStorage, encodeRecoveryStorage } from './recovery-codec';

export function alphaRecoveryKey(ownerId: string): string {
  if (!programIdentifier(ownerId)) throw Error('alpha-invalid-owner');
  return `${ALPHA_LOCAL_PREFIX}${encodeURIComponent(ownerId)}`;
}
export function validateAlphaRecovery(value: unknown, ownerId: string, validate: (account: unknown, owner: string, references?: AlphaReferenceContext) => account is AlphaAccount): value is AlphaRecovery {
  try {
    canonicalJson(value);
    return programShape(value, ['schema', 'ownerId', 'confirmed', 'pending', 'draft', ...(value && typeof value === 'object' && Object.hasOwn(value, 'references') ? ['references'] : [])]) && value.schema === 'flowme-alpha-recovery/1'
      && value.ownerId === ownerId && programIdentifier(ownerId) && (value.confirmed === null ? !Object.hasOwn(value, 'references') : validate(value.confirmed, ownerId, value.references as AlphaReferenceContext | undefined))
      && (value.pending === null || validateAlphaCommand(value.pending) || isAlphaWireCommand(value.pending))
      && (value.draft === null || validateAlphaCommand(value.draft) || isAlphaWireCommand(value.draft));
  } catch { return false; }
}
/** Single exact key per account. Failed observation blocks writes; never repairs by deletion. */
export function createAlphaLocalRecovery(storage: ProgramStorage, validate: (account: unknown, owner: string, references?: AlphaReferenceContext) => account is AlphaAccount, options: { compact?: boolean } = {}): AlphaRecoveryPort & { reset(ownerId: string): boolean } {
  const observed = new Map<string, string | null>(), blocked = new Set<string>();
  return {
    load(ownerId) {
      try {
        const raw = storage.getItem(alphaRecoveryKey(ownerId));
        if (blocked.has(ownerId)) return { ok: false };
        if (raw === null) { observed.set(ownerId, null); return { ok: true, value: null }; }
        const value = options.compact ? decodeRecoveryStorage(raw) : parseAlphaJson(raw);
        if (!validateAlphaRecovery(value, ownerId, validate)) { blocked.add(ownerId); return { ok: false }; }
        observed.set(ownerId, raw); return { ok: true, value };
      } catch { blocked.add(ownerId); return { ok: false }; }
    },
    save(value) {
      const ownerId = value.ownerId;
      try {
        if (blocked.has(ownerId) || !observed.has(ownerId) || !validateAlphaRecovery(value, ownerId, validate)) return false;
        const key = alphaRecoveryKey(ownerId), expected = observed.get(ownerId), raw = options.compact ? encodeRecoveryStorage(value) : canonicalJson(value);
        if (storage.getItem(key) !== expected) return false;
        if (raw === expected) return true;
        storage.setItem(key, raw);
        if (storage.getItem(key) !== raw) { blocked.add(ownerId); return false; }
        observed.set(ownerId, raw); return true;
      } catch { blocked.add(ownerId); return false; }
    },
    reset(ownerId) {
      try {
        if (blocked.has(ownerId) || !observed.has(ownerId)) return false;
        const key = alphaRecoveryKey(ownerId);
        if (storage.getItem(key) !== observed.get(ownerId)) return false;
        if (observed.get(ownerId) === null) return true;
        storage.removeItem(key);
        if (storage.getItem(key) !== null) { blocked.add(ownerId); return false; }
        observed.set(ownerId, null); return true;
      } catch { blocked.add(ownerId); return false; }
    },
  };
}
export function createAlphaMemoryRecovery(): AlphaRecoveryPort {
  const values = new Map<string, AlphaRecovery>();
  return { load: ownerId => ({ ok: true, value: detached(values.get(ownerId) ?? null) }), save: value => {
    values.set(value.ownerId, detached(value)); return true;
  } };
}
