import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMemoDraftProposalProjection } from './memo-draft-proposal';

const fiveItems = Array.from({ length: 5 }, (_, index) => ({
  id: `memo-item-${index + 1}`,
  title: `${index + 1}번째 할 일`,
  detail: index === 0 ? '견적 조건을 함께 적는다.' : '',
  date: index === 0 ? '2030-08-30' : '',
  included: true,
}));

test('memo proposal keeps five parsed rows and recommends real list destinations', () => {
  const projection = buildMemoDraftProposalProjection({
    title: '우리 집 이사 준비',
    items: fiveItems,
  });

  assert.equal(projection.primaryShape, 'checklist');
  assert.deepEqual(projection.secondaryShapes, ['calendar', 'memo']);
  assert.equal(projection.shapes.checklist.count, 5);
  assert.equal(projection.shapes.memo.count, 5);
  assert.equal(projection.shapes.calendar.count, 1);
  assert.equal(projection.shapes.sheet.count, 5);
  assert.equal(projection.sourceMutationCount, 0);
});

test('memo proposal excludes unchecked rows without mutating the draft input', () => {
  const items = fiveItems.map((item) => ({ ...item }));
  items[2].included = false;
  const before = structuredClone(items);
  const projection = buildMemoDraftProposalProjection({
    title: '주말 준비',
    items,
  });

  assert.equal(projection.outlineRows.length, 4);
  assert.equal(projection.excludedRows.length, 1);
  assert.equal(projection.shapes.checklist.count, 4);
  assert.deepEqual(items, before);
});

test('memo proposal safely treats malformed dates as unscheduled', () => {
  const projection = buildMemoDraftProposalProjection({
    title: '날짜 확인',
    items: [{
      id: 'memo-item-invalid-date',
      title: '날짜를 다시 확인하기',
      date: '2030-02-31',
      included: true,
    }],
  });

  assert.equal(projection.outlineRows[0].schedule.state, 'unscheduled');
  assert.equal(projection.shapes.calendar.count, 0);
  assert.deepEqual(projection.secondaryShapes, ['memo', 'sheet']);
});
