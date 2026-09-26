import type { VerifiedAlphaSession } from './account-access';
import { isAlphaAuthConfig, type AlphaAuthConfig } from './config';

export type AlphaPasswordResult = { ok: true } | { ok: false; reason: 'context-changed' | 'auth-error'; code?: string };

/** Never borrow a new account's token or write a stale session back to SDK storage. */
export async function updateAlphaRecoveryPassword(inputConfig: AlphaAuthConfig, inputSession: VerifiedAlphaSession,
  password: string, isCurrent: () => boolean, request: typeof fetch = fetch): Promise<AlphaPasswordResult> {
  const config = Object.freeze({ ...inputConfig }), session = Object.freeze({ ...inputSession });
  const current = () => { try { return isCurrent(); } catch { return false; } };
  const changed = (): AlphaPasswordResult => ({ ok: false, reason: 'context-changed' });
  if (!current()) return changed();
  if (!isAlphaAuthConfig(config) || !session.userId || !session.accessToken || password.length < 8) return { ok: false, reason: 'auth-error' };
  const headers = { apikey: config.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' };
  const readError = (value: unknown) => {
    if (!value || typeof value !== 'object') return undefined;
    const error = value as Record<string, unknown>;
    return typeof error.code === 'string' ? error.code : typeof error.error_code === 'string' ? error.error_code : undefined;
  };
  try {
    const identity = await request(`${config.url}/auth/v1/user`, { headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
    const user: unknown = await identity.json();
    if (!current()) return changed();
    if (!identity.ok) return { ok: false, reason: 'auth-error', code: readError(user) };
    if (!user || typeof user !== 'object' || !('id' in user) || user.id !== session.userId || ('is_anonymous' in user && user.is_anonymous)) return changed();
    // The same captured token is used even if another tab changes storage during
    // the request. The server, not a local user.id claim, authorizes this update.
    const response = await request(`${config.url}/auth/v1/user`, { method: 'PUT', headers, body: JSON.stringify({ password }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
    const result: unknown = await response.json();
    if (!current()) return changed();
    if (!response.ok) return { ok: false, reason: 'auth-error', code: readError(result) };
    return result && typeof result === 'object' && 'id' in result && result.id === session.userId
      ? { ok: true } : { ok: false, reason: 'auth-error' };
  } catch { return current() ? { ok: false, reason: 'auth-error' } : changed(); }
}
