import type { AlphaAccount, AlphaReferenceContext } from '../alpha-persistence/contract';
import { validateAlphaAccount } from '../alpha-persistence/program-adapter';
import { isAlphaAuthConfig, type AlphaAuthConfig } from './config';
import { alphaSocialReferences, readAlphaSocialResponse } from '../alpha-social/projection';

export type VerifiedAlphaSession = { accessToken: string; userId: string };
export type AlphaAccessResult = { ok: true; account: AlphaAccount | null; references?: AlphaReferenceContext } | { ok: false; reason: 'session-expired' | 'unavailable' | 'invalid' };
export interface AlphaAccountAccess { read(): Promise<AlphaAccessResult>; open(): Promise<AlphaAccessResult>; }

export function isAccountForOwner(value: unknown, ownerId: string, references?: AlphaReferenceContext): value is AlphaAccount {
  return validateAlphaAccount(value, references ?? { actorIds: [ownerId], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } }, ownerId);
}

/** Fixed token per request group: an A request can never silently borrow B's new session. RLS remains authoritative. */
export function createAlphaAccountAccess(inputConfig: AlphaAuthConfig, inputSession: VerifiedAlphaSession, request: typeof fetch = fetch): AlphaAccountAccess {
  const config = Object.freeze({ ...inputConfig }), session = Object.freeze({ ...inputSession });
  async function perform(open: boolean): Promise<AlphaAccessResult> {
    if (!isAlphaAuthConfig(config) || !session.accessToken || !session.userId) return { ok: false, reason: 'invalid' };
    const headers = { apikey: config.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' };
    try {
      const user = await request(`${config.url}/auth/v1/user`, { headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
      if (!user.ok) return { ok: false, reason: user.status === 401 || user.status === 403 ? 'session-expired' : 'unavailable' };
      const identity: unknown = await user.json();
      if (!identity || typeof identity !== 'object' || !('id' in identity) || identity.id !== session.userId || ('is_anonymous' in identity && identity.is_anonymous)) return { ok: false, reason: 'session-expired' };
      const path = open ? '/rest/v1/rpc/flowme_alpha_open_account_v1' : '/rest/v1/flowme_alpha_accounts?select=account';
      const result = await request(`${config.url}${path}`, { method: open ? 'POST' : 'GET', headers, ...(open ? { body: '{}' } : {}), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
      if (!result.ok) return { ok: false, reason: result.status === 401 || result.status === 403 ? 'session-expired' : 'unavailable' };
      const value: unknown = await result.json();
      if (!open && Array.isArray(value) && value.length === 0) return { ok: true, account: null };
      const account = open ? value : Array.isArray(value) && value.length === 1 ? value[0]?.account : undefined;
      if (isAccountForOwner(account, session.userId)) return { ok: true, account };
      // Public references are validated against the server's owner-filtered graph,
      // never synthesized from a malformed private payload or another account.
      const contextResponse = await request(`${config.url}/rest/v1/rpc/flowme_alpha_social_read_v1`, {
        method: 'POST', headers, body: '{}', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
      });
      if (!contextResponse.ok) return { ok: false, reason: contextResponse.status === 401 || contextResponse.status === 403 ? 'session-expired' : 'invalid' };
      const social = readAlphaSocialResponse(await contextResponse.json(), session.userId);
      return social ? { ok: true, account: social.account, references: alphaSocialReferences(social.context, session.userId) } : { ok: false, reason: 'invalid' };
    } catch { return { ok: false, reason: 'unavailable' }; }
  }
  return { read: () => perform(false), open: () => perform(true) };
}

export type AlphaSessionView = { ownerId: string | null; account: AlphaAccount | null; status: 'signed-out' | 'checking' | 'new-account' | 'ready' | 'session-expired' | 'unavailable' | 'invalid' };
/** No shared response cache, drafts, or subscriptions survive a session-generation change. */
export function createAlphaSessionBoundary(onChange: (state: AlphaSessionView) => void = () => {}) {
  let generation = 0, access: AlphaAccountAccess | null = null;
  let state: AlphaSessionView = { ownerId: null, account: null, status: 'signed-out' };
  const emit = () => onChange(structuredClone(state));
  function bind(ownerId: string | null, nextAccess: AlphaAccountAccess | null) {
    generation++; access = ownerId ? nextAccess : null;
    state = { ownerId, account: null, status: ownerId && nextAccess ? 'checking' : 'signed-out' }; emit();
  }
  async function load(open = false) {
    const current = ++generation, ownerId = state.ownerId, currentAccess = access;
    if (!ownerId || !currentAccess) return false;
    state = { ownerId, account: null, status: 'checking' }; emit();
    let result: AlphaAccessResult;
    try { result = await (open ? currentAccess.open() : currentAccess.read()); } catch { result = { ok: false, reason: 'unavailable' }; }
    if (generation !== current) return false;
    if (result.ok && result.account && !isAccountForOwner(result.account, ownerId, result.references)) result = { ok: false, reason: 'invalid' };
    state = result.ok ? { ownerId, account: result.account, status: result.account ? 'ready' : 'new-account' } : { ownerId, account: null, status: result.reason };
    emit(); return result.ok;
  }
  return { bind, load, snapshot: () => structuredClone(state) };
}
