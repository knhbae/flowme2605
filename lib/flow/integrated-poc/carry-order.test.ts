import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { moveTaskLocation } from './task-location-move';
import { programMoveTrace, programMoveTraceKey, programMoveTraceLines, programMoveTraceText, readProgramMoveTraces, writeProgramMoveTraces, PROGRAM_MOVE_TRACE_LIMIT, type ProgramMoveTrace } from './task-move-trace';
import { planProgramDateSectionReverse, programDateSectionDirection } from './date-section-order';
import { applyProgramLinePermutation } from './line-permutation';
import { programDateSheetChips, programMonthGrid, programShiftMonth } from './date-sheet';
import { programDateHeaderPlan, programDateHeadIndex } from './input-bar';

// F9 (W-MENU-24~26) and F10 (W-ORDER-01, 02, 05), 11/11. Synthetic text only.
const TODAY = '2026-11-11';
function doc(raw: string): { state: TextWorkspaceState; id: string } {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '하루 기록' });
  const id = state.documents[0].id;
  state = M.editText(state, id, raw, { folderText: true });
  assert.ok(M.validate(state));
  return { state, id };
}
const taskId = (state: TextWorkspaceState, title: string) => M.tasks(state).find(task => task.title === title)!.id;
const RAW = '[2026-11-10]\n- [x] 영수증 정리\n\n[2026-11-11]\n- [ ] 보고서 쓰기\n  - 메모: 서론까지 씀\n- [ ] 장보기\n- [x] 운동 30분\n\n[2026-11-12]\n- [ ] 치과 예약 전화\n\n[2026-11-13]\n- [ ] 팀 회의 자료';
function moved(state: TextWorkspaceState, id: string, task: string, date: string | null) {
  const result = moveTaskLocation(state, { documentId: id, taskId: task, target: { kind: 'date', date } });
  if (!result.ok) throw Error(`move refused: ${JSON.stringify(result)}`);
  return result.next;
}
function memory() { const store = new Map<string, string>(); return { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); }, store }; }

test('W-MENU-26: a move to another day keeps a trace drawn in the section it left, with its share, until that day passes', () => {
  const { state, id } = doc(RAW), report = taskId(state, '보고서 쓰기');
  const withProgress = M.recordProgress(state, report, TODAY, 50);
  const after = moved(withProgress, id, report, '2026-11-13');
  const trace = programMoveTrace(withProgress, id, report, '2026-11-13', 1, 't1')!;
  assert.equal(trace.fromDate, TODAY);
  assert.equal(trace.percent, 50);
  // It goes under the line above the task where it was: here today's date line.
  const head = M.rowMeta(withProgress, id).find(row => row.kind === 'date' && row.date === TODAY)!;
  assert.equal(trace.afterLineId, head.id);
  const lines = programMoveTraceLines(after, id, [trace], TODAY);
  assert.deepEqual([...lines.keys()], [head.id]);
  assert.equal(lines.get(head.id)![0].text, '→ 보고서 쓰기 · 50%까지 · 11월 13일 (금)으로 옮김');
  // Nothing of it is in the text: the line count is the same, and no task, check or 밀린 일 counts it.
  assert.equal(M.getDocument(after, id)!.lines.length, M.getDocument(withProgress, id)!.lines.length);
  assert.equal(M.tasks(after).length, M.tasks(withProgress).length);
  // The next day it is gone.
  assert.equal(programMoveTraceLines(after, id, [trace], '2026-11-12').size, 0);
});

