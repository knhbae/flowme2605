import { CANONICAL_FLOW_ORIGIN_STORAGE_KEY } from './canonical-flow-storage';
import {
  getSourceBackedFlowMapPersistenceStorageKey,
  getSourceBackedFlowMapSnapshotStorageKey,
} from './source-backed-my-flow';

const SAVED_FLOW_STORAGE_KEY_PREFIX = 'flow:saved:';
const ITEM_STATE_STORAGE_KEY_PREFIX = 'flow_builder_mvp_item_state_';

export const FLOW_MAP_SAVE_LAST_VISIT_STORAGE_KEY = 'flow:meta:last-visit';

export type FlowMapSaveStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

export type FlowMapSaveRawStorageBackup = {
  keys: string[];
  values: Record<string, string | null>;
};

export type FlowMapSaveStorageKeyPlan = {
  mapId: string;
  flowSlugs: string[];
  mapSnapshotKey: string;
  mapPersistenceKey: string;
  savedFlowKeysBySlug: Record<string, string>;
  itemStateKeysBySlug: Record<string, string>;
  canonicalOriginKey: typeof CANONICAL_FLOW_ORIGIN_STORAGE_KEY;
  lastVisitKey: typeof FLOW_MAP_SAVE_LAST_VISIT_STORAGE_KEY;
  allKeys: string[];
};

export type FlowMapSaveTransactionResult =
  | {
      ok: true;
      error: undefined;
      rollbackComplete: true;
    }
  | {
      ok: false;
      error: unknown;
      rollbackComplete: boolean;
    };

function assertStorageIdentifier(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${field} must be non-empty`);
  return normalized;
}

function compareStable(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeExplicitKeys(keys: readonly string[]): string[] {
  const normalized = keys.map((key, index) => {
    if (typeof key !== 'string' || !key) {
      throw new TypeError(`keys[${index}] must be a non-empty string`);
    }
    return key;
  });
  return Array.from(new Set(normalized));
}

export function buildFlowMapSaveStorageKeyPlan(options: {
  mapId: string;
  flowSlugs: readonly string[];
}): FlowMapSaveStorageKeyPlan {
  const mapId = assertStorageIdentifier(options.mapId, 'mapId');
  const flowSlugs = Array.from(new Set(options.flowSlugs.map((flowSlug, index) => (
    assertStorageIdentifier(flowSlug, `flowSlugs[${index}]`)
  )))).sort(compareStable);
  const mapSnapshotKey = getSourceBackedFlowMapSnapshotStorageKey(mapId);
  const mapPersistenceKey = getSourceBackedFlowMapPersistenceStorageKey(mapId);
  const savedFlowKeysBySlug = Object.fromEntries(flowSlugs.map((flowSlug) => [
    flowSlug,
    `${SAVED_FLOW_STORAGE_KEY_PREFIX}${flowSlug}`,
  ]));
  const itemStateKeysBySlug = Object.fromEntries(flowSlugs.map((flowSlug) => [
    flowSlug,
    `${ITEM_STATE_STORAGE_KEY_PREFIX}${flowSlug}`,
  ]));
  const allKeys = normalizeExplicitKeys([
    mapSnapshotKey,
    mapPersistenceKey,
    ...flowSlugs.map((flowSlug) => savedFlowKeysBySlug[flowSlug]!),
    ...flowSlugs.map((flowSlug) => itemStateKeysBySlug[flowSlug]!),
    CANONICAL_FLOW_ORIGIN_STORAGE_KEY,
    FLOW_MAP_SAVE_LAST_VISIT_STORAGE_KEY,
  ]);

  return {
    mapId,
    flowSlugs,
    mapSnapshotKey,
    mapPersistenceKey,
    savedFlowKeysBySlug,
    itemStateKeysBySlug,
    canonicalOriginKey: CANONICAL_FLOW_ORIGIN_STORAGE_KEY,
    lastVisitKey: FLOW_MAP_SAVE_LAST_VISIT_STORAGE_KEY,
    allKeys,
  };
}

export function captureFlowMapSaveRawStorageBackup(
  storage: FlowMapSaveStorage,
  keys: readonly string[],
): FlowMapSaveRawStorageBackup {
  const explicitKeys = normalizeExplicitKeys(keys);
  return {
    keys: explicitKeys,
    values: Object.fromEntries(explicitKeys.map((key) => [key, storage.getItem(key)])),
  };
}

export function restoreFlowMapSaveRawStorageBackup(
  storage: FlowMapSaveStorage,
  backup: FlowMapSaveRawStorageBackup,
): boolean {
  let rollbackComplete = true;
  [...backup.keys].reverse().forEach((key) => {
    try {
      const raw = backup.values[key];
      if (raw === null || raw === undefined) storage.removeItem(key);
      else storage.setItem(key, raw);
    } catch {
      rollbackComplete = false;
    }
  });
  return rollbackComplete;
}

export function runFlowMapSaveTransaction(options: {
  storage: FlowMapSaveStorage;
  keys: readonly string[];
  apply: () => void;
}): FlowMapSaveTransactionResult {
  let backup: FlowMapSaveRawStorageBackup;
  try {
    backup = captureFlowMapSaveRawStorageBackup(options.storage, options.keys);
  } catch (error) {
    return { ok: false, error, rollbackComplete: false };
  }

  try {
    const result = options.apply() as unknown;
    if (
      result
      && (typeof result === 'object' || typeof result === 'function')
      && typeof (result as { then?: unknown }).then === 'function'
    ) {
      throw new TypeError('Flow Map save transaction apply callback must be synchronous');
    }
    return { ok: true, error: undefined, rollbackComplete: true };
  } catch (error) {
    return {
      ok: false,
      error,
      rollbackComplete: restoreFlowMapSaveRawStorageBackup(options.storage, backup),
    };
  }
}
