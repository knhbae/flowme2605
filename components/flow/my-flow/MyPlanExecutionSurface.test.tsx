import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { buildDateGroupedTodoListViewModel } from '@/lib/flow/date-grouped-todo-list';

import {
  MyPlanExecutionSurface,
  type MyPlanExecutionSurfaceActions,
  type MyPlanExecutionSurfaceModel,
  type MyPlanExecutionSurfaceRenderers,
} from './MyPlanExecutionSurface';

type TestTodo = { rowId: string };

const todos = buildDateGroupedTodoListViewModel<TestTodo>({
  anchorDate: '2026-09-08',
  items: [
    {
      id: 'inspect',
      title: '이사할 집 하자 점검하기',
      date: '2026-08-09',
      sourceOrder: 0,
      meta: ['메모', '확인 3개'],
      data: { rowId: 'inspect' },
    },
    {
      id: 'register',
      title: '전입 신고 준비하기',
      date: '2026-08-09',
      sourceOrder: 1,
      completed: true,
      data: { rowId: 'register' },
    },
  ],
});

function buildModel(
  patch: Partial<MyPlanExecutionSurfaceModel<TestTodo>> = {},
): MyPlanExecutionSurfaceModel<TestTodo> {
  return {
    flowSlug: 'moving-d30',
    flowTitle: '이사 준비 계획',
    progressLabel: '현재 실행 · 1/2 완료',
    composition: 'desktop_full',
    todos,
    nextItemId: 'inspect',
    transferOpen: false,
    transferItemCount: 2,
    activeItemOpen: false,
    ...patch,
  };
}

const actions: MyPlanExecutionSurfaceActions<TestTodo> = {
  getItemHref: (todo) => `/my?flow=moving-d30&item=${todo.data?.rowId ?? ''}`,
  onOpenItem: () => undefined,
  onToggleItem: () => undefined,
  onEditPlan: () => undefined,
  onToggleTransfer: () => undefined,
  onCloseTransfer: () => undefined,
};

const renderers: MyPlanExecutionSurfaceRenderers = {
  renderTransferPanel: ({ showClose }) => (
    <div data-testid="transfer-panel" data-show-close={String(showClose)} />
  ),
  renderItemDetail: () => <div data-testid="item-detail">상세</div>,
};

test('desktop full keeps the approved plan DOM contract and empty inspector', () => {
  const markup = renderToStaticMarkup(
    <MyPlanExecutionSurface
      model={buildModel()}
      actions={actions}
      renderers={renderers}
    />,
  );

  assert.match(markup, /data-testid="my-flow-overview-card"/u);
  assert.match(markup, /data-flow-slug="moving-d30"/u);
  assert.match(markup, /data-testid="approved-my-plan-workspace"/u);
  assert.match(markup, /data-testid="my-plan-date-grouped-todos"/u);
  assert.equal(markup.match(/data-testid="my-plan-todo-row"/gu)?.length, 2);
  assert.match(markup, /data-testid="my-plan-item-inspector"/u);
  assert.match(markup, /Todo 본문을 열면 메모를 여기에서 확인할 수 있습니다\./u);
  assert.match(markup, /내 도구로 옮기기 · 2개/u);
  assert.match(markup, /aria-expanded="false"/u);
  assert.doesNotMatch(markup, /data-testid="my-plan-transfer-sheet"/u);
});

test('stacked composition places the active item detail below the todo list', () => {
  const markup = renderToStaticMarkup(
    <MyPlanExecutionSurface
      model={buildModel({ composition: 'stacked', activeItemOpen: true })}
      actions={actions}
      renderers={renderers}
    />,
  );

  assert.match(markup, /data-testid="my-plan-stacked-item-detail"/u);
  assert.match(markup, /data-testid="item-detail"/u);
  assert.doesNotMatch(markup, /data-testid="my-plan-item-inspector"/u);
  assert.doesNotMatch(markup, /data-testid="my-plan-transfer-sheet"/u);
});

test('mobile transfer keeps the bottom sheet, back action, and hidden inner close control', () => {
  const markup = renderToStaticMarkup(
    <MyPlanExecutionSurface
      model={buildModel({ composition: 'mobile', transferOpen: true })}
      actions={actions}
      renderers={renderers}
    />,
  );

  assert.match(markup, /data-testid="my-plan-transfer-sheet"/u);
  assert.match(markup, /data-testid="my-plan-transfer-back"/u);
  assert.match(markup, /data-testid="transfer-panel" data-show-close="false"/u);
  assert.match(markup, /aria-expanded="true"/u);
  assert.doesNotMatch(markup, /data-testid="my-plan-stacked-transfer"/u);
  assert.doesNotMatch(markup, /data-testid="my-plan-item-inspector"/u);
});

test('desktop full transfer replaces the inspector content without changing its shell', () => {
  const markup = renderToStaticMarkup(
    <MyPlanExecutionSurface
      model={buildModel({ transferOpen: true, activeItemOpen: true })}
      actions={actions}
      renderers={renderers}
    />,
  );

  assert.match(markup, /data-testid="my-plan-item-inspector"/u);
  assert.match(markup, /data-testid="transfer-panel" data-show-close="true"/u);
  assert.doesNotMatch(markup, /data-testid="item-detail"/u);
});
