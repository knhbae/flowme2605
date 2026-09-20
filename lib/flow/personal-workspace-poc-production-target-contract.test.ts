import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FLOWME_PRODUCTION_TARGET_IDENTITY_OWNER_PLANNING_V1,
  FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION,
  validateFlowmeProductionTargetPlanningDocument,
  validateFlowmeProductionTargetVersionTransition,
  type FlowmeProductionTargetValidationResult,
} from './personal-workspace-poc-production-target-contract';
import {
  cloneFlowmeProductionTargetFixture,
  createFlowmeProductionTargetPlanningAfterFixture,
  createFlowmeProductionTargetPlanningBeforeFixture,
  createFlowmeProductionTargetVersionTransitionFixture,
} from './personal-workspace-poc-production-target-contract.fixtures';

function errorCodes(result: FlowmeProductionTargetValidationResult): string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}

test('labels the versioned contract as a production target plan without claiming operating ownership', () => {
  const contract = FLOWME_PRODUCTION_TARGET_IDENTITY_OWNER_PLANNING_V1;
  assert.equal(contract.contractVersion, FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION);
  assert.equal(contract.contractStatus, 'production-target-planning-contract');
  assert.equal(contract.productionApproved, false);
  assert.equal(contract.operatingSchemaOwned, false);
  assert.equal(contract.runtimeWriterImplemented, false);
  assert.equal(contract.migrationImplemented, false);
  assert.deepEqual(contract.identityPath, [
    'SourceRow',
    'Item',
    'Step',
    'Flow',
    'Bundle/Flow Map',
  ]);
  assert.equal(contract.compatibilityBoundary.juneStepContract,
    'historical-route-and-export-adapter-only');
  assert.equal(contract.compatibilityBoundary.itemOwnsIndependentExecutionState, true);
  assert.equal(contract.compatibilityBoundary.stepIsSemanticGroupingOnly, true);
  assert.equal(contract.compatibilityBoundary.bundleFlowMapCardinality,
    'zero-or-one-optional-discovery-group');
  assert.equal(contract.compatibilityBoundary.stableIdCollisionScope,
    'document-scoped-across-entity-kinds');
  assert.equal(contract.compatibilityBoundary.multiContentRegistryUniquenessImplemented, false);
  assert.equal(contract.compatibilityBoundary.collaborativeAuthoringStrategyStatus,
    'recommendation-pending-owner-review');
  assert.equal(contract.versionRules.pointerMove, 'structural-version-pointer-transition');
  assert.equal(contract.versionRules.reviewProofIncluded, false);
  assert.equal(contract.versionRules.versionResolutionReceiptImplemented, false);
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
  for (const layer of Object.values(contract.layers)) {
    assert.equal(layer.ownerScope, 'planning-role');
    assert.equal(layer.operatingOwnerAssigned, false);
    assert.ok(layer.logicalReadOwner);
    assert.ok(layer.logicalWriteOwner);
    assert.ok(layer.mutability);
    assert.ok(layer.derivation);
    assert.equal(Object.isFrozen(layer), true);
  }
  assert.ok(contract.excludedUntilApproved.includes('runtime writer'));
  assert.ok(contract.excludedUntilApproved.includes('migration'));
});

test('accepts complete v1 and v2 SourceRow to Item to Step to Flow to Bundle graphs', () => {
  const before = createFlowmeProductionTargetPlanningBeforeFixture();
  const after = createFlowmeProductionTargetPlanningAfterFixture();
  assert.deepEqual(validateFlowmeProductionTargetPlanningDocument(before), { ok: true });
  assert.deepEqual(validateFlowmeProductionTargetPlanningDocument(after), { ok: true });

  const v2 = after.publishedVersionHistory[1];
  assert.ok(v2.identityEdges.some((edge) => (
    edge.fromId === 'source-row:bag:v2'
      && edge.toId === 'item:bag'
      && edge.relation === 'evidence_for'
  )));
  assert.ok(v2.identityEdges.some((edge) => (
    edge.fromId === 'item:bag'
      && edge.toId === 'step:prepare'
      && edge.relation === 'grouped_by'
  )));
  assert.ok(v2.identityEdges.some((edge) => (
    edge.fromId === 'flow:morning-readiness'
      && edge.toId === 'bundle:daily-readiness'
      && edge.relation === 'published_in'
  )));
});

