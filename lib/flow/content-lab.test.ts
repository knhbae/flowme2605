import assert from 'node:assert/strict';
import test from 'node:test';
import {
  convertedPilotSlugs,
  expansionCreatorLabs,
  getContentLabSummary,
  pilotCreatorLabs,
  scoreCandidate,
} from './content-lab';
import {
  getRepresentativeReadinessReview,
  summarizeRepresentativeReadinessReviews,
} from './representative-readiness-review';
import {
  getExportFirstSimulationReview,
  summarizeExportFirstSimulationReviews,
} from './export-first-simulation-review';
import {
  getRiskBoundaryQaReview,
  summarizeRiskBoundaryQaReviews,
} from './risk-boundary-qa';
import {
  getUxContentSimplificationAudit,
  summarizeUxContentSimplificationAudits,
} from './ux-content-simplification-audit';
import {
  generateObservedSessionRunSheetFilename,
  generateObservedSessionRunSheetMarkdown,
  generateObservedSessionNoteFilename,
  generateObservedSessionNoteMarkdown,
  observedSessionNoteDecisionOptions,
} from './observed-session-note-intake';
import { seedBundles } from './seed-flows';

const expectedConvertedPilotSlugs = [
  'samsung-aircon-seasonal-check',
  'samsung-washer-filter-cleaning',
  'vehicle-inspection-prep',
  'driver-license-renewal-check',
  'home-workout-20min',
  'running-5k-4week',
  'qnet-exam-application-prep',
  'computer-skills-d30-study',
  'diet-meal-exercise-log',
  'diet-reset-2week',
] as const;

type Equal<Actual, Expected> =
  (<Value>() => Value extends Actual ? 1 : 2) extends <Value>() => Value extends Expected ? 1 : 2
    ? true
    : false;

const convertedPilotSlugsTypeCheck: Equal<typeof convertedPilotSlugs, typeof expectedConvertedPilotSlugs> = true;
void convertedPilotSlugsTypeCheck;

test('pilot content lab maps 3 creators to 12 existing working flows', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(pilotCreatorLabs.length, 3);
  assert.equal(summary.pilotCreatorCount, 3);
  assert.equal(summary.pilotFlowCount, 12);
  assert.equal(summary.missingPilotFlowSlugs.length, 0);
  assert.ok(pilotCreatorLabs.every((creator) => creator.creatorUrl.startsWith('https://')));
  assert.ok(pilotCreatorLabs.every((creator) => creator.sources.length === 4));
  assert.ok(
    pilotCreatorLabs.every((creator) =>
      creator.sources.every((source) => source.sourceUrl.startsWith('https://')),
    ),
  );
});

test('scale content lab covers 10 creators and 200 flow candidates', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(expansionCreatorLabs.length, 10);
  assert.equal(summary.expansionCreatorCount, 10);
  assert.equal(summary.expansionCandidateCount, 200);
  assert.ok(summary.previewGeneratedFlowCount >= 200);
  assert.deepEqual(summary.structureCoverage.sort(), ['checklist', 'phase', 'routine', 'timeline']);
  assert.ok(summary.categoryCoverage.includes('가전관리'));
  assert.ok(summary.categoryCoverage.includes('자동차'));
  assert.ok(summary.categoryCoverage.includes('자격증/시험'));
  assert.ok(summary.categoryCoverage.includes('다이어트'));
  assert.ok(expansionCreatorLabs.every((creator) => creator.creatorUrl.startsWith('https://')));
  assert.ok(
    expansionCreatorLabs.every((creator) =>
      creator.candidates.every((candidate) => candidate.sourceUrl.startsWith('https://')),
    ),
  );
});

test('content lab separates real source batch from preview generated flows', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.ok(summary.realSourceFlowCount >= 20);
  assert.ok(summary.previewGeneratedFlowCount >= 200);
});

test('candidate scoring rewards executable and externally portable content', () => {
  const candidate = expansionCreatorLabs[0].candidates[0];
  const score = scoreCandidate(candidate);

  assert.ok(score >= 80);
  assert.ok(candidate.externalTargets.includes('calendar'));
  assert.ok(candidate.externalTargets.includes('todo'));
  assert.ok(candidate.externalTargets.includes('notion'));
});

