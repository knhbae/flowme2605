import assert from 'node:assert/strict';
import test from 'node:test';
import {
  convertedPilotSlugs,
  expansionCreatorLabs,
  getContentLabSummary,
  pilotCreatorLabs,
  scoreCandidate,
} from './content-lab';
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

  assert.equal(summary.sourceFitAuditedCount, 10);
  assert.ok(summary.sourceFitAverageScore >= 70);
  assert.ok(summary.sourceFitDecisionCounts.keep_representative >= 5);
  assert.ok(summary.sourceFitDecisionCounts.reshape_before_featured >= 1);
  assert.ok(summary.sourceFitDecisionCounts.catalog_preview_only >= 1);
});

test('content lab exposes full content inventory coverage', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.inventoryTotalCount, seedBundles.length);
  assert.equal(summary.realSourceInventoryReviewedCount, summary.realSourceFlowCount);
  assert.equal(summary.manualSourceFitAuditedCount, 10);
  assert.equal(summary.derivedRealSourceReviewedCount, summary.realSourceFlowCount);
  assert.equal(
    summary.sourceBackedInventoryReviewedCount,
    summary.realSourceFlowCount + summary.manualSourceFitAuditedCount + summary.sourceNeedsReviewInventoryCount,
  );
  assert.equal(summary.previewCandidateFlowCount, summary.previewGeneratedFlowCount);
  assert.ok(summary.inventoryPublicHandlingCounts.preview_candidate >= 440);
  assert.equal(summary.sourceNeedsReviewInventoryCount, 21);
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
  assert.equal(summary.lifecycleBucketCounts.keep, 5);
  assert.equal(summary.lifecycleBucketCounts.hide, 0);
  assert.equal(summary.lifecycleBucketCounts.preview_only, summary.previewGeneratedFlowCount);
  assert.equal(summary.lifecycleBucketCounts.remove_candidate, 0);
  assert.equal(summary.lifecycleBucketCounts.fix, 66);
  assert.equal(summary.lifecycleHideSlugs.length, 0);
  assert.ok(summary.lifecycleFixSlugs.includes('real-sinagong-computer-d30-study'));
  assert.ok(summary.lifecycleFixSlugs.includes('passport-renewal-docs'));
});
