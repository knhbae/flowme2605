import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  PERSONAL_WORKSPACE_POC_STORAGE_PREFIX,
} from './personal-workspace-poc-contract';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';
import { PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY } from './personal-workspace-poc-storage';
import {
  PERSONAL_WORKSPACE_POC_STORAGE_COMMIT_MARKER_KEY,
  PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY,
  commitPersonalWorkspacePocStorage,
  preparePersonalWorkspacePocStorageCommit,
  recoverPersonalWorkspacePocStorageCommit,
} from './personal-workspace-poc-storage-transaction';

type MutationCall = Readonly<{
  method: 'setItem' | 'removeItem' | 'clear';
  key?: string;
  value?: string;
}>;

class MemoryStorage {
  readonly calls: MutationCall[] = [];
  protected readonly values = new Map<string, string>();

  constructor(seed: Record<string, string> = {}) {
    Object.entries(seed).forEach(([key, value]) => this.values.set(key, value));
  }

  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    this.calls.push({ method: 'setItem', key, value });
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.calls.push({ method: 'removeItem', key });
    this.values.delete(key);
  }
  clear() {
    this.calls.push({ method: 'clear' });
    this.values.clear();
  }
}

function stateAt(iso: string) {
  return createPersonalWorkspacePocState(iso);
}

function assertOnlyPocMutations(storage: MemoryStorage) {
  assert.equal(storage.calls.some((call) => call.method === 'clear'), false);
  assert.equal(
    storage.calls.every(
      (call) => call.key?.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX) === true,
    ),
    true,
  );
}

test('atomically saves state, removes the draft, and cleans PoC-only journal bytes', () => {
  const previousState = JSON.stringify(stateAt('2026-09-01T00:00:00.000Z'));
  const nextState = stateAt('2026-09-02T00:00:00.000Z');
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: previousState,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: '{"version":1,"rawText":"draft"}',
    'flow:saved:sentinel': 'exact-operating-bytes',
  });

  const prepared = preparePersonalWorkspacePocStorageCommit({
    storage,
    state: nextState,
    transactionId: 'tx-success',
    removeAuthoringDraft: true,
  });
  assert.equal(prepared.kind, 'prepared');
  assert.equal(storage.calls.length, 0, 'preparation must be read-only');

  const result = commitPersonalWorkspacePocStorage({
    storage,
    state: nextState,
    transactionId: 'tx-success-from-wrapper',
    removeAuthoringDraft: true,
  });

  assert.deepEqual(result, {
    ok: true,
    kind: 'saved',
    serializedState: JSON.stringify(nextState),
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), JSON.stringify(nextState));
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), null);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY), null);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_COMMIT_MARKER_KEY), null);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'exact-operating-bytes');
  assertOnlyPocMutations(storage);
});

test('returns a true no-op without writing journal, marker, state, or draft', () => {
  const state = stateAt('2026-09-02T00:00:00.000Z');
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: JSON.stringify(state),
    'flow:saved:sentinel': 'same',
  });

  const result = commitPersonalWorkspacePocStorage({
    storage,
    state,
    transactionId: 'tx-no-op',
    removeAuthoringDraft: true,
  });

  assert.deepEqual(result, {
    ok: true,
    kind: 'no-op',
    serializedState: JSON.stringify(state),
  });
  assert.deepEqual(storage.calls, []);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'same');
});

