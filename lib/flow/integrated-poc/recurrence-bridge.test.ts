import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectProgramRecurrence } from './recurrence-bridge';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState, applyPersonalWorkspacePocTransition } from '../personal-workspace-poc-state';
import { PERSONAL_WORKSPACE_POC_VERSION } from '../personal-workspace-poc-contract';
import { buildPersonalWorkspacePocResultProjection } from '../personal-workspace-poc-result-projection';

const now = '2026-09-12T00:00:00.000Z';
function fixture(end = '3회') {
  const materialized = materializePersonalWorkspacePocAuthoring({ handoffId: 'recurrence-bridge-handoff', documentId: 'recurrence-bridge-doc', revisionId: 'recurrence-bridge-v1', committedAt: now,
    rawText: '# 반복 Flow\r\n- [x] 아침 준비\r\n  - 날짜: 2026-09-03\r\n  - 시간: 07:30\r\n  - 반복: 매일' + (end ? `\r\n  - 반복 종료: ${end}` : '') });
  assert(materialized.ok); if (!materialized.ok) throw new Error('fixture');
  const snapshot = { model: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [materialized.flow] }, state: createPersonalWorkspacePocState(now) };
  const input = { flowRef: materialized.flow.ref, localToday: '2026-09-12' };
  return { snapshot, input };
}
test('actual projection and occurrence expander share stable IDs without copying source checked into completion', () => {
  const { snapshot, input } = fixture(), before = JSON.stringify(snapshot);
  const result = inspectProgramRecurrence(snapshot, input); assert(result.ok); if (!result.ok) return;
  const actual = buildPersonalWorkspacePocResultProjection({ ...snapshot, ...input }); assert(actual.ok); if (!actual.ok) return;
  assert.deepEqual(result.rows.map(row => row.occurrenceId), actual.projection.occurrenceIds);
  assert.equal(result.rows.length, 3); assert(result.rows.every(row => row.completion === 'unrecorded'));
  assert(result.rows.every(row => row.time === '07:30'));
  assert.deepEqual(result, inspectProgramRecurrence(JSON.parse(before), input));
  assert.equal(JSON.stringify(snapshot), before);
  assert(result.sourceSnapshotRaw.includes('\\r\\n'));
});
test('real owner transitions move, complete and reopen one occurrence without changing its tuple or source', () => {
  const { snapshot, input } = fixture(); const source = JSON.stringify(snapshot.model);
  const initial = inspectProgramRecurrence(snapshot, input); assert(initial.ok); if (!initial.ok) return;
  const first = initial.rows[0], identity = { occurrenceId: first.occurrenceId, sourceItemRef: first.sourceItemRef, originalDate: first.originalDate };
  snapshot.state = applyPersonalWorkspacePocTransition(snapshot.state, { type: 'move-occurrence-date', ...identity, date: '2026-10-01', now }).state;
  snapshot.state = applyPersonalWorkspacePocTransition(snapshot.state, { type: 'complete-occurrence', ...identity, completed: true, now }).state;
  const completed = inspectProgramRecurrence(snapshot, input); assert(completed.ok); if (!completed.ok) return;
  assert.equal(completed.rows[0].key, first.key); assert.equal(completed.rows[0].executionDate, '2026-10-01');
  assert.equal(completed.rows[0].completion, 'completed');
  const page = inspectProgramRecurrence(snapshot, { ...input, window: { finiteOffset: 1, finiteLimit: 2 } });
  assert(page.ok); if (!page.ok) return;
  assert.deepEqual(page.outsideWindowExceptionIds, [first.occurrenceId]);
  snapshot.state = applyPersonalWorkspacePocTransition(snapshot.state, { type: 'complete-occurrence', ...identity, completed: false, now }).state;
  const reopened = inspectProgramRecurrence(snapshot, input); assert(reopened.ok); if (reopened.ok) assert.equal(reopened.rows[0].completion, 'open');
  assert.equal(JSON.stringify(snapshot.model), source);
});
test('open series windows are bounded, disjoint pages with stable overlapping identities', () => {
  const { snapshot, input } = fixture('');
  const first = inspectProgramRecurrence(snapshot, input), second = inspectProgramRecurrence(snapshot, { ...input, window: { windowOffsetWeeks: 4, windowWeeks: 4 } });
  assert(first.ok && second.ok); if (!first.ok || !second.ok) return;
  assert.equal(first.rows.length, 28); assert.equal(second.rows.length, 28);
  assert(first.series[0].manifest.hasMore); assert(second.series[0].manifest.hasMore);
  assert(!second.rows.some(row => first.rows.some(old => old.key === row.key)));
  const overlap = inspectProgramRecurrence(snapshot, { ...input, window: { windowWeeks: 8 } });
  assert(overlap.ok); if (overlap.ok) assert.deepEqual(overlap.rows.slice(0, 28).map(row => row.key), first.rows.map(row => row.key));
  assert.deepEqual(first.unsupportedCapabilities, ['per-occurrence-hold', 'per-occurrence-exclusion', 'persist-expanded-window']);
});
test('invalid or excessive windows and corrupt foreign identity fail without mutations', () => {
  const { snapshot, input } = fixture(), before = JSON.stringify(snapshot);
  for (const window of [{ finiteLimit: 10001 }, { windowWeeks: 1000 }, { finiteOffset: -1 }, { windowOffsetWeeks: 0.5 }]) assert.equal(inspectProgramRecurrence(snapshot, { ...input, window }).ok, false);
  const corrupt = { ...snapshot, model: { ...snapshot.model, flows: snapshot.model.flows.map(flow => ({ ...flow, items: flow.items.map(item => ({ ...item, savedCopyId: 'foreign' })) })) } };
  assert.equal(inspectProgramRecurrence(corrupt, input).ok, false);
  assert.equal(JSON.stringify(snapshot), before);
});

test('undated execution is an explicit exception, not a cancelled recurrence or hold', () => {
  const { snapshot, input } = fixture(); const first = inspectProgramRecurrence(snapshot, input); assert(first.ok); if (!first.ok) return;
  const row = first.rows[0];
  snapshot.state = applyPersonalWorkspacePocTransition(snapshot.state, { type: 'move-occurrence-date', occurrenceId: row.occurrenceId, sourceItemRef: row.sourceItemRef, originalDate: row.originalDate, now }).state;
  const next = inspectProgramRecurrence(snapshot, input); assert(next.ok); if (!next.ok) return;
  assert.equal(next.rows[0].executionDate, null); assert.equal(next.rows[0].executionScheduleMode, 'unscheduled');
  assert.equal(next.rows[0].originalDate, row.originalDate); assert.equal(next.rows.length, 3);
  assert.deepEqual(next.calendar.find(cell => cell.date === null)?.occurrenceIds, [row.occurrenceId]);
});

test('actual routine horizon bounds preview only and never invents a recurrence end', () => {
  const { snapshot, input } = fixture('');
  const horizonSource = { flow: { id: 'routine', slug: 'routine', title: '반복 Flow', category: '테스트', structure_type: 'routine' as const,
    anchor_type: 'start_date' as const, status: 'published' as const, created_at: now, updated_at: now, routine_duration_days: 14 } };
  const before = JSON.stringify(horizonSource), result = inspectProgramRecurrence(snapshot, { ...input, horizonSource });
  assert(result.ok); if (!result.ok) return;
  assert.equal(result.rows.length, 14); assert.equal(result.series[0].manifest.mode, 'open-ended');
  assert.equal(result.series[0].manifest.rule.end, undefined); assert.equal(JSON.stringify(horizonSource), before);
});
