import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
const schemaPath = path.join(
  repoRoot,
  "docs/specs/2026-07-14-url-to-flow-prompt-lab/proposal-schema-v1.json",
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

export async function buildSourceRowPromptPackets(revision = "v1.1") {
  if (!/^v1\.[01]$/.test(revision)) throw new Error(`Unsupported corrected prompt revision: ${revision}`);
  const promptVersion = `url-to-flow-prompt-${revision}`;
  const promptPath = path.join(specDir, `prompt-${revision}.md`);
  const promptTemplate = await readFile(promptPath, "utf8");
  const casesPath = path.join(specDir, "cases-v1.json");
  const caseDocument = await readJson(casesPath);
  const schemaRaw = await readFile(schemaPath, "utf8");
  const baseManifest = await readJson(path.join(auditDir, "packets/v1.0/manifest.json"));
  const basePipelineDir = path.join(auditDir, "packets/v1.0/pipeline");
  const outputDir = path.join(auditDir, `packets/${revision}`);
  const pipelineDir = path.join(outputDir, "pipeline");
  const promptDir = path.join(outputDir, "generator-prompts");
  await mkdir(pipelineDir, { recursive: true });
  await mkdir(promptDir, { recursive: true });

  if (promptTemplate.split("{{CASE_INPUT_JSON}}").length - 1 !== 1) {
    throw new Error("Prompt must contain exactly one CASE_INPUT_JSON placeholder");
  }

  const pipelinePackets = [];
  const generatorPrompts = [];
  for (const caseEntry of caseDocument.cases) {
    const basePipeline = await readJson(path.join(basePipelineDir, `${caseEntry.caseId}.json`));
    const deterministicProposal = basePipeline.deterministicProposal
      ? {
          ...basePipeline.deterministicProposal,
          promptVersion,
        }
      : null;
    const packet = {
      ...basePipeline,
      promptVersion,
      generatorInput: caseEntry.generatorInput,
      deterministicProposal,
    };
    const packetPath = path.join(pipelineDir, `${caseEntry.caseId}.json`);
    const packetRaw = `${JSON.stringify(packet, null, 2)}\n`;
    await writeFile(packetPath, packetRaw, "utf8");
    pipelinePackets.push({
      caseId: caseEntry.caseId,
      path: toRepoPath(packetPath),
      sha256: sha256(packetRaw),
      modelInvoked: caseEntry.preflightResult.modelInvoked,
    });

    if (caseEntry.generatorInput) {
      const inputRaw = JSON.stringify(caseEntry.generatorInput, null, 2);
      const baseRecord = baseManifest.generatorPrompts.find(
        (entry) => entry.caseId === caseEntry.caseId,
      );
      const semanticPayloadSha256 = sha256(inputRaw);
      if (baseRecord?.semanticPayloadSha256 !== semanticPayloadSha256) {
        throw new Error(`Generator input changed after freeze: ${caseEntry.caseId}`);
      }
      const rendered = promptTemplate.replace("{{CASE_INPUT_JSON}}", inputRaw);
      const renderedPath = path.join(promptDir, `${caseEntry.caseId}.md`);
      await writeFile(renderedPath, rendered, "utf8");
      generatorPrompts.push({
        caseId: caseEntry.caseId,
        path: toRepoPath(renderedPath),
        sha256: sha256(rendered),
        semanticPayloadSha256,
        byteIdenticalInputToV1_0: true,
      });
    }
  }

  const manifest = {
    manifestVersion: "flowme-source-row-packet-manifest-v1",
    laneId,
    caseSetVersion: caseDocument.caseSetVersion,
    promptVersion,
    proposalSchemaVersion: caseDocument.proposalSchemaVersion,
    oneDefectRevision: {
      selectedClass: "required_output_contract_compliance",
      evidencePath:
        "docs/content-audit/2026-07-15-url-to-flow-prompt-lab-source-row-v1/runs/round-1/defect-selection.json",
    },
    promptTemplate: {
      path: toRepoPath(promptPath),
      sha256: sha256(promptTemplate),
    },
    schema: {
      path: toRepoPath(schemaPath),
      sha256: sha256(schemaRaw),
      unchangedFromV1_0: sha256(schemaRaw) === baseManifest.schema.sha256,
    },
    cases: {
      path: toRepoPath(casesPath),
      sha256: sha256(await readFile(casesPath)),
      unchangedFromV1_0:
        sha256(await readFile(casesPath)) === baseManifest.cases.sha256,
    },
    pipelinePacketCount: pipelinePackets.length,
    generatorPromptCount: generatorPrompts.length,
    deterministicNegativeCount: pipelinePackets.filter((entry) => !entry.modelInvoked).length,
    pipelinePackets,
    generatorPrompts,
  };
  await writeJson(path.join(outputDir, "manifest.json"), manifest);
  return {
    revision,
    promptVersion,
    pipelinePackets: pipelinePackets.length,
    generatorPrompts: generatorPrompts.length,
    deterministicNegatives: manifest.deterministicNegativeCount,
    inputsFrozen: generatorPrompts.every((entry) => entry.byteIdenticalInputToV1_0),
    schemaFrozen: manifest.schema.unchangedFromV1_0,
  };
}

if (typeof process !== "undefined" && typeof process.stdout?.write === "function") {
  buildSourceRowPromptPackets(process.argv[2] ?? "v1.1")
    .then((summary) => process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
