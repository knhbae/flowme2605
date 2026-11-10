import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { textEditorRows, textWorkspaceModel as M, type TextEditorRowMeta, type TextWorkspaceState } from './text-workspace';
import { heldTargetVerdict, writingBarTarget } from './writing-bar';

type Selection = { start: number; end: number; direction: string };
const load = createRequire(import.meta.url);
const inputPlans = load('./text-input-plan.cjs') as { planTaskMemoEnter(raw: string, selection: Selection, meta: unknown): { text: string; nextRaw: string; selectionAfter: Selection } | null };
const { resolve } = load('./text-add-settings.cjs') as { resolve(config: Record<string, unknown>): Record<string, () => boolean> };

// Run the actual vendor key handler and its pure helpers with row meta from the real text model.
// insert/replaceRange are stubbed as plain text edits; this does not establish DOM, IME or browser event order.
const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
function slice(from: string, to: string) {
  const start = vendor.indexOf(from), stop = vendor.indexOf(to, start);
  assert(start > 0 && stop > start, from);
  return vendor.slice(start, stop);
}
const helpers = slice('  const DATE = ', '  function create(');
const lineHelpers = slice('    function lineAt(offset) {', '    let inputEpoch = 0;');
const keydown = slice('    function onKeydown(event) {', "\n    listen(textarea, 'input'");

function rows(raw: string, folderLine?: string): TextEditorRowMeta[] {
  let state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }, { id: 'h', title: '집안일', parentId: 'f' }],
    documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }], flows: [], bindings: [],
    taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  state = M.editText(state, 'd', raw, { progressDate: '2026-10-30' });
  if (folderLine) {
    const line = state.documents[0].lines.find(entry => entry.text === folderLine)!;
    state = { ...state, bindings: [...state.bindings, { kind: 'scope', docId: 'd', lineId: line.id, scopeId: 'h' }] };
  }
  return textEditorRows(state, 'd');
}

/** Offset of the end of line `index`. */
const end = (raw: string, index: number) => raw.split('\n').slice(0, index + 1).join('\n').length;

type Press = { v2?: boolean; shift?: boolean; composing?: boolean; consumed?: boolean; selectStart?: number; folderLine?: string; config?: Record<string, unknown> };
/** Press Enter with the caret at the end of line `line` (or a selection from selectStart to there). */
function press(raw: string, line: number, options: Press = {}) {
  const meta = rows(raw, options.folderLine), caret = end(raw, line);
  const textarea = { value: raw, readOnly: false }, selection: Selection = { start: options.selectStart ?? caret, end: caret, direction: 'none' };
  const editor = new Function('textarea', 'selection', 'imeEnterCycle', 'addSettings', 'inputPlans', 'config', 'getRowMeta', `
    let composing = false, inputRejected = false, nextTabLeaves = false, indentLease = null;
    ${helpers}
    ${lineHelpers}
    function remember() {}
    function indent() { return false; }
    function canApplyInput() { return true; }
    function insert(text) {
      textarea.value = textarea.value.slice(0, selection.start) + text + textarea.value.slice(selection.end);
      selection.start = selection.end = selection.start + text.length; return true;
    }
    function replaceRange(start, end, text, settings) {
      textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
      const after = settings && settings.selectionAfter, caret = start + text.length;
      selection.start = after ? after.start : caret; selection.end = after ? after.end : caret; return true;
    }
    ${keydown}
    return { onKeydown, compose(on) { composing = on; } };`)(
    textarea, selection, { keydown: () => !!options.consumed }, resolve({ listEnterV2: () => !!options.v2 }), inputPlans, options.config ?? {}, () => meta);
  if (options.composing) editor.compose(true);
  let prevented = false;
  editor.onKeydown({ key: 'Enter', code: 'Enter', keyCode: options.composing ? 229 : 13, shiftKey: !!options.shift, ctrlKey: false, metaKey: false,
    altKey: false, isComposing: !!options.composing, defaultPrevented: false, preventDefault: () => { prevented = true; } });
  // Outside composition the browser inserts the line break the editor left alone.
  if (!prevented && !options.composing) {
    textarea.value = textarea.value.slice(0, selection.start) + '\n' + textarea.value.slice(selection.end);
    selection.start = selection.end = selection.start + 1;
  }
  return { value: textarea.value, caret: selection.start, prevented };
}
const both = (raw: string, line: number, options: Press = {}) => [press(raw, line, { ...options, v2: false }), press(raw, line, { ...options, v2: true })];

