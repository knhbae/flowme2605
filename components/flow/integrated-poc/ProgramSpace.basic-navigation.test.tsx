import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (n: ts.Node) => boolean) {
  let found: ts.Node | undefined;
  function visit(n: ts.Node) { if (predicate(n)) found ??= n; ts.forEachChild(n, visit); }
  visit(ast); assert(found); return found;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const value = ${expression};`, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
  } }).outputText;
  return new Function('React', ...Object.keys(context), `${code};return value;`)(React, ...Object.values(context));
}
const change = find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'changePeriod').getText(ast);

test('basic navigation flushes before resetting scope; writing and today never create a document', async () => {
  for (const next of ['documents', 'today', 'all']) for (const outcome of ['ready', 'locked', 'unsaved']) {
    const view = { period: 'all', folder: 'work', query: '찾는 글', date: '2026-10-09' };
    const trace: string[] = [];
    const work = evaluate(`(${change})`, {
      inputLockCount: { current: outcome === 'locked' ? 1 : 0 }, collectionMode: undefined, today: '2026-10-07',
      lockInput: () => () => trace.push('release'), flushAllEditors: async () => { trace.push('flush'); return outcome !== 'unsaved'; },
      setQuery: (v: string) => { trace.push('query'); view.query = v; }, setFolderId: (v: string) => { trace.push('folder'); view.folder = v; },
      setPeriod: (v: string) => { trace.push('period'); view.period = v; }, setDate: (v: string) => { trace.push('date'); view.date = v; },
      setMessage() {}, setTaskNotice() {}, setLibraryOpen() {},
      beginWriting() { throw Error('writing navigation must not create'); }, mutate() { throw Error('view must not write'); },
    });
    assert.equal(await work(next, true), outcome === 'ready');
    if (outcome === 'ready') {
      assert.equal(trace[0], 'flush'); assert.equal(trace.at(-1), 'release');
      assert.equal(view.period, next); assert.equal(view.query, '');
      assert.equal(view.folder, next === 'all' ? 'work' : '');
      assert.equal(view.date, next === 'today' ? '2026-10-07' : '2026-10-09');
    } else {
      assert.deepEqual(view, { period: 'all', folder: 'work', query: '찾는 글', date: '2026-10-09' });
      assert.deepEqual(trace, outcome === 'locked' ? [] : ['flush', 'release']);
    }
  }
});

test('three existing period views identify current location and have no writing-creation callback', () => {
  const node = find(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === 'nav' && n.getText(ast).includes('aria-label="기본 이동"'));
  const mainPeriods = [['documents', '쓰기'], ['today', '오늘'], ['all', '분류']];
  const html = renderToStaticMarkup(evaluate(node.getText(ast), { mainPeriods, period: 'today', collectionMode: undefined, viewMenu: { current: null },
    styles: { periods: 'periods' }, changePeriod() {}, requestAnimationFrame() {}, focusViewControl() {} }));
  assert.equal((html.match(/<button/g) ?? []).length, 3);
  assert.match(html, /data-program-period="today" aria-current="page"/);
  for (const label of ['쓰기', '오늘', '분류']) assert.match(html, new RegExp(`>${label}</button>`));
  assert.doesNotMatch(node.getText(ast), /beginWriting|newDocument|mutate/);
  assert.doesNotMatch(node.getText(ast), /requestAnimationFrame|focusViewControl/);
  const collectionHtml = renderToStaticMarkup(evaluate(node.getText(ast), { mainPeriods, period: 'all', collectionMode: {}, viewMenu: { current: null },
    styles: { periods: 'periods' }, changePeriod() {} }));
  assert.match(collectionHtml, />전체 할 일<\/button>/); assert.doesNotMatch(collectionHtml, />분류<\/button>/);
});

test('one auxiliary menu retains document search, document actions and explicit new writing', () => {
  const aside = find(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === 'aside').getText(ast);
  assert.match(aside, /내 문서·할 일 찾기/); assert.match(aside, /selectedDocumentTools/);
  assert.match(aside, /beginWriting\(\)/); assert.match(aside, />새 글</);
  assert.equal((source.match(/<summary>문서 작업<\/summary>/g) ?? []).length, 1);
  assert.equal((source.match(/aria-label="더보기 · 글 찾기와 문서 관리"/g) ?? []).length, 1);
  assert.doesNotMatch(source, /문서·폴더 열기|<summary>보기:/);
});

test('classification uses existing folder scope and tasks-first form stays collapsed', () => {
  const selector = find(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === 'select' && n.getText(ast).includes('할 일 분류 보기'));
  assert.match(selector.getText(ast), /value=\{folderId\}/); assert.match(selector.getText(ast), /changeFolder/);
  const quick = find(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === 'details' && n.getText(ast).includes('styles.quickDisclosure')) as ts.JsxElement;
  assert.doesNotMatch(quick.openingElement.getText(ast), /\bopen[=>\s]/);
  assert.match(quick.getText(ast), /<summary>할 일 추가<\/summary>/);
});

test('task list separates scheduled date from latest progress date without rewriting task data', () => {
  const title = find(n => ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === 'button' && n.openingElement.getText(ast).includes('styles.taskTitle')).getText(ast);
  assert.match(title, /예정일 \{task.date/); assert.match(title, /진행 기록 \{progress.date\}/);
  assert.match(title, /openDocument\(task.docId, task.id\)/);
});
