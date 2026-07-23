import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  benchmarkCases,
  candidatePool,
  scoreWeights,
} from './flow-content-value-qualified-benchmark-v1-data.mjs';
import {
  BenchmarkValidationError,
  recursiveTruthyQuotaOverride,
  validateArtifactSet,
  validateBenchmark,
  validateCorrectionProtocol,
  validateSeal,
} from './verify-flow-content-value-qualified-benchmark-v1.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/specs/2026-07-22-flow-content-value-qualified-benchmark-v1/benchmark-v1.schema.json'), 'utf8'));
const VERSION = 'flow-content-value-qualified-benchmark-v1';
const ROLES = ['rules', 'low_cost', 'high_capability'];

function envelope(artifactType, body = {}) {
  return { schemaVersion: VERSION, artifactType, ...body };
}

function selectedCandidates() {
  return candidatePool.filter((candidate) => String(candidate.selection).startsWith('selected_'));
}

function rejectedCandidates() {
  return candidatePool.filter((candidate) => !String(candidate.selection).startsWith('selected_'));
}

function makeRun(gold, role) {
  const common = {
    caseId: gold.caseId,
    role,
    split: gold.split,
    reason: gold.class === 'positive' ? 'SourceRows support one bounded execution job.' : 'A required source or review gate failed.',
    gates: structuredClone(gold.gates),
    publicReleaseAllowed: gold.publicReleaseAllowed,
    privateConversionAllowed: gold.privateConversionAllowed,
    minimumInputs: structuredClone(gold.minimumInputs),
    secondaryProjections: structuredClone(gold.secondaryArtifacts),
    projections: {},
  };
  if (gold.class === 'boundary') {
    return {
      ...common,
      flowPossible: false,
      status: gold.status,
      items: [],
      primaryProjection: null,
    };
  }
  return {
    ...common,
    flowPossible: true,
    status: gold.status,
    primaryProjection: gold.primaryArtifact,
    items: gold.sourceRows.map((row, index) => ({
      id: `${gold.caseId}-${role}-I${index + 1}`,
      type: row.kind,
      title: row.title,
      detail: row.detail,
      completion: `SourceRow ${row.id}의 상태를 사용자가 완료로 표시한다.`,
      schedule: null,
      location: null,
      fields: [],
      conditions: [],
      sourceRowRefs: [row.id],
    })),
  };
}

function makeDocuments() {
  const selected = selectedCandidates();
  const boundary = benchmarkCases.filter((entry) => entry.class === 'boundary');
  const evidence = candidatePool.flatMap((candidate) => candidate.evidence);
  const calibrationRuns = benchmarkCases.filter((entry) => entry.split === 'calibration').flatMap((entry) => ROLES.map((role) => makeRun(entry, role)));
  const finalRuns = benchmarkCases.filter((entry) => entry.split === 'final_holdout').flatMap((entry) => ROLES.map((role) => makeRun(entry, role)));
  const hashes = Object.fromEntries(['candidate-pool-v1.json', 'selected-positive-set-v1.json', 'boundary-control-set-v1.json', 'baseline-rules-v1.md', 'baseline-prompt-v1.md'].map((file) => [file, 'a'.repeat(64)]));
  return {
    'candidate-pool-v1.json': envelope('candidate_pool', { candidates: structuredClone(candidatePool) }),
    'value-admission-contract-v1.json': envelope('value_admission_contract', {
      scoreWeights: structuredClone(scoreWeights),
      positiveThreshold: 80,
      hardGates: ['source', 'rights', 'locale', 'safety', 'oneJob', 'naturalArtifact'],
    }),
    'admission-scorecard-v1.json': envelope('admission_scorecard', { scorecards: structuredClone(candidatePool) }),
    'rejected-candidates-v1.json': envelope('rejected_candidates', { candidates: structuredClone(rejectedCandidates()) }),
    'selected-positive-set-v1.json': envelope('selected_positive_set', { positiveSet: structuredClone(selected), quotaOverrideCount: 0 }),
    'boundary-control-set-v1.json': envelope('boundary_control_set', { boundarySet: structuredClone(boundary) }),
    'source-evidence-v1.json': envelope('source_evidence', { evidence: structuredClone(evidence) }),
    'gold-source-contract-v1.json': envelope('gold_source_contract', { cases: structuredClone(benchmarkCases) }),
    'calibration-results-v1.json': envelope('calibration_results', { results: calibrationRuns }),
    'final-holdout-results-v1.json': envelope('final_holdout_results', { results: finalRuns }),
    'model-comparison-v1.json': envelope('model_comparison', { roles: ROLES }),
    'value-and-conversion-metrics-v1.json': envelope('value_and_conversion_metrics', {
      evidenceBoundary: 'Internal automated/agent QA; not observed-user validation.',
      boundaryRecall: 1,
      itemProvenanceRate: 1,
      primaryArtifactMatchRate: 1,
      sourceRowMeaningPreservationRate: 1,
    }),
    'final-adjudication-v1.json': envelope('final_adjudication', {
      adjudications: benchmarkCases.map((entry) => ({
        caseId: entry.caseId,
        decision: entry.class === 'positive' ? 'go' : entry.status,
        reason: 'Test fixture decision.',
      })),
    }),
    'seal-v1.json': envelope('benchmark_seal', { hashes, postHoldoutMutationCount: 0 }),
    'benchmark-v1.schema.json': structuredClone(schema),
  };
}

