import assert from 'node:assert/strict';
import test from 'node:test';

import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import {
  PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
  createPersonalWorkspacePocCreatorDraftLibrary,
  transitionPersonalWorkspacePocCreatorDraftLibrary,
  type PersonalWorkspacePocCreatorDraftLibrary,
} from './personal-workspace-poc-creator-drafts';
import {
  PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY,
  PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY,
  commitPersonalWorkspacePocCreatorDraftStorage,
  recoverPersonalWorkspacePocCreatorDraftStorage,
} from './personal-workspace-poc-creator-draft-storage-transaction';
import {
  PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
  type PersonalWorkspacePocAuthoringDraft,
} from './personal-workspace-poc-storage';
import { PERSONAL_WORKSPACE_POC_STORAGE_PREFIX } from './personal-workspace-poc-contract';

type StorageCall = Readonly<{
  method: 'setItem' | 'removeItem';
  key: string;
  value?: string;
}>;

class MemoryStorage {
  readonly calls: StorageCall[] = [];
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
}

function addDraft(
  library: PersonalWorkspacePocCreatorDraftLibrary,
  draftId: string,
  rawText: string,
  now: string,
) {
  return transitionPersonalWorkspacePocCreatorDraftLibrary(library, {
    type: 'save',
    expectedLibraryRevision: library.revision,
    draftId,
    rawText,
    sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText),
    now,
  }).library;
}

function libraryWithOneDraft(rawText = '# 저장할 초안') {
  return addDraft(
    createPersonalWorkspacePocCreatorDraftLibrary('2026-09-03T00:00:00.000Z'),
    'creator-draft-1',
    rawText,
    '2026-09-03T00:01:00.000Z',
  );
}

function boundDraft(draftId: string, rawText: string): PersonalWorkspacePocAuthoringDraft {
  return {
    version: 1,
    rawText,
    creatorBinding: { owner: 'creator', draftId },
  };
}

function assertOnlyPocMutations(storage: MemoryStorage) {
  assert.equal(
    storage.calls.every((call) => call.key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)),
    true,
  );
}

function recoveryJournalRaw(input: Readonly<{
  transactionId?: string;
  beforeLibrary: string;
  afterLibrary: string;
  beforeDraft: string;
  afterDraft: string;
  previousMarker?: string | null;
}>) {
  const transactionId = input.transactionId ?? 'tx-recover';
  return JSON.stringify({
    schemaVersion: 1,
    transactionId,
    targets: [
      {
        key: PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
        beforeRaw: input.beforeDraft,
        afterRaw: input.afterDraft,
      },
      {
        key: PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
        beforeRaw: input.beforeLibrary,
        afterRaw: input.afterLibrary,
      },
    ],
    commitMarker: {
      key: PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY,
      value: transactionId,
      previousValue: input.previousMarker ?? null,
    },
  });
}

test('atomically saves the library and matching creator-bound working draft', () => {
  const library = libraryWithOneDraft();
  const draft = boundDraft('creator-draft-1', '# 저장할 초안');
  const storage = new MemoryStorage({ 'flow:saved:sentinel': 'exact-operating-bytes' });

  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-save-both',
    expectedLibraryRawValue: null,
    library,
    expectedAuthoringDraftRawValue: null,
    authoringDraft: draft,
  });

  assert.deepEqual(result, {
    ok: true,
    kind: 'saved',
    serializedLibrary: JSON.stringify(library),
    serializedAuthoringDraft: JSON.stringify(draft),
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), JSON.stringify(library));
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), JSON.stringify(draft));
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY), null);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY), null);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'exact-operating-bytes');
  assertOnlyPocMutations(storage);
});

