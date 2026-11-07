import { programDateRange, programShiftDate, type ProgramPeriod } from './execution';

/** Today, visual A (bundle 6, 11/7): the words the 오늘 screen draws for its title, its date chip and its day headings,
 *  as the writing view names days. Presentation only: the lists, dates and the screen reader's labels are unchanged. */
const WEEKDAYS = '일월화수목금토';
function parts(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return { m, d, w: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] };
}
const longDate = (date: string) => { const p = parts(date); return `${p.m}월 ${p.d}일 ${p.w}요일`; };

/** T1: the title in two parts ("오늘" + "11월 7일 토요일"; another day "11월 9일" + "월요일"; a week "이번 주" + its days).
 *  Null for the periods that keep their one-part title. */
export function programPeriodTitleParts(period: ProgramPeriod, date: string, today: string): { main: string; sub: string } | null {
  if (period === 'today') {
    if (date === today) return { main: '오늘', sub: longDate(date) };
    const p = parts(date);
    return { main: `${p.m}월 ${p.d}일`, sub: `${p.w}요일` };
  }
  if (period === 'week') {
    const { from, to } = programDateRange('week', date);
    if (!from || !to) return null;
    const a = parts(from), b = parts(to);
    return { main: from <= today && today <= to ? '이번 주' : '주간', sub: a.m === b.m ? `${a.m}월 ${a.d}일 ~ ${b.d}일` : `${a.m}월 ${a.d}일 ~ ${b.m}월 ${b.d}일` };
  }
  return null;
}

/** T3: the date chip's words: today with how many of its rows are still open, another day by date, a week or a month. */
export function programDateChipLabel(period: ProgramPeriod, date: string, today: string, open: number): string {
  if (period === 'today') {
    if (date === today) return `오늘 · ${open}개 남음`;
    const p = parts(date);
    return `${p.m}월 ${p.d}일 ${p.w}`;
  }
  if (period === 'week') {
    const { from, to } = programDateRange('week', date);
    if (!from || !to) return '주간';
    if (from <= today && today <= to) return '이번 주';
    const a = parts(from);
    return `${a.m}월 ${a.d}일 주`;
  }
  if (period === 'month') {
    const [year, month] = date.split('-').map(Number);
    return year === Number(today.slice(0, 4)) ? `${month}월` : `${year}년 ${month}월`;
  }
  return '';
}

/** T9: a day heading as the writing view draws one: 오늘·어제·내일 and the date beside it, else the date alone. */
export function programDayHeadingParts(date: string, today: string): { relative: '오늘' | '어제' | '내일' | null; main: string; sub: string } {
  const relative = date === today ? '오늘' : date === programShiftDate(today, -1) ? '어제' : date === programShiftDate(today, 1) ? '내일' : null;
  return relative ? { relative, main: relative, sub: longDate(date) } : { relative: null, main: longDate(date), sub: '' };
}
