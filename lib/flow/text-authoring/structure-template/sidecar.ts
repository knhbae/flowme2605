import { cloneAuthoringValue } from "../identity";
import type { TextAuthoringStorageAdapter } from "../storage";
import {
  STRUCTURE_TEMPLATE_DRAFT_SCHEMA_VERSION,
  type GroupInstance,
  type StructureDraft,
  type StructureTemplateValue,
} from "./types";

export const STRUCTURE_TEMPLATE_SIDECAR_STORAGE_KEY =
  "flow:text-authoring:structure-template-sidecars:p0.2";
export const STRUCTURE_TEMPLATE_SIDECAR_STORAGE_SCHEMA_VERSION = 1 as const;

export type StructureTemplateSidecarReadErrorCode =
  | "read_failed"
  | "corrupted"
  | "schema_mismatch";

export type StructureTemplateSidecarWriteErrorCode =
  | "write_failed"
  | "quota_exceeded";

export class StructureTemplateSidecarReadError extends Error {
  readonly code: StructureTemplateSidecarReadErrorCode;
  readonly storageKey: string;
  readonly existingValuePreserved = true;
  readonly originalError: unknown;

  constructor(options: {
    code: StructureTemplateSidecarReadErrorCode;
    storageKey: string;
    originalError: unknown;
  }) {
    super(
      `Structure template sidecar read failed (${options.code}) for `
        + `"${options.storageKey}". Existing bytes were preserved.`,
    );
    this.name = "StructureTemplateSidecarReadError";
    this.code = options.code;
    this.storageKey = options.storageKey;
    this.originalError = options.originalError;
  }
}

export class StructureTemplateSidecarWriteError extends Error {
  readonly code: StructureTemplateSidecarWriteErrorCode;
  readonly storageKey: string;
  readonly attemptedBytes: number;
  readonly previousValuePreserved: boolean;
  readonly originalError: unknown;

  constructor(options: {
    code: StructureTemplateSidecarWriteErrorCode;
    storageKey: string;
    attemptedBytes: number;
    previousValuePreserved: boolean;
    originalError: unknown;
  }) {
    super(
      `Structure template sidecar write failed (${options.code}) for `
        + `"${options.storageKey}". Previous bytes preserved: `
        + `${options.previousValuePreserved}.`,
    );
    this.name = "StructureTemplateSidecarWriteError";
    this.code = options.code;
    this.storageKey = options.storageKey;
    this.attemptedBytes = options.attemptedBytes;
    this.previousValuePreserved = options.previousValuePreserved;
    this.originalError = options.originalError;
  }
}

export class StructureTemplateSidecarFingerprintError extends Error {
  readonly code = "source_fingerprint_mismatch" as const;
  readonly draftId: string;
  readonly expectedFingerprint: string;
  readonly actualFingerprint: string;
  readonly existingValuePreserved = true;

  constructor(options: {
    draftId: string;
    expectedFingerprint: string;
    actualFingerprint: string;
  }) {
    super(
      `Structure template sidecar "${options.draftId}" does not match `
        + "the current source fingerprint.",
    );
    this.name = "StructureTemplateSidecarFingerprintError";
    this.draftId = options.draftId;
    this.expectedFingerprint = options.expectedFingerprint;
    this.actualFingerprint = options.actualFingerprint;
  }
}

type StoredStructureTemplateSidecar = Readonly<{
  draftId: string;
  sourceFingerprint: string;
  draft: StructureDraft;
}>;

type PersistedStructureTemplateSidecars = Readonly<{
  schemaVersion: typeof STRUCTURE_TEMPLATE_SIDECAR_STORAGE_SCHEMA_VERSION;
  records: Readonly<Record<string, StoredStructureTemplateSidecar>>;
}>;

export type StructureTemplateSidecarRepositoryOptions = Readonly<{
  key?: string;
}>;

export type StructureTemplateSidecarTemplateIdentity = Readonly<{
  templateId: string;
  templateVersion: string;
}>;