test('converted pilot lab exposes 10 real-source flows for B validation', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.deepEqual(convertedPilotSlugs, expectedConvertedPilotSlugs);
  assert.equal(summary.convertedPilotFlowCount, 10);
  assert.deepEqual(summary.convertedPilotCategories.sort(), [
    '가전관리',
    '다이어트/기록',
    '운동/루틴',
    '자동차/검사',
    '자격증/시험',
  ].sort());
  assert.equal(summary.missingConvertedPilotSlugs.length, 0);
});

test('content lab exposes source-fit audit summary for representative cleanup', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.sourceFitAuditedCount, 71);
  assert.ok(summary.sourceFitAverageScore >= 70);
  assert.equal(summary.sourceFitDecisionCounts.keep_representative, 15);
  assert.equal(summary.sourceFitDecisionCounts.reshape_before_featured, 52);
  assert.equal(summary.sourceFitDecisionCounts.catalog_preview_only, 4);
});

test('content lab exposes full content inventory coverage', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.inventoryTotalCount, seedBundles.length);
  assert.equal(summary.realSourceInventoryReviewedCount, summary.realSourceFlowCount);
  assert.equal(summary.manualSourceFitAuditedCount, 71);
  assert.equal(summary.derivedRealSourceReviewedCount, 0);
  assert.equal(
    summary.sourceBackedInventoryReviewedCount,
    summary.manualSourceFitAuditedCount + summary.derivedRealSourceReviewedCount + summary.sourceNeedsReviewInventoryCount,
  );
  assert.equal(summary.previewCandidateFlowCount, summary.previewGeneratedFlowCount);
  assert.ok(summary.inventoryPublicHandlingCounts.preview_candidate >= 440);
  assert.equal(summary.sourceNeedsReviewInventoryCount, 0);
  assert.equal(summary.legacyAccessibleFlowCount, 0);
});

test('content lab exposes natural artifact audit coverage for real-source flows', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.naturalArtifactRealSourceAuditedCount, 40);
  assert.equal(summary.naturalArtifactRealSourceRemainingCount, 0);
  assert.ok(summary.naturalArtifactDecisionCounts.promote_to_manual_source_fit >= 1);
  assert.ok(summary.naturalArtifactDecisionCounts.reshape_content_or_ux >= 1);
  assert.ok(summary.naturalArtifactCategoryCounts['가전관리'] >= 2);
  assert.ok(summary.naturalArtifactCategoryCounts['운동/홈트'] >= 15);
  assert.ok(summary.naturalArtifactCategoryCounts['다이어트/기록'] >= 9);
  assert.ok(summary.naturalArtifactCategoryCounts['생활행정'] >= 2);
  assert.ok(summary.naturalArtifactCategoryCounts['육아/돌봄'] >= 2);
  assert.ok(summary.naturalArtifactCategoryCounts['반려동물'] >= 2);
  assert.ok(summary.naturalArtifactCategoryCounts['이사/주거'] >= 2);
});

test('content lab exposes lifecycle buckets for keep, fix, preview, and removal review', () => {
  const summary = getContentLabSummary(seedBundles);
  const countSum = Object.values(summary.lifecycleBucketCounts).reduce((sum, count) => sum + count, 0);

  assert.equal(summary.lifecycleTotalCount, seedBundles.length);
  assert.equal(countSum, seedBundles.length);
  assert.equal(summary.lifecycleBucketCounts.keep, 15);
  assert.equal(summary.lifecycleBucketCounts.hide, 1);
  assert.equal(summary.lifecycleBucketCounts.preview_only, summary.previewGeneratedFlowCount);
  assert.equal(summary.lifecycleBucketCounts.remove_candidate, 0);
  assert.equal(summary.lifecycleBucketCounts.fix, 55);
  assert.deepEqual(summary.lifecycleHideSlugs, ['real-fitvely-weekly-body-check']);
  assert.ok(summary.lifecycleFixSlugs.includes('real-sinagong-computer-d30-study'));
  assert.ok(summary.lifecycleFixSlugs.includes('driver-license-renewal-check'));
});

