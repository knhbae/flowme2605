import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

// Exercise production JSX/callbacks. Browser layout and focus remain separate checks.
const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const styles = new Proxy({}, { get: (_, key) => String(key) });
function find(predicate: (node: ts.Node) => boolean): ts.Node {
  let result: ts.Node | undefined;
  const visit = (node: ts.Node) => { if (!result && predicate(node)) result = node; if (!result) ts.forEachChild(node, visit); };
  visit(ast); assert(result, 'production element/callback must exist'); return result;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const value = ${expression};`, { fileName: 'fragment.tsx', compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  return new Function('React', ...Object.keys(context), `${code}; return value;`)(React, ...Object.values(context));
}
function emptyResult(period: string, folderId = '', query = '', rows: unknown[] = []) {
  const expression = find(node => ts.isJsxExpression(node) && node.expression?.getText(ast).startsWith('!executionRows.length &&') === true) as ts.JsxExpression;
  return evaluate(expression.expression!.getText(ast), { styles, period, folderId, query, executionRows: rows, showAllTasksFromEmpty() {} });
}

test('P01 filtered empty results identify display conditions and offer only the existing wider-period recovery', () => {
  for (const [folderId, query] of [['folder-preparation', '짐'], ['folder-preparation', ''], ['', '짐']]) {
    const html = renderToStaticMarkup(emptyResult('week', folderId, query));
    assert.match(html, /현재 조회 조건에 맞는 할 일이 없습니다/);
    assert.doesNotMatch(html, /새 할 일을 적어보세요/);
    assert.match(html, /전체 할 일에서 찾기/);
    assert.doesNotMatch(html, /필터 해제/); // The existing scope row already owns reset.
  }
  assert.match(renderToStaticMarkup(emptyResult('month')), /이 보기에 할 일이 없습니다/);
  assert.doesNotMatch(renderToStaticMarkup(emptyResult('all', '', '짐')), /전체 할 일에서 찾기/);
  assert.doesNotMatch(renderToStaticMarkup(emptyResult('documents')), /전체 할 일에서 찾기/);
  assert.equal(renderToStaticMarkup(emptyResult('week', '', '', [{}])), '');
});

test('P02 wider-period recovery preserves folder/query/date and follows existing lock/flush rejection before focus', async () => {
  const changeNode = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'changePeriod');
  const recoveryNode = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'showAllTasksFromEmpty');
  for (const outcome of ['ready', 'input-lock', 'flush-rejected'] as const) {
    const view = { period: 'week', folderId: 'folder-preparation', query: '짐', date: '2026-10-03' };
    let flushes = 0, writes = 0, focuses = 0, releases = 0;
    const inputLockCount = { current: outcome === 'input-lock' ? 1 : 0 };
    const changePeriod = evaluate(`(${changeNode.getText(ast)})`, { inputLockCount, today: '2026-10-03',
      lockInput: () => () => { releases++; }, flushAllEditors: async () => { flushes++; return outcome !== 'flush-rejected'; },
      setPeriod: (period: string) => { view.period = period; }, setDate: (date: string) => { view.date = date; }, setMessage() {}, setTaskNotice() {},
      mutate: () => { writes++; },
    });
    const invoke = evaluate(`(${recoveryNode.getText(ast)})`, { changePeriod,
      presentation: { current: view },
      requestAnimationFrame: (callback: () => void) => { callback(); return 1; },
      root: { current: { querySelector: (selector: string) => { assert.equal(selector, '[data-program-period="all"]'); return { focus() { focuses++; } }; } } },
    });
    await invoke();
    assert.deepEqual(view, { period: outcome === 'ready' ? 'all' : 'week', folderId: 'folder-preparation', query: '짐', date: '2026-10-03' });
    assert.equal(writes, 0); assert.equal(focuses, outcome === 'ready' ? 1 : 0);
    assert.equal(flushes, outcome === 'input-lock' ? 0 : 1); assert.equal(releases, outcome === 'input-lock' ? 0 : 1);
  }
  let focusCalls = 0, frame: (() => void) | undefined;
  const view = { period: 'all' };
  const invoke = evaluate(`(${recoveryNode.getText(ast)})`, { changePeriod: async () => true, presentation: { current: view },
    requestAnimationFrame: (callback: () => void) => { frame = callback; return 1; },
    root: { current: { querySelector: () => ({ focus() { focusCalls++; } }) } },
  });
  await invoke(); view.period = 'documents'; frame!(); assert.equal(focusCalls, 0);
  const nav = find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'nav'
    && node.openingElement.getText(ast).includes('개인공간 보기'));
  assert.match(renderToStaticMarkup(evaluate(nav.getText(ast), { styles, periods: [['all', '전체 할 일']], period: 'all', changePeriod() {} })),
    /data-program-period="all" aria-current="page"/);
});

test('P03 the date-only unscheduling consequence appears only beside an actual retained time', () => {
  const expression = find(node => ts.isJsxExpression(node) && node.expression?.getText(ast).startsWith('detailTask.time &&') === true
    && node.getText(ast).includes('날짜만 미정으로 옮기면 시간은 유지됩니다')) as ts.JsxExpression;
  for (const time of ['09:10', null]) {
    const detailTask = { id: 'same-item', date: '2026-10-03', time };
    const before = JSON.stringify(detailTask);
    const html = renderToStaticMarkup(evaluate(expression.expression!.getText(ast), { styles, detailTask }));
    assert.equal(html.includes('날짜만 미정으로 옮기면 시간은 유지됩니다.'), !!time);
    assert.equal(JSON.stringify(detailTask), before);
  }
});
