import type { PreparedFlowEditorPlanCommit } from './flow-editor-transaction';

export type FlowEditorRawStorageSnapshot = Readonly<{
  keys: readonly string[];
  values: Readonly<Record<string, string>>;
}>;

export type FlowEditorStorageRecoveryJournal = Readonly<{
  schemaVersion: 2;
  transactionId: string;
  createdAt: string;
  targetKeys: readonly string[];
  snapshot: FlowEditorRawStorageSnapshot;
  commitMarker: Readonly<{
    key: string;
    value: string;
    previousValue: string | null;
  }>;
}>;

export const FLOW_EDITOR_STORAGE_RECOVERY_KEY = 'flow:editor-storage-recovery:v2';
export const FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY = 'flow:editor-storage-commit-marker:v2';

function uniqueStorageKeys(keys: readonly string[]): string[] {
  return Array.from(new Set(keys.filter((key) => Boolean(key.trim())))).sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actualKeys.length === expected.length &&
    actualKeys.every((key, index) => key === expected[index]);
}

function isCanonicalStorageKeyList(value: unknown, options?: Readonly<{
  allowEmpty?: boolean;
}>): value is string[] {
  if (!Array.isArray(value) || value.some((key) => typeof key !== 'string' || !key.trim())) {
    return false;
  }
  if (!options?.allowEmpty && value.length === 0) return false;
  const canonical = uniqueStorageKeys(value);
  return canonical.length === value.length &&
    canonical.every((key, index) => key === value[index]);
}

function parseFlowEditorStorageRecoveryJournal(
  value: unknown,
  expectedCommitMarkerKey: string,
): FlowEditorStorageRecoveryJournal | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'schemaVersion',
      'transactionId',
      'createdAt',
      'targetKeys',
      'snapshot',
      'commitMarker',
    ]) ||
    value.schemaVersion !== 2 ||
    typeof value.transactionId !== 'string' ||
    !value.transactionId.trim() ||
    typeof value.createdAt !== 'string' ||
    !isCanonicalStorageKeyList(value.targetKeys)
  ) return null;

  const createdAt = new Date(value.createdAt);
  if (Number.isNaN(createdAt.valueOf()) || createdAt.toISOString() !== value.createdAt) return null;

  if (
    !isRecord(value.snapshot) ||
    !hasExactKeys(value.snapshot, ['keys', 'values']) ||
    !isCanonicalStorageKeyList(value.snapshot.keys, { allowEmpty: true }) ||
    !isRecord(value.snapshot.values)
  ) return null;

  const targetKeys = value.targetKeys;
  const snapshotKeys = value.snapshot.keys;
  const snapshotValues = value.snapshot.values;
  const snapshotValueKeys = Object.keys(snapshotValues).sort();
  if (
    snapshotKeys.some((key) => !targetKeys.includes(key)) ||
    snapshotValueKeys.length !== snapshotKeys.length ||
    snapshotValueKeys.some((key, index) => key !== snapshotKeys[index]) ||
    snapshotKeys.some((key) => typeof snapshotValues[key] !== 'string')
  ) return null;

  if (
    !isRecord(value.commitMarker) ||
    !hasExactKeys(value.commitMarker, ['key', 'value', 'previousValue']) ||
    value.commitMarker.key !== expectedCommitMarkerKey ||
    value.commitMarker.value !== value.transactionId ||
    !(
      value.commitMarker.previousValue === null ||
      typeof value.commitMarker.previousValue === 'string'
    ) ||
    value.commitMarker.previousValue === value.commitMarker.value ||
    targetKeys.includes(value.commitMarker.key)
  ) return null;

  return value as FlowEditorStorageRecoveryJournal;
}

export function captureFlowEditorRawStorage(
  storage: Pick<Storage, 'length' | 'key' | 'getItem'>,
): FlowEditorRawStorageSnapshot {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key))
    .sort();
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = storage.getItem(key);
    if (value !== null) values[key] = value;
  }
  return { keys, values };
}

export function captureFlowEditorStorageKeys(
  storage: Pick<Storage, 'getItem'>,
  targetKeys: readonly string[],
): FlowEditorRawStorageSnapshot {
  const keys = uniqueStorageKeys(targetKeys).filter((key) => storage.getItem(key) !== null);
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = storage.getItem(key);
    if (value !== null) values[key] = value;
  }
  return { keys, values };
}

