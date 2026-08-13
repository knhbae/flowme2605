import { isAuthoringIssueOutstanding } from "./issue-state";
import {
  deriveAuthoringLifecycleStatus,
  evaluateAuthoringWritePolicy,
} from "./review-policy";
import { createAuthoringSourceSnapshotRef } from "./source-update";
import {
  assertTextAuthoringServiceStateCoherent,
  createTextAuthoringExplicitSaveReceipt,
  createTextAuthoringRecoverySnapshot,
  createTextAuthoringServiceStateFromDocument,
  type TextAuthoringExplicitSaveReceipt,
  type TextAuthoringReadyReceipt,
  type TextAuthoringRecoverySnapshot,
  type TextAuthoringRevisionPair,
  type TextAuthoringServiceState,
  type TextAuthoringSourceSnapshot,
  type TextAuthoringWorkingSource,
} from "./service-state";
import type {
  DraftRevision,
  TextAuthoringDocument,
  UnresolvedAuthoringIssue,
} from "./types";

export const TEXT_AUTHORING_DRAFTS_STORAGE_KEY =
  "flow:text-authoring:drafts:v1";
export const TEXT_AUTHORING_STORAGE_SCHEMA_VERSION = 1 as const;
export const TEXT_AUTHORING_MAX_SAVED_HISTORY = 5;
export const TEXT_AUTHORING_MAX_PERSISTED_REVISIONS = 8;

export type TextAuthoringStorageWriteErrorCode =
  "quota_exceeded" | "write_failed";

export type TextAuthoringStorageReadErrorCode =
  "read_failed" | "corrupted" | "schema_mismatch";

export class TextAuthoringStorageReadError extends Error {
  readonly code: TextAuthoringStorageReadErrorCode;
  readonly storageKey: string;
  readonly existingValuePreserved = true;
  readonly originalError: unknown;

  constructor(options: {
    code: TextAuthoringStorageReadErrorCode;
    storageKey: string;
    originalError: unknown;
  }) {
    super(
      `Text authoring storage read failed (${options.code}) for ` +
        `"${options.storageKey}". The existing saved value was preserved.`,
    );
    this.name = "TextAuthoringStorageReadError";
    this.code = options.code;
    this.storageKey = options.storageKey;
    this.originalError = options.originalError;
  }
}

export class TextAuthoringStorageWriteError extends Error {
  readonly code: TextAuthoringStorageWriteErrorCode;
  readonly storageKey: string;
  readonly attemptedBytes: number;
  readonly previousValuePreserved: boolean;
  readonly originalError: unknown;

  constructor(options: {
    code: TextAuthoringStorageWriteErrorCode;
    storageKey: string;
    attemptedBytes: number;
    previousValuePreserved: boolean;
    originalError: unknown;
  }) {
    const preservation = options.previousValuePreserved
      ? "The previous saved value was preserved."
      : "The previous saved value could not be confirmed after rollback.";
    super(
      `Text authoring storage write failed (${options.code}) for ` +
        `"${options.storageKey}" after ${options.attemptedBytes} bytes. ${preservation}`,
    );
    this.name = "TextAuthoringStorageWriteError";
    this.code = options.code;
    this.storageKey = options.storageKey;
    this.attemptedBytes = options.attemptedBytes;
    this.previousValuePreserved = options.previousValuePreserved;
    this.originalError = options.originalError;
  }
}

export type TextAuthoringDraftStatus =
  "draft" | "needs_review" | "previewed" | "ready" | "archived";

export type TextAuthoringStage = "input" | "structure" | "result";

export type TextAuthoringStorageAdapter = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type TextAuthoringDraftHistoryKind =
  "saved" | "duplicated" | "archived" | "restored";

export type TextAuthoringDraftHistoryEntry = {
  versionId: string;
  kind: TextAuthoringDraftHistoryKind;
  savedAt: string;
  revisionId: string;
  document: TextAuthoringDocument;
};

export type TextAuthoringDraftRecord = {
  draftId: string;
  title: string;
  ownership: TextAuthoringDocument["ownership"];
  status: TextAuthoringDraftStatus;
  document: TextAuthoringDocument;
  revisionId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  lastSavedAt: string;
  activeStage?: TextAuthoringStage;
  focusTarget?: string;
  selectedItemId?: string;
  primaryArtifact?: string;
  /** Present only for a durable save that passed the P0 revision-pair gate. */
  coherentRevisionPair?: TextAuthoringRevisionPair;
  sourceSnapshot?: TextAuthoringSourceSnapshot;
  workingSource?: TextAuthoringWorkingSource;
  explicitSaveReceipt?: TextAuthoringExplicitSaveReceipt;
  /** Status-only handoff receipt. It has no publish, network, or P35 effect. */
  readyReceipt?: TextAuthoringReadyReceipt;
  history: TextAuthoringDraftHistoryEntry[];
};

