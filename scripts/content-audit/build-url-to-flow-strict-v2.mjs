import path from "node:path";
import { fileURLToPath } from "node:url";
import {
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

const priorSpecDir = path.join(
  repoRoot,
  "docs/specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
);
const priorCasesPath = path.join(priorSpecDir, "cases-v1.json");
const priorExpectedPath = path.join(priorSpecDir, "expected-v1.json");
const promptPath = path.join(specDir, "prompt-v2.0.md");
const schemaPath = path.join(specDir, "proposal-schema-v2.json");
const rubricPath = path.join(specDir, "review-rubric.md");
const reviewSchemaPath = path.join(specDir, "review-result-schema-v2.json");
const protocolPath = path.join(specDir, "protocol-v2.json");
const casesPath = path.join(specDir, "cases-v2.json");
const hiddenMapPath = path.join(specDir, "hidden-map-v2.json");
const lanePath = path.join(specDir, "lane.json");
const schemaProfilePath = path.join(specDir, "schema-profile-v2.json");
const freezePath = path.join(specDir, "freeze-manifest.json");
const packetDir = path.join(auditDir, "packets", "v2.0");
const taskPayloadDir = path.join(auditDir, "task-payloads", "v2.0");

const opaque = (prefix, ...parts) =>
  `${prefix}-${sha256(`flowme-strict-v2-opaque|${parts.join("|")}`).slice(0, 16)}`;
const sameArray = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

async function writeOnceOrVerify(filePath, value) {
  const normalized = String(value).replaceAll("\r\n", "\n");
  if (await exists(filePath)) {
    const current = await readText(filePath);
    if (current !== normalized) {
      throw new Error(`Frozen artifact differs and will not be overwritten: ${relativePath(filePath)}`);
    }
    return "verified";
  }
  await writeText(filePath, normalized);
  return "created";
}

async function writeJsonOnce(filePath, value) {
  return writeOnceOrVerify(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function objectSchemaProfile(schema) {
  const objects = [];
  const visit = (node, nodePath) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "object") objects.push({ nodePath, node });
    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === "object") visit(value, `${nodePath}.${key}`);
    }
  };
  visit(schema, "$schema");
  const strictFailures = objects
    .filter(({ node }) => node.additionalProperties !== false)
    .map(({ nodePath }) => nodePath);
  const requiredFailures = [];
  let declaredProperties = 0;
  for (const { nodePath, node } of objects) {
    const properties = Object.keys(node.properties ?? {});
    declaredProperties += properties.length;
    const required = new Set(node.required ?? []);
    for (const property of properties) {
      if (!required.has(property)) requiredFailures.push(`${nodePath}.${property}`);
    }
  }
  return {
    objectSchemaCount: objects.length,
    declaredProperties,
    serializedBytes: Buffer.byteLength(`${JSON.stringify(schema, null, 2)}\n`, "utf8"),
    strictFailures,
    requiredFailures,
  };
}

function semanticCaseView(priorCase) {
  const input = priorCase.generatorInput;
  if (!input) {
    return {
      modelInvoked: false,
      negative: {
        generationState: priorCase.preflightResult.generationState,
        outcome: priorCase.preflightResult.outcome,
        errorCode: priorCase.preflightResult.errorCode,
        disposition: priorCase.preflightResult.recommendedDisposition,
      },
    };
  }
  return {
    modelInvoked: true,
    maxItems: input.maxItems,
    sourceRows: input.sourceRows.map((row) => ({
      sourceRole:
        row.sourceId === input.sourceOwnership.primarySourceId ? "primary" : "supporting",
      rowType: row.rowType,
      title: row.title,
      detail: row.detail,
      order: row.order,
    })),
  };
}