test('W-MENU-26: a 0% task gets its trace too (no share said); 날짜 미정 is said as such; a task already there gets none', () => {
  const { state, id } = doc(RAW), shop = taskId(state, '장보기');
  const after = moved(state, id, shop, '2026-11-12'), trace = programMoveTrace(state, id, shop, '2026-11-12', 1, 't2')!;
  assert.ok(!trace.percent, 'no share kept for a task not begun');
  const lines = [...programMoveTraceLines(after, id, [trace], TODAY).values()].flat();
  assert.deepEqual(lines.map(line => line.text), ['→ 장보기 · 11월 12일 (목)으로 옮김']);
  // The line above 장보기 where it was: the memo of 보고서 쓰기.
  assert.equal(M.getDocument(state, id)!.lines.find(line => line.id === trace.afterLineId)!.text, '  - 메모: 서론까지 씀');
  assert.equal(programMoveTraceText('장보기', null, null, TODAY), '→ 장보기 · 날짜 미정으로 옮김');
  assert.equal(programMoveTraceText('장보기', 0, '2026-11-14', TODAY), '→ 장보기 · 11월 14일 (토)로 옮김');
  assert.equal(programMoveTrace(state, id, shop, TODAY, 1, 'same'), null);
});

test('W-MENU-26: only a move the text still agrees with is drawn (되돌리기, ↶, a move back elsewhere, a hand edit)', () => {
  const { state, id } = doc(RAW), report = taskId(state, '보고서 쓰기');
  const after = moved(state, id, report, '2026-11-13'), trace = programMoveTrace(state, id, report, '2026-11-13', 1, 't3')!;
  // Undone (the text as before the move): nothing drawn, even with the trace still kept.
  assert.equal(programMoveTraceLines(state, id, [trace], TODAY).size, 0);
  // Moved on again (13 → 12) without its own kept move: the last kept move ends on 13, not where it is: nothing.
  const again = moved(after, id, report, '2026-11-12');
  assert.equal(programMoveTraceLines(again, id, [trace], TODAY).size, 0);
  // W-MENU-27 (11/11): a move to an earlier day keeps no trace (13 → 12).
  assert.equal(programMoveTrace(after, id, report, '2026-11-12', 2, 't4'), null);
  // Moved on to a later day (13 → 16), kept too: the 11th says where it is now, and the 13th (not passed) says it as well.
  const further = moved(after, id, report, '2026-11-16'), second = programMoveTrace(after, id, report, '2026-11-16', 2, 't5')!;
  const lines = [...programMoveTraceLines(further, id, [trace, second], TODAY).values()].flat();
  assert.deepEqual(lines.map(line => line.text).sort(), ['→ 보고서 쓰기 · 11월 16일 (월)로 옮김', '→ 보고서 쓰기 · 11월 16일 (월)로 옮김']);
  // The section it left is gone (its date line deleted by hand): nothing drawn there.
  const raw = M.raw(M.getDocument(after, id)).replace('[2026-11-11]\n', '');
  const edited = M.editText(after, id, raw, { folderText: true });
  assert.equal(programMoveTraceLines(edited, id, [trace], TODAY).size, 0);
  // Another document's trace is not drawn here.
  assert.equal(programMoveTraceLines(after, id, [{ ...trace, docId: 'other' }], TODAY).size, 0);
});

test('W-MENU-27: every way to a day keeps its trace (the editor\'s, and the host\'s 오늘 detail, band and folded view); a move back keeps none', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx'), space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
  // The editor's own moves (⋮ sheet and chips, the F7 chip, the bar's 날짜) all go through performTaskLocation.
  assert.match(editor, /if\(target\.kind==='date'\)record\.trace=rememberMove\(before,policy\.taskId,moved\.date\);/);
  // The folded view's moves are the host's: kept once, there.
  assert.match(editor, /if\(propsRef\.current\.onTaskLocation\)\{closePanel\(\);await propsRef\.current\.onTaskLocation\(policy\.taskId,target,before\);return;\}/);
  // The host's moveTaskHere (오늘 row detail, the band's 미루기 opens it, the folded view): kept, and taken back by 되돌리기.
  assert.match(space, /const trace=target\.kind==='date'&&beforeCommit\?programMoveTrace\(beforeCommit,task\.docId,taskId,changed\.date\?\?null,Date\.now\(\),programId\('trace'\)\):null;/);
  assert.match(space, /if\(notice\.traceId\)keepProgramMoveTraces\(traceStorage\(\),programMoveTraceKey\(actorId\),list=>list\.filter\(entry=>entry\.id!==notice\.traceId\),today\);/);
  // This tab's editors hear the host's moves at once.
  assert.match(editor, /window\.addEventListener\(PROGRAM_MOVE_TRACE_EVENT, here\);/);
  // Not the 밀린 일 [오늘로 옮기기] (carryToToday): its day has passed, so there is nothing to draw.
  assert.doesNotMatch(space.slice(space.indexOf('async function carryToToday('), space.indexOf('async function carryToToday(') + 1500), /programMoveTrace\(/);
  // An earlier day keeps none; 날짜 미정 is not earlier.
  const { state, id } = doc(RAW), report = taskId(state, '보고서 쓰기');
  assert.equal(programMoveTrace(state, id, report, '2026-11-10', 1, 'back'), null);
  assert.ok(programMoveTrace(state, id, report, null, 1, 'undated'));
});

