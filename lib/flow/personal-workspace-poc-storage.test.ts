import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  PERSONAL_WORKSPACE_POC_STORAGE_PREFIX,
} from './personal-workspace-poc-contract';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';
import {
  PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
  clearPersonalWorkspacePocAuthoringDraft,
  loadPersonalWorkspacePocAuthoringDraft,
  loadPersonalWorkspacePocState,
  resetPersonalWorkspacePocStorage,
  restorePersonalWorkspacePocAuthoringDraftBytes,
  savePersonalWorkspacePocAuthoringDraft,
  savePersonalWorkspacePocState,
} from './personal-workspace-poc-storage';

class MemoryStorage {
  readonly calls: Array<{ method: 'setItem' | 'removeItem'; key: string; value?: string }> = [];
  failWrites = false;
  private readonly values = new Map<string, string>();

  constructor(seed: Record<string, string> = {}) {
    Object.entries(seed).forEach(([key, value]) => this.values.set(key, value));
  }

  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    this.calls.push({ method: 'setItem', key, value });
    if (this.failWrites) throw new Error('simulated-write-failure');
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.calls.push({ method: 'removeItem', key });
    this.values.delete(key);
  }
}

class FirstWriteFaultStorage {
  readonly calls: Array<{ method: 'setItem' | 'removeItem'; key: string; value?: string }> = [];
  private firstWrite = true;
  private readonly values = new Map<string, string>();

  constructor(
    private readonly fault: 'throw-after-write' | 'verification-mismatch',
    seed: Record<string, string> = {},
  ) {
    Object.entries(seed).forEach(([key, value]) => this.values.set(key, value));
  }

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    this.calls.push({ method: 'setItem', key, value });
    if (!this.firstWrite) {
      this.values.set(key, value);
      return;
    }

    this.firstWrite = false;
    if (this.fault === 'throw-after-write') {
      this.values.set(key, value);
      throw new Error('simulated-failure-after-write');
    }
    this.values.set(key, 'simulated-distorted-bytes');
  }
  removeItem(key: string) {
    this.calls.push({ method: 'removeItem', key });
    this.values.delete(key);
  }
}

class SecondRemoveFaultStorage extends MemoryStorage {
  private removeCount = 0;

  override removeItem(key: string) {
    this.removeCount += 1;
    if (this.removeCount === 2) throw new Error('simulated-second-remove-failure');
    super.removeItem(key);
  }
}

test('round-trips one versioned state payload inside the allowed namespace', () => {
  const storage = new MemoryStorage({ 'flow:saved:keep': 'operational-bytes' });
  const state = createPersonalWorkspacePocState('2026-09-01T00:00:00.000Z');
  const saved = savePersonalWorkspacePocState(storage, state);
  assert.equal(saved.ok, true);
  assert.deepEqual(loadPersonalWorkspacePocState(storage), { kind: 'ready', state });
  assert.equal(storage.getItem('flow:saved:keep'), 'operational-bytes');
  assert.equal(storage.calls.every((call) => call.key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)), true);
});

test('keeps already-saved P0 v1 payloads readable before the additive authoring fields exist', () => {
  const legacy = createPersonalWorkspacePocState('2026-09-01T00:00:00.000Z');
  delete legacy.authoredFlows;
  delete legacy.authoringReceipts;
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: JSON.stringify(legacy),
  });
  assert.deepEqual(loadPersonalWorkspacePocState(storage), { kind: 'ready', state: legacy });
  assert.equal(storage.calls.length, 0);
});

test('corrupt authored Flow payload fails closed without normalization writes', () => {
  const state = createPersonalWorkspacePocState('2026-09-01T00:00:00.000Z');
  state.authoredFlows = [{ origin: 'authoring-handoff' } as never];
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: JSON.stringify(state),
  });
  assert.deepEqual(loadPersonalWorkspacePocState(storage), {
    kind: 'corrupt', reason: 'invalid-state-payload',
  });
  assert.equal(storage.calls.length, 0);
});

