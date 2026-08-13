import {
  compareTextAuthoringSources,
  type TextAuthoringSourceComparison,
} from "./source-comparison";
import {
  createAuthoringSourceUpdateCandidate,
  resolveAuthoringSourceUpdateChange,
  stageAuthoringSourceUpdate,
} from "./source-update";
import {
  createTextAuthoringServiceStateFromDocument,
  getTextAuthoringRevisionPair,
  type TextAuthoringServiceState,
} from "./service-state";
import type { BuildAuthoringArtifactProjectionOptions } from "./artifact-projection";
import {
  cloneAuthoringValue,
  stableAuthoringHash,
  stableAuthoringId,
  stableAuthoringJson,
} from "./identity";
import { applyAuthoringOperation } from "./operations";
import type {
  AuthoringSourceItemMatch,
  AuthoringSourceUpdateCandidate,
  AuthoringSourceUpdateChange,
  AuthoringSourceUpdateResolution,
  TextAuthoringDocument,
  TextAuthoringOwnership,
} from "./types";

export const TEXT_AUTHORING_SOURCE_UPDATE_SESSION_VERSION = 1 as const;
export const TEXT_AUTHORING_LOCAL_SYNTHETIC_HOST_ADAPTER =
  "LOCAL_SYNTHETIC_HOST_ADAPTER" as const;
export const TEXT_AUTHORING_SOURCE_CANDIDATE_EVENT =
  "flowme:text-authoring-source-candidate" as const;

export type TextAuthoringHostCandidateEnvelope = {
  envelopeVersion: 1;
  adapter: typeof TEXT_AUTHORING_LOCAL_SYNTHETIC_HOST_ADAPTER;
  eventId: string;
  candidateId: string;
  contentId: string;
  sourceId: string;
  externalVersion: string;
  baseSnapshotId: string;
  baseWorkingRevisionId: string;
  rawText: string;
  rawByteLength: number;
  rawByteHash: string;
  contentHash: string;
  mediaType: "text/plain" | "text/markdown";
  charset: "utf-8";
  collectedAt: string;
  receivedAt: string;
  providedBy: string;
  sourceOwnerClaim: string;
  collectorKind: "local_synthetic";
  idempotencyKey: string;
};

export type CreateLocalSyntheticHostEnvelopeOptions = {
  externalVersion: string;
  candidateId?: string;
  eventId?: string;
  collectedAt?: string;
  receivedAt?: string;
  providedBy?: string;
  sourceOwnerClaim?: string;
  mediaType?: "text/plain" | "text/markdown";
};

export type TextAuthoringLocalSyntheticHostIngress =
  CreateLocalSyntheticHostEnvelopeOptions & {
    rawText: string;
  };

export type TextAuthoringLocalSyntheticHostEventDetail = (
  | {
      envelope: TextAuthoringHostCandidateEnvelope;
      localSynthetic?: never;
    }
  | {
      envelope?: never;
      localSynthetic: TextAuthoringLocalSyntheticHostIngress;
    }
) & {
  matches?: AuthoringSourceItemMatch[];
  selectedChangeId?: string;
  scrollTop?: number;
  /** Local test-adapter seam; never grants creator permission. */
  creatorPermission?: boolean;
  /** Local test-adapter failure seam; it does not perform an external write. */
  injectFailure?: ApplyTextAuthoringSourceCandidateOptions["injectFailure"];
};

export type TextAuthoringSourceCandidateDecision =
  "keep_working" | "use_incoming" | "later";

export type TextAuthoringSourceApplyReceipt = {
  receiptVersion: 1;
  receiptId: string;
  sessionId: string;
  eventId: string;
  candidateId: string;
  idempotencyKey: string;
  baseSnapshotId: string;
  appliedCandidateSnapshotId: string;
  baseWorkingRevisionId: string;
  resultWorkingRevisionId: string;
  resultCanonicalRevisionId: string;
  resultProjectionRevisionId: string;
  decisionSetHash: string;
  projectionOptions: BuildAuthoringArtifactProjectionOptions;
  projectionOptionsHash: string;
  baseAggregateHash: string;
  resultAggregateHash: string;
  appliedAt: string;
  creatorRevisionDelta: 0;
  sideEffects: { publish: 0; network: 0; p35: 0; externalWrite: 0 };
};

export type TextAuthoringSourceUpdateSessionStatus =
  | "update-detected"
  | "comparing"
  | "conflict"
  | "deferred"
  | "stale-candidate"
  | "applying"
  | "apply-failed"
  | "undo-available"
  | "rejected"
  | "reverted";

