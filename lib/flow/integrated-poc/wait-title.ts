import { programDaysBetween } from './date-label';
import { programDate } from './program-data';

/** W-FLOW-07 · W-TXT-09 (총괄 11/12): a wait line's title is `답 확인: <부모 제목>` (wait-line.ts writes it). Such a task is
 *  no step of a Flow (not counted in its n/m) and is listed in 오늘's '다시 확인할 일'. */
export const PROGRAM_WAIT_PREFIX = '답 확인:';
const WAIT_TITLE = /^답 확인:\s*(.*)$/;

/** What a '답 확인:' title waits on (the words after it, '' when none); null when the title is no wait line. */
export function programWaitParentTitle(title: string): string | null {
  const match = WAIT_TITLE.exec(title.trim());
  return match ? match[1].trim() : null;
}
export const programIsWaitTitle = (title: string) => programWaitParentTitle(title) !== null;

/** Whole days since a wait began (its '- 기다림:' day); null without a readable one. */
export function programWaitDays(since: string | null | undefined, today: string): number | null {
  return since && programDate(since) && programDate(today) ? Math.max(0, programDaysBetween(since, today)) : null;
}
