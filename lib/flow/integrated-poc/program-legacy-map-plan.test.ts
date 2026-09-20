import assert from 'node:assert/strict';import test from 'node:test';
import { buildSourceBackedFlowMapSavedSnapshot,buildSourceBackedFlowMapPersistenceRecord,sourceBackedMyFlowBundles } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData,validateProgramData } from './program-data';import { hydrateProgramLegacy } from './legacy-projection';
import { readProgramLegacyMapPlan,previewProgramLegacyMapPlan,applyProgramLegacyMapPlan,type ProgramLegacyMapPlanDraft } from './program-legacy-map-plan';
import { validateProgramLegacyPlanSelections } from './program-legacy-plan-contract';import { programClone,PROGRAM_STATE_KEY } from './contract';
import { createProgramController } from './controller';
import { inspectProgramLegacySnapshotPayload } from './legacy-snapshot';
import { textWorkspaceModel as M } from './text-workspace';
import { transitionProgramLegacySourcePayload, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { sourceCanonical, programLegacySourceChanges } from './legacy-source-lifecycle-contract';
import { applyProgramLegacySourceAction, prepareProgramLegacyView } from './legacy-transaction';
import type { ProgramLegacySnapshotPayload } from './legacy-snapshot';
const now='2026-09-13T00:00:00.000Z',actorId='local-user';
function fixture(mapId='curated-opic-mock-course'){const keys:Record<string,string>={[`flow:map:saved:${mapId}`]:JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId,{savedAt:now,anchor:'2026-09-30'})),[`flow:map:persistence:${mapId}`]:JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId,{savedAt:now,anchor:'2026-09-30'}))};const read=buildPersonalWorkspacePocReadModel({length:Object.keys(keys).length,key:i=>Object.keys(keys)[i]??null,getItem:k=>keys[k]??null},sourceBackedMyFlowBundles);assert.ok(read.ok);const hydrated=hydrateProgramLegacy(createProgramData(),read.model,createPersonalWorkspacePocState(now),{actorId,preserveUnsupported:true});assert.ok(hydrated.ok);const data=hydrated.data,flowRef=read.model.flows[0].ref;return{data,flowRef,keys};}
function draftFor(f:ReturnType<typeof fixture>,anchor='2026-10-10'){const r=readProgramLegacyMapPlan(f.data,actorId,f.flowRef,now);assert.ok(r.ok,JSON.stringify(r));const draft:ProgramLegacyMapPlanDraft={personalAnchor:anchor,children:Object.fromEntries(r.children.map(c=>[c.flow.ref,{mode:{mode:'follow-group'},selection:{includedItemRefs:c.rows.map(i=>i.itemRef)}}]))};return{read:r,draft};}
test('Map genuine factory shared anchor changes exact child catalog, private child fixed remains intentional',()=>{const f=fixture(),p=draftFor(f),fixed=p.read.children[0];p.draft.children[fixed.flow.ref].mode={mode:'fixed-child',anchor:'2026-09-30'};const preview=previewProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft});assert.ok(preview.ok,JSON.stringify(preview));assert.equal(preview.previews[0].counts.planDateChanges,0);const before=JSON.parse(f.data.spaces[actorId].legacySnapshot!.raw);const result=applyProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:f.data.spaces[actorId]});assert.ok(result.ok,JSON.stringify(result));assert.ok(validateProgramData(result.data));const after=JSON.parse(result.data.spaces[actorId].legacySnapshot!.raw);assert.deepEqual(after.model,before.model);assert.deepEqual(after.state,before.state);assert.equal(after.mapReview,before.mapReview);assert.equal(after.planSelections.groups[p.read.group.groupRef].childModes[fixed.flow.ref].mode,'fixed-child');assert.deepEqual(result.data.spaces[actorId].savedBindings.map(b=>b.itemLines),f.data.spaces[actorId].savedBindings.map(b=>b.itemLines));});
test('Map absent owner read/default does not migrate; foreign child and invalid owner fail closed',()=>{const f=fixture(),before=JSON.stringify(f.data),p=draftFor(f);delete p.draft.personalAnchor;const no=applyProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:f.data.spaces[actorId]});assert.ok(no.ok);assert.equal(JSON.stringify(no.data),before);p.draft.children.foreign=p.draft.children[p.read.childFlowRefs[0]];assert.equal(previewProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft}).ok,false);assert.equal(validateProgramLegacyPlanSelections({version:1,flows:{},groups:{x:{ownerId:'x',sourceToken:'x',childFlowRefs:['x'],childModes:{x:{mode:'fixed-child',anchor:'2026-02-30'}}}}}),false);});
test('Map controller quota/CAS zero write, canonical reload and one Undo preserve source/other documents',async()=>{const f=fixture(),p=draftFor(f),values=new Map<string,string>([['flow:original','unchanged']]);let writes=0,quota=true;const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(quota)throw Error('quota');writes++;values.set(k,v);},removeItem:()=>{throw Error('remove');}};const c=createProgramController({initialData:f.data,storage,exclusive:async w=>w()});assert.ok(c.ok);const commit=()=>c.mutate('Map 계획',d=>applyProgramLegacyMapPlan(d,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:f.data.spaces[actorId]}),{actorId});assert.equal((await commit()).ok,false);assert.equal(writes,0);quota=false;assert.ok((await commit()).ok);assert.equal(writes,1);const re=createProgramController({initialData:f.data,storage,exclusive:async w=>w()});assert.ok(re.ok);assert.ok(validateProgramData(re.snapshot().envelope.data));assert.equal((await commit()).ok,false);assert.equal(writes,1);assert.ok((await re.undo(actorId)).ok);assert.deepEqual(re.snapshot().envelope.data.spaces[actorId],f.data.spaces[actorId]);assert.equal(values.get('flow:original'),'unchanged');assert.ok(values.has(PROGRAM_STATE_KEY));});
test('Map membership keeps exact canonical lines, private document and quality policy; restore keeps IDs',()=>{
 const f=fixture();f.data.spaces[actorId].text=M.addDocument(f.data.spaces[actorId].text,{title:'무관 개인 문서'});
 const p=draftFor(f);delete p.draft.personalAnchor;const child=p.read.children.find(c=>c.rows.length>1)!;
 p.draft.children[child.flow.ref].selection.includedItemRefs=child.rows.slice(1).map(r=>r.itemRef);
 const before=programClone(f.data.spaces[actorId]),baseline=inspectProgramLegacySnapshotPayload(JSON.parse(before.legacySnapshot!.raw));assert.ok(baseline.ok);
 const hidden=applyProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:before});assert.ok(hidden.ok,JSON.stringify(hidden));
 assert.deepEqual(hidden.data.spaces[actorId].text,before.text);
 const checked=inspectProgramLegacySnapshotPayload(JSON.parse(hidden.data.spaces[actorId].legacySnapshot!.raw));assert.ok(checked.ok);
 assert.deepEqual(checked.model.flows.map(f=>f.presentation?.mapGroup),baseline.model.flows.map(f=>f.presentation?.mapGroup));
 p.draft.children[child.flow.ref].selection.includedItemRefs=child.rows.map(r=>r.itemRef);
 const restored=applyProgramLegacyMapPlan(hidden.data,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:hidden.data.spaces[actorId]});assert.ok(restored.ok,JSON.stringify(restored));
 assert.deepEqual(restored.data.spaces[actorId].text,before.text);assert.deepEqual(restored.data.spaces[actorId].savedBindings,before.savedBindings);
});
test('group/flow anchors cannot contradict after canonical storage; personal values do not stale source',()=>{const f=fixture(),p=draftFor(f);const result=applyProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:f.data.spaces[actorId]});assert.ok(result.ok);const r=readProgramLegacyMapPlan(result.data,actorId,f.flowRef,now);assert.ok(r.ok);assert.equal(r.stale,false);assert.equal(r.token,p.read.token);const payload=JSON.parse(result.data.spaces[actorId].legacySnapshot!.raw);payload.planSelections.flows[p.read.childFlowRefs[0]].personalAnchor='2026-12-01';assert.equal(validateProgramLegacyPlanSelections(payload.planSelections),false);assert.equal(inspectProgramLegacySnapshotPayload(payload).ok,false);});
test('Map common anchor preserves same-value execution pin, explicit undated, memo and completion',()=>{
 const f=fixture(),source=JSON.parse(f.data.spaces[actorId].legacySnapshot!.raw),flow=source.model.flows[0],a=flow.items[0],b=flow.items[1];
 source.state.placements[a.ref]={itemRef:a.ref,scheduleMode:'fixed_date',date:a.sourceDate,timelinePolicy:'auto'};
 source.state.placements[b.ref]={itemRef:b.ref,scheduleMode:'unscheduled',timelinePolicy:'auto'};
 source.state.completions[a.ref]={status:'completed',completedAt:now};
 source.state.personalPlanOverlays={[flow.ref]:{flowRef:flow.ref,savedCopyId:flow.savedCopyId,flowId:flow.flowId,items:{[a.ref]:{itemRef:a.ref,memo:'보존할 개인 메모'}}}};
 const hydrated=hydrateProgramLegacy(createProgramData(),source.model,source.state,{actorId,preserveUnsupported:true});assert.ok(hydrated.ok);f.data=hydrated.data;
 const p=draftFor(f),preview=previewProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft});assert.ok(preview.ok,JSON.stringify(preview));const rows=preview.previews.flatMap(p=>p.rows);assert.equal(rows.find(r=>r.itemRef===a.ref)?.afterExecutionDate,a.sourceDate);assert.equal(rows.find(r=>r.itemRef===b.ref)?.afterExecutionDate,null);
 const applied=applyProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:f.data.spaces[actorId]});assert.ok(applied.ok);assert.deepEqual(JSON.parse(applied.data.spaces[actorId].legacySnapshot!.raw).state,source.state);
});
test('Map changed source demands explicit re-review without losing saved fixed child intent',()=>{
 const f=fixture(),p=draftFor(f),first=p.read.childFlowRefs[0];p.draft.children[first].mode={mode:'fixed-child',anchor:'2026-09-30'};const applied=applyProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:f.data.spaces[actorId]});assert.ok(applied.ok);
 const changed=programClone(applied.data),payload=JSON.parse(changed.spaces[actorId].legacySnapshot!.raw);payload.model.flows[0].items[0].title+=' 새 원문';changed.spaces[actorId].legacySnapshot!.raw=JSON.stringify(payload);
 const current=readProgramLegacyMapPlan(changed,actorId,f.flowRef,now);assert.ok(current.ok,JSON.stringify(current));assert.equal(current.stale,true);assert.equal(previewProgramLegacyMapPlan(changed,{actorId,flowRef:f.flowRef,now,draft:p.draft}).ok,false);
 const draft={...p.draft,reviewSourceToken:current.token,children:Object.fromEntries(current.children.map(c=>[c.flow.ref,{...p.draft.children[c.flow.ref],selection:{...p.draft.children[c.flow.ref].selection,reviewSourceToken:c.token}}]))};
 const preview=previewProgramLegacyMapPlan(changed,{actorId,flowRef:f.flowRef,now,draft});assert.ok(preview.ok,JSON.stringify(preview));assert.equal(preview.candidate.childModes[first].mode,'fixed-child');
});
test('removed Map child intent is preserved for review and never reapplied outside the current catalog',()=>{
 const f=fixture(),p=draftFor(f);assert.ok(p.read.childFlowRefs.length>1);const applied=applyProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:f.data.spaces[actorId]});assert.ok(applied.ok);
 const changed=programClone(applied.data),payload=JSON.parse(changed.spaces[actorId].legacySnapshot!.raw),removed=p.read.childFlowRefs[0];payload.model.flows=payload.model.flows.filter((f:any)=>f.ref!==removed);payload.model.flows.forEach((f:any,i:number)=>{f.presentation.mapGroup.childCount=payload.model.flows.length;f.presentation.mapGroup.childOrder=i;});
 assert.ok(inspectProgramLegacySnapshotPayload(payload).ok,'removed source preserves old owner evidence');
 changed.spaces[actorId].legacySnapshot!.raw=JSON.stringify(payload);const read=readProgramLegacyMapPlan(changed,actorId,payload.model.flows[0].ref,now);assert.ok(read.ok,JSON.stringify(read));assert.equal(read.stale,true);
 const draft:ProgramLegacyMapPlanDraft={personalAnchor:p.draft.personalAnchor,reviewSourceToken:read.token,children:Object.fromEntries(read.children.map(c=>[c.flow.ref,{mode:{mode:'follow-group'},selection:{includedItemRefs:c.rows.map(r=>r.itemRef),reviewSourceToken:c.token}}]))};
 const preview=previewProgramLegacyMapPlan(changed,{actorId,flowRef:payload.model.flows[0].ref,now,draft});assert.ok(preview.ok,JSON.stringify(preview));assert.ok(preview.candidate.retainedChildren?.[removed]);assert.ok(!preview.candidate.childFlowRefs.includes(removed));
 const result=applyProgramLegacyMapPlan(changed,{actorId,flowRef:payload.model.flows[0].ref,now,draft,expectedSpace:changed.spaces[actorId]});assert.ok(result.ok,JSON.stringify(result));assert.ok(validateProgramData(result.data));const oldBinding=changed.spaces[actorId].savedBindings.find(b=>b.flowRef===removed)!;assert.deepEqual(M.getDocument(result.data.spaces[actorId].text,oldBinding.documentId),M.getDocument(changed.spaces[actorId].text,oldBinding.documentId));
});
test('two actual Map children distinguish common affected child and equal-day fixed child',()=>{const f=fixture(),p=draftFor(f);assert.equal(p.read.children.length,2);p.draft.children[p.read.childFlowRefs[0]].mode={mode:'fixed-child',anchor:'2026-09-30'};const preview=previewProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft});assert.ok(preview.ok);assert.equal(preview.previews[0].counts.planDateChanges,0);assert.ok(preview.previews[1].counts.planDateChanges>0);});

