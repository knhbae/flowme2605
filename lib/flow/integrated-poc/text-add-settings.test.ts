import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

type AddSettings = { lineBreakEnter(): boolean; typingPickers(): boolean; plusOpensAuthoring(): boolean };
const { resolve } = createRequire(import.meta.url)('./text-add-settings.cjs') as { resolve: (config: Record<string, unknown>) => AddSettings };
const read = (settings: AddSettings) => [settings.lineBreakEnter(), settings.typingPickers(), settings.plusOpensAuthoring()];

test('without any setting the editor keeps the R3 list Enter, typed pickers, and the default ＋', () => {
  assert.deepEqual(read(resolve({})), [false, true, false]);
});

test('explicitAddOnly stays a compatibility alias that flips all three together', () => {
  assert.deepEqual(read(resolve({ explicitAddOnly: () => true })), [true, false, true]);
  assert.deepEqual(read(resolve({ explicitAddOnly: () => false })), [false, true, false]);
});

test('each new setting is read on its own and wins over the alias', () => {
  // The S1 body editor with the writing tools on: list Enter, no typed pickers, ＋ opens the writing menu.
  assert.deepEqual(read(resolve({ lineBreakEnter: () => false, typingPickers: () => false, plusOpensAuthoring: () => true })), [false, false, true]);
  assert.deepEqual(read(resolve({ explicitAddOnly: () => true, lineBreakEnter: () => false })), [false, false, true]);
});

test('settings are read at each use, so a flag change applies without recreating the editor', () => {
  let on = false;
  const settings = resolve({ typingPickers: () => !on, plusOpensAuthoring: () => on });
  assert.deepEqual([settings.typingPickers(), settings.plusOpensAuthoring()], [true, false]);
  on = true;
  assert.deepEqual([settings.typingPickers(), settings.plusOpensAuthoring()], [false, true]);
});

// Run the actual vendor functions with a stubbed editor scope; they do not establish DOM or IME event order.
const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
function slice(from: string, to: string) {
  const start = vendor.indexOf(from), end = vendor.indexOf(to, start);
  assert(start > 0 && end > start, from);
  return vendor.slice(start, end);
}

function picker(config: Record<string, unknown>, composing: boolean, text = '- ') {
  const actions: [string, number][] = [];
  const run = new Function('composing', 'destroyed', 'config', 'addSettings', 'rangeOfLine', 'lineAt', 'selection', 'protectedFenceLines', 'textarea', 'action',
    'let lastPickerCandidate = null;' + slice('    function maybeRequestPicker(inputType) {', '\n    function getRowMeta()') + 'return maybeRequestPicker;')(
    composing, false, config, resolve(config), () => ({ index: 0, start: 0, end: text.length, text }), () => 0,
    { start: text.length, end: text.length }, () => [], { value: text }, (type: string, index: number) => { actions.push([type, index]); });
  run('insertText');
  return actions;
}

test('typed pickers never open during IME composition, and stay off when the writing tools are on', () => {
  assert.deepEqual(picker({}, false), [['scope-picker', 0]]);
  assert.deepEqual(picker({}, false, '- [ ] '), [['task-picker', 0]]);
  assert.deepEqual(picker({}, true), []);
  assert.deepEqual(picker({ typingPickers: () => false }, false), []);
  assert.deepEqual(picker({ explicitAddOnly: () => true }, false), []);
});

test('the row ＋ opens the writing insert menu only when plusOpensAuthoring is on', () => {
  const click = (config: Record<string, unknown>) => {
    const actions: [string, number][] = [];
    const source = slice("listen(plus, 'click', ", "\n    gestureHandle(rowMenu");
    const handler = new Function('addSettings', 'action', 'plus', 'lineAt', 'selection',
      `return ${source.slice("listen(plus, 'click', ".length).replace(/\);\s*$/, '')};`)(
      resolve(config), (type: string, index: number) => { actions.push([type, index]); }, { dataset: { lineIndex: '3' } }, () => 0, { start: 0 });
    handler();
    return actions;
  };
  assert.deepEqual(click({}), [['insert', 3]]);
  assert.deepEqual(click({ plusOpensAuthoring: () => true }), [['authoring-insert', 3]]);
});
