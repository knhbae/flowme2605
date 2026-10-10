import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { getRuntimeArchivedFlowPolicy, RETIRED_PERSONAL_COPY_TAG } from './runtime-content-policy';
import {
  buildSourceBackedFlowMapSavedSnapshot,
  buildSourceBackedFlowMapPublishPackage,
  getPublicCatalogSourceBackedFlowMaps,
  getSourceBackedFlowMapQualityDecision,
  getSourceBackedHomepageFlowMaps,
  getUrlFirstLookupableSourceBackedFlowMaps,
  isSourceBackedFlowMapDirectRouteAccessible,
  isSourceBackedFlowMapExecutable,
  mergeSourceBackedMyFlowBundles,
  sourceBackedMyFlowBundles,
  sourceBackedMyFlowMaps,
} from './source-backed-my-flow';
import { classifyFlowSourceFreshness, summarizeFlowSourceFreshness } from './source-freshness';
import { cloneSeedBundles, getActiveFlowProgress, readBundles } from './storage';

const verifiedSlugs = [
  'source-backed-middle-school-math-1',
  'source-backed-baby-health-checkups',
  'source-backed-baby-vaccination-schedule',
  'source-backed-smishing-response',
  'source-backed-picnic-food-safety',
  'curated-baby-food-daily-meal-row',
  'curated-baby-food-cube-stock',
];
const heldSlugsAndOriginalReviewDates = [
  ['source-backed-moving-d30', '2026-06-23'],
  ['source-backed-year-end-tax-submit', '2026-06-25'],
  ['curated-opic-single-mock-review', '2026-06-29'],
  ['curated-opic-course-row-import', '2026-06-29'],
  ['curated-reading-monthly-log', '2026-06-29'],
  ['curated-child-vaccination-first-year', '2026-06-29'],
  ['curated-child-vaccination-booster-school-age', '2026-06-29'],
] as const;
const originalAuditOrder = [
  'source-backed-moving-d30', ...verifiedSlugs.slice(0, 4),
  'source-backed-year-end-tax-submit', 'source-backed-picnic-food-safety',
  'curated-opic-single-mock-review', 'curated-opic-course-row-import',
  'curated-baby-food-daily-meal-row', 'curated-baby-food-cube-stock',
  'curated-reading-monthly-log', 'curated-child-vaccination-first-year',
  'curated-child-vaccination-booster-school-age',
];
const asOf = new Date('2026-10-03T09:00:00.000Z');

function originalBundle(slug: string) {
  const bundle = sourceBackedMyFlowBundles.find(entry => entry.flow.slug === slug);
  assert.ok(bundle, slug);
  return bundle;
}

test('CP1 changes only actual review dates, not source rows, conditions, versions, or original metadata', () => {
  const originalMaterial = originalAuditOrder.map(originalBundle).map(bundle => ({
    ...bundle, flow: { ...bundle.flow, source_checked_at: 'REVIEW_DATE' },
  }));
  // Captured from the 14 original bundles before this source audit's runtime edits.
  assert.equal(
    createHash('sha256').update(JSON.stringify(originalMaterial)).digest('hex'),
    'b216a1d5daad3e4d28623d859d153f07663d8db5a1080bb491334ef18a2a8c6f',
  );
});

test('CP1 records seven scope-limited actual reviews without promoting existing medical or rejected holds', () => {
  for (const slug of verifiedSlugs) {
    const bundle = originalBundle(slug);
    assert.equal(bundle.flow.source_checked_at, '2026-10-03', slug);
    assert.equal(classifyFlowSourceFreshness(bundle, asOf).bucket, 'current', slug);
  }
  assert.equal(getSourceBackedFlowMapQualityDecision('baby-health-schedule').publicExecutionEnabled, false);
  assert.equal(getSourceBackedFlowMapQualityDecision('curated-baby-food-meal-log').directRouteEnabled, false);
  assert.equal(originalBundle('curated-baby-food-daily-meal-row').flow.source_status, 'needs_review');
  assert.equal(originalBundle('curated-baby-food-cube-stock').flow.source_status, 'needs_review');
  assert.equal(getSourceBackedFlowMapQualityDecision('smishing-response').status, 'reject');
  assert.equal(getSourceBackedFlowMapQualityDecision('picnic-food-safety').status, 'reject');
});

