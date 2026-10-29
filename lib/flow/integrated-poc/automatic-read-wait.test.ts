import assert from 'node:assert/strict';
import test from 'node:test';
import { automaticReadToAwait, sourceReturnWait, type AutomaticRead, type SourceReturnOperation } from './automatic-read-wait';

const store = { name: 'store' }, epoch = {};
const read = (overrides: Partial<AutomaticRead<typeof store>> = {}): AutomaticRead<typeof store> =>
  ({ store, ownerId: 'owner', epoch, promise: Promise.resolve(true), eligible: true, ...overrides });
const scope = (busy = true) => ({ store, ownerId: 'owner', epoch, busy });

test('a text save still waits for our automatic read, as before R4', () => {
  const r = read();
  assert.equal(automaticReadToAwait(r, scope(), { groupId: 'text:doc' }), r);
});

test('a tap that opted in waits for our automatic read', () => {
  const r = read();
  assert.equal(automaticReadToAwait(r, scope(), { awaitAutomaticRead: true }), r);
});

test('an ordinary mutation keeps the busy refusal', () => {
  assert.equal(automaticReadToAwait(read(), scope(), {}), null);
  assert.equal(automaticReadToAwait(read(), scope(), undefined), null);
});

test('creator, social and writing saves never wait, even when asked to', () => {
  assert.equal(automaticReadToAwait(read(), scope(), { awaitAutomaticRead: true, alphaCreator: {} }), null);
  assert.equal(automaticReadToAwait(read(), scope(), { awaitAutomaticRead: true, alphaSocial: {} }), null);
  assert.equal(automaticReadToAwait(read(), scope(), { awaitAutomaticRead: true, alphaWriting: {} }), null);
  assert.equal(automaticReadToAwait(read(), scope(), { groupId: 'text:doc', alphaCreator: {} }), null);
});

test('only our own eligible read for the same store, owner and session counts', () => {
  const tap = { awaitAutomaticRead: true };
  assert.equal(automaticReadToAwait(null, scope(), tap), null);
  assert.equal(automaticReadToAwait(read({ eligible: false }), scope(), tap), null);
  assert.equal(automaticReadToAwait(read({ store: { name: 'other' } }), scope(), tap), null);
  assert.equal(automaticReadToAwait(read({ ownerId: 'other' }), scope(), tap), null);
  assert.equal(automaticReadToAwait(read({ epoch: {} }), scope(), tap), null);
});

test('nothing to wait for when the controller is not busy', () => {
  assert.equal(automaticReadToAwait(read(), scope(false), { awaitAutomaticRead: true }), null);
  assert.equal(sourceReturnWait(null, read(), scope(false)), null);
});

const operation = (overrides: Partial<SourceReturnOperation<typeof store>> = {}): SourceReturnOperation<typeof store> =>
  ({ store, owner: 'owner', epoch, promise: Promise.resolve({ ok: true }), settled: false, ...overrides });

test('a source return waits for the unsettled completion the user started first', () => {
  const op = operation();
  assert.equal(sourceReturnWait(op, read(), scope()), op.promise);
});

test('a source return during a plain refresh waits for that read instead of ending', async () => {
  const waiting = sourceReturnWait(null, read({ promise: Promise.resolve(true) }), scope());
  assert.ok(waiting);
  assert.deepEqual(await waiting, { ok: true });
  assert.deepEqual(await sourceReturnWait(null, read({ promise: Promise.resolve(false) }), scope()), { ok: false });
});

test('a settled or foreign operation falls back to the read', async () => {
  assert.deepEqual(await sourceReturnWait(operation({ settled: true }), read(), scope()), { ok: true });
  assert.deepEqual(await sourceReturnWait(operation({ owner: 'other' }), read(), scope()), { ok: true });
});

test('busy with neither an operation nor our read gives nothing to wait for', () => {
  assert.equal(sourceReturnWait(operation({ settled: true }), null, scope()), null);
  assert.equal(sourceReturnWait(null, read({ eligible: false }), scope()), null);
});
