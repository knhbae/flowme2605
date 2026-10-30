import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';
import type { FlowBundle, FlowItem, FlowItemDetail } from '../types';
import type { CanonicalAuthoringItem } from './native-creator-vendor/text-authoring/types';
import { validateTextAuthoringDocument } from './native-creator-vendor/text-authoring/validation';
import { adaptCatalogContentBundle, buildCatalogContent, CATALOG_CONTENT_SLUGS, CATALOG_CONTENT_V2_SLUGS, CATALOG_CONTENT_V3_SLUGS, CATALOG_CONTENT_V2_INITIAL_SLUGS,
  catalogContentFingerprint, inspectCatalogContentCapability, projectCatalogContent, validateCatalogContent } from './catalog-content-source';
const pack = buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z');
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const lines = (text?: string) => (text?.split(/\r?\n/u) ?? []).filter(line => line.trim()).map(line => line.trim());
const source = (slug: string) => clone(pack.bundles.find(row => row.flow.slug === slug)!) as unknown as FlowBundle;

test('v1 two-source projection and replay preserve pre-v2 golden results', () => {
  assert.deepEqual(CATALOG_CONTENT_SLUGS, ['moving-d30-basic', 'chiangmai-solo-trip-packing']);
  for (const [index, slug] of CATALOG_CONTENT_SLUGS.entries()) {
    const result = buildCatalogContent(slug); assert.ok(result.ok); if (!result.ok) continue;
    assert.equal(catalogContentFingerprint(result), ['680ac14c', '9e37ede2'][index]);
    assert.equal(result.content.contractVersion, 'flowme-catalog-content-v1');
    assert.equal('catalogVersion' in result.content, false);
    assert.deepEqual(projectCatalogContent(clone(result.content)), result);
  }
});

test('frozen v2 initial five explicit private copies retain 26 unchanged Items', () => {
  let items = 0;
  for (const slug of CATALOG_CONTENT_V2_INITIAL_SLUGS) {
    const result = buildCatalogContent(slug); assert.ok(result.ok); if (!result.ok) continue;
    assert.equal(result.content.contractVersion, 'flowme-catalog-content-v2');
    assert.equal('catalogVersion' in result.content && result.content.catalogVersion, pack.catalogVersion);
    const original = source(slug) as any; delete original.flow.status;
    assert.deepEqual(result.content.bundle, original);
    assert.equal(result.content.bundle.flow.raw_text, original.flow.raw_text);
    assert.notEqual(result.document.rawText, original.flow.raw_text);
    assert.equal(result.document.ownership, 'creator');
    assert.equal(result.document.revisionHistory.length, 1);
    assert.equal(validateTextAuthoringDocument(result.document).valid, true);
    assert.deepEqual(result, projectCatalogContent(clone(result.content)));
    assert.deepEqual(result, buildCatalogContent(slug));
    items += result.itemMapping.length;
  }
  assert.equal(items, 26);
});

test('v2 canonical fields retain every source explanation, how, completion, caution and link attribution', () => {
  for (const slug of CATALOG_CONTENT_V2_SLUGS) {
    const result = buildCatalogContent(slug); assert.ok(result.ok); if (!result.ok) continue;
    for (const mapping of result.itemMapping) {
      const original: FlowItem = result.content.bundle.items.find(item => item.id === mapping.sourceItemId)!;
      const detail: FlowItemDetail | undefined = result.content.bundle.itemDetails?.find(item => item.item_id === original.id);
      const item: CanonicalAuthoringItem = result.document.parseResult.canonical.items.find(item => item.itemId === mapping.nativeItemId)!;
      assert.equal(item.title, original.title);
      assert.equal(item.detail ?? '', [original.description, detail?.why, detail?.how, detail?.source_fragment_text].flatMap(lines).join('\n'));
      assert.equal(item.sourceDetail ?? '', item.detail ?? '');
      assert.equal(item.completion?.doneWhen ?? '', lines(detail?.completion_criteria).join('\n'));
      assert.deepEqual(item.cautions, lines(detail?.caution));
      assert.deepEqual(item.resources.map(({ label, url, type }) => ({ label, url, type })), detail?.links ?? []);
      assert.deepEqual(item.sources.map(({ label, url, type }) => ({ label, url, type })), [{
        label: result.content.bundle.flow.source_title || '출처', url: result.content.bundle.flow.source_url,
        type: original.source_type === 'official' ? 'official' : original.source_type === 'creator_experience' ? 'creator' : 'reference',
      }]);
      assert.equal(item.sourceChecked, false); assert.equal(item.recurrence, undefined); assert.equal(item.included, true);
      if (original.day_offset === undefined) assert.equal(item.schedule, undefined);
      else { assert.equal(item.schedule?.kind, 'relative'); if (item.schedule?.kind === 'relative') assert.equal(item.schedule.dayOffset, original.day_offset); }
    }
    assert.equal(new Set(result.itemMapping.map(item => item.nativeItemId)).size, result.itemMapping.length);
    assert.equal(new Set(result.sectionMapping.map(item => item.nativeStepId)).size, result.sectionMapping.length);
  }
});

