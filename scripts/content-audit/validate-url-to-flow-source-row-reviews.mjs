import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot =
  globalThis.__FLOWME_REPO_ROOT__ ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const auditDir = path.join(
  repoRoot,
  "docs/content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1",
);
const laneId = "url-to-flow-source-row-v1";
const scoreKeys = [
  "userNeedFit",
  "executionClarity",
  "contentFidelityCoverage",
  "portability",
  "cognitiveLoad",
  "copySpecificity",
  "sourceSafetySeparation",
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function sameKeys(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

function pushError(errors, code, reviewPath, detail = null) {
  errors.push({ code, path: reviewPath, ...(detail === null ? {} : { detail }) });
}

export async function validateSourceRowReviews(round = "round-2", outPath = null) {
  if (!/^round-[123]$/.test(round)) throw new Error(`Invalid round: ${round}`);
  const inputDir = path.join(auditDir, `review-inputs/${round}`);
  const reviewDir = path.join(auditDir, `reviews/${round}`);
  const manifest = await readJson(path.join(inputDir, "manifest.json"));
  const inputByCase = new Map();
  for (const record of manifest.records) {
    inputByCase.set(record.caseId, await readJson(path.join(repoRoot, record.path)));
  }
  if (!(await exists(reviewDir))) throw new Error(`Review directory not found: ${reviewDir}`);
  const reviewFiles = (await readdir(reviewDir))
    .filter((name) => name.endsWith(".json") && name !== "validation.json")
    .sort();
  const cases = [];
  const errors = [];
  const seen = new Set();

  for (const fileName of reviewFiles) {
    const document = await readJson(path.join(reviewDir, fileName));
    const topKeys = [
      "reviewSchemaVersion",
      "laneId",
      "round",
      "reviewerEvidenceClass",
      "provider",
      "model",
      "humanReviewer",
      "cases",
    ];
    if (!sameKeys(document, topKeys)) pushError(errors, "review_top_keys", fileName, Object.keys(document));
    if (document.reviewSchemaVersion !== "flowme-source-row-blind-review-v1") {
      pushError(errors, "review_schema_version", fileName, document.reviewSchemaVersion);
    }
    if (document.laneId !== laneId || document.round !== round) {
      pushError(errors, "review_lineage", fileName, {
        laneId: document.laneId,
        round: document.round,
      });
    }
    if (
      document.reviewerEvidenceClass !== "in_session_unselected_model_proxy" ||
      document.provider !== null ||
      document.model !== null ||
      document.humanReviewer !== false
    ) {
      pushError(errors, "review_evidence_boundary", fileName);
    }
    if (!Array.isArray(document.cases)) {
      pushError(errors, "review_cases_array", fileName);
      continue;
    }
    for (const review of document.cases) {
      const casePath = `${fileName}:${review.caseId ?? "unknown"}`;
      if (seen.has(review.caseId)) pushError(errors, "duplicate_review_case", casePath);
      seen.add(review.caseId);
      const input = inputByCase.get(review.caseId);
      if (!input) {
        pushError(errors, "unknown_review_case", casePath);
        continue;
      }
      const caseKeys = [
        "caseId",
        "proposalFingerprint",
        "validatorPassed",
        "validatorCodes",
        "positiveCase",
        "itemReviews",
        "unsupportedSignals",
        "scores",
        "scoreComments",
        "topFix",
        "verdict",
      ];
      if (!sameKeys(review, caseKeys)) pushError(errors, "review_case_keys", casePath, Object.keys(review));
      if (review.proposalFingerprint !== input.proposalFingerprint) {
        pushError(errors, "proposal_fingerprint_mismatch", casePath);
      }
      if (
        review.validatorPassed !== input.deterministicValidation.passed ||
        JSON.stringify(review.validatorCodes) !== JSON.stringify(input.deterministicValidation.codes)
      ) {
        pushError(errors, "validator_result_mismatch", casePath);
      }
      if (review.positiveCase !== input.positiveCase) {
        pushError(errors, "positive_case_mismatch", casePath);
      }
      if (!Array.isArray(review.itemReviews) || !Array.isArray(review.unsupportedSignals)) {
        pushError(errors, "review_arrays_required", casePath);
        continue;
      }
      const proposalItems = input.proposal.proposal.items;
      const proposalIds = proposalItems.map((item) => item.proposalId).sort();
      const reviewedIds = review.itemReviews.map((item) => item.proposalId).sort();
      if (JSON.stringify(proposalIds) !== JSON.stringify(reviewedIds)) {
        pushError(errors, "item_review_coverage", casePath, { proposalIds, reviewedIds });
      }
      for (const [index, itemReview] of review.itemReviews.entries()) {
        if (!sameKeys(itemReview, ["proposalId", "decision", "comment"])) {
          pushError(errors, "item_review_keys", `${casePath}.itemReviews[${index}]`);
        }
        if (!["keep", "edit", "delete"].includes(itemReview.decision)) {
          pushError(errors, "item_review_decision", `${casePath}.itemReviews[${index}]`);
        }
        if (typeof itemReview.comment !== "string" || itemReview.comment.trim().length === 0) {
          pushError(errors, "item_review_comment", `${casePath}.itemReviews[${index}]`);
        }
      }
      for (const [index, signal] of review.unsupportedSignals.entries()) {
        if (!sameKeys(signal, ["class", "field", "quote", "comment"])) {
          pushError(errors, "unsupported_signal_keys", `${casePath}.unsupportedSignals[${index}]`);
        }
        if (!["action", "date", "repeat", "fact"].includes(signal.class)) {
          pushError(errors, "unsupported_signal_class", `${casePath}.unsupportedSignals[${index}]`);
        }
        for (const key of ["field", "quote", "comment"]) {
          if (typeof signal[key] !== "string" || signal[key].trim().length === 0) {
            pushError(errors, "unsupported_signal_text", `${casePath}.unsupportedSignals[${index}].${key}`);
          }
        }
      }
      if (input.positiveCase) {
        if (!sameKeys(review.scores, scoreKeys) || !sameKeys(review.scoreComments, scoreKeys)) {
          pushError(errors, "score_keys", casePath);
        } else {
          for (const key of scoreKeys) {
            if (!Number.isInteger(review.scores[key]) || review.scores[key] < 1 || review.scores[key] > 5) {
              pushError(errors, "score_range", `${casePath}.scores.${key}`, review.scores[key]);
            }
            if (
              typeof review.scoreComments[key] !== "string" ||
              review.scoreComments[key].trim().length === 0
            ) {
              pushError(errors, "score_comment", `${casePath}.scoreComments.${key}`);
            }
          }
        }
      } else if (review.scores !== null || review.scoreComments !== null) {
        pushError(errors, "negative_scores_must_be_null", casePath);
      }
      if (!["keep", "edit", "reject"].includes(review.verdict)) {
        pushError(errors, "review_verdict", casePath, review.verdict);
      }
      if (review.topFix !== null && (typeof review.topFix !== "string" || review.topFix.trim() === "")) {
        pushError(errors, "top_fix_type", casePath);
      }
      cases.push({ ...review, reviewFile: fileName });
    }
  }

  for (const caseId of inputByCase.keys()) {
    if (!seen.has(caseId)) pushError(errors, "missing_review_case", caseId);
  }
  const positives = cases.filter((entry) => entry.positiveCase);
  const negatives = cases.filter((entry) => !entry.positiveCase);
  const itemReviews = positives.flatMap((entry) => entry.itemReviews);
  const decisionCounts = {
    keep: itemReviews.filter((entry) => entry.decision === "keep").length,
    edit: itemReviews.filter((entry) => entry.decision === "edit").length,
    delete: itemReviews.filter((entry) => entry.decision === "delete").length,
  };
  const totalDecisions = Object.values(decisionCounts).reduce((sum, count) => sum + count, 0);
  const unsupportedSignals = positives.flatMap((entry) => entry.unsupportedSignals);
  const unsupportedCounts = Object.fromEntries(
    ["action", "date", "repeat", "fact"].map((key) => [
      key,
      unsupportedSignals.filter((entry) => entry.class === key).length,
    ]),
  );
  const axisAverages = Object.fromEntries(
    scoreKeys.map((key) => [
      key,
      positives.length === 0
        ? 0
        : positives.reduce((sum, entry) => sum + (entry.scores?.[key] ?? 0), 0) /
          positives.length,
    ]),
  );
  const sevenAxisAverage =
    Object.values(axisAverages).reduce((sum, score) => sum + score, 0) / scoreKeys.length;
  const negativeExact = negatives.filter((entry) => entry.verdict === "keep").length;
  const gates = {
    reviewIntegrity: errors.length === 0,
    reviewedCases: cases.length === 12,
    positiveCoverage: positives.length === 10,
    negativeDisposition: negativeExact === 2,
    itemKeepRate: totalDecisions > 0 && decisionCounts.keep / totalDecisions >= 0.8,
    unsupportedContent: unsupportedSignals.length === 0,
    sevenAxisAverage: sevenAxisAverage >= 3.5,
    executionClarity: axisAverages.executionClarity >= 4,
    contentFidelityCoverage: axisAverages.contentFidelityCoverage >= 4,
    sourceSafetySeparation: axisAverages.sourceSafetySeparation >= 4,
  };
  const report = {
    validationVersion: "flowme-source-row-review-validation-v1",
    laneId,
    round,
    passed: Object.values(gates).every(Boolean),
    integrityPassed: errors.length === 0,
    errors,
    metrics: {
      reviewedCaseCount: cases.length,
      positiveCaseCount: positives.length,
      deterministicNegativeCount: negatives.length,
      negativeExact,
      decisionCounts,
      itemKeepRate: totalDecisions === 0 ? 0 : decisionCounts.keep / totalDecisions,
      unsupportedSignalCount: unsupportedSignals.length,
      unsupportedCounts,
      axisAverages,
      sevenAxisAverage,
    },
    gates,
    cases,
  };
  const target = outPath
    ? path.resolve(repoRoot, outPath)
    : path.join(reviewDir, "validation.json");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (typeof process !== "undefined" && typeof process.stdout?.write === "function") {
  validateSourceRowReviews(process.argv[2] ?? "round-2", process.argv[3] ?? null)
    .then((report) => {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      if (!report.passed) process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
