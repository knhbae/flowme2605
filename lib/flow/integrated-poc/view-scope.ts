import { programDateRange, type ProgramPeriod } from './execution';
import { programCalendarDate } from './date-label';

export type ProgramViewScopeItem = { kind: 'period' | 'folder' | 'query'; label: string };

/** C1: what the today or 분류 list is narrowed to, in words, one item per condition. Empty when the
 *  list shows today's whole view (or all of 분류), so the scope line only appears while narrowed. */
export function programViewScope(input: { period: ProgramPeriod; date: string; today: string; folderTitle: string | null; query: string }): ProgramViewScopeItem[] {
  const { period, date, today } = input, items: ProgramViewScopeItem[] = [];
  if (period === 'documents') return items;
  if (period === 'week' || period === 'month') {
    const range = programDateRange(period, date), current = !!range.from && !!range.to && range.from <= today && today <= range.to;
    items.push({ kind: 'period', label: `기간: ${period === 'week'
      ? current ? '이번 주' : `${programCalendarDate(range.from!, today, false)} 주`
      : current ? '이번 달' : `${Number(date.slice(5, 7))}월`}` });
  } else if (period === 'undated') items.push({ kind: 'period', label: '기간: 날짜 없음' });
  else if (period === 'today' && date !== today) items.push({ kind: 'period', label: `기간: ${programCalendarDate(date, today)}` });
  if (input.folderTitle) items.push({ kind: 'folder', label: `폴더: ${input.folderTitle}` });
  if (input.query.trim()) items.push({ kind: 'query', label: `검색: ${input.query.trim()}` });
  return items;
}