test('W-MENU-26: the kept moves live in this device only, read back exactly, cleaned of old days and capped', () => {
  const storage = memory(), key = programMoveTraceKey('owner-1');
  assert.equal(key, 'flow:alpha:move-trace:v1:owner-1');
  const base: ProgramMoveTrace = { v: 1, id: 'a', docId: 'd', taskId: 't', fromHeadId: 'h', fromDate: TODAY, afterLineId: 'h', toDate: '2026-11-13', percent: 50, at: 1 };
  assert.ok(writeProgramMoveTraces(storage, key, [base, { ...base, id: 'old', fromDate: '2026-11-01' }], TODAY));
  assert.deepEqual(readProgramMoveTraces(storage, key), [base]);
  storage.setItem(key, '{not json'); assert.deepEqual(readProgramMoveTraces(storage, key), []);
  storage.setItem(key, JSON.stringify([{ ...base, percent: 'x' }, base])); assert.deepEqual(readProgramMoveTraces(storage, key), [base]);
  const many = Array.from({ length: PROGRAM_MOVE_TRACE_LIMIT + 5 }, (_, at) => ({ ...base, id: `m${at}`, at }));
  writeProgramMoveTraces(storage, key, many, TODAY);
  const kept = readProgramMoveTraces(storage, key);
  assert.equal(kept.length, PROGRAM_MOVE_TRACE_LIMIT); assert.equal(kept[0].id, 'm5');
  assert.equal(writeProgramMoveTraces({ getItem: () => null, setItem: () => { throw Error('quota'); } }, key, [base], TODAY), false);
  assert.deepEqual(readProgramMoveTraces(null, key), []);
});

test('W-MENU-24: the sheet chips are 내일 · 이번 주말 · 다음 주(월) · 날짜 미정; the one it is on is off', () => {
  const chips = programDateSheetChips(TODAY, TODAY);
  assert.deepEqual(chips.map(chip => [chip.label, chip.date, chip.detail, chip.off]), [
    ['내일', '2026-11-12', '11월 12일 (목)', false], ['이번 주말', '2026-11-14', '11월 14일 (토)', false],
    ['다음 주', '2026-11-16', '11월 16일 (월)', false], ['날짜 미정', null, '', false]]);
  assert.deepEqual(programDateSheetChips(TODAY, '2026-11-12').map(chip => chip.off), [true, false, false, false]);
  assert.deepEqual(programDateSheetChips(TODAY, null).map(chip => chip.off), [false, false, false, true]);
  // Friday: 이번 주말 is 내일's day, so it is off (one press, one day).
  assert.deepEqual(programDateSheetChips('2026-11-13', '2026-11-13').map(chip => chip.off), [false, true, false, false]);
});

