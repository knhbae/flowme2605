import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programFolderLines, programFolderRenameBack } from './folder-notice';
import { programNoticeEndsAt } from './program-notice';
import { createProgramTextDraft } from './program-text-draft';
import { textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

// W15 review (FIX): undoing a move puts back only the moved line (P1-1); undoing 모든 문서에 적용 never writes over
// a later edit (P1-2); a moved folder line takes every task in its block along (P1-3, 3.6); nothing changes the
// model while a composition runs, and a screen that refuses the text puts the model back (P1-4); a notice waiting
// behind another keeps its time (P2).
const TYPED = 'doc-typed', OTHER = 'doc-other';
function account(typed = '첫 줄\n- /회의\n  - [ ] 안건', other = '- /회의\n  - [ ] 다른 안건\n- /운동'): TextWorkspaceState {
  let text = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [
    { id: TYPED, title: '입력 문서', folder: '합성', folderId: 'f', lines: [] },
    { id: OTHER, title: '다른 문서', folder: '합성', folderId: 'f', lines: [] }],
  flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  text = M.editTextResult(text, OTHER, other, { folderText: true }).state;
  return M.editTextResult(text, TYPED, typed, { folderText: true }).state;
}
const lineAt = (state: TextWorkspaceState, docId: string, index: number) => M.getDocument(state, docId)!.lines[index];
const scope = (state: TextWorkspaceState, docId: string, index: number) => {
  const line = lineAt(state, docId, index);
  const binding = state.bindings.find((row): row is TextScopeBinding => row.kind === 'scope' && row.docId === docId && row.lineId === line.id);
  return binding ? state.folders.find(folder => folder.id === binding.scopeId) ?? null : null;
};
const taskIn = (state: TextWorkspaceState, docId: string, index: number) =>
  state.folders.find(folder => folder.id === state.taskScopes[lineAt(state, docId, index).id])?.title ?? null;
const folderId = (state: TextWorkspaceState, title: string) => state.folders.find(folder => folder.title === title)!.id;
/** A task put in another folder by hand (분류), as the 분류 screen leaves it. */
function classify(state: TextWorkspaceState, docId: string, index: number, title: string): TextWorkspaceState {
  const id = lineAt(state, docId, index).id, to = folderId(state, title);
  const next = { ...state, taskScopes: { ...state.taskScopes, [id]: to }, itemScopes: { ...state.itemScopes, [id]: to } };
  assert(M.validate(next)); return next;
}
const move = (state: TextWorkspaceState, raw: string, line = 1) => {
  const held = M.editTextResult(state, TYPED, raw, { folderText: true, folderHold: [line] });
  assert.equal(held.reason, null);
  const done = M.editTextResult(held.state, TYPED, raw, { folderText: true, folderMove: [line] });
  assert.equal(done.reason, null); return done.state;
};
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const body = (name: string) => { const from = editor.indexOf(`function ${name}(`); return editor.slice(from, editor.indexOf('\n  }\n', from)); };

test('P1-1: undoing a move puts back the moved line only; another line typed over and left keeps its text', () => {
  const start = account('첫 줄\n- /회의\n  - [ ] 안건\n- /운동'), draft = createProgramTextDraft(start, TYPED, async () => true, () => {});
  // SIDE_EDIT: the 운동 line typed over and left, which keeps its link (N1, D3 B b).
  assert(draft.updateRaw('첫 줄\n- /회의\n  - [ ] 안건\n- /운동일지', '', { inputType: 'insertText', folderHold: [3] }));
  assert(draft.updateRaw('첫 줄\n- /주간회의\n  - [ ] 안건\n- /운동일지', '', { inputType: 'insertText', folderHold: [1] }));
  const moved = draft.moveFolderLine(1);
  assert(moved.ok && !moved.renamed);
  assert(draft.undoFolderMove());
  const state = draft.getState();
  assert.equal(state.raw, '첫 줄\n- /회의\n  - [ ] 안건\n- /운동일지');
  assert.equal(scope(state.working, TYPED, 1)?.title, '회의');
  assert.equal(scope(state.working, TYPED, 3)?.title, '운동');
  assert.equal(taskIn(state.working, TYPED, 2), '회의');
  assert(!state.working.folders.some(folder => folder.title === '주간회의'), 'the folder the move made goes');
});

test('P1-2: 되돌리기 after 모든 문서에 적용 is the inverse of the rename only; a later edit to a line of the folder refuses it', () => {
  const start = account(), meeting = scope(start, TYPED, 1)!.id;
  const renamed = M.renameScope(start, meeting, '주간회의'), lines = programFolderLines(renamed, meeting);
  assert.deepEqual(Object.values(lines).sort(), ['- /주간회의', '- /주간회의']);
  const back = programFolderRenameBack(renamed, meeting, '회의', '주간회의', lines);
  assert(back.ok);
  assert.equal(M.raw(M.getDocument(back.next, OTHER)), M.raw(M.getDocument(start, OTHER)));
  assert.equal(M.raw(M.getDocument(back.next, TYPED)), M.raw(M.getDocument(start, TYPED)));
  // INTERVENING_TEXT: the other document's line typed over (and saved) in between keeps its link and its text.
  const edited = M.editTextResult(renamed, OTHER, '- /주간 회의 메모\n  - [ ] 다른 안건\n- /운동', { folderText: true, folderHold: [0] }).state;
  assert.equal(scope(edited, OTHER, 0)?.id, meeting);
  const refused = programFolderRenameBack(edited, meeting, '회의', '주간회의', lines);
  assert(!refused.ok);
  assert.equal(refused.reason, '그 사이 다른 곳에서 이 폴더의 줄이 바뀌어 되돌리지 않았습니다 · 분류 화면에서 이름을 바꿀 수 있습니다');
  // A line linked to it since, the folder renamed again, or the old name taken in the place: refused too.
  const linked = M.editTextResult(renamed, OTHER, '- /주간회의\n  - [ ] 다른 안건\n- /운동\n- /주간회의', { folderText: true }).state;
  assert(!programFolderRenameBack(linked, meeting, '회의', '주간회의', lines).ok);
  assert(!programFolderRenameBack(M.renameScope(renamed, meeting, '월례회의'), meeting, '회의', '주간회의', lines).ok);
  const taken = { ...renamed, folders: [...renamed.folders, { id: 'again', title: '회의', parentId: null }] } as TextWorkspaceState;
  assert(!programFolderRenameBack(taken, meeting, '회의', '주간회의', lines).ok);
  // W18 replaces this UI's old special-case button with the shared selective inverse.
  assert.match(body('renameEverywhere'), /const original = controller\.folderRenameBase\(fromId\);/);
  assert.match(body('renameEverywhere'), /apply\(next, '폴더 이름 바꾸기', undefined, undefined, original\)/);
  assert.match(body('undoFolderMove'), /const result = controller\.undoFolderOperation\(id\);\s*if \(!result\.ok\) \{ showFolderNotice\(result\.reason, 'warn'\); return true; \}/);
});

test('P1-3: a moved folder line takes every task in its block along, also one put elsewhere by hand (3.6)', () => {
  const start = account('첫 줄\n- /회의\n  - [ ] 안건\n    - [ ] 하위 확인\n  - [ ] 둘째\n- [ ] 밖의 일');
  // 안건 and 밖의 일 were put in 운동 by hand on the 분류 screen.
  const byHand = classify(classify(start, TYPED, 2, '운동'), TYPED, 5, '운동');
  const moved = move(byHand, '첫 줄\n- /주간회의\n  - [ ] 안건\n    - [ ] 하위 확인\n  - [ ] 둘째\n- [ ] 밖의 일');
  assert(M.validate(moved));
  for (const index of [2, 4]) assert.equal(taskIn(moved, TYPED, index), '주간회의', `task ${index} follows the line`);
  const sub = lineAt(moved, TYPED, 3).id;
  assert.equal(moved.itemScopes[sub], folderId(moved, '주간회의'), 'its check under it too');
  // Outside the block, and in other documents, a hand-picked folder stays.
  assert.equal(taskIn(moved, TYPED, 5), '운동');
  assert.equal(taskIn(moved, OTHER, 1), '회의');
  // Joining an existing folder of the name follows the same rule.
  const joined = move(byHand, '첫 줄\n- /운동\n  - [ ] 안건\n    - [ ] 하위 확인\n  - [ ] 둘째\n- [ ] 밖의 일');
  for (const index of [2, 4]) assert.equal(taskIn(joined, TYPED, index), '운동');
  // Not moved (only the task's text edited, or the folder renamed): a hand-picked folder stays (3.6).
  const textOnly = M.editTextResult(byHand, TYPED, '첫 줄\n- /회의\n  - [ ] 안건 고침\n    - [ ] 하위 확인\n  - [ ] 둘째\n- [ ] 밖의 일', { folderText: true }).state;
  assert.equal(taskIn(textOnly, TYPED, 2), '운동');
  const alone = classify(account('첫 줄\n- /회의\n  - [ ] 안건', '- /운동'), TYPED, 2, '운동');
  const renamed = move(alone, '첫 줄\n- /주간회의\n  - [ ] 안건');
  assert.equal(scope(renamed, TYPED, 1)?.title, '주간회의'); assert.equal(taskIn(renamed, TYPED, 2), '운동');
});

test('P1-4: nothing changes the model while a composition runs; a screen that refuses the text puts the model back', () => {
  // apply() asks before changing the draft, and puts the draft back when setValue is refused.
  const apply = body('apply');
  assert(apply.indexOf('composingRef.current') >= 0 && apply.indexOf('composingRef.current') < apply.indexOf('draftRef.current?.apply('), 'composition first');
  assert.match(apply, /if \(!shown\(draftRef\.current\.getState\(\)\.raw\)\) \{ draftRef\.current\.restoreState\(previous\);/);
  assert.match(body('undoFolderMove'), /if \(!shown\(controller\.getState\(\)\.raw\)\) \{ controller\.restoreState\(previous\); return false; \}/);
  // A notice button pressed during a composition runs once it has ended, like a held bar press.
  assert.match(editor, /const whenComposed = \(run: \(\) => void\) => \(\) => \{ if \(composingRef\.current\) \{ heldNoticeAction\.current = run; return; \} run\(\); \};/);
  assert.match(body('showFolderOperation'), /run: whenComposed\(\(\) => \{/);
  assert.match(body('showFolderOperation'), /folderNoticeRef\.current\?\.operationId !== operation\.id/);
  assert.match(body('undoFolderMove'), /controller\.undoFolderOperation\(id\)/);
  assert.match(body('showFolderMove'), /run: whenComposed\(\(\) => \{ void renameEverywhere\(before, fromId, title, oldTitle\); \}\)/);
  assert.match(body('renameEverywhere'), /showFolderOperation\(programFolderRenamedEverywhere\(next, fromId, oldTitle\), 'info'\)/);
  // The draft puts back exactly the state from before the refused change.
  const start = account(), draft = createProgramTextDraft(start, TYPED, async () => true, () => {});
  const previous = draft.getState();
  assert(draft.apply(M.renameScope(start, scope(start, TYPED, 1)!.id, '주간회의'), '폴더 이름 바꾸기'));
  assert.notEqual(draft.getState().raw, previous.raw);
  assert(draft.restoreState(previous));
  const back = draft.getState();
  assert.equal(back.raw, previous.raw); assert.equal(back.dirty, false); assert.equal(M.raw(M.getDocument(back.working, OTHER)), M.raw(M.getDocument(start, OTHER)));
});

test('P2: a notice waiting behind another keeps its time, and starts it once shown', () => {
  assert.equal(programNoticeEndsAt({ tone: 'info', shownAt: 0, leftBlockAt: null, held: false, waiting: true }), null);
  assert.equal(programNoticeEndsAt({ tone: 'choose', shownAt: 0, leftBlockAt: 10, held: false, waiting: true }), null);
  assert.equal(programNoticeEndsAt({ tone: 'info', shownAt: 0, leftBlockAt: null, held: false, waiting: false }), 6000);
  assert.match(editor, /const folderWaiting = !!folderNotice && \(!!moving \|\| !!message && !panel\);/);
  assert.match(editor, /held: noticeHeld \|\| freshHeld, waiting: folderWaiting \}\);/);
  // Once the notice ahead goes, its time starts then.
  assert.match(editor, /if \(folderWaiting\) \{ folderWaitedRef\.current = true; return; \}\s*if \(!folderWaitedRef\.current\) return;\s*folderWaitedRef\.current = false; restartFolderNotice\(\);/);
});
