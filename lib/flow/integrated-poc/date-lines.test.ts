import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument, updateProgramTask } from './private-space';
import { applyProgramDateLineChoices, programDateLineDefaults, programDateLineOutcomes, programDateLinePlan, programDateLinesKeepLines } from './date-property-migration';
import { applyProgramTextCleanup, programCleanupArchive, programCleanupArchiveStamp, programTextCleanupDocuments, programTextCleanupPlan, restoreProgramTextCleanup } from './text-cleanup';
import { moveProgramTaskDates } from './task-date-move';
import { moveTaskLocation } from './task-location-move';
import { carryProgramTasksToToday, planProgramCarryover } from './carryover';
import { moveProgramTaskDocument } from './task-document-move';
import { copyProgramFolderOccurrence, readProgramFolderCopyPreview } from './folder-copy';
import { prepareWritingChild } from './writing-child-command';
import { createPersonalFlow, startPersonalFlow } from './personal-authoring-commands';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// Redesign 3 (DECISION-1, W-TXT-03, mockup ③; 총괄 11/12: the whole account at once). The '- 날짜:' lines go once, on the
// person's word, from one list for the account, in one save (Alpha keeps it with its inverse: the snapshot ↶ restores);
// 되돌리기 is one save back. After that nothing writes one again in an ordinary document. In a document
// without date headings a task's date is its 마감. A copy's, a Flow run's, a reference's and a repeat's stay (step 5).
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `dl-${++request}`, expectedSpace: space(data) });
const DATE_LINE = /^ *-\s+날짜:/;
const raw = (data: ProgramData | TextWorkspaceState, docId: string) => M.raw(M.getDocument('spaces' in data ? space(data).text : data, docId)!);
const lines = (data: ProgramData, docId: string) => M.getDocument(space(data).text, docId)!.lines.map(line => [line.id, line.text]);
const cleanup = (data: ProgramData, choose?: (choices: Record<string, 'move' | 'due'>) => Record<string, 'move' | 'due'>) => {
  const plan = programTextCleanupPlan(space(data))!, defaults = programDateLineDefaults(plan.dates);
  return ok(applyProgramTextCleanup(data, { ...base(data), plan, choices: choose ? choose(defaults) : defaults, when: '2026-11-12 16:20' })).data;
};
// 총괄 11/12 ①: 되돌리기 reads the archived original ('전환 전 원문 · when'), with nothing kept in memory.
const stampOf = (data: ProgramData) => programCleanupArchiveStamp(space(data).text, space(data).archivedDocumentIds.find(id => M.getDocument(space(data).text, id)?.title.startsWith('전환 전 원문'))!)!;
const undo = (_before: ProgramData, after: ProgramData) => ok(restoreProgramTextCleanup(after, { ...base(after), stamp: stampOf(after), when: '2026-11-12 16:25' })).data;
/** The writing without the archived originals (the documents `like` has); links in any order (a restore re-links a
 *  folder line the conversion had removed). */
const sorted = (text: TextWorkspaceState) => ({ ...text, bindings: [...text.bindings].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) });
const own = (data: ProgramData, like: ProgramData) => sorted({ ...space(data).text, documents: space(data).text.documents.filter(doc => space(like).text.documents.some(old => old.id === doc.id)) });

function writing(text: string, title = '하루 기록', data = createProgramData()) {
  const created = ok(createProgramDocument(data, { ...base(data), title }));
  const next = programClone(created.data);
  space(next).text = M.editTextResult(space(next).text, created.result, text, { folderText: true }).state;
  assert.equal(raw(next, created.result), text, 'seeded as written');
  return { data: next, docId: created.result };
}
const id = (data: ProgramData, title: string) => item(data, title).id;
const item = (data: ProgramData, title: string) => space(data).text.documents.flatMap(doc => M.parseDocument(doc, space(data).text).items).find(row => row.title === title)!;

const MOCKUP = ['[2026-11-09]', '- [ ] 보고서 초안', '  - 날짜: 2026-11-09', '- [ ] 치과 예약 전화', '  - 날짜: 2026-11-12', '',
  '[2026-11-10]', '- [x] 영수증 정리', '  - 날짜: 2026-11-10', '- [ ] 분기 보고 제출', '  - 날짜: 2026-11-27'].join('\n');

