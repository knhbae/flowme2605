import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { completeProgramTask, createProgramDocument, importProgramPublicVersion } from './private-space';
import { createPersonalFlow, startPersonalFlow } from './personal-authoring-commands';
import { moveProgramTaskLocation, undoProgramTaskLocation } from './task-location-command';
import { programDocumentThread } from './flow-thread';
import { programFlowRuns, programRechecks } from './flow-run-progress';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { programIsWaitTitle, programWaitDays, programWaitLineRaw, programWaitParentTitle, programWaitStartable, startProgramWait } from './wait-line';

// W-FLOW-07 · W-TXT-09 (총괄 11/12): a wait is a line in the text — '- [ ] 답 확인: <부모 제목>' in the section of the day to
// look again, '  - 기다림: YYYY-MM-DD' (the day it began) under it. Not a step (n/m), listed in '다시 확인할 일', its days
// from its 기다림 day; [내일] moves it with its 기다림; the F12 shape before it (subcheck + '- 날짜:') is still read.
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `wait-${++request}`, expectedSpace: space(data) });
const TODAY = '2026-11-12', TOMORROW = '2026-11-13';

function writing(raw: string) {
  let data = createProgramData();
  const made = ok(createProgramDocument(data, { ...base(data), title: '외주 글' }));
  data = programClone(made.data);
  const edit = M.editTextResult(space(data).text, made.result, raw, { folderText: true });
  assert.equal(edit.reason, null);
  space(data).text = edit.state;
  const id = (title: string) => M.tasks(space(data).text).find(task => task.title === title)!.id;
  const doc = (state: ProgramData) => M.raw(M.getDocument(space(state).text, made.result)!);
  return { data, docId: made.result, id, doc };
}

test('the model reads \'- 기다림:\' as the task\'s property waitSince: never its date; unreadable, none', () => {
  let state: TextWorkspaceState = M.addDocument(createEmptyTextWorkspace(), { title: '기다림 글' });
  const id = state.documents.at(-1)!.id;
  const raw = `[${TOMORROW}]\n- [ ] 답 확인: 견적서 보내기\n  - 기다림: ${TODAY}\n- [ ] 답 확인: 전화\n  - 기다림: 지난주\n- [ ] 그냥 일`;
  const edit = M.editTextResult(state, id, raw, { folderText: true });
  assert.equal(edit.reason, null); state = edit.state;
  assert.equal(M.raw(M.getDocument(state, id)!), raw, 'the text byte for byte');
  const task = (title: string) => M.tasks(state).find(entry => entry.title === title)!;
  assert.deepEqual(['답 확인: 견적서 보내기', '답 확인: 전화', '그냥 일'].map(title => [task(title).date, 'waitSince' in task(title) ? task(title).waitSince : 'none']),
    [[TOMORROW, TODAY], [TOMORROW, null], [TOMORROW, 'none']]);
  const row = M.rowMeta(state, id).find(entry => entry.text.trim() === `- 기다림: ${TODAY}`)!;
  assert.equal(row.kind, 'property'); assert.equal(row.taskId, task('답 확인: 견적서 보내기').id);
  assert.equal(programWaitParentTitle('답 확인: 견적서 보내기'), '견적서 보내기');
  assert.equal(programWaitParentTitle('견적서 답 확인'), null);
  assert(programIsWaitTitle('  답 확인:전화 '));
  assert.deepEqual([programWaitDays(TODAY, '2026-11-15'), programWaitDays(TODAY, TODAY), programWaitDays(null, TODAY), programWaitDays('지난주', TODAY)], [3, 0, null, null]);
});

