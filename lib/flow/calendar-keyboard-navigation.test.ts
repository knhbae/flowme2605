import assert from 'node:assert/strict';
import test from 'node:test';

import { getCalendarGridNavigationDate } from './calendar-keyboard-navigation';

test('calendar grid arrow keys move by day or week', () => {
  assert.equal(getCalendarGridNavigationDate('2026-07-25', 'ArrowLeft'), '2026-07-24');
  assert.equal(getCalendarGridNavigationDate('2026-07-25', 'ArrowRight'), '2026-07-26');
  assert.equal(getCalendarGridNavigationDate('2026-07-25', 'ArrowUp'), '2026-07-18');
  assert.equal(getCalendarGridNavigationDate('2026-07-25', 'ArrowDown'), '2026-08-01');
});

test('calendar grid Home and End move within the current week', () => {
  assert.equal(getCalendarGridNavigationDate('2026-07-29', 'Home'), '2026-07-26');
  assert.equal(getCalendarGridNavigationDate('2026-07-29', 'End'), '2026-08-01');
});

test('calendar grid PageUp and PageDown clamp month-end dates', () => {
  assert.equal(getCalendarGridNavigationDate('2026-03-31', 'PageUp'), '2026-02-28');
  assert.equal(getCalendarGridNavigationDate('2026-01-31', 'PageDown'), '2026-02-28');
});

test('calendar grid navigation rejects malformed dates', () => {
  assert.equal(getCalendarGridNavigationDate('2026-13-40', 'ArrowRight'), null);
  assert.equal(getCalendarGridNavigationDate('', 'ArrowRight'), null);
});
