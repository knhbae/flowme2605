import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  globalThis.__FLOWME_REPO_ROOT__ ?? path.dirname(fileURLToPath(import.meta.url)),
  globalThis.__FLOWME_REPO_ROOT__ ? "." : "../..",
);
export const laneId = "url-to-flow-source-row-v3-hybrid-controller";
export const compilerVersion = "row-license-compiler-v3.0";
export const specDir = path.join(
  repoRoot,
  "docs",
  "specs",
  "2026-07-18-url-to-flow-prompt-lab-v3-hybrid",
);
export const auditDir = path.join(
  repoRoot,
  "docs",
  "content-audit",
  "2026-07-18-url-to-flow-prompt-lab-v3-hybrid",
);
export const v2SpecDir = path.join(
  repoRoot,
  "docs",
  "specs",
  "2026-07-18-url-to-flow-prompt-lab-v2-strict",
);
export const v2AuditDir = path.join(
  repoRoot,
  "docs",
  "content-audit",
  "2026-07-18-url-to-flow-prompt-lab-v2-strict",
);
export const expectedFrozenFiles = [
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v3-hybrid/spec.md",
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v3-hybrid/protocol-v3.json",
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v3-hybrid/row-license-rules-v3.json",
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v3-hybrid/review-rubric-v3.md",
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v3-hybrid/cases-v3.json",
  "scripts/content-audit/url-to-flow-strict-v3-hybrid-core.mjs",
  "scripts/content-audit/build-url-to-flow-strict-v3-hybrid.mjs",
  "scripts/content-audit/validate-url-to-flow-strict-v3-hybrid-reviews.mjs",
  "scripts/content-audit/url-to-flow-strict-v2-core.mjs",
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v2-strict/proposal-schema-v2.json",
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v2-strict/review-result-schema-v2.json",
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v2-strict/cases-v2.json",
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v2-strict/freeze-manifest.json",
  "docs/specs/2026-07-18-url-to-flow-prompt-lab-v2-strict/revision-freeze-v2.1.json",
  "docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v2-strict/runs/round-1/validation.json",
  "docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v2-strict/runs/round-1/defect-selection.json",
  "docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v2-strict/runs/round-2/validation.json",
  ...["round-1", "round-2"].flatMap((round) =>
    ["batch-a", "batch-b", "batch-c"].flatMap((batch) => [
      `docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v2-strict/raw/${round}/${batch}.txt`,
      `docs/content-audit/2026-07-18-url-to-flow-prompt-lab-v2-strict/runs/${round}/${batch}.json`,
    ]),
  ),
];

export const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export const canonicalJson = (value) => JSON.stringify(canonicalize(value));
export const canonicalSha256 = (value) => sha256(canonicalJson(value));

export function buildBlindReviewTask(rubric, reviewSchema, inputs) {
  return `You are an isolated blind FLOW reviewer. Use only the inline rubric, schema, and inputs.\n` +
    `Do not inspect files, tools, prior conversation, case IDs, compiler rules, or hidden expectations.\n` +
    `Review every input independently. Return exactly one bare JSON array in the same order.\n` +
    `Echo sampleRef, reviewInputSha256, and proposalFingerprint exactly.\n` +
    `Create exactly one itemVerdict per compiledProposal Item. These batches contain only the ten positive proposals.\n` +
    `Use verdict=keep with reasonCode=supported_as_written only when the Item is source-grounded and executable as written.\n` +
    `Every unsupportedSignals quote must be a literal substring at its path in compiledProposal.\n` +
    `Score all seven axes with integers 1-5 and add one concrete comment per axis.\n` +
    `Do not use Markdown fences or commentary.\n\n` +
    `<REVIEW_RUBRIC>\n${rubric}\n</REVIEW_RUBRIC>\n\n` +
    `<REVIEW_RESULT_SCHEMA_JSON>\n${JSON.stringify(reviewSchema, null, 2)}\n</REVIEW_RESULT_SCHEMA_JSON>\n\n` +
    `<BLIND_REVIEW_INPUTS_JSON>\n${JSON.stringify(inputs, null, 2)}\n</BLIND_REVIEW_INPUTS_JSON>\n`;
}

