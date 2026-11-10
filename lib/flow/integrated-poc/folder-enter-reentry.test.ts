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
  const heldFolderLineRef = { current: null as null | { id: string; left: boolean; offAtStart: boolean; named?: boolean } };
  const composingRef = { current: false }, inputLockedRef = { current: false }, draftRef = { current: controller };
  const props = { docId }, propsRef = { current: { docId, readOnly: false, active: true } }; let saves = 0;
  const offered: string[][] = [];
  const notices: string[] = [], scope: Record<string, unknown> = { M, props, propsRef, controller, draftRef, textArea: () => area, heldFolderLineRef,
    composingRef, inputLockedRef, readFolderPickerCommand, programFolderCreatedNotice, programFolderRelinkedNotice, FOLDER_LINE: /^ *- \/(?!.*<!--\s*flowme-folder)/,
    showFolderOperation: (text: string, _tone: unknown, _line: unknown, actions: unknown[] = [], undoable = true) => { notices.push(text); offered.push(undoable && !actions.length ? ['되돌리기'] : undoable ? ['…', '되돌리기'] : []); },
    showFolderNotice: (text: string) => notices.push(text),
    scheduleSave: () => { saves++; }, editorRef: { current: { setValue: () => true } }, finishRenamedFolderLines: () => {} };
  scope.relinkedNotice = evaluate<(lineId?: string) => string | null>(relinked, scope, 'relinkedNotice');
  scope.finishHeldFolderLine = evaluate<() => void>(finish, scope, 'finishHeldFolderLine');
  const enter = evaluate<() => void>('const callback = ' + property.initializer.getText(tree), scope, 'callback');
  return { area, controller, docId, heldFolderLineRef, composingRef, inputLockedRef, draftRef, propsRef, enter, notices, offered, saves: () => saves };
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

// S4 v14 phone (r_0049–0059): the new child folder's name deleted and typed back, '- /' kept, then Enter. The line kept
// its folder all along, so nothing was linked again and D11 B stayed shut. The host's own finish now links it again.
function typedBack(f: ReturnType<typeof fixture>, line: string) {
  for (const text of ['  - /', '  - /식단']) {
    const rows = f.controller.getState().raw.split('\n'); rows[1] = text; const value = rows.join('\n');
    assert(f.controller.updateRaw(value, '', { inputType: 'insertText', folderHold: [1] }));
    f.area.value = value; f.area.selectionStart = f.area.selectionEnd = rows.slice(0, 2).join('\n').length;
    // The editor's onChange marks it named: the edit changed the line's folder name.
    f.heldFolderLineRef.current = { id: line, left: false, offAtStart: false, named: true };
  }
}
test('S4 v14 phone path: a new folder\'s name deleted and typed back with "- /" kept, then Enter — announced as linked again, D11 B open', () => {
  const f = fixture(); f.enter();
  const line = M.getDocument(f.controller.getState().working, f.docId)!.lines[1].id;
  typedBack(f, line); f.notices.length = 0; f.enter();
  assert.deepEqual(f.notices, ['‘운동 › 식단’ 폴더에 다시 연결했습니다']);
  assert.equal(f.controller.folderOperation()?.kind, 'link'); assert(f.controller.freshFolderLine(line));
});
test('S4 v14 phone path: a folder made before this draft, its name typed back — nothing announced, D11 B shut', () => {
  const f = fixture('- /운동\n  - /식단\n끝', 1, false);
  const line = M.getDocument(f.controller.getState().working, f.docId)!.lines[1].id;
  typedBack(f, line); f.enter();
  assert.deepEqual(f.notices, []); assert.equal(f.controller.freshFolderLine(line), false);
});

// S4 v16 phone (11/2, r_0300–0311): 새부모 › 새자식 made, the bar's ⇤ moved it to the top, then Enter at the end of
// that line said "‘새자식’ 폴더에 다시 연결했습니다", and its 되돌리기 left '- 새자식' as plain text. ⇤ holds the line too,
// its name unchanged, so finishing it took the 'typed back' path (c582a055). Only a name edited while held does now,
// and that notice offers no 되돌리기: the line never lost its folder.
test('S4 v16 phone path: held with its name unchanged (as the bar\'s ⇤ leaves it), then Enter — not linked again, nothing said', () => {
  const f = fixture(); f.enter();
  const line = M.getDocument(f.controller.getState().working, f.docId)!.lines[1].id, operation = f.controller.folderOperation();
  f.heldFolderLineRef.current = { id: line, left: false, offAtStart: false };
  f.notices.length = 0; f.enter();
  assert.deepEqual(f.notices, []);
  assert.equal(f.controller.folderOperation()?.id, operation?.id, 'no operation made');
  assert.equal(M.getDocument(f.controller.getState().working, f.docId)!.lines[1].text, '  - /식단', 'the folder line stays a folder line');
});
test('S4 v16 phone path: a name typed back is announced with no 되돌리기', () => {
  const f = fixture(); f.enter();
  const line = M.getDocument(f.controller.getState().working, f.docId)!.lines[1].id;
  typedBack(f, line); f.notices.length = 0; f.offered.length = 0; f.enter();
  assert.deepEqual(f.notices, ['‘운동 › 식단’ 폴더에 다시 연결했습니다']);
  assert.deepEqual(f.offered, [[]]);
});
test('S4 v16 phone path: the editor marks a held line named only when an edit changed its name', () => {
  assert.match(source, /const nameOf = \(text: TextWorkspaceState\) => M\.getDocument\(text, props\.docId\)\?\.lines\.find\(row => row\.id === line\.id\)\?\.text\.replace\(\/\^ \*- \\\/\/, ''\)\.trim\(\);/);
  assert.match(source, /named: !!same\?\.named \|\| nameOf\(beforeText\) !== nameOf\(afterText\) \};/);
  assert.match(source, /if \(index >= 0 && linked && held\.named && FOLDER_LINE\.test\(lines\[index\]\.text\) && controller\.relinkFolderLine\(lines\[index\]\.id\)\)/);
  assert.match(source, /showFolderOperation\(notice, 'info', lines\[index\]\.id, \[\], false\);/);
});

