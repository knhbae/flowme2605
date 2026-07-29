import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const specDir = path.join(repoRoot, "docs/specs/2026-07-18-url-to-flow-value-uplift-v4");
const auditDir = path.join(repoRoot, "docs/content-audit/2026-07-19-url-to-flow-p0-ten-url-benchmark");
const readText = (file) => fs.readFile(file, "utf8");
const readJson = async (file) => JSON.parse(await readText(file));

const contractPath = path.join(specDir, "experiment-contract.json");
const promptPath = path.join(specDir, "phase2-generation-prompt.md");
const snapshotPath = path.join(auditDir, "source-snapshots.json");
const validationPath = path.join(auditDir, "validation-summary.json");
const contract = await readJson(contractPath);
const snapshotsDocument = await readJson(snapshotPath);
const validation = await readJson(validationPath);
const lowerRun = await readJson(path.join(auditDir, "model-runs/lower-cost.json"));
const higherRun = await readJson(path.join(auditDir, "model-runs/higher-capability.json"));
const repairs = await readJson(path.join(auditDir, "editorial-repairs/lower-cost-repaired.json"));
const reviewerA = await readJson(path.join(auditDir, "review-results/reviewer-a.json"));
const reviewerB = await readJson(path.join(auditDir, "review-results/reviewer-b.json"));
const orderMap = await readJson(path.join(auditDir, "review-packets/order-map.json"));

const snapshots = snapshotsDocument.snapshots;
const snapshotById = new Map(snapshots.map((entry) => [entry.caseId, entry]));
const lowerById = new Map(lowerRun.cases.map((entry) => [entry.caseId, entry]));
const higherById = new Map(higherRun.cases.map((entry) => [entry.caseId, entry]));
const repairById = new Map(repairs.cases.map((entry) => [entry.caseId, entry]));
const rawValidationByLane = new Map(validation.runs.map((entry) => [entry.lane, new Map(entry.cases.map((item) => [item.caseId, item]))]));
const allowedPatterns = new Set(contract.planningPatterns);
const allowedArtifacts = new Set(contract.artifacts);

function snapshotCorpus(snapshot) {
  return [
    snapshot.bodyTextSample,
    ...(snapshot.selectedLines ?? []).map((entry) => entry.text),
    ...(snapshot.headings ?? []),
    ...(snapshot.imageAlts ?? []),
    ...(snapshot.playlistItems ?? []).flatMap((entry) => [entry.title, entry.url]),
  ].filter(Boolean).join("\n");
}

