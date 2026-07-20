import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFlowExportScopePlan,
  buildFlowExportResultReceipt,
  type FlowExportScopeItem,
} from './export-scope';

const items: FlowExportScopeItem[] = [
  { key: 'dated', title: '예약 확인', calendarEligible: true, status: 'done' },
  { key: 'undated', title: '짐 목록', calendarEligible: false, status: 'reopened' },
  {
    key: 'skipped',
    title: '선택 준비',
    calendarEligible: true,
    status: 'skipped',
    recurrenceSeriesId: 'series-1',
    calendarVisibleOccurrenceCount: 4,
  },
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
  assert.equal(plan.includedCount, 3);
  assert.equal(plan.excludedCount, 1);
  assert.equal(plan.tombstonedCount, 1);
  assert.equal(plan.canExport, true);
  assert.equal(plan.metrics.datedCount, 2);
  assert.equal(plan.metrics.undatedCount, 1);
  assert.equal(plan.metrics.recurringSeriesCount, 1);
  assert.equal(plan.metrics.visibleOccurrenceCount, 4);
  assert.equal(plan.metrics.omittedCountByDestination.calendar, 3);
  assert.equal(plan.metrics.omittedCountByDestination.memo, 2);
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

test('completion and reopen never change export membership or destination counts', () => {
  const donePlan = buildFlowExportScopePlan({
    scope: 'flow',
    items: items.map((item) => ({ ...item, status: item.key === 'undated' ? 'done' : item.status })),
    flowTitle: '여행 준비',
  });
  const reopenedPlan = buildFlowExportScopePlan({
    scope: 'flow',
    items: items.map((item) => ({ ...item, status: item.key === 'undated' ? 'reopened' : item.status })),
    flowTitle: '여행 준비',
  });

  assert.deepEqual(reopenedPlan.items.map((item) => item.key), donePlan.items.map((item) => item.key));
  assert.deepEqual(reopenedPlan.countByDestination, donePlan.countByDestination);
  assert.equal(reopenedPlan.includedCount, donePlan.includedCount);
});

test('result receipt reports the actual output and destination omissions', () => {
  const plan = buildFlowExportScopePlan({
    scope: 'flow',
    items,
    flowTitle: '여행 준비',
  });
  const receipt = buildFlowExportResultReceipt({
    plan,
    destination: 'calendar',
    resultKind: 'download',
    outputCount: 2,
    filename: plan.filenameByDestination.calendar,
  });

  assert.equal(receipt.outputCount, 2);
  assert.equal(receipt.omittedCount, 3);
  assert.equal(receipt.filename, '여행-준비-all-calendar.ics');
  assert.match(receipt.message, /캘린더 일정 2개/);
});

test('calendar item membership stays distinct from generated event count', () => {
  const plan = buildFlowExportScopePlan({
    scope: 'flow',
    flowTitle: '여러 날 일정',
    items: [
      {
        key: 'dated-range',
        title: '여러 날 이어지는 일',
        calendarEligible: true,
        calendarOutputCount: 3,
      },
      {
        key: 'undated-note',
        title: '날짜 없는 메모',
        calendarEligible: false,
      },
    ],
  });

  assert.equal(plan.metrics.datedCount, 1);
  assert.equal(plan.metrics.undatedCount, 1);
  assert.equal(plan.countByDestination.calendar, 3);
  assert.equal(plan.metrics.omittedCountByDestination.calendar, 1);
});

test('failed copy receipt never claims rows were exported', () => {
  const plan = buildFlowExportScopePlan({
    scope: 'item',
    items,
    currentItemKey: 'dated',
    flowTitle: '여행 준비',
  });
  const receipt = buildFlowExportResultReceipt({
    plan,
    destination: 'memo',
    resultKind: 'copy',
    outputCount: 0,
    status: 'error',
  });

  assert.equal(receipt.status, 'error');
  assert.equal(receipt.outputCount, 0);
  assert.match(receipt.message, /만들지 못했어요/);
});
