import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMyFlowCompactTodayModel,
  consumeMyFlowFirstEntry,
  consumeMyFlowFirstEntryPlan,
  getMyFlowLibraryControlVisibility,
  getMyFlowLibraryHref,
  getMyFlowWorkspaceHref,
  getMyFlowViewHref,
  markMyFlowFirstEntry,
  markMyFlowFirstEntryPlan,
  MY_FLOW_SAVED_LIBRARY_SEARCH_THRESHOLD,
  parseMyFlowLibraryRoute,
  parseMyFlowWorkspaceTarget,
  parseMyFlowViewQuery,
  selectMyFlowSavedLibraryEntries,
  summarizeMyFlowLocalIa,
  withMyFlowLibraryScrollY,
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
  assert.equal(
    getMyFlowWorkspaceHref({
      flowSlug: 'moving-d30-basic',
      itemKey: 'moving-d30-basic::step-1',
      itemDate: '2026-07-13',
    }),
    '/my?view=flows&flow=moving-d30-basic&item=moving-d30-basic%3A%3Astep-1&date=2026-07-13',
  );
  assert.deepEqual(
    parseMyFlowWorkspaceTarget('?view=flows&flow=moving-d30-basic&item=item%3A1&date=2026-07-13'),
    { flowSlug: 'moving-d30-basic', itemKey: 'item:1', itemDate: '2026-07-13' },
  );
  assert.equal(parseMyFlowWorkspaceTarget('?view=flows'), null);
});

test('saved receipt marks the compact first entry once without creating persistent product state', () => {
  const storage = createSessionStorageFixture();
  markMyFlowFirstEntry(storage, 'moving-d30-basic');

  assert.equal(consumeMyFlowFirstEntry(storage, 'vehicle-inspection-prep'), false);
  assert.equal(consumeMyFlowFirstEntry(storage, 'moving-d30-basic'), true);
  assert.equal(consumeMyFlowFirstEntry(storage, 'moving-d30-basic'), false);
});