export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

export async function readJson(filePath) {
  const raw = await readText(filePath);
  return { raw, value: JSON.parse(raw) };
}

export async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

export async function writeOnceOrVerify(filePath, value) {
  if (await exists(filePath)) {
    const current = await readText(filePath);
    if (current !== value) {
      throw new Error(`Frozen evidence differs: ${relativePath(filePath)}`);
    }
    return;
  }
  await writeText(filePath, value);
}

export function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll("\\", "/");
}

function opaque(prefix, seed) {
  return `${prefix}-${sha256(`v3-hybrid|${seed}`).slice(0, 16)}`;
}

function remapCase(sourceCase) {
  const requestRef = opaque("req", sourceCase.requestRef);
  const sampleRef = opaque("smp", sourceCase.sampleRef);
  const generatorInput = sourceCase.generatorInput
    ? {
        ...sourceCase.generatorInput,
        requestRef,
        sampleRef,
        sourceOwnership: {
          primarySourceRef: opaque(
            "src",
            sourceCase.generatorInput.sourceOwnership.primarySourceRef,
          ),
          supportingSourceRefs:
            sourceCase.generatorInput.sourceOwnership.supportingSourceRefs.map((value) =>
              opaque("src", value),
            ),
        },
        sourceRows: sourceCase.generatorInput.sourceRows.map((row) => ({
          ...row,
          sourceRowRef: opaque("row", row.sourceRowRef),
          sourceRef: opaque("src", row.sourceRef),
        })),
      }
    : null;
  return {
    ...sourceCase,
    requestRef,
    sampleRef,
    generatorInput,
    preflightResult: sourceCase.generatorInput
      ? {
          ...sourceCase.preflightResult,
          modelInvoked: false,
          reasonCode: "deterministic_compiler_selected",
        }
      : sourceCase.preflightResult,
    v2Lineage: {
      sourceAuditCaseId: sourceCase.auditCaseId,
      semanticLineageSha256: sourceCase.semanticLineageSha256,
      preflightResultSha256: canonicalSha256(sourceCase.preflightResult),
    },
    semanticLineageSha256: canonicalSha256({
      source: sourceCase.semanticLineageSha256,
      generatorInput,
      preflightResult: sourceCase.preflightResult,
    }),
  };
}

export async function buildV3CaseSet() {
  const v2CasesPath = path.join(v2SpecDir, "cases-v2.json");
  const { raw: v2Raw, value: v2 } = await readJson(v2CasesPath);
  const cases = v2.cases.map(remapCase);
  return {
    caseSetVersion: "flowme-url-to-flow-v3-hybrid-cases",
    laneId,
    sourceCaseSet: relativePath(v2CasesPath),
    sourceCaseSetSha256: sha256(v2Raw),
    semanticCaseSetSha256: canonicalSha256(
      cases.map((entry) => ({
        auditCaseId: entry.auditCaseId,
        generatorInput: entry.generatorInput,
        preflightResult: entry.preflightResult,
      })),
    ),
    cases,
  };
}

function includesAny(value, terms) {
  return terms.some((term) => value.includes(term));
}

function classifyRow(row, rules) {
  if (row.rowType === "check") {
    const lexicon = rules.checkLexicon;
    if (includesAny(row.title, lexicon.decisionTerms)) return "decision";
    if (includesAny(row.title, lexicon.explicitActionTerms)) return "explicit_action";
    if (includesAny(row.title, lexicon.inspectionTerms)) return "inspection";
    return "noun_label";
  }
  if (row.rowType === "date") {
    return includesAny(row.title, rules.dateLexicon.explicitActionTerms)
      ? "explicit_action"
      : "value_label";
  }
  return null;
}

function rowRule(row, rules) {
  const rule = rules.rowTypeRules[row.rowType];
  if (!rule) return null;
  if (["check", "date"].includes(row.rowType)) {
    const classification = classifyRow(row, rules);
    return {
      ...rule[classification],
      ruleId: `${row.rowType}.${classification}`,
      classification,
    };
  }
  return {
    ...rule,
    ruleId: row.rowType,
    classification: row.rowType,
  };
}

