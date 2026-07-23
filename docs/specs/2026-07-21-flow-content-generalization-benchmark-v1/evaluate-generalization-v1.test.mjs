import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateRecords,
  createAdjudicationTemplate,
  evaluateBenchmark,
  validateAdjudicationLedger,
  writeEvaluationOutputs,
} from './evaluate-generalization-v1.mjs';
import {
  calculateSplitHash,
  ContractValidationError,
} from './validate-generalization-v1.mjs';

const clone = (value) => structuredClone(value);
const H = {
  baseline: 'a'.repeat(64),
  revised: 'b'.repeat(64),
  prompt: 'c'.repeat(64),
};
const ROLES = ['rules', 'low_cost', 'high_capability'];
const ARTIFACTS = ['calendar', 'checklist', 'todo', 'sheet', 'memo'];

function isPositiveIndex(index) {
  return index < 8 || (index >= 12 && index < 16);
}

function makeManifest() {
  const cases = Array.from({ length: 18 }, (_, index) => ({
    caseId: `EVAL-${String(index + 1).padStart(2, '0')}`,
    split: index < 12 ? 'calibration' : 'final_holdout',
  }));
  return {
    documentType: 'flow_content_generalization_source_manifest_v1',
    cases,
    sealMetadata: {
      algorithm: 'sha256',
      sealedAt: '2026-07-21T00:00:00.000Z',
      splitHash: calculateSplitHash(cases),
      baselineRulesHash: H.baseline,
      revisedRulesHash: H.revised,
      finalHoldoutRulesHash: H.revised,
    },
  };
}

function goldGates(positive) {
  return {
    access: 'open',
    rights: 'link_only',
    freshness: 'passed',
    locale: 'applicable',
    safety: 'not_required',
    privacy: 'not_required',
    publicExportAllowed: false,
    personalPreviewAllowed: positive,
  };
}

function makeGold(manifest) {
  return {
    documentType: 'flow_content_generalization_gold_source_contract_v1',
    cases: manifest.cases.map((entry, index) => {
      const positive = isPositiveIndex(index);
      const rowId = `${entry.caseId}-R01`;
      return {
        caseId: entry.caseId,
        sourceRows: [{
          sourceRowId: rowId,
          text: positive ? 'Perform the source-defined action.' : 'Promotional metadata only.',
          meaning: positive ? 'One executable action exists.' : 'The executable body was not acquired.',
          goldRole: positive ? 'item' : 'omission',
          requiredForMeaning: true,
        }],
        gold: {
          admissionLabel: positive ? 'positive' : 'boundary',
          flowPossible: positive,
          state: positive ? 'ready' : 'hold',
          sourceCompleteness: positive ? 'complete' : 'metadata_only',
          userJob: positive ? 'Complete the source-defined action.' : 'Do not invent a Flow from metadata.',
          naturalArtifact: positive ? 'todo' : null,
          secondaryArtifacts: [],
          allowedItems: positive ? [{
            itemKey: 'source_action',
            titleIntent: 'Complete the source-defined action',
            sourceRefs: [rowId],
          }] : [],
          forbiddenItems: positive ? [] : ['Any executable Item'],
          minimumInputs: [],
          gates: goldGates(positive),
          reason: positive ? 'The source contains one complete action.' : 'Only metadata is available.',
        },
      };
    }),
  };
}

function projectionSet(primary) {
  return Object.fromEntries(ARTIFACTS.map((artifact) => [artifact, {
    availability: artifact === primary ? 'primary' : (primary === null && artifact === 'todo' ? 'blocked' : 'not_applicable'),
    payload: artifact === primary ? { tasks: [{ title: 'Complete the source-defined action' }] } : null,
    losses: [],
  }]));
}

