import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean) {
  let result: ts.Node | undefined;
  const visit = (node: ts.Node) => { if (!result && predicate(node)) result = node; if (!result) ts.forEachChild(node, visit); };
  visit(ast); assert(result); return result;
}
function execute(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const result = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(context), `${code}; return result;`)(...Object.values(context));
}
function harness() {
  const callbacks = new Map<string, (event: any) => void>(), inside = {}, outside = {};
  let focused = 0;
  const title = { value: '입력 중 제목', defaultValue: '저장된 제목' };
  const menu = { open: true, contains: (target: unknown) => target === inside, querySelector: () => ({ focus() { focused++; } }) };
  const effect = find(node => ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes("window.addEventListener('focusin', closeOutside)")) as ts.CallExpression;
  const cleanup = execute(effect.arguments[0].getText(ast), { documentMenu: { current: menu }, window: {
    addEventListener: (type: string, fn: any) => callbacks.set(type, fn), removeEventListener: (type: string, fn: any) => { assert.equal(callbacks.get(type), fn); callbacks.delete(type); },
  } })();
  return { menu, title, inside, outside, callbacks, cleanup, get focused() { return focused; } };
}

test('actual menu listeners close on outside pointer or keyboard focus without resetting fields or stealing focus', () => {
  for (const kind of ['pointerdown', 'focusin']) {
    const h = harness(); h.callbacks.get(kind)!({ target: h.inside }); assert(h.menu.open);
    h.callbacks.get(kind)!({ target: h.outside }); assert.equal(h.menu.open, false);
    assert.equal(h.focused, 0); assert.equal(h.title.value, '입력 중 제목'); h.cleanup(); assert.equal(h.callbacks.size, 0);
  }
});

test('actual menu Escape returns to its summary but leaves IME, consumed events and another surface alone', () => {
  const h = harness();
  for (const event of [{ key: 'Escape', isComposing: true, target: h.inside }, { key: 'Escape', defaultPrevented: true, target: h.inside }, { key: 'Escape', target: h.outside }, { key: 'Enter', target: h.inside }]) {
    h.callbacks.get('keydown')!(event); assert(h.menu.open); assert.equal(h.focused, 0);
  }
  h.callbacks.get('keydown')!({ key: 'Escape', target: h.inside }); assert.equal(h.menu.open, false); assert.equal(h.focused, 1);
});

test('actual close handler preserves the original compare-and-swap baseline while a native title draft remains', () => {
  const node = find(node => ts.isJsxAttribute(node) && node.name.getText(ast) === 'onToggle' && node.initializer?.getText(ast).includes('title.defaultValue') === true) as ts.JsxAttribute;
  const expression = (node.initializer as ts.JsxExpression).expression!;
  const expected = { revision: 7 }, formExpected = { current: expected as unknown };
  const callback = execute(expression.getText(ast), { formExpected });
  const title = { value: '입력 중 제목', defaultValue: '저장된 제목' };
  callback({ currentTarget: { open: false, querySelector: () => title } }); assert.equal(formExpected.current, expected);
  title.value = title.defaultValue; callback({ currentTarget: { open: false, querySelector: () => title } }); assert.equal(formExpected.current, null);
});

test('actual document action closes the menu only after editor readiness and before opening the next surface', async () => {
  const actionNode = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'openDocumentAction');
  for (const result of ['ready', 'save-failed']) {
    const menu = { open: true }, calls: string[] = [], preparing = { current: false };
    const action = execute(`(${actionNode.getText(ast)})`, { selectedDoc: { id: 'doc' }, preparing, retentionSource: null, lockInput: () => () => calls.push('release'), setPreparingDocumentAction() {}, setMessage() {},
      flushRecurrenceEditors: async () => true, prepareProgramDocumentAction: async () => result, dirty: { current: {} }, saveRequests: { current: {} }, selectedRef: { current: 'doc' }, documentMenu: { current: menu } });
    await action((id: string) => { assert.equal(id, 'doc'); assert.equal(menu.open, false); calls.push('open'); });
    assert.deepEqual(calls, result === 'ready' ? ['open', 'release'] : ['release']); assert.equal(menu.open, result !== 'ready'); assert.equal(preparing.current, false);
  }
});

test('modal document actions establish the visible summary before child focus capture, only after a successful flush', async () => {
  const actionNode = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'openDocumentAction');
  for (const readiness of ['ready', 'save-failed', 'selection-changed', 'recurrence-failed']) {
    const calls: string[] = [], title = { value: '미제출 제목', defaultValue: '원래 제목' }, summary = {};
    let activeElement: unknown = 'preparing-disabled-button';
    const menu = { open: true, title, querySelector(selector: string) { assert.equal(selector, ':scope > summary'); return { focus(options: unknown) { assert.deepEqual(options, { preventScroll: true }); activeElement = summary; calls.push('summary-focus'); } }; } };
    const preparing = { current: false };
    const action = execute(`(${actionNode.getText(ast)})`, { selectedDoc: { id: 'doc' }, preparing, retentionSource: null,
      lockInput: () => () => calls.push('release'), setPreparingDocumentAction(value: boolean) { if (value) activeElement = 'body'; }, setMessage() {},
      flushRecurrenceEditors: async () => readiness !== 'recurrence-failed', prepareProgramDocumentAction: async () => readiness,
      dirty: { current: {} }, saveRequests: { current: {} }, selectedRef: { current: 'doc' }, documentMenu: { current: menu } });
    await action((id: string) => { assert.equal(id, 'doc'); assert.equal(menu.open, false); assert.equal(activeElement, summary); calls.push('modal-captures-summary'); }, { modalReturnFocus: true });
    assert.deepEqual(calls, readiness === 'ready' ? ['summary-focus', 'modal-captures-summary', 'release'] : ['release']);
    assert.equal(menu.open, readiness !== 'ready'); assert.equal(preparing.current, false);
    assert.deepEqual(title, { value: '미제출 제목', defaultValue: '원래 제목' });
  }
});

