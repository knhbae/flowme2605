import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCalendarDateMovePreview,
  type CalendarDateMoveItem,
} from './calendar-date-move';

const items: CalendarDateMoveItem[] = [
  {
    key: 'moving::task-a',
    flowSlug: 'moving-d30-basic',
    flowTitle: '이사 준비',
    title: '관리실에 연락하기',
    sourceDate: '2026-07-29',
    kind: 'task',
    completed: false,
  },
  {
    key: 'workout::occurrence-a',
    flowSlug: 'allblanc-home-training-4week',
    flowTitle: '홈트레이닝',
    title: '1주차 운동',
    sourceDate: '2026-07-29',
    kind: 'occurrence',
    completed: true,
  },
];

test('Calendar move preview counts ordinary items, occurrences, Flow scope, and completion', () => {
  const preview = buildCalendarDateMovePreview({
    items,
    selectedKeys: items.map((item) => item.key),
    targetDate: '2026-08-02',
  });

  assert.equal(preview.canApply, true);
  assert.equal(preview.isAtomic, true);
  assert.equal(preview.selectedCount, 2);
  assert.equal(preview.affectedFlowCount, 2);
  assert.equal(preview.ordinaryItemCount, 1);
  assert.equal(preview.occurrenceCount, 1);
  assert.equal(preview.completedItemCount, 1);
  assert.equal(preview.sourceDate, '2026-07-29');
  assert.equal(preview.targetDate, '2026-08-02');
});

test('Calendar move preview rejects unknown selection, invalid date, and no-op movement', () => {
  assert.equal(buildCalendarDateMovePreview({
    items,
    selectedKeys: ['missing'],
    targetDate: '2026-08-02',
  }).blockedReason, 'selection_required');
  assert.equal(buildCalendarDateMovePreview({
    items,
    selectedKeys: [items[0].key],
    targetDate: '2026-02-30',
  }).blockedReason, 'valid_target_date_required');
  assert.equal(buildCalendarDateMovePreview({
    items,
    selectedKeys: [items[0].key],
    targetDate: '2026-07-29',
  }).blockedReason, 'target_date_unchanged');
});

test('Calendar move preview refuses a mixed-date selection instead of partially applying it', () => {
  const preview = buildCalendarDateMovePreview({
    items: [...items, { ...items[0], key: 'moving::task-b', sourceDate: '2026-07-30' }],
    selectedKeys: ['moving::task-a', 'moving::task-b'],
    targetDate: '2026-08-02',
  });

  assert.equal(preview.canApply, false);
  assert.equal(preview.blockedReason, 'single_source_date_required');
});
