import assert from 'node:assert/strict';
import test from 'node:test';
import curatedSourceAppSeed from '../../docs/content-audit/2026-07-01-curated-source-app-seed-v1.json';
import { prepareFlowRunNewAnchor } from './flow-run-reuse';
import { seedBundles } from './seed-flows';
import {
  buildFlowMeLocalBackup,
  FlowMeLocalBackupError,
  getFlowMeLocalBackupFilename,
  parseFlowMeLocalBackup,
  restoreFlowMeLocalBackup,
  serializeFlowMeLocalBackup,
  type FlowMeStorageLike,
} from './local-data-backup';
import { getFlowScopedMyFlowPersonalExecutionState } from './my-flow-personal-state';
import {
  createPersonalDraftStructuralOverlay,
  createPersonalDraftUserItem,
  deletePersonalDraftStructuralItem,
  isPersonalDraftStructuralEditEligible,
  movePersonalDraftStructuralItem,
  resolvePersonalDraftStructuralItems,
  restorePersonalDraftStructuralItem,
  undoPersonalDraftStructuralDelete,
} from './personal-draft-structural-edit';
import {
  personalStructuralOverlayGoldenFixtures,
  structuralOverlayDeletedUserItemFixture,
  structuralOverlayUserItem,
} from './personal-structural-overlay.fixtures';
import {
  buildPersonalDraftStructuralProjection,
  buildPersonalStructuralProjection,
  PERSONAL_STRUCTURAL_PROJECTION_DESTINATIONS,
} from './personal-structural-projection';
import {
  createEmptyPersonalStructuralOverlay,
  getPersonalStructuralOverlayStorageKey,
  loadOrMigratePersonalStructuralOverlay,
  loadPersonalStructuralOverlay,
  normalizePersonalStructuralOverlay,
  resolvePersonalStructuralItems,
  restorePersonalStructuralItem,
  savePersonalStructuralOverlay,
} from './personal-structural-overlay';
import {
  RETIRED_PERSONAL_COPY_TAG,
  RUNTIME_ARCHIVED_FLOW_SLUGS,
} from './runtime-content-policy';
import {
  cloneSeedBundles,
  clearFlowLocalProgress,
  completeActiveFlowRun,
  ensureLegacyActiveFlowRun,
  getActiveFlowProgress,
  getActiveFlowRun,
  getBundles,
  getChecks,
  getCompletedFlowRuns,
  getFlowRunRegistry,
  getItemStates,
  getMyFlowCompletionFeedback,
  getMyFlowStepItemChecks,
  getSavedFlowMapIndexByFlowSlug,
  getSavedFlowRecord,
  getStoredAnchor,
  mergeSeedBundles,
  normalizeFlowRunRecord,
  normalizeFlowRunRegistry,
  normalizeMyFlowCompletionFeedback,
  normalizeSavedFlowMapSnapshot,
  normalizeSavedFlowRecord,
  recordFlowCompletionState,
  saveMyFlowCompletionFeedback,
  saveMyFlowStepItemChecks,
  startFlowRunFromCompleted,
} from './storage';
import { FlowBundle } from './types';

const curatedSourceAppSeedFlowSlugs = curatedSourceAppSeed.contentBundles.flatMap((bundle) =>
  bundle.flows.map((flow) => flow.slug),
);

function bundle(id: string, slug: string, title: string): FlowBundle {
  return {
    flow: {
      id,
      slug,
      title,
      description: title,
      category: 'test',
      structure_type: 'checklist',
      anchor_type: 'none',
      status: 'published',
      created_at: '2026-05-21T00:00:00.000Z',
      updated_at: '2026-05-21T00:00:00.000Z',
    },
    sections: [],
    items: [],
  };
}

