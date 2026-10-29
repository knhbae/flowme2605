import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { planProgramRegionEdit, readProgramFolderRegions } from './folder-document-regions';
import { heldTargetVerdict, writingBarTarget } from './writing-bar';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// S1 re-review: F1 the menu's structure commands in a folder view, Q1 the delayed region menu.
// The functions run here are the component's own; DOM, focus and save ACKs are stand-ins.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function fn(name: string) {
  const found: string[] = [];
  const visit = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found.push(node.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1, name);
  return found[0];
}
function evaluate<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as T;
}
const constant = (name: string) => new RegExp(`const ${name} = '([^']+)'`).exec(source)![1];
const REGION_OUTSIDE = constant('REGION_OUTSIDE'), FOLDER_STRUCTURE_LOCK = constant('FOLDER_STRUCTURE_LOCK');

function fixture() {
  let state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }, { id: 'g', title: '회사', parentId: null }],
    documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }], flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  state = M.editText(state, 'd', '- [ ] 집안일\n- 회사\n  - [ ] 견적\n    - 메모: 금요일\n    - [ ] 표 정리\n  - [ ] 회신\n- [ ] 빨래');
  const lines = M.getDocument(state, 'd')!.lines, scoped = Object.fromEntries([lines[2].id, lines[5].id].map(id => [id, 'g']));
  return { ...state, bindings: [{ kind: 'scope', docId: 'd', lineId: lines[1].id, scopeId: 'g' }], taskScopes: { ...state.taskScopes, ...scoped }, itemScopes: { ...state.itemScopes, ...scoped } } as TextWorkspaceState;
}
const plan = (state: TextWorkspaceState) => evaluate<(lineId: string | null, outdent: boolean) => { ok: boolean; reason?: string }>(fn('regionIndentPlan'), {
  propsRef: { current: { folderId: 'g', docId: 'd' } }, readProgramFolderRegions, planProgramRegionEdit, currentState: () => state, REGION_OUTSIDE, FOLDER_STRUCTURE_LOCK });

test('F1: folder indent and outdent are judged by the region\'s own check; saved lines stay put, outside lines are refused', () => {
  const state = fixture(), lines = M.getDocument(state, 'd')!.lines, check = plan(state);
  assert.deepEqual(check(lines[2].id, false), { ok: false, reason: FOLDER_STRUCTURE_LOCK });
  assert.deepEqual(check(lines[2].id, true), { ok: false, reason: FOLDER_STRUCTURE_LOCK });
  assert.deepEqual(check(lines[0].id, false), { ok: false, reason: REGION_OUTSIDE });
  assert.deepEqual(check(null, false), { ok: false, reason: REGION_OUTSIDE });
  // Every verdict matches what the region check says, and whatever it would accept leaves the
  // lines before and after the region, with their IDs, exactly as they were.
  const view = readProgramFolderRegions(state, 'd', 'g')!, doc = M.getDocument(state, 'd')!;
  for (const region of view.regions.filter(entry => !entry.readOnly)) for (const lineId of region.lineIds) for (const outdent of [false, true]) {
    const local = region.raw.split('\n'), index = region.lineIds.indexOf(lineId), next = outdent ? local[index].replace(/^( {1,2}|\t)/, '') : `  ${local[index]}`;
    if (next === local[index]) continue;
    local[index] = next;
    const result = planProgramRegionEdit(state, readProgramFolderRegions(state, 'd', 'g')!, region.key, local.join('\n'));
    assert.equal(check(lineId, outdent).ok, result.ok);
    if (result.ok) {
      const after = M.getDocument(result.next, 'd')!;
      assert.deepEqual(after.lines.slice(0, region.startIndex), doc.lines.slice(0, region.startIndex));
      assert.deepEqual(after.lines.slice(after.lines.length - (doc.lines.length - region.endIndex)), doc.lines.slice(region.endIndex));
    }
  }
});

test('F1: the menu command uses the region editor in a folder view and the body editor only in the body', () => {
  const run = (folder: boolean, ok: boolean) => {
    const calls: string[] = [], frames: (() => void)[] = [];
    const indentFromMenu = evaluate<(outdent: boolean) => void>(fn('indentFromMenu'), {
      panel: { lineId: 'line-2' }, currentRow: () => ({ index: 2 }), propsRef: { current: { folderId: folder ? 'g' : '' } },
      regionIndentPlan: () => ok ? { ok: true } : { ok: false, reason: '이유' }, setMessage: (text: string) => calls.push(`message ${text}`),
      closePanel: () => calls.push('close'), revealAllowed: () => true, requestAnimationFrame: (callback: () => void) => { frames.push(callback); return 1; },
      regionPortRef: { current: { revealLine: (id: string) => { calls.push(`reveal ${id}`); return true; },
        activeEditor: () => ({ instance: { indent: (outdent: boolean) => calls.push(`region indent ${outdent}`) } }) } },
      editorRef: { current: { getSelection: () => ({ lineIndex: 0 }), focus: (index: number) => calls.push(`body focus ${index}`), indent: (outdent: boolean) => calls.push(`body indent ${outdent}`) } },
    });
    indentFromMenu(true);
    frames.splice(0).forEach(callback => callback());
    return calls;
  };
  assert.deepEqual(run(true, true), ['close', 'reveal line-2', 'region indent true']);
  assert.deepEqual(run(true, false), ['message 이유']);
  assert.deepEqual(run(false, true), ['close', 'body focus 2', 'body indent true']);
  // Fold and block move have no region path yet: off in a folder view, with the reason shown.
  assert.match(source, /disabled=\{!!props\.folderId\} onClick=\{\(\) => beginMove\(panel\.lineId, true\)\}>하위 묶음 이동/);
  assert.match(source, /disabled=\{!!props\.folderId\} onClick=\{\(\) => \{ closePanel\(\); editorRef\.current\?\.toggleFold\(row\.index\); \}\}>하위 내용 접기/);
  assert.match(source, /disabled=\{!!folderIndent && !folderIndent\.indent\.ok\} onClick=\{\(\) => indentFromMenu\(false\)\}/);
});