test('flow and section common context remains exact in immutable source, never rewritten as new actions', () => {
  for (const slug of CATALOG_CONTENT_V2_SLUGS) {
    const original = source(slug), result = buildCatalogContent(slug); assert.ok(result.ok); if (!result.ok) continue;
    for (const field of ['description', 'warning', 'stop_conditions', 'principles', 'hold_section', 'source_checked_at', 'owner_user_id', 'creator_name'] as const) {
      assert.deepEqual(result.content.bundle.flow[field], original.flow[field]);
    }
    assert.deepEqual(result.content.bundle.sections, original.sections);
    assert.equal(result.document.parseResult.canonical.items.length, original.items.length);
    assert.equal(result.document.parseResult.canonical.steps.length, original.sections.length);
  }
});

test('v2 cannot be forged by editing a field and recomputing the non-security fingerprint', () => {
  const result = buildCatalogContent('travel-packing-list'); assert.ok(result.ok); if (!result.ok) return;
  for (const mutate of [
    (v: any) => { v.bundle.items[0].title = 'replaced title'; },
    (v: any) => { v.bundle.items[0].source_type = 'official'; },
    (v: any) => { v.bundle.itemDetails[0].completion_criteria = 'changed criterion'; },
    (v: any) => { v.bundle.itemDetails[0].source_fragment_text = 'invented original'; },
    (v: any) => { v.bundle.itemDetails[0].links[0].type = 'official'; },
    (v: any) => { v.bundle.itemDetails[0].links[0].label = 'officially verified'; },
    (v: any) => { v.bundle.flow.warning = ''; },
    (v: any) => { v.bundle.flow.source_checked_at = '2026-09-23'; },
    (v: any) => { v.bundle.flow.raw_text = 'current variant instead'; },
    (v: any) => { v.bundle.sections[0].description = 'new section metadata'; },
    (v: any) => { v.bundle.items[0].duration_days = 2; },
    (v: any) => { v.bundle.items[0].repeat_rule = 'weekly'; },
    (v: any) => { v.bundle.recipes = [{ id: 'recipe' }]; },
    (v: any) => { v.catalogVersion = 'new-pack'; },
    (v: any) => { v.extra = true; },
  ]) {
    const changed: any = clone(result.content); mutate(changed);
    changed.versionId = `catalog-content-v2-${changed.sourceSlug}-${catalogContentFingerprint({ catalogVersion: changed.catalogVersion, bundle: changed.bundle })}`;
    assert.equal(validateCatalogContent(changed), false); assert.equal(projectCatalogContent(changed).ok, false);
  }
  const downgraded: any = clone(result.content); downgraded.contractVersion = 'flowme-catalog-content-v1'; delete downgraded.catalogVersion;
  downgraded.versionId = `catalog-content-${downgraded.sourceSlug}-${catalogContentFingerprint(downgraded.bundle)}`;
  assert.equal(validateCatalogContent(downgraded), false);
});

test('v2 source builder rejects altered current variants and ignores only publication use counters', () => {
  const original = source('closet-organize-1day'), result = buildCatalogContent(original.flow.slug);
  assert.deepEqual(adaptCatalogContentBundle(original), result);
  original.flow.usage_count = 91; original.flow.copy_count = 52;
  assert.deepEqual(adaptCatalogContentBundle(original), result);
  original.items[0].description = 'mutable seed differs';
  assert.equal(adaptCatalogContentBundle(original).ok, false);
  for (const variant of pack.variants) assert.equal(adaptCatalogContentBundle(variant.bundle as unknown as FlowBundle).ok, false);
});

test('capability covers all 177 without converting source exposure into permission; only explicit locators ready', () => {
  const capabilities = pack.bundles.map(bundle => inspectCatalogContentCapability(bundle.flow.slug));
  assert.equal(capabilities.length, 177);
  assert.deepEqual(capabilities.filter(row => row.ready).map(row => row.sourceSlug).sort(), [...CATALOG_CONTENT_SLUGS, ...CATALOG_CONTENT_V2_SLUGS, ...CATALOG_CONTENT_V3_SLUGS].sort());
  for (const row of capabilities) {
    if (row.ready) { const projected = buildCatalogContent(row.sourceSlug); assert.ok(projected.ok); if (projected.ok) assert.equal(row.sourceVersionId, projected.content.versionId); }
    else assert.equal(buildCatalogContent(row.sourceSlug).ok, false);
  }
  const reason = (slug: string) => { const row = inspectCatalogContentCapability(slug); assert.equal(row.ready, false); return row.ready ? null : row.reason; };
  assert.equal(reason('opic-2w'), 'archived');
  assert.equal(reason('digital-detox-weekly'), 'archived');
  assert.equal(reason('dog-adoption-first-week'), 'review-required');
  assert.equal(reason('baby-food-menu-recipe'), 'review-required');
  assert.equal(reason('weekly-meal-plan'), 'unsupported-shape');
  assert.equal(reason('infant-health-checkup-schedule'), 'unsupported-shape');
  assert.equal(reason('wedding-d180-basic'), 'projection-loss');
  assert.equal(reason('passport-renewal-docs'), 'not-enabled');
  assert.equal(reason('unknown'), 'not-enabled');
});
