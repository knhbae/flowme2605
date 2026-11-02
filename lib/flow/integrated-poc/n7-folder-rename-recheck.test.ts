import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createProgramTextDraft } from './program-text-draft';
import { createProgramDocumentInput } from './program-document-input';
import { programFolderCreatedNotice, programFolderKeptText } from './folder-notice';
import { restoredLineOffset } from './folder-line-hold';
import { createProgramData } from './program-data';
import { programTextTransition } from './program-text-transition';
import { programFolderNewUsesElsewhere, programFolderRenamesStillOwn, programFolderUsedElsewhere } from './folder-operation';
import { setProgramTaskClassification } from './task-classification';
import { programFolderMoveNotice } from './folder-notice';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// Review n6-phone-3 (11/2): '- /Original' → '- /' → '- /NewTitle' → Enter renamed Original (D3 B: this document alone uses
// it, so the folder itself is renamed). Another tab's document used Original too; this tab, its input unsaved, had not
// taken that in, and the save merged in: that document's task now sat in 'NewTitle'. Present since N4. D3 B's rename now
// also asks the host's newest workspace, and the save checks again; refused, the folder keeps its name.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean): string {
  let result: ts.Node | undefined; const visit = (node: ts.Node) => { if (predicate(node)) result = node; else ts.forEachChild(node, visit); }; visit(tree); assert(result); return result.getText(tree);
}
const finishSource = ts.transpileModule(find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'finishHeldFolderLine')
  + '\n' + find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'finishLeftAfterComposition'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;

/** Document A links Original; another tab's document B uses it by a line with a task under it. */
function workspaces() {
  let mine = M.addDocument(createEmptyTextWorkspace(), { title: 'A' }); const a = mine.documents.at(-1)!.id;
  mine = M.editTextResult(mine, a, '- /Original\n메모', { folderText: true }).state;
  let other = M.addDocument(mine, { title: 'B' }); const b = other.documents.at(-1)!.id;
  other = M.editTextResult(other, b, '- /Original\n  - [ ] B 할 일', { folderText: true }).state;
  const original = mine.folders.find(folder => folder.title === 'Original')!;
  assert.equal(other.taskScopes[M.getDocument(other, b)!.lines[1].id], original.id);
  return { mine, other, a, b, original };
}
/** This tab's editor on A: the draft (with the host's newest workspace), and the editor's own finish of a held line. */
function editor(mine: TextWorkspaceState, a: string, latest: TextWorkspaceState | undefined, box = true, keeps = true) {
  const owner = createProgramDocumentInput(mine, a);
  const controller = createProgramTextDraft(owner.initial, a, async () => true, () => {}, () => true, owner, true, undefined, () => latest);
  const doc = { activeElement: null as unknown };
  const area = { value: controller.getState().raw, selectionStart: 0, selectionEnd: 0, selectionDirection: 'none', ownerDocument: doc };
  doc.activeElement = area;
  const heldFolderLineRef = { current: null as null | { id: string; left: boolean; offAtStart: boolean } }, notices: string[] = [], moves: string[] = [];
  const composingRef = { current: false }, finishAfterComposition = { current: false };
  const kept: { title: string; raw: string }[] = [];
  const scope: Record<string, unknown> = { M, propsRef: { current: { docId: a, readOnly: false, onKeepRefusedInput: box ? (draft: { title: string; raw: string }) => { kept.push(draft); return keeps; } : undefined } }, draftRef: { current: controller }, textArea: () => area,
    heldFolderLineRef, composingRef, finishAfterComposition, finishRenamedFolderLines: () => {},
    currentDoc: () => M.getDocument(controller.getState().working, a), FOLDER_LINE: /^ *- \/(?!.*<!--\s*flowme-folder)/, editorRef: { current: { setValue: () => true } },
    shown: () => true, scheduleSave: () => {}, programFolderKeptText, programFolderCreatedNotice, restoredLineOffset, relinkedNotice: () => null,
    showFolderNotice: (text: string) => notices.push(text), showFolderOperation: (text: string) => notices.push(text),
    showFolderMove: (_before: unknown, _after: unknown, _line: string, fromId: string) => moves.push(fromId) };
  const fns = new Function(...Object.keys(scope), finishSource + '\nreturn { finishHeldFolderLine, finishLeftAfterComposition };')(...Object.values(scope)) as
    { finishHeldFolderLine: (explicit?: boolean) => void; finishLeftAfterComposition: () => boolean };
  const finish = fns.finishHeldFolderLine;
  /** The line typed as the review did, each a held edit, then its finish: Enter on it (beforeEnter's), or, with
   *  explicit false, the caret leaving it; offAtStart, a line already off its folder's name before these edits;
   *  finish false, the edits only (a composition's text published, its finish left to the retry). */
  const typeAndFinish = (options: { explicit?: boolean; offAtStart?: boolean; finish?: boolean }, ...texts: string[]) => {
    const line = M.getDocument(controller.getState().working, a)!.lines[0].id;
    for (const text of texts) {
      const rows = controller.getState().raw.split('\n'); rows[0] = text; const value = rows.join('\n');
      assert(controller.updateRaw(value, '', { inputType: 'insertText', folderHold: [0] } as never));
      area.value = value; area.selectionStart = area.selectionEnd = text.length;
      heldFolderLineRef.current = { id: line, left: false, offAtStart: options.offAtStart ?? false };
    }
    if (options.finish !== false) finish(options.explicit ?? true);
  };
  const typeAndEnter = (...texts: string[]) => typeAndFinish({}, ...texts);
  return { controller, typeAndEnter, typeAndFinish, notices, moves, kept, held: () => heldFolderLineRef.current, area, doc, composingRef,
    finishAfterComposition, afterComposition: fns.finishLeftAfterComposition, finish };
}
const titleOf = (state: TextWorkspaceState, id: string) => state.folders.find(folder => folder.id === id)?.title;

