import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument, updateProgramTask } from './private-space';
import { applyProgramDateLineChoices, applyProgramDateLines, programDateLineDefaults, programDateLinePlan } from './date-property-migration';
import { undoProgramTaskLocation } from './task-location-command';
import { moveProgramTaskDates } from './task-date-move';
import { carryProgramTasksToToday, planProgramCarryover } from './carryover';
import { moveProgramTaskDocument } from './task-document-move';
import { copyProgramFolderOccurrence, readProgramFolderCopyPreview } from './folder-copy';
import { prepareWritingChild } from './writing-child-command';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// Redesign 3 (DECISION-1, 총괄 11/12, mockup ③): a document's '- 날짜:' lines go once, on the person's word; after that
// nothing writes one again in an ordinary document. A copy's, a Flow run's, a reference's and a repeat's stay (step 5).
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `dl-${++request}`, expectedSpace: space(data) });
const DATE_LINE = /^ *-\s+날짜:/;
const raw = (data: ProgramData | TextWorkspaceState, docId: string) => M.raw(M.getDocument('spaces' in data ? space(data).text : data, docId)!);
const lines = (data: ProgramData, docId: string) => M.getDocument(space(data).text, docId)!.lines.map(line => [line.id, line.text]);

function writing(text: string, title = '하루 기록', data = createProgramData()) {
  const created = ok(createProgramDocument(data, { ...base(data), title }));
  const next = programClone(created.data);
  space(next).text = M.editTextResult(space(next).text, created.result, text, { folderText: true }).state;
  assert.equal(raw(next, created.result), text, 'seeded as written');
  return { data: next, docId: created.result };
}
const id = (data: ProgramData, title: string) => M.parseDocument(space(data).text.documents.find(doc => M.parseDocument(doc, space(data).text).items.some(item => item.title === title))!, space(data).text).items.find(item => item.title === title)!.id;
const item = (data: ProgramData, title: string) => space(data).text.documents.flatMap(doc => M.parseDocument(doc, space(data).text).items).find(row => row.title === title)!;

const MOCKUP = ['[2026-11-09]', '- [ ] 보고서 초안', '  - 날짜: 2026-11-09', '- [ ] 치과 예약 전화', '  - 날짜: 2026-11-12', '',
  '[2026-11-10]', '- [x] 영수증 정리', '  - 날짜: 2026-11-10', '- [ ] 분기 보고 제출', '  - 날짜: 2026-11-27'].join('\n');

test("mockup ③: same days are only deleted, other days move by default; the text is the mockup's, 되돌리기 gives every byte back", () => {
  const { data, docId } = writing(MOCKUP);
  const plan = programDateLinePlan(space(data), docId)!;
  assert.equal(plan.lines, 4);
  assert.deepEqual(plan.items.map(row => [row.title, row.kind, row.value, row.section, row.choices.join('|')]), [
    ['보고서 초안', 'same', '2026-11-09', '2026-11-09', ''], ['치과 예약 전화', 'other', '2026-11-12', '2026-11-09', 'move|due'],
    ['영수증 정리', 'same', '2026-11-10', '2026-11-10', ''], ['분기 보고 제출', 'other', '2026-11-27', '2026-11-10', 'move|due']]);
  assert.deepEqual(Object.values(programDateLineDefaults(plan)), ['move', 'move'], 'the default is 그날로 옮기기 (mockup ③ choice)');
  const moved = ok(applyProgramDateLines(data, { ...base(data), plan, choices: programDateLineDefaults(plan) })).data;
  assert.equal(raw(moved, docId), ['[2026-11-09]', '- [ ] 보고서 초안', '', '[2026-11-10]', '- [x] 영수증 정리', '', '[2026-11-12]', '- [ ] 치과 예약 전화',
    '', '[2026-11-27]', '- [ ] 분기 보고 제출'].join('\n'));
  assert.deepEqual(['보고서 초안', '치과 예약 전화', '영수증 정리', '분기 보고 제출'].map(title => [item(moved, title).date, item(moved, title).explicitDate]),
    [['2026-11-09', false], ['2026-11-12', false], ['2026-11-10', false], ['2026-11-27', false]], 'each task reads the day its line said');
  assert.equal(item(moved, '영수증 정리').done, true);
  // 되돌리기: the writing exactly as before, ids and bytes.
  const back = ok(undoProgramTaskLocation(moved, { actorId: actor(moved), documentId: docId, before: space(data).text, after: space(moved).text })).data;
  assert.equal(raw(back, docId), MOCKUP);
  assert.deepEqual(lines(back, docId), lines(data, docId));
  assert.equal(programDateLinePlan(space(moved), docId), null, 'nothing left to ask');
});

