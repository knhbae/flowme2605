import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_SCHEMA_VERSION,
  FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY,
  clearFlowExportReceiptCleanupJournal,
  markFlowExportReceiptCleanupRequired,
  normalizeFlowExportReceiptCleanupJournal,
  prepareFlowExportReceiptCleanupJournal,
  readFlowExportReceiptCleanupJournal,
} from './export-receipt-cleanup-journal';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  let mutations = 0;
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      mutations += 1;
      values.set(key, value);
    },
    removeItem(key: string) {
      mutations += 1;
      values.delete(key);
    },
    raw(key = FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY) {
      return values.get(key) ?? null;
    },
    mutationCount() {
      return mutations;
    },
  };
}

test('prepared deletion advances to reload-safe cleanup-required and clears only after success', () => {
  const storage = memoryStorage({ foreign: 'preserve' });
  const prepared = prepareFlowExportReceiptCleanupJournal(storage, {
    savedPlanId: 'moving-d30-basic',
    flowTitle: '이사 준비',
  });
  assert.equal(prepared.status, 'stored');
  assert.equal(prepared.journal?.phase, 'prepared');

  const required = markFlowExportReceiptCleanupRequired(storage, 'moving-d30-basic');
  assert.equal(required.status, 'stored');
  assert.equal(required.journal?.phase, 'cleanup_required');
  assert.deepEqual(readFlowExportReceiptCleanupJournal(storage), {
    status: 'valid',
    journal: required.journal,
    raw: storage.raw(),
  });

  assert.deepEqual(clearFlowExportReceiptCleanupJournal(storage, 'moving-d30-basic'), {
    status: 'cleared',
  });
  assert.equal(storage.raw(), null);
  assert.equal(storage.raw('foreign'), 'preserve');
});

test('a different pending cleanup blocks another plan and exact clear cannot remove it', () => {
  const storage = memoryStorage();
  prepareFlowExportReceiptCleanupJournal(storage, {
    savedPlanId: 'plan-a',
    flowTitle: '계획 A',
  });
  markFlowExportReceiptCleanupRequired(storage, 'plan-a');
  const before = storage.raw();

  assert.equal(prepareFlowExportReceiptCleanupJournal(storage, {
    savedPlanId: 'plan-b',
    flowTitle: '계획 B',
  }).status, 'blocked');
  assert.equal(clearFlowExportReceiptCleanupJournal(storage, 'plan-b').status, 'blocked');
  assert.equal(storage.raw(), before);
});

test('malformed and unsupported journals fail closed without a storage mutation', () => {
  for (const raw of [
    '{malformed',
    JSON.stringify({
      schemaVersion: 99,
      phase: 'cleanup_required',
      savedPlanId: 'plan-a',
      flowTitle: '계획 A',
    }),
  ]) {
    const storage = memoryStorage({
      [FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY]: raw,
    });
    const read = readFlowExportReceiptCleanupJournal(storage);
    assert.ok(read.status === 'malformed' || read.status === 'unsupported');
    assert.equal(markFlowExportReceiptCleanupRequired(storage, 'plan-a').status, 'blocked');
    assert.equal(clearFlowExportReceiptCleanupJournal(storage, 'plan-a').status, 'blocked');
    assert.equal(storage.mutationCount(), 0);
    assert.equal(storage.raw(), raw);
  }
});

test('storage access failures are explicit and never coerce a journal', () => {
  const denied = {
    getItem() {
      throw new DOMException('blocked', 'SecurityError');
    },
    setItem() {
      throw new DOMException('blocked', 'SecurityError');
    },
    removeItem() {
      throw new DOMException('blocked', 'SecurityError');
    },
  };
  assert.equal(readFlowExportReceiptCleanupJournal(denied).status, 'failed');
  assert.equal(prepareFlowExportReceiptCleanupJournal(denied, {
    savedPlanId: 'plan-a',
    flowTitle: '계획 A',
  }).status, 'failed');
  assert.equal(clearFlowExportReceiptCleanupJournal(denied, 'plan-a').status, 'failed');
});

test('normalization rejects extra fields, unsupported phases, hostile objects, and invalid text', () => {
  const valid = {
    schemaVersion: FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_SCHEMA_VERSION,
    phase: 'cleanup_required',
    savedPlanId: 'plan-a',
    flowTitle: '계획 A',
  } as const;
  assert.deepEqual(normalizeFlowExportReceiptCleanupJournal(valid), valid);
  assert.equal(normalizeFlowExportReceiptCleanupJournal({ ...valid, extra: true }), undefined);
  assert.equal(normalizeFlowExportReceiptCleanupJournal({ ...valid, phase: 'done' }), undefined);
  assert.equal(normalizeFlowExportReceiptCleanupJournal({ ...valid, savedPlanId: ' plan-a' }), undefined);
  assert.equal(normalizeFlowExportReceiptCleanupJournal({ ...valid, flowTitle: '' }), undefined);
  const hostile = new Proxy({}, {
    getPrototypeOf() {
      throw new Error('hostile');
    },
  });
  assert.doesNotThrow(() => normalizeFlowExportReceiptCleanupJournal(hostile));
  assert.equal(normalizeFlowExportReceiptCleanupJournal(hostile), undefined);
});
