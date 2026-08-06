import {
  MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
  MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
  MY_FLOW_OCCURRENCE_EXECUTION_STORAGE_KEY,
} from './my-flow-personal-state';
import {
  getSourceBackedFlowMapPersistenceStorageKey,
  getSourceBackedFlowMapSnapshotStorageKey,
} from './source-backed-my-flow';
import {
  runFlowMapSaveTransaction,
  type FlowMapSaveStorage,
  type FlowMapSaveTransactionResult,
} from './flow-map-save-transaction';

const FLOW_RUN_LAST_VISIT_STORAGE_KEY = 'flow:meta:last-visit';

export type FlowRunReuseStorageKeyPlan = Readonly<{
  flowSlug: string;
  mapIds: readonly string[];
  allKeys: readonly string[];
}>;

function requireStorageIdentifier(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${field} must be non-empty`);
  return normalized;
}

export function buildFlowRunReuseStorageKeyPlan(options: {
  flowSlug: string;
  mapIds?: readonly (string | undefined)[];
}): FlowRunReuseStorageKeyPlan {
  const flowSlug = requireStorageIdentifier(options.flowSlug, 'flowSlug');
  const mapIds = Array.from(new Set(
    (options.mapIds ?? [])
      .map((mapId) => mapId?.trim())
      .filter((mapId): mapId is string => Boolean(mapId)),
  ));
  const allKeys = Array.from(new Set([
    `flow:run-registry:${flowSlug}`,
    `flow:saved:${flowSlug}`,
    `flow_builder_mvp_checks_${flowSlug}`,
    `flow:${flowSlug}:anchorDate`,
    `flow_builder_mvp_item_state_${flowSlug}`,
    `flow_builder_mvp_comparison_${flowSlug}`,
    `flow_builder_mvp_workbench_${flowSlug}`,
    `flow_builder_mvp_reactions_${flowSlug}`,
    `flow:my-flow:completion-feedback:${flowSlug}`,
    `flow:my-flow:execution-notes:${flowSlug}`,
    `flow:completion-detected-at:${flowSlug}`,
    'flow:my-flow:step-item-checks',
    MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
    MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
    MY_FLOW_OCCURRENCE_EXECUTION_STORAGE_KEY,
    FLOW_RUN_LAST_VISIT_STORAGE_KEY,
    ...mapIds.flatMap((mapId) => [
      getSourceBackedFlowMapSnapshotStorageKey(mapId),
      getSourceBackedFlowMapPersistenceStorageKey(mapId),
    ]),
  ]));

  return { flowSlug, mapIds, allKeys };
}

export function runFlowRunReuseStorageTransaction(options: {
  storage: FlowMapSaveStorage;
  keyPlan: FlowRunReuseStorageKeyPlan;
  apply: (storage: FlowMapSaveStorage) => void;
}): FlowMapSaveTransactionResult {
  const plannedKeys = new Set(options.keyPlan.allKeys);
  return runFlowMapSaveTransaction({
    storage: options.storage,
    keys: options.keyPlan.allKeys,
    apply(transactionStorage) {
      const guardedStorage: FlowMapSaveStorage = {
        getItem: (key) => transactionStorage.getItem(key),
        setItem(key, value) {
          if (!plannedKeys.has(key)) {
            throw new TypeError(`Unplanned Flow run reuse storage write: ${key}`);
          }
          transactionStorage.setItem(key, value);
        },
        removeItem(key) {
          if (!plannedKeys.has(key)) {
            throw new TypeError(`Unplanned Flow run reuse storage removal: ${key}`);
          }
          transactionStorage.removeItem(key);
        },
      };
      options.apply(guardedStorage);
    },
  });
}
