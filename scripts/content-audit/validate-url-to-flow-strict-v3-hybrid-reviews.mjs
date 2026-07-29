import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCompiledRun } from "./build-url-to-flow-strict-v3-hybrid.mjs";
import {
  assertFreezeIntegrity,
  auditDir,
  buildBlindReviewTask,
  canonicalSha256,
  exists,
  laneId,
  loadCases,
  loadProtocol,
  loadRules,
  loadSchema,
  proposalFingerprint,
  readJson,
  readText,
  relativePath,
  sha256,
  specDir,
  v2SpecDir,
  writeOnceOrVerify,
} from "./url-to-flow-strict-v3-hybrid-core.mjs";

const batches = ["batch-a", "batch-b", "batch-c"];
const axes = [
  "userNeedFit",
  "executionClarity",
  "contentFidelityCoverage",
  "portability",
  "cognitiveLoad",
  "copySpecificity",
  "sourceSafetySeparation",
];
const allowedTopIssueCodes = new Set([
  null,
  "generic_copy",
  "classification_overreach",
  "projection_mismatch",
  "missing_uncertainty",
  "row_policy_mismatch",
  "unsupported_content",
  "accounting_problem",
  "wrong_insufficient_boundary",
]);
const allowedReasonCodes = new Set([
  "supported_as_written",
  "wording_only",
  "intent_mismatch",
  "completion_mismatch",
  "unsupported_action",
  "unsupported_schedule",
  "unsupported_fact",
  "resource_contents_invented",
  "should_be_omitted",
]);
const unsupportedReasonClasses = {
  unsupported_action: ["action"],
  unsupported_schedule: ["date", "repeat"],
  unsupported_fact: ["fact"],
  resource_contents_invented: ["fact"],
  should_be_omitted: ["action", "fact"],
};

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (command === "validate") {
    if (rest.length !== 0) throw new Error("validate takes no arguments");
    return { command };
  }
  if (command !== "assemble") {
    throw new Error(
      "Use assemble --batch batch-a|b|c --raw <path> --agent-id <id> --task-name <name> | validate",
    );
  }
  const args = { command, batch: null, raw: null, agentId: null, taskName: null };
  for (let index = 0; index < rest.length; index += 2) {
    const token = rest[index];
    const value = rest[index + 1];
    if (!value) throw new Error(`${token} requires a value`);
    const map = {
      "--batch": "batch",
      "--raw": "raw",
      "--agent-id": "agentId",
      "--task-name": "taskName",
    };
    if (!map[token]) throw new Error(`Unknown argument: ${token}`);
    args[map[token]] = value;
  }
  if (!batches.includes(args.batch)) throw new Error(`Invalid batch: ${args.batch}`);
  for (const key of ["raw", "agentId", "taskName"]) {
    if (!args[key]) throw new Error(`${key} is required`);
  }
  return args;
}

function sameSet(actual, expected) {
  return (
    Array.isArray(actual) &&
    Array.isArray(expected) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    new Set(expected).size === expected.length &&
    actual.every((value) => expected.includes(value))
  );
}

function sameOrder(actual, expected) {
  return (
    Array.isArray(actual) &&
    Array.isArray(expected) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function recursiveFileList(directory, prefix = "") {
  if (!(await exists(directory))) return [];
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isFile()) files.push(relative);
    if (entry.isDirectory()) {
      files.push(...(await recursiveFileList(path.join(directory, entry.name), relative)));
    }
  }
  return files.sort();
}

function resolveSimplePath(root, pathValue) {
  if (typeof pathValue !== "string" || !/^\$(?:\.[A-Za-z0-9_-]+|\[[0-9]+\])+$/.test(pathValue)) {
    return { found: false, value: undefined };
  }
  const tokens =
    pathValue
      .slice(1)
      .match(/\.[A-Za-z0-9_-]+|\[[0-9]+\]/g)
      ?.map((token) =>
        token.startsWith(".") ? token.slice(1) : Number(token.slice(1, -1)),
      ) ?? [];
  let current = root;
  for (const token of tokens) {
    if (current === null || current === undefined || !Object.hasOwn(current, token)) {
      return { found: false, value: undefined };
    }
    current = current[token];
  }
  return { found: true, value: current };
}

