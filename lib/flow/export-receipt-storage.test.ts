import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
  FLOW_EXPORT_RECEIPTS_STORAGE_KEY,
  appendFlowExportReceipt,
  getFlowExportReceiptsForFlow,
  getFlowExportReceiptsForSavedPlan,
  readFlowExportReceiptRegistry,
  removeFlowExportReceiptsForSavedPlan,
  removeFlowExportReceiptsForSavedPlanSerialized,
  type FlowExportReceiptStorage,
} from './export-receipt-storage';
import type { ResultTransferPersistentReceipt } from './result-transfer';
import {
  FLOW_EXPORT_RECEIPT_WRITE_LOCK,
  withStorageWriteLock,
} from './storage-write-lock';

function buildReceipt(options: Readonly<{
  receiptId?: string;
  savedPlanId?: string;
  flowId?: string;
  completedAt?: string;
}> = {}): ResultTransferPersistentReceipt {
  const receiptId = options.receiptId ?? 'receipt-a';
  return {
    schemaVersion: 1,
    kind: 'persistent_receipt',
    receiptId,
    requestId: receiptId,
    route: 'saved_transfer',
    savedPlanId: options.savedPlanId ?? 'saved-plan-a',
    outcome: 'success',
    createdAt: '2026-08-04T01:00:00.000Z',
    completedAt: options.completedAt ?? '2026-08-04T01:01:00.000Z',
    snapshot: {
      kind: 'effective_execution',
      version: 'source-v1|personal-v2|execution-v3',
      hash: 'a1b2c3d4',
      identity: {
        flowId: options.flowId ?? 'flow-a',
        flowSlug: 'flow-a',
        sourceVersion: 'source-v1',
        personalVersion: 'personal-v2',
        executionVersion: 'execution-v3',
      },
    },
    scope: { kind: 'flow' },
    format: 'calendar',
    artifactKind: 'calendar_ics',
    itemIds: ['item-a', 'item-b'],
    itemCount: 2,
    projectionOutputCount: 1,
    outputCount: 4,
    omitted: {
      heldItemIds: ['item-held'],
      unavailableItemIds: [],
      excludedItemIds: [],
      reasonsByItemId: { 'item-held': '날짜가 필요합니다.' },
    },
    oneWay: true,
    duplicateRisk: true,
    artifact: {
      target: 'local_file',
      mediaType: 'text/calendar;charset=utf-8',
      filename: 'flow-a.ics',
      payloadHash: 'deadbeef',
      payloadByteLength: 128,
      outputCount: 4,
    },
  };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  let writeCount = 0;
  let removeCount = 0;
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      writeCount += 1;
      values.set(key, value);
    },
    removeItem(key: string) {
      removeCount += 1;
      values.delete(key);
    },
    counts() {
      return { writeCount, removeCount };
    },
    snapshot() {
      return Object.fromEntries(values);
    },
  };
}

test('empty, malformed, and unsupported reads never write or repair storage', () => {
  const empty = memoryStorage();
  const emptyRead = readFlowExportReceiptRegistry(empty);
  assert.equal(emptyRead.status, 'empty');
  assert.deepEqual(empty.counts(), { writeCount: 0, removeCount: 0 });

  for (const raw of [
    '{not-json',
    JSON.stringify({ schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION, receipts: [{}] }),
    JSON.stringify({ schemaVersion: 99, receipts: [] }),
  ]) {
    const storage = memoryStorage({ [FLOW_EXPORT_RECEIPTS_STORAGE_KEY]: raw });
    const before = storage.snapshot();
    const read = readFlowExportReceiptRegistry(storage);
    assert.ok(read.status === 'malformed' || read.status === 'unsupported');
    assert.deepEqual(storage.snapshot(), before);
    assert.deepEqual(storage.counts(), { writeCount: 0, removeCount: 0 });

    const blocked = appendFlowExportReceipt(storage, buildReceipt());
    assert.equal(blocked.status, 'blocked');
    assert.deepEqual(storage.snapshot(), before);
    assert.deepEqual(storage.counts(), { writeCount: 0, removeCount: 0 });
  }
});

