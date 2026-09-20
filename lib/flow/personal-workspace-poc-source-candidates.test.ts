import assert from 'node:assert/strict';
import test from 'node:test';

import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import {
  PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_FINGERPRINT_ALGORITHM,
  applyPersonalWorkspacePocSourceCandidate,
  clearPersonalWorkspacePocSourceCandidateChangeResolution,
  createPersonalWorkspacePocCurrentSourceFromAuthoredFlow,
  createPersonalWorkspacePocLocalFixtureEnvelope,
  createPersonalWorkspacePocSourceCandidateStore,
  deferPersonalWorkspacePocSourceCandidate,
  isPersonalWorkspacePocSourceCandidateEnvelope,
  isPersonalWorkspacePocSourceCandidateStore,
  resolvePersonalWorkspacePocSourceCandidateChange,
  stagePersonalWorkspacePocSourceCandidate,
  undoPersonalWorkspacePocSourceCandidate,
  type PersonalWorkspacePocSourceCandidateCurrentSource,
  type PersonalWorkspacePocSourceCandidateEnvelope,
  type PersonalWorkspacePocSourceCandidateStore,
} from './personal-workspace-poc-source-candidates';
import {
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocAuthoredFlow,
} from './personal-workspace-poc-contract';

const T0 = '2026-09-04T00:00:00.000Z';
const T1 = '2026-09-04T00:01:00.000Z';
const T2 = '2026-09-04T00:02:00.000Z';
const T3 = '2026-09-04T00:03:00.000Z';
const T4 = '2026-09-04T00:04:00.000Z';
const BASE_RAW = '# 이사 준비\n- [ ] 주소 변경\n- [ ] 전기 이전';
const INCOMING_RAW = '# 이사 준비 새 버전\n- [ ] 주소 변경\n- [ ] 전기 명의 변경\n- [ ] 인터넷 설치';

function authoredFlow(): PersonalWorkspacePocAuthoredFlow {
  const savedCopyId = 'authoring-copy-handoff-1';
  const flowId = 'authoring-flow-handoff-1';
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  return {
    ref: flowRef,
    savedCopyId,
    flowId,
    sourceSlug: 'authoring-source-handoff-1',
    title: '이사 준비',
    origin: 'authoring-handoff',
    items: [
      {
        ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'item-address'),
        savedCopyId,
        flowId,
        itemId: 'item-address',
        title: '주소 변경',
        sourceOrder: 0,
      },
      {
        ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'item-electric'),
        savedCopyId,
        flowId,
        itemId: 'item-electric',
        title: '전기 이전',
        sourceOrder: 1,
      },
    ],
    authoring: {
      source: 'text-authoring-poc-v1',
      handoffId: 'handoff-1',
      documentId: 'document-1',
      revisionId: 'revision-base',
      parseResultId: 'parse-base',
      sourceSnapshotId: 'source-snapshot-base',
      rawText: BASE_RAW,
      sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(BASE_RAW),
      committedAt: T0,
    },
  };
}