test("mockup ③ in the account's list: same days deleted, other days moved; only the writing changes; 되돌리기 gives it all back", () => {
  const { data, docId } = writing(MOCKUP);
  const plan = programTextCleanupPlan(space(data))!;
  assert.deepEqual([plan.progressLines, plan.dateLines, plan.dates.length], [0, 4, 1]);
  assert.deepEqual(plan.dates[0].items.map(row => [row.title, row.kind, row.value, row.section, row.choices.join('|')]), [
    ['보고서 초안', 'same', '2026-11-09', '2026-11-09', ''], ['치과 예약 전화', 'other', '2026-11-12', '2026-11-09', 'move|due'],
    ['영수증 정리', 'same', '2026-11-10', '2026-11-10', ''], ['분기 보고 제출', 'other', '2026-11-27', '2026-11-10', 'move|due']]);
  assert.deepEqual(Object.values(programDateLineDefaults(plan.dates)), ['move', 'move'], 'the default is 그날로 옮기기 (mockup ③ choice)');
  const moved = cleanup(data);
  assert.equal(raw(moved, docId), ['[2026-11-09]', '- [ ] 보고서 초안', '', '[2026-11-10]', '- [x] 영수증 정리', '', '[2026-11-12]', '- [ ] 치과 예약 전화',
    '', '[2026-11-27]', '- [ ] 분기 보고 제출'].join('\n'));
  assert.deepEqual(['보고서 초안', '치과 예약 전화', '영수증 정리', '분기 보고 제출'].map(title => [item(moved, title).date, item(moved, title).explicitDate]),
    [['2026-11-09', false], ['2026-11-12', false], ['2026-11-10', false], ['2026-11-27', false]], 'each task reads the day its line said');
  // Only the writing changes (an Alpha client command may change it, not saved revisions), and in the same save the
  // original goes to an archived document '전환 전 원문 · when' (총괄 11/12 ①).
  const { text: _was, archivedDocumentIds: archivedBefore, ...restBefore } = space(data), { text: _now, archivedDocumentIds: archivedAfter, ...restAfter } = space(moved);
  assert.deepEqual(restAfter, restBefore);
  assert.equal(moved.receipts.length, data.receipts.length + 1, 'one save');
  assert.equal(archivedAfter.length, archivedBefore.length + 1);
  const archive = M.getDocument(space(moved).text, archivedAfter.at(-1)!)!;
  assert.equal(archive.title, '전환 전 원문 · 2026-11-12 16:20');
  assert.deepEqual(programCleanupArchive(space(moved).text, stampOf(moved)).map(block => [block.documentId, block.raw]), [[docId, MOCKUP]], 'the whole original');
  assert.deepEqual(M.parseDocument(archive, space(moved).text).items, [], 'an archived original holds no task');
  // 되돌리기: the writing exactly as before, ids and bytes; what it said is archived too ('되돌리기 전 원문').
  const back = undo(data, moved);
  assert.deepEqual(own(back, data), sorted(space(data).text));
  assert.equal(raw(back, docId), MOCKUP);
  assert.deepEqual(space(back).archivedDocumentIds.slice(-2).map(id => M.getDocument(space(back).text, id)!.title), ['전환 전 원문 · 2026-11-12 16:20', '되돌리기 전 원문 · 2026-11-12 16:25']);
  assert.equal(programTextCleanupPlan(space(moved)), null, 'nothing left to ask');
});

test("마감으로 바꾸기: the line stays where it is, '- 날짜:' becomes '- 마감:' (its id kept), the task reads its section's day", () => {
  const { data, docId } = writing(MOCKUP);
  const plan = programTextCleanupPlan(space(data))!, dental = plan.dates[0].items[1];
  const after = cleanup(data, choices => ({ ...choices, [dental.ownerId]: 'due' }));
  assert.equal(raw(after, docId), ['[2026-11-09]', '- [ ] 보고서 초안', '- [ ] 치과 예약 전화', '  - 마감: 2026-11-12', '', '[2026-11-10]', '- [x] 영수증 정리',
    '', '[2026-11-27]', '- [ ] 분기 보고 제출'].join('\n'));
  assert.equal(M.getDocument(space(after).text, docId)!.lines.find(line => line.text === '  - 마감: 2026-11-12')!.id, dental.lineIds[0], 'the same line, its words changed');
  assert.deepEqual([item(after, '치과 예약 전화').date, item(after, '치과 예약 전화').due], ['2026-11-09', '2026-11-12']);
  assert.deepEqual(lines(undo(data, after), docId), lines(data, docId));
  // A choice the line does not offer is refused (nothing applied).
  const choices = programDateLineDefaults(plan.dates);
  assert.equal(applyProgramDateLineChoices(space(data).text, plan.dates[0], { ...choices, [plan.dates[0].items[3].ownerId]: 'nothing' as never }), null);
});

test('subtasks, memos, times, progress records and links go with the task and stay exactly as they were', () => {
  const text = ['[2026-11-09]', '- /회사', '  - [40%] 발표 자료 만들기', '    - 날짜: 2026-11-12', '    - 메모: 표는 3장', '    - 시간: 09:30',
    '    - [ ] 표 그리기', '    - [x] 자료 모으기', '      - 날짜: 2026-11-12', '  - [ ] 회의록 정리', '    - 날짜: 2026-11-09', '- [ ] 장보기', '  - [ ] 우유', '    - 날짜: 2026-11-11'].join('\n');
  let { data, docId } = writing(text);
  const task = id(data, '발표 자료 만들기'), draw = id(data, '표 그리기');
  space(data).text = { ...space(data).text, progressRecords: [{ taskId: task, date: '2026-11-08', percent: 20 }, { taskId: task, date: '2026-11-09', percent: 40 },
    { taskId: draw, date: '2026-11-09', percent: 50 }] };
  const other = writing('[2026-11-09]\n- [ ] 다른 글 할 일', '다른 글', data);
  data = other.data;
  space(data).text = M.linkTask(space(data).text, other.docId, 2, task);
  assert(space(data).text.bindings.some(binding => binding.kind === 'task' && binding.taskId === task), 'linked');
  assert(M.validate(space(data).text));
  const plan = programTextCleanupPlan(space(data))!;
  // 표 그리기's 50 record goes into its text too (redesign 1, the same list).
  assert.deepEqual(plan.progress.flatMap(doc => doc.changes.map(change => change.after.trim())), ['- [50%] 표 그리기']);
  assert.deepEqual(plan.dates[0].items.map(row => [row.title, row.kind, row.subtask, row.choices.join('|')]), [
    ['발표 자료 만들기', 'other', false, 'move|due'], ['자료 모으기', 'same', true, ''], ['회의록 정리', 'same', false, ''], ['우유', 'other', true, 'due']]);
  const before = programClone(space(data).text);
  const after = cleanup(data);
  assert.equal(raw(after, docId), ['[2026-11-09]', '- /회사', '  - [ ] 회의록 정리', '- [ ] 장보기', '  - [ ] 우유', '    - 마감: 2026-11-11', '',
    '[2026-11-12]', '- /회사', '  - [40%] 발표 자료 만들기', '    - 메모: 표는 3장', '    - 시간: 09:30', '    - [50%] 표 그리기', '    - [x] 자료 모으기'].join('\n'));
  const moved = item(after, '발표 자료 만들기');
  assert.deepEqual([moved.date, moved.note, moved.time, moved.explicitDate], ['2026-11-12', '표는 3장', '09:30', false]);
  assert.deepEqual(['표 그리기', '자료 모으기'].map(title => [item(after, title).parentItemId, item(after, title).date]), [[task, '2026-11-12'], [task, '2026-11-12']]);
  assert.deepEqual([item(after, '우유').date, item(after, '우유').due], ['2026-11-09', '2026-11-11'], 'a subtask takes 마감 and stays under its parent');
  assert.deepEqual(space(after).text.progressRecords, before.progressRecords, 'records untouched');
  assert.equal(M.currentProgress(space(after).text, task), 40);
  assert.deepEqual(space(after).text.taskScopes, before.taskScopes);
  for (const binding of before.bindings) assert(space(after).text.bindings.some(now => JSON.stringify(now) === JSON.stringify(binding)), 'every link is kept');
  const reference = M.rowMeta(space(after).text, other.docId).find(row => row.isReference)!;
  assert.equal(reference.progressTargetId, task);
  assert.deepEqual(lines(after, other.docId), lines(data, other.docId), 'the other document is untouched');
  assert.deepEqual(own(undo(data, after), data), sorted(space(data).text), 'the whole writing as before');
});

