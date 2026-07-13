import { normalizePersonalStructuralSchedule } from './personal-structural-schedule';
import type { PersonalStructuralRepeat } from './personal-structural-recurrence';

export const PERSONAL_STRUCTURAL_OVERLAY_SCHEMA_VERSION = 1 as const;
export const PERSONAL_STRUCTURAL_OVERLAY_STORAGE_KEY_PREFIX =
  'flow:my-flow:structural-overlay:';

export type PersonalStructuralOverlaySchemaVersion =
  typeof PERSONAL_STRUCTURAL_OVERLAY_SCHEMA_VERSION;

export type PersonalStructuralSchedule =
  | {
      mode: 'fixed_date';
      date: string;
      time?: string;
      durationMinutes?: number;
      timeZone?: string;
      repeat?: PersonalStructuralRepeat;
    }
  | {
      mode: 'anchor_offset';
      dayOffset: number;
      anchorFieldId?: string;
      time?: string;
      durationMinutes?: number;
      timeZone?: string;
    };

export type PersonalStructuralUserItem = {
  itemId: string;
  provenance: 'user_created';
  title: string;
  personalMemo?: string;
  schedule?: PersonalStructuralSchedule;
  createdAt: string;
  orderKey: number;
};

export type PersonalStructuralItemOwnership = 'source' | 'user_created';

export type PersonalStructuralItemTombstone = {
  itemId: string;
  ownership: PersonalStructuralItemOwnership;
  deletedAt: string;
};

export type PersonalStructuralSelection = {
  mode: 'all_except_excluded' | 'only_included';
  includedItemIds: string[];
  excludedItemIds: string[];
};

export type PersonalStructuralOverlayMigration = {
  source: 'legacy_item_selection' | 'legacy_step_selection';
  migratedAt: string;
  sourceSchemaVersion?: number;
};

export type PersonalStructuralOverlay = {
  schemaVersion: PersonalStructuralOverlaySchemaVersion;
  savedCopyId: string;
  flowId: string;
  userItems: PersonalStructuralUserItem[];
  itemTombstones: PersonalStructuralItemTombstone[];
  orderOverride: string[];
  selection: PersonalStructuralSelection;
  updatedAt: string;
  migration?: PersonalStructuralOverlayMigration;
};

export type PersonalItemValueOverlay = {
  itemId: string;
  title?: string;
  personalMemo?: string;
  scheduleOverride?: PersonalStructuralSchedule | null;
};

export type PersonalStructuralSourceItem<TSource = unknown> = {
  itemId: string;
  title: string;
  order: number;
  schedule?: PersonalStructuralSchedule;
  source: TSource;
};

export type PersonalStructuralExecutionState = {
  itemId: string;
  state: 'pending' | 'done' | 'reopened' | 'skipped' | 'held';
  occurrenceKey?: string;
};

export type PersonalStructuralProjectionEligibility = {
  calendar: boolean;
  checklist: boolean;
  sheet: boolean;
  memo: boolean;
};

export type ResolvedPersonalStructuralItem<TSource = unknown> = {
  itemId: string;
  ownership: PersonalStructuralItemOwnership;
  title: string;
  personalMemo?: string;
  schedule?: PersonalStructuralSchedule;
  included: boolean;
  tombstoned: boolean;
  orderIndex: number;
  projectionEligibility: PersonalStructuralProjectionEligibility;
  executionState?: PersonalStructuralExecutionState;
  sourceItem?: PersonalStructuralSourceItem<TSource>;
  userItem?: PersonalStructuralUserItem;
};

export type ResolvePersonalStructuralItemsResult<TSource = unknown> = {
  allItems: ResolvedPersonalStructuralItem<TSource>[];
  effectiveItems: ResolvedPersonalStructuralItem<TSource>[];
  tombstonedItems: ResolvedPersonalStructuralItem<TSource>[];
  warnings: string[];
};

export type PersonalStructuralOverlayStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type PersonalStructuralOverlayEnumerableStorage =
  PersonalStructuralOverlayStorage & {
    readonly length: number;
    key(index: number): string | null;
  };

export type LegacyPersonalStructuralSelection = {
  includedItemIds?: string[];
  excludedItemIds?: string[];
  source?: 'legacy_item_selection' | 'legacy_step_selection';
  sourceSchemaVersion?: number;
};

export type PersonalStructuralOverlayLoadResult = {
  overlay: PersonalStructuralOverlay;
  source: 'stored' | 'legacy_migration' | 'empty' | 'malformed_preserved';
  storageKey: string;
  warnings: string[];
};

