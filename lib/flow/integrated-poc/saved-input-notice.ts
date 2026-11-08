import { canonicalJson } from './alpha-persistence/json';
import type { AlphaUiDraft } from './alpha-ui-recovery';

/** Same identity as the shell's mergeRecoveryDrafts: one entry per document, title and raw. */
export const recoveryDraftIdentity = (draft: AlphaUiDraft) => JSON.stringify([draft.documentId ?? null, draft.title, draft.raw]);

/** The stored recovery entries to announce (badges, 복구함 count, the one-time toast). Every input is still captured to
 * the tab, but an entry that is only the live capture of input the editors are saving normally (active, not parked) is
 * not left behind. It counts once that input is at risk. */
export function announcedRecoveryEntries<T>(stored: readonly T[] | undefined, parked: readonly T[], active: readonly T[], atRisk: boolean,
  identity: (entry: T) => string = canonicalJson): T[] {
  if (!stored?.length) return [];
  if (atRisk) return [...stored];
  const left = new Set(parked.map(identity)), live = new Set(active.map(identity));
  return stored.filter(entry => left.has(identity(entry)) || !live.has(identity(entry)));
}
export function announcedRecoveries<T>(stored: readonly T[] | undefined, parked: readonly T[], active: readonly T[], atRisk: boolean,
  identity: (entry: T) => string = canonicalJson): number {
  return announcedRecoveryEntries(stored, parked, active, atRisk, identity).length;
}

/** Core3 P1 (X5, 11/8): the 복구함 says a new entry once, by a bottom toast, then only the 나 badge counts it. An entry is
 *  known by a short tag of its kind and identity (FNV-1a), so what is kept to remember it holds no input text. */
export function recoveryEntryTag(kind: string, identity: string): string {
  let hash = 0x811c9dc5;
  const text = `${kind}\u0000${identity}`;
  for (let index = 0; index < text.length; index++) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return `${kind}:${hash.toString(36)}:${text.length.toString(36)}`;
}
/** The tags already said, per account on this device (a reload does not say them again); kept to the entries still stored. */
const seenKey = (owner: string) => `flowme-recovery-seen:v1:${owner}`;
type SeenStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function readRecoverySeen(storage: SeenStorage | null, owner: string): Set<string> {
  try { const value: unknown = JSON.parse(storage?.getItem(seenKey(owner)) ?? '[]'); return new Set(Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string').slice(0, 400) : []); }
  catch { return new Set(); }
}
export function writeRecoverySeen(storage: SeenStorage | null, owner: string, seen: ReadonlySet<string>, stored: readonly string[]): void {
  const keep = new Set(stored);
  try { storage?.setItem(seenKey(owner), JSON.stringify([...seen].filter(tag => keep.has(tag)).slice(0, 400))); } catch { /* said again after a reload, then */ }
}
/** The announced tags not said yet: the toast's count. */
export function newRecoveryTags(announced: readonly string[], seen: ReadonlySet<string>): string[] {
  return [...new Set(announced)].filter(tag => !seen.has(tag));
}
export const programRecoveryToastText = (count: number) => `저장하지 못한 입력 ${count}개를 복구함에 두었습니다. 원문 그대로 있습니다.`;
