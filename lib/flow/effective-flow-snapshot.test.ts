import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEffectiveFlowSnapshot } from './effective-flow-snapshot';
import { setFlowItemPersonalExclusion } from './flow-item-state';
import { resolvePublicDateIntent } from './public-date-intent';
import { seedBundles } from './seed-flows';
import { sourceBackedMyFlowBundles } from './source-backed-my-flow';
import type { FlowBundle, FlowItemState } from './types';

function bySlug(slug: string): FlowBundle {
  const bundle = [...seedBundles, ...sourceBackedMyFlowBundles].find(
    (entry) => entry.flow.slug === slug,
  );
  assert.ok(bundle, `missing fixture ${slug}`);
  return bundle;
}

function dateIntent(
  bundle: FlowBundle,
  mode: 'custom' | 'undated' | 'example',
  customAnchor = '',
  exampleAnchor = '2030-08-15',
) {
  return resolvePublicDateIntent({
    anchorType: bundle.flow.anchor_type,
    mode,
    customAnchor,
    exampleAnchor,
  });
}

test('example date keeps an illustrative calendar separate from the committed checklist', () => {
  const bundle = bySlug('moving-d30-basic');
  const sourceBefore = JSON.stringify(bundle);
  const snapshot = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: '우리 집 이사 준비',
    dateIntent: dateIntent(bundle, 'example'),
  });

  assert.equal(snapshot.illustrative?.selectedShape, 'calendar');
  assert.equal(snapshot.illustrative?.counts.calendar, 24);
  assert.equal(snapshot.illustrative?.counts.dated, 24);
  assert.equal(snapshot.committed.selectedShape, 'checklist');
  assert.equal(snapshot.committed.selectedArtifactMode, 'checklist');
  assert.deepEqual(snapshot.committed.counts, {
    total: 24,
    dated: 0,
    undated: 24,
    calendar: 0,
  });
  assert.deepEqual(snapshot.savedFlowRecordInput, {
    personalTitle: '우리 집 이사 준비',
    selectedArtifactMode: 'checklist',
    dateIntent: 'undated',
  });
  assert.equal(snapshot.identity.flowSlug, 'moving-d30-basic');
  assert.ok(snapshot.sourceVersion);
  assert.equal(JSON.stringify(bundle), sourceBefore);
});

test('custom date gives the committed result the same full calendar truth', () => {
  const bundle = bySlug('moving-d30-basic');
  const snapshot = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
  });

  assert.equal(snapshot.illustrative, undefined);
  assert.equal(snapshot.committed.selectedShape, 'calendar');
  assert.equal(snapshot.committed.selectedArtifactMode, 'calendar');
  assert.equal(snapshot.committed.counts.total, 24);
  assert.equal(snapshot.committed.counts.calendar, 24);
  assert.equal(snapshot.committed.counts.dated, 24);
  assert.equal(snapshot.committed.counts.undated, 0);
  assert.ok(
    snapshot.committed.rows.every((row) => Boolean(row.schedule.date)),
  );
  assert.deepEqual(snapshot.savedFlowRecordInput, {
    personalTitle: bundle.flow.title,
    selectedArtifactMode: 'calendar',
    dateIntent: 'custom',
    anchor: '2030-09-01',
  });
});

test('effective title, item values, exclusion, and order share one committed row set', () => {
  const bundle = bySlug('moving-d30-basic');
  const [first, second, third] = bundle.items;
  assert.ok(first && second && third);
  const excludedFirst = setFlowItemPersonalExclusion(undefined, true);
  assert.ok(excludedFirst);
  const itemStates: Record<string, FlowItemState> = {
    [first.id]: excludedFirst,
  };
  const snapshot = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: '우리 집 이사 실행',
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
    itemStates,
    orderOverride: [third.id, second.id, first.id],
    publicItemPersonalizations: {
      [second.id]: {
        title: '우리 집 견적 확정',
        detail: '가족과 최종 업체를 확인합니다.',
        date: '2030-08-15',
      },
    },
  });

  assert.equal(snapshot.effectiveTitle, '우리 집 이사 실행');
  assert.equal(snapshot.committed.projection.title, '우리 집 이사 실행');
  assert.equal(snapshot.committed.rows[0]?.id, third.id);
  assert.equal(snapshot.committed.rows[1]?.id, second.id);
  assert.equal(snapshot.committed.excludedRows[0]?.id, first.id);
  const personalized = snapshot.committed.rows.find(
    (row) => row.id === second.id,
  );
  assert.equal(personalized?.title, '우리 집 견적 확정');
  assert.equal(personalized?.memo, '가족과 최종 업체를 확인합니다.');
  assert.equal(personalized?.schedule.date, '2030-08-15');
  assert.equal(personalized?.sourceItemId, second.id);
  assert.equal(snapshot.committed.counts.total, 23);
});

