import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { summarize } = createRequire(import.meta.url)('./protocol.cjs');
const block = (ms = 100) => ({ summary: Object.fromEntries(['ime', 'commit', 'task', 'enter'].map(phase => [phase, { median: ms, p95: ms * 2 }])),
  machine: { valid: true }, browserVersion: 'fixed-chrome', start: { clean: true, committedTextSHA256: 'fixed-synthetic-input', committedAccountSHA256: 'fixed-account' }, rawSha: 'fixed-final-raw', typedOk: true, errors: [], outside: [] });
const pairs = (ms = 100) => Array.from({ length: 3 }, (_, index) => ({ order: index % 2 ? ['base', 'cand'] : ['cand', 'base'], base: block(), cand: block(ms) }));
test('unchanged median gate accepts +5 and rejects +6; paired ratios do not replace it', () => {
  assert.equal(summarize(pairs(105)).verdict, 'PASS'); assert.equal(summarize(pairs(106)).verdict, 'PERFORMANCE_FAIL');
});
test('AA treats both signs as instability and is never a correction to candidate results', () => {
  assert.equal(summarize(pairs(94), { aa: true }).verdict, 'HOLD_AA_UNSTABLE');
  assert.equal(summarize(pairs(106), { aa: true }).verdict, 'HOLD_AA_UNSTABLE');
  assert.equal(summarize(pairs(100), { aa: true }).verdict, 'PASS');
});
test('a failed CPU half invalidates the whole pair instead of silently pairing another run', () => {
  const input = pairs(); input[1].cand.machine.valid = false; const result = summarize(input);
  assert.equal(result.validPairs, 2); assert.equal(result.verdict, 'HOLD_INPUT_OR_VALID_PAIRS');
});
test('different initial state, stale pending, lost text or external errors fail closed', () => {
  for (const change of [b => { b.start.committedTextSHA256 = 'different'; }, b => { b.start.committedAccountSHA256 = 'different'; }, b => { b.start.clean = false; },
    b => { b.browserVersion = 'changed'; }, b => { b.rawSha = 'different'; }, b => { b.typedOk = false; }, b => { b.errors = ['error']; }]) {
    const input = pairs(); change(input[1].cand); assert.equal(summarize(input).verdict, 'HOLD_INPUT_OR_VALID_PAIRS');
  }
});
