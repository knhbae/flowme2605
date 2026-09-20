import assert from 'node:assert/strict';
import test from 'node:test';

import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import {
  PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY,
  applyPersonalWorkspacePocSourceCandidate,
  createPersonalWorkspacePocLocalFixtureEnvelope,
  createPersonalWorkspacePocSourceCandidateStore,
  resolvePersonalWorkspacePocSourceCandidateChange,
  stagePersonalWorkspacePocSourceCandidate,
} from './personal-workspace-poc-source-candidates';
import {
  loadPersonalWorkspacePocSourceCandidateStore,
  parsePersonalWorkspacePocSourceCandidateStore,
  savePersonalWorkspacePocSourceCandidateStore,
} from './personal-workspace-poc-source-candidate-storage';
import {
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocAuthoredFlow,
} from './personal-workspace-poc-contract';

const T0 = '2026-09-04T00:00:00.000Z';
const T1 = '2026-09-04T00:01:00.000Z';
const T2 = '2026-09-04T00:02:00.000Z';
const T3 = '2026-09-04T00:03:00.000Z';
const BASE_RAW = '# 주말 준비\n- [ ] 장보기';
const INCOMING_RAW = '# 주말 준비\n- [ ] 장보기\n- [ ] 빨래';

class MemoryStorage {
  readonly calls: Array<{
    method: 'setItem' | 'removeItem' | 'clear';
    key?: string;
    value?: string;
  }> = [];
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
  clear() {
    this.calls.push({ method: 'clear' });
    this.values.clear();
  }
}

function authoredFlow(): PersonalWorkspacePocAuthoredFlow {
  const savedCopyId = 'copy-storage';
  const flowId = 'flow-storage';
  return {
    ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId),
    savedCopyId,
    flowId,
    sourceSlug: 'source-storage',
    title: '주말 준비',
    origin: 'authoring-handoff',
    items: [{
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'item-shopping'),
      savedCopyId,
      flowId,
      itemId: 'item-shopping',
      title: '장보기',
      sourceOrder: 0,
    }],
    authoring: {
      handoffId: 'handoff-storage',
      documentId: 'document-storage',
      revisionId: 'revision-base',
      parseResultId: 'parse-base',
      sourceSnapshotId: 'snapshot-base',
      rawText: BASE_RAW,
      sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(BASE_RAW),
      committedAt: T0,
    },
  };
}

function appliedStore() {
  const fixture = createPersonalWorkspacePocLocalFixtureEnvelope(authoredFlow(), {
    incomingRawText: INCOMING_RAW,
    incomingRevisionId: 'revision-incoming',
    candidateId: 'candidate-storage',
    createdAt: T1,
  });
  assert.equal(fixture.ok, true);
  if (!fixture.ok) throw new Error(fixture.reason);
  let store = stagePersonalWorkspacePocSourceCandidate(
    createPersonalWorkspacePocSourceCandidateStore(T0),
    fixture.envelope,
    fixture.current,
    T1,
  ).store;
  for (const change of fixture.envelope.changes) {
    store = resolvePersonalWorkspacePocSourceCandidateChange(store, {
      candidateId: fixture.envelope.candidateId,
      changeId: change.changeId,
      resolution: 'use-incoming',
      now: T2,
    }).store;
  }
  const applied = applyPersonalWorkspacePocSourceCandidate(store, {
    candidateId: fixture.envelope.candidateId,
    current: fixture.current,
    now: T3,
  });
  assert.equal(applied.code, 'applied');
  return applied.store;
}

test('persists apply and one-step Undo in one exact PoC key and reloads it', () => {
  const storage = new MemoryStorage({
    'flow:saved:sentinel': 'byte-for-byte-operating-data',
    'flow:map:sentinel': '{"same":true}',
  });
  const store = appliedStore();
  const result = savePersonalWorkspacePocSourceCandidateStore({
    storage,
    expectedRawValue: null,
    store,
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.kind, 'saved');
  assert.equal(storage.calls.length, 1);
  assert.deepEqual(storage.calls.map((call) => call.key), [
    PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY,
  ]);
  assert.equal(storage.calls.some((call) => call.method === 'clear'), false);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'byte-for-byte-operating-data');
  assert.equal(storage.getItem('flow:map:sentinel'), '{"same":true}');

  const loaded = loadPersonalWorkspacePocSourceCandidateStore(storage);
  assert.equal(loaded.kind, 'ready');
  assert.deepEqual(loaded.kind === 'ready' && loaded.store, store);
  assert.equal(loaded.kind === 'ready' && loaded.store.undo !== undefined, true);
});

