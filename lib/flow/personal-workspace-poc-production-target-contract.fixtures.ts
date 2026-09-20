import {
  FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION,
  type FlowmeProductionTargetIdentity,
  type FlowmeProductionTargetIdentityEdge,
  type FlowmeProductionTargetPlanningDocument,
  type FlowmeProductionTargetPublishedVersion,
  type FlowmeProductionTargetVersionTransition,
} from './personal-workspace-poc-production-target-contract';

const CONTENT_ID = 'content:morning-readiness';
const V1 = 'published:morning-readiness:v1';
const V2 = 'published:morning-readiness:v2';
const COPY = 'copy:morning-readiness:owner-1';

const BASE_IDENTITIES: readonly FlowmeProductionTargetIdentity[] = [
  {
    stableId: 'source-row:bag:v1',
    stableKey: 'snapshot-v1:row-001',
    kind: 'source-row',
    createdInVersionNo: 1,
  },
  {
    stableId: 'item:bag',
    stableKey: 'bag',
    kind: 'item',
    createdInVersionNo: 1,
  },
  {
    stableId: 'step:prepare',
    stableKey: 'prepare',
    kind: 'step',
    createdInVersionNo: 1,
  },
  {
    stableId: 'flow:morning-readiness',
    stableKey: 'morning-readiness',
    kind: 'flow',
    createdInVersionNo: 1,
  },
  {
    stableId: 'bundle:daily-readiness',
    stableKey: 'daily-readiness',
    kind: 'bundle-flow-map',
    createdInVersionNo: 1,
  },
];

const V2_IDENTITIES: readonly FlowmeProductionTargetIdentity[] = [
  ...BASE_IDENTITIES,
  {
    stableId: 'source-row:bag:v2',
    stableKey: 'snapshot-v2:row-001',
    kind: 'source-row',
    createdInVersionNo: 2,
  },
  {
    stableId: 'source-row:umbrella:v2',
    stableKey: 'snapshot-v2:row-002',
    kind: 'source-row',
    createdInVersionNo: 2,
  },
  {
    stableId: 'item:umbrella',
    stableKey: 'umbrella',
    kind: 'item',
    createdInVersionNo: 2,
  },
];

const V1_EDGES: readonly FlowmeProductionTargetIdentityEdge[] = [
  { fromId: 'source-row:bag:v1', toId: 'item:bag', relation: 'evidence_for' },
  { fromId: 'item:bag', toId: 'step:prepare', relation: 'grouped_by' },
  { fromId: 'step:prepare', toId: 'flow:morning-readiness', relation: 'belongs_to' },
  { fromId: 'flow:morning-readiness', toId: 'bundle:daily-readiness', relation: 'published_in' },
];

const V2_EDGES: readonly FlowmeProductionTargetIdentityEdge[] = [
  { fromId: 'source-row:bag:v2', toId: 'item:bag', relation: 'evidence_for' },
  { fromId: 'source-row:umbrella:v2', toId: 'item:umbrella', relation: 'evidence_for' },
  { fromId: 'item:bag', toId: 'step:prepare', relation: 'grouped_by' },
  { fromId: 'item:umbrella', toId: 'step:prepare', relation: 'grouped_by' },
  { fromId: 'step:prepare', toId: 'flow:morning-readiness', relation: 'belongs_to' },
  { fromId: 'flow:morning-readiness', toId: 'bundle:daily-readiness', relation: 'published_in' },
];

function versionOne(): FlowmeProductionTargetPublishedVersion {
  return {
    versionId: V1,
    versionNo: 1,
    predecessorVersionId: null,
    lifecycle: 'published',
    contentHash: '1'.repeat(64),
    sealedAt: '2026-09-04T00:00:00.000Z',
    immutable: true,
    activeNodeIds: BASE_IDENTITIES.map((identity) => identity.stableId),
    identityEdges: V1_EDGES.map((edge) => ({ ...edge })),
  };
}

