import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { continueProgramTask, programContinuationStarts, programContinuedLines, programLostContinuations, programTaskHasRecord } from './continuation';
import { carryProgramTasksToToday, planProgramCarryover, programCarryoverBefore, programCarryoverProof, restoreProgramCarryover } from './carryover';
import { programExecutionRowMeta } from './execution-presentation';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// Redesign 4 (W-MENU-25, W-TXT-04·05·08; 총괄 11/12: the text alone, in the same release as redesign 3). A task with a
// record taken to today is continued: yesterday's line stays as `[>]` with `- 이어감: 날짜 · n%`, a new line today carries
// it on. No ID suffix, no new account key; the two lines are found again by the same task key.
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `ct-${++request}`, expectedSpace: space(data) });
const raw = (text: TextWorkspaceState, docId: string) => M.raw(M.getDocument(text, docId)!);
function writing(text: string, title = '하루 기록', data = createProgramData()) {
  const created = ok(createProgramDocument(data, { ...base(data), title }));
  const next = programClone(created.data);
  space(next).text = M.editTextResult(space(next).text, created.result, text, { folderText: true }).state;
  assert.equal(raw(space(next).text, created.result), text);
  return { data: next, docId: created.result };
}
const task = (text: TextWorkspaceState, title: string) => M.tasks(text).find(row => row.title === title)!;

const DAY = ['[2026-11-11]', '- /월간 발표', '  - [60%] 발표 자료 정리', '    - 마감: 2026-11-20', '    - 메모: 표 3장', '    - [x] 자료 모으기', '    - [ ] 그래프', '  - [ ] 회의실 찾기'].join('\n');

test('mockup ①②: yesterday\'s line stays as [>] with its 이어감 (memo kept, 마감 on both); today\'s line carries the progress and subtasks', () => {
  const { data, docId } = writing(DAY);
  let text = space(data).text;
  const old = task(text, '발표 자료 정리');
  text = { ...text, progressRecords: [{ taskId: old.id, date: '2026-11-10', percent: 30 }, { taskId: old.id, date: '2026-11-11', percent: 60 }] };
  assert(M.validate(text));
  assert.equal(programTaskHasRecord(text, old), true);
  assert.equal(programTaskHasRecord(text, task(text, '회의실 찾기')), false, 'an empty task has no record (it moves instead)');
  const done = continueProgramTask(text, { documentId: docId, taskId: old.id, today: '2026-11-12', newId: 'line-today' });
  assert(done.ok, done.ok ? '' : done.reason);
  assert.equal(raw(done.next, docId), ['[2026-11-11]', '- /월간 발표', '  - [>] 발표 자료 정리', '    - 마감: 2026-11-20', '    - 메모: 표 3장', '    - 이어감: 2026-11-12 · 60%',
    '  - [ ] 회의실 찾기', '', '[2026-11-12]', '- /월간 발표', '  - [60%] 발표 자료 정리', '    - 마감: 2026-11-20', '    - [x] 자료 모으기', '    - [ ] 그래프'].join('\n'));
  const now = task(done.next, '발표 자료 정리');
  assert.deepEqual([now.id, now.date, now.due, M.currentProgress(done.next, now.id), now.subchecks.map(sub => sub.title)], ['line-today', '2026-11-12', '2026-11-20', 60, ['자료 모으기', '그래프']]);
  // The old line is no task any more (it is the day's record): 오늘·밀린 일 count the task once.
  assert.equal(M.tasks(done.next).filter(row => row.title === '발표 자료 정리').length, 1);
  // Owner, records and links pass to the new line; the account keeps its shape (W-TXT-06).
  assert.deepEqual(done.next.progressRecords.map(record => [record.taskId, record.date, record.percent]), [['line-today', '2026-11-10', 30], ['line-today', '2026-11-11', 60]]);
  assert.equal(done.next.taskScopes['line-today'], text.taskScopes[old.id]);
  assert.equal(Object.hasOwn(done.next.taskScopes, old.id), false);
  assert.deepEqual(Object.keys(done.next).sort(), Object.keys(text).sort());
  assert.equal(done.next.version, 11);
  assert(M.validate(done.next));
});

test('W-TXT-05·08: the receiving line is read from the text (any document, same key); deleted, the old line is lost and counted again', () => {
  const { data, docId } = writing(DAY);
  let text = space(data).text;
  text = { ...text, progressRecords: [{ taskId: task(text, '발표 자료 정리').id, date: '2026-11-11', percent: 60 }] };
  const done = continueProgramTask(text, { documentId: docId, taskId: task(text, '발표 자료 정리').id, today: '2026-11-12' });
  assert(done.ok);
  const [line] = programContinuedLines(done.next);
  assert.deepEqual([line.title, line.day, line.to, line.percent, line.received], ['발표 자료 정리', '2026-11-11', '2026-11-12', 60, task(done.next, '발표 자료 정리').id]);
  // Today's line deleted by hand: nothing receives the old line (it goes back to the remaining work, W-TXT-08).
  // Today's line deleted by hand (its subtasks and records with it, as the writing's own save drops them).
  const rows = M.parseDocument(M.getDocument(done.next, docId)!, done.next).rows, row = rows.find(entry => entry.id === done.newId)!;
  const gone = new Set(rows.slice(row.index, row.subtreeEndIndex).map(entry => entry.id)), keep = (owners: Record<string, string>) => Object.fromEntries(Object.entries(owners).filter(([id]) => !gone.has(id)));
  const removed: TextWorkspaceState = { ...done.next, taskScopes: keep(done.next.taskScopes), itemScopes: keep(done.next.itemScopes), progressRecords: done.next.progressRecords.filter(record => !gone.has(record.taskId)),
    documents: done.next.documents.map(item => item.id === docId ? { ...item, lines: item.lines.filter(line => !gone.has(line.id)) } : item) };
  assert(M.validate(removed));
  assert.equal(programContinuedLines(removed)[0].received, null);
  // The same task written under that day in another document receives it (W-TXT-05: the text, not an ID).
  const other = M.addDocument(removed, { title: '다른 글' }), otherId = other.documents.at(-1)!.id;
  const again = M.editText(other, otherId, '[2026-11-12]\n- [ ] 발표 자료 정리');
  assert.equal(programContinuedLines(again)[0].received, task(again, '발표 자료 정리').id);
});

