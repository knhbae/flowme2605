import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertExecutorIdAvailable,
  auditDir,
  canonicalSha256,
  collectExecutorEvidence,
  exists,
  laneId,
  readText,
  relativePath,
  repoRoot,
  sha256,
  writeText,
} from "./url-to-flow-strict-v2-core.mjs";
import {
  reviewRawPath,
  verifyReviewManifestArtifacts,
} from "./build-url-to-flow-strict-v2-review-inputs.mjs";

function parseArgs(argv) {
  const args = { round: null, batch: null, raw: null, agentId: null, taskName: null };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (["--round", "--batch", "--raw", "--agent-id", "--task-name"].includes(token)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${token} requires a value`);
      const key = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      args[key] = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${token}`);
  }
  for (const key of Object.keys(args)) if (!args[key]) throw new Error(`Missing required argument: ${key}`);
  if (!/^round-[123]$/.test(args.round)) throw new Error(`Invalid round: ${args.round}`);
  if (!/^batch-[abc]$/.test(args.batch)) throw new Error(`Invalid batch: ${args.batch}`);
  return args;
}

async function writeOnceOrVerify(filePath, value) {
  if (await exists(filePath)) {
    if ((await readText(filePath)) !== value) throw new Error(`Review evidence differs: ${relativePath(filePath)}`);
    return;
  }
  await writeText(filePath, value);
}

export async function assembleStrictReview(argv) {
  const args = parseArgs(argv);
  const outputPath = path.join(auditDir, "reviews", args.round, `${args.batch}.json`);
  const executorEvidence = await collectExecutorEvidence();
  if (!executorEvidence.passed) {
    throw new Error(
      `Existing executor evidence is not globally unique and complete: ${JSON.stringify({
        missingIds: executorEvidence.missingIds,
        duplicates: executorEvidence.duplicates,
      })}`,
    );
  }
  await assertExecutorIdAvailable(args.agentId, outputPath);
  const verified = await verifyReviewManifestArtifacts({ round: args.round });
  const { manifest } = verified;
  const manifestEntry = manifest.entries.find((entry) => entry.batchRef === args.batch);
  if (!manifestEntry) throw new Error(`Unknown review batch: ${args.batch}`);
  const rawPath = path.resolve(repoRoot, args.raw);
  const expectedRawPath = reviewRawPath(args.round, args.batch);
  if (rawPath !== expectedRawPath) {
    throw new Error(`Review raw must use ${relativePath(expectedRawPath)}`);
  }
  const rawResponse = await readText(rawPath);
  const assemblyIssues = [];
  let parsed = null;
  let parseSucceeded = false;
  let reviews = [];
  try {
    parsed = JSON.parse(rawResponse);
    parseSucceeded = true;
  } catch (error) {
    assemblyIssues.push({ code: "raw_review_not_json", detail: error.message });
  }
  if (parseSucceeded && !Array.isArray(parsed)) {
    assemblyIssues.push({ code: "raw_review_not_array", detail: typeof parsed });
  } else if (Array.isArray(parsed)) {
    reviews = parsed;
  }
  if (reviews.length !== manifestEntry.inputCount) {
    assemblyIssues.push({
      code: "review_count_mismatch",
      expected: manifestEntry.inputCount,
      actual: reviews.length,
    });
  }
  for (let index = 0; index < Math.min(reviews.length, manifestEntry.inputCount); index += 1) {
    const review = reviews[index];
    const sampleRef = manifestEntry.sampleRefs[index];
    if (!review || typeof review !== "object" || Array.isArray(review)) {
      assemblyIssues.push({ code: "review_not_object", index });
      continue;
    }
    if (review.sampleRef !== sampleRef) {
      assemblyIssues.push({
        code: "review_sample_order_mismatch",
        index,
        expected: sampleRef,
        actual: review.sampleRef ?? null,
      });
    }
    if (review.reviewInputSha256 !== manifestEntry.reviewInputSha256BySampleRef[sampleRef]) {
      assemblyIssues.push({ code: "review_input_hash_mismatch", index, sampleRef });
    }
    if (review.proposalFingerprint !== manifestEntry.proposalFingerprintBySampleRef[sampleRef]) {
      assemblyIssues.push({ code: "review_proposal_hash_mismatch", index, sampleRef });
    }
  }
  const envelope = {
    reviewEnvelopeVersion: "flowme-url-to-flow-strict-review-envelope-v2",
    laneId,
    round: args.round,
    batchRef: args.batch,
    evidenceClass: "current_session_model_proxy_blind_review",
    assemblyStatus: assemblyIssues.length === 0 ? "assembled" : "failure",
    assemblyIssues,
    bindings: {
      baseFreezeSha256: manifest.baseFreezeSha256,
      revisionFreezeSha256: manifest.revisionFreezeSha256,
      reviewManifestSha256: verified.manifestSha256,
      automatedValidationFile: manifest.automatedValidationFile,
      automatedValidationSha256: manifest.automatedValidationSha256,
      runEnvelopeSha256: manifestEntry.runEnvelopeSha256,
      rubricSha256: manifest.rubricSha256,
      reviewSchemaSha256: manifest.reviewSchemaSha256,
      exactTaskPayloadSha256: manifestEntry.exactTaskPayloadSha256,
      reviewInputFileSha256BySampleRef: manifestEntry.reviewInputFileSha256BySampleRef,
      reviewInputSha256BySampleRef: manifestEntry.reviewInputSha256BySampleRef,
      proposalFingerprintBySampleRef: manifestEntry.proposalFingerprintBySampleRef,
    },
    executor: {
      agentTaskId: args.agentId,
      taskName: args.taskName,
      forkTurns: "none",
      freshContextMethod: "spawn_agent_fork_none",
    },
    measurement: {
      provider: null,
      model: null,
      tier: null,
      inputTokens: null,
      outputTokens: null,
      latencyMs: null,
      cost: null,
      currency: null,
    },
    rawResponseSource: relativePath(rawPath),
    rawResponse,
    rawResponseSha256: sha256(rawResponse),
    parsedReviewsSha256: Array.isArray(parsed) ? canonicalSha256(reviews) : null,
    reviews,
  };
  await writeOnceOrVerify(outputPath, `${JSON.stringify(envelope, null, 2)}\n`);
  return {
    outputPath: relativePath(outputPath),
    assemblyStatus: envelope.assemblyStatus,
    assemblyIssueCount: assemblyIssues.length,
    reviewCount: reviews.length,
    rawResponseSha256: envelope.rawResponseSha256,
    exactTaskPayloadSha256: manifestEntry.exactTaskPayloadSha256,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  assembleStrictReview(process.argv.slice(2))
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (result.assemblyStatus !== "assembled") process.exitCode = 1;
    })
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
