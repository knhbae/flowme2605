import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';
import { programExecutionDayPresentation, readProgramTaskDatePresentation } from './execution-presentation';
import { programTextExecutionKey, type ProgramOrderedExecutionRow } from './recurrence-order';
import type { ProgramExecutionOccurrenceRow } from './recurrence-state';

function fixture(raw: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '날짜 출처' });
  const documentId = state.documents[0].id;
  state = M.editText(state, documentId, raw);
  assert.equal(M.raw(M.getDocument(state, documentId)), raw);
  assert(M.validate(state));
  return { state, tasks: M.tasks(state), documentId };
}
function textRows(tasks: ReturnType<typeof M.tasks>): ProgramOrderedExecutionRow[] {
  return tasks.map(task => ({ kind: 'text-task', key: programTextExecutionKey(task), date: task.date, task }));
}
function occurrence(date: string, completed = false): ProgramOrderedExecutionRow {
  // A presentation fixture supplies only the occurrence fields this reader consumes.
  const row = { executionDate: date, completion: completed ? 'completed' : 'unrecorded' } as ProgramExecutionOccurrenceRow;
  return { kind: 'occurrence', key: 'occurrence-' + date + '-' + completed, date, row };
}

test('Today annotates contiguous mixed rows without sorting, merging titles or changing entry identity', () => {
  const f = fixture('- [ ] 같은 할 일\n  - 날짜: 2026-09-30\n  - 메모: 첫 기록\n- [ ] 같은 할 일\n  - 날짜: 2026-10-02\n  - 메모: 다른 기록');
  const ordinary = textRows(f.tasks), oldOccurrence = occurrence('2026-10-01');
  const rows = [ordinary[0], oldOccurrence, ordinary[1], occurrence('2026-10-02', true)];
  const before = JSON.stringify(rows), stateBefore = JSON.stringify(f.state);
  const result = programExecutionDayPresentation(rows, 'today', '2026-10-02', '2026-10-02');
  assert.deepEqual(result.map(row => row.heading), ['지난 미완료', null, '오늘', null]);
  assert.deepEqual(result.map(row => row.group), ['past-incomplete', 'past-incomplete', 'on-date', 'on-date']);
  result.forEach((row, index) => assert.equal(row.entry, rows[index]));
  assert.deepEqual(result.map(row => row.entry.key), rows.map(row => row.key));
  assert.equal(JSON.stringify(rows), before);
  assert.equal(JSON.stringify(f.state), stateBefore);
  assert.notEqual(f.tasks[0].id, f.tasks[1].id);
  assert.deepEqual(f.tasks.map(task => task.note), ['첫 기록', '다른 기록']);
});

test('past completed, future and undated entries are preserved without calling them past incomplete', () => {
  const f = fixture('- [x] 지난 완료\n  - 날짜: 2026-10-01\n- [ ] 미래\n  - 날짜: 2026-10-03\n- [ ] 날짜 없음');
  const rows = [...textRows(f.tasks), occurrence('2026-10-01', true)];
  const result = programExecutionDayPresentation(rows, 'today', '2026-10-02', '2026-10-02');
  assert(result.every(row => row.group === null && row.heading === null));
  result.forEach((row, index) => assert.equal(row.entry, rows[index]));
});

test('other periods and an invalid query do not add Today grouping or reinterpret pagination', () => {
  const rows = [occurrence('2026-10-01'), occurrence('2026-10-02')];
  for (const period of ['documents', 'week', 'month', 'all', 'undated'] as const) {
    const result = programExecutionDayPresentation(rows, period, '2026-10-02', '2026-10-02');
    assert(result.every(row => row.heading === null && row.group === null));
    result.forEach((row, index) => assert.equal(row.entry, rows[index]));
  }
  assert(programExecutionDayPresentation(rows, 'today', '2026-02-30', '2026-10-02').every(row => row.heading === null));
  assert.deepEqual(programExecutionDayPresentation([], 'today', '2026-10-02', '2026-10-02'), []);
});

test('a changed query date is named as the query, and noncontiguous buckets stay in their supplied order', () => {
  const rows = [occurrence('2026-10-01'), occurrence('2026-09-30'), occurrence('2026-10-01')];
  const result = programExecutionDayPresentation(rows, 'today', '2026-10-01', '2026-10-02');
  assert.deepEqual(result.map(row => row.heading), ['조회 날짜 · 2026-10-01', '지난 미완료', '조회 날짜 · 2026-10-01']);
  assert.deepEqual(result.map(row => row.entry.key), rows.map(row => row.key));
});

