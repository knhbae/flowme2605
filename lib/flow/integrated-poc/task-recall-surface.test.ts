import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramRecallSurface } from './task-recall-surface';

test('recall surface starts empty and returns exactly its connected native owner', () => {
  const port = createProgramRecallSurface<{ isConnected: boolean }>();
  const a = { isConnected: true };
  assert.equal(port.read(), null);
  port.bind(a);
  assert.equal(port.read(), a);
});

test('detached surface is refused; old cleanup cannot clear a new native owner', () => {
  const port = createProgramRecallSurface<{ isConnected: boolean }>();
  const a = { isConnected: true }, b = { isConnected: true };
  port.bind(a);
  a.isConnected = false;
  assert.equal(port.read(), null);
  port.bind(b);
  port.release(a);
  assert.equal(port.read(), b);
  port.release(b);
  assert.equal(port.read(), null);
});

test('cleanup of the matching connected surface releases it without mutating it', () => {
  const port = createProgramRecallSurface<{ isConnected: boolean }>();
  const surface = Object.freeze({ isConnected: true });
  port.bind(surface);
  port.release(surface);
  assert.equal(port.read(), null);
  assert.equal(surface.isConnected, true);
});
