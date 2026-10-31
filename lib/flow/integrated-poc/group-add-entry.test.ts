import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { createGroupAddEntry, type GroupAddAction } from './group-add-entry';

// Run the real handlers of the "＋" line's title input and form against recorded key sequences.
// The sequences are what browsers are known to send; real phones are still S4's to check.
function handlers() {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramGroupAddRow.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('ProgramGroupAddRow.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: Record<string, string> = {};
  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const tag = node.parent.parent as ts.JsxOpeningLikeElement, name = node.name.getText(tree);
      const element = tag.tagName.getText(tree), titleInput = element === 'input' && tag.attributes.properties.some(attribute => attribute.getText(tree) === 'name="title"');
      if (titleInput || element === 'form') found[`${element}.${name}`] = node.initializer.expression.getText(tree);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  for (const key of ['input.onKeyDown', 'input.onCompositionStart', 'input.onCompositionEnd', 'form.onSubmit', 'form.onBlur']) assert(found[key], key);
  return found;
}
function line() {
  const found = handlers(), entry = createGroupAddEntry(), field = { value: '' }, adds: string[] = [], closes: number[] = [];
  const act = (action: GroupAddAction) => { if (action === 'add') adds.push(field.value); if (action === 'close') closes.push(1); };
  const scope = { entry, act, props: { inputRef: { current: field } } };
  const run = (expression: string) => {
    const code = ts.transpileModule('const extracted = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as (event: unknown) => void;
  };
  const keyDown = run(found['input.onKeyDown']), submit = run(found['form.onSubmit']), blur = run(found['form.onBlur']);
  const start = run(found['input.onCompositionStart']), end = run(found['input.onCompositionEnd']);
  let prevented = 0;
  const key = (key: string, isComposing: boolean) => keyDown({ key, nativeEvent: { isComposing }, currentTarget: field, preventDefault: () => { prevented++; } });
  return { entry, field, adds, closes, key, start: () => start({}), end: () => end({}), get prevented() { return prevented; },
    submit: () => submit({ preventDefault() {} }), blur: () => blur({ currentTarget: { contains: () => false }, relatedTarget: null }) };
}

test('Windows Chrome: the composing Enter does nothing, the Enter after composition adds the whole line once', () => {
  const h = line();
  h.start(); h.field.value = '우유 사기';
  h.key('Enter', true);          // keyCode 229 while the last syllable is still composing
  assert.deepEqual(h.adds, []); assert.equal(h.prevented, 0);
  h.end();
  h.key('Enter', false);         // the same press, delivered again after compositionend
  assert.deepEqual(h.adds, ['우유 사기']);
});

test('a submit the browser fires mid-composition is ignored, so the last syllable is never left behind as a second task', () => {
  const h = line();
  h.start(); h.field.value = '우유 사';
  h.submit();
  assert.deepEqual(h.adds, []);
  h.end(); h.field.value = '우유 사기';
  h.key('Enter', false);
  assert.deepEqual(h.adds, ['우유 사기']);
});

test('Safari: composition ends before the Enter key event, which then adds once', () => {
  const h = line();
  h.start(); h.field.value = '자료 보내기'; h.end();
  h.key('Enter', false);
  assert.deepEqual(h.adds, ['자료 보내기']);
});

test('a second Enter while the first add is still saving adds nothing; after it settles the line takes the next one', () => {
  const h = line();
  h.field.value = '견적 비교';
  h.key('Enter', false); h.key('Enter', false); h.submit();
  assert.deepEqual(h.adds, ['견적 비교']);
  h.entry.settled(); h.field.value = '견적 회신';
  h.key('Enter', false);
  assert.deepEqual(h.adds, ['견적 비교', '견적 회신']);
});

test('empty Enter, Esc, or leaving an empty line closes it; composing Esc and leaving a written line do not', () => {
  const h = line();
  h.key('Enter', false); assert.equal(h.closes.length, 1);
  h.start(); h.key('Escape', true); h.end(); assert.equal(h.closes.length, 1);
  h.key('Escape', false); assert.equal(h.closes.length, 2);
  h.field.value = '쓰는 중'; h.blur(); assert.equal(h.closes.length, 2);
  h.field.value = ''; h.blur(); assert.equal(h.closes.length, 3);
  assert.deepEqual(h.adds, []);
});

test('an add may clear the line only if the title and time did not change while it was saving', () => {
  const entry = createGroupAddEntry();
  const quiet = entry.mark();
  assert.equal(entry.unchangedSince(quiet), true);
  const typed = entry.mark(); entry.edited();
  assert.equal(entry.unchangedSince(typed), false);
  const composed = entry.mark(); entry.compositionStart(); entry.compositionEnd();
  assert.equal(entry.unchangedSince(composed), false);
});

test('a composition whose end event never comes: blur or the next key or input that is not composing lets it go', () => {
  const entry = createGroupAddEntry();
  entry.compositionStart();
  assert.equal(entry.submit('회의'), 'ignore'); assert.equal(entry.escape(), 'ignore');
  // A key that is still composing keeps it.
  entry.keySeen(true); assert.equal(entry.submit('회의'), 'ignore');
  // The next key or input that is not composing: it is over.
  entry.keySeen(false); assert.equal(entry.escape(), 'close'); assert.equal(entry.submit('회의'), 'add'); entry.settled();
  // Blur ends it too (compositionEnd from the input's blur).
  entry.compositionStart(); assert.equal(entry.leave(''), 'ignore');
  entry.compositionEnd(); assert.equal(entry.leave(''), 'close');
});
