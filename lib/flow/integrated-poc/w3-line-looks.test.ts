import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// W3 (line looks ①, writing W0 items 05·08·09·10·12, feedback U9). Paint only: rows without the caret hide
// '- 메모:' and '##', a time property gets a label like the date one, subchecks and date heads are ink, progress
// pills are 12px and span their RAW marker. RAW text stays in the flow (or under a label, unseen), so the
// textarea and mirror wrap every line the same; the caret's row and IME rows keep the RAW branch.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const vendor = read('./vendor/text-editor.cjs');
const css = read('./vendor/text-editor.css');
const rule = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  assert(at >= 0, selector);
  return css.slice(at, css.indexOf('}', at) + 1);
};
const render = vendor.slice(vendor.indexOf("row.className = 'tle-line';"), vendor.indexOf('mirror.replaceChildren(fragment);'));

test('a time property under a task reads "시간 오전 9:00"; anything else stays literal', () => {
  const source = vendor.slice(vendor.indexOf('function timeLabel(value) {'), vendor.indexOf('function ownedPropertyLabel('));
  const timeLabel = new Function(`${source}; return timeLabel;`)() as (value: string) => string | null;
  assert.equal(timeLabel('09:00'), '시간 오전 9:00');
  assert.equal(timeLabel('00:30'), '시간 오전 12:30');
  assert.equal(timeLabel('12:00'), '시간 오후 12:00');
  assert.equal(timeLabel('23:59'), '시간 오후 11:59');
  for (const literal of ['9:00', '24:00', '09:60', '오전 9시', '']) assert.equal(timeLabel(literal), null);
  // Same owner rule as the date label: only a property under a real checkbox.
  // Redesign 2 (11/12): '- 마감:' is painted too (with its D-n).
  assert.match(vendor, /const property = \/\^ \*-\\s\+\(날짜\|시간\|마감\):\\s\*\(\.\*\)\$\/\.exec\(line\);/);
  assert.match(vendor, /if \(property\[1\] === '시간'\) return timeLabel\(property\[2\]\.trim\(\)\);/);
});

test("rows without the caret drop '- 메모:' and '##' from sight, keeping the RAW text in the flow", () => {
  // The memo marker stays as transparent text, so the note starts where the RAW one does.
  assert.match(render, /const memo = !propertyLabel && checkOwner !== null && safeMeta\.kind === 'property' \? \/\^\(\[ \\t\]\+-\\s\+메모:\\s\?\)\(\.\*\)\$\/\.exec\(line\) : null;/);
  assert.match(render, /row\.append\(makeSpan\('tle-memo-syntax', memo\[1\]\), makeSpan\('tle-memo-text', memo\[2\]\)\);/);
  // A heading is a label over its unseen RAW line, as a date is.
  assert.match(render, /const heading = safeMeta && safeMeta\.kind === 'heading' \? \/\^ \*\(#\{1,6\}\)\\s\+\(\\S\.\*\)\$\/\.exec\(line\) : null;/);
  assert.match(render, /const title = makeSpan\('tle-date-label tle-heading-label', heading\[2\]\);/);
  assert.match(render, /row\.append\(makeSpan\('tle-date-source', line\), title\);/);
  // The caret's rows (and IME) are decided before either branch: RAW, as before.
  assert(render.indexOf("row.classList.add('tle-line-raw');") < render.indexOf('} else if (heading) {'));
  assert(render.indexOf("row.classList.add('tle-line-raw');") < render.indexOf('} else if (memo) {'));
  assert.match(rule('.tle-memo-syntax'), /color: transparent;/);
  // W3 fix: bold by a stroke, not a wider weight, so the wrapped title fits the RAW box (w3-fix test).
  assert.match(rule('.tle-heading-label'), /font-weight: 400; -webkit-text-stroke: 0\.6px currentColor;/);
});

test('the painted spans never change the RAW advances: no padding, margin, border, font or spacing in the flow', () => {
  for (const selector of ['.tle-memo-syntax', '.tle-memo-text', '.tle-date-source']) {
    assert.doesNotMatch(rule(selector), /padding|margin|border|font|letter-spacing|word-spacing|display/, selector);
  }
  // The rail is an absolute pseudo element and the heading title an absolute label.
  assert.match(rule('.tle-memo-syntax::after'), /position: absolute;[^}]*width: 2px;/);
  assert.match(rule('.tle-date-label'), /position: absolute;/);
});

test('subchecks and date heads are ink; muted stays for done tasks and properties', () => {
  assert.match(rule('.tle-line-subcheck'), /color: var\(--flowme-b-ink\);/);
  assert.match(rule('.tle-date-label'), /color: var\(--flowme-b-ink\);/);
  assert.match(rule('.tle-property-date-label'), /color: var\(--flowme-b-muted\);/);
  // A done subcheck: the later complete rule wins.
  assert(css.indexOf('.tle-line-subcheck {') < css.indexOf('.tle-line-complete {'));
});

test('progress pills are 12px in both places and the passive one spans its RAW marker', () => {
  assert.match(rule('.tle-progress-hit'), /font: 600 12px\/1/);
  assert.match(rule('.tle-progress-hit > .tle-progress-badge'), /font: 600 12px\/1/);
  const passive = rule('.tle-passive-progress');
  assert.match(passive, /left: 0; width: var\(--tle-progress-width, 32px\);/);
  assert.match(passive, /font: 600 12px\/1/);
  assert.doesNotMatch(`${rule('.tle-progress-hit')}${passive}`, /11px/);
  // Measured on the RAW prefix text: from the indent to the marker's end (no trailing space).
  assert.match(vendor, /range\.setStart\(node, prefix\.length\);\s*range\.setEnd\(node, Math\.max\(prefix\.length, \(node\.textContent \|\| ''\)\.trimEnd\(\)\.length\)\);/);
  assert.match(vendor, /if \(plan\.progress\) plan\.row\.style\.setProperty\('--tle-progress-width', plan\.progress\);/);
});
