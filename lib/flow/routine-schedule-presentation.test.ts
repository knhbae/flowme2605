import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRoutineSchedulePresentation } from './routine-schedule-presentation';

test('routine summary keeps weekday, time, duration, and count in one line', () => {
  const presentation = buildRoutineSchedulePresentation({
    weekdays: ['금', '월', '수'],
    definition: {
      schemaVersion: 1,
      time: '07:30',
      durationMinutes: 45,
      end: { mode: 'count', count: 8 },
    },
  });

  assert.equal(presentation.summary, '월·수·금 · 07:30 · 45분 · 8회');
});

test('routine summary distinguishes preview horizon from source series end', () => {
  const presentation = buildRoutineSchedulePresentation({
    weekdays: ['월', '수', '금'],
    definition: { schemaVersion: 1, end: { mode: 'source' } },
    sourceDurationDays: 28,
  });

  assert.equal(presentation.summary, '월·수·금 · 시간 없음 · 4주');
});
