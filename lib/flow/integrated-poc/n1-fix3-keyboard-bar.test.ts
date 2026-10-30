import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programKeyboardBarCramped, programKeyboardBarPlace, programVisibleBottom } from './keyboard-bar-place';

// N1 fix 3 (S4 phone, Android Chrome, Samsung keyboard): the writing bar sat in the page right under the body.
// When the page was at the top, the text above the body left less room than the body's minimum height, so the
// bar went under the keyboard. The bar is now fixed to the visible bottom (the visual viewport's bottom), and
// when the keyboard opens or the body takes focus with less than a line of room, the body is brought up.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const css = read('../../../components/flow/integrated-poc/ProgramTextEditor.module.css');
const phone = { innerWidth: 390, innerHeight: 844 };

test('the bar\'s bottom is the visual viewport\'s bottom: an open keyboard, a panned view, the bottom tabs', () => {
  const keyboard = { width: 390, height: 250, offsetTop: 0, offsetLeft: 0 };
  assert.equal(programVisibleBottom(phone, keyboard, null), 250);
  assert.equal(programKeyboardBarPlace(phone, keyboard, 250)['--writing-bar-bottom'], '594px');
  // Android reveals the caret by panning the visual viewport down the page.
  const panned = { width: 390, height: 380, offsetTop: 200, offsetLeft: 0 };
  assert.equal(programVisibleBottom(phone, panned, null), 580);
  assert.equal(programKeyboardBarPlace(phone, panned, 580)['--writing-bar-bottom'], '264px');
  // No keyboard, fixed bottom tabs at 768: above them.
  assert.equal(programVisibleBottom(phone, { width: 390, height: 844, offsetTop: 0, offsetLeft: 0 }, 768), 768);
  assert.equal(programKeyboardBarPlace(phone, null, 844)['--writing-bar-bottom'], '0px');
  // Pinch zoom: across the visible width only.
  const zoomed = programKeyboardBarPlace(phone, { width: 300, height: 400, offsetTop: 100, offsetLeft: 40 }, 500);
  assert.deepEqual([zoomed['--writing-bar-left'], zoomed['--writing-bar-width']], ['40px', '300px']);
});

test('less than a line between the body\'s top and the bar is cramped', () => {
  assert.equal(programKeyboardBarCramped(192, 201), true);
  assert.equal(programKeyboardBarCramped(192, 238), false);
  assert.equal(programKeyboardBarCramped(192, 331), false);
});

test('the editor fixes the bar there, ends the body above it, and brings the body up only on resize or focus', () => {
  const update = editor.slice(editor.indexOf('const update = () => {\n      frame = 0;'), editor.indexOf('const observer = new ResizeObserver(schedule);'));
  assert.match(update, /let bottom = programVisibleBottom\(view, visual, navTop\);/);
  assert.match(update, /for \(const \[name, value\] of Object\.entries\(programKeyboardBarPlace\(view, visual, bottom\)\)\) bar\.style\.setProperty\(name, value\);/);
  assert(update.indexOf('programKeyboardBarPlace') < update.indexOf('if (barShown) bottom -= bar!.getBoundingClientRect().height + 4;'));
  assert.match(update, /if \(view\.performance\.now\(\) < nudgeUntil && barShown && programKeyboardBarCramped\(host\.getBoundingClientRect\(\)\.top, bar!\.getBoundingClientRect\(\)\.top\)\) \{\s*nudgeUntil = 0; host\.scrollIntoView\(\{ block: 'start' \}\);/);
  assert(editor.includes('const scheduleNudge = () => { nudgeUntil = view.performance.now() + 600; schedule(); };'));
  // A scroll never pulls the body back: only the keyboard opening or focus entering does.
  assert(editor.includes("visual?.addEventListener('resize', scheduleNudge); visual?.addEventListener('scroll', schedule);"));
  assert(editor.includes("editorRoot?.addEventListener('focusin', scheduleNudge);"));
  const phoneRule = css.slice(css.indexOf('/* N1 fix 3: the bar is fixed'));
  assert.match(phoneRule, /\.writingBar \{\s*position: fixed;[^}]*left: var\(--writing-bar-left, 0px\);[^}]*bottom: var\(--writing-bar-bottom, 0px\);[^}]*width: var\(--writing-bar-width, 100%\);/);
});
