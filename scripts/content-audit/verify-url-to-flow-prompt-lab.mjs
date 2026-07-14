import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const specDir = path.join(root, 'docs', 'specs', '2026-07-14-url-to-flow-prompt-lab');
const auditDir = path.join(root, 'docs', 'content-audit', '2026-07-14-url-to-flow-prompt-lab');
const runsDir = path.join(auditDir, 'runs');
const proposalValidator = path.join(here, 'validate-url-to-flow-prompt-lab.mjs');
const reviewValidator = path.join(here, 'validate-url-to-flow-prompt-lab-reviews.mjs');
const wantsJson = process.argv.includes('--json');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const rel = (file) => path.relative(root, file).replaceAll('\\', '/');
const checks = [];

function check(name, condition, evidence) {
  checks.push({ name, passed: Boolean(condition), evidence });
}

function runJson(script, args) {
  const result = spawnSync(process.execPath, [script, ...args, '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (!result.stdout.trim()) {
    throw new Error(`No JSON from ${rel(script)} ${args.join(' ')}: ${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

function collectJson(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectJson(target);
      return entry.isFile() && entry.name.endsWith('.json') ? [target] : [];
    })
    .sort();
}

function validationFor(files) {
  const reports = files.map((file) => runJson(proposalValidator, ['--file', file]));
  return {
    runs: reports.reduce((sum, report) => sum + report.runFiles, 0),
    validRuns: reports.reduce((sum, report) => sum + report.validRuns, 0),
    outputs: reports.reduce((sum, report) => sum + report.outputCount, 0),
    validOutputs: reports.reduce((sum, report) => sum + report.validOutputs, 0),
    errors: reports.reduce((sum, report) => sum + report.errors, 0),
    reports,
  };
}

const casesDoc = readJson(path.join(specDir, 'cases-v1.json'));
const expectedDoc = readJson(path.join(specDir, 'expected-v1.json'));
const proposalSchema = readJson(path.join(specDir, 'proposal-schema-v1.json'));
const reportData = readJson(path.join(auditDir, 'report-data.json'));
const promptV02 = fs.readFileSync(path.join(specDir, 'prompt-v0.2.md'), 'utf8');
const reportHtml = fs.readFileSync(path.join(auditDir, 'report.html'), 'utf8');

const caseIds = casesDoc.cases.map((entry) => entry.caseId);
const expectationKinds = expectedDoc.expectations.map((entry) => entry.fixtureKind);
check(
  'fixed_case_set',
  casesDoc.cases.length === 12 &&
    new Set(caseIds).size === 12 &&
    expectationKinds.filter((kind) => kind === 'positive').length === 10 &&
    expectationKinds.filter((kind) => kind === 'negative').length === 2,
  '12 unique cases = 10 positive + 2 negative',
);

const forbiddenGeneratorKeys = new Set([
  'expectedStatus',
  'expectedItems',
  'expectedProjections',
  'readiness',
  'referenceReview',
]);
function leakedKey(value) {
  if (Array.isArray(value)) return value.some(leakedKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, child]) => forbiddenGeneratorKeys.has(key) || leakedKey(child),
  );
}
check(
  'generator_blinding',
  expectedDoc.hiddenFromGenerator === true && !casesDoc.cases.some(leakedKey),
  'cases contain no expected status, Item, projection, readiness, or review keys',
);

check(
  'provider_neutral_prompt',
  !/(openai|anthropic|claude|gemini|mistral|cohere)/i.test(promptV02),
  'prompt v0.2 names no provider or model brand',
);
check(
  'compact_schema',
  proposalSchema.$id ===
      'https://flowme.local/schemas/url-to-flow-semantic-proposal-v1.json' &&
    proposalSchema.additionalProperties === false &&
    proposalSchema.required.length === 10 &&
    proposalSchema.properties.proposalSchemaVersion.const ===
      'flowme-semantic-proposal-v1',
  'proposal schema v1 is strict at the top level',
);

const round1Files = ['batch-a.json', 'batch-b.json', 'batch-c.json'].map((name) =>
  path.join(runsDir, 'round-1', name),
);
const round2Files = ['batch-a.json', 'batch-b.json', 'batch-c.json'].map((name) =>
  path.join(runsDir, 'round-2', name),
);
const round3AcceptedFiles = ['batch-g.json', 'batch-f.json'].map((name) =>
  path.join(runsDir, 'round-3', name),
);
const round3DiscardedFiles = ['batch-d.json', 'batch-e.json'].map((name) =>
  path.join(runsDir, 'round-3', name),
);
const r1 = validationFor(round1Files);
const r2 = validationFor(round2Files);
const r3 = validationFor(round3AcceptedFiles);
const r3Discarded = validationFor(round3DiscardedFiles);
check(
  'round_1_baseline',
  r1.outputs === 12 && r1.validOutputs === 1 && r1.errors === 27,
  `${r1.validOutputs}/${r1.outputs} valid, ${r1.errors} errors preserved`,
);
check(
  'round_2_schema_and_accounting',
  r2.runs === 3 && r2.validRuns === 3 && r2.outputs === 12 && r2.validOutputs === 12,
  `${r2.validOutputs}/${r2.outputs} outputs and ${r2.validRuns}/${r2.runs} runs valid`,
);
check(
  'round_3_stability_runs',
  r3.runs === 2 && r3.validRuns === 2 && r3.outputs === 7 && r3.validOutputs === 7,
  `${r3.validOutputs}/${r3.outputs} accepted outputs valid`,
);
check(
  'discarded_envelope_provenance',
  r3Discarded.validRuns === 0 &&
    r3Discarded.validOutputs === 7 &&
    r3Discarded.reports.every((report) =>
      report.results.every((run) =>
        run.errors.some((error) => error.code === 'case_set_version'),
      ),
    ),
  '2 raw orchestration envelopes rejected; their 7 outputs remain preserved',
);

const round1Review = runJson(reviewValidator, ['--round', 'round-1']);
const round2Review = runJson(reviewValidator, ['--round', 'round-2']);
check(
  'blind_reviews',
  round1Review.validCases === 12 &&
    round1Review.errors === 0 &&
    round2Review.validCases === 12 &&
    round2Review.errors === 0,
  'Round 1 12/12 and Round 2 12/12 review records valid',
);

const reviewInputFiles = [
  ...collectJson(path.join(auditDir, 'review-inputs', 'round-1')),
  ...collectJson(path.join(auditDir, 'review-inputs', 'round-2')),
].filter((file) => path.basename(file) !== 'manifest.json');
const reviewInputsHideModel = reviewInputFiles.every((file) => {
  const text = fs.readFileSync(file, 'utf8');
  return !/("modelEvidence"|"modelTier"|"timing"|"usage"|"cost")/.test(text);
});
check(
  'model_blinded_review_inputs',
  reviewInputFiles.length === 24 && reviewInputsHideModel,
  '24 per-case review inputs contain no model/timing/usage/cost lane',
);

const m = reportData.metrics;
check('source_accounting_gate', m.sourceAccountingRate === 1, '100%');
check(
  'unsupported_content_gate',
  m.unsupportedActionDateFactDetections === 0 &&
    reportData.cases.every((entry) => Array.isArray(entry.reviewHardFailCodes)),
  '0 explicit blind-review hard-fail codes across Round 2',
);
check(
  'negative_gate',
  m.negativeGatePasses === 2 && m.negativeCases === 2,
  `${m.negativeGatePasses}/${m.negativeCases}`,
);
check('item_keep_gate', m.itemKeepRate >= 0.8, `${m.itemKeepRate}`);
check('quality_average_gate', m.qualityAverage >= 3.5, `${m.qualityAverage}/5`);
check(
  'required_axis_gates',
  m.scoreAverages.executionClarity >= 4 &&
    m.scoreAverages.contentFidelityAndCoverage >= 4 &&
    m.scoreAverages.sourceAndSafetySeparation >= 4,
  `execution ${m.scoreAverages.executionClarity}, fidelity ${m.scoreAverages.contentFidelityAndCoverage}, safety ${m.scoreAverages.sourceAndSafetySeparation}`,
);
check(
  'stability_gate',
  m.stabilityMatches / m.stabilityCases >= 0.8,
  `${m.stabilityMatches}/${m.stabilityCases} exact structure match`,
);

const allRuns = [
  ...round1Files,
  ...round2Files,
  ...round3AcceptedFiles,
  ...round3DiscardedFiles,
].map(readJson);
const evidenceHonest = allRuns.every(
  (run) =>
    run.modelEvidence.evidenceKind === 'in_session_same_model' &&
    run.modelEvidence.modelTier === 'unclassified' &&
    ['timing', 'usage', 'cost'].every((lane) => {
      const entries = Object.entries(run[lane]).filter(([key]) => key !== 'evidenceKind');
      return run[lane].evidenceKind === 'not_available' && entries.every(([, value]) => value === null);
    }),
);
check(
  'provider_cost_evidence_boundary',
  evidenceHonest && m.realProviderCostEvidenceAvailable === false,
  'same-model/unclassified; latency, token, cost are null + not_available',
);

const positiveCases = reportData.cases.filter((entry) => entry.fixtureKind === 'positive');
check(
  'corrected_previews',
  positiveCases.length === 10 &&
    positiveCases.every(
      (entry) =>
        entry.correctedPreview.title && entry.correctedPreview.items.length > 0,
    ),
  '10/10 positive cases have source-grounded corrected previews',
);

const packetCounts = ['v0.1', 'v0.2'].map((version) =>
  fs
    .readdirSync(path.join(auditDir, 'packets', version))
    .filter((name) => /^case-\d{2}\.md$/.test(name)).length,
);
check(
  'model_change_packets',
  packetCounts.every((count) => count === 12),
  '12 isolated copy-paste packets for both v0.1 and v0.2',
);

const localLinks = [
  './comparison.md',
  './report-data.json',
  '../../specs/2026-07-14-url-to-flow-prompt-lab/prompt-v0.2.md',
  '../../specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md',
];
check(
  'report_artifacts',
  (reportHtml.match(/<section class="slide /g) ?? []).length === 15 &&
    !/(src|href)="https?:\/\//.test(reportHtml) &&
    localLinks.every((href) => fs.existsSync(path.resolve(auditDir, href))),
  '15-slide self-contained HTML and all local links resolve',
);

const summary = {
  verifierVersion: 'flowme-url-to-flow-prompt-lab-verifier-v1',
  passed: checks.every((entry) => entry.passed),
  passedChecks: checks.filter((entry) => entry.passed).length,
  totalChecks: checks.length,
  checks,
};

if (wantsJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(
    `Prompt Lab completion verifier: ${summary.passedChecks}/${summary.totalChecks} checks passed.`,
  );
  for (const entry of checks) {
    console.log(`${entry.passed ? 'PASS' : 'FAIL'} ${entry.name}: ${entry.evidence}`);
  }
}

process.exit(summary.passed ? 0 : 1);
