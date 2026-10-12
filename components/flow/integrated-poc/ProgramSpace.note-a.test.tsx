import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { completeProgramTask, importProgramPublicVersion } from '../../../lib/flow/integrated-poc/private-space';
import { prepareProgramInitialData } from '../../../lib/flow/integrated-poc/legacy-entry';
import { ordinaryPublicationSourceFixture } from '../../../lib/flow/integrated-poc/publication-ordinary-source.fixture';
import { programExecutionDayPresentation } from '../../../lib/flow/integrated-poc/execution-presentation';
import { readProgramTaskOrigin } from '../../../lib/flow/integrated-poc/task-origin-presentation';
import { programTextExecutionKey, type ProgramOrderedExecutionRow } from '../../../lib/flow/integrated-poc/recurrence-order';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextTask } from '../../../lib/flow/integrated-poc/text-workspace';
import type { ProgramData } from '../../../lib/flow/integrated-poc/contract';
import type { ProgramPeriod } from '../../../lib/flow/integrated-poc/execution';

// Execute production JSX and click callbacks. Browser geometry and IME remain separate evidence.
const DAY = '2026-10-11';
const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('./ProgramTextEditor.tsx', import.meta.url), 'utf8');
const alphaSource = readFileSync(new URL('./AlphaWorkspace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const editorAst = ts.createSourceFile('ProgramTextEditor.tsx', editorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const alphaAst = ts.createSourceFile('AlphaWorkspace.tsx', alphaSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const styles = new Proxy({}, { get: (_, key) => String(key) });
function find(tree: ts.SourceFile, predicate: (node: ts.Node) => boolean): ts.Node {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) { if (!result && predicate(node)) result = node; if (!result) ts.forEachChild(node, visit); }
  visit(tree); assert(result); return result;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const value = ${expression};`, { fileName: 'fragment.tsx', compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  return new Function('React', ...Object.keys(context), `${code}; return value;`)(React, ...Object.values(context));
}
function variable(name: string, context: Record<string, unknown>) {
  const node = find(ast, node => ts.isVariableDeclaration(node) && node.name.getText(ast) === name) as ts.VariableDeclaration;
  return evaluate(node.initializer!.getText(ast), context);
}
function jsx(tree: ts.SourceFile, tag: string, className: string): ts.JsxElement {
  return find(tree, node => ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === tag
    && node.openingElement.attributes.properties.some(attribute => ts.isJsxAttribute(attribute)
      && attribute.name.getText(tree) === 'className' && attribute.initializer?.getText(tree) === `{styles.${className}}`)) as ts.JsxElement;
}
function children(element: any): any[] { return React.Children.toArray(element.props.children) as any[]; }
function text(value: any): string {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(text).join('');
  return text(value.props?.children);
}
function fixture(options: { scheduled?: string | null; progressDate?: string; percent?: number; rawPercent?: number } = {}) {
  const data = createProgramData();
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '합성 검사 원문' });
  const documentId = workspace.documents[0].id, scheduled = options.scheduled === undefined ? DAY : options.scheduled;
  const token = options.rawPercent === undefined ? ' ' : `${options.rawPercent}%`;
  const raw = `[${scheduled ?? '미정'}]\n- [${token}] 합성 진행 항목\n  - 메모: 원문과 기록을 따로 보존하는 합성 메모`;
  workspace = M.editText(workspace, documentId, raw);
  const taskId = M.tasks(workspace)[0].id;
  if (options.progressDate) workspace = M.recordProgress(workspace, taskId, options.progressDate, options.percent ?? 50);
  data.spaces[data.activeActorId].text = workspace;
  return { data, task: M.tasks(workspace)[0], documentId, raw };
}
function listHarness(data: ProgramData, tasks: TextTask[], period: ProgramPeriod = 'today', date = DAY, noteLayout = false) {
  const space = data.spaces[data.activeActorId], mutations: string[] = [], results: any[] = [], details: any[] = [];
  const recordDates: string[] = [], percentages: string[] = [], opened: string[][] = [];
  const folderOptions = variable('folderOptions', { space });
  const taskFolderPath = variable('taskFolderPath', { space, folderOptions, collectionMode: undefined });
  const rows: ProgramOrderedExecutionRow[] = tasks.map(task => ({ kind: 'text-task', key: programTextExecutionKey(task), date: task.date, task }));
  const element = evaluate(jsx(ast, 'ul', 'tasks').getText(ast), {
    executionDayRows: programExecutionDayPresentation(rows, period, date, DAY), M, space, data, styles,
    period, date, today: DAY, props: { noteHeader: noteLayout ? <p>합성 공개 안내</p> : undefined }, taskFolderPath, readProgramTaskOrigin, moving: null, nativeDrag: { current: null },
    moveStep() {}, moveExecutionStep() {}, moveBefore() {}, setMoving() {},
    openDocument: (...args: string[]) => opened.push(args),
    run: (label: string, make: (current: ProgramData) => unknown) => { mutations.push(label); results.push(make(data)); },
    completeProgramTask, base: (current: ProgramData) => ({ actorId: current.activeActorId,
      requestId: 'note-a-synthetic-click', expectedSpace: current.spaces[current.activeActorId] }),
    setRecordDate: (value: string) => recordDates.push(value), setPercent: (value: string) => percentages.push(value),
    openDetail: (value: unknown) => details.push(value), suppressPointerClick: { current: null }, cancelHold() {},
    holdPoint: { current: null }, hold: { current: null }, PROGRAM_MOVE_GESTURE_V1: { holdMs: 350, cancelDistancePx: 8 },
  });
  const rendered = children(element), first = rendered[0];
  const buttons = first ? children(first).filter(child => child.type === 'button') : [];
  const check = buttons.find(button => button.props.className?.split(' ').includes('check'));
  const title = buttons.find(button => button.props.className === 'taskTitle');
  const menu = buttons.find(button => button.props['aria-label'] === `${tasks[0]?.title} 작업`);
  return { element, rendered, check, title, menu, rows, mutations, results, details, recordDates, percentages, opened };
}

test('1..99% opens the existing task record without a completion mutation or checked state', () => {
  for (const percent of [1, 50, 99]) {
    const f = fixture({ progressDate: DAY, percent }), before = JSON.stringify(f.data);
    const h = listHarness(f.data, [f.task]);
    assert.equal(text(h.check), `${percent}%`);
    assert.equal(h.check.props['aria-pressed'], undefined);
    assert.match(h.check.props['aria-label'], new RegExp(`${percent}% · 진행 기록 열기$`));
    h.check.props.onClick();
    assert.deepEqual(h.mutations, []); assert.deepEqual(h.results, []);
    assert.deepEqual(h.details, [{ kind: 'task', id: f.task.id }]);
    assert.deepEqual(h.recordDates, [DAY]); assert.deepEqual(h.percentages, [String(percent)]);
    assert.equal(JSON.stringify(f.data), before);
  }
});

test('only100% is checked; zero and100 retain their original completion/reopen transitions', () => {
  for (const percent of [0, 100]) {
    const f = fixture({ progressDate: DAY, percent }), before = JSON.stringify(f.data), h = listHarness(f.data, [f.task]);
    assert.equal(h.check.props['aria-pressed'], percent === 100);
    assert.equal(text(h.check), percent === 100 ? '✓' : '□');
    h.check.props.onClick();
    assert.deepEqual(h.mutations, [percent === 100 ? '다시 열기' : '완료']);
    assert.deepEqual(h.details, []); assert(h.results[0].ok);
    const next = h.results[0].data.spaces[f.data.activeActorId].text;
    assert.equal(M.latestProgress(next, f.task.id)?.percent, percent === 100 ? 0 : 100);
    assert.equal(JSON.stringify(f.data), before);
  }
});

test('the effective50% record is shown while the RAW40% source token remains intact', () => {
  const f = fixture({ rawPercent: 40, progressDate: DAY, percent: 50 }), before = JSON.stringify(f.data);
  const h = listHarness(f.data, [f.task]);
  assert.equal(text(h.check), '50%'); assert.equal(f.task.done, false);
  assert.equal(M.raw(M.getDocument(f.data.spaces[f.data.activeActorId].text, f.documentId)!), f.raw);
  assert.equal(JSON.stringify(f.data), before);
});

test('Today subtracts scheduled/progress dates only when both equal the visible date', () => {
  const f = fixture({ progressDate: DAY }), before = JSON.stringify(f.data), h = listHarness(f.data, [f.task]);
  const visible = text(h.title);
  assert(!visible.includes('예정일')); assert(!visible.includes('진행 기록')); assert(!visible.includes(DAY));
  assert.equal(h.rows[0].date, DAY); assert.equal(M.latestProgress(f.data.spaces[f.data.activeActorId].text, f.task.id)?.date, DAY);
  assert.equal(JSON.stringify(f.data), before);
});

test('compact note Today omits only a sole current-day group, keeping historical and mixed-day headings', () => {
  const f = fixture();
  const current = renderToStaticMarkup(listHarness(f.data, [f.task], 'today', DAY, true).element);
  assert(!current.includes('class="executionGroup"'));
  assert.match(renderToStaticMarkup(listHarness(f.data, [f.task]).element), />오늘<\/h2>/);
  const historical = fixture({ scheduled: '2026-10-10' });
  assert.match(renderToStaticMarkup(listHarness(historical.data, [historical.task], 'today', '2026-10-10', true).element), /조회 날짜 · 2026-10-10/);
  const space = f.data.spaces[f.data.activeActorId];
  for (const extraDate of ['2026-10-10', '미정']) {
    const workspace = M.editText(space.text, f.documentId, `${f.raw}\n[${extraDate}]\n- [ ] 혼합 그룹 합성 항목`);
    const mixed = { ...f.data, spaces: { ...f.data.spaces, [f.data.activeActorId]: { ...space, text: workspace } } };
    const html = renderToStaticMarkup(listHarness(mixed, M.tasks(workspace), 'today', DAY, true).element);
    assert.match(html, />오늘<\/h2>/);
    if (extraDate !== '미정') assert.match(html, />지난 미완료<\/h2>/);
  }
});

test('historical day context uses the selected date, not the wall-clock Today date, for subtraction', () => {
  const selectedDate = '2026-10-10';
  const f = fixture({ scheduled: selectedDate, progressDate: selectedDate }), before = JSON.stringify(f.data);
  const h = listHarness(f.data, [f.task], 'today', selectedDate), visible = text(h.title);
  assert(!visible.includes('예정일')); assert(!visible.includes('진행 기록'));
  assert.match(renderToStaticMarkup(h.element), /조회 날짜 · 2026-10-10/);
  assert.equal(h.rows[0].date, selectedDate); assert.equal(JSON.stringify(f.data), before);
});

test('different scheduled and progress dates remain separate, including overdue and unscheduled rows', () => {
  for (const [scheduled, progressDate, expectedSchedule, expectedProgress] of [
    [DAY, '2026-10-10', null, '진행 기록 2026-10-10 · 50%'],
    ['2026-10-10', DAY, '예정일 2026-10-10', `진행 기록 ${DAY} · 50%`],
    [null, DAY, '예정일 미정', `진행 기록 ${DAY} · 50%`],
  ] as const) {
    const f = fixture({ scheduled, progressDate }), before = JSON.stringify(f.data), h = listHarness(f.data, [f.task]);
    const visible = text(h.title);
    if (expectedSchedule) assert(visible.includes(expectedSchedule)); else assert(!visible.includes('예정일'));
    assert(visible.includes(expectedProgress));
    if (scheduled === '2026-10-10') assert.match(renderToStaticMarkup(h.element), />지난 미완료<\/h2>/);
    assert.equal(JSON.stringify(f.data), before);
  }
});

test('outside Today the same date metadata is retained; missing dates are never treated as equal', () => {
  for (const period of ['week', 'month', 'all', 'undated'] as const) {
    const f = fixture({ progressDate: DAY }), visible = text(listHarness(f.data, [f.task], period).title);
    assert(visible.includes(`예정일 ${DAY}`)); assert(visible.includes(`진행 기록 ${DAY} · 50%`));
  }
  const f = fixture({ scheduled: null }), visible = text(listHarness(f.data, [f.task]).title);
  assert(visible.includes('예정일 미정')); assert(!visible.includes('진행 기록'));
});

test('direct-writing label is visually subtracted but provenance remains in the accessible title', () => {
  const f = fixture(), h = listHarness(f.data, [f.task]);
  assert.equal(readProgramTaskOrigin(f.data, f.task).label, '직접 작성');
  assert(!text(h.title).includes('직접 작성'));
  assert(h.title.props['aria-label'].includes('직접 작성'));
  assert(text(h.title).includes(`${f.task.docTitle} →`));
});

test('actual imported Flow and creator provenance labels remain visible instead of becoming direct writing', () => {
  const importedData = prepareProgramInitialData().data;
  const version = importedData.public.versions.find(entry => entry.flowId === 'catalog-chiangmai-solo-trip-packing')!;
  assert(version); const item = version.items[0];
  const imported = importProgramPublicVersion(importedData, { actorId: importedData.activeActorId,
    requestId: 'note-a-synthetic-copy', expectedSpace: importedData.spaces[importedData.activeActorId],
    versionId: version.id, itemIds: [item.id], anchor: '2026-11-05' });
  assert(imported.ok);
  const copiedSpace = imported.data.spaces[imported.data.activeActorId];
  const copy = copiedSpace.copies.find(entry => entry.id === imported.result)!;
  const cases = [{ data: imported.data, task: M.tasks(copiedSpace.text).find(task => task.id === copy.itemLines[item.id])!, label: 'Flow에서 가져옴' },
    ...(['creator', 'native'] as const).map(kind => {
      const f = ordinaryPublicationSourceFixture(kind);
      return { data: f.data, task: M.tasks(f.data.spaces[f.actorId].text)[0], label: '제작 문서에서 가져옴' };
    })];
  for (const f of cases) {
    assert(f.task); const before = JSON.stringify(f.data), h = listHarness(f.data, [f.task]);
    assert.equal(readProgramTaskOrigin(f.data, f.task).label, f.label);
    assert(text(h.title).includes(f.label)); assert(h.title.props['aria-label'].includes(f.label));
    assert.equal(JSON.stringify(f.data), before);
  }
});

test('original document return and item menu use the same Item IDs without any write', () => {
  const f = fixture({ progressDate: DAY, percent: 50 }), before = JSON.stringify(f.data), h = listHarness(f.data, [f.task]);
  h.title.props.onClick(); assert.deepEqual(h.opened, [[f.documentId, f.task.id]]);
  h.menu.props.onClick({ detail: 0 }); assert.deepEqual(h.details, [{ kind: 'task', id: f.task.id }]);
  assert.deepEqual(h.mutations, []); assert.equal(JSON.stringify(f.data), before);
});

test('note toolbar keeps server authority and local dirty/clean feedback as independent values', () => {
  for (const dirty of [false, true]) {
    const toolbar = evaluate(jsx(editorAst, 'div', 'toolbar').getText(editorAst), {
      styles, mode: 'live', disabled: false, inputLocked: false, regionPending: false, composing: false,
      props: { directWriting: true, noteStatus: <span data-save-state="ready">서버와 연결됨</span>,
        noteActions: <button>합성 글 작업</button> },
      draft: { dirty, saving: false, error: '' }, orderHistoryRef: { current: { hasEntries: () => false } },
    });
    const html = renderToStaticMarkup(toolbar);
    assert.match(html, /data-save-state="ready">서버와 연결됨/);
    assert(html.includes(dirty ? '편집 중' : '저장됨'));
    assert(html.includes('합성 글 작업'));
    const add = children(toolbar).find(child => child.type === 'button' && text(child) === '＋ 추가');
    assert.equal(add.props.hidden, false);
  }
});

test('only the selected retained editor receives note status and actions', () => {
  const node = find(ast, node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'ProgramTextEditor') as ts.JsxSelfClosingElement;
  const expression = (name: string) => {
    const attribute = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === name) as ts.JsxAttribute;
    assert(attribute && attribute.initializer && ts.isJsxExpression(attribute.initializer));
    return attribute.initializer.expression!.getText(ast);
  };
  const noteHeader = <p>공개한 내용은 로그인 사용자에게 보입니다. 중요한 자료의 유일본은 넣지 마세요.</p>;
  const noteStatus = <span>서버와 연결됨</span>, actions = <button>합성 찾기</button>;
  for (const selected of ['selected-editor', 'other-editor']) {
    const context = { selected, id: 'selected-editor', props: { noteHeader, noteStatus }, period: 'documents',
      findActions: actions, selectedDocumentTools: <button>합성 글 작업</button> };
    assert.equal(evaluate(expression('noteStatus'), context), selected === context.id ? noteStatus : undefined);
    const noteActions = evaluate(expression('noteActions'), context);
    if (selected === context.id) assert.equal(text(noteActions), '합성 찾기합성 글 작업'); else assert.equal(noteActions, undefined);
  }
});

test('A chrome is limited to available personal work and transports the unchanged public warning', () => {
  const chrome = find(alphaAst, node => ts.isVariableDeclaration(node) && node.name.getText(alphaAst) === 'usesNoteChrome') as ts.VariableDeclaration;
  for (const [view, unavailable, expected] of [['space', false, true], ['space', true, false],
    ['discover', false, false], ['community', false, false], ['legacy', false, false]] as const) {
    assert.equal(evaluate(chrome.initializer!.getText(alphaAst), { destination: { view }, unavailable }), expected);
  }
  const notice = find(alphaAst, node => ts.isVariableDeclaration(node) && node.name.getText(alphaAst) === 'publicNotice') as ts.VariableDeclaration;
  const html = renderToStaticMarkup(evaluate(notice.initializer!.getText(alphaAst), { styles }));
  assert.match(html, /aria-label="개발계 안내"/);
  assert(html.includes('공개한 내용은 로그인 사용자에게 보입니다. 중요한 자료의 유일본은 넣지 마세요.'));
  assert(html.includes('공개한 내용은 개발계의 다른 로그인 사용자에게 보입니다.'));
});
