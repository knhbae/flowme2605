import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const space = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const editor = readFileSync(new URL('./ProgramTextEditor.tsx', import.meta.url), 'utf8');
function callback(source: string, name: string, context: Record<string, unknown>) {
  const ast = ts.createSourceFile('component.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: ts.FunctionDeclaration | undefined;
  function visit(node: ts.Node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node; ts.forEachChild(node, visit); }
  visit(ast); assert(found, name);
  const code = ts.transpileModule(found.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(context), `${code}; return ${name};`)(...Object.values(context));
}
function harness() {
  const h = { notice: { actorId: 'owner', reason: 'save-failed' } as any,
    dataRef: { current: { activeActorId: 'owner' } }, dirty: { current: { a: true, b: false } as Record<string, boolean> },
    saveStatusReaders: { current: { a: () => ({ composing: false, saving: false, failed: false }) } as Record<string, any> },
    recurrencePorts: { current: {} as Record<string, any> },
    setViewChangeNotice: (value: any) => { h.notice = typeof value === 'function' ? value(h.notice) : value; } };
  return Object.assign(h, { currentViewChangeReason: callback(space, 'currentViewChangeReason', h) });
}

test('view rejection explains current composition, recurrence, saving and failed flush separately', () => {
  const h = harness(), show = callback(space, 'showViewChangeBlocked', h);
  for (const [composing, saving, recurrence, failed, expected] of [
    [true, false, false, false, 'composition'], [false, false, true, false, 'recurrence'],
    [false, true, false, false, 'saving'], [false, false, false, true, 'save-failed'], [false, false, false, false, 'pending'],
  ] as const) {
    h.saveStatusReaders.current.a = () => ({ composing, saving, failed });
    h.recurrencePorts.current = { r: { hasPendingInput: () => recurrence } };
    show(); assert.deepEqual(h.notice, { actorId: 'owner', reason: expected });
  }
});

test('an unresolved notice follows current saving and failure instead of keeping an old IME cause', () => {
  const h = harness(), changed = callback(space, 'editorDirtyChanged', h);
  h.notice.reason = 'composition';
  h.saveStatusReaders.current.a = () => ({ composing: false, saving: true, failed: false });
  changed('a', 'owner', true); assert.equal(h.notice.reason, 'saving');
  h.saveStatusReaders.current.a = () => ({ composing: false, saving: false, failed: true });
  changed('a', 'owner', true); assert.equal(h.notice.reason, 'save-failed');
});

test('only a same-owner dirty-to-clean signal clears the resolved view notice', () => {
  const h = harness(), changed = callback(space, 'editorDirtyChanged', h);
  const notice = h.notice;
  changed('a', 'other-owner', false); assert.equal(h.notice, notice); assert.equal(h.dirty.current.a, true);
  changed('b', 'owner', false); assert.equal(h.notice, notice); // Initialization is not a save acknowledgment.
  changed('a', 'owner', false); assert.equal(h.notice, null); assert.equal(h.dirty.current.a, false);
});

test('hidden dirty drafts, composition and recurrence input keep the view barrier', () => {
  for (const reason of ['hidden', 'composition', 'recurrence']) {
    const h = harness(), changed = callback(space, 'editorDirtyChanged', h), notice = h.notice;
    if (reason === 'hidden') h.dirty.current.b = true;
    if (reason === 'composition') h.saveStatusReaders.current.b = () => ({ composing: true, saving: false });
    if (reason === 'recurrence') h.recurrencePorts.current.r = { hasPendingInput: () => true };
    changed('a', 'owner', false); assert.equal(h.notice, notice, reason);
  }
});

test('queued notice cleanup rechecks newer input and never alters another actor notice', () => {
  const h = harness(); let update!: (previous: any) => any;
  h.setViewChangeNotice = value => { update = value; };
  callback(space, 'editorDirtyChanged', h)('a', 'owner', false);
  h.dirty.current.a = true; assert.equal(update(h.notice), h.notice);
  h.dirty.current.a = false;
  const newer = { actorId: 'new-owner', reason: 'composition' }; assert.equal(update(newer), newer);
});

test('failed period flush still locks, blocks navigation and releases without changing the document', async () => {
  const h = harness(); let released = 0, changed = 0, rejected = 0;
  const change = callback(space, 'changePeriod', { ...h, inputLockCount: { current: 0 }, lockInput: () => () => released++,
    flushAllEditors: async () => false, showViewChangeBlocked: () => rejected++, setPeriod: () => changed++ });
  assert.equal(await change('today', true), false); assert.equal(changed, 0); assert.equal(released, 1); assert.equal(rejected, 1);
});

test('successful retry clears only the obsolete child composition message and preserves newer dirty input', async () => {
  for (const [saved, dirty, initial, expected] of [
    [true, false, '한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.', ''],
    [false, true, '한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.', '한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.'],
    [true, true, '한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.', '한글 입력을 마친 뒤 보기 범위를 바꿔 주세요.'],
    [true, false, '다른 오류를 확인해 주세요.', '다른 오류를 확인해 주세요.'],
  ] as const) {
    let message: string = initial;
    const save = callback(editor, 'saveNow', { composingRef: { current: false }, regionPendingRef: { current: false }, regionPortRef: { current: null },
      draftRef: { current: { getState: () => ({ dirty }) } }, saveFullDraft: async () => saved,
      setMessage: (value: any) => { message = typeof value === 'function' ? value(message) : value; } });
    assert.equal(await save(), saved); assert.equal(message, expected);
  }
});

test('composition refuses a save without invoking the saver or replacing the draft', async () => {
  let writes = 0, message = '';
  const save = callback(editor, 'saveNow', { composingRef: { current: true }, setMessage: (value: string) => { message = value; }, saveFullDraft: () => { writes++; } });
  assert.equal(await save(), false); assert.equal(writes, 0); assert.match(message, /한글 입력/);
});

test('registered status reads live refs and does not certify save authority', () => {
  const ast = ts.createSourceFile('editor.tsx', editor, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let getter: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'propsRef.current.onRegisterSave' && node.arguments.length === 2 && ts.isArrowFunction(node.arguments[1])) getter = node.arguments[1];
    ts.forEachChild(node, visit);
  }
  visit(ast); assert(getter);
  const code = ts.transpileModule(`const read = ${getter.getText(ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const composingRef = { current: false }, state = { saving: false, error: '' };
  const read = new Function('composingRef', 'draftRef', `${code}; return read;`)(composingRef, { current: { getState: () => state } });
  assert.deepEqual(read(), { composing: false, saving: false, failed: false }); composingRef.current = true; state.saving = true; state.error = 'preserved failure';
  assert.deepEqual(read(), { composing: true, saving: true, failed: true });
});

test('view notices render on the current surface rather than only a closed dialog', () => {
  assert.match(space, /const viewChangeNoticeContent = viewChangeNotice\?\.actorId === actorId/);
  assert.match(space, /\{libraryOpen && viewChangeNoticeContent\}/);
  assert.match(space, /\{!libraryOpen && !detail && viewChangeNoticeContent\}/);
  assert.match(space, /\{!libraryOpen && detail && viewChangeNoticeContent\}/);
});