test('opens another saved draft by changing only the binding bytes while preserving library bytes', () => {
  let library = libraryWithOneDraft('# 첫 초안');
  library = addDraft(library, 'creator-draft-2', '# 둘째 초안', '2026-09-03T00:02:00.000Z');
  const libraryRaw = JSON.stringify(library);
  const beforeDraftRaw = JSON.stringify(boundDraft('creator-draft-1', '# 첫 초안'));
  const afterDraft = boundDraft('creator-draft-2', '# 둘째 초안');
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: libraryRaw,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: beforeDraftRaw,
  });

  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-open-second',
    expectedLibraryRawValue: libraryRaw,
    library,
    expectedAuthoringDraftRawValue: beforeDraftRaw,
    authoringDraft: afterDraft,
  });

  assert.equal(result.ok, true);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), libraryRaw);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), JSON.stringify(afterDraft));
  assert.equal(
    storage.calls.filter((call) => call.key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY).length,
    0,
  );
});

test('stale library or working-draft CAS and a true no-op perform zero mutations', async (t) => {
  const library = libraryWithOneDraft();
  const libraryRaw = JSON.stringify(library);
  const draft = boundDraft('creator-draft-1', '# 저장할 초안');
  const draftRaw = JSON.stringify(draft);
  const cases = [
    ['library stale', '{different}', draftRaw, 'stale-creator-draft-storage'],
    ['draft stale', libraryRaw, '{different}', 'stale-creator-draft-storage'],
    ['no-op', libraryRaw, draftRaw, 'no-op'],
  ] as const;

  for (const [name, actualLibrary, actualDraft, expected] of cases) {
    await t.test(name, () => {
      const storage = new MemoryStorage({
        [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: actualLibrary,
        [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: actualDraft,
      });
      const result = commitPersonalWorkspacePocCreatorDraftStorage({
        storage,
        transactionId: `tx-${name}`,
        expectedLibraryRawValue: libraryRaw,
        library,
        expectedAuthoringDraftRawValue: draftRaw,
        authoringDraft: draft,
      });
      if (expected === 'no-op') {
        assert.equal(result.ok, true);
        assert.equal(result.ok ? result.kind : '', 'no-op');
      } else {
        assert.deepEqual(result, {
          ok: false,
          error: expected,
          rollback: 'not-needed',
        });
      }
      assert.deepEqual(storage.calls, []);
    });
  }
});

test('CAS compares exact bytes even when JSON values are semantically equal', () => {
  const library = libraryWithOneDraft();
  const canonicalLibraryRaw = JSON.stringify(library);
  const spacedLibraryRaw = JSON.stringify(library, null, 2);
  const draft = boundDraft('creator-draft-1', '# 저장할 초안');
  const draftRaw = JSON.stringify(draft);
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: spacedLibraryRaw,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: draftRaw,
  });
  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-byte-level-cas',
    expectedLibraryRawValue: canonicalLibraryRaw,
    library,
    expectedAuthoringDraftRawValue: draftRaw,
    authoringDraft: draft,
  });
  assert.deepEqual(result, {
    ok: false,
    error: 'stale-creator-draft-storage',
    rollback: 'not-needed',
  });
  assert.deepEqual(storage.calls, []);
});

test('an outstanding recovery journal blocks even a no-op before any mutation', () => {
  const library = libraryWithOneDraft();
  const draft = boundDraft('creator-draft-1', '# 저장할 초안');
  const libraryRaw = JSON.stringify(library);
  const draftRaw = JSON.stringify(draft);
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: libraryRaw,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: draftRaw,
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY]: '{pending}',
  });
  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-blocked',
    expectedLibraryRawValue: libraryRaw,
    library,
    expectedAuthoringDraftRawValue: draftRaw,
    authoringDraft: draft,
  });
  assert.deepEqual(result, {
    ok: false,
    error: 'personal-workspace-poc-creator-draft-recovery-required',
    rollback: 'recovery-required',
  });
  assert.deepEqual(storage.calls, []);
});

