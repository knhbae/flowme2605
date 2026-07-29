import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertBaseFreezeIntegrity,
  assertRevisionFreezeIntegrity,
  auditDir,
  canonicalSha256,
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
import { validateStrictV2 } from "./validate-url-to-flow-strict-v2.mjs";

export const reviewBatchRefs = ["batch-a", "batch-b", "batch-c"];
export const reviewRawPath = (round, batchRef) =>
  path.join(auditDir, "review-raw", round, `${batchRef}.txt`);

const sameArray = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

function assertIntegrity(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertExactDirectoryFiles(directoryPath, expectedNames, label) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const actualNames = entries.map((entry) => entry.name).sort();
  const expected = [...expectedNames].sort();
  assertIntegrity(
    entries.every((entry) => entry.isFile()) && sameArray(actualNames, expected),
    `${label} contains unexpected or missing artifacts: expected ${expected.join(", ")}; received ${actualNames.join(", ")}`,
  );
}

async function verifyAutomatedValidationEvidence(round, recomputed = null) {
  const automated = recomputed ?? (await validateStrictV2(["--all", "--round", round]));
  assertIntegrity(automated.passed, `${round} run evidence fails automated validation`);
  const validationPath = path.join(auditDir, "runs", round, "validation.json");
  const { raw: validationRaw, value: storedValidation } = await readJson(validationPath);
  assertIntegrity(
    canonicalSha256(storedValidation) === canonicalSha256(automated),
    `${round} stored automated validation is not canonical-equivalent to recomputed evidence`,
  );
  return {
    automated,
    validationPath,
    validationRaw,
    validationSha256: sha256(validationRaw),
  };
}

function resolveRepoFile(relativeFile, label) {
  const resolved = path.resolve(repoRoot, relativeFile);
  const repoPrefix = `${path.resolve(repoRoot)}${path.sep}`;
  assertIntegrity(
    resolved === path.resolve(repoRoot) || resolved.startsWith(repoPrefix),
    `${label} leaves the repository: ${relativeFile}`,
  );
  return resolved;
}

async function verifyFileSha256(filePath, expectedSha256, label) {
  assertIntegrity(typeof expectedSha256 === "string", `${label} is missing its expected SHA-256`);
  assertIntegrity(await exists(filePath), `${label} is missing: ${relativePath(filePath)}`);
  const raw = await readText(filePath);
  const actualSha256 = sha256(raw);
  assertIntegrity(
    actualSha256 === expectedSha256,
    `${label} hash mismatch: expected ${expectedSha256}, received ${actualSha256}`,
  );
  return raw;
}

async function verifyGeneratorTaskManifest({ manifestPath, expectedSha256, promptVersion, exactByBatch }) {
  const raw = await verifyFileSha256(manifestPath, expectedSha256, `${promptVersion} task manifest`);
  const value = JSON.parse(raw);
  assertIntegrity(value.manifestVersion === "flowme-strict-generator-task-manifest-v2", `${promptVersion} task manifest version mismatch`);
  assertIntegrity(value.laneId === laneId, `${promptVersion} task manifest lane mismatch`);
  assertIntegrity(value.promptVersion === promptVersion, `${promptVersion} task manifest prompt mismatch`);
  assertIntegrity(
    sameArray(value.taskPayloads?.map((entry) => entry.batchRef), reviewBatchRefs),
    `${promptVersion} task manifest must contain ordered batch-a/b/c`,
  );
  for (const entry of value.taskPayloads) {
    const filePath = resolveRepoFile(entry.file, `${promptVersion} ${entry.batchRef} task payload`);
    await verifyFileSha256(filePath, entry.taskPayloadSha256, `${promptVersion} ${entry.batchRef} task payload`);
    if (exactByBatch) {
      assertIntegrity(
        entry.taskPayloadSha256 === exactByBatch[entry.batchRef],
        `${promptVersion} ${entry.batchRef} task payload is not bound by its freeze`,
      );
    }
  }
  return { raw, value };
}

