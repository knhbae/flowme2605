import assert from 'node:assert/strict';
import test from 'node:test';
import { programCalendarDate, programDateLabel, programDaysBetween, programOverdueLabel } from './date-label';

const today = '2026-10-29';

test('dates read as words people use: 오늘·내일·어제, then month and day with the weekday, never ISO', () => {
  assert.equal(programDateLabel('2026-10-29', today), '오늘');
  assert.equal(programDateLabel('2026-10-30', today), '내일');
  assert.equal(programDateLabel('2026-10-28', today), '어제');
  assert.equal(programDateLabel('2026-10-09', today), '10월 9일 (금)');
  assert.equal(programDateLabel('2026-10-31', today), '10월 31일 (토)');
  assert.equal(programDateLabel('2026-10-31', today, false), '10월 31일');
  assert.equal(programDateLabel('2025-10-09', today), '2025년 10월 9일');
  assert.equal(programDateLabel('2027-01-01', today), '2027년 1월 1일');
  assert.equal(programDateLabel(null, today), '날짜 없음');
  assert.equal(programCalendarDate('2026-10-29', today), '10월 29일 (목)');
  assert.equal(programCalendarDate('2026-11-01', today), '11월 1일 (일)');
  assert.equal(programCalendarDate('2026-10-09', today, false), '10월 9일');
});

test('overdue days count whole calendar days, across months and years', () => {
  assert.equal(programOverdueLabel('2026-10-09', today), '20일 지남');
  assert.equal(programOverdueLabel('2026-10-28', today), '1일 지남');
  assert.equal(programOverdueLabel('2026-10-29', today), null);
  assert.equal(programOverdueLabel('2026-10-30', today), null);
  assert.equal(programOverdueLabel(null, today), null);
  assert.equal(programDaysBetween('2025-12-31', '2026-01-01'), 1);
  assert.equal(programDaysBetween('2026-03-01', '2026-02-28'), -1);
});
