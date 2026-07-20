import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMyFlowViewHref,
  parseMyFlowViewQuery,
  summarizeMyFlowLocalIa,
} from './my-flow-local-ia';

test('My Flow local views round-trip through a stable URL query', () => {
  assert.equal(parseMyFlowViewQuery('?view=now'), 'today');
  assert.equal(parseMyFlowViewQuery('?savedMap=moving-d30&view=flows'), 'flow');
  assert.equal(parseMyFlowViewQuery('?view=completed'), 'completed');
  assert.equal(parseMyFlowViewQuery('?view=calendar'), null);
  assert.equal(
    getMyFlowViewHref('/my?savedMap=moving-d30#workspace', 'flow'),
    '/my?savedMap=moving-d30&view=flows#workspace',
  );
});

test('My Flow local summary supports empty, one, three, and twenty Flow states', () => {
  assert.deepEqual(summarizeMyFlowLocalIa([]), { flowCount: 0, nowCount: 0, completedCount: 0 });
  assert.deepEqual(
    summarizeMyFlowLocalIa([{ id: 'moving', nowItemIds: ['pack', 'pack'], completedItemIds: ['call'] }]),
    { flowCount: 1, nowCount: 1, completedCount: 1 },
  );
  assert.deepEqual(
    summarizeMyFlowLocalIa([
      { id: 'moving', nowItemIds: ['pack'] },
      { id: 'study', nowItemIds: ['lesson'], completedItemIds: ['review'] },
      { id: 'check', completedItemIds: ['tires'] },
    ]),
    { flowCount: 3, nowCount: 2, completedCount: 2 },
  );
  assert.deepEqual(
    summarizeMyFlowLocalIa(
      Array.from({ length: 20 }, (_, index) => ({ id: `flow-${index}`, nowItemIds: [`item-${index}`] })),
    ),
    { flowCount: 20, nowCount: 20, completedCount: 0 },
  );
});

test('held content is excluded from ordinary My Flow navigation counts', () => {
  assert.deepEqual(
    summarizeMyFlowLocalIa([
      { id: 'ready', nowItemIds: ['open'], completedItemIds: ['done'] },
      { id: 'held', executionHeld: true, nowItemIds: ['blocked'], completedItemIds: ['old'] },
    ]),
    { flowCount: 1, nowCount: 1, completedCount: 1 },
  );
});
