import {
  buildAuthoringArtifactProjection,
  type AuthoringArtifactProjection,
  type BuildAuthoringArtifactProjectionOptions,
} from "./artifact-projection";
import {
  cloneAuthoringValue,
  normalizeAuthoringText,
  stableAuthoringHash,
  stableAuthoringId,
} from "./identity";
import { applyAuthoringOperation } from "./operations";
import { createTextAuthoringDocument } from "./parser";
import type {
  CreateTextAuthoringDocumentOptions,
  TextAuthoringDocument,
} from "./types";

export const TEXT_AUTHORING_SERVICE_STATE_VERSION = 1 as const;

export type TextAuthoringSourceSnapshot = {
  owner: "source_provenance";
  snapshotId: string;
  rawText: string;
  contentFingerprint: string;
  capturedAt: string;
  sourceTitle?: string;
  sourceUrl?: string;
};

export type TextAuthoringWorkingSource = {
  owner: "creator_draft";
  sourceSnapshotId: string;
  revisionId: string;
  revisionNumber: number;
  rawText: string;
  updatedAt: string;
};

export type TextAuthoringCanonicalDraftState = {
  owner: "deterministic_parser";
  revisionId: string;
  sourceRevisionId: string;
  parserResultRevisionId: string;
  documentRevisionId: string;
  document: TextAuthoringDocument;
};

export type TextAuthoringProjectionState = {
  owner: "projection_engine";
  revisionId: string;
  sourceRevisionId: string;
  canonicalRevisionId: string;
  value: AuthoringArtifactProjection;
};

export type TextAuthoringRevisionPair = {
  workingSourceRevisionId: string;
  canonicalRevisionId: string;
  parserResultRevisionId: string;
  projectionRevisionId: string;
};

export type TextAuthoringCalculationState =
  | {
      status: "current";
      sourceRevisionId: string;
      completedAt: string;
    }
  | {
      status: "calculating";
      sourceRevisionId: string;
      startedAt: string;
    }
  | {
      status: "failed";
      sourceRevisionId: string;
      failedAt: string;
      message: string;
    };

export type TextAuthoringSaveState =
  | { status: "dirty" }
  | { status: "saving"; requestedAt: string }
  | { status: "saved"; savedAt: string }
  | { status: "save_failed"; failedAt: string; message: string };

export type TextAuthoringRecoverySnapshot = {
  owner: "local_recovery";
  recoveryId: string;
  draftId: string;
  recoveredAt: string;
  sourceSnapshot: TextAuthoringSourceSnapshot;
  workingSource: TextAuthoringWorkingSource;
  currentRevisionPair?: TextAuthoringRevisionPair;
};

export type TextAuthoringExplicitSaveReceipt = {
  owner: "creator_draft_persistence";
  receiptId: string;
  draftId: string;
  savedAt: string;
  revisionPair: TextAuthoringRevisionPair;
};

export type TextAuthoringReadyReceipt = {
  owner: "creator_workflow_seam";
  receiptId: string;
  draftId: string;
  markedAt: string;
  explicitSaveReceiptId: string;
  revisionPair: TextAuthoringRevisionPair;
  sideEffects: {
    publish: 0;
    network: 0;
    p35: 0;
  };
};

export type TextAuthoringServiceState = {
  serviceStateVersion: typeof TEXT_AUTHORING_SERVICE_STATE_VERSION;
  draftId: string;
  sourceSnapshot: TextAuthoringSourceSnapshot;
  workingSource: TextAuthoringWorkingSource;
  canonicalDraft: TextAuthoringCanonicalDraftState;
  projection: TextAuthoringProjectionState;
  calculation: TextAuthoringCalculationState;
  saveState: TextAuthoringSaveState;
  recovery?: TextAuthoringRecoverySnapshot;
  lastExplicitSave?: TextAuthoringExplicitSaveReceipt;
  readyReceipt?: TextAuthoringReadyReceipt;
};

export type CreateTextAuthoringServiceStateOptions =
  CreateTextAuthoringDocumentOptions & {
    draftId?: string;
    projectionOptions?: BuildAuthoringArtifactProjectionOptions;
  };