function applyTitleOperation(title, operation, rules) {
  const policy = rules.titleOperations[operation];
  if (!policy) return null;
  if (policy.kind === "copy" && policy.suffix === "") return title;
  if (policy.kind === "append" && typeof policy.suffix === "string") {
    return `${title}${policy.suffix}`;
  }
  return null;
}

function firstScheduleEvidence(row, rules) {
  const values = [row.title, row.detail].filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  for (const entry of rules.schedulePatterns) {
    const expression = new RegExp(entry.pattern, "iu");
    for (const value of values) {
      const match = value.match(expression);
      if (match?.[0]) return { sourceText: match[0], kind: entry.kind };
    }
  }
  return null;
}

function artifactFor(items, eligibleRows, rules) {
  const policy = rules.artifactPolicy;
  if (items.some((item) => item.scheduleEvidence !== null)) return policy.literalSchedule;
  if (eligibleRows.every((row) => row.rowType === "table_row")) return policy.allTableRows;
  if (eligibleRows.every((row) => row.rowType === "resource")) {
    return eligibleRows.length === 1 ? policy.oneResource : policy.multipleResources;
  }
  return eligibleRows.length === 1 ? policy.oneOther : policy.multipleOther;
}

function blockedProposal(strictCase) {
  const expected = strictCase.preflightResult;
  return {
    schemaVersion: "flowme-semantic-proposal-v2",
    promptVersion: "deterministic-preflight-v2",
    requestRef: strictCase.requestRef,
    sampleRef: strictCase.sampleRef,
    result: {
      state: "blocked",
      reasonCode: expected.errorCode,
      disposition: expected.recommendedDisposition,
      primaryArtifact: null,
    },
    items: [],
    omittedRows: [],
    projections: [],
    review: { uncertaintyCodes: [], humanCheckRowRefs: [] },
  };
}

export function compileStrictCase(strictCase, rules) {
  if (!strictCase.generatorInput) {
    return {
      proposal: blockedProposal(strictCase),
      trace: {
        compilerVersion,
        rulesVersion: rules.rulesVersion,
        modelInvoked: false,
        dispositionRuleId: `preflight.${strictCase.preflightResult.errorCode}`,
        items: [],
        omissions: [],
      },
    };
  }

  const input = strictCase.generatorInput;
  const supporting = new Set(input.sourceOwnership.supportingSourceRefs);
  const eligibleRows = input.sourceRows.filter(
    (row) => row.rowType !== "reference" && !supporting.has(row.sourceRef),
  );
  const items = [];
  const itemTrace = [];
  const omittedRows = [];
  const omissionTrace = [];
  const uncertaintyCodes = [];
  const humanCheckRowRefs = [];

  const addUncertainty = (code, rowRef) => {
    if (!uncertaintyCodes.includes(code)) uncertaintyCodes.push(code);
    if (!humanCheckRowRefs.includes(rowRef)) humanCheckRowRefs.push(rowRef);
  };

  for (const row of input.sourceRows) {
    const supportingOrReference =
      row.rowType === "reference" || supporting.has(row.sourceRef);
    if (supportingOrReference) {
      omittedRows.push({
        sourceRowRef: row.sourceRowRef,
        reasonCode: supporting.has(row.sourceRef)
          ? "supporting_source_boundary"
          : "reference_only",
      });
      omissionTrace.push({
        sourceRowRef: row.sourceRowRef,
        ruleId: supporting.has(row.sourceRef)
          ? "ownership.supporting_source"
          : "row_type.reference",
      });
      if (supporting.has(row.sourceRef)) {
        addUncertainty(rules.reviewMarkerPolicy.supportingSource, row.sourceRowRef);
      }
      continue;
    }

    const rule = rowRule(row, rules);
    if (!rule?.titleOp || !rule.intent || !rule.completionMode) {
      throw new Error(
        `No deterministic row rule for ${row.rowType}; disposition=${rules.unknownRuleDisposition}`,
      );
    }
    const itemRef = `item-${String(items.length + 1).padStart(2, "0")}`;
    const schedule = firstScheduleEvidence(row, rules);
    const item = {
      itemRef,
      sourceRowRefs: [row.sourceRowRef],
      title: applyTitleOperation(row.title, rule.titleOp, rules),
      intent: rule.intent,
      completionMode: rule.completionMode,
      memo:
        row.rowType === "procedure" && typeof row.detail === "string"
          ? row.detail
          : null,
      scheduleEvidence: schedule
        ? {
            sourceRowRefs: [row.sourceRowRef],
            sourceText: schedule.sourceText,
            kind: schedule.kind,
          }
        : null,
    };
    items.push(item);
    itemTrace.push({
      itemRef,
      sourceRowRef: row.sourceRowRef,
      ruleId: rule.ruleId,
      titleOp: rule.titleOp,
      intent: rule.intent,
      completionMode: rule.completionMode,
      sourceTitleSha256: sha256(row.title),
      compiledItemSha256: canonicalSha256(item),
    });

    if (row.rowType === "resource") {
      addUncertainty(rules.reviewMarkerPolicy.resource, row.sourceRowRef);
    }
    if (row.rowType === "date" && !schedule) {
      addUncertainty(rules.reviewMarkerPolicy.dateWithoutValue, row.sourceRowRef);
    }
  }

  if (items.length !== eligibleRows.length || items.length === 0) {
    throw new Error("Frozen v3 profile requires one Item per eligible row");
  }
  const primaryArtifact = artifactFor(items, eligibleRows, rules);
  const proposal = {
    schemaVersion: "flowme-semantic-proposal-v2",
    promptVersion: compilerVersion,
    requestRef: strictCase.requestRef,
    sampleRef: strictCase.sampleRef,
    result: {
      state: "proposal",
      reasonCode: null,
      disposition: "review",
      primaryArtifact,
    },
    items,
    omittedRows,
    projections: [
      { target: primaryArtifact, itemRefs: items.map((item) => item.itemRef) },
    ],
    review: { uncertaintyCodes, humanCheckRowRefs },
  };
  return {
    proposal,
    trace: {
      compilerVersion,
      rulesVersion: rules.rulesVersion,
      modelInvoked: false,
      artifactRuleId: `artifact.${primaryArtifact}`,
      items: itemTrace,
      omissions: omissionTrace,
      proposalSha256: canonicalSha256(proposal),
    },
  };
}

