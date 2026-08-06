import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFlowRunReuseStorageKeyPlan,
  runFlowRunReuseStorageTransaction,
} from './flow-run-reuse-storage-transaction';
import {
  completeActiveFlowRun,
  startFlowRunFromCompleted,
} from './storage';

class FaultInjectingStorage {
  readonly values = new Map<string, string>();
  mutateThenThrowKey?: string;
  externalReplacementKey?: string;
  externalReplacementRaw = 'external-write';
  private failureInjected = false;
  private externalReplacementInjected = false;

  get length(): number {
    return this.values.size;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    if (
      this.failureInjected
      && !this.externalReplacementInjected
      && key === this.externalReplacementKey
    ) {
      this.values.set(key, this.externalReplacementRaw);
      this.externalReplacementInjected = true;
    }
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
    if (!this.failureInjected && key === this.mutateThenThrowKey) {
      this.failureInjected = true;
      throw new Error(`Injected post-mutation failure for ${key}`);
    }
  }

  removeItem(key: string): void {
    this.values.delete(key);
    if (!this.failureInjected && key === this.mutateThenThrowKey) {
      this.failureInjected = true;
      throw new Error(`Injected post-mutation failure for ${key}`);
    }
  }
}

test('reuse key plan covers completion, reset, personal state, reviewed Map, and new-run writes', () => {
  const plan = buildFlowRunReuseStorageKeyPlan({
    flowSlug: 'moving-home',
    mapIds: ['moving-map'],
  });

  assert.deepEqual(new Set(plan.allKeys), new Set([
    'flow:run-registry:moving-home',
    'flow:saved:moving-home',
    'flow_builder_mvp_checks_moving-home',
    'flow:moving-home:anchorDate',
    'flow_builder_mvp_item_state_moving-home',
    'flow_builder_mvp_comparison_moving-home',
    'flow_builder_mvp_workbench_moving-home',
    'flow_builder_mvp_reactions_moving-home',
    'flow:my-flow:completion-feedback:moving-home',
    'flow:my-flow:execution-notes:moving-home',
    'flow:completion-detected-at:moving-home',
    'flow:my-flow:step-item-checks',
    'flow:my-flow:item-drafts',
    'flow:my-flow:date-overrides',
    'flow:my-flow:occurrence-execution',
    'flow:meta:last-visit',
    'flow:map:saved:moving-map',
    'flow:map:persistence:moving-map',
  ]));
});

test('reuse transaction rolls back completion and reviewed Map bytes when a later write mutates then throws', () => {
  const plan = buildFlowRunReuseStorageKeyPlan({
    flowSlug: 'moving-home',
    mapIds: ['moving-map'],
  });
  const storage = new FaultInjectingStorage();
  plan.allKeys.forEach((key) => storage.values.set(key, `before:${key}`));
  const before = new Map(storage.values);
  const failureKey = 'flow:saved:moving-home';
  storage.mutateThenThrowKey = failureKey;

  const result = runFlowRunReuseStorageTransaction({
    storage,
    keyPlan: plan,
    apply(transactionStorage) {
      transactionStorage.setItem('flow:run-registry:moving-home', 'completed-run');
      transactionStorage.setItem('flow:map:saved:moving-map', 'reviewed-map');
      transactionStorage.setItem('flow:map:persistence:moving-map', 'reviewed-persistence');
      transactionStorage.removeItem('flow_builder_mvp_checks_moving-home');
      transactionStorage.setItem(failureKey, 'new-run-saved-flow');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.rollbackComplete, true);
  assert.deepEqual(storage.values, before);
});

test('reuse rollback preserves an external replacement instead of overwriting it', () => {
  const plan = buildFlowRunReuseStorageKeyPlan({
    flowSlug: 'moving-home',
    mapIds: ['moving-map'],
  });
  const storage = new FaultInjectingStorage();
  const externallyReplacedKey = 'flow:run-registry:moving-home';
  const failureKey = 'flow:saved:moving-home';
  storage.values.set(externallyReplacedKey, 'before-registry');
  storage.values.set(failureKey, 'before-saved-flow');
  storage.externalReplacementKey = externallyReplacedKey;
  storage.externalReplacementRaw = 'newer-external-registry';
  storage.mutateThenThrowKey = failureKey;

  const result = runFlowRunReuseStorageTransaction({
    storage,
    keyPlan: plan,
    apply(transactionStorage) {
      transactionStorage.setItem(externallyReplacedKey, 'completed-run');
      transactionStorage.setItem(failureKey, 'new-run-saved-flow');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.rollbackComplete, false);
  assert.equal(storage.getItem(externallyReplacedKey), 'newer-external-registry');
  assert.equal(storage.getItem(failureKey), 'before-saved-flow');
});

test('reuse transaction rejects writes outside its raw backup before they mutate storage', () => {
  const plan = buildFlowRunReuseStorageKeyPlan({ flowSlug: 'moving-home' });
  const storage = new FaultInjectingStorage();

  const result = runFlowRunReuseStorageTransaction({
    storage,
    keyPlan: plan,
    apply(transactionStorage) {
      transactionStorage.setItem('unplanned:key', 'must-not-be-written');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.rollbackComplete, true);
  assert.equal(storage.getItem('unplanned:key'), null);
});

test('real completion and start helpers leave no partial run state after a post-mutation storage failure', () => {
  const flowSlug = 'atomic-reuse-flow';
  const plan = buildFlowRunReuseStorageKeyPlan({ flowSlug });
  const storage = new FaultInjectingStorage();
  storage.values.set(`flow:run-registry:${flowSlug}`, JSON.stringify({
    schemaVersion: 1,
    activeRunId: 'run-before',
    runs: [{
      schemaVersion: 1,
      runId: 'run-before',
      flowSlug,
      status: 'active',
      startedAt: '2026-08-01T00:00:00.000Z',
      selectedArtifactMode: 'checklist',
    }],
  }));
  storage.values.set(`flow:saved:${flowSlug}`, JSON.stringify({
    slug: flowSlug,
    savedAt: '2026-08-01T00:00:00.000Z',
    selectedArtifactMode: 'checklist',
    dateIntent: 'undated',
  }));
  storage.values.set(`flow_builder_mvp_checks_${flowSlug}`, JSON.stringify({ first: true }));
  storage.values.set('flow:my-flow:step-item-checks', JSON.stringify({
    [`${flowSlug}::first`]: { check: true },
  }));
  const rawBefore = Object.fromEntries(
    plan.allKeys.map((key) => [key, storage.getItem(key)]),
  );
  storage.mutateThenThrowKey = `flow:saved:${flowSlug}`;

  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: storage },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });

  try {
    const result = runFlowRunReuseStorageTransaction({
      storage,
      keyPlan: plan,
      apply(transactionStorage) {
        const completed = completeActiveFlowRun(flowSlug, {
          completedAt: '2026-08-02T00:00:00.000Z',
        }, transactionStorage);
        assert.ok(completed);
        const next = startFlowRunFromCompleted(flowSlug, {
          previousRunId: completed.runId,
          reuseMode: 'same_copy',
          runId: 'run-after',
          startedAt: '2026-08-03T00:00:00.000Z',
        }, transactionStorage);
        if (!next) throw new Error('The test reuse could not start.');
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.rollbackComplete, true);
    assert.deepEqual(
      Object.fromEntries(plan.allKeys.map((key) => [key, storage.getItem(key)])),
      rawBefore,
    );
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: previousWindow,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage,
    });
  }
});