export async function verifyStrictReviewFreezeIntegrity({ round }) {
  const coreBaseIntegrity = await assertBaseFreezeIntegrity();
  const freezePath = path.join(specDir, "freeze-manifest.json");
  const { raw: freezeRaw, value: freeze } = await readJson(freezePath);
  assertIntegrity(
    coreBaseIntegrity.freezeSha256 === sha256(freezeRaw),
    "Core/base freeze hash verification disagrees with review verification",
  );
  assertIntegrity(freeze.freezeVersion === "flowme-url-to-flow-strict-freeze-v2", "Base freeze version mismatch");
  assertIntegrity(freeze.laneId === laneId && freeze.frozenBeforeRound1 === true, "Base freeze state mismatch");

  for (const [relativeFile, expectedSha256] of Object.entries(freeze.frozenFileSha256 ?? {})) {
    await verifyFileSha256(
      resolveRepoFile(relativeFile, "Base frozen file"),
      expectedSha256,
      `Base frozen file ${relativeFile}`,
    );
  }

  const priorSpecDir = path.join(
    repoRoot,
    "docs/specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
  );
  const bindingFiles = {
    protocolSha256: path.join(specDir, "protocol-v2.json"),
    caseSetSha256: path.join(specDir, "cases-v2.json"),
    opaqueMapSha256: path.join(specDir, "hidden-map-v2.json"),
    promptTemplateSha256: path.join(specDir, "prompt-v2.0.md"),
    schemaSha256: path.join(specDir, "proposal-schema-v2.json"),
    rubricSha256: path.join(specDir, "review-rubric.md"),
    reviewSchemaSha256: path.join(specDir, "review-result-schema-v2.json"),
    packetManifestSha256: path.join(auditDir, "packets", "v2.0", "manifest.json"),
    taskPayloadManifestSha256: path.join(auditDir, "task-payloads", "v2.0", "manifest.json"),
    deterministicNegativesSha256: path.join(auditDir, "deterministic-negatives-v2.json"),
    leakageReportSha256: path.join(auditDir, "leakage-report.json"),
    canonicalPriorCasesSha256: path.join(priorSpecDir, "cases-v1.json"),
    canonicalPriorExpectedSha256: path.join(priorSpecDir, "expected-v1.json"),
  };
  for (const [binding, filePath] of Object.entries(bindingFiles)) {
    await verifyFileSha256(filePath, freeze.bindings?.[binding], `Base binding ${binding}`);
  }

  const { value: cases } = await readJson(path.join(specDir, "cases-v2.json"));
  assertIntegrity(
    cases.semanticCaseSetSha256 === freeze.bindings.caseSetSemanticSha256,
    "Base semantic case-set binding mismatch",
  );

  const { value: packetManifest } = await readJson(
    path.join(auditDir, "packets", "v2.0", "manifest.json"),
  );
  assertIntegrity(packetManifest.manifestVersion === "flowme-strict-packet-manifest-v2", "Packet manifest version mismatch");
  assertIntegrity(packetManifest.laneId === laneId, "Packet manifest lane mismatch");
  assertIntegrity(packetManifest.packetCount === packetManifest.packets?.length, "Packet manifest count mismatch");
  for (const packet of packetManifest.packets ?? []) {
    await verifyFileSha256(
      resolveRepoFile(packet.file, `Packet ${packet.sampleRef}`),
      packet.packetSha256,
      `Packet ${packet.sampleRef}`,
    );
    assertIntegrity(
      freeze.packetSha256BySampleRef?.[packet.sampleRef] === packet.packetSha256,
      `Packet ${packet.sampleRef} is not bound by the base freeze`,
    );
  }

  await verifyGeneratorTaskManifest({
    manifestPath: path.join(auditDir, "task-payloads", "v2.0", "manifest.json"),
    expectedSha256: freeze.bindings.taskPayloadManifestSha256,
    promptVersion: "url-to-flow-prompt-v2.0",
    exactByBatch: freeze.taskPayloadSha256ByBatch,
  });

  const revisionFreezePath = path.join(specDir, "revision-freeze-v2.1.json");
  let revisionFreeze = null;
  let revisionFreezeRaw = null;
  if (await exists(revisionFreezePath)) {
    ({ raw: revisionFreezeRaw, value: revisionFreeze } = await readJson(revisionFreezePath));
    assertIntegrity(
      revisionFreeze.revisionFreezeVersion === "flowme-url-to-flow-strict-revision-freeze-v2.1",
      "Revision freeze version mismatch",
    );
    assertIntegrity(
      revisionFreeze.laneId === laneId && revisionFreeze.frozenBeforeRound2 === true,
      "Revision freeze state mismatch",
    );
    assertIntegrity(revisionFreeze.baseFreezeSha256 === sha256(freezeRaw), "Revision freeze base binding mismatch");
    for (const [binding, expected] of Object.entries(revisionFreeze.unchangedBindings ?? {})) {
      assertIntegrity(freeze.bindings?.[binding] === expected, `Revision changed frozen binding ${binding}`);
    }
    await verifyFileSha256(
      path.join(specDir, "prompt-v2.1.md"),
      revisionFreeze.promptTemplateSha256,
      "Revision prompt",
    );
    await verifyGeneratorTaskManifest({
      manifestPath: path.join(auditDir, "task-payloads", "v2.1", "manifest.json"),
      expectedSha256: revisionFreeze.taskPayloadManifestSha256,
      promptVersion: "url-to-flow-prompt-v2.1",
      exactByBatch: revisionFreeze.exactTaskPayloadSha256ByBatch,
    });
    const selectionPath = path.join(auditDir, "runs", "round-1", "defect-selection.json");
    const { raw: selectionRaw, value: selection } = await readJson(selectionPath);
    assertIntegrity(
      sha256(selectionRaw) === revisionFreeze.defectSelectionSha256,
      "Revision freeze defect-selection binding mismatch",
    );
    assertIntegrity(
      selection.action === "prompt_one_defect_revision" &&
        selection.revisionClass === revisionFreeze.revisionClass,
      "Revision freeze selection state mismatch",
    );
  }

  let revisionRequired = false;
  for (const batchRef of reviewBatchRefs) {
    const runPath = path.join(auditDir, "runs", round, `${batchRef}.json`);
    if (!(await exists(runPath))) continue;
    const { value: run } = await readJson(runPath);
    if (run.promptVersion === "url-to-flow-prompt-v2.1") revisionRequired = true;
  }
  assertIntegrity(!revisionRequired || revisionFreeze !== null, `${round} uses v2.1 without a revision freeze`);
  if (revisionRequired) {
    const coreRevisionIntegrity = await assertRevisionFreezeIntegrity(revisionFreeze);
    assertIntegrity(
      coreRevisionIntegrity.baseFreezeSha256 === sha256(freezeRaw) &&
        coreRevisionIntegrity.revisionFreezeSha256 === sha256(revisionFreezeRaw),
      "Core/revision freeze hash verification disagrees with review verification",
    );
  }

  return {
    freeze,
    freezeRaw,
    baseFreezeSha256: sha256(freezeRaw),
    revisionFreeze,
    revisionFreezeSha256: revisionFreezeRaw === null ? null : sha256(revisionFreezeRaw),
  };
}