test('N7 review counterexample: another tab uses Original — the line\'s rename is refused, the folder keeps its name, the line its name back', () => {
  const { mine, other, a, original } = workspaces();
  const e = editor(mine, a, other);
  e.typeAndEnter('- /', '- /NewTitle');
  assert.equal(titleOf(e.controller.getState().working, original.id), 'Original');
  assert.equal(e.controller.getState().raw.split('\n')[0], '- /Original');
  assert.deepEqual(e.moves, []);
  assert.equal(e.notices.length, 1);
  assert.equal(e.controller.getState().invalid, false);
  // N7 review: the typed name is not left in the notice alone; it goes to the tab's 복구함 (saved input).
  assert.deepEqual(e.kept, [{ title: '‘Original’ 폴더 줄에 쓴 이름', raw: '- /NewTitle' }]);
  assert.match(e.notices[0], /^다른 곳에서도 쓰는 폴더라 이름을 바꾸지 않았습니다 · ‘Original’.* 두었습니다\. 입력\(‘NewTitle’\)은 복구함에 보관했습니다$/);
});

test('N7: a host without a 복구함 keeps the earlier words, the typed name in the notice', () => {
  const { mine, other, a } = workspaces();
  const e = editor(mine, a, other, false);
  e.typeAndEnter('- /', '- /NewTitle');
  assert.deepEqual(e.kept, []);
  assert.match(e.notices[0], /^다른 곳에서도 쓰는 폴더라 이름을 바꾸지 않았습니다 · ‘Original’.* 두었습니다\(입력: ‘NewTitle’\)$/);
});

test('N7: nothing else uses Original there — the rename goes as before (D3 B)', () => {
  const { mine, a, original } = workspaces();
  const e = editor(mine, a, mine);
  e.typeAndEnter('- /', '- /NewTitle');
  assert.equal(titleOf(e.controller.getState().working, original.id), 'NewTitle');
  assert.deepEqual(e.moves, [original.id]); assert.deepEqual(e.kept, []);
});

test('N7: the draft says why — moveFolderLine refuses a rename another document uses in the newest workspace', () => {
  const { mine, other, a } = workspaces();
  const owner = createProgramDocumentInput(mine, a);
  const draft = createProgramTextDraft(owner.initial, a, async () => true, () => {}, () => true, owner, true, undefined, () => other);
  assert(draft.updateRaw('- /NewTitle\n메모', '', { inputType: 'insertText', folderHold: [0] } as never));
  const working = draft.getState().working;
  assert.deepEqual(draft.moveFolderLine(0), { ok: false, reason: 'used-elsewhere' });
  assert.equal(draft.getState().working, working, 'nothing changed');
});