function deterministicProposal(entry) {
  const reason = entry.preflightResult.errorCode;
  return {
    schemaVersion: "flowme-semantic-proposal-v2",
    promptVersion: "deterministic-preflight-v2",
    requestRef: entry.requestRef,
    sampleRef: entry.sampleRef,
    result: {
      state: "blocked",
      reasonCode: reason,
      disposition: entry.preflightResult.recommendedDisposition,
      primaryArtifact: null,
    },
    items: [],
    omittedRows: [],
    projections: [],
    review: {
      uncertaintyCodes: [],
      humanCheckRowRefs: [],
    },
  };
}

export function taskPayload(prompt, schema, generatorInputs) {
  return [
    "You are an isolated model-proxy generator. Use only the inline payload below.",
    "Do not inspect files, tools, prior conversation, external sources, or hidden expectations.",
    "Apply PROMPT_TEMPLATE independently to each CASE_INPUT_JSON object.",
    "Return exactly one bare JSON array in the same order, with one proposal object per input.",
    "Do not use Markdown fences, commentary, repair notes, or additional wrapper keys.",
    "",
    "<PROMPT_TEMPLATE>",
    prompt.trimEnd(),
    "</PROMPT_TEMPLATE>",
    "",
    "<PROPOSAL_SCHEMA_JSON>",
    schema.trimEnd(),
    "</PROPOSAL_SCHEMA_JSON>",
    "",
    "<CASE_INPUTS_JSON>",
    JSON.stringify(generatorInputs, null, 2),
    "</CASE_INPUTS_JSON>",
    "",
  ].join("\n");
}

function collectCanonicalTokens(priorCases, priorExpected) {
  const tokens = new Set();
  for (const entry of priorCases.cases) {
    tokens.add(entry.caseId);
    tokens.add(entry.requestId);
    const input = entry.generatorInput;
    if (input) {
      tokens.add(input.caseId);
      tokens.add(input.requestId);
      tokens.add(input.sourceOwnership.primarySourceId);
      input.sourceOwnership.supportingSourceIds.forEach((value) => tokens.add(value));
      input.sourceRows.forEach((row) => {
        tokens.add(row.sourceRowId);
        tokens.add(row.sourceId);
      });
    }
  }
  for (const entry of priorExpected.cases) {
    for (const source of entry.opaqueMapping.sources) tokens.add(source.canonicalId);
    for (const row of entry.opaqueMapping.sourceRows) tokens.add(row.canonicalId);
  }
  return [...tokens].filter(Boolean).sort((left, right) => right.length - left.length);
}

