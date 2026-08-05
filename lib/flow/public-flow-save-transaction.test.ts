import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPublicFlowSaveStorageKeyPlan,
  getPublicFlowAuthoringItemStates,
  inspectPublicFlowSavedCopies,
  isValidPublicFlowDateOverrideRecord,
  isValidPublicFlowItemDraftRecord,
  isValidPublicFlowItemStateRecord,
  mergePublicFlowAuthoringItemStates,
  PublicFlowSaveConflictError,
  readPublicFlowSaveJsonRecord,
  removeFlowScopedRecordEntries,
  runPublicFlowSaveTransaction,
  type PublicFlowSaveStorageKeyPlan,
  type PublicFlowSaveWrite,
} from './public-flow-save-transaction';

class InstrumentedStorage {
  private readonly values: Map<string, string>;
  private failingMutationCalls = new Set<number>();
  private failingRead?: { operation: 'length' | 'key' | 'getItem'; call: number };

  mutationCalls = 0;
  readCalls = {
    length: 0,
    key: 0,
    getItem: 0,
  };

  constructor(initial: Record<string, string> = {}) {
    this.values = new Map(Object.entries(initial));
  }

  get length(): number {
    this.beforeRead('length');
    return this.values.size;
  }

  key(index: number): string | null {
    this.beforeRead('key');
    return Array.from(this.values.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    this.beforeRead('getItem');
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.beforeMutation();
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.beforeMutation();
    this.values.delete(key);
  }

  resetMutations(failingMutationCalls: number[] = []): void {
    this.mutationCalls = 0;
    this.failingMutationCalls = new Set(failingMutationCalls);
  }

  resetReads(failingRead?: { operation: 'length' | 'key' | 'getItem'; call?: number }): void {
    this.readCalls = { length: 0, key: 0, getItem: 0 };
    this.failingRead = failingRead
      ? { operation: failingRead.operation, call: failingRead.call ?? 1 }
      : undefined;
  }

  snapshot(keys: readonly string[]): Record<string, string | null> {
    return Object.fromEntries(keys.map((key) => [key, this.getItem(key)]));
  }

  private beforeMutation(): void {
    this.mutationCalls += 1;
    if (!this.failingMutationCalls.delete(this.mutationCalls)) return;
    const error = new Error(`simulated mutation failure at ${this.mutationCalls}`);
    error.name = 'QuotaExceededError';
    throw error;
  }

  private beforeRead(operation: 'length' | 'key' | 'getItem'): void {
    this.readCalls[operation] += 1;
    if (
      this.failingRead?.operation !== operation
      || this.failingRead.call !== this.readCalls[operation]
    ) return;
    const error = new Error(`simulated ${operation} read failure at ${this.readCalls[operation]}`);
    error.name = 'SecurityError';
    throw error;
  }
}

const sourceFlowKey = 'public-flow:moving-d30';
const sourceFlowSlug = 'moving-d30';
const personalCopyKey = 'personal-flow:moving-d30:copy-1';
const requestId = 'save-request:moving-d30:1';

function savedRecordRaw(input: {
  copyKey?: string;
  sourceKey?: string;
  sourceSlug?: string;
  request?: string;
  savedAt?: string;
  title?: string;
} = {}): string {
  const copyKey = input.copyKey ?? personalCopyKey;
  return JSON.stringify({
    schemaVersion: 2,
    slug: copyKey,
    personalCopyKey: copyKey,
    sourceFlowKey: input.sourceKey ?? sourceFlowKey,
    sourceFlowSlug: input.sourceSlug ?? sourceFlowSlug,
    sourceVersion: 'source-v3',
    lastSaveRequestId: input.request ?? requestId,
    savedAt: input.savedAt ?? '2026-08-04T03:00:00.000Z',
    savedItemCount: 4,
    personalTitle: input.title ?? '내 이사 준비',
    selectedArtifactMode: 'checklist',
    dateIntent: 'undated',
  });
}

function transactionWrites(
  plan: PublicFlowSaveStorageKeyPlan,
  idempotencyKey = requestId,
): PublicFlowSaveWrite[] {
  return [
    { key: plan.itemDraftsKey, raw: '{"moving-d30::item-1":{"title":"새 제목"}}' },
    { key: plan.dateOverridesKey, raw: null },
    { key: plan.itemStateKey, raw: '{"item-1":{"personalExcluded":true}}' },
    { key: plan.anchorKey, raw: '{"mode":"custom","anchor":"2026-08-10"}' },
    { key: plan.canonicalOriginKey, raw: '{"flow":{"source":"public"}}' },
    { key: plan.lastVisitKey, raw: '2026-08-04T03:00:00.000Z' },
    { key: plan.savedRecordKey, raw: savedRecordRaw({ request: idempotencyKey }) },
  ];
}

function rollbackSeed(plan: PublicFlowSaveStorageKeyPlan): Record<string, string> {
  return {
    [plan.itemDraftsKey]: '{ "raw" : "old drafts" }',
    [plan.itemStateKey]: '{"item-1":{"skipped":true,"note":"keep exactly"}}',
    [plan.canonicalOriginKey]: '{\n  "old": true\n}',
    [plan.lastVisitKey]: 'old-visit-without-normalization',
    [plan.savedRecordKey]: savedRecordRaw({
      request: 'previous-request',
      savedAt: '2026-08-01T01:02:03.000Z',
    }),
  };
}

test('public Flow save key plan contains the seven normalized transaction keys in write order', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(`  ${personalCopyKey}  `);

  assert.equal(plan.personalCopyKey, personalCopyKey);
  assert.equal(plan.savedRecordKey, `flow:saved:${personalCopyKey}`);
  assert.equal(plan.anchorKey, `flow:${personalCopyKey}:anchorDate`);
  assert.equal(plan.itemStateKey, `flow_builder_mvp_item_state_${personalCopyKey}`);
  assert.deepEqual(plan.allKeys, [
    plan.itemDraftsKey,
    plan.dateOverridesKey,
    plan.itemStateKey,
    plan.anchorKey,
    plan.canonicalOriginKey,
    plan.lastVisitKey,
    plan.savedRecordKey,
  ]);
  assert.equal(new Set(plan.allKeys).size, 7);
});

