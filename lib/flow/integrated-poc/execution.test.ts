import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { programDateRange, programExecutionTasks, programIsContinuingTask, programLocalDate, programShiftDate, programShiftMonth, reorderProgramTimeline } from './execution';
import { completeProgramTask, createProgramDocument, createProgramFolder, importProgramPublicVersion, linkProgramTask, recordProgramTaskProgress, setProgramCopyInclusion } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';

const actorId = 'local-user'; let sequence = 0;
const base = (data: ProgramData) => ({ actorId, requestId: `execution-${++sequence}`, expectedSpace: data.spaces[actorId] });
function accepted(result: ProgramTransition<string>) { assert(result.ok, result.ok ? '' : result.reason); assert(validateProgramData(result.data)); return result; }
function fixture() {
  const initial = createProgramData();
  const result = accepted(createProgramDocument(initial, { ...base(initial), title: '개인 기록', raw: '- [ ] 늦은 일\n  - 날짜: 2026-09-20\n- [ ] 오늘 A\n  - 날짜: 2026-09-12\n  - [ ] A 하위 체크\n- [ ] 오늘 B\n  - 날짜: 2026-09-12\n- [ ] 미정' }));
  const tasks = M.tasks(result.data.spaces[actorId].text);
  return { data: result.data, documentId: result.result, ids: Object.fromEntries(tasks.map(task => [task.title, task.id])) };
}
function copyFixture() {
  const initial = createProgramData();
  initial.public.flows.push({ id: 'source-flow', ownerId: 'creator-minji', currentVersionId: 'source-v1', category: '생활', situations: [], derivedFrom: null, archived: false });
  initial.public.versions.push({ id: 'source-v1', flowId: 'source-flow', number: 1, parentVersionId: null, title: '원문', summary: '',
    items: [{ id: 'first', title: '첫 항목', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'fixed', date: '2026-09-12' }, subchecks: [{ id: 'child', title: '하위 체크' }] },
      { id: 'second', title: '둘째 항목', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'fixed', date: '2026-09-12' }, subchecks: [] }],
    source: { kind: 'simulated-example', label: '검증 예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-09-12T00:00:00.000Z' });
  const result = accepted(importProgramPublicVersion(initial, { ...base(initial), versionId: 'source-v1', itemIds: ['first', 'second'], anchor: null }));
  return { data: result.data, copy: result.data.spaces[actorId].copies[0] };
}

test('document references and inherited subchecks never duplicate canonical execution targets', () => {
  let { data, ids } = fixture();
  for (const title of ['연결 문서 A', '연결 문서 B']) {
    const doc = accepted(createProgramDocument(data, { ...base(data), title })); data = doc.data;
    data = accepted(linkProgramTask(data, { ...base(data), documentId: doc.result, taskId: ids['오늘 A'] })).data;
  }
  const tasks = programExecutionTasks(data.spaces[actorId], { period: 'today', date: '2026-09-12' });
  assert.deepEqual(tasks.map(task => task.id), [ids['오늘 A'], ids['오늘 B']]);
  assert.equal(new Set(tasks.map(task => task.id)).size, tasks.length);
  assert.equal(data.spaces[actorId].text.bindings.filter(binding => binding.kind === 'task').length, 2);
});

test('copy exclusion filters canonical task, references and children but preserves source/history for restoration', () => {
  let { data, copy } = copyFixture();
  const doc = accepted(createProgramDocument(data, { ...base(data), title: '참조' })); data = doc.data;
  data = accepted(linkProgramTask(data, { ...base(data), documentId: doc.result, taskId: copy.itemLines.first })).data;
  const originalText = programClone(data.spaces[actorId].text);
  data = accepted(setProgramCopyInclusion(data, { ...base(data), copyId: copy.id, itemId: 'first', included: false })).data;
  assert.deepEqual(programExecutionTasks(data.spaces[actorId]).map(task => task.id), [copy.itemLines.second]);
  assert.deepEqual(data.spaces[actorId].text, originalText);
  data = accepted(setProgramCopyInclusion(data, { ...base(data), copyId: copy.id, itemId: 'first', included: true })).data;
  assert.deepEqual(programExecutionTasks(data.spaces[actorId]).map(task => task.id), [copy.itemLines.first, copy.itemLines.second]);
});