test('accepts a standalone Flow without an optional Bundle or Flow Map grouping', () => {
  const document = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetPlanningBeforeFixture(),
  ) as any;
  document.identities = document.identities.filter(
    (identity: { kind: string }) => identity.kind !== 'bundle-flow-map',
  );
  const version = document.publishedVersionHistory[0];
  version.activeNodeIds = version.activeNodeIds.filter(
    (nodeId: string) => nodeId !== 'bundle:daily-readiness',
  );
  version.identityEdges = version.identityEdges.filter(
    (edge: { relation: string }) => edge.relation !== 'published_in',
  );
  assert.deepEqual(validateFlowmeProductionTargetPlanningDocument(document), { ok: true });
});

test('accepts one structural immutable version append while preserving overlay and run bytes', () => {
  const transition = createFlowmeProductionTargetVersionTransitionFixture();
  assert.deepEqual(validateFlowmeProductionTargetVersionTransition(transition), { ok: true });
  assert.equal(
    JSON.stringify(transition.before.personalOverlays),
    JSON.stringify(transition.after.personalOverlays),
  );
  assert.equal(
    JSON.stringify(transition.before.executionRuns),
    JSON.stringify(transition.after.executionRuns),
  );
  assert.equal(transition.before.personalCopies[0].pinnedVersionId, transition.fromVersionId);
  assert.equal(transition.after.personalCopies[0].pinnedVersionId, transition.toVersionId);
});

test('allows a removed Item to leave the active graph while retaining its overlay and execution history', () => {
  const transition = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetVersionTransitionFixture(),
  ) as any;
  transition.after.identities = transition.after.identities.filter(
    (identity: { stableId: string }) => identity.stableId !== 'source-row:bag:v2',
  );
  const v2 = transition.after.publishedVersionHistory[1];
  v2.activeNodeIds = v2.activeNodeIds.filter(
    (nodeId: string) => nodeId !== 'source-row:bag:v2' && nodeId !== 'item:bag',
  );
  v2.identityEdges = v2.identityEdges.filter(
    (edge: { fromId: string; toId: string }) => (
      edge.fromId !== 'source-row:bag:v2'
      && edge.fromId !== 'item:bag'
      && edge.toId !== 'item:bag'
    ),
  );

  assert.deepEqual(validateFlowmeProductionTargetPlanningDocument(transition.after), { ok: true });
  assert.deepEqual(validateFlowmeProductionTargetVersionTransition(transition), { ok: true });
  assert.ok(transition.after.identities.some(
    (identity: { stableId: string }) => identity.stableId === 'item:bag',
  ));
  assert.equal(transition.after.personalOverlays[0].itemId, 'item:bag');
  assert.equal(transition.after.executionRuns[0].itemStates[0].itemId, 'item:bag');
});

test('fails closed on unsupported versions and planning-boundary drift', () => {
  const unsupported = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetPlanningBeforeFixture(),
  ) as any;
  unsupported.contractVersion = 'flowme-production-target-v2';
  assert.deepEqual(errorCodes(validateFlowmeProductionTargetPlanningDocument(unsupported)), [
    'unsupported-contract-version',
  ]);

  const schemaClaim = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetPlanningBeforeFixture(),
  ) as any;
  schemaClaim.operatingSchemaOwned = true;
  assert.deepEqual(errorCodes(validateFlowmeProductionTargetPlanningDocument(schemaClaim)), [
    'invalid-document',
  ]);

  const unknownOwnershipClaim = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetPlanningBeforeFixture(),
  ) as any;
  unknownOwnershipClaim.operatingWriterOwner = 'quietly-assigned-service';
  assert.deepEqual(
    errorCodes(validateFlowmeProductionTargetPlanningDocument(unknownOwnershipClaim)),
    ['invalid-document'],
  );

  const inheritedOwnershipClaim = Object.assign(
    Object.create({ operatingWriterOwner: 'prototype-assigned-service' }),
    createFlowmeProductionTargetPlanningBeforeFixture(),
  );
  assert.deepEqual(
    errorCodes(validateFlowmeProductionTargetPlanningDocument(inheritedOwnershipClaim)),
    ['invalid-document'],
  );
});