// N7 (review n6-fix, 11/2): that notice lost its button but kept its operation, and ↶ (the bar's, or historyUndo) still
// undid the link: '/식단' became plain '식단', unlinked. The editor's own ↶ step (undoFolderMove) now leaves such a link
// to the text's undo, and the draft refuses to undo it for anyone else.
const undoMove = find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'undoFolderMove').getText(tree);
function undoFor(f: ReturnType<typeof fixture>, operationId: number | undefined, textAfter = false) {
  const warned: string[] = [];
  const undo = evaluate<() => boolean>(undoMove, { draftRef: f.draftRef, folderNoticeRef: { current: { operationId } }, composingRef: f.composingRef,
    inputLockedRef: f.inputLockedRef, propsRef: f.propsRef, shown: () => true, folderRawUndoRef: { current: true }, textAfterFolderStep: () => textAfter,
    showFolderNotice: (text: string) => warned.push(text), scheduleSave: () => {} }, 'undoFolderMove');
  return { undo, warned };
}
test('N7 review n6-fix: a name typed back, linked again — ↶ and historyUndo leave it to the text undo; the line stays linked', () => {
  const f = fixture(); f.enter();
  const line = M.getDocument(f.controller.getState().working, f.docId)!.lines[1].id;
  typedBack(f, line); f.enter();
  const operation = f.controller.folderOperation()!;
  assert.equal(operation.kind, 'link'); assert.equal(operation.undoable, false);
  const { undo, warned } = undoFor(f, operation.id), before = f.controller.getState();
  assert.equal(undo(), false, 'not taken: the bar\'s ↶ and historyUndo go on to the text undo');
  assert.equal(f.controller.getState(), before); assert.deepEqual(warned, []);
  assert.equal(f.controller.undoFolderOperation(operation.id).ok, false, 'the draft refuses it too');
  assert.equal(f.controller.getState(), before);
  assert.equal(M.getDocument(f.controller.getState().working, f.docId)!.lines[1].text, '  - /식단');
  assert(f.controller.getState().working.bindings.some(row => row.kind === 'scope' && row.lineId === line), 'still linked');
  assert(f.controller.freshFolderLine(line), 'D11 B still keeps to that notice');
});
test('N7 review n6-fix: a new folder\'s own ↶ (its creation) still undoes', () => {
  const f = fixture(); f.enter();
  const operation = f.controller.folderOperation()!;
  assert.equal(operation.kind, 'create'); assert.equal(operation.undoable, true);
  const { undo, warned } = undoFor(f, operation.id);
  assert.equal(undo(), true); assert.deepEqual(warned, ['폴더 동작을 되돌렸습니다'], 'its own notice, no warning');
  assert(!f.controller.getState().working.folders.some(folder => folder.title === '식단'));
});
// enter1 (11/10, 사용자 '권장대로'): the folder line's Enter now opens its first task; text written after the step goes
// back first (the text's own ↶), and the step is undone once the text is as it left it.
test('enter1: with text written after a new folder (its first task), ↶ is the text\'s first; the folder stays', () => {
  const f = fixture(); f.enter();
  const operation = f.controller.folderOperation()!, before = f.controller.getState();
  const { undo, warned } = undoFor(f, operation.id, true);
  assert.equal(undo(), false, 'left to the text undo');
  assert.equal(f.controller.getState(), before); assert.deepEqual(warned, []);
  assert(f.controller.getState().working.folders.some(folder => folder.title === '식단'), 'the folder stays');
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert(editor.includes('folderRawUndoRef.current = undoable; folderStepRawRef.current = draftRef.current?.getState().raw ?? null;'));
  assert(editor.includes('function explainRawFolderUndo() { if (folderRawUndoRef.current && !textAfterFolderStep()) {'));
});
