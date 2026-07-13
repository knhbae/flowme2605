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
  setPersonalDraftUserItemDate,
  setPersonalDraftUserItemRecurrence,
  setPersonalDraftUserItemSchedule,
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
import { personalStructuralScheduleGoldenFixtures } from './personal-structural-schedule.fixtures';
import {
  createRecurrenceFixtureSchedule,
  createRecurrenceFixtureSeries,
  personalStructuralOccurrenceStateMatrix,
  personalStructuralRecurrenceGoldenFixtureIds,
  PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
} from './personal-structural-recurrence.fixtures';
import {
  appendPersonalStructuralRecurrenceRevision,
  buildPersonalStructuralOccurrenceId,
  migrateLegacyPersonalStructuralRepeat,
  normalizePersonalStructuralRecurrence,
  setPersonalStructuralOccurrenceOverride,
} from './personal-structural-recurrence';
import {
  buildPersonalDraftOccurrenceProjection,
  generatePersonalStructuralOccurrences,
  transitionPersonalStructuralOccurrenceExecution,
  type PersonalStructuralOccurrenceExecutionRecord,
} from './personal-structural-occurrence';
import {
  buildPersonalStructuralScheduleProjection,
  normalizePersonalStructuralSchedule,
  PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES,
} from './personal-structural-schedule';
import {
  buildPersonalDraftProjectionValueOverlays,
  getPersonalDraftProjectionValueKey,
} from './personal-draft-projection-state';
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

test('personal draft user-created item date stays structural and reversible across projections', () => {
  const personalDraft = bundle(
    'flow-personal-date-draft',
    'url-draft-personal-date-1',
    'Personal date draft',
  );
  personalDraft.flow.status = 'draft';
  personalDraft.flow.source_title = '내 메모';
  personalDraft.flow.tags = ['내 초안', '내 메모'];
  personalDraft.items = [
    {
      id: 'date-source-a',
      flow_id: personalDraft.flow.id,
      title: 'Source task',
      type: 'todo',
      order: 0,
    },
  ];
  const sourceBefore = JSON.stringify(personalDraft.items);
  const created = createPersonalDraftUserItem({
    overlay: createPersonalDraftStructuralOverlay(personalDraft),
    title: 'Personal scheduled task',
    itemId: 'personal-date-a',
    createdAt: '2026-07-13T21:00:00.000Z',
  });
  assert.ok(created);

  assert.equal(
    setPersonalDraftUserItemDate({
      overlay: created.overlay,
      itemId: 'personal-date-a',
      date: '2026-02-30',
    }),
    undefined,
  );
  assert.equal(
    setPersonalDraftUserItemDate({
      overlay: created.overlay,
      itemId: 'date-source-a',
      date: '2026-08-05',
    }),
    undefined,
  );

  const scheduled = setPersonalDraftUserItemDate({
    overlay: created.overlay,
    itemId: 'personal-date-a',
    date: '2026-08-05',
    updatedAt: '2026-07-13T21:01:00.000Z',
  });
  assert.ok(scheduled);
  assert.equal(scheduled.userItem.itemId, 'personal-date-a');
  assert.deepEqual(scheduled.userItem.schedule, {
    mode: 'fixed_date',
    date: '2026-08-05',
  });
  const scheduledProjection = buildPersonalDraftStructuralProjection({
    bundle: personalDraft,
    structuralOverlay: scheduled.overlay,
    executionStates: [{ itemId: 'personal-date-a', state: 'done' }],
  });
  assert.ok(scheduledProjection);
  assert.deepEqual(
    scheduledProjection.rowsByDestination.calendarScreen.map((row) => row.itemId),
    ['personal-date-a'],
  );
  assert.deepEqual(
    scheduledProjection.rowsByDestination.calendarIcs.map((row) => row.itemId),
    ['personal-date-a'],
  );
  assert.equal(
    scheduledProjection.effectiveRows.find((row) => row.itemId === 'personal-date-a')
      ?.executionState?.state,
    'done',
  );

  const changed = setPersonalDraftUserItemDate({
    overlay: scheduled.overlay,
    itemId: 'personal-date-a',
    date: '2026-08-09',
    updatedAt: '2026-07-13T21:02:00.000Z',
  });
  assert.ok(changed);
  assert.equal(changed.userItem.itemId, scheduled.userItem.itemId);
  assert.deepEqual(changed.userItem.schedule, {
    mode: 'fixed_date',
    date: '2026-08-09',
  });
  const changedProjection = buildPersonalDraftStructuralProjection({
    bundle: personalDraft,
    structuralOverlay: changed.overlay,
  });
  assert.equal(
    changedProjection?.rowsByDestination.calendarScreen[0]?.calendarDate,
    '2026-08-09',
  );
  assert.equal(
    changedProjection?.rowsByDestination.calendarIcs[0]?.calendarDate,
    '2026-08-09',
  );

  const unscheduled = setPersonalDraftUserItemDate({
    overlay: changed.overlay,
    itemId: 'personal-date-a',
    date: '',
    updatedAt: '2026-07-13T21:03:00.000Z',
  });
  assert.ok(unscheduled);
  assert.equal(unscheduled.userItem.itemId, scheduled.userItem.itemId);
  assert.equal(unscheduled.userItem.schedule, undefined);
  const unscheduledProjection = buildPersonalDraftStructuralProjection({
    bundle: personalDraft,
    structuralOverlay: unscheduled.overlay,
    executionStates: [{ itemId: 'personal-date-a', state: 'reopened' }],
  });
  assert.ok(unscheduledProjection);
  assert.equal(
    unscheduledProjection.rowsByDestination.calendarScreen.some(
      (row) => row.itemId === 'personal-date-a',
    ),
    false,
  );
  assert.equal(
    unscheduledProjection.rowsByDestination.calendarIcs.some(
      (row) => row.itemId === 'personal-date-a',
    ),
    false,
  );
  for (const destination of ['checklist', 'sheet', 'memo'] as const) {
    assert.equal(
      unscheduledProjection.rowsByDestination[destination].some(
        (row) => row.itemId === 'personal-date-a',
      ),
      true,
    );
  }
  assert.equal(
    unscheduledProjection.effectiveRows.find((row) => row.itemId === 'personal-date-a')
      ?.executionState?.state,
    'reopened',
  );
  assert.equal(JSON.stringify(personalDraft.items), sourceBefore);
});

