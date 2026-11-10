import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { textEditorRows, textWorkspaceModel as M, type TextEditorRowMeta, type TextWorkspaceState } from './text-workspace';

// enter1 (11/10, PRD 14 우선 1 · Codex audit ⚑ 2·4·6·8·11): Enter inside a structure line — a date head, a folder line, a
// memo, a date or time property — never cuts it; it acts as Enter at the line's end. The real vendor key handler with
// row meta from the real text model; the caret is put inside the line (selection collapsed).
type Selection = { start: number; end: number; direction: string };
const load = createRequire(import.meta.url);
const inputPlans = load('./text-input-plan.cjs');
const { resolve } = load('./text-add-settings.cjs') as { resolve(config: Record<string, unknown>): Record<string, () => boolean> };
const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
const slice = (from: string, to: string) => { const start = vendor.indexOf(from), stop = vendor.indexOf(to, start); assert(start > 0 && stop > start, from); return vendor.slice(start, stop); };
const helpers = slice('  const DATE = ', '  function create(');
const lineHelpers = slice('    function lineAt(offset) {', '    let inputEpoch = 0;');
const keydown = slice('    function onKeydown(event) {', "\n    listen(textarea, 'input'");

function rows(raw: string, folderLine?: string): TextEditorRowMeta[] {
  let state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }, { id: 'h', title: '집안일', parentId: 'f' }],
    documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }], flows: [], bindings: [],
    taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  state = M.editText(state, 'd', raw, { progressDate: '2026-11-10' });
  if (folderLine) {
    const line = state.documents[0].lines.find(entry => entry.text === folderLine)!;
    state = { ...state, bindings: [...state.bindings, { kind: 'scope', docId: 'd', lineId: line.id, scopeId: 'h' }] };
  }
  return textEditorRows(state, 'd');
}
/** Enter with the caret right after `after` (its first occurrence), as the browser would leave it to the editor. */
function press(raw: string, after: string, options: { v2?: boolean; shift?: boolean; composing?: boolean; folderLine?: string } = {}) {
  const caret = raw.indexOf(after) + after.length;
  assert(caret >= after.length, after);
  const meta = rows(raw, options.folderLine);
  const textarea = { value: raw, readOnly: false, selectionStart: caret, selectionEnd: caret, selectionDirection: 'none',
    setSelectionRange(start: number, end: number) { this.selectionStart = start; this.selectionEnd = end; } };
  const editor = new Function('textarea', 'selection', 'imeEnterCycle', 'addSettings', 'inputPlans', 'config', 'getRowMeta', `
    let composing = false, inputRejected = false, nextTabLeaves = false, indentLease = null;
    ${helpers}
    ${lineHelpers}
    function remember() { selection = { start: textarea.selectionStart, end: textarea.selectionEnd, direction: 'none' }; return selection; }
    function indent() { return false; }
    function canApplyInput() { return true; }
    function insert(text) {
      textarea.value = textarea.value.slice(0, selection.start) + text + textarea.value.slice(selection.end);
      textarea.selectionStart = textarea.selectionEnd = selection.start + text.length; return true;
    }
    function replaceRange(start, end, text, settings) {
      textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
      const after = settings && settings.selectionAfter, at = start + text.length;
      textarea.selectionStart = after ? after.start : at; textarea.selectionEnd = after ? after.end : at; return true;
    }
    ${keydown}
    return { onKeydown, compose(on) { composing = on; } };`)(
    textarea, { start: caret, end: caret, direction: 'none' }, { keydown: () => false }, resolve({ listEnterV2: () => options.v2 !== false }), inputPlans, {}, () => meta);
  if (options.composing) editor.compose(true);
  let prevented = false;
  editor.onKeydown({ key: 'Enter', code: 'Enter', keyCode: options.composing ? 229 : 13, shiftKey: !!options.shift, ctrlKey: false, metaKey: false,
    altKey: false, isComposing: !!options.composing, defaultPrevented: false, preventDefault: () => { prevented = true; } });
  // Outside composition the browser inserts the line break the editor left alone, where the caret is now.
  if (!prevented && !options.composing) {
    const at = textarea.selectionStart;
    textarea.value = textarea.value.slice(0, at) + '\n' + textarea.value.slice(textarea.selectionEnd);
    textarea.selectionStart = textarea.selectionEnd = at + 1;
  }
  return { value: textarea.value, caret: textarea.selectionStart };
}
const endOf = (raw: string, line: string) => press(raw, line);