test('pre-lineage v1 receipts remain readable without migration or storage writes', () => {
  const legacyReceipt = buildReceipt();
  const raw = JSON.stringify({
    schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
    receipts: [legacyReceipt],
  });
  const storage = memoryStorage({ [FLOW_EXPORT_RECEIPTS_STORAGE_KEY]: raw });

  const read = readFlowExportReceiptRegistry(storage);

  assert.equal(read.status, 'valid');
  assert.equal(read.raw, raw);
  assert.equal(read.registry?.receipts[0]?.countUnits, undefined);
  assert.equal(read.registry?.receipts[0]?.artifact.itemIds, undefined);
  assert.equal(read.registry?.receipts[0]?.artifact.itemCount, undefined);
  assert.equal(storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY), raw);
  assert.deepEqual(storage.counts(), { writeCount: 0, removeCount: 0 });
});

test('rollback-safe XLSX v1 receipt round-trips without new persistent transport fields', () => {
  const legacyReceipt = buildReceipt({ receiptId: 'legacy-text-receipt' });
  const binaryReceipt: ResultTransferPersistentReceipt = {
    ...buildReceipt({ receiptId: 'binary-xlsx-receipt' }),
    format: 'sheet',
    artifactKind: 'tabular_sheet',
    projectionOutputCount: 2,
    outputCount: 2,
    countUnits: {
      itemCount: 'item',
      projectionOutputCount: 'projection_output',
      outputCount: 'artifact_output',
    },
    artifact: {
      target: 'local_file',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: '사본-1-이사-D-30-준비.xlsx',
      payloadHash: 'a'.repeat(64),
      payloadByteLength: 4096,
      itemIds: ['item-a', 'item-b'],
      itemCount: 2,
      outputCount: 2,
    },
  };
  const legacyRaw = JSON.stringify({
    schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
    receipts: [legacyReceipt],
  });
  const storage = memoryStorage({ [FLOW_EXPORT_RECEIPTS_STORAGE_KEY]: legacyRaw });

  assert.equal(readFlowExportReceiptRegistry(storage).status, 'valid');
  assert.equal(storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY), legacyRaw);
  assert.deepEqual(storage.counts(), { writeCount: 0, removeCount: 0 });
  assert.equal(appendFlowExportReceipt(storage, binaryReceipt).status, 'stored');

  const rawAfterAppend = storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY);
  const read = readFlowExportReceiptRegistry(storage);
  assert.equal(read.status, 'valid');
  if (read.status !== 'valid') return;
  assert.equal(read.raw, rawAfterAppend);
  assert.equal(read.registry.schemaVersion, 1);
  assert.deepEqual(read.registry.receipts, [legacyReceipt, binaryReceipt]);
  assert.equal(read.registry.receipts[0]?.artifact.payloadEncoding, undefined);
  assert.equal(read.registry.receipts[1]?.artifact.payloadEncoding, undefined);
  assert.equal(read.registry.receipts[1]?.artifact.textEncoding, undefined);
  assert.deepEqual(storage.counts(), { writeCount: 1, removeCount: 0 });

  const invalidMixedEncoding = {
    ...binaryReceipt,
    receiptId: 'binary-invalid-mixed-encoding',
    requestId: 'binary-invalid-mixed-encoding',
    artifact: {
      ...binaryReceipt.artifact,
      textEncoding: 'utf-8',
    },
  };
  const blocked = appendFlowExportReceipt(storage, invalidMixedEncoding as never);
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.reason, 'invalid_receipt');
  assert.equal(storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY), rawAfterAppend);
});

test('append is durable, deeply frozen on read, and indexed by saved plan identity', () => {
  const storage = memoryStorage();
  const first = buildReceipt();
  const second = buildReceipt({
    receiptId: 'receipt-b',
    savedPlanId: 'saved-plan-b',
  });

  assert.equal(appendFlowExportReceipt(storage, first).status, 'stored');
  assert.equal(appendFlowExportReceipt(storage, second).status, 'stored');
  const read = readFlowExportReceiptRegistry(storage);
  assert.equal(read.status, 'valid');
  if (read.status !== 'valid') return;
  assert.equal(read.registry.receipts.length, 2);
  assert.equal(Object.isFrozen(read.registry), true);
  assert.equal(Object.isFrozen(read.registry.receipts), true);
  assert.equal(Object.isFrozen(read.registry.receipts[0]?.snapshot.identity), true);
  assert.deepEqual(
    getFlowExportReceiptsForSavedPlan(storage, 'saved-plan-a').map((entry) => entry.receiptId),
    ['receipt-a'],
  );
  assert.deepEqual(
    getFlowExportReceiptsForFlow(storage, 'flow-a').map((entry) => entry.receiptId),
    ['receipt-a', 'receipt-b'],
  );
});

