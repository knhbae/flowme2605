import { cloneAuthoringValue, stableAuthoringId } from './identity';
import { authoringIssueBlocksDraft } from './issue-state';
import type {
  AuthoringReviewGate,
  AuthoringReviewRequirement,
  AuthoringWriteAction,
  AuthoringWriteBlocker,
  AuthoringWritePolicyResult,
  TextAuthoringDocument,
} from './types';

export type ForkAuthoringDocumentToPersonalOptions = {
  documentId: string;
  now?: string;
};

function activeSourceSnapshotId(document: TextAuthoringDocument): string {
  return document.sourceState?.active.snapshotId
    ?? stableAuthoringId(
      'source-snapshot',
      document.documentId,
      document.parseResult.parseResultId,
    );
}

export function createAuthoringReviewGates(
  document: TextAuthoringDocument,
  requirements: AuthoringReviewRequirement[] = [],
): AuthoringReviewGate[] {
  const sourceRowIds = document.parseResult.canonical.sourceRows.map(
    (row) => row.sourceRowId,
  );
  const sourceSnapshotId = activeSourceSnapshotId(document);
  const knownSourceRowIds = new Set(sourceRowIds);
  const gates: AuthoringReviewGate[] = requirements.map((requirement) => {
    const gateSourceRowIds = requirement.sourceRowIds
      ? [...new Set(requirement.sourceRowIds)]
      : [...sourceRowIds];
    if (gateSourceRowIds.some((sourceRowId) => !knownSourceRowIds.has(sourceRowId))) {
      throw new Error('Review requirement references an unknown source row.');
    }
    const reasonKey = requirement.reasonKey?.trim()
      || `authoring.review.${requirement.kind}_required`;
    return {
      gateId: stableAuthoringId(
        'review-gate',
        document.documentId,
        requirement.kind,
        reasonKey,
        gateSourceRowIds.join(','),
      ),
      kind: requirement.kind,
      status: 'required',
      sourceSnapshotId,
      sourceRowIds: gateSourceRowIds,
      reasonKey,
    };
  });
  return gates.filter((gate, index) => (
    gates.findIndex((candidate) => candidate.gateId === gate.gateId) === index
  ));
}

export function isAuthoringReviewGateOutstanding(
  gate: AuthoringReviewGate,
): boolean {
  return gate.status !== 'evidence_recorded';
}

export function hasPendingAuthoringSourceUpdate(
  document: TextAuthoringDocument,
): boolean {
  return Boolean(document.sourceState && document.sourceState.status !== 'current');
}

export function authoringDocumentNeedsReview(
  document: TextAuthoringDocument,
): boolean {
  return (
    document.parseResult.issues.some(authoringIssueBlocksDraft)
    || (document.reviewGates ?? []).some(isAuthoringReviewGateOutstanding)
    || hasPendingAuthoringSourceUpdate(document)
  );
}

export function deriveAuthoringLifecycleStatus(
  document: TextAuthoringDocument,
  preferred: TextAuthoringDocument['lifecycleStatus'] = document.lifecycleStatus,
): TextAuthoringDocument['lifecycleStatus'] {
  if (preferred === 'archived') return 'archived';
  if (authoringDocumentNeedsReview(document)) return 'needs_review';
  return preferred === 'previewed' ? 'previewed' : 'draft';
}

function issueBlockers(document: TextAuthoringDocument): AuthoringWriteBlocker[] {
  return document.parseResult.issues
    .filter(authoringIssueBlocksDraft)
    .map((issue) => ({
      kind: 'authoring_issue' as const,
      code: 'outstanding_authoring_issue',
      id: issue.issueId,
      message: 'A blocking authoring issue still needs an explicit decision.',
    }));
}

function reviewBlockers(document: TextAuthoringDocument): AuthoringWriteBlocker[] {
  return (document.reviewGates ?? [])
    .filter(isAuthoringReviewGateOutstanding)
    .map((gate) => ({
      kind: 'review_gate' as const,
      code: gate.status === 'personal_only'
        ? 'review_gate_personal_only'
        : 'review_gate_required',
      id: gate.gateId,
      message: gate.status === 'personal_only'
        ? 'This source is limited to local use in the personal lane.'
        : `${gate.kind} review evidence has not been recorded.`,
    }));
}

