import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION,
  consumePublicFlowSaveHandoff,
  getPublicFlowSaveHandoffStorageKey,
  undoPublicFlowSaveHandoff,
  writePublicFlowSaveHandoff,
  type PublicFlowSaveDecision,
  type PublicFlowSaveHandoff,
} from './public-flow-save-handoff';

function memoryStorage(
  initial: Record<string, string> = {},
  failures: { set?: string[]; remove?: string[] } = {},
) {
  const values = new Map(Object.entries(initial));
  const setFailures = new Set(failures.set ?? []);
  const removeFailures = new Set(failures.remove ?? []);
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (setFailures.has(key)) throw new Error(`set failed: ${key}`);
      values.set(key, value);
    },
    removeItem(key: string) {
      if (removeFailures.has(key)) throw new Error(`remove failed: ${key}`);
      values.delete(key);
    },
  };
}

class InstrumentedUndoStorage {
  private readonly values: Map<string, string>;

  private readonly failedReadCalls: Set<number>;

  private readonly failedMutationCalls: Set<number>;

  readCalls = 0;

  mutationCalls = 0;

  constructor(
    initial: Record<string, string>,
    failures: { reads?: number[]; mutations?: number[] } = {},
  ) {
    this.values = new Map(Object.entries(initial));
    this.failedReadCalls = new Set(failures.reads ?? []);
    this.failedMutationCalls = new Set(failures.mutations ?? []);
  }

  getItem(key: string): string | null {
    this.readCalls += 1;
    if (this.failedReadCalls.has(this.readCalls)) {
      throw new Error(`get failed at ${this.readCalls}: ${key}`);
    }
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.mutationCalls += 1;
    if (this.failedMutationCalls.has(this.mutationCalls)) {
      throw new Error(`set failed at ${this.mutationCalls}: ${key}`);
    }
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.mutationCalls += 1;
    if (this.failedMutationCalls.has(this.mutationCalls)) {
      throw new Error(`remove failed at ${this.mutationCalls}: ${key}`);
    }
    this.values.delete(key);
  }

  snapshot(keys: readonly string[]): Record<string, string | null> {
    return Object.fromEntries(keys.map((key) => [key, this.values.get(key) ?? null]));
  }
}

function handoffInput(decision: PublicFlowSaveDecision = 'overwrite') {
  return {
    token: `handoff-${decision}`,
    sourceFlowSlug: 'moving-d30-basic',
    personalCopyKey: decision === 'copy' ? 'moving-copy-2' : 'moving-copy-1',
    idempotencyKey: `save-request-${decision}`,
    itemCount: 24,
    decision,
    targetHref: `/my?view=flows&flow=moving-d30-basic&copy=${decision}`,
    rawBackup: {
      keys: ['flow:saved:moving-d30-basic', 'flow:meta:last-visit'],
      values: {
        'flow:saved:moving-d30-basic': '{"savedAt":"before"}',
        'flow:meta:last-visit': null,
      },
    },
    expectedPostSaveRaw: {
      keys: ['flow:saved:moving-d30-basic', 'flow:meta:last-visit'],
      values: {
        'flow:saved:moving-d30-basic': '{"savedAt":"after"}',
        'flow:meta:last-visit': '/flows/moving-d30-basic',
      },
    },
  } as const;
}

test('session handoff round-trips once and removes its token-specific key', () => {
  const storage = memoryStorage();
  const input = handoffInput();
  const written = writePublicFlowSaveHandoff(storage, input);
  const storageKey = getPublicFlowSaveHandoffStorageKey(input.token);

  assert.ok(written);
  assert.ok(storageKey);
  assert.ok(storage.getItem(storageKey));
  assert.deepEqual(consumePublicFlowSaveHandoff(storage, input.token), written);
  assert.equal(storage.getItem(storageKey), null);
  assert.equal(consumePublicFlowSaveHandoff(storage, input.token), undefined);
});

