import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import postcss from 'postcss';

// Execute the actual JSX callbacks. Native disclosure, geometry and focus need browser QA.
const source = readFileSync(new URL('./ProgramTextEditor.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean): ts.Node {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) { if (predicate(node)) { result ??= node; return; } ts.forEachChild(node, visit); }
  visit(ast); assert(result); return result;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const value = ${expression};`, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React,
  } }).outputText;
  return new Function('React', ...Object.keys(context), `${code}; return value;`)(React, ...Object.values(context));
}
type Node = React.ReactElement<Record<string, any>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!React.isValidElement(value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children)];
}
const toolbar = find(node => ts.isJsxElement(node) && node.openingElement.attributes.properties.some(attribute =>
  ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'className' && attribute.initializer?.getText(ast) === '{styles.toolbar}')).getText(ast);
const close = evaluate(`(${find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'closeEditorTools').getText(ast)})`, {});
const styles = new Proxy({}, { get: (_, key) => String(key) });
function harness(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const menu = { open: true, querySelector: () => ({ focus: () => calls.push('summary-focus') }) };
  const context = { styles, mode: 'live', setMode: () => calls.push('mode'), disabled: false,
    draft: { dirty: false, saving: false, error: '' }, inputLocked: false,
    props: { onUndo: () => calls.push('server-undo'), onRedo: () => calls.push('server-redo') },
    orderHistoryRef: { current: { hasEntries: () => false } },
    editorRef: { current: { undo: () => calls.push('native-undo') } },
    nativeHistory: (kind: string) => calls.push(kind), previewOrder: () => calls.push('sort-preview'),
    closeEditorTools: close, ...overrides };
  const tree = evaluate(toolbar, context) as Node;
  const all = nodes(tree), details = all.find(node => node.type === 'details')!;
  return { calls, menu, tree, details, all,
    button: (label: string) => all.find(node => node.type === 'button' && (node.props['aria-label'] === label || node.props.children === label))!,
    click: { currentTarget: { closest: () => menu } } };
}

test('primary toolbar keeps mode, add and input Undo while sort and Redo are in closed native disclosure', () => {
  const h = harness(), secondary = nodes(h.details);
  const primary = h.all.filter(node => node.type === 'button' && !secondary.includes(node));
  assert.equal(primary.length, 4);
  assert(secondary.includes(h.button('날짜순 정렬')));
  assert(secondary.includes(h.button('다시 실행')));
  assert(!secondary.includes(h.button('입력 되돌리기')));
  assert.equal(h.details.props.open, undefined);
  const markup = renderToStaticMarkup(h.tree);
  assert.match(markup, /<summary aria-label="편집 도구" title="편집 도구">/);
  assert.match(markup, /role="status" aria-live="polite"/);
});

test('secondary actions close the disclosure and keep sort, server Redo and native permutation Redo paths', () => {
  for (const [label, expected, overrides] of [
    ['날짜순 정렬', 'sort-preview', {}],
    ['다시 실행', 'server-redo', {}],
    ['다시 실행', 'historyRedo', { orderHistoryRef: { current: { hasEntries: () => true } } }],
  ] as const) {
    const h = harness(overrides); h.button(label).props.onClick(h.click);
    assert.equal(h.menu.open, false); assert.deepEqual(h.calls, ['summary-focus', expected]);
  }
});

test('tool disclosure preserves dirty, saving and readonly action gates and optional Redo', () => {
  for (const overrides of [{ disabled: true }, { draft: { dirty: true, saving: false } }]) {
    const h = harness(overrides);
    assert.equal(h.button('날짜순 정렬').props.disabled, true);
    assert.equal(h.button('다시 실행').props.disabled, true);
  }
  for (const overrides of [{ inputLocked: true }, { draft: { saving: true } }, { props: { readOnly: true } }]) {
    assert.equal(harness(overrides).button('입력 되돌리기').props.disabled, true);
  }
  assert.equal(harness({ props: {} }).button('다시 실행'), undefined);
});

test('Escape closes only the open disclosure and restores its summary without executing an action', () => {
  const h = harness();
  h.details.props.onKeyDown({ key: 'Escape', nativeEvent: { isComposing: false }, currentTarget: h.menu,
    preventDefault: () => h.calls.push('prevent'), stopPropagation: () => h.calls.push('stop') });
  assert.equal(h.menu.open, false); assert.deepEqual(h.calls, ['prevent', 'stop', 'summary-focus']);
  const composing = harness();
  composing.details.props.onKeyDown({ key: 'Escape', nativeEvent: { isComposing: true }, currentTarget: composing.menu });
  assert.equal(composing.menu.open, true); assert.deepEqual(composing.calls, []);
});

test('input Undo retains native input, saved change and permutation paths', () => {
  for (const [overrides, expected] of [
    [{ draft: { dirty: true } }, 'native-undo'],
    [{}, 'server-undo'],
    [{ orderHistoryRef: { current: { hasEntries: () => true } } }, 'historyUndo'],
  ] as const) {
    const h = harness(overrides); h.button('입력 되돌리기').props.onClick(); assert.deepEqual(h.calls, [expected]);
  }
});

test('folder toolbar hides whole-document actions and routes pending Undo to region input', () => {
  let localUndo = 0;
  const h = harness({ props: { folderId: 'work' }, regionPending: true, regionPortRef: { current: { undo: () => { localUndo++; } } } });
  h.button('입력 되돌리기').props.onClick(); assert.equal(localUndo, 1); assert.deepEqual(h.calls, []);
  assert.equal(h.details.props.hidden, true);
  const failed = harness({ props: { folderId: 'work' }, regionPending: false, draft: { dirty: true, saving: false } });
  assert.equal(failed.button('입력 되돌리기').props.disabled, true);
  assert.match(failed.button('입력 되돌리기').props.title, /저장본으로 되돌리기/);
});

test('date form identifies the selected row without displaying its memo or changing date input contract', () => {
  const form = find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'form' && node.getText(ast).includes('styles.dateTarget'));
  const element = evaluate(form.getText(ast), { styles, row: { title: '선택한 할 일', task: { title: '다른 이름', note: '비공개 메모' } },
    date: '2026-10-01', time: '09:00', dateContext: null, dateChangeHint: null,
    disabled: false, setDate() {}, setTime() {}, applyDate() {} });
  const markup = renderToStaticMarkup(element);
  assert.match(markup, /<p class="dateTarget">선택한 할 일<\/p>/);
  assert.doesNotMatch(markup, /비공개 메모|다른 이름/);
  assert.match(markup, /type="date" value="2026-10-01"/);
  assert.match(markup, /type="time" step="60" value="09:00"/);
});

test('mobile targets retain 48px and short screens adjust only the writing surface', () => {
  const css = postcss.parse(readFileSync(new URL('./ProgramTextEditor.module.css', import.meta.url), 'utf8'));
  const declarations = (selector: string) => {
    const result: Record<string, string>[] = [];
    css.walkRules(selector, rule => { const values: Record<string, string> = {}; rule.walkDecls(d => { values[d.prop] = d.value; }); result.push(values); });
    return result;
  };
  assert(declarations('.editorTools > summary').some(values => values['min-height'] === '48px' && values['min-width'] === '48px'));
  assert(declarations('.toolbar button').some(values => values['min-height'] === '48px' && values['min-width'] === '48px'));
  assert(declarations('.status').some(values => values['flex-basis'] === '100%'));
  const short = css.nodes.find(node => node.type === 'atrule' && node.params === '(max-height: 500px)');
  assert(short); assert.match(short.toString(), /min-height: 200px/);
  assert.doesNotMatch(short.toString(), /overflow[^;]*hidden|\.dialog/);
});

function sourceFocusHarness() {
  const variable = find(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === 'focusSourceRow') as ts.VariableDeclaration;
  const raw = '메모\n- [ ] 선택한 항목', doc = { id: 'document', lines: [{ id: 'memo' }, { id: 'task' }] };
  const state = { raw, dirty: false }, propsRef = { current: { docId: 'document' } };
  const composingRef = { current: false }, calls: number[] = [];
  const ownerDocument = { activeElement: null as unknown };
  const textarea = { value: raw, readOnly: false, inert: true, ownerDocument };
  let disabled = false, visible = true, nativeResult = true;
  const focus = evaluate(variable.initializer!.getText(ast), {
    draftRef: { current: { getState: () => state } }, currentDoc: () => doc, textArea: () => textarea,
    propsRef, composingRef, regionPendingRef: { current: false }, actionsDisabled: () => disabled, M: { raw: () => raw },
    hostRef: { current: { getClientRects: () => visible ? [{}] : [] } },
    editorRef: { current: { focus: (index: number) => {
      calls.push(index); if (!nativeResult) return false;
      textarea.inert = false; ownerDocument.activeElement = textarea; return true;
    } } },
  }) as (target: { documentId: string; lineId: string; raw: string }) => boolean;
  return { raw, state, propsRef, composingRef, calls, textarea, focus,
    target: { documentId: 'document', lineId: 'task', raw },
    disable: () => { disabled = true; }, hide: () => { visible = false; }, failNative: () => { nativeResult = false; } };
}

test('registered source focus asks the native editor to unfold and focus the exact row', () => {
  const h = sourceFocusHarness(); assert.equal(h.textarea.inert, true);
  assert.equal(h.focus(h.target), true); assert.deepEqual(h.calls, [1]);
  assert.equal(h.textarea.inert, false); assert.equal(h.textarea.ownerDocument.activeElement, h.textarea);
});

test('source focus rejects stale identity, raw, dirty, IME, readonly and hidden input before native focus', () => {
  for (const reason of ['document', 'line', 'raw', 'native-input', 'dirty', 'ime', 'readonly', 'locked-or-invalid-or-saving', 'hidden']) {
    const h = sourceFocusHarness();
    if (reason === 'document') h.target.documentId = 'other';
    if (reason === 'line') h.target.lineId = 'other';
    if (reason === 'raw') h.target.raw += 'stale';
    if (reason === 'native-input') h.textarea.value += 'typing';
    if (reason === 'dirty') h.state.dirty = true;
    if (reason === 'ime') h.composingRef.current = true;
    if (reason === 'readonly') h.textarea.readOnly = true;
    if (reason === 'locked-or-invalid-or-saving') h.disable();
    if (reason === 'hidden') h.hide();
    assert.equal(h.focus(h.target), false, reason); assert.deepEqual(h.calls, [], reason);
  }
  const failed = sourceFocusHarness(); failed.failNative();
  assert.equal(failed.focus(failed.target), false); assert.equal(failed.textarea.inert, true);
});

test('source focus port shares the existing registration lifetime and is cleared on unmount', () => {
  const effect = find(node => ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
    && node.arguments[0]?.getText(ast).includes('onRegisterSourceFocus')) as ts.CallExpression;
  const registered: unknown[] = [], focusSourceRow = () => true;
  const callback = evaluate(effect.arguments[0].getText(ast), { propsRef: { current: {
    onRegisterSourceFocus: (port: unknown) => registered.push(port),
  } }, saveNow() {}, focusSourceRow });
  const cleanup = callback(); assert.deepEqual(registered, [focusSourceRow]);
  cleanup(); assert.deepEqual(registered, [focusSourceRow, null]);
});