test('mixed fixed and undated item overrides expose honest result counts', () => {
  const bundle = bySlug('vehicle-inspection-prep');
  const [datedItem, undatedItem] = bundle.items;
  assert.ok(datedItem && undatedItem);
  const snapshot = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'undated'),
    publicItemPersonalizations: {
      [datedItem.id]: { date: '2030-10-10' },
      [undatedItem.id]: { date: null },
    },
  });

  assert.equal(snapshot.committed.counts.total, bundle.items.length);
  assert.equal(snapshot.committed.counts.dated, 1);
  assert.equal(snapshot.committed.counts.undated, bundle.items.length - 1);
  assert.equal(snapshot.committed.counts.calendar, 1);
  assert.equal(snapshot.committed.selectedShape, 'checklist');
});

test('completion changes row state without changing membership or result counts', () => {
  const bundle = bySlug('moving-d30-basic');
  const completedItemId = bundle.items[0]?.id;
  assert.ok(completedItemId);
  const baseOptions = {
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
  };
  const pending = buildEffectiveFlowSnapshot(baseOptions);
  const completed = buildEffectiveFlowSnapshot({
    ...baseOptions,
    completedItemIds: [completedItemId],
  });

  assert.deepEqual(completed.committed.counts, pending.committed.counts);
  assert.deepEqual(
    completed.committed.rows.map((row) => row.id),
    pending.committed.rows.map((row) => row.id),
  );
  assert.equal(
    pending.committed.rows.find((row) => row.id === completedItemId)?.completed,
    false,
  );
  assert.equal(
    completed.committed.rows.find((row) => row.id === completedItemId)?.completed,
    true,
  );
});

test('source, personal, and execution layers have independent deterministic identities', () => {
  const bundle = bySlug('moving-d30-basic');
  const completedItemId = bundle.items[0]?.id;
  assert.ok(completedItemId);
  const base = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
    personalLayerState: 'persisted',
  });
  const personalized = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: '내 이사 Flow',
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
    personalLayerState: 'persisted',
  });
  const completed = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
    personalLayerState: 'persisted',
    completedItemIds: [completedItemId],
    completionEnabled: true,
  });

  assert.equal(base.layers.source.version, personalized.layers.source.version);
  assert.equal(base.layers.source.version, completed.layers.source.version);
  assert.notEqual(base.layers.personal.version, personalized.layers.personal.version);
  assert.equal(base.layers.personal.version, completed.layers.personal.version);
  assert.notEqual(base.layers.execution.version, completed.layers.execution.version);
  assert.equal(base.layers.personal.state, 'persisted');
  assert.deepEqual(base.layers.source.itemIds, bundle.items.map((item) => item.id));
  assert.equal(completed.committed.capabilities.canComplete, true);
});

test('item state identity keeps personal order separate from execution note, skip, and overlays', () => {
  const bundle = bySlug('moving-d30-basic');
  const itemId = bundle.items[0]?.id;
  assert.ok(itemId);
  const options = {
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
  };
  const base = buildEffectiveFlowSnapshot(options);
  const executionChanged = buildEffectiveFlowSnapshot({
    ...options,
    itemStates: {
      [itemId]: { skipped: true, note: '이번 회차는 건너뜀' },
    },
  });
  const personalChanged = buildEffectiveFlowSnapshot({
    ...options,
    itemStates: {
      [itemId]: { personalOrder: 3 },
    },
  });
  const overlayChanged = buildEffectiveFlowSnapshot({
    ...options,
    executionOverlayIdentity: {
      runHistoryVersion: 'run-history:v2',
    },
  });

  assert.equal(base.layers.personal.version, executionChanged.layers.personal.version);
  assert.notEqual(base.layers.execution.version, executionChanged.layers.execution.version);
  assert.notEqual(base.layers.personal.version, personalChanged.layers.personal.version);
  assert.equal(base.layers.execution.version, personalChanged.layers.execution.version);
  assert.equal(base.layers.personal.version, overlayChanged.layers.personal.version);
  assert.notEqual(base.layers.execution.version, overlayChanged.layers.execution.version);
});