test('⚑2 a date head: Enter inside it is Enter at its end (the date stays whole)', () => {
  const raw = '[2026-11-10]\n- [ ] 합성 날짜 일';
  assert.deepEqual(press(raw, '[2026-'), endOf(raw, '[2026-11-10]'));
  assert.equal(press(raw, '[2026-').value, '[2026-11-10]\n\n- [ ] 합성 날짜 일');
  assert.deepEqual(press(raw, '[2026-', { v2: false }), press(raw, '[2026-11-10]', { v2: false }), 'without list Enter v2 too');
});

test('⚑4 a folder line: Enter inside its name is Enter at its end (the name stays whole)', () => {
  const raw = '- 집안일\n  - [ ] 빨래', options = { folderLine: '- 집안일' };
  const middle = press(raw, '- 집', options), end = press(raw, '- 집안일', options);
  assert.deepEqual(middle, end);
  assert.equal(middle.value, '- 집안일\n  - [ ] \n  - [ ] 빨래', 'its end opens the first task under it (enter1 follow-up)');
});

test('⚑8 a memo: Enter inside it continues the memo below; ⚑11 a time or date property: as at its end', () => {
  const memo = '- [ ] 장보기\n  - 메모: 우유';
  assert.deepEqual(press(memo, '  - 메'), endOf(memo, '  - 메모: 우유'));
  assert.equal(press(memo, '  - 메').value, '- [ ] 장보기\n  - 메모: 우유\n  - 메모: ');
  for (const [raw, inside, whole] of [['- [ ] 장보기\n  - 시간: 09:30', '  - 시간', '  - 시간: 09:30'], ['- [ ] 장보기\n  - 날짜: 2026-11-12', '  - 날짜: 2026-', '  - 날짜: 2026-11-12']]) {
    assert.deepEqual(press(raw, inside), endOf(raw, whole), inside);
    assert(press(raw, inside).value.startsWith(`${raw}\n`), `${inside}: the property line stays whole`);
  }
});

test('not cut, and only these: a task title still splits; the line start still opens a line above; Shift+Enter and composition as before', () => {
  const task = '- [ ] 장보기 우유';
  assert(press(task, '- [ ] 장보기').value.includes('장보기\n'), 'a task title is split as before');
  const head = '[2026-11-10]\n- [ ] 일';
  assert.equal(press(head, '').value, '\n' + head, 'the start of a date head: a line opens above it');
  const memo = '- [ ] 장보기\n  - 메모: 우유';
  assert.equal(press(memo, '  - 메', { shift: true }).value, '- [ ] 장보기\n  - 메\n모: 우유', 'Shift+Enter keeps the browser break (unchanged)');
  assert.deepEqual(press(memo, '  - 메', { composing: true }), { value: memo, caret: memo.indexOf('  - 메') + '  - 메'.length }, 'an Enter of the composition changes nothing');
});

test('folder line end: the first task right under it; an empty one already there takes the caret; Shift+Enter gives the indented line', () => {
  const options = { folderLine: '- 집안일' };
  const plain = '- 집안일\n  - [ ] 빨래';
  assert.deepEqual(press(plain, '- 집안일', options), { value: '- 집안일\n  - [ ] \n  - [ ] 빨래', caret: '- 집안일\n  - [ ] '.length });
  const ready = '- 집안일\n  - [ ] \n  - [ ] 빨래';
  assert.deepEqual(press(ready, '- 집안일', options), { value: ready, caret: '- 집안일\n  - [ ] '.length }, 'nothing added');
  assert.deepEqual(press(plain, '- 집안일', { ...options, shift: true }), { value: '- 집안일\n  \n  - [ ] 빨래', caret: '- 집안일\n  '.length });
  assert.equal(press(plain, '- 집안일', { ...options, v2: false }).value, '- 집안일\n  - [ ] \n  - [ ] 빨래', 'without v2 as before');
});

