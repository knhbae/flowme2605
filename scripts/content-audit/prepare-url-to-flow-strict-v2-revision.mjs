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
import { taskPayload } from "./build-url-to-flow-strict-v2.mjs";
import { deriveDefectSelection } from "./record-url-to-flow-strict-v2-defect-selection.mjs";

const revisionPattern = /<!-- DEFECT_REVISION_START -->[\s\S]*?<!-- DEFECT_REVISION_END -->/gu;

async function writeOnceOrVerify(filePath, value) {
  if (await exists(filePath)) {
    if ((await readText(filePath)) !== value) {
      throw new Error(`Revision artifact differs: ${relativePath(filePath)}`);
    }
    return;
  }
  await writeText(filePath, value);
}

function exactRevisedPrompt(basePrompt, instruction) {
  const matches = [...basePrompt.matchAll(revisionPattern)];
  if (matches.length !== 1) {
    throw new Error(`Base prompt must contain exactly one revision block, found ${matches.length}`);
  }
  const block = [
    "<!-- DEFECT_REVISION_START -->",
    instruction,
    "<!-- DEFECT_REVISION_END -->",
  ].join("\n");
  const revised = basePrompt.replaceAll("v2.0", "v2.1").replace(revisionPattern, block);
  if (revised.includes("v2.0")) throw new Error("Revised prompt must contain zero v2.0 occurrences");
  if (!revised.includes("url-to-flow-prompt-v2.1")) {
    throw new Error("Revised prompt must declare url-to-flow-prompt-v2.1");
  }
  return revised;
}

function collectCanonicalTokens(priorCases, priorExpected) {
  const tokens = new Set();
  for (const entry of priorCases.cases ?? []) {
    tokens.add(entry.caseId);
    tokens.add(entry.requestId);
    const input = entry.generatorInput;
    if (input) {
      tokens.add(input.caseId);
      tokens.add(input.requestId);
      tokens.add(input.sourceOwnership.primarySourceId);
      for (const value of input.sourceOwnership.supportingSourceIds ?? []) tokens.add(value);
      for (const row of input.sourceRows ?? []) {
        tokens.add(row.sourceRowId);
        tokens.add(row.sourceId);
      }
    }
  }
  for (const entry of priorExpected.cases ?? []) {
    for (const source of entry.opaqueMapping?.sources ?? []) tokens.add(source.canonicalId);
    for (const row of entry.opaqueMapping?.sourceRows ?? []) tokens.add(row.canonicalId);
  }
  return [...tokens].filter(Boolean).sort((left, right) => right.length - left.length);
}

function scanForbiddenKeys(value, forbiddenKeys, nodePath = "$", findings = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      scanForbiddenKeys(entry, forbiddenKeys, `${nodePath}[${index}]`, findings),
    );
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) {
        findings.push({ code: "forbidden_key", path: `${nodePath}.${key}` });
      }
      scanForbiddenKeys(child, forbiddenKeys, `${nodePath}.${key}`, findings);
    }
  }
  return findings;
}

