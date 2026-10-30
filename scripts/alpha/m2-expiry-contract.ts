/** Timing evidence only. Decoding a JWT never authorizes an operation. */
export const EXPIRY_GRACE_MS = 90_000;
export const MAX_EXPIRY_WAIT_MS = 2 * 60 * 60_000;

export function expiryTiming(token: string, nowMs: number) {
  const parts = token.split('.');
  if (parts.length !== 3 || !Number.isFinite(nowMs)) throw Error('invalid-token-timing');
  let value: unknown;
  try { value = JSON.parse(Buffer.from(parts[1], 'base64url').toString()); } catch { throw Error('invalid-token-timing'); }
  if (!value || typeof value !== 'object' || !('exp' in value) || !('iat' in value)
    || !Number.isSafeInteger(value.exp) || !Number.isSafeInteger(value.iat)) throw Error('invalid-token-timing');
  const expiresMs = Number(value.exp) * 1000, issuedMs = Number(value.iat) * 1000;
  const checkAtMs = expiresMs + EXPIRY_GRACE_MS, remainingMs = checkAtMs - nowMs;
  if (issuedMs > nowMs + 60_000 || expiresMs <= nowMs || expiresMs <= issuedMs
    || remainingMs > MAX_EXPIRY_WAIT_MS || !Number.isSafeInteger(checkAtMs)) throw Error('unsafe-token-timing');
  return { issuedMs, expiresMs, checkAtMs, remainingMs };
}

/** Record token-expiry evidence, not any arbitrary 4xx/5xx rejection. */
export function isExpiredJwtResponse(status: number, body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const value = body as Record<string, unknown>;
  const text = [value.code, value.error_code, value.message, value.msg, value.error].filter(v => typeof v === 'string').join(' ').toLowerCase();
  return [400, 401, 403].includes(status) && (text.includes('jwt expired') || text.includes('token is expired')
    || text.includes('token has expired') || text.includes('jwt has expired')
    // Hosted Storage uses jose's explicit exp-claim failure rather than the
    // older "jwt expired" wording. InvalidJWT alone is still insufficient.
    || value.message === '"exp" claim timestamp check failed');
}

/** Preserve only non-sensitive error identifiers and an allowlisted reason. */
export function expiryErrorSummary(body: unknown) {
  const value = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const rawCode = [value.code, value.error_code, value.error].find(v => typeof v === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(v));
  return { code: typeof rawCode === 'string' ? rawCode : null,
    reason: value.message === '"exp" claim timestamp check failed' ? 'exp-claim-timestamp-failed'
      : isExpiredJwtResponse(401, body) ? 'explicit-token-expired' : 'unclassified' };
}
