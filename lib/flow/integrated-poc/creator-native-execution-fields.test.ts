import test from 'node:test';import assert from 'node:assert/strict';
import {nativeExecutionFixture,handoffNativeFixture,saveNativeExecutionFixture,nativeExecOk,NATIVE_EXEC_NOW as now} from './creator-native-execution.test';
import {inspectProgramNativeCreatorHandoff,applyProgramNativeCreatorHandoff} from './creator-native-execution-adapter';
import {applyProgramNativeCreatorOperation,buildProgramNativeCreatorRawSyncOperation} from './creator-native-workspace';
import {programClone,PROGRAM_STATE_KEY,type ProgramData} from './contract';
import {textWorkspaceModel as M} from './text-workspace';
import {validateProgramData} from './program-data';
import {programNativeSelectedRows} from './creator-native-execution-validation';
import {programNativeExecutionRef} from './creator-native-execution-contract';
import {resolveProgramExecutionSource} from './execution-source';
import {createProgramController} from './controller';
import {readProgramExecutionOccurrences,updateProgramOccurrenceExecution} from './recurrence-state';
import {readProgramOccurrenceRecovery} from './recurrence-recovery';
import {programReferenceExecutionAccess} from './reference-execution-guard';
import {updateProgramTask} from './private-space';
import {readNativeCreatorDocument} from './native-creator-document';
import {programNativeExecutionItemFacts} from './creator-native-execution-facts';
import type {CreatorUpdateChoice} from './creator-update';
const keep:CreatorUpdateChoice={source:'keep',date:'keep',time:'keep',children:'keep'};
function edit(data:ProgramData,id:string,operation:Parameters<typeof applyProgramNativeCreatorOperation>[1]['operation']){const w=data.spaces[data.activeActorId].creatorWorkspace!.working!;return saveNativeExecutionFixture(nativeExecOk(applyProgramNativeCreatorOperation(data,{actorId:data.activeActorId,requestId:id,draftId:w.draftId,expectedWorking:w,expectedOwner:w.nativeDocument!,operation},now)).data,'save-'+id);}
function preview(data:ProgramData,anchor?:string){const r=inspectProgramNativeCreatorHandoff(data,{actorId:data.activeActorId,draftId:'native-draft',...(anchor?{anchor}:{})},now);assert(r.ok,r.ok?'':r.reason);return r.preview;}
function apply(data:ProgramData,id:string,choices:Record<string,CreatorUpdateChoice>,p=preview(data)){return nativeExecOk(applyProgramNativeCreatorHandoff(data,{actorId:data.activeActorId,requestId:id,preview:p,choices},now));}
function current(data:ProgramData){const space=data.spaces[data.activeActorId],owner=space.creatorWorkspace!.nativeExecutionSources!['native-draft'];return{space,owner,rows:programNativeSelectedRows(owner)};}

test('NE04 source keep permits independent date/time acceptance and same-context reaccept without new source revision',()=>{
 let data=handoffNativeFixture(nativeExecutionFixture().data).data;let {space,rows}=current(data);const row=rows[0].row,id=row.itemId;
 space.text=M.updateTask(space.text,row.lineId,{date:'2026-11-01',time:'23:10',note:'PRIVATE',done:true});space.text=M.recordProgress(space.text,row.lineId,'2026-09-13',65);
 data=edit(data,'change-time',{type:'set_property',itemId:id,key:'time',value:'11:00'});const before=programClone(data),oldRevisions=programClone(current(data).owner.revisions),r=apply(data,'date-time',{[id]:{...keep,date:'incoming',time:'incoming'}});data=r.data;
 let task=M.tasks(current(data).space.text).find(t=>t.id===row.lineId)!;assert.equal(task.date,'2026-09-20');assert.equal(task.time,'11:00');assert.equal(task.note,'PRIVATE');assert.equal(task.done,M.tasks(current(before).space.text).find(t=>t.id===row.lineId)!.done);assert.deepEqual(current(data).space.text.progressRecords,current(before).space.text.progressRecords);assert.deepEqual(current(data).owner.revisions[0],oldRevisions[0]);
 const count=current(data).owner.revisions.length;current(data).space.text=M.updateTask(current(data).space.text,row.lineId,{date:'2026-12-01',time:'22:00'});
 const reapplied=apply(data,'same-context',{[id]:{...keep,date:'incoming',time:'incoming'}});assert(reapplied.changed);data=reapplied.data;assert.equal(current(data).owner.revisions.length,count);task=M.tasks(current(data).space.text).find(t=>t.id===row.lineId)!;assert.equal(task.date,'2026-09-20');assert.equal(task.time,'11:00');assert.equal(apply(data,'identical',{[id]:{...keep,date:'incoming',time:'incoming'}}).changed,false);
 const source=resolveProgramExecutionSource(current(data).space,programNativeExecutionRef(current(data).owner.id));assert(source.ok);assert.equal([...source.contexts.values()][0].attributes.time,'11:00');assert.deepEqual(data.public,before.public);assert.equal(data.spaces[data.activeActorId].legacySnapshot,null);
});

