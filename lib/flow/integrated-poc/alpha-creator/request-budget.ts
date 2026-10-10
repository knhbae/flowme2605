/** Bounded DEV creator transaction budget; not a global Auth/read policy.
 * SQL RPC 30s < BFF upstream 35s < browser 60s (auth + compilation + reply).
 * A timeout is still ambiguous: retain the identical request and look it up. */
export const ALPHA_CREATOR_REQUEST_BUDGET = Object.freeze({ databaseMs: 30_000, upstreamMs: 35_000, browserMs: 60_000 });