test('a second target operation failure restores both exact previous byte strings', () => {
  const previousState = JSON.stringify(stateAt('2026-09-01T00:00:00.000Z'));
  const draftBytes = '{ "version": 1, "rawText": "exact draft bytes" }';
  class SecondOperationFaultStorage extends MemoryStorage {
    private failed = false;
    override removeItem(key: string) {
      if (key === PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY && !this.failed) {
        this.calls.push({ method: 'removeItem', key });
        this.failed = true;
        throw new Error('simulated-second-target-operation-failure');
      }
      super.removeItem(key);
    }
  }
  const storage = new SecondOperationFaultStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: previousState,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: draftBytes,
    'flow:my-flow:sentinel': 'unchanged',
  });

  const result = commitPersonalWorkspacePocStorage({
    storage,
    state: stateAt('2026-09-02T00:00:00.000Z'),
    transactionId: 'tx-second-operation-failure',
    removeAuthoringDraft: true,
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'simulated-second-target-operation-failure',
    rollback: 'complete',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), previousState);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), draftBytes);
  assert.equal(storage.getItem('flow:my-flow:sentinel'), 'unchanged');
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY), null);
  assertOnlyPocMutations(storage);
});

test('state verification mismatch rolls back exact previous state and draft bytes', () => {
  const previousState = JSON.stringify(stateAt('2026-09-01T00:00:00.000Z'));
  const draftBytes = '{"version":1,"rawText":"keep exactly"}';
  class StateVerificationFaultStorage extends MemoryStorage {
    private distorted = false;
    override setItem(key: string, value: string) {
      if (key === PERSONAL_WORKSPACE_POC_STATE_KEY && !this.distorted) {
        this.calls.push({ method: 'setItem', key, value });
        this.values.set(key, 'distorted-state-bytes');
        this.distorted = true;
        return;
      }
      super.setItem(key, value);
    }
  }
  const storage = new StateVerificationFaultStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: previousState,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: draftBytes,
    'flow:checks:sentinel': 'unchanged',
  });

  const result = commitPersonalWorkspacePocStorage({
    storage,
    state: stateAt('2026-09-02T00:00:00.000Z'),
    transactionId: 'tx-state-verification-failure',
    removeAuthoringDraft: true,
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'personal-workspace-poc-state-verification-failed',
    rollback: 'complete',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), previousState);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), draftBytes);
  assert.equal(storage.getItem('flow:checks:sentinel'), 'unchanged');
  assertOnlyPocMutations(storage);
});

test('draft removal verification mismatch rolls back exact previous state and draft bytes', () => {
  const previousState = JSON.stringify(stateAt('2026-09-01T00:00:00.000Z'));
  const draftBytes = '{"version":1,"rawText":"do not lose"}';
  class DraftVerificationFaultStorage extends MemoryStorage {
    private ignored = false;
    override removeItem(key: string) {
      if (key === PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY && !this.ignored) {
        this.calls.push({ method: 'removeItem', key });
        this.ignored = true;
        return;
      }
      super.removeItem(key);
    }
  }
  const storage = new DraftVerificationFaultStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: previousState,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: draftBytes,
    'flow:map:saved:sentinel': 'same bytes',
  });

  const result = commitPersonalWorkspacePocStorage({
    storage,
    state: stateAt('2026-09-02T00:00:00.000Z'),
    transactionId: 'tx-draft-verification-failure',
    removeAuthoringDraft: true,
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'personal-workspace-poc-draft-mutation-verification-failed',
    rollback: 'complete',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), previousState);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), draftBytes);
  assert.equal(storage.getItem('flow:map:saved:sentinel'), 'same bytes');
  assertOnlyPocMutations(storage);
});

test('atomically restores exact draft bytes with an Undo state write', () => {
  const state = stateAt('2026-09-02T00:00:00.000Z');
  const exactDraftBytes = '{ "version": 1, "rawText": "line one\\r\\nline two 🙂" }';
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: JSON.stringify(stateAt('2026-09-01T00:00:00.000Z')),
    'flow:saved:sentinel': 'unchanged bytes',
  });

  const result = commitPersonalWorkspacePocStorage({
    storage,
    state,
    transactionId: 'tx-undo-draft-restore',
    authoringDraftRawValue: exactDraftBytes,
  });

  assert.deepEqual(result, {
    ok: true,
    kind: 'saved',
    serializedState: JSON.stringify(state),
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), exactDraftBytes);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), JSON.stringify(state));
  assert.equal(storage.getItem('flow:saved:sentinel'), 'unchanged bytes');
  assertOnlyPocMutations(storage);
});