test('NE05 first all-keep, field-only and excluded-only selections create no document or receipt',()=>{
 let data=nativeExecutionFixture().data,p=preview(data),id=p.rows[0].itemId;
 for(const choice of [keep,{...keep,date:'incoming'} as CreatorUpdateChoice]){const result=apply(data,'none',{[id]:choice},p);assert.equal(result.changed,false);assert.equal(result.data,data);assert.equal(result.result,'cancelled');}
 data=edit(data,'exclude-initial',{type:'exclude',itemId:id});p=preview(data);const result=apply(data,'excluded',{[id]:{...keep,source:'incoming'}},p);assert.equal(result.changed,false);assert.equal(result.data,data);
});

test('NE06 preview tampering and stale receipts cannot commit; receipt fingerprints contain no private text',()=>{
 const f=nativeExecutionFixture(),p=preview(f.data),choices=Object.fromEntries(p.rows.map(r=>[r.itemId,{...keep,source:'incoming' as const}])),input={actorId:f.actorId,requestId:'receipt',preview:p,choices};
 const before=JSON.stringify(f.data);p.rows[0].sourceDate='2040-01-01';assert.equal(applyProgramNativeCreatorHandoff(f.data,input,now).ok,false);assert.equal(JSON.stringify(f.data),before);
 const clean=preview(f.data),goodInput={...input,preview:clean};const first=nativeExecOk(applyProgramNativeCreatorHandoff(f.data,goodInput,now));assert.equal(nativeExecOk(applyProgramNativeCreatorHandoff(first.data,goodInput,now)).changed,false);assert(!first.data.receipts.at(-1)!.fingerprint.includes('Asia/Seoul'));assert(!first.data.receipts.at(-1)!.fingerprint.includes('sourceRaw'));
 const missing=programClone(f.data);missing.receipts.push(programClone(first.data.receipts.at(-1)!));assert(validateProgramData(missing));const refused=applyProgramNativeCreatorHandoff(missing,goodInput,now);assert(!refused.ok);assert.equal(refused.data,missing);
 const changed=programClone(first.data);changed.spaces[f.actorId].creatorWorkspace!.nativeExecutionSources!['native-draft'].revisions[0].rows[0].lines[0].text='- [ ] forged source';assert.equal(validateProgramData(changed),false);
});

test('NE07 changed multiline source replaces only owned lines, preserves private prose and subcheck identities/records',()=>{
 const raw='# 준비\n- [ ] 준비\n  - 설명: 첫 문장\n  - 완료 기준: 확인 완료\n  - [ ] 여권\n  - [ ] 티켓';let data=nativeExecutionFixture(raw).data;const sourceItem=data.spaces[data.activeActorId].creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items[0].itemId;data=edit(data,'initial-multiline',{type:'set_property',itemId:sourceItem,key:'detail',value:'첫 문장\n두 번째 문장'});data=handoffNativeFixture(data).data;
 let {space,rows}=current(data);const row=rows[0].row,id=row.itemId,doc=M.getDocument(space.text,rows[0].row.lineId?space.creatorWorkspace!.handoffs['native-draft'].documentId:'')!;
 const tail=doc.lines.find(l=>l.text==='    두 번째 문장')!;assert(tail);tail.text='    내 수정 두 번째 문장';const privateLine={id:'private-extra-sentence',text:'    내가 덧붙인 문장'};doc.lines.splice(doc.lines.indexOf(tail)+1,0,privateLine);
 const child=doc.lines.find(l=>l.text==='  - [ ] 여권')!;child.text='  - [x] 여권';const childId=child.id;space.text=M.recordProgress(space.text,row.lineId,'2026-09-13',45);const history=programClone(space.text.progressRecords),oldRevisions=programClone(current(data).owner.revisions);
 data=edit(data,'detail',{type:'set_property',itemId:id,key:'detail',value:'새 첫 문장\n새 두 번째 문장'});
 const r=apply(data,'accept-description',{[id]:{...keep,source:'incoming',children:'incoming'}});data=r.data;({space}=current(data));const actual=M.getDocument(space.text,current(data).owner.documentId)!;
 assert(actual.lines.some(l=>l.id===privateLine.id&&l.text===privateLine.text));assert(actual.lines.some(l=>l.id===childId&&l.text==='  - [x] 여권'));assert.equal(actual.lines.filter(l=>l.text.includes('여권')).length,1);assert.deepEqual(space.text.progressRecords,history);assert.deepEqual(current(data).owner.revisions[0],oldRevisions[0]);
 assert([...space.text.documents,...space.text.flows].some(d=>d.lines.some(l=>l.id===tail.id&&l.text===tail.text)));assert(validateProgramData(data));
});

