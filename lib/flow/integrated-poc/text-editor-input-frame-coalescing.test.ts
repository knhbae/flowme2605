import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
function section(start: string, end: string) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a, `missing shipped section: ${start}`);
  return source.slice(a, b);
}

type Selection = { start: number; end: number; direction: string };
type Paint = { raw: string; selection: Selection };
type Change = { raw: string; inputType?: string; inputSplice?: { start: number; end: number; text: string } };
function plain<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

// Run shipped input, publication, frame, native command and API callbacks with
// a fake frame clock. Rendering and native history are observations, not DOM/OS tests.
function fixture(raw = '- [ ] 가상 입력') {
  const events = new Map<string, (event?: any) => void>();
  const frames = new Map<number, () => void>();
  const paints: Paint[] = [], changes: Change[] = [], timeline: string[] = [];
  const pickerTypes: (string | undefined)[] = [], nativeTypes: string[] = [];
  const nativeHistory: Paint[] = [], nativeCalls: string[] = [], cancelled: number[] = [];
  const classes = new Set<string>();
  let nextFrameId = 0, removed = 0, disconnected = 0, listenersRemoved = 0;
  let context: vm.Context;
  const textarea = {
    value: raw, selectionStart: raw.length, selectionEnd: raw.length, selectionDirection: 'none',
    scrollTop: 70, scrollLeft: 8, readOnly: false,
    focus() { doc.activeElement = textarea; },
    setSelectionRange(start: number, end: number, direction = 'none') {
      this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;
    },
  };
  const doc = {
    activeElement: textarea,
    execCommand(command: string, _ui?: unknown, text?: string) {
      nativeCalls.push(command);
      if (command === 'insertText') {
        nativeHistory.push({ raw: textarea.value, selection: {
          start: textarea.selectionStart, end: textarea.selectionEnd, direction: textarea.selectionDirection,
        } });
        const caret = textarea.selectionStart + String(text).length;
        textarea.value = textarea.value.slice(0, textarea.selectionStart) + text + textarea.value.slice(textarea.selectionEnd);
        textarea.setSelectionRange(caret, caret);
        nativeTypes.push('insertText');
        events.get('input')!({ inputType: 'insertText' });
      } else if (command === 'undo') {
        const before = nativeHistory.pop();
        if (before) {
          textarea.value = before.raw;
          textarea.setSelectionRange(before.selection.start, before.selection.end, before.selection.direction);
          nativeTypes.push('historyUndo');
          events.get('input')!({ inputType: 'historyUndo' });
        }
      }
      return true;
    },
  };
  context = vm.createContext({
    textarea, doc, viewport: {}, root: {
      dataset: {}, remove() { removed++; },
      classList: { add: (name: string) => classes.add(name), remove: (name: string) => classes.delete(name) },
    },
    composing: false, compositionAnchor: 0, destroyed: false, nativeDepth: 0, pendingChange: false,
    nextTabLeaves: false, lastReported: raw, selection: { start: raw.length, end: raw.length, direction: 'none' },
    inputEpoch: 0, indentLease: null, inputRejected: false, pasteSource: null, renderFrame: 0,
    foldedIds: new Set(), gesture: null, moveState: null, mode: 'live', readingView: false,
    rows: [], checkButtons: [], rowButtons: [], listeners: [],
    blurReveals: 0, endReveals: 0, focusedReveals: 0,
    config: {
      onChange(value: string, input: { inputType?: string; inputSplice?: Change['inputSplice'] }) {
        timeline.push('change'); changes.push(plain({ raw: value, ...input }));
      },
    },
    global: {
      requestAnimationFrame(callback: () => void) {
        timeline.push('queue'); frames.set(++nextFrameId, callback); return nextFrameId;
      },
      cancelAnimationFrame(id: number) { cancelled.push(id); frames.delete(id); },
    },
    observer: { disconnect() { disconnected++; } },
    listen(_target: unknown, name: string, callback: (event?: any) => void) {
      events.set(name, callback); context.listeners.push(() => { listenersRemoved++; });
    },
    render() {
      timeline.push('render'); paints.push({ raw: textarea.value, selection: plain(context.selection) });
    },
    maybeRequestPicker(type?: string) { timeline.push('picker'); pickerTypes.push(type); },
    revealBlurredProgress() { context.blurReveals++; },
    revealEndCaret() { context.endReveals++; },
    revealFocusedCaret() { context.focusedReveals++; },
    cancelMove() {}, unfoldAll() {}, captureBlurReveal() {}, captureEndCaretReveal() {},
    syncGeometry() {}, onKeydown() {}, copyPresentation() {},
    setMoveState() {}, focusMoveTarget() {}, prepareAction() {}, prepareMove() {}, toggleFold() {}, isFolded() {},
  });
  vm.runInContext(
    section('    function remember() {', '    let inputEpoch = 0;') +
    section('    function publish(', '    function captureBlurReveal(event) {') +
    section('    function action(kind, lineIndex, details) {', '    function finishGesture() {') +
    section('    function rejectInput(intent) {', '    function onKeydown(event) {') +
    section("    listen(textarea, 'input',", "    listen(viewport, 'pointerdown',") +
    section('    const api = {', '    return Object.freeze(api);') + '\nglobalThis.editorApi = api;',
    context,
  );
  const fire = (name: string, event: Record<string, unknown> = {}) => {
    const callback = events.get(name); assert(callback, `missing listener ${name}`); callback(event);
  };
  return {
    context, textarea, doc, frames, paints, changes, timeline, pickerTypes, nativeTypes, nativeCalls, nativeHistory, cancelled, classes,
    api: context.editorApi,
    fire,
    input(value: string, type = 'insertText', selection: Selection = { start: value.length, end: value.length, direction: 'none' }) {
      textarea.value = value; textarea.setSelectionRange(selection.start, selection.end, selection.direction);
      fire('input', { inputType: type });
    },
    frame() {
      const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback());
    },
    eval(code: string) { return vm.runInContext(code, context); },
    teardown: () => ({ removed, disconnected, listenersRemoved }),
  };
}

