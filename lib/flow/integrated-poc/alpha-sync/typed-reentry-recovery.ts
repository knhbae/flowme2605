import type {AlphaAccount,AlphaRecovery,AlphaRecoveryPort,AlphaReferenceContext,AlphaReceipt,AlphaPrivateCommand} from '../alpha-persistence/contract';
import {validateAlphaRecovery} from '../alpha-persistence/local-recovery';
import {canonicalJson,detached,parseAlphaJson} from '../alpha-persistence/json';
import {programShape,programIdentifier} from '../program-data';
import {isAlphaReaEditAccount,alphaReaOwnerReferences,preservesAlphaReaTextEdit,projectAlphaReaTextEdit} from '../alpha-persistence/rea-text-edit';
import {prepareAlphaReaProgressEdit,type AlphaReaProgressOperation} from '../alpha-persistence/rea-progress-edit';
import {isAlphaReaTextEditCommand} from '../alpha-persistence/rea-text-edit';
import {isAlphaWireReceipt} from './wire';
import {validateReaStoredText,type ReaStoredText,type ReaStoredSpace} from '../rea-stored-text';
import type {ReaInputCheckpoint} from '../rea-pm/src/tagged-session';

type Account=AlphaAccount<ReaStoredSpace>;
type Command=AlphaPrivateCommand&{kind:'change-private'};
export type ReaReentryAttempt={command:Command;commandJson:string;before:Account;expected:Account;references:AlphaReferenceContext;stamp:{inputOwnerId:string;docId:string;inputRevision:number;semanticRevision:number;compositionEpoch:number};generation:number;operations:AlphaReaProgressOperation[];receipt:AlphaReceipt|null};
export type ReaReentryCheckpoint={latest:ReaInputCheckpoint;attempt:ReaReentryAttempt|null};
export type ReaReentryEnvelope={schema:'rea-typed-reentry/1';ownerId:string;docId:string;slot:string;protocol:AlphaRecovery<ReaStoredSpace>;checkpoint:ReaReentryCheckpoint|null};
/** Explicit injected CAS port only. No browser storage, file IO or defaults. */
export type ReaReentryStore={read(slot:string):string|null;compareAndSwap(slot:string,observed:string|null,next:string):boolean};
const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
const fail=(reason:string)=>({ok:false as const,reason});
const safeCount=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
const ids=(v:unknown):v is string[]=>Array.isArray(v)&&new Set(v).size===v.length&&v.every(programIdentifier);
export function isReaInputCheckpoint(value:unknown,docId:string):value is ReaInputCheckpoint{
 try{
  if(!programShape(value,['schema','docId','inputOwnerId','inputOwnerIds','snapshot','entityPool','allocated','reservedIds','usedRequestIds'])||value.schema!=='rea-input-checkpoint/1'||value.docId!==docId||!programIdentifier(value.inputOwnerId)||!ids(value.inputOwnerIds)||!value.inputOwnerIds.includes(value.inputOwnerId)||!validateReaStoredText(value.snapshot)||!Object.hasOwn(value.snapshot.documents,docId)||!Array.isArray(value.entityPool)||!value.entityPool.every(programIdentifier)||!safeCount(value.allocated)||Number(value.allocated)>value.entityPool.length||!ids(value.reservedIds)||!ids(value.usedRequestIds))return false;
  const reserved=value.reservedIds;
  return value.entityPool.slice(0,Number(value.allocated)).every(id=>reserved.includes(id));
 }catch{return false;}
}
export function exactReentryReceipt(a:ReaReentryAttempt,r:unknown):r is AlphaReceipt{
 return isAlphaWireReceipt(r)&&r.requestId===a.command.requestId&&r.kind==='change-private'&&r.revision===a.expected.revision&&r.changed===(a.expected.revision!==a.before.revision);
}
function validAttempt(a:unknown,owner:string,doc:string):a is ReaReentryAttempt{
 try{
  const references=alphaReaOwnerReferences(owner);
  if(!programShape(a,['command','commandJson','before','expected','references','stamp','generation','operations','receipt'])||!isAlphaReaTextEditCommand(a.command)||a.commandJson!==canonicalJson(a.command)||!same(a.references,references)||!isAlphaReaEditAccount(a.before,owner,references)||!isAlphaReaEditAccount(a.expected,owner,references)||a.command.expectedRevision!==a.before.revision||!Object.hasOwn(a.before.space.text.documents,doc)||!programShape(a.stamp,['inputOwnerId','docId','inputRevision','semanticRevision','compositionEpoch'])||a.stamp.docId!==doc||!programIdentifier(a.stamp.inputOwnerId)||!safeCount(a.generation)||!Array.isArray(a.operations))return false;
  const stamp=a.stamp;
  if(!['inputRevision','semanticRevision','compositionEpoch'].every(k=>safeCount(stamp[k])))return false;
  const change=a.command.changes[0];if(!change.present)return false;
  const proposed={...detached(a.before),space:{...detached(a.before.space),text:detached(change.value)}};
  const changed=!same(proposed.space,a.before.space);proposed.revision=a.before.revision+(changed?1:0);
  if(!same(proposed,a.expected))return false;
  if(a.operations.some(p=>!p||p.docId!==doc))return false;
  if(a.operations.length){const proof=prepareAlphaReaProgressEdit({before:a.before,ownerId:owner,requestId:a.command.requestId,text:proposed.space.text,progress:a.operations,newItemsDocumentId:doc});if(!proof.ok||!same(proof.value.expected,a.expected))return false;}
  else if(!preservesAlphaReaTextEdit(a.before,{...a.expected,revision:a.before.revision},owner,doc))return false;
  return a.receipt===null||exactReentryReceipt(a as ReaReentryAttempt,a.receipt);
 }catch{return false;}
}
/** Retain serializable latest input even when its extra progress has no restored
 * witness. Validate identity/structure; do not infer permission to save records. */
