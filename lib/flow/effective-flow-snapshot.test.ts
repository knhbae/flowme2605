import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EFFECTIVE_FLOW_FORMAT_LOSS_SCHEMA,
  buildEffectiveFlowProjectionManifest,
  inspectLegacyFlowCompatibility,
} from './effective-flow-contract';
import {
  P0_CONTRACT_FLOW_BUNDLE,
  P0_CONTRACT_FLOW_ITEM_IDS,
  P0_FLOW_MAP_CONTRACT_FIXTURES,
  P0_LEGACY_SAVED_FLOW_FIXTURES,
  P0_MATH_FLOW_SLUG,
  P0_ROLE_RICH_FLOW_BUNDLE,
  P0_ROLE_RICH_ITEM_IDS,
} from './effective-flow-contract.fixtures';
import { buildEffectiveFlowSnapshot } from './effective-flow-snapshot';
import { buildFlowExportScopePlan } from './export-scope';
import {
  buildFlowMapSaveStorageKeyPlan,
  runFlowMapSaveTransaction,
} from './flow-map-save-transaction';
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

test('P0 contract fixtures classify all-dated, all-undated, and mixed Calendar results without fake dates', () => {
  const buildFixture = (
    mode: 'custom' | 'undated',
    publicItemPersonalizations: Parameters<typeof buildEffectiveFlowSnapshot>[0]['publicItemPersonalizations'] = {},
  ) => buildEffectiveFlowSnapshot({
    bundle: P0_CONTRACT_FLOW_BUNDLE,
    effectiveTitle: P0_CONTRACT_FLOW_BUNDLE.flow.title,
    dateIntent: resolvePublicDateIntent({
      anchorType: P0_CONTRACT_FLOW_BUNDLE.flow.anchor_type,
      mode,
      customAnchor: mode === 'custom' ? '2030-09-01' : '',
      exampleAnchor: '',
    }),
    publicItemPersonalizations,
  });

  const dated = buildFixture('custom');
  const datedCalendar = buildEffectiveFlowProjectionManifest({
    snapshot: dated,
    consumer: 'public_preview',
    destination: 'calendar',
    snapshotKind: 'effective_authoring',
  });
  assert.deepEqual(datedCalendar.eligibleItemIds, [...P0_CONTRACT_FLOW_ITEM_IDS]);
  assert.deepEqual(datedCalendar.heldItemIds, []);
  assert.equal(datedCalendar.counts.output, 3);
  assert.equal(datedCalendar.availability, 'available');

  const undated = buildFixture('undated');
  const undatedCalendar = buildEffectiveFlowProjectionManifest({
    snapshot: undated,
    consumer: 'public_preview',
    destination: 'calendar',
    snapshotKind: 'effective_authoring',
  });
  assert.deepEqual(undatedCalendar.eligibleItemIds, []);
  assert.deepEqual(undatedCalendar.heldItemIds, [...P0_CONTRACT_FLOW_ITEM_IDS]);
  assert.equal(undatedCalendar.counts.output, 0);
  assert.equal(undatedCalendar.availability, 'conditional');
  assert.ok(undated.committed.rows.every((row) => row.schedule.date === undefined));

  const mixed = buildFixture('undated', {
    'p0-contract-item-a': { date: '2030-09-05' },
  });
  const mixedCalendar = buildEffectiveFlowProjectionManifest({
    snapshot: mixed,
    consumer: 'public_preview',
    destination: 'calendar',
    snapshotKind: 'effective_authoring',
  });
  assert.deepEqual(mixedCalendar.eligibleItemIds, ['p0-contract-item-a']);
  assert.deepEqual(mixedCalendar.heldItemIds, [
    'p0-contract-item-b',
    'p0-contract-item-c',
  ]);
  assert.equal(mixedCalendar.counts.output, 1);
  assert.equal(mixedCalendar.availability, 'conditional');
});

test('P0 loss schema covers preserved, transformed, omitted, held, and unavailable outcomes', () => {
  const treatments = new Set(
    Object.values(EFFECTIVE_FLOW_FORMAT_LOSS_SCHEMA)
      .flat()
      .map((rule) => rule.treatment),
  );
  assert.deepEqual([...treatments].sort(), [
    'held',
    'omitted',
    'preserved',
    'transformed',
    'unavailable',
  ]);

  const checklistCompletion = EFFECTIVE_FLOW_FORMAT_LOSS_SCHEMA.checklist.find(
    (rule) => rule.field === 'completion_criterion' && rule.channel === 'payload',
  );
  assert.equal(checklistCompletion?.treatment, 'preserved');
  const calendarMissingDate = EFFECTIVE_FLOW_FORMAT_LOSS_SCHEMA.calendar.find(
    (rule) => rule.field === 'schedule_date' && rule.condition === 'when_missing',
  );
  assert.equal(calendarMissingDate?.treatment, 'held');
  assert.match(calendarMissingDate?.reason ?? '', /가짜 VEVENT/);
});

