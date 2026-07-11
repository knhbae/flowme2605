import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getNaturalArtifactAudit,
  realSourceNaturalArtifactAudits,
  summarizeNaturalArtifactAuditCoverage,
} from './natural-artifact-audit';
import { seedBundles } from './seed-flows';
import { sourceFitAudits } from './source-fit';

function bundleBySlug(slug: string) {
  const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(bundle, `missing seed bundle: ${slug}`);
  return bundle;
}

test('real-source natural artifact audits only cover real-source flows', () => {
  assert.equal(realSourceNaturalArtifactAudits.length, 40);

  for (const audit of realSourceNaturalArtifactAudits) {
    const bundle = bundleBySlug(audit.slug);
    assert.equal(bundle.flow.source_status, 'real', audit.slug);
    assert.equal(audit.sourceUrl, bundle.flow.source_url, audit.slug);
  }
});

test('real-source natural artifact audits include concrete simulated outputs and comparisons', () => {
  for (const audit of realSourceNaturalArtifactAudits) {
    assert.ok(audit.sourceEvidence.length > 0, audit.slug);
    assert.ok(audit.naturalArtifacts.length > 0, audit.slug);
    assert.ok(audit.currentContentGap.length > 0, audit.slug);
    assert.ok(audit.currentUxGap.length > 0, audit.slug);

    for (const artifact of audit.naturalArtifacts) {
      assert.match(artifact.simulatedInputs.join(' '), /=/, `${audit.slug} needs key=value inputs`);
      assert.ok(artifact.expectedOutput.length > 0, `${audit.slug} needs expected output`);
      assert.ok(artifact.currentFlowMatch.length > 0, `${audit.slug} needs content comparison`);
      assert.ok(artifact.currentUxSupport.length > 0, `${audit.slug} needs UX comparison`);
      assert.ok(artifact.gap.length > 0, `${audit.slug} needs gap`);
    }
  }
});

test('first real-source artifact batch covers core output kinds', () => {
  const artifactKinds = new Set(
    realSourceNaturalArtifactAudits.flatMap((audit) => audit.naturalArtifacts.map((artifact) => artifact.kind)),
  );

  assert.ok(artifactKinds.has('monthly_calendar'));
  assert.ok(artifactKinds.has('routine_calendar'));
  assert.ok(artifactKinds.has('checklist'));
  assert.ok(artifactKinds.has('spreadsheet'));
  assert.ok(artifactKinds.has('memo'));
  assert.ok(artifactKinds.has('comparison_table'));
});

test('real-source natural artifact coverage summary tracks remaining work', () => {
  const summary = summarizeNaturalArtifactAuditCoverage(
    seedBundles,
    sourceFitAudits.filter((audit) => audit.naturalArtifacts.length > 0).map((audit) => audit.slug),
  );

  assert.equal(summary.realSourceCount, 50);
  assert.equal(summary.auditedRealSourceCount, 50);
  assert.equal(summary.remainingRealSourceCount, 0);
  assert.ok(summary.decisionCounts.promote_to_manual_source_fit >= 1);
  assert.ok(summary.decisionCounts.reshape_content_or_ux >= 1);
});

test('natural artifact audit lookup returns the audited batch record', () => {
  const audit = getNaturalArtifactAudit('real-samsung-washer-filter-care');

  assert.ok(audit);
  assert.equal(audit.naturalArtifacts[0]?.kind, 'routine_calendar');
});

test('second real-source artifact batch covers routine, study, travel, and vehicle flows', () => {
  const expectedSecondBatchSlugs = [
    'real-thankyou-bubu-video-full-body-no-jump',
    'real-thankyou-bubu-video-daily-stretch-9min',
    'real-fitvely-video-body-fat-6kg-method',
    'real-fitvely-video-workout-split-science',
    'real-sinagong-computer-d30-study',
    'real-mofa-overseas-travel-prep',
    'real-ts-vehicle-inspection-prep',
    'real-safe-driving-license-renewal',
  ];

  for (const slug of expectedSecondBatchSlugs) {
    const audit = getNaturalArtifactAudit(slug);
    assert.ok(audit, `missing second-batch audit: ${slug}`);
    assert.ok(
      audit.naturalArtifacts.some((artifact) => artifact.kind === 'routine_calendar' || artifact.kind === 'monthly_calendar'),
      `${slug} should simulate a calendar-like natural artifact`,
    );
  }
});