test('rejects a mismatched or unbound working draft before reading target values or writing', async (t) => {
  const library = libraryWithOneDraft();
  const invalidDrafts: PersonalWorkspacePocAuthoringDraft[] = [
    { version: 1, rawText: '# 저장할 초안' },
    boundDraft('missing-draft', '# 저장할 초안'),
    boundDraft('creator-draft-1', '# 다른 bytes'),
  ];
  for (const authoringDraft of invalidDrafts) {
    await t.test(JSON.stringify(authoringDraft), () => {
      const storage = new MemoryStorage();
      const result = commitPersonalWorkspacePocCreatorDraftStorage({
        storage,
        transactionId: 'tx-invalid-binding',
        expectedLibraryRawValue: null,
        library,
        expectedAuthoringDraftRawValue: null,
        authoringDraft,
      });
      assert.deepEqual(result, {
        ok: false,
        error: 'invalid-creator-draft-transaction',
        rollback: 'not-needed',
      });
      assert.deepEqual(storage.calls, []);
    });
  }
});

test('atomically archives the currently bound record and removes its creator binding', () => {
  const beforeLibrary = libraryWithOneDraft('# 보관할 초안');
  const beforeLibraryRaw = JSON.stringify(beforeLibrary);
  const beforeDraft = boundDraft('creator-draft-1', '# 보관할 초안');
  const beforeDraftRaw = JSON.stringify(beforeDraft);
  const archived = transitionPersonalWorkspacePocCreatorDraftLibrary(beforeLibrary, {
    type: 'archive',
    expectedLibraryRevision: beforeLibrary.revision,
    expectedRecordRevision: 1,
    draftId: 'creator-draft-1',
    now: '2026-09-03T00:02:00.000Z',
  }).library;
  const unboundDraft: PersonalWorkspacePocAuthoringDraft = {
    version: 1,
    rawText: '# 보관할 초안',
  };
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: beforeLibraryRaw,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: beforeDraftRaw,
    'flow:saved:sentinel': 'exact',
  });

  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-archive-unbind',
    expectedLibraryRawValue: beforeLibraryRaw,
    library: archived,
    expectedAuthoringDraftRawValue: beforeDraftRaw,
    authoringDraft: unboundDraft,
  });

  assert.equal(result.ok, true);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), JSON.stringify(archived));
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), JSON.stringify(unboundDraft));
  assert.equal(storage.getItem('flow:saved:sentinel'), 'exact');
  assertOnlyPocMutations(storage);
});

test('atomically undoes a library save and unbinds the removed working draft', () => {
  const beforeLibrary = libraryWithOneDraft('# Undo 뒤에도 보존할 원문');
  const beforeLibraryRaw = JSON.stringify(beforeLibrary);
  const beforeDraft = boundDraft('creator-draft-1', '# Undo 뒤에도 보존할 원문');
  const beforeDraftRaw = JSON.stringify(beforeDraft);
  const undone = transitionPersonalWorkspacePocCreatorDraftLibrary(beforeLibrary, {
    type: 'undo',
    expectedLibraryRevision: beforeLibrary.revision,
    now: '2026-09-03T00:02:00.000Z',
  }).library;
  const unboundDraft: PersonalWorkspacePocAuthoringDraft = {
    version: 1,
    rawText: '# Undo 뒤에도 보존할 원문',
  };
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: beforeLibraryRaw,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: beforeDraftRaw,
    'flow:saved:sentinel': 'exact',
  });

  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-undo-unbind',
    expectedLibraryRawValue: beforeLibraryRaw,
    library: undone,
    expectedAuthoringDraftRawValue: beforeDraftRaw,
    authoringDraft: unboundDraft,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(undone.records, {});
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), JSON.stringify(undone));
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), JSON.stringify(unboundDraft));
  assert.equal(storage.getItem('flow:saved:sentinel'), 'exact');
  assertOnlyPocMutations(storage);
});

