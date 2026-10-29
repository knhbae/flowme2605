import {ALPHA_REA_WRITING_PROFILE,prepareWritingSubmission} from '../alpha-persistence/rea-writing-edit';
import {createAlphaWritingAccountReader,createAlphaMemoWritingAccountReader,type MemoWritingRead,type VerifiedAlphaSession,type AlphaWritingRead} from '../alpha-auth/account-access';
import type {AlphaAuthConfig} from '../alpha-auth/config';
import {createAlphaReaHttpRepository,createAlphaReaProgressHttpRepository,createAlphaMemoHttpRepository} from './http-repository';
import {ALPHA_MEMO_BODY_PROFILE,prepareMemoBodyEdit} from '../alpha-persistence/memo-cohort';
import {preservesAlphaReaTextEdit,alphaReaOwnerReferences,ALPHA_REA_NEW_ITEMS_PROFILE} from '../alpha-persistence/rea-text-edit';
import {createTaggedAlphaTestHost} from '../rea-pm/tagged-alpha-host';
import {detached,canonicalJson} from '../alpha-persistence/json';
import {ALPHA_REA_PROGRESS_EDIT_PROFILE,prepareAlphaReaProgressEdit,prepareAlphaReaProgressSubmission} from '../alpha-persistence/rea-progress-edit';
import type {AlphaTypedReentryRecovery} from './typed-reentry-recovery';

type Host=ReturnType<typeof createTaggedAlphaTestHost>;
type Session=NonNullable<ReturnType<Host['currentSession']>>;
type LocalBlock={reason:string;stamp:ReturnType<Session['submissionStamp']>};
const reject=(reason:string)=>({ok:false as const,reason});

/** Opt-in local integration controller. The immutable identity/document owns one
 * PM host. No v11 materialization, live repository/default fetch, or conversion.
 * The tested host retains input, official history, exact ACK and recovery logic. */
