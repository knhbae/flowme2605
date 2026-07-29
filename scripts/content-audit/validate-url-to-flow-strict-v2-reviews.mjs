import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditDir,
  canonicalSha256,
  collectExecutorEvidence,
  exists,
  laneId,
  readJson,
  readText,
  relativePath,
  repoRoot,
  schemaErrors,
  sha256,
  specDir,
  writeJson,
} from "./url-to-flow-strict-v2-core.mjs";
import {
  reviewBatchRefs,
  reviewRawPath,
  verifyReviewManifestArtifacts,
} from "./build-url-to-flow-strict-v2-review-inputs.mjs";
import { resolveSimplePath } from "./validate-url-to-flow-strict-v2.mjs";

function parseArgs(argv) {
  const roundIndex = argv.indexOf("--round");
  const round = roundIndex >= 0 ? argv[roundIndex + 1] : null;
  const json = argv.includes("--json");
  const outIndex = argv.indexOf("--out");
  const out = outIndex >= 0 ? argv[outIndex + 1] : null;
  const allowedCount = 2 + Number(json) + (out ? 2 : 0);
  if (argv.length !== allowedCount) throw new Error(`Unknown arguments: ${argv.join(" ")}`);
  if (!/^round-[123]$/.test(round ?? "")) throw new Error("--round round-1|round-2|round-3 is required");
  return { round, json, out };
}

function average(values) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function inspectReviewDirectory(round) {
  const directoryPath = path.join(auditDir, "reviews", round);
  let entries = [];
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const expectedBatchNames = reviewBatchRefs.map((batchRef) => `${batchRef}.json`);
  const allowedJsonNames = new Set([...expectedBatchNames, "validation.json"]);
  const jsonEntries = entries.filter((entry) => entry.name.endsWith(".json"));
  const actualJsonNames = jsonEntries
    .filter((entry) => entry.name !== "validation.json")
    .map((entry) => entry.name)
    .sort();
  const missingBatchNames = expectedBatchNames.filter(
    (name) => !jsonEntries.some((entry) => entry.name === name && entry.isFile()),
  );
  const extraJsonNames = jsonEntries
    .filter((entry) => !allowedJsonNames.has(entry.name) || !entry.isFile())
    .map((entry) => entry.name)
    .sort();
  return {
    passed: missingBatchNames.length === 0 && extraJsonNames.length === 0,
    actualJsonNames,
    missingBatchNames,
    extraJsonNames,
  };
}

function expectedItemReason(verdict, reasonCode) {
  if (verdict === "keep") return reasonCode === "supported_as_written";
  if (verdict === "edit") {
    return ["wording_only", "intent_mismatch", "completion_mismatch", "unsupported_action", "unsupported_schedule", "unsupported_fact"].includes(reasonCode);
  }
  return ["unsupported_action", "unsupported_schedule", "unsupported_fact", "resource_contents_invented", "should_be_omitted"].includes(reasonCode);
}

const unsupportedClassesByReason = {
  unsupported_action: new Set(["action"]),
  unsupported_schedule: new Set(["date", "repeat"]),
  unsupported_fact: new Set(["fact"]),
  resource_contents_invented: new Set(["fact"]),
  should_be_omitted: new Set(["action", "fact"]),
};

const unsupportedReasonsByClass = {
  action: new Set(["unsupported_action", "should_be_omitted"]),
  date: new Set(["unsupported_schedule"]),
  repeat: new Set(["unsupported_schedule"]),
  fact: new Set(["unsupported_fact", "resource_contents_invented", "should_be_omitted"]),
};

const itemSignalPath = (index, signalPath) =>
  signalPath === `$.items[${index}]` || signalPath?.startsWith(`$.items[${index}].`);