test('corrupt payload fails closed and is not rewritten', () => {
  const storage = new MemoryStorage({ [PERSONAL_WORKSPACE_POC_STATE_KEY]: '{broken-json' });
  const beforeCalls = storage.calls.length;
  assert.deepEqual(loadPersonalWorkspacePocState(storage), { kind: 'corrupt', reason: 'invalid-json' });
  assert.equal(storage.calls.length, beforeCalls);
});

test('authoring draft round-trips and corrupt bytes fail closed without normalization', () => {
  const storage = new MemoryStorage({ 'flow:saved:keep': 'exact-bytes' });
  const draft = {
    version: 1 as const,
    rawText: '# 이사 준비\n- [ ] 주소 변경',
    templateId: 'moving-dday-v1' as const,
  };
  assert.equal(savePersonalWorkspacePocAuthoringDraft(storage, draft).ok, true);
  assert.deepEqual(loadPersonalWorkspacePocAuthoringDraft(storage), { kind: 'ready', draft });
  assert.equal(storage.getItem('flow:saved:keep'), 'exact-bytes');

  const corrupt = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: '{broken',
  });
  assert.deepEqual(loadPersonalWorkspacePocAuthoringDraft(corrupt), {
    kind: 'corrupt', reason: 'invalid-json',
  });
  assert.equal(corrupt.calls.length, 0);

  const unsupported = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: JSON.stringify({
      version: 1,
      rawText: '# 그대로',
      templateId: 'unsupported-template-v9',
    }),
  });
  assert.deepEqual(loadPersonalWorkspacePocAuthoringDraft(unsupported), {
    kind: 'corrupt', reason: 'invalid-authoring-draft',
  });
  assert.equal(unsupported.calls.length, 0);
});

test('keeps legacy v1 working drafts personal and round-trips an optional creator binding', () => {
  const legacy = {
    version: 1 as const,
    rawText: '# 기존 개인 초안',
  };
  const legacyStorage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: JSON.stringify(legacy),
  });
  assert.deepEqual(loadPersonalWorkspacePocAuthoringDraft(legacyStorage), {
    kind: 'ready',
    draft: legacy,
  });
  assert.equal(legacyStorage.calls.length, 0);

  const bound = {
    version: 1 as const,
    rawText: '',
    creatorBinding: {
      owner: 'creator' as const,
      draftId: 'creator-draft-local-1',
    },
  };
  const boundStorage = new MemoryStorage();
  assert.equal(savePersonalWorkspacePocAuthoringDraft(boundStorage, bound).ok, true);
  assert.deepEqual(loadPersonalWorkspacePocAuthoringDraft(boundStorage), {
    kind: 'ready',
    draft: bound,
  });
});

test('fails closed on malformed creator bindings without rewriting their bytes', async (t) => {
  const cases = [
    { owner: 'personal', draftId: 'creator-draft-1' },
    { owner: 'creator', draftId: 'contains spaces' },
    { owner: 'creator', draftId: 'creator-draft-1', extra: true },
  ];
  for (const creatorBinding of cases) {
    await t.test(JSON.stringify(creatorBinding), () => {
      const raw = JSON.stringify({ version: 1, rawText: '# 보존', creatorBinding });
      const storage = new MemoryStorage({
        [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: raw,
      });
      assert.deepEqual(loadPersonalWorkspacePocAuthoringDraft(storage), {
        kind: 'corrupt',
        reason: 'invalid-authoring-draft',
      });
      assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), raw);
      assert.equal(storage.calls.length, 0);
    });
  }
});

test('authoring draft clear removes only its exact PoC key', () => {
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: '{"version":1,"rawText":"draft"}',
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: 'state-bytes',
    'flow:saved:keep': 'operational-bytes',
  });
  assert.deepEqual(clearPersonalWorkspacePocAuthoringDraft(storage), { ok: true });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), null);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), 'state-bytes');
  assert.equal(storage.getItem('flow:saved:keep'), 'operational-bytes');
});