function sourceUpdateBlockers(
  document: TextAuthoringDocument,
): AuthoringWriteBlocker[] {
  const state = document.sourceState;
  if (!state || state.status === 'current') return [];
  return [{
    kind: 'source_update',
    code: state.status === 'conflict_source_vs_user'
      ? 'source_update_conflict'
      : 'source_update_pending',
    id: state.incoming.snapshot.snapshotId,
    message: state.status === 'conflict_source_vs_user'
      ? 'A staged source update conflicts with owned values.'
      : 'A staged source update has not been applied or rejected.',
  }];
}

function ownershipBlockers(
  document: TextAuthoringDocument,
  action: AuthoringWriteAction,
): AuthoringWriteBlocker[] {
  if (
    action === 'request_creator_review'
    && document.ownership !== 'creator'
  ) {
    return [{
      kind: 'ownership_lane',
      code: 'creator_lane_required',
      message: 'Creator review requests require the creator lane.',
    }];
  }
  if (
    action === 'submit_suggestion'
    && document.ownership !== 'suggestion'
  ) {
    return [{
      kind: 'ownership_lane',
      code: 'suggestion_lane_required',
      message: 'Suggestion submission requires the suggestion lane.',
    }];
  }
  return [];
}

export function evaluateAuthoringWritePolicy(
  document: TextAuthoringDocument,
  action: AuthoringWriteAction,
): AuthoringWritePolicyResult {
  const needsReview = authoringDocumentNeedsReview(document);
  if (action === 'save_local_draft') {
    return {
      action,
      allowed: true,
      needsReview,
      blockers: [],
    };
  }

  const blockers = [
    ...ownershipBlockers(document, action),
    ...issueBlockers(document),
    ...reviewBlockers(document),
    ...sourceUpdateBlockers(document),
  ];
  return {
    action,
    allowed: blockers.length === 0,
    needsReview,
    blockers,
  };
}

function replaceDocumentIdentity(
  value: unknown,
  previousDocumentId: string,
  nextDocumentId: string,
): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => (
      replaceDocumentIdentity(entry, previousDocumentId, nextDocumentId)
    ));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  if (record.documentId === previousDocumentId) {
    record.documentId = nextDocumentId;
  }
  Object.values(record).forEach((entry) => (
    replaceDocumentIdentity(entry, previousDocumentId, nextDocumentId)
  ));
}

export function forkAuthoringDocumentToPersonal(
  source: TextAuthoringDocument,
  options: ForkAuthoringDocumentToPersonalOptions,
): TextAuthoringDocument {
  const documentId = options.documentId.trim();
  if (!documentId || documentId === source.documentId) {
    throw new Error('A personal fork requires a new document ID.');
  }
  const now = options.now ?? new Date().toISOString();
  const fork = cloneAuthoringValue(source);
  const sourceRevisionId = source.revision.revisionId;
  replaceDocumentIdentity(fork, source.documentId, documentId);
  fork.documentId = documentId;
  fork.ownership = 'personal';
  fork.reviewGates = (fork.reviewGates ?? []).map((gate) => ({
    ...gate,
    gateId: stableAuthoringId(
      'review-gate',
      documentId,
      gate.kind,
      gate.reasonKey,
      gate.sourceRowIds.join(','),
    ),
    ...(gate.kind === 'rights'
      ? {
          status: 'personal_only' as const,
          actorLane: 'personal' as const,
          decidedAt: now,
        }
      : {}),
  }));
  const revision = {
    revisionId: stableAuthoringId(
      'revision',
      documentId,
      sourceRevisionId,
      'personal-fork',
    ),
    parentRevisionId: sourceRevisionId,
    kind: 'personal_fork' as const,
    operations: [],
    actorLane: 'personal' as const,
    timestamp: now,
  };
  fork.revision = revision;
  fork.revisionHistory = [revision];
  fork.forkedFrom = {
    documentId: source.documentId,
    revisionId: sourceRevisionId,
  };
  fork.createdAt = now;
  fork.updatedAt = now;
  fork.lifecycleStatus = deriveAuthoringLifecycleStatus(fork, 'draft');
  return fork;
}