test('malformed handoff is removed instead of becoming repeatable', () => {
  const token = 'malformed-token';
  const storageKey = getPublicFlowSaveHandoffStorageKey(token);
  assert.ok(storageKey);
  const storage = memoryStorage({ [storageKey]: '{broken' });

  assert.equal(consumePublicFlowSaveHandoff(storage, token), undefined);
  assert.equal(storage.getItem(storageKey), null);
});

test('payload token mismatch is rejected and the requested key is removed', () => {
  const requestedToken = 'requested-token';
  const storageKey = getPublicFlowSaveHandoffStorageKey(requestedToken);
  assert.ok(storageKey);
  const mismatched: PublicFlowSaveHandoff = {
    schemaVersion: PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION,
    ...handoffInput(),
    token: 'different-token',
  };
  const storage = memoryStorage({ [storageKey]: JSON.stringify(mismatched) });

  assert.equal(consumePublicFlowSaveHandoff(storage, requestedToken), undefined);
  assert.equal(storage.getItem(storageKey), null);
});

test('copy and overwrite decisions preserve their distinct identity payloads', () => {
  for (const decision of ['copy', 'overwrite'] as const) {
    const storage = memoryStorage();
    const input = handoffInput(decision);
    const written = writePublicFlowSaveHandoff(storage, input);
    const consumed = consumePublicFlowSaveHandoff(storage, input.token);

    assert.equal(written?.decision, decision);
    assert.equal(consumed?.decision, decision);
    assert.equal(consumed?.personalCopyKey, input.personalCopyKey);
    assert.equal(consumed?.idempotencyKey, input.idempotencyKey);
  }
});

test('undo restores exact raw values and removes keys that did not exist before save', () => {
  const handoff: PublicFlowSaveHandoff = {
    schemaVersion: PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION,
    ...handoffInput('copy'),
    rawBackup: {
      keys: ['flow:saved:existing', 'flow:saved:new-copy'],
      values: {
        'flow:saved:existing': '{"exact":"before bytes"}',
        'flow:saved:new-copy': null,
      },
    },
    expectedPostSaveRaw: {
      keys: ['flow:saved:existing', 'flow:saved:new-copy'],
      values: {
        'flow:saved:existing': '{"changed":true}',
        'flow:saved:new-copy': '{"created":true}',
      },
    },
  };
  const storage = memoryStorage({
    'flow:saved:existing': '{"changed":true}',
    'flow:saved:new-copy': '{"created":true}',
  });

  const result = undoPublicFlowSaveHandoff(storage, handoff);

  assert.deepEqual(result, {
    complete: true,
    restoredKeys: ['flow:saved:new-copy', 'flow:saved:existing'],
    failedKeys: [],
    conflictKeys: [],
    rollbackComplete: true,
  });
  assert.equal(storage.getItem('flow:saved:existing'), '{"exact":"before bytes"}');
  assert.equal(storage.getItem('flow:saved:new-copy'), null);
});

test('a global peer mutation after save reports a conflict and performs zero writes', () => {
  const keys = ['flow:saved:moving-copy-2', 'flow_builder_mvp_item_drafts'];
  const handoff: PublicFlowSaveHandoff = {
    schemaVersion: PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION,
    ...handoffInput('copy'),
    rawBackup: {
      keys,
      values: {
        'flow:saved:moving-copy-2': null,
        flow_builder_mvp_item_drafts: '{"peer":"before-save"}',
      },
    },
    expectedPostSaveRaw: {
      keys,
      values: {
        'flow:saved:moving-copy-2': '{"schemaVersion":2}',
        flow_builder_mvp_item_drafts: '{"peer":"save-result"}',
      },
    },
  };
  const afterPeerMutation = {
    'flow:saved:moving-copy-2': '{"schemaVersion":2}',
    flow_builder_mvp_item_drafts: '{"peer":"changed-after-save"}',
  };
  const storage = new InstrumentedUndoStorage(afterPeerMutation);
  const beforeUndo = storage.snapshot(keys);

  const result = undoPublicFlowSaveHandoff(storage, handoff);

  assert.deepEqual(result, {
    complete: false,
    restoredKeys: [],
    failedKeys: [],
    conflictKeys: ['flow_builder_mvp_item_drafts'],
    rollbackComplete: true,
  });
  assert.equal(storage.mutationCalls, 0);
  assert.deepEqual(storage.snapshot(keys), beforeUndo);
});

