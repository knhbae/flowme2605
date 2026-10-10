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

test('header management keeps its own lane and expanded tools have a bounded panel', () => {
  const closed: string[] = [], open: string[] = [], forced: string[] = [];
  css.walkRules(rule => {
    if (rule.selector === '.management:not([open])') rule.walkDecls('flex', d => { closed.push(d.value); });
    if (rule.selector === '.management[open]') rule.walkDecls('flex', d => { open.push(d.value); });
    if (rule.selector === '.management') rule.walkDecls('flex-basis', d => { forced.push(d.value); });
  });
  assert.deepEqual(closed, ['0 1 auto']);
  assert.equal(open.at(-1), 'none');
  assert.deepEqual(forced, []);
  const source = readFileSync(new URL('./AlphaWorkspace.module.css', import.meta.url), 'utf8');
  assert.match(source, /\.sync > \.management \{ grid-column: 2; grid-row: 1;/);
  assert.match(source, /\.managementBody \{[^}]*width: min\(360px, calc\(100vw - 24px\)\);[^}]*overflow: auto;/);
});

test('short wide shell keeps warning visible in normal grid flow without shrinking action targets', () => {
  const wide = css.nodes.find(node => node.type === 'atrule' && node.name === 'media' && node.params === '(min-width: 761px)') as postcss.AtRule;
  const short = css.nodes.find(node => node.type === 'atrule' && node.name === 'media' && node.params === '(min-width: 761px) and (max-height: 500px)') as postcss.AtRule;
  assert.ok(wide);
  assert.ok(short);
  assert.ok(css.nodes.indexOf(wide) < css.nodes.indexOf(short));
  const declarations = new Map<string, string[]>();
  // Both media blocks apply to short wide screens, in this source order.
  for (const block of [wide, short]) block.walkRules(rule => rule.walkDecls(d => {
    const key = `${rule.selector}:${d.prop}`;
    declarations.set(key, [...(declarations.get(key) ?? []), d.value]);
    if (rule.selector === '.notice' && d.prop === 'display') assert.notEqual(d.value, 'none');
    assert.notEqual(d.prop, 'position');
  }));
  assert.deepEqual(declarations.get('.page:display'), ['grid']);
  assert.deepEqual(declarations.get('.page > :not(.header):not(.notice):grid-column'), ['1 / -1']);
  assert.deepEqual(declarations.get('.notice summary:min-height'), ['48px']);
  assert.equal(declarations.has('.page button:min-height'), false);
});
