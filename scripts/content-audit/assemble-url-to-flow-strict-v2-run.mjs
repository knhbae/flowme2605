import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertBaseFreezeIntegrity,
  assertExecutorIdAvailable,
  assertRevisionFreezeIntegrity,
  auditDir,
  canonicalSha256,
  collectExecutorEvidence,
  exists,
  laneId,
  readJson,
  readText,
  relativePath,
  repoRoot,
  sha256,
  specDir,
  writeText,
} from "./url-to-flow-strict-v2-core.mjs";
import { deriveDefectSelection } from "./record-url-to-flow-strict-v2-defect-selection.mjs";

function parseArgs(argv) {
  const args = {
    round: null,
    batch: null,
    raw: null,
    agentId: null,
    taskName: null,
    revisionClass: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (
      [
        "--round",
        "--batch",
        "--raw",
        "--agent-id",
        "--task-name",
        "--revision-class",
      ].includes(token)
    ) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${token} requires a value`);
      const key = token
        .slice(2)
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      args[key] = value === "null" ? null : value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  for (const key of ["round", "batch", "raw", "agentId", "taskName"]) {
    if (!args[key]) {
      throw new Error(
        `Missing required --${key.replace(/[A-Z]/g, (value) => `-${value.toLowerCase()}`)}`,
      );
    }
  }
  if (!/^round-[123]$/.test(args.round)) throw new Error(`Invalid round: ${args.round}`);
  if (!/^batch-[abc]$/.test(args.batch)) throw new Error(`Invalid batch: ${args.batch}`);
  return args;
}

async function writeOnceOrVerify(filePath, value) {
  if (await exists(filePath)) {
    const current = await readText(filePath);
    if (current !== value) {
      throw new Error(`Run evidence already exists with different bytes: ${relativePath(filePath)}`);
    }
    return;
  }
  await writeText(filePath, value);
}

function addAssemblyIssue(issues, code, detail = undefined) {
  issues.push({ code, ...(detail === undefined ? {} : { detail }) });
}

export async function assembleStrictRun(argv) {
  const args = parseArgs(argv);
  const outputPath = path.join(auditDir, "runs", args.round, `${args.batch}.json`);
  const baseIntegrity = await assertBaseFreezeIntegrity();
  const executorEvidence = await collectExecutorEvidence();
  if (!executorEvidence.passed) {
    throw new Error(
      `Existing executor evidence is not globally unique and complete: ${JSON.stringify({
        missingIds: executorEvidence.missingIds,
        duplicates: executorEvidence.duplicates,
      })}`,
    );
  }
  await assertExecutorIdAvailable(args.agentId, outputPath);

  const { value: cases } = await readJson(path.join(specDir, "cases-v2.json"));
  const { value: protocol } = await readJson(path.join(specDir, "protocol-v2.json"));
  const { raw: freezeRaw, value: freeze } = await readJson(
    path.join(specDir, "freeze-manifest.json"),
  );
  if (sha256(freezeRaw) !== baseIntegrity.freezeSha256) {
    throw new Error("Base freeze changed during run assembly");
  }
  const { value: negatives } = await readJson(
    path.join(auditDir, "deterministic-negatives-v2.json"),
  );

  let selection = null;
  let selectionRaw = null;
  let expectedPromptVersion = "url-to-flow-prompt-v2.0";
  if (args.round === "round-1") {
    if (args.revisionClass !== null) {
      throw new Error("Round 1 must use prompt v2.0 with revisionClass=null");
    }
  } else {
    const selectionPath = path.join(auditDir, "runs", "round-1", "defect-selection.json");
    ({ raw: selectionRaw, value: selection } = await readJson(selectionPath));
    const round1AutomatedPath = path.join(auditDir, "runs", "round-1", "validation.json");
    const { raw: round1AutomatedRaw, value: round1Automated } = await readJson(
      round1AutomatedPath,
    );
    if (
      selection.round1AutomatedValidationSha256 !== sha256(round1AutomatedRaw) ||
      (selection.protocolIntegrityFailures ?? []).length !== 0
    ) {
      throw new Error("Defect selection is not bound to valid Round 1 evidence");
    }
    const round1ReviewPath = path.join(auditDir, "reviews", "round-1", "validation.json");
    let round1ReviewRaw = null;
    let round1Review = null;
    if (selection.reviewNotRunReason === "run_validation_failed") {
      if (
        round1Automated.passed ||
        selection.round1ReviewValidationSha256 !== null ||
        selection.round1PassedAllGates !== false ||
        (await exists(round1ReviewPath))
      ) {
        throw new Error("Run-failed Round 1 review omission evidence is inconsistent");
      }
    } else {
      ({ raw: round1ReviewRaw, value: round1Review } = await readJson(round1ReviewPath));
      if (
        selection.round1ReviewValidationSha256 !== sha256(round1ReviewRaw) ||
        selection.round1PassedAllGates !== round1Review.passed
      ) {
        throw new Error("Defect selection is not bound to Round 1 blind review");
      }
    }
    const derivedSelection = deriveDefectSelection({
      protocol,
      automatedValidation: round1Automated,
      automatedRaw: round1AutomatedRaw,
      automatedValidationPath: round1AutomatedPath,
      reviewValidation: round1Review,
      reviewRaw: round1ReviewRaw,
    });
    if (canonicalSha256(selection) !== canonicalSha256(derivedSelection)) {
      throw new Error("Defect selection does not equal the deterministic selection derived from Round 1 evidence");
    }
    expectedPromptVersion =
      selection.action === "unchanged_confirmation"
        ? "url-to-flow-prompt-v2.0"
        : selection.action === "prompt_one_defect_revision"
          ? "url-to-flow-prompt-v2.1"
          : null;
    if (!expectedPromptVersion) throw new Error("Unknown defect-selection action");
    if ((selection.revisionClass ?? null) !== args.revisionClass) {
      throw new Error("revisionClass does not match the automatic defect selection");
    }
  }

  let round2ReviewValidationSha256 = null;
  if (args.round === "round-3") {
    const { raw: round2ReviewRaw, value: round2Review } = await readJson(
      path.join(auditDir, "reviews", "round-2", "validation.json"),
    );
    const round2AutomatedPath = path.join(auditDir, "runs", "round-2", "validation.json");
    const { raw: round2AutomatedRaw } = await readJson(round2AutomatedPath);
    const requiredRound2GateKeys = [
      "automatedValidation",
      "reviewEvidenceIntegrityRecomputed",
      "exactReviewBatches",
      "reviewerEnvelopeIntegrity",
      "reviewerIsolation",
      "globalExecutorEvidence",
      "globalExecutorIdsUnique",
      "globalExecutorRolesDisjoint",
      "positiveReviewCoverage",
      "strictEligibleRowProfile",
      "negativeExact",
      "sourceRowAccounting",
      "unsupportedZero",
      "itemKeep",
      "sevenAxisAverage",
      "executionClarity",
      "contentFidelityCoverage",
      "sourceSafetySeparation",
    ];
    const round2GateKeys = Object.keys(round2Review.gates ?? {});
    if (
      round2Review.reviewValidationVersion !== "flowme-url-to-flow-strict-review-validation-v2" ||
      round2Review.laneId !== laneId ||
      round2Review.round !== "round-2" ||
      round2Review.passed !== true ||
      round2Review.evidenceBindings?.automatedValidationFile !==
        relativePath(round2AutomatedPath) ||
      round2Review.evidenceBindings?.automatedValidationSha256 !==
        sha256(round2AutomatedRaw) ||
      !round2Review.gates ||
      round2GateKeys.length !== requiredRound2GateKeys.length ||
      !requiredRound2GateKeys.every((key) => round2GateKeys.includes(key)) ||
      !Object.values(round2Review.gates).every((value) => value === true)
    ) {
      throw new Error("Round 3 is forbidden until every Round 2 gate passes");
    }
    round2ReviewValidationSha256 = sha256(round2ReviewRaw);
  }

  const promptFolder = expectedPromptVersion.endsWith("v2.1") ? "v2.1" : "v2.0";
  let revisionIntegrity = null;
  let revisionFreeze = null;
  if (promptFolder === "v2.1") {
    revisionIntegrity = await assertRevisionFreezeIntegrity();
    ({ value: revisionFreeze } = await readJson(
      path.join(specDir, "revision-freeze-v2.1.json"),
    ));
  }
  const { raw: taskManifestRaw, value: taskManifest } = await readJson(
    path.join(auditDir, "task-payloads", promptFolder, "manifest.json"),
  );
  const expectedTaskManifestSha256 =
    promptFolder === "v2.1"
      ? revisionFreeze.taskPayloadManifestSha256
      : freeze.bindings.taskPayloadManifestSha256;
  if (sha256(taskManifestRaw) !== expectedTaskManifestSha256) {
    throw new Error("Task manifest bytes do not match the active freeze");
  }
  if (taskManifest.promptVersion !== expectedPromptVersion) {
    throw new Error("Task manifest prompt version does not match the protocol-selected prompt");
  }
  const taskEntry = taskManifest.taskPayloads.find((entry) => entry.batchRef === args.batch);
  if (!taskEntry) throw new Error(`Missing task manifest entry: ${args.batch}`);
  const exactTaskRaw = await readText(path.join(repoRoot, taskEntry.file));
  if (sha256(exactTaskRaw) !== taskEntry.taskPayloadSha256) {
    throw new Error("Exact task payload bytes do not match the task manifest");
  }

  const auditCaseIds = protocol.batchAssignment[args.batch];
  if (!Array.isArray(auditCaseIds) || auditCaseIds.length !== 4) {
    throw new Error(`Protocol batch ${args.batch} must contain exactly four audit cases`);
  }
  const batchCases = auditCaseIds.map((auditCaseId) =>
    cases.cases.find((entry) => entry.auditCaseId === auditCaseId),
  );
  if (batchCases.some((entry) => !entry)) throw new Error(`Unknown case in ${args.batch}`);
  const positiveCases = batchCases.filter((entry) => entry.generatorInput);
  if (
    taskEntry.pipelineCaseCount !== batchCases.length ||
    taskEntry.modelInputCaseCount !== positiveCases.length ||
    taskEntry.deterministicCaseCount !== batchCases.length - positiveCases.length
  ) {
    throw new Error("Task manifest batch counts do not match the frozen pipeline assignment");
  }

  const rawPath = path.resolve(repoRoot, args.raw);
  const expectedRawPath = path.join(
    auditDir,
    "raw",
    args.round,
    `${args.batch}.txt`,
  );
  if (path.normalize(rawPath).toLowerCase() !== path.normalize(expectedRawPath).toLowerCase()) {
    throw new Error(
      `Raw response path must be the strict audit path: ${relativePath(expectedRawPath)}`,
    );
  }
  const rawResponse = await readText(rawPath);
  const assemblyIssues = [];
  let parsedValue;
  try {
    parsedValue = JSON.parse(rawResponse);
  } catch (error) {
    addAssemblyIssue(assemblyIssues, "raw_response_json_parse_failed", error.message);
  }
  if (parsedValue !== undefined && !Array.isArray(parsedValue)) {
    addAssemblyIssue(assemblyIssues, "raw_response_not_array", {
      actualType: parsedValue === null ? "null" : typeof parsedValue,
    });
  }
  const modelResults = Array.isArray(parsedValue) ? parsedValue : [];
  if (modelResults.length !== positiveCases.length) {
    addAssemblyIssue(assemblyIssues, "model_result_count_mismatch", {
      expected: positiveCases.length,
      actual: modelResults.length,
    });
  }
  for (let index = 0; index < positiveCases.length; index += 1) {
    const proposal = modelResults[index];
    const strictCase = positiveCases[index];
    if (proposal === undefined) {
      addAssemblyIssue(assemblyIssues, "model_result_missing", { index });
      continue;
    }
    if (
      proposal?.sampleRef !== strictCase.sampleRef ||
      proposal?.requestRef !== strictCase.requestRef
    ) {
      addAssemblyIssue(assemblyIssues, "model_result_input_order_mismatch", {
        index,
        expectedSampleRef: strictCase.sampleRef,
        actualSampleRef: proposal?.sampleRef ?? null,
      });
    }
    if (proposal?.promptVersion !== expectedPromptVersion) {
      addAssemblyIssue(assemblyIssues, "model_result_prompt_version_mismatch", {
        index,
        expected: expectedPromptVersion,
        actual: proposal?.promptVersion ?? null,
      });
    }
  }

  const negativeBySampleRef = new Map(
    negatives.outputs.map((entry) => [entry.sampleRef, entry]),
  );
  let positiveIndex = 0;
  const outputs = batchCases.map((entry) => {
    if (entry.generatorInput) {
      const proposal = modelResults[positiveIndex] ?? null;
      positiveIndex += 1;
      return {
        auditCaseId: entry.auditCaseId,
        sampleRef: entry.sampleRef,
        modelInvoked: true,
        packetSha256: freeze.packetSha256BySampleRef[entry.sampleRef],
        proposal,
      };
    }
    const negative = negativeBySampleRef.get(entry.sampleRef);
    if (!negative) throw new Error(`Missing deterministic negative: ${entry.sampleRef}`);
    return {
      auditCaseId: entry.auditCaseId,
      sampleRef: entry.sampleRef,
      modelInvoked: false,
      packetSha256: null,
      proposal: negative.proposal,
    };
  });

  const envelope = {
    runEnvelopeVersion: "flowme-url-to-flow-strict-run-v2",
    laneId,
    runId: `strict-v2-${args.round}-${args.batch}`,
    round: args.round,
    batchRef: args.batch,
    promptVersion: expectedPromptVersion,
    evidenceClass: "current_session_model_proxy",
    protocolState: {
      revisionClass: args.revisionClass,
      outputEditedByController: false,
      externalApiUsed: false,
      humanReview: false,
      assemblyPassed: assemblyIssues.length === 0,
    },
    assemblyIssues,
    bindings: {
      baseFreezeSha256: baseIntegrity.freezeSha256,
      revisionFreezeSha256: revisionIntegrity?.revisionFreezeSha256 ?? null,
      protocolSha256: freeze.bindings.protocolSha256,
      caseSetSha256: freeze.bindings.caseSetSha256,
      caseSetSemanticSha256: freeze.bindings.caseSetSemanticSha256,
      opaqueMapSha256: freeze.bindings.opaqueMapSha256,
      promptTemplateSha256:
        revisionFreeze?.promptTemplateSha256 ?? freeze.bindings.promptTemplateSha256,
      schemaSha256: freeze.bindings.schemaSha256,
      rubricSha256: freeze.bindings.rubricSha256,
      packetManifestSha256: freeze.bindings.packetManifestSha256,
      taskPayloadManifestSha256: expectedTaskManifestSha256,
      exactTaskPayloadSha256: taskEntry.taskPayloadSha256,
      defectSelectionSha256: selectionRaw === null ? null : sha256(selectionRaw),
      round2ReviewValidationSha256,
    },
    executor: {
      agentTaskId: args.agentId,
      taskName: args.taskName,
      forkTurns: "none",
      freshContextMethod: "spawn_agent_fork_none",
    },
    measurement: {
      provider: null,
      model: null,
      tier: null,
      sampling: null,
      inputTokens: null,
      outputTokens: null,
      latencyMs: null,
      cost: null,
      currency: null,
    },
    counts: {
      pipelineCaseCount: batchCases.length,
      modelInputCaseCount: positiveCases.length,
      modelResultCount: modelResults.length,
      deterministicCaseCount: batchCases.length - positiveCases.length,
      outputCount: outputs.length,
    },
    rawResponseSource: relativePath(rawPath),
    rawResponse,
    rawResponseSha256: sha256(rawResponse),
    parsedModelResultsSha256:
      parsedValue === undefined ? null : canonicalSha256(parsedValue),
    outputs,
  };

  const previousRound =
    args.round === "round-2"
      ? "round-1"
      : args.round === "round-3"
        ? "round-2"
        : null;
  if (previousRound) {
    const { value: previous } = await readJson(
      path.join(auditDir, "runs", previousRound, `${args.batch}.json`),
    );
    if (args.round === "round-3") {
      const bindingKeys = [
        "baseFreezeSha256",
        "revisionFreezeSha256",
        "protocolSha256",
        "caseSetSha256",
        "caseSetSemanticSha256",
        "opaqueMapSha256",
        "promptTemplateSha256",
        "schemaSha256",
        "rubricSha256",
        "packetManifestSha256",
        "taskPayloadManifestSha256",
        "exactTaskPayloadSha256",
        "defectSelectionSha256",
      ];
      for (const key of bindingKeys) {
        if (previous.bindings?.[key] !== envelope.bindings[key]) {
          throw new Error(`Round 3 input binding differs from Round 2: ${key}`);
        }
      }
      for (const otherBatch of ["batch-a", "batch-b", "batch-c"]) {
        if (otherBatch === args.batch) continue;
        const otherPath = path.join(auditDir, "runs", "round-3", `${otherBatch}.json`);
        if (!(await exists(otherPath))) continue;
        const { value: other } = await readJson(otherPath);
        if (
          other.bindings?.round2ReviewValidationSha256 !==
          envelope.bindings.round2ReviewValidationSha256
        ) {
          throw new Error("Round 3 batches bind different Round 2 review validations");
        }
      }
    }
  }

  const serialized = `${JSON.stringify(envelope, null, 2)}\n`;
  await writeOnceOrVerify(outputPath, serialized);
  return {
    outputPath: relativePath(outputPath),
    assemblyPassed: assemblyIssues.length === 0,
    assemblyIssues,
    outputCount: outputs.length,
    modelInputCount: positiveCases.length,
    modelResultCount: modelResults.length,
    deterministicCount: batchCases.length - positiveCases.length,
    rawResponseSha256: envelope.rawResponseSha256,
    exactTaskPayloadSha256: taskEntry.taskPayloadSha256,
    round2ReviewValidationSha256,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  assembleStrictRun(process.argv.slice(2))
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
