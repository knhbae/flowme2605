import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ProgramData, ProgramTransition } from './contract';
import { createProgramData, createProgramEnvelope } from './program-data';
import { createProgramDocument } from './private-space';
import { setPersonalRepeat, startPersonalRound } from './personal-authoring-commands';
import { moveProgramTaskDates, programTaskRepeatMember } from './task-date-move';
import { textEditorRows, textWorkspaceModel as M } from './text-workspace';
import { programRepeatFirstDate, programRepeatNextDate, programRepeatTitle, readProgramRepeatMarker } from './repeat-line';
import { completeProgramRepeat, convertProgramLegacyRepeat, programRepeatLine, readProgramRepeatCheck, settleProgramRepeatLines, undoProgramRepeat } from './repeat-commands';
import { programRepeatDays } from './repeat-log';
import { captureAlphaAccount, commandFromProgramTransition } from './alpha-persistence/program-adapter';
import { isM3Command } from './alpha-sync/contract';

// N10 (SPEC: planning/n10-repeat-spec-20261104): "@매주 월 목" at the end of a task line repeats it. Checking it keeps
// the box empty, moves its "- 날짜:" to the next round and keeps the day in recurrenceExecution.lines.
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `n10-${++request}`, expectedSpace: data.spaces[data.activeActorId] });
const space = (data: ProgramData) => data.spaces[data.activeActorId];
function documentWith(raw: string) {
  const data = createProgramData(), created = ok(createProgramDocument(data, { ...base(data), title: '반복', raw }));
  return { data: created.data, docId: created.result };
}
const rawOf = (data: ProgramData, docId: string) => M.raw(M.getDocument(space(data).text, docId));
const firstTask = (data: ProgramData) => M.tasks(space(data).text)[0];
const label = (title: string) => readProgramRepeatMarker(title)?.label ?? null;

test('grammar: the forms of SPEC 1 at the line end after a space; anything else stays plain text', () => {
  for (const [title, expected] of [['운동 @매주 월 목', '매주 월·목'], ['운동 @매주 월,목', '매주 월·목'], ['운동 @매주 월·목', '매주 월·목'], ['운동 @매주 월목', '매주 월·목'],
    ['영어 @매일', '매일'], ['정리 @평일', '평일'], ['청소 @주말', '주말'], ['물 @3일마다', '3일마다'], ['빨래 @2주마다', '2주마다'], ['회고 @매주', '매주'],
    ['카드 @매달 15일', '매달 15일'], ['정산 @매달 말일', '매달 말일'], ['보험 @매년 3/15', '매년 3/15'], ['엔진오일 @6개월마다', '6개월마다']] as const)
    assert.equal(label(title), expected, title);
  for (const title of ['회의 정리 @홍길동', '메일 a@b.com', '@매일', '운동@매일', '물 @1일마다', '물 @366일마다', '빨래 @53주마다', '카드 @매달 32일',
    '보험 @매년 2/30', '보험 @매년 13/1', '오일 @25개월마다', '운동 @매주 월 월', '운동 @매주 월 X'])
    assert.equal(readProgramRepeatMarker(title), null, title);
  assert.equal(programRepeatTitle('운동 @매주 월 목'), '운동');
  assert.equal(programRepeatTitle('회의 정리 @홍길동'), '회의 정리 @홍길동');
});

