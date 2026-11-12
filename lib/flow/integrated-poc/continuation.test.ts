import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { archiveProgramDocument, createProgramDocument, createProgramFolder } from './private-space';
import { continueProgramTask, programContinuationStarts, programContinuedLines, programLostContinuations, programTaskHasRecord } from './continuation';
import { carryProgramTasksToToday, planProgramCarryover, programCarryoverBefore, programCarryoverItems, programCarryoverProof, restoreProgramCarryover } from './carryover';
import { programDayCount, programExecutionRowMeta } from './execution-presentation';
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
  // The same task written under that day in another document, in its folder, receives it (W-TXT-05: the text, not an
  // ID). Codex re-review P1-1: the same words in another folder are another task: not received, the old line stays lost.
  const other = M.addDocument(removed, { title: '다른 글' }), otherId = other.documents.at(-1)!.id;
  const elsewhere = M.editTextResult(other, otherId, '[2026-11-12]\n- /개인\n  - [ ] 발표 자료 정리', { folderText: true }).state;
  assert.equal(programContinuedLines(elsewhere)[0].received, null);
  assert.equal(programLostContinuations(elsewhere, '2026-11-12').length, 1);
  const again = M.editTextResult(other, otherId, '[2026-11-12]\n- /월간 발표\n  - [ ] 발표 자료 정리', { folderText: true }).state;
  assert.equal(programContinuedLines(again)[0].received, task(again, '발표 자료 정리').id);
});

