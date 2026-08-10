import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildMyFlowLibraryHistoryState,
  parseMyFlowLibraryHistoryLevel,
  planMyFlowLibraryTransition,
  type MyFlowLibraryControllerContext,
  type MyFlowLibraryControllerState,
} from './my-flow-library-controller';

const current: MyFlowLibraryControllerState = {
  query: '이사',
  filter: 'open',
  sort: 'next',
  selectedFlowSlug: 'moving',
  itemTarget: { flowSlug: 'moving', itemKey: 'moving::pack' },
};

function context(
  overrides: Partial<MyFlowLibraryControllerContext> = {},
): MyFlowLibraryControllerContext {
  return {
    currentHref: '/my?demo=ux20&view=flows&q=%EC%9D%B4%EC%82%AC&status=open&flow=moving&item=moving%3A%3Apack#library',
    currentRoute: {
      query: '이사',
      filter: 'open',
      sort: 'next',
      target: { flowSlug: 'moving', itemKey: 'moving::pack' },
      scrollY: 418,
      railScrollTop: 231,
    },
    historyLevel: 'item',
    scrollY: 418.9,
    railScrollTop: 231.4,
    ...overrides,
  };
}

test('history level accepts only list, plan, and item markers', () => {
  assert.equal(parseMyFlowLibraryHistoryLevel(null), null);
  assert.equal(parseMyFlowLibraryHistoryLevel({ flowmeMyFlowLibrary: { level: 'other' } }), null);
  assert.equal(parseMyFlowLibraryHistoryLevel({ flowmeMyFlowLibrary: { level: 'list' } }), 'list');
  assert.equal(parseMyFlowLibraryHistoryLevel({ flowmeMyFlowLibrary: { level: 'plan' } }), 'plan');
  assert.equal(parseMyFlowLibraryHistoryLevel({ flowmeMyFlowLibrary: { level: 'item' } }), 'item');
});

test('history state preserves unrelated keys and normalizes scroll values', () => {
  assert.deepEqual(
    buildMyFlowLibraryHistoryState({ unrelated: 'keep' }, 'list', 418.9, -3),
    {
      unrelated: 'keep',
      flowmeMyFlowLibrary: { level: 'list', scrollY: 418, railScrollTop: 0 },
    },
  );
});

