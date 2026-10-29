import {preservesPersonalAuthoring} from '../personal-authoring-boundary';
import {ALPHA_REA_WRITING_PROFILE,isWritingSubmission,prepareWritingSubmission} from '../alpha-persistence/rea-writing-edit';
import {ALPHA_REA_TEXT_EDIT_PROFILE,isAlphaReaEditAccount,isAlphaReaTextEditCommand,preservesAlphaReaTextEdit} from '../alpha-persistence/rea-text-edit';
import {ALPHA_REA_PROGRESS_EDIT_PROFILE,isAlphaReaProgressSubmission,prepareAlphaReaProgressSubmission} from '../alpha-persistence/rea-progress-edit';
import {ALPHA_ORDERED_BODY_PROFILE,isAlphaOrderedEditAccount,isAlphaOrderedBodyCommand,prepareOrderedBodyEdit} from '../alpha-persistence/ordered-text-edit';
import {alphaReaOwnerReferences} from '../alpha-persistence/rea-text-edit';
import {ALPHA_MEMO_BODY_PROFILE,isMemoAccount,inspectMemoCohort,prepareMemoBodyEdit} from '../alpha-persistence/memo-cohort';
import {alphaWritingDocuments} from '../alpha-sync/app-writing-documents';
import { signAlphaCommand } from './command-proof';
import { alphaCapacityMode, executeAlphaCapacityCommand } from './capacity-adapter';
export { signAlphaCommand } from './command-proof';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { readAlphaAuthConfig } from '../alpha-auth/config';
import { alphaRequestOrigin } from './request-origin';
import { ALPHA_LIMITS, type AlphaAccount, type AlphaSpace, type AlphaReferenceContext, type AlphaPrivateCommand as AlphaCommand, type AlphaError } from '../alpha-persistence/contract';
import { readAlphaSocialServerContext } from './social-context';
import { alphaSocialReferences } from '../alpha-social/projection';
import { ALPHA_M3_FIELDS, isM3Command } from '../alpha-sync/contract';
import { canonicalJson, detached, parseAlphaJson } from '../alpha-persistence/json';
import { programIdentifier, programShape } from '../program-data';
import { preservesAlphaPrivateExecutionHolds, preservesAlphaPrivateSources } from './private-boundary';
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
export {requestBody as readAlphaWritingRequestBody};
function validReceiptResult(value: unknown): boolean {
  if (!value || typeof value !== 'object' || !('ok' in value)) return false;
  if (value.ok === false) return 'reason' in value && programShape(value, ['ok', 'reason'])
    && ['invalid', 'unauthenticated', 'not-found', 'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'unavailable', 'no-change'].includes(value.reason as string);
  if (!programShape(value, ['ok', 'value']) || !('value' in value) || value.ok !== true) return false;
  const receipt = value.value;
  return receipt === null || isAlphaWireReceipt(receipt);
}

/** Server construction capability only; never recovered from a request/receipt. */
export type AlphaWritingDocumentScope={ownerId:string;documentId:string};
function preservesDocumentBoundary(before:unknown,after:unknown,scope:Readonly<AlphaWritingDocumentScope>):boolean {
  if(!isAlphaReaEditAccount(before,scope.ownerId)||!isAlphaReaEditAccount(after,scope.ownerId)
    ||!Object.hasOwn(before.space.text.documents,scope.documentId)||!Object.hasOwn(after.space.text.documents,scope.documentId))return false;
  const prior=before.space.text,next=after.space.text;
  for(const[id,document]of Object.entries(prior.documents)){
    if(id===scope.documentId)continue;
    if(canonicalJson(document)!==canonicalJson(next.documents[id]))return false;
    // Entities are global: a target occurrence cannot rename/update a task or
    // schedule also referenced by a different document.
    for(const block of Object.values(document.blocks)){
      if(block.kind==='task'&&canonicalJson(prior.tasks[block.entityId!])!==canonicalJson(next.tasks[block.entityId!]))return false;
      if(block.kind==='schedule'&&canonicalJson(prior.schedules[block.entityId!])!==canonicalJson(next.schedules[block.entityId!]))return false;
    }
  }
  return true;
}
function preservesMemoDocumentBoundary(before:unknown,after:unknown,scope:Readonly<AlphaWritingDocumentScope>):boolean{
 const a=inspectMemoCohort(before,scope.ownerId,alphaReaOwnerReferences(scope.ownerId)),b=inspectMemoCohort(after,scope.ownerId,alphaReaOwnerReferences(scope.ownerId));
 if(!a.ok||!b.ok||!alphaWritingDocuments(a.projected.space).some(d=>d.id===scope.documentId))return false;
 return Object.entries(a.projected.space.text.documents).every(([id,doc])=>id===scope.documentId||canonicalJson(doc)===canonicalJson(b.projected.space.text.documents[id]));
}

/** Validate the exact M1 domain on the server; DB CAS binds this validation to its revision. */
export function createAlphaCommandHandler(env: Record<string, string | undefined>, fetcher: typeof fetch = fetch, options:{textProfile?:typeof ALPHA_REA_TEXT_EDIT_PROFILE|typeof ALPHA_REA_PROGRESS_EDIT_PROFILE|typeof ALPHA_REA_WRITING_PROFILE|typeof ALPHA_ORDERED_BODY_PROFILE|typeof ALPHA_MEMO_BODY_PROFILE;documentScope?:AlphaWritingDocumentScope;memoDocumentScope?:AlphaWritingDocumentScope}={}) {
  const config = readAlphaAuthConfig(env), key = env.FLOWME_ALPHA_M3_SIGNING_KEY, capacityMode = alphaCapacityMode(env);
  const optionsValid=!!options&&typeof options==='object'&&!Array.isArray(options)&&Object.keys(options).every(k=>k==='textProfile'||k==='documentScope'||k==='memoDocumentScope');
  const profile=optionsValid?options.textProfile:undefined,scopeValue=optionsValid?options.documentScope:undefined;
  const writing=profile===ALPHA_REA_WRITING_PROFILE;
  const progress=profile===ALPHA_REA_PROGRESS_EDIT_PROFILE||writing;
  const memo=profile===ALPHA_MEMO_BODY_PROFILE;
  const ordered=profile===ALPHA_ORDERED_BODY_PROFILE||memo;
  const typed=profile===ALPHA_REA_TEXT_EDIT_PROFILE||progress||ordered;
  const scoped=optionsValid&&Object.hasOwn(options,'documentScope');
  const scopeValid=!scoped||(profile===ALPHA_REA_TEXT_EDIT_PROFILE||progress)
    &&programShape(scopeValue,['ownerId','documentId'])&&typeof scopeValue.ownerId==='string'&&/^[0-9a-f-]{36}$/.test(scopeValue.ownerId)&&programIdentifier(scopeValue.documentId);
  const documentScope=scoped&&scopeValid?Object.freeze({ownerId:scopeValue!.ownerId,documentId:scopeValue!.documentId}):null;
  const memoScoped=optionsValid&&Object.hasOwn(options,'memoDocumentScope'),memoValue=optionsValid?options.memoDocumentScope:undefined;
  const memoScopeValid=!memoScoped||memo&&!scoped&&programShape(memoValue,['ownerId','documentId'])&&typeof memoValue.ownerId==='string'&&/^[0-9a-f-]{36}$/.test(memoValue.ownerId)&&programIdentifier(memoValue.documentId);
  const memoScope=memoScoped&&memoScopeValid?Object.freeze({ownerId:memoValue!.ownerId,documentId:memoValue!.documentId}):null;
  const profileValid=optionsValid&&scopeValid&&memoScopeValid&&(profile===undefined||typed);
  return async (request: Request): Promise<Response> => {
    if (!profileValid || !config || !key || !/^[a-f0-9]{64}$/.test(key) || capacityMode === null || typed&&capacityMode==='checkpoint-v1') return failure('unavailable', 503);
    const requestUrl = new URL(request.url), publicOrigin = alphaRequestOrigin(config, request);
    if (request.method !== 'POST' || !publicOrigin || requestUrl.search
      || !request.headers.get('content-type')?.startsWith('application/json')) return failure('invalid', 400);
    const authorization = request.headers.get('authorization');
    if (!authorization || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization)) return failure('unauthenticated', 401);
    let body: unknown;
    try { body = await requestBody(request); } catch { return failure('invalid', 400); }
    const writingSubmission=writing&&programShape(body,['kind','submission'])&&body.kind==='execute-writing'&&isWritingSubmission(body.submission)?body.submission as any:null;
    const progressSubmission=progress&&programShape(body,['kind','submission'])&&body.kind==='execute-progress'&&isAlphaReaProgressSubmission(body.submission)?body.submission:null;
    const execute = programShape(body, ['kind', 'command']) && body.kind === 'execute' && validServerCommand(body.command)||!!progressSubmission||!!writingSubmission;
    const submittedCommand:AlphaCommand|null=writingSubmission?.command??progressSubmission?.command??(execute?(body as {command:AlphaCommand}).command:null);
    const lookup = programShape(body, ['kind', 'requestId']) && body.kind === 'lookup'
      && programIdentifier(body.requestId) && body.requestId.length <= ALPHA_LIMITS.requestIdChars;
    if (!execute && !lookup) return failure('invalid', 400);
    // Restrict before stale-receipt replay as well; no non-text/remote Undo capability.
    if(typed&&execute&&!(ordered?isAlphaOrderedBodyCommand(submittedCommand):isAlphaReaTextEditCommand(submittedCommand)))return failure('invalid',400);
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
      if(documentScope&&owner!==documentScope.ownerId)return failure('unauthenticated');
      if(memoScope&&owner!==memoScope.ownerId)return failure('unauthenticated');
      const historicalReceipt=async(requestId:string)=>{
        const response=await call('/rest/v1/rpc/flowme_alpha_lookup_v1',{request_id:requestId});
        if(!response.ok)return failure(response.status===401||response.status===403?'unauthenticated':'unavailable');
        const value:unknown=await response.json();
        if(!validReceiptResult(value)||programShape(value,['ok','value'])&&value.ok===true&&value.value!==null
          &&(!isAlphaWireReceipt(value.value)||value.value.requestId!==requestId||value.value.kind!=='change-private'||!value.value.changed))return failure('unavailable');
        // This is historical owner-scoped evidence, not coverage of latest input
        // or renewed authority for this document. No execute/sign path follows.
        return result(value);
      };
      if (lookup) {
        if(documentScope||memoScope)return await historicalReceipt((body as {requestId:string}).requestId);
        const response = await call('/rest/v1/rpc/flowme_alpha_lookup_v1', { request_id: (body as { requestId: string }).requestId });
        if (!response.ok) return failure(response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable');
        const value: unknown = await response.json();
        if(ordered&&(!validReceiptResult(value)||programShape(value,['ok','value'])&&value.ok===true&&value.value!==null
          &&(!isAlphaWireReceipt(value.value)||value.value.requestId!==(body as {requestId:string}).requestId||value.value.kind!=='change-private'||!value.value.changed)))return failure('unavailable');
        return validReceiptResult(value) ? result(value) : failure('invalid');
      }
      const command = submittedCommand!;
      if(capacityMode==='checkpoint-v1'&&command.kind==='change-private'&&command.changes.some(change=>change.field==='personalAuthoring'))return failure('unavailable');
      const response = await call('/rest/v1/flowme_alpha_accounts?select=account');
      if (!response.ok) return failure(response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable');
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || rows.length !== 1) return failure('invalid');
      let account: AlphaAccount<AlphaSpace> = rows[0]?.account, references:AlphaReferenceContext|undefined;
      if(!account||account.ownerId!==owner)return failure('invalid');
      if(capacityMode==='checkpoint-v1'&&account.space?.personalAuthoring!==undefined)return failure('unavailable');
      if(typed){
        if(!(memo?isMemoAccount(account,owner):ordered?isAlphaOrderedEditAccount(account,owner):isAlphaReaEditAccount(account,owner)))return failure('invalid');
      }else if(!isAccountForOwner(account,owner)){
        const social=await readAlphaSocialServerContext(call,owner,key);if(!social.ok)return failure(social.reason);
        account=social.value.account;references=alphaSocialReferences(social.value.context,owner);
      }
      // Public receipts do not contain the original command fingerprint. A
      // stale execute therefore cannot be proven equal by requestId alone.
      // Keep it rejected; an explicit lookup can recover historical evidence
      // without treating a changed stale payload as a successful execution.
      if((documentScope||memoScope)&&command.expectedRevision<account.revision)return failure('revision-conflict');
      // Old requests can only replay an existing receipt; they cannot mutate a newer revision.
      if(account.revision===command.expectedRevision&&account.space.personalAuthoring!==undefined&&command.kind==='undo-private')return failure('invalid');
      if (account.revision === command.expectedRevision && command.kind === 'change-private') {
        if(documentScope&&(!isAlphaReaEditAccount(account,owner)||!alphaWritingDocuments(account.space).some(d=>d.id===documentScope.documentId)))return failure('not-found');
        if(memoScope){const cohort=inspectMemoCohort(account,owner,alphaReaOwnerReferences(owner));if(!cohort.ok||!alphaWritingDocuments(cohort.projected.space).some(d=>d.id===memoScope.documentId))return failure('not-found');}
        const next = detached(account);
        for (const change of command.changes) {
          if (change.present) Object.defineProperty(next.space, change.field, { value: detached(change.value), enumerable: true, configurable: true, writable: true });
          else delete next.space[change.field];
        }
        if(typed){
          if(ordered){
            const prepared=(memo?prepareMemoBodyEdit:prepareOrderedBodyEdit)(account,command,owner,alphaReaOwnerReferences(owner));
            if(!prepared.ok||canonicalJson(prepared.value.expected.space)!==canonicalJson(next.space))return failure('invalid');
          }else if(writingSubmission){const prepared=prepareWritingSubmission(account,writingSubmission,owner,documentScope?.documentId);if(!prepared.ok||canonicalJson(prepared.value.expected.space)!==canonicalJson(next.space))return failure('invalid');
          }else if(progressSubmission){
            if(documentScope&&progressSubmission.progress.some(operation=>operation.docId!==documentScope.documentId))return failure('invalid');
            const prepared=prepareAlphaReaProgressSubmission(account,progressSubmission,owner,documentScope?.documentId);
            if(!prepared.ok||canonicalJson(prepared.value.expected.space)!==canonicalJson(next.space))return failure('invalid');
          }else if(!preservesAlphaReaTextEdit(account,next,owner,documentScope?.documentId))return failure('invalid');
          if(documentScope&&!preservesDocumentBoundary(account,next,documentScope))return failure('invalid');
          if(memoScope&&!preservesMemoDocumentBoundary(account,next,memoScope))return failure('invalid');
        }else{
          if (!isAccountForOwner(account,owner,references)||!isAccountForOwner(next, owner, references)) return failure('invalid');
          if (!preservesPersonalAuthoring(account.space,next.space,command))return failure('invalid');
          if (!preservesAlphaPrivateSources(account, next, references)) return failure('invalid');
          if (!preservesAlphaPrivateExecutionHolds(account, next)) return failure('invalid');
        }
        if (canonicalJson(account.space) === canonicalJson(next.space)) return failure('no-change');
      } else if (command.expectedRevision > account.revision) return failure('revision-conflict');
      if (capacityMode === 'checkpoint-v1') return result(await executeAlphaCapacityCommand({
        owner, command, origin: publicOrigin, authorization, key, env, fetcher, call,
      }));
      const text = canonicalJson(command);
      const committed = await call('/rest/v1/rpc/flowme_alpha_execute_v1', { command_text: text, proof: signAlphaCommand(owner, text, key) });
      if (!committed.ok) return failure(committed.status === 401 || committed.status === 403 ? 'unauthenticated' : 'unavailable');
      const value: unknown = await committed.json();
      if(documentScope&&(!validReceiptResult(value)||programShape(value,['ok','value'])&&value.ok===true
        &&(!isAlphaWireReceipt(value.value)||value.value.requestId!==command.requestId||value.value.kind!=='change-private'
          ||!value.value.changed||value.value.revision!==command.expectedRevision+1)))return failure('unavailable');
      if(ordered&&(!validReceiptResult(value)||programShape(value,['ok','value'])&&value.ok===true
        &&(!isAlphaWireReceipt(value.value)||value.value.requestId!==command.requestId||value.value.kind!=='change-private'
          ||!value.value.changed||value.value.revision!==command.expectedRevision+1)))return failure('unavailable');
      return validReceiptResult(value) ? result(value) : failure('unavailable');
    } catch { return failure('unavailable'); }
  };
}
