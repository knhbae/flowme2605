import test from 'node:test';
import assert from 'node:assert/strict';
import { seedBundles } from '../seed-flows';
import type { FlowItem } from '../types';
import type { CanonicalAuthoringItem } from './native-creator-vendor/text-authoring/types';
import { PROGRAM_CATALOG_SLUGS } from './catalog';
import { validateTextAuthoringDocument } from './native-creator-vendor/text-authoring/validation';
import { adaptCatalogContentBundle, buildCatalogContent, CATALOG_CONTENT_SLUGS, catalogContentFingerprint, projectCatalogContent, validateCatalogContent } from './catalog-content-source';
import type { CatalogContent } from './catalog-content';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

test('content-only catalog preserves 24/6 items and 6/3 sections with deterministic identities', () => {
  assert.deepEqual(CATALOG_CONTENT_SLUGS, PROGRAM_CATALOG_SLUGS);
  for (const [i, slug] of PROGRAM_CATALOG_SLUGS.entries()) {
    const result = buildCatalogContent(slug); assert.equal(result.ok, true); if (!result.ok) continue;
    assert.equal(result.itemMapping.length, [24, 6][i]); assert.equal(result.sectionMapping.length, [6, 3][i]);
    assert.deepEqual(result, buildCatalogContent(slug)); assert.deepEqual(result, projectCatalogContent(clone(result.content)));
    assert.equal(new Set(result.itemMapping.map(row => row.nativeItemId)).size, result.itemMapping.length);
    assert.equal(validateTextAuthoringDocument(result.document).valid, true);
  }
});
test('immutable content keeps exact original raw and all source metadata but no publication/use counters', () => {
  for (const slug of PROGRAM_CATALOG_SLUGS) {
    const source = seedBundles.find(row => row.flow.slug === slug)!; const before = JSON.stringify(source);
    const result = buildCatalogContent(slug); assert.ok(result.ok); if (!result.ok) continue;
    const expected = clone(source) as any; delete expected.flow.status; delete expected.flow.usage_count; delete expected.flow.copy_count;
    assert.deepEqual(result.content.bundle, expected); assert.equal(result.content.bundle.flow.raw_text, source.flow.raw_text);
    assert.equal(JSON.stringify(source), before); assert.equal('status' in result.content.bundle.flow, false);
    assert.equal('usage_count' in result.content.bundle.flow, false); assert.equal('copy_count' in result.content.bundle.flow, false);
    // One newly generated parse revision, never the legacy user's revision history.
    assert.equal(result.document.revisionHistory.length, 1);
    assert.equal(result.document.revisionHistory[0].revisionId, result.document.revision.revisionId);
    assert.equal(result.document.ownership, 'creator');
  }
});
test('relative schedules remain relative without a personal anchor or completed items', () => {
  for (const slug of PROGRAM_CATALOG_SLUGS) {
    const result = buildCatalogContent(slug); assert.ok(result.ok); if (!result.ok) continue;
    for (const mapping of result.itemMapping) {
      const source: FlowItem = result.content.bundle.items.find(row => row.id === mapping.sourceItemId)!;
      const item: CanonicalAuthoringItem = result.document.parseResult.canonical.items.find(row => row.itemId === mapping.nativeItemId)!;
      assert.equal(item.title, source.title); assert.equal(item.sourceChecked, false);
      assert.ok(item.sources.every(link => link.type === (source.source_type === 'official' ? 'official' : source.source_type === 'creator_experience' ? 'creator' : 'reference')));
      if (source.day_offset === undefined) assert.equal(item.schedule, undefined);
      else { assert.equal(item.schedule?.kind, 'relative'); if (item.schedule?.kind === 'relative') assert.equal(item.schedule.dayOffset, source.day_offset); }
    }
  }
});
test('source warnings, review dates and original attribution are not newly verified or reassigned', () => {
  const result = buildCatalogContent('chiangmai-solo-trip-packing'); assert.ok(result.ok); if (!result.ok) return;
  assert.equal(result.content.bundle.flow.source_checked_at, '2026-09-07');
  assert.equal(result.content.bundle.flow.source_status, 'needs_review');
  assert.equal(result.content.bundle.flow.owner_user_id, 'user-flow-curation');
  assert.ok(result.document.reviewGates?.some(gate => gate.kind === 'rights' && gate.status === 'required'));
});
test('every item explanation, criterion, caution and link is retained in editable projection', () => {
  for (const slug of PROGRAM_CATALOG_SLUGS) {
    const result = buildCatalogContent(slug); assert.ok(result.ok); if (!result.ok) continue;
    for (const item of result.content.bundle.items) {
      const detail = result.content.bundle.itemDetails?.find(row => row.item_id === item.id);
      for (const text of [item.description, detail?.why, detail?.how, detail?.completion_criteria, detail?.caution, detail?.source_fragment_text]) {
        for (const line of text?.split(/\r?\n/u) ?? []) if (line.trim()) assert.ok(result.document.rawText.includes(line));
      }
      for (const link of detail?.links ?? []) { assert.ok(result.document.rawText.includes(link.label)); assert.ok(result.document.rawText.includes(link.url)); }
    }
  }
});
test('unsupported source, unknown execution properties, repetitions and duplicate identity fail closed', () => {
  assert.equal(buildCatalogContent('not-in-old-poc').ok, false);
  const source = seedBundles.find(row => row.flow.slug === 'moving-d30-basic')!;
  for (const patch of [{ repeat_rule: 'weekly' }, { duration_days: 2 }, { role: 'reference' }, { note: 'private' }, { completedAt: '2026-09-23' }, { day_offset: 36601 }]) {
    const changed = clone(source); Object.assign(changed.items[0], patch); assert.equal(adaptCatalogContentBundle(changed).ok, false);
  }
  const duplicate = clone(source); duplicate.items[1].id = duplicate.items[0].id; assert.equal(adaptCatalogContentBundle(duplicate).ok, false);
  const sections = clone(source); sections.sections[1].id = sections.sections[0].id; assert.equal(adaptCatalogContentBundle(sections).ok, false);
});
test('tampered embedded content cannot bypass field validation by recomputing non-security fingerprint', () => {
  const result = buildCatalogContent('moving-d30-basic'); assert.ok(result.ok); if (!result.ok) return;
  for (const mutate of [
    (value: any) => { value.bundle.flow.usage_count = 100; },
    (value: any) => { value.bundle.flow.status = 'published'; },
    (value: any) => { value.bundle.items[0].completedAt = '2026-09-23'; },
    (value: any) => { value.bundle.itemDetails[0].links = [{ label: 'bad', url: 'https://example.com', type: 'reference', note: 'private' }]; },
    (value: any) => { value.bundle.items[0].title = 'first\n- [ ] injected'; },
    (value: any) => { value.bundle.sections[0].note = 'private'; },
    (value: any) => { value.bundle.itemDetails[0].unknown = 'unsupported'; },
    (value: any) => { value.bundle.flow.unknown = 'unsupported'; },
    (value: any) => { value.bundle.repeatRules = ['weekly']; },
    (value: any) => { value.bundle.flow.structure_type = 'routine'; },
  ]) {
    const changed: CatalogContent = clone(result.content); mutate(changed);
    changed.versionId = `catalog-content-${changed.sourceSlug}-${catalogContentFingerprint(changed.bundle)}`;
    assert.equal(validateCatalogContent(changed), false); assert.equal(projectCatalogContent(changed).ok, false);
  }
  assert.equal(projectCatalogContent(null).ok, false); assert.equal(projectCatalogContent({}).ok, false);
});
test('usage counters do not affect content version, but original content edits do', () => {
  const source = clone(seedBundles.find(row => row.flow.slug === 'moving-d30-basic')!);
  const original = adaptCatalogContentBundle(source); assert.ok(original.ok); if (!original.ok) return;
  source.flow.usage_count = 987; source.flow.copy_count = 543;
  const counters = adaptCatalogContentBundle(source); assert.ok(counters.ok); if (!counters.ok) return;
  assert.equal(counters.content.versionId, original.content.versionId);
  source.items[0].description = '원본 내용 수정';
  const changed = adaptCatalogContentBundle(source); assert.ok(changed.ok); if (!changed.ok) return;
  assert.notEqual(changed.content.versionId, original.content.versionId);
});