function validHtml() {
  return `<!doctype html><html><head><style>.slide{min-height:900px}@media(max-width:390px){.slide{min-height:844px}}</style></head><body>${benchmarkCases.map((entry) => `<section id="${entry.caseId}">${entry.caseId}</section>`).join('')}<p>자동·에이전트 QA이며 실사용자 검증이 아님</p>${'x'.repeat(1200)}</body></html>`;
}

function expectFailure(callback, pattern) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof BenchmarkValidationError);
    assert.match(error.message, pattern);
    return true;
  });
}

test('canonical fixture satisfies all cross-file invariants', () => {
  const result = validateArtifactSet(makeDocuments(), { html: validHtml(), verifySealFiles: false });
  assert.deepEqual(result, {
    candidateCount: 40,
    positiveCount: 12,
    boundaryCount: 6,
    runCount: 54,
    evidenceCount: 240,
    quotaOverrideCount: 0,
    postHoldoutMutationCount: 0,
  });
});

test('selection cannot be rescued by quota or a sub-80 score', () => {
  const documents = makeDocuments();
  const selectedId = documents['selected-positive-set-v1.json'].positiveSet[0].candidateId;
  const candidate = documents['candidate-pool-v1.json'].candidates.find((entry) => entry.candidateId === selectedId);
  candidate.scores.visibleDemand.points -= 20;
  candidate.computedTotal -= 20;
  candidate.qualified = false;
  documents['selected-positive-set-v1.json'].quotaOverrideCount = 1;
  expectFailure(() => validateArtifactSet(documents, { html: validHtml(), verifySealFiles: false }), /selected positives must score at least 80|quota overrides are forbidden/);
  assert.deepEqual(recursiveTruthyQuotaOverride(documents).length, 1);
});

test('boundary controls cannot contain fake Items or executable projections', () => {
  const documents = makeDocuments();
  documents['boundary-control-set-v1.json'].boundarySet[0].items = [{ title: 'invented', detail: 'invented', completion: 'invented', sourceRowRefs: ['missing'] }];
  const run = documents['calibration-results-v1.json'].results.find((entry) => entry.caseId === 'BQ-01' && entry.role === 'rules');
  run.items.push({ title: 'invented', detail: 'invented', completion: 'invented', sourceRowRefs: ['missing'] });
  run.projections.calendar = [{ title: 'invented', start: '2026-07-22' }];
  expectFailure(() => validateArtifactSet(documents, { html: validHtml(), verifySealFiles: false }), /boundary entry must not contain generated Items|boundary case generated fake Items/);
});

test('positive Items require valid provenance and calendars require date authority', () => {
  const documents = makeDocuments();
  const run = documents['calibration-results-v1.json'].results.find((entry) => entry.caseId === 'VQ-01' && entry.role === 'rules');
  run.items[0].sourceRowRefs = ['NOT-A-SOURCE-ROW'];
  run.items[0].schedule = { kind: 'invented' };
  run.projections.calendar = [{ title: 'undated event' }];
  expectFailure(() => validateArtifactSet(documents, { html: validHtml(), verifySealFiles: false }), /unknown provenance|schedule without source\/user date authority|calendar\/ICS was generated for a non-calendar case/);
});

test('completion is required but must remain attached to source provenance', () => {
  const documents = makeDocuments();
  const run = documents['final-holdout-results-v1.json'].results.find((entry) => entry.caseId === 'VQ-09' && entry.role === 'low_cost');
  run.items[0].completion = null;
  expectFailure(() => validateArtifactSet(documents, { html: validHtml(), verifySealFiles: false }), /requires an explicit completion contract/);
});

test('every run keeps private conversion and public release as separate decisions', () => {
  const documents = makeDocuments();
  const publicRun = documents['calibration-results-v1.json'].results.find((entry) => entry.caseId === 'VQ-01' && entry.role === 'rules');
  delete publicRun.publicReleaseAllowed;
  const boundaryRun = documents['calibration-results-v1.json'].results.find((entry) => entry.caseId === 'BQ-01' && entry.role === 'low_cost');
  delete boundaryRun.privateConversionAllowed;
  expectFailure(() => validateArtifactSet(documents, { html: validHtml(), verifySealFiles: false }), /public release and private conversion must be separate booleans/);
});

