import {programFailure,type ProgramData} from './contract';
import {programSame} from './controller';
import {recordProgramTaskProgress} from './private-space';
import {programTextTransition} from './program-text-transition';
import {textWorkspaceModel as M,type TextWorkspaceState} from './text-workspace';
import type {ProgramTaskProgressEdit} from './program-text-draft';
import {programShape} from './program-data';

/** Exact existing progress transaction. No token-only shortcut, guessed merge,
 * implicit today record, ID allocation or relaxed source/permission guards. */
export function programTextProgressTransition(current:ProgramData,input:{actorId:string;requestId:string;documentId:string;expected:TextWorkspaceState;next:TextWorkspaceState;progress:ProgramTaskProgressEdit}){
  const {actorId,documentId,progress}=input,before=current.spaces[actorId];
  if(!progress||!programShape(progress,['taskId','date','percent',...(Object.hasOwn(progress,'correctionAsOfDate')?['correctionAsOfDate']:[])]))return programFailure(current,'invalid');
  if(current.activeActorId!==actorId||!before||!programSame(before.text,input.expected))return programFailure(current,'conflict');
  const row=M.rowMeta(before.text,documentId).find(item=>item.id===progress.taskId);
  if(!row||row.kind!=='task'||!row.isCanonical||row.isReference||row.progressTargetId!==progress.taskId)return programFailure(current,'unresolved');
  const result=recordProgramTaskProgress(current,{actorId,requestId:input.requestId,expectedSpace:before,taskId:progress.taskId,date:progress.date,percent:progress.percent,
    ...(progress.correctionAsOfDate===undefined?{}:{correctionAsOfDate:progress.correctionAsOfDate})});
  if(!result.ok)return result;
  if(!programSame(result.data.spaces[actorId].text,input.next))return programFailure(current,'conflict');
  // Keep the existing text merge/content/series/legacy/position/timeline protection too.
  const guarded=programTextTransition(current,{actorId,documentId,expected:input.expected,next:input.next});
  return guarded.ok?result:guarded;
}