async function assembleReview(args) {
  const freeze = await assertFreezeIntegrity();
  const manifestPath = path.join(auditDir, "review-inputs", "manifest.json");
  const { raw: manifestRaw, value: manifest } = await readJson(manifestPath);
  const expectedTask = manifest.tasks[args.batch];
  const expectedRawPath = path.join(auditDir, "review-raw", `${args.batch}.txt`);
  const suppliedRawPath = path.resolve(args.raw);
  if (suppliedRawPath !== expectedRawPath) {
    throw new Error(`Raw review path must be ${relativePath(expectedRawPath)}`);
  }
  const rawResponse = await readText(suppliedRawPath);
  const assemblyIssues = [];
  let reviews = [];
  try {
    const parsed = JSON.parse(rawResponse);
    if (!Array.isArray(parsed)) throw new Error("review response must be an array");
    reviews = parsed;
  } catch (error) {
    assemblyIssues.push({ code: "review_raw_not_bare_json_array", detail: error.message });
  }
  if (reviews.length !== expectedTask.inputCount) {
    assemblyIssues.push({
      code: "review_count_mismatch",
      detail: { expected: expectedTask.inputCount, actual: reviews.length },
    });
  }
  for (let index = 0; index < expectedTask.sampleRefs.length; index += 1) {
    if (reviews[index]?.sampleRef !== expectedTask.sampleRefs[index]) {
      assemblyIssues.push({
        code: "review_sample_order_mismatch",
        detail: {
          index,
          expected: expectedTask.sampleRefs[index],
          actual: reviews[index]?.sampleRef,
        },
      });
    }
  }
  const envelope = {
    reviewEnvelopeVersion: "flowme-url-to-flow-v3-hybrid-review-envelope",
    laneId,
    batchRef: args.batch,
    evidenceClass: "current_session_model_proxy_blind_review",
    assemblyStatus: assemblyIssues.length === 0 ? "assembled" : "failure",
    assemblyIssues,
    executor: {
      agentTaskId: args.agentId,
      taskName: args.taskName,
      forkTurns: "none",
    },
    measurement: {
      provider: null,
      model: null,
      tier: null,
      inputTokens: null,
      outputTokens: null,
      latencyMs: null,
      cost: null,
      currency: null,
    },
    bindings: {
      freezeSha256: freeze.freezeSha256,
      reviewManifestSha256: sha256(manifestRaw),
      exactTaskPayloadSha256: expectedTask.sha256,
    },
    rawResponseSource: relativePath(expectedRawPath),
    rawResponse,
    rawResponseSha256: sha256(rawResponse),
    parsedReviewsSha256: assemblyIssues.some(
      (entry) => entry.code === "review_raw_not_bare_json_array",
    )
      ? null
      : canonicalSha256(reviews),
    reviews,
  };
  const outputPath = path.join(auditDir, "reviews", "envelopes", `${args.batch}.json`);
  await writeOnceOrVerify(outputPath, `${JSON.stringify(envelope, null, 2)}\n`);
  return {
    outputPath: relativePath(outputPath),
    passed: assemblyIssues.length === 0,
    assemblyPassed: assemblyIssues.length === 0,
    reviewCount: reviews.length,
    assemblyIssues,
  };
}

function addError(errors, code, pathValue, detail = undefined) {
  errors.push({ code, path: pathValue, ...(detail === undefined ? {} : { detail }) });
}

