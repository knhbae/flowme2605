import type {AlphaAccount,AlphaReferenceContext,AlphaReceipt} from './contract';
import type {ProgramPrivateSpace} from '../contract';
import {textWorkspaceModel as M} from '../text-workspace';
import {canonicalJson,detached} from './json';
import {validateAlphaAccount} from './program-adapter';
import {freezeStored,type DeepReadonly,type ReaOrderedStoredSpace,type ReaOrderedStoredText} from '../rea-stored-text';
import {isAlphaOrderedEditAccount,isAlphaOrderedBodyCommand,prepareOrderedBodyEdit,exactOrderedBodyAck,type OrderedAccount,type PreparedOrderedBodyEdit} from './ordered-text-edit';

export const ALPHA_MEMO_BODY_PROFILE='rea-memo-cohort/2';
export type MemoSpace=ProgramPrivateSpace|ReaOrderedStoredSpace;
export type MemoAccount=AlphaAccount<MemoSpace>;
export type PreparedMemoBodyEdit={
 readonly ownerId:PreparedOrderedBodyEdit['ownerId'];readonly before:DeepReadonly<MemoAccount>;
 readonly orderedBefore:PreparedOrderedBodyEdit['before'];readonly expected:PreparedOrderedBodyEdit['expected'];
 readonly command:PreparedOrderedBodyEdit['command'];readonly references:PreparedOrderedBodyEdit['references'];
 readonly changed:PreparedOrderedBodyEdit['changed'];readonly origin:'v11'|'v2';
};
const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
const rejected=(reason:string,preservedInput:unknown)=>({ok:false as const,reason,preservedInput,writeAllowed:false as const});
/** This inverse receives only the typed projection. It cannot replay a source sidecar.
 * It proves initial representation equality, not v11 export after editing LF. */
function reverseInitial(account:OrderedAccount):unknown{
 const t=account.space.text;
 return{...detached(account),space:{...detached(account.space),text:{version:11,
  documents:t.documentOrder.map(id=>{const d=t.documents[id];return{id,title:d.title,folder:t.folders[d.folderId].title,folderId:d.folderId,lines:d.order.map(id=>({id,text:d.blocks[id].text}))};}),
  folders:t.folderOrder.map(id=>({id,...detached(t.folders[id])})),flows:[],bindings:[],taskScopes:{},itemScopes:{},progressRecords:[]}}};
}
/** Whole account and reference cohort. Never converts storage or drops unsupported data. */
export function inspectMemoCohort(value:unknown,ownerId:string,references:AlphaReferenceContext){
 try{
  if(isAlphaOrderedEditAccount(value,ownerId,references)){
   const t=value.space.text;
   if(Object.keys(t.tasks).length||Object.keys(t.schedules).length||t.documentOrder.some(id=>t.documents[id].order.some(row=>t.documents[id].blocks[row].kind!=='memo')))
    return rejected('WHOLE_ACCOUNT_MEMO_ONLY_REQUIRED',value);
   return{ok:true as const,source:freezeStored(detached(value)) as MemoAccount,projected:freezeStored(detached(value)) as OrderedAccount,origin:'v2' as const};
  }
  if(!validateAlphaAccount(value,references,ownerId))return rejected('INVALID_OR_UNSUPPORTED_V11_ACCOUNT',value);
  const text=value.space.text;
  if(text.flows.length||text.bindings.length||Object.keys(text.taskScopes).length||Object.keys(text.itemScopes).length||text.progressRecords.length)
   return rejected('ACCOUNT_REFERENCE_OR_RECORD_CONTEXT_UNSUPPORTED',value);
  for(const doc of text.documents){
   if(M.parseDocument(doc,text).rows.some(row=>!['note','blank'].includes(row.kind)||row.kind!=='blank'&&(row.depth!==0||row.parentLineId!==null)))
    return rejected('ACCOUNT_SEMANTIC_OR_HIERARCHY_UNSUPPORTED',value);
  }
  const projectedText:ReaOrderedStoredText={schema:'flowme-rea-text/2',documentOrder:text.documents.map(d=>d.id),folderOrder:text.folders.map(f=>f.id),
   documents:Object.fromEntries(text.documents.map(d=>[d.id,{title:d.title,folderId:d.folderId,sourceContextDate:null,order:d.lines.map(l=>l.id),
    blocks:Object.fromEntries(d.lines.map(l=>[l.id,{kind:'memo' as const,text:l.text,entityId:null,folderId:null}]))}])),
   folders:Object.fromEntries(text.folders.map(f=>[f.id,{title:f.title,parentId:f.parentId}])),tasks:{},schedules:{}};
  const projected:unknown={...detached(value),space:{...detached(value.space),text:projectedText}};
  if(!isAlphaOrderedEditAccount(projected,ownerId,references))return rejected('ORDERED_AUX_OR_REPRESENTATION_UNSUPPORTED',value);
  const reverse=reverseInitial(projected);
  if(!validateAlphaAccount(reverse,references,ownerId)||!same(reverse,value))return rejected('INITIAL_WHOLE_ACCOUNT_ROUNDTRIP_MISMATCH',value);
  return{ok:true as const,source:freezeStored(detached(value)) as MemoAccount,projected:freezeStored(detached(projected)) as OrderedAccount,origin:'v11' as const};
 }catch{return rejected('MEMO_COHORT_INVALID',value);}
}
export function isMemoAccount(value:unknown,ownerId:string,references:AlphaReferenceContext={actorIds:[ownerId],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}}):value is MemoAccount{
 return inspectMemoCohort(value,ownerId,references).ok;
}
/** First signed write still uses the ORIGINAL v11 revision/account. Projection
 * happens in memory only; the backend is not pre-populated with typed data. */
