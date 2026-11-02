import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createProgramTextDraft } from './program-text-draft';
import { createProgramDocumentInput } from './program-document-input';
import { readFolderPickerCommand } from './folder-picker';
import { programFolderCreatedNotice, programFolderRelinkedNotice } from './folder-notice';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';

// Execute the actual host callback and its actual finish function. Calling the
// draft declaration port alone missed the restored-line Enter boundary.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean): ts.Node {
  let result: ts.Node | undefined; const visit = (node: ts.Node) => { if (predicate(node)) result = node; else ts.forEachChild(node, visit); }; visit(tree); assert(result); return result;
}
const finish = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'finishHeldFolderLine').getText(tree);
const relinked = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'relinkedNotice').getText(tree);
const property = find(node => ts.isPropertyAssignment(node) && node.name.getText(tree) === 'beforeEnter') as ts.PropertyAssignment;
function evaluate<T>(code: string, scope: Record<string, unknown>, result: string): T {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return new Function(...Object.keys(scope), js + '\nreturn ' + result)(...Object.values(scope)) as T;
}
function fixture(raw = '- /운동\n  - /식단\n끝', line = 1, held: boolean | number[] = true) {
  let text = M.addDocument(createEmptyTextWorkspace(), { title: '복원한 글' }); const docId = text.documents.at(-1)!.id;
  text = M.editTextResult(text, docId, raw, { folderText: true, folderHold: Array.isArray(held) ? held : held ? [line] : [] }).state;
  const owner = createProgramDocumentInput(text, docId), controller = createProgramTextDraft(owner.initial, docId, async () => true, () => {}, () => true, owner, true);
  const caret = raw.split('\n').slice(0, line + 1).join('\n').length;
  const area = { value: raw, selectionStart: caret, selectionEnd: caret, readOnly: false };
  const heldFolderLineRef = { current: null as null | { id: string; left: boolean; offAtStart: boolean } };
  const composingRef = { current: false }, inputLockedRef = { current: false }, draftRef = { current: controller };
  const props = { docId }, propsRef = { current: { docId, readOnly: false, active: true } }; let saves = 0;
  const notices: string[] = [], scope: Record<string, unknown> = { M, props, propsRef, controller, draftRef, textArea: () => area, heldFolderLineRef,
    composingRef, inputLockedRef, readFolderPickerCommand, programFolderCreatedNotice, programFolderRelinkedNotice, FOLDER_LINE: /^ *- \/(?!.*<!--\s*flowme-folder)/,
    showFolderOperation: (text: string) => notices.push(text), showFolderNotice: (text: string) => notices.push(text),
    scheduleSave: () => { saves++; }, editorRef: { current: { setValue: () => true } }, finishRenamedFolderLines: () => {} };
  scope.relinkedNotice = evaluate<(lineId?: string) => string | null>(relinked, scope, 'relinkedNotice');
  scope.finishHeldFolderLine = evaluate<() => void>(finish, scope, 'finishHeldFolderLine');
  const enter = evaluate<() => void>('const callback = ' + property.initializer.getText(tree), scope, 'callback');
  return { area, controller, docId, heldFolderLineRef, composingRef, inputLockedRef, draftRef, propsRef, enter, notices, saves: () => saves };
}

test('W17 restored unbound end Enter reaches actual host declaration, notice and one save without typing history', () => {
  const f = fixture(), before = f.controller.getState().working;
  assert.equal(f.heldFolderLineRef.current, null); f.enter();
  const after = f.controller.getState().working, line = M.getDocument(after, f.docId)!.lines[1];
  assert(after.bindings.some(row => row.docId === f.docId && row.lineId === line.id && row.kind === 'scope'));
  assert.equal(f.controller.getState().raw, M.raw(M.getDocument(before, f.docId))); assert.equal(f.saves(), 1); assert.equal(f.notices.length, 1);
  assert.equal(f.controller.folderOperation()?.kind, 'create');
  const raw = f.controller.getState().raw.replace('\n끝', '\n    \n끝');
  assert(f.controller.updateRaw(raw, '', { inputType: 'insertText' })); assert(f.controller.freshFolderLine(line.id), 'the native Enter blank remains owned by this exact operation');
});

for (const left of [false, true]) test('W17 another pending A owner cannot block explicit B Enter, and A stays plain: left=' + left, () => {
  const f = fixture('- /하나\n- /둘\n끝', 1, [0, 1]), before = f.controller.getState().working;
  const a = M.getDocument(before, f.docId)!.lines[0], b = M.getDocument(before, f.docId)!.lines[1];
  f.heldFolderLineRef.current = { id: a.id, left, offAtStart: false }; f.enter();
  const after = f.controller.getState().working;
  assert.deepEqual(M.getDocument(after, f.docId)!.lines[0], a);
  assert(!after.bindings.some(row => row.lineId === a.id)); assert(!after.folders.some(folder => folder.title === '하나'));
  assert(after.bindings.some(row => row.kind === 'scope' && row.lineId === b.id));
  assert.equal(f.saves(), 1); assert.equal(f.controller.folderOperation()?.kind, 'create');
});

test('W17 leaving old A may link only its pre-existing exact folder; B Enter alone declares B', () => {
  const f = fixture('- /미분류\n- /둘\n끝', 1, [0, 1]), before = f.controller.getState().working;
  const a = M.getDocument(before, f.docId)!.lines[0], b = M.getDocument(before, f.docId)!.lines[1];
  f.heldFolderLineRef.current = { id: a.id, left: false, offAtStart: false }; f.enter();
  const after = f.controller.getState().working;
  assert.deepEqual(M.getDocument(after, f.docId)!.lines[0], a);
  assert.equal(after.folders.length, before.folders.length + 1);
  assert(after.bindings.some(row => row.kind === 'scope' && row.lineId === a.id && row.scopeId === 'folder-unfiled'));
  assert(after.bindings.some(row => row.kind === 'scope' && row.lineId === b.id && after.folders.some(folder => folder.id === row.scopeId && folder.title === '둘')));
});

for (const condition of ['composition', 'range', 'middle', 'different-raw', 'different-document', 'different-controller', 'readonly', 'locked', 'inactive'] as const) {
  test(`W17 host Enter does not adopt a restored slash line during ${condition}`, () => {
    const f = fixture(), before = f.controller.getState();
    if (condition === 'composition') f.composingRef.current = true;
    if (condition === 'range') f.area.selectionStart--;
    if (condition === 'middle') f.area.selectionStart = f.area.selectionEnd = f.area.selectionEnd - 1;
    if (condition === 'different-raw') f.area.value += ' 원문 불일치';
    if (condition === 'different-document') f.propsRef.current.docId = 'another-document';
    if (condition === 'different-controller') f.draftRef.current = {} as typeof f.controller;
    if (condition === 'readonly') f.area.readOnly = true;
    if (condition === 'locked') f.inputLockedRef.current = true;
    if (condition === 'inactive') f.propsRef.current.active = false;
    f.enter(); assert.equal(f.controller.getState(), before); assert.equal(f.heldFolderLineRef.current, null); assert.equal(f.saves(), 0);
  });
}
for (const [raw, line] of [['```\n- /코드\n```', 1], ['- /https://example.invalid', 0], ['- /운동\n  - /식단', 0]] as const) test('W17 actual callback preserves fenced/URL/already-bound exclusion: ' + raw, () => {
  const f = fixture(raw, line, !raw.startsWith('- /운동')), before = f.controller.getState(); f.enter(); assert.equal(f.controller.getState(), before); assert.equal(f.saves(), 0);
});