function validateSelectedCase(entry, snapshot) {
  const errors = [];
  const evidence = entry.sourceEvidence ?? [];
  const evidenceIds = new Set(evidence.map((item) => item.evidenceId));
  const corpus = snapshotCorpus(snapshot);
  for (const item of evidence) {
    if (!item.evidenceId || !item.kind || !item.text || !item.locator) errors.push(`evidence_shape:${item.evidenceId ?? "unknown"}`);
    if (item.text && !corpus.includes(item.text)) errors.push(`evidence_not_exact:${item.evidenceId}`);
  }
  if (!Array.isArray(entry.unsupportedClaims) || entry.unsupportedClaims.length > 0) errors.push("unsupported_claims_not_zero");
  if (!contract.dispositions.includes(entry.decision?.disposition)) errors.push("invalid_disposition");

  const flow = entry.flow;
  if (!flow) {
    if (entry.decision?.disposition === "compile_candidate") errors.push("null_compile_candidate");
    if ((entry.projections ?? []).length > 0) errors.push("null_flow_has_projection");
    return { passed: errors.length === 0, errors, itemCount: 0, pattern: null };
  }

  if (!allowedPatterns.has(flow.planningPattern)) errors.push("invalid_pattern");
  if (!allowedArtifacts.has(flow.primaryArtifact)) errors.push("invalid_primary_artifact");
  const itemIds = new Set((flow.items ?? []).map((item) => item.itemId));
  if (itemIds.size === 0) errors.push("empty_items");
  for (const item of flow.items ?? []) {
    if (!item.itemId || !item.stepId || !item.title || !item.intent || !item.doneWhen || item.order === undefined) {
      errors.push(`item_shape:${item.itemId ?? "unknown"}`);
    }
    if (String(item.doneWhen ?? "").trim().length < 5 || ["완료", "확인", "체크", "수행"].includes(String(item.doneWhen).trim())) {
      errors.push(`generic_done_when:${item.itemId}`);
    }
    for (const ref of item.sourceEvidenceRefs ?? []) {
      if (!evidenceIds.has(ref)) errors.push(`invalid_evidence_ref:${item.itemId}:${ref}`);
    }
  }
  if ((entry.projections ?? []).length === 0) errors.push("empty_projections");
  for (const projection of entry.projections ?? []) {
    if (!projection.target || projection.payload === undefined || !Array.isArray(projection.lossLedger) || !Array.isArray(projection.sourceItemRefs)) {
      errors.push(`projection_shape:${projection.target ?? "unknown"}`);
    }
    for (const ref of projection.sourceItemRefs ?? []) {
      if (!itemIds.has(ref)) errors.push(`invalid_projection_ref:${projection.target}:${ref}`);
    }
  }
  const sensitive = /medical|financial|privacy|safety/i.test(`${snapshot.source?.riskClass ?? ""} ${JSON.stringify(flow.risk ?? {})}`);
  if (sensitive && !["sensitive_locked", "human_review_required", "blocked"].includes(flow.publicationState)) {
    errors.push("sensitive_publication_not_locked");
  }
  return { passed: errors.length === 0, errors, itemCount: flow.items?.length ?? 0, pattern: flow.planningPattern };
}

function reviewerId(result, fallback) {
  return result.reviewerId ?? (result.packetId?.endsWith("reviewer-b") ? "reviewer-b" : fallback);
}

function decodeReview(result, fallbackId, caseId) {
  const id = reviewerId(result, fallbackId);
  const caseReview = result.cases.find((entry) => entry.caseId === caseId);
  const order = orderMap.find((entry) => entry.reviewerId === id && entry.caseId === caseId);
  if (!caseReview || !order) throw new Error(`Missing review mapping for ${id}/${caseId}`);
  const laneForOption = (option) => option === "A" ? order.optionA : option === "B" ? order.optionB : "tie";
  const scores = {};
  for (const option of ["A", "B"]) {
    const lane = laneForOption(option);
    const dimensions = caseReview.optionScores[option];
    scores[lane] = {
      dimensions,
      average: Object.values(dimensions).reduce((sum, value) => sum + value, 0) / Object.values(dimensions).length,
    };
  }
  return {
    reviewerId: id,
    reviewerProxy: result.reviewerProxy,
    overallOption: caseReview.overallChoice,
    laneChoice: laneForOption(caseReview.overallChoice),
    scores,
    judgments: caseReview.judgments,
    criticalFindings: caseReview.criticalFindings,
    note: caseReview.note,
  };
}

function selectRawLane(validLanes, reviews) {
  if (validLanes.length === 1) return { lane: validLanes[0], reason: "only_raw_lane_passing_hard_gate" };
  if (validLanes.length === 2) {
    const nonTie = reviews.map((entry) => entry.laneChoice).filter((entry) => entry !== "tie");
    if (nonTie.length === 2 && nonTie[0] === nonTie[1]) return { lane: nonTie[0], reason: "both_raw_lanes_passed_and_blind_review_consensus" };
    if (nonTie.length === 1) return { lane: nonTie[0], reason: "both_raw_lanes_passed_and_one_blind_vote_with_one_tie" };
    return { lane: "lower_cost", reason: "both_raw_lanes_passed_without_consensus_lower_output_proxy_tiebreak" };
  }
  return null;
}

