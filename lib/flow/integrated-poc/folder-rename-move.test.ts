import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createProgramTextDraft } from './program-text-draft';
import { textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

// D3 B (S08·S25): editing the name of a linked folder line used to rename the folder in every document,
// one character at a time, and ↶ walked the rename back the same way. Now the name changes nothing while
// typed; when the line is finished it moves (with its tasks) to the folder of its new name in the same
// place, made if missing. Other documents keep their name. Only when no other document links the
// folder is the folder itself renamed. One ↶ right after puts the whole move back.
const TYPED = 'doc-typed', OTHER = 'doc-other';
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
const taskScope = (state: TextWorkspaceState, docId: string, index: number) => {
  const id = state.taskScopes[M.getDocument(state, docId)!.lines[index].id];
  return state.folders.find(folder => folder.id === id)?.title ?? null;
};
const held = (state: TextWorkspaceState, raw: string) => {
  const result = M.editTextResult(state, TYPED, raw, { folderText: true, folderHold: [1] });
  assert.equal(result.reason, null, raw); return result.state;
};
const finish = (state: TextWorkspaceState, option: 'folderMove' | 'folderLink' = 'folderMove') =>
  M.editTextResult(state, TYPED, M.raw(M.getDocument(state, TYPED)), { folderText: true, [option]: [1] });

test('typing a linked folder line renames nothing, here or in other documents (S08)', () => {
  const start = account(), meeting = scope(start, TYPED, 1)!;
  let state = start;
  for (const raw of ['첫 줄\n- /주회의\n  - [ ] 안건', '첫 줄\n- /주간회의\n  - [ ] 안건', '첫 줄\n- /\n  - [ ] 안건', '첫 줄\n- /주간회의\n  - [ ] 안건']) {
    state = held(state, raw);
    assert.equal(state.folders.find(folder => folder.id === meeting.id)?.title, '회의', raw);
    assert.equal(M.raw(M.getDocument(state, OTHER)).split('\n')[0], '- /회의', raw);
    assert.equal(scope(state, TYPED, 1)?.id, meeting.id, `${raw} keeps its link while typed`);
  }
});

test('finishing moves only this line and its tasks to a new folder of that name; other documents keep theirs', () => {
  const start = account(), meeting = scope(start, TYPED, 1)!;
  const done = finish(held(start, '첫 줄\n- /주간회의\n  - [ ] 안건'));
  assert.equal(done.reason, null);
  const moved = scope(done.state, TYPED, 1)!;
  assert.equal(moved.title, '주간회의'); assert.notEqual(moved.id, meeting.id); assert.equal(moved.parentId, meeting.parentId);
  assert.equal(taskScope(done.state, TYPED, 2), '주간회의', 'its task follows');
  assert.equal(done.state.folders.find(folder => folder.id === meeting.id)?.title, '회의');
  assert.equal(M.raw(M.getDocument(done.state, OTHER)), M.raw(M.getDocument(start, OTHER)));
  assert.equal(scope(done.state, OTHER, 0)?.id, meeting.id);
  assert.equal(taskScope(done.state, OTHER, 1), '회의');
  assert.deepEqual(done.folderMoved, { title: '주간회의', renamed: false });
});

test('a folder no other document links is renamed instead, and an existing name in that place is joined', () => {
  const alone = account(false), meeting = scope(alone, TYPED, 1)!;
  const renamed = finish(held(alone, '첫 줄\n- /주간회의\n  - [ ] 안건'));
  assert.equal(scope(renamed.state, TYPED, 1)?.id, meeting.id);
  assert.equal(renamed.state.folders.find(folder => folder.id === meeting.id)?.title, '주간회의');
  assert.equal(renamed.state.folders.length, alone.folders.length, 'no empty folder left behind');
  assert.deepEqual(renamed.folderMoved, { title: '주간회의', renamed: true });
  const start = account(), joined = finish(held(start, '첫 줄\n- /운동\n  - [ ] 안건'));
  assert.equal(joined.reason, null);
  assert.equal(scope(joined.state, TYPED, 1)?.id, scope(start, OTHER, 2)?.id, 'joins the existing 운동');
  assert.equal(joined.state.folders.length, start.folders.length);
  assert.equal(scope(joined.state, OTHER, 0)?.title, '회의');
});

test('leaving the line only joins an exact existing name; a paste into the name moves at once', () => {
  const start = account(), meeting = scope(start, TYPED, 1)!;
  const left = finish(held(start, '첫 줄\n- /주간\n  - [ ] 안건'), 'folderLink');
  assert.equal(left.reason, null);
  assert.equal(scope(left.state, TYPED, 1)?.id, meeting.id, 'no folder made on leaving');
  assert.equal(left.state.folders.length, start.folders.length);
  const joined = finish(held(start, '첫 줄\n- /운동\n  - [ ] 안건'), 'folderLink');
  assert.equal(scope(joined.state, TYPED, 1)?.title, '운동');
  const pasted = M.editTextResult(start, TYPED, '첫 줄\n- /주간회의\n  - [ ] 안건', { folderText: true });
  assert.equal(scope(pasted.state, TYPED, 1)?.title, '주간회의');
  assert.equal(scope(pasted.state, OTHER, 0)?.title, '회의');
});

test('the draft tells what happened and one undo puts the whole move back (S25)', () => {
  const start = account(), meeting = scope(start, TYPED, 1)!;
  const draft = createProgramTextDraft(start, TYPED, async () => true, () => {});
  assert(draft.updateRaw('첫 줄\n- /주간회의\n  - [ ] 안건', '', { inputType: 'insertText', folderHold: [1] }));
  assert(draft.declareFolderLine(1));
  assert.equal(draft.getState().folderNotice, '‘주간회의’ 폴더로 옮겼습니다');
  assert.equal(draft.canUndoFolderMove(), true);
  assert(draft.undoFolderMove());
  const back = draft.getState().working;
  assert.equal(M.raw(M.getDocument(back, TYPED)), M.raw(M.getDocument(start, TYPED)), 'the name is back');
  assert.equal(scope(back, TYPED, 1)?.id, meeting.id);
  assert.deepEqual(back.folders.map(folder => folder.title).sort(), start.folders.map(folder => folder.title).sort(), 'no 주간회의 left, nothing split');
  assert.equal(taskScope(back, TYPED, 2), '회의');
  assert.equal(draft.canUndoFolderMove(), false);
});

test('finished with Enter, the new empty line does not end the one undo; any other change does', () => {
  const start = account(), draft = createProgramTextDraft(start, TYPED, async () => true, () => {});
  assert(draft.updateRaw('첫 줄\n- /주간회의\n  - [ ] 안건', '', { inputType: 'insertText', folderHold: [1] }));
  assert(draft.declareFolderLine(1));
  assert(draft.updateRaw('첫 줄\n- /주간회의\n  \n  - [ ] 안건', '', { inputType: '' }), 'the Enter line');
  assert.equal(draft.canUndoFolderMove(), true);
  assert(draft.undoFolderMove());
  assert.equal(M.raw(M.getDocument(draft.getState().working, TYPED)), M.raw(M.getDocument(start, TYPED)));
  const other = createProgramTextDraft(start, TYPED, async () => true, () => {});
  assert(other.updateRaw('첫 줄\n- /주간회의\n  - [ ] 안건', '', { inputType: 'insertText', folderHold: [1] }));
  assert(other.declareFolderLine(1));
  assert(other.updateRaw('첫 줄 고침\n- /주간회의\n  - [ ] 안건', '', { inputType: 'insertText' }));
  assert.equal(other.canUndoFolderMove(), false, 'typed text after the move: ↶ is the ordinary undo');
});

test('the editor shows the move in the status row and lets ↶ and Ctrl+Z put it back first', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /aria-label="입력 되돌리기" onClick=\{\(\) => \{ if \(undoFolderMove\(\)\) return;/);
  assert.match(editor, /if \(type === 'historyUndo' && undoFolderMove\(\)\) \{ event\.preventDefault\(\); event\.stopImmediatePropagation\(\); return; \}/);
  assert.match(editor, /const notice = controller\.getState\(\)\.folderNotice; if \(notice\) setMessage\(notice\);/);
});