export function isFlowEditorRawStorageEqual(
  storage: Pick<Storage, 'length' | 'key' | 'getItem'>,
  snapshot: FlowEditorRawStorageSnapshot,
): boolean {
  const current = captureFlowEditorRawStorage(storage);
  if (current.keys.length !== snapshot.keys.length) return false;
  return current.keys.every(
    (key, index) => key === snapshot.keys[index] && current.values[key] === snapshot.values[key],
  );
}

export function restoreFlowEditorRawStorage(
  storage: Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>,
  snapshot: FlowEditorRawStorageSnapshot,
): boolean {
  const expectedKeys = new Set(snapshot.keys);
  const currentKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key));
  for (const key of currentKeys) {
    if (!expectedKeys.has(key)) storage.removeItem(key);
  }
  for (const key of snapshot.keys) {
    storage.setItem(key, snapshot.values[key] ?? '');
  }
  return isFlowEditorRawStorageEqual(storage, snapshot);
}

function isFlowEditorStorageKeysEqual(
  storage: Pick<Storage, 'getItem'>,
  targetKeys: readonly string[],
  snapshot: FlowEditorRawStorageSnapshot,
): boolean {
  const current = captureFlowEditorStorageKeys(storage, targetKeys);
  if (current.keys.length !== snapshot.keys.length) return false;
  return current.keys.every(
    (key, index) => key === snapshot.keys[index] && current.values[key] === snapshot.values[key],
  );
}

function restoreFlowEditorStorageKeys(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  targetKeys: readonly string[],
  snapshot: FlowEditorRawStorageSnapshot,
): boolean {
  const expectedKeys = new Set(snapshot.keys);
  for (const key of uniqueStorageKeys(targetKeys)) {
    if (!expectedKeys.has(key)) storage.removeItem(key);
  }
  for (const key of snapshot.keys) {
    storage.setItem(key, snapshot.values[key] ?? '');
  }
  return isFlowEditorStorageKeysEqual(storage, targetKeys, snapshot);
}

function restoreFlowEditorCommitMarker(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  marker: FlowEditorStorageRecoveryJournal['commitMarker'],
) {
  if (marker.previousValue === null) storage.removeItem(marker.key);
  else storage.setItem(marker.key, marker.previousValue);
}

/**
 * Builds the P0-05 prepared Plan operation for synchronous browser-storage writers.
 * Preparation is read-only. The commit callback must not yield to unrelated writers.
 */
export function prepareFlowEditorStorageCommit(input: Readonly<{
  storage: Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;
  commit: () => void;
  afterRollback?: () => void;
  recovery?: Readonly<{
    journalStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
    key?: string;
    transactionId: string;
    targetKeys: readonly string[];
    commitMarkerKey?: string;
  }>;
}>): PreparedFlowEditorPlanCommit {
  const targetKeys = input.recovery
    ? uniqueStorageKeys(input.recovery.targetKeys)
    : undefined;
  if (input.recovery && targetKeys?.length === 0) {
    throw new TypeError('Flow editor recovery requires at least one target storage key.');
  }
  const recoveryKey = input.recovery?.key ?? FLOW_EDITOR_STORAGE_RECOVERY_KEY;
  const commitMarkerKey = input.recovery?.commitMarkerKey ?? FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY;
  if (input.recovery && !input.recovery.transactionId.trim()) {
    throw new TypeError('Flow editor recovery requires a non-empty transaction id.');
  }
  if (input.recovery && !recoveryKey.trim()) {
    throw new TypeError('Flow editor recovery requires a non-empty journal storage key.');
  }
  if (input.recovery && !commitMarkerKey.trim()) {
    throw new TypeError('Flow editor recovery requires a non-empty commit marker key.');
  }
  if (input.recovery && recoveryKey === commitMarkerKey) {
    throw new TypeError('Flow editor recovery journal and commit marker keys must differ.');
  }
  if (targetKeys?.includes(commitMarkerKey)) {
    throw new TypeError('Flow editor commit marker must not be one of the target storage keys.');
  }
  const previousCommitMarkerValue = input.recovery
    ? input.storage.getItem(commitMarkerKey)
    : null;
  if (input.recovery && previousCommitMarkerValue === input.recovery.transactionId) {
    throw new TypeError('Flow editor transaction id must differ from the prior commit marker.');
  }
  const before = targetKeys
    ? captureFlowEditorStorageKeys(input.storage, targetKeys)
    : captureFlowEditorRawStorage(input.storage);
  const journal: FlowEditorStorageRecoveryJournal | undefined = input.recovery
    ? {
        schemaVersion: 2,
        transactionId: input.recovery.transactionId,
        createdAt: new Date().toISOString(),
        targetKeys: targetKeys ?? [],
        snapshot: before,
        commitMarker: {
          key: commitMarkerKey,
          value: input.recovery.transactionId,
          previousValue: previousCommitMarkerValue,
        },
      }
    : undefined;
  const restoreBefore = () => targetKeys
    ? restoreFlowEditorStorageKeys(input.storage, targetKeys, before)
    : restoreFlowEditorRawStorage(input.storage, before);
  const verifyBefore = () => targetKeys
    ? isFlowEditorStorageKeysEqual(input.storage, targetKeys, before)
    : isFlowEditorRawStorageEqual(input.storage, before);
  return {
    commit: () => {
      if (input.recovery && journal) {
        input.recovery.journalStorage.setItem(recoveryKey, JSON.stringify(journal));
      }
      input.commit();
      if (input.recovery && journal) {
        input.storage.setItem(journal.commitMarker.key, journal.commitMarker.value);
        input.recovery.journalStorage.removeItem(recoveryKey);
        if (input.recovery.journalStorage.getItem(recoveryKey) !== null) {
          throw new Error('Flow editor recovery journal cleanup failed.');
        }
        try {
          restoreFlowEditorCommitMarker(input.storage, journal.commitMarker);
        } catch {
          // The durable journal is already gone, so a stale marker is harmless.
        }
      }
    },
    rollbackAndVerify: () => {
      const restored = restoreBefore();
      if (journal) restoreFlowEditorCommitMarker(input.storage, journal.commitMarker);
      const markerRestored = !journal ||
        input.storage.getItem(journal.commitMarker.key) === journal.commitMarker.previousValue;
      const verified = restored && verifyBefore() && markerRestored;
      input.afterRollback?.();
      if (verified && input.recovery) {
        input.recovery.journalStorage.removeItem(recoveryKey);
        return input.recovery.journalStorage.getItem(recoveryKey) === null;
      }
      return verified;
    },
  };
}