export type CreateTextAuthoringServiceStateFromDocumentOptions = {
  draftId?: string;
  now?: string;
  projectionOptions?: BuildAuthoringArtifactProjectionOptions;
};

export type TextAuthoringStoredServiceRecord = {
  draftId: string;
  document: TextAuthoringDocument;
  lastSavedAt: string;
  coherentRevisionPair?: TextAuthoringRevisionPair;
  sourceSnapshot?: TextAuthoringSourceSnapshot;
  workingSource?: TextAuthoringWorkingSource;
  explicitSaveReceipt?: TextAuthoringExplicitSaveReceipt;
  readyReceipt?: TextAuthoringReadyReceipt;
};

function sourceSnapshotFromDocument(
  document: TextAuthoringDocument,
  rawText: string,
  capturedAt: string,
): TextAuthoringSourceSnapshot {
  const active = document.sourceState?.active;
  const normalized = normalizeAuthoringText(rawText);
  return {
    owner: "source_provenance",
    snapshotId:
      active?.snapshotId ??
      stableAuthoringId("source-snapshot", document.documentId, normalized),
    rawText: active?.rawText ?? rawText,
    contentFingerprint:
      active?.contentFingerprint ?? stableAuthoringHash(normalized),
    capturedAt: active?.capturedAt ?? capturedAt,
    ...((active?.sourceTitle ?? document.sourceTitle)
      ? { sourceTitle: active?.sourceTitle ?? document.sourceTitle }
      : {}),
    ...((active?.sourceUrl ?? document.sourceUrl)
      ? { sourceUrl: active?.sourceUrl ?? document.sourceUrl }
      : {}),
  };
}

function canonicalState(
  document: TextAuthoringDocument,
  sourceRevisionId: string,
): TextAuthoringCanonicalDraftState {
  const revisionId = stableAuthoringId(
    "canonical-revision",
    document.documentId,
    sourceRevisionId,
    document.parseResult.parseResultId,
  );
  return {
    owner: "deterministic_parser",
    revisionId,
    sourceRevisionId,
    parserResultRevisionId: document.parseResult.parseResultId,
    documentRevisionId: document.revision.revisionId,
    document,
  };
}

function projectionState(
  document: TextAuthoringDocument,
  sourceRevisionId: string,
  canonicalRevisionId: string,
  options: BuildAuthoringArtifactProjectionOptions = {},
): TextAuthoringProjectionState {
  const value = buildAuthoringArtifactProjection(document, options);
  return {
    owner: "projection_engine",
    revisionId: stableAuthoringId(
      "projection-revision",
      document.documentId,
      sourceRevisionId,
      canonicalRevisionId,
    ),
    sourceRevisionId,
    canonicalRevisionId,
    value,
  };
}

export function createTextAuthoringServiceState(
  rawText: string,
  options: CreateTextAuthoringServiceStateOptions = {},
): TextAuthoringServiceState {
  const now = options.now ?? new Date().toISOString();
  const document = createTextAuthoringDocument(rawText, options);
  return createTextAuthoringServiceStateFromDocument(document, {
    draftId: options.draftId,
    now,
    projectionOptions: options.projectionOptions,
  });
}

export function createTextAuthoringServiceStateFromDocument(
  sourceDocument: TextAuthoringDocument,
  options: CreateTextAuthoringServiceStateFromDocumentOptions = {},
): TextAuthoringServiceState {
  const document = cloneAuthoringValue(sourceDocument);
  const now = options.now ?? document.updatedAt ?? new Date().toISOString();
  const draftId = options.draftId ?? document.documentId;
  const sourceSnapshot = sourceSnapshotFromDocument(
    document,
    document.rawText,
    document.createdAt ?? now,
  );
  const workingSource: TextAuthoringWorkingSource = {
    owner: "creator_draft",
    sourceSnapshotId: sourceSnapshot.snapshotId,
    revisionId: stableAuthoringId(
      "working-source-revision",
      draftId,
      document.revision.revisionId,
      normalizeAuthoringText(document.rawText),
      document.revisionHistory.length,
    ),
    revisionNumber: Math.max(1, document.revisionHistory.length),
    rawText: document.rawText,
    updatedAt: now,
  };
  const canonicalDraft = canonicalState(document, workingSource.revisionId);
  const projection = projectionState(
    document,
    workingSource.revisionId,
    canonicalDraft.revisionId,
    options.projectionOptions,
  );
  return {
    serviceStateVersion: TEXT_AUTHORING_SERVICE_STATE_VERSION,
    draftId,
    sourceSnapshot,
    workingSource,
    canonicalDraft,
    projection,
    calculation: {
      status: "current",
      sourceRevisionId: workingSource.revisionId,
      completedAt: now,
    },
    saveState: { status: "dirty" },
  };
}

