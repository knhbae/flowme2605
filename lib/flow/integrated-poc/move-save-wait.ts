/**
 * A move to another screen saves the editors first (navigate(): keep input, lock, flush). That save had no bound: a
 * slow or silent server held the editors locked with nothing on screen (a write may take up to 15 s, after a 15 s
 * session check). This waits for the same flush and never skips it:
 * - after `noticeMs` the person is told it is saving and may stay (the move is dropped, the save goes on);
 * - after `limitMs` the move is dropped and the person is told the input is kept on this device (the save goes on);
 * - a flush that cannot save ends the wait at once ('not-saved'), as before, but is now said.
 * Only 'saved' moves. Nothing here saves, discards or moves anything.
 */
export const PROGRAM_MOVE_WAIT = Object.freeze({ noticeMs: 800, limitMs: 10_000 });
export type ProgramMoveWaitOutcome = 'saved' | 'not-saved' | 'late' | 'stayed';
type Timers = { set: (callback: () => void, ms: number) => unknown; clear: (handle: unknown) => void };
const browserTimers: Timers = { set: (callback, ms) => setTimeout(callback, ms), clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>) };

export async function waitProgramMoveFlush(input: {
  flush: () => Promise<boolean>;
  /** Called once, when the flush has taken `noticeMs`. */
  onWaiting: () => void;
  /** Resolves when the person chooses to stay. */
  stayed: Promise<void>;
  /** A flush still running at the limit settles later: whether it saved. */
  onLateSettled?: (saved: boolean) => void;
  noticeMs?: number; limitMs?: number; timers?: Timers;
}): Promise<ProgramMoveWaitOutcome> {
  const timers = input.timers ?? browserTimers;
  let done = false, late = false;
  const flushed = input.flush().then(saved => saved, () => false).then(saved => {
    if (late) input.onLateSettled?.(saved);
    return saved ? 'saved' as const : 'not-saved' as const;
  });
  let limitHandle: unknown;
  const limit = new Promise<'late'>(resolve => { limitHandle = timers.set(() => resolve('late'), input.limitMs ?? PROGRAM_MOVE_WAIT.limitMs); });
  const noticeHandle = timers.set(() => { if (!done) input.onWaiting(); }, input.noticeMs ?? PROGRAM_MOVE_WAIT.noticeMs);
  try {
    const outcome = await Promise.race([flushed, limit, input.stayed.then(() => 'stayed' as const)]);
    if (outcome === 'late') late = true;
    return outcome;
  } finally {
    done = true;
    timers.clear(noticeHandle); timers.clear(limitHandle);
  }
}
