export const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export const getRangeEnd = (start: Date, durationDays: number) => addDays(start, Math.max(durationDays - 1, 0));

export function formatKoreanShortDate(value: string | Date, options: { includeWeekday?: boolean } = {}) {
  const date = typeof value === 'string' ? parseIsoDate(value) : value;
  if (!date || Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '';

  const label = `${date.getMonth() + 1}월 ${date.getDate()}일`;
  if (!options.includeWeekday) return label;

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${label} (${weekdays[date.getDay()]})`;
}

function parseIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