export function hydrateTextAuthoringServiceStateFromRecord(
  record: TextAuthoringStoredServiceRecord,
  options: Pick<
    CreateTextAuthoringServiceStateFromDocumentOptions,
    "projectionOptions"
  > = {},
): TextAuthoringServiceState {
  const state = createTextAuthoringServiceStateFromDocument(record.document, {
    draftId: record.draftId,
    now: record.lastSavedAt,
    projectionOptions: options.projectionOptions,
  });
  if (
    !record.coherentRevisionPair ||
    !record.sourceSnapshot ||
    !record.workingSource ||
    !record.explicitSaveReceipt
  ) {
    return state;
  }
  if (record.workingSource.rawText !== record.document.rawText) {
    throw new Error(
      "Stored Text Authoring working source does not match its durable document.",
    );
  }

  state.sourceSnapshot = cloneAuthoringValue(record.sourceSnapshot);
  state.workingSource = cloneAuthoringValue(record.workingSource);
  state.canonicalDraft = canonicalState(
    state.canonicalDraft.document,
    state.workingSource.revisionId,
  );
  state.projection = projectionState(
    state.canonicalDraft.document,
    state.workingSource.revisionId,
    state.canonicalDraft.revisionId,
    options.projectionOptions,
  );
  state.calculation = {
    status: "current",
    sourceRevisionId: state.workingSource.revisionId,
    completedAt: record.lastSavedAt,
  };
  const hydratedPair = getTextAuthoringRevisionPair(state);
  if (
    JSON.stringify(hydratedPair) !==
      JSON.stringify(record.coherentRevisionPair) ||
    JSON.stringify(hydratedPair) !==
      JSON.stringify(record.explicitSaveReceipt.revisionPair)
  ) {
    throw new Error("Stored Text Authoring revision pair is inconsistent.");
  }
  state.lastExplicitSave = cloneAuthoringValue(record.explicitSaveReceipt);
  state.saveState = { status: "saved", savedAt: record.lastSavedAt };
  if (
    record.readyReceipt &&
    JSON.stringify(record.readyReceipt.revisionPair) ===
      JSON.stringify(hydratedPair)
  ) {
    state.readyReceipt = cloneAuthoringValue(record.readyReceipt);
  }
  return state;
}

export function beginTextAuthoringWorkingSourceEdit(
  source: TextAuthoringServiceState,
  rawText: string,
  now = new Date().toISOString(),
): TextAuthoringServiceState {
  if (rawText === source.workingSource.rawText) return source;
  const state = cloneAuthoringValue(source);
  const revisionNumber = state.workingSource.revisionNumber + 1;
  state.workingSource = {
    ...state.workingSource,
    revisionId: stableAuthoringId(
      "working-source-revision",
      state.draftId,
      state.workingSource.revisionId,
      normalizeAuthoringText(rawText),
      revisionNumber,
    ),
    revisionNumber,
    rawText,
    updatedAt: now,
  };
  state.calculation = {
    status: "calculating",
    sourceRevisionId: state.workingSource.revisionId,
    startedAt: now,
  };
  state.saveState = { status: "dirty" };
  delete state.readyReceipt;
  return state;
}

