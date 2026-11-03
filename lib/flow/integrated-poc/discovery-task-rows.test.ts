import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// FC12 re-review (P2): a task row is one 44px line (UX FC-DETAIL-HEAD); a long title or date is cut with … there,
// and the row's ▸ shows them in full. Sizes are CSS, so the rules are checked as written.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const css = read('ProgramDiscovery.module.css'), tsx = read('ProgramDiscovery.tsx');

test('Flow 찾기 cards keep to the screen: a long source or title is cut inside the card, never widening the column', () => {
  // 390 phones had a 681px column (1fr's minimum is the longest one-line text); both widths now start from 0.
  assert(css.includes('.flowCards{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}'));
  assert(css.includes('.flowCards>li{min-width:0}'));
  assert(css.includes('@media(max-width:700px){.flowCards{grid-template-columns:minmax(0,1fr)}'));
  assert(!/\.flowCards\{[^}]*grid-template-columns:(?:1fr|repeat\(\d+,1fr\))/.test(css));
  assert(css.includes('.cardMeta,.cardSource{font-size:12px;line-height:18px;color:#5b6b66;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'));
  assert(css.includes('.cardTitle{flex:1 1 auto;min-width:0;'));
});

test('a task row stays one 44px line: title and date are cut, never wrapped', () => {
  assert(css.includes('.taskRows>li{padding:0}'));
  assert(css.includes('.taskRow{display:grid;grid-template-columns:auto 24px minmax(0,1fr) auto;align-items:center;gap:8px;min-height:44px}'));
  assert(css.includes('.taskTitle,.taskDate{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.taskDate{max-width:12em}'));
  assert(css.includes('.taskToggle{flex:0 0 44px;width:44px;min-height:44px!important;'));
  // Cut rows are measured and get ▸, which opens the full title and date first.
  assert.match(tsx, /data-task-clip=\{item\.id\}>\{item\.title\}<\/span><span className=\{styles\.taskDate\} data-task-clip=\{item\.id\}>\{dateLabel\}/);
  assert.match(tsx, /element\.scrollWidth > element\.clientWidth \+ 1/);
  assert.match(tsx, /hasDetails = cut \|\| hasMethod;/);
  assert.match(tsx, /\{cut && <p className=\{styles\.taskFull\}><strong>\{item\.title\}<\/strong><br \/>\{dateLabel\}<\/p>\}/);
});
