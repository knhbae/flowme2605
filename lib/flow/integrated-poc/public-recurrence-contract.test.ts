import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAuthoringRecurrenceRule, projectAuthoringRecurrenceDates } from './native-creator-vendor/text-authoring/recurrence';
import { programPublicRecurrenceFromAuthoring, programPublicRecurrenceToAuthoring, projectProgramPublicRecurrence, validateProgramPublicRecurrence,
  programRecurringDraftFromSchedule, programRecurringScheduleFromDraft, programRecurringScheduleStart, programRecurringScheduleLabel,
  validateProgramPublicRecurringSchedule, validateProgramPublicationRecurrenceDraft, type ProgramPublicRecurringScheduleV1 } from './public-recurrence-contract';
import { validateProgramSchedule, canPublishProgramSchedule } from './program-data';

function rule(raw: string, repeatEnd?: string) {
  const parsed = parseAuthoringRecurrenceRule({ raw, repeatEnd, sourceRowIds: ['PRIVATE-SOURCE-ID'], executionCondition: 'PRIVATE-CONDITION' });
  assert(parsed.ok); const value = programPublicRecurrenceFromAuthoring(parsed.rule); assert(value); return { value, parsed: parsed.rule };
}
for (const [raw, end, start] of [
  ['2일마다', '8회', '2026-12-01'], ['매주 월, 수', '8회', '2026-12-01'],
  ['2주마다 금', '2027-03-01', '2026-12-04'], ['매월 31일', '4회', '2026-12-31'],
  ['2개월마다 15일', undefined, '2026-12-15'], ['매일', undefined, '2026-12-01'],
] as const) test(`PRC source parity: ${raw} / ${end ?? 'open'}`, () => {
  const { value, parsed } = rule(raw, end), before = JSON.stringify(value);
  assert(validateProgramPublicRecurrence(value));
  const options = { itemId: 'public-item', startDate: start, offset: 0, limit: 30, openEndedWeeks: 4, openEndedOffsetWeeks: 0 };
  const projected = projectProgramPublicRecurrence({ ...options, rule: value }); assert(projected.ok);
  assert.deepEqual(projected.projection, projectAuthoringRecurrenceDates({ ...options, rule: parsed }));
  assert.equal(JSON.stringify(value), before); assert(!before.includes('PRIVATE')); assert(!before.includes('raw'));
  assert.deepEqual(programPublicRecurrenceToAuthoring(value)!.sourceRowIds, []);
});
test('PRC first start and skipped short months preserve authoring semantics, not an inferred RRULE', () => {
  const weekly = projectProgramPublicRecurrence({ itemId: 'w', startDate: '2026-12-01', rule: rule('매주 월, 수', '3회').value }); assert(weekly.ok);
  assert.deepEqual(weekly.projection.occurrences.map(row => row.date), ['2026-12-01', '2026-12-02', '2026-12-07']);
  const monthly = projectProgramPublicRecurrence({ itemId: 'm', startDate: '2026-12-31', rule: rule('매월 31일', '3회').value }); assert(monthly.ok);
  assert.deepEqual(monthly.projection.occurrences.map(row => row.date), ['2026-12-31', '2027-01-31', '2027-03-31']);
});
test('PRC paging does not change total count, canonical identity, or source end', () => {
  const value = rule('매일', '90회').value, before = JSON.stringify(value);
  const a = projectProgramPublicRecurrence({ itemId: 'same', startDate: '2026-12-01', rule: value, limit: 5, offset: 30 }); assert(a.ok);
  const b = projectProgramPublicRecurrence({ itemId: 'same', startDate: '2026-12-01', rule: value, limit: 50 }); assert(b.ok);
  assert.deepEqual(a.projection.occurrences, b.projection.occurrences.slice(30, 35)); assert.equal(a.projection.totalCount, 90);
  assert.equal(JSON.stringify(value), before);
});
test('PRC strict public whitelist rejects hidden metadata, unknown semantics, incompatible and corrupt rules', () => {
  const valid = rule('매주 월', '4회').value;
  const invalid = [{ ...valid, version: 2 }, { ...valid, semantics: 'rrule' }, { ...valid, sourceRowIds: ['private'] },
    { ...valid, raw: 'private' }, { ...valid, completedAt: 'private' }, { ...valid, interval: 0 }, { ...valid, interval: NaN },
    { ...valid, interval: Infinity }, { ...valid, weekdays: [] }, { ...valid, weekdays: ['MO', 'MO'] }, { ...valid, weekdays: ['MON'] },
    { ...valid, dayOfMonth: 1 }, { ...valid, end: { mode: 'count', count: 0 } }, { ...valid, end: { mode: 'until', date: '2026-02-30' } },
    { ...valid, end: { mode: 'count', count: 3, raw: 'private' } }, { ...valid, frequency: 'monthly', weekdays: undefined, dayOfMonth: 32 }];
  for (const value of invalid) { assert.equal(validateProgramPublicRecurrence(value), false); assert.equal(programPublicRecurrenceToAuthoring(value), null); }
  let getters = 0; const hostile = Object.defineProperty({}, 'version', { enumerable: true, get() { getters++; return 1; } });
  assert.equal(validateProgramPublicRecurrence(hostile), false); assert.equal(getters, 0);
  assert.equal(validateProgramPublicRecurrence(new Proxy({}, { getPrototypeOf() { throw Error('blocked'); } })), false);
  assert.equal(validateProgramPublicRecurrence({ ...valid, end: { mode: 'until', date: '0000-01-01' } }), false);
});
test('PRC invalid and excessive views fail without inventing a date or rewriting rules', () => {
  const value = rule('매일', '8회').value;
  for (const patch of [{ startDate: '' }, { startDate: '2026-02-30' }, { startDate: '0000-01-01' }, { limit: 0 }, { limit: 201 }, { offset: 10001 }, { offset: -1 },
    { openEndedWeeks: 9 }, { openEndedOffsetWeeks: 513 }, { itemId: '' }]) {
    assert.equal(projectProgramPublicRecurrence({ itemId: 'item', startDate: '2026-12-01', rule: value, ...patch }).ok, false);
  }
});
test('PRC incomplete consumer rollout cannot activate a stored recurring schedule', () => {
  const old = [{ kind: 'undated' }, { kind: 'fixed', date: '2026-12-01' }, { kind: 'relative', days: -3 }];
  for (const value of old) assert(validateProgramSchedule(value));
  assert.equal(validateProgramSchedule({ kind: 'recurring', rule: rule('매일', '8회').value }), false);
});
for (const start of [{ kind: 'undated' }, { kind: 'fixed', date: '2026-12-01' }, { kind: 'relative', days: -3 }] as const) {
  test(`PRC recurring draft round trip preserves original ${start.kind} start, time, timezone and end`, () => {
    const schedule: ProgramPublicRecurringScheduleV1 = { kind: 'recurring', version: 1, rule: rule('매주 월, 수', '8회').value, start, time: '09:30', timeZone: 'Asia/Seoul' };
    assert(validateProgramPublicRecurringSchedule(schedule)); const draft = programRecurringDraftFromSchedule(schedule);
    assert(validateProgramPublicationRecurrenceDraft(draft)); assert.deepEqual(programRecurringScheduleFromDraft(draft), schedule);
    assert.equal(programRecurringScheduleStart(schedule, '2026-12-01'), start.kind === 'undated' ? null : start.kind === 'fixed' ? '2026-12-01' : '2026-11-28');
    assert.equal(programRecurringScheduleStart(schedule, null), start.kind === 'fixed' ? '2026-12-01' : null);
    assert(programRecurringScheduleLabel(schedule).includes('8회')); assert(programRecurringScheduleLabel(schedule).includes('09:30'));
    assert.equal(validateProgramSchedule(schedule), true, 'typed storage validates the complete contract');
    assert.equal(canPublishProgramSchedule(schedule), true, 'strict supported schedules share the consumer contract');
  });
}
test('PRC recurring schedule rejects incompatible dates, private metadata, malformed time and unrecognized timezone', () => {
  const schedule: ProgramPublicRecurringScheduleV1 = { kind: 'recurring', version: 1, rule: rule('매일', '8회').value, start: { kind: 'fixed', date: '2026-12-01' }, time: '09:30', timeZone: 'Asia/Seoul' };
  for (const patch of [{ version: 2 }, { privateAnchor: '2026-12-01' }, { time: '24:00' }, { time: '9:30' }, { timeZone: 'Not/AZone' },
    { start: { kind: 'fixed', date: '2026-02-30' } }, { start: { kind: 'relative', days: 1.5 } }, { start: { kind: 'relative', days: 36601 } },
    { start: { kind: 'undated', anchor: 'private' } }, { rule: rule('매일', '2026-11-01').value }]) assert.equal(validateProgramPublicRecurringSchedule({ ...schedule, ...patch }), false);
  assert.equal(validateProgramPublicRecurringSchedule({ ...schedule, [Symbol('private')]: 'no' }), false);
  assert.equal(validateProgramPublicRecurringSchedule(Object.defineProperty({ ...schedule }, 'private', { value: 'no', enumerable: false })), false);
});
test('PRC private draft preserves unfinished text but rejects unknown start semantics and accessors before parsing', () => {
  const draft = { version: 1 as const, raw: '매주 ㅎ', end: '8', startKind: 'relative' as const, startValue: '-', time: '1:', timeZone: 'Asia/Seou' };
  assert(validateProgramPublicationRecurrenceDraft(draft)); assert.equal(programRecurringScheduleFromDraft(draft), null);
  assert.equal(validateProgramPublicationRecurrenceDraft({ ...draft, startKind: 'today' }), false);
  assert.equal(programRecurringScheduleFromDraft({ ...draft, startKind: 'today' } as never), null);
  assert.equal(validateProgramPublicationRecurrenceDraft({ ...draft, raw: 'a'.repeat(501) }), false);
  let getters = 0; const hostile = Object.defineProperty({ ...draft }, 'raw', { enumerable: true, get() { getters++; throw Error('no'); } });
  assert.equal(programRecurringScheduleFromDraft(hostile), null); assert.equal(getters, 0);
});