test('a second target failure restores both previous byte strings and removes the journal', () => {
  const beforeLibrary = libraryWithOneDraft('# 이전 초안');
  const beforeLibraryRaw = JSON.stringify(beforeLibrary);
  const beforeDraftRaw = JSON.stringify(boundDraft('creator-draft-1', '# 이전 초안'));
  const afterLibrary = addDraft(
    beforeLibrary,
    'creator-draft-2',
    '# 새 초안',
    '2026-09-03T00:02:00.000Z',
  );
  const afterDraft = boundDraft('creator-draft-2', '# 새 초안');

  class SecondTargetFaultStorage extends MemoryStorage {
    private failed = false;
    override setItem(key: string, value: string) {
      if (key === PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY && !this.failed) {
        this.failed = true;
        this.calls.push({ method: 'setItem', key, value });
        throw new Error('simulated-second-target-failure');
      }
      super.setItem(key, value);
    }
  }
  const storage = new SecondTargetFaultStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: beforeLibraryRaw,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: beforeDraftRaw,
    'flow:saved:sentinel': 'same bytes',
  });
  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-second-target-fails',
    expectedLibraryRawValue: beforeLibraryRaw,
    library: afterLibrary,
    expectedAuthoringDraftRawValue: beforeDraftRaw,
    authoringDraft: afterDraft,
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'simulated-second-target-failure',
    rollback: 'complete',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), beforeLibraryRaw);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), beforeDraftRaw);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY), null);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'same bytes');
  assertOnlyPocMutations(storage);
});

test('a distorted target is never overwritten during rollback and leaves recovery evidence', () => {
  const library = libraryWithOneDraft();
  const draft = boundDraft('creator-draft-1', '# 저장할 초안');
  class TargetDistortionStorage extends MemoryStorage {
    override setItem(key: string, value: string) {
      if (key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY) {
        super.setItem(key, '{third-target-value');
        return;
      }
      super.setItem(key, value);
    }
  }
  const storage = new TargetDistortionStorage({ 'flow:saved:sentinel': 'same' });
  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-target-distorted',
    expectedLibraryRawValue: null,
    library,
    expectedAuthoringDraftRawValue: null,
    authoringDraft: draft,
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok ? '' : result.rollback, 'recovery-required');
  assert.equal(
    storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY),
    '{third-target-value',
  );
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), null);
  assert.ok(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY));
  assert.equal(storage.getItem('flow:saved:sentinel'), 'same');
});

test('a marker throw-after-write leaves a committed journal that boot recovery finalizes', () => {
  const library = libraryWithOneDraft();
  const draft = boundDraft('creator-draft-1', '# 저장할 초안');
  class MarkerAfterWriteFaultStorage extends MemoryStorage {
    failMarker = true;
    override setItem(key: string, value: string) {
      super.setItem(key, value);
      if (key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY && this.failMarker) {
        this.failMarker = false;
        throw new Error('simulated-marker-after-write');
      }
    }
  }
  const storage = new MarkerAfterWriteFaultStorage({ 'flow:saved:sentinel': 'same' });
  const saved = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-marker-after-write',
    expectedLibraryRawValue: null,
    library,
    expectedAuthoringDraftRawValue: null,
    authoringDraft: draft,
  });
  assert.deepEqual(saved, {
    ok: false,
    error: 'simulated-marker-after-write',
    rollback: 'recovery-required',
  });
  assert.ok(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY));

  assert.deepEqual(recoverPersonalWorkspacePocCreatorDraftStorage(storage), {
    found: true,
    recovered: true,
    transactionId: 'tx-marker-after-write',
    outcome: 'committed',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), JSON.stringify(library));
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), JSON.stringify(draft));
  assert.equal(storage.getItem('flow:saved:sentinel'), 'same');
});

test('a marker failure before write rolls both targets back immediately', () => {
  const library = libraryWithOneDraft();
  const draft = boundDraft('creator-draft-1', '# 저장할 초안');
  class MarkerBeforeWriteFaultStorage extends MemoryStorage {
    override setItem(key: string, value: string) {
      if (key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY) {
        this.calls.push({ method: 'setItem', key, value });
        throw new Error('simulated-marker-before-write');
      }
      super.setItem(key, value);
    }
  }
  const storage = new MarkerBeforeWriteFaultStorage({ 'flow:saved:sentinel': 'same' });
  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-marker-before-write',
    expectedLibraryRawValue: null,
    library,
    expectedAuthoringDraftRawValue: null,
    authoringDraft: draft,
  });
  assert.deepEqual(result, {
    ok: false,
    error: 'simulated-marker-before-write',
    rollback: 'complete',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), null);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), null);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY), null);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'same');
});

