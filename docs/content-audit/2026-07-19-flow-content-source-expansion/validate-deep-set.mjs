import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const deepPath = path.join(here, "deep-set-v1.json");
const ledgerPath = path.resolve(here, "../2026-07-19-flow-content-source-expansion-seed.json");
const deep = JSON.parse(fs.readFileSync(deepPath, "utf8"));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const errors = [];
const cases = deep.cases ?? [];
const candidateById = new Map(ledger.candidates.map((entry) => [entry.id, entry]));
const allowedStatuses = new Set(["ready_internal", "review_locked", "hold_source_import_required"]);

if (cases.length !== 12) errors.push(`case count ${cases.length} != 12`);
if (new Set(cases.map((entry) => entry.caseId)).size !== cases.length) errors.push("duplicate caseId");
if (new Set(cases.map((entry) => entry.candidateId)).size !== cases.length) errors.push("duplicate candidateId");

for (const entry of cases) {
  const candidate = candidateById.get(entry.candidateId);
  if (!candidate) errors.push(`${entry.caseId}: candidate not found in ledger`);
  if (!entry.sourceSnapshot?.sourceUrl?.startsWith("http")) errors.push(`${entry.caseId}: missing source URL`);
  if (candidate && candidate.sourceUrl !== entry.sourceSnapshot.sourceUrl) errors.push(`${entry.caseId}: source URL differs from ledger`);
  if (!entry.classification?.userJob) errors.push(`${entry.caseId}: missing user job`);
  if (!Array.isArray(entry.sourceRows) || entry.sourceRows.length === 0) errors.push(`${entry.caseId}: no source rows`);
  if (!entry.gate?.recommendedDisposition) errors.push(`${entry.caseId}: missing disposition`);
  if (!allowedStatuses.has(entry.canonicalPackage?.status)) errors.push(`${entry.caseId}: unknown package status`);
  if (entry.review?.inventedFacts !== 0) errors.push(`${entry.caseId}: inventedFacts must be 0`);
  if (entry.review?.inventedDates !== 0) errors.push(`${entry.caseId}: inventedDates must be 0`);

  const rowIds = new Set(entry.sourceRows.map((row) => row.id));
  if (rowIds.size !== entry.sourceRows.length) errors.push(`${entry.caseId}: duplicate source row id`);
  const flow = entry.canonicalPackage?.flow;
  if (flow) {
    if (!Array.isArray(flow.items) || flow.items.length === 0 || flow.items.length > 7) {
      errors.push(`${entry.caseId}: flow item count must be 1..7`);
    }
    const refs = flow.items.flatMap((item) => item.sourceRowRefs ?? []);
    for (const ref of refs) if (!rowIds.has(ref)) errors.push(`${entry.caseId}: unknown source row ref ${ref}`);
    for (const rowId of rowIds) if (!refs.includes(rowId)) errors.push(`${entry.caseId}: unaccounted source row ${rowId}`);
    for (const item of flow.items) {
      if (!item.title || !item.completionCriterion) errors.push(`${entry.caseId}: incomplete item ${item.id ?? "unknown"}`);
    }
  } else if (!entry.canonicalPackage?.hold?.reason || !entry.canonicalPackage?.hold?.nextEvidence) {
    errors.push(`${entry.caseId}: hold package missing reason or next evidence`);
  }
}

const lifeAreas = new Set(cases.map((entry) => entry.classification.lifeArea));
const patterns = new Set(cases.map((entry) => entry.classification.planningPattern));
const koreanCount = cases.filter((entry) => entry.sourceSnapshot.locale === "ko-KR").length;
const openOrApiCount = cases.filter((entry) => entry.sourceSnapshot.accessMode === "official_api").length;
const holdCount = cases.filter((entry) => entry.canonicalPackage.status === "hold_source_import_required").length;
const reviewLockedCount = cases.filter((entry) => entry.canonicalPackage.status === "review_locked").length;
const completeFlowCount = cases.filter((entry) => entry.canonicalPackage.status === "ready_internal").length;

if (koreanCount < 8) errors.push(`Korean deep sources ${koreanCount} < 8`);
if (lifeAreas.size !== 9) errors.push(`lifeArea coverage ${lifeAreas.size}/9`);
if (patterns.size !== 7) errors.push(`planningPattern coverage ${patterns.size}/7`);
if (openOrApiCount < 2) errors.push(`official API/open cases ${openOrApiCount} < 2`);
if (holdCount < 2) errors.push(`correct holds ${holdCount} < 2`);

const result = {
  status: errors.length === 0 ? "pass" : "fail",
  caseCount: cases.length,
  koreanCount,
  globalCount: cases.length - koreanCount,
  lifeAreaCoverage: `${lifeAreas.size}/9`,
  planningPatternCoverage: `${patterns.size}/7`,
  openOrApiCount,
  completeFlowCount,
  reviewLockedCount,
  correctHoldCount: holdCount,
  maxItemsPerFlow: Math.max(...cases.map((entry) => entry.canonicalPackage.flow?.items?.length ?? 0)),
  inventedFacts: cases.reduce((sum, entry) => sum + entry.review.inventedFacts, 0),
  inventedDates: cases.reduce((sum, entry) => sum + entry.review.inventedDates, 0),
  errors
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
