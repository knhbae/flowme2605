import test from 'node:test';
import assert from 'node:assert/strict';
import { seedBundles } from '../seed-flows';
import { adaptProgramCatalogBundle, buildProgramCatalog, programCatalogMetadata } from './catalog';
import { createProgramData, validateProgramData } from './program-data';
import { makeProgramOutput } from './output';
import type { ProgramPublicItem } from './contract';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

test('catalog reuses moving 24 and travel 6 as independent immutable original snapshots', () => {
  const data = createProgramData(); const catalog = buildProgramCatalog(data.activeActorId);
  assert.deepEqual(catalog.versions.map(row => row.items.length), [24, 6]);
  assert.equal(new Set(catalog.flows.map(row => row.id)).size, 2);
  for (const flow of catalog.flows) assert.equal(flow.derivedFrom, null);
  for (const version of catalog.versions) { assert.equal(version.number, 1); assert.equal(version.parentVersionId, null); assert.equal(version.source.kind, 'repository-source'); }
  data.public.flows = catalog.flows; data.public.versions = catalog.versions; assert.equal(validateProgramData(data), true);
  assert.deepEqual(buildProgramCatalog(data.activeActorId), catalog);
});

test('every source ID, ordered item, explanation, criterion, caution and link is retained', () => {
  for (const coverage of buildProgramCatalog('owner').coverage) {
    const original = seedBundles.find(row => row.flow.slug === coverage.sourceSlug)!;
    const result = adaptProgramCatalogBundle(original, 'owner'); assert.equal(result.ok, true); if (!result.ok) continue;
    assert.equal(coverage.originalSnapshot, JSON.stringify(original)); assert.equal(coverage.originalRawText, original.flow.raw_text);
    assert.deepEqual(result.version.items.map(row => row.id), [...original.items].sort((a, b) => a.order - b.order).map(row => row.id));
    for (const item of original.items) {
      const projected: ProgramPublicItem = result.version.items.find(row => row.id === item.id)!; const detail = original.itemDetails?.find(row => row.item_id === item.id);
      assert.equal(projected.title, item.title); assert.deepEqual(projected.schedule, item.day_offset === undefined ? { kind: 'undated' } : { kind: 'relative', days: item.day_offset });
      assert.equal(projected.completionCriteria, detail?.completion_criteria ?? '');
      for (const content of [item.description, detail?.why, detail?.how, detail?.caution, detail?.source_fragment_text]) if (content) assert.ok(projected.description.includes(content));
      for (const link of detail?.links ?? []) { assert.ok(projected.description.includes(link.url)); assert.ok(projected.description.includes(link.label)); }
      const section = original.sections.find(row => row.id === item.section_id); if (section) assert.ok(projected.description.includes(section.title));
    }
  }
});

test('source review status and old review date remain visible, never replaced by current date or synthetic counts', () => {
  const catalog = buildProgramCatalog('owner'); const travel = catalog.versions[1]; const meta = catalog.coverage[1];
  // Reuse the actual September 7 source audit, not the current execution date.
  assert.equal(travel.source.checkedAt, '2026-09-07'); assert.equal(meta.sourceNeedsReview, true);
  assert.ok(travel.summary.includes('출처 재검토')); assert.ok(travel.summary.includes('상품 구매, 보험 보장'));
  assert.equal(JSON.stringify(catalog.versions).includes('usage_count'), false); assert.equal(JSON.stringify(catalog.flows).includes('copy_count'), false);
  assert.equal(programCatalogMetadata(travel.id)?.sourceSlug, 'chiangmai-solo-trip-packing');
  assert.equal(programCatalogMetadata('not-a-snapshot'), undefined);
});

test('unsupported repetition, durations, date windows and unknown source semantics fail explicitly', () => {
  const original = seedBundles.find(row => row.flow.slug === 'moving-d30-basic')!;
  for (const patch of [{ repeat_rule: 'weekly' }, { duration_days: 2 }, { date_window: { label: '범위', start_day_offset: -3, end_day_offset: 0 } }, { unknown_semantics: true }]) {
    const bundle = clone(original); Object.assign(bundle.items[0], patch);
    const result = adaptProgramCatalogBundle(bundle, 'owner'); assert.equal(result.ok, false); if (result.ok) continue;
    assert.equal(result.reason, 'unsupported-fields'); assert.ok(result.fields.some(field => field.endsWith(Object.keys(patch)[0])));
  }
  const routine = clone(original); routine.flow.structure_type = 'routine';
  const failed = adaptProgramCatalogBundle(routine, 'owner'); assert.equal(failed.ok, false);
});

test('a changed repository snapshot gets a distinct snapshot ID rather than replacing an existing version', () => {
  const original = seedBundles.find(row => row.flow.slug === 'moving-d30-basic')!; const before = JSON.stringify(original);
  const a = adaptProgramCatalogBundle(original, 'owner'); const changed = clone(original); changed.items[0].title += ' 변경';
  const b = adaptProgramCatalogBundle(changed, 'owner'); assert(a.ok && b.ok);
  assert.equal(a.flow.id, b.flow.id); assert.notEqual(a.version.id, b.version.id); assert.equal(a.version.number, 1); assert.equal(b.version.number, 1);
  assert.equal(JSON.stringify(original), before);
});

test('all retained moving and travel items produce actual TXT/CSV/ICS payloads without copies', () => {
  for (const version of buildProgramCatalog('owner').versions) for (const format of ['txt', 'csv', 'ics'] as const) {
    const result = makeProgramOutput(version, { selectedItemIds: version.items.map(row => row.id), anchor: '2026-10-15', format }, '2026-09-12T00:00:00Z');
    assert(result.ok); assert.equal(result.itemIds.length, version.items.length); assert.deepEqual(result.undatedItemIds, []);
    assert.ok(new TextEncoder().encode(result.payload).byteLength > 1000);
  }
});
