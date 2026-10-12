import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import postcss from 'postcss';

const native = readFileSync(new URL('../../../lib/flow/integrated-poc/vendor/text-editor.cjs', import.meta.url), 'utf8');
const css = readFileSync(new URL('./ProgramTextEditor.module.css', import.meta.url), 'utf8');
const spaceCss = readFileSync(new URL('./ProgramSpace.module.css', import.meta.url), 'utf8');
test('reading task titles use the same control lane for short and progress source prefixes', () => {
  const helper = native.slice(native.indexOf('    function syncReadingTaskInset(row) {'), native.indexOf('    function syncGeometry() {'));
  function inset(prefixWidth: number, controls: boolean, moving = false, pendingGesture = false) {
    let result = '';
    const ctx = vm.createContext({ config: { controls }, moveState: moving ? {} : null, gesture: pendingGesture ? {} : null }); vm.runInContext(helper, ctx);
    ctx.row = { clientWidth: 300, getBoundingClientRect: () => ({ left: 20 }),
      querySelector: (selector: string) => selector === '.tle-hidden-syntax' ? { getBoundingClientRect: () => ({ width: prefixWidth }) }
        : { getBoundingClientRect: () => ({ right: 51 }) }, style: { setProperty: (_: string, value: string) => { result = value; } } };
    vm.runInContext('syncReadingTaskInset(row)', ctx); return result;
  }
  assert.equal(inset(60, true), '57px'); assert.equal(inset(90, true), '57px');
  assert.equal(inset(90, false), '90px');
  assert.equal(inset(90, true, true), '90px');
  assert.equal(inset(90, true, false, true), '90px');
});
test('memo hanging indent and blank density are isolated from native and move layout', () => {
  assert.match(css, /not\(\.tle-has-move-selection\):not\(\[data-move-phase\]\).*tle-line-prose/);
  assert.match(css, /tle-line-property:not\(\.tle-line-date-property\)/);
  assert.match(css, /text-indent: calc\(-1 \* var\(--tle-indent, 0px\)\)/);
  assert.match(native, /row\.dataset\.sourceBlank = String\(!line\.trim\(\)\)/);
  assert.match(css, /tle-line\[data-source-blank="true"\]/);
  assert.match(css, /tle-reading-view:not\(\.tle-folded-view\).*data-source-blank/);
  assert.match(native, /setProperty\('--tle-reading-depth', row\.dataset\.depth\)/);
  assert.match(css, /not\(\[data-move-phase\]\).*tle-check-anchor.*--tle-reading-depth/);
  assert.match(css, /not\(\[data-move-phase\]\).*tle-hidden-syntax.*visibility: hidden; pointer-events: none/);
});
test('A exposes the period title while retaining hidden-view and narrow-layout boundaries', () => {
  assert.match(spaceCss, /executionView\[hidden\] \{ display: none;/);
  const title: Record<string, string> = {};
  postcss.parse(spaceCss).walkRules(rule => {
    if (rule.selectors.some(selector => [
      '.executionView:has(> .periodPicker) > .periodHeading h1',
      '.space[data-note-layout="true"] .periodHeading h1',
    ].includes(selector))) rule.walkDecls(declaration => { title[declaration.prop] = declaration.value; });
  });
  assert.equal(title.position, 'static');
  assert.equal(title['clip-path'], 'none');
  assert.equal(title.overflow, 'visible');
  assert.equal(title['white-space'], 'normal');
  assert.equal(title['font-size'], '26px');
  assert.equal(title['line-height'], '36px');
  assert.match(spaceCss, /@media \(max-width: 359px\)/);
});
