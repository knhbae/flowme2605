import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../../lib/flow/integrated-poc/text-workspace';
import { readProgramTaskDatePresentation } from '../../../lib/flow/integrated-poc/execution-presentation';
import { readProgramMemoContext, programTaskDateChangeHint } from '../../../lib/flow/integrated-poc/text-context-presentation';
import type { createProgramTextDraft as DraftFactory, ProgramTextCommitOptions } from './ProgramTextEditor';

// Execute the shipped presentation expressions and callbacks with the real model.
// Static React markup and a memory commit are not browser/IME/geometry evidence.
const source = readFileSync(new URL('./ProgramTextEditor.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean): ts.Node {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (!result && predicate(node)) result = node;
    if (!result) ts.forEachChild(node, visit);
  }
  visit(ast); assert(result); return result;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const compiled = ts.transpileModule(`const value = ${expression};`, { fileName: 'context-fragment.tsx', compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  return new Function('React', ...Object.keys(context), `${compiled}; return value;`)(React, ...Object.values(context));
}
function actualVariable(name: string, context: Record<string, unknown>) {
  const variable = find(node => {
    if (!ts.isVariableDeclaration(node) || node.name.getText(ast) !== name) return false;
    const block = node.parent.parent.parent;
    return ts.isBlock(block) && ts.isFunctionDeclaration(block.parent) && block.parent.name?.text === 'ProgramTextEditor';
  }) as ts.VariableDeclaration;
  assert(variable.initializer); return evaluate(variable.initializer.getText(ast), context);
}
function actualFunction(name: string, context: Record<string, unknown>) {
  const declaration = find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  return evaluate(`(${declaration.getText(ast).replace(/^export\s+/, '')})`, context);
}
function panelExpression(kind: 'insert' | 'date') {
  const node = find(node => ts.isJsxExpression(node) && !!node.expression
    && ts.isBinaryExpression(node.expression) && node.expression.getText(ast).startsWith(`panel.kind === '${kind}' &&`)) as ts.JsxExpression;
  return node.expression!.getText(ast);
}
const styles = new Proxy({}, { get: (_target, key) => String(key) });
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const clone = <T,>(value: T): T => structuredClone(value);
const createDraft = actualFunction('createProgramTextDraft', { M, programSame: same, programClone: clone }) as typeof DraftFactory;
const selectionAfterChange = actualFunction('programTextSelectionAfterChange', { M });
const BASE_RAW = '[2026-10-01]\n- [ ] 선택한 할 일\n  - 메모: PRIVATE-BODY\n  - 시간: 09:00\n[2026-10-02]\n- [ ] 선택한 할 일\n  - 메모: 다른 날짜 메모';

function fixture(raw = BASE_RAW) {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '문맥 표시' });
  const docId = workspace.documents[0].id;
  workspace = M.editText(workspace, docId, raw);
  assert.equal(M.raw(M.getDocument(workspace, docId)), raw);
  return { workspace, docId };
}
type Panel = { kind: string; lineId: string | null } | null;
function harness(raw = BASE_RAW, prepare: (state: TextWorkspaceState) => TextWorkspaceState = state => state) {
  const initial = fixture(raw), f = { ...initial, workspace: prepare(initial.workspace) };
  const commits: { next: TextWorkspaceState; label: string; options?: ProgramTextCommitOptions }[] = [];
  const props = { docId: f.docId, workspace: f.workspace, readOnly: false };
  const propsRef = { current: { ...props, taskAccess: undefined as undefined | ((id: string) => { reason: string }) } };
  const composingRef = { current: false }, inputLockedRef = { current: false }, regionPendingRef = { current: false };
  const controller = createDraft(f.workspace, f.docId, async (next, label, options) => {
    commits.push({ next, label, options }); return h.accept;
  }, () => {});
  const draftRef = { current: controller };
  const h = { ...f, props, propsRef, composingRef, inputLockedRef, regionPendingRef, controller, commits,
    panel: { kind: 'date', lineId: M.tasks(f.workspace)[0]?.id ?? null } as Panel,
    date: '2026-10-01', time: '09:00', accept: true, closed: 0, focused: 0, refreshed: 0,
    installed: [] as string[], messages: [] as string[], previews: [] as unknown[], clearCount: 0 };
  const dialogRef = { current: { close: () => h.closed++ } };
  const editorRef = { current: { focus: () => h.focused++, refresh: () => h.refreshed++, refreshViewport() {},
    setValue: (rawValue: string) => { h.installed.push(rawValue); return true; } } };
  const orderHistoryRef = { current: { clear: () => h.clearCount++ } }, orderPositionsRef = { current: [] }, orderEpochRef = { current: 0 };
  function context(extra: Record<string, unknown> = {}): Record<string, unknown> {
    const base: Record<string, unknown> = { M, props, propsRef, composingRef, inputLockedRef, regionPendingRef, draftRef,
      panel: h.panel, date: h.date, time: h.time, styles, draft: controller.getState(),
      readProgramTaskDatePresentation, readProgramMemoContext, programTaskDateChangeHint,
      currentState: () => controller.getState().working,
      currentDoc: () => M.getDocument(controller.getState().working, propsRef.current.docId),
      setPanel: (panel: Panel) => { h.panel = panel; }, setMessage: (value: string) => h.messages.push(value),
      setOrderPreview: (preview: unknown) => h.previews.push(preview), dialogRef, editorRef,
      menuReturnRef: { current: null }, writingSelection: () => null, restoreWritingSelection() {}, programTextSelectionAfterChange: selectionAfterChange,
      cancelMove() {}, orderHistoryRef, orderPositionsRef, orderEpochRef, saveNow: () => controller.save(),
      setDate: (value: string) => { h.date = value; }, setTime: (value: string) => { h.time = value; },
      insertNative() {}, insertDateSection() {}, openFolderPanel() {}, beginMove() {}, connectFlow() {}, openProgress() {},
      disabled: inputLockedRef.current || propsRef.current.readOnly || controller.getState().invalid || controller.getState().saving,
      ...extra };
    base.currentRow = actualVariable('currentRow', base);
    base.accessFor = actualVariable('accessFor', base);
    base.actionsDisabled = actualVariable('actionsDisabled', base);
    base.closePanel = actualFunction('closePanel', base);
    base.apply = actualFunction('apply', base);
    base.applyDate = actualFunction('applyDate', base);
    base.row = actualVariable('row', base);
    base.panelAccess = actualVariable('panelAccess', base);
    base.protectedExecutionPanel = actualVariable('protectedExecutionPanel', base);
    base.insertions = actualVariable('insertions', base);
    base.memoContext = actualVariable('memoContext', base);
    base.dateContext = actualVariable('dateContext', base);
    base.dateChangeHint = actualVariable('dateChangeHint', base);
    return { ...base, ...extra };
  }
  function render(kind: 'insert' | 'date') {
    const current = context(), element = evaluate(panelExpression(kind), current);
    return { current, element, markup: renderToStaticMarkup(element) };
  }
  return Object.assign(h, { context, render, applyDate: () => actualFunction('applyDate', context())() });
}