export async function loadRules() {
  return (await readJson(path.join(specDir, "row-license-rules-v3.json"))).value;
}

export async function loadCases() {
  return (await readJson(path.join(specDir, "cases-v3.json"))).value;
}

export async function loadProtocol() {
  return (await readJson(path.join(specDir, "protocol-v3.json"))).value;
}

export async function loadSchema() {
  return (await readJson(path.join(v2SpecDir, "proposal-schema-v2.json"))).value;
}

export async function verifyFreezeIntegrity() {
  const freezePath = path.join(specDir, "freeze-manifest.json");
  if (!(await exists(freezePath))) {
    return { passed: false, errors: [{ code: "freeze_missing" }] };
  }
  const { raw, value } = await readJson(freezePath);
  const errors = [];
  if (value.freezeVersion !== "flowme-url-to-flow-v3-hybrid-freeze") {
    errors.push({ code: "freeze_version_mismatch" });
  }
  if (value.laneId !== laneId) errors.push({ code: "freeze_lane_mismatch" });
  if (value.frozenBeforeExecution !== true) {
    errors.push({ code: "freeze_not_preregistered" });
  }
  if (value.evidenceClass !== "deterministic_controller_replay") {
    errors.push({ code: "freeze_evidence_class_mismatch" });
  }
  if (value.compilerVersion !== compilerVersion) {
    errors.push({ code: "freeze_compiler_version_mismatch" });
  }
  if (
    value.caseCount !== 12 ||
    value.positiveCount !== 10 ||
    value.negativeCount !== 2
  ) {
    errors.push({ code: "freeze_case_counts_mismatch" });
  }
  const frozenEntries = Array.isArray(value.frozenFiles) ? value.frozenFiles : [];
  const frozenNames = frozenEntries.map((entry) => entry?.file);
  if (
    frozenNames.length !== expectedFrozenFiles.length ||
    new Set(frozenNames).size !== frozenNames.length ||
    frozenNames.some((name, index) => name !== expectedFrozenFiles[index])
  ) {
    errors.push({
      code: "freeze_exact_file_inventory_mismatch",
      expected: expectedFrozenFiles,
      actual: frozenNames,
    });
  }
  const repoPrefix = `${path.resolve(repoRoot)}${path.sep}`;
  for (const entry of frozenEntries) {
    if (
      !entry ||
      typeof entry.file !== "string" ||
      typeof entry.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(entry.sha256)
    ) {
      errors.push({ code: "frozen_file_entry_invalid", entry });
      continue;
    }
    const absolute = path.resolve(repoRoot, entry.file);
    if (!absolute.startsWith(repoPrefix)) {
      errors.push({ code: "frozen_file_outside_repo", file: entry.file });
      continue;
    }
    if (!(await exists(absolute))) {
      errors.push({ code: "frozen_file_missing", file: entry.file });
      continue;
    }
    const actual = sha256(await fs.readFile(absolute));
    if (actual !== entry.sha256) {
      errors.push({
        code: "frozen_file_hash_mismatch",
        file: entry.file,
        expected: entry.sha256,
        actual,
      });
    }
  }
  const casesPath = path.join(specDir, "cases-v3.json");
  if (await exists(casesPath)) {
    const caseSet = (await readJson(casesPath)).value;
    if (
      caseSet.laneId !== laneId ||
      !Array.isArray(caseSet.cases) ||
      caseSet.cases.length !== 12 ||
      caseSet.semanticCaseSetSha256 !== value.semanticCaseSetSha256
    ) {
      errors.push({ code: "freeze_case_set_contract_mismatch" });
    }
  }
  const round1ValidationPath = path.join(v2AuditDir, "runs", "round-1", "validation.json");
  const round2ValidationPath = path.join(v2AuditDir, "runs", "round-2", "validation.json");
  if ((await exists(round1ValidationPath)) && (await exists(round2ValidationPath))) {
    const round1 = (await readJson(round1ValidationPath)).value;
    const round2 = (await readJson(round2ValidationPath)).value;
    const binding = value.v2NoGoBinding ?? {};
    if (
      round1.passed !== false ||
      round2.passed !== false ||
      round1.summary?.passedOutputCount !== 11 ||
      round2.summary?.passedOutputCount !== 11 ||
      binding.round1Passed !== false ||
      binding.round2Passed !== false ||
      binding.round1PassedOutputCount !== 11 ||
      binding.round2PassedOutputCount !== 11 ||
      binding.round1ValidationFile !== relativePath(round1ValidationPath) ||
      binding.round2ValidationFile !== relativePath(round2ValidationPath) ||
      binding.round1ValidationSha256 !== sha256(await readText(round1ValidationPath)) ||
      binding.round2ValidationSha256 !== sha256(await readText(round2ValidationPath)) ||
      binding.round3Disposition !== "not_run_gate_forbidden"
    ) {
      errors.push({ code: "v2_nogo_binding_mismatch" });
    }
  }
  async function directoryHasFiles(directory) {
    if (!(await exists(directory))) return false;
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name);
      if (entry.isFile()) return true;
      if (entry.isDirectory() && (await directoryHasFiles(child))) return true;
    }
    return false;
  }
  const forbiddenRound3Directories = [
    path.join(v2AuditDir, "raw", "round-3"),
    path.join(v2AuditDir, "runs", "round-3"),
    path.join(v2AuditDir, "review-raw", "round-3"),
    path.join(v2AuditDir, "reviews", "round-3"),
  ];
  for (const directory of forbiddenRound3Directories) {
    if (await directoryHasFiles(directory)) {
      errors.push({ code: "v2_round3_evidence_forbidden", directory: relativePath(directory) });
    }
  }
  return { passed: errors.length === 0, freezeSha256: sha256(raw), value, errors };
}

export async function assertFreezeIntegrity() {
  const result = await verifyFreezeIntegrity();
  if (!result.passed) {
    throw new Error(`v3 freeze integrity failed: ${JSON.stringify(result.errors)}`);
  }
  return result;
}

export function proposalFingerprint(proposal) {
  return canonicalSha256(proposal);
}
