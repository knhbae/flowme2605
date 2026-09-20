import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { prepareProgramInitialData } from './legacy-entry';
import { programClone } from './contract';
import { textWorkspaceModel as M } from './text-workspace';
import { programPreservesSeriesMetadata, programRecurrencePeriodRows, programSeriesMetadata } from './recurrence-target';
import { programOccurrenceWindowFor, updateProgramOccurrenceExecution } from './recurrence-state';
const now = '2026-09-12T00:00:00.000Z';
export function recurrenceUiFixture() {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'ui-repeat', documentId: 'ui-repeat-doc', revisionId: 'ui-repeat-v1', committedAt: now,
    rawText: '# 같이 쓰기\n- [ ] 일반 할 일\n  - 날짜: 2026-09-12\n- [ ] 반복할 일\n  - 날짜: 2026-09-12\n  - 반복: 매일\n  - 반복 종료: 60회' });
  assert(made.ok); if (!made.ok) throw Error('fixture');
  const initial = prepareProgramInitialData({ baseModel: { version: 1, flows: [made.flow] }, legacyState: createPersonalWorkspacePocState(now) }); assert(initial.projected); return initial.data;
}
test('mixed document preserves series-only metadata while ordinary title/progress and free memo remain editable', () => {
  const data = recurrenceUiFixture(), space = data.spaces[data.activeActorId], metadata = programSeriesMetadata(space); assert.equal(metadata.length, 1);
  const task = M.tasks(space.text)[0], edited = M.updateTask(space.text, task.id, { title: '일반 수정' });
  assert(programPreservesSeriesMetadata(space, edited));
  const doc = M.getDocument(edited, metadata[0].documentId)!;
  const withMemo = M.editText(edited, doc.id, `${M.raw(doc)}\n개인 자유 메모`); assert(programPreservesSeriesMetadata(space, withMemo));
  const tampered = programClone(withMemo), target = M.getDocument(tampered, doc.id)!;
  target.lines.find(line => line.id === metadata[0].lineId)!.text = '- [ ] 반복을 일반 체크로 바꾸기';
  assert.equal(programPreservesSeriesMetadata(space, tampered), false);
  const removed = programClone(withMemo); M.getDocument(removed, doc.id)!.lines = M.getDocument(removed, doc.id)!.lines.filter(line => line.id !== metadata[0].lineId);
  assert.equal(programPreservesSeriesMetadata(space, removed), false);
});
test('period UI selector shares same occurrence identity through move/complete/hold/restore and filters', () => {
  let data = recurrenceUiFixture(); const input = { period: 'today' as const, date: '2026-09-12', today: '2026-09-12' };
  let row = programRecurrencePeriodRows(data, input).rows[0]; const identity = row.identity;
  const change = (changes: Parameters<typeof updateProgramOccurrenceExecution>[1]['changes']) => {
    const result = updateProgramOccurrenceExecution(data, { actorId: data.activeActorId, flowRef: row.identity.sourceFlowRef, localToday: input.today, window: programOccurrenceWindowFor(row.identity), identity: row.identity, expected: row.stored, changes });
    assert(result.ok); if (result.ok) data = result.data;
  };
  change({ schedule: { mode: 'fixed_date', date: '2027-01-03' }, completion: { status: 'completed', completedAt: now } });
  row = programRecurrencePeriodRows(data, { ...input, date: '2027-01-03' }).rows[0]; assert.deepEqual(row.identity, identity); assert.equal(row.completion, 'completed');
  change({ participation: 'held' }); assert.equal(programRecurrencePeriodRows(data, { ...input, date: '2027-01-03' }).rows.length, 0);
  row = programRecurrencePeriodRows(data, { ...input, date: '2027-01-03', includeHeld: true }).rows[0];
  change({ participation: 'included', schedule: { mode: 'unscheduled', date: null }, completion: { status: 'open', completedAt: null } });
  const undated = programRecurrencePeriodRows(data, { ...input, period: 'undated' }); assert.equal(undated.rows[0].key, row.key); assert.equal(undated.rows[0].completedAt, null);
  assert.equal(programRecurrencePeriodRows(data, { ...input, period: 'undated', query: '없는 검색어' }).rows.length, 0);
});
