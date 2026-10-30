import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createProgramTextDraft } from './program-text-draft';
import { textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

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
  assert.match(editor, /if \(binding\) \{\r?\n *heldFolderLineRef\.current = null;\r?\n *if \(!controller\.restoreFolderLineName\(index\)\) return;/);
  assert.match(editor, /\/\/ A paste over a linked folder line's name is finished like typing: its name goes back\./);
  assert.doesNotMatch(editor, /folderMove/);
});