test('role-rich fixture exposes eligible, held, and unavailable IDs from one snapshot instead of count-only claims', () => {
  const snapshot = buildEffectiveFlowSnapshot({
    bundle: P0_ROLE_RICH_FLOW_BUNDLE,
    effectiveTitle: P0_ROLE_RICH_FLOW_BUNDLE.flow.title,
    dateIntent: resolvePublicDateIntent({
      anchorType: P0_ROLE_RICH_FLOW_BUNDLE.flow.anchor_type,
      mode: 'custom',
      customAnchor: '2030-09-01',
      exampleAnchor: '',
    }),
    publicItemPersonalizations: {
      'p0-rich-action': { memo: '개인 메모는 완료 기준과 별도입니다.' },
    },
  });
  const calendar = buildEffectiveFlowProjectionManifest({
    snapshot,
    consumer: 'export_preview',
    destination: 'calendar',
  });
  const checklist = buildEffectiveFlowProjectionManifest({
    snapshot,
    consumer: 'export_preview',
    destination: 'checklist',
  });
  const memo = buildEffectiveFlowProjectionManifest({
    snapshot,
    consumer: 'export_preview',
    destination: 'memo',
  });

  assert.deepEqual(calendar.eligibleItemIds, ['p0-rich-action']);
  assert.deepEqual(calendar.unavailableItemIds, [
    'p0-rich-warning',
    'p0-rich-resource',
  ]);
  assert.deepEqual(checklist.eligibleItemIds, ['p0-rich-action']);
  assert.deepEqual(checklist.unavailableItemIds, [
    'p0-rich-warning',
    'p0-rich-resource',
  ]);
  assert.deepEqual(memo.eligibleItemIds, [...P0_ROLE_RICH_ITEM_IDS]);
  assert.equal(memo.counts.output, 3);
  assert.ok(Object.keys(calendar.reasonsByItemId).length === 2);
});

test('public preview, saved detail, and export consumers keep the same stable Item IDs and scope count', () => {
  const publicSnapshot = buildEffectiveFlowSnapshot({
    bundle: P0_CONTRACT_FLOW_BUNDLE,
    effectiveTitle: '개인화한 P0 계획',
    dateIntent: resolvePublicDateIntent({
      anchorType: P0_CONTRACT_FLOW_BUNDLE.flow.anchor_type,
      mode: 'custom',
      customAnchor: '2030-09-01',
      exampleAnchor: '',
    }),
    publicItemPersonalizations: {
      'p0-contract-item-a': {
        title: '개인화 계약 항목 A',
        detail: '개인 메모 A',
        date: '2030-09-05',
      },
    },
  });
  const savedSnapshot = buildEffectiveFlowSnapshot({
    bundle: P0_CONTRACT_FLOW_BUNDLE,
    effectiveTitle: publicSnapshot.effectiveTitle,
    dateIntent: publicSnapshot.dateIntent,
    personalLayerState: 'persisted',
    resolvedRows: {
      included: publicSnapshot.committed.rows,
      excluded: publicSnapshot.committed.excludedRows,
      selectedArtifactMode: publicSnapshot.committed.selectedArtifactMode,
      personalOverlayIdentity: { fixture: 'p0-consumer-parity' },
    },
  });
  const scope = { kind: 'selected' as const, itemIds: [
    'p0-contract-item-c',
    'p0-contract-item-a',
  ] };
  const publicManifest = buildEffectiveFlowProjectionManifest({
    snapshot: publicSnapshot,
    consumer: 'public_preview',
    destination: 'checklist',
    scope,
    snapshotKind: 'effective_authoring',
  });
  const savedManifest = buildEffectiveFlowProjectionManifest({
    snapshot: savedSnapshot,
    consumer: 'saved_detail',
    destination: 'checklist',
    scope,
  });
  const exportManifest = buildEffectiveFlowProjectionManifest({
    snapshot: savedSnapshot,
    consumer: 'export_artifact',
    destination: 'checklist',
    scope,
  });
  const exportScope = buildFlowExportScopePlan({
    scope: 'selected',
    items: savedSnapshot.committed.rows.map((row) => ({
      key: row.id,
      title: row.title,
      calendarEligible: Boolean(row.schedule.date),
      listEligible: row.eligibleShapes.includes('checklist'),
    })),
    selectedKeys: scope.itemIds,
    flowTitle: savedSnapshot.effectiveTitle,
  });

  const expectedIds = ['p0-contract-item-a', 'p0-contract-item-c'];
  assert.deepEqual(publicManifest.requestedItemIds, expectedIds);
  assert.deepEqual(savedManifest.requestedItemIds, expectedIds);
  assert.deepEqual(exportManifest.requestedItemIds, expectedIds);
  assert.deepEqual(exportScope.itemsByDestination.checklist.map((item) => item.key), expectedIds);
  assert.equal(publicManifest.counts.output, 2);
  assert.equal(savedManifest.counts.output, 2);
  assert.equal(exportManifest.counts.output, 2);
  assert.equal(exportScope.countByDestination.checklist, 2);
  assert.notEqual(publicManifest.snapshotHash, savedManifest.snapshotHash);
  assert.equal(savedManifest.snapshotHash, exportManifest.snapshotHash);
});

