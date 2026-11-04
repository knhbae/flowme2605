import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramData, ProgramTransition } from './contract';
import { createProgramData, createProgramEnvelope, isProgramRepeatLog, PROGRAM_REPEAT_LOG_DAYS } from './program-data';
import { addProgramQuickTask, completeProgramTask, createProgramDocument } from './private-space';
import { createAlphaFakeServer } from './alpha-persistence/fake-server';
import { captureAlphaAccount, commandFromProgramTransition, validateAlphaAccount } from './alpha-persistence/program-adapter';
import { createAlphaSyntheticFixtures } from './alpha-persistence/synthetic-fixtures';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from './recurrence-state';
import { isM3Command } from './alpha-sync/contract';
import { programOccurrenceExecutionKey } from './recurrence-state-contract';

// N9 item 6, revised 11/4: N10 keeps repeat line days in recurrenceExecution.lines (the production account check lists
// the space's keys, so a new top-level field would need a database change; recurrenceExecution is already allowed).
// N9 opens such an account, saves other changes without touching the days, and keeps them byte for byte, so a
// rollback from N10 to N9 refuses no account. N9 never writes them.
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `n9-log-${++request}`, expectedSpace: data.spaces[data.activeActorId] });
const LINES = { 'line-gone': ['2026-11-01'], 'line-b': ['2026-11-09', '2026-11-11'] };

function account(lines?: unknown, topLevel?: unknown) {
  let data = createProgramData();
  const doc = ok(createProgramDocument(data, { ...base(data), title: '운동' })); data = doc.data;
  const task = ok(addProgramQuickTask(data, { ...base(data), documentId: doc.result, title: '장보기', date: '2026-11-12' })); data = task.data;
  const space = data.spaces[data.activeActorId] as Record<string, unknown>;
  if (lines !== undefined) space.recurrenceExecution = { version: 1, entries: {}, lines };
  if (topLevel !== undefined) space.repeatLog = topLevel;
  return { data, taskId: task.result };
}
const capture = (data: ProgramData, actorId = data.activeActorId) => captureAlphaAccount(createProgramEnvelope(data), actorId, 'n9-owner');
async function saveAndReopen(seed: ReturnType<typeof capture>, build: (data: ProgramData) => ProgramTransition<string>, fields: string[]) {
  const server = createAlphaFakeServer([seed]), repository = server.connect(server.issueSession('n9-owner'));
  const opened = await repository.read(); assert(opened.ok);
  const command = commandFromProgramTransition(opened.value, seed.references, 'n9-save', build);
  assert.deepEqual(command.kind === 'change-private' && command.changes.map(change => change.field), fields);
  assert(isM3Command(command));
  const saved = await repository.execute(command); assert(saved.ok, saved.ok ? '' : saved.reason);
  const reopened = await repository.read(); assert(reopened.ok); assert.equal(reopened.value.revision, 1);
  const undo = await repository.execute({ schema: 'flowme-alpha-command/1', requestId: 'n9-undo', expectedRevision: 1, kind: 'undo-private', operationId: 'n9-save' });
  assert(undo.ok, undo.ok ? '' : undo.reason);
  const undone = await repository.read(); assert(undone.ok);
  return { opened: opened.value, reopened: reopened.value, undone: undone.value };
}

test('an account with repeat line days opens, saves another change and reopens with them byte for byte', async () => {
  const { data, taskId } = account(LINES), seed = capture(data);
  // The stored bytes, as the account holds them (storage orders keys; the values are the ones written).
  const before = JSON.stringify(seed.account.space.recurrenceExecution);
  assert.deepEqual(JSON.parse(before).lines, LINES);
  const { opened, reopened, undone } = await saveAndReopen(seed, current => completeProgramTask(current, { ...base(current), taskId, date: '2026-11-09', done: true }), ['text']);
  for (const value of [opened, reopened, undone]) assert.equal(JSON.stringify(value.space.recurrenceExecution), before);
  assert.notEqual(JSON.stringify(reopened.space.text), JSON.stringify(opened.space.text), 'the other change was saved');
});

