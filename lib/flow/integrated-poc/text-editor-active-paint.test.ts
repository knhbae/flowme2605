import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
const css = readFileSync(new URL('./vendor/text-editor.css', import.meta.url), 'utf8');
function section(start: string, end: string) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a);
  return source.slice(a, b);
}

class Node {
  readonly children: Node[] = [];
  readonly classes = new Set<string>();
  readonly dataset: Record<string, string> = {};
  readonly styles = new Map<string, string>();
  readonly attributes = new Map<string, string>();
  readonly style = { setProperty: (name: string, value: string) => this.styles.set(name, value) };
  readonly classList = {
    add: (...names: string[]) => names.forEach(name => this.classes.add(name)),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, on: boolean) => on ? this.classes.add(name) : this.classes.delete(name),
  };
  hidden = false;
  tabIndex = -1;
  constructor(readonly nodeType = 1, private text = '') {}
  set className(value: string) { this.classes.clear(); value.split(/\s+/).filter(Boolean).forEach(name => this.classes.add(name)); }
  get className() { return [...this.classes].join(' '); }
  get firstChild() { return this.children[0] ?? null; }
  set textContent(value: string) {
    this.children.length = 0;
    if (this.nodeType === 3) this.text = value;
    else if (value) this.children.push(new Node(3, value));
  }
  get textContent(): string { return this.nodeType === 3 ? this.text : this.children.map(node => node.textContent).join(''); }
  append(...nodes: Node[]) { nodes.forEach(node => this.children.push(...(node.nodeType === 11 ? node.children : [node]))); }
  replaceChildren(...nodes: Node[]) { this.children.length = 0; this.append(...nodes); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  addEventListener() {}
  remove() {}
  focus() {}
  find(name: string): Node | undefined {
    return this.classes.has(name) ? this : this.children.map(node => node.find(name)).find(Boolean);
  }
  querySelectorAll(selector: string): Node[] {
    const name=selector.slice(1);
    return [...(this.classes.has(name)?[this]:[]),...this.children.flatMap(node=>node.querySelectorAll(selector))];
  }
}

// Run the shipped render and input functions. This fixture proves their DOM,
// byte and transaction contracts, not browser wrapping or a native Korean IME.
function fixture(raw: string, metadata: Record<number, any>, options: { mode?: string; composing?: boolean; fenced?: boolean; disabled?: boolean } = {}) {
  let buffer = raw, assignments = 0;
  const commands: string[] = [], history: string[] = [], writes: string[] = [];
  const textarea = {
    get value() { return buffer; }, set value(value: string) { assignments++; buffer = value; },
    selectionStart: raw.length, selectionEnd: raw.length, selectionDirection: 'none',
    scrollTop: 33, scrollLeft: 4, classList: { contains: () => false },
    setSelectionRange(start: number, end: number, direction = 'none') {
      this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;
    },
    focus() { context.doc.activeElement = textarea; },
  };
  const mirror = new Node(), root = new Node();
  const context: any = vm.createContext({
    textarea, mirror, root, controls: new Node(), CHECK_KINDS: ['task', 'reference', 'subcheck'],
    TASK: /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\](\s+)(.*)$/,
    EMPTY_TASK: /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\]\s*$/,
    PROPERTY: /^(?: {2,}|\t+)-\s+(?:날짜|메모|시간):/, MAX_DEPTH: 32,
    destroyed: false, readingView: false, mode: options.mode ?? 'live', composing: options.composing ?? false,
    compositionAnchor: raw.length, selection: { start: raw.length, end: raw.length, direction: 'none' },
    gesture: null, moveState: null, foldedIds: new Set(), hiddenRows: new Set(), rows: [],
    checkButtons: [], rowButtons: [], foldButtons: [], renderedValue: null,
    inputEpoch: 0, indentLease: null, inputRejected: false, nativeDepth: 0, pendingChange: false, lastReported: raw,
    global: { getSelection: () => ({ isCollapsed: true }) },
    config: { isActionDisabled: () => options.disabled ?? false, onChange: (value: string) => writes.push(value) },
    doc: {
      activeElement: textarea,
      createElement: () => new Node(), createElementNS: () => new Node(), createDocumentFragment: () => new Node(11),
      createRange() {
        let node: Node, start=0, end=0;
        return {setStart(next: Node,offset:number){node=next;start=offset;},setEnd(next: Node,offset:number){assert.equal(next,node);end=offset;},
          getBoundingClientRect(){return {width:node.textContent.slice(start,end).split('').reduce((sum,c)=>sum+(c==='\t'?18:4.5),0)};}};
      },
      execCommand(command: string, _ui: unknown, text: string) {
        commands.push(command);
        if (command === 'insertText') {
          history.push(buffer);
          textarea.value = buffer.slice(0, textarea.selectionStart) + text + buffer.slice(textarea.selectionEnd);
        } else if (command === 'undo' && history.length) textarea.value = history.pop()!;
      },
    },
    getRowMeta: () => metadata, protectedFenceLines: (lines: string[]) => lines.map(() => options.fenced ?? false),
    dateLabel: () => null, applyFoldView() {}, cancelMove() {}, unfoldAll() {},
    viewAnchor: () => null, restoreViewAnchor() {}, syncGeometry() {vm.runInContext('rows.forEach(syncRowIndent)',context);}, paintMoveState() {},
    addRowButton() {}, addFoldButton() {}, gestureHandle() {}, maybeRequestPicker() {},
    canApplyInput: () => true,
  });
  vm.runInContext(section('  function progressPercent(meta) {', '  function dateLabel(line) {') +
    section('    function remember() {', '    let inputEpoch =') +
    section('    function publish(inputType, inputSplice) {', '    function scheduleRender() {') +
    section('    function makeSpan(className, content) {', '    function scrollSurface() {') +
    section('    function syncRowIndent(row) {', '    function syncGeometry() {') +
    section('    function icon(kind) {', '    function addRowButton(') +
    section('    function render() {', '    function rejectInput(intent) {') +
    section('    function replaceRange(start, end, text, settings) {', '    function onKeydown(event) {'), context);
  const render = () => vm.runInContext('render()', context);
  render();
  return { context, textarea, mirror, commands, writes, render, assignments: () => assignments,
    replace: (start: number, end: number, text: string) => {
      context.request = { start, end, text };
      return vm.runInContext('replaceRange(request.start, request.end, request.text)', context);
    }, undo: () => vm.runInContext('undo()', context) };
}