test('CP1 quarantines seven unsupported supplied bundles without a date-only freshness workaround', () => {
  const supplied = mergeSourceBackedMyFlowBundles(cloneSeedBundles());
  for (const [slug, checkedAt] of heldSlugsAndOriginalReviewDates) {
    assert.equal(originalBundle(slug).flow.source_checked_at, checkedAt, slug);
    assert.equal(classifyFlowSourceFreshness(originalBundle(slug), asOf).bucket, 'review_due', slug);
    assert.ok(getRuntimeArchivedFlowPolicy(slug), slug);
    assert.ok(!supplied.some(bundle => bundle.flow.slug === slug), slug);
  }
  const summary = summarizeFlowSourceFreshness(supplied, asOf);
  assert.deepEqual(
    [summary.publishedCount, summary.normalUserRouteCount, summary.previewOrHiddenCount,
      summary.currentCount, summary.reviewDueCount, summary.staleCount, summary.missingMetadataCount],
    [149, 126, 23, 126, 0, 0, 0],
  );
});

test('CP1 holds new moving, OPIC, and reading execution while retaining original review packages and source routes', () => {
  for (const mapId of ['moving-d30', 'curated-opic-mock-course', 'curated-reading-routine-log']) {
    const map = sourceBackedMyFlowMaps.find(entry => entry.id === mapId);
    assert.ok(map);
    const decision = getSourceBackedFlowMapQualityDecision(mapId);
    assert.equal(decision.publicExecutionEnabled, false, mapId);
    assert.equal(decision.executionHoldReason, 'source_rows', mapId);
    assert.equal(isSourceBackedFlowMapExecutable(map), false, mapId);
    assert.equal(isSourceBackedFlowMapDirectRouteAccessible(map), true, mapId);
    assert.ok(buildSourceBackedFlowMapPublishPackage(mapId)?.creator.sourceRows.length, mapId);
    for (const listed of [getPublicCatalogSourceBackedFlowMaps(),
      getUrlFirstLookupableSourceBackedFlowMaps(), getSourceBackedHomepageFlowMaps()]) {
      assert.ok(!listed.some(entry => entry.id === mapId), mapId);
    }
  }
  assert.equal(getSourceBackedFlowMapQualityDecision('year-end-tax-submit').executionHoldReason, 'official_freshness');
  assert.equal(getSourceBackedFlowMapQualityDecision('curated-child-vaccination-schedule').publicExecutionEnabled, false);
});

test('CP1 read-only bundle resolution preserves stored saved source copies and all execution evidence', () => {
  const original = originalBundle('source-backed-moving-d30');
  const entries = new Map([
    ['flow_builder_mvp_bundles_v11', JSON.stringify([original])],
    [`flow:saved:${original.flow.slug}`, JSON.stringify({ slug: original.flow.slug, savedAt: '2026-07-01T00:00:00.000Z' })],
    [`flow_builder_mvp_checks_${original.flow.slug}`, JSON.stringify({ [original.items[0].id]: true })],
    ['flow:map:saved:moving-d30', JSON.stringify({ mapId: 'moving-d30', flowSlugs: [original.flow.slug], privateNote: 'keep' })],
  ]);
  const before = [...entries];
  let writes = 0;
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: () => { writes += 1; },
  };
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    const resolved = mergeSourceBackedMyFlowBundles(readBundles());
    const personalCopy = resolved.find(bundle => bundle.flow.slug === original.flow.slug);
    assert.ok(personalCopy);
    assert.equal(personalCopy.flow.status, 'draft');
    assert.ok(personalCopy.flow.tags?.includes(RETIRED_PERSONAL_COPY_TAG));
    assert.deepEqual(personalCopy.items, original.items);
    assert.deepEqual(personalCopy.itemDetails, original.itemDetails);
    assert.equal(personalCopy.flow.source_checked_at, original.flow.source_checked_at);
    assert.equal(writes, 0);
    assert.deepEqual([...entries], before);
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
  }
});

function withReadOnlyStorage(initial: Record<string, string>, inspect: () => void) {
  const entries = new Map(Object.entries(initial));
  const before = [...entries];
  let writes = 0;
  const storage = {
    get length() { return entries.size; },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: () => { writes += 1; },
    removeItem: () => { writes += 1; },
  };
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    inspect();
    assert.equal(writes, 0);
    assert.deepEqual([...entries], before);
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
  }
}

