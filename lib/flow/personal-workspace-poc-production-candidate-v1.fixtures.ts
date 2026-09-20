import {
  PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION,
  type FlowmeProductionCandidateContentDocument,
  type FlowmeProductionCandidatePublishTransition,
  type FlowmeProductionCandidateResolutionTransition,
  type FlowmeProductionCandidateSnapshot,
} from './personal-workspace-poc-production-candidate-v1';

const uuid = (value: number): string => (
  `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`
);

const sha256 = (digit: string): string => `sha256:${digit.repeat(64)}`;

export const FLOWME_PRODUCTION_CANDIDATE_FIXTURE_IDS = Object.freeze({
  registry: uuid(1),
  source: uuid(2),
  sourceSnapshotV1: uuid(3),
  sourceSnapshotV2: uuid(4),
  sourceRowBagV1: uuid(5),
  sourceRowRemovedV1: uuid(6),
  sourceRowBagV2: uuid(7),
  sourceRowAddedV2: uuid(8),
  bundledContent: uuid(9),
  bagItem: uuid(10),
  removedItem: uuid(11),
  addedItem: uuid(12),
  bundledStep: uuid(13),
  bundledFlow: uuid(14),
  bundle: uuid(15),
  bundledVersionV1: uuid(16),
  bundledVersionV2: uuid(17),
  standaloneContent: uuid(18),
  standaloneItem: uuid(19),
  standaloneStep: uuid(20),
  standaloneFlow: uuid(21),
  standaloneVersionV1: uuid(22),
  legacyFlowBinding: uuid(23),
  legacyItemBinding: uuid(24),
  personalCopy: uuid(25),
  executionRun: uuid(26),
  exportSnapshot: uuid(27),
  sourceSnapshotV1Audit: uuid(28),
  sourceSnapshotV2Audit: uuid(29),
  bundledVersionV1Audit: uuid(30),
  standaloneVersionV1Audit: uuid(31),
  exportAudit: uuid(32),
  bundledVersionV2Audit: uuid(33),
  resolutionAudit: uuid(34),
  resolutionReceipt: uuid(35),
  review: uuid(36),
  manualReview: uuid(37),
  changedConflict: uuid(38),
  removedConflict: uuid(39),
  addedConflict: uuid(40),
  bagSourceRefV1: uuid(41),
  removedSourceRefV1: uuid(42),
  bagSourceRefV2: uuid(43),
  addedSourceRefV2: uuid(44),
  standaloneSourceRefV1: uuid(45),
  owner: uuid(900),
  sourceSnapshotV1Operation: uuid(901),
  sourceSnapshotV2Operation: uuid(902),
  bundledVersionV1Operation: uuid(903),
  standaloneVersionV1Operation: uuid(904),
  exportOperation: uuid(905),
  publishV2Operation: uuid(906),
  resolutionOperation: uuid(907),
});

const IDS = FLOWME_PRODUCTION_CANDIDATE_FIXTURE_IDS;

export function cloneFlowmeProductionCandidateFixture<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const sourcePlane = Object.freeze({
  sources: [{
    sourceId: IDS.source,
    canonicalizationVersion: 'canonical-url-v1',
    canonicalUrl: 'https://example.com/readiness',
  }],
  sourceSnapshots: [{
    snapshotId: IDS.sourceSnapshotV1,
    sourceId: IDS.source,
    snapshotNo: 1,
    contentHash: sha256('1'),
    finalizedAt: '2026-09-01T00:00:00.000Z',
    immutable: true,
  }, {
    snapshotId: IDS.sourceSnapshotV2,
    sourceId: IDS.source,
    snapshotNo: 2,
    contentHash: sha256('2'),
    finalizedAt: '2026-09-02T00:00:00.000Z',
    immutable: true,
  }],
  sourceRows: [{
    sourceRowId: IDS.sourceRowBagV1,
    snapshotId: IDS.sourceSnapshotV1,
    stableKey: 'bag',
    rowHash: sha256('3'),
    order: 0,
  }, {
    sourceRowId: IDS.sourceRowRemovedV1,
    snapshotId: IDS.sourceSnapshotV1,
    stableKey: 'paper-map',
    rowHash: sha256('4'),
    order: 1,
  }, {
    sourceRowId: IDS.sourceRowBagV2,
    snapshotId: IDS.sourceSnapshotV2,
    stableKey: 'bag',
    rowHash: sha256('5'),
    order: 0,
  }, {
    sourceRowId: IDS.sourceRowAddedV2,
    snapshotId: IDS.sourceSnapshotV2,
    stableKey: 'umbrella',
    rowHash: sha256('6'),
    order: 1,
  }],
});

