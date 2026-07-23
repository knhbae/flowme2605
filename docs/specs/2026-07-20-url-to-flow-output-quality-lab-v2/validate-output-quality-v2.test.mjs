import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  calculateProjectionPayloadRetention,
  ContractValidationError,
  loadContext,
  recomputeReviewMetrics,
  validateComparison,
  validateOutputEnvelope,
  validateRawReviewProvenance,
  validateReviewResults,
  validateRound,
  validateRunDocument,
} from './validate-output-quality-v2.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const clone = (value) => structuredClone(value);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const outputSchema = readJson(path.join(here, 'output-envelope-v2.schema.json'));
const reviewSchema = readJson(path.join(here, 'review-result-v2.schema.json'));
const taxonomy = readJson(path.join(here, '..', '2026-07-20-flowme-taxonomy-v1-1', 'taxonomy-v1.1.json'));
const ready = readJson(path.join(here, 'fixtures', 'valid', 'ready-minimal-v2.json'));
const mutationDoc = readJson(path.join(here, 'fixtures', 'invalid', 'mutations-v2.json'));

test('output and review schemas reuse Taxonomy v1.1 controlled core enums', () => {
  assert.deepEqual(outputSchema.$defs.lifeArea.enum, taxonomy.enums.lifeAreas);
  assert.deepEqual(outputSchema.$defs.sourceShape.enum, taxonomy.enums.sourceShapes);
  assert.deepEqual(outputSchema.$defs.executionPattern.enum, taxonomy.enums.executionPatterns);
  assert.deepEqual(outputSchema.$defs.artifact.enum, taxonomy.enums.artifacts);
  assert.deepEqual(reviewSchema.$defs.lifeArea.enum, taxonomy.enums.lifeAreas);
  assert.deepEqual(reviewSchema.$defs.sourceShape.enum, taxonomy.enums.sourceShapes);
  assert.deepEqual(reviewSchema.$defs.executionPattern.enum, taxonomy.enums.executionPatterns);
  assert.deepEqual(reviewSchema.$defs.artifact.enum, taxonomy.enums.artifacts);
});

function dispositionOf(envelope) {
  return Object.fromEntries(['generationState', 'outcome', 'conversionReadiness', 'executableAllowed', 'publicExportAllowed'].map((key) => [key, envelope.feasibility[key]]));
}

function classificationOf(envelope) {
  const taxonomyValue = envelope.classification.taxonomy;
  return Object.fromEntries(['primaryLifeArea', 'sourceShape', 'primaryExecutionPattern', 'primaryArtifact'].map((key) => [key, taxonomyValue[key]]));
}

function gateDecisionOf(envelope) {
  const classification = envelope.classification;
  return {
    discoveryAccess: classification.access.discoveryAccess,
    rowAccess: classification.access.rowAccess,
    sourceRowStatus: classification.review.sourceRowStatus,
    rightsBasis: classification.rights.basis,
    allowedUse: [...classification.rights.allowedUse],
    freshnessReview: classification.review.freshnessReview,
    localeReview: classification.review.localeReview,
    safetyReview: classification.review.safetyReview,
    privacyReview: classification.review.privacyReview,
    rightsReview: classification.review.rightsReview,
    promotionState: classification.review.promotionState,
    blockers: [...classification.review.blockers],
  };
}

