import { CANONICAL_FLOW_ORIGIN_STORAGE_KEY } from './canonical-flow-storage';
import {
  normalizeSavedFlowRecord,
  type SavedFlowRecord,
} from './storage';
import type { FlowItemState } from './types';
import type { PublicSaveChoice } from './public-save-lifecycle';

export const PUBLIC_FLOW_SAVED_RECORD_KEY_PREFIX = 'flow:saved:';
export const PUBLIC_FLOW_ITEM_STATE_KEY_PREFIX = 'flow_builder_mvp_item_state_';
export const PUBLIC_FLOW_ITEM_DRAFTS_KEY = 'flow:my-flow:item-drafts';
export const PUBLIC_FLOW_DATE_OVERRIDES_KEY = 'flow:my-flow:date-overrides';
export const PUBLIC_FLOW_LAST_VISIT_KEY = 'flow:meta:last-visit';

export type PublicFlowSaveStorage = Pick<
  Storage,
  'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'
>;

export type PublicFlowSaveRawBackup = {
  keys: string[];
  values: Record<string, string | null>;
};

export type PublicFlowSaveStorageKeyPlan = {
  personalCopyKey: string;
  savedRecordKey: string;
  anchorKey: string;
  itemStateKey: string;
  itemDraftsKey: typeof PUBLIC_FLOW_ITEM_DRAFTS_KEY;
  dateOverridesKey: typeof PUBLIC_FLOW_DATE_OVERRIDES_KEY;
  canonicalOriginKey: typeof CANONICAL_FLOW_ORIGIN_STORAGE_KEY;
  lastVisitKey: typeof PUBLIC_FLOW_LAST_VISIT_KEY;
  allKeys: string[];
};

export type PublicFlowSaveWrite = {
  key: string;
  raw: string | null;
};

export type PublicFlowSaveJsonRecordRead<T = unknown> =
  | {
      ok: true;
      raw: string | null;
      value: Record<string, T>;
    }
  | {
      ok: false;
      raw?: string;
      error: unknown;
      reason: 'invalid_key' | 'read_failed' | 'malformed_json' | 'non_record';
    };

export class PublicFlowSaveConflictError extends Error {
  readonly conflictKeys: string[];

  constructor(conflictKeys: readonly string[]) {
    super(`public Flow save input changed: ${conflictKeys.join(', ')}`);
    this.name = 'PublicFlowSaveConflictError';
    this.conflictKeys = [...conflictKeys];
  }
}

export type PublicFlowSaveTransactionResult =
  | {
      ok: true;
      status: 'committed';
      backup: PublicFlowSaveRawBackup;
      writeCount: number;
      rollbackComplete: true;
    }
  | {
      ok: true;
      status: 'already_committed';
      backup: undefined;
      writeCount: 0;
      rollbackComplete: true;
    }
  | {
      ok: false;
      status: 'failed';
      error: unknown;
      backup?: PublicFlowSaveRawBackup;
      writeCount: number;
      rollbackComplete: boolean;
      failureStage:
        | 'validation'
        | 'idempotency_read'
        | 'backup_read'
        | 'prepare_commit'
        | 'write'
        | 'rollback';
    }
  | {
      ok: false;
      status: 'failed';
      error: PublicFlowSaveConflictError;
      backup: PublicFlowSaveRawBackup;
      conflictKeys: string[];
      writeCount: 0;
      rollbackComplete: true;
      failureStage: 'conflict';
    };

export type PublicFlowSavedCopySummary = {
  personalCopyKey: string;
  sourceFlowKey: string;
  sourceFlowSlug: string;
  sourceVersion?: string;
  savedAt: string;
  personalTitle?: string;
  lastSaveRequestId?: string;
  legacy: boolean;
  /** Exact bytes inspected when this choice was presented. */
  savedRecordRaw: string;
};