function parseArgs(argv) {
  const roundIndex = argv.indexOf("--round");
  const round = roundIndex >= 0 ? argv[roundIndex + 1] : null;
  if (!/^round-[123]$/.test(round ?? "")) throw new Error("--round round-1|round-2|round-3 is required");
  if (argv.length !== 2) throw new Error(`Unknown arguments: ${argv.join(" ")}`);
  return { round };
}

async function writeOnceOrVerify(filePath, value) {
  if (await exists(filePath)) {
    if ((await readText(filePath)) !== value) throw new Error(`Frozen review input differs: ${relativePath(filePath)}`);
    return;
  }
  await writeText(filePath, value);
}

export function reviewTaskPayload(rubric, reviewSchema, cases) {
  return [
    "You are an isolated blind FLOW reviewer. Use only the inline material below.",
    "Do not inspect files, tools, prior conversation, external sources, hidden answers, generators, or other reviews.",
    "Apply REVIEW_RUBRIC independently to every REVIEW_CASE_JSON object.",
    "Return exactly one bare JSON array in the same order, with one review object per input.",
    "Copy sampleRef, reviewInputSha256, and proposalFingerprint exactly.",
    "Every proposed Item must have exactly one itemVerdict.",
    "For an unsupportedSignal, path must be a concrete JSON path in proposal and quote must occur literally at that value.",
    "Do not use Markdown fences, commentary, or wrapper keys.",
    "",
    "<REVIEW_RUBRIC>",
    rubric.trimEnd(),
    "</REVIEW_RUBRIC>",
    "",
    "<REVIEW_RESULT_SCHEMA>",
    reviewSchema.trimEnd(),
    "</REVIEW_RESULT_SCHEMA>",
    "",
    "<REVIEW_CASES_JSON>",
    JSON.stringify(cases, null, 2),
    "</REVIEW_CASES_JSON>",
    "",
  ].join("\n");
}

