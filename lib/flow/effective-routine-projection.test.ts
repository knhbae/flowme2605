import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEffectiveRoutineProjection } from './effective-routine-projection';
import { buildCalendarIcs } from './export';
import { buildMyFlowStepIcs } from './my-flow-step-export';
import { seedBundles } from './seed-flows';
import { sourceBackedMyFlowBundles } from './source-backed-my-flow';

function getBundle(slug: string) {
  const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(bundle, slug);
  return bundle;
}

function unfoldIcs(value: string): string {
  return value.replaceAll('\r\n ', '');
}

function getIcsValue(ics: string, key: string): string | undefined {
  return unfoldIcs(ics).match(new RegExp(`^${key}:(.+)$`, 'mu'))?.[1];
}

test('monthly source routine uses one canonical series across semantic projection and ICS', () => {
  const bundle = getBundle('washer-tub-clean-monthly');
  const sourceSnapshot = structuredClone(bundle);
  const carrier = bundle.items.slice().sort((left, right) => left.order - right.order)[0];
  assert.ok(carrier);

  const projection = buildEffectiveRoutineProjection({
    bundle,
    rows: [{ id: carrier.id, date: '2026-07-20', title: bundle.flow.title }],
    startDate: '2026-07-20',
    range: { start: '2026-07-20', end: '2026-10-31' },
  });

  assert.equal(projection.connected, true);
  assert.equal(projection.semanticOccurrenceCount, 4);
  assert.deepEqual(projection.rows.map((row) => row.date), [
    '2026-07-20',
    '2026-08-20',
    '2026-09-20',
    '2026-10-20',
  ]);
  assert.deepEqual(projection.carrierItemIds, [carrier.id]);
  assert.equal(new Set(projection.rows.map((row) => row.structuralOccurrenceId)).size, 4);
  assert.deepEqual(bundle, sourceSnapshot);

  const ics = buildCalendarIcs(bundle, '2026-07-20').replaceAll('\r\n ', '');
  assert.match(ics, /DTSTART;VALUE=DATE:20260720/);
  assert.match(ics, /RRULE:FREQ=MONTHLY;BYMONTHDAY=20/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);
  const firstUid = ics.match(/UID:([^\r\n]+)/)?.[1];
  const movedUid = buildCalendarIcs(bundle, '2026-07-27')
    .replaceAll('\r\n ', '')
    .match(/UID:([^\r\n]+)/)?.[1];
  assert.ok(firstUid);
  assert.doesNotMatch(firstUid, /flow-washer|item/iu);
  assert.equal(firstUid, movedUid);

  const savedIcs = buildMyFlowStepIcs({
    flowTitle: bundle.flow.title,
    stepId: `${bundle.flow.slug}::${carrier.id}`,
    stableEventIdentitySeed: `${bundle.flow.slug}::${carrier.id}`,
    stepTitle: carrier.title,
    date: '2026-07-20',
    personalRecurrence: projection.seriesByItemId[carrier.id],
    personalRecurrenceIdentityNamespace: bundle.flow.slug,
  });
  assert.equal(getIcsValue(savedIcs, 'UID'), getIcsValue(ics, 'UID'));
  assert.equal(getIcsValue(savedIcs, 'RRULE'), getIcsValue(ics, 'RRULE'));
});

test('weekly source routine keeps the accepted weekday cadence and occurrence identities', () => {
  const bundle = sourceBackedMyFlowBundles.find((entry) => entry.flow.slug === 'curated-allblanc-morning-workout');
  assert.ok(bundle);
  const carrier = bundle.items.slice().sort((left, right) => left.order - right.order)[0];
  assert.ok(carrier);

  const projection = buildEffectiveRoutineProjection({
    bundle,
    rows: [{ id: carrier.id, date: '2026-07-15', title: carrier.title }],
    startDate: '2026-07-15',
    selectedWeekdays: ['월', '수', '금'],
    range: { start: '2026-07-15', end: '2026-08-11' },
  });

  assert.equal(projection.connected, true);
  assert.equal(projection.semanticOccurrenceCount, 12);
  assert.deepEqual(projection.rows.slice(0, 3).map((row) => row.date), [
    '2026-07-15',
    '2026-07-17',
    '2026-07-20',
  ]);
  assert.equal(new Set(projection.rows.map((row) => row.structuralOccurrenceId)).size, 12);

  const publicIcs = buildCalendarIcs(bundle, '2026-07-15', ['월', '수', '금']);
  const savedIcs = buildMyFlowStepIcs({
    flowTitle: bundle.flow.title,
    stepId: `${bundle.flow.slug}::${carrier.id}`,
    stableEventIdentitySeed: `${bundle.flow.slug}::${carrier.id}`,
    stepTitle: carrier.title,
    date: '2026-07-15',
    personalRecurrence: projection.seriesByItemId[carrier.id],
    personalRecurrenceIdentityNamespace: bundle.flow.slug,
  });
  assert.equal(getIcsValue(savedIcs, 'UID'), getIcsValue(publicIcs, 'UID'));
  assert.equal(getIcsValue(savedIcs, 'RRULE'), getIcsValue(publicIcs, 'RRULE'));
});

