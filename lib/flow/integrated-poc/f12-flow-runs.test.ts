import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { completeProgramTask, createProgramDocument, importProgramPublicVersion, renameProgramDocument } from './private-space';
import { createPersonalFlow, startPersonalFlow } from './personal-authoring-commands';
import { textWorkspaceModel as M } from './text-workspace';
import { programDayCloseRows, programDeferPlan, programFlowRunBasis, programFlowRunMark, programFlowRuns, programRechecks, programRunName,
  readProgramDeferChoice, writeProgramDeferChoice } from './flow-run-progress';

// F12 1차 (PRD §20-4 ①②③, W-FLOW-02·04·07·08·09·10·11): progress lines, rechecks, the day close's rows and the defer plan.
function ok<T>(result: ProgramTransition<T>) { assert(result.ok, result.ok ? '' : result.reason); return result; }
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `r-${Math.random().toString(36).slice(2)}`, expectedSpace: data.spaces[data.activeActorId] });
const space = (data: ProgramData) => data.spaces[data.activeActorId];
const STEPS: [string, string, number, string[]][] = [['a', '발표자 선정', -21, ['인사팀 답 확인']], ['b', '발표자 공지', -14, []], ['c', '가이드 전달', -10, []], ['d', '회의실 예약', -5, []], ['e', '발표 진행', 0, []]];
function presentation(anchor = '2026-12-21') {
  let data = createProgramData();
  data.public.flows.push({ id: 'flow-p', ownerId: 'creator-minji', currentVersionId: 'version-p', category: '일', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'version-p', flowId: 'flow-p', number: 1, parentVersionId: null, title: '월간 발표', summary: '',
    source: { kind: 'simulated-example', label: '예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-10-01T00:00:00.000Z',
    items: STEPS.map(([id, title, days, subs]) => ({ id, title, description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'relative' as const, days },
      subchecks: subs.map((sub, index) => ({ id: `${id}-s${index}`, title: sub })) })) });
  const imported = ok(importProgramPublicVersion(data, { ...base(data), versionId: 'version-p', itemIds: STEPS.map(step => step[0]), anchor }));
  data = programClone(imported.data);
  assert(validateProgramData(data));
  const copy = space(data).copies[0], line = (item: string) => copy.itemLines[item];
  return { data, copy, line };
}

test('the basis from the day offsets, and the mark (W-FLOW-02·04)', () => {
  assert.equal(programFlowRunBasis([-21, -14, 0]), 'last');
  assert.equal(programFlowRunBasis([0, 0]), 'first');
  assert.equal(programFlowRunBasis([0, 3, 7]), 'first');
  assert.equal(programFlowRunBasis([-3, 2]), 'first', 'mixed signs: the first day');
  assert.equal(programFlowRunBasis([null, null]), 'first');
  assert.equal(programFlowRunMark('last', '2026-12-21', '2026-12-09'), 'D-12');
  assert.equal(programFlowRunMark('last', '2026-12-21', '2026-12-21'), 'D-day');
  assert.equal(programFlowRunMark('last', '2026-12-21', '2026-12-25'), 'D+4');
  assert.equal(programFlowRunMark('first', '2026-12-08', '2026-12-10'), '3일째', 'the start day is 1일째');
  assert.equal(programFlowRunMark('first', '2026-12-12', '2026-12-10'), '시작 전');
  assert.equal(programFlowRunMark('last', null, '2026-12-10'), 'D-?');
});

test('a copy of a public Flow: one line with its name, n/m, D-n and the next step; checking moves it on (PRD §20-4 ①)', () => {
  let { data, line } = presentation();
  let [run] = programFlowRuns(data, data.activeActorId, '2026-12-09');
  assert.equal(run.kind, 'copy'); assert.equal(run.title, '월간 발표'); assert.equal(run.basis, 'last'); assert.equal(run.mark, 'D-12');
  assert.deepEqual([run.done, run.total], [0, 5]);
  assert.deepEqual(run.next && [run.next.title, run.next.date], ['발표자 선정', '2026-11-30']);
  assert.equal(run.wait, null);
  data = ok(completeProgramTask(data, { ...base(data), taskId: line('b'), date: '2026-12-09', done: true })).data;
  [run] = programFlowRuns(data, data.activeActorId, '2026-12-09');
  assert.deepEqual([run.done, run.total, run.next?.title], [1, 5, '발표자 선정'], 'n/m counts steps; the next is the first open one');
});

