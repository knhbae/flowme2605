/** The "＋" line under a day heading, and the folder screen's '＋ 오늘 할 일' field. Enter adds the line and keeps the
 * input open for the next; an empty Enter or Esc closes it. An Enter that only ends Korean composition never adds.
 * P2-F4B-1 (11/9): Enter takes its line at once — the field empties for the next one, even while an earlier line still
 * saves — and the taken lines save in order, one save each (createLineQueue), so lines never run together into one task. */
export type GroupAddAction = 'add' | 'close' | 'ignore';

/** `waiting` says how many taken lines are not written yet (the one saving included): while any wait, the line stays open. */
export function createGroupAddEntry(waiting: () => number = () => 0) {
  let composing = false;
  return {
    compositionStart() { composing = true; },
    compositionEnd() { composing = false; },
    /** A key or input of the line: one that is not composing means a composition whose end event never came is over. */
    keySeen(isComposing: boolean) { if (!isComposing) composing = false; },
    /** Enter or the 추가 button. `isComposing` is the key event's own flag (false for a button). */
    submit(title: string, isComposing = false): GroupAddAction {
      if (composing || isComposing) return 'ignore';
      if (!title.trim()) return waiting() ? 'ignore' : 'close';
      return 'add';
    },
    /** Esc closes unless it belongs to composition or lines still wait to be written. */
    escape(isComposing = false): GroupAddAction { return composing || isComposing || waiting() ? 'ignore' : 'close'; },
    /** Focus left the line: close only an empty, idle line so written text is never dropped. */
    leave(title: string): GroupAddAction { return composing || waiting() || title.trim() ? 'ignore' : 'close'; },
  };
}

/** One taken line: its words, its time (the day ＋'s chip; '' for none), and how to save it (the host's add, as it was when
 *  the line was taken). */
export type GroupAddLine = { title: string; time: string; save: () => Promise<boolean> };
export type GroupAddSave = (title: string, time: string) => Promise<boolean>;
/** Lines put back into the field after a refusal are joined by this; Enter on them unchanged takes them apart again. */
export const GROUP_ADD_RETURN_JOIN = ' · ';

/** P2-F4B-1: a line field's saves, in the order the lines were taken, one at a time. A refused line, the lines after it and
 *  whatever was typed since come back to the field (joined), so nothing is lost; Enter on that unchanged text takes them as
 *  the separate lines they were. */
export function createLineQueue() {
  const waiting: GroupAddLine[] = [];
  let running = false, returned: { text: string; lines: { title: string; time: string }[] } | null = null;
  return {
    /** Lines taken and not written yet, the one saving included. */
    get pending() { return waiting.length; },
    /** The lines Enter takes from the field's text: the returned lines one by one while the field holds them as they came
     *  back, else the text as one line. Each saves through `save` (the host's add now). */
    take(text: string, time: string, save: GroupAddSave): GroupAddLine[] {
      const trimmed = text.trim();
      const parts = returned && returned.text === trimmed ? returned.lines : [{ title: trimmed, time }];
      returned = null;
      return parts.map(part => ({ ...part, save: () => save(part.title, part.time) }));
    },
    /** Queues the lines; unless a run is going already (it takes them), saves the queue in order. Resolves with what to
     *  put back into the field after a refusal (its text, and the time when it is one line), an empty text when every line
     *  was written, null when another run holds them. `typedSince` is the field as it is now (a line not taken yet). */
    async run(lines: GroupAddLine[], typedSince: () => { title: string; time: string }): Promise<{ text: string; time: string } | null> {
      waiting.push(...lines);
      if (running) return null;
      running = true;
      try {
        while (waiting.length) {
          let saved = false;
          try { saved = await waiting[0].save(); } catch { saved = false; }
          if (saved) { waiting.shift(); continue; }
          const typed = typedSince(), now = typed.title.trim();
          const back = [...waiting.splice(0).map(line => ({ title: line.title, time: line.time })), ...(now ? [{ title: now, time: typed.time }] : [])];
          const text = back.map(line => line.title).join(GROUP_ADD_RETURN_JOIN);
          returned = back.length > 1 ? { text, lines: back } : null;
          return { text, time: back.length === 1 ? back[0].time : '' };
        }
        return { text: '', time: '' };
      } finally { running = false; }
    },
  };
}
