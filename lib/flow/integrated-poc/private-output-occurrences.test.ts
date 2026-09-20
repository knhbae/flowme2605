import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData, validateProgramData } from './program-data';
import type { ProgramData, ProgramTransition } from './contract';
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft, fingerprintPersonalWorkspacePocAuthoringSource as fp } from './creator-workspace';
import { currentCreatorExecutionRevision } from './creator-execution-source';
import { inspectProgramPrivateOutput, makeProgramPrivateOutput } from './private-output';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from './recurrence-state';
import { textWorkspaceModel as M } from './text-workspace';
import { PRIVATE_OUTPUT_OCCURRENCES_V1 } from './private-output-occurrences';
import { prepareProgramRecurrencePlan, applyProgramRecurrencePlanTransition, readProgramPersonalRecurrences, updateProgramPersonalOccurrence } from './program-recurrence-plan-state';
import { readProgramRecurrencePlan, previewProgramRecurrencePlan } from './program-recurrence-plan';
import { programOutputReturnUrl } from './output-return';
import { parseProgramLocation } from './navigation';
import { readProgramOutputReturnTarget } from './output-return-target';

const actorId='local-user',now='2026-09-12T12:00:00.000Z',today='2026-09-12';
const seriesRaw='# 준비\n- [ ] 반복 준비\n  - 날짜: 2026-09-14\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 반복: 매주 월\n  - 반복 종료: 2026-10-30\n  - 자료: [확인 자료](https://example.com/resource)\n비공개 독립 메모';
const range={from:'2026-09-14',to:'2026-10-05',includeUndated:false};
function ok<T>(result:ProgramTransition<T>){if(!result.ok)assert.fail(result.reason);assert(validateProgramData(result.data));return result;}
function fixture(raw=seriesRaw){
  let data=ok(setProgramCreatorWorking(createProgramData(),{actorId,expectedWorking:null,working:{draftId:'output-creator',title:'출력 준비',rawText:raw,baseRecordRevision:null}},now)).data;
  data=ok(applyProgramCreatorAction(data,{actorId,requestId:'output-save',action:{type:'save',draftId:'output-creator',expectedLibraryRevision:0,rawText:raw,title:'출력 준비',sourceFingerprint:fp(raw),now}},now)).data;
  const handoff=ok(handoffProgramCreatorDraft(data,{actorId,requestId:'output-handoff',draftId:'output-creator',expectedRecordRevision:1,today},now));
  data=handoff.data;const owner=data.spaces[actorId].creatorWorkspace!.executionSources!['output-creator'];
  return{data,documentId:handoff.result,flowRef:currentCreatorExecutionRevision(owner).flow.ref};
}
function inspect(f:ReturnType<typeof fixture>,data:ProgramData=f.data){const result=inspectProgramPrivateOutput(data,{actorId,documentId:f.documentId,occurrenceRange:range});assert(result.ok,result.ok?'':result.reason);return result;}
function occurrence(f:ReturnType<typeof fixture>){const result=readProgramExecutionOccurrences(f.data,{actorId,flowRef:f.flowRef,localToday:today});assert(result.ok);return result.rows[0];}
function output(f:ReturnType<typeof fixture>,data=f.data,format:'txt'|'csv'|'ics'='txt',selected=inspect(f,data).rows.map(row=>row.id)){
  const result=makeProgramPrivateOutput(data,{actorId,documentId:f.documentId,occurrenceRange:range,mode:'tasks',selectedItemIds:selected,format},now);assert(result.ok,result.ok?'':result.reason);return result;
}