test('controller stays pure and imports only the existing My Flow URL codec', () => {
  const source = readFileSync(
    new URL('./my-flow-library-controller.ts', import.meta.url),
    'utf8',
  );
  const imports = Array.from(source.matchAll(/from\s+['"]([^'"]+)['"]/g), (match) => match[1]);
  assert.deepEqual(imports, ['./my-flow-local-ia']);
  for (const forbidden of [
    /\bReact\b/,
    /\bwindow\b/,
    /\bdocument\b/,
    /\blocalStorage\b/,
    /AppClient/,
    /export-receipt/,
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});

test('control replacement from an internal Item defers list replacement until Item Back', () => {
  const plan = planMyFlowLibraryTransition(
    current,
    { kind: 'replace_controls', query: '여권', filter: 'done' },
    context(),
  );
  assert.deepEqual(plan.state, {
    query: '여권',
    filter: 'done',
    sort: 'next',
    selectedFlowSlug: 'all',
    itemTarget: null,
  });
  assert.equal(plan.discard, 'block_if_dirty');
  assert.equal(plan.transient, 'close');
  assert.equal(plan.planReturn, 'clear');
  assert.equal(plan.focus.kind, 'preserve_control');
  assert.equal(plan.history[0]?.kind, 'back_then_replace');
  const effect = plan.history[0];
  assert.equal(effect?.kind === 'back_then_replace' ? effect.replace.href : '', '/my?demo=ux20&view=flows&q=%EC%97%AC%EA%B6%8C&status=done&sort=next#library');
});

test('control replacement from a direct Item replaces locally without external Back', () => {
  const plan = planMyFlowLibraryTransition(
    current,
    { kind: 'replace_controls', query: '', filter: 'all' },
    context({ historyLevel: null }),
  );
  assert.equal(plan.history[0]?.kind, 'replace');
  assert.equal(plan.history[0]?.kind === 'replace' ? plan.history[0].level : '', 'list');
  assert.equal(plan.history[0]?.kind === 'replace' ? plan.history[0].href : '', '/my?demo=ux20&view=flows&sort=next#library');
});

test('sort replacement uses only replace, preserves the current target, and never grows history', () => {
  const plan = planMyFlowLibraryTransition(
    current,
    { kind: 'replace_sort', sort: 'name' },
    context({
      currentHref: '/my?view=flows&sort=saved&flow=moving&item=moving%3A%3Apack',
      currentRoute: {
        ...context().currentRoute,
        sort: 'saved',
      },
    }),
  );

  assert.equal(plan.state.sort, 'name');
  assert.equal(plan.state.selectedFlowSlug, 'moving');
  assert.equal(plan.state.itemTarget?.itemKey, 'moving::pack');
  assert.deepEqual(plan.history.map((effect) => effect.kind), ['replace']);
  assert.equal(
    plan.history[0]?.kind === 'replace'
      ? new URL(plan.history[0].href, 'https://flowme.local').searchParams.get('sort')
      : '',
    'name',
  );
  assert.equal(plan.transient, 'preserve');
  assert.equal(plan.focus.kind, 'preserve_control');
});

test('plan and Item hrefs preserve the selected sort', () => {
  const sorted = { ...current, sort: 'saved' as const };
  const plan = planMyFlowLibraryTransition(
    sorted,
    { kind: 'open_plan', flowSlug: 'passport' },
    context({
      currentHref: '/my?view=flows&sort=saved',
      currentRoute: { ...context().currentRoute, sort: 'saved', target: null },
      historyLevel: null,
    }),
  );
  assert.equal(
    plan.history.every((effect) => (
      effect.kind === 'replace' || effect.kind === 'push'
        ? new URL(effect.href, 'https://flowme.local').searchParams.get('sort') === 'saved'
        : true
    )),
    true,
  );
});

test('list to Plan writes the list position before pushing the Plan', () => {
  const listState = { ...current, selectedFlowSlug: 'all', itemTarget: null };
  const plan = planMyFlowLibraryTransition(
    listState,
    { kind: 'open_plan', flowSlug: 'passport' },
    context({
      currentHref: '/my?demo=ux20&view=flows&q=%EC%9D%B4%EC%82%AC&status=open#library',
      currentRoute: { query: '이사', filter: 'open', sort: 'next', target: null, scrollY: 418, railScrollTop: 231 },
      historyLevel: null,
    }),
  );
  assert.deepEqual(plan.history.map((effect) => effect.kind), ['replace', 'push']);
  assert.equal(plan.history[0]?.kind === 'replace' ? plan.history[0].level : '', 'list');
  assert.equal(plan.history[1]?.kind === 'push' ? plan.history[1].level : '', 'plan');
  assert.equal(plan.state.selectedFlowSlug, 'passport');
  assert.equal(plan.transient, 'close');
  assert.equal(plan.focus.kind, 'capture_plan_opener');
  assert.equal(plan.workspaceSection, 'execute');
});

test('direct or already selected Plan changes replace instead of growing history', () => {
  for (const historyLevel of [null, 'plan'] as const) {
    const plan = planMyFlowLibraryTransition(
      current,
      { kind: 'open_plan', flowSlug: 'passport' },
      context({ historyLevel }),
    );
    assert.deepEqual(plan.history.map((effect) => effect.kind), ['replace']);
    assert.equal(
      plan.history[0]?.kind === 'replace' ? plan.history[0].level : '',
      historyLevel,
    );
  }
});

test('internal Item to another Plan consumes the Item entry before replacing its owning Plan', () => {
  const plan = planMyFlowLibraryTransition(
    current,
    { kind: 'open_plan', flowSlug: 'passport' },
    context(),
  );
  assert.equal(plan.history[0]?.kind, 'back_then_replace');
  const effect = plan.history[0];
  assert.equal(effect?.kind === 'back_then_replace' ? effect.replace.level : '', 'plan');
  assert.equal(
    effect?.kind === 'back_then_replace' ? new URL(effect.replace.href, 'https://flowme.local').searchParams.get('flow') : '',
    'passport',
  );
});

test('Plan to Item pushes once and an existing Item entry is replaced', () => {
  const target = { flowSlug: 'moving', itemKey: 'moving::call', itemDate: '2030-09-05' };
  const fromPlan = planMyFlowLibraryTransition(
    { ...current, itemTarget: null },
    { kind: 'open_item', target },
    context({
      currentRoute: { ...context().currentRoute, target: { flowSlug: 'moving' } },
      historyLevel: 'plan',
    }),
  );
  assert.deepEqual(fromPlan.history.map((effect) => effect.kind), ['push']);
  assert.equal(fromPlan.state.itemTarget?.itemKey, target.itemKey);

  const fromItem = planMyFlowLibraryTransition(
    current,
    { kind: 'open_item', target },
    context(),
  );
  assert.deepEqual(fromItem.history.map((effect) => effect.kind), ['replace']);
});

test('cross-Flow Item entry keeps the owning Plan as the Back destination', () => {
  const target = { flowSlug: 'passport', itemKey: 'passport::photo' };
  const plan = planMyFlowLibraryTransition(
    current,
    { kind: 'open_item', target },
    context(),
  );
  assert.deepEqual(plan.history.map((effect) => effect.kind), ['back_then_replace', 'push']);
  assert.equal(
    plan.history[0]?.kind === 'back_then_replace' ? plan.history[0].replace.level : '',
    'plan',
  );
  assert.equal(plan.history[1]?.kind === 'push' ? plan.history[1].level : '', 'item');
  assert.equal(plan.state.selectedFlowSlug, 'passport');
  assert.deepEqual(plan.state.itemTarget, target);
});

test('cross-Flow Item from a direct target keeps the owning Plan unmarked', () => {
  const target = { flowSlug: 'passport', itemKey: 'passport::photo' };
  const plan = planMyFlowLibraryTransition(
    current,
    { kind: 'open_item', target },
    context({ historyLevel: null }),
  );
  assert.deepEqual(plan.history.map((effect) => effect.kind), ['replace', 'push']);
  assert.equal(plan.history[0]?.kind === 'replace' ? plan.history[0].level : '', null);
  assert.equal(plan.history[1]?.kind === 'push' ? plan.history[1].level : '', 'item');
});

test('list to Item preserves list, owning Plan, then Item history levels', () => {
  const target = { flowSlug: 'passport', itemKey: 'passport::photo' };
  const plan = planMyFlowLibraryTransition(
    { ...current, selectedFlowSlug: 'all', itemTarget: null },
    { kind: 'open_item', target },
    context({
      currentHref: '/my?demo=ux20&view=flows&q=%EC%9D%B4%EC%82%AC&status=open#library',
      currentRoute: {
        query: '이사',
        filter: 'open',
        sort: 'next',
        target: null,
        scrollY: 418,
        railScrollTop: 231,
      },
      historyLevel: null,
    }),
  );
  assert.deepEqual(plan.history.map((effect) => effect.kind), ['replace', 'push', 'push']);
  assert.deepEqual(plan.history.map((effect) => (
    effect.kind === 'replace' || effect.kind === 'push' ? effect.level : null
  )), ['list', 'plan', 'item']);
  assert.equal(plan.planReturn, 'capture');
  assert.equal(plan.workspaceSection, 'preserve');
  assert.equal(plan.scroll.kind, 'capture_library_position');
});

test('Plan return uses internal Back while direct Plan return replaces the list', () => {
  const internal = planMyFlowLibraryTransition(current, { kind: 'return_to_list' }, context({ historyLevel: 'plan' }));
  assert.deepEqual(internal.history, [{ kind: 'back' }]);

  const direct = planMyFlowLibraryTransition(current, { kind: 'return_to_list' }, context({ historyLevel: null }));
  assert.equal(direct.history[0]?.kind, 'replace');
  assert.equal(direct.state.selectedFlowSlug, 'all');
  assert.equal(direct.scroll.kind, 'restore_library_position_after_frame');
});

test('Item Back uses history when available and otherwise removes only Item identity', () => {
  const internal = planMyFlowLibraryTransition(current, { kind: 'request_item_back' }, context());
  assert.deepEqual(internal.history, [{ kind: 'back' }]);
  assert.equal(internal.discard, 'block_if_dirty');
  assert.equal(internal.itemClose, 'handled_by_history_back');

  const direct = planMyFlowLibraryTransition(current, { kind: 'request_item_back' }, context({ historyLevel: null }));
  assert.equal(direct.history[0]?.kind, 'replace');
  assert.equal(direct.discard, 'block_if_dirty');
  assert.equal(direct.history[0]?.kind === 'replace' ? direct.history[0].level : '', null);
  assert.equal(direct.history[0]?.kind === 'replace' ? direct.history[0].href : '', '/my?demo=ux20&view=flows&q=%EC%9D%B4%EC%82%AC&status=open&flow=moving&sort=next#library');
  assert.equal(direct.itemClose, 'continue_local_close');
});

test('route sync keeps Item targets but closes transient detail for Plan and list routes', () => {
  const item = planMyFlowLibraryTransition(current, {
    kind: 'sync_route',
    route: context().currentRoute,
  }, context());
  assert.equal(item.transient, 'preserve');
  assert.equal(item.discard, 'allow');
  assert.equal(item.state.itemTarget?.itemKey, 'moving::pack');

  const plan = planMyFlowLibraryTransition(current, {
    kind: 'sync_route',
    route: { query: '이사', filter: 'open', sort: 'next', target: { flowSlug: 'moving' }, scrollY: 0, railScrollTop: 0 },
  }, context());
  assert.equal(plan.transient, 'close');
  assert.equal(plan.discard, 'block_if_dirty');
  assert.equal(plan.focus.kind, 'restore_item_opener_after_frame');

  const list = planMyFlowLibraryTransition(current, {
    kind: 'sync_route',
    route: { query: '여권', filter: 'done', sort: 'name', target: null, scrollY: 90, railScrollTop: 40 },
    returnFlowSlug: 'moving',
  }, context());
  assert.deepEqual(list.state, {
    query: '여권',
    filter: 'done',
    sort: 'name',
    selectedFlowSlug: 'all',
    itemTarget: null,
  });
  assert.equal(list.discard, 'block_if_dirty');
  assert.equal(list.focus.kind, 'restore_plan_opener_after_frame');
  assert.deepEqual(list.scroll, {
    kind: 'restore_library_position_after_frame',
    scrollY: 90,
    railScrollTop: 40,
  });
});
