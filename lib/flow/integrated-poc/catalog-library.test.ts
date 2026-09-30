import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { seedBundles } from '../seed-flows';
import { mergeSourceBackedMyFlowBundles, sourceBackedMyFlowMaps } from '../source-backed-my-flow';
import { validateCatalogLibrarySnapshot, catalogLibrarySummary, CATALOG_LIBRARY_VERSION } from './catalog-library';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';
import type { FlowBundle } from '../types';
const NOW = '2026-09-23T12:00:00.000Z';
const clone = <T>(v: T): T => structuredClone(v);
const stable = (v: any): string => Array.isArray(v) ? `[${v.map(stable).join(',')}]` : v && typeof v === 'object'
  ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}` : JSON.stringify(v);
const stripCounters = (b: any) => { const v = clone(b); delete v.flow.usage_count; delete v.flow.copy_count; return JSON.parse(JSON.stringify(v)); };
const fingerprint = (value: unknown) => createHash('sha256').update(stable(value)).digest('hex');
// Public review metadata only; the sealed 2026-09-23 source stays immutable.
// Evidence: docs/content-audit/2026-09-30-core-ux-publish-source-review.md.
const reviewedSourceDelta = Object.freeze({
  slugs: Object.freeze(['opic-2w', 'opic-1m', 'new-car-7-step', 'moving-dday', 'wedding-timeline', 'wedding-vendor-board']),
  oldDate: '2026-07-01T00:00:00+09:00', newDate: '2026-09-30',
  vendor: Object.freeze({ slug: 'wedding-vendor-board',
    oldUrl: 'https://blog.naver.com/wilklove/223518896995',
    newUrl: 'https://gongysd.com/wedding-notion/?bmode=view&idx=167989966',
    oldSourceType: 'creator_experience' as const, newSourceType: 'reference' as const,
    oldLinkType: 'creator' as const, newLinkType: 'reference' as const }),
});

function assertRetainedSource(saved: FlowBundle | undefined, current: FlowBundle) {
  const slug = current.flow.slug;
  assert(saved, `${slug}: missing frozen source`);
  const comparable: FlowBundle = stripCounters(current);
  const changed = fingerprint(saved) !== fingerprint(comparable);
  if (reviewedSourceDelta.slugs.includes(slug)) {
    for (const field of ['source_checked_at', 'updated_at'] as const) {
      assert.equal(saved.flow[field], reviewedSourceDelta.oldDate, `${slug}: frozen ${field}`);
      assert.equal(comparable.flow[field], reviewedSourceDelta.newDate, `${slug}: reviewed ${field}`);
      comparable.flow[field] = reviewedSourceDelta.oldDate;
    }
    const vendor = reviewedSourceDelta.vendor;
    if (slug === vendor.slug) {
      assert.equal(saved.flow.source_url, vendor.oldUrl); assert.equal(comparable.flow.source_url, vendor.newUrl);
      assert.equal(saved.items[0]?.source_type, vendor.oldSourceType);
      assert.equal(comparable.items[0]?.source_type, vendor.newSourceType);
      const oldLink = saved.itemDetails?.[0]?.links?.[0], newLink = comparable.itemDetails?.[0]?.links?.[0];
      assert(oldLink && newLink, `${slug}: missing retained source link`);
      assert.equal(oldLink.url, vendor.oldUrl); assert.equal(newLink.url, vendor.newUrl);
      assert.equal(oldLink.type, vendor.oldLinkType); assert.equal(newLink.type, vendor.newLinkType);
      comparable.flow.source_url = vendor.oldUrl;
      comparable.items[0].source_type = vendor.oldSourceType;
      newLink.url = vendor.oldUrl; newLink.type = vendor.oldLinkType;
    }
  }
  // Compare every retained field, but never print private nested source on failure.
  assert.equal(fingerprint(saved), fingerprint(comparable), `${slug}: unreviewed source delta`);
  return changed;
}

test('full source library has 177 unique bundles, 957 items, 371 sections, 26 maps and two explicit variants', () => {
  const s = buildCatalogLibrarySnapshot(NOW); assert(validateCatalogLibrarySnapshot(s));
  assert.deepEqual(catalogLibrarySummary(s), { bundles: 177, maps: 26, variants: 2, items: 957, sections: 371, runtimeExcluded: 21, runtimeIncluded: 156 });
  assert.equal(new Set(s.bundles.map(b => b.flow.id)).size, 177); assert.equal(new Set(s.bundles.map(b => b.flow.slug)).size, 177);
  assert.deepEqual(s.variants.map(v => v.slug), ['dog-adoption-first-week', 'ev-subsidy-apply']);
});
test('frozen source retains every field except counters and the exact public review delta', () => {
  const s = buildCatalogLibrarySnapshot(NOW);
  const current = mergeSourceBackedMyFlowBundles(seedBundles), changed: string[] = [];
  const frozenBefore = fingerprint(s), currentBefore = fingerprint(current);
  for (const b of current) {
    const saved = s.variants.find(v => v.slug === b.flow.slug)?.bundle ?? s.bundles.find(v => v.flow.slug === b.flow.slug);
    if (assertRetainedSource(saved, b)) changed.push(b.flow.slug);
  }
  assert.deepEqual(changed.sort(), [...reviewedSourceDelta.slugs].sort());
  assert.equal(fingerprint(s.maps), fingerprint(JSON.parse(JSON.stringify(sourceBackedMyFlowMaps))));
  assert.equal(fingerprint(s), frozenBefore); assert.equal(fingerprint(current), currentBefore);
  for (const b of [...s.bundles, ...s.variants.map(v => v.bundle)]) {
    assert(!Object.hasOwn(b.flow, 'usage_count')); assert(!Object.hasOwn(b.flow, 'copy_count'));
    assert.equal(b.flow.status, 'published'); // original provenance, not a new publication
  }
});

test('retention rejects a review-date change on an unreviewed source', () => {
  const s = buildCatalogLibrarySnapshot(NOW);
  const current = clone(mergeSourceBackedMyFlowBundles(seedBundles).find(b => !reviewedSourceDelta.slugs.includes(b.flow.slug))!);
  const saved = s.variants.find(v => v.slug === current.flow.slug)?.bundle ?? s.bundles.find(v => v.flow.slug === current.flow.slug);
  assertRetainedSource(saved, current);
  current.flow.source_checked_at = reviewedSourceDelta.newDate;
  assert.throws(() => assertRetainedSource(saved, current), /unreviewed source delta/);
});

test('reviewed source allowance never admits changed title, raw text or item content', () => {
  const s = buildCatalogLibrarySnapshot(NOW), saved = s.bundles.find(b => b.flow.slug === 'opic-2w')!;
  const source = mergeSourceBackedMyFlowBundles(seedBundles).find(b => b.flow.slug === saved.flow.slug)!;
  for (const mutate of [
    (b: FlowBundle) => { b.flow.title += ' synthetic mutation'; },
    (b: FlowBundle) => { b.flow.raw_text = `${b.flow.raw_text ?? ''}\nsynthetic mutation`; },
    (b: FlowBundle) => { b.items[0].title += ' synthetic mutation'; },
  ]) {
    const changed = clone(source); mutate(changed);
    assert.throws(() => assertRetainedSource(saved, changed), /unreviewed source delta/);
  }
});

test('retention pins both historical and reviewed metadata while the frozen validator rejects the new date', () => {
  const s = buildCatalogLibrarySnapshot(NOW), saved = s.bundles.find(b => b.flow.slug === reviewedSourceDelta.vendor.slug)!;
  const source = mergeSourceBackedMyFlowBundles(seedBundles).find(b => b.flow.slug === saved.flow.slug)!;
  for (const side of ['frozen', 'current'] as const) {
    for (const mutate of [
      (b: FlowBundle) => { b.flow.source_checked_at = '2026-09-29'; },
      (b: FlowBundle) => { b.flow.updated_at = '2026-09-29'; },
      (b: FlowBundle) => { b.flow.source_url = 'https://example.invalid/unreviewed'; },
      (b: FlowBundle) => { b.items[0].source_type = 'official'; },
      (b: FlowBundle) => { b.itemDetails![0].links![0].url = 'https://example.invalid/unreviewed'; },
      (b: FlowBundle) => { b.itemDetails![0].links![0].type = 'official'; },
    ]) {
      const before = clone(saved), after = clone(source); mutate(side === 'frozen' ? before : after);
      assert.throws(() => assertRetainedSource(before, after), assert.AssertionError);
    }
  }
  saved.flow.source_checked_at = reviewedSourceDelta.newDate;
  saved.flow.updated_at = reviewedSourceDelta.newDate;
  assert.equal(validateCatalogLibrarySnapshot(s), false);
});
test('original previous-PoC variants remain distinct from newer source revisions', () => {
  const s = buildCatalogLibrarySnapshot(NOW); const ev = s.bundles.find(b => b.flow.slug === 'ev-subsidy-apply')!;
  const evNew = s.variants.find(v => v.slug === ev.flow.slug)!.bundle;
  assert.equal(ev.flow.source_checked_at, '2026-07-12'); assert.equal(evNew.flow.source_checked_at, '2026-09-07');
  assert.notEqual(ev.flow.source_url, evNew.flow.source_url); assert.notEqual(ev.flow.raw_text, evNew.flow.raw_text);
  const dog = s.bundles.find(b => b.flow.slug === 'dog-adoption-first-week')!;
  assert.equal(dog.flow.source_title, '강아지 입양 전 준비 가이드 참고');
  assert.notEqual(dog.flow.source_title, s.variants.find(v => v.slug === dog.flow.slug)!.bundle.flow.source_title);
});
test('all 42 Map references resolve, including eight archived children; orphan bundle retained', () => {
  const s = buildCatalogLibrarySnapshot(NOW); const slugs = new Set(s.bundles.map(b => b.flow.slug));
  const refs = s.maps.flatMap(m => m.flowSlugs); assert.equal(refs.length, 42); assert.equal(new Set(refs).size, 42);
  assert(refs.every(slug => slugs.has(slug)));
  const archived = new Set(s.policies.flows.filter(p => p.runtimeExcluded).map(p => p.slug));
  assert.equal(refs.filter(slug => archived.has(slug)).length, 8);
  assert(slugs.has('curated-allblanc-lower-body')); assert(!refs.includes('curated-allblanc-lower-body'));
});
test('content-only does not erase static check status or invent missing original raw', () => {
  const s = buildCatalogLibrarySnapshot(NOW); const items = s.bundles.flatMap(b => b.items);
  assert.equal(items.filter(i => i.status === 'check').length, 13);
  assert.equal(items.filter(i => i.duration_days !== undefined).length, 174);
  assert.equal(items.filter(i => i.repeat_rule !== undefined).length, 46);
  assert.equal(items.filter(i => i.date_window !== undefined).length, 37);
  assert.equal(s.bundles.filter(b => b.flow.raw_text === undefined).length, 85);
  assert.equal(s.bundles.filter(b => b.flow.owner_user_id !== undefined).length, 153);
});
test('version is SHA256 of the frozen payload rather than a mutable runtime registry', () => {
  const { schema: _schema, importedAt: _time, catalogVersion, ...payload } = buildCatalogLibrarySnapshot(NOW);
  assert.equal(catalogVersion, `flowme-previous-poc-content-20260923-sha256-${createHash('sha256').update(stable(payload)).digest('hex')}`);
  assert.equal(catalogVersion, CATALOG_LIBRARY_VERSION);
});
test('building detaches all nested fields and supports a new import time without mutating the pack', () => {
  const first = buildCatalogLibrarySnapshot(NOW); first.bundles[0].items[0].title = 'tampered'; first.maps[0].flowSlugs.length = 0;
  assert(!validateCatalogLibrarySnapshot(first));
  const second = buildCatalogLibrarySnapshot('2026-10-01T00:00:00.000Z'); assert(validateCatalogLibrarySnapshot(second));
  assert.notEqual(second.bundles[0].items[0].title, 'tampered'); assert(second.maps[0].flowSlugs.length);
});
test('validator rejects personal fields, metadata/source/policy tampering and missing identity/references', () => {
  const mutations: ((s: any) => void)[] = [
    s => { s.bundles[0].flow.usage_count = 1; }, s => { s.bundles[0].flow.copy_count = 1; },
    s => { s.bundles[0].items[0].completedAt = NOW; }, s => { s.bundles[0].items[0].memo = 'private'; },
    s => { s.bundles[0].flow.owner_user_id = 'new-owner'; }, s => { s.bundles[0].flow.raw_text += 'changed'; },
    s => { s.bundles[0].flow.source_checked_at = '2099-01-01'; }, s => { s.policies.flows[0].indexing.indexable = false; },
    s => { s.bundles[1].flow.id = s.bundles[0].flow.id; }, s => { s.bundles[1].flow.slug = s.bundles[0].flow.slug; },
    s => { s.bundles[0].items[0].section_id = 'absent'; }, s => { s.maps[0].flowSlugs[0] = 'absent'; },
    s => { s.maps[1].id = s.maps[0].id; }, s => { s.bundles.pop(); }, s => { s.variants.pop(); },
    s => { s.legacyUndo = {}; }, s => { s.catalogVersion += 'changed'; }, s => { s.importedAt = 'not-a-time'; },
    s => { s.bundles[0].unknown = null; }, s => { s.maps[0].usageHistory = []; },
  ];
  for (const mutation of mutations) { const s = buildCatalogLibrarySnapshot(NOW); mutation(s); assert.equal(validateCatalogLibrarySnapshot(s), false); }
});
test('descriptor-safe validation rejects getters, prototypes, sparse arrays, cycles and resource bombs', () => {
  const getter = buildCatalogLibrarySnapshot(NOW); let called = false;
  Object.defineProperty(getter, 'bundles', { enumerable: true, get() { called = true; throw Error('must not execute'); } });
  assert.equal(validateCatalogLibrarySnapshot(getter), false); assert.equal(called, false);
  for (const mutate of [
    (s: any) => { Object.setPrototypeOf(s, { x: 1 }); }, (s: any) => { s.extra = s; },
    (s: any) => { Object.setPrototypeOf(s.bundles, { map() { throw Error('must not run inherited method'); } }); },
    (s: any) => { delete s.bundles[0]; }, (s: any) => { s[Symbol('x')] = true; },
    (s: any) => { s.extra = NaN; }, (s: any) => { s.extra = 'x'.repeat(3_000_001); },
    (s: any) => { s.extra = JSON.parse('{"__proto__":{}}'); },
    (s: any) => { let v: any = {}; s.extra = v; for (let i = 0; i < 65; i++) { v.next = {}; v = v.next; } },
  ]) { const s = buildCatalogLibrarySnapshot(NOW); mutate(s); assert.equal(validateCatalogLibrarySnapshot(s), false); }
  for (const bad of [null, undefined, {}, [], 1, 'x']) assert.equal(validateCatalogLibrarySnapshot(bad), false);
  assert.throws(() => buildCatalogLibrarySnapshot('2026-09-23'));
});
test('existing snapshot validation does not consult a changed live seed or Map policy', () => {
  const s = buildCatalogLibrarySnapshot(NOW); const oldTitle = seedBundles[0].flow.title; const oldMap = sourceBackedMyFlowMaps[0].title;
  try { seedBundles[0].flow.title = 'future seed'; sourceBackedMyFlowMaps[0].title = 'future map';
    assert(validateCatalogLibrarySnapshot(s)); assert.deepEqual(buildCatalogLibrarySnapshot(NOW), s);
  } finally { seedBundles[0].flow.title = oldTitle; sourceBackedMyFlowMaps[0].title = oldMap; }
});
