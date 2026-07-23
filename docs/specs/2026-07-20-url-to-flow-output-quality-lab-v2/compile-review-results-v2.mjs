#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculateProjectionPayloadRetention,
  loadContext,
  recomputeReviewMetrics,
  validateComparison,
  validateRawReviewProvenance,
  validateReviewResults,
  validateRound,
} from "./validate-output-quality-v2.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const runsDirectory = path.join(here, "runs");
const decisionsDirectory = path.join(here, "independent-decisions");
const correctionTimingFile = path.join(here, "correction-timing-v2.json");
const reviewOutputFile = path.join(here, "review-results-v2.json");
const comparisonOutputFile = path.join(here, "comparison-v2.json");
const classificationComparisonOutputFile = path.join(
  here,
  "classification-comparison-v2.json",
);

const reviewerLanes = [
  "rules_first",
  "low_cost_independent",
  "high_capability_independent",
];
const independentProfiles = {
  low_cost_independent: "low_cost_agent",
  high_capability_independent: "high_capability_agent",
};
const classificationAxes = [
  "primaryLifeArea",
  "sourceShape",
  "primaryExecutionPattern",
  "primaryArtifact",
];
const dispositionFields = [
  "generationState",
  "outcome",
  "conversionReadiness",
  "executableAllowed",
  "publicExportAllowed",
];
const gateFields = [
  "discoveryAccess",
  "rowAccess",
  "sourceRowStatus",
  "rightsBasis",
  "allowedUse",
  "freshnessReview",
  "localeReview",
  "safetyReview",
  "privacyReview",
  "rightsReview",
  "promotionState",
  "blockers",
];
const canonicalDispositionValues = {
  generationState: new Set(["completed", "failed"]),
  outcome: new Set(["proposal", "no_proposal", "rejected"]),
  conversionReadiness: new Set([
    "ready_for_internal_canary",
    "ready_second_wave",
    "source_import_required",
    "hold",
  ]),
};
const correctionTimingType = "flowme_correction_timing_ledger";
const correctionTimingVersion = "flowme-correction-timing-ledger-v2";
const measuredCorrectionKind = "measured_independent_agent_review";
const correctionMeasurementMethod = "wall_clock_cli_start_stop";
const adjudicationEditLevels = new Set([
  "none",
  "minor",
  "major",
  "full_regeneration",
]);

class CompilationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "CompilationError";
    this.details = details;
  }
}

function assert(condition, message, details = []) {
  if (!condition) throw new CompilationError(message, details);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new CompilationError(`JSON을 읽을 수 없습니다: ${relative(file)}`, [
      error.message,
    ]);
  }
}

function writeJson(file, value) {
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, file);
}

function collectJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectJsonFiles(target);
      return entry.isFile() && entry.name.endsWith(".json") ? [target] : [];
    })
    .sort();
}

function relative(file) {
  return path.relative(here, file).replaceAll("\\", "/");
}

function unique(values) {
  return new Set(values).size === values.length;
}

