import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { archiveProgramDocument, createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { moveProgramTaskDates, programTaskDateState, programTaskDateUndo, programTaskDateUndoLines, restoreProgramTaskDates, type ProgramTaskDateMove } from './task-date-move';
import { programDayClockRead, programFollowToday, programLaterToday, programNextMinuteDelay, startProgramDayClock, type ProgramDayClock } from './day-clock';

// Codex review of a18df5b9 (inbox/f12a-review-20261112-0105), 기타 browser rows F1~F4 (11/12).
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
// Codex's text: A's 날짜 line was written before any move (it equals its day heading's date).
const RAW = '[2026-11-11]\n- [ ] A\n  - 날짜: 2026-11-11\n- [ ] B\n  - 날짜: 2026-11-12\n- [ ] C';

function writing(raw = RAW) {
  let data = createProgramData();
  const created = ok(createProgramDocument(data, { actorId: actor(data), requestId: `f12r-${++request}`, expectedSpace: space(data), title: '실행 글' }));
  data = programClone(created.data);
  space(data).text = M.editText(space(data).text, created.result, raw);
  const doc = (state: ProgramData) => space(state).text.documents.find(row => row.id === created.result)!;
  return { data, doc, task: (state: ProgramData, title: string) => M.tasks(space(state).text).find(row => row.title === title)! };
}
function move(data: ProgramData, taskId: string, date: string | null): ProgramTaskDateMove {
  const row = M.tasks(space(data).text).find(entry => entry.id === taskId)!;
  return { taskId, expected: { date: row.date, time: row.time ?? '', state: programTaskDateState(space(data), taskId) ?? undefined }, date };
}
/** The move and its 되돌리기 as the screen makes them: the lines (no copy's task) from the very state the move applied to. */
function moveAndRestore(data: ProgramData, moves: ProgramTaskDateMove[], time?: { taskId: string; time: string }) {
  const moved = ok(moveProgramTaskDates(data, { actorId: actor(data), requestId: `f12r-${++request}`, moves, ...(time ? { time } : {}) }));
  const undo = programTaskDateUndo(space(data), space(moved.data), moves), lines = programTaskDateUndoLines(space(data), space(moved.data), undo)!;
  return { moved: moved.data, undo, lines, restore: (from: ProgramData) => restoreProgramTaskDates(from, { actorId: actor(from), requestId: `f12r-${++request}`, moves: undo, lines }) };
}

test('P1: two steps moved together and 되돌리기: every line back, a 날짜 line written before the move too, with its ID', () => {
  const { data, doc, task } = writing();
  const before = doc(data).lines.map(line => ({ ...line }));
  const a = task(data, 'A').id, b = task(data, 'B').id;
  const { moved, undo, restore } = moveAndRestore(data, [move(data, a, '2026-11-14'), move(data, b, '2026-11-14')]);
  assert.equal(task(moved, 'A').date, '2026-11-14');
  // The date command alone (as before): A's 날짜 line, equal to its heading's date, is dropped.
  const command = ok(moveProgramTaskDates(moved, { actorId: actor(moved), requestId: `f12r-${++request}`, moves: undo }));
  assert(!M.raw(doc(command.data)).includes('  - 날짜: 2026-11-11'), 'the old way loses the line (Codex P1)');
  // 되돌리기 now: the same lines, words and IDs, in place.
  const back = ok(restore(moved)).data;
  assert.deepEqual(doc(back).lines, before);
  assert.equal(M.raw(doc(back)), RAW);
  assert(validateProgramData(back));
  // A retry of the same request changes nothing again.
});

test('P1: a task without a 날짜 line still comes back without one (Core3 P3b); one moved onto its heading\'s day gets its line back', () => {
  const { data, doc, task } = writing();
  const c = task(data, 'C').id;
  const first = moveAndRestore(data, [move(data, c, '2026-11-15')]);
  // Redesign 3 (merged 11/12): C goes under its new day's heading, no 날짜 line written; 되돌리기 still gives the writing back.
  assert(M.raw(doc(first.moved)).endsWith('\n\n[2026-11-15]\n- [ ] C') && !M.raw(doc(first.moved)).includes('날짜: 2026-11-15'));
  assert.equal(M.raw(doc(ok(first.restore(first.moved)).data)), RAW);
  // B (its own 2026-11-12 line) onto the heading's day: the command drops the line; 되돌리기 brings it back with its ID.
  const b = task(data, 'B').id, lineId = doc(data).lines.find(line => line.text === '  - 날짜: 2026-11-12')!.id;
  const second = moveAndRestore(data, [move(data, b, '2026-11-11')]);
  assert(!M.raw(doc(second.moved)).includes('2026-11-12'));
  const back = ok(second.restore(second.moved)).data;
  assert.equal(M.raw(doc(back)), RAW);
  assert.equal(doc(back).lines.find(line => line.text === '  - 날짜: 2026-11-12')!.id, lineId);
});

test('P1: 되돌리기 is refused when a task changed since the move; a save elsewhere in between does not block it', () => {
  const { data, doc, task } = writing();
  const a = task(data, 'A').id, b = task(data, 'B').id;
  const { moved, restore } = moveAndRestore(data, [move(data, a, '2026-11-14'), move(data, b, '2026-11-14')]);
  const edited = programClone(moved);
  space(edited).text = M.editText(space(edited).text, doc(moved).id, M.raw(doc(moved)).replace('- [ ] B', '- [ ] B 고침'));
  const refused = restore(edited);
  assert(!refused.ok && refused.reason === 'conflict');
  // Another document saved in between.
  const other = ok(createProgramDocument(moved, { actorId: actor(moved), requestId: `f12r-${++request}`, expectedSpace: space(moved), title: '다른 글' }));
  const elsewhere = programClone(other.data);
  space(elsewhere).text = M.editText(space(elsewhere).text, other.result, '[2026-11-11]\n- [ ] 다른 일');
  assert.equal(M.raw(doc(ok(restore(elsewhere)).data)), RAW);
});

test('P1: a step with a subcheck and a memo comes back as one block (the lines under it in place)', () => {
  const raw = '[2026-11-11]\n- [ ] 부모\n  - 메모: 먼저 볼 것\n  - 날짜: 2026-11-11\n  - [ ] 하위\n    - 날짜: 2026-11-12\n- [ ] 다음';
  const { data, doc, task } = writing(raw);
  const before = doc(data).lines.map(line => ({ ...line }));
  const parent = task(data, '부모').id, next = task(data, '다음').id;
  const { moved, restore } = moveAndRestore(data, [move(data, parent, '2026-11-13'), move(data, next, '2026-11-13')]);
  assert.equal(task(moved, '부모').date, '2026-11-13');
  assert.deepEqual(doc(ok(restore(moved)).data).lines, before);
});

test('P2-2: a time set with several steps\' dates is saved in the same change, and 되돌리기 takes it back with the dates', () => {
  const raw = '[2026-11-11]\n- [ ] A\n  - 시간: 09:00\n- [ ] B\n  - 날짜: 2026-11-12';
  const { data, doc, task } = writing(raw);
  const a = task(data, 'A').id, b = task(data, 'B').id;
  const { moved, undo, restore } = moveAndRestore(data, [move(data, a, '2026-11-14'), move(data, b, '2026-11-14')], { taskId: a, time: '14:00' });
  assert.equal(task(moved, 'A').date, '2026-11-14');
  assert.equal(task(moved, 'A').time, '14:00');
  assert.equal(task(moved, 'B').date, '2026-11-14');
  assert.equal(undo.find(entry => entry.taskId === a)!.expected.time, '14:00', 'expected as the move left it');
  assert.equal(M.raw(doc(ok(restore(moved)).data)), raw);
  // A time for a task the list does not move is refused.
  const refused = moveProgramTaskDates(data, { actorId: actor(data), requestId: `f12r-${++request}`, moves: [move(data, b, '2026-11-14')], time: { taskId: a, time: '14:00' } });
  assert(!refused.ok && refused.reason === 'invalid');
});

// Codex re-review of e642fd11 (inbox/f12a13-review-20261112-0805).
test('re-review P1-1: a task already on the new date keeps its lines (its 날짜 line too), so 되돌리기 leaves the writing exact', () => {
  const { data, doc, task } = writing();
  const before = doc(data).lines.map(line => ({ ...line }));
  const a = task(data, 'A').id, b = task(data, 'B').id;
  const { moved, undo, restore } = moveAndRestore(data, [move(data, a, '2026-11-11'), move(data, b, '2026-11-11')]);
  assert(M.raw(doc(moved)).startsWith('[2026-11-11]\n- [ ] A\n  - 날짜: 2026-11-11\n- [ ] B\n- [ ] C'), 'A untouched, B onto its heading\'s day');
  assert.deepEqual(undo.map(entry => entry.taskId), [b]);
  assert.deepEqual(doc(ok(restore(moved)).data).lines, before);
});

test('re-review P1-2 and a mixed list: on the date already, moved with a time kept, taken away or added, moved without one', () => {
  const raw = '[2026-11-11]\n- [ ] A\n  - 날짜: 2026-11-11\n- [ ] B\n  - 날짜: 2026-11-12\n  - 시간: 09:00\n- [ ] C\n- [ ] D\n  - 시간: 08:30';
  for (const time of [undefined, '', '14:00']) {
    const { data, doc, task } = writing(raw);
    const before = doc(data).lines.map(line => ({ ...line }));
    const a = task(data, 'A').id, b = task(data, 'B').id, c = task(data, 'C').id, d = task(data, 'D').id;
    const { moved, undo, restore } = moveAndRestore(data, [move(data, a, '2026-11-11'), move(data, b, '2026-11-14'), move(data, c, '2026-11-14'), move(data, d, '2026-11-15')],
      time === undefined ? undefined : { taskId: b, time });
    assert.equal(task(moved, 'B').time ?? '', time ?? '09:00', `B's time ${JSON.stringify(time)}`);
    assert.equal(task(moved, 'D').time, '08:30');
    assert.equal(undo.find(entry => entry.taskId === b)!.expected.time, time ?? '09:00', 'expected as the move left it ("" when taken away)');
    const back = ok(restore(moved)).data;
    assert.deepEqual(doc(back).lines, before, `byte for byte, IDs too (time ${JSON.stringify(time)})`);
    assert.equal(M.raw(doc(back)), raw);
  }
});

test('re-review P2-1: 되돌리기 of a document archived since is refused as the date command refuses it; nothing changes', () => {
  const { data, doc, task } = writing();
  const a = task(data, 'A').id, b = task(data, 'B').id;
  const { moved, undo, restore } = moveAndRestore(data, [move(data, a, '2026-11-14'), move(data, b, '2026-11-14')]);
  const archived = ok(archiveProgramDocument(moved, { actorId: actor(moved), requestId: `f12r-${++request}`, expectedSpace: space(moved), documentId: doc(moved).id })).data;
  const command = moveProgramTaskDates(archived, { actorId: actor(archived), requestId: `f12r-${++request}`, moves: undo });
  assert(!command.ok && command.reason === 'unresolved', 'the date command refuses it');
  const refused = restore(archived);
  assert(!refused.ok && refused.reason === 'unresolved');
  assert.equal(M.raw(doc(archived)), M.raw(doc(moved)));
});

test('P2-3 / F4: one clock for the date and the hour, at each minute\'s turn and when the screen comes back', () => {
  let now = new Date(2026, 10, 11, 23, 59, 20).getTime();
  const timers: { run: () => void; at: number }[] = [], heard: ProgramDayClock[] = [];
  let visible: (() => void) | null = null;
  const stop = startProgramDayClock({ now: () => new Date(now), setTimeout: (run, ms) => { const timer = { run, at: now + ms }; timers.push(timer); return timer; },
    clearTimeout: timer => { const i = timers.indexOf(timer as typeof timers[number]); if (i >= 0) timers.splice(i, 1); }, onVisible: run => { visible = run; return () => { visible = null; }; } }, clock => heard.push(clock));
  assert.deepEqual(heard, [{ date: '2026-11-11', hour: 23 }]);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].at - now, 40_050, 'just past the next minute\'s turn');
  // Midnight: the date and the hour change together, within the first second of the new day.
  now = timers[0].at; timers.shift()!.run();
  assert.deepEqual(heard.at(-1), { date: '2026-11-12', hour: 0 });
  // A hidden tab whose timers slept until 18:00:30: shown again, it reads at once.
  now = new Date(2026, 10, 12, 18, 0, 30).getTime();
  visible!();
  assert.deepEqual(heard.at(-1), { date: '2026-11-12', hour: 18 });
  assert.equal(timers.length, 1, 'one timer, armed again');
  stop();
  assert.equal(timers.length, 0); assert.equal(visible, null);
  assert.equal(programNextMinuteDelay(new Date(2026, 10, 11, 17, 59, 59, 500)), 550);
  assert.deepEqual(programDayClockRead(new Date(2026, 10, 12, 0, 0, 1)), { date: '2026-11-12', hour: 0 });
  // The view on the day that was today follows to the new today; another day stays. The later of the two todays stands.
  assert.equal(programFollowToday('2026-11-11', '2026-11-11', '2026-11-12'), '2026-11-12');
  assert.equal(programFollowToday('2026-11-09', '2026-11-11', '2026-11-12'), '2026-11-09');
  assert.equal(programLaterToday('2026-11-11', '2026-11-12'), '2026-11-12');
  assert.equal(programLaterToday('2026-11-12', null), '2026-11-12');
  assert.equal(programLaterToday('2026-11-12', '2026-11-11'), '2026-11-12');
});

