import { programClone, programFailure, programResult, type ProgramData } from './contract';
import { programSame } from './controller';
import { readProgramLegacyPlan, previewProgramLegacyPlan, type ProgramLegacyPlanDraft } from './program-legacy-plan';
import { programLegacyPlanDate } from './program-legacy-plan-contract';
import { prepareProgramLegacyView } from './legacy-transaction';
import { inspectProgramLegacySnapshotPayload } from './legacy-snapshot';
import { reconcileProgramLegacy } from './legacy-reconcile';
import type { ProgramLegacyMapChildMode, ProgramLegacyMapPlanSelection } from './program-legacy-map-plan-contract';
import { mergeProgramLegacySeriesPlans,programLegacySeriesOwnerConflict } from './program-legacy-series-plan';
import { programLegacyMapMembershipChildRetained } from './legacy-map-membership-state';
export type ProgramLegacyMapPlanDraft={personalAnchor?:string;reviewSourceToken?:string;children:Record<string,{mode:ProgramLegacyMapChildMode;selection:ProgramLegacyPlanDraft}>};
function canonical(v:unknown):string{return JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);}
export function readProgramLegacyMapPlan(data:ProgramData,actorId:string,flowRef:string,now:string){
 const first=readProgramLegacyPlan(data,actorId,flowRef,now);if(!first.ok)return first;const group=first.source.presentation?.mapGroup;if(!group)return{ok:false as const,reason:'missing-map'};
 const checked=inspectProgramLegacySnapshotPayload(first.view.payload);if(!checked.ok)return{ok:false as const,reason:'invalid-source'};
 if(programLegacyMapMembershipChildRetained(checked.payload.mapMembership,flowRef))return{ok:false as const,reason:'retained-map-child'};
 const sources=checked.mapSourceFlows.filter(f=>f.presentation?.mapGroup?.groupRef===group.groupRef&&!programLegacyMapMembershipChildRetained(checked.payload.mapMembership,f.ref)).sort((a,b)=>a.ref.localeCompare(b.ref));
 if(!sources.length||sources.some(f=>f.presentation?.mapGroup?.ownerId!==group.ownerId))return{ok:false as const,reason:'invalid-source'};
 // The selected child already passed the same scoped read in this invocation.
 const children=[];for(const source of sources){const child=source.ref===flowRef?first:readProgramLegacyPlan(data,actorId,source.ref,now);if(!child.ok)return child;children.push(child);}
 const saved=first.view.payload.planSelections?.groups?.[group.groupRef];
 const token=canonical({groupRef:group.groupRef,ownerId:group.ownerId,children:children.map(c=>({ref:c.flow.ref,sourceToken:c.token}))});
 return{ok:true as const,group,saved,token,stale:!!saved&&saved.sourceToken!==token,children,childFlowRefs:sources.map(f=>f.ref),personalAnchor:saved?.personalAnchor,expectedSpace:programClone(data.spaces[actorId])};
}
export function previewProgramLegacyMapPlan(data:ProgramData,input:{actorId:string;flowRef:string;now:string;draft:ProgramLegacyMapPlanDraft}){
 const read=readProgramLegacyMapPlan(data,input.actorId,input.flowRef,input.now);if(!read.ok)return read;
 const fail=(reason:string)=>({ok:false as const,reason});
 if(read.stale&&input.draft.reviewSourceToken!==read.token)return fail('source-review-required');
 if(input.draft.personalAnchor!==undefined&&!programLegacyPlanDate(input.draft.personalAnchor))return fail('invalid-anchor');
 const childKeys=Object.keys(input.draft.children);if(childKeys.length!==read.childFlowRefs.length||childKeys.some(ref=>!read.childFlowRefs.includes(ref)))return fail('invalid-map-child-selection');
 const common=input.draft.personalAnchor??read.personalAnchor,previews=[];
 for(const child of read.children){const draft=input.draft.children[child.flow.ref];if(!draft||!['follow-group','fixed-child'].includes(draft.mode?.mode))return fail('invalid-map-child-selection');
  const anchor=draft.mode.mode==='fixed-child'?draft.mode.anchor:common;
  if(read.saved&&!read.saved.childFlowRefs.includes(child.flow.ref)&&child.rows.some(row=>typeof draft.selection.newItemChoices?.[row.itemRef]!=='boolean'||draft.selection.newItemChoices[row.itemRef]!==draft.selection.includedItemRefs.includes(row.itemRef)))return fail('new-items-need-explicit-choice');
  if(anchor!==undefined&&!programLegacyPlanDate(anchor))return fail('invalid-anchor');
  // Switching back to shared scheduling must identify the common day, not silently keep a child pin.
  if(draft.mode.mode==='follow-group'&&anchor===undefined&&read.saved?.childModes[child.flow.ref]?.mode==='fixed-child')return fail('shared-anchor-required');
  const preview=previewProgramLegacyPlan(data,{actorId:input.actorId,flowRef:child.flow.ref,now:input.now,mapGroupRef:read.group.groupRef,draft:{...draft.selection,personalAnchor:anchor}});if(!preview.ok)return preview;previews.push(preview);
 }
 const seriesConflict=programLegacySeriesOwnerConflict(previews.flatMap(p=>p.seriesPreviews));if(seriesConflict)return fail(seriesConflict);
 const retainedChildren={...read.saved?.retainedChildren};for(const ref of read.saved?.childFlowRefs??[])if(!read.childFlowRefs.includes(ref))retainedChildren[ref]={sourceToken:read.saved!.sourceToken,mode:read.saved!.childModes[ref]};for(const ref of read.childFlowRefs)delete retainedChildren[ref];
 const candidate:ProgramLegacyMapPlanSelection={ownerId:read.group.ownerId,sourceToken:read.token,childFlowRefs:read.childFlowRefs,childModes:Object.fromEntries(read.childFlowRefs.map(ref=>[ref,input.draft.children[ref].mode])),...(common?{personalAnchor:common}:{}),...(Object.keys(retainedChildren).length?{retainedChildren}:{})};
 return{ok:true as const,read,candidate,previews,counts:{planDateChanges:previews.reduce((n,p)=>n+p.counts.planDateChanges,0),executionDateChanges:previews.reduce((n,p)=>n+p.counts.executionDateChanges,0),excluded:previews.reduce((n,p)=>n+p.counts.excluded,0),restored:previews.reduce((n,p)=>n+p.counts.restored,0)}};
}
export function applyProgramLegacyMapPlan(data:ProgramData,input:{actorId:string;flowRef:string;now:string;draft:ProgramLegacyMapPlanDraft;expectedSpace:ProgramData['spaces'][string]}){
 if(data.activeActorId!==input.actorId)return programFailure(data,'forbidden');if(!programSame(data.spaces[input.actorId],input.expectedSpace))return programFailure(data,'conflict');
 const preview=previewProgramLegacyMapPlan(data,input);if(!preview.ok)return programFailure(data,'unresolved');
 if(!preview.read.saved&&input.draft.personalAnchor===undefined&&preview.previews.every(p=>!p.read.saved&&p.candidate.includedItemRefs.length===p.candidate.catalogItemRefs.length)&&Object.values(input.draft.children).every(c=>c.mode.mode==='follow-group'))return programResult(data,data,input.flowRef);
 if(programSame(preview.candidate,preview.read.saved)&&preview.previews.every(p=>programSame(p.candidate,p.read.saved)&&!p.seriesPreviews.some(s=>s.status==='changed')))return programResult(data,data,input.flowRef);
 const view=prepareProgramLegacyView(data,{actorId:input.actorId,now:input.now,onlyFlowRefs:preview.read.childFlowRefs});if(!view.ok)return programFailure(data,view.reason);
 const rebased=programClone(data),space=rebased.spaces[input.actorId];space.legacySnapshot={...space.legacySnapshot!,raw:JSON.stringify(view.payload),revision:view.payload.state.revision};
 const payload={...view.payload,planSelections:{version:1 as const,flows:{...view.payload.planSelections?.flows,...Object.fromEntries(preview.previews.map(p=>[p.read.flow.ref,p.candidate]))},groups:{...view.payload.planSelections?.groups,[preview.read.group.groupRef]:preview.candidate}}};
 const merged=reconcileProgramLegacy(rebased,payload,{actorId:input.actorId,expectedSnapshotRaw:space.legacySnapshot.raw,canonicalFolders:true,onlyFlowRefs:preview.read.childFlowRefs});if(!merged.ok)return programFailure(data,merged.reason);
 const combined=mergeProgramLegacySeriesPlans(data,merged.data,input.actorId,preview.previews.flatMap(p=>p.seriesPreviews));return combined.ok?programResult(data,combined.data,input.flowRef):programFailure(data,'unresolved');
}
