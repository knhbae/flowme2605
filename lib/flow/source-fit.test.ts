import assert from 'node:assert/strict';
import test from 'node:test';
import { getRepresentativeFlowSlugs } from './execution-model';
import {
  getSourceFitAudit,
  getSourceFitDecision,
  getSourceFitSummary,
  scoreSourceFit,
  sourceFitAudits,
} from './source-fit';
import { seedBundles } from './seed-flows';

test('source-fit scoring clamps each dimension to its maximum and returns a 0-100 score', () => {
  assert.equal(
    scoreSourceFit({
      actionDensity: 99,
      temporalStructure: 99,
      externalManagementNeed: 99,
      completionClarity: 99,
      personalizationNeed: 99,
      returnValue: 99,
      sourceSpecificityTrust: 99,
      riskBoundaryClarity: 99,
    }),
    100,
  );

  assert.equal(
    scoreSourceFit({
      actionDensity: -1,
      temporalStructure: -1,
      externalManagementNeed: -1,
      completionClarity: -1,
      personalizationNeed: -1,
      returnValue: -1,
      sourceSpecificityTrust: -1,
      riskBoundaryClarity: -1,
    }),
    0,
  );
});

test('source-fit decisions follow public handling bands', () => {
  assert.equal(getSourceFitDecision(90), 'keep_representative');
  assert.equal(getSourceFitDecision(70), 'reshape_before_featured');
  assert.equal(getSourceFitDecision(50), 'catalog_preview_only');
  assert.equal(getSourceFitDecision(20), 'hide_from_public_catalog');
});

test('first source-fit batch covers every representative flow', () => {
  const auditedSlugs = new Set(sourceFitAudits.map((audit) => audit.slug));

  for (const slug of getRepresentativeFlowSlugs()) {
    assert.ok(auditedSlugs.has(slug), slug);
  }
});

test('representative source-fit audit includes source and gap notes', () => {
  const moving = getSourceFitAudit('moving-d30-basic');
  assert.ok(moving);
  assert.equal(moving.decision, 'keep_representative');
  assert.ok(moving.currentGap.length > 0);
  assert.ok(moving.sourceUrl.startsWith('https://'));
});

test('source-fit audits include concrete natural artifact simulations', () => {
  for (const audit of sourceFitAudits) {
    assert.ok(audit.naturalArtifacts.length > 0, audit.slug);

    for (const artifact of audit.naturalArtifacts) {
      assert.match(artifact.simulatedInputs.join(' '), /=/, `${audit.slug} needs concrete input values`);
      assert.ok(artifact.expectedOutput.length > 0, `${audit.slug} needs expected artifact output`);
      assert.ok(artifact.currentFlowMatch.length > 0, `${audit.slug} needs current Flow comparison`);
      assert.ok(artifact.currentUxSupport.length > 0, `${audit.slug} needs UX support comparison`);
      assert.ok(artifact.gap.length > 0, `${audit.slug} needs artifact gap`);
    }
  }
});

test('moving audit simulates calendar and spreadsheet artifacts before comparing the Flow', () => {
  const moving = getSourceFitAudit('moving-d30-basic');
  assert.ok(moving);

  const artifactKinds = new Set(moving.naturalArtifacts.map((artifact) => artifact.kind));
  assert.ok(artifactKinds.has('monthly_calendar'));
  assert.ok(artifactKinds.has('spreadsheet'));
});

test('source-fit summary captures keep, reshape, and preview decisions', () => {
  const summary = getSourceFitSummary();

  assert.equal(summary.auditedCount, 90);
  assert.ok(summary.averageScore >= 70);
  assert.equal(summary.decisionCounts.keep_representative, 15);
  assert.equal(summary.decisionCounts.reshape_before_featured, 70);
  assert.equal(summary.decisionCounts.catalog_preview_only, 5);
});

test('computer skills final QA promotes the route to representative source fit', () => {
  const audit = getSourceFitAudit('computer-skills-d30-study');

  assert.ok(audit);
  assert.equal(audit.decision, 'keep_representative');
  assert.ok(audit.uxAction.includes('desktop/mobile screenshot QA passed'));
});

