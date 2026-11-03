import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// U45 (user, 11/3 "맞춰줘"): the writing body looked one way when only viewed (44px task rows, titles past a control
// lane) and another once tapped (the textarea's 26px ruler, titles after the RAW prefix): the tapped row went up 18px,
// the sixth 72px, titles 29px left. Now reading lays its rows out as writing does on one ruler (36px on touch, 26px
// with a mouse), and a tap changes the caret's row only, to RAW.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const css = read('../../../components/flow/integrated-poc/ProgramTextEditor.module.css');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
// The editor module imports CSS, so its pure sizing function is taken from the source and run on its own.
const sizingAt = editor.indexOf('export function programEditorVisibleHeight(');
const sizing = editor.slice(sizingAt, editor.indexOf('\n}\n', sizingAt) + 3).replace('export function', 'function');
const programEditorVisibleHeight = new Function(ts.transpileModule(`${sizing}\nreturn programEditorVisibleHeight;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)() as (top: number, bottom: number, line?: number) => number | null;
const reading = '.tle-root.tle-reading-view:not(.tle-folded-view):not(.tle-has-move-selection):not([data-move-phase="selected"]):not([data-move-phase="dragging"])';

test('U45: one ruler, 36px on touch (one value a check page may override), 26px with a mouse, 44px while moving', () => {
  assert(css.includes('.host :global(.tle-root) { min-height: 64px; --tle-line: 26px; }'));
  // A folded document keeps its own reading; :where() keeps the rule as specific as the 26px one, under the move's 44px.
  const touch = css.indexOf('@media (pointer: coarse) {\n  .host :global(.tle-root:where(:not(.tle-folded-view))) { --tle-line: var(--program-touch-line, 36px); }\n}');
  assert(touch > css.indexOf('--tle-line: 26px;'), 'after the mouse ruler, so it wins on touch');
  // The move keeps 44px: its selectors are more specific than the touch one.
  assert(css.includes('.host :global(.tle-root[data-move-phase="dragging"]) { --tle-line: 44px; }'));
  assert.equal(css.match(/var\(--program-touch-line/g)?.length, 1, 'one place');
});

test('U45: reading takes writing\'s layout (RAW prefix in the flow, marks over it, one line per row); folded keeps its own', () => {
  const block = css.slice(css.indexOf('/* U45: one layout for reading and writing.'), css.indexOf('/* U45: reading and writing share this one ruler.'));
  const rule = (body: string) => assert(block.includes(`.host :global(${reading} ${body}`), body);
  rule('.tle-line-task) { padding-left: 0; }');
  rule('.tle-line-task .tle-hidden-syntax) { position: static; max-width: none; overflow: visible; white-space: inherit; }');
  rule(':is(.tle-task-title, .tle-task-title-complete)) { display: inline; }');
  rule(':is(.tle-line-task, .tle-line-scope)) { min-height: var(--tle-line); }');
  rule('.tle-check-anchor) { left: clamp(0px, var(--tle-indent, 0px), calc(100% - 32px)); }');
  rule('.tle-check-glyph) { left: 0; top: calc((var(--tle-line) - 20px) / 2); }');
  rule('.tle-passive-progress) { display: inline-flex; }');
  rule('.tle-check-hit > .tle-progress-badge) { visibility: hidden; }');
  // A row's check, fold and folder-open controls are its line's height (36px on touch, never into the next row).
  rule(':is(.tle-check-hit, .tle-fold-toggle, .tle-scope-open)) { height: var(--tle-line); min-height: 0; }');
  // Every rule there leaves folded documents and moves alone.
  for (const line of block.split('\n').filter(text => text.includes(':global('))) assert(line.includes(reading), line);
  // Reading's own blank-line and memo-continuation rulers are gone.
  assert(!css.includes('min-height: 8px; line-height: 8px; font-size: 0;'));
  assert(!css.includes('.tle-line-owned-memo) { padding-left: var(--tle-indent, 0px);'));
});

test('U45: the body is sized in whole lines of the ruler it has', () => {
  // 1000×511 after the joined head: 26px gave 14 lines (384px), 36px gives 10 (380px); a mouse keeps 26px.
  assert.equal(programEditorVisibleHeight(89, 495), 384);
  assert.equal(programEditorVisibleHeight(89, 495, 26), 384);
  assert.equal(programEditorVisibleHeight(89, 495, 36), 380);
  assert.equal(programEditorVisibleHeight(89, 495, 40), 380);
  assert.equal(programEditorVisibleHeight(89, 495, 0), 384, 'no ruler read: the old step');
  assert(editor.includes("const ruler = host.querySelector('.tle-root'), line = ruler ? parseFloat(view.getComputedStyle(ruler).getPropertyValue('--tle-line')) : NaN;"));
});

// Codex review (11/3): reading's own controls must not undo the one layout.
test('U45 review: the pill\'s button covers the pill; date cells sit in the gutter, one line high; folders keep their RAW height', () => {
  const block = css.slice(css.indexOf('/* U45: one layout for reading and writing.'), css.indexOf('/* U45: reading and writing share this one ruler.'));
  const rule = (body: string) => assert(block.includes(`.host :global(${reading} ${body}`), body);
  // The progress pill spans its RAW marker (measured into --tle-progress-width); its button covers all of it.
  rule('.tle-progress-hit) { width: max(44px, calc(var(--tle-progress-width, 0px) + 20px)); }');
  // Date, origin and reference cells: at the row's top, in the right gutter, one line high, out of the title's flow.
  const cells = block.slice(block.indexOf(`.editor .host :global(${reading} :is(.tle-task-date-open, .tle-task-origin-open, .tle-reference-open)) {`));
  for (const piece of ['position: absolute; top: 0; right: calc(8px - var(--tle-pad-right));', 'height: var(--tle-line); min-height: 0;'])
    assert(cells.slice(0, cells.indexOf('}')).includes(piece), piece);
  rule('.tle-date-open .tle-row-date-kind), .host :global(');
  // A folder row: its RAW text in the flow sets the height, as in writing; the name is drawn over it.
  rule('.tle-line-scope > .tle-date-source) { position: static; max-width: none; overflow: visible; white-space: inherit; }');
  const label = block.slice(block.indexOf(`.host :global(${reading} .tle-line-scope > .tle-scope-label) {`));
  for (const piece of ['position: absolute; inset: 0 0 auto 0;', '-webkit-line-clamp: var(--tle-scope-lines, 1);', 'max-height: 100%; overflow: hidden;',
    'text-indent: calc(clamp(0px, var(--tle-indent, 0px), calc(100% - 136px)) + 75px);']) assert(label.slice(0, label.indexOf('}')).includes(piece), piece);
  assert(block.includes('+ 87px); }'), 'touch keeps the 12px wider lanes');
  // 2nd review, as rules: a longer folder name ends with "…" in as many lines as its RAW row (the editor counts them);
  // reading has no row menu at any width, so the gutter is the date cells'.
  assert(editor.includes("for (const label of Array.from(host.querySelectorAll<HTMLElement>('.tle-reading-view .tle-line-scope > .tle-scope-label'))) {"));
  assert(editor.includes("const lines = String(Math.max(1, Math.round((label.parentElement?.getBoundingClientRect().height ?? line) / line)));"));
  rule('.tle-row-menu) { display: none; }');
});
