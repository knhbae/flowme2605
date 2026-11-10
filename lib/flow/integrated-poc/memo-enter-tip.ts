/** memo-enter tip (UX 11/10 09:35): after a plain Enter continued a memo, one W15 info notice says how to leave it. It
 *  goes with the next key, a composition starting, the caret moving off, the input left, its × or 3 s, whichever is
 *  first. A device sees it three times, or not again once the memo was left by Enter on an empty memo line twice. One
 *  slot of device storage holds both counts; nothing goes to the account or the document. */
export const PROGRAM_MEMO_TIP_TEXT = 'Enter 한 번 더: 메모 끝내고 새 할 일';
export const PROGRAM_MEMO_TIP_MS = 3000;
export const PROGRAM_MEMO_TIP_LIMIT = 3;
export const PROGRAM_MEMO_TIP_LEARNED = 2;
export const PROGRAM_MEMO_TIP_KEY = 'flowme-memo-enter-tip-v1';

type TipStorage = Pick<Storage, 'getItem' | 'setItem'> | null | undefined;
type TipCounts = { shown: number; left: number };
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

function readCounts(storage: TipStorage): TipCounts {
  try {
    const raw = storage?.getItem(PROGRAM_MEMO_TIP_KEY);
    if (!raw) return { shown: 0, left: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'number') return { shown: count(parsed), left: 0 };
    const row = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    return { shown: count(row.shown), left: count(row.left) };
  } catch { return { shown: 0, left: 0 }; }
}
function writeCounts(storage: TipStorage, counts: TipCounts) {
  try { storage?.setItem(PROGRAM_MEMO_TIP_KEY, JSON.stringify(counts)); } catch { /* the tip never depends on storage */ }
}

/** The device's storage, or null where it is blocked. */
export function programMemoTipStorage(): TipStorage {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

/** Whether to show the tip now, counting it when it shows. A count it cannot read is 0, so storage trouble shows it. */
export function programMemoTipTake(storage: TipStorage): boolean {
  const counts = readCounts(storage);
  if (counts.shown >= PROGRAM_MEMO_TIP_LIMIT || counts.left >= PROGRAM_MEMO_TIP_LEARNED) return false;
  writeCounts(storage, { ...counts, shown: counts.shown + 1 });
  return true;
}

/** Enter on an empty memo line left the memo: counted (up to the number that means it is learned). */
export function programMemoTipLeft(storage: TipStorage): void {
  const counts = readCounts(storage);
  if (counts.left < PROGRAM_MEMO_TIP_LEARNED) writeCounts(storage, { ...counts, left: counts.left + 1 });
}