test('the fixtures carry the model row kinds the Enter rules read', () => {
  assert.deepEqual(rows('[2026-10-30]\n- [ ] 장보기\n  - 메모: 우유').map(row => row.kind), ['date', 'task', 'property']);
  assert.equal(rows('- 집안일\n  - [ ] 빨래', '- 집안일')[0].kind, 'scope');
});

test('date header and folder lines end with a plain line under v2, an automatic task without it', () => {
  const date = '[2026-10-30]\n- [ ] 장보기';
  const [dateOff, dateOn] = both(date, 0);
  assert.equal(dateOff.value, '[2026-10-30]\n- [ ] \n- [ ] 장보기');
  assert.equal(dateOn.value, '[2026-10-30]\n\n- [ ] 장보기');
  assert.equal(dateOn.caret, end(date, 0) + 1);

  const folder = '- 집안일\n  - [ ] 빨래';
  const [folderOff, folderOn] = both(folder, 0, { folderLine: '- 집안일' });
  assert.equal(folderOff.value, '- 집안일\n  - [ ] \n  - [ ] 빨래');
  assert.equal(folderOn.value, '- 집안일\n  \n  - [ ] 빨래');
  assert.equal(folderOn.caret, end(folder, 0) + 3);
});

test("Shift+Enter at a titled task end opens that task's memo line after its properties under v2", () => {
  const [plainOff, plainOn] = both('- [ ] 장보기', 0, { shift: true });
  assert.equal(plainOff.value, '- [ ] 장보기\n');
  assert.equal(plainOn.value, '- [ ] 장보기\n  - 메모: ');
  assert.equal(plainOn.caret, plainOn.value.length);

  const withMemo = '- [ ] 장보기\n  - 메모: 우유\n- [ ] 다음';
  const continued = press(withMemo, 0, { v2: true, shift: true });
  assert.equal(continued.value, '- [ ] 장보기\n  - 메모: 우유\n  - 메모: \n- [ ] 다음');
  assert.equal(continued.caret, '- [ ] 장보기\n  - 메모: 우유\n  - 메모: '.length);

  // A nested task (here under a plain line) gets its memo one level deeper.
  assert.equal(press('- 집안일\n  - [ ] 빨래', 1, { v2: true, shift: true }).value, '- 집안일\n  - [ ] 빨래\n    - 메모: ');
});

test('Shift+Enter elsewhere, and every unchanged Enter, gives the same result with and without v2', () => {
  const cases: [string, number, Press][] = [
    ['- [ ] 장보기', 0, { shift: true, selectStart: 7 }],   // Shift+Enter over part of a title: browser line break
    ['- [ ] ', 0, { shift: true }],                         // untitled task Shift+Enter
    ['- [ ] 부모\n  - [ ] 하위', 1, { shift: true }],        // a subcheck is not a task: no memo line
    ['- [ ] 장보기', 0, {}],                                 // titled task end: next empty task
    ['- [ ] 장보기\n- [ ] ', 1, {}],                         // top-level empty task: leaves the list
    ['- [ ] 부모\n  - [ ] ', 1, {}],                         // nested empty task: outdents
    ['- [ ] 장보기\n  - 메모: 우유', 1, {}],                 // memo line end: continues the memo
    ['- [ ] 장보기\n  - 메모: 우유', 1, { shift: true }],    // memo line Shift+Enter: continues the memo
    ['- [ ] 장보기', 0, { selectStart: 2 }],                 // selection: browser line break
  ];
  for (const [raw, line, options] of cases) {
    const [off, on] = both(raw, line, options);
    assert.deepEqual(on, off, JSON.stringify([raw, line, options]));
  }
  assert.equal(press('- [ ] 장보기', 0, { v2: true }).value, '- [ ] 장보기\n- [ ] ');
  assert.equal(press('- [ ] 장보기\n- [ ] ', 1, { v2: true }).value, '- [ ] 장보기\n');
  assert.equal(press('- [ ] 부모\n  - [ ] ', 1, { v2: true }).value, '- [ ] 부모\n');
  assert.equal(press('- [ ] 장보기\n  - 메모: 우유', 1, { v2: true }).value, '- [ ] 장보기\n  - 메모: 우유\n  - 메모: ');
});