test('meal plan slots are canonical effective rows instead of an empty item result', () => {
  const bundle = bySlug('baby-food-menu-recipe');
  const slots = bundle.mealSlots ?? [];
  assert.equal(slots.length, 11);
  const snapshot = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: '우리 아이 이유식 Flow',
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
    itemStates: {
      [slots[1]!.id]: { personalExcluded: true },
    },
    orderOverride: [slots[2]!.id, slots[0]!.id, slots[1]!.id],
    publicItemPersonalizations: {
      [slots[0]!.id]: {
        title: '첫 쌀미음',
        detail: '첫 섭취 반응을 기록합니다.',
        date: '2030-10-10',
      },
    },
  });

  assert.equal(snapshot.committed.counts.total, 10);
  assert.equal(snapshot.committed.counts.dated, 10);
  assert.equal(snapshot.committed.counts.calendar, 10);
  assert.deepEqual(snapshot.layers.source.itemIds, slots.map((slot) => slot.id));
  assert.equal(snapshot.committed.rows[0]?.id, slots[2]?.id);
  assert.equal(snapshot.committed.excludedRows[0]?.id, slots[1]?.id);
  const personalized = snapshot.committed.rows.find((row) => row.id === slots[0]?.id);
  assert.equal(personalized?.title, '첫 쌀미음');
  assert.equal(personalized?.memo, '첫 섭취 반응을 기록합니다.');
  assert.equal(personalized?.schedule.date, '2030-10-10');
});

test('calendar, checklist, sheet, memo, and routine shapes share the resolved contract', () => {
  const fixtures = [
    { slug: 'moving-d30-basic', mode: 'custom' as const, shape: 'calendar' },
    { slug: 'vehicle-inspection-prep', mode: 'undated' as const, shape: 'checklist' },
    { slug: 'fridge-cleanout-weekly-plan', mode: 'custom' as const, shape: 'sheet' },
    { slug: 'job-change-risk-check', mode: 'undated' as const, shape: 'memo' },
    { slug: 'washer-tub-clean-monthly', mode: 'custom' as const, shape: 'flow_execution' },
  ] as const;

  for (const fixture of fixtures) {
    const bundle = bySlug(fixture.slug);
    const snapshot = buildEffectiveFlowSnapshot({
      bundle,
      effectiveTitle: bundle.flow.title,
      dateIntent: dateIntent(
        bundle,
        fixture.mode,
        fixture.mode === 'custom' ? '2030-09-01' : '',
      ),
    });
    assert.equal(snapshot.committed.selectedShape, fixture.shape, fixture.slug);
    assert.equal(snapshot.committed.exportPlan.formats.checklist.outputCount, snapshot.committed.counts.total);
    assert.equal(snapshot.committed.exportPlan.formats.sheet.preservesItemOrder, true);
    assert.equal(snapshot.committed.exportPlan.formats.memo.preservesItemOrder, true);
    assert.equal(snapshot.committed.capabilities.hasDirectSource, Boolean(bundle.flow.source_url));
  }
});

test('memo remains the committed artifact mode after a saved-row round trip', () => {
  const bundle = bySlug('job-change-risk-check');
  const initial = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'undated'),
  });

  assert.equal(initial.committed.selectedShape, 'memo');
  assert.equal(initial.committed.selectedArtifactMode, 'memo');
  assert.equal(initial.savedFlowRecordInput.selectedArtifactMode, 'memo');

  const restored = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'undated'),
    resolvedRows: {
      included: initial.committed.rows,
      excluded: initial.committed.excludedRows,
      selectedArtifactMode: initial.committed.selectedArtifactMode,
    },
  });

  assert.equal(restored.committed.selectedShape, 'memo');
  assert.equal(restored.committed.selectedArtifactMode, 'memo');
  assert.deepEqual(
    restored.committed.rows.map((row) => row.id),
    initial.committed.rows.map((row) => row.id),
  );
});