test('seal detects post-holdout mutation count and changed file hashes', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'flowme-vq-seal-'));
  try {
    const filePath = path.join(temporaryDirectory, 'frozen.json');
    fs.writeFileSync(filePath, '{"frozen":true}\n');
    const correct = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    const seal = {
      hashes: [
        { path: filePath, sha256: correct },
        { path: filePath, sha256: correct },
        { path: filePath, sha256: correct },
        { path: filePath, sha256: correct },
        { path: filePath, sha256: correct },
      ],
      postHoldoutMutationCount: 0,
    };
    const errors = [];
    validateSeal(seal, temporaryDirectory, errors);
    assert.deepEqual(errors, []);
    fs.appendFileSync(filePath, 'changed');
    seal.postHoldoutMutationCount = 1;
    validateSeal(seal, temporaryDirectory, errors);
    assert.ok(errors.some((message) => /postHoldoutMutationCount/.test(message)));
    assert.ok(errors.some((message) => /changed after freeze/.test(message)));
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('filesystem validator fails clearly before generation is complete', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'flowme-vq-missing-'));
  try {
    expectFailure(
      () => validateBenchmark({ specDir: temporaryDirectory, htmlPath: path.join(temporaryDirectory, 'missing.html') }),
      /benchmark generation is incomplete; \d+ required output\(s\) are missing/,
    );
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('a corrected holdout requires an archived unscored attempt and fresh scored attempt 2', () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'flowme-vq-correction-'));
  try {
    const roles = ['rules', 'low-cost', 'high-capability'];
    const holdoutCases = benchmarkCases.filter((entry) => entry.split === 'final_holdout').map((entry) => ({ caseId: entry.caseId }));
    const archivePaths = [];
    const activePaths = [];
    for (const role of roles) {
      const archive = path.join(temporaryDirectory, 'runs', 'archive', 'attempt-1', `${role}-final-holdout-v1.json`);
      const active = path.join(temporaryDirectory, 'runs', role, 'final-holdout-v1.json');
      fs.mkdirSync(path.dirname(archive), { recursive: true });
      fs.mkdirSync(path.dirname(active), { recursive: true });
      fs.writeFileSync(archive, `${JSON.stringify({ role, attempt: 1, scored: false, cases: holdoutCases }, null, 2)}\n`);
      const independence = role === 'rules'
        ? 'Deterministic attempt-2 rerun; no gold or other role output was used.'
        : 'Fresh attempt-2 rerun; no prior attempt output was provided.';
      fs.writeFileSync(active, `${JSON.stringify({ role, attempt: 2, scored: true, independence, cases: holdoutCases }, null, 2)}\n`);
      archivePaths.push(path.relative(temporaryDirectory, archive));
      activePaths.push(path.relative(temporaryDirectory, active));
    }
    const correction = {
      affectedCaseIds: ['VQ-11'],
      summary: 'VQ11-R03 was incorrectly bound; deadline is corrected to VQ11-R04.',
      attempt1Scored: false,
      sourceRowsChanged: false,
      blindPacketChanged: false,
      baselineRulesChanged: false,
      admissionOrSplitChanged: false,
      archivePaths,
    };
    fs.writeFileSync(path.join(temporaryDirectory, 'holdout-correction-log-v1.json'), `${JSON.stringify(correction, null, 2)}\n`);
    const seal = {
      unscoredAttemptCount: 1,
      scoredHoldoutAttempt: 2,
      postHoldoutMutationCount: 0,
      resealedAt: '2026-07-22T19:00:00+09:00',
      goldContractHash: 'a'.repeat(64),
      correctionLogHash: 'b'.repeat(64),
      correctionLogPath: 'holdout-correction-log-v1.json',
      unscoredAttemptArchivePaths: archivePaths,
      scoredHoldoutRunPaths: activePaths,
    };
    const errors = [];
    validateCorrectionProtocol(seal, temporaryDirectory, errors);
    assert.deepEqual(errors, []);

    const badPath = path.join(temporaryDirectory, activePaths[0]);
    const bad = JSON.parse(fs.readFileSync(badPath, 'utf8'));
    bad.independence = 'Consulted attempt 1 output before rerun.';
    fs.writeFileSync(badPath, JSON.stringify(bad));
    validateCorrectionProtocol(seal, temporaryDirectory, errors);
    assert.ok(errors.some((message) => /may not consult attempt 1 outputs/.test(message)));
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