test('IME: an Enter that belongs to composition changes nothing, with or without v2', () => {
  const cases: [string, number, Press][] = [
    ['[2026-10-30]', 0, {}], ['- 집안일', 0, { folderLine: '- 집안일' }], ['- [ ] 장보기', 0, {}],
    ['- [ ] 장보기', 0, { shift: true }], ['- [ ] 장보기\n- [ ] ', 1, {}],
  ];
  for (const [raw, line, options] of cases) for (const v2 of [false, true]) {
    const composing = press(raw, line, { ...options, v2, composing: true });
    assert.deepEqual([composing.value, composing.prevented], [raw, false], `composing ${raw} ${v2}`);
    const consumed = press(raw, line, { ...options, v2, consumed: true });
    assert.deepEqual([consumed.value, consumed.prevented], [raw, true], `settled IME Enter ${raw} ${v2}`);
  }
});

test('the memo plan stays inside its rules', () => {
  const plan = (raw: string, caret: number, kind = 'task') => inputPlans.planTaskMemoEnter(raw, { start: caret, end: caret, direction: 'none' }, { kind });
  const task = '- [ ] 장보기';
  assert.equal(plan(task, end(task, 0))?.nextRaw, '- [ ] 장보기\n  - 메모: ');
  const withProperties = '- [ ] 장보기\n  - 날짜: 2026-10-30\n  - 메모: 우유';
  assert.equal(plan(withProperties, end(withProperties, 0))?.nextRaw, withProperties + '\n  - 메모: ');
  assert.equal(plan(task, 7), null);
  assert.equal(plan('- [ ] ', 6), null);
  assert.equal(plan(task, end(task, 0), 'reference'), null);
  assert.equal(plan('\t' + task, end('\t' + task, 0)), null);
  assert.equal(inputPlans.planTaskMemoEnter(task, { start: 6, end: end(task, 0), direction: 'none' }, { kind: 'task' }), null);
});

function saved(raw: string) {
  let state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  state = M.editText(state, 'd', raw, { progressDate: '2026-10-30' });
  return { tasks: M.tasks(state).map(task => [task.title, task.note]), reopened: M.raw(state.documents[0]) };
}

test('a Shift+Enter memo saves as that task\'s memo and reopens under it; v2 lines keep their tasks', () => {
  const typed = press('- [ ] 장보기\n- [ ] 다음', 0, { v2: true, shift: true }).value.replace('  - 메모: ', '  - 메모: 우유');
  assert.deepEqual(saved(typed), { tasks: [['장보기', '우유'], ['다음', '']], reopened: typed });

  const continued = press('- [ ] 장보기\n  - 메모: 우유', 0, { v2: true, shift: true }).value + '와 빵';
  assert.deepEqual(saved(continued).tasks, [['장보기', '우유\n와 빵']]);

  const afterDate = press('[2026-10-30]\n- [ ] 장보기', 0, { v2: true }).value;
  assert.deepEqual(saved(afterDate), { tasks: [['장보기', '']], reopened: afterDate });
});