export type PublicFlowSavedCopyInspection =
  | { kind: 'ready_new'; copies: [] }
  | { kind: 'choice_required'; copies: PublicFlowSavedCopySummary[] }
  | { kind: 'already_committed'; copy: PublicFlowSavedCopySummary }
  | { kind: 'held'; reason: 'malformed_legacy' | 'storage_unavailable' };

function assertIdentifier(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${field} must be non-empty`);
  return normalized;
}

function uniqueKeys(keys: readonly string[]): string[] {
  const normalized = keys.map((key, index) => assertIdentifier(key, `keys[${index}]`));
  return Array.from(new Set(normalized));
}

export function getPublicFlowSavedRecordStorageKey(personalCopyKey: string): string {
  return `${PUBLIC_FLOW_SAVED_RECORD_KEY_PREFIX}${assertIdentifier(personalCopyKey, 'personalCopyKey')}`;
}

export function getPublicFlowAnchorStorageKey(personalCopyKey: string): string {
  return `flow:${assertIdentifier(personalCopyKey, 'personalCopyKey')}:anchorDate`;
}

export function getPublicFlowItemStateStorageKey(personalCopyKey: string): string {
  return `${PUBLIC_FLOW_ITEM_STATE_KEY_PREFIX}${assertIdentifier(personalCopyKey, 'personalCopyKey')}`;
}

export function readPublicFlowSaveJsonRecord<T = unknown>(
  storage: Pick<PublicFlowSaveStorage, 'getItem'>,
  key: string,
): PublicFlowSaveJsonRecordRead<T> {
  let normalizedKey: string;
  try {
    normalizedKey = assertIdentifier(key, 'key');
  } catch (error) {
    return { ok: false, error, reason: 'invalid_key' };
  }

  let raw: string | null;
  try {
    raw = storage.getItem(normalizedKey);
  } catch (error) {
    return { ok: false, error, reason: 'read_failed' };
  }
  if (raw === null) return { ok: true, raw, value: {} };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { ok: false, raw, error, reason: 'malformed_json' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      raw,
      error: new TypeError('public Flow save JSON value must be a record'),
      reason: 'non_record',
    };
  }
  return { ok: true, raw, value: parsed as Record<string, T> };
}

function isPlainPublicFlowSaveRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwnRecordField(record: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, field);
}

const PUBLIC_FLOW_ITEM_STATE_FIELDS = new Set<keyof FlowItemState>([
  'skipped',
  'note',
  'personalOrder',
  'personalExcluded',
]);

/**
 * Validates persisted per-item state before the overwrite path dereferences it.
 * Unknown fields are held instead of silently discarded so a newer or corrupt
 * record cannot be destructively rewritten by an older save path.
 */
export function isValidPublicFlowItemStateRecord(
  value: unknown,
): value is Record<string, FlowItemState> {
  if (!isPlainPublicFlowSaveRecord(value)) return false;
  return Object.entries(value).every(([itemId, candidate]) => {
    if (!itemId.trim() || !isPlainPublicFlowSaveRecord(candidate)) return false;
    if (Object.keys(candidate).some((field) => (
      !PUBLIC_FLOW_ITEM_STATE_FIELDS.has(field as keyof FlowItemState)
    ))) return false;
    if (hasOwnRecordField(candidate, 'skipped') && typeof candidate.skipped !== 'boolean') {
      return false;
    }
    if (hasOwnRecordField(candidate, 'note') && typeof candidate.note !== 'string') {
      return false;
    }
    if (
      hasOwnRecordField(candidate, 'personalOrder')
      && (typeof candidate.personalOrder !== 'number' || !Number.isFinite(candidate.personalOrder))
    ) return false;
    if (
      hasOwnRecordField(candidate, 'personalExcluded')
      && typeof candidate.personalExcluded !== 'boolean'
    ) return false;
    return true;
  });
}

/** Minimal shape guard before draft records are cloned and spread. */
export function isValidPublicFlowItemDraftRecord(
  value: unknown,
): value is Record<string, Record<string, unknown>> {
  if (!isPlainPublicFlowSaveRecord(value)) return false;
  return Object.entries(value).every(([key, candidate]) => (
    Boolean(key.trim()) && isPlainPublicFlowSaveRecord(candidate)
  ));
}

/** Minimal shape guard before date override records are copied and rewritten. */
export function isValidPublicFlowDateOverrideRecord(
  value: unknown,
): value is Record<string, string> {
  if (!isPlainPublicFlowSaveRecord(value)) return false;
  return Object.entries(value).every(([key, candidate]) => (
    Boolean(key.trim()) && typeof candidate === 'string'
  ));
}

export function buildPublicFlowSaveStorageKeyPlan(
  personalCopyKey: string,
): PublicFlowSaveStorageKeyPlan {
  const normalizedCopyKey = assertIdentifier(personalCopyKey, 'personalCopyKey');
  const savedRecordKey = getPublicFlowSavedRecordStorageKey(normalizedCopyKey);
  const anchorKey = getPublicFlowAnchorStorageKey(normalizedCopyKey);
  const itemStateKey = getPublicFlowItemStateStorageKey(normalizedCopyKey);
  const allKeys = uniqueKeys([
    PUBLIC_FLOW_ITEM_DRAFTS_KEY,
    PUBLIC_FLOW_DATE_OVERRIDES_KEY,
    itemStateKey,
    anchorKey,
    CANONICAL_FLOW_ORIGIN_STORAGE_KEY,
    PUBLIC_FLOW_LAST_VISIT_KEY,
    savedRecordKey,
  ]);
  return {
    personalCopyKey: normalizedCopyKey,
    savedRecordKey,
    anchorKey,
    itemStateKey,
    itemDraftsKey: PUBLIC_FLOW_ITEM_DRAFTS_KEY,
    dateOverridesKey: PUBLIC_FLOW_DATE_OVERRIDES_KEY,
    canonicalOriginKey: CANONICAL_FLOW_ORIGIN_STORAGE_KEY,
    lastVisitKey: PUBLIC_FLOW_LAST_VISIT_KEY,
    allKeys,
  };
}

export function capturePublicFlowSaveRawBackup(
  storage: PublicFlowSaveStorage,
  keys: readonly string[],
): PublicFlowSaveRawBackup {
  const explicitKeys = uniqueKeys(keys);
  return {
    keys: explicitKeys,
    values: Object.fromEntries(explicitKeys.map((key) => [key, storage.getItem(key)])),
  };
}

export function restorePublicFlowSaveRawBackup(
  storage: Pick<PublicFlowSaveStorage, 'setItem' | 'removeItem'>,
  backup: PublicFlowSaveRawBackup,
): boolean {
  let complete = true;
  [...backup.keys].reverse().forEach((key) => {
    try {
      const raw = backup.values[key];
      if (raw === null || raw === undefined) storage.removeItem(key);
      else storage.setItem(key, raw);
    } catch {
      complete = false;
    }
  });
  return complete;
}

function parseSavedRecord(raw: string | null): SavedFlowRecord | undefined {
  if (!raw) return undefined;
  try {
    return normalizeSavedFlowRecord(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function toSavedCopySummary(
  record: SavedFlowRecord,
  savedRecordRaw: string,
): PublicFlowSavedCopySummary {
  return {
    personalCopyKey: record.personalCopyKey ?? record.slug,
    sourceFlowKey: record.sourceFlowKey ?? record.slug,
    sourceFlowSlug: record.sourceFlowSlug ?? record.slug,
    ...(record.sourceVersion ? { sourceVersion: record.sourceVersion } : {}),
    savedAt: record.savedAt,
    ...(record.personalTitle ? { personalTitle: record.personalTitle } : {}),
    ...(record.lastSaveRequestId ? { lastSaveRequestId: record.lastSaveRequestId } : {}),
    legacy: record.schemaVersion !== 2,
    savedRecordRaw,
  };
}

export function inspectPublicFlowSavedCopies(
  storage: Pick<PublicFlowSaveStorage, 'length' | 'key' | 'getItem'>,
  input: {
    sourceFlowKey: string;
    sourceFlowSlug: string;
    idempotencyKey: string;
  },
): PublicFlowSavedCopyInspection {
  const sourceFlowKey = assertIdentifier(input.sourceFlowKey, 'sourceFlowKey');
  const sourceFlowSlug = assertIdentifier(input.sourceFlowSlug, 'sourceFlowSlug');
  const idempotencyKey = assertIdentifier(input.idempotencyKey, 'idempotencyKey');
  const copies: PublicFlowSavedCopySummary[] = [];

  try {
    const storageLength = storage.length;
    for (let index = 0; index < storageLength; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(PUBLIC_FLOW_SAVED_RECORD_KEY_PREFIX)) continue;
      const raw = storage.getItem(key);
      const record = parseSavedRecord(raw);
      if (!record) {
        let malformedMatchesSource = key === getPublicFlowSavedRecordStorageKey(sourceFlowSlug);
        if (!malformedMatchesSource && raw) {
          try {
            const candidate = JSON.parse(raw) as { sourceFlowKey?: unknown; sourceFlowSlug?: unknown };
            malformedMatchesSource = candidate.sourceFlowKey === sourceFlowKey
              || candidate.sourceFlowSlug === sourceFlowSlug;
          } catch {
            // A malformed unrelated record is ignored; an exact legacy key is held above.
          }
        }
        if (malformedMatchesSource) return { kind: 'held', reason: 'malformed_legacy' };
        continue;
      }
      const summary = toSavedCopySummary(record, raw as string);
      if (
        summary.sourceFlowKey !== sourceFlowKey
        && summary.sourceFlowSlug !== sourceFlowSlug
      ) continue;
      if (summary.lastSaveRequestId === idempotencyKey) {
        return { kind: 'already_committed', copy: summary };
      }
      copies.push(summary);
    }
  } catch {
    return { kind: 'held', reason: 'storage_unavailable' };
  }

  copies.sort((left, right) => (
    left.savedAt.localeCompare(right.savedAt)
    || left.personalCopyKey.localeCompare(right.personalCopyKey)
  ));
  return copies.length > 0
    ? { kind: 'choice_required', copies }
    : { kind: 'ready_new', copies: [] };
}

export type PublicFlowSaveLockedChoiceValidation =
  | Readonly<{
      ok: true;
      status: 'proceed';
      expectedSavedRecordRaw: string | null;
    }>
  | Readonly<{
      ok: true;
      status: 'already_committed';
      copy: PublicFlowSavedCopySummary;
    }>
  | Readonly<{
      ok: false;
      status: 'stale';
      reason:
        | 'inspection_held'
        | 'existing_copy_changed'
        | 'overwrite_target_missing'
        | 'overwrite_target_changed'
        | 'target_identity_conflict';
    }>;

/**
 * Revalidates a UI choice after the shared user-data lock is acquired. The
 * returned raw value must also be supplied to the write transaction CAS so a
 * non-cooperating writer cannot change the target between this read and backup.
 */
export function validatePublicFlowSaveChoiceUnderLock(
  storage: PublicFlowSaveStorage,
  input: {
    sourceFlowKey: string;
    sourceFlowSlug: string;
    idempotencyKey: string;
    choice: PublicSaveChoice;
    expectedOverwriteRaw?: string | null;
  },
): PublicFlowSaveLockedChoiceValidation {
  const inspection = inspectPublicFlowSavedCopies(storage, input);
  if (inspection.kind === 'held') {
    return { ok: false, status: 'stale', reason: 'inspection_held' };
  }
  if (inspection.kind === 'already_committed') {
    return { ok: true, status: 'already_committed', copy: inspection.copy };
  }

  const savedRecordKey = getPublicFlowSavedRecordStorageKey(input.choice.personalCopyKey);
  let currentTargetRaw: string | null;
  try {
    currentTargetRaw = storage.getItem(savedRecordKey);
  } catch {
    return { ok: false, status: 'stale', reason: 'inspection_held' };
  }

  if (input.choice.kind === 'create') {
    if (inspection.kind !== 'ready_new') {
      return { ok: false, status: 'stale', reason: 'existing_copy_changed' };
    }
    return currentTargetRaw === null
      ? { ok: true, status: 'proceed', expectedSavedRecordRaw: null }
      : { ok: false, status: 'stale', reason: 'target_identity_conflict' };
  }

  if (input.choice.kind === 'copy') {
    return currentTargetRaw === null
      ? { ok: true, status: 'proceed', expectedSavedRecordRaw: null }
      : { ok: false, status: 'stale', reason: 'target_identity_conflict' };
  }

  if (inspection.kind !== 'choice_required') {
    return { ok: false, status: 'stale', reason: 'overwrite_target_missing' };
  }
  const latestTarget = inspection.copies.find(
    (copy) => copy.personalCopyKey === input.choice.personalCopyKey,
  );
  if (!latestTarget) {
    return { ok: false, status: 'stale', reason: 'overwrite_target_missing' };
  }
  if (
    typeof input.expectedOverwriteRaw !== 'string'
    || latestTarget.savedRecordRaw !== input.expectedOverwriteRaw
    || currentTargetRaw !== input.expectedOverwriteRaw
  ) {
    return { ok: false, status: 'stale', reason: 'overwrite_target_changed' };
  }
  return {
    ok: true,
    status: 'proceed',
    expectedSavedRecordRaw: input.expectedOverwriteRaw,
  };
}

function assertSavedRecordLast(
  writes: readonly PublicFlowSaveWrite[],
  savedRecordKey: string,
): void {
  if (writes.length === 0 || writes[writes.length - 1]?.key !== savedRecordKey) {
    throw new TypeError('saved record must be the final public Flow save write');
  }
  if (writes.slice(0, -1).some((write) => write.key === savedRecordKey)) {
    throw new TypeError('saved record may only be written once');
  }
}

function validatePublicFlowSaveExpectedRaw(
  expectedRaw: Readonly<Record<string, string | null>> | undefined,
  keyPlan: PublicFlowSaveStorageKeyPlan,
): void {
  if (expectedRaw === undefined) return;
  if (!expectedRaw || typeof expectedRaw !== 'object' || Array.isArray(expectedRaw)) {
    throw new TypeError('expectedRaw must be a record');
  }
  const allowedKeys = new Set(keyPlan.allKeys);
  Object.entries(expectedRaw).forEach(([key, raw]) => {
    if (!allowedKeys.has(key)) {
      throw new TypeError(`undeclared public Flow save expected key: ${key}`);
    }
    if (raw !== null && typeof raw !== 'string') {
      throw new TypeError(`expected raw value must be a string or null: ${key}`);
    }
  });
}

export function runPublicFlowSaveTransaction(input: {
  storage: PublicFlowSaveStorage;
  keyPlan: PublicFlowSaveStorageKeyPlan;
  idempotencyKey: string;
  writes: readonly PublicFlowSaveWrite[];
  expectedRaw?: Readonly<Record<string, string | null>>;
  prepareCommit?: (backup: PublicFlowSaveRawBackup) => void;
}): PublicFlowSaveTransactionResult {
  const idempotencyKey = assertIdentifier(input.idempotencyKey, 'idempotencyKey');
  try {
    assertSavedRecordLast(input.writes, input.keyPlan.savedRecordKey);
    validatePublicFlowSaveExpectedRaw(input.expectedRaw, input.keyPlan);
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      error,
      writeCount: 0,
      rollbackComplete: true,
      failureStage: 'validation',
    };
  }
  let existing: SavedFlowRecord | undefined;
  try {
    existing = parseSavedRecord(input.storage.getItem(input.keyPlan.savedRecordKey));
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      error,
      writeCount: 0,
      rollbackComplete: true,
      failureStage: 'idempotency_read',
    };
  }
  if (existing?.lastSaveRequestId === idempotencyKey) {
    return {
      ok: true,
      status: 'already_committed',
      backup: undefined,
      writeCount: 0,
      rollbackComplete: true,
    };
  }

  let backup: PublicFlowSaveRawBackup;
  try {
    backup = capturePublicFlowSaveRawBackup(input.storage, input.keyPlan.allKeys);
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      error,
      writeCount: 0,
      rollbackComplete: true,
      failureStage: 'backup_read',
    };
  }

  const conflictKeys = Object.entries(input.expectedRaw ?? {}).flatMap(([key, expected]) => (
    backup.values[key] === expected ? [] : [key]
  ));
  if (conflictKeys.length > 0) {
    const error = new PublicFlowSaveConflictError(conflictKeys);
    return {
      ok: false,
      status: 'failed',
      error,
      backup,
      conflictKeys,
      writeCount: 0,
      rollbackComplete: true,
      failureStage: 'conflict',
    };
  }

  try {
    input.prepareCommit?.(backup);
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      error,
      backup,
      writeCount: 0,
      rollbackComplete: true,
      failureStage: 'prepare_commit',
    };
  }

  let writeCount = 0;
  try {
    const allowedKeys = new Set(input.keyPlan.allKeys);
    input.writes.forEach((write) => {
      if (!allowedKeys.has(write.key)) {
        throw new TypeError(`undeclared public Flow save key: ${write.key}`);
      }
      if (write.raw === null) input.storage.removeItem(write.key);
      else input.storage.setItem(write.key, write.raw);
      writeCount += 1;
    });
    return {
      ok: true,
      status: 'committed',
      backup,
      writeCount,
      rollbackComplete: true,
    };
  } catch (error) {
    const rollbackComplete = restorePublicFlowSaveRawBackup(input.storage, backup);
    return {
      ok: false,
      status: 'failed',
      error,
      backup,
      writeCount,
      rollbackComplete,
      failureStage: rollbackComplete ? 'write' : 'rollback',
    };
  }
}

export function getPublicFlowAuthoringItemStates(
  itemStates: Record<string, FlowItemState>,
): Record<string, FlowItemState> {
  return Object.fromEntries(Object.entries(itemStates).flatMap(([itemId, state]) => {
    const authoring: FlowItemState = {
      ...(typeof state.personalExcluded === 'boolean'
        ? { personalExcluded: state.personalExcluded }
        : {}),
      ...(typeof state.personalOrder === 'number' && Number.isFinite(state.personalOrder)
        ? { personalOrder: state.personalOrder }
        : {}),
    };
    return Object.keys(authoring).length > 0 ? [[itemId, authoring] as const] : [];
  }));
}

export function mergePublicFlowAuthoringItemStates(input: {
  currentTargetState?: Record<string, FlowItemState>;
  authoringState: Record<string, FlowItemState>;
  preserveExecutionState: boolean;
}): Record<string, FlowItemState> {
  const executionState = input.preserveExecutionState
    ? Object.fromEntries(Object.entries(input.currentTargetState ?? {}).flatMap(([itemId, state]) => {
        const preserved: FlowItemState = {
          ...(typeof state.skipped === 'boolean' ? { skipped: state.skipped } : {}),
          ...(typeof state.note === 'string' ? { note: state.note } : {}),
        };
        return Object.keys(preserved).length > 0 ? [[itemId, preserved] as const] : [];
      }))
    : {};
  const itemIds = new Set([
    ...Object.keys(executionState),
    ...Object.keys(input.authoringState),
  ]);
  return Object.fromEntries(Array.from(itemIds).flatMap((itemId) => {
    const merged = {
      ...(executionState[itemId] ?? {}),
      ...(input.authoringState[itemId] ?? {}),
    };
    return Object.keys(merged).length > 0 ? [[itemId, merged] as const] : [];
  }));
}

export function removeFlowScopedRecordEntries<T>(
  record: Record<string, T>,
  flowSlug: string,
): Record<string, T> {
  const prefix = `${assertIdentifier(flowSlug, 'flowSlug')}::`;
  return Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith(prefix)));
}
