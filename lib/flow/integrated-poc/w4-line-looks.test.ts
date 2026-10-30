import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { textEditorRows, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// W4 (line looks ②, writing W0 items 07·06·11, feedback U17; folder grammar 4th edition F9). Paint only:
// the folder head reads [▾][folder icon] name (no dropdown chevron after the icon), its '/' is unseen while
// writing, a task with its own date line shows the date once, check boxes are 20px. Tap targets stay 44px.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const vendor = read('./vendor/text-editor.cjs');
const css = read('./vendor/text-editor.css');
const rule = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  assert(at >= 0, selector);
  return css.slice(at, css.indexOf('}', at) + 1);
};
const slice = (from: string, to: string) => {
  const start = vendor.indexOf(from), stop = vendor.indexOf(to, start);
  assert(start >= 0 && stop > start, from);
  return vendor.slice(start, stop);
};

test('the folder head: an outline triangle in the lane before the icon, the icon 12px before the name, 44px lanes', () => {
  assert.match(vendor, /button\.textContent = folded \? '▸' : '▾';/);
  assert.doesNotMatch(vendor, /'⌄'/);
  assert.match(rule('.tle-fold-toggle'), /width: 44px; height: 44px;[^}]*color: var\(--flowme-b-muted\); font: 14px\/1 system-ui, sans-serif;/);
  // On the name's first line, as the open icon is: centred in the 44px lane it dropped below the name.
  assert.match(css, /\.tle-root:is\(\.tle-reading-view, \.tle-folded-view\) \.tle-fold-toggle \{ display: flex; align-items: flex-start; justify-content: center; line-height: var\(--tle-line\);/);
  assert.match(css, /\.tle-root:is\(\.tle-reading-view, \.tle-folded-view\) \.tle-scope-open \{ display: flex; align-items: flex-start; justify-content: center; \}/);
  // Reading and folded views: the fold lane takes the open button's old place (anchor − 13px, as the open button
  // is placed), and the open button moves one 44px lane right; the name's 75px inset is unchanged.
  assert.match(css, /\.tle-root:is\(\.tle-reading-view, \.tle-folded-view\) \.tle-fold-anchor \{ left: calc\(clamp\(0px, var\(--tle-indent, 0px\), calc\(100% - 136px\)\) - 13px\); \}/);
  assert.match(css, /\.tle-root:is\(\.tle-reading-view, \.tle-folded-view\) \.tle-scope-anchor \{ left: calc\(clamp\(0px, var\(--tle-indent, 0px\), calc\(100% - 136px\)\) \+ 44px\); \}/);
  assert.match(vendor, /if \(anchor\) plan\.left = rect\(anchor\)\.left - \(local \? rect\(metaRow\) : rootBox\)\.left - 13 \+ 'px';/);
  const module = read('../../../components/flow/integrated-poc/ProgramTextEditor.module.css');
  assert.match(module, /\.tle-scope-label\) \{ padding-left: 75px; \}/);
  assert.match(module, /:is\(\.tle-check-hit,\.tle-fold-toggle,\.tle-row-open,\.tle-plus,\.tle-row-menu\)\) \{ min-height: 44px; min-width: 44px; height: 44px; \}/);
});

test("while writing, a folder line's '/' joins the transparent syntax and keeps its RAW advance", () => {
  const paint = slice('function paintActiveSyntax(', 'function propertyCheckOwner(');
  assert.match(paint, /const title = task \? task\[4\] : scope\[2\]\.replace\(\/\^\\\/\/, ''\);/);
  assert.match(paint, /const prefix = line\.slice\(0, line\.length - title\.length\);\s*paint\.append\(makeSpan\('tle-active-syntax', prefix\)\);/);
  assert.match(rule('.tle-active-syntax'), /color: transparent;/);
});

