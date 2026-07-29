import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const specDir = path.join(repoRoot, "docs/specs/2026-07-18-url-to-flow-value-uplift-v4");
const auditDir = path.join(repoRoot, "docs/content-audit/2026-07-19-url-to-flow-p0-ten-url-benchmark");
const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const readMaybe = async (file) => {
  try { return await readJson(file); } catch (error) { if (error?.code === "ENOENT") return null; throw error; }
};
const contract = await readJson(path.join(specDir, "experiment-contract.json"));
const snapshots = await readJson(path.join(auditDir, "source-snapshots.json"));
const runFiles = ["lower-cost.json", "higher-capability.json"];
const allowedPatterns = new Set(contract.planningPatterns);
const allowedArtifacts = new Set(contract.artifacts);
const allowedDispositions = new Set(contract.dispositions);
const genericDone = /^(완료|확인|체크|끝|했음|수행)(했다|한다|함|됨|했어요)?[.!]?$/;

function snapshotCorpus(snapshot) {
  return [
    snapshot.bodyTextSample,
    ...(snapshot.selectedLines ?? []).map((entry) => entry.text),
    ...(snapshot.headings ?? []),
    ...(snapshot.imageAlts ?? []),
    ...(snapshot.playlistItems ?? []).flatMap((entry) => [entry.title, entry.url]),
  ].filter(Boolean).join("\n");
}

function validateCase(entry, snapshot) {
  const errors = [];
  const evidence = entry.sourceEvidence ?? [];
  const evidenceIds = new Set(evidence.map((item) => item.evidenceId));
  const corpus = snapshotCorpus(snapshot);
  for (const item of evidence) {
    for (const key of contract.modelRun.sourceEvidenceRequired) {
      if (!item?.[key]) errors.push(`sourceEvidence.${item?.evidenceId ?? "?"}.${key}:missing`);
    }
    if (item.text && !corpus.includes(item.text)) errors.push(`sourceEvidence.${item.evidenceId}:text_not_exact_snapshot_substring`);
  }

  if (!allowedDispositions.has(entry.decision?.disposition)) errors.push("decision.disposition:invalid");
  if (!Array.isArray(entry.unsupportedClaims)) errors.push("unsupportedClaims:missing_array");
  if ((entry.unsupportedClaims?.length ?? 0) > 0) errors.push("unsupportedClaims:not_zero");

  const flow = entry.flow;
  if (!flow) {
    if (entry.decision?.disposition === "compile_candidate") errors.push("flow:null_compile_candidate");
    if ((entry.projections?.length ?? 0) > 0) errors.push("flow:null_has_projections");
    return { passed: errors.length === 0, errors, itemCount: 0, pattern: null, disposition: entry.decision?.disposition ?? null };
  }

  for (const key of contract.modelRun.flowRequired) {
    if (flow[key] === undefined || flow[key] === null) errors.push(`flow.${key}:missing`);
  }
  if (!allowedPatterns.has(flow.planningPattern)) errors.push("flow.planningPattern:invalid");
  if (!allowedArtifacts.has(flow.primaryArtifact)) errors.push("flow.primaryArtifact:invalid");
  const items = flow.items ?? [];
  const itemIds = new Set(items.map((item) => item.itemId));
  if (items.length === 0) errors.push("flow.items:empty");
  for (const item of items) {
    for (const key of contract.modelRun.itemRequired) {
      if (item[key] === undefined || item[key] === null || item[key] === "") errors.push(`item.${item.itemId ?? "?"}.${key}:missing`);
    }
    if (!String(item.doneWhen ?? "").trim() || genericDone.test(String(item.doneWhen).trim())) errors.push(`item.${item.itemId}:generic_doneWhen`);
    for (const ref of item.sourceEvidenceRefs ?? []) {
      if (!evidenceIds.has(ref)) errors.push(`item.${item.itemId}:invalid_evidence_ref:${ref}`);
    }
  }
  for (const projection of entry.projections ?? []) {
    for (const key of contract.modelRun.projectionRequired) {
      if (projection[key] === undefined || projection[key] === null) errors.push(`projection.${projection.target ?? "?"}.${key}:missing`);
    }
    if (!Array.isArray(projection.lossLedger)) errors.push(`projection.${projection.target}:lossLedger_not_array`);
    for (const ref of projection.sourceItemRefs ?? []) {
      if (!itemIds.has(ref)) errors.push(`projection.${projection.target}:invalid_item_ref:${ref}`);
    }
  }
  if ((entry.projections?.length ?? 0) === 0) errors.push("projections:empty");

  const sensitive = /medical|financial|privacy|safety/i.test(`${snapshot.source?.riskClass ?? ""} ${flow.risk ?? ""}`);
  if (sensitive && !["sensitive_locked", "human_review_required", "blocked"].includes(flow.publicationState)) {
    errors.push("flow.publicationState:sensitive_not_locked");
  }
  return {
    passed: errors.length === 0,
    errors,
    itemCount: items.length,
    pattern: flow.planningPattern,
    disposition: entry.decision?.disposition ?? null,
  };
}