test('content lab clears source needs-review priorities after the next audit batch', () => {
  const summary = getContentLabSummary(seedBundles);
  const countSum = Object.values(summary.sourceReviewPriorityCounts).reduce((sum, count) => sum + count, 0);

  assert.equal(summary.sourceReviewPriorityTotalCount, 0);
  assert.equal(countSum, 0);
  assert.equal(summary.sourceReviewPriorityCounts.audit_now, 0);
  assert.equal(summary.sourceReviewPriorityCounts.source_replacement, 0);
  assert.equal(summary.sourceReviewPriorityCounts.risk_review, 0);
  assert.equal(summary.sourceReviewPriorityItems.length, 0);
});

test('content lab exposes broad real-source guardrails', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.deepEqual(summary.broadRealSourceSlugs, []);
  assert.equal(summary.broadRealSourceCount, 0);
  assert.deepEqual(summary.broadRealSourceHiddenSlugs, ['real-fitvely-weekly-body-check']);
  assert.deepEqual(summary.broadRealSourceRepresentativeLeakSlugs, []);
});

test('source-risk representative review keeps only the final QA route promoted', () => {
  const summary = getContentLabSummary(seedBundles);
  const readiness = summarizeRepresentativeReadinessReviews(seedBundles);

  assert.equal(summary.representativeReadinessTotalCount, 3);
  assert.equal(summary.representativeReadinessDecisionCounts.representative_candidate, 1);
  assert.equal(summary.representativeReadinessDecisionCounts.public_mvp_candidate, 2);
  assert.equal(summary.representativeReadinessDecisionCounts.keep_fix, 0);
  assert.deepEqual(summary.representativeReadinessSlugs, [
    'computer-skills-d30-study',
    'new-car-delivery-check',
    'diet-habit-2week',
  ]);

  assert.deepEqual(readiness.decisionCounts, summary.representativeReadinessDecisionCounts);
  assert.equal(getRepresentativeReadinessReview('computer-skills-d30-study')?.decision, 'representative_candidate');
  assert.equal(getRepresentativeReadinessReview('new-car-delivery-check')?.decision, 'public_mvp_candidate');
  assert.equal(getRepresentativeReadinessReview('diet-habit-2week')?.decision, 'public_mvp_candidate');

  assert.equal(summary.lifecycleKeepSlugs.includes('computer-skills-d30-study'), true);
  assert.equal(summary.lifecycleFixSlugs.includes('new-car-delivery-check'), true);
  assert.equal(summary.lifecycleFixSlugs.includes('diet-habit-2week'), true);
});

test('export-first simulation review records user artifacts and UX gaps for the first three candidates', () => {
  const summary = getContentLabSummary(seedBundles);
  const simulation = summarizeExportFirstSimulationReviews(seedBundles);

  assert.equal(summary.exportFirstSimulationTotalCount, 3);
  assert.equal(summary.exportFirstSimulationDecisionCounts.ready_for_final_promotion_qa, 1);
  assert.equal(summary.exportFirstSimulationDecisionCounts.public_mvp_after_ux_fix, 2);
  assert.equal(summary.exportFirstSimulationDecisionCounts.keep_fix, 0);
  assert.deepEqual(summary.exportFirstSimulationSlugs, [
    'computer-skills-d30-study',
    'new-car-delivery-check',
    'diet-habit-2week',
  ]);
  assert.deepEqual(simulation.decisionCounts, summary.exportFirstSimulationDecisionCounts);

  const computer = getExportFirstSimulationReview('computer-skills-d30-study');
  assert.ok(computer);
  assert.equal(computer.externalTool, 'calendar + sheet');
  assert.equal(computer.firstAction, 'Enter exam date and create a D-30 calendar plus score log.');
  assert.ok(computer.simulatedInputs.includes('examDate=2026-06-22'));
  assert.ok(computer.artifactRows.some((row) => row.includes('mockScore=68')));
  assert.ok(computer.uxGaps.some((gap) => gap.includes('export preview')));

  const newCar = getExportFirstSimulationReview('new-car-delivery-check');
  assert.ok(newCar);
  assert.equal(newCar.externalTool, 'sheet + memo');
  assert.ok(newCar.artifactRows.some((row) => row.includes('dealerConfirmed=hold delivery until written confirmation')));
  assert.ok(newCar.riskBoundary.includes('does not decide whether the user should sign'));

  const diet = getExportFirstSimulationReview('diet-habit-2week');
  assert.ok(diet);
  assert.equal(diet.externalTool, 'sheet');
  assert.ok(diet.artifactRows.some((row) => row.includes('stopCondition=consult professional if dizziness repeats')));
  assert.ok(diet.riskBoundary.includes('observation log'));
});

