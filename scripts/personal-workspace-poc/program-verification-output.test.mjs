import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { publicVerificationResult, usesPublicVerificationOutput } from './program-verification-output.mjs';
import { collectFailureDiagnostics, classifyFailure, DIAGNOSTIC_PREFIX, MAX_FAILURE_DIAGNOSTICS,
  readFailureDiagnostics, sanitizeFailureDiagnostics } from './program-verification-reporter.mjs';

const marker = 'SYNTHETIC-PRIVATE-SOURCE-NOT-A-REAL-CREDENTIAL';
const complete = { kind: 'new-tests', started: '2026-09-26T00:00:00.000Z', ended: '2026-09-26T00:01:00.000Z',
  exitCode: 0, signal: null, launchError: null, testExecutions: 2, passed: 2, failed: 0, skipped: 0, cancelled: 0,
  sourceChangedDuringRun: [], sourceHashes: [{ path: marker, sha256: '1'.repeat(64) }], nodeOptions: marker, log: marker,
  testFileCount: 1, failureDiagnostics: { schema: 'flowme-failure-diagnostics/1', failures: [], totalFailureEvents: 0,
    unmapped: 0, unclassified: 0, omitted: 0, totals: { testExecutions: 2, passed: 2, failed: 0, skipped: 0, cancelled: 0 } } };

test('CI markers and explicit local rehearsal enable public output; ordinary local logs stay available', () => {
  assert.equal(usesPublicVerificationOutput({}), false);
  assert.equal(usesPublicVerificationOutput({ CI: '', GITHUB_ACTIONS: '', FLOWME_PRIVATE_VERIFICATION: '0' }), false);
  for (const env of [{ CI: 'true' }, { CI: 'false' }, { GITHUB_ACTIONS: 'true' }, { FLOWME_PRIVATE_VERIFICATION: '1' }])
    assert.equal(usesPublicVerificationOutput(env), true);
});

const sourceFile = { path: resolve('sample.test.ts'), lineLengths: [200, 200] };
const failEvent = (patch = {}) => ({ type: 'test:fail', data: { file: sourceFile.path, line: 1, column: 1,
  testId: 1, nesting: 0, name: marker, details: { error: { code: 'ERR_TEST_FAILURE',
    failureType: 'testCodeFailure', cause: { code: 'ERR_ASSERTION', message: marker, actual: marker, expected: marker, stack: marker } } }, ...patch } });
const summaryEvent = (failed, passed = 0) => ({ type: 'test:summary', data: { counts: {
  tests: failed + passed, passed, failed, skipped: 0, cancelled: 0 } } });

test('diagnostics publish only numeric source identities and fixed classifications, without reading error getters', async () => {
  const event = failEvent();
  event.data.message = marker; event.data.details.stdout = marker;
  const diagnostics = await collectFailureDiagnostics([
    { type: 'test:stdout', data: { message: marker } },
    { type: 'test:stderr', data: { message: marker } },
    event, summaryEvent(1),
  ], [sourceFile]);
  assert.equal(diagnostics.status, 'complete');
  assert.deepEqual(diagnostics.failures, [{ fileIndex: 1, line: 1, column: 1, caseId: 1, nesting: 0,
    type: 'test', classification: 'assertion' }]);
  assert(!JSON.stringify(diagnostics).includes(marker));
  assert(!JSON.stringify(diagnostics).includes(sourceFile.path));
  let getterCalled = false;
  assert.equal(classifyFailure({ get cause() { getterCalled = true; throw Error(marker); } }), 'unknown');
  assert.equal(getterCalled, false);
  for (const [failureType, classification] of [['testTimeoutFailure', 'timeout'], ['hookFailed', 'hook'],
    ['subtestsFailed', 'subtests'], ['cancelledByParent', 'cancelled'], ['testAborted', 'aborted'],
    ['testCodeFailure', 'test-code']]) assert.equal(classifyFailure({ failureType }), classification);
  assert.equal(classifyFailure({ code: 'ERR_TEST_FAILURE' }), 'runner');
  assert.equal(classifyFailure({ code: marker, failureType: marker }), 'unknown');
});

test('unknown locations, unknown errors and capped diagnostics remain explicitly incomplete', async () => {
  const diagnostics = await collectFailureDiagnostics([
    failEvent({ file: marker, line: 500, column: 500, details: { error: { code: marker } } }),
    ...Array.from({ length: MAX_FAILURE_DIAGNOSTICS }, (_, index) => failEvent({ testId: index + 2 })),
    summaryEvent(MAX_FAILURE_DIAGNOSTICS + 1),
  ], [sourceFile]);
  assert.equal(diagnostics.status, 'incomplete');
  assert.equal(diagnostics.unmapped, 1); assert.equal(diagnostics.unclassified, 1);
  assert.equal(diagnostics.omitted, 1); assert.equal(diagnostics.failures.length, MAX_FAILURE_DIAGNOSTICS);
  const report = publicVerificationResult({ ...complete, failureDiagnostics: diagnostics });
  assert.equal(report.verifiedExitCode, 1);
  assert.equal(report.failureDiagnostics.status, 'incomplete');
  assert(!JSON.stringify(report).includes(marker));
});

