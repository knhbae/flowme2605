import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// FC12 re-review (P2): a task row is one 44px line (UX FC-DETAIL-HEAD); a long title or date is cut with … there,
// and the row's ▸ shows them in full. Sizes are CSS, so the rules are checked as written.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const css = read('ProgramDiscovery.module.css'), tsx = read('ProgramDiscovery.tsx');

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
