import assert from 'node:assert/strict';
import test from 'node:test';
import { markDevNoticeSeen, readDevNoticeSeen } from './dev-notice';

function tab(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
}

test('the notice shows until acknowledged in this tab, then stays hidden across reloads of the same tab', () => {
  const storage = tab();
  assert.equal(readDevNoticeSeen(storage, 'owner-a'), false);
  assert.equal(markDevNoticeSeen(storage, 'owner-a'), true);
  // A reload rereads the same tab storage.
  assert.equal(readDevNoticeSeen(storage, 'owner-a'), true);
});

test('a new tab or another account in the same tab sees the notice again', () => {
  const storage = tab();
  markDevNoticeSeen(storage, 'owner-a');
  assert.equal(readDevNoticeSeen(tab(), 'owner-a'), false);
  assert.equal(readDevNoticeSeen(storage, 'owner-b'), false);
});

test('unusable tab storage keeps the notice showing', () => {
  const broken = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
  assert.equal(readDevNoticeSeen(broken, 'owner-a'), false);
  assert.equal(markDevNoticeSeen(broken, 'owner-a'), false);
  assert.equal(readDevNoticeSeen(undefined, 'owner-a'), false);
  assert.equal(markDevNoticeSeen(undefined, 'owner-a'), false);
});
