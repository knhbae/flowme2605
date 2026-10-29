import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { createWritingBarHold, folderBarLine, heldTargetVerdict, writingBarLine, writingBarTarget, type WritingBarTarget } from './writing-bar';
import { planProgramRegionEdit, readProgramFolderRegions } from './folder-document-regions';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// S3 review fixes: a held press runs only where it was aimed, folder regions offer only what their
// check accepts, and the folder region being edited ends above the bar. The component functions
// below are the real ones; browser and IME event order on real devices stays with S4.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(match: (node: ts.Node) => boolean) {
  const found: ts.Node[] = [];
  const visit = (node: ts.Node) => { if (match(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1);
  return found[0];
}
const fn = (name: string) => find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(tree);
function evaluate<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as T;
}

test('a held press runs only on the same surface and line, with the text above unchanged and focus still there', () => {
  const area = {}, other = {}, value = '- [ ] 첫 줄\n- [ ] 둘째 줄\n셋째', target = writingBarTarget(area, value, value.indexOf('둘째') + 2);
  assert.deepEqual([target.lineIndex, target.before], [1, '- [ ] 첫 줄\n']);
  const now = (patch: Partial<Parameters<typeof heldTargetVerdict>[1]>) =>
    heldTargetVerdict(target, { surface: area, value, caret: value.indexOf('둘째'), editable: true, connected: true, focusHere: true, ...patch });
  assert.equal(now({}), 'run');
  // Composition on that line moved the caret and added text: still the same line.
  assert.equal(now({ value: value.replace('둘째 줄', '둘째 줄을 고침'), caret: value.indexOf('둘째') + 7 }), 'run');
  assert.equal(now({ caret: value.indexOf('셋째') }), 'cancel');
  assert.equal(now({ caret: 0 }), 'cancel');
  assert.equal(now({ value: '새 줄\n' + value, caret: value.indexOf('둘째') + 5 }), 'cancel');
  assert.equal(now({ surface: other }), 'cancel');
  assert.equal(now({ focusHere: false }), 'cancel');
  assert.equal(now({ connected: false }), 'cancel');
  assert.equal(now({ editable: false }), 'wait');
  assert.equal(now({ surface: null }), 'wait');
  assert.equal(heldTargetVerdict(null, { surface: area, value, caret: 0, editable: true, connected: true, focusHere: true }), 'cancel');
});

function holdHarness(options: { folder?: boolean } = {}) {
  const area = { value: '- [ ] 장보기\n- [ ] 빨래', selectionStart: 3, readOnly: false, isConnected: true };
  const state = { saving: true, composing: false, editable: true, active: area as unknown, frames: [] as (() => void)[], runs: [] as string[] };
  const barHold = createWritingBarHold<WritingBarTarget>();
  const editor = () => state.editable ? { instance: {}, area } : null;
  const scope = {
    inputLockedRef: { current: false }, propsRef: { current: { readOnly: false, folderId: options.folder ? 'g' : '' } },
    composingRef: { get current() { return state.composing; } }, draftRef: { current: { getState: () => ({ saving: state.saving }) } },
    regionPortRef: { current: { activeEditor: (allowReadOnly?: boolean) => allowReadOnly || state.editable ? { instance: {}, area } : null } },
    barEditor: () => options.folder ? editor() : { instance: {}, area }, barHold, setHeldBar: () => {}, runBar: (action: string) => state.runs.push(action),
    writingBarTarget, heldTargetVerdict, barRef: { current: { contains: () => false } }, HTMLElement: class {},
    document: { get activeElement() { return state.active; } }, requestAnimationFrame: (callback: () => void) => { state.frames.push(callback); return state.frames.length; },
  };
  const release = evaluate<(attempt?: number) => void>(fn('releaseHeldBar'), scope);
  const press = evaluate<(action: string) => void>(fn('pressBar'), { ...scope, releaseHeldBar: release });
  return { area, state, barHold, press, release };
}

test('real press and release: a press held during a save runs on its line once; moved caret or focus drops it', () => {
  let h = holdHarness();
  h.press('enter'); h.press('enter');
  assert.deepEqual([h.barHold.held(), h.state.runs], ['enter', []]);
  h.state.saving = false; h.release();
  assert.deepEqual(h.state.runs, ['enter']);
  h.release();
  assert.deepEqual(h.state.runs, ['enter']);

  h = holdHarness();
  h.press('task');
  h.area.selectionStart = h.area.value.indexOf('빨래');
  h.state.saving = false; h.release();
  assert.deepEqual([h.state.runs, h.barHold.held()], [[], null]);

  h = holdHarness();
  h.press('indent');
  h.state.active = {};
  h.state.saving = false; h.release();
  assert.deepEqual([h.state.runs, h.barHold.held()], [[], null]);
});

test('folder region right after its save: the held press waits for the region to be editable, then runs once', () => {
  const h = holdHarness({ folder: true });
  h.state.editable = false;
  h.press('task');
  assert.equal(h.barHold.held(), 'task');
  h.state.saving = false;
  h.release();
  // Still read-only: not consumed, retried on the next frame.
  assert.deepEqual([h.state.runs, h.barHold.held(), h.state.frames.length], [[], 'task', 1]);
  h.state.editable = true;
  h.state.frames.shift()!();
  assert.deepEqual([h.state.runs, h.barHold.held()], [['task'], null]);
  h.release();
  assert.deepEqual(h.state.runs, ['task']);
});

