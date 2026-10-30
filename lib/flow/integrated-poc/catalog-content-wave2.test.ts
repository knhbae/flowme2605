import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';
import { buildCatalogContent, catalogContentFingerprint, CATALOG_CONTENT_V2_INITIAL_SLUGS,
  CATALOG_CONTENT_V2_WAVE2_SLUGS, inspectCatalogContentCapability } from './catalog-content-source';

const pack = buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z');

test('wave2 adds exactly four private capabilities and 28 items without changing the original seven', () => {
  assert.deepEqual(CATALOG_CONTENT_V2_WAVE2_SLUGS, ['samsung-aircon-seasonal-check', 'samsung-washer-filter-cleaning', 'computer-skills-d30-study', 'home-cafe-daily']);
  assert.deepEqual(CATALOG_CONTENT_V2_INITIAL_SLUGS.map(slug => catalogContentFingerprint(buildCatalogContent(slug))),
    ['50b28c88','59f3bf14','ac0069b1','03d85ebc','98c137dd']);
  const expected = [[5,2,'66354569'],[10,3,'ee1b192f'],[9,4,'6c3dbfb2'],[4,2,'192a3aef']];
  let items=0;
  for (const [index,slug] of CATALOG_CONTENT_V2_WAVE2_SLUGS.entries()) {
    const projected=buildCatalogContent(slug); assert(projected.ok);
    assert.equal(projected.itemMapping.length,expected[index][0]);
    assert.equal(projected.sectionMapping.length,expected[index][1]);
    assert.equal(catalogContentFingerprint(projected),expected[index][2]);
    items+=projected.itemMapping.length;
  }
  assert.equal(items,28);
  const counts: Record<string,number>={};
  for(const source of pack.bundles) { const c=inspectCatalogContentCapability(source.flow.slug); const key=c.ready?'ready':c.reason; counts[key]=(counts[key]??0)+1; }
  assert.deepEqual(counts,{ready:13,'review-required':87,archived:21,'not-enabled':28,'unsupported-shape':27,'projection-loss':1});
});

test('wave2 exact original identity and source fields survive; no daily recurrence or source checks invented', () => {
  for(const slug of CATALOG_CONTENT_V2_WAVE2_SLUGS) {
    const source=pack.bundles.find(row=>row.flow.slug===slug)!, result=buildCatalogContent(slug); assert(result.ok);
    const original=structuredClone(source) as any; delete original.flow.status;
    assert.deepEqual(result.content.bundle,original);
    assert(result.document.parseResult.canonical.items.every(item=>!item.sourceChecked&&!item.recurrence));
  }
  const cafe=buildCatalogContent('home-cafe-daily'); assert(cafe.ok);
  assert(cafe.document.parseResult.canonical.items.every(item=>!item.schedule && item.sources.every(link=>link.type==='reference')));
});

test('study keeps nine offsets, four sections and reference versus official attribution', () => {
  const result=buildCatalogContent('computer-skills-d30-study'); assert(result.ok);
  const native=result.document.parseResult.canonical;
  assert.equal(result.content.bundle.flow.anchor_type,'end_date');
  assert.deepEqual(native.items.map(item=>item.schedule?.kind==='relative'?item.schedule.dayOffset:null),[-30,-30,-28,-21,-18,-14,-7,-5,-1]);
  assert.equal(native.steps.length,4); assert.match(result.content.bundle.flow.warning??'',/2027/);
  assert(native.items.every(item=>item.sources.every(link=>link.type==='reference')));
  assert(native.items.flatMap(item=>item.resources).some(link=>link.type==='official'));
});

test('appliance safety distinctions remain in effective canonical details and immutable original', () => {
  const aircon=buildCatalogContent('samsung-aircon-seasonal-check'), filter=buildCatalogContent('samsung-washer-filter-cleaning');
  assert(aircon.ok&&filter.ok);
  assert.match(filter.content.bundle.flow.title,/미세플라스틱 저감장치/);
  assert.match(JSON.stringify(filter.document.parseResult.canonical),/물세척/);
  assert.match(JSON.stringify(filter.document.parseResult.canonical),/전원/);
  assert.match(JSON.stringify(aircon.document.parseResult.canonical),/모델/);
  for(const result of [aircon,filter]) assert(result.document.parseResult.canonical.items.every(item=>!item.schedule&&item.sources.every(link=>link.type==='official')));
});

test('mechanical support does not enable ambiguous anchors or sensitive sources even with low risk labels', () => {
  for(const slug of ['real-samsung-aircon-seasonal-care','welfare-benefit-finder','pension-estimate-check','tax-refund-find','passport-renewal-docs','adult-vaccine-schedule-check','wedding-vendor-board']) {
    assert.equal(buildCatalogContent(slug).ok,false);
    assert.deepEqual(inspectCatalogContentCapability(slug),{ready:false,sourceSlug:slug,reason:'not-enabled'});
  }
});