test('active task paint keeps the exact first RAW Text node and original prefix/title advances', () => {
  const raw = '    - [ ] 한글😀 긴 제목', f = fixture(raw, { 0: { kind: 'task', progressPercent: 0 } });
  const row = f.mirror.children[0], paint = row.find('tle-active-paint')!;
  assert.equal(row.firstChild!.nodeType, 3); assert.equal(row.firstChild!.textContent, raw);
  assert.equal(paint.children[0].textContent, '    - [ ] ');
  assert.equal(paint.children[1].textContent, '한글😀 긴 제목');
  assert.equal(row.styles.get('--tle-indent'), '18px');
  assert.equal(paint.find('tle-check-glyph')!.dataset.checked, 'false');
  assert.equal(f.assignments(), 0); assert.deepEqual(f.commands, []); assert.deepEqual(f.writes, []);
});

test('active folder and Flow names use exact typed text instead of the displaced reading label', () => {
  for (const scopeKind of ['folder', 'flow']) {
    const raw = '\t- 입력한 이름😀', f = fixture(raw, { 0: { kind: 'scope', scopeKind, label: '이전 저장 이름' } });
    const row = f.mirror.children[0], paint = row.find('tle-active-paint')!;
    assert.equal(row.firstChild!.textContent, raw);
    assert.equal(paint.children[0].textContent, '\t- ');
    assert.equal(paint.find('tle-active-scope-name')!.textContent, '입력한 이름😀');
    assert(paint.find('tle-active-scope-icon')); assert(!row.find('tle-scope-label'));
    assert.equal(f.assignments(), 0); assert.deepEqual(f.commands, []);
  }
});

