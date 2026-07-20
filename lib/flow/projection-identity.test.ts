import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFlowExportScopePlan } from './export-scope';
import {
  buildCanonicalFlowItemKey,
  buildCanonicalFlowProjectionIdentity,
  buildCanonicalFlowProjectionMatrix,
  buildCanonicalFlowValueKey,
  FLOW_PROJECTION_DESTINATIONS,
  getProjectionIdentityMigrationStorageKey,
  migrateProjectionIdentityStorage,
  type ProjectionIdentityStorage,
} from './projection-identity';

function memoryStorage(initial: Record<string, string> = {}): ProjectionIdentityStorage & {
  snapshot(): Record<string, string>;
} {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    snapshot: () => Object.fromEntries(values),
  };
}

const allListDestinations = {
  myFlow: true,
  today: true,
  calendarScreen: false,
  calendarIcs: false,
  checklist: true,
  sheet: true,
  memo: true,
};

test('canonical projection identity separates item run series and occurrence keys', () => {
  const base = buildCanonicalFlowProjectionIdentity({
    flowId: 'moving-copy',
    itemId: 'packing',
    ownership: 'source',
  });
  const run = buildCanonicalFlowProjectionIdentity({
    flowId: 'moving-copy',
    itemId: 'packing',
    ownership: 'source',
    runId: 'run-2',
  });
  const occurrence = buildCanonicalFlowProjectionIdentity({
    flowId: 'moving-copy',
    itemId: 'packing',
    ownership: 'source',
    runId: 'run-2',
    seriesId: 'packing-series',
    revisionId: 'packing-revision-2',
    occurrenceId: 'packing-occurrence-2026-08-03',
  });

  assert.equal(base.itemKey, 'moving-copy::packing');
  assert.equal(run.itemKey, base.itemKey);
  assert.equal(run.executionKey, 'moving-copy::run::run-2::item::packing');
  assert.equal(occurrence.itemKey, base.itemKey);
  assert.equal(
    occurrence.projectionKey,
    'moving-copy::occurrence::packing-occurrence-2026-08-03',
  );
  assert.equal(occurrence.calendarEventIdentitySeed, 'packing-series');
  assert.equal(occurrence.exportItemKey, base.itemKey);
});

test('projection matrix keeps membership stable across value order and completion edits', () => {
  const baseItems = [
    {
      flowId: 'draft-flow',
      itemId: 'source-a',
      ownership: 'source' as const,
      personalOrderRank: 1,
      included: true,
      tombstoned: false,
      destinationEligibility: {
        ...allListDestinations,
        calendarScreen: true,
        calendarIcs: true,
      },
      executionState: 'done' as const,
    },
    {
      flowId: 'draft-flow',
      itemId: 'personal-b',
      ownership: 'user_created' as const,
      personalOrderRank: 0,
      included: true,
      tombstoned: false,
      destinationEligibility: allListDestinations,
      executionState: 'pending' as const,
    },
    {
      flowId: 'draft-flow',
      itemId: 'removed-c',
      ownership: 'user_created' as const,
      personalOrderRank: 2,
      included: true,
      tombstoned: true,
      destinationEligibility: {
        ...allListDestinations,
        calendarScreen: true,
        calendarIcs: true,
      },
      executionState: 'pending' as const,
    },
  ];
  const done = buildCanonicalFlowProjectionMatrix({ items: baseItems });
  const reopened = buildCanonicalFlowProjectionMatrix({
    items: baseItems.map((item) => ({
      ...item,
      personalOrderRank: item.itemId === 'source-a' ? 0 : item.itemId === 'personal-b' ? 1 : 2,
      executionState: item.itemId === 'source-a' ? 'reopened' as const : item.executionState,
    })),
  });

  assert.deepEqual(
    new Set(done.rowsByDestination.myFlow.map((row) => row.identity.itemKey)),
    new Set(reopened.rowsByDestination.myFlow.map((row) => row.identity.itemKey)),
  );
  assert.deepEqual(
    done.rowsByDestination.calendarScreen.map((row) => row.identity.itemKey),
    ['draft-flow::source-a'],
  );
  assert.deepEqual(
    done.rowsByDestination.memo.map((row) => row.identity.itemKey),
    ['draft-flow::personal-b', 'draft-flow::source-a'],
  );
  assert.equal(done.rowsByDestination.memo.some((row) => row.identity.itemId === 'removed-c'), false);
  assert.deepEqual(FLOW_PROJECTION_DESTINATIONS, [
    'myFlow',
    'today',
    'calendarScreen',
    'calendarIcs',
    'checklist',
    'sheet',
    'memo',
  ]);
});

