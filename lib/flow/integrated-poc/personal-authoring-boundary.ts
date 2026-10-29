import type {AlphaPrivateCommand,AlphaSpace} from './alpha-persistence/contract';
import {validatePersonalAuthoring,preservesPersonalAuthoringHistory,calculatePersonalRounds,resolvePersonalTaskDate,type PersonalAuthoringV1} from './personal-authoring';
import {textWorkspaceModel as M,type TextWorkspaceState} from './text-workspace';
import {canonicalJson} from './alpha-persistence/json';

function preservesAddedRounds(before:PersonalAuthoringV1|undefined,next:PersonalAuthoringV1,prior:TextWorkspaceState,native:TextWorkspaceState):boolean{
 const oldIds=new Set([...prior.documents,...prior.flows].flatMap(doc=>[doc.id,...doc.lines.map(line=>line.id)])),newDocs=new Set<string>(),newLines=new Set<string>(),tasks=new Map(M.tasks(native).map(t=>[t.id,t]));
 for(const series of next.series){const old=before?.series.find(s=>s.id===series.id);const added=series.rounds.filter(round=>!old?.rounds.some(r=>r.id===round.id));if(!added.length)continue;
  const source=series.source,version=source.kind==='flow'?next.flows.find(f=>f.flowId===source.flowId)!.versions.find(v=>v.id===source.versionId)!:source.version;
  const materialized=[...(old?.rounds??[])];
  for(const round of added){const rule=series.ruleVersions.find(r=>r.id===round.ruleVersionId)!.rule,calculation=calculatePersonalRounds(version,{rule,materialized,targetKind:source.kind});if(!calculation.ok)return false;
   const expected=calculation.value.rounds.find(r=>r.anchorDate===round.anchorDate),doc=M.getDocument(native,round.executionDocumentId);if(!expected||expected.index!==round.index||!doc||oldIds.has(doc.id)||doc.lines.some(l=>oldIds.has(l.id)))return false;
   newDocs.add(doc.id);for(const line of doc.lines)newLines.add(line.id);const analysis=M.parseDocument(doc,native);
   if(analysis.items.some(item=>M.currentProgress(native,item.id)!==0)||native.bindings.some(b=>b.docId===doc.id)||analysis.tasks.length!==expected.items.length)return false;
   const layouts=analysis.rows.filter(row=>row.kind==='heading'||row.kind==='note'&&!row.parentTaskId&&row.text.trim()).map(row=>row.kind==='heading'?row.text.replace(/^ *#+\s+/,''):row.text.trimStart());
   if(canonicalJson(layouts)!==canonicalJson(expected.nodes.filter(n=>n.kind!=='action').flatMap(n=>n.text.split('\n'))))return false;
   for(const item of expected.items){const node=expected.nodes.find(n=>n.kind==='action'&&n.taskId===item.taskId),task=tasks.get(round.taskIds[item.taskId]);if(!node||node.kind!=='action'||!task||task.docId!==doc.id||task.parentTaskId!==(item.parentTaskId===null?null:round.taskIds[item.parentTaskId])||task.title!==node.title||task.note!==node.memo||task.time!==node.time||task.scopeId!==node.scopeId||task.date!==item.date)return false;
    const checks=analysis.items.filter(c=>!c.isCanonical&&c.parentTaskId===task.id),checkIds=new Map(node.subchecks.map((check,i)=>[check.id,checks[i]?.id]));if(checks.length!==node.subchecks.length)return false;
    for(const [i,frozen]of node.subchecks.entries()){const actual=checks[i];if(actual.title!==frozen.title||actual.note!==frozen.memo||actual.time!==frozen.time||native.itemScopes[actual.id]!==frozen.scopeId||actual.parentItemId!==(frozen.parentId===null?task.id:checkIds.get(frozen.parentId)))return false;
     if(frozen.date.kind==='inherit'){if(actual.explicitDate)return false;}else{const date=resolvePersonalTaskDate(frozen.date,round.anchorDate);if(!date.ok||!actual.explicitDate||actual.date!==date.value)return false;}
    }
   }
   materialized.push(round);
  }
 }
 if(!newDocs.size)return true;
 const stripped={...native,documents:native.documents.filter(d=>!newDocs.has(d.id)),flows:native.flows.filter(d=>!newDocs.has(d.id)),taskScopes:Object.fromEntries(Object.entries(native.taskScopes).filter(([id])=>!newLines.has(id))),itemScopes:Object.fromEntries(Object.entries(native.itemScopes).filter(([id])=>!newLines.has(id))),bindings:native.bindings.filter(b=>!newDocs.has(b.docId))};
 return canonicalJson(prior)===canonicalJson(stripped);
}

/** Runs at explicit save/command boundaries, never in the native input path. */
export function preservesPersonalAuthoring(before:AlphaSpace,after:AlphaSpace,command:Pick<AlphaPrivateCommand,'kind'|'authoringVersion'>):boolean{
 const previous=before.personalAuthoring,next=after.personalAuthoring;
 if(previous===undefined&&next===undefined)return true;
 if(command.kind!=='change-private'||command.authoringVersion!==1||!next||!validatePersonalAuthoring(next,after.text as TextWorkspaceState))return false;
 const prior=before.text as TextWorkspaceState,native=after.text as TextWorkspaceState;
 return preservesPersonalAuthoringHistory(previous,next,{before:prior,next:native})&&preservesAddedRounds(previous,next,prior,native);
}
export function personalAuthoringCapability(before:AlphaSpace,after:AlphaSpace):{authoringVersion:1}|Record<string,never>{return before.personalAuthoring!==undefined||after.personalAuthoring!==undefined?{authoringVersion:1}:{};}