test('legacy first-entry-plan helpers keep the same session key and one-shot handoff', () => {
  const storage = createSessionStorageFixture();
  markMyFlowFirstEntryPlan(storage, 'moving-d30-basic');

  assert.equal(consumeMyFlowFirstEntryPlan(storage, 'moving-d30-basic'), true);
  assert.equal(consumeMyFlowFirstEntry(storage, 'moving-d30-basic'), false);
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

test('My Flow library keeps 0/1/5 compact and reveals search at twenty Flows', () => {
  for (const flowCount of [0, 1, 3, 5]) {
    assert.deepEqual(
      getMyFlowLibraryControlVisibility({
        flowCount,
        searchThreshold: MY_FLOW_SAVED_LIBRARY_SEARCH_THRESHOLD,
      }),
      { search: false, filters: false, mode: 'compact' },
    );
  }

  for (const flowCount of [20, 60]) {
    assert.deepEqual(
      getMyFlowLibraryControlVisibility({
        flowCount,
        searchThreshold: MY_FLOW_SAVED_LIBRARY_SEARCH_THRESHOLD,
      }),
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

test('P0-07 rollback keeps the established five-Flow search threshold', () => {
  assert.deepEqual(
    getMyFlowLibraryControlVisibility({ flowCount: 5 }),
    { search: true, filters: true, mode: 'searchable' },
  );
});

test('saved-plan library route preserves query/filter/target and keeps scroll in history only', () => {
  const historyState = withMyFlowLibraryScrollY({ unrelated: 'keep' }, 418.9, 231.4);
  const href = getMyFlowLibraryHref('/my?demo=ux20&mode=todo#library', {
    query: ' 이사 ',
    filter: 'open',
    target: {
      flowSlug: 'moving-d30-basic',
      itemKey: 'moving::pack',
      itemDate: '2030-09-05',
    },
  });

  assert.equal(
    href,
    '/my?demo=ux20&view=flows&q=%EC%9D%B4%EC%82%AC&status=open&flow=moving-d30-basic&item=moving%3A%3Apack&date=2030-09-05#library',
  );
  assert.deepEqual(parseMyFlowLibraryRoute(new URL(href, 'https://flowme.local').search, historyState), {
    query: '이사',
    filter: 'open',
    target: {
      flowSlug: 'moving-d30-basic',
      itemKey: 'moving::pack',
      itemDate: '2030-09-05',
    },
    scrollY: 418,
    railScrollTop: 231,
  });
  assert.equal((historyState as { unrelated?: string }).unrelated, 'keep');
  assert.doesNotMatch(href, /scroll/u);
});

test('My Flow URL transformations preserve an unrelated R3A experience selector', () => {
  const itemHref = getMyFlowLibraryHref(
    '/my?myFlowExperience=r3a-lab&demo=ux20#library',
    {
      query: 'moving',
      filter: 'open',
      target: {
        flowSlug: 'moving-d30-basic',
        itemKey: 'moving::pack',
      },
    },
  );
  assert.equal(
    new URL(itemHref, 'https://flowme.local').searchParams.get('myFlowExperience'),
    'r3a-lab',
  );

  const listHref = getMyFlowLibraryHref(itemHref, {
    query: '',
    filter: 'all',
    target: null,
  });
  assert.equal(
    new URL(listHref, 'https://flowme.local').searchParams.get('myFlowExperience'),
    'r3a-lab',
  );
  assert.equal(
    getMyFlowViewHref('/my?myFlowExperience=r3a-lab#workspace', 'flow'),
    '/my?myFlowExperience=r3a-lab&view=flows#workspace',
  );
});

test('saved-plan library route rejects unsupported filters and clears stale item identity', () => {
  assert.deepEqual(parseMyFlowLibraryRoute('?view=flows&status=recent&item=orphan'), {
    query: '',
    filter: 'all',
    target: null,
    scrollY: 0,
    railScrollTop: 0,
  });
  assert.equal(
    getMyFlowLibraryHref('/my?view=flows&flow=old&item=old-item&date=2030-01-01', {
      query: '',
      filter: 'all',
      target: null,
    }),
    '/my?view=flows',
  );
});

test('compact Today is derived, identity-stable, deduplicated, and absent at zero', () => {
  const row = (key: string, groupId: string, completed = false) => ({
    key,
    stableItemId: key.split('::')[1] ?? key,
    flowSlug: key.split('::')[0] ?? 'flow',
    groupId,
    completed,
    row: { title: key },
  });
  const model = buildMyFlowCompactTodayModel([
    row('moving::pack', 'today'),
    row('moving::pack', 'today'),
    row('study::lesson', 'today'),
    row('routine::run', 'today'),
    row('future::call', 'upcoming'),
    row('done::old', 'today', true),
    row('extra::fourth', 'today'),
  ]);

  assert.deepEqual(model.items.map((item) => item.key), [
    'moving::pack',
    'study::lesson',
    'routine::run',
  ]);
  assert.equal(model.total, 4);
  assert.equal(model.hiddenCount, 1);
  assert.equal(model.source, 'effective_execution');
  assert.equal(model.writeOwner, 'none');
  assert.deepEqual(buildMyFlowCompactTodayModel([]), {
    items: [],
    total: 0,
    hiddenCount: 0,
    source: 'effective_execution',
    writeOwner: 'none',
  });
});

test('saved library uses one identity set for recent, active, completed, and archived lenses', () => {
  const values = {
    alpha: { marker: 'alpha' },
    beta: { marker: 'beta' },
    done: { marker: 'done' },
    archived: { marker: 'archived' },
  };
  const entries = [
    { stableId: 'plan-b', title: '같은 제목', lastVisited: '2030-09-01', done: 1, total: 3, archived: false, value: values.beta },
    { stableId: 'plan-a', title: '같은 제목', lastVisited: '2030-09-01', done: 0, total: 3, archived: false, value: values.alpha },
    { stableId: 'plan-done', title: '완료 계획', lastVisited: '2030-08-01', done: 2, total: 2, archived: false, value: values.done },
    { stableId: 'plan-archived', title: '보관 계획', lastVisited: '2030-10-01', done: 0, total: 1, archived: true, value: values.archived },
  ];

  const recent = selectMyFlowSavedLibraryEntries(entries);
  assert.deepEqual(recent.map((entry) => entry.stableId), ['plan-a', 'plan-b', 'plan-done']);
  const active = selectMyFlowSavedLibraryEntries(entries, { filter: 'open' });
  assert.deepEqual(active.map((entry) => entry.stableId), ['plan-a', 'plan-b']);
  assert.equal(active[0]?.value, values.alpha);
  assert.equal(active[1]?.value, values.beta);
  assert.deepEqual(
    selectMyFlowSavedLibraryEntries(entries, { filter: 'done' }).map((entry) => entry.stableId),
    ['plan-done'],
  );
  assert.deepEqual(
    selectMyFlowSavedLibraryEntries(entries, { filter: 'archived' }).map((entry) => entry.stableId),
    ['plan-archived'],
  );
});