const bundledV1 = Object.freeze({
  versionId: IDS.bundledVersionV1,
  contentId: IDS.bundledContent,
  versionNo: 1,
  predecessorVersionId: null,
  lifecycle: 'published' as const,
  contentHash: sha256('7'),
  sealedAt: '2026-09-01T01:00:00.000Z',
  immutable: true as const,
  activeNodeIds: [
    IDS.bagItem,
    IDS.removedItem,
    IDS.bundledStep,
    IDS.bundledFlow,
    IDS.bundle,
  ],
  structuralEdges: [{
    fromId: IDS.bagItem,
    toId: IDS.bundledStep,
    relation: 'grouped_by' as const,
  }, {
    fromId: IDS.removedItem,
    toId: IDS.bundledStep,
    relation: 'grouped_by' as const,
  }, {
    fromId: IDS.bundledStep,
    toId: IDS.bundledFlow,
    relation: 'belongs_to' as const,
  }, {
    fromId: IDS.bundledFlow,
    toId: IDS.bundle,
    relation: 'published_in' as const,
  }],
  evidenceEdges: [{
    sourceRefId: IDS.bagSourceRefV1,
    sourceRowId: IDS.sourceRowBagV1,
    itemId: IDS.bagItem,
    relation: 'evidence_for' as const,
    supportLevel: 'direct' as const,
  }, {
    sourceRefId: IDS.removedSourceRefV1,
    sourceRowId: IDS.sourceRowRemovedV1,
    itemId: IDS.removedItem,
    relation: 'evidence_for' as const,
    supportLevel: 'direct' as const,
  }],
});

const bundledV2 = Object.freeze({
  versionId: IDS.bundledVersionV2,
  contentId: IDS.bundledContent,
  versionNo: 2,
  predecessorVersionId: IDS.bundledVersionV1,
  lifecycle: 'published' as const,
  contentHash: sha256('8'),
  sealedAt: '2026-09-03T01:00:00.000Z',
  immutable: true as const,
  activeNodeIds: [
    IDS.bagItem,
    IDS.addedItem,
    IDS.bundledStep,
    IDS.bundledFlow,
    IDS.bundle,
  ],
  structuralEdges: [{
    fromId: IDS.bagItem,
    toId: IDS.bundledStep,
    relation: 'grouped_by' as const,
  }, {
    fromId: IDS.addedItem,
    toId: IDS.bundledStep,
    relation: 'grouped_by' as const,
  }, {
    fromId: IDS.bundledStep,
    toId: IDS.bundledFlow,
    relation: 'belongs_to' as const,
  }, {
    fromId: IDS.bundledFlow,
    toId: IDS.bundle,
    relation: 'published_in' as const,
  }],
  evidenceEdges: [{
    sourceRefId: IDS.bagSourceRefV2,
    sourceRowId: IDS.sourceRowBagV2,
    itemId: IDS.bagItem,
    relation: 'evidence_for' as const,
    supportLevel: 'direct' as const,
  }, {
    sourceRefId: IDS.addedSourceRefV2,
    sourceRowId: IDS.sourceRowAddedV2,
    itemId: IDS.addedItem,
    relation: 'evidence_for' as const,
    supportLevel: 'creator_interpretation' as const,
  }],
});

function createBundledDocumentBefore(): FlowmeProductionCandidateContentDocument {
  return {
    structure: 'bundled',
    contentId: IDS.bundledContent,
    canonicalIdentity: {
      canonicalSourceId: IDS.source,
      userJobId: 'leave-home-ready',
      editorialVariantId: 'commute-default',
    },
    rootBundleId: IDS.bundle,
    currentPublishedVersionId: IDS.bundledVersionV1,
    identities: [{
      nodeId: IDS.bagItem,
      contentId: IDS.bundledContent,
      kind: 'item',
      stableKey: 'bag',
      createdInVersionNo: 1,
    }, {
      nodeId: IDS.removedItem,
      contentId: IDS.bundledContent,
      kind: 'item',
      stableKey: 'paper-map',
      createdInVersionNo: 1,
    }, {
      nodeId: IDS.bundledStep,
      contentId: IDS.bundledContent,
      kind: 'step',
      stableKey: 'prepare',
      createdInVersionNo: 1,
    }, {
      nodeId: IDS.bundledFlow,
      contentId: IDS.bundledContent,
      kind: 'flow',
      stableKey: 'morning-readiness',
      createdInVersionNo: 1,
    }, {
      nodeId: IDS.bundle,
      contentId: IDS.bundledContent,
      kind: 'bundle-flow-map',
      stableKey: 'daily-readiness',
      createdInVersionNo: 1,
    }],
    publishedVersions: [bundledV1],
  };
}

