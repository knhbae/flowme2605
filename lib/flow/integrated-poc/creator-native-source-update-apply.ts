import {applyAuthoringOperation} from './native-creator-vendor/text-authoring/operations';
import {stageAuthoringSourceUpdate} from './native-creator-vendor/text-authoring/source-update';
import {deriveAuthoringArtifactEligibility} from './native-creator-vendor/text-authoring/parser';
import {deriveAuthoringLifecycleStatus} from './native-creator-vendor/text-authoring/review-policy';
import {stableAuthoringId,stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import type {TextAuthoringDocument,AuthoringSourceUpdateChange,CanonicalAuthoringItem} from './native-creator-vendor/text-authoring/types';
const copy=<T,>(v:T):T=>structuredClone(v);
const same=(a:unknown,b:unknown)=>stableAuthoringJson(a)===stableAuthoringJson(b);
const withoutDecision=(c:AuthoringSourceUpdateChange)=>{const {state:_,resolution:__,actorLane:___,decidedAt:____,...value}=c;return value;};
/** Program v1 only. The pinned service creates a valid keep marker but its
 * domain's recomputed-diff check rejects that marker. Validate the complete
 * genuine diff first, run ALL original apply guards on a normalized clone,
 * then retain only the exact explicitly kept working fields. Ordinary native
 * apply_source_update is unchanged. No source rows are guessed or reparsed. */
export function replayNativeSourceApply(document:TextAuthoringDocument,at:string,applyVersion:1|2=1):TextAuthoringDocument|null {
 try {
  const state=document.sourceState;if(!state||state.status==='current')return null;
  const probe=copy(document);if(!stageAuthoringSourceUpdate(probe,copy(state.incoming),state.stagedAt))return null;
  const recomputed=probe.sourceState;if(!recomputed||recomputed.status==='current'||recomputed.changes.length!==state.changes.length)return null;
  const normalized=copy(document),normalState=normalized.sourceState;if(!normalState||normalState.status==='current')return null;
  const keep:Array<Extract<AuthoringSourceUpdateChange,{kind:'changed'}>>=[];
  for(const actual of state.changes){
   const expected=recomputed.changes.find(c=>c.changeId===actual.changeId);if(!expected||actual.state!=='resolved'||actual.actorLane!=='creator'||!actual.decidedAt)return null;
   if(same(withoutDecision(actual),withoutDecision(expected)))continue;
   if(actual.kind!=='changed'||expected.kind!=='changed'||expected.userValue!==undefined||actual.resolution!=='keep_user'||actual.userOwner!=='creator')return null;
   const marker={...withoutDecision(expected),userOwner:'creator',userValue:expected.oldSourceValue??null};
   if(!same(withoutDecision(actual),marker))return null;
   keep.push(actual);const target=normalState.changes.find(c=>c.changeId===actual.changeId)!;
   Object.assign(target,copy(expected),{state:'resolved',resolution:'use_incoming',actorLane:'creator',decidedAt:actual.decidedAt});
   if(target.kind==='changed'){delete target.userOwner;delete target.userValue;}
  }
  // This still rejects unsupported child/semantic changes and invalid matches.
  const result=applyAuthoringOperation(normalized,{type:'apply_source_update'},{actorLane:'creator',now:at});
  if(result.sourceState?.status!=='current')return null;
  if(!keep.length)return JSON.parse(JSON.stringify(result));
  const orderMoves:Array<{id:string;order:number}>=[];
  for(const c of keep){const before=document.parseResult.canonical.items.find(i=>i.itemId===c.activeItemId),after=result.parseResult.canonical.items.find(i=>i.itemId===c.incomingItemId);if(!before||!after)return null;
   switch(c.field){
    case 'title':after.title=before.title;after.titleOverrides={...after.titleOverrides,creator:before.title};after.creatorTitle=before.title;break;
    case 'detail':after.detail=before.detail;after.detailOverrides={...after.detailOverrides,creator:before.detail??''};after.creatorDetail=before.detail??'';break;
    case 'completion':after.completion=copy(before.completion);if(before.completion)after.completionOverrides={...after.completionOverrides,creator:{...copy(before.completion),owner:'creator'}};else{if(applyVersion===1)delete after.sourceCompletion;delete after.completionOverrides;}break;
    case 'schedule':{after.schedule=copy(before.schedule);if(before.schedule)after.scheduleOverrides={...after.scheduleOverrides,creator:copy(before.schedule)};else{if(applyVersion===1)delete after.sourceSchedule;delete after.scheduleOverrides;}const keys=new Set(['date','relative_date','time','timezone','duration','repeat']);after.properties=[...after.properties.filter(p=>!keys.has(p.key)),...before.properties.filter(p=>keys.has(p.key)).map(p=>({...copy(p),owner:'creator' as const}))];break;}
    case 'source_checked':after.sourceChecked=before.sourceChecked;break;
    case 'resources':case 'sources':after[c.field]=copy(before[c.field]).map(v=>({...v,owner:'creator'}));break;
    case 'guides':case 'cautions':after[c.field]=copy(before[c.field]);break;
    case 'role':after.role=before.role;break;
    case 'included':after.included=before.included;break;
    case 'nesting':after.nestingLevel=before.nestingLevel;break;
    case 'order':orderMoves.push({id:after.itemId,order:before.order});break;
    case 'step_mapping':{const oldStep=document.parseResult.canonical.steps.find(s=>s.stepId===before.stepId);if(!oldStep)return null;if(!result.parseResult.canonical.steps.some(s=>s.stepId===oldStep.stepId)){result.parseResult.canonical.steps.push({...copy(oldStep),itemIds:[],generated:true});result.parseResult.canonical.flow.stepIds.push(oldStep.stepId);}after.stepId=oldStep.stepId;break;}
    default:return null;
   }
   result.parseResult.mappings.filter(m=>m.targetDraftId===after.itemId).forEach(m=>m.userCorrected=true);
  }
  // Retained values may refer to genuine previous source rows. Keep those rows
  // as tombstones, never associate them with a newly parsed row by position.
  const rows=new Set(result.parseResult.canonical.sourceRows.map(r=>r.sourceRowId));
  if(keep.length)for(const row of document.parseResult.canonical.sourceRows)if(!rows.has(row.sourceRowId))result.parseResult.canonical.sourceRows.push({...copy(row),state:'tombstone',sourceSnapshotId:row.sourceSnapshotId??state.active.snapshotId});
  const canonical=result.parseResult.canonical;
  for(const move of orderMoves.sort((a,b)=>a.order-b.order)){const index=canonical.items.findIndex(i=>i.itemId===move.id),[item]=canonical.items.splice(index,1);canonical.items.splice(Math.min(move.order,canonical.items.length),0,item);}
  canonical.steps.forEach((step,index)=>{step.order=index;step.itemIds=canonical.items.filter(i=>i.stepId===step.stepId).map(i=>i.itemId);});
  const byId=new Map(canonical.items.map(i=>[i.itemId,i]));canonical.items=canonical.steps.flatMap(s=>s.itemIds).map(id=>byId.get(id) as CanonicalAuthoringItem);canonical.items.forEach((i,index)=>i.order=index);
  // Keep original revision identity/operation. Its before image must be the
  // real staged aggregate, not the validation clone's temporary resolutions.
  const revision=result.revision;if(revision.before){revision.before.sourceState=copy(document.sourceState);revision.before.parseResult=copy(document.parseResult);}
  result.revisionHistory[result.revisionHistory.length-1]=copy(revision);
  result.parseResult.artifactEligibility=deriveAuthoringArtifactEligibility(canonical);
  result.parseResult.parseResultId=stableAuthoringId('parse-result',result.documentId,result.parseResult.parserVersion,result.parseResult.fixtureVersion,stableAuthoringJson(canonical),revision.revisionId);
  result.lifecycleStatus=deriveAuthoringLifecycleStatus(result,'draft');
  return JSON.parse(JSON.stringify(result));
 }catch{return null;}
}
