import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('repeated render measures are counted without filling event storage; receipt times remain', () => {
  let observe;
  class Worker { postMessage() {} terminate() {} }
  const window = { Worker }, context = { window, performance: { now: () => 100 }, PerformanceObserver: class { constructor(fn) { observe = fn; } observe() {} } };
  vm.runInNewContext(fs.readFileSync(new URL('./probe.js', import.meta.url), 'utf8'), context);
  const repeated = Array.from({ length: 20000 }, () => ({ name: 'flowme-writing:ack-confirmed-snapshot', startTime: 1, duration: 2 }));
  observe({ getEntries: () => repeated });
  for (let i = 0; i < 20000; i++) window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot();
  observe({ getEntries: () => [{ name: 'flowme-writing:ack-host-reconcile', startTime: 7, duration: 3, detail: { requestId: 'synthetic' } }] });
  assert.equal(window.__pairedProbe.phases['flowme-writing:ack-confirmed-snapshot'].count, 20000);
  assert.equal(window.__pairedProbe.snapshot().commits, 20000);
  assert.equal(window.__pairedProbe.events.length, 1);
  assert.equal(window.__pairedProbe.events[0].ownedAck, true);
  assert.equal(window.__pairedProbe.overflow, false);
});