test('a document without date headings: its date lines become 마감 (no heading is made); 미정 goes; a date chip there writes 마감', () => {
  const list = ['- [ ] 책 사기', '  - 날짜: 2026-11-20', '- [ ] 우산 챙기기', '  - 날짜: 미정', '- [ ] 전화하기', '  - [ ] 번호 찾기', '    - 날짜: 2026-11-14'].join('\n');
  const { data, docId } = writing(list, '목록');
  const plan = programTextCleanupPlan(space(data))!;
  assert.equal(plan.dates[0].headless, true);
  assert.deepEqual(plan.dates[0].items.map(row => [row.title, row.kind, row.choices.join('|')]), [['책 사기', 'other', 'due'], ['우산 챙기기', 'same', ''], ['번호 찾기', 'other', 'due']]);
  const after = cleanup(data);
  assert.equal(raw(after, docId), ['- [ ] 책 사기', '  - 마감: 2026-11-20', '- [ ] 우산 챙기기', '- [ ] 전화하기', '  - [ ] 번호 찾기', '    - 마감: 2026-11-14'].join('\n'));
  assert.deepEqual([item(after, '책 사기').date, item(after, '책 사기').due], [null, '2026-11-20']);
  assert.deepEqual(own(undo(data, after), data), sorted(space(data).text));
  // After it, a date for a task there (date chip, row detail, F7) is its 마감: the line stays, no heading.
  const chip = moveTaskLocation(space(after).text, { documentId: docId, taskId: id(after, '책 사기'), target: { kind: 'date', date: '2026-11-25' } });
  assert(chip.ok && chip.due === '2026-11-25');
  assert.equal(raw(chip.next, docId), raw(after, docId).replace('마감: 2026-11-20', '마감: 2026-11-25'));
  const fresh = moveTaskLocation(space(after).text, { documentId: docId, taskId: id(after, '우산 챙기기'), target: { kind: 'date', date: '2026-11-13', time: '08:00' } });
  assert(fresh.ok); assert(raw(fresh.next, docId).includes('- [ ] 우산 챙기기\n  - 시간: 08:00\n  - 마감: 2026-11-13') || raw(fresh.next, docId).includes('- [ ] 우산 챙기기\n  - 마감: 2026-11-13\n  - 시간: 08:00'), raw(fresh.next, docId));
  const cleared = moveTaskLocation(space(after).text, { documentId: docId, taskId: id(after, '책 사기'), target: { kind: 'date', date: null } });
  assert(cleared.ok && cleared.due === null); assert(!raw(cleared.next, docId).includes('- [ ] 책 사기\n  - 마감'), raw(cleared.next, docId));
  const detail = ok(updateProgramTask(after, { ...base(after), taskId: id(after, '전화하기'), patch: { date: '2026-11-30' } })).data;
  assert(raw(detail, docId).includes('- [ ] 전화하기\n  - 마감: 2026-11-30\n  - [ ] 번호 찾기'), raw(detail, docId));
  assert.equal(M.rowMeta(space(detail).text, docId).filter(row => row.kind === 'date').length, 0, 'no heading made');
});

test('a folder line a move leaves with nothing under it in its day goes in the same save (its link with it); 되돌리기 brings it back', () => {
  const text = ['[2026-11-09]', '- /회사', '  - [ ] 보고서', '    - 날짜: 2026-11-12', '- /집', '  - [ ] 장보기', '  - [ ] 빨래', '    - 날짜: 2026-11-12'].join('\n');
  const { data, docId } = writing(text);
  const links = space(data).text.bindings.filter(binding => binding.kind === 'scope').length;
  const after = cleanup(data);
  assert.equal(raw(after, docId), ['[2026-11-09]', '- /집', '  - [ ] 장보기', '', '[2026-11-12]', '- /회사', '  - [ ] 보고서', '- /집', '  - [ ] 빨래'].join('\n'));
  assert.equal(space(after).text.bindings.filter(binding => binding.kind === 'scope').length, links + 1, "회사's old line and its link went; two lines declare the day");
  assert(programDateLinesKeepLines(space(data).text, own(after, data)), 'the machine check passes');
  assert.deepEqual(own(undo(data, after), data), sorted(space(data).text));
  // The same for any move (위치 옮기기): 집's line stays while 장보기 is under it.
  const move = moveTaskLocation(space(after).text, { documentId: docId, taskId: id(after, '장보기'), target: { kind: 'date', date: '2026-11-12' } });
  assert(move.ok); assert(!raw(move.next, docId).startsWith('[2026-11-09]\n- /집'), raw(move.next, docId));
});

