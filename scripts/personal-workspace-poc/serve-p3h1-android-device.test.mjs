import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import test from 'node:test';

import {
  DEFAULT_CANDIDATE_PATH,
  DEFAULT_EXPECTED_BYTES,
  DEFAULT_EXPECTED_SHA256,
  DEFAULT_PORT,
  DEFAULT_RUNNER_ASSET_PATHS,
  DEFAULT_RUNNER_PATH,
  P3H1_EVIDENCE_CONTRACT_VERSION,
  P3H1_HOST_MANIFEST_SCHEMA_VERSION,
  createP3H1AndroidDeviceHost,
  discoverPrivateIpv4,
  isPrivateIpv4,
  listPrivateIpv4,
  loadPinnedCandidate,
  loadRunnerBundle,
  parseCliArgs,
  resolveBindHost,
} from './serve-p3h1-android-device.mjs';

const FIXED_HOST_RUN_ID = '018f47d2-e249-7f81-9e45-7bdba52b27da';
const FIXED_HOST_STARTED_AT = '2026-09-04T08:15:30.000Z';

async function withHost(options, callback) {
  const host = createP3H1AndroidDeviceHost(options);
  const bound = await host.listen({ host: '127.0.0.1', port: 0 });
  try {
    return await callback({ host, bound, origin: `http://127.0.0.1:${bound.port}` });
  } finally {
    await host.close();
  }
}