test("'n일째' follows the 이어감 chain back to its first day (shown from 7 days, as before); a fresh task has none", () => {
  const { data, docId } = writing(DAY.replace('2026-11-11', '2026-11-04'));
  let text = space(data).text;
  text = { ...text, progressRecords: [{ taskId: task(text, '발표 자료 정리').id, date: '2026-11-04', percent: 60 }] };
  const first = continueProgramTask(text, { documentId: docId, taskId: task(text, '발표 자료 정리').id, today: '2026-11-12' });
  assert(first.ok);
  const second = continueProgramTask(first.next, { documentId: docId, taskId: first.newId, today: '2026-11-13' });
  assert(second.ok, second.ok ? '' : second.reason);
  const starts = programContinuationStarts(second.next);
  assert.equal(starts.get(second.newId), '2026-11-04');
  assert.equal(starts.has(task(second.next, '회의실 찾기').id), false);
  const meta = programExecutionRowMeta({ date: '2026-11-13', done: false, progress: null, today: '2026-11-13', dated: true, since: starts.get(second.newId)! });
  assert(meta.parts.includes('9일째'), meta.parts.join(' '));
  assert.equal(programContinuedLines(second.next).length, 2);
  assert(programContinuedLines(second.next).every(line => line.received));
});

test("밀린 일 '어제 남은 일 이어 쓰기': a task with a record is continued, one without moves; one save; 되돌리기 gives every byte back", () => {
  const { data, docId } = writing(['[2026-11-10]', '- [ ] 장보기', '- [40%] 보고서', '- [ ] 전화', '  - 메모: 오후에', '', '[2026-11-12]', '- [ ] 오늘 일'].join('\n'));
  const plan = planProgramCarryover(space(data), '2026-11-12');
  const done = ok(carryProgramTasksToToday(data, { ...base(data), today: '2026-11-12', lines: plan.lines })).data;
  const text = space(done).text;
  assert.equal(raw(text, docId), ['[2026-11-10]', '- [>] 보고서', '  - 이어감: 2026-11-12 · 40%', '- [>] 전화', '  - 메모: 오후에', '  - 이어감: 2026-11-12 · 0%', '',
    '[2026-11-12]', '- [ ] 오늘 일', '- [40%] 보고서', '- [ ] 장보기', '- [ ] 전화'].join('\n'));
  assert.deepEqual(M.tasks(text).filter(row => !row.done).map(row => [row.title, row.date]).sort(), [['보고서', '2026-11-12'], ['오늘 일', '2026-11-12'], ['장보기', '2026-11-12'], ['전화', '2026-11-12']]);
  assert(validateProgramData(done));
  const back = ok(restoreProgramCarryover(done, { ...base(done), before: programCarryoverBefore(space(data)), after: programCarryoverProof(space(done)) })).data;
  assert.deepEqual(space(back).text, space(data).text);
});

test('W-TXT-08: a [>] line whose today line was deleted comes back with 어제 남은 일; the press continues it again (one save, 되돌리기)', () => {
  const { data, docId } = writing(['[2026-11-10]', '- [>] 보고서', '  - 마감: 2026-11-20', '  - 이어감: 2026-11-11 · 40%', '', '[2026-11-11]', '- [ ] 다른 일'].join('\n'));
  assert.equal(programLostContinuations(space(data).text, '2026-11-12').length, 1, 'nothing received it on 11/11');
  const plan = planProgramCarryover(space(data), '2026-11-12');
  assert.deepEqual(plan.lines.filter(line => line.action === 'again').map(line => line.taskId), [M.getDocument(space(data).text, docId)!.lines[1].id]);
  const done = ok(carryProgramTasksToToday(data, { ...base(data), today: '2026-11-12', lines: plan.lines })).data;
  assert.equal(raw(space(done).text, docId), ['[2026-11-10]', '- [>] 보고서', '  - 마감: 2026-11-20', '  - 이어감: 2026-11-12 · 40%', '',
    '[2026-11-12]', '- [40%] 보고서', '  - 마감: 2026-11-20', '- [ ] 다른 일'].join('\n'));
  assert.equal(programLostContinuations(space(done).text, '2026-11-12').length, 0);
  assert(validateProgramData(done));
  const back = ok(restoreProgramCarryover(done, { ...base(done), before: programCarryoverBefore(space(data)), after: programCarryoverProof(space(done)) })).data;
  assert.deepEqual(space(back).text, space(data).text);
});
