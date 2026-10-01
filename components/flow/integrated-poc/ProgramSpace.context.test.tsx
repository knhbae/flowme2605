import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createProgramData, validateProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { updateProgramTask } from '../../../lib/flow/integrated-poc/private-space';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { programIsContinuingTask } from '../../../lib/flow/integrated-poc/execution';
import type { ProgramData, ProgramTransition } from '../../../lib/flow/integrated-poc/contract';

// Run the production parent callbacks and render its actual JSX fragments.
// Browser geometry and native time input interaction are a separate gate.
const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean): ts.Node {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) { if (!result && predicate(node)) result = node; if (!result) ts.forEachChild(node, visit); }
  visit(ast); assert(result); return result;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const value = ${expression};`, { fileName: 'fragment.tsx', compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  return new Function('React', ...Object.keys(context), `${code}; return value;`)(React, ...Object.values(context));
}
function actualFunction(name: string, context: Record<string, unknown>) {
  return evaluate(`(${find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast)})`, context);
}
function actualVariable(name: string, context: Record<string, unknown>) {
  const node = find(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === name) as ts.VariableDeclaration;
  return evaluate(node.initializer!.getText(ast), context);
}
const styles = new Proxy({}, { get: (_, key) => String(key) });

test('actual local continuation checks held host authority before consuming a fragment or changing folder scope', () => {
  const attribute = find(node => ts.isJsxAttribute(node) && node.name.getText(ast) === 'onContinueWholeDocument') as ts.JsxAttribute;
  const callback = (attribute.initializer as ts.JsxExpression).expression!.getText(ast);
  let allowed = false, stages = 0, folders = 0;
  const stage = () => { stages++; return true; };
  const invoke = evaluate(callback, { props: { canContinueWholeDocument: () => allowed }, inputLockCount: { current: 0 },
    selected: 'doc', id: 'doc', period: 'documents', dirty: { current: {} }, recurrencePorts: { current: {} },
    setMessage() {}, setFolderId() { folders++; } });
  assert.equal(invoke(stage), false); assert.equal(stages, 0); assert.equal(folders, 0);
  allowed = true; assert.equal(invoke(stage), true); assert.equal(stages, 1); assert.equal(folders, 1);
});

test('actual authenticated host exposes live external, disposed, conflict and pending authority to local continuation', () => {
  const hostSource = readFileSync(new URL('./AlphaWorkspace.tsx', import.meta.url), 'utf8');
  const host = ts.createSourceFile('AlphaWorkspace.tsx', hostSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let attribute: ts.JsxAttribute | undefined;
  const visit = (node: ts.Node) => { if (ts.isJsxAttribute(node) && node.name.getText(host) === 'canContinueWholeDocument') attribute = node; ts.forEachChild(node, visit); };
  visit(host); assert(attribute);
  const expression = (attribute.initializer as ts.JsxExpression).expression!.getText(host);
  const externalRef = { current: false }, disposed = { current: false };
  let authority: any = { status: 'ready', pending: false, busy: false };
  const check = evaluate(expression, { externalRef, disposed, controller: { current: { snapshot: () => authority } } });
  assert.equal(check(), true);
  externalRef.current = true; assert.equal(check(), false); externalRef.current = false;
  disposed.current = true; assert.equal(check(), false); disposed.current = false;
  for (const blocked of [null, { status: 'conflict' }, { status: 'ready', pending: true }, { status: 'ready', busy: true }]) {
    authority = blocked; assert.equal(check(), false);
  }
  authority = { status: 'ready', pending: false, busy: false }; assert.equal(check(), true);
});
function fixture() {
  const data = createProgramData(), space = data.spaces[data.activeActorId];
  space.text.folders.push({ id: 'parent', title: '생활', parentId: null }, { id: 'child', title: '준비', parentId: 'parent' });
  space.text = M.addDocument(space.text, { title: '준비 문서', folderId: 'child' });
  const documentId = space.text.documents[0].id;
  space.text = M.editText(space.text, documentId, '- [ ] 같은 할 일\n  - 메모: 원래 메모\n- [ ] 다른 할 일');
  const taskId = M.tasks(space.text)[0].id;
  space.text = M.updateTask(space.text, taskId, { date: '2026-09-30', time: '09:10' });
  space.text = M.recordProgress(space.text, taskId, '2026-09-29', 30);
  assert(validateProgramData(data));
  return { data, taskId, documentId };
}
function scheduleHarness(data: ProgramData, taskId: string, date: string, time: string, expected = data.spaces[data.activeActorId]) {
  let current = data, calls = 0, message = '', outcome: ProgramTransition<string> | undefined;
  const apply = actualFunction('applySchedule', {
    executionDateDraft: date, executionTimeDraft: time, updateProgramTask,
    base: () => ({ actorId: data.activeActorId, requestId: `schedule-${date}-${time}`, expectedSpace: expected }),
    setMessage: (value: string) => { message = value; },
    run: async (_label: string, build: (value: ProgramData) => ProgramTransition<string>) => {
      calls++; outcome = build(current); if (outcome.ok) current = outcome.data; return outcome;
    },
  });
  return { apply: () => apply(taskId), get data() { return current; }, get calls() { return calls; }, get message() { return message; }, get outcome() { return outcome; } };
}

test('actual schedule submit changes only the selected task date/time and preserves identity, folder, note and progress', async () => {
  const f = fixture(), before = structuredClone(f.data), oldSpace = before.spaces[before.activeActorId];
  const h = scheduleHarness(f.data, f.taskId, '2026-10-02', '17:45'); await h.apply();
  assert(h.outcome?.ok); assert.equal(h.calls, 1); assert(validateProgramData(h.data));
  const space = h.data.spaces[h.data.activeActorId], task = M.tasks(space.text).find(row => row.id === f.taskId)!;
  const oldTask = M.tasks(oldSpace.text).find(row => row.id === f.taskId)!;
  assert.equal(task.date, '2026-10-02'); assert.equal(task.time, '17:45');
  for (const key of ['id', 'docId', 'folderId', 'scopeId', 'note', 'done', 'title'] as const) assert.equal(task[key], oldTask[key], key);
  assert.deepEqual(space.text.progressRecords, oldSpace.text.progressRecords);
  assert.deepEqual(space.text.bindings, oldSpace.text.bindings);
  assert.deepEqual(M.tasks(space.text).filter(row => row.id !== f.taskId), M.tasks(oldSpace.text).filter(row => row.id !== f.taskId));
  assert.deepEqual(h.data.public, before.public); assert.deepEqual(f.data, before);
});

test('empty time clears the attribute and submitting unchanged date/time is a no-op', async () => {
  const f = fixture();
  const unchanged = scheduleHarness(f.data, f.taskId, '2026-09-30', '09:10'); await unchanged.apply();
  assert(unchanged.outcome?.ok); assert.equal(unchanged.outcome.changed, false);
  const cleared = scheduleHarness(f.data, f.taskId, '2026-09-30', ''); await cleared.apply();
  assert(cleared.outcome?.ok);
  const task = M.tasks(cleared.data.spaces[cleared.data.activeActorId].text).find(row => row.id === f.taskId)!;
  assert.equal(task.time, null); assert.equal(task.date, '2026-09-30');
});

test('invalid HH:MM never reaches a mutation and stale schedule input cannot overwrite current content', async () => {
  const f = fixture();
  for (const time of ['24:00', '09:60', '9:15', '09:15:30']) {
    const h = scheduleHarness(f.data, f.taskId, '2026-10-02', time); await h.apply();
    assert.equal(h.calls, 0); assert.match(h.message, /시간/); assert.equal(h.data, f.data);
  }
  const expected = structuredClone(f.data.spaces[f.data.activeActorId]);
  const newer = structuredClone(f.data);
  newer.spaces[newer.activeActorId].text = M.updateTask(newer.spaces[newer.activeActorId].text, f.taskId, { note: '다른 탭 메모' });
  const h = scheduleHarness(newer, f.taskId, '2026-10-02', '17:45', expected); await h.apply();
  assert(h.outcome && !h.outcome.ok); assert.equal(h.outcome.reason, 'conflict'); assert.equal(h.data, newer);
});

test('opening task detail takes the exact target date/time without writing', () => {
  const f = fixture(), space = f.data.spaces[f.data.activeActorId], allTasks = M.tasks(space.text), draft: string[] = [];
  const open = actualFunction('openDetail', { document: { activeElement: {} }, previousFocus: { current: null }, detailExpected: { current: null },
    space, allTasks, setExecutionDateDraft: (value: string) => draft.push(value), setExecutionTimeDraft: (value: string) => draft.push(value), setMessage() {}, setDetail() {} });
  open({ kind: 'task', id: f.taskId }); assert.deepEqual(draft, ['2026-09-30', '09:10']);
});

test('actual filter context shows the nested folder and query; reset only changes display filters', () => {
  const expression = find(node => ts.isJsxExpression(node) && node.expression?.getText(ast).startsWith('(folderId || query) &&') === true) as ts.JsxExpression;
  const values = { folderId: 'child', query: '짐', period: 'week', date: '2026-09-30' };
  const context = { ...values, styles, folderOptions: [{ id: 'child', title: '생활 / 준비' }],
    changeFolder: async (value: string) => { values.folderId = value; }, setQuery: (value: string) => { values.query = value; } };
  const element = evaluate(expression.expression!.getText(ast), context);
  const html = renderToStaticMarkup(element); assert.match(html, /생활 \/ 준비 · 하위 포함/); assert.match(html, /검색: 짐/);
  const button = element.props.children[1]; button.props.onClick();
  assert.deepEqual(values, { folderId: '', query: '', period: 'week', date: '2026-09-30' });
  assert.equal(renderToStaticMarkup(evaluate(expression.expression!.getText(ast), { ...context, folderId: '', query: '' })), '');
  assert.match(renderToStaticMarkup(evaluate(expression.expression!.getText(ast), { ...context, folderId: '', query: '짐' })), /모든 폴더/);
});

test('period row renders actual Flow folder path, document and time while its origin link keeps exact IDs', () => {
  const f = fixture(), space = f.data.spaces[f.data.activeActorId], task = { ...M.tasks(space.text)[0], scopeId: 'flow-owner' };
  space.text.flows.push({ ...space.text.documents[0], id: 'flow-owner', folderId: 'parent', private: true, sourceVersion: 'v1' });
  const folderOptions = actualVariable('folderOptions', { space });
  const taskFolderPath = actualVariable('taskFolderPath', { space, folderOptions });
  assert.equal(taskFolderPath(task), '생활');
  assert.equal(taskFolderPath({ ...task, scopeId: 'child' }), '생활 / 준비');
  const node = find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'button' && node.openingElement.attributes.properties.some(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'className' && attr.initializer?.getText(ast) === '{styles.taskTitle}'));
  const opened: string[] = [];
  const element = evaluate(node.getText(ast), { styles, task, period: 'today', date: '2026-09-30', programIsContinuingTask, taskFolderPath, moving: null, openDocument: (...args: string[]) => opened.push(...args) });
  const html = renderToStaticMarkup(element); assert.match(html, /09:10/); assert.match(html, /생활 \/ 준비 문서/);
  element.props.onClick(); assert.deepEqual(opened, [task.docId, task.id]);
});

test('actual schedule form submits the selected task and accepts clearing the minute-precision time field', () => {
  const node = find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'form' && node.openingElement.getText(ast).includes('applySchedule(detailTask.id)'));
  let submitted = '', time = '09:10', prevented = false;
  const element = evaluate(node.getText(ast), { styles, detailTask: { id: 'stable-task' }, executionDateDraft: '2026-09-30', executionTimeDraft: time,
    setExecutionDateDraft() {}, setExecutionTimeDraft: (value: string) => { time = value; }, applySchedule: (id: string) => { submitted = id; } });
  const html = renderToStaticMarkup(element); assert.match(html, /type="time" step="60"/); assert.match(html, /비워 두면 시간 없음/);
  element.props.children[0].props.children[1].props.children[1].props.onChange({ target: { value: '' } }); assert.equal(time, '');
  element.props.onSubmit({ preventDefault() { prevented = true; } }); assert(prevented); assert.equal(submitted, 'stable-task');
});
