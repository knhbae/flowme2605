import {programClone,programFailure,programResult,type ProgramData,type ProgramTransition} from './contract';
import {validateProgramData,programIdentifier} from './program-data';
import {programSame} from './controller';
import type {ProgramCreatorWorking} from './creator-workspace-contract';
import {stageCreatorNativeSourceCandidate,readCreatorNativeSourceSession,transitionCreatorNativeSourceSession} from './creator-native-source-update';
import type {CreatorNativeSourceAuthority,CreatorNativeSourceSession,CreatorNativeSourceFailure} from './creator-native-source-update-contract';
import {upgradeNativeCreatorAbsences} from './native-creator-document';

type Head={actorId:string;draftId:string;expectedWorking:ProgramCreatorWorking|null;expectedSession:CreatorNativeSourceSession|null};
type Stage=Parameters<typeof stageCreatorNativeSourceCandidate>[1];
type Event=Parameters<typeof transitionCreatorNativeSourceSession>[2]['event'];
const validNow=(now:string)=>Number.isFinite(Date.parse(now))&&new Date(now).toISOString()===now;
function current(data:ProgramData,actorId:string,draftId:string){
 const workspace=data.spaces[actorId]?.creatorWorkspace,working=workspace?.working,record=workspace?.library.records[draftId];
 if(!workspace||!record||!working||working.draftId!==draftId||!working.nativeDocument)return null;
 const authority:CreatorNativeSourceAuthority={actorId,draftId,lane:'creator',permission:data.activeActorId===actorId&&working.nativeDocument.document.ownership==='creator',archived:record.status!=='active'||working.nativeDocument.document.lifecycleStatus==='archived'};
 return{workspace,working,record,owner:working.nativeDocument,entry:workspace.sourceUpdateSessions?.[draftId]??null,session:workspace.sourceUpdateSessions?.[draftId]?.session??null,authority};
}
function failure(data:ProgramData,reason:CreatorNativeSourceFailure):ProgramTransition<string>{
 return programFailure(data,reason==='forbidden'?'forbidden':reason==='conflict'||reason==='stale-candidate'?'conflict':reason==='history-capacity'||reason==='document-capacity'?'limit':'unresolved');
}
function check(data:ProgramData,input:Head,now:string,replayRequestId?:string){
 if(!validateProgramData(data)||!validNow(now)||!programIdentifier(input.actorId)||!programIdentifier(input.draftId)||data.activeActorId!==input.actorId)return null;
 const head=current(data,input.actorId,input.draftId);
 if(!head||!head.authority.permission||head.authority.archived||head.working.nativePendingRawText!==undefined)return null;
 const retained=replayRequestId&&head.session?.events.some(event=>event.requestId===replayRequestId)&&head.session.sessionId===input.expectedSession?.sessionId;
 if(!retained&&(!programSame(head.working,input.expectedWorking)||!programSame(head.session,input.expectedSession)))return null;
 return head;
}
/** Candidate decisions and canonical work share the existing Program transaction.
 * The original saved record, personal execution and public repositories stay unchanged. */
export function stageProgramNativeSourceUpdate(data:ProgramData,input:Head&{envelope:Stage['envelope'];candidateDocument:Stage['candidateDocument'];matches?:Stage['matches'];projectionOptions?:Stage['projectionOptions'];replaceSession?:boolean},now:string):ProgramTransition<string>{
 const head=check(data,input,now);if(!head)return programFailure(data,'conflict');
 if(head.session){
  if(programSame(head.session.baseOwner,head.owner)&&programSame(head.session.envelope,input.envelope)&&programSame(head.session.candidateDocument,input.candidateDocument)&&programSame(head.session.matches,input.matches??[])&&programSame(head.session.projectionOptions,input.projectionOptions??{}))return programResult(data,data,head.session.sessionId);
  const view=readCreatorNativeSourceSession(head.session,head.owner,head.authority);if(!view.ok)return failure(data,view.reason);
  if(!input.replaceSession&&!['rejected','reverted','undo-available'].includes(view.value.status))return programFailure(data,'conflict');
 }
 const result=stageCreatorNativeSourceCandidate(head.owner,{envelope:input.envelope,candidateDocument:input.candidateDocument,matches:input.matches,projectionOptions:input.projectionOptions,authority:head.authority},now);
 if(!result.ok)return failure(data,result.reason);
 const next=programClone(data),workspace=next.spaces[input.actorId].creatorWorkspace!;workspace.sourceUpdateSessions??={};workspace.sourceUpdateSessions[input.draftId]={version:1,session:result.value,baseSourceIdentity:programClone(head.working.sourceIdentity??null)};
 return validateProgramData(next)?programResult(data,next,result.value.sessionId):programFailure(data,'invalid');
}
/** Fresh owner authority and both exact heads are checked for every decision/reentry. */
export function transitionProgramNativeSourceUpdate(data:ProgramData,input:Head&{requestId:string;event:Event},now:string):ProgramTransition<string>{
 const head=check(data,input,now,input.requestId);if(!head?.session||!programIdentifier(input.requestId))return programFailure(data,'conflict');
 const result=transitionCreatorNativeSourceSession(head.session,head.owner,{expectedSession:input.expectedSession!,requestId:input.requestId,event:input.event,authority:head.authority},now);
 if(!result.ok)return failure(data,result.reason);if(!result.value.changed)return programResult(data,data,head.session.sessionId);
 const next=programClone(data),workspace=next.spaces[input.actorId].creatorWorkspace!;workspace.sourceUpdateSessions![input.draftId].session=result.value.session;
 if(result.value.ownerChanged){
  const working=workspace.working!;working.nativeDocument=result.value.owner;working.rawText=result.value.owner.document.rawText;
  if(working.rawText!==head.working.rawText)delete working.sourceIdentity;
  if(input.event.kind==='undo'){
   if(head.entry?.baseSourceIdentity)working.sourceIdentity=programClone(head.entry.baseSourceIdentity);else delete working.sourceIdentity;
  }
 }
 return validateProgramData(next)?programResult(data,next,head.session.sessionId):programFailure(data,'invalid');
}
export function readProgramNativeSourceUpdate(data:ProgramData,actorId:string,draftId:string){
 if(!validateProgramData(data)||data.activeActorId!==actorId)return null;
 const head=current(data,actorId,draftId);if(!head?.session)return null;
 return readCreatorNativeSourceSession(head.session,head.owner,head.authority);
}
/** Explicit recovery of a historical Program v1 marker, never an operating migration. */
export function upgradeProgramNativeSourceAbsences(data:ProgramData,input:Head&{requestId:string},now:string):ProgramTransition<string>{
 const head=check(data,input,now);if(!head||!programIdentifier(input.requestId))return programFailure(data,'conflict');
 const result=upgradeNativeCreatorAbsences(head.owner,{expectedOwner:input.expectedWorking!.nativeDocument!,requestId:input.requestId},now);
 if(!result.ok)return programFailure(data,result.reason==='history-capacity'||result.reason==='document-capacity'?'limit':'conflict');
 if(!result.changed)return programResult(data,data,input.draftId);
 const next=programClone(data);next.spaces[input.actorId].creatorWorkspace!.working!.nativeDocument=result.owner;
 return validateProgramData(next)?programResult(data,next,input.draftId):programFailure(data,'invalid');
}