test('W-MENU-24: the month grid starts on Sunday, marks today, the day it is on, past days and days with tasks', () => {
  const weeks = programMonthGrid('2026-11', TODAY, '2026-11-11', new Set(['2026-11-12', '2026-11-13']));
  assert.equal(weeks[0][0]?.date, '2026-11-01'); // 11/1/2026 is a Sunday
  assert.equal(weeks.flat().filter(Boolean).length, 30);
  const cell = (day: number) => weeks.flat().find(entry => entry?.day === day)!;
  assert.deepEqual([cell(10).past, cell(11).today, cell(11).current, cell(12).marked, cell(14).marked], [true, true, true, true, false]);
  assert.equal(programShiftMonth('2026-12', 1), '2027-01'); assert.equal(programShiftMonth('2026-01', -1), '2025-12');
});

test('W-ORDER-01: a new document (one dated head or none) is oldest first: today, tomorrow, the day after go down in order', () => {
  let raw = '';
  for (const day of ['2026-11-11', '2026-11-12', '2026-11-13']) {
    const plan = programDateHeaderPlan(raw, raw.length, day)!;
    raw = raw.slice(0, plan.offset) + plan.text + raw.slice(plan.offset);
    raw = raw.replace(/\n$/, '') + `\n- [ ] ${day} 일`;
  }
  const heads = raw.split('\n').filter(line => line.startsWith('['));
  assert.deepEqual(heads, ['[2026-11-11]', '[2026-11-12]', '[2026-11-13]']);
  // Every task stays under its own day.
  const { state } = doc(raw);
  assert.deepEqual(M.tasks(state).map(task => [task.title, task.date]), [['2026-11-11 일', '2026-11-11'], ['2026-11-12 일', '2026-11-12'], ['2026-11-13 일', '2026-11-13']]);
  // A day before the only head goes above it; W-ORDER-04: a document already newest first keeps its order.
  assert.equal(programDateHeadIndex(['[2026-11-11]', '- [ ] a'], '2026-11-10'), 0);
  assert.equal(programDateHeadIndex(['[2026-11-12]', '- [ ] a', '[2026-11-11]', '- [ ] b'], '2026-11-13'), 0);
});

test('W-ORDER-05: 날짜 순서 바꾸기 turns the dated sections round; lines, IDs, days and the blanks between stay; one ↶ back', () => {
  const raw = '메모 한 줄\n\n[2026-11-13]\n- [ ] 팀 회의 자료\n\n[2026-11-12]\n- [ ] 치과 예약 전화\n  - 메모: 오후\n\n[2026-11-11]\n- [ ] 보고서 쓰기\n- [x] 운동 30분\n\n[미정]\n- [ ] 언젠가';
  const { state, id } = doc(raw);
  assert.equal(programDateSectionDirection(state, id), 'newest-first');
  const caretAt = raw.indexOf('치과') + 1;
  const plan = planProgramDateSectionReverse(state, id, { start: caretAt, end: caretAt, direction: 'none' });
  assert.equal(plan.status, 'ready'); if (plan.status !== 'ready') return;
  assert.equal(plan.afterRaw, '메모 한 줄\n\n[2026-11-11]\n- [ ] 보고서 쓰기\n- [x] 운동 30분\n\n[2026-11-12]\n- [ ] 치과 예약 전화\n  - 메모: 오후\n\n[2026-11-13]\n- [ ] 팀 회의 자료\n\n[미정]\n- [ ] 언젠가');
  assert.deepEqual(plan.headsAfter, ['[2026-11-11]', '[2026-11-12]', '[2026-11-13]', '[미정]']);
  const next = applyProgramLinePermutation(state, id, plan.afterLineIds)!;
  assert.equal(M.raw(M.getDocument(next, id)), plan.afterRaw);
  // The same lines (IDs), only their order; every task keeps its day, memo and state.
  assert.deepEqual(new Set(M.getDocument(next, id)!.lines.map(line => line.id)), new Set(M.getDocument(state, id)!.lines.map(line => line.id)));
  const facts = (value: TextWorkspaceState) => M.tasks(value).map(task => [task.id, task.date, task.note, task.done]).sort();
  assert.deepEqual(facts(next), facts(state));
  // One native edit gives the same raw; the caret stays on its line.
  const edited = plan.beforeRaw.slice(0, plan.replacement.start) + plan.replacement.text + plan.beforeRaw.slice(plan.replacement.end);
  assert.equal(edited, plan.afterRaw);
  assert.equal(plan.afterRaw.slice(plan.selectionAfter.start - 1, plan.selectionAfter.start + 1), '치과');
  // ↶: the inverse permutation is exactly the document before; turned round twice, it is as it was.
  assert.deepEqual(applyProgramLinePermutation(next, id, plan.beforeLineIds), state);
  const back = planProgramDateSectionReverse(next, id);
  assert.equal(back.status === 'ready' && back.afterRaw, raw);
  assert.equal(programDateSectionDirection(next, id), 'oldest-first');
});

