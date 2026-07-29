import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot =
  globalThis.__FLOWME_REPO_ROOT__ ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
if (!repoRoot) throw new Error("Set globalThis.__FLOWME_REPO_ROOT__ before importing this module");
const legacySpecDir = path.join(
  repoRoot,
  "docs/specs/2026-07-14-url-to-flow-prompt-lab",
);
const legacyAuditDir = path.join(
  repoRoot,
  "docs/content-audit/2026-07-14-url-to-flow-prompt-lab",
);
const specDir = path.join(
  repoRoot,
  "docs/specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
);
const auditDir = path.join(
  repoRoot,
  "docs/content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
);
const packetsDir = path.join(auditDir, "packets/v1.0");
const pipelineDir = path.join(packetsDir, "pipeline");
const generatorPromptDir = path.join(packetsDir, "generator-prompts");

const legacyCasesPath = path.join(legacySpecDir, "cases-v1.json");
const legacyExpectedPath = path.join(legacySpecDir, "expected-v1.json");
const schemaPath = path.join(legacySpecDir, "proposal-schema-v1.json");
const promptPath = path.join(specDir, "prompt-v1.0.md");
const laneId = "url-to-flow-source-row-v1";
const caseSetVersion = "flowme-url-to-flow-source-row-cases-v1";
const promptVersion = "url-to-flow-prompt-v1.0";
const proposalSchemaVersion = "flowme-semantic-proposal-v1";

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

const opaqueOverrides = new Map([
  ["rq|case-01", "rq-7a31d8c4f205"],
  ["rq|case-02", "rq-19e6b4a82d73"],
  ["rq|case-03", "rq-c52f09e17b64"],
  ["rq|case-04", "rq-83bd1a6f40c9"],
  ["rq|case-05", "rq-2e74c9a51f86"],
  ["rq|case-06", "rq-b90c37e4d125"],
  ["rq|case-07", "rq-4d1a8fb763e0"],
  ["rq|case-08", "rq-e68c25a094b7"],
  ["rq|case-09", "rq-05f3be71c8a4"],
  ["rq|case-10", "rq-a47e19d260bf"],
  ["rq|case-11", "rq-6bc2e805f139"],
  ["rq|case-12", "rq-d3187af46c52"],
  ["src|case-01|primary", "src-a61d7c3e902f"],
  ["src|case-02|primary", "src-f2049b6a1d83"],
  ["src|case-03|primary", "src-3e7a10c5b942"],
  ["src|case-04|primary", "src-8c51f2d709a6"],
  ["src|case-05|primary", "src-14b9e63a8f27"],
  ["src|case-06|primary", "src-c7305a19e4d2"],
  ["src|case-07|primary", "src-5d8a247fb1c6"],
  ["src|case-08|primary", "src-e1096c3a75b4"],
  ["src|case-09|primary", "src-29f4b8d160ce"],
  ["src|case-10|primary", "src-b6720d4e91a5"],
  ["src|case-10|supporting|0", "src-40c9a71e2f86"],
  ["src|case-11|primary", "src-96e31b5c7a20"],
  ["src|case-12|primary", "src-d5a8072c4e19"],
  ["row|case-01|0", "row-1c7a52e9b304"],
  ["row|case-01|1", "row-a48e103d6f92"],
  ["row|case-02|0", "row-62b9f4c107da"],
  ["row|case-03|0", "row-d3018c5e74a2"],
  ["row|case-03|1", "row-8f25a6b19c40"],
  ["row|case-04|0", "row-47c1e8a305bd"],
  ["row|case-04|1", "row-b6d2094f7a31"],
  ["row|case-05|0", "row-0e7a31c9b452"],
  ["row|case-05|1", "row-c48f2d105a76"],
  ["row|case-06|0", "row-93b5e1a760cd"],
  ["row|case-07|0", "row-2a8c640f1e95"],
  ["row|case-08|0", "row-f51d309b7c24"],
  ["row|case-09|0", "row-7c20e4a91b68"],
  ["row|case-09|1", "row-e3168f2c50a7"],
  ["row|case-10|0", "row-58a7d0c31e94"],
  ["row|case-10|1", "row-a20e6b9f4731"],
]);

