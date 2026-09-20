/**
 * Isolated production-candidate contract for the FlowMe personal-workspace PoC.
 *
 * This module is deliberately pure. It does not import an operating store,
 * register a writer, migrate legacy data, or enable provider synchronization.
 * Existing saved-plan identities may appear only as read-only compatibility
 * bindings to newly allocated canonical UUIDs.
 */

export const PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION =
  'flowme-personal-workspace-production-candidate-v1' as const;

export const PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_BOUNDARY_V1 = Object.freeze({
  contractVersion: PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION,
  contractStatus: 'isolated-production-candidate' as const,
  productionApproved: false as const,
  operatingSchemaOwned: false as const,
  runtimeWriterImplemented: false as const,
  migrationImplemented: false as const,
  migrationMode: 'none-read-only-legacy-binding' as const,
  providerSyncImplemented: false as const,
  providerSyncMode: 'unsupported-detached-one-way-export' as const,
  storageKeys: Object.freeze([] as const),
});

export type FlowmeProductionCandidateLayerName =
  | 'SourceSnapshot'
  | 'WorkingSource'
  | 'canonical'
  | 'CreatorDraft'
  | 'PublishedVersion'
  | 'PersonalOverlay'
  | 'ExecutionRun'
  | 'ExportSnapshot';

export type FlowmeProductionCandidateLayerPolicy = Readonly<{
  layer: FlowmeProductionCandidateLayerName;
  serviceOwner: string;
  writeAuthority: string;
  mutationMode: string;
  retentionClass: string;
  auditEvent: string;
  privacyClass: string;
}>;

const layerPolicy = (
  layer: FlowmeProductionCandidateLayerName,
  serviceOwner: string,
  writeAuthority: string,
  mutationMode: string,
  retentionClass: string,
  auditEvent: string,
  privacyClass: string,
): FlowmeProductionCandidateLayerPolicy => Object.freeze({
  layer,
  serviceOwner,
  writeAuthority,
  mutationMode,
  retentionClass,
  auditEvent,
  privacyClass,
});

/**
 * Candidate service boundaries, not claims that these services are deployed.
 * No row is left as `none` or `unowned`: an unsupported operation is recorded
 * explicitly in the outer boundary instead of being assigned to a fake owner.
 */
export const PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_LAYER_POLICIES_V1 =
  Object.freeze([
    layerPolicy(
      'SourceSnapshot',
      'source-evidence-service',
      'source-ingestion-finalizer',
      'append-finalized-snapshot-only',
      'reference-bound-evidence; raw-body-ttl-policy-required',
      'source-snapshot-finalized',
      'internal-restricted; sanitized-trust-fields-only',
    ),
    layerPolicy(
      'WorkingSource',
      'authoring-draft-service',
      'document-owner-with-revision',
      'mutable-revisioned-private-fork',
      'owner-controlled-draft',
      'working-source-revised',
      'owner-private; raw-text-excluded-from-audit',
    ),
    layerPolicy(
      'canonical',
      'canonical-compiler',
      'canonical-compiler-only',
      'derived-immutable-output',
      'same-as-owning-content-version',
      'canonical-compilation-recorded',
      'internal-until-reviewed-public-projection',
    ),
    layerPolicy(
      'CreatorDraft',
      'creator-draft-service',
      'creator-or-maintainer-with-revision',
      'mutable-revisioned-private-fork',
      'owner-controlled-draft',
      'creator-draft-revised',
      'creator-private-or-explicit-unlisted; raw-text-excluded-from-audit',
    ),
    layerPolicy(
      'PublishedVersion',
      'publication-service',
      'maintainer-after-review-and-pointer-cas',
      'append-only-immutable-version',
      'immutable-history-until-privileged-erasure',
      'published-version-appended',
      'visibility-sanitized; internal-review-fields-excluded',
    ),
    layerPolicy(
      'PersonalOverlay',
      'personal-copy-service',
      'copy-owner-with-revision',
      'mutable-revisioned-private-state',
      'owner-controlled-copy; retained-while-history-references-item',
      'personal-overlay-revised',
      'copy-owner-private; never-public-by-default',
    ),
    layerPolicy(
      'ExecutionRun',
      'execution-service',
      'copy-owner-event-append',
      'append-only-events-with-revisioned-active-view',
      'owner-controlled-history; completed-snapshot-immutable',
      'execution-event-appended',
      'copy-owner-private; never-public-by-default',
    ),
    layerPolicy(
      'ExportSnapshot',
      'projection-service',
      'projection-builder-on-explicit-request',
      'derived-immutable-detached-artifact',
      'artifact-ephemeral; receipt-owner-history',
      'export-snapshot-created',
      'copy-owner-private; source-and-review-internals-redacted',
    ),
  ] as const);

export type FlowmeProductionCandidateCanonicalIdentity = Readonly<{
  canonicalSourceId: string;
  userJobId: string;
  editorialVariantId: string;
}>;

export type FlowmeProductionCandidateSource = Readonly<{
  sourceId: string;
  canonicalizationVersion: string;
  canonicalUrl: string;
}>;

export type FlowmeProductionCandidateSourceSnapshot = Readonly<{
  snapshotId: string;
  sourceId: string;
  snapshotNo: number;
  contentHash: string;
  finalizedAt: string;
  immutable: true;
}>;

export type FlowmeProductionCandidateSourceRow = Readonly<{
  sourceRowId: string;
  snapshotId: string;
  stableKey: string;
  rowHash: string;
  order: number;
}>;

export type FlowmeProductionCandidateNodeKind =
  | 'item'
  | 'step'
  | 'flow'
  | 'bundle-flow-map';

export type FlowmeProductionCandidateNodeIdentity = Readonly<{
  nodeId: string;
  contentId: string;
  kind: FlowmeProductionCandidateNodeKind;
  stableKey: string;
  createdInVersionNo: number;
  retiredInVersionNo?: number;
}>;

export type FlowmeProductionCandidateStructuralEdge = Readonly<{
  fromId: string;
  toId: string;
  relation: 'grouped_by' | 'belongs_to' | 'published_in';
}>;

export type FlowmeProductionCandidateEvidenceEdge = Readonly<{
  sourceRefId: string;
  sourceRowId: string;
  itemId: string;
  relation: 'evidence_for';
  supportLevel: 'direct' | 'creator_interpretation';
}>;

export type FlowmeProductionCandidatePublishedVersion = Readonly<{
  versionId: string;
  contentId: string;
  versionNo: number;
  predecessorVersionId: string | null;
  lifecycle: 'published';
  contentHash: string;
  sealedAt: string;
  immutable: true;
  activeNodeIds: readonly string[];
  structuralEdges: readonly FlowmeProductionCandidateStructuralEdge[];
  evidenceEdges: readonly FlowmeProductionCandidateEvidenceEdge[];
}>;

type FlowmeProductionCandidateContentDocumentBase = Readonly<{
  contentId: string;
  canonicalIdentity: FlowmeProductionCandidateCanonicalIdentity;
  currentPublishedVersionId: string;
  identities: readonly FlowmeProductionCandidateNodeIdentity[];
  publishedVersions: readonly FlowmeProductionCandidatePublishedVersion[];
}>;

export type FlowmeProductionCandidateContentDocument = Readonly<
  | (FlowmeProductionCandidateContentDocumentBase & {
      structure: 'standalone';
      rootFlowId: string;
    })
  | (FlowmeProductionCandidateContentDocumentBase & {
      structure: 'bundled';
      rootBundleId: string;
    })
>;

export type FlowmeProductionCandidateLegacyBinding = Readonly<{
  bindingId: string;
  origin:
    | 'source-backed-map'
    | 'personal-draft'
    | 'canonical-personal-copy'
    | 'legacy-saved-plan'
    | 'authoring-handoff';
  legacyKind: 'saved-flow' | 'flow-item';
  legacyRef: string;
  targetContentId: string;
  targetNodeId: string;
  mode: 'read-only';
}>;

export type FlowmeProductionCandidatePersonalCopy = Readonly<{
  copyId: string;
  ownerId: string;
  contentId: string;
  pinnedVersionId: string;
  flowId: string;
  revision: number;
  status: 'active' | 'archived';
}>;

export type FlowmeProductionCandidatePersonalOverlay = Readonly<{
  copyId: string;
  itemId: string;
  revision: number;
  retainedRemoved: boolean;
  included?: boolean;
  title?: string;
  scheduleOverride?: string | null;
  memo?: string;
}>;

export type FlowmeProductionCandidateExecutionItemState = Readonly<{
  itemId: string;
  occurrenceKey?: string;
  state: 'pending' | 'done' | 'skipped' | 'held';
}>;

export type FlowmeProductionCandidateExecutionRun = Readonly<{
  runId: string;
  copyId: string;
  contentVersionId: string;
  status: 'active' | 'completed' | 'archived';
  itemStates: readonly FlowmeProductionCandidateExecutionItemState[];
}>;

export type FlowmeProductionCandidateVersionConflict = Readonly<{
  conflictId: string;
  itemId: string;
  change: 'added' | 'changed' | 'removed';
  field: 'inclusion' | 'title' | 'memo' | 'schedule' | 'source' | 'caution';
  sensitive: boolean;
  priorItemHash?: string;
  nextItemHash?: string;
}>;

