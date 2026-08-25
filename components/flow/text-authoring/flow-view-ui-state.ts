import { stableAuthoringHash } from "@/lib/flow/text-authoring/identity";

export const TEXT_AUTHORING_FLOW_VIEW_UI_STATE_VERSION = 1 as const;
export const TEXT_AUTHORING_FLOW_VIEW_UI_STATE_STORAGE_PREFIX =
  "flow:text-authoring:flow-view-ui:v1";

const MAX_SERIALIZED_UI_STATE_LENGTH = 16_384;
const MAX_FINGERPRINT_LENGTH = 256;
const MAX_LOCATOR_ID_LENGTH = 512;

export type TextAuthoringFlowViewMode = "text" | "flow";
export type TextAuthoringFlowViewSelectionDirection =
  "forward" | "backward" | "none";

/**
 * PoC-only presentation state. It deliberately lives beside the authoring
 * document so changing views cannot create a content revision or alter the
 * durable Text Authoring storage schema.
 */
export type TextAuthoringFlowViewUiState = {
  version: typeof TEXT_AUTHORING_FLOW_VIEW_UI_STATE_VERSION;
  mode: TextAuthoringFlowViewMode;
  fingerprint: string;
  selectionStart: number;
  selectionEnd: number;
  selectionDirection: TextAuthoringFlowViewSelectionDirection;
  textScrollTop: number;
  textScrollLeft: number;
  inputPaneScrollTop: number;
  flowScrollTop: number;
  activeLocatorId: string | null;
};

export type TextAuthoringFlowViewUiIdentity = {
  draftId?: string | null;
  documentId?: string | null;
};

export type TextAuthoringFlowViewUiClampOptions = {
  sourceLength: number;
  maxTextScrollTop?: number;
  maxTextScrollLeft?: number;
  maxInputPaneScrollTop?: number;
  maxFlowScrollTop?: number;
  validLocatorIds?: readonly string[];
};

export type TextAuthoringFlowViewUiRestoreReason =
  | "restored"
  | "missing"
  | "malformed"
  | "fingerprint-mismatch"
  | "storage-unavailable";

export type TextAuthoringFlowViewUiRestoreDecision = {
  restore: boolean;
  reason: TextAuthoringFlowViewUiRestoreReason;
  state: TextAuthoringFlowViewUiState;
};

export type TextAuthoringFlowViewUiStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

function cleanIdentityPart(value: string | null | undefined): string | null {
  const clean = value?.trim();
  return clean ? encodeURIComponent(clean) : null;
}

/** Returns null instead of creating a shared key when identity is missing. */
export function createTextAuthoringFlowViewUiStateKey({
  draftId,
  documentId,
}: TextAuthoringFlowViewUiIdentity): string | null {
  const draft = cleanIdentityPart(draftId);
  const document = cleanIdentityPart(documentId);
  if (!draft && !document) return null;
  if (draft && document) {
    return `${TEXT_AUTHORING_FLOW_VIEW_UI_STATE_STORAGE_PREFIX}:draft:${draft}:document:${document}`;
  }
  return draft
    ? `${TEXT_AUTHORING_FLOW_VIEW_UI_STATE_STORAGE_PREFIX}:draft:${draft}`
    : `${TEXT_AUTHORING_FLOW_VIEW_UI_STATE_STORAGE_PREFIX}:document:${document}`;
}

/** Fingerprints the exact working string, including its line-ending shape. */
export function fingerprintTextAuthoringFlowViewSource(
  rawText: string,
): string {
  return `raw-v1:${rawText.length}:${stableAuthoringHash(rawText)}`;
}

export function createDefaultTextAuthoringFlowViewUiState(
  fingerprint: string,
): TextAuthoringFlowViewUiState {
  return {
    version: TEXT_AUTHORING_FLOW_VIEW_UI_STATE_VERSION,
    mode: "text",
    fingerprint,
    selectionStart: 0,
    selectionEnd: 0,
    selectionDirection: "none",
    textScrollTop: 0,
    textScrollLeft: 0,
    inputPaneScrollTop: 0,
    flowScrollTop: 0,
    activeLocatorId: null,
  };
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNonNegativeNumber(value) && Number.isInteger(value);
}

function isUiState(value: unknown): value is TextAuthoringFlowViewUiState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<TextAuthoringFlowViewUiState>;
  return (
    state.version === TEXT_AUTHORING_FLOW_VIEW_UI_STATE_VERSION &&
    (state.mode === "text" || state.mode === "flow") &&
    typeof state.fingerprint === "string" &&
    state.fingerprint.length > 0 &&
    state.fingerprint.length <= MAX_FINGERPRINT_LENGTH &&
    isNonNegativeInteger(state.selectionStart) &&
    isNonNegativeInteger(state.selectionEnd) &&
    state.selectionStart <= state.selectionEnd &&
    (state.selectionDirection === "forward" ||
      state.selectionDirection === "backward" ||
      state.selectionDirection === "none") &&
    isFiniteNonNegativeNumber(state.textScrollTop) &&
    isFiniteNonNegativeNumber(state.textScrollLeft) &&
    isFiniteNonNegativeNumber(state.inputPaneScrollTop) &&
    isFiniteNonNegativeNumber(state.flowScrollTop) &&
    (state.activeLocatorId === null ||
      (typeof state.activeLocatorId === "string" &&
        state.activeLocatorId.length > 0 &&
        state.activeLocatorId.length <= MAX_LOCATOR_ID_LENGTH))
  );
}

