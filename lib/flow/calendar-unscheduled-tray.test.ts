import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCalendarUnscheduledSchedulePreview,
  isValidCalendarTrayDate,
  type CalendarUnscheduledTrayItem,
} from './calendar-unscheduled-tray';

const items: CalendarUnscheduledTrayItem[] = [
  {
    key: 'draft-a::source-a',
    flowSlug: 'draft-a',
    flowTitle: '이사 준비',
    itemId: 'source-a',
    stableItemId: 'source-a',
    title: '관리실에 연락하기',
    ownership: 'source',
  },
  {
    key: 'draft-a::personal-a',
    flowSlug: 'draft-a',
    flowTitle: '이사 준비',
    itemId: 'personal-a',
    stableItemId: 'personal-a',
    title: '박스 수량 확인하기',
    ownership: 'user_created',
  },
  {
    key: 'draft-b::source-b',
    flowSlug: 'draft-b',
    flowTitle: '차량 점검',
    itemId: 'source-b',
    stableItemId: 'source-b',
    title: '타이어 공기압 확인하기',
    ownership: 'source',
  },
];

test('plain Calendar tray dates reject impossible calendar values', () => {
  assert.equal(isValidCalendarTrayDate('2026-07-14'), true);
  assert.equal(isValidCalendarTrayDate('2026-02-30'), false);
  assert.equal(isValidCalendarTrayDate('2026-7-14'), false);
});

test('selection preview is atomic and counts affected flows and ownership', () => {
  const preview = buildCalendarUnscheduledSchedulePreview({
    items,
    selectedKeys: ['draft-a::source-a', 'draft-a::personal-a', 'draft-b::source-b'],
    targetDate: '2026-07-20',
  });

  assert.equal(preview.canApply, true);
  assert.equal(preview.isAtomic, true);
  assert.equal(preview.selectedCount, 3);
  assert.equal(preview.affectedFlowCount, 2);
  assert.equal(preview.sourceItemCount, 2);
  assert.equal(preview.userCreatedItemCount, 1);
  assert.equal(preview.targetDate, '2026-07-20');
});

test('unknown keys are ignored and an empty known selection is blocked', () => {
  const preview = buildCalendarUnscheduledSchedulePreview({
    items,
    selectedKeys: ['missing'],
    targetDate: '2026-07-20',
  });

  assert.equal(preview.canApply, false);
  assert.equal(preview.selectedCount, 0);
  assert.equal(preview.blockedReason, 'selection_required');
});

test('a valid selection requires a valid target date before it can apply', () => {
  const preview = buildCalendarUnscheduledSchedulePreview({
    items,
    selectedKeys: ['draft-a::personal-a'],
    targetDate: '',
  });

  assert.equal(preview.canApply, false);
  assert.equal(preview.selectedCount, 1);
  assert.equal(preview.blockedReason, 'valid_target_date_required');
});
