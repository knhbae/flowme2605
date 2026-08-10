import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDateGroupedTodoListViewModel } from './date-grouped-todo-list';

test('groups dates ascending, keeps source order within a date, and puts undated last', () => {
  const items = [
    { id: 'later-second', title: '나중 둘째', date: '2026-08-29', sourceOrder: 2 },
    { id: 'undated', title: '날짜 미정' },
    { id: 'early', title: '먼저', date: '2026-08-09', sourceOrder: 9 },
    { id: 'later-first', title: '나중 첫째', date: '2026-08-29', sourceOrder: 1 },
  ] as const;

  const model = buildDateGroupedTodoListViewModel({ items });

  assert.deepEqual(model.groups.map((group) => group.id), [
    'date:2026-08-09',
    'date:2026-08-29',
    'undated',
  ]);
  assert.deepEqual(model.groups[1]?.rows.map((row) => row.id), [
    'later-first',
    'later-second',
  ]);
  assert.equal(model.rowCount, 4);
  assert.deepEqual(items.map((item) => item.id), [
    'later-second',
    'undated',
    'early',
    'later-first',
  ]);
});

test('falls back to original input order when a source order is incomplete', () => {
  const model = buildDateGroupedTodoListViewModel({
    items: [
      { id: 'first', title: '첫째', date: '2026-08-09', sourceOrder: 3 },
      { id: 'second', title: '둘째', date: '2026-08-09' },
      { id: 'third', title: '셋째', date: '2026-08-09', sourceOrder: 1 },
    ],
  });

  assert.deepEqual(model.groups[0]?.rows.map((row) => row.id), [
    'first',
    'second',
    'third',
  ]);
});

test('formats Korean date rail, D-day, count, and row metadata once per group', () => {
  const model = buildDateGroupedTodoListViewModel({
    anchorDate: '2026-09-08',
    items: [
      {
        id: 'inspect',
        title: '이사할 집 하자 점검하기',
        date: '2026-08-09',
        meta: ['메모', ' 확인 3개 '],
      },
      { id: 'move', title: '전입 신고 준비하기', date: '2026-08-09' },
      { id: 'moving-day', title: '이사하기', date: '2026-09-08' },
      { id: 'after', title: '정리하기', date: '2026-09-09' },
    ],
  });

  assert.deepEqual(
    model.groups.map((group) => ({
      month: group.monthLabel,
      day: group.dayLabel,
      weekday: group.weekdayLabel,
      relative: group.relativeDateLabel,
      count: group.countLabel,
    })),
    [
      { month: '8월', day: '9', weekday: '일', relative: 'D-30', count: '2개' },
      { month: '9월', day: '8', weekday: '화', relative: 'D-Day', count: '1개' },
      { month: '9월', day: '9', weekday: '수', relative: 'D+1', count: '1개' },
    ],
  );
  assert.equal(model.groups[0]?.rows[0]?.metaLabel, '메모 · 확인 3개');
  assert.equal(
    model.groups[0]?.accessibleLabel,
    '8월 9일, 일요일, D-30, 할 일 2개',
  );
});

test('explicit relative date labels override the anchor-derived label', () => {
  const model = buildDateGroupedTodoListViewModel({
    anchorDate: '2026-09-08',
    relativeDateLabels: { '2026-08-09': '준비 시작' },
    items: [{ id: 'start', title: '시작', date: '2026-08-09' }],
  });

  assert.equal(model.groups[0]?.relativeDateLabel, '준비 시작');
});

test('invalid calendar dates join the undated group without fabricating a date', () => {
  const model = buildDateGroupedTodoListViewModel({
    items: [
      { id: 'invalid', title: '잘못된 날짜', date: '2026-02-30' },
      { id: 'blank', title: '빈 날짜', date: '' },
    ],
  });

  assert.equal(model.groups.length, 1);
  assert.deepEqual(model.groups[0], {
    id: 'undated',
    monthLabel: '날짜',
    dayLabel: '미정',
    countLabel: '2개',
    accessibleLabel: '날짜 미정, 할 일 2개',
    rows: [
      {
        id: 'invalid',
        title: '잘못된 날짜',
        completed: false,
        sourceIndex: 0,
        meta: [],
        metaLabel: '',
      },
      {
        id: 'blank',
        title: '빈 날짜',
        completed: false,
        sourceIndex: 1,
        meta: [],
        metaLabel: '',
      },
    ],
  });
});
