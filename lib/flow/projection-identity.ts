export const FLOW_PROJECTION_IDENTITY_SCHEMA_VERSION = 1 as const;
export const FLOW_PROJECTION_IDENTITY_MIGRATION_STORAGE_KEY_PREFIX =
  'flow:projection-identity-migration:';

export const FLOW_PROJECTION_DESTINATIONS = [
  'myFlow',
  'today',
  'calendarScreen',
  'calendarIcs',
  'checklist',
  'sheet',
  'memo',
] as const;

export type FlowProjectionDestination =
  (typeof FLOW_PROJECTION_DESTINATIONS)[number];
export type FlowProjectionOwnership = 'source' | 'user_created';
export type FlowProjectionExecutionState =
  | 'pending'
  | 'done'
  | 'reopened'
  | 'skipped'
  | 'held';

export type CanonicalFlowProjectionIdentity = {
  schemaVersion: typeof FLOW_PROJECTION_IDENTITY_SCHEMA_VERSION;
  flowId: string;
  itemId: string;
  ownership: FlowProjectionOwnership;
  itemKey: string;
  projectionKey: string;
  executionKey: string;
  exportItemKey: string;
  calendarEventIdentitySeed: string;
  runId?: string;
  runKey?: string;
  seriesId?: string;
  revisionId?: string;
  occurrenceId?: string;
};

export type CanonicalFlowProjectionItemInput = {
  flowId: string;
  itemId: string;
  ownership: FlowProjectionOwnership;
  personalOrderRank: number;
  included: boolean;
  tombstoned: boolean;
  destinationEligibility: Partial<Record<FlowProjectionDestination, boolean>>;
  executionState?: FlowProjectionExecutionState;
  runId?: string;
};

export type CanonicalFlowProjectionOccurrenceInput = {
  flowId: string;
  itemId: string;
  ownership: FlowProjectionOwnership;
  seriesId: string;
  revisionId: string;
  occurrenceId: string;
  executionState: FlowProjectionExecutionState;
  destinationEligibility: Partial<Record<FlowProjectionDestination, boolean>>;
  runId?: string;
};

export type CanonicalFlowProjectionMatrixRow = {
  identity: CanonicalFlowProjectionIdentity;
  personalOrderRank: number;
  included: boolean;
  tombstoned: boolean;
  executionState: FlowProjectionExecutionState;
  destinationEligibility: Record<FlowProjectionDestination, boolean>;
};

export type CanonicalFlowProjectionOccurrenceRow = {
  identity: CanonicalFlowProjectionIdentity;
  executionState: FlowProjectionExecutionState;
  destinationEligibility: Record<FlowProjectionDestination, boolean>;
};

export type CanonicalFlowProjectionMatrix = {
  schemaVersion: typeof FLOW_PROJECTION_IDENTITY_SCHEMA_VERSION;
  items: CanonicalFlowProjectionMatrixRow[];
  occurrences: CanonicalFlowProjectionOccurrenceRow[];
  rowsByDestination: Record<FlowProjectionDestination, CanonicalFlowProjectionMatrixRow[]>;
  occurrencesByDestination: Record<
    FlowProjectionDestination,
    CanonicalFlowProjectionOccurrenceRow[]
  >;
  duplicateItemIdentityCount: number;
  duplicateOccurrenceIdentityCount: number;
  orphanOccurrenceCount: number;
  warnings: string[];
};

export type ProjectionIdentityStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type ProjectionIdentityMigrationAlias = {
  legacyKey: string;
  canonicalKey: string;
};

export type ProjectionIdentityMigrationManifest = {
  schemaVersion: typeof FLOW_PROJECTION_IDENTITY_SCHEMA_VERSION;
  flowId: string;
  migratedAt: string;
  itemIds: string[];
  itemDraftAliases: ProjectionIdentityMigrationAlias[];
  dateOverrideAliases: ProjectionIdentityMigrationAlias[];
  legacyItemDraftValues: Record<string, unknown>;
  legacyDateOverrideValues: Record<string, unknown>;
  legacyRecordsPreserved: true;
  warnings: string[];
};