test('a task with its own date line shows the date there only: no 예정일 chip', () => {
  const ownsDateLine = new Function(`const CHECK_KINDS = ['task', 'reference', 'subcheck'];
    ${slice('function propertyCheckOwner(', 'function scrollSurface()')}; return ownsDateLine;`)() as (index: number, lines: string[], metadata: unknown[]) => boolean;
  const task = { kind: 'task', depth: 0 }, sub = { kind: 'subcheck', depth: 1 }, prop = (depth: number) => ({ kind: 'property', depth });
  assert.equal(ownsDateLine(0, ['- [ ] 안건', '  - 날짜: 2026-10-31'], [task, prop(1)]), true);
  assert.equal(ownsDateLine(0, ['- [ ] 안건', '  - 메모: 먼저', '  - 날짜: 미정'], [task, prop(1), prop(1)]), true);
  assert.equal(ownsDateLine(0, ['- [ ] 안건', '  - 시간: 09:00'], [task, prop(1)]), false);
  // A subtask's date line belongs to the subtask, not the task above it.
  assert.equal(ownsDateLine(0, ['- [ ] 안건', '  - [ ] 하위', '    - 날짜: 2026-10-31'], [task, sub, prop(2)]), false);
  assert.equal(ownsDateLine(1, ['- [ ] 안건', '  - [ ] 하위', '    - 날짜: 2026-10-31'], [task, sub, prop(2)]), true);
  assert.match(vendor, /safeMeta\.dateMismatch && !ownsDateLine\(index, lines, metadata\)\) addRowButton\('task-date', index, row, safeMeta\);/);
  // W4 review P2-1: when the date chip is skipped, a task also outside its folder gets the origin check next; that
  // button must not draw the date ('예정일 10/31') either: it shows '소속' and is named for the origin only.
  assert.match(vendor, /else if \(\(safeMeta\.kind === 'task' \|\| safeMeta\.isCanonical === true\) && safeMeta\.scopeMismatch\) addRowButton\('task-origin', index, row, safeMeta\);/);
  const button = slice('function addRowButton(', 'function addFoldButton(');
  assert.match(button, /const dateText = type !== 'task-origin' && typeof meta\.dateMismatch === 'string' \? meta\.dateMismatch\.trim\(\) : '';/);
  assert.match(button, /\} else if \(type === 'task-origin'\) \{\s*button\.classList\.add\('tle-date-open'\);\s*button\.append\(makeSpan\('tle-row-date', '소속'\)\);/);
});

test('W4 review P2-1, run: the origin check reads 소속 with no date; the date chip still reads 예정일', () => {
  // The vendor's real addRowButton on a minimal element stub (no layout; only what the button is made of).
  class Element {
    className = ''; textContent = ''; title = ''; dataset: Record<string, string> = {}; children: Element[] = []; attrs: Record<string, string> = {};
    get classList() { return { add: (...names: string[]) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...names])].join(' '); } }; }
    append(...nodes: Element[]) { this.children.push(...nodes); }
    setAttribute(name: string, value: string) { this.attrs[name] = value; }
    getAttribute(name: string) { return this.attrs[name] ?? null; }
    addEventListener() {}
  }
  const made: Element[] = [];
  const addRowButton = new Function('doc', 'config', 'made', `const rowButtons = [];
    ${slice('function makeSpan(', 'function timeLabel(')}
    function icon(kind) { const e = doc.createElement('svg'); e.textContent = ''; return e; }
    function gestureHandle() {} function action() {} function rangeOfLine() { return { text: '' }; }
    function appendRowControl(row, button) { made.push(button); }
    ${slice('function addRowButton(', 'function addFoldButton(')}; return addRowButton;`)({ createElement: () => new Element() }, {}, made) as
    (type: string, index: number, row: Element, meta: Record<string, unknown>) => void;
  const meta = { label: '안건 정리', dateMismatch: '10.31', scopeMismatch: '회사' };
  addRowButton('task-origin', 2, new Element(), meta);
  addRowButton('task-date', 2, new Element(), meta);
  const [origin, date] = made, texts = (button: Element) => button.children.map(child => child.textContent);
  assert.deepEqual(texts(origin), ['소속']);
  assert(!origin.className.includes('tle-scheduled-date-open'), origin.className);
  assert.equal(origin.getAttribute('aria-label'), '할 일 소속 확인: 안건 정리, 실제 소속 회사');
  assert.deepEqual(texts(date), ['예정일', '10/31']);
  assert(date.className.includes('tle-scheduled-date-open'));
});

