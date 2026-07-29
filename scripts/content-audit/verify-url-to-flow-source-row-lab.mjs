import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot =
  globalThis.__FLOWME_REPO_ROOT__ ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const specDir = path.join(
  repoRoot,
  "docs/specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
);
const auditDir = path.join(
  repoRoot,
  "docs/content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
);
const outputPath = path.join(auditDir, "completion-verification.json");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function listJsonFiles(directory, prefix) {
  return (await readdir(directory))
    .filter((name) => name.endsWith(".json") && (!prefix || name.startsWith(prefix)))
    .sort()
    .map((name) => path.join(directory, name));
}

export async function verifySourceRowLab() {
  const checks = [];
  const add = (id, category, passed, observed, expected) => {
    checks.push({ id, category, passed: Boolean(passed), observed, expected });
  };

  const cases = await readJson(path.join(specDir, "cases-v1.json"));
  const leakage = await readJson(path.join(auditDir, "leakage-report.json"));
  const schemaProfile = await readJson(path.join(specDir, "schema-profile-v1.json"));
  const legacyManifest = await readJson(path.join(auditDir, "legacy-evidence-manifest.json"));
  const manifest10 = await readJson(path.join(auditDir, "packets/v1.0/manifest.json"));
  const manifest11 = await readJson(path.join(auditDir, "packets/v1.1/manifest.json"));
  const bare = await readJson(path.join(auditDir, "bare/equivalence.json"));
  const round1 = await readJson(path.join(auditDir, "runs/round-1/validation.json"));
  const defect = await readJson(path.join(auditDir, "runs/round-1/defect-selection.json"));
  const round2 = await readJson(path.join(auditDir, "runs/round-2/validation.json"));
  const review2 = await readJson(path.join(auditDir, "reviews/round-2/validation.json"));
  const round3 = await readJson(path.join(auditDir, "runs/round-3/validation.json"));
  const review3 = await readJson(path.join(auditDir, "reviews/round-3/validation.json"));
  const stability = await readJson(path.join(auditDir, "runs/round-3/stability.json"));
  const reportData = await readJson(path.join(auditDir, "report-data.json"));
  const lane = await readJson(path.join(specDir, "lane.json"));
  const protocolNote = await readJson(path.join(auditDir, "runs/round-3/protocol-note.json"));
  const prompt10Text = await readFile(path.join(specDir, "prompt-v1.0.md"), "utf8");
  const prompt11Text = await readFile(path.join(specDir, "prompt-v1.1.md"), "utf8");

  const positiveCases = cases.cases.filter((entry) => entry.generatorInput !== null);
  const negativeCases = cases.cases.filter((entry) => entry.generatorInput === null);
  add("canonical_case_count", "integrity", cases.cases.length === 12, cases.cases.length, 12);
  add("positive_case_count", "integrity", positiveCases.length === 10, positiveCases.length, 10);
  add("negative_case_count", "integrity", negativeCases.length === 2, negativeCases.length, 2);
  add(
    "canonical_case_ids",
    "integrity",
    sameJson(
      cases.cases.map((entry) => entry.caseId),
      Array.from({ length: 12 }, (_, index) => "case-" + String(index + 1).padStart(2, "0")),
    ),
    cases.cases.map((entry) => entry.caseId),
    "case-01 through case-12",
  );
  const canonicalGeneratorCaseIds = positiveCases
    .filter((entry) => /^case-\d{2}$/.test(entry.generatorInput.caseId))
    .map((entry) => entry.generatorInput.caseId);
  add(
    "generator_case_ids_are_opaque",
    "protocol",
    canonicalGeneratorCaseIds.length === 0,
    canonicalGeneratorCaseIds,
    "no canonical case lineage IDs in generator input",
  );

  add("leakage_report_passed", "integrity", leakage.passed, leakage.forbiddenHitCount, 0);
  add(
    "generator_semantic_boundary",
    "integrity",
    leakage.positiveGeneratorPromptCount === 10 &&
      leakage.deterministicNegativeCount === 2 &&
      leakage.forbiddenHitCount === 0,
    {
      positive: leakage.positiveGeneratorPromptCount,
      negative: leakage.deterministicNegativeCount,
      forbiddenHits: leakage.forbiddenHitCount,
    },
    { positive: 10, negative: 2, forbiddenHits: 0 },
  );
  add("compact_schema_budget", "integrity", schemaProfile.passed, schemaProfile.limits, "all limits pass");
  add(
    "lane_metadata_lists_both_prompts",
    "integrity",
    lane.authority === "corrected_experimental_evidence" &&
      sameJson(lane.correctedLane.promptVersions, [
        "url-to-flow-prompt-v1.0",
        "url-to-flow-prompt-v1.1",
      ]),
    { authority: lane.authority, promptVersions: lane.correctedLane.promptVersions },
    {
      authority: "corrected_experimental_evidence",
      promptVersions: ["url-to-flow-prompt-v1.0", "url-to-flow-prompt-v1.1"],
    },
  );

  const legacyMismatches = [];
  for (const entry of legacyManifest.files) {
    const absolute = path.join(repoRoot, entry.path);
    if (!(await exists(absolute))) {
      legacyMismatches.push({ path: entry.path, reason: "missing" });
      continue;
    }
    const fileStat = await stat(absolute);
    const actualSha256 = await sha256File(absolute);
    if (fileStat.size !== entry.bytes || actualSha256 !== entry.sha256) {
      legacyMismatches.push({
        path: entry.path,
        reason: "hash_or_size_changed",
        expectedBytes: entry.bytes,
        actualBytes: fileStat.size,
        expectedSha256: entry.sha256,
        actualSha256,
      });
    }
  }
  add(
    "legacy_preflight_frozen",
    "integrity",
    legacyManifest.acceptedForCorrectedCompletion === false &&
      legacyManifest.fileCount === legacyManifest.files.length &&
      legacyMismatches.length === 0,
    {
      acceptedForCorrectedCompletion: legacyManifest.acceptedForCorrectedCompletion,
      fileCount: legacyManifest.fileCount,
      mismatchCount: legacyMismatches.length,
      mismatches: legacyMismatches,
    },
    { acceptedForCorrectedCompletion: false, mismatchCount: 0 },
  );

  for (const [version, manifest] of [
    ["v1.0", manifest10],
    ["v1.1", manifest11],
  ]) {
    add(
      "packet_counts_" + version,
      "integrity",
      manifest.pipelinePacketCount === 12 &&
        manifest.generatorPromptCount === 10 &&
        manifest.deterministicNegativeCount === 2,
      {
        pipeline: manifest.pipelinePacketCount,
        generator: manifest.generatorPromptCount,
        negative: manifest.deterministicNegativeCount,
      },
      { pipeline: 12, generator: 10, negative: 2 },
    );
    add(
      "negative_preflight_" + version,
      "integrity",
      manifest.pipelinePackets.filter((entry) => entry.modelInvoked === false).length === 2 &&
        manifest.pipelinePackets.filter((entry) => entry.modelInvoked === true).length === 10,
      manifest.pipelinePackets.map((entry) => ({
        caseId: entry.caseId,
        modelInvoked: entry.modelInvoked,
      })),
      "10 true and 2 false",
    );
    const fileEntries = [
      manifest.promptTemplate,
      manifest.schema,
      manifest.cases,
      ...manifest.pipelinePackets,
      ...manifest.generatorPrompts,
    ];
    const mismatches = [];
    for (const entry of fileEntries) {
      const absolute = path.join(repoRoot, entry.path);
      if (!(await exists(absolute))) {
        mismatches.push({ path: entry.path, reason: "missing" });
      } else {
        const actualSha256 = await sha256File(absolute);
        if (actualSha256 !== entry.sha256) {
          mismatches.push({
            path: entry.path,
            reason: "sha256_changed",
            expectedSha256: entry.sha256,
            actualSha256,
          });
        }
      }
    }
    add(
      "packet_manifest_hashes_" + version,
      "integrity",
      mismatches.length === 0,
      mismatches,
      "no missing or changed files",
    );
  }

  const semantic10 = new Map(
    manifest10.generatorPrompts.map((entry) => [entry.caseId, entry.semanticPayloadSha256]),
  );
  const inputMismatches = manifest11.generatorPrompts
    .filter(
      (entry) =>
        entry.byteIdenticalInputToV1_0 !== true ||
        semantic10.get(entry.caseId) !== entry.semanticPayloadSha256,
    )
    .map((entry) => entry.caseId);
  add(
    "v1_0_v1_1_input_frozen",
    "integrity",
    inputMismatches.length === 0,
    inputMismatches,
    "all 10 semantic payload hashes identical",
  );
  add(
    "schema_and_cases_frozen",
    "integrity",
    manifest11.schema.unchangedFromV1_0 === true &&
      manifest11.cases.unchangedFromV1_0 === true &&
      manifest10.schema.sha256 === manifest11.schema.sha256 &&
      manifest10.cases.sha256 === manifest11.cases.sha256,
    {
      schema10: manifest10.schema.sha256,
      schema11: manifest11.schema.sha256,
      cases10: manifest10.cases.sha256,
      cases11: manifest11.cases.sha256,
    },
    "same schema and case hashes",
  );
  const normalizedPrompt11 = prompt11Text
    .replace(
      /## Round 1 결함 교정: required output contract lock[\s\S]*?\n## 정확한 JSON shape/,
      "## 정확한 JSON shape",
    )
    .replaceAll("v1.1", "v1.0")
    .trimEnd();
  const promptDiffConfined = normalizedPrompt11 === prompt10Text.trimEnd();
  add(
    "one_defect_revision_only",
    "integrity",
    defect.selectedDefectClass === "required_output_contract_compliance" &&
      manifest11.oneDefectRevision.selectedClass === defect.selectedDefectClass &&
      promptDiffConfined,
    {
      selected: defect.selectedDefectClass,
      manifest: manifest11.oneDefectRevision.selectedClass,
      normalizedPromptEqualsV1_0: promptDiffConfined,
    },
    "only the version labels and required_output_contract_compliance lock differ",
  );

  const runDirectories = (await readdir(path.join(auditDir, "runs"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("round-"))
    .map((entry) => entry.name)
    .sort();
  const prohibitedExists =
    (await exists(path.join(specDir, "prompt-v1.2.md"))) ||
    (await exists(path.join(auditDir, "packets/v1.2"))) ||
    (await exists(path.join(auditDir, "runs/round-4")));
  add(
    "three_round_limit",
    "integrity",
    sameJson(runDirectories, ["round-1", "round-2", "round-3"]) && !prohibitedExists,
    { runDirectories, promptV1_2OrRound4Exists: prohibitedExists },
    { runDirectories: ["round-1", "round-2", "round-3"], promptV1_2OrRound4Exists: false },
  );
  const round1BatchFiles = await listJsonFiles(path.join(auditDir, "runs/round-1"), "batch-");
  const round1BatchSizes = [];
  for (const filePath of round1BatchFiles) {
    const document = await readJson(filePath);
    round1BatchSizes.push({ file: path.basename(filePath), outputs: document.outputs?.length ?? 0 });
  }
  add(
    "round1_three_isolated_four_case_batches",
    "protocol",
    sameJson(
      round1BatchSizes.map((entry) => entry.outputs),
      [4, 4, 4],
    ),
    round1BatchSizes,
    [
      { file: "batch-a.json", outputs: 4 },
      { file: "batch-b.json", outputs: 4 },
      { file: "batch-c.json", outputs: 4 },
    ],
  );
  add(
    "round3_prerequisite_satisfied",
    "protocol",
    review2.passed === true,
    {
      round2Passed: review2.passed,
      round3ProtocolNote: protocolNote,
    },
    "Round 2 passes every completion gate before Round 3",
  );
  add(
    "round3_input_binding_proven",
    "protocol",
    stability.runInputBindingProven === true && stability.freshContextProven === true,
    {
      comparisonScope: stability.comparisonScope,
      runInputBindingProven: stability.runInputBindingProven,
      freshContextProven: stability.freshContextProven,
    },
    { runInputBindingProven: true, freshContextProven: true },
  );
  add(
    "bare_run_equivalence",
    "integrity",
    bare.barePassed &&
      bare.runPassed &&
      bare.equivalent &&
      bare.bareProposalDiagnosticsSha256 === bare.runProposalDiagnosticsSha256,
    bare,
    "both pass with identical diagnostic hashes",
  );
  add(
    "round1_baseline_preserved",
    "integrity",
    round1.summary.outputCount === 12 &&
      round1.summary.passedOutputCount === 2 &&
      round1.summary.errorCount === 112 &&
      round1.summary.receivedSourceRows === 16 &&
      round1.summary.exactlyOnceSourceRows === 16 &&
      defect.schemaValidCount === 2,
    {
      outputCount: round1.summary.outputCount,
      passed: round1.summary.passedOutputCount,
      errors: round1.summary.errorCount,
      rows: round1.summary.exactlyOnceSourceRows + "/" + round1.summary.receivedSourceRows,
      defectSchemaValid: defect.schemaValidCount,
    },
    { outputCount: 12, passed: 2, errors: 112, rows: "16/16", defectSchemaValid: 2 },
  );

  const evidenceFiles = [];
  for (const round of ["round-1", "round-2", "round-3"]) {
    evidenceFiles.push(...(await listJsonFiles(path.join(auditDir, "runs", round), "batch-")));
  }
  for (const round of ["round-2", "round-3"]) {
    evidenceFiles.push(...(await listJsonFiles(path.join(auditDir, "reviews", round), "reviewer-")));
  }
  const evidenceViolations = [];
  for (const filePath of evidenceFiles) {
    const document = await readJson(filePath);
    const evidenceClass = document.evidenceClass ?? document.reviewerEvidenceClass;
    const validEvidenceClass =
      evidenceClass === "in_session_unselected_model_proxy" ||
      (evidenceClass === "deterministic_preflight" &&
        Array.isArray(document.outputs) &&
        document.outputs.every((entry) => entry.modelInvoked === false));
    const valid =
      validEvidenceClass &&
      document.provider === null &&
      document.model === null &&
      (document.tier === undefined || document.tier === null) &&
      (document.timing === undefined || document.timing === null) &&
      (document.usage === undefined || document.usage === null) &&
      (document.cost === undefined || document.cost === null) &&
      (document.humanReview === false || document.humanReviewer === false);
    if (!valid) {
      evidenceViolations.push({
        path: path.relative(repoRoot, filePath).replaceAll("\\", "/"),
        evidenceClass,
        provider: document.provider,
        model: document.model,
        tier: document.tier,
        timing: document.timing,
        usage: document.usage,
        cost: document.cost,
        humanReview: document.humanReview,
        humanReviewer: document.humanReviewer,
      });
    }
  }
  const boundary = reportData.evidenceBoundary;
  const reportBoundaryValid =
    boundary.currentSession === "in_session_unselected_model_proxy" &&
    boundary.provider === null &&
    boundary.model === null &&
    boundary.lowCostModelComparison === null &&
    boundary.premiumModelComparison === null &&
    boundary.tokens === null &&
    boundary.cost === null &&
    boundary.latency === null &&
    boundary.humanReview === false;
  add(
    "model_cost_evidence_boundary",
    "integrity",
    evidenceViolations.length === 0 && reportBoundaryValid,
    { rawEvidenceViolations: evidenceViolations, reportBoundary: boundary },
    "unselected model proxy; provider/model/tier/timing/usage/cost null; human false",
  );

  add(
    "round2_review_integrity",
    "integrity",
    review2.integrityPassed && review2.errors.length === 0,
    { integrityPassed: review2.integrityPassed, errors: review2.errors },
    { integrityPassed: true, errors: [] },
  );
  const resourceReviewCases = ["case-06", "case-09"].map((caseId) => {
    const review = review2.cases.find((entry) => entry.caseId === caseId);
    return {
      caseId,
      decisions: review?.itemReviews.map((entry) => entry.decision) ?? [],
      verdict: review?.verdict ?? null,
      topFix: review?.topFix ?? null,
    };
  });
  add(
    "resource_review_policy_consistency",
    "evidence_limit",
    new Set(resourceReviewCases.flatMap((entry) => entry.decisions)).size <= 1,
    {
      promptAllowsResourceIntent: prompt11Text.includes("resource -> use_resource"),
      reviews: resourceReviewCases,
    },
    "adjudicate generic resource rows under one explicit policy before treating keep-rate as robust",
  );
  add(
    "round3_review_integrity",
    "integrity",
    review3.integrityPassed && review3.errors.length === 0,
    { integrityPassed: review3.integrityPassed, errors: review3.errors },
    { integrityPassed: true, errors: [] },
  );
  add(
    "stability_is_diagnostic",
    "integrity",
    stability.diagnosticOnly === true &&
      stability.completionGate === false &&
      stability.comparisonScope === "recorded_output_signature_only" &&
      stability.runInputBindingProven === false &&
      stability.freshContextProven === false &&
      stability.metrics.comparedCases === 12 &&
      stability.metrics.positiveComparedCases === 10 &&
      stability.metrics.positiveExactMatches === 3 &&
      stability.metrics.negativesExact === 2,
    {
      diagnosticOnly: stability.diagnosticOnly,
      completionGate: stability.completionGate,
      comparisonScope: stability.comparisonScope,
      runInputBindingProven: stability.runInputBindingProven,
      freshContextProven: stability.freshContextProven,
      metrics: stability.metrics,
    },
    "recorded-output diagnostic only; 10 positives with 3 exact and 2 deterministic negatives exact",
  );

  add(
    "report_metrics_match_raw",
    "integrity",
    sameJson(reportData.rounds.round1, round1.summary) &&
      sameJson(reportData.rounds.round2.deterministic, round2.summary) &&
      sameJson(reportData.rounds.round2.blindReview, review2.metrics) &&
      sameJson(reportData.rounds.round3.deterministic, round3.summary) &&
      sameJson(reportData.rounds.round3.blindReview, review3.metrics) &&
      sameJson(reportData.rounds.round3.stability, stability.metrics),
    {
      round1: reportData.rounds.round1,
      round2: reportData.rounds.round2,
      round3: reportData.rounds.round3,
    },
    "report summaries equal raw validation, review, and stability metrics",
  );

  const previewFiles = (await readdir(path.join(auditDir, "previews")))
    .filter((name) => /^case-\d\d\.html$/.test(name))
    .sort();
  const deliverablePresence = {
    comparison: await exists(path.join(auditDir, "comparison.md")),
    report: await exists(path.join(auditDir, "report.html")),
    reportData: await exists(path.join(auditDir, "report-data.json")),
    previewIndex: await exists(path.join(auditDir, "previews/index.html")),
    browserQa: await exists(path.join(auditDir, "qa/browser-qa.json")),
    previews: previewFiles.length,
  };
  add(
    "deliverables_present",
    "integrity",
    deliverablePresence.comparison &&
      deliverablePresence.report &&
      deliverablePresence.reportData &&
      deliverablePresence.previewIndex &&
      deliverablePresence.browserQa &&
      deliverablePresence.previews === 10,
    deliverablePresence,
    {
      comparison: true,
      report: true,
      reportData: true,
      previewIndex: true,
      browserQa: true,
      previews: 10,
    },
  );

  add(
    "source_row_only_input_contract",
    "completion_gate",
    leakage.passed && canonicalGeneratorCaseIds.length === 0,
    {
      semanticLeakageReportPassed: leakage.passed,
      canonicalGeneratorCaseIds,
    },
    { semanticLeakageReportPassed: true, canonicalGeneratorCaseIds: [] },
  );
  add(
    "compact_schema_completion_gate",
    "completion_gate",
    schemaProfile.passed,
    schemaProfile.passed,
    true,
  );
  add(
    "bare_validator_completion_gate",
    "completion_gate",
    bare.barePassed && bare.runPassed && bare.equivalent,
    { barePassed: bare.barePassed, runPassed: bare.runPassed, equivalent: bare.equivalent },
    { barePassed: true, runPassed: true, equivalent: true },
  );

  add(
    "round2_schema_valid",
    "completion_gate",
    round2.summary.outputCount === 12 && round2.summary.passedOutputCount === 12,
    round2.summary.passedOutputCount + "/" + round2.summary.outputCount,
    "12/12",
  );
  add(
    "round2_source_row_accounting",
    "completion_gate",
    round2.summary.receivedSourceRows === 16 && round2.summary.exactlyOnceSourceRows === 16,
    round2.summary.exactlyOnceSourceRows + "/" + round2.summary.receivedSourceRows,
    "16/16",
  );
  add(
    "round2_negative_exact",
    "completion_gate",
    review2.metrics.negativeExact === 2,
    review2.metrics.negativeExact,
    2,
  );
  add(
    "round2_item_keep_rate",
    "completion_gate",
    review2.metrics.itemKeepRate >= 0.8,
    review2.metrics.itemKeepRate,
    ">= 0.8",
  );
  add(
    "round2_unsupported_zero",
    "completion_gate",
    review2.metrics.unsupportedSignalCount === 0,
    {
      total: review2.metrics.unsupportedSignalCount,
      byClass: review2.metrics.unsupportedCounts,
    },
    { total: 0 },
  );
  add(
    "round2_seven_axis_average",
    "completion_gate",
    review2.metrics.sevenAxisAverage >= 3.5,
    review2.metrics.sevenAxisAverage,
    ">= 3.5",
  );
  add(
    "round2_execution_clarity",
    "completion_gate",
    review2.metrics.axisAverages.executionClarity >= 4,
    review2.metrics.axisAverages.executionClarity,
    ">= 4",
  );
  add(
    "round2_content_fidelity",
    "completion_gate",
    review2.metrics.axisAverages.contentFidelityCoverage >= 4,
    review2.metrics.axisAverages.contentFidelityCoverage,
    ">= 4",
  );
  add(
    "round2_source_safety",
    "completion_gate",
    review2.metrics.axisAverages.sourceSafetySeparation >= 4,
    review2.metrics.axisAverages.sourceSafetySeparation,
    ">= 4",
  );

  add(
    "round3_schema_valid",
    "completion_gate",
    round3.summary.outputCount === 12 && round3.summary.passedOutputCount === 12,
    round3.summary.passedOutputCount + "/" + round3.summary.outputCount,
    "12/12",
  );
  add(
    "round3_source_row_accounting",
    "completion_gate",
    round3.summary.receivedSourceRows === 16 && round3.summary.exactlyOnceSourceRows === 16,
    round3.summary.exactlyOnceSourceRows + "/" + round3.summary.receivedSourceRows,
    "16/16",
  );
  add(
    "round3_negative_exact",
    "completion_gate",
    review3.metrics.negativeExact === 2,
    review3.metrics.negativeExact,
    2,
  );
  add(
    "round3_item_keep_rate",
    "completion_gate",
    review3.metrics.itemKeepRate >= 0.8,
    review3.metrics.itemKeepRate,
    ">= 0.8",
  );
  add(
    "round3_unsupported_zero",
    "completion_gate",
    review3.metrics.unsupportedSignalCount === 0,
    {
      total: review3.metrics.unsupportedSignalCount,
      byClass: review3.metrics.unsupportedCounts,
    },
    { total: 0 },
  );
  add(
    "round3_seven_axis_average",
    "completion_gate",
    review3.metrics.sevenAxisAverage >= 3.5,
    review3.metrics.sevenAxisAverage,
    ">= 3.5",
  );
  add(
    "round3_execution_clarity",
    "completion_gate",
    review3.metrics.axisAverages.executionClarity >= 4,
    review3.metrics.axisAverages.executionClarity,
    ">= 4",
  );
  add(
    "round3_content_fidelity",
    "completion_gate",
    review3.metrics.axisAverages.contentFidelityCoverage >= 4,
    review3.metrics.axisAverages.contentFidelityCoverage,
    ">= 4",
  );
  add(
    "round3_source_safety",
    "completion_gate",
    review3.metrics.axisAverages.sourceSafetySeparation >= 4,
    review3.metrics.axisAverages.sourceSafetySeparation,
    ">= 4",
  );

  const evidenceFileIntegrityChecks = checks.filter((entry) => entry.category === "integrity");
  const protocolChecks = checks.filter((entry) => entry.category === "protocol");
  const evidenceLimitChecks = checks.filter((entry) => entry.category === "evidence_limit");
  const completionGateChecks = checks.filter((entry) => entry.category === "completion_gate");
  const failedFileIntegrityChecks = evidenceFileIntegrityChecks
    .filter((entry) => !entry.passed)
    .map((entry) => entry.id);
  const failedProtocolChecks = protocolChecks
    .filter((entry) => !entry.passed)
    .map((entry) => entry.id);
  const evidenceLimitFlags = evidenceLimitChecks
    .filter((entry) => !entry.passed)
    .map((entry) => entry.id);
  const failedCompletionGates = completionGateChecks
    .filter((entry) => !entry.passed)
    .map((entry) => entry.id);
  const evidenceFileIntegrityPassed = failedFileIntegrityChecks.length === 0;
  const protocolConformancePassed = failedProtocolChecks.length === 0;
  const evidenceIntegrityPassed = evidenceFileIntegrityPassed && protocolConformancePassed;
  const failedIntegrityChecks = [...failedFileIntegrityChecks, ...failedProtocolChecks];
  const completionGatesPassed = failedCompletionGates.length === 0;
  const completionPassed = evidenceIntegrityPassed && completionGatesPassed;

  const result = {
    verificationVersion: "flowme-source-row-completion-verification-v2",
    laneId: "url-to-flow-source-row-v1",
    evidenceFileIntegrityPassed,
    protocolConformancePassed,
    evidenceIntegrityPassed,
    completionGatesPassed,
    completionPassed,
    promptLabDecision: completionPassed ? "v1_complete" : "v1_incomplete",
    productionBackendDecision: completionPassed ? "eligible_for_next_gate" : "no_go",
    failedFileIntegrityChecks,
    failedProtocolChecks,
    failedIntegrityChecks,
    evidenceLimitFlags,
    failedCompletionGates,
    evidenceBoundary: boundary,
    observed: {
      round1: round1.summary,
      round2: { deterministic: round2.summary, blindReview: review2.metrics },
      round3: {
        deterministic: round3.summary,
        blindReview: review3.metrics,
        stability: stability.metrics,
      },
      previewCount: previewFiles.length,
    },
    checks,
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  return result;
}

if (typeof process !== "undefined" && typeof process.stdout?.write === "function") {
  verifySourceRowLab()
    .then((result) => {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
      if (!result.completionPassed) process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(String(error.stack ?? error.message) + "\n");
      process.exitCode = 1;
    });
}