test('ordinary input publishes exact RAW and save/protection callback before scheduling its paint', () => {
  const f = fixture(), raw = '- [ ] 가상 한글😀 입력';
  let savedRaw = '', dirty = false;
  const onChange = f.context.config.onChange;
  f.context.config.onChange = (value: string, input: any) => { onChange(value, input); savedRaw = value; dirty = true; };
  f.input(raw);
  assert.equal(savedRaw, raw); assert.equal(dirty, true);
  assert.deepEqual(f.changes, [{ raw, inputType: 'insertText' }]);
  assert.equal(f.textarea.value, raw); assert.equal(f.paints.length, 0); assert.equal(f.frames.size, 1);
  assert.deepEqual(f.timeline, ['change', 'queue', 'picker']);
  f.frame();
  assert.equal(f.paints.length, 1); assert.equal(f.paints[0].raw, raw); assert.equal(f.changes.length, 1);
});

test('several same-frame inputs publish every change and paint only the final value and selection', () => {
  const f = fixture('가상');
  f.input('가상a'); f.input('가상ab'); f.input('가상a', 'deleteContentBackward', { start: 1, end: 2, direction: 'backward' });
  assert.deepEqual(f.changes, [
    { raw: '가상a', inputType: 'insertText' }, { raw: '가상ab', inputType: 'insertText' },
    { raw: '가상a', inputType: 'deleteContentBackward' },
  ]);
  assert.equal(f.frames.size, 1); assert.equal(f.paints.length, 0);
  f.frame();
  assert.deepEqual(f.paints, [{ raw: '가상a', selection: { start: 1, end: 2, direction: 'backward' } }]);
  assert.deepEqual(f.pickerTypes, ['insertText', 'insertText', 'deleteContentBackward']);
});

test('input, selection listeners and repeated host refresh share one pending frame', () => {
  const f = fixture(); f.input('- [ ] 최근 입력');
  f.fire('keyup', { key: '력' }); f.fire('select'); f.fire('click'); f.fire('selectionchange');
  f.api.refresh(); f.api.refresh(); f.api.refresh();
  assert.equal(f.frames.size, 1); assert.equal(f.timeline.filter(event => event === 'queue').length, 1);
  assert.equal(f.paints.length, 0); f.frame(); assert.equal(f.paints.length, 1);
});