export type TextAuthoringDraftSummary = Omit<
  TextAuthoringDraftRecord,
  "document" | "history"
> & {
  stepCount: number;
  itemCount: number;
  unresolvedIssueCount: number;
  hasRecovery: boolean;
};

export type TextAuthoringRecoveryRecord = {
  recoveryId: string;
  draftId: string;
  document: TextAuthoringDocument;
  revisionId: string;
  /** Recovery time. This is deliberately not an explicit saved time. */
  recoveredAt: string;
  /** @deprecated Compatibility alias for records written before P0-01. */
  savedAt: string;
  serviceRecovery?: TextAuthoringRecoverySnapshot;
  activeStage: TextAuthoringStage;
  focusTarget?: string;
  selectedItemId?: string;
  primaryArtifact?: string;
};

export type TextAuthoringDraftListOptions = {
  query?: string;
  ownership?: TextAuthoringDocument["ownership"];
  status?: TextAuthoringDraftStatus | TextAuthoringDraftStatus[];
  includeArchived?: boolean;
};

export type SaveTextAuthoringDraftOptions = {
  draftId?: string;
  title?: string;
  status?: Exclude<TextAuthoringDraftStatus, "archived" | "ready">;
  activeStage?: TextAuthoringStage;
  focusTarget?: string;
  selectedItemId?: string;
  primaryArtifact?: string;
};

export type AutosaveTextAuthoringDraftOptions = {
  draftId?: string;
  activeStage?: TextAuthoringStage;
  focusTarget?: string;
  selectedItemId?: string;
  primaryArtifact?: string;
};

export type DuplicateTextAuthoringDraftOptions = {
  draftId?: string;
  documentId?: string;
  title?: string;
};

export type TextAuthoringDraftRepositoryOptions = {
  key?: string;
  now?: () => string;
  idFactory?: (prefix: string) => string;
};