test('waiting (W-FLOW-07): a checked step with an open subcheck shows in place of 다음, with the days since its check; typed [x] has no days', () => {
  let { data, line } = presentation();
  data = ok(completeProgramTask(data, { ...base(data), taskId: line('a'), date: '2026-11-30', done: true })).data;
  let [run] = programFlowRuns(data, data.activeActorId, '2026-12-03');
  assert.deepEqual(run.wait && [run.wait.title, run.wait.days, run.wait.date], ['인사팀 답 확인', 3, '2026-11-30'], 'the subcheck takes its parent\'s date (지금 문법)');
  assert.equal(run.next?.title, '발표자 공지');
  // The rechecks (다시 확인할 일): the parent checked, the subcheck open, its date today or before.
  const rechecks = programRechecks(space(data), '2026-12-03');
  assert.deepEqual(rechecks.map(entry => [entry.title, entry.parentTitle, entry.days]), [['인사팀 답 확인', '발표자 선정', 3]]);
  assert.deepEqual(programRechecks(space(data), '2026-11-29'), [], 'not before its date');
  // Checked by typing [x] in the copy: no progress record, so no days (W-FLOW-07: nothing made up).
  ({ data, line } = presentation());
  const copy = space(data).copies[0], doc = M.getDocument(space(data).text, copy.documentId)!;
  const raw = M.raw(doc).replace('- [ ] 발표자 선정', '- [x] 발표자 선정');
  const typed = M.editTextResult(space(data).text, copy.documentId, raw, { folderText: true });
  assert.equal(typed.reason, null);
  data.spaces[data.activeActorId] = { ...space(data), text: typed.state };
  [run] = programFlowRuns(data, data.activeActorId, '2026-12-03');
  assert.deepEqual(run.wait && [run.wait.title, run.wait.days], ['인사팀 답 확인', null]);
});

test('runs in order: by the next step\'s date, then waiting, then undated; finished runs leave; a personal Flow run is a line too', () => {
  let { data } = presentation();
  const actor = data.activeActorId;
  // A personal Flow from my own document, started as a standalone execution.
  const made = ok(createProgramDocument(data, { ...base(data), title: '디자인 외주 원본' })); data = programClone(made.data);
  const edited = M.editTextResult(space(data).text, made.result, ['[2026-12-01]', '- [ ] 요청 내용 정리', '[2026-12-02]', '- [ ] 견적서 보내기', '[2026-12-05]', '- [ ] 계약 확인'].join('\n'), { folderText: true });
  assert.equal(edited.reason, null); data.spaces[actor] = { ...space(data), text: edited.state };
  const ids = M.tasks(space(data).text).filter(task => task.docId === made.result).map(task => task.id);
  const flow = ok(createPersonalFlow(data, { title: '디자인 외주', documentId: made.result, taskIds: ids })); data = flow.data;
  const owner = space(data).personalAuthoring!.flows[0];
  const started = ok(startPersonalFlow(data, { flowId: flow.result, versionId: owner.currentVersionId, anchorDate: '2026-12-08' })); data = started.data;
  const runs = programFlowRuns(data, actor, '2026-12-10');
  const personal = runs.find(run => run.kind === 'personal')!;
  assert(personal, 'the personal execution has a line');
  const execution = space(data).personalAuthoring!.executions![0];
  assert.equal(personal.documentId, execution.executionDocumentId);
  // F12 2차 (W-FLOW-01): the run's name is its document's title after the Flow's name ('디자인 외주 · 2026-12-08').
  assert.equal(M.getDocument(space(data).text, execution.executionDocumentId)!.title, '디자인 외주 · 2026-12-08');
  assert.deepEqual([personal.flow, personal.run, personal.title], ['디자인 외주', '2026-12-08', '디자인 외주 2026-12-08']);
  assert.deepEqual([personal.done, personal.total], [0, 3]);
  assert.equal(personal.basis, 'first'); assert.equal(personal.mark, '3일째');
  assert.deepEqual(runs.map(run => [run.kind, run.next?.date]), [['copy', '2026-11-30'], ['personal', '2026-12-01']], 'by the next step\'s date (the personal version keeps the written dates); the source document is not a run');
  // Every step of the copy checked: it stays only as waiting (its first step's subcheck is open), after dated runs.
  for (const step of runs.find(run => run.kind === 'copy')!.steps) data = ok(completeProgramTask(data, { ...base(data), taskId: step.taskId, date: '2026-12-10', done: true })).data;
  let after = programFlowRuns(data, actor, '2026-12-10');
  assert.deepEqual(after.map(run => [run.kind, run.next?.title ?? null, run.wait?.title ?? null]), [['personal', '요청 내용 정리', null], ['copy', null, '인사팀 답 확인']]);
  // The subcheck checked too: the copy is finished and leaves.
  const sub = after[1].wait!.taskId;
  data = ok(completeProgramTask(data, { ...base(data), taskId: sub, date: '2026-12-10', done: true })).data;
  after = programFlowRuns(data, actor, '2026-12-10');
  assert.deepEqual(after.map(run => run.kind), ['personal']);
});