test('strict JSON-record read keeps raw bytes, maps only a missing key to an empty record, and reports malformed input', () => {
  const validRaw = '{ "item-1" : { "title": "keep bytes" } }';
  const storage = new InstrumentedStorage({
    valid: validRaw,
    malformed: '{broken',
    array: '[]',
    primitive: 'true',
  });

  assert.deepEqual(readPublicFlowSaveJsonRecord(storage, 'missing'), {
    ok: true,
    raw: null,
    value: {},
  });
  assert.deepEqual(readPublicFlowSaveJsonRecord(storage, 'valid'), {
    ok: true,
    raw: validRaw,
    value: { 'item-1': { title: 'keep bytes' } },
  });

  const malformed = readPublicFlowSaveJsonRecord(storage, 'malformed');
  assert.equal(malformed.ok, false);
  if (!malformed.ok) {
    assert.equal(malformed.reason, 'malformed_json');
    assert.equal(malformed.raw, '{broken');
  }
  for (const key of ['array', 'primitive']) {
    const nonRecord = readPublicFlowSaveJsonRecord(storage, key);
    assert.equal(nonRecord.ok, false);
    if (!nonRecord.ok) assert.equal(nonRecord.reason, 'non_record');
  }
});

test('strict JSON-record read turns a storage read throw into an explicit failure', () => {
  const storage = new InstrumentedStorage({ record: '{}' });
  storage.resetReads({ operation: 'getItem' });

  const result = readPublicFlowSaveJsonRecord(storage, 'record');

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, 'read_failed');
  assert.equal(result.raw, undefined);
  assert.equal((result.error as Error).name, 'SecurityError');
  assert.equal(storage.mutationCalls, 0);
});

