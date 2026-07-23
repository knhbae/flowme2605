import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const deep = JSON.parse(fs.readFileSync(path.join(here, "deep-set-v1.json"), "utf8"));
const manual = JSON.parse(fs.readFileSync(path.join(here, "model-review-manual-v1.json"), "utf8"));
const selectedIds = ["DS01", "DS02", "DS03", "DS05", "DS10", "DS11"];
const sourceRowsByCase = new Map(
  deep.cases.filter((entry) => selectedIds.includes(entry.caseId)).map((entry) => [entry.caseId, entry.sourceRows.map((row) => row.id)])
);

const scoreTier = (tier) => {
  const outputPath = path.join(here, `model-output-${tier}-v1.json`);
  const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  const manualTier = manual.tiers[tier];
  const errors = [];
  const caseScores = [];

  if (output.cases.length !== 6) errors.push(`case count ${output.cases.length} != 6`);
  for (const caseId of selectedIds) {
    const candidate = output.cases.find((entry) => entry.caseId === caseId);
    const review = manualTier.cases[caseId];
    if (!candidate) {
      errors.push(`${caseId}: missing case`);
      continue;
    }
    const accounted = new Set([
      ...candidate.items.flatMap((item) => item.sourceRowRefs ?? []),
      ...candidate.unmappedSourceRows.map((row) => row.id)
    ]);
    const expectedRows = sourceRowsByCase.get(caseId);
    const missingRows = expectedRows.filter((rowId) => !accounted.has(rowId));
    const unknownRows = [...accounted].filter((rowId) => !expectedRows.includes(rowId));
    const itemSchemaPass = candidate.items.every((item) => item.title && item.completionCriterion && item.sourceRowRefs?.length);
    const itemCountPass = candidate.items.length <= 7 && (candidate.decision === "source_import_required" || candidate.items.length > 0);
    const sourceScore = missingRows.length === 0 && unknownRows.length === 0 ? 25 : Math.max(0, 25 - 5 * (missingRows.length + unknownRows.length));
    const inventionScore = review.inventedFacts === 0 && review.inventedDates === 0 ? 25 : 0;
    const structureScore = itemSchemaPass && itemCountPass ? 15 : 0;
    const total = sourceScore + inventionScore + review.gateScore + structureScore + review.executionScore + review.warningScore;
    caseScores.push({
      caseId,
      decision: candidate.decision,
      expectedDecision: manual.expectedDecision[caseId],
      sourceScore,
      inventionScore,
      gateScore: review.gateScore,
      structureScore,
      executionScore: review.executionScore,
      warningScore: review.warningScore,
      total,
      repairFields: review.repairFields,
      missingRows,
      unknownRows,
      note: review.note
    });
  }

  const semanticCharacters = JSON.stringify(output).length;
  const score = caseScores.reduce((sum, entry) => sum + entry.total, 0);
  const repairFields = caseScores.reduce((sum, entry) => sum + entry.repairFields, 0);
  return {
    tier,
    modelTier: manualTier.modelTier,
    status: errors.length ? "fail" : "pass",
    score,
    scorePercent: Number((score / (caseScores.length * 100) * 100).toFixed(1)),
    sourceRowAccountingPercent: Number((caseScores.reduce((sum, entry) => sum + entry.sourceScore, 0) / (caseScores.length * 25) * 100).toFixed(1)),
    inventedFacts: Object.values(manualTier.cases).reduce((sum, entry) => sum + entry.inventedFacts, 0),
    inventedDates: Object.values(manualTier.cases).reduce((sum, entry) => sum + entry.inventedDates, 0),
    exactDecisionCount: caseScores.filter((entry) => entry.decision === entry.expectedDecision).length,
    safeOverlockCount: caseScores.filter((entry) => entry.gateScore === 12).length,
    repairFields,
    repairMinutesEstimate: repairFields * 1.5,
    outputCharacters: semanticCharacters,
    estimatedOutputTokens: Math.ceil(semanticCharacters / 4),
    apiCurrencyCost: "not_exposed_in_session",
    inputTokens: "not_exposed_in_session",
    outputTokens: "not_exposed_in_session_estimate_only",
    caseScores,
    errors
  };
};

const result = {
  schemaVersion: "flow-content-model-comparison-score-v1",
  observedAt: "2026-07-19",
  parallelBatchWallTimeSeconds: 283,
  individualLatency: "not_exposed_in_session",
  tiers: [scoreTier("terra"), scoreTier("sol")],
  costBoundary: "The model classes are Codex session proxies, not public API price SKUs. Character/4 is a rough output-token reference, not billing evidence."
};

console.log(JSON.stringify(result, null, 2));
if (result.tiers.some((entry) => entry.status === "fail")) process.exitCode = 1;