test('risk-boundary QA records public MVP fixes without representative promotion', () => {
  const summary = getContentLabSummary(seedBundles);
  const qa = summarizeRiskBoundaryQaReviews(seedBundles);

  assert.equal(summary.riskBoundaryQaTotalCount, 2);
  assert.equal(summary.riskBoundaryQaDecisionCounts.public_mvp_after_risk_qa, 2);
  assert.deepEqual(summary.riskBoundaryQaSlugs, ['new-car-delivery-check', 'diet-habit-2week']);
  assert.deepEqual(qa.decisionCounts, summary.riskBoundaryQaDecisionCounts);

  const newCar = getRiskBoundaryQaReview('new-car-delivery-check');
  assert.ok(newCar);
  assert.equal(newCar.primaryArtifact, 'evidence_sheet_plus_memo');
  assert.ok(newCar.naturalArtifactRows.some((row) => row.includes('dealer confirmation')));
  assert.ok(newCar.currentUxGap.includes('photo filename'));
  assert.ok(newCar.contentUxFix.includes('handover boundary memo'));
  assert.ok(newCar.riskBoundary.includes('does not decide whether to sign'));

  const diet = getRiskBoundaryQaReview('diet-habit-2week');
  assert.ok(diet);
  assert.equal(diet.primaryArtifact, 'observation_sheet');
  assert.ok(diet.naturalArtifactRows.some((row) => row.includes('dizziness')));
  assert.ok(diet.currentUxGap.includes('warning'));
  assert.ok(diet.contentUxFix.includes('observation-first'));
  assert.ok(diet.riskBoundary.includes('does not prescribe'));

  assert.equal(summary.lifecycleFixSlugs.includes('new-car-delivery-check'), true);
  assert.equal(summary.lifecycleFixSlugs.includes('diet-habit-2week'), true);
  assert.equal(summary.lifecycleKeepSlugs.includes('new-car-delivery-check'), false);
  assert.equal(summary.lifecycleKeepSlugs.includes('diet-habit-2week'), false);
});

test('UX content simplification audit records representative export-first gaps', () => {
  const summary = getContentLabSummary(seedBundles);
  const audit = summarizeUxContentSimplificationAudits(seedBundles);

  assert.equal(summary.uxContentSimplificationTotalCount, 7);
  assert.equal(summary.uxContentSimplificationDecisionCounts.keep_simple, 3);
  assert.equal(summary.uxContentSimplificationDecisionCounts.simplify_first_screen, 2);
  assert.equal(summary.uxContentSimplificationDecisionCounts.public_mvp_with_guardrails, 2);
  assert.deepEqual(summary.uxContentSimplificationSlugs, [
    'moving-d30-basic',
    'baby-food-menu-recipe',
    'passport-renewal-docs',
    'used-car-buying-check',
    'computer-skills-d30-study',
    'new-car-delivery-check',
    'diet-habit-2week',
  ]);
  assert.deepEqual(audit.decisionCounts, summary.uxContentSimplificationDecisionCounts);

  const moving = getUxContentSimplificationAudit('moving-d30-basic');
  assert.ok(moving);
  assert.equal(moving.primaryDestination, 'hybrid');
  assert.ok(moving.naturalArtifactSimulation.some((row) => row.includes('moveDate=2026-06-27')));
  assert.ok(moving.firstScreenFinding.includes('calendar and checklist'));

  const baby = getUxContentSimplificationAudit('baby-food-menu-recipe');
  assert.ok(baby);
  assert.equal(baby.decision, 'simplify_first_screen');
  assert.ok(baby.moveBelowFold.some((item) => item.includes('recipe details')));
  assert.ok(baby.riskBoundary.includes('allergy'));

  const passport = getUxContentSimplificationAudit('passport-renewal-docs');
  assert.ok(passport);
  assert.equal(passport.decision, 'keep_simple');
  assert.ok(passport.copyFix.includes('submission requirement memo'));

  const usedCar = getUxContentSimplificationAudit('used-car-buying-check');
  assert.ok(usedCar);
  assert.equal(usedCar.decision, 'simplify_first_screen');
  assert.ok(usedCar.currentFlowGap.includes('comparison'));

  const computer = getUxContentSimplificationAudit('computer-skills-d30-study');
  assert.ok(computer);
  assert.equal(computer.decision, 'keep_simple');
  assert.ok(computer.keepOnFirstScreen.some((item) => item.includes('D-30')));

  const newCar = getUxContentSimplificationAudit('new-car-delivery-check');
  assert.ok(newCar);
  assert.equal(newCar.decision, 'public_mvp_with_guardrails');
  assert.ok(newCar.contentUxReinforcement.includes('evidence memo'));
  assert.ok(newCar.riskBoundary.includes('does not decide whether to sign'));

  const diet = getUxContentSimplificationAudit('diet-habit-2week');
  assert.ok(diet);
  assert.equal(diet.decision, 'public_mvp_with_guardrails');
  assert.ok(diet.currentFlowGap.includes('warning'));
  assert.ok(diet.copyFix.includes('observation'));
});

