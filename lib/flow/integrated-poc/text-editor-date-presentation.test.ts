import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M, type TextEditorRowMeta } from './text-workspace';

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
  readonly attributes = new Map<string, string>();
  readonly styles = new Map<string, string>();
  readonly style = { setProperty: (name: string, value: string) => this.styles.set(name, value) };
  readonly classList = {
    add: (...names: string[]) => names.forEach(name => this.classes.add(name)),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, on: boolean) => on ? this.classes.add(name) : this.classes.delete(name),
  };
  hidden = false;
  tabIndex = -1;
  title = '';
  constructor(readonly nodeType = 1, private text = '') {}
  set className(value: string) { this.classes.clear(); value.split(/\s+/).filter(Boolean).forEach(name => this.classes.add(name)); }
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
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  addEventListener() {}
  remove() {}
  focus() {}
  querySelectorAll(selector: string): Node[] {
    const name = selector.slice(1);
    return this.children.flatMap(node => [...(node.classes.has(name) ? [node] : []), ...node.querySelectorAll(selector)]);
  }
  find(name: string): Node | undefined {
    return this.classes.has(name) ? this : this.children.map(node => node.find(name)).find(Boolean);
  }
}

function documentFixture(raw: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '날짜 표시' });
  const id = state.documents[0].id;
  state = M.editText(state, id, raw);
  assert.equal(M.raw(M.getDocument(state, id)), raw);
  return { state, id };
}

// Execute the shipped paint/native functions with real model metadata. This
// verifies DOM, bytes and command boundaries, not browser wrapping or OS IME.
function fixture(raw: string, metadata: TextEditorRowMeta[], options: { mode?: string; focused?: boolean; composing?: boolean; fenced?: boolean } = {}) {
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
  const mirror = new Node(), root = new Node(), controls = new Node();
  const context: any = vm.createContext({
    textarea, mirror, root, controls, CHECK_KINDS: ['task', 'reference', 'subcheck'],
    DATE: /^(\d{4})-(\d{2})-(\d{2})$/,
    TASK: /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\](\s+)(.*)$/,
    EMPTY_TASK: /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\]\s*$/,
    PROPERTY: /^(?: {2,}|\t+)-\s+(?:날짜|메모|시간):/, MAX_DEPTH: 32,
    destroyed: false, readingView: false, mode: options.mode ?? 'live', composing: options.composing ?? false,
    compositionAnchor: raw.length, selection: { start: raw.length, end: raw.length, direction: 'none' },
    gesture: null, moveState: null, foldedIds: new Set(), hiddenRows: new Set(), rows: [],
    checkButtons: [], rowButtons: [], foldButtons: [], renderedValue: null,
    inputEpoch: 0, indentLease: null, inputRejected: false, nativeDepth: 0, pendingChange: false, lastReported: raw,
    global: { getSelection: () => ({ isCollapsed: true }) },
    config: { onChange: (value: string) => writes.push(value) },
    doc: {
      activeElement: options.focused || options.composing ? textarea : new Node(),
      createElement: () => new Node(), createElementNS: () => new Node(), createDocumentFragment: () => new Node(11),
      createRange() {
        let text: Node, start = 0, end = 0;
        return {
          setStart(node: Node, offset: number) { assert.equal(node.nodeType, 3); text = node; start = offset; },
          setEnd(node: Node, offset: number) { assert.equal(node, text); end = offset; },
          getBoundingClientRect() { return { width: (end - start) * 4.5 }; },
        };
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
    applyFoldView() {}, cancelMove() {}, unfoldAll() {}, viewAnchor: () => null, restoreViewAnchor() {},
    syncGeometry() { vm.runInContext('rows.forEach(syncRowIndent)', context); }, paintMoveState() {}, addFoldButton() {}, gestureHandle() {}, maybeRequestPicker() {},
    canApplyInput: () => true,
  });
  vm.runInContext(section('  function progressPercent(meta) {', '  function protectedFenceLines(lines) {') +
    section('    function remember() {', '    let inputEpoch =') +
    section('    function publish(inputType, inputSplice) {', '    function scheduleRender() {') +
    section('    function makeSpan(className, content) {', '    function scrollSurface() {') +
    section('    function syncRowIndent(row) {', '    function syncReadingTaskInset(row) {') +
    section('    function icon(kind) {', '    function addFoldButton(') +
    section('    function render() {', '    function rejectInput(intent) {') +
    section('    function replaceRange(start, end, text, settings) {', '    function onKeydown(event) {'), context);
  const render = () => vm.runInContext('render()', context);
  render();
  return { context, textarea, mirror, controls, commands, writes, render, assignments: () => assignments,
    replace: (start: number, end: number, text: string) => {
      context.request = { start, end, text };
      return vm.runInContext('replaceRange(request.start, request.end, request.text)', context);
    }, undo: () => vm.runInContext('undo()', context) };
}

