/** The native editor keeps one textarea for its document lifetime. Recall reads that
 * identity instead of searching every mounted editor on each document event. */
export function createProgramRecallSurface<T extends { readonly isConnected: boolean }>() {
  let current: T | null = null;
  return {
    bind(surface: T) { current = surface; },
    read(): T | null { return current?.isConnected ? current : null; },
    release(expected: T) { if (current === expected) current = null; },
  };
}

/** Draft availability is a ref signal, not a React render input. Repeated notifications do nothing. */
export function createProgramRecallSettledSignal() {
  let blocked = false, listener: ((settled: boolean) => void) | null = null;
  return {
    listen(next: (settled: boolean) => void) { listener = next; return () => { if (listener === next) listener = null; }; },
    notify(nextBlocked: boolean) { if (blocked === nextBlocked) return; blocked = nextBlocked; listener?.(!blocked); },
  };
}
