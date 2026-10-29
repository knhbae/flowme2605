/** The "＋" line under a day heading. Enter adds the line and keeps the input open for the next;
 * an empty Enter or Esc closes it. An Enter that only ends Korean composition never adds, and a
 * second Enter while the first add is still saving is ignored, so one line becomes one task. */
export type GroupAddAction = 'add' | 'close' | 'ignore';

export function createGroupAddEntry() {
  let composing = false, saving = false, edits = 0;
  return {
    compositionStart() { composing = true; edits++; },
    /** The title or time changed. An add that started before this must not clear the line. */
    edited() { edits++; },
    /** Taken when an add starts; its success may clear the line only if nothing changed since. */
    mark() { return edits; },
    unchangedSince(mark: number) { return edits === mark; },
    compositionEnd() { composing = false; },
    /** Enter or the 추가 button. `isComposing` is the key event's own flag (false for a button). */
    submit(title: string, isComposing = false): GroupAddAction {
      if (composing || isComposing || saving) return 'ignore';
      if (!title.trim()) return 'close';
      saving = true; return 'add';
    },
    /** The add finished, saved or not. */
    settled() { saving = false; },
    /** Esc closes unless it belongs to composition. */
    escape(isComposing = false): GroupAddAction { return composing || isComposing ? 'ignore' : 'close'; },
    /** Focus left the line: close only an empty, idle line so written text is never dropped. */
    leave(title: string): GroupAddAction { return composing || saving || title.trim() ? 'ignore' : 'close'; },
  };
}