test('lineage-complete v1 receipt persists payload identity and distinct count units exactly', () => {
  const legacyShape = buildReceipt({ receiptId: 'receipt-lineage' });
  const receipt: ResultTransferPersistentReceipt = {
    ...legacyShape,
    countUnits: {
      itemCount: 'item',
      projectionOutputCount: 'projection_output',
      outputCount: 'artifact_output',
    },
    artifact: {
      ...legacyShape.artifact,
      itemIds: [...legacyShape.itemIds],
      itemCount: legacyShape.itemCount,
    },
  };
  const storage = memoryStorage();

  assert.equal(appendFlowExportReceipt(storage, receipt).status, 'stored');
  const read = readFlowExportReceiptRegistry(storage);
  assert.equal(read.status, 'valid');
  if (read.status !== 'valid') return;
  assert.deepEqual(read.registry.receipts, [receipt]);
  assert.deepEqual(read.registry.receipts[0]?.countUnits, receipt.countUnits);
  assert.deepEqual(read.registry.receipts[0]?.artifact.itemIds, receipt.itemIds);
  assert.equal(read.registry.receipts[0]?.artifact.itemCount, receipt.itemCount);
  assert.equal(read.registry.receipts[0]?.artifact.payloadHash, receipt.artifact.payloadHash);
  assert.equal(
    read.registry.receipts[0]?.artifact.payloadByteLength,
    receipt.artifact.payloadByteLength,
  );
});

test('internally inconsistent optional lineage is blocked without writing storage', () => {
  const base = buildReceipt({ receiptId: 'receipt-invalid-lineage' });
  const inconsistent: ResultTransferPersistentReceipt = {
    ...base,
    artifact: {
      ...base.artifact,
      itemIds: ['different-item'],
      itemCount: 1,
    },
  };
  const storage = memoryStorage();

  const result = appendFlowExportReceipt(storage, inconsistent);

  assert.equal(result.status, 'blocked');
  assert.equal(result.reason, 'invalid_receipt');
  assert.deepEqual(storage.counts(), { writeCount: 0, removeCount: 0 });
  assert.equal(storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY), null);
});

test('append preserves every historical receipt without a silent retention cap', () => {
  const storage = memoryStorage();
  const receiptIds = Array.from({ length: 128 }, (_, index) => `receipt-${index + 1}`);

  for (const receiptId of receiptIds) {
    assert.equal(appendFlowExportReceipt(storage, buildReceipt({ receiptId })).status, 'stored');
  }

  const read = readFlowExportReceiptRegistry(storage);
  assert.equal(read.status, 'valid');
  if (read.status !== 'valid') return;
  assert.deepEqual(
    read.registry.receipts.map((receipt) => receipt.receiptId),
    receiptIds,
  );
});

test('same receipt is idempotent while a conflicting receipt ID is blocked without writes', () => {
  const receipt = buildReceipt();
  const initialRaw = JSON.stringify({
    schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
    receipts: [receipt],
  });
  const storage = memoryStorage({ [FLOW_EXPORT_RECEIPTS_STORAGE_KEY]: initialRaw });

  const duplicate = appendFlowExportReceipt(storage, receipt);
  assert.equal(duplicate.status, 'duplicate');
  assert.deepEqual(storage.counts(), { writeCount: 0, removeCount: 0 });

  const conflict = appendFlowExportReceipt(storage, {
    ...receipt,
    completedAt: '2026-08-04T01:02:00.000Z',
  });
  assert.equal(conflict.status, 'blocked');
  assert.equal(conflict.reason, 'receipt_id_conflict');
  assert.equal(storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY), initialRaw);
  assert.deepEqual(storage.counts(), { writeCount: 0, removeCount: 0 });
});