test('next round: fixed rules go to the next named day after both the round and today; intervals count from today', () => {
  const rule = (title: string) => readProgramRepeatMarker(title)!.rule;
  const week = rule('운동 @매주 월 목');
  assert.equal(programRepeatNextDate(week, '2026-11-09', '2026-11-09'), '2026-11-12', 'Monday done on Monday: Thursday');
  assert.equal(programRepeatNextDate(week, '2026-11-09', '2026-11-08'), '2026-11-12', 'done early on Sunday: Monday counts, Thursday next');
  assert.equal(programRepeatNextDate(week, '2026-11-09', '2026-11-11'), '2026-11-12', 'late on Wednesday: Thursday');
  assert.equal(programRepeatNextDate(week, '2026-11-09', '2026-11-12'), '2026-11-16', 'late on Thursday: the next Monday');
  assert.equal(programRepeatFirstDate(week, '2026-11-09'), '2026-11-09');
  assert.equal(programRepeatFirstDate(week, '2026-11-10'), '2026-11-12');
  const daily = rule('영어 공부 @매일');
  assert.equal(programRepeatNextDate(daily, '2026-11-09', '2026-11-09'), '2026-11-10');
  assert.equal(programRepeatNextDate(daily, '2026-11-10', '2026-11-11'), '2026-11-12');
  const oil = rule('엔진오일 교환 @6개월마다');
  assert.equal(programRepeatFirstDate(oil, '2026-11-09'), '2027-05-09');
  assert.equal(programRepeatNextDate(oil, '2026-11-09', '2026-11-20'), '2027-05-20');
  // R-2 month ends: the written 31 comes back after a short month; intervals keep the finished day's date or the end.
  const end = rule('시험 @매달 31일');
  assert.equal(programRepeatNextDate(end, '2027-01-31', '2027-01-31'), '2027-02-28');
  assert.equal(programRepeatNextDate(end, '2027-02-28', '2027-02-28'), '2027-03-31');
  assert.equal(programRepeatNextDate(rule('정산 @매달 말일'), '2027-01-31', '2027-01-31'), '2027-02-28');
  assert.equal(programRepeatNextDate(rule('x @1개월마다'), '2027-01-31', '2027-01-31'), '2027-02-28');
  assert.equal(programRepeatNextDate(rule('x @1개월마다'), '2027-02-28', '2027-02-28'), '2027-03-28');
  const leap = rule('보험 @매년 2/29');
  assert.equal(programRepeatFirstDate(leap, '2026-11-09'), '2027-02-28', 'a common year reads 2/29 as 2/28');
  assert.equal(programRepeatNextDate(leap, '2027-02-28', '2027-02-28'), '2028-02-29');
  assert.equal(programRepeatNextDate(rule('보험 @매년 3/15'), '2026-03-15', '2026-11-09'), '2027-03-15');
  assert.equal(programRepeatNextDate(rule('물 @3일마다'), '2026-11-09', '2026-11-10'), '2026-11-13');
  assert.equal(programRepeatNextDate(rule('정리 @평일'), '2026-11-13', '2026-11-13'), '2026-11-16', 'Friday to Monday');
});

test('display: the chip and where the marker starts; [x] reads 반복 멈춤; children or a number keep plain text', () => {
  const { data, docId } = documentWith('[2026-11-05]\n- [ ] 운동 @매주 월 목\n  - 날짜: 2026-11-09\n- [x] 끝 @매일\n- [ ] 짐 @매일\n  - [ ] 양말\n- [50%] 숫자 @매일\n- [ ] 회의 정리 @홍길동');
  const rows = textEditorRows(space(data).text, docId);
  const row = (text: string) => rows.find(entry => entry.label.startsWith(text))!;
  assert.equal(row('운동').repeatLabel, '↻ 매주 월·목'); assert.equal(row('운동').repeatAt, '운동 @매주 월 목'.indexOf('@'));
  assert.equal(row('운동').dateMismatch, undefined, 'a repeat line under a date section is not out of place');
  assert.equal(row('끝').repeatLabel, '반복 멈춤');
  for (const text of ['짐', '숫자', '회의 정리']) assert.equal(row(text).repeatLabel, undefined, text);
});

