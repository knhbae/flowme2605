import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import postcss from 'postcss';

const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let form: ts.JsxElement | undefined;
function visit(node: ts.Node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'form'
    && node.getText(ast).includes("run('분류 만들기'")) form = node;
  ts.forEachChild(node, visit);
}
visit(ast); assert(form);
const submit = form.openingElement.attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText(ast) === 'onSubmit') as ts.JsxAttribute;
const callback = (submit.initializer as ts.JsxExpression).expression!.getText(ast);
const code = ts.transpileModule(`const fn = ${callback}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function harness(run: (name: string, transition: (current: unknown) => unknown) => Promise<{ ok: boolean }>) {
  const request = { current: false }, busy: boolean[] = [], calls: unknown[] = [];
  const state = { title: '가상 분류', resets: 0, closed: 0 };
  const dom = { reset() { state.title = ''; state.resets++; }, closest() { return { removeAttribute() { state.closed++; } }; } };
  const names = ['classificationRequest', 'setClassificationCreating', 'run', 'createProgramFolder', 'base', 'FormData'];
  const fn = new Function(...names, `${code}; return fn`)(request, (value: boolean) => busy.push(value), run,
    (current: unknown, options: unknown) => { calls.push({ current, options }); return options; },
    () => ({ actorId: 'fake-actor' }), class { get() { return state.title; } });
  return { fn: () => fn({ preventDefault() {}, currentTarget: dom }), state, busy, request, calls };
}

test('classification submit holds the existing request, rejects duplicate submit and resets only after success', async () => {
  let finish!: (value: { ok: boolean }) => void;
  const h = harness(async (_, transition) => { transition({ existing: true }); return new Promise(resolve => { finish = resolve; }); });
  const pending = h.fn(); assert.equal(h.request.current, true); assert.equal(h.state.title, '가상 분류');
  await h.fn(); assert.equal(h.calls.length, 1); assert.equal(h.state.resets, 0);
  assert.deepEqual(h.calls[0], { current: { existing: true }, options: { actorId: 'fake-actor', title: '가상 분류', parentId: null } });
  finish({ ok: true }); await pending;
  assert.deepEqual(h.busy, [true, false]); assert.equal(h.state.resets, 1); assert.equal(h.state.closed, 1);
});

test('classification refusal preserves input and open disclosure for a normal retry', async () => {
  const h = harness(async () => ({ ok: false })); await h.fn();
  assert.equal(h.state.title, '가상 분류'); assert.equal(h.state.resets, 0); assert.equal(h.state.closed, 0);
  assert.deepEqual(h.busy, [true, false]); assert.equal(h.request.current, false);
  assert.match(form!.getText(ast), /disabled=\{classificationCreating\}/);
  assert.match(form!.getText(ast), /disabled=\{preparingDocumentAction \|\| classificationCreating\}/);
});

test('classification unexpected failure releases only its busy state without deleting input', async () => {
  const h = harness(async () => { throw Error('fake failure'); }); await assert.rejects(h.fn(), /fake failure/);
  assert.equal(h.state.title, '가상 분류'); assert.equal(h.state.resets, 0); assert.equal(h.state.closed, 0);
  assert.deepEqual(h.busy, [true, false]); assert.equal(h.request.current, false);
});

test('visual cascade retains bounded long detail titles and native 44px hit lanes', () => {
  const css = postcss.parse(readFileSync(new URL('./ProgramSpace.module.css', import.meta.url), 'utf8'));
  const title: Record<string, string> = {};
  css.walkRules(rule => { if (rule.selector === '.dialog[data-task-detail] .dialogHeading h2') rule.walkDecls(d => { title[d.prop] = d.value; }); });
  assert.equal(title['max-height'], '4.5em'); assert.equal(title['overflow-y'], 'auto');
  const editor = readFileSync(new URL('./ProgramTextEditor.module.css', import.meta.url), 'utf8');
  assert.match(editor, /\.editor \.host :global\(\.tle-root :is\([^\n]+\)\) \{ min-height: 44px; min-width: 44px; height: 44px; \}/);
  assert.match(editor, /data-mode="live".*tle-textarea/); assert.match(editor, /data-mode="live".*tle-presentation/);
});
