import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { extendProgramRecentRaw, programOneLineEdit, programRecentHidden, programRecentHold, restrictProgramRecent } from './recent-writing';
import { PROGRAM_ROW_PATCH } from './typing-row-patch';

// typelag ③ (총괄 11/11): in a long document's recent view the 복구함's whole raw for a key typed within one line comes
// from the editor's own lines (that line's words in place), not from a model run per key; the same raw as before.
const owner = '77777777-7777-4777-8777-777777777777', today = '2026-11-11';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `t3-${++request}`, expectedSpace: data.spaces[owner] });
const day = (offset: number) => new Date(Date.UTC(2026, 10, 11 + offset)).toISOString().slice(0, 10);
function write() {
  const lines: string[] = [];
  // Newest first: 6 recent days, then 30 old ones (folded), with a blank line between days.
  for (let d = 1; d >= -35; d--) {
    if (lines.length) lines.push('');
    lines.push(`[${day(d)}]`, `메모 ${d}`);
    for (let k = 0; k < 4; k++) lines.push(`- [${d >= 0 || k % 2 ? ' ' : 'x'}] 일 ${d} ${k}`, ...(k === 1 ? [`  - [ ] 하위 ${d}`, `  - 메모: 메모 ${d}`] : []));
  }
  const raw = lines.join('\n');
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(initial, { ...base(initial), title: '최근만', raw }));
  const text = made.data.spaces[owner].text, docId = made.result, hold = programRecentHold(text, docId, today)!, hidden = programRecentHidden(text, hold);
  return { text, docId, hidden, restricted: restrictProgramRecent(text, docId, hidden) };
}
const withSwitch = <T,>(on: boolean, run: () => T): T => { const was = PROGRAM_ROW_PATCH.enabled; PROGRAM_ROW_PATCH.enabled = on; try { return run(); } finally { PROGRAM_ROW_PATCH.enabled = was; } };

test('one-line edits: the line and its words; anything else is not one', () => {
  assert.deepEqual(programOneLineEdit('a\nb\nc', 'a\nbx\nc'), { index: 1, text: 'bx' });
  assert.deepEqual(programOneLineEdit('a\nb', 'a\n'), { index: 1, text: '' });
  for (const next of ['a\nb\nc', 'ax\nbx\nc', 'a\nb\nc\nd', 'a\nc']) assert.equal(programOneLineEdit('a\nb\nc', next), null, next);
});

test('the recent view\'s 복구함 raw for words typed in one line: the same whole raw as the model\'s reading, folded lines in order', () => {
  const { text, docId, hidden, restricted } = write();
  const whole = M.getDocument(text, docId)!.lines, shownRaw = M.raw(M.getDocument(restricted, docId)), shown = shownRaw.split('\n');
  assert(whole.length > 200 && hidden.size > 100 && shown.length < whole.length, `${whole.length} ${hidden.size} ${shown.length}`);
  let compared = 0;
  for (let index = 0; index < shown.length; index++) for (const edit of [(line: string) => line + '가', (line: string) => line + ' 나다', (line: string) => line.slice(0, -1)]) {
    const typed = shown.map((line, i) => i === index ? edit(line) : line).join('\n');
    if (typed === shownRaw) continue;
    const on = withSwitch(true, () => extendProgramRecentRaw(text, docId, hidden, typed, restricted));
    const off = withSwitch(false, () => extendProgramRecentRaw(text, docId, hidden, typed, restricted));
    assert.equal(on, off, `${index}: ${JSON.stringify(shown[index])}`);
    const kept = on.split('\n');
    assert.equal(kept.length, whole.length);
    assert(whole.filter(line => hidden.has(line.id)).every(line => kept.includes(line.text)), 'every folded line');
    compared++;
  }
  assert(compared > 60, String(compared));
});

test('check controls (row patch on): one layer whose visibility is the check-ready state; off, the root class as before', () => {
  const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8').replace(/\r/g, '');
  assert(vendor.includes("if (rowPatchOn) { controls.append(checkLayer); root.classList.add('tle-check-layered'); }"));
  assert(vendor.includes('appendRowControl(row, button, rowPatchOn ? checkLayer : null);'), 'only check controls go in the layer');
  assert(vendor.includes("} else (layer || controls).append(button);"), 'reading and folded views keep them in their rows');
  assert(vendor.includes("if (rowPatchOn) { const shown = checkReady ? '' : 'hidden'; if (checkLayer.style.visibility !== shown) checkLayer.style.visibility = shown; }\n      else root.classList.toggle('tle-edit-check-ready', checkReady);"));
  const css = readFileSync(new URL('./vendor/text-editor.css', import.meta.url), 'utf8').replace(/\r/g, '');
  const state = '.tle-root.tle-check-layered[data-mode="live"]:not(.tle-reading-view):not(.tle-folded-view):not(.tle-has-move-selection):not([data-move-phase="selected"]):not([data-move-phase="dragging"]) .tle-check-layer > .tle-check-hit';
  assert(css.includes(`${state} { display: block; clip-path: inset(0 var(--tle-check-clip-right, 44px) var(--tle-check-clip-bottom, 44px) 0); }`));
  assert(css.includes(`${state} > .tle-progress-badge { visibility: hidden; }`));
  // The switch off keeps r3's rules (the root class shows the controls).
  assert(css.includes('.tle-root[data-mode="live"].tle-edit-check-ready:not(.tle-reading-view):not(.tle-folded-view):not(.tle-has-move-selection):not([data-move-phase="selected"]):not([data-move-phase="dragging"]) .tle-check-hit { display: block;'));
});