test("마감으로 바꾸기: the line stays where it is, '- 날짜:' becomes '- 마감:' (its id kept), the task reads its section's day", () => {
  const { data, docId } = writing(MOCKUP);
  const plan = programDateLinePlan(space(data), docId)!, dental = plan.items[1];
  const choices = { ...programDateLineDefaults(plan), [dental.ownerId]: 'due' as const };
  const after = ok(applyProgramDateLines(data, { ...base(data), plan, choices })).data;
  assert.equal(raw(after, docId), ['[2026-11-09]', '- [ ] 보고서 초안', '- [ ] 치과 예약 전화', '  - 마감: 2026-11-12', '', '[2026-11-10]', '- [x] 영수증 정리',
    '', '[2026-11-27]', '- [ ] 분기 보고 제출'].join('\n'));
  assert.equal(M.getDocument(space(after).text, docId)!.lines.find(line => line.text === '  - 마감: 2026-11-12')!.id, dental.lineIds[0], 'the same line, its words changed');
  assert.deepEqual([item(after, '치과 예약 전화').date, item(after, '치과 예약 전화').due], ['2026-11-09', '2026-11-12']);
  const back = ok(undoProgramTaskLocation(after, { actorId: actor(after), documentId: docId, before: space(data).text, after: space(after).text })).data;
  assert.deepEqual(lines(back, docId), lines(data, docId));
  // A choice the line does not offer is refused (nothing applied).
  assert.equal(applyProgramDateLineChoices(space(data).text, plan, { ...choices, [plan.items[0].ownerId]: 'due' }) === null, false, "a 'same' line takes no choice");
  assert.equal(applyProgramDateLineChoices(space(data).text, plan, { ...choices, [dental.ownerId]: 'move', [plan.items[3].ownerId]: 'nothing' as never }), null);
});

