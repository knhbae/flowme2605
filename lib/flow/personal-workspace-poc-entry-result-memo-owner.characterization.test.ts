import assert from 'node:assert/strict';
import test from 'node:test';
import type { FlowBundle } from './types';
import { buildPersonalWorkspacePocReadModel } from './personal-workspace-poc-read-model';
import { getPersonalWorkspacePocFlowItemFieldOwnership } from './personal-workspace-poc-contract';
import { buildPersonalWorkspacePocSourceReadIndex } from './personal-workspace-poc-source-attributes';
import { buildPersonalWorkspacePocResultProjection } from './personal-workspace-poc-result-projection';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';

// C1 shared Result characterization; deliberately separate from the new read-packet contract.
// No replacement Result implementation or expected-failure suppression.
test('C1-MEMO-RED a genuine saved legacy source-only description must not become a personal Result memo', () => {
  const now = '2026-09-05T00:00:00.000Z', description = '원문에서만 제공한 설명';
  const bundle: FlowBundle = {
    flow: { id: 'entry-legacy-source', slug: 'entry-legacy-source', title: '기존 원문', category: '테스트',
      structure_type: 'timeline', anchor_type: 'start_date', status: 'published', created_at: now, updated_at: now },
    sections: [{ id: 'source-section', flow_id: 'entry-legacy-source', title: '원문 구간', order: 0 }],
    items: [{ id: 'source-item', flow_id: 'entry-legacy-source', section_id: 'source-section', title: '원문 항목',
      description, type: 'calendar', day_offset: 0, order: 0 }],
  };
  const values = { 'flow:saved:entry-legacy-source': JSON.stringify({ slug: 'entry-legacy-source', savedAt: now,
    selectedArtifactMode: 'calendar', dateIntent: 'custom', anchor: '2026-09-05' }) };
  let writes = 0;
  const storage = { length: 1, key: (index: number) => Object.keys(values)[index] ?? null,
    getItem: (key: string) => values[key as keyof typeof values] ?? null,
    setItem() { writes++; }, removeItem() { writes++; }, clear() { writes++; } };
  const before = JSON.stringify({ values, bundle }), read = buildPersonalWorkspacePocReadModel(storage, [bundle]);
  assert.ok(read.ok); const flow = read.model.flows[0], item = flow.items[0];
  assert.equal(flow.origin, 'legacy-saved-plan');
  const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
  assert.equal(ownership.description.source.value, description); assert.equal(ownership.description.effective.owner, 'source');
  const index = buildPersonalWorkspacePocSourceReadIndex({ baseModel: read.model }); assert.ok(index.ok);
  const result = buildPersonalWorkspacePocResultProjection({ model: read.model, state: createPersonalWorkspacePocState(now),
    sourceIndex: index.index, flowRef: flow.ref, localToday: '2026-09-05', purpose: 'personal-execution' });
  assert.ok(result.ok); assert.equal(JSON.stringify({ values, bundle }), before); assert.equal(writes, 0);
  assert.equal(result.projection.items[0].memo, undefined, 'source-only description is not an existing-personal or PoC-personal memo');
});