const stableOpaque = (prefix, value) =>
  opaqueOverrides.get(`${prefix}|${value}`) ??
  `${prefix}-${sha256(`${laneId}|opaque-v1|${value}`).slice(0, 12)}`;

const toRepoPath = (absolutePath) =>
  path.relative(repoRoot, absolutePath).replaceAll("\\", "/");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(root) {
  const result = [];
  if (!(await fileExists(root))) return result;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walkFiles(fullPath)));
    } else if (entry.isFile()) {
      result.push(fullPath);
    }
  }
  return result.sort((left, right) => left.localeCompare(right));
}

async function hashFiles(roots) {
  const files = [];
  for (const root of roots) files.push(...(await walkFiles(root)));
  const records = [];
  for (const filePath of files) {
    const bytes = await readFile(filePath);
    const info = await stat(filePath);
    records.push({
      path: toRepoPath(filePath),
      bytes: info.size,
      sha256: sha256(bytes),
    });
  }
  return records;
}

function localeCountry(locale) {
  if (typeof locale !== "string") return null;
  const match = locale.match(/[-_]([A-Za-z]{2})$/);
  return match ? match[1].toUpperCase() : null;
}

function riskClass(riskLevel) {
  return riskLevel === "low" ? "low" : "sensitive";
}

function readableAccess(accessStatus) {
  if (accessStatus === "unavailable") return "unavailable";
  if (accessStatus === "partial") return "partial";
  if (accessStatus === "blocked") return "blocked";
  return "readable";
}

function preflight(caseInput) {
  const primary = caseInput.source.primary;
  const targetCountry = localeCountry(caseInput.targetLocale);
  const sourceCountry = primary.countryContext?.toUpperCase?.() ?? null;
  const sensitive = riskClass(primary.riskLevel) === "sensitive";

  if (sensitive && (!sourceCountry || sourceCountry !== targetCountry)) {
    return {
      passed: false,
      modelInvoked: false,
      generationState: "failed",
      outcome: "no_proposal",
      errorCode: "locale_applicability_unverified",
      recommendedDisposition: "hold",
      reasonCode: "sensitive_locale_not_verified",
    };
  }

  if (caseInput.sourceRows.length === 0) {
    return {
      passed: false,
      modelInvoked: false,
      generationState: "failed",
      outcome: "no_proposal",
      errorCode: "missing_source_rows",
      recommendedDisposition: "source_import_required",
      reasonCode: "no_source_rows_available",
    };
  }

  return {
    passed: true,
    modelInvoked: true,
    generationState: null,
    outcome: null,
    errorCode: null,
    recommendedDisposition: null,
    reasonCode: "preflight_passed",
  };
}

function deterministicNegativeProposal({
  caseInput,
  caseId,
  requestId,
  primarySourceId,
  supportingSourceIds,
  result,
}) {
  return {
    proposalSchemaVersion,
    promptVersion,
    requestId,
    caseId,
    status: {
      generationState: result.generationState,
      outcome: result.outcome,
      readiness: null,
      errorCode: result.errorCode,
    },
    sourceAssessment: {
      access: readableAccess(caseInput.source.primary.accessStatus),
      sourceShape: "unknown",
      primarySourceId,
      supportingSourceIds,
      receivedSourceRowIds: [],
      untrustedInstructionDetected: false,
    },
    conversionDecision: null,
    proposal: {
      proposalTitle: null,
      items: [],
      omittedRows: [],
      incompleteReason:
        result.errorCode === "missing_source_rows"
          ? "변환할 SourceRow가 없어 원문 행 확보가 필요하다."
          : "민감한 비현지 출처의 대상 지역 적용성을 확인하지 못했다.",
    },
    projectionPlan: [],
    reviewHints: {
      recommendedDisposition: result.recommendedDisposition,
      uncertainties: [result.reasonCode],
      hardFailCodes: [result.errorCode],
      humanReviewRequired:
        result.errorCode === "locale_applicability_unverified"
          ? ["local_applicability_review"]
          : ["source_row_import"],
    },
  };
}

