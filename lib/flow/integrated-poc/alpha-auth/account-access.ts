import {noteWritingPhase} from '../writing-ack';
import type {ProgramPrivateSpace} from '../contract';
import type {ReaStoredSpace} from '../rea-stored-text';
import {isAlphaReaEditAccount,alphaReaOwnerReferences,type AlphaReaEditAccount} from '../alpha-persistence/rea-text-edit';
import {isAlphaOrderedEditAccount} from '../alpha-persistence/ordered-text-edit';
import type {ReaOrderedStoredSpace} from '../rea-stored-text';
import {inspectMemoCohort,isMemoAccount,type MemoSpace,type MemoAccount} from '../alpha-persistence/memo-cohort';
import type { AlphaSpace, AlphaAccount, AlphaReferenceContext } from '../alpha-persistence/contract';
import { validateAlphaAccount,inspectStoredAlphaAccount } from '../alpha-persistence/program-adapter';
import { isAlphaAuthConfig, type AlphaAuthConfig } from './config';
import { alphaSocialReferences, readAlphaSocialResponse } from '../alpha-social/projection';
import {canonicalJson} from '../alpha-persistence/json';
import {alphaWritingDocuments} from '../alpha-sync/app-writing-documents';

export type VerifiedAlphaSession = { accessToken: string; userId: string };
export type AlphaAccessResult<Space extends AlphaSpace=ProgramPrivateSpace> = { ok: true; account: AlphaAccount<Space> | null; references?: AlphaReferenceContext } | { ok: false; reason: 'session-expired' | 'unavailable' | 'invalid' };
export interface AlphaAccountAccess<Space extends AlphaSpace=ProgramPrivateSpace> { read(): Promise<AlphaAccessResult<Space>>; open(): Promise<AlphaAccessResult<Space>>; }

export function isAccountForOwner(value: unknown, ownerId: string, references?: AlphaReferenceContext): value is AlphaAccount {
  return validateAlphaAccount(value, references ?? { actorIds: [ownerId], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } }, ownerId);
}

/** Explicit local stored-reader entry. It cannot make the legacy session ready,
 * return an editable AlphaAccount for tagged text, or submit a command. */
export function inspectAlphaStoredRead(value:unknown,ownerId:string,references:AlphaReferenceContext={actorIds:[ownerId],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}}){return inspectStoredAlphaAccount(value,references,ownerId);}

/** Fixed token per request group: an A request can never silently borrow B's new session. RLS remains authoritative. */
export function createAlphaAccountAccess(inputConfig: AlphaAuthConfig, inputSession: VerifiedAlphaSession, request: typeof fetch = fetch): AlphaAccountAccess {
  return createAccountAccess(inputConfig,inputSession,request,isAccountForOwner,true);
}
/** Opt-in typed read. An explicit injected transport is required; open never creates or converts an account. */
export function createAlphaReaAccountAccess(config:AlphaAuthConfig,session:VerifiedAlphaSession,request:typeof fetch):AlphaAccountAccess<ReaStoredSpace>{
  return createAccountAccess(config,session,request,isAlphaReaEditAccount,false);
}
/** Separate opt-in reader. Existing v11/v1 selection and account creation stay unchanged. */
export function createAlphaOrderedAccountAccess(config:AlphaAuthConfig,session:VerifiedAlphaSession,request:typeof fetch):AlphaAccountAccess<ReaOrderedStoredSpace>{
  return createAccountAccess(config,session,request,isAlphaOrderedEditAccount,false);
}
export function createAlphaMemoAccountAccess(config:AlphaAuthConfig,session:VerifiedAlphaSession,request:typeof fetch):AlphaAccountAccess<MemoSpace>{
 return createAccountAccess(config,session,request,isMemoAccount,false);
}
export type MemoWritingRead={ok:true;kind:'rea-memo-profile';account:MemoAccount;projected:AlphaAccount<ReaOrderedStoredSpace>;references:AlphaReferenceContext;writeAllowed:false}
 |{ok:true;kind:'missing'}|{ok:false;reason:'session-expired'|'unavailable'|'invalid'};
