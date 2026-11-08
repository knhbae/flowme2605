import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { addProgramQuickTask, completeProgramTask, createProgramDocument, importProgramPublicVersion, updateProgramTask } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { isAlphaSocialIntent } from './alpha-social/contract';
import { alphaSocialAllowedFields, executeAlphaSocialIntent } from './alpha-social/dispatch';
import { PROGRAM_TASK_DATE_MOVE_LIMIT, moveProgramTaskDates, programTaskDateChoices, programTaskDateMovesSocial, programTaskDateUndo, programTaskDatesMovedText, programTaskRepeatMember, type ProgramTaskDateMove } from './task-date-move';
import { programSelectBlock } from './select-mode';
import { programOrderedExecutionRows } from './recurrence-order';
import { createPersonalFlow, savePersonalVersion, setPersonalRepeat, startPersonalRound } from './personal-authoring-commands';

// C6b (C6-C9-I7 2-4~2-6): several tasks of several documents get new dates in one change, all or none, and
// 되돌리기 puts the old dates back the same way. A public copy's task goes with them in the same change (one server
// intent, never single requests bundled). Only the date (and a copy's date override) changes.
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `c6b-${++request}`, expectedSpace: space(data) });
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const task = (data: ProgramData, id: string) => M.tasks(space(data).text).find(row => row.id === id)!;

/** Two documents (one task each, one with a time) and a public copy's task. */
function account() {
  let data = createProgramData();
  data.public.flows.push({ id: 'flow-a', ownerId: 'creator-minji', currentVersionId: 'version-a', category: '생활', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'version-a', flowId: 'flow-a', number: 1, parentVersionId: null, title: '공개 흐름', summary: '',
    source: { kind: 'simulated-example', label: '예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-10-01T00:00:00.000Z',
    items: [{ id: 'item-a', title: '사본 할 일', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'fixed', date: '2026-10-30' }, subchecks: [] }] });
  const ids: Record<string, string> = {};
  for (const [doc, title, date] of [['첫 글', '하나', '2026-10-29'], ['둘째 글', '둘', '2026-10-30']] as const) {
    const created = ok(createProgramDocument(data, { ...base(data), title: doc })); data = created.data;
    const added = ok(addProgramQuickTask(data, { ...base(data), documentId: created.result, title, date })); data = added.data; ids[title] = added.result;
  }
  data = ok(updateProgramTask(data, { ...base(data), taskId: ids['둘'], patch: { time: '09:30' } })).data;
  data = ok(completeProgramTask(data, { ...base(data), taskId: ids['하나'], date: '2026-10-28', done: false })).data;
  const imported = ok(importProgramPublicVersion(data, { ...base(data), versionId: 'version-a', itemIds: ['item-a'], anchor: '2026-10-29' })); data = imported.data;
  ids.copy = space(data).copies[0].itemLines['item-a'];
  assert(validateProgramData(data));
  return { data, ids };
}
const moveOf = (data: ProgramData, taskId: string, date: string | null): ProgramTaskDateMove => {
  const row = task(data, taskId); return { taskId, expected: { date: row.date, time: row.time ?? '' }, date };
};
const nonDateLines = (data: ProgramData) => space(data).text.documents.map(doc => doc.lines.filter(line => !/^\s*- 날짜: /.test(line.text)).map(line => [line.id, line.text]));

