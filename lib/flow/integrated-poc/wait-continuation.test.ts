import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { completeProgramTask, createProgramDocument, importProgramPublicVersion } from './private-space';
import { createPersonalFlow, startPersonalFlow } from './personal-authoring-commands';
import { carryProgramTasksToToday, planProgramCarryover, programCarryoverBefore, programCarryoverProof, restoreProgramCarryover } from './carryover';
import { programContinuedLines } from './continuation';
import { programFlowRuns, programRechecks, programTaskHasEveningRecord } from './flow-run-progress';
import { moveProgramTaskLocation } from './task-location-command';
import { textWorkspaceModel as M } from './text-workspace';
import { programWaitStartable, startProgramWait } from './wait-line';

// integ-redesign4 (총괄 11/12): the progress line's 기다림 and '다시 확인할 일' with the wait written in the text ('답 확인:'
// line + '- 기다림:', W-FLOW-07 · W-TXT-09) and Redesign 4's 이어 쓰기 ([>] + '- 이어감:', W-MENU-25, W-TXT-04·05·08).
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `wc-${++request}`, expectedSpace: space(data) });
const raw = (data: ProgramData, docId: string) => M.raw(M.getDocument(space(data).text, docId)!);
const rechecks = (data: ProgramData, today: string) => programRechecks(space(data), today).map(row => [row.title, row.date, row.days, row.kind ?? 'subcheck']);

function writing(text: string) {
  let data = createProgramData();
  const made = ok(createProgramDocument(data, { ...base(data), title: '외주 글' }));
  data = programClone(made.data);
  const edit = M.editTextResult(space(data).text, made.result, text, { folderText: true });
  assert.equal(edit.reason, null);
  space(data).text = edit.state;
  return { data, docId: made.result };
}

const WAITS = ['[2026-11-10]', '- [x] 견적서 보내기', '- [ ] 답 확인: 견적서 보내기', '  - 기다림: 2026-11-10', '- [ ] 답 확인: 전화', '  - 기다림: 2026-11-09', '  - 메모: 문자 남김',
  '', '[2026-11-12]', '- [ ] 오늘 일'].join('\n');

test('밀린 일 이어 쓰기: a wait line without a record moves, one with a record is continued; both keep their 기다림 day', () => {
  const { data, docId } = writing(WAITS);
  assert.deepEqual(rechecks(data, '2026-11-12'), [['답 확인: 견적서 보내기', '2026-11-10', 2, 'line'], ['답 확인: 전화', '2026-11-10', 3, 'line']]);
  const plan = planProgramCarryover(space(data), '2026-11-12');
  const done = ok(carryProgramTasksToToday(data, { ...base(data), today: '2026-11-12', lines: plan.lines })).data;
  assert(validateProgramData(done));
  // The memo makes a record (Redesign 4): yesterday's line stays as [>] with its 기다림, memo and 이어감; today's line
  // carries the 기다림 on (as a 마감); the one without a record moves with its 기다림.
  assert.equal(raw(done, docId), ['[2026-11-10]', '- [x] 견적서 보내기', '- [>] 답 확인: 전화', '  - 기다림: 2026-11-09', '  - 메모: 문자 남김', '  - 이어감: 2026-11-12 · 0%', '',
    '[2026-11-12]', '- [ ] 오늘 일', '- [ ] 답 확인: 견적서 보내기', '  - 기다림: 2026-11-10', '- [ ] 답 확인: 전화', '  - 기다림: 2026-11-09'].join('\n'));
  // 다시 확인할 일: today's lines, the days still from the 기다림 day; the [>] line is the day's record, not listed.
  assert.deepEqual(rechecks(done, '2026-11-12'), [['답 확인: 견적서 보내기', '2026-11-12', 2, 'line'], ['답 확인: 전화', '2026-11-12', 3, 'line']]);
  assert.equal(programContinuedLines(space(done).text).filter(line => line.title === '답 확인: 전화' && line.received).length, 1);
  // One 되돌리기 gives every byte back.
  const back = ok(restoreProgramCarryover(done, { ...base(done), before: programCarryoverBefore(space(data)), after: programCarryoverProof(space(done)) })).data;
  assert.equal(raw(back, docId), WAITS);
  assert.deepEqual(space(back).text, space(data).text);
});

test('[내일] on a continued wait line moves today\'s line with its 기다림; the [>] record stays where it was', () => {
  const { data, docId } = writing(WAITS);
  const done = ok(carryProgramTasksToToday(data, { ...base(data), today: '2026-11-12', lines: planProgramCarryover(space(data), '2026-11-12').lines })).data;
  const line = M.tasks(space(done).text).find(task => task.title === '답 확인: 전화')!;
  const moved = ok(moveProgramTaskLocation(done, { ...base(done), taskId: line.id, documentId: docId, target: { kind: 'date', date: '2026-11-13' } })).data;
  const text = raw(moved, docId);
  assert(text.startsWith(['[2026-11-10]', '- [x] 견적서 보내기', '- [>] 답 확인: 전화', '  - 기다림: 2026-11-09'].join('\n')), 'the record as it was');
  assert(text.endsWith(['[2026-11-13]', '- [ ] 답 확인: 전화', '  - 기다림: 2026-11-09'].join('\n')));
  assert.deepEqual(rechecks(moved, '2026-11-13').find(row => row[0] === '답 확인: 전화'), ['답 확인: 전화', '2026-11-13', 4, 'line']);
});