test('Map 7-of-8 fixture reproduces the legacy mismatch and fixes the expected consumer contract at seven IDs', () => {
  const mapBundle = bySlug(P0_MATH_FLOW_SLUG);
  const sourceSnapshot = buildEffectiveFlowSnapshot({
    bundle: mapBundle,
    effectiveTitle: mapBundle.flow.title,
    dateIntent: dateIntent(mapBundle, 'undated'),
  });
  const fixture = P0_FLOW_MAP_CONTRACT_FIXTURES.sevenOfEight;
  const selectedRawIds = fixture.selectedItemIds.map((key) => key.split('::')[1]!);
  const selectedRows = sourceSnapshot.committed.rows.filter((row) => selectedRawIds.includes(row.id));
  const excludedRows = sourceSnapshot.committed.rows
    .filter((row) => !selectedRawIds.includes(row.id))
    .map((row) => ({ ...row, included: false }));
  const appliedSnapshot = buildEffectiveFlowSnapshot({
    bundle: mapBundle,
    effectiveTitle: '시험 전 핵심 단원',
    dateIntent: dateIntent(mapBundle, 'undated'),
    personalLayerState: 'persisted',
    resolvedRows: {
      included: selectedRows,
      excluded: excludedRows,
      selectedArtifactMode: 'sheet',
      personalOverlayIdentity: { selectedCanonicalKeys: fixture.selectedItemIds },
    },
  });
  const toMapKeys = (ids: string[]) => ids.map((id) => `${P0_MATH_FLOW_SLUG}::${id}`);
  const preview = buildEffectiveFlowProjectionManifest({
    snapshot: appliedSnapshot,
    consumer: 'flow_map_preview',
    destination: 'sheet',
  });
  const saved = buildEffectiveFlowProjectionManifest({
    snapshot: appliedSnapshot,
    consumer: 'flow_map_save',
    destination: 'sheet',
  });
  const exported = buildEffectiveFlowProjectionManifest({
    snapshot: appliedSnapshot,
    consumer: 'export_artifact',
    destination: 'sheet',
  });

  assert.equal(sourceSnapshot.committed.rows.length, 8);
  assert.equal(fixture.legacyPreviewItemIds.length, 8);
  assert.equal(fixture.selectedItemIds.length, 7);
  assert.notDeepEqual(fixture.legacyPreviewItemIds, fixture.expectedPreviewItemIds);
  assert.deepEqual(toMapKeys(preview.eligibleItemIds), [...fixture.expectedPreviewItemIds]);
  assert.deepEqual(toMapKeys(saved.eligibleItemIds), [...fixture.savedItemIds]);
  assert.deepEqual(toMapKeys(exported.eligibleItemIds), [...fixture.exportItemIds]);
  assert.equal(preview.counts.output, 7);
  assert.equal(saved.counts.output, 7);
  assert.equal(exported.counts.output, 7);
});

