import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { partitionProgramLegacyCapabilities } from './legacy-capabilities';
import { prepareProgramInitialData } from './legacy-entry';
import { textWorkspaceModel as M } from './text-workspace';
import { readProgramExecutionOccurrences } from './recurrence-state';
const now = '2026-09-12T00:00:00.000Z';
test('mixed same-Flow source retains exact snapshot, normal checkbox, series metadata and stable source bindings', () => {
  const raw = '# 혼합 원문\r\n- [ ] 일반 준비\r\n  - 날짜: 2026-09-15\r\n- [ ] 반복 준비\r\n  - 날짜: 2026-09-12\r\n  - 반복: 매일\r\n  - 반복 종료: 3회';
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'mixed-cap', documentId: 'mixed-doc', revisionId: 'mixed-v1', committedAt: now, rawText: raw });
  assert(made.ok); if (!made.ok) return;
  const payload = { model: { version: 1 as const, flows: [made.flow] }, state: createPersonalWorkspacePocState(now) }, before = JSON.stringify(payload);
  const partition = partitionProgramLegacyCapabilities(payload); assert(partition.ok); if (!partition.ok) return;
  assert.deepEqual(partition.items.map(item => item.capability), ['ordinary', 'series']); assert(partition.items[1].seriesId);
  const initial = prepareProgramInitialData({ baseModel: payload.model, legacyState: payload.state }), space = initial.data.spaces['local-user'];
  assert(initial.projected); assert.equal(space.legacySnapshot?.raw, before); assert.equal(JSON.stringify(payload), before);
  const binding = space.savedBindings[0]; assert.equal(Object.keys(binding.itemLines).length, 2);
  const tasks = M.tasks(space.text); assert.equal(tasks.length, 1); assert.equal(tasks[0].title, '일반 준비');
  assert(!tasks.some(task => task.id === binding.itemLines[partition.items[1].itemRef]));
  const series = readProgramExecutionOccurrences(initial.data, { actorId: 'local-user', flowRef: made.flow.ref, localToday: '2026-09-12' });
  assert(series.ok); if (series.ok) { assert.equal(series.rows.length, 3); assert.equal(series.rows[0].seriesId, partition.items[1].seriesId); }
  const rerun = prepareProgramInitialData({ baseModel: payload.model, legacyState: payload.state });
  assert.deepEqual(rerun.data.spaces['local-user'].savedBindings, space.savedBindings);
});
test('invalid whole snapshot cannot become a valid partial projection by dropping its broken Item', () => {
  const state = createPersonalWorkspacePocState(now);
  const payload = { model: { version: 1 as const, flows: [{ ref: 'invalid' }] }, state };
  assert.equal(partitionProgramLegacyCapabilities(payload as never).ok, false);
  const initial = prepareProgramInitialData({ baseModel: payload.model as never, legacyState: state });
  assert.equal(initial.projected, false); assert.equal(initial.data.spaces['local-user'].legacySnapshot, null);
});