function schemaProfile(schema, rawSchema) {
  let objectSchemas = 0;
  let declaredProperties = 0;
  const nonStrictObjectPaths = [];
  const optionalNonNullableProperties = [];

  function visit(node, nodePath) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    if (node.type === "object" || node.properties) {
      objectSchemas += 1;
      const properties = node.properties ?? {};
      const required = new Set(node.required ?? []);
      declaredProperties += Object.keys(properties).length;
      if (node.additionalProperties !== false) nonStrictObjectPaths.push(nodePath);
      for (const [key, property] of Object.entries(properties)) {
        const types = Array.isArray(property.type)
          ? property.type
          : property.type
            ? [property.type]
            : [];
        const nullable = types.includes("null") || property.const === null;
        if (!required.has(key) && !nullable) {
          optionalNonNullableProperties.push(`${nodePath}.properties.${key}`);
        }
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "properties") {
        for (const [propertyKey, propertyValue] of Object.entries(value)) {
          visit(propertyValue, `${nodePath}.properties.${propertyKey}`);
        }
      } else if (key === "items") {
        visit(value, `${nodePath}.items`);
      } else if (["anyOf", "oneOf", "allOf"].includes(key) && Array.isArray(value)) {
        value.forEach((entry, index) => visit(entry, `${nodePath}.${key}[${index}]`));
      } else if (key === "$defs" && value && typeof value === "object") {
        for (const [defKey, defValue] of Object.entries(value)) {
          visit(defValue, `${nodePath}.$defs.${defKey}`);
        }
      }
    }
  }

  visit(schema, "$schema");
  const bytes = Buffer.byteLength(rawSchema, "utf8");
  const limits = {
    objectSchemas: { actual: objectSchemas, max: 12, passed: objectSchemas <= 12 },
    declaredProperties: {
      actual: declaredProperties,
      max: 60,
      passed: declaredProperties <= 60,
    },
    serializedBytes: { actual: bytes, max: 12 * 1024, passed: bytes <= 12 * 1024 },
    strictObjects: {
      actualFailures: nonStrictObjectPaths,
      passed: nonStrictObjectPaths.length === 0,
    },
    requiredUnlessNullable: {
      actualFailures: optionalNonNullableProperties,
      passed: optionalNonNullableProperties.length === 0,
    },
  };
  return {
    schemaPath: toRepoPath(schemaPath),
    schemaSha256: sha256(rawSchema),
    proposalSchemaVersion,
    limits,
    passed: Object.values(limits).every((limit) => limit.passed),
  };
}

function collectForbiddenKeys(value, currentPath = "$", hits = []) {
  const forbidden = new Set([
    "userJob",
    "expectedConversion",
    "expectedStatus",
    "fixtureId",
    "fixtureName",
    "claimedScope",
    "controlContext",
    "targetLocale",
    "scopeMode",
    "originalUrl",
    "canonicalUrl",
    "publisher",
    "checkedAt",
    "rightsStatus",
    "riskLevel",
    "accessStatus",
    "inspectionSummary",
    "inputEvidenceRefs",
  ]);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectForbiddenKeys(entry, `${currentPath}[${index}]`, hits));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      const nextPath = `${currentPath}.${key}`;
      if (forbidden.has(key)) hits.push({ path: nextPath, key });
      collectForbiddenKeys(entry, nextPath, hits);
    }
  }
  return hits;
}

