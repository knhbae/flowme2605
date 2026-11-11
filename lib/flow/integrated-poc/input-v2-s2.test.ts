import assert from 'node:assert/strict';
import test from 'node:test';
import { programBracketDate, programBracketDatePlan, programLineDays, programTodayStartPlan } from './input-bar';

// Input v2 stage 2 (11/7): a `[` line read as a day, and the date chip's one edit that turns it into the day's head line.
const today = '2026-11-07';

test('[ forms: this month, next month when past, none when the day does not exist; m/d this year or next; yyyy-m-d', () => {
  assert.equal(programBracketDate('[12', today), '2026-11-12');
  assert.equal(programBracketDate('[7', today), '2026-11-07');
  assert.equal(programBracketDate('[5', today), '2026-12-05');
  assert.equal(programBracketDate('[31', today), null);
  for (const text of ['[11/12', '[11-12', '[11.12']) assert.equal(programBracketDate(text, today), '2026-11-12', text);
  assert.equal(programBracketDate('[9/20', today), '2026-09-20');
  assert.equal(programBracketDate('[1/5', today), '2027-01-05');
  assert.equal(programBracketDate('[2/30', today), null);
  for (const text of ['[2026-11-12', '[2026/11/12', '[2026.11.12']) assert.equal(programBracketDate(text, today), '2026-11-12', text);
  for (const text of ['[', '[2026', '[11/', '[2026-11', '[1a', ' [12', '[12]']) assert.equal(programBracketDate(text, today), null, text);
});

/** Every line of `before` but the `[…` one is in `after` under the day it had. */
function keepsDays(before: string, removed: number, after: string) {
  const oldLines = before.split('\n'), oldDays = programLineDays(before), newLines = after.split('\n'), newDays = programLineDays(after);
  return oldLines.every((line, index) => index === removed || !line.trim() || newDays[newLines.indexOf(line)] === oldDays[index]);
}
const lineRange = (raw: string, index: number) => { const lines = raw.split('\n'), start = lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0); return [start, start + lines[index].length] as const; };

