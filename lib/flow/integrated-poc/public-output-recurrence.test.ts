import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProgramOutput } from './output';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';
import type { ProgramPublicVersion } from './contract';
import { defaultProgramOutputRecurrenceWindow, programCalendarDateTime } from './public-output-recurrence';
import { readProgramDiscoveryPresentation } from './navigation';
import { createTransientOutputDraft, previewTransientOutput } from './transient-output';
import { createProgramData } from './program-data';
import { importProgramPublicVersion } from './private-space';
import { inspectProgramPrivateOutput, makeProgramPrivateOutput } from './private-output';
import { programOutputReturnUrl } from './output-return';
import { parseProgramLocation } from './navigation';
import { readProgramOutputReturnTarget } from './output-return-target';

const now = '2026-09-14T00:00:00Z';
function source(): ProgramPublicVersion {
  return { id: 'output-series-v1', flowId: 'output-series', number: 1, parentVersionId: null, title: '원래 반복', summary: '출력 검증 자료',
    createdBy: 'author', createdAt: now, source: { kind: 'user-text', label: '직접 정리한 자료', url: null, checkedAt: null },
    items: [{ id: 'weekly', title: '운동', description: '조건을 확인하고 시작', completionCriteria: '세트 종료', sourceUrl: null, subchecks: [{ id: 'check', title: '준비' }],
      schedule: programRecurringScheduleFromDraft({ version: 1, raw: '매주 화, 목', end: '8회', startKind: 'fixed', startValue: '2026-12-02', time: '07:00', timeZone: 'Asia/Seoul' })! }] };
}
test('public TXT retains the typed recurrence and explicit start, time and zone', () => {
  const value = source(), before = JSON.stringify(value);
  const result = makeProgramOutput(value, { format: 'txt', selectedItemIds: ['weekly'] }, now);
  assert.equal(result.ok, true); if (!result.ok) return;
  for (const fact of ['매주 화, 목', '8회', '2026-12-02', '07:00', 'Asia/Seoul', '세트 종료', '준비']) assert.ok(result.payload.includes(fact), fact);
  assert.deepEqual(result.undatedItemIds, []); assert.equal(JSON.stringify(value), before);
});
test('calendar recurrence requires an explicit output window instead of silently omitting the item', () => {
  assert.deepEqual(makeProgramOutput(source(), { format: 'ics', selectedItemIds: ['weekly'] }, now), { ok: false, reason: 'missing-recurrence-window' });
});
const window = () => defaultProgramOutputRecurrenceWindow();
function file(value = source(), format: 'txt' | 'csv' | 'ics' = 'ics', extra: Partial<Parameters<typeof makeProgramOutput>[1]> = {}) {
  const result = makeProgramOutput(value, { format, selectedItemIds: value.items.map(item => item.id), recurrenceWindow: window(), ...extra }, now);
  assert.ok(result.ok, JSON.stringify(result)); return result;
}
const unfolded = (value: string) => value.replace(/\r\n[ \t]/g, '');
const uid = (value: string) => unfolded(value).match(/^UID:(.*)\r$/m)![1];
test('mismatched weekday start remains occurrence one; ICS is one timed group with exact RDATE values', () => {
  const result = file(), text = unfolded(result.payload);
  assert.deepEqual(result.series?.[0].dates, ['2026-12-02','2026-12-03','2026-12-08','2026-12-10','2026-12-15','2026-12-17','2026-12-22','2026-12-24']);
  assert.equal(text.split('BEGIN:VEVENT').length - 1, 1); assert.ok(text.includes('DTSTART:20261201T220000Z\r\n'));
  assert.ok(text.includes('RDATE:20261202T220000Z,20261207T220000Z,20261209T220000Z,20261214T220000Z,20261216T220000Z,20261221T220000Z,20261223T220000Z'));
  assert.ok(!text.includes('DTEND')); assert.ok(!text.includes('RRULE:')); assert.ok(!text.includes('TZID='));
  assert.ok(text.includes('Asia/Seoul')); assert.ok(text.includes('전체 8회차')); assert.deepEqual(result.itemIds, ['weekly']);
  for (const line of result.payload.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
});
test('month-end skips preserve authoring semantics without replacing the typed source with generated rows', () => {
  const value = source(); value.items[0].schedule = programRecurringScheduleFromDraft({ version: 1, raw: '매월 31일', end: '4회', startKind: 'fixed', startValue: '2026-01-30', time: '', timeZone: '' })!;
  const before = JSON.stringify(value), result = file(value), text = unfolded(result.payload);
  assert.deepEqual(result.series?.[0].dates, ['2026-01-30','2026-01-31','2026-03-31','2026-05-31']);
  assert.ok(text.includes('DTSTART;VALUE=DATE:20260130')); assert.ok(text.includes('RDATE;VALUE=DATE:20260131,20260331,20260531'));
  assert.equal(JSON.stringify(value), before); assert.equal(value.items.length, 1);
});
test('finite pages and open-ended week windows report their scope rather than inventing an end', () => {
  const value = source(), first = file(value, 'ics', { recurrenceWindow: { ...window(), limit: 2 } });
  const next = file(value, 'ics', { recurrenceWindow: { ...window(), offset: 2, limit: 2 } });
  assert.deepEqual(next.series?.[0].indices, [3,4]); assert.equal(next.series?.[0].hasMore, true); assert.notEqual(uid(first.payload), uid(next.payload));
  assert.equal(uid(first.payload), uid(file(value, 'ics', { recurrenceWindow: { ...window(), limit: 2 } }).payload));
  assert.equal(value.items[0].schedule.kind, 'recurring'); if (value.items[0].schedule.kind !== 'recurring') return;
  value.items[0].schedule.rule.end = null;
  const open = file(value, 'ics', { recurrenceWindow: { ...window(), openEndedOffsetWeeks: 1, openEndedWeeks: 2 } });
  assert.deepEqual(open.series?.[0].dates, ['2026-12-10','2026-12-15','2026-12-17','2026-12-22']);
  assert.equal(open.series?.[0].totalCount, null); assert.equal(open.series?.[0].hasMore, true);
  assert.ok(open.series?.[0].scope?.includes('2026-12-09 ~ 2026-12-22')); assert.equal(value.items[0].schedule.rule.end, null);
});
test('undated rules survive TXT/CSV, require an explicit calendar start, and never inherit today', () => {
  const value = source(); if (value.items[0].schedule.kind !== 'recurring') return;
  value.items[0].schedule.start = { kind: 'undated' }; const before = JSON.stringify(value);
  for (const format of ['txt','csv'] as const) { const result = file(value, format); assert.ok(result.payload.includes('매주')); assert.deepEqual(result.undatedItemIds, ['weekly']); }
  assert.deepEqual(makeProgramOutput(value, { format: 'ics', selectedItemIds: ['weekly'], recurrenceWindow: window() }, now), { ok: false, reason: 'missing-recurrence-start' });
  const result = file(value, 'ics', { recurrenceStarts: { weekly: '2027-01-01' } }); assert.equal(result.series?.[0].dates[0], '2027-01-01');
  assert.equal(JSON.stringify(value), before);
});
test('relative recurrence anchor resolves explicitly and respects until boundaries', () => {
  const value = source(); if (value.items[0].schedule.kind !== 'recurring') return;
  value.items[0].schedule.start = { kind: 'relative', days: -3 }; value.items[0].schedule.rule.end = { mode: 'until', date: '2026-12-10' };
  assert.deepEqual(makeProgramOutput(value, { format: 'txt', selectedItemIds: ['weekly'] }, now), { ok: false, reason: 'missing-anchor' });
  const result = file(value, 'ics', { anchor: '2026-12-05' }); assert.deepEqual(result.series?.[0].dates, ['2026-12-02','2026-12-03','2026-12-08','2026-12-10']);
  assert.deepEqual(makeProgramOutput(value, { format: 'ics', selectedItemIds: ['weekly'], anchor: '2027-01-01', recurrenceWindow: window() }, now), { ok: false, reason: 'invalid-date' });
});
test('UTC conversion preserves midnight, fractional offsets and RFC fold/gap semantics', () => {
  for (const [date, time, zone, expected] of [
    ['2026-12-02','00:00','Asia/Seoul','20261201T150000Z'], ['2026-12-02','07:00','Asia/Kathmandu','20261202T011500Z'],
    ['2007-11-04','01:30','America/New_York','20071104T053000Z'], ['2007-03-11','02:30','America/New_York','20070311T073000Z'],
    ['2026-03-09','02:30','America/New_York','20260309T063000Z'], ['2026-04-05','01:45','Australia/Lord_Howe','20260404T144500Z'],
    ['2011-12-30','09:00','Pacific/Apia','20111230T190000Z'],
  ]) assert.equal(programCalendarDateTime(date, time, zone), expected, `${date}/${time}/${zone}`);
  assert.equal(programCalendarDateTime('2026-12-02','07:00',null), '20261202T070000');
  assert.equal(programCalendarDateTime('2026-12-02',null,'Asia/Seoul'), '20261202');
  assert.equal(programCalendarDateTime('2026-02-30','07:00','UTC'), null); assert.equal(programCalendarDateTime('2026-12-02','24:00','UTC'), null);
  assert.equal(programCalendarDateTime('2026-12-02','07:00','Unsupported/Zone'), null);
});
test('CSV adds recurrence fields only when needed and retains source content, formula mitigation and occurrence scope', () => {
  const value = source(); value.items[0].title = '=untrusted'; const result = file(value, 'csv');
  for (const expected of ['"원래 반복"','"시간"','"시간대"','"출력 범위"','"회차 날짜"','"\t=untrusted"','07:00','Asia/Seoul','8회차: 2026-12-24']) assert.ok(result.payload.includes(expected), expected);
  assert.equal(result.itemIds.length, 1);
});
test('malformed or empty windows and attempts to override fixed/foreign starts fail closed without mutation', () => {
  const value = source(), before = JSON.stringify(value);
  for (const patch of [{ limit: 0 }, { limit: 201 }, { offset: -1 }, { offset: 10001 }, { openEndedWeeks: 9 }, { openEndedOffsetWeeks: 513 }, { version: 2 }, { privateNote: 'no' }, { limit: NaN }, { [Symbol('private')]: 1 }]) {
    assert.deepEqual(makeProgramOutput(value, { format: 'ics', selectedItemIds: ['weekly'], recurrenceWindow: { ...window(), ...patch } as never }, now), { ok: false, reason: 'invalid-recurrence-window' });
  }
  for (const starts of [{ weekly: '2026-12-03' }, { foreign: '2026-12-03' }] as Record<string, string>[]) assert.deepEqual(makeProgramOutput(value, { format: 'txt', selectedItemIds: ['weekly'], recurrenceStarts: starts }, now), { ok: false, reason: 'invalid-recurrence-start' });
  assert.deepEqual(makeProgramOutput(value, { format: 'ics', selectedItemIds: ['weekly'], recurrenceWindow: { ...window(), offset: 8 } }, now), { ok: false, reason: 'empty-recurrence-window' });
  assert.equal(JSON.stringify(value), before);
});
test('output range and start presentation survive detached navigation, including invalid numeric input without execution', () => {
  const presentation = { query: '운동', category: '', situation: '', lastFlowId: 'flow', scrollTop: 20, versionByFlow: {},
    details: { v1: { selectedItemIds: ['weekly'], anchor: '', format: 'ics', recurrenceWindow: { ...window(), limit: 0 }, recurrenceStarts: { weekly: '2026-12-02' } } } };
  const read = readProgramDiscoveryPresentation(presentation); assert.ok(read); assert.deepEqual(read, presentation);
  read.details.v1.recurrenceWindow!.limit = 2; read.details.v1.recurrenceStarts!.weekly = '2026-12-03';
  assert.equal(presentation.details.v1.recurrenceWindow.limit, 0); assert.equal(presentation.details.v1.recurrenceStarts.weekly, '2026-12-02');
  assert.equal(readProgramDiscoveryPresentation({ ...presentation, details: { v1: { ...presentation.details.v1, recurrenceWindow: { ...window(), raw: 'private' } } } }), null);
  assert.equal(readProgramDiscoveryPresentation({ ...presentation, details: { v1: { ...presentation.details.v1, recurrenceStarts: { weekly: '2026-02-30' } } } }), null);
});
test('unsupported transient schedule cannot silently become undated', () => {
  const draft = createTransientOutputDraft('그대로 보존할 원문', { id: 'd', title: 'd', sourceUrl: '' }, now); assert.ok(draft.ok);
  draft.draft.rows[0].scheduleKind = 'recurring' as never;
  assert.deepEqual(previewTransientOutput(draft.draft, now), { ok: false, reason: 'unsupported-schedule' });
});
test('actual imported public series exports selected private occurrences at the same time with source facts and exact return', () => {
  const value = source(); value.createdBy = 'creator-minji'; value.source.url = 'https://example.org/original';
  const data = createProgramData(); data.public.flows.push({ id: value.flowId, ownerId: value.createdBy, currentVersionId: value.id, category: '운동', situations: [], derivedFrom: null, archived: false }); data.public.versions.push(value);
  const actorId = data.activeActorId, imported = importProgramPublicVersion(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'import-for-output', versionId: value.id, itemIds: ['weekly'], anchor: null });
  assert.ok(imported.ok); const current = imported.data, documentId = current.spaces[actorId].copies[0].documentId, before = JSON.stringify(current);
  const range = { from: '2026-12-01', to: '2026-12-31', includeUndated: false };
  const inspection = inspectProgramPrivateOutput(current, { actorId, documentId, occurrenceRange: range }); assert.ok(inspection.ok); assert.equal(inspection.rows.length, 8);
  const row = inspection.rows[0], returnPageUrl = 'http://127.0.0.1:3641/my?personalWorkspacePoc=v1';
  for (const format of ['txt','csv','ics'] as const) {
    const result = makeProgramPrivateOutput(current, { actorId, documentId, occurrenceRange: range, mode: 'tasks', selectedItemIds: [row.id], format, returnPageUrl }, now); assert.ok(result.ok);
    const text = unfolded(result.payload); for (const expected of ['매주 화', 'Asia/Seoul', '07:00', '세트 종료', 'https://example.org/original', '수용한 일정 판본: 1']) assert.ok(text.includes(expected), expected);
    if (format === 'ics') { assert.ok(text.includes('DTSTART:20261201T220000Z')); assert.ok(!text.includes('DTEND')); assert.equal(text.split('BEGIN:VEVENT').length - 1, 1); }
  }
  const url = programOutputReturnUrl(returnPageUrl, actorId, row.returnTarget); assert.ok(url);
  const restored = readProgramOutputReturnTarget(current, parseProgramLocation(new URL(url).hash), '2026-12-02');
  assert.equal(restored.kind, 'occurrence'); if (restored.kind === 'occurrence') assert.equal(`occurrence:${restored.row.key}`, row.id);
  assert.equal(JSON.stringify(current), before); assert.equal(JSON.stringify(data.public), JSON.stringify(current.public));
});