function fixtureContext(envelope = ready, overrides = {}) {
  const manifestCase = {
    caseId: envelope.caseId,
    lane: 'core_positive',
    safetyCase: false,
    ...(overrides.manifestCase || {}),
  };
  const goldCase = {
    caseId: envelope.caseId,
    primarySource: {
      sourceId: envelope.sourceEvidence.primarySource.sourceId,
      url: envelope.sourceEvidence.primarySource.url,
      title: envelope.sourceEvidence.primarySource.title,
      snapshotId: envelope.sourceEvidence.primarySource.snapshot.snapshotId,
      contentHash: envelope.sourceEvidence.primarySource.snapshot.contentHash,
    },
    claimedScope: envelope.sourceEvidence.claimedScope,
    sourceRows: clone(envelope.sourceEvidence.sourceRows),
    landmarks: envelope.sourceEvidence.landmarks.map((entry) => entry.label),
    missingRows: envelope.sourceEvidence.missingRows.map((entry) => entry.label),
    sourceCompleteness: envelope.sourceEvidence.sourceCompleteness,
    expectedDisposition: dispositionOf(envelope),
    expectedClassification: {
      ...classificationOf(envelope),
      access: {
        providerType: envelope.classification.access.providerType,
        discoveryAccess: envelope.classification.access.discoveryAccess,
        rowAccess: envelope.classification.access.rowAccess,
        sourceFormat: envelope.classification.access.sourceFormat.category,
      },
      rights: {
        basis: envelope.classification.rights.basis,
        allowedUse: [...envelope.classification.rights.allowedUse],
        reviewStatus: envelope.classification.rights.reviewStatus,
      },
      review: clone(envelope.classification.review),
    },
    expectedRoleByRow: envelope.sourceEvidence.roleAssignments.map(({ sourceRowId, role }) => ({ sourceRowId, role })),
    forbiddenInferences: [],
    essentialProjectionFields: Object.fromEntries(Object.entries(envelope.projections).map(([target, projection]) => [target, [...projection.essentialFieldsRetained]])),
    ...(overrides.goldCase || {}),
  };
  return { manifestCase, goldCase, schema: outputSchema, taxonomy };
}

function errorCodes(fn) {
  try {
    fn();
    assert.fail('Expected validation failure.');
  } catch (error) {
    assert.equal(error instanceof ContractValidationError, true);
    return (error.errors || []).map((entry) => entry.code).filter(Boolean);
  }
}

test('minimal ready output passes schema, source accounting, provenance and projection gates', () => {
  const result = validateOutputEnvelope(ready, fixtureContext());
  assert.equal(result.caseId, 'FIX-READY-01');
  assert.equal(result.sourceRowCount, 2);
  assert.equal(result.roleAccountingRate, 1);
  assert.equal(result.canonicalItemCount, 1);
  assert.equal(result.dispositionMatch, true);
  assert.equal(result.classificationMatch, true);
  assert.equal(result.gateMatch, true);
  assert.equal(result.goldEnforced, true);
  assert.equal(result.projectionPayloadEvidencePass, true);
  assert.equal(result.projectionPayloadRetention.retentionRate, 1);
});

test('rights hold may preserve an internal canonical draft while every export projection stays blocked', () => {
  const envelope = clone(ready);
  envelope.feasibility.conversionReadiness = 'hold';
  envelope.feasibility.blockers = ['rights_permission_required'];
  envelope.feasibility.publicExportAllowed = false;
  envelope.feasibility.reason = 'Internal review only until source permission is confirmed.';
  envelope.classification.rights = {
    basis: 'link_only_assumption',
    allowedUse: ['link_metadata', 'internal_review'],
    territoryScope: 'unknown',
    territories: [],
    reviewStatus: 'restricted',
    personalTransformAllowed: false,
    publicReleaseAllowed: false,
    rationale: 'The internal source-backed draft is retained, while export remains blocked.',
  };
  envelope.classification.review.conversionReadiness = 'hold';
  envelope.classification.review.rightsReview = 'restricted';
  envelope.classification.review.promotionState = 'internal_review';
  envelope.classification.review.blockers = ['rights_permission_required'];
  envelope.classification.review.editorialAction = 'request_permission';
  for (const projection of Object.values(envelope.projections)) {
    projection.availability = 'blocked';
    projection.payload = null;
    projection.essentialFieldsRetained = [];
    projection.lossManifest = [];
  }
  const context = fixtureContext(envelope, {
    goldCase: {
      essentialProjectionFields: Object.fromEntries(['calendar', 'checklist', 'todo', 'sheet', 'memo'].map((target) => [target, []])),
    },
  });
  assert.equal(validateOutputEnvelope(envelope, context).canonicalItemCount, 1);
});