export type FlowmeProductionCandidateVersionDecision = Readonly<{
  conflictId: string;
  itemId: string;
  action: 'use_latest' | 'keep_personal' | 'retain_removed' | 'include' | 'exclude';
  preservedOverlayHash: string;
}>;

export type FlowmeProductionCandidateVersionResolutionReceipt = Readonly<{
  receiptId: string;
  copyId: string;
  ownerId: string;
  contentId: string;
  fromVersionId: string;
  toVersionId: string;
  fromCopyRevision: number;
  toCopyRevision: number;
  reviewId: string;
  manualReviewId?: string;
  conflicts: readonly FlowmeProductionCandidateVersionConflict[];
  decisions: readonly FlowmeProductionCandidateVersionDecision[];
  conflictSetHash: string;
  decisionSetHash: string;
  executionStateHashBefore: string;
  executionStateHashAfter: string;
  idempotencyKey: string;
  requestHash: string;
  appliedAt: string;
  actorKind: 'copy-owner';
  immutable: true;
}>;

export type FlowmeProductionCandidateExportSnapshot = Readonly<{
  exportSnapshotId: string;
  copyId: string;
  pinnedVersionId: string;
  effectiveStateHash: string;
  artifactHash: string;
  format: 'ics' | 'plain_text' | 'markdown' | 'csv' | 'tsv' | 'xlsx';
  createdAt: string;
  retention: 'ephemeral-artifact-with-owner-receipt';
  detached: true;
  writesBack: false;
  immutable: true;
}>;

export type FlowmeProductionCandidateAuditEvent = Readonly<{
  auditId: string;
  operationId: string;
  kind:
    | 'source-snapshot-finalized'
    | 'working-source-revised'
    | 'canonical-compilation-recorded'
    | 'creator-draft-revised'
    | 'published-version-appended'
    | 'personal-overlay-revised'
    | 'execution-event-appended'
    | 'version-resolution-applied'
    | 'export-snapshot-created';
  actorKind:
    | 'source-ingestion-finalizer'
    | 'document-owner'
    | 'canonical-compiler'
    | 'creator-or-maintainer'
    | 'publication-service'
    | 'copy-owner'
    | 'projection-service';
  subjectId: string;
  occurredAt: string;
  metadataHash: string;
  payloadPolicy: 'metadata-only';
}>;

export type FlowmeProductionCandidateSnapshot = Readonly<{
  contractVersion: typeof PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION;
  contractStatus: 'isolated-production-candidate';
  productionApproved: false;
  operatingSchemaOwned: false;
  runtimeWriterImplemented: false;
  migrationImplemented: false;
  migrationMode: 'none-read-only-legacy-binding';
  providerSyncImplemented: false;
  providerSyncMode: 'unsupported-detached-one-way-export';
  registryId: string;
  sources: readonly FlowmeProductionCandidateSource[];
  sourceSnapshots: readonly FlowmeProductionCandidateSourceSnapshot[];
  sourceRows: readonly FlowmeProductionCandidateSourceRow[];
  documents: readonly FlowmeProductionCandidateContentDocument[];
  legacyBindings: readonly FlowmeProductionCandidateLegacyBinding[];
  personalCopies: readonly FlowmeProductionCandidatePersonalCopy[];
  personalOverlays: readonly FlowmeProductionCandidatePersonalOverlay[];
  executionRuns: readonly FlowmeProductionCandidateExecutionRun[];
  versionResolutionReceipts: readonly FlowmeProductionCandidateVersionResolutionReceipt[];
  exportSnapshots: readonly FlowmeProductionCandidateExportSnapshot[];
  auditEvents: readonly FlowmeProductionCandidateAuditEvent[];
}>;

export type FlowmeProductionCandidatePublishTransition = Readonly<{
  contractVersion: typeof PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION;
  operationId: string;
  contentId: string;
  fromVersionId: string;
  toVersionId: string;
  before: FlowmeProductionCandidateSnapshot;
  after: FlowmeProductionCandidateSnapshot;
}>;

export type FlowmeProductionCandidateResolutionTransition = Readonly<{
  contractVersion: typeof PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION;
  operationId: string;
  copyId: string;
  receiptId: string;
  before: FlowmeProductionCandidateSnapshot;
  after: FlowmeProductionCandidateSnapshot;
}>;

export type FlowmeProductionCandidateValidationErrorCode =
  | 'invalid-snapshot'
  | 'unsupported-contract-version'
  | 'boundary-claim-invalid'
  | 'global-id-collision'
  | 'source-invalid'
  | 'source-collision'
  | 'snapshot-invalid'
  | 'source-row-invalid'
  | 'content-identity-collision'
  | 'document-invalid'
  | 'node-stable-key-collision'
  | 'version-history-invalid'
  | 'version-hash-invalid'
  | 'graph-invalid'
  | 'legacy-binding-invalid'
  | 'copy-invalid'
  | 'overlay-invalid'
  | 'execution-run-invalid'
  | 'resolution-receipt-invalid'
  | 'export-snapshot-invalid'
  | 'audit-event-invalid'
  | 'publish-transition-invalid'
  | 'resolution-transition-invalid'
  | 'history-mutated'
  | 'private-state-mutated';

export type FlowmeProductionCandidateValidationError = Readonly<{
  code: FlowmeProductionCandidateValidationErrorCode;
  path: string;
  message: string;
}>;

export type FlowmeProductionCandidateValidationResult = Readonly<
  | { ok: true }
  | { ok: false; errors: readonly FlowmeProductionCandidateValidationError[] }
>;

