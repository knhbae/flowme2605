import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const projects = new Map([['390x844', [390, 844]], ['375x812', [375, 812]],
  ['844x390', [844, 390]], ['1024x768', [1024, 768]], ['1440x900', [1440, 900]]]);
export const feedbackRegressionScenarios = [
  ['cloudflare-release.browser.ts', 'production bundle: create folder/document, write, set date/time and reload without outside storage writes'],
  ['cloudflare-release.browser.ts', 'production bundle: committed-but-unavailable save survives pending poll and same-request receipt ACK'],
  ['folder-content-entry.browser.ts', 'F1 native typing: exact homonyms, dismiss and Escape are zero-write; explicit choice links the same ID'],
  ['folder-content-entry.browser.ts', 'F2 native paste: unknown name opens prefilled existing panel; close/Escape cancel without command; confirmation creates same-row folder'],
  ['folder-content-entry.browser.ts', 'F6 noncanonical whitespace remains exact plain input without a folder proposal through save and reload'],
  ['folder-content-entry.browser.ts', 'F3 pasted exact name: rejected save retains input, explicit retry then link and Undo preserve source IDs through reload'],
  ['folder-content-entry.browser.ts', 'F4 explicit new-folder link rejection preserves same-row raw; retry and Undo remain one confirmed transaction each'],
  ['folder-content-entry.browser.ts', 'F5 partial view and synthetic IME do not offer a folder link; composition retains raw until end'],
  ['folder-content-entry.browser.ts', 'C1 empty catalog: Browse starts Flow discovery and existing empty URL submit reveals manual source input without saving'],
  ['folder-content-entry.browser.ts', 'C2 Browse with community=false: read/output exact-version return is zero mutation; private use preserves public source'],
  ['folder-content-entry.browser.ts', 'C2 Browse with community=true: read/output exact-version return is zero mutation; private use preserves public source'],
  ['folder-content-entry.browser.ts', 'C3 discovery Flow creation entry is zero-write; Creator private create/edit/save/activity navigation stays separate'],
];
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');

export function feedbackRegressionEnvironment(env) {
  assert.equal(env.FLOWME_CLOUDFLARE_QA_MODE, 'local', 'feedback-regression-local-only');
  assert.equal(env.FLOWME_CLOUDFLARE_QA_LOCAL_PORT, '3107', 'feedback-regression-3107-only');
  assert(env.FLOWME_FEEDBACK_QA_BUILD_WORKSPACE && isAbsolute(env.FLOWME_FEEDBACK_QA_BUILD_WORKSPACE), 'feedback-regression-exact-build-required');
  const label = env.FLOWME_JOURNEY_REGRESSION_LABEL;
  if (label !== undefined) assert.match(label, /^[a-z0-9-]+$/, 'feedback-regression-label-rejected');
  return { workspace: resolve(env.FLOWME_FEEDBACK_QA_BUILD_WORKSPACE), label };
}

export function frozenFeedbackBuild(workspace) {
  const within = relative(root, workspace).replaceAll('\\', '/');
  assert.match(within, /^output\/playwright\/feedback-ux-isolated-build-[A-Za-z0-9-]+\/workspace$/, 'feedback-regression-owned-copy-only');
  const manifest = JSON.parse(readFileSync(resolve(workspace, '../inputs.json'), 'utf8'));
  assert.equal(resolve(manifest.root), root);
  assert.equal(resolve(manifest.workspace), workspace);
  assert(Array.isArray(manifest.sources) && manifest.sources.length > 0);
  const buildId = readFileSync(resolve(workspace, '.next/BUILD_ID'), 'utf8').trim();
  assert(buildId);
  function unchanged() {
    assert.equal(readFileSync(resolve(workspace, '.next/BUILD_ID'), 'utf8').trim(), buildId);
    for (const source of manifest.sources) {
      assert(typeof source.path === 'string' && !isAbsolute(source.path) && !source.path.split(/[\\/]/).includes('..'));
      assert.match(source.sha256, /^[a-f0-9]{64}$/);
      assert.equal(hash(resolve(root, source.path)), source.sha256, `feedback-regression-source-drift:${source.path}`);
      assert.equal(hash(resolve(workspace, source.path)), source.sha256, `feedback-regression-copy-drift:${source.path}`);
    }
  }
  unchanged();
  return { buildId, sourceCount: manifest.sources.length, unchanged,
    inputHash: createHash('sha256').update(JSON.stringify(manifest.sources)).digest('hex'),
    assetHash(path) {
      assert.match(path, /^\/_next\/static\/[A-Za-z0-9_./-]+$/);
      assert(!path.includes('..') && !path.includes('//'), 'feedback-regression-asset-path-rejected');
      return hash(resolve(workspace, '.next', path.slice('/_next/'.length)));
    } };
}