function mutateFixture(mutationId) {
  const envelope = clone(ready);
  const context = fixtureContext(envelope);
  switch (mutationId) {
    case 'duplicate-role':
      envelope.sourceEvidence.roleAssignments.push(clone(envelope.sourceEvidence.roleAssignments[0]));
      break;
    case 'wrong-role':
      envelope.sourceEvidence.roleAssignments[0].role = 'memo';
      break;
    case 'source-row-content-drift':
      envelope.sourceEvidence.sourceRows[0].detail = 'Drifted source text.';
      break;
    case 'sparse-promoted-ready':
      envelope.sourceEvidence.sourceCompleteness = 'partial';
      envelope.classification.review.sourceRowStatus = 'partial';
      context.goldCase.sourceCompleteness = 'partial';
      break;
    case 'source-import-with-items':
      envelope.feasibility.outcome = 'no_proposal';
      envelope.feasibility.conversionReadiness = 'source_import_required';
      envelope.feasibility.executableAllowed = false;
      envelope.feasibility.publicExportAllowed = false;
      envelope.feasibility.blockers = ['source_import_required'];
      envelope.classification.rights.publicReleaseAllowed = false;
      envelope.classification.review.conversionReadiness = 'source_import_required';
      envelope.classification.review.blockers = ['source_import_required'];
      context.goldCase.expectedDisposition = dispositionOf(envelope);
      break;
    case 'invented-schedule':
      envelope.canonicalDraft.items[0].schedule = {
        value: '2030-01-01',
        sourceRowIds: ['FIX-R01'],
        evidenceQuote: '2030-01-01',
        userInputPath: null,
      };
      break;
    case 'invented-derived-schedule':
      envelope.canonicalDraft.items[0].schedule = {
        value: '2030-01-01',
        sourceRowIds: ['FIX-R02'],
        evidenceQuote: null,
        userInputPath: '$user.appointmentDate',
      };
      break;
    case 'invented-condition':
      envelope.canonicalDraft.conditionalResponses.push({
        conditionalResponseId: 'condition-invented',
        trigger: 'If the office is closed',
        response: 'Return next Monday',
        severity: 'caution',
        sourceRowIds: ['FIX-R01'],
        evidenceQuote: 'office is closed',
      });
      envelope.canonicalDraft.items[0].conditionalResponseIds.push('condition-invented');
      break;
    case 'blocked-projection-payload':
      envelope.projections.todo.availability = 'blocked';
      envelope.projections.todo.payload = { title: 'Unsupported todo' };
      break;
    case 'projection-essential-loss':
      envelope.projections.calendar.essentialFieldsRetained = ['title', 'sourceUrl'];
      break;
    case 'projection-warning-declared-but-missing':
      envelope.projections.checklist.essentialFieldsRetained.push('warning');
      context.goldCase.essentialProjectionFields.checklist.push('warning');
      break;
    case 'invented-projection-date':
      envelope.projections.calendar.payload.date = '2030-01-01';
      delete envelope.projections.calendar.payload.userInputPath;
      break;
    case 'rights-hold-usable-projection':
      envelope.feasibility.conversionReadiness = 'hold';
      envelope.feasibility.blockers = ['rights_permission_required'];
      envelope.feasibility.publicExportAllowed = false;
      envelope.classification.rights.publicReleaseAllowed = false;
      envelope.classification.rights.personalTransformAllowed = false;
      envelope.classification.rights.reviewStatus = 'restricted';
      envelope.classification.rights.basis = 'link_only_assumption';
      envelope.classification.rights.allowedUse = ['link_metadata', 'internal_review'];
      envelope.classification.review.conversionReadiness = 'hold';
      envelope.classification.review.rightsReview = 'restricted';
      envelope.classification.review.blockers = ['rights_permission_required'];
      context.goldCase.expectedDisposition = dispositionOf(envelope);
      break;
    case 'public-rights-bypass':
      envelope.classification.rights.reviewStatus = 'restricted';
      envelope.classification.review.rightsReview = 'restricted';
      break;
    case 'unknown-source-reference':
      envelope.canonicalDraft.items[0].sourceRowIds = ['FIX-MISSING'];
      break;
    case 'duplicate-step-membership':
      envelope.canonicalDraft.steps.push({
        stepId: 'step-fixture-duplicate',
        flowId: 'flow-fixture-ready',
        title: 'Duplicate membership',
        order: 1,
        itemIds: ['item-fixture-ready'],
        sourceRowIds: ['FIX-R01'],
      });
      envelope.canonicalDraft.flow.stepIds.push('step-fixture-duplicate');
      break;
    case 'forbidden-inference':
      envelope.projections.calendar.payload.note = 'invented vendor';
      context.goldCase.forbiddenInferences = [{ kind: 'fact', needle: 'invented vendor', reason: 'Fixture mutation' }];
      break;
    default:
      throw new Error(`Unknown mutation ${mutationId}`);
  }
  return { envelope, context };
}

