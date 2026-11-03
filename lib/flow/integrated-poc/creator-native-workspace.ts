import { programClone, programFailure, programResult, type ProgramData, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { validateProgramData, programIdentifier } from './program-data';
import { setProgramCreatorWorking } from './creator-workspace';
import type { ProgramCreatorWorking } from './creator-workspace-contract';
import { applyNativeCreatorDocumentOperation, validateNativeCreatorDocumentOwner } from './native-creator-document';
import type { AuthoringCorrectionOperation, NativeCreatorDocumentOwner } from './native-creator-document-contract';

/** A changed input is a new review surface. Preserve every requirement, not old
 * approval evidence or row IDs which may no longer name the same source rows. */
export function buildProgramNativeCreatorRawSyncOperation(owner:NativeCreatorDocumentOwner,rawText:string):{ok:true;operation:Extract<AuthoringCorrectionOperation,{type:'sync_working_text_from_input'}>}|{ok:false;reason:string}{
  if(!validateNativeCreatorDocumentOwner(owner)||typeof rawText!=='string'||rawText.length>100000)return{ok:false,reason:'invalid'};
  if(owner.document.sourceState&&owner.document.sourceState.status!=='current')return{ok:false,reason:'source-update-pending'};
  const doc=owner.document;
  return{ok:true,operation:{type:'sync_working_text_from_input',rawText,title:doc.title,
    ...(doc.sourceTitle?{sourceTitle:doc.sourceTitle}:{}),...(doc.sourceUrl?{sourceUrl:doc.sourceUrl}:{}),
    reviewRequirements:(doc.reviewGates??[]).map(gate=>({kind:gate.kind,reasonKey:gate.reasonKey}))}};
}

/** One Program CAS stores the original native operation and matching text. No
 * original-library write, implicit save, handoff or public mutation occurs. */
export function applyProgramNativeCreatorOperation(data:ProgramData,input:{actorId:string;requestId:string;draftId:string;expectedWorking:ProgramCreatorWorking|null;expectedOwner:NativeCreatorDocumentOwner;operation:AuthoringCorrectionOperation},now:string):ProgramTransition<string>{
  if(!validateProgramData(data)||data.activeActorId!==input.actorId||!programIdentifier(input.requestId)||!Number.isFinite(Date.parse(now))||new Date(now).toISOString()!==now)return programFailure(data,'invalid');
  const space=data.spaces[input.actorId],workspace=space?.creatorWorkspace,working=workspace?.working,record=workspace?.library.records[input.draftId];
  if(!working||working.draftId!==input.draftId||!working.nativeDocument)return programFailure(data,'missing');
  // First-save-before recovery is a genuine unsaved working document. Its pending
  // input must be explicitly synchronized before save; requiring a library record
  // here would force a fake save or permanently trap the pending input.
  if(!record&&working.baseRecordRevision!==null)return programFailure(data,'missing');
  if(record&&record.status!=='active')return programFailure(data,'forbidden');
  if(working.nativePendingRawText!==undefined && (input.operation.type!=='sync_working_text_from_input'||input.operation.rawText!==working.nativePendingRawText))return programFailure(data,'conflict');
  if(!programSame(working,input.expectedWorking)){
    const prior=working.nativeDocument.actions.find(action=>action.requestId===input.requestId);
    return prior?.kind==='operation'&&programSame(prior.operation,input.operation)?programResult(data,data,input.draftId):programFailure(data,'conflict');
  }
  // Callers may not silently discard review requirements via the lower-level DTO.
  if(input.operation.type==='sync_working_text_from_input'){
    const prepared=buildProgramNativeCreatorRawSyncOperation(working.nativeDocument,input.operation.rawText);
    if(!prepared.ok||!programSame(prepared.operation,input.operation))return programFailure(data,'conflict');
  }
  const applied=applyNativeCreatorDocumentOperation(working.nativeDocument,{expectedOwner:input.expectedOwner,requestId:input.requestId,operation:input.operation},now);
  if(!applied.ok)return programFailure(data,applied.reason==='conflict'?'conflict':applied.reason==='history-capacity'||applied.reason==='document-capacity'?'limit':'unresolved');
  if(!applied.changed)return programResult(data,data,input.draftId);
  const next:ProgramCreatorWorking={...programClone(working),nativeDocument:applied.owner,rawText:applied.owner.document.rawText};
  delete next.nativePendingRawText;
  if(next.rawText!==working.rawText)delete next.sourceIdentity;
  return setProgramCreatorWorking(data,{actorId:input.actorId,expectedWorking:working,working:next},now);
}
