import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDays,
  formatDate,
  formatKoreanShortDate,
  formatLocalDate,
  formatUserFacingScheduleDate,
  getRangeEnd,
} from './date';

test('date utilities calculate anchor-relative dates', () => {
  const anchor = new Date('2026-06-01T00:00:00.000Z');

  assert.equal(formatDate(addDays(anchor, 0)), '2026-06-01');
  assert.equal(formatDate(addDays(anchor, 2)), '2026-06-03');
  assert.equal(formatDate(addDays(anchor, -30)), '2026-05-02');
  assert.equal(formatDate(getRangeEnd(anchor, 3)), '2026-06-03');
});

test('date utilities format ISO dates for user-facing Korean copy', () => {
  assert.equal(formatKoreanShortDate('2026-07-17'), '7월 17일');
  assert.equal(formatKoreanShortDate('2026-07-17', { includeWeekday: true }), '7월 17일 (금)');
  assert.equal(formatKoreanShortDate('not-a-date'), 'not-a-date');
});

test('date utilities combine user-facing dates with relative schedule labels', () => {
  assert.equal(formatUserFacingScheduleDate('2026-05-28', { offsetLabel: 'D-30' }), '5월 28일 (목) · D-30');
  assert.equal(formatUserFacingScheduleDate('2026-05-28', { includeWeekday: false, offsetLabel: 'D-30' }), '5월 28일 · D-30');
  assert.equal(formatUserFacingScheduleDate('2026-05-28'), '5월 28일 (목)');
});

test('local date formatting keeps user calendar days separate from UTC serialization', () => {
  const kstMorning = new Date('2026-07-13T22:05:00.000Z');

  assert.equal(formatDate(kstMorning), '2026-07-13');
  assert.equal(formatLocalDate(kstMorning, { timeZone: 'Asia/Seoul' }), '2026-07-14');
  assert.equal(formatLocalDate(kstMorning, { timeZone: 'America/Los_Angeles' }), '2026-07-13');
});

test('local date formatting remains stable across daylight-saving boundaries', () => {
  assert.equal(
    formatLocalDate(new Date('2026-03-08T09:30:00.000Z'), { timeZone: 'America/Los_Angeles' }),
    '2026-03-08',
  );
  assert.equal(
    formatLocalDate(new Date('2026-11-01T08:30:00.000Z'), { timeZone: 'America/Los_Angeles' }),
    '2026-11-01',
  );
});