function rawRequest(origin, requestPath, { method = 'GET', body } = {}) {
  const target = new URL(origin);
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: target.hostname,
      port: Number(target.port),
      method,
      path: requestPath,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

test('default candidate is pinned to the exact current bytes and SHA-256', () => {
  const candidate = loadPinnedCandidate();
  assert.equal(candidate.byteLength, DEFAULT_EXPECTED_BYTES);
  assert.equal(candidate.sha256, DEFAULT_EXPECTED_SHA256);
  assert.deepEqual(candidate.bytes, fs.readFileSync(DEFAULT_CANDIDATE_PATH));
  assert.equal(DEFAULT_PORT, 4173);
});

test('candidate loading fails closed before serving on byte or SHA mismatch', () => {
  assert.throws(
    () => loadPinnedCandidate({ expectedBytes: DEFAULT_EXPECTED_BYTES + 1 }),
    /candidate byte mismatch/u,
  );
  assert.throws(
    () => loadPinnedCandidate({ expectedSha256: '0'.repeat(64) }),
    /candidate SHA-256 mismatch/u,
  );
  assert.throws(
    () => loadPinnedCandidate({ expectedSha256: 'not-a-hash' }),
    /exactly 64 hexadecimal/u,
  );
});

test('runner rewrites exactly three source references into the HTTP asset allowlist', () => {
  const runner = loadRunnerBundle();
  const source = runner.bytes.toString('utf8');
  assert.match(source, /href="\/assets\/style\.css"/u);
  assert.match(source, /src="\/assets\/model\.js"/u);
  assert.match(source, /src="\/assets\/app\.js"/u);
  assert.doesNotMatch(source, /p3h1-android-device-runner-ko-assets\//u);
  assert.deepEqual([...runner.assets.keys()], [
    '/assets/style.css',
    '/assets/model.js',
    '/assets/app.js',
  ]);
});

test('private IPv4 discovery is deterministic and refuses ambiguous or missing LANs', () => {
  const oneLan = {
    Ethernet: [{ address: '169.254.1.1', family: 'IPv4', internal: false }],
    WiFi: [{ address: '192.168.45.231', family: 'IPv4', internal: false }],
    Loopback: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
  };
  assert.equal(discoverPrivateIpv4(oneLan), '192.168.45.231');
  assert.deepEqual(listPrivateIpv4(oneLan), [
    { interfaceName: 'WiFi', address: '192.168.45.231' },
  ]);
  assert.equal(isPrivateIpv4('10.0.0.2'), true);
  assert.equal(isPrivateIpv4('172.31.0.2'), true);
  assert.equal(isPrivateIpv4('172.32.0.2'), false);
  assert.equal(isPrivateIpv4('8.8.8.8'), false);
  assert.throws(() => discoverPrivateIpv4({ Loopback: oneLan.Loopback }), /No private IPv4/u);
  assert.throws(() => discoverPrivateIpv4({
    WiFi: oneLan.WiFi,
    VPN: [{ address: '10.1.2.3', family: 'IPv4', internal: false }],
  }), /Multiple private IPv4/u);
  assert.equal(resolveBindHost({ lan: true, networkInterfaces: oneLan }), '192.168.45.231');
  assert.equal(resolveBindHost({ host: '127.0.0.1' }), '127.0.0.1');
  assert.throws(() => resolveBindHost({ host: 'localhost' }), /must be an IPv4/u);
  assert.throws(() => resolveBindHost({ host: '8.8.8.8' }), /loopback or a private LAN/u);
  assert.throws(() => resolveBindHost({ host: '127.0.0.1', lan: true }), /either --host or --lan/u);
});

test('GET and HEAD serve the candidate exact Buffer with immutable evidence headers', async () => {
  await withHost({}, async ({ origin }) => {
    const expected = fs.readFileSync(DEFAULT_CANDIDATE_PATH);
    const getResponse = await rawRequest(origin, '/candidate');
    assert.equal(getResponse.status, 200);
    assert.deepEqual(getResponse.body, expected);
    assert.equal(Number(getResponse.headers['content-length']), expected.byteLength);
    assert.equal(getResponse.headers['x-flowme-artifact-sha256'], DEFAULT_EXPECTED_SHA256);
    assert.equal(Number(getResponse.headers['x-flowme-artifact-bytes']), DEFAULT_EXPECTED_BYTES);
    assert.match(getResponse.headers['cache-control'], /no-store/u);
    assert.equal(getResponse.headers['x-content-type-options'], 'nosniff');
    assert.equal(getResponse.headers['content-encoding'], undefined);

    const headResponse = await rawRequest(origin, '/candidate', { method: 'HEAD' });
    assert.equal(headResponse.status, 200);
    assert.equal(headResponse.body.byteLength, 0);
    assert.equal(Number(headResponse.headers['content-length']), expected.byteLength);
    assert.equal(headResponse.headers['x-flowme-artifact-sha256'], DEFAULT_EXPECTED_SHA256);
  });
});

test('root, runner and exact three assets are available without exposing the runner test', async () => {
  await withHost({}, async ({ origin }) => {
    const root = await rawRequest(origin, '/');
    const runner = await rawRequest(origin, '/runner');
    assert.equal(root.status, 200);
    assert.deepEqual(root.body, runner.body);
    assert.match(root.body.toString('utf8'), /href="\/assets\/style\.css"/u);

    for (const [route, filePath] of Object.entries(DEFAULT_RUNNER_ASSET_PATHS)) {
      const response = await rawRequest(origin, route);
      assert.equal(response.status, 200, route);
      assert.deepEqual(response.body, fs.readFileSync(filePath), route);
      assert.match(response.headers['cache-control'], /no-store/u);
      assert.equal(response.headers['content-encoding'], undefined);
    }
    const excludedTest = await rawRequest(origin, '/assets/model.test.cjs');
    assert.equal(excludedTest.status, 404);
  });
});

test('manifest and health expose the pinned candidate without absolute filesystem paths', async () => {
  await withHost({
    hostRunId: FIXED_HOST_RUN_ID,
    hostStartedAt: FIXED_HOST_STARTED_AT,
  }, async ({ host, bound, origin }) => {
    const expectedFingerprint = [
      FIXED_HOST_RUN_ID,
      origin,
      DEFAULT_EXPECTED_SHA256,
      DEFAULT_EXPECTED_BYTES,
      FIXED_HOST_STARTED_AT,
    ].join('|');
    const manifestResponse = await rawRequest(origin, '/manifest.json');
    assert.equal(manifestResponse.status, 200);
    const manifest = JSON.parse(manifestResponse.body.toString('utf8'));
    assert.equal(manifest.schemaVersion, P3H1_HOST_MANIFEST_SCHEMA_VERSION);
    assert.equal(manifest.contractVersion, P3H1_EVIDENCE_CONTRACT_VERSION);
    assert.equal(manifest.stage, 'P3-H1');
    assert.equal(manifest.actualDeviceEvidence, 'NOT_RUN-until-manually-recorded');
    assert.equal(manifest.hostRunId, FIXED_HOST_RUN_ID);
    assert.equal(manifest.hostStartedAt, FIXED_HOST_STARTED_AT);
    assert.equal(manifest.origin, origin);
    assert.equal(manifest.bindHost, '127.0.0.1');
    assert.equal(manifest.port, bound.port);
    assert.equal(manifest.bindingFingerprint, expectedFingerprint);
    assert.deepEqual(manifest.runBinding, {
      hostRunId: FIXED_HOST_RUN_ID,
      origin,
      candidateSha256: DEFAULT_EXPECTED_SHA256,
      candidateBytes: DEFAULT_EXPECTED_BYTES,
      createdAt: FIXED_HOST_STARTED_AT,
      bindingFingerprint: expectedFingerprint,
    });
    assert.deepEqual(manifest.artifact, {
      path: '/candidate',
      fileName: '2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html',
      sha256: DEFAULT_EXPECTED_SHA256,
      bytes: DEFAULT_EXPECTED_BYTES,
      httpStatus: 200,
      contentType: 'text/html; charset=utf-8',
      servedSha256: DEFAULT_EXPECTED_SHA256,
      servedBytes: DEFAULT_EXPECTED_BYTES,
    });
    assert.deepEqual(manifest.runner.assets.map((asset) => asset.path), [
      '/assets/style.css',
      '/assets/model.js',
      '/assets/app.js',
    ]);
    assert.doesNotMatch(manifestResponse.body.toString('utf8'), /D:\\flowme2605/iu);
    assert.deepEqual(host.manifest, manifest);
    assert.equal(host.origin, origin);
    assert.equal(host.bindingFingerprint, expectedFingerprint);

    const healthResponse = await rawRequest(origin, '/health');
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(JSON.parse(healthResponse.body.toString('utf8')), {
      ok: true,
      schemaVersion: P3H1_HOST_MANIFEST_SCHEMA_VERSION,
      contractVersion: P3H1_EVIDENCE_CONTRACT_VERSION,
      stage: 'P3-H1',
      hostRunId: FIXED_HOST_RUN_ID,
      hostStartedAt: FIXED_HOST_STARTED_AT,
      origin,
      bindHost: '127.0.0.1',
      port: bound.port,
      bindingFingerprint: expectedFingerprint,
      candidateSha256: DEFAULT_EXPECTED_SHA256,
      candidateBytes: DEFAULT_EXPECTED_BYTES,
    });
    assert.deepEqual(host.health, JSON.parse(healthResponse.body.toString('utf8')));
    assert.match(healthResponse.headers['cache-control'], /no-store/u);
    assert.equal(healthResponse.headers['x-content-type-options'], 'nosniff');

    const repeatedManifest = await rawRequest(origin, '/manifest.json');
    assert.deepEqual(repeatedManifest.body, manifestResponse.body);
  });
});

test('host run identity is cryptographically generated per factory instance and injectable in tests', () => {
  const first = createP3H1AndroidDeviceHost();
  const second = createP3H1AndroidDeviceHost();
  const injected = createP3H1AndroidDeviceHost({
    hostRunId: FIXED_HOST_RUN_ID,
    hostStartedAt: FIXED_HOST_STARTED_AT,
  });

  assert.match(first.hostRunId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
  assert.match(second.hostRunId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
  assert.notEqual(first.hostRunId, second.hostRunId);
  assert.notEqual(first.hostStartedAt, '');
  assert.equal(new Date(first.hostStartedAt).toISOString(), first.hostStartedAt);
  assert.equal(injected.hostRunId, FIXED_HOST_RUN_ID);
  assert.equal(injected.hostStartedAt, FIXED_HOST_STARTED_AT);
  assert.equal(injected.manifest, null);
  assert.equal(injected.health, null);
  assert.equal(injected.origin, null);

  assert.throws(
    () => createP3H1AndroidDeviceHost({ hostRunId: 'unsafe id' }),
    /Host run ID/u,
  );
  assert.throws(
    () => createP3H1AndroidDeviceHost({ hostStartedAt: '2026-09-04' }),
    /canonical ISO-8601/u,
  );
});

test('factory accepts explicit runner paths while retaining the exact route allowlist', async () => {
  await withHost({
    runnerPath: DEFAULT_RUNNER_PATH,
    runnerAssetPaths: DEFAULT_RUNNER_ASSET_PATHS,
  }, async ({ origin }) => {
    const runner = await rawRequest(origin, '/runner');
    assert.equal(runner.status, 200);
    assert.match(runner.body.toString('utf8'), /\/assets\/app\.js/u);
  });
});

test('method, query, traversal and arbitrary-file requests fail closed without changing bytes', async () => {
  const candidateBefore = fs.readFileSync(DEFAULT_CANDIDATE_PATH);
  const runnerBefore = fs.readFileSync(DEFAULT_RUNNER_PATH);
  await withHost({}, async ({ origin }) => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const blocked = await rawRequest(origin, '/candidate', {
        method,
        body: Buffer.from('attempted write', 'utf8'),
      });
      assert.equal(blocked.status, 405, method);
      assert.equal(blocked.headers.allow, 'GET, HEAD', method);
      assert.match(blocked.headers['cache-control'], /no-store/u);
      assert.equal(blocked.headers['x-content-type-options'], 'nosniff');
    }

    for (const blockedPath of [
      '/../package.json',
      '/%2e%2e/package.json',
      '/%252e%252e/package.json',
      '/candidate?tracking=1',
      '/runner?tracking=1',
    ]) {
      const response = await rawRequest(origin, blockedPath);
      assert.equal(response.status, 400, blockedPath);
    }
    assert.equal((await rawRequest(origin, '/package.json')).status, 404);
    assert.equal((await rawRequest(origin, '/assets/../app.js')).status, 400);
    const favicon = await rawRequest(origin, '/favicon.ico');
    assert.equal(favicon.status, 204);
    assert.equal(favicon.body.byteLength, 0);
  });
  assert.deepEqual(fs.readFileSync(DEFAULT_CANDIDATE_PATH), candidateBefore);
  assert.deepEqual(fs.readFileSync(DEFAULT_RUNNER_PATH), runnerBefore);
});

test('server source has no filesystem writer, POST route, CORS wildcard or compression path', () => {
  const source = fs.readFileSync(new URL('./serve-p3h1-android-device.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:writeFile|appendFile|createWriteStream|rmSync|unlinkSync|renameSync)\b/u);
  assert.doesNotMatch(source, /access-control-allow-origin/iu);
  assert.doesNotMatch(source, /content-encoding|createGzip|createBrotliCompress/iu);
  assert.doesNotMatch(source, /request\.method\s*===\s*['"]POST['"]/u);
});

test('CLI parsing keeps the stable default origin and requires explicit LAN or IPv4 selection', () => {
  const defaults = parseCliArgs([]);
  assert.equal(defaults.port, 4173);
  assert.equal(defaults.host, undefined);
  assert.equal(defaults.lan, false);
  assert.equal(defaults.candidatePath, DEFAULT_CANDIDATE_PATH);
  assert.equal(defaults.runnerPath, DEFAULT_RUNNER_PATH);

  const explicit = parseCliArgs([
    '--host=192.168.45.231',
    '--port', '44173',
    '--sha256', DEFAULT_EXPECTED_SHA256.toLowerCase(),
    '--bytes=1925497',
    '--runner', DEFAULT_RUNNER_PATH,
  ]);
  assert.equal(explicit.host, '192.168.45.231');
  assert.equal(explicit.port, 44_173);
  assert.equal(explicit.expectedSha256, DEFAULT_EXPECTED_SHA256);
  assert.equal(explicit.expectedBytes, DEFAULT_EXPECTED_BYTES);
  assert.equal(explicit.runnerPath, DEFAULT_RUNNER_PATH);

  assert.equal(parseCliArgs(['--lan']).lan, true);
  assert.throws(() => parseCliArgs(['--lan', '--host', '192.168.1.2']), /either --host or --lan/u);
  assert.throws(() => parseCliArgs(['--port', '0']), /from 1 through 65535/u);
  assert.throws(() => parseCliArgs(['--unknown']), /Unknown argument/u);
});

test('factory listen defaults to loopback without weakening the CLI LAN selection contract', async () => {
  const host = createP3H1AndroidDeviceHost();
  const bound = await host.listen({ port: 0 });
  try {
    assert.equal(bound.host, '127.0.0.1');
    assert.ok(bound.port > 0);
  } finally {
    await host.close();
  }
});