export type ProjectionIdentityMigrationResult = {
  source:
    | 'migrated'
    | 'already_current'
    | 'no_legacy_values'
    | 'malformed_preserved'
    | 'write_failed';
  manifest?: ProjectionIdentityMigrationManifest;
  warnings: string[];
};

type StoredRecord = Record<string, unknown>;

function normalizeIdentityPart(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new TypeError(`${label}_missing`);
  const normalized = value.trim();
  if (!normalized || normalized.length > 500) throw new TypeError(`${label}_invalid`);
  return normalized;
}

function normalizeOptionalIdentityPart(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : normalizeIdentityPart(value, label);
}

export function buildCanonicalFlowItemKey(flowId: string, itemId: string): string {
  return `${normalizeIdentityPart(flowId, 'flow_id')}::${normalizeIdentityPart(itemId, 'item_id')}`;
}

export function buildCanonicalFlowValueKey(flowId: string, itemId: string): string {
  return `${buildCanonicalFlowItemKey(flowId, itemId)}::draft-overlay`;
}

export function getProjectionIdentityMigrationStorageKey(flowId: string): string {
  return `${FLOW_PROJECTION_IDENTITY_MIGRATION_STORAGE_KEY_PREFIX}${encodeURIComponent(
    normalizeIdentityPart(flowId, 'flow_id'),
  )}`;
}

export function buildCanonicalFlowProjectionIdentity(options: {
  flowId: string;
  itemId: string;
  ownership: FlowProjectionOwnership;
  runId?: string;
  seriesId?: string;
  revisionId?: string;
  occurrenceId?: string;
}): CanonicalFlowProjectionIdentity {
  const flowId = normalizeIdentityPart(options.flowId, 'flow_id');
  const itemId = normalizeIdentityPart(options.itemId, 'item_id');
  const runId = normalizeOptionalIdentityPart(options.runId, 'run_id');
  const seriesId = normalizeOptionalIdentityPart(options.seriesId, 'series_id');
  const revisionId = normalizeOptionalIdentityPart(options.revisionId, 'revision_id');
  const occurrenceId = normalizeOptionalIdentityPart(options.occurrenceId, 'occurrence_id');
  const itemKey = buildCanonicalFlowItemKey(flowId, itemId);
  const runKey = runId ? `${flowId}::run::${runId}` : undefined;
  const projectionKey = occurrenceId
    ? `${flowId}::occurrence::${occurrenceId}`
    : itemKey;
  const executionKey = occurrenceId
    ? projectionKey
    : runKey
      ? `${runKey}::item::${itemId}`
      : itemKey;

  return {
    schemaVersion: FLOW_PROJECTION_IDENTITY_SCHEMA_VERSION,
    flowId,
    itemId,
    ownership: options.ownership,
    itemKey,
    projectionKey,
    executionKey,
    exportItemKey: itemKey,
    calendarEventIdentitySeed: seriesId ?? itemKey,
    ...(runId ? { runId, runKey } : {}),
    ...(seriesId ? { seriesId } : {}),
    ...(revisionId ? { revisionId } : {}),
    ...(occurrenceId ? { occurrenceId } : {}),
  };
}

function normalizeDestinationEligibility(
  eligibility: Partial<Record<FlowProjectionDestination, boolean>>,
): Record<FlowProjectionDestination, boolean> {
  return Object.fromEntries(
    FLOW_PROJECTION_DESTINATIONS.map((destination) => [
      destination,
      eligibility[destination] === true,
    ]),
  ) as Record<FlowProjectionDestination, boolean>;
}