test('conflicting legacy removal and exact draft mutation fail before any write', () => {
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: 'exact-before',
  });
  const result = commitPersonalWorkspacePocStorage({
    storage,
    state: stateAt('2026-09-02T00:00:00.000Z'),
    transactionId: 'tx-conflict',
    removeAuthoringDraft: true,
    authoringDraftRawValue: null,
  });
  assert.deepEqual(result, {
    ok: false,
    error: 'personal-workspace-poc-conflicting-draft-mutation',
    rollback: 'complete',
  });
  assert.deepEqual(storage.calls, []);
});

test('one-time journal cleanup failure is reported after an exact rollback', () => {
  const previousState = JSON.stringify(stateAt('2026-09-01T00:00:00.000Z'));
  const draftBytes = '{"version":1,"rawText":"restore me"}';
  class CleanupFaultStorage extends MemoryStorage {
    private failed = false;
    override removeItem(key: string) {
      if (key === PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY && !this.failed) {
        this.calls.push({ method: 'removeItem', key });
        this.failed = true;
        throw new Error('simulated-journal-cleanup-failure');
      }
      super.removeItem(key);
    }
  }
  const storage = new CleanupFaultStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: previousState,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: draftBytes,
    'flow:saved:sentinel': 'operating bytes',
  });

  const result = commitPersonalWorkspacePocStorage({
    storage,
    state: stateAt('2026-09-02T00:00:00.000Z'),
    transactionId: 'tx-cleanup-once',
    removeAuthoringDraft: true,
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'simulated-journal-cleanup-failure',
    rollback: 'complete',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), previousState);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), draftBytes);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY), null);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_COMMIT_MARKER_KEY), null);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'operating bytes');
  assertOnlyPocMutations(storage);
});

test('persistent cleanup failure stays recovery-required and can recover on reload', () => {
  const previousState = JSON.stringify(stateAt('2026-09-01T00:00:00.000Z'));
  const draftBytes = '{"version":1,"rawText":"recover on reload"}';
  class PersistentCleanupFaultStorage extends MemoryStorage {
    refuseCleanup = true;
    override removeItem(key: string) {
      if (key === PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY && this.refuseCleanup) {
        this.calls.push({ method: 'removeItem', key });
        throw new Error('persistent-journal-cleanup-failure');
      }
      super.removeItem(key);
    }
  }
  const storage = new PersistentCleanupFaultStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: previousState,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: draftBytes,
    'flow:saved:sentinel': 'exact',
  });

  const result = commitPersonalWorkspacePocStorage({
    storage,
    state: stateAt('2026-09-02T00:00:00.000Z'),
    transactionId: 'tx-cleanup-persistent',
    removeAuthoringDraft: true,
  });
  assert.deepEqual(result, {
    ok: false,
    error: 'persistent-journal-cleanup-failure',
    rollback: 'recovery-required',
  });
  assert.ok(storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY));
  assert.equal(storage.getItem('flow:saved:sentinel'), 'exact');

  storage.refuseCleanup = false;
  assert.deepEqual(recoverPersonalWorkspacePocStorageCommit(storage), {
    found: true,
    recovered: true,
    transactionId: 'tx-cleanup-persistent',
    outcome: 'rolled-back',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), previousState);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), draftBytes);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY), null);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_COMMIT_MARKER_KEY), null);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'exact');
  assertOnlyPocMutations(storage);
});

