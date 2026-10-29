import type {AlphaAccount,AlphaPrivateCommand,AlphaReferenceContext,AlphaReceipt} from './contract';
import {canonicalJson,detached} from './json';
import {inspectOrderedStoredAlphaAccount} from './program-adapter';
import {freezeStored,validateReaOrderedStoredText,type ReaOrderedStoredSpace,type ReaOrderedStoredText} from '../rea-stored-text';
import {isM3Command} from '../alpha-sync/contract';
import {isAlphaWireReceipt} from '../alpha-sync/wire';

export type OrderedAccount=AlphaAccount<ReaOrderedStoredSpace>;
export const ALPHA_ORDERED_BODY_PROFILE='rea-ordered-body/2';
export function isAlphaOrderedEditAccount(value:unknown,ownerId:string,references:AlphaReferenceContext={actorIds:[ownerId],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}}):value is OrderedAccount{
 return inspectOrderedStoredAlphaAccount(value,references,ownerId).kind==='rea-ordered-readonly';
}
export function isAlphaOrderedBodyCommand(command:unknown):command is Extract<AlphaPrivateCommand,{kind:'change-private'}>&{changes:[{field:'text';present:true;value:ReaOrderedStoredText}]}{
 return isM3Command(command)&&command.kind==='change-private'&&command.changes.length===1
  &&command.changes[0].field==='text'&&command.changes[0].present&&validateReaOrderedStoredText(command.changes[0].value);
}
const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b);
const reject=(reason:string,preservedInput:unknown)=>({ok:false as const,reason,preservedInput,writeAllowed:false as const});
function archiveFacts(text:ReaOrderedStoredText,archived:readonly string[]){
 const tasks=new Set<string>(),schedules=new Set<string>();
 const documents=archived.map(id=>{const d=text.documents[id];for(const oid of d.order){const b=d.blocks[oid];
  if(b.kind==='task')tasks.add(b.entityId!);if(b.kind==='schedule')schedules.add(b.entityId!);}
  return{id,blocks:d.blocks,order:d.order};});
 return{documents,tasks:Object.fromEntries([...tasks].map(id=>[id,text.tasks[id]])),schedules:Object.fromEntries([...schedules].map(id=>[id,text.schedules[id]]))};
}
/** Read -> prepare -> injected test commit -> exact ACK. No repository or I/O. */
export function prepareOrderedBodyEdit(before:unknown,command:unknown,ownerId:string,references:AlphaReferenceContext){
 try{
  const read=inspectOrderedStoredAlphaAccount(before,references,ownerId);
  if(read.kind!=='rea-ordered-readonly')return reject('ORDERED_ACCOUNT_NOT_SUPPORTED',command);
  if(!isAlphaOrderedBodyCommand(command))return reject('ORDERED_BODY_ONLY_COMMAND_REQUIRED',command);
  const account=detached(read.snapshot) as OrderedAccount;
  if(command.expectedRevision!==account.revision)return reject('REVISION_CONFLICT',command);
  const submitted=command.changes[0].value;
  if(!same(archiveFacts(account.space.text,account.space.archivedDocumentIds),archiveFacts(submitted,account.space.archivedDocumentIds)))return reject('ARCHIVED_CONTENT_OR_ENTITY_CHANGE',command);
  const expected=detached(account);
  for(const docId of expected.space.text.documentOrder){
   const d=expected.space.text.documents[docId],actual=submitted.documents[docId];
   if(!actual)return reject('UNSUPPORTED_STRUCTURE_CHANGE',command);
   if(account.space.archivedDocumentIds.includes(docId))continue;
   for(const id of d.order){const b=d.blocks[id],next=actual.blocks[id];if(!next)return reject('UNSUPPORTED_STRUCTURE_CHANGE',command);
    if(b.kind==='folderLink')continue;b.text=next.text;
    if(b.kind==='task')expected.space.text.tasks[b.entityId!].title=b.text.split('\n',1)[0].trim();
    if(b.kind==='schedule')expected.space.text.schedules[b.entityId!].title=b.text.split('\n',1)[0].trim();
   }
  }
  if(!same(expected.space.text,submitted))return reject('UNSUPPORTED_BODY_ONLY_CHANGE',command);
  const changed=!same(account.space,expected.space);expected.revision=account.revision+(changed?1:0);
  if(inspectOrderedStoredAlphaAccount(expected,references,ownerId).kind!=='rea-ordered-readonly')return reject('INVALID_ORDERED_RESULT',command);
  return{ok:true as const,value:freezeStored({ownerId,before:account,expected,command:detached(command),references:detached(references),changed}),
   positionSupport:'PRESERVE_ONLY_NO_PM_RESTORE' as const,writeAllowed:false as const};
 }catch{return reject('INVALID_ORDERED_EDIT',command);}
}
export type PreparedOrderedBodyEdit=Extract<ReturnType<typeof prepareOrderedBodyEdit>,{ok:true}>['value'];
export function exactOrderedBodyAck(prepared:PreparedOrderedBodyEdit,account:unknown,receipt:AlphaReceipt):boolean{
 try{
  // detached values are new mutable JSON; make the readonly -> runtime port
  // boundary explicit instead of passing a DeepReadonly reference as mutable.
  const references=JSON.parse(canonicalJson(prepared.references)) as AlphaReferenceContext;
  const fresh=prepareOrderedBodyEdit(prepared.before,prepared.command,prepared.ownerId,references);
  // Existing Alpha no-op is a no-change read result, never a success receipt.
  return isAlphaWireReceipt(receipt)&&fresh.ok&&fresh.value.changed&&prepared.changed===fresh.value.changed
   &&same(fresh.value.expected,prepared.expected)&&same(account,prepared.expected)
   &&receipt.requestId===prepared.command.requestId&&receipt.kind==='change-private'
   &&receipt.changed===fresh.value.changed&&receipt.revision===prepared.expected.revision
   &&inspectOrderedStoredAlphaAccount(account,references,prepared.ownerId).kind==='rea-ordered-readonly';
 }catch{return false;}
}