test('actual date form consumes canonical source presentation and calls the existing execution-date handler', () => {
  const h = harness(), before = JSON.stringify(h.workspace), rendered = h.render('date');
  const expected = readProgramTaskDatePresentation(h.workspace, M.tasks(h.workspace)[0]);
  assert.deepEqual(rendered.current.dateContext, expected); assert(expected);
  assert(rendered.markup.includes(expected.label)); assert.match(rendered.markup, /aria-label="날짜 출처"/);
  assert.match(rendered.markup, /<label>실행 날짜<input type="date" value="2026-10-01"/);
  assert.match(rendered.markup, /type="time" step="60" value="09:00"/);
  assert.doesNotMatch(rendered.markup, /PRIVATE-BODY|마감/);
  let prevented = 0, applied = 0;
  const callback = evaluate(panelExpression('date'), h.context({ applyDate: () => { applied++; } })).props.onSubmit;
  callback({ preventDefault: () => prevented++ });
  assert.equal(prevented, 1); assert.equal(applied, 1); assert.equal(h.commits.length, 0);
  assert.equal(JSON.stringify(h.workspace), before);
});

test('menu source return follows retained line identity across inserted date properties and row movement', () => {
  const f = fixture('- [ ] 앞의 할 일\n  - 메모: 유지\n- [ ] 뒤의 할 일\n뒤의 글도 이어 씁니다.'), raw = M.raw(M.getDocument(f.workspace, f.docId));
  const selected = { start: raw.indexOf('뒤의 글') + 2, end: raw.indexOf('뒤의 글') + 5, direction: 'backward', scrollTop: 36, scrollLeft: 0 };
  const next = M.updateTask(f.workspace, M.tasks(f.workspace)[0].id, { date: '2026-10-12', time: '' });
  const returned = selectionAfterChange(f.workspace, next, f.docId, selected), nextRaw = M.raw(M.getDocument(next, f.docId));
  assert.deepEqual(returned, { ...selected, start: nextRaw.indexOf('뒤의 글') + 2, end: nextRaw.indexOf('뒤의 글') + 5 });
  assert.equal(raw.slice(selected.start, selected.end), nextRaw.slice(returned.start, returned.end));
  const task = M.tasks(f.workspace)[1], movingSelection = { ...selected, start: raw.indexOf('뒤의 할 일') + 1, end: raw.indexOf('뒤의 할 일') + 3 };
  const target = M.moveTargets(f.workspace, f.docId, task.id).find(entry => entry.beforeLineId === M.tasks(f.workspace)[0].id && entry.depth === 0);
  assert(target);
  const moved = M.moveSubtree(f.workspace, f.docId, task.id, target.beforeLineId, target.depth), movedRaw = M.raw(M.getDocument(moved, f.docId));
  const movedPosition = selectionAfterChange(f.workspace, moved, f.docId, movingSelection);
  assert.equal(movedRaw.slice(movedPosition.start, movedPosition.end), raw.slice(movingSelection.start, movingSelection.end));
  assert.equal(movedPosition.direction, 'backward');
});

