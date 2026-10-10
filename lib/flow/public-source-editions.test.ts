import assert from 'node:assert/strict';
import test from 'node:test';
import type { FlowBundle } from './types';
import { getCurrentPublicSourceBundle, getReviewedPublicSourceVersion, getSavedPublicSourceEdition, publicSourceBundleSha256,
  selectSavedPublicSourceBundle, type ReviewedPublicSourceEdition } from './public-source-editions';
import { buildEffectiveFlowSnapshot } from './effective-flow-snapshot';
import { resolvePublicDateIntent } from './public-date-intent';
import { saveFlowRecord, getSavedFlowRecord } from './storage';
import { getStoredMyFlowItemDrafts, getStoredMyFlowDateOverrides, saveStoredMyFlowItemDrafts, MY_FLOW_DATE_REMOVED_OVERRIDE,
  saveStoredMyFlowDateOverrides, getMyFlowDateOverrideKey, resolveMyFlowEffectiveDate } from './my-flow-personal-state';
import { buildEffectiveRoutineProjection } from './effective-routine-projection';
import { buildMyFlowStepIcs } from './my-flow-step-export';
import { resolveSavedRoutineRecurrence } from './saved-routine-occurrence';
import { getReviewedSourcePersonalRepeats } from './reviewed-source-personal-repeat';

// Invented local fixture, not a source-qualified production edition.
const old: FlowBundle = {
  flow: { id: 'edition-fixture', slug: 'edition-fixture', title: '시험 계획', category: 'test',
    structure_type: 'routine', anchor_type: 'start_date', status: 'published',
    created_at: '2026-07-11', updated_at: '2026-07-11', source_modified_at: '2026-07-11' },
  sections: [{ id: 'section', flow_id: 'edition-fixture', title: '시험', order: 0 }],
  items: [{ id: 'item', flow_id: 'edition-fixture', section_id: 'section', title: '시험 행동', type: 'calendar', day_offset: 0, order: 0 }],
  repeatRules: ['FREQ=DAILY'],
};
function fixtureEdition(passed = true): ReviewedPublicSourceEdition {
  const bundle = structuredClone(old);
  delete bundle.items[0].day_offset;
  bundle.repeatRules = [];
  const bundleSha256 = publicSourceBundleSha256(bundle);
  return { sourceFlowId: old.flow.id, sourceSlug: old.flow.slug, bundleSha256,
    version: `flowme-reviewed-source-v1:${old.flow.slug}:${bundleSha256}`,
    sourceComparison: passed ? 'passed' : 'pending', bundle };
}
const recordFor = (edition: ReviewedPublicSourceEdition) => ({ sourceFlowKey: old.flow.id,
  sourceFlowSlug: old.flow.slug, sourceVersion: edition.version });

test('edition: only exact slug/id/token and full passed payload selects a new plan source', () => {
  const edition = fixtureEdition(), before = JSON.stringify(old);
  const selected = selectSavedPublicSourceBundle(old, recordFor(edition), [edition]);
  assert.equal(selected.items[0].day_offset, undefined);
  assert.deepEqual(selected.repeatRules, []);
  assert.deepEqual(selected.items.map(item => item.id), old.items.map(item => item.id));
  selected.items[0].title = '개인 편집';
  assert.equal(edition.bundle.items[0].title, old.items[0].title);
  assert.equal(JSON.stringify(old), before);
});

test('edition: legacy date, missing, unknown and mismatched source tokens never migrate an old plan', () => {
  const edition = fixtureEdition();
  for (const saved of [undefined, { sourceVersion: '2026-07-11' }, { ...recordFor(edition), sourceVersion: `${edition.version}:unknown` },
    { ...recordFor(edition), sourceFlowSlug: 'other' }, { ...recordFor(edition), sourceFlowKey: 'other' }]) {
    assert.equal(selectSavedPublicSourceBundle(old, saved, [edition]), old);
  }
  assert.equal(getCurrentPublicSourceBundle(old, [fixtureEdition(false)]), old);
  const tampered = fixtureEdition(); tampered.bundle.items[0].title = 'forged';
  assert.equal(getCurrentPublicSourceBundle(old, [tampered]), old);
});

