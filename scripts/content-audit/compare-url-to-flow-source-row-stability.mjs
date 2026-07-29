import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot =
  globalThis.__FLOWME_REPO_ROOT__ ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const auditDir = path.join(
  repoRoot,
  "docs/content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function proposalsForRound(round) {
  const directory = path.join(auditDir, `runs/${round}`);
  const proposals = new Map();
  for (const name of await readdir(directory)) {
    if (!name.startsWith("batch-") || !name.endsWith(".json")) continue;
    const run = await readJson(path.join(directory, name));
    for (const output of run.outputs ?? []) proposals.set(output.caseId, output.proposal);
  }
  return proposals;
}

function stableSort(values) {
  return [...values].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function signature(proposal) {
  return {
    status: {
      generationState: proposal.status.generationState,
      outcome: proposal.status.outcome,
      errorCode: proposal.status.errorCode,
      disposition: proposal.reviewHints.recommendedDisposition,
    },
    sourceShape: proposal.sourceAssessment.sourceShape,
    conversionDecision: proposal.conversionDecision
      ? {
          lifeArea: proposal.conversionDecision.lifeArea,
          planningPattern: proposal.conversionDecision.planningPattern,
          primaryArtifact: proposal.conversionDecision.primaryArtifact,
        }
      : null,
    items: stableSort(
      (proposal.proposal.items ?? []).map((item) => ({
        sourceRowIds: [...item.sourceRowIds].sort(),
        intent: item.intent,
        completionMode: item.completion.mode,
        memoPresent: item.memoCandidate !== null,
        groupingPresent: item.groupingCandidate !== null,
        schedule: item.scheduleCandidate
          ? {
              sourceRowIds: [...item.scheduleCandidate.sourceRowIds].sort(),
              sourceText: item.scheduleCandidate.sourceText,
            }
          : null,
      })),
    ),
    omittedRows: stableSort(
      (proposal.proposal.omittedRows ?? []).map((row) => ({
        sourceRowId: row.sourceRowId,
        reasonCode: row.reasonCode,
      })),
    ),
    projections: stableSort(
      (proposal.projectionPlan ?? []).map((projection) => ({
        target: projection.target,
        applicability: projection.applicability,
      })),
    ),
  };
}

function differences(left, right, currentPath = "$", output = []) {
  if (Object.is(left, right)) return output;
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object" ||
    Array.isArray(left) !== Array.isArray(right)
  ) {
    output.push({ path: currentPath, round2: left, round3: right });
    return output;
  }
  if (Array.isArray(left)) {
    if (left.length !== right.length) {
      output.push({ path: `${currentPath}.length`, round2: left.length, round3: right.length });
    }
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      differences(left[index], right[index], `${currentPath}[${index}]`, output);
    }
    return output;
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of [...keys].sort()) differences(left[key], right[key], `${currentPath}.${key}`, output);
  return output;
}

export async function compareSourceRowStability() {
  const round2 = await proposalsForRound("round-2");
  const round3 = await proposalsForRound("round-3");
  const round2Validation = await readJson(path.join(auditDir, "runs/round-2/validation.json"));
  const round3Validation = await readJson(path.join(auditDir, "runs/round-3/validation.json"));
  const valid2 = new Map(
    round2Validation.documents.flatMap((document) => document.results).map((entry) => [entry.caseId, entry.passed]),
  );
  const valid3 = new Map(
    round3Validation.documents.flatMap((document) => document.results).map((entry) => [entry.caseId, entry.passed]),
  );
  const caseIds = [...new Set([...round2.keys(), ...round3.keys()])].sort();
  const cases = caseIds.map((caseId) => {
    const round2Signature = signature(round2.get(caseId));
    const round3Signature = signature(round3.get(caseId));
    const mismatchDetails = differences(round2Signature, round3Signature);
    return {
      caseId,
      round2Valid: valid2.get(caseId) ?? false,
      round3Valid: valid3.get(caseId) ?? false,
      exactSignatureMatch: mismatchDetails.length === 0,
      mismatchDetails,
      round2Signature,
      round3Signature,
    };
  });
  const exactMatches = cases.filter((entry) => entry.exactSignatureMatch).length;
  const validBoth = cases.filter((entry) => entry.round2Valid && entry.round3Valid).length;
  const negativeCases = cases.filter((entry) => ["case-11", "case-12"].includes(entry.caseId));
  const positiveCases = cases.filter((entry) => !["case-11", "case-12"].includes(entry.caseId));
  const positiveExactMatches = positiveCases.filter((entry) => entry.exactSignatureMatch).length;
  const report = {
    comparisonVersion: "flowme-source-row-stability-v2",
    laneId: "url-to-flow-source-row-v1",
    promptVersion: "url-to-flow-prompt-v1.1",
    comparisonScope: "recorded_output_signature_only",
    packetArtifactsChangedBetweenRecordedRuns: null,
    schemaArtifactChangedBetweenRecordedRuns: null,
    runInputBindingProven: false,
    freshContextProven: false,
    completionGate: false,
    diagnosticOnly: true,
    metrics: {
      comparedCases: cases.length,
      exactMatches,
      exactMatchRate: cases.length === 0 ? 0 : exactMatches / cases.length,
      positiveComparedCases: positiveCases.length,
      positiveExactMatches,
      positiveExactMatchRate:
        positiveCases.length === 0 ? 0 : positiveExactMatches / positiveCases.length,
      validInBothRounds: validBoth,
      negativesExact: negativeCases.filter((entry) => entry.exactSignatureMatch).length,
      negativeCount: negativeCases.length,
    },
    cases,
  };
  const outputPath = path.join(auditDir, "runs/round-3/stability.json");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (typeof process !== "undefined" && typeof process.stdout?.write === "function") {
  compareSourceRowStability()
    .then((report) => process.stdout.write(`${JSON.stringify(report, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
