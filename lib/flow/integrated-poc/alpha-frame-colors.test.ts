import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

// R9b-2: the editor frame, the dialogs, one scrim and the last text under 12px move to the navy tokens.
// Colors and five small sizes only; the editor's 26px line ruler and body height stay as they were.
const dir = new URL('../../../components/flow/integrated-poc/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, dir), 'utf8').replace(/\r\n/g, '\n');
const globals = readFileSync(new URL('../../../app/globals.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const token = (name: string) => new RegExp(`--flowme-b-${name}: (#[0-9a-f]{3,6});`).exec(globals)![1];
const modules = readdirSync(dir).filter(name => name.endsWith('.module.css'));
const R9B2 = ['ProgramTextEditor', 'AlphaWorkspace', 'ProgramSpace', 'AlphaPreservationPanel', 'ProgramCreatorStructureForm', 'ProgramRevisionHistory',
  'ProgramPrivateOutput', 'ProgramCopyInspector', 'ProgramLegacyWorkspace', 'ProgramCreatorWorkspace', 'ProgramFolderRegionEditor'].map(name => `${name}.module.css`);

function rgb(hex: string) {
  let h = hex.slice(1);
  if (h.length <= 4) h = h.slice(0, 3).split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}
function greenish([r, g, b]: number[]) {
  const [x, y, z] = [r, g, b].map(v => v / 255), max = Math.max(x, y, z), min = Math.min(x, y, z), d = max - min;
  const h = !d ? 0 : max === x ? 60 * (((y - z) / d) % 6) : max === y ? 60 * ((z - x) / d + 2) : 60 * ((x - y) / d + 4);
  const s = d / (1 - Math.abs(max + min - 1) || 1);
  return (h + 360) % 360 >= 60 && (h + 360) % 360 <= 190 && s > 0.04;
}
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = rgb(hex).map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test('no green or warm-paper literal is left in the editor frame, the dialogs and the folder region', () => {
  for (const name of R9B2) {
    const css = read(name);
    const hex = [...css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)].map(match => `#${match[1].toLowerCase()}`).filter(value => greenish(rgb(value)));
    const rgbs = [...css.matchAll(/rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/g)].filter(match => greenish([+match[1], +match[2], +match[3]])).map(match => match[0]);
    assert.deepEqual([...hex, ...rgbs], [], name);
  }
  const editor = read('ProgramTextEditor.module.css');
  assert(!/#fffefa|#f4f5ef|#5e6d70/.test(editor));
  assert(editor.includes('.dialog input { box-sizing: border-box; min-width: 0; width: 100%; min-height: 48px; padding: 10px; border: 1px solid var(--flowme-b-control);'));
  assert(editor.includes('.editor button:focus-visible, .editor input:focus-visible { outline: 2px solid var(--flowme-b-primary); outline-offset: 2px; }'));
});

// W9a (items 30·31): the publisher, the conflict review and the recurrence surfaces reached from writing.
// Their greens and warm grays move to the navy tokens; progress, late, warning and error get meaning tokens
// with the values already in use, and these modules use the warning and error ones.
const W9A = ['ProgramPublisher', 'AlphaConflictReview', 'ProgramRecurrence'].map(name => `${name}.module.css`);
const MEANING = ['progress-ink', 'progress-bg', 'progress-border', 'late-ink', 'warning-ink', 'warning-bg', 'warning-border', 'error-ink', 'error-bg', 'error-border'];

test('no green or warm literal is left in the publisher, conflict review and recurrence; meaning colors are tokens', () => {
  for (const name of W9A) {
    const css = read(name), literals = [...css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)].map(match => `#${match[1].toLowerCase()}`);
    assert.deepEqual(literals.filter(value => greenish(rgb(value))), [], name);
    assert.deepEqual([...new Set(literals)], name === 'ProgramPublisher.module.css' ? [] : ['#fff'], `${name}: colors use tokens, except existing white`);
    assert.deepEqual([...css.matchAll(/rgba?\(/g)], [], name);
  }
  for (const name of MEANING) assert(token(name), name);
  const publisher = read('ProgramPublisher.module.css');
  assert.match(publisher, /\.error\{[^}]*border-left:3px solid var\(--flowme-b-error-border\);[^}]*background:var\(--flowme-b-error-bg\);[^}]*color:var\(--flowme-b-error-ink\)/);
  assert.match(publisher, /\.warning\{[^}]*background:var\(--flowme-b-warning-bg\);[^}]*color:var\(--flowme-b-warning-ink\)/);
  const recurrence = read('ProgramRecurrence.module.css');
  assert(recurrence.includes('.error { color: var(--flowme-b-error-ink); }'));
  assert(recurrence.includes('border: 1px solid var(--flowme-b-control); border-radius: 7px;'), 'the recurrence fields keep a 3:1 boundary');
});

