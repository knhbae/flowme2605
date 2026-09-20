import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_BOUNDARY_V1,
  PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_LAYER_POLICIES_V1,
  PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION,
  validatePersonalWorkspacePocProductionCandidatePublishTransitionV1,
  validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1,
  validatePersonalWorkspacePocProductionCandidateV1,
  type FlowmeProductionCandidateValidationResult,
} from './personal-workspace-poc-production-candidate-v1';
import {
  FLOWME_PRODUCTION_CANDIDATE_FIXTURE_IDS,
  cloneFlowmeProductionCandidateFixture,
  createFlowmeProductionCandidateAfterPublishFixture,
  createFlowmeProductionCandidateAfterResolutionFixture,
  createFlowmeProductionCandidateBeforePublishFixture,
  createFlowmeProductionCandidatePublishTransitionFixture,
  createFlowmeProductionCandidateResolutionTransitionFixture,
} from './personal-workspace-poc-production-candidate-v1.fixtures';

function errorCodes(result: FlowmeProductionCandidateValidationResult): string[] {
  return result.ok ? [] : result.errors.map((error) => error.code);
}

function assertRejectedWith(
  result: FlowmeProductionCandidateValidationResult,
  expectedCode: string,
): void {
  assert.equal(result.ok, false);
  assert.ok(errorCodes(result).includes(expectedCode), JSON.stringify(result));
}

test('fixes eight concrete layer owner, write, retention, audit, and privacy boundaries', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_LAYER_POLICIES_V1.length, 8);
  assert.equal(
    new Set(PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_LAYER_POLICIES_V1
      .map((policy) => policy.layer)).size,
    8,
  );
  for (const policy of PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_LAYER_POLICIES_V1) {
    assert.equal(Object.isFrozen(policy), true);
    for (const value of [
      policy.serviceOwner,
      policy.writeAuthority,
      policy.mutationMode,
      policy.retentionClass,
      policy.auditEvent,
      policy.privacyClass,
    ]) {
      assert.ok(value.length > 0);
      assert.doesNotMatch(value, /^(none|unowned)$/);
    }
  }
  assert.equal(PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_BOUNDARY_V1.productionApproved,
    false);
  assert.equal(PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_BOUNDARY_V1.operatingSchemaOwned,
    false);
  assert.equal(PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_BOUNDARY_V1.runtimeWriterImplemented,
    false);
  assert.deepEqual(PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_BOUNDARY_V1.storageKeys, []);
});

test('accepts one registry with both bundled and standalone content documents', () => {
  const before = createFlowmeProductionCandidateBeforePublishFixture();
  const afterPublish = createFlowmeProductionCandidateAfterPublishFixture();
  const afterResolution = createFlowmeProductionCandidateAfterResolutionFixture();
  assert.deepEqual(validatePersonalWorkspacePocProductionCandidateV1(before), { ok: true });
  assert.deepEqual(validatePersonalWorkspacePocProductionCandidateV1(afterPublish), { ok: true });
  assert.deepEqual(validatePersonalWorkspacePocProductionCandidateV1(afterResolution), { ok: true });
  assert.deepEqual(before.documents.map((document) => document.structure), [
    'bundled',
    'standalone',
  ]);
});

test('enforces UUID uniqueness across the complete multi-document registry', () => {
  const snapshot = createFlowmeProductionCandidateBeforePublishFixture() as any;
  snapshot.sourceRows[0].sourceRowId = snapshot.sourceSnapshots[0].snapshotId;
  assertRejectedWith(validatePersonalWorkspacePocProductionCandidateV1(snapshot),
    'global-id-collision');
});

test('rejects duplicate canonical source, user-job, and editorial-variant tuples', () => {
  const snapshot = createFlowmeProductionCandidateBeforePublishFixture() as any;
  snapshot.documents[1].canonicalIdentity = cloneFlowmeProductionCandidateFixture(
    snapshot.documents[0].canonicalIdentity,
  );
  assertRejectedWith(validatePersonalWorkspacePocProductionCandidateV1(snapshot),
    'content-identity-collision');
});

