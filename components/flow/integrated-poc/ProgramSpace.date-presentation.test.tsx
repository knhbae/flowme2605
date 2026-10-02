import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { programExecutionDayPresentation, readProgramTaskDatePresentation } from '../../../lib/flow/integrated-poc/execution-presentation';
import { programTextExecutionKey, type ProgramOrderedExecutionRow } from '../../../lib/flow/integrated-poc/recurrence-order';
import type { ProgramExecutionOccurrenceRow } from '../../../lib/flow/integrated-poc/recurrence-state';
import type { ProgramPeriod } from '../../../lib/flow/integrated-poc/execution';

// Evaluate the production JSX and callbacks. Geometry and browser focus remain a separate check.
const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean): ts.Node {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) { if (!result && predicate(node)) result = node; if (!result) ts.forEachChild(node, visit); }
  visit(ast); assert(result); return result;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule('const value = ' + expression + ';', { fileName: 'fragment.tsx', compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  return new Function('React', ...Object.keys(context), code + '; return value;')(React, ...Object.values(context));
}
function actualVariable(name: string, context: Record<string, unknown>) {
  const node = find(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === name) as ts.VariableDeclaration;
  return evaluate(node.initializer!.getText(ast), context);
}
const styles = new Proxy({}, { get: (_, key) => String(key) });
function fixture() {
  let text = M.addDocument(createEmptyTextWorkspace(), { title: '날짜 문서' });
  const documentId = text.documents[0].id;
  text = M.editText(text, documentId, '[2026-10-01]\n- [ ] 같은 제목\n  - 메모: 어제 기록\n[2026-10-02]\n- [ ] 같은 제목\n  - 메모: 오늘 기록');
  return { text, tasks: M.tasks(text), documentId };
}
function listHarness(rows: ProgramOrderedExecutionRow[], text: ReturnType<typeof createEmptyTextWorkspace>, period: ProgramPeriod = 'today') {
  const opened: string[][] = [], moved: unknown[][] = [], dropped: string[][] = [], written: string[][] = [];
  const space = { text }, nativeDrag: { current: string | null } = { current: null };
  const folderOptions = actualVariable('folderOptions', { space });
  const taskFolderPath = actualVariable('taskFolderPath', { space, folderOptions });
  const node = find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'ul'
    && node.openingElement.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'className' && attr.initializer?.getText(ast) === '{styles.tasks}'));
  const element = evaluate(node.getText(ast), {
    executionDayRows: programExecutionDayPresentation(rows, period, '2026-10-02', '2026-10-02'), M, space,
    styles, period, date: '2026-10-02', today: '2026-10-02', taskFolderPath, moving: null, nativeDrag,
    moveExecutionStep: (...args: unknown[]) => moved.push(args), moveStep: (...args: unknown[]) => moved.push(args),
    moveBefore: (...args: string[]) => dropped.push(args), openDocument: (...args: string[]) => opened.push(args),
    setMoving() {}, run() { throw new Error('presentation must not mutate'); },
    suppressPointerClick: { current: null }, setRecordDate() {}, setPercent() {}, openDetail() {}, cancelHold() {},
    holdPoint: { current: null }, hold: { current: null }, PROGRAM_MOVE_GESTURE_V1: { holdMs: 350, cancelDistancePx: 8 },
    data: {}, mutate() { throw new Error('presentation must not mutate'); }, props: { onUndo() {}, onRedo() {} },
    focusAppliedPlan() {}, recurrencePorts: { current: {} }, setDate() {}, setPeriod() {},
    ProgramRecurrence: ({ row }: { row: { executionDate: string } }) => <div data-occurrence-date={row.executionDate} />,
  });
  return { element, opened, moved, dropped, nativeDrag, written };
}
const taskRows = (tasks: ReturnType<typeof M.tasks>): ProgramOrderedExecutionRow[] => tasks.map(task => ({ kind: 'text-task', key: programTextExecutionKey(task), date: task.date, task }));
function children(element: any): any[] { return React.Children.toArray(element.props.children) as any[]; }