export async function prepareStrictRevision() {
  const baseIntegrity = await assertBaseFreezeIntegrity();
  const selectionPath = path.join(auditDir, "runs", "round-1", "defect-selection.json");
  const { raw: selectionRaw, value: selection } = await readJson(selectionPath);
  const reviewValidationPath = path.join(auditDir, "reviews", "round-1", "validation.json");
  const automatedValidationPath = path.join(auditDir, "runs", "round-1", "validation.json");
  const { raw: automatedValidationRaw, value: automatedValidation } = await readJson(
    automatedValidationPath,
  );
  if (selection.round1AutomatedValidationSha256 !== sha256(automatedValidationRaw)) {
    throw new Error("Defect selection is not bound to frozen Round 1 automated validation");
  }
  let reviewValidationRaw = null;
  let reviewValidation = null;
  if (selection.reviewNotRunReason === "run_validation_failed") {
    if (selection.round1ReviewValidationSha256 !== null) {
      throw new Error("A skipped Round 1 review must have a null review-validation hash");
    }
    if (automatedValidation.passed || selection.round1PassedAllGates !== false) {
      throw new Error("A skipped Round 1 review requires a failed automated run and failed gates");
    }
    if (await exists(reviewValidationPath)) {
      throw new Error("Round 1 review appeared after a frozen run-validation failure selection");
    }
  } else {
    ({ raw: reviewValidationRaw, value: reviewValidation } = await readJson(reviewValidationPath));
    if (selection.round1ReviewValidationSha256 !== sha256(reviewValidationRaw)) {
      throw new Error("Defect selection is not bound to frozen Round 1 blind review");
    }
  }
  const { value: protocol } = await readJson(path.join(specDir, "protocol-v2.json"));
  const derivedSelection = deriveDefectSelection({
    protocol,
    automatedValidation,
    automatedRaw: automatedValidationRaw,
    automatedValidationPath,
    reviewValidation,
    reviewRaw: reviewValidationRaw,
  });
  if (canonicalSha256(selection) !== canonicalSha256(derivedSelection)) {
    throw new Error("Defect selection does not equal the deterministic selection derived from Round 1 evidence");
  }
  if (selection.action !== "prompt_one_defect_revision" || !selection.revisionClass) {
    throw new Error("Revision preparation requires one automatically selected prompt defect class");
  }

  const priority = protocol.promptRevision?.classPriority ?? [];
  const instruction = protocol.promptRevision?.classTemplates?.[selection.revisionClass];
  if (!priority.includes(selection.revisionClass) || typeof instruction !== "string") {
    throw new Error("Selected revision class is not in the frozen protocol taxonomy");
  }
  if (
    JSON.stringify(selection.classPriority) !== JSON.stringify(priority) ||
    selection.triggeredRevisionClasses?.[0] !== selection.revisionClass
  ) {
    throw new Error("Defect selection does not follow the frozen class priority");
  }
  if (selection.revisionInstructionSha256 !== sha256(instruction)) {
    throw new Error("Defect selection instruction hash does not match the protocol template");
  }

  const basePrompt = await readText(path.join(specDir, "prompt-v2.0.md"));
  const revisedPrompt = exactRevisedPrompt(basePrompt, instruction);
  const revisedPromptPath = path.join(specDir, "prompt-v2.1.md");
  await writeOnceOrVerify(revisedPromptPath, revisedPrompt);

  const { value: cases } = await readJson(path.join(specDir, "cases-v2.json"));
  const { raw: schemaRaw } = await readJson(path.join(specDir, "proposal-schema-v2.json"));
  const { raw: freezeRaw, value: freeze } = await readJson(
    path.join(specDir, "freeze-manifest.json"),
  );
  if (sha256(freezeRaw) !== baseIntegrity.freezeSha256) {
    throw new Error("Base freeze changed during revision preparation");
  }

  const entries = [];
  const taskRoot = path.join(auditDir, "task-payloads", "v2.1");
  for (const [batchRef, auditCaseIds] of Object.entries(protocol.batchAssignment)) {
    const batchCases = auditCaseIds.map((auditCaseId) =>
      cases.cases.find((entry) => entry.auditCaseId === auditCaseId),
    );
    if (batchCases.some((entry) => !entry)) throw new Error(`Unknown case in ${batchRef}`);
    const positiveInputs = batchCases
      .filter((entry) => entry.generatorInput)
      .map((entry) => entry.generatorInput);
    const raw = taskPayload(revisedPrompt, schemaRaw, positiveInputs);
    const filePath = path.join(taskRoot, `${batchRef}.txt`);
    await writeOnceOrVerify(filePath, raw);
    entries.push({
      batchRef,
      file: relativePath(filePath),
      taskPayloadSha256: sha256(raw),
      pipelineCaseCount: auditCaseIds.length,
      modelInputCaseCount: positiveInputs.length,
      deterministicCaseCount: auditCaseIds.length - positiveInputs.length,
      auditCaseIds,
      sampleRefs: batchCases.map((entry) => entry.sampleRef),
      packetSha256BySampleRef: Object.fromEntries(
        positiveInputs.map((input) => [
          input.sampleRef,
          freeze.packetSha256BySampleRef[input.sampleRef],
        ]),
      ),
    });
  }
  const taskManifest = {
    manifestVersion: "flowme-strict-generator-task-manifest-v2",
    laneId,
    promptVersion: "url-to-flow-prompt-v2.1",
    taskPayloads: entries,
  };
  const taskManifestPath = path.join(taskRoot, "manifest.json");
  await writeOnceOrVerify(taskManifestPath, `${JSON.stringify(taskManifest, null, 2)}\n`);

  const priorSpecDir = path.join(
    repoRoot,
    "docs/specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
  );
  const { value: priorCases } = await readJson(path.join(priorSpecDir, "cases-v1.json"));
  const { value: priorExpected } = await readJson(path.join(priorSpecDir, "expected-v1.json"));
  const canonicalTokens = collectCanonicalTokens(priorCases, priorExpected);
  const forbiddenKeys = new Set([
    "caseId",
    "userJob",
    "expectedConversion",
    "expectedStatus",
    "fixtureName",
    "sourceTitle",
    "sourceUrl",
    "publisher",
    "targetLocale",
    "countryContext",
    "riskClass",
    "rightsStatus",
    "accessStatus",
  ]);
  const leakageFindings = [];
  let revisedTaskV2_0OccurrenceCount = 0;
  for (const entry of entries) {
    const taskRaw = await readText(path.join(repoRoot, entry.file));
    const staleVersionCount = (taskRaw.match(/v2\.0/gu) ?? []).length;
    revisedTaskV2_0OccurrenceCount += staleVersionCount;
    if (staleVersionCount > 0) {
      leakageFindings.push({
        batchRef: entry.batchRef,
        surface: "revised_exact_task_payload",
        code: "stale_v2_0_occurrence",
        count: staleVersionCount,
      });
    }
    for (const token of canonicalTokens) {
      if (taskRaw.includes(token)) {
        leakageFindings.push({
          batchRef: entry.batchRef,
          surface: "revised_exact_task_payload",
          code: "canonical_token",
          token,
        });
      }
    }
    if (/case-[0-9]{2}/u.test(taskRaw)) {
      leakageFindings.push({
        batchRef: entry.batchRef,
        surface: "revised_exact_task_payload",
        code: "canonical_case_pattern",
      });
    }
    const auditCaseIds = protocol.batchAssignment[entry.batchRef];
    const positiveInputs = auditCaseIds
      .map((auditCaseId) => cases.cases.find((item) => item.auditCaseId === auditCaseId))
      .filter((item) => item.generatorInput)
      .map((item) => item.generatorInput);
    for (const finding of scanForbiddenKeys(positiveInputs, forbiddenKeys)) {
      leakageFindings.push({
        batchRef: entry.batchRef,
        surface: "revised_generator_input",
        ...finding,
      });
    }
  }
  const leakageReport = {
    reportVersion: "flowme-strict-revision-leakage-report-v2.1",
    laneId,
    promptVersion: "url-to-flow-prompt-v2.1",
    exactTaskPayloadCount: entries.length,
    promptV2_0OccurrenceCount: (revisedPrompt.match(/v2\.0/gu) ?? []).length,
    exactTaskV2_0OccurrenceCount: revisedTaskV2_0OccurrenceCount,
    forbiddenSemanticFieldCount: leakageFindings.length,
    passed:
      leakageFindings.length === 0 &&
      !revisedPrompt.includes("v2.0") &&
      revisedTaskV2_0OccurrenceCount === 0 &&
      revisedPrompt.includes("url-to-flow-prompt-v2.1"),
    findings: leakageFindings,
  };
  const leakagePath = path.join(auditDir, "revision-leakage-report-v2.1.json");
  await writeOnceOrVerify(leakagePath, `${JSON.stringify(leakageReport, null, 2)}\n`);
  if (!leakageReport.passed) {
    throw new Error(`Revised task leakage preflight failed: ${JSON.stringify(leakageFindings)}`);
  }

  const revisionFreeze = {
    revisionFreezeVersion: "flowme-url-to-flow-strict-revision-freeze-v2.1",
    laneId,
    frozenBeforeRound2: true,
    revisionClass: selection.revisionClass,
    revisionInstructionSha256: sha256(instruction),
    defectSelectionSha256: sha256(selectionRaw),
    baseFreezeSha256: sha256(freezeRaw),
    basePromptTemplateSha256: freeze.bindings.promptTemplateSha256,
    promptTemplateSha256: sha256(revisedPrompt),
    taskPayloadManifestSha256: sha256(await readText(taskManifestPath)),
    leakageReportSha256: sha256(await readText(leakagePath)),
    exactTaskPayloadSha256ByBatch: Object.fromEntries(
      entries.map((entry) => [entry.batchRef, entry.taskPayloadSha256]),
    ),
    unchangedBindings: {
      protocolSha256: freeze.bindings.protocolSha256,
      caseSetSha256: freeze.bindings.caseSetSha256,
      caseSetSemanticSha256: freeze.bindings.caseSetSemanticSha256,
      opaqueMapSha256: freeze.bindings.opaqueMapSha256,
      schemaSha256: freeze.bindings.schemaSha256,
      rubricSha256: freeze.bindings.rubricSha256,
      reviewSchemaSha256: freeze.bindings.reviewSchemaSha256,
      packetManifestSha256: freeze.bindings.packetManifestSha256,
      deterministicNegativesSha256: freeze.bindings.deterministicNegativesSha256,
      leakageReportSha256: freeze.bindings.leakageReportSha256,
      canonicalPriorCasesSha256: freeze.bindings.canonicalPriorCasesSha256,
      canonicalPriorExpectedSha256: freeze.bindings.canonicalPriorExpectedSha256,
    },
  };
  const revisionFreezePath = path.join(specDir, "revision-freeze-v2.1.json");
  await writeOnceOrVerify(
    revisionFreezePath,
    `${JSON.stringify(revisionFreeze, null, 2)}\n`,
  );
  await assertRevisionFreezeIntegrity(revisionFreeze);
  return {
    revisionClass: selection.revisionClass,
    promptTemplateSha256: revisionFreeze.promptTemplateSha256,
    taskPayloadManifestSha256: revisionFreeze.taskPayloadManifestSha256,
    leakageReportSha256: revisionFreeze.leakageReportSha256,
    revisionFreezePath: relativePath(revisionFreezePath),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  prepareStrictRevision()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