test('K1-A: initial draft read failure never writes or removes unknown bytes', () => {
  const calls: string[] = [];
  const result = savePersonalWorkspacePocAuthoringDraft({
    getItem() { throw new Error('private-read-failure'); },
    setItem(key) { calls.push(key); }, removeItem(key) { calls.push(key); },
  }, { version: 1, rawText: '# 새 내용' });
  assert.deepEqual(result, { ok: false, error: 'storage-read-failed', rollback: 'not-needed' });
  assert.deepEqual(calls, []);
});

test('K1-A: a verified identical draft is a zero-write no-op', () => {
  const draft = { version: 1 as const, rawText: '# 같은 원문\r\n- [ ] 유지' };
  const original = JSON.stringify(draft);
  const storage = new MemoryStorage({ [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: original });
  assert.deepEqual(savePersonalWorkspacePocAuthoringDraft(storage, draft), {
    ok: true, serialized: original, previous: original, changed: false,
  });
  assert.deepEqual(storage.calls, []);
});

test('K1-A: a stale exact draft ticket cannot overwrite another intent', () => {
  const storage = new MemoryStorage({ [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: 'other-draft-bytes' });
  const result = savePersonalWorkspacePocAuthoringDraft(storage, { version: 1, rawText: '# mine' }, 'opened-draft-bytes');
  assert.deepEqual(result, { ok: false, error: 'stale-authoring-draft', rollback: 'not-needed' });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), 'other-draft-bytes');
  assert.deepEqual(storage.calls, []);
});

test('K1-A: before-write QuotaError does not attempt a redundant rollback write', () => {
  const storage = new MemoryStorage({ [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: 'exact-before' });
  storage.failWrites = true;
  assert.deepEqual(savePersonalWorkspacePocAuthoringDraft(storage, { version: 1, rawText: '# 변경' }), {
    ok: false, error: 'simulated-write-failure', rollback: 'not-needed',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), 'exact-before');
  assert.equal(storage.calls.length, 1);
});

for (const fault of ['throw-after-write', 'verification-mismatch'] as const) {
  test(`K1-A: ${fault} verifies exact draft rollback`, () => {
    const storage = new FirstWriteFaultStorage(fault, {
      [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: '  exact before\r\n🙂  ',
      'flow:saved:keep': 'unmodified operating bytes',
    });
    const result = savePersonalWorkspacePocAuthoringDraft(storage, { version: 1, rawText: '# 새 원문' });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error('fault was not propagated');
    assert.equal(result.rollback, 'complete');
    assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), '  exact before\r\n🙂  ');
    assert.equal(storage.getItem('flow:saved:keep'), 'unmodified operating bytes');
    assert.equal(storage.calls.every(c => c.key === PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), true);
  });
}

test('K1-A: transient readback failure restores and verifies known before bytes', () => {
  let bytes: string | null = 'before'; let reads = 0;
  const result = savePersonalWorkspacePocAuthoringDraft({
    getItem() { if (++reads === 2) throw new Error('post-write-read-failed'); return bytes; },
    setItem(_key, value) { bytes = value; }, removeItem() { bytes = null; },
  }, { version: 1, rawText: '# 변경' });
  assert.deepEqual(result, { ok: false, error: 'post-write-read-failed', rollback: 'complete' });
  assert.equal(bytes, 'before');
});

for (const fault of ['rollback-write', 'rollback-readback'] as const) {
  test(`K1-A: ${fault} cannot be reported as a recovered draft`, () => {
    let bytes: string | null = 'before'; let writes = 0;
    const result = savePersonalWorkspacePocAuthoringDraft({
      getItem() { return bytes; },
      setItem(_key, value) {
        if (++writes === 1) { bytes = value; throw new Error('partial-write'); }
        if (fault === 'rollback-write') throw new Error('rollback-write-failed');
        bytes = 'silently-distorted-rollback';
      }, removeItem() { bytes = null; },
    }, { version: 1, rawText: '# 변경' });
    assert.deepEqual(result, { ok: false, error: 'partial-write', rollback: 'recovery-required' });
    assert.notEqual(bytes, 'before');
  });
}