type NormalizeOptions = {
  savedCopyId?: string;
  flowId?: string;
  fallbackTimestamp?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= 240 ? normalized : undefined;
}

function normalizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

function normalizeTimestamp(value: unknown, fallback: string): string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? value
    : fallback;
}

function normalizeIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  value.forEach((entry) => {
    const itemId = normalizeId(entry);
    if (!itemId || seen.has(itemId)) return;
    seen.add(itemId);
    result.push(itemId);
  });
  return result;
}

function normalizeUserItems(
  value: unknown,
  fallbackTimestamp: string,
): PersonalStructuralUserItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: PersonalStructuralUserItem[] = [];
  value.forEach((entry) => {
    if (!isRecord(entry) || entry.provenance !== 'user_created') return;
    const itemId = normalizeId(entry.itemId);
    const title = normalizeText(entry.title, 500);
    if (!itemId || !title || seen.has(itemId)) return;
    seen.add(itemId);
    const personalMemo = normalizeText(entry.personalMemo, 20_000);
    const schedule = normalizePersonalStructuralSchedule(entry.schedule).schedule;
    const orderKey =
      typeof entry.orderKey === 'number' && Number.isFinite(entry.orderKey)
        ? entry.orderKey
        : result.length;
    result.push({
      itemId,
      provenance: 'user_created',
      title,
      ...(personalMemo ? { personalMemo } : {}),
      ...(schedule ? { schedule } : {}),
      createdAt: normalizeTimestamp(entry.createdAt, fallbackTimestamp),
      orderKey,
    });
  });
  return result;
}

function normalizeTombstones(
  value: unknown,
  fallbackTimestamp: string,
): PersonalStructuralItemTombstone[] {
  if (!Array.isArray(value)) return [];
  const byItemId = new Map<string, PersonalStructuralItemTombstone>();
  value.forEach((entry) => {
    if (!isRecord(entry)) return;
    const itemId = normalizeId(entry.itemId);
    const ownership = entry.ownership;
    if (!itemId || (ownership !== 'source' && ownership !== 'user_created')) return;
    byItemId.set(itemId, {
      itemId,
      ownership,
      deletedAt: normalizeTimestamp(entry.deletedAt, fallbackTimestamp),
    });
  });
  return Array.from(byItemId.values());
}

function normalizeSelection(value: unknown): PersonalStructuralSelection {
  const record = isRecord(value) ? value : {};
  const mode = record.mode === 'only_included' ? 'only_included' : 'all_except_excluded';
  const excludedItemIds = normalizeIdList(record.excludedItemIds);
  const excluded = new Set(excludedItemIds);
  const includedItemIds = normalizeIdList(record.includedItemIds).filter(
    (itemId) => !excluded.has(itemId),
  );
  return { mode, includedItemIds, excludedItemIds };
}

function normalizeMigration(
  value: unknown,
  fallbackTimestamp: string,
): PersonalStructuralOverlayMigration | undefined {
  if (!isRecord(value)) return undefined;
  const source = value.source;
  if (source !== 'legacy_item_selection' && source !== 'legacy_step_selection') {
    return undefined;
  }
  return {
    source,
    migratedAt: normalizeTimestamp(value.migratedAt, fallbackTimestamp),
    ...(typeof value.sourceSchemaVersion === 'number' &&
    Number.isInteger(value.sourceSchemaVersion)
      ? { sourceSchemaVersion: value.sourceSchemaVersion }
      : {}),
  };
}

export function createEmptyPersonalStructuralOverlay(options: {
  savedCopyId: string;
  flowId: string;
  updatedAt?: string;
}): PersonalStructuralOverlay {
  const updatedAt = options.updatedAt ?? new Date().toISOString();
  return {
    schemaVersion: PERSONAL_STRUCTURAL_OVERLAY_SCHEMA_VERSION,
    savedCopyId: options.savedCopyId,
    flowId: options.flowId,
    userItems: [],
    itemTombstones: [],
    orderOverride: [],
    selection: {
      mode: 'all_except_excluded',
      includedItemIds: [],
      excludedItemIds: [],
    },
    updatedAt,
  };
}