test('one change moves tasks of several documents and a copy\'s task: ids, progress, time, text and line places stay', () => {
  const { data, ids } = account();
  const moves = [moveOf(data, ids['하나'], '2026-11-02'), moveOf(data, ids['둘'], '2026-11-02'), moveOf(data, ids.copy, '2026-11-02')];
  const moved = ok(moveProgramTaskDates(data, { actorId: actor(data), requestId: 'c6b-move', moves }));
  assert(validateProgramData(moved.data));
  for (const id of [ids['하나'], ids['둘'], ids.copy]) assert.equal(task(moved.data, id).date, '2026-11-02');
  // One receipt for the whole change (one save).
  assert.equal(moved.data.receipts.length, data.receipts.length + 1);
  assert.equal(moved.data.receipts.at(-1)!.kind, 'private-task-dates');
  // What stays: ids, titles, times, progress, the lines (but the date lines) in their places, other spaces, the public side.
  assert.deepEqual(M.tasks(space(moved.data).text).map(row => [row.id, row.title, row.time ?? '']), M.tasks(space(data).text).map(row => [row.id, row.title, row.time ?? '']));
  assert.equal(task(moved.data, ids['둘']).time, '09:30');
  assert.deepEqual(space(moved.data).text.progressRecords, space(data).text.progressRecords);
  assert.deepEqual(nonDateLines(moved.data), nonDateLines(data));
  assert.deepEqual(moved.data.public, data.public);
  // The copy keeps its date as the task's own (override), the rest of the copy as it was.
  const before = space(data).copies[0], after = space(moved.data).copies[0];
  assert.equal(after.itemOverrides['item-a']?.date, '2026-11-02');
  assert.deepEqual({ ...after, itemOverrides: {} }, { ...before, itemOverrides: {} });
  // 날짜 없음 keeps the time.
  const undated = ok(moveProgramTaskDates(moved.data, { actorId: actor(data), requestId: 'c6b-none', moves: [moveOf(moved.data, ids['둘'], null)] }));
  assert.equal(task(undated.data, ids['둘']).date, null); assert.equal(task(undated.data, ids['둘']).time, '09:30');
});

test('all or none: a task changed since it was picked, finished, in a repeat or locked moves nothing; bad lists are refused', () => {
  const { data, ids } = account();
  const good = moveOf(data, ids['하나'], '2026-11-02');
  const refused = (moves: unknown, reason: string, from = data) => {
    const result = moveProgramTaskDates(from, { actorId: actor(from), requestId: `c6b-r-${++request}`, moves: moves as ProgramTaskDateMove[] });
    assert(!result.ok, 'refused'); assert.equal(result.reason, reason); assert.equal(result.data, from);
  };
  // Changed since: its date or its time.
  refused([good, { ...moveOf(data, ids['둘'], '2026-11-02'), expected: { date: '2026-10-31', time: '09:30' } }], 'conflict');
  refused([good, { ...moveOf(data, ids['둘'], '2026-11-02'), expected: { date: '2026-10-30', time: '' } }], 'conflict');
  // Finished since.
  const finished = ok(completeProgramTask(data, { ...base(data), taskId: ids['둘'], date: '2026-10-29', done: true })).data;
  refused([moveOf(finished, ids['하나'], '2026-11-02'), moveOf(finished, ids['둘'], '2026-11-02')], 'conflict', finished);
  // Locked (its document archived).
  const locked = programClone(data); space(locked).archivedDocumentIds = [space(data).text.documents[1].id];
  refused([moveOf(locked, ids['하나'], '2026-11-02'), moveOf(locked, ids['둘'], '2026-11-02')], 'unresolved', locked);
  // Missing, duplicate, empty, too many, malformed.
  refused([good, { taskId: 'task-none', expected: { date: null, time: '' }, date: '2026-11-02' }], 'missing');
  refused([good, good], 'invalid');
  refused([], 'invalid');
  refused(Array.from({ length: PROGRAM_TASK_DATE_MOVE_LIMIT + 1 }, (_, i) => ({ ...good, taskId: `task-${i}` })), 'invalid');
  refused([{ ...good, date: '2026-13-01' }], 'invalid');
  refused([{ ...good, expected: { date: good.expected.date, time: '9:30' } }], 'invalid');
  // clearOverride belongs to a copy's task only.
  refused([{ ...good, clearOverride: true }], 'invalid');
});

