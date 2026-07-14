export const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const formatDate = (date: Date) => date.toISOString().slice(0, 10);

type LocalDateFormatOptions = {
  timeZone?: string;
};

const padDatePart = (value: number) => String(value).padStart(2, '0');

export function formatLocalDate(date: Date, options: LocalDateFormatOptions = {}): string {
  if (Number.isNaN(date.getTime())) return '';

  if (options.timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: options.timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      if (values.year && values.month && values.day) {
        return `${values.year}-${values.month}-${values.day}`;
      }
    } catch {
      // Invalid explicit zones fall back to the current device calendar date.
    }
  }

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export const getRangeEnd = (start: Date, durationDays: number) => addDays(start, Math.max(durationDays - 1, 0));

export function formatKoreanShortDate(value: string | Date, options: { includeWeekday?: boolean } = {}) {
  const date = typeof value === 'string' ? parseIsoDate(value) : value;
  if (!date || Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '';

  const label = `${date.getMonth() + 1}월 ${date.getDate()}일`;
  if (!options.includeWeekday) return label;

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${label} (${weekdays[date.getDay()]})`;
}

export function formatUserFacingScheduleDate(
  value: string | Date,
  options: { includeWeekday?: boolean; offsetLabel?: string } = {},
) {
  const dateLabel = formatKoreanShortDate(value, { includeWeekday: options.includeWeekday ?? true });
  const offsetLabel = options.offsetLabel?.trim();
  return offsetLabel ? `${dateLabel} · ${offsetLabel}` : dateLabel;
}

function parseIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
