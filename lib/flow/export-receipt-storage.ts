import {
  isResultTransferPersistentReceipt,
  type ResultTransferPersistentReceipt,
  type ResultTransferReceiptWriteResult,
} from './result-transfer';
import {
  FLOW_EXPORT_RECEIPT_WRITE_LOCK,
  withStorageWriteLock,
} from './storage-write-lock';

export const FLOW_EXPORT_RECEIPTS_STORAGE_KEY = 'flow:export-receipts:v1';
export const FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION = 1 as const;

export type FlowExportReceiptRegistry = Readonly<{
  schemaVersion: typeof FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION;
  receipts: readonly ResultTransferPersistentReceipt[];
}>;

export type FlowExportReceiptStorageReader = Pick<Storage, 'getItem'>;
export type FlowExportReceiptStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type FlowExportReceiptRegistryReadResult =
  | Readonly<{
      status: 'empty' | 'valid';
      registry: FlowExportReceiptRegistry;
      raw: string | null;
    }>
  | Readonly<{
      status: 'malformed' | 'unsupported';
      registry: null;
      raw: string;
    }>;

export type AppendFlowExportReceiptResult = ResultTransferReceiptWriteResult & Readonly<{
  receiptId?: string;
  reason?:
    | 'invalid_receipt'
    | 'malformed_registry'
    | 'unsupported_registry'
    | 'receipt_id_conflict'
    | 'write_failed';
  rollbackComplete?: boolean;
  rawBefore?: string | null;
  rawAfter?: string | null;
}>;

export type RemoveFlowExportReceiptsForSavedPlanResult = Readonly<{
  status: 'removed' | 'not_found' | 'blocked' | 'failed';
  savedPlanId: string;
  removedReceiptIds: readonly string[];
  removedCount: number;
  reason?:
    | 'invalid_saved_plan_id'
    | 'read_failed'
    | 'malformed_registry'
    | 'unsupported_registry'
    | 'write_failed';
  message?: string;
  rollbackComplete?: boolean;
  rawBefore?: string | null;
  rawAfter?: string | null;
}>;

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach((entry) => deepFreeze(entry));
  return Object.freeze(value);
}

function frozenRegistry(receipts: readonly ResultTransferPersistentReceipt[]): FlowExportReceiptRegistry {
  receipts.forEach((receipt) => deepFreeze(receipt));
  return deepFreeze({
    schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
    receipts: [...receipts],
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseRegistry(value: unknown): FlowExportReceiptRegistry | null {
  if (!isRecord(value) || value.schemaVersion !== FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION) return null;
  if (!Array.isArray(value.receipts) || !value.receipts.every(isResultTransferPersistentReceipt)) {
    return null;
  }
  const receiptIds = value.receipts.map((receipt) => receipt.receiptId);
  if (new Set(receiptIds).size !== receiptIds.length) return null;
  return frozenRegistry(value.receipts);
}

export function readFlowExportReceiptRegistry(
  storage: FlowExportReceiptStorageReader,
): FlowExportReceiptRegistryReadResult {
  const raw = storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY);
  if (raw === null) {
    return { status: 'empty', registry: frozenRegistry([]), raw: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'malformed', registry: null, raw };
  }
  if (isRecord(parsed) && parsed.schemaVersion !== FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION) {
    return { status: 'unsupported', registry: null, raw };
  }
  const registry = parseRegistry(parsed);
  return registry
    ? { status: 'valid', registry, raw }
    : { status: 'malformed', registry: null, raw };
}

function sameReceipt(
  left: ResultTransferPersistentReceipt,
  right: ResultTransferPersistentReceipt,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function restoreRaw(
  storage: FlowExportReceiptStorage,
  raw: string | null,
  ownedRaw: string | null,
): boolean {
  try {
    const currentRaw = storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY);
    if (currentRaw === raw) return true;
    if (currentRaw !== ownedRaw) return false;
    if (raw === null) storage.removeItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY);
    else storage.setItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY, raw);
    return storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY) === raw;
  } catch {
    return false;
  }
}

