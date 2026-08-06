import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFlowUserDataMutationStorageKeyPlan,
  captureFlowUserDataMutationExpectedRaw,
  FLOW_USER_DATA_BUNDLES_STORAGE_KEY,
  runFlowUserDataMutationTransaction,
} from './flow-user-data-mutation-transaction';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  onSet?: (key: string, value: string) => void;

  constructor(initial: Record<string, string> = {}) {
    Object.entries(initial).forEach(([key, value]) => this.values.set(key, value));
  }

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    this.values.set(key, value);
    this.onSet?.(key, value);
  }
}

test('user-data mutation key plan covers composite flow, Map, and personal overlay state', () => {
  const plan = buildFlowUserDataMutationStorageKeyPlan({
    flowSlugs: ['copy-a', 'copy-b'],
    mapIds: ['map-a'],
  });

  assert.equal(plan.bundleKey, FLOW_USER_DATA_BUNDLES_STORAGE_KEY);
  assert.ok(plan.allKeys.includes('flow:saved:copy-a'));
  assert.ok(plan.allKeys.includes('flow:copy-b:anchorDate'));
  assert.ok(plan.allKeys.includes('flow_builder_mvp_checks_copy-a'));
  assert.ok(plan.allKeys.includes('flow_builder_mvp_item_state_copy-b'));
  assert.ok(plan.allKeys.includes('flow:my-flow:structural-overlay:copy-a'));
  assert.ok(plan.allKeys.includes('flow:map:saved:map-a'));
  assert.ok(plan.allKeys.includes('flow:map:persistence:map-a'));
  assert.ok(plan.allKeys.includes('flow:my-flow:item-drafts'));
  assert.ok(plan.allKeys.includes('flow:my-flow:date-overrides'));
});

test('stale expected raw fails with zero writes', () => {
  const storage = new MemoryStorage({ 'flow:saved:copy-a': 'newer' });
  const plan = buildFlowUserDataMutationStorageKeyPlan({ flowSlugs: ['copy-a'] });
  let applied = false;
  const result = runFlowUserDataMutationTransaction({
    storage,
    keyPlan: plan,
    expectedRaw: { 'flow:saved:copy-a': 'older' },
    apply(transactionStorage) {
      applied = true;
      transactionStorage.setItem('flow:saved:copy-a', 'mine');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(applied, false);
  assert.equal(storage.getItem('flow:saved:copy-a'), 'newer');
});

test('composite mutation rolls back mutate-then-throw writes', () => {
  const storage = new MemoryStorage({
    'flow:saved:copy-a': 'saved-before',
    'flow:map:saved:map-a': 'map-before',
  });
  const plan = buildFlowUserDataMutationStorageKeyPlan({
    flowSlugs: ['copy-a'],
    mapIds: ['map-a'],
  });
  const expectedRaw = captureFlowUserDataMutationExpectedRaw(storage, plan);
  storage.onSet = (key, value) => {
    if (key === 'flow:map:saved:map-a' && value === 'map-after') {
      throw new Error('quota after mutation');
    }
  };

  const result = runFlowUserDataMutationTransaction({
    storage,
    keyPlan: plan,
    expectedRaw,
    apply(transactionStorage) {
      transactionStorage.setItem('flow:saved:copy-a', 'saved-after');
      transactionStorage.setItem('flow:map:saved:map-a', 'map-after');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.rollbackComplete, true);
  assert.equal(storage.getItem('flow:saved:copy-a'), 'saved-before');
  assert.equal(storage.getItem('flow:map:saved:map-a'), 'map-before');
});

test('unplanned writes are rejected and rolled back', () => {
  const storage = new MemoryStorage({ 'flow:saved:copy-a': 'before' });
  const plan = buildFlowUserDataMutationStorageKeyPlan({ flowSlugs: ['copy-a'] });
  const result = runFlowUserDataMutationTransaction({
    storage,
    keyPlan: plan,
    expectedRaw: captureFlowUserDataMutationExpectedRaw(storage, plan),
    apply(transactionStorage) {
      transactionStorage.setItem('flow:saved:copy-a', 'after');
      transactionStorage.setItem('flow:unplanned', 'leak');
    },
  });

  assert.equal(result.ok, false);
  assert.equal(storage.getItem('flow:saved:copy-a'), 'before');
  assert.equal(storage.getItem('flow:unplanned'), null);
});
