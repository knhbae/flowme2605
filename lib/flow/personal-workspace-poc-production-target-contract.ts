/**
 * FlowMe production-target identity/ownership planning contract v1.
 *
 * This is a replaceable, pure planning contract. It deliberately does not own
 * the operating schema, assign a deployed service, run a migration, or provide
 * a writer. The July canonical contract is authoritative; the June Step-first
 * contract remains a route/export compatibility bridge only.
 */

export const FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION =
  'flowme-production-target-identity-owner-planning-v1' as const;

export type FlowmeProductionTargetEntityKind =
  | 'source-row'
  | 'item'
  | 'step'
  | 'flow'
  | 'bundle-flow-map';

export type FlowmeProductionTargetEdgeRelation =
  | 'evidence_for'
  | 'grouped_by'
  | 'belongs_to'
  | 'published_in';

export type FlowmeProductionTargetIdentity = Readonly<{
  stableId: string;
  stableKey: string;
  kind: FlowmeProductionTargetEntityKind;
  createdInVersionNo: number;
}>;

export type FlowmeProductionTargetIdentityEdge = Readonly<{
  fromId: string;
  toId: string;
  relation: FlowmeProductionTargetEdgeRelation;
}>;

export type FlowmeProductionTargetPublishedVersion = Readonly<{
  versionId: string;
  versionNo: number;
  predecessorVersionId: string | null;
  lifecycle: 'published';
  contentHash: string;
  sealedAt: string;
  immutable: true;
  activeNodeIds: readonly string[];
  identityEdges: readonly FlowmeProductionTargetIdentityEdge[];
}>;

export type FlowmeProductionTargetPersonalCopy = Readonly<{
  copyId: string;
  userId: string;
  pinnedVersionId: string;
}>;

export type FlowmeProductionTargetPersonalOverlay = Readonly<{
  copyId: string;
  itemId: string;
  included?: boolean;
  title?: string;
  scheduleOverride?: string | null;
  memo?: string;
}>;

export type FlowmeProductionTargetExecutionItemState = Readonly<{
  itemId: string;
  occurrenceKey?: string;
  state: 'pending' | 'done' | 'skipped' | 'held';
  scheduleOverride?: string | null;
  decisionValue?: string;
  recordValue?: string;
  userMemo?: string;
}>;

export type FlowmeProductionTargetExecutionRun = Readonly<{
  runId: string;
  copyId: string;
  contentVersionId: string;
  status: 'active' | 'completed' | 'archived';
  itemStates: readonly FlowmeProductionTargetExecutionItemState[];
}>;

export type FlowmeProductionTargetPlanningDocument = Readonly<{
  contractVersion: typeof FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION;
  contractStatus: 'production-target-planning-contract';
  operatingSchemaOwned: false;
  runtimeWriterImplemented: false;
  migrationImplemented: false;
  contentId: string;
  currentPublishedVersionId: string;
  identities: readonly FlowmeProductionTargetIdentity[];
  publishedVersionHistory: readonly FlowmeProductionTargetPublishedVersion[];
  personalCopies: readonly FlowmeProductionTargetPersonalCopy[];
  personalOverlays: readonly FlowmeProductionTargetPersonalOverlay[];
  executionRuns: readonly FlowmeProductionTargetExecutionRun[];
}>;

export type FlowmeProductionTargetVersionTransition = Readonly<{
  contractVersion: typeof FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION;
  copyId: string;
  fromVersionId: string;
  toVersionId: string;
  before: FlowmeProductionTargetPlanningDocument;
  after: FlowmeProductionTargetPlanningDocument;
}>;

export type FlowmeProductionTargetValidationErrorCode =
  | 'invalid-document'
  | 'unsupported-contract-version'
  | 'identity-id-collision'
  | 'stable-key-collision'
  | 'identity-version-invalid'
  | 'version-id-collision'
  | 'version-number-collision'
  | 'version-history-not-linear'
  | 'current-version-invalid'
  | 'immutable-version-invalid'
  | 'active-identity-invalid'
  | 'edge-collision'
  | 'edge-endpoint-invalid'
  | 'edge-relation-invalid'
  | 'identity-cycle'
  | 'hierarchy-incomplete'
  | 'copy-invalid'
  | 'personal-overlay-invalid'
  | 'execution-run-invalid'
  | 'transition-invalid'
  | 'history-not-append-only'
  | 'existing-version-mutated'
  | 'identity-registry-mutated'
  | 'personal-copy-mutated'
  | 'personal-overlay-mutated'
  | 'execution-run-mutated';

