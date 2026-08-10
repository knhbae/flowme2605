import type {
  EffectiveFlowProjectionManifest,
  EffectiveFlowProjectionScope,
} from './effective-flow-contract';
import {
  FLOW_EXPORT_RECEIPT_WRITE_LOCK,
  withStorageWriteLock,
} from './storage-write-lock';

export const RESULT_TRANSFER_SCHEMA_VERSION = 1 as const;
export const RESULT_TRANSFER_RECEIPT_SCHEMA_VERSION = 1 as const;

export type ResultTransferRoute = 'saved_transfer' | 'public_quick';
export type ResultTransferPersistence = 'persistent_receipt' | 'session';
export type ResultTransferArtifactTarget = 'clipboard' | 'local_file';
export type ResultTransferNewlinePolicy = 'preserve';
export type ResultTransferPayloadEncoding = 'utf-8' | 'octets';

export type ResultTransferTransportIdentity = Readonly<{
  payloadHashAlgorithm: 'sha256';
  payloadHash: string;
  payloadByteLength: number;
  /** Omitted on legacy/text identities. `octets` means the hash owns raw bytes. */
  payloadEncoding?: 'octets';
  textEncoding?: 'utf-8';
  newlinePolicy?: ResultTransferNewlinePolicy;
}>;

export type ResultTransferCountUnits = Readonly<{
  itemCount: 'item';
  projectionOutputCount: 'projection_output';
  outputCount: 'artifact_output';
}>;

const RESULT_TRANSFER_COUNT_UNITS: ResultTransferCountUnits = Object.freeze({
  itemCount: 'item',
  projectionOutputCount: 'projection_output',
  outputCount: 'artifact_output',
});

type ResultTransferArtifactPayloadBase = Readonly<{
  target: ResultTransferArtifactTarget;
  mediaType: string;
  filename?: string;
  itemIds: readonly string[];
  outputCount: number;
}>;

export type ResultTransferTextArtifactPayload = ResultTransferArtifactPayloadBase & Readonly<{
  payload: string;
  /** Optional so every existing UTF-8 caller remains source-compatible. */
  payloadEncoding?: 'utf-8';
}>;

export type ResultTransferBinaryArtifactPayload = Omit<
  ResultTransferArtifactPayloadBase,
  'target'
> & Readonly<{
  target: 'local_file';
  payload: ArrayBuffer | Uint8Array;
  payloadEncoding: 'octets';
}>;

export type ResultTransferArtifactPayload =
  | ResultTransferTextArtifactPayload
  | ResultTransferBinaryArtifactPayload;

type ResultTransferRequestArtifactBase = Readonly<{
  target: ResultTransferArtifactTarget;
  mediaType: string;
  filename?: string;
  payloadHash: string;
  payloadByteLength: number;
  itemIds: readonly string[];
  itemCount: number;
  outputCount: number;
}>;

export type ResultTransferTextRequestArtifact = ResultTransferRequestArtifactBase & Readonly<{
  payload: string;
  payloadEncoding?: undefined;
}>;

export type ResultTransferBinaryRequestArtifact = Omit<
  ResultTransferRequestArtifactBase,
  'target'
> & Readonly<{
  target: 'local_file';
  /** Binary input is cloned into this deeply frozen byte array. */
  payload: readonly number[];
  payloadEncoding: 'octets';
}>;

export type ResultTransferRequestArtifact =
  | ResultTransferTextRequestArtifact
  | ResultTransferBinaryRequestArtifact;

export type ResultTransferOmitted = Readonly<{
  heldItemIds: readonly string[];
  unavailableItemIds: readonly string[];
  excludedItemIds: readonly string[];
  reasonsByItemId: Readonly<Record<string, string>>;
}>;

export type ResultTransferSnapshotIdentity = Readonly<{
  flowId: string;
  flowSlug: string;
  sourceVersion: string;
  personalVersion: string;
  executionVersion: string;
}>;

type ResultTransferRequestBase<TArtifact extends ResultTransferRequestArtifact> = Readonly<{
  schemaVersion: typeof RESULT_TRANSFER_SCHEMA_VERSION;
  requestId: string;
  route: ResultTransferRoute;
  persistence: ResultTransferPersistence;
  savedPlanId?: string;
  createdAt: string;
  snapshot: Readonly<{
    kind: EffectiveFlowProjectionManifest['snapshotKind'];
    version: string;
    hash: string;
    identity: ResultTransferSnapshotIdentity;
  }>;
  scope: EffectiveFlowProjectionScope;
  format: EffectiveFlowProjectionManifest['destination'];
  artifactKind: EffectiveFlowProjectionManifest['artifactKind'];
  itemIds: readonly string[];
  itemCount: number;
  projectionOutputCount: number;
  outputCount: number;
  countUnits?: ResultTransferCountUnits;
  omitted: ResultTransferOmitted;
  oneWay: true;
  duplicateRisk: true;
  artifact: TArtifact;
}>;

/** Existing UTF-8 request contract retained as the default public type. */
export type ResultTransferRequest = ResultTransferRequestBase<ResultTransferTextRequestArtifact>;

export type ResultTransferBinaryRequest = ResultTransferRequestBase<
  ResultTransferBinaryRequestArtifact
>;

export type AnyResultTransferRequest = ResultTransferRequest | ResultTransferBinaryRequest;

export type ResultTransferArtifactEffectResult = Readonly<{
  target: ResultTransferArtifactTarget;
  filename?: string;
  itemIds: readonly string[];
  itemCount: number;
  outputCount: number;
  canonicalPayloadHash: string;
  canonicalPayloadByteLength: number;
  transport: ResultTransferTransportIdentity;
  completedAt: string;
}>;

