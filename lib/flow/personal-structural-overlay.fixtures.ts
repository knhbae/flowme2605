import {
  createEmptyPersonalStructuralOverlay,
  migrateLegacyPersonalStructuralSelection,
  restorePersonalStructuralItem,
  setPersonalStructuralOrder,
  tombstonePersonalStructuralItem,
  upsertPersonalStructuralUserItem,
  type PersonalItemValueOverlay,
  type PersonalStructuralExecutionState,
  type PersonalStructuralOverlay,
  type PersonalStructuralSourceItem,
  type PersonalStructuralUserItem,
} from './personal-structural-overlay';

export const STRUCTURAL_OVERLAY_GOLDEN_NOW = '2026-07-13T09:00:00.000Z';

export type StructuralOverlayFixtureSource = {
  immutableMarker: string;
};

export type PersonalStructuralOverlayGoldenFixture = {
  id: string;
  sourceItems: PersonalStructuralSourceItem<StructuralOverlayFixtureSource>[];
  overlay: PersonalStructuralOverlay;
  valueOverlays?: PersonalItemValueOverlay[];
  executionStates?: PersonalStructuralExecutionState[];
  expected: {
    allOrder: string[];
    effectiveOrder: string[];
    tombstonedIds: string[];
    ownershipById: Record<string, 'source' | 'user_created'>;
    calendarEligibleIds: string[];
    warningCodes?: string[];
  };
};

export const structuralOverlaySourceV1: PersonalStructuralSourceItem<StructuralOverlayFixtureSource>[] = [
  {
    itemId: 'source-a',
    title: 'Source A',
    order: 1,
    schedule: { mode: 'fixed_date', date: '2026-08-01' },
    source: { immutableMarker: 'source-a-v1' },
  },
  {
    itemId: 'source-b',
    title: 'Source B',
    order: 2,
    source: { immutableMarker: 'source-b-v1' },
  },
  {
    itemId: 'source-c',
    title: 'Source C',
    order: 3,
    schedule: { mode: 'anchor_offset', dayOffset: 2 },
    source: { immutableMarker: 'source-c-v1' },
  },
];

export const structuralOverlayUserItem: PersonalStructuralUserItem = {
  itemId: 'personal-a',
  provenance: 'user_created',
  title: 'Personal A',
  personalMemo: 'Personal memo',
  schedule: { mode: 'fixed_date', date: '2026-08-03' },
  createdAt: STRUCTURAL_OVERLAY_GOLDEN_NOW,
  orderKey: 1,
};

function emptyOverlay(): PersonalStructuralOverlay {
  return createEmptyPersonalStructuralOverlay({
    savedCopyId: 'copy-golden',
    flowId: 'flow-golden',
    updatedAt: STRUCTURAL_OVERLAY_GOLDEN_NOW,
  });
}

const sourceTombstoned = tombstonePersonalStructuralItem(emptyOverlay(), {
  itemId: 'source-b',
  ownership: 'source',
  deletedAt: STRUCTURAL_OVERLAY_GOLDEN_NOW,
});

const userAdded = upsertPersonalStructuralUserItem(emptyOverlay(), structuralOverlayUserItem, STRUCTURAL_OVERLAY_GOLDEN_NOW);
const userDeleted = tombstonePersonalStructuralItem(userAdded, {
  itemId: structuralOverlayUserItem.itemId,
  ownership: 'user_created',
  deletedAt: STRUCTURAL_OVERLAY_GOLDEN_NOW,
});
const mixedReordered = setPersonalStructuralOrder(
  userAdded,
  ['source-c', 'personal-a', 'source-a', 'source-b'],
  STRUCTURAL_OVERLAY_GOLDEN_NOW,
);

const sourceV2WithNewItem: PersonalStructuralSourceItem<StructuralOverlayFixtureSource>[] = [
  ...structuralOverlaySourceV1,
  {
    itemId: 'source-d',
    title: 'Source D from v2',
    order: 4,
    schedule: { mode: 'fixed_date', date: '2026-08-04' },
    source: { immutableMarker: 'source-d-v2' },
  },
];

const sourceV2WithoutB = structuralOverlaySourceV1.filter((item) => item.itemId !== 'source-b');
const sourceV2RemovedItemOverlay = tombstonePersonalStructuralItem(mixedReordered, {
  itemId: 'source-b',
  ownership: 'source',
  deletedAt: STRUCTURAL_OVERLAY_GOLDEN_NOW,
});

