import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const P3H1_STAGE = 'P3-H1';
export const P3H1_HOST_MANIFEST_SCHEMA_VERSION = 2;
export const P3H1_EVIDENCE_CONTRACT_VERSION =
  'flowme-personal-workspace-p3h1-android-evidence-v2';
export const DEFAULT_PORT = 4173;
export const DEFAULT_EXPECTED_BYTES = 1_925_497;
export const DEFAULT_EXPECTED_SHA256 =
  '55C57D51ECE599CACA060D5A7A825A600E2D98D8E428DC51EC76E81855D8E8AD';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '../..');
const RUNNER_BASENAME = '2026-09-04-flowme-integrated-poc-p3h1-android-device-runner-ko';

export const DEFAULT_CANDIDATE_PATH = path.join(
  REPOSITORY_ROOT,
  'docs/content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html',
);
export const DEFAULT_RUNNER_PATH = path.join(
  REPOSITORY_ROOT,
  `docs/content-audit/${RUNNER_BASENAME}.html`,
);
export const DEFAULT_RUNNER_ASSET_PATHS = Object.freeze({
  '/assets/style.css': path.join(
    REPOSITORY_ROOT,
    `docs/content-audit/${RUNNER_BASENAME}-assets/style.css`,
  ),
  '/assets/model.js': path.join(
    REPOSITORY_ROOT,
    `docs/content-audit/${RUNNER_BASENAME}-assets/model.js`,
  ),
  '/assets/app.js': path.join(
    REPOSITORY_ROOT,
    `docs/content-audit/${RUNNER_BASENAME}-assets/app.js`,
  ),
});

const NO_STORE_HEADERS = Object.freeze({
  'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
  pragma: 'no-cache',
  expires: '0',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
});
const ASSET_CONTENT_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
});

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function normalizeExpectedSha256(value) {
  const normalized = String(value ?? '').replace(/^sha256:/iu, '').toUpperCase();
  if (!/^[A-F0-9]{64}$/u.test(normalized)) {
    throw new Error('Expected SHA-256 must contain exactly 64 hexadecimal characters.');
  }
  return normalized;
}

function normalizeExpectedBytes(value) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new Error('Expected byte length must be a non-negative safe integer.');
  }
  return normalized;
}

function normalizeHostRunId(value) {
  const normalized = String(value ?? '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u.test(normalized)) {
    throw new Error('Host run ID must be 8-128 safe identifier characters.');
  }
  return normalized;
}

function normalizeHostStartedAt(value) {
  const normalized = String(value ?? '').trim();
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== normalized) {
    throw new Error('Host start time must be a canonical ISO-8601 UTC timestamp.');
  }
  return normalized;
}

export function loadPinnedCandidate({
  candidatePath = DEFAULT_CANDIDATE_PATH,
  expectedSha256 = DEFAULT_EXPECTED_SHA256,
  expectedBytes = DEFAULT_EXPECTED_BYTES,
} = {}) {
  const resolvedPath = path.resolve(candidatePath);
  const pinnedSha256 = normalizeExpectedSha256(expectedSha256);
  const pinnedBytes = normalizeExpectedBytes(expectedBytes);
  const bytes = fs.readFileSync(resolvedPath);
  const actualSha256 = sha256(bytes);

  if (bytes.byteLength !== pinnedBytes) {
    throw new Error(
      `P3-H1 candidate byte mismatch: expected ${pinnedBytes}, received ${bytes.byteLength}.`,
    );
  }
  if (actualSha256 !== pinnedSha256) {
    throw new Error(
      `P3-H1 candidate SHA-256 mismatch: expected ${pinnedSha256}, received ${actualSha256}.`,
    );
  }

  return Object.freeze({
    fileName: path.basename(resolvedPath),
    bytes,
    byteLength: bytes.byteLength,
    sha256: actualSha256,
  });
}

function replaceExactlyOnce(source, marker, replacement) {
  const first = source.indexOf(marker);
  if (first < 0 || source.indexOf(marker, first + marker.length) >= 0) {
    throw new Error(`P3-H1 runner must contain exactly one asset reference: ${marker}`);
  }
  return source.slice(0, first) + replacement + source.slice(first + marker.length);
}

