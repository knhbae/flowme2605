import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramTextDraft } from './program-text-draft';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// D11 A (folder grammar 4판, retrace R2): ⇤·⇥ on a linked folder line was refused as "TXT의 폴더 연결이 현재
// 폴더와 맞지 않습니다", which did not say what to put back — and it is the very move a writer makes to undo a
// subfolder made by mistake. It is still refused (moving a folder belongs to 분류), now with its own reason.
const TYPED = 'doc-typed';
const RAW = '첫 줄\n- /운동\n  - /하위\n    - [ ] 일\n- /독서\n- [ ] 다른 일\n메모';
function account(): TextWorkspaceState {
  const text = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [{ id: TYPED, title: '입력 문서', folder: '합성', folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  return M.editTextResult(text, TYPED, RAW, { folderText: true }).state;
}
const edit = (state: TextWorkspaceState, raw: string) => M.editTextResult(state, TYPED, raw, { folderText: true });
const lines = (...changed: [number, string][]) => { const out = RAW.split('\n'); for (const [i, text] of changed) out[i] = text; return out.join('\n'); };

test('⇤·⇥ on a linked folder line is refused with the indentation reason, on that line', () => {
  const start = account();
  assert.equal(start.bindings.filter(row => row.kind === 'scope').length, 3, 'three linked folder lines');
  for (const [raw, line, label] of [
    [lines([2, '- /하위']), 2, '⇤ a linked subfolder line alone'],
    [lines([2, '- /하위'], [3, '  - [ ] 일']), 2, '⇤ a linked subfolder line with its task'],
    [lines([4, '  - /독서']), 4, '⇥ a linked root folder under the folder above'],
    [lines([1, '  - /운동'], [2, '    - /하위'], [3, '      - [ ] 일']), 1, '⇥ a linked root folder under a plain line'],
  ] as const) {
    const result = edit(start, raw);
    assert.deepEqual([result.reason, result.folderProblem, result.folderLine], ['invalid-format', 'folder-indent', line], label);
    assert.equal(result.state, start, `${label}: nothing changes`);
  }
});

test('plain lines and a new folder line still move by ⇤·⇥; the other reasons stay as they were', () => {
  const start = account();
  const note = edit(start, lines([6, '  메모']));
  assert.equal(note.reason, null, 'a plain line goes under the task');
  assert.equal(edit(note.state, RAW).reason, null, 'and comes back');
  const nested = edit(start, lines([4, '- /독서\n  - /새 하위']));
  assert.equal(nested.reason, null, 'a new folder line written indented still makes a subfolder');
  const fresh = edit(start, RAW + '\n- /새 분류');
  assert.equal(edit(fresh.state, RAW + '\n  - /새 분류').folderProblem, 'folder-indent', 'a folder line linked by an earlier edit, even just made, is refused (moving it is D11 B)');
  const twice = edit(start, lines([2, '      - /하위']));
  assert.equal(twice.folderProblem, 'invalid-parent', 'two levels at once stays a parent problem');
  const tagged = edit(start, `${RAW}\n- /하위 <!-- flowme-folder:v1 id=${start.folders.find(folder => folder.title === '하위')!.id} -->`);
  assert.equal(tagged.folderProblem, 'identity-mismatch', 'a tag placed elsewhere keeps its reason (S15)');
});

test('the draft shows the 4판 words; ↶ puts the line back, saving resumes and earlier input stays', async () => {
  const start = account(), sent: TextWorkspaceState[] = [];
  const draft = createProgramTextDraft(start, TYPED, async next => { sent.push(next); return true; }, () => {});
  const typed = lines([0, '첫 줄 고침']);
  assert(draft.updateRaw(typed, '', { inputType: 'insertText' }), 'input before the move');
  assert.equal(draft.updateRaw(lines([0, '첫 줄 고침'], [2, '- /하위']), '', { inputType: '' }), false, '⇤ is refused');
  const state = draft.getState();
  assert.equal(state.problemLine, 2);
  assert.equal(state.error, '폴더 줄의 들여쓰기는 글로 바꿀 수 없습니다. ↶로 되돌리거나 분류 화면의 상위 폴더에서 옮겨 주세요.');
  assert.doesNotMatch(state.error, /TXT/);
  assert.equal(await draft.save(), false, 'saving waits while refused');
  assert.equal(sent.length, 0);
  assert(draft.updateRaw(typed, '', { inputType: 'historyUndo' }), '↶ puts the line back');
  assert.equal(draft.getState().invalid, false);
  assert.equal(await draft.save(), true);
  assert.equal(M.raw(M.getDocument(sent[0], TYPED)), typed, 'the earlier input is saved with it');
});
