import assert from 'node:assert/strict';
import test from 'node:test';
import { seedBundles } from './seed-flows';
import { isPublicCatalogFlowOnHold, isPublicFlowSourceOnHold, PUBLIC_SOURCE_REVIEW_HOLD_SLUGS } from './public-source-review-policy';
import { getPublicFlowIndexingPolicy } from './route-indexing-policy';
import { getRepresentativeFlowSlugs, normalizeExecutionModel } from './execution-model';
import { classifyFlowSourceFreshness } from './source-freshness';
import { inspectCatalogContentCapability } from './integrated-poc/catalog-content';
import { createProgramData, validateProgramData } from './integrated-poc/program-data';
import { importProgramPublicVersion } from './integrated-poc/private-space';
import { buildUrlFirstStartPackage, lookupUrlFirstP0Input, AJD_MOVING_SOURCE_URL } from './url-first-lookup';

test('the approved hold is exactly twenty-four source slugs, not all forty reviewed sources', () => {
  assert.equal(PUBLIC_SOURCE_REVIEW_HOLD_SLUGS.length, 24);
  assert.equal(new Set(PUBLIC_SOURCE_REVIEW_HOLD_SLUGS).size, 24);
  for (const slug of ['blog-youtube-start', 'first-passport-issue', 'domestic-trip-d7']) {
    assert.equal(isPublicFlowSourceOnHold(slug), false, slug);
  }
  assert.equal(isPublicFlowSourceOnHold('private-childcare-fee-support-apply'), false);
  assert.equal(isPublicCatalogFlowOnHold('catalog-childcare-fee-support-apply'), true);
  assert.equal(isPublicCatalogFlowOnHold('personal-childcare-fee-support-apply'), false);
});

