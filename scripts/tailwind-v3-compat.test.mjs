import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const require = createRequire(import.meta.url);
const compat = require('./tailwind-v3-compat.cjs');
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const fixture = '@import "tailwindcss" source(none);\n@source inline("space-y-1 space-y-2 md:space-y-3 space-y-2! space-y-reverse space-x-2 space-x-reverse divide-y divide-x divide-y-2 md:divide-y-2 divide-y-reverse divide-slate-200 divide-[#dde4e0] divide-[var(--flowme-workspace-line)] outline-hidden focus:outline-hidden shadow-xs backdrop-blur-xs rounded");';
const transitionFixture = '@import "tailwindcss" source(none);\n@source inline("transition transition-colors hover:transition focus-visible:transition-colors md:transition-colors transition! hover:transition-colors! !transition hover:!transition-colors transition-all transition-[outline-color] [transition-property:outline-color] duration-300 ease-linear");';
const transitionSelectors = ['.transition', '.transition-colors', '.hover\\:transition:hover', '.focus-visible\\:transition-colors:focus-visible', '.md\\:transition-colors', '.transition\\!', '.hover\\:transition-colors\\!:hover', '.\\!transition', '.hover\\:\\!transition-colors:hover'];

function getRules(css) {
  const rules = [];
  postcss.parse(css).walkRules((rule) => { rules.push(rule); });
  return rules;
}

for (const optimize of [false, true]) {
  test(`official default transitions keep immediate semantic focus optimize=${optimize}`, async () => {
    const from = path.join(root, 'app/transition-contract.css');
    const generated = await postcss([tailwind({ base: root, optimize })]).process(transitionFixture, { from });
    const result = await postcss([compat()]).process(generated.css, { from: undefined });
    const before = getRules(generated.css);
    const after = getRules(result.css);
    for (const selector of transitionSelectors) {
      const original = before.find((rule) => rule.selector === selector);
      const maintained = after.find((rule) => rule.selector === selector);
      assert(original && maintained, selector);
      const expected = original.nodes.filter((node) => node.type === 'decl').map((node) => ({
        prop: node.prop,
        value: node.prop === 'transition-property'
          ? node.value.split(',').map((value) => value.trim()).filter((value) => value !== 'outline-color')
          : node.value,
        important: Boolean(node.important),
      }));
      const actual = maintained.nodes.filter((node) => node.type === 'decl').map((node) => ({
        prop: node.prop,
        value: node.prop === 'transition-property' ? node.value.split(',').map((value) => value.trim()) : node.value,
        important: Boolean(node.important),
      }));
      assert.deepEqual(actual, expected, `${selector}: only the default outline-color token changes`);
    }
    for (const selector of ['.transition-all', '.transition-\\[outline-color\\]', '.\\[transition-property\\:outline-color\\]', '.duration-300', '.ease-linear']) {
      assert.equal(after.find((rule) => rule.selector === selector)?.toString(), before.find((rule) => rule.selector === selector)?.toString(), selector);
      assert(before.some((rule) => rule.selector === selector), selector);
    }
    const again = await postcss([compat()]).process(result.css, { from: undefined });
    assert.equal(again.css, result.css, 'a second pass does not change transition declarations');
  });
}

test('custom, partial, compound, list, and arbitrary transition declarations stay byte-exact', async () => {
  const value = 'color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to';
  const css = [
    `.article{transition-property:${value}}`,
    `.transition-colors-extra{transition-property:${value}}`,
    `.transition .article{transition-property:${value}}`,
    `.transition,.article{transition-property:${value}}`,
    `.transition-colors.extra{transition-property:${value}}`,
    `.transition-colors[data-custom]{transition-property:${value}}`,
    `.transition-colors{transition-property:color,outline-color}`,
    `.transition-all{transition-property:${value}}`,
    `.transition-\\[outline-color\\]{transition-property:outline-color}`,
    `.\\[transition-property\\:outline-color\\]{transition-property:outline-color}`,
    `[data-style="transition-colors"]{transition-property:${value}}`,
  ].join('');
  const result = await postcss([compat()]).process(css, { from: undefined });
  assert.equal(result.css, css);
});