test('settling: the caret has left, so each repeat line gets its first round once; blocked ones say why', () => {
  const { data, docId } = documentWith('- [ ] 운동 @매주 월 목\n- [ ] 엔진오일 교환 @6개월마다\n  - 메모: 다음 교체 85,000km\n- [ ] 짐 @매일\n  - [ ] 양말\n- [ ] 쓰는 중 @매일\n[2026-11-20]\n- [ ] 날짜 아래 @매주 금');
  const ids = Object.fromEntries(M.tasks(space(data).text).map(task => [task.title.split(' ')[0], task.id]));
  const result = settleProgramRepeatLines(space(data), docId, '2026-11-09', ids['쓰는']);
  assert.equal(M.raw(M.getDocument(result.text, docId)), '- [ ] 운동 @매주 월 목\n  - 날짜: 2026-11-09\n- [ ] 엔진오일 교환 @6개월마다\n  - 날짜: 2027-05-09\n  - 메모: 다음 교체 85,000km\n'
    + '- [ ] 짐 @매일\n  - [ ] 양말\n- [ ] 쓰는 중 @매일\n[2026-11-20]\n- [ ] 날짜 아래 @매주 금\n  - 날짜: 2026-11-20');
  assert.deepEqual(result.settled.map(entry => [entry.title.split(' ')[0], entry.fixed]), [['운동', true], ['엔진오일', false], ['날짜', true]]);
  assert.deepEqual(result.blocked, [{ taskId: ids['짐'], block: 'children' }]);
  // Once settled, nothing more is written.
  assert.equal(settleProgramRepeatLines({ ...space(data), text: result.text }, docId, '2026-11-09', null).settled.length, 1, 'only the line under the caret before');
});

test('운동: a check keeps the box empty, moves the date, keeps the day; 되돌리기 puts everything back', () => {
  const { data, docId } = documentWith('- [ ] 운동 @매주 월 목\n  - 날짜: 2026-11-09');
  const taskId = firstTask(data).id;
  const done = ok(completeProgramRepeat(data, { ...base(data), taskId, today: '2026-11-09', expected: '2026-11-09' }));
  assert.equal(rawOf(done.data, docId), '- [ ] 운동 @매주 월 목\n  - 날짜: 2026-11-12');
  assert.deepEqual(space(done.data).text.progressRecords, [], 'C2 records are not written');
  assert.deepEqual(programRepeatDays(space(done.data), taskId), ['2026-11-09']);
  const check = readProgramRepeatCheck(done.result)!;
  assert.deepEqual({ before: check.before, after: check.after, day: check.day, inserted: check.inserted, applied: check.applied }, { before: '2026-11-09', after: '2026-11-12', day: '2026-11-09', inserted: true, applied: true });
  const undone = ok(undoProgramRepeat(done.data, { ...base(done.data), check }));
  assert.equal(rawOf(undone.data, docId), '- [ ] 운동 @매주 월 목\n  - 날짜: 2026-11-09');
  assert(!Object.hasOwn(space(undone.data), 'recurrenceExecution'), 'an account that never kept a day has no field again');
  assert.deepEqual(space(undone.data), space(data));
  // The command is one change of the two fields, sent on the writing route.
  const seed = captureAlphaAccount(createProgramEnvelope(data), data.activeActorId, 'n10-owner');
  const command = commandFromProgramTransition(seed.account, seed.references, 'n10-check', current => completeProgramRepeat(current, { ...base(current), taskId, today: '2026-11-09', expected: '2026-11-09' }));
  assert(isM3Command(command));
  assert.deepEqual(command.kind === 'change-private' && command.changes.map(change => change.field), ['recurrenceExecution', 'text']);
});

