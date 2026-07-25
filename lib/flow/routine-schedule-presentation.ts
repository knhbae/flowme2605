import type { SavedFlowRoutineDefinition } from './storage';

const WEEKDAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'];
const RRULE_WEEKDAY_LABELS: Record<string, string> = {
  MO: '월',
  TU: '화',
  WE: '수',
  TH: '목',
  FR: '금',
  SA: '토',
  SU: '일',
};

export type RoutineSchedulePresentation = {
  weekdayLabel: string;
  timeLabel: string;
  durationLabel?: string;
  endLabel: string;
  summary: string;
};

function formatSourceDuration(days?: number): string {
  if (!days) return '계속 반복';
  return days % 7 === 0 ? `${days / 7}주` : `${days}일`;
}

function getRruleParts(rule: string): Map<string, string> {
  return new Map(
    rule
      .replace(/^RRULE:/iu, '')
      .split(';')
      .map((part) => part.split('=', 2))
      .filter((part): part is [string, string] => part.length === 2 && Boolean(part[0]) && Boolean(part[1]))
      .map(([key, value]) => [key.toUpperCase(), value.toUpperCase()]),
  );
}

function getPositiveInteger(value?: string): number | undefined {
  if (!value || !/^\d+$/u.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function appendRepeatLimit(label: string, parts: Map<string, string>): string {
  const count = getPositiveInteger(parts.get('COUNT'));
  if (count) return `${label} · ${count}회`;

  const until = parts.get('UNTIL')?.match(/^(\d{4})(\d{2})(\d{2})/u);
  if (until) return `${label} · ${until[1]}.${until[2]}.${until[3]}까지`;

  return label;
}

export function formatRoutineRepeatRuleLabel(repeatRules: string[] = []): string {
  const rrule = repeatRules.find((rule) => /(?:^|;)FREQ=/iu.test(rule.replace(/^RRULE:/iu, '')));
  if (!rrule) {
    const readableRule = repeatRules
      .map((rule) => rule.replace(/^@/u, '').trim())
      .find((rule) => rule && !/[A-Z_]+=/u.test(rule));
    return readableRule || '반복 실행';
  }

  const parts = getRruleParts(rrule);
  const frequency = parts.get('FREQ');
  const interval = getPositiveInteger(parts.get('INTERVAL')) ?? 1;

  if (frequency === 'DAILY') {
    return appendRepeatLimit(interval === 1 ? '매일' : `${interval}일마다`, parts);
  }

  if (frequency === 'WEEKLY') {
    const weekdays = (parts.get('BYDAY') ?? '')
      .split(',')
      .map((weekday) => RRULE_WEEKDAY_LABELS[weekday])
      .filter(Boolean);
    const cadence = interval === 1 ? '' : `${interval}주마다 `;
    const label = weekdays.length ? `${cadence}${weekdays.join('·')}` : interval === 1 ? '매주' : `${interval}주마다`;
    return appendRepeatLimit(label, parts);
  }

  if (frequency === 'MONTHLY') {
    const monthDay = getPositiveInteger(parts.get('BYMONTHDAY'));
    const cadence = interval === 1 ? '매월' : `${interval}개월마다`;
    return appendRepeatLimit(monthDay ? `${cadence} ${monthDay}일` : cadence, parts);
  }

  return '반복 실행';
}

export function buildRoutineSchedulePresentation({
  weekdays,
  definition,
  sourceDurationDays,
}: {
  weekdays: string[];
  definition: SavedFlowRoutineDefinition;
  sourceDurationDays?: number;
}): RoutineSchedulePresentation {
  const normalizedWeekdays = WEEKDAY_ORDER.filter((weekday) => weekdays.includes(weekday));
  const weekdayLabel = normalizedWeekdays.length === 7 ? '매일' : normalizedWeekdays.join('·') || '요일 미정';
  const timeLabel = definition.time || '시간 미정';
  const durationLabel = definition.time ? `${definition.durationMinutes ?? 30}분` : undefined;
  const endLabel = definition.end.mode === 'source'
    ? formatSourceDuration(sourceDurationDays)
    : definition.end.mode === 'count'
      ? `${definition.end.count}회`
      : definition.end.mode === 'until'
        ? `${definition.end.date || '종료일 미정'}까지`
        : '계속 반복';
  const summary = [weekdayLabel, timeLabel, durationLabel, endLabel].filter(Boolean).join(' · ');

  return { weekdayLabel, timeLabel, durationLabel, endLabel, summary };
}
