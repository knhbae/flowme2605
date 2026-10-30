import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createProgramTextDraft } from './program-text-draft';
import { revertRefusedLine } from './reject-line';
import { textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

// A refused edit used to say only "저장 확인 필요" while every later edit of the document was refused
// too (S10·S15·S17). The model now names the refused line, the editor shows that line and its reason in
// the status row, and one tap puts that line back so the next save can run.
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

test('the model names the refused line: a rename onto a taken name, a foreign tag, the folder limit, a broken tag', () => {
  const start = account();
  const renamed = edit(start, '첫 줄\n- /운동');
  assert.deepEqual([renamed.reason, renamed.folderProblem, renamed.folderLine], ['invalid-format', 'name-conflict', 1], 'S10');
  const tagged = edit(start, `첫 줄\n- /미팅\n- /자식 <!-- flowme-folder:v1 id=${folderId(start, '자식')} -->`);
  assert.deepEqual([tagged.folderProblem, tagged.folderLine], ['identity-mismatch', 2], 'S15');
  const full = account(100 - account().folders.length);
  assert.equal(full.folders.length, 100);
  const limited = edit(full, '첫 줄\n- /미팅\n메모\n- /새 폴더');
  assert.deepEqual([limited.folderProblem, limited.folderLine], ['folder-limit', 3], 'S17');
  const broken = edit(start, '첫 줄\n- /미팅\n- /이상 <!-- flowme-folder:v1 -->');
  assert.deepEqual([broken.folderProblem, broken.folderLine], ['invalid-folder', 2], 'malformed tag');
});

test('putting the refused line back: its saved text, or no line when it was added; outside the edit, the edited part', () => {
  assert.deepEqual(revertRefusedLine('a\n- /미팅\nc', 'a\n- /운동\nc', 1), { raw: 'a\n- /미팅\nc', scope: 'line' });
  assert.deepEqual(revertRefusedLine('a\nc', 'a\n- /새 1\n- /새 2\nc', 2), { raw: 'a\n- /새 1\nc', scope: 'line' });
  assert.deepEqual(revertRefusedLine('p\nq', 'p\nq\nr', 0), { raw: 'p\nq', scope: 'block' });
  assert.equal(revertRefusedLine('a', 'a', 0), null, 'nothing to put back');
});

test('the draft keeps the refused line, puts it back on request, and checks again', () => {
  const start = account(), draft = createProgramTextDraft(start, TYPED, async () => true, () => {});
  assert.equal(draft.updateRaw('첫 줄 고침\n- /운동', '', { inputType: 'insertText' }), false);
  assert.equal(draft.getState().invalid, true);
  assert.equal(draft.getState().problemLine, 1);
  assert.match(draft.getState().error, /같은 위치에 이름이 겹치는 폴더/);
  assert.equal(draft.recheck(), false, 'still refused');
  const back = revertRefusedLine(M.raw(M.getDocument(draft.getState().working, TYPED)), draft.getState().raw, draft.getState().problemLine!)!.raw;
  assert.equal(back, '첫 줄 고침\n- /미팅');
  assert(draft.updateRaw(back, '', { inputType: 'revertLine' }));
  assert.equal(draft.getState().invalid, false);
  assert.equal(draft.getState().problemLine, undefined);
  assert.equal(M.raw(M.getDocument(draft.getState().working, TYPED)), '첫 줄 고침\n- /미팅', 'the other line is kept');
  const binding = draft.getState().working.bindings.find((row): row is TextScopeBinding => row.kind === 'scope' && row.docId === TYPED);
  assert.equal(draft.getState().working.folders.find(folder => folder.id === binding?.scopeId)?.title, '미팅');
});

test('the status row shows the line and its reason with 이 줄 되돌리기, and 다시 저장 stays on', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /\{refusedLine\}번째 줄: \{refusedReason\}/);
  assert.match(editor, /onClick=\{revertRefused\}>\{refused\.scope === 'line' \? '이 줄 되돌리기' : '바꾼 부분 되돌리기'\}<\/button>/);
  assert.match(editor, /disabled=\{!!props\.readOnly \|\| draft\.saving\} onClick=\{\(\) => \{ if \(draftRef\.current\?\.getState\(\)\.invalid\) draftRef\.current\.recheck\(\); void saveNow\(\); \}\}>다시 저장/);
});
