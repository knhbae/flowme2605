import { programDaysBetween } from './date-label';
import { programDate } from './program-data';

export type ProgramDueLabel = { label: string; state: 'ahead' | 'today' | 'over'; days: number };

/** Redesign 2 (총괄 11/12, W-TXT-02): a task's '- 마감:' date on a list row: 'D-8', '오늘 마감', or '마감 2일 지남' (past,
 *  shown apart). None without a readable due date. The line never moves for it. */
export function programDueLabel(due: string | null | undefined, today: string): ProgramDueLabel | null {
  if (!due || !programDate(due) || !programDate(today)) return null;
  const days = programDaysBetween(today, due);
  if (days > 0) return { label: `D-${days}`, state: 'ahead', days };
  if (days === 0) return { label: '오늘 마감', state: 'today', days };
  return { label: `마감 ${-days}일 지남`, state: 'over', days };
}
