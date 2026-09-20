import test from 'node:test';import assert from 'node:assert/strict';
import {createProgramData,validateProgramData} from './program-data';
import {setProgramCreatorWorking,applyProgramCreatorAction,handoffProgramCreatorDraft} from './creator-workspace';
import {fingerprintPersonalWorkspacePocAuthoringSource as fp} from '../personal-workspace-poc-authoring';
import {inspectCreatorUpdate,applyCreatorUpdate,type CreatorUpdateChoice} from './creator-update';
import {textWorkspaceModel as M} from './text-workspace';
import {resolveProgramExecutionSource,programCreatorTaskSourceFacts} from './execution-source';
import {programRecurrencePeriodRows} from './recurrence-target';
import {programResult,type ProgramData} from './contract';
import {createProgramController} from './controller';
import {PROGRAM_STATE_KEY} from './contract';
import {linkProgramTask} from './private-space';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createNativeCreatorDocumentOwner} from './native-creator-document';
const NOW='2026-09-12T13:00:00.000Z',DRAFT='update-test';
const SOURCE='# 준비\n## 구간\n- [ ] 준비하기\n  - 날짜: 2026-09-14\n  - 설명: 이전 설명\n  - [ ] 하위 확인\n- [ ] 걷기\n  - 날짜: 2026-09-14\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 반복: 매일\n  - 반복 종료: 3회';
const incoming:CreatorUpdateChoice={source:'incoming',date:'keep',time:'keep',children:'keep'};
test('restored native canonical cannot enter the raw-only update proposal or apply a previously captured proposal',()=>{
  let data=save(fixture(),SOURCE.replace('이전 설명','새 설명'));const preview=inspectCreatorUpdate(data,DRAFT,NOW);assert(preview);
  const actorId=data.activeActorId,w=data.spaces[actorId].creatorWorkspace!.working!;
  const document=createTextAuthoringDocument(w.rawText,{documentId:'original-update-native',ownership:'creator',now:NOW});
  const source={storageKey:'flow:text-authoring:drafts:v1' as const,draftId:'original-update-draft',versionId:'original-update-version',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)};
  const native=createNativeCreatorDocumentOwner({id:DRAFT,source},NOW);assert(native.ok);
  const set=setProgramCreatorWorking(data,{actorId,expectedWorking:w,working:{...w,nativeDocument:native.owner,nativeSelection:source}},NOW);assert(set.ok);data=set.data;
  const before=JSON.stringify(data);assert.equal(inspectCreatorUpdate(data,DRAFT,NOW),null);assert.equal(applyCreatorUpdate(data,{actorId,preview,choices:Object.fromEntries(preview.rows.map(row=>[row.id,incoming]))}).ok,false);assert.equal(JSON.stringify(data),before);
});
function save(data:ProgramData,rawText:string){const actorId=data.activeActorId,w=data.spaces[actorId].creatorWorkspace,rev=w?.library.records[DRAFT]?.recordRevision;
  const set=setProgramCreatorWorking(data,{actorId,expectedWorking:w?.working??null,working:{draftId:DRAFT,title:'준비',rawText,baseRecordRevision:rev??null}},NOW);if(!set.ok)throw Error(set.reason);
  const result=applyProgramCreatorAction(set.data,{actorId,requestId:`save-${rev??0}`,action:{type:'save',draftId:DRAFT,title:'준비',rawText,sourceFingerprint:fp(rawText),expectedLibraryRevision:set.data.spaces[actorId].creatorWorkspace!.library.revision,...(rev?{expectedRecordRevision:rev}:{}),now:NOW}},NOW);if(!result.ok)throw Error(result.reason);return result.data;
}
function fixture(){let data=save(createProgramData(),SOURCE);const result=handoffProgramCreatorDraft(data,{actorId:data.activeActorId,requestId:'first',draftId:DRAFT,expectedRecordRevision:1,today:'2026-09-12'},NOW);if(!result.ok)throw Error(result.reason);return result.data;}
test('partial source adoption preserves private date/progress/memo/children and kept old series source',()=>{
  let data=fixture(),space=data.spaces[data.activeActorId],owner=space.creatorWorkspace!.executionSources![DRAFT],prior=structuredClone(owner.revisions[0]),taskId=prior.rows[0].documentLineId;
  space.text=M.updateTask(space.text,taskId,{date:'2026-09-22',note:'개인 메모'});space.text=M.recordProgress(space.text,taskId,'2026-09-12',40);
  data=save(data,SOURCE.replace('이전 설명','새 설명').replace('09:30','10:00'));
  const before=structuredClone(data),preview=inspectCreatorUpdate(data,DRAFT,NOW);assert(preview);
  const first=preview.rows.find(row=>row.title==='준비하기')!;const result=applyCreatorUpdate(data,{actorId:data.activeActorId,preview,choices:{[first.id]:incoming}});assert.equal(result.ok,true,result.ok?'':result.reason);if(!result.ok)return;
  const next=result.data.spaces[data.activeActorId],task=M.tasks(next.text).find(t=>t.id===taskId)!;
  assert.equal(task.date,'2026-09-22');assert.equal(task.note,'개인 메모');assert.deepEqual(next.text.progressRecords,before.spaces[data.activeActorId].text.progressRecords);assert.equal(task.subchecks.length,1);
  assert.deepEqual(next.creatorWorkspace!.executionSources![DRAFT].revisions[0],prior);
  const source=resolveProgramExecutionSource(next,prior.flow.ref);assert(source.ok);if(source.ok)assert.equal([...source.contexts.values()].find(c=>c.attributes.recurrence)?.attributes.time,'09:30');
  assert.equal(validateProgramData(result.data),true);assert.deepEqual(result.data.public,before.public);assert.deepEqual(data,before);
  const remaining=inspectCreatorUpdate(result.data,DRAFT,NOW);assert(remaining);const series=remaining.rows.find(r=>r.title==='걷기')!;
  const accepted=applyCreatorUpdate(result.data,{actorId:data.activeActorId,preview:remaining,choices:{[series.id]:incoming}});assert.equal(accepted.ok,true,accepted.ok?'':accepted.reason);if(accepted.ok){
    const source=resolveProgramExecutionSource(accepted.data.spaces[data.activeActorId],prior.flow.ref);assert(source.ok);if(source.ok)assert.equal([...source.contexts.values()].find(c=>c.attributes.recurrence)?.attributes.time,'10:00');
    assert.equal(accepted.data.spaces[data.activeActorId].creatorWorkspace!.executionSources![DRAFT].revisions.length,2);
  }
});
test('keep/cancel-equivalent no-op, stale snapshot and forged preview are atomic',()=>{
  let data=save(fixture(),SOURCE.replace('이전 설명','다른 설명'));const preview=inspectCreatorUpdate(data,DRAFT,NOW);assert(preview);const bytes=JSON.stringify(data);
  const kept=applyCreatorUpdate(data,{actorId:data.activeActorId,preview,choices:{}});assert(kept.ok);assert.equal(kept.changed,false);
  assert.equal(applyCreatorUpdate(data,{actorId:data.activeActorId,preview:structuredClone(preview),choices:{}}).ok,false);
  data.spaces[data.activeActorId].creatorWorkspace!.working!.title='외부 수정';assert.equal(applyCreatorUpdate(data,{actorId:data.activeActorId,preview,choices:{}}).ok,false);assert.notEqual(JSON.stringify(data),bytes);
});
test('canonical persisted source keys retain real occurrence/timezone reader contracts',()=>{
  const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const data=JSON.parse(JSON.stringify(canonical(fixture()))),space=data.spaces[data.activeActorId],owner=space.creatorWorkspace.executionSources[DRAFT],row=owner.revisions[0].rows[0];
  assert(validateProgramData(data));assert(programCreatorTaskSourceFacts(space,owner.documentId,row.documentLineId));
  const result=programRecurrencePeriodRows(data,{period:'week',date:'2026-09-14',today:'2026-09-12'});assert.equal(result.rows.length,3);assert.deepEqual(result.issues,[]);assert.equal(result.rows[0].timeZone,'Asia/Seoul');
});
test('explicit ordinary-to-series retains the native ordinary target and its past progress',()=>{
  let data=fixture(),space=data.spaces[data.activeActorId],owner=space.creatorWorkspace!.executionSources![DRAFT],id=owner.revisions[0].rows[0].documentLineId;
  space.text=M.recordProgress(space.text,id,'2026-09-12',25);const records=structuredClone(space.text.progressRecords);
  data=save(data,SOURCE.replace('  - 설명: 이전 설명','  - 설명: 이전 설명\n  - 반복: 매주 월\n  - 반복 종료: 2회'));
  const preview=inspectCreatorUpdate(data,DRAFT,NOW);assert(preview);const row=preview.rows.find(r=>r.title==='준비하기')!;
  const result=applyCreatorUpdate(data,{actorId:data.activeActorId,preview,choices:{[row.id]:incoming}});assert.equal(result.ok,true,result.ok?'':result.reason);if(!result.ok)return;
  const next=result.data.spaces[data.activeActorId],task=M.tasks(next.text).find(t=>t.id===id);assert(task);assert(next.archivedDocumentIds.includes(task.docId));assert.deepEqual(next.text.progressRecords,records);
  assert.equal(programRecurrencePeriodRows(result.data,{period:'week',date:'2026-09-14',today:'2026-09-12'}).issues.length,0);
});
test('source deletion is explicit retention, not loss of records or an implicit unchecked replacement',()=>{
  let data=fixture(),space=data.spaces[data.activeActorId],id=space.creatorWorkspace!.executionSources![DRAFT].revisions[0].rows[0].documentLineId;
  space.text=M.recordProgress(space.text,id,'2026-09-12',70);
  data=save(data,SOURCE.replace('- [ ] 준비하기\n  - 날짜: 2026-09-14\n  - 설명: 이전 설명\n  - [ ] 하위 확인\n',''));
  const preview=inspectCreatorUpdate(data,DRAFT,NOW);assert(preview);const row=preview.rows.find(r=>r.kind==='removed')!;
  const result=applyCreatorUpdate(data,{actorId:data.activeActorId,preview,choices:{[row.id]:incoming}});assert.equal(result.ok,true,result.ok?'':result.reason);if(!result.ok)return;
  const next=result.data.spaces[data.activeActorId];assert(M.tasks(next.text).some(t=>t.id===id));assert(next.text.progressRecords.some(r=>r.taskId===id&&r.percent===70));
});
test('explicit child acceptance archives private child IDs and attributes instead of inferring a match',()=>{
  let data=fixture(),space=data.spaces[data.activeActorId],owner=space.creatorWorkspace!.executionSources![DRAFT],id=owner.revisions[0].rows[0].documentLineId;
  const doc=M.getDocument(space.text,owner.documentId)!,child=doc.lines.find(line=>line.text.includes('[ ] 하위 확인'))!;
  child.text='  - [x] 개인 하위 확인';const oldChild=structuredClone(child);
  space.text=M.recordProgress(space.text,id,'2026-09-12',55);
  space.text=M.recordProgress(space.text,oldChild.id,'2026-09-11',100);const subrecords=structuredClone(space.text.progressRecords);
  data=save(data,SOURCE.replace('하위 확인','새 하위 확인'));
  const preview=inspectCreatorUpdate(data,DRAFT,NOW);assert(preview);const row=preview.rows.find(row=>row.title==='준비하기')!;
  const result=applyCreatorUpdate(data,{actorId:data.activeActorId,preview,choices:{[row.id]:{...incoming,children:'incoming'}}});assert(result.ok,result.ok?'':result.reason);if(!result.ok)return;
  const next=result.data.spaces[data.activeActorId],archived=next.text.documents.find(doc=>doc.lines.some(line=>line.id===oldChild.id));assert(archived);assert(next.archivedDocumentIds.includes(archived.id));
  assert.deepEqual(archived.lines.find(line=>line.id===oldChild.id),oldChild);assert(M.raw(M.getDocument(next.text,owner.documentId)).includes('새 하위 확인'));assert(next.text.progressRecords.some(record=>record.taskId===id&&record.percent===55));
  assert.deepEqual(next.text.progressRecords,subrecords);
});
test('mixed source facts identify the selected old revision and added source children are valid private targets',()=>{
  let data=fixture(),old=data.spaces[data.activeActorId].creatorWorkspace!.executionSources![DRAFT].revisions[0];
  data=save(data,SOURCE+'\n- [ ] 새 준비\n  - 날짜: 2026-09-21\n  - [ ] 새 하위');
  const preview=inspectCreatorUpdate(data,DRAFT,NOW);assert(preview);const added=preview.rows.find(row=>row.kind==='added')!;
  const result=applyCreatorUpdate(data,{actorId:data.activeActorId,preview,choices:{[added.id]:incoming}});assert(result.ok,result.ok?'':result.reason);if(!result.ok)return;
  const space=result.data.spaces[data.activeActorId],owner=space.creatorWorkspace!.executionSources![DRAFT];
  assert.equal(programCreatorTaskSourceFacts(space,owner.documentId,old.rows[0].documentLineId)?.sourceRevisionId,old.id);
  assert.equal(M.tasks(space.text).find(task=>task.title==='새 준비')?.subchecks.length,1);assert(validateProgramData(result.data));
});
test('series-to-ordinary acceptance retains original metadata and timezone while creating an ordinary target',()=>{
  let data=fixture(),before=data.spaces[data.activeActorId],owner=before.creatorWorkspace!.executionSources![DRAFT],series=owner.revisions[0].rows.find(row=>row.kind==='series')!;
  data=save(data,SOURCE.replace('\n  - 반복: 매일\n  - 반복 종료: 3회',''));
  const preview=inspectCreatorUpdate(data,DRAFT,NOW);assert(preview);const row=preview.rows.find(row=>row.title==='걷기')!;
  const result=applyCreatorUpdate(data,{actorId:data.activeActorId,preview,choices:{[row.id]:incoming}});assert(result.ok,result.ok?'':result.reason);if(!result.ok)return;
  const space=result.data.spaces[data.activeActorId],archived=space.text.documents.find(doc=>doc.lines.some(line=>line.id===series.documentLineId));assert(archived);assert(space.archivedDocumentIds.includes(archived.id));
  const task=M.tasks(space.text).find(task=>task.title==='걷기');assert(task);assert.equal(programCreatorTaskSourceFacts(space,task.docId,task.id)?.timeZone,'Asia/Seoul');assert.deepEqual(space.recurrenceExecution,before.recurrenceExecution);
  assert.equal(programRecurrencePeriodRows(result.data,{period:'week',date:'2026-09-14',today:'2026-09-12'}).rows.length,0);
});
test('controller canonical reload, quota/CAS zero-write, adoption and native execution Undo preserve unrelated documents',async()=>{
  let initial=fixture(),space=initial.spaces[initial.activeActorId];
  for(let index=0;index<19;index++){space.text=M.addDocument(space.text,{title:`무관 ${index}`,folderId:space.text.documents[0].folderId});const id=space.text.documents.at(-1)!.id;space.text=M.editText(space.text,id,`- [ ] 다른 작업 ${index}`);}
  const firstId=space.creatorWorkspace!.executionSources![DRAFT].revisions[0].rows[0].documentLineId;
  const linked=linkProgramTask(initial,{actorId:initial.activeActorId,requestId:'reference',expectedSpace:structuredClone(space),documentId:space.text.documents.at(-1)!.id,taskId:firstId});assert(linked.ok);initial=linked.data;
  initial=save(initial,SOURCE.replace('이전 설명','수용 설명'));const actorId=initial.activeActorId,unrelated=structuredClone(initial.spaces[actorId].text.documents.filter(doc=>doc.title.startsWith('무관'))),bindings=structuredClone(initial.spaces[actorId].text.bindings);
  const values=new Map([['flow:protected','FILLED ORIGINAL']]);let quota=false,writes=0;
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{assert.equal(key,PROGRAM_STATE_KEY);if(quota)throw Error('quota');writes++;values.set(key,value);},removeItem:()=>{throw Error('remove forbidden');}};
  const make=()=>{const c=createProgramController({storage,initialData:initial,exclusive:async work=>work()});assert(c.ok);return c;};let controller=make();
  const data=controller.snapshot().envelope.data,preview=inspectCreatorUpdate(data,DRAFT,NOW);assert(preview);const row=preview.rows.find(row=>row.title==='준비하기')!;
  const apply=(current:ProgramData)=>applyCreatorUpdate(current,{actorId,preview,choices:{[row.id]:incoming}});
  const baseline=values.get(PROGRAM_STATE_KEY),count=writes;quota=true;assert.equal((await controller.mutate('quota',apply,{actorId})).ok,false);assert.equal(writes,count);assert.equal(values.get(PROGRAM_STATE_KEY),baseline);quota=false;
  assert.equal((await controller.mutate('adopt',apply,{actorId})).ok,true);controller=make();const adopted=controller.snapshot().envelope.data;
  assert.deepEqual(adopted.spaces[actorId].text.documents.filter(doc=>doc.title.startsWith('무관')),unrelated);
  assert.deepEqual(adopted.spaces[actorId].text.bindings,bindings);
  const beforeStale=writes;assert.equal((await controller.mutate('stale',apply,{actorId})).ok,false);assert.equal(writes,beforeStale);
  const taskId=adopted.spaces[actorId].creatorWorkspace!.executionSources![DRAFT].revisions[0].rows[0].documentLineId;
  assert.equal((await controller.mutate('execution',current=>{const next=structuredClone(current);next.spaces[actorId].text=M.recordProgress(next.spaces[actorId].text,taskId,'2026-09-12',60);return programResult(current,next,taskId);},{actorId})).ok,true);
  assert.equal((await controller.undo(actorId)).ok,true);assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId],adopted.spaces[actorId]);
  assert.equal((await controller.undo(actorId)).ok,true);assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId].text.documents.filter(doc=>doc.title.startsWith('무관')),unrelated);assert.equal(values.get('flow:protected'),'FILLED ORIGINAL');
});
