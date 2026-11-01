import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as ts from 'typescript';
import { createProgramTextDraft, FOLDER_INDENT_NOTICE } from './program-text-draft';
import { createProgramDocumentInput } from './program-document-input';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M } from './text-workspace';
import { folderBarLine, taskMarkerLock, writingBarLine } from './writing-bar';
import { folderRefusalStands, indentTouchesLinkedFolder, textEditTouchesLinkedFolderIndent } from './folder-line-hold';
import type { FolderIndentPlan } from './folder-operation';

// N5 phone 3b (S4-V11-PHONE-RESULT, 11/2): '폰부모' then '폰부모 › 폰자식2' made at the end of a document whose earlier
// steps had left blank lines there. Back on the new child line, the bar ⇤ was off and said the D11 reason. Those
// blank lines sat under the new folder line, so D11 B saw "content under it"; and the Enter's blank, among blank lines
// just like it, got its new id at the end of them, so it was not taken for the automatic blank. Neither is content.
const native = createRequire(import.meta.url)('./text-input-plan.cjs') as { planIndent: (...args: unknown[]) => Omit<FolderIndentPlan, 'selectionBefore'> | null };
type Draft = ReturnType<typeof createProgramTextDraft>;
type Phone = { draft: Draft; docId: string; owner: ReturnType<typeof createProgramDocumentInput>; notice: { current: { operationId?: number } | null } };
function phone(raw: string): Phone {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: 'v11 폴더' }); const docId = state.documents.at(-1)!.id;
  state = M.editTextResult(state, docId, raw, { folderText: true }).state;
  const owner = createProgramDocumentInput(state, docId);
  return { draft: createProgramTextDraft(owner.initial, docId, async () => true, () => {}, () => true, owner, true), docId, owner, notice: { current: null } };
}
const rows = (t: Phone) => t.draft.getState().raw.split('\n');
function write(t: Phone, next: string[], extra: object = {}) { assert(t.draft.updateRaw(next.join('\n'), '', { inputType: 'insertText', ...extra } as never), 'typed'); }
/** Enter at the end of line `index`, as the editor runs it: beforeEnter notes the folder line, then the new line. */
function enter(t: Phone, index: number) {
  const head = M.getDocument(t.draft.getState().working, t.docId)!.lines[index]; t.draft.noteFolderEnter(head.id);
  const next = rows(t); next.splice(index + 1, 0, /^ */.exec(head.text)![0] + '  '); write(t, next);
}
/** '- /name' typed on line `index` (held while typed), then Enter: the folder is made with its notice, then the Enter's line. */
function make(t: Phone, index: number, text: string) {
  const next = rows(t); next[index] = text; write(t, next, { folderHold: [index] });
  assert(t.draft.declareFolderLine(index, false, true), 'made');
  t.notice.current = { operationId: t.draft.folderOperation()!.id };
  enter(t, index);
}