export type FlowmeProductionTargetValidationError = Readonly<{
  code: FlowmeProductionTargetValidationErrorCode;
  path: string;
  message: string;
}>;

export type FlowmeProductionTargetValidationResult = Readonly<
  | { ok: true }
  | { ok: false; errors: readonly FlowmeProductionTargetValidationError[] }
>;

type LayerMutability =
  | 'immutable-versioned'
  | 'mutable-revisioned'
  | 'derived-immutable'
  | 'append-only-events';

type PlanningLayer = Readonly<{
  entity: string;
  logicalReadOwner: string;
  logicalWriteOwner: string;
  ownerScope: 'planning-role';
  operatingOwnerAssigned: false;
  mutability: LayerMutability;
  derivation: string;
}>;

const layer = (
  entity: string,
  logicalReadOwner: string,
  logicalWriteOwner: string,
  mutability: LayerMutability,
  derivation: string,
): PlanningLayer => Object.freeze({
  entity,
  logicalReadOwner,
  logicalWriteOwner,
  ownerScope: 'planning-role',
  operatingOwnerAssigned: false,
  mutability,
  derivation,
});

/**
 * Logical responsibility is explicit while every operating owner remains
 * deliberately unassigned. Product/service ownership still needs approval.
 */
export const FLOWME_PRODUCTION_TARGET_IDENTITY_OWNER_PLANNING_V1 = Object.freeze({
  contractVersion: FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION,
  contractStatus: 'production-target-planning-contract' as const,
  productionApproved: false as const,
  operatingSchemaOwned: false as const,
  runtimeWriterImplemented: false as const,
  migrationImplemented: false as const,
  canonicalAuthority: 'docs/specs/2026-07-11-canonical-flow-data-model' as const,
  compatibilityBoundary: Object.freeze({
    juneStepContract: 'historical-route-and-export-adapter-only' as const,
    itemOwnsIndependentExecutionState: true as const,
    stepIsSemanticGroupingOnly: true as const,
    bundleFlowMapCardinality: 'zero-or-one-optional-discovery-group' as const,
    stableIdCollisionScope: 'document-scoped-across-entity-kinds' as const,
    multiContentRegistryUniquenessImplemented: false as const,
    collaborativeAuthoringStrategyStatus: 'recommendation-pending-owner-review' as const,
  }),
  identityPath: Object.freeze([
    'SourceRow',
    'Item',
    'Step',
    'Flow',
    'Bundle/Flow Map',
  ] as const),
  layers: Object.freeze({
    sourceSnapshot: layer(
      'SourceSnapshot',
      'source-evidence-reader',
      'source-ingestion-finalizer',
      'immutable-versioned',
      'finalized exact source evidence',
    ),
    workingSource: layer(
      'WorkingSource',
      'authoring-session',
      'authoring-session',
      'mutable-revisioned',
      'explicit working fork of a source snapshot',
    ),
    canonical: layer(
      'canonical',
      'canonical-content-reader',
      'canonical-content-compiler',
      'derived-immutable',
      'validated SourceRow to Item to Step to Flow with optional Bundle projection',
    ),
    creatorDraft: layer(
      'CreatorDraft',
      'creator-draft-reader',
      'creator-draft-editor',
      'mutable-revisioned',
      'explicit creator-owned draft fork',
    ),
    publishedVersion: layer(
      'PublishedVersion',
      'published-content-reader',
      'publication-append-planner',
      'immutable-versioned',
      'sealed canonical payload candidate; review proof is outside this contract',
    ),
    personalOverlay: layer(
      'PersonalOverlay',
      'personal-copy-owner',
      'personal-copy-owner',
      'mutable-revisioned',
      'explicit personal inclusion, title, schedule and memo edits',
    ),
    executionRun: layer(
      'ExecutionRun',
      'execution-run-owner',
      'execution-run-owner',
      'append-only-events',
      'completion, skip, hold, decision, record and occurrence events',
    ),
    exportSnapshot: layer(
      'ExportSnapshot',
      'export-artifact-reader',
      'projection-snapshot-builder',
      'derived-immutable',
      'pinned version plus overlay plus run plus occurrence; resolution receipt pending',
    ),
  }),
  versionRules: Object.freeze({
    publishedHistory: 'append-only-linear' as const,
    publishedPayload: 'sealed-and-immutable' as const,
    pointerMove: 'structural-version-pointer-transition' as const,
    removedIdentity: 'retained-in-registry-for-personal-and-execution-history' as const,
    reviewProofIncluded: false as const,
    versionResolutionReceiptImplemented: false as const,
  }),
  preservationRules: Object.freeze([
    'personal overlay canonical payload does not change during version pointer movement',
    'execution run canonical payload does not change during version pointer movement',
    'removed Item identity remains resolvable for retained personal state and history',
    'a published version append never mutates an existing version record',
  ] as const),
  excludedUntilApproved: Object.freeze([
    'operating database schema ownership',
    'repository or service assignment',
    'runtime writer',
    'migration',
    'RLS policy',
    'publish operation',
    'external synchronization',
  ] as const),
});

