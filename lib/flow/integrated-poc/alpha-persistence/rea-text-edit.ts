import type {AlphaAccount,AlphaPrivateCommand,AlphaReferenceContext} from './contract';
import {inspectStoredAlphaAccount} from './program-adapter';
import {canonicalJson,detached} from './json';
import {validateReaStoredText,type ReaStoredSpace} from '../rea-stored-text';
import {isM3Command} from '../alpha-sync/contract';

/** An explicit capability, not a new stored schema or a general typed writer.
 * The existing stored reader supports only single-owner/empty auxiliary data.
 * Imported sources, holds, social data and legacy history are not admitted here. */
export const ALPHA_REA_TEXT_EDIT_PROFILE='rea-body-title/1' as const;
/** Isolated opt-in only. Existing body/title and live routes do not opt in. */
export const ALPHA_REA_NEW_ITEMS_PROFILE='rea-new-items/1' as const;
export type AlphaReaEditAccount=AlphaAccount<ReaStoredSpace>;
export const alphaReaOwnerReferences=(ownerId:string):AlphaReferenceContext=>({actorIds:[ownerId],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}});

export function isAlphaReaEditAccount(value:unknown,ownerId:string,references:AlphaReferenceContext=alphaReaOwnerReferences(ownerId)):value is AlphaReaEditAccount {
 try{
  const read=inspectStoredAlphaAccount(value,references,ownerId);
  return read.kind==='rea-readonly'&&read.snapshot.source.actorId===ownerId
   &&references.actorIds.length===1&&references.actorIds[0]===ownerId&&!references.social
   &&canonicalJson(value)===canonicalJson(read.snapshot);
 }catch{return false;}
}

export function isAlphaReaTextEditCommand(value:unknown):value is AlphaPrivateCommand&{kind:'change-private'} {
 return isM3Command(value)&&value.kind==='change-private'&&value.changes.length===1
  &&value.changes[0].field==='text'&&value.changes[0].present&&validateReaStoredText(value.changes[0].value);
}

/** Permit body text and its first-line entity title only. Compare the entire
 * account afterwards: IDs/order/kinds/references/folders, source evidence,
 * numeric/date records and every auxiliary field must remain byte-equivalent.
 * This does not authorize progress, confirmation, structure or remote Undo. */
export function projectAlphaReaTextEdit(before:unknown,after:unknown,ownerId:string,newItemsDocumentId?:string):AlphaReaEditAccount|null {
 try{
  if(!isAlphaReaEditAccount(before,ownerId)||!isAlphaReaEditAccount(after,ownerId))return null;
  if(newItemsDocumentId!==undefined&&!Object.hasOwn(before.space.text.documents,newItemsDocumentId))return null;
  const expected=detached(before);
  const priorIds=new Set([...Object.keys(before.space.text.documents),...Object.keys(before.space.text.tasks),...Object.keys(before.space.text.schedules),...Object.keys(before.space.text.folders),...Object.values(before.space.text.documents).flatMap(d=>d.order)]);
  const addedIds=new Set<string>();
  for(const[docId,document]of Object.entries(expected.space.text.documents)){
   const actual=after.space.text.documents[docId];if(!actual)return null;
   for(const id of document.order){
    const block=document.blocks[id],next=actual.blocks[id];if(!next)return null;
    if(block.kind==='folderLink')continue;
    block.text=next.text;
    if(block.kind==='task')expected.space.text.tasks[block.entityId!].title=block.text.split('\n',1)[0].trim();
    if(block.kind==='schedule')expected.space.text.schedules[block.entityId!].title=block.text.split('\n',1)[0].trim();
   }
   if(docId!==newItemsDocumentId)continue;
   const prefix=actual.order.slice(0,document.order.length);
   if(canonicalJson(prefix)!==canonicalJson(document.order))return null;
   for(const id of actual.order.slice(document.order.length)){
    const next=actual.blocks[id];
    if(priorIds.has(id)||addedIds.has(id)||!next||!['memo','task'].includes(next.kind)||next.folderId!==null||Object.hasOwn(next,'beforeLinkText'))return null;
    addedIds.add(id);
    if(next.kind==='task'){
     const entityId=next.entityId!;
     if(priorIds.has(entityId)||addedIds.has(entityId))return null;
     addedIds.add(entityId);
     expected.space.text.tasks[entityId]={title:next.text.split('\n',1)[0].trim(),currentPercent:0,parentTaskId:null,progressRecords:[]};
    }
    document.order.push(id);document.blocks[id]=detached(next);
   }
  }
  return expected;
 }catch{return null;}
}
/** A new-items proof may append zero-record memo/task occurrences only to the
 * selected existing document. Existing IDs/structure/history remain exact.
 * Final equality also rejects orphan entities, extra documents and aux edits. */
export function preservesAlphaReaTextEdit(before:unknown,after:unknown,ownerId:string,newItemsDocumentId?:string):boolean {
 const expected=projectAlphaReaTextEdit(before,after,ownerId,newItemsDocumentId);
 return expected!==null&&canonicalJson(expected)===canonicalJson(after);
}