test('the line goes to the end of its day\'s section, or a new section in date order; no other line moves', () => {
  const line = `- [ ] 답 확인: 견적서 보내기\n  - 기다림: ${TODAY}`;
  assert.equal(programWaitLineRaw(`[${TODAY}]\n- [x] 견적서 보내기\n[${TOMORROW}]\n- [ ] 다른 일`, TOMORROW, '견적서 보내기', TODAY),
    `[${TODAY}]\n- [x] 견적서 보내기\n[${TOMORROW}]\n- [ ] 다른 일\n${line}`);
  assert.equal(programWaitLineRaw(`[${TODAY}]\n- [x] 견적서 보내기\n\n[2026-11-20]\n- [ ] 끝`, TOMORROW, '견적서 보내기', TODAY),
    `[${TODAY}]\n- [x] 견적서 보내기\n\n[${TOMORROW}]\n${line}\n\n[2026-11-20]\n- [ ] 끝`);
  assert.equal(programWaitLineRaw('- [ ] 머리 없는 일\n  - 날짜: 2026-11-12', TOMORROW, '견적서 보내기', TODAY),
    `- [ ] 머리 없는 일\n  - 날짜: 2026-11-12\n\n[${TOMORROW}]\n${line}`);
  assert.equal(programWaitLineRaw('', TOMORROW, '견적서 보내기', TODAY), `[${TOMORROW}]\n${line}`);
  assert.equal(programWaitLineRaw('', '11/13', '견적서 보내기', TODAY), null);
  assert.equal(programWaitLineRaw('', TOMORROW, '두 줄\n제목', TODAY), null);
});

test('답 기다리기: one save writes the line exactly; one 되돌리기 gives every byte back; a second wait on it is refused', () => {
  const raw = `[${TODAY}]\n- /외주\n  - [x] 견적서 보내기\n  - [ ] 계약 확인\n\n[2026-11-20]\n- [ ] 정산`;
  const { data, id, doc, docId } = writing(raw);
  assert(programWaitStartable(space(data), id('견적서 보내기')));
  const started = ok(startProgramWait(data, { ...base(data), taskId: id('견적서 보내기'), date: TOMORROW, today: TODAY }));
  assert.equal(doc(started.data), `[${TODAY}]\n- /외주\n  - [x] 견적서 보내기\n  - [ ] 계약 확인\n\n[${TOMORROW}]\n- [ ] 답 확인: 견적서 보내기\n  - 기다림: ${TODAY}\n\n[2026-11-20]\n- [ ] 정산`);
  assert(validateProgramData(started.data));
  const made = M.tasks(space(started.data).text).find(task => task.id === started.result)!;
  assert.deepEqual([made.title, made.date, made.waitSince, made.done], ['답 확인: 견적서 보내기', TOMORROW, TODAY, false]);
  assert.deepEqual(space(started.data).text.progressRecords, space(data).text.progressRecords, 'no record made');
  // Undo (the notice's [되돌리기]): the text back byte for byte.
  const back = ok(undoProgramTaskLocation(started.data, { actorId: actor(data), documentId: docId, before: space(data).text, after: space(started.data).text }));
  assert.equal(doc(back.data), raw);
  assert.deepEqual(space(back.data).text, space(data).text);
  // Once a line is open for it, no second one; a wait line itself, or a day before today, cannot start one.
  assert.equal(programWaitStartable(space(started.data), id('견적서 보내기')), false);
  const twice = startProgramWait(started.data, { ...base(started.data), taskId: id('견적서 보내기'), date: '2026-11-14', today: TODAY });
  assert(!twice.ok && twice.reason === 'conflict');
  assert.equal(programWaitStartable(space(started.data), started.result), false);
  const past = startProgramWait(data, { ...base(data), taskId: id('견적서 보내기'), date: '2026-11-11', today: TODAY });
  assert(!past.ok && past.reason === 'invalid');
});