test('NE08 quota/CAS retry, controller Undo/Redo/reload preserve exact native source and personal history',async()=>{
 const f=nativeExecutionFixture(),bytes=JSON.stringify(f.data);let stored:string|null=null,quota=true,writes=0;const storage={getItem:()=>stored,setItem:(key:string,value:string)=>{assert.equal(key,PROGRAM_STATE_KEY);if(quota)throw Error('quota');writes++;stored=value;},removeItem:()=>{throw Error('remove forbidden');}};
 const controller=createProgramController({initialData:f.data,storage,exclusive:async work=>await work()});assert(controller.ok);const p=preview(f.data),choices=Object.fromEntries(p.rows.map(r=>[r.itemId,{...keep,source:'incoming' as const}])),build=(data:ProgramData)=>applyProgramNativeCreatorHandoff(data,{actorId:f.actorId,requestId:'controller',preview:p,choices},now);
 const failed=await controller.mutate('인계',build,{actorId:f.actorId});assert(!failed.ok);assert.equal(writes,0);assert.equal(JSON.stringify(controller.snapshot().envelope.data),bytes);quota=false;assert((await controller.mutate('인계',build,{actorId:f.actorId})).ok);assert.equal(writes,1);const accepted=programClone(controller.snapshot().envelope.data.spaces[f.actorId]);
 assert((await controller.undo(f.actorId)).ok);assert.deepEqual(controller.snapshot().envelope.data.spaces[f.actorId],f.data.spaces[f.actorId]);assert((await controller.redo(f.actorId)).ok);assert.deepEqual(controller.snapshot().envelope.data.spaces[f.actorId],accepted);
 const reload=createProgramController({initialData:f.data,storage,exclusive:async work=>await work()});assert(reload.ok);assert.deepEqual(reload.snapshot().envelope.data.spaces[f.actorId],accepted);
});

test('NE09 native actual recurrence identities support execution and preserve records after new source time acceptance',()=>{
 let data=handoffNativeFixture(nativeExecutionFixture().data).data;const {owner,rows}=current(data),series=rows.find(r=>r.row.kind==='series')!,input={actorId:data.activeActorId,flowRef:programNativeExecutionRef(owner.id),localToday:'2026-09-13'};
 const read=readProgramExecutionOccurrences(data,input);assert(read.ok,read.ok?'':read.reason);assert.equal(read.rows.length,5);const row=read.rows[0];assert(row.identity.nativeOwner);assert.equal(Object.hasOwn(row.identity,'savedCopyId'),false);
 const updated=updateProgramOccurrenceExecution(data,{...input,identity:row.identity,expected:null,changes:{schedule:{mode:'fixed_date',date:'2026-10-03'},completion:{status:'completed',completedAt:now}}});assert(updated.ok,updated.ok?'':updated.reason);data=updated.data;const oldState=programClone(current(data).space.recurrenceExecution);
 data=edit(data,'recurrence-time',{type:'set_property',itemId:series.row.itemId,key:'time',value:'10:00'});data=apply(data,'accept-series-time',{[series.row.itemId]:{...keep,time:'incoming'}}).data;
 assert.deepEqual(current(data).space.recurrenceExecution,oldState);const next=readProgramExecutionOccurrences(data,input);assert(next.ok,next.ok?'':next.reason);assert.equal(next.rows[0].identity.occurrenceId,row.identity.occurrenceId);assert.equal(next.rows[0].time,'10:00');assert(validateProgramData(data));
});