export function createAlphaMemoWritingAccountReader(config:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch){
 const access=createAlphaMemoAccountAccess(config,identity,request);
 return{async read():Promise<MemoWritingRead>{
  const result=await access.read();if(!result.ok)return result;if(!result.account)return{ok:true,kind:'missing'};
  const references=result.references??alphaReaOwnerReferences(identity.userId),cohort=inspectMemoCohort(result.account,identity.userId,references);
  return cohort.ok?{ok:true,kind:'rea-memo-profile',account:result.account,projected:cohort.projected,references,writeAllowed:false}:{ok:false,reason:'invalid'};
 }};
}
export type MemoWritingEntryRead=MemoWritingRead|Extract<AlphaWritingRead,{kind:'v11-readonly'}>;
/** Admission only. A valid original v11 outside the memo cohort keeps its existing
 * writer. Typed repositories still use the strict memo reader above. */
export function createAlphaMemoWritingEntryReader(config:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch){
 const validate=(value:unknown,owner:string,references?:AlphaReferenceContext):value is MemoAccount=>isAccountForOwner(value,owner,references)||isMemoAccount(value,owner,references);
 const access=createAccountAccess(config,identity,request,validate,true,true);
 return{async read():Promise<MemoWritingEntryRead>{
  const result=await access.read();if(!result.ok)return result;if(!result.account)return{ok:true,kind:'missing'};
  const references=result.references??alphaReaOwnerReferences(identity.userId),cohort=inspectMemoCohort(result.account,identity.userId,references);
  if(cohort.ok)return{ok:true,kind:'rea-memo-profile',account:result.account,projected:cohort.projected,references,writeAllowed:false};
  return isAccountForOwner(result.account,identity.userId,references)?{ok:true,kind:'v11-readonly',account:result.account,references,writeAllowed:false}:{ok:false,reason:'invalid'};
 }};
}
export type AlphaWritingRead=
 |{ok:true;kind:'missing'}
 |{ok:true;kind:'v11-readonly';account:AlphaAccount;references:AlphaReferenceContext;writeAllowed:false}
 |{ok:true;kind:'rea-edit-profile';account:AlphaReaEditAccount;references:AlphaReferenceContext;writeAllowed:false}
 |{ok:false;reason:'session-expired'|'unavailable'|'invalid'};
/** One authenticated read selects an owner/profile without creating an account.
 * Read success is not editor readiness; v11 stays on its own readonly branch. */
export function createAlphaWritingAccountReader(config:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch){
 const ownerId=identity.userId;
 const validate=(value:unknown,owner:string,references?:AlphaReferenceContext):value is AlphaAccount<ProgramPrivateSpace|ReaStoredSpace>=>isAccountForOwner(value,owner,references)||isAlphaReaEditAccount(value,owner,references);
 const access=createAccountAccess(config,identity,request,validate,true);
 return{async read():Promise<AlphaWritingRead>{
  const result=await access.read();if(!result.ok)return result;
  if(!result.account)return{ok:true,kind:'missing'};
  const references=result.references??alphaReaOwnerReferences(ownerId);
  if(isAccountForOwner(result.account,ownerId,references))return{ok:true,kind:'v11-readonly',account:result.account,references,writeAllowed:false};
  if(isAlphaReaEditAccount(result.account,ownerId,references))return{ok:true,kind:'rea-edit-profile',account:result.account,references,writeAllowed:false};
  return{ok:false,reason:'invalid'};
 }};
}
/** App admission only: existing authenticated reader, no creation/conversion. */
export type AlphaAppWritingRead={ok:true;kind:'rea';documents:{id:string;title:string}[]}
 |{ok:true;kind:'memo';documents:{id:string;title:string}[]}
 |{ok:true;kind:'missing'}|{ok:true;kind:'legacy'}|{ok:false;reason:'session-expired'|'unavailable'|'invalid'};
