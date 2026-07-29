export const REVIEW_SCHEMA_VERSION = 1;

export function makeInitialReviewState(contentIds, corpusFingerprint) {
  return {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    corpusFingerprint,
    exportedAt: null,
    reviewsByContentId: Object.fromEntries(
      contentIds.map((contentId) => [
        contentId,
        {
          userReviewStatus: "not_reviewed",
          verdict: null,
          answers: {},
          comment: "",
          updatedAt: null,
        },
      ]),
    ),
    pacingByContentId: {},
    lastRoute: "#gallery",
  };
}

export function exportReviewState(state, now = new Date().toISOString()) {
  return JSON.stringify({ ...state, exportedAt: now }, null, 2);
}

export function importReviewState(
  raw,
  { corpusFingerprint, knownContentIds, mode = "merge", currentState },
) {
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return { ok: false, errors: ["INVALID_JSON"], warnings: [], state: currentState };
  }
  const errors = [];
  const warnings = [];
  if (parsed.schemaVersion !== REVIEW_SCHEMA_VERSION) errors.push("SCHEMA_VERSION_MISMATCH");
  if (parsed.corpusFingerprint !== corpusFingerprint) warnings.push("CORPUS_FINGERPRINT_MISMATCH");
  const known = new Set(knownContentIds);
  const incoming = Object.entries(parsed.reviewsByContentId ?? {});
  const unknownContentIds = incoming
    .map(([contentId]) => contentId)
    .filter((contentId) => !known.has(contentId));
  if (unknownContentIds.length) warnings.push("UNKNOWN_CONTENT_IDS");
  if (!["merge", "replace"].includes(mode)) errors.push("INVALID_IMPORT_MODE");
  if (errors.length) return { ok: false, errors, warnings, state: currentState };

  const cleanIncoming = Object.fromEntries(
    incoming.filter(([contentId]) => known.has(contentId)),
  );
  const base =
    mode === "replace"
      ? makeInitialReviewState(knownContentIds, corpusFingerprint)
      : currentState;
  return {
    ok: true,
    errors: [],
    warnings,
    unknownContentIds,
    state: {
      ...base,
      reviewsByContentId: {
        ...base.reviewsByContentId,
        ...cleanIncoming,
      },
      pacingByContentId: {
        ...(mode === "merge" ? base.pacingByContentId : {}),
        ...(parsed.pacingByContentId ?? {}),
      },
      lastRoute: parsed.lastRoute ?? base.lastRoute,
    },
  };
}