export async function buildStrictV2() {
  const { raw: priorCasesRaw, value: priorCases } = await readJson(priorCasesPath);
  const { raw: priorExpectedRaw, value: priorExpected } = await readJson(priorExpectedPath);
  const prompt = await readText(promptPath);
  const { raw: schemaRaw, value: schema } = await readJson(schemaPath);
  const rubric = await readText(rubricPath);
  const reviewSchemaRaw = await readText(reviewSchemaPath);
  const protocolRaw = await readText(protocolPath);
  const protocol = JSON.parse(protocolRaw);

  if (sha256(priorCasesRaw) !== protocol.canonicalPriorBindings.casesV1Sha256) {
    throw new Error("Prior corrected case set differs from the preregistered canonical hash");
  }
  if (sha256(priorExpectedRaw) !== protocol.canonicalPriorBindings.expectedV1Sha256) {
    throw new Error("Prior hidden oracle differs from the preregistered canonical hash");
  }

  if (priorCases.cases.length !== 12) throw new Error("Canonical prior case count must remain 12");
  const priorExpectedByCase = new Map(priorExpected.cases.map((entry) => [entry.caseId, entry]));
  const strictCases = [];
  const hiddenMappings = [];

  for (const priorCase of priorCases.cases) {
    const hidden = priorExpectedByCase.get(priorCase.caseId);
    if (!hidden) throw new Error(`Missing hidden mapping for ${priorCase.caseId}`);
    const sampleRef = opaque("smp", priorCase.caseId);
    const requestRef = opaque("req", priorCase.requestId);
    const sourceMap = new Map(
      hidden.opaqueMapping.sources.map((source) => [
        source.opaqueId,
        opaque("src", priorCase.caseId, source.opaqueId),
      ]),
    );
    const rowMap = new Map(
      hidden.opaqueMapping.sourceRows.map((row) => [
        row.opaqueId,
        opaque("row", priorCase.caseId, row.opaqueId),
      ]),
    );
    const oldInput = priorCase.generatorInput;
    const generatorInput = oldInput
      ? {
          requestRef,
          sampleRef,
          maxItems: oldInput.maxItems,
          sourceOwnership: {
            primarySourceRef: sourceMap.get(oldInput.sourceOwnership.primarySourceId),
            supportingSourceRefs: oldInput.sourceOwnership.supportingSourceIds.map((value) =>
              sourceMap.get(value),
            ),
          },
          sourceRows: oldInput.sourceRows.map((row) => ({
            sourceRowRef: rowMap.get(row.sourceRowId),
            sourceRef: sourceMap.get(row.sourceId),
            rowType: row.rowType,
            title: row.title,
            detail: row.detail,
            order: row.order,
          })),
        }
      : null;
    const strictCase = {
      auditCaseId: priorCase.caseId,
      requestRef,
      sampleRef,
      preflightInput: priorCase.preflightInput,
      preflightResult: {
        passed: priorCase.preflightResult.passed,
        modelInvoked: priorCase.preflightResult.modelInvoked,
        generationState: priorCase.preflightResult.generationState,
        outcome: priorCase.preflightResult.outcome,
        errorCode: priorCase.preflightResult.errorCode,
        recommendedDisposition: priorCase.preflightResult.recommendedDisposition,
        reasonCode: priorCase.preflightResult.reasonCode,
      },
      generatorInput,
      semanticLineageSha256: canonicalSha256(semanticCaseView(priorCase)),
    };
    strictCases.push(strictCase);
    hiddenMappings.push({
      auditCaseId: priorCase.caseId,
      priorRequestId: priorCase.requestId,
      requestRef,
      sampleRef,
      sources: hidden.opaqueMapping.sources.map((source) => ({
        priorOpaqueId: source.opaqueId,
        canonicalId: source.canonicalId,
        role: source.role,
        strictOpaqueRef: sourceMap.get(source.opaqueId),
      })),
      sourceRows: hidden.opaqueMapping.sourceRows.map((row) => ({
        priorOpaqueId: row.opaqueId,
        canonicalId: row.canonicalId,
        strictOpaqueRef: rowMap.get(row.opaqueId),
      })),
    });
  }

  const semanticCaseSet = strictCases.map((entry) => ({
    auditCaseId: entry.auditCaseId,
    semanticLineageSha256: entry.semanticLineageSha256,
    modelInvoked: entry.preflightResult.modelInvoked,
  }));
  const caseDocument = {
    caseSetVersion: "flowme-url-to-flow-strict-cases-v2",
    laneId,
    canonicalSource: relativePath(priorCasesPath),
    canonicalSourceSha256: sha256(priorCasesRaw),
    canonicalHiddenOracleSha256: sha256(priorExpectedRaw),
    semanticCaseSetSha256: canonicalSha256(semanticCaseSet),
    cases: strictCases,
  };
  const hiddenDocument = {
    mappingVersion: "flowme-url-to-flow-strict-hidden-map-v2",
    laneId,
    visibility: "controller_validator_only",
    forbiddenFor: ["generator", "blind_reviewer"],
    mappings: hiddenMappings,
  };
  await writeJsonOnce(casesPath, caseDocument);
  await writeJsonOnce(hiddenMapPath, hiddenDocument);

  const packetEntries = [];
  for (const entry of strictCases.filter((item) => item.generatorInput)) {
    const filePath = path.join(packetDir, `${entry.sampleRef}.json`);
    const raw = `${JSON.stringify(entry.generatorInput, null, 2)}\n`;
    await writeOnceOrVerify(filePath, raw);
    packetEntries.push({
      auditCaseId: entry.auditCaseId,
      sampleRef: entry.sampleRef,
      file: relativePath(filePath),
      packetSha256: sha256(raw),
      semanticPayloadSha256: canonicalSha256(entry.generatorInput.sourceRows),
    });
  }
  const packetManifest = {
    manifestVersion: "flowme-strict-packet-manifest-v2",
    laneId,
    promptVersion: "url-to-flow-prompt-v2.0",
    packetCount: packetEntries.length,
    packets: packetEntries,
  };
  const packetManifestPath = path.join(packetDir, "manifest.json");
  await writeJsonOnce(packetManifestPath, packetManifest);

  const batchKeys = Object.keys(protocol.batchAssignment);
  if (!sameArray(batchKeys, ["batch-a", "batch-b", "batch-c"])) {
    throw new Error("Protocol must define exactly batch-a, batch-b, and batch-c in order");
  }
  const assignedAuditIds = batchKeys.flatMap((key) => protocol.batchAssignment[key]);
  if (
    batchKeys.some((key) => protocol.batchAssignment[key].length !== 4) ||
    assignedAuditIds.length !== 12 ||
    new Set(assignedAuditIds).size !== 12 ||
    !sameArray(assignedAuditIds, strictCases.map((entry) => entry.auditCaseId))
  ) {
    throw new Error("Protocol batch assignment must be exact ordered 4+4+4 coverage of 12 cases");
  }
  if (
    strictCases.filter((entry) => entry.generatorInput).length !== 10 ||
    strictCases.filter((entry) => !entry.generatorInput).length !== 2
  ) {
    throw new Error("Strict case set must remain 10 model-positive and 2 deterministic-negative");
  }
  const positiveRows = strictCases
    .filter((entry) => entry.generatorInput)
    .flatMap((entry) => {
      const supportingRefs = new Set(entry.generatorInput.sourceOwnership.supportingSourceRefs);
      return entry.generatorInput.sourceRows.map((row) => ({
        ...row,
        eligible: !supportingRefs.has(row.sourceRef) && row.rowType !== "reference",
      }));
    });
  const eligibleRowCount = positiveRows.filter((row) => row.eligible).length;
  const supportingOrReferenceCount = positiveRows.length - eligibleRowCount;
  if (
    protocol.strictPositiveProfile?.oneEligibleSourceRowPerItem !== true ||
    eligibleRowCount !== protocol.strictPositiveProfile?.itemEligiblePrimarySourceRows ||
    supportingOrReferenceCount !== protocol.strictPositiveProfile?.supportingOrReferenceOnlyRows
  ) {
    throw new Error(
      `Strict positive profile mismatch: ${eligibleRowCount} eligible and ${supportingOrReferenceCount} supporting/reference rows`,
    );
  }
  for (const entry of strictCases.filter((item) => item.generatorInput)) {
    const supportingRefs = new Set(entry.generatorInput.sourceOwnership.supportingSourceRefs);
    const eligibleCount = entry.generatorInput.sourceRows.filter(
      (row) => !supportingRefs.has(row.sourceRef) && row.rowType !== "reference",
    ).length;
    if (eligibleCount > entry.generatorInput.maxItems) {
      throw new Error(`${entry.auditCaseId} cannot satisfy the strict one-row-per-Item profile within maxItems`);
    }
  }
  const artifactPolicyKeys = [
    "literalSchedulePresent",
    "allTableRows",
    "oneResource",
    "multipleResources",
    "oneOtherEligibleRow",
    "multipleOtherEligibleRows",
  ];
  if (
    !protocol.strictArtifactPolicy ||
    !sameArray(Object.keys(protocol.strictArtifactPolicy), artifactPolicyKeys) ||
    !sameArray(
      Object.values(protocol.strictArtifactPolicy),
      ["calendar", "sheet", "memo", "checklist", "todo", "checklist"],
    )
  ) {
    throw new Error("Strict artifact policy must match the preregistered six-branch matrix");
  }
  const revisionPolicy = protocol.promptRevision;
  if (
    !revisionPolicy ||
    !sameArray(Object.keys(revisionPolicy.classTemplates ?? {}), revisionPolicy.classPriority ?? []) ||
    !sameArray(Object.keys(revisionPolicy.classErrorPatterns ?? {}), revisionPolicy.classPriority ?? [])
  ) {
    throw new Error("Prompt revision taxonomy, templates, and error-pattern maps must have the same frozen class order");
  }
  for (const revisionClass of revisionPolicy.classPriority) {
    if (
      typeof revisionPolicy.classTemplates[revisionClass] !== "string" ||
      revisionPolicy.classTemplates[revisionClass].length === 0 ||
      !Array.isArray(revisionPolicy.classErrorPatterns[revisionClass]) ||
      revisionPolicy.classErrorPatterns[revisionClass].length === 0
    ) {
      throw new Error(`Prompt revision class is incomplete: ${revisionClass}`);
    }
    for (const source of revisionPolicy.classErrorPatterns[revisionClass]) new RegExp(source, "u");
  }
  for (const revisionClass of [
    ...Object.values(revisionPolicy.gateClassMap ?? {}),
    ...Object.values(revisionPolicy.reviewTopIssueClassMap ?? {}),
  ]) {
    if (!revisionPolicy.classPriority.includes(revisionClass)) {
      throw new Error(`Prompt revision mapping references an unknown class: ${revisionClass}`);
    }
  }
  const taskPayloads = [];
  for (const [batchRef, auditCaseIds] of Object.entries(protocol.batchAssignment)) {
    const batchCases = auditCaseIds.map((auditCaseId) =>
      strictCases.find((entry) => entry.auditCaseId === auditCaseId),
    );
    if (batchCases.some((entry) => !entry)) throw new Error(`Unknown case in ${batchRef}`);
    const positiveInputs = batchCases
      .filter((entry) => entry.generatorInput)
      .map((entry) => entry.generatorInput);
    const raw = taskPayload(prompt, schemaRaw, positiveInputs);
    const filePath = path.join(taskPayloadDir, `${batchRef}.txt`);
    await writeOnceOrVerify(filePath, raw);
    taskPayloads.push({
      batchRef,
      file: relativePath(filePath),
      taskPayloadSha256: sha256(raw),
      pipelineCaseCount: batchCases.length,
      modelInputCaseCount: positiveInputs.length,
      deterministicCaseCount: batchCases.length - positiveInputs.length,
      auditCaseIds,
      sampleRefs: batchCases.map((entry) => entry.sampleRef),
      packetSha256BySampleRef: Object.fromEntries(
        batchCases
          .filter((entry) => entry.generatorInput)
          .map((entry) => [
            entry.sampleRef,
            packetEntries.find((packet) => packet.sampleRef === entry.sampleRef).packetSha256,
          ]),
      ),
    });
  }
  const taskManifest = {
    manifestVersion: "flowme-strict-generator-task-manifest-v2",
    laneId,
    promptVersion: "url-to-flow-prompt-v2.0",
    taskPayloads,
  };
  if (
    !sameArray(taskPayloads.map((entry) => entry.modelInputCaseCount), [4, 4, 2]) ||
    !sameArray(taskPayloads.map((entry) => entry.deterministicCaseCount), [0, 0, 2])
  ) {
    throw new Error("Strict task batches must preserve the preregistered 4+4+2 model-input split and 0+0+2 deterministic split");
  }
  const taskManifestPath = path.join(taskPayloadDir, "manifest.json");
  await writeJsonOnce(taskManifestPath, taskManifest);

  const deterministicNegatives = {
    resultVersion: "flowme-strict-deterministic-negatives-v2",
    laneId,
    outputs: strictCases
      .filter((entry) => !entry.generatorInput)
      .map((entry) => ({
        auditCaseId: entry.auditCaseId,
        sampleRef: entry.sampleRef,
        requestRef: entry.requestRef,
        modelInvoked: false,
        proposal: deterministicProposal(entry),
      })),
  };
  const deterministicPath = path.join(auditDir, "deterministic-negatives-v2.json");
  await writeJsonOnce(deterministicPath, deterministicNegatives);

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
  const scanJsonKeys = (value, nodePath = "$", findings = []) => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => scanJsonKeys(entry, `${nodePath}[${index}]`, findings));
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (forbiddenKeys.has(key)) findings.push({ code: "forbidden_key", path: `${nodePath}.${key}` });
        scanJsonKeys(child, `${nodePath}.${key}`, findings);
      }
    }
    return findings;
  };
  const leakageFindings = [];
  for (const entry of strictCases.filter((item) => item.generatorInput)) {
    const raw = JSON.stringify(entry.generatorInput);
    for (const finding of scanJsonKeys(entry.generatorInput)) {
      leakageFindings.push({ sampleRef: entry.sampleRef, surface: "packet", ...finding });
    }
    for (const token of canonicalTokens) {
      if (raw.includes(token)) {
        leakageFindings.push({ sampleRef: entry.sampleRef, surface: "packet", code: "canonical_token", token });
      }
    }
  }
  for (const task of taskPayloads) {
    const raw = await readText(path.join(repoRoot, task.file));
    for (const token of canonicalTokens) {
      if (raw.includes(token)) {
        leakageFindings.push({ batchRef: task.batchRef, surface: "exact_task_payload", code: "canonical_token", token });
      }
    }
    if (/case-[0-9]{2}/u.test(raw)) {
      leakageFindings.push({ batchRef: task.batchRef, surface: "exact_task_payload", code: "canonical_case_pattern" });
    }
  }
  const leakageReport = {
    reportVersion: "flowme-strict-leakage-report-v2",
    laneId,
    positivePacketCount: packetEntries.length,
    exactTaskPayloadCount: taskPayloads.length,
    forbiddenSemanticFieldCount: leakageFindings.length,
    passed: leakageFindings.length === 0,
    findings: leakageFindings,
  };
  const leakagePath = path.join(auditDir, "leakage-report.json");
  await writeJsonOnce(leakagePath, leakageReport);
  if (!leakageReport.passed) throw new Error(`Leakage preflight failed with ${leakageFindings.length} findings`);

  const profile = objectSchemaProfile(schema);
  const schemaProfile = {
    profileVersion: "flowme-semantic-proposal-schema-profile-v2",
    schemaVersion: "flowme-semantic-proposal-v2",
    schemaSha256: sha256(schemaRaw),
    limits: {
      objectSchemas: { actual: profile.objectSchemaCount, max: 10, passed: profile.objectSchemaCount <= 10 },
      declaredProperties: { actual: profile.declaredProperties, max: 45, passed: profile.declaredProperties <= 45 },
      serializedBytes: { actual: profile.serializedBytes, max: 12288, passed: profile.serializedBytes <= 12288 },
      strictObjects: { failures: profile.strictFailures, passed: profile.strictFailures.length === 0 },
      allPropertiesRequired: { failures: profile.requiredFailures, passed: profile.requiredFailures.length === 0 },
    },
  };
  schemaProfile.passed = Object.values(schemaProfile.limits).every((entry) => entry.passed);
  await writeJsonOnce(schemaProfilePath, schemaProfile);
  if (!schemaProfile.passed) throw new Error("Schema profile failed compactness or strictness limits");

  const lane = {
    laneVersion: "flowme-url-to-flow-strict-lane-v2",
    laneId,
    status: "authoritative_attempt",
    priorLaneStatus: "failed_experimental_evidence",
    promptVersions: ["url-to-flow-prompt-v2.0"],
    proposalSchemaVersion: "flowme-semantic-proposal-v2",
    reviewPolicyVersion: "flowme-source-row-blind-review-v2",
    evidenceClass: "current_session_model_proxy",
    productionAuthority: false,
  };
  await writeJsonOnce(lanePath, lane);

  const frozenFiles = [
    path.join(specDir, "spec.md"),
    protocolPath,
    promptPath,
    schemaPath,
    rubricPath,
    reviewSchemaPath,
    casesPath,
    hiddenMapPath,
    lanePath,
    schemaProfilePath,
    path.join(repoRoot, "scripts/content-audit/url-to-flow-strict-v2-core.mjs"),
    path.join(repoRoot, "scripts/content-audit/build-url-to-flow-strict-v2.mjs"),
    path.join(repoRoot, "scripts/content-audit/validate-url-to-flow-strict-v2.mjs"),
    path.join(repoRoot, "scripts/content-audit/assemble-url-to-flow-strict-v2-run.mjs"),
    path.join(repoRoot, "scripts/content-audit/build-url-to-flow-strict-v2-review-inputs.mjs"),
    path.join(repoRoot, "scripts/content-audit/assemble-url-to-flow-strict-v2-review.mjs"),
    path.join(repoRoot, "scripts/content-audit/validate-url-to-flow-strict-v2-reviews.mjs"),
    path.join(repoRoot, "scripts/content-audit/prepare-url-to-flow-strict-v2-revision.mjs"),
    path.join(repoRoot, "scripts/content-audit/record-url-to-flow-strict-v2-defect-selection.mjs"),
    path.join(repoRoot, "scripts/content-audit/selftest-url-to-flow-strict-v2.mjs"),
  ];
  for (const filePath of frozenFiles) {
    if (!(await exists(filePath))) throw new Error(`Required frozen file is missing: ${relativePath(filePath)}`);
  }
  const fileHashes = {};
  for (const filePath of frozenFiles) fileHashes[relativePath(filePath)] = sha256(await readText(filePath));

  const freeze = {
    freezeVersion: "flowme-url-to-flow-strict-freeze-v2",
    laneId,
    frozenBeforeRound1: true,
    canonicalization: "recursive-key-sort UTF-8 LF; raw file hashes use UTF-8 LF bytes",
    bindings: {
      protocolSha256: sha256(protocolRaw),
      caseSetSha256: sha256(await readText(casesPath)),
      caseSetSemanticSha256: caseDocument.semanticCaseSetSha256,
      opaqueMapSha256: sha256(await readText(hiddenMapPath)),
      promptTemplateSha256: sha256(prompt),
      schemaSha256: sha256(schemaRaw),
      rubricSha256: sha256(rubric),
      reviewSchemaSha256: sha256(reviewSchemaRaw),
      packetManifestSha256: sha256(await readText(packetManifestPath)),
      taskPayloadManifestSha256: sha256(await readText(taskManifestPath)),
      deterministicNegativesSha256: sha256(await readText(deterministicPath)),
      leakageReportSha256: sha256(await readText(leakagePath)),
      canonicalPriorCasesSha256: sha256(priorCasesRaw),
      canonicalPriorExpectedSha256: sha256(priorExpectedRaw),
    },
    taskPayloadSha256ByBatch: Object.fromEntries(
      taskPayloads.map((entry) => [entry.batchRef, entry.taskPayloadSha256]),
    ),
    packetSha256BySampleRef: Object.fromEntries(
      packetEntries.map((entry) => [entry.sampleRef, entry.packetSha256]),
    ),
    frozenFileSha256: fileHashes,
  };
  await writeJsonOnce(freezePath, freeze);

  return {
    laneId,
    caseCount: strictCases.length,
    positiveCount: packetEntries.length,
    negativeCount: deterministicNegatives.outputs.length,
    taskPayloadCount: taskPayloads.length,
    leakagePassed: leakageReport.passed,
    schemaProfilePassed: schemaProfile.passed,
    freezePath: relativePath(freezePath),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildStrictV2()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