test('menu source return never fabricates a position for a removed source line', () => {
  const f = fixture('선택한 일반 글\n남은 글'), selected = { start: 2, end: 4, direction: 'backward', scrollTop: 0, scrollLeft: 0 };
  const next = M.editText(f.workspace, f.docId, '남은 글');
  assert.equal(selectionAfterChange(f.workspace, next, f.docId, selected), null);
  assert.deepEqual(selectionAfterChange(f.workspace, f.workspace, f.docId, selected), selected);
});

test('actual date source and changed-date preview remain separate and hide no-op or invalid drafts', () => {
  const h = harness(BASE_RAW.replace('  - 메모: PRIVATE-BODY', '  - 날짜: 2026-10-03\n  - 메모: PRIVATE-BODY'));
  for (const [draft, showsHint] of [['2026-10-03', false], ['2026-10-09', true], ['', true], ['2026-02-30', false]] as const) {
    h.date = draft;
    const rendered = h.render('date'), expected = readProgramTaskDatePresentation(h.workspace, M.tasks(h.workspace)[0]);
    assert.deepEqual(rendered.current.dateContext, expected); assert(expected);
    assert.equal(rendered.current.dateChangeHint, programTaskDateChangeHint(expected, draft));
    assert(rendered.markup.includes('개별 날짜 · 2026-10-03'));
    assert(rendered.markup.includes('구획 날짜 · 2026-10-01'));
    assert.equal(rendered.markup.includes('role="status"'), showsHint);
    if (showsHint) assert(rendered.markup.includes(String(rendered.current.dateChangeHint)));
  }
  assert.equal(h.commits.length, 0);
});

