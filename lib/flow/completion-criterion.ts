export const COMPLETION_CRITERION_FIELD_SCHEMA_VERSION = 1 as const;

export const GENERIC_COMPLETION_CRITERION = '이 항목을 완료했어요.';

export type CompletionCriterionFieldContract = {
  schemaVersion: typeof COMPLETION_CRITERION_FIELD_SCHEMA_VERSION;
  present: boolean;
  value?: string;
  lines: string[];
};

/**
 * User-facing UI and portable payloads share this exact normalization. The
 * historical generic placeholder is not a real completion criterion.
 */
export function normalizeCompletionCriterion(value?: string): string | undefined {
  const normalized = (value ?? '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .trim();
  if (!normalized || normalized === GENERIC_COMPLETION_CRITERION) return undefined;
  return normalized;
}

export function buildCompletionCriterionFieldContract(
  value?: string,
): CompletionCriterionFieldContract {
  const normalized = normalizeCompletionCriterion(value);
  return {
    schemaVersion: COMPLETION_CRITERION_FIELD_SCHEMA_VERSION,
    present: Boolean(normalized),
    ...(normalized ? { value: normalized } : {}),
    lines: normalized ? normalized.split('\n') : [],
  };
}