test('K1-A: helper native failure rolls back only its verified candidate bytes', () => {
  const key = PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY;
  const storage = new MemoryStorage({ [key]: 'before', 'flow:saved:keep': 'unchanged' });
  const saved = savePersonalWorkspacePocAuthoringDraft(storage, { version: 1, rawText: '# candidate' });
  assert.equal(saved.ok, true);
  if (!saved.ok) throw new Error('save failed');
  assert.deepEqual(restorePersonalWorkspacePocAuthoringDraftBytes(storage, {
    previous: saved.previous, expectedSerialized: saved.serialized,
  }), { ok: true, rollback: 'complete' });
  assert.equal(storage.getItem(key), 'before');
  assert.equal(storage.getItem('flow:saved:keep'), 'unchanged');
  const count = storage.calls.length;
  assert.deepEqual(restorePersonalWorkspacePocAuthoringDraftBytes(storage, {
    previous: 'before', expectedSerialized: saved.serialized,
  }), { ok: true, rollback: 'not-needed' });
  assert.equal(storage.calls.length, count);
});

test('K1-A: absent-before helper rollback removes only the exact draft key', () => {
  const storage = new MemoryStorage({ 'flow:saved:keep': 'unchanged' });
  const saved = savePersonalWorkspacePocAuthoringDraft(storage, { version: 1, rawText: '# candidate' });
  if (!saved.ok) throw new Error('save failed');
  assert.equal(saved.previous, null);
  assert.deepEqual(restorePersonalWorkspacePocAuthoringDraftBytes(storage, {
    previous: null, expectedSerialized: saved.serialized,
  }), { ok: true, rollback: 'complete' });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), null);
  assert.equal(storage.getItem('flow:saved:keep'), 'unchanged');
});

test('K1-A: native rollback cannot overwrite a newer external draft', () => {
  const key = PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY;
  const storage = new MemoryStorage({ [key]: 'newer-external-intent' });
  assert.deepEqual(restorePersonalWorkspacePocAuthoringDraftBytes(storage, {
    previous: 'before', expectedSerialized: 'my-candidate',
  }), { ok: false, error: 'draft-changed-before-rollback', rollback: 'recovery-required' });
  assert.equal(storage.getItem(key), 'newer-external-intent');
  assert.deepEqual(storage.calls, []);
});

test('K1-A: unavailable rollback read cannot mutate a draft', () => {
  const calls: string[] = [];
  assert.deepEqual(restorePersonalWorkspacePocAuthoringDraftBytes({
    getItem() { throw new Error('unavailable'); },
    setItem(key) { calls.push(key); }, removeItem(key) { calls.push(key); },
  }, { previous: 'before', expectedSerialized: 'candidate' }), {
    ok: false, error: 'rollback-read-failed', rollback: 'recovery-required',
  });
  assert.deepEqual(calls, []);
});

test('write failure keeps the caller state and attempts rollback only in the PoC key', () => {
  const original = JSON.stringify(createPersonalWorkspacePocState('2026-08-31T00:00:00.000Z'));
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: original,
    'flow:saved:keep': 'same',
  });
  storage.failWrites = true;
  const result = savePersonalWorkspacePocState(
    storage,
    createPersonalWorkspacePocState('2026-09-01T00:00:00.000Z'),
  );
  assert.equal(result.ok, false);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), original);
  assert.equal(storage.getItem('flow:saved:keep'), 'same');
  assert.equal(storage.calls.every((call) => call.key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)), true);
});

test('restores the previous bytes when setItem throws after partially writing', () => {
  const original = JSON.stringify(createPersonalWorkspacePocState('2026-08-31T00:00:00.000Z'));
  const storage = new FirstWriteFaultStorage('throw-after-write', {
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: original,
    'flow:saved:keep': 'operational-bytes',
  });

  const result = savePersonalWorkspacePocState(
    storage,
    createPersonalWorkspacePocState('2026-09-01T00:00:00.000Z'),
  );

  assert.equal(result.ok, false);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), original);
  assert.equal(storage.getItem('flow:saved:keep'), 'operational-bytes');
  assert.deepEqual(
    storage.calls.map(({ method, key }) => ({ method, key })),
    [
      { method: 'setItem', key: PERSONAL_WORKSPACE_POC_STATE_KEY },
      { method: 'setItem', key: PERSONAL_WORKSPACE_POC_STATE_KEY },
    ],
  );
});