function createBundledDocumentAfter(): FlowmeProductionCandidateContentDocument {
  const document = cloneFlowmeProductionCandidateFixture(createBundledDocumentBefore()) as any;
  document.currentPublishedVersionId = IDS.bundledVersionV2;
  document.identities.find((node: { nodeId: string }) => (
    node.nodeId === IDS.removedItem
  )).retiredInVersionNo = 2;
  document.identities.splice(2, 0, {
    nodeId: IDS.addedItem,
    contentId: IDS.bundledContent,
    kind: 'item',
    stableKey: 'umbrella',
    createdInVersionNo: 2,
  });
  document.publishedVersions.push(cloneFlowmeProductionCandidateFixture(bundledV2));
  return document as FlowmeProductionCandidateContentDocument;
}

function createStandaloneDocument(): FlowmeProductionCandidateContentDocument {
  return {
    structure: 'standalone',
    contentId: IDS.standaloneContent,
    canonicalIdentity: {
      canonicalSourceId: IDS.source,
      userJobId: 'check-one-thing',
      editorialVariantId: 'standalone-default',
    },
    rootFlowId: IDS.standaloneFlow,
    currentPublishedVersionId: IDS.standaloneVersionV1,
    identities: [{
      nodeId: IDS.standaloneItem,
      contentId: IDS.standaloneContent,
      kind: 'item',
      stableKey: 'bag',
      createdInVersionNo: 1,
    }, {
      nodeId: IDS.standaloneStep,
      contentId: IDS.standaloneContent,
      kind: 'step',
      stableKey: 'prepare',
      createdInVersionNo: 1,
    }, {
      nodeId: IDS.standaloneFlow,
      contentId: IDS.standaloneContent,
      kind: 'flow',
      stableKey: 'one-check',
      createdInVersionNo: 1,
    }],
    publishedVersions: [{
      versionId: IDS.standaloneVersionV1,
      contentId: IDS.standaloneContent,
      versionNo: 1,
      predecessorVersionId: null,
      lifecycle: 'published',
      contentHash: sha256('9'),
      sealedAt: '2026-09-01T02:00:00.000Z',
      immutable: true,
      activeNodeIds: [IDS.standaloneItem, IDS.standaloneStep, IDS.standaloneFlow],
      structuralEdges: [{
        fromId: IDS.standaloneItem,
        toId: IDS.standaloneStep,
        relation: 'grouped_by',
      }, {
        fromId: IDS.standaloneStep,
        toId: IDS.standaloneFlow,
        relation: 'belongs_to',
      }],
      evidenceEdges: [{
        sourceRefId: IDS.standaloneSourceRefV1,
        sourceRowId: IDS.sourceRowBagV1,
        itemId: IDS.standaloneItem,
        relation: 'evidence_for',
        supportLevel: 'direct',
      }],
    }],
  };
}

const boundary = Object.freeze({
  contractVersion: PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION,
  contractStatus: 'isolated-production-candidate' as const,
  productionApproved: false as const,
  operatingSchemaOwned: false as const,
  runtimeWriterImplemented: false as const,
  migrationImplemented: false as const,
  migrationMode: 'none-read-only-legacy-binding' as const,
  providerSyncImplemented: false as const,
  providerSyncMode: 'unsupported-detached-one-way-export' as const,
});

const legacyBindings = Object.freeze([{
  bindingId: IDS.legacyFlowBinding,
  origin: 'legacy-saved-plan' as const,
  legacyKind: 'saved-flow' as const,
  legacyRef: 'savedCopyId=copy-a&flowId=morning-readiness',
  targetContentId: IDS.bundledContent,
  targetNodeId: IDS.bundledFlow,
  mode: 'read-only' as const,
}, {
  bindingId: IDS.legacyItemBinding,
  origin: 'authoring-handoff' as const,
  legacyKind: 'flow-item' as const,
  legacyRef: 'savedCopyId=copy-a&flowId=morning-readiness&itemId=bag',
  targetContentId: IDS.bundledContent,
  targetNodeId: IDS.bagItem,
  mode: 'read-only' as const,
}]);

