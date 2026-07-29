import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sha256 } from "./lib/utils-v1.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_AT = "2026-07-29T23:59:00+09:00";
const AXES = [
  "itemGranularity",
  "primaryProjection",
  "checklistTodoDecision",
  "scheduleSuitability",
  "contentValue",
  "uiUnderstandability",
];

function read(file) {
  return JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
}

function write(file, value) {
  fs.writeFileSync(
    path.join(DIR, file),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function optionalRead(file) {
  const target = path.join(DIR, file);
  return fs.existsSync(target)
    ? JSON.parse(fs.readFileSync(target, "utf8"))
    : null;
}

function countsBy(records, key) {
  return Object.fromEntries(
    Object.entries(Object.groupBy(records, (record) => record[key])).map(
      ([value, entries]) => [value, entries.length],
    ),
  );
}

function internalVerdict(a, b) {
  if (a === "hold" && b === "hold") return "hold";
  if (a === "go" && b === "go") return "go";
  return "modify";
}

function assertReviewIntegrity(value, label) {
  const serialized = JSON.stringify(value);
  if (serialized.includes("\uFFFD") || serialized.includes("??")) {
    throw new Error(
      `Independent review ${label} contains replacement or corrupted placeholder text`,
    );
  }
}

function lowerDecision(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeAxisDecision(axis, value) {
  const normalized = lowerDecision(value);
  if (["go", "modify", "hold"].includes(normalized)) return normalized;

  const mappings = {
    itemGranularity: {
      appropriate: "go",
      mixed: "modify",
      too_large: "modify",
      too_small: "modify",
    },
    primaryProjection: {
      yes: "go",
      change: "modify",
    },
    checklistTodo: {
      yes: "go",
      change: "modify",
      not_applicable: "go",
    },
    scheduleFit: {
      yes: "go",
      too_little: "modify",
      too_much: "modify",
      not_applicable: "go",
    },
    contentValue: {
      yes: "go",
      partly: "modify",
      no: "hold",
    },
    uiUnderstandability: {
      yes: "go",
      partly: "modify",
      no: "hold",
    },
  };
  return mappings[axis]?.[normalized] ?? normalized;
}

function axisDecision(judgment, legacyKey, renderedKey = legacyKey) {
  const axisValue = judgment.axes?.[renderedKey];
  return normalizeAxisDecision(
    renderedKey,
    axisValue?.decision ?? axisValue ?? judgment[legacyKey],
  );
}

function observedChecklistTodoFor(content) {
  if (["checklist", "todo"].includes(content?.primaryProjection)) {
    return content.primaryProjection;
  }
  return (
    (content?.secondaryProjections ?? []).find((projection) =>
      ["checklist", "todo"].includes(projection),
    ) ?? "neither"
  );
}

function normalizeJudgment(judgment, content) {
  const modificationReason =
    judgment.modificationReason ?? judgment.modifyReasons ?? [];
  const modifyReasons = Array.isArray(modificationReason)
    ? modificationReason
    : modificationReason
      ? [modificationReason]
      : [];
  const evidenceObject = judgment.evidence;
  const evidence = Array.isArray(evidenceObject)
    ? evidenceObject
    : evidenceObject
      ? [
          `itemIds=${(evidenceObject.itemIds ?? []).join(",")}`,
          `screenModes=${(evidenceObject.screenModes ?? []).join(",")}`,
          `projectionCellIds=${(
            evidenceObject.projectionCellIds ?? []
          ).join(",")}`,
        ]
      : [];
  return {
    ...judgment,
    itemGranularity: axisDecision(judgment, "itemGranularity"),
    primaryProjection: axisDecision(judgment, "primaryProjection"),
    checklistTodoDecision: axisDecision(
      judgment,
      "checklistTodoDecision",
      "checklistTodo",
    ),
    scheduleSuitability: axisDecision(
      judgment,
      "scheduleSuitability",
      "scheduleFit",
    ),
    contentValue: axisDecision(judgment, "contentValue"),
    uiUnderstandability: axisDecision(judgment, "uiUnderstandability"),
    observedPrimaryProjection:
      judgment.axes?.primaryProjection?.observedProjection ??
      judgment.observedPrimaryProjection ??
      content?.primaryProjection ??
      null,
    selectedPrimaryProjection:
      judgment.axes?.primaryProjection?.selectedProjection ??
      judgment.selectedPrimaryProjection ??
      judgment.recommendedPrimaryProjection ??
      content?.primaryProjection ??
      null,
    observedChecklistTodo:
      judgment.axes?.checklistTodo?.observedMode ??
      judgment.observedChecklistTodo ??
      observedChecklistTodoFor(content),
    selectedChecklistTodo:
      judgment.axes?.checklistTodo?.selectedMode ??
      judgment.selectedChecklistTodo ??
      judgment.recommendedChecklistTodoMode ??
      observedChecklistTodoFor(content),
    overallVerdict: lowerDecision(
      judgment.overallVerdict ?? judgment.verdict ?? judgment.decision,
    ),
    rawAxes: judgment.axes ?? null,
    rawRecommendedPrimaryProjection:
      judgment.recommendedPrimaryProjection ?? null,
    rawRecommendedChecklistTodoMode:
      judgment.recommendedChecklistTodoMode ?? null,
    title: judgment.title ?? content?.title ?? null,
    corpusTier: judgment.corpusTier ?? content?.corpusTier ?? null,
    contentMode: judgment.contentMode ?? content?.contentMode ?? null,
    evidenceItems: Array.isArray(evidenceObject) ? evidenceObject : [],
    evidenceSummary:
      judgment.evidenceSummary ??
      (Array.isArray(evidenceObject)
        ? evidenceObject.map((entry) => entry.note).filter(Boolean)
        : []),
    reviewerNote:
      judgment.reviewerNote ?? judgment.modificationReason ?? null,
    itemEvidenceIds:
      judgment.itemEvidenceIds ??
      evidenceObject?.itemIds ??
      (Array.isArray(evidenceObject)
        ? evidenceObject.map((entry) => entry.itemId).filter(Boolean)
        : []),
    modifyReasons,
    evidence,
  };
}

function normalizeInputFingerprints(run) {
  if (Array.isArray(run.inputFingerprints)) return run.inputFingerprints;
  const roleByKey = {
    galleryHtml: "gallery_html",
    viewModel: "view_model",
    projectionResults: "projection_results",
    scheduleResults: "schedule_results",
    eventResults: "event_results",
  };
  return (run.inputArtifacts ?? []).map((entry) => ({
    role: roleByKey[entry.key] ?? entry.key,
    path: entry.relativePath,
    sha256: entry.sha256,
    bytes: entry.bytes,
  }));
}

function normalizeRun(run, inputFile, viewById) {
  const records = run.reviews ?? run.judgments;
  if (!Array.isArray(records)) {
    throw new Error(`Independent review ${inputFile} has no review records`);
  }
  return {
    runId:
      run.runId ??
      run.reviewId ??
      run.reviewer?.reviewerId ??
      path.basename(inputFile, ".json"),
    reviewerRole:
      run.reviewerRole ??
      run.reviewType ??
      run.reviewer?.reviewLabel ??
      "independent_internal_reviewer",
    peerOutputVisible:
      run.peerOutputVisible ??
      run.reviewContract?.independence?.peerOutputVisible,
    peerReviewFilesRead:
      run.reviewContract?.independence?.peerReviewFilesRead,
    contentValueReadjudicationRead:
      run.reviewContract?.independence?.contentValueReadjudicationRead,
    corpusFingerprint:
      run.inputManifestHash ??
      run.reviewScope?.corpusFingerprint ??
      run.corpusFingerprint,
    inputFingerprints: normalizeInputFingerprints(run),
    inputFile,
    records: records.map((record) =>
      normalizeJudgment(record, viewById.get(record.contentId)),
    ),
    raw: run,
  };
}

function fileSha256(file) {
  return sha256(fs.readFileSync(file, "utf8")).replace(/^sha256:/, "");
}

function assertInputFingerprints(run, label) {
  const expected = {
    view_model: fileSha256(path.join(DIR, "content-ui-view-model-v1.json")),
    projection_results: fileSha256(
      path.join(DIR, "projection-ui-results-v1.json"),
    ),
  };
  const actual = Object.fromEntries(
    (run.inputFingerprints ?? []).map((entry) => [
      entry.role,
      String(entry.sha256 ?? "").replace(/^sha256:/, ""),
    ]),
  );
  const mismatches = Object.entries(expected).filter(
    ([role, hash]) => actual[role] !== hash,
  );
  if (mismatches.length) {
    throw new Error(
      `Independent review ${label} input fingerprint mismatch: ${mismatches
        .map(([role]) => role)
        .join(", ")}`,
    );
  }
  if (!/^[0-9a-f]{64}$/i.test(actual.gallery_html ?? "")) {
    throw new Error(
      `Independent review ${label} is missing its frozen Gallery fingerprint`,
    );
  }
}

const view = read("content-ui-view-model-v1.json");
const newSourceVerification = read("new-source-verification-v1.json");
const semanticAudit = read("semantic-provenance-audit-v1.json");
const semanticManual = read(
  "semantic-provenance-manual-adjudication-v1.json",
);
const browserQa = optionalRead("browser-qa-v1.json");
const browserQaStatus = browserQa?.summary?.status ?? "PENDING";
const reviewInputFiles = {
  a: "runs/independent-rendered-ui-review-a2-v1.json",
  b: "runs/independent-rendered-ui-review-b2-v1.json",
};
const viewById = new Map(
  view.contents.map((content) => [content.contentId, content]),
);
const rawRunA = read(reviewInputFiles.a);
const rawRunB = read(reviewInputFiles.b);
const runA = normalizeRun(rawRunA, reviewInputFiles.a, viewById);
const runB = normalizeRun(rawRunB, reviewInputFiles.b, viewById);
const reviewsA = runA.records;
const reviewsB = runB.records;
const normal = view.contents.filter((content) =>
  ["product_candidate", "structure_probe"].includes(content.corpusTier),
);
const normalIds = normal.map((content) => content.contentId);
const normalSet = new Set(normalIds);
const newNormalIdSet = new Set(
  newSourceVerification.records
    .filter((record) =>
      ["product_candidate", "structure_probe"].includes(record.corpusTier),
    )
    .map((record) => `new:${record.researchId}`),
);
const newlyInspectedNormal = normal.filter((content) =>
  newNormalIdSet.has(content.contentId),
).length;
const reverifiedNormalVariantCount =
  newSourceVerification.counts.normal - newlyInspectedNormal;
if (
  newlyInspectedNormal < 0 ||
  reverifiedNormalVariantCount < 0 ||
  newlyInspectedNormal + reverifiedNormalVariantCount !==
    newSourceVerification.counts.normal
) {
  throw new Error(
    "New-source normal count does not reconcile with the frozen view model",
  );
}
const corpusSnapshot = {
  gallery: view.counts.gallery,
  normal: view.counts.normal,
  existingNormal: view.counts.normal - newlyInspectedNormal,
  newlyInspectedQualifiedNormal: newSourceVerification.counts.normal,
  newlyAddedDistinctNormal: newlyInspectedNormal,
  reverifiedNormalVariantsMerged: reverifiedNormalVariantCount,
  directlyInspectedNewUrls: newSourceVerification.counts.reviewedUrls,
  productCandidate: view.counts.productCandidate,
  structureProbe: view.counts.structureProbe,
  boundary: view.counts.boundary,
  historical: view.counts.historical,
  item: view.counts.item,
  sourceRow: view.counts.sourceRow,
  projectionCell: view.counts.projectionCell,
};
const semanticMismatchByQueueIndex = new Map(
  semanticManual.mismatches.map((mismatch) => [
    mismatch.queueIndex,
    mismatch,
  ]),
);
const semanticNeedsModify = semanticManual.adjudications
  .filter((adjudication) => adjudication.verdict === "needs_modify")
  .map((adjudication) => {
    const [contentId, itemId, field] = adjudication.uniqueKey.split("|");
    return {
      ...adjudication,
      contentId,
      itemId,
      field,
      mismatch: semanticMismatchByQueueIndex.get(adjudication.queueIndex),
    };
  });
const semanticNeedsModifyContentIds = [
  ...new Set(semanticNeedsModify.map((record) => record.contentId)),
];
const semanticReviewedContentIds = [
  ...new Set(
    semanticManual.adjudications.map((record) =>
      record.uniqueKey.split("|")[0],
    ),
  ),
];
const semanticReasonCounts = Object.fromEntries(
  Object.entries(
    Object.groupBy(semanticNeedsModify, (record) => record.reasonCode),
  ).map(([reasonCode, records]) => [reasonCode, records.length]),
);
const semanticContentCounts = Object.fromEntries(
  Object.entries(
    Object.groupBy(semanticNeedsModify, (record) => record.contentId),
  ).map(([contentId, records]) => [contentId, records.length]),
);
const ownerOrProvenanceMissing =
  semanticAudit.manualReviewQueue.ownerOrProvenanceMissing;
const completionGapContentIds = [
  ...new Set(
    ownerOrProvenanceMissing
      .filter((record) => record.field === "completion")
      .map((record) => record.contentId),
  ),
];
const scheduleGapContentIds = [
  ...new Set(
    ownerOrProvenanceMissing
      .filter((record) => record.field === "schedule")
      .map((record) => record.contentId),
  ),
];
const manualSemanticSummary = {
  artifact:
    "semantic-provenance-manual-adjudication-v1.json",
  reviewMethod: semanticManual.method,
  traceOnlyReviewed: semanticManual.scope.traceOnlyQueueReviewed,
  traceOnlyContentReviewed: semanticManual.scope.traceOnlyContentReviewed,
  traceOnlyReviewedContentIds: semanticReviewedContentIds,
  verdictCounts: semanticManual.summary.traceOnlyVerdictCounts,
  acceptableWithoutMeaningChange:
    semanticManual.summary.traceOnlyAcceptableWithoutMeaningChange,
  needsModify: semanticNeedsModify.length,
  needsModifyContentCount: semanticNeedsModifyContentIds.length,
  needsModifyContentIds: semanticNeedsModifyContentIds,
  needsModifyByReason: semanticReasonCounts,
  needsModifyByContent: semanticContentCounts,
  ownerOrProvenanceGapCounts:
    semanticManual.summary.ownerOrProvenanceGapCounts,
  completionGapContentIds,
  scheduleGapContentIds,
  zeroInventionClaim:
    semanticManual.combinedClaimBoundary.zeroInventionClaim,
  selfValidation: semanticManual.selfValidation,
  claimBoundary: semanticManual.combinedClaimBoundary,
};
if (
  manualSemanticSummary.traceOnlyReviewed !== 141 ||
  manualSemanticSummary.needsModify !== 17 ||
  manualSemanticSummary.needsModifyContentCount !== 11 ||
  manualSemanticSummary.zeroInventionClaim !== "NOT_PROVEN" ||
  semanticManual.selfValidation.status !== "PASS" ||
  semanticManual.selfValidation.passed !== 13 ||
  semanticManual.selfValidation.total !== 13 ||
  semanticManual.inputArtifacts[
    "semantic-provenance-audit-v1.json"
  ].fileSha256 !==
    `sha256:${fileSha256(
      path.join(DIR, "semantic-provenance-audit-v1.json"),
    )}` ||
  semanticManual.inputArtifacts[
    "content-ui-view-model-v1.json"
  ].fileSha256 !==
    `sha256:${fileSha256(
      path.join(DIR, "content-ui-view-model-v1.json"),
    )}` ||
  ownerOrProvenanceMissing.length !== 536 ||
  ownerOrProvenanceMissing.filter(
    (record) => record.field === "completion",
  ).length !== 412 ||
  ownerOrProvenanceMissing.filter(
    (record) => record.field === "schedule",
  ).length !== 124 ||
  semanticNeedsModifyContentIds.some((contentId) => !normalSet.has(contentId))
) {
  throw new Error(
    "Manual semantic adjudication does not match the frozen 141/17/11 contract",
  );
}

for (const [runId, records] of [
  ["A", reviewsA],
  ["B", reviewsB],
]) {
  const ids = records.map((record) => record.contentId);
  if (
    records.length !== normal.length ||
    new Set(ids).size !== normal.length ||
    ids.some((contentId) => !normalSet.has(contentId))
  ) {
    throw new Error(`Independent review ${runId} does not cover the frozen normal corpus`);
  }
  const invalid = records.filter(
    (record) =>
      AXES.some(
        (axis) => !["go", "modify", "hold"].includes(record[axis]),
      ) ||
      !["calendar", "checklist", "todo", "sheet", "memo"].includes(
        record.selectedPrimaryProjection,
      ) ||
      !["checklist", "todo", "neither", "conditional"].includes(
        record.selectedChecklistTodo,
      ),
  );
  if (invalid.length) {
    throw new Error(
      `Independent review ${runId} has invalid normalized decisions: ${invalid
        .slice(0, 5)
        .map((record) => record.contentId)
        .join(", ")}`,
    );
  }
}

assertReviewIntegrity(rawRunA, "A2");
assertReviewIntegrity(rawRunB, "B2");
assertInputFingerprints(runA, "A2");
assertInputFingerprints(runB, "B2");

const reviewedGalleryHashes = [
  ...new Set(
    [runA, runB].map((run) =>
      String(
        run.inputFingerprints.find(
          (fingerprint) => fingerprint.role === "gallery_html",
        ).sha256,
      ).replace(/^sha256:/, ""),
    ),
  ),
];
if (reviewedGalleryHashes.length !== 1) {
  throw new Error(
    `Independent reviews do not share one frozen Gallery fingerprint: ${reviewedGalleryHashes.join(", ")}`,
  );
}
const reviewedGalleryHash = reviewedGalleryHashes[0];
const finalGalleryPath = path.resolve(
  DIR,
  "../../content-audit/2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html",
);
const finalGalleryHtml = fs.readFileSync(finalGalleryPath, "utf8");
const finalGalleryHash = fileSha256(finalGalleryPath);
const galleryChangedAfterIndependentReview =
  finalGalleryHash !== reviewedGalleryHash;
if (
  galleryChangedAfterIndependentReview &&
  (!finalGalleryHtml.includes(view.corpusFingerprint) ||
    !finalGalleryHtml.includes("synthesizedInternalVerdict"))
) {
  throw new Error(
    "Current Gallery differs from the reviewed snapshot without a recognizable post-synthesis review surface",
  );
}

if (
  runA.peerOutputVisible !== false ||
  runB.peerOutputVisible !== false ||
  runA.peerReviewFilesRead !== false ||
  runB.peerReviewFilesRead !== false ||
  runA.contentValueReadjudicationRead !== false ||
  runB.contentValueReadjudicationRead !== false ||
  runA.corpusFingerprint !== view.corpusFingerprint ||
  runB.corpusFingerprint !== view.corpusFingerprint
) {
  throw new Error("Independent review boundary or fingerprint mismatch");
}

const aById = new Map(reviewsA.map((review) => [review.contentId, review]));
const bById = new Map(reviewsB.map((review) => [review.contentId, review]));
const semanticNeedsByContent = Object.groupBy(
  semanticNeedsModify,
  (record) => record.contentId,
);
const comparisons = normal.map((content) => {
  const a = aById.get(content.contentId);
  const b = bById.get(content.contentId);
  const agreement = Object.fromEntries(AXES.map((axis) => [axis, a[axis] === b[axis]]));
  const selectionAgreement = {
    primaryProjection:
      a.selectedPrimaryProjection &&
      b.selectedPrimaryProjection &&
      a.selectedPrimaryProjection === b.selectedPrimaryProjection,
    checklistTodo:
      a.selectedChecklistTodo &&
      b.selectedChecklistTodo &&
      a.selectedChecklistTodo === b.selectedChecklistTodo,
  };
  const disagreeingAxes = [
    ...AXES.filter((axis) => !agreement[axis]),
    ...(!selectionAgreement.primaryProjection
      ? ["primaryProjectionSelection"]
      : []),
    ...(!selectionAgreement.checklistTodo
      ? ["checklistTodoSelection"]
      : []),
  ];
  return {
    contentId: content.contentId,
    title: content.title,
    corpusTier: content.corpusTier,
    reviewerA: a,
    reviewerB: b,
    agreement,
    selectionAgreement,
    disagreeingAxes,
    exactAgreement: disagreeingAxes.length === 0,
    synthesizedInternalVerdict: internalVerdict(a.contentValue, b.contentValue),
    manualSemanticAdjudication: {
      status:
        (semanticNeedsByContent[content.contentId] ?? []).length > 0
          ? "NEEDS_MODIFY"
          : semanticReviewedContentIds.includes(content.contentId)
            ? "ACCEPTABLE_IN_TRACE_QUEUE"
            : "NOT_IN_SCOPE",
      needsModifyCount:
        (semanticNeedsByContent[content.contentId] ?? []).length,
      fields: semanticNeedsByContent[content.contentId] ?? [],
    },
    userReviewStatus: "NOT_REVIEWED_BY_USER",
  };
});

const axisMetrics = Object.fromEntries(
  AXES.map((axis) => {
    const agreed = comparisons.filter((comparison) => comparison.agreement[axis]).length;
    return [
      axis,
      {
        agreed,
        total: comparisons.length,
        rate: Number((agreed / comparisons.length).toFixed(4)),
      },
    ];
  }),
);
const exactAgreement = comparisons.filter((comparison) => comparison.exactAgreement).length;
const selectionMetrics = {
  primaryProjection: {
    agreed: comparisons.filter(
      (comparison) => comparison.selectionAgreement.primaryProjection,
    ).length,
    total: comparisons.length,
  },
  checklistTodo: {
    agreed: comparisons.filter(
      (comparison) => comparison.selectionAgreement.checklistTodo,
    ).length,
    total: comparisons.length,
  },
};
for (const metric of Object.values(selectionMetrics)) {
  metric.rate = Number((metric.agreed / metric.total).toFixed(4));
}
const disagreementIds = comparisons
  .filter((comparison) => !comparison.exactAgreement)
  .map((comparison) => comparison.contentId);

const combined = {
  schemaVersion: "flow-content-ui-independent-review-comparison-v1",
  generatedAt: GENERATED_AT,
  corpusFingerprint: view.corpusFingerprint,
  claimBoundary:
    "Two independent internal agent reviews of the frozen corpus and review surface. This is not observed-user validation or final product approval.",
  reviewBasis: {
    reviewerType: "internal_agent",
    observedUserBehavior: "NOT_RUN",
    renderedBrowserInteractionEvidence: browserQaStatus,
  },
  reviewSurfaceLineage: {
    independentlyReviewedGalleryHash: `sha256:${reviewedGalleryHash}`,
    currentGalleryHash: `sha256:${finalGalleryHash}`,
    galleryChangedAfterIndependentReview,
    unchangedMachineInputs: {
      viewModel: `sha256:${fileSha256(
        path.join(DIR, "content-ui-view-model-v1.json"),
      )}`,
      projectionResults: `sha256:${fileSha256(
        path.join(DIR, "projection-ui-results-v1.json"),
      )}`,
    },
    interpretation: galleryChangedAfterIndependentReview
      ? "A2/B2 reviewed the pre-synthesis Gallery. The current Gallery was generated afterward to display synthesized internal verdicts; final rendering requires separate browser QA and is not claimed byte-identical to the independently reviewed surface."
      : "The current Gallery is byte-identical to the independently reviewed surface.",
  },
  manualSemanticAdjudication: {
    ...manualSemanticSummary,
    needsModifyRecords: semanticNeedsModify,
  },
  corpusSnapshot,
  historicalInputsExcluded: [
    {
      file: "runs/independent-ui-review-a-v1.json",
      reason: "historical_review_with_corrupted_placeholder_text",
    },
    {
      file: "runs/independent-ui-review-b-v1.json",
      reason: "historical_peer_of_excluded_run",
    },
  ],
  runLineage: [
    {
      runId: runA.runId,
      reviewerRole: runA.reviewerRole,
      peerOutputVisible: runA.peerOutputVisible,
      peerReviewFilesRead: runA.peerReviewFilesRead,
      inputFile: runA.inputFile,
      inputFingerprints: runA.inputFingerprints,
      records: reviewsA.length,
      resultHash: sha256(rawRunA),
    },
    {
      runId: runB.runId,
      reviewerRole: runB.reviewerRole,
      peerOutputVisible: runB.peerOutputVisible,
      peerReviewFilesRead: runB.peerReviewFilesRead,
      inputFile: runB.inputFile,
      inputFingerprints: runB.inputFingerprints,
      records: reviewsB.length,
      resultHash: sha256(rawRunB),
    },
  ],
  metrics: {
    content: comparisons.length,
    exactAgreement,
    exactAgreementRate: Number((exactAgreement / comparisons.length).toFixed(4)),
    anyDisagreement: comparisons.length - exactAgreement,
    axisAgreement: axisMetrics,
    selectionAgreement: selectionMetrics,
    reviewerAContentValue: countsBy(reviewsA, "contentValue"),
    reviewerBContentValue: countsBy(reviewsB, "contentValue"),
    synthesizedInternalVerdict: countsBy(
      comparisons,
      "synthesizedInternalVerdict",
    ),
  },
  disagreementContentIds: disagreementIds,
  comparisons,
};
write("independent-ui-review-v1.json", combined);

const previousReadjudication = read("content-value-readjudication-v1.json");
const previousById = new Map(
  previousReadjudication.records.map((record) => [record.contentId, record]),
);
const readjudication = {
  schemaVersion: "flow-content-ui-value-readjudication-v1",
  generatedAt: GENERATED_AT,
  corpusFingerprint: view.corpusFingerprint,
  claimBoundary:
    "Deterministic pre-screen plus two independent internal agent reviews; not observed user save intent or product approval.",
  reviewBasis: {
    reviewerType: "internal_agent",
    observedUserBehavior: "NOT_RUN",
    userReviewStatus: "NOT_REVIEWED_BY_USER",
  },
  manualSemanticAdjudication: manualSemanticSummary,
  corpusSnapshot,
  summary: {
    records: comparisons.length,
    internalGo: comparisons.filter(
      (record) => record.synthesizedInternalVerdict === "go",
    ).length,
    internalModify: comparisons.filter(
      (record) => record.synthesizedInternalVerdict === "modify",
    ).length,
    internalHold: comparisons.filter(
      (record) => record.synthesizedInternalVerdict === "hold",
    ).length,
    valueDisagreement: comparisons.filter(
      (record) => !record.agreement.contentValue,
    ).length,
    userReviewed: 0,
  },
  records: comparisons.map((comparison) => ({
    ...previousById.get(comparison.contentId),
    reviewerA: {
      contentValue: comparison.reviewerA.contentValue,
      itemGranularity: comparison.reviewerA.itemGranularity,
      primaryProjectionSuitability: comparison.reviewerA.primaryProjection,
      selectedPrimaryProjection:
        comparison.reviewerA.selectedPrimaryProjection,
      checklistTodoDecision: comparison.reviewerA.checklistTodoDecision,
      selectedChecklistTodo: comparison.reviewerA.selectedChecklistTodo,
      scheduleSuitability: comparison.reviewerA.scheduleSuitability,
      uiUnderstandability: comparison.reviewerA.uiUnderstandability,
      modifyReasons: comparison.reviewerA.modifyReasons,
    },
    reviewerB: {
      contentValue: comparison.reviewerB.contentValue,
      itemGranularity: comparison.reviewerB.itemGranularity,
      primaryProjectionSuitability: comparison.reviewerB.primaryProjection,
      selectedPrimaryProjection:
        comparison.reviewerB.selectedPrimaryProjection,
      checklistTodoDecision: comparison.reviewerB.checklistTodoDecision,
      selectedChecklistTodo: comparison.reviewerB.selectedChecklistTodo,
      scheduleSuitability: comparison.reviewerB.scheduleSuitability,
      uiUnderstandability: comparison.reviewerB.uiUnderstandability,
      modifyReasons: comparison.reviewerB.modifyReasons,
    },
    synthesizedInternalVerdict: comparison.synthesizedInternalVerdict,
    disagreeingAxes: comparison.disagreeingAxes,
    manualSemanticAdjudication:
      comparison.manualSemanticAdjudication,
    userReviewStatus: "NOT_REVIEWED_BY_USER",
  })),
};
write("content-value-readjudication-v1.json", readjudication);

const problems = {
  itemGranularity: comparisons.filter(
    (comparison) =>
      comparison.reviewerA.itemGranularity !== "go" ||
      comparison.reviewerB.itemGranularity !== "go",
  ),
  projection: comparisons.filter(
    (comparison) =>
      !comparison.agreement.primaryProjection ||
      !comparison.selectionAgreement.primaryProjection ||
      comparison.reviewerA.primaryProjection !== "go" ||
      comparison.reviewerB.primaryProjection !== "go",
  ),
  checklistTodo: comparisons.filter(
    (comparison) =>
      !comparison.agreement.checklistTodoDecision ||
      !comparison.selectionAgreement.checklistTodo ||
      comparison.reviewerA.checklistTodoDecision !== "go" ||
      comparison.reviewerB.checklistTodoDecision !== "go",
  ),
  schedule: comparisons.filter(
    (comparison) =>
      !comparison.agreement.scheduleSuitability ||
      comparison.reviewerA.scheduleSuitability !== "go" ||
      comparison.reviewerB.scheduleSuitability !== "go",
  ),
  contentValue: comparisons.filter(
    (comparison) => !comparison.agreement.contentValue,
  ),
  ui: comparisons.filter(
    (comparison) =>
      comparison.reviewerA.uiUnderstandability !== "go" ||
      comparison.reviewerB.uiUnderstandability !== "go",
  ),
  sourceValueReentry: normal.filter((content) =>
    (content.minimumInputs ?? []).some(
      (input) => input.source && input.source !== "user_overlay",
    ),
  ),
  semanticNeedsModify,
};

const sourceValueReentryFields = problems.sourceValueReentry.reduce(
  (total, content) =>
    total +
    (content.minimumInputs ?? []).filter(
      (input) => input.source && input.source !== "user_overlay",
    ).length,
  0,
);

const evidenceIds = (records, limit = 12) =>
  records.slice(0, limit).map((record) => record.contentId);
const decisions = [
  {
    decisionId: "PD-01-item-minimum-unit",
    question: "Item의 최소 단위를 무엇으로 고정할 것인가?",
    recommendation:
      "원문 근거가 있고 독립 완료·결정·기록 상태를 저장할 가치가 있는 최소 단위로 유지한다. micro action 자동 분해는 금지한다.",
    alternative: "원문 문장 또는 화면 행마다 Item을 하나씩 만든다.",
    evidenceContentIds: evidenceIds(problems.itemGranularity),
    repeatedProblemCount: problems.itemGranularity.length,
    affectedAreas: ["backend DTO", "conversion prompt", "Flow detail UI"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-02-step-grouping",
    question: "Step의 기본 grouping은 무엇인가?",
    recommendation:
      "같은 사용자 순간·세션·원문 구간을 묶되 Item별 완료 상태는 유지한다. Step을 Todo나 Calendar의 canonical 부모로 만들지 않는다.",
    alternative: "모든 Item을 한 Step에 두거나 projection마다 새 hierarchy를 만든다.",
    evidenceContentIds: [
      "canonical:base-moving-d30",
      "canonical:base-opic-plan",
      "new:new-c08-todoist-podcast",
    ],
    repeatedProblemCount: problems.itemGranularity.length,
    affectedAreas: ["canonical contract", "projection adapter", "mobile Flow UI"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-03-checklist-versus-todo",
    question: "Checklist와 Todo를 어떤 규칙으로 나눌 것인가?",
    recommendation:
      "끝이 정해진 한 상황의 누락 방지 묶음은 Checklist, 독립적으로 재정렬·연기·추가하는 queue는 Todo로 둔다.",
    alternative: "Checklist를 Todo의 하위 canonical entity로 둔다.",
    evidenceContentIds: evidenceIds(problems.checklistTodo),
    repeatedProblemCount: problems.checklistTodo.length,
    affectedAreas: ["projection classifier", "Todo adapter", "Checklist UI"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-04-primary-projection",
    question: "기본 projection은 어떻게 정할 것인가?",
    recommendation:
      "사용자 job을 가장 적은 입력과 손실로 실행시키는 하나를 primary로 정하고, availability와 fidelity를 별도 판정한다.",
    alternative: "생성 가능한 모든 포맷을 동등하게 노출한다.",
    evidenceContentIds: evidenceIds(problems.projection),
    repeatedProblemCount: problems.projection.length,
    affectedAreas: ["artifact planner", "Gallery card", "backend response"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-05-secondary-projection-exposure",
    question: "보조 포맷을 어디까지 첫 화면에 보일 것인가?",
    recommendation:
      "primary와 최대 한 개의 자연스러운 secondary만 앞에 두고, optional·not_recommended는 포맷 비교 화면에서 손실과 함께 보여준다.",
    alternative: "다섯 포맷 버튼을 항상 같은 중요도로 노출한다.",
    evidenceContentIds: evidenceIds(problems.projection),
    repeatedProblemCount: problems.projection.length,
    affectedAreas: ["Flow detail IA", "export drawer"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-06-undated-start",
    question: "날짜 없는 콘텐츠를 처음 어떻게 시작하게 할 것인가?",
    recommendation:
      "기본은 날짜 없는 Checklist·Todo·Sheet로 바로 시작하고, 사용자가 일정화를 선택할 때만 pacing preview를 연다.",
    alternative: "저장 시 시작일과 cadence를 필수로 묻는다.",
    evidenceContentIds: [
      "canonical:base-opentutorials-web1-progress",
      "canonical:oq-oq-c03-librivox",
      "new:new-c04-instructables-origami",
    ],
    repeatedProblemCount: normal.filter((content) => content.pacingEligible)
      .length,
    affectedAreas: ["Input Composer", "UserFlowCopy", "schedule playground"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-07-pacing-default",
    question: "하루 N개·주 N개의 기본값을 둘 것인가?",
    recommendation:
      "전역 자동 확정값은 두지 않는다. 콘텐츠 길이에 맞춘 draft 예시만 보여주고 시작일·cadence 확인 후 미래 미완료 Item에만 적용한다.",
    alternative: "모든 날짜 없는 콘텐츠를 하루 1개로 자동 배치한다.",
    evidenceContentIds: [
      "canonical:base-opentutorials-web1-progress",
      "canonical:oq-oq-c02-kmooc-full",
      "events:new-gutenberg-top-reading-queue",
    ],
    repeatedProblemCount: problems.schedule.length,
    affectedAreas: ["pacing engine", "UserFlowCopy", "Calendar adapter"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-08-due-versus-calendar",
    question: "Todo due와 Calendar time을 어떻게 구분할 것인가?",
    recommendation:
      "마감일까지 끝내면 Todo/VTODO DUE, 실제 참석·예약·수업·시간 점유는 VEVENT로 보낸다. due만으로 time block을 만들지 않는다.",
    alternative: "날짜가 있는 모든 Item을 VEVENT로 만든다.",
    evidenceContentIds: [
      "canonical:value-vq-11",
      "new:new-a08-income-tax",
      "events:event-kr-qnet-exam-lifecycle",
    ],
    repeatedProblemCount: problems.schedule.length,
    affectedAreas: ["temporal intent", "ICS exporter", "Todo adapter"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-09-calendar-grouping",
    question: "Calendar per-item과 session bundle 중 무엇을 기본으로 할 것인가?",
    recommendation:
      "기본 per-item, 같은 날짜·시간·장소·세션일 때만 Step bundle을 허용하고 child Item ID와 완료 손실을 표시한다.",
    alternative: "같은 날짜의 모든 Item을 하나의 event로 묶는다.",
    evidenceContentIds: [
      "canonical:base-moving-d30",
      "canonical:base-allblanc-7day-abs",
      "legacy:preapp:busan-friends-2n3d-route",
    ],
    repeatedProblemCount: comparisons.filter(
      (comparison) =>
        comparison.reviewerA.modifyReasons.some((reason) =>
          reason.includes("bundle"),
        ) ||
        comparison.reviewerB.modifyReasons.some((reason) =>
          reason.includes("bundle"),
        ),
    ).length,
    affectedAreas: ["Calendar projection", "loss manifest", "mobile calendar"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-10-event-contract",
    question: "축제·공연·시험의 Series·Edition·Occurrence를 어떻게 저장할 것인가?",
    recommendation:
      "원문 일정은 Series/Edition/Occurrence·Window·Milestone으로 보존하고, 사용자의 저장·예약·참석 선택 뒤 Item을 만든다. 미확정 변경 일정은 멈춘다.",
    alternative: "원문 event row를 바로 완료 Item 또는 yearly RRULE로 만든다.",
    evidenceContentIds: [
      "events:event-kr-multi-show-choir",
      "events:event-kr-qnet-exam-lifecycle",
      "events:event-pattern-nps-rescheduled",
    ],
    repeatedProblemCount: 14,
    affectedAreas: ["event DTO", "event intent UI", "ICS projection"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-11-source-overlay-display",
    question: "원문 일정과 개인 일정화를 어떻게 구분해 보여줄 것인가?",
    recommendation:
      "source는 보라색·고정 라벨, user overlay는 노란색·draft/confirmed 라벨로 표시하고 서로 다른 필드에 저장한다.",
    alternative: "화면에서는 합쳐 보이고 provenance만 내부에 둔다.",
    evidenceContentIds: [
      "canonical:base-opentutorials-web1-progress",
      "canonical:base-moving-d30",
      "events:event-kr-single-performance",
    ],
    repeatedProblemCount: problems.schedule.length,
    affectedAreas: ["data contract", "schedule UI", "audit log"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-12-readiness-state-display",
    question: "Logic·Public·Rights·Personal 상태를 어디까지 노출할 것인가?",
    recommendation:
      "내부 검토 UI에서는 네 축을 독립 표시하고, 사용자 제품 화면에서는 실행 가능성과 출처·주의만 이해 가능한 문장으로 축약한다.",
    alternative: "하나의 Go/Modify/Hold 상태로 합친다.",
    evidenceContentIds: [
      "canonical:base-baby-food-174",
      "canonical:base-opentutorials-web1-progress",
      "new:new-a01-seoul-wedding-110",
    ],
    repeatedProblemCount: problems.ui.length,
    affectedAreas: ["admin UI", "public content card", "promotion gate"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-13-memo-sheet-position",
    question: "Memo와 Sheet를 제품에서 어떤 위치에 둘 것인가?",
    recommendation:
      "Sheet는 안정적인 행·열 상태/비교·진도 projection, Memo는 사람이 읽고 복사하는 문서 projection으로 둔다. 둘 다 canonical JSON이 아니다.",
    alternative: "Memo를 raw dump, Sheet를 단순 CSV 다운로드로만 취급한다.",
    evidenceContentIds: [
      "canonical:oq-oq-c08-ac-decision",
      "canonical:base-opentutorials-web1-progress",
      "new:new-a01-seoul-wedding-110",
    ],
    repeatedProblemCount: problems.projection.length,
    affectedAreas: ["export contract", "Sheet UI", "Memo UI"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-14-backend-required-fields",
    question: "backend DTO에서 반드시 보존할 필드는 무엇인가?",
    recommendation:
      "Item/Step/Flow ID, sourceRowIds, completion, temporalIntent, schedule owner·derivation·status, location, fields, event identity, projection eligibility·loss, readiness 축을 필수 계약으로 넘긴다.",
    alternative: "title·memo·start/end 중심의 ICS형 DTO로 단순화한다.",
    evidenceContentIds: evidenceIds(comparisons, 12),
    repeatedProblemCount: comparisons.length,
    affectedAreas: ["backend DTO", "DB design", "LLM output schema"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-15-semantic-source-preservation",
    question:
      "SourceRow를 Item 제목·상세로 줄일 때 어떤 의미 손실을 자동 차단할 것인가?",
    recommendation:
      "조건부 분기·안전 금지·복수 공식 경로·서로 다른 행동·계약 조건을 제목이나 detail에서 숨기지 않는다. projection 선택 이유와 user overlay는 source-backed Item 문구에 넣지 않는다.",
    alternative:
      "sourceRefs만 남아 있으면 Item 제목과 detail의 의미 손실을 허용한다.",
    evidenceContentIds: semanticNeedsModifyContentIds,
    repeatedProblemCount: semanticNeedsModify.length,
    affectedAreas: [
      "conversion prompt",
      "semantic validator",
      "Item copy",
      "UI Modify queue",
    ],
    userApprovalRequired: true,
    manualSemanticReasonCounts: semanticReasonCounts,
  },
  {
    decisionId: "PD-16-completion-schedule-provenance",
    question:
      "completion과 schedule의 owner·derivation을 canonical 계약에 어떻게 넣을 것인가?",
    recommendation:
      "completion 412개와 schedule 124개에 source·user_overlay·system_template owner와 direct·normalized·derived derivation을 명시한다. source cadence와 개인 기준일 배치를 같은 schedule fact로 저장하지 않는다.",
    alternative:
      "완료 문구와 일정 값만 저장하고 provenance는 sourceRefs에서 추정한다.",
    evidenceContentIds: [
      ...semanticNeedsModifyContentIds.slice(0, 10),
      "canonical:live-live-dyson-filter-01",
    ],
    repeatedProblemCount:
      semanticManual.summary.ownerOrProvenanceGapCounts.total,
    affectedAreas: [
      "canonical Item",
      "backend DTO",
      "schedule derivation",
      "completion UI",
    ],
    userApprovalRequired: true,
    openFieldCounts:
      semanticManual.summary.ownerOrProvenanceGapCounts,
  },
].map((decision) => ({
  ...decision,
  status: "DRAFT_PENDING_USER_REVIEW",
  evidenceBasis: "internal_agent_review",
  observedUserValidation: "NOT_RUN",
}));

write("planning-decision-handoff-v1.json", {
  schemaVersion: "flow-content-ui-planning-handoff-v1",
  generatedAt: GENERATED_AT,
  corpusFingerprint: view.corpusFingerprint,
  status: "DRAFT_PENDING_USER_REVIEW",
  claimBoundary:
    "Recommendations are internal synthesis from the frozen corpus and remain pending direct user review in the Gallery. They are not approved product defaults.",
  corpusSnapshot,
  manualSemanticAdjudication: manualSemanticSummary,
  reviewStatus: {
    internalAgentReview: "COMPLETE_FOR_CURRENT_FROZEN_INPUT",
    browserQa: browserQaStatus,
    observedUserValidation: "NOT_RUN",
    userReviewStatus: "NOT_REVIEWED_BY_USER",
    externalCalendarVtodoRoundTrip: "NOT_RUN",
  },
  decisions,
});

const gaps = [
  {
    gapId: "GAP-01-composite-item-boundary",
    severity: "high",
    title: "서로 다른 완료 판단이 한 Item에 합쳐진 사례",
    repeatedProblemCount: problems.itemGranularity.length,
    contentIds: evidenceIds(problems.itemGranularity, 20),
    proposedRule:
      "한 Item 안의 행동들이 독립적으로 미룰 수 있거나 완료 시점이 다르면 분리하고, 단일 완료 판단의 설명 행이면 함께 둔다.",
  },
  {
    gapId: "GAP-02-primary-projection-disagreement",
    severity: "high",
    title: "기본 projection 독립 판정 불일치",
    repeatedProblemCount: problems.projection.length,
    contentIds: evidenceIds(problems.projection, 20),
    proposedRule:
      "natural artifact, availability, fidelity, user job을 분리 채점하고 primary는 하나만 선택한다.",
  },
  {
    gapId: "GAP-03-checklist-todo-disagreement",
    severity: "high",
    title: "Checklist와 Todo 경계 불일치",
    repeatedProblemCount: problems.checklistTodo.length,
    contentIds: evidenceIds(problems.checklistTodo, 20),
    proposedRule:
      "closed bounded session과 independent reorderable queue를 tie-breaker로 고정한다.",
  },
  {
    gapId: "GAP-04-calendar-overload",
    severity: "high",
    title: "개인 overlay 없이 Calendar가 과도하거나 불완전한 사례",
    repeatedProblemCount: problems.schedule.length,
    contentIds: evidenceIds(problems.schedule, 20),
    proposedRule:
      "due-only, undated, incomplete-reschedule은 source VEVENT를 금지하고 user-confirmed pacing만 허용한다.",
  },
  {
    gapId: "GAP-05-event-intent-activation",
    severity: "high",
    title: "원문 행사 사실과 사용자 참석 Item 사이의 activation 공백",
    repeatedProblemCount: 14,
    contentIds: normal
      .filter((content) => content.contentMode === "event_source_before_user_intent")
      .map((content) => content.contentId),
    proposedRule:
      "Series/Edition/Occurrence를 먼저 보존하고 유효 회차 선택 뒤에만 attend/book/save Item을 만든다.",
  },
  {
    gapId: "GAP-06-ui-explanation-load",
    severity: "medium",
    title: "실제 사용 UI에서 추가 설명이 필요한 콘텐츠",
    repeatedProblemCount: problems.ui.length,
    contentIds: evidenceIds(problems.ui, 20),
    proposedRule:
      "첫 행동·현재 Step·primary projection을 먼저 보이고 provenance와 나머지 포맷은 보조 패널로 둔다.",
  },
  {
    gapId: "GAP-07-agent-value-disagreement",
    severity: "medium",
    title: "링크 저장 대비 Flow 가치 독립 판정 불일치",
    repeatedProblemCount: problems.contentValue.length,
    contentIds: evidenceIds(problems.contentValue, 20),
    proposedRule:
      "실제 사용자 검토 전에는 internal Modify로 보수적으로 유지하고 save reason과 return state를 직접 확인한다.",
  },
  {
    gapId: "GAP-08-manual-semantic-needs-modify",
    severity: "high",
    title:
      "수동 SourceRow 대조에서 Item 제목·detail 의미 수정이 필요한 사례",
    repeatedProblemCount: semanticNeedsModify.length,
    affectedFieldCount: semanticNeedsModify.length,
    affectedContentCount: semanticNeedsModifyContentIds.length,
    contentIds: semanticNeedsModifyContentIds,
    proposedRule:
      "중요 행·조건부 분기·안전 금지·복수 경로를 숨기거나, projection 근거·user overlay·원문에 없는 시점을 source-backed Item 문구에 섞지 않는다.",
    reasonCounts: semanticReasonCounts,
    reviewQueue: semanticNeedsModify.map((record) => ({
      contentId: record.contentId,
      itemId: record.itemId,
      field: record.field,
      reasonCode: record.reasonCode,
      issue: record.mismatch?.issue ?? null,
      recommendedDirection:
        record.mismatch?.recommendedDirection ?? null,
    })),
  },
  {
    gapId: "GAP-09-completion-provenance",
    severity: "high",
    title: "completion owner·derivation 미인코딩",
    repeatedProblemCount:
      semanticManual.summary.ownerOrProvenanceGapCounts.completion,
    affectedFieldCount:
      semanticManual.summary.ownerOrProvenanceGapCounts.completion,
    affectedContentCount: completionGapContentIds.length,
    contentIds: completionGapContentIds,
    proposedRule:
      "completion 문구가 source 완료 기준, 사용자 선언, 시스템 템플릿 중 무엇인지 owner와 derivation을 canonical 필드로 기록한다.",
  },
  {
    gapId: "GAP-10-schedule-owner-derivation",
    severity: "high",
    title: "schedule owner·derivation 미인코딩",
    repeatedProblemCount:
      semanticManual.summary.ownerOrProvenanceGapCounts.schedule,
    affectedFieldCount:
      semanticManual.summary.ownerOrProvenanceGapCounts.schedule,
    affectedContentCount: scheduleGapContentIds.length,
    contentIds: scheduleGapContentIds,
    proposedRule:
      "source cadence와 user/system 기준일·all-day·timezone 배치를 분리하고 scheduleOwner·derivation·suggestionStatus를 저장한다.",
    temporalEvidence: semanticManual.temporalAdjudications,
  },
  ...(sourceValueReentryFields > 0
    ? [
        {
          gapId: "GAP-11-source-value-reentry",
          severity: "high",
          title: "원문에서 확보한 값을 최소 사용자 입력으로 다시 요구하는 사례",
          repeatedProblemCount: problems.sourceValueReentry.length,
          affectedFieldCount: sourceValueReentryFields,
          contentIds: evidenceIds(problems.sourceValueReentry, 20),
          proposedRule:
            "source-owned 값은 자동 채움과 근거 표시로 보내고, minimumInputs에는 user_overlay 값만 남긴다.",
        },
      ]
    : []),
];
write("content-and-logic-gap-register-v1.json", {
  schemaVersion: "flow-content-ui-gap-register-v1",
  generatedAt: GENERATED_AT,
  corpusFingerprint: view.corpusFingerprint,
  claimBoundary:
    "Internal corpus and agent-review synthesis; not observed-user findings. Counts describe the frozen machine-readable snapshot only.",
  corpusSnapshot,
  manualSemanticAdjudication: manualSemanticSummary,
  reviewStatus: {
    browserQa: browserQaStatus,
    observedUserValidation: "NOT_RUN",
    userReviewStatus: "NOT_REVIEWED_BY_USER",
  },
  gaps: gaps.map((gap) => ({
    ...gap,
    status: "OPEN_PENDING_UI_AND_USER_REVIEW",
    evidenceBasis: "machine_corpus_and_internal_agent_review",
    observedUserValidation: "NOT_RUN",
  })),
});

const semanticReasonSummary = Object.entries(semanticReasonCounts)
  .sort((left, right) => right[1] - left[1])
  .map(([reasonCode, count]) => `\`${reasonCode}\` ${count}개`)
  .join(", ");
const semanticNeedsContentSummary = semanticNeedsModifyContentIds
  .map(
    (contentId) =>
      `- \`${contentId}\`: ${semanticContentCounts[contentId]}개 필드`,
  )
  .join("\n");

const decisionSummary = `# Flow Content UI Full-Corpus Lab v1 — 5분 결정 요약

- 상태: \`DRAFT_PENDING_USER_REVIEW\`
- 브라우저 QA: \`${browserQaStatus}\`
- 실제 사용자 검토: \`NOT_REVIEWED_BY_USER\` / observed-user validation \`NOT_RUN\`
- 외부 Calendar/VTODO 왕복: \`NOT_RUN\`
- production app/runtime/DB/API 변경: 없음

## 지금 무엇이 만들어졌나

- Gallery 전체 ${corpusSnapshot.gallery}개
- 정상·구조 검토 ${corpusSnapshot.normal}개
  - 기존·계승 corpus ${corpusSnapshot.existingNormal}개
  - 이번에 직접 확인해 별도 user job으로 추가한 정상 콘텐츠 ${corpusSnapshot.newlyAddedDistinctNormal}개
- 신규 실제 URL 직접 확인 ${corpusSnapshot.directlyInspectedNewUrls}개
- 신규 원문 중 정상 자격 ${corpusSnapshot.newlyInspectedQualifiedNormal}개
  - 그중 기존 user job 재확인·중복 병합 ${corpusSnapshot.reverifiedNormalVariantsMerged}개
- canonical Item ${corpusSnapshot.item}개
- SourceRow ${corpusSnapshot.sourceRow}개
- Calendar·Checklist·Todo·Sheet·Memo 비교 ${corpusSnapshot.projectionCell}칸

Boundary ${corpusSnapshot.boundary}개와 Historical ${corpusSnapshot.historical}개는 정상 수치에 포함하지 않는다.

## 원문 의미 보존 수동 판정

- trace-only queue ${manualSemanticSummary.traceOnlyReviewed}개를 ${manualSemanticSummary.traceOnlyContentReviewed}개 콘텐츠에서 전수 판정했다.
- \`verified_equivalent\` ${manualSemanticSummary.verdictCounts.verified_equivalent}개
- \`bounded_normalization\` ${manualSemanticSummary.verdictCounts.bounded_normalization}개
- \`needs_modify\` ${manualSemanticSummary.verdictCounts.needs_modify}개
- \`unknown\` ${manualSemanticSummary.verdictCounts.unknown}개
- 수정 대상은 ${manualSemanticSummary.needsModifyContentCount}개 콘텐츠의 ${manualSemanticSummary.needsModify}개 필드다.
- 반복 유형: ${semanticReasonSummary}

${semanticNeedsContentSummary}

이 판정은 141개 queue를 닫았다는 뜻이지 전체 corpus의 발명 0을 증명한 것이 아니다.
completion ${manualSemanticSummary.ownerOrProvenanceGapCounts.completion}개와 schedule ${manualSemanticSummary.ownerOrProvenanceGapCounts.schedule}개의 owner·derivation 공백은 그대로 남아 있으며, zero-invention 상태는 \`${manualSemanticSummary.zeroInventionClaim}\`이다.

## 현재 유지하는 데이터 문법

\`SourceRow → Item → Step → Flow → Bundle / Flow Map → Projection\`

- Item은 독립적으로 완료·결정·기록 상태를 가질 가치가 있는 최소 단위다.
- Calendar·Checklist·Todo·Sheet·Memo는 같은 Item을 목적지에 맞게 보여주는 projection이다.
- 이 구조는 이번 UI 검토의 baseline이지, 사용자가 최종 승인한 제품 계약은 아니다.

## 다섯 projection을 한 줄로 구분하면

- Checklist: 끝이 정해진 한 상황의 누락 방지 묶음
- Todo: 독립적으로 재정렬·연기할 수 있는 다음 행동 queue
- Calendar: 실제 실행 시간·참석·원문 날짜 또는 사용자가 확인한 개인 일정
- Sheet: ID·상태·필드를 안정적인 행과 열로 보존
- Memo: 사람이 읽고 복사하는 문서; canonical raw JSON은 아님

모든 콘텐츠를 다섯 포맷으로 기술적으로 시도할 수는 있지만, 생성 가능성과 자연스러움은 다르다. 각 칸은 추천도·현재 가능 여부·손실·fallback을 따로 가진다.

## 날짜 없는 콘텐츠와 행사는

- 날짜 없는 콘텐츠는 우선 Checklist·Todo·Sheet로 시작한다.
- 하루 N개·주 N개 배치는 원문 사실이 아니라 UserFlowCopy의 \`user_overlay\`다.
- preview 뒤 사용자가 확인한 미래 미완료 Item에만 적용한다.
- 공연·축제·시험은 Series → Edition → Occurrence/Window/Milestone을 먼저 보존하고, 사용자의 저장·예약·참석 의도 뒤 Item과 VEVENT/VTODO 후보를 만든다.
- 매년 날짜가 다시 발표되는 행사는 거짓 yearly RRULE을 만들지 않는다.

## 내부 검토가 말해주는 것과 말해주지 않는 것

두 내부 agent의 6축 적합성 verdict와 Primary·Checklist/Todo 선택까지 모두 같은 결과는 ${combined.metrics.exactAgreement}/${combined.metrics.content}이다.
Primary projection 선택 일치율은 ${Math.round(
  combined.metrics.selectionAgreement.primaryProjection.rate * 100,
)}%, Checklist/Todo 일치율은 ${Math.round(
  combined.metrics.selectionAgreement.checklistTodo.rate * 100,
)}%다.

이는 규칙이 어디서 흔들리는지 찾는 내부 증거다. 실제 사용자가 저장·실행·재방문할지는 아직 검증하지 않았다.

A2/B2가 직접 본 Gallery SHA는 \`${reviewedGalleryHash.slice(0, 12)}…\`이다.
현재 Gallery SHA는 \`${finalGalleryHash.slice(0, 12)}…\`${galleryChangedAfterIndependentReview ? "이며 합성된 내부 판정 표시를 넣은 post-synthesis 화면이다. view model과 projection 입력은 그대로지만, 최종 렌더링 자체는 browser QA로 따로 확인해야 하며 byte-identical 독립 검토라고 표현하지 않는다." : "로 독립 검토 화면과 동일하다."}

## 기획에서 확인할 순서

1. Item 최소 단위와 Step grouping
2. Checklist/Todo tie-breaker
3. primary와 secondary projection 노출
4. 날짜 없는 콘텐츠의 pacing 기본값
5. due와 Calendar time의 분리
6. Calendar per-item/session bundle 기본값
7. Event Series·Edition·Occurrence와 사용자 intent
8. source/user/system provenance 표시
9. backend DTO 필수 필드

현재 ${decisions.length}개 결정 후보는 모두 \`DRAFT_PENDING_USER_REVIEW\`다.

## 바로 열어볼 파일

- 전체 Gallery: \`docs/content-audit/2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html\`
- 요약·기획 보고서: \`docs/content-audit/2026-07-29-flow-content-ui-full-corpus-validation-review-v1-ko.html\`
- 결정 원본: \`planning-decision-handoff-v1.json\`
- 반복 문제: \`content-and-logic-gap-register-v1.json\`
`;

fs.writeFileSync(
  path.join(DIR, "decision-summary-ko.md"),
  `${decisionSummary.trim()}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      compared: comparisons.length,
      exactAgreement,
      exactAgreementRate: combined.metrics.exactAgreementRate,
      axisAgreement: axisMetrics,
      internalVerdict: combined.metrics.synthesizedInternalVerdict,
      decisions: decisions.length,
      gaps: gaps.length,
      manualSemanticAdjudication: {
        reviewed: manualSemanticSummary.traceOnlyReviewed,
        acceptable:
          manualSemanticSummary.acceptableWithoutMeaningChange,
        needsModify: manualSemanticSummary.needsModify,
        needsModifyContents:
          manualSemanticSummary.needsModifyContentCount,
        completionProvenanceGap:
          manualSemanticSummary.ownerOrProvenanceGapCounts.completion,
        scheduleProvenanceGap:
          manualSemanticSummary.ownerOrProvenanceGapCounts.schedule,
        zeroInventionClaim:
          manualSemanticSummary.zeroInventionClaim,
      },
      corpusSnapshot,
      decisionSummary: "decision-summary-ko.md",
    },
    null,
    2,
  ),
);
