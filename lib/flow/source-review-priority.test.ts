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

  assert.equal(computer?.priority, 'source_replacement');
  assert.equal(diet?.priority, 'source_replacement');
  assert.ok(computer.reason.includes('broad'));
  assert.ok(diet.nextAction.includes('정확한 원본'));
});

test('source review priority keeps sensitive exact flows in risk review', () => {
  const health = reviewSourceNeedsReviewPriority(bundleBySlug('national-health-checkup-d7'));
  const tax = reviewSourceNeedsReviewPriority(bundleBySlug('business-registration-basic'));

  assert.equal(health?.priority, 'risk_review');
  assert.equal(tax?.priority, 'risk_review');
  assert.ok(health.reason.includes('민감'));
});

test('source review priority summary covers every needs-review flow', () => {
  const summary = summarizeSourceNeedsReviewPriority(seedBundles);
  const countSum = Object.values(summary.priorityCounts).reduce((sum, count) => sum + count, 0);

  assert.equal(summary.totalCount, 12);
  assert.equal(countSum, 12);
  assert.equal(summary.priorityCounts.audit_now, 0);
  assert.equal(summary.priorityCounts.source_replacement, 6);
  assert.equal(summary.priorityCounts.risk_review, 6);
  assert.equal(summary.items.length, 12);
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