test('N7: the save itself — a rename of a folder another tab has started using is refused; free, or renamed for all, it saves', () => {
  const { mine, other, a, b, original } = workspaces();
  const renamed = (base: TextWorkspaceState) => {
    const owner = createProgramDocumentInput(base, a), draft = createProgramTextDraft(owner.initial, a, async () => true, () => {}, () => true, owner, true);
    assert(draft.updateRaw('- /NewTitle\n메모', '', { inputType: 'insertText', folderHold: [0] } as never));
    const moved = draft.moveFolderLine(0); assert(moved.ok && moved.renamed); return draft.getState().working;
  };
  const save = (before: TextWorkspaceState, expected: TextWorkspaceState, next: TextWorkspaceState) => {
    const data = createProgramData(); data.spaces[data.activeActorId].text = before;
    return programTextTransition(data, { actorId: data.activeActorId, documentId: a, expected, next });
  };
  const next = renamed(mine);
  assert.equal(save(other, mine, next).ok, false, 'B started using it meanwhile: refused, Original kept');
  const free = save(mine, mine, next);
  assert(free.ok); assert.equal(titleOf(free.data.spaces[free.data.activeActorId].text, original.id), 'NewTitle');
  // Renamed with B's use known (as 모든 문서에 적용 does): not this check's to refuse.
  const all = structuredClone(other); all.folders.find(folder => folder.id === original.id)!.title = 'NewTitle';
  assert.equal(save(other, other, all).ok, true);
  assert.equal(M.getDocument(other, b)!.lines[0].text, '- /Original');
});

// N7 review 3 (11/2): every other D3 B refusal put the name back with the typed one in its notice only (since N4):
// left without Enter, a line already off its folder's name, two of the new name there. Each keeps it in the 복구함 too.
const keptName = [{ title: '‘Original’ 폴더 줄에 쓴 이름', raw: '- /NewTitle' }];
// N7 review 4 (the orchestrator's decision, within B0's one judgement once the line is finished): leaving the line
// finishes it as Enter does. A typo fixed and left renames a folder this document alone uses: nothing put back or kept.
test('N7 4: a name fixed and left — renamed as on Enter (this document alone uses it), nothing put back or kept', () => {
  const { mine, a, original } = workspaces();
  const e = editor(mine, a, mine);
  e.typeAndFinish({ explicit: false }, '- /', '- /NewTitle');
  assert.equal(titleOf(e.controller.getState().working, original.id), 'NewTitle');
  assert.deepEqual(e.moves, [original.id]); assert.deepEqual(e.kept, []); assert.deepEqual(e.notices, []);
});
test('N7 4: left while another tab uses the folder — refused as on Enter, kept in the 복구함', () => {
  const { mine, other, a, original } = workspaces();
  const e = editor(mine, a, other);
  e.typeAndFinish({ explicit: false }, '- /NewTitle');
  assert.equal(titleOf(e.controller.getState().working, original.id), 'Original');
  assert.deepEqual(e.kept, keptName);
  assert.match(e.notices[0], /^다른 곳에서도 쓰는 폴더라 이름을 바꾸지 않았습니다 · ‘Original’.* 입력\(‘NewTitle’\)은 복구함에 보관했습니다$/);
});
test('N7 4: the 복구함 could not store it — the line is not put back, nothing says it was kept, the line stays held', () => {
  const { mine, other, a, original } = workspaces();
  const e = editor(mine, a, other, true, false);
  e.typeAndEnter('- /', '- /NewTitle');
  assert.deepEqual(e.kept, keptName, 'asked once');
  assert.equal(e.controller.getState().raw.split('\n')[0], '- /NewTitle', 'the input as typed');
  assert.equal(titleOf(e.controller.getState().working, original.id), 'Original');
  assert.deepEqual(e.notices, []); assert.notEqual(e.held(), null);
});
test('N7 3: a line already off its folder\'s name, finished with Enter — kept in the 복구함 too', () => {
  const { mine, a } = workspaces();
  const e = editor(mine, a, mine);
  e.typeAndFinish({ offAtStart: true }, '- /NewTitle');
  assert.deepEqual(e.kept, keptName);
  assert.match(e.notices[0], /^이미 폴더 이름과 달랐던 줄은 옮기지 않습니다 · ‘Original’.* 두었습니다\. 입력\(‘NewTitle’\)은 복구함에 보관했습니다$/);
});
test('N7 3: two folders of the new name in its place (old data) — kept in the 복구함, the notice says so', () => {
  const { mine, a, original } = workspaces();
  const doubled = structuredClone(mine);
  doubled.folders.push({ ...original, id: 'folder-n7-twin-1', title: 'NewTitle' }, { ...original, id: 'folder-n7-twin-2', title: 'NewTitle' });
  const e = editor(doubled, a, doubled);
  e.typeAndEnter('- /NewTitle');
  assert.equal(titleOf(e.controller.getState().working, original.id), 'Original');
  assert.deepEqual(e.kept, keptName);
  assert.equal(e.notices[0], '같은 자리에 ‘NewTitle’가 둘이라 옮기지 않았습니다 · 폴더 관리에서 정리할 수 있습니다 · 입력은 복구함에 보관했습니다');
});
test('N7 3: the name only emptied and finished — nothing typed, nothing kept', () => {
  const { mine, a } = workspaces();
  const e = editor(mine, a, mine);
  e.typeAndFinish({ explicit: false }, '- /');
  assert.deepEqual(e.kept, []);
  assert.equal(e.controller.getState().raw.split('\n')[0], '- /Original');
});
test('N7 3: the words without a 복구함 stay as they were', () => {
  assert.equal(programFolderKeptText('Original', 'NewTitle', 'left'), '폴더 이름은 Enter로 마칠 때만 바뀝니다 · ‘Original’로 두었습니다(입력: ‘NewTitle’)');
  assert.equal(programFolderKeptText('Original', 'NewTitle', 'name-conflict'), '같은 자리에 ‘NewTitle’가 둘이라 옮기지 않았습니다 · 폴더 관리에서 정리할 수 있습니다');
  assert.equal(programFolderKeptText('Original', 'NewTitle', 'refused', true), '이 줄은 옮길 수 없습니다 · ‘Original’로 두었습니다. 입력(‘NewTitle’)은 복구함에 보관했습니다');
});

