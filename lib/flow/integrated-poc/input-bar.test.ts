import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programDateHeaderPlan, programFolderSeedPlan, programLineDays, type ProgramBarInsertion } from './input-bar';
import { readFolderPickerLine } from './folder-picker';

// Input v2 stage 1 (11/7): the writing bar's 날짜 and 폴더 write today's grammar once, where no line changes its day
// or its folder (R1), and the caret goes where the next words belong.
const apply = (raw: string, plan: ProgramBarInsertion) => raw.slice(0, plan.offset) + plan.text + raw.slice(plan.offset);
const caretAt = (raw: string, text: string) => raw.indexOf(text) + text.length;
/** Every old non-empty line is still there, whole, under the day it counted under (the inserted lines are new). */
function keepsDays(before: string, plan: ProgramBarInsertion) {
  const after = apply(before, plan), old = programLineDays(before), now = programLineDays(after);
  const oldLines = before.split('\n'), newLines = after.split('\n'), added = plan.text.split('\n').length - 1;
  const at = before.slice(0, plan.offset).split('\n').length - 1, start = before.lastIndexOf('\n', plan.offset - 1) + 1;
  const boundary = plan.offset === start ? at : at + 1;
  return old.every((day, index) => { const moved = index < boundary ? index : index + added;
    return !oldLines[index].trim() || newLines[moved] === oldLines[index] && now[moved] === day; });
}
const NEWEST_FIRST = ['[2026-11-06]', '- /회사 일', '  - [x] 회의 자료', '- /공부', '  - [ ] 영어 단어', '', '[2026-11-04]', '- /회사 일', '  - [ ] 보고서', '', '[미정]', '- [ ] 언젠가'].join('\n');

test('a new day goes in the date order, right before another head line, with the caret on its empty line', () => {
  // Today (11-07) in a newest-first document: above 11-06, from the middle of a task list.
  const caret = caretAt(NEWEST_FIRST, '영어 단어'), plan = programDateHeaderPlan(NEWEST_FIRST, caret, '2026-11-07')!;
  const after = apply(NEWEST_FIRST, plan);
  assert(after.startsWith('[2026-11-07]\n\n\n[2026-11-06]'));
  assert.equal(after.slice(0, plan.caret), '[2026-11-07]\n', 'caret on the empty line under the new head');
  assert(keepsDays(NEWEST_FIRST, plan), 'R1: no line changes its day');
  // 11-05 goes between 11-06 and 11-04 (before 11-04, after the blank that ends 11-06).
  const middle = apply(NEWEST_FIRST, programDateHeaderPlan(NEWEST_FIRST, 0, '2026-11-05')!);
  assert(middle.includes('  - [ ] 영어 단어\n\n[2026-11-05]\n\n\n[2026-11-04]'));
  // Older than every day: after the last dated block, before [미정].
  const old = programDateHeaderPlan(NEWEST_FIRST, 0, '2026-10-01')!;
  assert(apply(NEWEST_FIRST, old).includes('  - [ ] 보고서\n\n[2026-10-01]\n\n\n[미정]'));
  assert(keepsDays(NEWEST_FIRST, old));
});

test('an oldest-first document keeps its order; with no dated head the day goes at the end', () => {
  const up = ['[2026-11-01]', '- [ ] 하나', '[2026-11-03]', '- [ ] 셋'].join('\n');
  const after = apply(up, programDateHeaderPlan(up, 0, '2026-11-02')!);
  assert.equal(after, ['[2026-11-01]', '- [ ] 하나', '', '[2026-11-02]', '', '', '[2026-11-03]', '- [ ] 셋'].join('\n'));
  // No head at all: tasks there have no day, and must keep none, so the head goes after them.
  const loose = '- [ ] 장보기\n- [ ] 빨래';
  const plan = programDateHeaderPlan(loose, 3, '2026-11-07')!;
  assert.equal(apply(loose, plan), '- [ ] 장보기\n- [ ] 빨래\n\n[2026-11-07]\n');
  assert.equal(plan.caret, apply(loose, plan).length);
  assert(keepsDays(loose, plan));
  // An empty document.
  assert.deepEqual(programDateHeaderPlan('', 0, '2026-11-07'), { offset: 0, text: '[2026-11-07]\n', caret: 13 });
});

test('the day already there: a new empty line at the end of its block, or nothing on an empty line of it', () => {
  const plan = programDateHeaderPlan(NEWEST_FIRST, NEWEST_FIRST.length, '2026-11-06')!;
  const after = apply(NEWEST_FIRST, plan);
  assert(after.startsWith('[2026-11-06]\n- /회사 일\n  - [x] 회의 자료\n- /공부\n  - [ ] 영어 단어\n\n\n[2026-11-04]'));
  assert.equal(after.slice(0, plan.caret), NEWEST_FIRST.slice(0, caretAt(NEWEST_FIRST, '영어 단어')) + '\n');
  assert(keepsDays(NEWEST_FIRST, plan));
  // On the blank line that ends 11-06 already: nothing to write.
  assert.equal(programDateHeaderPlan(NEWEST_FIRST, caretAt(NEWEST_FIRST, '영어 단어') + 1, '2026-11-06'), null);
  // `[미정]` is a head but no day: a chip never writes it, and a dated chip never lands inside it.
  assert.equal(programDateHeaderPlan(NEWEST_FIRST, 0, 'not-a-date'), null);
});

