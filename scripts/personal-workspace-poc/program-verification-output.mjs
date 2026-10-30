import { createHash } from 'node:crypto';
import { verificationExitCode } from './program-verification-result.mjs';

// Treat any nonempty CI marker conservatively, even CI="false". The explicit
// local flag exercises this path without transferring source to an external CI.
export function usesPublicVerificationOutput(env) {
  return Boolean(env.CI || env.GITHUB_ACTIONS || env.FLOWME_PRIVATE_VERIFICATION === '1');
}

/** Allowlisted summary only: never serialize raw child output, arbitrary
 * errors, environment options or source paths into public artifacts. This is
 * accidental-disclosure protection, not a sandbox for hostile test code. */
export function publicVerificationResult(result) {
  const number = value => Number.isSafeInteger(value) ? value : null;
  const iso = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ? value : null;
  const kinds = ['new-tests', 'npm-test', 'approved-tests', 'public-tests', 'build', 'docs', 'audit'];
  return {
    schema: 'flowme-verification-public/1',
    kind: kinds.includes(result.kind) ? result.kind : 'unknown',
    started: iso(result.started), ended: iso(result.ended),
    exitCode: number(result.exitCode), signal: result.signal === null ? null : 'process-signal',
    launchError: result.launchError === null ? null : 'process-launch-failed',
    testConcurrency: number(result.testConcurrency), testMaxOldSpaceMb: number(result.testMaxOldSpaceMb),
    testMaxSemiSpaceMb: number(result.testMaxSemiSpaceMb), testFileCount: number(result.testFileCount),
    testExecutions: number(result.testExecutions), passed: number(result.passed), failed: number(result.failed),
    skipped: number(result.skipped), cancelled: number(result.cancelled),
    sourceChangedCount: result.sourceChangedDuringRun.length,
    sourceCount: result.sourceHashes.length,
    sourceSnapshotSha256: createHash('sha256').update(JSON.stringify(result.sourceHashes)).digest('hex'),
    verifiedExitCode: verificationExitCode(result),
    rawOutputRetained: false, log: null,
  };
}