test('memo menu resolves the actual nested owner on demand and escapes its title without echoing private body', () => {
  const title = '<img src=x onerror=alert(1)>', h = harness(`- [ ] 부모\n  - [ ] ${title}\n    - 메모: PRIVATE-CHILD-BODY`);
  const property = M.parseDocument(M.getDocument(h.workspace, h.docId)!, h.workspace).rows.find(row => row.kind === 'property')!;
  h.panel = { kind: 'insert', lineId: property.id };
  const before = JSON.stringify(h.workspace), rendered = h.render('insert'), expected = readProgramMemoContext(h.workspace, h.docId, property.id);
  assert(expected); assert.equal(expected.title, title); assert.equal(expected.kind, 'subcheck');
  assert.deepEqual(rendered.current.memoContext, expected);
  assert(rendered.markup.includes('&lt;img src=x onerror=alert(1)&gt;')); assert.doesNotMatch(rendered.markup, /<img|PRIVATE-CHILD-BODY/);
  assert(rendered.markup.includes(expected.continuation));
  h.panel = { kind: 'date', lineId: property.id };
  assert.equal(h.context().memoContext, null); assert.equal(h.render('insert').markup, '');
  assert.equal(h.commits.length, 0); assert.equal(JSON.stringify(h.workspace), before);
});

test('ordinary prose, empty scaffold and fenced memo spellings never receive an Item continuation hint', () => {
  for (const raw of ['일반 문장', '- [ ] \n  - 메모: 미완성', '```\n  - 메모: 코드 속 문장\n```']) {
    const h = harness(raw), doc = M.getDocument(h.workspace, h.docId)!;
    h.panel = { kind: 'insert', lineId: doc.lines.at(-1)!.id };
    const rendered = h.render('insert');
    assert.equal(rendered.current.memoContext, null); assert.doesNotMatch(rendered.markup, /메모 줄 끝에서 Enter/);
    assert.equal(h.commits.length, 0);
  }
});

test('a protected source target hides date form and reroutes apply to reference without invoking a commit', async () => {
  const h = harness(), before = JSON.stringify(h.workspace);
  h.propsRef.current.taskAccess = () => ({ reason: 'source-read-only' });
  assert.equal(h.render('date').markup, ''); assert.equal(h.context().dateContext, null);
  h.date = '2026-10-04'; await h.applyDate();
  assert.equal(h.panel?.kind, 'reference'); assert.equal(h.commits.length, 0);
  assert.equal(JSON.stringify(h.controller.getState().working), before);
});

test('the existing date apply preserves source placement, same-title peers, memos, history and expected workspace', async () => {
  const h = harness(), original = JSON.stringify(h.workspace), first = M.tasks(h.workspace)[0], peer = M.tasks(h.workspace)[1];
  h.date = '2026-10-09'; await h.applyDate();
  assert.equal(h.commits.length, 1); const commit = h.commits[0];
  assert.equal(commit.options?.expectedWorkspace, h.workspace);
  assert.deepEqual(commit.options?.privateTaskSchedule, { taskId: first.id, date: '2026-10-09', time: '09:00' });
  const after = M.tasks(commit.next).find(task => task.id === first.id)!;
  assert.equal(after.date, '2026-10-09'); assert.equal(after.note, first.note); assert.equal(after.time, first.time);
  assert.equal(after.sourceIndex, first.sourceIndex);
  const { sourceIndex: _priorIndex, ...priorPeer } = peer;
  const { sourceIndex: _nextIndex, ...nextPeer } = M.tasks(commit.next).find(task => task.id === peer.id)!;
  assert.deepEqual(nextPeer, priorPeer);
  for (const field of ['bindings', 'itemScopes', 'taskScopes', 'progressRecords', 'folders', 'flows'] as const) assert.deepEqual(commit.next[field], h.workspace[field], field);
  assert.equal(JSON.stringify(h.workspace), original); assert.equal(h.panel, null); assert.equal(h.controller.getState().dirty, false);
  assert.equal(h.installed.at(-1), M.raw(M.getDocument(commit.next, h.docId)));
});