export function recoverFlowEditorStorageCommit(input: Readonly<{
  storage: Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;
  journalStorage: Pick<Storage, 'getItem' | 'removeItem'>;
  key?: string;
  commitMarkerKey?: string;
}>): Readonly<{
  found: boolean;
  recovered: boolean;
  transactionId?: string;
  outcome?: 'committed' | 'rolled-back';
}> {
  const recoveryKey = input.key ?? FLOW_EDITOR_STORAGE_RECOVERY_KEY;
  const raw = input.journalStorage.getItem(recoveryKey);
  if (!raw) return { found: false, recovered: true };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { found: true, recovered: false };
  }
  const commitMarkerKey = input.commitMarkerKey ?? FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY;
  if (!commitMarkerKey.trim()) return { found: true, recovered: false };
  const journal = parseFlowEditorStorageRecoveryJournal(parsed, commitMarkerKey);
  if (!journal) return { found: true, recovered: false };
  try {
    const currentCommitMarker = input.storage.getItem(journal.commitMarker.key);
    if (
      currentCommitMarker !== journal.commitMarker.value &&
      currentCommitMarker !== journal.commitMarker.previousValue
    ) {
      return { found: true, recovered: false, transactionId: journal.transactionId };
    }
    if (currentCommitMarker === journal.commitMarker.value) {
      input.journalStorage.removeItem(recoveryKey);
      if (input.journalStorage.getItem(recoveryKey) !== null) {
        return { found: true, recovered: false, transactionId: journal.transactionId };
      }
      try {
        restoreFlowEditorCommitMarker(input.storage, journal.commitMarker);
      } catch {
        // A stale marker does not invalidate the already committed target bytes.
      }
      return {
        found: true,
        recovered: true,
        transactionId: journal.transactionId,
        outcome: 'committed',
      };
    }
    const restored = restoreFlowEditorStorageKeys(
      input.storage,
      journal.targetKeys,
      journal.snapshot,
    );
    restoreFlowEditorCommitMarker(input.storage, journal.commitMarker);
    const verified = restored &&
      isFlowEditorStorageKeysEqual(input.storage, journal.targetKeys, journal.snapshot) &&
      input.storage.getItem(journal.commitMarker.key) === journal.commitMarker.previousValue;
    if (verified) input.journalStorage.removeItem(recoveryKey);
    const recovered = verified && input.journalStorage.getItem(recoveryKey) === null;
    return {
      found: true,
      recovered,
      transactionId: journal.transactionId,
      ...(recovered ? { outcome: 'rolled-back' as const } : {}),
    };
  } catch {
    return {
      found: true,
      recovered: false,
      transactionId: journal.transactionId,
    };
  }
}
