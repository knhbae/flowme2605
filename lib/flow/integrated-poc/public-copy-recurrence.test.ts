import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData, validateProgramData, validateProgramSchedule, canPublishProgramSchedule } from './program-data';
import { programClone, type ProgramCopy, type ProgramPublicItem } from './contract';
import { programRecurringScheduleFromDraft, type ProgramPublicRecurringScheduleV1 } from './public-recurrence-contract';
import { readProgramPublicCopyRecurrenceSource, inspectProgramPublicCopyRecurrence, programPublicCopyExecutionRef,
  programPublicCopyItemRef, validateProgramPublicCopyOccurrenceIdentity } from './public-copy-recurrence';
import { readProgramExecutionOccurrences, readProgramOccurrencePeriod, updateProgramOccurrenceExecution, programOccurrenceWindowFor } from './recurrence-state';
import { programOccurrenceExecutionKey, type ProgramOccurrenceExecution } from './recurrence-state-contract';
import { isProgramOccurrenceExecution, isProgramRecurrenceExecutionState } from './recurrence-state-validation';
import { programSeriesMetadata, programPreservesSeriesMetadata, programRecurrencePeriodRows } from './recurrence-target';
import { resolveProgramExecutionSource } from './execution-source';
import { programOccurrenceTargetKey } from './recurrence-order';
import { isProgramExecutionTargetKey, isProgramExecutionTimelineOrders } from './recurrence-order-contract';
import { readProgramPublicCopyExecutionTarget, programPublicCopyOutputTargetKey } from './public-copy-execution-target';
import { readProgramPublicCopyOutputOccurrence } from './public-copy-output-return';
import { readProgramOutputReturnTarget } from './output-return-target';
import { inspectPrivateOutputOccurrences } from './private-output-occurrences';
import { parseProgramLocation } from './navigation';
import { programOutputReturnUrl } from './output-return';

/** Explicit contract fixtures, not a successful user publication or browser journey.
 * Structural storage validation is open; the publication release gate remains closed. */