test('NE10 explicit anchor-only handoff is immutable and omitted anchor inherits the last chosen value',()=>{
 let data=nativeExecutionFixture('# 일정\n- [ ] 이틀 뒤\n  - 상대 날짜: D+2').data,p=preview(data,'2026-09-20'),id=p.rows[0].itemId;assert.equal(p.rows[0].sourceDate,'2026-09-22');
 data=apply(data,'anchor-first',{[id]:{...keep,source:'incoming'}},p).data;const old=programClone(current(data).owner.revisions[0]);p=preview(data);assert.equal(p.rows[0].sourceDate,'2026-09-22');
 p=preview(data,'2026-10-01');assert.equal(p.rows[0].sourceDate,'2026-10-03');data=apply(data,'anchor-only',{[id]:{...keep,date:'incoming'}},p).data;assert.equal(current(data).owner.revisions.length,2);assert.deepEqual(current(data).owner.revisions[0],old);assert.equal(current(data).owner.revisions[1].contextRevision,old.contextRevision);assert.equal(preview(data).rows[0].sourceDate,'2026-10-03');assert.equal(M.tasks(current(data).space.text)[0].date,'2026-10-03');
});

test('NE11 source keep plus children incoming retains exact old child records and private additions without changing main source',()=>{
 const raw='# 준비\n- [ ] 원래 제목\n  - 설명: 원래 설명\n  - [ ] 여권\n  - [ ] 티켓';let data=handoffNativeFixture(nativeExecutionFixture(raw).data).data;let {space,rows}=current(data);const id=rows[0].row.itemId,child=rows[0].row.lines.find(l=>l.text.includes('여권'))!;
 space.text=M.recordProgress(space.text,child.id,'2026-09-13',100);const d=M.getDocument(space.text,current(data).owner.documentId)!;d.lines.push({id:'private-child-note',text:'    개인 하위 문장'});const history=programClone(space.text.progressRecords);
 const working=space.creatorWorkspace!.working!,sync=buildProgramNativeCreatorRawSyncOperation(working.nativeDocument!,raw.replace('원래 제목','새 제목').replace('원래 설명','새 설명').replace('여권','신분증'));assert(sync.ok);data=edit(data,'change-children',sync.operation);
 const p=preview(data);assert.equal(p.rows[0].itemId,id);data=apply(data,'children-only',{[id]:{...keep,children:'incoming'}},p).data;({space}=current(data));const actual=M.getDocument(space.text,current(data).owner.documentId)!;
 assert.equal(M.tasks(space.text).find(t=>t.id===rows[0].row.lineId)!.title,'원래 제목');assert(M.raw(actual).includes('원래 설명'));assert(M.raw(actual).includes('신분증'));assert.deepEqual(space.text.progressRecords,history);assert([...space.text.documents,...space.text.flows].some(doc=>doc.lines.some(l=>l.id===child.id)));assert([...space.text.documents,...space.text.flows].some(doc=>doc.lines.some(l=>l.id==='private-child-note')));assert(validateProgramData(data));
});

test('NE12 source title acceptance preserves all supported numeric progress tokens and references',()=>{
 for(const token of ['20%','20','0.2']){let data=handoffNativeFixture(nativeExecutionFixture('# 준비\n- [ ] 이전 제목').data).data;let {space,rows,owner}=current(data);const row=rows[0].row;
  space.text=M.editText(space.text,owner.documentId,M.raw(M.getDocument(space.text,owner.documentId)).replace('- [ ]','- ['+token+']'),{progressDate:'2026-09-13'});assert(validateProgramData(data));const history=programClone(space.text.progressRecords);
  space.text=M.addDocument(space.text,{title:'참조 문서'});const referenceDoc=space.text.documents.at(-1)!.id;space.text=M.linkTask(space.text,referenceDoc,0,row.lineId);assert(validateProgramData(data));
  data=edit(data,'rename-'+token,{type:'rename',itemId:row.itemId,title:'수용한 제목'});data=apply(data,'accept-'+token,{[row.itemId]:{...keep,source:'incoming'}}).data;({space}=current(data));assert(M.getDocument(space.text,owner.documentId)!.lines.find(l=>l.id===row.lineId)!.text.includes('['+token+'] 수용한 제목'));assert.deepEqual(space.text.progressRecords,history);assert(M.raw(M.getDocument(space.text,referenceDoc)).includes('수용한 제목'));assert(validateProgramData(data));
 }
});