test('W9a contrast: changed text is 4.5:1 on its surfaces, field boundaries and focus rings 3:1', () => {
  const white = '#ffffff';
  const text: [string, string[]][] = [['ink', ['surface', 'surface-subtle', 'selected']], ['muted', ['surface', 'surface-subtle']],
    ['primary-strong', ['surface', 'selected']], ['primary', ['surface']], ['error-ink', ['error-bg', 'surface']], ['warning-ink', ['warning-bg']],
    ['progress-ink', ['progress-bg']], ['late-ink', ['surface']]];
  const value = (name: string) => name === 'surface' ? white : token(name);
  for (const [ink, surfaces] of text) for (const surface of surfaces) assert(contrast(value(ink), value(surface)) >= 4.5, `${ink} on ${surface}`);
  assert(contrast(white, token('primary')) >= 4.5, 'the primary button label');
  assert(contrast(token('control'), white) >= 3, 'field boundaries');
  assert(contrast(token('primary'), white) >= 3, 'focus rings');
  assert(contrast(token('error-border'), token('error-bg')) >= 3, 'the error stripe');
});

test('every Alpha dialog backdrop is the one scrim, still defined where ::backdrop does not inherit', () => {
  const rules = modules.flatMap(name => [...read(name).matchAll(/([.\w:-]+)::backdrop\s*\{([^}]*)\}/g)].map(match => ({ name, selector: match[1], body: match[2].trim() })));
  // ProgramApp is the /my PoC; its backdrop is already navy and outside Alpha.
  const alpha = rules.filter(rule => rule.name !== 'ProgramApp.module.css');
  // FC2 added the Flow 찾기 import sheet; R7 the 저장과 공개 안내 sheet; UX B3 the 복구함 sheet.
  assert.equal(alpha.length, 12);
  for (const rule of alpha) assert.match(rule.body, /^background:\s?var\(--flowme-b-scrim\);?$/, `${rule.name} ${rule.selector}`);
  // Every Alpha <dialog> module has one of those rules.
  for (const name of ['ProgramTextEditor', 'ProgramSpace', 'AlphaWorkspace', 'AlphaPreservationPanel', 'ProgramCreatorStructureForm', 'ProgramPrivateOutput', 'ProgramPublisher', 'ProgramDiscovery', 'AlphaPrivacyNotice']) {
    assert(alpha.some(rule => rule.name === `${name}.module.css`), name);
  }
  // Core3 P3: the toast tokens follow the shadow.
  assert.match(globals, /:root \{[^}]*--flowme-b-scrim: rgb\(24 34 53 \/ \.4\);\n {2}--flowme-b-shadow: rgb\(24 34 53 \/ \.14\);\n/);
  assert.match(globals, /--flowme-b-on-ink: #fff;\n {2}--flowme-b-on-ink-muted: #c9d3ff;\n {2}--flowme-b-toast-shadow: rgb\(24 34 53 \/ \.25\);\n\}/);
  assert.match(globals, /\n::backdrop \{\n {2}--flowme-b-scrim: rgb\(24 34 53 \/ \.4\);\n\}/);
  // Raised panels share the shadow token.
  for (const name of ['ProgramTextEditor', 'AlphaWorkspace', 'ProgramSpace', 'ProgramCreatorWorkspace']) assert(read(`${name}.module.css`).includes('var(--flowme-b-shadow)'), name);
});

