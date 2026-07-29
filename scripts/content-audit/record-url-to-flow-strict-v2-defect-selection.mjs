import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertBaseFreezeIntegrity,
  auditDir,
  exists,
  readJson,
  readText,
  relativePath,
  sha256,
  specDir,
  writeText,
} from "./url-to-flow-strict-v2-core.mjs";

function parseArgs(argv) {
  if (argv.length !== 0) {
    throw new Error("Defect selection is automatic; CLI revision-class input is forbidden");
  }
}

function collectAutomatedErrorCodes(validation) {
  const codes = [];
  for (const document of validation.documents ?? []) {
    for (const error of document.envelopeErrors ?? []) codes.push(error.code);
    for (const result of document.results ?? []) {
      for (const error of result.errors ?? []) codes.push(error.code);
    }
  }
  return [...new Set(codes.filter(Boolean))].sort();
}

function collectReviewTopIssueCodes(validation) {
  const codes = [];
  for (const document of validation.documents ?? []) {
    for (const result of document.reviewResults ?? []) {
      if (result.review?.topIssueCode) codes.push(result.review.topIssueCode);
    }
  }
  return [...new Set(codes)].sort();
}

function classifyPromptDefects({ failedGates, automatedErrorCodes, reviewTopIssueCodes, revisionPolicy }) {
  const classes = new Set();
  for (const [revisionClass, patternSources] of Object.entries(
    revisionPolicy.classErrorPatterns ?? {},
  )) {
    const patterns = patternSources.map((source) => new RegExp(source, "u"));
    if (automatedErrorCodes.some((code) => patterns.some((pattern) => pattern.test(code)))) {
      classes.add(revisionClass);
    }
  }
  for (const gate of failedGates) {
    const revisionClass = revisionPolicy.gateClassMap?.[gate];
    if (revisionClass) classes.add(revisionClass);
  }
  for (const issueCode of reviewTopIssueCodes) {
    const revisionClass = revisionPolicy.reviewTopIssueClassMap?.[issueCode];
    if (revisionClass) classes.add(revisionClass);
  }
  return classes;
}

function protocolIntegrityFailures({ reviewValidation, automatedValidation, automatedErrorCodes }) {
  const failures = [];
  const hardGateNames = new Set([
    "reviewerEnvelopeIntegrity",
    "reviewerIsolation",
    "reviewEvidenceIntegrityRecomputed",
    "exactReviewBatches",
    "globalExecutorEvidence",
    "globalExecutorIdsUnique",
    "globalExecutorRolesDisjoint",
    "positiveReviewCoverage",
    "strictEligibleRowProfile",
    "negativeExact",
    "protocolConformance",
    "freezeIntegrity",
    "executorIntegrity",
  ]);
  for (const [name, passed] of Object.entries(reviewValidation?.gates ?? {})) {
    if (!passed && hardGateNames.has(name)) failures.push(`gate:${name}`);
  }
  if ((automatedValidation.summary?.documentCount ?? 0) !== 3) {
    failures.push("automated_document_count");
  }
  if (
    reviewValidation &&
    reviewValidation.gates?.automatedValidation !== automatedValidation.passed
  ) {
    failures.push("automated_gate_binding");
  }
  if (!reviewValidation && automatedValidation.passed) {
    failures.push("passing_run_missing_blind_review");
  }
  const modelOutputEnvelopeCodes = new Set([
    "raw_response_not_bare_json_array",
    "model_result_count_mismatch",
    "raw_results_do_not_match_positive_outputs",
    "assembly_issues_present",
    "assembly_pass_required",
  ]);
  for (const issue of automatedValidation.assemblyIssues ?? []) {
    failures.push(`validation:${issue.code ?? "unknown_assembly_issue"}`);
  }
  for (const document of automatedValidation.documents ?? []) {
    for (const error of document.envelopeErrors ?? []) {
      if (!modelOutputEnvelopeCodes.has(error.code)) failures.push(`envelope:${error.code}`);
    }
  }
  if (automatedErrorCodes.includes("binding_mismatch")) failures.push("binding_mismatch");
  return [...new Set(failures)].sort();
}

