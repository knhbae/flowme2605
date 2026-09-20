import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData, validateProgramData } from './program-data';
import { programClone,PROGRAM_STATE_KEY } from './contract';
import { hydrateProgramLegacy } from './legacy-projection';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramController,programSame } from './controller';
import { readProgramExecutionOccurrences,readProgramOccurrencePeriod,updateProgramOccurrenceExecution } from './recurrence-state';
import { prepareProgramRecurrencePlan,applyProgramRecurrencePlanTransition,readProgramPersonalRecurrences,updateProgramPersonalOccurrence,undoProgramRecurrencePlanTransition,readProgramRecurrencePlanRecoveries } from './program-recurrence-plan-state';
import { readProgramRecurrencePlan,previewProgramRecurrencePlan,resolveProgramRecurrencePlanTarget } from './program-recurrence-plan';
import { programPersonalOccurrenceKey,type ProgramRecurrencePlanOwner,type ProgramPersonalOccurrenceIdentity } from './program-recurrence-plan-contract';
import { programOrderedExecutionRows,reorderProgramExecutionTimeline } from './recurrence-order';
import { isProgramExecutionTargetKey } from './recurrence-order-contract';
import { inspectProgramPrivateOutput,makeProgramPrivateOutput } from './private-output';
const now='2026-09-12T00:00:00.000Z',at1='2026-09-12T01:00:00.000Z',at2='2026-09-12T02:00:00.000Z',today='2026-09-12';
function fixture(operatingException=false,count=12){
 const source=materializePersonalWorkspacePocAuthoring({handoffId:'rp-state',documentId:'rp-doc',revisionId:'rp-source-v1',committedAt:now,
  rawText:`# 실제 반복 원문\n- [ ] 원문 반복\n  - 날짜: 2026-09-01\n  - 반복: 매일\n  - 반복 종료: ${count}회\n  - 시간: 09:00`});assert.ok(source.ok);
 const state=createPersonalWorkspacePocState(now),actorId='local-user';
 let hydrated=hydrateProgramLegacy(createProgramData(),{version:1,flows:[source.flow]},state,{actorId,preserveUnsupported:true});assert.ok(hydrated.ok);
 let data=hydrated.data;const input={actorId,flowRef:source.flow.ref,localToday:today};
 const initial=readProgramExecutionOccurrences(data,input);assert.ok(initial.ok);
 if(operatingException){const original=initial.rows[0],payload=JSON.parse(data.spaces[actorId].legacySnapshot!.raw);
  payload.state.occurrencePlacements={[original.occurrenceId]:{occurrenceId:original.occurrenceId,sourceItemRef:original.sourceItemRef,originalDate:original.originalDate,scheduleMode:'fixed_date',date:'2026-12-25'}};
  payload.state.occurrenceCompletions={[original.occurrenceId]:{occurrenceId:original.occurrenceId,sourceItemRef:original.sourceItemRef,originalDate:original.originalDate,status:'completed',completedAt:now}};
  data.spaces[actorId].legacySnapshot!.raw=JSON.stringify(payload);
 }
 for(let i=0;i<19;i++)data.spaces[actorId].text=M.addDocument(data.spaces[actorId].text,{title:`관련 없는 문서 ${i}`});
 assert.ok(validateProgramData(data));return{data,input,source};
}
function seed(f:ReturnType<typeof fixture>){const read=readProgramExecutionOccurrences(f.data,f.input);assert.ok(read.ok);
 const selected=read.rows[1],prepared=prepareProgramRecurrencePlan(f.data,{...f.input,sourceIdentity:selected.identity,ownerId:'personal-plan',now});assert.ok(prepared.ok,prepared.ok?'':prepared.reason);
 const r=readProgramRecurrencePlan(prepared.value.owner,{start:selected.originalDate,end:selected.originalDate});assert.ok(r.ok);
 const p=previewProgramRecurrencePlan(prepared.value.owner,{actorId:f.input.actorId,expected:prepared.value.owner,currentSource:prepared.value.owner.source,
  operation:{scope:'whole_series',targetDate:'2026-09-10',target:r.value.targets[0],sourceCutover:selected.identity,at:at1}});assert.ok(p.ok,p.ok?'':p.reason);
 return{prepared:prepared.value,preview:p.value};}