test('persisted item-state validation rejects semantically corrupt entries after valid JSON parsing', () => {
  const storage = new InstrumentedStorage({
    corrupt: '{"x":null}',
    valid: JSON.stringify({
      first: {
        skipped: false,
        note: '',
        personalOrder: 0,
        personalExcluded: false,
      },
      empty: {},
    }),
  });

  const corrupt = readPublicFlowSaveJsonRecord(storage, 'corrupt');
  assert.equal(corrupt.ok, true);
  if (corrupt.ok) assert.equal(isValidPublicFlowItemStateRecord(corrupt.value), false);

  const valid = readPublicFlowSaveJsonRecord(storage, 'valid');
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(isValidPublicFlowItemStateRecord(valid.value), true);
  assert.equal(storage.mutationCalls, 0);
});

test('persisted item-state validation holds invalid field types and unknown fields', () => {
  const invalidRecords: unknown[] = [
    null,
    [],
    { '': {} },
    { item: [] },
    { item: 'done' },
    { item: { skipped: 'true' } },
    { item: { note: false } },
    { item: { personalOrder: Number.NaN } },
    { item: { personalOrder: Number.POSITIVE_INFINITY } },
    { item: { personalExcluded: 1 } },
    { item: { futureField: true } },
  ];

  invalidRecords.forEach((record) => {
    assert.equal(isValidPublicFlowItemStateRecord(record), false);
  });
  const nullPrototypeRecord = Object.create(null) as Record<string, unknown>;
  nullPrototypeRecord.item = { skipped: true };
  assert.equal(isValidPublicFlowItemStateRecord(nullPrototypeRecord), true);
});

test('persisted draft and date-override validation rejects invalid nested values', () => {
  assert.equal(isValidPublicFlowItemDraftRecord({ 'flow::item': { title: 'keep' } }), true);
  assert.equal(isValidPublicFlowItemDraftRecord({ 'flow::item': null }), false);
  assert.equal(isValidPublicFlowItemDraftRecord({ 'flow::item': [] }), false);
  assert.equal(isValidPublicFlowItemDraftRecord({ 'flow::item': 'bad' }), false);
  assert.equal(isValidPublicFlowItemDraftRecord({ '': {} }), false);

  assert.equal(isValidPublicFlowDateOverrideRecord({ 'flow::item::none': '2026-08-04' }), true);
  assert.equal(isValidPublicFlowDateOverrideRecord({ 'flow::item::none': '' }), true);
  assert.equal(isValidPublicFlowDateOverrideRecord({ 'flow::item::none': null }), false);
  assert.equal(isValidPublicFlowDateOverrideRecord({ 'flow::item::none': 20260804 }), false);
  assert.equal(isValidPublicFlowDateOverrideRecord({ '': '2026-08-04' }), false);
});

test('saved-copy inspection separates new, choice, already committed, and malformed legacy states', () => {
  const query = {
    sourceFlowKey,
    sourceFlowSlug,
    idempotencyKey: requestId,
  };

  assert.deepEqual(inspectPublicFlowSavedCopies(new InstrumentedStorage(), query), {
    kind: 'ready_new',
    copies: [],
  });

  const olderKey = 'personal-flow:moving-d30:older';
  const newerKey = 'personal-flow:moving-d30:newer';
  const choices = inspectPublicFlowSavedCopies(new InstrumentedStorage({
    [`flow:saved:${newerKey}`]: savedRecordRaw({
      copyKey: newerKey,
      request: 'other-request-2',
      savedAt: '2026-08-03T00:00:00.000Z',
    }),
    [`flow:saved:${olderKey}`]: savedRecordRaw({
      copyKey: olderKey,
      request: 'other-request-1',
      savedAt: '2026-08-02T00:00:00.000Z',
    }),
    'flow:saved:unrelated': savedRecordRaw({
      copyKey: 'unrelated',
      sourceKey: 'public-flow:other',
      sourceSlug: 'other',
    }),
  }), query);
  assert.equal(choices.kind, 'choice_required');
  if (choices.kind !== 'choice_required') return;
  assert.deepEqual(choices.copies.map((copy) => copy.personalCopyKey), [olderKey, newerKey]);

  const already = inspectPublicFlowSavedCopies(new InstrumentedStorage({
    [`flow:saved:${personalCopyKey}`]: savedRecordRaw(),
  }), query);
  assert.equal(already.kind, 'already_committed');
  if (already.kind !== 'already_committed') return;
  assert.equal(already.copy.personalCopyKey, personalCopyKey);
  assert.equal(already.copy.lastSaveRequestId, requestId);

  const malformed = inspectPublicFlowSavedCopies(new InstrumentedStorage({
    [`flow:saved:${sourceFlowSlug}`]: '{broken legacy json',
  }), query);
  assert.deepEqual(malformed, { kind: 'held', reason: 'malformed_legacy' });
});