export function createAlphaAppWritingAccountReader(config:AlphaAuthConfig,identity:VerifiedAlphaSession,request:typeof fetch){
 const validate=(value:unknown,owner:string,references?:AlphaReferenceContext):value is AlphaAccount<ProgramPrivateSpace|ReaStoredSpace|ReaOrderedStoredSpace>=>isAccountForOwner(value,owner,references)||isAlphaReaEditAccount(value,owner)||isMemoAccount(value,owner);
 const access=createAccountAccess(config,identity,request,validate,true,true);
 return{async read():Promise<AlphaAppWritingRead>{
  const result=await access.read();if(!result.ok)return result;if(!result.account)return{ok:true as const,kind:'missing' as const};
  const account:unknown=result.account,owner=identity.userId;
  if(isAlphaReaEditAccount(account,owner))return{ok:true as const,kind:'rea' as const,documents:alphaWritingDocuments(account.space)};
  const memo=inspectMemoCohort(account,owner,alphaReaOwnerReferences(owner));
  // N1 fix 4: only an account already in the ordered v2 store is the memo cohort. A v11 account holding only
  // memos (a new user's first lines) stays on the main workspace: its first memo edit would move it to v2, and
  // the main workspace could not open it again. The writing route reads this same answer.
  if(memo.ok&&memo.origin==='v2')return{ok:true as const,kind:'memo' as const,documents:alphaWritingDocuments(memo.projected.space)};
  return isAccountForOwner(account,owner,result.references)?{ok:true as const,kind:'legacy' as const}:{ok:false as const,reason:'invalid' as const};
 }};
}
function createAccountAccess<Space extends AlphaSpace>(inputConfig:AlphaAuthConfig,inputSession:VerifiedAlphaSession,request:typeof fetch,validate:(value:unknown,ownerId:string,references?:AlphaReferenceContext)=>value is AlphaAccount<Space>,legacy:boolean,sameOriginalRead=false):AlphaAccountAccess<Space>{
  const config = Object.freeze({ ...inputConfig }), session = Object.freeze({ ...inputSession });
  async function perform(open: boolean): Promise<AlphaAccessResult<Space>> {
    if(open&&!legacy)return {ok:false,reason:'invalid'};
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
      const decodeStart=performance.now();const value: unknown = await result.json();noteWritingPhase('ack-decode-account-await',decodeStart);
      if (!open && Array.isArray(value) && value.length === 0) return { ok: true, account: null };
      const account = open ? value : Array.isArray(value) && value.length === 1 ? value[0]?.account : undefined;
      if (validate(account, session.userId)) return { ok: true, account, ...(!legacy?{references:alphaReaOwnerReferences(session.userId)}:{}) };
      if(!legacy)return {ok:false,reason:'invalid'};
      // Public references are validated against the server's owner-filtered graph,
      // never synthesized from a malformed private payload or another account.
      const contextResponse = await request(`${config.url}/rest/v1/rpc/flowme_alpha_social_read_v1`, {
        method: 'POST', headers, body: '{}', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
      });
      if (!contextResponse.ok) return { ok: false, reason: contextResponse.status === 401 || contextResponse.status === 403 ? 'session-expired' : 'invalid' };
      const social = readAlphaSocialResponse(await contextResponse.json(), session.userId);
      // Admission may obtain verified references, never replace a rejected first
      // account with a different later account and call that the original route.
      if(sameOriginalRead&&social&&canonicalJson(account)!==canonicalJson(social.account))return {ok:false,reason:'invalid'};
      return social && validate(social.account,session.userId,alphaSocialReferences(social.context, session.userId)) ? { ok: true, account: social.account, references: alphaSocialReferences(social.context, session.userId) } : { ok: false, reason: 'invalid' };
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
