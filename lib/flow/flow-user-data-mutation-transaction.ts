import { CANONICAL_FLOW_ORIGIN_STORAGE_KEY } from './canonical-flow-storage';
import {
  MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
  MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
} from './my-flow-personal-state';
import { getPersonalStructuralOverlayStorageKey } from './personal-structural-overlay';
import {
  getSourceBackedFlowMapPersistenceStorageKey,
  getSourceBackedFlowMapSnapshotStorageKey,
} from './source-backed-my-flow';
import {
  runFlowMapSaveTransaction,
  type FlowMapSaveStorage,
  type FlowMapSaveTransactionResult,
} from './flow-map-save-transaction';

export const FLOW_USER_DATA_BUNDLES_STORAGE_KEY = 'flow_builder_mvp_bundles_v11';
export const FLOW_USER_DATA_LAST_VISIT_STORAGE_KEY = 'flow:meta:last-visit';

export type FlowUserDataMutationStorageKeyPlan = Readonly<{
  flowSlugs: readonly string[];
  mapIds: readonly string[];
  bundleKey: typeof FLOW_USER_DATA_BUNDLES_STORAGE_KEY;
  savedFlowKeysBySlug: Readonly<Record<string, string>>;
  anchorKeysBySlug: Readonly<Record<string, string>>;
  checkKeysBySlug: Readonly<Record<string, string>>;
  itemStateKeysBySlug: Readonly<Record<string, string>>;
  structuralOverlayKeysBySlug: Readonly<Record<string, string>>;
  mapSnapshotKeysById: Readonly<Record<string, string>>;
  mapPersistenceKeysById: Readonly<Record<string, string>>;
  allKeys: readonly string[];
}>;

function normalizeIds(values: readonly string[], field: string): string[] {
  return Array.from(new Set(values.map((value, index) => {
    const normalized = value.trim();
    if (!normalized) throw new TypeError(`${field}[${index}] must be non-empty`);
    return normalized;
  })));
}

export function buildFlowUserDataMutationStorageKeyPlan(options: {
  flowSlugs: readonly string[];
  mapIds?: readonly string[];
}): FlowUserDataMutationStorageKeyPlan {
  const flowSlugs = normalizeIds(options.flowSlugs, 'flowSlugs');
  const mapIds = normalizeIds(options.mapIds ?? [], 'mapIds');
  const savedFlowKeysBySlug = Object.fromEntries(flowSlugs.map((slug) => [slug, `flow:saved:${slug}`]));
  const anchorKeysBySlug = Object.fromEntries(flowSlugs.map((slug) => [slug, `flow:${slug}:anchorDate`]));
  const checkKeysBySlug = Object.fromEntries(flowSlugs.map((slug) => [slug, `flow_builder_mvp_checks_${slug}`]));
  const itemStateKeysBySlug = Object.fromEntries(flowSlugs.map((slug) => [slug, `flow_builder_mvp_item_state_${slug}`]));
  const structuralOverlayKeysBySlug = Object.fromEntries(
    flowSlugs.map((slug) => [slug, getPersonalStructuralOverlayStorageKey(slug)]),
  );
  const mapSnapshotKeysById = Object.fromEntries(
    mapIds.map((mapId) => [mapId, getSourceBackedFlowMapSnapshotStorageKey(mapId)]),
  );
  const mapPersistenceKeysById = Object.fromEntries(
    mapIds.map((mapId) => [mapId, getSourceBackedFlowMapPersistenceStorageKey(mapId)]),
  );
  const allKeys = Array.from(new Set([
    FLOW_USER_DATA_BUNDLES_STORAGE_KEY,
    MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
    MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
    CANONICAL_FLOW_ORIGIN_STORAGE_KEY,
    FLOW_USER_DATA_LAST_VISIT_STORAGE_KEY,
    ...Object.values(savedFlowKeysBySlug),
    ...Object.values(anchorKeysBySlug),
    ...Object.values(checkKeysBySlug),
    ...Object.values(itemStateKeysBySlug),
    ...Object.values(structuralOverlayKeysBySlug),
    ...Object.values(mapSnapshotKeysById),
    ...Object.values(mapPersistenceKeysById),
  ]));

  return {
    flowSlugs,
    mapIds,
    bundleKey: FLOW_USER_DATA_BUNDLES_STORAGE_KEY,
    savedFlowKeysBySlug,
    anchorKeysBySlug,
    checkKeysBySlug,
    itemStateKeysBySlug,
    structuralOverlayKeysBySlug,
    mapSnapshotKeysById,
    mapPersistenceKeysById,
    allKeys,
  };
}

export function captureFlowUserDataMutationExpectedRaw(
  storage: FlowMapSaveStorage,
  keyPlan: FlowUserDataMutationStorageKeyPlan,
): Record<string, string | null> {
  return Object.fromEntries(keyPlan.allKeys.map((key) => [key, storage.getItem(key)]));
}

export function runFlowUserDataMutationTransaction(options: {
  storage: FlowMapSaveStorage;
  keyPlan: FlowUserDataMutationStorageKeyPlan;
  expectedRaw: Readonly<Record<string, string | null>>;
  apply: (storage: FlowMapSaveStorage) => void;
}): FlowMapSaveTransactionResult {
  const plannedKeys = new Set(options.keyPlan.allKeys);
  return runFlowMapSaveTransaction({
    storage: options.storage,
    keys: options.keyPlan.allKeys,
    expectedRaw: options.expectedRaw,
    apply(transactionStorage) {
      const guardedStorage: FlowMapSaveStorage = {
        getItem: (key) => transactionStorage.getItem(key),
        setItem(key, value) {
          if (!plannedKeys.has(key)) throw new TypeError(`Unplanned Flow user-data write: ${key}`);
          transactionStorage.setItem(key, value);
        },
        removeItem(key) {
          if (!plannedKeys.has(key)) throw new TypeError(`Unplanned Flow user-data removal: ${key}`);
          transactionStorage.removeItem(key);
        },
      };
      options.apply(guardedStorage);
    },
  });
}
