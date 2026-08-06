import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureFlowEditorRawStorage,
  FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY,
  FLOW_EDITOR_STORAGE_RECOVERY_KEY,
  isFlowEditorRawStorageEqual,
  prepareFlowEditorStorageCommit,
  recoverFlowEditorStorageCommit,
} from './flow-editor-storage-transaction';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

function validRecoveryJournal(overrides?: Readonly<Record<string, unknown>>) {
  return {
    schemaVersion: 2,
    transactionId: 'tx-valid',
    createdAt: '2026-08-04T00:00:00.000Z',
    targetKeys: ['flow:a'],
    snapshot: {
      keys: ['flow:a'],
      values: { 'flow:a': 'before' },
    },
    commitMarker: {
      key: FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY,
      value: 'tx-valid',
      previousValue: 'prior-marker',
    },
    ...overrides,
  };
}

test('prepared storage commit captures no writes before commit and preserves success bytes', () => {
  const storage = new MemoryStorage();
  storage.setItem('flow:a', 'before');
  const operation = prepareFlowEditorStorageCommit({
    storage,
    commit: () => storage.setItem('flow:a', 'after'),
  });
  assert.equal(storage.getItem('flow:a'), 'before');
  operation.commit();
  assert.equal(storage.getItem('flow:a'), 'after');
});

test('partial multi-key write restores exact prior bytes and removes newly created keys', () => {
  const storage = new MemoryStorage();
  storage.setItem('flow:a', '{"value":1}');
  storage.setItem('unrelated', 'keep');
  const before = captureFlowEditorRawStorage(storage);
  let rollbackRefreshes = 0;
  const operation = prepareFlowEditorStorageCommit({
    storage,
    commit: () => {
      storage.setItem('flow:a', '{"value":2}');
      storage.setItem('flow:new', 'partial');
      throw new Error('quota after partial write');
    },
    afterRollback: () => { rollbackRefreshes += 1; },
  });

  assert.throws(() => operation.commit(), /quota/);
  assert.equal(operation.rollbackAndVerify(), true);
  assert.equal(rollbackRefreshes, 1);
  assert.equal(isFlowEditorRawStorageEqual(storage, before), true);
  assert.equal(storage.getItem('unrelated'), 'keep');
  assert.equal(storage.getItem('flow:new'), null);
});

test('verification returns false when storage refuses an exact rollback', () => {
  const base = new MemoryStorage();
  base.setItem('flow:a', 'before');
  const storage: Storage = {
    get length() { return base.length; },
    clear: () => base.clear(),
    getItem: (key) => base.getItem(key),
    key: (index) => base.key(index),
    removeItem: (key) => base.removeItem(key),
    setItem: (key, value) => {
      if (key === 'flow:a' && value === 'before' && base.getItem(key) === 'after') return;
      base.setItem(key, value);
    },
  };
  const operation = prepareFlowEditorStorageCommit({
    storage,
    commit: () => storage.setItem('flow:a', 'after'),
  });
  operation.commit();
  assert.equal(operation.rollbackAndVerify(), false);
});

test('durable session journal is removed after a successful commit', () => {
  const storage = new MemoryStorage();
  const journalStorage = new MemoryStorage();
  storage.setItem('flow:a', 'before');
  const operation = prepareFlowEditorStorageCommit({
    storage,
    recovery: {
      journalStorage,
      transactionId: 'tx-success',
      targetKeys: ['flow:a'],
    },
    commit: () => {
      assert.ok(journalStorage.getItem(FLOW_EDITOR_STORAGE_RECOVERY_KEY));
      storage.setItem('flow:a', 'after');
    },
  });
  operation.commit();
  assert.equal(storage.getItem('flow:a'), 'after');
  assert.equal(journalStorage.getItem(FLOW_EDITOR_STORAGE_RECOVERY_KEY), null);
});

