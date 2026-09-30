import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { POST } from './route';

test('backup jobs endpoint is permanently unavailable without reading settings or request data', async () => {
  const response = POST();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, reason: 'unavailable' });
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('vary'), 'Authorization');
  const source = readFileSync('app/api/alpha/backup-jobs/route.ts', 'utf8');
  assert.doesNotMatch(source, /\bimport\b|process\.env|\bfetch\s*\(|\bRequest\b/);
});