export function buildCanonicalFlowProjectionMatrix(options: {
  items: CanonicalFlowProjectionItemInput[];
  occurrences?: CanonicalFlowProjectionOccurrenceInput[];
}): CanonicalFlowProjectionMatrix {
  const warnings: string[] = [];
  const byItemKey = new Map<string, CanonicalFlowProjectionMatrixRow>();
  let duplicateItemIdentityCount = 0;

  options.items.forEach((item) => {
    const identity = buildCanonicalFlowProjectionIdentity(item);
    const destinationEligibility = normalizeDestinationEligibility(
      item.destinationEligibility,
    );
    const visible = item.included && !item.tombstoned;
    const row: CanonicalFlowProjectionMatrixRow = {
      identity,
      personalOrderRank: item.personalOrderRank,
      included: item.included,
      tombstoned: item.tombstoned,
      executionState: item.executionState ?? 'pending',
      destinationEligibility: Object.fromEntries(
        FLOW_PROJECTION_DESTINATIONS.map((destination) => [
          destination,
          visible && destinationEligibility[destination],
        ]),
      ) as Record<FlowProjectionDestination, boolean>,
    };
    const current = byItemKey.get(identity.itemKey);
    if (!current) {
      byItemKey.set(identity.itemKey, row);
      return;
    }
    duplicateItemIdentityCount += 1;
    warnings.push(`duplicate_item_identity:${identity.itemKey}`);
    if (current.identity.ownership === 'user_created' && item.ownership === 'source') {
      byItemKey.set(identity.itemKey, row);
    }
  });

  const items = Array.from(byItemKey.values()).sort(
    (left, right) =>
      left.personalOrderRank - right.personalOrderRank ||
      left.identity.itemKey.localeCompare(right.identity.itemKey),
  );
  const knownItemKeys = new Set(items.map((item) => item.identity.itemKey));
  const byOccurrenceKey = new Map<string, CanonicalFlowProjectionOccurrenceRow>();
  let duplicateOccurrenceIdentityCount = 0;
  let orphanOccurrenceCount = 0;

  (options.occurrences ?? []).forEach((occurrence) => {
    const identity = buildCanonicalFlowProjectionIdentity(occurrence);
    if (!knownItemKeys.has(identity.itemKey)) {
      orphanOccurrenceCount += 1;
      warnings.push(`orphan_occurrence:${identity.projectionKey}`);
      return;
    }
    const row: CanonicalFlowProjectionOccurrenceRow = {
      identity,
      executionState: occurrence.executionState,
      destinationEligibility: normalizeDestinationEligibility(
        occurrence.destinationEligibility,
      ),
    };
    if (byOccurrenceKey.has(identity.projectionKey)) {
      duplicateOccurrenceIdentityCount += 1;
      warnings.push(`duplicate_occurrence_identity:${identity.projectionKey}`);
      return;
    }
    byOccurrenceKey.set(identity.projectionKey, row);
  });
  const occurrences = Array.from(byOccurrenceKey.values()).sort((left, right) =>
    left.identity.projectionKey.localeCompare(right.identity.projectionKey),
  );

  const rowsByDestination = Object.fromEntries(
    FLOW_PROJECTION_DESTINATIONS.map((destination) => [
      destination,
      items.filter((item) => item.destinationEligibility[destination]),
    ]),
  ) as Record<FlowProjectionDestination, CanonicalFlowProjectionMatrixRow[]>;
  const occurrencesByDestination = Object.fromEntries(
    FLOW_PROJECTION_DESTINATIONS.map((destination) => [
      destination,
      occurrences.filter((occurrence) => occurrence.destinationEligibility[destination]),
    ]),
  ) as Record<FlowProjectionDestination, CanonicalFlowProjectionOccurrenceRow[]>;

  return {
    schemaVersion: FLOW_PROJECTION_IDENTITY_SCHEMA_VERSION,
    items,
    occurrences,
    rowsByDestination,
    occurrencesByDestination,
    duplicateItemIdentityCount,
    duplicateOccurrenceIdentityCount,
    orphanOccurrenceCount,
    warnings,
  };
}

