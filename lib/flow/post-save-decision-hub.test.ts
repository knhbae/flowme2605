import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPostSaveDecisionSummary } from './post-save-decision-hub';

test('post-save decision summary exposes whole-Flow schedule and structure at a glance', () => {
  const summary = buildPostSaveDecisionSummary([
    { flowSlug: 'moving', itemId: 'one', date: '2030-07-16', section: '이사 전 준비' },
    { flowSlug: 'moving', itemId: 'two', date: '2030-08-15', section: '이사 당일' },
    { flowSlug: 'moving', itemId: 'three', section: '이사 당일' },
  ]);

  assert.equal(summary.totalCount, 3);
  assert.equal(summary.datedCount, 2);
  assert.equal(summary.undatedCount, 1);
  assert.equal(summary.phaseCount, 2);
  assert.equal(summary.dateRangeLabel, '7월 16일 - 8월 15일');
  assert.deepEqual(summary.metrics, [
    { key: 'items', label: '할 일', value: '3개' },
    { key: 'date-range', label: '기간', value: '7월 16일 - 8월 15일' },
    { key: 'undated', label: '날짜 없음', value: '1개' },
    { key: 'phases', label: '단계', value: '2개' },
  ]);
});

test('post-save decision summary counts recurrence series once and preserves malformed rows as undated', () => {
  const summary = buildPostSaveDecisionSummary([
    { flowSlug: 'routine', itemId: 'one', date: '2030-09-01', recurrenceKey: 'series-a' },
    { flowSlug: 'routine', itemId: 'one-2', date: '2030-09-02', recurrenceKey: 'series-a' },
    { flowSlug: 'routine', itemId: 'two', date: '2030-02-30', recurrenceKey: 'series-b' },
  ]);

  assert.equal(summary.totalCount, 3);
  assert.equal(summary.datedCount, 2);
  assert.equal(summary.undatedCount, 1);
  assert.equal(summary.recurrenceCount, 2);
  assert.deepEqual(summary.metrics.at(-1), { key: 'recurrence', label: '반복', value: '2개' });
});

test('an undated checklist remains a useful receipt without inventing a date range', () => {
  const summary = buildPostSaveDecisionSummary([
    { flowSlug: 'checklist', itemId: 'one' },
    { flowSlug: 'checklist', itemId: 'two' },
  ]);

  assert.equal(summary.dateRangeLabel, '');
  assert.deepEqual(summary.metrics, [
    { key: 'items', label: '할 일', value: '2개' },
    { key: 'undated', label: '날짜 없음', value: '2개' },
  ]);
});
