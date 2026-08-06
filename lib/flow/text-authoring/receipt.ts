import type { TextAuthoringDocument } from './types';
import { evaluateAuthoringWritePolicy } from './review-policy';
import { validateTextAuthoringDocument } from './validation';
import type {
  AuthoringArtifactKind,
  AuthoringArtifactLoss,
  AuthoringArtifactPreflight,
  AuthoringArtifactProjection,
  AuthoringArtifactScope,
} from './artifact-projection';

export type TextAuthoringReceiptReviewState = {
  requiredGateIds: string[];
  evidenceRecordedGateIds: string[];
  personalOnlyGateIds: string[];
};

export type TextAuthoringReceiptSourceState = {
  status:
    | 'current'
    | 'source_updated'
    | 'conflict_source_vs_user'
    | 'unknown';
  activeSnapshotId?: string;
  incomingSnapshotId?: string;
  openChangeCount: number;
};

export type TextAuthoringSaveReceipt = {
  receiptId: string;
  kind: 'draft_saved';
  storage: 'local_only';
  draftId: string;
  documentId: string;
  revisionId: string;
  ownership: TextAuthoringDocument['ownership'];
  title: string;
  stepCount: number;
  itemCount: number;
  artifact: AuthoringArtifactKind;
  reviewState: TextAuthoringReceiptReviewState;
  sourceState: TextAuthoringReceiptSourceState;
  sourcePreserved: boolean;
  validationIssueCount: number;
  savedAt: string;
};

export type TextAuthoringExportReceipt = {
  receiptId: string;
  kind: 'export_completed';
  preflightId: string;
  documentId: string;
  artifact: AuthoringArtifactKind;
  scope: AuthoringArtifactScope;
  format: string;
  count: number;
  itemIds: string[];
  firstItems: string[];
  omittedCount: number;
  dateRange?: {
    start: string;
    end: string;
  };
  losses: AuthoringArtifactLoss[];
  lossCount: number;
  reviewState: TextAuthoringReceiptReviewState;
  sourceState: TextAuthoringReceiptSourceState;
  sourcePreserved: boolean;
  validationIssueCount?: number;
  exportedAt: string;
};

export type CreateSaveReceiptOptions = {
  draftId?: string;
  receiptId?: string;
  savedAt?: string;
};

export type CreateExportReceiptOptions = {
  format: string;
  document?: TextAuthoringDocument;
  receiptId?: string;
  exportedAt?: string;
};

export type PreflightReceiptParity = {
  matches: boolean;
  differences: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function revisionId(document: TextAuthoringDocument): string {
  if (isRecord(document.revision) && typeof document.revision.revisionId === 'string') {
    return document.revision.revisionId;
  }
  return `${document.documentId}:revision`;
}

function newReceiptId(prefix: string): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return randomUuid
    ? `${prefix}-${randomUuid}`
    : `${prefix}-${Date.now().toString(36)}`;
}

function receiptReviewState(
  document?: TextAuthoringDocument,
): TextAuthoringReceiptReviewState {
  const gates = document?.reviewGates ?? [];
  return {
    requiredGateIds: gates
      .filter((gate) => gate.status === 'required')
      .map((gate) => gate.gateId),
    evidenceRecordedGateIds: gates
      .filter((gate) => gate.status === 'evidence_recorded')
      .map((gate) => gate.gateId),
    personalOnlyGateIds: gates
      .filter((gate) => gate.status === 'personal_only')
      .map((gate) => gate.gateId),
  };
}

function receiptSourceState(
  document?: TextAuthoringDocument,
): TextAuthoringReceiptSourceState {
  const state = document?.sourceState;
  if (!state) return { status: 'unknown', openChangeCount: 0 };
  if (state.status === 'current') {
    return {
      status: state.status,
      activeSnapshotId: state.active.snapshotId,
      openChangeCount: 0,
    };
  }
  return {
    status: state.status,
    activeSnapshotId: state.active.snapshotId,
    incomingSnapshotId: state.incoming.snapshot.snapshotId,
    openChangeCount: state.changes.filter(
      (change) => change.state === 'open',
    ).length,
  };
}