test("'n일째' follows the 이어감 chain back to its first day, that day being 1일째 (총괄 11/12 ②); a fresh task has none", () => {
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
  assert(meta.parts.includes('10일째'), meta.parts.join(' '));
  // ②: the chain's first line's day is 1일째, so the third day is 3일째; it shows from 2일째 (the second day).
  const on = (since: string) => programExecutionRowMeta({ date: '2026-11-13', done: false, progress: null, today: '2026-11-13', dated: true, since }).parts;
  assert.deepEqual([on('2026-11-11'), on('2026-11-12')], [['3일째'], ['2일째']]);
  assert.deepEqual(programExecutionRowMeta({ date: '2026-11-13', done: false, progress: null, today: '2026-11-13', dated: true, since: '2026-11-13' }).parts, [], 'its first day: nothing');
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

test("Codex re-review P2-2: 'n일째' is one count, 오늘's row and the 밀린 일 sheet both from the chain's first day", () => {
  const { data, docId } = writing(['[2026-11-04]', '- [40%] 보고서'].join('\n'), '보고 기록');
  let text = space(data).text;
  const old = task(text, '보고서');
  text = { ...text, progressRecords: [{ taskId: old.id, date: '2026-11-04', percent: 40 }] };
  const moved = continueProgramTask(text, { documentId: docId, taskId: old.id, today: '2026-11-11' });
  assert(moved.ok, moved.ok ? '' : moved.reason);
  const next = programClone(data); space(next).text = moved.next;
  const starts = programContinuationStarts(moved.next);
  const row = programExecutionRowMeta({ date: '2026-11-11', done: false, progress: null, today: '2026-11-12', dated: true, since: starts.get(moved.newId) });
  const item = programCarryoverItems(space(next), '2026-11-12').find(entry => entry.title === '보고서')!;
  assert(row.parts.includes('9일째'), row.parts.join(' '));
  assert.equal(item.since, '2026-11-04');
  assert.equal(programDayCount(item.since, '2026-11-12'), 9, 'the sheet counts the same');
  assert.deepEqual([programDayCount('2026-11-12', '2026-11-12'), programDayCount('2026-11-11', '2026-11-12'), programDayCount(null, '2026-11-12')], [null, 2, null]);
});

// Codex 3rd review (11/12): which line received a continuation, told without guessing.
const continued = (text: TextWorkspaceState, docId: string, title: string, today: string, pick?: (rows: ReturnType<typeof M.tasks>) => ReturnType<typeof M.tasks>[number]) => {
  const tasks = M.tasks(text).filter(entry => entry.title === title && entry.docId === docId), target = pick ? pick(tasks) : tasks[0];
  const done = continueProgramTask(text, { documentId: docId, taskId: target.id, today });
  assert(done.ok, done.ok ? '' : done.reason);
  return done;
};
const dropLine = (text: TextWorkspaceState, docId: string, lineId: string): TextWorkspaceState => {
  const rows = M.parseDocument(M.getDocument(text, docId)!, text).rows, row = rows.find(entry => entry.id === lineId)!;
  const gone = new Set(rows.slice(row.index, row.subtreeEndIndex).map(entry => entry.id)), keep = (owners: Record<string, string>) => Object.fromEntries(Object.entries(owners).filter(([id]) => !gone.has(id)));
  return { ...text, taskScopes: keep(text.taskScopes), itemScopes: keep(text.itemScopes), progressRecords: text.progressRecords.filter(record => !gone.has(record.taskId)),
    documents: text.documents.map(item => item.id === docId ? { ...item, lines: item.lines.filter(line => !gone.has(line.id)) } : item) };
};

test("Codex 3rd review P2-1: a task in its document's own folder (no '- /folder' line) is received right after it is continued", () => {
  let data = createProgramData();
  const folder = ok(createProgramFolder(data, { ...base(data), title: '회사', parentId: null })); data = folder.data;
  const made = ok(createProgramDocument(data, { ...base(data), title: '회사 글', folderId: folder.result })); data = programClone(made.data);
  space(data).text = M.editTextResult(space(data).text, made.result, '[2026-11-10]\n- [40%] 보고서', { folderText: true }).state;
  const report = task(space(data).text, '보고서');
  space(data).text = { ...space(data).text, progressRecords: [{ taskId: report.id, date: '2026-11-10', percent: 40 }] };
  const done = continued(space(data).text, made.result, '보고서', '2026-11-12');
  const [line] = programContinuedLines(done.next);
  assert.equal(line.received, done.newId);
  assert.equal(programLostContinuations(done.next, '2026-11-12').length, 0, 'not remaining work again');
  const after = programClone(data); space(after).text = done.next;
  assert.equal(planProgramCarryover(space(after), '2026-11-12').lines.filter(entry => entry.action === 'again').length, 0);
  assert.equal(programContinuationStarts(done.next).get(done.newId), '2026-11-10');
});

test('Codex 3rd review P2-2: two past lines left on one receiving line (the other deleted) are not guessed: no chain through either', () => {
  const { data, docId } = writing(['[2026-11-04]', '- [40%] 보고서', '  - 메모: A', '', '[2026-11-10]', '- [60%] 보고서', '  - 메모: B'].join('\n'), '보고 글');
  let text = space(data).text;
  const [first, second] = M.tasks(text).filter(entry => entry.title === '보고서');
  text = { ...text, progressRecords: [{ taskId: first.id, date: '2026-11-04', percent: 40 }, { taskId: second.id, date: '2026-11-10', percent: 60 }] };
  const one = continued(text, docId, '보고서', '2026-11-12', rows => rows.find(entry => entry.id === first.id)!);
  const two = continued(one.next, docId, '보고서', '2026-11-12', rows => rows.find(entry => entry.id === second.id)!);
  // Same words on the same day in the same folder: which took up which is not told, while both are there either.
  assert.deepEqual(programContinuedLines(two.next).map(line => [line.received, line.ambiguous]), [[null, true], [null, true]]);
  const left = dropLine(two.next, docId, two.newId);
  assert(M.validate(left));
  assert.deepEqual(programContinuedLines(left).map(line => [line.received, line.ambiguous]), [[null, true], [null, true]]);
  assert.equal(programContinuationStarts(left).has(one.newId), false, 'no start day taken from either');
});

test('Codex 3rd review P2-3: the same last folder name under another parent is another folder: its task never receives', () => {
  const company = writing(['[2026-11-04]', '- /회사', '  - /진행', '    - [40%] 보고서'].join('\n'), '회사 글');
  const personal = writing(['[2026-11-12]', '- /개인', '  - /진행', '    - [80%] 보고서'].join('\n'), '개인 글', company.data);
  let text = space(personal.data).text;
  const ours = M.tasks(text).find(entry => entry.title === '보고서' && entry.docId === company.docId)!, theirs = M.tasks(text).find(entry => entry.docId === personal.docId)!;
  assert.notEqual(ours.scopeId, theirs.scopeId);
  text = { ...text, progressRecords: [{ taskId: ours.id, date: '2026-11-04', percent: 40 }, { taskId: theirs.id, date: '2026-11-12', percent: 80 }] };
  const done = continued(text, company.docId, '보고서', '2026-11-12');
  const left = dropLine(done.next, company.docId, done.newId);
  const line = programContinuedLines(left).find(entry => entry.docId === company.docId)!;
  assert.equal(line.received, null);
  assert.equal(programLostContinuations(left, '2026-11-12').length, 1, "회사's comes back as remaining work");
  assert.equal(programContinuationStarts(left).has(theirs.id), false, "개인's gets no start day");
});

test("Codex 3rd review P2-4: a '[>]' in a code block, or in an archived document, is no remaining work", () => {
  const { data, docId } = writing(['[2026-11-10]', '- [ ] 할 일', '~~~', '- [>] 샘플', '  - 이어감: 2026-11-11 · 40%', '~~~'].join('\n'), '예시 글');
  assert.deepEqual(programContinuedLines(space(data).text), [], 'the code block holds no line of work');
  const kept = writing(['[2026-11-10]', '- [>] 남은 줄', '  - 이어감: 2026-11-11 · 30%'].join('\n'), '보관할 글', data);
  assert.equal(programLostContinuations(space(kept.data).text, '2026-11-12').length, 1, 'a lost line in a document in use');
  assert.equal(planProgramCarryover(space(kept.data), '2026-11-12').lines.filter(entry => entry.action === 'again').length, 1);
  const archived = ok(archiveProgramDocument(kept.data, { ...base(kept.data), documentId: kept.docId, archived: true })).data;
  assert.equal(planProgramCarryover(space(archived), '2026-11-12').lines.filter(entry => entry.action === 'again').length, 0, 'not from an archived one');
  void docId;
});