const selectedCases = snapshots.map((snapshot) => {
  const caseId = snapshot.caseId;
  const reviews = [decodeReview(reviewerA, "reviewer-a", caseId), decodeReview(reviewerB, "reviewer-b", caseId)];
  const lowerValidation = rawValidationByLane.get("lower_cost").get(caseId);
  const higherValidation = rawValidationByLane.get("higher_capability").get(caseId);
  const validLanes = [
    lowerValidation.passed ? "lower_cost" : null,
    higherValidation.passed ? "higher_capability" : null,
  ].filter(Boolean);
  const rawSelection = selectRawLane(validLanes, reviews);
  let candidate;
  let selection;
  let editProxy = { kind: "none", operations: [], weightedEditPoints: 0, actualHumanEdit: null };

  if (rawSelection) {
    candidate = rawSelection.lane === "lower_cost" ? lowerById.get(caseId) : higherById.get(caseId);
    selection = { kind: "raw_model_output", lane: rawSelection.lane, reason: rawSelection.reason };
  } else if (repairById.has(caseId)) {
    const repair = repairById.get(caseId);
    candidate = repair.repairedCase;
    selection = { kind: "editorial_repair_proxy", lane: "lower_cost", reason: "no_raw_lane_passed_hard_gate_exact_evidence_repaired_without_external_knowledge" };
    editProxy = {
      kind: repairs.proxyKind,
      operations: repair.operations,
      weightedEditPoints: repair.weightedEditPoints,
      actualHumanEdit: repairs.actualHumanEdit,
      notes: repair.notes,
    };
  } else {
    throw new Error(`${caseId} has no hard-gate-valid raw output and no bounded repair`);
  }

  const selectedValidation = validateSelectedCase(candidate, snapshot);
  const laneCase = selection.lane === "higher_capability" ? higherById.get(caseId) : lowerById.get(caseId);
  return {
    caseId,
    title: snapshot.title,
    source: snapshot.source,
    requestedUrl: snapshot.requestedUrl,
    sourceSnapshot: {
      capturedAt: snapshot.capturedAt,
      accessStatus: snapshot.accessStatus,
      httpStatus: snapshot.httpStatus,
      elapsedMs: snapshot.elapsedMs,
      htmlFallback: snapshot.htmlFallback,
      bodyTextSha256: snapshot.bodyTextSha256,
      selectedLineCount: snapshot.selectedLines?.length ?? 0,
    },
    rawGate: {
      lowerCost: lowerValidation,
      higherCapability: higherValidation,
    },
    blindReviews: reviews,
    selection,
    editProxy,
    generationTokenProxy: Math.ceil(JSON.stringify(laneCase).length / 4),
    selectedValidation,
    candidate,
  };
});

const selectedErrors = selectedCases.flatMap((entry) => entry.selectedValidation.errors.map((error) => `${entry.caseId}:${error}`));
if (selectedErrors.length > 0) throw new Error(`Selected validation failed:\n${selectedErrors.join("\n")}`);

const lowerSummary = validation.runs.find((entry) => entry.lane === "lower_cost");
const higherSummary = validation.runs.find((entry) => entry.lane === "higher_capability");
const promptText = await readText(promptPath);
const contractText = await readText(contractPath);
const snapshotText = await readText(snapshotPath);
const elapsed = snapshots.map((entry) => entry.elapsedMs).sort((a, b) => a - b);
const medianElapsedMs = elapsed.length % 2 ? elapsed[(elapsed.length - 1) / 2] : (elapsed[elapsed.length / 2 - 1] + elapsed[elapsed.length / 2]) / 2;
const generatedSelected = selectedCases.filter((entry) => entry.candidate.flow);
const selectedPatterns = [...new Set(generatedSelected.map((entry) => entry.candidate.flow.planningPattern))];
const repairCases = selectedCases.filter((entry) => entry.selection.kind === "editorial_repair_proxy");
const reviewerVotes = { lower_cost: 0, higher_capability: 0, tie: 0 };
for (const entry of selectedCases) for (const review of entry.blindReviews) reviewerVotes[review.laneChoice] += 1;