test('an exact-video preview horizon does not become a saved series end', () => {
  const bundle = sourceBackedMyFlowBundles.find((entry) => entry.flow.slug === 'curated-allblanc-morning-workout');
  assert.ok(bundle);
  const carrier = bundle.items[0];
  assert.ok(carrier);

  const projection = buildEffectiveRoutineProjection({
    bundle,
    rows: [{ id: carrier.id, date: '2026-07-15', title: carrier.title }],
    startDate: '2026-07-15',
    selectedWeekdays: ['월', '수', '금'],
    range: { start: '2026-07-15', end: '2026-09-15' },
  });

  assert.ok(projection.semanticOccurrenceCount > 12);
  assert.equal(projection.seriesByItemId[carrier.id]?.revisions[0]?.rule.end, undefined);
});

test('saved routine end-date override is carried by the canonical series', () => {
  const bundle = sourceBackedMyFlowBundles.find((entry) => entry.flow.slug === 'curated-allblanc-morning-workout');
  assert.ok(bundle);
  const carrier = bundle.items[0];
  assert.ok(carrier);

  const projection = buildEffectiveRoutineProjection({
    bundle,
    rows: [{ id: carrier.id, date: '2026-07-15', title: carrier.title }],
    startDate: '2026-07-15',
    selectedWeekdays: ['월', '수', '금'],
    endDate: '2026-08-01',
    range: { start: '2026-07-15', end: '2026-08-31' },
  });
  const ics = buildMyFlowStepIcs({
    flowTitle: bundle.flow.title,
    stepId: `${bundle.flow.slug}::${carrier.id}`,
    stepTitle: carrier.title,
    date: '2026-07-15',
    personalRecurrence: projection.seriesByItemId[carrier.id],
    personalRecurrenceIdentityNamespace: bundle.flow.slug,
  });

  const rrule = getIcsValue(ics, 'RRULE');
  assert.ok(rrule);
  assert.match(rrule, /FREQ=WEEKLY/);
  assert.match(rrule, /BYDAY=MO,WE,FR/);
  assert.match(rrule, /UNTIL=20260801/);
});

test('personal routine definition separates preview horizon from open, until, and count series ends', () => {
  const bundle = sourceBackedMyFlowBundles.find((entry) => entry.flow.slug === 'curated-allblanc-morning-workout');
  assert.ok(bundle);
  const carrier = bundle.items[0];
  assert.ok(carrier);
  const base = {
    bundle,
    rows: [{ id: carrier.id, date: '2026-07-15', title: carrier.title }],
    startDate: '2026-07-15',
    selectedWeekdays: ['월', '수', '금'],
    range: { start: '2026-07-15', end: '2026-10-31' },
  } as const;

  const open = buildEffectiveRoutineProjection({ ...base, seriesEndMode: 'none' });
  const until = buildEffectiveRoutineProjection({
    ...base,
    seriesEndMode: 'until',
    endDate: '2026-08-01',
  });
  const count = buildEffectiveRoutineProjection({
    ...base,
    seriesEndMode: 'count',
    occurrenceCount: 5,
  });

  assert.ok(open.semanticOccurrenceCount > 12);
  assert.deepEqual(open.seriesByItemId[carrier.id]?.revisions[0]?.rule.end, undefined);
  assert.deepEqual(until.seriesByItemId[carrier.id]?.revisions[0]?.rule.end, {
    mode: 'until',
    date: '2026-08-01',
  });
  assert.deepEqual(count.seriesByItemId[carrier.id]?.revisions[0]?.rule.end, {
    mode: 'count',
    count: 5,
  });
  assert.equal(count.semanticOccurrenceCount, 5);
});

test('personal routine time and end definition reaches ICS without changing the stable UID', () => {
  const bundle = sourceBackedMyFlowBundles.find((entry) => entry.flow.slug === 'curated-allblanc-morning-workout');
  assert.ok(bundle);
  const definition = {
    schemaVersion: 1 as const,
    time: '07:30',
    durationMinutes: 45,
    end: { mode: 'count' as const, count: 6 },
  };
  const ics = unfoldIcs(buildCalendarIcs(bundle, '2026-07-15', ['월', '수', '금'], definition));
  const moved = unfoldIcs(buildCalendarIcs(bundle, '2026-07-20', ['월', '수', '금'], definition));

  assert.match(ics, /DTSTART:20260715T073000/);
  assert.match(ics, /DTEND:20260715T081500/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6/);
  assert.equal(getIcsValue(ics, 'UID'), getIcsValue(moved, 'UID'));
});

test('ambiguous natural cadence does not invent fixed occurrence dates', () => {
  const bundle = getBundle('monstera-care-routine');
  const carrier = bundle.items.slice().sort((left, right) => left.order - right.order)[0];
  assert.ok(carrier);
  const rows = [{ id: carrier.id, date: '2026-07-20', title: carrier.title }];

  const projection = buildEffectiveRoutineProjection({
    bundle,
    rows,
    startDate: '2026-07-20',
    range: { start: '2026-07-20', end: '2026-12-31' },
  });

  assert.equal(projection.connected, false);
  assert.equal(projection.semanticOccurrenceCount, 0);
  assert.deepEqual(projection.rows, rows);
  assert.ok(projection.warnings.includes('ambiguous_natural_repeat_range_not_projected'));
});