test('영어 공부: late rounds are skipped; days add up and survive a reopen of the account', () => {
  const { data, docId } = documentWith('- [ ] 영어 공부 @매일\n  - 날짜: 2026-11-09');
  const taskId = firstTask(data).id;
  const first = ok(completeProgramRepeat(data, { ...base(data), taskId, today: '2026-11-09', expected: '2026-11-09' }));
  const second = ok(completeProgramRepeat(first.data, { ...base(first.data), taskId, today: '2026-11-11', expected: '2026-11-10' }));
  assert.equal(rawOf(second.data, docId), '- [ ] 영어 공부 @매일\n  - 날짜: 2026-11-12');
  assert.deepEqual(programRepeatDays(space(second.data), taskId), ['2026-11-09', '2026-11-11']);
  const reopened = captureAlphaAccount(createProgramEnvelope(second.data), second.data.activeActorId, 'n10-owner');
  assert.deepEqual(reopened.account.space.recurrenceExecution?.lines, { [taskId]: ['2026-11-09', '2026-11-11'] });
});

test('엔진오일: a moved date counts from the finished day; the memo line does not change', () => {
  const { data, docId } = documentWith('- [ ] 엔진오일 교환 @6개월마다\n  - 날짜: 2026-11-09\n  - 메모: 다음 교체 85,000km');
  const done = ok(completeProgramRepeat(data, { ...base(data), taskId: firstTask(data).id, today: '2026-11-20', expected: '2026-11-09' }));
  assert.equal(rawOf(done.data, docId), '- [ ] 엔진오일 교환 @6개월마다\n  - 날짜: 2027-05-20\n  - 메모: 다음 교체 85,000km');
  const month = documentWith('- [ ] 시험 @매달 31일\n  - 날짜: 2027-02-28');
  const next = ok(completeProgramRepeat(month.data, { ...base(month.data), taskId: firstTask(month.data).id, today: '2027-02-28', expected: '2027-02-28' }));
  assert.equal(rawOf(next.data, month.docId), '- [ ] 시험 @매달 31일\n  - 날짜: 2027-03-31');
});

test('two tabs: the same round checked twice moves once and keeps one day; 되돌리기 after another change is refused', () => {
  const { data, docId } = documentWith('- [ ] 운동 @매주 월 목\n  - 날짜: 2026-11-09');
  const taskId = firstTask(data).id;
  const a = ok(completeProgramRepeat(data, { ...base(data), taskId, today: '2026-11-09', expected: '2026-11-09' }));
  // The second tab still showed the 11/9 round; on the saved space its press changes nothing.
  const b = ok(completeProgramRepeat(a.data, { ...base(a.data), taskId, today: '2026-11-09', expected: '2026-11-09' }));
  assert.equal(b.changed, false);
  assert.equal(rawOf(b.data, docId), '- [ ] 운동 @매주 월 목\n  - 날짜: 2026-11-12');
  assert.deepEqual(programRepeatDays(space(b.data), taskId), ['2026-11-09']);
  assert.equal(readProgramRepeatCheck(b.result)!.applied, false, 'QA F1: nothing of its own to take back');
  // QA F2: the same stale round finished on another day keeps the one move and adds that day.
  const c = ok(completeProgramRepeat(a.data, { ...base(a.data), taskId, today: '2026-11-10', expected: '2026-11-09' }));
  assert.equal(rawOf(c.data, docId), '- [ ] 운동 @매주 월 목\n  - 날짜: 2026-11-12');
  assert.deepEqual(programRepeatDays(space(c.data), taskId), ['2026-11-09', '2026-11-10']);
  // The line changed after the check (another tab moved its date): the first tab's 되돌리기 is refused.
  const check = readProgramRepeatCheck(a.result)!, moved = structuredClone(a.data);
  space(moved).text = M.updateTask(space(moved).text, taskId, { date: '2026-11-19' });
  const refused = undoProgramRepeat(moved, { ...base(moved), check });
  assert(!refused.ok && refused.reason === 'conflict');
});

