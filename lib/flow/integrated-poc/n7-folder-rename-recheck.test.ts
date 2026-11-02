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
function editor(mine: TextWorkspaceState, a: string, latest: TextWorkspaceState | undefined) {
  const owner = createProgramDocumentInput(mine, a);
  const controller = createProgramTextDraft(owner.initial, a, async () => true, () => {}, () => true, owner, true, undefined, () => latest);
  const area = { value: controller.getState().raw, selectionStart: 0, selectionEnd: 0, selectionDirection: 'none' };
  const heldFolderLineRef = { current: null as null | { id: string; left: boolean; offAtStart: boolean } }, notices: string[] = [], moves: string[] = [];
  const scope: Record<string, unknown> = { M, propsRef: { current: { docId: a, readOnly: false } }, draftRef: { current: controller }, textArea: () => area,
    heldFolderLineRef, composingRef: { current: false }, FOLDER_LINE: /^ *- \/(?!.*<!--\s*flowme-folder)/, editorRef: { current: { setValue: () => true } },
    shown: () => true, scheduleSave: () => {}, programFolderKeptText, programFolderCreatedNotice, restoredLineOffset, relinkedNotice: () => null,
    showFolderNotice: (text: string) => notices.push(text), showFolderOperation: (text: string) => notices.push(text),
    showFolderMove: (_before: unknown, _after: unknown, _line: string, fromId: string) => moves.push(fromId) };
  const finish = new Function(...Object.keys(scope), finishSource + '\nreturn finishHeldFolderLine;')(...Object.values(scope)) as (explicit?: boolean) => void;
  /** The line typed as the review did, each a held edit, then Enter on it (beforeEnter's finish). */
  const typeAndEnter = (...texts: string[]) => {
    const line = M.getDocument(controller.getState().working, a)!.lines[0].id;
    for (const text of texts) {
      const rows = controller.getState().raw.split('\n'); rows[0] = text; const value = rows.join('\n');
      assert(controller.updateRaw(value, '', { inputType: 'insertText', folderHold: [0] } as never));
      area.value = value; area.selectionStart = area.selectionEnd = text.length;
      heldFolderLineRef.current = { id: line, left: false, offAtStart: false };
    }
    finish(true);
  };
  return { controller, typeAndEnter, notices, moves };
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
  assert.match(e.notices[0], /^다른 곳에서도 쓰는 폴더라 이름을 바꾸지 않았습니다 · ‘Original’.* 두었습니다\(입력: ‘NewTitle’\)$/);
  assert.equal(e.controller.getState().invalid, false);
});

test('N7: nothing else uses Original there — the rename goes as before (D3 B)', () => {
  const { mine, a, original } = workspaces();
  const e = editor(mine, a, mine);
  e.typeAndEnter('- /', '- /NewTitle');
  assert.equal(titleOf(e.controller.getState().working, original.id), 'NewTitle');
  assert.deepEqual(e.moves, [original.id]);
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