export function loadRunnerBundle({
  runnerPath = DEFAULT_RUNNER_PATH,
  runnerAssetPaths = DEFAULT_RUNNER_ASSET_PATHS,
} = {}) {
  const resolvedRunnerPath = path.resolve(runnerPath);
  const sourceAssetDirectory = `${path.basename(resolvedRunnerPath, '.html')}-assets`;
  let runnerSource = fs.readFileSync(resolvedRunnerPath, 'utf8');
  const assets = new Map();

  for (const [route, filePath] of Object.entries(runnerAssetPaths)) {
    if (!/^\/assets\/(?:style\.css|model\.js|app\.js)$/u.test(route)) {
      throw new Error(`Runner asset route is outside the exact allowlist: ${route}`);
    }
    const resolvedPath = path.resolve(filePath);
    const fileName = path.basename(resolvedPath);
    const extension = path.extname(fileName).toLowerCase();
    const contentType = ASSET_CONTENT_TYPES[extension];
    if (!contentType) throw new Error(`Unsupported runner asset type: ${fileName}`);
    const bytes = fs.readFileSync(resolvedPath);
    assets.set(route, Object.freeze({
      route,
      fileName,
      bytes,
      byteLength: bytes.byteLength,
      sha256: sha256(bytes),
      contentType,
    }));
    runnerSource = replaceExactlyOnce(
      runnerSource,
      `${sourceAssetDirectory}/${fileName}`,
      route,
    );
  }

  const requiredRoutes = ['/assets/style.css', '/assets/model.js', '/assets/app.js'];
  if (assets.size !== requiredRoutes.length || requiredRoutes.some((route) => !assets.has(route))) {
    throw new Error('Runner assets must be exactly style.css, model.js and app.js.');
  }

  const bytes = Buffer.from(runnerSource, 'utf8');
  return Object.freeze({
    fileName: path.basename(resolvedRunnerPath),
    bytes,
    byteLength: bytes.byteLength,
    sha256: sha256(bytes),
    assets,
  });
}

export function isPrivateIpv4(address) {
  if (net.isIP(address) !== 4) return false;
  const [first, second] = address.split('.').map(Number);
  return first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168);
}

export function listPrivateIpv4(networkInterfaces = os.networkInterfaces()) {
  const candidates = [];
  for (const [interfaceName, entries] of Object.entries(networkInterfaces ?? {})) {
    for (const entry of entries ?? []) {
      const family = typeof entry.family === 'string' ? entry.family : String(entry.family);
      if (entry.internal || family !== 'IPv4' || !isPrivateIpv4(entry.address)) continue;
      candidates.push({ interfaceName, address: entry.address });
    }
  }
  return candidates
    .filter((candidate, index, all) => (
      all.findIndex((entry) => entry.address === candidate.address) === index
    ))
    .sort((left, right) => (
      left.interfaceName.localeCompare(right.interfaceName)
      || left.address.localeCompare(right.address)
    ));
}

export function discoverPrivateIpv4(networkInterfaces = os.networkInterfaces()) {
  const candidates = listPrivateIpv4(networkInterfaces);
  if (candidates.length === 0) {
    throw new Error('No private IPv4 LAN address was found. Pass --host <IPv4> explicitly.');
  }
  if (candidates.length > 1) {
    const details = candidates
      .map((candidate) => `${candidate.interfaceName}=${candidate.address}`)
      .join(', ');
    throw new Error(`Multiple private IPv4 LAN addresses were found (${details}). Pass --host <IPv4>.`);
  }
  return candidates[0].address;
}

export function resolveBindHost({
  host,
  lan = false,
  networkInterfaces = os.networkInterfaces(),
} = {}) {
  if (host && lan) throw new Error('Use either --host or --lan, not both.');
  if (lan) return discoverPrivateIpv4(networkInterfaces);
  const selected = host || '127.0.0.1';
  if (net.isIP(selected) !== 4) throw new Error(`Bind host must be an IPv4 address: ${selected}`);
  const loopback = selected.startsWith('127.');
  if (!loopback && !isPrivateIpv4(selected)) {
    throw new Error(`Bind host must be loopback or a private LAN IPv4 address: ${selected}`);
  }
  return selected;
}

function validatePort(value, { allowZero = false } = {}) {
  const port = Number(value);
  const minimum = allowZero ? 0 : 1;
  if (!Number.isSafeInteger(port) || port < minimum || port > 65_535) {
    throw new Error(`Port must be an integer from ${minimum} through 65535.`);
  }
  return port;
}

function encodeJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function requestTargetProblem(rawTarget) {
  if (typeof rawTarget !== 'string' || rawTarget.length === 0 || rawTarget.length > 2_048) {
    return 'malformed';
  }
  if (!rawTarget.startsWith('/') || rawTarget.startsWith('//')) return 'malformed';

  let decodedPath = rawTarget.split('?', 1)[0];
  try {
    for (let pass = 0; pass < 3; pass += 1) {
      const next = decodeURIComponent(decodedPath);
      if (next === decodedPath) break;
      decodedPath = next;
    }
  } catch {
    return 'malformed';
  }
  if (decodedPath.includes('\\') || decodedPath.includes('\0')) return 'malformed';
  if (decodedPath.split('/').some((segment) => segment === '.' || segment === '..')) {
    return 'traversal';
  }
  return null;
}

function send(request, response, status, body, headers = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  response.writeHead(status, {
    ...NO_STORE_HEADERS,
    ...headers,
    'content-length': String(payload.byteLength),
  });
  if (request.method === 'HEAD') response.end();
  else response.end(payload);
}

function artifactHeaders(asset, contentType = 'text/html; charset=utf-8') {
  return {
    'content-type': contentType,
    'x-flowme-artifact-sha256': asset.sha256,
    'x-flowme-artifact-bytes': String(asset.byteLength),
    etag: `"sha256-${asset.sha256}"`,
  };
}

