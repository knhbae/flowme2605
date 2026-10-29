import assert from 'node:assert/strict';
import test from 'node:test';
import { createSettleGate } from './settle-gate';

test('nothing to wait for when no settle is running', async () => {
  assert.equal(await createSettleGate().wait(1_000), false);
});

test('a waiting action proceeds once the settle releases the slot', async () => {
  const gate = createSettleGate(), end = gate.begin();
  const waiting = gate.wait(1_000);
  end();
  assert.equal(await waiting, true);
});

test('a second action in the same window is refused while the first waits', async () => {
  const gate = createSettleGate(), end = gate.begin();
  const first = gate.wait(1_000);
  assert.equal(await gate.wait(1_000), false);
  end();
  assert.equal(await first, true);
});

test('a settle that never ends refuses the action after the limit', async () => {
  const gate = createSettleGate();
  gate.begin();
  assert.equal(await gate.wait(20), false);
});

test('the waiting slot frees up for the next settle', async () => {
  const gate = createSettleGate();
  const endFirst = gate.begin(), first = gate.wait(1_000);
  endFirst();
  assert.equal(await first, true);
  const endSecond = gate.begin(), second = gate.wait(1_000);
  endSecond();
  assert.equal(await second, true);
});

test('ending an older settle does not release a newer one', async () => {
  const gate = createSettleGate();
  const endOld = gate.begin(), endNew = gate.begin();
  endOld();
  const waiting = gate.wait(1_000);
  let settled = false;
  void waiting.then(() => { settled = true; });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(settled, false);
  endNew();
  assert.equal(await waiting, true);
});

test('isWaiting reports the queued tap only while it waits', async () => {
  const gate = createSettleGate();
  assert.equal(gate.isWaiting(), false);
  const end = gate.begin(), waiting = gate.wait(1_000);
  assert.equal(gate.isWaiting(), true);
  end();
  assert.equal(await waiting, true);
  assert.equal(gate.isWaiting(), false);
});

test('isWaiting clears when the wait gives up', async () => {
  const gate = createSettleGate();
  gate.begin();
  const waiting = gate.wait(20);
  assert.equal(gate.isWaiting(), true);
  assert.equal(await waiting, false);
  assert.equal(gate.isWaiting(), false);
});

test('ending twice is harmless', async () => {
  const gate = createSettleGate(), end = gate.begin();
  end(); end();
  assert.equal(await gate.wait(20), false);
});
