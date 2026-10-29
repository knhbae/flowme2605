import {canonicalJson,detached} from '../alpha-persistence/json';
import {freezeStored,validateReaStoredText,validateReaOrderedStoredText,type DeepReadonly,type ReaStoredText,type ReaOrderedStoredText,type ReaStoredOccurrence} from '../rea-stored-text';
import {candidate} from './tagged-input-grammar';

export type TaggedDocument=ReaStoredText['documents'][string];
export type DocumentBody=Pick<TaggedDocument,'blocks'|'order'>;
type Rejected={ok:false;reason:string};
const reject=(reason:string):Rejected=>({ok:false,reason});
/** Keep all identities and structural attributes exact; ordinary input changes text only. */
export function sameStructure(a:DocumentBody,b:DocumentBody){
  if(canonicalJson(a.order)!==canonicalJson(b.order))return false;
  return a.order.every(id=>{
    const x=a.blocks[id],y=b.blocks[id];if(!x||!y||x.kind==='folderLink'&&x.text!==y.text)return false;
    const {text:_x,...ax}=x,{text:_y,...ay}=y;return canonicalJson(ax)===canonicalJson(ay);
  })&&Object.keys(b.blocks).length===a.order.length;
}
/** Derive a disposable validated snapshot from the sole live PM body. Never normalize it. */
export function projectTagged<T extends ReaStoredText|ReaOrderedStoredText>(base:T,docId:string,body:DocumentBody):{ok:true;snapshot:T}|Rejected {
  const original=base.documents[docId];if(!original||!sameStructure(original,body))return reject('UNSUPPORTED_STRUCTURE');
  const next=detached(base);
  next.documents[docId]={...next.documents[docId],...detached(body)};
  for(const id of body.order){const b=body.blocks[id];
    if(b.kind==='task')next.tasks[b.entityId!].title=b.text.split('\n',1)[0].trim();
    if(b.kind==='schedule')next.schedules[b.entityId!].title=b.text.split('\n',1)[0].trim();
  }
  // Includes empty-title and other-occurrence references to a shared entity.
  if(!(base.schema==='flowme-rea-text/2'?validateReaOrderedStoredText(next):validateReaStoredText(next)))return reject('UNSERIALIZABLE_DRAFT_OR_SHARED_TITLE');
  return{ok:true,snapshot:next};
}
export function ownedIds(value:ReaStoredText){
  return new Set([...Object.keys(value.documents),...Object.keys(value.tasks),...Object.keys(value.schedules),...Object.keys(value.folders),...Object.values(value.documents).flatMap(d=>d.order)]);
}
/** Explicit append allocation only; ordinary PM input and projectTagged retain
 * their exact-structure guard. No conversion, copied history, or implicit ID. */
export function appendTagged(base:ReaStoredText,docId:string,occurrenceId:string,kind:'memo'|'task',text:string,entityId:string|null,afterOccurrenceId?:string){
 const validId=(v:unknown):v is string=>typeof v==='string'&&!!v.trim()&&!['__proto__','prototype','constructor'].includes(v);
 if(!validateReaStoredText(base)||!Object.hasOwn(base.documents,docId)||!['memo','task'].includes(kind)||typeof text!=='string')return reject('INVALID_APPEND_TARGET');
 const owned=ownedIds(base);
 if(!validId(occurrenceId)||owned.has(occurrenceId))return reject('OCCURRENCE_ID_COLLISION_OR_INVALID');
 if(kind==='task'&&(!validId(entityId)||owned.has(entityId)||entityId===occurrenceId))return reject('ENTITY_ID_COLLISION_OR_INVALID');
 if(kind==='memo'&&entityId!==null)return reject('MEMO_ENTITY_NOT_ALLOWED');
 const next=detached(base),document=next.documents[docId];
 if(afterOccurrenceId!==undefined){
  if(kind!=='memo')return reject('INSERT_MEMO_ONLY');
  const origin={docId,afterOccurrenceId,nextOccurrenceId:document.order[document.order.indexOf(afterOccurrenceId)+1]??null,block:{kind:'memo' as const,text,entityId:null,folderId:null}};
  if(next.insertionOrigins?.[occurrenceId]&&canonicalJson(next.insertionOrigins[occurrenceId])!==canonicalJson(origin))return reject('INSERT_ORIGIN_CONFLICT');
  next.insertionOrigins??={};next.insertionOrigins[occurrenceId]=origin;
 }
 const index=afterOccurrenceId===undefined?document.order.length:document.order.indexOf(afterOccurrenceId)+1;if(afterOccurrenceId!==undefined&&index===0)return reject('INSERT_ANCHOR_MISSING');document.order.splice(index,0,occurrenceId);document.blocks[occurrenceId]={kind,text,entityId,folderId:null};
 if(kind==='task')next.tasks[entityId!]={title:text.split('\n',1)[0].trim(),currentPercent:0,parentTaskId:null,progressRecords:[]};
 if(!validateReaStoredText(next))return reject('UNSUPPORTED_APPEND');
 return{ok:true as const,snapshot:freezeStored(next),occurrenceId,entityId};
}
/** Inverse of this session's unsaved append only. The caller must separately
 * prove source/host permission; saved or changed records are never deleted. */