async function validateReviewEnvelope({
  envelopePath,
  envelope,
  manifestEntry,
  manifest,
  manifestSha256,
  reviewSchema,
  run,
  inputBySampleRef,
}) {
  const errors = [];
  if (envelope?.reviewEnvelopeVersion !== "flowme-url-to-flow-strict-review-envelope-v2") errors.push({ code: "review_envelope_version", path: "$.reviewEnvelopeVersion" });
  if (envelope?.laneId !== laneId) errors.push({ code: "lane_id_mismatch", path: "$.laneId" });
  if (envelope?.round !== manifestEntry.round) errors.push({ code: "round_mismatch", path: "$.round" });
  if (envelope?.batchRef !== manifestEntry.batchRef) errors.push({ code: "batch_mismatch", path: "$.batchRef" });
  if (envelope?.evidenceClass !== "current_session_model_proxy_blind_review") errors.push({ code: "review_evidence_class", path: "$.evidenceClass" });
  const assemblyIssues = Array.isArray(envelope?.assemblyIssues) ? envelope.assemblyIssues : [];
  const expectedAssemblyStatus = assemblyIssues.length === 0 ? "assembled" : "failure";
  if (envelope?.assemblyStatus !== expectedAssemblyStatus) errors.push({ code: "review_assembly_status_mismatch", path: "$.assemblyStatus" });
  if (envelope?.assemblyStatus !== "assembled") {
    errors.push({ code: "review_assembly_failed", path: "$.assemblyIssues", detail: assemblyIssues });
  }
  if (envelope?.executor?.forkTurns !== "none") errors.push({ code: "review_fresh_context_required", path: "$.executor.forkTurns" });
  if (!envelope?.executor?.agentTaskId) errors.push({ code: "review_agent_id_required", path: "$.executor.agentTaskId" });
  if (envelope?.executor?.agentTaskId === run?.executor?.agentTaskId) errors.push({ code: "reviewer_must_differ_from_generator", path: "$.executor.agentTaskId" });
  for (const key of ["provider", "model", "tier", "inputTokens", "outputTokens", "latencyMs", "cost", "currency"]) {
    if (envelope?.measurement?.[key] !== null) errors.push({ code: "unmeasured_review_field_must_be_null", path: `$.measurement.${key}` });
  }
  if (envelope?.bindings?.rubricSha256 !== manifestEntry.rubricSha256) errors.push({ code: "rubric_hash_mismatch", path: "$.bindings.rubricSha256" });
  if (envelope?.bindings?.reviewSchemaSha256 !== manifestEntry.reviewSchemaSha256) errors.push({ code: "review_schema_hash_mismatch", path: "$.bindings.reviewSchemaSha256" });
  if (envelope?.bindings?.baseFreezeSha256 !== manifest.baseFreezeSha256) errors.push({ code: "base_freeze_hash_mismatch", path: "$.bindings.baseFreezeSha256" });
  if (envelope?.bindings?.revisionFreezeSha256 !== manifest.revisionFreezeSha256) errors.push({ code: "revision_freeze_hash_mismatch", path: "$.bindings.revisionFreezeSha256" });
  if (envelope?.bindings?.reviewManifestSha256 !== manifestSha256) errors.push({ code: "review_manifest_hash_mismatch", path: "$.bindings.reviewManifestSha256" });
  if (envelope?.bindings?.automatedValidationFile !== manifest.automatedValidationFile) errors.push({ code: "automated_validation_file_mismatch", path: "$.bindings.automatedValidationFile" });
  if (envelope?.bindings?.automatedValidationSha256 !== manifest.automatedValidationSha256) errors.push({ code: "automated_validation_hash_mismatch", path: "$.bindings.automatedValidationSha256" });
  if (envelope?.bindings?.runEnvelopeSha256 !== manifestEntry.runEnvelopeSha256) errors.push({ code: "run_envelope_hash_mismatch", path: "$.bindings.runEnvelopeSha256" });
  if (envelope?.bindings?.exactTaskPayloadSha256 !== manifestEntry.exactTaskPayloadSha256) errors.push({ code: "review_task_hash_mismatch", path: "$.bindings.exactTaskPayloadSha256" });
  if (canonicalSha256(envelope?.bindings?.reviewInputFileSha256BySampleRef ?? {}) !== canonicalSha256(manifestEntry.reviewInputFileSha256BySampleRef)) errors.push({ code: "review_input_file_hash_map_mismatch", path: "$.bindings.reviewInputFileSha256BySampleRef" });
  if (canonicalSha256(envelope?.bindings?.reviewInputSha256BySampleRef ?? {}) !== canonicalSha256(manifestEntry.reviewInputSha256BySampleRef)) errors.push({ code: "review_input_hash_map_mismatch", path: "$.bindings.reviewInputSha256BySampleRef" });
  if (canonicalSha256(envelope?.bindings?.proposalFingerprintBySampleRef ?? {}) !== canonicalSha256(manifestEntry.proposalFingerprintBySampleRef)) errors.push({ code: "proposal_fingerprint_map_mismatch", path: "$.bindings.proposalFingerprintBySampleRef" });
  if (typeof envelope?.rawResponse !== "string" || sha256(envelope.rawResponse ?? "") !== envelope?.rawResponseSha256) errors.push({ code: "review_raw_hash_mismatch", path: "$.rawResponseSha256" });
  if (typeof envelope?.rawResponseSource !== "string") {
    errors.push({ code: "review_raw_source_missing", path: "$.rawResponseSource" });
  } else {
    const rawSourcePath = path.resolve(repoRoot, envelope.rawResponseSource);
    const expectedRawSourcePath = reviewRawPath(manifestEntry.round, manifestEntry.batchRef);
    if (rawSourcePath !== expectedRawSourcePath) {
      errors.push({
        code: "review_raw_source_path_mismatch",
        path: "$.rawResponseSource",
        detail: { expected: relativePath(expectedRawSourcePath), actual: envelope.rawResponseSource },
      });
    }
    if (!(await exists(rawSourcePath))) {
      errors.push({ code: "review_raw_source_file_missing", path: "$.rawResponseSource" });
    } else {
      const actualRawSource = await readText(rawSourcePath);
      if (actualRawSource !== envelope.rawResponse) {
        errors.push({ code: "review_raw_source_bytes_mismatch", path: "$.rawResponseSource" });
      }
    }
  }
  let rawReviews = null;
  try {
    rawReviews = JSON.parse(envelope?.rawResponse ?? "");
    if (!Array.isArray(rawReviews)) throw new Error("not array");
  } catch (error) {
    errors.push({ code: "review_raw_not_bare_json_array", path: "$.rawResponse", detail: error.message });
  }
  if (!rawReviews && envelope?.parsedReviewsSha256 !== null) errors.push({ code: "malformed_review_must_have_null_parsed_hash", path: "$.parsedReviewsSha256" });
  if (rawReviews && canonicalSha256(rawReviews) !== envelope?.parsedReviewsSha256) errors.push({ code: "parsed_reviews_hash_mismatch", path: "$.parsedReviewsSha256" });
  if (rawReviews && canonicalSha256(rawReviews) !== canonicalSha256(envelope?.reviews ?? [])) errors.push({ code: "raw_reviews_do_not_match_envelope", path: "$.reviews" });
  const reviews = Array.isArray(envelope?.reviews) ? envelope.reviews : [];
  if (reviews.length !== manifestEntry.inputCount) errors.push({ code: "review_count_mismatch", path: "$.reviews", detail: { expected: manifestEntry.inputCount, actual: reviews.length } });
  const reviewResults = [];
  for (const [index, review] of reviews.entries()) {
    const reviewIsObject = review !== null && typeof review === "object" && !Array.isArray(review);
    const normalizedReview = reviewIsObject ? review : {};
    let schemaReviewErrors;
    try {
      schemaReviewErrors = schemaErrors(review, reviewSchema, reviewSchema);
    } catch (error) {
      schemaReviewErrors = [{ code: "review_schema_validation_exception", path: "$", detail: error.message }];
    }
    const reviewErrors = [...schemaReviewErrors];
    const expectedSampleRef = manifestEntry.sampleRefs[index];
    const actualSampleRef = normalizedReview.sampleRef;
    const reviewInput = typeof actualSampleRef === "string" ? inputBySampleRef.get(actualSampleRef) : null;
    if (actualSampleRef !== expectedSampleRef) reviewErrors.push({ code: "review_sample_order_mismatch", path: "$.sampleRef" });
    if (!reviewInput) reviewErrors.push({ code: "review_input_missing", path: "$.sampleRef" });
    if (normalizedReview.reviewInputSha256 !== manifestEntry.reviewInputSha256BySampleRef[actualSampleRef]) reviewErrors.push({ code: "review_input_hash_mismatch", path: "$.reviewInputSha256" });
    if (normalizedReview.proposalFingerprint !== manifestEntry.proposalFingerprintBySampleRef[actualSampleRef]) reviewErrors.push({ code: "proposal_fingerprint_mismatch", path: "$.proposalFingerprint" });
    const proposal = reviewInput?.proposal;
    const proposalItemRefs = (proposal?.items ?? []).map((item) => item.itemRef);
    const itemVerdicts = Array.isArray(normalizedReview.itemVerdicts) ? normalizedReview.itemVerdicts : [];
    const unsupportedSignals = Array.isArray(normalizedReview.unsupportedSignals) ? normalizedReview.unsupportedSignals : [];
    const verdictItemRefs = itemVerdicts.map((item) => item?.itemRef);
    if (new Set(verdictItemRefs).size !== verdictItemRefs.length) reviewErrors.push({ code: "duplicate_item_verdict", path: "$.itemVerdicts" });
    if (
      proposalItemRefs.length !== verdictItemRefs.length ||
      !proposalItemRefs.every((value, itemIndex) => verdictItemRefs[itemIndex] === value)
    ) {
      reviewErrors.push({ code: "item_verdict_exact_order_mismatch", path: "$.itemVerdicts" });
    }
    for (const [verdictIndex, verdict] of itemVerdicts.entries()) {
      if (!expectedItemReason(verdict?.verdict, verdict?.reasonCode)) reviewErrors.push({ code: "item_verdict_reason_mismatch", path: `$.itemVerdicts[${verdictIndex}].reasonCode` });
    }
    for (const [signalIndex, signal] of unsupportedSignals.entries()) {
      const resolved = resolveSimplePath(proposal, signal?.path);
      if (!resolved.found) reviewErrors.push({ code: "unsupported_signal_path_missing", path: `$.unsupportedSignals[${signalIndex}].path` });
      else if (typeof resolved.value !== "string") reviewErrors.push({ code: "unsupported_signal_path_not_string", path: `$.unsupportedSignals[${signalIndex}].path` });
      else if (typeof signal?.quote !== "string" || !resolved.value.includes(signal.quote)) reviewErrors.push({ code: "unsupported_signal_quote_missing", path: `$.unsupportedSignals[${signalIndex}].quote` });
    }
    for (const [verdictIndex, verdict] of itemVerdicts.entries()) {
      const requiredClasses = unsupportedClassesByReason[verdict?.reasonCode];
      if (!requiredClasses) continue;
      const matchingSignal = unsupportedSignals.some(
        (signal) =>
          requiredClasses.has(signal?.class) && itemSignalPath(verdictIndex, signal?.path),
      );
      if (!matchingSignal) {
        reviewErrors.push({
          code: "unsupported_verdict_missing_matching_signal",
          path: `$.itemVerdicts[${verdictIndex}].reasonCode`,
          detail: { reasonCode: verdict?.reasonCode, expectedClasses: [...requiredClasses] },
        });
      }
    }
    for (const [signalIndex, signal] of unsupportedSignals.entries()) {
      const itemMatch = /^\$\.items\[([0-9]+)\](?:\.|$)/u.exec(signal?.path ?? "");
      if (!itemMatch) continue;
      const itemIndex = Number(itemMatch[1]);
      const verdict = itemVerdicts[itemIndex];
      const allowedReasons = unsupportedReasonsByClass[signal?.class];
      if (!verdict || !allowedReasons?.has(verdict?.reasonCode)) {
        reviewErrors.push({
          code: "item_signal_missing_matching_verdict_reason",
          path: `$.unsupportedSignals[${signalIndex}]`,
          detail: {
            itemIndex,
            signalClass: signal?.class,
            actualReasonCode: verdict?.reasonCode ?? null,
          },
        });
      }
    }
    const allKeep = itemVerdicts.every((entry) => entry?.verdict === "keep");
    const anyEdit = itemVerdicts.some((entry) => entry?.verdict === "edit");
    const anyRemove = itemVerdicts.some((entry) => entry?.verdict === "remove");
    const unsupportedCount = unsupportedSignals.length;
    if (
      normalizedReview.caseVerdict === "pass" &&
      (!allKeep || unsupportedCount > 0 || normalizedReview.topIssueCode !== null)
    ) {
      reviewErrors.push({ code: "pass_verdict_inconsistent", path: "$.caseVerdict" });
    }
    if (anyRemove && normalizedReview.caseVerdict !== "fail") reviewErrors.push({ code: "remove_requires_fail_verdict", path: "$.caseVerdict" });
    if (!anyRemove && anyEdit && normalizedReview.caseVerdict === "pass") reviewErrors.push({ code: "edit_cannot_pass", path: "$.caseVerdict" });
    if (normalizedReview.caseVerdict === "fail" && !anyRemove && unsupportedCount === 0) reviewErrors.push({ code: "fail_verdict_without_failure", path: "$.caseVerdict" });
    if (normalizedReview.caseVerdict === "revise" && allKeep && unsupportedCount === 0) reviewErrors.push({ code: "revise_verdict_without_revision", path: "$.caseVerdict" });
    reviewResults.push({
      sampleRef: actualSampleRef ?? null,
      passed: reviewErrors.length === 0,
      errors: reviewErrors,
      aggregateEligible: reviewIsObject && schemaReviewErrors.length === 0,
      review: normalizedReview,
      proposal,
      sourceRows: reviewInput?.sourceRows ?? [],
    });
  }
  return {
    file: relativePath(envelopePath),
    batchRef: manifestEntry.batchRef,
    reviewerAgentTaskId: envelope?.executor?.agentTaskId ?? null,
    passed: errors.length === 0 && reviewResults.every((entry) => entry.passed),
    envelopeErrors: errors,
    reviewResults,
  };
}

