import assert from 'node:assert/strict';
import test from 'node:test';

import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import { composePersonalWorkspacePocReadModel } from './personal-workspace-poc-composition';
import {
  PERSONAL_WORKSPACE_POC_CANONICAL_OWNERSHIP_V1,
  buildPersonalWorkspacePocCanonicalProjectionMapping,
  composePersonalWorkspacePocEffectiveSourceFlows,
  getPersonalWorkspacePocEffectiveSourceFlow,
  reconcilePersonalWorkspacePocPersonalPlanOverlayForSourceVersion,
} from './personal-workspace-poc-canonical-ownership';
import {
  applyPersonalWorkspacePocSourceCandidate,
  createPersonalWorkspacePocLocalFixtureEnvelope,
  createPersonalWorkspacePocSourceCandidateStore,
  resolvePersonalWorkspacePocSourceCandidateChange,
  stagePersonalWorkspacePocSourceCandidate,
} from './personal-workspace-poc-source-candidates';
import {
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  PERSONAL_WORKSPACE_POC_VERSION,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocFlow,
} from './personal-workspace-poc-contract';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';

const T0 = '2026-09-04T00:00:00.000Z';
const T1 = '2026-09-04T00:01:00.000Z';
const T2 = '2026-09-04T00:02:00.000Z';
const BASE_RAW = '# 출근 준비\n- [ ] 가방 챙기기';
const INCOMING_RAW = '# 출근 준비 v2\n- [ ] 준비물 확인\n- [ ] 우산 확인';

function authoredFlow(): PersonalWorkspacePocAuthoredFlow {
  const savedCopyId = 'copy-owner';
  const flowId = 'flow-owner';
  return {
    ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId),
    savedCopyId,
    flowId,
    sourceSlug: 'source-owner',
    title: '출근 준비',
    origin: 'authoring-handoff',
    items: [{
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'item-bag'),
      savedCopyId,
      flowId,
      itemId: 'item-bag',
      title: '가방 챙기기',
      sourceOrder: 0,
    }],
    authoring: {
      handoffId: 'handoff-owner',
      documentId: 'document-owner',
      revisionId: 'revision-owner-base',
      parseResultId: 'parse-owner-base',
      sourceSnapshotId: 'snapshot-owner-base',
      rawText: BASE_RAW,
      sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(BASE_RAW),
      committedAt: T0,
    },
  };
}

function applied() {
  const flow = authoredFlow();
  const fixture = createPersonalWorkspacePocLocalFixtureEnvelope(flow, {
    candidateId: 'candidate-owner',
    incomingRevisionId: 'revision-owner-incoming',
    incomingRawText: INCOMING_RAW,
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
      now: T1,
    }).store;
  }
  const result = applyPersonalWorkspacePocSourceCandidate(store, {
    candidateId: fixture.envelope.candidateId,
    current: fixture.current,
    now: T2,
  });
  assert.equal(result.code, 'applied');
  return { flow, fixture, store: result.store };
}

test('documents PoC-only canonical and owner boundaries without claiming production owners', () => {
  const contract = PERSONAL_WORKSPACE_POC_CANONICAL_OWNERSHIP_V1;
  assert.equal(contract.productionCanonicalApproved, false);
  assert.deepEqual(contract.canonicalPath, [
    'SourceRow',
    'Item',
    'Step',
    'Flow',
    'Bundle/Flow Map',
  ]);
  assert.deepEqual(Object.keys(contract.layers), [
    'sourceSnapshot',
    'workingSource',
    'canonical',
    'creatorDraft',
    'publishedVersion',
    'personalOverlay',
    'executionRun',
    'exportSnapshot',
  ]);
  assert.equal(contract.layers.sourceSnapshot.writeOwner, 'none');
  assert.equal(contract.layers.sourceSnapshot.mutability, 'immutable');
  assert.equal(contract.layers.workingSource.writeOwner, 'authoring-draft');
  assert.equal(contract.layers.canonical.mutability, 'derived');
  assert.equal(contract.layers.creatorDraft.writeOwner, 'creator-draft-library');
  assert.equal(contract.layers.publishedVersion.pocImplemented, false);
  assert.equal(contract.layers.personalOverlay.writeOwner, 'personal-workspace-shadow');
  assert.equal(contract.layers.executionRun.writeOwner, 'personal-workspace-shadow');
  assert.equal(contract.layers.exportSnapshot.pocImplemented, false);
  assert.ok(contract.sourceCandidateMustPreserve.includes('personal-plan-overlay'));
  assert.ok(contract.unownedInThisPoc.includes('published-version'));
  assert.equal(Object.isFrozen(contract), true);
});

test('maps every projected SourceRow through Item and derived Step to its stable Flow identity', () => {
  const flow = authoredFlow();
  const result = buildPersonalWorkspacePocCanonicalProjectionMapping(flow);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.reason);
  assert.equal(result.mapping.productionCanonicalApproved, false);
  assert.equal(result.mapping.rows.length, flow.items.length);
  assert.deepEqual(result.mapping.rows.map((row) => row.itemRef), flow.items.map((item) => item.ref));
  assert.equal(result.mapping.rows[0].sourceRowProjectionKey, `${flow.ref}:source-order:0`);
  assert.equal(result.mapping.rows[0].stepProjectionRef, `${flow.items[0].ref}:poc-step-v1`);
  assert.equal(result.mapping.rows[0].flowRef, flow.ref);
  assert.equal(result.mapping.rows[0].bundleFlowMapRef, null);
  assert.equal(Object.isFrozen(result.mapping.rows), true);

  assert.deepEqual(buildPersonalWorkspacePocCanonicalProjectionMapping({
    ...flow,
    origin: 'legacy-saved-plan',
  }), { ok: false, reason: 'unsupported-origin' });
});

