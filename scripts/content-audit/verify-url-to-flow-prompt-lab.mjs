import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const specDir = path.join(root, 'docs', 'specs', '2026-07-14-url-to-flow-prompt-lab');
const auditDir = path.join(root, 'docs', 'content-audit', '2026-07-14-url-to-flow-prompt-lab');
const runsDir = path.join(auditDir, 'runs');
const fixtureFile = path.join(
  root,
  'docs',
  'specs',
  '2026-07-11-canonical-flow-data-model',
  'golden-fixtures-v1.json',
);
const proposalValidator = path.join(here, 'validate-url-to-flow-prompt-lab.mjs');
const reviewValidator = path.join(here, 'validate-url-to-flow-prompt-lab-reviews.mjs');
const wantsJson = process.argv.includes('--json');

const EXPECTED_FIXTURE_IDS = [
  'gf-pos-01-d-day-timeline',
  'gf-pos-02-fixed-routine',
  'gf-pos-03-source-checklist',
  'gf-pos-04-ordered-phase-procedure',
  'gf-pos-05-table-progress',
  'gf-pos-06-memo-first',
  'gf-pos-07-decision-hold',
  'gf-pos-08-evidence-caution',
  'gf-pos-09-resource-queue',
  'gf-pos-10-sparse-official-lifecycle',
  'gf-neg-01-missing-source-rows',
  'gf-neg-02-nonlocal-sensitive-source',
];
const EXPECTED_CASE_IDS = EXPECTED_FIXTURE_IDS.map(
  (_, index) => `case-${String(index + 1).padStart(2, '0')}`,
);
const SCORE_KEYS = [
  'userNeedFit',
  'executionClarity',
  'contentFidelityAndCoverage',
  'portabilityAndNaturalArtifact',
  'cognitiveLoad',
  'copySpecificity',
  'sourceAndSafetySeparation',
];
const ROUND3_CASE_IDS = [
  'case-01',
  'case-02',
  'case-05',
  'case-06',
  'case-10',
  'case-11',
  'case-12',
];

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const rel = (file) => path.relative(root, file).replaceAll('\\', '/');
const sameJsonValue = (left, right) =>
  JSON.stringify(canonicalJsonValue(left)) === JSON.stringify(canonicalJsonValue(right));
const sameNumber = (left, right) =>
  typeof left === 'number' && typeof right === 'number' && Math.abs(left - right) < 1e-9;
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const proposalFingerprint = (proposal) => `sha256:${sha256(JSON.stringify(proposal))}`;
const checks = [];

function canonicalJsonValue(value) {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalJsonValue(value[key])]),
  );
}

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

function indexByCase(entries) {
  const map = new Map();
  const duplicates = [];
  for (const entry of entries) {
    if (!entry || typeof entry.caseId !== 'string') continue;
    if (map.has(entry.caseId)) duplicates.push(entry.caseId);
    map.set(entry.caseId, entry);
  }
  return { map, duplicates };
}

function runOutputs(files) {
  return files.flatMap((file) => readJson(file).outputs ?? []);
}

function validatorOutputs(validation) {
  return validation.reports.flatMap((report) =>
    report.results.flatMap((run) => run.outputs ?? []),
  );
}

function reviewResults(round) {
  return collectJson(path.join(auditDir, 'reviews', round)).flatMap((file) => {
    const document = readJson(file);
    return Array.isArray(document.results) ? document.results : [];
  });
}

function hasForbiddenKey(value, predicate) {
  if (Array.isArray(value)) return value.some((entry) => hasForbiddenKey(entry, predicate));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, child]) => predicate(key) || hasForbiddenKey(child, predicate),
  );
}

function hasFixtureString(value, fixtureShapes) {
  if (typeof value === 'string') {
    return (
      /\bgf-(?:pos|neg)-\d{2}[a-z0-9-]*\b/i.test(value) ||
      [...fixtureShapes].some((shape) => value.includes(shape))
    );
  }
  if (Array.isArray(value)) return value.some((entry) => hasFixtureString(entry, fixtureShapes));
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some((entry) => hasFixtureString(entry, fixtureShapes));
}