export type ResultTransferSessionConfirmation = Readonly<{
  kind: 'session_only';
  requestId: string;
  completedAt: string;
  snapshot: Readonly<{
    kind: ResultTransferRequest['snapshot']['kind'];
    version: string;
    hash: string;
  }>;
  /** @deprecated Use `snapshot.hash`. Kept as a compatibility alias for existing consumers. */
  snapshotHash: string;
  format: ResultTransferRequest['format'];
  itemIds: readonly string[];
  itemCount: number;
  projectionOutputCount: number;
  outputCount: number;
  countUnits: ResultTransferCountUnits;
  artifact: Readonly<{
    target: ResultTransferArtifactTarget;
    mediaType: string;
    filename?: string;
    payloadHash: string;
    payloadByteLength: number;
    payloadHashAlgorithm: 'sha256';
    payloadEncoding?: 'octets';
    textEncoding?: 'utf-8';
    newlinePolicy?: ResultTransferNewlinePolicy;
    canonicalPayloadHash: string;
    canonicalPayloadByteLength: number;
    itemIds: readonly string[];
    itemCount: number;
    outputCount: number;
  }>;
}>;

export type ResultTransferPersistentReceipt = Readonly<{
  schemaVersion: typeof RESULT_TRANSFER_RECEIPT_SCHEMA_VERSION;
  kind: 'persistent_receipt';
  receiptId: string;
  requestId: string;
  route: 'saved_transfer';
  savedPlanId: string;
  outcome: 'success';
  createdAt: string;
  completedAt: string;
  snapshot: ResultTransferRequest['snapshot'];
  scope: EffectiveFlowProjectionScope;
  format: ResultTransferRequest['format'];
  artifactKind: ResultTransferRequest['artifactKind'];
  itemIds: readonly string[];
  itemCount: number;
  projectionOutputCount: number;
  outputCount: number;
  /** Added to v1 receipts without invalidating receipts written before this field existed. */
  countUnits?: ResultTransferCountUnits;
  omitted: ResultTransferOmitted;
  oneWay: true;
  duplicateRisk: true;
  artifact: Readonly<{
    target: ResultTransferArtifactTarget;
    mediaType: string;
    filename?: string;
    payloadHash: string;
    payloadByteLength: number;
    /** Present on transport-verifiable v1 receipts; absent on legacy v1 receipts. */
    payloadHashAlgorithm?: 'sha256';
    /** `octets` identifies binary payload receipts; absent means legacy UTF-8 text. */
    payloadEncoding?: 'octets';
    /** Present on transport-verifiable v1 receipts; absent on legacy v1 receipts. */
    textEncoding?: 'utf-8';
    /** Present on transport-verifiable v1 receipts; absent on legacy v1 receipts. */
    newlinePolicy?: ResultTransferNewlinePolicy;
    /** The canonical request fingerprint, distinct from the transported-byte SHA-256. */
    canonicalPayloadHash?: string;
    /** The canonical request byte length before any transport normalization. */
    canonicalPayloadByteLength?: number;
    /** Added to v1 receipts for complete request-to-artifact lineage. */
    itemIds?: readonly string[];
    /** Added to v1 receipts for complete request-to-artifact lineage. */
    itemCount?: number;
    outputCount: number;
  }>;
}>;

export type ResultTransferFailureCode =
  | 'already_pending'
  | 'guard_missing'
  | 'guard_rejected'
  | 'snapshot_changed'
  | 'artifact_payload_changed'
  | 'cancelled'
  | 'clipboard_denied'
  | 'clipboard_unavailable'
  | 'blob_creation_failed'
  | 'download_failed'
  | 'artifact_failed'
  | 'artifact_result_mismatch'
  | 'receipt_storage_blocked'
  | 'receipt_storage_failed';

export type ResultTransferFailure = Readonly<{
  code: ResultTransferFailureCode;
  stage: 'guard' | 'artifact' | 'receipt';
  message: string;
  retryable: boolean;
}>;

export type ResultTransferReceiptWriteResult =
  | Readonly<{ status: 'stored' | 'duplicate' }>
  | Readonly<{ status: 'blocked'; message?: string }>
  | Readonly<{
      status: 'failed';
      message?: string;
      rollbackComplete?: boolean;
    }>;

export type ResultTransferSucceededOutcomeFor<
  TRequest extends AnyResultTransferRequest,
> = Readonly<{
  state: 'succeeded';
  request: TRequest;
  artifact: ResultTransferArtifactEffectResult;
  confirmation: ResultTransferSessionConfirmation | ResultTransferPersistentReceipt;
  receipt?: ResultTransferPersistentReceipt;
  receiptWriteStatus?: 'stored' | 'duplicate';
  receiptRetryAvailable: false;
}>;

export type ResultTransferFailedOutcomeFor<
  TRequest extends AnyResultTransferRequest,
> = Readonly<{
  state: 'failed';
  request: TRequest;
  failure: ResultTransferFailure;
  receiptRetryAvailable: false;
}>;

export type ResultTransferPartialLocalOutcomeFor<
  TRequest extends AnyResultTransferRequest,
> = Readonly<{
  state: 'partial_local';
  request: TRequest;
  artifact: ResultTransferArtifactEffectResult;
  failure: ResultTransferFailure;
  pendingReceipt?: ResultTransferPersistentReceipt;
  receiptRetryAvailable: boolean;
}>;

export type ResultTransferCancelledOutcomeFor<
  TRequest extends AnyResultTransferRequest,
> = Readonly<{
  state: 'cancelled';
  request: TRequest;
  failure: ResultTransferFailure;
  receiptRetryAvailable: false;
}>;

export type ResultTransferRunOutcomeFor<TRequest extends AnyResultTransferRequest> =
  | ResultTransferSucceededOutcomeFor<TRequest>
  | ResultTransferFailedOutcomeFor<TRequest>
  | ResultTransferPartialLocalOutcomeFor<TRequest>
  | ResultTransferCancelledOutcomeFor<TRequest>;