test('write failure and readback mismatch restore the exact prior raw registry', () => {
  const priorReceipt = buildReceipt({ receiptId: 'receipt-prior' });
  const priorRaw = JSON.stringify({
    schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
    receipts: [priorReceipt],
  });

  for (const mode of ['throw_after_mutation', 'readback_mismatch'] as const) {
    const base = memoryStorage({ [FLOW_EXPORT_RECEIPTS_STORAGE_KEY]: priorRaw });
    let firstWrite = true;
    let mismatchedReadbacksRemaining = 0;
    const storage: FlowExportReceiptStorage = {
      getItem(key) {
        if (mismatchedReadbacksRemaining > 0) {
          mismatchedReadbacksRemaining -= 1;
          return 'mismatched-readback';
        }
        return base.getItem(key);
      },
      setItem(key, value) {
        base.setItem(key, value);
        if (firstWrite) {
          firstWrite = false;
          if (mode === 'throw_after_mutation') throw new Error('quota after mutation');
          mismatchedReadbacksRemaining = 1;
        }
      },
      removeItem(key) {
        base.removeItem(key);
      },
    };

    const result = appendFlowExportReceipt(storage, buildReceipt({ receiptId: `receipt-${mode}` }));
    assert.equal(result.status, 'failed');
    assert.equal(result.rollbackComplete, true);
    assert.equal(base.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY), priorRaw);
    assert.equal(result.rawBefore, priorRaw);
    assert.equal(result.rawAfter, priorRaw);
  }
});

test('failed receipt append does not roll back over a concurrent registry replacement', () => {
  const priorReceipt = buildReceipt({ receiptId: 'receipt-prior' });
  const otherReceipt = buildReceipt({ receiptId: 'receipt-other' });
  const priorRaw = JSON.stringify({
    schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
    receipts: [priorReceipt],
  });
  const otherRaw = JSON.stringify({
    schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
    receipts: [priorReceipt, otherReceipt],
  });
  const base = memoryStorage({ [FLOW_EXPORT_RECEIPTS_STORAGE_KEY]: priorRaw });
  let firstWrite = true;
  const storage: FlowExportReceiptStorage = {
    getItem: (key) => base.getItem(key),
    setItem(key, value) {
      base.setItem(key, value);
      if (firstWrite) {
        firstWrite = false;
        base.setItem(key, otherRaw);
        throw new Error('write failed after another tab replaced the registry');
      }
    },
    removeItem: (key) => base.removeItem(key),
  };

  const result = appendFlowExportReceipt(storage, buildReceipt({ receiptId: 'receipt-current' }));
  assert.equal(result.status, 'failed');
  assert.equal(result.rollbackComplete, false);
  assert.equal(base.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY), otherRaw);
});

test('archiving a saved plan retains its historical receipts until explicit permanent cleanup', () => {
  const storage = memoryStorage({
    'flow:saved:saved-plan-a': '{"slug":"saved-plan-a"}',
    'flow:my-flow:lifecycle:v1': '{"saved-plan-a":"active"}',
  });
  assert.equal(appendFlowExportReceipt(storage, buildReceipt()).status, 'stored');
  const receiptRaw = storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY);

  storage.setItem('flow:my-flow:lifecycle:v1', '{"saved-plan-a":"archived"}');

  assert.equal(storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY), receiptRaw);
  assert.equal(getFlowExportReceiptsForSavedPlan(storage, 'saved-plan-a').length, 1);
});

test('explicit permanent cleanup removes only the matching saved plan receipts', () => {
  const storage = memoryStorage();
  const receipts = [
    buildReceipt({ receiptId: 'a-1', savedPlanId: 'saved-plan-a' }),
    buildReceipt({ receiptId: 'b-1', savedPlanId: 'saved-plan-b' }),
    buildReceipt({ receiptId: 'a-2', savedPlanId: 'saved-plan-a' }),
  ];
  receipts.forEach((receipt) => assert.equal(appendFlowExportReceipt(storage, receipt).status, 'stored'));

  const result = removeFlowExportReceiptsForSavedPlan(storage, 'saved-plan-a');
  assert.equal(result.status, 'removed');
  assert.deepEqual(result.removedReceiptIds, ['a-1', 'a-2']);
  assert.equal(result.removedCount, 2);
  assert.deepEqual(
    readFlowExportReceiptRegistry(storage).registry?.receipts.map((receipt) => receipt.receiptId),
    ['b-1'],
  );
  assert.equal(removeFlowExportReceiptsForSavedPlan(storage, 'saved-plan-a').status, 'not_found');

  const final = removeFlowExportReceiptsForSavedPlan(storage, 'saved-plan-b');
  assert.equal(final.status, 'removed');
  assert.equal(storage.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY), null);
});