test('the day close rows: [건너뛰기] for a repeat round, [내일] for the rest, with the run a Flow step belongs to', () => {
  const { data, line } = presentation();
  const runs = programFlowRuns(data, data.activeActorId, '2026-12-07');
  const open = M.tasks(space(data).text).filter(task => task.date === '2026-12-07');
  const rows = programDayCloseRows(space(data), '2026-12-07', open, runs);
  assert.deepEqual(rows.map(row => [row.task.id, row.action, row.run?.title]), [[line('b'), 'tomorrow', '월간 발표']]);
});

test('the defer plan (W-FLOW-09·10): asked only past the next step; 겹칠 때만 / 간격 지키며 / 그대로; nothing past the last day', () => {
  const { data, line } = presentation();
  const [run] = programFlowRuns(data, data.activeActorId, '2026-12-14');
  // d 회의실 예약 is on 12/16 (D-5), e 발표 진행 on 12/21. Moving c (12/11) to 12/16 is the same day as d: not asked.
  assert.equal(programDeferPlan(run, line('c'), '2026-12-16', 'overlap').ask, false, 'the same day is not past it');
  const overlap = programDeferPlan(run, line('c'), '2026-12-17', 'overlap');
  assert.equal(overlap.ask, true);
  assert.deepEqual(overlap.moves.map(move => [move.title, move.to]), [['가이드 전달', '2026-12-17'], ['회의실 예약', '2026-12-17']]);
  assert.equal(overlap.blocked, null);
  const gaps = programDeferPlan(run, line('c'), '2026-12-17', 'keep-gaps');
  assert.deepEqual(gaps.moves.map(move => [move.title, move.to]), [['가이드 전달', '2026-12-17'], ['회의실 예약', '2026-12-22'], ['발표 진행', '2026-12-27']]);
  assert.deepEqual(gaps.blocked && gaps.blocked.title, '회의실 예약', 'past the last day: refused, never cut short');
  assert.deepEqual(programDeferPlan(run, line('c'), '2026-12-17', 'none').moves.map(move => move.title), ['가이드 전달']);
  assert.deepEqual(programDeferPlan(run, line('d'), '2026-12-22', 'none').blocked?.title, '회의실 예약', 'the step itself after the last day');
});

test('the defer choice is remembered per run on this device', () => {
  const store = new Map<string, string>(), storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
  assert.equal(readProgramDeferChoice('copy:x', storage), null);
  writeProgramDeferChoice('copy:x', 'keep-gaps', storage);
  writeProgramDeferChoice('copy:y', 'none', storage);
  assert.equal(readProgramDeferChoice('copy:x', storage), 'keep-gaps');
  assert.equal(readProgramDeferChoice('copy:y', storage), 'none');
});

// F12 2차 (W-FLOW-01·04, 기획 11/11 21:31): the run name is the run document's title; renaming the document names the run.
test('the run name: none when the title is the Flow\'s; what follows the Flow\'s name; else the whole title', () => {
  assert.equal(programRunName('월간 발표', '월간 발표'), null);
  assert.equal(programRunName('월간 발표', '월간 발표 12월'), '12월');
  assert.equal(programRunName('월간 발표', '월간 발표 · 12월'), '12월');
  assert.equal(programRunName('디자인 외주', '가람 상사'), '가람 상사');
  assert.equal(programRunName('월간 발표', '  '), null);
});
test('renaming a copy\'s document names its run on the progress line, with no other data', () => {
  let { data, copy } = presentation();
  data = ok(renameProgramDocument(data, { ...base(data), documentId: copy.documentId, title: '월간 발표 12월' })).data;
  let [run] = programFlowRuns(data, data.activeActorId, '2026-12-09');
  assert.deepEqual([run.flow, run.run, run.title], ['월간 발표', '12월', '월간 발표 12월']);
  data = ok(renameProgramDocument(data, { ...base(data), documentId: copy.documentId, title: '고객 A' })).data;
  [run] = programFlowRuns(data, data.activeActorId, '2026-12-09');
  assert.deepEqual([run.flow, run.run, run.title], ['월간 발표', '고객 A', '월간 발표 고객 A']);
  assert.deepEqual(Object.keys(space(data).copies[0]).sort(), Object.keys(copy).sort(), 'the copy\'s own data is shaped as before');
});
