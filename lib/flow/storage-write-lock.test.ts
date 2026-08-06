import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FLOW_EXPORT_RECEIPT_WRITE_LOCK,
  FLOW_USER_DATA_WRITE_LOCK,
  getFlowMapSaveWriteLockName,
  withFlowUserDataWriteLock,
  withStorageWriteLock,
  type StorageWriteLockManager,
} from './storage-write-lock';

test('receipts and Plan or Map data share one global mutation lock', async () => {
  assert.equal(FLOW_EXPORT_RECEIPT_WRITE_LOCK, FLOW_USER_DATA_WRITE_LOCK);
  assert.equal(getFlowMapSaveWriteLockName('map-1'), FLOW_USER_DATA_WRITE_LOCK);
  const order: string[] = [];
  let releasePlan: () => void = () => undefined;
  const planGate = new Promise<void>((resolve) => {
    releasePlan = resolve;
  });

  const planWrite = withFlowUserDataWriteLock(async () => {
    order.push('plan:start');
    await planGate;
    order.push('plan:end');
  });
  await Promise.resolve();
  const receiptWrite = withStorageWriteLock(FLOW_EXPORT_RECEIPT_WRITE_LOCK, () => {
    order.push('receipt');
  });
  await Promise.resolve();

  assert.deepEqual(order, ['plan:start']);
  releasePlan();
  const outcomes = await Promise.all([planWrite, receiptWrite]);
  assert.equal(outcomes.every((outcome) => outcome.ok), true);
  assert.deepEqual(order, ['plan:start', 'plan:end', 'receipt']);
});

test('storage write lock serializes same-name operations in non-browser contract tests', async () => {
  const order: string[] = [];
  let releaseFirst: () => void = () => undefined;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = withStorageWriteLock('receipt-registry', async () => {
    order.push('first:start');
    await firstGate;
    order.push('first:end');
  });
  await Promise.resolve();
  const second = withStorageWriteLock('receipt-registry', () => {
    order.push('second');
  });
  await Promise.resolve();

  assert.deepEqual(order, ['first:start']);
  releaseFirst();
  const outcomes = await Promise.all([first, second]);
  assert.equal(outcomes.every((outcome) => outcome.ok), true);
  assert.deepEqual(order, ['first:start', 'first:end', 'second']);
});

test('storage write lock fails closed when lock acquisition fails', async () => {
  let operationCalls = 0;
  const lockManager: StorageWriteLockManager = {
    async request() {
      throw new Error('locks unavailable');
    },
  };
  const outcome = await withStorageWriteLock(
    'flow-map',
    () => {
      operationCalls += 1;
    },
    lockManager,
  );

  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok ? '' : outcome.reason, 'lock_failed');
  assert.equal(operationCalls, 0);
});
