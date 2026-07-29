import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const specDir = path.join(
  root,
  'docs',
  'specs',
  '2026-07-14-url-to-flow-prompt-lab',
);
const auditDir = path.join(
  root,
  'docs',
  'content-audit',
  '2026-07-14-url-to-flow-prompt-lab',
);
const proposalValidator = path.join(
  here,
  'validate-url-to-flow-prompt-lab.mjs',
);
const rubric = {
  version: 'flowme-url-to-flow-prompt-lab-review-rubric-v2',
  reference:
    'docs/specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md',
};
const reviewResultTemplate =
  'docs/specs/2026-07-14-url-to-flow-prompt-lab/review-result-template.json';

function usage() {
  return `Usage:
  node scripts/content-audit/build-url-to-flow-blind-review-inputs.mjs [round]

Defaults to round-2. Example: round-1`;
}

function parseRound(args) {
  if (args.includes('--help')) {
    console.log(usage());
    process.exit(0);
  }
  if (args.length > 1) throw new Error(usage());
  const round = args[0] ?? 'round-2';
  if (!/^round-[1-9]\d*$/.test(round)) {
    throw new Error('Round must look like round-1 or round-2.');
  }
  return round;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function relativeFile(filePath) {
  return path.relative(root, filePath).replaceAll('\\', '/');
}

function indexUnique(entries, label) {
  const result = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.caseId !== 'string') {
      throw new Error(`${label} contains an entry without caseId.`);
    }
    if (result.has(entry.caseId)) {
      throw new Error(`${label} contains duplicate ${entry.caseId}.`);
    }
    result.set(entry.caseId, entry);
  }
  return result;
}

function proposalFingerprint(proposal) {
  const digest = createHash('sha256')
    .update(JSON.stringify(proposal), 'utf8')
    .digest('hex');
  return `sha256:${digest}`;
}

function validateRawRun(runFile) {
  const result = spawnSync(
    process.execPath,
    [proposalValidator, '--file', runFile, '--json'],
    { cwd: root, encoding: 'utf8' },
  );
  if (!result.stdout.trim()) {
    throw new Error(
      `Proposal validator returned no JSON for ${relativeFile(runFile)}: ${result.stderr.trim()}`,
    );
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `Proposal validator returned invalid JSON for ${relativeFile(runFile)}: ${error.message}`,
    );
  }

  if (
    typeof report.validatorVersion !== 'string' ||
    !Array.isArray(report.results) ||
    report.results.length !== 1
  ) {
    throw new Error(
      `Proposal validator envelope is invalid for ${relativeFile(runFile)}.`,
    );
  }

  const validatedRun = report.results[0];
  if (!Array.isArray(validatedRun.errors) || !Array.isArray(validatedRun.outputs)) {
    throw new Error(
      `Proposal validator result is incomplete for ${relativeFile(runFile)}.`,
    );
  }

  const outputs = new Map();
  for (const output of validatedRun.outputs) {
    if (!output || typeof output.caseId !== 'string') continue;
    if (outputs.has(output.caseId)) {
      throw new Error(
        `Proposal validator returned duplicate ${output.caseId} for ${relativeFile(runFile)}.`,
      );
    }
    const codes = [
      ...new Set([
        ...validatedRun.errors.map((error) => error.code),
        ...(output.errors ?? []).map((error) => error.code),
      ]),
    ].sort();
    outputs.set(output.caseId, {
      validatorVersion: report.validatorVersion,
      passed: validatedRun.errors.length === 0 && output.valid === true,
      codes,
    });
  }

  return {
    validatorVersion: report.validatorVersion,
    runId: validatedRun.runId,
    outputs,
  };
}

const round = parseRound(process.argv.slice(2));
const casesDoc = readJson(path.join(specDir, 'cases-v1.json'));

if (!Array.isArray(casesDoc.cases)) {
  throw new Error('cases-v1.json must contain a cases array.');
}

const casesById = indexUnique(casesDoc.cases, 'cases-v1.json');
const runsDir = path.join(auditDir, 'runs', round);

if (!fs.existsSync(runsDir)) {
  throw new Error(`Run directory does not exist: ${relativeFile(runsDir)}`);
}