test('fails closed on document-scoped cross-kind IDs and kind-scoped stable-key collisions', async (t) => {
  await t.test('document-scoped cross-kind ID collision', () => {
    const document = cloneFlowmeProductionTargetFixture(
      createFlowmeProductionTargetPlanningBeforeFixture(),
    ) as any;
    document.identities.push({ ...document.identities[0], stableKey: 'another-row' });
    assert.ok(errorCodes(validateFlowmeProductionTargetPlanningDocument(document))
      .includes('identity-id-collision'));
  });

  await t.test('kind-scoped stable key collision', () => {
    const document = cloneFlowmeProductionTargetFixture(
      createFlowmeProductionTargetPlanningBeforeFixture(),
    ) as any;
    document.identities.push({
      ...document.identities[0],
      stableId: 'source-row:collision',
    });
    assert.ok(errorCodes(validateFlowmeProductionTargetPlanningDocument(document))
      .includes('stable-key-collision'));
  });
});

test('fails closed on dangling, mistyped and cyclic hierarchy edges', async (t) => {
  await t.test('dangling endpoint', () => {
    const document = cloneFlowmeProductionTargetFixture(
      createFlowmeProductionTargetPlanningBeforeFixture(),
    ) as any;
    document.publishedVersionHistory[0].identityEdges[0].toId = 'item:missing';
    assert.ok(errorCodes(validateFlowmeProductionTargetPlanningDocument(document))
      .includes('edge-endpoint-invalid'));
  });

  await t.test('mistyped cycle', () => {
    const document = cloneFlowmeProductionTargetFixture(
      createFlowmeProductionTargetPlanningBeforeFixture(),
    ) as any;
    document.publishedVersionHistory[0].identityEdges.push({
      fromId: 'bundle:daily-readiness',
      toId: 'source-row:bag:v1',
      relation: 'evidence_for',
    });
    const codes = errorCodes(validateFlowmeProductionTargetPlanningDocument(document));
    assert.ok(codes.includes('edge-relation-invalid'));
    assert.ok(codes.includes('identity-cycle'));
  });
});

test('fails closed on a non-linear version chain and invalid current pointer', () => {
  const document = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetPlanningAfterFixture(),
  ) as any;
  document.publishedVersionHistory[1].predecessorVersionId = null;
  document.currentPublishedVersionId = 'published:missing';
  const codes = errorCodes(validateFlowmeProductionTargetPlanningDocument(document));
  assert.ok(codes.includes('version-history-not-linear'));
  assert.ok(codes.includes('current-version-invalid'));
});

test('rejects a published history array whose stored order is not append order', () => {
  const document = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetPlanningAfterFixture(),
  ) as any;
  document.publishedVersionHistory.reverse();
  assert.ok(errorCodes(validateFlowmeProductionTargetPlanningDocument(document))
    .includes('version-history-not-linear'));
});

test('rejects mutation of any existing published version during append', () => {
  const transition = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetVersionTransitionFixture(),
  ) as any;
  transition.after.publishedVersionHistory[0].contentHash = '3'.repeat(64);
  assert.ok(errorCodes(validateFlowmeProductionTargetVersionTransition(transition))
    .includes('existing-version-mutated'));
});

