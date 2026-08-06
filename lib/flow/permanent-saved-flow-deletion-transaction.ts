import {
  LEGACY_MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY,
  PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY,
  readPersonalFlowLifecycle,
  restorePersonalFlow,
  savePersonalFlowLifecycle,
} from './personal-flow-lifecycle';
import {
  MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
  MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
  MY_FLOW_OCCURRENCE_EXECUTION_STORAGE_KEY,
} from './my-flow-personal-state';
import {
  PERSONAL_STRUCTURAL_OVERLAY_STORAGE_KEY_PREFIX,
  getPersonalStructuralOverlayStorageKey,
} from './personal-structural-overlay';
import { FLOW_PROJECTION_IDENTITY_MIGRATION_STORAGE_KEY_PREFIX } from './projection-identity';
import {
  getSourceBackedFlowMapPersistenceStorageKey,
  type SourceBackedFlowMapPersistenceRecord,
} from './source-backed-my-flow';
import type { FlowBundle } from './types';
import {
  runFlowMapSaveTransaction,
  type FlowMapSaveStorage,
  type FlowMapSaveTransactionResult,
} from './flow-map-save-transaction';

const BUNDLES_KEY = 'flow_builder_mvp_bundles_v11';
const SAVED_FLOW_MAP_KEY_PREFIX = 'flow:map:saved:';
const SELECTED_CALENDAR_FLOWS_KEY = 'flow:calendar:selected-flows:v1';
const STEP_ITEM_CHECKS_KEY = 'flow:my-flow:step-item-checks';
const LAST_VISIT_KEY = 'flow:meta:last-visit';

export type PermanentSavedFlowDeletionStorage = FlowMapSaveStorage & Pick<Storage, 'key' | 'length'>;