function catalogFixture(flowId: string) {
  const data = createProgramData();
  data.public.flows.push({ id: flowId, ownerId: 'creator-minji', currentVersionId: 'review-policy-v1', category: '검사', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'review-policy-v1', flowId, number: 1, parentVersionId: null, title: '가상 보존 검사', summary: '새 시작과 기존 개인 기록은 별도입니다.',
    items: [{ id: 'review-policy-item', title: '가상 항목', description: '', completionCriteria: '확인', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] }],
    source: { kind: 'simulated-example', label: '가상 검사', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-10-10T00:00:00.000Z' });
  assert.ok(validateProgramData(data));
  return data;
}

test('a direct NEW public import is held with no private mutation or new copy', () => {
  for (const slug of PUBLIC_SOURCE_REVIEW_HOLD_SLUGS) {
  const data = catalogFixture(`catalog-${slug}`);
  const before = JSON.stringify(data);
  const result = importProgramPublicVersion(data, { actorId: data.activeActorId, requestId: 'held-new', expectedSpace: structuredClone(data.spaces[data.activeActorId]),
    versionId: 'review-policy-v1', itemIds: ['review-policy-item'], anchor: null });
  assert.ok(!result.ok && result.reason === 'unresolved');
  assert.equal(JSON.stringify(data), before);
  }
});

test('a stale direct URL start cannot bypass the approved hold or produce save artifacts', () => {
  const allowed = lookupUrlFirstP0Input(AJD_MOVING_SOURCE_URL);
  assert.equal(allowed.canSaveToMyFlow, false);
  assert.equal(allowed.saveMode, 'blocked');
  for (const slug of PUBLIC_SOURCE_REVIEW_HOLD_SLUGS) {
    // Exercise a previously obtained eligible result, not merely a hidden card.
    const staleResult = { ...allowed, status: 'hit' as const, canSaveToMyFlow: true, canExport: true, saveMode: 'direct' as const, flowSlug: slug };
    const before = JSON.stringify(staleResult);
    const result = buildUrlFirstStartPackage(staleResult, { startDate: '2026-10-10', exportMode: 'calendar' });
    assert.equal(result.status, 'blocked', slug);
    assert.equal(result.canSaveToMyFlow, false, slug);
    assert.deepEqual(result.savedFlows, [], slug);
    assert.equal(result.persistenceRecord, undefined, slug);
    assert.equal(result.markdownExport, undefined, slug);
    assert.equal(JSON.stringify(staleResult), before, slug);
  }
});

test('an already saved held-source plan reopens without an additional copy or a source rewrite', () => {
  for (const slug of PUBLIC_SOURCE_REVIEW_HOLD_SLUGS) {
  // Prepare an existing valid private plan before applying the new hold.
  const initial = catalogFixture('catalog-test-before-source-hold');
  const imported = importProgramPublicVersion(initial, { actorId: initial.activeActorId, requestId: 'before-hold', expectedSpace: structuredClone(initial.spaces[initial.activeActorId]),
    versionId: 'review-policy-v1', itemIds: ['review-policy-item'], anchor: null });
  assert.ok(imported.ok);
  const saved = structuredClone(imported.data);
  const heldId = `catalog-${slug}`;
  saved.public.flows.find(flow => flow.id === 'catalog-test-before-source-hold')!.id = heldId;
  saved.public.versions.find(version => version.id === 'review-policy-v1')!.flowId = heldId;
  saved.spaces[saved.activeActorId].copies.find(copy => copy.id === imported.result)!.flowId = heldId;
  assert.ok(validateProgramData(saved));
  const privateBefore = JSON.stringify(saved.spaces[saved.activeActorId]);
  const publicBefore = JSON.stringify(saved.public);
  const reused = importProgramPublicVersion(saved, { actorId: saved.activeActorId, requestId: 'resume-held', expectedSpace: structuredClone(saved.spaces[saved.activeActorId]),
    versionId: 'review-policy-v1', itemIds: ['review-policy-item'], anchor: null });
  assert.ok(reused.ok);
  assert.equal(reused.result, imported.result);
  assert.equal(reused.data.spaces[saved.activeActorId].copies.length, saved.spaces[saved.activeActorId].copies.length);
  assert.equal(JSON.stringify(reused.data.spaces[saved.activeActorId].text), JSON.stringify(saved.spaces[saved.activeActorId].text));
  assert.equal(JSON.stringify(reused.data.public), publicBefore);
  assert.equal(JSON.stringify(saved.spaces[saved.activeActorId]), privateBefore);
  }
});

for (const slug of PUBLIC_SOURCE_REVIEW_HOLD_SLUGS) {
  test(`${slug}: hold blocks new discovery/capability without rewriting the original`, () => {
    const bundle = seedBundles.find(row => row.flow.slug === slug);
    assert.ok(bundle);
    const before = JSON.stringify(bundle);
    assert.equal(getPublicFlowIndexingPolicy(bundle).indexable, false);
    assert.equal(normalizeExecutionModel(bundle).exposureStatus, 'catalog_preview');
    assert.equal(getRepresentativeFlowSlugs().includes(slug), false);
    assert.deepEqual(inspectCatalogContentCapability(slug), { ready: false, sourceSlug: slug, reason: 'review-required' });
    assert.equal(classifyFlowSourceFreshness(bundle, new Date('2026-10-10T00:00:00+09:00')).bucket, 'preview_or_hidden');
    assert.equal(JSON.stringify(bundle), before);
  });
}

test('non-held stale sources still fail the unchanged ninety-day freshness boundary', () => {
  const bundle = seedBundles.find(row => row.flow.slug === 'blog-youtube-start');
  assert.ok(bundle);
  assert.equal(isPublicFlowSourceOnHold(bundle.flow.slug), false);
  const stale = structuredClone(bundle);
  stale.flow.source_checked_at = '2026-07-11';
  assert.equal(classifyFlowSourceFreshness(stale, new Date('2026-10-10T00:00:00+09:00')).bucket, 'review_due');
});