test('incomplete rollback keeps a reload journal that can restore exact bytes later', () => {
  const base = new MemoryStorage();
  const journalStorage = new MemoryStorage();
  base.setItem('flow:a', 'before');
  let refuseRestore = true;
  const failingStorage: Storage = {
    get length() { return base.length; },
    clear: () => base.clear(),
    getItem: (key) => base.getItem(key),
    key: (index) => base.key(index),
    removeItem: (key) => base.removeItem(key),
    setItem: (key, value) => {
      if (refuseRestore && key === 'flow:a' && value === 'before' && base.getItem(key) === 'after') {
        throw new Error('restore refused');
      }
      base.setItem(key, value);
    },
  };
  const operation = prepareFlowEditorStorageCommit({
    storage: failingStorage,
    recovery: {
      journalStorage,
      transactionId: 'tx-reload',
      targetKeys: ['flow:a'],
    },
    commit: () => {
      failingStorage.setItem('flow:a', 'after');
      throw new Error('partial write');
    },
  });
  assert.throws(() => operation.commit(), /partial write/);
  assert.throws(() => operation.rollbackAndVerify(), /restore refused/);
  assert.ok(journalStorage.getItem(FLOW_EDITOR_STORAGE_RECOVERY_KEY));

  refuseRestore = false;
  const recovery = recoverFlowEditorStorageCommit({
    storage: failingStorage,
    journalStorage,
  });
  assert.deepEqual(recovery, {
    found: true,
    recovered: true,
    transactionId: 'tx-reload',
    outcome: 'rolled-back',
  });
  assert.equal(base.getItem('flow:a'), 'before');
  assert.equal(journalStorage.getItem(FLOW_EDITOR_STORAGE_RECOVERY_KEY), null);
});

test('reload keeps a fully committed write when the durable commit marker exists', () => {
  const storage = new MemoryStorage();
  const journalBase = new MemoryStorage();
  storage.setItem('flow:a', 'before');
  let refuseJournalRemoval = true;
  const journalStorage: Storage = {
    get length() { return journalBase.length; },
    clear: () => journalBase.clear(),
    getItem: (key) => journalBase.getItem(key),
    key: (index) => journalBase.key(index),
    removeItem: (key) => {
      if (refuseJournalRemoval) throw new Error('simulated process stop');
      journalBase.removeItem(key);
    },
    setItem: (key, value) => journalBase.setItem(key, value),
  };
  const operation = prepareFlowEditorStorageCommit({
    storage,
    recovery: {
      journalStorage,
      transactionId: 'tx-committed-crash',
      targetKeys: ['flow:a'],
    },
    commit: () => storage.setItem('flow:a', 'after'),
  });

  assert.throws(() => operation.commit(), /simulated process stop/);
  assert.equal(storage.getItem('flow:a'), 'after');
  assert.ok(journalBase.getItem(FLOW_EDITOR_STORAGE_RECOVERY_KEY));

  refuseJournalRemoval = false;
  const recovery = recoverFlowEditorStorageCommit({ storage, journalStorage });
  assert.deepEqual(recovery, {
    found: true,
    recovered: true,
    transactionId: 'tx-committed-crash',
    outcome: 'committed',
  });
  assert.equal(storage.getItem('flow:a'), 'after');
  assert.equal(journalBase.getItem(FLOW_EDITOR_STORAGE_RECOVERY_KEY), null);
});

test('reload rollback restores only declared editor keys and preserves unrelated later writes', () => {
  const storage = new MemoryStorage();
  const journalStorage = new MemoryStorage();
  storage.setItem('flow:a', 'before');
  storage.setItem('unrelated', 'before');
  const operation = prepareFlowEditorStorageCommit({
    storage,
    recovery: {
      journalStorage,
      transactionId: 'tx-targeted-rollback',
      targetKeys: ['flow:a'],
    },
    commit: () => {
      storage.setItem('flow:a', 'partial');
      throw new Error('simulated process stop');
    },
  });

  assert.throws(() => operation.commit(), /simulated process stop/);
  storage.setItem('unrelated', 'changed later');
  const recovery = recoverFlowEditorStorageCommit({ storage, journalStorage });
  assert.equal(recovery.recovered, true);
  assert.equal(recovery.outcome, 'rolled-back');
  assert.equal(storage.getItem('flow:a'), 'before');
  assert.equal(storage.getItem('unrelated'), 'changed later');
});

