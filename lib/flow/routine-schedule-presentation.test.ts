import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRoutineSchedulePresentation,
  formatRoutineOverflowLabel,
  formatRoutineRepeatRuleLabel,
} from './routine-schedule-presentation';

test('routine overflow label stays within the compact two-character rail slot', () => {
  assert.equal(formatRoutineOverflowLabel(0), '');
  assert.equal(formatRoutineOverflowLabel(3), '+3');
  assert.equal(formatRoutineOverflowLabel(9), '+9');
  assert.equal(formatRoutineOverflowLabel(10), '9+');
  assert.equal(formatRoutineOverflowLabel(128), '9+');
});

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

  assert.equal(presentation.summary, '월·수·금 · 시간 미정 · 4주');
});

test('routine summary describes an open-ended series without a technical null label', () => {
  const presentation = buildRoutineSchedulePresentation({
    weekdays: ['월', '수', '금'],
    definition: { schemaVersion: 1, end: { mode: 'none' } },
  });

  assert.equal(presentation.summary, '월·수·금 · 시간 미정 · 계속 반복');
});

test('routine rule formats a weekly RRULE without exposing internal syntax', () => {
  const label = formatRoutineRepeatRuleLabel(['FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=8']);

  assert.equal(label, '월·수·금 · 8회');
  assert.doesNotMatch(label, /FREQ|BYDAY|COUNT/u);
});

test('routine rule formats daily and monthly intervals in user language', () => {
  assert.equal(formatRoutineRepeatRuleLabel(['RRULE:FREQ=DAILY;INTERVAL=2']), '2일마다');
  assert.equal(formatRoutineRepeatRuleLabel(['FREQ=MONTHLY;BYMONTHDAY=20']), '매월 20일');
});

test('routine rule preserves an existing readable rule and safely handles malformed syntax', () => {
  assert.equal(formatRoutineRepeatRuleLabel(['@주 3회']), '주 3회');
  assert.equal(formatRoutineRepeatRuleLabel(['FREQ=UNKNOWN;BYDAY=MO']), '반복 실행');
  assert.equal(formatRoutineRepeatRuleLabel([]), '반복 실행');
});