function menuHarness() {
  const area = { value: '  - [ ] 견적\n  /', selectionStart: 15, readOnly: false, isConnected: true, ownerDocument: null as unknown };
  const listeners = new Map<string, () => void>();
  area.ownerDocument = { addEventListener: (type: string, listener: () => void) => listeners.set(type, listener), removeEventListener: (type: string) => listeners.delete(type) };
  const state = { pending: true, flushOk: true, duringFlush: (() => {}) as () => void, opened: [] as number[], messages: [] as string[] };
  const controller = {}, port = {
    isComposing: () => false, hasPending: () => state.pending, activeEditor: () => ({ area }),
    flush: async () => { state.duringFlush(); state.pending = false; return state.flushOk; },
    takeSnapshot: () => ({ lineId: 'slash', regionKey: 'k' }),
  };
  const props = { current: { readOnly: false, active: true, docId: 'd', folderId: 'g' } };
  const scope = { regionPortRef: { current: port as unknown }, propsRef: props, inputLockedRef: { current: false }, checkPendingRef: { current: false },
    composingRef: { current: false }, draftRef: { current: controller as unknown }, setMessage: (text: string) => state.messages.push(text),
    requestAnimationFrame: (callback: () => void) => { callback(); return 1; }, writingBarTarget, heldTargetVerdict,
    currentDoc: () => ({ lines: [{ id: 'est' }, { id: 'slash' }] }), openCurrentInsertMenu: (index: number) => { state.opened.push(index); return true; } };
  const openRegionMenuAt = evaluate(fn('openRegionMenuAt'), scope);
  const open = evaluate<() => Promise<boolean>>(fn('openRegionInsertMenu'), { ...scope, openRegionMenuAt });
  return { area, state, props, scope, port, listeners, open };
}

test('Q1: a region menu waiting for its save opens only for the same request; newer actions drop it', async () => {
  let h = menuHarness();
  assert.equal(await h.open(), true);
  assert.deepEqual(h.state.opened, [1]);
  assert.equal(h.listeners.size, 0);

  for (const [name, interfere] of [
    ['another line chosen', (x: ReturnType<typeof menuHarness>) => { x.listeners.get('pointerdown')!(); x.area.selectionStart = 3; }],
    ['a key pressed', (x: ReturnType<typeof menuHarness>) => x.listeners.get('keydown')!()],
    ['focus left the editor', (x: ReturnType<typeof menuHarness>) => x.listeners.get('focusin')!()],
    ['typing went on', (x: ReturnType<typeof menuHarness>) => x.listeners.get('beforeinput')!()],
    ['moved to today', (x: ReturnType<typeof menuHarness>) => { x.props.current.active = false; }],
    ['another document', (x: ReturnType<typeof menuHarness>) => { x.props.current.docId = 'other'; }],
    ['caret on another line without an event', (x: ReturnType<typeof menuHarness>) => { x.area.selectionStart = 3; }],
  ] as const) {
    h = menuHarness();
    h.state.duringFlush = () => interfere(h);
    assert.equal(await h.open(), false, name);
    assert.deepEqual(h.state.opened, [], name);
    assert.equal(h.listeners.size, 0, name);
  }
  h = menuHarness(); h.state.flushOk = false;
  assert.equal(await h.open(), false);
  assert.deepEqual(h.state.opened, []);
  // No save to wait for: the menu opens at once on the caret line.
  h = menuHarness(); h.state.pending = false;
  assert.equal(await h.open(), true);
  assert.deepEqual(h.state.opened, [1]);
});

test('a deferred caret move after an insertion never takes over newer input', () => {
  const check = (active: unknown, composing = false, inside = false) => evaluate<() => boolean>(fn('revealAllowed'), {
    document: { activeElement: active }, composingRef: { current: composing },
    hostRef: { current: { closest: () => ({ contains: () => inside }) } }, HTMLElement: Object,
  })();
  const field = { matches: () => true }, button = { matches: () => false };
  assert.equal(check(button), true);
  assert.equal(check(field, false, true), true);
  assert.equal(check(field, false, false), false);
  assert.equal(check(button, true), false);
  assert.match(source, /if\(folderId\)requestAnimationFrame\(\(\)=>\{if\(revealAllowed\(\)\)regionPortRef/);
  assert.match(source, /requestAnimationFrame\(\(\)=>\{if\(lineId&&revealAllowed\(\)\)regionPortRef/);
});