test('incomplete target rollback retains a journal and later reload restores exact bytes', () => {
  const previousState = JSON.stringify(stateAt('2026-09-01T00:00:00.000Z'));
  const draftBytes = '{"version":1,"rawText":"unchanged draft"}';
  class RollbackFaultStorage extends MemoryStorage {
    refuseStateRestore = true;
    private targetWriteSeen = false;
    override setItem(key: string, value: string) {
      if (key === PERSONAL_WORKSPACE_POC_STATE_KEY) {
        if (this.targetWriteSeen && this.refuseStateRestore && value === previousState) {
          this.calls.push({ method: 'setItem', key, value });
          throw new Error('simulated-state-rollback-failure');
        }
        this.targetWriteSeen = true;
      }
      super.setItem(key, value);
    }
    override removeItem(key: string) {
      if (key === PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY) {
        this.calls.push({ method: 'removeItem', key });
        throw new Error('simulated-second-target-operation-failure');
      }
      super.removeItem(key);
    }
  }
  const storage = new RollbackFaultStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: previousState,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: draftBytes,
    'flow:saved:sentinel': 'exact',
  });

  const result = commitPersonalWorkspacePocStorage({
    storage,
    state: stateAt('2026-09-02T00:00:00.000Z'),
    transactionId: 'tx-rollback-reload',
    removeAuthoringDraft: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok ? '' : result.rollback, 'recovery-required');
  assert.ok(storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY));
  assert.equal(storage.getItem('flow:saved:sentinel'), 'exact');

  storage.refuseStateRestore = false;
  assert.deepEqual(recoverPersonalWorkspacePocStorageCommit(storage), {
    found: true,
    recovered: true,
    transactionId: 'tx-rollback-reload',
    outcome: 'rolled-back',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), previousState);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), draftBytes);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'exact');
  assertOnlyPocMutations(storage);
});

test('corrupt or out-of-bound recovery journals fail closed without any mutation', async (t) => {
  const cases = [
    ['invalid json', '{broken'],
    ['operating target', JSON.stringify({
      schemaVersion: 2,
      transactionId: 'tx-malicious',
      createdAt: '2026-09-02T00:00:00.000Z',
      targetKeys: ['flow:saved:sentinel'],
      snapshot: {
        keys: ['flow:saved:sentinel'],
        values: { 'flow:saved:sentinel': 'attacker-selected-before' },
      },
      commitMarker: {
        key: PERSONAL_WORKSPACE_POC_STORAGE_COMMIT_MARKER_KEY,
        value: 'tx-malicious',
        previousValue: null,
      },
    })],
    ['wrong marker', JSON.stringify({
      schemaVersion: 2,
      transactionId: 'tx-wrong-marker',
      createdAt: '2026-09-02T00:00:00.000Z',
      targetKeys: [PERSONAL_WORKSPACE_POC_STATE_KEY],
      snapshot: { keys: [], values: {} },
      commitMarker: {
        key: 'flow:saved:sentinel',
        value: 'tx-wrong-marker',
        previousValue: null,
      },
    })],
  ] as const;

  for (const [name, journalBytes] of cases) {
    await t.test(name, () => {
      const currentState = JSON.stringify(stateAt('2026-09-01T00:00:00.000Z'));
      const storage = new MemoryStorage({
        [PERSONAL_WORKSPACE_POC_STATE_KEY]: currentState,
        [PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY]: journalBytes,
        'flow:saved:sentinel': 'exact-operating-bytes',
      });

      assert.deepEqual(recoverPersonalWorkspacePocStorageCommit(storage), {
        found: true,
        recovered: false,
      });
      const saveResult = commitPersonalWorkspacePocStorage({
        storage,
        state: stateAt('2026-09-02T00:00:00.000Z'),
        transactionId: `tx-after-${name}`,
        removeAuthoringDraft: true,
      });
      assert.deepEqual(saveResult, {
        ok: false,
        error: 'personal-workspace-poc-recovery-required',
        rollback: 'recovery-required',
      });
      assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), currentState);
      assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY), journalBytes);
      assert.equal(storage.getItem('flow:saved:sentinel'), 'exact-operating-bytes');
      assert.deepEqual(storage.calls, []);
    });
  }
});