function fixture(raw = '매주 화, 목', end = '8회', start: ProgramPublicRecurringScheduleV1['start'] = { kind: 'fixed', date: '2026-12-01' }) {
  const data = createProgramData(), actorId = data.activeActorId, space = data.spaces[actorId];
  const schedule = programRecurringScheduleFromDraft({ version: 1, raw, end, startKind: start.kind,
    startValue: start.kind === 'fixed' ? start.date : start.kind === 'relative' ? String(start.days) : '', time: '07:00', timeZone: 'Asia/Seoul' }); assert(schedule);
  const item: ProgramPublicItem = { id: 'item-a', title: '주간 운동', description: '통증이 없을 때 실시', completionCriteria: '마무리 확인', sourceUrl: 'https://example.org/source',
    schedule, subchecks: [{ id: 'child-a', title: '준비 확인' }] };
  data.public.flows.push({ id: 'public-a', ownerId: 'creator-minji', currentVersionId: 'version-a', category: '운동', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'version-a', flowId: 'public-a', number: 1, parentVersionId: null, title: '공개 주간 운동', summary: '공개 설명', items: [item],
    source: { kind: 'user-text', label: '직접 작성', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-09-14T00:00:00.000Z' });
  const copy: ProgramCopy = { id: 'copy-a', flowId: 'public-a', baseVersionId: 'version-a', documentId: 'copy-doc-a', itemLines: { 'item-a': 'copy-line-a' },
    subcheckLines: {}, inheritedDates: { 'item-a': null }, includedItemIds: ['item-a'], anchor: null, itemOverrides: {}, appliedFields: {}, recurrence: { version: 1, itemIds: ['item-a'] } };
  space.copies.push(copy);
  space.text.flows.push({ id: copy.documentId, title: 'PRIVATE-COPY-TITLE', folderId: 'folder-unfiled', folder: '미분류', private: true,
    sourceVersion: copy.baseVersionId, lines: [{ id: 'copy-line-a', text: '반복: 주간 운동' }, { id: 'private-note', text: 'PRIVATE-MEMO-AND-COMPLETION' }] });
  const input = { actorId, flowRef: programPublicCopyExecutionRef(copy.id), localToday: '2026-12-01', skipPersonalPlans: true };
  return { data, actorId, space, item, copy, schedule, input };
}
function source(f: ReturnType<typeof fixture>) { const r = readProgramPublicCopyRecurrenceSource(f.space, f.data.public, f.copy.id); assert(r.ok, r.ok ? '' : r.reason); return r.source; }
function read(f: ReturnType<typeof fixture>, window = {}) { const r = readProgramExecutionOccurrences(f.data, { ...f.input, window }); assert(r.ok, r.ok ? '' : r.reason); return r; }
function stored(f: ReturnType<typeof fixture>, index = 0): ProgramOccurrenceExecution {
  const row = read(f).rows[index]; return { ...row.identity, schedule: { mode: 'inherit', date: null }, completion: { status: 'completed', completedAt: '2026-12-01T00:00:00.000Z' }, participation: 'included' };
}

test('PCR public occurrence numeric ordinal survives the shared ordering key contract', () => {
  const f = fixture(), row = read(f).rows[0], key = programOccurrenceTargetKey(row);
  assert.equal(typeof JSON.parse(key)[7], 'number');
  assert.equal(isProgramExecutionTargetKey(key), true);
  assert.equal(isProgramExecutionTimelineOrders({ [row.originalDate]: [key] }), true);
});

test('PCR execution key parsing keeps delimiter identities and does not normalize a string ordinal', () => {
  const f = fixture(); f.copy.id = 'copy:[한글]|:a'; f.input.flowRef = programPublicCopyExecutionRef(f.copy.id);
  const row = read(f).rows[1], key = programOccurrenceTargetKey(row), parsed = readProgramPublicCopyExecutionTarget(key);
  assert(parsed); assert.equal(parsed.copyId, f.copy.id); assert.equal(parsed.occurrenceKey, row.key);
  const tuple = JSON.parse(key); tuple[7] = String(tuple[7]); assert.equal(isProgramExecutionTargetKey(JSON.stringify(tuple)), false);
});

test('PCR malformed public execution tuples fail closed without accepting a legacy fallback', () => {
  const key = programOccurrenceTargetKey(read(fixture()).rows[0]), original = JSON.parse(key);
  const invalid = [
    (t: unknown[]) => { t[7] = 0; }, (t: unknown[]) => { t[7] = 10201; },
    (t: unknown[]) => { t[7] = 1.5; }, (t: unknown[]) => { t[7] = 9; },
    (t: unknown[]) => { t[8] = '2027-02-30'; }, (t: unknown[]) => { t[8] = '2026-11-30'; },
    (t: unknown[]) => { t[2] = '__proto__'; }, (t: unknown[]) => { t[3] = 'wrong\nflow'; },
    (t: unknown[]) => { t[6] = '{}'; }, (t: unknown[]) => { t[6] = String(t[6]).replace('authoring-v1', 'legacy'); },
    (t: unknown[]) => { t.push('unexpected'); }, (t: unknown[]) => { t.splice(7, 1); },
  ];
  for (const change of invalid) { const tuple = structuredClone(original); change(tuple); assert.equal(isProgramExecutionTargetKey(JSON.stringify(tuple)), false, JSON.stringify(tuple)); }
  assert.equal(isProgramExecutionTargetKey(` ${key}`), false);
});

test('PCR output returns pin the accepted public schedule while ordering keys remain stable', () => {
  const f = fixture(), row = read(f).rows[1], before = JSON.stringify(f.data), key = programPublicCopyOutputTargetKey(row.identity); assert(key);
  const target = readProgramPublicCopyExecutionTarget(key); assert(target?.basis);
  assert.equal(target.kind, 'return'); assert.equal(target.basis.versionId, 'version-a'); assert.equal(target.occurrenceKey, row.key);
  assert.equal(isProgramExecutionTimelineOrders({ [row.originalDate]: [key] }), false);
  const actual = readProgramPublicCopyOutputOccurrence(f.data, { actorId: f.actorId, executionKey: key, today: f.input.localToday });
  assert(actual.ok, actual.ok ? '' : actual.reason); assert.equal(actual.row.key, row.key); assert.equal(actual.lineId, 'copy-line-a');
  assert.equal(JSON.stringify(f.data), before);
  assert.equal(readProgramPublicCopyOutputOccurrence(f.data, { actorId: f.actorId, executionKey: programOccurrenceTargetKey(row), today: f.input.localToday }).ok, false);
});

test('PCR output projection emits the pinned key and real source facts, and route serialization round-trips it', () => {
  const f = fixture(), before = JSON.stringify(f.data);
  const output = inspectPrivateOutputOccurrences(f.data, { actorId: f.actorId, documentId: f.copy.documentId,
    occurrenceRange: { from: '2026-12-01', to: '2026-12-10', includeUndated: false } }, new Set());
  assert(output.ok); assert.equal(output.rows.length, 4);
  const item = output.rows[0]; assert(item.returnTarget); assert.equal(item.time, '07:00'); assert.equal(item.timeZone, 'Asia/Seoul');
  assert.equal(item.sourceUrl, 'https://example.org/source'); assert.equal(item.subchecks[0].title, '준비 확인');
  const url = programOutputReturnUrl('http://127.0.0.1:3641/my?personalWorkspacePoc=v1', f.actorId, item.returnTarget); assert(url);
  assert.deepEqual(parseProgramLocation(new URL(url).hash), { view: 'space', id: f.copy.documentId, returnActorId: f.actorId, executionKey: item.returnTarget.executionKey });
  assert.equal(JSON.stringify(f.data), before);
  const target = readProgramOutputReturnTarget(f.data, parseProgramLocation(new URL(url).hash), f.input.localToday);
  assert.equal(target.kind, 'occurrence');
  if (target.kind === 'occurrence') assert.equal(target.row.key, read(f).rows[0].key);
});

test('PCR exact output lookup reaches a far finite ordinal without treating its elapsed weeks as an open window', () => {
  const f = fixture('매월 31일', '180회', { kind: 'fixed', date: '2026-01-31' });
  const row = read(f, { finiteOffset: 100, finiteLimit: 1 }).rows[0]; assert(row.originalDate > '2040-01-01');
  const key = programPublicCopyOutputTargetKey(row.identity)!;
  assert.deepEqual(readProgramPublicCopyExecutionTarget(key)?.window, { finiteOffset: 100, finiteLimit: 1 });
  const actual = readProgramPublicCopyOutputOccurrence(f.data, { actorId: f.actorId, executionKey: key, today: '2026-12-01' });
  assert(actual.ok, actual.ok ? '' : actual.reason); assert.equal(actual.row.key, row.key);
});

test('PCR exact output lookup uses the supported final open-window weeks without inventing the next window', () => {
  const f = fixture('매일', ''), row = read(f, { windowOffsetWeeks: 512, windowWeeks: 8 }).rows.at(-1)!;
  const key = programPublicCopyOutputTargetKey(row.identity)!, parsed = readProgramPublicCopyExecutionTarget(key); assert(parsed);
  assert.equal(parsed.window.windowOffsetWeeks, 512); assert.equal(parsed.window.windowWeeks, 8);
  const actual = readProgramPublicCopyOutputOccurrence(f.data, { actorId: f.actorId, executionKey: key, today: '2026-12-01' });
  assert(actual.ok, actual.ok ? '' : actual.reason); assert.equal(actual.row.key, row.key);
  const tuple = JSON.parse(key), next = new Date(`${row.originalDate}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1); tuple[8] = next.toISOString().slice(0, 10);
  assert.equal(isProgramExecutionTargetKey(JSON.stringify(tuple)), false);
});

test('PCR returning to completed moved or undated execution follows the original occurrence, not its effective date', () => {
  for (const schedule of [{ mode: 'fixed_date' as const, date: '2029-04-12' }, { mode: 'unscheduled' as const, date: null }]) {
    const f = fixture(), saved = { ...stored(f, 1), schedule }, row = read(f).rows[1];
    f.space.recurrenceExecution = { version: 1, entries: { [row.key]: saved } };
    const before = JSON.stringify(f.data), key = programPublicCopyOutputTargetKey(row.identity)!;
    const actual = readProgramPublicCopyOutputOccurrence(f.data, { actorId: f.actorId, executionKey: key, today: '2026-12-01' });
    assert(actual.ok, actual.ok ? '' : actual.reason); assert.equal(actual.row.key, row.key); assert.equal(actual.row.executionDate, schedule.date);
    assert.equal(actual.row.completion, 'completed'); assert.equal(JSON.stringify(f.data), before);
  }
});

test('PCR a newer unaccepted public version cannot redirect output, and explicit schedule adoption requires review', () => {
  const f = fixture(), row = read(f).rows[0], key = programPublicCopyOutputTargetKey(row.identity)!;
  const newer = programClone(f.data.public.versions[0]); newer.id = 'version-b'; newer.number = 2; newer.parentVersionId = 'version-a';
  f.data.public.versions.push(newer); f.data.public.flows[0].currentVersionId = newer.id;
  const lookup = () => readProgramPublicCopyOutputOccurrence(f.data, { actorId: f.actorId, executionKey: key, today: '2026-12-01' });
  assert(lookup().ok);
  f.copy.appliedFields['item-a'] = { title: newer.id }; assert(lookup().ok);
  f.copy.appliedFields['item-a'].schedule = newer.id;
  assert.equal(programOccurrenceTargetKey(read(f).rows[0]), programOccurrenceTargetKey(row));
  const changed = lookup(); assert(!changed.ok); assert.match(changed.reason, /판본이 바뀌/);
  assert.equal(changed.documentId, f.copy.documentId); assert.equal(changed.lineId, 'copy-line-a');
});

test('PCR forged ordinal/date and schedule snapshots do not resolve to a nearby actual occurrence', () => {
  const f = fixture(), row = read(f).rows[0], key = programPublicCopyOutputTargetKey(row.identity)!;
  for (const change of [(t: unknown[]) => { t[7] = 2; }, (t: unknown[]) => { t[8] = '2026-12-02'; },
    (t: unknown[]) => { t[10] = String(t[10]).replace('07:00', '09:00'); }]) {
    const tuple = JSON.parse(key); change(tuple); const altered = JSON.stringify(tuple);
    assert.equal(isProgramExecutionTargetKey(altered), true); // Syntax is not proof of source identity.
    assert.equal(readProgramPublicCopyOutputOccurrence(f.data, { actorId: f.actorId, executionKey: altered, today: '2026-12-01' }).ok, false);
  }
});

test('PCR return lookup rejects foreign actor, missing copy, excluded item, held row and archived document without writes', () => {
  const f = fixture(), row = read(f).rows[0], key = programPublicCopyOutputTargetKey(row.identity)!;
  const variants = [
    (v: typeof f.data) => { v.activeActorId = 'creator-minji'; },
    (v: typeof f.data) => { v.spaces[f.actorId].copies = []; },
    (v: typeof f.data) => { v.spaces[f.actorId].copies[0].includedItemIds = []; },
    (v: typeof f.data) => { v.spaces[f.actorId].archivedDocumentIds.push(f.copy.documentId); },
    (v: typeof f.data) => { v.spaces[f.actorId].recurrenceExecution = { version: 1, entries: { [row.key]: { ...stored(f), participation: 'held' } } }; },
  ];
  for (const alter of variants) {
    const data = programClone(f.data); alter(data); const before = JSON.stringify(data);
    assert.equal(readProgramPublicCopyOutputOccurrence(data, { actorId: f.actorId, executionKey: key, today: '2026-12-01' }).ok, false);
    assert.equal(JSON.stringify(data), before);
  }
});

test('PCR actual accepted public fields feed the shared reader without a synthetic creator/legacy origin', () => {
  const f = fixture(), before = JSON.stringify(f.data), s = source(f), rows = read(f).rows;
  assert.equal(rows.length, 8); assert.equal(rows[0].time, '07:00'); assert.equal(rows[0].timeZone, 'Asia/Seoul');
  assert.equal(rows[0].identity.publicOwner?.scheduleVersionId, 'version-a'); assert(!('savedCopyId' in rows[0].identity)); assert(!('flowId' in rows[0].identity));
  assert.equal(rows[0].sourceItemRef, programPublicCopyItemRef(f.copy.id, f.copy.flowId, f.item.id));
  assert.equal(JSON.stringify(s).includes('PRIVATE'), false); assert.equal(JSON.stringify(f.data), before);
  const resolved = resolveProgramExecutionSource(f.space, f.input.flowRef, f.data.public); assert(resolved.ok && resolved.kind === 'public-copy');
  assert.equal(resolveProgramExecutionSource(f.space, f.input.flowRef).ok, false);
});
test('PCR typed storage and the real private writer work without enabling recurring publication', () => {
  const f = fixture(), r = read(f).rows[0], before = JSON.stringify(f.data);
  assert.equal(validateProgramSchedule(f.schedule), true); assert.equal(validateProgramData(f.data), true);
  assert.equal(canPublishProgramSchedule(f.schedule), true);
  const result = updateProgramOccurrenceExecution(f.data, { ...f.input, identity: r.identity, expected: null, changes: { completion: { status: 'completed', completedAt: '2026-12-01T00:00:00.000Z' } } });
  assert(result.ok && result.changed); assert(validateProgramData(result.data));
  assert.equal(result.data.spaces[f.actorId].recurrenceExecution?.entries[r.key].completion.status, 'completed');
  assert.equal(JSON.stringify(f.data), before);
});
test('PCR newer repository versions, source archive, personal labels and key order do not silently adopt a schedule', () => {
  const f = fixture(), a = read(f), original = source(f);
  const newer = programClone(f.data.public.versions.at(-1)!); newer.id = 'version-b'; newer.number = 2; newer.parentVersionId = 'version-a'; newer.items[0].title = '새 제목';
  newer.items[0].schedule = { ...f.schedule, time: '09:00' }; f.data.public.versions.push(newer); f.data.public.flows.at(-1)!.currentVersionId = newer.id;
  f.data.public.flows.at(-1)!.archived = true; f.copy.itemOverrides['item-a'] = { title: 'PRIVATE-EDIT' }; f.copy.appliedFields['item-a'] = { title: newer.id };
  const b = read(f); assert.equal(b.rows[0].title, '새 제목'); assert.equal(b.rows[0].time, '07:00'); assert.equal(b.sourceRevisionToken, a.sourceRevisionToken);
  assert.deepEqual(b.rows.map(r => r.key), a.rows.map(r => r.key)); assert(!b.rows[0].flowInactive);
  const reordered = JSON.parse(JSON.stringify(f.data.public), (_k, v) => v && !Array.isArray(v) && typeof v === 'object' ? Object.fromEntries(Object.entries(v).reverse()) : v);
  const checked = readProgramPublicCopyRecurrenceSource(f.space, reordered, f.copy.id); assert(checked.ok); assert.equal(checked.source.sourceRevisionToken, original.sourceRevisionToken);
});
test('PCR explicit schedule-version adoption keeps old completion byte-for-byte as retained conflicting history', () => {
  const f = fixture(), old = stored(f), key = programOccurrenceExecutionKey(old);
  f.space.recurrenceExecution = { version: 1, entries: { [key]: old } }; const saved = JSON.stringify(f.space.recurrenceExecution);
  assert.equal(read(f).rows[0].completion, 'completed');
  const newer = programClone(f.data.public.versions.at(-1)!); newer.id = 'version-b'; newer.number = 2; newer.parentVersionId = 'version-a'; newer.items[0].schedule = { ...f.schedule, time: '09:00' };
  f.data.public.versions.push(newer); f.copy.appliedFields['item-a'] = { schedule: newer.id };
  const next = read(f); assert(next.rows[0].sourceConflict); assert.equal(next.rows[0].completion, 'unrecorded'); assert.deepEqual(next.sourceConflictKeys, [key]);
  assert.equal(JSON.stringify(f.space.recurrenceExecution), saved); assert(isProgramOccurrenceExecution(old));
});
test('PCR two copies and delimiter-containing tuples never share an occurrence key', () => {
  const a = fixture(), b = fixture(); b.copy.id = 'copy-b'; b.input.flowRef = programPublicCopyExecutionRef(b.copy.id);
  assert.notEqual(read(a).rows[0].key, read(b).rows[0].key);
  assert.notEqual(programPublicCopyItemRef('a:b', 'c', 'd'), programPublicCopyItemRef('a', 'b:c', 'd'));
  assert.notEqual(programPublicCopyItemRef('a\",\"b', 'c', 'd'), programPublicCopyItemRef('a', 'b\",\"c', 'd'));
  const first = read(a).rows[0].identity; assert.equal(programOccurrenceExecutionKey(first), read(a).rows[0].key);
});
test('PCR accepting another item schedule never hides this item completion or moved period exception', () => {
  const f = fixture(), other = { ...programClone(f.item), id: 'item-b' };
  f.data.public.versions.at(-1)!.items.push(other); f.copy.itemLines['item-b'] = 'copy-line-b'; f.copy.includedItemIds.push('item-b'); f.copy.recurrence!.itemIds.push('item-b');
  f.space.text.flows.at(-1)!.lines.push({ id: 'copy-line-b', text: '다른 반복' });
  const old = stored(f); old.schedule = { mode: 'fixed_date', date: '2027-06-01' }; const key = programOccurrenceExecutionKey(old);
  f.space.recurrenceExecution = { version: 1, entries: { [key]: old } }; const before = JSON.stringify(f.space.recurrenceExecution);
  const newer = programClone(f.data.public.versions.at(-1)!); newer.id = 'version-b'; newer.number = 2; newer.parentVersionId = 'version-a'; newer.items[1].schedule = { ...f.schedule, time: '09:00' };
  f.data.public.versions.push(newer); f.copy.appliedFields['item-b'] = { schedule: newer.id };
  const current = read(f); assert.equal(current.rows[0].completion, 'completed'); assert.equal(current.rows[0].sourceConflict, false); assert.deepEqual(current.sourceConflictKeys, []);
  const period = readProgramOccurrencePeriod(f.data, { ...f.input, from: '2027-06-01', to: '2027-06-01' }); assert(period.ok); assert.equal(period.rows[0].key, key);
  assert.equal(JSON.stringify(f.space.recurrenceExecution), before);
});
for (const [raw, end, start, expected] of [
  ['매주 월, 수', '3회', '2026-12-01', ['2026-12-01', '2026-12-02', '2026-12-07']],
  ['매월 31일', '3회', '2026-12-31', ['2026-12-31', '2027-01-31', '2027-03-31']],
  ['2일마다', '3회', '2026-12-01', ['2026-12-01', '2026-12-03', '2026-12-05']],
] as const) test(`PCR ${raw} preserves genuine authoring-v1 first start and month/interval semantics`, () => {
  const f = fixture(raw, end, { kind: 'fixed', date: start }); assert.deepEqual(read(f).rows.map(r => r.originalDate), expected);
  for (let i = 0; i < expected.length; i++) assert(isProgramOccurrenceExecution(stored(f, i)));
});
test('PCR view pages preserve canonical source, recurrence identities and completion outside the window', () => {
  const f = fixture('매일', '90회'), whole = read(f, { finiteLimit: 100 });
  const saved = { ...whole.rows[40].identity, schedule: { mode: 'fixed_date' as const, date: '2027-06-01' }, completion: { status: 'completed' as const, completedAt: '2026-12-01T00:00:00.000Z' }, participation: 'included' as const };
  f.space.recurrenceExecution = { version: 1, entries: { [programOccurrenceExecutionKey(saved)]: saved } }; const before = JSON.stringify(f.data);
  const page = read(f, { finiteOffset: 40, finiteLimit: 5 }); assert.deepEqual(page.rows.map(r => r.key), whole.rows.slice(40, 45).map(r => r.key));
  assert.equal(page.series[0].manifest.totalCount, 90); assert.equal(page.rows[0].completion, 'completed');
  const period = readProgramOccurrencePeriod(f.data, { ...f.input, from: '2027-06-01', to: '2027-06-01' }); assert(period.ok); assert.equal(period.rows.length, 1); assert.equal(period.rows[0].key, page.rows[0].key);
  assert.equal(JSON.stringify(f.data), before);
});
test('PCR relative private anchor is required, affects only execution dates and leaves old records intact', () => {
  const f = fixture('매일', '3회', { kind: 'relative', days: -3 }), pending = inspectProgramPublicCopyRecurrence(source(f));
  assert(pending.ok); assert.equal(pending.rows.length, 0); assert.equal(pending.pendingStarts?.[0].reason, 'anchor-required');
  f.copy.anchor = '2026-12-10'; const a = read(f); assert.equal(a.rows[0].originalDate, '2026-12-07');
  const old = stored(f), key = programOccurrenceExecutionKey(old); f.space.recurrenceExecution = { version: 1, entries: { [key]: old } };
  const publicBefore = JSON.stringify(f.data.public), saved = JSON.stringify(f.space.recurrenceExecution); f.copy.anchor = '2027-01-10';
  const b = read(f); assert.equal(b.rows[0].originalDate, '2027-01-07'); assert.notEqual(b.rows[0].key, key); assert(b.outsideWindowKeys.includes(key));
  assert.equal(JSON.stringify(f.space.recurrenceExecution), saved); assert.equal(JSON.stringify(f.data.public), publicBefore); assert(isProgramOccurrenceExecution(old));
});
test('PCR undated and personal one-item date overrides cannot become an inferred today or a series-wide migration', () => {
  const undated = fixture('매일', '3회', { kind: 'undated' }); undated.copy.anchor = '2026-12-10';
  const pending = inspectProgramPublicCopyRecurrence(source(undated)); assert(pending.ok); assert.equal(pending.rows.length, 0); assert.equal(pending.pendingStarts?.[0].reason, 'start-required');
  const f = fixture(); f.copy.itemOverrides['item-a'] = { date: '2027-01-01' }; const before = JSON.stringify(f.data);
  assert.deepEqual(readProgramPublicCopyRecurrenceSource(f.space, f.data.public, f.copy.id), { ok: false, reason: 'public-recurrence-personal-plan-required' }); assert.equal(JSON.stringify(f.data), before);
});
test('PCR included/excluded items and private archive affect execution visibility but not source facts or past records', () => {
  const f = fixture(), old = stored(f), key = programOccurrenceExecutionKey(old); f.space.recurrenceExecution = { version: 1, entries: { [key]: old } };
  const before = source(f).sourceRevisionToken; f.copy.includedItemIds = []; assert(read(f).rows.every(r => r.planExcluded));
  assert.equal(programRecurrencePeriodRows(f.data, { period: 'week', date: '2026-12-01', today: '2026-12-01' }).rows.length, 0);
  f.copy.includedItemIds = ['item-a']; assert.equal(read(f).rows[0].completion, 'completed');
  f.space.archivedDocumentIds.push(f.copy.documentId); assert(read(f).rows.every(r => r.flowInactive)); assert.equal(source(f).sourceRevisionToken, before);
  assert(isProgramRecurrenceExecutionState(f.space.recurrenceExecution));
});
test('PCR public series metadata shares ordinary completion/edit protection and exact current document ownership', () => {
  const f = fixture(); const metadata = programSeriesMetadata(f.space).find(m => m.publicCopyId === f.copy.id); assert(metadata); assert.equal(metadata.lineId, 'copy-line-a');
  const changed = programClone(f.space.text); changed.flows.at(-1)!.lines[0].text = '- [x] changed'; assert.equal(programPreservesSeriesMetadata(f.space, changed), false);
  const note = programClone(f.space.text); note.flows.at(-1)!.lines[1].text = 'PRIVATE-NEW-NOTE'; assert.equal(programPreservesSeriesMetadata(f.space, note), true);
});
test('PCR corruption, missing/foreign/ambiguous versions and index tampering fail without mutating input', () => {
  const variants: ((f: ReturnType<typeof fixture>) => void)[] = [
    f => { delete f.copy.recurrence; }, f => { f.copy.recurrence!.itemIds = []; }, f => { f.copy.recurrence!.itemIds.push('item-a'); },
    f => { f.copy.recurrence = { version: 2, itemIds: ['item-a'] } as never; }, f => { f.copy.recurrence = { version: 1, itemIds: ['item-a'], rule: f.schedule.rule } as never; },
    f => { f.copy.appliedFields['item-a'] = { schedule: 'missing' }; }, f => { f.data.public.versions.at(-1)!.flowId = 'foreign'; },
    f => { f.data.public.versions.push(programClone(f.data.public.versions.at(-1)!)); }, f => { f.data.public.versions.at(-1)!.items.push(programClone(f.item)); },
    f => { f.space.copies.push(programClone(f.copy)); }, f => { f.copy.itemLines['item-a'] = 'missing-line'; },
    f => { f.data.public.versions.at(-1)!.items[0].schedule = { ...f.schedule, privateMemo: 'secret' } as never; },
    f => { f.copy.appliedFields['item-a'] = { unknown: 'version-a' } as never; }, f => { f.item.sourceUrl = 'javascript:alert(1)'; },
  ];
  for (const change of variants) { const f = fixture(); change(f); const before = JSON.stringify(f.data); assert.equal(readProgramPublicCopyRecurrenceSource(f.space, f.data.public, f.copy.id).ok, false); assert.equal(JSON.stringify(f.data), before); }
});
test('PCR retained identity rejects origin mixing, forged dates/rules/version receipts and hidden owner fields', () => {
  const f = fixture(), valid = stored(f); assert(isProgramOccurrenceExecution(valid));
  const mutations: ((v: ProgramOccurrenceExecution) => void)[] = [
    v => { v.savedCopyId = 'legacy'; }, v => { v.flowId = 'legacy'; }, v => { v.publicOwner!.copyId = 'foreign'; },
    v => { v.publicOwner!.scheduleVersionId = 'foreign'; }, v => { v.sourceRevisionToken = '{}'; }, v => { v.sourceRevisionToken = 'not json'; },
    v => { v.originalDate = '2026-12-02'; }, v => { v.occurrenceIndex = 0; }, v => { v.sourceRule.startDate = '2026-11-01'; },
    v => { v.sourceRule.recurrence = '매일'; }, v => { v.publicOwner!.schedule.rule.interval = 2; },
    v => { v.nativeOwner = { kind: 'native-creator' } as never; }, v => { v.publicOwner = { ...v.publicOwner!, extra: true } as never; },
  ];
  for (const change of mutations) { const v = programClone(valid); change(v); assert.equal(isProgramOccurrenceExecution(v), false); }
  let getters = 0; const hostile = programClone(valid); Object.defineProperty(hostile.publicOwner!, 'schedule', { enumerable: true, get() { getters++; return f.schedule; } });
  assert.equal(validateProgramPublicCopyOccurrenceIdentity(hostile), false); assert.equal(getters, 0);
});
test('PCR invalid windows fail even on empty sources; far open-ended rows preserve their bounded exact identity', () => {
  const f = fixture('매일', ''), s = source(f);
  for (const window of [{ finiteOffset: -1 }, { finiteLimit: 201 }, { windowWeeks: 9 }, { windowOffsetWeeks: 513 }, { extra: 1 }, { finiteLimit: null }]) {
    assert.equal(inspectProgramPublicCopyRecurrence(s, window as never).ok, false); assert.equal(inspectProgramPublicCopyRecurrence({ ...s, items: [] }, window as never).ok, false);
  }
  const far = read(f, { windowOffsetWeeks: 512, windowWeeks: 8 }).rows.at(-1)!;
  const execution: ProgramOccurrenceExecution = { ...far.identity, schedule: { mode: 'inherit', date: null }, completion: { status: 'open', completedAt: null }, participation: 'included' };
  assert(isProgramOccurrenceExecution(execution)); assert(programOccurrenceWindowFor(execution).windowWeeks! <= 8);
  const roundtrip = JSON.parse(JSON.stringify({ version: 1, entries: { [programOccurrenceExecutionKey(execution)]: execution } })); assert(isProgramRecurrenceExecutionState(roundtrip));
});