test('projection matrix preserves source on collisions and deduplicates occurrences', () => {
  const matrix = buildCanonicalFlowProjectionMatrix({
    items: [
      {
        flowId: 'collision-flow',
        itemId: 'same-id',
        ownership: 'user_created',
        personalOrderRank: 0,
        included: true,
        tombstoned: false,
        destinationEligibility: allListDestinations,
      },
      {
        flowId: 'collision-flow',
        itemId: 'same-id',
        ownership: 'source',
        personalOrderRank: 0,
        included: true,
        tombstoned: false,
        destinationEligibility: allListDestinations,
      },
    ],
    occurrences: [
      {
        flowId: 'collision-flow',
        itemId: 'same-id',
        ownership: 'source',
        seriesId: 'series-a',
        revisionId: 'revision-a',
        occurrenceId: 'occurrence-a',
        executionState: 'done',
        destinationEligibility: { calendarScreen: true, calendarIcs: true },
      },
      {
        flowId: 'collision-flow',
        itemId: 'same-id',
        ownership: 'source',
        seriesId: 'series-a',
        revisionId: 'revision-a',
        occurrenceId: 'occurrence-a',
        executionState: 'reopened',
        destinationEligibility: { calendarScreen: true, calendarIcs: true },
      },
      {
        flowId: 'collision-flow',
        itemId: 'missing-item',
        ownership: 'source',
        seriesId: 'series-b',
        revisionId: 'revision-b',
        occurrenceId: 'orphan-occurrence',
        executionState: 'pending',
        destinationEligibility: { calendarScreen: true },
      },
    ],
  });

  assert.equal(matrix.items[0].identity.ownership, 'source');
  assert.equal(matrix.duplicateItemIdentityCount, 1);
  assert.equal(matrix.duplicateOccurrenceIdentityCount, 1);
  assert.equal(matrix.orphanOccurrenceCount, 1);
  assert.equal(matrix.occurrences.length, 1);
});

test('whole selected and item exports reuse canonical item keys', () => {
  const items = ['source-a', 'personal-b'].map((itemId, index) => ({
    key: buildCanonicalFlowItemKey('export-flow', itemId),
    title: itemId,
    calendarEligible: index === 0,
  }));
  const whole = buildFlowExportScopePlan({
    scope: 'flow',
    items,
    flowTitle: 'Export Flow',
  });
  const selected = buildFlowExportScopePlan({
    scope: 'selected',
    items,
    selectedKeys: [items[1].key],
    flowTitle: 'Export Flow',
  });
  const single = buildFlowExportScopePlan({
    scope: 'item',
    items,
    currentItemKey: items[0].key,
    flowTitle: 'Export Flow',
  });

  assert.deepEqual(whole.items.map((item) => item.key), items.map((item) => item.key));
  assert.deepEqual(selected.items.map((item) => item.key), [items[1].key]);
  assert.deepEqual(single.items.map((item) => item.key), [items[0].key]);
  assert.equal(whole.duplicateKeyCount, 0);
});

