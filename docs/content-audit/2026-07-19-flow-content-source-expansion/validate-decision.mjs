import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const decision = JSON.parse(fs.readFileSync(path.join(here, "product-decision-v1.json"), "utf8"));
const deep = JSON.parse(fs.readFileSync(path.join(here, "deep-set-v1.json"), "utf8"));
const comparison = JSON.parse(fs.readFileSync(path.join(here, "model-comparison-v1.json"), "utf8"));
const errors = [];
const rows = decision.p0PortfolioV2.rows;
const deepIds = new Set(deep.cases.map((entry) => entry.caseId));

if (decision.overallDecision !== "shift") errors.push("overall decision must be shift");
if (rows.length !== 24) errors.push(`P0 decision rows ${rows.length} != 24`);
if (new Set(rows.map((entry) => entry.id)).size !== 24) errors.push("duplicate P0 id");
for (const state of ["keep", "replace", "park"]) {
  const actual = rows.filter((entry) => entry.decision === state).length;
  const expected = decision.p0PortfolioV2[`${state}Count`];
  if (actual !== expected) errors.push(`${state} count ${actual} != ${expected}`);
}
for (const row of rows.filter((entry) => entry.decision === "replace")) {
  if (!deepIds.has(row.replacement)) errors.push(`${row.id}: replacement ${row.replacement} not in deep set`);
  if (!row.acceptanceGate) errors.push(`${row.id}: replacement missing acceptance gate`);
}
if (decision.representativeValidationSet.selection.length < 3 || decision.representativeValidationSet.selection.length > 5) {
  errors.push("representative validation set must be 3..5");
}
for (const entry of decision.representativeValidationSet.selection) {
  if (!deepIds.has(entry.caseId)) errors.push(`representative ${entry.caseId} not in deep set`);
}
const requiredBackendRecords = new Set(["SourceSnapshot", "SourceRow", "ConversionGate", "FlowProposal", "ValidationResult", "ReviewDecision", "ProjectionArtifact", "ModelRunEvidence"]);
for (const value of requiredBackendRecords) if (!decision.backend.minimumBackendRecords.includes(value)) errors.push(`missing backend record ${value}`);
if (!decision.backend.hold.length || !decision.backend.goNow.length) errors.push("backend go/hold scope is empty");
if (comparison.tiers.length !== 2) errors.push("model comparison must contain two tiers");
if (comparison.tiers.some((entry) => entry.inventedFacts !== 0 || entry.inventedDates !== 0)) errors.push("model invention count is not zero");

const result = {
  status: errors.length ? "fail" : "pass",
  overallDecision: decision.overallDecision,
  p0Rows: rows.length,
  keep: rows.filter((entry) => entry.decision === "keep").length,
  replace: rows.filter((entry) => entry.decision === "replace").length,
  park: rows.filter((entry) => entry.decision === "park").length,
  activeProposalCount: rows.filter((entry) => entry.decision !== "park").length,
  representatives: decision.representativeValidationSet.selection.length,
  backendRecords: decision.backend.minimumBackendRecords.length,
  modelTiers: comparison.tiers.length,
  errors
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
