import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import inputPlans from './text-input-plan.cjs';

const source = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
function section(start: string, end: string) {
  const a = source.indexOf(start), b = source.indexOf(end, a); assert(a >= 0 && b > a);
  return source.slice(a, b);
}
// Execute the shipped key/transaction functions. The fake command tests gating
// and ordering; real browser undo, IME and layout remain separate browser gates.
function fixture(raw: string, options: Record<string, unknown> = {}) {
  const events = new Map<string, (event?: any) => void>(), writes: string[] = [], rejected: any[] = [], commands: string[] = [];
  const textarea: any = { value: raw, selectionStart: raw.length, selectionEnd: raw.length, selectionDirection: 'none', scrollTop: 33, scrollLeft: 4,
    style: { setProperty() {} }, setSelectionRange(start: number, end: number, direction = 'none') { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; },
    focus() {}, readOnly: false };
  const context: any = vm.createContext({ textarea, composing: false, destroyed: false, nativeDepth: 0, pendingChange: false, nextTabLeaves: false,
    selection: { start: raw.length, end: raw.length, direction: 'none' }, lastReported: raw, foldedIds: new Set(), moveState: null, gesture: null,
    config: { onChange: (value: string) => writes.push(value), onInputRejected: (intent: unknown) => rejected.push(intent), ...options },
    inputPlans, root: { classList: { add() {}, remove() {} } }, doc: { execCommand: (command: string, _ui: unknown, text: string) => {
      commands.push(command); if (context.unsupported) return false;
      if (command === 'insertText') { textarea.value = textarea.value.slice(0, textarea.selectionStart) + text + textarea.value.slice(textarea.selectionEnd); const caret = textarea.selectionStart + text.length; textarea.setSelectionRange(caret, caret); events.get('input')?.({ inputType: 'insertText' }); }
      return true;
    } }, viewport: {}, compositionAnchor: 0,
    getRowMeta: () => context.metadata || {}, cancelMove() {}, unfoldAll() {}, render() {}, scheduleRender() {}, syncGeometry() {}, captureBlurReveal() {}, maybeRequestPicker() {},
    indentation: (line: string) => { const prefix = /^[ \t]*/.exec(line)![0]; return { prefix, columns: prefix.replace(/\t/g, '  ').length }; },
    dateLabel: (line: string) => /^\[(?:\d{4}-\d{2}-\d{2}|미정)\]$/.test(line.trim()),
    matchTask: (line: string, meta: any, empty: boolean) => meta && !['task', 'subcheck', 'reference'].includes(meta.kind) ? null : (empty ? /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\]\s*$/ : /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\](\s+)(.*)$/).exec(line),
    EMPTY_TASK: /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\]\s*$/, TASK: /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\](\s+)(.*)$/, MAX_DEPTH: 32,
    listen: (_target: unknown, name: string, handler: (event?: any) => void) => events.set(name, handler),
  });
  vm.runInContext(section('  function protectedFenceLines(lines) {', '  function create(container, options) {') +
    section('    function remember() {', '    function scheduleRender() {') +
    section('    function rejectInput(intent) {', "    listen(doc, 'selectionchange',"), context);
  function key(key: string, patch: Record<string, unknown> = {}) {
    const event: any = { key, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, isComposing: false, keyCode: 0, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, ...patch };
    events.get('keydown')!(event); return event;
  }
  return { context, textarea, events, writes, rejected, commands, key,
    replace: (start: number, end: number, text: string) => { context.request = { start, end, text }; return vm.runInContext('replaceRange(request.start, request.end, request.text)', context); } };
}

test('shipped Enter and ShiftEnter both repeat memo properties through one native replacement', () => {
  for (const shiftKey of [false, true]) {
    const raw = '- [ ] 할 일\n  - 메모: 첫 문장', f = fixture(raw); f.context.metadata = { 1: { kind: 'property' } };
    assert(f.key('Enter', { shiftKey }).defaultPrevented);
    assert.equal(f.textarea.value, `${raw}\n  - 메모: `); assert.deepEqual(f.commands, ['insertText']); assert.deepEqual(f.writes, [f.textarea.value]);
    assert.equal(f.textarea.selectionStart, f.textarea.value.length); assert.equal(f.textarea.scrollTop, 33); assert.equal(f.textarea.scrollLeft, 4);
  }
});