const ENTITY_KINDS: readonly FlowmeProductionTargetEntityKind[] = [
  'source-row',
  'item',
  'step',
  'flow',
  'bundle-flow-map',
];

const EDGE_RELATIONS: readonly FlowmeProductionTargetEdgeRelation[] = [
  'evidence_for',
  'grouped_by',
  'belongs_to',
  'published_in',
];

const RUN_STATES = ['pending', 'done', 'skipped', 'held'] as const;
const RUN_STATUSES = ['active', 'completed', 'archived'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isEntityKind(value: unknown): value is FlowmeProductionTargetEntityKind {
  return typeof value === 'string'
    && ENTITY_KINDS.includes(value as FlowmeProductionTargetEntityKind);
}

function isEdgeRelation(value: unknown): value is FlowmeProductionTargetEdgeRelation {
  return typeof value === 'string'
    && EDGE_RELATIONS.includes(value as FlowmeProductionTargetEdgeRelation);
}

function isIdentity(value: unknown): value is FlowmeProductionTargetIdentity {
  return isRecord(value)
    && hasOnlyKeys(value, ['stableId', 'stableKey', 'kind', 'createdInVersionNo'])
    && isNonEmptyString(value.stableId)
    && isNonEmptyString(value.stableKey)
    && isEntityKind(value.kind)
    && isPositiveInteger(value.createdInVersionNo);
}

function isEdge(value: unknown): value is FlowmeProductionTargetIdentityEdge {
  return isRecord(value)
    && hasOnlyKeys(value, ['fromId', 'toId', 'relation'])
    && isNonEmptyString(value.fromId)
    && isNonEmptyString(value.toId)
    && isEdgeRelation(value.relation);
}

function isPublishedVersion(value: unknown): value is FlowmeProductionTargetPublishedVersion {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'versionId',
      'versionNo',
      'predecessorVersionId',
      'lifecycle',
      'contentHash',
      'sealedAt',
      'immutable',
      'activeNodeIds',
      'identityEdges',
    ])
    && isNonEmptyString(value.versionId)
    && isPositiveInteger(value.versionNo)
    && (value.predecessorVersionId === null || isNonEmptyString(value.predecessorVersionId))
    && value.lifecycle === 'published'
    && isNonEmptyString(value.contentHash)
    && isNonEmptyString(value.sealedAt)
    && value.immutable === true
    && Array.isArray(value.activeNodeIds)
    && value.activeNodeIds.every(isNonEmptyString)
    && Array.isArray(value.identityEdges)
    && value.identityEdges.every(isEdge);
}

function isPersonalCopy(value: unknown): value is FlowmeProductionTargetPersonalCopy {
  return isRecord(value)
    && hasOnlyKeys(value, ['copyId', 'userId', 'pinnedVersionId'])
    && isNonEmptyString(value.copyId)
    && isNonEmptyString(value.userId)
    && isNonEmptyString(value.pinnedVersionId);
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function optionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

function isPersonalOverlay(value: unknown): value is FlowmeProductionTargetPersonalOverlay {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'copyId',
      'itemId',
      'included',
      'title',
      'scheduleOverride',
      'memo',
    ])
    && isNonEmptyString(value.copyId)
    && isNonEmptyString(value.itemId)
    && (value.included === undefined || typeof value.included === 'boolean')
    && optionalString(value.title)
    && optionalNullableString(value.scheduleOverride)
    && optionalString(value.memo);
}

