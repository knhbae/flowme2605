/**
 * typelag ② (11/11): the one switch for drawing again only the rows an input changed (typing within a line, the
 * caret moving), and measuring only those rows. On by default. Off, here or on one device with localStorage
 * 'flowme:alpha:row-patch' = 'off', every input rebuilds and measures every row as r3 did.
 * typelag ③ (11/11) rides on the same switch: the check controls' one layer (vendor text-editor) and, in a long
 * document's recent view, the 복구함's whole raw for words typed in one line without a model run (recent-writing).
 */
export const PROGRAM_ROW_PATCH = { enabled: true };
export const PROGRAM_ROW_PATCH_KEY = 'flowme:alpha:row-patch';

export function programRowPatchEnabled(storage?: Pick<Storage, 'getItem'> | null): boolean {
  if (!PROGRAM_ROW_PATCH.enabled) return false;
  try {
    const store = storage === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : storage;
    return store?.getItem(PROGRAM_ROW_PATCH_KEY) !== 'off';
  } catch {
    return true;
  }
}
