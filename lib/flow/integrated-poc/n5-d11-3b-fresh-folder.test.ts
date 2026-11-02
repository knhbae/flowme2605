import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as ts from 'typescript';
import { createProgramTextDraft, FOLDER_INDENT_NOTICE } from './program-text-draft';
import { createProgramDocumentInput } from './program-document-input';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M } from './text-workspace';
import { folderBarLine, taskMarkerLock, writingBarLine } from './writing-bar';
import { folderRefusalStands, indentTouchesLinkedFolder, linkedFolderLinesTextEditMoves, textEditTouchesLinkedFolderIndent } from './folder-line-hold';
import type { FolderIndentPlan } from './folder-operation';
import { programNoticeEndsAt } from './program-notice';

// N5 phone 3b (S4-V11-PHONE-RESULT, 11/2): '폰부모' then '폰부모 › 폰자식2' made at the end of a document whose earlier
// steps had left blank lines there. Back on the new child line, the bar ⇤ was off and said the D11 reason. Those
// blank lines sat under the new folder line, so D11 B saw "content under it"; and the Enter's blank, among blank lines
// just like it, got its new id at the end of them, so it was not taken for the automatic blank. Neither is content.
const native = createRequire(import.meta.url)('./text-input-plan.cjs') as { planIndent: (...args: unknown[]) => Omit<FolderIndentPlan, 'selectionBefore'> | null };
type Draft = ReturnType<typeof createProgramTextDraft>;
type Phone = { draft: Draft; docId: string; owner: ReturnType<typeof createProgramDocumentInput>; notice: { current: { operationId?: number } | null };
  /** The editor's notice state (the notice clock renders it into `notice`), its due time, and the clock's time. */
  state: { current: unknown }; due: { current: unknown }; time: { now: number } };