test('a journal write mismatch never reaches either target and stays fail-closed', () => {
  const library = libraryWithOneDraft();
  const draft = boundDraft('creator-draft-1', '# 저장할 초안');
  class JournalDistortionStorage extends MemoryStorage {
    override setItem(key: string, value: string) {
      if (key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) {
        super.setItem(key, '{distorted-journal');
        return;
      }
      super.setItem(key, value);
    }
  }
  const storage = new JournalDistortionStorage({ 'flow:saved:sentinel': 'same' });
  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-journal-distorted',
    expectedLibraryRawValue: null,
    library,
    expectedAuthoringDraftRawValue: null,
    authoringDraft: draft,
  });
  assert.deepEqual(result, {
    ok: false,
    error: 'creator-draft-recovery-journal-verification-failed',
    rollback: 'recovery-required',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), null);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), null);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY), '{distorted-journal');
  assert.equal(storage.getItem('flow:saved:sentinel'), 'same');
});

test('journal cleanup failure is finalized as committed by boot recovery', () => {
  const library = libraryWithOneDraft();
  const draft = boundDraft('creator-draft-1', '# 저장할 초안');
  class CleanupFaultStorage extends MemoryStorage {
    refuseCleanup = true;
    override removeItem(key: string) {
      if (key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY && this.refuseCleanup) {
        this.calls.push({ method: 'removeItem', key });
        throw new Error('simulated-journal-cleanup-failure');
      }
      super.removeItem(key);
    }
  }
  const storage = new CleanupFaultStorage();
  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-cleanup-recovery',
    expectedLibraryRawValue: null,
    library,
    expectedAuthoringDraftRawValue: null,
    authoringDraft: draft,
  });
  assert.deepEqual(result, {
    ok: false,
    error: 'simulated-journal-cleanup-failure',
    rollback: 'recovery-required',
  });
  storage.refuseCleanup = false;
  assert.deepEqual(recoverPersonalWorkspacePocCreatorDraftStorage(storage), {
    found: true,
    recovered: true,
    transactionId: 'tx-cleanup-recovery',
    outcome: 'committed',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), JSON.stringify(library));
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), JSON.stringify(draft));
});

test('incomplete immediate rollback keeps the journal and boot restores both exact baselines', () => {
  const beforeLibrary = libraryWithOneDraft('# 이전 초안');
  const beforeLibraryRaw = JSON.stringify(beforeLibrary);
  const beforeDraftRaw = JSON.stringify(boundDraft('creator-draft-1', '# 이전 초안'));
  const afterLibrary = addDraft(
    beforeLibrary,
    'creator-draft-2',
    '# 새 초안',
    '2026-09-03T00:02:00.000Z',
  );
  const afterLibraryRaw = JSON.stringify(afterLibrary);
  const afterDraft = boundDraft('creator-draft-2', '# 새 초안');
  class RollbackFaultStorage extends MemoryStorage {
    refuseRollback = true;
    private secondTargetFailed = false;
    override setItem(key: string, value: string) {
      if (key === PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY && !this.secondTargetFailed) {
        this.secondTargetFailed = true;
        this.calls.push({ method: 'setItem', key, value });
        throw new Error('simulated-second-target-failure');
      }
      if (
        key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY
        && value === beforeLibraryRaw
        && this.getItem(key) === afterLibraryRaw
        && this.refuseRollback
      ) {
        this.calls.push({ method: 'setItem', key, value });
        throw new Error('simulated-library-rollback-failure');
      }
      super.setItem(key, value);
    }
  }
  const storage = new RollbackFaultStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: beforeLibraryRaw,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: beforeDraftRaw,
  });
  const result = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-incomplete-rollback',
    expectedLibraryRawValue: beforeLibraryRaw,
    library: afterLibrary,
    expectedAuthoringDraftRawValue: beforeDraftRaw,
    authoringDraft: afterDraft,
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok ? '' : result.rollback, 'recovery-required');
  assert.ok(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY));

  storage.refuseRollback = false;
  assert.deepEqual(recoverPersonalWorkspacePocCreatorDraftStorage(storage), {
    found: true,
    recovered: true,
    transactionId: 'tx-incomplete-rollback',
    outcome: 'rolled-back',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), beforeLibraryRaw);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), beforeDraftRaw);
});