function buildLeakageReport({ legacyCases, correctedCases, promptTemplate }) {
  const failures = [];
  const positiveCases = correctedCases.filter((entry) => entry.generatorInput);
  const negativeCases = correctedCases.filter((entry) => !entry.generatorInput);
  const topLevelKeys = ["requestId", "caseId", "maxItems", "sourceOwnership", "sourceRows"];
  const ownershipKeys = ["primarySourceId", "supportingSourceIds"];
  const rowKeys = ["sourceRowId", "sourceId", "rowType", "title", "detail", "order"];

  for (const corrected of positiveCases) {
    const legacy = legacyCases.find((entry) => entry.caseId === corrected.caseId);
    const input = corrected.generatorInput;
    const actualTop = Object.keys(input).sort();
    if (JSON.stringify(actualTop) !== JSON.stringify([...topLevelKeys].sort())) {
      failures.push({ caseId: corrected.caseId, code: "generator_top_level_key_mismatch", actualTop });
    }
    const actualOwnership = Object.keys(input.sourceOwnership).sort();
    if (JSON.stringify(actualOwnership) !== JSON.stringify([...ownershipKeys].sort())) {
      failures.push({ caseId: corrected.caseId, code: "source_ownership_key_mismatch", actualOwnership });
    }
    for (const [index, row] of input.sourceRows.entries()) {
      const actualRowKeys = Object.keys(row).sort();
      if (JSON.stringify(actualRowKeys) !== JSON.stringify([...rowKeys].sort())) {
        failures.push({ caseId: corrected.caseId, code: "source_row_key_mismatch", index, actualRowKeys });
      }
      const legacyRow = legacy.sourceRows[index];
      const semanticActual = {
        rowType: row.rowType,
        title: row.title,
        detail: row.detail,
        order: row.order,
      };
      const semanticExpected = {
        rowType: legacyRow.rowType,
        title: legacyRow.title,
        detail: legacyRow.detail,
        order: legacyRow.order,
      };
      if (JSON.stringify(semanticActual) !== JSON.stringify(semanticExpected)) {
        failures.push({ caseId: corrected.caseId, code: "source_row_semantics_changed", index });
      }
      if (!/^row-[0-9a-f]{12}$/.test(row.sourceRowId) || !/^src-[0-9a-f]{12}$/.test(row.sourceId)) {
        failures.push({ caseId: corrected.caseId, code: "non_opaque_provenance_id", index });
      }
    }
    const forbiddenKeyHits = collectForbiddenKeys(input);
    forbiddenKeyHits.forEach((hit) => failures.push({ caseId: corrected.caseId, code: "forbidden_key", ...hit }));

    const serialized = JSON.stringify(input);
    const forbiddenValues = [
      legacy.userJob,
      legacy.claimedScope,
      legacy.source?.primary?.title,
      legacy.source?.primary?.publisher,
      legacy.source?.primary?.originalUrl,
      legacy.source?.primary?.canonicalUrl,
      legacy.source?.primary?.inspectionSummary,
      ...(legacy.source?.supporting ?? []).flatMap((source) => [
        source.title,
        source.publisher,
        source.originalUrl,
        source.canonicalUrl,
      ]),
    ].filter((value) => typeof value === "string" && value.length >= 4);
    for (const forbiddenValue of forbiddenValues) {
      if (serialized.includes(forbiddenValue)) {
        failures.push({ caseId: corrected.caseId, code: "forbidden_semantic_value", value: forbiddenValue });
      }
    }
    for (const canonicalId of [
      legacy.source.primary.sourceId,
      ...legacy.sourceRows.map((row) => row.sourceRowId),
      ...(legacy.source.supporting ?? []).map((source) => source.sourceId),
    ]) {
      if (serialized.includes(canonicalId)) {
        failures.push({ caseId: corrected.caseId, code: "canonical_id_leak", value: canonicalId });
      }
    }
  }

  const promptForbiddenValues = legacyCases
    .flatMap((entry) => [
      entry.userJob,
      entry.claimedScope,
      entry.source?.primary?.title,
      entry.source?.primary?.publisher,
      entry.source?.primary?.originalUrl,
      entry.source?.primary?.canonicalUrl,
    ])
    .filter((value) => typeof value === "string" && value.length >= 8);
  for (const value of promptForbiddenValues) {
    if (promptTemplate.includes(value)) failures.push({ code: "prompt_case_specific_value", value });
  }

  if (negativeCases.length !== 2 || negativeCases.some((entry) => entry.preflightResult.modelInvoked)) {
    failures.push({ code: "negative_model_boundary_failed" });
  }

  return {
    reportVersion: "flowme-source-row-leakage-report-v1",
    laneId,
    caseCount: correctedCases.length,
    positiveGeneratorPromptCount: positiveCases.length,
    deterministicNegativeCount: negativeCases.length,
    allowedGeneratorTopLevelKeys: topLevelKeys,
    allowedSourceOwnershipKeys: ownershipKeys,
    allowedSourceRowKeys: rowKeys,
    forbiddenHitCount: failures.length,
    failures,
    passed: failures.length === 0,
  };
}