test('check boxes are 20px with the today list\'s 2px border and 6px corners, centred on the line', () => {
  const box = rule('.tle-check-glyph');
  for (const kept of ['width: 20px;', 'height: 20px;', 'border: 2px solid var(--flowme-b-control);', 'border-radius: 6px;']) assert(box.includes(kept), kept);
  assert.match(css, /\.tle-check-anchor \{ width: 20px; \}/);
  assert.match(css, /\.tle-root:not\(\.tle-reading-view\):not\(\.tle-folded-view\) \.tle-check-glyph \{ top: calc\(\(var\(--tle-line\) - 20px\) \/ 2\); \}/);
  assert.match(css, /\.tle-root:is\(\.tle-reading-view, \.tle-folded-view\) \.tle-check-glyph \{ top: max\(0px, calc\(\(var\(--tle-line\) - 20px\) \/ 2\)\); \}/);
});

test('F9: a folder line linked to a folder elsewhere names that parent; one in its text place does not', () => {
  const base = { version: 11, documents: [{ id: 'd', title: '합성', folder: '회사', folderId: 'co', lines: [] }],
    folders: [{ id: 'co', title: '회사', parentId: null }, { id: 'mt', title: '회의', parentId: 'co' }, { id: 'mt2', title: '회의', parentId: null }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  // The 4th line sits under '회사' but links the top-level '회의' (W4 review note): '최상위', the folder screens' word.
  let state = M.editText(base, 'd', '- /회의\n- /회사\n  - /회의\n  - /회의\n- /회의');
  const [elsewhere, company, nested, nestedTop, top] = state.documents[0].lines.map(line => line.id);
  state = { ...state, bindings: [
    { kind: 'scope', docId: 'd', lineId: elsewhere, scopeId: 'mt' }, { kind: 'scope', docId: 'd', lineId: company, scopeId: 'co' },
    { kind: 'scope', docId: 'd', lineId: nested, scopeId: 'mt' }, { kind: 'scope', docId: 'd', lineId: nestedTop, scopeId: 'mt2' },
    { kind: 'scope', docId: 'd', lineId: top, scopeId: 'mt2' },
  ] } as TextWorkspaceState;
  const meta = textEditorRows(state, 'd');
  assert.deepEqual(meta.map(row => [row.kind, row.scopePlace ?? null]), [['scope', '회사'], ['scope', null], ['scope', null], ['scope', '최상위'], ['scope', null]]);
  // Painted before the name, muted; the RAW ruler and the open/fold lanes are untouched.
  assert.match(vendor, /const place = makeSpan\('tle-scope-place', ' ›'\);\s*place\.prepend\(makeSpan\('tle-scope-place-name', safeMeta\.scopePlace\)\);\s*decorated\.append\(place\);/);
  assert.match(rule('.tle-scope-place'), /color: var\(--flowme-b-muted\);/);
});

test('W4 review P2-2: a long parent shrinks to an ellipsis within 40% of the head; the folder name keeps the rest', () => {
  const place = rule('.tle-scope-place');
  for (const kept of ['flex: 0 1 auto;', 'min-width: 0;', 'max-width: 40%;']) assert(place.includes(kept), kept);
  assert.doesNotMatch(place, /flex-shrink: 0/);
  const name = rule('.tle-scope-place-name');
  for (const kept of ['min-width: 0;', 'overflow: hidden;', 'text-overflow: ellipsis;', 'white-space: nowrap;']) assert(name.includes(kept), kept);
});

test('wnext3: the reading progress pill sits on the first text line with the title, as the check box does', () => {
  // Centred in the 44px lane it sat 10px below a title that had lost its chip (390: 298–322 against 287–313).
  assert.match(css, /\.tle-root:is\(\.tle-reading-view, \.tle-folded-view\) \.tle-progress-hit \{ display: flex; align-items: flex-start; justify-content: center; \}/);
  assert.match(css, /\.tle-root:is\(\.tle-reading-view, \.tle-folded-view\) \.tle-progress-hit > \.tle-progress-badge \{ margin-top: max\(0px, calc\(\(var\(--tle-line\) - 24px\) \/ 2\)\); \}/);
  // Later than the folded view's display rule for check buttons, which it overrides at the same specificity.
  assert(css.indexOf('.tle-progress-hit { display: flex;') > css.indexOf('.tle-root.tle-folded-view .tle-check-hit, .tle-root.tle-folded-view .tle-row-open { display: block; }'));
});