test('inspection reaches duplicate-choice state without performing a storage write', () => {
  const storage = new InstrumentedStorage({
    [`flow:saved:${personalCopyKey}`]: savedRecordRaw({ request: 'previous-request' }),
  });
  storage.resetMutations();

  const inspection = inspectPublicFlowSavedCopies(storage, {
    sourceFlowKey,
    sourceFlowSlug,
    idempotencyKey: requestId,
  });

  assert.equal(inspection.kind, 'choice_required');
  assert.equal(storage.mutationCalls, 0);
});

test('inspection holds without throwing or writing when length, key, or getItem fails', () => {
  const query = {
    sourceFlowKey,
    sourceFlowSlug,
    idempotencyKey: requestId,
  };
  const operations = ['length', 'key', 'getItem'] as const;

  for (const operation of operations) {
    const storage = new InstrumentedStorage({
      [`flow:saved:${personalCopyKey}`]: savedRecordRaw({ request: 'previous-request' }),
    });
    storage.resetMutations();
    storage.resetReads({ operation });

    assert.deepEqual(
      inspectPublicFlowSavedCopies(storage, query),
      { kind: 'held', reason: 'storage_unavailable' },
      `${operation} failure must hold inspection`,
    );
    assert.equal(storage.mutationCalls, 0, `${operation} failure must not write`);
  }
});

test('transaction rejects missing, early, or repeated saved-record writes before storage mutation', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  const storage = new InstrumentedStorage();
  const invalidWriteSets: PublicFlowSaveWrite[][] = [
    [],
    [
      { key: plan.savedRecordKey, raw: savedRecordRaw() },
      { key: plan.lastVisitKey, raw: 'too-late' },
    ],
    [
      { key: plan.savedRecordKey, raw: savedRecordRaw() },
      { key: plan.savedRecordKey, raw: savedRecordRaw() },
    ],
  ];

  for (const writes of invalidWriteSets) {
    const result = runPublicFlowSaveTransaction({
      storage,
      keyPlan: plan,
      idempotencyKey: requestId,
      writes,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'failed');
    assert.equal(result.writeCount, 0);
    assert.equal(result.rollbackComplete, true);
  }
  assert.equal(storage.mutationCalls, 0);
});

test('transaction reports an idempotency read failure without throwing or writing', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  const storage = new InstrumentedStorage(rollbackSeed(plan));
  storage.resetMutations();
  storage.resetReads({ operation: 'getItem' });

  const failed = runPublicFlowSaveTransaction({
    storage,
    keyPlan: plan,
    idempotencyKey: requestId,
    writes: transactionWrites(plan),
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.status, 'failed');
  if (failed.ok) return;
  assert.equal(failed.failureStage, 'idempotency_read');
  assert.equal(failed.writeCount, 0);
  assert.equal(failed.rollbackComplete, true);
  assert.equal(failed.backup, undefined);
  assert.equal(storage.mutationCalls, 0);
});