function parseStoredRecord(raw: string | null): StoredRecord | undefined {
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as StoredRecord
      : undefined;
  } catch {
    return undefined;
  }
}

function parseCurrentManifest(
  raw: string | null,
  flowId: string,
): ProjectionIdentityMigrationManifest | undefined {
  const parsed = parseStoredRecord(raw);
  if (
    !parsed ||
    parsed.schemaVersion !== FLOW_PROJECTION_IDENTITY_SCHEMA_VERSION ||
    parsed.flowId !== flowId
  ) {
    return undefined;
  }
  return parsed as ProjectionIdentityMigrationManifest;
}

function getLegacyAliases(
  record: StoredRecord,
  flowId: string,
  itemId: string,
): ProjectionIdentityMigrationAlias[] {
  const canonicalKey = buildCanonicalFlowValueKey(flowId, itemId);
  const prefix = `${buildCanonicalFlowItemKey(flowId, itemId)}::`;
  return Object.keys(record)
    .filter((key) => key.startsWith(prefix) && key !== canonicalKey)
    .filter((key) => !key.slice(prefix.length).startsWith('occurrence::'))
    .sort()
    .map((legacyKey) => ({ legacyKey, canonicalKey }));
}

function mergeDraftAliases(
  record: StoredRecord,
  aliases: ProjectionIdentityMigrationAlias[],
): boolean {
  if (aliases.length === 0) return false;
  const canonicalKey = aliases[0].canonicalKey;
  const legacyDrafts = aliases.flatMap(({ legacyKey }) => {
    const value = record[legacyKey];
    return value && typeof value === 'object' && !Array.isArray(value)
      ? [value as StoredRecord]
      : [];
  });
  const canonical = record[canonicalKey];
  const canonicalDraft = canonical && typeof canonical === 'object' && !Array.isArray(canonical)
    ? canonical as StoredRecord
    : {};
  if (legacyDrafts.length === 0 && Object.keys(canonicalDraft).length === 0) return false;
  record[canonicalKey] = Object.assign({}, ...legacyDrafts, canonicalDraft);
  return true;
}

function mergeDateAliases(
  record: StoredRecord,
  aliases: ProjectionIdentityMigrationAlias[],
): boolean {
  if (aliases.length === 0) return false;
  const canonicalKey = aliases[0].canonicalKey;
  if (typeof record[canonicalKey] === 'string') return false;
  const legacy = [...aliases]
    .reverse()
    .find(({ legacyKey }) => typeof record[legacyKey] === 'string');
  if (!legacy) return false;
  record[canonicalKey] = record[legacy.legacyKey];
  return true;
}

function restoreStorageValue(
  storage: ProjectionIdentityStorage,
  key: string,
  value: string | null,
): void {
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, value);
}