test('ordinary memo ShiftEnter and selected Enter retain native literal newline semantics', () => {
  for (const raw of ['일반 메모', '  - 일반 목록 메모', '  자유 메모']) {
    const f = fixture(raw); assert(!f.key('Enter', { shiftKey: true }).defaultPrevented); assert.deepEqual(f.commands, []); assert.equal(f.textarea.value, raw);
  }
  const f = fixture('- [ ] 제목'); f.textarea.setSelectionRange(6, 8); assert(!f.key('Enter').defaultPrevented); assert.deepEqual(f.commands, []);
});

test('existing task, date, scope and bullet Enter continuations remain unchanged', () => {
  for (const [raw, meta, expected] of [
    ['- [ ] 할 일', { kind: 'task' }, '- [ ] 할 일\n- [ ] '],
    ['[2026-10-01]', { kind: 'date' }, '[2026-10-01]\n- [ ] '],
    ['- 폴더', { kind: 'scope', depth: 0 }, '- 폴더\n  - [ ] '],
    ['  - 일반 메모', { kind: 'note' }, '  - 일반 메모\n  - '],
    ['  자유 메모', { kind: 'note' }, '  자유 메모\n  '],
    ['  - [ ] ', { kind: 'task' }, ''],
  ] as const) {
    const f = fixture(raw); f.context.metadata = { 0: meta }; assert(f.key('Enter').defaultPrevented); assert.equal(f.textarea.value, expected);
  }
});

test('shipped task title-end Enter inserts after the original Item subtree through one guarded native replacement', () => {
  const raw = '- [ ] 원래 할 일\n  - 메모: 보존\n  - [ ] 원래 자식\n- [ ] 뒤 할 일', end = raw.indexOf('\n');
  const expected = '- [ ] 원래 할 일\n  - 메모: 보존\n  - [ ] 원래 자식\n- [ ] \n- [ ] 뒤 할 일';
  let candidate = '';
  const f = fixture(raw, { canApplyInput: (next: string) => { candidate = next; return true; } });
  f.textarea.setSelectionRange(end, end); f.context.metadata = { 0: { kind: 'task', subtreeEndIndex: 3 } };
  assert(f.key('Enter').defaultPrevented); assert.equal(candidate, expected); assert.equal(f.textarea.value, expected);
  assert.equal(f.textarea.selectionStart, expected.indexOf('\n- [ ] 뒤 할 일')); assert.deepEqual(f.commands, ['insertText']);
  const blocked = fixture(raw, { canApplyInput: () => false }); blocked.textarea.setSelectionRange(end, end); blocked.context.metadata = f.context.metadata;
  assert(blocked.key('Enter').defaultPrevented); assert.equal(blocked.textarea.value, raw); assert.deepEqual(blocked.commands, []);
});

test('shipped mid-title task Enter retains its existing continuation and ShiftEnter remains literal', () => {
  const raw = '- [ ] 첫째 둘째\n  - 메모: 원문', middle = raw.indexOf(' 둘째'), f = fixture(raw);
  f.textarea.setSelectionRange(middle, middle); f.context.metadata = { 0: { kind: 'task', subtreeEndIndex: 2 } };
  assert(f.key('Enter').defaultPrevented); assert.equal(f.textarea.value, raw.slice(0, middle) + '\n- [ ] ' + raw.slice(middle));
  const shift = fixture(raw); shift.textarea.setSelectionRange(raw.indexOf('\n'), raw.indexOf('\n')); shift.context.metadata = f.context.metadata;
  assert(!shift.key('Enter', { shiftKey: true }).defaultPrevented); assert.deepEqual(shift.commands, []);
});