test('transaction reports a partial backup read failure with zero writes', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  const storage = new InstrumentedStorage(rollbackSeed(plan));
  storage.resetMutations();
  // Call 1 is the idempotency probe. Call 2 captures the first backup key;
  // call 3 fails while the backup is still incomplete.
  storage.resetReads({ operation: 'getItem', call: 3 });

  const failed = runPublicFlowSaveTransaction({
    storage,
    keyPlan: plan,
    idempotencyKey: requestId,
    writes: transactionWrites(plan),
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.status, 'failed');
  if (failed.ok) return;
  assert.equal(failed.failureStage, 'backup_read');
  assert.equal(failed.writeCount, 0);
  assert.equal(failed.rollbackComplete, true);
  assert.equal(failed.backup, undefined);
  assert.equal(storage.mutationCalls, 0);
});

test('transaction detects a read-to-backup race with zero writes and preserves the newer raw bytes', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  const storage = new InstrumentedStorage(rollbackSeed(plan));
  const inputRead = readPublicFlowSaveJsonRecord(storage, plan.itemDraftsKey);
  assert.equal(inputRead.ok, true);
  if (!inputRead.ok) return;
  const newerRaw = '{ "newer" : { "title": "another tab won" } }';
  storage.setItem(plan.itemDraftsKey, newerRaw);
  storage.resetMutations();
  let prepareCalls = 0;

  const conflict = runPublicFlowSaveTransaction({
    storage,
    keyPlan: plan,
    idempotencyKey: requestId,
    writes: transactionWrites(plan),
    expectedRaw: { [plan.itemDraftsKey]: inputRead.raw },
    prepareCommit: () => {
      prepareCalls += 1;
    },
  });

  assert.equal(conflict.ok, false);
  assert.equal(conflict.status, 'failed');
  if (conflict.ok) return;
  assert.equal(conflict.failureStage, 'conflict');
  if (conflict.failureStage !== 'conflict') return;
  assert.deepEqual(conflict.conflictKeys, [plan.itemDraftsKey]);
  assert.equal(conflict.error instanceof PublicFlowSaveConflictError, true);
  assert.equal(conflict.writeCount, 0);
  assert.equal(conflict.rollbackComplete, true);
  assert.equal(conflict.backup.values[plan.itemDraftsKey], newerRaw);
  assert.equal(storage.getItem(plan.itemDraftsKey), newerRaw);
  assert.equal(storage.mutationCalls, 0);
  assert.equal(prepareCalls, 0);
});

test('prepareCommit sees the exact backup once after CAS and before the first storage write', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  const storage = new InstrumentedStorage(rollbackSeed(plan));
  const before = storage.snapshot(plan.allKeys);
  storage.resetMutations();
  let prepareCalls = 0;

  const committed = runPublicFlowSaveTransaction({
    storage,
    keyPlan: plan,
    idempotencyKey: requestId,
    writes: transactionWrites(plan),
    expectedRaw: { [plan.itemDraftsKey]: before[plan.itemDraftsKey] },
    prepareCommit: (backup) => {
      prepareCalls += 1;
      assert.equal(storage.mutationCalls, 0);
      assert.deepEqual(backup, { keys: plan.allKeys, values: before });
    },
  });

  assert.equal(committed.ok, true);
  assert.equal(committed.status, 'committed');
  assert.equal(prepareCalls, 1);
  assert.equal(storage.mutationCalls, 7);
});

test('a prepareCommit throw returns a zero-write failure and leaves the backup bytes untouched', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  const storage = new InstrumentedStorage(rollbackSeed(plan));
  const before = storage.snapshot(plan.allKeys);
  storage.resetMutations();
  const prepareError = new Error('session handoff unavailable');
  let prepareCalls = 0;

  const failed = runPublicFlowSaveTransaction({
    storage,
    keyPlan: plan,
    idempotencyKey: requestId,
    writes: transactionWrites(plan),
    prepareCommit: (backup) => {
      prepareCalls += 1;
      assert.deepEqual(backup, { keys: plan.allKeys, values: before });
      throw prepareError;
    },
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.status, 'failed');
  if (failed.ok) return;
  assert.equal(failed.failureStage, 'prepare_commit');
  assert.equal(failed.error, prepareError);
  assert.equal(failed.writeCount, 0);
  assert.equal(failed.rollbackComplete, true);
  assert.deepEqual(failed.backup, { keys: plan.allKeys, values: before });
  assert.deepEqual(storage.snapshot(plan.allKeys), before);
  assert.equal(storage.mutationCalls, 0);
  assert.equal(prepareCalls, 1);
});

