/** memo-enter (user decision 11/10): after a plain Enter continued a memo, one notice-row line says how to leave it.
 *  It goes with the next key or press, or after 3 s; a device sees it the first few times only. */
export const PROGRAM_MEMO_TIP_TEXT = '한 번 더 Enter → 메모 끝내고 새 할 일';
export const PROGRAM_MEMO_TIP_MS = 3000;
export const PROGRAM_MEMO_TIP_LIMIT = 3;
export const PROGRAM_MEMO_TIP_KEY = 'flowme-memo-enter-tip-v1';

/** Whether to show the tip now, counting it when it shows. Storage that is missing or throws shows it (never blocks
 *  and never counts); a count it cannot read is 0. */
export function programMemoTipTake(storage: Pick<Storage, 'getItem' | 'setItem'> | null | undefined): boolean {
  let count = 0;
  try { count = Math.max(0, Math.floor(Number(storage?.getItem(PROGRAM_MEMO_TIP_KEY) ?? 0))) || 0; } catch { count = 0; }
  if (count >= PROGRAM_MEMO_TIP_LIMIT) return false;
  try { storage?.setItem(PROGRAM_MEMO_TIP_KEY, String(count + 1)); } catch { /* shown anyway */ }
  return true;
}
