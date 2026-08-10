import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMyFlowShapeAwareWorkspaceModel,
  buildMyFlowSingleCompletionOwnerPlan,
  shouldOfferMyFlowCompletionUndo,
} from './my-flow-shape-aware-workspace';

test('dated Flow uses the nearest date group before the whole plan', () => {
  const model = buildMyFlowShapeAwareWorkspaceModel({
    structureType: 'timeline',
    primaryDestination: 'calendar',
    hasDatedRows: true,
  });

  assert.equal(model.shape, 'dated');
  assert.equal(model.executionUnitKind, 'nearest_date_group');
  assert.deepEqual(model.semanticOrder, ['execution', 'plan']);
});

test('an explicitly undated saved calendar-origin Flow stays a checklist in My Flow', () => {
  const model = buildMyFlowShapeAwareWorkspaceModel({
    structureType: 'timeline',
    primaryDestination: 'calendar',
    savedArtifactMode: 'checklist',
    hasDatedRows: false,
  });

  assert.equal(model.shape, 'checklist');
  assert.equal(model.executionUnitKind, 'next_items');
  assert.equal(model.executionLabel, '이어서 할 일');
});

test('checklist, routine, and sheet preserve their own execution units', () => {
  assert.equal(buildMyFlowShapeAwareWorkspaceModel({
    structureType: 'checklist',
    primaryDestination: 'todo',
    hasDatedRows: false,
  }).executionUnitKind, 'next_items');

  assert.equal(buildMyFlowShapeAwareWorkspaceModel({
    structureType: 'routine',
    primaryDestination: 'calendar',
    hasDatedRows: true,
  }).executionUnitKind, 'current_occurrence');

  assert.equal(buildMyFlowShapeAwareWorkspaceModel({
    structureType: 'checklist',
    primaryDestination: 'sheet',
    hasDatedRows: false,
  }).executionUnitKind, 'current_and_next_row');
});

test('memo does not synthesize a next action or a fixed history section', () => {
  const freshMemo = buildMyFlowShapeAwareWorkspaceModel({
    structureType: 'checklist',
    primaryDestination: 'memo',
    hasDatedRows: false,
  });
  const memoWithHistory = buildMyFlowShapeAwareWorkspaceModel({
    structureType: 'checklist',
    primaryDestination: 'memo',
    hasDatedRows: false,
    historyEventCount: 1,
  });

  assert.equal(freshMemo.executionVisible, false);
  assert.equal(freshMemo.historyVisible, false);
  assert.deepEqual(freshMemo.semanticOrder, ['plan']);
  assert.deepEqual(memoWithHistory.semanticOrder, ['plan', 'history']);
});

test('a persisted memo artifact stays non-executable even for a calendar-origin Flow', () => {
  const model = buildMyFlowShapeAwareWorkspaceModel({
    structureType: 'timeline',
    primaryDestination: 'calendar',
    savedArtifactMode: 'memo',
    hasDatedRows: true,
  });

  assert.equal(model.shape, 'memo');
  assert.equal(model.executionUnitKind, 'none');
  assert.equal(model.executionVisible, false);
  assert.deepEqual(model.semanticOrder, ['plan']);
});

test('history appears only when an execution event exists', () => {
  const model = buildMyFlowShapeAwareWorkspaceModel({
    structureType: 'timeline',
    primaryDestination: 'calendar',
    hasDatedRows: true,
    historyEventCount: 2,
  });

  assert.equal(model.historyVisible, true);
  assert.deepEqual(model.semanticOrder, ['execution', 'plan', 'history']);
});

test('current execution rows are summarized instead of duplicated in the whole plan', () => {
  const wholePlanRows = [
    { itemId: 'a', date: '2030-08-01' },
    { itemId: 'b', date: '2030-08-01' },
    { itemId: 'c', date: '2030-08-03' },
  ];
  const plan = buildMyFlowSingleCompletionOwnerPlan({
    wholePlanRows,
    executionRows: wholePlanRows.slice(0, 2),
  });

  assert.equal(plan.currentPositionCount, 2);
  assert.deepEqual(plan.executionOwnerKeys, [
    'item:a:2030-08-01',
    'item:b:2030-08-01',
  ]);
  assert.deepEqual(plan.wholePlanContextKeys, ['item:c:2030-08-03']);
});

test('completion undo is offered only when the completed row leaves the visible surface', () => {
  assert.equal(shouldOfferMyFlowCompletionUndo({
    completed: true,
    calendarSurface: false,
    recurringOccurrence: false,
    remainsVisibleInFocusedPlan: true,
  }), false);
  assert.equal(shouldOfferMyFlowCompletionUndo({
    completed: true,
    calendarSurface: false,
    recurringOccurrence: true,
    remainsVisibleInFocusedPlan: false,
  }), true);
  assert.equal(shouldOfferMyFlowCompletionUndo({
    completed: true,
    calendarSurface: true,
    recurringOccurrence: false,
    remainsVisibleInFocusedPlan: false,
  }), false);
  assert.equal(shouldOfferMyFlowCompletionUndo({
    completed: true,
    calendarSurface: true,
    approvedCalendarExecution: true,
    recurringOccurrence: true,
    remainsVisibleInFocusedPlan: true,
  }), true);
});