function validateReviewObject(review, input) {
  const errors = [];
  const expectedTopKeys = [
    "sampleRef",
    "reviewInputSha256",
    "proposalFingerprint",
    "caseVerdict",
    "itemVerdicts",
    "unsupportedSignals",
    "scores",
    "scoreComments",
    "topIssueCode",
    "note",
  ];
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return [{ code: "review_not_object", path: "$" }];
  }
  if (!sameSet(Object.keys(review), expectedTopKeys)) addError(errors, "review_keys_mismatch", "$", Object.keys(review));
  if (review.sampleRef !== input.sampleRef) addError(errors, "sample_ref_mismatch", "$.sampleRef");
  if (review.reviewInputSha256 !== input.reviewInputSha256) addError(errors, "review_input_hash_mismatch", "$.reviewInputSha256");
  if (review.proposalFingerprint !== input.proposalFingerprint) addError(errors, "proposal_fingerprint_mismatch", "$.proposalFingerprint");
  if (!["pass", "revise", "fail"].includes(review.caseVerdict)) addError(errors, "case_verdict_invalid", "$.caseVerdict");
  if (!Array.isArray(review.itemVerdicts)) addError(errors, "item_verdicts_array_required", "$.itemVerdicts");
  const itemVerdicts = Array.isArray(review.itemVerdicts) ? review.itemVerdicts : [];
  const proposalItems = Array.isArray(input?.compiledProposal?.items)
    ? input.compiledProposal.items
    : [];
  const expectedItemRefs = proposalItems.map((item) => item?.itemRef);
  if (!sameSet(itemVerdicts.map((entry) => entry?.itemRef), expectedItemRefs)) addError(errors, "item_verdict_coverage_mismatch", "$.itemVerdicts");
  for (const [index, verdict] of itemVerdicts.entries()) {
    if (!verdict || typeof verdict !== "object" || Array.isArray(verdict) || !sameSet(Object.keys(verdict), ["itemRef", "verdict", "reasonCode"])) {
      addError(errors, "item_verdict_shape", `$.itemVerdicts[${index}]`);
      continue;
    }
    if (!["keep", "edit", "remove"].includes(verdict.verdict)) addError(errors, "item_verdict_invalid", `$.itemVerdicts[${index}].verdict`);
    if (!allowedReasonCodes.has(verdict.reasonCode)) addError(errors, "item_reason_invalid", `$.itemVerdicts[${index}].reasonCode`);
    if (verdict.verdict === "keep" && verdict.reasonCode !== "supported_as_written") addError(errors, "keep_reason_mismatch", `$.itemVerdicts[${index}].reasonCode`);
    if (verdict.verdict !== "keep" && verdict.reasonCode === "supported_as_written") addError(errors, "nonkeep_reason_mismatch", `$.itemVerdicts[${index}].reasonCode`);
  }
  if (!Array.isArray(review.unsupportedSignals)) addError(errors, "unsupported_signals_array_required", "$.unsupportedSignals");
  const unsupportedSignals = Array.isArray(review.unsupportedSignals) ? review.unsupportedSignals : [];
  for (const [index, signal] of unsupportedSignals.entries()) {
    if (!isPlainObject(signal) || !sameSet(Object.keys(signal), ["class", "path", "quote"])) {
      addError(errors, "unsupported_signal_shape", `$.unsupportedSignals[${index}]`);
      continue;
    }
    if (!["action", "date", "repeat", "fact"].includes(signal.class)) addError(errors, "unsupported_signal_class", `$.unsupportedSignals[${index}].class`);
    if (typeof signal.quote !== "string" || signal.quote.length === 0) {
      addError(errors, "unsupported_signal_quote_invalid", `$.unsupportedSignals[${index}].quote`);
    }
    const resolved = resolveSimplePath(input.compiledProposal, signal.path);
    if (
      !resolved.found ||
      !["string", "number", "boolean"].includes(typeof resolved.value) ||
      typeof signal.quote !== "string" ||
      !String(resolved.value).includes(signal.quote)
    ) {
      addError(errors, "unsupported_signal_quote_not_literal_at_path", `$.unsupportedSignals[${index}]`);
    }
  }

  const itemIndexByRef = new Map(
    proposalItems.map((item, index) => [item?.itemRef, index]),
  );
  const nonKeepByItemRef = new Map(
    itemVerdicts
      .filter((entry) => isPlainObject(entry) && entry.verdict !== "keep")
      .map((entry) => [entry.itemRef, entry]),
  );
  for (const [index, verdict] of itemVerdicts.entries()) {
    if (!isPlainObject(verdict)) continue;
    const allowedClasses = unsupportedReasonClasses[verdict.reasonCode];
    if (!allowedClasses) continue;
    const itemIndex = itemIndexByRef.get(verdict.itemRef);
    const itemPath = Number.isInteger(itemIndex) ? `$.items[${itemIndex}]` : null;
    const matchingSignal = unsupportedSignals.some(
      (signal) =>
        isPlainObject(signal) &&
        itemPath !== null &&
        (signal.path === itemPath || signal.path?.startsWith(`${itemPath}.`)) &&
        allowedClasses.includes(signal.class),
    );
    if (!matchingSignal) {
      addError(
        errors,
        "unsupported_reason_missing_matching_signal",
        `$.itemVerdicts[${index}]`,
      );
    }
  }
  for (const [index, signal] of unsupportedSignals.entries()) {
    if (!isPlainObject(signal)) continue;
    const pathMatch = /^\$\.items\[([0-9]+)\](?:\.|$)/.exec(signal.path ?? "");
    const item = pathMatch ? proposalItems[Number(pathMatch[1])] : null;
    const verdict = item ? nonKeepByItemRef.get(item.itemRef) : null;
    const allowedClasses = verdict
      ? unsupportedReasonClasses[verdict.reasonCode] ?? []
      : [];
    if (!verdict || !allowedClasses.includes(signal.class)) {
      addError(
        errors,
        "unsupported_signal_missing_matching_nonkeep_reason",
        `$.unsupportedSignals[${index}]`,
      );
    }
  }
  if (!review.scores || typeof review.scores !== "object" || !sameSet(Object.keys(review.scores), axes)) addError(errors, "score_keys_mismatch", "$.scores");
  if (!review.scoreComments || typeof review.scoreComments !== "object" || !sameSet(Object.keys(review.scoreComments), axes)) addError(errors, "score_comment_keys_mismatch", "$.scoreComments");
  for (const axis of axes) {
    if (!Number.isInteger(review.scores?.[axis]) || review.scores[axis] < 1 || review.scores[axis] > 5) addError(errors, "score_invalid", `$.scores.${axis}`);
    if (typeof review.scoreComments?.[axis] !== "string" || review.scoreComments[axis].trim().length === 0 || review.scoreComments[axis].length > 220) addError(errors, "score_comment_invalid", `$.scoreComments.${axis}`);
  }
  if (!allowedTopIssueCodes.has(review.topIssueCode)) addError(errors, "top_issue_invalid", "$.topIssueCode");
  if (typeof review.note !== "string" || review.note.trim().length === 0 || review.note.length > 320) addError(errors, "note_invalid", "$.note");
  const nonKeep = itemVerdicts.some((entry) => entry?.verdict !== "keep");
  if (
    review.caseVerdict === "pass" &&
    (nonKeep || unsupportedSignals.length > 0 || review.topIssueCode !== null)
  ) {
    addError(errors, "pass_with_issue", "$.caseVerdict");
  }
  if (review.caseVerdict !== "pass" && review.topIssueCode === null) {
    addError(errors, "nonpass_top_issue_required", "$.topIssueCode");
  }
  const hardFailure =
    unsupportedSignals.length > 0 ||
    itemVerdicts.some(
      (entry) =>
        entry?.verdict === "remove" ||
        Object.hasOwn(unsupportedReasonClasses, entry?.reasonCode),
    );
  if (hardFailure && review.caseVerdict !== "fail") {
    addError(errors, "unsupported_or_remove_requires_fail", "$.caseVerdict");
  }
  if (
    review.caseVerdict !== "pass" &&
    !nonKeep &&
    unsupportedSignals.length === 0 &&
    review.topIssueCode === null
  ) {
    addError(errors, "nonpass_without_issue", "$.caseVerdict");
  }
  return errors;
}