test('time-only preview explains the existing inherited-date promotion while apply preserves identity, source, memo and progress history', async () => {
  const h = harness(BASE_RAW, state => M.recordProgress(state, M.tasks(state)[0].id, '2026-09-30', 20));
  const first = M.tasks(h.workspace)[0], sourceDoc = M.getDocument(h.workspace, h.docId)!;
  assert.equal(first.explicitDate, false); assert.equal(first.date, '2026-10-01');
  assert(h.workspace.progressRecords.length > 0);
  h.time = '10:00';
  const rendered = h.render('date'), presentation = readProgramTaskDatePresentation(h.workspace, first);
  assert(presentation); assert.equal(presentation.source, 'section');
  const expected = programTaskDateChangeHint(presentation, '2026-10-01', { current: '09:00', draft: '10:00' });
  assert.equal(rendered.current.dateChangeHint, expected); assert(expected);
  assert(rendered.markup.includes('시간을 바꾸면 실행 날짜도 2026-10-01으로 개별 지정됩니다.'));
  assert(rendered.markup.includes('원문 위치와 구획 날짜는 그대로입니다.'));
  assert.match(rendered.markup, /role="status"/);
  assert.equal(h.commits.length, 0);
  await h.applyDate();
  assert.equal(h.commits.length, 1);
  const commit = h.commits[0], after = M.tasks(commit.next).find(task => task.id === first.id)!;
  assert.equal(commit.options?.expectedWorkspace, h.workspace);
  assert.deepEqual(commit.options?.privateTaskSchedule, { taskId: first.id, date: '2026-10-01', time: '10:00' });
  assert.equal(after.id, first.id); assert.equal(after.docId, first.docId);
  assert.equal(after.sourceIndex, first.sourceIndex); assert.equal(after.groupDate, first.groupDate);
  assert.equal(after.date, first.date); assert.equal(after.explicitDate, true); assert.equal(after.time, '10:00');
  assert.equal(after.note, first.note);
  const nextDoc = M.getDocument(commit.next, h.docId)!;
  for (const line of sourceDoc.lines.filter(line => !line.text.includes('- 시간:'))) {
    assert.deepEqual(nextDoc.lines.find(candidate => candidate.id === line.id), line);
  }
  assert.deepEqual(commit.next.progressRecords, h.workspace.progressRecords);
  assert.equal(h.controller.getState().dirty, false); assert.equal(h.panel, null);
});

test('unchanged execution date and time or invalid date stays zero-commit despite displayed source context', async () => {
  for (const date of ['2026-10-01', '2026-02-30']) {
    const h = harness(), before = JSON.stringify(h.workspace); h.date = date;
    assert(h.context().dateContext); await h.applyDate();
    assert.equal(h.commits.length, 0); assert.equal(JSON.stringify(h.controller.getState().working), before);
    assert.equal(h.panel, null);
  }
});

test('readonly, input lock, IME, pending region and invalid draft block date apply without changing the existing controller', async () => {
  for (const guard of ['readonly', 'locked', 'IME', 'region', 'invalid']) {
    const h = harness(); h.date = '2026-10-09';
    if (guard === 'readonly') h.propsRef.current.readOnly = true;
    if (guard === 'locked') h.inputLockedRef.current = true;
    if (guard === 'IME') h.composingRef.current = true;
    if (guard === 'region') h.regionPendingRef.current = true;
    if (guard === 'invalid') h.controller.rejectRaw('보호된 미저장 입력');
    const before = h.controller.getState(), selectedPanel = h.panel;
    await h.applyDate(); assert.equal(h.commits.length, 0, guard); assert.equal(h.controller.getState(), before);
    assert.equal(h.panel, selectedPanel); assert.equal(h.closed, 0);
  }
});

test('a rejected existing commit retains the same proposed date and expected baseline for explicit save retry', async () => {
  const h = harness(); h.date = '2026-10-09'; h.accept = false;
  await h.applyDate(); assert.equal(h.commits.length, 1);
  assert(h.controller.getState().dirty); assert.match(h.controller.getState().error, /저장하지 못했습니다/);
  assert.equal(h.controller.getState().committed, h.workspace);
  assert.equal(M.tasks(h.controller.getState().working)[0].date, '2026-10-09');
  h.accept = true; assert.equal(await h.controller.save(), true); assert.equal(h.commits.length, 2);
  assert.equal(h.commits[1].options?.expectedWorkspace, h.workspace);
  assert.deepEqual(h.commits[1].options?.privateTaskSchedule, h.commits[0].options?.privateTaskSchedule);
  assert.equal(h.controller.getState().dirty, false);
});