test('authored ordinary item keeps source date, timezone and resource independent of personal date in all formats',()=>{
  const f=fixture(seriesRaw.replace('  - 반복: 매주 월\n  - 반복 종료: 2026-10-30\n',''));
  const row=inspect(f).rows[0];assert.equal(row.kind,'task');assert.equal(row.sourceDate,'2026-09-14');assert.equal(row.timeZone,'Asia/Seoul');assert.equal(row.resourceUrl,'https://example.com/resource');
  f.data.spaces[actorId].text=M.updateTask(f.data.spaces[actorId].text,row.id,{date:'2026-09-25'});
  const before=JSON.stringify(f.data);
  for(const format of ['txt','csv','ics']as const){const payload=output(f,f.data,format).payload.replace(/\r\n[ \t]/g,'');assert.match(payload,/2026-09-14/);assert.match(payload,/Asia\/Seoul/);assert.match(payload,/https:\/\/example.com\/resource/);assert.doesNotMatch(payload,/비공개 독립 메모/);}
  assert.equal(inspect(f).rows[0].date,'2026-09-25');assert.equal(JSON.stringify(f.data),before);
});
test('repeat is not silently serialized as one task; explicit bounded range adds exact individually selected occurrences',()=>{
  const f=fixture(),before=JSON.stringify(f.data),plain=inspectProgramPrivateOutput(f.data,{actorId,documentId:f.documentId});assert(plain.ok);assert.equal(plain.rows.length,0);assert.equal(plain.hasRecurrences,true);
  const read=inspect(f);assert.equal(read.rows.length,4);assert(read.rows.every(row=>row.kind==='occurrence'));assert.equal(new Set(read.rows.map(row=>row.id)).size,4);
  const result=output(f,f.data,'ics',[read.rows[1].id]);assert.deepEqual(result.itemIds,[read.rows[1].id]);assert.equal((result.payload.match(/BEGIN:VEVENT/g)??[]).length,1);assert.match(result.payload,/DTSTART:20260921T003000Z/);
  assert.doesNotMatch(result.payload,/RRULE|DTSTART;TZID/);assert.equal(JSON.stringify(f.data),before);
  const target=read.rows[1].returnTarget;assert(target);const url=programOutputReturnUrl('http://127.0.0.1:3641/my?personalWorkspacePoc=v1',actorId,target);assert(url);
  const back=readProgramOutputReturnTarget(f.data,parseProgramLocation(new URL(url).hash),today);assert.equal(back.kind,'occurrence');if(back.kind==='occurrence')assert.equal(`occurrence:${back.row.key}`,read.rows[1].id);
});

test('selected output removes only exact duplicate source properties, preserving personal prose, link labels and raw',()=>{
  const raw=seriesRaw.replace('  - 반복: 매주 월\n  - 반복 종료: 2026-10-30\n','').replace('[확인 자료](https://example.com/resource)','https://example.com/resource')+'\n  - 낯선 속성: 그대로 보존';
  const f=fixture(raw),row=inspect(f).rows[0],before=JSON.stringify(f.data);
  for(const format of ['txt','csv','ics']as const){const payload=output(f,f.data,format).payload.replace(/\r\n[ \t]/g,'');assert.equal(payload.match(/Asia\/Seoul/g)?.length,1);assert.equal(payload.match(/https:\/\/example.com\/resource/g)?.length,1);}
  const exact=makeProgramPrivateOutput(f.data,{actorId,documentId:f.documentId,mode:'raw',format:'txt',selectedItemIds:[]},now);assert(exact.ok);assert.equal(exact.payload,M.raw(M.getDocument(f.data.spaces[actorId].text,f.documentId)));assert.match(exact.payload,/낯선 속성: 그대로 보존/);assert.equal(JSON.stringify(f.data),before);
  f.data.spaces[actorId].text=M.updateTask(f.data.spaces[actorId].text,row.id,{note:'- 시간대: Asia/Seoul\n- 자료: https://example.com/resource\n낯선 개인 문장'});
  assert.match(inspect(f).rows[0].note,/- 시간대: Asia\/Seoul/);assert.match(inspect(f).rows[0].note,/- 자료: https:\/\/example.com\/resource/);assert.match(output(f).payload,/낯선 개인 문장/);
  const labelled=fixture(raw.replace('https://example.com/resource','[꼭 읽을 자료](https://example.com/resource)'));
  assert.match(output(labelled).payload,/꼭 읽을 자료/);
});