test('W-ORDER-05: fewer than two dated sections is nothing to turn; a document with none is "none" (a new one: oldest first)', () => {
  const single = doc('[2026-11-11]\n- [ ] a\n[미정]\n- [ ] b');
  assert.equal(planProgramDateSectionReverse(single.state, single.id).status, 'noop');
  const one = doc('그냥 글'); assert.equal(programDateSectionDirection(one.state, one.id), 'none');
});

test('F9/F10 wiring: vendor trace (reading view only, never source), sheet, 진행 [날짜·시간], order menu, opening at today', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const vendor = read('./vendor/text-editor.cjs'), editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
  const css = read('../../../components/flow/integrated-poc/ProgramTextEditor.module.css'), space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
  // Redesign 2 (11/12): dueDate after trace.
  assert.match(vendor, /'repeatLabel', 'repeatAt', 'trace', 'dueDate'\]/);
  // int9: with typelag ②'s buildRow the trace is the row's last part before it is returned (full render or row patch).
  assert.match(vendor, /appendMoveTrace\(row, index, safeMeta\.trace\);\n\s+return row;/);
  assert.match(vendor, /box\.addEventListener\('click', \(event\) => event\.preventDefault\(\)\)/);
  assert.match(vendor, /config\.onTraceOpen\(index, at\)/);
  assert.match(css, /\.host :global\(\.tle-move-trace\) \{ display: none; \}/);
  assert.match(css, /tle-reading-view, \.tle-folded-view\) \.tle-move-trace\) \{ display: grid;/);
  assert.match(editor, /onClick=\{\(\)=>openDateSheet\(panel\.lineId\)\}>고르기/);
  assert.match(editor, /data-progress-date onClick=\{\(\) => openProgress\(panel\.lineId, 'date'\)\}>날짜·시간/);
  assert.match(editor, /if\(target\.kind==='date'\)record\.trace=rememberMove\(before,policy\.taskId,moved\.date\);/);
  assert.match(editor, /else forgetMove\(trace\);/);
  assert.match(space, /data-section-order-open/);
  assert.match(space, /PROGRAM_TODAY_SHOWN\.add\(todayKey\(id\)\); \}/);
  // Read from the text the editor shows at each try (opening may write a repeat line's first round before).
  assert.match(space, /textarea\.value !== at\.raw\) \{ if \(\+\+tries < 600\) requestAnimationFrame\(reveal\); return; \}/);
  assert.match(space, /text = view \? view\.workspace : dataRef\.current\.spaces\[actorId\]\?\.text;/);
  assert.match(space, /if \(pendingSourceFocus\.current\?\.documentId === id \|\| document\.activeElement === textarea\) return;/);
  assert.doesNotMatch(space.slice(space.indexOf('F10 W-ORDER-02 (11/11)'), space.indexOf('const recentDay')), /\.focus\(/);
  // W-ORDER-02 (총괄 08:3x): every document, newest first too; W-ORDER-08: no section for today, no line made, scrolled near its place.
  assert.doesNotMatch(space, /oldestFirst/);
  assert.match(space, /if \(!head\) return known = \{ text, index: Math\.min\(programDateHeadIndex\(doc\.lines\.map\(line => line\.text\), today\), doc\.lines\.length - 1\), caret: null, raw: M\.raw\(doc\) \};/);
});
