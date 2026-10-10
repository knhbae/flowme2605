import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';

const origin = 'https://flowme-render-proxy-fixture.onrender.com';
const osKeys = new Set(['PATH', 'SYSTEMROOT', 'TEMP', 'TMP', 'TMPDIR', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA']);
const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => osKeys.has(key.toUpperCase())));
const fixtureEnv = {
  ...osEnv, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
  FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'preview',
  FLOWME_ALPHA_HOSTING: 'render-trial-v1', FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co',
  FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_render_proxy_fixture',
  FLOWME_ALPHA_REDIRECT_URL: `${origin}/auth/callback`,
  FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1', FLOWME_ALPHA_M3_SIGNING_KEY: 'a'.repeat(64),
};

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

function send(port, method, path, headers = {}, body = '') {
  return new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: '127.0.0.1', port, method, path, headers: {
      ...headers, ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
    } }, response => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('error', reject);
    request.end(body);
  });
}

const port = await availablePort();
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  cwd: process.cwd(), env: fixtureEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '', exited = false;
child.once('exit', () => { exited = true; });
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', chunk => { output = (output + chunk.toString()).slice(-8_192); });
}
try {
  let health;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (exited) throw Error(`Next server exited before readiness: ${output}`);
    try { health = await send(port, 'GET', '/api/alpha/health'); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 200)); }
  }
  assert.equal(health, 200, `Render fixture health was not ready: ${output}`);
  const headers = { Host: new URL(origin).host, 'X-Forwarded-Host': new URL(origin).host,
    'X-Forwarded-Proto': 'https', Origin: origin, Authorization: 'Bearer short',
    'Content-Type': 'application/json' };
  const path = '/api/alpha/account';
  const accepted = await send(port, 'POST', path, headers, '{}');
  const wrongOrigin = await send(port, 'POST', path, { ...headers, Origin: 'https://other.onrender.com' }, '{}');
  const wrongProtocol = await send(port, 'POST', path, { ...headers, 'X-Forwarded-Proto': 'http' }, '{}');
  assert.equal(accepted, 401, 'The exact HTTPS origin must reach authorization, without calling Supabase');
  assert.equal(wrongOrigin, 400, 'A different browser Origin must be rejected before authorization');
  assert.equal(wrongProtocol, 400, 'An HTTP forwarded origin must be rejected before authorization');
  process.stdout.write(`${JSON.stringify({ health, accepted, wrongOrigin, wrongProtocol })}\n`);
} finally {
  if (!exited) {
    const stopped = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM');
    await Promise.race([stopped, new Promise(resolve => setTimeout(resolve, 3_000))]);
    if (!exited) child.kill('SIGKILL');
  }
}