test('two saves from the same empty baseline allow only the first mutation', () => {
  const library = libraryWithOneDraft();
  const draft = boundDraft('creator-draft-1', '# 저장할 초안');
  const storage = new MemoryStorage();
  const first = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-first-tab',
    expectedLibraryRawValue: null,
    library,
    expectedAuthoringDraftRawValue: null,
    authoringDraft: draft,
  });
  assert.equal(first.ok, true);
  const callCount = storage.calls.length;
  const second = commitPersonalWorkspacePocCreatorDraftStorage({
    storage,
    transactionId: 'tx-second-tab',
    expectedLibraryRawValue: null,
    library,
    expectedAuthoringDraftRawValue: null,
    authoringDraft: draft,
  });
  assert.deepEqual(second, {
    ok: false,
    error: 'stale-creator-draft-storage',
    rollback: 'not-needed',
  });
  assert.equal(storage.calls.length, callCount);
});

test('boot recovery rolls back every before/after target combination when marker is uncommitted', async (t) => {
  const beforeLibrary = JSON.stringify(libraryWithOneDraft('# 이전'));
  const afterLibraryValue = addDraft(
    JSON.parse(beforeLibrary) as PersonalWorkspacePocCreatorDraftLibrary,
    'creator-draft-2',
    '# 이후',
    '2026-09-03T00:02:00.000Z',
  );
  const afterLibrary = JSON.stringify(afterLibraryValue);
  const beforeDraft = JSON.stringify(boundDraft('creator-draft-1', '# 이전'));
  const afterDraft = JSON.stringify(boundDraft('creator-draft-2', '# 이후'));
  const combinations = [
    ['before/before', beforeLibrary, beforeDraft],
    ['after/before', afterLibrary, beforeDraft],
    ['before/after', beforeLibrary, afterDraft],
    ['after/after', afterLibrary, afterDraft],
  ] as const;

  for (const [name, currentLibrary, currentDraft] of combinations) {
    await t.test(name, () => {
      const transactionId = `tx-${name}`;
      const journalRaw = recoveryJournalRaw({
        transactionId,
        beforeLibrary,
        afterLibrary,
        beforeDraft,
        afterDraft,
      });
      const storage = new MemoryStorage({
        [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: currentLibrary,
        [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: currentDraft,
        [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY]: journalRaw,
        'flow:saved:sentinel': 'same',
      });
      assert.deepEqual(recoverPersonalWorkspacePocCreatorDraftStorage(storage), {
        found: true,
        recovered: true,
        transactionId,
        outcome: 'rolled-back',
      });
      assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), beforeLibrary);
      assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), beforeDraft);
      assert.equal(storage.getItem('flow:saved:sentinel'), 'same');
      assertOnlyPocMutations(storage);
    });
  }
});