test("Codex P1-2: a folder line with a line of spaces left under it stays (conversion, 위치 옮기기, 오늘로); the check catches one that goes", () => {
  const CODEX = ['[2026-11-09]', '- /회사', '  - [ ] 이동', '    - 날짜: 2026-11-12', '  ', '[2026-11-12]', '- /회사', '  - [ ] 유지'].join('\n');
  const { data, docId } = writing(CODEX);
  const folderLine = lines(data, docId)[1][0];
  const after = cleanup(data);
  assert.deepEqual(raw(after, docId).split('\n').slice(0, 3), ['[2026-11-09]', '- /회사', '  '], raw(after, docId));
  assert.equal(lines(after, docId)[1][0], folderLine, 'the same folder line, still linked');
  assert(space(after).text.bindings.some(binding => binding.kind === 'scope' && binding.lineId === folderLine));
  assert.equal(item(after, '이동').date, '2026-11-12');
  assert(programDateLinesKeepLines(space(data).text, own(after, data)));
  // The check itself: the same result with that folder line taken away (what the old rule did) is refused.
  const dropped = { ...own(after, data), bindings: own(after, data).bindings.filter(binding => binding.lineId !== folderLine),
    documents: own(after, data).documents.map(doc => doc.id === docId ? { ...doc, lines: doc.lines.filter(line => line.id !== folderLine) } : doc) };
  assert(M.validate(dropped));
  assert.equal(programDateLinesKeepLines(space(data).text, dropped), false, 'a folder line may not go while a line is left under it');
  // 위치 옮기기 (the date chip, the row's 날짜) and 밀린 일 '오늘로' keep it the same way.
  const plain = writing(CODEX.replace('    - 날짜: 2026-11-12\n', ''), '다른 기록');
  const chip = moveTaskLocation(space(plain.data).text, { documentId: plain.docId, taskId: id(plain.data, '이동'), target: { kind: 'date', date: '2026-11-12' } });
  assert(chip.ok); assert(raw(chip.next, plain.docId).startsWith('[2026-11-09]\n- /회사\n  \n'), raw(chip.next, plain.docId));
  const carryPlan = planProgramCarryover(space(plain.data), '2026-11-12');
  const carried = ok(carryProgramTasksToToday(plain.data, { ...base(plain.data), today: '2026-11-12', lines: carryPlan.lines })).data;
  assert.equal(item(carried, '이동').date, '2026-11-12');
  assert(raw(carried, plain.docId).startsWith('[2026-11-09]\n- /회사\n  \n'), raw(carried, plain.docId));
  // With nothing left under it but the empty line between days, it goes as before.
  const bare = writing(CODEX.replace('\n  \n', '\n\n'), '빈 줄 기록');
  assert(raw(cleanup(bare.data), bare.docId).startsWith('[2026-11-09]\n\n[2026-11-12]\n- /회사'), raw(cleanup(bare.data), bare.docId));
});

test("Codex P1-3: a subtask's line follows its parent's day as chosen — gone when it says that day, else its 마감", () => {
  const CODEX = ['[2026-11-09]', '- [ ] 부모', '  - 날짜: 2026-11-12', '  - [ ] 자식', '    - 날짜: 2026-11-12'].join('\n');
  const { data, docId } = writing(CODEX);
  const plan = programTextCleanupPlan(space(data))!, parent = plan.dates[0].items.find(row => row.title === '부모')!;
  const asDue = (choices: Record<string, 'move' | 'due'>) => ({ ...choices, [parent.ownerId]: 'due' as const });
  // 부모 → 마감: 부모 reads 11/9 (its section); 자식's 11/12 is not that day, so it becomes 자식's 마감 (not lost).
  assert.deepEqual([...programDateLineOutcomes(space(data).text, plan.dates[0], asDue(programDateLineDefaults(plan.dates)))], [[parent.ownerId, 'due'], [id(data, '자식'), 'due']]);
  const due = cleanup(data, asDue);
  assert.equal(raw(due, docId), ['[2026-11-09]', '- [ ] 부모', '  - 마감: 2026-11-12', '  - [ ] 자식', '    - 마감: 2026-11-12'].join('\n'));
  assert.deepEqual([item(due, '자식').date, item(due, '자식').due, item(due, '자식').explicitDate], ['2026-11-09', '2026-11-12', false]);
  // 부모 → 옮기기 (the default): 자식 goes with it and says that day: its line only goes.
  const moved = cleanup(data);
  assert(raw(moved, docId).endsWith(['[2026-11-12]', '- [ ] 부모', '  - [ ] 자식'].join('\n')), raw(moved, docId));
  assert.deepEqual([item(moved, '자식').date, item(moved, '자식').due ?? null], ['2026-11-12', null]);
  // The other way round: 자식 says the section's day. 부모 → 마감 keeps 부모 there, so 자식's line only goes (no 마감 made);
  // 부모 → 옮기기 takes 자식 to 11/12 and its 11/9 becomes its 마감.
  const other = writing(['[2026-11-09]', '- [ ] 부모', '  - 날짜: 2026-11-12', '  - [ ] 자식', '    - 날짜: 2026-11-09'].join('\n'), '반대 기록');
  const otherParent = programTextCleanupPlan(space(other.data))!.dates[0].items.find(row => row.title === '부모')!.ownerId;
  const otherDue = cleanup(other.data, choices => ({ ...choices, [otherParent]: 'due' }));
  assert.equal(raw(otherDue, other.docId), ['[2026-11-09]', '- [ ] 부모', '  - 마감: 2026-11-12', '  - [ ] 자식'].join('\n'));
  const otherMoved = cleanup(other.data);
  assert(raw(otherMoved, other.docId).endsWith(['[2026-11-12]', '- [ ] 부모', '  - [ ] 자식', '    - 마감: 2026-11-09'].join('\n')), raw(otherMoved, other.docId));
  // 되돌리기 brings each back.
  assert.equal(raw(undo(data, due), docId), CODEX);
});