test('frame remembers a restored selection even when selectionchange has not fired', () => {
  const f = fixture(); f.input('- [ ] 복원할 선택', 'historyUndo');
  f.textarea.setSelectionRange(2, 7, 'backward');
  f.frame();
  assert.deepEqual(f.paints[0].selection, { start: 2, end: 7, direction: 'backward' });
  const selection = f.api.getSelection();
  assert.equal(selection.start, 2); assert.equal(selection.end, 7); assert.equal(selection.direction, 'backward');
  assert.equal(f.changes[0].inputType, 'historyUndo');
});

test('a completed frame releases the slot for the next input without scheduling extra paints', () => {
  const f = fixture('가상'); f.input('가상1'); f.frame();
  assert.equal(f.context.renderFrame, 0); assert.equal(f.frames.size, 0);
  f.input('가상12'); f.api.refresh(); assert.equal(f.frames.size, 1); f.frame();
  assert.deepEqual(f.paints.map(paint => paint.raw), ['가상1', '가상12']);
  assert.equal(f.timeline.filter(event => event === 'queue').length, 2);
});

test('unchanged RAW does not publish twice while its duplicate input and refresh stay coalesced', () => {
  const f = fixture(); f.input('- [ ] 한번 입력'); f.fire('input', {}); f.api.refresh();
  assert.equal(f.changes.length, 1); assert.equal(f.frames.size, 1); f.frame();
  assert.equal(f.paints.length, 1); assert.equal(f.changes.length, 1);
  assert.deepEqual(f.pickerTypes, ['insertText', 'insertText']);
});

test('onChange protection can restore rejected RAW immediately and the queued paint sees the restoration', () => {
  const f = fixture('- [ ] 보호된 원문'), original = f.textarea.value;
  f.context.config.onChange = () => {
    f.textarea.value = original; f.textarea.setSelectionRange(3, 3); f.context.lastReported = original;
  };
  f.input('- [ ] 거절될 입력');
  assert.equal(f.textarea.value, original); assert.equal(f.paints.length, 0); assert.equal(f.frames.size, 1);
  f.frame();
  assert.deepEqual(f.paints, [{ raw: original, selection: { start: 3, end: 3, direction: 'none' } }]);
});

test('paste publishes its exact splice immediately and frame coalescing never changes clipboard RAW', () => {
  const f = fixture('앞가상뒤'); f.textarea.setSelectionRange(1, 3); f.fire('paste');
  const raw = '앞한글😀\n두 줄뒤';
  f.input(raw, 'insertFromPaste');
  assert.deepEqual(f.changes, [{ raw, inputType: 'insertFromPaste', inputSplice: { start: 1, end: 3, text: '한글😀\n두 줄' } }]);
  assert.equal(f.paints.length, 0); assert.equal(f.frames.size, 1); f.frame(); assert.equal(f.textarea.value, raw);
});

test('IME start, composing input and composition end retain synchronous paints and one final publication', () => {
  const f = fixture(); f.fire('compositionstart');
  assert.equal(f.paints.length, 1); assert(f.classes.has('tle-composing')); assert.equal(f.frames.size, 0);
  f.textarea.value = '- [ ] 한글 조합'; f.textarea.setSelectionRange(9, 9);
  f.fire('input', { isComposing: true, inputType: 'insertCompositionText' });
  assert.equal(f.paints.length, 2); assert.equal(f.changes.length, 0); assert.equal(f.frames.size, 0);
  f.fire('compositionend');
  assert.equal(f.paints.length, 3); assert.equal(f.frames.size, 0); assert(!f.classes.has('tle-composing'));
  assert.deepEqual(f.changes, [{ raw: '- [ ] 한글 조합', inputType: 'insertCompositionText' }]);
  f.fire('input', { inputType: 'insertText' });
  assert.equal(f.changes.length, 1); assert.equal(f.frames.size, 1); f.frame(); assert.equal(f.paints.length, 4);
});