async function buildLegacyEvidenceManifest() {
  const manifestPath = path.join(auditDir, "legacy-evidence-manifest.json");
  const currentFiles = await hashFiles([legacySpecDir, legacyAuditDir]);
  if (await fileExists(manifestPath)) {
    const frozen = await readJson(manifestPath);
    const currentByPath = new Map(currentFiles.map((entry) => [entry.path, entry.sha256]));
    const mismatches = frozen.files.filter(
      (entry) => currentByPath.get(entry.path) !== entry.sha256,
    );
    const addedOrRemoved =
      currentFiles.length !== frozen.files.length ||
      currentFiles.some((entry) => !frozen.files.some((old) => old.path === entry.path));
    if (mismatches.length > 0 || addedOrRemoved) {
      throw new Error(
        `Legacy preflight evidence changed after freeze: ${mismatches.map((entry) => entry.path).join(", ") || "file set changed"}`,
      );
    }
    return frozen;
  }
  const manifest = {
    manifestVersion: "flowme-url-to-flow-legacy-evidence-manifest-v1",
    laneId: "url-to-flow-rich-packet-preflight-v1",
    acceptedForCorrectedCompletion: false,
    invalidReasons: [
      "canonical_user_need_leak",
      "full_source_metadata_leak",
      "semantic_provenance_id_leak",
    ],
    fileCount: currentFiles.length,
    files: currentFiles,
  };
  await writeJson(manifestPath, manifest);
  return manifest;
}