test('malformed v2 journals never mutate target, marker, unrelated, or journal bytes', async (t) => {
  const cases: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
    ['empty target list', { targetKeys: [] }],
    ['duplicate target keys', { targetKeys: ['flow:a', 'flow:a'] }],
    ['unsorted target keys', { targetKeys: ['flow:b', 'flow:a'] }],
    ['non-string target key', { targetKeys: ['flow:a', 42] }],
    ['snapshot key outside targets', {
      snapshot: { keys: ['flow:b'], values: { 'flow:b': 'before' } },
    }],
    ['snapshot value missing', {
      snapshot: { keys: ['flow:a'], values: {} },
    }],
    ['snapshot has an extra value', {
      snapshot: { keys: ['flow:a'], values: { 'flow:a': 'before', 'flow:b': 'extra' } },
    }],
    ['snapshot value is not a string', {
      snapshot: { keys: ['flow:a'], values: { 'flow:a': 1 } },
    }],
    ['marker targets a non-contract key', {
      commitMarker: { key: 'unrelated', value: 'tx-valid', previousValue: 'keep' },
    }],
    ['marker is included in target keys', {
      targetKeys: [FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY],
      snapshot: { keys: [], values: {} },
    }],
    ['marker value differs from transaction id', {
      commitMarker: {
        key: FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY,
        value: 'tx-other',
        previousValue: 'prior-marker',
      },
    }],
    ['marker prior value equals transaction id', {
      commitMarker: {
        key: FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY,
        value: 'tx-valid',
        previousValue: 'tx-valid',
      },
    }],
    ['marker prior value has the wrong type', {
      commitMarker: {
        key: FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY,
        value: 'tx-valid',
        previousValue: 1,
      },
    }],
  ];

  for (const [name, overrides] of cases) {
    await t.test(name, () => {
      const storage = new MemoryStorage();
      const journalStorage = new MemoryStorage();
      storage.setItem('flow:a', 'partial');
      storage.setItem('unrelated', 'keep');
      storage.setItem(FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY, 'prior-marker');
      const raw = JSON.stringify(validRecoveryJournal(overrides));
      journalStorage.setItem(FLOW_EDITOR_STORAGE_RECOVERY_KEY, raw);
      const before = captureFlowEditorRawStorage(storage);

      assert.deepEqual(recoverFlowEditorStorageCommit({ storage, journalStorage }), {
        found: true,
        recovered: false,
      });
      assert.equal(isFlowEditorRawStorageEqual(storage, before), true);
      assert.equal(journalStorage.getItem(FLOW_EDITOR_STORAGE_RECOVERY_KEY), raw);
    });
  }
});

test('a valid journal with an unexpected current marker does not roll back any bytes', () => {
  const storage = new MemoryStorage();
  const journalStorage = new MemoryStorage();
  storage.setItem('flow:a', 'later-write');
  storage.setItem('unrelated', 'keep');
  storage.setItem(FLOW_EDITOR_STORAGE_COMMIT_MARKER_KEY, 'tx-later');
  const raw = JSON.stringify(validRecoveryJournal());
  journalStorage.setItem(FLOW_EDITOR_STORAGE_RECOVERY_KEY, raw);
  const before = captureFlowEditorRawStorage(storage);

  assert.deepEqual(recoverFlowEditorStorageCommit({ storage, journalStorage }), {
    found: true,
    recovered: false,
    transactionId: 'tx-valid',
  });
  assert.equal(isFlowEditorRawStorageEqual(storage, before), true);
  assert.equal(journalStorage.getItem(FLOW_EDITOR_STORAGE_RECOVERY_KEY), raw);
});

test('recovery accepts an explicitly configured marker key and rejects ambiguous creation', () => {
  const storage = new MemoryStorage();
  const journalStorage = new MemoryStorage();
  storage.setItem('flow:a', 'before');
  const operation = prepareFlowEditorStorageCommit({
    storage,
    recovery: {
      journalStorage,
      transactionId: 'tx-custom-marker',
      targetKeys: ['flow:a'],
      commitMarkerKey: 'flow:custom-marker',
    },
    commit: () => {
      storage.setItem('flow:a', 'partial');
      throw new Error('process stop');
    },
  });
  assert.throws(() => operation.commit(), /process stop/);
  assert.deepEqual(recoverFlowEditorStorageCommit({
    storage,
    journalStorage,
    commitMarkerKey: 'flow:custom-marker',
  }), {
    found: true,
    recovered: true,
    transactionId: 'tx-custom-marker',
    outcome: 'rolled-back',
  });
  assert.equal(storage.getItem('flow:a'), 'before');

  storage.setItem('flow:custom-marker', 'tx-duplicate');
  assert.throws(() => prepareFlowEditorStorageCommit({
    storage,
    recovery: {
      journalStorage,
      transactionId: 'tx-duplicate',
      targetKeys: ['flow:a'],
      commitMarkerKey: 'flow:custom-marker',
    },
    commit: () => undefined,
  }), /transaction id must differ/);
});