test('transaction commits all seven writes and the same request performs zero further writes', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  const storage = new InstrumentedStorage(rollbackSeed(plan));
  const writes = transactionWrites(plan);
  const before = storage.snapshot(plan.allKeys);
  storage.resetMutations();

  const committed = runPublicFlowSaveTransaction({
    storage,
    keyPlan: plan,
    idempotencyKey: requestId,
    writes,
  });

  assert.equal(committed.ok, true);
  assert.equal(committed.status, 'committed');
  assert.equal(committed.writeCount, 7);
  assert.equal(committed.rollbackComplete, true);
  if (committed.status !== 'committed') return;
  assert.deepEqual(committed.backup, { keys: plan.allKeys, values: before });
  assert.deepEqual(
    storage.snapshot(plan.allKeys),
    Object.fromEntries(writes.map((write) => [write.key, write.raw])),
  );
  assert.equal(storage.mutationCalls, 7);

  storage.resetMutations();
  const duplicate = runPublicFlowSaveTransaction({
    storage,
    keyPlan: plan,
    idempotencyKey: requestId,
    writes,
  });
  assert.deepEqual(duplicate, {
    ok: true,
    status: 'already_committed',
    backup: undefined,
    writeCount: 0,
    rollbackComplete: true,
  });
  assert.equal(storage.mutationCalls, 0);
});

test('failure at each of the seven write positions restores exact raw bytes including missing keys', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  const writes = transactionWrites(plan);

  for (let failAt = 1; failAt <= writes.length; failAt += 1) {
    const storage = new InstrumentedStorage(rollbackSeed(plan));
    const before = storage.snapshot(plan.allKeys);
    assert.equal(before[plan.dateOverridesKey], null);
    assert.equal(before[plan.anchorKey], null);
    storage.resetMutations([failAt]);

    const failed = runPublicFlowSaveTransaction({
      storage,
      keyPlan: plan,
      idempotencyKey: requestId,
      writes,
    });

    assert.equal(failed.ok, false, `failure ${failAt} must fail the transaction`);
    assert.equal(failed.status, 'failed', `failure ${failAt} status`);
    if (failed.ok) continue;
    assert.equal(failed.failureStage, 'write', `failure ${failAt} failure stage`);
    assert.equal(failed.writeCount, failAt - 1, `failure ${failAt} successful write count`);
    assert.equal(failed.rollbackComplete, true, `failure ${failAt} rollback completion`);
    assert.deepEqual(
      storage.snapshot(plan.allKeys),
      before,
      `failure ${failAt} must restore every exact raw value`,
    );
  }
});

test('a rollback mutation failure is reported instead of claiming full recovery', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  const storage = new InstrumentedStorage(rollbackSeed(plan));
  const before = storage.snapshot(plan.allKeys);
  // Mutation 4 fails the forward anchor write. During reverse restore, mutation 9
  // is the item-state key, which had already been changed by forward mutation 3.
  storage.resetMutations([4, 9]);

  const failed = runPublicFlowSaveTransaction({
    storage,
    keyPlan: plan,
    idempotencyKey: requestId,
    writes: transactionWrites(plan),
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.status, 'failed');
  if (failed.ok) return;
  assert.equal(failed.failureStage, 'rollback');
  assert.equal(failed.writeCount, 3);
  assert.equal(failed.rollbackComplete, false);
  assert.notEqual(storage.getItem(plan.itemStateKey), before[plan.itemStateKey]);
});