test('selected active lines keep native selection direction, scroll and RAW ruler through repaint', () => {
  const raw = '- [ ] 첫 제목\n- 폴더😀\n자유 메모';
  const f = fixture(raw, { 0: { kind: 'task' }, 1: { kind: 'scope', scopeKind: 'folder' } });
  f.textarea.setSelectionRange(2, raw.indexOf('\n자유'), 'backward');
  vm.runInContext('remember()', f.context);
  const before = { start: f.textarea.selectionStart, end: f.textarea.selectionEnd, direction: f.textarea.selectionDirection,
    top: f.textarea.scrollTop, left: f.textarea.scrollLeft };
  f.render(); f.render();
  assert(f.mirror.children[0].find('tle-active-paint')); assert(f.mirror.children[1].find('tle-active-paint'));
  assert.deepEqual(f.mirror.children.map(row => row.firstChild!.textContent), raw.split('\n'));
  assert.deepEqual({ start: f.textarea.selectionStart, end: f.textarea.selectionEnd, direction: f.textarea.selectionDirection,
    top: f.textarea.scrollTop, left: f.textarea.scrollLeft }, before);
  assert.equal(f.assignments(), 0); assert.equal(f.textarea.value, raw);
});

test('raw mode, composition, protected code and ordinary memo retain the existing literal paint', () => {
  for (const options of [{ mode: 'text' }, { composing: true }, { fenced: true }]) {
    const raw = '- [ ] 원문', f = fixture(raw, { 0: { kind: 'task' } }, options);
    assert.equal(f.mirror.children[0].children.length, 1);
    assert.equal(f.mirror.children[0].firstChild!.textContent, raw);
    assert(!f.mirror.children[0].find('tle-active-paint')); assert.equal(f.assignments(), 0);
  }
  const f = fixture('그대로 적는 메모', { 0: { kind: 'note' } });
  assert(!f.mirror.children[0].find('tle-active-paint'));
});

test('completed checks and intermediate progress keep their display without new native commands', () => {
  for (const [percent, marker] of [[100, 'x'], [25, '25']] as const) {
    const raw = `- [${marker}] 할 일`, f = fixture(raw, { 0: { kind: 'task', progressPercent: percent } });
    const paint = f.mirror.children[0].find('tle-active-paint')!;
    assert.equal(paint.find('tle-check-glyph')!.dataset.checked, String(percent === 100));
    if (percent === 100) assert.equal(paint.find('tle-task-title-complete')!.textContent, '할 일');
    else assert.equal(paint.find('tle-progress-badge')!.textContent, '25%');
    assert.equal(f.assignments(), 0); assert.deepEqual(f.commands, []);
  }
});

test('active paint leaves shipped replacement and Undo on the same native command path', () => {
  const raw = '- [ ] 한글 제목', f = fixture(raw, { 0: { kind: 'task' } });
  const textarea = f.textarea;
  assert.equal(f.replace(raw.length, raw.length, ' 추가😀'), true);
  assert.equal(f.textarea, textarea); assert.equal(f.textarea.value, `${raw} 추가😀`);
  assert.equal(f.mirror.children[0].firstChild!.textContent, `${raw} 추가😀`);
  const assignments = f.assignments(); f.render(); f.render(); assert.equal(f.assignments(), assignments);
  assert.equal(f.undo(), true); assert.equal(f.textarea, textarea); assert.equal(f.textarea.value, raw);
  assert.deepEqual(f.commands, ['insertText', 'undo']);
  assert.deepEqual(f.writes, [`${raw} 추가😀`, raw]);
  const commands = f.commands.length; f.context.composing = true;
  assert.equal(f.replace(0, 0, '새 입력'), false); assert.equal(f.undo(), false);
  assert.equal(f.commands.length, commands); assert.equal(f.textarea.value, raw);
});

test('active paint CSS adds no text geometry or pointer owner and preserves the native IME mask', () => {
  const paintRule = /\.tle-active-paint\s*\{([^}]*)\}/.exec(css)![1];
  assert.match(paintRule, /position:\s*absolute/); assert.match(paintRule, /inset:\s*0/);
  assert.match(paintRule, /pointer-events:\s*none/);
  assert.doesNotMatch(paintRule, /padding|font|line-height|letter-spacing|white-space|word-break|transform/);
  assert.match(css, /\.tle-active-scope-name\s*\{\s*font-weight:\s*inherit/);
  assert.match(css, /\.tle-line-raw\.tle-line-active-paint\s*\{\s*color:\s*transparent/);
  assert.match(css, /\.tle-line-composition\s*\{\s*visibility:\s*hidden/);
  assert.match(css, /mask-image:\s*linear-gradient\(to bottom,[^;]*--tle-composition-top/);
  const paint = section('    function paintActiveSyntax(', '    function scrollSurface() {');
  assert.doesNotMatch(paint, /textarea\.|setSelectionRange|\.focus\(|\.blur\(|execCommand|publish\(/);
});
