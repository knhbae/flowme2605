import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFlowExportScopePlan,
  type FlowExportScopeItem,
} from './export-scope';

const items: FlowExportScopeItem[] = [
  { key: 'dated', title: '예약 확인', calendarEligible: true, status: 'done' },
  { key: 'undated', title: '짐 목록', calendarEligible: false, status: 'reopened' },
  { key: 'skipped', title: '선택 준비', calendarEligible: true, status: 'skipped' },
  { key: 'excluded', title: '제외 준비', calendarEligible: true, excluded: true },
  { key: 'deleted', title: '삭제 준비', calendarEligible: true, tombstoned: true },
];

test('whole Flow export keeps execution states but excludes structural removals', () => {
  const plan = buildFlowExportScopePlan({
    scope: 'flow',
    items,
    flowTitle: '여행 준비 Flow',
  });

  assert.deepEqual(plan.items.map((item) => item.key), ['dated', 'undated', 'skipped']);
  assert.deepEqual(plan.itemsByDestination.calendar.map((item) => item.key), ['dated', 'skipped']);
  assert.deepEqual(plan.itemsByDestination.memo.map((item) => item.key), ['dated', 'undated', 'skipped']);
  assert.equal(plan.countByDestination.calendar, 2);
  assert.equal(plan.countByDestination.checklist, 3);
  assert.equal(plan.excludedCount, 1);
  assert.equal(plan.tombstonedCount, 1);
  assert.equal(plan.canExport, true);
  assert.equal(plan.filenameByDestination.calendar, '여행-준비-Flow-all-calendar.ics');
});

test('selected export preserves source order and only uses selected keys', () => {
  const plan = buildFlowExportScopePlan({
    scope: 'selected',
    items,
    selectedKeys: ['skipped', 'undated', 'unknown'],
    flowTitle: '여행 준비',
  });

  assert.deepEqual(plan.items.map((item) => item.key), ['undated', 'skipped']);
  assert.equal(plan.countByDestination.calendar, 1);
  assert.equal(plan.countByDestination.sheet, 2);
  assert.equal(plan.filenameByDestination.sheet, '여행-준비-selected-sheet.tsv');
});

test('item export explicitly resolves one current item', () => {
  const plan = buildFlowExportScopePlan({
    scope: 'item',
    items,
    currentItemKey: 'dated',
    flowTitle: '여행 준비',
  });

  assert.equal(plan.requestedCount, 1);
  assert.equal(plan.includedCount, 1);
  assert.equal(plan.countByDestination.calendar, 1);
  assert.equal(plan.filenameByDestination.memo, '여행-준비-item-memo.txt');
});

test('empty selection blocks export without falling back to the whole Flow', () => {
  const plan = buildFlowExportScopePlan({
    scope: 'selected',
    items,
    selectedKeys: [],
    flowTitle: '여행 준비',
  });

  assert.equal(plan.requestedCount, 0);
  assert.equal(plan.includedCount, 0);
  assert.equal(plan.canExport, false);
});

test('duplicate and malformed keys never duplicate an exported row', () => {
  const plan = buildFlowExportScopePlan({
    scope: 'flow',
    items: [
      ...items,
      { key: 'dated', title: '중복 예약', calendarEligible: true },
      { key: '  ', title: '잘못된 항목', calendarEligible: true },
    ],
    flowTitle: '여행 준비',
  });

  assert.equal(plan.duplicateKeyCount, 1);
  assert.equal(plan.items.filter((item) => item.key === 'dated').length, 1);
});
