import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';
import { CATALOG_LIBRARY_VERSION } from './catalog-library';
import { CATALOG_CONTENT_SEALS } from './catalog-content-seals';
import { buildCatalogContent, catalogContentFingerprint, CATALOG_CONTENT_V2_INITIAL_SLUGS, CATALOG_CONTENT_V2_VERSION,
  CATALOG_CONTENT_V2_WAVE2_SLUGS, inspectCatalogContentCapability, projectCatalogContent, validateCatalogContent } from './catalog-content-source';

const pack = buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z');
// Frozen replay must not select a newly reviewed source edition.
const projectFrozenV2Content = (slug: string) => {
  const original = structuredClone(pack.bundles.find(row => row.flow.slug === slug)!);
  const { status: _status, usage_count: _uses, copy_count: _copies, ...flow } = original.flow;
  const content = { contractVersion: CATALOG_CONTENT_V2_VERSION, catalogVersion: CATALOG_LIBRARY_VERSION,
    sourceSlug: slug, versionId: CATALOG_CONTENT_SEALS[slug].versionId, bundle: { ...original, flow } };
  assert.equal(pack.catalogVersion, CATALOG_LIBRARY_VERSION);
  assert.equal(validateCatalogContent(content), true);
  return projectCatalogContent(content);
};

test('wave2 adds exactly four private capabilities and 28 items without changing the original seven', () => {
  assert.deepEqual(CATALOG_CONTENT_V2_WAVE2_SLUGS, ['samsung-aircon-seasonal-check', 'samsung-washer-filter-cleaning', 'computer-skills-d30-study', 'home-cafe-daily']);
  assert.deepEqual(CATALOG_CONTENT_V2_INITIAL_SLUGS.map(slug => catalogContentFingerprint(projectFrozenV2Content(slug))),
    ['50b28c88','59f3bf14','ac0069b1','03d85ebc','98c137dd']);
  const expected = [[5,2,'66354569'],[10,3,'ee1b192f'],[9,4,'6c3dbfb2'],[4,2,'192a3aef']];
  let items=0;
  for (const [index,slug] of CATALOG_CONTENT_V2_WAVE2_SLUGS.entries()) {
    const projected=projectFrozenV2Content(slug); assert(projected.ok);
    assert.equal(projected.itemMapping.length,expected[index][0]);
    assert.equal(projected.sectionMapping.length,expected[index][1]);
    assert.equal(catalogContentFingerprint(projected),expected[index][2]);
    items+=projected.itemMapping.length;
  }
  assert.equal(items,28);
  const counts: Record<string,number>={'projection-loss':0};
  for(const source of pack.bundles) { const c=inspectCatalogContentCapability(source.flow.slug); const key=c.ready?'ready':c.reason; counts[key]=(counts[key]??0)+1; }
  // Frozen wave2 bytes, row counts and golden fingerprints above stay exact.
  // Nine additional sources are enabled only by their separate passed edition.
  assert.deepEqual(counts,{ready:20,'review-required':98,archived:21,'not-enabled':17,'unsupported-shape':21,'projection-loss':0});
});

test('wave2 exact original identity and source fields survive; no daily recurrence or source checks invented', () => {
  for(const slug of CATALOG_CONTENT_V2_WAVE2_SLUGS) {
    const source=pack.bundles.find(row=>row.flow.slug===slug)!, result=projectFrozenV2Content(slug); assert(result.ok);
    const original=structuredClone(source) as any; delete original.flow.status;
    assert.deepEqual(result.content.bundle,original);
    assert(result.document.parseResult.canonical.items.every(item=>!item.sourceChecked&&!item.recurrence));
  }
  const cafe=projectFrozenV2Content('home-cafe-daily'); assert(cafe.ok);
  assert(cafe.document.parseResult.canonical.items.every(item=>!item.schedule && item.sources.every(link=>link.type==='reference')));
});

test('study keeps nine offsets, four sections and reference versus official attribution', () => {
  const result=projectFrozenV2Content('computer-skills-d30-study'); assert(result.ok);
  const native=result.document.parseResult.canonical;
  assert.equal(result.content.bundle.flow.anchor_type,'end_date');
  assert.deepEqual(native.items.map(item=>item.schedule?.kind==='relative'?item.schedule.dayOffset:null),[-30,-30,-28,-21,-18,-14,-7,-5,-1]);
  assert.equal(native.steps.length,4); assert.match(result.content.bundle.flow.warning??'',/2027/);
  assert(native.items.every(item=>item.sources.every(link=>link.type==='reference')));
  assert(native.items.flatMap(item=>item.resources).some(link=>link.type==='official'));
});

test('appliance safety distinctions remain in effective canonical details and immutable original', () => {
  const aircon=projectFrozenV2Content('samsung-aircon-seasonal-check'), filter=projectFrozenV2Content('samsung-washer-filter-cleaning');
  assert(aircon.ok&&filter.ok);
  assert.match(filter.content.bundle.flow.title,/미세플라스틱 저감장치/);
  assert.match(JSON.stringify(filter.document.parseResult.canonical),/물세척/);
  assert.match(JSON.stringify(filter.document.parseResult.canonical),/전원/);
  assert.match(JSON.stringify(aircon.document.parseResult.canonical),/모델/);
  for(const result of [aircon,filter]) assert(result.document.parseResult.canonical.items.every(item=>!item.schedule&&item.sources.every(link=>link.type==='official')));
});

test('mechanical support does not enable ambiguous anchors or sensitive sources even with low risk labels', () => {
  for(const [slug,reason] of [
    ['real-samsung-aircon-seasonal-care','not-enabled'],
    ['welfare-benefit-finder','review-required'],
    ['pension-estimate-check','review-required'],
    ['tax-refund-find','review-required'],
    ['passport-renewal-docs','review-required'],
    ['adult-vaccine-schedule-check','not-enabled'],
    ['wedding-vendor-board','not-enabled'],
  ] as const) {
    assert.equal(buildCatalogContent(slug).ok,false);
    assert.deepEqual(inspectCatalogContentCapability(slug),{ready:false,sourceSlug:slug,reason});
  }
});