test('real metadata keeps scheduled date and latest progress-record date distinct in shipped passive paint', () => {
  const raw = '[2026-10-06]\n- [ ] 제출\n  - 날짜: 2026-10-07';
  let { state, id } = documentFixture(raw);
  state = M.recordProgress(state, M.tasks(state)[0].id, '2026-10-08', 35);
  const before = structuredClone(state), metadata = textEditorRows(state, id);
  assert.equal(metadata[1].dateMismatch, '10.07');
  assert.equal(metadata[1].progressDate, '2026-10-08');
  const f = fixture(raw, metadata), scheduled = f.controls.find('tle-scheduled-date-open')!;
  assert.equal(scheduled.find('tle-row-date-kind')!.textContent, '예정일');
  assert.equal(scheduled.find('tle-row-date')!.textContent, '10/07');
  assert.match(scheduled.getAttribute('aria-label')!, /예정일 10월 7일/);
  assert.doesNotMatch(scheduled.textContent, /8일|진행/);
  assert.match(f.controls.find('tle-progress-hit')!.title, /진행 기록 10월 8일 \(목\)/);
  assert.equal(f.mirror.children[2].find('tle-property-date-label')!.textContent, '예정일 10월 7일 (수)');
  assert.equal(f.mirror.children[2].find('tle-date-source')!.textContent, raw.split('\n')[2]);
  assert.equal(f.assignments(), 0); assert.deepEqual(f.commands, []); assert.deepEqual(f.writes, []);
  assert.deepEqual(state, before); assert.equal(f.textarea.value, raw);
});

test('compact scheduled badges retain full accessible meaning and never rewrite raw or command targets', () => {
  for (const [value, compact, spoken] of [['10.10', '10/10', '10월 10일'], ['01.02', '01/02', '1월 2일'], ['미정', '미정', '미정']] as const) {
    const raw = '비교 메모\n- [ ] 가상 확인\n계속 메모', { state, id } = documentFixture(raw);
    const metadata = textEditorRows(state, id).map(row => ({ ...row, dateMismatch: value }));
    const f = fixture(raw, metadata), badge = f.controls.find('tle-scheduled-date-open')!;
    assert.equal(badge.find('tle-row-date-kind')!.textContent, '예정일');
    assert.equal(badge.find('tle-row-date')!.textContent, compact);
    assert.match(badge.getAttribute('aria-label')!, new RegExp(`예정일 ${spoken}`));
    assert.equal(badge.dataset.action, 'task-date');
    assert.equal(f.textarea.value, raw); assert.equal(f.assignments(), 0);
    assert.deepEqual(f.commands, []); assert.deepEqual(f.writes, []);
  }
});

test('passive date properties format valid values and undated while invalid/orphan text stays literal', () => {
  for (const [value, expected] of [['2026-02-28', '예정일 2월 28일 (토)'], ['미정', '예정일 미정'], ['2026-02-29', null]] as const) {
    const raw = `- [ ] 할 일\n  - 날짜: ${value}`, { state, id } = documentFixture(raw);
    const f = fixture(raw, textEditorRows(state, id)), row = f.mirror.children[1];
    assert.equal(row.find('tle-property-date-label')?.textContent ?? null, expected);
    if (expected === null) assert.equal(row.textContent, raw.split('\n')[1]);
    assert.equal(f.textarea.value, raw); assert.equal(f.assignments(), 0);
  }
  for (const raw of ['  - 날짜: 2026-10-07', '- 자유 메모\n  - 날짜: 2026-10-07']) {
    const { state, id } = documentFixture('');
    // Orphan input can be rejected by editText. Parse the unsaved raw rows for
    // the paint guard, and also exercise the prior committed metadata fallback.
    const doc = { ...M.getDocument(state, id)!, lines: raw.split('\n').map((text, index) => ({ id: `raw-${index}`, text })) };
    const metadata: TextEditorRowMeta[] = M.parseDocument(doc, state).rows.map(row => ({
      id: row.id, kind: row.kind, depth: row.depth, isCanonical: !!row.isCanonical,
      guideLevels: row.guideLevels, subtreeEndIndex: row.subtreeEndIndex, label: row.text,
    }));
    for (const rows of [metadata, textEditorRows(state, id)]) {
      const f = fixture(raw, rows);
      assert(!f.mirror.find('tle-property-date-label')); assert.equal(f.textarea.value, raw);
    }
  }
  const raw = '- [ ] 할 일\n  - 메모: 날짜: 2026-10-07';
  {
    const { state, id } = documentFixture(raw), f = fixture(raw, textEditorRows(state, id));
    assert(!f.mirror.find('tle-property-date-label')); assert.equal(f.textarea.value, raw);
  }
});

