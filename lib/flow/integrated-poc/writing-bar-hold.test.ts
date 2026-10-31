import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { createWritingBarHold, folderBarLine, heldTargetVerdict, writingBarLine, writingBarTarget, type WritingBarTarget } from './writing-bar';
import { planProgramRegionEdit, readProgramFolderRegions } from './folder-document-regions';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { programBarDropNotice } from './bar-indent-notice';

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
const arrow = (name: string) => (find(node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) as ts.VariableDeclaration).initializer!.getText(tree);
function evaluate<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as T;
}

test('a held press runs only on the same surface and line, with the text above unchanged and focus still there', () => {
  const area = {}, other = {}, value = '- [ ] 첫 줄\n- [ ] 둘째 줄\n셋째', target = writingBarTarget(area, value, value.indexOf('둘째') + 2);
  assert.deepEqual([target.lineIndex, target.before], [1, '- [ ] 첫 줄\n']);
  const now = (patch: Partial<Parameters<typeof heldTargetVerdict>[1]>) =>
    heldTargetVerdict(target, { surface: area, value, caret: value.indexOf('둘째') + 2, editable: true, connected: true, focusHere: true, ...patch });
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

test('S3 re-review: a range selected after the hold, or the caret moved back over the text, drops it; composition does not', () => {
  const area = {}, value = '메모 ABC', target = writingBarTarget(area, value, value.length);
  const now = (patch: Partial<Parameters<typeof heldTargetVerdict>[1]>) =>
    heldTargetVerdict(target, { surface: area, value, caret: value.length, selectionEnd: value.length, editable: true, connected: true, focusHere: true, ...patch });
  assert.equal(now({}), 'run');
  assert.equal(now({ caret: value.length - 2 }), 'cancel');                                  // Shift+Left over "BC"
  assert.equal(now({ caret: value.length - 2, selectionEnd: value.length - 2 }), 'cancel');  // ← moved back
  assert.equal(now({ value: value + 'D', caret: value.length + 1, selectionEnd: value.length + 1 }), 'run'); // forward is fine
  // Held while "가" was composing as "ㄱ": the settled text stops where composition started.
  const composing = '메모 ㄱ', start = composing.length - 1, held = writingBarTarget(area, composing, composing.length, start);
  assert.equal(held.head, '메모 ');
  const done = '메모 가';
  assert.equal(heldTargetVerdict(held, { surface: area, value: done, caret: done.length, selectionEnd: done.length, editable: true, connected: true, focusHere: true }), 'run');
  // Without that anchor the jamo-to-syllable change would look like a different text and drop it.
  assert.equal(heldTargetVerdict(writingBarTarget(area, composing, composing.length), { surface: area, value: done, caret: done.length, selectionEnd: done.length, editable: true, connected: true, focusHere: true }), 'cancel');
});

function holdHarness(options: { folder?: boolean } = {}) {
  const area = { value: '- [ ] 장보기\n- [ ] 빨래', selectionStart: 3, selectionEnd: 3, readOnly: false, isConnected: true };
  const state = { saving: true, composing: false, editable: true, active: area as unknown, frames: new Map<number, () => void>(), runs: [] as string[], clock: 0, cancelled: [] as number[],
    timers: [] as (() => void)[], messages: [] as string[] };
  let frameId = 0;
  const barHold = createWritingBarHold<WritingBarTarget>();
  const editor = () => state.editable ? { instance: {}, area } : null;
  const scope = {
    inputLockedRef: { current: false }, propsRef: { current: { readOnly: false, folderId: options.folder ? 'g' : '' } },
    composingRef: { get current() { return state.composing; } }, draftRef: { current: { getState: () => ({ saving: state.saving }) } },
    regionPortRef: { current: { activeEditor: (allowReadOnly?: boolean) => allowReadOnly || state.editable ? { instance: {}, area } : null } },
    barEditor: () => options.folder ? editor() : { instance: {}, area }, barHold, setHeldBar: () => {}, runBar: (action: string) => state.runs.push(action),
    writingBarTarget, heldTargetVerdict, barRef: { current: { contains: () => false } }, HTMLElement: class {},
    document: { get activeElement() { return state.active; } }, performance: { now: () => state.clock },
    requestAnimationFrame: (callback: () => void) => { state.frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id: number) => { state.cancelled.push(id); state.frames.delete(id); },
    barRetry: { current: null as unknown }, compositionAnchorRef: { current: null as unknown },
    holdLimit: { current: null as unknown }, setTimeout: (callback: () => void) => state.timers.push(callback), clearTimeout: () => {},
    setMessage: (text: string) => state.messages.push(text), BAR_COMPOSING_NOTICE: 'BAR_COMPOSING_NOTICE', programBarDropNotice,
  };
  const indentsNow = evaluate<(action: string | null) => boolean>(arrow('indentsNow'), scope);
  const stopBarRetry = evaluate<() => void>(fn('stopBarRetry'), scope);
  const dropHeldBar = evaluate<(why: string) => void>(fn('dropHeldBar'), { ...scope, stopBarRetry });
  const release = evaluate<() => void>(fn('releaseHeldBar'), { ...scope, stopBarRetry, dropHeldBar, indentsNow });
  const press = evaluate<(action: string) => void>(fn('pressBar'), { ...scope, stopBarRetry, releaseHeldBar: release, indentsNow });
  const frame = () => { const [id, callback] = [...state.frames][0]; state.frames.delete(id); callback(); };
  return { area, state, barHold, press, release, frame, scope };
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
  // S5: dropped with a word, never silently.
  assert.deepEqual(h.state.messages, [programBarDropNotice('task', 'moved')]);

  h = holdHarness();
  h.press('task');
  h.state.active = {};
  h.state.saving = false; h.release();
  assert.deepEqual([h.state.runs, h.barHold.held(), h.state.messages], [[], null, [programBarDropNotice('task', 'left')]]);

  // Same line, but a range selected while waiting: dropped, nothing restored.
  h = holdHarness();
  h.press('enter');
  h.area.selectionStart = 0; h.area.selectionEnd = 3;
  h.state.saving = false; h.release();
  assert.deepEqual([h.state.runs, h.barHold.held(), h.area.selectionStart, h.area.selectionEnd], [[], null, 0, 3]);

  // Held while composing: compared from where composition started, so the composed syllable passes.
  h = holdHarness();
  h.area.value = '- [ ] 장보기 ㄱ'; h.area.selectionStart = h.area.selectionEnd = h.area.value.length;
  h.scope.compositionAnchorRef.current = { area: h.area, offset: h.area.value.length - 1 };
  h.state.composing = true; h.press('enter');
  h.state.composing = false; h.area.value = '- [ ] 장보기 가';
  h.state.saving = false; h.release();
  assert.deepEqual(h.state.runs, ['enter']);
});

// N1 fix 3 (Samsung 천지인): a keyboard that keeps the word composing may never end it on its own.
test('a press held through a composition that does not end lets go after one second, with a notice and no edit', () => {
  let h = holdHarness();
  h.state.saving = false; h.state.composing = true;
  h.press('indent');
  assert.deepEqual([h.barHold.held(), h.state.timers.length], ['indent', 1]);
  h.state.timers[0]();
  assert.deepEqual([h.barHold.held(), h.state.runs, h.state.messages], [null, [], ['BAR_COMPOSING_NOTICE']]);
  // The composition ending within the second runs the press as before; the late timer then does nothing.
  h = holdHarness();
  h.state.saving = false; h.state.composing = true;
  h.press('indent');
  h.state.composing = false; h.release();
  h.state.timers[0]();
  assert.deepEqual([h.state.runs, h.state.messages], [['indent'], []]);
  // A press held only for a save sets no limit.
  h = holdHarness(); h.press('task');
  assert.deepEqual([h.barHold.held(), h.state.timers.length], ['task', 0]);
});

// S5 (real accounts): → pressed while '저장 중…' was held, and the next keystroke dropped it without a word.
test('S5: ⇤·⇥ on the body act at once during a save; other actions and a folder region still wait; a composition still holds', () => {
  let h = holdHarness();
  h.press('indent'); h.press('outdent');
  assert.deepEqual([h.state.runs, h.barHold.held(), h.state.timers.length], [['indent', 'outdent'], null, 0]);
  for (const action of ['task', 'enter', 'menu']) {
    h = holdHarness(); h.press(action);
    assert.deepEqual([h.state.runs, h.barHold.held()], [[], action], action);
  }
  // A folder region may be read-only while it saves: its indent still waits.
  h = holdHarness({ folder: true }); h.press('indent');
  assert.deepEqual([h.state.runs, h.barHold.held()], [[], 'indent']);
  // Composing (천지인): held as before, at most one, and run when the composition ends even though the save goes on.
  h = holdHarness();
  h.area.value = '- [ ] 장보기 ㄱ'; h.area.selectionStart = h.area.selectionEnd = h.area.value.length;
  h.scope.compositionAnchorRef.current = { area: h.area, offset: h.area.value.length - 1 };
  h.state.composing = true; h.press('indent'); h.press('indent'); h.press('indent');
  assert.deepEqual([h.state.runs, h.barHold.held()], [[], 'indent']);
  h.state.composing = false; h.area.value = '- [ ] 장보기 가'; h.release();
  assert.deepEqual([h.state.runs, h.barHold.held(), h.state.messages], [['indent'], null, []]);
  h.release();
  assert.deepEqual(h.state.runs, ['indent']);
  // A held ☐ still waits for the save after its composition.
  h = holdHarness();
  h.state.composing = true; h.press('task'); h.state.composing = false; h.release();
  assert.deepEqual([h.state.runs, h.barHold.held()], [[], 'task']);
});

test('folder region right after its save: the held press waits for the region to be editable, then runs once', () => {
  const h = holdHarness({ folder: true });
  h.state.editable = false;
  h.press('task');
  assert.equal(h.barHold.held(), 'task');
  h.state.saving = false;
  h.release();
  // Still read-only: not consumed, retried on the next frame.
  assert.deepEqual([h.state.runs, h.barHold.held(), h.state.frames.size], [[], 'task', 1]);
  h.state.editable = true;
  h.frame();
  assert.deepEqual([h.state.runs, h.barHold.held()], [['task'], null]);
  h.release();
  assert.deepEqual(h.state.runs, ['task']);
});

test('one retry chain per held press, capped at one second of real time; a newer press cancels the older frame', () => {
  const h = holdHarness({ folder: true });
  h.state.editable = false;
  h.press('task'); h.state.saving = false;
  h.release(); h.release();
  assert.equal(h.state.frames.size, 1);                     // a second release replaces, never adds, a frame
  h.state.clock = 400; h.frame();
  assert.deepEqual([h.barHold.held(), h.state.frames.size], ['task', 1]);
  h.state.clock = 1200; h.frame();
  assert.deepEqual([h.barHold.held(), h.state.frames.size, h.state.runs], [null, 0, []]);

  const g = holdHarness({ folder: true });
  g.state.editable = false;
  g.press('task'); g.state.saving = false; g.release();
  const [older] = [...g.state.frames.keys()];
  g.state.saving = true; g.press('indent');                 // a newer hold
  assert(g.state.cancelled.includes(older) && !g.state.frames.has(older));
  g.state.clock = 900; g.state.saving = false; g.release();
  g.state.clock = 1500; g.frame();                           // the newer hold's own clock started at 900
  assert.equal(g.barHold.held(), 'indent');
});

test('IME end order: the final insertText right after compositionend keeps the hold; later typing drops it', () => {
  const effect = find(node => ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
    && node.arguments[0].getText(tree).includes('composedJustNow'));
  const listeners = new Map<string, (event: unknown) => void>(), timers: (() => void)[] = [], messages: string[] = [];
  const root = { addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener), removeEventListener: () => {}, contains: () => true };
  const barHold = createWritingBarHold<WritingBarTarget>(), composing = { current: false }, anchor = { current: null as unknown };
  class FakeArea { selectionStart = 7; }
  evaluate<() => void>((effect as ts.CallExpression).arguments[0].getText(tree), {
    hostRef: { current: { closest: () => root } }, barHold, setHeldBar: () => {}, composingRef: composing, compositionAnchorRef: anchor,
    setMessage: (text: string) => messages.push(text), programBarDropNotice, Node: class {},
    HTMLTextAreaElement: FakeArea, setTimeout: (callback: () => void) => { timers.push(callback); return timers.length; }, clearTimeout: () => {},
  })();
  const input = (inputType: string) => listeners.get('beforeinput')!({ inputType });
  // compositionstart records where composition began; compositionend forgets it.
  const area = new FakeArea();
  listeners.get('compositionstart')!({ target: area });
  assert.deepEqual(anchor.current, { area, offset: 7 });
  barHold.press('enter', true, null);
  composing.current = true; input('insertCompositionText'); input('insertText');
  composing.current = false; listeners.get('compositionend')!({});
  assert.equal(anchor.current, null);
  input('insertText');
  assert.equal(barHold.held(), 'enter');
  timers.splice(0).forEach(callback => callback());
  input('insertText');
  assert.equal(barHold.held(), null);
  barHold.press('enter', true, null);
  input('deleteContentBackward');
  assert.equal(barHold.held(), null);
  // S5: each drop says so; leaving the editor too.
  assert.deepEqual(messages, [programBarDropNotice('enter', 'typed'), programBarDropNotice('enter', 'typed')]);
  barHold.press('task', true, null);
  listeners.get('focusout')!({ relatedTarget: null });
  assert.deepEqual([barHold.held(), messages.at(-1)], [null, programBarDropNotice('task', 'left')]);
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
  // A selection over several lines: the one-line check cannot speak for the native plan, so ← → stay off.
  const typed = `${raw}\n    - [ ] 새 하위`, from = raw.length + 1, multi = folderBarLine(writingBarLine(typed, 3, () => null), typed, 3, () => true, reason, from + 5);
  assert.deepEqual([multi.canIndent, multi.canOutdent, multi.structureLock], [false, false, '분류 보기에서는 여러 줄을 한 번에 들이거나 내어 쓸 수 없습니다. 한 줄씩 해 주세요.']);
  const single = folderBarLine(writingBarLine(typed, from + 2, () => null), typed, from + 2, () => true, reason, from + 6);
  assert.equal(single.structureLock, null);
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
  // Focus on a bar button (inside the region it follows) still counts as that region being edited.
  assert(fn('fitFolderRegion').includes(`root?.querySelector('[data-folder-region] :focus')?.closest('[data-folder-region]')`));
});

test('a retry past its second is dropped even when the line becomes ready on that frame', () => {
  const h = holdHarness({ folder: true });
  h.state.editable = false;
  h.press('task'); h.state.saving = false;
  h.release();
  h.state.clock = 1200; h.state.editable = true; h.frame();
  assert.deepEqual([h.state.runs, h.barHold.held(), h.state.frames.size], [[], null, 0]);

  const g = holdHarness({ folder: true });
  g.state.editable = false;
  g.press('task'); g.state.saving = false;
  g.release();
  g.state.clock = 600; g.state.editable = true; g.frame();
  assert.deepEqual([g.state.runs, g.barHold.held()], [['task'], null]);
});
