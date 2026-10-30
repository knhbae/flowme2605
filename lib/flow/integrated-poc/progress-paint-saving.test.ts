import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// W3 observation (390 synthetic, 100ms samples): about 0.5s after any input a progress task row showed RAW
// '- [30%] 자료 모으기' for ~100ms, the same on the build before W3. The host's actionsDisabled includes a save in
// flight, and the vendor used that flag to decide whether a progress mark is painted as a task. A save blocks
// actions; it does not make the row metadata stale. Painting now follows its own flag.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const vendor = read('./vendor/text-editor.cjs');
const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');

test('the renderer decides progress paint by the paint flag; hosts without it keep the action rule', () => {
  assert.match(vendor, /const paintDisabled = typeof config\.isPaintDisabled === 'function' \? config\.isPaintDisabled\(\) : actionsDisabled;/);
  assert.match(vendor, /const parsedTask = matchTask\(line, safeMeta, false, paintDisabled\);/);
  // Actions (Enter's task handling, controls) still follow isActionDisabled.
  assert.match(vendor, /const task = matchTask\(line\.text, meta, false, actionsDisabled\);/);
  const matchTask = new Function(`const TASK = /^(\\s*)-\\s+\\[([ xX]|\\d+(?:\\.\\d+)?%?)\\](\\s+)(.*)$/;
    const EMPTY_TASK = /^(\\s*)-\\s+\\[([ xX]|\\d+(?:\\.\\d+)?%?)\\]\\s*$/; const CHECK_KINDS = ['task', 'reference', 'subcheck'];
    ${vendor.slice(vendor.indexOf('function matchTask('), vendor.indexOf('function indentation('))}; return matchTask;`)() as
    (line: string, meta: unknown, empty: boolean, disabled: boolean) => unknown;
  const meta = { kind: 'task' };
  assert(matchTask('- [30%] 자료 모으기', meta, false, false));
  assert.equal(matchTask('- [30%] 자료 모으기', meta, false, true), null);
});

test('the host keeps painting while a save is in flight; stale metadata still turns paint off', () => {
  assert.match(editor, /const paintDisabled = \(\) => !!checkPendingRef\.current \|\| inputLockedRef\.current \|\| !!propsRef\.current\.readOnly \|\| !!draftRef\.current\?\.getState\(\)\.invalid;/);
  assert.match(editor, /const actionsDisabled = \(\) => paintDisabled\(\) \|\| !!draftRef\.current\?\.getState\(\)\.saving;/);
  assert.match(editor, /isActionDisabled: actionsDisabled,\s*isPaintDisabled: paintDisabled,/);
  const paint = editor.slice(editor.indexOf('const paintDisabled = () =>'), editor.indexOf('const actionsDisabled = () =>'));
  assert(!paint.includes('saving'));
});
