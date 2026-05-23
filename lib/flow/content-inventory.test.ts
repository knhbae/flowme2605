import assert from 'node:assert/strict';
import test from 'node:test';
import {
  reviewContentInventory,
  summarizeContentInventory,
} from './content-inventory';
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

test('inventory review marks unaudited real sources as derived reviews', () => {
  const review = reviewContentInventory(bundleBySlug('real-samsung-aircon-seasonal-care'));

  assert.equal(review.level, 'derived_real_source');
  assert.notEqual(review.decision, 'preview_candidate');
  assert.equal(review.sourcePrecision, 'exact');
  assert.ok(review.nextAction.includes('수동'));
});

test('inventory review keeps exact health videos out of representative validation', () => {
  const review = reviewContentInventory(bundleBySlug('real-thankyou-bubu-video-daily-stretch-9min'));

  assert.equal(review.level, 'derived_real_source');
  assert.equal(review.publicHandling, 'catalog_preview');
  assert.ok(review.reason.includes('민감'));
});

test('inventory review labels generated channel flows as preview candidates', () => {
  const preview = seedBundles.find((entry) => entry.flow.source_status === 'preview');
  assert.ok(preview);

  const review = reviewContentInventory(preview);

  assert.equal(review.level, 'generated_preview_candidate');
  assert.equal(review.decision, 'preview_candidate');
  assert.equal(review.publicHandling, 'preview_candidate');
  assert.equal(review.score, 0);
});

test('inventory review separates unaudited source-backed needs-review flows from legacy access', () => {
  const review = reviewContentInventory(bundleBySlug('business-registration-basic'));

  assert.equal(review.level, 'source_needs_review');
  assert.equal(review.decision, 'catalog_preview_only');
  assert.equal(review.publicHandling, 'catalog_preview');
  assert.equal(review.sourcePrecision, 'exact');
  assert.ok(review.reason.includes('원본 URL'));
  assert.ok(review.nextAction.includes('source-fit'));
});

test('inventory summary covers all current seed bundles', () => {
  const summary = summarizeContentInventory(seedBundles);

  assert.equal(summary.totalCount, seedBundles.length);
  assert.equal(summary.realSourceReviewedCount, summary.realSourceCount);
  assert.equal(
    summary.sourceBackedReviewedCount,
    summary.realSourceCount + summary.manualSourceFitCount + summary.sourceNeedsReviewCount,
  );
  assert.equal(summary.manualSourceFitCount, 19);
  assert.equal(summary.derivedRealSourceCount, summary.realSourceCount);
  assert.equal(summary.sourceNeedsReviewCount, 12);
  assert.equal(summary.legacyAccessibleCount, 0);
  assert.equal(summary.generatedPreviewCandidateCount, summary.previewSourceCount);
  assert.equal(summary.generatedPreviewCandidateCount, 440);
});