function fixture() {
  const result = createPersonalWorkspacePocLocalFixtureEnvelope(authoredFlow(), {
    incomingRawText: INCOMING_RAW,
    incomingRevisionId: 'revision-incoming',
    candidateId: 'candidate-1',
    fixtureId: 'fixture-1',
    createdAt: T1,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.reason);
  return result;
}

function stagedFixture() {
  const { envelope, current } = fixture();
  const initial = createPersonalWorkspacePocSourceCandidateStore(T0);
  const staged = stagePersonalWorkspacePocSourceCandidate(initial, envelope, current, T1);
  assert.equal(staged.code, 'staged');
  return { envelope, current, store: staged.store };
}

function resolveAll(
  store: PersonalWorkspacePocSourceCandidateStore,
  envelope: PersonalWorkspacePocSourceCandidateEnvelope,
  resolution: 'keep-mine' | 'use-incoming' = 'use-incoming',
) {
  let next = store;
  envelope.changes.forEach((change, index) => {
    const result = resolvePersonalWorkspacePocSourceCandidateChange(next, {
      candidateId: envelope.candidateId,
      changeId: change.changeId,
      resolution,
      now: new Date(Date.parse(T2) + index * 1_000).toISOString(),
    });
    assert.equal(result.code, 'resolved');
    next = result.store;
  });
  return next;
}

test('creates a complete immutable three-way envelope with a declared non-security fingerprint', () => {
  const { envelope, current } = fixture();

  assert.equal(envelope.version, 1);
  assert.equal(envelope.target.origin, 'authoring-handoff');
  assert.equal(envelope.base.rawText, BASE_RAW);
  assert.equal(envelope.mine.rawText, BASE_RAW);
  assert.equal(envelope.incoming.rawText, INCOMING_RAW);
  assert.ok(envelope.changes.some((change) => change.scope === 'flow'));
  assert.ok(envelope.changes.some((change) => change.kind === 'added'));
  assert.ok(envelope.changes.some((change) => change.kind === 'modified'));
  assert.ok(envelope.tamperFingerprint.startsWith(
    `${PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_FINGERPRINT_ALGORITHM}:`,
  ));
  assert.equal(isPersonalWorkspacePocSourceCandidateEnvelope(envelope), true);
  assert.equal(Object.isFrozen(envelope), true);
  assert.equal(Object.isFrozen(envelope.incoming.projectedFlow.items), true);
  assert.equal(current.projectedFlow.items[0].ref, envelope.incoming.projectedFlow.items[0].ref);
  assert.equal(current.projectedFlow.items[1].ref, envelope.incoming.projectedFlow.items[1].ref);
});

test('accepts only a valid authoring-handoff source and refuses invalid exact source bytes', () => {
  const flow = authoredFlow();
  const invalid = {
    ...flow,
    origin: 'legacy-saved-plan' as const,
  };
  assert.deepEqual(createPersonalWorkspacePocLocalFixtureEnvelope(
    invalid as unknown as PersonalWorkspacePocAuthoredFlow,
  ), { ok: false, reason: 'unsupported-origin' });

  const broken = {
    ...flow,
    authoring: { ...flow.authoring, rawText: `${BASE_RAW}\n변조` },
  };
  assert.equal(createPersonalWorkspacePocCurrentSourceFromAuthoredFlow(broken), null);
});

test('stages, resolves the complete set, atomically applies one effective version, and undoes it once', () => {
  const { envelope, current, store } = stagedFixture();
  const resolved = resolveAll(store, envelope);
  const applied = applyPersonalWorkspacePocSourceCandidate(resolved, {
    candidateId: envelope.candidateId,
    current,
    now: T3,
  });

  assert.equal(applied.changed, true);
  assert.equal(applied.code, 'applied');
  assert.equal(applied.store.revision, 2 + envelope.changes.length);
  assert.equal(applied.effectiveFlow?.title, '이사 준비 새 버전');
  assert.deepEqual(
    applied.effectiveFlow?.items.slice(0, 2).map((item) => item.ref),
    current.projectedFlow.items.map((item) => item.ref),
  );
  assert.equal(applied.effectiveFlow?.items.at(-1)?.title, '인터넷 설치');
  assert.equal(applied.store.reviews[envelope.candidateId]?.status, 'applied');
  assert.equal(isPersonalWorkspacePocSourceCandidateStore(applied.store), true);

  const repeated = applyPersonalWorkspacePocSourceCandidate(applied.store, {
    candidateId: envelope.candidateId,
    current,
    now: T4,
  });
  assert.equal(repeated.changed, false);
  assert.equal(repeated.code, 'already-applied');
  assert.equal(repeated.store, applied.store);

  const undone = undoPersonalWorkspacePocSourceCandidate(applied.store, T4);
  assert.equal(undone.changed, true);
  assert.equal(undone.code, 'undone');
  assert.equal(undone.store.effectiveVersions[envelope.target.flowRef], undefined);
  assert.equal(undone.store.reviews[envelope.candidateId]?.status, 'pending');
  assert.equal(undone.store.undo, undefined);
  assert.deepEqual(undone.effectiveFlow, current.projectedFlow);
  assert.equal(undoPersonalWorkspacePocSourceCandidate(undone.store, T4).code, 'no-undo');
});

test('keep-mine resolutions preserve existing source projection while accepting selected additions', () => {
  const { envelope, current, store } = stagedFixture();
  let resolved = store;
  for (const [index, change] of envelope.changes.entries()) {
    resolved = resolvePersonalWorkspacePocSourceCandidateChange(resolved, {
      candidateId: envelope.candidateId,
      changeId: change.changeId,
      resolution: change.kind === 'added' ? 'use-incoming' : 'keep-mine',
      now: new Date(Date.parse(T2) + index * 1_000).toISOString(),
    }).store;
  }
  const applied = applyPersonalWorkspacePocSourceCandidate(resolved, {
    candidateId: envelope.candidateId,
    current,
    now: T3,
  });
  assert.equal(applied.code, 'applied');
  assert.equal(applied.effectiveFlow?.title, '이사 준비');
  assert.equal(applied.effectiveFlow?.items[1].title, '전기 이전');
  assert.equal(applied.effectiveFlow?.items.at(-1)?.title, '인터넷 설치');
});

test('accepting a source deletion retains the existing Item ref for personal overlay and execution', () => {
  const fixtureResult = createPersonalWorkspacePocLocalFixtureEnvelope(authoredFlow(), {
    incomingRawText: '# 이사 준비\n- [ ] 주소 변경',
    incomingRevisionId: 'revision-removal',
    candidateId: 'candidate-removal',
    createdAt: T1,
  });
  assert.equal(fixtureResult.ok, true);
  if (!fixtureResult.ok) throw new Error(fixtureResult.reason);
  const { envelope, current } = fixtureResult;
  const removed = envelope.changes.find((change) => change.kind === 'removed');
  assert.ok(removed?.itemRef);
  let store = stagePersonalWorkspacePocSourceCandidate(
    createPersonalWorkspacePocSourceCandidateStore(T0),
    envelope,
    current,
    T1,
  ).store;
  store = resolveAll(store, envelope);
  const applied = applyPersonalWorkspacePocSourceCandidate(store, {
    candidateId: envelope.candidateId,
    current,
    now: T3,
  });
  assert.equal(applied.code, 'applied');
  assert.ok(applied.effectiveFlow?.items.some((item) => item.ref === removed?.itemRef));
  assert.deepEqual(
    applied.store.effectiveVersions[envelope.target.flowRef]?.retainedItemRefs,
    [removed?.itemRef],
  );
});

test('unresolved, deferred, stale, and tampered candidates are blocked with zero model mutation', async (t) => {
  const { envelope, current, store } = stagedFixture();

  await t.test('unresolved', () => {
    const result = applyPersonalWorkspacePocSourceCandidate(store, {
      candidateId: envelope.candidateId,
      current,
      now: T2,
    });
    assert.equal(result.code, 'unresolved');
    assert.equal(result.changed, false);
    assert.equal(result.store, store);
  });

  await t.test('deferred', () => {
    const deferred = deferPersonalWorkspacePocSourceCandidate(store, {
      candidateId: envelope.candidateId,
      now: T2,
    });
    const result = applyPersonalWorkspacePocSourceCandidate(deferred.store, {
      candidateId: envelope.candidateId,
      current,
      now: T3,
    });
    assert.equal(result.code, 'candidate-deferred');
    assert.equal(result.changed, false);
    assert.equal(result.store, deferred.store);
  });

  await t.test('stale', () => {
    const resolved = resolveAll(store, envelope);
    const stale: PersonalWorkspacePocSourceCandidateCurrentSource = {
      ...current,
      revisionId: 'revision-stale',
    };
    const result = applyPersonalWorkspacePocSourceCandidate(resolved, {
      candidateId: envelope.candidateId,
      current: stale,
      now: T3,
    });
    assert.equal(result.code, 'stale-source');
    assert.equal(result.changed, false);
    assert.equal(result.store, resolved);
  });

  await t.test('tampered', () => {
    const tamperedEnvelope = JSON.parse(JSON.stringify(envelope)) as Record<string, unknown>;
    const incoming = tamperedEnvelope.incoming as Record<string, unknown>;
    incoming.rawText = `${INCOMING_RAW}\n변조`;
    assert.equal(isPersonalWorkspacePocSourceCandidateEnvelope(tamperedEnvelope), false);
    const initial = createPersonalWorkspacePocSourceCandidateStore(T0);
    const result = stagePersonalWorkspacePocSourceCandidate(
      initial,
      tamperedEnvelope as unknown as PersonalWorkspacePocSourceCandidateEnvelope,
      current,
      T1,
    );
    assert.equal(result.code, 'tampered-candidate');
    assert.equal(result.changed, false);
    assert.equal(result.store, initial);
  });
});

test('deferred review can be explicitly resumed without replacing the immutable envelope', () => {
  const { envelope, current, store } = stagedFixture();
  const deferred = deferPersonalWorkspacePocSourceCandidate(store, {
    candidateId: envelope.candidateId,
    now: T2,
  });
  const resumed = stagePersonalWorkspacePocSourceCandidate(
    deferred.store,
    envelope,
    current,
    T3,
  );
  assert.equal(resumed.code, 'resumed');
  assert.equal(resumed.store.envelopes[envelope.candidateId]?.tamperFingerprint,
    envelope.tamperFingerprint);
  assert.equal(resumed.store.reviews[envelope.candidateId]?.status, 'pending');
});

test('clears one keep/use decision back to the unresolved later state', () => {
  const { envelope, current, store } = stagedFixture();
  const change = envelope.changes[0];
  const resolved = resolvePersonalWorkspacePocSourceCandidateChange(store, {
    candidateId: envelope.candidateId,
    changeId: change.changeId,
    resolution: 'use-incoming',
    now: T2,
  });
  const cleared = clearPersonalWorkspacePocSourceCandidateChangeResolution(resolved.store, {
    candidateId: envelope.candidateId,
    changeId: change.changeId,
    now: T3,
  });
  assert.equal(cleared.code, 'resolution-cleared');
  assert.equal(cleared.changed, true);
  assert.equal(
    cleared.store.reviews[envelope.candidateId]?.resolutions[change.changeId],
    undefined,
  );
  assert.equal(applyPersonalWorkspacePocSourceCandidate(cleared.store, {
    candidateId: envelope.candidateId,
    current,
    now: T4,
  }).code, 'unresolved');
});
