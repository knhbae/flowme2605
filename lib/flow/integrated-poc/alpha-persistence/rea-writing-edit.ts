import {canonicalJson,detached} from './json';
import {isAlphaReaEditAccount,isAlphaReaTextEditCommand,projectAlphaReaTextEdit} from './rea-text-edit';
import {programShape,programIdentifier} from '../program-data';
import {replayTaggedConfirmation,appendTagged,removeTaggedAppend,type TaggedConfirmationReceipt} from '../rea-pm/tagged-codec';
import {validateReaStoredText,type ReaStoredOccurrence,type ReaStoredText} from '../rea-stored-text';
import {setTaggedProgress} from '../rea-pm/tagged-progress';
import type {AlphaReaProgressOperation} from './rea-progress-edit';
export const ALPHA_REA_WRITING_PROFILE='rea-writing-roundtrip/1' as const;
export type WritingOperation={type:'insert';docId:string;occurrenceId:string;afterOccurrenceId:string;nextOccurrenceId:string|null;block:ReaStoredOccurrence;adding:boolean}|{type:'confirm';receipt:import('../rea-stored-text').DeepReadonly<TaggedConfirmationReceipt>;confirming:boolean}|{type:'draft';docId:string;occurrenceId:string;before:ReaStoredOccurrence;after:ReaStoredOccurrence};
export function isWritingSubmission(v:any):boolean{return programShape(v,['profile','command','progress','writing'])&&v.profile===ALPHA_REA_WRITING_PROFILE&&isAlphaReaTextEditCommand(v.command)&&Array.isArray(v.progress)&&Array.isArray(v.writing)&&v.writing.length>0&&v.writing.length<=128;}
const reject=(reason:string)=>({ok:false as const,reason});
/** Exact revision + scoped operations. Everything not derived below is held. */
export function prepareWritingSubmission(before:unknown,value:any,ownerId:string,documentId?:string){
 try{
  if(!documentId||!isAlphaReaEditAccount(before,ownerId)||!isWritingSubmission(value)||value.command.expectedRevision!==before.revision)return reject('WRITING_REVISION_OR_PROFILE');
  const submitted=value.command.changes[0].value as ReaStoredText,work=detached(before),seen=new Set<string>();
  for(const operation of value.writing as WritingOperation[]){
   if(operation.type==='insert'){
    const op=operation,d=work.space.text.documents[documentId];if(!programShape(op,['type','docId','occurrenceId','afterOccurrenceId','nextOccurrenceId','block','adding'])||op.docId!==documentId||op.block.kind!=='memo'||op.block.entityId!==null||op.block.folderId!==null||op.block.draft||typeof op.adding!=='boolean'||!d?.blocks[op.afterOccurrenceId])return reject('INVALID_INSERT_INTENT');
    const position=d.order.indexOf(op.afterOccurrenceId)+1,observed=d.order[position+(op.adding?0:1)]??null;if(observed!==op.nextOccurrenceId)return reject('INSERT_ADJACENCY_CONFLICT');
    const applied=op.adding?appendTagged(work.space.text,documentId,op.occurrenceId,'memo',op.block.text,null,op.afterOccurrenceId):removeTaggedAppend(work.space.text,documentId,op.occurrenceId,op.block,null,op.afterOccurrenceId);if(!applied.ok)return applied;work.space.text=detached(applied.snapshot) as ReaStoredText;continue;
   }
   const confirm=operation.type==='confirm',op:any=operation,r=confirm?op.receipt:op;
   if(!r||r.docId!==documentId||!programIdentifier(r.occurrenceId)||!work.space.text.documents[documentId])return reject('WRITING_DOCUMENT_MISMATCH');
   if(confirm&&!programShape(op,['type','receipt','confirming'])||!confirm&&(op.type!=='draft'||!programShape(op,['type','docId','occurrenceId','before','after'])))return reject('INVALID_WRITING_OPERATION');
   const pre=confirm?(op.confirming?r.before:r.after):r.before;
   const d=work.space.text.documents[documentId];
   if(!d.blocks[r.occurrenceId]){
    const target=submitted.documents[documentId],index=target?.order.indexOf(r.occurrenceId);
    if(index!==d.order.length||target.order.slice(0,index).some((id:string,i:number)=>d.order[i]!==id)||pre?.kind!=='memo'||pre.entityId!==null||pre.folderId!==null||pre.draft)return reject('WRITING_MISSING_TARGET');
    const added=appendTagged(work.space.text,documentId,r.occurrenceId,'memo',pre.text,null);if(!added.ok)return added;work.space.text=detached(added.snapshot) as ReaStoredText;
   }
   // Only raw body text may precede an explicit semantic command. Target attrs
   // and entity records are checked against its exact preimage after projection.
   const text=work.space.text,b=text.documents[documentId].blocks[r.occurrenceId];
   if(typeof pre?.text!=='string'||b.kind==='folderLink')return reject('INVALID_WRITING_PREIMAGE');
   // An inverse must match the canonical saved body/title before projection.
   // Otherwise a stale receipt could hide a later saved rename by projecting
   // its old text first and then deleting the now falsely matching entity.
   if(!confirm||op.confirming){b.text=pre.text;if(b.kind==='task')text.tasks[b.entityId!].title=b.text.split('\n',1)[0].trim();if(b.kind==='schedule')text.schedules[b.entityId!].title=b.text.split('\n',1)[0].trim();}
   if(confirm){if(typeof op.confirming!=='boolean'||!r.explicit)return reject('INVALID_CONFIRM_DIRECTION_OR_EXPLICIT_INTENT');const applied=replayTaggedConfirmation(text,r,op.confirming);if(!applied.ok)return applied;work.space.text=detached(applied.snapshot) as ReaStoredText;}
   else{
    if(canonicalJson(b)!==canonicalJson(r.before)||r.after?.kind!=='memo')return reject('DRAFT_PREIMAGE_MISMATCH');
    const {draft:a,...plainA}=r.before,{draft:z,...plainZ}=r.after;if(canonicalJson(plainA)!==canonicalJson(plainZ))return reject('DRAFT_CHANGES_BODY_OR_ID');
    text.documents[documentId].blocks[r.occurrenceId]=detached(r.after);if(!validateReaStoredText(text))return reject('INVALID_DRAFT_RESULT');
   }
  }
  for(const operation of value.progress as AlphaReaProgressOperation[]){if(!programShape(operation,['commandId','docId','occurrenceId','entityId','recordDate','percent'])||operation.docId!==documentId||seen.has(operation.commandId))return reject('INVALID_PROGRESS_OPERATION');seen.add(operation.commandId);const applied=setTaggedProgress(work.space.text,operation);if(!applied.ok)return applied;work.space.text=detached(applied.snapshot) as ReaStoredText;}
  const claimed=detached(work);claimed.space.text=detached(submitted);
  const expected=projectAlphaReaTextEdit(work,claimed,ownerId,documentId);if(!expected||canonicalJson(expected.space)!==canonicalJson(claimed.space))return reject('UNEXPLAINED_WRITING_CHANGE');
  const changed=canonicalJson(before.space)!==canonicalJson(expected.space);expected.revision=before.revision+(changed?1:0);return{ok:true as const,value:{before:detached(before),expected,changed}};
 }catch{return reject('INVALID_WRITING_SUBMISSION');}
}