function memoryStorage(initial: Record<string, string> = {}): FlowMeStorageLike {
  const store = new Map(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

function generatedPreviewBundle(): FlowBundle {
  const preview = bundle(
    'flow-preview-samsung-service-1',
    'channel-samsung-service-monthly-check',
    'Legacy generated preview',
  );
  preview.flow.source_status = 'preview';
  return preview;
}

test('personal structural overlay golden fixtures preserve source and resolve effective items', () => {
  assert.equal(personalStructuralOverlayGoldenFixtures.length, 12);

  personalStructuralOverlayGoldenFixtures.forEach((fixture) => {
    const sourceBefore = JSON.stringify(fixture.sourceItems);
    const overlayBefore = JSON.stringify(fixture.overlay);
    const result = resolvePersonalStructuralItems({
      sourceItems: fixture.sourceItems,
      structuralOverlay: fixture.overlay,
      valueOverlays: fixture.valueOverlays,
      executionStates: fixture.executionStates,
    });

    assert.deepEqual(
      result.allItems.map((item) => item.itemId),
      fixture.expected.allOrder,
      fixture.id,
    );
    assert.deepEqual(
      result.effectiveItems.map((item) => item.itemId),
      fixture.expected.effectiveOrder,
      fixture.id,
    );
    assert.deepEqual(
      result.tombstonedItems.map((item) => item.itemId),
      fixture.expected.tombstonedIds,
      fixture.id,
    );
    assert.deepEqual(
      Object.fromEntries(result.allItems.map((item) => [item.itemId, item.ownership])),
      fixture.expected.ownershipById,
      fixture.id,
    );
    assert.deepEqual(
      result.allItems
        .filter((item) => item.projectionEligibility.calendar)
        .map((item) => item.itemId),
      fixture.expected.calendarEligibleIds,
      fixture.id,
    );
    assert.deepEqual(
      [...result.warnings].sort(),
      [...(fixture.expected.warningCodes ?? [])].sort(),
      fixture.id,
    );
    assert.equal(JSON.stringify(fixture.sourceItems), sourceBefore, `${fixture.id}: source mutated`);
    assert.equal(JSON.stringify(fixture.overlay), overlayBefore, `${fixture.id}: overlay mutated`);
  });

  const valueOverlayResult = resolvePersonalStructuralItems({
    sourceItems: personalStructuralOverlayGoldenFixtures[8].sourceItems,
    structuralOverlay: personalStructuralOverlayGoldenFixtures[8].overlay,
    valueOverlays: personalStructuralOverlayGoldenFixtures[8].valueOverlays,
  });
  const adjusted = valueOverlayResult.allItems.find((item) => item.itemId === 'source-b');
  assert.equal(adjusted?.title, 'Personal title B');
  assert.equal(adjusted?.personalMemo, 'Personal memo B');
  assert.deepEqual(adjusted?.schedule, { mode: 'fixed_date', date: '2026-09-01' });

  const completedResult = resolvePersonalStructuralItems({
    sourceItems: personalStructuralOverlayGoldenFixtures[9].sourceItems,
    structuralOverlay: personalStructuralOverlayGoldenFixtures[9].overlay,
    executionStates: personalStructuralOverlayGoldenFixtures[9].executionStates,
  });
  assert.equal(completedResult.allItems.find((item) => item.itemId === 'source-a')?.executionState?.state, 'done');
  assert.deepEqual(
    completedResult.effectiveItems.map((item) => item.itemId),
    personalStructuralOverlayGoldenFixtures[9].expected.effectiveOrder,
  );

  assert.equal(personalStructuralOverlayGoldenFixtures[11].overlay.migration?.source, 'legacy_step_selection');
  assert.equal(personalStructuralOverlayGoldenFixtures[11].overlay.selection.mode, 'only_included');
  assert.equal(personalStructuralOverlayGoldenFixtures[7].overlay.userItems[0]?.itemId, 'personal-a');
  assert.equal(personalStructuralOverlayGoldenFixtures[7].overlay.itemTombstones[0]?.itemId, 'source-b');
  assert.ok(personalStructuralOverlayGoldenFixtures[7].overlay.orderOverride.includes('source-b'));
});

test('personal structural projection policy separates structure from run status', () => {
  const sourceFixture = personalStructuralOverlayGoldenFixtures[0];
  const excludedOverlay = {
    ...sourceFixture.overlay,
    selection: {
      mode: 'all_except_excluded' as const,
      includedItemIds: [],
      excludedItemIds: ['source-a'],
    },
  };
  const result = resolvePersonalStructuralItems({
    sourceItems: sourceFixture.sourceItems,
    structuralOverlay: excludedOverlay,
    executionStates: [
      { itemId: 'source-b', state: 'skipped' },
      { itemId: 'source-c', state: 'done' },
    ],
  });
  const excluded = result.allItems.find((item) => item.itemId === 'source-a');
  const unscheduledSkipped = result.allItems.find((item) => item.itemId === 'source-b');
  const completed = result.allItems.find((item) => item.itemId === 'source-c');

  assert.deepEqual(excluded?.projectionEligibility, {
    calendar: false,
    checklist: false,
    sheet: false,
    memo: false,
  });
  assert.deepEqual(unscheduledSkipped?.projectionEligibility, {
    calendar: false,
    checklist: true,
    sheet: true,
    memo: true,
  });
  assert.equal(unscheduledSkipped?.executionState?.state, 'skipped');
  assert.deepEqual(completed?.projectionEligibility, {
    calendar: true,
    checklist: true,
    sheet: true,
    memo: true,
  });
  assert.equal(completed?.executionState?.state, 'done');
});

test('personal structural user item deletion is a reversible tombstone', () => {
  const deleted = resolvePersonalStructuralItems({
    sourceItems: structuralOverlayDeletedUserItemFixture.sourceItems,
    structuralOverlay: structuralOverlayDeletedUserItemFixture.overlay,
  });
  assert.equal(deleted.effectiveItems.some((item) => item.itemId === structuralOverlayUserItem.itemId), false);
  assert.equal(deleted.tombstonedItems[0]?.itemId, structuralOverlayUserItem.itemId);
  assert.equal(deleted.tombstonedItems[0]?.userItem?.itemId, structuralOverlayUserItem.itemId);

  const restoredFixture = personalStructuralOverlayGoldenFixtures[4];
  const restored = resolvePersonalStructuralItems({
    sourceItems: restoredFixture.sourceItems,
    structuralOverlay: restoredFixture.overlay,
  });
  assert.equal(restored.effectiveItems.some((item) => item.itemId === structuralOverlayUserItem.itemId), true);
  assert.equal(restored.allItems.find((item) => item.itemId === structuralOverlayUserItem.itemId)?.ownership, 'user_created');
});

test('personal draft structural adapter limits editing and preserves stable user item identity', () => {
  const personalDraft = bundle(
    'flow-personal-draft',
    'url-draft-personal-1',
    'Weekend preparation draft',
  );
  personalDraft.flow.status = 'draft';
  personalDraft.flow.category = '내 초안';
  personalDraft.flow.source_title = '내 메모';
  personalDraft.flow.source_status = 'preview';
  personalDraft.flow.tags = ['내 초안', '내 메모'];
  personalDraft.items = [
    {
      id: 'draft-source-a',
      flow_id: personalDraft.flow.id,
      title: 'First source task',
      type: 'todo',
      order: 0,
    },
    {
      id: 'draft-source-b',
      flow_id: personalDraft.flow.id,
      title: 'Second source task',
      type: 'todo',
      order: 1,
    },
  ];

  const sourceBacked = bundle(
    'flow-source-backed',
    'source-backed-personal-1',
    'Source backed flow',
  );
  sourceBacked.flow.status = 'draft';
  sourceBacked.flow.tags = ['source-backed'];
  sourceBacked.flow.source_title = '내 메모';

  assert.equal(isPersonalDraftStructuralEditEligible(personalDraft), true);
  assert.equal(isPersonalDraftStructuralEditEligible(sourceBacked), false);

  const baseOverlay = createPersonalDraftStructuralOverlay(personalDraft);
  assert.equal(
    createPersonalDraftUserItem({
      overlay: baseOverlay,
      title: '   ',
      itemId: 'personal-empty-title',
    }),
    undefined,
  );
  const created = createPersonalDraftUserItem({
    overlay: baseOverlay,
    title: '  Added   personal task  ',
    itemId: 'personal-stable-a',
    createdAt: '2026-07-13T10:00:00.000Z',
  });
  assert.ok(created);
  assert.equal(created.userItem.title, 'Added personal task');
  assert.equal(created.userItem.provenance, 'user_created');
  assert.equal(created.userItem.schedule, undefined);

  const added = resolvePersonalDraftStructuralItems(personalDraft, created.overlay);
  assert.deepEqual(
    added.effectiveItems.map((item) => item.itemId),
    ['draft-source-a', 'draft-source-b', 'personal-stable-a'],
  );
  assert.equal(
    added.effectiveItems.find((item) => item.itemId === 'personal-stable-a')?.ownership,
    'user_created',
  );

  const deleted = deletePersonalDraftStructuralItem({
    bundle: personalDraft,
    overlay: created.overlay,
    itemId: 'personal-stable-a',
    deletedAt: '2026-07-13T10:01:00.000Z',
  });
  assert.ok(deleted);
  assert.equal(
    resolvePersonalDraftStructuralItems(personalDraft, deleted.overlay).effectiveItems.some(
      (item) => item.itemId === 'personal-stable-a',
    ),
    false,
  );
  assert.deepEqual(deleted.undo, {
    flowSlug: personalDraft.flow.slug,
    itemId: 'personal-stable-a',
    ownership: 'user_created',
    title: 'Added personal task',
  });

  const restoredOverlay = undoPersonalDraftStructuralDelete({
    overlay: deleted.overlay,
    undo: deleted.undo,
    restoredAt: '2026-07-13T10:02:00.000Z',
  });
  const restored = resolvePersonalDraftStructuralItems(personalDraft, restoredOverlay);
  assert.deepEqual(
    restored.effectiveItems.map((item) => item.itemId),
    ['draft-source-a', 'draft-source-b', 'personal-stable-a'],
  );
  assert.equal(created.overlay.userItems[0]?.itemId, 'personal-stable-a');
  assert.equal(restoredOverlay.userItems[0]?.itemId, 'personal-stable-a');

  const sourceTitlesBeforeDelete = personalDraft.items.map((item) => item.title);
  const deletedSource = deletePersonalDraftStructuralItem({
    bundle: personalDraft,
    overlay: restoredOverlay,
    itemId: 'draft-source-a',
    deletedAt: '2026-07-13T10:03:00.000Z',
  });
  assert.ok(deletedSource);
  assert.equal(deletedSource.undo.ownership, 'source');
  assert.equal(
    resolvePersonalDraftStructuralItems(personalDraft, deletedSource.overlay).effectiveItems.some(
      (item) => item.itemId === 'draft-source-a',
    ),
    false,
  );
  assert.deepEqual(personalDraft.items.map((item) => item.title), sourceTitlesBeforeDelete);
  const restoredSource = undoPersonalDraftStructuralDelete({
    overlay: deletedSource.overlay,
    undo: deletedSource.undo,
    restoredAt: '2026-07-13T10:04:00.000Z',
  });
  assert.equal(
    resolvePersonalDraftStructuralItems(personalDraft, restoredSource).effectiveItems[0]?.itemId,
    'draft-source-a',
  );
});

test('personal draft structural order and persistent recovery preserve IDs, values, and source', () => {
  const personalDraft = bundle(
    'flow-personal-order-draft',
    'url-draft-personal-order-1',
    'Personal order draft',
  );
  personalDraft.flow.status = 'draft';
  personalDraft.flow.source_title = '내 메모';
  personalDraft.flow.tags = ['내 초안', '내 메모'];
  personalDraft.items = [
    {
      id: 'draft-order-source-a',
      flow_id: personalDraft.flow.id,
      title: 'Source A',
      type: 'todo',
      order: 0,
    },
    {
      id: 'draft-order-source-b',
      flow_id: personalDraft.flow.id,
      title: 'Source B',
      type: 'todo',
      order: 1,
    },
  ];
  const sourceBefore = JSON.stringify(personalDraft.items);
  const created = createPersonalDraftUserItem({
    overlay: createPersonalDraftStructuralOverlay(personalDraft),
    title: 'Personal C',
    itemId: 'personal-order-c',
    createdAt: '2026-07-13T12:00:00.000Z',
  });
  assert.ok(created);
  const overlayWithPersonalValues = {
    ...created.overlay,
    userItems: created.overlay.userItems.map((item) => ({
      ...item,
      personalMemo: 'Keep this personal memo',
      schedule: { mode: 'fixed_date' as const, date: '2026-08-03' },
    })),
  };

  const movedUp = movePersonalDraftStructuralItem({
    bundle: personalDraft,
    overlay: overlayWithPersonalValues,
    itemId: 'personal-order-c',
    direction: 'up',
    movedAt: '2026-07-13T12:01:00.000Z',
  });
  assert.ok(movedUp);
  assert.deepEqual(
    resolvePersonalDraftStructuralItems(personalDraft, movedUp).effectiveItems.map((item) => item.itemId),
    ['draft-order-source-a', 'personal-order-c', 'draft-order-source-b'],
  );
  assert.equal(
    movePersonalDraftStructuralItem({
      bundle: personalDraft,
      overlay: movedUp,
      itemId: 'draft-order-source-a',
      direction: 'up',
    }),
    undefined,
  );
  assert.equal(
    movePersonalDraftStructuralItem({
      bundle: personalDraft,
      overlay: movedUp,
      itemId: 'draft-order-source-b',
      direction: 'down',
    }),
    undefined,
  );

  const deleted = deletePersonalDraftStructuralItem({
    bundle: personalDraft,
    overlay: movedUp,
    itemId: 'personal-order-c',
    deletedAt: '2026-07-13T12:02:00.000Z',
  });
  assert.ok(deleted);
  assert.deepEqual(deleted.overlay.orderOverride, [
    'draft-order-source-a',
    'personal-order-c',
    'draft-order-source-b',
  ]);

  const storage = memoryStorage();
  savePersonalStructuralOverlay(storage, deleted.overlay);
  const reloaded = loadPersonalStructuralOverlay(storage, {
    savedCopyId: personalDraft.flow.slug,
    flowId: personalDraft.flow.id,
  });
  assert.ok(reloaded);
  const recoverable = resolvePersonalDraftStructuralItems(personalDraft, reloaded).tombstonedItems[0];
  assert.equal(recoverable?.itemId, 'personal-order-c');
  assert.equal(recoverable?.userItem?.personalMemo, 'Keep this personal memo');
  assert.deepEqual(recoverable?.userItem?.schedule, { mode: 'fixed_date', date: '2026-08-03' });

  const restored = restorePersonalDraftStructuralItem({
    bundle: personalDraft,
    overlay: reloaded,
    itemId: 'personal-order-c',
    restoredAt: '2026-07-13T12:03:00.000Z',
  });
  assert.ok(restored);
  const restoredItems = resolvePersonalDraftStructuralItems(personalDraft, restored).effectiveItems;
  assert.deepEqual(restoredItems.map((item) => item.itemId), [
    'draft-order-source-a',
    'personal-order-c',
    'draft-order-source-b',
  ]);
  assert.equal(restoredItems[1]?.itemId, 'personal-order-c');
  assert.equal(restoredItems[1]?.personalMemo, 'Keep this personal memo');
  assert.deepEqual(restoredItems[1]?.schedule, { mode: 'fixed_date', date: '2026-08-03' });
  assert.equal(JSON.stringify(personalDraft.items), sourceBefore);
});

test('personal draft reorder safely merges source v2 and preserves malformed order IDs', () => {
  const personalDraft = bundle(
    'flow-personal-order-v2',
    'url-draft-personal-order-v2',
    'Personal order v2 draft',
  );
  personalDraft.flow.status = 'draft';
  personalDraft.flow.source_title = '사용자가 넣은 링크';
  personalDraft.flow.tags = ['내 초안'];
  personalDraft.items = [
    { id: 'v2-source-a', flow_id: personalDraft.flow.id, title: 'Source A', type: 'todo', order: 0 },
    { id: 'v2-source-b', flow_id: personalDraft.flow.id, title: 'Source B', type: 'todo', order: 1 },
  ];
  const malformedOrderOverlay = {
    ...createPersonalDraftStructuralOverlay(personalDraft),
    orderOverride: ['missing-source-id', 'v2-source-b', 'v2-source-a'],
  };
  const moved = movePersonalDraftStructuralItem({
    bundle: personalDraft,
    overlay: malformedOrderOverlay,
    itemId: 'v2-source-a',
    direction: 'up',
    movedAt: '2026-07-13T12:10:00.000Z',
  });
  assert.ok(moved);
  assert.deepEqual(moved.orderOverride, ['missing-source-id', 'v2-source-a', 'v2-source-b']);

  const sourceV2 = {
    ...personalDraft,
    items: [
      ...personalDraft.items,
      { id: 'v2-source-c', flow_id: personalDraft.flow.id, title: 'Source C', type: 'todo' as const, order: 2 },
    ],
  };
  const merged = resolvePersonalDraftStructuralItems(sourceV2, moved);
  assert.deepEqual(merged.effectiveItems.map((item) => item.itemId), [
    'v2-source-a',
    'v2-source-b',
    'v2-source-c',
  ]);
  assert.ok(merged.warnings.includes('unknown_order_item:missing-source-id'));
});

test('personal structural projection applies destination policy without mixing run state into structure', () => {
  const structuralOverlay = {
    ...createEmptyPersonalStructuralOverlay({
      savedCopyId: 'projection-copy',
      flowId: 'projection-flow',
      updatedAt: '2026-07-13T13:00:00.000Z',
    }),
    userItems: [
      {
        itemId: 'projection-user-unscheduled',
        provenance: 'user_created' as const,
        title: 'Unscheduled personal item',
        personalMemo: 'Personal list memo',
        createdAt: '2026-07-13T13:00:00.000Z',
        orderKey: 5,
      },
      {
        itemId: 'projection-user-scheduled',
        provenance: 'user_created' as const,
        title: 'Scheduled personal item',
        schedule: { mode: 'fixed_date' as const, date: '2026-08-01' },
        createdAt: '2026-07-13T13:00:00.000Z',
        orderKey: 6,
      },
    ],
    itemTombstones: [
      {
        itemId: 'projection-source-tombstoned',
        ownership: 'source' as const,
        deletedAt: '2026-07-13T13:01:00.000Z',
      },
    ],
    orderOverride: [
      'projection-source-same-date',
      'projection-user-scheduled',
      'projection-source-alias',
      'projection-user-unscheduled',
      'projection-source-unscheduled-by-user',
      'projection-source-tombstoned',
      'projection-source-excluded',
    ],
    selection: {
      mode: 'all_except_excluded' as const,
      includedItemIds: [],
      excludedItemIds: ['projection-source-excluded'],
    },
  };
  const sourceItems = [
    {
      itemId: 'projection-source-alias',
      title: 'Source alias base',
      order: 0,
      schedule: { mode: 'anchor_offset' as const, dayOffset: 1 },
      source: { immutable: 'source-alias' },
    },
    {
      itemId: 'projection-source-same-date',
      title: 'Source same date',
      order: 1,
      schedule: { mode: 'anchor_offset' as const, dayOffset: 0 },
      source: { immutable: 'source-same-date' },
    },
    {
      itemId: 'projection-source-unscheduled-by-user',
      title: 'Source schedule removed by user',
      order: 2,
      schedule: { mode: 'anchor_offset' as const, dayOffset: 2 },
      source: { immutable: 'source-unscheduled' },
    },
    {
      itemId: 'projection-source-tombstoned',
      title: 'Tombstoned source item',
      order: 3,
      source: { immutable: 'source-tombstone' },
    },
    {
      itemId: 'projection-source-excluded',
      title: 'Excluded source item',
      order: 4,
      schedule: { mode: 'fixed_date' as const, date: '2026-08-03' },
      source: { immutable: 'source-excluded' },
    },
  ];
  const valueOverlays = [
    {
      itemId: 'projection-source-alias',
      title: 'Personal alias',
      personalMemo: 'Personal source memo',
      scheduleOverride: { mode: 'fixed_date' as const, date: '2026-08-02' },
    },
    {
      itemId: 'projection-source-unscheduled-by-user',
      scheduleOverride: null,
    },
  ];
  const executionStates = [
    { itemId: 'projection-source-alias', state: 'done' as const },
    { itemId: 'projection-user-scheduled', state: 'reopened' as const },
  ];
  const sourceBefore = JSON.stringify(sourceItems);
  const overlayBefore = JSON.stringify(structuralOverlay);
  const executionBefore = JSON.stringify(executionStates);

  const projection = buildPersonalStructuralProjection({
    sourceItems,
    structuralOverlay,
    valueOverlays,
    executionStates,
    anchorDate: '2026-08-01',
  });

  assert.deepEqual(
    projection.effectiveRows.map((row) => row.itemId),
    [
      'projection-source-same-date',
      'projection-user-scheduled',
      'projection-source-alias',
      'projection-user-unscheduled',
      'projection-source-unscheduled-by-user',
    ],
  );
  assert.deepEqual(
    projection.rowsByDestination.calendarScreen.map((row) => [row.itemId, row.calendarDate]),
    [
      ['projection-source-same-date', '2026-08-01'],
      ['projection-user-scheduled', '2026-08-01'],
      ['projection-source-alias', '2026-08-02'],
    ],
  );
  assert.deepEqual(
    projection.rowsByDestination.calendarIcs.map((row) => row.itemId),
    projection.rowsByDestination.calendarScreen.map((row) => row.itemId),
  );
  for (const destination of ['checklist', 'sheet', 'memo'] as const) {
    assert.deepEqual(
      projection.rowsByDestination[destination].map((row) => row.itemId),
      projection.effectiveRows.map((row) => row.itemId),
    );
  }

  const unscheduledUserItem = projection.allRows.find(
    (row) => row.itemId === 'projection-user-unscheduled',
  );
  assert.equal(unscheduledUserItem?.destinationEligibility.calendarScreen, false);
  assert.equal(unscheduledUserItem?.destinationEligibility.calendarIcs, false);
  assert.equal(unscheduledUserItem?.destinationEligibility.checklist, true);
  assert.equal(unscheduledUserItem?.destinationEligibility.sheet, true);
  assert.equal(unscheduledUserItem?.destinationEligibility.memo, true);

  const removedScheduleItem = projection.allRows.find(
    (row) => row.itemId === 'projection-source-unscheduled-by-user',
  );
  assert.equal(removedScheduleItem?.schedule, undefined);
  assert.equal(removedScheduleItem?.destinationEligibility.calendarScreen, false);
  assert.equal(removedScheduleItem?.destinationEligibility.checklist, true);

  const tombstoned = projection.allRows.find(
    (row) => row.itemId === 'projection-source-tombstoned',
  );
  const excluded = projection.allRows.find(
    (row) => row.itemId === 'projection-source-excluded',
  );
  assert.equal(
    Object.values(tombstoned?.destinationEligibility ?? {}).filter(Boolean).length,
    0,
  );
  assert.equal(
    Object.values(excluded?.destinationEligibility ?? {}).filter(Boolean).length,
    0,
  );
  assert.equal(excluded?.excluded, true);
  assert.equal(excluded?.included, false);

  const personalAlias = projection.allRows.find(
    (row) => row.itemId === 'projection-source-alias',
  );
  assert.equal(personalAlias?.title, 'Personal alias');
  assert.equal(personalAlias?.personalMemo, 'Personal source memo');
  assert.equal(personalAlias?.calendarDate, '2026-08-02');
  assert.equal(personalAlias?.executionState?.state, 'done');
  assert.equal(
    projection.allRows.find((row) => row.itemId === 'projection-user-scheduled')
      ?.executionState?.state,
    'reopened',
  );

  const restoredOverlay = restorePersonalStructuralItem(
    structuralOverlay,
    'projection-source-tombstoned',
    '2026-07-13T13:02:00.000Z',
  );
  const restoredProjection = buildPersonalStructuralProjection({
    sourceItems,
    structuralOverlay: restoredOverlay,
    valueOverlays,
    executionStates,
    anchorDate: '2026-08-01',
  });
  assert.equal(
    restoredProjection.effectiveRows.some(
      (row) => row.itemId === 'projection-source-tombstoned',
    ),
    true,
  );
  assert.equal(JSON.stringify(sourceItems), sourceBefore);
  assert.equal(JSON.stringify(structuralOverlay), overlayBefore);
  assert.equal(JSON.stringify(executionStates), executionBefore);
});

test('personal structural projection preserves source v2 items and source ownership on malformed order collisions', () => {
  const sourceItems = [
    { itemId: 'projection-v2-a', title: 'Source A', order: 0, source: { version: 1 } },
    { itemId: 'projection-v2-b', title: 'Source B', order: 1, source: { version: 1 } },
    { itemId: 'projection-v2-c', title: 'Source C', order: 2, source: { version: 2 } },
  ];
  const overlay = {
    ...createEmptyPersonalStructuralOverlay({
      savedCopyId: 'projection-v2-copy',
      flowId: 'projection-v2-flow',
    }),
    userItems: [
      {
        itemId: 'projection-v2-a',
        provenance: 'user_created' as const,
        title: 'Colliding personal item',
        createdAt: '2026-07-13T14:00:00.000Z',
        orderKey: 0,
      },
      {
        itemId: 'projection-v2-user',
        provenance: 'user_created' as const,
        title: 'Valid personal item',
        createdAt: '2026-07-13T14:00:00.000Z',
        orderKey: 1,
      },
    ],
    orderOverride: [
      'projection-missing-id',
      'projection-v2-b',
      'projection-v2-a',
      'projection-v2-user',
    ],
  };
  const sourceBefore = JSON.stringify(sourceItems);

  const projection = buildPersonalStructuralProjection({
    sourceItems,
    structuralOverlay: overlay,
  });

  assert.deepEqual(
    projection.effectiveRows.map((row) => row.itemId),
    ['projection-v2-b', 'projection-v2-a', 'projection-v2-user', 'projection-v2-c'],
  );
  assert.equal(
    projection.allRows.find((row) => row.itemId === 'projection-v2-a')?.ownership,
    'source',
  );
  assert.equal(
    projection.allRows.find((row) => row.itemId === 'projection-v2-a')?.title,
    'Source A',
  );
  assert.equal(
    projection.allRows.some((row) => row.itemId === 'projection-v2-c'),
    true,
  );
  assert.ok(projection.warnings.includes('unknown_order_item:projection-missing-id'));
  assert.ok(projection.warnings.includes('personal_item_collides_with_source:projection-v2-a'));
  assert.equal(JSON.stringify(sourceItems), sourceBefore);
});

test('personal draft projection wrapper stays limited to eligible draft records', () => {
  const personalDraft = bundle(
    'projection-personal-draft-flow',
    'url-draft-projection-contract',
    'Projection contract draft',
  );
  personalDraft.flow.status = 'draft';
  personalDraft.flow.source_title = '내 메모';
  personalDraft.flow.tags = ['내 초안', '내 메모'];
  personalDraft.items = [
    {
      id: 'projection-draft-source',
      flow_id: personalDraft.flow.id,
      title: 'Draft source item',
      type: 'todo',
      day_offset: 0,
      order: 0,
    },
  ];
  const overlay = createPersonalDraftStructuralOverlay(personalDraft);
  const projection = buildPersonalDraftStructuralProjection({
    bundle: personalDraft,
    structuralOverlay: overlay,
    anchorDate: '2026-08-01',
  });
  assert.ok(projection);
  assert.deepEqual(
    projection.rowsByDestination.calendarScreen.map((row) => [row.itemId, row.calendarDate]),
    [['projection-draft-source', '2026-08-01']],
  );

  const sourceBacked = structuredClone(personalDraft);
  sourceBacked.flow.status = 'published';
  sourceBacked.flow.slug = 'published-source-backed-projection';
  assert.equal(
    buildPersonalDraftStructuralProjection({
      bundle: sourceBacked,
      structuralOverlay: overlay,
      anchorDate: '2026-08-01',
    }),
    undefined,
  );
  assert.deepEqual(PERSONAL_STRUCTURAL_PROJECTION_DESTINATIONS, [
    'myFlow',
    'calendarScreen',
    'calendarIcs',
    'checklist',
    'sheet',
    'memo',
  ]);
});

test('personal structural normalization drops execution state fields', () => {
  const base = createEmptyPersonalStructuralOverlay({
    savedCopyId: 'copy-no-run-state',
    flowId: 'flow-no-run-state',
    updatedAt: '2026-07-13T09:00:00.000Z',
  });
  const unsafe = {
    ...base,
    completionState: 'done',
    skippedItemIds: ['source-a'],
    userItems: [{ ...structuralOverlayUserItem, done: true, occurrenceKey: '2026-07-13' }],
  };
  const normalized = normalizePersonalStructuralOverlay(unsafe, {
    savedCopyId: base.savedCopyId,
    flowId: base.flowId,
    fallbackTimestamp: base.updatedAt,
  });
  assert.ok(normalized);
  assert.equal('completionState' in normalized, false);
  assert.equal('skippedItemIds' in normalized, false);
  assert.equal('done' in normalized.userItems[0], false);
  assert.equal('occurrenceKey' in normalized.userItems[0], false);

  const storage = memoryStorage();
  savePersonalStructuralOverlay(
    storage,
    unsafe as unknown as ReturnType<typeof createEmptyPersonalStructuralOverlay>,
  );
  const persisted = JSON.parse(
    storage.getItem(getPersonalStructuralOverlayStorageKey(base.savedCopyId)) || '{}',
  ) as Record<string, unknown>;
  assert.equal('completionState' in persisted, false);
  assert.equal('skippedItemIds' in persisted, false);
  assert.equal('done' in ((persisted.userItems as Array<Record<string, unknown>>)[0] ?? {}), false);
});

test('personal structural persistence migrates additively and preserves malformed records', () => {
  const storage = memoryStorage({
    'legacy:personal-copy': JSON.stringify({ included: ['source-a'], excluded: ['source-b'] }),
  });
  const migrated = loadOrMigratePersonalStructuralOverlay(storage, {
    savedCopyId: 'copy-migrated',
    flowId: 'flow-migrated',
    legacy: {
      source: 'legacy_step_selection',
      includedItemIds: ['source-a', 'source-b'],
      excludedItemIds: ['source-b'],
      sourceSchemaVersion: 1,
    },
    now: '2026-07-13T09:00:00.000Z',
  });
  assert.equal(migrated.source, 'legacy_migration');
  assert.deepEqual(migrated.overlay.selection, {
    mode: 'only_included',
    includedItemIds: ['source-a'],
    excludedItemIds: ['source-b'],
  });
  assert.ok(storage.getItem(migrated.storageKey));
  assert.ok(storage.getItem('legacy:personal-copy'));
  assert.deepEqual(
    loadPersonalStructuralOverlay(storage, {
      savedCopyId: 'copy-migrated',
      flowId: 'flow-migrated',
      fallbackTimestamp: '2026-07-13T09:00:00.000Z',
    }),
    migrated.overlay,
  );

  const malformedKey = getPersonalStructuralOverlayStorageKey('copy-malformed');
  storage.setItem(malformedKey, '{not-json');
  const malformed = loadOrMigratePersonalStructuralOverlay(storage, {
    savedCopyId: 'copy-malformed',
    flowId: 'flow-malformed',
    legacy: { includedItemIds: ['source-a'] },
    now: '2026-07-13T09:00:00.000Z',
  });
  assert.equal(malformed.source, 'malformed_preserved');
  assert.deepEqual(malformed.warnings, ['malformed_overlay_preserved']);
  assert.equal(storage.getItem(malformedKey), '{not-json');
});

test('personal structural migration failure keeps legacy data available', () => {
  const base = memoryStorage({ 'legacy:copy': JSON.stringify({ included: ['source-a'] }) });
  const storage = {
    getItem: (key: string) => base.getItem(key),
    removeItem: (key: string) => base.removeItem(key),
    setItem: () => {
      throw new Error('quota exceeded');
    },
  };
  const result = loadOrMigratePersonalStructuralOverlay(storage, {
    savedCopyId: 'copy-quota',
    flowId: 'flow-quota',
    legacy: { includedItemIds: ['source-a'] },
    now: '2026-07-13T09:00:00.000Z',
  });
  assert.equal(result.source, 'legacy_migration');
  assert.deepEqual(result.warnings, ['migration_persistence_failed']);
  assert.ok(base.getItem('legacy:copy'));
  assert.equal(base.getItem(result.storageKey), null);
});

test('storage merge keeps local drafts while adding newly shipped seed flows', () => {
  const oldSeed = bundle('flow-old-seed', 'old-seed', 'Old seed from local storage');
  const editedLocalDraft = bundle('flow-local-draft', 'my-draft', 'My local draft');
  const latestOldSeed = bundle('flow-old-seed', 'old-seed', 'Updated seed from deployment');
  const newCreatorSeed = bundle(
    'flow-real-thankyou-bubu-video-full-body-no-jump',
    'real-thankyou-bubu-video-full-body-no-jump',
    'ThankyouBUBU exact video flow',
  );

  const merged = mergeSeedBundles([oldSeed, editedLocalDraft], [latestOldSeed, newCreatorSeed]);

  assert.deepEqual(
    merged.map((entry) => entry.flow.id),
    ['flow-old-seed', 'flow-real-thankyou-bubu-video-full-body-no-jump', 'flow-local-draft'],
  );
  assert.equal(merged[0].flow.title, 'Updated seed from deployment');
  assert.equal(merged[2].flow.title, 'My local draft');
});

test('storage merge removes legacy generated previews without removing user drafts', () => {
  const localDraft = bundle('flow-local-draft', 'my-draft', 'My local draft');
  localDraft.flow.status = 'draft';

  const merged = mergeSeedBundles([generatedPreviewBundle(), localDraft], []);

  assert.deepEqual(merged.map((entry) => entry.flow.id), ['flow-local-draft']);
});

test('storage merge removes archived published routes while preserving a user draft with the same slug', () => {
  const archived = bundle('flow-archived', 'digital-detox-weekly', 'Archived published Flow');
  const userDraft = bundle('flow-local-draft', 'digital-detox-weekly', 'My local draft');
  userDraft.flow.status = 'draft';

  const merged = mergeSeedBundles([archived, userDraft], []);

  assert.deepEqual(merged.map((entry) => entry.flow.id), ['flow-local-draft']);
});

test('getBundles migrates curated source app seed flows into existing local storage', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    localStorage.setItem(
      'flow_builder_mvp_bundles_v11',
      JSON.stringify([
        generatedPreviewBundle(),
        bundle('flow-archived', 'digital-detox-weekly', 'Archived published Flow'),
        bundle('flow-local-draft', 'my-draft', 'My local draft'),
      ]),
    );

    const migrated = getBundles();
    const migratedSlugs = new Set(migrated.map((entry) => entry.flow.slug));
    const activeCuratedSourceAppSeedFlowSlugs = curatedSourceAppSeedFlowSlugs.filter(
      (slug) => !RUNTIME_ARCHIVED_FLOW_SLUGS.includes(slug),
    );
    assert.deepEqual(
      activeCuratedSourceAppSeedFlowSlugs.filter((slug) => !migratedSlugs.has(slug)),
      [],
    );
    assert.ok(migratedSlugs.has('my-draft'));
    assert.equal(migratedSlugs.has('digital-detox-weekly'), false);
    assert.equal(migrated.some((entry) => entry.flow.id.startsWith('flow-preview-')), false);

    const persisted = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as FlowBundle[];
    const persistedSlugs = new Set(persisted.map((entry) => entry.flow.slug));
    assert.deepEqual(
      activeCuratedSourceAppSeedFlowSlugs.filter((slug) => !persistedSlugs.has(slug)),
      [],
    );
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('cloneSeedBundles includes active curated source app seed flows without source-backed merge', () => {
  const cloned = cloneSeedBundles();
  const clonedSlugs = new Set(cloned.map((entry) => entry.flow.slug));
  const activeCuratedSourceAppSeedFlowSlugs = curatedSourceAppSeedFlowSlugs.filter(
    (slug) => !RUNTIME_ARCHIVED_FLOW_SLUGS.includes(slug),
  );
  assert.deepEqual(
    activeCuratedSourceAppSeedFlowSlugs.filter((slug) => !clonedSlugs.has(slug)),
    [],
  );
  assert.equal(cloned.some((entry) => entry.flow.id.startsWith('flow-preview-')), false);
  assert.deepEqual(
    RUNTIME_ARCHIVED_FLOW_SLUGS.filter((slug) => clonedSlugs.has(slug)),
    [],
  );
});

test('getBundles preserves a saved archived flow as a retired personal copy', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage });

  try {
    const archived = bundle('flow-archived-book', 'book-finish-one', '책 한 권 완독 실천 Flow');
    archived.items = [
      {
        id: 'book-finish-old-item',
        flow_id: archived.flow.id,
        title: '매일 목표 페이지까지 읽기',
        type: 'todo',
        order: 1,
      },
    ];
    localStorage.setItem('flow_builder_mvp_bundles_v11', JSON.stringify([archived]));
    localStorage.setItem(
      'flow:saved:book-finish-one',
      JSON.stringify({
        slug: 'book-finish-one',
        savedAt: '2026-07-01T00:00:00.000Z',
        selectedArtifactMode: 'checklist',
      }),
    );
    localStorage.setItem(
      'flow_builder_mvp_checks_book-finish-one',
      JSON.stringify({ 'book-finish-old-item': true }),
    );

    const migrated = getBundles();
    const retired = migrated.find((entry) => entry.flow.slug === 'book-finish-one');
    assert.ok(retired);
    assert.equal(retired.flow.status, 'draft');
    assert.ok(retired.flow.tags?.includes(RETIRED_PERSONAL_COPY_TAG));
    const persisted = JSON.parse(localStorage.getItem('flow_builder_mvp_bundles_v11') || '[]') as FlowBundle[];
    const persistedRetired = persisted.find((entry) => entry.flow.slug === 'book-finish-one');
    assert.equal(persistedRetired?.flow.status, 'draft');
    assert.ok(persistedRetired?.flow.tags?.includes(RETIRED_PERSONAL_COPY_TAG));
    assert.deepEqual(
      getActiveFlowProgress(migrated).find((entry) => entry.slug === 'book-finish-one'),
      {
        slug: 'book-finish-one',
        title: '책 한 권 완독 실천 Flow',
        done: 1,
        total: 1,
        skipped: 0,
        anchor: undefined,
        anchorMode: 'custom',
        lastVisited: '2026-07-01T00:00:00.000Z',
      },
    );
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('getBundles recovers a saved archived flow after an earlier runtime migration removed its bundle', () => {
  const localStorage = memoryStorage({
    flow_builder_mvp_bundles_v11: '[]',
    'flow:saved:book-finish-one': JSON.stringify({
      slug: 'book-finish-one',
      savedAt: '2026-07-01T00:00:00.000Z',
      selectedArtifactMode: 'checklist',
    }),
  });
  const archivedSeed = seedBundles.find((entry) => entry.flow.slug === 'book-finish-one');
  assert.ok(archivedSeed);
  const firstItemId = archivedSeed.items[0]?.id;
  assert.ok(firstItemId);
  localStorage.setItem(
    'flow_builder_mvp_checks_book-finish-one',
    JSON.stringify({ [firstItemId]: true }),
  );
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage });

  try {
    const migrated = getBundles();
    const retired = migrated.find((entry) => entry.flow.slug === 'book-finish-one');
    assert.ok(retired);
    assert.equal(retired.flow.status, 'draft');
    assert.ok(retired.flow.tags?.includes(RETIRED_PERSONAL_COPY_TAG));
    assert.equal(
      getActiveFlowProgress(migrated).find((entry) => entry.slug === 'book-finish-one')?.done,
      1,
    );
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('saved flow record normalization keeps explicit save metadata', () => {
  assert.deepEqual(normalizeSavedFlowRecord(null), undefined);
  assert.deepEqual(normalizeSavedFlowRecord({ savedAt: 123 }), undefined);
  assert.deepEqual(
    normalizeSavedFlowRecord({
      slug: 'moving-d30-basic',
      savedAt: '2026-05-27T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-26',
      weekdays: ['월', '목', '월', 'bad'],
    }),
    {
      slug: 'moving-d30-basic',
      savedAt: '2026-05-27T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
      anchor: '2026-06-26',
      weekdays: ['월', '목'],
    },
  );
  assert.deepEqual(
    normalizeSavedFlowRecord({
      slug: 'moving-d30-basic',
      savedAt: '2026-05-27T00:00:00.000Z',
      selectedArtifactMode: 'bad-mode',
    }),
    {
      slug: 'moving-d30-basic',
      savedAt: '2026-05-27T00:00:00.000Z',
      selectedArtifactMode: 'calendar',
    },
  );
});

test('active flow progress can use an injected bundle list for source-backed records', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    const sourceBacked = {
      ...bundle('flow-source-backed-middle-school-math-1', 'source-backed-middle-school-math-1', '중1 수학 목차 진도'),
      items: [
        {
          id: 'math-prime-factorization',
          flow_id: 'flow-source-backed-middle-school-math-1',
          title: '소인수분해',
          type: 'todo' as const,
          order: 0,
        },
      ],
    };
    localStorage.setItem(
      'flow:saved:source-backed-middle-school-math-1',
      JSON.stringify({
        slug: 'source-backed-middle-school-math-1',
        savedAt: '2026-06-23T00:00:00.000Z',
        selectedArtifactMode: 'sheet',
      }),
    );

    const progress = getActiveFlowProgress([sourceBacked]);

    assert.deepEqual(progress.map((entry) => entry.slug), ['source-backed-middle-school-math-1']);
    assert.equal(progress[0].title, '중1 수학 목차 진도');
    assert.equal(progress[0].total, 1);
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('saved flow map snapshots index child flows back to their parent map', () => {
  assert.deepEqual(normalizeSavedFlowMapSnapshot(null), undefined);
  assert.deepEqual(
    normalizeSavedFlowMapSnapshot({
      mapId: 'baby-health-schedule',
      title: '영유아 검진·접종 일정 지도',
      version: '2026-06-23.1',
      savedAt: '2026-06-23T00:00:00.000Z',
      anchor: '2026-01-15',
      flowSlugs: ['source-backed-baby-health-checkups', 'source-backed-baby-vaccination-schedule'],
      stepCountsByFlow: {
        'source-backed-baby-health-checkups': 12,
        'source-backed-baby-vaccination-schedule': 6,
      },
    }),
    {
      mapId: 'baby-health-schedule',
      title: '영유아 검진·접종 일정 지도',
      version: '2026-06-23.1',
      savedAt: '2026-06-23T00:00:00.000Z',
      anchor: '2026-01-15',
      flowSlugs: ['source-backed-baby-health-checkups', 'source-backed-baby-vaccination-schedule'],
      stepCountsByFlow: {
        'source-backed-baby-health-checkups': 12,
        'source-backed-baby-vaccination-schedule': 6,
      },
    },
  );

  assert.deepEqual(
    normalizeSavedFlowMapSnapshot({
      mapId: 'middle-school-math-1',
      title: 'personal-only',
      version: '2026-06-24.1',
      savedAt: '2026-07-05T00:00:00.000Z',
      anchor: '2026-07-15',
      flowSlugs: ['source-backed-middle-school-math-1'],
      stepCountsByFlow: {
        'source-backed-middle-school-math-1': 1,
      },
      personalCopy: {
        source: 'url_first_custom_start',
        originalTitle: 'Middle school math',
        includedStepIdsByFlow: {
          'source-backed-middle-school-math-1': ['math-prime-factorization'],
        },
        excludedStepIdsByFlow: {
          'source-backed-middle-school-math-1': ['math-integers-rationals'],
        },
        stepOverridesByFlow: {
          'source-backed-middle-school-math-1': {
            'math-prime-factorization': {
              title: 'Prime factorization for my test',
              schedule: { mode: 'fixed_date', date: '2026-08-03' },
              userMemo: 'Use the worksheet examples first.',
            },
          },
        },
      },
    })?.personalCopy,
    {
      source: 'url_first_custom_start',
      originalTitle: 'Middle school math',
      includedStepIdsByFlow: {
        'source-backed-middle-school-math-1': ['math-prime-factorization'],
      },
      excludedStepIdsByFlow: {
        'source-backed-middle-school-math-1': ['math-integers-rationals'],
      },
      stepOverridesByFlow: {
        'source-backed-middle-school-math-1': {
          'math-prime-factorization': {
            title: 'Prime factorization for my test',
            schedule: { mode: 'fixed_date', date: '2026-08-03' },
            userMemo: 'Use the worksheet examples first.',
          },
        },
      },
    },
  );

  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    localStorage.setItem(
      'flow:map:saved:baby-health-schedule',
      JSON.stringify({
        mapId: 'baby-health-schedule',
        title: '영유아 검진·접종 일정 지도',
        version: '2026-06-23.1',
        savedAt: '2026-06-23T00:00:00.000Z',
        flowSlugs: ['source-backed-baby-health-checkups', 'source-backed-baby-vaccination-schedule'],
      }),
    );

    const index = getSavedFlowMapIndexByFlowSlug();
    assert.equal(index['source-backed-baby-health-checkups'].title, '영유아 검진·접종 일정 지도');
    assert.equal(index['source-backed-baby-vaccination-schedule'].mapId, 'baby-health-schedule');
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('new anchor preparation requires an explicit policy for fixed personal dates', () => {
  const personalCopy = {
    source: 'url_first_custom_start' as const,
    includedStepIdsByFlow: {
      'source-backed-moving-d30': ['moving-method-quotes', 'moving-address-change', 'moving-utility-transfer'],
    },
    excludedStepIdsByFlow: {
      'source-backed-moving-d30': [],
    },
    stepOverridesByFlow: {
      'source-backed-moving-d30': {
        'moving-method-quotes': {
          title: '내 견적 비교',
          schedule: { mode: 'fixed_date' as const, date: '2026-07-05' },
          userMemo: '두 업체만 비교',
        },
        'moving-address-change': {
          schedule: { mode: 'fixed_date' as const, date: '2026-07-20' },
        },
        'moving-utility-transfer': {
          title: '전기와 가스 이전',
        },
      },
    },
  };

  assert.equal(prepareFlowRunNewAnchor(personalCopy, '2026-09-15'), undefined);
  assert.equal(prepareFlowRunNewAnchor(personalCopy, '2026/09/15', 'keep_fixed_dates'), undefined);

  const keepPlan = prepareFlowRunNewAnchor(personalCopy, '2026-09-15', 'keep_fixed_dates');
  assert.ok(keepPlan);
  assert.equal(keepPlan.fixedDateOverrideCount, 2);
  assert.equal(keepPlan.retainedFixedDateOverrideCount, 2);
  assert.equal(keepPlan.resetFixedDateOverrideCount, 0);
  assert.deepEqual(keepPlan.personalCopySnapshot, personalCopy);
  assert.notEqual(keepPlan.personalCopySnapshot, personalCopy);

  const resetPlan = prepareFlowRunNewAnchor(personalCopy, '2026-09-15', 'reset_to_anchor');
  assert.ok(resetPlan);
  assert.equal(resetPlan.fixedDateOverrideCount, 2);
  assert.equal(resetPlan.retainedFixedDateOverrideCount, 0);
  assert.equal(resetPlan.resetFixedDateOverrideCount, 2);
  assert.deepEqual(resetPlan.personalCopySnapshot?.stepOverridesByFlow, {
    'source-backed-moving-d30': {
      'moving-method-quotes': {
        title: '내 견적 비교',
        userMemo: '두 업체만 비교',
      },
      'moving-utility-transfer': {
        title: '전기와 가스 이전',
      },
    },
  });
  assert.equal(
    personalCopy.stepOverridesByFlow['source-backed-moving-d30']['moving-method-quotes'].schedule.date,
    '2026-07-05',
  );
});

test('flow run registry preserves a completed legacy run before starting a clean new execution', () => {
  assert.equal(
    normalizeFlowRunRecord({
      schemaVersion: 1,
      runId: 'incomplete-record',
      flowSlug: 'moving-d30-basic',
      status: 'completed',
      startedAt: '2026-07-01T00:00:00.000Z',
    }),
    undefined,
  );
  assert.equal(
    normalizeFlowRunRegistry('moving-d30-basic', {
      schemaVersion: 1,
      runs: [
        {
          schemaVersion: 1,
          runId: 'recoverable-active-run',
          flowSlug: 'moving-d30-basic',
          status: 'active',
          startedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    }).activeRunId,
    'recoverable-active-run',
  );

  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    const flowSlug = 'source-backed-moving-d30';
    const legacyStartedAt = '2026-07-01T00:00:00.000Z';
    const legacyCompletedAt = '2026-07-31T10:00:00.000Z';
    const personalCopy = {
      source: 'url_first_custom_start',
      originalTitle: '내 이사 준비',
      includedStepIdsByFlow: {
        [flowSlug]: ['moving-method-quotes', 'moving-address-change'],
      },
      excludedStepIdsByFlow: {
        [flowSlug]: ['moving-utility-transfer'],
      },
      stepOverridesByFlow: {
        [flowSlug]: {
          'moving-method-quotes': {
            title: '내 견적 후보 비교',
            schedule: { mode: 'fixed_date', date: '2026-07-05' },
            userMemo: '두 업체만 비교',
          },
        },
      },
    } as const;

    localStorage.setItem(
      `flow:saved:${flowSlug}`,
      JSON.stringify({
        slug: flowSlug,
        savedAt: legacyStartedAt,
        selectedArtifactMode: 'calendar',
        anchor: '2026-07-31',
      }),
    );
    localStorage.setItem(`flow:${flowSlug}:anchorDate`, JSON.stringify({ mode: 'custom', anchor: '2026-07-31' }));
    localStorage.setItem(
      `flow:map:saved:moving-d30`,
      JSON.stringify({
        mapId: 'moving-d30',
        title: '내 이사 준비',
        version: '2026-06-24.1',
        savedAt: legacyStartedAt,
        anchor: '2026-07-31',
        flowSlugs: [flowSlug],
        stepCountsByFlow: { [flowSlug]: 2 },
        riskLevelsByFlow: { [flowSlug]: 'low' },
        sourceCheckedAtByFlow: { [flowSlug]: '2026-06-24' },
        personalCopy,
      }),
    );
    localStorage.setItem(
      `flow_builder_mvp_checks_${flowSlug}`,
      JSON.stringify({ 'moving-method-quotes': true, 'moving-address-change': true }),
    );
    localStorage.setItem(
      'flow:my-flow:item-drafts',
      JSON.stringify({
        [`${flowSlug}::moving-method-quotes::2026-07-05`]: { memo: '실행 중 비교표를 다시 확인' },
        'other-flow::first::none': { memo: '다른 Flow 메모' },
      }),
    );
    localStorage.setItem(
      'flow:my-flow:date-overrides',
      JSON.stringify({
        [`${flowSlug}::moving-address-change::2026-07-20`]: '2026-07-21',
        'other-flow::first::none': '2026-08-01',
      }),
    );
    localStorage.setItem(
      `flow_builder_mvp_item_state_${flowSlug}`,
      JSON.stringify({ 'moving-method-quotes': { note: '견적 비교 완료' }, 'moving-address-change': { skipped: true } }),
    );
    localStorage.setItem(
      'flow:my-flow:step-item-checks',
      JSON.stringify({
        [`${flowSlug}::moving-method-quotes::2026-07-05`]: { '0': true, '1': true },
        'other-flow::first::none': { '0': true },
      }),
    );
    localStorage.setItem(
      `flow_builder_mvp_comparison_${flowSlug}`,
      JSON.stringify({ candidates: [{ id: 'vendor-a', name: 'A 업체' }], notes: { price: { 'vendor-a': '100만원' } } }),
    );
    localStorage.setItem(
      `flow_builder_mvp_workbench_${flowSlug}`,
      JSON.stringify({ occurrences: { first: { done: true, note: '통화 완료' } }, logRows: {}, memoCards: {} }),
    );
    localStorage.setItem(
      `flow_builder_mvp_reactions_${flowSlug}`,
      JSON.stringify({ first: { preferenceNote: '다음에도 같은 순서 사용' } }),
    );
    const legacyRun = ensureLegacyActiveFlowRun(flowSlug, {
      runId: 'run-moving-legacy',
      startedAt: legacyStartedAt,
    });

    assert.ok(legacyRun);
    assert.equal(legacyRun.status, 'active');
    assert.equal(legacyRun.sourceVersion, '2026-06-24.1');
    assert.equal(legacyRun.mapId, 'moving-d30');
    assert.deepEqual(legacyRun.personalCopySnapshot, personalCopy);
    assert.deepEqual(getChecks(flowSlug), { 'moving-method-quotes': true, 'moving-address-change': true });
    assert.equal(getStoredAnchor(flowSlug).anchor, '2026-07-31');

    recordFlowCompletionState(flowSlug, true, legacyCompletedAt);
    const completedRun = completeActiveFlowRun(flowSlug);

    assert.ok(completedRun);
    assert.equal(completedRun.status, 'completed');
    assert.equal(completedRun.completedAt, legacyCompletedAt);
    assert.equal(getActiveFlowRun(flowSlug), undefined);
    assert.deepEqual(completedRun.completionSnapshot?.checks, {
      'moving-method-quotes': true,
      'moving-address-change': true,
    });
    assert.equal(completedRun.completionSnapshot?.itemStates['moving-method-quotes'].note, '견적 비교 완료');
    assert.equal(completedRun.completionSnapshot?.itemStates['moving-address-change'].skipped, true);
    assert.deepEqual(completedRun.completionSnapshot?.stepItemChecks, {
      [`${flowSlug}::moving-method-quotes::2026-07-05`]: { '0': true, '1': true },
    });
    assert.equal(completedRun.completionSnapshot?.comparisonState.candidates[0].name, 'A 업체');
    assert.equal(completedRun.completionSnapshot?.workbenchState.occurrences.first.note, '통화 완료');
    assert.equal(completedRun.completionSnapshot?.reactionLogs.first.preferenceNote, '다음에도 같은 순서 사용');
    assert.equal(completedRun.completionSnapshot?.completionFeedback, undefined);
    assert.deepEqual(completedRun.personalExecutionStateSnapshot, {
      itemDrafts: {
        [`${flowSlug}::moving-method-quotes::2026-07-05`]: { memo: '실행 중 비교표를 다시 확인' },
      },
      dateOverrides: {
        [`${flowSlug}::moving-address-change::2026-07-20`]: '2026-07-21',
      },
    });

    saveMyFlowCompletionFeedback(flowSlug, {
      reflection: {
        outcome: 'helpful',
        note: '이사 준비 순서를 놓치지 않았어요.',
        updatedAt: legacyCompletedAt,
      },
      sourceCorrectionDraft: {
        scope: 'item',
        itemId: 'moving-address-change',
        itemTitle: '주소 이전 신청하기',
        note: '신청 시간을 보강해 주세요.',
        sourceUrl: 'https://example.com/moving',
        updatedAt: legacyCompletedAt,
      },
    });

    const completedWithFeedback = getCompletedFlowRuns(flowSlug)[0];
    assert.equal(completedWithFeedback.completionSnapshot?.completionFeedback?.reflection?.outcome, 'helpful');
    assert.equal(
      completedWithFeedback.completionSnapshot?.completionFeedback?.sourceCorrectionDraft?.note,
      '신청 시간을 보강해 주세요.',
    );

    const structuralOverlay = savePersonalStructuralOverlay(
      localStorage,
      createEmptyPersonalStructuralOverlay({
        savedCopyId: flowSlug,
        flowId: flowSlug,
        updatedAt: legacyCompletedAt,
      }),
    );

    assert.equal(
      startFlowRunFromCompleted(flowSlug, {
        runId: 'invalid-run-without-anchor',
        startedAt: '2026-08-01T00:00:00.000Z',
        reuseMode: 'new_anchor',
      }),
      undefined,
    );
    assert.deepEqual(getChecks(flowSlug), { 'moving-method-quotes': true, 'moving-address-change': true });

    assert.equal(
      startFlowRunFromCompleted(flowSlug, {
        runId: 'invalid-run-without-fixed-date-policy',
        startedAt: '2026-08-01T00:00:00.000Z',
        reuseMode: 'new_anchor',
        anchor: '2026-09-15',
      }),
      undefined,
    );
    assert.deepEqual(getChecks(flowSlug), { 'moving-method-quotes': true, 'moving-address-change': true });

    const nextRun = startFlowRunFromCompleted(flowSlug, {
      runId: 'run-moving-second',
      startedAt: '2026-08-01T00:00:00.000Z',
      reuseMode: 'new_anchor',
      anchor: '2026-09-15',
      fixedDatePolicy: 'reset_to_anchor',
    });

    assert.ok(nextRun);
    assert.equal(nextRun.status, 'active');
    assert.equal(nextRun.previousRunId, completedWithFeedback.runId);
    assert.equal(nextRun.anchor, '2026-09-15');
    assert.equal(nextRun.fixedDatePolicy, 'reset_to_anchor');
    assert.equal(nextRun.sourceVersion, completedWithFeedback.sourceVersion);
    assert.deepEqual(nextRun.personalCopySnapshot?.stepOverridesByFlow, {
      [flowSlug]: {
        'moving-method-quotes': {
          title: '내 견적 후보 비교',
          userMemo: '두 업체만 비교',
        },
      },
    });
    assert.deepEqual(nextRun.personalExecutionStateSnapshot, {
      itemDrafts: {
        [`${flowSlug}::moving-method-quotes::draft-overlay`]: { memo: '실행 중 비교표를 다시 확인' },
      },
      dateOverrides: {},
    });
    assert.deepEqual(getFlowScopedMyFlowPersonalExecutionState(flowSlug), nextRun.personalExecutionStateSnapshot);
    assert.equal(
      JSON.parse(localStorage.getItem('flow:my-flow:item-drafts') || '{}')['other-flow::first::none'].memo,
      '다른 Flow 메모',
    );
    assert.equal(
      JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}')['other-flow::first::none'],
      '2026-08-01',
    );
    assert.deepEqual(getChecks(flowSlug), {});
    assert.deepEqual(getItemStates(flowSlug), {
      'moving-utility-transfer': { skipped: true, note: 'excluded_on_start' },
    });
    assert.equal(getMyFlowCompletionFeedback(flowSlug), undefined);
    assert.equal(localStorage.getItem(`flow:completion-detected-at:${flowSlug}`), null);
    assert.deepEqual(getMyFlowStepItemChecks(), { 'other-flow::first::none': { '0': true } });
    assert.equal(getStoredAnchor(flowSlug).anchor, '2026-09-15');
    assert.deepEqual(
      loadPersonalStructuralOverlay(localStorage, {
        savedCopyId: flowSlug,
        flowId: flowSlug,
        fallbackTimestamp: legacyCompletedAt,
      }),
      structuralOverlay,
    );
    assert.equal(getSavedFlowRecord(flowSlug)?.savedAt, '2026-08-01T00:00:00.000Z');
    const activeMapSnapshot = getSavedFlowMapIndexByFlowSlug()[flowSlug];
    assert.equal(activeMapSnapshot.anchor, '2026-09-15');
    assert.equal(activeMapSnapshot.savedAt, '2026-08-01T00:00:00.000Z');
    assert.deepEqual(activeMapSnapshot.personalCopy, nextRun.personalCopySnapshot);
    const activePersistenceRecord = JSON.parse(
      localStorage.getItem('flow:map:persistence:moving-d30') || 'null',
    );
    assert.equal(activePersistenceRecord.saved.anchor, '2026-09-15');
    assert.deepEqual(activePersistenceRecord.personalCopy, nextRun.personalCopySnapshot);

    const completedHistory = getCompletedFlowRuns(flowSlug);
    assert.equal(completedHistory.length, 1);
    assert.equal(completedHistory[0].runId, 'run-moving-legacy');
    assert.equal(completedHistory[0].completionSnapshot?.completionFeedback?.reflection?.note, '이사 준비 순서를 놓치지 않았어요.');
    assert.equal(
      completedHistory[0].personalCopySnapshot?.stepOverridesByFlow?.[flowSlug]?.['moving-method-quotes']?.schedule?.date,
      '2026-07-05',
    );
    assert.equal(
      completedHistory[0].personalExecutionStateSnapshot?.dateOverrides[`${flowSlug}::moving-address-change::2026-07-20`],
      '2026-07-21',
    );
    const registry = getFlowRunRegistry(flowSlug);
    assert.equal(registry.activeRunId, 'run-moving-second');
    assert.deepEqual(registry.runs.map((run) => [run.runId, run.status]), [
      ['run-moving-legacy', 'completed'],
      ['run-moving-second', 'active'],
    ]);
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('clear flow local progress removes saved and per-flow state keys', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    const keys = [
      'flow:saved:moving-d30-basic',
      'flow_builder_mvp_checks_moving-d30-basic',
      'flow:moving-d30-basic:anchorDate',
      'flow_builder_mvp_item_state_moving-d30-basic',
      'flow_builder_mvp_comparison_moving-d30-basic',
      'flow_builder_mvp_workbench_moving-d30-basic',
      'flow_builder_mvp_reactions_moving-d30-basic',
      'flow:my-flow:completion-feedback:moving-d30-basic',
      'flow:run-registry:moving-d30-basic',
      'flow:completion-detected-at:moving-d30-basic',
    ];
    keys.forEach((key) => localStorage.setItem(key, 'value'));
    localStorage.setItem('flow:my-flow:step-item-checks', JSON.stringify({
      'moving-d30-basic::moving-method-quotes::2026-05-28': { '0': true },
      'other-flow::first::none': { '0': true },
    }));
    localStorage.setItem('flow:my-flow:item-drafts', JSON.stringify({
      'moving-d30-basic::moving-method-quotes::draft-overlay': { memo: '삭제할 메모' },
      'other-flow::first::none': { memo: '남길 메모' },
    }));
    localStorage.setItem('flow:my-flow:date-overrides', JSON.stringify({
      'moving-d30-basic::moving-method-quotes::2026-05-28': '2026-05-29',
      'other-flow::first::none': '2026-06-01',
    }));
    const removedStructuralKey = getPersonalStructuralOverlayStorageKey('moving-copy');
    const retainedStructuralKey = getPersonalStructuralOverlayStorageKey('other-copy');
    savePersonalStructuralOverlay(localStorage, createEmptyPersonalStructuralOverlay({
      savedCopyId: 'moving-copy',
      flowId: 'moving-d30-basic',
      updatedAt: '2026-07-13T09:00:00.000Z',
    }));
    savePersonalStructuralOverlay(localStorage, createEmptyPersonalStructuralOverlay({
      savedCopyId: 'other-copy',
      flowId: 'other-flow',
      updatedAt: '2026-07-13T09:00:00.000Z',
    }));

    clearFlowLocalProgress('moving-d30-basic');

    keys.forEach((key) => assert.equal(localStorage.getItem(key), null));
    assert.deepEqual(JSON.parse(localStorage.getItem('flow:my-flow:step-item-checks') || '{}'), {
      'other-flow::first::none': { '0': true },
    });
    assert.deepEqual(JSON.parse(localStorage.getItem('flow:my-flow:item-drafts') || '{}'), {
      'other-flow::first::none': { memo: '남길 메모' },
    });
    assert.deepEqual(JSON.parse(localStorage.getItem('flow:my-flow:date-overrides') || '{}'), {
      'other-flow::first::none': '2026-06-01',
    });
    assert.equal(localStorage.getItem(removedStructuralKey), null);
    assert.ok(localStorage.getItem(retainedStructuralKey));
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('completion feedback keeps private reflection separate from an unsent source correction draft', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    assert.equal(normalizeMyFlowCompletionFeedback({ flowSlug: 'moving-d30-basic' }), undefined);
    assert.equal(
      normalizeMyFlowCompletionFeedback({
        flowSlug: 'moving-d30-basic',
        sourceCorrectionDraft: {
          scope: 'item',
          note: '날짜가 잘못됐어요.',
          updatedAt: '2026-07-11T00:00:00.000Z',
        },
      }),
      undefined,
    );

    const saved = saveMyFlowCompletionFeedback('moving-d30-basic', {
      reflection: {
        outcome: 'helpful',
        note: '이사 당일 확인 순서가 유용했어요.',
        updatedAt: '2026-07-11T00:00:00.000Z',
      },
      sourceCorrectionDraft: {
        scope: 'item',
        itemId: 'moving-address-change',
        itemTitle: '주소 이전 신청하기',
        note: '신청 가능 시간을 함께 알려주세요.',
        sourceUrl: 'https://example.com/moving',
        updatedAt: '2026-07-11T00:01:00.000Z',
      },
    });

    assert.deepEqual(saved, {
      flowSlug: 'moving-d30-basic',
      reflection: {
        outcome: 'helpful',
        note: '이사 당일 확인 순서가 유용했어요.',
        updatedAt: '2026-07-11T00:00:00.000Z',
      },
      sourceCorrectionDraft: {
        scope: 'item',
        itemId: 'moving-address-change',
        itemTitle: '주소 이전 신청하기',
        note: '신청 가능 시간을 함께 알려주세요.',
        sourceUrl: 'https://example.com/moving',
        updatedAt: '2026-07-11T00:01:00.000Z',
      },
    });
    assert.deepEqual(getMyFlowCompletionFeedback('moving-d30-basic'), saved);
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('my flow step item checks are persisted separately from step completion', () => {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage,
  });

  try {
    saveMyFlowStepItemChecks({
      'source-backed-middle-school-math-1::math-prime-factorization::none': { '0': true, '2': true },
    });

    assert.deepEqual(getMyFlowStepItemChecks(), {
      'source-backed-middle-school-math-1::math-prime-factorization::none': { '0': true, '2': true },
    });
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});

test('FlowMe local backup includes execution records and excludes internal browser state', () => {
  const structuralKey = getPersonalStructuralOverlayStorageKey('moving-copy');
  const storage = memoryStorage({
    'flow:saved:moving-d30-basic': JSON.stringify({ slug: 'moving-d30-basic' }),
    'flow:moving-d30-basic:anchorDate': JSON.stringify({ mode: 'custom', anchor: '2026-08-15' }),
    'flow_builder_mvp_checks_moving-d30-basic': JSON.stringify({ moving_box: true }),
    'flow:run-registry:moving-d30-basic': JSON.stringify({
      schemaVersion: 1,
      runs: [
        { schemaVersion: 1, runId: 'run-1', flowSlug: 'moving-d30-basic', status: 'completed', startedAt: '2026-07-01', completedAt: '2026-07-02' },
      ],
    }),
    'flow:url-first:supply-candidates': JSON.stringify([{ canonicalUrl: 'https://example.com/a' }]),
    [structuralKey]: JSON.stringify(createEmptyPersonalStructuralOverlay({
      savedCopyId: 'moving-copy',
      flowId: 'moving-d30-basic',
      updatedAt: '2026-07-13T09:00:00.000Z',
    })),
    'flow:auth:demo-user': 'true',
    'flow:map:update:dismissed': JSON.stringify({ moving: true }),
    'content-lab:review:internal': 'operator-only',
  });

  const backup = buildFlowMeLocalBackup(storage, '2026-07-11T09:00:00.000Z');
  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.summary.savedFlowRecordCount, 1);
  assert.equal(backup.summary.completedRunCount, 1);
  assert.equal(backup.summary.requestRecordCount, 1);
  assert.ok(backup.entries['flow:saved:moving-d30-basic']);
  assert.ok(backup.entries[structuralKey]);
  assert.equal(backup.entries['flow:auth:demo-user'], undefined);
  assert.equal(backup.entries['flow:map:update:dismissed'], undefined);
  assert.equal(backup.entries['content-lab:review:internal'], undefined);
  assert.equal(getFlowMeLocalBackupFilename(backup.exportedAt), 'flowme-backup-2026-07-11.json');

  const parsed = parseFlowMeLocalBackup(serializeFlowMeLocalBackup(backup));
  assert.deepEqual(parsed, backup);
});

test('FlowMe local backup rejects unsupported keys instead of importing arbitrary browser data', () => {
  const serialized = JSON.stringify({
    format: 'flowme-local-backup',
    schemaVersion: 1,
    exportedAt: '2026-07-11T09:00:00.000Z',
    entries: {
      'flow:auth:demo-user': 'true',
    },
  });

  assert.throws(
    () => parseFlowMeLocalBackup(serialized),
    (error: unknown) => error instanceof FlowMeLocalBackupError && error.code === 'invalid_entry',
  );
});

test('FlowMe local restore replaces execution records but preserves unrelated browser state', () => {
  const structuralKey = getPersonalStructuralOverlayStorageKey('moving-copy');
  const storage = memoryStorage({
    'flow:saved:old-flow': JSON.stringify({ slug: 'old-flow' }),
    'flow_builder_mvp_checks_old-flow': JSON.stringify({ old: true }),
    'flow:auth:demo-user': 'true',
  });
  const backup = parseFlowMeLocalBackup(JSON.stringify({
    format: 'flowme-local-backup',
    schemaVersion: 1,
    exportedAt: '2026-07-11T09:00:00.000Z',
    entries: {
      'flow:saved:moving-d30-basic': JSON.stringify({ slug: 'moving-d30-basic' }),
      'flow:moving-d30-basic:anchorDate': JSON.stringify({ mode: 'custom', anchor: '2026-08-15' }),
      [structuralKey]: JSON.stringify(createEmptyPersonalStructuralOverlay({
        savedCopyId: 'moving-copy',
        flowId: 'moving-d30-basic',
        updatedAt: '2026-07-13T09:00:00.000Z',
      })),
    },
  }));

  restoreFlowMeLocalBackup(storage, backup);

  assert.equal(storage.getItem('flow:saved:old-flow'), null);
  assert.equal(storage.getItem('flow_builder_mvp_checks_old-flow'), null);
  assert.ok(storage.getItem('flow:saved:moving-d30-basic'));
  assert.ok(storage.getItem(structuralKey));
  assert.equal(storage.getItem('flow:auth:demo-user'), 'true');
});

test('FlowMe local restore rolls back existing execution records when writing fails', () => {
  const base = memoryStorage({
    'flow:saved:old-flow': JSON.stringify({ slug: 'old-flow' }),
    'flow:auth:demo-user': 'true',
  });
  let shouldFail = true;
  const storage: FlowMeStorageLike = {
    get length() {
      return base.length;
    },
    key: (index) => base.key(index),
    getItem: (key) => base.getItem(key),
    removeItem: (key) => base.removeItem(key),
    setItem: (key, value) => {
      if (shouldFail && key === 'flow:saved:new-flow') {
        shouldFail = false;
        throw new Error('quota exceeded');
      }
      base.setItem(key, value);
    },
  };
  const backup = parseFlowMeLocalBackup(JSON.stringify({
    format: 'flowme-local-backup',
    schemaVersion: 1,
    exportedAt: '2026-07-11T09:00:00.000Z',
    entries: {
      'flow:saved:new-flow': JSON.stringify({ slug: 'new-flow' }),
    },
  }));

  assert.throws(
    () => restoreFlowMeLocalBackup(storage, backup),
    (error: unknown) => error instanceof FlowMeLocalBackupError && error.code === 'restore_failed',
  );
  assert.ok(storage.getItem('flow:saved:old-flow'));
  assert.equal(storage.getItem('flow:saved:new-flow'), null);
  assert.equal(storage.getItem('flow:auth:demo-user'), 'true');
});