test('a follow-up mutation to the saved personal copy blocks stale undo without partial restore', () => {
  const keys = ['flow:saved:moving-copy-2', 'flow:moving-copy-2:anchorDate'];
  const handoff: PublicFlowSaveHandoff = {
    schemaVersion: PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION,
    ...handoffInput('copy'),
    rawBackup: {
      keys,
      values: {
        'flow:saved:moving-copy-2': null,
        'flow:moving-copy-2:anchorDate': null,
      },
    },
    expectedPostSaveRaw: {
      keys,
      values: {
        'flow:saved:moving-copy-2': '{"savedAt":"initial-save"}',
        'flow:moving-copy-2:anchorDate': '2026-08-04',
      },
    },
  };
  const afterFollowUpMutation = {
    'flow:saved:moving-copy-2': '{"savedAt":"follow-up-edit"}',
    'flow:moving-copy-2:anchorDate': '2026-08-04',
  };
  const storage = new InstrumentedUndoStorage(afterFollowUpMutation);
  const beforeUndo = storage.snapshot(keys);

  const result = undoPublicFlowSaveHandoff(storage, handoff);

  assert.deepEqual(result, {
    complete: false,
    restoredKeys: [],
    failedKeys: [],
    conflictKeys: ['flow:saved:moving-copy-2'],
    rollbackComplete: true,
  });
  assert.equal(storage.mutationCalls, 0);
  assert.deepEqual(storage.snapshot(keys), beforeUndo);
});

test('a failure at every undo mutation position atomically restores the pre-undo snapshot', () => {
  const keys = ['flow:undo:a', 'flow:undo:b', 'flow:undo:c', 'flow:undo:d'];
  const handoff: PublicFlowSaveHandoff = {
    schemaVersion: PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION,
    ...handoffInput(),
    rawBackup: {
      keys,
      values: {
        'flow:undo:a': 'before-a',
        'flow:undo:b': null,
        'flow:undo:c': 'before-c',
        'flow:undo:d': null,
      },
    },
    expectedPostSaveRaw: {
      keys,
      values: {
        'flow:undo:a': 'after-a',
        'flow:undo:b': 'after-b',
        'flow:undo:c': 'after-c',
        'flow:undo:d': 'after-d',
      },
    },
  };
  const afterSave = {
    'flow:undo:a': 'after-a',
    'flow:undo:b': 'after-b',
    'flow:undo:c': 'after-c',
    'flow:undo:d': 'after-d',
  };
  const restoreOrder = [...keys].reverse();

  for (let failAt = 1; failAt <= keys.length; failAt += 1) {
    const storage = new InstrumentedUndoStorage(afterSave, { mutations: [failAt] });
    const beforeUndo = storage.snapshot(keys);
    const result = undoPublicFlowSaveHandoff(storage, handoff);

    assert.equal(result.complete, false, `failure ${failAt} completion`);
    assert.equal(result.rollbackComplete, true, `failure ${failAt} rollback`);
    assert.deepEqual(result.failedKeys, [restoreOrder[failAt - 1]]);
    assert.deepEqual(result.restoredKeys, restoreOrder.slice(0, failAt - 1));
    assert.deepEqual(storage.snapshot(keys), beforeUndo, `failure ${failAt} exact state`);
  }
});

