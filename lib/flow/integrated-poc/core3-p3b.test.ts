import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { moveProgramTaskDates, programDeferChips, programTaskDateState, programTaskDateUndo, programTaskDatesMovedText, type ProgramTaskDateMove } from './task-date-move';

// Core3 P3b (11/8): 되돌리기 after 미루기 (and after 고르기's date sheet, the same C6b command) leaves the writing exactly
// as before the move — the same text and SHA as ↶ — because a date the line takes from its day heading needs no 날짜
// line. Also: one chip per day, the one-line notice.
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const RAW = '[2026-11-08]\n- [ ] 보고서 검토\n- [ ] 회의 일정 잡기\n[2026-11-10]\n- [ ] 다른 날 할 일';
const sha = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

function writing(raw = RAW) {
  let data = createProgramData();
  const created = ok(createProgramDocument(data, { actorId: actor(data), requestId: `p3b-${++request}`, expectedSpace: space(data), title: '작성한 글' }));
  data = programClone(created.data);
  space(data).text = M.editText(space(data).text, created.result, raw);
  const doc = () => (state: ProgramData) => M.raw(space(state).text.documents.find(row => row.id === created.result));
  return { data, raw: doc(), task: (state: ProgramData, title: string) => M.tasks(space(state).text).find(row => row.title === title)! };
}
/** A move as the row was shown (its date, time and state), as 미루기 and 고르기 send it. */
function move(data: ProgramData, taskId: string, date: string | null): ProgramTaskDateMove {
  const row = M.tasks(space(data).text).find(entry => entry.id === taskId)!;
  return { taskId, expected: { date: row.date, time: row.time ?? '', state: programTaskDateState(space(data), taskId) ?? undefined }, date };
}
/** The move and its 되돌리기, as the space makes them (the undo from the very state the move applied to). */
function moveAndUndo(data: ProgramData, moves: ProgramTaskDateMove[]) {
  const moved = ok(moveProgramTaskDates(data, { actorId: actor(data), requestId: `p3b-${++request}`, moves }));
  const undo = programTaskDateUndo(space(data), space(moved.data), moves);
  const back = ok(moveProgramTaskDates(moved.data, { actorId: actor(moved.data), requestId: `p3b-${++request}`, moves: undo }));
  return { moved: moved.data, back: back.data };
}

test('미루기 → 되돌리기: the writing is exactly as before (same SHA), other lines and days never touched', () => {
  const { data, raw, task } = writing();
  assert.equal(raw(data), RAW);
  const id = task(data, '보고서 검토').id;
  for (const target of ['2026-11-09', '2026-11-15', '2026-11-20']) {
    const { moved, back } = moveAndUndo(data, [move(data, id, target)]);
    // The move writes the new date under the task, nothing else.
    assert.equal(raw(moved), RAW.replace('- [ ] 보고서 검토', `- [ ] 보고서 검토\n  - 날짜: ${target}`), target);
    assert.equal(task(moved, '보고서 검토').date, target);
    // 되돌리기: the old day again, from the heading; the text and its SHA as before.
    assert.equal(raw(back), RAW, target);
    assert.equal(sha(raw(back)), sha(RAW));
    assert.equal(task(back, '보고서 검토').date, '2026-11-08');
    assert(validateProgramData(back));
  }
});

test('고르기 → 날짜 → 되돌리기 (several tasks, several days): the same, the text exactly as before', () => {
  const { data, raw, task } = writing();
  const moves = [move(data, task(data, '보고서 검토').id, '2026-11-12'), move(data, task(data, '다른 날 할 일').id, '2026-11-12')];
  const { moved, back } = moveAndUndo(data, moves);
  assert.equal(task(moved, '다른 날 할 일').date, '2026-11-12');
  assert.equal(raw(back), RAW);
  assert.equal(sha(raw(back)), sha(RAW));
});

test('a move onto the day the line already takes writes no 날짜 line; a 날짜 line the writer typed for another day stays theirs', () => {
  // A task with its own date line moved back onto its heading's day: the line goes (the heading says it).
  const typed = '[2026-11-08]\n- [ ] 보고서 검토\n  - 날짜: 2026-11-12\n- [ ] 회의 일정 잡기';
  const { data, raw, task } = writing(typed);
  const id = task(data, '보고서 검토').id;
  const onto = ok(moveProgramTaskDates(data, { actorId: actor(data), requestId: `p3b-${++request}`, moves: [move(data, id, '2026-11-08')] }));
  assert.equal(raw(onto.data), '[2026-11-08]\n- [ ] 보고서 검토\n- [ ] 회의 일정 잡기');
  // ...and its 되돌리기 writes the typed day back as it was.
  const undo = programTaskDateUndo(space(data), space(onto.data), [move(data, id, '2026-11-08')]);
  const back = ok(moveProgramTaskDates(onto.data, { actorId: actor(onto.data), requestId: `p3b-${++request}`, moves: undo }));
  assert.equal(raw(back.data), typed);
  // To 날짜 미정 the line still says 미정 (no heading day to take).
  const undated = ok(moveProgramTaskDates(data, { actorId: actor(data), requestId: `p3b-${++request}`, moves: [move(data, id, null)] }));
  assert.match(raw(undated.data), /- 날짜: 미정/);
});

test('one chip per day: a chip on the same day as one before it is off; the notice says one task by its day', () => {
  const offs = (today: string) => programDeferChips(today, today).filter(chip => chip.off).map(chip => chip.key);
  assert.deepEqual(offs('2026-11-08'), ['weekend', 'next-week']);  // Sunday: 이번 주말 is today, 다음 주 is 내일's day
  assert.deepEqual(offs('2026-11-13'), ['weekend']);               // Friday: 이번 주말 is 내일's day
  assert.deepEqual(offs('2026-11-14'), ['weekend']);               // Saturday: 이번 주말 is today
  assert.deepEqual(offs('2026-11-11'), []);                        // Wednesday: three days
  assert.equal(programTaskDatesMovedText(1, '2026-11-09', '2026-11-08'), '11월 9일 (월)로 옮겼습니다');
  assert.equal(programTaskDatesMovedText(3, '2026-11-09', '2026-11-08'), '3개를 11월 9일 (월)로 옮겼습니다');
});
