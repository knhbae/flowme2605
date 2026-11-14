import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
const start = source.indexOf('const rowPlans = rowButtons.map(');
const end = source.indexOf('const foldPlans =', start);
assert(start > 0 && end > start);
// Exercise the actual geometry pass, including the visibility decision, rather than a copy of its guard.
const pass = new vm.Script(`(() => { ${source.slice(start, end)} return rowPlans; })()`);
function scene() {
  let reads = 0;
  const row: any = { hidden: false, offsetTop: 40, classList: { contains: (c: string) => c === 'tle-line-raw' && row.raw },
    querySelector: () => { reads++; return { firstChild: { nodeType: 3, length: 3 } }; } };
  const button: any = { dataset: { lineIndex: '2' }, parentElement: null, classList: { contains: () => true } };
  const ctx: any = { only: null, moved: false, rowButtons: [{ button, row, type: 'scope-open' }], actionsDisabled: false,
    scrollTop: 0, readingView: false, foldedIds: new Set(), mode: 'live', lineHeight: 32, height: 100, textPaddingLeft: 14,
    rootBox: { left: 0 }, rect: () => { reads++; return { left: 14, right: 300 }; },
    doc: { createRange: () => ({ setStart() {}, setEnd() {}, getClientRects: () => { reads++; return [{ left: 84 }]; } }) } };
  ctx.scopeHidden = (r: any, top: number, local: boolean) => r.hidden || r.classList.contains('tle-line-raw') ||
    (ctx.mode !== 'live' && !ctx.foldedIds.size) || (!local && (top < 0 || top + ctx.lineHeight > ctx.height));
  return { ctx, row, button, read: () => reads, run: () => pass.runInNewContext(ctx) as any[] };
}
test('offscreen, active RAW, folded-away and text-mode scope controls do not read glyph geometry', () => {
  for (const change of [(s: ReturnType<typeof scene>) => { s.row.offsetTop = 101; },
    (s: ReturnType<typeof scene>) => { s.row.offsetTop = -1; },
    (s: ReturnType<typeof scene>) => { s.row.raw = true; },
    (s: ReturnType<typeof scene>) => { s.row.hidden = true; },
    (s: ReturnType<typeof scene>) => { s.ctx.mode = 'text'; }]) {
    const s = scene(); change(s); const p = s.run()[0];
    assert.equal(p.hidden, true); assert.equal(p.disabled, false); assert.equal(s.read(), 0);
  }
});
test('a hidden scope re-entering the viewport is measured using its current DOM and disabled state', () => {
  const s = scene(); s.row.offsetTop = 101; assert.equal(s.run()[0].hidden, true);
  s.row.offsetTop = 35; s.ctx.actionsDisabled = true; const p = s.run()[0];
  assert.equal(p.hidden, false); assert.equal(p.top, '35px'); assert.equal(p.left, '0px'); assert.equal(p.width, '84px');
  assert.equal(p.disabled, true); assert(s.read() > 0);
});
test('local scope controls keep their old geometry even outside the scrolled viewport', () => {
  const s = scene(); s.row.offsetTop = -500; s.button.parentElement = s.row;
  const p = s.run()[0]; assert.equal(p.hidden, false); assert.equal(p.top, '0px'); assert(s.read() > 0);
});
test('folded reading controls remain measurable in non-live mode', () => {
  const s = scene(); s.ctx.mode = 'text'; s.ctx.foldedIds.add('scope');
  assert.equal(s.run()[0].hidden, false); assert(s.read() > 0);
});