test('⚑7 inside a done task: the next open task after it (not a refused split); ⚑10 a date or time property\'s end: the owner\'s next task', () => {
  const done = '- [x] 합성 끝낸 일\n- [ ] 다음';
  assert.deepEqual(press(done, '- [x] 합성'), press(done, '- [x] 합성 끝낸 일'));
  assert.equal(press(done, '- [x] 합성').value, '- [x] 합성 끝낸 일\n- [ ] \n- [ ] 다음');
  for (const property of ['  - 시간: 09:30', '  - 날짜: 2026-11-12']) {
    const raw = `- [ ] 장보기\n${property}\n  - [ ] 우유\n- [ ] 다음`;
    const atEnd = press(raw, property), inside = press(raw, property.slice(0, 6));
    assert.equal(atEnd.value, `- [ ] 장보기\n${property}\n  - [ ] 우유\n- [ ] \n- [ ] 다음`, `${property}: after the owner's block`);
    assert.deepEqual(inside, atEnd, `${property}: inside it as at its end`);
  }
  const memo = '- [ ] 장보기\n  - 메모: 우유';
  assert.equal(press(memo, '  - 메모: 우유').value, '- [ ] 장보기\n  - 메모: 우유\n  - 메모: ', 'a memo still continues');
  assert.equal(press('- [ ] 장보기\n  - 시간: 09:30', '  - 시간: 09:30', { v2: false }).value, '- [ ] 장보기\n  - 시간: 09:30\n  - ', 'without v2 as before');
});

test('Enter 우선 3 ⚑12: a numbered line\'s end opens the next number; an empty one drops its marker; inside, Shift+Enter, a date as before', () => {
  assert.deepEqual(press('1. 첫째', '1. 첫째'), { value: '1. 첫째\n2. ', caret: '1. 첫째\n2. '.length });
  assert.equal(press('  3. 셋째', '  3. 셋째').value, '  3. 셋째\n  4. ', 'indented, as it was written');
  assert.equal(press('1. 첫째\n2. ', '1. 첫째\n2. ').value, '1. 첫째\n', 'an empty item: the marker goes');
  assert.equal(press('1. 첫째 둘째', '1. 첫째').value, '1. 첫째\n 둘째', 'inside: a plain break, as before');
  assert.equal(press('1. 첫째', '1. 첫째', { shift: true }).value, '1. 첫째\n', 'Shift+Enter: a plain break');
  assert.equal(press('2026. 11. 10. 회의', '2026. 11. 10. 회의').value, '2026. 11. 10. 회의\n', 'a written date is not a list');
  assert.deepEqual(press('1. 첫째', '1. 첫째', { composing: true }), { value: '1. 첫째', caret: '1. 첫째'.length });
});

test('Enter 우선 3 ⚑9: Shift+Enter on a memo continues it, an empty memo line too (Enter leaves it)', () => {
  const memo = '- [ ] 장보기\n  - 메모: 우유\n  - 메모: ';
  assert.equal(press(memo, memo, { shift: true }).value, memo + '\n  - 메모: ');
  assert.equal(press(memo, memo).value, '- [ ] 장보기\n  - 메모: 우유\n- [ ] ');
});

test('Enter 우선 3: \'한 줄 소개\' takes no break; Flow 찾기\'s search Enter closes the keyboard', () => {
  const read = (name: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const publisher = read('ProgramPublisher.tsx'), discovery = read('ProgramDiscovery.tsx');
  assert(publisher.includes("onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) event.preventDefault(); }}"));
  assert(publisher.includes("composeProgramPublicationSummary(anchorName, event.target.value.replace(/[^\\S\\n]*\\r?\\n[^\\S\\n]*/g, ' '))"));
  const steps = readFileSync(new URL('./publication-steps.ts', import.meta.url), 'utf8');
  assert(steps.includes("const body = typed !== undefined && typed !== parts.body ? typed.replace("), 'saving reads the field: a changed summary is one line there too');
  assert(discovery.includes('enterKeyHint="search"') && discovery.includes("if (event.key === 'Enter' && !composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); event.currentTarget.blur(); }"));
});