test('the screen: 되돌리기 with lines for a list with no copy\'s task, the time with the plan, the writing form through the plan, one clock', () => {
  const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r/g, '');
  assert(space.includes("const result = await countedMutate('날짜 되돌리기', current => lines ? restoreProgramTaskDates(current, { actorId, requestId, moves: notice.undo, lines })"));
  assert(space.includes('...(!lines && programTaskDateMovesSocial(space, notice.undo) ? { alphaSocial:'), 'a list with a copy\'s task keeps the server\'s command');
  assert.equal(space.split('undoLines = social ? null : programTaskDateUndoLines(').length - 1, 2, 'both lists (고르기 and the Flow plan)');
  assert(space.includes("if (social && timeChange) { setMessage('사본의 단계 여러 개를 함께 옮길 때는 시간을 같이 바꿀 수 없습니다."));
  assert(space.includes('moveProgramTaskDates(state, { actorId, requestId, moves, ...(timeChange ? { time: timeChange } : {}) })'));
  assert(space.includes('onFlowStepDate={(taskId, nextDate, time) => { const owner = runOfTaskNow(taskId); if (!owner) return false; deferFlowStep(owner, taskId, nextDate, undefined, time); return true; }}'));
  assert(space.includes('const closeHour = dayClock.hour;') && !space.includes('setCloseHour'));
  assert(space.includes('const { data } = props, today = dayClock.today,'));
  assert(space.includes('if (was !== today) setDate(current => programFollowToday(current, was, today));'));
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8').replace(/\r/g, '');
  const applyDate = editor.slice(editor.indexOf('async function applyDate()'), editor.indexOf('function openDateSheet('));
  assert(applyDate.includes('if(step&&date&&step.date!==date&&propsRef.current.onFlowStepDate?.(target,date,time!==(step.time??\'\')?time:undefined)){closePanel();return;}'));
  assert(applyDate.indexOf('onFlowStepDate') < applyDate.indexOf("if(policy.kind==='move')"), 'before the move and the date-only save');
});