test('no text under 12px in the Alpha modules', () => {
  const small: string[] = [];
  for (const name of modules) {
    for (const decl of read(name).replace(/\/\*[\s\S]*?\*\//g, '').split(/[;{}]/)) {
      const match = /^\s*font(-size)?\s*:\s*(.*)$/.exec(decl);
      if (!match) continue;
      // font shorthand: the size is the first length (before an optional /line-height).
      const size = /(?:^|\s)(\d*\.?\d+)(px|rem|em)\b/.exec(match[2]);
      if (!size) continue;
      const px = size[2] === 'px' ? Number(size[1]) : Number(size[1]) * 16;
      if (px < 12) small.push(`${name}: ${decl.trim()}`);
    }
  }
  assert.deepEqual(small, []);
});

test('the size changes leave the line ruler and the body height alone', () => {
  const editor = read('ProgramTextEditor.module.css');
  for (const kept of ['--tle-line: 26px;', '--tle-line: 44px;', '.host { height: var(--program-editor-visible-height, calc(100dvh - 360px)); min-height: 64px; }',
    '.host :global(.tle-scheduled-date-open) { width: 44px; }',
    '.host :global(.tle-scheduled-date-open .tle-row-date) { max-width: 44px; font-size: 12px; line-height: 16px; white-space: nowrap; }']) assert(editor.includes(kept), kept);
  // 예정일 at 12px still fits the fixed 44 × 44 date cell: 3 × 12 = 36px wide; kind 14 + gap 1 + date 16 (+ gap 1 + 10px icon) = 42px tall.
  assert(editor.includes('.host :global(.tle-scheduled-date-open .tle-row-date-kind) { font-size: 12px; line-height: 14px; }'));
  const vendor = readFileSync(new URL('./vendor/text-editor.css', import.meta.url), 'utf8');
  assert(vendor.includes('.tle-row-open { width: 44px; height: 44px;') && vendor.includes('flex-direction: column; align-items: center; justify-content: center; gap: 1px;') && vendor.includes('.tle-date-open svg { width: 10px; height: 10px; }'));
  assert(3 * 12 <= 44 && 14 + 1 + 16 + 1 + 10 <= 44);
  // The 11px mobile status rule was always overridden by the later 13px rules; only that declaration went.
  assert(editor.includes('  .status { flex-basis: 100%; margin-left: 0; padding: 0 4px; }'));
  assert(editor.indexOf('.status { font-size: 13px; line-height: 20px; color: var(--flowme-b-muted); }') > editor.indexOf('.status { flex-basis: 100%;'));
  // Body height is still whole 26px rows below the measured top; nothing above the host changed size.
  const tsx = readFileSync(new URL('ProgramTextEditor.tsx', dir), 'utf8');
  // U45: whole lines of the ruler the editor reads (36px on touch); 26px stays the default.
  // Write polish D (11/7): the top padding is read from the ruler too; 20px stays the default.
  assert(tsx.includes('export function programEditorVisibleHeight(top: number, bottom: number, line = 26, pad = 20) {'));
  assert(tsx.includes('return Math.max(64, head + Math.floor((available - head) / step) * step);'));
});

test('the swapped pairs meet WCAG on their surfaces; the field boundaries and focus rings that failed now pass', () => {
  const white = '#ffffff';
  assert(contrast(token('ink'), white) >= 14);
  assert(contrast(token('muted'), white) >= 4.5 && contrast(token('muted'), token('surface-subtle')) >= 4.5);
  assert(contrast(token('primary-strong'), token('selected')) >= 4.5 && contrast(token('primary-strong'), token('surface-subtle')) >= 4.5);
  assert(contrast(white, token('primary')) >= 4.5);
  // Field boundaries: 1.55–2.13 → 3.52; focus rings 3.20–5.39 → 7.07.
  for (const before of ['#b5c9bd', '#9eb7b1', '#c0d4d1', '#b9cecb', '#b5c8c0']) assert(contrast(before, white) < 3 && contrast(token('control'), white) >= 3, before);
  for (const before of ['#187952', '#079e91', '#117e77', '#469e91']) assert(contrast(token('primary'), white) > contrast(before, white), before);
});
