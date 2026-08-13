export const TEXT_AUTHORING_P1_LONG_DOCUMENT_TABLE_FLAG =
  "textAuthoringP1LongDocumentTable" as const;

export const TEXT_AUTHORING_P1_SOURCE_CANDIDATE_FLAG =
  "textAuthoringP1SourceCandidate" as const;

export type TextAuthoringP1LongDocumentTableGateInput = {
  enabled?: boolean;
};

let runtimeLongDocumentTableEnabled: boolean | undefined;
let runtimeSourceCandidateEnabled: boolean | undefined;

export type TextAuthoringP1LongDocumentTableGate = {
  enabled: boolean;
  configured: boolean;
};

export function resolveTextAuthoringP1LongDocumentTableGate(
  input: TextAuthoringP1LongDocumentTableGateInput = {},
): TextAuthoringP1LongDocumentTableGate {
  const configured =
    input.enabled !== undefined ||
    runtimeLongDocumentTableEnabled !== undefined;
  return {
    enabled: input.enabled ?? runtimeLongDocumentTableEnabled ?? false,
    configured,
  };
}

/**
 * P0 remains the default. The caller persists an enabled document feature;
 * parser fixture identity is deliberately not overloaded as a product flag.
 */
export function isTextAuthoringP1LongDocumentTableEnabled(
  input: TextAuthoringP1LongDocumentTableGateInput = {},
): boolean {
  return resolveTextAuthoringP1LongDocumentTableGate(input).enabled;
}

/** Local runtime seam; persistence still lives on each document feature. */
export function setTextAuthoringP1LongDocumentTableRuntimeEnabled(
  enabled: boolean,
): void {
  runtimeLongDocumentTableEnabled = enabled;
}

export function resetTextAuthoringP1LongDocumentTableRuntimeEnabled(): void {
  runtimeLongDocumentTableEnabled = undefined;
}

export type TextAuthoringP1SourceCandidateGateInput = {
  enabled?: boolean;
};

export type TextAuthoringP1SourceCandidateGate = {
  enabled: boolean;
  configured: boolean;
};

export function resolveTextAuthoringP1SourceCandidateGate(
  input: TextAuthoringP1SourceCandidateGateInput = {},
): TextAuthoringP1SourceCandidateGate {
  const configured =
    input.enabled !== undefined || runtimeSourceCandidateEnabled !== undefined;
  return {
    enabled: input.enabled ?? runtimeSourceCandidateEnabled ?? false,
    configured,
  };
}

/** P1-E stays closed unless the caller or local runtime explicitly opens it. */
export function isTextAuthoringP1SourceCandidateEnabled(
  input: TextAuthoringP1SourceCandidateGateInput = {},
): boolean {
  return resolveTextAuthoringP1SourceCandidateGate(input).enabled;
}

export function setTextAuthoringP1SourceCandidateRuntimeEnabled(
  enabled: boolean,
): void {
  runtimeSourceCandidateEnabled = enabled;
}

export function resetTextAuthoringP1SourceCandidateRuntimeEnabled(): void {
  runtimeSourceCandidateEnabled = undefined;
}