export function appendFlowExportReceipt(
  storage: FlowExportReceiptStorage,
  receipt: ResultTransferPersistentReceipt,
): AppendFlowExportReceiptResult {
  if (!isResultTransferPersistentReceipt(receipt)) {
    return {
      status: 'blocked',
      reason: 'invalid_receipt',
      message: 'The export receipt is invalid.',
    };
  }
  const current = readFlowExportReceiptRegistry(storage);
  if (!current.registry) {
    return {
      status: 'blocked',
      reason: current.status === 'unsupported' ? 'unsupported_registry' : 'malformed_registry',
      message: current.status === 'unsupported'
        ? 'The export receipt registry version is unsupported.'
        : 'The export receipt registry is malformed.',
      rawBefore: current.raw,
      rawAfter: current.raw,
    };
  }
  const registry = current.registry;

  const existing = registry.receipts.find((entry) => entry.receiptId === receipt.receiptId);
  if (existing) {
    if (sameReceipt(existing, receipt)) {
      return {
        status: 'duplicate',
        receiptId: receipt.receiptId,
        rawBefore: current.raw,
        rawAfter: current.raw,
      };
    }
    return {
      status: 'blocked',
      reason: 'receipt_id_conflict',
      message: 'A different export receipt already uses this receipt ID.',
      receiptId: receipt.receiptId,
      rawBefore: current.raw,
      rawAfter: current.raw,
    };
  }

  const nextRaw = JSON.stringify({
    schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
    receipts: [...registry.receipts, receipt],
  });
  try {
    storage.setItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY, nextRaw);
    if (storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY) !== nextRaw) {
      throw new Error('Export receipt storage readback did not match the write.');
    }
    return {
      status: 'stored',
      receiptId: receipt.receiptId,
      rawBefore: current.raw,
      rawAfter: nextRaw,
    };
  } catch (error) {
    const rollbackComplete = restoreRaw(storage, current.raw, nextRaw);
    let rawAfter: string | null | undefined;
    try {
      rawAfter = storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY);
    } catch {
      rawAfter = undefined;
    }
    return {
      status: 'failed',
      reason: 'write_failed',
      message: error instanceof Error ? error.message : 'The export receipt could not be stored.',
      receiptId: receipt.receiptId,
      rollbackComplete,
      rawBefore: current.raw,
      ...(rawAfter !== undefined ? { rawAfter } : {}),
    };
  }
}

export function getFlowExportReceiptsForFlow(
  storage: FlowExportReceiptStorageReader,
  flowId: string,
): ResultTransferPersistentReceipt[] {
  const read = readFlowExportReceiptRegistry(storage);
  if (read.status !== 'empty' && read.status !== 'valid') return [];
  return read.registry.receipts.filter((receipt) => receipt.snapshot.identity.flowId === flowId);
}

export function getFlowExportReceiptsForSavedPlan(
  storage: FlowExportReceiptStorageReader,
  savedPlanId: string,
): ResultTransferPersistentReceipt[] {
  const normalizedSavedPlanId = savedPlanId.trim();
  if (!normalizedSavedPlanId) return [];
  const read = readFlowExportReceiptRegistry(storage);
  if (read.status !== 'empty' && read.status !== 'valid') return [];
  return read.registry.receipts.filter((receipt) => receipt.savedPlanId === normalizedSavedPlanId);
}

