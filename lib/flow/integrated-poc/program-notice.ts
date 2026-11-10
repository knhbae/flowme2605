/** W15 notice row rules (folder picker v3 2-1), kept apart from the component so they run without the DOM. */
export type ProgramNoticeTone = 'info' | 'choose' | 'warn' | 'suggest';
export interface ProgramNoticeAction { label: string; run: () => void }
export type ProgramNoticeLife = { tone: ProgramNoticeTone; shownAt: number; leftBlockAt: number | null; held: boolean; waiting?: boolean };
export const PROGRAM_NOTICE_MS = 6000;

/** When a notice ends (ms since epoch), or null while it stays. An info notice lasts 6s from showing; a choice
 *  notice stays while the caret is in its block and lasts 6s after it leaves; a warning stays until closed.
 *  A press held on it, or focus inside it, keeps any notice; so does waiting behind another (its time starts
 *  once it shows, W15 review P2). */
export function programNoticeEndsAt(life: ProgramNoticeLife): number | null {
  if (life.held || life.waiting || life.tone === 'warn' || life.tone === 'suggest') return null;
  if (life.tone === 'choose') return life.leftBlockAt === null ? null : life.leftBlockAt + PROGRAM_NOTICE_MS;
  return life.shownAt + PROGRAM_NOTICE_MS;
}

/** One notice shows at a time: an ongoing move first, then warnings, then choices, then plain notices. */
export function programNoticeOrder<T extends { tone: ProgramNoticeTone; moving?: boolean }>(notices: T[]): T[] {
  const rank = (notice: T) => notice.moving ? 0 : notice.tone === 'warn' ? 1 : notice.tone === 'choose' ? 2 : notice.tone === 'suggest' ? 4 : 3;
  return notices.map((notice, index) => ({ notice, index })).sort((a, b) => rank(a.notice) - rank(b.notice) || a.index - b.index).map(entry => entry.notice);
}