test('subtasks, memos, times, progress records and links go with the task and stay exactly as they were', () => {
  const text = ['[2026-11-09]', '- /회사', '  - [40%] 발표 자료 만들기', '    - 날짜: 2026-11-12', '    - 메모: 표는 3장', '    - 시간: 09:30',
    '    - [ ] 표 그리기', '    - [x] 자료 모으기', '      - 날짜: 2026-11-12', '  - [ ] 회의록 정리', '    - 날짜: 2026-11-09', '- [ ] 장보기', '  - [ ] 우유', '    - 날짜: 2026-11-11'].join('\n');
  let { data, docId } = writing(text);
  const task = id(data, '발표 자료 만들기'), draw = id(data, '표 그리기');
  space(data).text = { ...space(data).text, progressRecords: [{ taskId: task, date: '2026-11-08', percent: 20 }, { taskId: task, date: '2026-11-09', percent: 40 },
    { taskId: draw, date: '2026-11-09', percent: 50 }] };
  // A reference to the task from another document (a binding), and a second document of its own.
  const other = writing('[2026-11-09]\n- [ ] 다른 글 할 일', '다른 글', data);
  data = other.data;
  space(data).text = M.linkTask(space(data).text, other.docId, 2, task);
  assert(space(data).text.bindings.some(binding => binding.kind === 'task' && binding.taskId === task), 'linked');
  assert(M.validate(space(data).text));
  const plan = programDateLinePlan(space(data), docId)!;
  assert.deepEqual(plan.items.map(row => [row.title, row.kind, row.subtask, row.choices.join('|')]), [
    ['발표 자료 만들기', 'other', false, 'move|due'], ['자료 모으기', 'same', true, ''], ['회의록 정리', 'same', false, ''], ['우유', 'other', true, 'due']]);
  const before = programClone(space(data).text);
  const after = ok(applyProgramDateLines(data, { ...base(data), plan, choices: programDateLineDefaults(plan) })).data;
  assert.equal(raw(after, docId), ['[2026-11-09]', '- /회사', '  - [ ] 회의록 정리', '- [ ] 장보기', '  - [ ] 우유', '    - 마감: 2026-11-11', '',
    '[2026-11-12]', '- /회사', '  - [40%] 발표 자료 만들기', '    - 메모: 표는 3장', '    - 시간: 09:30', '    - [ ] 표 그리기', '    - [x] 자료 모으기'].join('\n'));
  const moved = item(after, '발표 자료 만들기');
  assert.deepEqual([moved.date, moved.note, moved.time, moved.explicitDate], ['2026-11-12', '표는 3장', '09:30', false]);
  assert.deepEqual(['표 그리기', '자료 모으기'].map(title => [item(after, title).parentItemId, item(after, title).date]), [[task, '2026-11-12'], [task, '2026-11-12']]);
  assert.deepEqual([item(after, '우유').date, item(after, '우유').due], ['2026-11-09', '2026-11-11'], 'a subtask takes 마감 and stays under its parent');
  assert.deepEqual(space(after).text.progressRecords, before.progressRecords, 'records untouched');
  assert.equal(M.currentProgress(space(after).text, task), 40);
  assert.deepEqual(space(after).text.taskScopes, before.taskScopes);
  for (const binding of before.bindings) assert(space(after).text.bindings.some(now => JSON.stringify(now) === JSON.stringify(binding)), 'every link is kept');
  // The reference still reads the moved task (its date follows the task).
  const reference = M.rowMeta(space(after).text, other.docId).find(row => row.isReference)!;
  assert.equal(reference.progressTargetId, task);
  assert.equal(M.tasks(space(after).text).find(row => row.id === task)!.date, '2026-11-12');
  assert.deepEqual(lines(after, other.docId), lines(data, other.docId), 'the other document is untouched');
  const back = ok(undoProgramTaskLocation(after, { actorId: actor(after), documentId: docId, before: space(data).text, after: space(after).text })).data;
  assert.equal(raw(back, docId), text);
  assert.deepEqual(lines(back, docId), lines(data, docId));
  assert.deepEqual(space(back).text, space(data).text, 'the whole writing as before');
});

test('left alone: a copy or run document, a reference line, a repeat line, an unreadable value; a changed document refuses the old plan', () => {
  const { data, docId } = writing(['[2026-11-09]', '- [ ] 매일 물 마시기 @매일', '  - 날짜: 2026-11-12', '- [ ] 언젠가 할 일', '  - 날짜: 다음 달',
    '- [ ] 보통 할 일', '  - 날짜: 2026-11-13'].join('\n'));
  const plan = programDateLinePlan(space(data), docId)!;
  assert.deepEqual(plan.items.map(row => row.title), ['보통 할 일'], 'the repeat line and the unreadable value are not offered');
  const asCopy = { ...space(data), copies: [{ documentId: docId, itemLines: {}, subcheckLines: {} } as never] };
  assert.equal(programDateLinePlan(asCopy, docId), null, "a copy's document waits for step 5");
  const asRun = { ...space(data), personalAuthoring: { series: [], executions: [{ executionDocumentId: docId }] } as never };
  assert.equal(programDateLinePlan(asRun, docId), null, "a Flow run's document waits for step 5");
  // Changed since the sheet showed: the save refuses (nothing applied).
  const changed = programClone(data);
  space(changed).text = M.editText(space(changed).text, docId, raw(data, docId) + '\n- [ ] 새 일\n  - 날짜: 2026-11-20');
  const refused = applyProgramDateLines(changed, { ...base(changed), plan, choices: programDateLineDefaults(plan) });
  assert(!refused.ok && refused.reason === 'conflict');
});

