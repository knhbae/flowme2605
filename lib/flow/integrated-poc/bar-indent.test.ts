import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { textEditorRows, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { writingBarLine } from './writing-bar';
import { createProgramTextDraft } from './program-text-draft';
import * as ts from 'typescript';
import { programBarDropNotice, programIndentRefusalNotice, programIndentShape } from './bar-indent-notice';

// S5 (real accounts, 10/31; inbox s5-indent-diag): → on the writing bar did nothing and said nothing. A press made
// while '저장 중…' showed was held, and the next keystroke dropped it; a refused indent was ignored. The required
// table: the two S5 shapes, a save in flight, composition, a moved caret, save/reopen/undo keeping IDs, refusals.
const require = createRequire(import.meta.url);
const plans = require('./text-input-plan.cjs') as { planIndent: (raw: string, selection: { start: number; end: number }, rows: unknown, outdent: boolean,
  fenced: boolean[], lease: unknown, epoch: number) => { nextRaw: string } | null };
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const vendor = read('./vendor/text-editor.cjs');
const DAY = '2026-10-31';
const blank = { version: 11, folders: [{ id: 'f', title: '미분류', parentId: null }], documents: [{ id: 'd', title: 'S5', folder: '미분류', folderId: 'f', lines: [] }],
  flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
const at = (raw: string) => M.editText(blank, 'd', raw, { progressDate: DAY });
const rawOf = (state: TextWorkspaceState) => M.raw(M.getDocument(state, 'd'));
/** The native plan and the model check, as the editor runs them for → with the caret at the end of the last line. */
function press(raw: string, outdent = false, fenced: boolean[] = []) {
  const state = at(raw), text = rawOf(state), plan = plans.planIndent(text, { start: text.length, end: text.length }, textEditorRows(state, 'd'), outdent, fenced, null, 0);
  if (!plan) return { state, plan: null, bar: writingBarLine(text, text.length, () => null) };
  const result = M.editTextResult(state, 'd', plan.nextRaw, { progressDate: DAY });
  return { state, plan: plan.nextRaw, accepted: rawOf(result.state) === plan.nextRaw, reason: result.reason, bar: writingBarLine(text, text.length, () => null) };
}

test('S5 shapes: 001 two spaces → four, 002 top level → two, then → is off; an empty or a titled line alike', () => {
  for (const tail of ['', 'S5 하위']) {
    const first = press(`- [ ] 오늘\n  - [ ] S5 확인 1\n  - [ ] S5 확인 2\n  - [ ] ${tail}`);
    assert.deepEqual([first.bar.canIndent, first.accepted], [true, true], `001 ${tail || 'empty'}`);
    assert.equal(first.plan!.split('\n').at(-1), `    - [ ] ${tail}`);
    const again = press(first.plan!);
    assert.equal(again.bar.canIndent, false, 'the line above is now shallower');
    const second = press(`- [ ] s5 확인 3\n- [ ] s5 확인 4\n- [ ] ${tail}`);
    assert.deepEqual([second.bar.canIndent, second.accepted], [true, true], `002 ${tail || 'empty'}`);
    assert.equal(second.plan!.split('\n').at(-1), `  - [ ] ${tail}`);
    assert.equal(press(second.plan!).bar.canIndent, false);
  }
});

test('a save in flight: → applies to the draft now, the next keystroke keeps it, and the save loop sends it with IDs, date, check and progress kept', async () => {
  const start = at('- [ ] 오늘\n  - 날짜: 2026-11-02\n  - [30%] S5 확인 1\n  - [x] S5 확인 2\n  - [ ] ');
  const ids = M.getDocument(start, 'd')!.lines.map(line => line.id), records = start.progressRecords.length;
  const sent: TextWorkspaceState[] = [], answers: ((ok: boolean) => void)[] = [];
  const draft = createProgramTextDraft(start, 'd', next => { sent.push(next); return new Promise<boolean>(done => answers.push(done)); }, () => {});
  const raw0 = rawOf(start);
  assert(draft.updateRaw(`${raw0}S5`, DAY, { inputType: 'insertText' }));
  const flight = draft.save();
  assert.equal(draft.getState().saving, true, '저장 중…');
  // → while the first save waits (the editor no longer holds it), then the next character at once.
  const indented = `${raw0.slice(0, raw0.lastIndexOf('\n') + 1)}    - [ ] S5`;
  assert(draft.updateRaw(indented, DAY, { inputType: 'insertText' }), 'the indent joins the draft during the save');
  assert(draft.updateRaw(`${indented} 하위`, DAY, { inputType: 'insertText' }));
  assert.deepEqual([draft.getState().saving, draft.getState().raw.split('\n').at(-1)], [true, '    - [ ] S5 하위']);
  answers[0](true); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(sent.length, 2, 'the loop sends the newer draft next');
  answers[1](true); assert(await flight);
  const saved = draft.getState().committed, doc = M.getDocument(saved, 'd')!;
  assert.equal(rawOf(saved), `${indented} 하위`);
  assert.deepEqual(doc.lines.slice(0, 4).map(line => line.id), ids.slice(0, 4), 'existing lines keep their IDs');
  assert.equal(doc.lines.at(-1)!.id, M.getDocument(sent[0], 'd')!.lines.at(-1)!.id, 'the new line keeps the ID of its first save');
  assert.equal(saved.progressRecords.length, records);
  assert.match(rawOf(saved), /  - 날짜: 2026-11-02\n  - \[30%\] S5 확인 1\n  - \[x\] S5 확인 2\n/);
  // Reopen: the saved text reads back the same lines; undo and redo restore the RAW with the same IDs.
  const reopened = createProgramTextDraft(saved, 'd', async () => true, () => {});
  assert.equal(reopened.getState().raw, rawOf(saved));
  const before = rawOf(saved).replace('    - [ ] S5 하위', '  - [ ] S5 하위');
  assert(reopened.updateRaw(before, DAY, { inputType: 'historyUndo' }));
  assert.deepEqual(M.getDocument(reopened.getState().working, 'd')!.lines.map(line => line.id), doc.lines.map(line => line.id));
  assert(reopened.updateRaw(rawOf(saved), DAY, { inputType: 'historyRedo' }));
  assert.deepEqual([reopened.getState().raw, M.getDocument(reopened.getState().working, 'd')!.lines.map(line => line.id)], [rawOf(saved), doc.lines.map(line => line.id)]);
});

test('the editor lets ⇤·⇥ through a save; locks, read-only, a check in flight, an invalid draft and composition still stop it', () => {
  assert.match(editor, /const indentDisabled = \(\) => paintDisabled\(\);/);
  const paint = editor.slice(editor.indexOf('const paintDisabled = () =>'), editor.indexOf('const actionsDisabled = () =>'));
  assert(paint.includes('checkPendingRef.current') && paint.includes('inputLockedRef.current') && paint.includes('readOnly') && paint.includes('invalid') && !paint.includes('saving'));
  // The global action rule keeps the save (Enter's task handling, checks, other controls).
  assert.match(editor, /const actionsDisabled = \(\) => paintDisabled\(\) \|\| !!draftRef\.current\?\.getState\(\)\.saving;/);
  assert.match(editor, /isIndentDisabled: indentDisabled,/);
  const check = editor.slice(editor.indexOf('canApplyIndent: (raw, details) => {'), editor.indexOf('canApplyTaskSplit:'));
  assert(check.includes('if (indentDisabled()) return false;') && !check.includes('actionsDisabled()'));
  assert(check.includes("indentRefusal.current = { kind: 'model', reason: result.reason };"));
  // The vendor takes the host's own indent rule, falling back to the action rule; composition still refuses.
  assert.match(vendor, /const indentDisabled = \(\) => typeof config\.isIndentDisabled === 'function' \? config\.isIndentDisabled\(\)\n\s*: typeof config\.isActionDisabled === 'function' && config\.isActionDisabled\(\);/);
  assert.match(vendor, /if \(destroyed \|\| composing \|\| nativeDepth \|\| indentDisabled\(\)\) return false;/);
  // Only the body: a folder region keeps waiting for its save.
  assert.match(editor, /const indentsNow = \(action: WritingBarAction \| null\) => \(action === 'indent' \|\| action === 'outdent'\) && !propsRef\.current\.folderId;/);
});

test('every way a press ends without acting says why', () => {
  const actions = ['indent', 'outdent', 'task', 'enter', 'menu'] as const, drops = ['typed', 'left', 'moved', 'locked', 'expired'] as const;
  const all = actions.flatMap(action => drops.map(why => programBarDropNotice(action, why)));
  assert.equal(new Set(all).size, all.length);
  assert.equal(programBarDropNotice('indent', 'typed'), '들여쓰기를 하지 않았습니다. 누른 뒤 글자가 더 입력됐습니다. 다시 눌러 주세요.');
  assert.equal(programBarDropNotice('task', 'left'), '할 일 표시를 하지 않았습니다. 커서가 편집 칸을 벗어났습니다. 다시 눌러 주세요.');
  // In the editor: typing and leaving, a lock, a moved caret or focus, a retry past its second.
  assert(editor.includes("cancel('typed');") && editor.includes("cancel('left');"));
  const release = editor.slice(editor.indexOf('function releaseHeldBar()'), editor.indexOf('function closePanel()'));
  for (const why of ['locked', 'expired', 'left', 'moved']) assert(release.includes(`'${why}'`), why);
  assert(!release.includes('barHold.cancel(); setHeldBar(null); return;'), 'no silent drop left');
  // A refused indent: runBar checks the result.
  assert.match(editor, /if \(!target\.instance\.indent\(action === 'outdent'\)\) explainIndent\(action, target\.area\);/);
});

test('refusals: the notice matches what the plan or the model decided (old shapes, tabs, odd spaces, a fence, a skipped level)', () => {
  // The native plan refuses these lines as typed (the model never stores a tab or an odd indent, so they exist only
  // in the text box); the notice names the line's shape.
  const plain = (raw: string, fenced: boolean[] = []) => plans.planIndent(raw, { start: raw.length, end: raw.length }, [], false, fenced, null, 0);
  const tab = '- [ ] a\n\t- [ ] b', odd = '- [ ] a\n   - [ ] b', fence = '```\n- [ ] a';
  assert.deepEqual([plain(tab), plain(odd), plain(fence, [false, true])], [null, null, null]);
  assert.notEqual(plain('- [ ] a\n  - [ ] b'), null, 'the same lines with two spaces plan fine');
  assert.equal(programIndentShape(tab, tab.length, false), 'tab');
  assert.equal(programIndentShape(odd, odd.length, false), 'odd');
  assert.equal(programIndentShape(fence, fence.length, false), 'fence');
  assert.equal(programIndentShape(`${'  '.repeat(32)}- [ ] 깊음`, 70, false), 'deepest');
  assert.equal(programIndentShape('- [ ] a', 3, true), 'none');
  assert.equal(programIndentRefusalNotice('indent', { kind: 'shape', why: 'tab' }), '들여쓰기를 하지 않았습니다. 이 줄 앞에 탭 문자가 있습니다. 탭을 지우고 띄어쓰기로 맞춰 주세요.');
  // The model refuses a skipped level (Tab can reach it; the bar keeps → off there) with its own reason.
  const skipped = press('- [ ] a\n  - [ ] b');
  assert.deepEqual([skipped.bar.canIndent, skipped.accepted, skipped.reason], [false, false, 'invalid-format']);
  assert.equal(programIndentRefusalNotice('indent', { kind: 'model', reason: 'invalid-format' }), '들여쓰기를 하지 않았습니다. 이렇게 옮기면 날짜·진행률·하위 구조가 맞지 않습니다.');
  // What the bar offers, the model takes: older shapes too (a memo or date line above, a heading, progress, done).
  for (const raw of ['- [ ] a\n  - 메모: x\n  - [ ] b', '- [ ] a\n  - 날짜: 2026-11-02\n  - [ ] b', '## 제목\n- [ ] b', '- [ ] a\n- [30%] b', '- [ ] a\n- [x] b', '메모 줄\n- [ ] b']) {
    const result = press(raw);
    assert.deepEqual([result.bar.canIndent, result.accepted], [true, true], raw);
  }
  // Busy reasons and an unknown model reason still say something.
  for (const why of ['locked', 'checking', 'invalid'] as const) assert.match(programIndentRefusalNotice('outdent', { kind: 'busy', why }), /^내어쓰기를 하지 않았습니다\. \S/);
  assert.equal(programIndentRefusalNotice('indent', { kind: 'model', reason: 'blocked' }), '들여쓰기를 하지 않았습니다. 이렇게 옮기면 문서 구조를 안전하게 저장할 수 없습니다.');
});

// Bar indent review P2: the real runBar, explainIndent and the textarea's beforeinput guard, run together.
const tree = ts.createSourceFile('ProgramTextEditor.tsx', editor, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodeOf(match: (node: ts.Node) => boolean) {
  const found: ts.Node[] = [];
  const visit = (node: ts.Node) => { if (match(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(tree); assert.equal(found.length, 1); return found[0];
}
const declared = (name: string) => nodeOf(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(tree).replace(/^export /, '');
const assigned = (name: string) => (nodeOf(node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && !!node.initializer) as ts.VariableDeclaration)
  .initializer!.getText(tree);
function evaluate<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as T;
}

test('review P2: a protection rule refusing ⇤·⇥ keeps its own notice; an unknown failure says so, never a shape guess', () => {
  const messages: string[] = [], indentRefusal = { current: null as unknown };
  const textarea = { value: '- [ ] 매주 운동\n- 반복: 매주 월', selectionStart: 0, selectionEnd: 0 };
  const scope = {
    textarea, indentRefusal, setMessage: (text: string) => messages.push(text),
    controller: { cancelPreparedRaw: () => {}, getState: () => ({ saving: false }), prepareRaw: () => false },  // validateWorkspace refuses
    composingRef: { current: false }, inputLockedRef: { current: false }, compositionGeneration: { current: 0 },
    propsRef: { current: { validateWorkspace: () => false, readOnly: false, folderId: '' } },
    undoFolderMove: () => false, explainRawFolderUndo: () => {}, currentIndentAction: () => null,
    heldInput: () => [], accessFor: () => undefined, currentDoc: () => ({ lines: [{ id: 'l0' }, { id: 'l1' }] }),
  };
  const programTextProtectionMessage = evaluate<(access?: unknown) => string>(declared('programTextProtectionMessage'), {});
  const guard = evaluate<(event: unknown) => void>(assigned('preventLockedInput'), { ...scope, programTextProtectionMessage });
  // The native indent writes its plan with insertText; the guard sees that beforeinput first.
  let indentResult = false;
  const instance = { indent: () => {
    const start = textarea.value.indexOf('- 반복'), end = textarea.value.length;
    textarea.selectionStart = start; textarea.selectionEnd = end;
    let prevented = false;
    guard({ inputType: 'insertText', data: '  - 반복: 매주 월', preventDefault: () => { prevented = true; }, stopImmediatePropagation: () => {}, get defaultPrevented() { return prevented; } });
    return indentResult = !prevented;
  } };
  const explainIndent = evaluate<(action: string, area: unknown) => void>(declared('explainIndent'), { ...scope, checkPendingRef: { current: false },
    draftRef: { current: { getState: () => ({ invalid: false }) } }, FOLDER_STRUCTURE_LOCK: 'FOLDER_STRUCTURE_LOCK', programIndentShape, programIndentRefusalNotice });
  const runBar = evaluate<(action: string) => void>(declared('runBar'), { ...scope, barEditor: () => ({ instance, area: textarea }), finishHeldFolderLine: () => {},
    explainIndent, syncBarLine: () => {} });
  runBar('indent');
  assert.equal(indentResult, false);
  assert.deepEqual(messages, [programTextProtectionMessage()], 'the protection notice stays; the bar adds nothing');
  // A failure the editor cannot place (the line looks fine) is said plainly, not as a spacing problem.
  messages.length = 0; indentRefusal.current = null;
  const quiet = { indent: () => false };
  evaluate<(action: string) => void>(declared('runBar'), { ...scope, barEditor: () => ({ instance: quiet, area: { value: '- [ ] a\n- [ ] b', selectionStart: 15 } }),
    finishHeldFolderLine: () => {}, explainIndent, syncBarLine: () => {} })('indent');
  assert.deepEqual(messages, ['들여쓰기를 하지 않았습니다. 이 줄을 지금 옮기지 못했습니다.']);
  assert.equal(programIndentShape('- [ ] a\n- [ ] b', 15, false), 'unknown');
});
