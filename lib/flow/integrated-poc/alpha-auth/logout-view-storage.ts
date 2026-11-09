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