test('source-fit audits cover every real-source route after manual promotion pass', () => {
  const auditedSlugs = new Set(sourceFitAudits.map((audit) => audit.slug));
  const realSourceSlugs = seedBundles
    .filter((bundle) => bundle.flow.source_status === 'real')
    .map((bundle) => bundle.flow.slug);

  assert.equal(realSourceSlugs.length, 40);
  for (const slug of realSourceSlugs) {
    assert.ok(auditedSlugs.has(slug), slug);
    const audit = getSourceFitAudit(slug);
    assert.ok(audit?.naturalArtifacts.length, slug);
    assert.ok(audit.currentGap.length > 0, slug);
    assert.ok(audit.contentAction.length > 0, slug);
    assert.ok(audit.uxAction.length > 0, slug);
  }
});

test('source-fit audit covers the first needs-review audit-now batch', () => {
  const auditNowSlugs = [
    'driver-license-renewal-check',
    'family-certificate-issue',
    'passport-renewal-docs',
    'pet-registration-basic',
    'resident-register-copy-issue',
    'qnet-exam-application-prep',
    'samsung-aircon-seasonal-check',
    'samsung-washer-filter-cleaning',
    'vehicle-inspection-prep',
  ];

  for (const slug of auditNowSlugs) {
    const audit = getSourceFitAudit(slug);
    assert.ok(audit, slug);
    assert.equal(audit.sourcePrecision, 'exact', slug);
    assert.ok(audit.naturalArtifacts.length > 0, slug);
    assert.ok(audit.userJourney.length >= 3, slug);
    assert.ok(audit.currentGap.length > 0, slug);
    assert.ok(audit.contentAction.length > 0, slug);
    assert.ok(audit.uxAction.length > 0, slug);
  }
});

test('source-fit audit covers remaining source replacement and risk review routes', () => {
  const remainingNeedsReviewSlugs = [
    'computer-skills-d30-study',
    'diet-habit-2week',
    'new-car-delivery-check',
    'year-end-tax-docs',
    'diet-meal-exercise-log',
    'diet-reset-2week',
    'business-registration-basic',
    'happy-birth-service-check',
    'industrial-accident-claim-docs',
    'national-health-checkup-d7',
    'vaccination-certificate-issue',
    'job-change-risk-check',
  ];

  for (const slug of remainingNeedsReviewSlugs) {
    const audit = getSourceFitAudit(slug);
    assert.ok(audit, slug);
    assert.equal(audit.sourcePrecision, 'exact', slug);
    assert.ok(audit.sourceUrl.startsWith('https://'), slug);
    assert.ok(audit.naturalArtifacts.length > 0, slug);
    assert.ok(audit.userJourney.length >= 3, slug);
    assert.ok(audit.currentGap.length > 0, slug);
    assert.ok(audit.contentAction.length > 0, slug);
    assert.ok(audit.uxAction.length > 0, slug);
  }
});

test('source-fit audit covers promoted category representative routes', () => {
  const promotedNeedsReviewSlugs = [
    'alt-phone-sk7-self-activation',
    'infant-health-checkup-prep',
    'chiangmai-solo-trip-packing',
    'lease-contract-report-deadline',
    'jeonse-contract-precheck-docs',
    'picture-book-reading-routine',
    'kids-dino-footprint-art',
    'banana-peanut-recipe-video',
  ];

  for (const slug of promotedNeedsReviewSlugs) {
    const audit = getSourceFitAudit(slug);
    assert.ok(audit, slug);
    assert.equal(audit.sourcePrecision, 'exact', slug);
    assert.ok(audit.sourceUrl.startsWith('https://'), slug);
    assert.ok(audit.naturalArtifacts.length > 0, slug);
    assert.ok(audit.userJourney.length >= 3, slug);
    assert.ok(audit.currentGap.length > 0, slug);
    assert.ok(audit.contentAction.length > 0, slug);
    assert.ok(audit.uxAction.length > 0, slug);
  }
});
