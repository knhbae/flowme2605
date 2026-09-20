import assert from 'node:assert/strict';
import test from 'node:test';

import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import {
  PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
  createPersonalWorkspacePocCreatorDraftLibrary,
  transitionPersonalWorkspacePocCreatorDraftLibrary,
} from './personal-workspace-poc-creator-drafts';
import {
  loadPersonalWorkspacePocCreatorDraftLibrary,
  savePersonalWorkspacePocCreatorDraftLibrary,
} from './personal-workspace-poc-creator-draft-storage';

class MemoryStorage {
  readonly calls: Array<{ method: 'setItem' | 'removeItem'; key: string; value?: string }> = [];
  protected readonly values = new Map<string, string>();

  constructor(seed: Record<string, string> = {}) {
    Object.entries(seed).forEach(([key, value]) => this.values.set(key, value));
  }

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

function libraryAt(rawText = '# 제작 초안') {
  const initial = createPersonalWorkspacePocCreatorDraftLibrary('2026-09-03T00:00:00.000Z');
  return transitionPersonalWorkspacePocCreatorDraftLibrary(initial, {
    type: 'save',
    expectedLibraryRevision: 0,
    draftId: 'creator-draft-1',
    rawText,
    sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText),
    now: '2026-09-03T00:01:00.000Z',
  }).library;
}

test('round-trips the exact versioned library key without touching operating storage', () => {
  const storage = new MemoryStorage({ 'flow:saved:sentinel': 'exact-operating-bytes' });
  const library = libraryAt();
  const saved = savePersonalWorkspacePocCreatorDraftLibrary({
    storage,
    expectedRawValue: null,
    library,
  });

  assert.deepEqual(saved, {
    ok: true,
    kind: 'saved',
    serialized: JSON.stringify(library),
  });
  assert.deepEqual(loadPersonalWorkspacePocCreatorDraftLibrary(storage), {
    kind: 'ready',
    raw: JSON.stringify(library),
    library,
  });
  assert.equal(storage.getItem('flow:saved:sentinel'), 'exact-operating-bytes');
  assert.deepEqual(storage.calls.map((call) => call.key), [
    PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
  ]);
});

test('empty, corrupt, and unsupported payloads load fail-closed without writes', async (t) => {
  const cases = [
    ['empty', null, { kind: 'empty', raw: null }],
    ['invalid json', '{broken', { kind: 'corrupt', raw: '{broken', reason: 'invalid-json' }],
    ['unsupported version', JSON.stringify({
      ...createPersonalWorkspacePocCreatorDraftLibrary('2026-09-03T00:00:00.000Z'),
      version: 2,
    }), null],
  ] as const;
  for (const [name, raw, expected] of cases) {
    await t.test(name, () => {
      const storage = new MemoryStorage(raw === null ? {} : {
        [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: raw,
      });
      const result = loadPersonalWorkspacePocCreatorDraftLibrary(storage);
      if (expected === null) {
        assert.deepEqual(result, {
          kind: 'corrupt',
          raw,
          reason: 'invalid-creator-draft-library',
        });
      } else {
        assert.deepEqual(result, expected);
      }
      assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), raw);
      assert.equal(storage.calls.length, 0);
    });
  }
});

test('stale CAS and identical bytes produce zero storage mutations', () => {
  const previous = libraryAt('# 이전');
  const previousRaw = JSON.stringify(previous);
  const next = libraryAt('# 다음');
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: previousRaw,
  });

  assert.deepEqual(savePersonalWorkspacePocCreatorDraftLibrary({
    storage,
    expectedRawValue: JSON.stringify(libraryAt('# stale expected')),
    library: next,
  }), {
    ok: false,
    error: 'stale-creator-draft-library',
    rollback: 'not-needed',
  });
  assert.equal(storage.calls.length, 0);

  assert.deepEqual(savePersonalWorkspacePocCreatorDraftLibrary({
    storage,
    expectedRawValue: previousRaw,
    library: previous,
  }), {
    ok: true,
    kind: 'no-op',
    serialized: previousRaw,
  });
  assert.equal(storage.calls.length, 0);
});

test('refuses to overwrite a corrupt expected payload even when its bytes match storage', () => {
  const corruptRaw = '{broken';
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: corruptRaw,
  });
  const result = savePersonalWorkspacePocCreatorDraftLibrary({
    storage,
    expectedRawValue: corruptRaw,
    library: libraryAt(),
  });
  assert.deepEqual(result, {
    ok: false,
    error: 'invalid-expected-creator-draft-library',
    rollback: 'not-needed',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), corruptRaw);
  assert.deepEqual(storage.calls, []);
});

test('a throw after writing restores exact previous bytes', () => {
  const previousRaw = JSON.stringify(libraryAt('# 이전 bytes'));
  class ThrowAfterWriteStorage extends MemoryStorage {
    private failed = false;
    override setItem(key: string, value: string) {
      super.setItem(key, value);
      if (!this.failed) {
        this.failed = true;
        throw new Error('simulated-failure-after-write');
      }
    }
  }
  const storage = new ThrowAfterWriteStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: previousRaw,
    'flow:saved:sentinel': 'same',
  });
  const result = savePersonalWorkspacePocCreatorDraftLibrary({
    storage,
    expectedRawValue: previousRaw,
    library: libraryAt('# 다음 bytes'),
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'simulated-failure-after-write',
    rollback: 'complete',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), previousRaw);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'same');
});

test('verification mismatch restores a newly-created key to exact null', () => {
  class DistortingStorage extends MemoryStorage {
    private distorted = false;
    override setItem(key: string, value: string) {
      if (!this.distorted) {
        this.distorted = true;
        super.setItem(key, 'distorted');
        return;
      }
      super.setItem(key, value);
    }
  }
  const storage = new DistortingStorage({ 'flow:map:saved:sentinel': 'same' });
  const result = savePersonalWorkspacePocCreatorDraftLibrary({
    storage,
    expectedRawValue: null,
    library: libraryAt(),
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'creator-draft-library-storage-verification-failed',
    rollback: 'complete',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY), null);
  assert.equal(storage.getItem('flow:map:saved:sentinel'), 'same');
});

test('reports recovery-required when exact rollback cannot be completed', () => {
  const previousRaw = JSON.stringify(libraryAt('# 이전'));
  class RollbackFaultStorage extends MemoryStorage {
    private writes = 0;
    override setItem(key: string, value: string) {
      this.writes += 1;
      super.setItem(key, value);
      if (this.writes === 1) throw new Error('commit-failed');
      if (value === previousRaw) throw new Error('rollback-failed');
    }
  }
  const storage = new RollbackFaultStorage({
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: previousRaw,
  });
  const result = savePersonalWorkspacePocCreatorDraftLibrary({
    storage,
    expectedRawValue: previousRaw,
    library: libraryAt('# 다음'),
  });
  assert.deepEqual(result, {
    ok: false,
    error: 'commit-failed',
    rollback: 'recovery-required',
  });
});