export function migrateProjectionIdentityStorage(
  storage: ProjectionIdentityStorage,
  options: {
    flowId: string;
    itemIds: string[];
    itemDraftStorageKey: string;
    dateOverrideStorageKey: string;
    migratedAt?: string;
  },
): ProjectionIdentityMigrationResult {
  const flowId = normalizeIdentityPart(options.flowId, 'flow_id');
  const itemIds = Array.from(new Set(options.itemIds.map((itemId) =>
    normalizeIdentityPart(itemId, 'item_id'),
  )));
  const manifestKey = getProjectionIdentityMigrationStorageKey(flowId);
  const currentManifest = parseCurrentManifest(storage.getItem(manifestKey), flowId);
  if (currentManifest) {
    return { source: 'already_current', manifest: currentManifest, warnings: [] };
  }

  const previousDrafts = storage.getItem(options.itemDraftStorageKey);
  const previousDates = storage.getItem(options.dateOverrideStorageKey);
  const previousManifest = storage.getItem(manifestKey);
  const itemDrafts = parseStoredRecord(previousDrafts);
  const dateOverrides = parseStoredRecord(previousDates);
  if (!itemDrafts || !dateOverrides) {
    return {
      source: 'malformed_preserved',
      warnings: ['malformed_projection_storage_preserved'],
    };
  }

  const itemDraftAliases = itemIds.flatMap((itemId) =>
    getLegacyAliases(itemDrafts, flowId, itemId),
  );
  const dateOverrideAliases = itemIds.flatMap((itemId) =>
    getLegacyAliases(dateOverrides, flowId, itemId),
  );
  const warnings = [
    ...itemIds.flatMap((itemId) => {
      const count = itemDraftAliases.filter((alias) =>
        alias.canonicalKey === buildCanonicalFlowValueKey(flowId, itemId),
      ).length;
      return count > 1 ? [`multiple_legacy_item_drafts:${itemId}`] : [];
    }),
    ...itemIds.flatMap((itemId) => {
      const count = dateOverrideAliases.filter((alias) =>
        alias.canonicalKey === buildCanonicalFlowValueKey(flowId, itemId),
      ).length;
      return count > 1 ? [`multiple_legacy_date_overrides:${itemId}`] : [];
    }),
  ];
  let draftsChanged = false;
  let datesChanged = false;
  itemIds.forEach((itemId) => {
    draftsChanged = mergeDraftAliases(
      itemDrafts,
      itemDraftAliases.filter((alias) =>
        alias.canonicalKey === buildCanonicalFlowValueKey(flowId, itemId),
      ),
    ) || draftsChanged;
    datesChanged = mergeDateAliases(
      dateOverrides,
      dateOverrideAliases.filter((alias) =>
        alias.canonicalKey === buildCanonicalFlowValueKey(flowId, itemId),
      ),
    ) || datesChanged;
  });

  const manifest: ProjectionIdentityMigrationManifest = {
    schemaVersion: FLOW_PROJECTION_IDENTITY_SCHEMA_VERSION,
    flowId,
    migratedAt: options.migratedAt ?? new Date().toISOString(),
    itemIds,
    itemDraftAliases,
    dateOverrideAliases,
    legacyItemDraftValues: Object.fromEntries(
      itemDraftAliases.map(({ legacyKey }) => [legacyKey, itemDrafts[legacyKey]]),
    ),
    legacyDateOverrideValues: Object.fromEntries(
      dateOverrideAliases.map(({ legacyKey }) => [legacyKey, dateOverrides[legacyKey]]),
    ),
    legacyRecordsPreserved: true,
    warnings,
  };

  itemDraftAliases.forEach(({ legacyKey }) => {
    delete itemDrafts[legacyKey];
  });
  dateOverrideAliases.forEach(({ legacyKey }) => {
    delete dateOverrides[legacyKey];
  });
  draftsChanged = draftsChanged || itemDraftAliases.length > 0;
  datesChanged = datesChanged || dateOverrideAliases.length > 0;

  try {
    if (draftsChanged) {
      storage.setItem(options.itemDraftStorageKey, JSON.stringify(itemDrafts));
    }
    if (datesChanged) {
      storage.setItem(options.dateOverrideStorageKey, JSON.stringify(dateOverrides));
    }
    storage.setItem(manifestKey, JSON.stringify(manifest));
  } catch {
    try {
      restoreStorageValue(storage, options.itemDraftStorageKey, previousDrafts);
      restoreStorageValue(storage, options.dateOverrideStorageKey, previousDates);
      restoreStorageValue(storage, manifestKey, previousManifest);
    } catch {
      return {
        source: 'write_failed',
        warnings: ['projection_identity_migration_failed', 'projection_identity_rollback_failed'],
      };
    }
    return {
      source: 'write_failed',
      warnings: ['projection_identity_migration_failed'],
    };
  }

  return {
    source: itemDraftAliases.length > 0 || dateOverrideAliases.length > 0
      ? 'migrated'
      : 'no_legacy_values',
    manifest,
    warnings,
  };
}