export function normalizePersonalStructuralOverlay(
  value: unknown,
  options: NormalizeOptions = {},
): PersonalStructuralOverlay | undefined {
  if (!isRecord(value) || value.schemaVersion !== PERSONAL_STRUCTURAL_OVERLAY_SCHEMA_VERSION) {
    return undefined;
  }
  const fallbackTimestamp = options.fallbackTimestamp ?? new Date().toISOString();
  const savedCopyId = options.savedCopyId ?? normalizeId(value.savedCopyId);
  const flowId = options.flowId ?? normalizeId(value.flowId);
  if (!savedCopyId || !flowId) return undefined;
  if (options.savedCopyId && normalizeId(value.savedCopyId) !== options.savedCopyId) return undefined;
  if (options.flowId && normalizeId(value.flowId) !== options.flowId) return undefined;

  const migration = normalizeMigration(value.migration, fallbackTimestamp);
  return {
    schemaVersion: PERSONAL_STRUCTURAL_OVERLAY_SCHEMA_VERSION,
    savedCopyId,
    flowId,
    userItems: normalizeUserItems(value.userItems, fallbackTimestamp),
    itemTombstones: normalizeTombstones(value.itemTombstones, fallbackTimestamp),
    orderOverride: normalizeIdList(value.orderOverride),
    selection: normalizeSelection(value.selection),
    updatedAt: normalizeTimestamp(value.updatedAt, fallbackTimestamp),
    ...(migration ? { migration } : {}),
  };
}

export function getPersonalStructuralOverlayStorageKey(savedCopyId: string): string {
  return `${PERSONAL_STRUCTURAL_OVERLAY_STORAGE_KEY_PREFIX}${encodeURIComponent(savedCopyId)}`;
}

export function migrateLegacyPersonalStructuralSelection(options: {
  savedCopyId: string;
  flowId: string;
  legacy: LegacyPersonalStructuralSelection;
  migratedAt?: string;
}): PersonalStructuralOverlay {
  const migratedAt = options.migratedAt ?? new Date().toISOString();
  const excludedItemIds = normalizeIdList(options.legacy.excludedItemIds);
  const excluded = new Set(excludedItemIds);
  const includedItemIds = normalizeIdList(options.legacy.includedItemIds).filter(
    (itemId) => !excluded.has(itemId),
  );
  return {
    ...createEmptyPersonalStructuralOverlay({
      savedCopyId: options.savedCopyId,
      flowId: options.flowId,
      updatedAt: migratedAt,
    }),
    selection: {
      mode: options.legacy.includedItemIds ? 'only_included' : 'all_except_excluded',
      includedItemIds,
      excludedItemIds,
    },
    migration: {
      source: options.legacy.source ?? 'legacy_item_selection',
      migratedAt,
      ...(typeof options.legacy.sourceSchemaVersion === 'number' &&
      Number.isInteger(options.legacy.sourceSchemaVersion)
        ? { sourceSchemaVersion: options.legacy.sourceSchemaVersion }
        : {}),
    },
  };
}

export function savePersonalStructuralOverlay(
  storage: PersonalStructuralOverlayStorage,
  overlay: PersonalStructuralOverlay,
): PersonalStructuralOverlay {
  const normalized = normalizePersonalStructuralOverlay(overlay, {
    savedCopyId: overlay.savedCopyId,
    flowId: overlay.flowId,
    fallbackTimestamp: overlay.updatedAt,
  });
  if (!normalized) throw new Error('Personal structural overlay is invalid.');
  storage.setItem(
    getPersonalStructuralOverlayStorageKey(normalized.savedCopyId),
    JSON.stringify(normalized),
  );
  return normalized;
}

export function loadPersonalStructuralOverlay(
  storage: PersonalStructuralOverlayStorage,
  options: { savedCopyId: string; flowId: string; fallbackTimestamp?: string },
): PersonalStructuralOverlay | undefined {
  const raw = storage.getItem(getPersonalStructuralOverlayStorageKey(options.savedCopyId));
  if (raw === null) return undefined;
  try {
    return normalizePersonalStructuralOverlay(JSON.parse(raw), options);
  } catch {
    return undefined;
  }
}

