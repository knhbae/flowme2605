import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// W12 (writing W0, feedback I11; folder grammar 4th edition F17): on an empty line, once input rests for 0.4s, a
// muted '/ 메뉴' shows where '/' would go ('/ 폴더' on a bare '- ' line). It is an inert overlay, never RAW, saved or
// copied, and it leaves at the first key, composition start or input before the character is painted. An empty
// document shows the W6 placeholder instead.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const vendor = read('./vendor/text-editor.cjs');
const css = read('./vendor/text-editor.css');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const lineHintText = new Function(`${vendor.slice(vendor.indexOf('function lineHintText('), vendor.indexOf('function indentation('))}; return lineHintText;`)() as (line: string) => string;
const hint = vendor.slice(vendor.indexOf("const lineHint = doc.createElement('div');"), vendor.indexOf('const observer = typeof global.ResizeObserver'));

test("the hint's words: '/ 메뉴' on an empty or blank line, '/ 폴더' on a bare list item, nothing elsewhere", () => {
  for (const line of ['', '   ', '\t', '    ']) assert.equal(lineHintText(line), '/ 메뉴', JSON.stringify(line));
  for (const line of ['- ', '  - ', '-  ', '\t- ']) assert.equal(lineHintText(line), '/ 폴더', JSON.stringify(line));
  for (const line of ['-', '- a', '- [ ] ', '/', '- /', '가', '  메모']) assert.equal(lineHintText(line), '', JSON.stringify(line));
});

test('the hint leaves at the first key, composition start or input, and comes back only after a 0.4s rest', () => {
  assert.match(hint, /\['beforeinput', 'compositionstart', 'keydown', 'blur', 'pointerdown'\]\.forEach\(\(type\) => listen\(textarea, type, hideLineHint\)\);/);
  assert.match(hint, /\['input', 'compositionend', 'keyup', 'focus', 'select', 'click'\]\.forEach\(\(type\) => listen\(textarea, type, armLineHint\)\);/);
  assert.match(hint, /lineHintTimer = global\.setTimeout\(showLineHint, 400\);/);
  // Arming always hides first, so a stale hint never outlives a change.
  assert.match(hint, /function armLineHint\(\) \{\s*hideLineHint\(\);/);
  // Nothing during a composition, while reading, folded or moving, or with the writing tools off.
  assert.match(hint, /if \(destroyed \|\| composing \|\| mode !== 'live' \|\| readingView \|\| foldedIds\.size \|\| gesture \|\| moveState \|\| textarea\.readOnly \|\|\s*doc\.activeElement !== textarea \|\| typeof config\.lineHints !== 'function' \|\| !config\.lineHints\(\)\) return;/);
  assert.match(hint, /listen\(doc, 'selectionchange', \(\) => \{ if \(doc\.activeElement === textarea && !composing\) armLineHint\(\); \}\);/);
});

test('only at the end of an empty line with a collapsed caret; an empty document has the placeholder instead', () => {
  assert.match(hint, /if \(!textarea\.value \|\| start !== textarea\.selectionEnd\) return;/);
  assert.match(hint, /if \(!text \|\| start !== line\.end \|\| !node \|\| node\.nodeType !== 3\) return;/);
  assert.match(editor, /textarea\.placeholder = props\.readOnly \? '' : props\.directWriting \? '여기에 바로 적으세요' : EMPTY_DOCUMENT_HINT;/);
});

test('an inert overlay in the controls layer: not in the textarea, the mirror rows, saves or copies', () => {
  assert.match(hint, /lineHint\.setAttribute\('aria-hidden', 'true'\);\s*lineHint\.hidden = true;\s*controls\.append\(lineHint\);/);
  assert.doesNotMatch(hint, /textarea\.value\s*=|setRangeText|replaceRange|mirror\.append|rows\.push/);
  const rule = css.slice(css.indexOf('.tle-line-hint {'), css.indexOf('}', css.indexOf('.tle-line-hint {')));
  for (const kept of ['position: absolute;', 'margin-left: 4px;', 'color: var(--flowme-b-muted);', 'pointer-events: none;', 'user-select: none;']) assert(rule.includes(kept), kept);
  assert.match(css, /\.tle-line-hint\[hidden\] \{ display: none; \}/);
});

test('the host turns it on with the writing tools, whose \'/\' opens the tool menu', () => {
  assert.match(editor, /lineHints:\(\)=>!!propsRef\.current\.authoringMode&&!propsRef\.current\.readOnly,/);
});
