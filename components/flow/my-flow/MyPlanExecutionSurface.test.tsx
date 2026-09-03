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
  assert.doesNotMatch(markup, /계획 관리/u);
  assert.doesNotMatch(markup, /data-testid="my-plan-library-back"/u);
  assert.doesNotMatch(markup, /data-testid="my-plan-transfer-sheet"/u);
});

test('header renders one optional accessible 48px Back target', () => {
  const markup = renderToStaticMarkup(
    <MyPlanExecutionSurface
      model={buildModel({ composition: 'mobile' })}
      actions={{ ...actions, onBackToLibrary: () => undefined }}
      renderers={renderers}
    />,
  );

  assert.equal(markup.match(/data-testid="my-plan-library-back"/gu)?.length, 1);
  assert.match(markup, /aria-label="저장한 계획 목록으로 돌아가기"/u);
  assert.match(
    markup,
    /data-testid="my-plan-library-back"[^>]*class="[^"]*min-h-12[^"]*min-w-12/u,
  );
  assert.match(markup, /<span aria-hidden="true">‹<\/span>/u);
});

test('header renders one optional management slot without duplicating the existing actions', () => {
  let renderManagementMenuCount = 0;
  const markup = renderToStaticMarkup(
    <MyPlanExecutionSurface
      model={buildModel()}
      actions={actions}
      renderers={{
        ...renderers,
        renderManagementMenu: () => {
          renderManagementMenuCount += 1;
          return (
            <button type="button" data-testid="plan-management-menu">
              계획 관리
            </button>
          );
        },
      }}
    />,
  );

  assert.equal(renderManagementMenuCount, 1);
  assert.equal(markup.match(/data-testid="plan-management-menu"/gu)?.length, 1);
  assert.equal(markup.match(/>수정<\/button>/gu)?.length, 1);
  assert.equal(markup.match(/내 도구로 옮기기 · 2개/gu)?.length, 1);
  assert.equal(markup.match(/>계획 관리<\/button>/gu)?.length, 1);
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

test('export uses the full one-column action row when editing is unavailable', () => {
  const markup = renderToStaticMarkup(
    <MyPlanExecutionSurface
      model={buildModel({ editAvailable: false })}
      actions={actions}
      renderers={renderers}
    />,
  );
  const actionRowClass = markup.match(
    /data-testid="my-plan-actions" class="([^"]+)"/u,
  )?.[1] ?? '';

  assert.doesNotMatch(markup, /data-testid="my-plan-edit"/u);
  assert.equal(markup.match(/data-testid="my-flow-export-entry"/gu)?.length, 1);
  assert.match(actionRowClass, /\bgrid-cols-1\b/u);
  assert.doesNotMatch(actionRowClass, /sm:grid-cols/u);
});

test('header keeps h3 by default and allows a focusable h2 for embedded detail navigation', () => {
  const defaultMarkup = renderToStaticMarkup(
    <MyPlanExecutionSurface model={buildModel()} actions={actions} renderers={renderers} />,
  );
  const embeddedMarkup = renderToStaticMarkup(
    <MyPlanExecutionSurface
      model={buildModel({
        headingLevel: 2,
        headingId: 'personal-workspace-flow-detail-heading',
        headingTabIndex: -1,
      })}
      actions={actions}
      renderers={renderers}
    />,
  );

  assert.match(defaultMarkup, /<h3[^>]*>이사 준비 계획<\/h3>/u);
  assert.match(
    embeddedMarkup,
    /<h2 id="personal-workspace-flow-detail-heading" tabindex="-1"[^>]*>이사 준비 계획<\/h2>/u,
  );
});

test('transfer remains available by default with the established mobile sheet behavior', () => {
  let transferPanelRenderCount = 0;
  const markup = renderToStaticMarkup(
    <MyPlanExecutionSurface
      model={buildModel({ composition: 'mobile', transferOpen: true })}
      actions={actions}
      renderers={{
        ...renderers,
        renderTransferPanel: ({ showClose }) => {
          transferPanelRenderCount += 1;
          return (
            <div data-testid="transfer-panel" data-show-close={String(showClose)} />
          );
        },
      }}
    />,
  );

  assert.equal(transferPanelRenderCount, 1);
  assert.match(markup, /data-testid="my-plan-actions"/u);
  assert.match(markup, /data-testid="my-flow-export-entry"/u);
  assert.match(markup, /data-testid="my-plan-transfer-sheet"/u);
  assert.match(markup, /data-testid="transfer-panel" data-show-close="false"/u);
  assert.match(markup, /aria-expanded="true"/u);
});

test('action-less read-only mode hides edit, export, and every transfer surface', () => {
  let transferPanelRenderCount = 0;
  const readOnlyRenderers: MyPlanExecutionSurfaceRenderers = {
    ...renderers,
    renderTransferPanel: () => {
      transferPanelRenderCount += 1;
      return <div data-testid="unexpected-transfer-panel" />;
    },
  };
  const renderReadOnly = (
    composition: MyPlanExecutionSurfaceModel<TestTodo>['composition'],
  ) => renderToStaticMarkup(
    <MyPlanExecutionSurface
      model={buildModel({
        composition,
        editAvailable: false,
        transferAvailable: false,
        transferOpen: true,
        activeItemOpen: true,
      })}
      actions={actions}
      renderers={readOnlyRenderers}
    />,
  );
  const markup = [
    renderReadOnly('mobile'),
    renderReadOnly('stacked'),
    renderReadOnly('desktop_full'),
  ].join('\n');

  assert.equal(transferPanelRenderCount, 0);
  assert.doesNotMatch(markup, /data-testid="my-plan-actions"/u);
  assert.doesNotMatch(markup, /data-testid="my-plan-edit"/u);
  assert.doesNotMatch(markup, /data-testid="my-flow-export-entry"/u);
  assert.doesNotMatch(markup, /data-testid="my-plan-transfer-sheet"/u);
  assert.doesNotMatch(markup, /data-testid="my-plan-stacked-transfer"/u);
  assert.doesNotMatch(markup, /data-testid="unexpected-transfer-panel"/u);
  assert.match(markup, /data-testid="my-plan-stacked-item-detail"/u);
  assert.match(markup, /data-testid="my-plan-item-inspector"/u);
  assert.match(markup, /data-testid="item-detail"/u);
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
