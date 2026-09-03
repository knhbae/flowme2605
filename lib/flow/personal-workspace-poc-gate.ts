export const PERSONAL_WORKSPACE_POC_QUERY_KEY = 'personalWorkspacePoc';
export const PERSONAL_WORKSPACE_POC_QUERY_VALUE = 'v1';

export type PersonalWorkspacePocSearchParams = Record<
  string,
  string | string[] | undefined
>;

/**
 * The PoC is deliberately an exact-query route. Any additional, repeated, or
 * malformed value falls back to the existing /my surface.
 */
export function isPersonalWorkspacePocQuery(
  params: PersonalWorkspacePocSearchParams,
): boolean {
  const keys = Object.keys(params);
  return keys.length === 1
    && keys[0] === PERSONAL_WORKSPACE_POC_QUERY_KEY
    && params[PERSONAL_WORKSPACE_POC_QUERY_KEY] === PERSONAL_WORKSPACE_POC_QUERY_VALUE;
}