test('a private task written inside a copy remains executable without becoming a source item', () => {
  const { data, copy } = copyFixture(), space = data.spaces[actorId], doc = M.getDocument(space.text, copy.documentId)!;
  space.text = M.editText(space.text, doc.id, `${M.raw(doc)}\n- [ ] 내 추가 할 일\n  - 날짜: 2026-09-12`);
  assert(validateProgramData(data));
  const added = M.tasks(space.text).find(task => task.title === '내 추가 할 일')!;
  assert(added); assert(!Object.values(copy.itemLines).includes(added.id));
  assert(programExecutionTasks(space).some(task => task.id === added.id), 'Private additions must not be treated as excluded source items');
});

test('excluded source subchecks remain excluded if the user promotes their existing row to a root task', () => {
  let { data, copy } = copyFixture();
  const space = data.spaces[actorId], doc = M.getDocument(space.text, copy.documentId)!;
  const childId = copy.subcheckLines.first.child;
  space.text = M.editText(space.text, doc.id, M.raw(doc).replace('  - [ ] 하위 체크', '- [ ] 하위 체크'));
  assert(validateProgramData(data));
  assert(M.tasks(space.text).some(task => task.id === childId));
  assert(!programExecutionTasks(space).some(task => task.id === childId), 'Source subchecks remain attached to their item instead of becoming an independent execution target');
  data = accepted(setProgramCopyInclusion(data, { ...base(data), copyId: copy.id, itemId: 'first', included: false })).data;
  assert(!programExecutionTasks(data.spaces[actorId]).some(task => task.id === childId), 'Known source child must inherit source-item exclusion even after changing outline depth');
});

test('execution sorts by dates and puts undated last without changing source order or raw', () => {
  const { data, documentId, ids } = fixture(), space = data.spaces[actorId], before = programClone(space.text);
  assert.deepEqual(programExecutionTasks(space).map(task => task.id), [ids['오늘 A'], ids['오늘 B'], ids['늦은 일'], ids['미정']]);
  assert.equal(M.parseDocument(M.getDocument(space.text, documentId)!, space.text).tasks[0].id, ids['늦은 일']);
  assert.deepEqual(space.text, before);
  assert.deepEqual(programExecutionTasks(space, { period: 'undated', date: '2026-09-12' }).map(task => task.id), [ids['미정']]);
});

test('same-date manual ordering persists across JSON reload, leaving source and other actors untouched', () => {
  const { data, ids } = fixture(), expectedIds = [ids['오늘 A'], ids['오늘 B']];
  const reordered = accepted(reorderProgramTimeline(data, { actorId, taskId: ids['오늘 B'], beforeTaskId: ids['오늘 A'], expectedIds }));
  assert(reordered.changed); assert.deepEqual(reordered.data.spaces[actorId].text, data.spaces[actorId].text);
  assert.deepEqual(reordered.data.spaces['creator-minji'], data.spaces['creator-minji']);
  const reloaded = JSON.parse(JSON.stringify(reordered.data)) as ProgramData; assert(validateProgramData(reloaded));
  assert.deepEqual(programExecutionTasks(reloaded.spaces[actorId], { period: 'today', date: '2026-09-12' }).map(task => task.id), expectedIds.slice().reverse());
});

test('same-position reorder is a zero-write no-op, stale order conflicts, and cross-date drops reject', () => {
  const { data, ids } = fixture(), expectedIds = [ids['오늘 A'], ids['오늘 B']];
  for (const beforeTaskId of [ids['오늘 A'], ids['오늘 B']]) {
    const same = accepted(reorderProgramTimeline(data, { actorId, taskId: ids['오늘 A'], beforeTaskId, expectedIds }));
    assert.equal(same.changed, false); assert.equal(same.data, data);
  }
  const moved = accepted(reorderProgramTimeline(data, { actorId, taskId: ids['오늘 B'], beforeTaskId: ids['오늘 A'], expectedIds }));
  const stale = reorderProgramTimeline(moved.data, { actorId, taskId: ids['오늘 A'], beforeTaskId: null, expectedIds });
  assert(!stale.ok && stale.reason === 'conflict');
  const crossDate = reorderProgramTimeline(data, { actorId, taskId: ids['오늘 A'], beforeTaskId: ids['늦은 일'], expectedIds });
  assert(!crossDate.ok && crossDate.reason === 'invalid');
});

