import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_RECEIPT_VERSION,
  createPersonalWorkspacePocReceipt,
  transitionPersonalWorkspacePocReceipt,
  type PersonalWorkspacePocReceipt,
  type PersonalWorkspacePocReceiptStatus,
} from './personal-workspace-poc-receipt';

const BEFORE = '2026-09-02';
const AFTER = '2026-09-03';

function inputFor(
  status: PersonalWorkspacePocReceiptStatus,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const common: Record<string, unknown> = {
    receiptId: `receipt-${status}`,
    intentId: 'intent-move-date',
    operation: 'move-date',
    status,
    createdAt: '2026-09-02T01:00:00.000Z',
    scopeRef: 'flow-item:copy-a:flow-a:item-a',
    affectedRefs: ['flow-item:copy-a:flow-a:item-a'],
    affectedCount: 1,
    stateRevisionBefore: 4,
    stateRevisionAfter: 4,
    changes: [{
      owner: 'execution',
      field: 'executionDate',
      label: '실행 날짜',
      before: BEFORE,
      after: AFTER,
    }],
    targetWriteCount: 0,
    supportWriteCount: 0,
    rollback: 'not-needed',
  };

  if (status === 'success') {
    Object.assign(common, {
      stateRevisionAfter: 5,
      targetWriteCount: 1,
      supportWriteCount: 4,
      undoLabel: '실행 날짜 이동 되돌리기',
    });
  } else if (status === 'noop') {
    common.changes = [{
      owner: 'execution',
      field: 'executionDate',
      label: '실행 날짜',
      before: BEFORE,
      after: BEFORE,
    }];
  } else if (status === 'failure') {
    Object.assign(common, {
      retryIntent: {
        kind: 'move-date',
        parameters: {
          itemRef: 'flow-item:copy-a:flow-a:item-a',
          date: AFTER,
          expectedRevision: 4,
        },
      },
      errorCode: 'storage_error',
    });
  } else if (status === 'canceled') {
    Object.assign(common, {
      affectedRefs: [],
      affectedCount: 0,
      changes: [],
      returnContext: 'period-list',
    });
  } else if (status === 'undone') {
    Object.assign(common, {
      stateRevisionBefore: 5,
      stateRevisionAfter: 6,
      changes: [{
        owner: 'execution',
        field: 'executionDate',
        label: '실행 날짜',
        before: AFTER,
        after: BEFORE,
      }],
      targetWriteCount: 1,
      supportWriteCount: 4,
      undoLabel: '실행 날짜 이동 전으로 복원',
      undoOfReceiptId: 'receipt-success',
    });
  }

  return { ...common, ...overrides };
}

function readyReceipt(input: unknown): PersonalWorkspacePocReceipt {
  const result = createPersonalWorkspacePocReceipt(input);
  if ('error' in result) assert.fail(result.error);
  return result.receipt;
}

test('creates all six visible states with concrete owner, values, refs, revisions, and counts', async (t) => {
  const statuses = [
    'saving',
    'success',
    'noop',
    'failure',
    'canceled',
    'undone',
  ] as const;

  for (const status of statuses) {
    await t.test(status, () => {
      const receipt = readyReceipt(inputFor(status));
      assert.equal(receipt.version, PERSONAL_WORKSPACE_POC_RECEIPT_VERSION);
      assert.equal(receipt.receiptId, `receipt-${status}`);
      assert.equal(receipt.status, status);
      assert.equal(receipt.affectedCount, receipt.affectedRefs.length);
      assert.doesNotThrow(() => JSON.stringify(receipt));
      assert.equal(Object.isFrozen(receipt), true);
      assert.equal(Object.isFrozen(receipt.changes), true);
      if (receipt.changes[0]) {
        assert.deepEqual(receipt.changes[0], {
          owner: 'execution',
          field: 'executionDate',
          label: '실행 날짜',
          before: status === 'undone' ? AFTER : BEFORE,
          after: status === 'noop' ? BEFORE : status === 'undone' ? BEFORE : AFTER,
        });
      }
      if (receipt.status === 'failure') {
        assert.equal(Object.isFrozen(receipt.retryIntent.parameters), true);
      }
    });
  }
});