for (const fixture of mutationDoc.mutations) {
  test(`invalid mutation ${fixture.mutationId} is rejected with ${fixture.expectedCode}`, () => {
    const { envelope, context } = mutateFixture(fixture.mutationId);
    const codes = errorCodes(() => validateOutputEnvelope(envelope, context));
    assert.equal(codes.includes(fixture.expectedCode), true, `codes: ${codes.join(', ')}`);
  });
}

function makeReviewDocument(roundIds = ['round-1', 'round-2']) {
  const classification = classificationOf(ready);
  const disposition = dispositionOf(ready);
  const gateDecision = gateDecisionOf(ready);
  const makeReview = (roundId, lane) => ({
    reviewId: `${roundId}-${lane}-FIX-READY-01`,
    caseId: 'FIX-READY-01',
    reviewerLane: lane,
    independent: lane !== 'rules_first',
    evidenceKind: lane === 'rules_first' ? 'deterministic_qa' : 'independent_agent_review',
    classification: clone(classification),
    disposition: clone(disposition),
    gateDecision: clone(gateDecision),
    sourceRoleAccountingPass: true,
    unsupportedInferenceCount: 0,
    essentialProjectionRetentionRate: 1,
    checkableItems: 1,
    nonCheckableItems: 0,
    blockingDisagreement: false,
    disagreementReasons: [],
    notes: 'Fixture review.',
  });
  const makeAdjudication = () => ({
    caseId: 'FIX-READY-01',
    finalClassification: clone(classification),
    finalDisposition: clone(disposition),
    finalGateDecision: clone(gateDecision),
    checkableItems: 1,
    nonCheckableItems: 0,
    unsupportedInferenceCount: 0,
    essentialFieldChecks: { expected: 5, retained: 5 },
    itemsGenerated: 1,
    itemsKept: 1,
    editLevel: 'none',
    correctionMinutes: 1,
    correctionTimeEvidence: {
      kind: 'measured_independent_agent_review',
      startedAt: '2026-07-20T00:00:00.000Z',
      endedAt: '2026-07-20T00:01:00.000Z',
      elapsedSeconds: 60,
      reviewerId: 'fixture-independent-correction-reviewer',
      measurementMethod: 'stopwatch',
    },
    controlRegression: false,
    blockingDisagreement: false,
    unresolvedDisagreements: [],
    notes: 'Fixture adjudication.',
  });
  return {
    documentType: 'flowme_output_quality_review_results',
    schemaVersion: 'flowme-output-quality-review-results-v2',
    date: '2026-07-20',
    caseSetVersion: 'fixture-case-set-v2',
    goldContractVersion: 'fixture-gold-v2',
    claimBoundary: 'Automated and independent-agent QA, not observed-user validation.',
    rounds: roundIds.map((roundId) => ({
      roundId,
      reviewerLanes: ['rules_first', 'low_cost_independent', 'high_capability_independent'],
      reviews: ['rules_first', 'low_cost_independent', 'high_capability_independent'].map((lane) => makeReview(roundId, lane)),
      adjudications: [makeAdjudication()],
    })),
  };
}