test('a rollback removeItem failure is also reported as an incomplete rollback', () => {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  const storage = new InstrumentedStorage(rollbackSeed(plan));
  const before = storage.snapshot(plan.allKeys);
  assert.equal(before[plan.anchorKey], null);
  // Mutation 5 fails the forward canonical-origin write after the anchor was
  // created. Reverse restore mutation 9 then fails while removing that anchor.
  storage.resetMutations([5, 9]);

  const failed = runPublicFlowSaveTransaction({
    storage,
    keyPlan: plan,
    idempotencyKey: requestId,
    writes: transactionWrites(plan),
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.status, 'failed');
  if (failed.ok) return;
  assert.equal(failed.failureStage, 'rollback');
  assert.equal(failed.writeCount, 4);
  assert.equal(failed.rollbackComplete, false);
  assert.notEqual(storage.getItem(plan.anchorKey), before[plan.anchorKey]);
});

test('overwrite preserves execution skipped/note while replacing target authoring state', () => {
  const sourceAuthoring = getPublicFlowAuthoringItemStates({
    shared: {
      skipped: false,
      note: 'source execution must not cross the boundary',
      personalExcluded: true,
      personalOrder: 1,
    },
    sourceOnly: {
      skipped: true,
      note: 'source note must not cross the boundary',
      personalOrder: 2,
    },
  });
  const overwritten = mergePublicFlowAuthoringItemStates({
    currentTargetState: {
      shared: {
        skipped: true,
        note: 'keep target execution',
        personalExcluded: false,
        personalOrder: 99,
      },
      targetExecutionOnly: {
        skipped: false,
        note: 'keep target-only note',
        personalExcluded: true,
        personalOrder: 88,
      },
    },
    authoringState: sourceAuthoring,
    preserveExecutionState: true,
  });

  assert.deepEqual(sourceAuthoring, {
    shared: { personalExcluded: true, personalOrder: 1 },
    sourceOnly: { personalOrder: 2 },
  });
  assert.deepEqual(overwritten, {
    shared: {
      skipped: true,
      note: 'keep target execution',
      personalExcluded: true,
      personalOrder: 1,
    },
    targetExecutionOnly: {
      skipped: false,
      note: 'keep target-only note',
    },
    sourceOnly: { personalOrder: 2 },
  });
});

test('new copy carries authoring state but does not copy source or target execution state', () => {
  const sourceAuthoring = getPublicFlowAuthoringItemStates({
    shared: {
      skipped: true,
      note: 'private source execution',
      personalExcluded: true,
      personalOrder: 3,
    },
    executionOnly: {
      skipped: true,
      note: 'must disappear',
    },
  });
  const copied = mergePublicFlowAuthoringItemStates({
    currentTargetState: {
      shared: { skipped: true, note: 'unrelated target execution' },
      targetOnly: { skipped: false, note: 'must not enter copy' },
    },
    authoringState: sourceAuthoring,
    preserveExecutionState: false,
  });

  assert.deepEqual(copied, {
    shared: { personalExcluded: true, personalOrder: 3 },
  });
  assert.equal(JSON.stringify(copied).includes('private source execution'), false);
  assert.equal(JSON.stringify(copied).includes('unrelated target execution'), false);
});

test('flow-scoped global records remove only the selected Flow prefix', () => {
  const original = {
    'moving-d30::item-1': { title: 'remove 1' },
    'moving-d30::item-2': { title: 'remove 2' },
    'moving-d30-copy::item-1': { title: 'keep similar prefix' },
    'other-flow::item-1': { title: 'keep other Flow' },
    unscoped: { title: 'keep unscoped' },
  };

  const cleaned = removeFlowScopedRecordEntries(original, 'moving-d30');

  assert.deepEqual(cleaned, {
    'moving-d30-copy::item-1': { title: 'keep similar prefix' },
    'other-flow::item-1': { title: 'keep other Flow' },
    unscoped: { title: 'keep unscoped' },
  });
  assert.equal(Object.keys(original).length, 5);
});