export function loadOrMigratePersonalStructuralOverlay(
  storage: PersonalStructuralOverlayStorage,
  options: {
    savedCopyId: string;
    flowId: string;
    legacy?: LegacyPersonalStructuralSelection;
    now?: string;
  },
): PersonalStructuralOverlayLoadResult {
  const now = options.now ?? new Date().toISOString();
  const storageKey = getPersonalStructuralOverlayStorageKey(options.savedCopyId);
  const raw = storage.getItem(storageKey);
  if (raw !== null) {
    try {
      const stored = normalizePersonalStructuralOverlay(JSON.parse(raw), {
        savedCopyId: options.savedCopyId,
        flowId: options.flowId,
        fallbackTimestamp: now,
      });
      if (stored) return { overlay: stored, source: 'stored', storageKey, warnings: [] };
    } catch {
      // Keep malformed persisted data untouched so a future recovery can inspect it.
    }
    return {
      overlay: createEmptyPersonalStructuralOverlay({
        savedCopyId: options.savedCopyId,
        flowId: options.flowId,
        updatedAt: now,
      }),
      source: 'malformed_preserved',
      storageKey,
      warnings: ['malformed_overlay_preserved'],
    };
  }

  if (options.legacy) {
    const overlay = migrateLegacyPersonalStructuralSelection({
      savedCopyId: options.savedCopyId,
      flowId: options.flowId,
      legacy: options.legacy,
      migratedAt: now,
    });
    try {
      savePersonalStructuralOverlay(storage, overlay);
      return { overlay, source: 'legacy_migration', storageKey, warnings: [] };
    } catch {
      return {
        overlay,
        source: 'legacy_migration',
        storageKey,
        warnings: ['migration_persistence_failed'],
      };
    }
  }

  return {
    overlay: createEmptyPersonalStructuralOverlay({
      savedCopyId: options.savedCopyId,
      flowId: options.flowId,
      updatedAt: now,
    }),
    source: 'empty',
    storageKey,
    warnings: [],
  };
}

export function clearPersonalStructuralOverlay(
  storage: PersonalStructuralOverlayStorage,
  savedCopyId: string,
): void {
  storage.removeItem(getPersonalStructuralOverlayStorageKey(savedCopyId));
}

export function removePersonalStructuralOverlaysForFlow(
  storage: PersonalStructuralOverlayEnumerableStorage,
  flowId: string,
): void {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(PERSONAL_STRUCTURAL_OVERLAY_STORAGE_KEY_PREFIX)) continue;
    if (key === getPersonalStructuralOverlayStorageKey(flowId)) {
      keys.push(key);
      continue;
    }
    const raw = storage.getItem(key);
    if (raw === null) continue;
    try {
      const parsed = normalizePersonalStructuralOverlay(JSON.parse(raw));
      if (parsed?.flowId === flowId) keys.push(key);
    } catch {
      // Unknown malformed records are preserved unless their exact copy key is cleared.
    }
  }
  keys.forEach((key) => storage.removeItem(key));
}

export function upsertPersonalStructuralUserItem(
  overlay: PersonalStructuralOverlay,
  userItem: PersonalStructuralUserItem,
  updatedAt = new Date().toISOString(),
): PersonalStructuralOverlay {
  return {
    ...overlay,
    userItems: [
      ...overlay.userItems.filter((item) => item.itemId !== userItem.itemId),
      userItem,
    ],
    updatedAt,
  };
}

export function tombstonePersonalStructuralItem(
  overlay: PersonalStructuralOverlay,
  tombstone: PersonalStructuralItemTombstone,
): PersonalStructuralOverlay {
  return {
    ...overlay,
    itemTombstones: [
      ...overlay.itemTombstones.filter((entry) => entry.itemId !== tombstone.itemId),
      tombstone,
    ],
    updatedAt: tombstone.deletedAt,
  };
}

export function restorePersonalStructuralItem(
  overlay: PersonalStructuralOverlay,
  itemId: string,
  updatedAt = new Date().toISOString(),
): PersonalStructuralOverlay {
  return {
    ...overlay,
    itemTombstones: overlay.itemTombstones.filter((entry) => entry.itemId !== itemId),
    updatedAt,
  };
}

export function setPersonalStructuralOrder(
  overlay: PersonalStructuralOverlay,
  orderOverride: string[],
  updatedAt = new Date().toISOString(),
): PersonalStructuralOverlay {
  return {
    ...overlay,
    orderOverride: normalizeIdList(orderOverride),
    updatedAt,
  };
}

function getIncludedState(itemId: string, selection: PersonalStructuralSelection): boolean {
  if (selection.excludedItemIds.includes(itemId)) return false;
  if (selection.mode === 'only_included') return selection.includedItemIds.includes(itemId);
  return true;
}

function projectionEligibility(
  included: boolean,
  tombstoned: boolean,
  schedule: PersonalStructuralSchedule | undefined,
): PersonalStructuralProjectionEligibility {
  const eligible = included && !tombstoned;
  return {
    calendar: eligible && Boolean(schedule),
    checklist: eligible,
    sheet: eligible,
    memo: eligible,
  };
}