const runFiles = fs
  .readdirSync(runsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  .map((entry) => path.join(runsDir, entry.name))
  .sort();

if (runFiles.length === 0) {
  throw new Error(`No run JSON files found for ${round}.`);
}

const proposalsById = new Map();
for (const runFile of runFiles) {
  const run = readJson(runFile);
  const validation = validateRawRun(runFile);
  if (!Array.isArray(run.outputs)) {
    throw new Error(`${relativeFile(runFile)} has no outputs array.`);
  }
  if (run.runId !== validation.runId) {
    throw new Error(`${relativeFile(runFile)} runId differs from validator evidence.`);
  }
  for (const proposal of run.outputs) {
    if (!proposal || typeof proposal.caseId !== 'string') {
      throw new Error(`${relativeFile(runFile)} has an output without caseId.`);
    }
    if (!casesById.has(proposal.caseId)) {
      throw new Error(`Unknown proposal caseId ${proposal.caseId}.`);
    }
    if (proposalsById.has(proposal.caseId)) {
      throw new Error(`Duplicate proposal for ${proposal.caseId} in ${round}.`);
    }
    const validator = validation.outputs.get(proposal.caseId);
    if (!validator) {
      throw new Error(
        `Proposal validator returned no evidence for ${proposal.caseId} in ${relativeFile(runFile)}.`,
      );
    }
    proposalsById.set(proposal.caseId, {
      proposal,
      rawRun: {
        runFile: relativeFile(runFile),
        runId: run.runId,
      },
      proposalFingerprint: proposalFingerprint(proposal),
      validator,
    });
  }
}

if (proposalsById.size !== casesById.size) {
  throw new Error(
    `${round} contains ${proposalsById.size} proposals for ${casesById.size} cases.`,
  );
}
for (const caseInput of casesDoc.cases) {
  if (!proposalsById.has(caseInput.caseId)) {
    throw new Error(`Missing ${round} proposal for ${caseInput.caseId}.`);
  }
}

const outputDir = path.join(auditDir, 'review-inputs', round);
fs.mkdirSync(outputDir, { recursive: true });

const manifest = {
  reviewInputSetVersion: 'flowme-url-to-flow-blind-review-inputs-v2',
  round,
  caseSetVersion: casesDoc.caseSetVersion,
  rubric,
  reviewResultTemplate,
  proposalFingerprintAlgorithm:
    'sha256:<64 lowercase hex> over UTF-8 JSON.stringify(proposal) with no whitespace',
  generator:
    'scripts/content-audit/build-url-to-flow-blind-review-inputs.mjs',
  disclosure:
    'Each case contains only the fixed source packet, one raw proposal, its raw runFile/runId, a proposal fingerprint, and deterministic validator pass/codes. Expected fixtures and all provider, model, timing, usage, and cost evidence are excluded.',
  caseCount: casesDoc.cases.length,
  cases: [],
};

for (const caseInput of casesDoc.cases) {
  const record = proposalsById.get(caseInput.caseId);
  const reviewInput = {
    reviewInputSchemaVersion: 'flowme-url-to-flow-blind-review-input-v2',
    round,
    caseId: caseInput.caseId,
    caseSetVersion: casesDoc.caseSetVersion,
    promptVersion: record.proposal.promptVersion,
    proposalSchemaVersion: record.proposal.proposalSchemaVersion,
    rubric,
    reviewResultTemplate,
    rawRun: record.rawRun,
    proposalFingerprint: record.proposalFingerprint,
    sourcePacket: caseInput,
    proposal: record.proposal,
    validator: record.validator,
  };
  const file = `${caseInput.caseId}.json`;
  fs.writeFileSync(
    path.join(outputDir, file),
    `${JSON.stringify(reviewInput, null, 2)}\n`,
    'utf8',
  );
  manifest.cases.push({
    caseId: caseInput.caseId,
    file,
    promptVersion: record.proposal.promptVersion,
    rawRun: record.rawRun,
    proposalFingerprint: record.proposalFingerprint,
    validator: record.validator,
  });
}

fs.writeFileSync(
  path.join(outputDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(
  `Wrote ${manifest.caseCount} expectation-free, model-evidence-free review inputs for ${round}.`,
);
console.log(relativeFile(outputDir));