export function verifyFeedbackRegressionReport(report, assetHash) {
  assert.equal(report.stats?.expected, 60);
  for (const key of ['unexpected', 'skipped', 'flaky']) assert.equal(report.stats?.[key], 0);
  const rows = [];
  function visit(suite) {
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      rows.push({ spec, test, file: spec.file ?? suite.file });
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites ?? []) visit(suite);
  assert.equal(rows.length, 60, 'feedback-regression-matrix-incomplete');
  const counts = new Map(), seen = new Set(), assets = new Map();
  const scenarioKeys = new Set(feedbackRegressionScenarios.map(([file, title]) => `${file}:${title}`));
  for (const { spec, test, file } of rows) {
    const viewport = projects.get(test.projectName);
    assert(viewport, 'feedback-regression-project-rejected');
    assert(typeof file === 'string' && /(?:^|[\\/])(cloudflare-release|folder-content-entry)\.browser\.ts$/.test(file));
    const scenarioKey = `${file.split(/[\\/]/).at(-1)}:${spec.title}`;
    assert(scenarioKeys.has(scenarioKey), 'feedback-regression-unexpected-scenario');
    const key = `${test.projectName}:${scenarioKey}`;
    assert(!seen.has(key), 'feedback-regression-duplicate-case'); seen.add(key);
    counts.set(test.projectName, (counts.get(test.projectName) ?? 0) + 1);
    assert.equal(test.status, 'expected');
    assert.equal(test.expectedStatus, 'passed');
    assert.equal(test.results?.length, 1, 'feedback-regression-retry-not-allowed');
    const result = test.results[0];
    assert.equal(result.status, 'passed'); assert.equal(result.retry, 0);
    const attachments = (result.attachments ?? []).filter(item => item.name === 'release-boundary');
    assert.equal(attachments.length, 1, 'feedback-regression-boundary-missing-or-duplicate');
    const attachment = attachments[0];
    assert.equal(attachment.contentType, 'application/json');
    assert(typeof attachment.body === 'string' && /^[A-Za-z0-9+/]+={0,2}$/.test(attachment.body), 'feedback-regression-inline-boundary-required');
    const boundary = JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8'));
    assert.equal(boundary.mode, 'local');
    assert.deepEqual(boundary.viewport, { width: viewport[0], height: viewport[1] });
    for (const name of ['realApiRequests', 'forwardedSupabaseRequests', 'forwardedTelemetryRequests', 'outsidePrefixWrites']) assert.equal(boundary[name], 0);
    assert.equal(boundary.sentinelBytesUnchanged, true);
    assert.deepEqual(boundary.pageErrors, []); assert.deepEqual(boundary.consoleErrors, []);
    assert(boundary.overflow?.document <= 1 && boundary.overflow?.body <= 1);
    assert(Array.isArray(boundary.assets) && boundary.assets.length > 0, 'feedback-regression-assets-required');
    for (const asset of boundary.assets) {
      assert.match(asset.path, /^\/_next\/static\/[A-Za-z0-9_./-]+$/);
      assert(!asset.path.includes('..') && !asset.path.includes('//'), 'feedback-regression-asset-path-rejected');
      assert.match(asset.sha256, /^[a-f0-9]{64}$/);
      assert.equal(assetHash(asset.path), asset.sha256, `feedback-regression-served-asset-mismatch:${asset.path}`);
      if (assets.has(asset.path)) assert.equal(assets.get(asset.path), asset.sha256);
      assets.set(asset.path, asset.sha256);
    }
  }
  assert.equal(counts.size, projects.size);
  for (const name of projects.keys()) assert.equal(counts.get(name), 12);
  return { executed: rows.length, passed: rows.length, failed: 0, skipped: 0, retries: 0,
    projects: Object.fromEntries(counts), actualServedAssetsVerified: assets.size };
}