test('R1 over many places: a head line is never put between lines of one block', () => {
  for (let caret = 0; caret <= NEWEST_FIRST.length; caret += 3) for (const day of ['2026-11-07', '2026-11-05', '2026-11-04', '2026-09-30']) {
    const plan = programDateHeaderPlan(NEWEST_FIRST, caret, day);
    if (plan) assert(keepsDays(NEWEST_FIRST, plan), `${caret} ${day}`);
  }
});

test('폴더 writes `- /` on an empty line with nothing deeper after it, else after the caret block, never inside one', () => {
  const raw = ['[2026-11-07]', '- /회사 일', '  - [ ] 회의', '  - [ ] 보고', '', '- /공부', '  - [ ] 단어'].join('\n');
  // From a task in 회사 일: after its last task, at the top level (the next line 공부 stays where it is).
  let plan = programFolderSeedPlan(raw, caretAt(raw, '회의'));
  let after = apply(raw, plan);
  assert.equal(after, ['[2026-11-07]', '- /회사 일', '  - [ ] 회의', '  - [ ] 보고', '- /', '', '- /공부', '  - [ ] 단어'].join('\n'));
  assert(readFolderPickerLine(after, plan.caret), 'the folder suggestions read the written line');
  // On the blank line between two folders: that line.
  plan = programFolderSeedPlan(raw, caretAt(raw, '보고') + 1);
  assert.equal(apply(raw, plan), raw.replace('  - [ ] 보고\n\n', '  - [ ] 보고\n- /\n'));
  // A blank line with deeper lines after it would hand them to the new folder: after the block instead.
  const nested = ['- /회사 일', '  - [ ] 회의', '', '  - [ ] 보고'].join('\n');
  after = apply(nested, programFolderSeedPlan(nested, caretAt(nested, '회의') + 1));
  assert.equal(after, ['- /회사 일', '  - [ ] 회의', '', '  - [ ] 보고', '- /'].join('\n'));
  // From the day's head: right under it (its folders are top-level lines of their own).
  after = apply(raw, programFolderSeedPlan(raw, 3));
  assert(after.startsWith('[2026-11-07]\n- /\n- /회사 일'));
  // An empty document and an empty last line.
  assert.deepEqual(programFolderSeedPlan('', 0), { offset: 0, text: '- /', caret: 3 });
  assert.equal(apply('메모\n', programFolderSeedPlan('메모\n', 3)), '메모\n- /');
});

test('the editor wires the bar: one write per chip through its existing paths, held through a composition', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  // A date chip rides with the held press ('date'); 날짜 and ⋯ only change what the bar shows.
  assert(editor.includes("function pressDateChip(date: string) { barChipDate.current = date; pressBar('date'); }"));
  assert(editor.includes("onClick={() => setBarMode('date')}") && editor.includes("onClick={() => setBarMode('more')}"));
  // A task line takes N9's own date chip; any other line the head-line plan, through insertNative.
  const choice = editor.slice(editor.indexOf('function runDateChoice('), editor.indexOf('function pickBarDate('));
  assert(choice.includes('const done = applyDateChip(line.id, date), state = draftRef.current?.getState();') && choice.includes('if (plan && insertNative(plan.offset, plan.text, plan.caret) && plan.text.includes(`[${date}]`)) chainFolders(date, before);'));
  // N9's path is not in the native history: ↶ right after it sets the old date back the same way, ↷ the chip's again.
  assert(editor.includes('if (undoBarDate()) return;') && editor.includes('if (redoBarFolder() || redoBarDate()) return;'));
  assert(editor.includes("apply(last.after, '항목 날짜·시간', { taskId: last.taskId, date: last.date, time: last.time }) : apply(last.before, '항목 날짜·시간 되돌리기')"));
  // 폴더 writes `- /` through insertNative and opens the existing suggestions; × takes back only that untouched line.
  const write = editor.slice(editor.indexOf('function runBarWrite('), editor.indexOf('function runDateChoice('));
  assert(write.includes('programFolderSeedPlan(area.value, area.selectionStart)') && write.includes('requestAnimationFrame(syncPicker);'));
  assert(editor.includes('onClick={closeBarPicker}><ProgramIcon name="close" size={20} /></button>') && editor.includes("doc.lines[index].text !== '- /'")); // F6-B1: the icon set's ×
  // ↶ ↷ 반복 run the toolbar's own code from the ⋯ row.
  assert(editor.includes('onClick={undoInput}') && editor.includes('onClick={redoInput}') && editor.includes("if (action === 'undo') { undoInput(); return; }"));
  // The '/' menu leads with folders; a folder is one apply with the slash context check.
  const slash = editor.slice(editor.indexOf('async function applySlashFolder('), editor.indexOf('function slashNewFolder('));
  assert(slash.includes("setMessage('추가 위치의 문맥이 바뀌었습니다. 현재 줄에서 다시 열어 주세요.')") && slash.includes("const done = apply(linked.state, '폴더 선택')"));
  // Focus mode is CSS on the existing keyboard signal only.
  const css = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.module.css', import.meta.url), 'utf8');
  assert(css.includes(':global([data-writing-keyboard="true"]) .editor:has(.writingBar) .toolbar:not(:has(details[open]))'));
  const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.module.css', import.meta.url), 'utf8');
  assert(space.includes(':global([data-writing-keyboard="true"]) .space .docHeading:has(.titleButton) { display: none; }'));
});