test('[내일] moves the line to tomorrow\'s section with its 기다림, which keeps its day; 되돌리기 is exact', () => {
  const raw = `[${TODAY}]\n- [x] 견적서 보내기\n- [ ] 답 확인: 견적서 보내기\n  - 기다림: 2026-11-10`;
  const { data, id, doc, docId } = writing(raw);
  const moved = ok(moveProgramTaskLocation(data, { ...base(data), taskId: id('답 확인: 견적서 보내기'), documentId: docId, target: { kind: 'date', date: TOMORROW } }));
  // Redesign 3: a new day heading gets a blank line before it.
  assert.equal(doc(moved.data), `[${TODAY}]\n- [x] 견적서 보내기\n\n[${TOMORROW}]\n- [ ] 답 확인: 견적서 보내기\n  - 기다림: 2026-11-10`);
  const line = M.tasks(space(moved.data).text).find(task => task.title === '답 확인: 견적서 보내기')!;
  assert.deepEqual([line.id, line.date, line.waitSince], [id('답 확인: 견적서 보내기'), TOMORROW, '2026-11-10']);
  const back = ok(undoProgramTaskLocation(moved.data, { actorId: actor(data), documentId: docId, before: space(data).text, after: space(moved.data).text }));
  assert.equal(doc(back.data), raw);
});

test('다시 확인할 일: an open line dated by today, days from its 기다림 day; not before its day, not once checked', () => {
  const raw = `[2026-11-10]\n- [x] 견적서 보내기\n[${TODAY}]\n- [ ] 답 확인: 견적서 보내기\n  - 기다림: 2026-11-10\n[${TOMORROW}]\n- [ ] 답 확인: 전화하기\n  - 기다림: ${TODAY}`;
  const { data, id, docId } = writing(raw);
  const rows = programRechecks(space(data), TODAY);
  assert.deepEqual(rows.map(row => [row.title, row.parentTitle, row.parentId, row.days, row.kind, row.docId]),
    [['답 확인: 견적서 보내기', '견적서 보내기', id('견적서 보내기'), 2, 'line', docId]]);
  assert.deepEqual(programRechecks(space(data), TOMORROW).map(row => [row.title, row.parentId, row.days]),
    [['답 확인: 견적서 보내기', id('견적서 보내기'), 3], ['답 확인: 전화하기', id('답 확인: 전화하기'), 1]], 'no task of that title: the line itself');
  const checked = ok(completeProgramTask(data, { ...base(data), taskId: id('답 확인: 견적서 보내기'), date: TODAY, done: true })).data;
  assert.deepEqual(programRechecks(space(checked), TODAY), []);
});

// A public Flow copy, as F12's tests make it: 발표자 선정 (-21, a subcheck) … 발표 진행 (0), 기준일 12/21.
const STEPS: [string, string, number, string[]][] = [['a', '발표자 선정', -21, ['인사팀 답 확인']], ['b', '발표자 공지', -14, []], ['e', '발표 진행', 0, []]];
function presentation() {
  let data = createProgramData();
  data.public.flows.push({ id: 'flow-p', ownerId: 'creator-minji', currentVersionId: 'version-p', category: '일', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'version-p', flowId: 'flow-p', number: 1, parentVersionId: null, title: '월간 발표', summary: '',
    source: { kind: 'simulated-example', label: '예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-10-01T00:00:00.000Z',
    items: STEPS.map(([id, title, days, subs]) => ({ id, title, description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'relative' as const, days },
      subchecks: subs.map((sub, index) => ({ id: `${id}-s${index}`, title: sub })) })) });
  data = programClone(ok(importProgramPublicVersion(data, { ...base(data), versionId: 'version-p', itemIds: STEPS.map(step => step[0]), anchor: '2026-12-21' })).data);
  const copy = space(data).copies[0];
  return { data, copy, line: (item: string) => copy.itemLines[item] };
}

