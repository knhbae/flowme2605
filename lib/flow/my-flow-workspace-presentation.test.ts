import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMyFlowTemporalPresentation,
  selectMyFlowNextActionRow,
} from './my-flow-workspace-presentation';

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

test('dated temporal presentation prefers today and keeps every same-date open row together', () => {
  const rows = [
    { id: 'past', date: '2030-08-01' },
    { id: 'today-a', date: '2030-08-15' },
    { id: 'today-b', date: '2030-08-15' },
    { id: 'future', date: '2030-08-20' },
  ];
  const presentation = buildMyFlowTemporalPresentation({
    rows,
    today: '2030-08-15',
    isCompleted: () => false,
    resolveDate: (row) => row.date,
  });

  assert.equal(presentation.nextGroup?.kind, 'today');
  assert.equal(presentation.nextGroup?.date, '2030-08-15');
  assert.deepEqual(presentation.nextGroup?.rows.map((row) => row.id), ['today-a', 'today-b']);
  assert.deepEqual(presentation.pastRows.map((row) => row.id), ['past']);
});

test('dated temporal presentation uses the nearest future date before any past work', () => {
  const rows = [
    { id: 'older', date: '2030-08-01' },
    { id: 'later', date: '2030-09-01' },
    { id: 'near-a', date: '2030-08-20' },
    { id: 'near-b', date: '2030-08-20' },
  ];
  const presentation = buildMyFlowTemporalPresentation({
    rows,
    today: '2030-08-15',
    isCompleted: () => false,
    resolveDate: (row) => row.date,
  });

  assert.equal(presentation.nextGroup?.kind, 'future');
  assert.equal(presentation.nextGroup?.date, '2030-08-20');
  assert.deepEqual(presentation.nextGroup?.rows.map((row) => row.id), ['near-a', 'near-b']);
  assert.equal(presentation.pastDateStart, '2030-08-01');
  assert.equal(presentation.pastDateEnd, '2030-08-01');
});

test('dated temporal presentation falls back to the nearest past date without deleting older work', () => {
  const rows = [
    { id: 'oldest', date: '2030-07-01' },
    { id: 'near-a', date: '2030-08-14' },
    { id: 'near-b', date: '2030-08-14' },
  ];
  const presentation = buildMyFlowTemporalPresentation({
    rows,
    today: '2030-08-15',
    isCompleted: () => false,
    resolveDate: (row) => row.date,
  });

  assert.equal(presentation.nextGroup?.kind, 'past');
  assert.deepEqual(presentation.nextGroup?.rows.map((row) => row.id), ['near-a', 'near-b']);
  assert.deepEqual(presentation.pastRows.map((row) => row.id), ['oldest', 'near-a', 'near-b']);
});

test('dated temporal presentation keeps completion separate and honors effective personal dates', () => {
  const rows = [
    { id: 'done', date: '2030-08-20' },
    { id: 'personally-fixed', date: '2030-08-01' },
    { id: 'undated' },
  ];
  const presentation = buildMyFlowTemporalPresentation({
    rows,
    today: '2030-08-15',
    isCompleted: (row) => row.id === 'done',
    resolveDate: (row) => row.id === 'personally-fixed' ? '2030-08-18' : row.date,
  });

  assert.equal(presentation.nextGroup?.date, '2030-08-18');
  assert.deepEqual(presentation.nextGroup?.rows.map((row) => row.id), ['personally-fixed']);
  assert.deepEqual(presentation.undatedRows.map((row) => row.id), ['undated']);
  assert.equal(presentation.futureRows.some((row) => row.id === 'done'), false);
});

test('dated temporal presentation leaves undated and fully completed flows without a dated next group', () => {
  const undated = buildMyFlowTemporalPresentation({
    rows: [{ id: 'a' }, { id: 'b' }],
    today: '2030-08-15',
    isCompleted: () => false,
    resolveDate: (row) => row.date,
  });
  const completed = buildMyFlowTemporalPresentation({
    rows: [{ id: 'done', date: '2030-08-20' }],
    today: '2030-08-15',
    isCompleted: () => true,
    resolveDate: (row) => row.date,
  });

  assert.equal(undated.hasDatedRows, false);
  assert.equal(undated.nextGroup, undefined);
  assert.equal(completed.hasDatedRows, true);
  assert.equal(completed.nextGroup, undefined);
});
