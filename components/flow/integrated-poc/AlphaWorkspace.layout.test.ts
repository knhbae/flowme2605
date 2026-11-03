import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('./AlphaWorkspace.module.css', import.meta.url), 'utf8'));

test('new-document submit label cannot shrink behind the scrollable library edge', () => {
  const values: string[] = [];
  css.walkRules(rule => {
    if (rule.selector === '.page :global(#program-document-title) + button') {
      rule.walkDecls('flex-shrink', declaration => { values.push(declaration.value); });
    }
  });
  assert.deepEqual(values, ['0']);
});

// Static cascade-boundary checks only; real contrast and hit areas need browser QA.
test('alpha shell and reused workspace buttons retain a 48px minimum target height', () => {
  const heights: string[] = [];
  css.walkRules(rule => {
    if (rule.selectors.includes('.page button')) rule.walkDecls('min-height', declaration => { heights.push(declaration.value); });
  });
  assert.deepEqual(heights, ['48px']);
});

test('alpha shell does not override the appearance of reused workspace primary buttons', () => {
  const violations: string[] = [];
  const appearance = /^(?:all|background(?:-.+)?|color|border(?:-.+)?|padding(?:-.+)?|font(?:-.+)?|box-shadow|text-shadow)$/;
  css.walkRules(rule => {
    // The shell owns size/focus/disabled affordances, not child button colors or surfaces.
    if (!rule.selectors.some(selector => /^\.page\s+button(?:$|:)/.test(selector))) return;
    rule.walkDecls(declaration => {
      if (appearance.test(declaration.prop)) violations.push(`${rule.selector}: ${declaration.prop}`);
    });
  });
  assert.deepEqual(violations, []);
});