test('personal series separates authored date, personal plan slot and moved or undated execution in TXT CSV ICS without changing UID or source',()=>{
  const f=fixture(),first=occurrence(f),prepared=prepareProgramRecurrencePlan(f.data,{actorId,flowRef:f.flowRef,sourceIdentity:first.identity,ownerId:'output-personal-plan',localToday:today,now});assert(prepared.ok);
  const initial=readProgramRecurrencePlan(prepared.value.owner,{start:first.originalDate,end:first.originalDate});assert(initial.ok);
  const preview=previewProgramRecurrencePlan(prepared.value.owner,{actorId,expected:prepared.value.owner,currentSource:prepared.value.owner.source,
    operation:{scope:'whole_series',targetDate:'2026-09-16',target:initial.value.targets[0],sourceCutover:first.identity,at:now}});assert(preview.ok);
  const changed=ok(applyProgramRecurrencePlanTransition(f.data,{actorId,...prepared.value,preview:preview.value,localToday:today})).data;
  const personal=readProgramPersonalRecurrences(changed,{actorId,ownerId:'output-personal-plan',localToday:today,range:{start:range.from,end:range.to}});assert(personal.ok);
  const selected=personal.value.rows[0],id=`occurrence:${selected.key}`,baseRow=inspect(f,changed).rows.find(row=>row.id===id)!;
  assert.equal(baseRow.sourceDate,'2026-09-14');assert.equal(baseRow.planDate,'2026-09-16');assert.equal(baseRow.date,'2026-09-16');
  const beforeIcs=output(f,changed,'ics',[id]).payload.replace(/\r\n[ \t]/g,'');
  const moved=ok(updateProgramPersonalOccurrence(changed,{actorId,ownerId:'output-personal-plan',expectedOwner:selected.personalPlan.expectedOwner,identity:selected.personalPlan.identity,
    changes:{schedule:{mode:'fixed_date',date:'2026-09-30'}},at:now,localToday:today})).data;
  const before=JSON.stringify(moved),source=JSON.stringify(moved.spaces[actorId].creatorWorkspace);
  for(const format of ['txt','csv','ics']as const){const payload=output(f,moved,format,[id]).payload.replace(/\r\n[ \t]/g,'');
    assert.match(payload,/원문 날짜: 2026-09-14/);assert.match(payload,/개인 계획 날짜: 2026-09-16/);assert.match(payload,/실행 날짜: 2026-09-30/);
    assert.doesNotMatch(payload,/원문 날짜: 2026-09-(16|30)/);assert.match(payload,/Asia\/Seoul/);assert.doesNotMatch(payload,/비공개 독립 메모|ownerId|sourceRevisionToken/);
    if(format==='ics'){assert.match(payload,/DTSTART:20260930T003000Z/);assert.equal(payload.match(/UID:(.+)/)?.[1],beforeIcs.match(/UID:(.+)/)?.[1]);}
  }
  assert.equal(JSON.stringify(moved),before);
  const undated=ok(updateProgramPersonalOccurrence(moved,{actorId,ownerId:'output-personal-plan',expectedOwner:moved.spaces[actorId].recurrencePlans!.owners['output-personal-plan'],identity:selected.personalPlan.identity,
    changes:{schedule:{mode:'unscheduled',date:null}},at:now,localToday:today})).data;
  const result=makeProgramPrivateOutput(undated,{actorId,documentId:f.documentId,occurrenceRange:{...range,includeUndated:true},mode:'tasks',selectedItemIds:[id],format:'txt'},now);assert(result.ok);
  assert.match(result.payload,/실행 날짜: 미정/);assert.match(result.payload,/개인 계획 날짜: 2026-09-16/);assert.match(result.payload,/원문 날짜: 2026-09-14/);
  assert.equal(JSON.stringify(undated.spaces[actorId].creatorWorkspace),source);
});