test('explicit raw, selected date editing, composition and protected code retain the exact native date ruler', () => {
  const raw = '- [ ] 할 일\n  - 날짜: 2026-10-07', { state, id } = documentFixture(raw), metadata = textEditorRows(state, id);
  for (const options of [{ mode: 'text' }, { focused: true }, { composing: true }, { fenced: true }]) {
    const f = fixture(raw, metadata, options), row = f.mirror.children[1];
    assert.equal(row.firstChild!.nodeType, 3); assert.equal(row.firstChild!.textContent, raw.split('\n')[1]);
    assert(!row.find('tle-property-date-label')); assert(!row.find('tle-active-paint'));
    // The source spaces are measured from the native mirror, not a zero-glyph ch ruler.
    assert.equal(row.styles.get('--tle-indent'), '9px'); assert.equal(f.assignments(), 0);
  }
});

test('repainting a multiline date selection preserves native UTF-16 offsets, direction and scroll', () => {
  const raw = '[2026-10-07]\n- [ ] 한글😀\n  - 날짜: 미정', { state, id } = documentFixture(raw);
  const f = fixture(raw, textEditorRows(state, id), { focused: true });
  f.textarea.setSelectionRange(2, raw.length, 'backward'); vm.runInContext('remember()', f.context);
  const before = { start: f.textarea.selectionStart, end: f.textarea.selectionEnd, direction: f.textarea.selectionDirection,
    top: f.textarea.scrollTop, left: f.textarea.scrollLeft };
  f.render(); f.render();
  assert.deepEqual(f.mirror.children.map(row => row.firstChild!.textContent), raw.split('\n'));
  assert.deepEqual({ start: f.textarea.selectionStart, end: f.textarea.selectionEnd, direction: f.textarea.selectionDirection,
    top: f.textarea.scrollTop, left: f.textarea.scrollLeft }, before);
  assert.equal(f.assignments(), 0); assert.equal(f.textarea.value, raw);
});

test('date replacement and Undo still use the same browser command path with no paint writes', () => {
  const raw = '- [ ] 한글😀\n  - 날짜: 2026-10-07', { state, id } = documentFixture(raw);
  const f = fixture(raw, textEditorRows(state, id), { focused: true }), textarea = f.textarea;
  assert.equal(f.replace(raw.length - 2, raw.length, '09'), true);
  assert.equal(f.textarea, textarea); assert.equal(f.textarea.value, raw.slice(0, -2) + '09');
  const count = f.assignments(); f.render(); f.render(); assert.equal(f.assignments(), count);
  assert.equal(f.undo(), true); assert.equal(f.textarea, textarea); assert.equal(f.textarea.value, raw);
  assert.deepEqual(f.commands, ['insertText', 'undo']); assert.deepEqual(f.writes, [raw.slice(0, -2) + '09', raw]);
  f.context.composing = true;
  assert.equal(f.replace(0, 0, '입력'), false); assert.equal(f.undo(), false);
  assert.deepEqual(f.commands, ['insertText', 'undo']); assert.equal(f.textarea.value, raw);
});

test('date decorations add no input geometry or pointer owner; schedule button stays in the reserved gutter', () => {
  const propertyRule = /\.tle-property-date-label\s*\{([^}]*)\}/.exec(css)![1];
  assert.doesNotMatch(propertyRule, /padding|font-size|line-height|letter-spacing|white-space|transform|pointer-events/);
  assert.match(css, /\.tle-date-source\s*\{\s*visibility:\s*hidden/);
  assert.match(css, /\.tle-date-label\s*\{[^}]*position:\s*absolute/);
  assert.match(css, /--tle-pad-right:\s*110px/);
  assert.match(css, /\.tle-scheduled-date-open\s*\{\s*width:\s*88px/);
  assert.match(css, /\.tle-row-open\s*\{[^}]*height:\s*44px/);
  const helpers = section('    function scheduledDateLabel(', '    function paintActiveSyntax(');
  assert.doesNotMatch(helpers, /textarea\.|setSelectionRange|\.focus\(|\.blur\(|execCommand|publish\(|localStorage/);
});
