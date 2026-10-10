import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { assembleCatalogParts, materializeCatalog, cleanupCatalog, CATALOG_CI_SOURCE, CATALOG_CI_KEYS } from './catalog-ci-source.mjs';

const source = 'SYNTHETIC-CATALOG-NOT-REAL-CONTENT\n';
const contract = { count: 2, partBytes: 20, bytes: Buffer.byteLength(source), terminator: '\n', sha256: createHash('sha256').update(source).digest('hex') };
const parts = { FLOWME_CATALOG_PART_1: source.slice(0, 20), FLOWME_CATALOG_PART_2: source.slice(20, -1) };

test('all parts are required in order and preserve exact bytes; corruption and extra bytes fail', () => {
  assert.equal(assembleCatalogParts(parts, contract).toString(), source);
  for (const bad of [{}, { ...parts, FLOWME_CATALOG_PART_1: '' }, { ...parts, FLOWME_CATALOG_PART_2: `${parts.FLOWME_CATALOG_PART_2}\n` },
    { ...parts, FLOWME_CATALOG_PART_1: 'X'.repeat(20) }, { ...parts, FLOWME_CATALOG_PART_1: parts.FLOWME_CATALOG_PART_2, FLOWME_CATALOG_PART_2: parts.FLOWME_CATALOG_PART_1 }])
    assert.throws(() => assembleCatalogParts(bad, contract));
  assert.equal(CATALOG_CI_KEYS.length, 6); assert(CATALOG_CI_SOURCE.partBytes < 48 * 1024);
});

test('materialization uses a new private runner file; exact cleanup preserves neighboring files', () => {
  const root = mkdtempSync(join(tmpdir(), 'flowme-ci-fixture-'));
  try {
    const githubEnv = join(root, 'github-env'), neighbor = join(root, 'keep.txt');
    writeFileSync(githubEnv, ''); writeFileSync(neighbor, 'keep');
    const env = { ...parts, RUNNER_TEMP: root, GITHUB_ENV: githubEnv };
    const before = readdirSync(root);
    assert.throws(() => materializeCatalog({ ...env, FLOWME_CATALOG_PART_1: '' }, contract));
    assert.deepEqual(readdirSync(root), before);
    const file = materializeCatalog(env, contract);
    assert.equal(readFileSync(file, 'utf8'), source);
    assert.equal(readFileSync(githubEnv, 'utf8'), `FLOWME_ALPHA_CATALOG_PACK_FILE=${file}\n`);
    assert.throws(() => cleanupCatalog({ ...env, FLOWME_ALPHA_CATALOG_PACK_FILE: neighbor }));
    assert.equal(readFileSync(neighbor, 'utf8'), 'keep');
    assert(cleanupCatalog({ ...env, FLOWME_ALPHA_CATALOG_PACK_FILE: file }));
    assert(!existsSync(file)); assert.equal(cleanupCatalog(env), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('CLI failure emits no supplied source or raw exception', () => {
  const env = { ...process.env, ...parts }; delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, [resolve('scripts/alpha/catalog-ci-source.mjs'), 'prepare'], { env, encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 1);
  assert(!result.stdout.includes(source)); assert(!result.stderr.includes(parts.FLOWME_CATALOG_PART_1));
  assert(!result.stderr.includes('Error:')); assert.match(result.stderr, /preparation\/cleanup failed/);
});

test('CI isolates source, retains the complete suite and fails the required gate when private tests cannot run', () => {
  const workflow = parse(readFileSync(resolve('.github/workflows/ci.yml'), 'utf8'));
  assert(!('pull_request_target' in workflow.on)); assert(!('workflow_run' in workflow.on));
  const job = workflow.jobs['catalog-contracts'];
  assert.equal(job['runs-on'], 'ubuntu-latest'); assert.equal(job.needs, 'core');
  assert.deepEqual(job.environment, { name: 'flowme-catalog-ci', deployment: false });
  assert.match(job.if, /head.repo.full_name == github.repository/); assert.match(job.if, /dependabot/);
  const prepare = job.steps.find(step => step.run === 'node scripts/alpha/catalog-ci-source.mjs prepare');
  assert.deepEqual(Object.keys(prepare.env).sort(), [...CATALOG_CI_KEYS].sort());
  for (const key of CATALOG_CI_KEYS) assert.equal(prepare.env[key], `\${{ secrets.${key} }}`);
  const tests = job.steps.find(step => step.run === 'npm run test:integrated-product-poc');
  assert(tests); assert.equal(tests['continue-on-error'], undefined); assert.equal(tests.if, undefined);
  assert.equal(job.steps.filter(step => /upload-artifact/.test(step.uses ?? '')).length, 1);
  assert.equal(job.steps.find(step => /upload-artifact/.test(step.uses ?? '')).with.path, 'output/integrated-product-poc/new-tests-*.public.json');
  assert.equal(job.steps.find(step => / cleanup$/.test(step.run ?? '')).if, '${{ always() }}');
  assert(!workflow.jobs.core.steps.some(step => step.run === 'npm run test:integrated-product-poc'));
  const gate = workflow.jobs['integration-required'];
  assert.equal(gate.if, '${{ always() }}'); assert.equal(gate.needs, 'catalog-contracts');
  assert.match(gate.steps[0].run, /test "\$CATALOG_RESULT" = success/);
  assert.equal(gate.steps[0].env.CATALOG_RESULT, '${{ needs.catalog-contracts.result }}');
});