const editoriallyUsable = selectedCases.filter((entry) => entry.selectedValidation.passed && entry.candidate.flow && ["compile_candidate", "draft_only"].includes(entry.candidate.decision.disposition));
const internalGatePassed = snapshots.length === 10 && editoriallyUsable.length >= contract.backendGate.minimumEditoriallyUsableCases && selectedPatterns.length >= contract.backendGate.minimumAcceptedPlanningPatterns && selectedErrors.length === 0;

const selectedDocument = {
  schemaVersion: "flowme-url-to-flow-selected-v1.0",
  createdAt: new Date().toISOString(),
  selectionPolicy: [
    "Hard source and structure gates precede blind preference.",
    "When both raw lanes pass, two non-tie blind votes may choose a lane; otherwise lower output proxy breaks the tie.",
    "When neither raw lane passes, only a separately logged source-evidence repair may enter the selected set.",
    "A correct zero-output hold is a valid selected result.",
  ],
  sourceRunIds: { lowerCost: lowerRun.runId, higherCapability: higherRun.runId },
  cases: selectedCases,
};

const summary = {
  schemaVersion: "flowme-url-to-flow-p0-ten-url-benchmark-summary-v1.0",
  createdAt: new Date().toISOString(),
  strategyBaseline: contract.strategyBaseline,
  sourceCapture: {
    totalCases: snapshots.length,
    readableCases: snapshots.filter((entry) => entry.accessStatus === "readable").length,
    browserOrStaticFallbackCases: snapshots.filter((entry) => entry.htmlFallback).length,
    elapsedTotalMs: elapsed.reduce((sum, value) => sum + value, 0),
    elapsedMedianMs: medianElapsedMs,
    elapsedMinimumMs: elapsed[0],
    elapsedMaximumMs: elapsed.at(-1),
    rightsReviewCases: snapshots.filter((entry) => entry.source?.rightsStatus === "needs_review").length,
    sensitiveCases: snapshots.filter((entry) => /medical|financial|privacy|safety/i.test(entry.source?.riskClass ?? "")).length,
  },
  rawLanes: [lowerSummary, higherSummary].map((entry) => ({
    lane: entry.lane,
    modelProxy: entry.modelProxy,
    reasoningEffort: entry.reasoningEffort,
    rawOutputChars: entry.rawOutputChars,
    estimatedOutputTokens: entry.estimatedOutputTokens,
    strictPassedCases: entry.passedCaseCount,
    compileCandidatesProposed: entry.compileCandidateCount,
    hardGateAcceptedCompileCandidates: entry.acceptedCandidateCount,
    exactEvidenceFailureCount: entry.cases.reduce((sum, item) => sum + item.errors.filter((error) => error.includes("text_not_exact")).length, 0),
    tokenProxyPerStrictPass: Math.round(entry.estimatedOutputTokens / entry.passedCaseCount),
    actualProviderCost: entry.actualProviderCost,
    actualApiLatency: null,
  })),
  blindReview: {
    kind: "two_blind_model_proxies_not_human_review",
    reviewerCount: 2,
    totalOverallVotes: 20,
    laneVotes: reviewerVotes,
    actualHumanReviewCount: 0,
  },
  selected: {
    hardGatePassedCases: selectedCases.filter((entry) => entry.selectedValidation.passed).length,
    generatedFlowCases: generatedSelected.length,
    correctHoldCases: selectedCases.filter((entry) => !entry.candidate.flow).length,
    compileCandidateCases: selectedCases.filter((entry) => entry.candidate.decision.disposition === "compile_candidate").length,
    draftOnlyCases: selectedCases.filter((entry) => entry.candidate.decision.disposition === "draft_only").length,
    rawSelectedCases: selectedCases.filter((entry) => entry.selection.kind === "raw_model_output").length,
    repairSelectedCases: repairCases.length,
    lowerLaneCases: selectedCases.filter((entry) => entry.selection.lane === "lower_cost").length,
    higherLaneCases: selectedCases.filter((entry) => entry.selection.lane === "higher_capability").length,
    planningPatterns: selectedPatterns,
    editoriallyUsableCases: editoriallyUsable.length,
    publicReadyCases: 0,
  },
  editProxy: {
    kind: repairs.proxyKind,
    repairedCases: repairCases.length,
    generatedCaseRepairRate: repairCases.length / generatedSelected.length,
    operationCount: repairCases.reduce((sum, entry) => sum + entry.editProxy.operations.length, 0),
    weightedEditPoints: repairCases.reduce((sum, entry) => sum + entry.editProxy.weightedEditPoints, 0),
    actualHumanEdit: null,
  },
  costProxy: {
    method: "utf8_character_count_divided_by_four",
    commonBatchInputChars: promptText.length + contractText.length + snapshotText.length,
    commonBatchInputTokenProxy: Math.ceil((promptText.length + contractText.length + snapshotText.length) / 4),
    lowerToHigherOutputTokenRatio: higherSummary.estimatedOutputTokens / lowerSummary.estimatedOutputTokens,
    actualProviderCost: null,
    actualRequestIds: null,
    actualGenerationLatency: null,
    warning: "This is a session and file-size proxy, not provider billing telemetry.",
  },
  backendDecision: {
    minimumInternalAdapter: internalGatePassed ? "conditional_go" : "hold",
    productionUrlAiBackend: "hold",
    automaticPublication: "no_go",
    allowedNow: [
      "frozen snapshot capture with explicit fallback state",
      "cheap-first proposal lane",
      "deterministic exact-evidence and reference validation",
      "bounded escalation and human review queue",
      "calendar/checklist/sheet/memo preview generation without account writes",
    ],
    productionHoldReasons: [
      "Actual provider price, request telemetry, retries, and generation latency were not measured.",
      "No human pairwise review or human edit-distance measurement was performed.",
      "Three creator/reference cases still require rights review or approval.",
      "Five sensitive cases require locked human review before publication.",
      "Three of nine generated selections needed an agent evidence-repair proxy.",
    ],
  },
  nonClaims: [
    "Model-proxy review is not human validation.",
    "Agent repair points are not human edit distance or labor cost.",
    "Session model labels are not evidence of API price tiers.",
    "A selected candidate is not automatically publishable.",
  ],
};

const selectedValidationDocument = {
  schemaVersion: "flowme-url-to-flow-selected-validation-v1.0",
  generatedAt: new Date().toISOString(),
  passed: selectedErrors.length === 0,
  caseCount: selectedCases.length,
  passedCaseCount: selectedCases.filter((entry) => entry.selectedValidation.passed).length,
  errors: selectedErrors,
  gates: {
    exactEvidenceAndReferences: selectedErrors.length === 0,
    unsupportedClaimsMaximum: 0,
    selectedPlanningPatternCount: selectedPatterns.length,
    editoriallyUsableCaseCount: editoriallyUsable.length,
    sensitiveAutoPublicAllowed: false,
  },
};

await fs.writeFile(path.join(auditDir, "selected-flows.json"), `${JSON.stringify(selectedDocument, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(auditDir, "benchmark-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(auditDir, "selected-validation.json"), `${JSON.stringify(selectedValidationDocument, null, 2)}\n`, "utf8");

process.stdout.write(`${JSON.stringify({
  selected: summary.selected,
  blindVotes: summary.blindReview.laneVotes,
  editProxy: summary.editProxy,
  backendDecision: summary.backendDecision,
}, null, 2)}\n`);
