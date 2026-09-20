import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./ProgramSpace.module.css', import.meta.url), 'utf8');

// These guard the stylesheet contract. Real scroll/Back geometry is checked in
// the cumulative browser profile; matching a CSS rule does not prove operability.
test('desktop library has its own viewport-bounded scroll container', () => {
  const rule = css.match(/@media\(min-width:761px\)\{\.sidebar\{([^}]+)\}\}/)?.[1];
  assert.ok(rule);
  for (const declaration of ['position:sticky', 'top:12px', 'align-self:start',
    'box-sizing:border-box', 'max-height:calc(100dvh - 24px)', 'overflow-y:auto',
    'overscroll-behavior:contain', 'scrollbar-gutter:stable', 'padding:8px 20px 8px 8px']) {
    assert.ok(rule.split(';').includes(declaration), declaration);
  }
});

test('mobile library remains a disclosure and the document page is not scroll-locked', () => {
  assert.match(css, /@media\(max-width:760px\)\{\.libraryToggle\{[^}]*display:block/);
  assert.match(css, /\.sidebar\[data-open=false\]\{display:none\}/);
  assert.match(css, /\.documents\{max-height:240px\}/);
  assert.doesNotMatch(css, /\.(?:space|content)\{[^}]*overflow(?:-y)?:hidden/);
});
