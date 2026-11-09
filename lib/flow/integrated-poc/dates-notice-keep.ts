import type { ProgramPeriod } from './execution';

/** P3d (QA P2, 11/9): [그날 보기] changes the view itself (to the period holding the moved-to day, then that day), and the
 *  move's notice — its [되돌리기] — stays through that change only. It is kept until the view-change effect has seen the
 *  target view, not for a time: a slow phone ran that effect after the two frames the keep used to last, and the notice
 *  went (390 at 4x CPU, 3/3). Any other view change still drops the notice. */
export type ProgramDatesNoticeKeep<U> = { undo: U; period: ProgramPeriod; date: string | null };

/** Where [그날 보기] goes from this view: the week (a month or week view stays as it is) at that day, or 날짜 없음; null when
 *  the view is already there (nothing changes, so nothing is kept). */
export function programMovedDayTarget(view: { period: ProgramPeriod; date: string }, target: string | null): { period: ProgramPeriod; date: string | null } | null {
  const period: ProgramPeriod = target === null ? 'undated' : view.period === 'week' || view.period === 'month' ? view.period : 'week';
  return view.period === period && (target === null || view.date === target) ? null : { period, date: target };
}

/** One run of the view-change effect: whether the notice (known by its undo list) stays, and whether the keep is done. */
export function programDatesNoticeAfterView<U>(kept: ProgramDatesNoticeKeep<U> | null, noticeUndo: U | null | undefined,
  view: { period: ProgramPeriod; date: string }): { keep: boolean; release: boolean } {
  if (!kept) return { keep: false, release: false };
  return { keep: noticeUndo !== undefined && noticeUndo !== null && noticeUndo === kept.undo,
    release: view.period === kept.period && (kept.date === null || view.date === kept.date) };
}