// The editor's own code: the bar's ⇤ state and the ⇤ press path (adjustIndentPlan → canApplyIndent → onIndentStart →
// onChange's currentIndentAction → applyFreshFolderIndent), run against the real draft and the vendor's native plan.
const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramTextEditor.tsx', editor, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodeOf(match: (node: ts.Node) => boolean) {
  const found: ts.Node[] = []; const visit = (node: ts.Node) => { if (match(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(tree); assert.equal(found.length, 1); return found[0];
}
const named = (name: string) => (node: ts.Node) => (ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node)) && ts.isIdentifier(node.name) && node.name.text === name;
const valueOf = (name: string) => ((nodeOf(named(name)) as ts.PropertyAssignment | ts.VariableDeclaration).initializer!).getText(tree);
const declared = (name: string) => nodeOf(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(tree);
const pressSource = ts.transpileModule(`${declared('readBarLine')}
${declared('refuseFolderIndent')}
let indentCandidate = null, indentAction = null;
const currentIndentAction = (${valueOf('currentIndentAction')});
const applyFreshIndent = (${valueOf('applyFreshIndent')});
const adjustIndentPlan = (${valueOf('adjustIndentPlan')});
const canApplyIndent = (${valueOf('canApplyIndent')});
const onIndentStart = (${valueOf('onIndentStart')});
const onIndentEnd = (${valueOf('onIndentEnd')});
const preventLockedInput = (${valueOf('preventLockedInput')});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function editorFor(t: Phone) {
  // The editor's message: what was set, and what shows now (a setter function sees the current one).
  const messages: string[] = [], area = { value: '', selectionStart: 0, selectionEnd: 0 }; let shown = '';
  const setMessage = (value: string | ((current: string) => string)) => { shown = typeof value === 'function' ? value(shown) : value; if (typeof value === 'string') messages.push(value); };
  const propsRef = { current: { docId: t.docId, active: true, readOnly: false, folderId: undefined, validateWorkspace: () => true } };
  const scope = { barEditor: () => ({ instance: {}, area }), textArea: () => area, textarea: area, propsRef, props: propsRef.current, regionPortRef: { current: null },
    currentState: () => t.draft.getState().working, draftRef: { current: t.draft }, controller: t.draft, documentInputRef: { current: t.owner },
    folderNoticeRef: t.notice, alive: true, composingRef: { current: false }, inputLockedRef: { current: false }, indentDisabled: () => false,
    folderIndentSkipped: { current: false }, indentRefusal: { current: null }, folderRefusal: { current: null }, setMessage, today: () => '2026-11-02',
    compositionGeneration: { current: 0 }, undoFolderMove: () => false, explainRawFolderUndo: () => {}, heldInput: () => undefined, accessFor: () => undefined,
    currentDoc: () => M.getDocument(t.draft.getState().working, t.docId), programTextProtectionMessage: () => 'PROTECTED',
    textEditorRows, writingBarLine, taskMarkerLock, folderBarLine, indentTouchesLinkedFolder, textEditTouchesLinkedFolderIndent, folderRefusalStands,
    FOLDER_INDENT_NOTICE, FOLDER_STRUCTURE_LOCK: 'REGION', M };
  const run = new Function(...Object.keys(scope), pressSource
    + '\nreturn { readBarLine, currentIndentAction, applyFreshIndent, adjustIndentPlan, canApplyIndent, onIndentStart, onIndentEnd, preventLockedInput };')(...Object.values(scope));
  /** Touch the end of line `index` (the caret lands there; the bar reads it), or `column` in it. */
  const touch = (index: number, column?: number) => {
    area.value = t.draft.getState().raw;
    area.selectionStart = area.selectionEnd = column === undefined ? rows(t).slice(0, index + 1).join('\n').length : rows(t).slice(0, index).join('\n').length + (index ? 1 : 0) + column;
    return run.readBarLine() as { canOutdent: boolean; structureLock?: string };
  };
  return { messages, touch, shown: () => shown,
    /** A key typed where `touch` left the caret, through the editor's beforeinput guard. True when the guard stopped it. */
    key(inputType: string, data: string | null = null) {
      let prevented = false;
      run.preventLockedInput({ inputType, data, preventDefault: () => { prevented = true; }, stopImmediatePropagation: () => {}, get defaultPrevented() { return prevented; } });
      return prevented;
    },
    /** The bar's ⇤ with the caret where `touch` left it, as the vendor's indent() runs it. True when it changed the text. */
    outdent() {
      const selection = { start: area.selectionStart, end: area.selectionEnd, direction: 'none' }, working = t.draft.getState().working;
      let plan = native.planIndent(area.value, selection, t.owner.paint(working) ?? textEditorRows(working, t.docId), true, [], null, 0) as FolderIndentPlan | null;
      if (!plan) return false;
      const adjusted = run.adjustIndentPlan({ ...plan, selectionBefore: { ...selection } }); if (adjusted) plan = adjusted;
      if (run.canApplyIndent(plan!.nextRaw, { startLine: plan!.startLine, endLine: plan!.endLine }) !== true) return false;
      run.onIndentStart(plan);
      const proof = run.currentIndentAction(plan!.nextRaw); run.onIndentEnd();
      assert(proof, 'a D11 B move goes through its own proof, never as text');
      assert(run.applyFreshIndent(proof, plan!.nextRaw));
      t.notice.current = { operationId: t.draft.folderOperation()!.id }; return true;
    } };
}
const folderOf = (t: Phone, title: string) => t.draft.getState().working.folders.find(folder => folder.title === title)!;
const ids = (t: Phone) => M.getDocument(t.draft.getState().working, t.docId)!.lines.map(line => line.id);

test('N5 3b phone path: new parent, its child renamed then emptied, then 폰자식2 — the bar ⇤ moves it to the top; 되돌리기 restores it', () => {
  const t = phone('키보드 아래 마지막 줄 확인 26\n'), bar = editorFor(t);
  make(t, 1, '- /폰부모'); make(t, 2, '  - /폰다식');
  assert.deepEqual(rows(t).slice(1), ['- /폰부모', '  - /폰다식', '    ']);
  // The name fixed on its line and finished with Enter: a rename, which ends the creation notice (D11 B: the creation notice).
  write(t, [...rows(t).slice(0, 2), '  - /폰자식', ...rows(t).slice(3)]);
  assert(t.draft.moveFolderLine(2).ok); t.notice.current = { operationId: t.draft.folderOperation()!.id }; enter(t, 2);
  assert.deepEqual(rows(t).slice(1), ['- /폰부모', '  - /폰자식', '    ', '    ']);
  assert.deepEqual([bar.touch(2).canOutdent, bar.touch(2).structureLock], [false, FOLDER_INDENT_NOTICE], 'after a rename the reason shows, as the spec says');
  assert.equal(bar.outdent(), false); assert.deepEqual(bar.messages, [FOLDER_INDENT_NOTICE]); assert.equal(folderOf(t, '폰자식').parentId, folderOf(t, '폰부모').id);
  // The phone's next try: the child line emptied and joined to the parent line; its two blank lines stay below.
  write(t, [...rows(t).slice(0, 2), '  ', ...rows(t).slice(3)]); write(t, [...rows(t).slice(0, 2), ...rows(t).slice(3)]);
  enter(t, 1); make(t, 2, '  - /폰자식2');
  assert.deepEqual(rows(t).slice(1), ['- /폰부모', '  - /폰자식2', '    ', '    ', '    ']);
  const before = t.draft.getState().working, beforeIds = ids(t);
  assert.equal(bar.touch(2).canOutdent, true, 'back on the new child line, ⇤ is on');
  assert(bar.outdent());
  assert.deepEqual(rows(t).slice(1), ['- /폰부모', '- /폰자식2', '    ', '    ', '  ']);
  assert.equal(folderOf(t, '폰자식2').parentId, null); assert.equal(t.draft.getState().folderNotice, '‘폰자식2’를 최상위로 옮겼습니다');
  assert.deepEqual(ids(t), beforeIds); assert.deepEqual(bar.messages, [FOLDER_INDENT_NOTICE], 'no new refusal');
  assert.equal(bar.shown(), '', 'the earlier reason was about 폰자식, no longer a folder line: the move notice is in front');
  assert(t.draft.undoFolderOperation(t.draft.folderOperation()!.id).ok);
  assert.deepEqual(t.draft.getState().working, before, '되돌리기 restores the exact text, IDs and parent');
});

for (const [name, tail] of [['no line below', []], ['an empty line below', ['']], ['an indented blank below', ['  ']], ['a deeper blank below', ['      ']],
  ['two blank lines below', ['    ', '    ']], ['a blank, then a line out of the block', ['', '끝 메모']]] as const) test(`N5 3b: new parent and child made above ${name}: ⇤ moves the child, 되돌리기 restores it`, () => {
  const t = phone(['메모', '', ...tail].join('\n')), bar = editorFor(t);
  make(t, 1, '- /폰부모'); make(t, 2, '  - /폰자식');
  const before = t.draft.getState().working, raw = t.draft.getState().raw;
  assert.equal(bar.touch(2).canOutdent, true);
  assert.equal(bar.outdent(), true);
  assert.equal(folderOf(t, '폰자식').parentId, null);
  const expected = raw.split('\n'); expected[2] = '- /폰자식';
  assert.deepEqual(rows(t).map(line => line.trim() ? line : ''), expected.map(line => line.trim() ? line : ''), 'only the folder line moved; blank lines stay blank');
  assert(t.draft.undoFolderOperation(t.draft.folderOperation()!.id).ok);
  assert.deepEqual(t.draft.getState().working, before);
});

for (const content of ['    메모', '    - [ ] 할 일']) test(`N5 3b: a line under the new child (${content.trim()}) is content: ⇤ stays off and says why`, () => {
  const t = phone('메모\n'), bar = editorFor(t);
  make(t, 1, '- /폰부모');
  // The child typed with a line under it, then Enter at the child line's end.
  write(t, ['메모', '- /폰부모', '  - /폰자식', content], { folderHold: [2] });
  assert(t.draft.declareFolderLine(2, false, true)); t.notice.current = { operationId: t.draft.folderOperation()!.id }; enter(t, 2);
  assert.deepEqual(rows(t), ['메모', '- /폰부모', '  - /폰자식', '    ', content]);
  const raw = t.draft.getState().raw, parent = folderOf(t, '폰부모').id;
  assert.equal(bar.touch(2).canOutdent, false);
  assert.equal(bar.outdent(), false);
  assert.equal(t.draft.getState().raw, raw); assert.equal(folderOf(t, '폰자식').parentId, parent); assert.deepEqual(bar.messages, [FOLDER_INDENT_NOTICE]);
});

test('N5 3b: the Enter\'s blank among blank lines just like it is the automatic blank; the creation\'s 되돌리기 still works', () => {
  const t = phone('메모\n\n    \n    ');
  make(t, 1, '- /폰부모'); make(t, 2, '  - /폰자식');
  const head = M.getDocument(t.draft.getState().working, t.docId)!.lines[2];
  assert(t.draft.freshFolderLine(head.id));
  assert(t.draft.undoFolderOperation(t.draft.folderOperation()!.id).ok, 'the creation notice\'s 되돌리기');
  assert.equal(t.draft.getState().working.folders.some(folder => folder.title === '폰자식'), false);
});

for (const [name, edit] of [['a space on a blank below', (lines: string[]) => { lines[4] += ' '; }], ['another Enter', (lines: string[]) => { lines.splice(3, 0, '    '); }],
  ['a letter on the automatic blank', (lines: string[]) => { lines[5] = '    x'; }]] as const) test(`N5 3b: ${name} after it still ends D11 B`, () => {
  const t = phone('메모\n\n    \n    ');
  make(t, 1, '- /폰부모'); make(t, 2, '  - /폰자식');
  const next = rows(t); edit(next); write(t, next);
  assert.equal(editorFor(t).touch(2).canOutdent, false);
});

// Review P2 (11/2): the reason was taken down by its text alone, so a reason about another, still linked folder line went too.
function oldAndNew() {
  const t = phone('- /기존부모\n  - /기존자식\n'), bar = editorFor(t);
  make(t, 2, '- /새부모'); make(t, 3, '  - /새자식');
  assert.deepEqual(rows(t), ['- /기존부모', '  - /기존자식', '- /새부모', '  - /새자식', '    ']);
  return { t, bar };
}
test('N5 3b review: ⇤ refused on an existing child, then the fresh child moves: the reason about the existing child stays', () => {
  const { t, bar } = oldAndNew();
  assert.equal(bar.touch(1).canOutdent, false); assert.equal(bar.outdent(), false); assert.equal(bar.shown(), FOLDER_INDENT_NOTICE);
  assert.equal(bar.touch(3).canOutdent, true, 'no edit in between: the new child is still fresh');
  assert(bar.outdent()); assert.equal(folderOf(t, '새자식').parentId, null);
  assert.equal(bar.shown(), FOLDER_INDENT_NOTICE, '기존자식 still does not move by text');
  assert.equal(folderOf(t, '기존자식').parentId, folderOf(t, '기존부모').id);
});
test('N5 3b review: ⌫ stopped in an existing child\'s spaces, then the fresh child moves: that reason stays too', () => {
  const { t, bar } = oldAndNew();
  bar.touch(1, 2); assert.equal(bar.key('deleteContentBackward'), true); assert.equal(bar.shown(), FOLDER_INDENT_NOTICE);
  bar.touch(3); assert(bar.outdent());
  assert.equal(bar.shown(), FOLDER_INDENT_NOTICE);
});
test('N5 3b review: a reason about the moved line itself is taken down by its move', () => {
  const { t, bar } = oldAndNew();
  // A space typed before the fresh child's '- /' is stopped (it would move the folder by text) and leaves the draft as it was.
  bar.touch(3, 0); assert.equal(bar.key('insertText', ' '), true); assert.equal(bar.shown(), FOLDER_INDENT_NOTICE);
  bar.touch(3); assert(bar.outdent()); assert.equal(folderOf(t, '새자식').parentId, null);
  assert.equal(bar.shown(), '');
});
test('N5 3b review: a reason whose folder line was emptied since no longer stands; one with any linked line among them does', () => {
  const { t } = oldAndNew(), working = t.draft.getState().working, lines = M.getDocument(working, t.docId)!.lines;
  assert.equal(folderRefusalStands(working, { docId: t.docId, lineIds: [lines[1].id, lines[4].id] }, lines[3].id), true);
  assert.equal(folderRefusalStands(working, { docId: t.docId, lineIds: [lines[3].id, lines[4].id] }, lines[3].id), false);
  assert.equal(folderRefusalStands(working, { docId: t.docId, lineIds: ['gone', lines[4].id] }, lines[3].id), false);
  assert.equal(folderRefusalStands(working, null, lines[3].id), true, 'no record: it stays');
});
