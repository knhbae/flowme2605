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
const finishSource = ts.transpileModule(find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'finishHeldFolderLine'),
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
  const area = { value: controller.getState().raw, selectionStart: 0, selectionEnd: 0, selectionDirection: 'none' };
  const heldFolderLineRef = { current: null as null | { id: string; left: boolean; offAtStart: boolean } }, notices: string[] = [], moves: string[] = [];
  const kept: { title: string; raw: string }[] = [];
  const scope: Record<string, unknown> = { M, propsRef: { current: { docId: a, readOnly: false, onKeepRefusedInput: box ? (draft: { title: string; raw: string }) => { kept.push(draft); return keeps; } : undefined } }, draftRef: { current: controller }, textArea: () => area,
    heldFolderLineRef, composingRef: { current: false }, FOLDER_LINE: /^ *- \/(?!.*<!--\s*flowme-folder)/, editorRef: { current: { setValue: () => true } },
    shown: () => true, scheduleSave: () => {}, programFolderKeptText, programFolderCreatedNotice, restoredLineOffset, relinkedNotice: () => null,
    showFolderNotice: (text: string) => notices.push(text), showFolderOperation: (text: string) => notices.push(text),
    showFolderMove: (_before: unknown, _after: unknown, _line: string, fromId: string) => moves.push(fromId) };
  const finish = new Function(...Object.keys(scope), finishSource + '\nreturn finishHeldFolderLine;')(...Object.values(scope)) as (explicit?: boolean) => void;
  /** The line typed as the review did, each a held edit, then its finish: Enter on it (beforeEnter's), or, with
   *  explicit false, the caret leaving it; offAtStart, a line already off its folder's name before these edits. */
  const typeAndFinish = (options: { explicit?: boolean; offAtStart?: boolean }, ...texts: string[]) => {
    const line = M.getDocument(controller.getState().working, a)!.lines[0].id;
    for (const text of texts) {
      const rows = controller.getState().raw.split('\n'); rows[0] = text; const value = rows.join('\n');
      assert(controller.updateRaw(value, '', { inputType: 'insertText', folderHold: [0] } as never));
      area.value = value; area.selectionStart = area.selectionEnd = text.length;
      heldFolderLineRef.current = { id: line, left: false, offAtStart: options.offAtStart ?? false };
    }
    finish(options.explicit ?? true);
  };
  const typeAndEnter = (...texts: string[]) => typeAndFinish({}, ...texts);
  return { controller, typeAndEnter, typeAndFinish, notices, moves, kept, held: () => heldFolderLineRef.current, area };
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