test('rejected Enter, ShiftEnter and range replacement leave bytes, caret, scroll and native history untouched', () => {
  for (const shiftKey of [false, true]) {
    const raw = '  - 메모: 원문', f = fixture(raw, { canApplyInput: () => false }); f.context.metadata = { 0: { kind: 'property' } };
    assert(f.key('Enter', { shiftKey }).defaultPrevented); assert.equal(f.textarea.value, raw); assert.equal(f.textarea.selectionStart, raw.length);
    assert.deepEqual(f.commands, []); assert.deepEqual(f.writes, []); assert.equal(f.rejected.length, 1); assert.equal(f.rejected[0].kind, 'enter');
  }
  const f = fixture('일반 메모', { canApplyInput: () => false }); assert(f.key('Enter').defaultPrevented); assert.equal(f.rejected.length, 1);
  assert.equal(f.replace(0, 2, '바꿈'), false); assert.equal(f.textarea.value, '일반 메모'); assert.deepEqual(f.commands, []);
});

test('rejected Tab and ShiftTab block fallback while Escape followed by Tab still leaves the editor', () => {
  for (const shiftKey of [false, true]) {
    const raw = '  - 메모', f = fixture(raw, { canApplyInput: () => false });
    assert(f.key('Tab', { shiftKey }).defaultPrevented); assert.equal(f.textarea.value, raw); assert.equal(f.rejected.length, 1); assert.equal(f.rejected[0].kind, 'indent');
    f.key('Escape'); assert(!f.key('Tab', { shiftKey }).defaultPrevented); assert.equal(f.rejected.length, 1); assert.deepEqual(f.commands, []);
  }
});

test('legacy indent model refusal retains the existing Tab focus fallback without a new input gate', () => {
  const f = fixture('  - 메모', { canApplyIndent: () => false });
  assert(!f.key('Tab').defaultPrevented); assert.deepEqual(f.commands, []); assert.deepEqual(f.rejected, []);
});

test('shipped immediate outdent/indent lease excludes a newly absorbed following sibling', () => {
  const raw = '- 부모\n  - 선택\n    - 자식\n  - 뒤 형제', f = fixture(raw, { canApplyInput: () => true });
  f.textarea.setSelectionRange(raw.indexOf('선택'), raw.indexOf('선택'));
  f.context.metadata = { 1: { subtreeEndIndex: 3 } }; assert(f.key('Tab', { shiftKey: true }).defaultPrevented);
  f.context.metadata = { 1: { subtreeEndIndex: 4 } }; assert(f.key('Tab').defaultPrevented);
  assert.equal(f.textarea.value, raw); assert.deepEqual(f.commands, ['insertText', 'insertText']);
});

test('input, composition and selection changes invalidate the shipped inverse lease', () => {
  for (const change of ['input', 'composition', 'selection']) {
    const raw = '- 부모\n  - 선택\n  - 뒤', f = fixture(raw, { canApplyInput: () => true });
    f.textarea.setSelectionRange(raw.indexOf('선택'), raw.indexOf('선택')); f.context.metadata = { 1: { subtreeEndIndex: 2 } }; f.key('Tab', { shiftKey: true });
    const selected = f.textarea.selectionStart;
    if (change === 'input') f.events.get('input')!({ inputType: 'insertText' });
    else if (change === 'composition') { f.events.get('compositionstart')!(); f.events.get('compositionend')!(); }
    else { f.textarea.setSelectionRange(0, 0); f.events.get('select')!(); f.textarea.setSelectionRange(selected, selected); }
    f.context.metadata = { 1: { subtreeEndIndex: 3 } }; f.key('Tab');
    assert.equal(f.textarea.value, '- 부모\n  - 선택\n    - 뒤', change);
  }
});

test('IME, keyCode229, protected fences and unsupported native commands keep the buffer untouched', () => {
  for (const patch of [{ isComposing: true }, { keyCode: 229 }]) {
    const f = fixture('  - 메모: 원문'); f.context.metadata = { 0: { kind: 'property' } };
    assert(!f.key('Enter', patch).defaultPrevented); assert.deepEqual(f.commands, []);
  }
  const f = fixture('```\n  - 메모: 코드'); f.context.metadata = { 1: { kind: 'property' } }; assert(!f.key('Enter').defaultPrevented); assert.deepEqual(f.commands, []);
  const unsupported = fixture('  - 메모: 원문'); unsupported.context.metadata = { 0: { kind: 'property' } }; unsupported.context.unsupported = true;
  assert(!unsupported.key('Enter').defaultPrevented); assert.equal(unsupported.textarea.value, '  - 메모: 원문'); assert.deepEqual(unsupported.writes, []);
});

