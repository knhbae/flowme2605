import assert from 'node:assert/strict';
import test from 'node:test';
import { getRepresentativeUxContentReview, summarizeRepresentativeUxContentReviews } from './representative-ux-content-review';
import { seedBundles } from './seed-flows';

test('representative UX content review covers the three current candidate routes', () => {
  const summary = summarizeRepresentativeUxContentReviews(seedBundles);

  assert.equal(summary.totalCount, 3);
  assert.deepEqual(summary.slugs, [
    'computer-skills-d30-study',
    'diet-habit-2week',
    'new-car-delivery-check',
  ]);
  assert.equal(summary.decisionCounts.ready_for_observed_session, 1);
  assert.equal(summary.decisionCounts.needs_guardrail_rewrite, 2);
});

test('representative UX content reviews record concrete artifacts and do not claim validation', () => {
  const computer = getRepresentativeUxContentReview('computer-skills-d30-study');
  const diet = getRepresentativeUxContentReview('diet-habit-2week');
  const newCar = getRepresentativeUxContentReview('new-car-delivery-check');

  assert.ok(computer);
  assert.equal(computer.decision, 'ready_for_observed_session');
  assert.ok(computer.naturalOutput.includes('calendar'));
  assert.ok(computer.naturalOutput.includes('sheet'));
  assert.ok(computer.statusAfterReview.includes('not validated'));

  assert.ok(diet);
  assert.equal(diet.decision, 'needs_guardrail_rewrite');
  assert.ok(diet.currentUxGap.includes('observation'));
  assert.ok(diet.sourceRiskSeparation.includes('does not prescribe'));
  assert.ok(diet.mobileDensityRisk.includes('warning'));

  assert.ok(newCar);
  assert.equal(newCar.decision, 'needs_guardrail_rewrite');
  assert.ok(newCar.naturalOutput.includes('evidence sheet'));
  assert.ok(newCar.sourceRiskSeparation.includes('does not decide whether to sign'));
  assert.ok(newCar.contentRewritePriority.includes('photo'));
});