test('personal draft user-created schedule preserves date, time, duration, zone, and stable identity', () => {
  const personalDraft = bundle(
    'flow-personal-time-draft',
    'url-draft-personal-time-1',
    'Personal time draft',
  );
  personalDraft.flow.status = 'draft';
  personalDraft.flow.source_title = '내 메모';
  personalDraft.flow.tags = ['내 초안', '내 메모'];
  const created = createPersonalDraftUserItem({
    overlay: createPersonalDraftStructuralOverlay(personalDraft),
    title: 'Timed personal task',
    itemId: 'personal-time-a',
    createdAt: '2026-07-13T22:00:00.000Z',
  });
  assert.ok(created);

  assert.equal(
    setPersonalDraftUserItemSchedule({
      overlay: created.overlay,
      itemId: 'personal-time-a',
      date: '2026-08-12',
      mode: 'timed',
      time: '24:00',
      durationMinutes: 45,
    }),
    undefined,
  );

  const timed = setPersonalDraftUserItemSchedule({
    overlay: created.overlay,
    itemId: 'personal-time-a',
    date: '2026-08-12',
    mode: 'timed',
    time: '23:50',
    durationMinutes: 45,
    timeZone: 'Asia/Seoul',
    updatedAt: '2026-07-13T22:01:00.000Z',
  });
  assert.ok(timed);
  assert.deepEqual(timed.userItem.schedule, {
    mode: 'fixed_date',
    date: '2026-08-12',
    time: '23:50',
    durationMinutes: 45,
    timeZone: 'Asia/Seoul',
  });

  const moved = setPersonalDraftUserItemDate({
    overlay: timed.overlay,
    itemId: 'personal-time-a',
    date: '2026-08-14',
    updatedAt: '2026-07-13T22:02:00.000Z',
  });
  assert.ok(moved);
  assert.deepEqual(moved.userItem.schedule, {
    mode: 'fixed_date',
    date: '2026-08-14',
    time: '23:50',
    durationMinutes: 45,
    timeZone: 'Asia/Seoul',
  });

  const timedProjection = buildPersonalDraftStructuralProjection({
    bundle: personalDraft,
    structuralOverlay: moved.overlay,
    executionStates: [{ itemId: 'personal-time-a', state: 'done' }],
  });
  const timedRow = timedProjection?.allRows.find(
    (row) => row.itemId === 'personal-time-a',
  );
  assert.equal(timedRow?.scheduleProjection.scheduleState, 'timed');
  assert.equal(timedRow?.scheduleProjection.endDate, '2026-08-15');
  assert.equal(timedRow?.scheduleProjection.endTime, '00:35');
  assert.equal(timedRow?.executionState?.state, 'done');

  const unscheduled = setPersonalDraftUserItemDate({
    overlay: moved.overlay,
    itemId: 'personal-time-a',
    date: '',
    updatedAt: '2026-07-13T22:02:30.000Z',
  });
  assert.ok(unscheduled);
  assert.equal(unscheduled.userItem.schedule, undefined);

  const allDay = setPersonalDraftUserItemSchedule({
    overlay: moved.overlay,
    itemId: 'personal-time-a',
    date: '2026-08-14',
    mode: 'all_day',
  });
  assert.ok(allDay);
  assert.deepEqual(allDay.userItem.schedule, {
    mode: 'fixed_date',
    date: '2026-08-14',
  });
  const allDayProjection = buildPersonalDraftStructuralProjection({
    bundle: personalDraft,
    structuralOverlay: allDay.overlay,
    executionStates: [{ itemId: 'personal-time-a', state: 'reopened' }],
  });
  assert.equal(
    timedRow?.scheduleProjection.stableEventIdentitySeed,
    allDayProjection?.allRows.find((row) => row.itemId === 'personal-time-a')
      ?.scheduleProjection.stableEventIdentitySeed,
  );
  assert.equal(
    allDayProjection?.allRows.find((row) => row.itemId === 'personal-time-a')
      ?.executionState?.state,
    'reopened',
  );
});