test('actual mixed list adds headings inside existing rows, preserves order/IDs and original displayed dates', () => {
  const f = fixture(), ordinary = taskRows(f.tasks);
  const occurrence = { kind: 'occurrence', key: 'stable-occurrence-key', date: '2026-10-01',
    row: { key: 'stable-row-key', executionDate: '2026-10-01', completion: 'unrecorded' } as ProgramExecutionOccurrenceRow } satisfies ProgramOrderedExecutionRow;
  const rows = [ordinary[0], occurrence, ordinary[1]], before = JSON.stringify(f.text);
  const h = listHarness(rows, f.text), rendered = children(h.element);
  assert.equal(rendered.length, rows.length);
  assert.deepEqual(rendered.map(row => row.props['data-task-id']).filter(Boolean), f.tasks.map(task => task.id));
  const html = renderToStaticMarkup(h.element);
  assert.equal((html.match(/<h2/g) ?? []).length, 2);
  assert.match(html, />지난 미완료<\/h2>/); assert.match(html, />오늘<\/h2>/);
  assert.match(html, /2026-10-01/); assert.match(html, /2026-10-02/);
  assert.doesNotMatch(html, /계속할 일/);
  assert.equal(JSON.stringify(f.text), before);
  const recurrence = children(rendered[1]).find(child => child.type !== 'div' && child.props?.row);
  assert.equal(recurrence.props.row, occurrence.row);
});

test('actual row open, Alt movement and drag payload keep exact existing task and timeline keys', () => {
  const f = fixture(), rows = taskRows(f.tasks), h = listHarness(rows, f.text);
  const rendered = children(h.element), first = rendered[0], second = rendered[1];
  const title = children(first).find(child => child.type === 'button' && child.props.className === 'taskTitle');
  title.props.onClick(); assert.deepEqual(h.opened, [[f.documentId, f.tasks[0].id]]);
  let prevented = 0;
  first.props.onKeyDown({ altKey: true, key: 'ArrowDown', preventDefault() { prevented++; } });
  assert.equal(h.moved[0][0], f.tasks[0]); assert.equal(h.moved[0][1], 1);
  first.props.onDragStart({ dataTransfer: { setData: (...args: string[]) => h.written.push(args) } });
  assert.deepEqual(h.written, [['text/plain', rows[0].key]]); assert.equal(h.nativeDrag.current, rows[0].key);
  second.props.onDrop({ dataTransfer: { getData: () => rows[0].key }, preventDefault() { prevented++; } });
  assert.deepEqual(h.dropped, [[rows[0].key, rows[1].key]]); assert.equal(h.nativeDrag.current, null);
  assert.equal(prevented, 2);
});

test('actual row keeps Flow folder ownership instead of replacing it with document storage location', () => {
  const f = fixture();
  f.text.folders.push({ id: 'actual-flow-folder', title: '실제 Flow 소속', parentId: null });
  f.text.flows.push({ ...f.text.documents[0], id: 'flow-owner', folderId: 'actual-flow-folder', folder: '실제 Flow 소속', private: true, sourceVersion: 'v1' });
  const task = { ...f.tasks[0], scopeId: 'flow-owner' }, rows = taskRows([task]), h = listHarness(rows, f.text);
  assert.match(renderToStaticMarkup(h.element), /실제 Flow 소속 \/ 날짜 문서/);
  const first = children(h.element)[0], title = children(first).find(child => child.type === 'button' && child.props.className === 'taskTitle');
  title.props.onClick(); assert.deepEqual(h.opened, [[task.docId, task.id]]);
});

test('other period rows have no Today heading and the actual detail reveals individual/section source without a writer', () => {
  const f = fixture(), before = JSON.stringify(f.text), h = listHarness(taskRows(f.tasks), f.text, 'week');
  assert.doesNotMatch(renderToStaticMarkup(h.element), /<h2/);
  const changed = M.updateTask(f.text, f.tasks[0].id, { date: '2026-10-03' });
  const detailDatePresentation = readProgramTaskDatePresentation(changed, f.tasks[0]);
  const node = find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'p'
    && node.openingElement.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'aria-label' && attr.initializer?.getText(ast) === '"날짜 출처"'));
  const html = renderToStaticMarkup(evaluate(node.getText(ast), { styles, detailDatePresentation }));
  assert.match(html, /개별 날짜 · 2026-10-03/); assert.match(html, /구획 날짜 · 2026-10-01/);
  assert.doesNotMatch(html, /<button|<input/);
  assert.equal(JSON.stringify(f.text), before);
});
