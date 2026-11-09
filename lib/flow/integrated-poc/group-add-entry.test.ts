import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { createGroupAddEntry, createLineQueue, type GroupAddAction } from './group-add-entry';

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

test('P2-F4B-1: an Enter while an earlier line still saves takes its own line; an empty Enter then neither closes nor adds', () => {
  let waiting = 0;
  const entry = createGroupAddEntry(() => waiting);
  assert.equal(entry.submit('견적 비교'), 'add'); waiting = 1;
  assert.equal(entry.submit('견적 회신'), 'add'); waiting = 2;
  assert.equal(entry.submit(''), 'ignore', 'not closed while lines wait');
  assert.equal(entry.escape(), 'ignore'); assert.equal(entry.leave(''), 'ignore');
  waiting = 0;
  assert.equal(entry.submit(''), 'close'); assert.equal(entry.escape(), 'close'); assert.equal(entry.leave(''), 'close');
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

/** A save that resolves when told: the order of saves and what each wrote. */
function saves() {
  const written: string[] = [], calls: { title: string; time: string; done: (ok: boolean) => void }[] = [];
  const save = (title: string, time: string) => new Promise<boolean>(resolve => calls.push({ title, time, done: ok => { if (ok) written.push(time ? `${title}@${time}` : title); resolve(ok); } }));
  const settle = async (ok = true) => { await Promise.resolve(); const call = calls.shift(); assert(call, 'a save is running'); call.done(ok); await new Promise(r => setTimeout(r, 0)); };
  return { written, calls, save, settle };
}

test('P2-F4B-1: lines taken while one saves wait in order, one save each, never joined; the field is free at once', async () => {
  const queue = createLineQueue(), s = saves();
  let field = '';
  const first = queue.run(queue.take('연타 1', '', s.save), () => ({ title: field, time: '' }));
  assert.equal(queue.pending, 1);
  // Typed right after the Enter, before the first save ends: each Enter takes its own line.
  const second = queue.run(queue.take('연타 2', '', s.save), () => ({ title: field, time: '' }));
  const third = queue.run(queue.take('연타 3', '09:30', s.save), () => ({ title: field, time: '' }));
  assert.equal(await second, null); assert.equal(await third, null);   // the first run takes them
  assert.equal(queue.pending, 3); assert.equal(s.calls.length, 1, 'one save at a time');
  await s.settle(); assert.equal(s.calls[0].title, '연타 2');
  await s.settle(); await s.settle();
  assert.deepEqual(await first, { text: '', time: '' });
  assert.deepEqual(s.written, ['연타 1', '연타 2', '연타 3@09:30']); assert.equal(queue.pending, 0);
  field = 'unused';
});

test('P2-F4B-1: a refused line comes back with the ones after it and what was typed since; Enter on it unchanged takes them apart again', async () => {
  const queue = createLineQueue(), s = saves();
  let field = '';
  const run = queue.run(queue.take('하나', '', s.save), () => ({ title: field, time: '' }));
  void queue.run(queue.take('둘', '', s.save), () => ({ title: field, time: '' }));
  field = '셋 쓰는 중';
  await s.settle(false);
  const back = await run;
  assert.deepEqual(back, { text: '하나 · 둘 · 셋 쓰는 중', time: '' }); assert.equal(queue.pending, 0); assert.deepEqual(s.written, []);
  // Unchanged: three lines again, in order.
  const lines = queue.take('하나 · 둘 · 셋 쓰는 중', '', s.save);
  assert.deepEqual(lines.map(line => line.title), ['하나', '둘', '셋 쓰는 중']);
  const again = queue.run(lines, () => ({ title: '', time: '' }));
  await s.settle(); await s.settle(); await s.settle();
  assert.deepEqual(await again, { text: '', time: '' }); assert.deepEqual(s.written, ['하나', '둘', '셋 쓰는 중']);
  // Edited after coming back: it is the one line it now is.
  const solo = createLineQueue(), t = saves();
  const r1 = solo.run(solo.take('가', '', t.save), () => ({ title: '', time: '' })); void solo.run(solo.take('나', '', t.save), () => ({ title: '', time: '' }));
  await t.settle(false); assert.equal((await r1)?.text, '가 · 나');
  assert.deepEqual(solo.take('가 · 나 고침', '', t.save).map(line => line.title), ['가 · 나 고침']);
});

test('P2-F4B-1: one refused line comes back with its time; a save that throws counts as refused', async () => {
  const queue = createLineQueue();
  const back = await queue.run(queue.take('회의', '14:00', async () => false), () => ({ title: '', time: '' }));
  assert.deepEqual(back, { text: '회의', time: '14:00' });
  const thrown = await queue.run(queue.take('보고', '', async () => { throw new Error('x'); }), () => ({ title: '', time: '' }));
  assert.deepEqual(thrown, { text: '보고', time: '' });
});

test('a composition whose end event never comes: blur or the next key or input that is not composing lets it go', () => {
  const entry = createGroupAddEntry();
  entry.compositionStart();
  assert.equal(entry.submit('회의'), 'ignore'); assert.equal(entry.escape(), 'ignore');
  // A key that is still composing keeps it.
  entry.keySeen(true); assert.equal(entry.submit('회의'), 'ignore');
  // The next key or input that is not composing: it is over.
  entry.keySeen(false); assert.equal(entry.escape(), 'close'); assert.equal(entry.submit('회의'), 'add');
  // Blur ends it too (compositionEnd from the input's blur).
  entry.compositionStart(); assert.equal(entry.leave(''), 'ignore');
  entry.compositionEnd(); assert.equal(entry.leave(''), 'close');
});