function isExecutionItemState(value: unknown): value is FlowmeProductionTargetExecutionItemState {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'itemId',
      'occurrenceKey',
      'state',
      'scheduleOverride',
      'decisionValue',
      'recordValue',
      'userMemo',
    ])
    && isNonEmptyString(value.itemId)
    && optionalString(value.occurrenceKey)
    && typeof value.state === 'string'
    && RUN_STATES.includes(value.state as typeof RUN_STATES[number])
    && optionalNullableString(value.scheduleOverride)
    && optionalString(value.decisionValue)
    && optionalString(value.recordValue)
    && optionalString(value.userMemo);
}

function isExecutionRun(value: unknown): value is FlowmeProductionTargetExecutionRun {
  return isRecord(value)
    && hasOnlyKeys(value, ['runId', 'copyId', 'contentVersionId', 'status', 'itemStates'])
    && isNonEmptyString(value.runId)
    && isNonEmptyString(value.copyId)
    && isNonEmptyString(value.contentVersionId)
    && typeof value.status === 'string'
    && RUN_STATUSES.includes(value.status as typeof RUN_STATUSES[number])
    && Array.isArray(value.itemStates)
    && value.itemStates.every(isExecutionItemState);
}

function isPlanningDocumentShape(value: Record<string, unknown>): value is Record<string, unknown>
  & FlowmeProductionTargetPlanningDocument {
  return hasOnlyKeys(value, [
    'contractVersion',
    'contractStatus',
    'operatingSchemaOwned',
    'runtimeWriterImplemented',
    'migrationImplemented',
    'contentId',
    'currentPublishedVersionId',
    'identities',
    'publishedVersionHistory',
    'personalCopies',
    'personalOverlays',
    'executionRuns',
  ])
    && value.contractStatus === 'production-target-planning-contract'
    && value.operatingSchemaOwned === false
    && value.runtimeWriterImplemented === false
    && value.migrationImplemented === false
    && isNonEmptyString(value.contentId)
    && isNonEmptyString(value.currentPublishedVersionId)
    && Array.isArray(value.identities)
    && value.identities.every(isIdentity)
    && Array.isArray(value.publishedVersionHistory)
    && value.publishedVersionHistory.every(isPublishedVersion)
    && Array.isArray(value.personalCopies)
    && value.personalCopies.every(isPersonalCopy)
    && Array.isArray(value.personalOverlays)
    && value.personalOverlays.every(isPersonalOverlay)
    && Array.isArray(value.executionRuns)
    && value.executionRuns.every(isExecutionRun);
}

function issue(
  errors: FlowmeProductionTargetValidationError[],
  code: FlowmeProductionTargetValidationErrorCode,
  path: string,
  message: string,
): void {
  errors.push({ code, path, message });
}

function edgeKindsAreValid(
  edge: FlowmeProductionTargetIdentityEdge,
  identities: ReadonlyMap<string, FlowmeProductionTargetIdentity>,
): boolean {
  const from = identities.get(edge.fromId);
  const to = identities.get(edge.toId);
  if (!from || !to) return false;
  return (edge.relation === 'evidence_for' && from.kind === 'source-row' && to.kind === 'item')
    || (edge.relation === 'grouped_by' && from.kind === 'item' && to.kind === 'step')
    || (edge.relation === 'belongs_to' && from.kind === 'step' && to.kind === 'flow')
    || (edge.relation === 'published_in'
      && from.kind === 'flow'
      && to.kind === 'bundle-flow-map');
}