test('missing, malformed, duplicate, truncated and inconsistent diagnostics never turn into success', async () => {
  const valid = await collectFailureDiagnostics([summaryEvent(0, 2)], [sourceFile]);
  const frame = DIAGNOSTIC_PREFIX + JSON.stringify(valid);
  for (const [text, truncated, problem] of [['', false, 'missing'], [DIAGNOSTIC_PREFIX + marker, false, 'invalid'],
    [frame + '\n' + frame, false, 'invalid'], [frame, true, 'transport-truncated']]) {
    const diagnostics = readFailureDiagnostics(text, 1, complete, truncated);
    assert.equal(diagnostics.problem, problem);
    const report = publicVerificationResult({ ...complete, failureDiagnostics: diagnostics });
    assert.equal(report.verifiedExitCode, 1);
    assert.equal(report.failureDiagnostics.problem, problem);
    assert(!JSON.stringify(report).includes(marker));
  }
  assert.equal(readFailureDiagnostics(frame, 1, { ...complete, passed: 1 }).problem, 'count-mismatch');
  assert.equal(sanitizeFailureDiagnostics({ ...valid, totals: null }, 1).problem, 'missing-summary');
  assert.equal(sanitizeFailureDiagnostics({ ...valid, totalFailureEvents: 1 }, 1).problem, 'invalid');
  const unknown = await collectFailureDiagnostics([failEvent({ details: { error: {} } }), summaryEvent(1)], [sourceFile]);
  assert.equal(sanitizeFailureDiagnostics({ ...unknown, unclassified: 0 }, 1).problem, 'invalid');
  assert.equal(publicVerificationResult({ ...complete, sourceChangedDuringRun: ['changed'],
    failureDiagnostics: undefined }).verifiedExitCode, 2);
});

test('dual reporters preserve original TAP counts for nested failures, timeout and skip without leaking fixture data', () => {
  const root = mkdtempSync(join(tmpdir(), 'flowme-verifier-output-'));
  try {
    const scripts = join(root, 'scripts/personal-workspace-poc'); mkdirSync(scripts, { recursive: true });
    for (const file of ['program-verify.mjs', 'program-verification-result.mjs', 'program-verification-output.mjs', 'program-verification-reporter.mjs'])
      copyFileSync(resolve('scripts/personal-workspace-poc', file), join(scripts, file));
    const fileName = marker + '.test.ts';
    writeFileSync(join(scripts, 'program-source-files.mjs'), 'export const listProgramSourcePaths = () => ' + JSON.stringify([fileName]) + ';');
    const loader = join(root, 'node_modules/tsx'); mkdirSync(loader, { recursive: true });
    writeFileSync(join(loader, 'package.json'), '{"name":"tsx","type":"module","exports":"./index.mjs"}');
    writeFileSync(join(loader, 'index.mjs'), '');
    const env = { ...process.env, CI: 'true' }; delete env.NODE_OPTIONS; delete env.NODE_TEST_CONTEXT;
    const cases = [
      "test('parent-" + marker + "', async t => { await t.test('" + marker + "', () => assert.equal('" + marker + "', 'different')); });",
      "test('" + marker + "', { timeout: 20 }, async () => { await new Promise(resolve => setTimeout(resolve, 60)); });",
      "test.skip('" + marker + "', () => {});",
    ];
    for (const body of cases) {
      writeFileSync(join(root, fileName), "import test from 'node:test'; import assert from 'node:assert/strict'; " + body);
      const original = spawnSync(process.execPath, ['--max-old-space-size=512', '--import', 'tsx', '--test',
        '--test-concurrency=1', '--test-reporter=tap', fileName], { cwd: root, env, encoding: 'utf8', windowsHide: true });
      const run = spawnSync(process.execPath, [join(scripts, 'program-verify.mjs'), 'new-tests', '1'],
        { cwd: root, env, encoding: 'utf8', windowsHide: true });
      const result = JSON.parse(readFileSync(join(root, 'output/integrated-product-poc/new-tests-latest.public.json'), 'utf8'));
      for (const [key, label] of [['testExecutions', 'tests'], ['passed', 'pass'], ['failed', 'fail'], ['skipped', 'skipped'], ['cancelled', 'cancelled']]) {
        const counts = [...original.stdout.matchAll(new RegExp('^# ' + label + ' (\\d+)\\s*$', 'gm'))].map(match => Number(match[1]));
        assert.equal(result[key], counts.reduce((sum, count) => sum + count, 0), key);
      }
      assert.equal(run.status, 1);
      assert.equal(result.verifiedExitCode, 1);
      assert.equal(result.rawOutputRetained, false);
      assert.equal(result.failureDiagnostics.status, 'complete');
      for (const text of [run.stdout, run.stderr, JSON.stringify(result)]) {
        assert(!text.includes(marker)); assert(!text.includes(root)); assert(!text.includes('different'));
      }
    }
  } finally {
    assert(relative(resolve(tmpdir()), resolve(root)).startsWith('flowme-verifier-output-'));
    rmSync(root, { recursive: true, force: true });
  }
});