function makeRun(manifestCase, role, index, splitHash) {
  const positive = isPositiveIndex(index);
  const rowId = `${manifestCase.caseId}-R01`;
  const itemId = `${manifestCase.caseId}-${role}-I01`;
  return {
    schemaVersion: 'flow-content-generalization-run-v1',
    caseId: manifestCase.caseId,
    benchmarkTrace: {
      split: manifestCase.split,
      rulesHash: manifestCase.split === 'final_holdout' ? H.revised : H.baseline,
      promptHash: H.prompt,
      sealedSplitHash: splitHash,
    },
    processor: {
      role,
      modelOrAgent: `synthetic-${role}`,
      actualProviderApiUsed: false,
      measuredInputTokens: null,
      measuredOutputTokens: null,
      elapsedMs: null,
      retryCount: 0,
      humanInterventionCount: 0,
    },
    sourceAssessment: {
      completeness: positive ? 'complete' : 'metadata_only',
      acquiredRowIds: [rowId],
      missingBoundary: positive ? [] : ['Executable body unavailable.'],
      sourceValueSemanticKeys: [],
    },
    feasibility: {
      flowPossible: positive,
      executableAllowed: positive,
      state: positive ? 'ready' : 'hold',
      reason: positive ? 'One complete executable row exists.' : 'Only metadata exists.',
      blockers: positive ? [] : ['source_body_missing'],
    },
    classification: {
      primaryLifeArea: positive ? 'synthetic' : null,
      secondaryLifeAreas: [],
      topicTags: ['fixture'],
      sourceShape: positive ? 'single_action' : null,
      primaryExecutionPattern: positive ? 'one_shot' : null,
      primaryArtifact: positive ? 'todo' : null,
      secondaryArtifacts: [],
    },
    sourceRowAssignments: [{
      sourceRowId: rowId,
      role: positive ? 'item' : 'omission',
      reason: positive ? 'Executable source action.' : 'No executable body was acquired.',
    }],
    canonical: {
      title: positive ? 'Synthetic Flow' : null,
      items: positive ? [{
        itemId,
        intent: 'action',
        title: 'Complete the source-defined action',
        detail: 'Use the acquired SourceRow only.',
        completion: 'The source-defined action is complete.',
        schedule: null,
        location: null,
        fields: [],
        conditions: [],
        sourceRefs: [rowId],
      }] : [],
      fields: [],
      memos: [],
      references: [],
      conditionalResponses: [],
    },
    minimumInputs: [],
    projections: {
      ...projectionSet(positive ? 'todo' : null),
      ics: { eventCount: 0, actionVisible: false },
    },
    gates: goldGates(positive),
    selfReview: {
      uncertainties: [],
      omissions: [],
      potentialInventions: [],
      sourceValueReentryCount: 0,
      unscheduledIcsViolationCount: 0,
    },
  };
}

function completeLedger(template, gold) {
  const goldById = new Map(gold.cases.map((entry) => [entry.caseId, entry]));
  template.adjudicatedAt = '2026-07-21T01:00:00.000Z';
  template.entries.forEach((entry) => {
    const boundary = goldById.get(entry.caseId).gold.admissionLabel === 'boundary';
    entry.reviewStatus = 'reviewed';
    entry.reviewedAt = '2026-07-21T01:00:00.000Z';
    entry.rowJudgments.forEach((row) => {
      row.meaningPreservation = 'preserved';
    });
    entry.itemJudgments.forEach((item) => {
      item.disposition = 'keep';
      item.semanticSupport = 'supported';
    });
    entry.inputJudgments.forEach((input) => {
      input.disposition = 'keep';
      input.sourceValueReentry = false;
    });
    entry.usability = boundary ? 'correct_stop' : 'directly_usable';
  });
  return template;
}

function makePortfolio() {
  const manifest = makeManifest();
  const gold = makeGold(manifest);
  const runs = manifest.cases.flatMap((entry, index) => ROLES.map((role) => (
    makeRun(entry, role, index, manifest.sealMetadata.splitHash)
  )));
  const template = createAdjudicationTemplate({ manifest, gold, runs });
  const adjudication = completeLedger(template, gold);
  return { manifest, gold, runs, adjudication };
}

function expectContractError(operation, expectedCode) {
  assert.throws(operation, (error) => {
    assert.equal(error instanceof ContractValidationError, true, error.stack);
    const codes = (error.errors || []).map((entry) => entry.code).filter(Boolean);
    assert.equal(codes.includes(expectedCode), true, `Expected ${expectedCode}; received ${codes.join(', ')}`);
    return true;
  });
}

test('perfect 18-case / 54-run portfolio produces decisive holdout metrics and five documents', () => {
  const portfolio = makePortfolio();
  const result = evaluateBenchmark({ ...portfolio, evaluatedAt: '2026-07-21T02:00:00.000Z' });
  assert.equal(result.calibrationResults.records.length, 36);
  assert.equal(result.finalHoldoutResults.records.length, 18);
  assert.equal(result.finalHoldoutResults.overall.flowPossibilityAgreement.rate, 1);
  assert.equal(result.finalHoldoutResults.overall.boundaryRecall.rate, 1);
  assert.equal(result.finalHoldoutResults.overall.sourceRowMeaningPreservation.rate, 1);
  assert.equal(result.finalHoldoutResults.overall.primaryArtifactAgreement.positiveRate, 1);
  assert.equal(result.finalHoldoutResults.overall.targets.allPass, true);
  assert.equal(result.benchmarkMetrics.decisiveScope, 'final_holdout');
  assert.equal(result.finalAdjudication.entries.length, 54);
});