function containsCycle(
  nodeIds: readonly string[],
  edges: readonly FlowmeProductionTargetIdentityEdge[],
): boolean {
  const adjacency = new Map<string, string[]>();
  for (const nodeId of nodeIds) adjacency.set(nodeId, []);
  for (const edge of edges) adjacency.get(edge.fromId)?.push(edge.toId);
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (nodeId: string): boolean => {
    const current = state.get(nodeId) ?? 0;
    if (current === 1) return true;
    if (current === 2) return false;
    state.set(nodeId, 1);
    for (const next of adjacency.get(nodeId) ?? []) {
      if (visit(next)) return true;
    }
    state.set(nodeId, 2);
    return false;
  };
  return nodeIds.some(visit);
}

function validateVersionGraph(
  version: FlowmeProductionTargetPublishedVersion,
  identities: ReadonlyMap<string, FlowmeProductionTargetIdentity>,
  errors: FlowmeProductionTargetValidationError[],
  index: number,
): void {
  const path = `publishedVersionHistory[${index}]`;
  const activeIds = new Set<string>();
  for (const nodeId of version.activeNodeIds) {
    if (activeIds.has(nodeId) || !identities.has(nodeId)) {
      issue(errors, 'active-identity-invalid', `${path}.activeNodeIds`,
        'Active node IDs must be unique and present in the identity registry.');
    }
    activeIds.add(nodeId);
    const identity = identities.get(nodeId);
    if (identity && identity.createdInVersionNo > version.versionNo) {
      issue(errors, 'identity-version-invalid', `${path}.activeNodeIds`,
        'A node cannot be active before its creation version.');
    }
  }

  const edgeKeys = new Set<string>();
  for (const edge of version.identityEdges) {
    const key = `${edge.fromId}\u0000${edge.relation}\u0000${edge.toId}`;
    if (edgeKeys.has(key)) {
      issue(errors, 'edge-collision', `${path}.identityEdges`,
        'Duplicate identity edges are not allowed.');
    }
    edgeKeys.add(key);
    if (!activeIds.has(edge.fromId) || !activeIds.has(edge.toId)) {
      issue(errors, 'edge-endpoint-invalid', `${path}.identityEdges`,
        'Every edge endpoint must be active in the same published version.');
      continue;
    }
    if (!edgeKindsAreValid(edge, identities)) {
      issue(errors, 'edge-relation-invalid', `${path}.identityEdges`,
        'The edge does not follow SourceRow to Item to Step to Flow to Bundle/Flow Map.');
    }
  }

  if (containsCycle(version.activeNodeIds, version.identityEdges)) {
    issue(errors, 'identity-cycle', `${path}.identityEdges`,
      'The identity graph must be acyclic.');
  }

  const active = version.activeNodeIds
    .map((nodeId) => identities.get(nodeId))
    .filter((identity): identity is FlowmeProductionTargetIdentity => Boolean(identity));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const identity of active) {
    incoming.set(identity.stableId, 0);
    outgoing.set(identity.stableId, 0);
  }
  for (const edge of version.identityEdges) {
    if (!activeIds.has(edge.fromId) || !activeIds.has(edge.toId)) continue;
    outgoing.set(edge.fromId, (outgoing.get(edge.fromId) ?? 0) + 1);
    incoming.set(edge.toId, (incoming.get(edge.toId) ?? 0) + 1);
  }
  const kindCounts = new Map<FlowmeProductionTargetEntityKind, number>();
  const bundleCount = active.filter((identity) => identity.kind === 'bundle-flow-map').length;
  for (const identity of active) {
    kindCounts.set(identity.kind, (kindCounts.get(identity.kind) ?? 0) + 1);
    const inCount = incoming.get(identity.stableId) ?? 0;
    const outCount = outgoing.get(identity.stableId) ?? 0;
    const complete = identity.kind === 'source-row'
      ? inCount === 0 && outCount >= 1
      : identity.kind === 'item'
        ? inCount >= 1 && outCount === 1
        : identity.kind === 'step'
          ? inCount >= 1 && outCount === 1
        : identity.kind === 'flow'
            ? inCount >= 1 && outCount === (bundleCount === 0 ? 0 : 1)
            : inCount >= 1 && outCount === 0;
    if (!complete) {
      issue(errors, 'hierarchy-incomplete', `${path}.identityEdges`,
        `Identity ${identity.stableId} does not have the required parent/evidence cardinality.`);
    }
  }
  for (const kind of ENTITY_KINDS) {
    if (kind === 'bundle-flow-map') continue;
    if ((kindCounts.get(kind) ?? 0) === 0) {
      issue(errors, 'hierarchy-incomplete', `${path}.activeNodeIds`,
        `Published version requires at least one ${kind} identity.`);
    }
  }
  if ((kindCounts.get('bundle-flow-map') ?? 0) > 1) {
    issue(errors, 'hierarchy-incomplete', `${path}.activeNodeIds`,
      'A planning document version may have no Bundle/Flow Map or one optional grouping root.');
  }
}

