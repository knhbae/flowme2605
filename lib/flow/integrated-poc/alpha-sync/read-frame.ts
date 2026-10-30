import type { AlphaError, AlphaReadTokens } from '../alpha-persistence/contract';
import { programShape } from '../program-data';

/** Egress probe wire (supabase/migrations/20261030210000_flowme_alpha_read_probe_v2.sql, not applied).
 *  The full v2 read returns the same account/context as social_read_v1 plus two tokens made in the same
 *  server snapshot; the probe returns the tokens only. Tokens are compared as strings, never parsed. */
export const ALPHA_READ_FULL_RPC = 'flowme_alpha_read_full_v2';
export const ALPHA_READ_PROBE_RPC = 'flowme_alpha_read_probe_v2';
const PRIVATE_TOKEN = /^account-sha256-v2:[0-9a-f]{64}$/;
const PUBLIC_TOKEN = /^authorized-context-sha256-v2:[0-9a-f]{64}$/;

function tokensOf(value: unknown): AlphaReadTokens | null {
  if (!programShape(value, ['privateToken', 'publicToken'])) return null;
  const { privateToken, publicToken } = value as Record<string, unknown>;
  return typeof privateToken === 'string' && PRIVATE_TOKEN.test(privateToken) && typeof publicToken === 'string' && PUBLIC_TOKEN.test(publicToken)
    ? { privateToken, publicToken } : null;
}
/** `{ok:true,value:{schema:'flowme-alpha-read-frame/2',tokens,snapshot:{account,context}}}` → tokens and a
 *  v1-shaped `{account,context}` for the existing social decoder, or null. */
export function readAlphaReadFrame(value: unknown): { tokens: AlphaReadTokens; snapshot: { account: unknown; context: unknown } } | null {
  if (!programShape(value, ['ok', 'value']) || (value as { ok: unknown }).ok !== true) return null;
  const frame = (value as { value: unknown }).value;
  if (!programShape(frame, ['schema', 'tokens', 'snapshot']) || (frame as { schema: unknown }).schema !== 'flowme-alpha-read-frame/2') return null;
  const tokens = tokensOf((frame as { tokens: unknown }).tokens), snapshot = (frame as { snapshot: unknown }).snapshot;
  if (!tokens || !programShape(snapshot, ['account', 'context'])) return null;
  const { account, context } = snapshot as { account: unknown; context: unknown };
  return { tokens, snapshot: { account, context } };
}
/** `{ok:true,value:{schema:'flowme-alpha-read-probe/2',tokens}}` → tokens, or null. */
export function readAlphaReadProbe(value: unknown): AlphaReadTokens | null {
  if (!programShape(value, ['ok', 'value']) || (value as { ok: unknown }).ok !== true) return null;
  const probe = (value as { value: unknown }).value;
  return programShape(probe, ['schema', 'tokens']) && (probe as { schema: unknown }).schema === 'flowme-alpha-read-probe/2'
    ? tokensOf((probe as { tokens: unknown }).tokens) : null;
}
/** Only "this RPC does not exist" (PostgREST PGRST202) lets the client fall back to the v1 full read.
 *  Authentication, permission and data failures never do. */
export function isMissingReadRpc(status: number, body: unknown): boolean {
  return status === 404 && !!body && typeof body === 'object' && !Array.isArray(body) && (body as { code?: unknown }).code === 'PGRST202';
}
/** The v2 functions' own failures, mapped onto the existing client errors. */
export function alphaReadFailure(body: unknown): AlphaError | null {
  if (!programShape(body, ['ok', 'reason']) || (body as { ok: unknown }).ok !== false) return null;
  const reason = (body as { reason: unknown }).reason;
  return reason === 'unauthenticated' || reason === 'forbidden' ? 'unauthenticated' : reason === 'not-found' ? 'not-found'
    : reason === 'invalid-state' || reason === 'invalid' ? 'invalid' : 'unavailable';
}