const malformedDuplicateOverlay: PersonalStructuralOverlay = {
  ...emptyOverlay(),
  userItems: [
    structuralOverlayUserItem,
    { ...structuralOverlayUserItem, title: 'Duplicate personal item', orderKey: 2 },
    {
      ...structuralOverlayUserItem,
      itemId: 'source-a',
      title: 'Source collision',
      orderKey: 3,
    },
  ],
  itemTombstones: [
    {
      itemId: 'source-c',
      ownership: 'user_created',
      deletedAt: STRUCTURAL_OVERLAY_GOLDEN_NOW,
    },
  ],
  orderOverride: ['unknown-id', 'source-b', 'source-b', 'source-a'],
};

export const personalStructuralOverlayGoldenFixtures: PersonalStructuralOverlayGoldenFixture[] = [
  {
    id: '01-source-checklist-no-change',
    sourceItems: structuralOverlaySourceV1,
    overlay: emptyOverlay(),
    expected: {
      allOrder: ['source-a', 'source-b', 'source-c'],
      effectiveOrder: ['source-a', 'source-b', 'source-c'],
      tombstonedIds: [],
      ownershipById: { 'source-a': 'source', 'source-b': 'source', 'source-c': 'source' },
      calendarEligibleIds: ['source-a', 'source-c'],
    },
  },
  {
    id: '02-source-item-tombstone',
    sourceItems: structuralOverlaySourceV1,
    overlay: sourceTombstoned,
    expected: {
      allOrder: ['source-a', 'source-b', 'source-c'],
      effectiveOrder: ['source-a', 'source-c'],
      tombstonedIds: ['source-b'],
      ownershipById: { 'source-a': 'source', 'source-b': 'source', 'source-c': 'source' },
      calendarEligibleIds: ['source-a', 'source-c'],
    },
  },
  {
    id: '03-source-item-restore',
    sourceItems: structuralOverlaySourceV1,
    overlay: restorePersonalStructuralItem(sourceTombstoned, 'source-b', STRUCTURAL_OVERLAY_GOLDEN_NOW),
    expected: {
      allOrder: ['source-a', 'source-b', 'source-c'],
      effectiveOrder: ['source-a', 'source-b', 'source-c'],
      tombstonedIds: [],
      ownershipById: { 'source-a': 'source', 'source-b': 'source', 'source-c': 'source' },
      calendarEligibleIds: ['source-a', 'source-c'],
    },
  },
  {
    id: '04-user-item-add',
    sourceItems: structuralOverlaySourceV1,
    overlay: userAdded,
    expected: {
      allOrder: ['source-a', 'source-b', 'source-c', 'personal-a'],
      effectiveOrder: ['source-a', 'source-b', 'source-c', 'personal-a'],
      tombstonedIds: [],
      ownershipById: {
        'source-a': 'source',
        'source-b': 'source',
        'source-c': 'source',
        'personal-a': 'user_created',
      },
      calendarEligibleIds: ['source-a', 'source-c', 'personal-a'],
    },
  },
  {
    id: '05-user-item-delete-and-restore',
    sourceItems: structuralOverlaySourceV1,
    overlay: restorePersonalStructuralItem(userDeleted, 'personal-a', STRUCTURAL_OVERLAY_GOLDEN_NOW),
    expected: {
      allOrder: ['source-a', 'source-b', 'source-c', 'personal-a'],
      effectiveOrder: ['source-a', 'source-b', 'source-c', 'personal-a'],
      tombstonedIds: [],
      ownershipById: {
        'source-a': 'source',
        'source-b': 'source',
        'source-c': 'source',
        'personal-a': 'user_created',
      },
      calendarEligibleIds: ['source-a', 'source-c', 'personal-a'],
    },
  },
  {
    id: '06-source-user-mixed-reorder',
    sourceItems: structuralOverlaySourceV1,
    overlay: mixedReordered,
    expected: {
      allOrder: ['source-c', 'personal-a', 'source-a', 'source-b'],
      effectiveOrder: ['source-c', 'personal-a', 'source-a', 'source-b'],
      tombstonedIds: [],
      ownershipById: {
        'source-a': 'source',
        'source-b': 'source',
        'source-c': 'source',
        'personal-a': 'user_created',
      },
      calendarEligibleIds: ['source-c', 'personal-a', 'source-a'],
    },
  },
  {
    id: '07-source-v2-new-item-safe-merge',
    sourceItems: sourceV2WithNewItem,
    overlay: mixedReordered,
    expected: {
      allOrder: ['source-c', 'personal-a', 'source-a', 'source-b', 'source-d'],
      effectiveOrder: ['source-c', 'personal-a', 'source-a', 'source-b', 'source-d'],
      tombstonedIds: [],
      ownershipById: {
        'source-a': 'source',
        'source-b': 'source',
        'source-c': 'source',
        'source-d': 'source',
        'personal-a': 'user_created',
      },
      calendarEligibleIds: ['source-c', 'personal-a', 'source-a', 'source-d'],
    },
  },
  {
    id: '08-source-v2-removed-item-safe-merge',
    sourceItems: sourceV2WithoutB,
    overlay: sourceV2RemovedItemOverlay,
    expected: {
      allOrder: ['source-c', 'personal-a', 'source-a'],
      effectiveOrder: ['source-c', 'personal-a', 'source-a'],
      tombstonedIds: [],
      ownershipById: {
        'source-a': 'source',
        'source-c': 'source',
        'personal-a': 'user_created',
      },
      calendarEligibleIds: ['source-c', 'personal-a', 'source-a'],
      warningCodes: ['unknown_order_item:source-b'],
    },
  },
  {
    id: '09-value-overlay-survives-reorder',
    sourceItems: structuralOverlaySourceV1,
    overlay: setPersonalStructuralOrder(emptyOverlay(), ['source-b', 'source-a', 'source-c'], STRUCTURAL_OVERLAY_GOLDEN_NOW),
    valueOverlays: [
      {
        itemId: 'source-b',
        title: 'Personal title B',
        personalMemo: 'Personal memo B',
        scheduleOverride: { mode: 'fixed_date', date: '2026-09-01' },
      },
    ],
    expected: {
      allOrder: ['source-b', 'source-a', 'source-c'],
      effectiveOrder: ['source-b', 'source-a', 'source-c'],
      tombstonedIds: [],
      ownershipById: { 'source-a': 'source', 'source-b': 'source', 'source-c': 'source' },
      calendarEligibleIds: ['source-b', 'source-a', 'source-c'],
    },
  },
  {
    id: '10-completed-run-does-not-change-structure',
    sourceItems: structuralOverlaySourceV1,
    overlay: setPersonalStructuralOrder(emptyOverlay(), ['source-c', 'source-a', 'source-b'], STRUCTURAL_OVERLAY_GOLDEN_NOW),
    executionStates: [{ itemId: 'source-a', state: 'done' }],
    expected: {
      allOrder: ['source-c', 'source-a', 'source-b'],
      effectiveOrder: ['source-c', 'source-a', 'source-b'],
      tombstonedIds: [],
      ownershipById: { 'source-a': 'source', 'source-b': 'source', 'source-c': 'source' },
      calendarEligibleIds: ['source-c', 'source-a'],
    },
  },
  {
    id: '11-malformed-duplicate-personal-id',
    sourceItems: structuralOverlaySourceV1,
    overlay: malformedDuplicateOverlay,
    expected: {
      allOrder: ['source-b', 'source-a', 'source-c', 'personal-a'],
      effectiveOrder: ['source-b', 'source-a', 'source-c', 'personal-a'],
      tombstonedIds: [],
      ownershipById: {
        'source-a': 'source',
        'source-b': 'source',
        'source-c': 'source',
        'personal-a': 'user_created',
      },
      calendarEligibleIds: ['source-a', 'source-c', 'personal-a'],
      warningCodes: [
        'personal_item_collides_with_source:source-a',
        'duplicate_personal_item:personal-a',
        'tombstone_ownership_mismatch:source-c',
        'unknown_order_item:unknown-id',
      ],
    },
  },
  {
    id: '12-legacy-included-excluded-migration',
    sourceItems: structuralOverlaySourceV1,
    overlay: migrateLegacyPersonalStructuralSelection({
      savedCopyId: 'copy-golden',
      flowId: 'flow-golden',
      legacy: {
        source: 'legacy_step_selection',
        includedItemIds: ['source-a', 'source-b'],
        excludedItemIds: ['source-b'],
        sourceSchemaVersion: 1,
      },
      migratedAt: STRUCTURAL_OVERLAY_GOLDEN_NOW,
    }),
    expected: {
      allOrder: ['source-a', 'source-b', 'source-c'],
      effectiveOrder: ['source-a'],
      tombstonedIds: [],
      ownershipById: { 'source-a': 'source', 'source-b': 'source', 'source-c': 'source' },
      calendarEligibleIds: ['source-a'],
    },
  },
];

export const structuralOverlayDeletedUserItemFixture = {
  sourceItems: structuralOverlaySourceV1,
  overlay: userDeleted,
};
