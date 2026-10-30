import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// W line on N1 fix 5 (390 stub). The keyboard opening in one resize brought the body up once, then the header that
// comes with the keyboard (data-writing-keyboard) arrived and pushed the body 48px down again: at 250 visible after a
// close and reopen the last line sat 187..213 under the bar from 201. And W2's notices under the body did not count:
// with the body ending 212 and the bar from 211, the notice 212..264 was wholly under the bar but nothing was cramped.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const update = editor.slice(editor.indexOf('const update = () => {\n      frame = 0;'), editor.indexOf('const observer = new ResizeObserver(schedule);'));

test('the notices under the body count when the body is checked against the bar', () => {
  assert.match(update, /const end = Math\.max\(host\.getBoundingClientRect\(\)\.bottom, notice\?\.getClientRects\(\)\.length \? notice\.getBoundingClientRect\(\)\.bottom : 0\);/);
  assert.match(update, /programKeyboardBarCramped\(end, bar!\.getBoundingClientRect\(\)\.top\)/);
  assert(update.indexOf('const notice = noticeRef.current;') < update.indexOf('const end = '));
});

test('inside the short window after the keyboard or focus, the body is brought up again whenever it is cramped', () => {
  assert.match(update, /if \(view\.performance\.now\(\) < nudgeUntil && barShown && programKeyboardBarCramped\(end, bar!\.getBoundingClientRect\(\)\.top\)\) host\.scrollIntoView\(\{ block: 'start' \}\);/);
  assert(!update.includes('nudgeUntil = 0'));
  // The header's attribute is watched, so its arrival runs the check again.
  assert(editor.includes("attributeFilter: ['hidden', 'open', 'data-writing-keyboard']"));
  assert(editor.includes('const scheduleNudge = () => { nudgeUntil = view.performance.now() + 600; schedule(); };'));
});