test('canceled receipt exposes discarded draft values and a bounded return context with zero writes', () => {
  const canceled = createPersonalWorkspacePocReceipt(inputFor('canceled', {
    affectedRefs: ['flow-item:copy-a:flow-a:item-a'],
    affectedCount: 1,
    changes: [{
      owner: 'poc-personal-plan',
      field: 'item.title',
      label: '개인 Item 제목',
      before: '원본 제목',
      after: '버린 제목',
    }],
    returnContext: 'parent-plan',
  }));
  assert.equal(canceled.ok, true);
  if (canceled.ok && canceled.receipt.status === 'canceled') {
    assert.equal(canceled.receipt.returnContext, 'parent-plan');
    assert.equal(canceled.receipt.targetWriteCount, 0);
    assert.equal(canceled.receipt.changes[0].after, '버린 제목');
  }

  assert.deepEqual(createPersonalWorkspacePocReceipt(inputFor('canceled', {
    returnContext: 'raw-selector',
  })), { ok: false, error: 'invalid-return-context' });
});

test('receipt ids are exact caller input and are never generated or rewritten', () => {
  const first = readyReceipt(inputFor('saving', { receiptId: 'caller-sequence-0042' }));
  const second = readyReceipt(inputFor('saving', { receiptId: 'caller-sequence-0042' }));
  assert.equal(first.receiptId, 'caller-sequence-0042');
  assert.deepEqual(first, second);

  const missing = inputFor('saving');
  delete missing.receiptId;
  assert.deepEqual(createPersonalWorkspacePocReceipt(missing), {
    ok: false,
    error: 'invalid-receipt-id',
  });
});