test('format omissions and date state are explicit instead of inferred by each consumer', () => {
  const bundle = bySlug('moving-d30-basic');
  const provisional = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'example'),
  });
  assert.equal(provisional.illustrative?.dateState, 'provisional');
  assert.equal(provisional.illustrative?.capabilities.canSave, false);
  assert.equal(provisional.committed.dateState, 'undated');
  assert.equal(provisional.committed.capabilities.canSave, false);
  assert.equal(provisional.committed.exportPlan.formats.calendar.supported, false);
  assert.equal(
    provisional.committed.exportPlan.formats.calendar.omittedItemIds.length,
    provisional.committed.counts.total,
  );
  assert.match(
    provisional.committed.exportPlan.formats.calendar.omissionReason ?? '',
    /날짜 없는 항목/,
  );
});

test('routine calendar declares unsupported per-item fields instead of claiming full parity', () => {
  const bundle = bySlug('washer-tub-clean-monthly');
  const snapshot = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: '내 세탁조 관리 Flow',
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
    publicItemPersonalizations: Object.fromEntries(bundle.items.map((item, index) => [
      item.id,
      {
        title: `개인화 ${index + 1}`,
        detail: `개인 메모 ${index + 1}`,
        date: `2030-10-${String(index + 1).padStart(2, '0')}`,
      },
    ])),
    orderOverride: bundle.items.map((item) => item.id).reverse(),
  });
  const calendar = snapshot.committed.exportPlan.formats.calendar;

  assert.equal(calendar.supported, true);
  assert.equal(calendar.outputCount, 1);
  assert.equal(calendar.preservesItemOrder, false);
  assert.deepEqual(
    calendar.omittedFields.map((omission) => omission.field),
    ['item_title', 'item_detail', 'item_date', 'item_inclusion', 'item_order'],
  );
  assert.ok(calendar.omittedFields.every((omission) => omission.itemIds.length > 0));
  assert.ok(calendar.omittedFields.every((omission) => omission.reason.length > 0));
  assert.deepEqual(snapshot.committed.exportPlan.formats.sheet.omittedFields, []);
});

test('validated resolved rows rebuild shapes, order, counts, and persisted artifact mode without mutating inputs', () => {
  const bundle = bySlug('moving-d30-basic');
  const legacy = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
  });
  const [sourceFirst, sourceSecond, sourceThird] = structuredClone(
    legacy.committed.rows.slice(0, 3),
  );
  assert.ok(sourceFirst && sourceSecond && sourceThird);
  const resolvedRows = {
    included: [
      { ...sourceFirst, title: '두 번째 실행', orderRank: 20, completed: true },
      { ...sourceSecond, title: '첫 번째 실행', orderRank: 10 },
    ],
    excluded: [
      { ...sourceThird, included: false, orderRank: 5 },
    ],
    selectedArtifactMode: 'checklist' as const,
    personalOverlayIdentity: {
      mapCopyVersion: 'map-copy:v2',
      orderedItemIds: [sourceSecond.id, sourceFirst.id],
    },
  };
  const bundleBefore = JSON.stringify(bundle);
  const rowsBefore = JSON.stringify(resolvedRows);

  const snapshot = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: '저장한 이사 Flow',
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
    personalLayerState: 'persisted',
    completionEnabled: true,
    resolvedRows,
  });

  assert.deepEqual(
    snapshot.committed.rows.map((row) => row.id),
    [sourceSecond.id, sourceFirst.id],
  );
  assert.deepEqual(
    snapshot.committed.excludedRows.map((row) => row.id),
    [sourceThird.id],
  );
  assert.equal(snapshot.committed.selectedShape, 'checklist');
  assert.equal(snapshot.committed.selectedArtifactMode, 'checklist');
  assert.equal(snapshot.savedFlowRecordInput.selectedArtifactMode, 'checklist');
  assert.equal(snapshot.committed.counts.total, 2);
  assert.equal(snapshot.committed.projection.shapes.checklist.count, 2);
  assert.deepEqual(snapshot.layers.execution.completedItemIds, [sourceFirst.id]);
  assert.equal(JSON.stringify(bundle), bundleBefore);
  assert.equal(JSON.stringify(resolvedRows), rowsBefore);

  snapshot.committed.rows[0]!.title = '출력 객체만 변경';
  snapshot.committed.rows[0]!.schedule.date = '2040-01-01';
  assert.equal(resolvedRows.included[1]?.title, '첫 번째 실행');
  assert.notEqual(resolvedRows.included[1]?.schedule.date, '2040-01-01');
});

