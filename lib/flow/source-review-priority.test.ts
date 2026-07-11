import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SOURCE_REVIEW_PRIORITY_LABELS,
  reviewSourceNeedsReviewPriority,
  summarizeSourceNeedsReviewPriority,
} from './source-review-priority';
import { seedBundles } from './seed-flows';

function bundleBySlug(slug: string) {
  const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(bundle, `missing bundle: ${slug}`);
  return bundle;
}

test('source review priority skips needs-review flows that already have manual source-fit audits', () => {
  const passport = reviewSourceNeedsReviewPriority(bundleBySlug('passport-renewal-docs'));
  const vehicle = reviewSourceNeedsReviewPriority(bundleBySlug('vehicle-inspection-prep'));

  assert.equal(passport, undefined);
  assert.equal(vehicle, undefined);
});

test('source review priority separates broad sources for source replacement', () => {
  const computer = reviewSourceNeedsReviewPriority(bundleBySlug('computer-skills-d30-study'));
  const diet = reviewSourceNeedsReviewPriority(bundleBySlug('diet-meal-exercise-log'));

  assert.equal(computer, undefined);
  assert.equal(diet, undefined);
});

test('source review priority keeps sensitive exact flows in risk review', () => {
  const health = reviewSourceNeedsReviewPriority(bundleBySlug('national-health-checkup-d7'));
  const tax = reviewSourceNeedsReviewPriority(bundleBySlug('business-registration-basic'));

  assert.equal(health, undefined);
  assert.equal(tax, undefined);
});

test('source review priority summary covers every needs-review flow', () => {
  const summary = summarizeSourceNeedsReviewPriority(seedBundles);
  const countSum = Object.values(summary.priorityCounts).reduce((sum, count) => sum + count, 0);

  // Two broad sources moved to preview; the remaining queue stays explicitly classified.
  assert.equal(summary.totalCount, 42);
  assert.equal(countSum, 42);
  assert.equal(summary.priorityCounts.audit_now, 28);
  assert.equal(summary.priorityCounts.source_replacement, 1);
  assert.equal(summary.priorityCounts.risk_review, 13);
  assert.equal(summary.priorityCounts.content_backlog, 0);
  assert.equal(summary.items.length, 42);
  assert.deepEqual(
    summary.items.map((item) => item.score),
    [...summary.items.map((item) => item.score)].sort((a, b) => b - a),
  );
});

test('source review priority labels stay Korean and user-facing', () => {
  assert.equal(SOURCE_REVIEW_PRIORITY_LABELS.audit_now, '바로 audit');
  assert.equal(SOURCE_REVIEW_PRIORITY_LABELS.source_replacement, '원본 교체');
  assert.equal(SOURCE_REVIEW_PRIORITY_LABELS.risk_review, '리스크 검토');
  assert.equal(SOURCE_REVIEW_PRIORITY_LABELS.content_backlog, '콘텐츠 보강');
});
