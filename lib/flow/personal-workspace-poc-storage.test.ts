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