test('restores the previous bytes when write verification detects a mismatch', () => {
  const original = JSON.stringify(createPersonalWorkspacePocState('2026-08-31T00:00:00.000Z'));
  const storage = new FirstWriteFaultStorage('verification-mismatch', {
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: original,
    'flow:my-flow:item-drafts': 'exact-operational-bytes',
  });

  const result = savePersonalWorkspacePocState(
    storage,
    createPersonalWorkspacePocState('2026-09-01T00:00:00.000Z'),
  );

  assert.deepEqual(result, { ok: false, error: 'storage-verification-failed' });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), original);
  assert.equal(storage.getItem('flow:my-flow:item-drafts'), 'exact-operational-bytes');
  assert.deepEqual(
    storage.calls.map(({ method, key }) => ({ method, key })),
    [
      { method: 'setItem', key: PERSONAL_WORKSPACE_POC_STATE_KEY },
      { method: 'setItem', key: PERSONAL_WORKSPACE_POC_STATE_KEY },
    ],
  );
});

test('removes a newly-created PoC key when setItem throws after partially writing', () => {
  const storage = new FirstWriteFaultStorage('throw-after-write', {
    'flow:checks:keep': 'operational-bytes',
  });

  const result = savePersonalWorkspacePocState(
    storage,
    createPersonalWorkspacePocState('2026-09-01T00:00:00.000Z'),
  );

  assert.equal(result.ok, false);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), null);
  assert.equal(storage.getItem('flow:checks:keep'), 'operational-bytes');
  assert.deepEqual(
    storage.calls.map(({ method, key }) => ({ method, key })),
    [
      { method: 'setItem', key: PERSONAL_WORKSPACE_POC_STATE_KEY },
      { method: 'removeItem', key: PERSONAL_WORKSPACE_POC_STATE_KEY },
    ],
  );
});

test('reset removes the exact PoC prefix and leaves every other byte untouched', () => {
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: 'poc-state',
    [`${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}future`]: 'future-poc',
    'flow:saved:keep': 'saved-bytes',
    'flow:map:saved:keep': 'map-bytes',
    flow_builder_mvp_bundles_v11: 'bundle-bytes',
  });
  const result = resetPersonalWorkspacePocStorage(storage);
  assert.equal(result.ok, true);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), null);
  assert.equal(storage.getItem(`${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}future`), null);
  assert.equal(storage.getItem('flow:saved:keep'), 'saved-bytes');
  assert.equal(storage.getItem('flow:map:saved:keep'), 'map-bytes');
  assert.equal(storage.getItem('flow_builder_mvp_bundles_v11'), 'bundle-bytes');
  assert.equal(storage.calls.every((call) => call.key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)), true);
});

test('reset restores every exact PoC byte when a later remove fails', () => {
  const stateBytes = '{"state":"exact"}';
  const draftBytes = '{"version":1,"rawText":"작성 중"}';
  const futureBytes = 'future-poc-bytes';
  const storage = new SecondRemoveFaultStorage({
    [PERSONAL_WORKSPACE_POC_STATE_KEY]: stateBytes,
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: draftBytes,
    [`${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}future`]: futureBytes,
    'flow:saved:keep': 'operational-bytes',
  });

  const result = resetPersonalWorkspacePocStorage(storage);

  assert.deepEqual(result, {
    ok: false,
    error: 'simulated-second-remove-failure',
    rollbackOk: true,
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), stateBytes);
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY), draftBytes);
  assert.equal(storage.getItem(`${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}future`), futureBytes);
  assert.equal(storage.getItem('flow:saved:keep'), 'operational-bytes');
  assert.equal(storage.calls.every((call) => call.key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)), true);
});