function emptyState(): PersistedStructureTemplateSidecars {
  return {
    schemaVersion: STRUCTURE_TEMPLATE_SIDECAR_STORAGE_SCHEMA_VERSION,
    records: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStructureTemplateValue(value: unknown): value is StructureTemplateValue {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
  ) {
    return typeof value !== "number" || Number.isFinite(value);
  }
  if (Array.isArray(value)) return value.every(isStructureTemplateValue);
  return isRecord(value) && Object.values(value).every(isStructureTemplateValue);
}

function isValueMap(value: unknown): value is Record<string, StructureTemplateValue> {
  return isRecord(value) && Object.values(value).every(isStructureTemplateValue);
}

function isGroupInstance(value: unknown): value is GroupInstance {
  if (!isRecord(value)) return false;
  return typeof value.instanceId === "string"
    && value.instanceId !== ""
    && typeof value.groupId === "string"
    && value.groupId !== ""
    && Number.isSafeInteger(value.order)
    && Number(value.order) >= 0
    && isValueMap(value.values)
    && Array.isArray(value.children)
    && value.children.every(isGroupInstance);
}

function isMaterialization(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.insertedRange)) return false;
  return typeof value.transactionId === "string"
    && value.transactionId !== ""
    && typeof value.at === "string"
    && value.at !== ""
    && typeof value.sourceRevisionId === "string"
    && value.sourceRevisionId !== ""
    && Number.isSafeInteger(value.insertedRange.start)
    && Number(value.insertedRange.start) >= 0
    && Number.isSafeInteger(value.insertedRange.end)
    && Number(value.insertedRange.end) >= Number(value.insertedRange.start);
}

function isStructureDraft(value: unknown): value is StructureDraft {
  if (!isRecord(value)) return false;
  return value.schemaVersion === STRUCTURE_TEMPLATE_DRAFT_SCHEMA_VERSION
    && typeof value.draftId === "string"
    && value.draftId !== ""
    && typeof value.templateId === "string"
    && value.templateId !== ""
    && typeof value.templateVersion === "string"
    && value.templateVersion !== ""
    && typeof value.sourceFingerprint === "string"
    && value.sourceFingerprint !== ""
    && (value.sourceRevisionId === undefined
      || typeof value.sourceRevisionId === "string")
    && isValueMap(value.values)
    && Array.isArray(value.groups)
    && value.groups.every(isGroupInstance)
    && Array.isArray(value.dismissedSlots)
    && value.dismissedSlots.every((entry) =>
      isRecord(entry)
      && typeof entry.scopeInstanceId === "string"
      && entry.scopeInstanceId !== ""
      && typeof entry.slotId === "string"
      && entry.slotId !== ""
    )
    && (value.materialized === false || isMaterialization(value.materialized))
    && Number.isSafeInteger(value.revision)
    && Number(value.revision) >= 1
    && typeof value.updatedAt === "string"
    && value.updatedAt !== "";
}

