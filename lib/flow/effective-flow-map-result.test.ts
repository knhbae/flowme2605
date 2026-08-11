import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEffectiveFlowMapSnapshot,
  reviseEffectiveFlowMapSnapshot,
} from './effective-flow-map-snapshot';
import { buildEffectiveFlowMapResult } from './effective-flow-map-result';
import { buildSourceBackedFlowMapPublishPackage } from './source-backed-my-flow';

function getPackage(mapId: string) {
  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  assert.ok(publishPackage, `missing publish package ${mapId}`);
  return publishPackage;
}

test('middle-school save_all uses one approved result model without changing Map identity', () => {
  const publishPackage = getPackage('middle-school-math-1');
  const mapSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
    sourceLabel: '원문 보기',
  });
  const before = JSON.stringify(mapSnapshot);
  const result = buildEffectiveFlowMapResult({ publishPackage, mapSnapshot });

  assert.deepEqual(result.owner, {
    kind: 'flow_map',
    mapId: 'middle-school-math-1',
    sourceVersion: publishPackage.map.version,
    snapshotHash: mapSnapshot.snapshotHash,
    childFlowSlugs: ['source-backed-middle-school-math-1'],
  });
  assert.equal('snapshot' in result, false);
  assert.equal(result.previewRows.length, 8);
  assert.deepEqual(
    result.previewRows.map((row) => row.id),
    mapSnapshot.itemIds.effective,
  );
  assert.deepEqual(
    result.viewModel.all
      .filter((candidate) => ['memo', 'checklist', 'calendar'].includes(candidate.destination))
      .map((candidate) => candidate.destination),
    ['memo', 'checklist', 'calendar'],
  );
  assert.equal(result.viewModel.all.find((candidate) => candidate.destination === 'checklist')?.outputCount, 8);
  assert.equal(result.viewModel.all.find((candidate) => candidate.destination === 'calendar')?.outputCount, 0);
  assert.ok(result.previewRows.every((row) => !row.section?.includes('Mathbang')));
  assert.equal(JSON.stringify(mapSnapshot), before);
});

test('multi-child save_all preserves child order, canonical IDs, and selected subset', () => {
  const publishPackage = getPackage('curated-opic-mock-course');
  const baseSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  assert.equal(baseSnapshot.counts.canonical, 19);
  const selectedItemIds = baseSnapshot.itemIds.canonical.filter((_, index) => index !== 3);
  const mapSnapshot = reviseEffectiveFlowMapSnapshot(baseSnapshot, { selectedItemIds });
  const result = buildEffectiveFlowMapResult({
    publishPackage,
    mapSnapshot,
    anchor: publishPackage.public.setupInput?.defaultValue,
  });

  assert.equal(result.previewRows.length, 18);
  assert.deepEqual(result.previewRows.map((row) => row.id), selectedItemIds);
  assert.deepEqual(result.owner.childFlowSlugs, [
    'curated-opic-single-mock-review',
    'curated-opic-course-row-import',
  ]);
  assert.ok(result.previewRows.every((row) => row.section?.includes('오픽')));
  assert.equal(result.viewModel.all.find((candidate) => candidate.destination === 'calendar')?.outputCount, 18);
});

test('choose_child can project one child without becoming a save_all snapshot', () => {
  const publishPackage = getPackage('curated-allblanc-workout-park');
  const baseSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const selectedSlug = publishPackage.public.childFlows[1]!.slug;
  const selectedItemIds = baseSnapshot.canonicalRows
    .filter((row) => row.flowSlug === selectedSlug)
    .map((row) => row.itemId);
  const selectedSnapshot = reviseEffectiveFlowMapSnapshot(baseSnapshot, { selectedItemIds });
  const result = buildEffectiveFlowMapResult({
    publishPackage,
    mapSnapshot: selectedSnapshot,
  });

  assert.equal(selectedSnapshot.controller.saveMode, 'choose_child');
  assert.equal(result.previewRows.length, 1);
  assert.equal(result.previewRows[0]?.id, selectedItemIds[0]);
  assert.equal(result.owner.mapId, publishPackage.map.id);
});

test('every directly rendered executable Map has a complete approved result projection', () => {
  const renderedMapIds = [
    'middle-school-math-1',
    'curated-opic-mock-course',
    'curated-reading-routine-log',
    'curated-new-car-purchase-guide',
    'postal-address-transfer',
    'aircon-filter-cleaning',
    'curated-wedding-checklist-family',
    'curated-allblanc-workout-park',
  ];

  renderedMapIds.forEach((mapId) => {
    const publishPackage = getPackage(mapId);
    const mapSnapshot = buildEffectiveFlowMapSnapshot({
      publishPackage,
      executionState: 'executable',
    });
    const result = buildEffectiveFlowMapResult({ publishPackage, mapSnapshot });

    assert.equal(result.owner.mapId, mapId);
    assert.equal(result.previewRows.length, mapSnapshot.counts.effective);
    assert.deepEqual(
      result.previewRows.map((row) => row.id),
      mapSnapshot.itemIds.effective,
    );
    assert.deepEqual(
      result.viewModel.all
        .filter((candidate) => ['memo', 'checklist', 'calendar'].includes(candidate.destination))
        .map((candidate) => candidate.destination),
      ['memo', 'checklist', 'calendar'],
    );
  });
});