test('CP1 recovers exact saved source identities without stored bundles even with absent or partial map snapshots', () => {
  for (const includeOrigin of [false, true]) {
    for (const snapshot of [undefined,
      buildSourceBackedFlowMapSavedSnapshot('moving-d30', { savedAt: '2026-07-01T00:00:00.000Z' }),
      { mapId: 'curated-opic-mock-course', flowSlugs: ['curated-opic-single-mock-review'], personalCopy: { title: 'partial' } }]) {
      const initial: Record<string, string> = { flow_builder_mvp_bundles_v11: '[]' };
      for (const [slug] of heldSlugsAndOriginalReviewDates) {
        const original = originalBundle(slug);
        initial[`flow:saved:${slug}`] = JSON.stringify({
          slug, savedAt: '2026-07-01T00:00:00.000Z', personalTitle: `개인 ${slug}`,
          ...(includeOrigin ? { sourceFlowSlug: slug, sourceFlowKey: original.flow.id } : {}),
        });
        initial[`flow_builder_mvp_checks_${slug}`] = JSON.stringify({ [original.items[0].id]: true });
      }
      if (snapshot) initial[`flow:map:saved:${snapshot.mapId}`] = JSON.stringify(snapshot);
      withReadOnlyStorage(initial, () => {
        const resolved = mergeSourceBackedMyFlowBundles(readBundles());
        const progress = getActiveFlowProgress(resolved);
        for (const [slug] of heldSlugsAndOriginalReviewDates) {
          const restored = resolved.find(bundle => bundle.flow.slug === slug);
          assert.ok(restored, slug);
          assert.equal(restored.flow.status, 'draft', slug);
          assert.ok(restored.flow.tags?.includes(RETIRED_PERSONAL_COPY_TAG), slug);
          assert.equal(restored.flow.id, originalBundle(slug).flow.id, slug);
          assert.deepEqual(restored.items, originalBundle(slug).items, slug);
          assert.equal(progress.find(entry => entry.slug === slug)?.done, 1, slug);
          assert.equal(progress.find(entry => entry.slug === slug)?.title, `개인 ${slug}`, slug);
        }
      });
    }
  }
});

test('CP1 never recovers source rows from another identity, snapshot alone, deleted save, or another owner namespace', () => {
  for (const [slug] of heldSlugsAndOriginalReviewDates) {
    const saved = { slug, savedAt: '2026-07-01T00:00:00.000Z' };
    const fixtures: Record<string, string>[] = [
      {}, // Saved key was removed; stale progress or snapshots are not a new save.
      { [`flow:map:saved:unrelated`]: JSON.stringify({ mapId: 'unrelated', flowSlugs: [slug] }) },
      { [`flow:saved:${slug}`]: 'null' },
      { [`flow:saved:${slug}`]: '{partial' },
      { [`flow:saved:${slug}`]: JSON.stringify({ ...saved, slug: 'another-copy' }) },
      { [`flow:saved:${slug}`]: JSON.stringify({ ...saved, sourceFlowSlug: 'another-source' }) },
      { [`flow:saved:${slug}`]: JSON.stringify({ ...saved, sourceFlowKey: 'another-source-id' }) },
      { [`flow:saved:${slug}`]: JSON.stringify({ ...saved, personalCopyKey: 'another-copy' }) },
      { [`flow:alpha:actor:another-owner:flow:saved:${slug}`]: JSON.stringify(saved) },
    ];
    for (const fixture of fixtures) {
      for (const stored of [[], [originalBundle(slug)]]) {
        withReadOnlyStorage({
          [`flow_builder_mvp_checks_${slug}`]: JSON.stringify({ [originalBundle(slug).items[0].id]: true }),
          ...fixture, flow_builder_mvp_bundles_v11: JSON.stringify(stored) }, () => {
          const resolved = mergeSourceBackedMyFlowBundles(readBundles());
          assert.ok(!resolved.some(bundle => bundle.flow.slug === slug), `${slug}: ${JSON.stringify(fixture)}`);
        });
      }
    }
    const foreignBundle = { ...originalBundle(slug), flow: { ...originalBundle(slug).flow, id: 'another-origin-id' } };
    withReadOnlyStorage({
      flow_builder_mvp_bundles_v11: JSON.stringify([foreignBundle]),
      [`flow:saved:${slug}`]: JSON.stringify(saved),
    }, () => {
      assert.ok(!mergeSourceBackedMyFlowBundles(readBundles()).some(bundle => bundle.flow.slug === slug));
    });
  }
});