test('legacy projection values migrate to stable keys without losing originals', () => {
  const itemDraftStorageKey = 'flow:my-flow:item-drafts';
  const dateOverrideStorageKey = 'flow:my-flow:date-overrides';
  const legacyDraftKey = 'draft-flow::source-a::2026-08-01';
  const legacyDateKey = 'draft-flow::source-a::none';
  const canonicalKey = buildCanonicalFlowValueKey('draft-flow', 'source-a');
  const storage = memoryStorage({
    [itemDraftStorageKey]: JSON.stringify({
      [legacyDraftKey]: { title: '이전 제목', memo: '보존할 메모' },
      [canonicalKey]: { title: '현재 제목' },
      'other-flow::item::none': { memo: '다른 Flow' },
    }),
    [dateOverrideStorageKey]: JSON.stringify({
      [legacyDateKey]: '2026-08-03',
      'other-flow::item::none': '2026-09-01',
    }),
  });
  const migrated = migrateProjectionIdentityStorage(storage, {
    flowId: 'draft-flow',
    itemIds: ['source-a'],
    itemDraftStorageKey,
    dateOverrideStorageKey,
    migratedAt: '2026-07-20T09:00:00.000Z',
  });
  const drafts = JSON.parse(storage.getItem(itemDraftStorageKey) || '{}');
  const dates = JSON.parse(storage.getItem(dateOverrideStorageKey) || '{}');
  const manifest = JSON.parse(
    storage.getItem(getProjectionIdentityMigrationStorageKey('draft-flow')) || '{}',
  );

  assert.equal(migrated.source, 'migrated');
  assert.deepEqual(drafts[canonicalKey], { title: '현재 제목', memo: '보존할 메모' });
  assert.equal(drafts[legacyDraftKey], undefined);
  assert.equal(dates[canonicalKey], '2026-08-03');
  assert.equal(dates[legacyDateKey], undefined);
  assert.deepEqual(drafts['other-flow::item::none'], { memo: '다른 Flow' });
  assert.equal(dates['other-flow::item::none'], '2026-09-01');
  assert.deepEqual(manifest.legacyItemDraftValues[legacyDraftKey], {
    title: '이전 제목',
    memo: '보존할 메모',
  });
  assert.equal(manifest.legacyDateOverrideValues[legacyDateKey], '2026-08-03');
  assert.equal(manifest.legacyRecordsPreserved, true);
  assert.equal(
    migrateProjectionIdentityStorage(storage, {
      flowId: 'draft-flow',
      itemIds: ['source-a'],
      itemDraftStorageKey,
      dateOverrideStorageKey,
    }).source,
    'already_current',
  );
});

test('malformed projection storage is preserved without a migration manifest', () => {
  const storage = memoryStorage({
    drafts: '{not-json',
    dates: JSON.stringify({ 'draft-flow::source-a::none': '2026-08-03' }),
  });
  const before = storage.snapshot();
  const result = migrateProjectionIdentityStorage(storage, {
    flowId: 'draft-flow',
    itemIds: ['source-a'],
    itemDraftStorageKey: 'drafts',
    dateOverrideStorageKey: 'dates',
  });

  assert.equal(result.source, 'malformed_preserved');
  assert.deepEqual(storage.snapshot(), before);
  assert.equal(storage.getItem(getProjectionIdentityMigrationStorageKey('draft-flow')), null);
});

test('projection migration rolls back every write when the manifest write fails', () => {
  const base = memoryStorage({
    drafts: JSON.stringify({ 'draft-flow::source-a::none': { memo: 'keep' } }),
    dates: JSON.stringify({ 'draft-flow::source-a::none': '2026-08-03' }),
  });
  const before = base.snapshot();
  const manifestKey = getProjectionIdentityMigrationStorageKey('draft-flow');
  const storage: ProjectionIdentityStorage = {
    getItem: base.getItem,
    removeItem: base.removeItem,
    setItem: (key, value) => {
      if (key === manifestKey) throw new Error('quota');
      base.setItem(key, value);
    },
  };
  const result = migrateProjectionIdentityStorage(storage, {
    flowId: 'draft-flow',
    itemIds: ['source-a'],
    itemDraftStorageKey: 'drafts',
    dateOverrideStorageKey: 'dates',
  });

  assert.equal(result.source, 'write_failed');
  assert.deepEqual(base.snapshot(), before);
});