test('personal draft recurrence editing persists rules without changing item or schedule identity', () => {
  const personalDraft = bundle(
    'flow-personal-recurrence-draft',
    'url-draft-personal-recurrence-1',
    'Personal recurrence draft',
  );
  personalDraft.flow.status = 'draft';
  personalDraft.flow.source_title = '내 메모';
  personalDraft.flow.tags = ['내 초안', '내 메모'];
  const created = createPersonalDraftUserItem({
    overlay: createPersonalDraftStructuralOverlay(personalDraft),
    title: 'Weekly personal task',
    itemId: 'personal-recurrence-a',
    createdAt: '2026-07-13T22:10:00.000Z',
  });
  assert.ok(created);
  const scheduled = setPersonalDraftUserItemSchedule({
    overlay: created.overlay,
    itemId: 'personal-recurrence-a',
    date: '2026-08-10',
    mode: 'timed',
    time: '09:30',
    durationMinutes: 45,
    timeZone: 'Asia/Seoul',
    updatedAt: '2026-07-13T22:11:00.000Z',
  });
  assert.ok(scheduled);

  const weekly = setPersonalDraftUserItemRecurrence({
    overlay: scheduled.overlay,
    itemId: 'personal-recurrence-a',
    mode: 'weekly',
    interval: 2,
    weekdays: ['MO', 'WE', 'FR'],
    endMode: 'count',
    occurrenceCount: 12,
    updatedAt: '2026-07-13T22:12:00.000Z',
  });
  assert.ok(weekly);
  const weeklySchedule = weekly.userItem.schedule;
  assert.equal(weekly.userItem.itemId, 'personal-recurrence-a');
  assert.equal(weeklySchedule?.mode, 'fixed_date');
  if (weeklySchedule?.mode !== 'fixed_date') assert.fail('fixed date schedule required');
  assert.equal(weeklySchedule.time, '09:30');
  assert.equal(weeklySchedule.durationMinutes, 45);
  assert.equal(weeklySchedule.timeZone, 'Asia/Seoul');
  const weeklySeries = normalizePersonalStructuralRecurrence({
    value: weeklySchedule.repeat,
    identityNamespace: weekly.overlay.savedCopyId,
    itemId: weekly.userItem.itemId,
    startDate: weeklySchedule.date,
  }).series;
  assert.deepEqual(weeklySeries?.revisions[0].rule, {
    frequency: 'weekly',
    interval: 2,
    weekdays: ['MO', 'WE', 'FR'],
    end: { mode: 'count', count: 12 },
  });
  const seriesId = weeklySeries?.seriesId;

  assert.equal(
    setPersonalDraftUserItemRecurrence({
      overlay: weekly.overlay,
      itemId: 'personal-recurrence-a',
      mode: 'weekly',
      interval: 0,
      weekdays: ['MO'],
    }),
    undefined,
  );
  assert.equal(
    setPersonalDraftUserItemRecurrence({
      overlay: weekly.overlay,
      itemId: 'personal-recurrence-a',
      mode: 'weekly',
      interval: 1,
      weekdays: [],
    }),
    undefined,
  );
  assert.equal(
    setPersonalDraftUserItemRecurrence({
      overlay: weekly.overlay,
      itemId: 'personal-recurrence-a',
      mode: 'daily',
      interval: 1,
      endMode: 'until',
      untilDate: '2026-08-09',
    }),
    undefined,
  );

  const daily = setPersonalDraftUserItemRecurrence({
    overlay: weekly.overlay,
    itemId: 'personal-recurrence-a',
    mode: 'daily',
    interval: 1,
    endMode: 'until',
    untilDate: '2026-09-01',
    executionRecordCount: 0,
    updatedAt: '2026-07-13T22:13:00.000Z',
  });
  assert.ok(daily);
  const dailySchedule = daily.userItem.schedule;
  if (dailySchedule?.mode !== 'fixed_date') assert.fail('fixed date schedule required');
  const dailySeries = normalizePersonalStructuralRecurrence({
    value: dailySchedule.repeat,
    identityNamespace: daily.overlay.savedCopyId,
    itemId: daily.userItem.itemId,
    startDate: dailySchedule.date,
  }).series;
  assert.equal(dailySeries?.seriesId, seriesId);
  assert.equal(dailySeries?.revisions.length, 1);
  assert.deepEqual(dailySeries?.revisions[0].rule, {
    frequency: 'daily',
    interval: 1,
    end: { mode: 'until', date: '2026-09-01' },
  });

  const cleared = setPersonalDraftUserItemRecurrence({
    overlay: daily.overlay,
    itemId: 'personal-recurrence-a',
    mode: 'none',
    updatedAt: '2026-07-13T22:14:00.000Z',
  });
  assert.ok(cleared);
  assert.deepEqual(cleared.userItem.schedule, {
    mode: 'fixed_date',
    date: '2026-08-10',
    time: '09:30',
    durationMinutes: 45,
    timeZone: 'Asia/Seoul',
  });
  assert.equal(
    setPersonalDraftUserItemRecurrence({
      overlay: created.overlay,
      itemId: 'personal-recurrence-a',
      mode: 'daily',
    }),
    undefined,
  );
});

test('personal structural schedule contract distinguishes unscheduled, all-day, and timed fixtures', () => {
  assert.equal(personalStructuralScheduleGoldenFixtures.length, 10);

  personalStructuralScheduleGoldenFixtures.forEach((fixture) => {
    const normalized = normalizePersonalStructuralSchedule(fixture.schedule);
    const projection = buildPersonalStructuralScheduleProjection({
      schedule: fixture.schedule,
      anchorDate: fixture.anchorDate,
      identityNamespace: 'schedule-fixture-copy',
      itemId: fixture.id,
    });

    assert.equal(projection.scheduleState, fixture.expected.scheduleState, fixture.id);
    assert.equal(projection.calendarDate, fixture.expected.calendarDate, fixture.id);
    assert.equal(projection.startTime, fixture.expected.startTime, fixture.id);
    assert.equal(projection.durationMinutes, fixture.expected.durationMinutes, fixture.id);
    assert.equal(projection.endDate, fixture.expected.endDate, fixture.id);
    assert.equal(projection.endTime, fixture.expected.endTime, fixture.id);
    assert.equal(projection.timeZone, fixture.expected.timeZone, fixture.id);
    assert.equal(projection.timeZonePolicy, fixture.expected.timeZonePolicy, fixture.id);
    if (fixture.expected.warningIncludes) {
      assert.ok(
        projection.validationWarnings.includes(fixture.expected.warningIncludes),
        fixture.id,
      );
    }
    if (fixture.expected.legacyTimeOnlyMigrated !== undefined) {
      assert.equal(
        normalized.legacyTimeOnlyMigrated,
        fixture.expected.legacyTimeOnlyMigrated,
        fixture.id,
      );
    }
  });
});

test('personal structural schedule normalization preserves legacy time and safely repairs malformed fields', () => {
  const legacy = normalizePersonalStructuralSchedule({
    mode: 'fixed_date',
    date: '2026-08-03',
    time: '09:30',
  });
  assert.deepEqual(legacy.schedule, {
    mode: 'fixed_date',
    date: '2026-08-03',
    time: '09:30',
  });
  assert.equal(legacy.legacyTimeOnlyMigrated, true);
  assert.equal(
    buildPersonalStructuralScheduleProjection({
      schedule: legacy.schedule,
      identityNamespace: 'legacy-copy',
      itemId: 'legacy-item',
    }).durationMinutes,
    PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES,
  );

  const invalidTimeZone = buildPersonalStructuralScheduleProjection({
    schedule: {
      mode: 'fixed_date',
      date: '2026-08-03',
      time: '10:00',
      durationMinutes: 60,
      timeZone: 'Not/AZone',
    },
    identityNamespace: 'malformed-copy',
    itemId: 'malformed-zone',
  });
  assert.equal(invalidTimeZone.scheduleState, 'timed');
  assert.equal(invalidTimeZone.durationMinutes, 60);
  assert.equal(invalidTimeZone.timeZonePolicy, 'floating_local');
  assert.ok(invalidTimeZone.validationWarnings.includes('invalid_time_zone'));

  const normalizedOverlay = normalizePersonalStructuralOverlay(
    {
      schemaVersion: 1,
      savedCopyId: 'schedule-migration-copy',
      flowId: 'schedule-migration-flow',
      userItems: [
        {
          itemId: 'legacy-timed-user',
          provenance: 'user_created',
          title: 'Legacy timed user item',
          schedule: { mode: 'fixed_date', date: '2026-08-03', time: '08:15' },
          createdAt: '2026-07-13T00:00:00.000Z',
          orderKey: 0,
        },
        {
          itemId: 'malformed-schedule-user',
          provenance: 'user_created',
          title: 'Keep malformed schedule item',
          schedule: { mode: 'fixed_date', date: '2026-02-30', time: '24:00' },
          createdAt: '2026-07-13T00:00:00.000Z',
          orderKey: 1,
        },
      ],
      itemTombstones: [],
      orderOverride: ['legacy-timed-user', 'malformed-schedule-user'],
      selection: {
        mode: 'all_except_excluded',
        includedItemIds: [],
        excludedItemIds: [],
      },
      updatedAt: '2026-07-13T00:00:00.000Z',
    },
    { fallbackTimestamp: '2026-07-13T00:00:00.000Z' },
  );
  assert.ok(normalizedOverlay);
  assert.equal(normalizedOverlay.userItems.length, 2);
  assert.deepEqual(normalizedOverlay.userItems[0]?.schedule, {
    mode: 'fixed_date',
    date: '2026-08-03',
    time: '08:15',
  });
  assert.equal(normalizedOverlay.userItems[1]?.schedule, undefined);
});