const privatePlaneV1 = Object.freeze({
  personalCopies: [{
    copyId: IDS.personalCopy,
    ownerId: IDS.owner,
    contentId: IDS.bundledContent,
    pinnedVersionId: IDS.bundledVersionV1,
    flowId: IDS.bundledFlow,
    revision: 1,
    status: 'active' as const,
  }],
  personalOverlays: [{
    copyId: IDS.personalCopy,
    itemId: IDS.bagItem,
    revision: 1,
    retainedRemoved: false,
    title: '내 가방 확인',
  }, {
    copyId: IDS.personalCopy,
    itemId: IDS.removedItem,
    revision: 1,
    retainedRemoved: false,
    included: true,
  }],
  executionRuns: [{
    runId: IDS.executionRun,
    copyId: IDS.personalCopy,
    contentVersionId: IDS.bundledVersionV1,
    status: 'active' as const,
    itemStates: [{ itemId: IDS.bagItem, state: 'pending' as const }, {
      itemId: IDS.removedItem,
      state: 'done' as const,
    }],
  }],
  versionResolutionReceipts: [],
  exportSnapshots: [{
    exportSnapshotId: IDS.exportSnapshot,
    copyId: IDS.personalCopy,
    pinnedVersionId: IDS.bundledVersionV1,
    effectiveStateHash: sha256('a'),
    artifactHash: sha256('b'),
    format: 'markdown' as const,
    createdAt: '2026-09-02T03:00:00.000Z',
    retention: 'ephemeral-artifact-with-owner-receipt' as const,
    detached: true as const,
    writesBack: false as const,
    immutable: true as const,
  }],
});

function audit(
  auditId: string,
  operationId: string,
  kind: 'source-snapshot-finalized' | 'published-version-appended'
    | 'version-resolution-applied' | 'export-snapshot-created',
  actorKind: 'source-ingestion-finalizer' | 'publication-service'
    | 'copy-owner' | 'projection-service',
  subjectId: string,
  occurredAt: string,
  hashDigit: string,
) {
  return {
    auditId,
    operationId,
    kind,
    actorKind,
    subjectId,
    occurredAt,
    metadataHash: sha256(hashDigit),
    payloadPolicy: 'metadata-only' as const,
  };
}

function createBaseAudits() {
  return [
    audit(IDS.sourceSnapshotV1Audit, IDS.sourceSnapshotV1Operation,
      'source-snapshot-finalized', 'source-ingestion-finalizer', IDS.sourceSnapshotV1,
      '2026-09-01T00:00:01.000Z', 'c'),
    audit(IDS.sourceSnapshotV2Audit, IDS.sourceSnapshotV2Operation,
      'source-snapshot-finalized', 'source-ingestion-finalizer', IDS.sourceSnapshotV2,
      '2026-09-02T00:00:01.000Z', 'd'),
    audit(IDS.bundledVersionV1Audit, IDS.bundledVersionV1Operation,
      'published-version-appended', 'publication-service', IDS.bundledVersionV1,
      '2026-09-01T01:00:01.000Z', 'e'),
    audit(IDS.standaloneVersionV1Audit, IDS.standaloneVersionV1Operation,
      'published-version-appended', 'publication-service', IDS.standaloneVersionV1,
      '2026-09-01T02:00:01.000Z', 'f'),
    audit(IDS.exportAudit, IDS.exportOperation,
      'export-snapshot-created', 'projection-service', IDS.exportSnapshot,
      '2026-09-02T03:00:01.000Z', '0'),
  ];
}

export function createFlowmeProductionCandidateBeforePublishFixture(
): FlowmeProductionCandidateSnapshot {
  return cloneFlowmeProductionCandidateFixture({
    ...boundary,
    registryId: IDS.registry,
    ...sourcePlane,
    documents: [createBundledDocumentBefore(), createStandaloneDocument()],
    legacyBindings,
    ...privatePlaneV1,
    auditEvents: createBaseAudits(),
  }) as FlowmeProductionCandidateSnapshot;
}

export function createFlowmeProductionCandidateAfterPublishFixture(
): FlowmeProductionCandidateSnapshot {
  const snapshot = createFlowmeProductionCandidateBeforePublishFixture() as any;
  snapshot.documents[0] = createBundledDocumentAfter();
  snapshot.auditEvents.push(audit(
    IDS.bundledVersionV2Audit,
    IDS.publishV2Operation,
    'published-version-appended',
    'publication-service',
    IDS.bundledVersionV2,
    '2026-09-03T01:00:01.000Z',
    '1',
  ));
  return snapshot as FlowmeProductionCandidateSnapshot;
}

