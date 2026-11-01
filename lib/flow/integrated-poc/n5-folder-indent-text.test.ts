import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as ts from 'typescript';
import { createProgramTextDraft, FOLDER_INDENT_NOTICE } from './program-text-draft';
import { createProgramDocumentInput } from './program-document-input';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { textEditTouchesLinkedFolderIndent } from './folder-line-hold';
import type { FolderIndentPlan } from './folder-operation';

// N5 phone step 3 (S4-N5-PHONE-RESULT): right after making 'X › 새이름3' with the picker, ⇤ with the caret still on the
// automatic blank under it only took that blank out one level, an ordinary edit that ends D11 B. The folder line's ⇤
// then said why it does not move. ⌫ in the folder line's spaces (or at its start, joining it to the line above) then
// moved the folder by text: the draft refused it, kept a recovery row and blocked saving. Such input is now stopped
// before it changes anything, with the reason.
const native = createRequire(import.meta.url)('./text-input-plan.cjs') as { planIndent: (...args: unknown[]) => Omit<FolderIndentPlan, 'selectionBefore'> | null };
type Draft = ReturnType<typeof createProgramTextDraft>;
function phoneDoc(extra: (draft: Draft, docId: string) => void) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: 'v10 보류 줄' }); const docId = state.documents.at(-1)!.id;
  state = M.editTextResult(state, docId, '- /운동\n  - /보류이름\n끝 메모', { folderText: true, folderHold: [1] }).state;
  const owner = createProgramDocumentInput(state, docId);
  const draft = createProgramTextDraft(owner.initial, docId, async () => true, () => {}, () => true, owner, true);
  extra(draft, docId);
  return { draft, docId };
}
/** A '- /name' line typed at `index` and made with the picker's new-folder chip, then Enter (the automatic blank). */
function pick(draft: Draft, docId: string, index: number, line: string, enter = true) {
  const lines = draft.getState().raw.split('\n');
  if (index < lines.length && !lines[index].trim()) lines[index] = line; else lines.splice(index, 0, line);
  assert(draft.updateRaw(lines.join('\n'), '', { inputType: 'insertText', folderHold: [index] } as never), 'typed');
  assert(draft.declareFolderLine(index, false, true), 'picked');
  if (!enter) return;
  const head = M.getDocument(draft.getState().working, docId)!.lines[index]; draft.noteFolderEnter(head.id);
  const next = draft.getState().raw.split('\n'); next.splice(index + 1, 0, /^ */.exec(head.text)![0] + '  ');
  assert(draft.updateRaw(next.join('\n'), '', { inputType: 'insertText' }), 'enter');
}
const offsetOf = (raw: string, line: number, column: number) => raw.split('\n').slice(0, line).reduce((sum, text) => sum + text.length + 1, 0) + column;