export type TextAuthoringSourceUpdateSession = {
  sessionVersion: typeof TEXT_AUTHORING_SOURCE_UPDATE_SESSION_VERSION;
  sessionId: string;
  draftId: string;
  status: TextAuthoringSourceUpdateSessionStatus;
  envelope: TextAuthoringHostCandidateEnvelope;
  stagedDocument: TextAuthoringDocument;
  baseComparison: TextAuthoringSourceComparison;
  workingComparison: TextAuthoringSourceComparison;
  selectedChangeId?: string;
  scrollTop: number;
  /** A persisted denial is durable; a persisted allow is never authority. */
  authorityConstraint: "creator_required" | "denied";
  creatorCanApply: boolean;
  createdAt: string;
  updatedAt: string;
  deferredAt?: string;
  rejectedAt?: string;
  errorMessage?: string;
  receipt?: TextAuthoringSourceApplyReceipt;
  beforeApplyState?: TextAuthoringServiceState;
};

export type StageTextAuthoringSourceCandidateOptions = {
  actor: TextAuthoringOwnership;
  now?: string;
  permission: boolean;
  selectedChangeId?: string;
  scrollTop?: number;
};

export type ApplyTextAuthoringSourceCandidateOptions = {
  actor: TextAuthoringOwnership;
  now?: string;
  permission: boolean;
  projectionOptions?: BuildAuthoringArtifactProjectionOptions;
  injectFailure?: "before-domain-apply" | "before-commit";
};

export type TextAuthoringSourceCandidateAuthority = {
  actor: TextAuthoringOwnership;
  permission: boolean;
};

export type UndoTextAuthoringSourceCandidateOptions =
  TextAuthoringSourceCandidateAuthority & {
    now?: string;
  };

export type ApplyTextAuthoringSourceCandidateResult = {
  state: TextAuthoringServiceState;
  session: TextAuthoringSourceUpdateSession;
  receipt?: TextAuthoringSourceApplyReceipt;
  replayed: boolean;
  applied: boolean;
};

