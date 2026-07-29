import assert from 'node:assert/strict';
import test from 'node:test';

import {
  consumeMyFlowFirstEntryPlan,
  getMyFlowLibraryControlVisibility,
  getMyFlowWorkspaceHref,
  getMyFlowViewHref,
  markMyFlowFirstEntryPlan,
  parseMyFlowWorkspaceTarget,
  parseMyFlowViewQuery,
  summarizeMyFlowLocalIa,
} from './my-flow-local-ia';

function createSessionStorageFixture() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test('legacy My Flow views resolve to the library without deleting saved state', () => {
  assert.equal(parseMyFlowViewQuery('?view=now'), 'flow');
  assert.equal(parseMyFlowViewQuery('?savedMap=moving-d30&view=flows'), 'flow');
  assert.equal(parseMyFlowViewQuery('?view=completed'), 'flow');
  assert.equal(parseMyFlowViewQuery('?view=calendar'), null);
  assert.equal(
    getMyFlowViewHref('/my?savedMap=moving-d30#workspace', 'flow'),
    '/my?savedMap=moving-d30&view=flows#workspace',
  );
});

test('Calendar deep links preserve the Flow and optional stable item identity', () => {
  assert.equal(
    getMyFlowWorkspaceHref({ flowSlug: 'moving-d30-basic' }),
    '/my?view=flows&flow=moving-d30-basic',
  );
  assert.equal(
    getMyFlowWorkspaceHref({
      flowSlug: 'moving-d30-basic',
      itemKey: 'moving-d30-basic::step-1',
    }),
    '/my?view=flows&flow=moving-d30-basic&item=moving-d30-basic%3A%3Astep-1',
  );
  assert.deepEqual(
    parseMyFlowWorkspaceTarget('?view=flows&flow=moving-d30-basic&item=item%3A1'),
    { flowSlug: 'moving-d30-basic', itemKey: 'item:1' },
  );
  assert.equal(parseMyFlowWorkspaceTarget('?view=flows'), null);
});

test('saved receipt expands the whole plan once without creating persistent product state', () => {
  const storage = createSessionStorageFixture();
  markMyFlowFirstEntryPlan(storage, 'moving-d30-basic');

  assert.equal(consumeMyFlowFirstEntryPlan(storage, 'vehicle-inspection-prep'), false);
  assert.equal(consumeMyFlowFirstEntryPlan(storage, 'moving-d30-basic'), true);
  assert.equal(consumeMyFlowFirstEntryPlan(storage, 'moving-d30-basic'), false);
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

test('My Flow library keeps small collections browsable and reveals search at five Flows', () => {
  for (const flowCount of [0, 1, 3]) {
    assert.deepEqual(
      getMyFlowLibraryControlVisibility({ flowCount }),
      { search: false, filters: false, mode: 'compact' },
    );
  }

  for (const flowCount of [5, 12]) {
    assert.deepEqual(
      getMyFlowLibraryControlVisibility({ flowCount }),
      { search: true, filters: true, mode: 'searchable' },
    );
  }
});

test('My Flow library keeps an active query or archive recovery reachable below the threshold', () => {
  assert.deepEqual(
    getMyFlowLibraryControlVisibility({ flowCount: 3, query: '이사' }),
    { search: true, filters: false, mode: 'compact' },
  );
  assert.deepEqual(
    getMyFlowLibraryControlVisibility({ flowCount: 3, archivedCount: 1 }),
    { search: false, filters: true, mode: 'compact' },
  );
  assert.deepEqual(
    getMyFlowLibraryControlVisibility({ flowCount: 3, filter: 'open' }),
    { search: false, filters: true, mode: 'compact' },
  );
});