test('resolved rows reject duplicate or overlapping stable ids and included partition mismatches', () => {
  const bundle = bySlug('moving-d30-basic');
  const legacy = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
  });
  const row = structuredClone(legacy.committed.rows[0]);
  assert.ok(row);
  const build = (resolvedRows: NonNullable<Parameters<typeof buildEffectiveFlowSnapshot>[0]['resolvedRows']>) =>
    buildEffectiveFlowSnapshot({
      bundle,
      effectiveTitle: bundle.flow.title,
      dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
      resolvedRows,
    });

  assert.throws(
    () => build({ included: [row, structuredClone(row)], excluded: [] }),
    /Duplicate resolved stable id/,
  );
  assert.throws(
    () => build({
      included: [row],
      excluded: [{ ...structuredClone(row), included: false }],
    }),
    /overlaps included and excluded/,
  );
  assert.throws(
    () => build({ included: [{ ...row, included: false }], excluded: [] }),
    /included flag mismatch/,
  );
  assert.throws(
    () => build({ included: [{ ...row, id: ' ' }], excluded: [] }),
    /stable non-blank id/,
  );
});

test('resolved personal and JSON-safe execution read-model identities change only their owned layer', () => {
  const bundle = bySlug('moving-d30-basic');
  const legacy = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
  });
  const rows = structuredClone(legacy.committed.rows.slice(0, 2));
  const build = (personalRevision: number, executionRevision: number) =>
    buildEffectiveFlowSnapshot({
      bundle,
      effectiveTitle: bundle.flow.title,
      dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
      personalLayerState: 'persisted',
      resolvedRows: {
        included: rows,
        excluded: [],
        personalOverlayIdentity: {
          revision: personalRevision,
          stores: ['item-drafts', 'map-personal-copy'],
        },
      },
      executionOverlayIdentity: {
        readModelIdentity: {
          revision: executionRevision,
          checks: { [rows[0]!.id]: false },
          occurrences: [],
        },
      },
    });

  const base = build(1, 1);
  const personalChanged = build(2, 1);
  const executionChanged = build(1, 2);

  assert.equal(base.layers.source.version, personalChanged.layers.source.version);
  assert.equal(base.layers.source.version, executionChanged.layers.source.version);
  assert.notEqual(base.layers.personal.version, personalChanged.layers.personal.version);
  assert.equal(base.layers.execution.version, personalChanged.layers.execution.version);
  assert.equal(base.layers.personal.version, executionChanged.layers.personal.version);
  assert.notEqual(base.layers.execution.version, executionChanged.layers.execution.version);
});

test('resolved overlay identities reject non-JSON values', () => {
  const bundle = bySlug('moving-d30-basic');
  const legacy = buildEffectiveFlowSnapshot({
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
  });
  const rows = structuredClone(legacy.committed.rows.slice(0, 1));
  const options = {
    bundle,
    effectiveTitle: bundle.flow.title,
    dateIntent: dateIntent(bundle, 'custom', '2030-09-01'),
  };

  assert.throws(
    () => buildEffectiveFlowSnapshot({
      ...options,
      resolvedRows: {
        included: rows,
        excluded: [],
        personalOverlayIdentity: { invalid: undefined } as never,
      },
    }),
    /JSON-safe/,
  );
  assert.throws(
    () => buildEffectiveFlowSnapshot({
      ...options,
      resolvedRows: { included: rows, excluded: [] },
      executionOverlayIdentity: {
        readModelIdentity: { invalid: Number.NaN } as never,
      },
    }),
    /finite JSON numbers/,
  );
});
