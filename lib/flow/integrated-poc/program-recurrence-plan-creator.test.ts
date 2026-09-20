import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData,validateProgramData } from './program-data';
import { programClone,PROGRAM_STATE_KEY,type ProgramData,type ProgramTransition } from './contract';
import { setProgramCreatorWorking,applyProgramCreatorAction,handoffProgramCreatorDraft,fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from './creator-workspace';
import { currentCreatorExecutionRevision } from './creator-execution-source';
import { readProgramExecutionOccurrences,readProgramOccurrencePeriod,updateProgramOccurrenceExecution } from './recurrence-state';
import { prepareProgramRecurrencePlan,applyProgramRecurrencePlanTransition,readProgramPersonalRecurrences,updateProgramPersonalOccurrence,readProgramRecurrencePlanRecoveries,undoProgramRecurrencePlanTransition } from './program-recurrence-plan-state';
import { readProgramRecurrencePlan,previewProgramRecurrencePlan,validateProgramRecurrencePlanOwner } from './program-recurrence-plan';
import { createProgramController,programSame } from './controller';
import { textWorkspaceModel as M } from './text-workspace';
const actorId='local-user',today='2026-09-12',now='2026-09-12T12:00:00.000Z',later='2026-09-12T13:00:00.000Z',last='2026-09-12T14:00:00.000Z';
const raw='# 실제 제작 원문\n- [ ] 걷기\n  - 날짜: 2026-09-14\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 반복: 매일\n  - 반복 종료: 12회';
function accept(result:ProgramTransition<string>){assert.ok(result.ok,result.ok?'':result.reason);assert.ok(validateProgramData(result.data));return result.data;}
function creator(data=createProgramData(),draftId='actual-creator',sourceRaw=raw){
 const working=data.spaces[actorId].creatorWorkspace?.working??null,record=data.spaces[actorId].creatorWorkspace?.library.records[draftId];
 data=accept(setProgramCreatorWorking(data,{actorId,expectedWorking:working,working:{draftId,title:'제작 반복',rawText:sourceRaw,baseRecordRevision:record?.recordRevision??null}},now));
 const library=data.spaces[actorId].creatorWorkspace!.library;
 data=accept(applyProgramCreatorAction(data,{actorId,requestId:`save-${draftId}-${library.revision}`,action:{type:'save',draftId,title:'제작 반복',rawText:sourceRaw,sourceFingerprint:fingerprint(sourceRaw),expectedLibraryRevision:library.revision,...(record?{expectedRecordRevision:record.recordRevision}:{}),now}},now));
 return accept(handoffProgramCreatorDraft(data,{actorId,requestId:`handoff-${draftId}-${data.spaces[actorId].creatorWorkspace!.library.revision}`,draftId,expectedRecordRevision:data.spaces[actorId].creatorWorkspace!.library.records[draftId].recordRevision,today},now));
}
function source(data:ProgramData,draftId='actual-creator'){
 const owner=data.spaces[actorId].creatorWorkspace!.executionSources![draftId],revision=currentCreatorExecutionRevision(owner),input={actorId,flowRef:revision.flow.ref,localToday:today};
 const read=readProgramExecutionOccurrences(data,input);assert.ok(read.ok,read.ok?'':read.reason);return{owner,revision,input,read};
}
function prepare(data:ProgramData,ownerId='creator-private-plan',draftId='actual-creator'){
 const s=source(data,draftId),selected=s.read.rows.filter(row=>!row.personalPlan)[1],prepared=prepareProgramRecurrencePlan(data,{...s.input,sourceIdentity:selected.identity,ownerId,now});assert.ok(prepared.ok,prepared.ok?'':prepared.reason);
 const r=readProgramRecurrencePlan(prepared.value.owner,{start:selected.originalDate,end:selected.originalDate});assert.ok(r.ok);
 const preview=previewProgramRecurrencePlan(prepared.value.owner,{actorId,expected:prepared.value.owner,currentSource:selected.identity,operation:{scope:'whole_series',target:r.value.targets[0],targetDate:'2026-09-20',sourceCutover:selected.identity,at:later}});assert.ok(preview.ok,preview.ok?'':preview.reason);
 return{...s,prepared:prepared.value,preview:preview.value};
}
function apply(data:ProgramData,ownerId='creator-private-plan',draftId='actual-creator'){
 const p=prepare(data,ownerId,draftId);return{...p,data:accept(applyProgramRecurrencePlanTransition(data,{...p.input,...p.prepared,preview:p.preview}))};
}
function personal(data:ProgramData,ownerId='creator-private-plan'){
 const r=readProgramPersonalRecurrences(data,{actorId,ownerId,range:{start:'2026-09-01',end:'2027-12-31'},localToday:today});assert.ok(r.ok,r.ok?'':r.reason);return r.value;
}
test('RPC01 actual Creator identity seeds and suppresses only its source; another real copy and nineteen documents stay independent',()=>{
 let data=creator();data=creator(data,'independent-copy');for(let i=0;i<19;i++)data.spaces[actorId].text=M.addDocument(data.spaces[actorId].text,{title:`독립 ${i}`});
 const before=programClone(data),p=prepare(data);assert.deepEqual(data,before);assert.ok(p.prepared.owner.source.creatorOwner);assert.equal(data.spaces[actorId].legacySnapshot,null);
 const f=apply(data),read=source(f.data).read,other=source(f.data,'independent-copy').read;
 assert.ok(read.rows.filter(row=>!row.personalPlan).every(row=>row.planSuperseded));assert.ok(other.rows.every(row=>!row.planSuperseded&&!row.personalPlan));
 const rows=personal(f.data).rows;assert.equal(rows.length,12);assert.ok(rows.every(row=>programSame(row.identity,p.prepared.owner.source)));assert.equal(new Set(rows.map(row=>row.key)).size,12);
 assert.deepEqual(f.data.spaces[actorId].creatorWorkspace,before.spaces[actorId].creatorWorkspace);assert.deepEqual(f.data.spaces[actorId].text,before.spaces[actorId].text);assert.deepEqual(f.data.public,before.public);assert.deepEqual(f.data.spaces['participant-jihun'],before.spaces['participant-jihun']);
 assert.equal(updateProgramOccurrenceExecution(f.data,{...f.input,identity:p.read.rows[2].identity,expected:null,changes:{completion:{status:'completed',completedAt:last}}}).ok,false);
});
test('RPC02 all real Creator source records stay original and force historical cutover, not completion migration',()=>{
 let data=creator();const s=source(data),first=s.read.rows[0];
 data=accept(updateProgramOccurrenceExecution(data,{...s.input,identity:first.identity,expected:null,changes:{schedule:{mode:'fixed_date',date:'2027-02-01'},completion:{status:'completed',completedAt:now},participation:'held'}}));
 const entries=programClone(data.spaces[actorId].recurrenceExecution),f=apply(data),r=personal(f.data);
 assert.equal(r.sourceCoverage.mode,'cutover');assert.deepEqual(f.data.spaces[actorId].recurrenceExecution,entries);
 assert.equal(r.retainedSourceExecutions.length,1);assert.deepEqual(r.retainedSourceExecutions[0],Object.values(entries!.entries)[0]);assert.ok(r.rows.every(row=>row.completion==='unrecorded'));
 const hidden=readProgramOccurrencePeriod(f.data,{...f.input,from:'2027-02-01',to:'2027-02-01'});assert.ok(hidden.ok);assert.equal(hidden.rows.length,0);
 const period=readProgramOccurrencePeriod(f.data,{...f.input,from:'2027-02-01',to:'2027-02-01',includeHeld:true});assert.ok(period.ok);assert.equal(period.rows[0].key,first.key);
});
test('RPC03 personal execution enters subsequent whole/history and owner Undo restores exact previous state',()=>{
 const f=apply(creator()),row=personal(f.data).rows[0];let data=accept(updateProgramPersonalOccurrence(f.data,{actorId,ownerId:row.personalPlan.ownerId,expectedOwner:row.personalPlan.expectedOwner,identity:row.personalPlan.identity,changes:{completion:{status:'completed',completedAt:last},schedule:{mode:'fixed_date',date:'2027-01-10'},participation:'excluded'},at:last,localToday:today}));
 const owner=data.spaces[actorId].recurrencePlans!.owners[row.personalPlan.ownerId],r=readProgramRecurrencePlan(owner,{start:'2026-09-01',end:'2027-12-31'});assert.ok(r.ok);
 const target=r.value.targets.find(row=>row.executionState==='pending')!,p=previewProgramRecurrencePlan(owner,{actorId,expected:owner,currentSource:owner.source,operation:{scope:'whole_series',targetDate:'2026-10-01',target,sourceCutover:null,at:'2026-09-12T15:00:00.000Z'}});assert.ok(p.ok,p.ok?'':p.reason);
 const next=accept(applyProgramRecurrencePlanTransition(data,{actorId,expectedSpace:data.spaces[actorId],expectedOwner:owner,preview:p.value,localToday:today}));
 assert.deepEqual(personal(next).rows.find(r=>r.key===row.key)?.personalStored,personal(data).rows.find(r=>r.key===row.key)?.personalStored);
 const undo=accept(undoProgramRecurrencePlanTransition(next,{actorId,expectedSpace:next.spaces[actorId],preview:p.value,localToday:today}));assert.ok(programSame(undo,data));assert.deepEqual(next.spaces[actorId].creatorWorkspace,f.data.spaces[actorId].creatorWorkspace);
});
test('RPC04 true new Creator revision preserves unavailable private owner and records; new plan cannot silently retarget it',()=>{
 const f=apply(creator()),row=personal(f.data).rows[0];let data=accept(updateProgramPersonalOccurrence(f.data,{actorId,ownerId:row.personalPlan.ownerId,expectedOwner:row.personalPlan.expectedOwner,identity:row.personalPlan.identity,changes:{completion:{status:'completed',completedAt:last}},at:last,localToday:today}));
 const old=programClone(data.spaces[actorId].recurrencePlans),oldRevision=programClone(f.revision);
 data=creator(data,'actual-creator',raw.replace('09:30','10:30'));assert.deepEqual(data.spaces[actorId].recurrencePlans,old);assert.deepEqual(source(data).owner.revisions[0],oldRevision);
 const recovery=readProgramRecurrencePlanRecoveries(data,{actorId,localToday:today});assert.equal(recovery[0].reason,'source-changed-or-unavailable');assert.equal(recovery[0].retainedPersonal[0].completion.status,'completed');
 assert.equal(updateProgramPersonalOccurrence(data,{actorId,ownerId:row.personalPlan.ownerId,expectedOwner:old!.owners[row.personalPlan.ownerId],identity:row.personalPlan.identity,changes:{participation:'held'},at:last,localToday:today}).ok,false);
 const latest=source(data),selected=latest.read.rows.find(row=>!row.personalPlan)!;
 assert.equal(prepareProgramRecurrencePlan(data,{...latest.input,sourceIdentity:selected.identity,ownerId:row.personalPlan.ownerId,now}).ok,false);
 const fresh=apply(data,'new-revision-plan');assert.deepEqual(fresh.data.spaces[actorId].recurrencePlans!.owners[row.personalPlan.ownerId],old!.owners[row.personalPlan.ownerId]);assert.equal(personal(fresh.data,'new-revision-plan').rows[0].completion,'unrecorded');
});
test('RPC05 Creator owner forgery, legacy disguise, wrong exact slot and archived source fail closed',()=>{
 const data=creator(),p=prepare(data),identity=p.prepared.owner.source,before=programClone(data);
 for(const sourceIdentity of [{...identity,creatorOwner:undefined},{...identity,creatorOwner:{...identity.creatorOwner!,rowId:'foreign'}},{...identity,occurrenceIndex:identity.occurrenceIndex+1},{...identity,creatorOwner:{...identity.creatorOwner!,ownerId:'foreign'}}]){
  assert.equal(prepareProgramRecurrencePlan(data,{...p.input,sourceIdentity,ownerId:'bad-owner',now}).ok,false);
  assert.equal(validateProgramRecurrencePlanOwner({...p.prepared.owner,source:sourceIdentity}),false);
 }
 const archived=programClone(data);archived.spaces[actorId].archivedDocumentIds.push(p.owner.documentId);
 assert.equal(prepareProgramRecurrencePlan(archived,{...p.input,sourceIdentity:identity,ownerId:'bad-owner',now}).ok,false);assert.deepEqual(data,before);
});
test('RPC06 real controller quota/CAS then canonical reload, completion, Undo/Redo write only Program and keep Creator source bytes',async()=>{
 const initial=creator(),p=prepare(initial),values=new Map([['flow:sentinel',' original bytes ']]),writes:string[]=[];let quota=false;
 const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(quota)throw Error('quota');writes.push(k);values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};
 let c=createProgramController({initialData:initial,storage,exclusive:async work=>work()});assert.ok(c.ok);
 const build=(data:ProgramData)=>applyProgramRecurrencePlanTransition(data,{...p.input,...p.prepared,preview:p.preview});quota=true;assert.equal((await c.mutate('계획',build,{actorId})).ok,false);assert.equal(writes.length,0);quota=false;
 assert.ok((await c.mutate('계획',build,{actorId})).ok);assert.equal(writes.length,1);assert.equal((await c.mutate('오래된 계획',build,{actorId})).ok,false);assert.equal(writes.length,1);
 c=createProgramController({initialData:initial,storage,exclusive:async work=>work()});assert.ok(c.ok);const row=personal(c.snapshot().envelope.data).rows[0];
 assert.ok((await c.mutate('완료',data=>updateProgramPersonalOccurrence(data,{actorId,ownerId:row.personalPlan.ownerId,expectedOwner:row.personalPlan.expectedOwner,identity:row.personalPlan.identity,changes:{completion:{status:'completed',completedAt:last}},at:last,localToday:today}),{actorId})).ok);
 assert.ok((await c.undo(actorId)).ok);assert.equal(personal(c.snapshot().envelope.data).rows[0].completion,'unrecorded');assert.ok((await c.redo(actorId)).ok);
 c=createProgramController({initialData:initial,storage,exclusive:async work=>work()});assert.ok(c.ok);assert.equal(personal(c.snapshot().envelope.data).rows[0].completion,'completed');
 assert.deepEqual(c.snapshot().envelope.data.spaces[actorId].creatorWorkspace,initial.spaces[actorId].creatorWorkspace);assert.equal(values.get('flow:sentinel'),' original bytes ');assert.ok(writes.every(key=>key===PROGRAM_STATE_KEY));
});
test('RPC07 actual Creator revision update invalidates old private plan, and global Undo/reload restores exact provenance and execution',async()=>{
 const f=apply(creator()),row=personal(f.data).rows[0],initial=accept(updateProgramPersonalOccurrence(f.data,{actorId,ownerId:row.personalPlan.ownerId,expectedOwner:row.personalPlan.expectedOwner,identity:row.personalPlan.identity,changes:{completion:{status:'completed',completedAt:last}},at:last,localToday:today}));
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}};
 let c=createProgramController({initialData:initial,storage,exclusive:async work=>work()});assert.ok(c.ok);
 assert.ok((await c.mutate('제작 원문 새 판본',data=>({ok:true,data:creator(data,'actual-creator','실제 설명 추가\n'+raw),changed:true,result:'actual-creator'}),{actorId})).ok);
 const changed=c.snapshot().envelope.data;assert.notEqual(source(changed).read.rows[0].sourceItemRef,f.read.rows[0].sourceItemRef);
 assert.deepEqual(changed.spaces[actorId].recurrencePlans,initial.spaces[actorId].recurrencePlans);assert.equal(personal(changed).sourceAvailable,false);
 assert.equal(readProgramRecurrencePlanRecoveries(changed,{actorId,localToday:today})[0].retainedPersonal[0].completion.status,'completed');
 assert.ok((await c.undo(actorId)).ok);c=createProgramController({initialData:initial,storage,exclusive:async work=>work()});assert.ok(c.ok);
 // Root receipts remain an audit of the acknowledged request; Undo restores private state only.
 assert.ok(programSame(c.snapshot().envelope.data.spaces,initial.spaces));assert.deepEqual(c.snapshot().envelope.data.public,initial.public);
 assert.equal(personal(c.snapshot().envelope.data).sourceAvailable,true);assert.equal(personal(c.snapshot().envelope.data).rows[0].completion,'completed');
});
