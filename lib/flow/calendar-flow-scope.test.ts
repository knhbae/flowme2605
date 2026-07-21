import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCalendarFlowScopePresentation,
  getCalendarFlowScopeForFlow,
  getCalendarFlowSlugFromScope,
  isCalendarFlowRowInSelection,
  isCalendarFlowRowInScope,
  normalizeCalendarFlowSelection,
  normalizeCalendarFlowScope,
} from './calendar-flow-scope';

const moving = { flowSlug: 'moving-d30-basic', isRoutine: false };
const workout = { flowSlug: 'allblanc-home-training-4week', isRoutine: true };

test('Calendar Flow scope distinguishes all, one Flow, and routine rows', () => {
  assert.equal(isCalendarFlowRowInScope(moving, 'all'), true);
  assert.equal(isCalendarFlowRowInScope(workout, 'all'), true);
  assert.equal(isCalendarFlowRowInScope(moving, 'routine'), false);
  assert.equal(isCalendarFlowRowInScope(workout, 'routine'), true);
  assert.equal(
    isCalendarFlowRowInScope(moving, getCalendarFlowScopeForFlow('moving-d30-basic')),
    true,
  );
  assert.equal(
    isCalendarFlowRowInScope(workout, getCalendarFlowScopeForFlow('moving-d30-basic')),
    false,
  );
});

test('Calendar Flow scope keeps stable slugs and rejects empty or stale selections', () => {
  assert.equal(getCalendarFlowScopeForFlow(' moving-d30-basic '), 'flow:moving-d30-basic');
  assert.equal(getCalendarFlowSlugFromScope('flow:moving-d30-basic'), 'moving-d30-basic');
  assert.equal(getCalendarFlowSlugFromScope('flow:'), undefined);
  assert.equal(
    normalizeCalendarFlowScope('flow:moving-d30-basic', ['moving-d30-basic'], false),
    'flow:moving-d30-basic',
  );
  assert.equal(
    normalizeCalendarFlowScope('flow:removed-flow', ['moving-d30-basic'], false),
    'all',
  );
  assert.equal(normalizeCalendarFlowScope('routine', ['moving-d30-basic'], false), 'all');
});

test('Calendar Flow scope presentation stays bounded as the library grows', () => {
  assert.equal(getCalendarFlowScopePresentation(1), 'hidden');
  assert.equal(getCalendarFlowScopePresentation(2), 'compact');
  assert.equal(getCalendarFlowScopePresentation(5), 'compact');
  assert.equal(getCalendarFlowScopePresentation(6), 'picker');
  assert.equal(getCalendarFlowScopePresentation(25), 'picker');
});

test('Calendar multi-Flow selection normalizes stale values and filters every consumer consistently', () => {
  const selected = normalizeCalendarFlowSelection(
    [' moving-d30-basic ', 'allblanc-home-training-4week', 'removed', 'moving-d30-basic'],
    ['moving-d30-basic', 'allblanc-home-training-4week'],
  );
  assert.deepEqual(selected, ['moving-d30-basic', 'allblanc-home-training-4week']);
  assert.equal(isCalendarFlowRowInSelection(moving, selected), true);
  assert.equal(isCalendarFlowRowInSelection(workout, selected), true);
  assert.equal(isCalendarFlowRowInSelection({ flowSlug: 'other', isRoutine: false }, selected), false);
  assert.equal(isCalendarFlowRowInSelection(moving, []), true);
});
