import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// R9b-1: the editor body (vendor/text-editor.css) moves from green literals to the navy raw tokens,
// fixes four low-contrast pairs, and draws checks like the R7 today rows. Colors only.
const css = readFileSync(new URL('./vendor/text-editor.css', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../../../app/globals.css', import.meta.url), 'utf8');
const token = (name: string) => new RegExp(`--flowme-b-${name}: (#[0-9a-f]{6});`).exec(globals)![1];
const rule = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  assert(at >= 0, selector);
  return css.slice(at, css.indexOf('}', at));
};
function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const h = !d ? 0 : max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s: d / (1 - Math.abs(max + min - 1) || 1) };
}
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test('no green literal is left in the editor body CSS', () => {
  const literals = [...css.matchAll(/#([0-9a-fA-F]{6})\b/g)].map(match => `#${match[1].toLowerCase()}`);
  const greens = literals.filter(hex => { const { h, s } = hsl(hex); return h >= 90 && h <= 180 && s > 0.08; });
  assert.deepEqual(greens, []);
  assert(!/rgba\(\s*(105|19|81)\s*,/.test(css));
});

test('the four low-contrast pairs now meet WCAG on white, through the navy tokens', () => {
  const white = '#ffffff';
  // W4 made the box 20px with the today list's 2px border; the color pair is unchanged.
  assert.match(rule('.tle-check-glyph'), /border: 2px solid var\(--flowme-b-control\)/);
  assert.match(css, /\.tle-line-complete \{ color: var\(--flowme-b-muted\); \}/);
  assert.match(css, /\.tle-line-property \{ color: var\(--flowme-b-muted\); \}/);
  assert.match(css, /\.tle-scope-subtitle \{ flex-shrink: 0; color: var\(--flowme-b-muted\); font-size: 12px; \}/);
  assert(contrast(token('control'), white) >= 3);             // check box border: 3.52
  assert(contrast(token('muted'), white) >= 4.5);              // done text, property line, folder subtitle: 5.73
  assert.equal(contrast(token('control'), white).toFixed(2), '3.52');
  assert.equal(contrast(token('muted'), white).toFixed(2), '5.73');
  assert(contrast('#ffffff', token('primary')) > contrast('#ffffff', '#2b8568'));   // white ✓ on the fill: 4.51 → 7.07
});

test('checks look like the R7 today rows: bordered box, navy fill with a white ✓, a pill for partial progress; geometry unchanged', () => {
  const box = rule('.tle-check-glyph');
  // W4: 20px with 6px corners like the today list; centred on the same lane (13px → 12px from the top).
  for (const kept of ['top: 12px;', 'width: 20px;', 'height: 20px;', 'border-radius: 6px;', 'color: #fff;', 'font: 13px/16px system-ui, sans-serif;']) assert(box.includes(kept), kept);
  assert.match(css, /\.tle-check-glyph\[data-checked="true"\] \{ border-color: var\(--flowme-b-primary\); background: var\(--flowme-b-primary\); \}/);
  const badge = css.slice(css.indexOf('.tle-progress-badge {'), css.indexOf('}', css.indexOf('.tle-progress-badge {')));
  assert(badge.includes('width: 42px; height: 24px;') && badge.includes('border: 1px solid #dfd2b8; border-radius: 12px; background: #fcf8ed;'));
  // The same pill colors as the today row (ProgramSpace.module.css).
  const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.module.css', import.meta.url), 'utf8');
  assert(space.includes('border: 1px solid #dfd2b8; border-radius: 12px; background: #fcf8ed; color: #785627;'));
  assert.match(css, /\.tle-progress-hit \{ color: #785627;/);
  // Line ruler values are untouched; the box stays centred on the line (W4: 20px).
  assert(css.includes('top: calc((var(--tle-line) - 20px) / 2)') && css.includes('top: calc((var(--tle-line) - 24px) / 2)'));
});
