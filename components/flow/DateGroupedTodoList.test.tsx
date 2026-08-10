import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { buildDateGroupedTodoListViewModel } from '@/lib/flow/date-grouped-todo-list';

import { DateGroupedTodoList } from './DateGroupedTodoList';

const viewModel = buildDateGroupedTodoListViewModel({
  anchorDate: '2026-09-08',
  items: [
    {
      id: 'inspect',
      title: '이사할 집 하자 점검하기',
      date: '2026-08-09',
      meta: ['메모', '확인 3개'],
    },
    {
      id: 'register',
      title: '전입 신고 준비하기',
      date: '2026-08-09',
      completed: true,
      meta: ['완료'],
    },
  ],
});

function occurrences(markup: string, pattern: RegExp): number {
  return markup.match(pattern)?.length ?? 0;
}

test('public mode renders one date rail, one readonly checkbox and one detail link per item', () => {
  const markup = renderToStaticMarkup(
    <DateGroupedTodoList
      mode="public"
      viewModel={viewModel}
      getItemHref={(row) => `/flows/moving/preview/items/${row.id}`}
      nextItemId="inspect"
    />,
  );

  assert.equal(occurrences(markup, /data-date-rail="date:2026-08-09"/g), 1);
  assert.equal(occurrences(markup, /data-todo-checkbox="readonly"/g), 2);
  assert.equal(occurrences(markup, /data-todo-checkbox="mutable"/g), 0);
  assert.equal(occurrences(markup, /data-todo-detail-link=/g), 2);
  assert.equal(occurrences(markup, /data-testid="date-grouped-todo-list-next-badge"/g), 1);
  assert.equal(occurrences(markup, />이사할 집 하자 점검하기</g), 1);
  assert.match(markup, /href="\/flows\/moving\/preview\/items\/inspect"/);
  assert.match(markup, /aria-readonly="true"/);
  assert.match(markup, /8월 9일, 일요일, D-30, 할 일 2개/);
  assert.doesNotMatch(markup, />8월 9일</);
});

test('saved mode separates mutable 48px checkbox controls from item detail links', () => {
  const markup = renderToStaticMarkup(
    <DateGroupedTodoList
      mode="saved"
      viewModel={viewModel}
      getItemHref={(row) => `/my/moving/items/${row.id}`}
      onToggleItem={() => undefined}
    />,
  );

  assert.equal(occurrences(markup, /data-todo-checkbox="mutable"/g), 2);
  assert.equal(occurrences(markup, /data-todo-checkbox="readonly"/g), 0);
  assert.equal(occurrences(markup, /data-todo-detail-link=/g), 2);
  assert.match(markup, /aria-label="이사할 집 하자 점검하기 완료"/);
  assert.match(markup, /aria-label="전입 신고 준비하기 완료 취소"/);
  assert.match(markup, /class="[^"]*h-12[^"]*w-12[^"]*min-h-12[^"]*min-w-12/);
  assert.doesNotMatch(markup, /<a[^>]*>[^<]*<button/);
});

test('a next item is emphasized in place without rendering a second item card', () => {
  const markup = renderToStaticMarkup(
    <DateGroupedTodoList
      mode="saved"
      viewModel={viewModel}
      getItemHref={(row) => `/my/moving/items/${row.id}`}
      onToggleItem={() => undefined}
      nextItemId="inspect"
    />,
  );

  assert.equal(occurrences(markup, /data-next-item="true"/g), 1);
  assert.equal(occurrences(markup, /data-testid="date-grouped-todo-list-next-badge"/g), 1);
  assert.equal(occurrences(markup, /data-todo-item-id="inspect"/g), 1);
  assert.equal(occurrences(markup, />이사할 집 하자 점검하기</g), 1);
});

test('the 24-row contract exposes 24 detail links with completion permission only in saved mode', () => {
  const twentyFourRows = buildDateGroupedTodoListViewModel({
    items: Array.from({ length: 24 }, (_, index) => ({
      id: `item-${index + 1}`,
      title: `할 일 ${index + 1}`,
      date: index < 12 ? '2026-08-09' : '2026-08-29',
      sourceOrder: index,
    })),
  });
  const publicMarkup = renderToStaticMarkup(
    <DateGroupedTodoList
      mode="public"
      viewModel={twentyFourRows}
      getItemHref={(row) => `/flows/moving/preview/items/${row.id}`}
    />,
  );
  const savedMarkup = renderToStaticMarkup(
    <DateGroupedTodoList
      mode="saved"
      viewModel={twentyFourRows}
      getItemHref={(row) => `/my/moving/items/${row.id}`}
      onToggleItem={() => undefined}
    />,
  );

  assert.equal(occurrences(publicMarkup, /data-todo-detail-link=/g), 24);
  assert.equal(occurrences(publicMarkup, /data-todo-checkbox="readonly"/g), 24);
  assert.equal(occurrences(publicMarkup, /data-todo-checkbox="mutable"/g), 0);
  assert.equal(occurrences(savedMarkup, /data-todo-detail-link=/g), 24);
  assert.equal(occurrences(savedMarkup, /data-todo-checkbox="mutable"/g), 24);
  assert.equal(occurrences(savedMarkup, /data-date-rail=/g), 2);
});