test('the evening\'s record and the next morning: a task with a record shows 이어 쓰기 in the evening and is continued the next day', () => {
  const { data, docId } = writing(['[2026-11-12]', '- [40%] 보고서', '- [ ] 장보기'].join('\n'));
  const has = (title: string) => programTaskHasEveningRecord(space(data).text, M.tasks(space(data).text).find(task => task.title === title)!);
  assert.deepEqual([has('보고서'), has('장보기')], [true, false]);
  const next = ok(carryProgramTasksToToday(data, { ...base(data), today: '2026-11-13', lines: planProgramCarryover(space(data), '2026-11-13').lines })).data;
  assert.equal(raw(next, docId), ['[2026-11-12]', '- [>] 보고서', '  - 이어감: 2026-11-13 · 40%', '', '[2026-11-13]', '- [40%] 보고서', '- [ ] 장보기'].join('\n'));
});

// A public Flow copy, as F12's tests make it.
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

test('a Flow copy: its wait line is outside 밀린 일; the progress line waits on it by its step, counting from 기다림, n/m the steps', () => {
  let { data, copy, line } = presentation();
  data = ok(completeProgramTask(data, { ...base(data), taskId: line('b'), date: '2026-12-07', done: true })).data;
  data = ok(startProgramWait(data, { ...base(data), taskId: line('b'), date: '2026-12-08', today: '2026-12-07' })).data;
  const before = raw(data, copy.documentId);
  assert.deepEqual(planProgramCarryover(space(data), '2026-12-10').lines, [], 'a copy\'s lines are not carried');
  const [run] = programFlowRuns(data, actor(data), '2026-12-10');
  assert.deepEqual([run.done, run.total, run.wait?.title, run.wait?.parentId, run.wait?.days], [1, 3, '답 확인: 발표자 공지', line('b'), 3]);
  assert.deepEqual(rechecks(data, '2026-12-10'), [['답 확인: 발표자 공지', '2026-12-08', 3, 'line']]);
  assert.equal(raw(data, copy.documentId), before);
});

test('a personal run: its document holds exactly its Flow\'s steps, so no wait line is written there; its subcheck waits as before', () => {
  let data = createProgramData();
  const made = ok(createProgramDocument(data, { ...base(data), title: '외주 원본' })); data = programClone(made.data);
  const edit = M.editTextResult(space(data).text, made.result, ['[2026-11-01]', '- [ ] 요청 정리', '  - [ ] 답장 확인', '[2026-11-03]', '- [ ] 견적서 보내기'].join('\n'), { folderText: true });
  assert.equal(edit.reason, null); space(data).text = edit.state;
  const ids = M.tasks(space(data).text).filter(task => task.docId === made.result).map(task => task.id);
  const flow = ok(createPersonalFlow(data, { title: '외주', documentId: made.result, taskIds: ids })); data = flow.data;
  data = ok(startPersonalFlow(data, { flowId: flow.result, versionId: space(data).personalAuthoring!.flows[0].currentVersionId, anchorDate: '2026-11-08' })).data;
  const execution = space(data).personalAuthoring!.executions![0];
  const step = M.tasks(space(data).text).find(task => task.docId === execution.executionDocumentId && task.title === '요청 정리')!;
  data = ok(completeProgramTask(data, { ...base(data), taskId: step.id, date: '2026-11-09', done: true })).data;
  // Not offered, and refused with nothing written (the account would not validate with another task in it).
  assert.equal(programWaitStartable(space(data), step.id), false);
  const refused = startProgramWait(data, { ...base(data), taskId: step.id, date: '2026-11-10', today: '2026-11-09' });
  assert(!refused.ok && refused.reason === 'unresolved');
  // The F12 shape: the checked step's open subcheck is its wait, its days from the step's check.
  const run = programFlowRuns(data, actor(data), '2026-11-12').find(entry => entry.kind === 'personal')!;
  assert.deepEqual([run.done, run.total, run.wait?.title, run.wait?.days], [1, 2, '답장 확인', 3]);
  assert.deepEqual(planProgramCarryover(space(data), '2026-11-12').lines, [], 'a run\'s steps are not carried, so their IDs stay');
  // Its source document (my own writing) still takes a wait line.
  const source = M.tasks(space(data).text).find(task => task.docId === made.result && task.title === '요청 정리')!;
  assert.equal(programWaitStartable(space(data), source.id), true);
  assert(validateProgramData(ok(startProgramWait(data, { ...base(data), taskId: source.id, date: '2026-11-10', today: '2026-11-09' })).data));
});