test('a personal repeat\'s generated task and a copy in a repeat are not picked and not moved', () => {
  let data = createProgramData();
  space(data).text = { version: 11, folders: [{ id: 'f', title: '분류', parentId: null }], documents: [{ id: 'source', title: '원문', folder: '분류', folderId: 'f',
    lines: [{ id: 'p', text: '- [0] 부모' }, { id: 'pd', text: '  - 날짜: 2026-10-28' }] }], flows: [], bindings: [], taskScopes: { p: 'f' }, itemScopes: { p: 'f' }, progressRecords: [] };
  assert(validateProgramData(data));
  const flow = ok(createPersonalFlow(data, { title: '내 구성', documentId: 'source', taskIds: ['p'] })); data = flow.data;
  data = ok(savePersonalVersion(data, flow.result, { p: { kind: 'relative', offsetDays: 0 } })).data;
  const repeat = ok(setPersonalRepeat(data, { flowId: flow.result, rule: { kind: 'daily', startDate: '2026-10-29', end: { kind: 'count', count: 4 } } })); data = repeat.data;
  data = ok(startPersonalRound(data, { seriesId: repeat.result, anchorDate: '2026-10-29' })).data;
  const generated = Object.values(space(data).personalAuthoring!.series[0].rounds[0].taskIds)[0];
  assert(programTaskRepeatMember(space(data), generated));
  assert(!programTaskRepeatMember(space(data), 'p') || space(data).personalAuthoring!.series[0].source.kind === 'task');
  const result = moveProgramTaskDates(data, { actorId: actor(data), requestId: 'c6b-repeat', moves: [moveOf(data, generated, '2026-11-02')] });
  assert(!result.ok); assert.equal(result.reason, 'unresolved');
  // The list's 고르기 says why, like an occurrence.
  const row = programOrderedExecutionRows(data, { period: 'week', date: '2026-10-29', today: '2026-10-29', folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 })
    .rows.find(entry => entry.kind === 'text-task' && entry.task.id === generated);
  assert(row, 'the round task is a row of the week'); assert.equal(programSelectBlock(space(data), row, false), 'occurrence');
  // A copy's item that is part of its repeat.
  const { data: withCopy, ids } = account(); const copy = space(withCopy).copies[0];
  const repeating = programClone(withCopy); space(repeating).copies[0] = { ...copy, recurrence: { ...(copy.recurrence ?? {}), itemIds: ['item-a'] } as typeof copy.recurrence };
  assert(programTaskRepeatMember(space(repeating), ids.copy));
});

test('a press twice or a retry after a lost reply never moves twice', () => {
  const { data, ids } = account();
  const moves = [moveOf(data, ids['하나'], '2026-11-02'), moveOf(data, ids['둘'], '2026-11-03')];
  const first = ok(moveProgramTaskDates(data, { actorId: actor(data), requestId: 'c6b-once', moves }));
  // The same request again (a retry): nothing new.
  const retry = ok(moveProgramTaskDates(first.data, { actorId: actor(data), requestId: 'c6b-once', moves }));
  assert.equal(retry.changed, false); assert.equal(retry.data, first.data);
  // A second press (a new request with the same picks): the dates it expects are gone, so nothing moves.
  const again = moveProgramTaskDates(first.data, { actorId: actor(data), requestId: 'c6b-twice', moves });
  assert(!again.ok); assert.equal(again.reason, 'conflict');
});

test('되돌리기 is one change back to the old dates, the copy\'s override as it was; a task changed since moves nothing', () => {
  const { data, ids } = account();
  const moves = [moveOf(data, ids['하나'], '2026-11-02'), moveOf(data, ids['둘'], null), moveOf(data, ids.copy, '2026-11-02')];
  const moved = ok(moveProgramTaskDates(data, { actorId: actor(data), requestId: 'c6b-apply', moves }));
  const undo = programTaskDateUndo(space(data), space(moved.data), moves);
  assert.deepEqual(undo.map(move => [move.taskId, move.expected.date, move.date]), [[ids['하나'], '2026-11-02', '2026-10-29'], [ids['둘'], null, '2026-10-30'], [ids.copy, '2026-11-02', '2026-10-30']]);
  // An unrelated save in between does not block it (only the moved tasks are compared).
  const other = ok(createProgramDocument(moved.data, { ...base(moved.data), title: '그 사이 글' })).data;
  const back = ok(moveProgramTaskDates(other, { actorId: actor(data), requestId: 'c6b-undo', moves: undo }));
  for (const id of [ids['하나'], ids['둘'], ids.copy]) assert.equal(task(back.data, id).date, task(data, id).date);
  assert.equal(task(back.data, ids['둘']).time, '09:30');
  assert.equal(space(back.data).copies[0].itemOverrides['item-a'], space(data).copies[0].itemOverrides['item-a'], 'no override again, as before');
  // Changed since the move: none goes back.
  const changed = ok(updateProgramTask(moved.data, { ...base(moved.data), taskId: ids['하나'], patch: { date: '2026-11-05' } })).data;
  const refused = moveProgramTaskDates(changed, { actorId: actor(data), requestId: 'c6b-undo-2', moves: undo });
  assert(!refused.ok); assert.equal(refused.reason, 'conflict');
});