export function resolvePersonalStructuralItems<TSource>(options: {
  sourceItems: PersonalStructuralSourceItem<TSource>[];
  structuralOverlay: PersonalStructuralOverlay;
  valueOverlays?: PersonalItemValueOverlay[];
  executionStates?: PersonalStructuralExecutionState[];
}): ResolvePersonalStructuralItemsResult<TSource> {
  const warnings: string[] = [];
  const sourceById = new Map<string, PersonalStructuralSourceItem<TSource>>();
  [...options.sourceItems]
    .sort((left, right) => left.order - right.order)
    .forEach((item) => {
      if (sourceById.has(item.itemId)) {
        warnings.push(`duplicate_source_item:${item.itemId}`);
        return;
      }
      sourceById.set(item.itemId, item);
    });

  const userById = new Map<string, PersonalStructuralUserItem>();
  [...options.structuralOverlay.userItems]
    .sort((left, right) => left.orderKey - right.orderKey)
    .forEach((item) => {
      if (sourceById.has(item.itemId)) {
        warnings.push(`personal_item_collides_with_source:${item.itemId}`);
        return;
      }
      if (userById.has(item.itemId)) {
        warnings.push(`duplicate_personal_item:${item.itemId}`);
        return;
      }
      userById.set(item.itemId, item);
    });

  const allIds = new Set([...sourceById.keys(), ...userById.keys()]);
  const orderedIds: string[] = [];
  const ordered = new Set<string>();
  options.structuralOverlay.orderOverride.forEach((itemId) => {
    if (!allIds.has(itemId)) {
      warnings.push(`unknown_order_item:${itemId}`);
      return;
    }
    if (ordered.has(itemId)) return;
    ordered.add(itemId);
    orderedIds.push(itemId);
  });
  sourceById.forEach((_item, itemId) => {
    if (ordered.has(itemId)) return;
    ordered.add(itemId);
    orderedIds.push(itemId);
  });
  userById.forEach((_item, itemId) => {
    if (ordered.has(itemId)) return;
    ordered.add(itemId);
    orderedIds.push(itemId);
  });

  const tombstoneById = new Map(
    options.structuralOverlay.itemTombstones.map((entry) => [entry.itemId, entry]),
  );
  const valueOverlayById = new Map(
    (options.valueOverlays ?? []).map((entry) => [entry.itemId, entry]),
  );
  const executionStateById = new Map(
    (options.executionStates ?? []).map((entry) => [entry.itemId, entry]),
  );

  const allItems = orderedIds.map((itemId, orderIndex) => {
    const sourceItem = sourceById.get(itemId);
    const userItem = userById.get(itemId);
    const ownership: PersonalStructuralItemOwnership = sourceItem ? 'source' : 'user_created';
    const valueOverlay = valueOverlayById.get(itemId);
    const tombstone = tombstoneById.get(itemId);
    const tombstoned = tombstone?.ownership === ownership;
    if (tombstone && !tombstoned) {
      warnings.push(`tombstone_ownership_mismatch:${itemId}`);
    }
    const included = getIncludedState(itemId, options.structuralOverlay.selection);
    const baseSchedule = userItem?.schedule ?? sourceItem?.schedule;
    const schedule =
      valueOverlay?.scheduleOverride === null
        ? undefined
        : valueOverlay?.scheduleOverride ?? baseSchedule;
    const personalMemo = valueOverlay?.personalMemo ?? userItem?.personalMemo;
    return {
      itemId,
      ownership,
      title: valueOverlay?.title ?? userItem?.title ?? sourceItem?.title ?? itemId,
      ...(personalMemo ? { personalMemo } : {}),
      ...(schedule ? { schedule } : {}),
      included,
      tombstoned,
      orderIndex,
      projectionEligibility: projectionEligibility(included, tombstoned, schedule),
      ...(executionStateById.get(itemId)
        ? { executionState: executionStateById.get(itemId) }
        : {}),
      ...(sourceItem ? { sourceItem } : {}),
      ...(userItem ? { userItem } : {}),
    } satisfies ResolvedPersonalStructuralItem<TSource>;
  });

  return {
    allItems,
    effectiveItems: allItems.filter((item) => item.included && !item.tombstoned),
    tombstonedItems: allItems.filter((item) => item.tombstoned),
    warnings,
  };
}
