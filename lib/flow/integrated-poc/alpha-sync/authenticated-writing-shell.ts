import {createAlphaWritingAccountReader,createAlphaMemoWritingEntryReader,type MemoWritingEntryRead,type VerifiedAlphaSession,type AlphaWritingRead} from '../alpha-auth/account-access';
import {ALPHA_MEMO_BODY_PROFILE} from '../alpha-persistence/memo-cohort';
import {ALPHA_REA_PROGRESS_EDIT_PROFILE} from '../alpha-persistence/rea-progress-edit';
import {ALPHA_REA_NEW_ITEMS_PROFILE} from '../alpha-persistence/rea-text-edit';
import type {AlphaAuthConfig} from '../alpha-auth/config';
import type {ProgramDestination} from '../ui-contract';
import {createAlphaLocalWritingSelector,type AlphaLocalWritingSelector} from './writing-selector';
import {alphaWritingDocuments} from './app-writing-documents';

/** Development connection only. The authenticated SDK identity comes from the
 * existing AuthPanel; transport/document are explicit, never taken from a URL. */
type SelectorInput=Parameters<typeof createAlphaLocalWritingSelector>[0];
export type AlphaAuthenticatedWritingPorts={scope:'local-alpha-auth-writing/1';request:typeof fetch;documentRequest?:(documentId:string,input:Parameters<typeof fetch>[0],init?:Parameters<typeof fetch>[1])=>ReturnType<typeof fetch>;documentId:string;inputOwnerId:string;entityIds:readonly string[];requestId:()=>string;today:string;textProfile?:SelectorInput['textProfile'];newItemsProfile?:SelectorInput['newItemsProfile'];reentry?:SelectorInput['reentry'];supportMode?:SelectorInput['supportMode']};
type WritingRead=AlphaWritingRead|MemoWritingEntryRead;
type Surface={destroy():{ok:boolean;reason?:string}};
type Host=NonNullable<ReturnType<AlphaLocalWritingSelector['currentHost']>>;
export type AlphaWritingShellView={phase:'signed-out'|'checking'|'legacy'|'typed'|'held'|'blocked';ownerId:string|null;documentId:string|null;visible:boolean;active:boolean;canContinue:boolean;reason:string|null;documents:{id:string;title:string}[];selecting:boolean;canSelect:boolean;retryDocumentId:string|null;returnDocumentId:string|null};
const reject=(reason:string)=>({ok:false as const,reason});

/** No new auth or recovery store. A retired identity cannot borrow new tokens.
 * One in-memory editor stays owned by its original owner/document until close
 * succeeds. Token refresh of a dirty owner is HOLD, not an implicit remount. */
