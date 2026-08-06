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

type FlowMapSaveOwnedRaw = Readonly<Record<string, readonly (string | null)[]>>;

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
      conflictKeys: [];
      rollbackComplete: true;
    }
  | {
      ok: false;
      error: unknown;
      conflictKeys: string[];
      rollbackComplete: boolean;
    };

export class FlowMapSaveConflictError extends Error {
  readonly conflictKeys: string[];

  constructor(conflictKeys: readonly string[]) {
    super(`Flow Map save input changed: ${conflictKeys.join(', ')}`);
    this.name = 'FlowMapSaveConflictError';
    this.conflictKeys = [...conflictKeys];
  }
}

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
  ownedRaw?: FlowMapSaveOwnedRaw,
): boolean {
  let rollbackComplete = true;
  [...backup.keys].reverse().forEach((key) => {
    try {
      if (ownedRaw && Object.prototype.hasOwnProperty.call(ownedRaw, key)) {
        const currentRaw = storage.getItem(key);
        if (currentRaw === backup.values[key]) return;
        if (!ownedRaw[key]?.includes(currentRaw)) {
          rollbackComplete = false;
          return;
        }
      } else if (ownedRaw) {
        return;
      }
      const raw = backup.values[key];
      try {
        if (raw === null || raw === undefined) storage.removeItem(key);
        else storage.setItem(key, raw);
      } catch {
        // A Storage implementation can mutate and then throw. Final readback,
        // rather than the throw alone, decides whether rollback completed.
      }
      if (storage.getItem(key) !== raw) rollbackComplete = false;
    } catch {
      rollbackComplete = false;
    }
  });
  return rollbackComplete;
}

export function runFlowMapSaveTransaction(options: {
  storage: FlowMapSaveStorage;
  keys: readonly string[];
  expectedRaw?: Readonly<Record<string, string | null>>;
  apply: (storage: FlowMapSaveStorage) => void;
}): FlowMapSaveTransactionResult {
  let backup: FlowMapSaveRawStorageBackup;
  try {
    backup = captureFlowMapSaveRawStorageBackup(options.storage, options.keys);
  } catch (error) {
    return { ok: false, error, conflictKeys: [], rollbackComplete: false };
  }

  const conflictKeys = Object.entries(options.expectedRaw ?? {}).flatMap(([key, expected]) => (
    backup.values[key] === expected ? [] : [key]
  ));
  if (conflictKeys.length > 0) {
    return {
      ok: false,
      error: new FlowMapSaveConflictError(conflictKeys),
      conflictKeys,
      rollbackComplete: true,
    };
  }

  const ownedRaw: Record<string, Array<string | null>> = {};
  const latestOwnedRaw: Record<string, string | null> = {};
  const recordOwnedCandidate = (key: string, raw: string | null) => {
    const candidates = ownedRaw[key] ?? [];
    if (!candidates.includes(raw)) candidates.push(raw);
    ownedRaw[key] = candidates;
  };
  let active = true;
  const transactionStorage: FlowMapSaveStorage = {
    getItem: (key) => options.storage.getItem(key),
    setItem(key, value) {
      if (!active) throw new TypeError('Flow Map save transaction is no longer active');
      // Record the attempted bytes before delegating: custom/quota-backed
      // storage can make the write visible and still throw afterward.
      recordOwnedCandidate(key, value);
      options.storage.setItem(key, value);
      latestOwnedRaw[key] = value;
    },
    removeItem(key) {
      if (!active) throw new TypeError('Flow Map save transaction is no longer active');
      recordOwnedCandidate(key, null);
      options.storage.removeItem(key);
      latestOwnedRaw[key] = null;
    },
  };

  try {
    const result = options.apply(transactionStorage) as unknown;
    if (
      result
      && (typeof result === 'object' || typeof result === 'function')
      && typeof (result as { then?: unknown }).then === 'function'
    ) {
      throw new TypeError('Flow Map save transaction apply callback must be synchronous');
    }
    const overwrittenKeys = Object.entries(latestOwnedRaw).flatMap(([key, raw]) => (
      options.storage.getItem(key) === raw ? [] : [key]
    ));
    if (overwrittenKeys.length > 0) throw new FlowMapSaveConflictError(overwrittenKeys);
    active = false;
    return { ok: true, error: undefined, conflictKeys: [], rollbackComplete: true };
  } catch (error) {
    active = false;
    const rollbackComplete = restoreFlowMapSaveRawStorageBackup(
      options.storage,
      backup,
      ownedRaw,
    );
    return {
      ok: false,
      error,
      conflictKeys: error instanceof FlowMapSaveConflictError ? error.conflictKeys : [],
      rollbackComplete,
    };
  }
}
