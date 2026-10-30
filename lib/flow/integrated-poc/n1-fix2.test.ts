import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createProgramTextDraft } from './program-text-draft';
import { textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

// Codex QA 3차 (N1 NO_GO) block 2: pasting new names over two linked folder lines at once kept both names
// through save and reopen, because only the caret line was tracked. Every linked line an edit renamed is now
// put back, together and only those lines. Also: 미분류 cannot be renamed in 분류, so its notice says so.
const TYPED = 'doc-typed';
const RAW = '첫 줄\n- /운동\n  - [ ] 내 할 일\n- /SIDE\n보존 메모';
function account(): TextWorkspaceState {
  const text = { version: 11, folders: [{ id: 'folder-unfiled', title: '미분류', parentId: null }], documents: [{ id: TYPED, title: '입력 문서', folder: '미분류', folderId: 'folder-unfiled', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  return M.editTextResult(text, TYPED, RAW, { folderText: true }).state;
}
const scope = (state: TextWorkspaceState, index: number) => {
  const line = M.getDocument(state, TYPED)!.lines[index];
  const binding = state.bindings.find((row): row is TextScopeBinding => row.kind === 'scope' && row.docId === TYPED && row.lineId === line.id);
  return binding ? state.folders.find(folder => folder.id === binding.scopeId)?.title ?? null : null;
};

test('a paste that renamed two linked folder lines puts both back in one edit, and only those lines', () => {
  const start = account(), draft = createProgramTextDraft(start, TYPED, async () => true, () => {});
  const ids = M.getDocument(start, TYPED)!.lines.map(line => line.id);
  assert(draft.updateRaw('첫 줄\n- /운동기록\n  - [ ] 내 할 일\n- /SIDE_EDIT\n보존 메모', '', { inputType: 'insertFromPaste' }));
  assert.equal(scope(draft.getState().working, 1), '운동', 'the paste renames nothing');
  assert(draft.restoreFolderLineNames([1, 3]));
  const state = draft.getState();
  assert.equal(state.raw, RAW);
  assert.deepEqual(M.getDocument(state.working, TYPED)!.lines.map(line => line.id), ids, 'every line keeps its ID');
  assert.equal(state.folderNotice, '폴더 이름은 분류 화면에서 바꿀 수 있습니다(입력: ‘운동기록’, ‘SIDE_EDIT’)');
  assert.deepEqual(state.working.folders.map(folder => folder.title).sort(), start.folders.map(folder => folder.title).sort());
});

test('a line not handed in stays as it is, even with a name that differs (the past F4 boundary)', () => {
  const start = account(), draft = createProgramTextDraft(start, TYPED, async () => true, () => {});
  assert(draft.updateRaw('첫 줄\n- /운동기록\n  - [ ] 내 할 일\n- /SIDE_EDIT\n보존 메모', '', { inputType: 'insertFromPaste' }));
  assert(draft.restoreFolderLineNames([3]));
  assert.equal(draft.getState().raw, '첫 줄\n- /운동기록\n  - [ ] 내 할 일\n- /SIDE\n보존 메모');
  assert.equal(draft.restoreFolderLineNames([0, 4]), false, 'lines that are not linked folder lines change nothing');
});

test('putting back a 미분류 line says 미분류 cannot be renamed', () => {
  let start = account();
  start = M.editTextResult(start, TYPED, RAW + '\n- /미분류', { folderText: true }).state;
  assert.equal(scope(start, 5), '미분류');
  const draft = createProgramTextDraft(start, TYPED, async () => true, () => {});
  assert(draft.updateRaw(RAW + '\n- /미분류함', '', { inputType: 'insertFromPaste' }));
  assert(draft.restoreFolderLineName(5));
  assert.equal(draft.getState().folderNotice, '미분류 폴더의 이름은 바꿀 수 없습니다(입력: ‘미분류함’)');
});

test('the editor tracks every renamed linked line of an edit and puts them back off the caret, on blur and on Enter', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /if \(was\.has\(line\.id\) && was\.get\(line\.id\) !== line\.text && FOLDER_LINE\.test\(line\.text\)\r?\n\s*&& afterText\.bindings\.some\(row => row\.kind === 'scope' && row\.docId === props\.docId && row\.lineId === line\.id\)\) renamedFolderLinesRef\.current\.add\(line\.id\);/);
  assert.match(editor, /else finishHeldFolderLine\(\); \}\r?\n\s*finishRenamedFolderLines\(false\);/, 'when the caret moves');
  assert.match(editor, /const finishOnBlur = \(\) => \{ finishHeldFolderLine\(\); finishRenamedFolderLines\(true\); \};/);
  assert.match(editor, /beforeEnter: \(\) => \{ finishHeldFolderLine\(true\); finishRenamedFolderLines\(true\); \},/);
  assert.match(editor, /if \(!controller\.restoreFolderLineNames\(indexes\)\) return;/);
});

// Block 1: after a dated add from 오늘, the first press on the new row's 원문 was lost. The empty add line closed
// on the blur of that press, while the pointer was down, so the rows below could move under it.
test('the empty add line closes on a blur only after the press that caused it has ended', () => {
  const row = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramGroupAddRow.tsx', import.meta.url), 'utf8');
  assert.match(row, /if \(action === 'close'\) \{ if \(fromBlur\) closeAfterPress\(\); else props\.onClose\(\); return; \}/);
  assert.match(row, /void act\(entry\.leave\(props\.inputRef\.current\?\.value \?\? ''\), true\); \}\}>/);
  assert.match(row, /window\.addEventListener\('pointerup', done, true\); window\.addEventListener\('pointercancel', done, true\);/);
  assert.match(row, /const close = \(\) => setTimeout\(\(\) => \{ if \(mounted\.current\) props\.onClose\(\); \}, 0\);/);
});