export function verifyFeedbackServerHtml(html, buildId) {
  assert(typeof html === 'string' && typeof buildId === 'string' && buildId.length > 0);
  assert(html.includes(buildId), 'feedback-regression-served-build-mismatch');
  assert(html.includes('sb_publishable_synthetic_release'), 'feedback-regression-synthetic-auth-config-required');
  assert(!html.includes('개발계 연결이 꺼져 있습니다'), 'feedback-regression-auth-gate-disabled');
}

async function servedBuildId(buildId) {
  const response = await fetch('http://127.0.0.1:3107/alpha', { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200, 'feedback-regression-server-not-ready');
  verifyFeedbackServerHtml(await response.text(), buildId);
}

async function main() {
  const chosen = feedbackRegressionEnvironment(process.env), build = frozenFeedbackBuild(chosen.workspace);
  const qaPaths = ['scripts/alpha/feedback-ux-regression.mjs', 'scripts/alpha/flow-execution-journey-regression.config.ts',
    'scripts/alpha/flow-execution-journey-contract.ts',
    'tests/e2e/cloudflare-release.browser.ts', 'tests/e2e/folder-content-entry.browser.ts',
    'tests/e2e/cloudflare-release.fixture.ts', 'tests/e2e/folder-content-entry.fixture.ts', 'tests/e2e/alpha-auth.fixture.ts'];
  const qaSources = qaPaths.map(path => ({ path, sha256: hash(resolve(root, path)) }));
  const label = chosen.label ?? `feedback-ux-${new Date().toISOString().replace(/[:.]/g, '-').toLowerCase()}`;
  const directory = resolve(root, `output/playwright/flow-execution-journey-regression-${label}`);
  assert(!existsSync(directory), 'feedback-regression-use-fresh-label');
  await servedBuildId(build.buildId);
  mkdirSync(directory, { recursive: true });
  const started = new Date().toISOString();
  let log = '', launchError = null;
  const exitCode = await new Promise(resolveExit => {
    const windows = process.platform === 'win32';
    const command = windows ? process.env.ComSpec ?? 'cmd.exe' : 'npx';
    const args = windows ? ['/d', '/s', '/c', 'npx.cmd playwright test --config scripts/alpha/flow-execution-journey-regression.config.ts']
      : ['playwright', 'test', '--config', 'scripts/alpha/flow-execution-journey-regression.config.ts'];
    const child = spawn(command, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FLOWME_CLOUDFLARE_QA_MODE: 'local', FLOWME_CLOUDFLARE_QA_LOCAL_PORT: '3107', FLOWME_JOURNEY_REGRESSION_LABEL: label } });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { log += data.toString(); });
    child.on('error', error => { launchError = String(error); });
    child.on('close', code => resolveExit(code));
  });
  writeFileSync(resolve(directory, 'frozen-build-run.log'), log);
  let verification = null, error = null;
  try {
    assert.equal(exitCode, 0); assert.equal(launchError, null);
    verification = verifyFeedbackRegressionReport(JSON.parse(readFileSync(resolve(directory, 'results.json'), 'utf8')), build.assetHash);
    for (const source of qaSources) assert.equal(hash(resolve(root, source.path)), source.sha256, `feedback-regression-verifier-drift:${source.path}`);
    build.unchanged(); await servedBuildId(build.buildId);
  } catch (reason) { error = String(reason); }
  const result = { started, ended: new Date().toISOString(), exitCode, launchError, error,
    scope: 'Existing 60 browser regressions; synthetic Auth/API/CAS only, fixed QA3107 assets; not real DB/device/observed-user evidence',
    buildId: build.buildId, inputHash: build.inputHash, sourceCount: build.sourceCount, qaSources, verification, ok: error === null };
  writeFileSync(resolve(directory, 'frozen-build-result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ directory, ...result }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch(error => { console.error(String(error)); process.exitCode = 1; });
}