test('publish defaults to synchronous rendering and native replacement reports only after its native input', () => {
  const f = fixture('가상 RAW');
  const guarded: string[] = [];
  f.context.config.canApplyInput = (value: string) => { guarded.push(value); return true; };
  const scroll = [f.textarea.scrollTop, f.textarea.scrollLeft];
  assert.equal(f.api.replaceRange(3, 6, '한글😀'), true);
  assert.deepEqual(guarded, ['가상 한글😀']); assert.deepEqual(f.nativeCalls, ['insertText']);
  assert.deepEqual(f.nativeTypes, ['insertText']); assert.equal(f.nativeHistory.length, 1);
  assert.deepEqual(f.changes, [{ raw: '가상 한글😀' }]);
  assert.equal(f.paints.length, 1); assert.equal(f.frames.size, 0);
  assert.deepEqual([f.textarea.scrollTop, f.textarea.scrollLeft], scroll);
  assert.equal(f.context.nativeDepth, 0); assert.equal(f.context.pendingChange, false);
});

test('native Undo restores RAW and publishes synchronously without a fabricated history fallback', () => {
  const f = fixture('가상 RAW'); f.textarea.setSelectionRange(3, 6, 'backward');
  assert.equal(f.api.replaceRange(3, 6, '새 입력'), true);
  assert.equal(f.api.undo(), true);
  assert.equal(f.textarea.value, '가상 RAW'); assert.equal(f.nativeHistory.length, 0);
  assert.deepEqual(f.nativeCalls, ['insertText', 'undo']); assert.deepEqual(f.nativeTypes, ['insertText', 'historyUndo']);
  assert.deepEqual(f.changes.map(change => change.raw), ['가상 새 입력', '가상 RAW']);
  assert.equal(f.paints.length, 2); assert.equal(f.frames.size, 0);
  assert.deepEqual(f.paints[1].selection, { start: 3, end: 6, direction: 'none' });
});

test('native source replacement protection still runs before RAW, history, publication or rendering changes', () => {
  const f = fixture('가상 RAW'), rejected: unknown[] = [];
  f.context.config.canApplyInput = () => false; f.context.config.onInputRejected = (intent: unknown) => rejected.push(intent);
  assert.equal(f.api.replaceRange(3, 6, '거절'), false);
  assert.equal(f.textarea.value, '가상 RAW'); assert.equal(rejected.length, 1);
  assert.equal(f.nativeCalls.length, 0); assert.equal(f.nativeHistory.length, 0);
  assert.equal(f.changes.length, 0); assert.equal(f.paints.length, 0); assert.equal(f.frames.size, 0);
});

test('source action receives current native RAW and selection immediately while a paint is pending', () => {
  const f = fixture(), actions: any[] = [];
  f.context.config.onAction = (action: unknown) => { actions.push(plain(action)); return true; };
  f.input('- [ ] 현재 행동', 'insertText', { start: 2, end: 5, direction: 'backward' });
  assert.equal(f.eval("action('toggle', 0, { targetId: 'fake-target' })"), true);
  assert.equal(actions.length, 1); assert.equal(actions[0].value, '- [ ] 현재 행동');
  assert.equal(actions[0].lineText, '- [ ] 현재 행동'); assert.equal(actions[0].targetId, 'fake-target');
  assert.equal(actions[0].selection.start, 2); assert.equal(actions[0].selection.end, 5); assert.equal(actions[0].selection.direction, 'backward');
  assert.equal(f.paints.length, 0); assert.equal(f.frames.size, 1); assert.equal(f.changes.length, 1);
});

test('destroy cancels its frame and an already-captured callback cannot render, reveal or publish afterward', () => {
  const f = fixture(); f.input('- [ ] 폐기 전 입력');
  const callback = [...f.frames.values()][0], frameId = f.context.renderFrame;
  assert(callback); f.api.destroy();
  assert.deepEqual(f.cancelled, [frameId]); assert.equal(f.frames.size, 0);
  assert.equal(f.teardown().removed, 1); assert.equal(f.teardown().disconnected, 1); assert(f.teardown().listenersRemoved > 0);
  callback(); f.api.refresh(); f.api.destroy();
  assert.equal(f.paints.length, 0); assert.equal(f.context.blurReveals, 0); assert.equal(f.context.endReveals, 0);
  assert.equal(f.changes.length, 1); assert.equal(f.frames.size, 0); assert.equal(f.context.renderFrame, 0);
  assert.equal(f.teardown().removed, 1);
});