export function removeTaggedAppend(base:ReaStoredText,docId:string,occurrenceId:string,block:DeepReadonly<ReaStoredText['documents'][string]['blocks'][string]>,task:DeepReadonly<ReaStoredText['tasks'][string]>|null,afterOccurrenceId?:string){
 if(!validateReaStoredText(base))return reject('INVALID_APPEND_PREIMAGE');
 const document=base.documents[docId],actual=document?.blocks[occurrenceId];
 if(!actual||(afterOccurrenceId===undefined?document.order.at(-1)!==occurrenceId:document.order.indexOf(occurrenceId)!==document.order.indexOf(afterOccurrenceId)+1||!document.blocks[afterOccurrenceId])||document.order.length<2||canonicalJson(actual)!==canonicalJson(block)||!['memo','task'].includes(actual.kind))return reject('APPEND_PREIMAGE_MISMATCH');
 if(afterOccurrenceId!==undefined){const origin=base.insertionOrigins?.[occurrenceId];if(!origin||origin.docId!==docId||origin.afterOccurrenceId!==afterOccurrenceId||canonicalJson(origin.block)!==canonicalJson(block)||origin.nextOccurrenceId!==(document.order[document.order.indexOf(occurrenceId)+1]??null))return reject('UNPROVEN_INSERT_ORIGIN');}
 if(actual.kind==='task'){
  if(!task||canonicalJson(base.tasks[actual.entityId!])!==canonicalJson(task)||task.currentPercent!==0||task.progressRecords.length||task.parentTaskId!==null)return reject('APPEND_RECORDS_MUST_BE_PRESERVED');
  if(Object.values(base.documents).some(d=>d.order.some(id=>(d!==document||id!==occurrenceId)&&d.blocks[id].entityId===actual.entityId)))return reject('APPEND_ENTITY_HAS_OTHER_REFERENCE');
 }else if(task!==null)return reject('MEMO_ENTITY_NOT_ALLOWED');
 const next=detached(base);next.documents[docId].order.splice(next.documents[docId].order.indexOf(occurrenceId),1);delete next.documents[docId].blocks[occurrenceId];
 if(actual.kind==='task')delete next.tasks[actual.entityId!];
 if(!validateReaStoredText(next))return reject('UNSUPPORTED_APPEND_INVERSE');
 return{ok:true as const,snapshot:freezeStored(next)};
}
export type TaggedConfirmationReceipt={docId:string;occurrenceId:string;kind:'task'|'schedule';entityId:string;before:ReaStoredOccurrence;after:ReaStoredOccurrence;entity:DeepReadonly<ReaStoredText['tasks'][string]|ReaStoredText['schedules'][string]>;explicit?:{plannedDate:string|null;commandToken:string}};
/** Replay only this confirmation's exact target delta. Unrelated data is always
 * taken from the current snapshot; history never restores an old workspace. */
