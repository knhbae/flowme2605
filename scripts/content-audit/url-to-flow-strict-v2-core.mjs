import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot =
  globalThis.__FLOWME_REPO_ROOT__ ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const laneId = "url-to-flow-source-row-v2-strict";
export const specDir = path.join(
  repoRoot,
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v2-strict",
);
export const auditDir = path.join(
  repoRoot,
  "docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v2-strict",
);

export const normalizeLf = (value) => String(value).replaceAll("\r\n", "\n");
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, sortKeys(value[key])]),
  );
}

export const canonicalJson = (value) => JSON.stringify(sortKeys(value));
export const canonicalSha256 = (value) => sha256(canonicalJson(value));

export async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath) {
  return normalizeLf(await readFile(filePath, "utf8"));
}

export async function readJson(filePath) {
  const raw = await readText(filePath);
  if (/```/.test(raw)) throw new Error(`Markdown fence is not valid JSON: ${filePath}`);
  return { raw, value: JSON.parse(raw) };
}

export async function writeText(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, normalizeLf(value), "utf8");
}

export async function writeJson(filePath, value) {
  await writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll("\\", "/");
}

export async function walkFiles(root) {
  if (!(await exists(root))) return [];
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(fullPath)));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

export async function verifyBaseFreezeIntegrity(freezeValue = null) {
  const freezeDocument = freezeValue
    ? { value: freezeValue, raw: await readText(path.join(specDir, "freeze-manifest.json")) }
    : await readJson(path.join(specDir, "freeze-manifest.json"));
  const freeze = freezeDocument.value;
  const errors = [];
  const checkFile = async (filePath, expected, code) => {
    if (!(await exists(filePath))) {
      errors.push({ code: `${code}_missing`, file: relativePath(filePath) });
      return;
    }
    const actual = sha256(await readText(filePath));
    if (actual !== expected) errors.push({ code: `${code}_hash_mismatch`, file: relativePath(filePath), expected, actual });
  };
  for (const [file, expected] of Object.entries(freeze.frozenFileSha256 ?? {})) {
    await checkFile(path.join(repoRoot, file), expected, "frozen_file");
  }
  const boundFiles = [
    [path.join(specDir, "protocol-v2.json"), freeze.bindings?.protocolSha256, "protocol"],
    [path.join(specDir, "cases-v2.json"), freeze.bindings?.caseSetSha256, "case_set"],
    [path.join(specDir, "hidden-map-v2.json"), freeze.bindings?.opaqueMapSha256, "opaque_map"],
    [path.join(specDir, "prompt-v2.0.md"), freeze.bindings?.promptTemplateSha256, "prompt"],
    [path.join(specDir, "proposal-schema-v2.json"), freeze.bindings?.schemaSha256, "proposal_schema"],
    [path.join(specDir, "review-rubric.md"), freeze.bindings?.rubricSha256, "rubric"],
    [path.join(specDir, "review-result-schema-v2.json"), freeze.bindings?.reviewSchemaSha256, "review_schema"],
    [path.join(auditDir, "packets", "v2.0", "manifest.json"), freeze.bindings?.packetManifestSha256, "packet_manifest"],
    [path.join(auditDir, "task-payloads", "v2.0", "manifest.json"), freeze.bindings?.taskPayloadManifestSha256, "task_manifest"],
    [path.join(auditDir, "deterministic-negatives-v2.json"), freeze.bindings?.deterministicNegativesSha256, "deterministic_negatives"],
    [path.join(auditDir, "leakage-report.json"), freeze.bindings?.leakageReportSha256, "leakage_report"],
  ];
  for (const [filePath, expected, code] of boundFiles) await checkFile(filePath, expected, code);
  for (const [sampleRef, expected] of Object.entries(freeze.packetSha256BySampleRef ?? {})) {
    await checkFile(path.join(auditDir, "packets", "v2.0", `${sampleRef}.json`), expected, "packet");
  }
  for (const [batchRef, expected] of Object.entries(freeze.taskPayloadSha256ByBatch ?? {})) {
    await checkFile(path.join(auditDir, "task-payloads", "v2.0", `${batchRef}.txt`), expected, "task_payload");
  }
  if (freeze.bindings?.canonicalPriorCasesSha256) {
    await checkFile(
      path.join(repoRoot, "docs/specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1/cases-v1.json"),
      freeze.bindings.canonicalPriorCasesSha256,
      "canonical_prior_cases",
    );
  }
  if (freeze.bindings?.canonicalPriorExpectedSha256) {
    await checkFile(
      path.join(repoRoot, "docs/specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1/expected-v1.json"),
      freeze.bindings.canonicalPriorExpectedSha256,
      "canonical_prior_expected",
    );
  }
  return { passed: errors.length === 0, freezeSha256: sha256(freezeDocument.raw), errors };
}

export async function assertBaseFreezeIntegrity(freezeValue = null) {
  const result = await verifyBaseFreezeIntegrity(freezeValue);
  if (!result.passed) throw new Error(`Base freeze integrity failed: ${JSON.stringify(result.errors)}`);
  return result;
}

export async function verifyRevisionFreezeIntegrity(revisionValue = null) {
  const base = await assertBaseFreezeIntegrity();
  const revisionPath = path.join(specDir, "revision-freeze-v2.1.json");
  const revisionDocument = revisionValue
    ? { value: revisionValue, raw: await readText(revisionPath) }
    : await readJson(revisionPath);
  const revision = revisionDocument.value;
  const errors = [];
  const check = async (filePath, expected, code) => {
    if (!(await exists(filePath))) {
      errors.push({ code: `${code}_missing`, file: relativePath(filePath) });
      return;
    }
    const actual = sha256(await readText(filePath));
    if (actual !== expected) errors.push({ code: `${code}_hash_mismatch`, file: relativePath(filePath), expected, actual });
  };
  const baseFreezeRaw = await readText(path.join(specDir, "freeze-manifest.json"));
  if (sha256(baseFreezeRaw) !== revision.baseFreezeSha256) errors.push({ code: "revision_base_freeze_hash_mismatch" });
  await check(path.join(auditDir, "runs", "round-1", "defect-selection.json"), revision.defectSelectionSha256, "revision_selection");
  await check(path.join(specDir, "prompt-v2.1.md"), revision.promptTemplateSha256, "revision_prompt");
  await check(path.join(auditDir, "task-payloads", "v2.1", "manifest.json"), revision.taskPayloadManifestSha256, "revision_task_manifest");
  await check(path.join(auditDir, "revision-leakage-report-v2.1.json"), revision.leakageReportSha256, "revision_leakage_report");
  for (const [batchRef, expected] of Object.entries(revision.exactTaskPayloadSha256ByBatch ?? {})) {
    await check(path.join(auditDir, "task-payloads", "v2.1", `${batchRef}.txt`), expected, "revision_task_payload");
  }
  const baseFreeze = JSON.parse(baseFreezeRaw);
  for (const [key, expected] of Object.entries(revision.unchangedBindings ?? {})) {
    if (baseFreeze.bindings[key] !== expected) errors.push({ code: "revision_unchanged_binding_mismatch", key });
  }
  const prompt = await readText(path.join(specDir, "prompt-v2.1.md"));
  if (prompt.includes("url-to-flow-prompt-v2.0") || !prompt.includes("url-to-flow-prompt-v2.1")) {
    errors.push({ code: "revision_prompt_version_text_invalid" });
  }
  return { passed: errors.length === 0, baseFreezeSha256: base.freezeSha256, revisionFreezeSha256: sha256(revisionDocument.raw), errors };
}

export async function assertRevisionFreezeIntegrity(revisionValue = null) {
  const result = await verifyRevisionFreezeIntegrity(revisionValue);
  if (!result.passed) throw new Error(`Revision freeze integrity failed: ${JSON.stringify(result.errors)}`);
  return result;
}

export async function collectExecutorEvidence() {
  const entries = [];
  for (const role of ["generator", "reviewer"]) {
    const root = path.join(auditDir, role === "generator" ? "runs" : "reviews");
    for (const filePath of await walkFiles(root)) {
      if (!/[/\\]round-[123][/\\]batch-[abc]\.json$/u.test(filePath)) continue;
      try {
        const { value } = await readJson(filePath);
        entries.push({
          role,
          file: relativePath(filePath),
          round: value.round ?? null,
          batchRef: value.batchRef ?? null,
          agentTaskId: value.executor?.agentTaskId ?? null,
        });
      } catch {
        entries.push({ role, file: relativePath(filePath), round: null, batchRef: null, agentTaskId: null });
      }
    }
  }
  const seen = new Map();
  const duplicates = [];
  for (const entry of entries) {
    if (!entry.agentTaskId) continue;
    if (seen.has(entry.agentTaskId)) duplicates.push({ agentTaskId: entry.agentTaskId, files: [seen.get(entry.agentTaskId), entry.file] });
    else seen.set(entry.agentTaskId, entry.file);
  }
  return {
    entries,
    missingIds: entries.filter((entry) => !entry.agentTaskId).map((entry) => entry.file),
    duplicates,
    passed: entries.every((entry) => entry.agentTaskId) && duplicates.length === 0,
  };
}

export async function assertExecutorIdAvailable(agentTaskId, targetFile) {
  const evidence = await collectExecutorEvidence();
  const conflict = evidence.entries.find(
    (entry) => entry.file !== relativePath(targetFile) && entry.agentTaskId === agentTaskId,
  );
  if (conflict) throw new Error(`Agent task ID already used by ${conflict.file}`);
}

export function resolvePointer(rootSchema, reference) {
  if (!reference.startsWith("#/")) throw new Error(`Only local refs are supported: ${reference}`);
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

export function schemaErrors(value, schema, rootSchema = schema, nodePath = "$", errors = []) {
  if (!schema || typeof schema !== "object") return errors;
  if (schema.$ref) {
    const resolved = resolvePointer(rootSchema, schema.$ref);
    if (!resolved) errors.push({ code: "schema_ref_missing", path: nodePath, ref: schema.$ref });
    else schemaErrors(value, resolved, rootSchema, nodePath, errors);
    return errors;
  }
  if (schema.allOf) {
    for (const entry of schema.allOf) schemaErrors(value, entry, rootSchema, nodePath, errors);
  }
  if (schema.anyOf) {
    const alternatives = schema.anyOf.map((entry) => {
      const candidate = [];
      schemaErrors(value, entry, rootSchema, nodePath, candidate);
      return candidate;
    });
    if (!alternatives.some((entry) => entry.length === 0)) {
      errors.push({ code: "schema_any_of", path: nodePath, alternatives });
      return errors;
    }
  }
  if (schema.oneOf) {
    const alternatives = schema.oneOf.map((entry) => {
      const candidate = [];
      schemaErrors(value, entry, rootSchema, nodePath, candidate);
      return candidate;
    });
    if (alternatives.filter((entry) => entry.length === 0).length !== 1) {
      errors.push({ code: "schema_one_of", path: nodePath, alternatives });
      return errors;
    }
  }
  if (Object.hasOwn(schema, "const") && !Object.is(value, schema.const)) {
    errors.push({ code: "schema_const", path: nodePath, expected: schema.const, actual: value });
  }
  if (schema.enum && !schema.enum.some((entry) => Object.is(entry, value))) {
    errors.push({ code: "schema_enum", path: nodePath, expected: schema.enum, actual: value });
  }
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = valueType(value);
    if (!allowed.some((type) => type === actual || (type === "number" && actual === "integer"))) {
      errors.push({ code: "schema_type", path: nodePath, expected: allowed, actual });
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
      const normalized = value.map(canonicalJson);
      if (new Set(normalized).size !== normalized.length) {
        errors.push({ code: "schema_unique_items", path: nodePath });
      }
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

export function sourceText(row) {
  return [row.title, row.detail]
    .filter((value) => typeof value === "string" && value.length > 0)
    .join("\n");
}

export function scheduleHasLiteralValue(sourceValue) {
  if (typeof sourceValue !== "string") return false;
  const value = sourceValue.trim();
  if (/^(?:day\s*)?\d+\s*(?:일차|주차|단계|회차|prompt)?$/iu.test(value)) return false;
  if (/^\d+주차(?:\s|$)/u.test(value)) return false;
  if (/\d{4}[./-]\d{1,2}(?:[./-]\d{1,2})?/u.test(value)) return true;
  if (/\d{1,2}\s*월\s*\d{1,2}\s*일/u.test(value)) return true;
  if (/\d+\s*(?:일|주|개월|달|년)\s*(?:에\s*)?(?:한\s*번|마다|간격|주기|회)/u.test(value)) return true;
  if (/(?:매일|매주|매월|매년|격주|격월)/u.test(value)) return true;
  if (/D[+-]\d+/iu.test(value)) return true;
  return false;
}

export function addError(errors, code, nodePath, detail = undefined) {
  errors.push({ code, path: nodePath, ...(detail === undefined ? {} : { detail }) });
}

export function sameSet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

export function semanticSignature(proposal) {
  return {
    state: proposal?.result?.state ?? null,
    reasonCode: proposal?.result?.reasonCode ?? null,
    disposition: proposal?.result?.disposition ?? null,
    sourceShape: proposal?.result?.sourceShape ?? null,
    lifeArea: proposal?.result?.lifeArea ?? null,
    planningPattern: proposal?.result?.planningPattern ?? null,
    primaryArtifact: proposal?.result?.primaryArtifact ?? null,
    items: (proposal?.items ?? []).map((item) => ({
      sourceRowRefs: [...(item.sourceRowRefs ?? [])].sort(),
      intent: item.intent,
      completionMode: item.completionMode,
      scheduleEvidencePresent: item.scheduleEvidence !== null,
      projectionTargets: (proposal?.projections ?? [])
        .filter((entry) => (entry.itemRefs ?? []).includes(item.itemRef))
        .map((entry) => entry.target)
        .sort(),
    })),
    omissions: (proposal?.omittedRows ?? [])
      .map((entry) => `${entry.sourceRowRef}|${entry.reasonCode}`)
      .sort(),
    uncertaintyCodes: [...(proposal?.review?.uncertaintyCodes ?? [])].sort(),
    humanCheckRowRefs: [...(proposal?.review?.humanCheckRowRefs ?? [])].sort(),
  };
}