test('empty, malformed, unsupported, and tampered payloads fail closed without writes', async (t) => {
  const valid = appliedStore();
  const tampered = JSON.parse(JSON.stringify(valid)) as Record<string, unknown>;
  const effectiveVersions = tampered.effectiveVersions as Record<string, Record<string, unknown>>;
  const effective = Object.values(effectiveVersions)[0];
  const projectedFlow = effective.projectedFlow as Record<string, unknown>;
  projectedFlow.title = '변조된 제목';
  const cases = [
    ['empty', null, 'empty'],
    ['malformed', '{broken', 'corrupt'],
    ['unsupported', JSON.stringify({ ...valid, version: 2 }), 'corrupt'],
    ['tampered', JSON.stringify(tampered), 'corrupt'],
  ] as const;
  for (const [name, raw, kind] of cases) {
    await t.test(name, () => {
      const storage = new MemoryStorage(raw === null ? {} : {
        [PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY]: raw,
      });
      const result = loadPersonalWorkspacePocSourceCandidateStore(storage);
      assert.equal(result.kind, kind);
      assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY), raw);
      assert.deepEqual(storage.calls, []);
    });
  }
});

test('stale CAS, identical bytes, and invalid expected bytes make zero mutations', () => {
  const store = appliedStore();
  const raw = JSON.stringify(store);
  const storage = new MemoryStorage({
    [PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY]: raw,
    'flow:saved:sentinel': 'same',
  });
  const stale = savePersonalWorkspacePocSourceCandidateStore({
    storage,
    expectedRawValue: JSON.stringify(createPersonalWorkspacePocSourceCandidateStore(T0)),
    store,
  });
  assert.deepEqual(stale, {
    ok: false,
    error: 'stale-source-candidate-store',
    rollback: 'not-needed',
  });
  assert.deepEqual(storage.calls, []);

  const noOp = savePersonalWorkspacePocSourceCandidateStore({
    storage,
    expectedRawValue: raw,
    store,
  });
  assert.equal(noOp.ok && noOp.kind, 'no-op');
  assert.deepEqual(storage.calls, []);

  const invalidExpected = savePersonalWorkspacePocSourceCandidateStore({
    storage,
    expectedRawValue: '{broken',
    store,
  });
  assert.deepEqual(invalidExpected, {
    ok: false,
    error: 'invalid-expected-source-candidate-store',
    rollback: 'not-needed',
  });
  assert.deepEqual(storage.calls, []);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'same');
});

test('a failure after the single write restores exact previous bytes', () => {
  const previous = createPersonalWorkspacePocSourceCandidateStore(T0);
  const previousRaw = JSON.stringify(previous);
  class ThrowAfterWriteStorage extends MemoryStorage {
    private failed = false;
    override setItem(key: string, value: string) {
      super.setItem(key, value);
      if (!this.failed) {
        this.failed = true;
        throw new Error('simulated-source-candidate-write-failure');
      }
    }
  }
  const storage = new ThrowAfterWriteStorage({
    [PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY]: previousRaw,
    'flow:saved:sentinel': 'same',
  });
  const result = savePersonalWorkspacePocSourceCandidateStore({
    storage,
    expectedRawValue: previousRaw,
    store: appliedStore(),
  });

  assert.deepEqual(result, {
    ok: false,
    error: 'simulated-source-candidate-write-failure',
    rollback: 'complete',
  });
  assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY), previousRaw);
  assert.equal(storage.getItem('flow:saved:sentinel'), 'same');
  assert.equal(storage.calls.every((call) => (
    call.key === PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY
  )), true);
  assert.equal(storage.calls.some((call) => call.method === 'clear'), false);
});

test('parse validates the complete envelope and effective projection before exposing it', () => {
  const store = appliedStore();
  assert.deepEqual(parsePersonalWorkspacePocSourceCandidateStore(JSON.stringify(store)), {
    ok: true,
    store,
  });
  assert.deepEqual(parsePersonalWorkspacePocSourceCandidateStore('{broken'), {
    ok: false,
    reason: 'invalid-json',
  });
});

