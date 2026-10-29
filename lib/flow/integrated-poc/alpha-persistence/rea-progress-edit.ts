import type {AlphaPrivateCommand,AlphaReceipt} from './contract';
import {ALPHA_COMMAND_SCHEMA,ALPHA_LIMITS} from './contract';
import {canonicalJson,detached} from './json';
import {isAlphaReaEditAccount,isAlphaReaTextEditCommand,projectAlphaReaTextEdit,type AlphaReaEditAccount} from './rea-text-edit';
import {programIdentifier,programShape} from '../program-data';
import {setTaggedProgress,taggedProgressDate} from '../rea-pm/tagged-progress';
import {exactAlphaPrivateChange} from '../alpha-private-save-ack';
import type {ReaStoredText} from '../rea-stored-text';

/** Proposal capability only. No existing controller, transport, route or SQL opts in. */
export const ALPHA_REA_PROGRESS_EDIT_PROFILE='rea-body-progress/1' as const;
export type AlphaReaProgressOperation={commandId:string;docId:string;occurrenceId:string;entityId:string;recordDate:string;percent:number};
type TextCommand=AlphaPrivateCommand&{kind:'change-private'};
/** Progress intent travels outside the unchanged signed M3 command. A server
 * must replay it against the authenticated, revision-bound account before signing. */
export type AlphaReaProgressSubmission={profile:typeof ALPHA_REA_PROGRESS_EDIT_PROFILE;command:TextCommand;progress:AlphaReaProgressOperation[]};
export type PreparedAlphaReaProgressEdit={ownerId:string;before:AlphaReaEditAccount;expected:AlphaReaEditAccount;submission:AlphaReaProgressSubmission;changed:boolean};
const reject=(reason:string)=>({ok:false as const,reason});
const identifier=(v:unknown):v is string=>programIdentifier(v)&&v.length<=ALPHA_LIMITS.requestIdChars;
function isOperation(v:unknown):v is AlphaReaProgressOperation {
 return programShape(v,['commandId','docId','occurrenceId','entityId','recordDate','percent'])
  &&identifier(v.commandId)&&identifier(v.docId)&&identifier(v.occurrenceId)&&identifier(v.entityId)
  &&taggedProgressDate(v.recordDate)&&Number.isInteger(v.percent)&&Number(v.percent)>=0&&Number(v.percent)<=100;
}
export function isAlphaReaProgressSubmission(v:unknown):v is AlphaReaProgressSubmission {
 try{return programShape(v,['profile','command','progress'])&&v.profile===ALPHA_REA_PROGRESS_EDIT_PROFILE
  &&isAlphaReaTextEditCommand(v.command)&&Array.isArray(v.progress)&&v.progress.length>0
  &&v.progress.every(isOperation)&&new Set(v.progress.map(p=>p.commandId)).size===v.progress.length;
 }catch{return false;}
}

/** Pure current-revision proof, not an authenticated endpoint. Derive permitted
 * body/title edits from the submitted text, replay only existing local progress
 * commands, then compare the entire text. Unmentioned records/IDs/order/auxiliary
 * data cannot be rewritten. Local owner/stamp/composition/Undo provenance stays
 * with TaggedSession; this adapter must never infer it from a final snapshot. */
export function prepareAlphaReaProgressSubmission(before:unknown,value:unknown,ownerId:string,newItemsDocumentId?:string){
 try{
  if(!isAlphaReaEditAccount(before,ownerId)||!isAlphaReaProgressSubmission(value))return reject('INVALID_PROGRESS_SUBMISSION');
  const submission=detached(value),command=submission.command;
  if(command.expectedRevision!==before.revision)return reject(command.expectedRevision<before.revision?'PENDING_RECEIPT_LOOKUP_REQUIRED':'REVISION_CONFLICT');
  const change=command.changes[0];if(!change.present)return reject('INVALID_PROGRESS_SUBMISSION');
  const submitted=change.value as ReaStoredText,claimed=detached(before);claimed.space.text=detached(submitted);
  if(!isAlphaReaEditAccount(claimed,ownerId))return reject('UNSUPPORTED_ACCOUNT_PROFILE');
  const expected=projectAlphaReaTextEdit(before,claimed,ownerId,newItemsDocumentId);
  if(!expected)return reject('UNSUPPORTED_STRUCTURE_CHANGE');
  for(const operation of submission.progress){
   const applied=setTaggedProgress(expected.space.text,operation);if(!applied.ok)return reject(applied.reason);
   expected.space.text=detached(applied.snapshot);
  }
  if(canonicalJson(expected.space.text)!==canonicalJson(submitted))return reject('UNEXPLAINED_PROGRESS_OR_STRUCTURE_CHANGE');
  const changed=canonicalJson(before.space)!==canonicalJson(expected.space);
  expected.revision=before.revision+(changed?1:0);
  if(!isAlphaReaEditAccount(expected,ownerId))return reject('UNSUPPORTED_ACCOUNT_PROFILE');
  return{ok:true as const,value:{ownerId,before:detached(before),expected,submission,changed} satisfies PreparedAlphaReaProgressEdit};
 }catch{return reject('INVALID_PROGRESS_SUBMISSION');}
}

/** Build one unchanged M3 text command; local operation IDs and the Alpha save
 * request ID are separate namespaces. No local receipt is a remote save ACK. */
export function prepareAlphaReaProgressEdit(input:{before:unknown;ownerId:string;requestId:string;text:unknown;progress:readonly AlphaReaProgressOperation[];newItemsDocumentId?:string}){
 const revision=isAlphaReaEditAccount(input.before,input.ownerId)?input.before.revision:-1;
 return prepareAlphaReaProgressSubmission(input.before,{profile:ALPHA_REA_PROGRESS_EDIT_PROFILE,command:{schema:ALPHA_COMMAND_SCHEMA,kind:'change-private',requestId:input.requestId,expectedRevision:revision,changes:[{field:'text',present:true,value:input.text}]},progress:input.progress},input.ownerId,input.newItemsDocumentId);
}

/** An additional attempt-scoped proof; existing host/client pending, owner,
 * references, generation and latest-input coverage checks still must run.
 * No-change follows the existing fresh-read path, never a fabricated receipt. */
export function exactAlphaReaProgressAck(attempt:PreparedAlphaReaProgressEdit,account:unknown,receipt:AlphaReceipt){
 try{return attempt.changed&&isAlphaReaEditAccount(account,attempt.ownerId)
  &&canonicalJson(account)===canonicalJson(attempt.expected)
  &&exactAlphaPrivateChange(attempt.ownerId,attempt.before.space,attempt.submission.command,account,receipt);
 }catch{return false;}
}
