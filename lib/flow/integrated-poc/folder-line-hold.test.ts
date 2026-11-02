import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createAlphaStructuralDraft } from './alpha-structural-recovery';
import { createProgramTextDraft } from './program-text-draft';
import { privateTextChangeIsolatedToDocument } from './writing-ack';
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

// D3 B: a linked folder line keeps its folder and name while typed (folder-rename-move.test.ts has the rest).
test('a linked folder line renames nothing while typed, even emptied; emptied by a paste it is still refused', () => {
  const start = account(), id = existing(start);
  const typed = M.editTextResult(start, OTHER, '- /운동일지\n  - [ ] 달리기', { folderText: true, folderHold: [0] });
  assert.equal(typed.reason, null);
  assert.equal(typed.state.folders.find(folder => folder.id === id)?.title, '운동');
  const heldEmpty = M.editTextResult(start, OTHER, '- /\n  - [ ] 달리기', { folderText: true, folderHold: [0] });
  assert.equal(heldEmpty.reason, null, 'an empty name while typed is no error yet');
  const emptied = M.editTextResult(start, OTHER, '- /\n  - [ ] 달리기', { folderText: true });
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

// v2 (UX F6): leaving the line (another line, blur, a flush) only links a folder of exactly that name;
// a half-typed name stays text. A new folder is made only by an explicit finish (Enter, a bar action).
const leave = (state: TextWorkspaceState) => M.editTextResult(state, TYPED, M.raw(M.getDocument(state, TYPED)), { folderText: true, folderLink: [1] });
test('leaving a half-typed or new name keeps it as text; leaving an exact existing name links it', () => {
  const start = account();
  for (const raw of ['첫 줄\n- /회', '첫 줄\n- /운', '첫 줄\n- /운동기록']) {
    const left = leave(typeHeld(start, raw));
    assert.equal(left.reason, null, raw);
    assert.equal(folderOf(left.state, 1), null, `${raw} stays text`);
    assert.equal(left.state.folders.length, start.folders.length, `${raw} makes no folder`);
  }
  const linked = leave(typeHeld(start, '첫 줄\n- /운동'));
  assert.equal(linked.reason, null);
  assert.equal(folderOf(linked.state, 1)?.id, existing(start));
  const draft = createProgramTextDraft(start, TYPED, async () => true, () => {});
  assert(draft.updateRaw('첫 줄\n- /회', '', { inputType: 'insertText', folderHold: [1] }));
  assert.equal(draft.declareFolderLine(1, true), false, 'nothing to link');
  assert.equal(folderOf(draft.getState().working, 1), null);
  assert(draft.declareFolderLine(1), 'Enter still makes it');
  assert.equal(folderOf(draft.getState().working, 1)?.title, '회');
});

// Codex F3: a held line saved as text, then declared with the same raw: only folders and links change.
test('a save receipt for a declaration of the same raw is isolated to its document, and nothing wider', () => {
  const start = account(), held = typeHeld(start, '첫 줄\n- /운동기록'), done = finish(held);
  assert.equal(done.reason, null);
  assert.equal(privateTextChangeIsolatedToDocument(held, done.state, TYPED), true);
  const heldExisting = typeHeld(start, '첫 줄\n- /운동'), linked = finish(heldExisting);
  assert.equal(privateTextChangeIsolatedToDocument(heldExisting, linked.state, TYPED), true, 'linking the existing folder');
  const wider = structuredClone(done.state); wider.folders.push({ id: 'folder-extra', title: '다른 폴더', parentId: null });
  assert.equal(privateTextChangeIsolatedToDocument(held, wider, TYPED), false, 'an extra folder is not proved');
  const renamed = structuredClone(done.state); renamed.folders.find(folder => folder.id === existing(start))!.title = '바뀜';
  assert.equal(privateTextChangeIsolatedToDocument(held, renamed, TYPED), false, 'another folder renamed is not proved');
});

// Codex F4: a declared folder line next to a line still being typed is captured as structure.
test('structural recovery captures a declared line beside a held one', () => {
  const start = account();
  let state = typeHeld(start, '첫 줄\n- /운동기록');
  state = finish(state).state;
  state = M.editTextResult(state, TYPED, '첫 줄\n- /운동기록\n- /회', { folderText: true, folderHold: [2] }).state;
  assert.equal(M.raw(M.getDocument(state, TYPED)), '첫 줄\n- /운동기록\n- /회');
  assert.notEqual(createAlphaStructuralDraft(start, state, TYPED), null);
});

// Codex F1/F2 and UX F6 in the editor: Enter declares inside the vendor's own Enter handling, after
// its IME and modifier guards and before it reads the row; native undo keeps the line held; leaving
// it only links. The background save does not finish the line.
test('the editor finishes the held line inside the Enter handler, keeps it held on undo, and only links on leaving', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
  const keydown = vendor.slice(vendor.indexOf('    function onKeydown(event) {'), vendor.indexOf("\n    listen(textarea, 'input'"));
  const ime = keydown.indexOf('imeEnterCycle.keydown(event)'), guard = keydown.indexOf("if (event.key !== 'Enter' || event.ctrlKey"),
    hook = keydown.indexOf('config.beforeEnter()'), meta = keydown.indexOf('const meta = getRowMeta()[line.index];');
  assert(ime > 0 && guard > ime && hook > guard && meta > hook, `${ime} ${guard} ${hook} ${meta}`);
  assert.match(editor, /beforeEnter: \(\) => \{[\s\S]*?finishHeldFolderLine\(true\); finishRenamedFolderLines\(true\);/);
  assert.doesNotMatch(editor, /addEventListener\('keydown', finishBeforeEnter/);
  assert.match(editor, /'historyUndo', 'historyRedo'/);
  assert.match(editor, /const hold = heldInput\(raw, textArea\(\)\?\.selectionStart, /);
  assert.match(editor, /folderHold: hold \}\);/);
  assert.match(editor, /folderHold:heldInput\(raw,start\+insert\.length,/);
  assert.match(editor, /if \(!propsRef\.current\.folderId\) finishHeldFolderLine\(true\);\s+if \(action === 'menu'\)/);
  assert.match(editor, /textarea\.addEventListener\('blur', finishOnBlur\)/);
  assert.match(editor, /const finishOnBlur = \(\) => \{ if \(composingRef\.current\) finishAfterComposition\.current = true; finishHeldFolderLine\(\); finishRenamedFolderLines\(true\); \};/);
  assert.match(editor, /async function saveNow\(finish = true\)[^]*?if \(finish\) finishHeldFolderLine\(\);/);
  assert.match(editor, /void saveNow\(false\)/);
  assert.match(editor, /controller\.declareFolderLine\(index, !create\)/);
  for (const file of ['./writing-ack.ts', './alpha-structural-recovery.ts'])
    assert.match(readFileSync(new URL(file, import.meta.url), 'utf8'), /\.\.\.folderReplay\(before, next, documentId\)/, file);
});

// S20: an unlinked "- /" with an empty (or invalid) name is text. It used to refuse every later edit of
// the document, so one such line stopped all saves. A linked folder line emptied is still refused.
test('an empty "- /" line is text and never blocks other edits of the document', () => {
  const start = account();
  const held = typeHeld(start, '첫 줄\n- /');
  const other = M.editTextResult(held, TYPED, '첫 줄 고침\n- /', { folderText: true });
  assert.equal(other.reason, null, 'an edit elsewhere is saved');
  assert.equal(M.raw(M.getDocument(other.state, TYPED)), '첫 줄 고침\n- /');
  assert.equal(folderOf(other.state, 1), null);
  const declared = finish(held);
  assert.equal(declared.reason, null, 'finishing it with Enter is no error');
  assert.equal(folderOf(declared.state, 1), null, 'and makes no folder');
  const emptied = M.editTextResult(start, OTHER, '- /\n  - [ ] 달리기', { folderText: true });
  assert.equal(emptied.reason, 'invalid-format', 'a linked folder line emptied is still refused');
});