export function replayTaggedConfirmation(base:ReaStoredText,receipt:DeepReadonly<TaggedConfirmationReceipt>,confirming:boolean){
 if(!validateReaStoredText(base)||!receipt||!['task','schedule'].includes(receipt.kind)||receipt.before?.kind!=='memo')return reject('UNDO_CONFLICT');
 const observed=receipt.explicit?explicitCandidate(receipt.before.text,receipt.kind,receipt.explicit):candidate(receipt.before.text,receipt.kind);
 if(observed.status!=='CANDIDATE')return reject('UNDO_CONFLICT');
 const {draft:_draft,...memo}=receipt.before;const expectedBlock={...memo,kind:receipt.kind,text:observed.text,entityId:receipt.entityId};
 const expectedEntity=receipt.kind==='task'?{title:observed.title,currentPercent:observed.percent!,parentTaskId:null,progressRecords:[]}:{title:observed.title,plannedDate:observed.plannedDate!,allDay:true};
 if(canonicalJson(receipt.after)!==canonicalJson(expectedBlock)||canonicalJson(receipt.entity)!==canonicalJson(expectedEntity))return reject('UNDO_CONFLICT');
 const document=base.documents[receipt.docId],actual=document?.blocks[receipt.occurrenceId];
 if(!actual||canonicalJson(actual)!==canonicalJson(confirming?receipt.before:receipt.after))return reject('UNDO_CONFLICT');
 const collection=receipt.kind==='task'?base.tasks:base.schedules;
 const origin=base.confirmationOrigins?.[receipt.entityId];
 if(!confirming&&(!origin||canonicalJson(origin)!==canonicalJson(receipt))||confirming&&origin&&canonicalJson(origin)!==canonicalJson(receipt))return reject('UNPROVEN_CONFIRMATION_ORIGIN');
 if(confirming){if(ownedIds(base).has(receipt.entityId))return reject('UNDO_CONFLICT');}
 else{
  if(!Object.hasOwn(collection,receipt.entityId)||canonicalJson(collection[receipt.entityId])!==canonicalJson(receipt.entity))return reject('UNDO_CONFLICT');
  if(Object.entries(base.documents).some(([docId,doc])=>doc.order.some(id=>(docId!==receipt.docId||id!==receipt.occurrenceId)&&doc.blocks[id].entityId===receipt.entityId)))return reject('UNDO_CONFLICT');
 }
 const next=detached(base);
 if(confirming){next.confirmationOrigins??={};next.confirmationOrigins[receipt.entityId]=detached(receipt) as TaggedConfirmationReceipt;}
 next.documents[receipt.docId].blocks[receipt.occurrenceId]=detached(confirming?receipt.after:receipt.before) as ReaStoredOccurrence;
 if(receipt.kind==='task'){if(confirming)next.tasks[receipt.entityId]=detached(receipt.entity) as ReaStoredText['tasks'][string];else delete next.tasks[receipt.entityId];}
 else{if(confirming)next.schedules[receipt.entityId]=detached(receipt.entity) as ReaStoredText['schedules'][string];else delete next.schedules[receipt.entityId];}
 if(!validateReaStoredText(next))return reject('UNDO_CONFLICT');
 return{ok:true as const,snapshot:freezeStored(next)};
}
export function confirmTagged(base:ReaStoredText,docId:string,occurrenceId:string,kind:'task'|'schedule',expectedText:string,entityId:string,explicit?:{plannedDate:string|null;commandToken:string}){
  const block=base.documents[docId]?.blocks[occurrenceId];
  if(!block||block.text!==expectedText)return reject('STALE_OR_NON_MEMO_TARGET');
  if(block.kind!=='memo')return reject(block.kind===kind?'ALREADY_CONFIRMED':['task','schedule'].includes(block.kind)?'UNSUPPORTED_CONVERSION':'STALE_OR_NON_MEMO_TARGET');
  if(typeof entityId!=='string'||!entityId.trim()||['__proto__','prototype','constructor'].includes(entityId)||ownedIds(base).has(entityId))return reject('ENTITY_ID_COLLISION_OR_INVALID');
  const observed=explicit?explicitCandidate(block.text,kind,explicit):candidate(block.text,kind);if(observed.status!=='CANDIDATE')return reject(observed.status);
  const next=detached(base) as ReaStoredText;
  const {draft:_draft,...memo}=block;next.documents[docId].blocks[occurrenceId]={...memo,kind,text:observed.text,entityId};
  if(kind==='task')next.tasks[entityId]={title:observed.title,currentPercent:observed.percent!,parentTaskId:null,progressRecords:[]};
  else next.schedules[entityId]={title:observed.title,plannedDate:observed.plannedDate!,allDay:true};
  if(!validateReaStoredText(next))return reject('UNSUPPORTED_CONFIRMATION');
  const receipt:TaggedConfirmationReceipt={...(explicit?{explicit:detached(explicit)}:{}),docId,occurrenceId,kind,entityId,before:detached(block),after:detached(next.documents[docId].blocks[occurrenceId]),entity:detached(kind==='task'?next.tasks[entityId]:next.schedules[entityId])};
  if(next.confirmationOrigins?.[entityId])return reject('ENTITY_ID_PERMANENTLY_RESERVED');
  next.confirmationOrigins??={};next.confirmationOrigins[entityId]=detached(receipt);
  return{ok:true as const,snapshot:freezeStored(next),prefixLength:observed.prefixLength,entityId,receipt:freezeStored(receipt)};
}

/** An explicit menu choice, independent of ordinary text grammar. */
function explicitCandidate(raw:string,kind:'task'|'schedule',value:{plannedDate:string|null;commandToken:string}){
 const {commandToken:token,plannedDate}=value;
 if(typeof token!=='string'||token!==''&&!/^\/[^\s/]{0,63}$/.test(token)||!raw.startsWith(token))return{status:'INVALID_COMMAND_TOKEN' as const};
 const text=raw.slice(token.length),title=text.split('\n',1)[0].trim();
 if(!title)return{status:'TITLE_REQUIRED' as const};
 const stamp=plannedDate?new Date(plannedDate+'T00:00:00Z'):null;
 if(kind==='task'&&plannedDate!==null||kind==='schedule'&&(!plannedDate||!/^\d{4}-\d{2}-\d{2}$/.test(plannedDate)||!stamp||!Number.isFinite(stamp.getTime())||stamp.toISOString().slice(0,10)!==plannedDate||plannedDate.startsWith('0000')))return{status:'DATE_REQUIRED' as const};
 return{status:'CANDIDATE' as const,text,title,percent:0,plannedDate,prefixLength:token.length};
}