test('personal structural timed projection sorts all-day first and keeps stable identity across edits', () => {
  const sourceItems = [
    {
      itemId: 'timed-ten',
      title: 'Timed 10',
      order: 4,
      schedule: { mode: 'fixed_date' as const, date: '2026-08-03', time: '10:00' },
      source: { immutable: 'timed-ten' },
    },
    {
      itemId: 'timed-nine-later-rank',
      title: 'Timed 9 later rank',
      order: 3,
      schedule: { mode: 'fixed_date' as const, date: '2026-08-03', time: '09:00' },
      source: { immutable: 'timed-nine-later-rank' },
    },
    {
      itemId: 'all-day',
      title: 'All day',
      order: 2,
      schedule: { mode: 'fixed_date' as const, date: '2026-08-03' },
      source: { immutable: 'all-day' },
    },
    {
      itemId: 'timed-nine-earlier-rank',
      title: 'Timed 9 earlier rank',
      order: 1,
      schedule: { mode: 'fixed_date' as const, date: '2026-08-03', time: '09:00' },
      source: { immutable: 'timed-nine-earlier-rank' },
    },
    {
      itemId: 'earlier-date',
      title: 'Earlier date',
      order: 0,
      schedule: { mode: 'fixed_date' as const, date: '2026-08-02', time: '23:00' },
      source: { immutable: 'earlier-date' },
    },
  ];
  const sourceBefore = JSON.stringify(sourceItems);
  const structuralOverlay = createEmptyPersonalStructuralOverlay({
    savedCopyId: 'timed-sort-copy',
    flowId: 'timed-sort-flow',
    updatedAt: '2026-07-13T00:00:00.000Z',
  });
  const doneProjection = buildPersonalStructuralProjection({
    sourceItems,
    structuralOverlay,
    executionStates: [{ itemId: 'timed-ten', state: 'done' }],
  });
  assert.deepEqual(
    doneProjection.rowsByDestination.calendarScreen.map((row) => row.itemId),
    [
      'earlier-date',
      'all-day',
      'timed-nine-earlier-rank',
      'timed-nine-later-rank',
      'timed-ten',
    ],
  );
  assert.equal(
    doneProjection.allRows.find((row) => row.itemId === 'timed-ten')?.executionState?.state,
    'done',
  );

  const editedProjection = buildPersonalStructuralProjection({
    sourceItems,
    structuralOverlay,
    valueOverlays: [
      {
        itemId: 'timed-ten',
        scheduleOverride: {
          mode: 'fixed_date',
          date: '2026-08-03',
          time: '11:30',
          durationMinutes: 45,
          timeZone: 'Asia/Seoul',
        },
      },
    ],
    executionStates: [{ itemId: 'timed-ten', state: 'reopened' }],
  });
  const beforeEdit = doneProjection.allRows.find((row) => row.itemId === 'timed-ten');
  const afterEdit = editedProjection.allRows.find((row) => row.itemId === 'timed-ten');
  assert.equal(
    beforeEdit?.scheduleProjection.stableEventIdentitySeed,
    afterEdit?.scheduleProjection.stableEventIdentitySeed,
  );
  assert.equal(afterEdit?.scheduleProjection.startTime, '11:30');
  assert.equal(afterEdit?.scheduleProjection.durationMinutes, 45);
  assert.equal(afterEdit?.scheduleProjection.timeZonePolicy, 'iana');
  assert.equal(afterEdit?.executionState?.state, 'reopened');
  assert.equal(doneProjection.rowsByDestination.calendarScreen.length, 5);
  assert.equal(editedProjection.rowsByDestination.calendarScreen.length, 5);
  assert.equal(JSON.stringify(sourceItems), sourceBefore);
});

