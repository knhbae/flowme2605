import assert from 'node:assert/strict';
import test from 'node:test';
import { getPreviewFlowBundles } from './creator-channel-preview';
import { isRuntimeExcludedBundle, RUNTIME_ARCHIVED_FLOW_SLUGS } from './runtime-content-policy';
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
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'blog-youtube-start');
  assert.ok(moving);
  const asOf = new Date('2026-07-11T00:00:00+09:00');

  assert.equal(classifyFlowSourceFreshness(withCheckedAt(moving, '2026-06-11'), asOf).bucket, 'current');
  assert.equal(classifyFlowSourceFreshness(withCheckedAt(moving, '2026-03-31'), asOf).bucket, 'review_due');
  assert.equal(classifyFlowSourceFreshness(withCheckedAt(moving, '2026-01-01'), asOf).bucket, 'stale');
});

test('source freshness rejects future and malformed source review metadata', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'blog-youtube-start');
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
  const archivedBundles = seedBundles.filter(isRuntimeExcludedBundle);
  const asOf = new Date();
  const summary = summarizeFlowSourceFreshness(runtimeBundles, asOf);
  const canonical = summarizeFlowSourceFreshness(seedBundles, asOf);
  const archived = summarizeFlowSourceFreshness(archivedBundles, asOf);
  const inventory = (value: typeof summary) => [value.publishedCount, value.normalUserRouteCount, value.previewOrHiddenCount];
  // The approved twenty-four holds move only NEW intake to preview; no date or
  // freshness threshold changes. Non-held routes still require current checks.
  assert.deepEqual(inventory(canonical), [153, 97, 56]);
  assert.deepEqual(inventory(archived), [21, 10, 11]);
  assert.deepEqual(inventory(summary), [132, 87, 45]);
  const slugs = (bundles: FlowBundle[]) => bundles.map((bundle) => bundle.flow.slug).sort();
  // Source-backed additions also use this policy; only canonical members belong in this inventory.
  const canonicalSlugs = new Set(slugs(seedBundles));
  assert.deepEqual(slugs(archivedBundles), RUNTIME_ARCHIVED_FLOW_SLUGS.filter(slug => canonicalSlugs.has(slug)).sort());
  assert.deepEqual(slugs([...runtimeBundles, ...archivedBundles]), slugs(seedBundles));
  const runtimeSlugs = new Set(slugs(runtimeBundles));
  assert.equal(runtimeSlugs.size, runtimeBundles.length);
  assert.ok(archivedBundles.every((bundle) => !runtimeSlugs.has(bundle.flow.slug)));
  assert.equal(summary.missingMetadataCount, 0);
  assert.equal(summary.reviewDueCount, 0);
  assert.equal(summary.staleCount, 0);
});