test('rejects mutation or replacement of a prior stable identity during append', () => {
  const transition = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetVersionTransitionFixture(),
  ) as any;
  transition.after.identities.find(
    (identity: { stableId: string }) => identity.stableId === 'item:bag',
  ).stableKey = 'bag-reassigned';
  assert.ok(errorCodes(validateFlowmeProductionTargetVersionTransition(transition))
    .includes('identity-registry-mutated'));
});

test('rejects personal overlay mutation during version pointer movement', () => {
  const transition = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetVersionTransitionFixture(),
  ) as any;
  transition.after.personalOverlays[0].memo = '새 버전이 개인 메모를 덮어씀';
  assert.ok(errorCodes(validateFlowmeProductionTargetVersionTransition(transition))
    .includes('personal-overlay-mutated'));
});

test('rejects execution or occurrence mutation during version pointer movement', () => {
  const transition = cloneFlowmeProductionTargetFixture(
    createFlowmeProductionTargetVersionTransitionFixture(),
  ) as any;
  transition.after.executionRuns[0].itemStates[0].state = 'pending';
  assert.ok(errorCodes(validateFlowmeProductionTargetVersionTransition(transition))
    .includes('execution-run-mutated'));
});

test('rejects foreign overlay and run Item references even when their strings look valid', async (t) => {
  await t.test('foreign overlay', () => {
    const document = cloneFlowmeProductionTargetFixture(
      createFlowmeProductionTargetPlanningBeforeFixture(),
    ) as any;
    document.personalOverlays[0].itemId = 'item:foreign';
    assert.ok(errorCodes(validateFlowmeProductionTargetPlanningDocument(document))
      .includes('personal-overlay-invalid'));
  });

  await t.test('foreign run item', () => {
    const document = cloneFlowmeProductionTargetFixture(
      createFlowmeProductionTargetPlanningBeforeFixture(),
    ) as any;
    document.executionRuns[0].itemStates[0].itemId = 'item:foreign';
    assert.ok(errorCodes(validateFlowmeProductionTargetPlanningDocument(document))
      .includes('execution-run-invalid'));
  });

  await t.test('future Item in an older pinned copy overlay', () => {
    const document = cloneFlowmeProductionTargetFixture(
      createFlowmeProductionTargetPlanningAfterFixture(),
    ) as any;
    document.personalCopies[0].pinnedVersionId = document.publishedVersionHistory[0].versionId;
    document.personalOverlays[0].itemId = 'item:umbrella';
    assert.ok(errorCodes(validateFlowmeProductionTargetPlanningDocument(document))
      .includes('personal-overlay-invalid'));
  });

  await t.test('future Item in an older execution run', () => {
    const document = cloneFlowmeProductionTargetFixture(
      createFlowmeProductionTargetPlanningAfterFixture(),
    ) as any;
    document.executionRuns[0].itemStates[0].itemId = 'item:umbrella';
    assert.ok(errorCodes(validateFlowmeProductionTargetPlanningDocument(document))
      .includes('execution-run-invalid'));
  });

  await t.test('removed Item in a run pinned to the removal version', () => {
    const document = cloneFlowmeProductionTargetFixture(
      createFlowmeProductionTargetPlanningAfterFixture(),
    ) as any;
    const version = document.publishedVersionHistory[1];
    version.activeNodeIds = version.activeNodeIds.filter(
      (identityId: string) => !['source-row:bag:v2', 'item:bag'].includes(identityId),
    );
    version.identityEdges = version.identityEdges.filter(
      (edge: { fromId: string; toId: string }) => (
        !['source-row:bag:v2', 'item:bag'].includes(edge.fromId)
        && !['source-row:bag:v2', 'item:bag'].includes(edge.toId)
      ),
    );
    document.executionRuns[0].contentVersionId = version.versionId;

    const codes = errorCodes(validateFlowmeProductionTargetPlanningDocument(document));
    assert.ok(codes.includes('execution-run-invalid'));
    assert.ok(!codes.includes('personal-overlay-invalid'));
  });
});