test('genuine one-item Map child exclusion does not silently settle the whole-child removal policy',()=>{
 const f=fixture('curated-allblanc-workout-park'),p=draftFor(f);delete p.draft.personalAnchor;
 const child=p.read.children.find(child=>child.flow.title==='Allblanc 노점프 유산소')!;
 assert.equal(child.rows.length,1);p.draft.children[child.flow.ref].selection.includedItemRefs=[];
 const before=programClone(f.data),preview=previewProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft});
 assert.equal(preview.ok,false);if(!preview.ok)assert.equal(preview.reason,'empty-plan-policy-not-decided');
 const applied=applyProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:f.data.spaces[actorId]});
 assert.equal(applied.ok,false);assert.deepEqual(applied.data,before);assert.deepEqual(f.data,before);
});

test('genuine OPIc source Undo and global Undo preserve newer excluded membership and completed pinned sibling',async()=>{
 const f=fixture();let payload:ProgramLegacySnapshotPayload=JSON.parse(f.data.spaces[actorId].legacySnapshot!.raw);
 const monthly=payload.model.flows.find(flow=>flow.title==='오픽 모의고사 1달 반복 계획')!;
 const twoWeek=payload.model.flows.find(flow=>flow.title==='오픽 모의고사 2주 계획표')!;
 const completed=monthly.items[0],excluded=twoWeek.items[1];assert.equal(monthly.items.length,5);assert.equal(twoWeek.items.length,14);
 // Explicit private QA records on unchanged genuine source data.
 payload.state.placements[completed.ref]={itemRef:completed.ref,scheduleMode:'fixed_date',date:completed.sourceDate!,timelinePolicy:'auto'};
 payload.state.placements[monthly.items[1].ref]={itemRef:monthly.items[1].ref,scheduleMode:'unscheduled',timelinePolicy:'auto'};
 payload.state.completions[completed.ref]={status:'completed',completedAt:now};
 payload.state.personalPlanOverlays={[monthly.ref]:{flowRef:monthly.ref,savedCopyId:monthly.savedCopyId,flowId:monthly.flowId,items:{[completed.ref]:{itemRef:completed.ref,memo:'기존 개인 메모 보존'}}}};
 const step=(action:ProgramLegacySourceAction)=>{const result=transitionProgramLegacySourcePayload(payload,action);assert.ok(result.ok,result.ok?'':result.reason);payload=result.payload;};
 step({type:'connect-map',flowRef:twoWeek.ref,requestId:'opic-connect',expectedSourceToken:sourceCanonical(twoWeek),now});
 step({type:'stage-map',flowRef:twoWeek.ref,requestId:'opic-stage',now});
 const sourceOwner=payload.sourceLifecycle!.owners[twoWeek.ref],review=sourceOwner.reviews.at(-1)!;
 for(const change of programLegacySourceChanges(sourceOwner,review.incomingRevisionId))step({type:'choice',flowRef:twoWeek.ref,reviewId:review.id,changeId:change.id,choice:change.itemRef===twoWeek.items[0].ref?'incoming':'mine',now});
 step({type:'apply',flowRef:twoWeek.ref,reviewId:review.id,now});
 const hydrated=hydrateProgramLegacy(createProgramData(),payload.model,payload.state,{actorId,preserveUnsupported:true,sourceLifecycle:payload.sourceLifecycle});assert.ok(hydrated.ok);f.data=hydrated.data;
 f.data.spaces[actorId].text=M.addDocument(f.data.spaces[actorId].text,{title:'Map 밖의 개인 문서'});
 const p=draftFor(f);p.draft.children[twoWeek.ref].mode={mode:'fixed-child',anchor:'2026-09-30'};
 p.draft.children[twoWeek.ref].selection.includedItemRefs=twoWeek.items.filter(item=>item.ref!==excluded.ref).map(item=>item.ref);
 const member=applyProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flowRef,now,draft:p.draft,expectedSpace:f.data.spaces[actorId]});assert.ok(member.ok);
 const before=programClone(member.data),privateSpace=before.spaces[actorId],oldPayload:ProgramLegacySnapshotPayload=JSON.parse(privateSpace.legacySnapshot!.raw);
 const protectedValues=new Map(Object.entries(f.keys)),values=new Map(protectedValues),calls:string[]=[];
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{assert.equal(key,PROGRAM_STATE_KEY);calls.push(key);values.set(key,value);},removeItem:()=>assert.fail('no remove')};
 const controller=createProgramController({initialData:before,storage,exclusive:async work=>work()});assert.ok(controller.ok);
 const reverted=await controller.mutate('원본만 Undo',current=>{
   const view=prepareProgramLegacyView(current,{actorId,now,onlyFlowRef:twoWeek.ref,sourceReview:true});assert.ok(view.ok);
   return applyProgramLegacySourceAction(current,{actorId,expectedToken:view.token,action:{type:'undo',flowRef:twoWeek.ref,now}}).transition;
 },{actorId});assert.ok(reverted.ok);assert.equal(calls.length,1);
 const next=controller.snapshot().envelope.data,nextSpace=next.spaces[actorId],nextPayload:ProgramLegacySnapshotPayload=JSON.parse(nextSpace.legacySnapshot!.raw);
 const personal=(state:ProgramLegacySnapshotPayload['state'])=>{const{revision,updatedAt,undo,...rest}=state;return rest;};
 assert.ok(validateProgramData(next));assert.deepEqual(nextPayload.model,oldPayload.model);assert.deepEqual(nextPayload.planSelections,oldPayload.planSelections);
 assert.deepEqual(nextPayload.sourceLifecycle!.owners[twoWeek.ref].effective,oldPayload.sourceLifecycle!.owners[twoWeek.ref].undo!.selection);
 assert.deepEqual(personal(nextPayload.state),personal(oldPayload.state));assert.equal(nextPayload.state.revision,oldPayload.state.revision+1);
 assert.deepEqual(nextSpace.text.progressRecords,privateSpace.text.progressRecords);assert.deepEqual(nextSpace.text.bindings,privateSpace.text.bindings);
 const current=readProgramLegacyMapPlan(next,actorId,twoWeek.ref,now);assert.ok(current.ok);
 assert.equal(current.children.find(child=>child.flow.ref===twoWeek.ref)!.rows.find(row=>row.itemRef===excluded.ref)!.included,false);
 const reloaded=createProgramController({initialData:before,storage,exclusive:async work=>work()});assert.ok(reloaded.ok);assert.deepEqual(reloaded.snapshot().envelope.data,next);
 assert.ok((await reloaded.undo(actorId)).ok);assert.deepEqual(reloaded.snapshot().envelope.data,before);assert.equal(calls.length,2);
 for(const [key,value]of protectedValues)assert.equal(values.get(key),value);
});
