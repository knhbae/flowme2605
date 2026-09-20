export function verificationExitCode({ exitCode, signal = null, launchError = null,
  sourceChangedDuringRun = [], kind, testExecutions = 0, passed = 0, failed = 0, skipped = 0, cancelled = 0 }) {
  // Node reports null, not a nonzero code, when a child terminates by signal.
  if (exitCode !== 0 || signal !== null || launchError !== null) return 1;
  if (sourceChangedDuringRun.length) return 2;
  if (kind === 'new-tests' && (!Number.isInteger(testExecutions) || testExecutions <= 0
    || passed !== testExecutions || failed !== 0 || skipped !== 0 || cancelled !== 0)) return 1;
  return 0;
}
