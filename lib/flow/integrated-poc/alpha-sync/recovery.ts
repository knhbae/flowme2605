import type { ProgramStorage } from '../program-store';
import { createAlphaLocalRecovery } from '../alpha-persistence/local-recovery';
import { isAccountForOwner } from '../alpha-auth/account-access';
export const ALPHA_SYNC_PREFIX = 'flow:poc:personal-workspace:v1:alpha-m3:recovery:';
/** Caller supplies a sessionStorage-backed per-tab slot, stable across reload.
 * Distinct tabs MUST use distinct slots; cloned tabs should mint a new slot. */
export function createAlphaTabRecovery(storage: ProgramStorage, slotId: string) {
  if (!/^[A-Za-z0-9_-]{8,160}$/.test(slotId)) throw Error('invalid-tab-slot');
  const key = (original: string) => `${ALPHA_SYNC_PREFIX}${slotId}:${encodeURIComponent(original)}`;
  return createAlphaLocalRecovery({ getItem: k => storage.getItem(key(k)), setItem: (k, v) => storage.setItem(key(k), v), removeItem: k => storage.removeItem(key(k)) }, isAccountForOwner, { compact: true });
}