function validateDocumentSemantics(
  document: FlowmeProductionTargetPlanningDocument,
): FlowmeProductionTargetValidationError[] {
  const errors: FlowmeProductionTargetValidationError[] = [];
  const identities = new Map<string, FlowmeProductionTargetIdentity>();
  const stableKeys = new Map<string, string>();
  for (const [index, identity] of document.identities.entries()) {
    if (identities.has(identity.stableId)) {
      issue(errors, 'identity-id-collision', `identities[${index}].stableId`,
        'Stable identity IDs must be unique across entity kinds within one planning document.');
    } else {
      identities.set(identity.stableId, identity);
    }
    const stableKey = `${identity.kind}\u0000${identity.stableKey}`;
    const previous = stableKeys.get(stableKey);
    if (previous && previous !== identity.stableId) {
      issue(errors, 'stable-key-collision', `identities[${index}].stableKey`,
        'A kind-scoped stable key cannot identify two nodes.');
    } else {
      stableKeys.set(stableKey, identity.stableId);
    }
  }

  const versionIds = new Set<string>();
  const versionNos = new Set<number>();
  // Array order is itself part of the append-only contract. Sorting a copy here
  // would incorrectly accept storage payloads that rewrote history order.
  const ordered = document.publishedVersionHistory;
  if (ordered.length === 0) {
    issue(errors, 'version-history-not-linear', 'publishedVersionHistory',
      'At least one immutable published version is required.');
  }
  for (const [index, version] of document.publishedVersionHistory.entries()) {
    if (versionIds.has(version.versionId)) {
      issue(errors, 'version-id-collision', `publishedVersionHistory[${index}].versionId`,
        'Published version IDs must be unique.');
    }
    versionIds.add(version.versionId);
    if (versionNos.has(version.versionNo)) {
      issue(errors, 'version-number-collision', `publishedVersionHistory[${index}].versionNo`,
        'Published version numbers must be unique.');
    }
    versionNos.add(version.versionNo);
    if (!/^[a-f0-9]{64}$/.test(version.contentHash)
      || Number.isNaN(Date.parse(version.sealedAt))) {
      issue(errors, 'immutable-version-invalid', `publishedVersionHistory[${index}]`,
        'A sealed immutable version requires a lowercase SHA-256 hash and valid timestamp.');
    }
    validateVersionGraph(version, identities, errors, index);
  }
  for (const [index, version] of ordered.entries()) {
    const previous = ordered[index - 1];
    if (version.versionNo !== index + 1
      || (index === 0 && version.predecessorVersionId !== null)
      || (index > 0 && version.predecessorVersionId !== previous.versionId)) {
      issue(errors, 'version-history-not-linear', 'publishedVersionHistory',
        'Published history must be a monotonic append-only predecessor chain starting at 1.');
      break;
    }
  }
  if (ordered.at(-1)?.versionId !== document.currentPublishedVersionId) {
    issue(errors, 'current-version-invalid', 'currentPublishedVersionId',
      'The current pointer must reference the latest published version.');
  }

  const firstActiveVersion = new Map<string, number>();
  for (const version of ordered) {
    for (const nodeId of version.activeNodeIds) {
      if (!firstActiveVersion.has(nodeId)) firstActiveVersion.set(nodeId, version.versionNo);
    }
  }
  for (const [index, identity] of document.identities.entries()) {
    if (firstActiveVersion.get(identity.stableId) !== identity.createdInVersionNo) {
      issue(errors, 'identity-version-invalid', `identities[${index}].createdInVersionNo`,
        'Identity creation version must equal its first active published version.');
    }
  }

  const copies = new Map<string, FlowmeProductionTargetPersonalCopy>();
  const versionsById = new Map(document.publishedVersionHistory.map((version) => (
    [version.versionId, version]
  )));
  for (const [index, copy] of document.personalCopies.entries()) {
    if (copies.has(copy.copyId) || !versionIds.has(copy.pinnedVersionId)) {
      issue(errors, 'copy-invalid', `personalCopies[${index}]`,
        'Copy IDs must be unique and pin an existing immutable version.');
    }
    copies.set(copy.copyId, copy);
  }
  const overlayKeys = new Set<string>();
  for (const [index, overlay] of document.personalOverlays.entries()) {
    const identity = identities.get(overlay.itemId);
    const copy = copies.get(overlay.copyId);
    const pinnedVersion = copy ? versionsById.get(copy.pinnedVersionId) : undefined;
    const key = `${overlay.copyId}\u0000${overlay.itemId}`;
    if (!copy
      || identity?.kind !== 'item'
      || !pinnedVersion
      || identity.createdInVersionNo > pinnedVersion.versionNo
      || overlayKeys.has(key)) {
      issue(errors, 'personal-overlay-invalid', `personalOverlays[${index}]`,
        'Overlay must reference one known copy and an Item known by its pinned version at most once.');
    }
    overlayKeys.add(key);
  }
  const runIds = new Set<string>();
  for (const [index, run] of document.executionRuns.entries()) {
    let invalid = runIds.has(run.runId)
      || !copies.has(run.copyId)
      || !versionIds.has(run.contentVersionId);
    runIds.add(run.runId);
    const itemKeys = new Set<string>();
    for (const state of run.itemStates) {
      const identity = identities.get(state.itemId);
      const contentVersion = versionsById.get(run.contentVersionId);
      const key = `${state.itemId}\u0000${state.occurrenceKey ?? ''}`;
      if (identity?.kind !== 'item'
        || !contentVersion
        || !contentVersion.activeNodeIds.includes(state.itemId)
        || itemKeys.has(key)) invalid = true;
      itemKeys.add(key);
    }
    if (invalid) {
      issue(errors, 'execution-run-invalid', `executionRuns[${index}]`,
        'Run identity, copy, version and active Item occurrence references must be valid and unique.');
    }
  }
  return errors;
}