function sameSet(left = [], right = []) {
  if (
    !Array.isArray(left) ||
    !Array.isArray(right) ||
    left.length !== right.length
  ) {
    return false;
  }
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sortedUnique(values = []) {
  return [...new Set(Array.isArray(values) ? values : [])].sort();
}

function loadCorrectionTimingLedger(
  manifest,
  ledgerFile = correctionTimingFile,
) {
  assert(
    fs.existsSync(ledgerFile),
    `correction timing ledger가 없습니다: ${relative(ledgerFile)}`,
  );
  const ledger = readJson(ledgerFile);
  const issues = [];
  if (ledger.documentType !== correctionTimingType) {
    issues.push("documentType 불일치");
  }
  if (ledger.schemaVersion !== correctionTimingVersion) {
    issues.push("schemaVersion 불일치");
  }
  if (ledger.caseSetVersion !== manifest.caseSetVersion) {
    issues.push("caseSetVersion이 manifest와 다름");
  }
  if (!Array.isArray(ledger.entries)) issues.push("entries 배열 누락");
  if (ledger.activeSession !== null) {
    issues.push(
      `측정 중인 activeSession이 남아 있음: ${ledger.activeSession?.roundId ?? "unknown"}/${ledger.activeSession?.caseId ?? "unknown"}`,
    );
  }
  const manifestIds = new Set(manifest.cases.map((entry) => entry.caseId));
  const keys = [];
  for (const [index, entry] of (ledger.entries ?? []).entries()) {
    const at = `entries[${index}]`;
    keys.push(`${entry.roundId}:${entry.caseId}`);
    if (!/^round-[1-4]$/.test(entry.roundId ?? "")) {
      issues.push(`${at}.roundId 비표준 값`);
    }
    if (!manifestIds.has(entry.caseId)) issues.push(`${at}.caseId가 manifest에 없음`);
    if (entry.kind !== measuredCorrectionKind) issues.push(`${at}.kind 불일치`);
    const startedMs = Date.parse(entry.startedAt);
    const endedMs = Date.parse(entry.endedAt);
    if (!Number.isFinite(startedMs)) issues.push(`${at}.startedAt 유효하지 않음`);
    if (!Number.isFinite(endedMs)) issues.push(`${at}.endedAt 유효하지 않음`);
    if (
      !Number.isFinite(entry.elapsedSeconds) ||
      entry.elapsedSeconds < 0
    ) {
      issues.push(`${at}.elapsedSeconds 유효하지 않음`);
    }
    if (
      Number.isFinite(startedMs) &&
      Number.isFinite(endedMs) &&
      Number.isFinite(entry.elapsedSeconds) &&
      Math.abs((endedMs - startedMs) / 1000 - entry.elapsedSeconds) > 0.001
    ) {
      issues.push(`${at}.elapsedSeconds가 wall-clock timestamp 간격과 다름`);
    }
    if (typeof entry.reviewerId !== "string" || !entry.reviewerId.trim()) {
      issues.push(`${at}.reviewerId 누락`);
    }
    if (entry.measurementMethod !== correctionMeasurementMethod) {
      issues.push(`${at}.measurementMethod 불일치`);
    }
    if (!adjudicationEditLevels.has(entry.editLevel)) {
      issues.push(`${at}.editLevel 비표준 값`);
    }
    if (typeof entry.notes !== "string") issues.push(`${at}.notes는 문자열이어야 함`);
  }
  if (!unique(keys)) issues.push("같은 roundId/caseId correction entry가 중복됨");
  assert(
    issues.length === 0,
    "correction timing ledger가 유효하지 않습니다.",
    issues,
  );
  return {
    ledger,
    byRoundAndCase: new Map(
      ledger.entries.map((entry) => [
        `${entry.roundId}:${entry.caseId}`,
        entry,
      ]),
    ),
  };
}

function coreClassification(value) {
  return Object.fromEntries(
    classificationAxes.map((field) => [field, value?.[field] ?? null]),
  );
}

function disposition(value) {
  return Object.fromEntries(
    dispositionFields.map((field) => [field, value?.[field] ?? null]),
  );
}

function gateDecision(classification) {
  return {
    discoveryAccess: classification?.access?.discoveryAccess ?? null,
    rowAccess: classification?.access?.rowAccess ?? null,
    sourceRowStatus: classification?.review?.sourceRowStatus ?? null,
    rightsBasis: classification?.rights?.basis ?? null,
    allowedUse: sortedUnique(classification?.rights?.allowedUse),
    freshnessReview: classification?.review?.freshnessReview ?? null,
    localeReview: classification?.review?.localeReview ?? null,
    safetyReview: classification?.review?.safetyReview ?? null,
    privacyReview: classification?.review?.privacyReview ?? null,
    rightsReview:
      classification?.review?.rightsReview ??
      classification?.rights?.reviewStatus ??
      null,
    promotionState: classification?.review?.promotionState ?? null,
    blockers: sortedUnique(classification?.review?.blockers),
  };
}

function normalizedGate(value) {
  return Object.fromEntries(
    gateFields.map((field) => [
      field,
      ["allowedUse", "blockers"].includes(field)
        ? sortedUnique(value?.[field])
        : (value?.[field] ?? null),
    ]),
  );
}

function roleMap(assignments = []) {
  const entries = Array.isArray(assignments)
    ? assignments.map((entry) => [entry.sourceRowId, entry.role])
    : [];
  return new Map(entries);
}

function roleDecisionEqual(actualAssignments, goldCase) {
  const actual = roleMap(actualAssignments);
  const expected = new Map(
    goldCase.expectedRoleByRow.map((entry) => [entry.sourceRowId, entry.role]),
  );
  if (actual.size !== expected.size) return false;
  return [...expected].every(
    ([sourceRowId, role]) => actual.get(sourceRowId) === role,
  );
}

function sourceRoleAccountingPass(assignments, goldCase) {
  const actual = Array.isArray(assignments)
    ? assignments.map((entry) => entry.sourceRowId)
    : [];
  const expected = goldCase.expectedRoleByRow.map(
    (entry) => entry.sourceRowId,
  );
  return unique(actual) && sameSet(actual, expected);
}

function decisionShapeIssues(document, manifest, profile, roundId) {
  const issues = [];
  const manifestIds = manifest.cases.map((entry) => entry.caseId);
  if (document.roundId !== roundId) issues.push(`roundId=${document.roundId ?? "누락"}`);
  if (document.profile !== profile) issues.push(`profile=${document.profile ?? "누락"}`);
  if (document.caseSetVersion !== manifest.caseSetVersion) {
    issues.push(
      `caseSetVersion=${document.caseSetVersion ?? "누락"} (expected ${manifest.caseSetVersion})`,
    );
  }
  if (document.blind !== true) issues.push("blind=true 누락");
  if (document.modelEvidence?.actualApiCostMeasured === true) {
    issues.push("세션 에이전트 문서가 실제 provider API 비용 측정을 주장함");
  }
  if (!Array.isArray(document.decisions)) {
    issues.push("decisions 배열 누락");
    return issues;
  }
  const ids = document.decisions.map((entry) => entry.caseId);
  if (!unique(ids) || !sameSet(ids, manifestIds)) {
    issues.push(`decisions가 manifest ${manifestIds.length}건과 정확히 일치하지 않음`);
  }
  for (const decision of document.decisions) {
    const prefix = decision.caseId ?? "caseId 누락";
    if (!decision.feasibility || typeof decision.feasibility !== "object") {
      issues.push(`${prefix}: feasibility 누락`);
    } else {
      for (const [field, allowed] of Object.entries(canonicalDispositionValues)) {
        if (!allowed.has(decision.feasibility[field])) {
          issues.push(`${prefix}: feasibility.${field} 비표준 값`);
        }
      }
      for (const field of ["executableAllowed", "publicExportAllowed"]) {
        if (typeof decision.feasibility[field] !== "boolean") {
          issues.push(`${prefix}: feasibility.${field} boolean 누락`);
        }
      }
    }
    if (!decision.classification || typeof decision.classification !== "object") {
      issues.push(`${prefix}: classification 누락`);
    } else {
      for (const field of ["access", "rights", "review"]) {
        if (
          !decision.classification[field] ||
          typeof decision.classification[field] !== "object" ||
          Array.isArray(decision.classification[field])
        ) {
          issues.push(`${prefix}: classification.${field} canonical 중첩 객체 누락`);
        }
      }
    }
    if (!Array.isArray(decision.roles)) {
      issues.push(`${prefix}: roles 배열 누락`);
    }
  }
  return issues;
}

function selectIndependentDocument(
  allDecisionDocuments,
  manifest,
  roundId,
  profile,
) {
  const candidates = allDecisionDocuments.filter(
    (entry) =>
      entry.document.roundId === roundId && entry.document.profile === profile,
  );
  assert(
    candidates.length > 0,
    `${roundId}의 ${profile} 독립 판정 문서가 아직 없습니다.`,
    [
      "보조 repair 문서는 roundId/profile/18 decisions 정식 계약을 만족하지 않으므로 사용하지 않습니다.",
    ],
  );
  const evaluated = candidates.map((entry) => ({
    ...entry,
    issues: decisionShapeIssues(entry.document, manifest, profile, roundId),
  }));
  const eligible = evaluated.filter((entry) => entry.issues.length === 0);
  assert(
    eligible.length === 1,
    `${roundId}의 ${profile} 정식 독립 판정 문서는 정확히 1개여야 합니다. 현재 ${eligible.length}개입니다.`,
    evaluated.flatMap((entry) =>
      entry.issues.length
        ? entry.issues.map((issue) => `${relative(entry.file)}: ${issue}`)
        : [`${relative(entry.file)}: 정식 후보`],
    ),
  );
  return eligible[0];
}

function discoverRounds(runDocuments) {
  const roundIds = [...new Set(runDocuments.map((entry) => entry.document.roundId))]
    .filter((roundId) => /^round-[1-4]$/.test(roundId ?? ""))
    .sort((left, right) => Number(left.slice(6)) - Number(right.slice(6)));
  assert(
    roundIds.length >= 2 && roundIds.length <= 4,
    `review 컴파일에는 2~4개 라운드가 필요합니다. 현재 ${roundIds.length}개입니다.`,
  );
  const expected = ["round-1", "round-2", "round-3", "round-4"].slice(
    0,
    roundIds.length,
  );
  assert(
    deepEqual(roundIds, expected),
    `라운드는 round-1부터 연속이어야 합니다: ${roundIds.join(", ")}`,
  );
  return roundIds;
}

function rulesOutputsForRound(runDocuments, manifest, roundId) {
  const matching = runDocuments.filter(
    (entry) => entry.document.roundId === roundId,
  );
  assert(matching.length > 0, `${roundId} rules run 문서가 없습니다.`);
  const outputs = matching.flatMap((entry) => entry.document.outputs ?? []);
  const actualIds = outputs.map((entry) => entry.caseId);
  const expectedIds = manifest.cases.map((entry) => entry.caseId);
  assert(
    unique(actualIds) && sameSet(actualIds, expectedIds),
    `${roundId} rules output은 manifest 18건과 정확히 일치해야 합니다.`,
    matching.map((entry) => relative(entry.file)),
  );
  return new Map(outputs.map((entry) => [entry.caseId, entry]));
}

function independentDecisions(document) {
  return new Map(document.decisions.map((entry) => [entry.caseId, entry]));
}

function laneRawEvidence(lane, rulesOutput, decision) {
  if (lane === "rules_first") {
    return {
      classification: rulesOutput.classification.taxonomy,
      gateClassification: rulesOutput.classification,
      feasibility: rulesOutput.feasibility,
      roles: rulesOutput.sourceEvidence.roleAssignments,
    };
  }
  return {
    classification: decision.classification,
    gateClassification: decision.classification,
    feasibility: decision.feasibility,
    roles: decision.roles,
  };
}

function disagreementReasons(raw, goldCase) {
  const reasons = [];
  const actualCore = coreClassification(raw.classification);
  const expectedCore = coreClassification(goldCase.expectedClassification);
  for (const axis of classificationAxes) {
    if (actualCore[axis] !== expectedCore[axis]) {
      reasons.push(
        `${axis}: ${String(actualCore[axis])} -> ${String(expectedCore[axis])}`,
      );
    }
  }
  const actualDisposition = disposition(raw.feasibility);
  const expectedDisposition = disposition(goldCase.expectedDisposition);
  for (const field of dispositionFields) {
    if (actualDisposition[field] !== expectedDisposition[field]) {
      reasons.push(
        `${field}: ${String(actualDisposition[field])} -> ${String(expectedDisposition[field])}`,
      );
    }
  }
  const actualGate = normalizedGate(gateDecision(raw.gateClassification));
  const expectedGate = normalizedGate(gateDecision(goldCase.expectedClassification));
  for (const field of gateFields) {
    if (!deepEqual(actualGate[field], expectedGate[field])) {
      reasons.push(`${field}: gold gate와 불일치`);
    }
  }
  if (!sourceRoleAccountingPass(raw.roles, goldCase)) {
    reasons.push("SourceRow accounting: 행 집합 누락 또는 중복");
  } else if (!roleDecisionEqual(raw.roles, goldCase)) {
    reasons.push("SourceRow role: gold role과 불일치");
  }
  return reasons;
}

function projectionRetention(output, goldCase) {
  const result = calculateProjectionPayloadRetention(output, goldCase);
  return {
    expected: result.expectedCount,
    retained: result.retainedCount,
    rate: result.retentionRate,
    pass: result.pass,
    byProjection: result.byProjection,
  };
}

function projectionPayloadLosses(retention) {
  return Object.entries(retention.byProjection ?? {}).flatMap(
    ([artifact, result]) =>
      result.missingFields?.length
        ? [`${artifact}: ${result.missingFields.join(", ")}`]
        : [],
  );
}

function itemCount(output) {
  return Array.isArray(output?.canonicalDraft?.items)
    ? output.canonicalDraft.items.length
    : 0;
}

function makeReview({ roundId, lane, manifestCase, goldCase, raw, rulesOutput }) {
  const disagreements = disagreementReasons(raw, goldCase);
  const isRulesLane = lane === "rules_first";
  const retention = isRulesLane
    ? projectionRetention(rulesOutput, goldCase)
    : { expected: 0, retained: 0, rate: 0 };
  const payloadLosses = isRulesLane
    ? projectionPayloadLosses(retention)
    : [];
  return {
    reviewId: `${roundId}-${lane}-${manifestCase.caseId}`,
    caseId: manifestCase.caseId,
    reviewerLane: lane,
    independent: !isRulesLane,
    evidenceKind: isRulesLane
      ? "deterministic_qa"
      : "independent_agent_review",
    classification: coreClassification(raw.classification),
    disposition: disposition(raw.feasibility),
    gateDecision: gateDecision(raw.gateClassification),
    sourceRoleAccountingPass: sourceRoleAccountingPass(raw.roles, goldCase),
    unsupportedInferenceCount: 0,
    essentialProjectionRetentionRate: retention.rate,
    checkableItems: isRulesLane ? itemCount(rulesOutput) : 0,
    nonCheckableItems: 0,
    blockingDisagreement: disagreements.length > 0,
    disagreementReasons: disagreements,
    notes: isRulesLane
      ? payloadLosses.length
        ? `Rules run의 raw envelope를 그대로 집계했다. 실제 payload semantic loss: ${payloadLosses.join(" | ")}.`
        : "Rules run의 raw envelope를 그대로 집계했다. Item 수와 projection retention은 실제 생성 payload의 semantic evidence에서 계산했다."
      : "독립 blind decision의 raw 분류·feasibility·gate·SourceRow role을 그대로 집계했다. 생성 payload가 없는 classification-only lane이므로 Item/retention은 측정하지 않았다.",
  };
}

function makeCorrectionTimeEvidence(reviewSchema, timingEntry) {
  const property =
    reviewSchema?.$defs?.adjudication?.properties?.correctionTimeEvidence;
  assert(
    property || !timingEntry,
    "측정된 correction timing이 있지만 review schema가 correctionTimeEvidence를 지원하지 않습니다.",
  );
  if (!property) return null;
  if (timingEntry) {
    return {
      kind: timingEntry.kind,
      startedAt: timingEntry.startedAt,
      endedAt: timingEntry.endedAt,
      elapsedSeconds: timingEntry.elapsedSeconds,
      reviewerId: timingEntry.reviewerId,
      measurementMethod: timingEntry.measurementMethod,
    };
  }
  return {
    kind: "not_available",
    startedAt: null,
    endedAt: null,
    elapsedSeconds: null,
    reviewerId: null,
    measurementMethod: null,
  };
}

export function resolveReviewedEditLevel({
  roundId,
  goldAdjudicatedEditLevel,
  timingEntry,
}) {
  if (!timingEntry) {
    return {
      editLevel: goldAdjudicatedEditLevel,
      acceptedTimingEntry: null,
      historicalTimingConflict: false,
      copyOnlyMinor: false,
    };
  }
  const copyOnlyMinor =
    goldAdjudicatedEditLevel === "none" && timingEntry.editLevel === "minor";
  if (
    timingEntry.editLevel === goldAdjudicatedEditLevel ||
    copyOnlyMinor
  ) {
    return {
      editLevel: copyOnlyMinor ? "minor" : goldAdjudicatedEditLevel,
      acceptedTimingEntry: timingEntry,
      historicalTimingConflict: false,
      copyOnlyMinor,
    };
  }
  if (["round-1", "round-2"].includes(roundId)) {
    return {
      editLevel: goldAdjudicatedEditLevel,
      acceptedTimingEntry: null,
      historicalTimingConflict: true,
      copyOnlyMinor: false,
    };
  }
  throw new CompilationError(
    "측정 editLevel이 gold adjudication 구조와 모순됩니다.",
    [
      `ledger=${timingEntry.editLevel}`,
      `gold-adjudicated=${goldAdjudicatedEditLevel}`,
      "구조가 같은 상태에서 허용되는 추가 판정은 copy-only minor뿐입니다.",
    ],
  );
}

function makeAdjudication({
  roundId,
  manifestCase,
  goldCase,
  rulesOutput,
  reviewSchema,
  timingEntry,
}) {
  const rawCore = coreClassification(rulesOutput.classification.taxonomy);
  const finalCore = coreClassification(goldCase.expectedClassification);
  const rawDisposition = disposition(rulesOutput.feasibility);
  const finalDisposition = disposition(goldCase.expectedDisposition);
  const rawGate = normalizedGate(gateDecision(rulesOutput.classification));
  const finalGate = normalizedGate(gateDecision(goldCase.expectedClassification));
  const rolesMatch = roleDecisionEqual(
    rulesOutput.sourceEvidence.roleAssignments,
    goldCase,
  );
  const retention = projectionRetention(rulesOutput, goldCase);
  const payloadLosses = projectionPayloadLosses(retention);
  const essentialPayloadLoss = retention.retained < retention.expected;
  const major =
    !deepEqual(rawCore, finalCore) ||
    !deepEqual(rawDisposition, finalDisposition) ||
    !rolesMatch ||
    essentialPayloadLoss;
  const minor = !major && !deepEqual(rawGate, finalGate);
  const goldAdjudicatedEditLevel = major ? "major" : minor ? "minor" : "none";
  let resolution;
  try {
    resolution = resolveReviewedEditLevel({
      roundId,
      goldAdjudicatedEditLevel,
      timingEntry,
    });
  } catch (error) {
    if (error instanceof CompilationError) {
      throw new CompilationError(
        `${manifestCase.caseId}의 ${error.message}`,
        error.details,
      );
    }
    throw error;
  }
  const {
    acceptedTimingEntry,
    copyOnlyMinor,
    editLevel,
    historicalTimingConflict,
  } = resolution;
  const generated = itemCount(rulesOutput);
  const correctionTimeEvidence = makeCorrectionTimeEvidence(
    reviewSchema,
    acceptedTimingEntry,
  );
  const historicalConflictReasons = historicalTimingConflict
    ? [
        `stopwatch editLevel ${timingEntry.editLevel} != actual payload adjudication ${goldAdjudicatedEditLevel}`,
        ...payloadLosses.map((loss) => `payload semantic loss: ${loss}`),
      ]
    : [];
  const adjudication = {
    caseId: manifestCase.caseId,
    finalClassification: finalCore,
    finalDisposition,
    finalGateDecision: gateDecision(goldCase.expectedClassification),
    checkableItems: generated,
    nonCheckableItems: 0,
    unsupportedInferenceCount: 0,
    essentialFieldChecks: {
      expected: retention.expected,
      retained: retention.retained,
    },
    itemsGenerated: generated,
    itemsKept: ["major", "full_regeneration"].includes(editLevel) ? 0 : generated,
    editLevel,
    correctionMinutes: acceptedTimingEntry
      ? acceptedTimingEntry.elapsedSeconds / 60
      : null,
    controlRegression:
      ["positive_control", "negative_control"].includes(
        manifestCase.lane,
      ) && major,
    blockingDisagreement: historicalTimingConflict,
    unresolvedDisagreements: historicalConflictReasons,
    notes: major
      ? essentialPayloadLoss
        ? `Gold contract로 최종 판정했다. 실제 projection payload semantic loss(${retention.retained}/${retention.expected}; ${payloadLosses.join(" | ")})가 있어 major regeneration으로 판정하고 Item keep을 0으로 처리했다.`
        : "Gold contract로 최종 판정했다. feasibility, 4축 또는 SourceRow role의 구조 변경이 필요하여 rubric에 따라 재생성 전 Item keep을 0으로 처리했다."
      : minor
        ? "Gold contract로 최종 판정했다. 핵심 구조는 유지되고 gate 정정만 필요했다."
        : copyOnlyMinor
          ? `독립 stopwatch 검토에서 구조·Item·gate를 유지한 copy-only minor를 반영했다. ${acceptedTimingEntry.notes}`
        : "Rules output이 frozen gold contract의 핵심 구조·disposition·gate·SourceRow role과 일치했다.",
  };
  if (historicalTimingConflict) {
    adjudication.notes +=
      " Measured reviewer missed later-detected semantic payload loss; raw stopwatch remains in ledger and is excluded.";
  } else if (acceptedTimingEntry?.notes) {
    adjudication.notes += ` Stopwatch note: ${acceptedTimingEntry.notes}`;
  }
  if (correctionTimeEvidence) {
    adjudication.correctionTimeEvidence = correctionTimeEvidence;
  }
  return adjudication;
}

function compileRound({
  roundId,
  manifest,
  goldByCase,
  rulesOutputs,
  lowDecisions,
  highDecisions,
  reviewSchema,
  correctionTimingByRoundAndCase,
}) {
  const reviews = [];
  const adjudications = [];
  for (const manifestCase of manifest.cases) {
    const goldCase = goldByCase.get(manifestCase.caseId);
    const rulesOutput = rulesOutputs.get(manifestCase.caseId);
    const rawByLane = {
      rules_first: laneRawEvidence("rules_first", rulesOutput),
      low_cost_independent: laneRawEvidence(
        "low_cost_independent",
        rulesOutput,
        lowDecisions.get(manifestCase.caseId),
      ),
      high_capability_independent: laneRawEvidence(
        "high_capability_independent",
        rulesOutput,
        highDecisions.get(manifestCase.caseId),
      ),
    };
    for (const lane of reviewerLanes) {
      reviews.push(
        makeReview({
          roundId,
          lane,
          manifestCase,
          goldCase,
          raw: rawByLane[lane],
          rulesOutput,
        }),
      );
    }
    adjudications.push(
      makeAdjudication({
        roundId,
        manifestCase,
        goldCase,
        rulesOutput,
        reviewSchema,
        timingEntry: correctionTimingByRoundAndCase.get(
          `${roundId}:${manifestCase.caseId}`,
        ),
      }),
    );
  }
  return { roundId, reviewerLanes, reviews, adjudications };
}

function measuredCorrectionSampleCount(round) {
  return round.adjudications.filter(
    (entry) =>
      entry.correctionTimeEvidence?.kind ===
      "measured_independent_agent_review",
  ).length;
}

export function compileReviewArtifacts(
  baseDirectory = here,
  {
    throughRound = null,
    correctionTimingLedgerFile = correctionTimingFile,
  } = {},
) {
  assert(
    path.resolve(baseDirectory) === path.resolve(here),
    "현재 컴파일러는 자신이 위치한 output-quality-lab-v2 폴더만 대상으로 합니다.",
  );
  const context = loadContext(baseDirectory);
  const correctionTiming = loadCorrectionTimingLedger(
    context.manifest,
    correctionTimingLedgerFile,
  );
  const runDocuments = collectJsonFiles(runsDirectory).map((file) => ({
    file,
    document: readJson(file),
  }));
  const allDecisionDocuments = collectJsonFiles(decisionsDirectory).map(
    (file) => ({ file, document: readJson(file) }),
  );
  const discoveredRoundIds = discoverRounds(runDocuments);
  if (throughRound !== null) {
    assert(
      /^round-[2-4]$/.test(throughRound),
      `--through은 round-2, round-3 또는 round-4여야 합니다: ${throughRound}`,
    );
    assert(
      discoveredRoundIds.includes(throughRound),
      `${throughRound} rules run이 아직 없습니다.`,
    );
  }
  const roundIds = throughRound
    ? discoveredRoundIds.slice(0, discoveredRoundIds.indexOf(throughRound) + 1)
    : discoveredRoundIds;
  const goldByCase = new Map(
    context.gold.cases.map((entry) => [entry.caseId, entry]),
  );
  const selectedDecisionFiles = [];
  const rounds = roundIds.map((roundId) => {
    validateRound(
      runDocuments.map((entry) => ({
        file: relative(entry.file),
        run: entry.document,
      })),
      context,
      roundId,
    );
    const rulesOutputs = rulesOutputsForRound(
      runDocuments,
      context.manifest,
      roundId,
    );
    const low = selectIndependentDocument(
      allDecisionDocuments,
      context.manifest,
      roundId,
      independentProfiles.low_cost_independent,
    );
    const high = selectIndependentDocument(
      allDecisionDocuments,
      context.manifest,
      roundId,
      independentProfiles.high_capability_independent,
    );
    selectedDecisionFiles.push(low.file, high.file);
    return compileRound({
      roundId,
      manifest: context.manifest,
      goldByCase,
      rulesOutputs,
      lowDecisions: independentDecisions(low.document),
      highDecisions: independentDecisions(high.document),
      reviewSchema: context.reviewSchema,
      correctionTimingByRoundAndCase: correctionTiming.byRoundAndCase,
    });
  });
  const reviewResults = {
    documentType: "flowme_output_quality_review_results",
    schemaVersion: "flowme-output-quality-review-results-v2",
    date: "2026-07-20",
    caseSetVersion: context.manifest.caseSetVersion,
    goldContractVersion: context.gold.contractVersion,
    claimBoundary:
      "Deterministic QA and independent-agent comparison; this is not observed-user validation.",
    rounds,
  };

  validateReviewResults(reviewResults, context);
  const recomputedMetrics = recomputeReviewMetrics(
    reviewResults,
    context.manifest,
    context.gold,
  );
  validateRawReviewProvenance(reviewResults, {
    ...context,
    runFiles: runDocuments.map((entry) => entry.file),
    decisionFiles: selectedDecisionFiles,
  });
  const comparison = {
    documentType: "flowme_output_quality_comparison",
    schemaVersion: "flowme-output-quality-comparison-v2",
    generatedAt: new Date().toISOString(),
    caseSetVersion: context.manifest.caseSetVersion,
    goldContractVersion: context.gold.contractVersion,
    validationBoundary:
      "Deterministic QA and independent-agent comparison; this is not observed-user validation.",
    timingBoundary:
      "correctionMinutes and timing percentiles exclude not_available and estimate_only evidence; no value is fabricated from model runtime.",
    rounds: recomputedMetrics.map((metrics, index) => ({
      roundId: metrics.roundId,
      metrics,
      measuredCorrectionSampleCount: measuredCorrectionSampleCount(rounds[index]),
    })),
    finalMetrics: recomputedMetrics.at(-1),
  };
  validateComparison(comparison, recomputedMetrics, context);

  return {
    reviewResults,
    comparison,
    summary: {
      roundIds,
      caseCount: context.manifest.cases.length,
      reviewCount: rounds.reduce((sum, round) => sum + round.reviews.length, 0),
      adjudicationCount: rounds.reduce(
        (sum, round) => sum + round.adjudications.length,
        0,
      ),
      selectedDecisionFiles: selectedDecisionFiles.map(relative),
      correctionTimingEntryCount: correctionTiming.ledger.entries.length,
      metrics: recomputedMetrics,
    },
  };
}

function writeReviewedFinalRun(reviewResults) {
  const finalReviewRound = reviewResults.rounds.at(-1);
  assert(finalReviewRound, "최종 review round가 없습니다.");
  const candidates = collectJsonFiles(runsDirectory)
    .map((file) => ({ file, document: readJson(file) }))
    .filter((entry) => entry.document.roundId === finalReviewRound.roundId);
  assert(
    candidates.length === 1,
    `${finalReviewRound.roundId} review evidence를 연결할 rules run은 정확히 1개여야 합니다. 현재 ${candidates.length}개입니다.`,
  );
  const reviewsByCase = new Map();
  for (const review of finalReviewRound.reviews) {
    const values = reviewsByCase.get(review.caseId) ?? [];
    values.push(review.reviewId);
    reviewsByCase.set(review.caseId, values);
  }
  const adjudicationByCase = new Map(
    finalReviewRound.adjudications.map((entry) => [entry.caseId, entry]),
  );
  const run = candidates[0].document;
  for (const output of run.outputs) {
    const reviewIds = reviewsByCase.get(output.caseId) ?? [];
    const adjudication = adjudicationByCase.get(output.caseId);
    assert(reviewIds.length === 3, `${output.caseId}의 review ID가 3개가 아닙니다.`);
    assert(adjudication, `${output.caseId}의 final adjudication이 없습니다.`);
    output.reviewEvidence = {
      validatorStatus: "pass",
      independentReviewIds: reviewIds,
      correction: {
        editLevel: adjudication.editLevel,
        minutes: adjudication.correctionMinutes,
        itemKeepRate:
          adjudication.itemsGenerated === 0
            ? null
            : adjudication.itemsKept / adjudication.itemsGenerated,
        notes: adjudication.notes,
      },
      unresolvedDisagreements: [...adjudication.unresolvedDisagreements],
    };
  }
  writeJson(candidates[0].file, run);
  return candidates[0].file;
}

async function main() {
  const args = process.argv.slice(2);
  const throughIndex = args.indexOf("--through");
  const throughRound = throughIndex === -1 ? null : args[throughIndex + 1];
  if (args.includes("--help")) {
    console.log(
      "Usage: node compile-review-results-v2.mjs [--through round-2|round-3|round-4] [--check] [--json]\n\n" +
        "Discovers consecutive round-1..4 runs, requires one strict 18-case blind decision set for each independent profile, compiles review-results-v2.json plus comparison-v2.json and classification-comparison-v2.json, then validates raw provenance and derived metrics. --check validates without writing. --through is useful only for an explicitly incomplete later round; final --all still requires every run round.",
    );
    return;
  }
  try {
    assert(
      throughIndex === -1 || throughRound,
      "--through 뒤에 round-2, round-3 또는 round-4가 필요합니다.",
    );
    const compiled = compileReviewArtifacts(here, { throughRound });
    let reviewedRunFile = null;
    if (!args.includes("--check")) {
      writeJson(reviewOutputFile, compiled.reviewResults);
      writeJson(comparisonOutputFile, compiled.comparison);
      writeJson(classificationComparisonOutputFile, compiled.comparison);
      reviewedRunFile = writeReviewedFinalRun(compiled.reviewResults);
    }
    if (args.includes("--json")) {
      console.log(
        JSON.stringify(
          {
            valid: true,
            wroteFiles: !args.includes("--check"),
            files: [
              relative(reviewOutputFile),
              relative(comparisonOutputFile),
              relative(classificationComparisonOutputFile),
              ...(reviewedRunFile ? [relative(reviewedRunFile)] : []),
            ],
            ...compiled.summary,
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        `PASS: ${compiled.summary.roundIds.join(", ")} / ${compiled.summary.caseCount} cases / ${compiled.summary.reviewCount} reviews compiled${args.includes("--check") ? " (check only)" : ""}.`,
      );
    }
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    for (const detail of error.details ?? error.errors ?? []) {
      console.error(
        `- ${typeof detail === "string" ? detail : `${detail.code ?? "error"}${detail.path ? ` ${detail.path}` : ""}: ${detail.message ?? JSON.stringify(detail)}`}`,
      );
    }
    process.exitCode = 1;
  }
}

const isDirect =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) await main();