test('saving settles to success only for the same attempt and exact predicted changes', () => {
  const saving = readyReceipt(inputFor('saving'));
  const result = transitionPersonalWorkspacePocReceipt(
    saving,
    inputFor('success', {
      receiptId: 'receipt-success-after-saving',
      createdAt: '2026-09-02T01:00:01.000Z',
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.receipt.status, 'success');
    assert.equal(result.receipt.stateRevisionAfter, 5);
    assert.equal(result.receipt.targetWriteCount, 1);
    assert.equal(result.receipt.supportWriteCount, 4);
  }

  const changedIntent = transitionPersonalWorkspacePocReceipt(
    saving,
    inputFor('success', {
      receiptId: 'receipt-wrong-intent',
      intentId: 'intent-other',
    }),
  );
  assert.deepEqual(changedIntent, { ok: false, error: 'receipt-intent-mismatch' });

  const changedPrediction = inputFor('success', {
    receiptId: 'receipt-wrong-change',
  });
  changedPrediction.changes = [{
    owner: 'execution',
    field: 'executionDate',
    label: '실행 날짜',
    before: BEFORE,
    after: '2026-09-04',
  }];
  assert.deepEqual(transitionPersonalWorkspacePocReceipt(saving, changedPrediction), {
    ok: false,
    error: 'receipt-attempt-mismatch',
  });
});

test('failure preserves a serializable intent and retry returns to saving without changing it', () => {
  const saving = readyReceipt(inputFor('saving'));
  const failureResult = transitionPersonalWorkspacePocReceipt(
    saving,
    inputFor('failure', {
      receiptId: 'receipt-failure-after-saving',
      createdAt: '2026-09-02T01:00:01.000Z',
      supportWriteCount: 4,
      rollback: 'complete',
    }),
  );
  assert.equal(failureResult.ok, true);
  if (!failureResult.ok || failureResult.receipt.status !== 'failure') return;
  assert.deepEqual(failureResult.receipt.retryIntent, {
    kind: 'move-date',
    parameters: {
      itemRef: 'flow-item:copy-a:flow-a:item-a',
      date: AFTER,
      expectedRevision: 4,
    },
  });

  const retry = transitionPersonalWorkspacePocReceipt(
    failureResult.receipt,
    inputFor('saving', {
      receiptId: 'receipt-saving-retry',
      createdAt: '2026-09-02T01:00:02.000Z',
    }),
  );
  assert.equal(retry.ok, true);
  if (retry.ok) assert.equal(retry.receipt.status, 'saving');
});

test('recovery-required failure cannot retry or dismiss before storage recovery completes', () => {
  const failure = readyReceipt(inputFor('failure', {
    receiptId: 'receipt-recovery-required',
    supportWriteCount: 3,
    rollback: 'recovery-required',
  }));
  assert.deepEqual(transitionPersonalWorkspacePocReceipt(
    failure,
    inputFor('saving', {
      receiptId: 'receipt-unsafe-retry',
      createdAt: '2026-09-02T01:00:02.000Z',
    }),
  ), { ok: false, error: 'receipt-recovery-must-complete' });
  assert.deepEqual(transitionPersonalWorkspacePocReceipt(
    failure,
    inputFor('canceled', {
      receiptId: 'receipt-unsafe-dismiss',
      createdAt: '2026-09-02T01:00:02.000Z',
    }),
  ), { ok: false, error: 'receipt-recovery-must-complete' });
});

test('success transitions to one exact inverse Undo receipt with a new revision', () => {
  const success = readyReceipt(inputFor('success'));
  const undone = transitionPersonalWorkspacePocReceipt(
    success,
    inputFor('undone', {
      receiptId: 'receipt-undone-after-success',
      createdAt: '2026-09-02T01:00:02.000Z',
    }),
  );
  assert.equal(undone.ok, true);
  if (undone.ok && undone.receipt.status === 'undone') {
    assert.equal(undone.receipt.undoOfReceiptId, success.receiptId);
    assert.equal(undone.receipt.stateRevisionBefore, success.stateRevisionAfter);
    assert.equal(undone.receipt.stateRevisionAfter, success.stateRevisionAfter + 1);
    assert.deepEqual(undone.receipt.changes[0], {
      owner: 'execution',
      field: 'executionDate',
      label: '실행 날짜',
      before: AFTER,
      after: BEFORE,
    });
  }

  assert.deepEqual(transitionPersonalWorkspacePocReceipt(
    success,
    inputFor('undone', {
      receiptId: 'receipt-undone-wrong-link',
      undoOfReceiptId: 'some-other-receipt',
    }),
  ), { ok: false, error: 'invalid-undo-receipt' });
});

test('noop, canceled, and failure reject any target write', async (t) => {
  for (const status of ['noop', 'canceled', 'failure'] as const) {
    await t.test(status, () => {
      const result = createPersonalWorkspacePocReceipt(inputFor(status, {
        targetWriteCount: 1,
      }));
      assert.equal(result.ok, false);
      if (!result.ok) assert.match(result.error, /write-state/u);
    });
  }
});

test('success and undone require exactly one revision advance and at least one target write', async (t) => {
  for (const status of ['success', 'undone'] as const) {
    await t.test(`${status} unchanged revision`, () => {
      const before = status === 'success' ? 4 : 5;
      assert.equal(createPersonalWorkspacePocReceipt(inputFor(status, {
        stateRevisionAfter: before,
      })).ok, false);
    });
    await t.test(`${status} skipped revision`, () => {
      const before = status === 'success' ? 4 : 5;
      assert.equal(createPersonalWorkspacePocReceipt(inputFor(status, {
        stateRevisionAfter: before + 2,
      })).ok, false);
    });
    await t.test(`${status} missing target write`, () => {
      assert.equal(createPersonalWorkspacePocReceipt(inputFor(status, {
        targetWriteCount: 0,
      })).ok, false);
    });
    await t.test(`${status} can report an atomic second PoC target`, () => {
      assert.equal(createPersonalWorkspacePocReceipt(inputFor(status, {
        targetWriteCount: 2,
      })).ok, true);
    });
  }
});

test('failure distinguishes no-write, complete rollback, and recovery-required outcomes', () => {
  const beforeWrite = readyReceipt(inputFor('failure'));
  assert.equal(beforeWrite.status === 'failure' && beforeWrite.rollback, 'not-needed');

  const rolledBack = readyReceipt(inputFor('failure', {
    receiptId: 'receipt-failure-rolled-back',
    supportWriteCount: 4,
    rollback: 'complete',
  }));
  assert.equal(rolledBack.status === 'failure' && rolledBack.rollback, 'complete');

  const recovery = readyReceipt(inputFor('failure', {
    receiptId: 'receipt-failure-recovery',
    supportWriteCount: 3,
    rollback: 'recovery-required',
  }));
  assert.equal(recovery.status === 'failure' && recovery.rollback, 'recovery-required');

  assert.deepEqual(createPersonalWorkspacePocReceipt(inputFor('failure', {
    supportWriteCount: 2,
    rollback: 'not-needed',
  })), { ok: false, error: 'failure-rollback-required' });
  assert.deepEqual(createPersonalWorkspacePocReceipt(inputFor('failure', {
    supportWriteCount: 0,
    rollback: 'recovery-required',
  })), { ok: false, error: 'recovery-support-write-required' });
});

test('affected count and refs must agree and duplicate refs fail closed', () => {
  assert.deepEqual(createPersonalWorkspacePocReceipt(inputFor('saving', {
    affectedCount: 2,
  })), { ok: false, error: 'affected-count-mismatch' });
  assert.deepEqual(createPersonalWorkspacePocReceipt(inputFor('saving', {
    affectedRefs: [
      'flow-item:copy-a:flow-a:item-a',
      'flow-item:copy-a:flow-a:item-a',
    ],
    affectedCount: 2,
  })), { ok: false, error: 'duplicate-affected-ref' });
});

test('one owner field appears at most once in a receipt', () => {
  const duplicate = {
    owner: 'execution',
    field: 'executionDate',
    label: '실행 날짜',
    before: BEFORE,
    after: AFTER,
  };
  assert.deepEqual(createPersonalWorkspacePocReceipt(inputFor('saving', {
    changes: [duplicate, { ...duplicate }],
  })), { ok: false, error: 'duplicate-change-field' });
});

test('rawText is forbidden at receipt, change, and nested retry-intent boundaries', async (t) => {
  await t.test('top-level field', () => {
    assert.deepEqual(createPersonalWorkspacePocReceipt(inputFor('saving', {
      rawText: '# private source',
    })), { ok: false, error: 'unexpected-receipt-field' });
  });
  await t.test('change field', () => {
    assert.deepEqual(createPersonalWorkspacePocReceipt(inputFor('saving', {
      changes: [{
        owner: 'authoring-source',
        field: 'rawText',
        label: '원문',
        before: '',
        after: 'private source',
      }],
    })), { ok: false, error: 'raw-text-forbidden' });
  });
  await t.test('nested retry parameter', () => {
    assert.deepEqual(createPersonalWorkspacePocReceipt(inputFor('failure', {
      retryIntent: {
        kind: 'commit-authoring-handoff',
        parameters: { draft: { raw_text: '# private source' } },
      },
    })), { ok: false, error: 'raw-text-forbidden' });
  });
  await t.test('multiline display value', () => {
    const result = createPersonalWorkspacePocReceipt(inputFor('saving', {
      changes: [{
        owner: 'poc-personal-plan',
        field: 'memoSummary',
        label: '메모 요약',
        before: '',
        after: 'first line\nsecond line',
      }],
    }));
    assert.deepEqual(result, { ok: false, error: 'invalid-change-value' });
  });
});

test('retry intent rejects cycles, undefined, functions, non-finite numbers, and class objects', async (t) => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  const values: ReadonlyArray<readonly [string, unknown]> = [
    ['cycle', cyclic],
    ['undefined', { value: undefined }],
    ['function', { value: () => undefined }],
    ['infinity', { value: Number.POSITIVE_INFINITY }],
    ['date object', { value: new Date('2026-09-02T00:00:00.000Z') }],
    ['prototype key', JSON.parse('{"__proto__":{"polluted":true}}')],
  ];

  for (const [name, parameters] of values) {
    await t.test(name, () => {
      const result = createPersonalWorkspacePocReceipt(inputFor('failure', {
        retryIntent: { kind: 'move-date', parameters },
      }));
      assert.equal(result.ok, false);
      if (!result.ok) assert.match(result.error, /retry-intent/u);
    });
  }
});

test('read-only and ownerless layers cannot be claimed as mutable change owners', async (t) => {
  for (const owner of ['source', 'imported-personal', 'creator-public-export']) {
    await t.test(owner, () => {
      assert.deepEqual(createPersonalWorkspacePocReceipt(inputFor('saving', {
        changes: [{
          owner,
          field: 'title',
          label: '제목',
          before: '원본',
          after: '변경',
        }],
      })), { ok: false, error: 'invalid-change-owner' });
    });
  }
});

test('invalid current receipts and terminal-state transitions fail closed', () => {
  const corruptCurrent = {
    ...inputFor('success'),
    version: 99,
  };
  assert.deepEqual(transitionPersonalWorkspacePocReceipt(
    corruptCurrent,
    inputFor('undone'),
  ), { ok: false, error: 'unsupported-receipt-version' });

  const terminal = readyReceipt(inputFor('noop'));
  assert.deepEqual(transitionPersonalWorkspacePocReceipt(
    terminal,
    inputFor('saving', { receiptId: 'receipt-illegal-restart' }),
  ), { ok: false, error: 'invalid-receipt-transition' });
});
