type Target = {
  addEventListener(type: string, listener: () => void, capture: boolean): void;
  removeEventListener(type: string, listener: () => void, capture: boolean): void;
  setTimeout(handler: () => void, ms: number): unknown;
};

/** A close that a blur asks for (N1 fix 2, fix 3). A press elsewhere blurs the line before the press ends;
 *  closing then removed the row under the pointer, so the close waits for the press to end and for its click.
 *  It then runs only if it is still wanted: that click may have focused the same line again (the same day's ＋). */
export function createPressAwareClose(target: Target) {
  let pressing = false;
  const down = () => { pressing = true; }, up = () => { pressing = false; };
  return {
    attach() {
      target.addEventListener('pointerdown', down, true); target.addEventListener('pointerup', up, true); target.addEventListener('pointercancel', up, true);
      return () => { target.removeEventListener('pointerdown', down, true); target.removeEventListener('pointerup', up, true); target.removeEventListener('pointercancel', up, true); };
    },
    request(stillWanted: () => boolean, close: () => void) {
      const run = () => { target.setTimeout(() => { if (stillWanted()) close(); }, 0); };
      if (!pressing) { run(); return; }
      const done = () => { target.removeEventListener('pointerup', done, true); target.removeEventListener('pointercancel', done, true); run(); };
      target.addEventListener('pointerup', done, true); target.addEventListener('pointercancel', done, true);
    },
  };
}
