import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const css=readFileSync(new URL('./vendor/text-editor.css',import.meta.url),'utf8');
test('reading and folded checkbox decoration uses the first-line ruler',()=>{
 assert(css.includes('.tle-root:is(.tle-reading-view, .tle-folded-view) .tle-check-glyph { top: max(0px, calc((var(--tle-line) - 18px) / 2)); }'));
});
test('folder and fold decoration follow the same ruler without shrinking hit lanes',()=>{
 assert(css.includes('.tle-scope-open svg { display: block; margin-top: max(0px, calc((var(--tle-line) - 20px) / 2)); }'));
 assert(css.includes('.tle-fold-toggle { line-height: var(--tle-line); text-align: center; }'));
 assert(css.includes('.tle-root:is(.tle-reading-view, .tle-folded-view) :is(.tle-line-task, .tle-line-scope) { min-height: 44px; }'));
 assert(css.includes('.tle-check-hit { width: 44px; height: 44px;'));
});
test('active native rows retain the existing shared ruler and composition visibility',()=>{
 assert(css.includes('.tle-root:not(.tle-reading-view):not(.tle-folded-view) .tle-check-glyph { top: calc((var(--tle-line) - 18px) / 2); }'));
 assert(css.includes('.tle-root[data-mode="live"].tle-composing .tle-line-composition { visibility: hidden; }'));
});
