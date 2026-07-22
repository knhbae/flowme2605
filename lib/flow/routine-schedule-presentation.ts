import type { SavedFlowRoutineDefinition } from './storage';

const WEEKDAY_ORDER = ['월', '화', '수', '목', '금', '토', '일'];

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
