import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FLOW_EXECUTION_ACTIONS,
  FLOW_EXECUTION_COPY_BUDGET,
  isWithinExecutionCopyBudget,
} from './execution-ui-contract';

test('shared execution actions use short user-facing labels within the action budget', () => {
  const labels = Object.values(FLOW_EXECUTION_ACTIONS).map((action) => action.label);

  labels.forEach((label) => {
    assert.equal(isWithinExecutionCopyBudget(label, 'action'), true, label);
  });
  assert.equal(new Set(labels).size, labels.length);
  assert.equal(FLOW_EXECUTION_COPY_BUDGET.action, 14);
});

test('the action taxonomy keeps commands, completion, recovery, and destructive actions distinct', () => {
  assert.equal(FLOW_EXECUTION_ACTIONS.saveChanges.role, 'primary');
  assert.equal(FLOW_EXECUTION_ACTIONS.openItem.role, 'utility');
  assert.equal(FLOW_EXECUTION_ACTIONS.delete.role, 'destructive');
  assert.equal(FLOW_EXECUTION_ACTIONS.undo.role, 'recovery');
});

test('copy budget counts Korean display characters rather than bytes', () => {
  assert.equal(isWithinExecutionCopyBudget('이사 방식과 견적 후보 정하기', 'title'), true);
  assert.equal(isWithinExecutionCopyBudget('가'.repeat(FLOW_EXECUTION_COPY_BUDGET.helper + 1), 'helper'), false);
});