function phone(raw: string): Phone {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: 'v11 폴더' }); const docId = state.documents.at(-1)!.id;
  state = M.editTextResult(state, docId, raw, { folderText: true }).state;
  const owner = createProgramDocumentInput(state, docId);
  return { draft: createProgramTextDraft(owner.initial, docId, async () => true, () => {}, () => true, owner, true), docId, owner, notice: { current: null },
    state: { current: null }, due: { current: null }, time: { now: 0 } };
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
${declared('freshNoticeHolds')}
${declared('syncFreshNotice')}
${declared('endFolderNoticeIfOver')}
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
  const propsRef = { current: { docId: t.docId, active: true, readOnly: false, folderId: undefined as string | undefined, validateWorkspace: () => true } };
  // The editor's host: laid out while its document is the one shown (another document, a folder view or another screen hides it).
  const host = { shown: true, getClientRects() { return this.shown ? [{}] : []; } };
  let fresh = false; // the editor's freshHeld state
  const scope = { barEditor: () => ({ instance: {}, area }), textArea: () => area, textarea: area, propsRef, props: propsRef.current, regionPortRef: { current: null }, hostRef: { current: host },
    currentState: () => t.draft.getState().working, draftRef: { current: t.draft }, controller: t.draft, documentInputRef: { current: t.owner },
    folderNoticeRef: t.notice, alive: true, composingRef: { current: false }, inputLockedRef: { current: false }, indentDisabled: () => false,
    folderIndentSkipped: { current: false }, indentRefusal: { current: null }, folderRefusal: { current: null }, setMessage, today: () => '2026-11-02',
    compositionGeneration: { current: 0 }, undoFolderMove: () => false, explainRawFolderUndo: () => {}, heldInput: () => undefined, accessFor: () => undefined,
    currentDoc: () => M.getDocument(t.draft.getState().working, t.docId), programTextProtectionMessage: () => 'PROTECTED',
    textEditorRows, writingBarLine, taskMarkerLock, folderBarLine, indentTouchesLinkedFolder, textEditTouchesLinkedFolderIndent, linkedFolderLinesTextEditMoves, folderRefusalStands,
    FOLDER_INDENT_NOTICE, FOLDER_STRUCTURE_LOCK: 'REGION', M, folderNoticeDue: t.due, Date: { now: () => t.time.now },
    setFolderNotice: (value: unknown) => { t.state.current = typeof value === 'function' ? value(t.state.current) : value; },
    setFreshHeld: (value: boolean | ((previous: boolean) => boolean)) => { fresh = typeof value === 'function' ? value(fresh) : value; } };
  const run = new Function(...Object.keys(scope), pressSource
    + '\nreturn { readBarLine, currentIndentAction, applyFreshIndent, adjustIndentPlan, canApplyIndent, onIndentStart, onIndentEnd, preventLockedInput, freshNoticeHolds, syncFreshNotice };')(...Object.values(scope));
  /** Touch the end of line `index` (the caret lands there; the bar reads it), or `column` in it. */
  const touch = (index: number, column?: number) => {
    area.value = t.draft.getState().raw;
    area.selectionStart = area.selectionEnd = column === undefined ? rows(t).slice(0, index + 1).join('\n').length : rows(t).slice(0, index).join('\n').length + (index ? 1 : 0) + column;
    return run.readBarLine() as { canOutdent: boolean; structureLock?: string };
  };
  return { messages, touch, shown: () => shown, freshHolds: () => run.freshNoticeHolds() as boolean, view: { props: propsRef.current, host },
    /** syncFreshNotice, as rememberPosition, the sync effect and the host's observer run it; and the state it sets. */
    sync: () => { run.syncFreshNotice(); }, held: () => fresh,
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
      t.notice.current = { operationId: t.draft.folderOperation()!.id }; t.state.current = t.notice.current; return true;
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
// Re-review P2 (11/2): a join at the fresh child's start was remembered with the line above it too (the new parent,
// still linked), so its reason stayed after the child moved. Only the line the stop protects is remembered now.
for (const [name, line, column, inputType] of [['⌫ at the fresh child line\'s start', 3, 0, 'deleteContentBackward'],
  ['Delete at the end of the new parent line', 2, undefined, 'deleteContentForward']] as const) test(`N5 3b re-review: ${name} is stopped; the child then moves and that reason goes`, () => {
  const { t, bar } = oldAndNew(), raw = t.draft.getState().raw;
  bar.touch(line, column); assert.equal(bar.key(inputType), true); assert.equal(bar.shown(), FOLDER_INDENT_NOTICE); assert.equal(t.draft.getState().raw, raw);
  bar.touch(3); assert(bar.outdent()); assert.equal(folderOf(t, '새자식').parentId, null);
  assert.equal(bar.shown(), '', 'the stop was about the child only');
  assert.equal(folderOf(t, '새부모').parentId, null);
});
test('N5 3b re-review: the stop remembers only the folder line it protects', () => {
  const { t } = oldAndNew(), working = t.draft.getState().working, lines = M.getDocument(working, t.docId)!.lines, raw = t.draft.getState().raw;
  const childStart = raw.split('\n').slice(0, 3).join('\n').length + 1;
  assert.deepEqual(linkedFolderLinesTextEditMoves(working, t.docId, childStart - 1, childStart, ''), [lines[3].id], '⌫ joining the child to the parent');
  assert.deepEqual(linkedFolderLinesTextEditMoves(working, t.docId, childStart + 1, childStart + 1, ' '), [lines[3].id], 'a space in its spaces');
  assert.deepEqual(linkedFolderLinesTextEditMoves(working, t.docId, childStart + 5, childStart + 5, 'x'), [], 'its name is not that');
});
test('N5 3b review: a reason whose folder line was emptied since no longer stands; one with any linked line among them does', () => {
  const { t } = oldAndNew(), working = t.draft.getState().working, lines = M.getDocument(working, t.docId)!.lines;
  assert.equal(folderRefusalStands(working, { docId: t.docId, lineIds: [lines[1].id, lines[4].id] }, lines[3].id), true);
  assert.equal(folderRefusalStands(working, { docId: t.docId, lineIds: [lines[3].id, lines[4].id] }, lines[3].id), false);
  assert.equal(folderRefusalStands(working, { docId: t.docId, lineIds: ['gone', lines[4].id] }, lines[3].id), false);
  assert.equal(folderRefusalStands(working, null, lines[3].id), true, 'no record: it stays');
});

// N5 3b phone 2 (S4-V13-PHONE-RESULT, 11/2 13:05): the same path passed synthetic QA but not on the phone. There the
// child line was touched again after its creation notice had gone (an info notice lasts 6s), and D11 B lives only
// while that notice shows. Here the editor's own notice clock runs on a virtual clock: syncFreshNotice's
// freshNoticeHolds, the effect that restarts a released hold, and the notice's life effect, each re-run when its
// inputs change, as React runs them.
const effectOf = (deps: string) => (nodeOf(node => ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
  && node.arguments[1]?.getText(tree) === deps) as ts.CallExpression).arguments[0].getText(tree);
const clockSource = ts.transpileModule(`const restartFolderNotice = (${valueOf('restartFolderNotice')});
const release = (${effectOf('[freshHeld]')});
const life = (${effectOf('[folderNotice, noticeHeld, folderWaiting, freshHeld]')});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
type Clock = { show(): void; at(index: number, column?: number, between?: () => void): { canOutdent: boolean }; edit(): void; sync(): void;
  wait(ms: number): void; lag(ms: number): void; shown(): boolean };
function clockFor(t: Phone, bar: ReturnType<typeof editorFor>): Clock {
  return new Function('t', 'bar', 'programNoticeEndsAt', `
    let timer = null, folderNotice = null, freshHeld = false, seen = {}, cleanup;
    const noticeHeld = false, folderWaiting = false, draftRef = { current: t.draft }, freshHeldRef = { current: false };
    const folderNoticeRef = t.notice, folderNoticeDue = t.due, folderNoticeRestarting = { current: null };
    const Date = { now: () => t.time.now }, window = { setTimeout: (run, ms) => (timer = { run, at: t.time.now + ms }), clearTimeout: id => { if (timer === id) timer = null; } };
    const setFolderNotice = value => { t.state.current = typeof value === 'function' ? value(t.state.current) : value; };
    ${clockSource}
    // Each round is a render (the state becomes what the editor reads), then the effects whose inputs changed, in
    // the editor's order. A restart queued by one lands in the next render; between() is an event landing first.
    function settle(between) {
      for (let round = 0; round < 8; round++) {
        const next = t.state.current, held = bar.held(), fresh = held !== seen.fresh, notice = next !== seen.notice;
        if (!fresh && !notice) return;
        folderNotice = next; t.notice.current = next; freshHeld = held; seen = { fresh: held, notice: next };
        if (fresh) release();
        if (cleanup) cleanup(); cleanup = life();
        if (notice) bar.sync();
        if (round === 0 && between) between();
      }
      throw new Error('the notice clock did not settle');
    }
    return {
      show() { setFolderNotice({ text: 'notice', tone: 'info', shownAt: t.time.now, leftBlockAt: null, operationId: t.draft.folderOperation().id }); settle(); },
      at(index, column, between) { bar.touch(index, column); bar.sync(); settle(between); return bar.touch(index, column); },
      edit() { bar.sync(); settle(); },
      sync() { bar.sync(); settle(); },
      wait(ms) { const end = t.time.now + ms; while (timer && timer.at <= end) { t.time.now = timer.at; const run = timer.run; timer = null; run(); settle(); } t.time.now = end; },
      lag(ms) { t.time.now += ms; },
      shown: () => !!t.state.current,
    };`)(t, bar, programNoticeEndsAt) as Clock;
}
/** A new parent, then its new child, each with its notice; the caret where the child's Enter left it. */
function madeSlowly(head: string) {
  const t = phone(head), bar = editorFor(t), clock = clockFor(t, bar), at = rows(t).length - 1;
  make(t, at, '- /새부모'); clock.show(); make(t, at + 1, '  - /새자식'); clock.show(); clock.at(at + 2);
  return { t, bar, clock, child: at + 1 };
}

test('N5 3b phone 2: the v13 phone path — touched again after 7s, by way of the blank below, the child still moves with ⇤; 되돌리기 restores it', () => {
  const t = phone('키보드 아래 마지막 줄 확인 26\n- /운동\n  - /폰새폴더'), bar = editorFor(t), clock = clockFor(t, bar);
  // Enter at the end of 폰새폴더, the new line's spaces taken away; '- /새부모' Enter, '- /새자식' Enter.
  enter(t, 2); write(t, [...rows(t).slice(0, 3), '']);
  make(t, 3, '- /새부모'); clock.show(); make(t, 4, '  - /새자식'); clock.show(); clock.at(5);
  assert.deepEqual(rows(t).slice(1), ['- /운동', '  - /폰새폴더', '- /새부모', '  - /새자식', '    ']);
  clock.wait(7000); assert(clock.shown(), 'the caret is under the new line and nothing was edited: the notice stays');
  clock.at(5); assert.equal(clock.at(4).canOutdent, true, 'back at the end of the child line, ⇤ is on');
  const before = t.draft.getState().working, beforeIds = ids(t);
  assert(bar.outdent());
  assert.deepEqual(rows(t).slice(1), ['- /운동', '  - /폰새폴더', '- /새부모', '- /새자식', '  ']);
  assert.equal(folderOf(t, '새자식').parentId, null); assert.deepEqual(ids(t), beforeIds); assert.deepEqual(bar.messages, []);
  assert(t.draft.undoFolderOperation(t.draft.folderOperation()!.id).ok);
  assert.deepEqual(t.draft.getState().working, before, '되돌리기 restores the exact text, IDs and parent');
});

test('N5 3b phone 2: the caret off the new folder starts its notice\'s 6s; back in time it stays, after them D11 B has ended', () => {
  const { t, bar, clock, child } = madeSlowly('메모\n');
  clock.at(0); clock.wait(5000); assert(clock.shown());
  assert.equal(clock.at(child).canOutdent, true); clock.wait(30000); assert(clock.shown(), 'on its line again, it stays');
  clock.at(0); clock.wait(5999); assert(clock.shown()); clock.wait(1); assert.equal(clock.shown(), false, '6s after the caret left, as a choice');
  const raw = t.draft.getState().raw;
  assert.equal(clock.at(child).canOutdent, false); assert.equal(bar.outdent(), false);
  assert.equal(t.draft.getState().raw, raw); assert.deepEqual(bar.messages, [FOLDER_INDENT_NOTICE], 'the spec: no notice, no D11 B');
});

test('N5 3b phone 2: a letter typed under the new folder ends the hold: D11 B is off and the notice goes 6s after the edit', () => {
  const { t, clock, child } = madeSlowly('메모\n');
  clock.wait(10000); assert(clock.shown());
  write(t, [...rows(t).slice(0, child + 1), '    메모']); clock.edit();
  assert.equal(clock.at(child).canOutdent, false);
  clock.wait(5999); assert(clock.shown()); clock.wait(1); assert.equal(clock.shown(), false);
});

test('N5 3b phone 2: only a new folder\'s notice is held; its move notice ends 6s after it shows, and typing under a new parent ends its hold', () => {
  const { bar, clock, child } = madeSlowly('메모\n');
  assert.equal(clock.at(child).canOutdent, true); assert(bar.outdent()); clock.show(); clock.at(child);
  clock.wait(5999); assert(clock.shown()); clock.wait(1); assert.equal(clock.shown(), false, 'the move notice, caret still on the line');
  const p = phone('메모\n'), pc = clockFor(p, editorFor(p));
  make(p, 1, '- /새부모'); pc.show(); pc.at(2); pc.wait(5999); assert(pc.shown(), 'the caret under the new parent: held');
  write(p, [...rows(p).slice(0, 2), '  - /새자']); pc.edit(); pc.wait(5999); assert(pc.shown()); pc.wait(1);
  assert.equal(pc.shown(), false, 'typing under it ends the hold; its 6s run from there');
});

// Review P2 (11/2): the hold looked only at the caret, so a retained editor hidden behind another document, a
// folder view or another screen kept its notice — and its ⇤ — for as long as the person stayed away. Leaving
// starts the notice's 6s; once they have run, coming back finds no notice and the ⇤ refused, as the spec says.
type View = { props: { active: boolean; folderId: string | undefined }; host: { shown: boolean } };
const leaving: [string, (view: View) => void, (view: View) => void][] = [
  ['a folder view of this document', view => { view.props.folderId = 'folder-x'; view.host.shown = false; }, view => { view.props.folderId = undefined; view.host.shown = true; }],
  ['another document (this editor retained, hidden)', view => { view.props.active = false; view.host.shown = false; }, view => { view.props.active = true; view.host.shown = true; }],
  ['the 오늘 screen (the space hidden, this editor still its document)', view => { view.host.shown = false; }, view => { view.host.shown = true; }],
];
for (const [name, away, back] of leaving) {
  test(`N5 3b phone 2 review: ${name} for 6s — the notice goes, and back on the child line ⇤ is refused; nothing comes back`, () => {
    const { t, bar, clock, child } = madeSlowly('메모\n');
    clock.wait(10000); assert(clock.shown(), 'held while shown');
    away(bar.view); clock.sync(); clock.wait(5999); assert(clock.shown()); clock.wait(1); assert.equal(clock.shown(), false);
    back(bar.view); clock.sync();
    const raw = t.draft.getState().raw, parent = folderOf(t, '새부모').id;
    assert.equal(clock.at(child).canOutdent, false); assert.equal(bar.outdent(), false);
    assert.equal(t.draft.getState().raw, raw); assert.equal(folderOf(t, '새자식').parentId, parent);
    assert.deepEqual(bar.messages, [FOLDER_INDENT_NOTICE]);
    clock.wait(60000); assert.equal(clock.shown(), false, 'no notice comes back');
    assert.equal(bar.freshHolds(), false);
  });
  test(`N5 3b phone 2 review: ${name} for less than 6s — back in time, the notice and its ⇤ are still there`, () => {
    const { t, bar, clock, child } = madeSlowly('메모\n');
    away(bar.view); clock.sync(); clock.wait(4000); back(bar.view); clock.sync(); assert(clock.shown());
    clock.wait(20000); assert(clock.shown(), 'shown again with the caret under it: held');
    assert.equal(clock.at(child).canOutdent, true); assert(bar.outdent()); assert.equal(folderOf(t, '새자식').parentId, null);
  });
}

test('N5 3b phone 2 review: the editor looks again when it is shown, hidden, made inactive or set on a folder', () => {
  const sync = nodeOf(node => ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
    && /syncFreshNotice\(\); syncBarLine\(\);/.test(node.arguments[0].getText(tree))) as ts.CallExpression;
  assert.deepEqual(sync.arguments[1].getText(tree).slice(1, -1).split(', '), ['folderNotice', 'draft.working', 'props.authoringMode', 'props.active', 'props.folderId']);
  const resize = nodeOf(node => ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
    && /new ResizeObserver\(\(\) => syncFreshNotice\(\)\); observer\.observe\(host\);/.test(node.arguments[0].getText(tree))) as ts.CallExpression;
  assert.match(resize.arguments[0].getText(tree), /const host = hostRef\.current;/);
});

// Review P2 (2, 11/2): a timer can run late (a hidden tab, a phone in the background). Away past its 6s with the
// timer not yet run, coming back held the notice again, cleared that timer and set none: the notice and its ⇤ stayed
// for good. Now a return and a ⇤ read the due time themselves; past it, the notice ends there and the ⇤ is refused.
for (const [name, away, back] of leaving) {
  test(`N5 3b phone 2 review 2: ${name}, its timer late — back after 7s, the notice ends there, ⇤ is refused; 60s on, nothing comes back`, () => {
    const { t, bar, clock, child } = madeSlowly('메모\n');
    clock.wait(10000); assert(clock.shown());
    away(bar.view); clock.sync(); clock.lag(7000); assert(clock.shown(), 'its timer has not run yet');
    back(bar.view); clock.sync(); assert.equal(clock.shown(), false, 'back past its time: it ends there, not held again');
    const raw = t.draft.getState().raw, parent = folderOf(t, '새부모').id;
    assert.equal(clock.at(child).canOutdent, false); assert.equal(bar.outdent(), false);
    assert.equal(t.draft.getState().raw, raw); assert.equal(folderOf(t, '새자식').parentId, parent); assert.deepEqual(bar.messages, [FOLDER_INDENT_NOTICE]);
    clock.wait(60000); assert.equal(clock.shown(), false, 'no notice comes back'); assert.equal(bar.held(), false);
  });
}
test('N5 3b phone 2 review 2: a ⇤ with nothing looked at since (the timer late, no return check) reads the time itself: refused, and the notice ends', () => {
  const { t, bar, clock, child } = madeSlowly('메모\n');
  bar.view.host.shown = false; clock.sync(); clock.lag(7000); bar.view.host.shown = true;
  const raw = t.draft.getState().raw;
  bar.touch(child); assert.equal(bar.outdent(), false);
  assert.equal(t.draft.getState().raw, raw); assert.equal(folderOf(t, '새자식').parentId, folderOf(t, '새부모').id);
  assert.deepEqual(bar.messages, [FOLDER_INDENT_NOTICE]); assert.equal(t.state.current, null, 'the notice ended with the ⇤');
  assert.equal(t.draft.folderOperation(), null);
});
test('N5 3b phone 2 review 2: the caret away past the 6s with the timer late — back on the child line, the notice ends and ⇤ is off', () => {
  const { bar, clock, child } = madeSlowly('메모\n');
  clock.at(0); clock.lag(7000); assert(clock.shown());
  assert.equal(clock.at(child).canOutdent, false); assert.equal(clock.shown(), false); assert.equal(bar.outdent(), false);
});
test('N5 3b phone 2 review 2: back within the 6s while the timer is late — still its time: shown, held, and ⇤ moves it', () => {
  const { t, bar, clock, child } = madeSlowly('메모\n');
  bar.view.host.shown = false; clock.sync(); clock.lag(4000); bar.view.host.shown = true; clock.sync();
  assert(clock.shown()); assert.equal(bar.held(), true); clock.lag(30000); assert(clock.shown());
  assert.equal(clock.at(child).canOutdent, true); assert(bar.outdent()); assert.equal(folderOf(t, '새자식').parentId, null);
});
test('N5 3b phone 2 review 2: a tap back landing before the restarted notice renders keeps it — the old shown time is no due time', () => {
  const { t, bar, clock, child } = madeSlowly('메모\n');
  clock.wait(30000); assert(clock.shown());
  // The caret leaves after 30s held; the restart (its 6s from now) is queued, and the tap back lands before it renders.
  clock.at(0, undefined, () => { bar.touch(child); bar.sync(); });
  assert(clock.shown()); assert.equal(bar.held(), true);
  assert.equal(clock.at(child).canOutdent, true); assert(bar.outdent()); assert.equal(folderOf(t, '새자식').parentId, null);
});
