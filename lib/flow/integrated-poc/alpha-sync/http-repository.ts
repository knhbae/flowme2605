import {noteWritingPhase} from '../writing-ack';
import {ALPHA_REA_WRITING_PROFILE,isWritingSubmission,type WritingOperation} from '../alpha-persistence/rea-writing-edit';
import { createAlphaAccountAccess, createAlphaReaAccountAccess, createAlphaOrderedAccountAccess, createAlphaMemoAccountAccess, type AlphaAccountAccess, type VerifiedAlphaSession } from '../alpha-auth/account-access';
import { isAlphaAuthConfig, type AlphaAuthConfig } from '../alpha-auth/config';
import type {ProgramPrivateSpace} from '../contract';
import type {ReaStoredSpace} from '../rea-stored-text';
import type {ReaOrderedStoredSpace} from '../rea-stored-text';
import {isAlphaOrderedBodyCommand,prepareOrderedBodyEdit,exactOrderedBodyAck,type PreparedOrderedBodyEdit} from '../alpha-persistence/ordered-text-edit';
import {prepareMemoBodyEdit,exactMemoBodyAck,type PreparedMemoBodyEdit,type MemoSpace} from '../alpha-persistence/memo-cohort';
import {isAlphaReaTextEditCommand} from '../alpha-persistence/rea-text-edit';
import {ALPHA_REA_PROGRESS_EDIT_PROFILE,isAlphaReaProgressSubmission,type AlphaReaProgressOperation} from '../alpha-persistence/rea-progress-edit';
import type { AlphaAccount, AlphaSpace, AlphaReceipt, AlphaRepository, AlphaResult, AlphaError, AlphaReferenceContext, AlphaReadProbe, AlphaReadTokens } from '../alpha-persistence/contract';
import { ALPHA_READ_FULL_RPC, ALPHA_READ_PROBE_RPC, alphaReadFailure, isMissingReadRpc, readAlphaReadFrame, readAlphaReadProbe } from './read-frame';
import { alphaSocialReferences, readAlphaSocialResponse } from '../alpha-social/projection';
import { programIdentifier, programShape } from '../program-data';
import { detached,canonicalJson } from '../alpha-persistence/json';
import {freezeStored} from '../rea-stored-text';
import type {TaggedSession} from '../rea-pm/src/tagged-session';
import { isM3Command } from './contract';
import { isAlphaWireCommand, isAlphaWireReceipt } from './wire';
import { ALPHA_CREATOR_REQUEST_BUDGET } from '../alpha-creator/request-budget';
const errors: AlphaError[] = ['invalid', 'unauthenticated', 'not-found', 'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'unavailable', 'no-change', 'rate-limited', 'limit'];
/** Immutable session token: requests started as A never borrow a later B token. */
export function createAlphaHttpRepository(input: AlphaAuthConfig, identity: VerifiedAlphaSession, request: typeof fetch = fetch, options: { social?: boolean; readProbe?: boolean } = {}): AlphaRepository {
  return createHttpRepository(input,identity,request,options,createAlphaAccountAccess(input,identity,request),false);
}
/** Explicit typed port; default application routes/readers remain v11. */
export function createAlphaReaHttpRepository(input:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch):AlphaRepository<ReaStoredSpace>{
  return createHttpRepository(input,identity,request,{},createAlphaReaAccountAccess(input,identity,request),true);
}
/** Body-only v2 transport. The original attempt is retained until strict receipt
 * AND complete expected-account readback agree. It is not a durable witness:
 * after restart a pending lookup stays UNVERIFIED, never inferred or rebased. */
export function createAlphaOrderedHttpRepository(input:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch):AlphaRepository<ReaOrderedStoredSpace>{
 return createBodyHttpRepository(input,identity,request,createAlphaOrderedAccountAccess(input,identity,request),prepareOrderedBodyEdit,exactOrderedBodyAck);
}
export function createAlphaMemoHttpRepository(input:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch):AlphaRepository<MemoSpace>{
 return createBodyHttpRepository(input,identity,request,createAlphaMemoAccountAccess(input,identity,request),prepareMemoBodyEdit,exactMemoBodyAck);
}
function createBodyHttpRepository<Space extends AlphaSpace,Proof extends PreparedOrderedBodyEdit|PreparedMemoBodyEdit>(input:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch,readPort:AlphaAccountAccess<Space>,prepare:(before:unknown,command:unknown,owner:string,refs:AlphaReferenceContext)=>{ok:true;value:Proof}|{ok:false;reason:string},exact:(proof:Proof,account:unknown,receipt:AlphaReceipt)=>boolean):AlphaRepository<Space>{
  const ownerId=identity.userId;
  const base=createHttpRepository(input,identity,request,{},readPort,true,undefined,isAlphaOrderedBodyCommand);
  let latest:AlphaAccount<Space>|null=null;
  type Attempt={prepared:Proof;receipt:AlphaReceipt|null;confirmed:boolean;submitted:boolean};
  let attempt:Attempt|null=null;
  const hold=()=>({ok:false as const,reason:'unavailable' as const});
  const matches=(a:Attempt,r:AlphaReceipt)=>isAlphaWireReceipt(r)&&r.requestId===a.prepared.command.requestId
    &&r.kind==='change-private'&&r.changed===true&&r.revision===a.prepared.expected.revision;
  return{
    references:()=>base.references?.()??null,
    async read(){
      const current=attempt;
      if(current&&!current.confirmed&&!current.receipt)return hold();
      // Capture the obligation before await: another read confirming this same
      // attempt must not exempt this response from its own exact comparison.
      const needsExactCheck=!!current&&!current.confirmed;
      const result=await base.read();
      if(attempt!==current)return hold();
      if(current&&needsExactCheck){
        if(!result.ok||!current.receipt||!exact(current.prepared,result.value,current.receipt))return hold();
        current.confirmed=true;
      }
      if(result.ok)latest=detached(result.value);
      return result;
    },
    async execute(command){
      if(!isAlphaOrderedBodyCommand(command))return{ok:false,reason:'invalid'};
      if(attempt&&attempt.prepared.command.requestId===command.requestId){
        if(canonicalJson(attempt.prepared.command)!==canonicalJson(command))return{ok:false,reason:'idempotency-conflict'};
      }else{
        if(attempt&&!attempt.confirmed)return hold();
        const references=base.references?.();
        if(!latest||!references)return hold();
        const prepared=prepare(latest,command,ownerId,references);
        if(!prepared.ok)return{ok:false,reason:command.expectedRevision!==latest.revision?'revision-conflict':'invalid'};
        if(!prepared.value.changed)return{ok:false,reason:'no-change'};
        attempt={prepared:prepared.value,receipt:null,confirmed:false,submitted:false};
      }
      const current=attempt!;
      const replay=current.submitted;current.submitted=true;
      const result=await base.execute(command);
      if(attempt!==current)return hold();
      if(!result.ok){
        // A later negative replay cannot settle the first ambiguous outcome.
        // Keep the original witness so lookup(original ID) remains possible.
        if(replay)return result.reason==='unauthenticated'?result:hold();
        if(result.reason!=='unavailable'&&result.reason!=='unauthenticated')attempt=null;
        return result;
      }
      if(!matches(current,result.value))return hold();
      current.receipt=detached(result.value);current.confirmed=false;
      return result;
    },
    async lookup(requestId){
      const current=attempt;
      if(!current||current.prepared.command.requestId!==requestId)return hold();
      const result=await base.lookup(requestId);
      if(attempt!==current)return hold();
      if(!result.ok||result.value===null)return result;
      if(!matches(current,result.value))return hold();
      current.receipt=detached(result.value);current.confirmed=false;
      return result;
    },
  };
}
/** In-memory attempt witness only. Restored pending commands without their
 * original witness stay unavailable/UNVERIFIED, never inferred from new input. */
export function createAlphaReaProgressHttpRepository(input:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch){
  type Binding={command:Parameters<AlphaRepository<ReaStoredSpace>['execute']>[0];progress:readonly AlphaReaProgressOperation[];writing:readonly WritingOperation[];stamp:ReturnType<TaggedSession['submissionStamp']>;generation:number};
  let binding:ReturnType<typeof freezeStored<Binding>>|null=null;
  const repository=createHttpRepository(input,identity,request,{},createAlphaReaAccountAccess(input,identity,request),true,command=>{
    if(!binding||canonicalJson(binding.command)!==canonicalJson(command))return null;
    if(binding.writing.length)return{kind:'execute-writing',submission:{profile:ALPHA_REA_WRITING_PROFILE,command:detached(binding.command),progress:detached(binding.progress),writing:detached(binding.writing)}};
    return binding.progress.length?{kind:'execute-progress',submission:{profile:ALPHA_REA_PROGRESS_EDIT_PROFILE,command:detached(binding.command),progress:detached(binding.progress)}}:{kind:'execute',command:detached(binding.command)};
  });
  return{...repository,
    bindProgressSubmission(value:Binding){
      if(!isAlphaReaTextEditCommand(value.command)||(value.writing.length?!isWritingSubmission({profile:ALPHA_REA_WRITING_PROFILE,command:value.command,progress:value.progress,writing:value.writing}):value.progress.length&&!isAlphaReaProgressSubmission({profile:ALPHA_REA_PROGRESS_EDIT_PROFILE,command:value.command,progress:value.progress})))return{ok:false as const,reason:'INVALID_PROGRESS_WITNESS'};
      binding=freezeStored(detached(value));return{ok:true as const};
    },
    clearProgressSubmission(command:Binding['command']){if(binding&&canonicalJson(binding.command)===canonicalJson(command))binding=null;},
  };
}
function createHttpRepository<Space extends AlphaSpace=ProgramPrivateSpace>(input:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch,options:{social?:boolean;readProbe?:boolean},readPort:AlphaAccountAccess<Space>,typed:boolean,executeBody?:(command:unknown)=>unknown|null,typedGuard:(command:unknown)=>boolean=isAlphaReaTextEditCommand):AlphaRepository<Space>{
  const config = Object.freeze({ ...input }), session = Object.freeze({ ...identity });
  let references: AlphaReferenceContext | null = null, socialOpened = false;
  let submission: {bytes:string;dispatched:boolean} | null = null;
  async function rpc(body: unknown, nullable: boolean, endpoint = '/api/alpha/account', dispatch?:()=>void): Promise<AlphaResult<AlphaReceipt | null>> {
    if (!isAlphaAuthConfig(config) || !session.accessToken || !programIdentifier(session.userId)) return { ok: false, reason: 'invalid' };
    const headers = { apikey: config.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' };
    try {
      const auth = await request(`${config.url}/auth/v1/user`, { headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!auth.ok) return { ok: false, reason: auth.status === 401 || auth.status === 403 ? 'unauthenticated' : 'unavailable' };
      const user = await auth.json();
      if (!user || user.id !== session.userId || user.is_anonymous) return { ok: false, reason: 'unauthenticated' };
      dispatch?.(); // Before fetch: a thrown/aborted POST still has an unknown outcome.
      const response = await request(endpoint, { method: 'POST', headers: { Authorization: headers.Authorization, 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(endpoint === '/api/alpha/creator' ? ALPHA_CREATOR_REQUEST_BUDGET.browserMs : 15000) });
      const decodeStart=performance.now();const result: unknown = await response.json();noteWritingPhase('ack-decode-receipt-await',decodeStart);
      if (programShape(result, ['ok', 'reason']) && result.ok === false && errors.includes(result.reason as AlphaError)) return result as AlphaResult<never>;
      if (!response.ok) return { ok: false, reason: response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable' };
      if (programShape(result, ['ok', 'value']) && result.ok === true && (isAlphaWireReceipt(result.value) || nullable && result.value === null)) return detached(result) as AlphaResult<AlphaReceipt | null>;
      return { ok: false, reason: 'unavailable' }; // Unknown post-dispatch outcome must retain request identity.
    } catch { return { ok: false, reason: 'unavailable' }; }
  }
  // Egress probe (opt-in, social reads only): v2 reads carry two tokens from the same snapshot until the
  // server answers that the v2 RPCs do not exist; from then on this repository reads v1 without tokens.
  let readFrame: 'v2' | 'v1' = options.social && options.readProbe && !typed ? 'v2' : 'v1', lastTokens: AlphaReadTokens | null = null;
  const socialCall = (name: string) => {
    const headers = { apikey: config.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' };
    return request(`${config.url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: '{}', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) });
  };
  return {
    wasNotSubmitted: command => !typed && submission?.bytes === canonicalJson(command) && !submission.dispatched,
    references: () => detached(references),
    readTokens: () => lastTokens ? { ...lastTokens } : null,
    async probe(): Promise<AlphaReadProbe> {
      if (readFrame !== 'v2' || !socialOpened) return { kind: 'unsupported' };
      if (!isAlphaAuthConfig(config) || !session.accessToken || !programIdentifier(session.userId)) return { kind: 'failed', reason: 'invalid' };
      try {
        const response = await socialCall(ALPHA_READ_PROBE_RPC), value: unknown = await response.json().catch(() => null);
        if (isMissingReadRpc(response.status, value)) { readFrame = 'v1'; return { kind: 'unsupported' }; }
        if (response.status === 401 || response.status === 403) return { kind: 'failed', reason: 'unauthenticated' };
        const failure = alphaReadFailure(value); if (failure) return { kind: 'failed', reason: failure };
        const tokens = response.ok ? readAlphaReadProbe(value) : null;
        return tokens ? { kind: 'tokens', tokens } : { kind: 'failed', reason: response.ok ? 'invalid' : 'unavailable' };
      } catch { return { kind: 'failed', reason: 'unavailable' }; }
    },
    async read() {
      if (options.social) {
        if(typed)return {ok:false,reason:'invalid'};
        if (!isAlphaAuthConfig(config) || !session.accessToken || !programIdentifier(session.userId)) return { ok: false, reason: 'invalid' };
        const call = socialCall;
        lastTokens = null;
        try {
          if (!socialOpened) {
            const opened = await call('flowme_alpha_social_open_v1');
            const value = await opened.json();
            if (!opened.ok || !programShape(value, ['ok', 'value']) || value.ok !== true) return { ok: false, reason: opened.status === 401 || opened.status === 403 ? 'unauthenticated' : 'unavailable' };
            socialOpened = true;
          }
          if (readFrame === 'v2') {
            const response = await call(ALPHA_READ_FULL_RPC), value: unknown = await response.json().catch(() => null);
            if (isMissingReadRpc(response.status, value)) readFrame = 'v1';
            else {
              if (response.status === 401 || response.status === 403) return { ok: false, reason: 'unauthenticated' };
              const failure = alphaReadFailure(value); if (failure) return { ok: false, reason: failure };
              if (!response.ok) return { ok: false, reason: 'unavailable' };
              const frame = readAlphaReadFrame(value), result = frame && readAlphaSocialResponse({ ok: true, value: frame.snapshot }, session.userId);
              if (!frame || !result) return { ok: false, reason: 'invalid' };
              references = alphaSocialReferences(result.context, session.userId); lastTokens = frame.tokens;
              return { ok: true, value: result.account as AlphaAccount<Space> };
            }
          }
          const response = await call('flowme_alpha_social_read_v1'), value: unknown = await response.json();
          if (programShape(value, ['ok', 'reason']) && value.ok === false && errors.includes(value.reason as AlphaError)) return value as AlphaResult<never>;
          if (!response.ok) return { ok: false, reason: response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable' };
          const result = readAlphaSocialResponse(value, session.userId);
          if (!result) return { ok: false, reason: 'invalid' };
          references = alphaSocialReferences(result.context, session.userId);
          return { ok: true, value: result.account as AlphaAccount<Space> };
        } catch { return { ok: false, reason: 'unavailable' }; }
      }
      const result = await readPort.read();
      if (result.ok) references = result.references ?? null;
      return result.ok ? result.account ? { ok: true, value: result.account } : { ok: false, reason: 'not-found' }
        : { ok: false, reason: result.reason === 'session-expired' ? 'unauthenticated' : result.reason === 'invalid' ? 'invalid' : 'unavailable' };
    },
    async execute(command) {
      submission=null;
      if (!isAlphaWireCommand(command)||typed&&!typedGuard(command)) return { ok: false, reason: 'invalid' };
      const body=executeBody?executeBody(command):{kind:'execute',command:detached(command)};
      if(body===null)return{ok:false,reason:'unavailable'};
      const attempt={bytes:canonicalJson(command),dispatched:false};submission=attempt;
      return await rpc(body, false, isM3Command(command) ? '/api/alpha/account'
        : command.kind === 'social' || command.kind === 'undo-social' ? '/api/alpha/social' : '/api/alpha/creator',()=>{attempt.dispatched=true;}) as AlphaResult<AlphaReceipt>;
    },
    async lookup(requestId) { return programIdentifier(requestId) && requestId.length <= 160 ? rpc({ kind: 'lookup', requestId }, true) : { ok: false, reason: 'invalid' }; },
  };
}