// The writing bar's ↵ calls instance.enter(true): the same key handler, plus the line break a browser
// inserts for a key the editor leaves alone. Compare it with a real Shift+Enter in every case.
const enterMethod = slice('      enter(shift) {', '\n      },');
function barEnter(raw: string, line: number, options: { v2?: boolean; composing?: boolean; selectStart?: number } = {}) {
  const meta = rows(raw), caret = end(raw, line);
  const textarea = { value: raw, readOnly: false }, selection: Selection = { start: options.selectStart ?? caret, end: caret, direction: 'none' };
  const editor = new Function('textarea', 'selection', 'imeEnterCycle', 'addSettings', 'inputPlans', 'config', 'getRowMeta', `
    let composing = false, destroyed = false, inputRejected = false, nextTabLeaves = false, indentLease = null;
    ${helpers}
    ${lineHelpers}
    function remember() {}
    function indent() { return false; }
    function canApplyInput() { return true; }
    function insert(text) {
      textarea.value = textarea.value.slice(0, selection.start) + text + textarea.value.slice(selection.end);
      selection.start = selection.end = selection.start + text.length; return true;
    }
    function replaceRange(start, end, text, settings) {
      textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
      const after = settings && settings.selectionAfter, caret = start + text.length;
      selection.start = after ? after.start : caret; selection.end = after ? after.end : caret; return true;
    }
    ${keydown}
    function ${enterMethod.trim()}
    }
    return { enter, compose(on) { composing = on; } };`)(
    textarea, selection, { keydown: () => false }, resolve({ listEnterV2: () => !!options.v2 }), inputPlans, {}, () => meta);
  if (options.composing) editor.compose(true);
  const ran = editor.enter(true);
  return { value: textarea.value, caret: selection.start, ran };
}

test('the bar ↵ gives exactly the Shift+Enter result, and does nothing during composition', () => {
  const cases: [string, number][] = [
    ['- [ ] 장보기', 0], ['- [ ] 장보기\n  - 메모: 우유\n- [ ] 다음', 0], ['- [ ] 장보기\n  - 메모: 우유', 1],
    ['[2026-10-30]', 0], ['- [ ] ', 0], ['- [ ] 부모\n  - [ ] 하위', 1], ['그냥 글', 0],
  ];
  for (const [raw, line] of cases) for (const v2 of [false, true]) {
    const bar = barEnter(raw, line, { v2 }), key = press(raw, line, { v2, shift: true });
    assert.deepEqual([bar.value, bar.caret], [key.value, key.caret], JSON.stringify([raw, line, v2]));
  }
  const composing = barEnter('- [ ] 장보기', 0, { v2: true, composing: true });
  assert.deepEqual([composing.ran, composing.value], [false, '- [ ] 장보기']);
});

test('S3 re-review: a held ↵ meeting a range selected later would replace that text, so the verdict drops it', () => {
  // Held at the end of "메모 ABC" while saving; then Shift+Left twice selects "BC" on the same line.
  const raw = '메모 ABC', area = {}, held = writingBarTarget(area, raw, raw.length);
  for (const v2 of [false, true]) {
    const run = barEnter(raw, 0, { v2, selectStart: raw.length - 2 });
    assert.equal(run.value, '메모 A\n', `the real vendor ↵ replaces the selection (v2 ${v2})`);
  }
  assert.equal(heldTargetVerdict(held, { surface: area, value: raw, caret: raw.length - 2, selectionEnd: raw.length, editable: true, connected: true, focusHere: true }), 'cancel');
  // Unchanged caret: the same vendor call is the Shift+Enter the user pressed for.
  assert.equal(heldTargetVerdict(held, { surface: area, value: raw, caret: raw.length, selectionEnd: raw.length, editable: true, connected: true, focusHere: true }), 'run');
  assert.equal(barEnter(raw, 0).value, '메모 ABC\n');
});