test('personal draft recurrence golden fixtures cover bounded daily weekly monthly and timed projections', () => {
  assert.equal(personalStructuralRecurrenceGoldenFixtureIds.length, 30);
  assert.equal(new Set(personalStructuralRecurrenceGoldenFixtureIds).size, 30);

  const project = (options: {
    itemId: string;
    date: string;
    rule?: Parameters<typeof createRecurrenceFixtureSeries>[0]['rule'];
    range: { start: string; end: string };
    time?: string;
    durationMinutes?: number;
    timeZone?: string;
    maxOccurrences?: number;
  }) => {
    const series = options.rule
      ? createRecurrenceFixtureSeries({
          itemId: options.itemId,
          startDate: options.date,
          rule: options.rule,
          ...(options.time ? { time: options.time } : {}),
          ...(options.durationMinutes !== undefined
            ? { durationMinutes: options.durationMinutes }
            : {}),
          ...(options.timeZone ? { timeZone: options.timeZone } : {}),
        })
      : undefined;
    return generatePersonalStructuralOccurrences({
      identityNamespace: 'recurrence-golden-fixtures',
      itemId: options.itemId,
      schedule: createRecurrenceFixtureSchedule({
        date: options.date,
        ...(series ? { series } : {}),
        ...(options.time ? { time: options.time } : {}),
        ...(options.durationMinutes !== undefined
          ? { durationMinutes: options.durationMinutes }
          : {}),
        ...(options.timeZone ? { timeZone: options.timeZone } : {}),
      }),
      range: options.range,
      fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
      ...(options.maxOccurrences ? { maxOccurrences: options.maxOccurrences } : {}),
    });
  };
  const dates = (result: ReturnType<typeof project>) =>
    result.projectedOccurrences.map((occurrence) => occurrence.localDate);

  assert.deepEqual(
    dates(project({
      itemId: 'none',
      date: '2026-07-13',
      range: { start: '2026-07-01', end: '2026-07-31' },
    })),
    ['2026-07-13'],
  );
  assert.deepEqual(
    dates(project({
      itemId: 'daily',
      date: '2026-07-13',
      rule: { frequency: 'daily', interval: 1 },
      range: { start: '2026-07-13', end: '2026-07-15' },
    })),
    ['2026-07-13', '2026-07-14', '2026-07-15'],
  );
  assert.deepEqual(
    dates(project({
      itemId: 'every-two-days',
      date: '2026-07-13',
      rule: { frequency: 'daily', interval: 2 },
      range: { start: '2026-07-13', end: '2026-07-17' },
    })),
    ['2026-07-13', '2026-07-15', '2026-07-17'],
  );
  assert.deepEqual(
    dates(project({
      itemId: 'weekdays',
      date: '2026-07-13',
      rule: {
        frequency: 'weekly',
        interval: 1,
        weekdays: ['MO', 'TU', 'WE', 'TH', 'FR'],
      },
      range: { start: '2026-07-13', end: '2026-07-19' },
    })),
    ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'],
  );
  assert.deepEqual(
    dates(project({
      itemId: 'three-days-weekly',
      date: '2026-07-13',
      rule: { frequency: 'weekly', interval: 1, weekdays: ['MO', 'WE', 'FR'] },
      range: { start: '2026-07-13', end: '2026-07-19' },
    })),
    ['2026-07-13', '2026-07-15', '2026-07-17'],
  );
  assert.deepEqual(
    dates(project({
      itemId: 'every-two-weeks',
      date: '2026-07-13',
      rule: { frequency: 'weekly', interval: 2, weekdays: ['MO'] },
      range: { start: '2026-07-13', end: '2026-08-10' },
    })),
    ['2026-07-13', '2026-07-27', '2026-08-10'],
  );
  assert.deepEqual(
    dates(project({
      itemId: 'monthly',
      date: '2026-01-15',
      rule: {
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 15,
        invalidMonthDayPolicy: 'skip',
      },
      range: { start: '2026-01-01', end: '2026-04-30' },
    })),
    ['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15'],
  );
  assert.deepEqual(
    dates(project({
      itemId: 'monthly-day-31-skip',
      date: '2026-01-31',
      rule: {
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 31,
        invalidMonthDayPolicy: 'skip',
      },
      range: { start: '2026-01-01', end: '2026-04-30' },
    })),
    ['2026-01-31', '2026-03-31'],
  );
  assert.deepEqual(
    dates(project({
      itemId: 'until-end',
      date: '2026-07-13',
      rule: {
        frequency: 'daily',
        interval: 1,
        end: { mode: 'until', date: '2026-07-15' },
      },
      range: { start: '2026-07-01', end: '2026-07-31' },
    })),
    ['2026-07-13', '2026-07-14', '2026-07-15'],
  );
  assert.deepEqual(
    dates(project({
      itemId: 'count-end',
      date: '2026-07-13',
      rule: {
        frequency: 'daily',
        interval: 1,
        end: { mode: 'count', count: 2 },
      },
      range: { start: '2026-07-01', end: '2026-07-31' },
    })),
    ['2026-07-13', '2026-07-14'],
  );

  const limited = project({
    itemId: 'open-ended-range-bound',
    date: '2026-07-13',
    rule: { frequency: 'daily', interval: 1 },
    range: { start: '2026-07-13', end: '2026-08-31' },
    maxOccurrences: 3,
  });
  assert.equal(limited.occurrences.length, 3);
  assert.equal(limited.generationLimitReached, true);

  const allDay = project({
    itemId: 'all-day-recurrence',
    date: '2026-07-13',
    rule: { frequency: 'daily', interval: 1, end: { mode: 'count', count: 2 } },
    range: { start: '2026-07-13', end: '2026-07-14' },
  });
  assert.ok(
    allDay.occurrences.every(
      (occurrence) => occurrence.scheduleProjection.scheduleState === 'all_day',
    ),
  );

  const ianaTimed = project({
    itemId: 'iana-timed-recurrence',
    date: '2026-03-07',
    rule: { frequency: 'daily', interval: 1, end: { mode: 'count', count: 3 } },
    range: { start: '2026-03-07', end: '2026-03-09' },
    time: '09:00',
    durationMinutes: 45,
    timeZone: 'America/New_York',
  });
  assert.deepEqual(
    ianaTimed.occurrences.map((occurrence) => occurrence.scheduleProjection.startTime),
    ['09:00', '09:00', '09:00'],
  );
  assert.ok(
    ianaTimed.occurrences.every(
      (occurrence) => occurrence.scheduleProjection.timeZonePolicy === 'iana',
    ),
  );
  assert.equal(
    new Set(
      ianaTimed.occurrences.map((occurrence) => occurrence.scheduleProjection.startTime),
    ).size,
    1,
  );

  const floatingTimed = project({
    itemId: 'floating-timed-recurrence',
    date: '2026-07-13',
    rule: { frequency: 'daily', interval: 1, end: { mode: 'count', count: 2 } },
    range: { start: '2026-07-13', end: '2026-07-14' },
    time: '18:30',
    durationMinutes: 30,
  });
  assert.ok(
    floatingTimed.occurrences.every(
      (occurrence) => occurrence.scheduleProjection.timeZonePolicy === 'floating_local',
    ),
  );
});