test('Sinagong study broad source route is replaced with an exact-source reshape record', () => {
  const audit = getNaturalArtifactAudit('real-sinagong-computer-d30-study');
  const bundle = bundleBySlug('real-sinagong-computer-d30-study');

  assert.ok(audit);
  assert.equal(bundle.flow.source_precision, 'exact');
  assert.equal(bundle.flow.source_url, 'https://www.gilbut.co.kr/m/book/view?bookcode=BN004603');
  assert.equal(audit.decision, 'reshape_content_or_ux');
  assert.match(audit.sourceUrl, /gilbut\.co\.kr\/m\/book\/view\?bookcode=BN004603/);
  assert.ok(audit.nextContentAction.includes('source-derived') || audit.nextContentAction.includes('exact'));
});

test('Sinagong exact-source route remains a merge candidate unless it has distinct source-derived rows', () => {
  const audit = getNaturalArtifactAudit('real-sinagong-computer-d30-study');

  assert.ok(audit);
  assert.equal(audit.decision, 'reshape_content_or_ux');
  assert.match(audit.sourceEvidence.join(' '), /computer-skills-d30-study/);
  assert.match(audit.currentContentGap, /duplicate|중복/);
  assert.match(audit.nextContentAction, /merge|병합|canonical|대표/);
  assert.match(audit.nextUxAction, /direct QA|직접 QA|featured|대표/);
});

test('pet health visit route is re-sourced to an exact official visit program but not promoted', () => {
  const audit = getNaturalArtifactAudit('real-pet-health-visit-routine');
  const bundle = bundleBySlug('real-pet-health-visit-routine');

  assert.ok(audit);
  assert.equal(bundle.flow.source_precision, 'exact');
  assert.equal(bundle.flow.source_url, 'https://news.seoul.go.kr/env/archives/567583/');
  assert.equal(audit.decision, 'keep_catalog_review');
  assert.match(audit.sourceUrl, /news\.seoul\.go\.kr\/env\/archives\/567583/);
});

test('MOFA travel prep broad source route is replaced with an exact-country reshape record', () => {
  const audit = getNaturalArtifactAudit('real-mofa-overseas-travel-prep');
  const bundle = bundleBySlug('real-mofa-overseas-travel-prep');

  assert.ok(audit);
  assert.equal(bundle.flow.source_precision, 'exact');
  assert.equal(bundle.flow.source_url, 'https://www.0404.go.kr/ntnSafetyInfo/86/detail');
  assert.equal(audit.decision, 'reshape_content_or_ux');
  assert.match(audit.sourceUrl, /0404\.go\.kr\/ntnSafetyInfo\/86\/detail/);
  assert.ok(audit.sourceTitle.includes('베트남'));
});

test('third real-source artifact batch covers admin, childcare, pet, and moving decision flows', () => {
  const expectedThirdBatchSlugs = [
    'real-gov24-resident-register-copy',
    'real-childcare-support-application-check',
    'real-pet-health-visit-routine',
    'real-ohouse-movein-cleaning-check',
  ];

  for (const slug of expectedThirdBatchSlugs) {
    const audit = getNaturalArtifactAudit(slug);
    assert.ok(audit, `missing third-batch audit: ${slug}`);
    assert.ok(
      audit.naturalArtifacts.some((artifact) => artifact.kind === 'checklist' || artifact.kind === 'comparison_table'),
      `${slug} should simulate a checklist or decision artifact`,
    );
  }
});

test('fourth real-source artifact batch covers exact workout video routines', () => {
  const expectedFourthBatchSlugs = [
    'real-thankyou-bubu-video-belly-side-all-in-one',
    'real-thankyou-bubu-video-no-knee-cardio-strength',
    'real-thankyou-bubu-video-arm-back-shoulder',
    'real-thankyou-bubu-video-waist-8cm',
  ];

  for (const slug of expectedFourthBatchSlugs) {
    const audit = getNaturalArtifactAudit(slug);
    assert.ok(audit, `missing fourth-batch audit: ${slug}`);
    assert.ok(
      audit.naturalArtifacts.some((artifact) => artifact.kind === 'routine_calendar'),
      `${slug} should simulate a recurring workout calendar`,
    );
    assert.ok(
      audit.naturalArtifacts.some((artifact) => artifact.kind === 'memo' || artifact.kind === 'spreadsheet'),
      `${slug} should simulate a workout condition note or measurement log`,
    );
  }
});

test('fifth real-source artifact batch completes remaining ThankyouBUBU exact videos', () => {
  const expectedFifthBatchSlugs = [
    'real-thankyou-bubu-video-8min-cardio',
    'real-thankyou-bubu-video-3min-arm',
    'real-thankyou-bubu-video-3min-abs',
    'real-thankyou-bubu-video-lower-belly-8min',
  ];

  for (const slug of expectedFifthBatchSlugs) {
    const audit = getNaturalArtifactAudit(slug);
    assert.ok(audit, `missing fifth-batch audit: ${slug}`);
    assert.ok(
      audit.naturalArtifacts.some((artifact) => artifact.kind === 'routine_calendar'),
      `${slug} should simulate a recurring workout calendar`,
    );
    assert.ok(
      audit.currentUxGap.includes('캘린더') || audit.currentUxGap.includes('로그'),
      `${slug} should compare against current routine calendar/log UX`,
    );
  }
});