test('pending adjudication cannot silently become a zero-invention score', () => {
  const portfolio = makePortfolio();
  portfolio.adjudication.entries[0].reviewStatus = 'pending';
  portfolio.adjudication.entries[0].reviewedAt = null;
  portfolio.adjudication.entries[0].itemJudgments[0].semanticSupport = null;
  expectContractError(() => validateAdjudicationLedger({
    ledger: portfolio.adjudication,
    manifest: portfolio.manifest,
    gold: portfolio.gold,
    runs: portfolio.runs,
  }), 'adjudication_pending');
});

test('adjudication must cover all 54 case-role pairs and every SourceRow', () => {
  const portfolio = makePortfolio();
  portfolio.adjudication.entries.pop();
  expectContractError(() => validateAdjudicationLedger({
    ledger: portfolio.adjudication,
    manifest: portfolio.manifest,
    gold: portfolio.gold,
    runs: portfolio.runs,
  }), 'adjudication_entry_coverage');

  const second = makePortfolio();
  second.adjudication.entries[0].rowJudgments = [];
  expectContractError(() => validateAdjudicationLedger({
    ledger: second.adjudication,
    manifest: second.manifest,
    gold: second.gold,
    runs: second.runs,
  }), 'adjudication_row_coverage');
});

test('adjudicated invention is counted even when run selfReview declares none', () => {
  const portfolio = makePortfolio();
  const judgment = portfolio.adjudication.entries[0].itemJudgments[0];
  judgment.inventionTypes = ['action'];
  judgment.note = 'The cited row does not support the extra action.';
  const result = evaluateBenchmark({ ...portfolio });
  const record = result.calibrationResults.records.find((entry) => entry.caseId === 'EVAL-01' && entry.role === 'rules');
  assert.equal(record.inventions.byType.action, 1);
  assert.equal(record.inventions.adjudicationFoundBeyondEmptySelfReview, true);
  assert.equal(result.calibrationResults.overall.inventions.runsWhereAdjudicationFoundInventionBeyondEmptySelfReview, 1);
  assert.equal(result.calibrationResults.overall.targets.results.find((target) => target.id === 'core_invention_zero').pass, false);
});

test('semantic source-value re-entry comes from explicit input adjudication, not string identity alone', () => {
  const portfolio = makePortfolio();
  const run = portfolio.runs.find((entry) => entry.caseId === 'EVAL-01' && entry.processor.role === 'rules');
  run.minimumInputs.push({
    inputId: 'EVAL-01-source-date-alias',
    owner: 'user',
    semanticKey: 'preferredDay',
    requiredBeforeFirstPreview: true,
    reason: 'Synthetic alias for a value already present in the source.',
    consumerRefs: [run.canonical.items[0].itemId],
  });
  const ledgerEntry = portfolio.adjudication.entries.find((entry) => entry.caseId === 'EVAL-01' && entry.role === 'rules');
  ledgerEntry.inputJudgments.push({
    inputId: 'EVAL-01-source-date-alias',
    disposition: 'delete',
    sourceValueReentry: true,
    note: 'The source already fixes this value despite the different semantic key.',
  });
  const result = evaluateBenchmark({ ...portfolio });
  assert.equal(result.calibrationResults.overall.sourceValueReentry.count, 1);
  assert.equal(result.calibrationResults.overall.targets.results.find((target) => target.id === 'source_value_reentry_zero').pass, false);
});

test('reviewed deletion and major-edit counts use generated Items as denominator', () => {
  const portfolio = makePortfolio();
  const first = portfolio.adjudication.entries.find((entry) => entry.caseId === 'EVAL-13' && entry.role === 'rules').itemJudgments[0];
  first.disposition = 'delete';
  first.note = 'The generated Item should be removed.';
  const second = portfolio.adjudication.entries.find((entry) => entry.caseId === 'EVAL-14' && entry.role === 'rules').itemJudgments[0];
  second.disposition = 'major_edit';
  second.note = 'The generated Item needs a structural rewrite.';
  const result = evaluateBenchmark({ ...portfolio });
  const rules = result.finalHoldoutResults.byRole.rules;
  assert.equal(rules.reviewedItemChanges.generatedItems, 4);
  assert.equal(rules.reviewedItemChanges.deletedItems, 1);
  assert.equal(rules.reviewedItemChanges.majorEditedItems, 1);
  assert.equal(rules.reviewedItemChanges.combinedRate, 0.5);
});

