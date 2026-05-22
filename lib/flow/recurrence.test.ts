import assert from 'node:assert/strict';
import test from 'node:test';
import { expandRoutineOccurrences, getRoutineWeekdayLabels } from './recurrence';

test('weekly routine expands selected weekdays across the preview window', () => {
  const occurrences = expandRoutineOccurrences({
    startDate: '2026-06-01',
    repeatLabel: '주 3회',
    weekdays: ['월', '수', '금'],
    weeks: 2,
  });

  assert.deepEqual(occurrences.map((item) => item.date), [
    '2026-06-01',
    '2026-06-03',
    '2026-06-05',
    '2026-06-08',
    '2026-06-10',
    '2026-06-12',
  ]);
});

test('daily routine expands every day', () => {
  const occurrences = expandRoutineOccurrences({
    startDate: '2026-06-01',
    repeatLabel: '매일 30분',
    weekdays: ['월', '수', '금'],
    weeks: 1,
  });

  assert.equal(occurrences.length, 7);
  assert.equal(occurrences[6].date, '2026-06-07');
});

test('weekday label helper falls back to sensible defaults', () => {
  assert.deepEqual(getRoutineWeekdayLabels('주 3회', []), ['월', '수', '금']);
  assert.deepEqual(getRoutineWeekdayLabels('매일', []), ['월', '화', '수', '목', '금', '토', '일']);
  assert.deepEqual(getRoutineWeekdayLabels('월 1회', []), ['월']);
});
