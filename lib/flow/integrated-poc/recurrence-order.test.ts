import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData, validateProgramData } from './program-data';
import { addProgramQuickTask, createProgramDocument, updateProgramTask } from './private-space';
import { programOrderedExecutionRows, reorderProgramExecutionTimeline } from './recurrence-order';
import type { ProgramData } from './contract';

const day = '2026-10-30', today = '2026-10-29';
const query = { period: 'week' as const, date: today, today, folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 };
let request = 0;
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `order-${++request}`, expectedSpace: data.spaces[data.activeActorId] });
function withTasks(tasks: [title: string, time: string][]) {
  let data = createProgramData();
  const created = createProgramDocument(data, { ...base(data), title: '순서' }); assert(created.ok); data = created.data;
  for (const [title, time] of tasks) {
    const added = addProgramQuickTask(data, { ...base(data), documentId: created.result, title, date: day }); assert(added.ok); data = added.data;
    if (time) { const timed = updateProgramTask(data, { ...base(data), taskId: added.result, patch: { time } }); assert(timed.ok); data = timed.data; }
  }
  assert(validateProgramData(data));
  return data;
}
const titles = (data: ProgramData) => programOrderedExecutionRows(data, query).rows.map(row => row.kind === 'text-task' ? row.task.title : row.row.title);

test('a day nobody ordered by hand runs by time, with untimed rows last in writing order', () => {
  assert.deepEqual(titles(withTasks([['메모 정리', ''], ['견적서 보내기', '16:00'], ['견적 비교표', '10:00'], ['우유 사기', '']])),
    ['견적 비교표', '견적서 보내기', '메모 정리', '우유 사기']);
});

test('a hand-made order wins over time, and the move itself starts from what the list showed', () => {
  const data = withTasks([['메모 정리', ''], ['견적서 보내기', '16:00'], ['견적 비교표', '10:00']]);
  const rows = programOrderedExecutionRows(data, query).rows;
  const moved = reorderProgramExecutionTimeline(data, { actorId: data.activeActorId, query, targetKey: rows[2].key, beforeKey: rows[0].key,
    expectedKeys: rows.map(row => row.key), expectedOrder: null });
  assert(moved.ok);
  assert.deepEqual(titles(moved.data), ['메모 정리', '견적 비교표', '견적서 보내기']);
  // A new timed task on that day joins after the hand-made order instead of reshuffling it.
  let next = moved.data;
  const doc = next.spaces[next.activeActorId].text.documents.find(entry => entry.title === '순서')!;
  const added = addProgramQuickTask(next, { ...base(next), documentId: doc.id, title: '아침 회의', date: day }); assert(added.ok); next = added.data;
  const timed = updateProgramTask(next, { ...base(next), taskId: added.result, patch: { time: '08:00' } }); assert(timed.ok);
  assert.deepEqual(titles(timed.data), ['메모 정리', '견적 비교표', '견적서 보내기', '아침 회의']);
});