test('personal draft recurrence keeps series revision and occurrence identities stable across edits', () => {
  const baseSeries = createRecurrenceFixtureSeries({
    itemId: 'identity-item',
    startDate: '2026-07-13',
    rule: { frequency: 'daily', interval: 1 },
    time: '09:00',
    durationMinutes: 30,
    timeZone: 'Asia/Seoul',
  });
  const baseSchedule = createRecurrenceFixtureSchedule({
    date: '2026-07-13',
    series: baseSeries,
    time: '09:00',
    durationMinutes: 30,
    timeZone: 'Asia/Seoul',
  });
  const before = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'identity-item',
    schedule: baseSchedule,
    range: { start: '2026-07-13', end: '2026-07-17' },
    personalOrderRank: 1,
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  const reordered = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'identity-item',
    schedule: baseSchedule,
    range: { start: '2026-07-13', end: '2026-07-17' },
    personalOrderRank: 9,
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.deepEqual(
    before.occurrences.map((occurrence) => occurrence.occurrenceId),
    reordered.occurrences.map((occurrence) => occurrence.occurrenceId),
  );
  assert.equal(before.series?.seriesId, reordered.series?.seriesId);

  const revisedSeries = appendPersonalStructuralRecurrenceRevision({
    series: baseSeries,
    scope: 'future',
    effectiveFrom: '2026-07-15',
    rule: { frequency: 'daily', interval: 2 },
    scheduleTemplate: {
      time: '10:00',
      durationMinutes: 45,
      timeZone: 'Asia/Seoul',
    },
    updatedAt: '2026-07-14T00:00:00.000Z',
    executionRecordCount: 1,
  });
  const revised = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'identity-item',
    schedule: createRecurrenceFixtureSchedule({
      date: '2026-07-13',
      series: revisedSeries,
      time: '09:00',
      durationMinutes: 30,
      timeZone: 'Asia/Seoul',
    }),
    range: { start: '2026-07-13', end: '2026-07-18' },
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.deepEqual(
    revised.occurrences.slice(0, 2).map((occurrence) => occurrence.occurrenceId),
    before.occurrences.slice(0, 2).map((occurrence) => occurrence.occurrenceId),
  );
  assert.deepEqual(
    revised.occurrences.map((occurrence) => occurrence.localDate),
    ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-17'],
  );
  assert.deepEqual(
    revised.occurrences.slice(2).map((occurrence) => occurrence.scheduleProjection.startTime),
    ['10:00', '10:00'],
  );

  const originalOccurrence = before.occurrences[0];
  const overriddenSeries = setPersonalStructuralOccurrenceOverride({
    series: baseSeries,
    override: {
      occurrenceId: originalOccurrence.occurrenceId,
      mode: 'reschedule',
      schedule: {
        date: '2026-07-14',
        time: '11:00',
        durationMinutes: 60,
        timeZone: 'Asia/Seoul',
      },
      updatedAt: '2026-07-13T01:00:00.000Z',
    },
  });
  const overridden = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'identity-item',
    schedule: createRecurrenceFixtureSchedule({
      date: '2026-07-13',
      series: overriddenSeries,
      time: '09:00',
      durationMinutes: 30,
      timeZone: 'Asia/Seoul',
    }),
    range: { start: '2026-07-13', end: '2026-07-17' },
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  const movedOccurrence = overridden.occurrences.find(
    (occurrence) => occurrence.occurrenceId === originalOccurrence.occurrenceId,
  );
  assert.equal(movedOccurrence?.localDate, '2026-07-14');
  assert.equal(movedOccurrence?.scheduleProjection.startTime, '11:00');
  assert.equal(movedOccurrence?.occurrenceOverrideApplied, true);
  assert.equal(new Set(overridden.occurrences.map((entry) => entry.occurrenceId)).size,
    overridden.occurrences.length);

  const allEditWithoutHistory = appendPersonalStructuralRecurrenceRevision({
    series: baseSeries,
    scope: 'all',
    effectiveFrom: '2026-07-14',
    rule: { frequency: 'weekly', interval: 1, weekdays: ['TU'] },
    updatedAt: '2026-07-14T02:00:00.000Z',
    executionRecordCount: 0,
  });
  assert.equal(allEditWithoutHistory.revisions.length, 1);
  assert.equal(
    allEditWithoutHistory.revisions[0].revisionId,
    baseSeries.revisions[0].revisionId,
  );
  const allEditWithHistory = appendPersonalStructuralRecurrenceRevision({
    series: baseSeries,
    scope: 'all',
    effectiveFrom: '2026-07-15',
    rule: { frequency: 'weekly', interval: 1, weekdays: ['WE'] },
    updatedAt: '2026-07-14T03:00:00.000Z',
    executionRecordCount: 1,
  });
  assert.equal(allEditWithHistory.revisions.length, 2);
  assert.equal(
    allEditWithHistory.revisions[0].revisionId,
    baseSeries.revisions[0].revisionId,
  );

  const excludedOccurrenceSeries = setPersonalStructuralOccurrenceOverride({
    series: baseSeries,
    override: {
      occurrenceId: before.occurrences[1].occurrenceId,
      mode: 'exclude',
      updatedAt: '2026-07-14T04:00:00.000Z',
    },
  });
  const excludedOccurrenceProjection = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'identity-item',
    schedule: createRecurrenceFixtureSchedule({
      date: '2026-07-13',
      series: excludedOccurrenceSeries,
      time: '09:00',
      durationMinutes: 30,
      timeZone: 'Asia/Seoul',
    }),
    range: { start: '2026-07-13', end: '2026-07-17' },
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.equal(excludedOccurrenceProjection.occurrences.length, before.occurrences.length);
  assert.equal(
    excludedOccurrenceProjection.projectedOccurrences.length,
    before.projectedOccurrences.length - 1,
  );
});