test('later original-rule occurrence retains source authored date separately from its planned slot',()=>{
  const f=fixture(),row=inspect(f).rows[1];assert.equal(row.sourceDate,'2026-09-14');assert.equal(row.planDate,'2026-09-21');assert.equal(row.date,'2026-09-21');
});
test('moved occurrence retains UID, original date and completedAt without modifying source',()=>{
  const f=fixture(),row=occurrence(f),source=JSON.stringify(f.data.spaces[actorId].creatorWorkspace),original=output(f,f.data,'ics',[`occurrence:${row.key}`]);
  const changed=ok(updateProgramOccurrenceExecution(f.data,{actorId,flowRef:f.flowRef,localToday:today,identity:row.identity,expected:null,changes:{schedule:{mode:'fixed_date',date:'2026-09-30'},completion:{status:'completed',completedAt:now}}})).data;
  const moved=output(f,changed,'ics',[`occurrence:${row.key}`]);const unfold=(text:string)=>text.replace(/\r\n[ \t]/g,'');assert.equal(unfold(original.payload).match(/UID:(.+)/)?.[1],unfold(moved.payload).match(/UID:(.+)/)?.[1]);
  assert.match(moved.payload,/DTSTART:20260930T003000Z/);assert.match(unfold(moved.payload),/진행: 100%/);assert.match(unfold(moved.payload),/2026-09-14/);assert.match(unfold(moved.payload),/완료 시각:/);assert.equal(JSON.stringify(changed.spaces[actorId].creatorWorkspace),source);
});
test('held and excluded occurrences cannot be exported with a stale selection',()=>{
  for(const participation of ['held','excluded']as const){const f=fixture(),row=occurrence(f);const changed=ok(updateProgramOccurrenceExecution(f.data,{actorId,flowRef:f.flowRef,localToday:today,identity:row.identity,expected:null,changes:{participation}})).data;
    assert(!inspect(f,changed).rows.some(output=>output.id===`occurrence:${row.key}`));const before=JSON.stringify(changed);
    assert.equal(makeProgramPrivateOutput(changed,{actorId,documentId:f.documentId,occurrenceRange:range,mode:'tasks',selectedItemIds:[`occurrence:${row.key}`],format:'ics'},now).ok,false);assert.equal(JSON.stringify(changed),before);
  }
});
test('undated occurrences require explicit inclusion and stay excluded from ICS with count',()=>{
  const f=fixture(),row=occurrence(f);const data=ok(updateProgramOccurrenceExecution(f.data,{actorId,flowRef:f.flowRef,localToday:today,identity:row.identity,expected:null,changes:{schedule:{mode:'unscheduled',date:null}}})).data;
  assert(!inspect(f,data).rows.some(output=>output.id===`occurrence:${row.key}`));
  const withUndated={...range,includeUndated:true};const read=inspectProgramPrivateOutput(data,{actorId,documentId:f.documentId,occurrenceRange:withUndated});assert(read.ok);assert.equal(read.rows.length,4);
  const result=makeProgramPrivateOutput(data,{actorId,documentId:f.documentId,occurrenceRange:withUndated,mode:'tasks',selectedItemIds:read.rows.map(row=>row.id),format:'ics'},now);assert(result.ok);assert.equal(result.itemIds.length,3);assert.deepEqual(result.undatedItemIds,[`occurrence:${row.key}`]);
});
test('invalid/excessive range is no-write; raw source remains available independently of range',()=>{
  const f=fixture(),before=JSON.stringify(f.data);assert.equal(PRIVATE_OUTPUT_OCCURRENCES_V1.maxRangeDays,366);
  for(const invalid of [{...range,from:'2026-02-30'},{...range,to:'2026-09-01'},{...range,to:'2028-01-01'}]){
    const result=makeProgramPrivateOutput(f.data,{actorId,documentId:f.documentId,occurrenceRange:invalid,mode:'tasks',selectedItemIds:[],format:'txt'},now);assert.equal(result.ok,false);
    const raw=makeProgramPrivateOutput(f.data,{actorId,documentId:f.documentId,occurrenceRange:invalid,mode:'raw',selectedItemIds:[],format:'txt'},now);assert(raw.ok);assert.equal(raw.payload,M.raw(M.getDocument(f.data.spaces[actorId].text,f.documentId)));
  }assert.equal(JSON.stringify(f.data),before);
});

