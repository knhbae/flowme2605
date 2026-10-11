import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const host = postcss.parse(read('./ProgramTextEditor.module.css'));
const mobile = host.nodes.filter(node => node.type === 'atrule' && node.name === 'media'
  && node.params === '(max-width: 600px)').at(-1) as postcss.AtRule;
const declarations = new Map<string, Map<string, string>>();
mobile.walkRules(rule => {
  const values = new Map<string, string>();
  rule.walkDecls(decl => { values.set(decl.prop, decl.value); });
  declarations.set(rule.selector, values);
});
const matching = (part: string) => [...declarations].filter(([selector]) => selector.includes(part));

test('mobile reading width changes only the passive presentation, not the native RAW ruler', () => {
  const [[selector, values]] = matching('.tle-presentation');
  assert(selector.includes(':is(.tle-reading-view, .tle-folded-view)'));
  assert(selector.includes(':not(.tle-has-move-selection):not([data-move-phase])'));
  assert.equal(values.get('padding-right'), '14px');
  for (const [selector, values] of declarations) {
    assert(!selector.includes('.tle-textarea'));
    assert(!values.has('--tle-line'));
    assert(!values.has('--tle-pad-right'));
    if (selector.includes('.tle-root')) assert(selector.includes(':is(.tle-reading-view, .tle-folded-view)') || selector.includes('.tle-root.tle-reading-view'));
  }
});

test('mobile date, reference and origin metadata stay in their owner row with44px targets', () => {
  const [[selector, values]] = matching('.tle-task-date-open');
  for (const name of ['.tle-task-origin-open', '.tle-reference-open']) assert(selector.includes(name));
  assert.equal(values.get('position'), 'static');
  assert.equal(values.get('display'), 'inline-flex');
  assert.equal(values.get('width'), 'auto');
  assert.equal(values.get('min-width'), '44px');
  assert.equal(values.get('min-height'), '44px');
  assert.equal(matching('.tle-row-menu')[0][1].get('display'), 'none');
  assert.equal(matching(':is(.tle-viewport, .tle-controls)')[0][1].get('background'), 'transparent');
});
