import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWholeFlowReadingModel } from './whole-flow-reading';

function rows(count: number, sections: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index + 1}`,
    section: `단계 ${Math.floor(index / Math.ceil(count / sections)) + 1}`,
    date: `2026-08-${String(Math.floor(index / 4) + 1).padStart(2, '0')}`,
    completed: index < 2,
  }));
}

test('short three and ten item Flows stay fully readable', () => {
  const three = buildWholeFlowReadingModel({ structureType: 'routine', rows: rows(3, 2) });
  const ten = buildWholeFlowReadingModel({ structureType: 'checklist', rows: rows(10, 2) });

  assert.equal(three.disclosureRequired, false);
  assert.equal(three.groups.every((group) => group.defaultOpen), true);
  assert.equal(ten.disclosureRequired, false);
  assert.equal(ten.groups.every((group) => group.defaultOpen), true);
});
test('a long 24 item Flow opens the next actionable phase only', () => {
  const model = buildWholeFlowReadingModel({ structureType: 'timeline', rows: rows(24, 6) });

  assert.equal(model.totalCount, 24);
  assert.equal(model.groups.length, 6);
  assert.equal(model.completedCount, 2);
  assert.equal(model.disclosureRequired, true);
  assert.equal(model.groups.filter((group) => group.defaultOpen).length, 1);
  assert.equal(model.groups[0].defaultOpen, true);
  assert.equal(model.nextRowId, 'item-3');
});

test('same-date rows share one date cluster without changing row order', () => {
  const input = [
    { id: 'a', section: '준비', date: '2026-08-10' },
    { id: 'b', section: '준비', date: '2026-08-10' },
    { id: 'c', section: '준비', date: '2026-08-11' },
  ];
  const model = buildWholeFlowReadingModel({ structureType: 'timeline', rows: input });
  const firstCluster = model.groups[0].dateClusters[0];

  assert.equal(firstCluster.showSharedDate, true);
  assert.deepEqual(firstCluster.rows.map((row) => row.id), ['a', 'b']);
  assert.deepEqual(model.rows.map((row) => row.id), ['a', 'b', 'c']);
  assert.deepEqual(input.map((row) => row.id), ['a', 'b', 'c']);
});

test('non-contiguous sections do not override a personal row order', () => {
  const model = buildWholeFlowReadingModel({
    structureType: 'checklist',
    rows: [
      { id: 'source-a', section: 'Source' },
      { id: 'personal', section: 'Personal' },
      { id: 'source-b', section: 'Source' },
    ],
  });

  assert.deepEqual(model.groups.map((group) => group.rows.map((row) => row.id)), [
    ['source-a'],
    ['personal'],
    ['source-b'],
  ]);
  assert.deepEqual(model.rows.map((row) => row.id), ['source-a', 'personal', 'source-b']);
});

test('invalid dates do not remove rows or enter the date range', () => {
  const model = buildWholeFlowReadingModel({
    structureType: 'checklist',
    rows: [
      { id: 'valid', section: '확인', date: '2026-08-12' },
      { id: 'invalid', section: '확인', date: '2026-02-30' },
      { id: 'undated', section: '확인' },
    ],
  });

  assert.equal(model.totalCount, 3);
  assert.equal(model.startDate, '2026-08-12');
  assert.equal(model.endDate, '2026-08-12');
});
