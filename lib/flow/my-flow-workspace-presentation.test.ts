import assert from 'node:assert/strict';
import test from 'node:test';

import { selectMyFlowNextActionRow } from './my-flow-workspace-presentation';

test('next action uses effective personal dates instead of source array order', () => {
  const rows = [
    { id: 'source-first', date: '2030-08-15' },
    { id: 'personally-moved', date: '2030-08-20' },
    { id: 'undated' },
  ];
  const next = selectMyFlowNextActionRow(
    rows,
    () => false,
    (row) => row.id === 'personally-moved' ? '2030-08-01' : row.date,
  );

  assert.equal(next?.id, 'personally-moved');
  assert.equal(next?.date, '2030-08-01');
});

test('next action keeps personal order for equally dated or undated rows', () => {
  const rows = [
    { id: 'done', date: '2030-08-01' },
    { id: 'first-undated' },
    { id: 'second-undated' },
  ];
  const next = selectMyFlowNextActionRow(rows, (row) => row.id === 'done', (row) => row.date);
  assert.equal(next?.id, 'first-undated');
});