export async function verifyReviewManifestArtifacts({ round }) {
  const freezeEvidence = await verifyStrictReviewFreezeIntegrity({ round });
  const automatedEvidence = await verifyAutomatedValidationEvidence(round);
  const { automated } = automatedEvidence;
  const manifestPath = path.join(auditDir, "review-inputs", round, "manifest.json");
  const { raw: manifestRaw, value: manifest } = await readJson(manifestPath);
  assertIntegrity(manifest.manifestVersion === "flowme-strict-review-input-manifest-v2", "Review manifest version mismatch");
  assertIntegrity(manifest.laneId === laneId && manifest.round === round, "Review manifest lane/round mismatch");
  assertIntegrity(manifest.baseFreezeSha256 === freezeEvidence.baseFreezeSha256, "Review manifest base-freeze binding mismatch");
  assertIntegrity(
    manifest.revisionFreezeSha256 === freezeEvidence.revisionFreezeSha256,
    "Review manifest revision-freeze binding mismatch",
  );
  assertIntegrity(
    manifest.automatedValidationFile === relativePath(automatedEvidence.validationPath),
    "Review manifest automated-validation path mismatch",
  );
  assertIntegrity(
    manifest.automatedValidationSha256 === automatedEvidence.validationSha256,
    "Review manifest automated-validation hash mismatch",
  );
  assertIntegrity(
    sameArray(manifest.entries?.map((entry) => entry.batchRef), reviewBatchRefs),
    "Review manifest must contain exactly ordered batch-a/b/c",
  );

  const rubricPath = path.join(specDir, "review-rubric.md");
  const reviewSchemaPath = path.join(specDir, "review-result-schema-v2.json");
  const rubric = await verifyFileSha256(rubricPath, manifest.rubricSha256, "Review rubric");
  const reviewSchema = await verifyFileSha256(
    reviewSchemaPath,
    manifest.reviewSchemaSha256,
    "Review result schema",
  );
  assertIntegrity(
    manifest.rubricSha256 === freezeEvidence.freeze.bindings.rubricSha256,
    "Review manifest rubric is not bound by the base freeze",
  );
  assertIntegrity(
    manifest.reviewSchemaSha256 === freezeEvidence.freeze.bindings.reviewSchemaSha256,
    "Review manifest schema is not bound by the base freeze",
  );

  const { value: cases } = await readJson(path.join(specDir, "cases-v2.json"));
  const { value: protocol } = await readJson(path.join(specDir, "protocol-v2.json"));
  const caseByAuditId = new Map(cases.cases.map((entry) => [entry.auditCaseId, entry]));
  const inputBySampleRef = new Map();
  const runByBatchRef = new Map();
  const runRawByBatchRef = new Map();
  const generatorAgentTaskIds = [];
  const seenSamples = new Set();

  for (const [batchIndex, batchRef] of reviewBatchRefs.entries()) {
    const entry = manifest.entries[batchIndex];
    const expectedAuditIds = protocol.batchAssignment?.[batchRef];
    assertIntegrity(
      Array.isArray(expectedAuditIds) && expectedAuditIds.length === 4,
      `${batchRef} protocol assignment is not four ordered cases`,
    );
    const expectedRunPath = path.join(auditDir, "runs", round, `${batchRef}.json`);
    assertIntegrity(
      entry.runEnvelopeFile === relativePath(expectedRunPath),
      `${batchRef} review manifest run path mismatch`,
    );
    const runRaw = await verifyFileSha256(
      expectedRunPath,
      entry.runEnvelopeSha256,
      `${round} ${batchRef} run envelope`,
    );
    const run = JSON.parse(runRaw);
    assertIntegrity(run.round === round && run.batchRef === batchRef, `${batchRef} run envelope identity mismatch`);
    assertIntegrity(
      sameArray(run.outputs?.map((output) => output.auditCaseId), expectedAuditIds),
      `${batchRef} run outputs are not in frozen protocol order`,
    );
    assertIntegrity(typeof run.executor?.agentTaskId === "string", `${batchRef} generator agent ID missing`);
    generatorAgentTaskIds.push(run.executor.agentTaskId);
    runByBatchRef.set(batchRef, run);
    runRawByBatchRef.set(batchRef, runRaw);

    const positiveOutputs = run.outputs.filter((output) => output.modelInvoked);
    const expectedPositiveCases = expectedAuditIds
      .map((auditCaseId) => caseByAuditId.get(auditCaseId))
      .filter((strictCase) => strictCase?.generatorInput);
    const expectedSampleRefs = expectedPositiveCases.map((strictCase) => strictCase.sampleRef);
    assertIntegrity(
      sameArray(positiveOutputs.map((output) => output.sampleRef), expectedSampleRefs),
      `${batchRef} positive output order mismatch`,
    );
    assertIntegrity(entry.inputCount === expectedSampleRefs.length, `${batchRef} review input count mismatch`);
    assertIntegrity(sameArray(entry.sampleRefs, expectedSampleRefs), `${batchRef} review sample order mismatch`);
    for (const field of [
      "reviewInputFileBySampleRef",
      "reviewInputFileSha256BySampleRef",
      "reviewInputSha256BySampleRef",
      "proposalFingerprintBySampleRef",
    ]) {
      assertIntegrity(
        sameArray(Object.keys(entry[field] ?? {}), expectedSampleRefs),
        `${batchRef} ${field} keys are not in exact sample order`,
      );
    }

    const reviewCases = [];
    for (let index = 0; index < expectedPositiveCases.length; index += 1) {
      const strictCase = expectedPositiveCases[index];
      const output = positiveOutputs[index];
      const sampleRef = strictCase.sampleRef;
      assertIntegrity(!seenSamples.has(sampleRef), `Duplicate review sample ${sampleRef}`);
      seenSamples.add(sampleRef);
      const expectedInputPath = path.join(auditDir, "review-inputs", round, `${sampleRef}.json`);
      assertIntegrity(
        entry.reviewInputFileBySampleRef[sampleRef] === relativePath(expectedInputPath),
        `${sampleRef} review input path mismatch`,
      );
      const inputRaw = await verifyFileSha256(
        expectedInputPath,
        entry.reviewInputFileSha256BySampleRef[sampleRef],
        `${sampleRef} review input bytes`,
      );
      const reviewCase = JSON.parse(inputRaw);
      const expectedCore = {
        sampleRef,
        sourceOwnership: strictCase.generatorInput.sourceOwnership,
        sourceRows: strictCase.generatorInput.sourceRows,
        proposal: output.proposal,
      };
      const expectedInputSha256 = canonicalSha256(expectedCore);
      const expectedProposalFingerprint = canonicalSha256(output.proposal);
      assertIntegrity(
        canonicalSha256({
          sampleRef: reviewCase.sampleRef,
          sourceOwnership: reviewCase.sourceOwnership,
          sourceRows: reviewCase.sourceRows,
          proposal: reviewCase.proposal,
        }) === expectedInputSha256,
        `${sampleRef} review input content differs from frozen case/run evidence`,
      );
      assertIntegrity(
        reviewCase.reviewInputSha256 === expectedInputSha256 &&
          entry.reviewInputSha256BySampleRef[sampleRef] === expectedInputSha256,
        `${sampleRef} review input semantic hash mismatch`,
      );
      assertIntegrity(
        reviewCase.proposalFingerprint === expectedProposalFingerprint &&
          entry.proposalFingerprintBySampleRef[sampleRef] === expectedProposalFingerprint,
        `${sampleRef} proposal fingerprint mismatch`,
      );
      inputBySampleRef.set(sampleRef, reviewCase);
      reviewCases.push(reviewCase);
    }

    const expectedTaskPath = path.join(auditDir, "review-task-payloads", round, `${batchRef}.txt`);
    assertIntegrity(
      entry.taskPayloadFile === relativePath(expectedTaskPath),
      `${batchRef} review task path mismatch`,
    );
    const taskRaw = await verifyFileSha256(
      expectedTaskPath,
      entry.exactTaskPayloadSha256,
      `${batchRef} review task bytes`,
    );
    assertIntegrity(
      taskRaw === reviewTaskPayload(rubric, reviewSchema, reviewCases),
      `${batchRef} review task bytes do not match current frozen inputs`,
    );
  }

  assertIntegrity(seenSamples.size === 10, `Review manifest must bind exactly 10 positives, received ${seenSamples.size}`);
  await assertExactDirectoryFiles(
    path.join(auditDir, "review-inputs", round),
    ["manifest.json", ...[...seenSamples].map((sampleRef) => `${sampleRef}.json`)],
    `${round} review-input directory`,
  );
  await assertExactDirectoryFiles(
    path.join(auditDir, "review-task-payloads", round),
    reviewBatchRefs.map((batchRef) => `${batchRef}.txt`),
    `${round} review-task directory`,
  );
  return {
    freezeEvidence,
    manifest,
    manifestRaw,
    manifestSha256: sha256(manifestRaw),
    inputBySampleRef,
    runByBatchRef,
    runRawByBatchRef,
    generatorAgentTaskIds,
    automated,
    automatedValidationPath: automatedEvidence.validationPath,
    automatedValidationRaw: automatedEvidence.validationRaw,
    automatedValidationSha256: automatedEvidence.validationSha256,
  };
}