function reviewContext() {
  const fullGoldCase = fixtureContext().goldCase;
  const manifest = {
    documentType: 'flowme_output_quality_case_manifest',
    caseSetVersion: 'fixture-case-set-v2',
    cases: [{ caseId: 'FIX-READY-01', lane: 'core_positive', safetyCase: false }],
  };
  const gold = {
    documentType: 'flowme_output_quality_gold_source_contract',
    contractVersion: 'fixture-gold-v2',
    caseSetVersion: 'fixture-case-set-v2',
    cases: [fullGoldCase],
  };
  return { manifest, gold, reviewSchema, outputSchema, taxonomy };
}

test('review metrics are recomputed from raw three-lane reviews and adjudications', () => {
  const document = makeReviewDocument();
  const metrics = validateReviewResults(document, reviewContext());
  assert.equal(metrics.length, 2);
  assert.equal(metrics[1].threeWayExactMatchRate, 1);
  assert.equal(metrics[1].threeWayGateExactMatchRate, 1);
  assert.equal(metrics[1].coreTaxonomyGoldMatchRate, 1);
  assert.equal(metrics[1].gateGoldMatchRate, 1);
  assert.equal(metrics[1].essentialProjectionRetentionRate, 1);
  assert.equal(metrics[1].medianItemKeepRate, 1);
  assert.equal(metrics[1].measuredCorrectionCount, 1);
  assert.equal(metrics[1].measuredCoreCorrectionCount, 1);
  assert.equal(metrics[1].medianCorrectionMinutes, 1);
});

test('review contract permits one bounded round-4 stability batch and rejects round-5', () => {
  const context = reviewContext();
  const fourRounds = makeReviewDocument(['round-1', 'round-2', 'round-3', 'round-4']);
  assert.equal(validateReviewResults(fourRounds, context).length, 4);
  const fiveRounds = makeReviewDocument(['round-1', 'round-2', 'round-3', 'round-4', 'round-5']);
  assert.throws(() => validateReviewResults(fiveRounds, context), ContractValidationError);
});

test('measured correction time must reconcile timestamps, elapsed seconds and minutes', () => {
  const document = makeReviewDocument();
  document.rounds[0].adjudications[0].correctionTimeEvidence.elapsedSeconds = 30;
  const codes = errorCodes(() => validateReviewResults(document, reviewContext()));
  assert.equal(codes.includes('correction_measurement_elapsed_mismatch'), true, `codes: ${codes.join(', ')}`);
  assert.equal(codes.includes('correction_measurement_minutes_mismatch'), true, `codes: ${codes.join(', ')}`);
});

test('estimate-only and unavailable correction times are excluded from measured metrics', () => {
  const document = makeReviewDocument();
  const first = document.rounds[0].adjudications[0];
  first.correctionMinutes = 9;
  first.correctionTimeEvidence = {
    kind: 'estimate_only',
    startedAt: null,
    endedAt: null,
    elapsedSeconds: null,
    reviewerId: 'fixture-estimator',
    measurementMethod: 'editorial_estimate',
  };
  const second = document.rounds[1].adjudications[0];
  second.correctionMinutes = null;
  second.correctionTimeEvidence = {
    kind: 'not_available',
    startedAt: null,
    endedAt: null,
    elapsedSeconds: null,
    reviewerId: null,
    measurementMethod: null,
  };
  const metrics = validateReviewResults(document, reviewContext());
  for (const entry of metrics) {
    assert.equal(entry.measuredCorrectionCount, 0);
    assert.equal(entry.measuredCoreCorrectionCount, 0);
    assert.equal(entry.medianCorrectionMinutes, null);
    assert.equal(entry.p75CorrectionMinutes, null);
  }
});

test('comparison cannot publish metrics that differ from raw recomputation', () => {
  const document = makeReviewDocument();
  const context = reviewContext();
  const metrics = recomputeReviewMetrics(document, context.manifest, context.gold);
  const comparison = {
    documentType: 'flowme_output_quality_comparison',
    schemaVersion: 'flowme-output-quality-comparison-v2',
    caseSetVersion: context.manifest.caseSetVersion,
    goldContractVersion: context.gold.contractVersion,
    validationBoundary: 'Independent-agent comparison, not observed-user validation.',
    rounds: metrics.map((entry) => ({ roundId: entry.roundId, metrics: clone(entry) })),
    finalMetrics: clone(metrics.at(-1)),
  };
  assert.equal(validateComparison(comparison, metrics, context), true);
  comparison.finalMetrics.threeWayExactMatchRate = 0.5;
  assert.throws(() => validateComparison(comparison, metrics, context), ContractValidationError);
});