test('memo-first and repeated routine fixtures expose honest natural and transformed results', () => {
  const memoBundle = bySlug('job-change-risk-check');
  const memoSnapshot = buildEffectiveFlowSnapshot({
    bundle: memoBundle,
    effectiveTitle: memoBundle.flow.title,
    dateIntent: dateIntent(memoBundle, 'undated'),
  });
  const memoManifest = buildEffectiveFlowProjectionManifest({
    snapshot: memoSnapshot,
    consumer: 'public_preview',
    destination: 'memo',
    snapshotKind: 'effective_authoring',
  });
  assert.equal(memoSnapshot.committed.selectedShape, 'memo');
  assert.equal(memoManifest.counts.output, memoSnapshot.committed.rows.length);

  const routineBundle = bySlug('washer-tub-clean-monthly');
  const routineSnapshot = buildEffectiveFlowSnapshot({
    bundle: routineBundle,
    effectiveTitle: routineBundle.flow.title,
    dateIntent: dateIntent(routineBundle, 'custom', '2030-09-01'),
  });
  const routineCalendar = buildEffectiveFlowProjectionManifest({
    snapshot: routineSnapshot,
    consumer: 'export_preview',
    destination: 'calendar',
  });
  assert.ok(routineCalendar.eligibleItemIds.length > 0);
  assert.equal(routineCalendar.counts.output, 1);
  assert.equal(routineSnapshot.committed.exportPlan.formats.calendar.outputCount, 1);
});

test('legacy and missing-base fixtures are classified without rewriting raw storage bytes', () => {
  for (const fixture of Object.values(P0_LEGACY_SAVED_FLOW_FIXTURES)) {
    const rawBefore = fixture.raw;
    const inspection = inspectLegacyFlowCompatibility({
      storageKey: fixture.storageKey,
      raw: fixture.raw,
      baseId: fixture.baseFlowSlug,
      baseExists: fixture.baseExists,
    });
    assert.equal(inspection.state, fixture.expectedState, fixture.storageKey);
    assert.equal(inspection.raw, rawBefore, fixture.storageKey);
    assert.equal(inspection.rawPreserved, true, fixture.storageKey);
    assert.equal(fixture.raw, rawBefore, fixture.storageKey);
  }
});

class P002MemoryStorage {
  private readonly values = new Map<string, string>();
  private failKey: string | undefined;
  private failed = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failKey === key && !this.failed) {
      this.failed = true;
      const error = new Error('simulated storage quota failure');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  failOnceOn(key: string): void {
    this.failKey = key;
    this.failed = false;
  }

  allowWrites(): void {
    this.failKey = undefined;
    this.failed = false;
  }
}

test('P0-02 Flow Map save transaction restores exact raw values after a partial write and can retry', () => {
  const storage = new P002MemoryStorage();
  const plan = buildFlowMapSaveStorageKeyPlan({
    mapId: 'middle-school-math-1',
    flowSlugs: ['child-b', 'child-a', 'child-a'],
  });
  assert.deepEqual(plan.flowSlugs, ['child-a', 'child-b']);
  assert.ok(plan.allKeys.includes('flow:map:saved:middle-school-math-1'));
  assert.ok(plan.allKeys.includes('flow:map:persistence:middle-school-math-1'));
  assert.ok(plan.allKeys.includes('flow:saved:child-a'));
  assert.ok(plan.allKeys.includes('flow_builder_mvp_item_state_child-b'));
  assert.ok(plan.allKeys.includes('flow:canonical:origin:v1'));
  assert.ok(plan.allKeys.includes('flow:meta:last-visit'));

  storage.setItem(plan.canonicalOriginKey, '{"old":"canonical"}');
  storage.setItem(plan.lastVisitKey, 'old-visit');
  storage.setItem(plan.savedFlowKeysBySlug['child-a']!, '{"old":"flow-a"}');
  const before = Object.fromEntries(plan.allKeys.map((key) => [key, storage.getItem(key)]));
  storage.failOnceOn(plan.mapPersistenceKey);
  const failed = runFlowMapSaveTransaction({
    storage,
    keys: plan.allKeys,
    apply: () => {
      storage.setItem(plan.savedFlowKeysBySlug['child-a']!, '{"new":"flow-a"}');
      storage.setItem(plan.mapSnapshotKey, '{"new":"snapshot"}');
      storage.setItem(plan.mapPersistenceKey, '{"new":"persistence"}');
    },
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.rollbackComplete, true);
  assert.deepEqual(
    Object.fromEntries(plan.allKeys.map((key) => [key, storage.getItem(key)])),
    before,
  );

  storage.allowWrites();
  const retried = runFlowMapSaveTransaction({
    storage,
    keys: plan.allKeys,
    apply: () => {
      storage.setItem(plan.savedFlowKeysBySlug['child-a']!, '{"new":"flow-a"}');
      storage.setItem(plan.mapSnapshotKey, '{"new":"snapshot"}');
      storage.setItem(plan.mapPersistenceKey, '{"new":"persistence"}');
    },
  });
  assert.equal(retried.ok, true);
  assert.equal(storage.getItem(plan.mapSnapshotKey), '{"new":"snapshot"}');
  assert.equal(storage.getItem(plan.mapPersistenceKey), '{"new":"persistence"}');
});