test('official Tailwind 4 and PostCSS are pinned without the vulnerable v3 chain', () => {
  assert.equal(manifest.devDependencies.tailwindcss, '4.3.3');
  assert.equal(manifest.devDependencies['@tailwindcss/postcss'], '4.3.3');
  assert.equal(manifest.devDependencies.autoprefixer, undefined);
  for (const dependency of ['braces', 'chokidar', 'micromatch', 'fast-glob']) {
    assert.equal(Object.keys(lock.packages).some((name) => name.endsWith(`/node_modules/${dependency}`) || name === `node_modules/${dependency}`), false, dependency);
  }
});

for (const optimize of [false, true]) {
  test(`generated sibling contracts survive optimize=${optimize}`, async () => {
    const result = await postcss([tailwind({ base: root, optimize }), compat()]).process(fixture, { from: path.join(root, 'app/compat-contract.css') });
    const rules = getRules(result.css);
    const modernSibling = rules.filter((rule) => /^:where\(\.[^\s>]*(?:space-[xy]-|divide-)[^\s>]*\s*>\s*:not\(:last-child\)\)$/.test(rule.selector));
    assert.deepEqual(modernSibling.map((rule) => rule.selector), [], 'no unhandled v4 sibling selector remains');
    const ordinary = rules.find((rule) => rule.selector === '.space-y-2 > :not([hidden]) ~ :not([hidden])');
    assert(ordinary);
    assert(ordinary.nodes.some((node) => node.prop === 'margin-top' && node.value.includes('1 - var(--tw-space-y-reverse)')));
    assert(ordinary.nodes.some((node) => node.prop === 'margin-bottom' && node.value.includes('var(--tw-space-y-reverse)')));
    assert(!ordinary.nodes.some((node) => node.prop.startsWith('margin-block-')));
    assert(rules.some((rule) => rule.selector.includes('md\\:space-y-3 > :not([hidden]) ~ :not([hidden])')));
    assert(rules.some((rule) => rule.selector.includes('space-y-reverse > :not([hidden]) ~ :not([hidden])')));
    const important = rules.find((rule) => rule.selector.includes('space-y-2\\! > :not([hidden]) ~ :not([hidden])'));
    assert(important);
    assert(important.nodes.filter((node) => node.type === 'decl').every((node) => node.important));
    const horizontal = rules.find((rule) => rule.selector === '.space-x-2 > :not([hidden]) ~ :not([hidden])');
    assert(horizontal?.nodes.some((node) => node.prop === 'margin-left'));
    assert(horizontal?.nodes.some((node) => node.prop === 'margin-right'));
    const divide = rules.find((rule) => rule.selector === '.divide-y > :not([hidden]) ~ :not([hidden])');
    assert(divide?.nodes.some((node) => node.prop === 'border-top-width' && node.value.includes('1 - var(--tw-divide-y-reverse)')));
    assert(divide?.nodes.some((node) => node.prop === 'border-bottom-width' && node.value.includes('var(--tw-divide-y-reverse)')));
    assert(rules.some((rule) => rule.selector === '.divide-slate-200 > :not([hidden]) ~ :not([hidden])' && rule.nodes.some((node) => node.prop === 'border-color')));
    assert(rules.some((rule) => rule.selector.includes('divide-\\[\\#dde4e0\\] > :not([hidden]) ~ :not([hidden])')));
    assert(rules.some((rule) => rule.selector.includes('divide-\\[var\\(--flowme-workspace-line\\)\\] > :not([hidden]) ~ :not([hidden])')));
    const divideX = rules.find((rule) => rule.selector === '.divide-x > :not([hidden]) ~ :not([hidden])');
    assert(divideX?.nodes.some((node) => node.prop === 'border-left-width'));
    assert(divideX?.nodes.some((node) => node.prop === 'border-right-width'));
    assert(!divideX.nodes.some((node) => node.prop.startsWith('border-inline-')));
    const again = await postcss([compat()]).process(result.css, { from: undefined });
    assert.equal(again.css, result.css, 'second compatibility pass is inert');
  });
}