function apply(f:ReturnType<typeof fixture>){const s=seed(f),a=applyProgramRecurrencePlanTransition(f.data,{...f.input,...s.prepared,preview:s.preview});assert.ok(a.ok,a.ok?'':a.reason);return{...f,data:a.data,...s};}
function rows(data:ReturnType<typeof fixture>['data']){const read=readProgramPersonalRecurrences(data,{actorId:'local-user',ownerId:'personal-plan',localToday:today,range:{start:'2026-01-01',end:'2027-12-31'}});assert.ok(read.ok,read.ok?'':read.reason);return read.value;}
function write(data:ReturnType<typeof fixture>['data'],identity:ProgramPersonalOccurrenceIdentity,changes:Parameters<typeof updateProgramPersonalOccurrence>[1]['changes'],at=at2){const owner=data.spaces['local-user'].recurrencePlans!.owners['personal-plan'];
 const result=updateProgramPersonalOccurrence(data,{actorId:'local-user',ownerId:owner.ownerId,expectedOwner:owner,identity,changes,at,localToday:today});assert.ok(result.ok,result.ok?'':result.reason);return result.data;}
test('RPS01 preparation writes nothing and explicit Program apply preserves original source/public/19 unrelated documents',()=>{
 const f=fixture(),before=programClone(f.data),s=seed(f);assert.deepEqual(f.data,before);assert.equal(f.data.spaces['local-user'].recurrencePlans,undefined);
 const a=applyProgramRecurrencePlanTransition(f.data,{...f.input,...s.prepared,preview:s.preview});assert.ok(a.ok);
 assert.ok(validateProgramData(a.data));assert.deepEqual(a.data.public,before.public);assert.deepEqual(a.data.spaces['local-user'].text,before.spaces['local-user'].text);
 assert.deepEqual(a.data.spaces['local-user'].legacySnapshot,before.spaces['local-user'].legacySnapshot);assert.equal(a.data.spaces['local-user'].recurrenceExecution,undefined);
 const read=readProgramExecutionOccurrences(a.data,f.input);assert.ok(read.ok);assert.ok(read.rows.some(row=>row.personalPlan));assert.ok(read.rows.filter(row=>!row.personalPlan).every(row=>row.planSuperseded));
 const period=readProgramOccurrencePeriod(a.data,{...f.input,from:'2026-09-01',to:'2026-09-25'});assert.ok(period.ok);assert.ok(period.rows.every(row=>row.personalPlan));assert.equal(new Set(period.rows.map(row=>row.key)).size,period.rows.length);
});
test('RPS02 private completion enters real executionRecords and next whole-series preserves its revision/history through Undo',()=>{
 const f=apply(fixture()),first=rows(f.data).rows[0];let data=write(f.data,first.personalPlan.identity,{completion:{status:'completed',completedAt:at2}});
 const owner=data.spaces['local-user'].recurrencePlans!.owners['personal-plan'],r=readProgramRecurrencePlan(owner,{start:'2026-09-01',end:'2026-10-30'});assert.ok(r.ok);
 assert.equal(r.value.state.occurrenceExecutionRecords?.[0].state,'done');assert.equal(r.value.state.occurrenceExecutionRecords?.[0].history.length,1);
 const target=r.value.targets.find(row=>row.executionState==='pending')!,p=previewProgramRecurrencePlan(owner,{actorId:'local-user',expected:owner,currentSource:owner.source,
  operation:{scope:'whole_series',targetDate:'2026-09-15',target,sourceCutover:null,at:'2026-09-12T03:00:00.000Z'}});assert.ok(p.ok,p.ok?'':p.reason);
 const applied=applyProgramRecurrencePlanTransition(data,{...f.input,expectedSpace:data.spaces['local-user'],expectedOwner:owner,preview:p.value});assert.ok(applied.ok);
 const after=readProgramRecurrencePlan(applied.data.spaces['local-user'].recurrencePlans!.owners['personal-plan'],{start:'2026-09-01',end:'2026-10-30'});assert.ok(after.ok);assert.equal(after.value.projection.series!.revisions.length,2);
 assert.deepEqual(after.value.executionEntries,r.value.executionEntries);
 const undo=undoProgramRecurrencePlanTransition(applied.data,{...f.input,expectedSpace:applied.data.spaces['local-user'],preview:p.value});assert.ok(undo.ok);assert.ok(programSame(undo.data,data));
 assert.equal(undoProgramRecurrencePlanTransition(data,{...f.input,expectedSpace:data.spaces['local-user'],preview:f.preview}).ok,false);
});
test('RPS03 private fixed/undated/inclusion exceptions keep their actual keys and distant period reads',()=>{
 const f=apply(fixture()),first=rows(f.data).rows[0],key=first.key;
 let data=write(f.data,first.personalPlan.identity,{schedule:{mode:'fixed_date',date:'2027-05-01'},completion:{status:'completed',completedAt:at2}});
 let period=readProgramOccurrencePeriod(data,{...f.input,from:'2027-05-01',to:'2027-05-01'});assert.ok(period.ok);assert.equal(period.rows.find(row=>row.key===key)?.completion,'completed');
 data=write(data,first.personalPlan.identity,{participation:'excluded'},'2026-09-12T03:00:00.000Z');
 period=readProgramOccurrencePeriod(data,{...f.input,from:'2027-05-01',to:'2027-05-01'});assert.ok(period.ok);assert.equal(period.rows.some(row=>row.key===key),false);
 data=write(data,first.personalPlan.identity,{participation:'included',schedule:{mode:'unscheduled',date:null}},'2026-09-12T04:00:00.000Z');
 const read=rows(data);assert.equal(read.rows.find(row=>row.key===key)?.executionDate,null);
 assert.deepEqual(data.spaces['local-user'].legacySnapshot,f.data.spaces['local-user'].legacySnapshot);assert.equal(data.spaces['local-user'].recurrenceExecution,undefined);
});
test('RPS04 another original completed/fixed operating occurrence forces history even when selected cutover is pending',()=>{
 const f=fixture(true),s=seed(f);assert.equal(s.prepared.owner.retainedSourceExecutions.length,1);assert.equal(s.prepared.owner.retainedSourceExecutions[0].completion.status,'completed');
 assert.equal(s.prepared.owner.retainedSourceExecutions[0].schedule.date,'2026-12-25');
 const a=applyProgramRecurrencePlanTransition(f.data,{...f.input,...s.prepared,preview:s.preview});assert.ok(a.ok);
 const owner=a.data.spaces['local-user'].recurrencePlans!.owners['personal-plan'],read=readProgramRecurrencePlan(owner,{start:'2026-01-01',end:'2027-01-01'});assert.ok(read.ok);
 assert.equal(read.value.projection.series!.revisions.length,2);assert.equal(read.value.sourceCoverage.mode,'cutover');assert.equal(read.value.retainedSourceExecutions[0].schedule.date,'2026-12-25');
 assert.deepEqual(a.data.spaces['local-user'].legacySnapshot,f.data.spaces['local-user'].legacySnapshot);assert.equal(a.data.spaces['local-user'].recurrenceExecution,undefined);
});
test('RPS05 direct old-source writer cannot bypass suppression using internal skipPersonalPlans',()=>{
 const original=fixture(),source=readProgramExecutionOccurrences(original.data,original.input);assert.ok(source.ok);const f=apply(original),row=source.rows[2];
 assert.equal(updateProgramOccurrenceExecution(f.data,{...f.input,skipPersonalPlans:true,identity:row.identity,expected:null,changes:{completion:{status:'completed',completedAt:at2}}}).ok,false);
});
test('RPS06 foreign actor/tuple, forged no-op identity, archived document and stale owners reject without changing data',()=>{
 const f=apply(fixture()),row=rows(f.data).rows[0],owner=row.personalPlan.expectedOwner,before=programClone(f.data),base={actorId:'local-user',ownerId:'personal-plan',expectedOwner:owner,identity:row.personalPlan.identity,changes:{completion:{status:'completed' as const,completedAt:at2}},at:at2,localToday:today};
 assert.equal(updateProgramPersonalOccurrence(f.data,{...base,actorId:'jihun'}).ok,false);
 assert.equal(updateProgramPersonalOccurrence(f.data,{...base,identity:{...base.identity,occurrenceId:'foreign'},changes:{}}).ok,false);
 const changed=write(f.data,row.personalPlan.identity,base.changes);assert.equal(updateProgramPersonalOccurrence(changed,base).ok,false);
 const archived=programClone(f.data);archived.spaces['local-user'].archivedDocumentIds.push(archived.spaces['local-user'].savedBindings[0].documentId);
 assert.equal(updateProgramPersonalOccurrence(archived,base).ok,false);assert.deepEqual(f.data,before);
});
test('RPS07 actual controller canonical reload, quota/retry single-write, repeated no-op and Undo preserve source and outside keys',async()=>{
 const f=fixture(),values=new Map([['flow:operating',' exact sentinel ']]),writes:string[]=[];let quota=false;
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(quota)throw new Error('quota');writes.push(k);values.set(k,v);},removeItem:(k:string)=>{writes.push(k);values.delete(k);}};
 let controller=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert.ok(controller.ok);
 const s=seed(f),build=(data:typeof f.data)=>applyProgramRecurrencePlanTransition(data,{...f.input,...s.prepared,preview:s.preview});quota=true;
 assert.equal((await controller.mutate('반복 계획',build,{actorId:'local-user'})).ok,false);assert.equal(writes.length,0);quota=false;
 assert.ok((await controller.mutate('반복 계획',build,{actorId:'local-user'})).ok);assert.equal(writes.length,1);
 controller=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert.ok(controller.ok);
 const snap=controller.snapshot().envelope.data,row=rows(snap).rows[0],args={actorId:'local-user',ownerId:'personal-plan',expectedOwner:row.personalPlan.expectedOwner,identity:row.personalPlan.identity,changes:{completion:{status:'completed' as const,completedAt:at2}},at:at2,localToday:today};
 assert.ok((await controller.mutate('개인 회차 완료',data=>updateProgramPersonalOccurrence(data,args),{actorId:'local-user'})).ok);assert.equal(writes.length,2);
 const updated=controller.snapshot().envelope.data;assert.ok(validateProgramData(updated));
 assert.ok((await controller.mutate('같은 완료',data=>updateProgramPersonalOccurrence(data,{...args,expectedOwner:updated.spaces['local-user'].recurrencePlans!.owners['personal-plan']}),{actorId:'local-user'})).ok);assert.equal(writes.length,2);
 assert.ok((await controller.undo('local-user')).ok);assert.equal(rows(controller.snapshot().envelope.data).rows[0].completion,'unrecorded');
 assert.equal(values.get('flow:operating'),' exact sentinel ');assert.ok(writes.every(key=>key===PROGRAM_STATE_KEY));
 assert.deepEqual(controller.snapshot().envelope.data.spaces['local-user'].legacySnapshot,f.data.spaces['local-user'].legacySnapshot);
});
test('RPS08 personal occurrence and ordinary task mixed order persists, reloads and undoes with strict private tuple validation',async()=>{
 const f=apply(fixture()),actorId='local-user',doc=f.data.spaces[actorId].text.documents[0];
 f.data.spaces[actorId].text=M.editText(f.data.spaces[actorId].text,doc.id,'- [ ] 독립 일반 준비\n  - 날짜: 2026-09-10');assert.ok(validateProgramData(f.data));
 const query={period:'all' as const,date:'2026-09-10',today:'2026-09-10'},bucket=programOrderedExecutionRows(f.data,query).rows.filter(row=>row.date==='2026-09-10');
 assert.equal(bucket.length,2);const personal=bucket.find(row=>row.kind==='occurrence')!,ordinary=bucket.find(row=>row.kind==='text-task')!;
 assert.ok(isProgramExecutionTargetKey(personal.key));assert.ok(personal.kind==='occurrence'&&personal.row.personalPlan);
 for(const mutate of [(t:string[])=>{t[2]='wrong-actor';},(t:string[])=>{t[3]='wrong-owner';},(t:string[])=>{t[5]+='broken';},(t:string[])=>{t[6]=t[6].replace('2026-09-10T','2026-02-30T');}]){const tuple=JSON.parse(personal.key);mutate(tuple);assert.equal(isProgramExecutionTargetKey(JSON.stringify(tuple)),false);}
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};
 let c=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert.ok(c.ok);
 assert.ok((await c.mutate('혼합 순서',data=>reorderProgramExecutionTimeline(data,{actorId,query,targetKey:personal.key,beforeKey:ordinary.key,expectedKeys:bucket.map(row=>row.key),expectedOrder:null}),{actorId})).ok);
 c=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert.ok(c.ok);
 assert.deepEqual(programOrderedExecutionRows(c.snapshot().envelope.data,query).rows.filter(row=>row.date==='2026-09-10').map(row=>row.key),[personal.key,ordinary.key]);
 assert.ok((await c.undo(actorId)).ok);assert.equal(c.snapshot().envelope.data.spaces[actorId].executionTimelineOrders,undefined);
});
test('RPS09 actual private TXT/CSV/ICS output uses personal keys/dates/completion without duplicate source rows or fabricated occurrence zero',()=>{
 const f=apply(fixture()),row=rows(f.data).rows[0],data=write(f.data,row.personalPlan.identity,{completion:{status:'completed',completedAt:at2}}),actorId='local-user';
 const documentId=data.spaces[actorId].savedBindings[0].documentId,occurrenceRange={from:'2026-09-01',to:'2026-09-25',includeUndated:false};
 const inspect=inspectProgramPrivateOutput(data,{actorId,documentId,occurrenceRange});assert.ok(inspect.ok);
 const selected=inspect.rows.filter(r=>r.kind==='occurrence');assert.equal(selected.length,12);assert.equal(selected[0].date,'2026-09-10');assert.equal(selected[0].progress,100);
 assert.ok(selected.every(r=>!r.title.includes('0회차')&&r.title.includes('개인 회차')));assert.equal(new Set(selected.map(r=>r.id)).size,selected.length);
 const original=programClone(data);
 for(const format of ['txt','csv','ics'] as const){const out=makeProgramPrivateOutput(data,{actorId,documentId,occurrenceRange,mode:'tasks',selectedItemIds:selected.map(r=>r.id),format},at2);assert.ok(out.ok,out.ok?'':out.reason);
  if(format==='ics'){const bytes=out.payload.replace(/\r\n[ \t]/g,'');const uids=bytes.split('\r\n').filter(line=>line.startsWith('UID:'));assert.equal(uids.length,12);assert.equal(new Set(uids).size,12);assert.ok(bytes.includes('DTSTART:20260910T090000\r\n'));assert.ok(!bytes.includes('DTEND'));}
 }
 assert.deepEqual(data,original);
});
test('RPS10 private fixed-date exact target resolves outside original-date display range; undated gets an explicit cutover reason',()=>{
 const f=apply(fixture()),row=rows(f.data).rows[0],identity=row.personalPlan.identity;
 let data=write(f.data,identity,{schedule:{mode:'fixed_date',date:'2027-05-01'}}),owner=data.spaces['local-user'].recurrencePlans!.owners['personal-plan'];
 const read=readProgramRecurrencePlan(owner,{start:identity.originalDate,end:identity.originalDate});assert.ok(read.ok);assert.equal(read.value.targets.some(target=>target.occurrenceId===identity.occurrenceId),false);
 const resolved=resolveProgramRecurrencePlanTarget(owner,{originalDate:identity.originalDate,personalIdentity:identity});assert.ok(resolved.ok);assert.equal(resolved.value.currentDate,'2027-05-01');
 assert.equal(resolveProgramRecurrencePlanTarget(owner,{originalDate:identity.originalDate,personalIdentity:{...identity,revisionId:'wrong'}}).ok,false);
 data=write(data,identity,{schedule:{mode:'unscheduled',date:null}},'2026-09-12T03:00:00.000Z');owner=data.spaces['local-user'].recurrencePlans!.owners['personal-plan'];
 const undated=resolveProgramRecurrencePlanTarget(owner,{originalDate:identity.originalDate,personalIdentity:identity});assert.equal(undated.ok,false);if(!undated.ok)assert.equal(undated.reason,'undated-cutover');
});
test('RPS11 30 daily private rows expose remaining 29th/30th independently of source finite hasMore and do not repeat IDs',()=>{
 const f=apply(fixture(false,30));
 const page1=readProgramExecutionOccurrences(f.data,{...f.input,window:{finiteOffset:0,finiteLimit:30,windowOffsetWeeks:0,windowWeeks:4}});assert.ok(page1.ok);
 assert.ok(page1.series.every(series=>!series.manifest.hasMore));assert.equal(page1.personalHasMore,true);
 const first=page1.rows.filter(row=>row.personalPlan);assert.equal(first.length,28);assert.equal(first[0].originalDate,'2026-09-10');assert.equal(first.at(-1)!.originalDate,'2026-10-07');
 const page2=readProgramExecutionOccurrences(f.data,{...f.input,window:{finiteOffset:30,finiteLimit:30,windowOffsetWeeks:4,windowWeeks:4}});assert.ok(page2.ok);
 const last=page2.rows.filter(row=>row.personalPlan);assert.deepEqual(last.map(row=>row.originalDate),['2026-10-08','2026-10-09']);assert.equal(page2.personalHasMore,false);
 assert.equal(new Set([...first,...last].map(row=>row.key)).size,30);
});
test('RPS12 a genuine different source revision never silently retargets existing private execution and retained history remains addressable',()=>{
 const f=apply(fixture()),row=rows(f.data).rows[0],saved=write(f.data,row.personalPlan.identity,{completion:{status:'completed',completedAt:at2}}),before=programClone(saved);
 const incoming=materializePersonalWorkspacePocAuthoring({handoffId:'rp-state',documentId:'rp-doc',revisionId:'rp-source-v2',committedAt:at2,
  rawText:'# 실제 변경된 반복 원문\n- [ ] 원문 반복 변경\n  - 날짜: 2026-09-01\n  - 반복: 매일\n  - 반복 종료: 12회\n  - 시간: 10:00'});assert.ok(incoming.ok);
 const payload=JSON.parse(saved.spaces['local-user'].legacySnapshot!.raw);payload.model.flows=[incoming.flow];saved.spaces['local-user'].legacySnapshot!.raw=JSON.stringify(payload);assert.ok(validateProgramData(saved));
 const recovery=readProgramRecurrencePlanRecoveries(saved,{actorId:'local-user',localToday:today});assert.equal(recovery.length,1);assert.equal(recovery[0].reason,'source-changed-or-unavailable');
 assert.equal(recovery[0].retainedPersonal[0].completion.status,'completed');
 assert.equal(updateProgramPersonalOccurrence(saved,{actorId:'local-user',ownerId:'personal-plan',expectedOwner:saved.spaces['local-user'].recurrencePlans!.owners['personal-plan'],identity:row.personalPlan.identity,
  changes:{completion:{status:'open',completedAt:null}},at:'2026-09-12T03:00:00.000Z',localToday:today}).ok,false);
 assert.deepEqual(saved.spaces['local-user'].recurrencePlans,before.spaces['local-user'].recurrencePlans);assert.deepEqual(saved.spaces['local-user'].recurrenceExecution,before.spaces['local-user'].recurrenceExecution);
});
test('RPS13 original records beyond cutover remain explicit read-only recovery and execution-event tampering fails owner validation',()=>{
 const f=fixture(),initial=readProgramExecutionOccurrences(f.data,f.input);assert.ok(initial.ok);const original=initial.rows[5];
 const recorded=updateProgramOccurrenceExecution(f.data,{...f.input,identity:original.identity,expected:null,changes:{schedule:{mode:'fixed_date',date:'2026-12-25'},completion:{status:'completed',completedAt:now}}});assert.ok(recorded.ok);f.data=recorded.data;
 const a=apply(f),recovery=readProgramRecurrencePlanRecoveries(a.data,{actorId:'local-user',localToday:today});assert.equal(recovery[0].reason,'retained-source-records');assert.equal(recovery[0].retainedSourceExecutions[0].occurrenceId,original.occurrenceId);
 const personal=rows(a.data).rows[0],saved=write(a.data,personal.personalPlan.identity,{completion:{status:'completed',completedAt:at2}}),corrupt=programClone(saved);
 corrupt.spaces['local-user'].recurrencePlans!.owners['personal-plan'].executionEvents![0].afterOperationCount=0;assert.equal(validateProgramData(corrupt),false);
 const other=programClone(saved);other.spaces['participant-jihun'].recurrencePlans=programClone(saved.spaces['local-user'].recurrencePlans);assert.equal(validateProgramData(other),false);
});
