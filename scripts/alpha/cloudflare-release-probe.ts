/** No credentials/cookies. Protected endpoints must reject before account access. */
import assert from 'node:assert/strict';
const origin = 'https://alpha.wikiplans.com';
const checks: { path: string; method: string; status: number }[] = [
  { path: '/api/alpha/health', method: 'GET', status: 200 },
  { path: '/alpha', method: 'GET', status: 200 },
  { path: '/auth/callback', method: 'GET', status: 200 },
  ...['account', 'creator', 'social', 'preservation'].map(route => ({ path: `/api/alpha/${route}`, method: 'POST', status: 401 })),
  ...['catalog', 'media'].map(route => ({ path: `/api/alpha/${route}`, method: 'GET', status: 401 })),
  { path: '/api/alpha/backup-jobs', method: 'POST', status: 503 },
];
async function main() {
  const rows = [];
  for (const check of checks) {
    const response = await fetch(`${origin}${check.path}`, { method: check.method, redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(20_000), headers: { Origin: origin, 'Content-Type': 'application/json' },
      ...(check.method === 'POST' ? { body: '{}' } : {}) });
    const body = await response.text();
    assert.equal(response.status, check.status, check.path);
    if (check.path === '/api/alpha/health') {
      assert.equal(body, ''); assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    if (check.path === '/alpha' || check.path === '/auth/callback') {
      assert.match(body, /FlowMe/); assert(!body.includes('개발계 연결이 꺼져 있습니다'));
    }
    if (check.path === '/api/alpha/backup-jobs') assert.deepEqual(JSON.parse(body), { ok: false, reason: 'unavailable' });
    rows.push({ ...check, actual: response.status, bytes: Buffer.byteLength(body), passed: true });
  }
  process.stdout.write(`${JSON.stringify({ evidence: 'External HTTPS, no credentials/cookies or account mutation',
    passed: rows.length, failed: 0, checks: rows }, null, 2)}\n`);
}
main().catch(() => { process.stderr.write('release-external-probe-failed\n'); process.exitCode = 1; });