export type ResultTransferSucceededOutcome = ResultTransferSucceededOutcomeFor<ResultTransferRequest>;
export type ResultTransferFailedOutcome = ResultTransferFailedOutcomeFor<ResultTransferRequest>;
export type ResultTransferPartialLocalOutcome = ResultTransferPartialLocalOutcomeFor<ResultTransferRequest>;
export type ResultTransferCancelledOutcome = ResultTransferCancelledOutcomeFor<ResultTransferRequest>;
export type ResultTransferRunOutcome = ResultTransferRunOutcomeFor<ResultTransferRequest>;
export type ResultTransferBinaryRunOutcome = ResultTransferRunOutcomeFor<ResultTransferBinaryRequest>;

export type ResultTransferRevalidation = Readonly<{
  allowed: boolean;
  currentSnapshotHash?: string;
  currentArtifactPayloadHash?: string;
  reason?: string;
}>;

export class ResultTransferContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResultTransferContractError';
  }
}

export class ResultTransferEffectError extends Error {
  constructor(
    public readonly code: Exclude<
      ResultTransferFailureCode,
      | 'already_pending'
      | 'guard_missing'
      | 'guard_rejected'
      | 'snapshot_changed'
      | 'artifact_payload_changed'
      | 'artifact_result_mismatch'
      | 'receipt_storage_blocked'
      | 'receipt_storage_failed'
    >,
    message: string,
  ) {
    super(message);
    this.name = 'ResultTransferEffectError';
  }
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach((entry) => deepFreeze(entry));
  return Object.freeze(value);
}

type ResultTransferFingerprintPayload = string | ArrayBuffer | Uint8Array | readonly number[];

function validatedByteArray(value: readonly number[], field: string): number[] {
  if (!value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
    throw new ResultTransferContractError(`${field} must contain only byte values.`);
  }
  return [...value];
}

function cloneBinaryPayload(value: ArrayBuffer | Uint8Array): number[] {
  if (value instanceof ArrayBuffer) return Array.from(new Uint8Array(value.slice(0)));
  return Array.from(Uint8Array.from(value));
}

/** Returns an owned copy of the exact bytes represented by an immutable request. */
export function getResultTransferArtifactPayloadBytes(
  artifact: Pick<ResultTransferRequestArtifact, 'payload' | 'payloadEncoding'>,
): Uint8Array {
  if (artifact.payloadEncoding === 'octets') {
    if (!Array.isArray(artifact.payload)) {
      throw new ResultTransferContractError('Binary request payload must be a byte array.');
    }
    return Uint8Array.from(validatedByteArray(artifact.payload, 'artifact.payload'));
  }
  if (typeof artifact.payload !== 'string') {
    throw new ResultTransferContractError('UTF-8 request payload must be text.');
  }
  return new TextEncoder().encode(artifact.payload);
}

/** Stable v1 canonical-request fingerprint used only for confirmation and immediate revalidation. */
export function fingerprintResultTransferPayload(value: ResultTransferFingerprintPayload): string {
  let hash = 2166136261;
  if (typeof value === 'string') {
    // Preserve the original v1 UTF-16 code-unit fingerprint byte-for-byte.
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : value instanceof Uint8Array
      ? value
      : Uint8Array.from(validatedByteArray(value, 'payload'));
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function nonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new ResultTransferContractError(`${field} is required.`);
  return normalized;
}

function normalizedCount(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new ResultTransferContractError(`${field} must be a non-negative integer.`);
  }
  return value;
}