test('personal recurrence execution adapter keeps done reopened skipped and held separate from structure', () => {
  const identity = {
    occurrenceId: 'occurrence-state-a',
    seriesId: 'series-state-a',
    revisionId: 'revision-state-a',
  };
  const done = transitionPersonalStructuralOccurrenceExecution({
    ...identity,
    nextState: 'done',
    at: '2026-07-13T01:00:00.000Z',
  });
  const reopened = transitionPersonalStructuralOccurrenceExecution({
    ...identity,
    current: done,
    nextState: 'reopened',
    at: '2026-07-13T02:00:00.000Z',
  });
  assert.equal(done.state, 'done');
  assert.equal(reopened.state, 'reopened');
  assert.equal(reopened.completedAt, done.completedAt);
  assert.equal(reopened.history.length, 2);
  const completedAgain = transitionPersonalStructuralOccurrenceExecution({
    ...identity,
    current: reopened,
    nextState: 'done',
    at: '2026-07-13T02:30:00.000Z',
  });
  assert.equal(completedAgain.completedAt, '2026-07-13T02:30:00.000Z');
  assert.equal(completedAgain.history.length, 3);

  const skipped = transitionPersonalStructuralOccurrenceExecution({
    occurrenceId: 'occurrence-state-skipped',
    seriesId: identity.seriesId,
    revisionId: identity.revisionId,
    nextState: 'skipped',
    at: '2026-07-13T03:00:00.000Z',
  });
  const held = transitionPersonalStructuralOccurrenceExecution({
    occurrenceId: 'occurrence-state-held',
    seriesId: identity.seriesId,
    revisionId: identity.revisionId,
    nextState: 'held',
    at: '2026-07-13T04:00:00.000Z',
  });
  assert.equal(skipped.state, 'skipped');
  assert.equal(held.state, 'held');
  assert.notEqual(skipped.state, held.state);
  assert.equal(personalStructuralOccurrenceStateMatrix.length, 10);
  assert.throws(() =>
    transitionPersonalStructuralOccurrenceExecution({
      ...identity,
      current: done,
      nextState: 'skipped',
      at: '2026-07-13T05:00:00.000Z',
    }),
  );
  assert.throws(() =>
    transitionPersonalStructuralOccurrenceExecution({
      ...identity,
      nextState: 'done',
      at: 'not-a-time',
    }),
  );

  const series = createRecurrenceFixtureSeries({
    itemId: 'execution-membership',
    startDate: '2026-07-13',
    rule: { frequency: 'daily', interval: 1, end: { mode: 'count', count: 3 } },
  });
  const schedule = createRecurrenceFixtureSchedule({ date: '2026-07-13', series });
  const pending = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'execution-membership',
    schedule,
    range: { start: '2026-07-13', end: '2026-07-15' },
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  const first = pending.occurrences[0];
  const record = transitionPersonalStructuralOccurrenceExecution({
    occurrenceId: first.occurrenceId,
    seriesId: first.seriesId,
    revisionId: first.revisionId,
    nextState: 'done',
    at: '2026-07-13T06:00:00.000Z',
  });
  const withDone = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'execution-membership',
    schedule,
    range: { start: '2026-07-13', end: '2026-07-15' },
    executionRecords: [record],
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.equal(withDone.projectedOccurrences.length, pending.projectedOccurrences.length);
  assert.equal(withDone.occurrences[0].executionState, 'done');

  const tombstoned = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'execution-membership',
    schedule,
    range: { start: '2026-07-13', end: '2026-07-15' },
    executionRecords: [record],
    tombstoned: true,
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.equal(tombstoned.projectedOccurrences.length, 0);
  assert.equal(tombstoned.executionRecords[0].occurrenceId, record.occurrenceId);

  const restored = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'execution-membership',
    schedule,
    range: { start: '2026-07-13', end: '2026-07-15' },
    executionRecords: [record],
    tombstoned: false,
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.deepEqual(
    restored.occurrences.map((entry) => entry.occurrenceId),
    pending.occurrences.map((entry) => entry.occurrenceId),
  );
});