test('sixth real-source artifact batch covers FITVELY diet and nutrition exact videos', () => {
  const expectedSixthBatchSlugs = [
    'real-fitvely-video-carb-reason',
    'real-fitvely-video-three-week-check',
    'real-fitvely-video-post-workout-nutrition',
    'real-fitvely-video-carb-amount-shorts',
  ];

  for (const slug of expectedSixthBatchSlugs) {
    const audit = getNaturalArtifactAudit(slug);
    assert.ok(audit, `missing sixth-batch audit: ${slug}`);
    assert.ok(
      audit.naturalArtifacts.some((artifact) => artifact.kind === 'spreadsheet' || artifact.kind === 'memo'),
      `${slug} should simulate a diet/nutrition log artifact`,
    );
  }
});

test('seventh real-source artifact batch covers remaining FITVELY exact videos', () => {
  const expectedSeventhBatchSlugs = [
    'real-fitvely-video-after-work-nutrition',
    'real-fitvely-video-weight-class-method',
    'real-fitvely-video-bulk-up-method',
    'real-fitvely-video-workout-order',
  ];

  for (const slug of expectedSeventhBatchSlugs) {
    const audit = getNaturalArtifactAudit(slug);
    assert.ok(audit, `missing seventh-batch audit: ${slug}`);
    assert.ok(
      audit.naturalArtifacts.some(
        (artifact) => artifact.kind === 'comparison_table' || artifact.kind === 'routine_calendar' || artifact.kind === 'spreadsheet',
      ),
      `${slug} should simulate a decision, schedule, or tracking artifact`,
    );
  }
});

test('eighth real-source artifact batch closes broad channel and site sources', () => {
  const expectedEighthBatchSlugs = [
    'real-fitvely-weekly-body-check',
  ];

  for (const slug of expectedEighthBatchSlugs) {
    const audit = getNaturalArtifactAudit(slug);
    assert.ok(audit, `missing eighth-batch audit: ${slug}`);
    assert.ok(
      audit.decision === 'keep_catalog_review' || audit.decision === 'replace_or_hide_source',
      `${slug} should not be promoted from a broad source without an exact source replacement`,
    );
    assert.ok(
      audit.naturalArtifacts.some(
        (artifact) => artifact.kind === 'routine_calendar' || artifact.kind === 'spreadsheet' || artifact.kind === 'memo',
      ),
      `${slug} should still simulate the user's natural artifact before judging the source gap`,
    );
  }
});

test('FITVELY weekly body check is hidden when no exact check-in source is confirmed', () => {
  const audit = getNaturalArtifactAudit('real-fitvely-weekly-body-check');
  const bundle = bundleBySlug('real-fitvely-weekly-body-check');

  assert.ok(audit);
  assert.equal(bundle.flow.source_precision, 'broad');
  assert.equal(audit.decision, 'replace_or_hide_source');
  assert.ok(audit.nextContentAction.includes('hide') || audit.nextContentAction.includes('remove'));
});

test('FITVELY diet record broad source route is replaced with an exact-source reshape record', () => {
  const audit = getNaturalArtifactAudit('real-fitvely-diet-record-routine');
  const bundle = bundleBySlug('real-fitvely-diet-record-routine');

  assert.ok(audit);
  assert.equal(bundle.flow.source_precision, 'exact');
  assert.equal(bundle.flow.source_url, 'https://www.youtube.com/watch?v=qcTxaFMWzKs');
  assert.equal(audit.decision, 'reshape_content_or_ux');
  assert.match(audit.sourceUrl, /youtube\.com\/watch\?v=qcTxaFMWzKs/);
  assert.ok(audit.nextContentAction.includes('exact'));
});

test('ThankyouBUBU former broad source routes are exact-source reshape records', () => {
  const expectedExactReplacementSlugs = [
    'real-thankyou-bubu-home-workout-starter',
    'real-thankyou-bubu-20min-routine',
  ];

  for (const slug of expectedExactReplacementSlugs) {
    const audit = getNaturalArtifactAudit(slug);
    const bundle = bundleBySlug(slug);

    assert.ok(audit, `missing exact replacement audit: ${slug}`);
    assert.equal(bundle.flow.source_precision, 'exact', slug);
    assert.equal(audit.decision, 'reshape_content_or_ux', slug);
    assert.match(audit.sourceUrl, /youtube\.com\/watch\?v=/, slug);
    assert.ok(audit.nextContentAction.includes('exact'), slug);
  }
});