function validLatest(base:Account,latest:ReaStoredText,owner:string,doc:string){
 const claimed={...detached(base),space:{...detached(base.space),text:detached(latest)}};
 const projected=projectAlphaReaTextEdit(base,claimed,owner,doc);if(!projected)return false;
 for(const[id,t]of Object.entries(projected.space.text.tasks)){const actual=claimed.space.text.tasks[id];if(!actual)return false;actual.currentPercent=t.currentPercent;actual.progressRecords=detached(t.progressRecords);}
 return same(projected,claimed);
}
export function reentryProgressUnproven(base:ReaStoredText,latest:ReaStoredText){return Object.entries(latest.tasks).some(([id,t])=>{const old=base.tasks[id];return old?!same({currentPercent:t.currentPercent,progressRecords:t.progressRecords},{currentPercent:old.currentPercent,progressRecords:old.progressRecords}):t.currentPercent!==0||t.progressRecords.length>0;});}
export function validateReaReentryEnvelope(value:unknown,binding:{ownerId:string;docId:string;slot:string}):value is ReaReentryEnvelope{
 try{
  if(!programShape(value,['schema','ownerId','docId','slot','protocol','checkpoint'])||value.schema!=='rea-typed-reentry/1'||value.ownerId!==binding.ownerId||value.docId!==binding.docId||value.slot!==binding.slot||!validateAlphaRecovery<ReaStoredSpace>(value.protocol,binding.ownerId,(v,o,r):v is Account=>!!r&&same(r,alphaReaOwnerReferences(o))&&isAlphaReaEditAccount(v,o,r)))return false;
  const p=value.protocol,c=value.checkpoint;
  if(c===null)return !p.pending&&!p.draft;
  if(!programShape(c,['latest','attempt'])||!isReaInputCheckpoint(c.latest,binding.docId)||!p.confirmed)return false;
  const a=c.attempt;if(a!==null&&!validAttempt(a,binding.ownerId,binding.docId))return false;
  if(p.pending||p.draft){
   if(!a||!same(p.confirmed,a.before)||!same(p.references,a.references)||!same(p.pending??p.draft,a.command)||p.pending&&!same(p.draft,a.command))return false;
  }else if(a&&(!same(p.confirmed,a.expected)||!same(p.references,a.references)||(a.expected.revision!==a.before.revision&&!a.receipt)))return false;
  const base=p.pending&&a?a.expected:p.confirmed;
  return validLatest(base,c.latest.snapshot,binding.ownerId,binding.docId);
 }catch{return false;}
}