export async function buildStrictReviewInputs(argv) {
  const { round } = parseArgs(argv);
  const freezeEvidence = await verifyStrictReviewFreezeIntegrity({ round });
  const automatedEvidence = await verifyAutomatedValidationEvidence(round);
  const { value: cases } = await readJson(path.join(specDir, "cases-v2.json"));
  const rubric = await readText(path.join(specDir, "review-rubric.md"));
  const reviewSchema = await readText(path.join(specDir, "review-result-schema-v2.json"));
  const caseByAuditId = new Map(cases.cases.map((entry) => [entry.auditCaseId, entry]));
  const inputRoot = path.join(auditDir, "review-inputs", round);
  const taskRoot = path.join(auditDir, "review-task-payloads", round);
  const entries = [];

  for (const batchRef of reviewBatchRefs) {
    const runPath = path.join(auditDir, "runs", round, `${batchRef}.json`);
    const { raw: runRaw, value: run } = await readJson(runPath);
    const reviewCases = [];
    const reviewInputFileBySampleRef = {};
    const reviewInputFileSha256BySampleRef = {};
    for (const output of run.outputs.filter((entry) => entry.modelInvoked)) {
      const strictCase = caseByAuditId.get(output.auditCaseId);
      if (!strictCase?.generatorInput) throw new Error(`Review input missing positive case: ${output.auditCaseId}`);
      const core = {
        sampleRef: strictCase.sampleRef,
        sourceOwnership: strictCase.generatorInput.sourceOwnership,
        sourceRows: strictCase.generatorInput.sourceRows,
        proposal: output.proposal,
      };
      const reviewInputSha256 = canonicalSha256(core);
      const proposalFingerprint = canonicalSha256(output.proposal);
      const reviewCase = { ...core, reviewInputSha256, proposalFingerprint };
      const filePath = path.join(inputRoot, `${strictCase.sampleRef}.json`);
      const reviewCaseRaw = `${JSON.stringify(reviewCase, null, 2)}\n`;
      await writeOnceOrVerify(filePath, reviewCaseRaw);
      reviewInputFileBySampleRef[strictCase.sampleRef] = relativePath(filePath);
      reviewInputFileSha256BySampleRef[strictCase.sampleRef] = sha256(reviewCaseRaw);
      reviewCases.push(reviewCase);
    }
    const taskRaw = reviewTaskPayload(rubric, reviewSchema, reviewCases);
    const taskPath = path.join(taskRoot, `${batchRef}.txt`);
    await writeOnceOrVerify(taskPath, taskRaw);
    entries.push({
      batchRef,
      runEnvelopeFile: relativePath(runPath),
      runEnvelopeSha256: sha256(runRaw),
      inputCount: reviewCases.length,
      sampleRefs: reviewCases.map((entry) => entry.sampleRef),
      taskPayloadFile: relativePath(taskPath),
      exactTaskPayloadSha256: sha256(taskRaw),
      reviewInputFileBySampleRef,
      reviewInputFileSha256BySampleRef,
      reviewInputSha256BySampleRef: Object.fromEntries(
        reviewCases.map((entry) => [entry.sampleRef, entry.reviewInputSha256]),
      ),
      proposalFingerprintBySampleRef: Object.fromEntries(
        reviewCases.map((entry) => [entry.sampleRef, entry.proposalFingerprint]),
      ),
    });
  }
  const manifest = {
    manifestVersion: "flowme-strict-review-input-manifest-v2",
    laneId,
    round,
    baseFreezeSha256: freezeEvidence.baseFreezeSha256,
    revisionFreezeSha256: freezeEvidence.revisionFreezeSha256,
    automatedValidationFile: relativePath(automatedEvidence.validationPath),
    automatedValidationSha256: automatedEvidence.validationSha256,
    rubricSha256: freezeEvidence.freeze.bindings.rubricSha256,
    reviewSchemaSha256: freezeEvidence.freeze.bindings.reviewSchemaSha256,
    entries,
  };
  const manifestPath = path.join(inputRoot, "manifest.json");
  await writeOnceOrVerify(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await verifyReviewManifestArtifacts({ round });
  return {
    round,
    reviewCaseCount: entries.reduce((sum, entry) => sum + entry.inputCount, 0),
    taskPayloadCount: entries.length,
    manifestPath: relativePath(manifestPath),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildStrictReviewInputs(process.argv.slice(2))
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