// N7 review 4: a paste over a linked line's name is put back by finishRenamedFolderLines (N1 fix 2), which did not keep
// what was pasted. It keeps it in the 복구함 the same way; not kept, the lines stay as pasted for a later finish.
const renamedSource = ts.transpileModule(find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'finishRenamedFolderLines'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
function pasted(keeps: boolean) {
  const { mine, a, original } = workspaces();
  const owner = createProgramDocumentInput(mine, a);
  const controller = createProgramTextDraft(owner.initial, a, async () => true, () => {}, () => true, owner, true);
  const line = M.getDocument(controller.getState().working, a)!.lines[0].id;
  assert(controller.updateRaw('- /PastedName\n메모', '', { inputType: 'insertFromPaste' } as never));
  const area = { value: controller.getState().raw, selectionStart: 0, selectionEnd: 0, selectionDirection: 'none' };
  const pending = new Set([line]), kept: { title: string; raw: string }[] = [], notices: string[] = [];
  const scope: Record<string, unknown> = { M, renamedFolderLinesRef: { current: pending }, draftRef: { current: controller }, textArea: () => area,
    composingRef: { current: false }, propsRef: { current: { docId: a, readOnly: false, onKeepRefusedInput: (draft: { title: string; raw: string }) => { kept.push(draft); return keeps; } } },
    restoredLineOffset, editorRef: { current: { setValue: () => true } }, showFolderNotice: (text: string) => notices.push(text), scheduleSave: () => {} };
  const finish = new Function(...Object.keys(scope), renamedSource + '\nreturn finishRenamedFolderLines;')(...Object.values(scope)) as (all: boolean) => void;
  finish(true);
  return { controller, kept, notices, pending, line, original };
}
test('N7 4: a pasted name put back — kept in the 복구함, and the notice says so', () => {
  const p = pasted(true);
  assert.deepEqual(p.kept, [{ title: '‘Original’ 폴더 줄에 쓴 이름', raw: '- /PastedName' }]);
  assert.equal(p.controller.getState().raw.split('\n')[0], '- /Original');
  assert.match(p.notices[0], /^폴더 이름은 Enter로 마칠 때만 바뀝니다 · ‘Original’.* 두었습니다\. 입력\(‘PastedName’\)은 복구함에 보관했습니다$/);
});
test('N7 4: a pasted name the 복구함 could not store — the line stays as pasted, still to finish', () => {
  const p = pasted(false);
  assert.equal(p.controller.getState().raw.split('\n')[0], '- /PastedName');
  assert.deepEqual(p.notices, []); assert(p.pending.has(p.line));
});

// N7 re-review 2 (11/2): (1) a blur mid-composition skipped the line's finish and nothing ran it after, so '- /한글'
// was saved on a line still linked to Original. (2) a folder whose other uses the draft already knew (another
// document's tasks in it) was refused as 'used-elsewhere' instead of W15's own judgement.
test('N7 5: left mid-composition — skipped then, finished once the composition has ended (the line renamed)', () => {
  const { mine, a, original } = workspaces();
  const e = editor(mine, a, mine);
  e.composingRef.current = true;
  e.typeAndFinish({ explicit: false }, '- /', '- /한글');
  assert.equal(titleOf(e.controller.getState().working, original.id), 'Original', 'skipped while composing');
  assert.equal(e.finishAfterComposition.current, true, 'remembered');
  e.doc.activeElement = null;                       // the blur that ended it
  assert.equal(e.afterComposition(), false, 'still composing: it waits'); assert.equal(e.finishAfterComposition.current, true);
  e.composingRef.current = false;
  assert.equal(e.afterComposition(), true);
  assert.equal(titleOf(e.controller.getState().working, original.id), '한글'); assert.deepEqual(e.moves, [original.id]);
  assert.equal(e.finishAfterComposition.current, false); assert.equal(e.held(), null);
});
test('N7 5: the composition ended with the caret still on the line, the editor focused — nothing finished yet', () => {
  const { mine, a, original } = workspaces();
  const e = editor(mine, a, mine);
  e.composingRef.current = true;
  e.typeAndFinish({ explicit: false }, '- /한글');
  e.composingRef.current = false;
  assert.equal(e.afterComposition(), true);
  assert.equal(titleOf(e.controller.getState().working, original.id), 'Original'); assert.notEqual(e.held(), null, 'still held, to finish when left');
});
test('N7 5: the editor runs it after compositionend, as a held press', () => {
  assert.match(source, /if \(held && composingRef\.current\) finishAfterComposition\.current = true;/);
  assert.match(source, /if \(pending\.size && composingRef\.current\) finishAfterComposition\.current = true;/);
  assert.match(source, /useEffect\(\(\) => \{\s*if \(composing \|\| !finishAfterComposition\.current\) return;[\s\S]*?finishLeftAfterComposition\(\)[\s\S]*?\}, \[composing\]\);/);
});

/** Document A links Original; another document B is kept in Original, its task with it (no folder line of its own). */
function taskElsewhere() {
  const { mine, a, original } = workspaces();
  let known = M.addDocument(mine, { title: 'B', folderId: original.id }); const b = known.documents.at(-1)!.id;
  known = M.editTextResult(known, b, '- [ ] B 할 일', { folderText: true }).state;
  assert.equal(known.taskScopes[M.getDocument(known, b)!.lines[0].id], original.id);
  return { known, a, b, original };
}
const judged = (base: TextWorkspaceState, a: string, latest?: TextWorkspaceState) => {
  const owner = createProgramDocumentInput(base, a);
  const draft = createProgramTextDraft(owner.initial, a, async () => true, () => {}, () => true, owner, true, undefined, () => latest);
  assert(draft.updateRaw('- /NewTitle\n메모', '', { inputType: 'insertText', folderHold: [0] } as never));
  const moved = draft.moveFolderLine(0);
  return { moved, working: draft.getState().working };
};
test('N7 5: another document kept in the folder, known to the draft and the same in the newest workspace — W15\'s own move, not refused', () => {
  const { known, a, original } = taskElsewhere();
  assert.equal(programFolderUsedElsewhere(known, a, original.id), true);
  const w15 = judged(known, a), now = judged(known, a, known);
  assert(w15.moved.ok && !w15.moved.renamed, 'W15: the line moves to a folder of the new name');
  assert(now.moved.ok, 'not refused');
  assert.deepEqual([now.moved.renamed, now.moved.fromId], [false, original.id]);
  assert.equal(titleOf(now.working, now.moved.toId), 'NewTitle'); assert.equal(titleOf(now.working, original.id), 'Original');
});
// The review's own state: another document's task classified into Original (M.addTask with its scope), no folder
// line and not kept in it. W15 judges that a rename (only lines and kept documents share a folder); the first N7
// check refused it because the newest workspace had that use, though the draft had it too.
test('N7 5: another document\'s task classified into the folder, known to the draft and the same in the newest workspace — W15\'s judgement', () => {
  const { mine, a, original } = workspaces();
  let known = M.addDocument(mine, { title: 'B' }); const b = known.documents.at(-1)!.id;
  known = M.addTask(known, { docId: b, title: 'B 할 일', scopeId: original.id });
  assert.equal(programFolderUsedElsewhere(known, a, original.id), true, 'used elsewhere, by the task');
  const w15 = judged(known, a), now = judged(known, a, known);
  assert(w15.moved.ok); assert(now.moved.ok, 'not refused');
  assert.deepEqual([now.moved.renamed, now.moved.fromId], [w15.moved.ok && w15.moved.renamed, original.id]);
});
test('N7 5: a use only the newest workspace has is new; one the draft knows is not', () => {
  const { known, a, original } = taskElsewhere();
  let latest = M.addDocument(known, { title: 'C' }); const c = latest.documents.at(-1)!.id;
  latest = M.editTextResult(latest, c, '- /Original\n  - [ ] C 할 일', { folderText: true }).state;
  assert.equal(programFolderNewUsesElsewhere(known, latest, a, original.id), true);
  assert.equal(programFolderNewUsesElsewhere(known, known, a, original.id), false);
  // A move (W15) is not a rename: the newest workspace's new use does not refuse it.
  const moved = judged(known, a, latest).moved;
  assert(moved.ok && !moved.renamed);
  // The draft asks for new uses against what it holds itself (its working state), not for any use at all.
  const draft = readFileSync(new URL('./program-text-draft.ts', import.meta.url), 'utf8');
  assert.match(draft, /if \(check\.folderMoved\.renamed && latest && programFolderNewUsesElsewhere\(state\.working, latest, docId, binding\.scopeId\)\) return \{ ok: false, reason: 'used-elsewhere' \};/);
});
test('N7 5: the save — a rename its base already knew others use passes (as 모든 문서에 적용); a use new since then is refused', () => {
  const { known, a, original } = taskElsewhere();
  const renamed = structuredClone(known); renamed.folders.find(folder => folder.id === original.id)!.title = 'NewTitle';
  for (const doc of renamed.documents) if (doc.folderId === original.id) doc.folder = 'NewTitle'; // a kept document names its folder
  let latest = M.addDocument(known, { title: 'C' }); const c = latest.documents.at(-1)!.id;
  latest = M.editTextResult(latest, c, '- /Original', { folderText: true }).state;
  assert.equal(programFolderRenamesStillOwn(known, renamed, known, a), true);
  assert.equal(programFolderRenamesStillOwn(known, renamed, latest, a), false);
  const save = (before: TextWorkspaceState) => {
    const data = createProgramData(); data.spaces[data.activeActorId].text = before;
    return programTextTransition(data, { actorId: data.activeActorId, documentId: a, expected: known, next: renamed });
  };
  assert.equal(save(known).ok, true); assert.equal(save(latest).ok, false);
});

// N7 re-review 3 (11/2), the reviewer's own data: document B kept in 미분류, only its task classified into Original
// through the ordinary classification (setProgramTaskClassification). A, knowing that, finished '- /NewTitle': the
// model saw no other document's folder line or filing, renamed Original, and B's task now sat in 'NewTitle', with no
// 모든 문서에 적용 offered. Any use outside this document now keeps the rename off: W15's move and its choice.
function classifiedElsewhere() {
  const { mine, a, original } = workspaces();
  let text = M.addDocument(mine, { title: 'B' }); const b = text.documents.at(-1)!.id;
  text = M.editTextResult(text, b, '- [ ] B 할 일', { folderText: true }).state;
  const task = M.getDocument(text, b)!.lines[0].id;
  const data = createProgramData(); const actorId = data.activeActorId; data.spaces[actorId].text = text;
  const classified = setProgramTaskClassification(data, { actorId, requestId: 'n7-review-6-classify', expectedSpace: data.spaces[actorId], taskId: task, folderId: original.id });
  assert(classified.ok, 'the ordinary classification takes it');
  const known = classified.data.spaces[actorId].text;
  assert.equal(M.getDocument(known, b)!.folderId, 'folder-unfiled', 'B stays kept in 미분류');
  assert.equal(known.taskScopes[task], original.id); assert(M.validate(known));
  return { known, a, b, task, original };
}
test('N7 6: another document\'s task classified into the folder, known to A — the line moves (W15), the folder keeps its name, 모든 문서에 적용 offered', () => {
  const { known, a, b, task, original } = classifiedElsewhere();
  const e = editor(known, a, known);
  e.typeAndEnter('- /', '- /NewTitle');
  const after = e.controller.getState().working;
  assert.equal(titleOf(after, original.id), 'Original', 'not renamed');
  assert.deepEqual(e.moves, [original.id], 'W15 moved the line'); assert.deepEqual(e.kept, []);
  const moved = after.folders.find(folder => folder.title === 'NewTitle')!;
  assert(after.bindings.some(row => row.kind === 'scope' && row.docId === a && row.scopeId === moved.id));
  assert.equal(after.taskScopes[task], original.id, 'B\'s task stays in Original');
  const notice = programFolderMoveNotice(known, after, a, M.getDocument(after, a)!.lines[0].id, original.id);
  assert.equal(notice.kind, 'moved'); assert.equal(notice.tone, 'choose'); assert.equal(notice.others, 1);
  assert.match(notice.text, /^이 줄만 ‘NewTitle’.* 옮겼습니다 · 다른 문서 1곳은 ‘Original’ 그대로$/);
  const data = createProgramData(); data.spaces[data.activeActorId].text = known;
  const saved = programTextTransition(data, { actorId: data.activeActorId, documentId: a, expected: known, next: after });
  assert(saved.ok); const out = saved.data.spaces[saved.data.activeActorId].text;
  assert.equal(titleOf(out, original.id), 'Original'); assert.equal(titleOf(out, out.taskScopes[task]), 'Original');
  assert.equal(M.getDocument(out, b)!.folderId, 'folder-unfiled');
});
test('N7 6: the same without the classified task — this document alone uses it, renamed as before', () => {
  const { mine, a, original } = workspaces();
  const e = editor(mine, a, mine);
  e.typeAndEnter('- /', '- /NewTitle');
  assert.equal(titleOf(e.controller.getState().working, original.id), 'NewTitle');
});

// N7 re-review 3 (1): a folder name selected and typed over in Hangul, then a blur mid-composition. The native editor
// holds its onChange while composing, so no line was held at the blur and nothing was scheduled.
const blurSource = ts.transpileModule('const finishOnBlur = ' + (() => {
  let found = ''; const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'finishOnBlur') found = node.initializer!.getText(tree); else ts.forEachChild(node, visit); }; visit(tree); return found;
})() + ';', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
test('N7 6: typed over in Hangul and blurred mid-composition, no line held yet — finished once the composed text is in', () => {
  const { mine, a, original } = workspaces();
  const e = editor(mine, a, mine);
  e.composingRef.current = true;
  const blur = new Function('composingRef', 'finishAfterComposition', 'finishHeldFolderLine', 'finishRenamedFolderLines', blurSource + '\nreturn finishOnBlur;')(
    e.composingRef, e.finishAfterComposition, e.finish, () => {}) as () => void;
  assert.equal(e.held(), null, 'nothing held: the native onChange waits for the composition');
  e.doc.activeElement = null; blur();
  assert.equal(e.finishAfterComposition.current, true, 'scheduled at the blur');
  // compositionend: the native editor publishes the composed text (a held edit of the line), then the retry runs.
  e.composingRef.current = false;
  e.typeAndFinish({ finish: false }, '- /한글');
  assert.equal(titleOf(e.controller.getState().working, original.id), 'Original', 'the edit itself finishes nothing');
  assert.equal(e.afterComposition(), true);
  assert.equal(titleOf(e.controller.getState().working, original.id), '한글'); assert.equal(e.held(), null);
});
