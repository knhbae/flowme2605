import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ledgerPath = path.resolve(here, "../2026-07-19-flow-content-source-expansion-seed.json");
const p0Path = path.resolve(here, "../2026-07-18-flowme-flow-content-category-examples.json");
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const p0 = JSON.parse(fs.readFileSync(p0Path, "utf8"));

const required = [
  "id", "title", "sourceUrl", "sourcePlatform", "platformRole", "providerType",
  "sourceFormat", "targetConditions", "lifeArea", "planningPattern", "portfolioRole",
  "userJob", "engagementSignal", "sourceRowsAvailable", "primaryArtifact", "accessMode",
  "rightsMode", "conversionState", "promotionState", "localizationAndRisk"
];
const expectedLifeAreas = new Set(ledger.existingKnowledge.lifeAreas);
const expectedPatterns = new Set(ledger.existingKnowledge.planningPatterns);
const expectedConditions = new Set(ledger.targetConditions.map((entry) => entry.id));
const expectedAccessModes = new Set(ledger.accessModes);
const expectedRightsModes = new Set(ledger.rightsModes);
const expectedConversionStates = new Set(ledger.conversionStates);
const candidates = ledger.candidates;
const errors = [];

const uniqueCount = (values) => new Set(values).size;
const collectUrls = (value, result = new Set()) => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectUrls(entry, result));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectUrls(entry, result));
  } else if (typeof value === "string" && /^https?:\/\//.test(value)) {
    result.add(value);
  }
  return result;
};

if (candidates.length < 36) errors.push(`candidateCount ${candidates.length} < 36`);
if (uniqueCount(candidates.map((entry) => entry.id)) !== candidates.length) errors.push("duplicate candidate id");
if (uniqueCount(candidates.map((entry) => entry.sourceUrl)) !== candidates.length) errors.push("duplicate source URL");

for (const candidate of candidates) {
  for (const field of required) {
    if (candidate[field] === undefined || candidate[field] === null || candidate[field] === "") {
      errors.push(`${candidate.id}: missing ${field}`);
    }
  }
  const signal = candidate.engagementSignal ?? {};
  for (const field of ["signalLevel", "metric", "value", "observedAt", "evidenceUrl"]) {
    if (!signal[field]) errors.push(`${candidate.id}: missing engagementSignal.${field}`);
  }
  if (!expectedLifeAreas.has(candidate.lifeArea)) errors.push(`${candidate.id}: unknown lifeArea ${candidate.lifeArea}`);
  if (!expectedPatterns.has(candidate.planningPattern)) errors.push(`${candidate.id}: unknown planningPattern ${candidate.planningPattern}`);
  if (!expectedAccessModes.has(candidate.accessMode)) errors.push(`${candidate.id}: unknown accessMode ${candidate.accessMode}`);
  if (!expectedRightsModes.has(candidate.rightsMode)) errors.push(`${candidate.id}: unknown rightsMode ${candidate.rightsMode}`);
  if (!expectedConversionStates.has(candidate.conversionState)) errors.push(`${candidate.id}: unknown conversionState ${candidate.conversionState}`);
  for (const condition of candidate.targetConditions) {
    if (!expectedConditions.has(condition)) errors.push(`${candidate.id}: unknown targetCondition ${condition}`);
  }
}

const coveredLifeAreas = new Set(candidates.map((entry) => entry.lifeArea));
const coveredPatterns = new Set(candidates.map((entry) => entry.planningPattern));
const coveredConditions = new Set(candidates.flatMap((entry) => entry.targetConditions));
for (const value of expectedLifeAreas) if (!coveredLifeAreas.has(value)) errors.push(`uncovered lifeArea ${value}`);
for (const value of expectedPatterns) if (!coveredPatterns.has(value)) errors.push(`uncovered planningPattern ${value}`);
for (const value of expectedConditions) if (!coveredConditions.has(value)) errors.push(`uncovered targetCondition ${value}`);
if (uniqueCount(candidates.map((entry) => entry.providerType)) < 12) errors.push("providerType classes < 12");
if (uniqueCount(candidates.map((entry) => entry.sourceFormat)) < 12) errors.push("sourceFormat classes < 12");

const p0Urls = collectUrls(p0);
const exactP0UrlOverlaps = candidates.filter((entry) => p0Urls.has(entry.sourceUrl)).map((entry) => entry.id);

const result = {
  status: errors.length === 0 ? "pass" : "fail",
  candidateCount: candidates.length,
  koreanCount: candidates.filter((entry) => entry.id.startsWith("KR-")).length,
  globalCount: candidates.filter((entry) => entry.id.startsWith("GLOBAL-")).length,
  uniqueIds: uniqueCount(candidates.map((entry) => entry.id)),
  uniqueUrls: uniqueCount(candidates.map((entry) => entry.sourceUrl)),
  providerTypeClasses: uniqueCount(candidates.map((entry) => entry.providerType)),
  sourceFormatClasses: uniqueCount(candidates.map((entry) => entry.sourceFormat)),
  lifeAreaCoverage: `${coveredLifeAreas.size}/${expectedLifeAreas.size}`,
  planningPatternCoverage: `${coveredPatterns.size}/${expectedPatterns.size}`,
  targetConditionCoverage: `${coveredConditions.size}/${expectedConditions.size}`,
  exactP0UrlOverlaps,
  semanticJobOverlapNote: "Exact URL duplicates are checked automatically. Same-job controls such as moving and packing are intentionally retained for source-quality comparison.",
  errors
};

console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