test('edition: a changed personal/map bundle does not acquire a source token from a same-slug source', () => {
  const edition = fixtureEdition();
  assert.equal(getReviewedPublicSourceVersion(edition.bundle, [edition]), edition.version);
  const changed = structuredClone(edition.bundle); changed.items[0].title = '개인 제목';
  assert.equal(getReviewedPublicSourceVersion(changed, [edition]), undefined);
});

test('edition: explicit snapshot token matches both source layers without changing author/check dates', () => {
  const edition = fixtureEdition();
  const snapshot = buildEffectiveFlowSnapshot({ bundle: edition.bundle, sourceVersion: edition.version,
    effectiveTitle: '내 계획', dateIntent: resolvePublicDateIntent({ anchorType: 'start_date', mode: 'undated', customAnchor: '', exampleAnchor: '2026-10-10' }) });
  assert.equal(snapshot.sourceVersion, edition.version);
  assert.equal(snapshot.layers.source.version, edition.version);
  assert.equal(snapshot.committed.counts.dated, 0);
  assert.equal(edition.bundle.flow.source_modified_at, '2026-07-11');
  assert.equal(edition.bundle.flow.source_checked_at, undefined);
});

test('edition: new connection reload keeps token/personal date/repeat/memo, leaves old peer bytes exact', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const connect = () => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  };
  try {
    connect();
    const edition = fixtureEdition();
    values.set('untouched-old-plan', JSON.stringify({ sourceVersion: '2026-07-11', date: '2026-07-20', memo: 'old', progress: 50 }));
    const peer = storage.getItem('untouched-old-plan');
    saveFlowRecord('copy', { ...recordFor(edition), personalTitle: '내 계획', selectedArtifactMode: 'calendar', dateIntent: 'undated' });
    const dateKey = getMyFlowDateOverrideKey('copy', 'item');
    saveStoredMyFlowDateOverrides({ [dateKey]: '2026-10-12' });
    saveStoredMyFlowItemDrafts({ 'copy::item::none': { repeatPreset: 'weekly', memo: '다음에 이어 쓸 메모' } });
    const count = values.size;
    // A new simulated connection reads existing records; it does not create a copy.
    connect();
    const saved = getSavedFlowRecord('copy');
    assert.equal(saved?.sourceVersion, edition.version);
    const source = selectSavedPublicSourceBundle(old, saved, [edition]);
    assert.equal(source.items[0].day_offset, undefined);
    const date = resolveMyFlowEffectiveDate({ flowSlug: 'copy', itemId: 'item', dateOverrides: getStoredMyFlowDateOverrides() }).date;
    const draft = getStoredMyFlowItemDrafts()['copy::item::none'];
    assert.equal(date, '2026-10-12'); assert.equal(draft.repeatPreset, 'weekly'); assert.equal(draft.memo, '다음에 이어 쓸 메모');
    const rows = [{ id: 'item', date, effectiveDateOverrideKey: dateKey }];
    const projection = buildEffectiveRoutineProjection({ bundle: source, identityNamespace: 'copy', rows,
      startDate: date!, range: { start: date!, end: '2026-11-12' },
      personalRepeatByItemId: getReviewedSourcePersonalRepeats({ flowSlug: 'copy', rows,
        drafts: getStoredMyFlowItemDrafts(), dateOverrides: getStoredMyFlowDateOverrides() }) });
    assert.equal(projection.semanticOccurrenceCount, 5);
    assert.equal(projection.seriesByItemId.item.revisions[0].rule.frequency, 'weekly');
    assert.equal(storage.getItem('untouched-old-plan'), peer);
    assert.equal(values.size, count);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('edition: two published editions select the saved exact version, not the current one', () => {
  const previous = fixtureEdition();
  const latest = fixtureEdition(); latest.bundle.items[0].title = '새 원문 행동';
  latest.bundleSha256 = publicSourceBundleSha256(latest.bundle);
  latest.version = `flowme-reviewed-source-v1:${latest.sourceSlug}:${latest.bundleSha256}`;
  assert.equal(getSavedPublicSourceEdition(previous.bundle, recordFor(previous), [latest, previous]), previous);
  assert.equal(getReviewedPublicSourceVersion(previous.bundle, [latest, previous]), previous.version);
  assert.equal(selectSavedPublicSourceBundle(old, recordFor(previous), [latest, previous]).items[0].title, old.items[0].title);
  assert.equal(getCurrentPublicSourceBundle(old, [latest, previous]).items[0].title, '새 원문 행동');
});

test('edition: actual UI empty repeat selection stops a source cadence after personal-date reload', () => {
  const edition = fixtureEdition(); edition.bundle.items[0].repeat_rule = 'FREQ=DAILY';
  const rows = [{ id: 'item', date: '2026-10-12', effectiveDateOverrideKey: 'copy::item::none' }];
  const choices = getReviewedSourcePersonalRepeats({ flowSlug: 'copy', rows,
    drafts: { 'copy::item::none': { repeatPreset: '', time: '09:30' } }, dateOverrides: {} });
  assert.equal(choices.item.repeatPreset, 'none');
  const projection = buildEffectiveRoutineProjection({ bundle: edition.bundle, rows, startDate: '2026-10-12',
    range: { start: '2026-10-12', end: '2026-10-14' }, personalRepeatByItemId: choices });
  assert.equal(projection.connected, false); assert.deepEqual(projection.rows, rows);
  const single = buildMyFlowStepIcs({ flowTitle: '시험 계획', stepId: 'copy::item', stepTitle: '시험 행동', date: rows[0].date });
  assert.match(single, /DTSTART;VALUE=DATE:20261012/); assert.doesNotMatch(single, /RRULE:/);
});

test('edition: removing one personal date does not borrow another item anchor or revive its repeat', () => {
  const edition = fixtureEdition();
  edition.bundle.items.push({ ...edition.bundle.items[0], id: 'dated', order: 1 });
  const rows = [{ id: 'item', effectiveDateOverrideKey: 'copy::item::none' }, { id: 'dated', date: '2026-10-12' }];
  const choices = getReviewedSourcePersonalRepeats({ flowSlug: 'copy', rows,
    drafts: { 'copy::item::none': { repeatPreset: 'weekly' } },
    dateOverrides: { 'copy::item::none': MY_FLOW_DATE_REMOVED_OVERRIDE } });
  const projection = buildEffectiveRoutineProjection({ bundle: edition.bundle, rows, startDate: '2026-10-12',
    range: { start: '2026-10-12', end: '2026-10-31' }, personalRepeatByItemId: choices });
  assert.equal(projection.connected, false); assert.deepEqual(projection.rows, rows);
  const invalid = buildEffectiveRoutineProjection({ bundle: edition.bundle, rows, startDate: '2026-10-12',
    range: { start: '2026-10-12', end: '2026-10-31' },
    personalRepeatByItemId: { item: { repeatPreset: 'weekly', startDate: MY_FLOW_DATE_REMOVED_OVERRIDE } } });
  assert.equal(invalid.semanticOccurrenceCount, 0);
});

test('edition: repeated and date-only items both remain in the canonical calendar result', () => {
  const edition = fixtureEdition(); edition.bundle.items.push({ ...edition.bundle.items[0], id: 'single', order: 1 });
  const rows = [{ id: 'item', date: '2026-10-12' }, { id: 'single', date: '2026-10-13' }];
  const projection = buildEffectiveRoutineProjection({ bundle: edition.bundle, rows, startDate: '2026-10-12',
    range: { start: '2026-10-12', end: '2026-10-20' },
    personalRepeatByItemId: { item: { repeatPreset: 'weekly', startDate: '2026-10-12' } } });
  assert.equal(projection.semanticOccurrenceCount, 2);
  assert.equal(projection.rows.filter(row => row.id === 'single').length, 1);
});

test('edition: time-only edits retain source cadence and the same recurrence time used by export', () => {
  const edition = fixtureEdition(); edition.bundle.items[0].repeat_rule = 'FREQ=DAILY';
  const rows = [{ id: 'item', date: '2026-10-12', effectiveDateOverrideKey: 'copy::item::none' }];
  const choices = getReviewedSourcePersonalRepeats({ flowSlug: 'copy', rows,
    drafts: { 'copy::item::none': { time: '09:30', durationMinutes: 45 } }, dateOverrides: {} });
  assert.equal(choices.item.repeatPreset, undefined);
  const projection = buildEffectiveRoutineProjection({ bundle: edition.bundle, rows, startDate: '2026-10-12',
    range: { start: '2026-10-12', end: '2026-10-14' }, personalRepeatByItemId: choices });
  assert.equal(projection.semanticOccurrenceCount, 3);
  assert.equal(projection.seriesByItemId.item.revisions[0].scheduleTemplate?.time, '09:30');
  assert.equal(projection.seriesByItemId.item.revisions[0].scheduleTemplate?.durationMinutes, 45);
});

test('edition: an unrelated undated row does not suppress a genuine global carrier cadence', () => {
  const edition = fixtureEdition(); edition.bundle.repeatRules = ['FREQ=WEEKLY'];
  edition.bundle.items.push({ ...edition.bundle.items[0], id: 'other', order: 1 });
  const rows = [{ id: 'item', date: '2026-10-12' }, { id: 'other' }];
  const choices = getReviewedSourcePersonalRepeats({ flowSlug: 'copy', rows, drafts: {}, dateOverrides: {} });
  const projection = buildEffectiveRoutineProjection({ bundle: edition.bundle, rows, startDate: '2026-10-12',
    range: { start: '2026-10-12', end: '2026-10-20' }, personalRepeatByItemId: choices });
  assert.equal(projection.semanticOccurrenceCount, 2);
  assert.equal(projection.rows.find(row => row.id === 'other')?.date, undefined);
});

test('edition: no source repeat returns no series; explicit weekly choice matches calendar and item/flow export', () => {
  const edition = fixtureEdition(), startDate = '2026-10-12';
  const base = { bundle: edition.bundle, identityNamespace: 'copy', rows: [{ id: 'item', date: startDate, title: '시험 행동' }],
    startDate, range: { start: startDate, end: '2026-11-12' } };
  const empty = buildEffectiveRoutineProjection(base);
  assert.equal(empty.connected, false); assert.equal(empty.semanticOccurrenceCount, 0);
  const definition = { itemId: 'item', startDate, repeatPreset: 'weekly' };
  const calendar = resolveSavedRoutineRecurrence(definition, 'copy');
  const projection = buildEffectiveRoutineProjection({ ...base, personalRepeatByItemId: { item: definition } });
  assert.deepEqual(projection.seriesByItemId.item, calendar.series);
  assert.equal(projection.semanticOccurrenceCount, 5);
  const ics = buildMyFlowStepIcs({ flowTitle: '내 계획', stepId: 'copy::item', stepTitle: '시험 행동', date: startDate,
    personalRecurrence: projection.seriesByItemId.item, personalRecurrenceIdentityNamespace: 'copy' });
  assert.match(ics, /RRULE:FREQ=WEEKLY/);
  assert.doesNotMatch(ics, /FREQ=DAILY/);
});

test('edition: explicit none stays stopped and source cadence remains on only its referenced item', () => {
  const edition = fixtureEdition();
  edition.bundle.items.push({ ...edition.bundle.items[0], id: 'reading', order: 1, repeat_rule: 'FREQ=DAILY' });
  const base = { bundle: edition.bundle, rows: [{ id: 'item', date: '2026-10-12' }, { id: 'reading', date: '2026-10-12' }],
    startDate: '2026-10-12', range: { start: '2026-10-12', end: '2026-10-14' } };
  const projection = buildEffectiveRoutineProjection(base);
  assert.deepEqual(projection.carrierItemIds, ['reading']);
  assert.equal(projection.semanticOccurrenceCount, 3);
  const stopped = buildEffectiveRoutineProjection({ ...base, personalRepeatByItemId: { reading: { startDate: '2026-10-12', repeatPreset: 'none' } } });
  assert.equal(stopped.connected, false); assert.equal(stopped.semanticOccurrenceCount, 0);
  assert.deepEqual(stopped.rows, base.rows);
});
