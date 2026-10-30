import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { planProgramRegionEdit, readProgramFolderRegions } from './folder-document-regions';
import { heldTargetVerdict, writingBarTarget } from './writing-bar';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// Folder view: ＋ and "/" open the body's insert menu, and a choice goes into the visible region
// through the region's own check. These run the real functions from the components.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8');
const editorSource = read('ProgramTextEditor.tsx'), regionSource = read('ProgramFolderRegionEditor.tsx');
function declaration(source: string, file: string, match: (node: ts.Node, tree: ts.SourceFile) => boolean) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => { if (match(node, tree)) found.push(node.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1);
  return found[0];
}
function evaluate<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.Preserve } }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as T;
}
const fn = (name: string) => declaration(editorSource, 'ProgramTextEditor.tsx', (node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
const REGION_OUTSIDE = /REGION_OUTSIDE = '([^']+)'/.exec(editorSource)![1];

function fixture() {
  let state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }, { id: 'g', title: '회사', parentId: null }],
    documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }], flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  state = M.editText(state, 'd', '- [ ] 집안일\n- 회사\n  - [ ] 견적\n    - 메모: 금요일\n    - [ ] 표 정리\n  - [ ] 회신\n- [ ] 빨래');
  const lines = M.getDocument(state, 'd')!.lines, scoped = Object.fromEntries([lines[2].id, lines[5].id].map(id => [id, 'g']));
  state = { ...state, bindings: [{ kind: 'scope', docId: 'd', lineId: lines[1].id, scopeId: 'g' }], taskScopes: { ...state.taskScopes, ...scoped }, itemScopes: { ...state.itemScopes, ...scoped } } as TextWorkspaceState;
  assert(M.validate(state));
  const view = readProgramFolderRegions(state, 'd', 'g')!;
  assert.deepEqual(view.regions.map(region => [region.startIndex, region.endIndex]), [[2, 4], [5, 6]]);
  return { state, view, raw: M.raw(M.getDocument(state, 'd')!) };
}
function regionInsertion(regionIndex: number) {
  const { state, view, raw } = fixture(), region = view.regions[regionIndex];
  const calls: string[] = [], messages: string[] = [], accepted: TextWorkspaceState[] = [];
  const port = { takeSnapshot: () => ({ view, regionKey: region.key }), hasPending: () => false,
    revealLine: (lineId: string, column: number) => { calls.push(`reveal ${lineId} ${column}`); return true; } };
  const apply = evaluate<(nextRaw: string, caret: number) => boolean>(fn('applyRegionInsertion'), {
    regionPortRef: { current: port }, currentState: () => state, propsRef: { current: { docId: 'd', folderId: 'g' } },
    planProgramRegionEdit, programRegionError: (reason: string) => `region:${reason}`, REGION_OUTSIDE, today: () => '2026-10-30', M,
    acceptRegion: (next: TextWorkspaceState, before: TextWorkspaceState) => { assert.equal(before, view.workspace); accepted.push(next); return true; },
    setMessage: (text: string) => messages.push(text), scheduleSave: () => calls.push('save'),
    requestAnimationFrame: (callback: () => void) => { callback(); return 1; }, revealAllowed: () => true,
  });
  return { state, raw, apply, calls, messages, accepted };
}

test('a menu choice that lands inside the visible region goes in through the region check, saves, and puts the caret on it', () => {
  const h = regionInsertion(0);
  // A new child scaffold right after 견적's memo: the end of region 1, as a "하위 체크" choice would put it.
  const lines = h.raw.split('\n'); lines.splice(4, 0, '    - [ ] ');
  const nextRaw = lines.join('\n'), caret = lines.slice(0, 4).join('\n').length + 1 + 10;
  assert.equal(h.apply(nextRaw, caret), true);
  assert.deepEqual(h.messages, []);
  const doc = M.getDocument(h.accepted[0], 'd')!;
  assert.equal(M.raw(doc), nextRaw);
  assert.deepEqual(h.calls, ['save', `reveal ${doc.lines[4].id} 10`]);
  // Every existing line keeps its ID.
  assert.deepEqual(doc.lines.filter((_, index) => index !== 4).map(line => line.id), M.getDocument(h.state, 'd')!.lines.map(line => line.id));
});

test('a choice that would land outside the visible region is refused, and nothing is accepted or saved', () => {
  const h = regionInsertion(0);
  // "다음 할 일" for 견적 goes after its whole block, past 표 정리, which this region does not show.
  const option = M.insertionOptions(h.state, 'd', M.getDocument(h.state, 'd')!.lines[2].id).find(entry => entry.label === '다음 할 일')!;
  const nextRaw = h.raw.slice(0, option.offset) + option.text + h.raw.slice(option.offset);
  assert.equal(h.apply(nextRaw, option.caretOffset), false);
  assert.deepEqual([h.messages, h.accepted.length, h.calls], [[REGION_OUTSIDE], 0, []]);
  const outsideAll = h.raw + '\n## 단계';
  assert.equal(h.apply(outsideAll, outsideAll.length), false);
  assert.equal(h.messages.at(-1), REGION_OUTSIDE);
});