test('left alone: a copy or run document, a reference line, a repeat line, an unreadable value; a changed account refuses the old list', () => {
  const { data, docId } = writing(['[2026-11-09]', '- [ ] 매일 물 마시기 @매일', '  - 날짜: 2026-11-12', '- [ ] 언젠가 할 일', '  - 날짜: 다음 달',
    '- [ ] 보통 할 일', '  - 날짜: 2026-11-13'].join('\n'));
  const plan = programDateLinePlan(space(data), docId)!;
  assert.deepEqual(plan.items.map(row => row.title), ['보통 할 일'], 'the repeat line and the unreadable value are not offered');
  const asCopy = { ...space(data), copies: [{ documentId: docId, itemLines: {}, subcheckLines: {} } as never] };
  assert.equal(programDateLinePlan(asCopy, docId), null, "a copy's document waits for step 5");
  const asRun = { ...space(data), personalAuthoring: { series: [], executions: [{ executionDocumentId: docId }] } as never };
  assert.equal(programDateLinePlan(asRun, docId), null, "a Flow run's document waits for step 5");
  // Changed since the list showed: the save refuses (nothing applied).
  const shown = programTextCleanupPlan(space(data))!, changed = programClone(data);
  space(changed).text = M.editText(space(changed).text, docId, raw(data, docId) + '\n- [ ] 새 일\n  - 날짜: 2026-11-20');
  const refused = applyProgramTextCleanup(changed, { ...base(changed), plan: shown, choices: programDateLineDefaults(shown.dates), when: '2026-11-12 16:20' });
  assert(!refused.ok && refused.reason === 'conflict');
});

test("되돌리기 later (총괄 11/12 ①): from the archived original alone, after edits; what was written since goes to '되돌리기 전 원문', a check made since stays", () => {
  const { data, docId } = writing(MOCKUP);
  const after = cleanup(data);
  // Later, another visit (nothing in memory): 보고서 초안 is checked, 분기 보고 제출 reaches 100% today, a line is added.
  let later = programClone(after);
  space(later).text = M.updateTask(space(later).text, id(later, '보고서 초안'), { done: true });
  space(later).text = M.recordProgress(space(later).text, id(later, '분기 보고 제출'), '2026-11-12', 100);
  space(later).text = M.editTextResult(space(later).text, docId, `${raw(later, docId)}\n- [ ] 그 뒤 쓴 일`, { folderText: true }).state;
  const written = raw(later, docId);
  // A plain rewrite of the original would not know which line is which: the model refuses it.
  assert.notEqual(M.editTextResult(space(later).text, docId, MOCKUP, { folderText: true }).reason, null);
  const back = ok(restoreProgramTextCleanup(later, { ...base(later), stamp: stampOf(later), when: '2026-11-13 09:00' })).data;
  assert.equal(raw(back, docId), MOCKUP.replace('- [ ] 보고서 초안', '- [x] 보고서 초안').replace('- [ ] 분기 보고 제출', '- [x] 분기 보고 제출'), 'the original, with the checks made since');
  assert.deepEqual(lines(back, docId).map(([lineId]) => lineId), lines(data, docId).map(([lineId]) => lineId), 'every line its own identity again');
  assert.deepEqual(space(back).text.progressRecords, space(later).text.progressRecords, 'no record lost or added');
  const kept = M.getDocument(space(back).text, space(back).archivedDocumentIds.at(-1)!)!;
  assert.equal(kept.title, '되돌리기 전 원문 · 2026-11-13 09:00');
  assert.deepEqual(programCleanupArchive(space(back).text, programCleanupArchiveStamp(space(back).text, kept.id)!).map(block => block.raw), [written], 'what was written since is kept');
  // That one restores in turn (a redo), and the first again: each a save of its own.
  const redo = ok(restoreProgramTextCleanup(back, { ...base(back), stamp: programCleanupArchiveStamp(space(back).text, kept.id)!, when: '2026-11-13 09:05' })).data;
  assert.equal(raw(redo, docId), written);
  // An archive whose original is gone (deleted) says so; nothing changes.
  const gone = programClone(after);
  for (const doc of space(gone).text.documents) if (doc.title.startsWith('전환 전 원문')) doc.lines = doc.lines.slice(0, 2);
  const missing = restoreProgramTextCleanup(gone, { ...base(gone), stamp: stampOf(after), when: '2026-11-13 09:00' });
  assert(!missing.ok && missing.reason === 'missing');
});