function exactUtf8Hash(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function activeSnapshotId(state: TextAuthoringServiceState): string {
  return (
    state.canonicalDraft.document.sourceState?.active.snapshotId ??
    state.sourceSnapshot.snapshotId
  );
}

function expectedSourceId(state: TextAuthoringServiceState): string {
  const document = state.canonicalDraft.document;
  const active = document.sourceState?.active;
  return stableAuthoringId(
    "source-identity",
    state.draftId,
    active?.sourceUrl ?? document.sourceUrl,
    active?.sourceTitle ?? document.sourceTitle,
  );
}

function hasCreatorAuthority(
  state: TextAuthoringServiceState,
  authority: TextAuthoringSourceCandidateAuthority,
): boolean {
  return (
    authority.permission === true &&
    authority.actor === "creator" &&
    state.canonicalDraft.document.ownership === "creator"
  );
}

function assertIsoDate(value: string, field: string): void {
  if (!value || Number.isNaN(Date.parse(value))) {
    throw new Error(`Source candidate ${field} is missing or invalid.`);
  }
}

function assertCompleteEnvelope(
  state: TextAuthoringServiceState,
  envelope: TextAuthoringHostCandidateEnvelope,
): void {
  const required = [
    envelope.eventId,
    envelope.candidateId,
    envelope.contentId,
    envelope.sourceId,
    envelope.externalVersion,
    envelope.baseSnapshotId,
    envelope.baseWorkingRevisionId,
    envelope.providedBy,
    envelope.sourceOwnerClaim,
    envelope.idempotencyKey,
  ];
  if (required.some((value) => !value?.trim())) {
    throw new Error("Source candidate envelope is incomplete.");
  }
  if (
    envelope.envelopeVersion !== 1 ||
    envelope.adapter !== TEXT_AUTHORING_LOCAL_SYNTHETIC_HOST_ADAPTER ||
    envelope.collectorKind !== "local_synthetic" ||
    envelope.charset !== "utf-8" ||
    !["text/plain", "text/markdown"].includes(envelope.mediaType)
  ) {
    throw new Error("Source candidate envelope is unsupported.");
  }
  assertIsoDate(envelope.collectedAt, "collectedAt");
  assertIsoDate(envelope.receivedAt, "receivedAt");
  if (Date.parse(envelope.receivedAt) < Date.parse(envelope.collectedAt)) {
    throw new Error("Source candidate receipt predates collection.");
  }
  const bytes = new TextEncoder().encode(envelope.rawText);
  if (
    envelope.rawByteLength !== bytes.byteLength ||
    envelope.rawByteHash !== exactUtf8Hash(envelope.rawText) ||
    envelope.contentHash !== stableAuthoringHash(envelope.rawText)
  ) {
    throw new Error("Source candidate raw bytes or hash do not match.");
  }
  const expectedIdempotencyKey = stableAuthoringId(
    "source-idempotency",
    envelope.sourceId,
    envelope.externalVersion,
    exactUtf8Hash(envelope.rawText),
  );
  if (envelope.idempotencyKey !== expectedIdempotencyKey) {
    throw new Error("Source candidate idempotency identity is invalid.");
  }
  if (
    envelope.contentId !== state.canonicalDraft.document.documentId ||
    envelope.sourceId !== expectedSourceId(state) ||
    envelope.baseSnapshotId !== activeSnapshotId(state) ||
    envelope.baseWorkingRevisionId !== state.workingSource.revisionId
  ) {
    throw new Error(
      "Source candidate is stale for the current working source.",
    );
  }
}

export function createLocalSyntheticHostEnvelope(
  state: TextAuthoringServiceState,
  rawText: string,
  options: CreateLocalSyntheticHostEnvelopeOptions,
): TextAuthoringHostCandidateEnvelope {
  const collectedAt = options.collectedAt ?? new Date().toISOString();
  const receivedAt = options.receivedAt ?? collectedAt;
  const sourceId = expectedSourceId(state);
  const contentId = state.canonicalDraft.document.documentId;
  const candidateId =
    options.candidateId ??
    stableAuthoringId(
      "source-candidate",
      sourceId,
      options.externalVersion,
      exactUtf8Hash(rawText),
    );
  const eventId =
    options.eventId ??
    stableAuthoringId("source-event", candidateId, receivedAt);
  return {
    envelopeVersion: 1,
    adapter: TEXT_AUTHORING_LOCAL_SYNTHETIC_HOST_ADAPTER,
    eventId,
    candidateId,
    contentId,
    sourceId,
    externalVersion: options.externalVersion,
    baseSnapshotId: activeSnapshotId(state),
    baseWorkingRevisionId: state.workingSource.revisionId,
    rawText,
    rawByteLength: new TextEncoder().encode(rawText).byteLength,
    rawByteHash: exactUtf8Hash(rawText),
    contentHash: stableAuthoringHash(rawText),
    mediaType: options.mediaType ?? "text/markdown",
    charset: "utf-8",
    collectedAt,
    receivedAt,
    providedBy:
      options.providedBy ?? TEXT_AUTHORING_LOCAL_SYNTHETIC_HOST_ADAPTER,
    sourceOwnerClaim: options.sourceOwnerClaim ?? "fixture-owner",
    collectorKind: "local_synthetic",
    idempotencyKey: stableAuthoringId(
      "source-idempotency",
      sourceId,
      options.externalVersion,
      exactUtf8Hash(rawText),
    ),
  };
}

export function createCandidateFromLocalSyntheticEnvelope(
  state: TextAuthoringServiceState,
  envelope: TextAuthoringHostCandidateEnvelope,
  incomingDocument: TextAuthoringDocument,
  matches: AuthoringSourceItemMatch[] = [],
): AuthoringSourceUpdateCandidate {
  assertCompleteEnvelope(state, envelope);
  if (
    incomingDocument.documentId !== state.canonicalDraft.document.documentId ||
    incomingDocument.rawText !== envelope.rawText
  ) {
    throw new Error("Source candidate document does not match the envelope.");
  }
  return createAuthoringSourceUpdateCandidate(incomingDocument, {
    capturedAt: envelope.collectedAt,
    externalVersion: envelope.externalVersion,
    matches,
  });
}

function sessionStatus(
  document: TextAuthoringDocument,
): "comparing" | "conflict" {
  return document.sourceState?.status === "conflict_source_vs_user"
    ? "conflict"
    : "comparing";
}

export function stageTextAuthoringSourceCandidate(
  state: TextAuthoringServiceState,
  envelope: TextAuthoringHostCandidateEnvelope,
  candidate: AuthoringSourceUpdateCandidate,
  options: StageTextAuthoringSourceCandidateOptions,
): TextAuthoringSourceUpdateSession {
  assertCompleteEnvelope(state, envelope);
  if (
    candidate.rawText !== envelope.rawText ||
    candidate.snapshot.externalVersion !== envelope.externalVersion
  ) {
    throw new Error("Source candidate does not match the host envelope.");
  }
  const now = options.now ?? envelope.receivedAt;
  const stagedDocument = cloneAuthoringValue(state.canonicalDraft.document);
  const changed = stageAuthoringSourceUpdate(stagedDocument, candidate, now);
  if (
    !changed ||
    !stagedDocument.sourceState ||
    stagedDocument.sourceState.status === "current"
  ) {
    throw new Error("Source candidate does not contain a new source version.");
  }
  const changes = stagedDocument.sourceState.changes;
  const creatorCanApply = hasCreatorAuthority(state, options);
  return {
    sessionVersion: TEXT_AUTHORING_SOURCE_UPDATE_SESSION_VERSION,
    sessionId: stableAuthoringId(
      "source-update-session",
      state.draftId,
      envelope.idempotencyKey,
    ),
    draftId: state.draftId,
    status: sessionStatus(stagedDocument),
    envelope: cloneAuthoringValue(envelope),
    stagedDocument,
    baseComparison: compareTextAuthoringSources(
      state.canonicalDraft.document.sourceState?.active.rawText ??
        state.sourceSnapshot.rawText,
      envelope.rawText,
    ),
    workingComparison: compareTextAuthoringSources(
      state.workingSource.rawText,
      envelope.rawText,
    ),
    selectedChangeId:
      options.selectedChangeId ??
      changes.find((change) => change.state === "open")?.changeId ??
      changes[0]?.changeId,
    scrollTop: Math.max(0, options.scrollTop ?? 0),
    authorityConstraint:
      options.permission === true ? "creator_required" : "denied",
    creatorCanApply,
    createdAt: now,
    updatedAt: now,
  };
}

function stagedChanges(
  session: TextAuthoringSourceUpdateSession,
): AuthoringSourceUpdateChange[] {
  const state = session.stagedDocument.sourceState;
  if (!state || state.status === "current") {
    throw new Error("No source candidate comparison is staged.");
  }
  return state.changes;
}

function resolutionFor(
  change: AuthoringSourceUpdateChange,
  decision: Exclude<TextAuthoringSourceCandidateDecision, "later">,
): AuthoringSourceUpdateResolution {
  if (change.kind === "changed") {
    return decision === "keep_working" ? "keep_user" : "use_incoming";
  }
  if (change.kind === "added") {
    return decision === "keep_working" ? "exclude_added" : "include_added";
  }
  return decision === "keep_working" ? "keep_previous" : "remove_removed";
}

export function resolveTextAuthoringSourceCandidateChange(
  source: TextAuthoringSourceUpdateSession,
  changeId: string,
  decision: TextAuthoringSourceCandidateDecision,
  options: { actor: TextAuthoringOwnership; now?: string; permission: boolean },
): TextAuthoringSourceUpdateSession {
  const session = cloneAuthoringValue(source);
  if (
    options.permission !== true ||
    options.actor !== "creator" ||
    !session.creatorCanApply
  ) {
    throw new Error("Only the creator can decide source candidate changes.");
  }
  if (
    ["rejected", "reverted", "undo-available", "stale-candidate"].includes(
      session.status,
    )
  ) {
    throw new Error(
      `Source candidate cannot be changed while ${session.status}.`,
    );
  }
  const change = stagedChanges(session).find(
    (entry) => entry.changeId === changeId,
  );
  if (!change)
    throw new Error(`Source candidate change not found: ${changeId}`);
  const now = options.now ?? new Date().toISOString();
  if (decision === "later") {
    change.state = "open";
    delete change.resolution;
    delete change.decidedAt;
    delete change.actorLane;
  } else {
    if (
      change.kind === "changed" &&
      decision === "keep_working" &&
      change.userValue === undefined
    ) {
      // The underlying source-update contract requires an explicit creator
      // decision marker even when the previous source did not have the field.
      change.userValue =
        change.oldSourceValue === undefined
          ? null
          : cloneAuthoringValue(change.oldSourceValue);
      change.userOwner = "creator";
    }
    resolveAuthoringSourceUpdateChange(
      session.stagedDocument,
      changeId,
      resolutionFor(change, decision),
      "creator",
      now,
    );
  }
  session.selectedChangeId = changeId;
  session.status = sessionStatus(session.stagedDocument);
  session.updatedAt = now;
  delete session.errorMessage;
  return session;
}

export function authorizeTextAuthoringSourceCandidateSession(
  source: TextAuthoringSourceUpdateSession,
  state: TextAuthoringServiceState,
  authority: TextAuthoringSourceCandidateAuthority,
): TextAuthoringSourceUpdateSession {
  const session = cloneAuthoringValue(source);
  assertSessionIntegrity(session);
  session.creatorCanApply =
    session.authorityConstraint !== "denied" &&
    hasCreatorAuthority(state, authority);
  if (
    !["undo-available", "reverted", "rejected"].includes(session.status) &&
    (session.envelope.contentId !== state.canonicalDraft.document.documentId ||
      session.envelope.sourceId !== expectedSourceId(state) ||
      session.envelope.baseSnapshotId !== activeSnapshotId(state) ||
      session.envelope.baseWorkingRevisionId !== state.workingSource.revisionId)
  ) {
    session.status = "stale-candidate";
    session.errorMessage =
      "Source candidate is stale for the current working source.";
  }
  return session;
}

export function updateTextAuthoringSourceCandidateFocus(
  source: TextAuthoringSourceUpdateSession,
  focus: { selectedChangeId?: string; scrollTop?: number },
): TextAuthoringSourceUpdateSession {
  const session = cloneAuthoringValue(source);
  if (focus.selectedChangeId !== undefined) {
    if (
      !stagedChanges(session).some(
        (change) => change.changeId === focus.selectedChangeId,
      )
    ) {
      throw new Error("Source candidate focus points to a missing change.");
    }
    session.selectedChangeId = focus.selectedChangeId;
  }
  if (focus.scrollTop !== undefined)
    session.scrollTop = Math.max(0, focus.scrollTop);
  return session;
}

export function deferTextAuthoringSourceCandidate(
  source: TextAuthoringSourceUpdateSession,
  options: TextAuthoringSourceCandidateAuthority & { now?: string },
): TextAuthoringSourceUpdateSession {
  const session = cloneAuthoringValue(source);
  if (
    options.permission !== true ||
    options.actor !== "creator" ||
    !session.creatorCanApply
  ) {
    throw new Error("Only the creator can defer a source candidate.");
  }
  if (["rejected", "reverted", "undo-available"].includes(session.status)) {
    throw new Error(
      `Source candidate cannot be deferred while ${session.status}.`,
    );
  }
  const now = options.now ?? new Date().toISOString();
  session.status = "deferred";
  session.deferredAt = now;
  session.updatedAt = now;
  return session;
}

export function rejectTextAuthoringSourceCandidate(
  source: TextAuthoringSourceUpdateSession,
  options: TextAuthoringSourceCandidateAuthority & { now?: string },
): TextAuthoringSourceUpdateSession {
  const session = cloneAuthoringValue(source);
  if (
    options.permission !== true ||
    options.actor !== "creator" ||
    !session.creatorCanApply
  ) {
    throw new Error("Only the creator can reject a source candidate.");
  }
  if (["reverted", "undo-available"].includes(session.status)) {
    throw new Error(
      `Source candidate cannot be rejected while ${session.status}.`,
    );
  }
  const now = options.now ?? new Date().toISOString();
  session.status = "rejected";
  session.rejectedAt = now;
  session.updatedAt = now;
  return session;
}

function decisionSetHash(session: TextAuthoringSourceUpdateSession): string {
  return stableAuthoringHash(
    stableAuthoringJson(
      stagedChanges(session).map((change) => ({
        changeId: change.changeId,
        state: change.state,
        resolution: change.resolution,
        actorLane: change.actorLane,
      })),
    ),
  );
}

function sourceAggregateHash(state: TextAuthoringServiceState): string {
  return stableAuthoringHash(
    stableAuthoringJson({
      draftId: state.draftId,
      sourceSnapshot: state.sourceSnapshot,
      workingSource: state.workingSource,
      canonicalDraft: state.canonicalDraft,
      projection: state.projection,
      calculation: state.calculation,
    }),
  );
}

function fullAggregateHash(state: TextAuthoringServiceState): string {
  return stableAuthoringHash(
    stableAuthoringJson({
      draftId: state.draftId,
      sourceSnapshot: state.sourceSnapshot,
      workingSource: state.workingSource,
      canonicalDraft: state.canonicalDraft,
      projection: state.projection,
      calculation: state.calculation,
      saveState: state.saveState,
      recovery: state.recovery,
      lastExplicitSave: state.lastExplicitSave,
      readyReceipt: state.readyReceipt,
    }),
  );
}

function assertReceiptMatchesCurrentState(
  state: TextAuthoringServiceState,
  session: TextAuthoringSourceUpdateSession,
): void {
  const receipt = session.receipt;
  if (!receipt) throw new Error("Source candidate receipt is missing.");
  const active = state.canonicalDraft.document.sourceState?.active;
  const pair = getTextAuthoringRevisionPair(state);
  const failures = [
    receipt.resultWorkingRevisionId !== pair.workingSourceRevisionId
      ? "working"
      : "",
    receipt.resultCanonicalRevisionId !== pair.canonicalRevisionId
      ? "canonical"
      : "",
    receipt.resultProjectionRevisionId !== pair.projectionRevisionId
      ? "projection"
      : "",
    active?.snapshotId !== receipt.appliedCandidateSnapshotId ? "snapshot" : "",
    state.workingSource.rawText !== state.canonicalDraft.document.rawText
      ? "raw"
      : "",
    receipt.resultAggregateHash !== sourceAggregateHash(state)
      ? "aggregate"
      : "",
  ].filter(Boolean);
  if (failures.length > 0) {
    throw new Error(
      `Current work does not match the source apply receipt (${failures.join(",")}).`,
    );
  }
}

function assertSessionIntegrity(
  session: TextAuthoringSourceUpdateSession,
): void {
  const state = session.stagedDocument.sourceState;
  if (!state || state.status === "current") {
    throw new Error("Source candidate session has no staged comparison.");
  }
  const envelope = session.envelope;
  const bytes = new TextEncoder().encode(envelope.rawText);
  const expectedIdempotencyKey = stableAuthoringId(
    "source-idempotency",
    envelope.sourceId,
    envelope.externalVersion,
    exactUtf8Hash(envelope.rawText),
  );
  if (
    envelope.envelopeVersion !== 1 ||
    envelope.adapter !== TEXT_AUTHORING_LOCAL_SYNTHETIC_HOST_ADAPTER ||
    envelope.collectorKind !== "local_synthetic" ||
    envelope.rawByteLength !== bytes.byteLength ||
    envelope.rawByteHash !== exactUtf8Hash(envelope.rawText) ||
    envelope.contentHash !== stableAuthoringHash(envelope.rawText) ||
    envelope.idempotencyKey !== expectedIdempotencyKey ||
    session.stagedDocument.documentId !== envelope.contentId ||
    state.active.snapshotId !== envelope.baseSnapshotId ||
    state.incoming.rawText !== envelope.rawText ||
    state.incoming.snapshot.externalVersion !== envelope.externalVersion
  ) {
    throw new Error("Source candidate session integrity check failed.");
  }
  const expectedSessionId = stableAuthoringId(
    "source-update-session",
    session.draftId,
    envelope.idempotencyKey,
  );
  if (session.sessionId !== expectedSessionId) {
    throw new Error("Source candidate session identity is invalid.");
  }
  if (session.receipt || session.beforeApplyState) {
    const receipt = session.receipt;
    const before = session.beforeApplyState;
    const expectedDecisionSetHash = decisionSetHash(session);
    const expectedReceiptId = stableAuthoringId(
      "source-apply-receipt",
      session.sessionId,
      envelope.idempotencyKey,
      expectedDecisionSetHash,
    );
    const exactSideEffects = stableAuthoringJson({
      publish: 0,
      network: 0,
      p35: 0,
      externalWrite: 0,
    });
    const projectionOptionsHash = stableAuthoringHash(
      stableAuthoringJson(receipt?.projectionOptions ?? {}),
    );
    if (
      !receipt ||
      !before ||
      receipt.receiptVersion !== 1 ||
      receipt.receiptId !== expectedReceiptId ||
      receipt.sessionId !== session.sessionId ||
      receipt.eventId !== envelope.eventId ||
      receipt.candidateId !== envelope.candidateId ||
      receipt.idempotencyKey !== envelope.idempotencyKey ||
      receipt.baseSnapshotId !== envelope.baseSnapshotId ||
      receipt.baseWorkingRevisionId !== envelope.baseWorkingRevisionId ||
      receipt.appliedCandidateSnapshotId !==
        state.incoming.snapshot.snapshotId ||
      receipt.decisionSetHash !== expectedDecisionSetHash ||
      receipt.projectionOptionsHash !== projectionOptionsHash ||
      receipt.baseAggregateHash !== fullAggregateHash(before) ||
      !receipt.resultAggregateHash ||
      !receipt.resultWorkingRevisionId ||
      !receipt.resultCanonicalRevisionId ||
      !receipt.resultProjectionRevisionId ||
      Number.isNaN(Date.parse(receipt.appliedAt)) ||
      receipt.creatorRevisionDelta !== 0 ||
      stableAuthoringJson(receipt.sideEffects) !== exactSideEffects ||
      before.draftId !== session.draftId ||
      before.workingSource.revisionId !== envelope.baseWorkingRevisionId ||
      activeSnapshotId(before) !== envelope.baseSnapshotId ||
      before.workingSource.rawText !== before.canonicalDraft.document.rawText
    ) {
      throw new Error("Source candidate receipt integrity check failed.");
    }
    const expectedAppliedDocument = applyAuthoringOperation(
      session.stagedDocument,
      { type: "apply_source_update" },
      { actorLane: "creator", now: receipt.appliedAt },
    );
    const expectedResultState = createTextAuthoringServiceStateFromDocument(
      expectedAppliedDocument,
      {
        draftId: session.draftId,
        now: receipt.appliedAt,
        projectionOptions: receipt.projectionOptions,
      },
    );
    expectedResultState.sourceSnapshot = cloneAuthoringValue(
      before.sourceSnapshot,
    );
    expectedResultState.workingSource.sourceSnapshotId =
      before.sourceSnapshot.snapshotId;
    if (before.lastExplicitSave) {
      expectedResultState.lastExplicitSave = cloneAuthoringValue(
        before.lastExplicitSave,
      );
    }
    delete expectedResultState.readyReceipt;
    expectedResultState.saveState = { status: "dirty" };
    if (
      receipt.resultWorkingRevisionId !==
        expectedResultState.workingSource.revisionId ||
      receipt.resultCanonicalRevisionId !==
        expectedResultState.canonicalDraft.revisionId ||
      receipt.resultProjectionRevisionId !==
        expectedResultState.projection.revisionId ||
      receipt.resultAggregateHash !== sourceAggregateHash(expectedResultState)
    ) {
      throw new Error("Source candidate receipt integrity check failed.");
    }
  }
}

function failedApply(
  state: TextAuthoringServiceState,
  source: TextAuthoringSourceUpdateSession,
  message: string,
  now: string,
  status: "apply-failed" | "stale-candidate" = "apply-failed",
): ApplyTextAuthoringSourceCandidateResult {
  const session = cloneAuthoringValue(source);
  session.status = status;
  session.errorMessage = message;
  session.updatedAt = now;
  return {
    state: cloneAuthoringValue(state),
    session,
    replayed: false,
    applied: false,
  };
}

export function applyTextAuthoringSourceCandidate(
  state: TextAuthoringServiceState,
  source: TextAuthoringSourceUpdateSession,
  options: ApplyTextAuthoringSourceCandidateOptions,
): ApplyTextAuthoringSourceCandidateResult {
  const now = options.now ?? new Date().toISOString();
  if (!hasCreatorAuthority(state, options) || !source.creatorCanApply) {
    return failedApply(
      state,
      source,
      "Only the creator can apply a source candidate.",
      now,
    );
  }
  try {
    assertSessionIntegrity(source);
  } catch (error) {
    return failedApply(
      state,
      source,
      error instanceof Error
        ? error.message
        : "Source candidate session is invalid.",
      now,
    );
  }
  if (
    source.status === "undo-available" &&
    source.receipt &&
    source.receipt.idempotencyKey === source.envelope.idempotencyKey &&
    state.workingSource.revisionId === source.receipt.resultWorkingRevisionId
  ) {
    try {
      assertReceiptMatchesCurrentState(state, source);
    } catch (error) {
      return failedApply(
        state,
        source,
        error instanceof Error
          ? error.message
          : "Source apply receipt is invalid.",
        now,
      );
    }
    return {
      state: cloneAuthoringValue(state),
      session: cloneAuthoringValue(source),
      receipt: cloneAuthoringValue(source.receipt),
      replayed: true,
      applied: true,
    };
  }
  if (
    ["rejected", "reverted", "undo-available", "stale-candidate"].includes(
      source.status,
    )
  ) {
    return failedApply(
      state,
      source,
      `Source candidate cannot be applied while ${source.status}.`,
      now,
      source.status === "stale-candidate" ? "stale-candidate" : "apply-failed",
    );
  }
  try {
    assertCompleteEnvelope(state, source.envelope);
    if (stagedChanges(source).some((change) => change.state !== "resolved")) {
      throw new Error(
        "Every source candidate change needs an explicit decision.",
      );
    }
    if (options.injectFailure === "before-domain-apply") {
      throw new Error("Injected source candidate failure before apply.");
    }
    const appliedDocument = applyAuthoringOperation(
      source.stagedDocument,
      { type: "apply_source_update" },
      { actorLane: "creator", now },
    );
    if (options.injectFailure === "before-commit") {
      throw new Error("Injected source candidate failure before commit.");
    }
    const nextState = createTextAuthoringServiceStateFromDocument(
      appliedDocument,
      {
        draftId: state.draftId,
        now,
        projectionOptions: options.projectionOptions,
      },
    );
    nextState.sourceSnapshot = cloneAuthoringValue(state.sourceSnapshot);
    nextState.workingSource.sourceSnapshotId = state.sourceSnapshot.snapshotId;
    if (state.lastExplicitSave) {
      nextState.lastExplicitSave = cloneAuthoringValue(state.lastExplicitSave);
    }
    delete nextState.readyReceipt;
    nextState.saveState = { status: "dirty" };
    const appliedCandidateSnapshotId =
      appliedDocument.sourceState?.active.snapshotId;
    if (!appliedCandidateSnapshotId) {
      throw new Error(
        "Applied source candidate did not advance the active snapshot.",
      );
    }
    const receipt: TextAuthoringSourceApplyReceipt = {
      receiptVersion: 1,
      receiptId: stableAuthoringId(
        "source-apply-receipt",
        source.sessionId,
        source.envelope.idempotencyKey,
        decisionSetHash(source),
      ),
      sessionId: source.sessionId,
      eventId: source.envelope.eventId,
      candidateId: source.envelope.candidateId,
      idempotencyKey: source.envelope.idempotencyKey,
      baseSnapshotId: source.envelope.baseSnapshotId,
      appliedCandidateSnapshotId,
      baseWorkingRevisionId: source.envelope.baseWorkingRevisionId,
      resultWorkingRevisionId: nextState.workingSource.revisionId,
      resultCanonicalRevisionId: nextState.canonicalDraft.revisionId,
      resultProjectionRevisionId: nextState.projection.revisionId,
      decisionSetHash: decisionSetHash(source),
      projectionOptions: cloneAuthoringValue(options.projectionOptions ?? {}),
      projectionOptionsHash: stableAuthoringHash(
        stableAuthoringJson(options.projectionOptions ?? {}),
      ),
      baseAggregateHash: fullAggregateHash(state),
      resultAggregateHash: sourceAggregateHash(nextState),
      appliedAt: now,
      creatorRevisionDelta: 0,
      sideEffects: { publish: 0, network: 0, p35: 0, externalWrite: 0 },
    };
    const session = cloneAuthoringValue(source);
    session.status = "undo-available";
    session.beforeApplyState = cloneAuthoringValue(state);
    session.receipt = receipt;
    session.updatedAt = now;
    delete session.errorMessage;
    return {
      state: nextState,
      session,
      receipt,
      replayed: false,
      applied: true,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Source candidate apply failed.";
    return failedApply(
      state,
      source,
      message,
      now,
      /stale for the current working source/u.test(message)
        ? "stale-candidate"
        : "apply-failed",
    );
  }
}

export function undoTextAuthoringSourceCandidate(
  currentState: TextAuthoringServiceState,
  source: TextAuthoringSourceUpdateSession,
  options: UndoTextAuthoringSourceCandidateOptions,
): {
  state: TextAuthoringServiceState;
  session: TextAuthoringSourceUpdateSession;
} {
  if (!hasCreatorAuthority(currentState, options) || !source.creatorCanApply) {
    throw new Error("Only the creator can undo a source candidate.");
  }
  assertSessionIntegrity(source);
  if (
    source.status !== "undo-available" ||
    !source.beforeApplyState ||
    !source.receipt
  ) {
    throw new Error("No applied source candidate is available to undo.");
  }
  assertReceiptMatchesCurrentState(currentState, source);
  if (
    currentState.workingSource.revisionId !==
    source.receipt.resultWorkingRevisionId
  ) {
    throw new Error(
      "The working source changed after the source candidate was applied.",
    );
  }
  const session = cloneAuthoringValue(source);
  session.status = "reverted";
  session.updatedAt = options.now ?? new Date().toISOString();
  return { state: cloneAuthoringValue(source.beforeApplyState), session };
}

export function serializeTextAuthoringSourceUpdateSession(
  session: TextAuthoringSourceUpdateSession,
): string {
  return JSON.stringify(session);
}

export function hydrateTextAuthoringSourceUpdateSession(
  value: string,
): TextAuthoringSourceUpdateSession {
  const parsed = JSON.parse(value) as Partial<TextAuthoringSourceUpdateSession>;
  if (
    parsed.sessionVersion !== TEXT_AUTHORING_SOURCE_UPDATE_SESSION_VERSION ||
    !parsed.sessionId ||
    !parsed.draftId ||
    !["creator_required", "denied"].includes(
      parsed.authorityConstraint ?? "",
    ) ||
    !parsed.envelope ||
    !parsed.stagedDocument ||
    !parsed.status ||
    !Array.isArray(parsed.baseComparison?.blocks) ||
    !Array.isArray(parsed.workingComparison?.blocks)
  ) {
    throw new Error("Stored source candidate session is invalid.");
  }
  const session = cloneAuthoringValue(
    parsed as TextAuthoringSourceUpdateSession,
  );
  assertSessionIntegrity(session);
  // Authorization is deliberately not persisted. The current host context
  // must re-authorize the candidate after every reload.
  session.creatorCanApply = false;
  return session;
}
