import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEffectiveFlowMapSnapshot,
  reviseEffectiveFlowMapSnapshot,
} from './effective-flow-map-snapshot';
import { buildEffectiveFlowMapResult } from './effective-flow-map-result';
import {
  buildSourceBackedFlowMapPublishPackage,
  sourceBackedMyFlowBundles,
} from './source-backed-my-flow';

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
  assert.ok(result.previewRows.every((row) => row.section === '2주 계획표'));
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

test('Map Text syntax keeps effective order while restoring canonical source grammar', () => {
  const publishPackage = getPackage('middle-school-math-1');
  const baseSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const selectedItemIds = [
    baseSnapshot.itemIds.canonical[2]!,
    baseSnapshot.itemIds.canonical[0]!,
  ];
  const mapSnapshot = reviseEffectiveFlowMapSnapshot(baseSnapshot, {
    effectiveTitle: '내 중1 수학 순서',
    selectedItemIds,
  });
  const result = buildEffectiveFlowMapResult({ publishPackage, mapSnapshot });
  const syntaxRows = result.textSyntaxModel.groups.flatMap((group) => group.rows);

  assert.equal(result.textSyntaxModel.title, '내 중1 수학 순서');
  assert.deepEqual(syntaxRows.map((row) => row.id), selectedItemIds);
  assert.equal(syntaxRows[0]?.scheduleMode, 'unscheduled');
  assert.match(syntaxRows[0]?.why ?? '', /원문 목차/u);
  assert.match(syntaxRows[0]?.how ?? '', /^-/u);
  assert.match(syntaxRows[0]?.done ?? '', /메모했습니다/u);
  assert.ok(syntaxRows[0]?.resources.some((resource) => resource.type === 'reference'));
  assert.equal(syntaxRows[0]?.personalDetail, undefined);
});

test('Map Text syntax preserves source D-offsets and labels only real Map overrides as personal', () => {
  const publishPackage = getPackage('moving-d30');
  const baseSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const itemId = baseSnapshot.itemIds.canonical[0]!;
  const mapSnapshot = reviseEffectiveFlowMapSnapshot(baseSnapshot, {
    itemPersonalizations: {
      [itemId]: {
        title: '내 이사 방식 확인',
        detail: '가족과 비교한 견적 화면을 함께 확인한다.',
        date: '2026-08-24',
      },
    },
  });
  const result = buildEffectiveFlowMapResult({
    publishPackage,
    mapSnapshot,
    anchor: '2030-01-10',
  });
  const syntaxRows = result.textSyntaxModel.groups.flatMap((group) => group.rows);
  const personalized = syntaxRows.find((row) => row.id === itemId);

  assert.equal(personalized?.title, '내 이사 방식 확인');
  assert.equal(personalized?.scheduleMode, 'fixed_override');
  assert.equal(personalized?.fixedDate, '2026-08-24');
  assert.equal(personalized?.timing, undefined);
  assert.equal(personalized?.personalDetail, '가족과 비교한 견적 화면을 함께 확인한다.');
  assert.match(personalized?.why ?? '', /견적 비교/u);

  const sourceOnly = syntaxRows.find((row) => row.id !== itemId && row.timing);
  assert.ok(sourceOnly);
  assert.equal(sourceOnly.scheduleMode, 'source_relative');
  assert.match(sourceOnly.timing ?? '', /^D/u);
  assert.equal(sourceOnly.personalDetail, undefined);
});

test('choose-child Map Text syntax contains only the selected child source rows', () => {
  const publishPackage = getPackage('curated-opic-mock-course');
  const baseSnapshot = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const selectedSlug = publishPackage.public.childFlows[1]!.slug;
  const selectedItemIds = baseSnapshot.canonicalRows
    .filter((row) => row.flowSlug === selectedSlug)
    .map((row) => row.itemId);
  const mapSnapshot = reviseEffectiveFlowMapSnapshot(baseSnapshot, { selectedItemIds });
  const result = buildEffectiveFlowMapResult({ publishPackage, mapSnapshot });
  const syntaxRows = result.textSyntaxModel.groups.flatMap((group) => group.rows);

  assert.equal(result.textSyntaxModel.title, publishPackage.map.title);
  assert.deepEqual(syntaxRows.map((row) => row.id), selectedItemIds);
  assert.ok(syntaxRows.every((row) => row.sourceItemId.startsWith(`${selectedSlug}::`)));
  assert.ok(result.textSyntaxModel.groups.every((group) => group.section === '1달 반복 계획'));

  const combinedResult = buildEffectiveFlowMapResult({
    publishPackage,
    mapSnapshot: baseSnapshot,
  });
  assert.ok(combinedResult.previewRows.some(
    (row) => row.section === '오픽 모의고사 2주 계획표 · 2주 계획표',
  ));
  assert.ok(combinedResult.previewRows.some(
    (row) => row.section === '오픽 모의고사 1달 반복 계획 · 1달 반복 계획',
  ));
});

test('choose-child switch isolates Text warnings to the effective child source', () => {
  const publishPackage = getPackage('curated-opic-mock-course');
  const [firstChild, secondChild] = publishPackage.public.childFlows;
  assert.ok(firstChild && secondChild);
  const firstBundle = sourceBackedMyFlowBundles.find((bundle) => bundle.flow.slug === firstChild.slug);
  const secondBundle = sourceBackedMyFlowBundles.find((bundle) => bundle.flow.slug === secondChild.slug);
  assert.ok(firstBundle && secondBundle);
  const firstWarnings = firstBundle.warnings;
  const secondWarnings = secondBundle.warnings;

  try {
    firstBundle.warnings = ['선택한 2주 계획 경고'];
    secondBundle.warnings = ['선택하지 않은 1달 계획 경고'];
    const baseSnapshot = buildEffectiveFlowMapSnapshot({
      publishPackage,
      executionState: 'executable',
    });
    const selectChild = (slug: string) => reviseEffectiveFlowMapSnapshot(baseSnapshot, {
      selectedItemIds: baseSnapshot.canonicalRows
        .filter((row) => row.flowSlug === slug)
        .map((row) => row.itemId),
    });

    const firstResult = buildEffectiveFlowMapResult({
      publishPackage,
      mapSnapshot: reviseEffectiveFlowMapSnapshot(selectChild(firstChild.slug), {
        effectiveTitle: firstChild.title,
      }),
    });
    assert.equal(firstResult.textSyntaxModel.title, firstChild.title);
    assert.ok(firstResult.textSyntaxModel.warnings.includes('선택한 2주 계획 경고'));
    assert.ok(!firstResult.textSyntaxModel.warnings.includes('선택하지 않은 1달 계획 경고'));

    const secondResult = buildEffectiveFlowMapResult({
      publishPackage,
      mapSnapshot: reviseEffectiveFlowMapSnapshot(selectChild(secondChild.slug), {
        effectiveTitle: secondChild.title,
      }),
    });
    assert.equal(secondResult.textSyntaxModel.title, secondChild.title);
    assert.ok(secondResult.textSyntaxModel.warnings.includes('선택하지 않은 1달 계획 경고'));
    assert.ok(!secondResult.textSyntaxModel.warnings.includes('선택한 2주 계획 경고'));
  } finally {
    firstBundle.warnings = firstWarnings;
    secondBundle.warnings = secondWarnings;
  }
});
