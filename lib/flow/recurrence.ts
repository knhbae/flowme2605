import { addDays, formatDate } from './date';

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'] as const;
const dailyWeekdays = ['월', '화', '수', '목', '금', '토', '일'];

export type RoutineOccurrence = {
  date: string;
  weekday: string;
  sessionIndex: number;
};

export type ExpandRoutineOccurrencesInput = {
  startDate: string;
  repeatLabel?: string;
  weekdays?: string[];
  weeks?: number;
};

export function getRoutineWeekdayLabels(repeatLabel = '', selectedWeekdays: string[] = []): string[] {
  const cleanSelected = selectedWeekdays.filter((day) => dailyWeekdays.includes(day));
  if (repeatLabel.includes('매일')) return dailyWeekdays;
  if (repeatLabel.includes('월 1회') || repeatLabel.includes('월1회')) return cleanSelected.length ? cleanSelected.slice(0, 1) : ['월'];
  if (cleanSelected.length) return cleanSelected;
  if (repeatLabel.includes('주 1회') || repeatLabel.includes('주1회')) return ['월'];
  if (repeatLabel.includes('주 2회') || repeatLabel.includes('주2회')) return ['월', '목'];
  return ['월', '수', '금'];
}

export function expandRoutineOccurrences({
  startDate,
  repeatLabel = '',
  weekdays = [],
  weeks = 4,
}: ExpandRoutineOccurrencesInput): RoutineOccurrence[] {
  if (!startDate) return [];

  const selected = getRoutineWeekdayLabels(repeatLabel, weekdays);
  const durationDays = Math.max(weeks, 1) * 7;
  const start = new Date(startDate);
  const occurrences: RoutineOccurrence[] = [];

  for (let index = 0; index < durationDays; index += 1) {
    const date = addDays(start, index);
    const weekday = weekdayLabels[date.getDay()];
    if (selected.includes(weekday)) {
      occurrences.push({
        date: formatDate(date),
        weekday,
        sessionIndex: occurrences.length + 1,
      });
    }
  }

  return occurrences;
}
