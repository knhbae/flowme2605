import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createProgramTextDraft } from './program-text-draft';
import { textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

// A refused edit used to say only "저장 확인 필요" while every later edit of the document was refused
// too (S10·S15·S17). The model now names the refused line, the editor shows that line and its reason in
// the status row, and 다시 저장 judges the document again once the writer has fixed that line. A one-tap
// "이 줄 되돌리기" is out of N1: it could not tell lines apart after edits elsewhere.
const TYPED = 'doc-typed', OTHER = 'doc-other';
function account(extraFolders = 0): TextWorkspaceState {
  let text = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [
    { id: TYPED, title: '입력 문서', folder: '합성', folderId: 'f', lines: [] },
    { id: OTHER, title: '다른 문서', folder: '합성', folderId: 'f', lines: [] }],
  flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  for (let i = 0; i < extraFolders; i++) text.folders.push({ id: `extra-${i}`, title: `빈 폴더 ${i}`, parentId: null });
  text = M.editTextResult(text, OTHER, '- /운동\n  - [ ] 달리기\n- /부모\n  - /자식', { folderText: true }).state;
  return M.editTextResult(text, TYPED, '첫 줄\n- /미팅', { folderText: true }).state;
}
const folderId = (state: TextWorkspaceState, title: string) => state.folders.find(folder => folder.title === title)!.id;
const edit = (state: TextWorkspaceState, raw: string) => M.editTextResult(state, TYPED, raw, { folderText: true });

test('the model names the refused line: a name two folders share, a foreign tag, the folder limit, a broken tag', () => {
  const start = account();
  // S10: a linked line renames and moves nothing (N1), so the name conflict left is a declaration where
  // two folders of that name share the place.
  const twice = account(); twice.folders.push({ id: 'dup-1', title: '중복', parentId: null }, { id: 'dup-2', title: '중복', parentId: null });
  const conflict = edit(twice, '첫 줄\n- /미팅\n- /중복');
  assert.deepEqual([conflict.reason, conflict.folderProblem, conflict.folderLine], ['invalid-format', 'name-conflict', 2], 'two of that name');
  const tagged = edit(start, `첫 줄\n- /미팅\n- /자식 <!-- flowme-folder:v1 id=${folderId(start, '자식')} -->`);
  assert.deepEqual([tagged.folderProblem, tagged.folderLine], ['identity-mismatch', 2], 'S15');
  const full = account(100 - account().folders.length);
  assert.equal(full.folders.length, 100);
  const limited = edit(full, '첫 줄\n- /미팅\n메모\n- /새 폴더');
  assert.deepEqual([limited.folderProblem, limited.folderLine], ['folder-limit', 3], 'S17');
  const broken = edit(start, '첫 줄\n- /미팅\n- /이상 <!-- flowme-folder:v1 -->');
  assert.deepEqual([broken.folderProblem, broken.folderLine], ['invalid-folder', 2], 'malformed tag');
});

test('the draft keeps the refused line and its reason, and checks again once the writer fixed it', () => {
  const start = account(100 - account().folders.length), draft = createProgramTextDraft(start, TYPED, async () => true, () => {});
  assert.equal(draft.updateRaw('첫 줄 고침\n- /미팅\n- /새 폴더', '', { inputType: 'insertText' }), false);
  assert.equal(draft.getState().invalid, true);
  // 저장 재설계 B (11/10): the refused line is held with the model's reason, and the other changed line is taken (saved).
  assert.deepEqual([draft.getState().held?.lines, draft.getState().held?.line], [[2], 2]);
  assert.match(draft.getState().held?.message ?? '', /폴더는 100개까지/);
  assert.equal(draft.getState().error, '', 'held, not refused whole: saving goes on');
  assert.equal(M.raw(M.getDocument(draft.getState().working, TYPED)), '첫 줄 고침\n- /미팅', 'the other line is taken');
  assert.equal(draft.recheck(), false, 'still refused');
  assert.deepEqual(draft.getState().held?.lines, [2], 'still held on its line');
  assert(draft.updateRaw('첫 줄 고침\n- /미팅', '', { inputType: 'deleteContentBackward' }), 'the writer removes the extra line');
  assert.equal(draft.recheck(), true);
  assert.equal(draft.getState().invalid, false);
  assert.equal(draft.getState().problemLine, undefined);
  assert.equal(M.raw(M.getDocument(draft.getState().working, TYPED)), '첫 줄 고침\n- /미팅', 'the other line is kept');
  const binding = draft.getState().working.bindings.find((row): row is TextScopeBinding => row.kind === 'scope' && row.docId === TYPED);
  assert.equal(draft.getState().working.folders.find(folder => folder.id === binding?.scopeId)?.title, '미팅');
});

test('the status row shows the line and its reason without a revert button, and 다시 저장 stays on', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /<span>\{refusedLine\}번째 줄: \{refusedReason\}<\/span><\/p>\}/);
  assert.doesNotMatch(editor, /이 줄 되돌리기|revertRefused|reject-line/);
  assert.match(editor, /disabled=\{!!props\.readOnly \|\| draft\.saving\} onClick=\{\(\) => \{ if \(draftRef\.current\?\.getState\(\)\.invalid\) draftRef\.current\.recheck\(\); void saveNow\(\); \}\}>다시 저장/);
});