test('actual section, differing individual and matching individual dates are read without writes', () => {
  const f = fixture('[2026-10-01]\n- [ ] 구획을 따름\n- [ ] 다른 날짜\n  - 날짜: 2026-10-03\n- [ ] 같은 날짜\n  - 날짜: 2026-10-01');
  const before = JSON.stringify(f.state);
  const result = f.tasks.map(task => readProgramTaskDatePresentation(f.state, task));
  assert.deepEqual(result, [
    { source: 'section', effectiveDate: '2026-10-01', sectionDate: '2026-10-01', label: '구획 날짜 · 2026-10-01', context: null },
    { source: 'individual', effectiveDate: '2026-10-03', sectionDate: '2026-10-01', label: '개별 날짜 · 2026-10-03', context: '구획 날짜 · 2026-10-01' },
    { source: 'individual', effectiveDate: '2026-10-01', sectionDate: '2026-10-01', label: '개별 날짜 · 2026-10-01', context: null },
  ]);
  assert.equal(JSON.stringify(f.state), before);
});

test('explicit individual undated, [미정], and no section retain different existing sources', () => {
  const f = fixture('- [ ] 구획 밖\n[2026-10-01]\n- [ ] 개별 미정\n  - 날짜: 미정\n[미정]\n- [ ] 구획 미정\n- [ ] 구획 미정의 예외\n  - 날짜: 2026-10-04');
  const result = f.tasks.map(task => readProgramTaskDatePresentation(f.state, task));
  assert.deepEqual(result.map(row => row?.source), ['unscheduled', 'individual', 'section', 'individual']);
  assert.equal(result[1]?.label, '개별 날짜 · 미정');
  assert.equal(result[1]?.context, '구획 날짜 · 2026-10-01');
  assert.equal(result[2]?.label, '구획 날짜 · 미정');
  assert.equal(result[3]?.context, '구획 날짜 · 미정');
  assert.deepEqual(f.tasks.map(task => task.date), [null, null, null, '2026-10-04']);
});

test('changing a section and removing an override are existing model operations, never presentation mutations', () => {
  const f = fixture('[2026-10-01]\n- [ ] 구획 항목\n- [ ] 개별 항목\n  - 날짜: 2026-10-03');
  const changed = M.editText(f.state, f.documentId, '[2026-10-02]\n- [ ] 구획 항목\n- [ ] 개별 항목\n  - 날짜: 2026-10-03');
  const tasks = M.tasks(changed), before = JSON.stringify(changed);
  assert.deepEqual(tasks.map(task => task.id), f.tasks.map(task => task.id));
  assert.deepEqual(tasks.map(task => task.date), ['2026-10-02', '2026-10-03']);
  assert.equal(readProgramTaskDatePresentation(changed, tasks[1])?.context, '구획 날짜 · 2026-10-02');
  assert.equal(JSON.stringify(changed), before);
  const restored = M.restoreTaskDate(changed, tasks[1].id), restoredTask = M.tasks(restored)[1];
  assert.equal(restoredTask.date, '2026-10-02');
  assert.equal(readProgramTaskDatePresentation(restored, restoredTask)?.source, 'section');
  assert.deepEqual(restored.progressRecords, f.state.progressRecords);
});

test('moved task keeps its pinned existing date and exposes the differing source section', () => {
  const f = fixture('[2026-10-01]\n- [ ] A\n- [ ] B');
  const moved = M.editText(f.state, f.documentId, '[2026-10-01]\n- [ ] B\n[2026-10-02]\n- [ ] A');
  const task = M.tasks(moved).find(row => row.id === f.tasks[0].id)!;
  assert.equal(task.date, '2026-10-01');
  assert.equal(task.groupDate, '2026-10-02');
  assert.equal(readProgramTaskDatePresentation(moved, task)?.label, '개별 날짜 · 2026-10-01');
  assert.equal(readProgramTaskDatePresentation(moved, task)?.context, '구획 날짜 · 2026-10-02');
});

test('missing, mismatched, reference or invalid date sources do not invent a date origin', () => {
  const f = fixture('[2026-10-01]\n- [ ] 항목');
  assert.equal(readProgramTaskDatePresentation(f.state, { id: 'missing', docId: f.documentId }), null);
  assert.equal(readProgramTaskDatePresentation(f.state, { id: f.tasks[0].id, docId: 'missing' }), null);
  for (const raw of ['[2026-99-99]\n- [ ] 잘못된 구획', '- [ ] 잘못된 개별 날짜\n  - 날짜: 2026-99-99']) {
    const bad = fixture(raw);
    assert.equal(readProgramTaskDatePresentation(bad.state, bad.tasks[0]), null);
  }
  const linked = M.addDocument(f.state, { title: '참조 문서' }), linkedId = linked.documents[linked.documents.length - 1].id;
  const referenceState = M.linkTask(linked, linkedId, 0, f.tasks[0].id);
  const reference = referenceState.bindings.find(binding => binding.kind === 'task' && binding.docId === linkedId)!;
  assert(reference);
  assert.equal(readProgramTaskDatePresentation(referenceState, { docId: linkedId, id: reference.lineId }), null);
});