function versionTwo(): FlowmeProductionTargetPublishedVersion {
  return {
    versionId: V2,
    versionNo: 2,
    predecessorVersionId: V1,
    lifecycle: 'published',
    contentHash: '2'.repeat(64),
    sealedAt: '2026-09-04T01:00:00.000Z',
    immutable: true,
    activeNodeIds: [
      'source-row:bag:v2',
      'source-row:umbrella:v2',
      'item:bag',
      'item:umbrella',
      'step:prepare',
      'flow:morning-readiness',
      'bundle:daily-readiness',
    ],
    identityEdges: V2_EDGES.map((edge) => ({ ...edge })),
  };
}

function sharedPersonalOverlays() {
  return [{
    copyId: COPY,
    itemId: 'item:bag',
    included: true,
    title: '내가 쓰는 가방 확인',
    scheduleOverride: '2026-09-05',
    memo: '현관 옆에 두기',
  }] as const;
}

function sharedExecutionRuns() {
  return [{
    runId: 'run:morning-readiness:1',
    copyId: COPY,
    contentVersionId: V1,
    status: 'active' as const,
    itemStates: [{
      itemId: 'item:bag',
      occurrenceKey: '2026-09-04',
      state: 'done' as const,
      userMemo: '완료 기록은 새 버전과 별개',
    }],
  }];
}

export function createFlowmeProductionTargetPlanningBeforeFixture(
): FlowmeProductionTargetPlanningDocument {
  return {
    contractVersion: FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION,
    contractStatus: 'production-target-planning-contract',
    operatingSchemaOwned: false,
    runtimeWriterImplemented: false,
    migrationImplemented: false,
    contentId: CONTENT_ID,
    currentPublishedVersionId: V1,
    identities: BASE_IDENTITIES.map((identity) => ({ ...identity })),
    publishedVersionHistory: [versionOne()],
    personalCopies: [{ copyId: COPY, userId: 'owner:1', pinnedVersionId: V1 }],
    personalOverlays: sharedPersonalOverlays().map((overlay) => ({ ...overlay })),
    executionRuns: sharedExecutionRuns().map((run) => ({
      ...run,
      itemStates: run.itemStates.map((state) => ({ ...state })),
    })),
  };
}

export function createFlowmeProductionTargetPlanningAfterFixture(
): FlowmeProductionTargetPlanningDocument {
  return {
    contractVersion: FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION,
    contractStatus: 'production-target-planning-contract',
    operatingSchemaOwned: false,
    runtimeWriterImplemented: false,
    migrationImplemented: false,
    contentId: CONTENT_ID,
    currentPublishedVersionId: V2,
    identities: V2_IDENTITIES.map((identity) => ({ ...identity })),
    publishedVersionHistory: [versionOne(), versionTwo()],
    personalCopies: [{ copyId: COPY, userId: 'owner:1', pinnedVersionId: V2 }],
    personalOverlays: sharedPersonalOverlays().map((overlay) => ({ ...overlay })),
    executionRuns: sharedExecutionRuns().map((run) => ({
      ...run,
      itemStates: run.itemStates.map((state) => ({ ...state })),
    })),
  };
}

export function createFlowmeProductionTargetVersionTransitionFixture(
): FlowmeProductionTargetVersionTransition {
  return {
    contractVersion: FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION,
    copyId: COPY,
    fromVersionId: V1,
    toVersionId: V2,
    before: createFlowmeProductionTargetPlanningBeforeFixture(),
    after: createFlowmeProductionTargetPlanningAfterFixture(),
  };
}

/** Fixture-only clone helper for negative mutation matrices. */
export function cloneFlowmeProductionTargetFixture<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const FLOWME_PRODUCTION_TARGET_FIXTURE_IDS = Object.freeze({
  contentId: CONTENT_ID,
  versionOneId: V1,
  versionTwoId: V2,
  copyId: COPY,
});
