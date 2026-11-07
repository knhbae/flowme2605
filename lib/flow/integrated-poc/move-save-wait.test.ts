import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROGRAM_MOVE_WAIT, waitProgramMoveFlush } from './move-save-wait';

// Save wait (11/7): a move saves first; a slow save is said, can be left (머무르기), and stops the move at the limit.
// No outcome but 'saved' moves, and nothing here skips, cancels or repeats the save.
function clock() {
  const due: { at: number; run: () => void; id: number }[] = []; let now = 0, ids = 0;
  return {
    timers: { set: (run: () => void, ms: number) => { const id = ++ids; due.push({ at: now + ms, run, id }); return id; }, clear: (id: unknown) => { const at = due.findIndex(item => item.id === id); if (at >= 0) due.splice(at, 1); } },
    async advance(ms: number) {
      now += ms;
      for (let next = due.filter(item => item.at <= now).sort((a, b) => a.at - b.at)[0]; next; next = due.filter(item => item.at <= now).sort((a, b) => a.at - b.at)[0]) {
        due.splice(due.indexOf(next), 1); next.run(); await Promise.resolve();
      }
      await new Promise(resolve => setImmediate(resolve));
    },
    pending: () => due.length,
  };
}
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: unknown) => void; const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; }

test('the defaults: notice at 0.8 s, limit at 10 s', () => {
  assert.deepEqual({ ...PROGRAM_MOVE_WAIT }, { noticeMs: 800, limitMs: 10_000 });
});

test('a quick save moves with no notice and leaves no timer', async () => {
  const time = clock(); let waiting = 0, flushes = 0;
  const outcome = await waitProgramMoveFlush({ flush: async () => { flushes++; return true; }, onWaiting: () => { waiting++; }, stayed: new Promise(() => {}), timers: time.timers });
  assert.equal(outcome, 'saved'); assert.equal(waiting, 0); assert.equal(flushes, 1); assert.equal(time.pending(), 0);
});

test('a save that cannot finish ends the wait at once, without moving; a thrown save is the same', async () => {
  const time = clock();
  assert.equal(await waitProgramMoveFlush({ flush: async () => false, onWaiting: () => assert.fail('no notice'), stayed: new Promise(() => {}), timers: time.timers }), 'not-saved');
  assert.equal(await waitProgramMoveFlush({ flush: async () => { throw new Error('offline'); }, onWaiting: () => assert.fail('no notice'), stayed: new Promise(() => {}), timers: time.timers }), 'not-saved');
  assert.equal(time.pending(), 0);
});

test('a slow save is said after the notice time, then moves when it is saved', async () => {
  const time = clock(), save = deferred<boolean>(); let waiting = 0, settled = false;
  const outcome = waitProgramMoveFlush({ flush: () => save.promise, onWaiting: () => { waiting++; }, stayed: new Promise(() => {}), timers: time.timers });
  void outcome.then(() => { settled = true; });
  await time.advance(799); assert.equal(waiting, 0);
  await time.advance(1); assert.equal(waiting, 1);
  await time.advance(3000); assert.equal(settled, false);
  save.resolve(true);
  assert.equal(await outcome, 'saved'); assert.equal(waiting, 1); assert.equal(time.pending(), 0);
});

test('머무르기 ends the wait without moving; the save goes on and is not called again', async () => {
  const time = clock(), save = deferred<boolean>(), stay = deferred<void>(); let flushes = 0, late = 0;
  const outcome = waitProgramMoveFlush({ flush: () => { flushes++; return save.promise; }, onWaiting: () => {}, stayed: stay.promise, onLateSettled: () => { late++; }, timers: time.timers });
  await time.advance(1000); stay.resolve();
  assert.equal(await outcome, 'stayed'); assert.equal(time.pending(), 0);
  save.resolve(true); await time.advance(0);
  assert.equal(flushes, 1); assert.equal(late, 0, 'a stay is not a late move');
});

test('at the limit the move is dropped; the save goes on and its result is told once', async () => {
  const time = clock(), save = deferred<boolean>(); const told: boolean[] = [];
  const outcome = waitProgramMoveFlush({ flush: () => save.promise, onWaiting: () => {}, stayed: new Promise(() => {}), onLateSettled: saved => told.push(saved), timers: time.timers });
  await time.advance(9_999); await time.advance(1);
  assert.equal(await outcome, 'late'); assert.equal(time.pending(), 0);
  assert.deepEqual(told, []);
  save.resolve(true); await time.advance(0);
  assert.deepEqual(told, [true]);
  const time2 = clock(), save2 = deferred<boolean>(); const told2: boolean[] = [];
  const outcome2 = waitProgramMoveFlush({ flush: () => save2.promise, onWaiting: () => {}, stayed: new Promise(() => {}), onLateSettled: saved => told2.push(saved), timers: time2.timers, limitMs: 50, noticeMs: 10 });
  await time2.advance(50); assert.equal(await outcome2, 'late');
  save2.reject(new Error('timeout')); await time2.advance(0);
  assert.deepEqual(told2, [false]);
});

test('navigate() waits through it and moves only when saved; the notice offers 머무르기, then 복구함 열기', () => {
  const workspace = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/AlphaWorkspace.tsx'), 'utf8').replace(/\r\n/g, '\n');
  // Save wait P3: navigate() hands the wait and the move to moveAfterSave(), right under it.
  const at = workspace.indexOf('async function navigate('), move = workspace.slice(at, workspace.indexOf('\n  }\n', workspace.indexOf('async function moveAfterSave(', at)));
  const order = ["if (!captureInput()) return 'refused';", 'lockInput()', 'await waitProgramMoveFlush({', 'releases.forEach(release => release?.())',
    "if (outcome !== 'saved') {", 'setDestination(next)'];
  order.reduce((from, step) => { const found = move.indexOf(step, from); assert(found > from, step); return found; }, -1);
  assert(!/flushAll\(\)\)\s*return;/.test(move), 'a failed save no longer returns silently');
  const notice = workspace.slice(workspace.indexOf('{moveWait && <section'), workspace.indexOf('</section>}', workspace.indexOf('{moveWait && <section')));
  for (const text of ['저장 중…', '머무르기', '저장이 늦어지고 있어요. 이동하지 않았습니다. 내용은 이 기기에 남아 있고, 저장은 계속합니다.', '복구함 열기', 'openRecoveryBox(event.currentTarget)', '닫기'])
    assert(notice.includes(text), text);
  assert(!/이동하기|그냥 이동|저장하지 않고/.test(notice), 'no way to move without the save');
});
