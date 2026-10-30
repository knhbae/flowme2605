import { createAlphaAccountAccess, type VerifiedAlphaSession } from '../alpha-auth/account-access';
import { isAlphaAuthConfig, type AlphaAuthConfig } from '../alpha-auth/config';
import type { AlphaReceipt, AlphaRepository, AlphaResult, AlphaError, AlphaReferenceContext } from '../alpha-persistence/contract';
import { alphaSocialReferences, readAlphaSocialResponse } from '../alpha-social/projection';
import { programIdentifier, programShape } from '../program-data';
import { detached } from '../alpha-persistence/json';
import { isM3Command } from './contract';
import { isAlphaWireCommand, isAlphaWireReceipt } from './wire';
import { ALPHA_CREATOR_REQUEST_BUDGET } from '../alpha-creator/request-budget';
const errors: AlphaError[] = ['invalid', 'unauthenticated', 'not-found', 'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'unavailable', 'no-change', 'rate-limited', 'limit'];
/** Immutable session token: requests started as A never borrow a later B token. */
export function createAlphaHttpRepository(input: AlphaAuthConfig, identity: VerifiedAlphaSession, request: typeof fetch = fetch, options: { social?: boolean } = {}): AlphaRepository {
  const config = Object.freeze({ ...input }), session = Object.freeze({ ...identity });
  const readPort = createAlphaAccountAccess(config, session, request);
  let references: AlphaReferenceContext | null = null, socialOpened = false;
  async function rpc(body: unknown, nullable: boolean, endpoint = '/api/alpha/account'): Promise<AlphaResult<AlphaReceipt | null>> {
    if (!isAlphaAuthConfig(config) || !session.accessToken || !programIdentifier(session.userId)) return { ok: false, reason: 'invalid' };
    const headers = { apikey: config.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' };
    try {
      const auth = await request(`${config.url}/auth/v1/user`, { headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!auth.ok) return { ok: false, reason: auth.status === 401 || auth.status === 403 ? 'unauthenticated' : 'unavailable' };
      const user = await auth.json();
      if (!user || user.id !== session.userId || user.is_anonymous) return { ok: false, reason: 'unauthenticated' };
      const response = await request(endpoint, { method: 'POST', headers: { Authorization: headers.Authorization, 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(endpoint === '/api/alpha/creator' ? ALPHA_CREATOR_REQUEST_BUDGET.browserMs : 15000) });
      const result: unknown = await response.json();
      if (programShape(result, ['ok', 'reason']) && result.ok === false && errors.includes(result.reason as AlphaError)) return result as AlphaResult<never>;
      if (!response.ok) return { ok: false, reason: response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable' };
      if (programShape(result, ['ok', 'value']) && result.ok === true && (isAlphaWireReceipt(result.value) || nullable && result.value === null)) return detached(result) as AlphaResult<AlphaReceipt | null>;
      return { ok: false, reason: 'unavailable' }; // Unknown post-dispatch outcome must retain request identity.
    } catch { return { ok: false, reason: 'unavailable' }; }
  }
  return {
    references: () => detached(references),
    async read() {
      if (options.social) {
        if (!isAlphaAuthConfig(config) || !session.accessToken || !programIdentifier(session.userId)) return { ok: false, reason: 'invalid' };
        const headers = { apikey: config.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' };
        const call = (name: string) => request(`${config.url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: '{}', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
        try {
          if (!socialOpened) {
            const opened = await call('flowme_alpha_social_open_v1');
            const value = await opened.json();
            if (!opened.ok || !programShape(value, ['ok', 'value']) || value.ok !== true) return { ok: false, reason: opened.status === 401 || opened.status === 403 ? 'unauthenticated' : 'unavailable' };
            socialOpened = true;
          }
          const response = await call('flowme_alpha_social_read_v1'), value: unknown = await response.json();
          if (programShape(value, ['ok', 'reason']) && value.ok === false && errors.includes(value.reason as AlphaError)) return value as AlphaResult<never>;
          if (!response.ok) return { ok: false, reason: response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable' };
          const result = readAlphaSocialResponse(value, session.userId);
          if (!result) return { ok: false, reason: 'invalid' };
          references = alphaSocialReferences(result.context, session.userId);
          return { ok: true, value: result.account };
        } catch { return { ok: false, reason: 'unavailable' }; }
      }
      const result = await readPort.read();
      if (result.ok) references = result.references ?? null;
      return result.ok ? result.account ? { ok: true, value: result.account } : { ok: false, reason: 'not-found' }
        : { ok: false, reason: result.reason === 'session-expired' ? 'unauthenticated' : result.reason === 'invalid' ? 'invalid' : 'unavailable' };
    },
    async execute(command) {
      if (!isAlphaWireCommand(command)) return { ok: false, reason: 'invalid' };
      return await rpc({ kind: 'execute', command: detached(command) }, false, isM3Command(command) ? '/api/alpha/account'
        : command.kind === 'social' || command.kind === 'undo-social' ? '/api/alpha/social' : '/api/alpha/creator') as AlphaResult<AlphaReceipt>;
    },
    async lookup(requestId) { return programIdentifier(requestId) && requestId.length <= 160 ? rpc({ kind: 'lookup', requestId }, true) : { ok: false, reason: 'invalid' }; },
  };
}