export function createSaveReceipt(
  document: TextAuthoringDocument,
  projection: AuthoringArtifactProjection,
  options: CreateSaveReceiptOptions = {},
): TextAuthoringSaveReceipt {
  const validation = validateTextAuthoringDocument(document);
  return {
    receiptId: options.receiptId ?? newReceiptId('save-receipt'),
    kind: 'draft_saved',
    storage: 'local_only',
    draftId: options.draftId ?? document.documentId,
    documentId: document.documentId,
    revisionId: revisionId(document),
    ownership: document.ownership,
    title: projection.title,
    stepCount: document.parseResult.canonical.steps.length,
    itemCount: projection.counts.included,
    artifact: projection.primaryArtifact,
    reviewState: receiptReviewState(document),
    sourceState: receiptSourceState(document),
    sourcePreserved: validation.valid,
    validationIssueCount: validation.issues.length,
    savedAt: options.savedAt ?? new Date().toISOString(),
  };
}

export function createExportReceipt(
  preflight: AuthoringArtifactPreflight,
  options: CreateExportReceiptOptions,
): TextAuthoringExportReceipt {
  if (!preflight.formats.includes(options.format)) {
    throw new Error(
      `${preflight.artifact} artifact does not support ${options.format} export`,
    );
  }
  if (!preflight.eligible) {
    throw new Error(`${preflight.artifact} artifact has no eligible rows to export`);
  }
  const document = options.document;
  if (document && document.documentId !== preflight.documentId) {
    throw new Error('Export document does not match the preflight document.');
  }
  if (document) {
    const policy = evaluateAuthoringWritePolicy(document, 'export_file');
    if (!policy.allowed) {
      throw new Error(
        `Export blocked: ${policy.blockers.map((blocker) => blocker.code).join(', ')}`,
      );
    }
  }
  const validation = document
    ? validateTextAuthoringDocument(document)
    : undefined;
  return {
    receiptId: options.receiptId ?? newReceiptId('export-receipt'),
    kind: 'export_completed',
    preflightId: preflight.preflightId,
    documentId: preflight.documentId,
    artifact: preflight.artifact,
    scope: preflight.scope,
    format: options.format,
    count: preflight.count,
    itemIds: [...preflight.itemIds],
    firstItems: [...preflight.firstItems],
    omittedCount: preflight.omittedCount,
    ...(preflight.dateRange ? { dateRange: { ...preflight.dateRange } } : {}),
    losses: preflight.losses.map((loss) => ({ ...loss })),
    lossCount: preflight.lossCount,
    reviewState: receiptReviewState(document),
    sourceState: receiptSourceState(document),
    sourcePreserved: Boolean(validation?.valid && preflight.sourcePreserved),
    ...(validation
      ? { validationIssueCount: validation.issues.length }
      : {}),
    exportedAt: options.exportedAt ?? new Date().toISOString(),
  };
}

export function checkPreflightReceiptParity(
  preflight: AuthoringArtifactPreflight,
  receipt: TextAuthoringExportReceipt,
): PreflightReceiptParity {
  const differences: string[] = [];
  if (receipt.preflightId !== preflight.preflightId) differences.push('preflightId');
  if (receipt.documentId !== preflight.documentId) differences.push('documentId');
  if (receipt.artifact !== preflight.artifact) differences.push('artifact');
  if (receipt.scope !== preflight.scope) differences.push('scope');
  if (receipt.count !== preflight.count) differences.push('count');
  if (receipt.omittedCount !== preflight.omittedCount) differences.push('omittedCount');
  if (receipt.lossCount !== preflight.lossCount) differences.push('lossCount');
  if (JSON.stringify(receipt.itemIds) !== JSON.stringify(preflight.itemIds)) {
    differences.push('itemIds');
  }
  if (JSON.stringify(receipt.firstItems) !== JSON.stringify(preflight.firstItems)) {
    differences.push('firstItems');
  }
  if (JSON.stringify(receipt.dateRange) !== JSON.stringify(preflight.dateRange)) {
    differences.push('dateRange');
  }
  if (JSON.stringify(receipt.losses) !== JSON.stringify(preflight.losses)) {
    differences.push('losses');
  }
  return {
    matches: differences.length === 0,
    differences,
  };
}

export function assertPreflightReceiptParity(
  preflight: AuthoringArtifactPreflight,
  receipt: TextAuthoringExportReceipt,
): true {
  const result = checkPreflightReceiptParity(preflight, receipt);
  if (!result.matches) {
    throw new Error(`Preflight/receipt mismatch: ${result.differences.join(', ')}`);
  }
  return true;
}
