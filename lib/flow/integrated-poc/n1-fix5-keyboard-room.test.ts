import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programKeyboardRoom } from './keyboard-bar-place';

// N1 fix 5 (Codex fix3 check, 390, visual height 260 · offsetTop 0): with the bar fixed above the keyboard, a
// page no taller than the screen could not scroll, so when the text above left no room the body stayed under
// the bar and its last line could not come above it. While writing on a phone, room under the body now lets the
// page scroll: a whole screen while a keyboard covers part of it (steady across scrolling), else the bar's height.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const editor = read('ProgramTextEditor.tsx'), css = read('ProgramTextEditor.module.css');
const phone = { innerWidth: 390, innerHeight: 844 };

test('room under the body: a whole screen with a keyboard, the bar without one, nothing without the bar', () => {
  assert.equal(programKeyboardRoom(phone, 260, 53), 844);   // keyboard: the visible bottom is above the screen's
  assert.equal(programKeyboardRoom(phone, 580, 53), 844);   // panned view, keyboard still up
  assert.equal(programKeyboardRoom(phone, 844, 53), 53);    // no keyboard (the visual viewport reaches the screen's bottom): just the bar
  assert.equal(programKeyboardRoom(phone, 260, 0), 0);      // no bar (PC, not writing): nothing
});

test('the editor sets that room on a spacer under the body before bringing the body up', () => {
  const update = editor.slice(editor.indexOf('const update = () => {\n      frame = 0;'), editor.indexOf('const observer = new ResizeObserver(schedule);'));
  assert.match(update, /const room = roomRef\.current;\s*if \(room\) \{ const height = `\$\{programKeyboardRoom\(view, programVisibleBottom\(view, visual, null\), barShown \? bar!\.getBoundingClientRect\(\)\.height \+ 4 : 0\)\}px`; if \(room\.style\.height !== height\) room\.style\.height = height; \}/);
  assert(update.indexOf('roomRef.current') < update.indexOf("host.scrollIntoView({ block: 'start' })"));
  assert(editor.includes('{props.authoringMode && !folderView && writingBar}\n    {props.authoringMode && !folderView && <div ref={roomRef} className={styles.keyboardRoom} aria-hidden="true" />}'));
  assert.match(css, /\.keyboardRoom \{ display: none; \}/);
  assert.match(css, /\.editor:has\(\.host textarea:focus, \.writingBar :focus\) \.keyboardRoom \{ display: block; \}/);
});
