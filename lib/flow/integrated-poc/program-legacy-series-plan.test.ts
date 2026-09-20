import test from 'node:test';
import assert from 'node:assert/strict';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { toPersonalWorkspacePocMapGroupRef } from '../personal-workspace-poc-contract';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData,validateProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { programClone,PROGRAM_STATE_KEY,type ProgramData } from './contract';
import { textWorkspaceModel as M } from './text-workspace';
import { readProgramExecutionOccurrences,readProgramOccurrencePeriod,updateProgramOccurrenceExecution } from './recurrence-state';
import { applyProgramLegacyPlan,previewProgramLegacyPlan,type ProgramLegacyPlanDraft } from './program-legacy-plan';
import { applyProgramLegacyMapPlan,previewProgramLegacyMapPlan,type ProgramLegacyMapPlanDraft } from './program-legacy-map-plan';
import { prepareProgramRecurrencePlan,readProgramPersonalRecurrences,updateProgramPersonalOccurrence } from './program-recurrence-plan-state';
import { type ProgramLegacySeriesChoice } from './program-legacy-series-plan';
import { createProgramController,programSame } from './controller';
import { prepareProgramLegacyView,applyProgramLegacySourceAction } from './legacy-transaction';
import { readProgramLegacySourceLifecycle,type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { programLegacySourceChanges } from './legacy-source-lifecycle-contract';
const actorId='local-user',today='2026-09-12',now='2026-09-12T12:00:00.000Z',later='2026-09-12T13:00:00.000Z';
const raw='# 혼합 상대 계획\n- 기준일: 2026-09-18\n- [ ] 일반 상대\n  - 상대 날짜: D-2\n- [ ] 일간 반복\n  - 상대 날짜: D-1\n  - 반복: 매일\n  - 반복 종료: 4회\n- [ ] 주간 반복\n  - 상대 날짜: D0\n  - 반복: 매주 금\n  - 반복 종료: 3회\n- [ ] 고정 반복\n  - 날짜: 2026-09-01\n  - 반복: 매일\n  - 반복 종료: 3회\n- [ ] 날짜 미정';
function fixture(map=false,mapCount=2){
 const flows=Array.from({length:map?mapCount:1},(_,n)=>{const built=materializePersonalWorkspacePocAuthoring({handoffId:`atomic-${n}`,documentId:`atomic-doc-${n}`,revisionId:`atomic-rev-${n}`,rawText:raw,committedAt:now});assert.ok(built.ok);return map?{...built.flow,presentation:{...built.flow.presentation,mapGroup:{groupRef:toPersonalWorkspacePocMapGroupRef('synthetic-map-owner'),ownerId:'synthetic-map-owner',title:'명시 합성 묶음',childOrder:n,childCount:mapCount,executionState:'executable' as const,reviewReasons:[]}}}:built.flow;});
 const projected=hydrateProgramLegacy(createProgramData(),{version:1,flows},createPersonalWorkspacePocState(now),{actorId,preserveUnsupported:true});assert.ok(projected.ok,JSON.stringify(projected));
 const data=projected.data;for(let i=0;i<19;i++)data.spaces[actorId].text=M.addDocument(data.spaces[actorId].text,{title:`보존 문서 ${i}`});assert.ok(validateProgramData(data));return{data,flows};
}
function choices(data:ProgramData,flowRef:string,prefix='atomic',targetDate='2026-09-25'){
 const read=readProgramExecutionOccurrences(data,{actorId,flowRef,localToday:today});assert.ok(read.ok);
 const result:Record<string,ProgramLegacySeriesChoice>={};
 for(const [n,title] of ['일간 반복','주간 반복'].entries()){
  const row=read.rows.find(row=>row.title===title&&row.personalPlan&&row.completion==='unrecorded'&&row.executionScheduleMode==='inherit'&&row.participation==='included')??read.rows.find(row=>row.title===title)!;
  const ownerId=row.personalPlan?.ownerId??`${prefix}-${n}`,p=prepareProgramRecurrencePlan(data,{actorId,flowRef,sourceIdentity:row.identity,ownerId,now,localToday:today});assert.ok(p.ok,p.ok?'':p.reason);
  result[row.sourceItemRef]={ownerId,expectedOwner:p.value.expectedOwner,sourceIdentity:row.identity,...(row.personalPlan?{personalIdentity:row.personalPlan.identity}:{}),originalDate:row.originalDate,scope:'whole_series',targetDate,at:now};
 }return result;
}
function draft(f:ReturnType<typeof fixture>,data=f.data):ProgramLegacyPlanDraft{return{personalAnchor:'2026-09-26',includedItemRefs:f.flows[0].items.map(row=>row.ref),seriesChoices:choices(data,f.flows[0].ref)};}
function apply(f:ReturnType<typeof fixture>,d=draft(f)){
 const r=applyProgramLegacyPlan(f.data,{actorId,flowRef:f.flows[0].ref,now,draft:d,expectedSpace:f.data.spaces[actorId]});assert.ok(r.ok,r.ok?'':r.reason);return r.data;
}
test('AS01 ordinary and two real relative series apply atomically without rewriting source or fixed recurrence',()=>{
 const f=fixture(),before=programClone(f.data),d=draft(f),p=previewProgramLegacyPlan(f.data,{actorId,flowRef:f.flows[0].ref,now,draft:d});assert.ok(p.ok,p.ok?'':p.reason);
 assert.deepEqual(p.seriesPreviews.map(p=>p.status),['changed','changed','fixed-preserved']);assert.equal(p.counts.planDateChanges,1);assert.deepEqual(f.data,before);
 const next=apply(f,d),space=next.spaces[actorId];assert.equal(Object.keys(space.recurrencePlans!.owners).length,2);assert.equal(M.tasks(space.text).find(t=>t.title==='일반 상대')?.date,'2026-09-24');
 const a=JSON.parse(before.spaces[actorId].legacySnapshot!.raw),b=JSON.parse(space.legacySnapshot!.raw);assert.deepEqual(a.model,b.model);assert.deepEqual(a.state,b.state);assert.equal(space.recurrenceExecution,undefined);assert.deepEqual(next.public,before.public);
 for(const row of f.flows[0].items.filter(row=>row.title.includes('반복')))assert.equal(Object.hasOwn(b.planSelections.flows[f.flows[0].ref].planDates,row.ref),false);
 const read=readProgramExecutionOccurrences(next,{actorId,flowRef:f.flows[0].ref,localToday:today});assert.ok(read.ok);assert.equal(read.rows.filter(row=>row.personalPlan).length,7);assert.ok(read.rows.filter(row=>row.title==='고정 반복').every(row=>!row.planSuperseded&&!row.personalPlan));
 const period=readProgramOccurrencePeriod(next,{actorId,flowRef:f.flows[0].ref,localToday:today,from:'2026-09-01',to:'2026-11-30'});assert.ok(period.ok);assert.equal(new Set(period.rows.map(r=>r.key)).size,period.rows.length);assert.equal(space.text.documents.length,before.spaces[actorId].text.documents.length);
});
test('AS02 missing/stale/foreign/duplicate choices and wrong actor or exact index reject the entire ordinary change',()=>{
 const f=fixture(),base=draft(f),refs=Object.keys(base.seriesChoices!),before=programClone(f.data);
 for(const edit of [
  (d:ProgramLegacyPlanDraft)=>{delete d.seriesChoices![refs[1]];},
  (d:ProgramLegacyPlanDraft)=>{d.seriesChoices![refs[1]].ownerId=d.seriesChoices![refs[0]].ownerId;},
  (d:ProgramLegacyPlanDraft)=>{d.seriesChoices![refs[1]].sourceIdentity.occurrenceIndex+=1;},
  (d:ProgramLegacyPlanDraft)=>{d.seriesChoices![refs[1]].sourceIdentity.sourceRevisionToken='foreign';},
  (d:ProgramLegacyPlanDraft)=>{d.seriesChoices!['foreign']=d.seriesChoices![refs[0]];},
  (d:ProgramLegacyPlanDraft)=>{d.seriesChoices![refs[1]].originalDate='2026-09-25';},
 ]){const d=programClone(base);edit(d);const r=applyProgramLegacyPlan(f.data,{actorId,flowRef:f.flows[0].ref,now,draft:d,expectedSpace:f.data.spaces[actorId]});assert.equal(r.ok,false);assert.equal(r.data,f.data);}
 assert.equal(applyProgramLegacyPlan(f.data,{actorId:'participant-jihun',flowRef:f.flows[0].ref,now,draft:base,expectedSpace:f.data.spaces[actorId]}).ok,false);assert.deepEqual(f.data,before);
});
test('AS03 equal actual target adds no owner; unchanged anchor selection adds no second operation',()=>{
 const f=fixture(),d=draft(f);for(const c of Object.values(d.seriesChoices!))c.targetDate=c.originalDate;
 const p=previewProgramLegacyPlan(f.data,{actorId,flowRef:f.flows[0].ref,now,draft:d});assert.ok(p.ok);assert.deepEqual(p.seriesPreviews.map(p=>p.status),['unchanged','unchanged','fixed-preserved']);
 const next=apply(f,d);assert.equal(next.spaces[actorId].recurrencePlans,undefined);
 const noop=applyProgramLegacyPlan(next,{actorId,flowRef:f.flows[0].ref,now,draft:{personalAnchor:d.personalAnchor,includedItemRefs:d.includedItemRefs},expectedSpace:next.spaces[actorId]});assert.ok(noop.ok);assert.equal(noop.changed,false);
});
test('AS04 explicit exclusion preserves source/history with no owner; simultaneous excluded reinclude and replan requires resolution',()=>{
 const f=fixture(),d=draft(f),refs=Object.keys(d.seriesChoices!);d.includedItemRefs=d.includedItemRefs.filter(ref=>!refs.includes(ref));d.seriesChoices={};
 const p=previewProgramLegacyPlan(f.data,{actorId,flowRef:f.flows[0].ref,now,draft:d});assert.ok(p.ok);assert.deepEqual(p.seriesPreviews.map(p=>p.status),['excluded-preserved','excluded-preserved','fixed-preserved']);const next=apply(f,d);assert.equal(next.spaces[actorId].recurrencePlans,undefined);
 const candidate={...draft(f),personalAnchor:'2026-10-01'},bad=previewProgramLegacyPlan(next,{actorId,flowRef:f.flows[0].ref,now,draft:candidate});assert.equal(bad.ok,false);if(!bad.ok)assert.equal(bad.reason,'excluded-series-reinclude-review-required');
 const stale=programClone(d);stale.seriesChoices=draft(f).seriesChoices;assert.equal(previewProgramLegacyPlan(f.data,{actorId,flowRef:f.flows[0].ref,now,draft:stale}).ok,false);
});
test('AS05 actual old fixed/completed/held history survives common anchor and following private execution remains separate',()=>{
 const f=fixture(),initial=readProgramExecutionOccurrences(f.data,{actorId,flowRef:f.flows[0].ref,localToday:today});assert.ok(initial.ok);const old=initial.rows.find(row=>row.title==='일간 반복')!;
 const write=updateProgramOccurrenceExecution(f.data,{actorId,flowRef:f.flows[0].ref,localToday:today,identity:old.identity,expected:null,changes:{schedule:{mode:'fixed_date',date:'2027-01-01'},completion:{status:'completed',completedAt:now},participation:'held'}});assert.ok(write.ok);f.data=write.data;
 const d=draft(f),ref=old.sourceItemRef,second=initial.rows.find(row=>row.sourceItemRef===ref&&row.occurrenceIndex===2)!;
 d.seriesChoices![ref]={...d.seriesChoices![ref],sourceIdentity:second.identity,originalDate:second.originalDate};const next=apply(f,d);
 assert.deepEqual(next.spaces[actorId].recurrenceExecution,f.data.spaces[actorId].recurrenceExecution);const ownerId=d.seriesChoices![ref].ownerId;
 const r=readProgramPersonalRecurrences(next,{actorId,ownerId,range:{start:'2026-01-01',end:'2027-12-31'},localToday:today});assert.ok(r.ok);assert.equal(r.value.sourceCoverage.mode,'cutover');assert.equal(r.value.retainedSourceExecutions[0].participation,'held');
 const row=r.value.rows[0],done=updateProgramPersonalOccurrence(next,{actorId,ownerId,expectedOwner:row.personalPlan.expectedOwner,identity:row.personalPlan.identity,changes:{completion:{status:'completed',completedAt:later}},at:later,localToday:today});assert.ok(done.ok);assert.deepEqual(done.data.spaces[actorId].recurrenceExecution,f.data.spaces[actorId].recurrenceExecution);
});
test('AS06 controller stores ordinary and two owners once; quota/stale/repeatedclick zero writes, reload and one Undo restore all',async()=>{
 const f=fixture(),d=draft(f),values=new Map([['flow:operating',' exact bytes ']]),writes:string[]=[];let quota=true;
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(quota)throw Error('quota');writes.push(k);values.set(k,v);},removeItem:()=>{throw Error('unexpected remove');}};
 let c=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert.ok(c.ok);
 const build=(data:ProgramData)=>applyProgramLegacyPlan(data,{actorId,flowRef:f.flows[0].ref,now,draft:d,expectedSpace:f.data.spaces[actorId]});
 assert.equal((await c.mutate('공통 기준일',build,{actorId})).ok,false);assert.equal(writes.length,0);quota=false;assert.ok((await c.mutate('공통 기준일',build,{actorId})).ok);assert.equal(writes.length,1);
 assert.equal((await c.mutate('반복 클릭',build,{actorId})).ok,false);assert.equal(writes.length,1);c=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert.ok(c.ok);
 assert.equal(Object.keys(c.snapshot().envelope.data.spaces[actorId].recurrencePlans!.owners).length,2);assert.ok((await c.undo(actorId)).ok);assert.ok(programSame(c.snapshot().envelope.data.spaces,f.data.spaces));assert.equal(values.get('flow:operating'),' exact bytes ');assert.ok(writes.every(k=>k===PROGRAM_STATE_KEY));
});
test('AS07 explicitly synthetic grouping of genuine authored children: group/fixed child share one atomic owner merge',()=>{
 const f=fixture(true),children:ProgramLegacyMapPlanDraft['children']={};for(const [index,flow]of f.flows.entries())children[flow.ref]={mode:index===0?{mode:'follow-group'}:{mode:'fixed-child',anchor:'2026-09-18'},selection:{includedItemRefs:flow.items.map(r=>r.ref),...(index===0?{seriesChoices:choices(f.data,flow.ref)}:{})}};
 const d:ProgramLegacyMapPlanDraft={personalAnchor:'2026-09-26',children},p=previewProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flows[0].ref,now,draft:d});assert.ok(p.ok,p.ok?'':p.reason);
 const next=applyProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flows[0].ref,now,draft:d,expectedSpace:f.data.spaces[actorId]});assert.ok(next.ok,next.ok?'':next.reason);assert.equal(Object.keys(next.data.spaces[actorId].recurrencePlans!.owners).length,2);
 const other=readProgramExecutionOccurrences(next.data,{actorId,flowRef:f.flows[1].ref,localToday:today});assert.ok(other.ok);assert.ok(other.rows.every(row=>!row.personalPlan&&!row.planSuperseded));
});
test('AS08 duplicate owner is rejected during both single and cross-child previews, before any save',()=>{
 const f=fixture(),d=draft(f),refs=Object.keys(d.seriesChoices!);d.seriesChoices![refs[1]].ownerId=d.seriesChoices![refs[0]].ownerId;
 const single=previewProgramLegacyPlan(f.data,{actorId,flowRef:f.flows[0].ref,now,draft:d});assert.equal(single.ok,false);if(!single.ok)assert.equal(single.reason,'duplicate-series-owner');
 const map=fixture(true),children:ProgramLegacyMapPlanDraft['children']={};for(const flow of map.flows)children[flow.ref]={mode:{mode:'follow-group'},selection:{includedItemRefs:flow.items.map(r=>r.ref),seriesChoices:choices(map.data,flow.ref)}};
 const before=programClone(map.data),p=previewProgramLegacyMapPlan(map.data,{actorId,flowRef:map.flows[0].ref,now,draft:{personalAnchor:'2026-09-26',children}});
 assert.equal(p.ok,false);if(!p.ok)assert.equal(p.reason,'duplicate-series-owner');assert.deepEqual(map.data,before);
});
test('AS09 three genuine authored children in explicit test grouping: two follow and one fixed, four owners persist in one write and Undo',async()=>{
 const f=fixture(true,3),children:ProgramLegacyMapPlanDraft['children']={};for(const [index,flow]of f.flows.entries())children[flow.ref]={mode:index<2?{mode:'follow-group'}:{mode:'fixed-child',anchor:'2026-09-18'},selection:{includedItemRefs:flow.items.map(r=>r.ref),...(index<2?{seriesChoices:choices(f.data,flow.ref,`child-${index}`)}:{})}};
 const d:ProgramLegacyMapPlanDraft={personalAnchor:'2026-09-26',children},preview=previewProgramLegacyMapPlan(f.data,{actorId,flowRef:f.flows[0].ref,now,draft:d});assert.ok(preview.ok,preview.ok?'':preview.reason);
 assert.equal(preview.previews.flatMap(p=>p.seriesPreviews).filter(p=>p.status==='changed').length,4);
 const values=new Map<string,string>(),writes:string[]=[],storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{writes.push(k);values.set(k,v);},removeItem:()=>{throw Error('unexpected remove');}};
 let c=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert.ok(c.ok);
 assert.ok((await c.mutate('여러 자식 공통 기준일',data=>applyProgramLegacyMapPlan(data,{actorId,flowRef:f.flows[0].ref,now,draft:d,expectedSpace:f.data.spaces[actorId]}),{actorId})).ok);assert.deepEqual(writes,[PROGRAM_STATE_KEY]);
 c=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert.ok(c.ok);const next=c.snapshot().envelope.data;assert.equal(Object.keys(next.spaces[actorId].recurrencePlans!.owners).length,4);
 for(const [i,flow]of f.flows.entries()){const read=readProgramOccurrencePeriod(next,{actorId,flowRef:flow.ref,localToday:today,from:'2026-09-01',to:'2026-11-30'});assert.ok(read.ok);assert.equal(read.rows.filter(r=>r.personalPlan).length,i<2?7:0);assert.equal(new Set(read.rows.map(r=>r.key)).size,read.rows.length);}
 assert.deepEqual(JSON.parse(next.spaces[actorId].legacySnapshot!.raw).model,JSON.parse(f.data.spaces[actorId].legacySnapshot!.raw).model);assert.ok((await c.undo(actorId)).ok);assert.ok(programSame(c.snapshot().envelope.data.spaces,f.data.spaces));
});
test('AS10 records between common-anchor revisions enter actual history and survive new whole/future, source/fixed dates and one Undo',async()=>{
 const f=fixture();let data=apply(f),read=readProgramExecutionOccurrences(data,{actorId,flowRef:f.flows[0].ref,localToday:today});assert.ok(read.ok);const first=read.rows.find(r=>r.personalPlan&&r.title==='일간 반복')!;
 const written=updateProgramPersonalOccurrence(data,{actorId,ownerId:first.personalPlan!.ownerId,expectedOwner:first.personalPlan!.expectedOwner,identity:first.personalPlan!.identity,changes:{completion:{status:'completed',completedAt:later},schedule:{mode:'fixed_date',date:'2027-01-01'},participation:'held'},at:later,localToday:today});assert.ok(written.ok);data=written.data;
 const nextChoices=choices(data,f.flows[0].ref,'ignored','2026-10-02');for(const c of Object.values(nextChoices))c.at='2026-09-12T14:00:00.000Z';Object.values(nextChoices)[1].scope='future_series';
 const d:ProgramLegacyPlanDraft={personalAnchor:'2026-10-03',includedItemRefs:f.flows[0].items.map(i=>i.ref),seriesChoices:nextChoices},p=previewProgramLegacyPlan(data,{actorId,flowRef:f.flows[0].ref,now,draft:d});assert.ok(p.ok,p.ok?'':p.reason);
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:()=>{throw Error('remove');}},c=createProgramController({initialData:data,storage,exclusive:async work=>work()});assert.ok(c.ok);
 assert.ok((await c.mutate('기록 후 새 기준일',current=>applyProgramLegacyPlan(current,{actorId,flowRef:f.flows[0].ref,now,draft:d,expectedSpace:data.spaces[actorId]}),{actorId})).ok);
 const next=c.snapshot().envelope.data;assert.ok(Object.values(next.spaces[actorId].recurrencePlans!.owners).every(o=>o.operations.length===2));assert.deepEqual(next.spaces[actorId].recurrencePlans!.owners[first.personalPlan!.ownerId].executionEvents,data.spaces[actorId].recurrencePlans!.owners[first.personalPlan!.ownerId].executionEvents);
 const distant=readProgramOccurrencePeriod(next,{actorId,flowRef:f.flows[0].ref,localToday:today,from:'2027-01-01',to:'2027-01-01',includeHeld:true});assert.ok(distant.ok);assert.equal(distant.rows.find(r=>r.key===first.key)?.completion,'completed');
 assert.deepEqual(JSON.parse(next.spaces[actorId].legacySnapshot!.raw).model,JSON.parse(data.spaces[actorId].legacySnapshot!.raw).model);assert.deepEqual(next.spaces[actorId].recurrenceExecution,data.spaces[actorId].recurrenceExecution);assert.ok((await c.undo(actorId)).ok);assert.ok(programSame(c.snapshot().envelope.data.spaces,data.spaces));
});
test('AS11 one stale personal owner blocks every anchor/other series write even with current outer CAS',()=>{
 const f=fixture(),initial=apply(f),d=draft(f,initial);for(const choice of Object.values(d.seriesChoices!)){choice.targetDate='2026-10-01';choice.at=later;}
 const read=readProgramExecutionOccurrences(initial,{actorId,flowRef:f.flows[0].ref,localToday:today});assert.ok(read.ok);const row=read.rows.find(r=>r.personalPlan)!;
 const change=updateProgramPersonalOccurrence(initial,{actorId,ownerId:row.personalPlan!.ownerId,expectedOwner:row.personalPlan!.expectedOwner,identity:row.personalPlan!.identity,changes:{completion:{status:'completed',completedAt:later}},at:later,localToday:today});assert.ok(change.ok);const before=programClone(change.data);
 const p=previewProgramLegacyPlan(change.data,{actorId,flowRef:f.flows[0].ref,now,draft:d});assert.equal(p.ok,false);if(!p.ok)assert.equal(p.reason,'series-owner-conflict');
 const result=applyProgramLegacyPlan(change.data,{actorId,flowRef:f.flows[0].ref,now,draft:d,expectedSpace:change.data.spaces[actorId]});assert.equal(result.ok,false);assert.equal(result.data,change.data);assert.deepEqual(change.data,before);
});
test('AS12 real source stage/choice/apply invalidates one stale series choice; normal source path and all other data remain readable',()=>{
 const f=fixture(),d=draft(f),flowRef=f.flows[0].ref;let data=f.data;
 function commit(action:ProgramLegacySourceAction){const view=prepareProgramLegacyView(data,{actorId,now,onlyFlowRef:flowRef,sourceReview:true});assert.ok(view.ok,view.ok?'':view.reason);const result=applyProgramLegacySourceAction(data,{actorId,expectedToken:view.token,action});assert.ok(result.transition.ok,JSON.stringify(result));data=result.transition.data;}
 commit({type:'stage',flowRef,requestId:'anchor-source-change',rawText:raw.replace('- [ ] 일간 반복','- [ ] 일간 반복 수정'),now});
 const owner=readProgramLegacySourceLifecycle(JSON.parse(data.spaces[actorId].legacySnapshot!.raw),flowRef);assert.ok(owner.ok);for(const change of programLegacySourceChanges(owner.owner,'program-source:anchor-source-change'))commit({type:'choice',flowRef,reviewId:'anchor-source-change',changeId:change.id,choice:'incoming',now});commit({type:'apply',flowRef,reviewId:'anchor-source-change',now});
 const latest=readProgramExecutionOccurrences(data,{actorId,flowRef,localToday:today});assert.ok(latest.ok);assert.ok(latest.rows.some(r=>r.title==='일간 반복 수정'));const before=programClone(data);
 const result=applyProgramLegacyPlan(data,{actorId,flowRef,now,draft:d,expectedSpace:data.spaces[actorId]});assert.equal(result.ok,false);assert.equal(result.data,data);assert.deepEqual(data,before);assert.equal(data.spaces[actorId].recurrencePlans,undefined);
});