const snapshotById = new Map(snapshots.snapshots.map((entry) => [entry.caseId, entry]));
const summaries = [];
for (const file of runFiles) {
  const fullPath = path.join(auditDir, "model-runs", file);
  const raw = await fs.readFile(fullPath, "utf8");
  const run = JSON.parse(raw);
  const ids = run.cases.map((entry) => entry.caseId);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const missingIds = [...snapshotById.keys()].filter((id) => !ids.includes(id));
  const extraIds = ids.filter((id) => !snapshotById.has(id));
  const cases = run.cases.map((entry) => ({
    caseId: entry.caseId,
    ...validateCase(entry, snapshotById.get(entry.caseId)),
  }));
  const accepted = cases.filter((entry) => entry.passed && entry.disposition === "compile_candidate");
  summaries.push({
    runId: run.runId,
    lane: run.lane,
    modelProxy: run.modelProxy,
    reasoningEffort: run.reasoningEffort ?? null,
    actualProviderCost: run.telemetry?.actualProviderCost ?? run.actualProviderCost ?? null,
    rawOutputChars: raw.length,
    estimatedOutputTokens: Math.ceil(raw.length / 4),
    duplicateIds,
    missingIds,
    extraIds,
    passedCaseCount: cases.filter((entry) => entry.passed).length,
    compileCandidateCount: cases.filter((entry) => entry.disposition === "compile_candidate").length,
    acceptedCandidateCount: accepted.length,
    acceptedPatterns: [...new Set(accepted.map((entry) => entry.pattern))],
    cases,
  });
}

const reviewA = await readMaybe(path.join(auditDir, "review-results/reviewer-a.json"));
const reviewB = await readMaybe(path.join(auditDir, "review-results/reviewer-b.json"));
const result = {
  schemaVersion: "flowme-url-to-flow-ten-url-validation-v1.0",
  generatedAt: new Date().toISOString(),
  snapshotGate: {
    expected: 10,
    actual: snapshots.snapshots.length,
    explicitStatusCount: snapshots.snapshots.filter((entry) => entry.accessStatus).length,
    passed: snapshots.snapshots.length === 10 && snapshots.snapshots.every((entry) => entry.accessStatus),
  },
  runs: summaries,
  reviewGate: {
    reviewerResultCount: [reviewA, reviewB].filter(Boolean).length,
    passed: Boolean(reviewA && reviewB),
  },
  nonClaims: [
    "Estimated tokens are a character-count proxy, not provider telemetry.",
    "Actual provider price, request IDs, and API latency are unavailable in session model proxies.",
    "Model-proxy review is not human validation or creator approval."
  ],
};
await fs.writeFile(path.join(auditDir, "validation-summary.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
const hardErrors = summaries.flatMap((run) => [
  ...run.duplicateIds,
  ...run.missingIds,
  ...run.extraIds,
  ...run.cases.flatMap((entry) => entry.errors.map((error) => `${run.lane}:${entry.caseId}:${error}`)),
]);
process.stdout.write(JSON.stringify({ snapshotGate: result.snapshotGate, runs: summaries.map((entry) => ({ lane: entry.lane, accepted: entry.acceptedCandidateCount, passed: entry.passedCaseCount, patterns: entry.acceptedPatterns.length })), hardErrorCount: hardErrors.length }, null, 2));
if (hardErrors.length) {
  process.stderr.write(`\n${hardErrors.join("\n")}\n`);
  process.exitCode = 1;
}