test('personal recurrence migration and malformed defense preserve schedules and stay draft-only', () => {
  const legacy = migrateLegacyPersonalStructuralRepeat({
    repeat: { frequency: 'weekly', interval: 2 },
    identityNamespace: 'legacy-copy',
    itemId: 'legacy-repeat-item',
    startDate: '2026-07-13',
    time: '09:00',
    durationMinutes: 30,
    timeZone: 'Asia/Seoul',
    updatedAt: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.equal(legacy.legacyMigrated, true);
  assert.equal(legacy.series?.revisions[0].rule.frequency, 'weekly');
  assert.deepEqual(legacy.series?.revisions[0].rule.weekdays, ['MO']);
  assert.equal(legacy.series?.revisions[0].scheduleTemplate?.time, '09:00');

  const preset = normalizePersonalStructuralRecurrence({
    value: undefined,
    repeatPreset: 'monthly',
    identityNamespace: 'preset-copy',
    itemId: 'preset-item',
    startDate: '2026-07-31',
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.equal(preset.legacyMigrated, true);
  assert.equal(preset.series?.revisions[0].rule.dayOfMonth, 31);
  assert.equal(preset.series?.revisions[0].rule.invalidMonthDayPolicy, 'skip');

  const sourceSeries = createRecurrenceFixtureSeries({
    itemId: 'source-preservation',
    startDate: '2026-07-13',
    rule: { frequency: 'daily', interval: 1 },
  });
  const sourceSchedule = createRecurrenceFixtureSchedule({
    date: '2026-07-13',
    series: sourceSeries,
  });
  const before = JSON.stringify(sourceSchedule);
  const projection = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'source-preservation',
    schedule: sourceSchedule,
    range: { start: '2026-07-13', end: '2026-07-14' },
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.equal(JSON.stringify(sourceSchedule), before);
  assert.equal(projection.projectedOccurrences.length, 2);

  const normalizedRichOverlay = normalizePersonalStructuralOverlay(
    {
      schemaVersion: 1,
      savedCopyId: 'recurrence-overlay-copy',
      flowId: 'recurrence-overlay-flow',
      userItems: [
        {
          itemId: 'recurrence-overlay-item',
          provenance: 'user_created',
          title: 'Recurring personal item',
          schedule: {
            ...sourceSchedule,
            repeat: {
              ...sourceSeries,
              state: 'done',
            },
          },
          createdAt: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
          orderKey: 0,
        },
      ],
      itemTombstones: [],
      orderOverride: ['recurrence-overlay-item'],
      selection: {
        mode: 'all_except_excluded',
        includedItemIds: [],
        excludedItemIds: [],
      },
      updatedAt: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
    },
    { fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP },
  );
  assert.equal(normalizedRichOverlay?.userItems.length, 1);
  const persistedRepeat = normalizedRichOverlay?.userItems[0].schedule?.mode === 'fixed_date'
    ? normalizedRichOverlay.userItems[0].schedule.repeat
    : undefined;
  assert.equal(
    persistedRepeat && 'schemaVersion' in persistedRepeat
      ? persistedRepeat.seriesId
      : undefined,
    sourceSeries.seriesId,
  );
  assert.equal(
    persistedRepeat && 'state' in persistedRepeat ? persistedRepeat.state : undefined,
    undefined,
  );

  const malformedSchedule = normalizePersonalStructuralSchedule({
    mode: 'fixed_date',
    date: '2026-07-13',
    repeat: {
      schemaVersion: 1,
      seriesId: 'malformed-series',
      status: 'active',
      revisions: [{ effectiveFrom: 'not-a-date', rule: { frequency: 'unknown' } }],
      occurrenceOverrides: [],
      updatedAt: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
    },
  });
  assert.ok(malformedSchedule.schedule);
  assert.equal(malformedSchedule.schedule?.mode, 'fixed_date');
  assert.equal(
    malformedSchedule.schedule?.mode === 'fixed_date'
      ? malformedSchedule.schedule.repeat
      : undefined,
    undefined,
  );

  assert.equal(
    buildPersonalDraftOccurrenceProjection({
      personalDraftEligible: false,
      ownership: 'source',
      identityNamespace: 'published-flow',
      itemId: 'published-item',
      schedule: { mode: 'fixed_date', date: '2026-07-13' },
      range: { start: '2026-07-13', end: '2026-07-13' },
    }),
    undefined,
  );
  assert.equal(
    buildPersonalDraftOccurrenceProjection({
      personalDraftEligible: true,
      ownership: 'source',
      identityNamespace: 'draft-flow',
      itemId: 'draft-source-item',
      schedule: { mode: 'fixed_date', date: '2026-07-13' },
      range: { start: '2026-07-13', end: '2026-07-13' },
    }),
    undefined,
  );
});

test('personal recurrence range and duplicate guards cap projection without losing the item contract', () => {
  const series = createRecurrenceFixtureSeries({
    itemId: 'range-guard',
    startDate: '2026-07-13',
    rule: { frequency: 'daily', interval: 1 },
  });
  const schedule = createRecurrenceFixtureSchedule({ date: '2026-07-13', series });
  const outside = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'range-guard',
    schedule,
    range: { start: '2026-06-01', end: '2026-06-30' },
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.equal(outside.occurrences.length, 0);

  const limited = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'range-guard',
    schedule,
    range: { start: '2026-07-13', end: '2030-12-31' },
    maxOccurrences: 5,
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.equal(limited.occurrences.length, 5);
  assert.equal(limited.generationLimitReached, true);
  assert.equal(new Set(limited.occurrences.map((entry) => entry.occurrenceId)).size, 5);

  const paused = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'range-guard',
    schedule: createRecurrenceFixtureSchedule({
      date: '2026-07-13',
      series: {
        ...series,
        status: 'paused',
        statusEffectiveFrom: '2026-07-15',
      },
    }),
    range: { start: '2026-07-13', end: '2026-07-20' },
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.deepEqual(
    paused.projectedOccurrences.map((entry) => entry.localDate),
    ['2026-07-13', '2026-07-14'],
  );

  const duplicateOccurrenceId = buildPersonalStructuralOccurrenceId({
    revisionId: series.revisions[0].revisionId,
    scheduledDate: '2026-07-13',
  });
  const duplicateRevisionSchedule = createRecurrenceFixtureSchedule({
    date: '2026-07-13',
    series: {
      ...series,
      revisions: [series.revisions[0], { ...series.revisions[0] }],
    },
  });
  const duplicateGuarded = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'range-guard',
    schedule: duplicateRevisionSchedule,
    range: { start: '2026-07-13', end: '2026-07-14' },
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.equal(
    duplicateGuarded.occurrences.filter(
      (entry) => entry.occurrenceId === duplicateOccurrenceId,
    ).length,
    1,
  );
  assert.equal(
    new Set(duplicateGuarded.occurrences.map((entry) => entry.occurrenceId)).size,
    duplicateGuarded.occurrences.length,
  );

  const invalidRange = generatePersonalStructuralOccurrences({
    identityNamespace: 'recurrence-golden-fixtures',
    itemId: 'range-guard',
    schedule,
    range: { start: '2026-07-20', end: '2026-07-10' },
    fallbackTimestamp: PERSONAL_STRUCTURAL_RECURRENCE_FIXTURE_TIMESTAMP,
  });
  assert.equal(invalidRange.occurrences.length, 0);
  assert.ok(invalidRange.warnings.includes('invalid_occurrence_projection_range'));
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

test('personal draft stored values become stable projection overlays with explicit date removal', () => {
  const flowSlug = 'url-draft-projection-values';
  const structuralOverlay = {
    ...createEmptyPersonalStructuralOverlay({
      savedCopyId: flowSlug,
      flowId: 'projection-values-flow',
    }),
    userItems: [
      {
        itemId: 'projection-values-user',
        provenance: 'user_created' as const,
        title: 'Personal item',
        createdAt: '2026-07-13T16:00:00.000Z',
        orderKey: 1,
      },
    ],
  };
  const sourceKey = getPersonalDraftProjectionValueKey(
    flowSlug,
    'projection-values-source',
  );
  const userKey = getPersonalDraftProjectionValueKey(
    flowSlug,
    'projection-values-user',
  );
  const fallbackKey = getPersonalDraftProjectionValueKey(
    flowSlug,
    'projection-values-fallback',
  );

  const valueOverlays = buildPersonalDraftProjectionValueOverlays({
    flowSlug,
    sourceItemIds: [
      'projection-values-source',
      'projection-values-fallback',
    ],
    structuralOverlay,
    itemDrafts: {
      [sourceKey]: {
        title: '  Personal source title  ',
        memo: 'Personal source memo',
        date: '',
      },
      [userKey]: {
        date: '2026-08-09',
      },
    },
    dateOverrides: {
      [sourceKey]: '2026-08-01',
      [fallbackKey]: '2026-08-11',
    },
  });

  assert.deepEqual(valueOverlays, [
    {
      itemId: 'projection-values-source',
      title: 'Personal source title',
      personalMemo: 'Personal source memo',
      scheduleOverride: null,
    },
    {
      itemId: 'projection-values-fallback',
      scheduleOverride: { mode: 'fixed_date', date: '2026-08-11' },
    },
    {
      itemId: 'projection-values-user',
      scheduleOverride: { mode: 'fixed_date', date: '2026-08-09' },
    },
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
