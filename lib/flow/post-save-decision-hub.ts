import { formatKoreanShortDate } from './date';

export type PostSaveDecisionItem = {
  flowSlug: string;
  itemId: string;
  date?: string;
  section?: string;
  recurrenceKey?: string;
};

export type PostSaveDecisionMetric = {
  key: 'items' | 'date-range' | 'undated' | 'phases' | 'recurrence';
  label: string;
  value: string;
};

export type PostSaveDecisionSummary = {
  totalCount: number;
  datedCount: number;
  undatedCount: number;
  phaseCount: number;
  recurrenceCount: number;
  dateRangeLabel: string;
  metrics: PostSaveDecisionMetric[];
};

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function buildDateRangeLabel(dates: string[]): string {
  if (dates.length === 0) return '';
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first === last) return formatKoreanShortDate(first, { includeWeekday: false });
  return `${formatKoreanShortDate(first, { includeWeekday: false })} - ${formatKoreanShortDate(last, { includeWeekday: false })}`;
}

export function buildPostSaveDecisionSummary(items: PostSaveDecisionItem[]): PostSaveDecisionSummary {
  const dates = Array.from(new Set(
    items
      .map((item) => item.date?.trim() ?? '')
      .filter(isValidLocalDate),
  )).sort();
  const datedCount = items.filter((item) => isValidLocalDate(item.date?.trim() ?? '')).length;
  const undatedCount = items.length - datedCount;
  const sections = new Set(
    items
      .map((item) => item.section?.trim() ?? '')
      .filter((section) => section && section !== '할 일'),
  );
  const recurrenceKeys = new Set(
    items
      .map((item) => item.recurrenceKey?.trim() ?? '')
      .filter(Boolean),
  );
  const dateRangeLabel = buildDateRangeLabel(dates);
  const metrics: PostSaveDecisionMetric[] = [
    { key: 'items', label: '할 일', value: `${items.length}개` },
  ];

  if (dateRangeLabel) metrics.push({ key: 'date-range', label: '기간', value: dateRangeLabel });
  if (undatedCount > 0) metrics.push({ key: 'undated', label: '날짜 없음', value: `${undatedCount}개` });
  if (sections.size > 1) metrics.push({ key: 'phases', label: '단계', value: `${sections.size}개` });
  if (recurrenceKeys.size > 0) metrics.push({ key: 'recurrence', label: '반복', value: `${recurrenceKeys.size}개` });

  return {
    totalCount: items.length,
    datedCount,
    undatedCount,
    phaseCount: sections.size,
    recurrenceCount: recurrenceKeys.size,
    dateRangeLabel,
    metrics,
  };
}
