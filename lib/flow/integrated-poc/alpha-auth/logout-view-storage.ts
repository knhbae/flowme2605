/** Device-only view choices. Recovery input, collections, documents and authentication are separate owners. */
const sharedViewKeys = [
  'flow:poc:personal-workspace:v1:month-view',
  'flow:alpha:carryover-open:v1',
  'flow:alpha:opened:v1',
  'flowme-flow-today-band-open:v1',
  'flowme-flow-today-band-folded',
] as const;
const folderViewKey = 'flowme-writing-folder-view:v1';
export type AlphaLogoutViewOwner = { ownerId: string; documentIds: readonly string[] };
type ViewStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
/** F4·P3c (11/9): the owner and document IDs captured when a logout starts, kept on this device until its view cleanup is
 *  confirmed, so a retry after a reload clears the folder map as the first attempt would have (IDs only, no content). */
export const ALPHA_LOGOUT_VIEW_PENDING_KEY = 'flowme-alpha-logout-view:v1';

/** One owner's IDs: those captured (the account snapshot) with the writing host's own (a document made since included). */
export function mergeAlphaLogoutViewOwner(owner: AlphaLogoutViewOwner | null, host: AlphaLogoutViewOwner | null | undefined): AlphaLogoutViewOwner | null {
  if (!host?.ownerId || !Array.isArray(host.documentIds)) return owner;
  if (!owner) return { ownerId: host.ownerId, documentIds: [...new Set(host.documentIds.filter(id => typeof id === 'string' && id))] };
  if (owner.ownerId !== host.ownerId) return owner;
  return { ownerId: owner.ownerId, documentIds: [...new Set([...owner.documentIds, ...host.documentIds.filter(id => typeof id === 'string' && id)])] };
}
export function keepAlphaLogoutViewOwner(storage: ViewStorage, owner: AlphaLogoutViewOwner | null) {
  if (!owner?.ownerId) return;
  try { storage.setItem(ALPHA_LOGOUT_VIEW_PENDING_KEY, JSON.stringify({ ownerId: owner.ownerId, documentIds: owner.documentIds })); } catch { /* the in-memory owner still clears */ }
}
/** The kept owner (for `ownerId` when given: only that owner's); null when none or unreadable. */
export function readAlphaLogoutViewOwner(storage: ViewStorage, ownerId?: string): AlphaLogoutViewOwner | null {
  try {
    const kept = JSON.parse(storage.getItem(ALPHA_LOGOUT_VIEW_PENDING_KEY) ?? 'null') as { ownerId?: unknown; documentIds?: unknown } | null;
    if (!kept || typeof kept.ownerId !== 'string' || !kept.ownerId || ownerId && kept.ownerId !== ownerId || !Array.isArray(kept.documentIds)) return null;
    return { ownerId: kept.ownerId, documentIds: kept.documentIds.filter((id): id is string => typeof id === 'string' && !!id) };
  } catch { return null; }
}
export function dropAlphaLogoutViewOwner(storage: ViewStorage) {
  try { storage.removeItem(ALPHA_LOGOUT_VIEW_PENDING_KEY); } catch { /* removed with the next successful logout */ }
}

/** Called after confirmed server revocation, while the closed auth marker still prevents another login. Unknown keys and
 * other owners' entries remain byte-for-byte unchanged. The legacy folder map has no owner: only documents from
 * the captured verified account may be removed. A newer document needs the writing host's current ID snapshot. */
export function clearAlphaLogoutViewStorage(storage: ViewStorage, owner: AlphaLogoutViewOwner | null): boolean {
  let cleared = true;
  const keys: string[] = [...sharedViewKeys];
  if (owner?.ownerId) keys.push(`flow:alpha:writing-whole:v1:${owner.ownerId}`, `flow:alpha:writing-done:v1:${owner.ownerId}`);
  for (const key of keys) {
    try { storage.removeItem(key); if (storage.getItem(key) !== null) cleared = false; }
    catch { cleared = false; }
  }
  if (!owner?.documentIds.length) return cleared;
  try {
    const raw = storage.getItem(folderViewKey);
    if (raw === null) return cleared;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return cleared; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return cleared;
    const folders = parsed as Record<string, unknown>;
    let changed = false;
    for (const id of owner.documentIds) if (Object.hasOwn(folders, id)) { delete folders[id]; changed = true; }
    if (!changed) return cleared;
    if (storage.getItem(folderViewKey) !== raw) return false;
    const next = Object.keys(folders).length ? JSON.stringify(folders) : null;
    if (next === null) storage.removeItem(folderViewKey); else storage.setItem(folderViewKey, next);
    if (storage.getItem(folderViewKey) !== next) return false;
  } catch { return false; }
  return cleared;
}