test('folder references include creator series without inventing checkbox ownership',()=>{
  const f=fixture(),space=f.data.spaces[actorId],source=M.getDocument(space.text,f.documentId)!;
  space.text=M.addDocument(space.text,{title:'연결 실행 문서'});
  const linked=space.text.documents.at(-1)!;
  space.text=M.attachScope(space.text,linked.id,0,source.folderId);
  assert(validateProgramData(f.data));
  const before=JSON.stringify(f.data),direct=inspect(f);
  const plain=inspectProgramPrivateOutput(f.data,{actorId,documentId:linked.id});assert(plain.ok);assert(plain.hasRecurrences);
  const result=inspectProgramPrivateOutput(f.data,{actorId,documentId:linked.id,occurrenceRange:range});assert(result.ok);
  assert.deepEqual(result.rows.map(row=>row.id),direct.rows.map(row=>row.id));assert.equal(result.rows.length,4);
  assert.equal(JSON.stringify(f.data),before);
});

test('ancestor and duplicate scope references deduplicate series and respect archive and trash',()=>{
  const f=fixture(),space=f.data.spaces[actorId];
  space.text.folders.push({id:'output-parent',title:'상위',parentId:null},{id:'output-child',title:'하위',parentId:'output-parent'});
  Object.assign(M.getDocument(space.text,f.documentId)!,{folderId:'output-child',folder:'하위'});
  space.text=M.addDocument(space.text,{title:'중복 연결'});const linked=space.text.documents.at(-1)!;
  space.text=M.attachScope(space.text,linked.id,0,'output-parent');
  space.text=M.attachScope(space.text,linked.id,M.getDocument(space.text,linked.id)!.lines.length,'output-child');
  assert(validateProgramData(f.data));
  const read=()=>{const result=inspectProgramPrivateOutput(f.data,{actorId,documentId:linked.id,occurrenceRange:range});assert(result.ok);return result;};
  assert.equal(read().rows.length,4);assert.equal(new Set(read().rows.map(row=>row.id)).size,4);
  space.archivedDocumentIds.push(f.documentId);assert.equal(read().rows.length,0);assert.equal(read().hasRecurrences,false);
  space.documentTrash={[f.documentId]:{trashedAt:now,wasArchived:true}};assert(validateProgramData(f.data));assert.equal(read().rows.length,0);
  delete space.documentTrash[f.documentId];space.archivedDocumentIds=[];assert.equal(read().rows.length,4);
});

test('ordinary task owner does not change merely because its document moved folders',()=>{
  const f=fixture(seriesRaw.replace('  - 반복: 매주 월\n  - 반복 종료: 2026-10-30\n','')),space=f.data.spaces[actorId];
  const original=inspect(f).rows[0],owner=space.text.taskScopes[original.id];
  space.text.folders.push({id:'output-destination',title:'문서 위치',parentId:null});
  Object.assign(M.getDocument(space.text,f.documentId)!,{folderId:'output-destination',folder:'문서 위치'});
  space.text=M.addDocument(space.text,{title:'소속 연결'});const linked=space.text.documents.at(-1)!;
  space.text=M.attachScope(space.text,linked.id,0,owner);assert(validateProgramData(f.data));
  const read=inspectProgramPrivateOutput(f.data,{actorId,documentId:linked.id});assert(read.ok);assert.deepEqual(read.rows.map(row=>row.id),[original.id]);
  space.text=M.unlink(space.text,linked.id,space.text.bindings.find(binding=>binding.docId===linked.id)!.lineId);
  space.text=M.attachScope(space.text,linked.id,0,'output-destination');
  const different=inspectProgramPrivateOutput(f.data,{actorId,documentId:linked.id});assert(different.ok);assert.equal(different.rows.length,0);
});