test('＋ in a folder view saves the pending region first, then opens the menu on the caret line; a failed save opens nothing', async () => {
  const run = async (flushed: boolean, pending = true) => {
    const opened: number[] = [], messages: string[] = [];
    const area = { value: '- [ ] 가\n- [ ] 나', selectionStart: 12, readOnly: false, isConnected: true, ownerDocument: { addEventListener() {}, removeEventListener() {} } };
    const port = { isComposing: () => false, hasPending: () => pending, flush: async () => { pending = !flushed; return flushed; },
      takeSnapshot: () => ({ lineId: 'b', regionKey: 'k' }), activeEditor: () => ({ area }) };
    const scope = {
      regionPortRef: { current: port }, inputLockedRef: { current: false }, propsRef: { current: { readOnly: false, active: true, docId: 'd', folderId: 'g' } },
      checkPendingRef: { current: false }, composingRef: { current: false }, draftRef: { current: {} }, writingBarTarget, heldTargetVerdict,
      setMessage: (text: string) => messages.push(text), requestAnimationFrame: (callback: () => void) => { callback(); return 1; },
      currentDoc: () => ({ lines: [{ id: 'a' }, { id: 'b' }] }), openCurrentInsertMenu: (index: number) => { opened.push(index); return true; },
    };
    const open = evaluate<() => Promise<boolean>>(fn('openRegionInsertMenu'), { ...scope, openRegionMenuAt: evaluate(fn('openRegionMenuAt'), scope) });
    return { result: await open(), opened, messages };
  };
  assert.deepEqual(await run(true), { result: true, opened: [1], messages: [] });
  assert.deepEqual(await run(false), { result: false, opened: [], messages: [] });
  assert.deepEqual(await run(true, false), { result: true, opened: [1], messages: [] });
});

test('"/" alone on a region line opens the menu once; paste, composition, and a "/" inside text do not', async () => {
  const slash = declaration(regionSource, 'ProgramFolderRegionEditor.tsx', (node, tree) => ts.isVariableDeclaration(node) && node.name.getText(tree) === 'slash');
  const handler = slash.slice(slash.indexOf('=') + 1).trim();
  const fire = async (value: string, caret: number, event: { inputType: string; data: string | null; isComposing?: boolean }, composing = false) => {
    let opened = 0;
    const area = { value, selectionStart: caret, selectionEnd: caret };
    evaluate<(event: unknown) => void>(handler, { area, latest: { current: { onSlash: () => { opened++; }, composing: () => composing } }, queueMicrotask })(event);
    await Promise.resolve();
    return opened;
  };
  assert.equal(await fire('- [ ] 견적\n  /', 12, { inputType: 'insertText', data: '/' }), 1);
  assert.equal(await fire('/', 1, { inputType: 'insertText', data: '/' }), 1);
  assert.equal(await fire('https:/', 7, { inputType: 'insertText', data: '/' }), 0);
  assert.equal(await fire('/', 1, { inputType: 'insertFromPaste', data: null }), 0);
  assert.equal(await fire('/', 1, { inputType: 'insertText', data: '/', isComposing: true }), 0);
  assert.equal(await fire('/', 1, { inputType: 'insertText', data: '/' }, true), 0);
});

test('the toolbar ＋ and the writing bar ＋ stay usable in a folder view and route to the region menu', () => {
  assert.match(editorSource, /hidden=\{props\.directWriting && !props\.noteStatus\}[^\n]*\n\s*onClick=\{\(\) => \{ if \(props\.folderId\) \{ void openRegionInsertMenu\(\); return; \}/);
  assert.match(editorSource, /barButton\('menu', <BarIcon name="menu" \/>, '추가 메뉴', '\/', false\)/);
  assert.match(editorSource, /if \(action === 'menu'\) \{ if \(propsRef\.current\.folderId\) void openRegionInsertMenu\(\); else openCurrentInsertMenu/);
  assert.match(editorSource, /onInsertMenu=\{props\.authoringMode \? \(\) => \{ void openRegionInsertMenu\(\); \} : undefined\}/);
  // insertNative never writes the hidden body editor in a folder view.
  assert.match(fn('insertNative'), /if\(plan&&propsRef\.current\.folderId\)\{if\(applyRegionInsertion\(plan\.nextRaw,plan\.selectionAfter\.start\)\)dismissPanel\(false,false\);return;\}\s*if\(!plan\|\|!controller\.prepareRaw\(/);
});