test('an account with Flow runs (personal authoring) and a document past an archive document\'s size: split, kept, restored whole', () => {
  const many = Array.from({ length: 590 }, (_, index) => [`- [ ] 일 ${index}`, `  - 날짜: 2026-11-${String(10 + index % 9).padStart(2, '0')}`]).flat();
  const { data, docId } = writing(['[2026-11-10]', ...many].join('\n'), '긴 글');
  // A personal Flow and its run (개인 실행), made by the commands themselves.
  const source = writing('[2026-11-10]\n- [ ] 반복 할 일\n  - [ ] 준비물 챙기기', '반복 원문', data);
  const created = ok(createPersonalFlow(source.data, { title: '내 구성', documentId: source.docId, taskIds: [id(source.data, '반복 할 일')] }));
  const versionId = space(created.data).personalAuthoring!.flows[0].currentVersionId;
  const withRuns = ok(startPersonalFlow(created.data, { flowId: created.result, versionId, anchorDate: '2026-11-10' })).data;
  const runDoc = space(withRuns).personalAuthoring!.executions![0].executionDocumentId;
  const after = cleanup(withRuns);
  const archives = space(after).archivedDocumentIds.map(id => M.getDocument(space(after).text, id)!).filter(doc => doc.title.startsWith('전환 전 원문'));
  assert(archives.length >= 2, `split over ${archives.length} documents`);
  assert(archives.every(doc => doc.lines.length <= 1200 && M.raw(doc).length <= 100_000));
  assert.equal(raw(after, runDoc), raw(withRuns, runDoc), "a Flow run's document is not converted");
  assert.deepEqual(space(after).personalAuthoring, space(withRuns).personalAuthoring, 'the personal Flow and its run as they were');
  const back = undo(withRuns, after);
  assert.equal(raw(back, docId), raw(withRuns, docId));
  assert.deepEqual(lines(back, docId).map(([lineId]) => lineId), lines(withRuns, docId).map(([lineId]) => lineId));
});

/** A synthetic account of the production shape (USAGE 11/12: 96 date heads, 121 date lines, 294 subtasks, 154 records,
 *  84 links, 179 folder lines across 376 documents; many documents without headings — here 12 dated documents and 2
 *  without headings). Deterministic. */
function productionShape() {
  let seed = 20261112;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const day = (offset: number) => new Date(Date.UTC(2026, 9, 1 + offset)).toISOString().slice(0, 10);
  let data = createProgramData();
  const docs: string[] = [];
  let heads = 0, dateLines = 0, offset = 0;
  for (let doc = 0; doc < 12; doc++) {
    const out: string[] = [];
    for (let section = 0; section < 8; section++) {
      const date = day(offset += 1 + Math.floor(random() * 2)); heads++;
      out.push(`[${date}]`);
      const foldered = random() < 0.4, pad = foldered ? '  ' : '';
      if (foldered) out.push(`- /폴더 ${doc % 4}`);
      for (let task = 0; task < 2 + Math.floor(random() * 2); task++) {
        const mark = random() < 0.25 ? 'x' : random() < 0.2 ? `${10 + Math.floor(random() * 80)}%` : ' ';
        out.push(`${pad}- [${mark}] 일 ${doc}-${section}-${task}`);
        if (dateLines < 105 && random() < 0.55) {
          const roll = random(), value = roll < 0.55 ? date : roll < 0.92 ? day(offset + 1 + Math.floor(random() * 20)) : '미정';
          out.push(`${pad}  - 날짜: ${value}`); dateLines++;
        }
        if (random() < 0.2) out.push(`${pad}  - 메모: 메모 ${doc}-${section}-${task}`);
        if (random() < 0.15) out.push(`${pad}  - 시간: 0${Math.floor(random() * 9)}:30`);
        for (let child = 0; child < (random() < 0.45 ? 1 + Math.floor(random() * 3) : 0); child++) {
          out.push(`${pad}  - [${random() < 0.3 ? 'x' : ' '}] 하위 ${doc}-${section}-${task}-${child}`);
          if (dateLines < 105 && random() < 0.08) { out.push(`${pad}    - 날짜: ${random() < 0.5 ? date : day(offset + 3)}`); dateLines++; }
        }
      }
      out.push('');
    }
    const made = writing(out.join('\n').trimEnd(), `기록 ${doc}`, data);
    data = made.data; docs.push(made.docId);
  }
  // Two lists without date headings: eight dated tasks each (a 미정 among them).
  for (const list of [0, 1]) {
    const out = Array.from({ length: 8 }, (_, index) => [`- [ ] 목록 ${list}-${index}`, `  - 날짜: ${index === 7 ? '미정' : day(offset + index)}`]).flat();
    const made = writing(out.join('\n'), `목록 ${list}`, data); data = made.data; docs.push(made.docId); dateLines += 8;
  }
  // The rest of the 121 date lines, under tasks of the last sections (other days).
  for (let index = 0; dateLines < 121; index = (index + 1) % 12) {
    const docId = docs[index], current = raw(data, docId);
    space(data).text = M.editTextResult(space(data).text, docId, `${current}\n- [ ] 덧붙인 일 ${dateLines}\n  - 날짜: ${day(offset + 5)}`, { folderText: true }).state;
    dateLines++;
  }
  // Records (latest agreeing with each box) and links from a document of references.
  const items = space(data).text.documents.flatMap(doc => M.parseDocument(doc, space(data).text).items.map(row => ({ ...row, docId: doc.id })));
  const records = items.filter(row => !row.inputPercent).slice(0, 77).flatMap(row => [
    { taskId: row.id, date: '2026-09-20', percent: row.done ? 40 : 10 }, { taskId: row.id, date: '2026-09-21', percent: row.done ? 100 : 30 }]);
  space(data).text = { ...space(data).text, progressRecords: records };
  const refs = writing('[2026-09-01]\n- 참조 모음', '참조', data); data = refs.data;
  for (const row of items.filter(row => row.isCanonical).slice(0, 40)) {
    const doc = M.getDocument(space(data).text, refs.docId)!;
    space(data).text = M.linkTask(space(data).text, refs.docId, doc.lines.length, row.id);
  }
  assert(M.validate(space(data).text));
  const all = space(data).text.documents.flatMap(doc => doc.lines);
  return { data, docs, refs: refs.docId, heads: all.filter(line => /^\[\d{4}-\d{2}-\d{2}\]$/.test(line.text)).length - 1, dateLines: all.filter(line => DATE_LINE.test(line.text)).length };
}