test('IME end order: the final insertText right after compositionend keeps the hold; later typing drops it', () => {
  const effect = find(node => ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
    && node.arguments[0].getText(tree).includes('composedJustNow'));
  const listeners = new Map<string, (event: unknown) => void>(), timers: (() => void)[] = [];
  const root = { addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener), removeEventListener: () => {}, contains: () => true };
  const barHold = createWritingBarHold<WritingBarTarget>(), composing = { current: false };
  evaluate<() => void>((effect as ts.CallExpression).arguments[0].getText(tree), {
    hostRef: { current: { closest: () => root } }, barHold, setHeldBar: () => {}, composingRef: composing,
    setTimeout: (callback: () => void) => { timers.push(callback); return timers.length; }, clearTimeout: () => {},
  })();
  const input = (inputType: string) => listeners.get('beforeinput')!({ inputType });
  barHold.press('enter', true, null);
  composing.current = true; input('insertCompositionText'); input('insertText');
  composing.current = false; listeners.get('compositionend')!({});
  input('insertText');
  assert.equal(barHold.held(), 'enter');
  timers.splice(0).forEach(callback => callback());
  input('insertText');
  assert.equal(barHold.held(), null);
  barHold.press('enter', true, null);
  input('deleteContentBackward');
  assert.equal(barHold.held(), null);
});

function regionFixture() {
  let state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }, { id: 'g', title: '회사', parentId: null }],
    documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }], flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  state = M.editText(state, 'd', '- [ ] 집안일\n- 회사\n  - [ ] 견적\n    - 메모: 금요일\n    - [ ] 표 정리\n  - [ ] 회신\n- [ ] 빨래');
  const lines = M.getDocument(state, 'd')!.lines, scoped = Object.fromEntries([lines[2].id, lines[5].id].map(id => [id, 'g']));
  state = { ...state, bindings: [{ kind: 'scope', docId: 'd', lineId: lines[1].id, scopeId: 'g' }], taskScopes: { ...state.taskScopes, ...scoped }, itemScopes: { ...state.itemScopes, ...scoped } } as TextWorkspaceState;
  const view = readProgramFolderRegions(state, 'd', 'g')!;
  return { state, view };
}

test('folder region: saved lines keep ☐ ← → off with the reason; the bar never offers what the region check refuses', () => {
  const { state, view } = regionFixture(), region = view.regions[0], reason = '이유';
  const accepts = (next: string) => planProgramRegionEdit(state, view, region.key, next).ok;
  const raw = region.raw, line = folderBarLine(writingBarLine(raw, 3, () => null), raw, 3, accepts, reason);
  assert.equal(raw.split('\n')[0], '  - [ ] 견적');
  assert.deepEqual([line.canOutdent, line.canIndent, line.markerLock, line.structureLock], [false, false, reason, reason]);
  // Whatever the bar leaves on, the region check accepts; whatever it turns off, the check refuses.
  for (const [text, caret] of [[raw, 3], [raw, raw.length], [`${raw}\n    새 메모 줄`, raw.length + 6]] as const) {
    const base = writingBarLine(text, caret, () => null), result = folderBarLine(base, text, caret, accepts, reason);
    const lines = text.split('\n'), index = text.slice(0, caret).split('\n').length - 1;
    const withLine = (next: string) => [...lines.slice(0, index), next, ...lines.slice(index + 1)].join('\n');
    if (result.canIndent) assert(accepts(withLine(`  ${lines[index]}`)));
    if (result.canOutdent) assert(accepts(withLine(lines[index].replace(/^( {1,2}|\t)/, ''))));
    assert.equal(result.structureLock !== null && result.structureLock !== undefined, base.canIndent && !result.canIndent || base.canOutdent && !result.canOutdent);
  }
});

test('folder view: only the focused region is capped above the bar; the others keep their own height', () => {
  const fit = evaluate<(root: unknown, barShown: boolean, bottom: number) => void>(fn('fitFolderRegion'), {
    programEditorVisibleHeight: (top: number, bottom: number) => Math.max(64, 20 + Math.floor((Math.max(64, bottom - Math.max(0, top) - 12) - 20) / 26) * 26),
  });
  const host = (top: number) => ({ style: { maxHeight: 'old' }, getBoundingClientRect: () => ({ top }) });
  const first = host(100), second = host(700);
  const focusedRegion = { contains: (node: unknown) => node === second };
  const root = { querySelector: () => ({ closest: () => focusedRegion }), querySelectorAll: () => [first, second] };
  fit(root, true, 1000);
  assert.deepEqual([first.style.maxHeight, second.style.maxHeight], ['', '280px']);
  fit(root, false, 1000);
  assert.deepEqual([first.style.maxHeight, second.style.maxHeight], ['', '']);
  const tight = host(900); fit({ querySelector: () => ({ closest: () => ({ contains: () => true }) }), querySelectorAll: () => [tight] }, true, 1000);
  assert.equal(tight.style.maxHeight, '132px');
});