export function deriveDefectSelection({
  protocol,
  automatedValidation,
  automatedRaw,
  automatedValidationPath,
  reviewValidation = null,
  reviewRaw = null,
}) {
  const priority = protocol.promptRevision?.classPriority ?? [];
  const templates = protocol.promptRevision?.classTemplates ?? {};
  const revisionPolicy = protocol.promptRevision ?? {};
  if (
    priority.length === 0 ||
    priority.some(
      (name) =>
        typeof templates[name] !== "string" ||
        !Array.isArray(revisionPolicy.classErrorPatterns?.[name]),
    )
  ) {
    throw new Error("Protocol prompt-revision taxonomy is incomplete");
  }
  const reviewNotRunReason = reviewValidation
    ? null
    : automatedValidation.passed
      ? null
      : "run_validation_failed";
  const failedGateNames = Object.entries(reviewValidation?.gates ?? { automatedValidation: false })
    .filter(([, passed]) => !passed)
    .map(([name]) => name)
    .sort();
  const automatedErrorCodes = collectAutomatedErrorCodes(automatedValidation);
  const reviewTopIssueCodes = reviewValidation
    ? collectReviewTopIssueCodes(reviewValidation)
    : [];
  const integrityFailures = protocolIntegrityFailures({
    reviewValidation,
    automatedValidation,
    automatedErrorCodes,
  });
  if (
    reviewValidation &&
    (reviewValidation.evidenceBindings?.automatedValidationSha256 !== sha256(automatedRaw) ||
      reviewValidation.evidenceBindings?.automatedValidationFile !==
        relativePath(automatedValidationPath))
  ) {
    integrityFailures.push("review_automated_evidence_binding");
  }
  if (integrityFailures.length > 0) {
    throw new Error(
      `Round 1 protocol/integrity failure stops the lane: ${[...new Set(integrityFailures)].sort().join(", ")}`,
    );
  }

  const triggered = classifyPromptDefects({
    failedGates: failedGateNames,
    automatedErrorCodes,
    reviewTopIssueCodes,
    revisionPolicy,
  });
  const round1PassedAllGates = reviewValidation?.passed === true;
  const revisionClass = round1PassedAllGates
    ? null
    : priority.find((name) => triggered.has(name)) ?? null;
  if (!round1PassedAllGates && !revisionClass) {
    throw new Error("Round 1 failed without a taxonomy-mapped prompt defect; lane must stop");
  }
  const revisionInstruction = revisionClass === null ? null : templates[revisionClass];
  return {
    selectionVersion: "flowme-url-to-flow-strict-defect-selection-v2",
    selectionMethod: "protocol_fixed_taxonomy_and_priority",
    round1ReviewValidationSha256: reviewRaw === null ? null : sha256(reviewRaw),
    round1AutomatedValidationSha256: sha256(automatedRaw),
    reviewNotRunReason,
    round1PassedAllGates,
    action: round1PassedAllGates
      ? "unchanged_confirmation"
      : "prompt_one_defect_revision",
    revisionClass,
    revisionInstructionSha256:
      revisionInstruction === null ? null : sha256(revisionInstruction),
    promptVersionRound2: round1PassedAllGates
      ? "url-to-flow-prompt-v2.0"
      : "url-to-flow-prompt-v2.1",
    classPriority: priority,
    triggeredRevisionClasses: priority.filter((name) => triggered.has(name)),
    failedGateNames,
    automatedErrorCodes,
    reviewTopIssueCodes,
    protocolIntegrityFailures: [],
  };
}

export async function recordDefectSelection(argv) {
  parseArgs(argv);
  await assertBaseFreezeIntegrity();
  const { value: protocol } = await readJson(path.join(specDir, "protocol-v2.json"));

  const automatedValidationPath = path.join(auditDir, "runs", "round-1", "validation.json");
  const { raw: automatedRaw, value: automatedValidation } = await readJson(
    automatedValidationPath,
  );
  const reviewValidationPath = path.join(auditDir, "reviews", "round-1", "validation.json");
  const reviewDocument = (await exists(reviewValidationPath))
    ? await readJson(reviewValidationPath)
    : null;
  const reviewRaw = reviewDocument?.raw ?? null;
  const reviewValidation = reviewDocument?.value ?? null;
  const selection = deriveDefectSelection({
    protocol,
    automatedValidation,
    automatedRaw,
    automatedValidationPath,
    reviewValidation,
    reviewRaw,
  });
  const outputPath = path.join(auditDir, "runs", "round-1", "defect-selection.json");
  const serialized = `${JSON.stringify(selection, null, 2)}\n`;
  if (await exists(outputPath)) {
    if ((await readText(outputPath)) !== serialized) {
      throw new Error(`Defect selection already differs: ${relativePath(outputPath)}`);
    }
  } else {
    await writeText(outputPath, serialized);
  }
  return { outputPath: relativePath(outputPath), ...selection };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  recordDefectSelection(process.argv.slice(2))
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
