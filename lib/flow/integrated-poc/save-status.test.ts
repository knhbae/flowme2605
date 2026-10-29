import assert from 'node:assert/strict';
import test from 'node:test';
import { pendingResultUnknown } from './save-status';

const pending = { requestId: 'r' } as never;

test('a request just started is in flight even before its status turns to saving', () => {
  assert.equal(pendingResultUnknown({ pending, busy: true, status: 'saved' }), false);
  assert.equal(pendingResultUnknown({ pending, busy: true, status: 'ready' }), false);
  assert.equal(pendingResultUnknown({ pending, busy: true, status: 'saving' }), false);
});

test('a stopped request or an explicit check leaves the result unknown', () => {
  assert.equal(pendingResultUnknown({ pending, busy: false, status: 'saving' }), true);
  assert.equal(pendingResultUnknown({ pending, busy: false, status: 'saved' }), true);
  assert.equal(pendingResultUnknown({ pending, busy: true, status: 'checking-result' }), true);
});

test('nothing pending is never unknown', () => {
  assert.equal(pendingResultUnknown({ pending: null, busy: false, status: 'checking-result' } as never), false);
  assert.equal(pendingResultUnknown(null), false);
});
