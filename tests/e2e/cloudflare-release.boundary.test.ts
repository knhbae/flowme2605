import test from 'node:test';
import assert from 'node:assert/strict';
import { isExpectedSyntheticTelemetryError, isSyntheticReleaseTelemetry, releaseResourceTarget, RELEASE_ORIGIN } from './cloudflare-release.fixture';

test('release QA forwards only exact GET document/static resources to the chosen fixed host', () => {
  for (const path of ['/alpha', '/_next/static/chunks/app/alpha/page-abc123.js', '/icon.svg']) {
    assert.equal(releaseResourceTarget(`${RELEASE_ORIGIN}${path}`, 'GET', 'local'), `http://127.0.0.1:3106${path}`);
    assert.equal(releaseResourceTarget(`${RELEASE_ORIGIN}${path}`, 'GET', 'remote-readonly'), `${RELEASE_ORIGIN}${path}`);
  }
});

test('both release QA modes reject API forwarding and all real mutation methods', () => {
  for (const mode of ['local', 'remote-readonly'] as const) {
    for (const path of ['/api/alpha/account', '/api/alpha/backup', '/api/alpha/backup-jobs', '/api/alpha/media', '/api/alpha/unknown', '/auth/callback', '/my']) {
      for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH']) assert.equal(releaseResourceTarget(`${RELEASE_ORIGIN}${path}`, method, mode), null);
    }
    for (const method of ['HEAD', 'POST', 'PUT', 'DELETE', 'PATCH']) assert.equal(releaseResourceTarget(`${RELEASE_ORIGIN}/alpha`, method, mode), null);
  }
});

test('release QA rejects foreign hosts, credentialed URLs and encoded path escapes', () => {
  for (const address of ['https://wkmzcxpnojobxrgebapw.supabase.co/rest/v1/accounts', 'http://127.0.0.1:3105/alpha',
    'https://other.example/alpha', 'https://user:password@alpha.wikiplans.com/alpha',
    `${RELEASE_ORIGIN}/_next/static/%2e%2e%2fapi`, `${RELEASE_ORIGIN}/_next/static/%5capi`]) {
    assert.equal(releaseResourceTarget(address, 'GET', 'local'), null);
    assert.equal(releaseResourceTarget(address, 'GET', 'remote-readonly'), null);
  }
});

test('only the observed exact remote telemetry GET is synthesized, never permitted real network access', () => {
  const known = 'https://static.cloudflareinsights.com/beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba1788362987495';
  assert.equal(isSyntheticReleaseTelemetry(known, 'GET', 'remote-readonly'), true);
  assert.equal(isSyntheticReleaseTelemetry(known, 'GET', 'local'), false);
  for (const method of ['HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'])
    assert.equal(isSyntheticReleaseTelemetry(known, method, 'remote-readonly'), false);
  for (const address of [known + '?extra=1', known + '#extra', known.replace('v31edd', 'v32edd'),
    known.replace('static.cloudflareinsights.com', 'other.example'), known.replace('https://', 'https://user:pass@'),
    `${RELEASE_ORIGIN}/api/alpha/account`]) assert.equal(isSyntheticReleaseTelemetry(address, 'GET', 'remote-readonly'), false);
  for (const mode of ['local', 'remote-readonly'] as const) assert.equal(releaseResourceTarget(known, 'GET', mode), null);
});

test('synthetic telemetry console classification rejects every nonexact SRI error and all local-mode errors', () => {
  const observed = "Failed to find a valid digest in the 'integrity' attribute for resource 'https://static.cloudflareinsights.com/beacon.min.js/v31edd6df95cf4e85bb4c19e7a9bdbcba1788362987495' with computed SHA-512 integrity 'z4PhNX7vuL3xVChQ1m2AB9Yg5AULVxXcg/SpIdNs6c5H0NE8XYXysP+DGNKHfuwvY7kxvUdBeoGlODJ6+SfaPg=='. The resource has been blocked.";
  assert.equal(isExpectedSyntheticTelemetryError(observed, 'remote-readonly'), true);
  assert.equal(isExpectedSyntheticTelemetryError(observed, 'local'), false);
  for (const message of [observed + ' additional error', observed.replace('z4Ph', 'OTHER'),
    observed.replace('v31edd', 'v32edd'), observed.replace('static.cloudflareinsights.com', 'other.example'),
    observed.replace('The resource has been blocked.', 'The resource was loaded.'),
    'Failed to load resource: net::ERR_FAILED', 'Uncaught Error: product failure']) {
    assert.equal(isExpectedSyntheticTelemetryError(message, 'remote-readonly'), false);
  }
});