export function removeFlowExportReceiptsForSavedPlan(
  storage: FlowExportReceiptStorage,
  savedPlanId: string,
): RemoveFlowExportReceiptsForSavedPlanResult {
  const normalizedSavedPlanId = savedPlanId.trim();
  if (!normalizedSavedPlanId) {
    return {
      status: 'blocked',
      savedPlanId: '',
      removedReceiptIds: [],
      removedCount: 0,
      reason: 'invalid_saved_plan_id',
      message: 'A saved plan ID is required before receipts can be removed.',
    };
  }

  let current: FlowExportReceiptRegistryReadResult;
  try {
    current = readFlowExportReceiptRegistry(storage);
  } catch (error) {
    return {
      status: 'failed',
      savedPlanId: normalizedSavedPlanId,
      removedReceiptIds: [],
      removedCount: 0,
      reason: 'read_failed',
      message: error instanceof Error
        ? error.message
        : 'The export receipt registry could not be read.',
    };
  }
  if (!current.registry) {
    return {
      status: 'blocked',
      savedPlanId: normalizedSavedPlanId,
      removedReceiptIds: [],
      removedCount: 0,
      reason: current.status === 'unsupported' ? 'unsupported_registry' : 'malformed_registry',
      message: current.status === 'unsupported'
        ? 'The export receipt registry version is unsupported.'
        : 'The export receipt registry is malformed.',
      rawBefore: current.raw,
      rawAfter: current.raw,
    };
  }

  const removedReceiptIds = current.registry.receipts
    .filter((receipt) => receipt.savedPlanId === normalizedSavedPlanId)
    .map((receipt) => receipt.receiptId);
  if (removedReceiptIds.length === 0) {
    return {
      status: 'not_found',
      savedPlanId: normalizedSavedPlanId,
      removedReceiptIds: [],
      removedCount: 0,
      rawBefore: current.raw,
      rawAfter: current.raw,
    };
  }

  const remaining = current.registry.receipts.filter(
    (receipt) => receipt.savedPlanId !== normalizedSavedPlanId,
  );
  const nextRaw = remaining.length > 0
    ? JSON.stringify({
        schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
        receipts: remaining,
      })
    : null;
  try {
    if (nextRaw === null) storage.removeItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY);
    else storage.setItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY, nextRaw);
    if (storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY) !== nextRaw) {
      throw new Error('Export receipt storage readback did not match the removal.');
    }
    return {
      status: 'removed',
      savedPlanId: normalizedSavedPlanId,
      removedReceiptIds,
      removedCount: removedReceiptIds.length,
      rawBefore: current.raw,
      rawAfter: nextRaw,
    };
  } catch (error) {
    const rollbackComplete = restoreRaw(storage, current.raw, nextRaw);
    let rawAfter: string | null | undefined;
    try {
      rawAfter = storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY);
    } catch {
      rawAfter = undefined;
    }
    return {
      status: 'failed',
      savedPlanId: normalizedSavedPlanId,
      removedReceiptIds,
      removedCount: removedReceiptIds.length,
      reason: 'write_failed',
      message: error instanceof Error ? error.message : 'The export receipts could not be removed.',
      rollbackComplete,
      rawBefore: current.raw,
      ...(rawAfter !== undefined ? { rawAfter } : {}),
    };
  }
}

export async function removeFlowExportReceiptsForSavedPlanSerialized(
  storage: FlowExportReceiptStorage,
  savedPlanId: string,
): Promise<RemoveFlowExportReceiptsForSavedPlanResult> {
  const normalizedSavedPlanId = savedPlanId.trim();
  if (!normalizedSavedPlanId) {
    return removeFlowExportReceiptsForSavedPlan(storage, savedPlanId);
  }

  const lockedRemoval = await withStorageWriteLock(
    FLOW_EXPORT_RECEIPT_WRITE_LOCK,
    () => removeFlowExportReceiptsForSavedPlan(storage, normalizedSavedPlanId),
  );
  if (lockedRemoval.ok) return lockedRemoval.value;

  return {
    status: 'failed',
    savedPlanId: normalizedSavedPlanId,
    removedReceiptIds: [],
    removedCount: 0,
    reason: 'write_failed',
    message: lockedRemoval.reason === 'unavailable' || lockedRemoval.reason === 'lock_failed'
      ? 'The export receipt cleanup cannot be serialized safely in this browser.'
      : lockedRemoval.error instanceof Error
        ? lockedRemoval.error.message
        : 'The export receipt cleanup ended in an unknown state.',
  };
}
