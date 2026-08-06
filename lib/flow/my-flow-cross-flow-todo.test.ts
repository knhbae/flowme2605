import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMyFlowCrossFlowTodoDateGroups,
  buildMyFlowCrossFlowTodoProjection,
  resolveMyFlowCrossFlowExecutionLevel,
  resolveMyFlowCrossFlowTodoShape,
  type MyFlowCrossFlowTodoCandidate,
} from './my-flow-cross-flow-todo';

type FixtureRow = { id: string; completionCriteria?: string };

function candidate(
  input: Partial<MyFlowCrossFlowTodoCandidate<FixtureRow>> & {
    key: string;
    shape: MyFlowCrossFlowTodoCandidate['shape'];
  },
): MyFlowCrossFlowTodoCandidate<FixtureRow> {
  return {
    stableItemId: input.key,
    flowSlug: `flow-${input.key}`,
    flowTitle: `Flow ${input.key}`,
    title: `할 일 ${input.key}`,
    executionLevel: 'item',
    current: false,
    completed: false,
    order: 0,
    row: { id: input.key },
    ...input,
  };
}

test('cross-flow Todo groups dated undated and completed work without duplicates', () => {
  const projection = buildMyFlowCrossFlowTodoProjection({
    today: '2030-08-10',
    candidates: [
      candidate({ key: 'today', shape: 'dated', date: '2030-08-10' }),
      candidate({ key: 'overdue', shape: 'checklist', date: '2030-08-09' }),
      candidate({ key: 'upcoming', shape: 'dated', date: '2030-08-11' }),
      candidate({ key: 'undated', shape: 'checklist' }),
      candidate({ key: 'completed', shape: 'checklist', completed: true }),
      candidate({ key: 'today', shape: 'dated', date: '2030-08-10' }),
    ],
  });

  assert.deepEqual(projection.groups.map((group) => group.id), [
    'today',
    'upcoming',
    'undated',
    'completed',
  ]);
  assert.deepEqual(
    projection.groups.find((group) => group.id === 'today')?.rows.map((row) => row.key),
    ['overdue', 'today'],
  );
  assert.equal(projection.rows.filter((row) => row.key === 'today').length, 1);
});

test('cross-flow Todo keeps only the current routine occurrence and current sheet row', () => {
  const projection = buildMyFlowCrossFlowTodoProjection({
    today: '2030-08-10',
    candidates: [
      candidate({
        key: 'routine-series',
        shape: 'routine',
        executionLevel: 'series',
        current: true,
      }),
      candidate({
        key: 'routine-current',
        shape: 'routine',
        executionLevel: 'occurrence',
        current: true,
      }),
      candidate({
        key: 'routine-future',
        shape: 'routine',
        executionLevel: 'occurrence',
        current: false,
      }),
      candidate({ key: 'sheet-current', shape: 'sheet', current: true }),
      candidate({ key: 'sheet-next', shape: 'sheet', current: false }),
    ],
  });

  assert.deepEqual(projection.rows.map((row) => row.key), [
    'routine-current',
    'sheet-current',
  ]);
});

test('cross-flow Todo excludes memo and resource rows', () => {
  const projection = buildMyFlowCrossFlowTodoProjection({
    today: '2030-08-10',
    candidates: [
      candidate({ key: 'memo', shape: 'memo' }),
      candidate({
        key: 'resource',
        shape: 'checklist',
        executionLevel: 'resource',
      }),
      candidate({ key: 'check', shape: 'checklist' }),
    ],
  });

  assert.deepEqual(projection.rows.map((row) => row.key), ['check']);
  assert.equal(projection.excludedCount, 2);
});

test('portable completion criterion stays out of Today/Todo grouping and completion state', () => {
  const projection = buildMyFlowCrossFlowTodoProjection({
    today: '2030-08-10',
    candidates: [
      candidate({
        key: 'criterion-pending',
        shape: 'checklist',
        row: { id: 'criterion-pending', completionCriteria: '사진 두 장을 공유했다.' },
      }),
      candidate({
        key: 'criterion-done',
        shape: 'checklist',
        completed: true,
        row: { id: 'criterion-done', completionCriteria: '답장을 확인했다.' },
      }),
    ],
  });

  assert.equal(projection.rows.find((row) => row.key === 'criterion-pending')?.completed, false);
  assert.equal(projection.rows.find((row) => row.key === 'criterion-done')?.completed, true);
  assert.deepEqual(projection.groups.map((group) => group.id), ['undated', 'completed']);
});

test('cross-flow Todo presents active work in exact date groups before undated and completed work', () => {
  const projection = buildMyFlowCrossFlowTodoProjection({
    today: '2030-08-10',
    candidates: [
      candidate({ key: 'past', shape: 'dated', date: '2030-08-09' }),
      candidate({ key: 'today', shape: 'dated', date: '2030-08-10' }),
      candidate({ key: 'future-a', shape: 'dated', date: '2030-08-12', order: 2 }),
      candidate({ key: 'future-b', shape: 'dated', date: '2030-08-12', order: 1 }),
      candidate({ key: 'undated', shape: 'checklist' }),
      candidate({ key: 'completed', shape: 'checklist', date: '2030-08-08', completed: true }),
    ],
  });
  const groups = buildMyFlowCrossFlowTodoDateGroups({
    today: '2030-08-10',
    rows: projection.rows,
  });

  assert.deepEqual(
    groups.map(({ id, state }) => ({ id, state })),
    [
      { id: 'date:2030-08-09', state: 'past' },
      { id: 'date:2030-08-10', state: 'today' },
      { id: 'date:2030-08-12', state: 'future' },
      { id: 'undated', state: 'undated' },
      { id: 'completed', state: 'completed' },
    ],
  );
  assert.deepEqual(groups[2]?.rows.map((row) => row.key), ['future-b', 'future-a']);
});

test('personal memo drafts use their executable rows instead of inheriting memo-only shape', () => {
  assert.equal(resolveMyFlowCrossFlowTodoShape({
    baseShape: 'memo',
    personalDraft: true,
    hasDatedRows: false,
  }), 'checklist');
  assert.equal(resolveMyFlowCrossFlowTodoShape({
    baseShape: 'memo',
    personalDraft: true,
    hasDatedRows: true,
  }), 'dated');
  assert.equal(resolveMyFlowCrossFlowTodoShape({
    baseShape: 'memo',
    personalDraft: false,
    hasDatedRows: true,
  }), 'memo');
});

test('personal draft rows remain actionable when source fragments add resource metadata', () => {
  assert.equal(
    resolveMyFlowCrossFlowExecutionLevel({
      personalDraft: true,
      itemTypes: ['check_task', 'memo_evidence'],
      occurrence: false,
      series: false,
    }),
    'item',
  );
  assert.equal(
    resolveMyFlowCrossFlowExecutionLevel({
      personalDraft: false,
      itemTypes: ['check_task', 'memo_evidence'],
      occurrence: false,
      series: false,
    }),
    'resource',
  );
});