test('public summary is allowlisted and preserves failed, skipped, cancelled and changed-source verdicts', () => {
  for (const patch of [{}, { launchError: marker }, { signal: marker }, { exitCode: 1 }, { passed: 1 },
    { failed: 1 }, { skipped: 1 }, { cancelled: 1 }, { sourceChangedDuringRun: [marker] }]) {
    const result = publicVerificationResult({ ...complete, ...patch, futureDiagnostic: marker });
    assert(!JSON.stringify(result).includes(marker));
    assert.equal(result.verifiedExitCode, !Object.keys(patch).length ? 0 : patch.sourceChangedDuringRun ? 2 : 1);
    assert.equal(result.rawOutputRetained, false); assert.equal(result.log, null);
    assert.equal('sourceHashes' in result, false); assert.equal('nodeOptions' in result, false);
    assert.match(result.sourceSnapshotSha256, /^[a-f0-9]{64}$/);
  }
});

test('CI uploads explicit public summaries and type evidence, never the raw integrated verification folder', () => {
  const workflow = readFileSync(resolve('.github/workflows/ci.yml'), 'utf8');
  assert(workflow.includes('output/integrated-product-poc/*.public.json'));
  assert(workflow.includes('output/integrated-product-poc/targeted-types-*.json'));
  assert(!/^\s*output\/integrated-product-poc\/\s*$/m.test(workflow));
  assert(workflow.includes('node --test scripts/personal-workspace-poc/program-verification-output.test.mjs'));
});

test('real verification runner suppresses stdout/stderr and assertion details in CI success and failure artifacts', () => {
  const root = mkdtempSync(join(tmpdir(), 'flowme-verifier-output-'));
  try {
    const scripts = join(root, 'scripts/personal-workspace-poc'); mkdirSync(scripts, { recursive: true });
    for (const file of ['program-verify.mjs', 'program-verification-result.mjs', 'program-verification-output.mjs', 'program-verification-reporter.mjs'])
      copyFileSync(resolve('scripts/personal-workspace-poc', file), join(scripts, file));
    writeFileSync(join(scripts, 'program-source-files.mjs'), "export const listProgramSourcePaths = () => ['sample.test.ts'];");
    const loader = join(root, 'node_modules/tsx'); mkdirSync(loader, { recursive: true });
    // The real runner is exercised with an empty import shim and JS-compatible
    // .ts, not a substituted runner/result generator. No real source is used.
    writeFileSync(join(loader, 'package.json'), '{"name":"tsx","type":"module","exports":"./index.mjs"}');
    writeFileSync(join(loader, 'index.mjs'), '');
    const env = { ...process.env, CI: 'true' }; delete env.NODE_OPTIONS; delete env.NODE_TEST_CONTEXT;
    for (const failure of [false, true]) {
      writeFileSync(join(root, 'sample.test.ts'), `import test from 'node:test'; import assert from 'node:assert/strict'; test('${marker}', () => { console.log('${marker}'); console.error('${marker}'); ${failure ? `assert.fail('${marker}')` : ''} });`);
      const run = spawnSync(process.execPath, [join(scripts, 'program-verify.mjs'), 'new-tests', '1'], { cwd: root, env, encoding: 'utf8', windowsHide: true });
      assert.equal(run.status, failure ? 1 : 0, `${run.stdout}\n${run.stderr}`);
      assert(!run.stdout.includes(marker)); assert(!run.stderr.includes(marker));
      const directory = join(root, 'output/integrated-product-poc'), files = readdirSync(directory);
      assert(files.every(file => file.endsWith('.public.json')));
      for (const file of files) assert(!readFileSync(join(directory, file), 'utf8').includes(marker));
      const result = JSON.parse(readFileSync(join(directory, 'new-tests-latest.public.json'), 'utf8'));
      assert.equal(result.testExecutions, 1); assert.equal(result.failed, failure ? 1 : 0);
      assert.equal(result.verifiedExitCode, failure ? 1 : 0); assert.equal(result.rawOutputRetained, false);
      assert.equal(result.failureDiagnostics.status, 'complete');
      assert.equal(result.failureDiagnostics.failures.length, failure ? 1 : 0);
      if (failure) {
        assert.equal(result.failureDiagnostics.failures[0].fileIndex, 1);
        assert.equal(result.failureDiagnostics.failures[0].classification, 'assertion');
      }
    }
  } finally {
    assert(relative(resolve(tmpdir()), resolve(root)).startsWith('flowme-verifier-output-'));
    rmSync(root, { recursive: true, force: true });
  }
});
