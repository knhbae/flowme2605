import test from 'node:test';
import assert from 'node:assert/strict';
import { expiryTiming, isExpiredJwtResponse, expiryErrorSummary, EXPIRY_GRACE_MS, MAX_EXPIRY_WAIT_MS } from './m2-expiry-contract';

const now = 1_800_000_000_000;
const token = (claims: unknown) => `fixture.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.not-signed`;
test('expiry timing uses original exp with a fixed server clock-skew margin', () => {
  const result = expiryTiming(token({ iat: now / 1000, exp: now / 1000 + 3600 }), now);
  assert.equal(result.expiresMs, now + 3_600_000);
  assert.equal(result.checkAtMs, result.expiresMs + EXPIRY_GRACE_MS);
  assert.equal(result.remainingMs, 3_600_000 + EXPIRY_GRACE_MS);
});
test('expiry runner rejects malformed, already-expired, future-issued and unbounded tokens', () => {
  for (const claims of [null, {}, { iat: now / 1000, exp: 'later' }, { iat: 1, exp: now / 1000 },
    { iat: now / 1000 + 120, exp: now / 1000 + 3600 }, { iat: now / 1000, exp: now / 1000 + MAX_EXPIRY_WAIT_MS / 1000 },
    { iat: now / 1000, exp: Number.MAX_SAFE_INTEGER }, { iat: now / 1000, exp: now / 1000 + 1.5 }]) {
    assert.throws(() => expiryTiming(token(claims), now));
  }
  assert.throws(() => expiryTiming('malformed', now));
  assert.throws(() => expiryTiming('bad.not-json.bad', now));
  assert.throws(() => expiryTiming(token({ iat: 1, exp: 2 }), NaN));
});
test('only explicit expiry failures count, not revoked, wrong signature, policy or network errors', () => {
  for (const [status, value] of [[401, { code: 'bad_jwt', msg: 'invalid JWT: token is expired' }],
    [401, { code: 'PGRST303', message: 'JWT expired' }], [400, { error: 'InvalidJWT', message: 'jwt has expired' }],
    [400, { error: 'InvalidJWT', message: '"exp" claim timestamp check failed' }]] as const) {
    assert(isExpiredJwtResponse(status, value));
  }
  for (const [status, value] of [[200, { message: 'JWT expired' }], [500, { message: 'JWT expired' }],
    [401, { msg: 'invalid signature' }], [403, { code: 'session_not_found' }], [401, { error: 'permission denied' }],
    [401, null], [400, { error: 'not found' }], [400, { error: 'InvalidJWT', message: 'invalid signature' }],
    [400, { message: '"iat" claim timestamp check failed' }], [400, { message: '"nbf" claim timestamp check failed' }],
    [400, { error: 'InvalidJWT' }], [500, { message: '"exp" claim timestamp check failed' }]] as const) assert(!isExpiredJwtResponse(status, value));
});

test('expiry failure evidence keeps only allowlisted error facts, never raw tokens or personal data', () => {
  assert.deepEqual(expiryErrorSummary({ error: 'InvalidJWT', message: '"exp" claim timestamp check failed', token: 'do-not-record' }),
    { code: 'InvalidJWT', reason: 'exp-claim-timestamp-failed' });
  assert.deepEqual(expiryErrorSummary({ code: 'PGRST303', message: 'JWT expired' }), { code: 'PGRST303', reason: 'explicit-token-expired' });
  assert.deepEqual(expiryErrorSummary({ code: 'Bearer fixture.with.secret', message: 'user@example.invalid and private content' }),
    { code: null, reason: 'unclassified' });
  assert.deepEqual(expiryErrorSummary(null), { code: null, reason: 'unclassified' });
});
