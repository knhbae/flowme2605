import assert from 'node:assert/strict';
import test from 'node:test';
import {
  reviewContentInventory,
  summarizeContentInventory,
} from './content-inventory';
import { isCuratedSourceAppSeedBundle } from './curated-source-app-seed-meta';
import { seedBundles } from './seed-flows';

function bundleBySlug(slug: string) {
  const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(bundle, `missing bundle: ${slug}`);
  return bundle;
}

test('inventory review preserves manual source-fit decisions', () => {
  const review = reviewContentInventory(bundleBySlug('moving-d30-basic'));

  assert.equal(review.level, 'manual_source_fit');
  assert.equal(review.decision, 'keep_representative');
  assert.equal(review.publicHandling, 'representative_eligible');
  assert.equal(review.sourcePrecision, 'exact');
  assert.ok(review.reason.includes('수동'));
});

test('inventory review promotes real sources to manual source-fit reviews', () => {
  const review = reviewContentInventory(bundleBySlug('real-samsung-aircon-seasonal-care'));

  assert.equal(review.level, 'manual_source_fit');
  assert.equal(review.decision, 'keep_representative');
  assert.equal(review.publicHandling, 'representative_eligible');
  assert.equal(review.sourcePrecision, 'exact');
  assert.ok(review.reason.includes('수동'));
});

test('inventory review keeps exact health videos in source review after manual audit', () => {
  const review = reviewContentInventory(bundleBySlug('real-thankyou-bubu-video-daily-stretch-9min'));

  assert.equal(review.level, 'manual_source_fit');
  assert.equal(review.decision, 'reshape_before_featured');
  assert.equal(review.publicHandling, 'source_review');
  assert.ok(review.reason.includes('수동'));
});

test('inventory review labels generated channel flows as preview candidates', () => {
  const preview = seedBundles.find((entry) => entry.flow.id.startsWith('flow-preview-'));
  assert.ok(preview);

  const review = reviewContentInventory(preview);

  assert.equal(review.level, 'generated_preview_candidate');
  assert.equal(review.decision, 'preview_candidate');
  assert.equal(review.publicHandling, 'preview_candidate');
  assert.equal(review.score, 0);
});

test('inventory review separates curated source app seed from legacy source-fit coverage', () => {
  const curated = seedBundles.find(isCuratedSourceAppSeedBundle);
  assert.ok(curated);

  const review = reviewContentInventory(curated);

  assert.equal(review.level, 'curated_source_app_seed');
  assert.equal(review.decision, 'curated_source_app_seed');
  assert.equal(review.publicHandling, 'curated_seed');
  assert.ok(review.score > 0);
});

test('inventory review promotes remaining needs-review routes to manual source-fit', () => {
  const review = reviewContentInventory(bundleBySlug('business-registration-basic'));

  assert.equal(review.level, 'manual_source_fit');
  assert.equal(review.decision, 'reshape_before_featured');
  assert.equal(review.publicHandling, 'source_review');
  assert.equal(review.sourcePrecision, 'exact');
  assert.ok(review.reason.includes('수동'));
  assert.ok(review.nextAction.includes('공식 확인'));
});

test('inventory summary covers all current seed bundles', () => {
  const summary = summarizeContentInventory(seedBundles);

  assert.equal(summary.totalCount, seedBundles.length);
  assert.equal(summary.realSourceReviewedCount, summary.realSourceCount);
  assert.equal(
    summary.sourceBackedReviewedCount,
    summary.manualSourceFitCount + summary.derivedRealSourceCount + summary.sourceNeedsReviewCount,
  );
  assert.equal(summary.manualSourceFitCount, 118);
  assert.equal(summary.derivedRealSourceCount, 0);
  assert.equal(summary.curatedSourceAppSeedCount, 19);
  // The current-source pass classified all 23 audit-now routes and left only risk/source replacement work.
  assert.equal(summary.sourceNeedsReviewCount, 14);
  assert.equal(summary.legacyAccessibleCount, 0);
  assert.equal(summary.generatedPreviewCandidateCount, 442);
  // Four manually audited routes also moved to preview without becoming generated candidates.
  assert.equal(summary.previewSourceCount - summary.generatedPreviewCandidateCount, 4);
});
