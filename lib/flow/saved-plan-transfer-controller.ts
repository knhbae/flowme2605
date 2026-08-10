import type { EffectiveFlowProjectionManifest } from './effective-flow-contract';
import type { FlowExportDestination } from './export-scope';
import {
  buildSavedPlanTransferArtifact,
  buildSavedPlanTransferPreview,
  serializeSavedPlanTransferPreviewSnapshot,
  type SavedPlanTransferArtifact,
  type SavedPlanTransferInput,
} from './saved-plan-transfer-codec';
import {
  buildResultTransferRequest,
  fingerprintResultTransferPayload,
  type AnyResultTransferRequest,
  type ResultTransferRevalidation,
} from './result-transfer';

export const APPROVED_SAVED_PLAN_TRANSFER_REVALIDATION_REASON =
  '확인한 범위나 결과가 바뀌었어요. 다시 확인해 주세요.';

export type ApprovedSavedPlanTransferProjection = Readonly<{
  manifest: EffectiveFlowProjectionManifest;
  transferInput: SavedPlanTransferInput;
  /** Required only when the generated artifact is a local download. */
  filename?: string;
}>;

export type ApprovedSavedPlanTransferPrepareInput = Readonly<{
  requestId: string;
  savedPlanId: string;
  createdAt: string;
  projection: ApprovedSavedPlanTransferProjection;
}>;

export type ApprovedSavedPlanTransferPrepared = Readonly<{
  request: AnyResultTransferRequest;
  previewSnapshot: string;
}>;

export type ApprovedSavedPlanTransferArtifactBuilder = (
  input: SavedPlanTransferInput,
  destination: FlowExportDestination,
) => Promise<SavedPlanTransferArtifact>;

export type ApprovedSavedPlanTransferControllerPorts = Readonly<{
  /** Artifact generation is injectable; clipboard/file effects are intentionally not ports here. */
  buildArtifact?: ApprovedSavedPlanTransferArtifactBuilder;
}>;

export type ApprovedSavedPlanTransferRevalidationInput = Readonly<{
  request: AnyResultTransferRequest;
  confirmedPreviewSnapshot: string;
  currentManifest: EffectiveFlowProjectionManifest;
  currentTransferInput: SavedPlanTransferInput;
}>;

/**
 * Builds the immutable approved saved-plan request from one confirmed projection.
 * This owns deterministic preview capture and request construction, but never runs
 * a clipboard/download effect and never persists a receipt.
 */
export async function prepareApprovedSavedPlanTransfer(
  input: ApprovedSavedPlanTransferPrepareInput,
  ports: ApprovedSavedPlanTransferControllerPorts = {},
): Promise<ApprovedSavedPlanTransferPrepared> {
  const { manifest, transferInput, filename } = input.projection;
  const destination = manifest.destination;
  const previewSnapshot = serializeSavedPlanTransferPreviewSnapshot(
    buildSavedPlanTransferPreview(transferInput, destination),
  );
  const artifact = await (ports.buildArtifact ?? buildSavedPlanTransferArtifact)(
    transferInput,
    destination,
  );
  const commonArtifact = {
    target: artifact.effect === 'download' ? 'local_file' as const : 'clipboard' as const,
    mediaType: artifact.mediaType,
    ...(artifact.effect === 'download' ? { filename } : {}),
    itemIds: artifact.itemIds,
    outputCount: artifact.outputCount,
  };
  const request = typeof artifact.payload === 'string'
    ? buildResultTransferRequest({
        requestId: input.requestId,
        route: 'saved_transfer',
        savedPlanId: input.savedPlanId,
        createdAt: input.createdAt,
        manifest,
        artifact: {
          ...commonArtifact,
          payload: artifact.payload,
        },
      })
    : buildResultTransferRequest({
        requestId: input.requestId,
        route: 'saved_transfer',
        savedPlanId: input.savedPlanId,
        createdAt: input.createdAt,
        manifest,
        artifact: {
          ...commonArtifact,
          target: 'local_file',
          payload: artifact.payload,
          payloadEncoding: 'octets',
        },
      });

  return Object.freeze({ request, previewSnapshot });
}

/**
 * Rebuilds only the deterministic projection preview and decides whether the
 * already-confirmed request is still safe to execute. Artifact effects and
 * receipt persistence remain responsibilities of the caller/runner.
 */
export function revalidateApprovedSavedPlanTransfer(
  input: ApprovedSavedPlanTransferRevalidationInput,
): ResultTransferRevalidation {
  const currentPreview = buildSavedPlanTransferPreview(
    input.currentTransferInput,
    input.request.format,
  );
  const currentPreviewSnapshot = serializeSavedPlanTransferPreviewSnapshot(currentPreview);

  return Object.freeze({
    allowed: input.currentManifest.snapshotHash === input.request.snapshot.hash
      && currentPreviewSnapshot === input.confirmedPreviewSnapshot
      && currentPreview.itemIds.join('|') === input.request.itemIds.join('|')
      && currentPreview.outputCount === input.request.outputCount,
    currentSnapshotHash: input.currentManifest.snapshotHash,
    ...(currentPreview.body.kind === 'text'
      ? {
          currentArtifactPayloadHash: fingerprintResultTransferPayload(
            currentPreview.body.content,
          ),
        }
      : {}),
    reason: APPROVED_SAVED_PLAN_TRANSFER_REVALIDATION_REASON,
  });
}