function uniqueStrings(values: readonly string[], field: string): string[] {
  const normalized = values.map((value) => nonEmpty(value, field));
  if (new Set(normalized).size !== normalized.length) {
    throw new ResultTransferContractError(`${field} must not contain duplicates.`);
  }
  return normalized;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function cloneScope(scope: EffectiveFlowProjectionScope): EffectiveFlowProjectionScope {
  if (scope.kind === 'flow') return { kind: 'flow' };
  if (scope.kind === 'item') return { kind: 'item', itemId: scope.itemId };
  return { kind: 'selected', itemIds: [...scope.itemIds] };
}

function cloneOmitted(manifest: EffectiveFlowProjectionManifest): ResultTransferOmitted {
  const scopeItemIds = manifest.scope.kind === 'flow'
    ? null
    : new Set(
        manifest.scope.kind === 'item'
          ? [manifest.scope.itemId]
          : manifest.scope.itemIds,
      );
  const inScope = (itemId: string) => scopeItemIds === null || scopeItemIds.has(itemId);
  const heldItemIds = uniqueStrings(manifest.heldItemIds, 'manifest.heldItemIds').filter(inScope);
  const unavailableItemIds = uniqueStrings(
    manifest.unavailableItemIds,
    'manifest.unavailableItemIds',
  ).filter(inScope);
  const excludedItemIds = uniqueStrings(
    manifest.excludedItemIds,
    'manifest.excludedItemIds',
  ).filter(inScope);
  const categorizedIds = [heldItemIds, unavailableItemIds, excludedItemIds].flat();
  if (new Set(categorizedIds).size !== categorizedIds.length) {
    throw new ResultTransferContractError(
      'An omitted Item ID must belong to exactly one omission category.',
    );
  }
  const fallbackReasonByItemId = new Map<string, string>([
    ...heldItemIds.map((itemId) => [itemId, 'The item needs more information before transfer.'] as const),
    ...unavailableItemIds.map(
      (itemId) => [itemId, 'The selected format cannot safely represent this item.'] as const,
    ),
    ...excludedItemIds.map((itemId) => [itemId, 'The item is excluded from this plan.'] as const),
  ]);
  const reasonsByItemId = Object.fromEntries(categorizedIds.map((itemId) => {
    const reason = manifest.reasonsByItemId[itemId]?.trim();
    return [itemId, reason || fallbackReasonByItemId.get(itemId)!];
  }));
  return {
    heldItemIds,
    unavailableItemIds,
    excludedItemIds,
    reasonsByItemId,
  };
}

type ResultTransferRequestOptions<TArtifact extends ResultTransferArtifactPayload> = Readonly<{
  requestId: string;
  route: ResultTransferRoute;
  savedPlanId?: string;
  createdAt: string;
  manifest: EffectiveFlowProjectionManifest;
  artifact: TArtifact;
}>;

export function buildResultTransferRequest(
  options: ResultTransferRequestOptions<ResultTransferTextArtifactPayload>,
): ResultTransferRequest;
export function buildResultTransferRequest(
  options: ResultTransferRequestOptions<ResultTransferBinaryArtifactPayload>,
): ResultTransferBinaryRequest;
export function buildResultTransferRequest(
  options: ResultTransferRequestOptions<ResultTransferArtifactPayload>,
): AnyResultTransferRequest {
  const requestId = nonEmpty(options.requestId, 'requestId');
  const createdAt = nonEmpty(options.createdAt, 'createdAt');
  const mediaType = nonEmpty(options.artifact.mediaType, 'artifact.mediaType');
  const itemIds = uniqueStrings(options.manifest.eligibleItemIds, 'manifest.eligibleItemIds');
  const artifactItemIds = uniqueStrings(options.artifact.itemIds, 'artifact.itemIds');
  const outputCount = normalizedCount(options.artifact.outputCount, 'artifact.outputCount');
  const projectionOutputCount = normalizedCount(
    options.manifest.counts.output,
    'manifest.counts.output',
  );
  const persistence: ResultTransferPersistence = options.route === 'saved_transfer'
    ? 'persistent_receipt'
    : 'session';
  const binaryPayload = options.artifact.payloadEncoding === 'octets';
  if (binaryPayload && typeof options.artifact.payload === 'string') {
    throw new ResultTransferContractError('Octet payloads require ArrayBuffer or Uint8Array bytes.');
  }
  if (!binaryPayload && typeof options.artifact.payload !== 'string') {
    throw new ResultTransferContractError('Binary payloads require payloadEncoding octets.');
  }
  if (binaryPayload && options.artifact.target !== 'local_file') {
    throw new ResultTransferContractError('Binary payloads can only target a local file.');
  }
  const ownedPayload = binaryPayload
    ? cloneBinaryPayload(options.artifact.payload as ArrayBuffer | Uint8Array)
    : options.artifact.payload as string;
  const payloadByteLength = binaryPayload
    ? ownedPayload.length
    : new TextEncoder().encode(ownedPayload as string).byteLength;

  if (!sameStrings(itemIds, artifactItemIds)) {
    throw new ResultTransferContractError(
      'Artifact Item IDs must exactly match the projection manifest eligible Item IDs.',
    );
  }
  if (options.manifest.counts.eligible !== itemIds.length) {
    throw new ResultTransferContractError('Manifest eligible count does not match its Item IDs.');
  }
  if (options.manifest.destination !== 'calendar' && projectionOutputCount !== outputCount) {
    throw new ResultTransferContractError(
      'Non-calendar artifact output count must exactly match the projection manifest output count.',
    );
  }
  if (
    options.manifest.destination === 'calendar'
    && itemIds.length > 0
    && outputCount === 0
  ) {
    throw new ResultTransferContractError(
      'Calendar artifact output count must be positive when eligible Items exist.',
    );
  }
  if (options.route === 'public_quick' && options.manifest.snapshotKind !== 'effective_authoring') {
    throw new ResultTransferContractError('Public quick results require an effective authoring snapshot.');
  }
  if (options.route === 'public_quick' && options.manifest.scope.kind !== 'flow') {
    throw new ResultTransferContractError('Public quick results cannot change scope.');
  }
  if (options.route === 'saved_transfer' && options.manifest.snapshotKind !== 'effective_execution') {
    throw new ResultTransferContractError('Saved transfers require an effective execution snapshot.');
  }
  const savedPlanId = options.savedPlanId?.trim();
  if (options.route === 'saved_transfer' && !savedPlanId) {
    throw new ResultTransferContractError('Saved transfers require a savedPlanId.');
  }
  if (options.route === 'public_quick' && savedPlanId) {
    throw new ResultTransferContractError('Public quick results cannot carry a savedPlanId.');
  }
  if (options.artifact.target === 'local_file' && !options.artifact.filename?.trim()) {
    throw new ResultTransferContractError('Local file results require a filename.');
  }

  const artifactCommon = {
    target: options.artifact.target,
    mediaType,
    ...(options.artifact.filename?.trim()
      ? { filename: options.artifact.filename.trim() }
      : {}),
    payloadHash: fingerprintResultTransferPayload(ownedPayload),
    payloadByteLength,
    itemIds: [...artifactItemIds],
    itemCount: artifactItemIds.length,
    outputCount,
  };
  const requestArtifact: ResultTransferRequestArtifact = binaryPayload
    ? {
        ...artifactCommon,
        target: 'local_file',
        payload: ownedPayload as number[],
        payloadEncoding: 'octets',
      }
    : {
        ...artifactCommon,
        payload: ownedPayload as string,
      };
  const requestBase = {
    schemaVersion: RESULT_TRANSFER_SCHEMA_VERSION,
    requestId,
    route: options.route,
    persistence,
    ...(savedPlanId ? { savedPlanId } : {}),
    createdAt,
    snapshot: {
      kind: options.manifest.snapshotKind,
      version: options.manifest.snapshotVersion,
      hash: options.manifest.snapshotHash,
      identity: { ...options.manifest.identity },
    },
    scope: cloneScope(options.manifest.scope),
    format: options.manifest.destination,
    artifactKind: options.manifest.artifactKind,
    itemIds: [...itemIds],
    itemCount: itemIds.length,
    projectionOutputCount,
    outputCount,
    countUnits: { ...RESULT_TRANSFER_COUNT_UNITS },
    omitted: cloneOmitted(options.manifest),
    oneWay: true as const,
    duplicateRisk: true as const,
  };
  const request: AnyResultTransferRequest = binaryPayload
    ? {
        ...requestBase,
        artifact: requestArtifact as ResultTransferBinaryRequestArtifact,
      }
    : {
        ...requestBase,
        artifact: requestArtifact as ResultTransferTextRequestArtifact,
      };
  return deepFreeze(request);
}

export function buildResultTransferArtifactSuccess(
  request: AnyResultTransferRequest,
  completedAt: string,
  transport: ResultTransferTransportIdentity,
): ResultTransferArtifactEffectResult {
  if (!isResultTransferTransportIdentity(transport)) {
    throw new ResultTransferContractError('Transport identity must describe the final artifact bytes.');
  }
  return deepFreeze({
    target: request.artifact.target,
    ...(request.artifact.filename ? { filename: request.artifact.filename } : {}),
    itemIds: [...request.artifact.itemIds],
    itemCount: request.artifact.itemCount,
    outputCount: request.artifact.outputCount,
    canonicalPayloadHash: request.artifact.payloadHash,
    canonicalPayloadByteLength: request.artifact.payloadByteLength,
    transport: { ...transport },
    completedAt: nonEmpty(completedAt, 'completedAt'),
  });
}

export async function buildResultTransferTransportIdentity(
  bytes: Uint8Array,
  policy: ResultTransferNewlinePolicy | Readonly<{ payloadEncoding: 'octets' }>,
): Promise<ResultTransferTransportIdentity> {
  if (!globalThis.crypto?.subtle) {
    throw new ResultTransferContractError('SHA-256 is unavailable in this runtime.');
  }
  const ownedBytes = Uint8Array.from(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', ownedBytes);
  const payloadHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const common = {
    payloadHashAlgorithm: 'sha256',
    payloadHash,
    payloadByteLength: ownedBytes.byteLength,
  } as const;
  return policy === 'preserve'
    ? deepFreeze({
        ...common,
        textEncoding: 'utf-8' as const,
        newlinePolicy: policy,
      })
    : deepFreeze({
        ...common,
        payloadEncoding: 'octets' as const,
      });
}

function resultTransferTransportMetadata(
  transport: ResultTransferTransportIdentity,
): Readonly<{
  payloadEncoding?: 'octets';
  textEncoding?: 'utf-8';
  newlinePolicy?: ResultTransferNewlinePolicy;
}> {
  return transport.payloadEncoding === 'octets'
    ? { payloadEncoding: 'octets' }
    : {
        textEncoding: transport.textEncoding,
        newlinePolicy: transport.newlinePolicy,
      };
}

function buildSessionConfirmation(
  request: AnyResultTransferRequest,
  artifact: ResultTransferArtifactEffectResult,
): ResultTransferSessionConfirmation {
  return deepFreeze({
    kind: 'session_only',
    requestId: request.requestId,
    completedAt: artifact.completedAt,
    snapshot: {
      kind: request.snapshot.kind,
      version: request.snapshot.version,
      hash: request.snapshot.hash,
    },
    snapshotHash: request.snapshot.hash,
    format: request.format,
    itemIds: [...request.itemIds],
    itemCount: request.itemCount,
    projectionOutputCount: request.projectionOutputCount,
    outputCount: request.outputCount,
    countUnits: { ...RESULT_TRANSFER_COUNT_UNITS },
    artifact: {
      target: request.artifact.target,
      mediaType: request.artifact.mediaType,
      ...(request.artifact.filename ? { filename: request.artifact.filename } : {}),
      payloadHash: artifact.transport.payloadHash,
      payloadByteLength: artifact.transport.payloadByteLength,
      payloadHashAlgorithm: artifact.transport.payloadHashAlgorithm,
      ...resultTransferTransportMetadata(artifact.transport),
      canonicalPayloadHash: artifact.canonicalPayloadHash,
      canonicalPayloadByteLength: artifact.canonicalPayloadByteLength,
      itemIds: [...request.artifact.itemIds],
      itemCount: request.artifact.itemCount,
      outputCount: request.artifact.outputCount,
    },
  });
}

function buildPersistentReceipt(
  request: AnyResultTransferRequest,
  artifact: ResultTransferArtifactEffectResult,
): ResultTransferPersistentReceipt {
  if (request.route !== 'saved_transfer') {
    throw new ResultTransferContractError('Only saved transfers can create persistent receipts.');
  }
  const binaryPayload = request.artifact.payloadEncoding === 'octets';
  return deepFreeze({
    schemaVersion: RESULT_TRANSFER_RECEIPT_SCHEMA_VERSION,
    kind: 'persistent_receipt',
    receiptId: request.requestId,
    requestId: request.requestId,
    route: 'saved_transfer',
    savedPlanId: nonEmpty(request.savedPlanId ?? '', 'savedPlanId'),
    outcome: 'success',
    createdAt: request.createdAt,
    completedAt: artifact.completedAt,
    snapshot: {
      ...request.snapshot,
      identity: { ...request.snapshot.identity },
    },
    scope: cloneScope(request.scope),
    format: request.format,
    artifactKind: request.artifactKind,
    itemIds: [...request.itemIds],
    itemCount: request.itemCount,
    projectionOutputCount: request.projectionOutputCount,
    outputCount: request.outputCount,
    countUnits: { ...RESULT_TRANSFER_COUNT_UNITS },
    omitted: {
      heldItemIds: [...request.omitted.heldItemIds],
      unavailableItemIds: [...request.omitted.unavailableItemIds],
      excludedItemIds: [...request.omitted.excludedItemIds],
      reasonsByItemId: { ...request.omitted.reasonsByItemId },
    },
    oneWay: true,
    duplicateRisk: true,
    artifact: {
      target: request.artifact.target,
      mediaType: request.artifact.mediaType,
      ...(request.artifact.filename ? { filename: request.artifact.filename } : {}),
      payloadHash: artifact.transport.payloadHash,
      payloadByteLength: artifact.transport.payloadByteLength,
      ...(binaryPayload ? {} : {
        payloadHashAlgorithm: artifact.transport.payloadHashAlgorithm,
        ...resultTransferTransportMetadata(artifact.transport),
        canonicalPayloadHash: artifact.canonicalPayloadHash,
        canonicalPayloadByteLength: artifact.canonicalPayloadByteLength,
      }),
      itemIds: [...request.artifact.itemIds],
      itemCount: request.artifact.itemCount,
      outputCount: request.artifact.outputCount,
    },
  });
}

function failure(
  code: ResultTransferFailureCode,
  stage: ResultTransferFailure['stage'],
  message: string,
  retryable: boolean,
): ResultTransferFailure {
  return deepFreeze({ code, stage, message, retryable });
}

function classifyArtifactError(error: unknown): ResultTransferFailure {
  if (error instanceof ResultTransferEffectError) {
    return failure(
      error.code,
      'artifact',
      error.message,
      error.code !== 'cancelled',
    );
  }
  return failure(
    'artifact_failed',
    'artifact',
    error instanceof Error ? error.message : 'The local result could not be created.',
    true,
  );
}

async function artifactMatchesRequest(
  request: AnyResultTransferRequest,
  artifact: ResultTransferArtifactEffectResult,
): Promise<boolean> {
  const structuralMatch = artifact.target === request.artifact.target
    && artifact.itemCount === request.itemCount
    && sameStrings(artifact.itemIds, request.itemIds)
    && artifact.outputCount === request.outputCount
    && artifact.canonicalPayloadHash === request.artifact.payloadHash
    && artifact.canonicalPayloadByteLength === request.artifact.payloadByteLength
    && isResultTransferTransportIdentity(artifact.transport)
    && (artifact.filename ?? '') === (request.artifact.filename ?? '');
  if (!structuralMatch) return false;

  try {
    const payloadEncoding = request.artifact.payloadEncoding === 'octets'
      ? 'octets'
      : 'utf-8';
    const expectedTransport = await buildResultTransferTransportIdentity(
      getResultTransferArtifactPayloadBytes(request.artifact),
      payloadEncoding === 'octets' ? { payloadEncoding: 'octets' } : 'preserve',
    );
    return artifact.transport.payloadHash === expectedTransport.payloadHash
      && artifact.transport.payloadByteLength === expectedTransport.payloadByteLength
      && (artifact.transport.payloadEncoding ?? 'utf-8') === payloadEncoding;
  } catch {
    return false;
  }
}

export type ResultTransferRunDependencies<
  TRequest extends AnyResultTransferRequest = ResultTransferRequest,
> = Readonly<{
  performArtifact: (
    request: TRequest,
  ) => ResultTransferArtifactEffectResult | Promise<ResultTransferArtifactEffectResult>;
  persistReceipt?: (
    receipt: ResultTransferPersistentReceipt,
  ) => ResultTransferReceiptWriteResult | Promise<ResultTransferReceiptWriteResult>;
  revalidate?: (
    request: TRequest,
  ) => ResultTransferRevalidation | Promise<ResultTransferRevalidation>;
  signal?: AbortSignal;
}>;

export type ResultTransferReceiptRetryDependencies = Readonly<{
  persistReceipt: (
    receipt: ResultTransferPersistentReceipt,
  ) => ResultTransferReceiptWriteResult | Promise<ResultTransferReceiptWriteResult>;
}>;

export type ResultTransferRunner = Readonly<{
  isPending(requestId: string): boolean;
  run<TRequest extends AnyResultTransferRequest>(
    request: TRequest,
    dependencies: ResultTransferRunDependencies<TRequest>,
  ): Promise<ResultTransferRunOutcomeFor<TRequest>>;
  retryReceipt<TRequest extends AnyResultTransferRequest>(
    partial: ResultTransferPartialLocalOutcomeFor<TRequest>,
    dependencies: ResultTransferReceiptRetryDependencies,
  ): Promise<ResultTransferRunOutcomeFor<TRequest>>;
}>;

async function writeReceipt(
  receipt: ResultTransferPersistentReceipt,
  persistReceipt: (
    (receipt: ResultTransferPersistentReceipt) =>
      ResultTransferReceiptWriteResult | Promise<ResultTransferReceiptWriteResult>
  ) | undefined,
): Promise<
  | Readonly<{ ok: true; status: 'stored' | 'duplicate' }>
  | Readonly<{ ok: false; failure: ResultTransferFailure }>
> {
  if (!persistReceipt) {
    return {
      ok: false,
      failure: failure(
        'receipt_storage_failed',
        'receipt',
        'Persistent receipt storage is unavailable.',
        true,
      ),
    };
  }
  try {
    const lockedWrite = await withStorageWriteLock(
      FLOW_EXPORT_RECEIPT_WRITE_LOCK,
      () => persistReceipt(receipt),
    );
    if (!lockedWrite.ok) {
      const unavailable = lockedWrite.reason === 'unavailable' || lockedWrite.reason === 'lock_failed';
      return {
        ok: false,
        failure: failure(
          unavailable ? 'receipt_storage_blocked' : 'receipt_storage_failed',
          'receipt',
          unavailable
            ? 'Persistent receipt storage cannot be serialized safely in this browser.'
            : lockedWrite.error instanceof Error
              ? lockedWrite.error.message
              : 'The persistent receipt write ended in an unknown state.',
          false,
        ),
      };
    }
    const result = lockedWrite.value;
    if (result.status === 'stored' || result.status === 'duplicate') {
      return { ok: true, status: result.status };
    }
    const resultMessage = 'message' in result ? result.message : undefined;
    const rollbackIndeterminate = result.status === 'failed' && result.rollbackComplete === false;
    return {
      ok: false,
      failure: failure(
        result.status === 'blocked' ? 'receipt_storage_blocked' : 'receipt_storage_failed',
        'receipt',
        resultMessage ?? 'The persistent receipt could not be stored.',
        result.status !== 'blocked' && !rollbackIndeterminate,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      failure: failure(
        'receipt_storage_failed',
        'receipt',
        error instanceof Error ? error.message : 'The persistent receipt could not be stored.',
        true,
      ),
    };
  }
}

export function createResultTransferRunner(): ResultTransferRunner {
  const pendingRequestIds = new Set<string>();

  return {
    isPending(requestId) {
      return pendingRequestIds.has(requestId);
    },
    async run(request, dependencies) {
      if (pendingRequestIds.has(request.requestId)) {
        return deepFreeze({
          state: 'failed',
          request,
          failure: failure(
            'already_pending',
            'guard',
            'The same result request is already running.',
            false,
          ),
          receiptRetryAvailable: false,
        });
      }
      if (dependencies.signal?.aborted) {
        return deepFreeze({
          state: 'cancelled',
          request,
          failure: failure('cancelled', 'guard', 'The result request was cancelled.', false),
          receiptRetryAvailable: false,
        });
      }

      pendingRequestIds.add(request.requestId);
      try {
        if (request.route === 'public_quick' && !dependencies.revalidate) {
          return deepFreeze({
            state: 'failed',
            request,
            failure: failure(
              'guard_missing',
              'guard',
              'Public quick results must be revalidated immediately before the local effect.',
              false,
            ),
            receiptRetryAvailable: false,
          });
        }
        if (dependencies.revalidate) {
          const revalidation = await dependencies.revalidate(request);
          if (!revalidation.allowed) {
            return deepFreeze({
              state: 'failed',
              request,
              failure: failure(
                'guard_rejected',
                'guard',
                revalidation.reason ?? 'The result is no longer eligible.',
                false,
              ),
              receiptRetryAvailable: false,
            });
          }
          if (
            revalidation.currentSnapshotHash !== undefined
            && revalidation.currentSnapshotHash !== request.snapshot.hash
          ) {
            return deepFreeze({
              state: 'failed',
              request,
              failure: failure(
                'snapshot_changed',
                'guard',
                'The plan changed after confirmation. Confirm the result again.',
                false,
              ),
              receiptRetryAvailable: false,
            });
          }
          if (
            revalidation.currentArtifactPayloadHash !== undefined
            && revalidation.currentArtifactPayloadHash !== request.artifact.payloadHash
          ) {
            return deepFreeze({
              state: 'failed',
              request,
              failure: failure(
                'artifact_payload_changed',
                'guard',
                'The local result payload changed after confirmation. Confirm the result again.',
                false,
              ),
              receiptRetryAvailable: false,
            });
          }
        }

        let artifact: ResultTransferArtifactEffectResult;
        try {
          artifact = deepFreeze(await dependencies.performArtifact(request));
        } catch (error) {
          const artifactFailure = classifyArtifactError(error);
          if (artifactFailure.code === 'cancelled') {
            return deepFreeze({
              state: 'cancelled',
              request,
              failure: artifactFailure,
              receiptRetryAvailable: false,
            });
          }
          return deepFreeze({
            state: 'failed',
            request,
            failure: artifactFailure,
            receiptRetryAvailable: false,
          });
        }

        if (!await artifactMatchesRequest(request, artifact)) {
          return deepFreeze({
            state: 'partial_local',
            request,
            artifact,
            failure: failure(
              'artifact_result_mismatch',
              'artifact',
              'The local artifact was created, but its identity or count did not match the confirmed request.',
              false,
            ),
            receiptRetryAvailable: false,
          });
        }

        if (request.persistence === 'session') {
          return deepFreeze({
            state: 'succeeded',
            request,
            artifact,
            confirmation: buildSessionConfirmation(request, artifact),
            receiptRetryAvailable: false,
          });
        }

        const receipt = buildPersistentReceipt(request, artifact);
        const receiptWrite = await writeReceipt(receipt, dependencies.persistReceipt);
        if (!receiptWrite.ok) {
          return deepFreeze({
            state: 'partial_local',
            request,
            artifact,
            pendingReceipt: receipt,
            failure: receiptWrite.failure,
            receiptRetryAvailable: receiptWrite.failure.retryable,
          });
        }
        return deepFreeze({
          state: 'succeeded',
          request,
          artifact,
          confirmation: receipt,
          receipt,
          receiptWriteStatus: receiptWrite.status,
          receiptRetryAvailable: false,
        });
      } finally {
        pendingRequestIds.delete(request.requestId);
      }
    },
    async retryReceipt(partial, dependencies) {
      if (!partial.pendingReceipt || !partial.receiptRetryAvailable) return partial;
      const requestId = partial.request.requestId;
      if (pendingRequestIds.has(requestId)) {
        return deepFreeze({
          state: 'partial_local',
          request: partial.request,
          artifact: partial.artifact,
          pendingReceipt: partial.pendingReceipt,
          failure: failure(
            'already_pending',
            'receipt',
            'The same receipt request is already running.',
            false,
          ),
          receiptRetryAvailable: true,
        });
      }

      pendingRequestIds.add(requestId);
      try {
        const receiptWrite = await writeReceipt(
          partial.pendingReceipt,
          dependencies.persistReceipt,
        );
        if (!receiptWrite.ok) {
          return deepFreeze({
            ...partial,
            failure: receiptWrite.failure,
            receiptRetryAvailable: receiptWrite.failure.retryable,
          });
        }
        return deepFreeze({
          state: 'succeeded',
          request: partial.request,
          artifact: partial.artifact,
          confirmation: partial.pendingReceipt,
          receipt: partial.pendingReceipt,
          receiptWriteStatus: receiptWrite.status,
          receiptRetryAvailable: false,
        });
      } finally {
        pendingRequestIds.delete(requestId);
      }
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isScope(value: unknown): value is EffectiveFlowProjectionScope {
  if (!isRecord(value)) return false;
  if (value.kind === 'flow') return true;
  if (value.kind === 'item') return typeof value.itemId === 'string';
  return value.kind === 'selected' && isStringArray(value.itemIds);
}

function isOmitted(value: unknown): value is ResultTransferOmitted {
  return isRecord(value)
    && isStringArray(value.heldItemIds)
    && isStringArray(value.unavailableItemIds)
    && isStringArray(value.excludedItemIds)
    && isRecord(value.reasonsByItemId)
    && Object.values(value.reasonsByItemId).every((entry) => typeof entry === 'string');
}

function isCountUnits(value: unknown): value is ResultTransferCountUnits {
  return isRecord(value)
    && value.itemCount === RESULT_TRANSFER_COUNT_UNITS.itemCount
    && value.projectionOutputCount === RESULT_TRANSFER_COUNT_UNITS.projectionOutputCount
    && value.outputCount === RESULT_TRANSFER_COUNT_UNITS.outputCount;
}

function hasValidOptionalArtifactItemLineage(
  artifact: Record<string, unknown>,
  receiptItemIds: readonly string[],
  receiptItemCount: number,
): boolean {
  const hasItemIds = artifact.itemIds !== undefined;
  const hasItemCount = artifact.itemCount !== undefined;
  if (!hasItemIds && !hasItemCount) return true;
  return hasItemIds
    && hasItemCount
    && isStringArray(artifact.itemIds)
    && Number.isInteger(artifact.itemCount)
    && artifact.itemCount === receiptItemCount
    && sameStrings(artifact.itemIds, receiptItemIds);
}

function isResultTransferTransportIdentity(
  value: unknown,
): value is ResultTransferTransportIdentity {
  if (!isRecord(value)
    || value.payloadHashAlgorithm !== 'sha256'
    || typeof value.payloadHash !== 'string'
    || !/^[0-9a-f]{64}$/u.test(value.payloadHash)
    || !Number.isInteger(value.payloadByteLength)
    || Number(value.payloadByteLength) < 0
  ) {
    return false;
  }
  if (value.payloadEncoding === 'octets') {
    return value.textEncoding === undefined && value.newlinePolicy === undefined;
  }
  return value.payloadEncoding === undefined
    && value.textEncoding === 'utf-8'
    && value.newlinePolicy === 'preserve';
}

function hasValidOptionalTransportLineage(artifact: Record<string, unknown>): boolean {
  const commonFields = [
    'payloadHashAlgorithm',
    'canonicalPayloadHash',
    'canonicalPayloadByteLength',
  ] as const;
  const metadataFields = ['payloadEncoding', 'textEncoding', 'newlinePolicy'] as const;
  const commonPresentCount = commonFields
    .filter((field) => artifact[field] !== undefined).length;
  const metadataPresentCount = metadataFields
    .filter((field) => artifact[field] !== undefined).length;
  if (commonPresentCount === 0 && metadataPresentCount === 0) return true;
  if (commonPresentCount !== commonFields.length) return false;

  const transportIdentity = {
    payloadHashAlgorithm: artifact.payloadHashAlgorithm,
    payloadHash: artifact.payloadHash,
    payloadByteLength: artifact.payloadByteLength,
    ...(artifact.payloadEncoding !== undefined
      ? { payloadEncoding: artifact.payloadEncoding }
      : {}),
    ...(artifact.textEncoding !== undefined
      ? { textEncoding: artifact.textEncoding }
      : {}),
    ...(artifact.newlinePolicy !== undefined
      ? { newlinePolicy: artifact.newlinePolicy }
      : {}),
  };
  return isResultTransferTransportIdentity(transportIdentity)
    && typeof artifact.canonicalPayloadHash === 'string'
    && /^[0-9a-f]{8}$/u.test(artifact.canonicalPayloadHash)
    && Number.isInteger(artifact.canonicalPayloadByteLength)
    && Number(artifact.canonicalPayloadByteLength) >= 0;
}

export function isResultTransferPersistentReceipt(
  value: unknown,
): value is ResultTransferPersistentReceipt {
  if (!isRecord(value) || value.schemaVersion !== RESULT_TRANSFER_RECEIPT_SCHEMA_VERSION) {
    return false;
  }
  const snapshot = value.snapshot;
  const artifact = value.artifact;
  if (!isRecord(snapshot) || !isRecord(snapshot.identity) || !isRecord(artifact)) return false;
  const identity = snapshot.identity;
  if (
    value.kind !== 'persistent_receipt'
    || typeof value.savedPlanId !== 'string'
    || !value.savedPlanId.trim()
    || typeof value.receiptId !== 'string'
    || !value.receiptId
    || value.requestId !== value.receiptId
    || value.route !== 'saved_transfer'
    || value.outcome !== 'success'
    || typeof value.createdAt !== 'string'
    || typeof value.completedAt !== 'string'
    || snapshot.kind !== 'effective_execution'
    || typeof snapshot.version !== 'string'
    || typeof snapshot.hash !== 'string'
    || !['flowId', 'flowSlug', 'sourceVersion', 'personalVersion', 'executionVersion']
      .every((key) => typeof identity[key] === 'string')
    || !isScope(value.scope)
    || !['calendar', 'checklist', 'sheet', 'memo'].includes(String(value.format))
    || !['calendar_ics', 'portable_checklist', 'tabular_sheet', 'portable_memo']
      .includes(String(value.artifactKind))
    || !isStringArray(value.itemIds)
    || !Number.isInteger(value.itemCount)
    || value.itemCount !== value.itemIds.length
    || !Number.isInteger(value.projectionOutputCount)
    || Number(value.projectionOutputCount) < 0
    || !Number.isInteger(value.outputCount)
    || Number(value.outputCount) < 0
    || (value.countUnits !== undefined && !isCountUnits(value.countUnits))
    || !isOmitted(value.omitted)
    || value.oneWay !== true
    || value.duplicateRisk !== true
    || !['clipboard', 'local_file'].includes(String(artifact.target))
    || typeof artifact.mediaType !== 'string'
    || typeof artifact.payloadHash !== 'string'
    || !Number.isInteger(artifact.payloadByteLength)
    || Number(artifact.payloadByteLength) < 0
    || !Number.isInteger(artifact.outputCount)
    || Number(artifact.outputCount) < 0
    || artifact.outputCount !== value.outputCount
    || !hasValidOptionalArtifactItemLineage(
      artifact,
      value.itemIds as string[],
      Number(value.itemCount),
    )
    || !hasValidOptionalTransportLineage(artifact)
    || (value.format !== 'calendar' && value.projectionOutputCount !== value.outputCount)
    || (value.format === 'calendar' && value.itemCount > 0 && value.outputCount === 0)
  ) {
    return false;
  }
  return artifact.filename === undefined || typeof artifact.filename === 'string';
}