export function createAlphaAuthenticatedWritingShell(config:AlphaAuthConfig,ports:AlphaAuthenticatedWritingPorts,mount:(selector:AlphaLocalWritingSelector)=>Promise<Surface>){
 if(ports.scope!=='local-alpha-auth-writing/1'||typeof ports.request!=='function')throw Error('EXPLICIT_AUTH_WRITING_PORTS_REQUIRED');
 if(ports.textProfile!==undefined&&ports.textProfile!==ALPHA_MEMO_BODY_PROFILE&&ports.textProfile!==ALPHA_REA_PROGRESS_EDIT_PROFILE)throw Error('UNSUPPORTED_AUTH_WRITING_PROFILE');
 if(ports.newItemsProfile!==undefined&&(ports.newItemsProfile!==ALPHA_REA_NEW_ITEMS_PROFILE||ports.textProfile===ALPHA_MEMO_BODY_PROFILE))throw Error('UNSUPPORTED_AUTH_NEW_ITEMS_PROFILE');
 if(ports.reentry&&(ports.textProfile===ALPHA_MEMO_BODY_PROFILE||ports.newItemsProfile!==ALPHA_REA_NEW_ITEMS_PROFILE||ports.reentry.binding?.docId!==ports.documentId))throw Error('UNSUPPORTED_AUTH_REENTRY_BINDING');
 const fixedConfig=Object.freeze({...config}),construction=Object.freeze({...ports,entityIds:Object.freeze([...ports.entityIds])}),request=construction.request,entityIds=construction.entityIds;
 const memo=construction.textProfile===ALPHA_MEMO_BODY_PROFILE;
 const reentry=construction.reentry,reentryBinding=reentry?.binding;
 const reentryOwner=reentryBinding?.ownerId,reentryDocument=reentryBinding?.docId,reentrySlot=reentryBinding?.slot;
 // Pin both the supplied port and its original binding; rereading a mutable
 // outer object's binding on both sides would miss in-place replacement.
 const sameReentry=()=>!reentry||reentry.binding===reentryBinding&&reentry.binding.ownerId===reentryOwner&&reentry.binding.docId===reentryDocument&&reentry.binding.slot===reentrySlot;
 const supportsReentry=(identity:Readonly<VerifiedAlphaSession>,docId:string)=>{if(!reentry)return true;if(!sameReentry()||identity.userId!==reentryOwner||docId!==reentryDocument)return false;try{const state=reentry.inspect();return!state.retired&&!state.reason;}catch{return false;}};
 const firstReader=memo?createAlphaMemoWritingEntryReader:createAlphaWritingAccountReader;
 const matchesPorts=(nextConfig:AlphaAuthConfig,next:AlphaAuthenticatedWritingPorts)=>Object.keys(fixedConfig).length===Object.keys(nextConfig).length&&Object.keys(fixedConfig).every(key=>(fixedConfig as any)[key]===(nextConfig as any)[key])&&next.scope===construction.scope&&next.documentId===construction.documentId&&next.textProfile===construction.textProfile&&next.newItemsProfile===construction.newItemsProfile&&next.supportMode===construction.supportMode&&next.reentry===reentry&&sameReentry()&&next.request===request&&next.documentRequest===construction.documentRequest&&next.inputOwnerId===construction.inputOwnerId&&next.requestId===construction.requestId&&next.today===construction.today&&next.entityIds.length===entityIds.length&&next.entityIds.every((id,i)=>id===entityIds[i]);
 type Binding={identity:Readonly<VerifiedAlphaSession>;documentId:string;selector:AlphaLocalWritingSelector;surface:Surface|null;retired:boolean};
 type Continuation={binding:Binding;surface:Surface;host:Host;session:NonNullable<ReturnType<Host['currentSession']>>;inputOwnerId:string;generation:number;configuredDocumentId:string};
 let desired:Readonly<VerifiedAlphaSession>|null=null,documentId=construction.documentId,selectedDocumentId=construction.documentId,selectedOwnerId:string|null=null,generation=0,binding:Binding|null=null,selecting=false;
 let reentryConsumed=false;
 let continuation:Continuation|null=null;
 let admitted:{ownerId:string;kind:'legacy'|'typed'}|null=null;
 let catalog:{ownerId:string;identity:Readonly<VerifiedAlphaSession>;documents:{id:string;title:string}[]}|null=null;
 let view:AlphaWritingShellView={phase:'signed-out',ownerId:null,documentId:null,visible:false,active:false,canContinue:false,reason:null,documents:[],selecting:false,canSelect:false,retryDocumentId:null,returnDocumentId:null};const listeners=new Set<()=>void>();
 const same=(a:Readonly<VerifiedAlphaSession>|null,b:Readonly<VerifiedAlphaSession>)=>!!a&&a.userId===b.userId&&a.accessToken===b.accessToken;
 const current=(b:Binding)=>binding===b&&!b.retired&&same(desired,b.identity)&&documentId===b.documentId&&supportsReentry(b.identity,b.documentId);
 const continuationReady=()=>{const c=continuation;return!!c&&generation===c.generation&&current(c.binding)&&c.binding.surface===c.surface&&c.binding.selector.currentHost()===c.host&&c.host.currentSession()===c.session&&c.session.inputOwnerId===c.inputOwnerId&&c.session.docId===c.binding.documentId&&!c.session.diagnostics().closed;};
 const emit=(phase:AlphaWritingShellView['phase'],reason:string|null=null)=>{
  const canSelect=!!desired&&!!catalog&&same(desired,catalog.identity)&&(phase==='typed'&&!!binding?.surface&&current(binding)||phase==='blocked'&&binding===null);
  const failedMount=canSelect&&phase==='blocked'&&reason==='AUTH_WRITING_MOUNT_FAILED';
  view={phase,ownerId:desired?.userId??null,documentId:desired?(desired.userId===selectedOwnerId?selectedDocumentId:documentId):null,visible:!!binding?.surface&&desired?.userId===binding.identity.userId&&documentId===binding.documentId,active:phase==='typed'&&!!binding&&current(binding),canContinue:phase==='held'&&continuationReady(),reason,documents:catalog&&desired?.userId===catalog.ownerId?catalog.documents.map(row=>({...row})):[],selecting,canSelect,
   retryDocumentId:failedMount&&catalog?.documents.some(row=>row.id===documentId)?documentId:null,
   returnDocumentId:failedMount&&desired?.userId===selectedOwnerId&&catalog?.documents.some(row=>row.id===selectedDocumentId)?selectedDocumentId:null};
  for(const listener of listeners)listener();
 };
 // Default working-document scope matches ProgramSpace. This projection holds
 // display IDs/titles only, never a second authoritative input or model.
 const documents=(read:Extract<WritingRead,{kind:'rea-edit-profile'|'rea-memo-profile'}>)=>alphaWritingDocuments(read.kind==='rea-memo-profile'?read.projected.space:read.account.space);
 function retire(){if(!binding)return{ok:true as const};const b=binding,result=b.surface?b.surface.destroy():b.selector.close();if(!result.ok)return reject(result.reason??'UNSAVED_OWNER_HOLD');b.retired=true;if(binding===b)binding=null;return{ok:true as const};}
 function close(userRequest=false,configuredDocumentId=construction.documentId){
  const b=binding,host=b?.selector.currentHost(),session=host?.currentSession();continuation=null;const result=retire();
  if(!result.ok){
   // Retire earlier navigation reads while keeping this input/ACK binding live.
   generation++;
   // Only a refused user sign-out can resume this exact live input. Cleanup or
   // an actual identity/context transition never grants this evidence.
   if(userRequest&&b?.surface&&host&&session&&current(b)&&b.selector.currentHost()===host&&host.currentSession()===session)
    continuation={binding:b,surface:b.surface,host,session,inputOwnerId:session.inputOwnerId,generation,configuredDocumentId};
   emit('held','SESSION_CHANGE_INPUT_HOLD');return result;
  }
  generation++;desired=null;admitted=null;emit('signed-out');return result;
 }
 function matchesInput(nextConfig:AlphaAuthConfig,nextPorts:AlphaAuthenticatedWritingPorts,identity:VerifiedAlphaSession|null,docId:string){return!!identity&&!!binding?.surface&&current(binding)&&same(identity,binding.identity)&&docId===binding.documentId&&matchesPorts(nextConfig,nextPorts);}
 function requestSignOut(nextConfig:AlphaAuthConfig,nextPorts:AlphaAuthenticatedWritingPorts,identity:VerifiedAlphaSession|null,docId:string){return matchesInput(nextConfig,nextPorts,identity,docId)?close(true,nextPorts.documentId):reject('AUTH_INPUT_OWNER_HOLD');}
 function continueWriting(nextConfig:AlphaAuthConfig,nextPorts:AlphaAuthenticatedWritingPorts,identity:VerifiedAlphaSession|null,docId:string){
  if(view.phase!=='held'||!continuationReady()||!matchesInput(nextConfig,nextPorts,identity,docId)||nextPorts.documentId!==continuation!.configuredDocumentId)return reject('AUTH_INPUT_OWNER_HOLD');
  // Interactivity only: no read, save, new owner, focus, selection or ACK change.
  continuation=null;emit('typed');return{ok:true as const};
 }
 async function bindContext(identity:VerifiedAlphaSession|null,nextDocumentId=documentId,prepared?:WritingRead){
  if(identity&&reentry&&!supportsReentry(identity,nextDocumentId)){
   continuation=null;++generation;
   // An incompatible document request keeps the old compatible document live;
   // an identity or binding drift suspends it without retiring its input.
   if(binding?.surface&&same(identity,binding.identity)&&supportsReentry(identity,binding.documentId)){desired=Object.freeze({...binding.identity});documentId=binding.documentId;emit('typed','AUTH_REENTRY_BINDING_HOLD');}
   else{desired=Object.freeze({...identity});documentId=nextDocumentId;emit(binding?.surface?'held':'blocked','AUTH_REENTRY_BINDING_HOLD');}
   return reject('AUTH_REENTRY_BINDING_HOLD');
  }
  if(identity&&reentry&&reentryConsumed&&!(binding?.surface&&current(binding)&&same(identity,binding.identity)&&nextDocumentId===binding.documentId)){
   // The supplied recovery port has a single bindCheckpoint owner and no
   // unbind API. Do not destroy a clean old surface then fail a second mount,
   // or silently manufacture a replacement port for a refreshed identity.
   continuation=null;desired=Object.freeze({...identity});documentId=nextDocumentId;++generation;
   emit(binding?.surface?'held':'blocked','AUTH_REENTRY_PORT_LIFETIME_HOLD');return reject('AUTH_REENTRY_PORT_LIFETIME_HOLD');
  }
  // An equal-context render is not an explicit cancel of the refused logout.
  if(continuationReady()&&identity&&same(desired,identity)&&nextDocumentId===documentId){emit('held',view.reason);return reject('EXPLICIT_CONTINUE_REQUIRED');}
  continuation=null;const wasHeld=view.phase==='held';
  // A document request must not first commit B and suspend A's input/ACK ports.
  // Identity changes retain the existing hide/inert policy.
  const previous=binding;
  if(!wasHeld&&previous?.surface&&same(identity,previous.identity)&&nextDocumentId!==previous.documentId){
   const unavailable=!catalog||!identity||catalog.ownerId!==identity.userId||!catalog.documents.some(row=>row.id===nextDocumentId);
   const closed=unavailable?reject('DOCUMENT_NOT_AVAILABLE'):!previous.selector.currentHost()?.canLeave()?reject('DOCUMENT_CHANGE_INPUT_HOLD'):retire();
   if(!closed.ok){desired=Object.freeze({...previous.identity});documentId=previous.documentId;++generation;emit('typed',unavailable?'DOCUMENT_NOT_AVAILABLE':'DOCUMENT_CHANGE_INPUT_HOLD');return closed;}
  }
  desired=identity?Object.freeze({...identity}):null;documentId=nextDocumentId;const epoch=++generation;
  if(binding&&current(binding)&&binding.surface){if(wasHeld){emit('held','SESSION_CHANGE_INPUT_HOLD');return reject('AUTH_INPUT_OWNER_HOLD');}emit('typed');return{ok:true as const,kind:'typed' as const};}
  if(binding){const closed=retire();if(!closed.ok){emit('held',same(desired,binding.identity)&&documentId!==binding.documentId?'DOCUMENT_CHANGE_INPUT_HOLD':'SESSION_CHANGE_INPUT_HOLD');return closed;}}
  if(!desired){admitted=null;emit('signed-out');return{ok:true as const,kind:'signed-out' as const};}
  const fixed=desired;
  if(!fixed.userId||!fixed.accessToken){emit('blocked','INVALID_AUTH_WRITING_CONTEXT');return reject('INVALID_AUTH_WRITING_CONTEXT');}
  if(admitted&&admitted.ownerId!==fixed.userId)admitted=null;
  // A same-owner SDK token refresh is verified by the existing legacy repository.
  // Keep its React subtree mounted; do not reclassify an active input lifetime.
  if(admitted?.kind==='legacy'){catalog=null;emit('legacy');return{ok:true as const,kind:'legacy' as const};}
  emit('checking');
  const currentRead=()=>generation===epoch&&same(desired,fixed);
  const first=prepared??await firstReader(fixedConfig,fixed,async(input,init)=>{if(!currentRead())throw Error('RETIRED_AUTH_READ');const result=await request(input,init);if(!currentRead())throw Error('RETIRED_AUTH_READ');return result;}).read();
  if(!currentRead())return reject('AUTH_READ_RETIRED');
  if(!first.ok){emit('blocked',first.reason);return first;}
  if(first.kind==='missing'){emit('blocked','ACCOUNT_CREATION_NOT_SUPPORTED');return reject('ACCOUNT_CREATION_NOT_SUPPORTED');}
  if(first.kind==='v11-readonly'){
   if(admitted?.kind==='typed'){emit('blocked','ADMITTED_TYPED_PROFILE_CHANGED');return reject('ADMITTED_TYPED_PROFILE_CHANGED');}
   admitted={ownerId:fixed.userId,kind:'legacy'};catalog=null;emit('legacy');return{ok:true as const,kind:'legacy' as const};
  }
  const choices=documents(first);
  admitted={ownerId:fixed.userId,kind:'typed'};
  // A verified catalog must remain reachable even if the configured initial
  // document is gone. Selection is explicit; never pick the first document.
  catalog={ownerId:fixed.userId,identity:fixed,documents:choices};
  if(!choices.some(row=>row.id===documentId)){emit('blocked','DOCUMENT_NOT_AVAILABLE');return reject('DOCUMENT_NOT_AVAILABLE');}
  let b:Binding;
  const scopedRequest:typeof fetch=async(input,init)=>{if(!current(b))throw Error('RETIRED_AUTH_TRANSPORT');const result=await(construction.documentRequest?construction.documentRequest(b.documentId,input,init):request(input,init));if(!current(b))throw Error('RETIRED_AUTH_TRANSPORT');return result;};
  if(reentry)reentryConsumed=true;
  const selectedText=first.kind==='rea-memo-profile'?first.projected.space.text:first.account.space.text;
  const usedIds=new Set([...Object.keys(selectedText.documents),...Object.values(selectedText.documents).flatMap(d=>d.order),...Object.keys(selectedText.tasks),...Object.keys(selectedText.schedules),...Object.keys(selectedText.folders)]);
  const availableIds=construction.documentRequest&&!reentry?entityIds.filter(id=>!usedIds.has(id)):entityIds;
  const original=createAlphaLocalWritingSelector({scope:'local-alpha-writing/1',config:fixedConfig,identity:fixed,request:scopedRequest,documentId,inputOwnerId:construction.inputOwnerId+'-'+epoch,entityIds:availableIds,requestId:construction.requestId,textProfile:memo?ALPHA_MEMO_BODY_PROFILE:ALPHA_REA_PROGRESS_EDIT_PROFILE,...(construction.newItemsProfile!==undefined?{newItemsProfile:construction.newItemsProfile}:{}),...(reentry?{reentry}:{}),...(construction.supportMode?{supportMode:construction.supportMode}:{})});
  let guarded:Host|null=null;
  const allowed=()=>current(b);
  const retireReentry=()=>{
   if(!allowed())return reject('AUTH_INPUT_OWNER_HOLD');
   if(!reentry)return reject('REENTRY_PORT_NOT_PROVIDED');
   // The surface owns unsubmitted UI input too. Never retire its adapter first
   // or turn a refused close into a successful synthetic lifecycle shortcut.
   const closed=retire();if(!closed.ok)return closed;
   const result=original.retireReentryBinding();continuation=null;++generation;emit('blocked','AUTH_REENTRY_BINDING_HOLD');return result;
  };
  const guardHost=(host:Host):Host=>guarded??(guarded={...host,
   save:()=>allowed()?host.save():Promise.resolve(reject('AUTH_INPUT_OWNER_HOLD')),
   retryRejected:()=>allowed()?host.retryRejected():Promise.resolve(reject('AUTH_INPUT_OWNER_HOLD')),
   confirmPending:retry=>allowed()?host.confirmPending(retry):Promise.resolve(reject('AUTH_INPUT_OWNER_HOLD')),
   reopen:()=>allowed()?host.reopen():Promise.resolve(reject('AUTH_INPUT_OWNER_HOLD')),
   flush:()=>allowed()?host.flush():Promise.resolve(false),
   recordProgress:(...args)=>allowed()?host.recordProgress(...args):reject('AUTH_INPUT_OWNER_HOLD'),
   checkpointInput:()=>allowed()?host.checkpointInput():reject('AUTH_INPUT_OWNER_HOLD'),
   retireReentryBinding:retireReentry,
  });
  const selector:AlphaLocalWritingSelector={...original,
   async open(){if(!allowed())return reject('AUTH_INPUT_OWNER_HOLD');const selected=await original.open();if(!allowed())return reject('AUTH_INPUT_OWNER_HOLD');return selected.ok&&selected.kind==='typed'?{...selected,host:guardHost(selected.host)}:selected;},
   currentHost:()=>{const host=original.currentHost();return host?guardHost(host):null;},
   retireReentryBinding:retireReentry,
  };
  b={identity:fixed,documentId,selector,surface:null,retired:false};binding=b;
  try{const surface=await mount(selector);b.surface=surface;if(!current(b)||generation!==epoch){if(binding===b){const closed=retire();if(!closed.ok)emit('held','SESSION_CHANGE_INPUT_HOLD');}else surface.destroy();return reject('AUTH_MOUNT_RETIRED');}selectedOwnerId=b.identity.userId;selectedDocumentId=b.documentId;emit('typed');return{ok:true as const,kind:'typed' as const};}
  catch{if(binding===b){const closed=retire();emit(closed.ok?'blocked':'held',closed.ok?'AUTH_WRITING_MOUNT_FAILED':'SESSION_CHANGE_INPUT_HOLD');}return reject('AUTH_WRITING_MOUNT_FAILED');}
 }
 async function navigate(next:ProgramDestination){
  if(next.view!=='space'||!next.id||Object.keys(next).some(key=>key!=='view'&&key!=='id'))return reject('UNSUPPORTED_DOCUMENT_NAVIGATION');
  const targetId=next.id;
  const b=binding,identity=desired;
  const recovery=b===null&&view.phase==='blocked'&&view.canSelect;
  if(!identity||!(b?.surface&&current(b)&&view.phase==='typed'||recovery))return reject('AUTH_INPUT_OWNER_HOLD');
  if(selecting)return reject('DOCUMENT_SELECTION_BUSY');
  if(b&&targetId===b.documentId)return{ok:true as const,kind:'typed' as const};
  const hold=(reason:string)=>{emit(b?'typed':'blocked',reason);return reject(reason);};
  if(!supportsReentry(identity,targetId))return hold('AUTH_REENTRY_BINDING_HOLD');
  if(!catalog||catalog.ownerId!==identity.userId||!catalog.documents.some(row=>row.id===targetId))return hold('DOCUMENT_NOT_AVAILABLE');
  const host=b?.selector.currentHost(),stamp=host?.currentSession()?.submissionStamp();
  if(b&&(!host||!stamp||!host.canLeave()))return hold('DOCUMENT_CHANGE_INPUT_HOLD');
  const before=stamp?{...stamp}:null,epoch=generation;
  const stillCurrent=()=>generation===epoch&&same(desired,identity)&&(b?current(b):binding===null);
  selecting=true;emit(b?'typed':'blocked',view.reason);
  try{
   // Keep A live during target validation. No autosave, input lock, eager
   // selection commit, or second mounted input owner.
   const first=await firstReader(fixedConfig,identity,async(input,init)=>{if(!stillCurrent())throw Error('RETIRED_DOCUMENT_READ');const result=await request(input,init);if(!stillCurrent())throw Error('RETIRED_DOCUMENT_READ');return result;}).read();
   if(!stillCurrent())return reject('DOCUMENT_READ_RETIRED');
   const after=host?.currentSession()?.submissionStamp();
   if(b&&(!host||!before||b.selector.currentHost()!==host||!after||Object.keys(before).some(key=>(before as any)[key]!==(after as any)[key])||!host.canLeave()))return hold('DOCUMENT_CHANGE_INPUT_HOLD');
   if(!first.ok)return hold('DOCUMENT_READ_FAILED');
   if(first.kind!=='rea-edit-profile'&&first.kind!=='rea-memo-profile')return hold('DOCUMENT_PROFILE_CHANGED');
   if(recovery)catalog={ownerId:identity.userId,identity,documents:documents(first)};
   if(!documents(first).some(row=>row.id===targetId))return hold('DOCUMENT_NOT_AVAILABLE');
   return await bindContext(identity,targetId,first);
  }finally{selecting=false;emit(view.phase,view.reason);}
 }
 return{bind:(identity:VerifiedAlphaSession|null,nextDocumentId?:string)=>bindContext(identity,nextDocumentId??(identity?identity.userId===selectedOwnerId?selectedDocumentId:construction.documentId:documentId)),navigate,matchesPorts,matchesSession:(identity:VerifiedAlphaSession|null)=>!!desired&&same(identity,desired),matchesIdentity:(identity:VerifiedAlphaSession|null,docId:string)=>!!binding&&current(binding)&&same(identity,binding.identity)&&docId===binding.documentId,snapshot:()=>({...view,documents:view.documents.map(row=>({...row}))}),currentSelector:()=>binding?.selector??null,
  close:()=>close(),requestSignOut,continueWriting,
  subscribe(listener:()=>void){listeners.add(listener);listener();return()=>{listeners.delete(listener);};},
 };
}