async function validateReviews() {
  const freeze = await assertFreezeIntegrity();
  const manifestPath = path.join(auditDir, "review-inputs", "manifest.json");
  const globalErrors = [];
  let manifestRaw = "";
  let manifest = {};
  try {
    const document = await readJson(manifestPath);
    manifestRaw = document.raw;
    manifest = isPlainObject(document.value) ? document.value : {};
    if (!isPlainObject(document.value)) {
      addError(globalErrors, "review_manifest_object_required", "$", document.value);
    }
  } catch (error) {
    addError(globalErrors, "review_manifest_unreadable", "$", error.message);
  }
  if (
    !sameSet(Object.keys(manifest), [
      "manifestVersion",
      "laneId",
      "freezeSha256",
      "stabilityComparisonSha256",
      "compiledRunFile",
      "compiledRunSha256",
      "automatedValidationFile",
      "automatedValidationSha256",
      "rubricSha256",
      "reviewSchemaSha256",
      "inputs",
      "tasks",
    ])
  ) addError(globalErrors, "review_manifest_keys_mismatch", "$", Object.keys(manifest));

  const [
    { cases },
    protocol,
    rules,
    proposalSchema,
    rubric,
    reviewSchemaDocument,
  ] = await Promise.all([
    loadCases(),
    loadProtocol(),
    loadRules(),
    loadSchema(),
    readText(path.join(specDir, "review-rubric-v3.md")),
    readJson(path.join(v2SpecDir, "review-result-schema-v2.json")),
  ]);
  const reviewSchema = reviewSchemaDocument.value;
  const caseByAuditId = new Map(cases.map((entry) => [entry.auditCaseId, entry]));
  const caseBySampleRef = new Map(cases.map((entry) => [entry.sampleRef, entry]));
  const expectedAssignments = protocol.review?.positiveOnlyAssignment ?? {};
  const derivedAssignments = Object.fromEntries(
    batches.map((batchRef) => [
      batchRef,
      (protocol.batchAssignment?.[batchRef] ?? []).filter(
        (auditCaseId) => caseByAuditId.get(auditCaseId)?.generatorInput,
      ),
    ]),
  );
  if (
    !sameSet(Object.keys(expectedAssignments), batches) ||
    !batches.every(
      (batchRef) =>
        sameOrder(expectedAssignments[batchRef], derivedAssignments[batchRef]) &&
        expectedAssignments[batchRef].length ===
          ({ "batch-a": 4, "batch-b": 4, "batch-c": 2 })[batchRef],
    )
  ) {
    addError(globalErrors, "protocol_positive_assignment_mismatch", "$.review.positiveOnlyAssignment");
  }
  const expectedSampleRefsByBatch = Object.fromEntries(
    batches.map((batchRef) => [
      batchRef,
      (expectedAssignments[batchRef] ?? []).map(
        (auditCaseId) => caseByAuditId.get(auditCaseId)?.sampleRef ?? null,
      ),
    ]),
  );
  const expectedSampleRefs = batches.flatMap(
    (batchRef) => expectedSampleRefsByBatch[batchRef],
  );
  if (
    expectedSampleRefs.length !== 10 ||
    expectedSampleRefs.some((value) => typeof value !== "string") ||
    new Set(expectedSampleRefs).size !== 10
  ) {
    addError(globalErrors, "expected_positive_sample_set_invalid", "$.inputs");
  }

  let fileInventoryPassed = true;
  const inventoryChecks = [
    {
      directory: path.join(auditDir, "review-inputs"),
      expected: ["manifest.json", ...expectedSampleRefs.map((value) => `${value}.json`)].sort(),
      code: "review_input_file_inventory_mismatch",
    },
    {
      directory: path.join(auditDir, "review-task-payloads"),
      expected: batches.map((value) => `${value}.txt`).sort(),
      code: "review_task_file_inventory_mismatch",
    },
    {
      directory: path.join(auditDir, "review-raw"),
      expected: batches.map((value) => `${value}.txt`).sort(),
      code: "review_raw_file_inventory_mismatch",
    },
    {
      directory: path.join(auditDir, "reviews", "envelopes"),
      expected: batches.map((value) => `${value}.json`).sort(),
      code: "review_envelope_file_inventory_mismatch",
    },
  ];
  for (const check of inventoryChecks) {
    const actual = await recursiveFileList(check.directory);
    if (!sameOrder(actual, check.expected)) {
      fileInventoryPassed = false;
      addError(globalErrors, check.code, "$", { expected: check.expected, actual });
    }
  }

  if (manifest.laneId !== laneId) addError(globalErrors, "review_manifest_lane_mismatch", "$.laneId");
  if (manifest.manifestVersion !== "flowme-url-to-flow-v3-hybrid-review-inputs") addError(globalErrors, "review_manifest_version_mismatch", "$.manifestVersion");
  if (manifest.freezeSha256 !== freeze.freezeSha256) addError(globalErrors, "review_manifest_freeze_mismatch", "$.freezeSha256");
  const stabilityPath = path.join(auditDir, "stability-comparison.json");
  let stabilityRaw = "";
  let stability = {};
  try {
    const document = await readJson(stabilityPath);
    stabilityRaw = document.raw;
    stability = isPlainObject(document.value) ? document.value : {};
  } catch (error) {
    addError(globalErrors, "stability_unreadable", "$", error.message);
  }
  if (manifest.stabilityComparisonSha256 !== sha256(stabilityRaw)) addError(globalErrors, "review_manifest_stability_mismatch", "$.stabilityComparisonSha256");
  if (manifest.rubricSha256 !== sha256(rubric)) addError(globalErrors, "review_manifest_rubric_mismatch", "$.rubricSha256");
  if (manifest.reviewSchemaSha256 !== sha256(reviewSchemaDocument.raw)) addError(globalErrors, "review_manifest_schema_mismatch", "$.reviewSchemaSha256");
  if (!manifest.tasks || !sameSet(Object.keys(manifest.tasks), batches)) addError(globalErrors, "review_manifest_task_set_mismatch", "$.tasks");
  if (!isPlainObject(manifest.inputs)) addError(globalErrors, "review_manifest_inputs_object_required", "$.inputs");
  const manifestSampleRefs = Object.keys(isPlainObject(manifest.inputs) ? manifest.inputs : {});
  const taskSampleRefs = batches.flatMap((batchRef) => manifest.tasks?.[batchRef]?.sampleRefs ?? []);
  if (
    !sameSet(manifestSampleRefs, expectedSampleRefs) ||
    !sameOrder(taskSampleRefs, expectedSampleRefs)
  ) addError(globalErrors, "review_manifest_input_set_mismatch", "$.inputs");

  const runPaths = Object.fromEntries(
    ["round-1", "round-2"].map((round) => [
      round,
      path.join(auditDir, "runs", round, "compiled-run.json"),
    ]),
  );
  const validationPaths = Object.fromEntries(
    ["round-1", "round-2"].map((round) => [
      round,
      path.join(auditDir, "runs", round, "validation.json"),
    ]),
  );
  const runDocuments = {};
  const validationDocuments = {};
  for (const round of ["round-1", "round-2"]) {
    try {
      runDocuments[round] = await readJson(runPaths[round]);
      validationDocuments[round] = await readJson(validationPaths[round]);
    } catch (error) {
      addError(globalErrors, "run_or_validation_unreadable", `$.${round}`, error.message);
      runDocuments[round] = { raw: "", value: {} };
      validationDocuments[round] = { raw: "", value: {} };
    }
    if (!isPlainObject(runDocuments[round].value)) {
      addError(globalErrors, "compiled_run_object_required", `$.${round}.run`);
      runDocuments[round].value = {};
    }
    if (!isPlainObject(validationDocuments[round].value)) {
      addError(globalErrors, "automated_validation_object_required", `$.${round}.validation`);
      validationDocuments[round].value = {};
    }
    const validation = validationDocuments[round].value;
    if (
      validation.evidenceBindings?.compiledRunFile !== relativePath(runPaths[round]) ||
      validation.evidenceBindings?.compiledRunSha256 !== sha256(runDocuments[round].raw) ||
      validation.evidenceBindings?.compiledRunCanonicalSha256 !==
        canonicalSha256(runDocuments[round].value)
    ) {
      addError(globalErrors, "automated_validation_run_binding_mismatch", `$.${round}`);
    }
    const recomputed = await validateCompiledRun(
      runDocuments[round].value,
      cases,
      rules,
      proposalSchema,
    );
    const rebound = {
      ...recomputed,
      evidenceBindings: {
        compiledRunFile: relativePath(runPaths[round]),
        compiledRunSha256: sha256(runDocuments[round].raw),
        compiledRunCanonicalSha256: canonicalSha256(runDocuments[round].value),
      },
    };
    if (canonicalSha256(rebound) !== canonicalSha256(validation)) {
      addError(globalErrors, "automated_validation_recompute_mismatch", `$.${round}`);
    }
  }
  const recomputedComparisons = cases.map((strictCase, index) => {
    const left = Array.isArray(runDocuments["round-1"].value.outputs)
      ? runDocuments["round-1"].value.outputs[index]
      : null;
    const right = Array.isArray(runDocuments["round-2"].value.outputs)
      ? runDocuments["round-2"].value.outputs[index]
      : null;
    return {
      auditCaseId: strictCase.auditCaseId,
      sampleRef: strictCase.sampleRef,
      exactMembership:
        left?.auditCaseId === strictCase.auditCaseId &&
        right?.auditCaseId === strictCase.auditCaseId &&
        left?.sampleRef === strictCase.sampleRef &&
        right?.sampleRef === strictCase.sampleRef,
      round1Fingerprint: proposalFingerprint(left?.proposal ?? null),
      round2Fingerprint: proposalFingerprint(right?.proposal ?? null),
      identical:
        canonicalSha256(left?.proposal ?? null) ===
        canonicalSha256(right?.proposal ?? null),
    };
  });
  const recomputedStableCount = recomputedComparisons.filter(
    (entry) => entry.identical,
  ).length;
  const recomputedExactRoundBinding =
    runDocuments["round-1"].value.round === "round-1" &&
    runDocuments["round-2"].value.round === "round-2" &&
    validationDocuments["round-1"].value.round === "round-1" &&
    validationDocuments["round-2"].value.round === "round-2";
  const round1Executor = runDocuments["round-1"].value.executor ?? {};
  const round2Executor = runDocuments["round-2"].value.executor ?? {};
  const recomputedFreshProcessSeparation =
    typeof round1Executor.processInstanceRef === "string" &&
    typeof round2Executor.processInstanceRef === "string" &&
    round1Executor.processInstanceRef !== round2Executor.processInstanceRef &&
    (round1Executor.processId !== round2Executor.processId ||
      round1Executor.processStartedAtMs !== round2Executor.processStartedAtMs);
  const recomputedStabilityPassed =
    validationDocuments["round-1"].value.passed === true &&
    validationDocuments["round-2"].value.passed === true &&
    recomputedStableCount === recomputedComparisons.length &&
    recomputedComparisons.every((entry) => entry.exactMembership) &&
    recomputedExactRoundBinding &&
    recomputedFreshProcessSeparation;
  if (
    stability.round1RunSha256 !== sha256(runDocuments["round-1"].raw) ||
    stability.round2RunSha256 !== sha256(runDocuments["round-2"].raw) ||
    stability.round1ValidationSha256 !== sha256(validationDocuments["round-1"].raw) ||
    stability.round2ValidationSha256 !== sha256(validationDocuments["round-2"].raw) ||
    stability.outputCount !== 12 ||
    stability.stableCount !== 12 ||
    stability.stabilityRate !== 1 ||
    stability.exactRoundBinding !== recomputedExactRoundBinding ||
    stability.freshProcessSeparation !== recomputedFreshProcessSeparation ||
    stability.passed !== recomputedStabilityPassed ||
    canonicalSha256(stability.comparisons ?? null) !==
      canonicalSha256(recomputedComparisons) ||
    recomputedStableCount !== cases.length
  ) {
    addError(globalErrors, "stability_evidence_chain_mismatch", "$stability");
  }

  const expectedCompiledRunPath = runPaths["round-2"];
  const expectedAutomatedValidationPath = validationPaths["round-2"];
  if (
    manifest.compiledRunFile !== relativePath(expectedCompiledRunPath) ||
    manifest.compiledRunSha256 !== sha256(runDocuments["round-2"].raw) ||
    manifest.compiledRunSha256 !== stability.round2RunSha256
  ) addError(globalErrors, "review_manifest_compiled_run_mismatch", "$.compiledRunSha256");
  if (
    manifest.automatedValidationFile !== relativePath(expectedAutomatedValidationPath) ||
    manifest.automatedValidationSha256 !== sha256(validationDocuments["round-2"].raw) ||
    manifest.automatedValidationSha256 !== stability.round2ValidationSha256
  ) addError(globalErrors, "review_manifest_automated_validation_mismatch", "$.automatedValidationSha256");
  const compiledRun = runDocuments["round-2"].value;
  const compiledProposalBySampleRef = new Map(
    (Array.isArray(compiledRun.outputs) ? compiledRun.outputs : [])
      .filter(isPlainObject)
      .map((entry) => [entry.sampleRef, entry.proposal]),
  );
  const inputBySampleRef = new Map();
  for (const sampleRef of expectedSampleRefs) {
    const expectedInputPath = path.join(auditDir, "review-inputs", `${sampleRef}.json`);
    const manifestEntry = manifest.inputs?.[sampleRef];
    if (
      !isPlainObject(manifestEntry) ||
      !sameSet(Object.keys(manifestEntry), [
        "batchRef",
        "file",
        "reviewInputSha256",
        "proposalFingerprint",
      ]) ||
      manifestEntry.file !== relativePath(expectedInputPath) ||
      !(await exists(expectedInputPath))
    ) {
      addError(globalErrors, "review_input_file_integrity", `$.inputs.${sampleRef}`);
      continue;
    }
    let input;
    try {
      input = (await readJson(expectedInputPath)).value;
    } catch (error) {
      addError(globalErrors, "review_input_unreadable", `$.inputs.${sampleRef}`, error.message);
      continue;
    }
    if (
      !isPlainObject(input) ||
      !sameSet(Object.keys(input), [
        "sampleRef",
        "sourceOwnership",
        "sourceRows",
        "compiledProposal",
        "proposalFingerprint",
        "reviewInputSha256",
      ])
    ) {
      addError(globalErrors, "review_input_shape_mismatch", `$.inputs.${sampleRef}`);
      continue;
    }
    const { reviewInputSha256, ...baseInput } = input;
    const strictCase = caseBySampleRef.get(sampleRef);
    if (
      input.sampleRef !== sampleRef ||
      reviewInputSha256 !== canonicalSha256(baseInput) ||
      manifestEntry.reviewInputSha256 !== reviewInputSha256 ||
      manifestEntry.proposalFingerprint !== canonicalSha256(input.compiledProposal) ||
      input.proposalFingerprint !== canonicalSha256(input.compiledProposal) ||
      canonicalSha256(input.compiledProposal ?? null) !==
        canonicalSha256(compiledProposalBySampleRef.get(sampleRef) ?? null) ||
      canonicalSha256(input.sourceRows) !==
        canonicalSha256(strictCase?.generatorInput?.sourceRows ?? null) ||
      canonicalSha256(input.sourceOwnership) !==
        canonicalSha256(strictCase?.generatorInput?.sourceOwnership ?? null) ||
      manifestEntry.batchRef !==
        batches.find((batchRef) => expectedSampleRefsByBatch[batchRef].includes(sampleRef))
    ) {
      addError(globalErrors, "review_input_hash_integrity", `$.inputs.${sampleRef}`);
    }
    inputBySampleRef.set(sampleRef, input);
  }
  for (const batchRef of batches) {
    const expectedTaskPath = path.join(auditDir, "review-task-payloads", `${batchRef}.txt`);
    const taskEntry = manifest.tasks?.[batchRef];
    let currentTask = "";
    try {
      currentTask = await readText(expectedTaskPath);
    } catch (error) {
      addError(globalErrors, "review_task_unreadable", `$.tasks.${batchRef}`, error.message);
    }
    const expectedInputs = expectedSampleRefsByBatch[batchRef]
      .map((sampleRef) => inputBySampleRef.get(sampleRef))
      .filter(Boolean);
    const expectedTask = buildBlindReviewTask(rubric, reviewSchema, expectedInputs);
    if (
      !isPlainObject(taskEntry) ||
      !sameSet(Object.keys(taskEntry), ["file", "sha256", "inputCount", "sampleRefs"]) ||
      taskEntry.file !== relativePath(expectedTaskPath) ||
      taskEntry.sha256 !== sha256(currentTask) ||
      currentTask !== expectedTask ||
      taskEntry.inputCount !== expectedInputs.length ||
      !sameOrder(taskEntry.sampleRefs, expectedSampleRefsByBatch[batchRef])
    ) {
      addError(globalErrors, "review_task_file_integrity", `$.tasks.${batchRef}`);
    }
  }
  const documents = [];
  const reviewerIds = [];
  const allReviews = [];
  for (const batchRef of batches) {
    const envelopePath = path.join(auditDir, "reviews", "envelopes", `${batchRef}.json`);
    const errors = [];
    if (!(await exists(envelopePath))) {
      documents.push({ batchRef, passed: false, errors: [{ code: "review_envelope_missing", path: "$" }], results: [] });
      continue;
    }
    let envelope = {};
    try {
      const value = (await readJson(envelopePath)).value;
      if (isPlainObject(value)) envelope = value;
      else addError(errors, "review_envelope_object_required", "$", value);
    } catch (error) {
      addError(errors, "review_envelope_unreadable", "$", error.message);
    }
    if (
      !sameSet(Object.keys(envelope), [
        "reviewEnvelopeVersion",
        "laneId",
        "batchRef",
        "evidenceClass",
        "assemblyStatus",
        "assemblyIssues",
        "executor",
        "measurement",
        "bindings",
        "rawResponseSource",
        "rawResponse",
        "rawResponseSha256",
        "parsedReviewsSha256",
        "reviews",
      ])
    ) addError(errors, "review_envelope_keys_mismatch", "$", Object.keys(envelope));
    if (envelope.reviewEnvelopeVersion !== "flowme-url-to-flow-v3-hybrid-review-envelope") addError(errors, "review_envelope_version_mismatch", "$.reviewEnvelopeVersion");
    if (envelope.laneId !== laneId) addError(errors, "lane_id_mismatch", "$.laneId");
    if (envelope.batchRef !== batchRef) addError(errors, "batch_ref_mismatch", "$.batchRef");
    if (envelope.evidenceClass !== "current_session_model_proxy_blind_review") addError(errors, "review_evidence_class_mismatch", "$.evidenceClass");
    if (envelope.assemblyStatus !== "assembled" || !Array.isArray(envelope.assemblyIssues) || envelope.assemblyIssues.length !== 0) addError(errors, "review_assembly_failed", "$.assemblyIssues", envelope.assemblyIssues);
    if (
      !isPlainObject(envelope.executor) ||
      !sameSet(Object.keys(envelope.executor), ["agentTaskId", "taskName", "forkTurns"]) ||
      envelope.executor.forkTurns !== "none" ||
      typeof envelope.executor.agentTaskId !== "string" ||
      envelope.executor.agentTaskId.length === 0 ||
      typeof envelope.executor.taskName !== "string" ||
      envelope.executor.taskName.length === 0
    ) addError(errors, "reviewer_fresh_context_missing", "$.executor");
    reviewerIds.push(envelope.executor?.agentTaskId ?? null);
    const measurementKeys = [
      "provider",
      "model",
      "tier",
      "inputTokens",
      "outputTokens",
      "latencyMs",
      "cost",
      "currency",
    ];
    if (
      !isPlainObject(envelope.measurement) ||
      !sameSet(Object.keys(envelope.measurement), measurementKeys) ||
      measurementKeys.some((key) => envelope.measurement[key] !== null)
    ) addError(errors, "review_measurement_must_be_unknown", "$.measurement");
    if (envelope.bindings?.freezeSha256 !== freeze.freezeSha256) addError(errors, "freeze_binding_mismatch", "$.bindings.freezeSha256");
    if (
      !isPlainObject(envelope.bindings) ||
      !sameSet(Object.keys(envelope.bindings), [
        "freezeSha256",
        "reviewManifestSha256",
        "exactTaskPayloadSha256",
      ])
    ) addError(errors, "review_binding_shape_mismatch", "$.bindings");
    if (envelope.bindings?.reviewManifestSha256 !== sha256(manifestRaw)) addError(errors, "manifest_binding_mismatch", "$.bindings.reviewManifestSha256");
    if (envelope.bindings?.exactTaskPayloadSha256 !== manifest.tasks?.[batchRef]?.sha256) addError(errors, "task_binding_mismatch", "$.bindings.exactTaskPayloadSha256");
    const rawPath = path.join(auditDir, "review-raw", `${batchRef}.txt`);
    let currentRaw = "";
    try {
      currentRaw = await readText(rawPath);
    } catch (error) {
      addError(errors, "raw_review_unreadable", "$.rawResponse", error.message);
    }
    if (envelope.rawResponseSource !== relativePath(rawPath) || envelope.rawResponse !== currentRaw || envelope.rawResponseSha256 !== sha256(currentRaw)) addError(errors, "raw_review_evidence_mismatch", "$.rawResponse");
    let reparsedReviews = null;
    try {
      reparsedReviews = JSON.parse(currentRaw);
      if (!Array.isArray(reparsedReviews)) throw new Error("review raw must be an array");
    } catch (error) {
      addError(errors, "raw_review_not_bare_json_array", "$.rawResponse", error.message);
    }
    if (
      reparsedReviews &&
      (envelope.parsedReviewsSha256 !== canonicalSha256(reparsedReviews) ||
        canonicalSha256(Array.isArray(envelope.reviews) ? envelope.reviews : []) !==
          canonicalSha256(reparsedReviews))
    ) addError(errors, "raw_review_parsed_mismatch", "$.parsedReviewsSha256");
    if (!Array.isArray(envelope.reviews) || envelope.reviews.length !== manifest.tasks?.[batchRef]?.inputCount) addError(errors, "review_count_mismatch", "$.reviews");
    const results = [];
    const reviews = Array.isArray(envelope.reviews) ? envelope.reviews : [];
    const batchReviewEntries = [];
    for (let index = 0; index < expectedSampleRefsByBatch[batchRef].length; index += 1) {
      const sampleRef = expectedSampleRefsByBatch[batchRef][index];
      const input = inputBySampleRef.get(sampleRef) ?? {};
      const review = reviews[index];
      const reviewErrors = validateReviewObject(review, input);
      results.push({ sampleRef, passed: reviewErrors.length === 0, errors: reviewErrors, review });
      if (reviewErrors.length === 0) batchReviewEntries.push({ review, input });
    }
    const documentPassed = errors.length === 0 && results.every((entry) => entry.passed);
    if (documentPassed) allReviews.push(...batchReviewEntries);
    documents.push({
      batchRef,
      file: relativePath(envelopePath),
      passed: documentPassed,
      errors,
      results,
    });
  }
  const allItemVerdicts = allReviews.flatMap((entry) =>
    Array.isArray(entry.review?.itemVerdicts)
      ? entry.review.itemVerdicts.filter(isPlainObject)
      : [],
  );
  const keepCount = allItemVerdicts.filter((entry) => entry.verdict === "keep").length;
  const unsupportedSignals = allReviews.flatMap((entry) =>
    Array.isArray(entry.review?.unsupportedSignals)
      ? entry.review.unsupportedSignals.filter(isPlainObject)
      : [],
  );
  const scoreValues = Object.fromEntries(
    axes.map((axis) => [
      axis,
      allReviews.map((entry) => entry.review?.scores?.[axis]).filter(Number.isFinite),
    ]),
  );
  const axisAverages = Object.fromEntries(
    axes.map((axis) => [
      axis,
      scoreValues[axis].length === 0
        ? 0
        : scoreValues[axis].reduce((sum, value) => sum + value, 0) /
          scoreValues[axis].length,
    ]),
  );
  const totalScores = axes.flatMap((axis) => scoreValues[axis]);
  const sevenAxisAverage =
    totalScores.length === 0
      ? 0
      : totalScores.reduce((sum, value) => sum + value, 0) / totalScores.length;
  const automaticValidations = ["round-1", "round-2"].map(
    (round) => validationDocuments[round].value,
  );
  const gates = {
    automatedValidation:
      automaticValidations.length === 2 &&
      automaticValidations.every((entry) => entry.passed),
    crossRunStability:
      stability.passed &&
      stability.stabilityRate === 1 &&
      stability.exactRoundBinding === true &&
      stability.freshProcessSeparation === true,
    reviewEvidenceIntegrity: globalErrors.length === 0,
    exactReviewFiles: fileInventoryPassed,
    exactReviewBatches: documents.length === 3,
    reviewerEnvelopeIntegrity: documents.every((entry) => entry.passed),
    reviewerIsolation:
      reviewerIds.length === 3 &&
      reviewerIds.every(Boolean) &&
      new Set(reviewerIds).size === 3,
    positiveReviewCoverage: allReviews.length === 10,
    noFailedCases:
      allReviews.length === 10 &&
      allReviews.every((entry) => entry.review.caseVerdict !== "fail"),
    removalZero:
      allItemVerdicts.length === 15 &&
      allItemVerdicts.every((entry) => entry.verdict !== "remove"),
    negativeExact: automaticValidations.every(
      (entry) => entry.gates?.negativeExact === true,
    ),
    unsupportedZero: unsupportedSignals.length === 0,
    itemKeep:
      allItemVerdicts.length === 15 && keepCount / allItemVerdicts.length >= 0.8,
    sevenAxisAverage: sevenAxisAverage >= 3.5,
    executionClarity: axisAverages.executionClarity >= 4,
    contentFidelityCoverage: axisAverages.contentFidelityCoverage >= 4,
    sourceSafetySeparation: axisAverages.sourceSafetySeparation >= 4,
  };
  const report = {
    reviewValidationVersion: "flowme-url-to-flow-v3-hybrid-review-validation",
    laneId,
    passed:
      globalErrors.length === 0 &&
      documents.every((entry) => entry.passed) &&
      Object.values(gates).every(Boolean),
    gates,
    summary: {
      documentCount: documents.length,
      reviewCount: allReviews.length,
      itemVerdictCount: allItemVerdicts.length,
      keepCount,
      itemKeepRate:
        allItemVerdicts.length === 0 ? 0 : keepCount / allItemVerdicts.length,
      unsupportedSignalCount: unsupportedSignals.length,
      sevenAxisAverage,
      axisAverages,
    },
    globalErrors,
    documents,
  };
  const outputPath = path.join(auditDir, "reviews", "validation.json");
  await writeOnceOrVerify(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return { outputPath: relativePath(outputPath), ...report };
}

export async function main(argv) {
  const args = parseArgs(argv);
  if (args.command === "assemble") return assembleReview(args);
  return validateReviews();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (result.passed === false) process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
