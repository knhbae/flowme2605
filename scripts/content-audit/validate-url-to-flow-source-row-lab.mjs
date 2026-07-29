import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
const casesPath = path.join(specDir, "cases-v1.json");
const expectedPath = path.join(specDir, "expected-v1.json");
const schemaPath = path.join(
  repoRoot,
  "docs/specs/2026-07-14-url-to-flow-prompt-lab/proposal-schema-v1.json",
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function parseArgs(argv) {
  const args = {
    json: false,
    proposal: null,
    file: null,
    all: false,
    out: null,
    round: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--json") args.json = true;
    else if (token === "--all") args.all = true;
    else if (["--proposal", "--file", "--out", "--round"].includes(token)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${token} requires a path`);
      args[token.slice(2)] = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${token}`);
  }
  const modeCount = Number(Boolean(args.proposal)) + Number(Boolean(args.file)) + Number(args.all);
  if (modeCount !== 1) throw new Error("Choose exactly one of --proposal, --file, or --all");
  if (args.round && !args.all) throw new Error("--round is only valid with --all");
  if (args.round && !/^round-[123]$/.test(args.round)) throw new Error(`Invalid round: ${args.round}`);
  return args;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  if (/```/.test(raw)) throw new Error(`Markdown fence is not valid JSON: ${filePath}`);
  return { raw, value: JSON.parse(raw) };
}

function resolvePointer(rootSchema, reference) {
  if (!reference.startsWith("#/")) throw new Error(`Only local JSON Schema refs are supported: ${reference}`);
  return reference
    .slice(2)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((node, segment) => node?.[segment], rootSchema);
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  if (typeof value === "number") return "number";
  return typeof value;
}

function schemaErrors(value, schema, rootSchema, nodePath = "$", errors = []) {
  if (!schema || typeof schema !== "object") return errors;
  if (schema.$ref) {
    const resolved = resolvePointer(rootSchema, schema.$ref);
    if (!resolved) errors.push({ code: "schema_ref_missing", path: nodePath, ref: schema.$ref });
    else schemaErrors(value, resolved, rootSchema, nodePath, errors);
    return errors;
  }
  if (schema.allOf) {
    schema.allOf.forEach((entry) => schemaErrors(value, entry, rootSchema, nodePath, errors));
  }
  if (schema.anyOf) {
    const alternatives = schema.anyOf.map((entry) => {
      const candidateErrors = [];
      schemaErrors(value, entry, rootSchema, nodePath, candidateErrors);
      return candidateErrors;
    });
    if (!alternatives.some((entry) => entry.length === 0)) {
      errors.push({ code: "schema_any_of", path: nodePath, alternatives });
      return errors;
    }
  }
  if (schema.oneOf) {
    const alternatives = schema.oneOf.map((entry) => {
      const candidateErrors = [];
      schemaErrors(value, entry, rootSchema, nodePath, candidateErrors);
      return candidateErrors;
    });
    if (alternatives.filter((entry) => entry.length === 0).length !== 1) {
      errors.push({ code: "schema_one_of", path: nodePath, alternatives });
      return errors;
    }
  }
  if (schema.not) {
    const candidateErrors = [];
    schemaErrors(value, schema.not, rootSchema, nodePath, candidateErrors);
    if (candidateErrors.length === 0) errors.push({ code: "schema_not", path: nodePath });
  }
  if (Object.hasOwn(schema, "const") && !Object.is(value, schema.const)) {
    errors.push({ code: "schema_const", path: nodePath, expected: schema.const, actual: value });
  }
  if (schema.enum && !schema.enum.some((entry) => Object.is(entry, value))) {
    errors.push({ code: "schema_enum", path: nodePath, expected: schema.enum, actual: value });
  }
  if (schema.type) {
    const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = valueType(value);
    const matches = allowedTypes.some(
      (type) => type === actualType || (type === "number" && actualType === "integer"),
    );
    if (!matches) {
      errors.push({ code: "schema_type", path: nodePath, expected: allowedTypes, actual: actualType });
      return errors;
    }
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({ code: "schema_min_length", path: nodePath, expected: schema.minLength });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({ code: "schema_max_length", path: nodePath, expected: schema.maxLength });
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push({ code: "schema_pattern", path: nodePath, expected: schema.pattern, actual: value });
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({ code: "schema_minimum", path: nodePath, expected: schema.minimum });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({ code: "schema_maximum", path: nodePath, expected: schema.maximum });
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({ code: "schema_min_items", path: nodePath, expected: schema.minItems });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({ code: "schema_max_items", path: nodePath, expected: schema.maxItems });
    }
    if (schema.uniqueItems) {
      const values = value.map((entry) => JSON.stringify(entry));
      if (new Set(values).size !== values.length) errors.push({ code: "schema_unique_items", path: nodePath });
    }
    if (schema.items) {
      value.forEach((entry, index) =>
        schemaErrors(entry, schema.items, rootSchema, `${nodePath}[${index}]`, errors),
      );
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties ?? {};
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) {
        errors.push({ code: "schema_required", path: `${nodePath}.${required}` });
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) {
          errors.push({ code: "schema_additional_property", path: `${nodePath}.${key}` });
        }
      }
    }
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        schemaErrors(value[key], propertySchema, rootSchema, `${nodePath}.${key}`, errors);
      }
    }
  }
  return errors;
}

function sameSet(left, right) {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function statusPairAllowed(status) {
  const pair = `${status?.generationState}|${status?.outcome}`;
  return new Set([
    "proposal|complete",
    "partial|partial",
    "failed|no_proposal",
    "failed|rejected",
  ]).has(pair);
}

function scheduleHasLiteralValue(sourceText) {
  if (typeof sourceText !== "string") return false;
  const normalized = sourceText.trim();
  if (/^(?:day\s*)?\d+\s*(?:일차|주차|단계|회차|prompt)$/iu.test(normalized)) return false;
  if (/\d{4}[./-]\d{1,2}(?:[./-]\d{1,2})?/u.test(normalized)) return true;
  if (/\d{1,2}\s*월\s*\d{1,2}\s*일/u.test(normalized)) return true;
  if (/\d+\s*(?:일|주|개월|달|년)\s*(?:에\s*)?(?:한\s*번|마다|간격|주기|회)/u.test(normalized)) return true;
  if (/(?:매일|매주|매월|매년|격주|격월)/u.test(normalized)) return true;
  if (/D[+-]\d+/iu.test(normalized)) return true;
  return false;
}

function sourceTextForRow(row) {
  return [row.title, row.detail].filter((value) => typeof value === "string").join("\n");
}

function addError(errors, code, pathName, detail = null) {
  errors.push({ code, path: pathName, ...(detail === null ? {} : { detail }) });
}

function validateProposal({ proposal, correctedCase, hiddenCase, schema, modelInvoked }) {
  const errors = schemaErrors(proposal, schema, schema);
  const warnings = [];
  const input = correctedCase.generatorInput;
  const expectedPipeline = hiddenCase.expectedPipeline;
  const expectedSourceIds = input
    ? [input.sourceOwnership.primarySourceId, ...input.sourceOwnership.supportingSourceIds]
    : hiddenCase.opaqueMapping.sources.map((entry) => entry.opaqueId);
  const primarySourceId = input
    ? input.sourceOwnership.primarySourceId
    : hiddenCase.opaqueMapping.sources.find((entry) => entry.role === "primary")?.opaqueId;
  const supportingSourceIds = input
    ? input.sourceOwnership.supportingSourceIds
    : hiddenCase.opaqueMapping.sources
        .filter((entry) => entry.role === "supporting")
        .map((entry) => entry.opaqueId);
  const rows = input?.sourceRows ?? [];
  const rowById = new Map(rows.map((row) => [row.sourceRowId, row]));
  const allRowIds = rows.map((row) => row.sourceRowId);
  const supportingRowIds = new Set(
    rows.filter((row) => supportingSourceIds.includes(row.sourceId)).map((row) => row.sourceRowId),
  );

  if (proposal?.caseId !== correctedCase.caseId) {
    addError(errors, "case_id_mismatch", "$.caseId", { expected: correctedCase.caseId, actual: proposal?.caseId });
  }
  if (proposal?.requestId !== correctedCase.requestId) {
    addError(errors, "request_id_mismatch", "$.requestId", {
      expected: correctedCase.requestId,
      actual: proposal?.requestId,
    });
  }
  if (!/^url-to-flow-prompt-v1\.[01]$/.test(proposal?.promptVersion ?? "")) {
    addError(errors, "corrected_prompt_version_required", "$.promptVersion", proposal?.promptVersion);
  }
  if (proposal?.status?.readiness !== null) {
    addError(errors, "readiness_must_remain_null", "$.status.readiness");
  }
  if (!statusPairAllowed(proposal?.status)) {
    addError(errors, "invalid_status_pair", "$.status", proposal?.status);
  }
  if (proposal?.sourceAssessment?.primarySourceId !== primarySourceId) {
    addError(errors, "primary_source_id_mismatch", "$.sourceAssessment.primarySourceId", {
      expected: primarySourceId,
      actual: proposal?.sourceAssessment?.primarySourceId,
    });
  }
  if (!sameSet(proposal?.sourceAssessment?.supportingSourceIds ?? [], supportingSourceIds)) {
    addError(errors, "supporting_source_ids_mismatch", "$.sourceAssessment.supportingSourceIds");
  }
  const received = proposal?.sourceAssessment?.receivedSourceRowIds ?? [];
  if (!sameSet(received, allRowIds)) {
    addError(errors, "received_source_rows_mismatch", "$.sourceAssessment.receivedSourceRowIds", {
      expected: allRowIds,
      actual: received,
    });
  }
  if (expectedSourceIds.some((sourceId) => !/^src-[0-9a-f]{12}$/.test(sourceId ?? ""))) {
    addError(errors, "non_opaque_expected_source_id", "$input.sourceOwnership");
  }

  const items = proposal?.proposal?.items ?? [];
  const omittedRows = proposal?.proposal?.omittedRows ?? [];
  if (input && items.length > input.maxItems) {
    addError(errors, "max_items_exceeded", "$.proposal.items", {
      actual: items.length,
      max: input.maxItems,
    });
  }
  const accounting = new Map(allRowIds.map((rowId) => [rowId, 0]));
  for (const [itemIndex, item] of items.entries()) {
    if (!Array.isArray(item.sourceRowIds) || item.sourceRowIds.length === 0) {
      addError(errors, "item_without_source_rows", `$.proposal.items[${itemIndex}].sourceRowIds`);
      continue;
    }
    for (const rowId of item.sourceRowIds) {
      if (!accounting.has(rowId)) {
        addError(errors, "unknown_item_source_row", `$.proposal.items[${itemIndex}].sourceRowIds`, rowId);
      } else accounting.set(rowId, accounting.get(rowId) + 1);
      if (supportingRowIds.has(rowId)) {
        addError(errors, "supporting_source_controls_item", `$.proposal.items[${itemIndex}].sourceRowIds`, rowId);
      }
    }
    const schedule = item.scheduleCandidate;
    if (schedule !== null && schedule !== undefined) {
      const scheduleRowIds = schedule.sourceRowIds ?? [];
      if (scheduleRowIds.length === 0) {
        addError(errors, "schedule_without_source_rows", `$.proposal.items[${itemIndex}].scheduleCandidate`);
      }
      let contiguousSourceMatch = false;
      for (const rowId of scheduleRowIds) {
        const row = rowById.get(rowId);
        if (!row) {
          addError(errors, "unknown_schedule_source_row", `$.proposal.items[${itemIndex}].scheduleCandidate.sourceRowIds`, rowId);
          continue;
        }
        if (!item.sourceRowIds.includes(rowId)) {
          addError(errors, "schedule_row_not_owned_by_item", `$.proposal.items[${itemIndex}].scheduleCandidate.sourceRowIds`, rowId);
        }
        if (sourceTextForRow(row).includes(schedule.sourceText ?? "")) contiguousSourceMatch = true;
      }
      if (!contiguousSourceMatch || !schedule.sourceText) {
        addError(errors, "schedule_source_text_not_literal", `$.proposal.items[${itemIndex}].scheduleCandidate.sourceText`);
      }
      if (!scheduleHasLiteralValue(schedule.sourceText)) {
        addError(errors, "unsupported_schedule_value", `$.proposal.items[${itemIndex}].scheduleCandidate.sourceText`, schedule.sourceText);
      }
      if (schedule.parsedByRule !== false) {
        addError(errors, "model_must_not_claim_schedule_parse", `$.proposal.items[${itemIndex}].scheduleCandidate.parsedByRule`);
      }
    }
  }
  for (const [omittedIndex, omitted] of omittedRows.entries()) {
    const rowId = omitted.sourceRowId;
    if (!accounting.has(rowId)) {
      addError(errors, "unknown_omitted_source_row", `$.proposal.omittedRows[${omittedIndex}].sourceRowId`, rowId);
    } else accounting.set(rowId, accounting.get(rowId) + 1);
  }
  for (const [rowId, count] of accounting.entries()) {
    if (count !== 1) {
      addError(errors, "source_row_accounting_not_exactly_once", "$.proposal", { rowId, count });
    }
  }

  const hasSchedule = items.some((item) => item.scheduleCandidate !== null && item.scheduleCandidate !== undefined);
  const calendarProjection = (proposal?.projectionPlan ?? []).some((entry) => entry.target === "calendar");
  if (calendarProjection && !hasSchedule) {
    addError(errors, "calendar_projection_without_literal_schedule", "$.projectionPlan");
  }
  if (["calendar", "hybrid"].includes(proposal?.conversionDecision?.primaryArtifact) && !hasSchedule) {
    addError(errors, "scheduled_artifact_without_literal_schedule", "$.conversionDecision.primaryArtifact");
  }

  if (!input) {
    if (modelInvoked === true) addError(errors, "negative_model_was_invoked", "$run.output.modelInvoked");
    const expected = expectedPipeline;
    if (
      proposal?.status?.generationState !== expected.generationState ||
      proposal?.status?.outcome !== expected.outcome ||
      proposal?.status?.errorCode !== expected.errorCode ||
      proposal?.reviewHints?.recommendedDisposition !== expected.recommendedDisposition
    ) {
      addError(errors, "negative_disposition_mismatch", "$", {
        expected,
        actual: {
          generationState: proposal?.status?.generationState,
          outcome: proposal?.status?.outcome,
          errorCode: proposal?.status?.errorCode,
          recommendedDisposition: proposal?.reviewHints?.recommendedDisposition,
        },
      });
    }
    if (
      proposal?.conversionDecision !== null ||
      proposal?.proposal?.proposalTitle !== null ||
      items.length !== 0 ||
      omittedRows.length !== 0 ||
      (proposal?.projectionPlan ?? []).length !== 0
    ) {
      addError(errors, "negative_contains_proposal_content", "$.");
    }
  } else {
    if (modelInvoked === false) addError(errors, "positive_model_not_invoked", "$run.output.modelInvoked");
    if (proposal?.status?.generationState === "proposal" && items.length === 0) {
      addError(errors, "positive_proposal_without_items", "$.proposal.items");
    }
  }

  const metrics = {
    receivedRows: allRowIds.length,
    exactlyOnceRows: [...accounting.values()].filter((count) => count === 1).length,
    itemCount: items.length,
    omittedRowCount: omittedRows.length,
    scheduleCandidateCount: items.filter((item) => item.scheduleCandidate).length,
    positiveProposal: Boolean(input && proposal?.status?.generationState === "proposal" && items.length > 0),
    deterministicNegative: !input,
  };
  const normalizedDiagnostics = { errors, warnings, metrics };
  return {
    caseId: correctedCase.caseId,
    passed: errors.length === 0,
    errors,
    warnings,
    metrics,
    proposalFingerprint: sha256(JSON.stringify(proposal)),
    proposalDiagnosticsSha256: sha256(JSON.stringify(normalizedDiagnostics)),
  };
}

async function listRunFiles(root) {
  const files = [];
  if (!(await exists(root))) return files;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listRunFiles(fullPath)));
    else if (
      entry.isFile() &&
      entry.name.startsWith("batch-") &&
      entry.name.endsWith(".json")
    ) {
      files.push(fullPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function extractOutputs(document, inputKind) {
  if (inputKind === "bare_proposal") {
    return [{ caseId: document.caseId, modelInvoked: null, proposal: document }];
  }
  if (!document || typeof document !== "object" || !Array.isArray(document.outputs)) {
    throw new Error("Run envelope must be an object with an outputs array");
  }
  return document.outputs.map((output) => ({
    caseId: output.caseId ?? output.proposal?.caseId,
    modelInvoked: output.modelInvoked,
    proposal: output.proposal,
  }));
}

async function validateDocument({ filePath, inputKind, casesById, hiddenById, schema }) {
  const { value: document } = await readJson(filePath);
  const outputs = extractOutputs(document, inputKind);
  const results = [];
  for (const output of outputs) {
    const correctedCase = casesById.get(output.caseId);
    const hiddenCase = hiddenById.get(output.caseId);
    if (!correctedCase || !hiddenCase) {
      results.push({
        caseId: output.caseId ?? null,
        passed: false,
        errors: [{ code: "unknown_case", path: "$", detail: output.caseId }],
        warnings: [],
        metrics: {},
        proposalFingerprint: output.proposal ? sha256(JSON.stringify(output.proposal)) : null,
        proposalDiagnosticsSha256: null,
      });
      continue;
    }
    if (!output.proposal || typeof output.proposal !== "object" || Array.isArray(output.proposal)) {
      results.push({
        caseId: output.caseId,
        passed: false,
        errors: [{ code: "proposal_object_required", path: "$" }],
        warnings: [],
        metrics: {},
        proposalFingerprint: null,
        proposalDiagnosticsSha256: null,
      });
      continue;
    }
    results.push(
      validateProposal({
        proposal: output.proposal,
        correctedCase,
        hiddenCase,
        schema,
        modelInvoked: output.modelInvoked,
      }),
    );
  }
  return {
    file: path.relative(repoRoot, filePath).replaceAll("\\", "/"),
    inputKind,
    runId: inputKind === "bare_proposal" ? null : document.runId ?? null,
    round: inputKind === "bare_proposal" ? null : document.round ?? null,
    promptVersion:
      inputKind === "bare_proposal" ? document.promptVersion ?? null : document.promptVersion ?? null,
    passed: results.every((result) => result.passed),
    results,
  };
}

export async function validateSourceRowLab(argv) {
  const args = parseArgs(argv);
  const { value: caseDocument } = await readJson(casesPath);
  const { value: expectedDocument } = await readJson(expectedPath);
  const { value: schema } = await readJson(schemaPath);
  const casesById = new Map(caseDocument.cases.map((entry) => [entry.caseId, entry]));
  const hiddenById = new Map(expectedDocument.cases.map((entry) => [entry.caseId, entry]));

  const requests = [];
  if (args.proposal) {
    requests.push({ filePath: path.resolve(repoRoot, args.proposal), inputKind: "bare_proposal" });
  } else if (args.file) {
    requests.push({ filePath: path.resolve(repoRoot, args.file), inputKind: "run_envelope" });
  } else {
    const runRoot = args.round
      ? path.join(auditDir, "runs", args.round)
      : path.join(auditDir, "runs");
    for (const filePath of await listRunFiles(runRoot)) {
      requests.push({ filePath, inputKind: "run_envelope" });
    }
  }
  if (requests.length === 0) throw new Error("No input files found");

  const documents = [];
  for (const request of requests) {
    documents.push(
      await validateDocument({
        ...request,
        casesById,
        hiddenById,
        schema,
      }),
    );
  }
  const results = documents.flatMap((document) => document.results);
  const rowTotals = results.reduce(
    (totals, result) => ({
      received: totals.received + (result.metrics.receivedRows ?? 0),
      exactlyOnce: totals.exactlyOnce + (result.metrics.exactlyOnceRows ?? 0),
    }),
    { received: 0, exactlyOnce: 0 },
  );
  const report = {
    validationSchemaVersion: "flowme-source-row-validation-v1",
    inputKind: args.proposal ? "bare_proposal" : args.file ? "run_envelope" : "all_run_envelopes",
    laneId: caseDocument.laneId,
    roundFilter: args.round,
    passed: documents.every((document) => document.passed),
    summary: {
      documentCount: documents.length,
      outputCount: results.length,
      passedOutputCount: results.filter((result) => result.passed).length,
      failedOutputCount: results.filter((result) => !result.passed).length,
      errorCount: results.reduce((count, result) => count + result.errors.length, 0),
      warningCount: results.reduce((count, result) => count + result.warnings.length, 0),
      receivedSourceRows: rowTotals.received,
      exactlyOnceSourceRows: rowTotals.exactlyOnce,
      sourceRowAccountingRate:
        rowTotals.received === 0 ? 1 : rowTotals.exactlyOnce / rowTotals.received,
    },
    documents,
  };
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args.out) {
    const outputPath = path.resolve(repoRoot, args.out);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output, "utf8");
  }
  return report;
}

if (typeof process !== "undefined" && typeof process.stdout?.write === "function") {
  validateSourceRowLab(process.argv.slice(2))
    .then((report) => {
      process.stdout.write(
        process.argv.includes("--json")
          ? `${JSON.stringify(report, null, 2)}\n`
          : `${report.passed ? "PASS" : "FAIL"}: ${report.summary.passedOutputCount}/${report.summary.outputCount} outputs\n`,
      );
      if (!report.passed) process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