test('production shape (96 date heads, 121 date lines, lists without headings, subtasks, records, links): one list, one save, one 되돌리기', t => {
  const shape = productionShape();
  assert.equal(shape.heads, 96); assert.equal(shape.dateLines, 121);
  const subtasks = space(shape.data).text.documents.flatMap(doc => M.parseDocument(doc, space(shape.data).text).items).filter(row => !row.isCanonical).length;
  assert(subtasks > 100, `subtasks ${subtasks}`);
  assert(space(shape.data).text.bindings.filter(binding => binding.kind === 'task').length >= 40);
  const timing: string[] = [];
  for (const variant of ['defaults', 'due'] as const) {
    const data = shape.data, before = space(data).text;
    let clock = performance.now();
    const plan = programTextCleanupPlan(space(data))!;
    timing.push(`${variant} plan ${Math.round(performance.now() - clock)}ms`);
    assert.equal(plan.dateLines, 121, `${variant}: every date line is in the list`);
    assert(plan.dates.filter(doc => doc.headless).length === 2 && plan.dates.filter(doc => doc.headless).every(doc => doc.items.every(item => item.kind === 'same' || item.choices.join() === 'due')));
    assert(plan.progressLines > 0, 'the box lines with a 30% record are in the list too');
    const choices = variant === 'defaults' ? programDateLineDefaults(plan.dates)
      : Object.fromEntries(plan.dates.flatMap(doc => doc.items).filter(row => row.kind === 'other').map(row => [row.ownerId, row.choices.at(-1)!]));
    clock = performance.now();
    const after = ok(applyProgramTextCleanup(data, { ...base(data), plan, choices, when: '2026-11-12 16:20' })).data;
    timing.push(`${variant} apply ${Math.round(performance.now() - clock)}ms`);
    const now = space(after).text;
    assert.equal(after.receipts.length, data.receipts.length + 1, 'one save');
    assert(programTextCleanupDocuments(plan).length >= 3, 'several documents change in the one save');
    assert.deepEqual(space(after).draftRevisions, space(data).draftRevisions, 'only the writing changes');
    assert.deepEqual(now.progressRecords, before.progressRecords, 'records');
    assert.deepEqual(now.taskScopes, before.taskScopes, 'task owners');
    const ids = new Set(now.documents.flatMap(doc => doc.lines.map(line => line.id)));
    for (const binding of before.bindings) assert(now.bindings.some(entry => JSON.stringify(entry) === JSON.stringify(binding)) || binding.kind === 'scope' && !ids.has(binding.lineId), 'links');
    for (const ref of M.rowMeta(now, shape.refs).filter(row => row.isReference)) assert(M.tasks(now).some(task => task.id === ref.progressTargetId), 'a reference still finds its task');
    assert.equal(own(after, data).documents.flatMap(doc => doc.lines).filter(line => DATE_LINE.test(line.text)).length, 0, `${variant}: none left`);
    for (const docId of shape.docs.slice(12)) assert.equal(M.rowMeta(now, docId).filter(row => row.kind === 'date').length, 0, 'no heading made in a list');
    const back = undo(data, after);
    assert.deepEqual(own(back, data), sorted(before), `${variant}: back to every byte`);
  }
  t.diagnostic(timing.join(', '));
});

function converted() {
  const { data, docId } = writing(['[2026-11-09]', '- /회사', '  - [ ] 보고서', '    - [ ] 표', '  - [ ] 회의', '- [ ] 장보기', '', '[2026-11-10]', '- [ ] 운동',
    '  - 날짜: 2026-11-10'].join('\n'));
  return { data: cleanup(data), docId };
}
const noDateLine = (data: ProgramData | TextWorkspaceState, label: string) => {
  const text = 'spaces' in data ? space(data).text : data;
  // An archived original ('전환 전 원문') keeps the lines as they were, inside its fence.
  assert.deepEqual(text.documents.filter(doc => !doc.title.startsWith('전환 전 원문')).flatMap(doc => doc.lines).filter(line => DATE_LINE.test(line.text)).map(line => line.text), [], label);
};

