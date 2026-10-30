import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { restoredLineOffset } from './folder-line-hold';
import { createProgramTextDraft } from './program-text-draft';
import { textEditorRows, textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

// N1 (S08·S10·S25): editing the name of a linked folder line used to rename the folder in every document,
// one character at a time; D3 B moved the line instead, and both missed other uses of the folder. In N1 a
// linked folder line renames and moves nothing by text — typed, pasted, undone or finished. Finishing the
// line puts its text back to the folder's name, and the status row says the name is changed in 분류.
const TYPED = 'doc-typed', OTHER = 'doc-other', THIRD = 'doc-third';
function account(shared = true): TextWorkspaceState {
  let text = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [
    { id: TYPED, title: '입력 문서', folder: '합성', folderId: 'f', lines: [] },
    { id: OTHER, title: '다른 문서', folder: '합성', folderId: 'f', lines: [] }],
  flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  text = M.editTextResult(text, OTHER, shared ? '- /회의\n  - [ ] 다른 안건\n- /운동' : '- /운동', { folderText: true }).state;
  return M.editTextResult(text, TYPED, '첫 줄\n- /회의\n  - [ ] 안건', { folderText: true }).state;
}
const scope = (state: TextWorkspaceState, docId: string, index: number) => {
  const line = M.getDocument(state, docId)!.lines[index];
  const binding = state.bindings.find((row): row is TextScopeBinding => row.kind === 'scope' && row.docId === docId && row.lineId === line.id);
  return binding ? state.folders.find(folder => folder.id === binding.scopeId) ?? null : null;
};
const others = (state: TextWorkspaceState) => JSON.stringify({ folders: state.folders, documents: state.documents.filter(doc => doc.id !== TYPED),
  bindings: state.bindings.filter(row => row.docId !== TYPED), taskScopes: state.taskScopes });
const held = (state: TextWorkspaceState, raw: string) => {
  const result = M.editTextResult(state, TYPED, raw, { folderText: true, folderHold: [1] });
  assert.equal(result.reason, null, raw); return result.state;
};
const draftOf = (state: TextWorkspaceState) => createProgramTextDraft(state, TYPED, async () => true, () => {});

test('typing a linked folder line renames nothing, here or in other documents (S08)', () => {
  const start = account(), meeting = scope(start, TYPED, 1)!;
  let state = start;
  for (const raw of ['첫 줄\n- /주회의\n  - [ ] 안건', '첫 줄\n- /주간회의\n  - [ ] 안건', '첫 줄\n- /\n  - [ ] 안건', '첫 줄\n- /주간회의\n  - [ ] 안건']) {
    state = held(state, raw);
    assert.equal(others(state), others(start), raw);
    assert.equal(scope(state, TYPED, 1)?.id, meeting.id, `${raw} keeps its link while typed`);
  }
});

test('finishing puts the line back to its folder name, says where names change, and touches nothing else', () => {
  const start = account(), meeting = scope(start, TYPED, 1)!, draft = draftOf(start);
  assert(draft.updateRaw('첫 줄\n- /주간회의\n  - [ ] 안건', '', { inputType: 'insertText', folderHold: [1] }));
  assert(draft.restoreFolderLineName(1));
  const state = draft.getState();
  assert.equal(state.raw, '첫 줄\n- /회의\n  - [ ] 안건');
  assert.equal(state.folderNotice, '폴더 이름은 분류 화면에서 바꿀 수 있습니다(입력: ‘주간회의’)');
  assert.equal(scope(state.working, TYPED, 1)?.id, meeting.id);
  assert.equal(M.getDocument(state.working, TYPED)!.lines[1].id, M.getDocument(start, TYPED)!.lines[1].id, 'the line keeps its ID');
  assert.equal(others(state.working), others(start));
  assert.equal(draft.canUndoFolderMove(), false, 'there is no move to undo');
  assert.equal(draft.restoreFolderLineName(1), false, 'nothing left to put back');
});

test('no finishing option, paste or undo renames or moves a linked folder (S10·S25)', () => {
  const start = account(), meeting = scope(start, TYPED, 1)!;
  const typed = held(start, '첫 줄\n- /운동\n  - [ ] 안건');
  for (const option of [{ folderMove: [1] }, { folderDeclare: [1] }, { folderLink: [1] }, {}]) {
    const done = M.editTextResult(typed, TYPED, '첫 줄\n- /운동\n  - [ ] 안건', { folderText: true, ...option });
    assert.equal(done.reason, null); assert.equal(done.folderMoved, undefined);
    assert.equal(scope(done.state, TYPED, 1)?.id, meeting.id, JSON.stringify(option));
    assert.equal(others(done.state), others(start), JSON.stringify(option));
  }
  const pasted = M.editTextResult(start, TYPED, '첫 줄\n- /주간회의\n  - [ ] 안건', { folderText: true });
  assert.equal(scope(pasted.state, TYPED, 1)?.id, meeting.id, 'a paste keeps the link');
  assert.equal(others(pasted.state), others(start));
  const draft = draftOf(start);
  assert(draft.updateRaw('첫 줄\n- /주간회의\n  - [ ] 안건', '', { inputType: 'insertText', folderHold: [1] }));
  assert(draft.updateRaw('첫 줄\n- /주간\n  - [ ] 안건', '', { inputType: 'historyUndo', folderHold: [1] }));
  assert.equal(others(draft.getState().working), others(start), '↶ renames nothing');
  assert.equal(draft.canUndoFolderMove(), false);
});

test('Codex counterexamples: a folder another document belongs to by folderId, and two folders of the new name', () => {
  // F1: the third document is in 회의 only by document.folderId; no other document links it in its text.
  let alone = account(false);
  const meeting = scope(alone, TYPED, 1)!;
  alone = { ...alone, documents: [...alone.documents, { ...M.getDocument(alone, OTHER)!, id: THIRD, title: '셋째 문서', folder: '회의', folderId: meeting.id, lines: [] }] } as TextWorkspaceState;
  assert(M.validate(alone));
  const draft = draftOf(alone);
  assert(draft.updateRaw('첫 줄\n- /새이름\n  - [ ] 안건', '', { inputType: 'insertText', folderHold: [1] }));
  assert(draft.restoreFolderLineName(1));
  const kept = draft.getState().working;
  assert.equal(kept.folders.find(folder => folder.id === meeting.id)?.title, '회의');
  assert.equal(JSON.stringify(M.getDocument(kept, THIRD)), JSON.stringify(M.getDocument(alone, THIRD)));
  assert.equal(others(kept), others(alone));
  // F2: two folders named 중복 in that place; the linked line stays on its own folder.
  const twice = account(); twice.folders.push({ id: 'dup-1', title: '중복', parentId: null }, { id: 'dup-2', title: '중복', parentId: null });
  const finished = M.editTextResult(held(twice, '첫 줄\n- /중복\n  - [ ] 안건'), TYPED, '첫 줄\n- /중복\n  - [ ] 안건', { folderText: true, folderDeclare: [1], folderMove: [1] });
  assert.equal(finished.reason, null);
  assert.equal(scope(finished.state, TYPED, 1)?.id, scope(twice, TYPED, 1)?.id);
  assert.equal(others(finished.state), others(twice));
});

test('putting one line back leaves another line left with a different name as it was (F4)', () => {
  let start = account();
  start = M.editTextResult(start, TYPED, '첫 줄\n- /회의\n  - [ ] 안건\n- /운동', { folderText: true }).state;
  const draft = draftOf(start);
  // The 운동 line was typed over and left: text and link differ, which N1 accepts.
  assert(draft.updateRaw('첫 줄\n- /회의\n  - [ ] 안건\n- /운동일지', '', { inputType: 'insertText', folderHold: [3] }));
  assert(draft.updateRaw('첫 줄\n- /주간회의\n  - [ ] 안건\n- /운동일지', '', { inputType: 'insertText', folderHold: [1] }));
  assert(draft.restoreFolderLineName(1));
  assert.equal(draft.getState().raw, '첫 줄\n- /회의\n  - [ ] 안건\n- /운동일지', 'only the finished line changes');
  assert.equal(scope(draft.getState().working, TYPED, 3)?.title, '운동');
  assert.equal(others(draft.getState().working), others(start));
});

test('the editor finishes a linked line by putting its name back, also after a paste', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /if \(binding\) \{\r?\n *heldFolderLineRef\.current = null;\r?\n.*\r?\n *if \(!controller\.restoreFolderLineName\(index\)\) return;/);
  assert.match(editor, /\/\/ A paste over a linked folder line's name is finished like typing: its name goes back\./);
  assert.doesNotMatch(editor, /folderMove/);
  assert.match(editor, /editorRef\.current\?\.setValue\(restored, \{ selection: \{ start: restoredLineOffset\(beforeRaw, index, line, selectionStart\),/);
});

// Codex N1 F2: putting the name back must keep the caret's place, or the Enter that finished the line
// breaks the line below it (its indent was split and the structure refused).
test('the caret keeps its place across a name put back, shorter or longer', () => {
  const shorter = '첫 줄\n- /운동기록\n  - [ ] 내 할 일\n보존 메모';
  assert.equal(restoredLineOffset(shorter, 1, '- /운동', 11), 9, 'the end of the name goes to the new end');
  assert.equal(restoredLineOffset(shorter, 1, '- /운동', 8), 9, 'inside the name too');
  assert.equal(restoredLineOffset(shorter, 1, '- /운동', 5), 5, 'inside "- /" it stays');
  assert.equal(restoredLineOffset(shorter, 1, '- /운동', 2), 2, 'before the line it stays');
  assert.equal(restoredLineOffset(shorter, 1, '- /운동', 14), 12, 'after the line it moves by the change');
  const longer = '첫 줄\n- /운\n  - [ ] 내 할 일';
  assert.equal(restoredLineOffset(longer, 1, '- /운동', 8), 9);
  assert.equal(restoredLineOffset(longer, 1, '- /운동', 11), 12);
  const indented = '- /상위\n  - /하위변경\n    - [ ] 일';
  assert.equal(restoredLineOffset(indented, 1, '  - /하위', 15), 13);
});

const load = createRequire(import.meta.url);
const inputPlans = load('./text-input-plan.cjs');
const { resolve } = load('./text-add-settings.cjs') as { resolve(config: Record<string, unknown>): Record<string, () => boolean> };
const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
const vendorSlice = (from: string, to: string) => {
  const start = vendor.indexOf(from), stop = vendor.indexOf(to, start);
  assert(start > 0 && stop > start, from); return vendor.slice(start, stop);
};

/** The vendor's real Enter handler and setValue, with the host's beforeEnter putting the folder name back
 * as the editor does. After the browser's own line break, where did the new line go? Stubs stand in for
 * DOM-only work; this does not establish IME or browser event order. */
function enterAfterRestore(raw: string, lineIndex: number, folder: string) {
  const lines = raw.split('\n'), restoredLine = /^ */.exec(lines[lineIndex])![0] + '- /' + folder;
  const restored = [...lines.slice(0, lineIndex), restoredLine, ...lines.slice(lineIndex + 1)].join('\n');
  let state = M.editText({ version: 11, folders: [{ id: 'f', title: folder, parentId: null }], documents: [{ id: 'd', title: '합성', folder, folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState, 'd', restored);
  const bound = state.documents[0].lines[lineIndex];
  state = { ...state, bindings: [...state.bindings, { kind: 'scope', docId: 'd', lineId: bound.id, scopeId: 'f' }] } as TextWorkspaceState;
  const meta = textEditorRows(state, 'd');
  const caret = lines.slice(0, lineIndex + 1).join('\n').length;
  const textarea = { value: raw, readOnly: false, selectionStart: caret, selectionEnd: caret, selectionDirection: 'none', scrollTop: 0, scrollLeft: 0,
    setSelectionRange(start: number, end: number, direction: string) { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; } };
  const config: { beforeEnter?: () => void } = {};
  const editor = new Function('textarea', 'imeEnterCycle', 'addSettings', 'inputPlans', 'config', 'getRowMeta', `
    let selection = { start: textarea.selectionStart, end: textarea.selectionEnd, direction: 'none' };
    let composing = false, inputRejected = false, nextTabLeaves = false, indentLease = null, inputEpoch = 0, lastReported = textarea.value, lastPickerCandidate = null;
    let destroyed = false, moveState = null, gesture = null;
    ${vendorSlice('  const DATE = ', '  function create(')}
    ${vendorSlice('    function lineAt(offset) {', '    let inputEpoch = 0;')}
    function remember() { selection = { start: textarea.selectionStart, end: textarea.selectionEnd, direction: textarea.selectionDirection || 'none' }; return selection; }
    function invalidatePlainRowInput() {}
    function render() {}
    function unfoldAll() {}
    function cancelMove() {}
    function indent() { return false; }
    function canApplyInput() { return true; }
    function insert(text) {
      textarea.value = textarea.value.slice(0, selection.start) + text + textarea.value.slice(selection.end);
      textarea.selectionStart = textarea.selectionEnd = selection.start + text.length; remember(); return true;
    }
    function replaceRange(start, end, text, settings) {
      textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
      const after = settings && settings.selectionAfter, at = start + text.length;
      textarea.selectionStart = after ? after.start : at; textarea.selectionEnd = after ? after.end : at; remember(); return true;
    }
    ${vendorSlice('    function onKeydown(event) {', "\n    listen(textarea, 'input'")}
    const api = {
    ${vendorSlice('      setValue(value, settings) {', '      focus(lineIndex) {')}
    };
    return { onKeydown, api };`)(textarea, { keydown: () => false, cancel() {} }, resolve({}), inputPlans, config, () => meta);
  // The editor's finish: the name goes back, the caret mapped through restoredLineOffset.
  config.beforeEnter = () => {
    const start = restoredLineOffset(raw, lineIndex, restoredLine, textarea.selectionStart);
    editor.api.setValue(restored, { selection: { start, end: start, direction: 'none' } });
  };
  let prevented = false;
  editor.onKeydown({ key: 'Enter', code: 'Enter', keyCode: 13, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, isComposing: false,
    defaultPrevented: false, preventDefault: () => { prevented = true; } });
  if (!prevented) { // the browser's own line break at the caret the handler left
    const at = textarea.selectionStart;
    textarea.value = textarea.value.slice(0, at) + '\n' + textarea.value.slice(textarea.selectionEnd); textarea.selectionStart = textarea.selectionEnd = at + 1;
  }
  return { value: textarea.value, caretLine: textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1 };
}

test('Enter right after the name is put back opens a new line under it and leaves the task below whole', () => {
  for (const [raw, line, folder] of [
    ['첫 줄\n- /운동기록\n  - [ ] 내 할 일\n보존 메모', 1, '운동'], // shorter, as in S08·S25
    ['첫 줄\n- /운\n  - [ ] 내 할 일\n보존 메모', 1, '운동'],       // longer
    ['- /상위\n  - /하위변경\n    - [ ] 일\n끝', 1, '하위'],        // indented
  ] as const) {
    const after = enterAfterRestore(raw, line, folder), rows = after.value.split('\n'), below = raw.split('\n')[line + 1];
    assert.equal(rows[line], /^ */.exec(raw.split('\n')[line])![0] + '- /' + folder, `${raw}: the name is back`);
    assert.equal(rows.filter(row => row === below).length, 1, `${raw}: the task below is whole`);
    assert.equal(rows.indexOf(below), line + 2, `${raw}: one new line opened between`);
    assert.equal(after.caretLine, line + 1, `${raw}: the caret is on the new line`);
    // The folder line opens an item under it: empty, or a new task at the indent of the one below.
    assert.match(rows[line + 1], /^ *(- \[ \] )?$/, `${raw}: the new line is a fresh item under the folder`);
  }
});