// memo-enter (11/10, a real-use report: "'-메모' 쓰다가 엔터치면 '-메모'가 줄이 바뀜"): Enter at a memo's end still continues
// the memo (above), but on the empty memo line that gives it leaves the memo for the owner's next task.
test('memo-enter: Enter on an empty memo line leaves the memo for the next task, after the owner\'s block; Shift+Enter continues', () => {
  const exit = load('./text-input-plan.cjs').planMemoExit as (raw: string, selection: Selection, meta: unknown) => { nextRaw: string; selectionAfter: Selection } | null;
  const memo = '- [ ] 장보기\n  - 메모: 우유\n  - 메모: ';
  for (const v2 of [false, true]) {
    const left = press(memo, 2, { v2 });
    assert.deepEqual([left.value, left.caret, left.prevented], ['- [ ] 장보기\n  - 메모: 우유\n- [ ] ', '- [ ] 장보기\n  - 메모: 우유\n- [ ] '.length, true], `v2 ${v2}`);
    // Typing on: the memo keeps its words, the new line is the next task.
    assert.deepEqual(saved(left.value + '계란').tasks, [['장보기', '우유'], ['계란', '']]);
  }
  // The owner's other children stay under it; the new task opens after them.
  const children = '- [ ] 장보기\n  - 메모: \n  - [ ] 우유\n- [ ] 다음';
  const after = press(children, 1, { v2: true });
  assert.deepEqual([after.value, after.caret], ['- [ ] 장보기\n  - [ ] 우유\n- [ ] \n- [ ] 다음', '- [ ] 장보기\n  - [ ] 우유\n- [ ] '.length]);
  // A subcheck's memo opens the next subcheck.
  assert.equal(press('- [ ] 부모\n  - [ ] 하위\n    - 메모: ', 2, { v2: true }).value, '- [ ] 부모\n  - [ ] 하위\n  - [ ] ');
  // Shift+Enter (the bar's ↵ too) and an Enter during composition leave the empty memo line as before.
  assert.equal(press(memo, 2, { v2: true, shift: true }).value, memo + '\n  - 메모: ');
  assert.equal(barEnter(memo, 2, { v2: true }).value, memo + '\n  - 메모: ');
  assert.deepEqual([press(memo, 2, { v2: true, composing: true }).value, press(memo, 2, { v2: true, composing: true }).prevented], [memo, false]);
  // Only that exact shape: words after '메모:', the caret before the end, a selection, or no task above are not it.
  const at = (raw: string, caret: number, start = caret) => exit(raw, { start, end: caret, direction: 'none' }, { kind: 'property' });
  assert.equal(at('- [ ] 장보기\n  - 메모: 우유', end('- [ ] 장보기\n  - 메모: 우유', 1)), null);
  assert.equal(at(memo, end(memo, 2) - 1), null);
  assert.equal(at(memo, end(memo, 2), end(memo, 1) + 1), null);
  assert.equal(at('- 집안일\n  - 메모: ', end('- 집안일\n  - 메모: ', 1)), null);
  assert.equal(exit(memo, { start: end(memo, 2), end: end(memo, 2), direction: 'none' }, { kind: 'task' }), null);
});

test('memo-enter: only a plain Enter that continued a memo calls the host\'s tip hook', () => {
  let calls = 0; const config = { onMemoContinue: () => { calls += 1; } };
  const count = (raw: string, line: number, options: Press = {}) => { calls = 0; press(raw, line, { ...options, config }); return calls; };
  assert.equal(count('- [ ] 장보기\n  - 메모: 우유', 1, { v2: true }), 1);
  assert.equal(count('- [ ] 장보기\n  - 메모: 우유', 1, { v2: false }), 1);
  assert.equal(count('- [ ] 장보기\n  - 메모: 우유', 1, { v2: true, shift: true }), 0);
  assert.equal(count('- [ ] 장보기\n  - 메모: 우유\n  - 메모: ', 2, { v2: true }), 0, 'leaving the memo');
  assert.equal(count('- [ ] 장보기\n  - 메모: 우유', 1, { v2: true, composing: true }), 0);
  assert.equal(count('- [ ] 장보기', 0, { v2: true }), 0);
});