type StoredMapSnapshot = {
  mapId: string;
  flowSlugs: string[];
  stepCountsByFlow?: Record<string, number>;
  riskLevelsByFlow?: Record<string, string>;
  sourceCheckedAtByFlow?: Record<string, string>;
  personalCopy?: {
    includedStepIdsByFlow: Record<string, string[]>;
    excludedStepIdsByFlow: Record<string, string[]>;
    stepOverridesByFlow?: Record<string, Record<string, unknown>>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type ReferencedMap = {
  snapshotKey: string;
  persistenceKey: string;
  snapshot: StoredMapSnapshot;
  persistence?: SourceBackedFlowMapPersistenceRecord;
};

export type PermanentSavedFlowDeletionResult = {
  flowSlug: string;
  personalDraft: boolean;
  lifecycleReferenceRemoved: boolean;
  personalDraftBundleRemoved: boolean;
  removedSavedMapIds: string[];
  updatedSavedMapIds: string[];
  publicSourcePreserved: boolean;
};

export type PermanentSavedFlowDeletionInspection = {
  flowSlug: string;
  personalDraft: boolean;
  keys: string[];
  expectedRaw: Record<string, string | null>;
  fingerprint: string;
  referencedMaps: ReferencedMap[];
  structuralOverlayKeys: string[];
};

export type PermanentSavedFlowDeletionRunResult =
  | { ok: true; result: PermanentSavedFlowDeletionResult; transaction: FlowMapSaveTransactionResult }
  | {
      ok: false;
      reason: 'invalid_target' | 'inspection_failed' | 'stale' | 'not_archived' | 'malformed_bundles' | 'transaction_failed';
      transaction?: FlowMapSaveTransactionResult;
    };

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function parseObjectRecord(raw: string | null): Record<string, unknown> {
  if (raw === null) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function omitRecordKey<T>(value: Record<string, T> | undefined, key: string): Record<string, T> | undefined {
  if (!value) return value;
  const next = { ...value };
  delete next[key];
  return Object.keys(next).length > 0 ? next : undefined;
}

function removeSnapshotFlow(snapshot: StoredMapSnapshot, flowSlug: string): StoredMapSnapshot | undefined {
  const flowSlugs = snapshot.flowSlugs.filter((slug) => slug !== flowSlug);
  if (flowSlugs.length === 0) return undefined;
  const personalCopy = snapshot.personalCopy
    ? {
        ...snapshot.personalCopy,
        includedStepIdsByFlow: omitRecordKey(snapshot.personalCopy.includedStepIdsByFlow, flowSlug) ?? {},
        excludedStepIdsByFlow: omitRecordKey(snapshot.personalCopy.excludedStepIdsByFlow, flowSlug) ?? {},
        stepOverridesByFlow: omitRecordKey(snapshot.personalCopy.stepOverridesByFlow, flowSlug) ?? {},
      }
    : undefined;
  return {
    ...snapshot,
    flowSlugs,
    stepCountsByFlow: omitRecordKey(snapshot.stepCountsByFlow, flowSlug),
    riskLevelsByFlow: omitRecordKey(snapshot.riskLevelsByFlow, flowSlug),
    sourceCheckedAtByFlow: omitRecordKey(snapshot.sourceCheckedAtByFlow, flowSlug),
    ...(personalCopy ? { personalCopy } : {}),
  };
}

function removePersistenceFlow(
  record: SourceBackedFlowMapPersistenceRecord,
  flowSlug: string,
): SourceBackedFlowMapPersistenceRecord {
  const personalCopy = record.personalCopy
    ? {
        ...record.personalCopy,
        includedStepIdsByFlow: omitRecordKey(record.personalCopy.includedStepIdsByFlow, flowSlug) ?? {},
        excludedStepIdsByFlow: omitRecordKey(record.personalCopy.excludedStepIdsByFlow, flowSlug) ?? {},
        stepOverridesByFlow: omitRecordKey(record.personalCopy.stepOverridesByFlow, flowSlug) ?? {},
      }
    : undefined;
  return {
    ...record,
    childFlows: record.childFlows.filter((child) => child.slug !== flowSlug),
    updateAssessment: {
      ...record.updateAssessment,
      affectedFlows: record.updateAssessment.affectedFlows.filter((slug) => slug !== flowSlug),
    },
    ...(personalCopy ? { personalCopy } : {}),
  };
}

function flowScopedKeys(flowSlug: string): string[] {
  return [
    `flow:saved:${flowSlug}`,
    `flow_builder_mvp_checks_${flowSlug}`,
    `flow:${flowSlug}:anchorDate`,
    `flow_builder_mvp_item_state_${flowSlug}`,
    `flow_builder_mvp_comparison_${flowSlug}`,
    `flow_builder_mvp_workbench_${flowSlug}`,
    `flow_builder_mvp_reactions_${flowSlug}`,
    `flow:my-flow:completion-feedback:${flowSlug}`,
    `flow:my-flow:execution-notes:${flowSlug}`,
    `flow:run-registry:${flowSlug}`,
    `flow:completion-detected-at:${flowSlug}`,
    `${FLOW_PROJECTION_IDENTITY_MIGRATION_STORAGE_KEY_PREFIX}${encodeURIComponent(flowSlug)}`,
  ];
}

export function inspectPermanentSavedFlowDeletion(
  storage: PermanentSavedFlowDeletionStorage,
  options: { flowSlug: string; personalDraft: boolean },
): PermanentSavedFlowDeletionInspection | undefined {
  const flowSlug = options.flowSlug.trim();
  if (!flowSlug) return undefined;
  try {
    const storageKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => Boolean(key));
    const referencedMaps = storageKeys
      .filter((key) => key.startsWith(SAVED_FLOW_MAP_KEY_PREFIX))
      .flatMap((snapshotKey) => {
        const raw = storage.getItem(snapshotKey);
        if (raw === null) return [];
        try {
          const snapshot = JSON.parse(raw) as StoredMapSnapshot;
          if (
            !snapshot
            || typeof snapshot.mapId !== 'string'
            || !Array.isArray(snapshot.flowSlugs)
            || !snapshot.flowSlugs.includes(flowSlug)
          ) return [];
          const persistenceKey = getSourceBackedFlowMapPersistenceStorageKey(snapshot.mapId);
          const persistenceRaw = storage.getItem(persistenceKey);
          let persistence: SourceBackedFlowMapPersistenceRecord | undefined;
          if (persistenceRaw !== null) {
            try {
              const parsed = JSON.parse(persistenceRaw) as SourceBackedFlowMapPersistenceRecord;
              if (parsed && typeof parsed === 'object') persistence = parsed;
            } catch {
              // Preserve malformed persistence for an updated Map; a fully removed Map deletes it.
            }
          }
          return [{ snapshotKey, persistenceKey, snapshot, persistence }];
        } catch {
          return [];
        }
      });
    const exactOverlayKey = getPersonalStructuralOverlayStorageKey(flowSlug);
    const structuralOverlayKeys = storageKeys.filter((key) => {
      if (!key.startsWith(PERSONAL_STRUCTURAL_OVERLAY_STORAGE_KEY_PREFIX)) return false;
      if (key === exactOverlayKey) return true;
      const raw = storage.getItem(key);
      if (raw === null) return false;
      try {
        const parsed = JSON.parse(raw) as { flowId?: unknown };
        return parsed?.flowId === flowSlug;
      } catch {
        return false;
      }
    });
    const keys = unique([
      BUNDLES_KEY,
      PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY,
      LEGACY_MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY,
      SELECTED_CALENDAR_FLOWS_KEY,
      STEP_ITEM_CHECKS_KEY,
      MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
      MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
      MY_FLOW_OCCURRENCE_EXECUTION_STORAGE_KEY,
      LAST_VISIT_KEY,
      ...flowScopedKeys(flowSlug),
      ...structuralOverlayKeys,
      ...referencedMaps.flatMap((entry) => [entry.snapshotKey, entry.persistenceKey]),
    ]);
    const expectedRaw = Object.fromEntries(keys.map((key) => [key, storage.getItem(key)]));
    return {
      flowSlug,
      personalDraft: options.personalDraft,
      keys,
      expectedRaw,
      fingerprint: JSON.stringify({ keys, expectedRaw }),
      referencedMaps,
      structuralOverlayKeys,
    };
  } catch {
    return undefined;
  }
}

function filterFlowPrefixRecord(raw: string | null, flowSlug: string): Record<string, unknown> {
  const prefix = `${flowSlug}::`;
  return Object.fromEntries(
    Object.entries(parseObjectRecord(raw)).filter(([key]) => !key.startsWith(prefix)),
  );
}

export function runPermanentSavedFlowDeletionTransaction(options: {
  storage: PermanentSavedFlowDeletionStorage;
  expected: PermanentSavedFlowDeletionInspection;
  deletedAt?: string;
}): PermanentSavedFlowDeletionRunResult {
  const { storage, expected } = options;
  const fresh = inspectPermanentSavedFlowDeletion(storage, {
    flowSlug: expected.flowSlug,
    personalDraft: expected.personalDraft,
  });
  if (!fresh) return { ok: false, reason: 'inspection_failed' };
  if (fresh.fingerprint !== expected.fingerprint) return { ok: false, reason: 'stale' };

  const deletedAt = options.deletedAt ?? new Date().toISOString();
  const lifecycle = readPersonalFlowLifecycle(storage, deletedAt).record;
  if (!lifecycle.archivedFlowSlugs.includes(fresh.flowSlug)) {
    return { ok: false, reason: 'not_archived' };
  }
  let nextBundles: FlowBundle[] | undefined;
  let personalDraftBundleRemoved = false;
  if (fresh.personalDraft) {
    const raw = storage.getItem(BUNDLES_KEY);
    try {
      const parsed = JSON.parse(raw ?? '[]') as unknown;
      if (!Array.isArray(parsed)) return { ok: false, reason: 'malformed_bundles' };
      const bundles = parsed as FlowBundle[];
      nextBundles = bundles.filter((bundle) => bundle?.flow?.slug !== fresh.flowSlug);
      personalDraftBundleRemoved = nextBundles.length !== bundles.length;
    } catch {
      return { ok: false, reason: 'malformed_bundles' };
    }
  }

  const removedSavedMapIds: string[] = [];
  const updatedSavedMapIds: string[] = [];
  const plannedKeys = new Set(fresh.keys);
  const transaction = runFlowMapSaveTransaction({
    storage,
    keys: fresh.keys,
    expectedRaw: fresh.expectedRaw,
    apply(transactionStorage) {
      const guardedStorage: FlowMapSaveStorage = {
        getItem: (key) => transactionStorage.getItem(key),
        setItem(key, value) {
          if (!plannedKeys.has(key)) throw new TypeError(`Unplanned permanent-delete write: ${key}`);
          transactionStorage.setItem(key, value);
        },
        removeItem(key) {
          if (!plannedKeys.has(key)) throw new TypeError(`Unplanned permanent-delete removal: ${key}`);
          transactionStorage.removeItem(key);
        },
      };

      savePersonalFlowLifecycle(
        guardedStorage,
        restorePersonalFlow(lifecycle, fresh.flowSlug, deletedAt),
      );
      fresh.referencedMaps.forEach((entry) => {
        const nextSnapshot = removeSnapshotFlow(entry.snapshot, fresh.flowSlug);
        if (!nextSnapshot) {
          guardedStorage.removeItem(entry.snapshotKey);
          guardedStorage.removeItem(entry.persistenceKey);
          removedSavedMapIds.push(entry.snapshot.mapId);
          return;
        }
        guardedStorage.setItem(entry.snapshotKey, JSON.stringify(nextSnapshot));
        if (entry.persistence) {
          guardedStorage.setItem(
            entry.persistenceKey,
            JSON.stringify(removePersistenceFlow(entry.persistence, fresh.flowSlug)),
          );
        }
        updatedSavedMapIds.push(entry.snapshot.mapId);
      });
      if (nextBundles) guardedStorage.setItem(BUNDLES_KEY, JSON.stringify(nextBundles));

      const selectedRaw = guardedStorage.getItem(SELECTED_CALENDAR_FLOWS_KEY);
      try {
        const selected = JSON.parse(selectedRaw ?? '[]') as unknown;
        if (Array.isArray(selected)) {
          const next = selected.filter((value) => value !== fresh.flowSlug);
          if (next.length > 0) guardedStorage.setItem(SELECTED_CALENDAR_FLOWS_KEY, JSON.stringify(next));
          else guardedStorage.removeItem(SELECTED_CALENDAR_FLOWS_KEY);
        } else {
          guardedStorage.removeItem(SELECTED_CALENDAR_FLOWS_KEY);
        }
      } catch {
        guardedStorage.removeItem(SELECTED_CALENDAR_FLOWS_KEY);
      }

      flowScopedKeys(fresh.flowSlug).forEach((key) => guardedStorage.removeItem(key));
      const stepChecks = filterFlowPrefixRecord(guardedStorage.getItem(STEP_ITEM_CHECKS_KEY), fresh.flowSlug);
      guardedStorage.setItem(STEP_ITEM_CHECKS_KEY, JSON.stringify(stepChecks));
      guardedStorage.setItem(
        MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
        JSON.stringify(filterFlowPrefixRecord(guardedStorage.getItem(MY_FLOW_ITEM_DRAFTS_STORAGE_KEY), fresh.flowSlug)),
      );
      guardedStorage.setItem(
        MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
        JSON.stringify(filterFlowPrefixRecord(guardedStorage.getItem(MY_FLOW_DATE_OVERRIDES_STORAGE_KEY), fresh.flowSlug)),
      );
      guardedStorage.setItem(
        MY_FLOW_OCCURRENCE_EXECUTION_STORAGE_KEY,
        JSON.stringify(filterFlowPrefixRecord(guardedStorage.getItem(MY_FLOW_OCCURRENCE_EXECUTION_STORAGE_KEY), fresh.flowSlug)),
      );
      fresh.structuralOverlayKeys.forEach((key) => guardedStorage.removeItem(key));
      guardedStorage.setItem(LAST_VISIT_KEY, deletedAt);
    },
  });
  if (!transaction.ok) return { ok: false, reason: 'transaction_failed', transaction };

  return {
    ok: true,
    transaction,
    result: {
      flowSlug: fresh.flowSlug,
      personalDraft: fresh.personalDraft,
      lifecycleReferenceRemoved: true,
      personalDraftBundleRemoved,
      removedSavedMapIds,
      updatedSavedMapIds,
      publicSourcePreserved: !fresh.personalDraft,
    },
  };
}
