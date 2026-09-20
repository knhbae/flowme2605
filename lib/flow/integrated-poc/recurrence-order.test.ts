import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { prepareProgramInitialData } from './legacy-entry';
import { programClone } from './contract';
import { programOrderedExecutionRows, reorderProgramExecutionTimeline } from './recurrence-order';
import { programExecutionTasks, reorderProgramTimeline } from './execution';
import { programRecurrencePeriodRows } from './recurrence-target';
import { programOccurrenceWindowFor, updateProgramOccurrenceExecution } from './recurrence-state';
const now = '2026-09-12T00:00:00.000Z';
const query = { period: 'today' as const, today: '2026-09-12', date: '2026-09-12' };
function fixture() {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'mixed-order', documentId: 'mixed-order-doc', revisionId: 'mixed-order-v1', committedAt: now,
    rawText: '# 함께 실행\n- [ ] A\n  - 날짜: 2026-09-12\n- [ ] B\n  - 날짜: 2026-09-12\n- [ ] C 반복\n  - 날짜: 2026-08-01\n  - 반복: 매일\n  - 반복 종료: 90회' });
  assert(made.ok); if (!made.ok) throw Error('fixture');
  return prepareProgramInitialData({ baseModel: { version: 1, flows: [made.flow] }, legacyState: createPersonalWorkspacePocState(now) }).data;
}
test('mixed move is one immutable transition; legacy ordinary reorder rebases ordinary slots without moving occurrences', () => {
  const data = fixture(), actorId = data.activeActorId, source = JSON.stringify(data), scope = { ...query, period: 'week' as const };
  const rows = programOrderedExecutionRows(data, scope).rows.filter(row => row.date === query.date);
  assert.equal(rows.length, 3); const [a, b, occurrence] = rows;
  const result = reorderProgramExecutionTimeline(data, { actorId, query: scope, targetKey: occurrence.key, beforeKey: b.key, expectedKeys: rows.map(row => row.key), expectedOrder: null });
  assert(result.ok && result.changed); if (!result.ok) return;
  assert.equal(JSON.stringify(data), source);
  assert.deepEqual(programOrderedExecutionRows(result.data, scope).rows.filter(row => row.date === query.date).map(row => row.key), [a.key, occurrence.key, b.key]);
  const space = result.data.spaces[actorId], tasks = programExecutionTasks(space).filter(task => task.date === query.date);
  const legacy = reorderProgramTimeline(result.data, { actorId, taskId: tasks[1].id, beforeTaskId: tasks[0].id, expectedIds: tasks.map(task => task.id) }); assert(legacy.ok); if (!legacy.ok) return;
  const beforeRead = JSON.stringify(legacy.data);
  assert.deepEqual(programOrderedExecutionRows(legacy.data, scope).rows.filter(row => row.date === query.date).map(row => row.key), [b.key, occurrence.key, a.key]);
  assert.equal(JSON.stringify(legacy.data), beforeRead);
  assert.equal(legacy.data.spaces[actorId].legacySnapshot?.raw, data.spaces[actorId].legacySnapshot?.raw);
});
test('mixed no-op, stale order, actor and cross-date target fail without changing data', () => {
  const data = fixture(), actorId = data.activeActorId, rows = programOrderedExecutionRows(data, query).rows;
  const target = rows.find(row => row.kind === 'text-task')!, keys = rows.filter(row => row.date === target.date).map(row => row.key);
  const input = { actorId, query, targetKey: target.key, beforeKey: target.key, expectedKeys: keys, expectedOrder: null };
  const noop = reorderProgramExecutionTimeline(data, input); assert(noop.ok && !noop.changed); assert.equal(noop.data, data);
  for (const patch of [{ actorId: 'other' }, { expectedKeys: [] }, { beforeKey: rows.find(row => row.date !== target.date)!.key }]) {
    const failed = reorderProgramExecutionTimeline(data, { ...input, ...patch }); assert.equal(failed.ok, false); assert.equal(failed.data, data);
  }
});
test('date changes discard stale display slots but retain other buckets and identity', () => {
  let data = fixture(); const actorId = data.activeActorId, scope = { ...query, period: 'week' as const }, rows = programOrderedExecutionRows(data, scope).rows.filter(row => row.date === query.date), occurrence = rows.find(row => row.kind === 'occurrence')!;
  assert(occurrence.kind === 'occurrence');
  const sorted = reorderProgramExecutionTimeline(data, { actorId, query: scope, targetKey: occurrence.key, beforeKey: rows[0].key, expectedKeys: rows.map(row => row.key), expectedOrder: null }); assert(sorted.ok); if (!sorted.ok) return; data = sorted.data;
  const orderBytes = JSON.stringify(data.spaces[actorId].executionTimelineOrders);
  const moved = updateProgramOccurrenceExecution(data, { actorId, flowRef: occurrence.row.identity.sourceFlowRef, localToday: query.today, identity: occurrence.row.identity, expected: occurrence.row.stored, window: programOccurrenceWindowFor(occurrence.row.identity), changes: { schedule: { mode: 'fixed_date', date: '2026-09-13' } } }); assert(moved.ok); if (!moved.ok) return;
  const visible = programOrderedExecutionRows(moved.data, scope).rows;
  assert(!visible.some(row => row.key === occurrence.key && row.date === query.date));
  assert.equal(visible.filter(row => row.key === occurrence.key).length, 1);
  assert.equal(JSON.stringify(moved.data.spaces[actorId].executionTimelineOrders), orderBytes);
});
test('Today carries past incomplete occurrences within an explicit bounded lookback without moving original dates', () => {
  let data = fixture(); const before = JSON.stringify(data), first = programRecurrencePeriodRows(data, query);
  assert(first.hasMore); assert(first.rows.some(row => row.originalDate === '2026-08-15')); assert(!first.rows.some(row => row.originalDate === '2026-08-14'));
  const extended = programRecurrencePeriodRows(data, { ...query, page: 1 }); assert(extended.rows.some(row => row.originalDate === '2026-08-01')); assert(!extended.hasMore); assert.equal(JSON.stringify(data), before);
  const row = first.rows[0], change = updateProgramOccurrenceExecution(data, { actorId: data.activeActorId, flowRef: row.identity.sourceFlowRef, localToday: query.today, identity: row.identity, expected: row.stored, window: programOccurrenceWindowFor(row.identity), changes: { completion: { status: 'completed', completedAt: now } } }); assert(change.ok); if (!change.ok) return; data = change.data;
  assert(!programRecurrencePeriodRows(data, query).rows.some(next => next.key === row.key));
  assert(programRecurrencePeriodRows(data, { ...query, period: 'month', date: row.originalDate }).rows.some(next => next.key === row.key && next.executionDate === row.originalDate));
  const current = programRecurrencePeriodRows(data, { ...query, period: 'month', date: row.originalDate }).rows.find(next => next.key === row.key)!;
  const reopen = updateProgramOccurrenceExecution(data, { actorId: data.activeActorId, flowRef: current.identity.sourceFlowRef, localToday: query.today, identity: current.identity, expected: current.stored, window: programOccurrenceWindowFor(current.identity), changes: { completion: { status: 'open', completedAt: null } } }); assert(reopen.ok); if (reopen.ok) assert(programRecurrencePeriodRows(reopen.data, query).rows.some(next => next.key === row.key));
});