export function createFlowmeProductionCandidatePublishTransitionFixture(
): FlowmeProductionCandidatePublishTransition {
  return {
    contractVersion: PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION,
    operationId: IDS.publishV2Operation,
    contentId: IDS.bundledContent,
    fromVersionId: IDS.bundledVersionV1,
    toVersionId: IDS.bundledVersionV2,
    before: createFlowmeProductionCandidateBeforePublishFixture(),
    after: createFlowmeProductionCandidateAfterPublishFixture(),
  };
}

export function createFlowmeProductionCandidateAfterResolutionFixture(
): FlowmeProductionCandidateSnapshot {
  const snapshot = createFlowmeProductionCandidateAfterPublishFixture() as any;
  snapshot.personalCopies[0].pinnedVersionId = IDS.bundledVersionV2;
  snapshot.personalCopies[0].revision = 2;
  snapshot.personalOverlays[0].revision = 2;
  delete snapshot.personalOverlays[0].title;
  snapshot.personalOverlays[1].revision = 2;
  snapshot.personalOverlays[1].retainedRemoved = true;
  snapshot.personalOverlays.push({
    copyId: IDS.personalCopy,
    itemId: IDS.addedItem,
    revision: 1,
    retainedRemoved: false,
    included: true,
  });
  snapshot.versionResolutionReceipts.push({
    receiptId: IDS.resolutionReceipt,
    copyId: IDS.personalCopy,
    ownerId: IDS.owner,
    contentId: IDS.bundledContent,
    fromVersionId: IDS.bundledVersionV1,
    toVersionId: IDS.bundledVersionV2,
    fromCopyRevision: 1,
    toCopyRevision: 2,
    reviewId: IDS.review,
    manualReviewId: IDS.manualReview,
    conflicts: [{
      conflictId: IDS.changedConflict,
      itemId: IDS.bagItem,
      change: 'changed',
      field: 'title',
      sensitive: true,
      priorItemHash: sha256('2'),
      nextItemHash: sha256('3'),
    }, {
      conflictId: IDS.removedConflict,
      itemId: IDS.removedItem,
      change: 'removed',
      field: 'inclusion',
      sensitive: false,
      priorItemHash: sha256('4'),
    }, {
      conflictId: IDS.addedConflict,
      itemId: IDS.addedItem,
      change: 'added',
      field: 'inclusion',
      sensitive: false,
      nextItemHash: sha256('5'),
    }],
    decisions: [{
      conflictId: IDS.changedConflict,
      itemId: IDS.bagItem,
      action: 'use_latest',
      preservedOverlayHash: sha256('6'),
    }, {
      conflictId: IDS.removedConflict,
      itemId: IDS.removedItem,
      action: 'retain_removed',
      preservedOverlayHash: sha256('7'),
    }, {
      conflictId: IDS.addedConflict,
      itemId: IDS.addedItem,
      action: 'include',
      preservedOverlayHash: sha256('8'),
    }],
    conflictSetHash: sha256('9'),
    decisionSetHash: sha256('a'),
    executionStateHashBefore: sha256('b'),
    executionStateHashAfter: sha256('b'),
    idempotencyKey: 'resolve-copy-v1-to-v2',
    requestHash: sha256('c'),
    appliedAt: '2026-09-03T02:00:00.000Z',
    actorKind: 'copy-owner',
    immutable: true,
  });
  snapshot.auditEvents.push(audit(
    IDS.resolutionAudit,
    IDS.resolutionOperation,
    'version-resolution-applied',
    'copy-owner',
    IDS.resolutionReceipt,
    '2026-09-03T02:00:01.000Z',
    'd',
  ));
  return snapshot as FlowmeProductionCandidateSnapshot;
}

export function createFlowmeProductionCandidateResolutionTransitionFixture(
): FlowmeProductionCandidateResolutionTransition {
  return {
    contractVersion: PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION,
    operationId: IDS.resolutionOperation,
    copyId: IDS.personalCopy,
    receiptId: IDS.resolutionReceipt,
    before: createFlowmeProductionCandidateAfterPublishFixture(),
    after: createFlowmeProductionCandidateAfterResolutionFixture(),
  };
}
