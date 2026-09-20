import assert from 'node:assert/strict';
import test from 'node:test';
import { verificationExitCode } from './program-verification-result.mjs';

const complete = { exitCode: 0, kind: 'new-tests', testExecutions: 1749, passed: 1749 };
test('only completed zero-failure test execution passes', () => {
  assert.equal(verificationExitCode(complete), 0);
  assert.equal(verificationExitCode({ exitCode: 0, kind: 'build' }), 0);
});
test('signal, absent exit code and launch errors fail even without source changes', () => {
  for (const failure of [{ exitCode: null, signal: 'SIGTERM' }, { exitCode: null },
    { signal: 'SIGKILL' }, { launchError: 'spawn ENOENT' }, { exitCode: 1 }, { exitCode: -1 }]) {
    assert.equal(verificationExitCode({ ...complete, ...failure }), 1);
  }
});
test('zero, failed, skipped or cancelled integrated executions cannot be green', () => {
  for (const incomplete of [{ testExecutions: 0 }, { testExecutions: NaN },
    { passed: 1748 }, { passed: NaN }, { failed: 1 }, { skipped: 1 }, { cancelled: 1 }]) {
    assert.equal(verificationExitCode({ ...complete, ...incomplete }), 1);
  }
});
test('source mutation remains a failed verification even when tests passed', () => {
  assert.equal(verificationExitCode({ ...complete, sourceChangedDuringRun: ['contract.ts'] }), 2);
});
