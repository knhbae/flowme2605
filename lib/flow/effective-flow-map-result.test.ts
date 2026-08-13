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

test('undated source rows expose no source date entries', () => {
  const publishPackage = getPackage('middle-school-math-1');
  const mapSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const result = buildEffectiveFlowMapResult({ publishPackage, mapSnapshot });

  assert.deepEqual(result.sourceDateByItemId, {});
  assert.ok(result.editorRows.every((row) => row.schedule.state === 'unscheduled'));
});

test('dated source rows expose their projected dates by stable Map Item ID', () => {
  const publishPackage = getPackage('moving-d30');
  const mapSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const anchor = publishPackage.public.setupInput?.defaultValue;
  assert.ok(anchor);
  const result = buildEffectiveFlowMapResult({ publishPackage, mapSnapshot, anchor });

  assert.deepEqual(result.sourceDateByItemId, {
    [mapSnapshot.itemIds.canonical[0]!]: '2026-06-22',
    [mapSnapshot.itemIds.canonical[1]!]: '2026-07-08',
    [mapSnapshot.itemIds.canonical[2]!]: '2026-07-15',
    [mapSnapshot.itemIds.canonical[3]!]: '2026-07-21',
    [mapSnapshot.itemIds.canonical[4]!]: '2026-07-22',
  });
});

test('a fixed Map date override does not replace the projected source date entry', () => {
  const publishPackage = getPackage('moving-d30');
  const baseSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const itemId = baseSnapshot.itemIds.canonical[0]!;
  const mapSnapshot = reviseEffectiveFlowMapSnapshot(baseSnapshot, {
    itemPersonalizations: {
      [itemId]: { date: '2026-08-24' },
    },
  });
  const anchor = publishPackage.public.setupInput?.defaultValue;
  assert.ok(anchor);
  const before = JSON.stringify(mapSnapshot);
  const result = buildEffectiveFlowMapResult({ publishPackage, mapSnapshot, anchor });
  const shiftedResult = buildEffectiveFlowMapResult({
    publishPackage,
    mapSnapshot,
    anchor: '2026-08-05',
  });

  assert.equal(result.sourceDateByItemId[itemId], '2026-06-22');
  assert.deepEqual(
    result.editorRows.find((row) => row.id === itemId)?.schedule,
    { state: 'dated', date: '2026-08-24' },
  );
  assert.equal(shiftedResult.sourceDateByItemId[itemId], '2026-07-06');
  assert.deepEqual(
    shiftedResult.editorRows.find((row) => row.id === itemId)?.schedule,
    { state: 'dated', date: '2026-08-24' },
  );
  assert.equal(mapSnapshot.canonicalRows.find((row) => row.itemId === itemId)?.date, undefined);
  assert.equal(JSON.stringify(mapSnapshot), before);
});

test('OPIc choose_child projects one alternative while preserving Map and child identity', () => {
  const publishPackage = getPackage('curated-opic-mock-course');
  const baseSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  assert.equal(baseSnapshot.counts.canonical, 19);
  assert.equal(baseSnapshot.controller.saveMode, 'choose_child');
  const selectedSlug = publishPackage.public.childFlows[0]!.slug;
  const selectedItemIds = baseSnapshot.canonicalRows
    .filter((row) => row.flowSlug === selectedSlug)
    .map((row) => row.itemId);
  const mapSnapshot = reviseEffectiveFlowMapSnapshot(baseSnapshot, { selectedItemIds });
  const result = buildEffectiveFlowMapResult({
    publishPackage,
    mapSnapshot,
    anchor: publishPackage.public.setupInput?.defaultValue,
  });

  assert.equal(result.previewRows.length, 14);
  assert.deepEqual(result.previewRows.map((row) => row.id), selectedItemIds);
  assert.deepEqual(result.owner.childFlowSlugs, [
    'curated-opic-single-mock-review',
    'curated-opic-course-row-import',
  ]);
  assert.ok(result.previewRows.every((row) => row.section?.includes('오픽')));
  assert.equal(result.viewModel.all.find((candidate) => candidate.destination === 'calendar')?.outputCount, 14);
});