test('scopes stable keys by content and node kind while rejecting same-scope collisions', () => {
  const valid = createFlowmeProductionCandidateBeforePublishFixture() as any;
  valid.documents[1].identities[2].stableKey = valid.documents[1].identities[0].stableKey;
  assert.deepEqual(validatePersonalWorkspacePocProductionCandidateV1(valid), { ok: true });

  const invalid = createFlowmeProductionCandidateBeforePublishFixture() as any;
  invalid.documents[0].identities[1].stableKey = invalid.documents[0].identities[0].stableKey;
  assertRejectedWith(validatePersonalWorkspacePocProductionCandidateV1(invalid),
    'node-stable-key-collision');
});

test('keeps legacy identities as unique read-only bindings to canonical UUID nodes', () => {
  const valid = createFlowmeProductionCandidateBeforePublishFixture();
  assert.ok(valid.legacyBindings.every((binding) => binding.mode === 'read-only'));
  assert.ok(valid.legacyBindings[1].legacyRef.includes('savedCopyId='));
  assert.ok(valid.legacyBindings[1].legacyRef.includes('flowId='));
  assert.ok(valid.legacyBindings[1].legacyRef.includes('itemId='));

  const invalid = cloneFlowmeProductionCandidateFixture(valid) as any;
  invalid.legacyBindings.push({
    ...invalid.legacyBindings[0],
    bindingId: '00000000-0000-4000-8000-000000001001',
  });
  assertRejectedWith(validatePersonalWorkspacePocProductionCandidateV1(invalid),
    'legacy-binding-invalid');
});

test('rejects legacy-derived canonical IDs instead of mint-once lowercase UUIDs', () => {
  const snapshot = createFlowmeProductionCandidateBeforePublishFixture() as any;
  snapshot.documents[0].identities[0].nodeId = 'copy-a:morning-readiness:bag';
  assert.equal(validatePersonalWorkspacePocProductionCandidateV1(snapshot).ok, false);
});

test('requires canonical lowercase sha256 colon plus 64 hexadecimal digits', () => {
  const shortHash = createFlowmeProductionCandidateBeforePublishFixture() as any;
  shortHash.sourceSnapshots[0].contentHash = 'source-fixture-fingerprint-v1';
  assert.equal(validatePersonalWorkspacePocProductionCandidateV1(shortHash).ok, false);

  const uppercaseHash = createFlowmeProductionCandidateBeforePublishFixture() as any;
  uppercaseHash.documents[0].publishedVersions[0].contentHash = `sha256:${'A'.repeat(64)}`;
  assert.equal(validatePersonalWorkspacePocProductionCandidateV1(uppercaseHash).ok, false);
});

test('keeps lifecycle audit payloads metadata-only and actor-bound', () => {
  const payloadLeak = createFlowmeProductionCandidateBeforePublishFixture() as any;
  payloadLeak.auditEvents[0].rawText = 'private source body';
  assert.equal(validatePersonalWorkspacePocProductionCandidateV1(payloadLeak).ok, false);

  const wrongActor = createFlowmeProductionCandidateBeforePublishFixture() as any;
  wrongActor.auditEvents[0].actorKind = 'copy-owner';
  assert.equal(validatePersonalWorkspacePocProductionCandidateV1(wrongActor).ok, false);
});

test('accepts publish as one immutable version append without moving the personal copy', () => {
  const transition = createFlowmeProductionCandidatePublishTransitionFixture();
  assert.deepEqual(
    validatePersonalWorkspacePocProductionCandidatePublishTransitionV1(transition),
    { ok: true },
  );
  assert.equal(transition.after.personalCopies[0].pinnedVersionId,
    FLOWME_PRODUCTION_CANDIDATE_FIXTURE_IDS.bundledVersionV1);
  assert.equal(transition.after.personalCopies[0].revision, 1);
  assert.equal(transition.after.versionResolutionReceipts.length, 0);
});

