import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { publicVerificationResult, usesPublicVerificationOutput } from './program-verification-output.mjs';

const marker = 'SYNTHETIC-PRIVATE-SOURCE-NOT-A-REAL-CREDENTIAL';
const complete = { kind: 'new-tests', started: '2026-09-26T00:00:00.000Z', ended: '2026-09-26T00:01:00.000Z',
  exitCode: 0, signal: null, launchError: null, testExecutions: 2, passed: 2, failed: 0, skipped: 0, cancelled: 0,
  sourceChangedDuringRun: [], sourceHashes: [{ path: marker, sha256: '1'.repeat(64) }], nodeOptions: marker, log: marker };

test('CI markers and explicit local rehearsal enable public output; ordinary local logs stay available', () => {
  assert.equal(usesPublicVerificationOutput({}), false);
  assert.equal(usesPublicVerificationOutput({ CI: '', GITHUB_ACTIONS: '', FLOWME_PRIVATE_VERIFICATION: '0' }), false);
  for (const env of [{ CI: 'true' }, { CI: 'false' }, { GITHUB_ACTIONS: 'true' }, { FLOWME_PRIVATE_VERIFICATION: '1' }])
    assert.equal(usesPublicVerificationOutput(env), true);
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
    for (const file of ['program-verify.mjs', 'program-verification-result.mjs', 'program-verification-output.mjs'])
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
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