test("after the conversion no command writes a '- 날짜:' line in an ordinary document: each moves the line to its day", () => {
  const { data, docId } = converted();
  noDateLine(data, 'converted');
  // The row detail's date (and 오늘 목록's 미루기, the server's schedule): the task moves under the day's heading.
  const patched = ok(updateProgramTask(data, { ...base(data), taskId: id(data, '장보기'), patch: { date: '2026-11-12', time: '18:00' } })).data;
  noDateLine(patched, 'row date'); assert.deepEqual([item(patched, '장보기').date, item(patched, '장보기').time], ['2026-11-12', '18:00']);
  assert(raw(patched, docId).endsWith('[2026-11-12]\n- [ ] 장보기\n  - 시간: 18:00'), raw(patched, docId));
  // A time alone does not move the line.
  const timed = ok(updateProgramTask(data, { ...base(data), taskId: id(data, '장보기'), patch: { date: '2026-11-09', time: '07:00' } })).data;
  assert.equal(raw(timed, docId).split('\n').indexOf('- [ ] 장보기'), raw(data, docId).split('\n').indexOf('- [ ] 장보기'), 'stays in place');
  // 날짜 한꺼번에 바꾸기: 회사's line goes with its last task.
  const listed = ok(moveProgramTaskDates(data, { actorId: actor(data), requestId: 'dl-list', moves: ['보고서', '회의'].map(title =>
    ({ taskId: id(data, title), expected: { date: '2026-11-09', time: '' }, date: '2026-11-14' })) })).data;
  noDateLine(listed, 'list'); assert.deepEqual(['보고서', '표', '회의'].map(title => item(listed, title).date), ['2026-11-14', '2026-11-14', '2026-11-14']);
  assert(raw(listed, docId).startsWith('[2026-11-09]\n- [ ] 장보기'), raw(listed, docId));
  // 밀린 일 '오늘로': a past task moves under today's heading; a day it empties goes.
  const plan = planProgramCarryover(space(data), '2026-11-12');
  const carried = ok(carryProgramTasksToToday(data, { ...base(data), today: '2026-11-12', lines: plan.lines })).data;
  noDateLine(carried, 'carryover'); assert.equal(item(carried, '운동').date, '2026-11-12');
  // Typing: a line cut from one day and pasted under another takes that day (no pin).
  const typed = M.editTextResult(space(data).text, docId, raw(data, docId).replace('- [ ] 장보기\n', '') + '\n- [ ] 장보기', { folderText: true });
  assert.equal(typed.reason, null); noDateLine(typed.state, 'typed');
  assert.equal(M.tasks(typed.state).find(task => task.title === '장보기')!.date, '2026-11-10');
  // The in-document move dialog across days.
  const target = M.moveTargets(space(data).text, docId, id(data, '장보기')).find(row => row.label.includes('운동'));
  assert(target, 'a place in the other day');
  const dialog = M.moveSubtree(space(data).text, docId, id(data, '장보기'), target.beforeLineId, target.depth);
  assert.notEqual(dialog, space(data).text, 'the move dialog moves across days now'); noDateLine(dialog, 'move dialog');
  assert.equal(M.tasks(dialog).find(task => task.title === '장보기')!.date, '2026-11-10');
  // To another document: under its own day's heading there; to a list without headings, its day becomes its 마감.
  const dated = writing('[2026-11-01]\n- [ ] 다른 날 일', '다른 글', data);
  const toDoc = ok(moveProgramTaskDocument(dated.data, { ...base(dated.data), taskId: id(dated.data, '장보기'), destinationId: dated.docId })).data;
  noDateLine(toDoc, 'to another document'); assert.equal(raw(toDoc, dated.docId), '[2026-11-01]\n- [ ] 다른 날 일\n\n[2026-11-09]\n- [ ] 장보기');
  assert.equal(item(toDoc, '장보기').date, '2026-11-09');
  const list = writing('메모만 있는 글', '목록 글', data);
  const toList = ok(moveProgramTaskDocument(list.data, { ...base(list.data), taskId: id(list.data, '장보기'), destinationId: list.docId })).data;
  noDateLine(toList, 'to a list'); assert.equal(raw(toList, list.docId), '메모만 있는 글\n\n- [ ] 장보기\n  - 마감: 2026-11-09');
  // A folder copy keeps its days by its heading.
  const folderLine = M.rowMeta(space(data).text, docId).find(row => row.kind === 'scope')!.id;
  const copied = copyProgramFolderOccurrence(space(data).text, readProgramFolderCopyPreview(space(data).text, docId, folderLine)!, '회사 사본');
  assert(copied.ok); noDateLine(copied.workspace, 'folder copy');
  assert(raw(copied.workspace, copied.documentId).startsWith('[2026-11-09]\n- /회사 사본'), raw(copied.workspace, copied.documentId));
  // A subtask added under a task.
  const child = prepareWritingChild(space(data).text, { docId, parentId: id(data, '회의'), kind: 'task', text: '안건 정리', expectedRaw: raw(data, docId) });
  assert(child.ok); noDateLine(child.workspace, 'child');
});

test('the list: asked once when the app opens (not on a tab change), one save with history; the per-document sheets are gone', () => {
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  assert.match(host, /const programTextCleanupAsked = new Set<string>\(\);/);
  assert.match(host, /if \(programTextCleanupAsked\.has\(actorId\)\) return;/);
  assert.match(host, /\}, \[actorId\]\);/);
  assert.match(host, /<h2 id="program-cleanup-title">글을 새 규칙으로 한 번 정리합니다<\/h2>/);
  assert.match(host, /run\('글 정리', current => \{ const next = applyProgramTextCleanup\(current, \{ \.\.\.base\(current\), plan: ask\.plan, choices: ask\.choices, when: programCleanupWhen\(new Date\(\)\) \}\);/);
  assert.match(host, /run\('글 정리 되돌리기', current => restoreProgramTextCleanup\(current, \{ \.\.\.base\(current\), stamp, when: programCleanupWhen\(new Date\(\)\) \}\), true\)/);
  // 총괄 11/12 ①: the words, and 되돌리기 from the archived original itself.
  assert(host.includes("보관함의 '전환 전 원문'에서 언제든 되돌릴 수 있습니다."));
  assert(!host.includes('바꾸기 전 글은 그대로 남아'));
  assert.match(host, /data-cleanup-restore disabled=\{cleanupPending \|\| preparingDocumentAction\}[^>]*onClick=\{\(\) => void restoreCleanup\(stamp\)\}>이 원문으로 되돌리기<\/button>/);
  assert.match(host, /actions: cleanupNotice\.undone \|\| cleanupNotice\.refused \? \[\] : \[\{ label: '되돌리기', run: \(\) => void restoreCleanup\(cleanupNotice\.stamp\) \}\]/);
  assert(!host.includes('data-progress-text-sheet') && !host.includes('data-date-lines-sheet'), 'no per-document sheet');
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /const done = applyDateChip\(candidate\.lineId, candidate\.date\), after = controller\.getState\(\);/, 'a date said in words takes the ⋮ date path (마감 in a list)');
  const model = readFileSync(new URL('./vendor/text-model.cjs', import.meta.url), 'utf8');
  assert.doesNotMatch(model, /pinStructuralDates/);
});