test('only publication and copy-inspector opt into a stable modal return target', () => {
  const actions: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'onClick' && node.initializer?.getText(ast).includes('modalReturnFocus: true')) actions.push(node.initializer.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(actions.length, 2);
  assert(actions.some(action => action.includes('props.onPublishDocument!')));
  assert(actions.some(action => action.includes('props.onInspectCopy!(copy.id)')));
});

test('legacy source action is scoped to the exact document binding and uses the guarded document navigation', async () => {
  const filter = find(node => ts.isCallExpression(node) && node.expression.getText(ast) === 'space.savedBindings.filter') as ts.CallExpression;
  const predicate = execute(filter.arguments[0].getText(ast), { selectedDoc: { id: 'selected-document' } });
  const binding = { documentId: 'selected-document', flowRef: 'saved-flow:exact-copy:exact-flow' };
  assert.equal(predicate(binding), true);
  assert.equal(predicate({ documentId: 'unrelated-document', flowRef: binding.flowRef }), false);
  const click = find(node => ts.isJsxAttribute(node) && node.name.getText(ast) === 'onClick'
    && node.initializer?.getText(ast).includes("view: 'legacy', id: binding.flowRef") === true) as ts.JsxAttribute;
  for (const ready of [true, false]) {
    const calls: unknown[] = [];
    const handler = execute((click.initializer as ts.JsxExpression).expression!.getText(ast), { binding,
      openDocumentAction: async (next: () => void) => { if (ready) next(); }, props: { navigate: (target: unknown) => calls.push(target) } });
    await handler(); assert.deepEqual(calls, ready ? [{ view: 'legacy', id: binding.flowRef }] : []);
  }
});

test('actual trash action keeps its failed confirmation visible without changing native input or reopening another menu', async () => {
  const actionNode = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'openDocumentAction');
  const trashNode = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'changeDocumentTrash');
  for (const outcome of ['failure', 'success', 'navigation', 'actor-change', 'throw'] as const) {
    const originalTitle = { value: '입력 중 제목', defaultValue: '저장된 제목' };
    const originalMenu = { open: true, title: originalTitle }, replacementMenu = { open: false };
    const documentMenu = { current: originalMenu as { open: boolean } | null }, selectedRef = { current: 'doc' };
    const preparing = { current: false }, calls: string[] = [];
    const openDocumentAction = execute(`(${actionNode.getText(ast)})`, {
      selectedDoc: { id: 'doc' }, preparing, retentionSource: null, lockInput: () => () => calls.push('release'),
      setPreparingDocumentAction() {}, setMessage() {}, flushRecurrenceEditors: async () => true,
      prepareProgramDocumentAction: async () => 'ready', dirty: { current: {} }, saveRequests: { current: {} }, selectedRef, documentMenu,
    });
    const changeDocumentTrash = execute(`(${trashNode.getText(ast)})`, {
      openDocumentAction, actorId: 'local-user', programId: () => 'request', setProgramDocumentTrashed: () => assert.fail('run stub must not write'),
      run: async () => {
        calls.push('mutation');
        assert.equal(originalMenu.open, true, 'the pending confirmation must remain visible');
        if (outcome === 'throw') throw Error('storage unavailable');
        if (outcome === 'navigation' || outcome === 'actor-change') { originalMenu.open = false; selectedRef.current = 'other'; documentMenu.current = replacementMenu; }
        if (outcome === 'success') documentMenu.current = null; // Successful trash replaces the active document tools.
        return outcome === 'success' ? { ok: true } : { ok: false, reason: 'storage-unavailable' };
      },
    });
    if (outcome === 'throw') await assert.rejects(changeDocumentTrash(true), /storage unavailable/);
    else assert.equal((await changeDocumentTrash(true)).ok, outcome === 'success');
    assert.deepEqual(calls, ['mutation', 'release']); assert.equal(preparing.current, false);
    assert.equal(originalTitle.value, '입력 중 제목'); assert.equal(originalTitle.defaultValue, '저장된 제목');
    assert.equal(replacementMenu.open, false, 'completion must not reopen the new actor/document menu');
    if (outcome === 'failure' || outcome === 'throw') assert.equal(originalMenu.open, true);
    if (outcome === 'success') assert.equal(documentMenu.current, null);
  }
});