test('controls:false leaves metadata rendering intact and omits action controls and picker requests', () => {
  assert.match(source, /if \(config\.controls !== false\) root\.append\(controls, moveLayer, moveStatus\)/);
  assert.match(section('    function addRowButton(', '    function syncCompositionGeometry()'), /if \(config\.controls === false\) return/);
  assert.match(section('    function maybeRequestPicker(', '    function getRowMeta()'), /config\.controls === false/);
  const render = section('    function render() {', '    function rejectInput(intent) {');
  assert.match(render, /row\.append\(hidden, makeSpan/); assert.match(render, /if \(config\.controls !== false\) \{/);
  const badge = section('          if (config.controls === false && progress > 0', '          if (config.controls !== false) {');
  assert.match(badge, /checkAnchor\.append\(badge\)/); assert.doesNotMatch(badge, /button|addEventListener|tabIndex/);
});

function endCaretFixture() {
  const events = new Map<string, (event?: any) => void>();
  let frame: (() => void) | undefined, visible = true;
  const textarea = { value: '마지막 줄', selectionStart: 6, selectionEnd: 6, selectionDirection: 'none',
    scrollTop: 949, scrollLeft: 7, clientHeight: 330, clientWidth: 600, scrollHeight: 1356,
    getClientRects: () => visible ? [{}] : [] };
  textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  const row = { offsetTop: 1248, offsetHeight: 44, hidden: false };
  const context: any = vm.createContext({ textarea, rows: [row], doc: { activeElement: textarea }, root: {},
    destroyed: false, composing: false, gesture: null, moveState: null, foldedIds: new Set(), mode: 'live', inputEpoch: 0,
    renderFrame: 0, pendingBlurReveal: null, lineAt: () => 0, remember() {}, revealBlurredProgress() {}, captureBlurReveal() {},
    syncCount: 0, syncGeometry: () => context.syncCount++, renderCount: 0, render: () => context.renderCount++,
    global: { requestAnimationFrame: (callback: () => void) => { frame = callback; return 1; } },
    listen: (_target: unknown, name: string, handler: (event?: any) => void) => events.set(name, handler),
  });
  vm.runInContext(section('    let pendingEndCaretReveal = null;', '    function makeSpan(') +
    section('    function scheduleRender() {', '    function captureBlurReveal(event) {') +
    section("    listen(textarea, 'keyup',", "    listen(textarea, 'scroll',"), context);
  return { context, textarea, row, events, hide: () => { visible = false; },
    keyup: (patch: Record<string, unknown> = {}) => events.get('keyup')!({ key: 'End', ctrlKey: true, ...patch }),
    frame: () => { assert(frame); const callback = frame; frame = undefined; callback(); } };
}

test('native End default is followed by only the missing 13px final-line correction without changing input or metrics', () => {
  for (const mode of ['live', 'text']) {
    const f = endCaretFixture(); f.context.mode = mode;
    const before = { ...f.textarea }, active = f.context.doc.activeElement;
    f.keyup(); assert.equal(f.textarea.scrollTop, 949, 'native caret/default scroll finish before the frame'); f.frame();
    assert.equal(f.textarea.scrollTop, 962); assert.equal(f.row.offsetTop + f.row.offsetHeight, f.textarea.scrollTop + f.textarea.clientHeight);
    assert.deepEqual({ ...f.textarea, scrollTop: before.scrollTop }, before); assert.equal(f.context.doc.activeElement, active);
    assert.equal(f.context.syncCount, 1); assert.equal(f.context.renderCount, 1);
    f.textarea.scrollTop = 949; vm.runInContext('revealEndCaret()', f.context); assert.equal(f.textarea.scrollTop, 949, 'consumed intent never pulls the row back');
  }
});

test('actual End then modifier-release keyup sequence retains its one-shot unless another caret intent or mutation intervenes', () => {
  for (const key of ['Control', 'Meta', 'Shift', 'Alt']) {
    const f = endCaretFixture(); f.keyup(); f.keyup({ key }); f.frame();
    assert.equal(f.textarea.scrollTop, 962, key); assert.equal(f.context.syncCount, 1);
  }
  for (const change of ['other-key', 'selection', 'input-epoch', 'manual-scroll']) {
    const f = endCaretFixture(); f.keyup(); f.keyup({ key: 'Control' });
    if (change === 'other-key') f.keyup({ key: 'ArrowLeft' });
    else if (change === 'selection') f.textarea.selectionStart--;
    else if (change === 'input-epoch') f.context.inputEpoch++;
    else f.events.get('wheel')!();
    f.frame(); assert.equal(f.textarea.scrollTop, 949, change); assert.equal(f.context.syncCount, 0);
  }
});

test('End reveal never navigates a distant, already-visible, wrapped, hidden or selected final row', () => {
  for (const [top, height, hidden] of [[962, 44, false], [1292, 44, false], [1248, 88, false], [1248, 44, true]] as const) {
    const f = endCaretFixture(); Object.assign(f.row, { offsetTop: top, offsetHeight: height, hidden });
    f.keyup(); f.frame(); assert.equal(f.textarea.scrollTop, 949); assert.equal(f.context.syncCount, 0);
  }
  for (const prepare of [
    (f: ReturnType<typeof endCaretFixture>) => f.hide(),
    (f: ReturnType<typeof endCaretFixture>) => { f.context.composing = true; },
    (f: ReturnType<typeof endCaretFixture>) => { f.context.gesture = {}; },
    (f: ReturnType<typeof endCaretFixture>) => { f.context.moveState = {}; },
    (f: ReturnType<typeof endCaretFixture>) => f.context.foldedIds.add('scope'),
    (f: ReturnType<typeof endCaretFixture>) => { f.textarea.selectionStart--; },
    (f: ReturnType<typeof endCaretFixture>) => { f.context.destroyed = true; },
  ]) {
    const f = endCaretFixture(); prepare(f); f.keyup(); if (!f.context.destroyed) f.frame();
    assert.equal(f.textarea.scrollTop, 949); assert.equal(f.context.syncCount, 0);
  }
  for (const patch of [{ key: 'ArrowDown' }, { isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }]) {
    const f = endCaretFixture(); f.keyup(patch); f.frame(); assert.equal(f.textarea.scrollTop, 949);
  }
});

test('manual scroll and changed caret, input, mode, focus or viewport cancel the one-shot End reveal', () => {
  for (const interrupt of ['wheel', 'pointerdown', 'touchstart']) {
    const f = endCaretFixture(); f.keyup(); f.events.get(interrupt)!(); f.frame(); assert.equal(f.textarea.scrollTop, 949);
  }
  const changes: ((f: ReturnType<typeof endCaretFixture>) => void)[] = [
    f => { f.textarea.scrollTop = 900; }, f => { f.textarea.scrollLeft = 11; }, f => { f.textarea.selectionEnd--; },
    f => { f.textarea.selectionDirection = 'backward'; }, f => { f.textarea.value += '!'; }, f => { f.context.inputEpoch++; },
    f => { f.context.mode = 'text'; }, f => { f.context.doc.activeElement = {}; }, f => { f.textarea.clientHeight++; },
    f => { f.textarea.clientWidth++; }, f => f.hide(), f => { f.context.composing = true; },
  ];
  for (const change of changes) {
    const f = endCaretFixture(); f.keyup(); change(f); const before = f.textarea.scrollTop; f.frame();
    assert.equal(f.textarea.scrollTop, before); assert.equal(f.context.syncCount, 0);
  }
  assert.doesNotMatch(section('    let pendingEndCaretReveal = null;', '    function makeSpan('), /\.focus\(|\.blur\(|setSelectionRange|\.value\s*=|execCommand|onChange|publish\(|setValue/);
});