test('projects an applied source version while preserving stable existing Flow and Item identity', () => {
  const { flow, fixture, store } = applied();
  const result = getPersonalWorkspacePocEffectiveSourceFlow(flow, store);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.reason);

  assert.equal(result.candidateId, fixture.envelope.candidateId);
  assert.equal(result.flow.ref, flow.ref);
  assert.equal(result.flow.savedCopyId, flow.savedCopyId);
  assert.equal(result.flow.flowId, flow.flowId);
  assert.equal(result.flow.items[0].ref, flow.items[0].ref);
  assert.equal(result.flow.items[0].itemId, flow.items[0].itemId);
  assert.equal(result.flow.items[0].title, '준비물 확인');
  assert.equal(result.flow.items[1].title, '우산 확인');
  const lineage = (result.flow as PersonalWorkspacePocAuthoredFlow).authoring;
  assert.equal(lineage.revisionId, 'revision-owner-incoming');
  assert.equal(lineage.rawText, INCOMING_RAW);
  assert.equal(lineage.sourceSnapshotId, fixture.envelope.incoming.sourceSnapshotId);
  assert.equal(lineage.sourceLineItemIdentityMap, undefined);
  assert.equal(lineage.parsedItems, undefined);
  assert.equal(flow.title, '출근 준비');
  assert.equal(flow.items[0].title, '가방 챙기기');
});

test('composes source versions before personal/execution owners without receiving or mutating their state', () => {
  const { flow, store } = applied();
  const other: PersonalWorkspacePocFlow = {
    ref: toPersonalWorkspacePocFlowRef('copy-other', 'flow-other'),
    savedCopyId: 'copy-other',
    flowId: 'flow-other',
    sourceSlug: 'other',
    title: '운영 읽기 Flow',
    origin: 'legacy-saved-plan',
    items: [],
  };
  const personalAndExecutionState = {
    personalPlanOverlays: { [flow.ref]: { title: '내 제목' } },
    placements: { 'item-bag': { date: '2026-09-05' } },
    completions: { 'item-bag': { status: 'completed' } },
  };
  const before = JSON.stringify(personalAndExecutionState);
  const result = composePersonalWorkspacePocEffectiveSourceFlows([flow, other], store);

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.flows[0].title, '출근 준비 v2');
  assert.equal(result.ok && result.flows[1], other);
  assert.equal(JSON.stringify(personalAndExecutionState), before);
});

test('keeps personal order and appends a newly arrived source Item without mutating the overlay', () => {
  const { flow, store } = applied();
  const effective = getPersonalWorkspacePocEffectiveSourceFlow(flow, store);
  assert.equal(effective.ok, true);
  if (!effective.ok) throw new Error(effective.reason);
  const overlay = {
    flowRef: flow.ref,
    savedCopyId: flow.savedCopyId,
    flowId: flow.flowId,
    orderedItemRefs: [flow.items[0].ref],
    items: {},
  };
  const before = JSON.stringify(overlay);
  const reconciled = reconcilePersonalWorkspacePocPersonalPlanOverlayForSourceVersion(
    effective.flow,
    overlay,
  );
  assert.equal(reconciled.ok, true);
  assert.deepEqual(reconciled.ok && reconciled.overlay.orderedItemRefs, [
    flow.items[0].ref,
    effective.flow.items[1].ref,
  ]);
  assert.equal(JSON.stringify(overlay), before);
});

test('integrates before personal overlay so source additions do not erase personal title or order', () => {
  const { flow, store } = applied();
  const state = createPersonalWorkspacePocState(T0);
  state.authoredFlows = [flow];
  state.personalPlanOverlays = {
    [flow.ref]: {
      flowRef: flow.ref,
      savedCopyId: flow.savedCopyId,
      flowId: flow.flowId,
      orderedItemRefs: [flow.items[0].ref],
      items: {
        [flow.items[0].ref]: {
          itemRef: flow.items[0].ref,
          title: '내가 정한 준비물',
        },
      },
    },
  };
  const before = JSON.stringify(state);
  const result = composePersonalWorkspacePocReadModel({
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [],
  }, state, store);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.model.flows[0].items[0].title, '내가 정한 준비물');
  assert.equal(result.ok && result.model.flows[0].items[1].title, '우산 확인');
  assert.equal(JSON.stringify(state), before);
});

test('fails closed for duplicate, missing, or non-authoring candidate targets', async (t) => {
  const { flow, store } = applied();

  await t.test('duplicate base identity', () => {
    assert.deepEqual(composePersonalWorkspacePocEffectiveSourceFlows([flow, flow], store), {
      ok: false,
      reason: 'duplicate-flow-identity',
    });
  });

  await t.test('missing target', () => {
    assert.deepEqual(composePersonalWorkspacePocEffectiveSourceFlows([], store), {
      ok: false,
      reason: 'missing-source-candidate-target',
    });
  });

  await t.test('non-authoring target', () => {
    const legacy = { ...flow, origin: 'legacy-saved-plan' as const };
    assert.deepEqual(getPersonalWorkspacePocEffectiveSourceFlow(legacy, store), {
      ok: false,
      reason: 'unsupported-origin',
    });
  });
});

test('returns original source objects unchanged when no effective source version exists', () => {
  const flow = authoredFlow();
  const empty = createPersonalWorkspacePocSourceCandidateStore(T0);
  const single = getPersonalWorkspacePocEffectiveSourceFlow(flow, empty);
  assert.deepEqual(single, { ok: true, flow });
  const composed = composePersonalWorkspacePocEffectiveSourceFlows([flow], empty);
  assert.equal(composed.ok && composed.flows[0], flow);
});