test('requested order and Item personalizations reach preview and editor rows without changing source identity', () => {
  const publishPackage = getPackage('middle-school-math-1');
  const sourceBefore = JSON.stringify(publishPackage);
  const baseSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const canonicalBefore = structuredClone(baseSnapshot.canonicalRows);
  const requestedItemIds = [
    baseSnapshot.itemIds.canonical[2]!,
    baseSnapshot.itemIds.canonical[0]!,
  ];
  const excludedItemIds = baseSnapshot.itemIds.canonical.filter(
    (itemId) => !requestedItemIds.includes(itemId),
  );
  const personalizedItemId = requestedItemIds[0]!;
  const mapSnapshot = reviseEffectiveFlowMapSnapshot(baseSnapshot, {
    selectedItemIds: requestedItemIds,
    itemPersonalizations: {
      [personalizedItemId]: {
        title: 'Review fractions in my order',
        detail: 'Retry the two questions I missed.',
        date: '2026-08-24',
      },
    },
  });
  const snapshotBeforeResult = JSON.stringify(mapSnapshot);
  const result = buildEffectiveFlowMapResult({ publishPackage, mapSnapshot });

  assert.deepEqual(result.previewRows.map((row) => row.id), requestedItemIds);
  assert.deepEqual(
    result.editorRows.map((row) => row.id),
    [...requestedItemIds, ...excludedItemIds],
  );
  assert.deepEqual(
    result.editorRows.map((row) => row.included),
    [true, true, ...excludedItemIds.map(() => false)],
  );
  assert.equal(result.previewRows[0]?.title, 'Review fractions in my order');
  assert.match(result.previewRows[0]?.memo ?? '', /Retry the two questions I missed\./u);
  assert.deepEqual(result.previewRows[0]?.schedule, {
    state: 'dated',
    date: '2026-08-24',
  });
  assert.ok(result.previewRows[0]?.eligibleShapes.includes('calendar'));
  assert.equal(
    result.viewModel.all.find((candidate) => candidate.destination === 'calendar')?.outputCount,
    1,
  );
  assert.equal(result.previewRows[0]?.id, personalizedItemId);
  assert.equal(result.previewRows[0]?.sourceItemId, personalizedItemId);
  assert.deepEqual(result.owner, {
    kind: 'flow_map',
    mapId: publishPackage.map.id,
    sourceVersion: publishPackage.map.version,
    snapshotHash: mapSnapshot.snapshotHash,
    childFlowSlugs: publishPackage.public.childFlows.map((child) => child.slug),
  });
  assert.deepEqual(mapSnapshot.canonicalRows, canonicalBefore);
  assert.equal(JSON.stringify(mapSnapshot), snapshotBeforeResult);
  assert.equal(JSON.stringify(publishPackage), sourceBefore);

  const previewRowBeforeEditorMutation = structuredClone(result.previewRows[0]);
  result.editorRows[0]!.schedule.date = '2030-01-01';
  result.editorRows[0]!.resources.push({
    label: 'test',
    url: 'https://example.com',
    type: 'source',
  });
  assert.deepEqual(result.previewRows[0], previewRowBeforeEditorMutation);
  assert.equal(JSON.stringify(mapSnapshot), snapshotBeforeResult);
});

test('editor rows retain every canonical Item and materialized detail while a Map is held', () => {
  const publishPackage = getPackage('middle-school-math-1');
  const baseSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'review_hold',
  });
  const firstItemId = baseSnapshot.itemIds.canonical[0]!;
  const mapSnapshot = reviseEffectiveFlowMapSnapshot(baseSnapshot, {
    itemPersonalizations: {
      [firstItemId]: { detail: 'Keep this private review note.' },
    },
  });
  const result = buildEffectiveFlowMapResult({ publishPackage, mapSnapshot });

  assert.deepEqual(result.previewRows, []);
  assert.deepEqual(
    result.editorRows.map((row) => row.id),
    mapSnapshot.itemIds.canonical,
  );
  assert.match(result.editorRows[0]?.memo ?? '', /Keep this private review note\./u);
  assert.equal(result.editorRows[0]?.sourceItemId, firstItemId);
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
      result.editorRows.map((row) => row.id),
      [...mapSnapshot.itemIds.effective, ...mapSnapshot.itemIds.excluded],
    );
    assert.deepEqual(
      result.viewModel.all
        .filter((candidate) => ['memo', 'checklist', 'calendar'].includes(candidate.destination))
        .map((candidate) => candidate.destination),
      ['memo', 'checklist', 'calendar'],
    );
  });
});