export function completeTextAuthoringCalculation(
  source: TextAuthoringServiceState,
  sourceRevisionId: string,
  now = new Date().toISOString(),
): TextAuthoringServiceState {
  if (
    source.calculation.status !== "calculating" ||
    source.calculation.sourceRevisionId !== sourceRevisionId ||
    source.workingSource.revisionId !== sourceRevisionId
  ) {
    throw new Error("Text authoring calculation result is stale.");
  }

  const state = cloneAuthoringValue(source);
  const document = applyAuthoringOperation(
    state.canonicalDraft.document,
    {
      type: "sync_working_text_from_input",
      rawText: state.workingSource.rawText,
    },
    { now },
  );
  const canonicalDraft = canonicalState(document, sourceRevisionId);
  state.canonicalDraft = canonicalDraft;
  state.projection = projectionState(
    document,
    sourceRevisionId,
    canonicalDraft.revisionId,
  );
  state.calculation = {
    status: "current",
    sourceRevisionId,
    completedAt: now,
  };
  return state;
}

export function failTextAuthoringCalculation(
  source: TextAuthoringServiceState,
  sourceRevisionId: string,
  message: string,
  now = new Date().toISOString(),
): TextAuthoringServiceState {
  if (source.workingSource.revisionId !== sourceRevisionId) {
    throw new Error("Text authoring calculation failure is stale.");
  }
  const state = cloneAuthoringValue(source);
  state.calculation = {
    status: "failed",
    sourceRevisionId,
    failedAt: now,
    message,
  };
  state.saveState = { status: "dirty" };
  return state;
}

export function getTextAuthoringRevisionPair(
  state: TextAuthoringServiceState,
): TextAuthoringRevisionPair {
  return {
    workingSourceRevisionId: state.workingSource.revisionId,
    canonicalRevisionId: state.canonicalDraft.revisionId,
    parserResultRevisionId: state.canonicalDraft.parserResultRevisionId,
    projectionRevisionId: state.projection.revisionId,
  };
}

export function isTextAuthoringServiceStateCoherent(
  state: TextAuthoringServiceState,
): boolean {
  return (
    state.calculation.status === "current" &&
    state.calculation.sourceRevisionId === state.workingSource.revisionId &&
    state.canonicalDraft.sourceRevisionId === state.workingSource.revisionId &&
    state.projection.sourceRevisionId === state.workingSource.revisionId &&
    state.projection.canonicalRevisionId === state.canonicalDraft.revisionId &&
    state.canonicalDraft.parserResultRevisionId ===
      state.canonicalDraft.document.parseResult.parseResultId &&
    state.canonicalDraft.document.rawText === state.workingSource.rawText
  );
}

export function assertTextAuthoringServiceStateCoherent(
  state: TextAuthoringServiceState,
): TextAuthoringRevisionPair {
  if (!isTextAuthoringServiceStateCoherent(state)) {
    throw new Error(
      "Text authoring durable save requires one current source/canonical/projection revision pair.",
    );
  }
  return getTextAuthoringRevisionPair(state);
}

export function canExplicitlySaveTextAuthoring(
  state: TextAuthoringServiceState,
): boolean {
  return (
    isTextAuthoringServiceStateCoherent(state) &&
    state.saveState.status !== "saving"
  );
}

export function beginTextAuthoringExplicitSave(
  source: TextAuthoringServiceState,
  now = new Date().toISOString(),
): TextAuthoringServiceState {
  assertTextAuthoringServiceStateCoherent(source);
  const state = cloneAuthoringValue(source);
  state.saveState = { status: "saving", requestedAt: now };
  return state;
}

export function createTextAuthoringExplicitSaveReceipt(
  state: TextAuthoringServiceState,
  savedAt = new Date().toISOString(),
  receiptId = stableAuthoringId(
    "explicit-save-receipt",
    state.draftId,
    state.workingSource.revisionId,
    savedAt,
  ),
): TextAuthoringExplicitSaveReceipt {
  return {
    owner: "creator_draft_persistence",
    receiptId,
    draftId: state.draftId,
    savedAt,
    revisionPair: assertTextAuthoringServiceStateCoherent(state),
  };
}

