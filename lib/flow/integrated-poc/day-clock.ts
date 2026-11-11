import { programLocalDate } from './execution';

/** Codex f12a review P2-3, 기타 F4 (11/12): 오늘's date and hour, read together from one clock: at each minute's turn (so
 *  18:00 and midnight land within a second, not up to a minute late) and when the screen comes back (a hidden tab's
 *  timers sleep). Nothing is stored. */
export type ProgramDayClock = { date: string; hour: number };
export type ProgramDayClockHost = {
  now: () => Date;
  setTimeout: (run: () => void, ms: number) => unknown;
  clearTimeout: (timer: unknown) => void;
  /** Calls `run` when the screen is shown again; returns how to stop. */
  onVisible: (run: () => void) => () => void;
};

export function programDayClockRead(now: Date): ProgramDayClock { return { date: programLocalDate(now), hour: now.getHours() }; }
/** The wait to just past the next minute's turn. */
export function programNextMinuteDelay(now: Date): number { return 60_000 - (now.getTime() % 60_000) + 50; }
/** The day a screen shows once today has moved on: the new today when it showed the old one, else its own. */
export function programFollowToday(shown: string, was: string, today: string): string { return shown === was ? today : shown; }
/** Of the host's today and the clock's, the later (the host's is read when it draws; the clock's at each minute). */
export function programLaterToday(host: string, clock: string | null): string { return clock && clock > host ? clock : host; }

/** Reads now and at each minute's turn and screen return; `onChange` hears every change of the date or the hour. */
export function startProgramDayClock(host: ProgramDayClockHost, onChange: (clock: ProgramDayClock) => void): () => void {
  let last = programDayClockRead(host.now()), timer: unknown = null, stopped = false;
  const read = () => {
    const next = programDayClockRead(host.now());
    if (next.date !== last.date || next.hour !== last.hour) { last = next; onChange(next); }
  };
  const arm = () => { host.clearTimeout(timer); timer = host.setTimeout(tick, programNextMinuteDelay(host.now())); };
  function tick() { if (stopped) return; read(); arm(); }
  onChange(last);
  arm();
  const stopVisible = host.onVisible(() => { if (stopped) return; read(); arm(); });
  return () => { stopped = true; host.clearTimeout(timer); stopVisible(); };
}