/** A synthetic account of the production shape (USAGE 11/12: 96 date heads, 121 date lines, 294 subtasks, 154 records,
 *  84 links, 179 folder lines across 376 documents — here the dated part: 12 documents). Deterministic. */
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
        if (dateLines < 121 && random() < 0.55) {
          const roll = random(), value = roll < 0.55 ? date : roll < 0.92 ? day(offset + 1 + Math.floor(random() * 20)) : '미정';
          out.push(`${pad}  - 날짜: ${value}`); dateLines++;
        }
        if (random() < 0.2) out.push(`${pad}  - 메모: 메모 ${doc}-${section}-${task}`);
        if (random() < 0.15) out.push(`${pad}  - 시간: 0${Math.floor(random() * 9)}:30`);
        for (let child = 0; child < (random() < 0.45 ? 1 + Math.floor(random() * 3) : 0); child++) {
          out.push(`${pad}  - [${random() < 0.3 ? 'x' : ' '}] 하위 ${doc}-${section}-${task}-${child}`);
          if (dateLines < 121 && random() < 0.08) { out.push(`${pad}    - 날짜: ${random() < 0.5 ? date : day(offset + 3)}`); dateLines++; }
        }
      }
      out.push('');
    }
    const made = writing(out.join('\n').trimEnd(), `기록 ${doc}`, data);
    data = made.data; docs.push(made.docId);
  }
  // The rest of the 121 date lines, under tasks of the last sections (other days).
  for (let index = 0; dateLines < 121; index = (index + 1) % docs.length) {
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

test('production shape (96 date heads, 121 date lines, subtasks, records, links): every choice keeps the rest, 되돌리기 gives every byte back', t => {
  const shape = productionShape();
  assert.equal(shape.heads, 96); assert.equal(shape.dateLines, 121);
  const subtasks = space(shape.data).text.documents.flatMap(doc => M.parseDocument(doc, space(shape.data).text).items).filter(row => !row.isCanonical).length;
  assert(subtasks > 100, `subtasks ${subtasks}`);
  assert(space(shape.data).text.bindings.filter(binding => binding.kind === 'task').length >= 40);
  const started = Date.now(), planMs: number[] = [], applyMs: number[] = [];
  for (const variant of ['defaults', 'due'] as const) {
    let data = shape.data, offered = 0;
    for (const docId of shape.docs) {
      let clock = performance.now();
      const plan = programDateLinePlan(space(data), docId);
      planMs.push(performance.now() - clock);
      if (!plan) continue;
      offered += plan.lines;
      const choices = variant === 'defaults' ? programDateLineDefaults(plan)
        : Object.fromEntries(plan.items.filter(row => row.kind === 'other').map(row => [row.ownerId, row.choices.at(-1)!]));
      clock = performance.now();
      const before = space(data).text, after = ok(applyProgramDateLines(data, { ...base(data), plan, choices })).data;
      applyMs.push(performance.now() - clock);
      const now = space(after).text;
      assert.deepEqual(now.progressRecords, before.progressRecords, `${docId} records`);
      assert.deepEqual(now.taskScopes, before.taskScopes, `${docId} task owners`);
      for (const binding of before.bindings) assert(now.bindings.some(entry => JSON.stringify(entry) === JSON.stringify(binding)), `${docId} links`);
      for (const ref of M.rowMeta(now, shape.refs).filter(row => row.isReference)) assert(M.tasks(now).some(task => task.id === ref.progressTargetId), 'a reference still finds its task');
      const left = M.getDocument(now, docId)!.lines.filter(line => DATE_LINE.test(line.text));
      assert.equal(left.length, 0, `${docId}: no date line left (${left.map(line => line.text).join(', ')})`);
      // 되돌리기, then go on from the result (the next document is planned on this one).
      const back = ok(undoProgramTaskLocation(after, { actorId: actor(after), documentId: docId, before, after: now })).data;
      assert.deepEqual(space(back).text, before, `${docId} back to every byte`);
      data = after;
    }
    assert.equal(offered, 121, `${variant}: every date line was offered`);
    assert.equal(space(data).text.documents.flatMap(doc => doc.lines).filter(line => DATE_LINE.test(line.text)).length, 0, `${variant}: none left`);
  }
  const worst = (list: number[]) => Math.round(Math.max(...list));
  t.diagnostic(`plan worst ${worst(planMs)}ms, apply worst ${worst(applyMs)}ms, all ${Date.now() - started}ms`);
  assert(Date.now() - started < 60000, `took ${Date.now() - started}ms`);
});

function converted() {
  const { data, docId } = writing(['[2026-11-09]', '- /회사', '  - [ ] 보고서', '    - [ ] 표', '  - [ ] 회의', '- [ ] 장보기', '', '[2026-11-10]', '- [ ] 운동',
    '  - 날짜: 2026-11-10'].join('\n'));
  const plan = programDateLinePlan(space(data), docId)!;
  return { data: ok(applyProgramDateLines(data, { ...base(data), plan, choices: programDateLineDefaults(plan) })).data, docId };
}
const noDateLine = (data: ProgramData | TextWorkspaceState, label: string) => {
  const text = 'spaces' in data ? space(data).text : data;
  assert.deepEqual(text.documents.flatMap(doc => doc.lines).filter(line => DATE_LINE.test(line.text)).map(line => line.text), [], label);
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
  // 날짜 한꺼번에 바꾸기.
  const listed = ok(moveProgramTaskDates(data, { actorId: actor(data), requestId: 'dl-list', moves: ['보고서', '회의'].map(title =>
    ({ taskId: id(data, title), expected: { date: '2026-11-09', time: '' }, date: '2026-11-14' })) })).data;
  noDateLine(listed, 'list'); assert.deepEqual(['보고서', '표', '회의'].map(title => item(listed, title).date), ['2026-11-14', '2026-11-14', '2026-11-14']);
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
  // To another document: under its own day's heading there.
  const other = writing('메모만 있는 글', '다른 글', data);
  const toDoc = ok(moveProgramTaskDocument(other.data, { ...base(other.data), taskId: id(other.data, '장보기'), destinationId: other.docId })).data;
  noDateLine(toDoc, 'to another document'); assert.equal(raw(toDoc, other.docId), '메모만 있는 글\n\n[2026-11-09]\n- [ ] 장보기');
  assert.equal(item(toDoc, '장보기').date, '2026-11-09');
  // A folder copy keeps its days by its heading.
  const folderLine = M.rowMeta(space(data).text, docId).find(row => row.kind === 'scope')!.id;
  const copied = copyProgramFolderOccurrence(space(data).text, readProgramFolderCopyPreview(space(data).text, docId, folderLine)!, '회사 사본');
  assert(copied.ok); noDateLine(copied.workspace, 'folder copy');
  assert(raw(copied.workspace, copied.documentId).startsWith('[2026-11-09]\n- /회사 사본'), raw(copied.workspace, copied.documentId));
  // A subtask added under a task.
  const child = prepareWritingChild(space(data).text, { docId, parentId: id(data, '회의'), kind: 'task', text: '안건 정리', expectedRaw: raw(data, docId) });
  assert(child.ok); noDateLine(child.workspace, 'child');
});

test('the sheet: asked on opening a document in 쓰기, after the progress ask; 나중에 asks again when it is opened again', () => {
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  assert.match(host, /if \(period !== 'documents' \|\| !selected \|\| progressAsk \|\| dateLineLater\.current === key\) \{ setDateLineAsk\(null\); return; \}/);
  assert.match(host, /if \(dateLineLater\.current !== key\) dateLineLater\.current = null;/);
  assert.match(host, /<h2 id="program-date-lines-title">이 글의 날짜 줄 \{ask\.plan\.lines\}개를 정리합니다<\/h2>/);
  assert.match(host, /run\('날짜 줄 정리 되돌리기', current => undoProgramTaskLocation\(current, \{ actorId, documentId: notice\.documentId, before: notice\.before, after: notice\.after \}\), true\)/);
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /const done = applyDateChip\(candidate\.lineId, candidate\.date\), after = controller\.getState\(\);/, 'a date said in words moves the line, also in a document without headings');
  const model = readFileSync(new URL('./vendor/text-model.cjs', import.meta.url), 'utf8');
  assert.doesNotMatch(model, /pinStructuralDates/);
});