export function markTextAuthoringExplicitSaveSucceeded(
  source: TextAuthoringServiceState,
  receipt: TextAuthoringExplicitSaveReceipt,
): TextAuthoringServiceState {
  const currentPair = assertTextAuthoringServiceStateCoherent(source);
  if (
    receipt.draftId !== source.draftId ||
    JSON.stringify(receipt.revisionPair) !== JSON.stringify(currentPair)
  ) {
    throw new Error(
      "Text authoring explicit save receipt does not match the current revision pair.",
    );
  }
  const state = cloneAuthoringValue(source);
  state.lastExplicitSave = cloneAuthoringValue(receipt);
  state.saveState = { status: "saved", savedAt: receipt.savedAt };
  if (
    state.recovery?.workingSource.revisionId ===
    currentPair.workingSourceRevisionId
  ) {
    delete state.recovery;
  }
  return state;
}

export function markTextAuthoringExplicitSaveFailed(
  source: TextAuthoringServiceState,
  message: string,
  now = new Date().toISOString(),
): TextAuthoringServiceState {
  const state = cloneAuthoringValue(source);
  state.saveState = { status: "save_failed", failedAt: now, message };
  return state;
}

export function createTextAuthoringRecoverySnapshot(
  state: TextAuthoringServiceState,
  recoveredAt = new Date().toISOString(),
  recoveryId = stableAuthoringId(
    "recovery",
    state.draftId,
    state.workingSource.revisionId,
    recoveredAt,
  ),
): TextAuthoringRecoverySnapshot {
  return {
    owner: "local_recovery",
    recoveryId,
    draftId: state.draftId,
    recoveredAt,
    sourceSnapshot: cloneAuthoringValue(state.sourceSnapshot),
    workingSource: cloneAuthoringValue(state.workingSource),
    ...(isTextAuthoringServiceStateCoherent(state)
      ? { currentRevisionPair: getTextAuthoringRevisionPair(state) }
      : {}),
  };
}

export function markTextAuthoringRecoveryStored(
  source: TextAuthoringServiceState,
  recovery: TextAuthoringRecoverySnapshot,
): TextAuthoringServiceState {
  if (
    recovery.draftId !== source.draftId ||
    recovery.workingSource.revisionId !== source.workingSource.revisionId
  ) {
    throw new Error(
      "Text authoring recovery does not match the current working source.",
    );
  }
  const state = cloneAuthoringValue(source);
  state.recovery = cloneAuthoringValue(recovery);
  return state;
}

function hasBlockingAuthoringIssues(state: TextAuthoringServiceState): boolean {
  return state.canonicalDraft.document.parseResult.issues.some(
    (issue) => issue.blocking && !issue.decision && !issue.resolution,
  );
}

export function canMarkTextAuthoringReady(
  state: TextAuthoringServiceState,
): boolean {
  if (!isTextAuthoringServiceStateCoherent(state)) return false;
  if (!state.lastExplicitSave || state.saveState.status !== "saved")
    return false;
  if (hasBlockingAuthoringIssues(state)) return false;
  return (
    JSON.stringify(state.lastExplicitSave.revisionPair) ===
    JSON.stringify(getTextAuthoringRevisionPair(state))
  );
}

export function markTextAuthoringReady(
  source: TextAuthoringServiceState,
  markedAt = new Date().toISOString(),
  receiptId = stableAuthoringId(
    "ready-receipt",
    source.draftId,
    source.workingSource.revisionId,
    markedAt,
  ),
): TextAuthoringServiceState {
  if (!canMarkTextAuthoringReady(source) || !source.lastExplicitSave) {
    throw new Error(
      "Text authoring ready status requires the current explicit saved revision.",
    );
  }
  const explicitSave = cloneAuthoringValue(source.lastExplicitSave);
  const state = cloneAuthoringValue(source);
  state.readyReceipt = {
    owner: "creator_workflow_seam",
    receiptId,
    draftId: state.draftId,
    markedAt,
    explicitSaveReceiptId: explicitSave.receiptId,
    revisionPair: cloneAuthoringValue(explicitSave.revisionPair),
    sideEffects: { publish: 0, network: 0, p35: 0 },
  };
  return state;
}

export function invalidateTextAuthoringReady(
  source: TextAuthoringServiceState,
): TextAuthoringServiceState {
  if (!source.readyReceipt) return source;
  const state = cloneAuthoringValue(source);
  delete state.readyReceipt;
  return state;
}
