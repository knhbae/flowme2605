import { signAlphaCommand } from './command-proof';
import { alphaCapacityMode, executeAlphaCapacityCommand } from './capacity-adapter';
export { signAlphaCommand } from './command-proof';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { readAlphaAuthConfig } from '../alpha-auth/config';
import { alphaRequestOrigin } from './request-origin';
import { ALPHA_LIMITS, type AlphaAccount, type AlphaReferenceContext, type AlphaPrivateCommand as AlphaCommand, type AlphaError } from '../alpha-persistence/contract';
import { readAlphaSocialServerContext } from './social-context';
import { alphaSocialReferences } from '../alpha-social/projection';
import { ALPHA_M3_FIELDS, isM3Command } from '../alpha-sync/contract';
import { canonicalJson, detached, parseAlphaJson } from '../alpha-persistence/json';
import { programIdentifier, programShape } from '../program-data';
import { preservesAlphaPrivateSources } from './private-boundary';
import { isAlphaWireReceipt } from '../alpha-sync/wire';

// A server-only module. The browser never receives the signing key or a signed command.
export const ALPHA_SERVER_FIELDS = ALPHA_M3_FIELDS;
const failure = (reason: AlphaError, status = 200) => Response.json({ ok: false, reason }, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
function result(value: unknown) {
  return Response.json(value, { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function validServerCommand(value: unknown): value is AlphaCommand {
  return isM3Command(value);
}
/** Bounded streaming read: Content-Length alone is not an input-size guarantee. */
async function requestBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw Error('empty-request');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > ALPHA_LIMITS.bytes) { await reader.cancel(); throw Error('oversized-request'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return parseAlphaJson(Buffer.concat(chunks).toString('utf8'));
}
function validReceiptResult(value: unknown): boolean {
  if (!value || typeof value !== 'object' || !('ok' in value)) return false;
  if (value.ok === false) return 'reason' in value && programShape(value, ['ok', 'reason'])
    && ['invalid', 'unauthenticated', 'not-found', 'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'unavailable', 'no-change'].includes(value.reason as string);
  if (!programShape(value, ['ok', 'value']) || !('value' in value) || value.ok !== true) return false;
  const receipt = value.value;
  return receipt === null || isAlphaWireReceipt(receipt);
}

/** Validate the exact M1 domain on the server; DB CAS binds this validation to its revision. */
export function createAlphaCommandHandler(env: Record<string, string | undefined>, fetcher: typeof fetch = fetch) {
  const config = readAlphaAuthConfig(env), key = env.FLOWME_ALPHA_M3_SIGNING_KEY, capacityMode = alphaCapacityMode(env);
  return async (request: Request): Promise<Response> => {
    if (!config || !key || !/^[a-f0-9]{64}$/.test(key) || capacityMode === null) return failure('unavailable', 503);
    const requestUrl = new URL(request.url), publicOrigin = alphaRequestOrigin(config, request);
    if (request.method !== 'POST' || !publicOrigin || requestUrl.search
      || !request.headers.get('content-type')?.startsWith('application/json')) return failure('invalid', 400);
    const authorization = request.headers.get('authorization');
    if (!authorization || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization)) return failure('unauthenticated', 401);
    let body: unknown;
    try { body = await requestBody(request); } catch { return failure('invalid', 400); }
    const execute = programShape(body, ['kind', 'command']) && body.kind === 'execute' && validServerCommand(body.command);
    const lookup = programShape(body, ['kind', 'requestId']) && body.kind === 'lookup'
      && programIdentifier(body.requestId) && body.requestId.length <= ALPHA_LIMITS.requestIdChars;
    if (!execute && !lookup) return failure('invalid', 400);
    const headers = { apikey: config.publishableKey, Authorization: authorization, 'Content-Type': 'application/json' };
    const call = (path: string, payload?: unknown) => fetcher(`${config.url}${path}`, {
      method: payload === undefined ? 'GET' : 'POST', headers, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
    });
    try {
      const userResult = await call('/auth/v1/user');
      if (!userResult.ok) return failure(userResult.status === 401 || userResult.status === 403 ? 'unauthenticated' : 'unavailable');
      const user: unknown = await userResult.json();
      if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string'
        || !/^[0-9a-f-]{36}$/.test(user.id) || 'is_anonymous' in user && user.is_anonymous) return failure('unauthenticated');
      const owner = user.id;
      if (lookup) {
        const response = await call('/rest/v1/rpc/flowme_alpha_lookup_v1', { request_id: (body as { requestId: string }).requestId });
        if (!response.ok) return failure(response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable');
        const value: unknown = await response.json();
        return validReceiptResult(value) ? result(value) : failure('invalid');
      }
      const command = (body as { command: AlphaCommand }).command;
      const response = await call('/rest/v1/flowme_alpha_accounts?select=account');
      if (!response.ok) return failure(response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable');
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || rows.length !== 1) return failure('invalid');
      let account: AlphaAccount = rows[0]?.account, references:AlphaReferenceContext|undefined;
      if(!account||account.ownerId!==owner)return failure('invalid');
      if(!isAccountForOwner(account,owner)){
        const social=await readAlphaSocialServerContext(call,owner,key);if(!social.ok)return failure(social.reason);
        account=social.value.account;references=alphaSocialReferences(social.value.context,owner);
      }
      // Old requests can only replay an existing receipt; they cannot mutate a newer revision.
      if (account.revision === command.expectedRevision && command.kind === 'change-private') {
        const next = detached(account);
        for (const change of command.changes) {
          if (change.present) Object.defineProperty(next.space, change.field, { value: detached(change.value), enumerable: true, configurable: true, writable: true });
          else delete next.space[change.field];
        }
        if (!isAccountForOwner(next, owner, references)) return failure('invalid');
        if (!preservesAlphaPrivateSources(account, next, references)) return failure('invalid');
        if (canonicalJson(account.space) === canonicalJson(next.space)) return failure('no-change');
      } else if (command.expectedRevision > account.revision) return failure('revision-conflict');
      if (capacityMode === 'checkpoint-v1') return result(await executeAlphaCapacityCommand({
        owner, command, origin: publicOrigin, authorization, key, env, fetcher, call,
      }));
      const text = canonicalJson(command);
      const committed = await call('/rest/v1/rpc/flowme_alpha_execute_v1', { command_text: text, proof: signAlphaCommand(owner, text, key) });
      if (!committed.ok) return failure(committed.status === 401 || committed.status === 403 ? 'unauthenticated' : 'unavailable');
      const value: unknown = await committed.json();
      return validReceiptResult(value) ? result(value) : failure('unavailable');
    } catch { return failure('unavailable'); }
  };
}