export async function buildSourceRowLab() {
  const legacyCaseDocument = await readJson(legacyCasesPath);
  const legacyCases = legacyCaseDocument.cases;
  const promptTemplate = await readFile(promptPath, "utf8");
  const rawSchema = await readFile(schemaPath, "utf8");
  const schema = JSON.parse(rawSchema);
  const placeholderCount = promptTemplate.split("{{CASE_INPUT_JSON}}").length - 1;
  if (placeholderCount !== 1) {
    throw new Error(`Prompt must contain exactly one CASE_INPUT_JSON placeholder, got ${placeholderCount}`);
  }
  if (legacyCases.length !== 12) throw new Error(`Expected 12 legacy cases, got ${legacyCases.length}`);

  await mkdir(specDir, { recursive: true });
  await mkdir(pipelineDir, { recursive: true });
  await mkdir(generatorPromptDir, { recursive: true });

  const correctedCases = [];
  const hiddenCases = [];
  const pipelinePacketRecords = [];
  const generatorPromptRecords = [];

  for (const caseInput of legacyCases) {
    const caseId = caseInput.caseId;
    const requestId = stableOpaque("rq", caseId);
    const primarySourceId = stableOpaque("src", `${caseId}|primary`);
    const supportingSourceIds = (caseInput.source.supporting ?? []).map((_, index) =>
      stableOpaque("src", `${caseId}|supporting|${index}`),
    );
    const canonicalToOpaqueSource = new Map([
      [caseInput.source.primary.sourceId, primarySourceId],
      ...(caseInput.source.supporting ?? []).map((source, index) => [
        source.sourceId,
        supportingSourceIds[index],
      ]),
    ]);
    const result = preflight(caseInput);
    const generatorInput = result.passed
      ? {
          requestId,
          caseId,
          maxItems: Math.min(caseInput.maxItems ?? 7, 7),
          sourceOwnership: {
            primarySourceId,
            supportingSourceIds,
          },
          sourceRows: caseInput.sourceRows.map((row, index) => ({
            sourceRowId: stableOpaque("row", `${caseId}|${index}`),
            sourceId: canonicalToOpaqueSource.get(row.sourceId),
            rowType: row.rowType,
            title: row.title,
            detail: row.detail,
            order: row.order,
          })),
        }
      : null;
    const preflightInput = {
      targetLocale: caseInput.targetLocale,
      primary: {
        countryContext: caseInput.source.primary.countryContext,
        riskClass: riskClass(caseInput.source.primary.riskLevel),
        accessStatus: caseInput.source.primary.accessStatus,
        rightsStatus: caseInput.source.primary.rightsStatus,
      },
      sourceRowCount: caseInput.sourceRows.length,
    };
    const deterministicProposal = result.passed
      ? null
      : deterministicNegativeProposal({
          caseInput,
          caseId,
          requestId,
          primarySourceId,
          supportingSourceIds,
          result,
        });

    const correctedCase = {
      caseId,
      requestId,
      preflightInput,
      preflightResult: result,
      generatorInput,
    };
    correctedCases.push(correctedCase);
    hiddenCases.push({
      caseId,
      requestId,
      canonicalLineage: {
        legacyCaseId: caseId,
        inputEvidenceRefs: caseInput.inputEvidenceRefs,
        canonicalExpectedPath: toRepoPath(legacyExpectedPath),
      },
      expectedPipeline: {
        modelInvoked: result.modelInvoked,
        generationState: result.generationState,
        outcome: result.outcome,
        errorCode: result.errorCode,
        recommendedDisposition: result.recommendedDisposition,
      },
      opaqueMapping: {
        sources: [
          {
            opaqueId: primarySourceId,
            canonicalId: caseInput.source.primary.sourceId,
            role: "primary",
          },
          ...(caseInput.source.supporting ?? []).map((source, index) => ({
            opaqueId: supportingSourceIds[index],
            canonicalId: source.sourceId,
            role: "supporting",
          })),
        ],
        sourceRows: caseInput.sourceRows.map((row, index) => ({
          opaqueId: stableOpaque("row", `${caseId}|${index}`),
          canonicalId: row.sourceRowId,
        })),
      },
    });

    const pipelinePacket = {
      laneId,
      caseSetVersion,
      promptVersion,
      caseId,
      requestId,
      preflightInput,
      preflightResult: result,
      generatorInput,
      deterministicProposal,
      evidenceBoundary: result.passed
        ? "Only generatorInput is model-visible. preflightInput and hidden oracle are excluded."
        : "Deterministic negative. No model prompt exists and modelInvoked=false.",
    };
    const pipelinePath = path.join(pipelineDir, `${caseId}.json`);
    const pipelineText = `${JSON.stringify(pipelinePacket, null, 2)}\n`;
    await writeFile(pipelinePath, pipelineText, "utf8");
    pipelinePacketRecords.push({
      caseId,
      path: toRepoPath(pipelinePath),
      sha256: sha256(pipelineText),
      modelInvoked: result.modelInvoked,
    });

    if (generatorInput) {
      const inputJson = JSON.stringify(generatorInput, null, 2);
      const renderedPrompt = promptTemplate.replace("{{CASE_INPUT_JSON}}", inputJson);
      const promptOutputPath = path.join(generatorPromptDir, `${caseId}.md`);
      await writeFile(promptOutputPath, renderedPrompt, "utf8");
      generatorPromptRecords.push({
        caseId,
        path: toRepoPath(promptOutputPath),
        sha256: sha256(renderedPrompt),
        semanticPayloadSha256: sha256(inputJson),
      });
    }
  }

  const casesDocument = {
    caseSetVersion,
    laneId,
    promptVersion,
    proposalSchemaVersion,
    legacyCaseSetPath: toRepoPath(legacyCasesPath),
    legacyCaseSetSha256: sha256(await readFile(legacyCasesPath)),
    sourceFixtureSha256: legacyCaseDocument.sourceFixtureSha256,
    generatorVisibleContract:
      "Positive generatorInput contains only opaque request/case/provenance IDs, maxItems, and SourceRow rowType/title/detail/order. Negative cases stop in deterministic preflight.",
    cases: correctedCases,
  };
  const hiddenExpected = {
    expectedVersion: "flowme-url-to-flow-source-row-hidden-oracle-v1",
    laneId,
    visibility: "validator_and_post_review_diagnostics_only",
    forbiddenFor: ["generator", "blind_reviewer"],
    cases: hiddenCases,
  };
  await writeJson(path.join(specDir, "cases-v1.json"), casesDocument);
  await writeJson(path.join(specDir, "expected-v1.json"), hiddenExpected);

  const profile = schemaProfile(schema, rawSchema);
  await writeJson(path.join(specDir, "schema-profile-v1.json"), profile);

  const leakageReport = buildLeakageReport({
    legacyCases,
    correctedCases,
    promptTemplate,
  });
  await writeJson(path.join(auditDir, "leakage-report.json"), leakageReport);
  if (!leakageReport.passed) {
    throw new Error(`Semantic leakage check failed with ${leakageReport.forbiddenHitCount} finding(s)`);
  }
  if (!profile.passed) throw new Error("Compact schema budget failed");

  const manifest = {
    manifestVersion: "flowme-source-row-packet-manifest-v1",
    laneId,
    caseSetVersion,
    promptVersion,
    proposalSchemaVersion,
    promptTemplate: {
      path: toRepoPath(promptPath),
      sha256: sha256(promptTemplate),
    },
    schema: {
      path: toRepoPath(schemaPath),
      sha256: sha256(rawSchema),
    },
    cases: {
      path: toRepoPath(path.join(specDir, "cases-v1.json")),
      sha256: sha256(await readFile(path.join(specDir, "cases-v1.json"))),
    },
    pipelinePacketCount: pipelinePacketRecords.length,
    generatorPromptCount: generatorPromptRecords.length,
    deterministicNegativeCount: pipelinePacketRecords.filter((entry) => !entry.modelInvoked).length,
    pipelinePackets: pipelinePacketRecords,
    generatorPrompts: generatorPromptRecords,
  };
  await writeJson(path.join(packetsDir, "manifest.json"), manifest);

  await writeJson(path.join(specDir, "lane.json"), {
    laneId,
    authority: "corrected_experimental_evidence",
    legacyLane: {
      laneId: "url-to-flow-rich-packet-preflight-v1",
      acceptedForCorrectedCompletion: false,
      manifestPath: toRepoPath(path.join(auditDir, "legacy-evidence-manifest.json")),
    },
    correctedLane: {
      caseSetVersion,
      promptVersions: [promptVersion, "url-to-flow-prompt-v1.1"],
      maximumRounds: 3,
      productionBackendGo: false,
    },
  });
  await writeJson(path.join(specDir, "run-log-template.json"), {
    runSchemaVersion: "flowme-source-row-run-v1",
    laneId,
    runId: "replace-me",
    round: "round-1",
    promptVersion,
    caseSetVersion,
    evidenceClass: "in_session_unselected_model_proxy",
    provider: null,
    model: null,
    tier: null,
    timing: null,
    usage: null,
    cost: null,
    humanReview: false,
    outputs: [],
  });

  const legacyManifest = await buildLegacyEvidenceManifest();
  const summary = {
    laneId,
    cases: correctedCases.length,
    positiveGeneratorPrompts: generatorPromptRecords.length,
    deterministicNegatives: pipelinePacketRecords.filter((entry) => !entry.modelInvoked).length,
    leakagePassed: leakageReport.passed,
    compactSchemaPassed: profile.passed,
    legacyFilesFrozen: legacyManifest.fileCount,
    packetsManifest: toRepoPath(path.join(packetsDir, "manifest.json")),
  };
  return summary;
}

if (typeof process !== "undefined" && typeof process.stdout?.write === "function") {
  buildSourceRowLab()
    .then((summary) => process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