test('boot recovery performs zero writes when any target or marker has a third value', async (t) => {
  const beforeLibrary = JSON.stringify(libraryWithOneDraft('# 이전'));
  const afterLibraryValue = addDraft(
    JSON.parse(beforeLibrary) as PersonalWorkspacePocCreatorDraftLibrary,
    'creator-draft-2',
    '# 이후',
    '2026-09-03T00:02:00.000Z',
  );
  const afterLibrary = JSON.stringify(afterLibraryValue);
  const beforeDraft = JSON.stringify(boundDraft('creator-draft-1', '# 이전'));
  const afterDraft = JSON.stringify(boundDraft('creator-draft-2', '# 이후'));
  const journalRaw = recoveryJournalRaw({ beforeLibrary, afterLibrary, beforeDraft, afterDraft });
  const cases = [
    ['library third value', '{third-library}', beforeDraft, null],
    ['draft third value', beforeLibrary, '{third-draft}', null],
    ['marker third value', beforeLibrary, beforeDraft, 'another-transaction'],
    ['committed marker with partial targets', afterLibrary, beforeDraft, 'tx-recover'],
  ] as const;

  for (const [name, libraryRaw, draftRaw, marker] of cases) {
    await t.test(name, () => {
      const seed: Record<string, string> = {
        [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: libraryRaw,
        [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: draftRaw,
        [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY]: journalRaw,
      };
      if (marker !== null) seed[PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY] = marker;
      const storage = new MemoryStorage(seed);
      const result = recoverPersonalWorkspacePocCreatorDraftStorage(storage);
      assert.equal(result.found, true);
      assert.equal(result.recovered, false);
      assert.deepEqual(storage.calls, []);
      assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), libraryRaw);
      assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), draftRaw);
      assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY), journalRaw);
    });
  }
});

test('malformed, unsupported, and out-of-bound journals fail closed without mutation', async (t) => {
  const beforeLibrary = JSON.stringify(libraryWithOneDraft('# 이전'));
  const beforeDraft = JSON.stringify(boundDraft('creator-draft-1', '# 이전'));
  const valid = JSON.parse(recoveryJournalRaw({
    beforeLibrary,
    afterLibrary: beforeLibrary,
    beforeDraft,
    afterDraft: beforeDraft,
  })) as Record<string, unknown>;
  const cases = [
    '{broken',
    JSON.stringify({ ...valid, schemaVersion: 2 }),
    JSON.stringify({ ...valid, extra: true }),
    JSON.stringify({
      ...valid,
      targets: [
        {
          key: 'flow:saved:sentinel',
          beforeRaw: 'before',
          afterRaw: 'after',
        },
        ...(valid.targets as unknown[]).slice(1),
      ],
    }),
    JSON.stringify({
      ...valid,
      targets: [...(valid.targets as unknown[])].reverse(),
    }),
  ];

  for (const journalRaw of cases) {
    await t.test(journalRaw.slice(0, 30), () => {
      const storage = new MemoryStorage({
        [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: beforeLibrary,
        [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: beforeDraft,
        [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY]: journalRaw,
        'flow:saved:sentinel': 'exact',
      });
      assert.deepEqual(recoverPersonalWorkspacePocCreatorDraftStorage(storage), {
        found: true,
        recovered: false,
      });
      assert.deepEqual(storage.calls, []);
      assert.equal(storage.getItem('flow:saved:sentinel'), 'exact');
    });
  }
});

test('a completed boot recovery is idempotent', () => {
  const beforeLibrary = JSON.stringify(libraryWithOneDraft('# 이전'));
  const afterLibraryValue = addDraft(
    JSON.parse(beforeLibrary) as PersonalWorkspacePocCreatorDraftLibrary,
    'creator-draft-2',
    '# 이후',
    '2026-09-03T00:02:00.000Z',
  );
  const afterLibrary = JSON.stringify(afterLibraryValue);
  const beforeDraft = JSON.stringify(boundDraft('creator-draft-1', '# 이전'));
  const afterDraft = JSON.stringify(boundDraft('creator-draft-2', '# 이후'));
  const journalRaw = recoveryJournalRaw({ beforeLibrary, afterLibrary, beforeDraft, afterDraft });
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: afterLibrary,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: afterDraft,
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY]: journalRaw,
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY]: 'tx-recover',
  });
  assert.equal(recoverPersonalWorkspacePocCreatorDraftStorage(storage).recovered, true);
  const callCount = storage.calls.length;
  assert.deepEqual(recoverPersonalWorkspacePocCreatorDraftStorage(storage), {
    found: false,
    recovered: true,
  });
  assert.equal(storage.calls.length, callCount);
});