test('archived documents and legacy exclusions never leak through a surviving reference', () => {
  let { data, documentId, ids } = fixture();
  const doc = accepted(createProgramDocument(data, { ...base(data), title: '연결' })); data = doc.data;
  data = accepted(linkProgramTask(data, { ...base(data), documentId: doc.result, taskId: ids['오늘 A'] })).data;
  data.spaces[actorId].legacyTimelinePolicies[ids['오늘 A']] = 'excluded';
  assert(!programExecutionTasks(data.spaces[actorId]).some(task => task.id === ids['오늘 A']));
  data.spaces[actorId].archivedDocumentIds.push(documentId);
  assert.deepEqual(programExecutionTasks(data.spaces[actorId]), []);
});

test('weekly ranges begin Monday and cross year boundaries correctly', () => {
  assert.deepEqual(programDateRange('week', '2026-09-14'), { from: '2026-09-14', to: '2026-09-20' });
  assert.deepEqual(programDateRange('week', '2026-09-13'), { from: '2026-09-07', to: '2026-09-13' });
  assert.deepEqual(programDateRange('week', '2027-01-01'), { from: '2026-12-28', to: '2027-01-03' });
});

test('month ranges cover leap years, century exceptions and December rollover', () => {
  for (const [date, last] of [['2024-02-29', '2024-02-29'], ['2025-02-20', '2025-02-28'], ['2000-02-10', '2000-02-29'], ['1900-02-10', '1900-02-28'], ['2026-04-30', '2026-04-30'], ['2026-12-31', '2026-12-31']]) {
    assert.deepEqual(programDateRange('month', date), { from: `${date.slice(0, 7)}-01`, to: last });
  }
  assert.deepEqual(programDateRange('month', '2026-02-29'), {});
});