export function createAlphaTypedReentryRecovery(input:{ownerId:string;documentId:string;slot:string;store:ReaReentryStore;required?:boolean}){
 const binding=Object.freeze({ownerId:input.ownerId,docId:input.documentId,slot:input.slot});
 if(!Object.values(binding).every(programIdentifier))throw Error('INVALID_REENTRY_BINDING');
 const store=input.store;let observed:string|null|undefined,record:ReaReentryEnvelope|null=null,reason:string|null=null,retired=false,provider:(()=>ReaReentryCheckpoint|null)|null=null;
 function probe(){
  if(retired||reason)return fail(retired?'REENTRY_BINDING_RETIRED':reason!);
  try{
   const raw=store.read(binding.slot);
   if(retired)return fail('REENTRY_BINDING_RETIRED');
   if(observed!==undefined&&raw!==observed){reason='REENTRY_OBSERVATION_CONFLICT';return fail(reason);}
   if(raw===null){if(input.required){reason='REENTRY_EVIDENCE_MISSING';return fail(reason);}observed=null;record=null;return{ok:true as const,value:null};}
   if(typeof raw!=='string')throw Error('INVALID_REENTRY_EVIDENCE');
   const decoded=parseAlphaJson(raw);if(!validateReaReentryEnvelope(decoded,binding))throw Error('INVALID_REENTRY_EVIDENCE');
   observed=raw;record=detached(decoded);return{ok:true as const,value:detached(record)};
  }catch{reason='INVALID_REENTRY_EVIDENCE';return fail(reason);}
 }
 function persist(protocol:AlphaRecovery<ReaStoredSpace>){
  const current=probe();if(!current.ok||!provider)return false;
  try{
   let checkpoint=provider();
   // Preserve the resolved original witness until a later real attempt replaces
   // it; latest input is a separate value, never cleared with protocol pending.
   const previous=record?.checkpoint?.attempt;
   if(checkpoint&&!checkpoint.attempt&&previous&&!protocol.pending&&!protocol.draft&&same(protocol.confirmed,previous.expected))checkpoint={...checkpoint,attempt:detached(previous)};
   const next:ReaReentryEnvelope={schema:'rea-typed-reentry/1',...binding,protocol:detached(protocol),checkpoint:detached(checkpoint)};
   if(!validateReaReentryEnvelope(next,binding))return false;
   const raw=canonicalJson(next);
   if(retired)return false;
   const beforeCommit=store.read(binding.slot);
   if(retired)return false;
   if(beforeCommit!==observed){reason='REENTRY_COMMIT_CONFLICT';return false;}
   const committed=store.compareAndSwap(binding.slot,observed!,raw);
   // A supplied port may synchronously retire this owner. A committed byte
   // value is not permission for that retired client to publish success.
   if(retired)return false;
   if(!committed){reason='REENTRY_COMMIT_CONFLICT';return false;}
   const afterCommit=store.read(binding.slot);
   if(retired)return false;
   if(afterCommit!==raw){reason='REENTRY_COMMIT_CONFLICT';return false;}
   observed=raw;record=next;return true;
  }catch{reason='REENTRY_CHECKPOINT_WRITE_FAILED';return false;}
 }
 const protocol:AlphaRecoveryPort<ReaStoredSpace>={load(owner){if(owner!==binding.ownerId)return{ok:false};const r=probe();return r.ok?{ok:true,value:detached(r.value?.protocol??null)}:{ok:false};},save:persist};
 return{
  binding,protocol,probe,
  bindCheckpoint(next:()=>ReaReentryCheckpoint|null){if(provider)return false;provider=next;return true;},
  checkpointInput(){return record?persist(record.protocol):false;},
  retire(){retired=true;},
  inspect:()=>({binding,retired,reason,observed:observed!==undefined,checkpointPresent:!!record?.checkpoint}),
 };
}
export type AlphaTypedReentryRecovery=ReturnType<typeof createAlphaTypedReentryRecovery>;