export function prepareMemoBodyEdit(before:unknown,command:unknown,ownerId:string,references:AlphaReferenceContext):{ok:true;value:PreparedMemoBodyEdit}|ReturnType<typeof rejected>{
 const cohort=inspectMemoCohort(before,ownerId,references);if(!cohort.ok)return rejected(cohort.reason,command);
 if(!isAlphaOrderedBodyCommand(command))return rejected('ORDERED_BODY_ONLY_COMMAND_REQUIRED',command);
 const prepared=prepareOrderedBodyEdit(cohort.projected,command,ownerId,references);if(!prepared.ok)return prepared;
 if(cohort.origin==='v11'&&!prepared.value.changed)return rejected('MEMO_EDIT_REQUIRED_BEFORE_TRANSITION',command);
 const sourceBefore=freezeStored(detached(cohort.source)),orderedBefore=freezeStored(detached(cohort.projected));
 const value:PreparedMemoBodyEdit={
  ownerId:prepared.value.ownerId,
  before:sourceBefore,
  expected:prepared.value.expected,
  command:prepared.value.command,
  references:prepared.value.references,
  changed:prepared.value.changed,
  orderedBefore,
  origin:cohort.origin,
 };
 // The ordered proof and both new account copies are already recursively frozen.
 // Freeze this envelope without recursively remapping their readonly types again.
 return{ok:true as const,value:Object.freeze(value)};
}
export function exactMemoBodyAck(proof:PreparedMemoBodyEdit,account:unknown,receipt:AlphaReceipt){
 try{
  const references=JSON.parse(canonicalJson(proof.references)) as AlphaReferenceContext;
  const fresh=prepareMemoBodyEdit(proof.before,proof.command,proof.ownerId,references);
  if(!fresh.ok||!same(fresh.value,proof))return false;
  // Bound the deeply readonly memo proof at the existing ordered ACK contract.
  const orderedProof:PreparedOrderedBodyEdit={ownerId:fresh.value.ownerId,before:fresh.value.orderedBefore,
   expected:fresh.value.expected,command:fresh.value.command,references:fresh.value.references,changed:fresh.value.changed};
  return exactOrderedBodyAck(orderedProof,account,receipt);
 }catch{return false;}
}
