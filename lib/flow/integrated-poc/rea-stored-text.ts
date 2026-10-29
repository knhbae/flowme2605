import type {ProgramData,ProgramEnvelope,ProgramPrivateSpace} from './contract';
import type {TextWorkspaceState} from './text-workspace';
import {textWorkspaceModel} from './text-workspace';
import {createV11Codec} from './rea-pm/codec.cjs';
import {canonicalJson,detached} from './alpha-persistence/json';

export const REA_TEXT_SCHEMA='flowme-rea-text/1' as const;
export type ReaStoredOccurrence={kind:'memo'|'task'|'schedule'|'folderLink';text:string;entityId:string|null;folderId:string|null;beforeLinkText?:string;draft?:{kind:'task'|'schedule';plannedDate:string|null;commandToken:string}};
export type ReaStoredText={schema:typeof REA_TEXT_SCHEMA;
 confirmationOrigins?:Record<string,import('./rea-pm/tagged-codec').TaggedConfirmationReceipt>;
 insertionOrigins?:Record<string,{docId:string;afterOccurrenceId:string;nextOccurrenceId:string|null;block:ReaStoredOccurrence}>;
 documents:Record<string,{title:string;folderId:string;sourceContextDate:string|null;blocks:Record<string,ReaStoredOccurrence>;order:string[]}>;
 tasks:Record<string,{title:string;currentPercent:number;parentTaskId:null;progressRecords:{recordDate:string;percent:number}[]}>;
 schedules:Record<string,{title:string;plannedDate:string;allDay:true}>;
 folders:Record<string,{title:string;parentId:string|null}>;
};
export type DeepReadonly<T>=T extends object?{readonly[K in keyof T]:DeepReadonly<T[K]>}:T;
export type ReaStoredSpace=Omit<ProgramPrivateSpace,'text'>&{text:ReaStoredText};
export type StoredProgramEnvelope=Omit<ProgramEnvelope,'data'>&{data:Omit<ProgramData,'spaces'>&{spaces:Record<string,ProgramPrivateSpace|ReaStoredSpace>}};
export function freezeStored<T>(value:T):DeepReadonly<T>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeStored);Object.freeze(value);}return value as DeepReadonly<T>;}
const obj=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const shape=(v:any,required:string[],optional:string[]=[])=>obj(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const id=(v:any)=>typeof v==='string'&&v.trim().length>0&&!['__proto__','prototype','constructor'].includes(v);
const title=(v:any)=>typeof v==='string'&&!!v.trim()&&!/[\r\n]/.test(v);
const percent=(v:any)=>Number.isInteger(v)&&v>=0&&v<=100;
function date(v:any){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const[y,m,d]=v.split('-').map(Number),dt=new Date(0);dt.setUTCFullYear(y,m-1,d);return y>=1&&dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;}

/** Direct validation of the new stored value, never a fabricated v11 projection.
 * This local read profile has no hierarchy/import/legacy conversion support. */
export function validateReaStoredText(value:unknown):value is ReaStoredText{
 try{
  canonicalJson(value);const p=value as any;
  if(!shape(p,['schema','documents','tasks','schedules','folders'],['confirmationOrigins','insertionOrigins'])||p.schema!==REA_TEXT_SCHEMA)return false;
  if(p.insertionOrigins!==undefined&&(!obj(p.insertionOrigins)||Object.entries<any>(p.insertionOrigins).some(([key,r])=>!id(key)||!shape(r,['docId','afterOccurrenceId','nextOccurrenceId','block'])||!id(r.docId)||!id(r.afterOccurrenceId)||r.nextOccurrenceId!==null&&!id(r.nextOccurrenceId)||!shape(r.block,['kind','text','entityId','folderId'])||r.block.kind!=='memo'||r.block.entityId!==null||r.block.folderId!==null||typeof r.block.text!=='string')))return false;
  if(p.confirmationOrigins!==undefined&&(!obj(p.confirmationOrigins)||Object.entries<any>(p.confirmationOrigins).some(([key,r])=>!id(key)||!shape(r,['docId','occurrenceId','kind','entityId','before','after','entity'],['explicit'])||r.entityId!==key||!id(r.docId)||!id(r.occurrenceId)||!['task','schedule'].includes(r.kind)||!obj(r.before)||!obj(r.after)||!obj(r.entity)||r.before.kind!=='memo'||r.before.entityId!==null||r.after.kind!==r.kind||r.after.entityId!==key||r.explicit!==undefined&&(!shape(r.explicit,['plannedDate','commandToken'])||typeof r.explicit.commandToken!=='string'))))return false;
  for(const k of ['documents','tasks','schedules','folders'])if(!obj(p[k]))return false;
  if(!Object.keys(p.documents).length)return false;
  const ids=new Set<string>(),own=(s:any)=>{if(!id(s)||ids.has(s))return false;ids.add(s);return true;};
  for(const[k,f]of Object.entries<any>(p.folders))if(!own(k)||!shape(f,['title','parentId'])||!title(f.title)||f.parentId!==null&&(!id(f.parentId)||!Object.hasOwn(p.folders,f.parentId)))return false;
  for(const[k,f]of Object.entries<any>(p.folders)){const seen=new Set([k]);let parent=f.parentId;while(parent!==null){if(seen.has(parent))return false;seen.add(parent);parent=p.folders[parent]?.parentId;if(parent===undefined)return false;}}
  for(const[k,t]of Object.entries<any>(p.tasks)){
   if(!own(k)||!shape(t,['title','currentPercent','parentTaskId','progressRecords'])||!title(t.title)||!percent(t.currentPercent)||t.parentTaskId!==null||!Array.isArray(t.progressRecords))return false;
   const dates=new Set();for(const r of t.progressRecords){if(!shape(r,['recordDate','percent'])||!date(r.recordDate)||!percent(r.percent)||dates.has(r.recordDate))return false;dates.add(r.recordDate);}
  }
  for(const[k,s]of Object.entries<any>(p.schedules))if(!own(k)||!shape(s,['title','plannedDate','allDay'])||!title(s.title)||!date(s.plannedDate)||s.allDay!==true)return false;
  for(const[k,d]of Object.entries<any>(p.documents)){
   if(!own(k)||!shape(d,['title','folderId','sourceContextDate','blocks','order'])||!title(d.title)||!id(d.folderId)||!Object.hasOwn(p.folders,d.folderId)||d.sourceContextDate!==null&&!date(d.sourceContextDate)||!obj(d.blocks)||!Array.isArray(d.order)||!d.order.length||new Set(d.order).size!==d.order.length||d.order.length!==Object.keys(d.blocks).length)return false;
   for(const oid of d.order){const b=d.blocks[oid];if(!own(oid)||!shape(b,['kind','text','entityId','folderId'],['beforeLinkText','draft'])||typeof b.text!=='string'||!['memo','task','schedule','folderLink'].includes(b.kind))return false;
    if(b.draft!==undefined&&(b.kind!=='memo'||!shape(b.draft,['kind','plannedDate','commandToken'])||!['task','schedule'].includes(b.draft.kind)||b.draft.plannedDate!==null&&!date(b.draft.plannedDate)||b.draft.kind==='task'&&b.draft.plannedDate!==null||typeof b.draft.commandToken!=='string'||b.draft.commandToken!==''&&!/^\/[^\s/]{0,63}$/.test(b.draft.commandToken)))return false;
    if(b.folderId!==null&&(!id(b.folderId)||!Object.hasOwn(p.folders,b.folderId)))return false;
    if(b.kind==='task'||b.kind==='schedule'){const entity=(b.kind==='task'?p.tasks:p.schedules)[b.entityId];if(!id(b.entityId)||!entity||entity.title!==b.text.split('\n',1)[0].trim()||Object.hasOwn(b,'beforeLinkText'))return false;}
    else if(b.entityId!==null)return false;
    if(b.kind==='folderLink'){if(!b.folderId||b.text!==p.folders[b.folderId].title||Object.hasOwn(b,'beforeLinkText')&&typeof b.beforeLinkText!=='string')return false;}
    else if(Object.hasOwn(b,'beforeLinkText'))return false;
   }
  }
  return true;
 }catch{return false;}
}

type ReaView={schema:'flowme-rea-text-read-view/1';documents:{id:string;title:string;folderId:string;sourceContextDate:string|null;occurrences:({id:string}&ReaStoredOccurrence)[]}[];tasks:ReaStoredText['tasks'];schedules:ReaStoredText['schedules'];folders:ReaStoredText['folders']};
export type StoredTextRead=
 |{kind:'v11-readonly';snapshot:DeepReadonly<TextWorkspaceState>;projection:unknown;writeAllowed:false;writeBlockedReason:'USE_EXISTING_V11_PORTS'}
 |{kind:'rea-readonly';snapshot:DeepReadonly<ReaStoredText>;projection:DeepReadonly<ReaView>;writeAllowed:false;writeBlockedReason:'REA_READERS_NOT_CONNECTED';missingReaders:readonly string[]}
 |{kind:'blocked';reason:string;preservedInput:unknown;writeAllowed:false};

/** Pure read port. No caller-supplied ready flag or write capability is exposed. */
export function readStoredProgramText(input:unknown):StoredTextRead{
 try{
  const value=detached(input) as any;
  if(value?.version===11){const opened=createV11Codec(textWorkspaceModel).open(value);if(!opened.ok)return{kind:'blocked',reason:'INVALID_V11_TEXT',preservedInput:input,writeAllowed:false};return{kind:'v11-readonly',snapshot:freezeStored(value),projection:freezeStored(opened.view()),writeAllowed:false,writeBlockedReason:'USE_EXISTING_V11_PORTS'};}
  if(value?.schema!==REA_TEXT_SCHEMA)return{kind:'blocked',reason:'UNKNOWN_TEXT_VERSION',preservedInput:input,writeAllowed:false};
  if(!validateReaStoredText(value))return{kind:'blocked',reason:'UNSUPPORTED_REA_TEXT',preservedInput:input,writeAllowed:false};
  const projection:ReaView={schema:'flowme-rea-text-read-view/1',documents:Object.entries(value.documents).map(([id,d])=>({id,title:d.title,folderId:d.folderId,sourceContextDate:d.sourceContextDate,occurrences:d.order.map(oid=>({id:oid,...d.blocks[oid]}))})),tasks:value.tasks,schedules:value.schedules,folders:value.folders};
  return{kind:'rea-readonly',snapshot:freezeStored(value),projection:freezeStored(projection),writeAllowed:false,writeBlockedReason:'REA_READERS_NOT_CONNECTED',missingReaders:Object.freeze(['editor/semantic-codec','task-and-schedule-ui','exact-host-ack','source-execution-guards'])};
 }catch{return{kind:'blocked',reason:'NON_JSON_TEXT',preservedInput:input,writeAllowed:false};}
}

/** Opt-in ordered format. Version 1 remains unchanged and is never upgraded. */
export const REA_ORDERED_TEXT_SCHEMA='flowme-rea-text/2' as const;
export type ReaOrderedStoredText=Omit<ReaStoredText,'schema'>&{
 schema:typeof REA_ORDERED_TEXT_SCHEMA;documentOrder:string[];folderOrder:string[];
};
export type ReaOrderedStoredSpace=Omit<ProgramPrivateSpace,'text'>&{text:ReaOrderedStoredText};
const exactOrder=(order:unknown,record:Record<string,unknown>)=>Array.isArray(order)
 &&order.length===Object.keys(record).length&&new Set(order).size===order.length
 &&order.every(key=>typeof key==='string'&&Object.hasOwn(record,key));
export function validateReaOrderedStoredText(value:unknown):value is ReaOrderedStoredText{
 try{
  canonicalJson(value);const p=value as any;
  if(!shape(p,['schema','documents','tasks','schedules','folders','documentOrder','folderOrder'])
   ||p.schema!==REA_ORDERED_TEXT_SCHEMA||!obj(p.documents)||!obj(p.folders)
   ||!exactOrder(p.documentOrder,p.documents)||!exactOrder(p.folderOrder,p.folders))return false;
  // Reuse the strict unchanged content validator, not a writable v1 conversion.
  // Both new vectors are validated above; the original v2 value is returned/stored.
  return validateReaStoredText({schema:REA_TEXT_SCHEMA,documents:p.documents,tasks:p.tasks,schedules:p.schedules,folders:p.folders});
 }catch{return false;}
}
export type OrderedTextRead={kind:'rea-ordered-readonly';snapshot:DeepReadonly<ReaOrderedStoredText>;
 projection:DeepReadonly<{documents:({id:string}&ReaOrderedStoredText['documents'][string])[];
 folders:({id:string}&ReaOrderedStoredText['folders'][string])[]}>;
 writeAllowed:false;writeBlockedReason:'ORDERED_PROFILE_REQUIRES_EXPLICIT_WRITER';
 positionSupport:'PRESERVE_ONLY_NO_PM_RESTORE'};
export function readOrderedStoredProgramText(input:unknown):StoredTextRead|OrderedTextRead{
 try{
  if((input as any)?.schema!==REA_ORDERED_TEXT_SCHEMA)return readStoredProgramText(input);
  const value=detached(input);
  if(!validateReaOrderedStoredText(value))return{kind:'blocked',reason:'INVALID_ORDERED_TEXT',preservedInput:input,writeAllowed:false};
  return{kind:'rea-ordered-readonly',snapshot:freezeStored(value),
   projection:freezeStored({documents:value.documentOrder.map(id=>({id,...value.documents[id]})),
    folders:value.folderOrder.map(id=>({id,...value.folders[id]}))}),
   writeAllowed:false,writeBlockedReason:'ORDERED_PROFILE_REQUIRES_EXPLICIT_WRITER',positionSupport:'PRESERVE_ONLY_NO_PM_RESTORE'};
 }catch{return{kind:'blocked',reason:'NON_JSON_ORDERED_TEXT',preservedInput:input,writeAllowed:false};}
}