test('boundary recall requires a real stop, not merely a boundary label in gold', () => {
  const portfolio = makePortfolio();
  const run = portfolio.runs.find((entry) => entry.caseId === 'EVAL-17' && entry.processor.role === 'rules');
  const rowId = run.sourceAssessment.acquiredRowIds[0];
  const itemId = 'EVAL-17-rules-invented';
  run.sourceAssessment.completeness = 'complete';
  run.sourceAssessment.missingBoundary = [];
  run.feasibility = { flowPossible: true, executableAllowed: true, state: 'ready', reason: 'Incorrectly promoted.', blockers: [] };
  run.classification = {
    primaryLifeArea: 'synthetic',
    secondaryLifeAreas: [],
    topicTags: ['fixture'],
    sourceShape: 'single_action',
    primaryExecutionPattern: 'one_shot',
    primaryArtifact: 'todo',
    secondaryArtifacts: [],
  };
  run.sourceRowAssignments[0] = { sourceRowId: rowId, role: 'item', reason: 'Incorrect promotion.' };
  run.canonical.title = 'Incorrect Flow';
  run.canonical.items = [{
    itemId,
    intent: 'action',
    title: 'Invented action',
    detail: 'Not available in the source body.',
    completion: 'Invented action is complete.',
    schedule: null,
    location: null,
    fields: [],
    conditions: [],
    sourceRefs: [rowId],
  }];
  run.projections = { ...projectionSet('todo'), ics: { eventCount: 0, actionVisible: false } };
  run.gates.personalPreviewAllowed = true;
  const ledgerEntry = portfolio.adjudication.entries.find((entry) => entry.caseId === 'EVAL-17' && entry.role === 'rules');
  ledgerEntry.itemJudgments = [{
    itemId,
    disposition: 'delete',
    semanticSupport: 'unsupported',
    inventionTypes: ['action'],
    note: 'Only metadata was acquired; the action must not exist.',
  }];
  ledgerEntry.usability = 'not_usable';
  const result = evaluateBenchmark({ ...portfolio });
  assert.equal(result.finalHoldoutResults.byRole.rules.boundaryRecall.rate, 0.5);
  assert.equal(result.finalHoldoutResults.byRole.rules.targets.results.find((target) => target.id === 'boundary_recall_100').pass, false);
});

test('time, tokens, and cost remain null when unmeasured and include only evidenced values when present', () => {
  const portfolio = makePortfolio();
  let result = evaluateBenchmark({ ...portfolio });
  let rules = result.finalHoldoutResults.byRole.rules;
  assert.equal(rules.measurements.elapsedMs.total, null);
  assert.equal(rules.measurements.totalTokens.total, null);
  assert.equal(rules.measurements.actualCost.measuredRunCount, 0);
  assert.deepEqual(rules.measurements.actualCost.byCurrency, []);

  const run = portfolio.runs.find((entry) => entry.caseId === 'EVAL-13' && entry.processor.role === 'rules');
  run.processor.actualProviderApiUsed = true;
  run.processor.elapsedMs = 1250;
  run.processor.measuredInputTokens = 100;
  run.processor.measuredOutputTokens = 50;
  const ledgerEntry = portfolio.adjudication.entries.find((entry) => entry.caseId === 'EVAL-13' && entry.role === 'rules');
  ledgerEntry.actualCost = {
    amount: 0.012,
    currency: 'USD',
    basis: 'provider_billing',
    evidence: 'Synthetic provider billing fixture.',
  };
  result = evaluateBenchmark({ ...portfolio });
  rules = result.finalHoldoutResults.byRole.rules;
  assert.equal(rules.measurements.elapsedMs.measuredRunCount, 1);
  assert.equal(rules.measurements.elapsedMs.total, 1250);
  assert.equal(rules.measurements.totalTokens.total, 150);
  assert.equal(rules.measurements.actualCost.measuredRunCount, 1);
  assert.equal(rules.measurements.actualCost.byCurrency[0].total, 0.012);
});

test('writeEvaluationOutputs emits only the five required derived JSON names', () => {
  const portfolio = makePortfolio();
  const result = evaluateBenchmark({ ...portfolio });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowme-eval-'));
  try {
    const written = writeEvaluationOutputs(result, tempDir);
    assert.equal(written.length, 5);
    assert.deepEqual(fs.readdirSync(tempDir).sort(), [
      'benchmark-metrics-v1.json',
      'calibration-results-v1.json',
      'final-adjudication-v1.json',
      'final-holdout-results-v1.json',
      'model-comparison-v1.json',
    ]);
    const metrics = JSON.parse(fs.readFileSync(path.join(tempDir, 'benchmark-metrics-v1.json'), 'utf8'));
    assert.equal(metrics.decisiveScope, 'final_holdout');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('aggregateRecords returns null rates instead of fabricated zero when denominator is empty', () => {
  const summary = aggregateRecords([], 'empty');
  assert.equal(summary.flowPossibilityAgreement.rate, null);
  assert.equal(summary.boundaryRecall.rate, null);
  assert.equal(summary.measurements.actualCost.measuredRunCount, 0);
});