test('a getItem failure at every snapshot position aborts before the first mutation', () => {
  const keys = ['flow:undo:a', 'flow:undo:b', 'flow:undo:c'];
  const handoff: PublicFlowSaveHandoff = {
    schemaVersion: PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION,
    ...handoffInput(),
    rawBackup: {
      keys,
      values: {
        'flow:undo:a': 'before-a',
        'flow:undo:b': null,
        'flow:undo:c': 'before-c',
      },
    },
    expectedPostSaveRaw: {
      keys,
      values: {
        'flow:undo:a': 'after-a',
        'flow:undo:b': 'after-b',
        'flow:undo:c': 'after-c',
      },
    },
  };
  const afterSave = {
    'flow:undo:a': 'after-a',
    'flow:undo:b': 'after-b',
    'flow:undo:c': 'after-c',
  };

  for (let failAt = 1; failAt <= keys.length; failAt += 1) {
    const storage = new InstrumentedUndoStorage(afterSave, { reads: [failAt] });
    const beforeUndo = storage.snapshot(keys);
    const result = undoPublicFlowSaveHandoff(storage, handoff);

    assert.deepEqual(result, {
      complete: false,
      restoredKeys: [],
      failedKeys: [keys[failAt - 1]],
      conflictKeys: [],
      rollbackComplete: true,
    });
    assert.equal(storage.mutationCalls, 0);
    assert.deepEqual(storage.snapshot(keys), beforeUndo);
  }
});

test('an undo rollback mutation failure is reported without claiming atomic recovery', () => {
  const keys = ['flow:undo:a', 'flow:undo:b', 'flow:undo:c', 'flow:undo:d'];
  const handoff: PublicFlowSaveHandoff = {
    schemaVersion: PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION,
    ...handoffInput(),
    rawBackup: {
      keys,
      values: {
        'flow:undo:a': 'before-a',
        'flow:undo:b': null,
        'flow:undo:c': 'before-c',
        'flow:undo:d': null,
      },
    },
    expectedPostSaveRaw: {
      keys,
      values: {
        'flow:undo:a': 'after-a',
        'flow:undo:b': 'after-b',
        'flow:undo:c': 'after-c',
        'flow:undo:d': 'after-d',
      },
    },
  };
  const afterSave = {
    'flow:undo:a': 'after-a',
    'flow:undo:b': 'after-b',
    'flow:undo:c': 'after-c',
    'flow:undo:d': 'after-d',
  };
  const storage = new InstrumentedUndoStorage(afterSave, {
    // Undo mutation 2 fails. Rollback then runs at calls 3..6; call 6 is the
    // key changed by undo mutation 1, so the pre-undo state stays incomplete.
    mutations: [2, 6],
  });

  const result = undoPublicFlowSaveHandoff(storage, handoff);

  assert.deepEqual(result, {
    complete: false,
    restoredKeys: ['flow:undo:d'],
    failedKeys: ['flow:undo:c'],
    conflictKeys: [],
    rollbackComplete: false,
  });
  assert.notDeepEqual(storage.snapshot(keys), afterSave);
  assert.equal(storage.snapshot(keys)['flow:undo:d'], null);
});

test('a throwing handoff key getter is contained before storage is read or mutated', () => {
  const storage = new InstrumentedUndoStorage({});
  const hostileHandoff = Object.defineProperty({}, 'schemaVersion', {
    get() {
      throw new Error('hostile key getter');
    },
  }) as PublicFlowSaveHandoff;

  assert.deepEqual(undoPublicFlowSaveHandoff(storage, hostileHandoff), {
    complete: false,
    restoredKeys: [],
    failedKeys: [],
    conflictKeys: [],
    rollbackComplete: true,
  });
  assert.equal(storage.readCalls, 0);
  assert.equal(storage.mutationCalls, 0);
});

test('invalid token and identity values are never written', () => {
  const storage = memoryStorage();

  assert.equal(
    writePublicFlowSaveHandoff(storage, { ...handoffInput(), token: '../handoff' }),
    undefined,
  );
  assert.equal(
    writePublicFlowSaveHandoff(storage, { ...handoffInput(), personalCopyKey: '' }),
    undefined,
  );
  assert.equal(
    writePublicFlowSaveHandoff(storage, { ...handoffInput(), targetHref: 'https://example.com/my' }),
    undefined,
  );
  assert.equal(
    writePublicFlowSaveHandoff(storage, {
      ...handoffInput(),
      expectedPostSaveRaw: {
        keys: ['flow:saved:moving-d30-basic'],
        values: {
          'flow:saved:moving-d30-basic': '{"savedAt":"after"}',
        },
      },
    }),
    undefined,
  );
});
