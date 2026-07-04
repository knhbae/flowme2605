import assert from 'node:assert/strict';
import test from 'node:test';
import { addDays, formatDate, formatKoreanShortDate, getRangeEnd } from './date';

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