test('content lab exposes the current representative UX content review queue', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.representativeUxContentReviewTotalCount, 3);
  assert.deepEqual(summary.representativeUxContentReviewSlugs, [
    'computer-skills-d30-study',
    'diet-habit-2week',
    'new-car-delivery-check',
  ]);
  assert.equal(summary.representativeUxContentReviewDecisionCounts.ready_for_observed_session, 1);
  assert.equal(summary.representativeUxContentReviewDecisionCounts.needs_guardrail_rewrite, 2);
});

test('content lab exposes mobile simulation protocols for current candidate routes', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.mobileSimulationProtocolTotalCount, 3);
  assert.deepEqual(summary.mobileSimulationProtocolSlugs, [
    'computer-skills-d30-study',
    'diet-habit-2week',
    'new-car-delivery-check',
  ]);
  assert.equal(summary.mobileSimulationProtocolValidatedCount, 0);
  assert.equal(summary.mobileSimulationProtocolAverageScore, 77);
  assert.ok(
    summary.mobileSimulationProtocolRecords.every((record) =>
      record.statusAfterSimulation.includes('not validated'),
    ),
  );
});

test('content lab exposes unresolved UX cleanup backlog before content rewrites', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.uxCleanupBacklogTotalGroupCount, 9);
  assert.equal(summary.uxCleanupBacklogTotalRouteCount, 36);
  assert.equal(summary.uxCleanupBacklogValidatedCount, 0);
  assert.deepEqual(summary.uxCleanupBacklogFirstBatchGroupIds, [
    'exact_workout_video_execution_detail',
    'health_observation_guardrail',
    'vehicle_purchase_evidence_first',
  ]);
  assert.equal(summary.uxCleanupBacklogPriorityCounts.P1, 3);
  assert.ok(
    summary.uxCleanupBacklogGroups.every((group) =>
      group.statusAfterCleanup.includes('not validated'),
    ),
  );
});

test('content lab exposes design-ref gap queue for remaining alignment work', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.designRefGapQueueTotalCount, 8);
  assert.equal(summary.designRefGapQueueLandedCount, 8);
  assert.equal(summary.designRefGapQueuePendingCount, 0);
  assert.equal(summary.designRefGapQueueP1PendingCount, 0);
  assert.equal(summary.designRefGapQueueValidatedCount, 0);

  const landedRouteSlugs = new Set(summary.designRefGapQueueLandedItems.flatMap((item) => item.routeSlugs));
  assert.equal(landedRouteSlugs.has('moving-d30-basic'), true);
  assert.equal(landedRouteSlugs.has('computer-skills-d30-study'), true);
  assert.equal(landedRouteSlugs.has('diet-habit-2week'), true);
  assert.equal(landedRouteSlugs.has('new-car-delivery-check'), true);
  assert.equal(landedRouteSlugs.has('used-car-buying-check'), true);
  assert.equal(landedRouteSlugs.has('baby-food-menu-recipe'), true);

  assert.equal(summary.designRefGapQueuePendingItems.length, 0);
  assert.ok(
    summary.designRefGapQueueItems.every((item) =>
      item.statusAfterAlignment.includes('not validated'),
    ),
  );
});