function coreDecisionSignature(output) {
  const items = (output.proposal?.items ?? [])
    .map((item) => ({
      sourceRowIds: [...(item.sourceRowIds ?? [])].sort(),
      intent: item.intent ?? null,
      completionMode: item.completion?.mode ?? null,
      memoPresent: item.memoCandidate !== null,
      groupingPresent: item.groupingCandidate !== null,
      schedulePresent: item.scheduleCandidate !== null,
    }))
    .sort((left, right) =>
      left.sourceRowIds.join('|').localeCompare(right.sourceRowIds.join('|')),
    );
  const omissions = (output.proposal?.omittedRows ?? [])
    .map((omission) => ({
      sourceRowId: omission.sourceRowId,
      reasonCode: omission.reasonCode,
    }))
    .sort((left, right) => left.sourceRowId.localeCompare(right.sourceRowId));
  const projection = (output.projectionPlan ?? [])
    .map((entry) => ({
      target: entry.target,
      applicability: entry.applicability,
    }))
    .sort((left, right) =>
      `${left.target}|${left.applicability}`.localeCompare(
        `${right.target}|${right.applicability}`,
      ),
    );
  return {
    status: output.status,
    recommendedDisposition: output.reviewHints?.recommendedDisposition ?? null,
    artifact: output.conversionDecision?.primaryArtifact ?? null,
    planningPattern: output.conversionDecision?.planningPattern ?? null,
    items,
    omissions,
    projection,
  };
}