test('review rows reconcile to rules output and both blind independent decision sets', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'flowme-review-provenance-v2-'));
  try {
    const context = reviewContext();
    const reviewDocument = makeReviewDocument();
    const runFiles = [];
    const decisionFiles = [];
    const decisionClassification = {
      ...classificationOf(ready),
      access: clone(ready.classification.access),
      rights: clone(ready.classification.rights),
      review: clone(ready.classification.review),
    };
    for (const roundId of ['round-1', 'round-2']) {
      const runFile = path.join(temporary, `${roundId}-rules.json`);
      fs.writeFileSync(runFile, JSON.stringify({ roundId, outputs: [ready] }));
      runFiles.push(runFile);
      for (const profile of ['low_cost_agent', 'high_capability_agent']) {
        const decisionFile = path.join(temporary, `${roundId}-${profile}.json`);
        fs.writeFileSync(decisionFile, JSON.stringify({
          documentType: 'flowme-independent-decision-set',
          decisionSetVersion: 'independent-decision-v2',
          roundId,
          profile,
          caseSetVersion: context.manifest.caseSetVersion,
          blind: true,
          modelEvidence: { actualApiCostMeasured: false },
          decisions: [{
            caseId: ready.caseId,
            feasibility: clone(ready.feasibility),
            classification: clone(decisionClassification),
            roles: clone(ready.sourceEvidence.roleAssignments),
          }],
        }));
        decisionFiles.push(decisionFile);
      }
    }
    context.runFiles = runFiles;
    context.decisionFiles = decisionFiles;
    assert.equal(validateRawReviewProvenance(reviewDocument, context), true);
    reviewDocument.rounds[0].reviews.find((entry) => entry.reviewerLane === 'low_cost_independent').classification.primaryArtifact = 'memo';
    assert.throws(() => validateRawReviewProvenance(reviewDocument, context), ContractValidationError);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test('run and round validators require one exact case set with evidence-neutral cost lanes', () => {
  const context = reviewContext();
  const run = {
    runSchemaVersion: 'flowme-url-to-flow-output-run-v2',
    runId: 'fixture-round-1',
    roundId: 'round-1',
    caseSetVersion: context.manifest.caseSetVersion,
    goldContractVersion: context.gold.contractVersion,
    outputSchemaVersion: 'flowme-url-to-flow-output-envelope-v2',
    taxonomyVersion: taxonomy.schemaVersion,
    promptVersion: 'fixture-prompt-v2',
    generator: { evidenceKind: 'rules_first', provider: null, model: null },
    timing: { evidenceKind: 'not_available', totalMs: null },
    usage: { evidenceKind: 'not_available', inputTokens: null, outputTokens: null },
    cost: { evidenceKind: 'not_available', currency: null, amount: null },
    outputs: [ready],
  };
  assert.equal(validateRunDocument(run, context, { requireFullCaseSet: true }).outputResults.length, 1);
  assert.equal(validateRound([{ file: 'fixture-run.json', run }], context, 'round-1').outputCount, 1);
  const stabilityRun = {
    ...clone(run),
    runId: 'round-4-fixture-stability',
    roundId: 'round-4',
    promptVersion: 'output-quality-prompt-v2.3-stability',
  };
  assert.equal(validateRunDocument(stabilityRun, context, { requireFullCaseSet: true }).outputResults.length, 1);
  const invalidRound = { ...clone(stabilityRun), runId: 'round-5-fixture', roundId: 'round-5' };
  const invalidRoundCodes = errorCodes(() => validateRunDocument(invalidRound, context, { requireFullCaseSet: true }));
  assert.equal(invalidRoundCodes.includes('round_id'), true, `codes: ${invalidRoundCodes.join(', ')}`);
  run.outputs.push(clone(ready));
  assert.throws(() => validateRound([{ file: 'fixture-run.json', run }], context, 'round-1'), ContractValidationError);
});

test('payload retention helper diagnoses historical rounds and round 3/4 hard-fail declared warning without payload evidence', () => {
  const { envelope, context: fixture } = mutateFixture('projection-warning-declared-but-missing');
  const context = {
    manifest: { caseSetVersion: 'fixture-case-set-v2', cases: [fixture.manifestCase] },
    gold: { contractVersion: 'fixture-gold-v2', cases: [fixture.goldCase] },
    outputSchema: fixture.schema,
    taxonomy: fixture.taxonomy,
  };
  const retention = calculateProjectionPayloadRetention(envelope, fixture.goldCase);
  assert.equal(retention.pass, false);
  assert.deepEqual(retention.byProjection.checklist.missingFields, ['warning']);
  const makeRun = (roundId) => ({
    runSchemaVersion: 'flowme-url-to-flow-output-run-v2',
    runId: `${roundId}-fixture-retention`,
    roundId,
    caseSetVersion: context.manifest.caseSetVersion,
    goldContractVersion: context.gold.contractVersion,
    outputSchemaVersion: 'flowme-url-to-flow-output-envelope-v2',
    taxonomyVersion: taxonomy.schemaVersion,
    promptVersion: 'fixture-prompt-v2',
    generator: { evidenceKind: 'rules_first', provider: null, model: null },
    timing: { evidenceKind: 'not_available', totalMs: null },
    usage: { evidenceKind: 'not_available', inputTokens: null, outputTokens: null },
    cost: { evidenceKind: 'not_available', currency: null, amount: null },
    outputs: [clone(envelope)],
  });
  const historical = validateRunDocument(makeRun('round-2'), context, { requireFullCaseSet: true });
  assert.equal(historical.outputResults[0].projectionPayloadEvidencePass, false);
  for (const roundId of ['round-3', 'round-4']) {
    const codes = errorCodes(() => validateRunDocument(makeRun(roundId), context, { requireFullCaseSet: true }));
    assert.equal(codes.includes('round_id'), false, `codes: ${codes.join(', ')}`);
    assert.equal(codes.includes('projection_payload_evidence_loss'), true, `codes: ${codes.join(', ')}`);
  }
});

test('round-1 baseline preserves gold disagreement as metrics while adjudicated rounds enforce gold', () => {
  const context = reviewContext();
  const baselineOutput = clone(ready);
  baselineOutput.classification.taxonomy.primaryLifeArea = 'home_living';
  const run = {
    runSchemaVersion: 'flowme-url-to-flow-output-run-v2',
    runId: 'fixture-unadjudicated-baseline',
    roundId: 'round-1',
    caseSetVersion: context.manifest.caseSetVersion,
    goldContractVersion: context.gold.contractVersion,
    outputSchemaVersion: 'flowme-url-to-flow-output-envelope-v2',
    taxonomyVersion: taxonomy.schemaVersion,
    promptVersion: 'fixture-prompt-v2',
    generator: { evidenceKind: 'unadjudicated_baseline', provider: null, model: null },
    timing: { evidenceKind: 'not_available', totalMs: null },
    usage: { evidenceKind: 'not_available', inputTokens: null, outputTokens: null },
    cost: { evidenceKind: 'not_available', currency: null, amount: null },
    outputs: [baselineOutput],
  };
  const baseline = validateRunDocument(run, context, { requireFullCaseSet: true });
  assert.equal(baseline.outputResults[0].classificationMatch, false);
  assert.equal(baseline.outputResults[0].goldEnforced, false);
  run.roundId = 'round-2';
  run.runId = 'fixture-adjudicated-round-2';
  run.generator.evidenceKind = 'rules_first';
  const codes = errorCodes(() => validateRunDocument(run, context, { requireFullCaseSet: true }));
  assert.equal(codes.includes('classification_gold_mismatch'), true);
});

test('missing generated artifacts fail with explicit missing_artifact evidence', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'flowme-output-quality-v2-'));
  try {
    const codes = errorCodes(() => loadContext(temporary, { requireGenerated: true }));
    assert.equal(codes.includes('missing_artifact'), true);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