test('the server takes the whole list as one social intent when a copy is in it, and runs the same command', () => {
  const { data, ids } = account();
  const moves = [moveOf(data, ids['하나'], '2026-11-02'), moveOf(data, ids.copy, '2026-11-02')];
  assert.equal(programTaskDateMovesSocial(space(data), moves), true);
  assert.equal(programTaskDateMovesSocial(space(data), [moves[0]]), false, 'ordinary tasks alone go as one private change');
  const intent = { type: 'private-task-dates', moves };
  assert(isAlphaSocialIntent(intent));
  assert(!isAlphaSocialIntent({ ...intent, moves: [] }));
  assert(!isAlphaSocialIntent({ ...intent, moves: [moves[0], moves[0]] }));
  assert(!isAlphaSocialIntent({ ...intent, moves: [{ ...moves[0], extra: 1 }] }));
  assert(!isAlphaSocialIntent({ ...intent, moves: [{ ...moves[0], clearOverride: false }] }), 'clearOverride is true or absent');
  assert(isAlphaSocialIntent({ ...intent, moves: [moves[0], { ...moves[1], clearOverride: true }] }));
  assert.deepEqual(alphaSocialAllowedFields(intent as never), { private: ['text', 'copies'], public: [] });
  const served = executeAlphaSocialIntent(data, actor(data), intent as never, 'c6b-server');
  assert(served.ok, served.ok ? '' : served.reason);
  assert.equal(task(served.data, ids.copy).date, '2026-11-02'); assert.equal(task(served.data, ids['하나']).date, '2026-11-02');
  // The server's own state decides: a stale list moves nothing there either.
  const stale = executeAlphaSocialIntent(served.data, actor(data), intent as never, 'c6b-server-2');
  assert(!stale.ok); assert.equal(stale.reason, 'conflict');
});

test('the sheet\'s choices carry their real dates from today; one every picked task has is off; the notice reads right', () => {
  const choices = programTaskDateChoices('2026-10-29', ['2026-10-29', '2026-10-29']);
  assert.deepEqual(choices.map(choice => [choice.key, choice.label, choice.date, choice.detail, choice.off]), [
    ['today', '오늘', '2026-10-29', '10월 29일 (목)', true], ['tomorrow', '내일', '2026-10-30', '10월 30일 (금)', false],
    ['monday', '다음 주 월요일', '2026-11-02', '11월 2일', false], ['none', '날짜 미정', null, '', false]]);
  // Monday's next Monday is a week on; Sunday's is the day after.
  assert.equal(programTaskDateChoices('2026-11-02', [])[2].date, '2026-11-09');
  assert.equal(programTaskDateChoices('2026-11-01', [])[2].date, '2026-11-02');
  assert.equal(programTaskDateChoices('2026-10-29', [null])[3].off, true);
  assert.equal(programTaskDatesMovedText(3, '2026-11-02', '2026-10-29'), '3개를 11월 2일 (월)로 옮겼습니다');
  assert.equal(programTaskDatesMovedText(2, '2026-10-29', '2026-10-29'), '2개를 10월 29일 (목)으로 옮겼습니다');
  // Core3 P3b (UX): one task is said by its new day alone.
  assert.equal(programTaskDatesMovedText(1, '2026-10-30', '2026-10-29'), '10월 30일 (금)으로 옮겼습니다');
  assert.equal(programTaskDatesMovedText(4, null, '2026-10-29'), '4개를 날짜 미정으로 옮겼습니다');
});
