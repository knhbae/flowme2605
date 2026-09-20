import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { buildBrowserText, loadCommonJs, canonicalEntry } from './build-contextual-result-runtime.mjs';

const makeFacts = raw => ({ lane: 'workspace', exactTargetRaw: raw, hasUndo: true, authorityReady: true,
  pending: false, editorOwner: false, recoveryOwner: false, receiptOwnerId: null });
function exercise(api) {
  const initial = api.createResultOwnerSession('runtime-parity');
  const begun = api.beginAttempt(initial, { operation: 'move-order', refs: ['copy:flow:item'], summary: '순서를 옮겼어요.',
    context: { kind: 'overdue', key: '2026-09-05' } }, makeFacts('before-private-raw'));
  assert.equal(begun.ok, true);
  const saved = api.settleAttempt(begun.state, begun.ticket, { kind: 'success', exactTargetRaw: 'after-private-raw', hasUndo: true, authorityReady: true });
  const result = api.selectResult(saved.state, makeFacts('after-private-raw'));
  const undo = api.beginContextualUndo(saved.state, result.result.ownerId, makeFacts('after-private-raw'));
  assert.equal(undo.ok, true);
  const done = api.settleUndo(undo.state, undo.ticket, { kind: 'success', exactTargetRaw: 'before-private-raw', hasUndo: false, authorityReady: true });
  return JSON.stringify({ result, done: api.selectResult(done.state, { ...makeFacts('before-private-raw'), hasUndo: false }) });
}
test('bundler reads the canonical TS with write:false and produces deterministic browser text', () => {
  assert.ok(fs.existsSync(canonicalEntry));
  assert.equal(buildBrowserText(), buildBrowserText());
  assert.match(buildBrowserText(), /FlowMePersonalWorkspaceContextualResult/);
});
test('browser and CommonJS APIs and result ownership behavior are identical', () => {
  const context = vm.createContext({});
  vm.runInContext(buildBrowserText(), context);
  const browser = context.FlowMePersonalWorkspaceContextualResult;
  const cjs = loadCommonJs();
  assert.deepEqual(Object.keys(browser).sort(), Object.keys(cjs).sort());
  assert.equal(exercise(browser), exercise(cjs));
  assert.equal(loadCommonJs(), cjs);
});
test('browser module and actions do not access storage, DOM, clock, network, or timers', () => {
  const context = vm.createContext({});
  let accesses = 0;
  for (const key of ['localStorage', 'document', 'window', 'Date', 'fetch', 'setTimeout', 'requestAnimationFrame']) {
    Object.defineProperty(context, key, { get() { accesses++; throw Error('forbidden:' + key); } });
  }
  vm.runInContext(buildBrowserText(), context);
  exercise(context.FlowMePersonalWorkspaceContextualResult);
  assert.equal(accesses, 0);
});
test('the runtime public result serialization contains no writer evidence', () => {
  const result = exercise(loadCommonJs());
  assert.doesNotMatch(result, /before-private-raw|after-private-raw|exactTargetRaw/);
});

