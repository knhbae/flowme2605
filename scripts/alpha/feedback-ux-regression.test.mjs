import assert from 'node:assert/strict';
import test from 'node:test';
import { feedbackRegressionEnvironment, feedbackRegressionScenarios, verifyFeedbackRegressionReport, verifyFeedbackServerHtml } from './feedback-ux-regression.mjs';

const sha = 'a'.repeat(64), asset = '/_next/static/chunks/synthetic.js';
const sizes = [['390x844', 390, 844], ['375x812', 375, 812], ['844x390', 844, 390], ['1024x768', 1024, 768], ['1440x900', 1440, 900]];
const env = { FLOWME_CLOUDFLARE_QA_MODE: 'local', FLOWME_CLOUDFLARE_QA_LOCAL_PORT: '3107',
  FLOWME_FEEDBACK_QA_BUILD_WORKSPACE: 'D:/flowme2605/owned-copy', FLOWME_JOURNEY_REGRESSION_LABEL: 'synthetic-unit' };
test('server preflight requires the exact build and synthetic enabled auth, before launching any browser', () => {
  const buildId = 'synthetic-build';
  verifyFeedbackServerHtml(`${buildId} sb_publishable_synthetic_release`, buildId);
  for (const html of [buildId, `${buildId} 개발계 연결이 꺼져 있습니다`, 'other-build sb_publishable_synthetic_release',
    `${buildId} sb_publishable_synthetic_release 개발계 연결이 꺼져 있습니다`]) {
    assert.throws(() => verifyFeedbackServerHtml(html, buildId));
  }
});
function boundary(width, height) {
  return { mode: 'local', viewport: { width, height }, realApiRequests: 0, forwardedSupabaseRequests: 0,
    forwardedTelemetryRequests: 0, outsidePrefixWrites: 0, sentinelBytesUnchanged: true,
    pageErrors: [], consoleErrors: [], overflow: { document: 0, body: 0 }, assets: [{ path: asset, sha256: sha }] };
}
function report() {
  return { stats: { expected: 60, unexpected: 0, skipped: 0, flaky: 0 }, suites: sizes.map(([projectName, width, height]) => ({
    suites: [{ specs: feedbackRegressionScenarios.map(([file, title], index) => ({
      file, title, line: index + 1, tests: [{ projectName, status: 'expected', expectedStatus: 'passed',
        results: [{ status: 'passed', retry: 0, attachments: [{ name: 'release-boundary', contentType: 'application/json',
          body: Buffer.from(JSON.stringify(boundary(width, height))).toString('base64') }] }] }],
    })) }],
  })) };
}
const row = data => data.suites[0].suites[0].specs[0].tests[0];
function changeBoundary(data, change) {
  const attachment = row(data).results[0].attachments[0];
  const value = JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8'));
  change(value); attachment.body = Buffer.from(JSON.stringify(value)).toString('base64');
}

test('QA entry requires explicit local/3107 and an absolute build, without any network or process launch', () => {
  assert.equal(feedbackRegressionEnvironment(env).label, 'synthetic-unit');
  for (const patch of [{ FLOWME_CLOUDFLARE_QA_MODE: undefined }, { FLOWME_CLOUDFLARE_QA_MODE: 'remote-readonly' },
    { FLOWME_CLOUDFLARE_QA_LOCAL_PORT: '3106' }, { FLOWME_CLOUDFLARE_QA_LOCAL_PORT: undefined },
    { FLOWME_FEEDBACK_QA_BUILD_WORKSPACE: 'relative-copy' }, { FLOWME_JOURNEY_REGRESSION_LABEL: '../outside' }]) {
    assert.throws(() => feedbackRegressionEnvironment({ ...env, ...patch }));
  }
});
test('the verifier accepts a complete synthetic 60-row matrix, not actual browser execution evidence', () => {
  const result = verifyFeedbackRegressionReport(report(), path => { assert.equal(path, asset); return sha; });
  assert.equal(result.executed, 60); assert.equal(result.actualServedAssetsVerified, 1);
  assert.deepEqual(Object.values(result.projects), [12, 12, 12, 12, 12]);
});
test('incomplete, duplicate and wrong-viewport rows cannot be reported as a full matrix', () => {
  const missing = report(); missing.suites.pop(); assert.throws(() => verifyFeedbackRegressionReport(missing, () => sha));
  const duplicate = report(); duplicate.suites[0].suites[0].specs[1] = structuredClone(duplicate.suites[0].suites[0].specs[0]);
  assert.throws(() => verifyFeedbackRegressionReport(duplicate, () => sha));
  const wrong = report(); changeBoundary(wrong, value => { value.viewport.width = 3107; });
  assert.throws(() => verifyFeedbackRegressionReport(wrong, () => sha));
});
test('the expected 12 named scenarios are required, not just any 60 passing rows', () => {
  const data = report(); data.suites[0].suites[0].specs[0].title = 'unrelated synthetic case';
  assert.throws(() => verifyFeedbackRegressionReport(data, () => sha));
});
test('failure, retry, skip and missing boundary evidence fail closed', () => {
  for (const mutate of [data => { row(data).results[0].status = 'failed'; },
    data => { row(data).results[0].retry = 1; }, data => { data.stats.skipped = 1; },
    data => { row(data).results[0].attachments = []; }, data => { row(data).expectedStatus = 'failed'; }]) {
    const data = report(); mutate(data); assert.throws(() => verifyFeedbackRegressionReport(data, () => sha));
  }
});
test('remote forwarding, outside-prefix writes, changed sentinels, errors and overflow cannot pass', () => {
  for (const mutate of [value => { value.mode = 'remote-readonly'; }, value => { value.realApiRequests = 1; },
    value => { value.forwardedSupabaseRequests = 1; }, value => { value.forwardedTelemetryRequests = 1; },
    value => { value.outsidePrefixWrites = 1; }, value => { value.sentinelBytesUnchanged = false; },
    value => { value.pageErrors = ['synthetic failure']; }, value => { value.consoleErrors = ['synthetic error']; },
    value => { value.overflow.document = 2; }]) {
    const data = report(); changeBoundary(data, mutate); assert.throws(() => verifyFeedbackRegressionReport(data, () => sha));
  }
});
test('every fetched asset must exist in the exact build and match its bytes', () => {
  assert.throws(() => verifyFeedbackRegressionReport(report(), () => 'b'.repeat(64)));
  assert.throws(() => verifyFeedbackRegressionReport(report(), () => { throw Error('missing-synthetic-asset'); }));
  const empty = report(); changeBoundary(empty, value => { value.assets = []; });
  assert.throws(() => verifyFeedbackRegressionReport(empty, () => sha));
});
test('asset traversal, encoded paths, doubled slashes and invalid hash formats are rejected', () => {
  for (const path of ['/_next/static/../secret', '/_next/static/%2e/secret', '/_next/static//secret', 'https://example.invalid/file', '/api/alpha']) {
    const data = report(); changeBoundary(data, value => { value.assets[0].path = path; });
    assert.throws(() => verifyFeedbackRegressionReport(data, () => sha));
  }
  const invalid = report(); changeBoundary(invalid, value => { value.assets[0].sha256 = 'not-a-hash'; });
  assert.throws(() => verifyFeedbackRegressionReport(invalid, () => sha));
});
test('an arbitrary attachment file is never read as trusted inline boundary evidence', () => {
  const data = report(); const attachment = row(data).results[0].attachments[0];
  delete attachment.body; attachment.path = 'D:/unowned/private.json';
  assert.throws(() => verifyFeedbackRegressionReport(data, () => sha));
});