const NODE_KINDS: readonly FlowmeProductionCandidateNodeKind[] = [
  'item',
  'step',
  'flow',
  'bundle-flow-map',
];
const RUN_STATES = ['pending', 'done', 'skipped', 'held'] as const;
const RUN_STATUSES = ['active', 'completed', 'archived'] as const;
const COPY_STATUSES = ['active', 'archived'] as const;
const EXPORT_FORMATS = ['ics', 'plain_text', 'markdown', 'csv', 'tsv', 'xlsx'] as const;
const LEGACY_ORIGINS = [
  'source-backed-map',
  'personal-draft',
  'canonical-personal-copy',
  'legacy-saved-plan',
  'authoring-handoff',
] as const;
const AUDIT_ACTOR_BY_KIND: Readonly<Record<FlowmeProductionCandidateAuditEvent['kind'],
FlowmeProductionCandidateAuditEvent['actorKind']>> = Object.freeze({
  'source-snapshot-finalized': 'source-ingestion-finalizer',
  'working-source-revised': 'document-owner',
  'canonical-compilation-recorded': 'canonical-compiler',
  'creator-draft-revised': 'creator-or-maintainer',
  'published-version-appended': 'publication-service',
  'personal-overlay-revised': 'copy-owner',
  'execution-event-appended': 'copy-owner',
  'version-resolution-applied': 'copy-owner',
  'export-snapshot-created': 'projection-service',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = new Set(allowed);
  return Object.keys(value).every((key) => keys.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value === value.trim();
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function optionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

function issue(
  errors: FlowmeProductionCandidateValidationError[],
  code: FlowmeProductionCandidateValidationErrorCode,
  path: string,
  message: string,
): void {
  errors.push({ code, path, message });
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => (
    `${JSON.stringify(key)}:${stableSerialize(record[key])}`
  )).join(',')}}`;
}

function sameValue(left: unknown, right: unknown): boolean {
  return stableSerialize(left) === stableSerialize(right);
}

function isSource(value: unknown): value is FlowmeProductionCandidateSource {
  return isRecord(value)
    && hasOnlyKeys(value, ['sourceId', 'canonicalizationVersion', 'canonicalUrl'])
    && isUuid(value.sourceId)
    && isNonEmptyString(value.canonicalizationVersion)
    && isHttpUrl(value.canonicalUrl);
}

function isSourceSnapshot(value: unknown): value is FlowmeProductionCandidateSourceSnapshot {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'snapshotId', 'sourceId', 'snapshotNo', 'contentHash', 'finalizedAt', 'immutable',
    ])
    && isUuid(value.snapshotId)
    && isUuid(value.sourceId)
    && isPositiveInteger(value.snapshotNo)
    && isSha256(value.contentHash)
    && isIsoTimestamp(value.finalizedAt)
    && value.immutable === true;
}

function isSourceRow(value: unknown): value is FlowmeProductionCandidateSourceRow {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'sourceRowId', 'snapshotId', 'stableKey', 'rowHash', 'order',
    ])
    && isUuid(value.sourceRowId)
    && isUuid(value.snapshotId)
    && isNonEmptyString(value.stableKey)
    && isSha256(value.rowHash)
    && isNonNegativeInteger(value.order);
}

function isCanonicalIdentity(value: unknown): value is FlowmeProductionCandidateCanonicalIdentity {
  return isRecord(value)
    && hasOnlyKeys(value, ['canonicalSourceId', 'userJobId', 'editorialVariantId'])
    && isUuid(value.canonicalSourceId)
    && isNonEmptyString(value.userJobId)
    && isNonEmptyString(value.editorialVariantId);
}

function isNode(value: unknown): value is FlowmeProductionCandidateNodeIdentity {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'nodeId', 'contentId', 'kind', 'stableKey', 'createdInVersionNo', 'retiredInVersionNo',
    ])
    && isUuid(value.nodeId)
    && isUuid(value.contentId)
    && typeof value.kind === 'string'
    && NODE_KINDS.includes(value.kind as FlowmeProductionCandidateNodeKind)
    && isNonEmptyString(value.stableKey)
    && isPositiveInteger(value.createdInVersionNo)
    && (value.retiredInVersionNo === undefined || isPositiveInteger(value.retiredInVersionNo));
}

function isStructuralEdge(value: unknown): value is FlowmeProductionCandidateStructuralEdge {
  return isRecord(value)
    && hasOnlyKeys(value, ['fromId', 'toId', 'relation'])
    && isUuid(value.fromId)
    && isUuid(value.toId)
    && ['grouped_by', 'belongs_to', 'published_in'].includes(String(value.relation));
}

function isEvidenceEdge(value: unknown): value is FlowmeProductionCandidateEvidenceEdge {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'sourceRefId', 'sourceRowId', 'itemId', 'relation', 'supportLevel',
    ])
    && isUuid(value.sourceRefId)
    && isUuid(value.sourceRowId)
    && isUuid(value.itemId)
    && value.relation === 'evidence_for'
    && (value.supportLevel === 'direct' || value.supportLevel === 'creator_interpretation');
}

function isPublishedVersion(value: unknown): value is FlowmeProductionCandidatePublishedVersion {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'versionId', 'contentId', 'versionNo', 'predecessorVersionId', 'lifecycle',
      'contentHash', 'sealedAt', 'immutable', 'activeNodeIds', 'structuralEdges',
      'evidenceEdges',
    ])
    && isUuid(value.versionId)
    && isUuid(value.contentId)
    && isPositiveInteger(value.versionNo)
    && (value.predecessorVersionId === null || isUuid(value.predecessorVersionId))
    && value.lifecycle === 'published'
    && isSha256(value.contentHash)
    && isIsoTimestamp(value.sealedAt)
    && value.immutable === true
    && Array.isArray(value.activeNodeIds)
    && value.activeNodeIds.every(isUuid)
    && Array.isArray(value.structuralEdges)
    && value.structuralEdges.every(isStructuralEdge)
    && Array.isArray(value.evidenceEdges)
    && value.evidenceEdges.every(isEvidenceEdge);
}

function isDocument(value: unknown): value is FlowmeProductionCandidateContentDocument {
  if (!isRecord(value) || !isCanonicalIdentity(value.canonicalIdentity)
    || !isUuid(value.contentId)
    || !isUuid(value.currentPublishedVersionId)
    || !Array.isArray(value.identities)
    || !value.identities.every(isNode)
    || !Array.isArray(value.publishedVersions)
    || !value.publishedVersions.every(isPublishedVersion)) return false;
  if (value.structure === 'standalone') {
    return hasOnlyKeys(value, [
      'contentId', 'canonicalIdentity', 'currentPublishedVersionId', 'identities',
      'publishedVersions', 'structure', 'rootFlowId',
    ]) && isUuid(value.rootFlowId);
  }
  if (value.structure === 'bundled') {
    return hasOnlyKeys(value, [
      'contentId', 'canonicalIdentity', 'currentPublishedVersionId', 'identities',
      'publishedVersions', 'structure', 'rootBundleId',
    ]) && isUuid(value.rootBundleId);
  }
  return false;
}

function isLegacyBinding(value: unknown): value is FlowmeProductionCandidateLegacyBinding {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'bindingId', 'origin', 'legacyKind', 'legacyRef', 'targetContentId',
      'targetNodeId', 'mode',
    ])
    && isUuid(value.bindingId)
    && typeof value.origin === 'string'
    && LEGACY_ORIGINS.includes(value.origin as typeof LEGACY_ORIGINS[number])
    && (value.legacyKind === 'saved-flow' || value.legacyKind === 'flow-item')
    && isNonEmptyString(value.legacyRef)
    && isUuid(value.targetContentId)
    && isUuid(value.targetNodeId)
    && value.mode === 'read-only';
}

function isPersonalCopy(value: unknown): value is FlowmeProductionCandidatePersonalCopy {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'copyId', 'ownerId', 'contentId', 'pinnedVersionId', 'flowId', 'revision', 'status',
    ])
    && isUuid(value.copyId)
    && isUuid(value.ownerId)
    && isUuid(value.contentId)
    && isUuid(value.pinnedVersionId)
    && isUuid(value.flowId)
    && isPositiveInteger(value.revision)
    && typeof value.status === 'string'
    && COPY_STATUSES.includes(value.status as typeof COPY_STATUSES[number]);
}

function isPersonalOverlay(value: unknown): value is FlowmeProductionCandidatePersonalOverlay {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'copyId', 'itemId', 'revision', 'retainedRemoved', 'included', 'title',
      'scheduleOverride', 'memo',
    ])
    && isUuid(value.copyId)
    && isUuid(value.itemId)
    && isPositiveInteger(value.revision)
    && typeof value.retainedRemoved === 'boolean'
    && (value.included === undefined || typeof value.included === 'boolean')
    && optionalString(value.title)
    && optionalNullableString(value.scheduleOverride)
    && optionalString(value.memo);
}

function isExecutionItemState(value: unknown): value is FlowmeProductionCandidateExecutionItemState {
  return isRecord(value)
    && hasOnlyKeys(value, ['itemId', 'occurrenceKey', 'state'])
    && isUuid(value.itemId)
    && optionalString(value.occurrenceKey)
    && typeof value.state === 'string'
    && RUN_STATES.includes(value.state as typeof RUN_STATES[number]);
}

function isExecutionRun(value: unknown): value is FlowmeProductionCandidateExecutionRun {
  return isRecord(value)
    && hasOnlyKeys(value, ['runId', 'copyId', 'contentVersionId', 'status', 'itemStates'])
    && isUuid(value.runId)
    && isUuid(value.copyId)
    && isUuid(value.contentVersionId)
    && typeof value.status === 'string'
    && RUN_STATUSES.includes(value.status as typeof RUN_STATUSES[number])
    && Array.isArray(value.itemStates)
    && value.itemStates.every(isExecutionItemState);
}

function isVersionConflict(value: unknown): value is FlowmeProductionCandidateVersionConflict {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'conflictId', 'itemId', 'change', 'field', 'sensitive', 'priorItemHash', 'nextItemHash',
    ])
    && isUuid(value.conflictId)
    && isUuid(value.itemId)
    && ['added', 'changed', 'removed'].includes(String(value.change))
    && ['inclusion', 'title', 'memo', 'schedule', 'source', 'caution'].includes(String(value.field))
    && typeof value.sensitive === 'boolean'
    && (value.priorItemHash === undefined || isSha256(value.priorItemHash))
    && (value.nextItemHash === undefined || isSha256(value.nextItemHash));
}

function isVersionDecision(value: unknown): value is FlowmeProductionCandidateVersionDecision {
  return isRecord(value)
    && hasOnlyKeys(value, ['conflictId', 'itemId', 'action', 'preservedOverlayHash'])
    && isUuid(value.conflictId)
    && isUuid(value.itemId)
    && ['use_latest', 'keep_personal', 'retain_removed', 'include', 'exclude']
      .includes(String(value.action))
    && isSha256(value.preservedOverlayHash);
}

function isResolutionReceipt(
  value: unknown,
): value is FlowmeProductionCandidateVersionResolutionReceipt {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'receiptId', 'copyId', 'ownerId', 'contentId', 'fromVersionId', 'toVersionId',
      'fromCopyRevision', 'toCopyRevision', 'reviewId', 'manualReviewId', 'conflicts',
      'decisions', 'conflictSetHash', 'decisionSetHash', 'executionStateHashBefore',
      'executionStateHashAfter', 'idempotencyKey', 'requestHash', 'appliedAt',
      'actorKind', 'immutable',
    ])
    && isUuid(value.receiptId)
    && isUuid(value.copyId)
    && isUuid(value.ownerId)
    && isUuid(value.contentId)
    && isUuid(value.fromVersionId)
    && isUuid(value.toVersionId)
    && isPositiveInteger(value.fromCopyRevision)
    && isPositiveInteger(value.toCopyRevision)
    && isUuid(value.reviewId)
    && (value.manualReviewId === undefined || isUuid(value.manualReviewId))
    && Array.isArray(value.conflicts)
    && value.conflicts.length > 0
    && value.conflicts.every(isVersionConflict)
    && Array.isArray(value.decisions)
    && value.decisions.length > 0
    && value.decisions.every(isVersionDecision)
    && isSha256(value.conflictSetHash)
    && isSha256(value.decisionSetHash)
    && isSha256(value.executionStateHashBefore)
    && isSha256(value.executionStateHashAfter)
    && isNonEmptyString(value.idempotencyKey)
    && isSha256(value.requestHash)
    && isIsoTimestamp(value.appliedAt)
    && value.actorKind === 'copy-owner'
    && value.immutable === true;
}

function isExportSnapshot(value: unknown): value is FlowmeProductionCandidateExportSnapshot {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'exportSnapshotId', 'copyId', 'pinnedVersionId', 'effectiveStateHash',
      'artifactHash', 'format', 'createdAt', 'retention', 'detached', 'writesBack',
      'immutable',
    ])
    && isUuid(value.exportSnapshotId)
    && isUuid(value.copyId)
    && isUuid(value.pinnedVersionId)
    && isSha256(value.effectiveStateHash)
    && isSha256(value.artifactHash)
    && typeof value.format === 'string'
    && EXPORT_FORMATS.includes(value.format as typeof EXPORT_FORMATS[number])
    && isIsoTimestamp(value.createdAt)
    && value.retention === 'ephemeral-artifact-with-owner-receipt'
    && value.detached === true
    && value.writesBack === false
    && value.immutable === true;
}

function isAuditEvent(value: unknown): value is FlowmeProductionCandidateAuditEvent {
  if (!isRecord(value)
    || !hasOnlyKeys(value, [
      'auditId', 'operationId', 'kind', 'actorKind', 'subjectId', 'occurredAt',
      'metadataHash', 'payloadPolicy',
    ])
    || !isUuid(value.auditId)
    || !isUuid(value.operationId)
    || !isUuid(value.subjectId)
    || !isIsoTimestamp(value.occurredAt)
    || !isSha256(value.metadataHash)
    || value.payloadPolicy !== 'metadata-only'
    || typeof value.kind !== 'string'
    || typeof value.actorKind !== 'string') return false;
  return AUDIT_ACTOR_BY_KIND[value.kind as FlowmeProductionCandidateAuditEvent['kind']]
    === value.actorKind;
}

function isSnapshotShape(value: Record<string, unknown>): value is Record<string, unknown>
& FlowmeProductionCandidateSnapshot {
  return hasOnlyKeys(value, [
    'contractVersion', 'contractStatus', 'productionApproved', 'operatingSchemaOwned',
    'runtimeWriterImplemented', 'migrationImplemented', 'migrationMode',
    'providerSyncImplemented', 'providerSyncMode', 'registryId', 'sources',
    'sourceSnapshots', 'sourceRows', 'documents', 'legacyBindings', 'personalCopies',
    'personalOverlays', 'executionRuns', 'versionResolutionReceipts', 'exportSnapshots',
    'auditEvents',
  ])
    && value.contractStatus === 'isolated-production-candidate'
    && value.productionApproved === false
    && value.operatingSchemaOwned === false
    && value.runtimeWriterImplemented === false
    && value.migrationImplemented === false
    && value.migrationMode === 'none-read-only-legacy-binding'
    && value.providerSyncImplemented === false
    && value.providerSyncMode === 'unsupported-detached-one-way-export'
    && isUuid(value.registryId)
    && Array.isArray(value.sources) && value.sources.every(isSource)
    && Array.isArray(value.sourceSnapshots) && value.sourceSnapshots.every(isSourceSnapshot)
    && Array.isArray(value.sourceRows) && value.sourceRows.every(isSourceRow)
    && Array.isArray(value.documents) && value.documents.every(isDocument)
    && Array.isArray(value.legacyBindings) && value.legacyBindings.every(isLegacyBinding)
    && Array.isArray(value.personalCopies) && value.personalCopies.every(isPersonalCopy)
    && Array.isArray(value.personalOverlays) && value.personalOverlays.every(isPersonalOverlay)
    && Array.isArray(value.executionRuns) && value.executionRuns.every(isExecutionRun)
    && Array.isArray(value.versionResolutionReceipts)
    && value.versionResolutionReceipts.every(isResolutionReceipt)
    && Array.isArray(value.exportSnapshots) && value.exportSnapshots.every(isExportSnapshot)
    && Array.isArray(value.auditEvents) && value.auditEvents.every(isAuditEvent);
}

function structuralEdgeKindsValid(
  edge: FlowmeProductionCandidateStructuralEdge,
  nodes: ReadonlyMap<string, FlowmeProductionCandidateNodeIdentity>,
): boolean {
  const from = nodes.get(edge.fromId);
  const to = nodes.get(edge.toId);
  if (!from || !to) return false;
  return (edge.relation === 'grouped_by' && from.kind === 'item' && to.kind === 'step')
    || (edge.relation === 'belongs_to' && from.kind === 'step' && to.kind === 'flow')
    || (edge.relation === 'published_in'
      && from.kind === 'flow' && to.kind === 'bundle-flow-map');
}

function hasCycle(nodeIds: readonly string[], edges: readonly FlowmeProductionCandidateStructuralEdge[]): boolean {
  const adjacency = new Map(nodeIds.map((id) => [id, [] as string[]]));
  for (const edge of edges) adjacency.get(edge.fromId)?.push(edge.toId);
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string): boolean => {
    const current = state.get(id) ?? 0;
    if (current === 1) return true;
    if (current === 2) return false;
    state.set(id, 1);
    for (const next of adjacency.get(id) ?? []) if (visit(next)) return true;
    state.set(id, 2);
    return false;
  };
  return nodeIds.some(visit);
}

function validateReceiptSemantics(
  receipt: FlowmeProductionCandidateVersionResolutionReceipt,
  errors: FlowmeProductionCandidateValidationError[],
  path: string,
): void {
  if (receipt.fromVersionId === receipt.toVersionId
    || receipt.toCopyRevision !== receipt.fromCopyRevision + 1
    || receipt.executionStateHashBefore !== receipt.executionStateHashAfter) {
    issue(errors, 'resolution-receipt-invalid', path,
      'A resolution must move one copy revision and preserve the exact execution-state hash.');
  }
  const conflicts = new Map<string, FlowmeProductionCandidateVersionConflict>();
  for (const conflict of receipt.conflicts) {
    if (conflicts.has(conflict.conflictId)) {
      issue(errors, 'resolution-receipt-invalid', `${path}.conflicts`,
        'Conflict IDs must be unique.');
    }
    conflicts.set(conflict.conflictId, conflict);
    if ((conflict.change === 'added' && conflict.field !== 'inclusion')
      || (conflict.change === 'removed' && conflict.field !== 'inclusion')
      || (conflict.change === 'changed' && conflict.field === 'inclusion')) {
      issue(errors, 'resolution-receipt-invalid', `${path}.conflicts`,
        'Added/removed conflicts use inclusion; changed conflicts use a changed field.');
    }
  }
  const decisions = new Set<string>();
  for (const decision of receipt.decisions) {
    const conflict = conflicts.get(decision.conflictId);
    if (!conflict || conflict.itemId !== decision.itemId || decisions.has(decision.conflictId)) {
      issue(errors, 'resolution-receipt-invalid', `${path}.decisions`,
        'Every conflict must have exactly one matching Item decision.');
      continue;
    }
    decisions.add(decision.conflictId);
    const allowed = conflict.change === 'added'
      ? ['include', 'exclude']
      : conflict.change === 'removed'
        ? ['retain_removed', 'exclude']
        : ['use_latest', 'keep_personal'];
    if (!allowed.includes(decision.action)) {
      issue(errors, 'resolution-receipt-invalid', `${path}.decisions`,
        'Decision action is incompatible with the conflict change kind.');
    }
  }
  if (decisions.size !== conflicts.size) {
    issue(errors, 'resolution-receipt-invalid', `${path}.decisions`,
      'Every relevant conflict requires one explicit decision.');
  }
  const manualReviewRequired = receipt.conflicts.some((conflict) => (
    conflict.sensitive || conflict.field === 'source' || conflict.field === 'caution'
  ));
  if (manualReviewRequired && !receipt.manualReviewId) {
    issue(errors, 'resolution-receipt-invalid', `${path}.manualReviewId`,
      'Sensitive, source, and caution changes require an explicit manual review reference.');
  }
}

function validateGraph(
  document: FlowmeProductionCandidateContentDocument,
  version: FlowmeProductionCandidatePublishedVersion,
  sourceRows: ReadonlyMap<string, FlowmeProductionCandidateSourceRow>,
  errors: FlowmeProductionCandidateValidationError[],
  path: string,
): void {
  const nodes = new Map(document.identities.map((node) => [node.nodeId, node]));
  const active = new Set<string>();
  for (const nodeId of version.activeNodeIds) {
    const node = nodes.get(nodeId);
    if (active.has(nodeId) || !node
      || node.createdInVersionNo > version.versionNo
      || (node.retiredInVersionNo !== undefined && node.retiredInVersionNo <= version.versionNo)) {
      issue(errors, 'graph-invalid', `${path}.activeNodeIds`,
        'Active node IDs must be unique, known, created, and not retired.');
    }
    active.add(nodeId);
  }
  const edgeKeys = new Set<string>();
  const incoming = new Map(version.activeNodeIds.map((id) => [id, 0]));
  const outgoing = new Map(version.activeNodeIds.map((id) => [id, 0]));
  for (const edge of version.structuralEdges) {
    const key = stableSerialize(edge);
    if (edgeKeys.has(key)
      || !active.has(edge.fromId)
      || !active.has(edge.toId)
      || !structuralEdgeKindsValid(edge, nodes)) {
      issue(errors, 'graph-invalid', `${path}.structuralEdges`,
        'Structural edges must be unique, active, and follow Item to Step to Flow to Bundle.');
    }
    edgeKeys.add(key);
    outgoing.set(edge.fromId, (outgoing.get(edge.fromId) ?? 0) + 1);
    incoming.set(edge.toId, (incoming.get(edge.toId) ?? 0) + 1);
  }
  if (hasCycle(version.activeNodeIds, version.structuralEdges)) {
    issue(errors, 'graph-invalid', `${path}.structuralEdges`,
      'The active hierarchy must be acyclic.');
  }
  const activeNodes = version.activeNodeIds
    .map((id) => nodes.get(id))
    .filter((node): node is FlowmeProductionCandidateNodeIdentity => Boolean(node));
  const flows = activeNodes.filter((node) => node.kind === 'flow');
  const bundles = activeNodes.filter((node) => node.kind === 'bundle-flow-map');
  for (const node of activeNodes) {
    const inCount = incoming.get(node.nodeId) ?? 0;
    const outCount = outgoing.get(node.nodeId) ?? 0;
    const valid = node.kind === 'item'
      ? inCount === 0 && outCount === 1
      : node.kind === 'step'
        ? inCount >= 1 && outCount === 1
        : node.kind === 'flow'
          ? inCount >= 1 && outCount === (document.structure === 'bundled' ? 1 : 0)
          : inCount >= 1 && outCount === 0;
    if (!valid) {
      issue(errors, 'graph-invalid', `${path}.structuralEdges`,
        `Node ${node.nodeId} does not have the required structural cardinality.`);
    }
  }
  if (document.structure === 'standalone') {
    if (bundles.length !== 0 || flows.length !== 1 || flows[0]?.nodeId !== document.rootFlowId) {
      issue(errors, 'graph-invalid', path,
        'A standalone document has exactly one stable Flow root and no Bundle.');
    }
  } else if (bundles.length !== 1 || bundles[0]?.nodeId !== document.rootBundleId
    || flows.length < 1) {
    issue(errors, 'graph-invalid', path,
      'A bundled document has exactly one stable Bundle root and one or more Flows.');
  }
  const evidenceKeys = new Set<string>();
  const sourceRefIds = new Set<string>();
  const itemEvidenceCount = new Map(
    activeNodes.filter((node) => node.kind === 'item').map((node) => [node.nodeId, 0]),
  );
  for (const edge of version.evidenceEdges) {
    const key = stableSerialize(edge);
    const item = nodes.get(edge.itemId);
    if (evidenceKeys.has(key)
      || sourceRefIds.has(edge.sourceRefId)
      || !sourceRows.has(edge.sourceRowId)
      || item?.kind !== 'item'
      || !active.has(edge.itemId)) {
      issue(errors, 'graph-invalid', `${path}.evidenceEdges`,
        'Evidence refs must be unique and link a known SourceRow to an active Item.');
    }
    evidenceKeys.add(key);
    sourceRefIds.add(edge.sourceRefId);
    itemEvidenceCount.set(edge.itemId, (itemEvidenceCount.get(edge.itemId) ?? 0) + 1);
  }
  if ([...itemEvidenceCount.values()].some((count) => count === 0)) {
    issue(errors, 'graph-invalid', `${path}.evidenceEdges`,
      'Every published Item requires at least one source-backed evidence reference.');
  }
}

function validateSnapshotSemantics(
  snapshot: FlowmeProductionCandidateSnapshot,
): FlowmeProductionCandidateValidationError[] {
  const errors: FlowmeProductionCandidateValidationError[] = [];
  const globalIds = new Map<string, string>();
  const addGlobalId = (id: string, path: string): void => {
    const previous = globalIds.get(id);
    if (previous) {
      issue(errors, 'global-id-collision', path,
        `UUID is already owned by ${previous}.`);
    } else globalIds.set(id, path);
  };
  addGlobalId(snapshot.registryId, 'registryId');

  const sources = new Map<string, FlowmeProductionCandidateSource>();
  const sourceKeys = new Set<string>();
  snapshot.sources.forEach((source, index) => {
    addGlobalId(source.sourceId, `sources[${index}].sourceId`);
    sources.set(source.sourceId, source);
    const key = stableSerialize([source.canonicalizationVersion, source.canonicalUrl]);
    if (sourceKeys.has(key)) {
      issue(errors, 'source-collision', `sources[${index}]`,
        'Canonical source URL and canonicalization version must be unique.');
    }
    sourceKeys.add(key);
  });

  const sourceSnapshots = new Map<string, FlowmeProductionCandidateSourceSnapshot>();
  const snapshotKeys = new Set<string>();
  const snapshotHashes = new Set<string>();
  snapshot.sourceSnapshots.forEach((sourceSnapshot, index) => {
    addGlobalId(sourceSnapshot.snapshotId, `sourceSnapshots[${index}].snapshotId`);
    sourceSnapshots.set(sourceSnapshot.snapshotId, sourceSnapshot);
    if (!sources.has(sourceSnapshot.sourceId)) {
      issue(errors, 'snapshot-invalid', `sourceSnapshots[${index}].sourceId`,
        'Source snapshot must reference a known source.');
    }
    const key = stableSerialize([sourceSnapshot.sourceId, sourceSnapshot.snapshotNo]);
    const hashKey = stableSerialize([sourceSnapshot.sourceId, sourceSnapshot.contentHash]);
    if (snapshotKeys.has(key) || snapshotHashes.has(hashKey)) {
      issue(errors, 'snapshot-invalid', `sourceSnapshots[${index}]`,
        'Snapshot number and finalized content hash are unique within a source.');
    }
    snapshotKeys.add(key);
    snapshotHashes.add(hashKey);
  });

  const sourceRows = new Map<string, FlowmeProductionCandidateSourceRow>();
  const rowStableKeys = new Set<string>();
  const rowOrders = new Set<string>();
  snapshot.sourceRows.forEach((row, index) => {
    addGlobalId(row.sourceRowId, `sourceRows[${index}].sourceRowId`);
    sourceRows.set(row.sourceRowId, row);
    if (!sourceSnapshots.has(row.snapshotId)) {
      issue(errors, 'source-row-invalid', `sourceRows[${index}].snapshotId`,
        'Source row must reference a known finalized snapshot.');
    }
    const key = stableSerialize([row.snapshotId, row.stableKey]);
    const order = stableSerialize([row.snapshotId, row.order]);
    if (rowStableKeys.has(key) || rowOrders.has(order)) {
      issue(errors, 'source-row-invalid', `sourceRows[${index}]`,
        'Stable key and order are unique within one snapshot.');
    }
    rowStableKeys.add(key);
    rowOrders.add(order);
  });

  const documents = new Map<string, FlowmeProductionCandidateContentDocument>();
  const canonicalKeys = new Set<string>();
  const allNodes = new Map<string, FlowmeProductionCandidateNodeIdentity>();
  const allVersions = new Map<string, FlowmeProductionCandidatePublishedVersion>();
  snapshot.documents.forEach((document, documentIndex) => {
    addGlobalId(document.contentId, `documents[${documentIndex}].contentId`);
    documents.set(document.contentId, document);
    if (!sources.has(document.canonicalIdentity.canonicalSourceId)) {
      issue(errors, 'document-invalid', `documents[${documentIndex}].canonicalIdentity`,
        'Canonical identity must reference a known source identity.');
    }
    const canonicalKey = stableSerialize([
      document.canonicalIdentity.canonicalSourceId,
      document.canonicalIdentity.userJobId,
      document.canonicalIdentity.editorialVariantId,
    ]);
    if (canonicalKeys.has(canonicalKey)) {
      issue(errors, 'content-identity-collision', `documents[${documentIndex}].canonicalIdentity`,
        'Source, user job, and editorial variant tuple must be unique across the registry.');
    }
    canonicalKeys.add(canonicalKey);
    const nodeKeys = new Set<string>();
    const nodes = new Map<string, FlowmeProductionCandidateNodeIdentity>();
    document.identities.forEach((node, nodeIndex) => {
      addGlobalId(node.nodeId, `documents[${documentIndex}].identities[${nodeIndex}].nodeId`);
      nodes.set(node.nodeId, node);
      allNodes.set(node.nodeId, node);
      if (node.contentId !== document.contentId
        || (node.retiredInVersionNo !== undefined
          && node.retiredInVersionNo <= node.createdInVersionNo)) {
        issue(errors, 'document-invalid', `documents[${documentIndex}].identities[${nodeIndex}]`,
          'Node identity must stay in its document and retire after creation.');
      }
      const key = stableSerialize([document.contentId, node.kind, node.stableKey]);
      if (nodeKeys.has(key)) {
        issue(errors, 'node-stable-key-collision',
          `documents[${documentIndex}].identities[${nodeIndex}].stableKey`,
          'Kind-scoped stable keys must be unique within a content document.');
      }
      nodeKeys.add(key);
    });
    const versionIds = new Set<string>();
    const versionHashes = new Set<string>();
    document.publishedVersions.forEach((version, versionIndex) => {
      addGlobalId(version.versionId,
        `documents[${documentIndex}].publishedVersions[${versionIndex}].versionId`);
      versionIds.add(version.versionId);
      allVersions.set(version.versionId, version);
      if (version.contentId !== document.contentId
        || version.versionNo !== versionIndex + 1
        || (versionIndex === 0 && version.predecessorVersionId !== null)
        || (versionIndex > 0
          && version.predecessorVersionId !== document.publishedVersions[versionIndex - 1].versionId)
        || versionHashes.has(version.contentHash)) {
        issue(errors, 'version-history-invalid',
          `documents[${documentIndex}].publishedVersions[${versionIndex}]`,
          'Published versions form one monotonic append-only chain with unique semantic hashes.');
      }
      versionHashes.add(version.contentHash);
      version.evidenceEdges.forEach((edge, edgeIndex) => {
        addGlobalId(edge.sourceRefId,
          `documents[${documentIndex}].publishedVersions[${versionIndex}].evidenceEdges[${edgeIndex}].sourceRefId`);
      });
      validateGraph(document, version, sourceRows, errors,
        `documents[${documentIndex}].publishedVersions[${versionIndex}]`);
    });
    if (document.publishedVersions.length === 0
      || document.publishedVersions.at(-1)?.versionId !== document.currentPublishedVersionId) {
      issue(errors, 'version-history-invalid',
        `documents[${documentIndex}].currentPublishedVersionId`,
        'Current published pointer must select the latest immutable version.');
    }
    for (const [nodeIndex, node] of document.identities.entries()) {
      const firstActive = document.publishedVersions.find((version) => (
        version.activeNodeIds.includes(node.nodeId)
      ));
      const firstInactiveAfterActive = firstActive
        ? document.publishedVersions.find((version) => (
          version.versionNo > firstActive.versionNo && !version.activeNodeIds.includes(node.nodeId)
        ))
        : undefined;
      if (!firstActive || firstActive.versionNo !== node.createdInVersionNo
        || (node.retiredInVersionNo !== undefined
          && node.retiredInVersionNo !== firstInactiveAfterActive?.versionNo)
        || (node.retiredInVersionNo === undefined && firstInactiveAfterActive !== undefined)) {
        issue(errors, 'document-invalid',
          `documents[${documentIndex}].identities[${nodeIndex}]`,
          'Creation and retirement version numbers must match active-version history.');
      }
    }
  });

  const bindingKeys = new Set<string>();
  snapshot.legacyBindings.forEach((binding, index) => {
    addGlobalId(binding.bindingId, `legacyBindings[${index}].bindingId`);
    const node = allNodes.get(binding.targetNodeId);
    const key = stableSerialize([binding.origin, binding.legacyKind, binding.legacyRef]);
    if (bindingKeys.has(key)
      || node?.contentId !== binding.targetContentId
      || (binding.legacyKind === 'saved-flow' && node?.kind !== 'flow')
      || (binding.legacyKind === 'flow-item' && node?.kind !== 'item')) {
      issue(errors, 'legacy-binding-invalid', `legacyBindings[${index}]`,
        'A legacy ref maps read-only and unambiguously to one matching stable node.');
    }
    bindingKeys.add(key);
  });

  const copies = new Map<string, FlowmeProductionCandidatePersonalCopy>();
  snapshot.personalCopies.forEach((copy, index) => {
    addGlobalId(copy.copyId, `personalCopies[${index}].copyId`);
    copies.set(copy.copyId, copy);
    const document = documents.get(copy.contentId);
    const version = allVersions.get(copy.pinnedVersionId);
    const flow = allNodes.get(copy.flowId);
    if (!document || version?.contentId !== copy.contentId
      || flow?.contentId !== copy.contentId || flow.kind !== 'flow'
      || !version.activeNodeIds.includes(copy.flowId)) {
      issue(errors, 'copy-invalid', `personalCopies[${index}]`,
        'A personal copy pins one published version and active Flow in one content document.');
    }
  });

  const overlayKeys = new Set<string>();
  snapshot.personalOverlays.forEach((overlay, index) => {
    const copy = copies.get(overlay.copyId);
    const item = allNodes.get(overlay.itemId);
    const version = copy ? allVersions.get(copy.pinnedVersionId) : undefined;
    const active = version?.activeNodeIds.includes(overlay.itemId) === true;
    const key = stableSerialize([overlay.copyId, overlay.itemId]);
    if (overlayKeys.has(key) || !copy || item?.kind !== 'item'
      || item.contentId !== copy.contentId
      || (!active && !overlay.retainedRemoved)
      || (active && overlay.retainedRemoved)) {
      issue(errors, 'overlay-invalid', `personalOverlays[${index}]`,
        'Overlay must be unique, private to its copy, and mark only removed Items as retained.');
    }
    overlayKeys.add(key);
  });

  const activeRunCopies = new Set<string>();
  snapshot.executionRuns.forEach((run, index) => {
    addGlobalId(run.runId, `executionRuns[${index}].runId`);
    const copy = copies.get(run.copyId);
    const version = allVersions.get(run.contentVersionId);
    const stateKeys = new Set<string>();
    let invalid = !copy || version?.contentId !== copy.contentId;
    for (const state of run.itemStates) {
      const key = stableSerialize([state.itemId, state.occurrenceKey ?? '']);
      if (stateKeys.has(key) || !version?.activeNodeIds.includes(state.itemId)
        || allNodes.get(state.itemId)?.kind !== 'item') invalid = true;
      stateKeys.add(key);
    }
    if (run.status === 'active') {
      if (activeRunCopies.has(run.copyId)) invalid = true;
      activeRunCopies.add(run.copyId);
    }
    if (invalid) {
      issue(errors, 'execution-run-invalid', `executionRuns[${index}]`,
        'Run identity, owner copy, version, active Item occurrence, and active-run count must be valid.');
    }
  });

  const receiptRequestKeys = new Set<string>();
  const receiptsByCopy = new Map<string, FlowmeProductionCandidateVersionResolutionReceipt[]>();
  snapshot.versionResolutionReceipts.forEach((receipt, index) => {
    addGlobalId(receipt.receiptId, `versionResolutionReceipts[${index}].receiptId`);
    addGlobalId(receipt.reviewId, `versionResolutionReceipts[${index}].reviewId`);
    if (receipt.manualReviewId) {
      addGlobalId(receipt.manualReviewId,
        `versionResolutionReceipts[${index}].manualReviewId`);
    }
    receipt.conflicts.forEach((conflict, conflictIndex) => {
      addGlobalId(conflict.conflictId,
        `versionResolutionReceipts[${index}].conflicts[${conflictIndex}].conflictId`);
    });
    const copy = copies.get(receipt.copyId);
    const fromVersion = allVersions.get(receipt.fromVersionId);
    const toVersion = allVersions.get(receipt.toVersionId);
    const requestKey = stableSerialize([receipt.copyId, receipt.idempotencyKey]);
    if (!copy || copy.ownerId !== receipt.ownerId || copy.contentId !== receipt.contentId
      || fromVersion?.contentId !== receipt.contentId
      || toVersion?.contentId !== receipt.contentId
      || (fromVersion !== undefined && toVersion !== undefined
        && toVersion.versionNo <= fromVersion.versionNo)
      || receiptRequestKeys.has(requestKey)) {
      issue(errors, 'resolution-receipt-invalid', `versionResolutionReceipts[${index}]`,
        'Receipt must bind one owner, copy, content, two versions, and idempotency key.');
    }
    receiptRequestKeys.add(requestKey);
    const chain = receiptsByCopy.get(receipt.copyId) ?? [];
    chain.push(receipt);
    receiptsByCopy.set(receipt.copyId, chain);
    if (fromVersion && toVersion) {
      for (const [conflictIndex, conflict] of receipt.conflicts.entries()) {
        const item = allNodes.get(conflict.itemId);
        const wasActive = fromVersion.activeNodeIds.includes(conflict.itemId);
        const isActive = toVersion.activeNodeIds.includes(conflict.itemId);
        const versionPresenceMatches = conflict.change === 'added'
          ? !wasActive && isActive
          : conflict.change === 'removed'
            ? wasActive && !isActive
            : wasActive && isActive;
        const hashPresenceMatches = conflict.change === 'added'
          ? conflict.priorItemHash === undefined && conflict.nextItemHash !== undefined
          : conflict.change === 'removed'
            ? conflict.priorItemHash !== undefined && conflict.nextItemHash === undefined
            : conflict.priorItemHash !== undefined && conflict.nextItemHash !== undefined
              && conflict.priorItemHash !== conflict.nextItemHash;
        if (item?.kind !== 'item' || item.contentId !== receipt.contentId
          || !versionPresenceMatches || !hashPresenceMatches) {
          issue(errors, 'resolution-receipt-invalid',
            `versionResolutionReceipts[${index}].conflicts[${conflictIndex}]`,
            'Conflict kind, Item identity, version presence, and before/after hashes must agree.');
        }
      }
    }
    validateReceiptSemantics(receipt, errors, `versionResolutionReceipts[${index}]`);
  });
  for (const [copyId, receipts] of receiptsByCopy) {
    const copy = copies.get(copyId);
    for (let index = 1; index < receipts.length; index += 1) {
      const prior = receipts[index - 1];
      const next = receipts[index];
      if (next.fromVersionId !== prior.toVersionId
        || next.fromCopyRevision !== prior.toCopyRevision
        || Date.parse(next.appliedAt) < Date.parse(prior.appliedAt)) {
        issue(errors, 'resolution-receipt-invalid', 'versionResolutionReceipts',
          'Receipts for one copy form a monotonic version, revision, and time chain.');
      }
    }
    const latest = receipts.at(-1);
    if (!copy || latest?.toVersionId !== copy.pinnedVersionId
      || latest?.toCopyRevision !== copy.revision) {
      issue(errors, 'resolution-receipt-invalid', 'versionResolutionReceipts',
        'The latest immutable receipt must match the copy current pin and revision.');
    }
  }

  snapshot.exportSnapshots.forEach((exportSnapshot, index) => {
    addGlobalId(exportSnapshot.exportSnapshotId,
      `exportSnapshots[${index}].exportSnapshotId`);
    const copy = copies.get(exportSnapshot.copyId);
    const exportedVersion = allVersions.get(exportSnapshot.pinnedVersionId);
    if (!copy || exportedVersion?.contentId !== copy.contentId) {
      issue(errors, 'export-snapshot-invalid', `exportSnapshots[${index}]`,
        'An export snapshot binds the copy pinned version at creation and never writes back.');
    }
  });

  const auditSubjectKeys = new Set<string>();
  snapshot.auditEvents.forEach((event, index) => {
    addGlobalId(event.auditId, `auditEvents[${index}].auditId`);
    const key = stableSerialize([event.kind, event.subjectId]);
    if (auditSubjectKeys.has(key)) {
      issue(errors, 'audit-event-invalid', `auditEvents[${index}]`,
        'One immutable subject event of a given kind may appear only once.');
    }
    auditSubjectKeys.add(key);
  });
  for (const sourceSnapshot of snapshot.sourceSnapshots) {
    if (!auditSubjectKeys.has(stableSerialize(['source-snapshot-finalized', sourceSnapshot.snapshotId]))) {
      issue(errors, 'audit-event-invalid', 'auditEvents',
        'Every finalized source snapshot requires a metadata-only audit event.');
    }
  }
  for (const version of allVersions.values()) {
    if (!auditSubjectKeys.has(stableSerialize(['published-version-appended', version.versionId]))) {
      issue(errors, 'audit-event-invalid', 'auditEvents',
        'Every published version requires an append audit event.');
    }
  }
  for (const receipt of snapshot.versionResolutionReceipts) {
    if (!auditSubjectKeys.has(stableSerialize(['version-resolution-applied', receipt.receiptId]))) {
      issue(errors, 'audit-event-invalid', 'auditEvents',
        'Every VersionResolution receipt requires an apply audit event.');
    }
  }
  for (const exportSnapshot of snapshot.exportSnapshots) {
    if (!auditSubjectKeys.has(stableSerialize([
      'export-snapshot-created', exportSnapshot.exportSnapshotId,
    ]))) {
      issue(errors, 'audit-event-invalid', 'auditEvents',
        'Every detached export snapshot requires a metadata-only audit event.');
    }
  }
  return errors;
}

export function validatePersonalWorkspacePocProductionCandidateV1(
  value: unknown,
): FlowmeProductionCandidateValidationResult {
  if (!isRecord(value)) {
    return { ok: false, errors: [{
      code: 'invalid-snapshot', path: '$', message: 'Candidate snapshot must be an object.',
    }] };
  }
  if (value.contractVersion !== PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION) {
    return { ok: false, errors: [{
      code: 'unsupported-contract-version', path: 'contractVersion',
      message: 'Unknown candidate contract versions fail closed.',
    }] };
  }
  if (!isSnapshotShape(value)) {
    return { ok: false, errors: [{
      code: 'boundary-claim-invalid', path: '$',
      message: 'Shape, strict keys, or non-production boundary claims are invalid.',
    }] };
  }
  const errors = validateSnapshotSemantics(value);
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function isTransitionEnvelope(
  value: unknown,
  kind: 'publish' | 'resolution',
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const common = ['contractVersion', 'operationId', 'before', 'after'];
  const allowed = kind === 'publish'
    ? [...common, 'contentId', 'fromVersionId', 'toVersionId']
    : [...common, 'copyId', 'receiptId'];
  return hasOnlyKeys(value, allowed)
    && value.contractVersion === PERSONAL_WORKSPACE_POC_PRODUCTION_CANDIDATE_VERSION
    && isUuid(value.operationId)
    && (kind === 'publish'
      ? isUuid(value.contentId) && isUuid(value.fromVersionId) && isUuid(value.toVersionId)
      : isUuid(value.copyId) && isUuid(value.receiptId));
}

function prefixUnchanged(before: readonly unknown[], after: readonly unknown[]): boolean {
  return after.length >= before.length
    && before.every((entry, index) => sameValue(entry, after[index]));
}

export function validatePersonalWorkspacePocProductionCandidatePublishTransitionV1(
  value: unknown,
): FlowmeProductionCandidateValidationResult {
  if (!isTransitionEnvelope(value, 'publish')) {
    return { ok: false, errors: [{
      code: 'publish-transition-invalid', path: '$', message: 'Publish transition envelope is invalid.',
    }] };
  }
  const beforeResult = validatePersonalWorkspacePocProductionCandidateV1(value.before);
  const afterResult = validatePersonalWorkspacePocProductionCandidateV1(value.after);
  if (!beforeResult.ok || !afterResult.ok) {
    return { ok: false, errors: [
      ...(!beforeResult.ok ? beforeResult.errors.map((error) => ({
        ...error, path: `before.${error.path}`,
      })) : []),
      ...(!afterResult.ok ? afterResult.errors.map((error) => ({
        ...error, path: `after.${error.path}`,
      })) : []),
    ] };
  }
  const transition = value as unknown as FlowmeProductionCandidatePublishTransition;
  const { before, after } = transition;
  const errors: FlowmeProductionCandidateValidationError[] = [];
  const beforeDocument = before.documents.find((entry) => entry.contentId === transition.contentId);
  const afterDocument = after.documents.find((entry) => entry.contentId === transition.contentId);
  if (!beforeDocument || !afterDocument
    || transition.fromVersionId !== beforeDocument.currentPublishedVersionId
    || transition.toVersionId !== afterDocument.currentPublishedVersionId
    || afterDocument.publishedVersions.length !== beforeDocument.publishedVersions.length + 1
    || afterDocument.publishedVersions.at(-1)?.predecessorVersionId !== transition.fromVersionId
    || afterDocument.publishedVersions.at(-1)?.versionId !== transition.toVersionId
    || !prefixUnchanged(beforeDocument.publishedVersions, afterDocument.publishedVersions)) {
    issue(errors, 'publish-transition-invalid', 'after.documents',
      'Publish appends exactly one immutable successor to the selected content document.');
  }
  const stableBeforeNodes = new Map(beforeDocument?.identities.map((node) => [node.nodeId, node]));
  const stableAfterNodes = new Map(afterDocument?.identities.map((node) => [node.nodeId, node]));
  for (const [nodeId, beforeNode] of stableBeforeNodes) {
    const afterNode = stableAfterNodes.get(nodeId);
    const allowedRetirement = beforeNode.retiredInVersionNo === undefined
      && afterNode?.retiredInVersionNo === afterDocument?.publishedVersions.length;
    if (!afterNode || (!sameValue(beforeNode, afterNode) && !(
      allowedRetirement
      && sameValue({ ...beforeNode, retiredInVersionNo: afterNode.retiredInVersionNo }, afterNode)
    ))) {
      issue(errors, 'history-mutated', 'after.documents.identities',
        'Existing stable identity bindings are immutable except explicit retirement in the appended version.');
    }
  }
  for (const node of afterDocument?.identities ?? []) {
    if (!stableBeforeNodes.has(node.nodeId)
      && node.createdInVersionNo !== afterDocument?.publishedVersions.length) {
      issue(errors, 'publish-transition-invalid', 'after.documents.identities',
        'New stable nodes are created only in the appended version.');
    }
  }
  const beforeOtherDocuments = before.documents.filter((entry) => entry.contentId !== transition.contentId);
  const afterOtherDocuments = after.documents.filter((entry) => entry.contentId !== transition.contentId);
  if (before.registryId !== after.registryId
    || !sameValue(before.sources, after.sources)
    || !sameValue(before.sourceSnapshots, after.sourceSnapshots)
    || !sameValue(before.sourceRows, after.sourceRows)
    || !sameValue(beforeOtherDocuments, afterOtherDocuments)
    || !sameValue(before.legacyBindings, after.legacyBindings)) {
    issue(errors, 'history-mutated', 'after',
      'Publish cannot mutate source evidence, other documents, registry identity, or legacy bindings.');
  }
  if (!sameValue(before.personalCopies, after.personalCopies)
    || !sameValue(before.personalOverlays, after.personalOverlays)
    || !sameValue(before.executionRuns, after.executionRuns)
    || !sameValue(before.versionResolutionReceipts, after.versionResolutionReceipts)
    || !sameValue(before.exportSnapshots, after.exportSnapshots)) {
    issue(errors, 'private-state-mutated', 'after',
      'Publishing cannot move a personal copy or mutate private overlay, run, receipt, or export state.');
  }
  const appendedAudit = after.auditEvents.at(-1);
  if (after.auditEvents.length !== before.auditEvents.length + 1
    || !prefixUnchanged(before.auditEvents, after.auditEvents)
    || appendedAudit?.operationId !== transition.operationId
    || appendedAudit?.kind !== 'published-version-appended'
    || appendedAudit?.subjectId !== transition.toVersionId) {
    issue(errors, 'publish-transition-invalid', 'after.auditEvents',
      'Publish appends one matching metadata-only lifecycle audit event.');
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function overlayMap(overlays: readonly FlowmeProductionCandidatePersonalOverlay[], copyId: string) {
  return new Map(overlays.filter((overlay) => overlay.copyId === copyId)
    .map((overlay) => [overlay.itemId, overlay]));
}

function overlayChangedFields(
  before: FlowmeProductionCandidatePersonalOverlay | undefined,
  after: FlowmeProductionCandidatePersonalOverlay | undefined,
): Array<FlowmeProductionCandidateVersionConflict['field']> {
  const fields: Array<FlowmeProductionCandidateVersionConflict['field']> = [];
  if (before?.included !== after?.included) fields.push('inclusion');
  if (before?.title !== after?.title) fields.push('title');
  if (before?.memo !== after?.memo) fields.push('memo');
  if (before?.scheduleOverride !== after?.scheduleOverride) fields.push('schedule');
  if (before?.retainedRemoved !== after?.retainedRemoved) fields.push('inclusion');
  return [...new Set(fields)];
}

function overlayFieldValue(
  overlay: FlowmeProductionCandidatePersonalOverlay | undefined,
  field: FlowmeProductionCandidateVersionConflict['field'],
): unknown {
  if (field === 'title') return overlay?.title;
  if (field === 'memo') return overlay?.memo;
  if (field === 'schedule') return overlay?.scheduleOverride;
  if (field === 'inclusion') return overlay?.included;
  return undefined;
}

export function validatePersonalWorkspacePocProductionCandidateResolutionTransitionV1(
  value: unknown,
): FlowmeProductionCandidateValidationResult {
  if (!isTransitionEnvelope(value, 'resolution')) {
    return { ok: false, errors: [{
      code: 'resolution-transition-invalid', path: '$',
      message: 'VersionResolution transition envelope is invalid.',
    }] };
  }
  const beforeResult = validatePersonalWorkspacePocProductionCandidateV1(value.before);
  const afterResult = validatePersonalWorkspacePocProductionCandidateV1(value.after);
  if (!beforeResult.ok || !afterResult.ok) {
    return { ok: false, errors: [
      ...(!beforeResult.ok ? beforeResult.errors.map((error) => ({
        ...error, path: `before.${error.path}`,
      })) : []),
      ...(!afterResult.ok ? afterResult.errors.map((error) => ({
        ...error, path: `after.${error.path}`,
      })) : []),
    ] };
  }
  const transition = value as unknown as FlowmeProductionCandidateResolutionTransition;
  const { before, after } = transition;
  const errors: FlowmeProductionCandidateValidationError[] = [];
  if (before.registryId !== after.registryId
    || !sameValue(before.sources, after.sources)
    || !sameValue(before.sourceSnapshots, after.sourceSnapshots)
    || !sameValue(before.sourceRows, after.sourceRows)
    || !sameValue(before.documents, after.documents)
    || !sameValue(before.legacyBindings, after.legacyBindings)) {
    issue(errors, 'history-mutated', 'after',
      'VersionResolution cannot publish or mutate registry, evidence, document, or legacy identity.');
  }
  const beforeCopies = new Map(before.personalCopies.map((copy) => [copy.copyId, copy]));
  const afterCopies = new Map(after.personalCopies.map((copy) => [copy.copyId, copy]));
  const beforeCopy = beforeCopies.get(transition.copyId);
  const afterCopy = afterCopies.get(transition.copyId);
  if (beforeCopies.size !== afterCopies.size || !beforeCopy || !afterCopy
    || beforeCopy.ownerId !== afterCopy.ownerId
    || beforeCopy.contentId !== afterCopy.contentId
    || beforeCopy.flowId !== afterCopy.flowId
    || beforeCopy.status !== afterCopy.status
    || afterCopy.revision !== beforeCopy.revision + 1) {
    issue(errors, 'resolution-transition-invalid', 'after.personalCopies',
      'Only one existing copy pin and revision may move during VersionResolution.');
  }
  for (const [copyId, copy] of beforeCopies) {
    if (copyId !== transition.copyId && !sameValue(copy, afterCopies.get(copyId))) {
      issue(errors, 'private-state-mutated', `after.personalCopies.${copyId}`,
        'Unrelated personal copies remain byte-equivalent.');
    }
  }
  const receipt = after.versionResolutionReceipts.find((entry) => (
    entry.receiptId === transition.receiptId
  ));
  if (!receipt || receipt.copyId !== transition.copyId
    || receipt.ownerId !== beforeCopy?.ownerId
    || receipt.contentId !== beforeCopy?.contentId
    || receipt.fromVersionId !== beforeCopy?.pinnedVersionId
    || receipt.toVersionId !== afterCopy?.pinnedVersionId
    || receipt.fromCopyRevision !== beforeCopy?.revision
    || receipt.toCopyRevision !== afterCopy?.revision) {
    issue(errors, 'resolution-transition-invalid', 'after.versionResolutionReceipts',
      'The immutable receipt must bind the exact owner, copy, versions, and revisions.');
  }
  if (after.versionResolutionReceipts.length !== before.versionResolutionReceipts.length + 1
    || !prefixUnchanged(before.versionResolutionReceipts, after.versionResolutionReceipts)
    || after.versionResolutionReceipts.at(-1)?.receiptId !== transition.receiptId) {
    issue(errors, 'resolution-transition-invalid', 'after.versionResolutionReceipts',
      'VersionResolution appends exactly one receipt without rewriting prior receipts.');
  }
  if (!sameValue(before.executionRuns, after.executionRuns)
    || !sameValue(before.exportSnapshots, after.exportSnapshots)) {
    issue(errors, 'private-state-mutated', 'after',
      'VersionResolution preserves execution history and prior export snapshots byte-for-byte.');
  }
  const beforeForeignOverlays = before.personalOverlays.filter((overlay) => (
    overlay.copyId !== transition.copyId
  ));
  const afterForeignOverlays = after.personalOverlays.filter((overlay) => (
    overlay.copyId !== transition.copyId
  ));
  if (!sameValue(beforeForeignOverlays, afterForeignOverlays)) {
    issue(errors, 'private-state-mutated', 'after.personalOverlays',
      'VersionResolution cannot mutate another copy overlay.');
  }
  if (receipt) {
    const conflicts = new Set(receipt.conflicts.map((conflict) => (
      stableSerialize([conflict.itemId, conflict.field])
    )));
    const decisions = new Map(receipt.decisions.map((decision) => (
      [decision.conflictId, decision]
    )));
    const beforeOverlays = overlayMap(before.personalOverlays, transition.copyId);
    const afterOverlays = overlayMap(after.personalOverlays, transition.copyId);
    const itemIds = new Set([...beforeOverlays.keys(), ...afterOverlays.keys()]);
    for (const itemId of itemIds) {
      const beforeOverlay = beforeOverlays.get(itemId);
      const afterOverlay = afterOverlays.get(itemId);
      const changedFields = overlayChangedFields(beforeOverlay, afterOverlay);
      if (beforeOverlay && afterOverlay
        && afterOverlay.revision !== beforeOverlay.revision + (changedFields.length > 0 ? 1 : 0)) {
        issue(errors, 'resolution-transition-invalid', 'after.personalOverlays',
          'An existing overlay revision increments exactly once only when reviewed fields change.');
      }
      if (!beforeOverlay && afterOverlay && afterOverlay.revision !== 1) {
        issue(errors, 'resolution-transition-invalid', 'after.personalOverlays',
          'A newly materialized overlay starts at revision one.');
      }
      for (const field of changedFields) {
        if (!conflicts.has(stableSerialize([itemId, field]))) {
          issue(errors, 'private-state-mutated', 'after.personalOverlays',
            'Every overlay field change requires a matching reviewed Item conflict.');
        }
      }
    }
    for (const conflict of receipt.conflicts) {
      const decision = decisions.get(conflict.conflictId);
      const beforeOverlay = beforeOverlays.get(conflict.itemId);
      const afterOverlay = afterOverlays.get(conflict.itemId);
      let applied = decision !== undefined;
      if (decision?.action === 'include') {
        applied = afterOverlay?.included !== false && afterOverlay?.retainedRemoved !== true;
      } else if (decision?.action === 'exclude' && conflict.change === 'added') {
        applied = afterOverlay?.included === false && afterOverlay.retainedRemoved === false;
      } else if (decision?.action === 'exclude' && conflict.change === 'removed') {
        applied = afterOverlay === undefined;
      } else if (decision?.action === 'retain_removed') {
        applied = afterOverlay?.retainedRemoved === true && afterOverlay.included !== false;
      } else if (decision?.action === 'keep_personal'
        && ['title', 'memo', 'schedule'].includes(conflict.field)) {
        const priorValue = overlayFieldValue(beforeOverlay, conflict.field);
        applied = priorValue !== undefined
          && sameValue(priorValue, overlayFieldValue(afterOverlay, conflict.field));
      } else if (decision?.action === 'use_latest'
        && ['title', 'memo', 'schedule'].includes(conflict.field)) {
        applied = overlayFieldValue(afterOverlay, conflict.field) === undefined;
      }
      if (!applied) {
        issue(errors, 'resolution-transition-invalid', 'after.personalOverlays',
          'Each reviewed decision must be reflected by the resulting private overlay.');
      }
    }
  }
  const appendedAudit = after.auditEvents.at(-1);
  if (after.auditEvents.length !== before.auditEvents.length + 1
    || !prefixUnchanged(before.auditEvents, after.auditEvents)
    || appendedAudit?.operationId !== transition.operationId
    || appendedAudit?.kind !== 'version-resolution-applied'
    || appendedAudit?.subjectId !== transition.receiptId) {
    issue(errors, 'resolution-transition-invalid', 'after.auditEvents',
      'VersionResolution appends one matching metadata-only audit event.');
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