function isPersistedState(value: unknown): value is PersistedStructureTemplateSidecars {
  if (!isRecord(value) || !isRecord(value.records)) return false;
  if (value.schemaVersion !== STRUCTURE_TEMPLATE_SIDECAR_STORAGE_SCHEMA_VERSION) {
    return false;
  }
  return Object.entries(value.records).every(([draftId, record]) =>
    isRecord(record)
    && record.draftId === draftId
    && typeof record.sourceFingerprint === "string"
    && record.sourceFingerprint !== ""
    && isStructureDraft(record.draft)
    && record.draft.draftId === draftId
    && record.draft.sourceFingerprint === record.sourceFingerprint
  );
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function writeErrorCode(error: unknown): StructureTemplateSidecarWriteErrorCode {
  return isRecord(error)
    && (error.name === "QuotaExceededError" || error.code === 22)
    ? "quota_exceeded"
    : "write_failed";
}

function assertFingerprint(
  draftId: string,
  expectedFingerprint: string,
  actualFingerprint: string,
): void {
  if (
    expectedFingerprint === ""
    || actualFingerprint === ""
    || expectedFingerprint !== actualFingerprint
  ) {
    throw new StructureTemplateSidecarFingerprintError({
      draftId,
      expectedFingerprint,
      actualFingerprint,
    });
  }
}

function compareText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function comparePersistedInstants(left: string, right: string): number {
  const leftEpoch = Date.parse(left);
  const rightEpoch = Date.parse(right);
  const leftValid = Number.isFinite(leftEpoch);
  const rightValid = Number.isFinite(rightEpoch);
  if (leftValid && rightValid && leftEpoch !== rightEpoch) {
    return leftEpoch - rightEpoch;
  }
  if (leftValid !== rightValid) return leftValid ? 1 : -1;
  if (leftValid && rightValid) return 0;
  return compareText(left, right);
}

/**
 * Orders reload candidates by their persisted logical update time, then by
 * revision and stable draft ID. The final tie-break makes recovery independent
 * of object insertion order and storage serialization order.
 */
function compareReloadCandidates(
  left: StoredStructureTemplateSidecar,
  right: StoredStructureTemplateSidecar,
): number {
  const updatedAt = comparePersistedInstants(
    left.draft.updatedAt,
    right.draft.updatedAt,
  );
  if (updatedAt !== 0) return updatedAt;
  if (left.draft.revision !== right.draft.revision) {
    return left.draft.revision - right.draft.revision;
  }
  return compareText(left.draftId, right.draftId);
}

export function createStructureTemplateSidecarRepository(
  storage: TextAuthoringStorageAdapter,
  options: StructureTemplateSidecarRepositoryOptions = {},
) {
  const key = options.key ?? STRUCTURE_TEMPLATE_SIDECAR_STORAGE_KEY;

  function read(): Readonly<{
    state: PersistedStructureTemplateSidecars;
    raw: string | null;
  }> {
    let raw: string | null;
    try {
      raw = storage.getItem(key);
    } catch (error) {
      throw new StructureTemplateSidecarReadError({
        code: "read_failed",
        storageKey: key,
        originalError: error,
      });
    }
    if (raw === null) return { state: emptyState(), raw };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch (error) {
      throw new StructureTemplateSidecarReadError({
        code: "corrupted",
        storageKey: key,
        originalError: error,
      });
    }

    if (!isPersistedState(parsed)) {
      const code = isRecord(parsed)
        && "schemaVersion" in parsed
        && parsed.schemaVersion !== STRUCTURE_TEMPLATE_SIDECAR_STORAGE_SCHEMA_VERSION
        ? "schema_mismatch"
        : "corrupted";
      throw new StructureTemplateSidecarReadError({
        code,
        storageKey: key,
        originalError: parsed,
      });
    }
    return { state: parsed, raw };
  }

  function write(
    state: PersistedStructureTemplateSidecars,
    previousRaw: string | null,
  ): void {
    let nextRaw: string;
    try {
      nextRaw = JSON.stringify(state);
    } catch (error) {
      throw new StructureTemplateSidecarWriteError({
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
        if (previousRaw === null) {
          try {
            storage.removeItem(key);
          } catch {
            // Verification below handles adapters that mutate and then throw.
          }
          previousValuePreserved = storage.getItem(key) === null;
        } else {
          try {
            storage.setItem(key, previousRaw);
          } catch {
            // Verification below handles adapters that mutate and then throw.
          }
          previousValuePreserved = storage.getItem(key) === previousRaw;
        }
      } catch {
        previousValuePreserved = false;
      }
      throw new StructureTemplateSidecarWriteError({
        code: writeErrorCode(error),
        storageKey: key,
        attemptedBytes: utf8ByteLength(nextRaw),
        previousValuePreserved,
        originalError: error,
      });
    }
  }

  function save(
    draft: StructureDraft,
    currentSourceFingerprint: string,
  ): StructureDraft {
    assertFingerprint(
      draft.draftId,
      draft.sourceFingerprint,
      currentSourceFingerprint,
    );
    const { state, raw } = read();
    const clonedDraft = cloneAuthoringValue(draft);
    const nextState: PersistedStructureTemplateSidecars = {
      ...state,
      records: {
        ...state.records,
        [draft.draftId]: {
          draftId: draft.draftId,
          sourceFingerprint: draft.sourceFingerprint,
          draft: clonedDraft,
        },
      },
    };
    write(nextState, raw);
    return cloneAuthoringValue(clonedDraft);
  }

  function restore(
    draftId: string,
    currentSourceFingerprint: string,
  ): StructureDraft | undefined {
    const { state } = read();
    const record = state.records[draftId];
    if (!record) return undefined;
    assertFingerprint(
      draftId,
      record.sourceFingerprint,
      currentSourceFingerprint,
    );
    return cloneAuthoringValue(record.draft);
  }

  function restoreLatestUnmaterialized(
    currentSourceFingerprint: string,
    templateIdentity?: StructureTemplateSidecarTemplateIdentity,
  ): StructureDraft | undefined {
    const { state } = read();
    const candidate = Object.values(state.records)
      .filter((record) => (
        record.sourceFingerprint === currentSourceFingerprint
        && record.draft.materialized === false
        && (
          templateIdentity === undefined
          || (
            record.draft.templateId === templateIdentity.templateId
            && record.draft.templateVersion === templateIdentity.templateVersion
          )
        )
      ))
      .sort(compareReloadCandidates)
      .at(-1);
    return candidate ? cloneAuthoringValue(candidate.draft) : undefined;
  }

  function remove(draftId: string): boolean {
    const { state, raw } = read();
    if (!(draftId in state.records)) return false;
    const records = { ...state.records };
    delete records[draftId];
    write({ ...state, records }, raw);
    return true;
  }

  return { key, save, restore, restoreLatestUnmaterialized, remove };
}

export type StructureTemplateSidecarRepository = ReturnType<
  typeof createStructureTemplateSidecarRepository
>;
