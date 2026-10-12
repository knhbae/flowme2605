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
  offsetHeight = 26;
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
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
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
function fixture(raw: string, metadata: Record<number, any>, options: { mode?: string; composing?: boolean; fenced?: boolean; disabled?: boolean; controls?: boolean } = {}) {
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
    config: { controls: options.controls, isActionDisabled: () => options.disabled ?? false, onChange: (value: string) => writes.push(value) },
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
    section('    function publish(', '    function scheduleRender() {') +
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

test('meaning-display: inactive folder and Flow kind remain inert inside the existing source anchor', () => {
  for (const scopeKind of ['folder', 'flow']) {
    const raw = `  - 가상 ${scopeKind}😀\n일반 메모`, f = fixture(raw, { 0: { kind: 'scope', scopeKind, label: `가상 ${scopeKind}😀` } });
    const row = f.mirror.children[0], anchor = row.find('tle-scope-anchor')!, meaning = anchor.find('tle-passive-scope')!;
    assert(meaning, scopeKind);
    assert.equal(meaning.dataset.scopeKind, scopeKind);
    assert.equal(row.find('tle-date-source')!.textContent, raw.split('\n')[0]);
    assert.equal(row.find('tle-scope-name')!.textContent, `가상 ${scopeKind}😀`);
    assert.equal(meaning.tabIndex, -1); assert(!meaning.attributes.has('role')); assert(!meaning.dataset.action);
    assert.equal(f.textarea.value, raw); assert.equal(f.assignments(), 0); assert.deepEqual(f.commands, []); assert.deepEqual(f.writes, []);
  }
});

test('meaning-display: inactive zero partial and complete values do not depend on a visible action button', () => {
  const raw = '- [ ] 미시작\n- [ ] 진행😀\n- [x] 완료\n다른 메모';
  const f = fixture(raw, { 0: { kind: 'task', progressPercent: 0 }, 1: { kind: 'task', progressPercent: 40 }, 2: { kind: 'task', progressPercent: 100 } }, { disabled: true });
  assert.equal(f.mirror.children[0].find('tle-check-glyph')!.dataset.checked, 'false');
  const badge = f.mirror.children[1].find('tle-check-anchor')!.find('tle-passive-progress')!;
  assert(badge); assert.equal(badge.textContent, '40%'); assert.equal(badge.tabIndex, -1); assert(!badge.dataset.action);
  assert.equal(f.mirror.children[2].find('tle-check-glyph')!.dataset.checked, 'true');
  assert.equal(f.mirror.children[2].find('tle-task-title-complete')!.textContent, '완료');
  assert.equal(f.mirror.children[0].querySelectorAll('.tle-passive-progress').length, 0);
  assert.equal(f.mirror.children[2].querySelectorAll('.tle-passive-progress').length, 0);
  const native = f.textarea, before = { start: native.selectionStart, end: native.selectionEnd, direction: native.selectionDirection, top: native.scrollTop, left: native.scrollLeft };
  f.render(); f.render();
  assert.equal(f.textarea, native); assert.equal(native.value, raw);
  assert.deepEqual({ start: native.selectionStart, end: native.selectionEnd, direction: native.selectionDirection, top: native.scrollTop, left: native.scrollLeft }, before);
  assert.equal(f.assignments(), 0); assert.deepEqual(f.commands, []); assert.deepEqual(f.writes, []);
});

test('meaning-display: literal RAW and fenced content have no passive meaning; control-free partial paint is not duplicated', () => {
  const raw = '- 폴더\n- [ ] 진행\n메모', metadata = { 0: { kind: 'scope', scopeKind: 'folder', label: '폴더' }, 1: { kind: 'task', progressPercent: 40 } };
  for (const options of [{ mode: 'text' }, { fenced: true }]) {
    const f = fixture(raw, metadata, options);
    assert.equal(f.mirror.querySelectorAll('.tle-passive-scope').length, 0);
    assert.equal(f.mirror.querySelectorAll('.tle-passive-progress').length, 0);
    assert.deepEqual(f.mirror.children.map(row => row.firstChild!.textContent), raw.split('\n'));
    assert.equal(f.assignments(), 0);
  }
  const f = fixture(raw, metadata, { controls: false });
  assert.equal(f.mirror.children[1].querySelectorAll('.tle-progress-badge').length, 1);
  assert.equal(f.mirror.children[1].querySelectorAll('.tle-passive-progress').length, 0);
});

test('meaning-display: composition retains surrounding meaning without publishing or relaxing input guards', () => {
  const raw = '- 폴더\n- [ ] 진행\n조합 메모', f = fixture(raw, { 0: { kind: 'scope', scopeKind: 'folder', label: '폴더' }, 1: { kind: 'task', progressPercent: 40 } }, { composing: true });
  assert(f.mirror.children[0].find('tle-passive-scope'));
  assert.equal(f.mirror.children[1].find('tle-passive-progress')!.textContent, '40%');
  assert(f.mirror.children[2].classes.has('tle-line-composition')); assert(!f.mirror.children[2].find('tle-active-paint'));
  assert.equal(f.replace(0, 0, '거부 입력'), false); assert.equal(f.undo(), false);
  assert.equal(f.textarea.value, raw); assert.equal(f.assignments(), 0); assert.deepEqual(f.commands, []); assert.deepEqual(f.writes, []);
});

test('recognition-wrap: inactive scope paint repeats exact RAW prefix and typed name without moving the source ruler', () => {
  const name = '가상😀 폴더 이름이 길어도 원문 그대로', raw = `\t- ${name}\n일반 메모`;
  const f = fixture(raw, {0: {kind: 'scope', scopeKind: 'folder', label: '이전 저장 이름'}}), row = f.mirror.children[0];
  assert(row.classes.has('tle-line-native-scope')); assert.equal(row.firstChild!.textContent, raw.split('\n')[0]);
  assert.equal(row.find('tle-active-syntax')!.textContent, '\t- ');
  assert.equal(row.find('tle-active-scope-name')!.textContent, name);
  assert.equal(row.find('tle-active-scope-icon')!.tabIndex, -1); assert(!row.find('tle-active-scope-icon')!.dataset.action);
  assert.equal(f.textarea.value, raw); assert.equal(f.assignments(), 0); assert.deepEqual(f.commands, []);
});

test('recognition-wrap: only metadata-owned memo rows share their checkbox owner, never general memo text', () => {
  const raw = '- [ ] 할 일\n  - 날짜: 2026-10-12\n  - 메모: 긴 메모\n일반 40% 메모\n  - 메모: 고아 메모\n끝';
  const f = fixture(raw, {0: {kind: 'task',depth:0,progressPercent:40},1:{kind:'property',depth:1},2:{kind:'property',depth:1},3:{kind:'note',depth:0},4:{kind:'property',depth:1}});
  assert.deepEqual(f.mirror.children.slice(0,3).map(row=>row.dataset.checkOwner), ['0','0','0']);
  assert(f.mirror.children[2].classes.has('tle-line-owned-memo'));
  assert.equal(f.mirror.children[3].find('tle-item-membership'), undefined);
  assert.equal(f.mirror.children[4].find('tle-item-membership'), undefined); assert(!f.mirror.children[4].classes.has('tle-line-owned-memo'));
  assert.equal(f.textarea.value, raw); assert.equal(f.assignments(), 0); assert.deepEqual(f.writes, []);
});

test('recognition-wrap: a wrapped logical row reveals only its own inert group without changing row heights', () => {
  const f = fixture('- [ ] 첫 할 일\n- [ ] 긴 할 일\n  - 메모: 긴 메모\n끝', {0:{kind:'task',depth:0},1:{kind:'task',depth:0},2:{kind:'property',depth:1}});
  const rows=f.mirror.children; rows[2].offsetHeight=78;
  vm.runInContext('syncMembershipGeometry(26)', f.context);
  assert.deepEqual(rows.map(row=>row.dataset.membershipWrapped),['false','true','true','false']);
  assert.deepEqual(rows.map(row=>row.offsetHeight),[26,26,78,26]);
  const rail=rows[2].find('tle-item-membership')!;assert.equal(rail.getAttribute('aria-hidden'),'true');assert.equal(rail.tabIndex,-1);assert(!rail.dataset.action);
  assert.equal(f.assignments(),0);assert.deepEqual(f.commands,[]);
});

test('recognition-wrap: reading scope wraps within its source depth while native rails stay inert and outside RAW', () => {
  const wrapper = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.module.css', import.meta.url), 'utf8');
  const reading = wrapper.slice(wrapper.indexOf('/* Reading has its own ruler.'));
  assert(reading.includes('.tle-root.tle-reading-view:not(.tle-folded-view):not(.tle-has-move-selection):not([data-move-phase])'));
  assert.match(reading, /\.tle-date-source\) \{[^}]*max-width: 100%; overflow: hidden;/);
  assert.match(reading, /\.tle-scope-label\) \{[^}]*margin-left: clamp\(0px, var\(--tle-indent, 0px\), calc\(100% - 136px\)\)/);
  assert.match(reading, /\.tle-scope-name\) \{[^}]*text-overflow: clip; white-space: normal;/);
  const rail = css.match(/\.tle-item-membership \{([^}]+)\}/)![1];
  assert.match(rail, /position: absolute; left: -6px;/); assert.match(rail, /pointer-events: none; user-select: none;/);
  for (const options of [{mode:'text'},{fenced:true},{composing:true}]) {
    const f=fixture('- [ ] 원문\n  - 메모: 보호 원문',{0:{kind:'task',depth:0},1:{kind:'property',depth:1}},options);
    if(options.composing) assert(!f.mirror.children[1].find('tle-item-membership'));
    else assert.equal(f.mirror.querySelectorAll('.tle-item-membership').length,0);
    if(options.fenced) assert(f.mirror.children.every(row=>!row.classes.has('tle-line-owned-memo')));
    assert.equal(f.assignments(),0);
  }
});