export async function validateStrictReviews(argv) {
  const args = parseArgs(argv);
  const { value: reviewSchema } = await readJson(path.join(specDir, "review-result-schema-v2.json"));
  const { value: cases } = await readJson(path.join(specDir, "cases-v2.json"));
  const { value: protocol } = await readJson(path.join(specDir, "protocol-v2.json"));
  const verified = await verifyReviewManifestArtifacts({ round: args.round });
  const { manifest, inputBySampleRef } = verified;
  const automated = verified.automated;
  const reviewDirectory = await inspectReviewDirectory(args.round);
  const documents = [];
  for (const batchRef of reviewBatchRefs) {
    const entry = manifest.entries.find((candidate) => candidate.batchRef === batchRef);
    const envelopePath = path.join(auditDir, "reviews", args.round, `${entry.batchRef}.json`);
    const { value: envelope } = await readJson(envelopePath);
    const run = verified.runByBatchRef.get(batchRef);
    documents.push(
      await validateReviewEnvelope({
        envelopePath,
        envelope,
        manifestEntry: { ...entry, round: args.round, rubricSha256: manifest.rubricSha256, reviewSchemaSha256: manifest.reviewSchemaSha256 },
        manifest,
        manifestSha256: verified.manifestSha256,
        reviewSchema,
        run,
        inputBySampleRef,
      }),
    );
  }
  const reviewerIds = documents.map((entry) => entry.reviewerAgentTaskId);
  const reviewerGlobalUnique =
    reviewerIds.every(Boolean) && new Set(reviewerIds).size === reviewerIds.length;
  const generatorIds = new Set(verified.generatorAgentTaskIds);
  const reviewerGeneratorDisjoint = reviewerIds.every(
    (reviewerId) => reviewerId && !generatorIds.has(reviewerId),
  );
  const reviewerIsolationPassed = reviewerGlobalUnique && reviewerGeneratorDisjoint;
  const reviewResults = documents.flatMap((entry) => entry.reviewResults);
  const allReviews = reviewResults
    .filter((entry) => entry.aggregateEligible)
    .map((entry) => entry.review);
  const allItemVerdicts = allReviews.flatMap((review) =>
    Array.isArray(review.itemVerdicts) ? review.itemVerdicts : [],
  );
  const executorEvidence = await collectExecutorEvidence();
  const allExecutorIds = executorEvidence.entries
    .map((entry) => entry.agentTaskId)
    .filter((agentTaskId) => typeof agentTaskId === "string" && agentTaskId.length > 0);
  const allExecutorIdsUnique =
    allExecutorIds.length === executorEvidence.entries.length &&
    new Set(allExecutorIds).size === allExecutorIds.length;
  const allGeneratorIds = new Set(
    executorEvidence.entries
      .filter((entry) => entry.role === "generator" && entry.agentTaskId)
      .map((entry) => entry.agentTaskId),
  );
  const allReviewerIds = new Set(
    executorEvidence.entries
      .filter((entry) => entry.role === "reviewer" && entry.agentTaskId)
      .map((entry) => entry.agentTaskId),
  );
  const allExecutorRolesDisjoint = [...allReviewerIds].every(
    (reviewerId) => !allGeneratorIds.has(reviewerId),
  );
  const keptItemRefsBySample = new Map(
    allReviews.map((review) => [
      review.sampleRef,
      new Set(review.itemVerdicts.filter((entry) => entry.verdict === "keep").map((entry) => entry.itemRef)),
    ]),
  );
  let eligibleRowCount = 0;
  let eligibleRowsConnectedToKeptItems = 0;
  for (const strictCase of cases.cases.filter((entry) => entry.generatorInput)) {
    const supporting = new Set(strictCase.generatorInput.sourceOwnership.supportingSourceRefs);
    const eligibleRows = strictCase.generatorInput.sourceRows.filter(
      (row) => !supporting.has(row.sourceRef) && row.rowType !== "reference",
    );
    eligibleRowCount += eligibleRows.length;
    const proposal = inputBySampleRef.get(strictCase.sampleRef)?.proposal;
    const kept = keptItemRefsBySample.get(strictCase.sampleRef) ?? new Set();
    for (const row of eligibleRows) {
      const mappedKept = (proposal?.items ?? []).some(
        (item) => kept.has(item.itemRef) && item.sourceRowRefs.includes(row.sourceRowRef),
      );
      if (mappedKept) eligibleRowsConnectedToKeptItems += 1;
    }
  }
  const keptItems = allItemVerdicts.filter((entry) => entry.verdict === "keep").length;
  const rawItemKeepRate = allItemVerdicts.length === 0 ? 0 : keptItems / allItemVerdicts.length;
  const eligibleRowKeepCoverage = eligibleRowCount === 0 ? 0 : eligibleRowsConnectedToKeptItems / eligibleRowCount;
  const gateItemKeepRate = Math.min(rawItemKeepRate, eligibleRowKeepCoverage);
  const unsupportedTotals = { action: 0, date: 0, repeat: 0, fact: 0 };
  for (const review of allReviews) {
    for (const signal of review.unsupportedSignals) {
      if (Object.hasOwn(unsupportedTotals, signal?.class)) unsupportedTotals[signal.class] += 1;
    }
  }
  const scoreKeys = [
    "userNeedFit",
    "executionClarity",
    "contentFidelityCoverage",
    "portability",
    "cognitiveLoad",
    "copySpecificity",
    "sourceSafetySeparation",
  ];
  const axisAverages = Object.fromEntries(
    scoreKeys.map((key) => [key, average(allReviews.map((review) => review.scores[key]))]),
  );
  const sevenAxisAverage = average(Object.values(axisAverages));
  const gateConfig = protocol.completionGates;
  const unsupportedTotal = Object.values(unsupportedTotals).reduce((sum, value) => sum + value, 0);
  const gates = {
    automatedValidation: automated.passed,
    reviewEvidenceIntegrityRecomputed: true,
    exactReviewBatches:
      reviewDirectory.passed &&
      documents.length === 3 &&
      documents.every((entry, index) => entry.batchRef === reviewBatchRefs[index]),
    reviewerEnvelopeIntegrity: documents.length === 3 && documents.every((entry) => entry.passed),
    reviewerIsolation: reviewerIsolationPassed,
    globalExecutorEvidence: executorEvidence.passed,
    globalExecutorIdsUnique: allExecutorIdsUnique,
    globalExecutorRolesDisjoint: allExecutorRolesDisjoint,
    positiveReviewCoverage: allReviews.length === 10,
    strictEligibleRowProfile:
      eligibleRowCount === protocol.strictPositiveProfile.itemEligiblePrimarySourceRows,
    negativeExact: automated.summary.deterministicNegativeCount === gateConfig.negativeExact,
    sourceRowAccounting: automated.summary.sourceRowAccountingRate === gateConfig.sourceRowAccountingRate,
    unsupportedZero: unsupportedTotal === gateConfig.unsupportedTotal,
    itemKeep: gateItemKeepRate >= gateConfig.itemKeepRateMinimum,
    sevenAxisAverage: sevenAxisAverage >= gateConfig.sevenAxisAverageMinimum,
    executionClarity: axisAverages.executionClarity >= gateConfig.executionClarityMinimum,
    contentFidelityCoverage: axisAverages.contentFidelityCoverage >= gateConfig.contentFidelityCoverageMinimum,
    sourceSafetySeparation: axisAverages.sourceSafetySeparation >= gateConfig.sourceSafetySeparationMinimum,
  };
  const report = {
    reviewValidationVersion: "flowme-url-to-flow-strict-review-validation-v2",
    laneId,
    round: args.round,
    passed: Object.values(gates).every(Boolean),
    gates,
    evidenceBindings: {
      automatedValidationFile: manifest.automatedValidationFile,
      automatedValidationSha256: verified.automatedValidationSha256,
    },
    metrics: {
      positiveReviewCount: allReviews.length,
      proposedItemCount: allItemVerdicts.length,
      keptItemCount: keptItems,
      rawItemKeepRate,
      eligibleRowCount,
      eligibleRowsConnectedToKeptItems,
      eligibleRowKeepCoverage,
      gateItemKeepRate,
      unsupportedTotals,
      unsupportedTotal,
      axisAverages,
      sevenAxisAverage,
      reviewerAgentTaskIds: reviewerIds,
      generatorAgentTaskIds: [...generatorIds],
      reviewerGlobalUnique,
      reviewerGeneratorDisjoint,
      allExecutorIdsUnique,
      allExecutorRolesDisjoint,
      globalExecutorEvidencePassed: executorEvidence.passed,
      executorEvidenceEntries: executorEvidence.entries,
      executorEvidenceMissingIds: executorEvidence.missingIds,
      executorEvidenceDuplicates: executorEvidence.duplicates,
      reviewDirectory,
      caseVerdicts: {
        pass: allReviews.filter((entry) => entry.caseVerdict === "pass").length,
        revise: allReviews.filter((entry) => entry.caseVerdict === "revise").length,
        fail: allReviews.filter((entry) => entry.caseVerdict === "fail").length,
      },
    },
    automatedValidationSummary: automated.summary,
    documents,
  };
  const outputPath = args.out
    ? path.resolve(repoRoot, args.out)
    : path.join(auditDir, "reviews", args.round, "validation.json");
  await writeJson(outputPath, report);
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  validateStrictReviews(process.argv.slice(2))
    .then((report) => {
      process.stdout.write(
        process.argv.includes("--json")
          ? `${JSON.stringify(report, null, 2)}\n`
          : `${report.passed ? "PASS" : "FAIL"}: item keep ${(report.metrics.gateItemKeepRate * 100).toFixed(1)}%, unsupported ${report.metrics.unsupportedTotal}\n`,
      );
      if (!report.passed) process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
