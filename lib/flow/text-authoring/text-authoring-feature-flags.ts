export const TEXT_AUTHORING_P1_LONG_DOCUMENT_TABLE_FLAG =
  "textAuthoringP1LongDocumentTable" as const;

export type TextAuthoringP1LongDocumentTableGateInput = {
  enabled?: boolean;
};

let runtimeLongDocumentTableEnabled: boolean | undefined;

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
