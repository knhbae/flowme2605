import {programClone,programFailure,programResult,type ProgramData,type ProgramWritingPosition} from './contract';
import {mergeProgramTextWorkspace} from './text-merge';
import {textWorkspaceModel as M,type TextWorkspaceState} from './text-workspace';
import {programPreservesLockedDocumentContent} from './reference-execution-guard';
import {programPreservesSeriesMetadata} from './recurrence-target';
import {programPreservesLegacyQualityHold} from './legacy-map-review';
import {programPreservesLegacyPlanExcluded} from './program-legacy-plan-target';

/** The existing ProgramSpace general text builder, shared with the synthetic host test.
 * Schedule/creator/social paths remain outside this boundary. */
export function programTextTransition(current:ProgramData,input:{actorId:string;documentId:string;expected:TextWorkspaceState;next:TextWorkspaceState;position?:ProgramWritingPosition}) {
  const {actorId,documentId:docId}=input;
  if(current.activeActorId!==actorId)return programFailure(current,'conflict');
  const before=current.spaces[actorId],merged=mergeProgramTextWorkspace(input.expected,input.next,before.text);
  if(!merged||!programPreservesLockedDocumentContent(before,merged)||!programPreservesSeriesMetadata(before,merged)||!programPreservesLegacyQualityHold(before,merged)||!programPreservesLegacyPlanExcluded(before,merged))return programFailure(current,'conflict');
  const next=programClone(current);next.spaces[actorId].text=merged;
  const position=input.position;
  if(position&&M.getDocument(merged,docId)?.lines.some(line=>line.id===position.lineId))next.spaces[actorId].position=position;
  const savedPosition=next.spaces[actorId].position;
  if(savedPosition.lineId&&!M.getDocument(merged,savedPosition.documentId??'')?.lines.some(line=>line.id===savedPosition.lineId))next.spaces[actorId].position={documentId:savedPosition.documentId,lineId:null,start:0,end:0,scrollTop:0};
  const ids=new Set([...merged.documents,...merged.flows].flatMap(doc=>doc.lines.map(line=>line.id)));
  for(const key of Object.keys(next.spaces[actorId].timelineOrders))next.spaces[actorId].timelineOrders[key]=next.spaces[actorId].timelineOrders[key].filter(id=>ids.has(id));
  return programResult(current,next,docId);
}
