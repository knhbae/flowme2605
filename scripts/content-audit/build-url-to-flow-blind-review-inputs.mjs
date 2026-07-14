import fs from 'node:fs';
import path from 'node:path';
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
const rubric = {
  version: 'flowme-url-to-flow-prompt-lab-review-rubric-v1',
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

const round = parseRound(process.argv.slice(2));
const casesDoc = readJson(path.join(specDir, 'cases-v1.json'));
const expectedDoc = readJson(path.join(specDir, 'expected-v1.json'));

if (!Array.isArray(casesDoc.cases)) {
  throw new Error('cases-v1.json must contain a cases array.');
}
if (!Array.isArray(expectedDoc.expectations)) {
  throw new Error('expected-v1.json must contain an expectations array.');
}
if (expectedDoc.caseSetVersion !== casesDoc.caseSetVersion) {
  throw new Error('Case and expectation set versions do not match.');
}
if (expectedDoc.hiddenFromGenerator !== true) {
  throw new Error('Expected fixtures must remain hidden from generators.');
}

const casesById = indexUnique(casesDoc.cases, 'cases-v1.json');
const expectationsById = indexUnique(
  expectedDoc.expectations,
  'expected-v1.json',
);
const runsDir = path.join(auditDir, 'runs', round);

if (!fs.existsSync(runsDir)) {
  throw new Error(`Run directory does not exist: ${path.relative(root, runsDir)}`);
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
  if (!Array.isArray(run.outputs)) {
    throw new Error(`${path.relative(root, runFile)} has no outputs array.`);
  }
  for (const proposal of run.outputs) {
    if (!proposal || typeof proposal.caseId !== 'string') {
      throw new Error(`${path.relative(root, runFile)} has an output without caseId.`);
    }
    if (!casesById.has(proposal.caseId)) {
      throw new Error(`Unknown proposal caseId ${proposal.caseId}.`);
    }
    if (proposalsById.has(proposal.caseId)) {
      throw new Error(`Duplicate proposal for ${proposal.caseId} in ${round}.`);
    }
    proposalsById.set(proposal.caseId, proposal);
  }
}

if (proposalsById.size !== casesById.size) {
  throw new Error(
    `${round} contains ${proposalsById.size} proposals for ${casesById.size} cases.`,
  );
}
for (const caseInput of casesDoc.cases) {
  if (!expectationsById.has(caseInput.caseId)) {
    throw new Error(`Missing hidden expectation for ${caseInput.caseId}.`);
  }
  if (!proposalsById.has(caseInput.caseId)) {
    throw new Error(`Missing ${round} proposal for ${caseInput.caseId}.`);
  }
}

const outputDir = path.join(auditDir, 'review-inputs', round);
fs.mkdirSync(outputDir, { recursive: true });

const manifest = {
  reviewInputSetVersion: 'flowme-url-to-flow-blind-review-inputs-v1',
  round,
  caseSetVersion: casesDoc.caseSetVersion,
  expectationSetVersion: expectedDoc.expectationSetVersion,
  rubric,
  reviewResultTemplate,
  generator:
    'scripts/content-audit/build-url-to-flow-blind-review-inputs.mjs',
  disclosure:
    'Each case file contains one source packet, its hidden review expectation, and one raw proposal. Run-level model, timing, usage, and cost evidence is excluded. Validator results are not embedded in run logs, so reviewer status starts as null.',
  caseCount: casesDoc.cases.length,
  cases: [],
};

for (const caseInput of casesDoc.cases) {
  const expectation = expectationsById.get(caseInput.caseId);
  const proposal = proposalsById.get(caseInput.caseId);
  const reviewInput = {
    reviewInputSchemaVersion: 'flowme-url-to-flow-blind-review-input-v1',
    round,
    caseId: caseInput.caseId,
    caseSetVersion: casesDoc.caseSetVersion,
    expectationSetVersion: expectedDoc.expectationSetVersion,
    promptVersion: proposal.promptVersion,
    proposalSchemaVersion: proposal.proposalSchemaVersion,
    rubric,
    reviewResultTemplate,
    sourcePacket: caseInput,
    hiddenExpectation: expectation,
    proposal,
    validator: {
      passed: null,
      hardFailCodes: [],
    },
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
    promptVersion: proposal.promptVersion,
    validatorPassed: null,
  });
}

fs.writeFileSync(
  path.join(outputDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(
  `Wrote ${manifest.caseCount} model-evidence-free review inputs for ${round}.`,
);
console.log(path.relative(root, outputDir).replaceAll('\\', '/'));