export function createAlphaTypedWritingController(input:{config:AlphaAuthConfig;identity:VerifiedAlphaSession;request:typeof fetch;documentId:string;inputOwnerId:string;entityIds:readonly string[];requestId:()=>string;textProfile?:typeof ALPHA_REA_PROGRESS_EDIT_PROFILE|typeof ALPHA_MEMO_BODY_PROFILE;newItemsProfile?:typeof ALPHA_REA_NEW_ITEMS_PROFILE;reentry?:AlphaTypedReentryRecovery}){
  if(input.textProfile!==undefined&&input.textProfile!==ALPHA_REA_PROGRESS_EDIT_PROFILE&&input.textProfile!==ALPHA_MEMO_BODY_PROFILE)throw Error('UNSUPPORTED_WRITING_PROFILE');
  const memo=input.textProfile===ALPHA_MEMO_BODY_PROFILE;
  const progressEnabled=input.textProfile===ALPHA_REA_PROGRESS_EDIT_PROFILE;
  if(input.newItemsProfile!==undefined&&(input.newItemsProfile!==ALPHA_REA_NEW_ITEMS_PROFILE||memo))throw Error('UNSUPPORTED_NEW_ITEMS_PROFILE');
  const newItemsDocumentId=input.newItemsProfile===ALPHA_REA_NEW_ITEMS_PROFILE?input.documentId:undefined;
  if(input.reentry&&(!progressEnabled||!newItemsDocumentId||input.reentry.binding.ownerId!==input.identity.userId||input.reentry.binding.docId!==input.documentId))throw Error('UNSUPPORTED_REENTRY_PROFILE_OR_BINDING');
 const identity=Object.freeze({...input.identity}),config=Object.freeze({...input.config});
 const documentId=input.documentId,inputOwnerId=input.inputOwnerId,entityIds=Object.freeze([...input.entityIds]),request=input.request,requestId=input.requestId;
 const reader=memo?createAlphaMemoWritingAccountReader(config,identity,request):createAlphaWritingAccountReader(config,identity,request);
 let generation=0,closed=false,opening=false,mode:'unopened'|'opening'|'v11-readonly'|'typed'|'blocked'|'closed'='unopened';
 let read:AlphaWritingRead|MemoWritingRead|null=null,inner:Host|null=null,writer:Host|null=null,localBlock:LocalBlock|null=null;
 // This holds a reason+stamp only. Live PM/rejectedIntent remains the sole input
 // owner; do not create a second authoritative RAW or clear a network attempt.
 function preflight(retry=false){
  if(closed)return reject('OWNER_RETIRED');
  if(!inner)return reject('NO_TYPED_INPUT_OWNER');
  const state=inner.inspect(),session=inner.currentSession();
  if(!session)return reject('NO_TYPED_INPUT_OWNER');
  // Prior exact confirmation always wins over a new unsupported submission.
  if(state.attempt&&!(retry&&state.attempt.stage==='REJECTED'))return reject('PENDING_EXACT_CONFIRMATION');
  if(state.inflight||state.reading||state.panelPending||session.diagnostics().composing)return reject('INPUT_OWNER_HOLD');
  const round=session.roundTrip(),before=state.client.state?.confirmed;
  const next=round.ok&&before?{...detached(before),space:{...detached(before.space),text:detached(round.snapshot)}}:null;
   let reason:string|null=!round.ok?'UNSERIALIZABLE_INPUT_PRESERVED':!before||!next?'UNSUPPORTED_TYPED_EDIT_PRESERVED':null;
   if(!reason&&before&&next&&round.ok){
    if(memo){
     const proof=prepareMemoBodyEdit(before,{schema:'flowme-alpha-command/1',kind:'change-private',requestId:'memo-preflight',expectedRevision:before.revision,changes:[{field:'text',present:true,value:round.snapshot}]},identity.userId,alphaReaOwnerReferences(identity.userId));
     // The host separately confirms this unchanged original v11 by fresh read;
     // it does not submit or relax the first-conversion command guard.
     reason=proof.ok||proof.reason==='MEMO_EDIT_REQUIRED_BEFORE_TRANSITION'?null:proof.reason;
    }else if(progressEnabled){
     const capture=session.captureProgressOperations(session.submissionStamp());
     const writing=session.captureWritingOperations(session.submissionStamp());
     reason=!writing.ok?writing.reason:writing.operations.length?!prepareWritingSubmission(before,{profile:ALPHA_REA_WRITING_PROFILE,command:{schema:'flowme-alpha-command/1',kind:'change-private',requestId:'writing-preflight',expectedRevision:before.revision,changes:[{field:'text',present:true,value:round.snapshot}]},progress:capture.ok?capture.operations:[],writing:writing.operations},identity.userId,newItemsDocumentId).ok?'UNSUPPORTED_TYPED_EDIT_PRESERVED':null:!capture.ok?capture.reason:capture.operations.length?!prepareAlphaReaProgressEdit({before,ownerId:identity.userId,requestId:'progress-preflight',text:round.snapshot,progress:capture.operations,newItemsDocumentId}).ok?'UNSUPPORTED_TYPED_EDIT_PRESERVED':null:!preservesAlphaReaTextEdit(before,next,identity.userId,newItemsDocumentId)?'UNSUPPORTED_TYPED_EDIT_PRESERVED':null;
    }else if(!preservesAlphaReaTextEdit(before,next,identity.userId,newItemsDocumentId))reason='UNSUPPORTED_TYPED_EDIT_PRESERVED';
   }
  if(reason){localBlock={reason,stamp:detached(session.submissionStamp())};return reject(reason);}
  localBlock=null;return{ok:true as const};
 }
 function retire(){
  if(closed)return{ok:true as const};
  if(localBlock)return reject('UNSUPPORTED_TYPED_EDIT_PRESERVED');
  if(inner){const result=inner.close();if(!result.ok)return result;}
  closed=true;generation++;opening=false;mode='closed';writer=null;return{ok:true as const};
 }
 function facade(host:Host):Host{
  const submit=async(retry:boolean)=>{const check=preflight(retry);return check.ok?retry?host.retryRejected():host.save():check;};
  return{...host,
   save:()=>submit(false),retryRejected:()=>submit(true),
   // Resolving an older ACK never preflights or discards the newest local draft.
   confirmPending:retry=>host.confirmPending(retry),
   canLeave:()=>!localBlock&&host.canLeave(),
   flush:async()=>{const result=await submit(false);return result.ok&&!localBlock&&host.canLeave();},
   capture(){const captured=host.capture();return{...captured,complete:captured.complete&&!localBlock,pendingUnsupported:detached(localBlock)};},
    inspect(){const state=host.inspect();return{...state,phase:localBlock?'BLOCKED_UNSUPPORTED_EDIT':state.phase,canLeave:!localBlock&&state.canLeave,pendingUnsupported:detached(localBlock),writerProfile:memo?ALPHA_MEMO_BODY_PROFILE:progressEnabled?ALPHA_REA_PROGRESS_EDIT_PROFILE:'rea-body-title/1'};},
   async reopen(){if(localBlock)return reject('UNSUPPORTED_TYPED_EDIT_PRESERVED');return host.reopen();},
   close:retire,
  };
 }
 async function open(){
  if(closed||opening||mode!=='unopened')return reject('OWNER_ALREADY_OPEN_OR_CLOSED');
  const epoch=++generation;opening=true;mode='opening';
  try{
   const recoveryRead=input.reentry?.probe();
   if(recoveryRead&&!recoveryRead.ok){mode='blocked';return reject(recoveryRead.reason);}
   const progressRepository=progressEnabled?createAlphaReaProgressHttpRepository(config,identity,request):null;
   const repository=progressRepository??(memo?createAlphaMemoHttpRepository(config,identity,request):createAlphaReaHttpRepository(config,identity,request));
   const makeCandidate=()=>createTaggedAlphaTestHost({scope:'local-typed-memory-test/1',ownerId:identity.userId,documentId,inputOwnerId,entityIds,references:alphaReaOwnerReferences(identity.userId),repository,requestId,...(input.reentry?{reentry:input.reentry}:{}),...(memo?{textProfile:ALPHA_MEMO_BODY_PROFILE}:{}),
    ...(progressRepository?{progressSubmission:{
     prepare({command,before,expected,operations,writing,stamp,generation}){
      if(operations.some(p=>p.docId!==documentId))return reject('PROGRESS_DOCUMENT_MISMATCH');
      if(writing.length){const proof=prepareWritingSubmission(before,{profile:ALPHA_REA_WRITING_PROFILE,command,progress:operations,writing},identity.userId,newItemsDocumentId);if(!proof.ok||canonicalJson(proof.value.expected)!==canonicalJson(expected))return reject('WRITING_SUBMISSION_MISMATCH');}
      else if(operations.length){const proof=prepareAlphaReaProgressSubmission(before,{profile:ALPHA_REA_PROGRESS_EDIT_PROFILE,command,progress:operations},identity.userId,newItemsDocumentId);if(!proof.ok||canonicalJson(proof.value.expected)!==canonicalJson(expected))return reject('PROGRESS_SUBMISSION_MISMATCH');}
      else if(!preservesAlphaReaTextEdit(before,{...expected,revision:before.revision},identity.userId,newItemsDocumentId))return reject('UNEXPLAINED_PROGRESS_CHANGE');
      return progressRepository.bindProgressSubmission({command,progress:operations,writing,stamp,generation});
     },
     confirmed:command=>progressRepository.clearProgressSubmission(command),
    }}:{}),
   });
   // A paired reentry obligation must precede ordinary reads/admission. A server
   // already containing expected is not a new baseline for the old request.
   if(recoveryRead?.ok&&recoveryRead.value?.checkpoint){
    const candidate=makeCandidate();inner=candidate;const opened=await candidate.open();
    if(epoch!==generation||closed)return reject('OWNER_READ_RETIRED');
    if(!opened.ok){mode='blocked';return opened;}
    writer=facade(candidate);mode='typed';return{ok:true as const,kind:'typed' as const,writeAllowed:false as const,reentry:'INPUT_RESTORED_LOOKUP_ONLY' as const};
   }
   const result=await reader.read();if(epoch!==generation||closed)return reject('OWNER_READ_RETIRED');
   read=detached(result);
   if(!result.ok){mode='blocked';return reject(result.reason);}
   if(result.kind==='missing'){mode='blocked';return reject('ACCOUNT_CREATION_NOT_SUPPORTED');}
   if(result.kind==='v11-readonly'){mode='v11-readonly';return{ok:true as const,kind:'v11-readonly' as const,writeAllowed:false as const};}
   // Populate the fixed reference port before the exact host captures it. A
   // format/owner change between reads is rejected, never normalized or rebased.
   const latest=await repository.read();if(epoch!==generation||closed)return reject('OWNER_READ_RETIRED');
   if(!latest.ok||canonicalJson(latest.value)!==canonicalJson(result.account)){mode='blocked';return reject('ACCOUNT_CHANGED_DURING_OPEN');}
   const candidate=makeCandidate();
   const opened=await candidate.open();
   if(epoch!==generation||closed){if(opened.ok)candidate.close();return reject('OWNER_READ_RETIRED');}
   if(!opened.ok){mode='blocked';return opened;}
   if(canonicalJson(candidate.inspect().client.state?.confirmed)!==canonicalJson(result.account)){candidate.close();mode='blocked';return reject('ACCOUNT_CHANGED_DURING_OPEN');}
   inner=candidate;writer=facade(candidate);mode='typed';return{ok:true as const,kind:'typed' as const,writeAllowed:false as const};
  }finally{if(epoch===generation)opening=false;}
 }
 return{
  open,currentHost:()=>writer,
   snapshot:()=>({ownerId:identity.userId,documentId,generation,mode,opening,closed,read:detached(read),pendingUnsupported:detached(localBlock),writerProfile:memo?ALPHA_MEMO_BODY_PROFILE:progressEnabled?ALPHA_REA_PROGRESS_EDIT_PROFILE:'rea-body-title/1',actualAppWriteAllowed:false as const}),
  close:retire,
  retireReentryBinding(){if(!input.reentry)return reject('REENTRY_PORT_NOT_PROVIDED');input.reentry.retire();inner?.retireReentryBinding();closed=true;generation++;opening=false;mode='closed';return{ok:true as const};},
 };
}