function average(values) {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

const fixtureSource = fs.readFileSync(fixtureFile, 'utf8');
const fixturesDoc = JSON.parse(fixtureSource);
const casesDoc = readJson(path.join(specDir, 'cases-v1.json'));
const expectedDoc = readJson(path.join(specDir, 'expected-v1.json'));
const proposalSchema = readJson(path.join(specDir, 'proposal-schema-v1.json'));
const reportDataSource = fs.readFileSync(
  path.join(auditDir, 'report-data.json'),
  'utf8',
);
const reportData = JSON.parse(reportDataSource);
const comparisonMarkdown = fs.readFileSync(
  path.join(auditDir, 'comparison.md'),
  'utf8',
);
const prompts = new Map(
  ['v0.1', 'v0.2'].map((version) => [
    version,
    fs.readFileSync(path.join(specDir, `prompt-${version}.md`), 'utf8'),
  ]),
);
const reportHtml = fs.readFileSync(path.join(auditDir, 'report.html'), 'utf8');

const fixtureIds = fixturesDoc.fixtures.map((entry) => entry.fixtureId);
const fixtureShapes = new Set(fixturesDoc.fixtures.map((entry) => entry.shape));
const caseIds = casesDoc.cases.map((entry) => entry.caseId);
const expectedCaseIds = expectedDoc.expectations.map((entry) => entry.caseId);
const expectedFixtureIds = expectedDoc.expectations.map((entry) => entry.fixtureId);
const expectedKinds = expectedDoc.expectations.map((entry) => entry.fixtureKind);
const sourceFixtureSha256 = sha256(fixtureSource);
check(
  'fixed_case_set',
  sameJsonValue(fixtureIds, EXPECTED_FIXTURE_IDS) &&
    sameJsonValue(caseIds, EXPECTED_CASE_IDS) &&
    sameJsonValue(expectedCaseIds, EXPECTED_CASE_IDS) &&
    sameJsonValue(expectedFixtureIds, EXPECTED_FIXTURE_IDS) &&
    expectedKinds.filter((kind) => kind === 'positive').length === 10 &&
    expectedKinds.filter((kind) => kind === 'negative').length === 2 &&
    expectedDoc.expectations.every(
      (entry, index) =>
        entry.fixtureShape === fixturesDoc.fixtures[index].shape &&
        entry.fixtureKind === fixturesDoc.fixtures[index].kind,
    ),
  'canonical fixture, case, and hidden-expectation order is exactly 10 positive + 2 negative',
);
check(
  'canonical_fixture_lineage',
  /^[0-9a-f]{64}$/.test(casesDoc.sourceFixtureSha256 ?? '') &&
    casesDoc.sourceFixtureSha256 === sourceFixtureSha256 &&
    expectedDoc.sourceFixtureSha256 === sourceFixtureSha256 &&
    casesDoc.fixtureSchemaVersion === fixturesDoc.fixtureSchemaVersion &&
    casesDoc.canonicalSchemaVersion === fixturesDoc.canonicalSchemaVersion &&
    casesDoc.generatedFrom === rel(fixtureFile) &&
    expectedDoc.generatedFrom === rel(fixtureFile),
  `fixture sha256 ${sourceFixtureSha256}`,
);

const forbiddenGeneratorKeys = new Set([
  'expectedStatus',
  'expectedConversion',
  'expectedItems',
  'expectedOmittedRows',
  'expectedProjections',
  'forbiddenProjections',
  'accountingSourceRowIds',
  'readiness',
  'referenceReview',
  'fixtureId',
  'fixtureKind',
  'fixtureShape',
  'shape',
  'hiddenExpectation',
]);
const neutralEvidenceRefs = casesDoc.cases.every(
  (caseInput) =>
    sameJsonValue(caseInput.inputEvidenceRefs, [
      `prompt-lab-source:${caseInput.caseId}`,
    ]),
);
check(
  'generator_blinding',
  expectedDoc.hiddenFromGenerator === true &&
    !casesDoc.cases.some((entry) =>
      hasForbiddenKey(entry, (key) => forbiddenGeneratorKeys.has(key)),
    ) &&
    !casesDoc.cases.some((entry) => hasFixtureString(entry, fixtureShapes)) &&
    neutralEvidenceRefs,
  'source cases contain no gf-* IDs, fixture shapes, expected fields, or non-neutral evidence refs',
);

check(
  'provider_neutral_prompt',
  [...prompts.values()].every(
    (prompt) => !/(openai|anthropic|claude|gemini|mistral|cohere)/i.test(prompt),
  ),
  'prompt v0.1 and v0.2 name no provider or model brand',
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
  r1.runs === 3 &&
    r1.outputs === 12 &&
    r1.validOutputs < r1.outputs &&
    r1.errors > 0,
  `${r1.validOutputs}/${r1.outputs} valid across ${r1.runs} logs, ${r1.errors} errors preserved`,
);
check(
  'round_2_schema_validation',
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

const round2ReviewFiles = collectJson(path.join(auditDir, 'reviews', 'round-2'));
const round2ReviewSources = round2ReviewFiles.map((file) =>
  fs.readFileSync(file, 'utf8'),
);
const round2ReviewValidation = runJson(reviewValidator, ['--round', 'round-2']);
const round2Reviews = reviewResults('round-2');
const round2ReviewIndex = indexByCase(round2Reviews);
const directRound2ReviewMethod = round2Reviews.every(
  (review) =>
    review.reviewMethod?.reviewerKind === 'in_session_model_proxy' &&
    review.reviewMethod?.modelIdentityBlinded === true &&
    review.reviewMethod?.humanReviewer === false &&
    review.reviewMethod?.contextIsolation ===
      'fresh_subagent_no_expected_answers',
);
check(
  'round_2_direct_blind_reviews',
  round2ReviewFiles.length === 3 &&
    round2ReviewValidation.validFiles === 3 &&
    round2ReviewValidation.validCases === 12 &&
    round2ReviewValidation.errors === 0 &&
    round2ReviewIndex.duplicates.length === 0 &&
    sameJsonValue(
      [...round2ReviewIndex.map.keys()].sort(),
      [...EXPECTED_CASE_IDS].sort(),
    ) &&
    directRound2ReviewMethod,
  'Round 2 has one valid, isolated direct blind-review record for all 12 cases',
);
check(
  'round_1_qualitative_excluded',
  reportData.reviewEvidence?.acceptedRound === 'round-2' &&
    reportData.reviewEvidence?.acceptedCaseCount === 12 &&
    reportData.reviewEvidence?.round1QualitativeAccepted === false,
  'Round 1 remains validator-only baseline evidence; qualitative review is excluded',
);
const acceptedTextSources = [
  reportDataSource,
  comparisonMarkdown,
  reportHtml,
  ...round2ReviewSources,
];
check(
  'accepted_text_integrity',
  acceptedTextSources.every(
    (source) =>
      !source.includes('\uFFFD') &&
      !/\?{2,}/u.test(source),
  ),
  'accepted reviews and generated report artifacts contain no replacement glyph or consecutive question marks',
);

const rawOutputIndexes = new Map([
  ['round-2', indexByCase(runOutputs(round2Files))],
]);
const reviewInputFiles = collectJson(
  path.join(auditDir, 'review-inputs', 'round-2'),
).filter((file) => path.basename(file) !== 'manifest.json');
const reviewInputDetails = reviewInputFiles.map((file) => {
  const input = readJson(file);
  const rawProposal = rawOutputIndexes.get('round-2').map.get(input.caseId);
  const caseInput = casesDoc.cases.find(
    (entry) => entry.caseId === input.caseId,
  );
  const expectedFingerprint = proposalFingerprint(input.proposal);
  return {
    file,
    input,
    noHiddenFields: !hasForbiddenKey(input, (key) =>
      /(?:hiddenExpectation|expectation|model|timing|usage|cost)/i.test(key),
    ),
    sourcePacketMatch: sameJsonValue(input.sourcePacket, caseInput),
    proposalMatch: sameJsonValue(input.proposal, rawProposal),
    fingerprintMatch:
      /^sha256:[0-9a-f]{64}$/.test(input.proposalFingerprint ?? '') &&
      input.proposalFingerprint === expectedFingerprint,
    fileMatch: path.basename(file) === `${input.caseId}.json`,
  };
});
check(
  'model_blinded_review_inputs',
  reviewInputDetails.length === 12 &&
    reviewInputDetails.every(
      (entry) =>
        entry.noHiddenFields &&
        entry.sourcePacketMatch &&
        entry.fileMatch,
    ),
  '12 Round 2 review inputs contain no hidden expectation/model/timing/usage/cost fields and reuse current source packets',
);
check(
  'review_input_fingerprints',
  reviewInputDetails.length === 12 &&
    reviewInputDetails.every(
      (entry) => entry.proposalMatch && entry.fingerprintMatch,
    ),
  '12/12 Round 2 proposalFingerprint values match the exact referenced raw outputs',
);

const r2ValidatorResults = validatorOutputs(r2);
const r2ValidatorIndex = indexByCase(r2ValidatorResults);
const r2RawIndex = rawOutputIndexes.get('round-2');
const validatorSourceRows = r2ValidatorResults.reduce(
  (sum, entry) => sum + (entry.metrics?.sourceRowCount ?? 0),
  0,
);
const validatorAccountedRows = r2ValidatorResults.reduce(
  (sum, entry) =>
    sum +
    (entry.metrics?.mappedSourceRowCount ?? 0) +
    (entry.metrics?.omittedSourceRowCount ?? 0),
  0,
);
const validatorAccountingRate =
  validatorSourceRows === 0 ? 1 : validatorAccountedRows / validatorSourceRows;
const reviewSourceRows = round2Reviews.reduce(
  (sum, entry) => sum + (entry.sourceRowAccounting?.executableRows ?? 0),
  0,
);
const reviewAccountedRows = round2Reviews.reduce(
  (sum, entry) =>
    sum +
    (entry.sourceRowAccounting?.mappedUniqueRows ?? 0) +
    (entry.sourceRowAccounting?.approvedOmittedRows ?? 0),
  0,
);
const reviewAccountingRate =
  reviewSourceRows === 0 ? 1 : reviewAccountedRows / reviewSourceRows;
const perCaseAccountingMatches = EXPECTED_CASE_IDS.every((caseId) => {
  const validatorResult = r2ValidatorIndex.map.get(caseId);
  const review = round2ReviewIndex.map.get(caseId);
  return (
    validatorResult &&
    review &&
    review.sourceRowAccounting.executableRows === validatorResult.metrics.sourceRowCount &&
    review.sourceRowAccounting.mappedUniqueRows ===
      validatorResult.metrics.mappedSourceRowCount &&
    review.sourceRowAccounting.approvedOmittedRows ===
      validatorResult.metrics.omittedSourceRowCount &&
    sameNumber(
      review.sourceRowAccounting.accountedSourceRowRate,
      validatorResult.metrics.accountedSourceRowRate,
    )
  );
});

const structuredFindings = new Set();
for (const entry of r2ValidatorResults) {
  for (const error of entry.errors ?? []) {
    structuredFindings.add(`${entry.caseId}:${error.code}`);
  }
}
for (const review of round2Reviews) {
  for (const code of [
    ...(review.validator?.hardFailCodes ?? []),
    ...(review.reviewHardFailCodes ?? []),
  ]) {
    structuredFindings.add(`${review.caseId}:${code}`);
  }
}
const scheduleRemovalDetections = round2Reviews.reduce(
  (sum, entry) => sum + (entry.correction?.scheduleRemovals ?? 0),
  0,
);
let falseGroundingFlagDetections = 0;
const groundingAuditsComplete = round2Reviews.every((review) => {
  const output = r2RawIndex.map.get(review.caseId);
  const originalItems = output?.proposal?.items ?? [];
  const auditedItems = review.groundingAudit?.items;
  for (const item of auditedItems ?? []) {
    for (const key of [
      'actionGrounded',
      'completionGrounded',
      'memoGrounded',
      'scheduleGrounded',
    ]) {
      if (item[key] === false) falseGroundingFlagDetections += 1;
    }
  }
  if (review.groundingAudit?.projectionGrounded === false) {
    falseGroundingFlagDetections += 1;
  }
  return (
    Array.isArray(auditedItems) &&
    auditedItems.length === originalItems.length &&
    auditedItems.every(
      (item) =>
        typeof item.actionGrounded === 'boolean' &&
        typeof item.completionGrounded === 'boolean' &&
        typeof item.memoGrounded === 'boolean' &&
        typeof item.scheduleGrounded === 'boolean',
    ) &&
    typeof review.groundingAudit?.projectionGrounded === 'boolean' &&
    Array.isArray(review.groundingAudit?.unsupportedContentFindings)
  );
});
const unsupportedDetections =
  structuredFindings.size +
  falseGroundingFlagDetections +
  scheduleRemovalDetections;

const positiveExpectations = expectedDoc.expectations.filter(
  (entry) => entry.fixtureKind === 'positive',
);
const negativeExpectations = expectedDoc.expectations.filter(
  (entry) => entry.fixtureKind === 'negative',
);
const positiveReviews = positiveExpectations.map((entry) =>
  round2ReviewIndex.map.get(entry.caseId),
);
const scoreCoverage = positiveReviews.every(
  (review) =>
    review && SCORE_KEYS.every((key) => typeof review.scores?.[key] === 'number'),
);
const scoreAverages = Object.fromEntries(
  SCORE_KEYS.map((key) => [
    key,
    round2(average(positiveReviews.map((review) => review.scores[key]))),
  ]),
);
const qualityAverage = round2(
  average(positiveReviews.flatMap((review) => SCORE_KEYS.map((key) => review.scores[key]))),
);
const perCaseQualityMatches = positiveReviews.every(
  (review) =>
    sameNumber(
      review.qualityAverage,
      round2(average(SCORE_KEYS.map((key) => review.scores[key]))),
    ),
);
const keptOriginalItems = positiveReviews.reduce(
  (sum, review) => sum + review.correction.keptOriginalItems,
  0,
);
const originalItemCount = positiveReviews.reduce(
  (sum, review) => sum + review.correction.originalItemCount,
  0,
);
const itemKeepRate = originalItemCount === 0 ? null : keptOriginalItems / originalItemCount;
const negativePasses = negativeExpectations.filter((expected) => {
  const review = round2ReviewIndex.map.get(expected.caseId);
  const validatorResult = r2ValidatorIndex.map.get(expected.caseId);
  const output = r2RawIndex.map.get(expected.caseId);
  return (
    review?.negativeGatePassed === true &&
    validatorResult?.valid === true &&
    output?.status?.generationState === expected.expectedStatus.generationState &&
    output?.status?.outcome === expected.expectedStatus.outcome &&
    output?.status?.errorCode === expected.expectedStatus.errorCode &&
    output?.reviewHints?.recommendedDisposition ===
      expected.expectedStatus.recommendedDisposition &&
    output?.proposal?.items?.length === 0 &&
    output?.projectionPlan?.length === 0
  );
}).length;
const contentQualityGatePasses = positiveReviews.filter(
  (review) => review.contentQualityGatePassed === true,
).length;

const r3RawIndex = indexByCase(runOutputs(round3AcceptedFiles));
const round3SetMatches =
  r3RawIndex.duplicates.length === 0 &&
  sameJsonValue([...r3RawIndex.map.keys()].sort(), [...ROUND3_CASE_IDS].sort());
const stability = ROUND3_CASE_IDS.map((caseId) => ({
  caseId,
  match: sameJsonValue(
    coreDecisionSignature(r2RawIndex.map.get(caseId)),
    coreDecisionSignature(r3RawIndex.map.get(caseId)),
  ),
}));
const stabilityMatches = stability.filter((entry) => entry.match).length;
const stabilityMismatches = stability
  .filter((entry) => !entry.match)
  .map((entry) => entry.caseId);

const reportGateIndex = new Map(
  (reportData.completionGates ?? []).map((gate) => [gate.key, gate]),
);
const expectedGateStates = {
  schema_valid: true,
  source_row_accounting: true,
  unsupported_content: true,
  negative_disposition: true,
  item_keep_rate: true,
  quality_average: true,
  execution_clarity: true,
  content_fidelity: true,
  source_safety: true,
  case_quality: true,
  round_3_stability: false,
};
const reportGateStatesMatch = Object.entries(expectedGateStates).every(
  ([key, passed]) => reportGateIndex.get(key)?.passed === passed,
);
check(
  'failed_state_reporting',
  reportData.experimentStatus === 'incomplete' &&
    reportData.completionPassed === false &&
    reportData.stopReason === 'round_3_stability_gate_failed' &&
    sameJsonValue(reportData.iterations, {
      used: 3,
      max: 3,
      exhausted: true,
    }) &&
    sameJsonValue(reportData.failedCompletionGates, [
      'round_3_stability',
    ]) &&
    reportGateStatesMatch &&
    comparisonMarkdown.includes('Backend No-Go') &&
    comparisonMarkdown.includes('3/7') &&
    reportHtml.includes('Backend No-Go') &&
    reportHtml.includes('3/7'),
  'report says v1 incomplete after 3/3 rounds; only the 3/7 stability gate fails',
);
check(
  'input_contract_boundary',
  reportData.inputContract?.semantic ===
      'Source metadata + SourceRows + canonical userJob' &&
    reportData.inputContract?.urlOnly === false,
  'input is a source-controlled semantic packet, not SourceRow-only or live URL-only',
);

const m = reportData.metrics;
const reportCaseIndex = indexByCase(reportData.cases);
const reportCaseMetricsMatch = EXPECTED_CASE_IDS.every((caseId) => {
  const review = round2ReviewIndex.map.get(caseId);
  const reportCase = reportCaseIndex.map.get(caseId);
  return (
    review &&
    reportCase &&
    sameNumberOrNull(reportCase.qualityAverage, review.qualityAverage) &&
    sameNumberOrNull(reportCase.executionClarity, review.scores.executionClarity) &&
    sameJsonValue(reportCase.reviewHardFailCodes, review.reviewHardFailCodes) &&
    reportCase.negativeGatePassed === review.negativeGatePassed &&
    reportCase.contentQualityGatePassed === review.contentQualityGatePassed
  );
});
function sameNumberOrNull(left, right) {
  return left === null && right === null ? true : sameNumber(left, right);
}
const reportMetricsMatch =
  sameJsonValue(m.round1, {
    validOutputs: r1.validOutputs,
    outputs: r1.outputs,
    validRuns: r1.validRuns,
    runs: r1.runs,
    errors: r1.errors,
  }) &&
  sameJsonValue(m.round2, {
    validOutputs: r2.validOutputs,
    outputs: r2.outputs,
    validRuns: r2.validRuns,
    runs: r2.runs,
    errors: r2.errors,
  }) &&
  sameJsonValue(m.round3, {
    validOutputs: r3.validOutputs,
    outputs: r3.outputs,
    validRuns: r3.validRuns,
    runs: r3.runs,
    discardedEnvelopeRuns: r3Discarded.runs,
  }) &&
  sameNumber(m.sourceAccountingRate, validatorAccountingRate) &&
  sameNumber(m.itemKeepRate, itemKeepRate) &&
  sameNumber(m.qualityAverage, qualityAverage) &&
  sameJsonValue(m.scoreAverages, scoreAverages) &&
  m.contentQualityGatePasses === contentQualityGatePasses &&
  m.positiveCases === positiveExpectations.length &&
  m.negativeGatePasses === negativePasses &&
  m.negativeCases === negativeExpectations.length &&
  m.stabilityMatches === stabilityMatches &&
  m.stabilityCases === stability.length &&
  m.unsupportedActionDateRepeatFactDetections === unsupportedDetections &&
  m.realProviderCostEvidenceAvailable === false &&
  reportCaseIndex.duplicates.length === 0 &&
  reportCaseMetricsMatch;
check(
  'report_metrics_recomputed',
  reportMetricsMatch,
  'report-data Round 2 gates, all seven axes, per-case review fields, and Round 3 stability equal recomputed evidence',
);
check(
  'source_accounting_gate',
  sameNumber(validatorAccountingRate, 1) &&
    sameNumber(reviewAccountingRate, 1) &&
    perCaseAccountingMatches,
  `validator ${validatorAccountedRows}/${validatorSourceRows}; review ${reviewAccountedRows}/${reviewSourceRows}`,
);
check(
  'unsupported_content_gate',
  unsupportedDetections === 0 && groundingAuditsComplete,
  `${structuredFindings.size} structured hard-fail codes + ${falseGroundingFlagDetections} false grounding flags + ${scheduleRemovalDetections} schedule removals; per-item grounding audits complete=${groundingAuditsComplete}`,
);
check(
  'negative_gate',
  negativeExpectations.length === 2 && negativePasses === 2,
  `${negativePasses}/${negativeExpectations.length}`,
);
check('item_keep_gate', itemKeepRate >= 0.8, `${itemKeepRate}`);
check(
  'seven_score_averages',
  scoreCoverage &&
    perCaseQualityMatches &&
    Object.keys(scoreAverages).length === SCORE_KEYS.length,
  SCORE_KEYS.map((key) => `${key} ${scoreAverages[key]}`).join(', '),
);
check('quality_average_gate', qualityAverage >= 3.5, `${qualityAverage}/5`);
check(
  'required_axis_gates',
  scoreAverages.executionClarity >= 4 &&
    scoreAverages.contentFidelityAndCoverage >= 4 &&
    scoreAverages.sourceAndSafetySeparation >= 4,
  `execution ${scoreAverages.executionClarity}, fidelity ${scoreAverages.contentFidelityAndCoverage}, safety ${scoreAverages.sourceAndSafetySeparation}`,
);
check(
  'case_quality_gate',
  contentQualityGatePasses / positiveReviews.length >= 0.8,
  contentQualityGatePasses + '/' + positiveReviews.length,
);
check(
  'stability_gate',
  round3SetMatches &&
    stability.length === 7 &&
    stabilityMatches / stability.length >= 0.8,
  `${stabilityMatches}/${stability.length} core-decision match; mismatch ${stabilityMismatches.join(', ') || 'none'}`,
);

const allRuns = [
  ...round1Files,
  ...round2Files,
  ...round3AcceptedFiles,
  ...round3DiscardedFiles,
].map(readJson);
const allowedGenerationKinds = new Set([
  'in_session_same_model',
  'independent_rerun',
  'provider_neutral_independent_rerun',
]);
const allowedNonIdentityRunLabels = new Set([
  'not_available',
  'provider-neutral',
  'codex-subagent-runtime',
]);
const evidenceHonest = allRuns.every(
  (run) =>
    allowedGenerationKinds.has(run.modelEvidence.evidenceKind) &&
    allowedNonIdentityRunLabels.has(run.modelEvidence.provider) &&
    allowedNonIdentityRunLabels.has(run.modelEvidence.model) &&
    run.modelEvidence.modelTier === 'unclassified' &&
    ['timing', 'usage', 'cost'].every((lane) => {
      const entries = Object.entries(run[lane]).filter(
        ([key]) => key !== 'evidenceKind',
      );
      return (
        run[lane].evidenceKind === 'not_available' &&
        entries.every(([, value]) => value === null)
      );
    }),
);
const generationKinds = [
  ...new Set(allRuns.map((run) => run.modelEvidence.evidenceKind)),
].sort();
const providerRunLabels = [
  ...new Set(allRuns.map((run) => run.modelEvidence.provider)),
].sort();
const modelRunLabels = [
  ...new Set(allRuns.map((run) => run.modelEvidence.model)),
].sort();
check(
  'provider_cost_evidence_boundary',
  evidenceHonest &&
    m.realProviderCostEvidenceAvailable === false &&
    sameJsonValue(
      reportData.evidenceBoundary?.generationKinds,
      generationKinds,
    ) &&
    reportData.evidenceBoundary?.provider === 'not_available' &&
    reportData.evidenceBoundary?.model === 'not_available' &&
    reportData.evidenceBoundary?.modelTier === 'unclassified' &&
    sameJsonValue(reportData.evidenceBoundary?.rawRunLabels?.provider, providerRunLabels) &&
    sameJsonValue(reportData.evidenceBoundary?.rawRunLabels?.model, modelRunLabels) &&
    reportData.evidenceBoundary?.runLabelsAreVerifiedProviderIdentity === false &&
    reportData.evidenceBoundary?.latency === 'not_available' &&
    reportData.evidenceBoundary?.tokens === 'not_available' &&
    reportData.evidenceBoundary?.cost === 'not_available' &&
    reportData.evidenceBoundary?.humanReview === false,
  'verified provider/model identity and latency, token, cost are unavailable; raw labels are allowlisted non-identity orchestration labels',
);

const positiveCases = reportData.cases.filter((entry) => entry.fixtureKind === 'positive');
check(
  'corrected_previews',
  positiveCases.length === 10 &&
    positiveCases.every(
      (entry) => entry.correctedPreview.title && entry.correctedPreview.items.length > 0,
    ),
  '10/10 positive cases have source-grounded corrected previews',
);

const marker = '{{CASE_INPUT_JSON}}';
const packetChecks = [...prompts.entries()].map(([version, prompt]) => {
  const packetDir = path.join(auditDir, 'packets', version);
  const actualFiles = fs
    .readdirSync(packetDir)
    .filter((name) => /^case-\d{2}\.md$/.test(name))
    .sort();
  const expectedFiles = casesDoc.cases.map((entry) => `${entry.caseId}.md`).sort();
  const markerCount = prompt.split(marker).length - 1;
  const exactPackets = casesDoc.cases.every((caseInput) => {
    const expectedPacket = prompt.replace(marker, JSON.stringify(caseInput, null, 2));
    const actualPacket = fs.readFileSync(
      path.join(packetDir, `${caseInput.caseId}.md`),
      'utf8',
    );
    return actualPacket === expectedPacket;
  });
  return markerCount === 1 && sameJsonValue(actualFiles, expectedFiles) && exactPackets;
});
check(
  'model_change_packets',
  packetChecks.every(Boolean),
  '24/24 v0.1 and v0.2 packets exactly equal prompt + current case JSON substitution',
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

const completionCheckNames = new Set([
  'round_2_schema_validation',
  'source_accounting_gate',
  'unsupported_content_gate',
  'negative_gate',
  'item_keep_gate',
  'quality_average_gate',
  'required_axis_gates',
  'case_quality_gate',
  'stability_gate',
]);
const completionChecks = checks.filter((entry) =>
  completionCheckNames.has(entry.name),
);
const evidenceChecks = checks.filter(
  (entry) => !completionCheckNames.has(entry.name),
);
const evidenceIntegrityPassed = evidenceChecks.every(
  (entry) => entry.passed,
);
const completionPassed = completionChecks.every(
  (entry) => entry.passed,
);
const summary = {
  verifierVersion: 'flowme-url-to-flow-prompt-lab-verifier-v3',
  passed: evidenceIntegrityPassed && completionPassed,
  evidenceIntegrityPassed,
  completionPassed,
  passedChecks: checks.filter((entry) => entry.passed).length,
  totalChecks: checks.length,
  failedCompletionGates: completionChecks
    .filter((entry) => !entry.passed)
    .map((entry) => entry.name),
  checks,
};

if (wantsJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(
    'Prompt Lab verifier: evidence integrity ' +
      (summary.evidenceIntegrityPassed ? 'PASS' : 'FAIL') +
      '; v1 completion ' +
      (summary.completionPassed ? 'PASS' : 'FAIL') +
      ' (' +
      summary.passedChecks +
      '/' +
      summary.totalChecks +
      ' checks passed).',
  );
  for (const entry of checks) {
    console.log(
      (entry.passed ? 'PASS' : 'FAIL') +
        ' ' +
        entry.name +
        ': ' +
        entry.evidence,
    );
  }
}

process.exit(summary.passed ? 0 : 1);