export function createP3H1AndroidDeviceHost(options = {}) {
  const candidate = loadPinnedCandidate(options);
  const runner = loadRunnerBundle(options);
  const hostRunId = normalizeHostRunId(options.hostRunId ?? randomUUID());
  const hostStartedAt = normalizeHostStartedAt(
    options.hostStartedAt ?? new Date().toISOString(),
  );
  let bindingState = null;
  const onRequest = typeof options.onRequest === 'function' ? options.onRequest : null;

  function bindEvidenceIdentity(bindHost, port) {
    const origin = `http://${bindHost}:${port}`;
    const bindingFingerprint = [
      hostRunId,
      origin,
      candidate.sha256,
      candidate.byteLength,
      hostStartedAt,
    ].join('|');
    const runBinding = Object.freeze({
      hostRunId,
      origin,
      candidateSha256: candidate.sha256,
      candidateBytes: candidate.byteLength,
      createdAt: hostStartedAt,
      bindingFingerprint,
    });
    const manifest = Object.freeze({
      schemaVersion: P3H1_HOST_MANIFEST_SCHEMA_VERSION,
      contractVersion: P3H1_EVIDENCE_CONTRACT_VERSION,
      stage: P3H1_STAGE,
      actualDeviceEvidence: 'NOT_RUN-until-manually-recorded',
      hostRunId,
      hostStartedAt,
      origin,
      bindHost,
      port,
      runBinding,
      bindingFingerprint,
      artifact: Object.freeze({
        path: '/candidate',
        fileName: candidate.fileName,
        sha256: candidate.sha256,
        bytes: candidate.byteLength,
        httpStatus: 200,
        contentType: 'text/html; charset=utf-8',
        servedSha256: candidate.sha256,
        servedBytes: candidate.byteLength,
      }),
      runner: Object.freeze({
        path: '/runner',
        sha256: runner.sha256,
        bytes: runner.byteLength,
        assets: Object.freeze([...runner.assets.values()].map((asset) => Object.freeze({
          path: asset.route,
          sha256: asset.sha256,
          bytes: asset.byteLength,
        }))),
      }),
    });
    const health = Object.freeze({
      ok: true,
      schemaVersion: P3H1_HOST_MANIFEST_SCHEMA_VERSION,
      contractVersion: P3H1_EVIDENCE_CONTRACT_VERSION,
      stage: P3H1_STAGE,
      hostRunId,
      hostStartedAt,
      origin,
      bindHost,
      port,
      bindingFingerprint,
      candidateSha256: candidate.sha256,
      candidateBytes: candidate.byteLength,
    });
    bindingState = Object.freeze({
      origin,
      bindHost,
      port,
      runBinding,
      bindingFingerprint,
      manifest,
      manifestBytes: encodeJson(manifest),
      health,
      healthBytes: encodeJson(health),
    });
  }

  const server = http.createServer((request, response) => {
    const problem = requestTargetProblem(request.url);
    if (problem) {
      send(request, response, 400, `bad request: ${problem}\n`, {
        'content-type': 'text/plain; charset=utf-8',
      });
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      send(request, response, 405, 'method not allowed\n', {
        allow: 'GET, HEAD',
        'content-type': 'text/plain; charset=utf-8',
      });
      return;
    }

    let url;
    try {
      url = new URL(request.url, 'http://flowme-p3h1.local');
    } catch {
      send(request, response, 400, 'bad request\n', {
        'content-type': 'text/plain; charset=utf-8',
      });
      return;
    }
    if (url.search) {
      send(request, response, 400, 'query parameters are not allowed\n', {
        'content-type': 'text/plain; charset=utf-8',
      });
      return;
    }

    if (onRequest) {
      try {
        onRequest(Object.freeze({
          method: request.method,
          path: url.pathname,
          remoteAddress: request.socket.remoteAddress || '',
          userAgent: String(request.headers['user-agent'] || ''),
          receivedAt: new Date().toISOString(),
        }));
      } catch {
        // A diagnostic observer cannot change the read-only response contract.
      }
    }

    if (url.pathname === '/' || url.pathname === '/runner') {
      send(request, response, 200, runner.bytes, artifactHeaders(runner));
      return;
    }
    const asset = runner.assets.get(url.pathname);
    if (asset) {
      send(request, response, 200, asset.bytes, artifactHeaders(asset, asset.contentType));
      return;
    }
    if (url.pathname === '/candidate') {
      send(request, response, 200, candidate.bytes, artifactHeaders(candidate));
      return;
    }
    if (url.pathname === '/manifest.json') {
      if (!bindingState) {
        send(request, response, 503, 'host binding is not ready\n', {
          'content-type': 'text/plain; charset=utf-8',
        });
        return;
      }
      send(request, response, 200, bindingState.manifestBytes, {
        'content-type': 'application/json; charset=utf-8',
      });
      return;
    }
    if (url.pathname === '/health') {
      if (!bindingState) {
        send(request, response, 503, 'host binding is not ready\n', {
          'content-type': 'text/plain; charset=utf-8',
        });
        return;
      }
      send(request, response, 200, bindingState.healthBytes, {
        'content-type': 'application/json; charset=utf-8',
      });
      return;
    }
    if (url.pathname === '/favicon.ico') {
      send(request, response, 204, Buffer.alloc(0), {
        'content-type': 'image/x-icon',
      });
      return;
    }
    send(request, response, 404, 'not found\n', {
      'content-type': 'text/plain; charset=utf-8',
    });
  });

  server.on('clientError', (_error, socket) => {
    if (!socket.writable) return;
    socket.end(
      'HTTP/1.1 400 Bad Request\r\n'
      + 'Cache-Control: no-store\r\n'
      + 'X-Content-Type-Options: nosniff\r\n'
      + 'Connection: close\r\n\r\n',
    );
  });

  async function listen({
    host,
    lan = false,
    port = DEFAULT_PORT,
    networkInterfaces,
  } = {}) {
    const bindHost = resolveBindHost({ host, lan, networkInterfaces });
    const bindPort = validatePort(port, { allowZero: true });
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        const address = server.address();
        if (!address || typeof address === 'string') {
          reject(new Error('Expected an IPv4 TCP address.'));
          return;
        }
        bindEvidenceIdentity(bindHost, address.port);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(bindPort, bindHost);
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected an IPv4 TCP address.');
    return Object.freeze({
      host: bindHost,
      port: address.port,
      origin: bindingState.origin,
      hostRunId,
      hostStartedAt,
      bindingFingerprint: bindingState.bindingFingerprint,
    });
  }

  async function close() {
    if (!server.listening) return;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  return Object.freeze({
    hostRunId,
    hostStartedAt,
    get origin() {
      return bindingState?.origin ?? null;
    },
    get manifest() {
      return bindingState?.manifest ?? null;
    },
    get health() {
      return bindingState?.health ?? null;
    },
    get bindingFingerprint() {
      return bindingState?.bindingFingerprint ?? null;
    },
    candidate: Object.freeze({
      fileName: candidate.fileName,
      sha256: candidate.sha256,
      byteLength: candidate.byteLength,
    }),
    runner: Object.freeze({
      fileName: runner.fileName,
      sha256: runner.sha256,
      byteLength: runner.byteLength,
    }),
    server,
    listen,
    close,
  });
}

function takeValue(argv, index, name) {
  const argument = argv[index];
  const equalsPrefix = `${name}=`;
  if (argument.startsWith(equalsPrefix)) {
    return { value: argument.slice(equalsPrefix.length), consumed: 0 };
  }
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`${name} requires a value.`);
  return { value, consumed: 1 };
}

