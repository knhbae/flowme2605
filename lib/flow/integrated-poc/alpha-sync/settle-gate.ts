// The controller's single writer slot is also held while a background refresh
// or a lost-response check reads the server. A user action that lands in that
// window should run once afterwards instead of being dropped: on 10/29 a
// completion and a source open were both lost to the 20-second poll.
// Only one action may wait at a time; a second tap in the same window is still
// refused, so a double tap cannot write twice.
export type SettleGate = {
  /** Marks a settle as started; call the returned function once it has released the slot. */
  begin(): () => void;
  /** Resolves true once the current settle ends, false if none is running, another action already waits, or maxMs passes. */
  wait(maxMs: number): Promise<boolean>;
};

export function createSettleGate(): SettleGate {
  let current: Promise<void> | null = null, waiting = false;
  return {
    begin() {
      let release!: () => void;
      const done = new Promise<void>(resolve => { release = resolve; });
      current = done;
      return () => { release(); if (current === done) current = null; };
    },
    async wait(maxMs) {
      const done = current;
      if (!done || waiting) return false;
      waiting = true;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([done.then(() => true),
          new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), maxMs); })]);
      } finally { clearTimeout(timer); waiting = false; }
    },
  };
}