type PersistedTextAuthoringState = {
  schemaVersion: typeof TEXT_AUTHORING_STORAGE_SCHEMA_VERSION;
  drafts: Record<string, TextAuthoringDraftRecord>;
  recoveries: Record<string, TextAuthoringRecoveryRecord>;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sameRevisionPair(
  left: TextAuthoringRevisionPair | undefined,
  right: TextAuthoringRevisionPair | undefined,
): boolean {
  return (
    Boolean(left) &&
    Boolean(right) &&
    left?.workingSourceRevisionId === right?.workingSourceRevisionId &&
    left?.canonicalRevisionId === right?.canonicalRevisionId &&
    left?.parserResultRevisionId === right?.parserResultRevisionId &&
    left?.projectionRevisionId === right?.projectionRevisionId
  );
}

function emptyState(): PersistedTextAuthoringState {
  return {
    schemaVersion: TEXT_AUTHORING_STORAGE_SCHEMA_VERSION,
    drafts: {},
    recoveries: {},
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPersistedState(
  value: unknown,
): value is PersistedTextAuthoringState {
  if (!isObject(value)) return false;
  return (
    value.schemaVersion === TEXT_AUTHORING_STORAGE_SCHEMA_VERSION &&
    isObject(value.drafts) &&
    isObject(value.recoveries)
  );
}

function getRevisionId(document: TextAuthoringDocument): string {
  const revision = document.revision as unknown;
  if (isObject(revision) && typeof revision.revisionId === "string") {
    return revision.revisionId;
  }
  return `${document.documentId}:revision`;
}

function boundRevisionHistory(revisions: DraftRevision[]): DraftRevision[] {
  return revisions.slice(-TEXT_AUTHORING_MAX_PERSISTED_REVISIONS).map(clone);
}

function normalizeStoredDocument(
  value: TextAuthoringDocument,
): TextAuthoringDocument {
  const sourceRevisions = Array.isArray(value.revisionHistory)
    ? value.revisionHistory
    : [];
  const document: TextAuthoringDocument = clone({
    ...value,
    revisionHistory: [] as DraftRevision[],
  });
  document.revisionHistory = boundRevisionHistory(sourceRevisions);
  document.lifecycleStatus = deriveAuthoringLifecycleStatus(
    document,
    document.lifecycleStatus,
  );
  return document;
}

function compactHistoryDocument(
  value: TextAuthoringDocument,
): TextAuthoringDocument {
  const document = normalizeStoredDocument(value);
  const revision = clone(document.revision);
  delete revision.before;
  document.revision = revision;
  document.revisionHistory = [clone(revision)];
  return document;
}

function boundSavedHistory(
  history: TextAuthoringDraftHistoryEntry[],
): TextAuthoringDraftHistoryEntry[] {
  return history.slice(-TEXT_AUTHORING_MAX_SAVED_HISTORY).map((entry) => ({
    ...clone(entry),
    document: compactHistoryDocument(entry.document),
  }));
}

function storageWriteErrorCode(
  error: unknown,
): TextAuthoringStorageWriteErrorCode {
  if (
    isObject(error) &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014)
  ) {
    return "quota_exceeded";
  }
  return "write_failed";
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function getDocumentTitle(document: TextAuthoringDocument): string {
  if (document.title.trim()) return document.title.trim();
  const flow = document.parseResult.canonical.flow as unknown;
  if (isObject(flow) && typeof flow.title === "string" && flow.title.trim()) {
    return flow.title.trim();
  }

  const firstLine = document.rawText
    .split(/\r?\n/u)
    .map((line) => line.replace(/^#{1,6}\s+/u, "").trim())
    .find(Boolean);
  return firstLine || "제목 없는 Flow";
}

function getIssueCount(document: TextAuthoringDocument): number {
  const issues = document.parseResult.issues as unknown;
  return Array.isArray(issues)
    ? issues.filter(
        (issue) =>
          !isObject(issue) ||
          isAuthoringIssueOutstanding(issue as UnresolvedAuthoringIssue),
      ).length
    : 0;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("ko-KR");
}

function matchesListOptions(
  record: TextAuthoringDraftRecord,
  options: TextAuthoringDraftListOptions,
): boolean {
  if (!options.includeArchived && record.status === "archived") return false;
  if (options.ownership && record.ownership !== options.ownership) return false;
  if (options.status) {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];
    if (!statuses.includes(record.status)) return false;
  }

  const query = normalizeSearch(options.query ?? "");
  if (!query) return true;
  return normalizeSearch(
    `${record.title}\n${record.document.rawText}`,
  ).includes(query);
}

function replaceDocumentIdentity(
  value: unknown,
  previousDocumentId: string,
  nextDocumentId: string,
): void {
  if (Array.isArray(value)) {
    for (const entry of value)
      replaceDocumentIdentity(entry, previousDocumentId, nextDocumentId);
    return;
  }
  if (!isObject(value)) return;

  if (value.documentId === previousDocumentId)
    value.documentId = nextDocumentId;
  for (const nested of Object.values(value)) {
    replaceDocumentIdentity(nested, previousDocumentId, nextDocumentId);
  }
}

function replaceSourceSnapshotIdentity(
  value: unknown,
  previousSnapshotId: string,
  nextSnapshotId: string,
): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      replaceSourceSnapshotIdentity(entry, previousSnapshotId, nextSnapshotId);
    }
    return;
  }
  if (!isObject(value)) return;

  for (const [key, nested] of Object.entries(value)) {
    if (
      (key === "snapshotId" || key === "sourceSnapshotId") &&
      nested === previousSnapshotId
    ) {
      value[key] = nextSnapshotId;
      continue;
    }
    replaceSourceSnapshotIdentity(nested, previousSnapshotId, nextSnapshotId);
  }
}

const TEXT_AUTHORING_COPY_TITLE_PATTERN = /^사본\s+([1-9]\d*)\s*·\s*(.+)$/u;

function copyTitleBase(value: string): string {
  let base = value.trim();
  let match = TEXT_AUTHORING_COPY_TITLE_PATTERN.exec(base);
  while (match) {
    base = match[2].trim();
    match = TEXT_AUTHORING_COPY_TITLE_PATTERN.exec(base);
  }
  return base || "제목 없는 Flow";
}

function nextCopyTitle(
  sourceTitle: string,
  records: Iterable<TextAuthoringDraftRecord>,
): string {
  const base = copyTitleBase(sourceTitle);
  const used = new Set<number>();
  for (const record of records) {
    const match = TEXT_AUTHORING_COPY_TITLE_PATTERN.exec(record.title.trim());
    if (!match || copyTitleBase(match[2]) !== base) continue;
    used.add(Number(match[1]));
  }
  let copyNumber = 1;
  while (used.has(copyNumber)) copyNumber += 1;
  return `사본 ${copyNumber} · ${base}`;
}

function duplicateDocument(
  document: TextAuthoringDocument,
  documentId: string,
  revisionId: string,
  sourceSnapshotId: string,
  timestamp: string,
): TextAuthoringDocument {
  const duplicated = clone(document);
  const previousDocumentId = duplicated.documentId;
  const previousSourceSnapshotId = duplicated.sourceState?.active.snapshotId;
  duplicated.documentId = documentId;
  replaceDocumentIdentity(
    duplicated.parseResult,
    previousDocumentId,
    documentId,
  );
  if (duplicated.sourceState && duplicated.sourceState.status !== "current") {
    replaceDocumentIdentity(
      duplicated.sourceState.incoming.parseResult,
      previousDocumentId,
      documentId,
    );
  }
  if (previousSourceSnapshotId) {
    replaceSourceSnapshotIdentity(
      duplicated,
      previousSourceSnapshotId,
      sourceSnapshotId,
    );
  }
  const nextSourceSnapshot =
    previousSourceSnapshotId && document.sourceState?.active
      ? {
          ...clone(document.sourceState.active),
          snapshotId: sourceSnapshotId,
          capturedAt: timestamp,
        }
      : {
          ...createAuthoringSourceSnapshotRef(duplicated, {
            capturedAt: timestamp,
          }),
          snapshotId: sourceSnapshotId,
        };
  duplicated.sourceState = duplicated.sourceState
    ? {
        ...duplicated.sourceState,
        active: nextSourceSnapshot,
      }
    : {
        status: "current",
        active: nextSourceSnapshot,
      };
  duplicated.parseResult.canonical.sourceRows.forEach((row) => {
    if (
      !row.sourceSnapshotId ||
      row.sourceSnapshotId === previousSourceSnapshotId
    ) {
      row.sourceSnapshotId = sourceSnapshotId;
    }
  });
  duplicated.parseResult.blocks.forEach((block) => {
    if (
      !block.sourceSnapshotId ||
      block.sourceSnapshotId === previousSourceSnapshotId
    ) {
      block.sourceSnapshotId = sourceSnapshotId;
    }
  });
  duplicated.reviewGates?.forEach((gate) => {
    if (
      !gate.sourceSnapshotId ||
      gate.sourceSnapshotId === previousSourceSnapshotId
    ) {
      gate.sourceSnapshotId = sourceSnapshotId;
    }
  });

  const previousRevision = isObject(duplicated.revision)
    ? duplicated.revision
    : {};
  const nextRevision = {
    ...previousRevision,
    revisionId,
    parentRevisionId: undefined,
    operations: [],
    actorLane: duplicated.ownership,
    timestamp,
  };
  duplicated.revision = nextRevision as TextAuthoringDocument["revision"];
  duplicated.revisionHistory = [
    clone(nextRevision) as TextAuthoringDocument["revisionHistory"][number],
  ];
  duplicated.createdAt = timestamp;
  duplicated.updatedAt = timestamp;
  return duplicated;
}

let fallbackIdSequence = 0;

function defaultIdFactory(prefix: string): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `${prefix}-${randomUuid}`;
  fallbackIdSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackIdSequence.toString(36)}`;
}

export function createMemoryTextAuthoringStorage(
  initial: Record<string, string> = {},
): TextAuthoringStorageAdapter {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

export function getDefaultTextAuthoringStorage():
  TextAuthoringStorageAdapter | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

export function createTextAuthoringDraftRepository(
  storage: TextAuthoringStorageAdapter,
  options: TextAuthoringDraftRepositoryOptions = {},
) {
  const key = options.key ?? TEXT_AUTHORING_DRAFTS_STORAGE_KEY;
  const now = options.now ?? (() => new Date().toISOString());
  const idFactory = options.idFactory ?? defaultIdFactory;

  function read(): PersistedTextAuthoringState {
    let raw: string | null;
    try {
      raw = storage.getItem(key);
    } catch (error) {
      throw new TextAuthoringStorageReadError({
        code: "read_failed",
        storageKey: key,
        originalError: error,
      });
    }
    if (raw === null) return emptyState();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch (error) {
      throw new TextAuthoringStorageReadError({
        code: "corrupted",
        storageKey: key,
        originalError: error,
      });
    }

    if (!isPersistedState(parsed)) {
      const code =
        isObject(parsed) &&
        "schemaVersion" in parsed &&
        parsed.schemaVersion !== TEXT_AUTHORING_STORAGE_SCHEMA_VERSION
          ? "schema_mismatch"
          : "corrupted";
      throw new TextAuthoringStorageReadError({
        code,
        storageKey: key,
        originalError: parsed,
      });
    }

    try {
      Object.values(parsed.drafts).forEach((record) => {
        record.document = normalizeStoredDocument(record.document);
        record.history = boundSavedHistory(
          Array.isArray(record.history) ? record.history : [],
        );
        if (
          record.status !== "archived" &&
          !(record.status === "ready" && record.readyReceipt)
        ) {
          record.status = record.document.lifecycleStatus;
        }
      });
      Object.values(parsed.recoveries).forEach((recovery) => {
        recovery.document = normalizeStoredDocument(recovery.document);
        recovery.recoveredAt = recovery.recoveredAt ?? recovery.savedAt;
        recovery.savedAt = recovery.savedAt ?? recovery.recoveredAt;
      });
      return parsed;
    } catch (error) {
      throw new TextAuthoringStorageReadError({
        code: "corrupted",
        storageKey: key,
        originalError: error,
      });
    }
  }

  function write(state: PersistedTextAuthoringState): void {
    const previousRaw = storage.getItem(key);
    let nextRaw: string;
    try {
      nextRaw = JSON.stringify(state);
    } catch (error) {
      throw new TextAuthoringStorageWriteError({
        code: "write_failed",
        storageKey: key,
        attemptedBytes: 0,
        previousValuePreserved: true,
        originalError: error,
      });
    }

    try {
      storage.setItem(key, nextRaw);
    } catch (error) {
      let previousValuePreserved = false;
      try {
        const currentRaw = storage.getItem(key);
        if (currentRaw === previousRaw) {
          previousValuePreserved = true;
        } else if (previousRaw === null) {
          try {
            storage.removeItem(key);
          } catch {
            // Verify below because an adapter may mutate and then throw.
          }
          previousValuePreserved = storage.getItem(key) === null;
        } else {
          try {
            storage.setItem(key, previousRaw);
          } catch {
            // Verify below because an adapter may mutate and then throw.
          }
          previousValuePreserved = storage.getItem(key) === previousRaw;
        }
      } catch {
        previousValuePreserved = false;
      }
      throw new TextAuthoringStorageWriteError({
        code: storageWriteErrorCode(error),
        storageKey: key,
        attemptedBytes: utf8ByteLength(nextRaw),
        previousValuePreserved,
        originalError: error,
      });
    }
  }

  function historyEntry(
    document: TextAuthoringDocument,
    kind: TextAuthoringDraftHistoryKind,
    savedAt: string,
  ): TextAuthoringDraftHistoryEntry {
    return {
      versionId: idFactory("draft-version"),
      kind,
      savedAt,
      revisionId: getRevisionId(document),
      document: compactHistoryDocument(document),
    };
  }

  function saveDocument(
    document: TextAuthoringDocument,
    saveOptions: SaveTextAuthoringDraftOptions = {},
    coherent?: {
      state: TextAuthoringServiceState;
      revisionPair: TextAuthoringRevisionPair;
      receipt: TextAuthoringExplicitSaveReceipt;
    },
  ): TextAuthoringDraftRecord {
    const state = read();
    const draftId = saveOptions.draftId ?? document.documentId;
    const timestamp = coherent?.receipt.savedAt ?? now();
    const existing = state.drafts[draftId];
    const revisionId = getRevisionId(document);
    const preferredStatus: Exclude<
      TextAuthoringDraftStatus,
      "archived" | "ready"
    > =
      saveOptions.status ??
      (existing?.status === "needs_review" || existing?.status === "previewed"
        ? existing.status
        : "draft");
    const storedDocument = normalizeStoredDocument(document);
    const policy = evaluateAuthoringWritePolicy(
      storedDocument,
      "save_local_draft",
    );
    const status = policy.needsReview ? "needs_review" : preferredStatus;
    storedDocument.lifecycleStatus = status;
    const historyDocument = compactHistoryDocument(storedDocument);
    const sameRevision =
      existing?.history.at(-1)?.revisionId === revisionId &&
      JSON.stringify(existing.history.at(-1)?.document) ===
        JSON.stringify(historyDocument);
    const history = existing?.history.map(clone) ?? [];
    if (!sameRevision)
      history.push(historyEntry(storedDocument, "saved", timestamp));
    const preservedReadyReceipt =
      coherent &&
      sameRevisionPair(
        existing?.readyReceipt?.revisionPair,
        coherent.revisionPair,
      )
        ? existing?.readyReceipt
        : undefined;

    const record: TextAuthoringDraftRecord = {
      draftId,
      title:
        saveOptions.title?.trim() ||
        existing?.title ||
        getDocumentTitle(document),
      ownership: document.ownership,
      status: preservedReadyReceipt ? "ready" : status,
      document: storedDocument,
      revisionId,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastSavedAt: timestamp,
      history: boundSavedHistory(history),
      ...(saveOptions.activeStage || existing?.activeStage
        ? { activeStage: saveOptions.activeStage ?? existing?.activeStage }
        : {}),
      ...(saveOptions.focusTarget || existing?.focusTarget
        ? { focusTarget: saveOptions.focusTarget ?? existing?.focusTarget }
        : {}),
      ...(saveOptions.selectedItemId || existing?.selectedItemId
        ? {
            selectedItemId:
              saveOptions.selectedItemId ?? existing?.selectedItemId,
          }
        : {}),
      ...(saveOptions.primaryArtifact || existing?.primaryArtifact
        ? {
            primaryArtifact:
              saveOptions.primaryArtifact ?? existing?.primaryArtifact,
          }
        : {}),
      ...(coherent
        ? {
            coherentRevisionPair: clone(coherent.revisionPair),
            sourceSnapshot: clone(coherent.state.sourceSnapshot),
            workingSource: clone(coherent.state.workingSource),
            explicitSaveReceipt: clone(coherent.receipt),
          }
        : {}),
      ...(preservedReadyReceipt
        ? { readyReceipt: clone(preservedReadyReceipt) }
        : {}),
    };

    state.drafts[draftId] = record;
    delete state.recoveries[draftId];
    write(state);
    return clone(record);
  }

  function save(
    document: TextAuthoringDocument,
    saveOptions: SaveTextAuthoringDraftOptions = {},
  ): TextAuthoringDraftRecord {
    return saveDocument(document, saveOptions);
  }

  function saveCoherentDraft(
    serviceState: TextAuthoringServiceState,
    saveOptions: SaveTextAuthoringDraftOptions = {},
  ): TextAuthoringDraftRecord {
    if (saveOptions.draftId && saveOptions.draftId !== serviceState.draftId) {
      throw new Error(
        "Text authoring coherent save cannot change draft identity.",
      );
    }
    const revisionPair = assertTextAuthoringServiceStateCoherent(serviceState);
    const savedAt = now();
    const receipt = createTextAuthoringExplicitSaveReceipt(
      serviceState,
      savedAt,
      idFactory("explicit-save-receipt"),
    );
    return saveDocument(
      serviceState.canonicalDraft.document,
      {
        ...saveOptions,
        draftId: saveOptions.draftId ?? serviceState.draftId,
      },
      { state: serviceState, revisionPair, receipt },
    );
  }

  function load(draftId: string): TextAuthoringDraftRecord | undefined {
    const record = read().drafts[draftId];
    return record ? clone(record) : undefined;
  }

  function listRecords(
    listOptions: TextAuthoringDraftListOptions = {},
  ): TextAuthoringDraftRecord[] {
    return Object.values(read().drafts)
      .filter((record) => matchesListOptions(record, listOptions))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(clone);
  }

  function list(
    listOptions: TextAuthoringDraftListOptions = {},
  ): TextAuthoringDraftSummary[] {
    const state = read();
    return Object.values(state.drafts)
      .filter((record) => matchesListOptions(record, listOptions))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => {
        const { document: _document, history: _history, ...summary } = record;
        return {
          ...clone(summary),
          stepCount: record.document.parseResult.canonical.steps.length,
          itemCount: record.document.parseResult.canonical.items.length,
          unresolvedIssueCount: getIssueCount(record.document),
          hasRecovery: Boolean(state.recoveries[record.draftId]),
        };
      });
  }

  function autosave(
    document: TextAuthoringDocument,
    autosaveOptions: AutosaveTextAuthoringDraftOptions = {},
  ): TextAuthoringRecoveryRecord {
    const state = read();
    const draftId = autosaveOptions.draftId ?? document.documentId;
    const recoveredAt = now();
    const recovery: TextAuthoringRecoveryRecord = {
      recoveryId: idFactory("recovery"),
      draftId,
      document: normalizeStoredDocument(document),
      revisionId: getRevisionId(document),
      recoveredAt,
      savedAt: recoveredAt,
      activeStage: autosaveOptions.activeStage ?? "input",
      ...(autosaveOptions.focusTarget
        ? { focusTarget: autosaveOptions.focusTarget }
        : {}),
      ...(autosaveOptions.selectedItemId
        ? { selectedItemId: autosaveOptions.selectedItemId }
        : {}),
      ...(autosaveOptions.primaryArtifact
        ? { primaryArtifact: autosaveOptions.primaryArtifact }
        : {}),
    };
    state.recoveries[draftId] = recovery;
    write(state);
    return clone(recovery);
  }

  function saveCoherentRecovery(
    serviceState: TextAuthoringServiceState,
    autosaveOptions: AutosaveTextAuthoringDraftOptions = {},
  ): TextAuthoringRecoveryRecord {
    if (
      autosaveOptions.draftId &&
      autosaveOptions.draftId !== serviceState.draftId
    ) {
      throw new Error(
        "Text authoring coherent recovery cannot change draft identity.",
      );
    }
    const state = read();
    const draftId = autosaveOptions.draftId ?? serviceState.draftId;
    const recoveredAt = now();
    const serviceRecovery = createTextAuthoringRecoverySnapshot(
      serviceState,
      recoveredAt,
      idFactory("recovery"),
    );
    const recovery: TextAuthoringRecoveryRecord = {
      recoveryId: serviceRecovery.recoveryId,
      draftId,
      document: normalizeStoredDocument(serviceState.canonicalDraft.document),
      revisionId: serviceState.workingSource.revisionId,
      recoveredAt,
      savedAt: recoveredAt,
      serviceRecovery,
      activeStage: autosaveOptions.activeStage ?? "input",
      ...(autosaveOptions.focusTarget
        ? { focusTarget: autosaveOptions.focusTarget }
        : {}),
      ...(autosaveOptions.selectedItemId
        ? { selectedItemId: autosaveOptions.selectedItemId }
        : {}),
      ...(autosaveOptions.primaryArtifact
        ? { primaryArtifact: autosaveOptions.primaryArtifact }
        : {}),
    };
    state.recoveries[draftId] = recovery;
    write(state);
    return clone(recovery);
  }

  function loadRecovery(
    draftId?: string,
  ): TextAuthoringRecoveryRecord | undefined {
    const recoveries = Object.values(read().recoveries);
    const recovery = draftId
      ? recoveries.find((entry) => entry.draftId === draftId)
      : recoveries.sort((left, right) =>
          right.recoveredAt.localeCompare(left.recoveredAt),
        )[0];
    return recovery ? clone(recovery) : undefined;
  }

  function loadNewerRecovery(
    draftId: string,
  ): TextAuthoringRecoveryRecord | undefined {
    const state = read();
    const recovery = state.recoveries[draftId];
    if (!recovery) return undefined;
    const durable = state.drafts[draftId];
    if (durable && recovery.recoveredAt <= durable.lastSavedAt) {
      return undefined;
    }
    return clone(recovery);
  }

  function clearRecovery(draftId: string): void {
    const state = read();
    if (!state.recoveries[draftId]) return;
    delete state.recoveries[draftId];
    write(state);
  }

  function duplicate(
    draftId: string,
    duplicateOptions: DuplicateTextAuthoringDraftOptions = {},
  ): TextAuthoringDraftRecord {
    const state = read();
    const source = state.drafts[draftId];
    if (!source) throw new Error(`Text authoring draft not found: ${draftId}`);

    const timestamp = now();
    const nextDraftId = duplicateOptions.draftId ?? idFactory("draft");
    const documentId = duplicateOptions.documentId ?? idFactory("document");
    const revisionId = idFactory("revision");
    const sourceSnapshotId = idFactory("source-snapshot");
    if (state.drafts[nextDraftId]) {
      throw new Error(`Text authoring draft already exists: ${nextDraftId}`);
    }
    const document = duplicateDocument(
      source.document,
      documentId,
      revisionId,
      sourceSnapshotId,
      timestamp,
    );
    document.lifecycleStatus = "draft";
    const duplicateServiceState = createTextAuthoringServiceStateFromDocument(
      document,
      { draftId: nextDraftId, now: timestamp },
    );
    const duplicated: TextAuthoringDraftRecord = {
      draftId: nextDraftId,
      title:
        duplicateOptions.title?.trim() ||
        nextCopyTitle(source.title, Object.values(state.drafts)),
      ownership: source.ownership,
      status: document.lifecycleStatus,
      document,
      revisionId,
      createdAt: timestamp,
      updatedAt: timestamp,
      // A copy is a new dirty draft, not a new explicit save. Keep the
      // source's last durable save time until this copy is explicitly saved.
      lastSavedAt: source.lastSavedAt,
      sourceSnapshot: clone(duplicateServiceState.sourceSnapshot),
      workingSource: clone(duplicateServiceState.workingSource),
      activeStage: source.activeStage,
      focusTarget: source.focusTarget,
      selectedItemId: source.selectedItemId,
      primaryArtifact: source.primaryArtifact,
      history: [historyEntry(document, "duplicated", timestamp)],
    };
    state.drafts[nextDraftId] = duplicated;
    write(state);
    return clone(duplicated);
  }

  function setArchived(
    draftId: string,
    archived: boolean,
  ): TextAuthoringDraftRecord {
    const state = read();
    const existing = state.drafts[draftId];
    if (!existing)
      throw new Error(`Text authoring draft not found: ${draftId}`);
    const timestamp = now();
    const document = clone(existing.document);
    document.lifecycleStatus = archived
      ? "archived"
      : deriveAuthoringLifecycleStatus(document, "draft");
    const record: TextAuthoringDraftRecord = {
      ...existing,
      status: document.lifecycleStatus,
      document,
      updatedAt: timestamp,
      ...(archived ? { archivedAt: timestamp } : {}),
      history: [
        ...existing.history,
        historyEntry(document, archived ? "archived" : "restored", timestamp),
      ].slice(-TEXT_AUTHORING_MAX_SAVED_HISTORY),
    };
    if (!archived) delete record.archivedAt;
    delete record.readyReceipt;
    state.drafts[draftId] = record;
    write(state);
    return clone(record);
  }

  function getHistory(draftId: string): TextAuthoringDraftHistoryEntry[] {
    return load(draftId)?.history ?? [];
  }

  function rename(draftId: string, title: string): TextAuthoringDraftRecord {
    const nextTitle = title.trim();
    if (!nextTitle) {
      throw new Error("Text authoring draft title must not be blank.");
    }
    const state = read();
    const existing = state.drafts[draftId];
    if (!existing)
      throw new Error(`Text authoring draft not found: ${draftId}`);
    if (existing.title === nextTitle) return clone(existing);
    const record: TextAuthoringDraftRecord = {
      ...existing,
      title: nextTitle,
      updatedAt: now(),
    };
    state.drafts[draftId] = record;
    write(state);
    return clone(record);
  }

  function markReady(draftId: string): TextAuthoringDraftRecord {
    const state = read();
    const existing = state.drafts[draftId];
    if (!existing)
      throw new Error(`Text authoring draft not found: ${draftId}`);
    if (
      !existing.coherentRevisionPair ||
      !existing.explicitSaveReceipt ||
      !sameRevisionPair(
        existing.coherentRevisionPair,
        existing.explicitSaveReceipt.revisionPair,
      )
    ) {
      throw new Error(
        "Text authoring ready status requires one coherent explicit saved revision.",
      );
    }
    const hasBlockingIssue = existing.document.parseResult.issues.some(
      (issue) => issue.blocking && !issue.decision && !issue.resolution,
    );
    if (hasBlockingIssue) {
      throw new Error(
        "Text authoring ready status is blocked by an unresolved issue.",
      );
    }
    if (existing.readyReceipt) return clone(existing);
    const markedAt = now();
    const readyReceipt: TextAuthoringReadyReceipt = {
      owner: "creator_workflow_seam",
      receiptId: idFactory("ready-receipt"),
      draftId,
      markedAt,
      explicitSaveReceiptId: existing.explicitSaveReceipt.receiptId,
      revisionPair: clone(existing.coherentRevisionPair),
      sideEffects: { publish: 0, network: 0, p35: 0 },
    };
    const record: TextAuthoringDraftRecord = {
      ...existing,
      status: "ready",
      updatedAt: markedAt,
      readyReceipt,
    };
    state.drafts[draftId] = record;
    write(state);
    return clone(record);
  }

  function invalidateReady(draftId: string): TextAuthoringDraftRecord {
    const state = read();
    const existing = state.drafts[draftId];
    if (!existing)
      throw new Error(`Text authoring draft not found: ${draftId}`);
    if (!existing.readyReceipt && existing.status !== "ready")
      return clone(existing);
    const record: TextAuthoringDraftRecord = {
      ...existing,
      status: deriveAuthoringLifecycleStatus(existing.document, "draft"),
      updatedAt: now(),
    };
    delete record.readyReceipt;
    state.drafts[draftId] = record;
    write(state);
    return clone(record);
  }

  function restoreVersion(
    draftId: string,
    versionId: string,
  ): TextAuthoringDraftRecord {
    const existing = load(draftId);
    if (!existing)
      throw new Error(`Text authoring draft not found: ${draftId}`);
    const version = existing.history.find(
      (entry) => entry.versionId === versionId,
    );
    if (!version)
      throw new Error(`Text authoring draft version not found: ${versionId}`);
    return save(version.document, {
      draftId,
      title: existing.title,
      status:
        existing.status === "archived" || existing.status === "ready"
          ? "draft"
          : existing.status,
      activeStage: existing.activeStage,
      focusTarget: existing.focusTarget,
      selectedItemId: existing.selectedItemId,
      primaryArtifact: existing.primaryArtifact,
    });
  }

  return {
    key,
    save,
    saveCoherentDraft,
    create: save,
    load,
    list,
    listRecords,
    search(
      query: string,
      listOptions: Omit<TextAuthoringDraftListOptions, "query"> = {},
    ) {
      return list({ ...listOptions, query });
    },
    autosave,
    saveRecovery: autosave,
    saveCoherentRecovery,
    loadRecovery,
    loadNewerRecovery,
    clearRecovery,
    duplicate,
    rename,
    archive(draftId: string) {
      return setArchived(draftId, true);
    },
    restore(draftId: string) {
      return setArchived(draftId, false);
    },
    markReady,
    invalidateReady,
    getHistory,
    restoreVersion,
  };
}

export type TextAuthoringDraftRepository = ReturnType<
  typeof createTextAuthoringDraftRepository
>;