export function parseCliArgs(argv) {
  const options = {
    host: undefined,
    lan: false,
    port: DEFAULT_PORT,
    candidatePath: DEFAULT_CANDIDATE_PATH,
    expectedSha256: DEFAULT_EXPECTED_SHA256,
    expectedBytes: DEFAULT_EXPECTED_BYTES,
    runnerPath: DEFAULT_RUNNER_PATH,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--lan') {
      options.lan = true;
      continue;
    }
    const names = ['--host', '--port', '--candidate', '--sha256', '--bytes', '--runner'];
    const name = names.find((candidateName) => (
      argument === candidateName || argument.startsWith(`${candidateName}=`)
    ));
    if (!name) throw new Error(`Unknown argument: ${argument}`);
    const { value, consumed } = takeValue(argv, index, name);
    index += consumed;
    if (name === '--host') options.host = value;
    else if (name === '--port') options.port = validatePort(value);
    else if (name === '--candidate') options.candidatePath = path.resolve(value);
    else if (name === '--sha256') options.expectedSha256 = normalizeExpectedSha256(value);
    else if (name === '--bytes') options.expectedBytes = normalizeExpectedBytes(value);
    else if (name === '--runner') options.runnerPath = path.resolve(value);
  }
  if (options.host && options.lan) throw new Error('Use either --host or --lan, not both.');
  return options;
}

export function usage() {
  return [
    'Usage:',
    '  node scripts/personal-workspace-poc/serve-p3h1-android-device.mjs [options]',
    '',
    'Options:',
    '  --lan                 Bind the only discovered private IPv4 address.',
    '  --host <IPv4>         Bind an explicit loopback/private IPv4 address.',
    `  --port <number>       Keep one stable browser origin (default ${DEFAULT_PORT}).`,
    '  --candidate <path>    Candidate file; pinned SHA and bytes must still match.',
    '  --sha256 <hex>        Expected candidate SHA-256.',
    '  --bytes <number>      Expected candidate byte length.',
    '  --runner <path>       Runner HTML whose sibling -assets directory is served.',
    '  --help                Show this help.',
  ].join('\n');
}

export async function runCli(argv = process.argv.slice(2), dependencies = {}) {
  const options = parseCliArgs(argv);
  const stdout = dependencies.stdout ?? process.stdout;
  if (options.help) {
    stdout.write(`${usage()}\n`);
    return null;
  }
  const bindHost = resolveBindHost({
    host: options.host,
    lan: options.lan,
    networkInterfaces: dependencies.networkInterfaces ?? os.networkInterfaces(),
  });
  const host = createP3H1AndroidDeviceHost({
    ...options,
    ...(dependencies.hostRunId === undefined ? {} : { hostRunId: dependencies.hostRunId }),
    ...(dependencies.hostStartedAt === undefined
      ? {}
      : { hostStartedAt: dependencies.hostStartedAt }),
    onRequest: (entry) => {
      if (entry.method === 'GET' && ['/', '/runner', '/manifest.json', '/candidate'].includes(entry.path)) {
        stdout.write(`P3H1_DEVICE_REQUEST ${JSON.stringify(entry)}\n`);
      }
    },
  });
  const bound = await host.listen({ host: bindHost, port: options.port });
  const origin = bound.origin;
  stdout.write([
    `FlowMe ${P3H1_STAGE} Android device host ready`,
    `Host run ID: ${host.hostRunId}`,
    `Host started at: ${host.hostStartedAt}`,
    `Origin: ${origin}`,
    `Runner: ${origin}/runner`,
    `Candidate: ${origin}/candidate`,
    `Manifest: ${origin}/manifest.json`,
    `Health: ${origin}/health`,
    `SHA-256: ${host.candidate.sha256}`,
    `Bytes: ${host.candidate.byteLength}`,
    `Binding fingerprint: ${host.bindingFingerprint}`,
    'Actual-device evidence remains NOT_RUN until A1-A6 and device metadata are recorded.',
  ].join('\n') + '\n');
  return Object.freeze({ ...host, bound, origin });
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  runCli().catch((error) => {
    process.stderr.write(`P3-H1 host refused to start: ${error.message}\n`);
    process.exitCode = 1;
  });
}
