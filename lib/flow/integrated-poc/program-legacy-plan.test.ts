import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData, validateProgramData } from './program-data';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { hydrateProgramLegacy } from './legacy-projection';
import { applyProgramLegacyPlan, previewProgramLegacyPlan, readProgramLegacyPlan } from './program-legacy-plan';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramController } from './controller';
import { PROGRAM_STATE_KEY, programClone } from './contract';
import { programExecutionTasks } from './execution';
import { programLegacyPlanTaskExcluded, programPreservesLegacyPlanExcluded } from './program-legacy-plan-target';
import { readProgramExecutionOccurrences, readProgramOccurrencePeriod, updateProgramOccurrenceExecution } from './recurrence-state';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import type { FlowBundle } from '../types';
import { applyProgramLegacySourceAction, prepareProgramLegacyView } from './legacy-transaction';
import { readProgramLegacySourceLifecycle, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { programLegacySourceChanges } from './legacy-source-lifecycle-contract';
const now = '2026-09-12T00:00:00.000Z', actorId = 'local-user';
test('fixed source recurrence cannot block a mixed relative anchor; canonical apply/Undo keeps exact series exceptions', async()=>{
 const f=fixture('# 혼합\n- 기준일: 2026-09-18\n## 준비\n- [ ] 상대\n  - 상대 날짜: D-1\n- [ ] 고정 반복\n  - 날짜: 2026-09-03\n  - 반복: 매일\n  - 반복 종료: 3회\n- [ ] 미정');
 const input={actorId,flowRef:f.flow.ref,localToday:'2026-09-12',window:{finiteOffset:0,finiteLimit:10}};
 let data=f.data;const initial=readProgramExecutionOccurrences(data,input);assert.ok(initial.ok);
 for(const [index,changes]of [{schedule:{mode:'fixed_date' as const,date:'2026-10-22'},completion:{status:'completed' as const,completedAt:now}},{schedule:{mode:'unscheduled' as const,date:null},participation:'held' as const},{participation:'excluded' as const}].entries()){
  const row=initial.rows[index];const result=updateProgramOccurrenceExecution(data,{...input,identity:row.identity,expected:row.stored,changes});assert.ok(result.ok);data=result.data;
 }
 const before=programClone(data.spaces[actorId]),readBefore=readProgramExecutionOccurrences(data,input);assert.ok(readBefore.ok);
 const draft={personalAnchor:'2026-09-20',includedItemRefs:f.flow.items.map(i=>i.ref)};
 const p=previewProgramLegacyPlan(data,{actorId,flowRef:f.flow.ref,now,draft});assert.ok(p.ok,JSON.stringify(p));assert.equal(p.counts.planDateChanges,1);assert.equal(p.counts.executionDateChanges,1);
 assert.deepEqual(p.rows.map(r=>r.afterDate),['2026-09-19','2026-09-03',null]);assert.equal(Object.hasOwn(p.candidate.planDates,f.flow.items[1].ref),false);
 const values=new Map<string,string>();let writes=0,quota=true;const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(quota)throw Error('quota');writes++;values.set(k,v);},removeItem:()=>{throw Error('remove');}};
 const c=createProgramController({initialData:data,storage,exclusive:async work=>work()});assert.ok(c.ok);
 const apply=()=>c.mutate('혼합 기준일',current=>applyProgramLegacyPlan(current,{actorId,flowRef:f.flow.ref,now,draft,expectedSpace:before}),{actorId});
 assert.equal((await apply()).ok,false);assert.equal(writes,0);quota=false;assert.ok((await apply()).ok);assert.equal(writes,1);
 const reload=createProgramController({initialData:data,storage,exclusive:async work=>work()});assert.ok(reload.ok);const next=reload.snapshot().envelope.data;
 assert.deepEqual(next.spaces[actorId].recurrenceExecution,before.recurrenceExecution);
 const a=JSON.parse(before.legacySnapshot!.raw),b=JSON.parse(next.spaces[actorId].legacySnapshot!.raw);assert.deepEqual(a.model,b.model);assert.deepEqual(a.state,b.state);
 const after=readProgramExecutionOccurrences(next,input);assert.ok(after.ok);assert.deepEqual(after.rows,readBefore.rows);
 assert.ok((await reload.undo(actorId)).ok);assert.deepEqual(reload.snapshot().envelope.data.spaces[actorId],before);
});

