// When the host's 20-second automatic read may run. Each read downloads the
// whole account, so a screen left open with no input stops polling after ten
// minutes; the first input afterwards reads at once and the interval resumes.
// Focus and a tab becoming visible read immediately, as before. Kept free of the
// DOM and the real clock so the rule can be tested.

export const AUTOMATIC_READ_IDLE_MS = 10 * 60_000;
export const AUTOMATIC_READ_INPUT_EVENTS = ['pointerdown', 'keydown', 'input', 'compositionstart', 'touchstart', 'wheel'] as const;

export type AutomaticReadSchedule = {
  /** The interval tick: reads unless no input has arrived for the idle period. */
  interval(): void;
  /** User input: reads once now only when it ends an idle stretch. */
  input(): void;
  /** Window focus or the tab becoming visible: counts as input and always reads, as before. */
  returned(): void;
};

export function automaticReadSchedule(now: () => number, refresh: () => void, idleMs = AUTOMATIC_READ_IDLE_MS): AutomaticReadSchedule {
  let last = now();
  const idle = () => now() - last >= idleMs;
  return {
    interval() { if (!idle()) refresh(); },
    input() { const wasIdle = idle(); last = now(); if (wasIdle) refresh(); },
    returned() { last = now(); refresh(); },
  };
}
