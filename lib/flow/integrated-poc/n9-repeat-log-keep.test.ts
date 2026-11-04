import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramData, ProgramTransition } from './contract';
import { createProgramData, createProgramEnvelope, isProgramRepeatLog, PROGRAM_REPEAT_LOG_DAYS } from './program-data';
import { addProgramQuickTask, completeProgramTask, createProgramDocument } from './private-space';
import { createAlphaFakeServer, validateAlphaCommand } from './alpha-persistence/fake-server';
import { captureAlphaAccount, commandFromProgramTransition, validateAlphaAccount } from './alpha-persistence/program-adapter';
import { isM3Command } from './alpha-sync/contract';

// N9 item 6 (11/4): N10 adds the optional repeatLog to the account. N9 opens such an account, saves other changes
// without touching it, and keeps it byte for byte, so a rollback from N10 to N9 refuses no account. N9 never writes it.
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `n9-log-${++request}`, expectedSpace: data.spaces[data.activeActorId] });

function account(repeatLog?: unknown) {
  let data = createProgramData();
  const doc = ok(createProgramDocument(data, { ...base(data), title: '운동' })); data = doc.data;
  const task = ok(addProgramQuickTask(data, { ...base(data), documentId: doc.result, title: '운동 @매주 월 목', date: '2026-11-12' })); data = task.data;
  if (repeatLog !== undefined) (data.spaces[data.activeActorId] as Record<string, unknown>).repeatLog = repeatLog;
  return { seed: captureAlphaAccount(createProgramEnvelope(data), data.activeActorId, 'n9-owner'), taskId: task.result };
}
async function saveAndReopen(seed: ReturnType<typeof account>['seed'], taskId: string) {
  const server = createAlphaFakeServer([seed]), repository = server.connect(server.issueSession('n9-owner'));
  const opened = await repository.read(); assert(opened.ok);
  // A save of something else: the task completed today. Only the changed field travels.
  const command = commandFromProgramTransition(opened.value, seed.references, 'n9-save', data => completeProgramTask(data, { ...base(data), taskId, date: '2026-11-09', done: true }));
  assert.deepEqual(command.kind === 'change-private' && command.changes.map(change => change.field), ['text']);
  assert(isM3Command(command));
  const saved = await repository.execute(command); assert(saved.ok, saved.ok ? '' : saved.reason);
  const reopened = await repository.read(); assert(reopened.ok); assert.equal(reopened.value.revision, 1);
  const undo = await repository.execute({ schema: 'flowme-alpha-command/1', requestId: 'n9-undo', expectedRevision: 1, kind: 'undo-private', operationId: 'n9-save' });
  assert(undo.ok, undo.ok ? '' : undo.reason);
  const undone = await repository.read(); assert(undone.ok);
  return { opened: opened.value, reopened: reopened.value, undone: undone.value };
}

test('an account with repeatLog opens, saves another change and reopens with repeatLog byte for byte', async () => {
  const log = { 'line-gone': ['2026-11-01'], 'line-b': ['2026-11-09', '2026-11-11'] };
  const { seed, taskId } = account(log);
  // The stored bytes, as the account holds them (storage orders keys; the values are the ones written).
  const before = JSON.stringify(seed.account.space.repeatLog);
  assert.deepEqual(JSON.parse(before), log);
  const { opened, reopened, undone } = await saveAndReopen(seed, taskId);
  for (const value of [opened, reopened, undone]) assert.equal(JSON.stringify(value.space.repeatLog), before);
  assert.notEqual(JSON.stringify(reopened.space.text), JSON.stringify(opened.space.text), 'the other change was saved');
});

test('an account without repeatLog behaves as before: no key appears, and the save is the same one field', async () => {
  const { seed, taskId } = account();
  assert(!Object.hasOwn(seed.account.space, 'repeatLog'));
  const { reopened, undone } = await saveAndReopen(seed, taskId);
  assert(!Object.hasOwn(reopened.space, 'repeatLog') && !Object.hasOwn(undone.space, 'repeatLog'));
});

test('repeatLog follows the N10 shape: days ascending and once each, 10,000 days in all; anything else is refused', () => {
  assert(isProgramRepeatLog({}));
  assert(isProgramRepeatLog({ a: [] }), 'an emptied line is kept as written');
  for (const bad of [[], null, 'x', { a: ['2026-11-09', '2026-11-09'] }, { a: ['2026-11-11', '2026-11-09'] }, { a: ['2026-02-30'] },
    { a: ['2026-11-09T00:00'] }, { a: [20261109] }, { a: '2026-11-09' }, { '': ['2026-11-09'] }])
    assert(!isProgramRepeatLog(bad), JSON.stringify(bad));
  const day = (n: number) => new Date(Date.UTC(2000, 0, 1) + n * 86_400_000).toISOString().slice(0, 10);
  const full = { a: Array.from({ length: PROGRAM_REPEAT_LOG_DAYS / 2 }, (_, n) => day(n)), b: Array.from({ length: PROGRAM_REPEAT_LOG_DAYS / 2 }, (_, n) => day(n)) };
  assert(isProgramRepeatLog(full));
  assert(!isProgramRepeatLog({ ...full, c: ['2026-11-09'] }), 'one day over the limit');
  // The account check uses it: a malformed field is still refused, so the field is not a way around validation.
  const { seed } = account({ a: ['2026-11-11'] });
  const broken = structuredClone(seed.account) as typeof seed.account & { space: { repeatLog: unknown } };
  broken.space.repeatLog = { a: ['2026-11-11', '2026-11-01'] };
  assert(!validateAlphaAccount(broken, seed.references));
});

test('N9 keeps repeatLog but does not write it: an N10 ledger entry validates, an N9 client command to it does not', () => {
  const change = { schema: 'flowme-alpha-command/1', requestId: 'n10-check', expectedRevision: 3, kind: 'change-private',
    changes: [{ field: 'repeatLog', present: true, value: { a: ['2026-11-09'] } }] };
  assert(validateAlphaCommand(change), 'an N10 operation (or its inverse) in the ledger and in backups stays valid');
  assert(!isM3Command(change), 'the N9 client route and server refuse a write to it');
});
