import assert from 'node:assert/strict';
import test from 'node:test';
import { getRepresentativeFlowSlugs } from './execution-model';
import {
  getSourceFitAudit,
  getSourceFitDecision,
  getSourceFitSummary,
  scoreSourceFit,
  sourceFitAudits,
  type SourceFitDecision,
} from './source-fit';
import { isCuratedSourceAppSeedBundle } from './curated-source-app-seed-meta';
import { seedBundles } from './seed-flows';
import {
  isSourceBackedFlowMapExecutable,
  sourceBackedMyFlowBundles,
  sourceBackedMyFlowMaps,
} from './source-backed-my-flow';

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

  assert.equal(summary.auditedCount, 133);
  assert.ok(summary.averageScore >= 70);
  assert.equal(summary.decisionCounts.keep_representative, 47);
  assert.equal(summary.decisionCounts.reshape_before_featured, 73);
  assert.equal(summary.decisionCounts.catalog_preview_only, 12);
  assert.equal(summary.decisionCounts.hide_from_public_catalog, 1);
});

test('current new-car source fit keeps only supported purchase records executable', () => {
  const audit = getSourceFitAudit('curated-new-car-basic');

  assert.ok(audit);
  assert.equal(audit.checkedAt, '2026-07-12');
  assert.equal(audit.decision, 'keep_representative');
  assert.match(audit.sourceUsefulness, /신규등록과 의무보험.*생활법령/u);
  assert.match(audit.contentAction, /고정 가격.*넣지 않고/u);
  assert.ok(audit.naturalArtifacts.some((artifact) => artifact.kind === 'comparison_table'));
  assert.ok(audit.naturalArtifacts.some((artifact) => artifact.kind === 'checklist'));
});

test('no unaudited financial-sensitive source-backed map remains publicly executable', () => {
  const auditedSlugs = new Set(sourceFitAudits.map((audit) => audit.slug));
  const bundleBySlug = new Map(sourceBackedMyFlowBundles.map((bundle) => [bundle.flow.slug, bundle]));
  const unauditedHighRisk = sourceBackedMyFlowMaps.flatMap((map) => {
    if (!isSourceBackedFlowMapExecutable(map)) return [];
    return map.flowSlugs.filter((slug) => {
      const risk = bundleBySlug.get(slug)?.flow.risk_level;
      return risk === 'financial_sensitive' && !auditedSlugs.has(slug);
    });
  });

  assert.deepEqual(unauditedHighRisk, []);
});

test('sensitive current-source pass separates exact execution routes from broad advice', () => {
  const expected = new Map<string, SourceFitDecision>([
    ['ev-subsidy-apply', 'keep_representative'],
    ['housing-subscription-account', 'reshape_before_featured'],
    ['infant-health-checkup-schedule', 'keep_representative'],
    ['monthly-household-budget', 'reshape_before_featured'],
    ['national-scholarship-apply', 'keep_representative'],
    ['payday-finance-routine', 'reshape_before_featured'],
    ['property-local-tax-pay', 'keep_representative'],
    ['safe-inheritance-onestop', 'keep_representative'],
    ['unemployment-benefit-apply', 'keep_representative'],
    ['jeonse-guarantee-apply', 'keep_representative'],
    ['job-seeker-allowance-apply', 'keep_representative'],
    ['small-business-fund-check', 'keep_representative'],
    ['used-car-ownership-transfer', 'keep_representative'],
    ['adult-vaccine-schedule-check', 'keep_representative'],
  ]);

  for (const [slug, decision] of expected) {
    const audit = getSourceFitAudit(slug);
    assert.ok(audit, slug);
    assert.equal(audit.checkedAt, '2026-07-12', slug);
    assert.equal(audit.decision, decision, slug);
    assert.ok(audit.naturalArtifacts.length > 0, slug);
  }
});

test('current source freshness pass separates usable, stale, preview, and hidden routes', () => {
  const decisions = new Map(
    [
      'childcare-fee-support-apply',
      'weekly-meal-plan',
      'health-insurance-dependent',
      'book-finish-one',
      'skin-weekly-check',
    ].map((slug) => [slug, getSourceFitAudit(slug)]),
  );

  assert.equal(decisions.get('childcare-fee-support-apply')?.decision, 'keep_representative');
  assert.equal(decisions.get('weekly-meal-plan')?.decision, 'keep_representative');
  assert.equal(decisions.get('health-insurance-dependent')?.decision, 'reshape_before_featured');
  assert.equal(decisions.get('book-finish-one')?.decision, 'catalog_preview_only');
  assert.equal(decisions.get('skin-weekly-check')?.decision, 'hide_from_public_catalog');

  for (const audit of decisions.values()) {
    assert.ok(audit);
    assert.equal(audit.checkedAt, '2026-07-11');
  }
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
    .filter((bundle) => bundle.flow.source_status === 'real' && !isCuratedSourceAppSeedBundle(bundle))
    .map((bundle) => bundle.flow.slug);

  assert.ok(realSourceSlugs.length > 0);
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
    'banana-peanut-recipe-video',
    'first-passport-issue',
    'citizen-secretary-alerts',
    'closet-organize-1day',
    'domestic-trip-d7',
    'portfolio-4week',
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

  for (const slug of [
    'new-apartment-precheck',
    'japan-esim-setup-before-departure',
    'picture-book-reading-routine',
    'kids-dino-footprint-art',
  ]) {
    const audit = getSourceFitAudit(slug);
    assert.ok(audit, slug);
    assert.equal(audit.sourcePrecision, 'broad', slug);
    assert.equal(audit.decision, 'catalog_preview_only', slug);
  }
});