test('rejects a publish transition that rewrites an already published version', () => {
  const transition = createFlowmeProductionCandidatePublishTransitionFixture() as any;
  transition.after.documents[0].publishedVersions[0].contentHash = `sha256:${'e'.repeat(64)}`;
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidatePublishTransitionV1(transition),
    'publish-transition-invalid',
  );
});

test('rejects a publish transition that changes private copy or overlay state', () => {
  const transition = createFlowmeProductionCandidatePublishTransitionFixture() as any;
  transition.after.personalCopies[0].status = 'archived';
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidatePublishTransitionV1(transition),
    'private-state-mutated',
  );
});

test('rejects a publish transition that mutates source evidence or another document', () => {
  const sourceMutation = createFlowmeProductionCandidatePublishTransitionFixture() as any;
  sourceMutation.after.sources[0].canonicalUrl = 'https://example.com/rewritten';
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidatePublishTransitionV1(sourceMutation),
    'history-mutated',
  );

  const otherDocumentMutation = createFlowmeProductionCandidatePublishTransitionFixture() as any;
  otherDocumentMutation.after.documents[1].canonicalIdentity.userJobId = 'rewritten-job';
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidatePublishTransitionV1(otherDocumentMutation),
    'history-mutated',
  );
});

test('accepts a separate VersionResolution apply with an immutable receipt', () => {
  const transition = createFlowmeProductionCandidateResolutionTransitionFixture();
  assert.deepEqual(
    validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(transition),
    { ok: true },
  );
  assert.equal(transition.after.personalCopies[0].pinnedVersionId,
    FLOWME_PRODUCTION_CANDIDATE_FIXTURE_IDS.bundledVersionV2);
  assert.equal(transition.after.versionResolutionReceipts.length, 1);
});

test('preserves the old execution run and detached export after copy pin movement', () => {
  const transition = createFlowmeProductionCandidateResolutionTransitionFixture();
  assert.deepEqual(transition.after.executionRuns, transition.before.executionRuns);
  assert.deepEqual(transition.after.exportSnapshots, transition.before.exportSnapshots);
  assert.equal(transition.after.exportSnapshots[0].pinnedVersionId,
    FLOWME_PRODUCTION_CANDIDATE_FIXTURE_IDS.bundledVersionV1);
  assert.notEqual(transition.after.exportSnapshots[0].pinnedVersionId,
    transition.after.personalCopies[0].pinnedVersionId);
  assert.deepEqual(validatePersonalWorkspacePocProductionCandidateV1(transition.after), { ok: true });
});

test('rejects VersionResolution that changes any canonical document bytes', () => {
  const transition = createFlowmeProductionCandidateResolutionTransitionFixture() as any;
  transition.after.documents.reverse();
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(transition),
    'history-mutated',
  );
});

test('requires exactly one compatible decision for every receipt conflict', () => {
  const transition = createFlowmeProductionCandidateResolutionTransitionFixture() as any;
  transition.after.versionResolutionReceipts[0].decisions.pop();
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(transition),
    'resolution-receipt-invalid',
  );
});

test('requires an explicit manual review reference for sensitive conflict fields', () => {
  const transition = createFlowmeProductionCandidateResolutionTransitionFixture() as any;
  delete transition.after.versionResolutionReceipts[0].manualReviewId;
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(transition),
    'resolution-receipt-invalid',
  );
});

test('binds added, removed, and changed conflicts to actual version item presence and hashes', () => {
  const transition = createFlowmeProductionCandidateResolutionTransitionFixture() as any;
  const receipt = transition.after.versionResolutionReceipts[0];
  receipt.conflicts[2].itemId = FLOWME_PRODUCTION_CANDIDATE_FIXTURE_IDS.bagItem;
  receipt.decisions[2].itemId = FLOWME_PRODUCTION_CANDIDATE_FIXTURE_IDS.bagItem;
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(transition),
    'resolution-receipt-invalid',
  );
});

