import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createAlphaStructuralDraft } from './alpha-structural-recovery';
import { createProgramTextDraft } from './program-text-draft';
import { textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

// Folder risk R1: "- /이름" used to be judged on every keystroke. A name that arrived in one input
// ("운동", from a word-level IME commit, a suggestion or a paste of the word) linked the existing
// folder, and the next characters renamed it in every document. A new "- /" line is now plain text
// while it is typed and is judged once, by its whole name, when the line is finished.
const TYPED = 'doc-typed', OTHER = 'doc-other';
function account(): TextWorkspaceState {
  let text = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [
    { id: TYPED, title: '입력 문서', folder: '합성', folderId: 'f', lines: [] },
    { id: OTHER, title: '다른 문서', folder: '합성', folderId: 'f', lines: [] }],
  flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  text = M.editTextResult(text, OTHER, '- /운동\n  - [ ] 달리기', { folderText: true }).state;
  return M.editTextResult(text, TYPED, '첫 줄', { folderText: true }).state;
}
const existing = (state: TextWorkspaceState) => state.bindings.find((binding): binding is TextScopeBinding => binding.kind === 'scope' && binding.docId === OTHER)!.scopeId;
const folderOf = (state: TextWorkspaceState, index: number) => {
  const line = M.getDocument(state, TYPED)!.lines[index], binding = state.bindings.find(row => row.kind === 'scope' && row.docId === TYPED && row.lineId === line.id);
  return binding && binding.kind === 'scope' ? state.folders.find(folder => folder.id === binding.scopeId) ?? null : null;
};
// One input on line 1 while the caret stays on it.
function typeHeld(state: TextWorkspaceState, raw: string) {
  const result = M.editTextResult(state, TYPED, raw, { folderText: true, folderHold: [1] });
  assert.equal(result.reason, null, `held input refused: ${JSON.stringify(raw)} ${result.folderProblem ?? ''}`);
  return result.state;
}
const finish = (state: TextWorkspaceState) => M.editTextResult(state, TYPED, M.raw(M.getDocument(state, TYPED)), { folderText: true, folderDeclare: [1] });
function untouched(start: TextWorkspaceState, state: TextWorkspaceState) {
  const id = existing(start);
  assert.equal(state.folders.find(folder => folder.id === id)?.title, '운동', 'the existing folder keeps its name');
  assert.equal(M.raw(M.getDocument(state, OTHER)), '- /운동\n  - [ ] 달리기', 'the other document is not touched');
  assert.equal(state.folders.length, start.folders.length, 'no folder is made while the line is typed');
}

test('a word committed at once does not link or rename the existing folder; finishing the line makes 운동기록', () => {
  const start = account();
  let state = typeHeld(start, '첫 줄\n- /');
  state = typeHeld(state, '첫 줄\n- /운동');
  assert.equal(folderOf(state, 1), null, 'not linked while typed'); untouched(start, state);
  state = typeHeld(state, '첫 줄\n- /운동기록');
  untouched(start, state);
  const done = finish(state);
  assert.equal(done.reason, null);
  assert.equal(folderOf(done.state, 1)?.title, '운동기록');
  assert.notEqual(folderOf(done.state, 1)?.id, existing(start));
  assert.equal(done.state.folders.find(folder => folder.id === existing(start))?.title, '운동');
  assert.equal(M.raw(M.getDocument(done.state, OTHER)), '- /운동\n  - [ ] 달리기');
});

test('typing the existing name and finishing the line links that folder, with no refusal', () => {
  const start = account();
  let state = start;
  for (const raw of ['첫 줄\n-', '첫 줄\n- ', '첫 줄\n- /', '첫 줄\n- /운', '첫 줄\n- /운동']) { state = typeHeld(state, raw); untouched(start, state); }
  const done = finish(state);
  assert.equal(done.reason, null);
  assert.equal(folderOf(done.state, 1)?.id, existing(start), 'linked to the existing 운동');
  assert.equal(done.state.folders.length, start.folders.length, 'no stray 운 folder');
});

test('one character or one syllable at a time ends like the word case, refused at no step', () => {
  for (const pieces of [[...'- /운동기록'], ['- /', '운', '동', '기', '록']]) {
    const start = account();
    let state = start, raw = '첫 줄\n';
    for (const piece of pieces) { raw += piece; state = typeHeld(state, raw); untouched(start, state); }
    const done = finish(state);
    assert.equal(done.reason, null);
    assert.equal(folderOf(done.state, 1)?.title, '운동기록');
    assert.equal(done.state.folders.filter(folder => folder.title.startsWith('운')).map(folder => folder.title).sort().join(','), '운동,운동기록');
  }
});

test('an existing folder line still renames as it is typed, and an empty name on it is still refused', () => {
  const start = account(), id = existing(start);
  const renamed = M.editTextResult(start, OTHER, '- /운동일지\n  - [ ] 달리기', { folderText: true, folderHold: [0] });
  assert.equal(renamed.reason, null);
  assert.equal(renamed.state.folders.find(folder => folder.id === id)?.title, '운동일지');
  const emptied = M.editTextResult(start, OTHER, '- /\n  - [ ] 달리기', { folderText: true, folderHold: [0] });
  assert.equal(emptied.reason, 'invalid-format');
});

test('a paste or any line not held is judged at once, as before', () => {
  const start = account();
  const pasted = M.editTextResult(start, TYPED, '첫 줄\n- /운동기록', { folderText: true });
  assert.equal(pasted.reason, null);
  assert.equal(folderOf(pasted.state, 1)?.title, '운동기록');
  assert.equal(pasted.state.folders.find(folder => folder.id === existing(start))?.title, '운동');
});

test('the draft keeps the typed line as text and declares it once when asked', () => {
  const start = account(), commits: TextWorkspaceState[] = [];
  const draft = createProgramTextDraft(start, TYPED, async next => { commits.push(next); return true; }, () => {});
  assert(draft.updateRaw('첫 줄\n- /운동', '', { inputType: 'insertText', folderHold: [1] }));
  assert.equal(folderOf(draft.getState().working, 1), null);
  assert(draft.updateRaw('첫 줄\n- /운동기록', '', { inputType: 'insertText', folderHold: [1] }));
  untouched(start, draft.getState().working);
  assert(draft.declareFolderLine(1));
  assert.equal(folderOf(draft.getState().working, 1)?.title, '운동기록');
  assert.equal(draft.getState().raw, '첫 줄\n- /운동기록');
  assert.equal(draft.declareFolderLine(1), false, 'nothing left to declare');
});

test('structural recovery proves a line that was declared after it was held', () => {
  const start = account();
  const held = typeHeld(start, '첫 줄\n- /운동기록'), done = finish(held);
  assert.equal(done.reason, null);
  assert.notEqual(createAlphaStructuralDraft(held, done.state, TYPED), null, 'the finished declaration is captured as structure');
});

// The editor passes the caret line as held for typed input and finishes it on Enter (before the
// list Enter rules read the row), on leaving the line, on blur and before a flush save.
test('the editor holds the caret line while typing and finishes it before Enter, on leaving, on blur and on flush', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /const hold = heldInput\(raw, textArea\(\)\?\.selectionStart, /);
  assert.match(editor, /folderHold: hold \}\);/);
  assert.match(editor, /folderHold:heldInput\(raw,start\+insert\.length,/);
  assert.match(editor, /if \(!propsRef\.current\.folderId\) finishHeldFolderLine\(\);\s+if \(action === 'menu'\)/);
  assert.match(editor, /host\.addEventListener\('keydown', finishBeforeEnter, true\)/);
  assert.match(editor, /textarea\.addEventListener\('blur', finishHeldFolderLine\)/);
  assert.match(editor, /async function saveNow\(finish = true\)[^]*?if \(finish\) finishHeldFolderLine\(\);/);
  assert.match(editor, /void saveNow\(false\)/);
  for (const file of ['./writing-ack.ts', './alpha-structural-recovery.ts']) {
    assert.match(readFileSync(new URL(file, import.meta.url), 'utf8'), /folderDeclare: finishedFolderDeclarations\(/, file);
  }
});