test('unrelated and attribute selectors are untouched; current generated declarations are required', async () => {
  const css = ':where(.article > :not(:last-child)){margin-block-end:1rem}:where(.not-space-y-2 > :not(:last-child)){--tw-space-y-reverse:0;margin-block-end:1rem}:where([data-style="divide-y"] > :not(:last-child)){border-color:red}:where(.space-y-note > :not(:last-child)){color:red}';
  const result = await postcss([compat()]).process(css, { from: undefined });
  assert.equal(result.css, css);
});

test('main and historical builds use the same compatibility boundary', () => {
  for (const file of ['postcss.config.js', 'tests/e2e/historical-app/postcss.config.js']) {
    const config = require(path.join(root, file));
    const plugins = Object.keys(config.plugins);
    assert.equal(plugins[0], '@tailwindcss/postcss');
    assert.equal(plugins[1], path.join(root, 'scripts/tailwind-v3-compat.cjs'));
    assert.equal(config.plugins['@tailwindcss/postcss'].base, root.replace(/[\\/]$/, ''));
  }
  const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8');
  assert(css.includes('@import "tailwindcss/utilities.css" source(none);'));
  assert(!/@import[^;]+layer\(/.test(css), 'legacy form/global rules retain the unlayered cascade');
  assert(css.includes('@source "./";'));
  assert(css.includes('@source "../components";'));
  const visual = readFileSync(path.join(root, 'app/tailwind-v3-compat.css'), 'utf8');
  for (const token of ['--color-slate-950: #020617;', '--color-gray-200: #e5e7eb;', '--color-blue-500: #3b82f6;', '--default-ring-width: 3px;']) assert(visual.includes(token));
});

test('existing production templates use official aliases without structural rewrites', () => {
  function check(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) check(filename);
      else if (filename.endsWith('.tsx') && !filename.endsWith('.test.tsx')) {
        const code = readFileSync(filename, 'utf8');
        assert.equal(/(?<![a-z-])(backdrop-blur-sm|drop-shadow-sm|outline-none|shadow-sm|rounded-sm|blur-sm)(?![a-z-])/.test(code), false, filename);
      }
    }
  }
  check(path.join(root, 'app'));
  check(path.join(root, 'components'));
});

test('actual optimized app stylesheet preserves focus and field defaults without new sibling selectors', async () => {
  const filename = path.join(root, 'app/globals.css');
  const result = await postcss([tailwind({ base: root, optimize: true }), compat()]).process(readFileSync(filename, 'utf8'), { from: filename });
  const rules = getRules(result.css);
  const remaining = rules.filter((rule) => /^:where\(\.[^\s>]*(?:space-[xy]-|divide-)[^\s>]*\s*>\s*:not\(:last-child\)\)$/.test(rule.selector));
  assert.deepEqual(remaining.map((rule) => rule.selector), []);
  assert(rules.some((rule) => rule.selector.includes(':focus-visible') && rule.nodes.some((node) => node.prop === 'outline-offset' && node.value === '3px' && node.important)));
  assert(rules.some((rule) => rule.selector === 'body' && rule.nodes.some((node) => node.prop === 'font-family' && node.value.includes('Pretendard'))));
  assert(rules.some((rule) => rule.selector.includes('input:not(:where(') && rule.selector.includes('textarea') && rule.selector.includes('select') && rule.nodes.some((node) => node.prop === 'background-color' && ['#fff', '#ffffff'].includes(node.value))));
  for (const selector of ['.transition', '.transition-colors']) {
    const transition = rules.find((rule) => rule.selector === selector);
    assert(transition, selector);
    assert(!transition.nodes.some((node) => node.prop === 'transition-property' && node.value.split(',').map((value) => value.trim()).includes('outline-color')), selector);
  }
});