test('blocked and stopped lines: [x] stops the repeat, children refuse it; C6 lists move repeat lines one at a time', () => {
  const { data } = documentWith('- [x] 운동 @매주 월 목\n  - 날짜: 2026-11-09\n- [ ] 짐 @매일\n  - [ ] 양말\n- [ ] 운동2 @매일\n  - 날짜: 2026-11-09');
  const [stopped, packed, open] = M.tasks(space(data).text).filter(task => !task.parentTaskId);
  assert.equal(programRepeatLine(space(data), stopped.id)?.block, 'done');
  assert.equal(programRepeatLine(space(data), packed.id)?.block, 'children');
  assert.equal(completeProgramRepeat(data, { ...base(data), taskId: stopped.id, today: '2026-11-09', expected: '2026-11-09' }).ok, false);
  assert(programTaskRepeatMember(space(data), open.id) && !programTaskRepeatMember(space(data), stopped.id));
  const listed = moveProgramTaskDates(data, { actorId: data.activeActorId, requestId: 'n10-c6', moves: [{ taskId: open.id, date: '2026-11-20', expected: { date: '2026-11-09', time: '' } }] });
  assert(!listed.ok && listed.reason === 'unresolved');
});

test('the old one-task repeat becomes a repeat line by one press: marker, next round, the series stopped and kept', () => {
  let { data } = documentWith('- [ ] 운동\n  - 날짜: 2026-11-09\n- [ ] 다른 일');
  const taskId = firstTask(data).id;
  const repeated = ok(setPersonalRepeat(data, { taskId, rule: { kind: 'weekdays', weekdays: [1, 4], startDate: '2026-11-09', end: { kind: 'count', count: 6 } } }));
  const round = ok(startPersonalRound(repeated.data, { seriesId: repeated.result, anchorDate: '2026-11-09' }));
  data = round.data;
  const before = structuredClone(space(data)), roundDoc = space(data).personalAuthoring!.series[0].rounds[0].executionDocumentId;
  const converted = ok(convertProgramLegacyRepeat(data, { ...base(data), seriesId: repeated.result, today: '2026-11-10' }));
  const after = space(converted.data), task = M.tasks(after.text).find(item => item.id === taskId)!;
  assert.equal(task.title, '운동 @매주 월 목');
  assert.equal(task.date, '2026-11-12', 'the next round not yet started, from today');
  const series = after.personalAuthoring!.series[0];
  assert.equal(series.stopped, true);
  assert.deepEqual({ ...series, stopped: false }, before.personalAuthoring!.series[0], 'rounds and rule history are kept');
  assert.deepEqual(M.getDocument(after.text, roundDoc), M.getDocument(before.text, roundDoc), 'the round document is left as it was');
  assert.equal(programRepeatLine(after, taskId)?.block, null);
  // A retry of the same press changes nothing again.
  const again = convertProgramLegacyRepeat(converted.data, { ...base(converted.data), requestId: (converted.data.receipts.at(-1)!).id, seriesId: repeated.result, today: '2026-11-10' });
  assert(again.ok && !again.changed);
});

test('the editor and 오늘 use the one command; no C2 chips on a repeat line; text shows its chip', () => {
  const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx'), host = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
  assert(editor.includes('if (repeat && !repeat.block) { void finishRepeatHere(repeat.task.id, repeat.task.title, repeat.task.date); return; }'));
  assert(editor.indexOf('void finishRepeatHere(') < editor.indexOf('const checkTitle = currentRow(lineId)?.title'), 'before the C2 check and its chips');
  assert(editor.includes('if (undoFolderMove() || undoRepeatCheck()) return;'));
  assert(editor.includes('const settleOnMove = () => settleRepeatLines(false), settleOnBlur = () => settleRepeatLines(true);'));
  assert(host.includes('void finishRepeatFromList(task.id, task.title, task.date)'));
  assert(host.includes('onRepeatFinish={finishRepeatRound} onRepeatUndo={undoRepeatRound}'));
  const css = read('./vendor/text-editor.css'), vendor = read('./vendor/text-editor.cjs');
  assert(css.includes('.tle-repeat-source::after') && vendor.includes("marker.dataset.repeatLabel = safeMeta.repeatLabel;"));
});