test('a Flow copy: the wait on a checked step is its line; n/m counts the steps only; [내일] keeps the 기다림 (date only)', () => {
  let { data, copy, line } = presentation();
  data = ok(completeProgramTask(data, { ...base(data), taskId: line('b'), date: '2026-12-07', done: true })).data;
  const before = M.raw(M.getDocument(space(data).text, copy.documentId)!), thread = programDocumentThread(space(data).text, copy.documentId);
  const started = ok(startProgramWait(data, { ...base(data), taskId: line('b'), date: '2026-12-09', today: '2026-12-07' }));
  data = started.data;
  const after = M.raw(M.getDocument(space(data).text, copy.documentId)!);
  assert.equal(after, `${before}\n\n[2026-12-09]\n- [ ] 답 확인: 발표자 공지\n  - 기다림: 2026-12-07`, 'a new section at the end; every line before it as it was');
  let [run] = programFlowRuns(data, actor(data), '2026-12-09');
  assert.deepEqual([run.done, run.total], [1, 3], 'the 답 확인 line is no step');
  assert.deepEqual(run.wait && [run.wait.title, run.wait.parentId, run.wait.days, run.wait.date], ['답 확인: 발표자 공지', line('b'), 2, '2026-12-09']);
  assert.equal(run.next?.title, '발표자 선정');
  assert.deepEqual(programRechecks(space(data), '2026-12-09').map(row => [row.title, row.kind ?? 'subcheck', row.parentId, row.days]),
    [['답 확인: 발표자 공지', 'line', line('b'), 2]]);
  // [내일] in a copy changes only the date (its order stays): '- 날짜:' under the line; the 기다림 stays as written.
  const moved = ok(moveProgramTaskLocation(data, { ...base(data), taskId: started.result, documentId: copy.documentId, target: { kind: 'date', date: '2026-12-10' } })).data;
  const movedRaw = M.raw(M.getDocument(space(moved).text, copy.documentId)!);
  assert(movedRaw.includes('- [ ] 답 확인: 발표자 공지') && movedRaw.includes('  - 기다림: 2026-12-07'));
  assert.equal(M.tasks(space(moved).text).find(task => task.id === started.result)!.date, '2026-12-10');
  [run] = programFlowRuns(moved, actor(moved), '2026-12-10');
  assert.equal(run.wait?.days, 3, 'still from its 기다림 day');
  // The F12 shape before it is still read: step a checked with its subcheck open waits as before (earlier in order).
  const old = ok(completeProgramTask(data, { ...base(data), taskId: line('a'), date: '2026-12-08', done: true })).data;
  [run] = programFlowRuns(old, actor(old), '2026-12-09');
  assert.deepEqual(run.wait && [run.wait.title, run.wait.days], ['인사팀 답 확인', 1]);
  assert.deepEqual(programRechecks(space(old), '2026-12-09').map(row => [row.title, row.kind ?? 'subcheck']), [['인사팀 답 확인', 'subcheck'], ['답 확인: 발표자 공지', 'line']]);
  // The Flow's thread on 오늘's rows counts its steps only too.
  assert.deepEqual(programDocumentThread(space(data).text, copy.documentId), thread, 'its thread and n/m as before the line');
});

test('a personal Flow made from a document with a 답 확인 line: the line is no step of its runs', () => {
  let data = createProgramData();
  const made = ok(createProgramDocument(data, { ...base(data), title: '외주 원본' })); data = programClone(made.data);
  const edit = M.editTextResult(space(data).text, made.result, ['[2026-12-01]', '- [ ] 요청 정리', '- [ ] 답 확인: 요청 정리', '  - 기다림: 2026-12-01', '[2026-12-02]', '- [ ] 견적서 보내기'].join('\n'), { folderText: true });
  assert.equal(edit.reason, null); space(data).text = edit.state;
  const ids = M.tasks(space(data).text).filter(task => task.docId === made.result).map(task => task.id);
  assert.equal(ids.length, 3);
  const flow = ok(createPersonalFlow(data, { title: '외주', documentId: made.result, taskIds: ids })); data = flow.data;
  data = ok(startPersonalFlow(data, { flowId: flow.result, versionId: space(data).personalAuthoring!.flows[0].currentVersionId, anchorDate: '2026-12-08' })).data;
  const run = programFlowRuns(data, actor(data), '2026-12-08').find(entry => entry.kind === 'personal')!;
  assert.deepEqual([run.total, run.steps.map(step => step.title)], [2, ['요청 정리', '견적서 보내기']]);
});