test('the chip: the [ line goes and the head line comes in date order, as one range; no other line changes its day', () => {
  const doc = ['[2026-11-06]', '- /회사 일', '  - [ ] 어제 일', '', '[2026-11-05]', '- [ ] 그제 일'];
  for (const [name, raw, index, date, first] of [
    ['newest first, typed above', ['[11/12', ...doc].join('\n'), 0, '2026-11-12', '[2026-11-12]'],
    ['typed between the days, the day goes first', [...doc.slice(0, 4), '[12', ...doc.slice(4)].join('\n'), 4, '2026-11-12', '[2026-11-12]'],
    ['typed at the end without a line break', [...doc, '[2026-11-08'].join('\n'), 6, '2026-11-08', '[2026-11-08]'],
    ['an older day goes between', ['[11/5', ...doc.slice(0, 4), '[2026-11-04]', '- [ ] 옛 일'].join('\n'), 0, '2026-11-05', '[2026-11-06]'],
  ] as const) {
    const [start, end] = lineRange(raw, index), plan = programBracketDatePlan(raw, start, end, date)!;
    assert.ok(plan, name);
    assert.equal(raw.slice(0, plan.start) + plan.text + raw.slice(plan.end), plan.nextRaw, name);
    assert.ok(!plan.nextRaw.split('\n').some(line => /^\[\d+[-/.]?\d*$/.test(line)), `${name}: the [ line is gone`);
    assert.ok(plan.nextRaw.split('\n').includes(`[${date}]`), `${name}: the head line`);
    assert.equal(plan.nextRaw.split('\n')[0], first, name);
    assert.ok(keepsDays(raw, index, plan.nextRaw), `${name}: days kept`);
    assert.equal(programLineDays(plan.nextRaw)[plan.nextRaw.slice(0, plan.caret).split('\n').length - 1], date, `${name}: the caret is in the new day`);
  }
});

test("the chip on an empty line of that day's block: only the [ text goes, the caret stays on that line", () => {
  const raw = ['[2026-11-12]', '- [ ] 그날 일', '[11/12', '', '[2026-11-06]', '- [ ] 어제 일'].join('\n'), [start, end] = lineRange(raw, 2);
  const plan = programBracketDatePlan(raw, start, end, '2026-11-12')!;
  assert.equal(plan.nextRaw, ['[2026-11-12]', '- [ ] 그날 일', '', '', '[2026-11-06]', '- [ ] 어제 일'].join('\n'));
  assert.equal(plan.caret, start);
  assert.deepEqual([plan.start, plan.end, plan.text], [start, end, '']);
});

test('the plan refuses a range that is not a whole line', () => {
  const raw = 'a\n[12\nb';
  assert.equal(programBracketDatePlan(raw, 3, 5, '2026-11-12'), null);
  assert.equal(programBracketDatePlan(raw, 2, 4, '2026-11-12'), null);
});

test('오늘 시작 줄: offered when today has no head line and it would go first (newest first, or an empty document)', () => {
  const newest = '[2026-11-06]\n- [ ] 어제 일\n\n[2026-11-05]\n- [ ] 그제 일';
  const plan = programTodayStartPlan(newest, today)!;
  assert.deepEqual(plan, { offset: 0, text: '[2026-11-07]\n\n\n', caret: 13 });
  assert.deepEqual(programTodayStartPlan('', today), { offset: 0, text: '[2026-11-07]\n', caret: 13 });
  // Today is there already; an oldest-first document (today goes at its end); no dated head at all: none.
  assert.equal(programTodayStartPlan('[2026-11-07]\n- [ ] 오늘 일\n\n' + newest, today), null);
  assert.equal(programTodayStartPlan('[2026-11-05]\n- [ ] 그제 일\n\n[2026-11-06]\n- [ ] 어제 일', today), null);
  assert.equal(programTodayStartPlan('메모만 있는 글', today), null);
  // A note above the first day: the day still goes right before that head line, so it is offered.
  assert.equal(programTodayStartPlan('메모\n' + newest, today)?.offset, 3);
  // F10 W-ORDER-01 (11/11): one dated head is a new document, oldest first: today goes under yesterday, so not offered.
  assert.equal(programTodayStartPlan('메모\n[2026-11-06]\n- [ ] 어제 일', today), null);
});
test('the editor: phone-bar triggers after one typed character (C1–C6), the folder chips, ↶ steps, 오늘 시작 줄', async () => {
  const { readFileSync } = await import('node:fs');
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const css = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.module.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const trigger = editor.slice(editor.indexOf('function handleBarTrigger('), editor.indexOf('const barTriggerFn = useRef('));
  // C1 the bar is up; C2 typed text only, not composing; C3–C4 one character at the line's end; C5 no fence; C6 nothing open.
  assert.match(trigger, /if \(!barShownNow\(\) \|\| composingRef\.current \|\| !\['insertText', 'insertReplacementText'\]\.includes\(inputType\)\) return;/);
  assert.match(trigger, /raw\.slice\(0, caret - 1\) \+ raw\.slice\(caret\) !== beforeRaw\) return;/);
  assert.match(trigger, /filter\(line => \/\^\\s\*\(```\|~~~\)\/\.test\(line\)\)\.length % 2\) return;/);
  assert.match(trigger, /panelRef\.current \|\| regionPendingRef\.current \|\| checkPendingRef\.current\) return;/);
  for (const kind of ["previous === '' && text === '['", 'openSlashFolders(index)', 'fixDashSlash(index)']) assert.ok(trigger.includes(kind), kind);
  // On the phone bar a lone '/' no longer opens the menu by itself (the PC keeps it).
  assert.match(editor, /function requestAuthoringSlash\(beforeRaw:string,inputType:string\)\{\n\s+\/\/[^\n]*\n\s+if\(barShownNow\(\)\)return;/);
  // The folder chips: folders, ＋ 새 폴더, [메뉴] only for a typed '/', ×.
  assert.match(editor, /barMode === 'folders' && body \? folders : tools/);
  assert.match(editor, /barTriggerRef\.current\?\.kind === 'slash' && <button type="button" className=\{styles\.barMenu\} data-bar-slash-menu/);
  // × gives a typed '/' or '-/' back; a chain's second ↶ takes the head line back too.
  assert.match(editor, /editorRef\.current\?\.replaceRange\(at, at \+ 3, seed\.origin,/);
  assert.match(editor, /if \(redo \|\| !last\.then\) return false;/);
  assert.match(editor, /barFolderUndo\.current = \{ docId, before, after: written\.working, raw: written\.raw, redo: false, then: trigger\.before \};/);
  // 오늘 시작 줄: focus in the same press, then the head line; hidden while the body has focus.
  const start = editor.slice(editor.indexOf('function startToday()'), editor.indexOf('function startToday()') + 400);
  assert.ok(start.indexOf('area.focus({ preventScroll: true });') < start.indexOf('insertNative(plan.offset, plan.text, plan.caret)'));
  assert.match(css, /\.editor:has\(\.host textarea:focus\) \.todayStart, :global\(\[data-writing-keyboard="true"\]\) \.editor \.todayStart \{ display: none; \}/);
});