test('requires byte-equivalent execution-state hashes across VersionResolution', () => {
  const transition = createFlowmeProductionCandidateResolutionTransitionFixture() as any;
  transition.after.versionResolutionReceipts[0].executionStateHashAfter =
    `sha256:${'e'.repeat(64)}`;
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(transition),
    'resolution-receipt-invalid',
  );
});

test('requires every changed personal overlay field to have a reviewed conflict', () => {
  const transition = createFlowmeProductionCandidateResolutionTransitionFixture() as any;
  transition.after.personalOverlays[0].memo = 'unreviewed mutation';
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(transition),
    'private-state-mutated',
  );
});

test('rejects VersionResolution that rewrites execution history or a prior export', () => {
  const runMutation = createFlowmeProductionCandidateResolutionTransitionFixture() as any;
  runMutation.after.executionRuns[0].itemStates[0].state = 'done';
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(runMutation),
    'private-state-mutated',
  );

  const exportMutation = createFlowmeProductionCandidateResolutionTransitionFixture() as any;
  exportMutation.after.exportSnapshots[0].format = 'csv';
  assertRejectedWith(
    validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(exportMutation),
    'private-state-mutated',
  );
});

test('requires globally unique evidence-reference UUIDs across documents and versions', () => {
  const snapshot = createFlowmeProductionCandidateBeforePublishFixture() as any;
  snapshot.documents[1].publishedVersions[0].evidenceEdges[0].sourceRefId =
    FLOWME_PRODUCTION_CANDIDATE_FIXTURE_IDS.bagSourceRefV1;
  assertRejectedWith(validatePersonalWorkspacePocProductionCandidateV1(snapshot),
    'global-id-collision');
});

test('fails closed on runtime promotion, schema ownership, migration, provider sync, and writes-back', () => {
  for (const mutation of [
    (snapshot: any) => { snapshot.productionApproved = true; },
    (snapshot: any) => { snapshot.operatingSchemaOwned = true; },
    (snapshot: any) => { snapshot.runtimeWriterImplemented = true; },
    (snapshot: any) => { snapshot.migrationImplemented = true; },
    (snapshot: any) => { snapshot.providerSyncImplemented = true; },
    (snapshot: any) => { snapshot.exportSnapshots[0].writesBack = true; },
  ]) {
    const snapshot = createFlowmeProductionCandidateBeforePublishFixture() as any;
    mutation(snapshot);
    assert.equal(validatePersonalWorkspacePocProductionCandidateV1(snapshot).ok, false);
  }
});

test('fails closed on unknown contract versions and extra operating storage claims', () => {
  const unknown = createFlowmeProductionCandidateBeforePublishFixture() as any;
  unknown.contractVersion = 'flowme-personal-workspace-production-candidate-v2';
  assertRejectedWith(validatePersonalWorkspacePocProductionCandidateV1(unknown),
    'unsupported-contract-version');

  const storageClaim = createFlowmeProductionCandidateBeforePublishFixture() as any;
  storageClaim.storageKeys = ['flow:operating'];
  assertRejectedWith(validatePersonalWorkspacePocProductionCandidateV1(storageClaim),
    'boundary-claim-invalid');
});

test('does not accept publish and resolution envelopes through the opposite validator', () => {
  assert.equal(validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(
    createFlowmeProductionCandidatePublishTransitionFixture(),
  ).ok, false);
  assert.equal(validatePersonalWorkspacePocProductionCandidatePublishTransitionV1(
    createFlowmeProductionCandidateResolutionTransitionFixture(),
  ).ok, false);
  assert.equal(PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION,
    'flowme-personal-workspace-production-candidate-v1');
});