// The editor's real beforeinput guard, run against the real draft.
const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramTextEditor.tsx', editor, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodeOf(match: (node: ts.Node) => boolean) {
  const found: ts.Node[] = []; const visit = (node: ts.Node) => { if (match(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(tree); assert.equal(found.length, 1); return found[0];
}
const guardSource = (nodeOf(node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'preventLockedInput') as ts.VariableDeclaration).initializer!.getText(tree);
function guardFor(draft: Draft, docId: string) {
  const messages: string[] = [], textarea = { value: draft.getState().raw, selectionStart: 0, selectionEnd: 0 };
  const scope = { controller: draft, textarea, props: { docId }, setMessage: (text: string) => messages.push(text), indentRefusal: { current: null },
    composingRef: { current: false }, inputLockedRef: { current: false }, compositionGeneration: { current: 0 }, propsRef: { current: { validateWorkspace: () => true } },
    undoFolderMove: () => false, explainRawFolderUndo: () => {}, currentIndentAction: () => null, heldInput: () => undefined, accessFor: () => undefined,
    currentDoc: () => M.getDocument(draft.getState().working, docId), programTextProtectionMessage: () => 'PROTECTED', FOLDER_INDENT_NOTICE, textEditTouchesLinkedFolderIndent };
  const code = ts.transpileModule('const guard = (' + guardSource + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const guard = new Function(...Object.keys(scope), code + '\nreturn guard;')(...Object.values(scope)) as (event: unknown) => void;
  return { messages, press(inputType: string, caret: number, data: string | null = null) {
    textarea.value = draft.getState().raw; textarea.selectionStart = textarea.selectionEnd = caret;
    let prevented = false;
    guard({ inputType, data, preventDefault: () => { prevented = true; }, stopImmediatePropagation: () => {}, get defaultPrevented() { return prevented; } });
    return prevented;
  } };
}

test('N5 case 1: ⇤ on the automatic blank is an ordinary edit; ⌫ in the subfolder line\'s spaces is now stopped, the draft untouched', () => {
  const { draft, docId } = phoneDoc((d, id) => { pick(d, id, 3, '- /폰임시'); pick(d, id, 4, '  - /새이름3'); });
  const head = M.getDocument(draft.getState().working, docId)!.lines[4];
  assert.equal(draft.getState().raw, '- /운동\n  - /보류이름\n끝 메모\n- /폰임시\n  - /새이름3\n    ');
  assert(draft.freshFolderLine(head.id), 'D11 B is open right after the picker and Enter');
  // ⇤ with the caret on the blank (the phone's first press): the native plan takes that blank out one level only.
  const raw = draft.getState().raw, caret = raw.length;
  const plan = native.planIndent(raw, { start: caret, end: caret }, M.rowMeta(draft.getState().working, docId), true, [], null, 0)!;
  assert.equal(plan.startLine, 5);
  assert(draft.updateRaw(plan.nextRaw, '', { inputType: 'insertText' }));
  assert.equal(draft.freshFolderLine(head.id), false, 'another edit ends D11 B (spec condition 2)');
  // ⌫ just before '- /새이름3'. Before the fix this raw reached the draft and refused it as on the phone.
  const before = draft.getState(), at = offsetOf(before.raw, 4, 2), broken = before.raw.slice(0, at - 1) + before.raw.slice(at);
  assert(textEditTouchesLinkedFolderIndent(before.working, docId, at - 1, at, ''));
  const old = phoneDoc((d, id) => { pick(d, id, 3, '- /폰임시'); pick(d, id, 4, '  - /새이름3'); });
  old.draft.updateRaw(plan.nextRaw, '', { inputType: 'insertText' });
  assert.equal(old.draft.updateRaw(broken, '', { inputType: 'deleteContentBackward' }), false);
  assert.deepEqual([old.draft.getState().invalid, old.draft.getState().error], [true, '하위 폴더의 들여쓰기와 상위 폴더를 확인해 주세요. 입력은 남아 있습니다.']);
  // Now the editor's guard stops it: nothing changes, the reason shows, saving is not blocked.
  const guard = guardFor(draft, docId);
  assert.equal(guard.press('deleteContentBackward', at), true);
  assert.deepEqual(guard.messages, [FOLDER_INDENT_NOTICE]);
  assert.equal(draft.getState(), before, 'the draft is untouched');
  assert.equal(draft.getState().invalid, false);
});

test('N5 case 2: ⌫ at the start of a new top-level folder line (joining it to the subfolder above) is stopped too', () => {
  const { draft, docId } = phoneDoc((d, id) => { pick(d, id, 3, '- /새이름3', false); pick(d, id, 4, '  - /새이름4', false); pick(d, id, 5, '- /새이름5', false); });
  const before = draft.getState();
  assert.equal(before.raw, '- /운동\n  - /보류이름\n끝 메모\n- /새이름3\n  - /새이름4\n- /새이름5');
  const at = offsetOf(before.raw, 5, 0), joined = before.raw.slice(0, at - 1) + before.raw.slice(at);
  assert.equal(joined.split('\n')[4], '  - /새이름4- /새이름5');
  assert(textEditTouchesLinkedFolderIndent(before.working, docId, at - 1, at, ''));
  // Before the fix: a refused draft with a recovery row.
  const old = phoneDoc((d, id) => { pick(d, id, 3, '- /새이름3', false); pick(d, id, 4, '  - /새이름4', false); pick(d, id, 5, '- /새이름5', false); });
  assert.equal(old.draft.updateRaw(joined, '', { inputType: 'deleteContentBackward' }), false);
  assert.equal(old.draft.getState().invalid, true);
  const guard = guardFor(draft, docId);
  assert.equal(guard.press('deleteContentBackward', at), true);
  assert.deepEqual([guard.messages, draft.getState() === before, draft.getState().invalid], [[FOLDER_INDENT_NOTICE], true, false]);
  // Delete at the end of the line above joins the same way.
  assert.equal(guard.press('deleteContentForward', at - 1), true);
  // Typing a space or a letter before its "- /" would move or break it.
  assert.equal(guard.press('insertText', at, ' '), true);
  assert.equal(guard.press('insertText', offsetOf(before.raw, 4, 1), '가'), true);
  assert.equal(draft.getState(), before);
});

test('ordinary edits around a linked folder line still go through', () => {
  const { draft, docId } = phoneDoc((d, id) => { pick(d, id, 3, '- /새이름3', false); pick(d, id, 4, '  - /새이름4', false); });
  const raw = draft.getState().raw, state = draft.getState().working, line4 = offsetOf(raw, 4, 0), name4 = offsetOf(raw, 4, 5);
  const touches = (start: number, end: number, insert: string) => textEditTouchesLinkedFolderIndent(state, docId, start, end, insert);
  assert.equal(touches(name4, name4, '가'), false, 'typing in the name after "- /" (rename)');
  assert.equal(touches(name4 - 1, name4, ''), false, 'deleting a name letter');
  assert.equal(touches(line4, line4, '\n'), false, 'Enter at the very start opens a line above');
  assert.equal(touches(line4 - 1, line4 + raw.split('\n')[4].length, ''), false, 'deleting the whole line');
  assert.equal(touches(offsetOf(raw, 2, 2), offsetOf(raw, 2, 3), ''), false, 'editing another line');
  assert.equal(touches(offsetOf(raw, 2, 5), offsetOf(raw, 2, 5), '\n'), false, 'Enter at the end of the line above');
  // The held W17 line '  - /보류이름' is not linked: its spaces are ordinary text.
  assert.equal(touches(offsetOf(raw, 1, 1), offsetOf(raw, 1, 2), ''), false);
  // The guard lets them through to the usual checks.
  const guard = guardFor(draft, docId);
  assert.equal(guard.press('insertText', name4, '가'), false);
  assert.deepEqual(guard.messages, []);
});

test('the guard order: the D11 B native proof passes first; the new stop runs before the model check', () => {
  const at = (text: string) => { const index = guardSource.indexOf(text); assert(index > 0, text); return index; };
  assert(at('if (currentIndentAction(raw)) return;') < at('textEditTouchesLinkedFolderIndent(controller.getState().working, props.docId, start, end, insert)'));
  assert(at('textEditTouchesLinkedFolderIndent(') < at('if (!controller.prepareRaw('));
  assert(guardSource.includes('textarea.value === controller.getState().raw && textEditTouchesLinkedFolderIndent('));
});
