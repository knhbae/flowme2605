import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
const laneId = "url-to-flow-source-row-v1";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const toRepoPath = (absolutePath) =>
  path.relative(repoRoot, absolutePath).replaceAll("\\", "/");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function buildSourceRowReviewInputs(round = "round-2") {
  if (!/^round-[123]$/.test(round)) throw new Error(`Invalid round: ${round}`);
  const caseDocument = await readJson(path.join(specDir, "cases-v1.json"));
  const validation = await readJson(path.join(auditDir, `runs/${round}/validation.json`));
  const validationByCase = new Map(
    validation.documents.flatMap((document) => document.results).map((result) => [result.caseId, result]),
  );
  const runDir = path.join(auditDir, `runs/${round}`);
  const proposalsByCase = new Map();
  const modelInvokedByCase = new Map();
  for (const name of await readdir(runDir)) {
    if (!name.endsWith(".json") || name === "validation.json" || name === "defect-selection.json") continue;
    const document = await readJson(path.join(runDir, name));
    if (!Array.isArray(document.outputs)) continue;
    for (const output of document.outputs) {
      proposalsByCase.set(output.caseId, output.proposal);
      modelInvokedByCase.set(output.caseId, output.modelInvoked);
    }
  }
  const outputDir = path.join(auditDir, `review-inputs/${round}`);
  await mkdir(outputDir, { recursive: true });
  const records = [];
  for (const caseEntry of caseDocument.cases) {
    const proposal = proposalsByCase.get(caseEntry.caseId);
    const result = validationByCase.get(caseEntry.caseId);
    if (!proposal || !result) throw new Error(`Missing proposal/validation: ${caseEntry.caseId}`);
    const positiveCase = Boolean(caseEntry.generatorInput);
    const reviewInput = {
      reviewInputVersion: "flowme-source-row-blind-review-input-v1",
      laneId,
      round,
      caseId: caseEntry.caseId,
      positiveCase,
      sourcePacket: positiveCase ? caseEntry.generatorInput : null,
      deterministicNegativeBoundary: positiveCase
        ? null
        : {
            modelInvoked: modelInvokedByCase.get(caseEntry.caseId),
            generationState: proposal.status.generationState,
            outcome: proposal.status.outcome,
            errorCode: proposal.status.errorCode,
            recommendedDisposition: proposal.reviewHints.recommendedDisposition,
          },
      proposal,
      proposalFingerprint: result.proposalFingerprint,
      deterministicValidation: {
        passed: result.passed,
        codes: result.errors.map((error) => error.code),
        sourceRowAccounting: result.metrics.exactlyOnceRows === result.metrics.receivedRows,
      },
      rubricPath:
        "docs/specs/2026-07-15-url-to-flow-prompt-lab-source-row-v1/review-rubric.md",
      evidenceBoundary: {
        allowed: [
          "this sourcePacket",
          "this proposal",
          "this proposalFingerprint",
          "this deterministicValidation",
          "the linked blind rubric",
        ],
        forbidden: [
          "canonical expectation or opaque ID mapping",
          "source title URL publisher or preflight metadata",
          "legacy or prior-round output and review",
          "provider model tier timing token or cost",
          "other reviewer conclusions",
        ],
      },
    };
    const filePath = path.join(outputDir, `${caseEntry.caseId}.json`);
    const raw = `${JSON.stringify(reviewInput, null, 2)}\n`;
    await writeFile(filePath, raw, "utf8");
    records.push({
      caseId: caseEntry.caseId,
      positiveCase,
      path: toRepoPath(filePath),
      sha256: sha256(raw),
      proposalFingerprint: result.proposalFingerprint,
    });
  }
  const manifest = {
    manifestVersion: "flowme-source-row-blind-review-manifest-v1",
    laneId,
    round,
    caseCount: records.length,
    positiveCaseCount: records.filter((record) => record.positiveCase).length,
    deterministicNegativeCount: records.filter((record) => !record.positiveCase).length,
    deterministicValidationPassed: validation.passed,
    forbiddenEvidenceIncluded: false,
    records,
  };
  await writeJson(path.join(outputDir, "manifest.json"), manifest);
  return manifest;
}

if (typeof process !== "undefined" && typeof process.stdout?.write === "function") {
  buildSourceRowReviewInputs(process.argv[2] ?? "round-2")
    .then((summary) => process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