test('permanent cleanup blocks malformed input and restores exact raw bytes after write failure', () => {
  const malformed = memoryStorage({ [FLOW_EXPORT_RECEIPTS_STORAGE_KEY]: '{broken' });
  const malformedBefore = malformed.snapshot();
  assert.equal(removeFlowExportReceiptsForSavedPlan(malformed, 'saved-plan-a').status, 'blocked');
  assert.deepEqual(malformed.snapshot(), malformedBefore);
  assert.deepEqual(malformed.counts(), { writeCount: 0, removeCount: 0 });
  assert.equal(removeFlowExportReceiptsForSavedPlan(malformed, ' ').status, 'blocked');

  const receiptA = buildReceipt({ receiptId: 'a-1', savedPlanId: 'saved-plan-a' });
  const receiptB = buildReceipt({ receiptId: 'b-1', savedPlanId: 'saved-plan-b' });
  const priorRaw = JSON.stringify({
    schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
    receipts: [receiptA, receiptB],
  });
  const base = memoryStorage({ [FLOW_EXPORT_RECEIPTS_STORAGE_KEY]: priorRaw });
  let firstWrite = true;
  const storage: FlowExportReceiptStorage = {
    getItem: (key) => base.getItem(key),
    setItem(key, value) {
      base.setItem(key, value);
      if (firstWrite) {
        firstWrite = false;
        throw new Error('quota after mutation');
      }
    },
    removeItem: (key) => base.removeItem(key),
  };
  const failed = removeFlowExportReceiptsForSavedPlan(storage, 'saved-plan-a');
  assert.equal(failed.status, 'failed');
  assert.equal(failed.rollbackComplete, true);
  assert.equal(base.getItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY), priorRaw);
});

test('permanent cleanup returns a typed retryable failure when the receipt registry read throws', () => {
  let setCalls = 0;
  let removeCalls = 0;
  const storage: FlowExportReceiptStorage = {
    getItem() {
      throw new DOMException('receipt storage is unavailable', 'SecurityError');
    },
    setItem() {
      setCalls += 1;
    },
    removeItem() {
      removeCalls += 1;
    },
  };

  const result = removeFlowExportReceiptsForSavedPlan(storage, 'saved-plan-a');

  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'read_failed');
  assert.equal(result.savedPlanId, 'saved-plan-a');
  assert.deepEqual(result.removedReceiptIds, []);
  assert.equal(result.removedCount, 0);
  assert.match(result.message ?? '', /receipt storage is unavailable/u);
  assert.equal(setCalls, 0);
  assert.equal(removeCalls, 0);
});

test('serialized permanent cleanup preserves a receipt appended by another tab before removing its plan', async () => {
  const storage = memoryStorage();
  const receiptA = buildReceipt({ receiptId: 'a-1', savedPlanId: 'saved-plan-a' });
  const receiptB1 = buildReceipt({ receiptId: 'b-1', savedPlanId: 'saved-plan-b' });
  const receiptB2 = buildReceipt({ receiptId: 'b-2', savedPlanId: 'saved-plan-b' });
  assert.equal(appendFlowExportReceipt(storage, receiptA).status, 'stored');
  assert.equal(appendFlowExportReceipt(storage, receiptB1).status, 'stored');

  let announceSnapshotRead: () => void = () => undefined;
  const snapshotRead = new Promise<void>((resolve) => {
    announceSnapshotRead = resolve;
  });
  let releaseAppend: () => void = () => undefined;
  const appendMayWrite = new Promise<void>((resolve) => {
    releaseAppend = resolve;
  });

  const appendInAnotherTab = withStorageWriteLock(
    FLOW_EXPORT_RECEIPT_WRITE_LOCK,
    async () => {
      const current = readFlowExportReceiptRegistry(storage);
      assert.ok(current.registry);
      announceSnapshotRead();
      await appendMayWrite;
      storage.setItem(FLOW_EXPORT_RECEIPTS_STORAGE_KEY, JSON.stringify({
        schemaVersion: FLOW_EXPORT_RECEIPTS_SCHEMA_VERSION,
        receipts: [...current.registry.receipts, receiptB2],
      }));
    },
  );

  await snapshotRead;
  const cleanup = removeFlowExportReceiptsForSavedPlanSerialized(storage, 'saved-plan-a');
  releaseAppend();

  assert.equal((await appendInAnotherTab).ok, true);
  const cleanupResult = await cleanup;
  assert.equal(cleanupResult.status, 'removed');
  assert.deepEqual(
    readFlowExportReceiptRegistry(storage).registry?.receipts.map((receipt) => receipt.receiptId),
    ['b-1', 'b-2'],
  );
});