test('NE13 ordinary to series and back retain separate execution targets and exact past occurrence recovery',()=>{
 let data=handoffNativeFixture(nativeExecutionFixture('# 준비\n- [ ] 준비\n  - 날짜: 2026-09-20').data).data;let {space,rows,owner}=current(data);const first=rows[0].row,id=first.itemId;
 space.text=M.updateTask(space.text,first.lineId,{date:'2026-10-01',note:'개인 메모'});space.text=M.recordProgress(space.text,first.lineId,'2026-09-13',65);const history=programClone(space.text.progressRecords);
 data=edit(data,'make-series',{type:'set_property',itemId:id,key:'repeat',value:'매일'});data=apply(data,'to-series',{[id]:{...keep,source:'incoming'}}).data;({space,rows,owner}=current(data));assert.equal(rows[0].row.kind,'series');assert.notEqual(rows[0].row.lineId,first.lineId);assert.deepEqual(space.text.progressRecords,history);const old=M.tasks(space.text).find(t=>t.id===first.lineId)!;assert(space.archivedDocumentIds.includes(old.docId));assert.equal(old.date,'2026-10-01');assert.equal(old.note,'개인 메모');
 const input={actorId:data.activeActorId,flowRef:programNativeExecutionRef(owner.id),localToday:'2026-09-13'},read=readProgramExecutionOccurrences(data,input);assert(read.ok,read.ok?'':read.reason);const occurrence=read.rows[0];const saved=updateProgramOccurrenceExecution(data,{...input,identity:occurrence.identity,expected:null,changes:{completion:{status:'completed',completedAt:now}}});assert(saved.ok,saved.ok?'':saved.reason);data=saved.data;const records=programClone(current(data).space.recurrenceExecution);
 data=edit(data,'undo-series-source',{type:'undo'});data=apply(data,'back-to-ordinary',{[id]:{...keep,source:'incoming'}}).data;assert.equal(current(data).rows[0].row.kind,'ordinary');assert.notEqual(current(data).rows[0].row.lineId,first.lineId);assert.deepEqual(current(data).space.recurrenceExecution,records);const recovery=readProgramOccurrenceRecovery(data,{actorId:data.activeActorId,localToday:'2026-09-13',flowRefs:[input.flowRef]});assert.equal(recovery.length,1);assert.equal(recovery[0].stored.occurrenceId,occurrence.identity.occurrenceId);assert(validateProgramData(JSON.parse(JSON.stringify(data))));
});

test('NE14 one saved canonical can be accepted in later subsets without rewriting its immutable rows',()=>{
 const f=nativeExecutionFixture();let p=preview(f.data);assert(p.rows.every(row=>!row.fieldUpdatesAllowed&&row.mode==='new'));
 let data=apply(f.data,'first-one',{[p.rows[0].itemId]:{...keep,source:'incoming'}},p).data;const immutable=programClone(current(data).owner.revisions);p=preview(data);assert.equal(p.rows[0].mode,'update');assert.equal(p.rows[1].mode,'new');
 data=apply(data,'remaining-one',{[p.rows[1].itemId]:{...keep,source:'incoming'}},p).data;assert.deepEqual(current(data).owner.revisions,immutable);assert.equal(current(data).rows.filter(r=>r.disposition==='active').length,2);assert.equal(apply(data,'unchanged',Object.fromEntries(preview(data).rows.map(r=>[r.itemId,{...keep,source:'incoming' as const}]))).changed,false);
});

test('NE15 genuine held native source can be retained as a document but ordinary and occurrence execution remain blocked',()=>{
 const f=nativeExecutionFixture(undefined,[{kind:'safety',reasonKey:'confirm-original'}]);const data=handoffNativeFixture(f.data).data,{space,rows,owner}=current(data);assert.equal(programReferenceExecutionAccess(space,rows[0].row.lineId).kind,'quality-hold');const before=JSON.stringify(data);
 const update=updateProgramTask(data,{actorId:f.actorId,requestId:'held-task',expectedSpace:space,taskId:rows[0].row.lineId,patch:{date:'2030-01-01'}});assert(!update.ok);assert.equal(update.data,data);
 const input={actorId:f.actorId,flowRef:programNativeExecutionRef(owner.id),localToday:'2026-09-13'},read=readProgramExecutionOccurrences(data,input);assert(read.ok,read.ok?'':read.reason);assert(read.rows.every(r=>r.mapReviewHold));const write=updateProgramOccurrenceExecution(data,{...input,identity:read.rows[0].identity,expected:null,changes:{completion:{status:'completed',completedAt:now}}});assert(!write.ok);assert.equal(JSON.stringify(data),before);assert.equal(space.creatorWorkspace!.nativeExecutionSources!['native-draft'].revisions[0].nativeDocument.source.documentJson,f.source.documentJson);
});

