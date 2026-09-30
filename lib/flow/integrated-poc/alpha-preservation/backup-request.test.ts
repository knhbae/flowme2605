import assert from 'node:assert/strict';
import test from 'node:test';
import { createBackupRequestBudget, LEGACY_BACKUP_REQUEST, readBackupResponse } from './backup-request';

test('legacy backup budgets leave client time beyond the cumulative server deadline', () => {
  assert.equal(LEGACY_BACKUP_REQUEST.clientMs, 180_000);
  assert.equal(LEGACY_BACKUP_REQUEST.serverMs, 120_000);
  assert(LEGACY_BACKUP_REQUEST.slowMs < LEGACY_BACKUP_REQUEST.serverMs);
});

test('deadline covers work ignoring abort and prevents later work from starting', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  const budget = createBackupRequestBudget(180_000); let calls = 0;
  const work = budget.run(() => { calls++; return new Promise<never>(() => {}); });
  const checked = assert.rejects(work, /backup-timeout/);
  await Promise.resolve(); t.mock.timers.tick(179_999); assert.equal(budget.signal.aborted, false);
  t.mock.timers.tick(1); await checked;
  await assert.rejects(budget.run(async () => { calls++; }), /backup-timeout/);
  assert.equal(calls, 1); budget.dispose();
});

test('caller cancellation wins over a late completed value and pre-cancel never starts', async () => {
  const parent = new AbortController(), budget = createBackupRequestBudget(180_000, parent.signal);
  let release!: (value: string) => void;
  const work = budget.run(() => new Promise<string>(resolve => { release = resolve; }));
  const checked = assert.rejects(work, /backup-cancelled/);
  await Promise.resolve(); parent.abort(); release('late'); await checked; budget.dispose();
  const cancelled = createBackupRequestBudget(180_000, parent.signal); let calls = 0;
  await assert.rejects(cancelled.run(async () => { calls++; }), /backup-cancelled/);
  assert.equal(calls, 0); cancelled.dispose();
});

test('bounded decoder cancels an oversized chunk even without content-length', async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(17)); }, cancel() { cancelled = true; } }));
  await assert.rejects(readBackupResponse(response, new AbortController().signal, 16), /backup-response-limit/);
  assert.equal(cancelled, true);
});

test('bounded decoder rejects truncated JSON and invalid UTF-8 without an unchecked result', async () => {
  for (const bytes of [new TextEncoder().encode('{"ok":true,"value":'), Uint8Array.of(0xff)])
    await assert.rejects(readBackupResponse(new Response(bytes), new AbortController().signal), /backup-response-invalid/);
});

test('a cancelled body read settles promptly when the stream producer stays open', async () => {
  let cancelled = false;
  const controller = new AbortController();
  const response = new Response(new ReadableStream({ cancel() { cancelled = true; } }));
  const work = readBackupResponse(response, controller.signal);
  const checked = assert.rejects(work, /backup-cancelled/);
  controller.abort(Error('backup-cancelled')); await checked; assert.equal(cancelled, true);
});

test('budget disposal clears timeout after success and parser remains caller-controlled', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'] });
  const budget = createBackupRequestBudget(120_000);
  const result = await budget.run(() => readBackupResponse(Response.json({ ok: true }), budget.signal, 100,
    raw => ({ checked: JSON.parse(raw) })));
  assert.deepEqual(result, { checked: { ok: true } }); budget.dispose();
  t.mock.timers.tick(120_001); assert.equal(budget.signal.aborted, false);
});