test('day shifts cross leap/month/year edges without local DST drift', () => {
  assert.equal(programShiftDate('2024-03-01', -1), '2024-02-29');
  assert.equal(programShiftDate('2025-03-01', -1), '2025-02-28');
  assert.equal(programShiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(programShiftDate('2026-09-12', 0.5), '');
  assert.equal(programLocalDate(new Date(2026, 8, 12, 23, 59)), '2026-09-12');
  assert.equal(programShiftDate('9999-12-31', 1), '');
  assert.equal(programShiftDate('2026-09-12', Number.MAX_SAFE_INTEGER), '');
});

test('calendar-month shifts clamp month ends, leap years and both directions', () => {
  assert.equal(programShiftMonth('2026-01-31', 1), '2026-02-28');
  assert.equal(programShiftMonth('2024-01-31', 1), '2024-02-29');
  assert.equal(programShiftMonth('2024-03-31', -1), '2024-02-29');
  assert.equal(programShiftMonth('2026-03-31', -1), '2026-02-28');
  assert.equal(programShiftMonth('2026-05-31', -1), '2026-04-30');
  assert.equal(programShiftMonth('2024-02-29', 12), '2025-02-28');
  assert.equal(programShiftMonth('2000-01-31', 1), '2000-02-29');
  assert.equal(programShiftMonth('1900-01-31', 1), '1900-02-28');
});

test('calendar-month shifts cross years and preserve a valid day without using a thirty-day approximation', () => {
  assert.equal(programShiftMonth('2026-12-31', 1), '2027-01-31');
  assert.equal(programShiftMonth('2027-01-31', -1), '2026-12-31');
  assert.equal(programShiftMonth('2026-01-15', 14), '2027-03-15');
  assert.equal(programShiftMonth('2026-09-12', 0), '2026-09-12');
  assert.equal(programShiftMonth('2026-02-01', 1), '2026-03-01');
  assert.equal(programShiftMonth('2026-03-01', -1), '2026-02-01');
});

test('calendar-month shifts reject invalid and out-of-range inputs without throwing', () => {
  for (const [date, months] of [['2026-02-29', 1], ['invalid', 1], ['2026-09-12', 0.5], ['9999-12-31', 1], ['0000-01-01', -1], ['2026-09-12', Number.MAX_SAFE_INTEGER]] as const) {
    assert.equal(programShiftMonth(date, months), '');
  }
  assert.equal(programShiftMonth('0000-01-31', 1), '0000-02-29');
});

test('week/month keep strict boundaries while today also includes older incomplete tasks', () => {
  const initial = createProgramData();
  const result = accepted(createProgramDocument(initial, { ...base(initial), title: '월말', raw: '- [ ] 1월말\n  - 날짜: 2024-01-31\n- [ ] 2월첫날\n  - 날짜: 2024-02-01\n- [ ] 윤일\n  - 날짜: 2024-02-29\n- [ ] 3월첫날\n  - 날짜: 2024-03-01\n- [ ] 날짜없음' }));
  const space = result.data.spaces[actorId];
  assert.deepEqual(programExecutionTasks(space, { period: 'month', date: '2024-02-20' }).map(task => task.title), ['2월첫날', '윤일']);
  assert.deepEqual(programExecutionTasks(space, { period: 'today', date: '2024-02-29' }).map(task => task.title), ['1월말', '2월첫날', '윤일']);
  assert.deepEqual(programExecutionTasks(space, { period: 'week', date: '2024-02-29' }).map(task => task.title), ['윤일', '3월첫날']);
});

function continuingFixture(initial = createProgramData(), folderId?: string) {
  const result = accepted(createProgramDocument(initial, { ...base(initial), title: '계속하기 기록', folderId, raw:
    '- [ ] 지난달 미완료\n  - 날짜: 2026-08-31\n- [ ] 어제 미완료\n  - 날짜: 2026-09-11\n  - 메모: 전화로 확인\n- [x] 어제 완료\n  - 날짜: 2026-09-11\n- [ ] 오늘 미완료\n  - 날짜: 2026-09-12\n- [x] 오늘 완료\n  - 날짜: 2026-09-12\n- [ ] 내일 미완료\n  - 날짜: 2026-09-13\n- [x] 내일 완료\n  - 날짜: 2026-09-13\n- [ ] 날짜 미정' }));
  const ids = Object.fromEntries(M.tasks(result.data.spaces[actorId].text).map(task => [task.title, task.id]));
  return { data: result.data, documentId: result.result, ids };
}

test('today includes overdue incomplete and both current-day states, never undated/future/previously done', () => {
  const { data } = continuingFixture(), before = JSON.stringify(data), space = data.spaces[actorId];
  const tasks = programExecutionTasks(space, { period: 'today', date: '2026-09-12' });
  assert.deepEqual(tasks.map(task => task.title), ['지난달 미완료', '어제 미완료', '오늘 미완료', '오늘 완료']);
  assert.deepEqual(tasks.filter(task => programIsContinuingTask(task, '2026-09-12')).map(task => task.title), ['지난달 미완료', '어제 미완료']);
  assert.equal(tasks[1].date, '2026-09-11'); assert.equal(JSON.stringify(data), before);
  for (const date of [undefined, '', 'invalid', '2026-02-29']) assert.deepEqual(programExecutionTasks(space, { period: 'today', date }), []);
  assert.equal(programIsContinuingTask({ date: null, done: false }, '2026-09-12'), false);
  assert.equal(programIsContinuingTask({ date: '2026-09-11', done: false }, 'invalid'), false);
  assert.equal(programIsContinuingTask({ date: '2026-09-11', done: true }, '2026-09-12'), false);
});

test('completion and reopening change carryover visibility without shifting execution dates or prior progress', () => {
  let { data, ids } = continuingFixture(); const taskId = ids['어제 미완료'];
  data = accepted(recordProgramTaskProgress(data, { ...base(data), taskId, date: '2026-09-11', percent: 20 })).data;
  const priorRecords = programClone(data.spaces[actorId].text.progressRecords);
  const beforeRead = JSON.stringify(data);
  assert(programExecutionTasks(data.spaces[actorId], { period: 'today', date: '2026-09-12' }).some(task => task.id === taskId));
  assert.equal(JSON.stringify(data), beforeRead);
  const completed = accepted(completeProgramTask(data, { ...base(data), taskId, date: '2026-09-12', done: true })).data;
  assert(!programExecutionTasks(completed.spaces[actorId], { period: 'today', date: '2026-09-12' }).some(task => task.id === taskId));
  assert.equal(M.tasks(completed.spaces[actorId].text).find(task => task.id === taskId)?.date, '2026-09-11');
  assert.deepEqual(completed.spaces[actorId].text.progressRecords.filter(row => row.date === '2026-09-11'), priorRecords);
  const reopened = accepted(completeProgramTask(completed, { ...base(completed), taskId, date: '2026-09-12', done: false })).data;
  const restored = programExecutionTasks(reopened.spaces[actorId], { period: 'today', date: '2026-09-12' }).find(task => task.id === taskId);
  assert(restored); assert.equal(restored.date, '2026-09-11');
  assert.deepEqual(reopened.spaces[actorId].text.progressRecords.filter(row => row.date === '2026-09-11'), priorRecords);
});

test('today/week/month projections share canonical IDs and never transfer overdue tasks into another period', () => {
  const { data, ids } = continuingFixture(), before = programClone(data), space = data.spaces[actorId];
  const today = programExecutionTasks(space, { period: 'today', date: '2026-09-12' });
  const week = programExecutionTasks(space, { period: 'week', date: '2026-09-12' });
  const month = programExecutionTasks(space, { period: 'month', date: '2026-09-12' });
  assert(today.some(task => task.id === ids['지난달 미완료']));
  assert(!week.some(task => task.id === ids['지난달 미완료'])); assert(!month.some(task => task.id === ids['지난달 미완료']));
  for (const task of today.filter(task => task.date! >= '2026-09-01')) {
    assert.deepEqual(week.find(row => row.id === task.id), task); assert.deepEqual(month.find(row => row.id === task.id), task);
  }
  assert(week.some(task => task.id === ids['어제 완료'])); assert(week.some(task => task.id === ids['내일 미완료']));
  assert.deepEqual(data, before);
});

test('carryover preserves folder descendants, query matching, canonical reference dedup and archive/legacy exclusions', () => {
  const initial = createProgramData();
  const parent = accepted(createProgramFolder(initial, { ...base(initial), title: '생활' }));
  const child = accepted(createProgramFolder(parent.data, { ...base(parent.data), title: '전화', parentId: parent.result }));
  let { data, documentId, ids } = continuingFixture(child.data, child.result);
  const reference = accepted(createProgramDocument(data, { ...base(data), title: '참조 문서' })); data = reference.data;
  data = accepted(linkProgramTask(data, { ...base(data), documentId: reference.result, taskId: ids['어제 미완료'] })).data;
  const input = { period: 'today' as const, date: '2026-09-12', folderId: parent.result, query: '어제 미완료' };
  assert.deepEqual(programExecutionTasks(data.spaces[actorId], input).map(task => task.id), [ids['어제 미완료']]);
  assert.deepEqual(programExecutionTasks(data.spaces[actorId], { ...input, query: '검색 결과 없음' }), []);
  assert.deepEqual(programExecutionTasks(data.spaces[actorId], { ...input, folderId: 'unknown-folder' }), []);
  data.spaces[actorId].legacyTimelinePolicies[ids['어제 미완료']] = 'excluded';
  assert.deepEqual(programExecutionTasks(data.spaces[actorId], input), []);
  delete data.spaces[actorId].legacyTimelinePolicies[ids['어제 미완료']];
  data.spaces[actorId].archivedDocumentIds.push(documentId);
  assert.deepEqual(programExecutionTasks(data.spaces[actorId], { period: 'today', date: '2026-09-12' }), []);
});

test('a source item excluded from a copy stays excluded when its date becomes overdue', () => {
  let { data, copy } = copyFixture();
  const before = programClone(data.spaces[actorId].text);
  data = accepted(setProgramCopyInclusion(data, { ...base(data), copyId: copy.id, itemId: 'first', included: false })).data;
  assert.deepEqual(programExecutionTasks(data.spaces[actorId], { period: 'today', date: '2026-09-13' }).map(task => task.id), [copy.itemLines.second]);
  assert.deepEqual(data.spaces[actorId].text, before);
  const reloaded = JSON.parse(JSON.stringify(data)) as ProgramData; assert(validateProgramData(reloaded));
  assert.deepEqual(programExecutionTasks(reloaded.spaces[actorId], { period: 'today', date: '2026-09-13' }), programExecutionTasks(data.spaces[actorId], { period: 'today', date: '2026-09-13' }));
});
