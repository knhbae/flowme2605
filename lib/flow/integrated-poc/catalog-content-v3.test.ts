import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';
import { buildCatalogContent, buildCatalogContentV3Candidate, CATALOG_CONTENT_V3_CANDIDATE_SLUGS,
  catalogContentFingerprint, inspectCatalogContentCapability, projectCatalogContent, validateCatalogContent,
  projectCatalogContentV3Candidate, validateCatalogContentV3Candidate, type CatalogContentBundle } from './catalog-content-source';
import { validateTextAuthoringDocument } from './native-creator-vendor/text-authoring/validation';
import { createNativeCreatorDocumentOwner, readNativeCreatorSourceDocument } from './native-creator-document';
import type { NativeCreatorCatalogContentSource } from './native-creator-document-contract';
import { canonicalJson } from './alpha-persistence/json';

const NOW = '2026-09-24T03:00:00.000Z';
const pack = buildCatalogLibrarySnapshot(NOW);
const lines = (value?: string) => (value?.split(/\r?\n/u) ?? []).filter(line => line.trim()).map(line => line.trim());
for (const slug of CATALOG_CONTENT_V3_CANDIDATE_SLUGS) {
  test(`v3 candidate preserves every original field and single-day schedule: ${slug}`, () => {
    const original = pack.bundles.find(row => row.flow.slug === slug)!, before = canonicalJson(original);
    const result = buildCatalogContentV3Candidate(slug); assert(result.ok);
    const expected = structuredClone(original) as any; delete expected.flow.status;
    assert.deepEqual(result.content.bundle, expected);
    assert.equal(result.content.contractVersion, 'flowme-catalog-content-v3');
    assert.equal(validateTextAuthoringDocument(result.document).valid, true);
    assert.equal(result.itemMapping.length, original.items.length);
    assert.equal(result.sectionMapping.length, original.sections.length);
    for (const [index, item] of result.document.parseResult.canonical.items.entries()) {
      const source: CatalogContentBundle['items'][number] = result.content.bundle.items[index];
      const detail: NonNullable<CatalogContentBundle['itemDetails']>[number] = result.content.bundle.itemDetails!.find(d => d.item_id === source.id)!;
      assert.equal(source.duration_days, 1); assert.equal(item.title, source.title);
      assert.equal(item.schedule?.kind, 'relative');
      assert.equal(item.schedule?.kind === 'relative' ? item.schedule.dayOffset : null, source.day_offset);
      assert.equal(item.schedule?.time, undefined); assert.equal(item.schedule?.durationMinutes, undefined);
      assert.equal(item.schedule?.timezone, undefined); assert.equal(item.schedule?.repeat, undefined);
      assert.equal(item.recurrence, undefined); assert.equal(item.sourceChecked, false);
      assert.equal(item.detail, [source.description, detail.why, detail.how, detail.source_fragment_text].flatMap(lines).join('\n'));
      assert.equal(item.completion?.doneWhen, lines(detail.completion_criteria).join('\n'));
      assert.deepEqual(item.resources.map(({ label, url, type }) => ({ label, url, type })), detail.links);
      assert(item.sources.every(link => link.type === 'creator'));
    }
    assert.deepEqual(projectCatalogContentV3Candidate(JSON.parse(JSON.stringify(result.content))), result);
    assert.equal(validateCatalogContent(result.content), true); assert.deepEqual(projectCatalogContent(result.content), result);
    assert.equal(canonicalJson(original), before);
  });
  test(`v3 enters the normal native owner and replay reader: ${slug}`, () => {
    const result = buildCatalogContentV3Candidate(slug); assert(result.ok);
    const source: NativeCreatorCatalogContentSource = { kind: 'catalog-content', version: 1, storageKey: 'flow:catalog-content:v1',
      draftId: `catalog-content:${slug}`, sourceSlug: slug, versionId: result.content.versionId,
      revisionId: result.document.revision.revisionId, contentJson: canonicalJson(result.content), documentJson: canonicalJson(result.document) };
    const before = canonicalJson(source);
    const created = createNativeCreatorDocumentOwner({ id: 'candidate-only', source }, NOW); assert(created.ok);
    assert.deepEqual(readNativeCreatorSourceDocument(JSON.parse(JSON.stringify(source))), result.document);
    assert.equal(canonicalJson(source), before);
  });
}
test('v3 activates exactly two sources and nineteen rows; all other unconnected sources stay closed', () => {
  assert.deepEqual(CATALOG_CONTENT_V3_CANDIDATE_SLUGS, ['curated-opic-single-mock-review', 'curated-opic-course-row-import']);
  let count = 0;
  for (const slug of CATALOG_CONTENT_V3_CANDIDATE_SLUGS) {
    const result = buildCatalogContentV3Candidate(slug); assert(result.ok); count += result.itemMapping.length;
    assert.deepEqual(buildCatalogContent(slug), result); assert.equal(inspectCatalogContentCapability(slug).ready, true);
  }
  assert.equal(count, 19);
  const ready = pack.bundles.filter(row => inspectCatalogContentCapability(row.flow.slug).ready);
  assert.equal(ready.length, 13);
  assert.equal(ready.reduce((sum, row) => sum + row.items.length, 0), 103);
  const unavailable = pack.bundles.filter(row => !inspectCatalogContentCapability(row.flow.slug).ready);
  assert.equal(unavailable.length, 164);
  for (const slug of [...unavailable.map(row => row.flow.slug), 'unknown']) assert.equal(buildCatalogContent(slug).ok, false);
  for (const slug of ['source-backed-moving-d30', 'curated-reading-monthly-log', 'infant-health-checkup-schedule', 'weekly-meal-plan', 'unknown']) assert.equal(buildCatalogContentV3Candidate(slug).ok, false);
});
test('nineteen rows retain daily/weekly row offsets without inventing daily repeats or dropping rest rows', () => {
  const first = buildCatalogContentV3Candidate(CATALOG_CONTENT_V3_CANDIDATE_SLUGS[0]);
  const second = buildCatalogContentV3Candidate(CATALOG_CONTENT_V3_CANDIDATE_SLUGS[1]); assert(first.ok && second.ok);
  assert.deepEqual(first.content.bundle.items.map(i => i.day_offset), Array.from({ length: 14 }, (_, i) => i));
  assert.deepEqual(second.content.bundle.items.map(i => i.day_offset), [0, 7, 14, 21, 28]);
  assert.equal(first.document.parseResult.canonical.items.filter(i => i.title.includes('휴식')).length, 2);
  assert.equal(second.document.parseResult.canonical.items.length, 5);
  assert(second.document.parseResult.canonical.items.every(i => !i.recurrence && /3번씩/.test(i.title)));
});
test('tampered duration, date window, recurrence, ownership and source cannot be legitimized by a new fingerprint', () => {
  const result = buildCatalogContentV3Candidate(CATALOG_CONTENT_V3_CANDIDATE_SLUGS[0]); assert(result.ok);
  for (const mutate of [...[0, 2, -1, 1.5, '1', true, null].map(duration => (v: any) => v.bundle.items[0].duration_days = duration),
    (v: any) => delete v.bundle.items[0].duration_days, (v: any) => delete v.bundle.items[0].day_offset,
    (v: any) => v.bundle.items[0].time = '09:00', (v: any) => v.bundle.items[0].durationMinutes = 1440,
    (v: any) => v.bundle.items[0].date_window = { start_day_offset: 0, end_day_offset: 2, label: 'range' },
    (v: any) => v.bundle.items[0].repeat_rule = 'daily', (v: any) => v.bundle.items[0].day_offset = 1,
    (v: any) => v.bundle.items[0].source_type = 'official', (v: any) => v.bundle.flow.owner_user_id = 'forged',
    (v: any) => v.bundle.itemDetails[0].how = 'invented', (v: any) => v.bundle.flow.source_checked_at = '2026-09-24',
    (v: any) => v.catalogVersion = 'new', (v: any) => v.extra = true]) {
    const changed: any = structuredClone(result.content); mutate(changed);
    changed.versionId = `catalog-content-v3-${changed.sourceSlug}-${catalogContentFingerprint({ catalogVersion: changed.catalogVersion, bundle: changed.bundle })}`;
    assert.equal(validateCatalogContentV3Candidate(changed), false); assert.equal(projectCatalogContentV3Candidate(changed).ok, false);
    assert.equal(validateCatalogContent(changed), false); assert.equal(projectCatalogContent(changed).ok, false);
  }
});
test('v3 content cannot be downgraded to v2 or passed through an arbitrary source slug', () => {
  const result = buildCatalogContentV3Candidate(CATALOG_CONTENT_V3_CANDIDATE_SLUGS[0]); assert(result.ok);
  for (const patch of [{ contractVersion: 'flowme-catalog-content-v2' }, { sourceSlug: 'travel-packing-list' }, { versionId: 'forged' }]) {
    assert.equal(validateCatalogContent({ ...result.content, ...patch }), false);
    assert.equal(validateCatalogContentV3Candidate({ ...result.content, ...patch }), false);
  }
});
