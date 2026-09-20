import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { buildDateGroupedTodoListViewModel } from '@/lib/flow/date-grouped-todo-list';
import { DateGroupedTodoList } from '../DateGroupedTodoList';
import { MyPlanExecutionSurface, type MyPlanExecutionSurfaceProps } from '../my-flow/MyPlanExecutionSurface';

import { readPocSourceBaseline } from '../../../tests/fixtures/poc-source-baselines/read';
const datePath = 'components/flow/DateGroupedTodoList.tsx';
const planPath = 'components/flow/my-flow/MyPlanExecutionSurface.tsx';

// Execute the captured pre-edit components, not a reconstructed expected string.
function before(relative: string, hash: string, overrides: Record<string, unknown> = {}) {
  const source = readPocSourceBaseline(relative === datePath ? 'k2c-date' : 'k2c-plan');
  assert.equal(createHash('sha256').update(source).digest('hex').toUpperCase(), hash);
  const js = ts.transpileModule(source, { compilerOptions: {
    jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const exports: Record<string, React.ComponentType<any>> = {};
  const require = createRequire(path.resolve(relative));
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename: relative })(
    (id: string) => id in overrides ? overrides[id] : require(id), { exports }, exports,
  );
  return exports;
}

const oldDate = before(datePath, '2F1A7AE7B9A2F6F600C7EE8764B1B6EEDC8199389D14A8FDE61269812623A1B1');
const oldPlan = before(planPath, '6B4A1A0D2102D55451A48E8B24059756ECD174AEA4222C5843832381CA333204', {
  '../DateGroupedTodoList': oldDate,
});
const todos = buildDateGroupedTodoListViewModel({ items: [
  { id: 'copy-a/item-1', title: '같은 제목', date: '2026-09-05', meta: ['09:00', '미분류'], data: { ref: 'copy-a/item-1' } },
  { id: 'copy-b/item-1', title: '같은 제목', date: '2026-09-05', completed: true, data: { ref: 'copy-b/item-1' } },
  { id: 'copy-a/item-2', title: '날짜 미정 항목', data: { ref: 'copy-a/item-2' } },
] });
const getItemHref = (row: { id: string }) => `#${encodeURIComponent(row.id)}`;
for (const mode of ['public', 'saved'] as const) {
  test(`K2C no-slot ${mode} DateGroupedTodoList SSR is byte-identical to captured before`, () => {
    const props = { mode, viewModel: todos, getItemHref, nextItemId: 'copy-a/item-1',
      ...(mode === 'saved' ? { onToggleItem: () => undefined } : {}) };
    assert.equal(renderToStaticMarkup(React.createElement(DateGroupedTodoList as React.ComponentType<any>, props)),
      renderToStaticMarkup(React.createElement(oldDate.DateGroupedTodoList, props)));
  });
}
function planProps(composition: MyPlanExecutionSurfaceProps['model']['composition']): MyPlanExecutionSurfaceProps {
  return {
    model: { flowSlug: 'copy-a', flowTitle: '저장한 계획', progressLabel: '1/3 완료', composition, todos,
      transferOpen: false, transferItemCount: 3, activeItemOpen: false, nextItemId: 'copy-a/item-1' },
    actions: { getItemHref, onOpenItem: () => undefined, onToggleItem: () => undefined,
      onEditPlan: () => undefined, onToggleTransfer: () => undefined, onCloseTransfer: () => undefined },
    renderers: { renderTransferPanel: () => null, renderItemDetail: () => <div>상세</div> },
  };
}
for (const composition of ['mobile', 'stacked', 'desktop_compact', 'desktop_full'] as const) {
  test(`K2C no-slot ${composition} MyPlanExecutionSurface SSR is byte-identical to captured before`, () => {
    const props = planProps(composition);
    assert.equal(renderToStaticMarkup(<MyPlanExecutionSurface {...props} />),
      renderToStaticMarkup(React.createElement(oldPlan.MyPlanExecutionSurface, props)));
  });
}
test('K2C caller slot renders once at the exact ref without adding a task or mutable checkbox', () => {
  const props = planProps('mobile');
  const plain = renderToStaticMarkup(<MyPlanExecutionSurface {...props} />);
  const markup = renderToStaticMarkup(<MyPlanExecutionSurface {...props} renderers={{ ...props.renderers,
    renderAfterItem: (ref) => ref === 'copy-b/item-1' ? <p data-test-owner={ref}>완료했어요.</p> : null,
  }} />);
  assert.equal(markup.match(/data-test-owner=/g)?.length, 1);
  assert.equal(markup.match(/data-todo-item-id=/g)?.length, 3);
  assert.equal(markup.match(/data-todo-checkbox="mutable"/g)?.length, 3);
  assert.equal(markup.replace('<div class="col-span-2 min-w-0 px-2"><p data-test-owner="copy-b/item-1">완료했어요.</p></div>', ''), plain);
  const owner = markup.indexOf('data-test-owner=');
  assert.ok(owner > markup.indexOf('data-todo-item-id="copy-b/item-1"'));
  assert.ok(owner < markup.indexOf('data-todo-item-id="copy-a/item-2"'));
});
test('K2C optional null slot preserves the exact default markup', () => {
  const props = planProps('desktop_full');
  assert.equal(renderToStaticMarkup(<MyPlanExecutionSurface {...props} />),
    renderToStaticMarkup(<MyPlanExecutionSurface {...props} renderers={{ ...props.renderers, renderAfterItem: () => null }} />));
});