export function validateFlowmeProductionTargetPlanningDocument(
  value: unknown,
): FlowmeProductionTargetValidationResult {
  if (!isRecord(value)) {
    return { ok: false, errors: [{
      code: 'invalid-document',
      path: '$',
      message: 'Planning document must be an object.',
    }] };
  }
  if (value.contractVersion !== FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION) {
    return { ok: false, errors: [{
      code: 'unsupported-contract-version',
      path: 'contractVersion',
      message: 'Unknown planning contract versions fail closed.',
    }] };
  }
  if (!isPlanningDocumentShape(value)) {
    return { ok: false, errors: [{
      code: 'invalid-document',
      path: '$',
      message: 'Required planning-only boundary or record shape is invalid.',
    }] };
  }
  const errors = validateDocumentSemantics(value);
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => (
    `${JSON.stringify(key)}:${stableSerialize(record[key])}`
  )).join(',')}}`;
}

function withoutPinnedVersion(copy: FlowmeProductionTargetPersonalCopy): string {
  return stableSerialize({ copyId: copy.copyId, userId: copy.userId });
}

export function validateFlowmeProductionTargetVersionTransition(
  value: unknown,
): FlowmeProductionTargetValidationResult {
  if (!isRecord(value)
    || !hasOnlyKeys(value, [
      'contractVersion',
      'copyId',
      'fromVersionId',
      'toVersionId',
      'before',
      'after',
    ])
    || value.contractVersion !== FLOWME_PRODUCTION_TARGET_PLANNING_CONTRACT_VERSION
    || !isNonEmptyString(value.copyId)
    || !isNonEmptyString(value.fromVersionId)
    || !isNonEmptyString(value.toVersionId)) {
    return { ok: false, errors: [{
      code: 'transition-invalid',
      path: '$',
      message: 'Version transition envelope is invalid or unsupported.',
    }] };
  }
  const beforeResult = validateFlowmeProductionTargetPlanningDocument(value.before);
  const afterResult = validateFlowmeProductionTargetPlanningDocument(value.after);
  if (!beforeResult.ok || !afterResult.ok) {
    return { ok: false, errors: [
      ...(!beforeResult.ok ? beforeResult.errors.map((error) => ({
        ...error,
        path: `before.${error.path}`,
      })) : []),
      ...(!afterResult.ok ? afterResult.errors.map((error) => ({
        ...error,
        path: `after.${error.path}`,
      })) : []),
    ] };
  }

  const transition = value as FlowmeProductionTargetVersionTransition;
  const { before, after } = transition;
  const errors: FlowmeProductionTargetValidationError[] = [];
  if (before.contentId !== after.contentId
    || transition.fromVersionId !== before.currentPublishedVersionId) {
    issue(errors, 'transition-invalid', '$',
      'Transition must retain content identity and start at the current pointer.');
  }
  const appended = after.publishedVersionHistory.at(-1);
  if (after.publishedVersionHistory.length !== before.publishedVersionHistory.length + 1
    || !appended
    || appended.versionId !== transition.toVersionId
    || appended.predecessorVersionId !== transition.fromVersionId
    || appended.versionNo !== before.publishedVersionHistory.length + 1
    || after.currentPublishedVersionId !== transition.toVersionId) {
    issue(errors, 'history-not-append-only', 'after.publishedVersionHistory',
      'Exactly one new immutable successor version must be appended and selected.');
  }
  for (const [index, previous] of before.publishedVersionHistory.entries()) {
    if (stableSerialize(previous) !== stableSerialize(after.publishedVersionHistory[index])) {
      issue(errors, 'existing-version-mutated', `after.publishedVersionHistory[${index}]`,
        'Existing published version records are immutable.');
    }
  }

  const afterIdentities = new Map(after.identities.map((identity) => [identity.stableId, identity]));
  for (const identity of before.identities) {
    const retained = afterIdentities.get(identity.stableId);
    if (!retained || stableSerialize(retained) !== stableSerialize(identity)) {
      issue(errors, 'identity-registry-mutated', 'after.identities',
        'Existing stable identities must remain byte-equivalent in the registry.');
    }
  }
  const previousIdentityIds = new Set(before.identities.map((identity) => identity.stableId));
  for (const identity of after.identities) {
    if (!previousIdentityIds.has(identity.stableId)
      && identity.createdInVersionNo !== appended?.versionNo) {
      issue(errors, 'identity-registry-mutated', 'after.identities',
        'New identities must declare the appended version as their creation version.');
    }
  }

  const beforeCopies = new Map(before.personalCopies.map((copy) => [copy.copyId, copy]));
  const afterCopies = new Map(after.personalCopies.map((copy) => [copy.copyId, copy]));
  if (beforeCopies.size !== afterCopies.size) {
    issue(errors, 'personal-copy-mutated', 'after.personalCopies',
      'Version application cannot add or remove personal copies.');
  }
  for (const [copyId, beforeCopy] of beforeCopies) {
    const afterCopy = afterCopies.get(copyId);
    const expectedBeforePin = copyId === transition.copyId
      ? transition.fromVersionId
      : beforeCopy.pinnedVersionId;
    const expectedAfterPin = copyId === transition.copyId
      ? transition.toVersionId
      : beforeCopy.pinnedVersionId;
    if (!afterCopy
      || beforeCopy.pinnedVersionId !== expectedBeforePin
      || afterCopy.pinnedVersionId !== expectedAfterPin
      || withoutPinnedVersion(beforeCopy) !== withoutPinnedVersion(afterCopy)) {
      issue(errors, 'personal-copy-mutated', `after.personalCopies.${copyId}`,
        'Only the selected copy version pointer may move in this structural transition.');
    }
  }
  if (!beforeCopies.has(transition.copyId)) {
    issue(errors, 'personal-copy-mutated', 'copyId',
      'The selected personal copy must exist.');
  }
  if (stableSerialize(before.personalOverlays) !== stableSerialize(after.personalOverlays)) {
    issue(errors, 'personal-overlay-mutated', 'after.personalOverlays',
      'Personal overlay state must remain unchanged during version application.');
  }
  if (stableSerialize(before.executionRuns) !== stableSerialize(after.executionRuns)) {
    issue(errors, 'execution-run-mutated', 'after.executionRuns',
      'Execution and occurrence history must remain unchanged during version application.');
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
