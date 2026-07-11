import assert from 'node:assert/strict';
import test from 'node:test';
import { getPreviewFlowBundles } from './creator-channel-preview';
import { isRuntimeExcludedBundle } from './runtime-content-policy';
import { seedBundles } from './seed-flows';
import { classifyFlowSourceFreshness, summarizeFlowSourceFreshness } from './source-freshness';
import type { FlowBundle } from './types';

function withCheckedAt(bundle: FlowBundle, checkedAt: string): FlowBundle {
  return {
    ...bundle,
    flow: {
      ...bundle.flow,
      source_checked_at: checkedAt,
    },
  };
}

test('source freshness separates current, review-due, and stale user routes', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);
  const asOf = new Date('2026-07-11T00:00:00+09:00');

  assert.equal(classifyFlowSourceFreshness(withCheckedAt(moving, '2026-06-11'), asOf).bucket, 'current');
  assert.equal(classifyFlowSourceFreshness(withCheckedAt(moving, '2026-03-31'), asOf).bucket, 'review_due');
  assert.equal(classifyFlowSourceFreshness(withCheckedAt(moving, '2026-01-01'), asOf).bucket, 'stale');
});

test('source freshness rejects future and malformed source review metadata', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);
  const asOf = new Date('2026-07-11T12:00:00+09:00');

  assert.deepEqual(
    classifyFlowSourceFreshness(withCheckedAt(moving, '2026-07-12'), asOf).missingFields,
    ['source_checked_at_future'],
  );
  assert.deepEqual(
    classifyFlowSourceFreshness(withCheckedAt(moving, '2026-02-30'), asOf).missingFields,
    ['source_checked_at'],
  );

  const invalidSource = {
    ...moving,
    flow: {
      ...moving.flow,
      source_url: 'javascript:alert(1)',
      source_precision: 'unknown',
    },
  } as unknown as FlowBundle;
  assert.deepEqual(
    classifyFlowSourceFreshness(invalidSource, asOf).missingFields,
    ['source_url', 'source_precision'],
  );
});

test('preview library is excluded from normal user route freshness failures', () => {
  const preview = getPreviewFlowBundles()[0];
  assert.ok(preview);
  assert.equal(
    classifyFlowSourceFreshness(preview, new Date('2026-07-11T00:00:00+09:00')).bucket,
    'preview_or_hidden',
  );
});

test('current canonical seed has no missing or overdue normal user source checks', () => {
  const runtimeBundles = seedBundles.filter((bundle) => !isRuntimeExcludedBundle(bundle));
  const summary = summarizeFlowSourceFreshness(runtimeBundles, new Date());

  assert.ok(summary.normalUserRouteCount >= 120);
  assert.ok(summary.previewOrHiddenCount >= 15);
  assert.equal(summary.missingMetadataCount, 0);
  assert.equal(summary.reviewDueCount, 0);
  assert.equal(summary.staleCount, 0);
});