test('relative and missing-date recurrence remain explicit unsupported anchor owners',()=>{
 for(const date of ['  - 상대 날짜: D-1\n']){
  const f=fixture(`# 혼합\n- 기준일: 2026-09-18\n- [ ] 상대\n  - 상대 날짜: D-1\n- [ ] 반복\n${date}  - 반복: 매일\n  - 반복 종료: 3회`);
  const p=previewProgramLegacyPlan(f.data,{actorId,flowRef:f.flow.ref,now,draft:{personalAnchor:'2026-09-20',includedItemRefs:f.flow.items.map(i=>i.ref)}});assert.equal(p.ok,false);
 }
 const invalid=materializePersonalWorkspacePocAuthoring({handoffId:'invalid-series',documentId:'invalid-doc',revisionId:'invalid-rev',rawText:'# 날짜 없음\n- [ ] 반복\n  - 반복: 매일',committedAt:now});assert.equal(invalid.ok,false);
});
function fixture(rawText = '# 원문\n- 기준일: 2026-09-18\n## 준비\n- [ ] 상대\n  - 상대 날짜: D-1\n- [ ] 고정\n  - 날짜: 2026-09-03\n- [ ] 미정\n') {
  const source = materializePersonalWorkspacePocAuthoring({ handoffId:'k4-product',documentId:'k4-doc',revisionId:'k4-rev',rawText,committedAt:now });
  assert.ok(source.ok);
  const state = createPersonalWorkspacePocState(now);
  const result = hydrateProgramLegacy(createProgramData(), { version:1, flows:[source.flow] }, state, { actorId, preserveUnsupported:true });
  assert.ok(result.ok);
  return { data:result.data, flow:source.flow };
}
test('K4 Program actual authored source: private anchor transaction preserves source and fixed/undated dates', () => {
  const { data, flow } = fixture(), before = JSON.stringify(data);
  const draft = { personalAnchor:'2026-09-20',includedItemRefs:flow.items.map(item=>item.ref) };
  const preview = previewProgramLegacyPlan(data,{actorId,flowRef:flow.ref,now,draft});
  assert.ok(preview.ok, JSON.stringify(preview));
  assert.deepEqual(preview.rows.map(row=>row.afterDate),['2026-09-19','2026-09-03',null]);
  assert.equal(JSON.stringify(data),before);
  const result = applyProgramLegacyPlan(data,{actorId,flowRef:flow.ref,now,draft,expectedSpace:preview.expectedSpace});
  assert.ok(result.ok,JSON.stringify(result)); assert.ok(validateProgramData(result.data));
  const snapshot = JSON.parse(result.data.spaces[actorId].legacySnapshot!.raw);
  assert.deepEqual(snapshot.model,JSON.parse(data.spaces[actorId].legacySnapshot!.raw).model);
  const tasks = M.tasks(result.data.spaces[actorId].text);
  assert.equal(tasks.find(task=>task.title==='상대')?.date,'2026-09-19');
  assert.ok(readProgramLegacyPlan(result.data,actorId,flow.ref,now).ok);
});
test('K4 series membership preserves individual occurrence identity, date, completion and participation while hiding execution/export selection',()=>{
  const f=fixture('# 혼합\n- [ ] 일반\n- [ ] 반복\n  - 날짜: 2026-09-03\n  - 반복: 매일\n  - 반복 종료: 3회');
  const flowRef=f.flow.ref, window={finiteOffset:0,finiteLimit:10};
  const read=readProgramExecutionOccurrences(f.data,{actorId,flowRef,localToday:'2026-09-12',window});assert.ok(read.ok);const row=read.rows[1];
  const edited=updateProgramOccurrenceExecution(f.data,{actorId,flowRef,localToday:'2026-09-12',window,identity:row.identity,expected:row.stored,changes:{schedule:{mode:'fixed_date',date:'2026-09-25'},completion:{status:'completed',completedAt:now}}});assert.ok(edited.ok);
  const before=readProgramExecutionOccurrences(edited.data,{actorId,flowRef,localToday:'2026-09-12',window});assert.ok(before.ok);
  const draft={includedItemRefs:[f.flow.items[0].ref]};
  const hidden=applyProgramLegacyPlan(edited.data,{actorId,flowRef,now,draft,expectedSpace:edited.data.spaces[actorId]});assert.ok(hidden.ok);
  assert.deepEqual(hidden.data.spaces[actorId].recurrenceExecution,edited.data.spaces[actorId].recurrenceExecution);
  const after=readProgramExecutionOccurrences(hidden.data,{actorId,flowRef,localToday:'2026-09-12',window});assert.ok(after.ok);assert.ok(after.rows.every(row=>row.planExcluded));
  assert.deepEqual(after.rows.map(row=>row.identity),before.rows.map(row=>row.identity));
  const period=readProgramOccurrencePeriod(hidden.data,{actorId,flowRef,localToday:'2026-09-12',from:'2026-09-01',to:'2026-09-30',includeExcluded:true,includeHeld:true});assert.ok(period.ok);assert.equal(period.rows.length,0);
  assert.equal(updateProgramOccurrenceExecution(hidden.data,{actorId,flowRef,localToday:'2026-09-12',window,identity:after.rows[0].identity,expected:after.rows[0].stored,changes:{participation:'excluded'}}).ok,false);
  const restored=applyProgramLegacyPlan(hidden.data,{actorId,flowRef,now,draft:{includedItemRefs:f.flow.items.map(i=>i.ref)},expectedSpace:hidden.data.spaces[actorId]});assert.ok(restored.ok);
  const again=readProgramExecutionOccurrences(restored.data,{actorId,flowRef,localToday:'2026-09-12',window});assert.ok(again.ok);
  assert.deepEqual(again.rows,before.rows);
});
test('K4 membership is not deletion: same IDs, raw, progress, exclusion guard, restore, canonical controller Undo/reload', async () => {
  const {data,flow}=fixture(), space=data.spaces[actorId], first=space.savedBindings[0].itemLines[flow.items[0].ref];
  space.text=M.recordProgress(space.text,first,'2026-09-11',20);
  const beforeText=programClone(space.text), values=new Map<string,string>([['flow:operating','UNCHANGED']]);let writes=0, quota=false;
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{if(quota)throw new Error('quota');writes++;values.set(key,value);},removeItem:()=>{throw new Error('unexpected-remove');}};
  const controller=createProgramController({initialData:data,storage,exclusive:async work=>work()});assert.ok(controller.ok);
  const draft={includedItemRefs:flow.items.slice(1).map(item=>item.ref)};
  const commit=()=>controller.mutate('포함 선택',current=>applyProgramLegacyPlan(current,{actorId,flowRef:flow.ref,now,draft,expectedSpace:controller.snapshot().envelope.data.spaces[actorId]}),{actorId});
  quota=true;assert.equal((await commit()).ok,false);assert.equal(writes,0);quota=false;
  assert.ok((await commit()).ok);assert.equal(writes,1);
  const current=controller.snapshot().envelope.data, selected=current.spaces[actorId];
  assert.deepEqual(selected.text,beforeText);assert.ok(programLegacyPlanTaskExcluded(selected,first));
  assert.ok(!programExecutionTasks(selected).some(task=>task.id===first));
  assert.equal(programPreservesLegacyPlanExcluded(selected,M.recordProgress(selected.text,first,'2026-09-12',40)),false);
  const boundDoc=M.getDocument(selected.text,selected.savedBindings[0].documentId)!;
  const childAdded=M.editText(selected.text,boundDoc.id,M.raw(boundDoc).replace('- [ ] 상대','- [ ] 상대\n  - [ ] 새 하위'));
  assert.notDeepEqual(childAdded,selected.text);assert.equal(programPreservesLegacyPlanExcluded(selected,childAdded),false);
  const reload=createProgramController({initialData:data,storage,exclusive:async work=>work()});assert.ok(reload.ok);
  assert.ok(programLegacyPlanTaskExcluded(reload.snapshot().envelope.data.spaces[actorId],first));
  assert.ok((await reload.undo(actorId)).ok);assert.deepEqual(reload.snapshot().envelope.data.spaces[actorId].text,beforeText);
  assert.ok(programExecutionTasks(reload.snapshot().envelope.data.spaces[actorId]).some(task=>task.id===first));
  assert.equal(values.get('flow:operating'),'UNCHANGED');assert.ok(values.has(PROGRAM_STATE_KEY));
});
test('K4 empty, unknown catalog, stale personal snapshot and actor mismatch cannot write',()=>{
  const {data,flow}=fixture(), expectedSpace=programClone(data.spaces[actorId]);
  assert.equal(previewProgramLegacyPlan(data,{actorId,flowRef:flow.ref,now,draft:{includedItemRefs:[]}}).ok,false);
  assert.equal(previewProgramLegacyPlan(data,{actorId,flowRef:flow.ref,now,draft:{includedItemRefs:['foreign']}}).ok,false);
  const current=programClone(data);current.spaces[actorId].text=M.addDocument(current.spaces[actorId].text,{title:'다른 문서'});
  assert.equal(applyProgramLegacyPlan(current,{actorId,flowRef:flow.ref,now,draft:{includedItemRefs:flow.items.map(i=>i.ref)},expectedSpace}).ok,false);
});
test('actual saved-record reader: nonMap origins, same-value execution pin and explicit undated stay separate from anchor',()=>{
  const bundle:FlowBundle={flow:{id:'flow:k4',slug:'k4-source',title:'준비',category:'검사',structure_type:'timeline',anchor_type:'start_date',status:'published',created_at:now,updated_at:now},sections:[],items:['a','b','c'].map((id,order)=>({id,flow_id:'flow:k4',title:id,type:'calendar',day_offset:-1,order}))};
  const raw=JSON.stringify({slug:'k4-source',savedAt:now,selectedArtifactMode:'calendar',dateIntent:'custom',anchor:'2026-09-18'});
  const sourceRead=buildPersonalWorkspacePocReadModel({length:1,key:index=> index===0?'flow:saved:k4-source':null,getItem:key=>key==='flow:saved:k4-source'?raw:null},[bundle]);assert.ok(sourceRead.ok,JSON.stringify(sourceRead));const flow=sourceRead.model.flows[0];
  const state=createPersonalWorkspacePocState(now);
  state.placements[flow.items[1].ref]={itemRef:flow.items[1].ref,scheduleMode:'fixed_date',date:'2026-09-17',timelinePolicy:'auto'};
  state.placements[flow.items[2].ref]={itemRef:flow.items[2].ref,scheduleMode:'unscheduled',timelinePolicy:'auto'};
  const initial=hydrateProgramLegacy(createProgramData(),sourceRead.model,state,{actorId});assert.ok(initial.ok);
  const draft={personalAnchor:'2026-09-22',includedItemRefs:flow.items.map(i=>i.ref)};
  const preview=previewProgramLegacyPlan(initial.data,{actorId,flowRef:flow.ref,now,draft});assert.ok(preview.ok);assert.equal(preview.counts.planDateChanges,3);assert.equal(preview.counts.executionDateChanges,1);
  assert.deepEqual(preview.rows.map(row=>row.afterExecutionDate),['2026-09-21','2026-09-17',null]);
  const result=applyProgramLegacyPlan(initial.data,{actorId,flowRef:flow.ref,now,draft,expectedSpace:initial.data.spaces[actorId]});assert.ok(result.ok);
  const tasks=M.tasks(result.data.spaces[actorId].text);assert.deepEqual(tasks.map(task=>task.date),['2026-09-21','2026-09-17',null]);
  assert.deepEqual(JSON.parse(result.data.spaces[actorId].legacySnapshot!.raw).state.placements,state.placements);
  assert.equal(raw,JSON.stringify({slug:'k4-source',savedAt:now,selectedArtifactMode:'calendar',dateIntent:'custom',anchor:'2026-09-18'}));
});
test('actual source lifecycle adds item: previous exclusion stays, new item needs explicit choice, current-source review can be applied',()=>{
  const raw='# 원문\n- [ ] 첫째\n- [ ] 둘째\n', f=fixture(raw), flowRef=f.flow.ref;
  const selected=applyProgramLegacyPlan(f.data,{actorId,flowRef,now,draft:{includedItemRefs:[f.flow.items[0].ref]},expectedSpace:f.data.spaces[actorId]});assert.ok(selected.ok);let data=selected.data;
  function commit(action:ProgramLegacySourceAction){const view=prepareProgramLegacyView(data,{actorId,now,onlyFlowRef:flowRef,sourceReview:true});assert.ok(view.ok);const result=applyProgramLegacySourceAction(data,{actorId,expectedToken:view.token,action});assert.ok(result.transition.ok,JSON.stringify(result));data=result.transition.data;}
  commit({type:'stage',flowRef,requestId:'k4-new-source',rawText:raw+'- [ ] 새 항목\n',now});
  const owner=readProgramLegacySourceLifecycle(JSON.parse(data.spaces[actorId].legacySnapshot!.raw),flowRef);assert.ok(owner.ok);
  for(const change of programLegacySourceChanges(owner.owner,'program-source:k4-new-source'))commit({type:'choice',flowRef,reviewId:'k4-new-source',changeId:change.id,choice:'incoming',now});
  commit({type:'apply',flowRef,reviewId:'k4-new-source',now});
  const read=readProgramLegacyPlan(data,actorId,flowRef,now);assert.ok(read.ok);assert.ok(read.stale);assert.equal(read.rows.find(row=>row.itemRef===f.flow.items[1].ref)?.included,false);
  const added=read.rows.find(row=>row.pending)!;assert.ok(added);assert.equal(added.included,false);
  const draft={includedItemRefs:[f.flow.items[0].ref],reviewSourceToken:read.token};
  assert.equal(previewProgramLegacyPlan(data,{actorId,flowRef,now,draft}).ok,false);
  const accepted=applyProgramLegacyPlan(data,{actorId,flowRef,now,draft:{...draft,newItemChoices:{[added.itemRef]:false}},expectedSpace:data.spaces[actorId]});assert.ok(accepted.ok);
  const after=readProgramLegacyPlan(accepted.data,actorId,flowRef,now);assert.ok(after.ok);assert.equal(after.stale,false);assert.equal(after.rows.find(row=>row.itemRef===added.itemRef)?.included,false);
  assert.deepEqual(accepted.data.spaces[actorId].text,data.spaces[actorId].text);
});