test('NE16 an independently accepted field cannot bypass its native source review gate',()=>{
 let data=nativeExecutionFixture(undefined,[{kind:'rights',reasonKey:'rights'}]).data;const gate=data.spaces[data.activeActorId].creatorWorkspace!.working!.nativeDocument!.document.reviewGates![0].gateId;
 data=edit(data,'reviewed',{type:'record_review_decision',gateId:gate,status:'personal_only'});data=handoffNativeFixture(data).data;const id=current(data).rows[0].row.itemId;assert.equal(programReferenceExecutionAccess(current(data).space,current(data).rows[0].row.lineId).kind,'active');
 data=edit(data,'reopen',{type:'reopen_review',gateId:gate});data=edit(data,'held-new-time',{type:'set_property',itemId:id,key:'time',value:'12:00'});data=apply(data,'time-from-held',{[id]:{...keep,time:'incoming'}}).data;assert.equal(programReferenceExecutionAccess(current(data).space,current(data).rows[0].row.lineId).kind,'quality-hold');assert(validateProgramData(data));
});

test('NE17 D2 repeat-property projection oracle and execution date/time agree without altering the native DTO',()=>{
 let data=nativeExecutionFixture('# 시작\n- [ ] 확인\n  - 날짜: 2026-09-20\n  - 시간: 09:30\n  - 시간대: Asia/Seoul').data;const id=data.spaces[data.activeActorId].creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items[0].itemId;
 data=edit(data,'repeat-oracle',{type:'set_property',itemId:id,key:'repeat',value:'매일'});const native=data.spaces[data.activeActorId].creatorWorkspace!.working!.nativeDocument!,raw=JSON.stringify(native),read=readNativeCreatorDocument(native);assert(read.ok);const item=read.document.parseResult.canonical.items[0];assert.equal(item.recurrence,undefined);assert.equal(programNativeExecutionItemFacts(item).kind,'series');const oracleRows=read.projection.artifacts.calendar.rows.filter(row=>row.itemId===id&&row.occurrenceId);assert(oracleRows.length>0);
 data=handoffNativeFixture(data).data;const input={actorId:data.activeActorId,flowRef:programNativeExecutionRef(current(data).owner.id),localToday:'2026-09-13'},rows=readProgramExecutionOccurrences(data,input);assert(rows.ok,rows.ok?'':rows.reason);assert.equal(rows.rows[0].originalDate,'2026-09-20');assert.equal(rows.rows[0].time,'09:30');assert.equal(rows.rows[0].timeZone,'Asia/Seoul');assert.deepEqual(rows.rows.map(r=>r.occurrenceId),oracleRows.map(r=>r.occurrenceId));assert.equal(JSON.stringify(current(data).space.creatorWorkspace!.working!.nativeDocument),raw);
});

test('NE18 source-only role and series child checks never become independent ordinary execution tasks',()=>{
 let data=nativeExecutionFixture('# 자료\n- [ ] 안내\n  - 날짜: 2026-09-20\n  - [x] 원문 하위').data;const id=data.spaces[data.activeActorId].creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items[0].itemId;
 data=edit(data,'note-role',{type:'change_role',itemId:id,role:'guide'});data=handoffNativeFixture(data).data;assert.equal(current(data).rows[0].row.kind,'note');assert.equal(M.tasks(current(data).space.text).length,0);assert(M.raw(M.getDocument(current(data).space.text,current(data).owner.documentId)).includes('세부 확인: 원문 하위'));
 let repeated=nativeExecutionFixture('# 반복\n- [ ] 확인\n  - 날짜: 2026-09-20\n  - 반복: 매일\n  - 반복 종료: 3회\n  - [x] 원문 확인').data;repeated=handoffNativeFixture(repeated).data;assert.equal(M.tasks(current(repeated).space.text).length,0);assert.equal(current(repeated).space.text.progressRecords.length,0);assert(validateProgramData(repeated));
});