test('content lab exposes observed-session prep package without validation claims', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.observedSessionPrepTotalCount, 3);
  assert.deepEqual(summary.observedSessionPrepSlugs, [
    'computer-skills-d30-study',
    'diet-habit-2week',
    'new-car-delivery-check',
  ]);
  assert.equal(summary.observedSessionPrepValidatedCount, 0);
  assert.ok(
    summary.observedSessionPrepRecords.every((record) =>
      record.statusAfterPrep.includes('not validated'),
    ),
  );
  assert.ok(
    summary.observedSessionPrepRecords.every((record) =>
      record.screenshotTargets.length >= 3 && record.failureSignals.length >= 2,
    ),
  );
});

test('content lab exposes observed-session evidence without validation claims', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.observedSessionEvidenceRouteCount, 3);
  assert.equal(summary.observedSessionEvidenceSessionCount, 1);
  assert.equal(summary.observedSessionEvidenceNotRunCount, 2);
  assert.equal(summary.observedSessionEvidenceNoSignalCount, 1);
  assert.equal(summary.observedSessionEvidenceCandidateSignalCount, 0);
  assert.equal(summary.observedSessionEvidenceValidatedCount, 0);
  assert.deepEqual(summary.observedSessionEvidenceSlugs, [
    'computer-skills-d30-study',
    'diet-habit-2week',
    'new-car-delivery-check',
  ]);

  const studySummary = summary.observedSessionEvidenceRouteSummaries.find(
    (record) => record.slug === 'computer-skills-d30-study',
  );
  assert.equal(studySummary?.latestDecision, 'no signal');
  assert.equal(studySummary?.latestSessionId, '2026-05-25-computer-skills-d30-study-session-00-simulated');

  assert.ok(
    summary.observedSessionEvidenceRecords.every((record) =>
      record.statusAfterSession.includes('not validated'),
    ),
  );
});

test('observed-session note intake generates exportable markdown without validated decisions', () => {
  assert.deepEqual(observedSessionNoteDecisionOptions, ['no signal', 'friction', 'candidate signal']);
  assert.equal(observedSessionNoteDecisionOptions.includes('validated candidate'), false);

  const markdown = generateObservedSessionNoteMarkdown({
    date: '2026-05-26',
    observer: 'HUBERT',
    route: 'diet-habit-2week',
    device: 'iPhone 15 Safari',
    participantType: 'target user',
    taskRealism: 'real task',
    sessionNumber: '01',
    decision: 'friction',
    artifactNearCta: 'missed first, found after prompt',
    stickyFallback: 'used fallback sheet',
    exportCopy: 'copied observation sheet',
    friction: 'Stop/consult condition was noticed after table editing.',
    followUp: 'Move stop/consult cue closer to the first row.',
  });

  assert.match(markdown, /^# Observed Session Note: diet-habit-2week/m);
  assert.equal(
    generateObservedSessionNoteFilename('2026-05-26', 'diet-habit-2week', '01'),
    '2026-05-26-diet-habit-2week-session-01.md',
  );
  assert.match(markdown, /Session: 01/);
  assert.match(markdown, /Decision: `friction`/);
  assert.match(markdown, /Artifact-near CTA: missed first, found after prompt/);
  assert.match(markdown, /Sticky fallback: used fallback sheet/);
  assert.match(markdown, /Export\/copy: copied observation sheet/);
  assert.match(markdown, /not validation/i);
  assert.doesNotMatch(markdown, /validated candidate/);
});

test('observed-session run sheet turns prep records into moderator markdown without validation claims', () => {
  const summary = getContentLabSummary(seedBundles);
  const prep = summary.observedSessionPrepRecords.find(
    (record) => record.slug === 'computer-skills-d30-study',
  );
  assert.ok(prep);

  const markdown = generateObservedSessionRunSheetMarkdown({
    ...prep,
    title: '컴퓨터활용능력 30일 학습 플랜',
  });

  assert.equal(
    generateObservedSessionRunSheetFilename(prep.slug),
    'computer-skills-d30-study-observed-session-run-sheet.md',
  );
  assert.match(markdown, /^# Observed Session Run Sheet: computer-skills-d30-study/m);
  assert.match(markdown, /Goal: Check whether a mobile learner understands/);
  assert.match(markdown, /Moderator prompt/);
  assert.match(markdown, /source-derived study sheet before export/);
  assert.match(markdown, /Screenshot targets/);
  assert.match(markdown, /Decision options: `no signal`, `friction`, `candidate signal`/);
  assert.doesNotMatch(markdown, /validated candidate/);
});