/** Safe serializer for the local sidecar. Invalid runtime values return null. */
export function serializeTextAuthoringFlowViewUiState(
  state: TextAuthoringFlowViewUiState,
): string | null {
  if (!isUiState(state)) return null;
  try {
    const serialized = JSON.stringify(state);
    return serialized.length <= MAX_SERIALIZED_UI_STATE_LENGTH
      ? serialized
      : null;
  } catch {
    return null;
  }
}

/** Safe parser. Unknown versions and partial/malformed payloads are ignored. */
export function parseTextAuthoringFlowViewUiState(
  serialized: string | null | undefined,
): TextAuthoringFlowViewUiState | null {
  if (!serialized || serialized.length > MAX_SERIALIZED_UI_STATE_LENGTH) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(serialized);
    return isUiState(value) ? { ...value } : null;
  } catch {
    return null;
  }
}

function safeMaximum(value: number | undefined): number | undefined {
  return isFiniteNonNegativeNumber(value) ? value : undefined;
}

function clamp(value: number, maximum: number | undefined): number {
  const nonNegative = Math.max(0, value);
  const safeMax = safeMaximum(maximum);
  return safeMax === undefined ? nonNegative : Math.min(nonNegative, safeMax);
}

/**
 * Reconciles stored coordinates with the current DOM/source bounds. This does
 * not mutate the input state and drops only a locator that no longer exists.
 */
export function clampTextAuthoringFlowViewUiState(
  state: TextAuthoringFlowViewUiState,
  options: TextAuthoringFlowViewUiClampOptions,
): TextAuthoringFlowViewUiState {
  const sourceLength = isNonNegativeInteger(options.sourceLength)
    ? options.sourceLength
    : 0;
  const selectionStart = Math.min(state.selectionStart, sourceLength);
  const selectionEnd = Math.max(
    selectionStart,
    Math.min(state.selectionEnd, sourceLength),
  );
  const validLocatorIds = options.validLocatorIds
    ? new Set(options.validLocatorIds)
    : null;
  const activeLocatorId =
    state.activeLocatorId &&
    (!validLocatorIds || validLocatorIds.has(state.activeLocatorId))
      ? state.activeLocatorId
      : null;

  return {
    ...state,
    selectionStart,
    selectionEnd,
    selectionDirection:
      selectionStart === selectionEnd ? "none" : state.selectionDirection,
    textScrollTop: clamp(state.textScrollTop, options.maxTextScrollTop),
    textScrollLeft: clamp(state.textScrollLeft, options.maxTextScrollLeft),
    inputPaneScrollTop: clamp(
      state.inputPaneScrollTop,
      options.maxInputPaneScrollTop,
    ),
    flowScrollTop: clamp(state.flowScrollTop, options.maxFlowScrollTop),
    activeLocatorId,
  };
}

function fallbackDecision(
  fingerprint: string,
  reason: Exclude<TextAuthoringFlowViewUiRestoreReason, "restored">,
): TextAuthoringFlowViewUiRestoreDecision {
  return {
    restore: false,
    reason,
    state: createDefaultTextAuthoringFlowViewUiState(fingerprint),
  };
}

/**
 * Restores coordinates only for the exact source. A stale or malformed
 * sidecar fails open to editable text instead of guessing a source position.
 */
export function decideTextAuthoringFlowViewUiStateRestore(
  serialized: string | null | undefined,
  expectedFingerprint: string,
  clampOptions: TextAuthoringFlowViewUiClampOptions,
): TextAuthoringFlowViewUiRestoreDecision {
  if (serialized == null || serialized === "") {
    return fallbackDecision(expectedFingerprint, "missing");
  }
  const parsed = parseTextAuthoringFlowViewUiState(serialized);
  if (!parsed) return fallbackDecision(expectedFingerprint, "malformed");
  if (parsed.fingerprint !== expectedFingerprint) {
    return fallbackDecision(expectedFingerprint, "fingerprint-mismatch");
  }
  return {
    restore: true,
    reason: "restored",
    state: clampTextAuthoringFlowViewUiState(parsed, clampOptions),
  };
}

/** Reads and decides without allowing browser/storage exceptions to escape. */
export function readTextAuthoringFlowViewUiState(
  storage: TextAuthoringFlowViewUiStorage | null | undefined,
  key: string | null | undefined,
  expectedFingerprint: string,
  clampOptions: TextAuthoringFlowViewUiClampOptions,
): TextAuthoringFlowViewUiRestoreDecision {
  if (!storage || !key) {
    return fallbackDecision(expectedFingerprint, "storage-unavailable");
  }
  try {
    return decideTextAuthoringFlowViewUiStateRestore(
      storage.getItem(key),
      expectedFingerprint,
      clampOptions,
    );
  } catch {
    return fallbackDecision(expectedFingerprint, "storage-unavailable");
  }
}

/** Returns false on quota/security/adapter failures and never mutates content. */
export function writeTextAuthoringFlowViewUiState(
  storage: TextAuthoringFlowViewUiStorage | null | undefined,
  key: string | null | undefined,
  state: TextAuthoringFlowViewUiState,
): boolean {
  if (!storage || !key) return false;
  const serialized = serializeTextAuthoringFlowViewUiState(state);
  if (!serialized) return false;
  try {
    storage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function removeTextAuthoringFlowViewUiState(
  storage: TextAuthoringFlowViewUiStorage | null | undefined,
  key: string | null | undefined,
): boolean {
  if (!storage || !key) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
