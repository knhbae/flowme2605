import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMyFlowFirstEntryModel,
  buildMyFlowItemCompletionBinding,
  MY_FLOW_FIRST_ENTRY_ITEM_LIMIT,
} from './my-flow-first-entry';

type TestRow = {
  title: string;
};

function item(
  key: string,
  completed = false,
  options: { actionable?: boolean; completionDisabled?: boolean } = {},
) {
  return {
    key,
    itemId: key.slice(key.lastIndexOf('::') + 2),
    row: { title: key } satisfies TestRow,
    completed,
    ...options,
  };
}

test('first My Flow entry keeps the full plan collapsed and shows at most three next Items', () => {
  const model = buildMyFlowFirstEntryModel({
    items: [
      item('flow::done', true),
      item('flow::later'),
      item('flow::first'),
      item('flow::second'),
      item('flow::third'),
      item('flow::fourth'),
    ],
    actionableKeys: [
      'flow::done',
      'flow::first',
      'flow::second',
      'flow::third',
      'flow::fourth',
      'flow::later',
    ],
  });

  assert.equal(MY_FLOW_FIRST_ENTRY_ITEM_LIMIT, 3);
  assert.deepEqual(model.nextItems.map((entry) => entry.key), [
    'flow::first',
    'flow::second',
    'flow::third',
  ]);
  assert.deepEqual(model.fullPlan, { defaultExpanded: false, itemCount: 6 });
});

test('next Items preserve the canonical actionable order and stable Item identities', () => {
  const model = buildMyFlowFirstEntryModel({
    items: [
      item('moving::source-1'),
      item('moving::source-2', false, { actionable: false }),
      item('moving::source-3'),
    ],
    actionableKeys: [
      'missing::item',
      'moving::source-3',
      'moving::source-2',
      'moving::source-3',
      'moving::source-1',
    ],
  });

  assert.deepEqual(model.nextItems.map((entry) => entry.key), [
    'moving::source-3',
    'moving::source-1',
  ]);
  assert.deepEqual(model.nextItems.map((entry) => entry.itemId), ['source-3', 'source-1']);
  assert.equal(model.items[0]?.row.title, 'moving::source-1');
});

test('progress uses the authoritative saved Flow counts when they differ from the visible next rows', () => {
  const model = buildMyFlowFirstEntryModel({
    items: [item('routine::current')],
    actionableKeys: ['routine::current'],
    progress: { total: 24, completed: 7 },
  });

  assert.deepEqual(model.progress, {
    total: 24,
    completed: 7,
    remaining: 17,
    percent: 29,
    label: '7/24 완료',
  });
  assert.deepEqual(model.fullPlan, { defaultExpanded: false, itemCount: 24 });
});

test('empty and fully completed Flows do not invent a next Item', () => {
  const empty = buildMyFlowFirstEntryModel<TestRow>({ items: [] });
  const complete = buildMyFlowFirstEntryModel({
    items: [item('flow::a', true), item('flow::b', true)],
  });

  assert.deepEqual(empty.nextItems, []);
  assert.deepEqual(empty.progress, {
    total: 0,
    completed: 0,
    remaining: 0,
    percent: 0,
    label: '0/0 완료',
  });
  assert.deepEqual(complete.nextItems, []);
  assert.equal(complete.progress.percent, 100);
});

test('Item detail is the only completion control and row/detail read one checked value', () => {
  const open = buildMyFlowItemCompletionBinding({
    key: 'moving::insurance',
    itemId: 'insurance',
    completed: false,
  });
  const completed = buildMyFlowItemCompletionBinding({
    key: open.key,
    itemId: open.itemId,
    completed: true,
  });

  assert.equal(open.owner, 'item_detail');
  assert.deepEqual(open.row, { checked: false, canToggle: false, showsControl: false });
  assert.deepEqual(open.detail, { checked: false, canToggle: true, showsControl: true });
  assert.equal(completed.key, open.key);
  assert.equal(completed.itemId, open.itemId);
  assert.equal(completed.row.checked, completed.detail.checked);
  assert.equal(completed.row.checked, true);
  assert.equal(completed.row.canToggle, false);
  assert.equal(completed.detail.canToggle, true);
});

test('held or skipped Item completion remains detail-owned but disabled', () => {
  const binding = buildMyFlowItemCompletionBinding({
    key: 'routine::occurrence-1',
    itemId: 'routine-session',
    completed: false,
    disabled: true,
  });

  assert.equal(binding.owner, 'item_detail');
  assert.equal(binding.row.showsControl, false);
  assert.equal(binding.detail.showsControl, true);
  assert.equal(binding.detail.canToggle, false);
});