test('checking an imported Flow repeat rewrites recurrenceExecution and keeps the lines byte for byte', async () => {
  const fixture = createAlphaSyntheticFixtures().find(entry => entry.name === 'recurring-occurrence-records')!;
  const data = structuredClone(fixture.envelope.data), actorId = fixture.actorId, space = data.spaces[actorId];
  const entriesBefore = Object.keys(space.recurrenceExecution!.entries).length;
  space.recurrenceExecution = { ...space.recurrenceExecution!, lines: LINES };
  const seed = capture(data, actorId), lines = JSON.stringify(seed.account.space.recurrenceExecution!.lines);
  const input = { actorId, flowRef: space.savedBindings[0].flowRef, localToday: '2026-09-21' };
  const { reopened, undone } = await saveAndReopen(seed, current => {
    const rows = readProgramExecutionOccurrences(current, input); assert(rows.ok);
    const open = rows.rows.find(row => !current.spaces[actorId].recurrenceExecution!.entries[programOccurrenceExecutionKey(row.identity)])!;
    return updateProgramOccurrenceExecution(current, { ...input, identity: open.identity, expected: null, changes: { completion: { status: 'completed', completedAt: '2026-09-23T01:00:00.000Z' } } });
  }, ['recurrenceExecution']);
  assert.equal(Object.keys(reopened.space.recurrenceExecution!.entries).length, entriesBefore + 1, 'the occurrence was recorded');
  assert.equal(JSON.stringify(reopened.space.recurrenceExecution!.lines), lines);
  assert.equal(JSON.stringify(undone.space.recurrenceExecution!.lines), lines);
});

test('an account without repeat line days behaves as before: no field appears, and the save is the same one field', async () => {
  const { data, taskId } = account(), seed = capture(data);
  assert(!Object.hasOwn(seed.account.space, 'recurrenceExecution'));
  const { reopened, undone } = await saveAndReopen(seed, current => completeProgramTask(current, { ...base(current), taskId, date: '2026-11-09', done: true }), ['text']);
  assert(!Object.hasOwn(reopened.space, 'recurrenceExecution') && !Object.hasOwn(undone.space, 'recurrenceExecution'));
});

test('the days follow the N10 shape: ascending and once each, 10,000 days in all; anything else is refused', () => {
  assert(isProgramRepeatLog({}));
  assert(isProgramRepeatLog({ a: [] }), 'an emptied line is kept as written');
  for (const bad of [[], null, 'x', { a: ['2026-11-09', '2026-11-09'] }, { a: ['2026-11-11', '2026-11-09'] }, { a: ['2026-02-30'] },
    { a: ['2026-11-09T00:00'] }, { a: [20261109] }, { a: '2026-11-09' }, { '': ['2026-11-09'] }])
    assert(!isProgramRepeatLog(bad), JSON.stringify(bad));
  const day = (n: number) => new Date(Date.UTC(2000, 0, 1) + n * 86_400_000).toISOString().slice(0, 10);
  const full = { a: Array.from({ length: PROGRAM_REPEAT_LOG_DAYS / 2 }, (_, n) => day(n)), b: Array.from({ length: PROGRAM_REPEAT_LOG_DAYS / 2 }, (_, n) => day(n)) };
  assert(isProgramRepeatLog(full));
  assert(!isProgramRepeatLog({ ...full, c: ['2026-11-09'] }), 'one day over the limit');
  // The account check uses it: malformed days are refused, so the field is not a way around validation.
  const broken = structuredClone(capture(account({ a: ['2026-11-11'] }).data));
  assert(validateAlphaAccount(broken.account, broken.references));
  broken.account.space.recurrenceExecution!.lines = { a: ['2026-11-11', '2026-11-01'] };
  assert(!validateAlphaAccount(broken.account, broken.references));
});

test('a top-level repeatLog is refused again: the production account check would refuse it too', () => {
  assert.throws(() => capture(account(undefined, { a: ['2026-11-09'] }).data));
});
