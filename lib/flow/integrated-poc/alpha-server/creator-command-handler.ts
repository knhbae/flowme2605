import { isAccountForOwner } from '../alpha-auth/account-access';
import { readAlphaAuthConfig } from '../alpha-auth/config';
import { alphaRequestOrigin } from './request-origin';
import { isAlphaCreatorCommand, type AlphaCreatorCommand } from '../alpha-creator/contract';
import { dispatchAlphaCreatorCommand } from '../alpha-creator/dispatch-source';
import { ALPHA_LIMITS, type AlphaChange, type AlphaCreatorUndoCommand, type AlphaError, type AlphaAccount, type AlphaReferenceContext } from '../alpha-persistence/contract';
import { readAlphaSocialServerContext } from './social-context';
import { alphaSocialReferences } from '../alpha-social/projection';
import { canonicalJson, parseAlphaJson } from '../alpha-persistence/json';
import { isAlphaCreatorUndo, isAlphaWireReceipt } from '../alpha-sync/wire';
import { programIdentifier, programShape } from '../program-data';
import { signAlphaCommand } from './command-handler';
import { ALPHA_CREATOR_REQUEST_BUDGET } from '../alpha-creator/request-budget';

export const ALPHA_CREATOR_COMMIT_SCHEMA = 'flowme-alpha-creator-commit/1' as const;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const failure = (reason: AlphaError, status = 200) => Response.json({ ok: false, reason }, { status, headers });
const result = (value: unknown) => Response.json(value, { headers });
async function boundedBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw Error('empty-request');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > ALPHA_LIMITS.bytes) { await reader.cancel(); throw Error('oversized-request'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return parseAlphaJson(Buffer.concat(chunks).toString('utf8'));
}
function validResult(value: unknown): value is { ok: true; value: unknown } | { ok: false; reason: AlphaError } {
  if (programShape(value, ['ok', 'reason']) && value.ok === false) return ['invalid', 'unauthenticated', 'not-found',
    'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'unavailable', 'no-change'].includes(value.reason as string);
  return programShape(value, ['ok', 'value']) && value.ok === true && (value.value === null || isAlphaWireReceipt(value.value));
}

/** Server-only semantic compiler. The browser sends intent, never a signed field patch. */
export function createAlphaCreatorCommandHandler(env: Record<string, string | undefined>, fetcher: typeof fetch = fetch) {
  const config = readAlphaAuthConfig(env), key = env.FLOWME_ALPHA_M3_SIGNING_KEY;
  return async (request: Request): Promise<Response> => {
    if (!config || !key || !/^[a-f0-9]{64}$/.test(key)) return failure('unavailable', 503);
    const url = new URL(request.url);
    if (request.method !== 'POST' || !alphaRequestOrigin(config, request)
      || url.search || !request.headers.get('content-type')?.startsWith('application/json')) return failure('invalid', 400);
    const authorization = request.headers.get('authorization');
    if (!authorization || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization)) return failure('unauthenticated', 401);
    let body: unknown;
    try { body = await boundedBody(request); } catch { return failure('invalid', 400); }
    const execute = programShape(body, ['kind', 'command']) && body.kind === 'execute'
      && (isAlphaCreatorCommand(body.command) || isAlphaCreatorUndo(body.command));
    const lookup = programShape(body, ['kind', 'requestId']) && body.kind === 'lookup'
      && programIdentifier(body.requestId) && body.requestId.length <= ALPHA_LIMITS.requestIdChars;
    if (!execute && !lookup) return failure('invalid', 400);
    const authHeaders = { apikey: config.publishableKey, Authorization: authorization, 'Content-Type': 'application/json' };
    const call = (path: string, payload?: unknown) => fetcher(`${config.url}${path}`, {
      method: payload === undefined ? 'GET' : 'POST', headers: authHeaders,
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(path === '/rest/v1/rpc/flowme_alpha_creator_execute_v1' ? ALPHA_CREATOR_REQUEST_BUDGET.upstreamMs : 15_000),
    });
    const failedUpstream = (response: Response) => failure(response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable');
    try {
      const userResponse = await call('/auth/v1/user'); if (!userResponse.ok) return failedUpstream(userResponse);
      const user: unknown = await userResponse.json();
      if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string'
        || !/^[0-9a-f-]{36}$/.test(user.id) || 'is_anonymous' in user && user.is_anonymous) return failure('unauthenticated');
      const owner = user.id;
      if (lookup) {
        const response = await call('/rest/v1/rpc/flowme_alpha_lookup_v1', { request_id: (body as { requestId: string }).requestId });
        if (!response.ok) return failedUpstream(response);
        const value: unknown = await response.json();
        return validResult(value) ? result(value) : failure('invalid');
      }
      const command = (body as { command: AlphaCreatorCommand | AlphaCreatorUndoCommand }).command;
      const response = await call('/rest/v1/flowme_alpha_accounts?select=account');
      if (!response.ok) return failedUpstream(response);
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || rows.length !== 1) return failure('invalid');
      let account:AlphaAccount=rows[0]?.account,references:AlphaReferenceContext|undefined;
      if(!account||account.ownerId!==owner)return failure('invalid');
      if(!isAccountForOwner(account,owner)){
        const social=await readAlphaSocialServerContext(call,owner,key);if(!social.ok)return failure(social.reason);
        account=social.value.account;references=alphaSocialReferences(social.value.context,owner);
      }
      let changes: AlphaChange[] = [], resultId: string | null = null;
      if (command.expectedRevision > account.revision) return failure('revision-conflict');
      if (command.kind === 'creator' && command.expectedRevision === account.revision) {
        // Dispatch validates the full account and immutable source/private boundary.
        const transition = dispatchAlphaCreatorCommand(account, command, references);
        if (!transition.ok) return failure(transition.reason === 'revision-conflict' || transition.reason === 'conflict' ? 'revision-conflict'
          : transition.reason === 'missing' ? 'not-found' : transition.reason === 'limit' ? 'limit' : 'invalid');
        if (!transition.changed) return failure('no-change');
        changes = transition.changes; resultId = transition.result;
      }
      // Stale commands carry no recomputed patch. SQL compares the original
      // intent under the row lock before CAS, returning only its first receipt.
      // Undo also carries no caller patch: its inverse comes from the SQL ledger.
      const commitText = canonicalJson({ schema: ALPHA_CREATOR_COMMIT_SCHEMA, command, changes, resultId });
      const committed = await call('/rest/v1/rpc/flowme_alpha_creator_execute_v1', {
        commit_text: commitText, proof: signAlphaCommand(owner, commitText, key),
      });
      if (!committed.ok) return failedUpstream(committed);
      const value: unknown = await committed.json();
      if (!validResult(value)) return failure('unavailable');
      if (value.ok && (!isAlphaWireReceipt(value.value) || value.value.requestId !== command.requestId
        || value.value.kind !== command.kind || value.value.revision !== command.expectedRevision + 1
        || command.kind === 'creator' && !programIdentifier(value.value.resultId))) return failure('unavailable');
      return result(value);
    } catch { return failure('unavailable'); }
  };
}
