import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const specDir = path.join(root, 'docs', 'specs', '2026-07-14-url-to-flow-prompt-lab');
const auditDir = path.join(root, 'docs', 'content-audit', '2026-07-14-url-to-flow-prompt-lab');
const runsDir = path.join(auditDir, 'runs');
const reviewsDir = path.join(auditDir, 'reviews');
const validatorPath = path.join(here, 'validate-url-to-flow-prompt-lab.mjs');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const rel = (file) => path.relative(root, file).replaceAll('\\', '/');
const esc = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

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

function validateRun(file) {
  const result = spawnSync(process.execPath, [validatorPath, '--file', file, '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (!result.stdout.trim()) {
    throw new Error(`Validator returned no JSON for ${rel(file)}: ${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

function aggregateValidation(files) {
  const reports = files.map((file) => validateRun(file));
  return {
    runFiles: reports.reduce((sum, report) => sum + report.runFiles, 0),
    outputCount: reports.reduce((sum, report) => sum + report.outputCount, 0),
    validRuns: reports.reduce((sum, report) => sum + report.validRuns, 0),
    validOutputs: reports.reduce((sum, report) => sum + report.validOutputs, 0),
    errors: reports.reduce((sum, report) => sum + report.errors, 0),
    warnings: reports.reduce((sum, report) => sum + report.warnings, 0),
    reports,
  };
}

function outputsFrom(files) {
  const outputs = new Map();
  for (const file of files) {
    const run = readJson(file);
    for (const output of run.outputs) outputs.set(output.caseId, output);
  }
  return outputs;
}

function reviewsFrom(round) {
  const results = [];
  for (const file of collectJson(path.join(reviewsDir, round))) {
    results.push(...readJson(file).results);
  }
  return results.sort((a, b) => a.caseId.localeCompare(b.caseId));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value) {
  return Number(value.toFixed(2));
}

function groupSignature(output) {
  return (output.proposal?.items ?? [])
    .map((item) => [...item.sourceRowIds].sort().join('+'))
    .sort();
}

function coreDecisionShape(output) {
  return {
    status: output.status,
    recommendedDisposition: output.reviewHints?.recommendedDisposition ?? null,
    primaryArtifact: output.conversionDecision?.primaryArtifact ?? null,
    planningPattern: output.conversionDecision?.planningPattern ?? null,
    itemShapes: (output.proposal?.items ?? [])
      .map((item) => ({
        sourceRowIds: [...item.sourceRowIds].sort(),
        intent: item.intent,
        completionMode: item.completion.mode,
        hasMemoCandidate: item.memoCandidate !== null,
        hasGroupingCandidate: item.groupingCandidate !== null,
        hasScheduleCandidate: item.scheduleCandidate !== null,
      }))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    omittedRows: (output.proposal?.omittedRows ?? [])
      .map((entry) => `${entry.sourceRowId}:${entry.reasonCode}`)
      .sort(),
    projections: (output.projectionPlan ?? [])
      .map((entry) => `${entry.target}:${entry.applicability}`)
      .sort(),
  };
}

function structureSignature(output) {
  return JSON.stringify(coreDecisionShape(output));
}

const coreDecisionDimensions = [
  ['status', 'status'],
  ['recommendedDisposition', 'recommended disposition'],
  ['primaryArtifact', 'primary artifact'],
  ['planningPattern', 'planning pattern'],
  ['itemShapes', 'Item source grouping/intent/completion/candidate presence'],
  ['omittedRows', 'omitted rows'],
  ['projections', 'projection applicability'],
];

function coreDecisionDifferences(baseline, rerun) {
  const baselineShape = coreDecisionShape(baseline);
  const rerunShape = coreDecisionShape(rerun);
  return coreDecisionDimensions
    .filter(([key]) => JSON.stringify(baselineShape[key]) !== JSON.stringify(rerunShape[key]))
    .map(([key, label]) => ({
      key,
      label,
      round2: baselineShape[key],
      round3: rerunShape[key],
    }));
}

function collectUnsupportedAudit(reviews) {
  const structuredCodes = new Set();
  const findings = [];
  const falseGroundingFlags = [];
  const incompleteGroundingAudits = [];
  let scheduleRemovals = 0;

  for (const review of reviews) {
    for (const code of review.reviewHardFailCodes ?? []) {
      structuredCodes.add(`${review.caseId}:${code}`);
    }

    const audit = review.groundingAudit;
    const auditItems = audit?.items;
    const auditComplete =
      Array.isArray(auditItems) &&
      auditItems.every((item) =>
        [
          item.actionGrounded,
          item.completionGrounded,
          item.memoGrounded,
          item.scheduleGrounded,
        ].every((value) => typeof value === 'boolean'),
      ) &&
      typeof audit?.projectionGrounded === 'boolean' &&
      Array.isArray(audit?.unsupportedContentFindings);
    if (!auditComplete) incompleteGroundingAudits.push(review.caseId);

    for (const finding of audit?.unsupportedContentFindings ?? []) {
      findings.push({ caseId: review.caseId, ...finding });
      structuredCodes.add(`${review.caseId}:${finding.code}`);
    }

    for (const item of audit?.items ?? []) {
      for (const flag of [
        'actionGrounded',
        'completionGrounded',
        'memoGrounded',
        'scheduleGrounded',
      ]) {
        if (item[flag] === false) {
          falseGroundingFlags.push({
            caseId: review.caseId,
            proposalId: item.proposalId,
            flag,
          });
        }
      }
    }
    if (audit?.projectionGrounded === false) {
      falseGroundingFlags.push({
        caseId: review.caseId,
        proposalId: null,
        flag: 'projectionGrounded',
      });
    }
    scheduleRemovals += review.correction?.scheduleRemovals ?? 0;
  }

  return {
    structuredCodes: [...structuredCodes].sort(),
    findings,
    falseGroundingFlags,
    incompleteGroundingAudits,
    scheduleRemovals,
    detectionSignals:
      structuredCodes.size + falseGroundingFlags.length + scheduleRemovals,
  };
}

const casesDoc = readJson(path.join(specDir, 'cases-v1.json'));
const expectedDoc = readJson(path.join(specDir, 'expected-v1.json'));
const cases = new Map(casesDoc.cases.map((entry) => [entry.caseId, entry]));
const expectations = new Map(
  expectedDoc.expectations.map((entry) => [entry.caseId, entry]),
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

for (const file of [
  ...round1Files,
  ...round2Files,
  ...round3AcceptedFiles,
  ...round3DiscardedFiles,
]) {
  if (!fs.existsSync(file)) throw new Error(`Missing run evidence: ${rel(file)}`);
}

const round1Validation = aggregateValidation(round1Files);
const round2Validation = aggregateValidation(round2Files);
const round3Validation = aggregateValidation(round3AcceptedFiles);
const round3DiscardedValidation = aggregateValidation(round3DiscardedFiles);
const round2Outputs = outputsFrom(round2Files);
const round3Outputs = outputsFrom(round3AcceptedFiles);
const round2ReviewFiles = collectJson(path.join(reviewsDir, 'round-2'));
const round2ReviewSources = round2ReviewFiles.map((file) =>
  fs.readFileSync(file, 'utf8'),
);
const round2Reviews = reviewsFrom('round-2');
const round3DiscardedRuns = round3DiscardedFiles.map((file) => {
  const run = readJson(file);
  return {
    file: rel(file),
    runId: run.runId,
    caseSetVersion: run.caseSetVersion,
  };
});

const directRound2ReviewEvidence =
  round2ReviewFiles.length === 3 &&
  round2Reviews.length === 12 &&
  round2Reviews.every(
    (review) =>
      review.reviewMethod?.reviewerKind === 'in_session_model_proxy' &&
      review.reviewMethod?.modelIdentityBlinded === true &&
      review.reviewMethod?.humanReviewer === false &&
      review.reviewMethod?.contextIsolation ===
        'fresh_subagent_no_expected_answers',
  );
if (!directRound2ReviewEvidence) {
  throw new Error('Expected 12 direct, isolated Round 2 blind reviews.');
}
if (
  round2ReviewSources.some(
    (source) => source.includes('\uFFFD') || /\?{2,}/u.test(source),
  )
) {
  throw new Error('Round 2 review evidence failed UTF-8 text integrity.');
}

const round2ReviewMap = new Map(round2Reviews.map((entry) => [entry.caseId, entry]));
const positiveReviews = round2Reviews.filter((entry) => entry.qualityAverage !== null);
const negativeReviews = round2Reviews.filter((entry) => entry.negativeGatePassed !== null);
const unsupportedAudit = collectUnsupportedAudit(round2Reviews);
const scoreKeys = [
  ['userNeedFit', '사용자 필요'],
  ['executionClarity', '실행 명확성'],
  ['contentFidelityAndCoverage', '원문 충실도'],
  ['portabilityAndNaturalArtifact', '이식성'],
  ['cognitiveLoad', '인지 부하'],
  ['copySpecificity', '문구 구체성'],
  ['sourceAndSafetySeparation', '출처·안전'],
];
const scoreAverages = Object.fromEntries(
  scoreKeys.map(([key]) => [key, round2(mean(positiveReviews.map((entry) => entry.scores[key])))]),
);

const stability = [...round3Outputs.entries()]
  .map(([caseId, output]) => {
    const baseline = round2Outputs.get(caseId);
    if (!baseline) throw new Error(`Round 3 case has no Round 2 baseline: ${caseId}`);
    const differences = coreDecisionDifferences(baseline, output);
    return {
      caseId,
      name: expectations.get(caseId).name,
      match: differences.length === 0,
      round2Artifact: baseline.conversionDecision?.primaryArtifact ?? 'none',
      round3Artifact: output.conversionDecision?.primaryArtifact ?? 'none',
      sourceGroups: groupSignature(output),
      differingDimensions: differences.map((entry) => entry.label),
      differences,
    };
  })
  .sort((a, b) => a.caseId.localeCompare(b.caseId));

const stabilityMismatches = stability.filter((entry) => !entry.match);
const stabilityRate = stability.length
  ? `${((stability.filter((entry) => entry.match).length / stability.length) * 100).toFixed(1)}%`
  : 'N/A';
const stabilityMismatchSummary = stabilityMismatches.length
  ? stabilityMismatches
      .map(
        (entry) =>
          `${entry.caseId}(${entry.differingDimensions.join(', ')})`,
      )
      .join('; ')
  : 'mismatch 없음';
const stabilityNarrative = `${stabilityMismatches.length}건의 core-decision mismatch: ${stabilityMismatchSummary}. 일치율은 ${stability.filter((entry) => entry.match).length}/${stability.length}(${stabilityRate})다. 이 signature는 status, disposition, artifact/pattern, Item의 SourceRow 묶음·intent·completion mode·candidate 존재 여부, omitted row, projection applicability만 비교하며 제목·완료 문구 같은 copy-level 또는 full semantic exact 일치를 뜻하지 않는다.`;
const stabilityCardSummary = stabilityMismatches.length
  ? `${stabilityMismatchSummary}. core-decision 일치 ${stability.filter((entry) => entry.match).length}/${stability.length}(${stabilityRate}); copy-level exact 일치가 아니다.`
  : `mismatch 없음. core-decision 일치 ${stability.length}/${stability.length}(100.0%); copy-level exact 일치가 아니다.`;

const discardedCaseSetVersions = [
  ...new Set(round3DiscardedRuns.map((run) => run.caseSetVersion)),
];
const discardedRunLabels = round3DiscardedRuns
  .map((run) => path.basename(run.file, '.json'))
  .join('/');
const discardedProvenanceNarrative = `${discardedRunLabels}는 구 caseSet 식별자 ${discardedCaseSetVersions.join(', ')}를 envelope에 기록했다. 현재 ${casesDoc.caseSetVersion}과 불일치하고 필수 flowme- prefix도 빠져 run 계약상 제외했다. output 자체의 schema 유효성과 별개인 provenance 문제이며 raw evidence는 보존했다.`;

const caseSummaries = casesDoc.cases.map((entry) => {
  const expected = expectations.get(entry.caseId);
  const output = round2Outputs.get(entry.caseId);
  const review = round2ReviewMap.get(entry.caseId);
  const correctedPreview = review.correctedPreview ?? {
    title: null,
    items: [],
    destinations: [],
    reviewNote: null,
  };
  return {
    caseId: entry.caseId,
    name: expected.name,
    fixtureKind: expected.fixtureKind,
    fixtureShape: expected.fixtureShape,
    sourceTitle: entry.source.primary.title,
    sourceLines: entry.sourceRows.map((row) => ({
      sourceRowId: row.sourceRowId,
      text: [row.title, row.detail].filter(Boolean).join(' — '),
    })),
    userJob: entry.userJob,
    status: output.status,
    disposition: output.reviewHints.recommendedDisposition,
    primaryArtifact: output.conversionDecision?.primaryArtifact ?? null,
    proposalTitle: output.proposal.proposalTitle,
    proposalItems: output.proposal.items.map((item) => ({
      title: item.title,
      doneWhen: item.completion.doneWhen,
      sourceRowIds: item.sourceRowIds,
    })),
    omittedRows: output.proposal.omittedRows,
    qualityAverage: review.qualityAverage,
    executionClarity: review.scores?.executionClarity ?? null,
    contentQualityGatePassed: review.contentQualityGatePassed,
    negativeGatePassed: review.negativeGatePassed,
    reviewHardFailCodes: review.reviewHardFailCodes,
    groundingAudit: review.groundingAudit ?? null,
    decision: review.decision,
    topFixes: review.topFixes,
    correctedPreview: {
      ...correctedPreview,
      items: (correctedPreview.items ?? []).map((item) => ({
        ...item,
        sourceProposalIds: item.sourceProposalIds ?? [],
      })),
      destinations: correctedPreview.destinations ?? [],
    },
  };
});

const positiveCases = caseSummaries.filter((entry) => entry.fixtureKind === 'positive');
const negativeCases = caseSummaries.filter((entry) => entry.fixtureKind === 'negative');
const invalidCodeCounts = {};
for (const report of round1Validation.reports) {
  for (const run of report.results) {
    for (const output of run.outputs) {
      for (const error of output.errors) {
        invalidCodeCounts[error.code] = (invalidCodeCounts[error.code] ?? 0) + 1;
      }
    }
  }
}

const evidenceRunFiles = [
  ...round1Files,
  ...round2Files,
  ...round3AcceptedFiles,
  ...round3DiscardedFiles,
];
const generationKinds = [
  ...new Set(
    evidenceRunFiles.map((file) => readJson(file).modelEvidence.evidenceKind),
  ),
].sort();
const allowedGenerationKinds = new Set([
  'in_session_same_model',
  'independent_rerun',
  'provider_neutral_independent_rerun',
]);
const providerRunLabels = [
  ...new Set(evidenceRunFiles.map((file) => readJson(file).modelEvidence.provider)),
].sort();
const modelRunLabels = [
  ...new Set(evidenceRunFiles.map((file) => readJson(file).modelEvidence.model)),
].sort();
const allowedNonIdentityRunLabels = new Set([
  'not_available',
  'provider-neutral',
  'codex-subagent-runtime',
]);
const runLabelBoundaryHonest = [...providerRunLabels, ...modelRunLabels].every(
  (label) => allowedNonIdentityRunLabels.has(label),
);
if (!runLabelBoundaryHonest) {
  throw new Error('undeclared provider/model run label cannot be treated as unavailable identity evidence');
}
const allOperationalLanesUnavailable = evidenceRunFiles.every((file) => {
  const run = readJson(file);
  return (
    allowedGenerationKinds.has(run.modelEvidence.evidenceKind) &&
    run.modelEvidence.modelTier === 'unclassified' &&
    ['timing', 'usage', 'cost'].every(
      (lane) =>
        run[lane].evidenceKind === 'not_available' &&
        Object.entries(run[lane])
          .filter(([key]) => key !== 'evidenceKind')
          .every(([, value]) => value === null),
    )
  );
});

const metrics = {
  round1: {
    validOutputs: round1Validation.validOutputs,
    outputs: round1Validation.outputCount,
    validRuns: round1Validation.validRuns,
    runs: round1Validation.runFiles,
    errors: round1Validation.errors,
  },
  round2: {
    validOutputs: round2Validation.validOutputs,
    outputs: round2Validation.outputCount,
    validRuns: round2Validation.validRuns,
    runs: round2Validation.runFiles,
    errors: round2Validation.errors,
  },
  round3: {
    validOutputs: round3Validation.validOutputs,
    outputs: round3Validation.outputCount,
    validRuns: round3Validation.validRuns,
    runs: round3Validation.runFiles,
    discardedEnvelopeRuns: round3DiscardedValidation.runFiles - round3DiscardedValidation.validRuns,
  },
  sourceAccountingRate: round2(
    mean(round2Reviews.map((entry) => entry.sourceRowAccounting.accountedSourceRowRate)),
  ),
  itemKeepRate: round2(mean(positiveReviews.map((entry) => entry.correction.itemKeepRate))),
  qualityAverage: round2(mean(positiveReviews.map((entry) => entry.qualityAverage))),
  scoreAverages,
  contentQualityGatePasses: positiveReviews.filter((entry) => entry.contentQualityGatePassed).length,
  positiveCases: positiveReviews.length,
  negativeGatePasses: negativeReviews.filter((entry) => entry.negativeGatePassed).length,
  negativeCases: negativeReviews.length,
  stabilityMatches: stability.filter((entry) => entry.match).length,
  stabilityCases: stability.length,
  unsupportedActionDateRepeatFactDetections: unsupportedAudit.detectionSignals,
  unsupportedContentFindingCount: unsupportedAudit.findings.length,
  falseGroundingFlagCount: unsupportedAudit.falseGroundingFlags.length,
  incompleteGroundingAuditCases: unsupportedAudit.incompleteGroundingAudits.length,
  scheduleRemovalCount: unsupportedAudit.scheduleRemovals,
  realProviderCostEvidenceAvailable: !allOperationalLanesUnavailable,
};
const unsupportedGatePassed =
  metrics.unsupportedActionDateRepeatFactDetections === 0 &&
  metrics.incompleteGroundingAuditCases === 0;
const unsupportedGateVerdict = unsupportedGatePassed ? 'PASS' : 'FAIL';
const unsupportedAuditSummary = `finding ${metrics.unsupportedContentFindingCount}건 + false grounding flag ${metrics.falseGroundingFlagCount}건 + schedule removal ${metrics.scheduleRemovalCount}건 + incomplete audit ${metrics.incompleteGroundingAuditCases}건`;

const completionGates = [
  { key: 'schema_valid', label: 'Schema valid', result: `${metrics.round2.validOutputs}/${metrics.round2.outputs}`, threshold: '100%', passed: metrics.round2.outputs === 12 && metrics.round2.validOutputs === metrics.round2.outputs },
  { key: 'source_row_accounting', label: 'SourceRow accounting', result: `${(metrics.sourceAccountingRate * 100).toFixed(0)}%`, threshold: '100%', passed: metrics.sourceAccountingRate === 1 },
  { key: 'unsupported_content', label: 'Unsupported action/date/repeat/fact', result: `${metrics.unsupportedActionDateRepeatFactDetections} signals`, threshold: '0', passed: unsupportedGatePassed },
  { key: 'negative_disposition', label: 'Negative disposition', result: `${metrics.negativeGatePasses}/${metrics.negativeCases}`, threshold: '2/2', passed: metrics.negativeCases === 2 && metrics.negativeGatePasses === metrics.negativeCases },
  { key: 'item_keep_rate', label: 'Item keep rate', result: `${(metrics.itemKeepRate * 100).toFixed(0)}%`, threshold: '>=80%', passed: metrics.itemKeepRate >= 0.8 },
  { key: 'quality_average', label: 'Seven-axis average', result: `${metrics.qualityAverage}/5`, threshold: '>=3.5', passed: metrics.qualityAverage >= 3.5 },
  { key: 'execution_clarity', label: 'Execution Clarity', result: `${metrics.scoreAverages.executionClarity}/5`, threshold: '>=4.0', passed: metrics.scoreAverages.executionClarity >= 4 },
  { key: 'content_fidelity', label: 'Content Fidelity/Coverage', result: `${metrics.scoreAverages.contentFidelityAndCoverage}/5`, threshold: '>=4.0', passed: metrics.scoreAverages.contentFidelityAndCoverage >= 4 },
  { key: 'source_safety', label: 'Source/Safety Separation', result: `${metrics.scoreAverages.sourceAndSafetySeparation}/5`, threshold: '>=4.0', passed: metrics.scoreAverages.sourceAndSafetySeparation >= 4 },
  { key: 'case_quality', label: 'Positive case quality gates', result: `${metrics.contentQualityGatePasses}/${metrics.positiveCases}`, threshold: '>=80%', passed: metrics.contentQualityGatePasses / metrics.positiveCases >= 0.8 },
  { key: 'round_3_stability', label: 'Round 3 core-decision stability', result: `${metrics.stabilityMatches}/${metrics.stabilityCases} (${stabilityRate})`, threshold: '>=80% (at least 6/7)', passed: metrics.stabilityCases === 7 && metrics.stabilityMatches / metrics.stabilityCases >= 0.8 },
];
const completionGateIndex = Object.fromEntries(
  completionGates.map((gate) => [gate.key, gate]),
);
const completionPassed = completionGates.every((gate) => gate.passed);
const failedCompletionGates = completionGates
  .filter((gate) => !gate.passed)
  .map((gate) => gate.key);

const reportData = {
  reportVersion: 'flowme-url-to-flow-prompt-lab-report-v1',
  date: '2026-07-15',
  experimentStatus: completionPassed ? 'complete' : 'incomplete',
  completionPassed,
  stopReason: completionPassed ? null : 'round_3_stability_gate_failed',
  iterations: { used: 3, max: 3, exhausted: true },
  caseSetVersion: casesDoc.caseSetVersion,
  expectationSetVersion: expectedDoc.expectationSetVersion,
  promptVersions: ['url-to-flow-prompt-v0.1', 'url-to-flow-prompt-v0.2'],
  proposalSchemaVersion: 'flowme-semantic-proposal-v1',
  inputContract: {
    semantic: 'Source metadata + SourceRows + canonical userJob',
    envelope: 'caseId + targetLocale + maxItems + neutral inputEvidenceRefs',
    urlOnly: false,
  },
  reviewEvidence: {
    acceptedRound: 'round-2',
    acceptedCaseCount: 12,
    round1QualitativeAccepted: false,
    reviewerKind: 'in_session_model_proxy',
    contextIsolation: 'fresh_subagent_no_expected_answers',
    humanReviewer: false,
  },
  completionGates,
  failedCompletionGates,
  metrics,
  invalidCodeCounts,
  stability,
  unsupportedAudit,
  round3DiscardedRuns,
  cases: caseSummaries,
  evidenceBoundary: {
    generationKinds,
    provider: 'not_available',
    model: 'not_available',
    modelTier: 'unclassified',
    rawRunLabels: {
      provider: providerRunLabels,
      model: modelRunLabels,
    },
    runLabelsAreVerifiedProviderIdentity: false,
    latency: 'not_available',
    tokens: 'not_available',
    cost: 'not_available',
    humanReview: false,
  },
};

fs.mkdirSync(auditDir, { recursive: true });
fs.writeFileSync(
  path.join(auditDir, 'report-data.json'),
  `${JSON.stringify(reportData, null, 2)}\n`,
  'utf8',
);

function markdownCase(entry) {
  const source = entry.sourceLines.length
    ? entry.sourceLines.map((row) => `\`${row.sourceRowId}\` ${row.text}`).join('<br>')
    : 'SourceRow 없음';
  const result = entry.correctedPreview.title ?? `${entry.status.errorCode} / ${entry.disposition}`;
  return `| ${entry.caseId} | ${entry.name} | ${source} | ${result} | ${entry.qualityAverage ?? 'N/A'} | ${entry.decision} |`;
}

const completionGateRows = completionGates
  .map(
    (gate) =>
      '| ' + gate.label + ' | ' + gate.result + ' | ' + gate.threshold + ' | ' +
      (gate.passed ? 'PASS' : 'FAIL') + ' |',
  )
  .join('\n');

const comparisonMarkdown = `# URL-to-FLOW Prompt Lab v1 비교 결과

Date: 2026-07-15<br>
Evidence: 기존 canonical 콘텐츠 10건 + negative 2건, 외부 API 없음<br>
Input: Source metadata + SourceRows + canonical userJob

## 한 문장 결론

prompt v0.2는 Round 2에서 구조 12/12와 직접 블라인드 리뷰 품질 gate를 통과했지만, Round 3 핵심 결정 재현성은 ${metrics.stabilityMatches}/${metrics.stabilityCases}(${stabilityRate})로 기준 6/7 이상에 미달했다. 따라서 Prompt Lab v1은 미완료이며 현재 Backend No-Go다.

## 첫 예시

“극세 필터는 4주에 한 번 청소” → “극세 필터 청소하기” → 완료 기준 “청소를 마쳤다” → Checklist와 Calendar 후보. 단, 실제 시작일과 반복 규칙은 원문 근거와 규칙 계층이 확정한다.

## 세 번의 반복

| Round | Prompt | 유효 output | 유효 run | 해석 |
| --- | --- | ---: | ---: | --- |
| 1 | v0.1 | ${metrics.round1.validOutputs}/${metrics.round1.outputs} | ${metrics.round1.validRuns}/${metrics.round1.runs} | exact enum·nested shape 계약이 불충분했다. 질적 리뷰 증거에서는 제외했다. |
| 2 | v0.2 | ${metrics.round2.validOutputs}/${metrics.round2.outputs} | ${metrics.round2.validRuns}/${metrics.round2.runs} | 같은 12건이 strict schema와 SourceRow accounting을 통과했다. |
| 3 | v0.2 stability | ${metrics.round3.validOutputs}/${metrics.round3.outputs} | ${metrics.round3.validRuns}/${metrics.round3.runs} | 대표 양성 5건 + negative 2건 중 핵심 결정 일치 ${metrics.stabilityMatches}/${metrics.stabilityCases}. |

${discardedProvenanceNarrative}

${stabilityNarrative}

## 완료 gate

| 지표 | 결과 | 목표 | 판정 |
| --- | ---: | ---: | --- |
${completionGateRows}

완료 gate는 11개 중 ${completionGates.filter((gate) => gate.passed).length}개가 통과했다. 실패 gate는 ${failedCompletionGates.join(', ')}다. 양성 10건의 직접 블라인드 proxy review 평균은 ${metrics.qualityAverage}/5, Item keep rate는 ${(metrics.itemKeepRate * 100).toFixed(0)}%다. 사람 검토 시간과 실제 cheap/premium 모델의 latency·token·cost는 측정하지 않았다.

## 12개 사례

| Case | 원 콘텐츠 형태 | SourceRow | 교정 FLOW / gate | 평균 | 판정 |
| --- | --- | --- | --- | ---: | --- |
${caseSummaries.map(markdownCase).join('\n')}

## 데이터 구조 해석

- 입력 근거: Source metadata + SourceRows + canonical userJob
- 실행 최소단위: 상태와 완료 기준을 가진 Item
- 선택적 묶음: Step
- 목적지 표현: Calendar/ICS, Checklist/Todo, Sheet, Memo projection
- LLM 소유: Item 묶기, 제목, 완료 기준, 목적지 후보
- 규칙 소유: ID, 상태, 날짜 해석, 반복 규칙, SourceRow accounting, export 생성

따라서 ICS나 checklist가 FLOW의 최소단위가 아니다. 둘은 같은 Item을 각 도구 문법으로 옮기는 projection이다.

## 리뷰 증거 경계

- Round 1: 구조 실패를 보여 주는 raw validator 증거만 사용
- Round 2: 예상 정답과 모델 신원을 숨긴 fresh subagent 직접 리뷰 12건만 사용
- observed user나 human reviewer 증거는 없음
- 검증된 실제 provider/model identity, latency, token, cost는 not_available
- raw run의 provider/model 값은 비식별 orchestration label(${providerRunLabels.join(' · ')} / ${modelRunLabels.join(' · ')})이며 실제 provider/model 증거로 취급하지 않음

## 아직 증명하지 않은 것

- production URL fetch/crawl/PDF·영상 추출
- 실제 cheap/premium 모델 품질·latency·token·cost 비교
- 사람 reviewer의 교정 시간과 실제 사용자 실행 성공률
- DB, 저장·발행, 계정·권한, 재처리 queue

## 다음 결정

세 번의 반복 한도를 모두 사용했으므로 v0.3이나 4회차를 이번 v1에 소급해 추가하지 않는다. 사용자가 Prompt Lab v2를 승인하면 deterministic tie-break 규칙을 추가하고, case-01·05·06·10과 unseen/metamorphic 사례로 한 번 더 안정성을 검증한다. 그 gate를 통과한 뒤에만 cheap/premium provider 비교와 backend 착수를 검토한다.

## 산출물

- [슬라이드형 HTML](./report.html)
- [보고서 데이터](./report-data.json)
- [Prompt v0.2](../../specs/2026-07-14-url-to-flow-prompt-lab/prompt-v0.2.md)
- [리뷰 기준](../../specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md)
- [시험 cases](../../specs/2026-07-14-url-to-flow-prompt-lab/cases-v1.json)
`;

fs.writeFileSync(path.join(auditDir, 'comparison.md'), comparisonMarkdown, 'utf8');

const arrowSvg = `<svg class="arrow-svg" viewBox="0 0 72 32" aria-hidden="true"><path d="M2 16h58M48 5l12 11-12 11" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
const upArrowSvg = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28V5M7 14l9-9 9 9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
const downArrowSvg = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4v23M7 18l9 9 9-9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"/></svg>`;
const checkSvg = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 17l7 7L28 7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square"/></svg>`;
const blockSvg = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 7l18 18M25 7L7 25" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square"/></svg>`;

function slide(number, title, body, options = {}) {
  const titleMarkup = options.title === false ? '' : `\n      <h2>${esc(title)}</h2>`;
  return `<section class="slide ${options.className ?? ''}" id="slide-${number}" data-title="${esc(title)}">
    <div class="stage">${titleMarkup}
      ${body}
      <div class="slide-index" aria-hidden="true">${String(number).padStart(2, '0')}</div>
    </div>
  </section>`;
}

function metric(label, value, note, tone = '') {
  return `<div class="metric ${tone}"><strong>${esc(value)}</strong><span>${esc(label)}</span><small>${esc(note)}</small></div>`;
}

function galleryRow(entry) {
  const source = entry.sourceLines.length
    ? entry.sourceLines.map((row) => row.text).join(' · ')
    : 'SourceRow 없음';
  const destination = entry.correctedPreview.destinations.join(' · ') || entry.disposition;
  return `<div class="gallery-row">
    <div><span class="case-id">${esc(entry.caseId)}</span><strong>${esc(source)}</strong><small>${esc(entry.fixtureShape)}</small></div>
    <div class="row-arrow">${arrowSvg}</div>
    <div><strong>${esc(entry.correctedPreview.title ?? entry.status.errorCode)}</strong><small>${entry.correctedPreview.items.length} Item · ${esc(destination)}</small></div>
  </div>`;
}

function previewCase(entry) {
  const score = entry.qualityAverage === null ? 'N/A' : `${entry.qualityAverage}/5`;
  const items = entry.correctedPreview.items
    .map(
      (item) => `<li><strong>${esc(item.title)}</strong><span>${esc(item.doneWhen)}</span><code>${esc(item.sourceRowIds.join(', '))}</code></li>`,
    )
    .join('');
  return `<article class="preview-case">
    <header><span>${esc(entry.caseId)} · ${esc(entry.name)}</span><strong>${esc(score)}</strong></header>
    <div class="preview-columns">
      <div class="evidence-column"><b>SourceRow</b>${entry.sourceLines
        .map((row) => `<p>${esc(row.text)}<code>${esc(row.sourceRowId)}</code></p>`)
        .join('')}</div>
      <div class="preview-arrow">${arrowSvg}</div>
      <div class="flow-column"><b>${esc(entry.correctedPreview.title)}</b><ol>${items}</ol><small>${esc(entry.correctedPreview.destinations.join(' · '))}</small></div>
    </div>
    <footer>${esc(entry.correctedPreview.reviewNote)}</footer>
  </article>`;
}

function scoreBar(key, label) {
  const value = metrics.scoreAverages[key];
  return `<div class="score-row"><span>${esc(label)}</span><div><i style="--score:${value}"></i></div><strong>${value}</strong></div>`;
}

const slides = [];
slides.push(
  slide(
    1,
    'URL 한 개가, 실행 가능한 FLOW가 되려면',
    `<h1>URL 한 개가,<br>실행 가능한 FLOW가 되려면</h1>
    <div class="transform-rail">
      <div class="source-box"><span>SourceRow</span><strong>극세 필터는 4주에 한 번 청소</strong></div>
      <div class="hero-arrow">${arrowSvg}</div>
      <div class="item-table"><span>FLOW Item</span><dl><dt>제목</dt><dd>극세 필터 청소하기</dd><dt>완료 조건</dt><dd>청소를 마쳤다</dd><dt>연결 대상</dt><dd>Checklist · Calendar 후보</dd></dl></div>
    </div>
    <div class="round-shift"><span>v0.1</span><strong class="cobalt">${metrics.round1.validOutputs}/${metrics.round1.outputs}</strong>${arrowSvg}<span>v0.2</span><strong class="coral">${metrics.round2.validOutputs}/${metrics.round2.outputs}</strong></div>
    <p class="hero-note"><b>위 수치는 strict schema valid</b> · 기존 콘텐츠 12건 · 외부 API 없음 · Source metadata + SourceRows + canonical userJob 통제 입력</p>`,
    { title: false, className: 'cover-slide' },
  ),
);

slides.push(
  slide(
    2,
    '결론부터: 품질은 통과했지만 안정성은 실패했다',
    `<div class="metric-rail">
      ${metric('schema valid', `${metrics.round2.validOutputs}/${metrics.round2.outputs}`, 'Round 2')}
      ${metric('SourceRow accounting', '100%', 'mapped 또는 omitted')}
      ${metric('negative gate', '2/2', 'missing source · locale')}
      ${metric('직접 proxy review 평균', `${metrics.qualityAverage}/5`, '양성 10건')}
      ${metric('사례별 content gate', `${metrics.contentQualityGatePasses}/10`, 'Round 2 direct review')}
      ${metric('core-decision 안정성', `${metrics.stabilityMatches}/${metrics.stabilityCases}`, '기준 6/7 이상', 'coral-line')}
    </div>
    <div class="verdict-band"><strong>현재 결정</strong><p>Prompt Lab v1 미완료 · Backend No-Go. 구조와 리뷰 품질은 통과했지만 같은 입력의 핵심 구조가 충분히 재현되지 않았다.</p><strong>다음 결정</strong><p>세 번의 반복을 모두 썼다. 추가 개선은 Prompt Lab v2 승인 후 별도 4회차로 다룬다.</p></div>
    <p class="evidence-note">Unsupported action/date/repeat/fact: <b>${metrics.unsupportedActionDateRepeatFactDetections} signals · ${unsupportedGateVerdict}</b> (${esc(unsupportedAuditSummary)}). Round 1 질적 리뷰는 제외했고, Round 2 fresh subagent 직접 리뷰 12건만 사용했다.</p>`,
  ),
);

slides.push(
  slide(
    3,
    'ICS가 최소단위는 아니다',
    `<div class="unit-flow">
      <div><span>근거 최소단위</span><strong>SourceRow</strong><p>“극세 필터는 4주에 한 번 청소”</p><code>row-aircon-filter-4week</code></div>
      ${arrowSvg}
      <div class="primary-unit"><span>실행 최소단위</span><strong>Item</strong><p>극세 필터 청소하기</p><small>상태 · 완료 조건 · SourceRef</small></div>
      ${arrowSvg}
      <div><span>목적지별 표현</span><strong>Projection</strong><p>Calendar · Checklist · Sheet · Memo</p><small>같은 Item을 도구 문법으로 옮긴다</small></div>
    </div>
    <div class="unit-notes"><p><b>Step</b>은 여러 Item을 읽기 쉽게 묶는 선택 구조다.</p><p><b>ICS</b>는 날짜 근거와 사용자 anchor가 있을 때 생성되는 Calendar projection이다.</p><p><b>Checklist</b>도 저장 모델 자체가 아니라 Item의 한 출력 형태다.</p></div>
    <div class="answer-line">따라서 backend의 중심 객체는 <strong>SourceRow + Item</strong>, 외부 도구 연동은 <strong>projection adapter</strong>다.</div>`,
  ),
);

slides.push(
  slide(
    4,
    '첫 다섯 사례: 원문 모양이 달라도 같은 계약으로 변환한다',
    `<div class="gallery-list">${positiveCases.slice(0, 5).map(galleryRow).join('')}</div>`,
    { className: 'dense-slide' },
  ),
);

slides.push(
  slide(
    5,
    '다음 다섯 사례: Item 수는 목표가 아니라 결과다',
    `<div class="gallery-list">${positiveCases.slice(5, 10).map(galleryRow).join('')}</div>
    <p class="evidence-note">maxItems=7은 채워야 할 목표가 아니라 안전 상한이다. 1 Item이 자연스러운 콘텐츠는 1개로 끝낸다.</p>`,
    { className: 'dense-slide' },
  ),
);

slides.push(
  slide(
    6,
    '만들지 않는 것도 변환 품질이다',
    `<div class="negative-grid">
      <article><div class="gate-icon">${blockSvg}</div><span>${esc(negativeCases[0].caseId)}</span><h3>SourceRow 없음</h3><p>PDF 본문과 학습 행을 받지 못했다.</p><dl><dt>status</dt><dd>failed · no_proposal</dd><dt>error</dt><dd>missing_source_rows</dd><dt>결과</dt><dd>Item 0 · projection 0</dd></dl><strong>source_import_required</strong></article>
      <article><div class="gate-icon coral">${blockSvg}</div><span>${esc(negativeCases[1].caseId)}</span><h3>지역 적용성 미확인</h3><p>미국 병원·보험 맥락을 한국 출산 준비로 승격할 수 없다.</p><dl><dt>status</dt><dd>failed · no_proposal</dd><dt>error</dt><dd>locale_applicability_unverified</dd><dt>결과</dt><dd>Item 0 · projection 0</dd></dl><strong>hold</strong></article>
    </div>
    <div class="answer-line">좋은 모델은 빈칸을 그럴듯하게 채우지 않고, <strong>왜 멈췄는지</strong>를 저장 가능한 상태로 남긴다.</div>`,
  ),
);

slides.push(
  slide(
    7,
    'LLM은 의미를 제안하고, 규칙이 제품 상태를 만든다',
    `<div class="pipeline">
      <div class="outside"><strong>URL</strong><span>production fetch</span><small>이번 세션 범위 밖</small></div>${arrowSvg}
      <div><strong>SourceRow</strong><span>근거 정규화</span><small>이번 세션 시작</small></div>${arrowSvg}
      <div class="control"><strong>Gate</strong><span>지역 · 민감도</span><small>rule owned</small></div>${arrowSvg}
      <div><strong>LLM Proposal</strong><span>묶기 · 제목 · 완료조건</span><small>semantic only</small></div>${arrowSvg}
      <div class="control"><strong>Validator</strong><span>ID · 상태 · 날짜 · 누락</span><small>rule owned</small></div>${arrowSvg}
      <div><strong>Item + Export</strong><span>Checklist · Calendar</span><small>Sheet · Memo</small></div>
    </div>
    <div class="ownership-legend"><span><i class="blue-line"></i>생성·표현</span><span><i class="coral-line"></i>통제·상태</span></div>
    <p class="evidence-note">DB 저장·자동 발행 전에는 human review가 readiness를 소유한다. 그래서 proposal의 readiness는 항상 null이다.</p>`,
  ),
);

slides.push(
  slide(
    8,
    '세 번의 반복: 구조는 고쳤지만 재현성이 남았다',
    `<div class="rounds-table">
      <div><strong>Round 1 · v0.1</strong><span class="big coral">${metrics.round1.validOutputs}/${metrics.round1.outputs}</span><p>exact enum과 nested shape 계약이 흔들렸다. raw validator 증거만 보존했다.</p></div>
      <div class="change-column">${arrowSvg}<strong>수정 1개</strong><p>허용 enum과 필드 모양을 prompt에 그대로 열거</p></div>
      <div><strong>Round 2 · v0.2</strong><span class="big cobalt">${metrics.round2.validOutputs}/${metrics.round2.outputs}</span><p>source-controlled packet 12건이 schema와 accounting을 통과했다.</p></div>
      <div class="change-column">${arrowSvg}<strong>동일 prompt</strong><p>대표 양성 5건 + negative 2건 독립 재실행</p></div>
      <div><strong>Round 3 · stability</strong><span class="big coral">${metrics.stabilityMatches}/${metrics.stabilityCases}</span><p>FAIL · ${esc(stabilityCardSummary)}</p></div>
    </div>
    <div class="method-note"><b>통과 기준</b><span>core-decision 80% 이상, 즉 7건 중 최소 6건 일치.</span><b>실제 결과</b><span>case-01·05·06·10이 달라 3/7(42.9%). 제목 차이가 아니라 artifact, Item candidate, projection applicability 차이다.</span></div>`,
  ),
);

const reviewSpotlightCases = ['case-01', 'case-06', 'case-10'].map(
  (caseId) => caseSummaries.find((entry) => entry.caseId === caseId),
);

slides.push(
  slide(
    9,
    '직접 블라인드 리뷰는 10/10 품질 gate를 통과했다',
    `<div class="review-layout"><div class="score-bars">${scoreKeys
      .map(([key, label]) => scoreBar(key, label))
      .join('')}</div>
      <div class="review-summary">${metric('전체 평균', `${metrics.qualityAverage}/5`, '10 positive')}${metric('Item keep', `${(metrics.itemKeepRate * 100).toFixed(0)}%`, 'sourceProposalIds 기준')}${metric('사례별 gate', `${metrics.contentQualityGatePasses}/10`, 'direct Round 2')}</div></div>
    <div class="revision-rail">${reviewSpotlightCases
      .map(
        (entry) =>
          `<article><span>${esc(entry.caseId)} · ${entry.contentQualityGatePassed ? 'PASS' : 'FAIL'}</span><strong>${esc(entry.correctedPreview.title)}</strong><p>${esc(entry.topFixes?.join(' · ') || '추가 교정 없음')}</p></article>`,
      )
      .join('')}</div>
    <p class="evidence-note">품질 점수와 안정성은 다른 gate다. 이 proxy review는 모델 신원을 숨긴 fresh subagent 평가지만 사람이 아니며, reviewSeconds와 burden은 null이다.</p>`,
    { className: 'dense-slide' },
  ),
);

slides.push(
  slide(10, '교정 미리보기 1–3', `<div class="preview-stack">${positiveCases.slice(0, 3).map(previewCase).join('')}</div>`, { className: 'preview-slide' }),
);
slides.push(
  slide(11, '교정 미리보기 4–6', `<div class="preview-stack">${positiveCases.slice(3, 6).map(previewCase).join('')}</div>`, { className: 'preview-slide' }),
);
slides.push(
  slide(12, '교정 미리보기 7–10', `<div class="preview-stack compact">${positiveCases.slice(6, 10).map(previewCase).join('')}</div>`, { className: 'preview-slide dense-slide' }),
);

slides.push(
  slide(
    13,
    '안정성 실패와 비용 미측정은 서로 다른 문제다',
    `<div class="stability-table"><header><span>Case</span><span>Round 2 artifact</span><span>Round 3 artifact</span><span>Core</span></header>${stability
      .map((entry) => `<div><span>${esc(entry.caseId)}</span><span>${esc(entry.round2Artifact)}</span><span>${esc(entry.round3Artifact)}</span><strong>${entry.match ? 'MATCH' : 'DIFF'}</strong></div>`)
      .join('')}</div>
    <div class="cost-lane"><div><strong>이번 세션 증거</strong><p>검증된 provider/model identity: not_available · tier: unclassified</p><p>raw run label: ${esc(providerRunLabels.join(' · '))} / ${esc(modelRunLabels.join(' · '))}</p><p>generation kind: ${esc(generationKinds.join(' · '))}</p><p>latency · token · cost: null / not_available</p></div><div><strong>현재 blocker</strong><p>core-decision ${metrics.stabilityMatches}/${metrics.stabilityCases} · 기준 6/7 이상</p><p>v2 승인 전에는 4회차·provider 비교·backend 착수를 추가하지 않는다.</p></div></div>
    <p class="evidence-note">raw run label은 실행 경로 표시일 뿐 실제 provider/model identity 증거가 아니다. Round 3은 독립 재실행 provenance만 말하며, cheap/premium 우열이나 비용 절감을 증명하지 않는다.</p>`,
    { className: 'dense-slide' },
  ),
);

slides.push(
  slide(
    14,
    'Backend를 만들기 전에 준비할 것은 API 키보다 계약이다',
    `<div class="backend-rows">
      <div><span>01</span><strong>Ingress</strong><p>URL fetch, 권리·robots·timeout, PDF/영상/본문 추출</p><small>이번 세션에서는 있다고 가정</small></div>
      <div><span>02</span><strong>Evidence</strong><p>Source · SourceRow · locale · risk · checkedAt</p><small>현재 cases v1로 고정</small></div>
      <div><span>03</span><strong>Semantic proposal</strong><p>provider-neutral prompt v0.2(구조 통과·안정성 미달) + compact JSON schema</p><small>v2 개선 전 동결</small></div>
      <div><span>04</span><strong>Rule assembler</strong><p>ID, 상태, 일정 해석, 누락 검증, projection adapter</p><small>결정론적 코드</small></div>
      <div><span>05</span><strong>Review & storage</strong><p>원문/제안 diff, 승인·보류·거절, version, retry, audit log</p><small>DB는 이 계약 다음</small></div>
      <div><span>06</span><strong>Operations</strong><p>latency, token, cost, cache, queue, redaction, observability</p><small>실제 provider에서 측정</small></div>
    </div>
    <div class="answer-line">계약 골격은 준비됐지만, <strong>안정성 6/7 이상</strong>을 통과하기 전에는 backend 구현에 착수하지 않는다.</div>`,
    { className: 'dense-slide' },
  ),
);

slides.push(
  slide(
    15,
    '세 번은 끝났다. 다음 한 번은 별도 승인이 필요하다',
    `<div class="next-sequence"><div><span>1</span><strong>v1 종료 · 3/3</strong><p>Round 2 구조 12/12 · Round 3 안정성 3/7</p></div>${arrowSvg}<div><span>2</span><strong>Prompt Lab v2 승인</strong><p>v0.3은 v1의 소급 수정이 아니라 새 실험</p></div>${arrowSvg}<div><span>3</span><strong>tie-break + unseen</strong><p>case-01·05·06·10과 변형 사례 재검증</p></div>${arrowSvg}<div><span>4</span><strong>Gate 후 Go / No-Go</strong><p>6/7 이상이면 provider 비용 비교와 backend 검토</p></div></div>
    <div class="final-decision"><strong>이번 세션의 결정</strong><p>SourceRow를 근거 최소단위, Item을 실행 최소단위로 두는 구조는 유지한다. 그러나 prompt v0.2는 재현성 기준 미달이므로 Backend No-Go 상태로 동결한다.</p></div>
    <div class="artifact-links"><a href="./comparison.md">비교 Markdown</a><a href="./report-data.json">보고서 데이터</a><a href="../../specs/2026-07-14-url-to-flow-prompt-lab/prompt-v0.2.md">Prompt v0.2</a><a href="../../specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md">Review rubric</a></div>`,
  ),
);

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>URL-to-FLOW Prompt Lab v1</title>
  <style>
    :root{--ink:#0b0b0d;--blue:#123dcc;--coral:#ff4b2f;--line:#d8dce6;--pale:#f2f5ff;--white:#fff;--muted:#5f6470;--stage-w:min(1440px,calc((100svh - 32px)*16/9),calc(100vw - 96px));font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",Inter,Arial,sans-serif;color:var(--ink);background:var(--white)}
    *{box-sizing:border-box}html{scroll-behavior:smooth;background:#fff}body{margin:0;background:#fff;color:var(--ink)}a{color:inherit;text-decoration-thickness:2px;text-underline-offset:4px}button{font:inherit}.deck{scroll-snap-type:y mandatory}.slide{min-height:100svh;display:grid;place-items:center;scroll-snap-align:start;padding:16px 48px;background:#fff}.stage{position:relative;width:var(--stage-w);aspect-ratio:16/9;max-height:calc(100svh - 32px);padding:clamp(32px,4vw,72px);overflow:hidden;border:1px solid #eef0f5;background:#fff;box-shadow:0 18px 60px rgba(12,26,74,.08)}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(42px,4.7vw,78px);line-height:1.08;letter-spacing:-.055em;margin-bottom:clamp(32px,4vh,70px);max-width:1000px}h2{font-size:clamp(34px,3.7vw,62px);line-height:1.1;letter-spacing:-.05em;margin:0 0 clamp(28px,3.2vh,52px);max-width:1160px}.slide-index{position:absolute;right:28px;bottom:24px;font:700 13px/1 Arial;color:#a7acb8;letter-spacing:.12em}.arrow-svg{width:72px;height:32px;color:var(--blue);display:block}.cover-slide .stage{padding-top:clamp(32px,4vh,62px)}.transform-rail{display:grid;grid-template-columns:minmax(260px,.9fr) 90px minmax(430px,1.2fr);align-items:center;gap:24px}.source-box{border:2px solid var(--blue);min-height:170px;display:grid;align-content:center;padding:30px}.source-box span,.item-table>span{font-size:18px;font-weight:800;color:var(--blue);margin-bottom:18px}.source-box strong{font-size:clamp(24px,2.1vw,36px);line-height:1.35;letter-spacing:-.03em}.hero-arrow{display:grid;place-items:center}.item-table dl{display:grid;grid-template-columns:155px 1fr;margin:0;border-top:1px solid #aeb4c2}.item-table dt,.item-table dd{margin:0;padding:15px 18px;border-bottom:1px solid #aeb4c2;font-size:clamp(17px,1.55vw,26px)}.item-table dt{color:var(--blue);font-weight:800;border-right:1px solid #aeb4c2}.item-table dt:nth-of-type(2){color:var(--coral)}.item-table dd{font-weight:700}.round-shift{margin-top:clamp(30px,5vh,76px);padding-top:25px;border-top:3px solid var(--blue);display:flex;align-items:baseline;justify-content:center;gap:24px;font-size:24px;font-weight:800}.round-shift strong{font-size:clamp(40px,4vw,70px)}.round-shift .arrow-svg{display:inline-block;width:58px;transform:translateY(7px)}.cobalt{color:var(--blue)}.coral{color:var(--coral)}.hero-note{margin:14px 0 0;text-align:center;color:var(--muted);font-size:14px}.metric-rail{display:grid;grid-template-columns:repeat(6,1fr);border-top:2px solid var(--blue);border-bottom:2px solid var(--blue)}.metric{min-width:0;padding:28px 20px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:8px}.metric:last-child{border-right:0}.metric strong{font-size:clamp(30px,3vw,52px);color:var(--blue);letter-spacing:-.04em}.metric span{font-weight:800;font-size:16px}.metric small{color:var(--muted);line-height:1.4}.metric.coral-line strong{color:var(--coral)}.verdict-band{margin-top:42px;display:grid;grid-template-columns:210px 1fr 210px 1fr;gap:18px 24px;align-items:start}.verdict-band strong{font-size:20px;color:var(--blue)}.verdict-band strong:nth-of-type(2){color:var(--coral)}.verdict-band p{font-size:20px;line-height:1.55;margin:0}.evidence-note{margin:30px 0 0;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:15px;line-height:1.55}.unit-flow{display:grid;grid-template-columns:1fr 80px 1fr 80px 1fr;align-items:center}.unit-flow>div{min-height:250px;padding:28px;border-top:3px solid var(--blue);background:var(--pale)}.unit-flow>div.primary-unit{border-color:var(--coral);background:#fff7f4}.unit-flow span{display:block;color:var(--blue);font-weight:800;margin-bottom:16px}.unit-flow .primary-unit span{color:var(--coral)}.unit-flow strong{display:block;font-size:42px;margin-bottom:24px}.unit-flow p{font-size:21px;line-height:1.4}.unit-flow code{font-size:13px;color:var(--muted)}.unit-flow small{font-size:16px}.unit-notes{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:35px}.unit-notes p{border-top:1px solid var(--line);padding-top:16px;font-size:17px;line-height:1.55}.answer-line{margin-top:28px;padding:20px 24px;border-left:5px solid var(--coral);font-size:21px;background:#fff7f4}.gallery-list{border-top:2px solid var(--blue)}.gallery-row{display:grid;grid-template-columns:1fr 92px 1.05fr;align-items:center;min-height:92px;border-bottom:1px solid var(--blue);gap:24px}.gallery-row>div:first-child,.gallery-row>div:last-child{display:grid;grid-template-columns:auto 1fr;column-gap:16px;align-items:baseline}.gallery-row strong{font-size:clamp(17px,1.4vw,24px);letter-spacing:-.03em}.gallery-row small{grid-column:2;color:var(--muted);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.case-id{font:800 12px/1 Arial;color:var(--blue);letter-spacing:.08em}.row-arrow{display:grid!important;grid-template-columns:1fr!important;place-items:center}.negative-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px}.negative-grid article{border-top:4px solid var(--blue);padding:28px 4px 0;position:relative}.negative-grid article:nth-child(2){border-color:var(--coral)}.negative-grid article>span{color:var(--blue);font:800 13px Arial}.negative-grid h3{font-size:34px;margin:18px 0}.negative-grid p{font-size:19px;color:var(--muted);line-height:1.5}.negative-grid dl{display:grid;grid-template-columns:120px 1fr;border-top:1px solid var(--line)}.negative-grid dt,.negative-grid dd{margin:0;padding:12px 0;border-bottom:1px solid var(--line)}.negative-grid dt{color:var(--muted)}.negative-grid dd{font-family:ui-monospace,Consolas,monospace}.negative-grid article>strong{display:block;color:var(--coral);font-size:26px;margin-top:20px}.gate-icon{position:absolute;right:4px;top:28px;width:50px;height:50px;color:var(--blue)}.gate-icon svg{width:100%}.gate-icon.coral{color:var(--coral)}.pipeline{display:grid;grid-template-columns:repeat(5,minmax(115px,1fr) 56px) minmax(130px,1.1fr);align-items:center;margin-top:70px}.pipeline>div{min-height:190px;border-top:3px solid var(--blue);padding:22px 8px}.pipeline>div.control{border-color:var(--coral)}.pipeline>div.outside{border-style:dashed;color:var(--muted)}.pipeline strong,.pipeline span,.pipeline small{display:block}.pipeline strong{font-size:22px}.pipeline span{margin-top:30px;font-weight:700}.pipeline small{margin-top:9px;color:var(--muted)}.pipeline .control strong{color:var(--coral)}.pipeline .arrow-svg{width:48px}.ownership-legend{display:flex;gap:36px;margin-top:60px;border-top:1px solid var(--line);padding-top:18px}.ownership-legend span{display:flex;align-items:center;gap:12px}.ownership-legend i{width:42px;border-top:4px solid var(--blue)}.ownership-legend i.coral-line{border-color:var(--coral)}.rounds-table{display:grid;grid-template-columns:1fr .55fr 1fr .55fr 1fr;gap:28px;align-items:start}.rounds-table>div:not(.change-column){border-top:4px solid var(--blue);padding-top:22px}.rounds-table strong{font-size:20px}.rounds-table .big{display:block;font-size:clamp(40px,4vw,68px);margin:25px 0 12px}.rounds-table p{font-size:17px;line-height:1.55;color:var(--muted)}.change-column{text-align:center;padding-top:80px}.change-column .arrow-svg{margin:auto}.change-column strong{display:block;margin-top:16px;color:var(--coral)}.change-column p{font-size:14px}.method-note{display:grid;grid-template-columns:170px 1fr 170px 1fr;gap:14px 22px;border-top:1px solid var(--line);margin-top:40px;padding-top:20px;font-size:15px;line-height:1.5}.method-note b{color:var(--blue)}.review-layout{display:grid;grid-template-columns:1.5fr .8fr;gap:60px}.score-bars{border-top:2px solid var(--blue)}.score-row{display:grid;grid-template-columns:150px 1fr 42px;gap:16px;align-items:center;border-bottom:1px solid var(--line);min-height:48px}.score-row span{font-weight:700}.score-row>div{height:8px;background:#e9ecf4}.score-row i{display:block;width:calc(var(--score)/5*100%);height:100%;background:var(--blue)}.review-summary{display:grid;grid-template-columns:1fr;border-top:2px solid var(--coral)}.review-summary .metric{border-right:0;border-bottom:1px solid var(--line);padding:18px}.revision-rail{display:grid;grid-template-columns:1fr 1fr;gap:34px;margin-top:30px}.revision-rail article{border-top:3px solid var(--coral);padding-top:16px}.revision-rail span{color:var(--coral);font-weight:800}.revision-rail strong{display:block;font-size:20px;margin:10px 0}.revision-rail p{color:var(--muted);line-height:1.45;font-size:15px}.preview-stack{display:grid;gap:17px}.preview-case{border-top:2px solid var(--blue);padding-top:13px}.preview-case header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.preview-case header span{font-weight:800;color:var(--blue)}.preview-case header strong{font-size:16px}.preview-columns{display:grid;grid-template-columns:.8fr 55px 1.6fr;align-items:center;gap:10px}.evidence-column,.flow-column{min-width:0}.evidence-column>b,.flow-column>b{font-size:17px}.evidence-column p{font-size:14px;margin:7px 0;color:var(--muted)}.evidence-column code{display:block;font-size:10px;margin-top:3px}.preview-arrow .arrow-svg{width:48px}.flow-column ol{display:flex;gap:14px;margin:8px 0 0;padding:0;list-style:none}.flow-column li{flex:1;border-left:3px solid var(--coral);padding-left:10px;min-width:0}.flow-column li strong,.flow-column li span,.flow-column li code{display:block}.flow-column li strong{font-size:14px}.flow-column li span{font-size:12px;color:var(--muted);margin-top:4px}.flow-column li code{font-size:9px;margin-top:4px}.flow-column small{font-size:11px;color:var(--blue)}.preview-case footer{font-size:11px;color:var(--muted);margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.preview-stack.compact{gap:11px}.preview-stack.compact .preview-case{padding-top:9px}.preview-stack.compact .preview-case footer{display:none}.stability-table{border-top:2px solid var(--blue)}.stability-table header,.stability-table>div{display:grid;grid-template-columns:.7fr 1fr 1fr .7fr;gap:20px;align-items:center;border-bottom:1px solid var(--line);min-height:43px}.stability-table header{font-weight:800;color:var(--blue)}.stability-table strong{color:var(--blue)}.cost-lane{display:grid;grid-template-columns:1fr 1fr;gap:44px;margin-top:28px}.cost-lane>div{border-top:3px solid var(--blue);padding-top:16px}.cost-lane>div:nth-child(2){border-color:var(--coral)}.cost-lane strong{font-size:20px}.cost-lane p{font-size:15px;margin:9px 0;color:var(--muted)}.backend-rows{border-top:2px solid var(--blue)}.backend-rows>div{display:grid;grid-template-columns:50px 180px 1fr 200px;align-items:center;min-height:74px;border-bottom:1px solid var(--line);gap:16px}.backend-rows span{font:800 13px Arial;color:var(--blue)}.backend-rows strong{font-size:20px}.backend-rows p{margin:0;font-size:17px}.backend-rows small{color:var(--muted)}.next-sequence{display:grid;grid-template-columns:1fr 58px 1fr 58px 1fr 58px 1fr;align-items:center;margin-top:80px}.next-sequence>div{border-top:4px solid var(--blue);padding-top:18px;min-height:180px}.next-sequence>div:nth-of-type(2),.next-sequence>div:nth-of-type(4){border-color:var(--coral)}.next-sequence span{font:800 13px Arial;color:var(--blue)}.next-sequence strong{display:block;font-size:25px;margin:18px 0}.next-sequence p{color:var(--muted);line-height:1.5}.next-sequence .arrow-svg{width:48px}.final-decision{border-left:6px solid var(--coral);background:#fff7f4;padding:24px 30px;margin-top:44px;display:grid;grid-template-columns:180px 1fr;gap:20px}.final-decision p{font-size:20px;line-height:1.5;margin:0}.artifact-links{display:flex;gap:28px;margin-top:28px;font-size:14px;color:var(--blue)}.deck-nav{position:fixed;right:14px;top:50%;transform:translateY(-50%);display:grid;gap:6px;z-index:10}.deck-nav button{width:12px;height:12px;padding:0;border:1px solid var(--blue);background:#fff;cursor:pointer}.deck-nav button.active{background:var(--blue)}.deck-controls{position:fixed;left:16px;bottom:16px;z-index:10;display:flex;gap:8px}.deck-controls button{width:42px;height:42px;padding:8px;border:1px solid var(--blue);background:#fff;color:var(--blue);font-weight:900;cursor:pointer}.deck-controls svg{display:block;width:100%;height:100%}button:focus-visible,a:focus-visible{outline:3px solid var(--coral);outline-offset:3px}.deck-progress{position:fixed;left:0;top:0;height:3px;background:var(--coral);width:0;z-index:20;transition:width .2s ease}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .revision-rail{grid-template-columns:repeat(3,1fr);gap:28px}
    .dense-slide .stage,.preview-slide .stage{padding:38px 58px}.dense-slide h2,.preview-slide h2{font-size:clamp(30px,3.1vw,50px);margin-bottom:22px}.dense-slide .score-row{min-height:40px}.dense-slide .review-summary .metric{padding:12px 16px}.dense-slide .revision-rail{margin-top:16px}.dense-slide .revision-rail article{padding-top:10px}.dense-slide .revision-rail strong{font-size:17px;margin:7px 0}.dense-slide .revision-rail p{font-size:13px;margin-bottom:0}.dense-slide .evidence-note{margin-top:15px;padding-top:10px}.preview-slide .preview-stack{gap:10px}.preview-slide .preview-case{padding-top:8px}.preview-slide .preview-case header{margin-bottom:5px}.preview-slide .preview-case footer{margin-top:4px}.preview-stack.compact{gap:5px}.preview-stack.compact .preview-case{padding-top:4px}.preview-stack.compact .preview-case header{margin-bottom:1px}.preview-stack.compact .evidence-column p{font-size:12px;margin:3px 0}.preview-stack.compact .flow-column ol{margin-top:3px}.preview-stack.compact .flow-column li strong{font-size:12px}.preview-stack.compact .flow-column li span{font-size:10px;margin-top:2px}
    #slide-8 .stage,#slide-9 .stage{padding-top:26px;padding-bottom:26px}#slide-8 h2,#slide-9 h2{margin-bottom:12px}
    #slide-13 .stage{padding-top:24px;padding-bottom:24px}#slide-13 h2{margin-bottom:12px}#slide-13 .cost-lane{margin-top:20px}
    @media(max-width:1100px){:root{--stage-w:calc(100vw - 40px)}.slide{padding:12px 20px}.stage{aspect-ratio:auto;min-height:calc(100svh - 24px);max-height:none;padding:38px}.dense-slide .stage{overflow:auto}.metric-rail{grid-template-columns:repeat(3,1fr)}.metric:nth-child(3){border-right:0}.transform-rail{grid-template-columns:1fr 60px 1.25fr}.gallery-row{grid-template-columns:1fr 65px 1fr}.pipeline{grid-template-columns:repeat(5,minmax(90px,1fr) 38px) minmax(100px,1fr)}.pipeline strong{font-size:17px}.pipeline span{font-size:13px}.rounds-table{gap:14px}.backend-rows>div{grid-template-columns:40px 150px 1fr 160px}}
    @media(max-width:760px){html{scroll-behavior:auto}.deck{scroll-snap-type:none}.slide{display:block;min-height:0;padding:0;border-bottom:10px solid var(--pale)}.stage{width:100%;min-height:100svh;aspect-ratio:auto;border:0;box-shadow:none;padding:56px 22px 44px;overflow:visible}.slide-index{right:20px;bottom:18px}h1{font-size:43px}h2{font-size:35px;margin-bottom:30px}.transform-rail,.unit-flow,.negative-grid,.review-layout,.cost-lane{grid-template-columns:1fr}.hero-arrow,.unit-flow>.arrow-svg{transform:rotate(90deg);margin:auto}.round-shift{flex-wrap:wrap;gap:14px}.round-shift .arrow-svg{width:42px}.metric-rail{grid-template-columns:1fr 1fr}.metric:nth-child(3){border-right:1px solid var(--line)}.metric:nth-child(2n){border-right:0}.verdict-band{grid-template-columns:1fr}.unit-notes{grid-template-columns:1fr}.gallery-row{grid-template-columns:1fr;gap:10px;padding:20px 0}.row-arrow{transform:rotate(90deg)}.gallery-row>div:first-child,.gallery-row>div:last-child{grid-template-columns:auto 1fr}.pipeline{display:flex;flex-direction:column;margin-top:0}.pipeline>div{width:100%;min-height:0}.pipeline>.arrow-svg{transform:rotate(90deg);margin:10px}.rounds-table,.method-note{grid-template-columns:1fr}.change-column{padding:10px}.change-column .arrow-svg{transform:rotate(90deg)}.review-summary{grid-template-columns:1fr 1fr}.revision-rail{grid-template-columns:1fr}.preview-columns{grid-template-columns:1fr}.preview-arrow{transform:rotate(90deg);margin:auto}.flow-column ol{display:grid}.preview-case footer{white-space:normal}.negative-grid dd,.negative-grid article>strong{overflow-wrap:anywhere;word-break:break-word}.stability-table{font-size:12px;overflow:auto}.stability-table header,.stability-table>div{grid-template-columns:70px 110px 110px 70px}.backend-rows>div{grid-template-columns:34px 1fr;align-items:start;padding:16px 0}.backend-rows p,.backend-rows small{grid-column:2}.next-sequence{grid-template-columns:1fr}.next-sequence>.arrow-svg{transform:rotate(90deg);margin:10px auto}.final-decision{grid-template-columns:1fr}.artifact-links{flex-direction:column;gap:12px}.deck-nav{display:none}.deck-controls{left:auto;right:12px;bottom:12px}.deck-controls button{width:44px;height:44px}.evidence-note{font-size:13px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.deck-progress{transition:none}}
    @media print{@page{size:landscape;margin:0}.deck-nav,.deck-controls,.deck-progress{display:none}.slide{break-after:page;min-height:100vh;padding:0}.stage{width:100vw;height:100vh;max-height:none;aspect-ratio:auto;border:0;box-shadow:none}}
  </style>
</head>
<body>
  <div class="deck-progress" aria-hidden="true"></div>
  <main class="deck">${slides.join('\n')}</main>
  <nav class="deck-nav" aria-label="슬라이드 이동"></nav>
  <div class="deck-controls"><button type="button" data-dir="-1" aria-label="이전 슬라이드">${upArrowSvg}</button><button type="button" data-dir="1" aria-label="다음 슬라이드">${downArrowSvg}</button></div>
  <p class="sr-only" aria-live="polite" id="slide-status"></p>
  <script>
    const slides=[...document.querySelectorAll('.slide')];
    const nav=document.querySelector('.deck-nav');
    const progress=document.querySelector('.deck-progress');
    const status=document.querySelector('#slide-status');
    let current=0;
    slides.forEach((slide,index)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',(index+1)+'번: '+slide.dataset.title);button.addEventListener('click',()=>go(index));nav.append(button)});
    const dots=[...nav.children];
    function update(index){current=Math.max(0,Math.min(slides.length-1,index));dots.forEach((dot,i)=>dot.classList.toggle('active',i===current));progress.style.width=((current+1)/slides.length*100)+'%';status.textContent=(current+1)+' / '+slides.length+' '+slides[current].dataset.title}
    function go(index){const target=Math.max(0,Math.min(slides.length-1,index));slides[target].scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});update(target)}
    document.querySelectorAll('[data-dir]').forEach(button=>button.addEventListener('click',()=>go(current+Number(button.dataset.dir))));
    addEventListener('keydown',event=>{if(['ArrowDown','ArrowRight','PageDown'].includes(event.key)){event.preventDefault();go(current+1)}if(['ArrowUp','ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(current-1)}if(event.key==='Home'){event.preventDefault();go(0)}if(event.key==='End'){event.preventDefault();go(slides.length-1)}});
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>.55)update(slides.indexOf(entry.target))}},{threshold:[.55]});slides.forEach(slide=>observer.observe(slide));update(0);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(auditDir, 'report.html'), html, 'utf8');

const localReportLinks = [
  './comparison.md',
  './report-data.json',
  '../../specs/2026-07-14-url-to-flow-prompt-lab/prompt-v0.2.md',
  '../../specs/2026-07-14-url-to-flow-prompt-lab/review-rubric.md',
];
const missingReportLinks = localReportLinks.filter(
  (href) => !fs.existsSync(path.resolve(auditDir, href)),
);
if (missingReportLinks.length > 0) {
  throw new Error(`Broken local report links: ${missingReportLinks.join(', ')}`);
}
if (
  slides.length !== 15 ||
  !html.includes(
    `<span>v0.1</span><strong class="cobalt">${metrics.round1.validOutputs}/${metrics.round1.outputs}</strong>`,
  ) ||
  !html.includes(
    `<span>v0.2</span><strong class="coral">${metrics.round2.validOutputs}/${metrics.round2.outputs}</strong>`,
  )
) {
  throw new Error('Report deck structure or first-viewport evidence copy is incomplete.');
}

console.log(`Wrote Prompt Lab report artifacts:
${rel(path.join(auditDir, 'report-data.json'))}
${rel(path.join(auditDir, 'comparison.md'))}
${rel(path.join(auditDir, 'report.html'))}`);
