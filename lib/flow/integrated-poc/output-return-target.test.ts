import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramData, validateProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { inspectProgramPrivateOutput } from './private-output';
import { readProgramOutputReturnTarget } from './output-return-target';
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft, fingerprintPersonalWorkspacePocAuthoringSource as fp } from './creator-workspace';
import { currentCreatorExecutionRevision } from './creator-execution-source';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution, programOccurrenceWindowFor } from './recurrence-state';
import { prepareProgramRecurrencePlan, applyProgramRecurrencePlanTransition, readProgramPersonalRecurrences, updateProgramPersonalOccurrence } from './program-recurrence-plan-state';
import { readProgramRecurrencePlan, previewProgramRecurrencePlan } from './program-recurrence-plan';
import { programOccurrenceTargetKey } from './recurrence-order';
import type { ProgramData, ProgramTransition } from './contract';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { hydrateProgramLegacy } from './legacy-projection';
const actorId='local-user',today='2026-09-12',now='2026-09-12T12:00:00.000Z';
const ok=<T,>(r:ProgramTransition<T>)=>{if(!r.ok)assert.fail(r.reason);assert(validateProgramData(r.data));return r;};
function fixture(){
  const raw='# 준비\n- [ ] 반복 준비\n  - 날짜: 2026-09-14\n  - 반복: 매주 월\n  - 반복 종료: 2027-09-30\n  - 시간: 09:30\n  - 시간대: Asia/Seoul';
  let data=ok(setProgramCreatorWorking(createProgramData(),{actorId,expectedWorking:null,working:{draftId:'return-creator',title:'복귀 원문',rawText:raw,baseRecordRevision:null}},now)).data;
  data=ok(applyProgramCreatorAction(data,{actorId,requestId:'return-save',action:{type:'save',draftId:'return-creator',expectedLibraryRevision:0,rawText:raw,title:'복귀 원문',sourceFingerprint:fp(raw),now}},now)).data;
  const h=ok(handoffProgramCreatorDraft(data,{actorId,requestId:'return-handoff',draftId:'return-creator',expectedRecordRevision:1,today},now));data=h.data;
  const owner=data.spaces[actorId].creatorWorkspace!.executionSources!['return-creator'];
  return{data,documentId:h.result,flowRef:currentCreatorExecutionRevision(owner).flow.ref};
}
const destination=(documentId:string,executionKey:string)=>({view:'space' as const,id:documentId,returnActorId:actorId,executionKey});
test('ordinary exact canonical line, foreign actor non disclosure, moved/archive/restore and missing no writes',()=>{
  const data=createProgramData(),s=data.spaces[actorId];s.text=M.addDocument(s.text,{title:'PRIVATE_TITLE'});const id=s.text.documents[0].id;s.text=M.editText(s.text,id,'- [ ] PRIVATE_TASK');
  const inspect=inspectProgramPrivateOutput(data,{actorId,documentId:id});assert(inspect.ok);const target=inspect.rows[0].returnTarget!;
  const d=destination(target.documentId,target.executionKey),before=JSON.stringify(data);assert.equal(readProgramOutputReturnTarget(data,d,today).kind,'task');
  assert(!JSON.stringify(readProgramOutputReturnTarget(data,{...d,returnActorId:'creator-minji'},today)).includes('PRIVATE'));
  assert.equal(readProgramOutputReturnTarget(data,{...d,id:'missing'},today).kind,'unavailable');assert.equal(JSON.stringify(data),before);
  s.archivedDocumentIds.push(id);const archived=readProgramOutputReturnTarget(data,d,today);assert.equal(archived.kind,'unavailable');assert.match(JSON.stringify(archived),/보관/);
  s.archivedDocumentIds=[];assert.equal(readProgramOutputReturnTarget(data,d,today).kind,'task');
  s.text=M.addDocument(s.text,{title:'새 위치'});const next=s.text.documents.at(-1)!;next.lines.push(...s.text.documents[0].lines);s.text.documents[0].lines=[];
  const moved=readProgramOutputReturnTarget(data,d,today);assert.equal(moved.kind,'unavailable');assert.equal(moved.documentId,next.id);assert.match(JSON.stringify(moved),/이동/);
});
test('genuine creator occurrence past default page resolves exact key, moved/undated and held do not select first',()=>{
  const f=fixture();const read=readProgramExecutionOccurrences(f.data,{actorId,flowRef:f.flowRef,localToday:today,window:{finiteOffset:35,finiteLimit:1}});assert(read.ok);const row=read.rows[0];assert(row.occurrenceIndex>30);
  const d=destination(f.documentId,programOccurrenceTargetKey(row)),before=JSON.stringify(f.data),found=readProgramOutputReturnTarget(f.data,d,today);assert.equal(found.kind,'occurrence');if(found.kind==='occurrence')assert.equal(found.row.key,row.key);assert.equal(JSON.stringify(f.data),before);
  let changed=ok(updateProgramOccurrenceExecution(f.data,{actorId,flowRef:f.flowRef,localToday:today,window:programOccurrenceWindowFor(row.identity),identity:row.identity,expected:null,changes:{schedule:{mode:'fixed_date',date:'2028-02-03'}}})).data;
  const moved=readProgramOutputReturnTarget(changed,d,today);assert.equal(moved.kind,'occurrence');if(moved.kind==='occurrence')assert.equal(moved.row.executionDate,'2028-02-03');
  changed=ok(updateProgramOccurrenceExecution(changed,{actorId,flowRef:f.flowRef,localToday:today,window:programOccurrenceWindowFor(row.identity),identity:row.identity,expected:changed.spaces[actorId].recurrenceExecution!.entries[row.key],changes:{schedule:{mode:'unscheduled',date:null}}})).data;
  const undated=readProgramOutputReturnTarget(changed,d,today);assert.equal(undated.kind,'occurrence');if(undated.kind==='occurrence')assert.equal(undated.row.executionDate,null);
  changed=ok(updateProgramOccurrenceExecution(changed,{actorId,flowRef:f.flowRef,localToday:today,window:programOccurrenceWindowFor(row.identity),identity:row.identity,expected:changed.spaces[actorId].recurrenceExecution!.entries[row.key],changes:{participation:'held'}})).data;
  assert.equal(readProgramOutputReturnTarget(changed,d,today).kind,'unavailable');
  const missingTuple=JSON.parse(d.executionKey);missingTuple[2]='missing-owner';
  assert.equal(readProgramOutputReturnTarget(f.data,destination(f.documentId,JSON.stringify(missingTuple)),today).kind,'unavailable');
});
test('personal revision target survives execution date change and null without becoming source occurrence',()=>{
  const f=fixture(),r=readProgramExecutionOccurrences(f.data,{actorId,flowRef:f.flowRef,localToday:today});assert(r.ok);const first=r.rows[0];
  const p=prepareProgramRecurrencePlan(f.data,{actorId,flowRef:f.flowRef,sourceIdentity:first.identity,ownerId:'return-plan',localToday:today,now});assert(p.ok);
  const initial=readProgramRecurrencePlan(p.value.owner,{start:first.originalDate,end:first.originalDate});assert(initial.ok);
  const preview=previewProgramRecurrencePlan(p.value.owner,{actorId,expected:p.value.owner,currentSource:p.value.owner.source,operation:{scope:'whole_series',targetDate:'2026-09-20',target:initial.value.targets[0],sourceCutover:first.identity,at:now}});assert(preview.ok);
  let data:ProgramData=ok(applyProgramRecurrencePlanTransition(f.data,{actorId,...p.value,preview:preview.value,localToday:today})).data;
  const read=readProgramPersonalRecurrences(data,{actorId,ownerId:'return-plan',localToday:today,range:{start:'2026-09-20',end:'2026-09-20'}});assert(read.ok);const row=read.value.rows[0],d=destination(f.documentId,programOccurrenceTargetKey(row));
  for(const date of ['2028-02-03',null]){data=ok(updateProgramPersonalOccurrence(data,{actorId,ownerId:'return-plan',expectedOwner:data.spaces[actorId].recurrencePlans!.owners['return-plan'],identity:row.personalPlan.identity,changes:{schedule:date?{mode:'fixed_date',date}:{mode:'unscheduled',date:null}},at:now,localToday:today})).data;
    const before=JSON.stringify(data),found=readProgramOutputReturnTarget(data,d,today);assert.equal(found.kind,'occurrence');if(found.kind==='occurrence'){assert.equal(found.row.key,row.key);assert.equal(found.row.executionDate,date);}assert.equal(JSON.stringify(data),before);}
});
test('real legacy open-ended source resolves far exact slot and rejects foreign workspace; archive never opens execution',()=>{
  const made=materializePersonalWorkspacePocAuthoring({handoffId:'return-legacy',documentId:'return-doc',revisionId:'return-v1',committedAt:now,rawText:'# 계속할 일\n- [ ] 매일 확인\n  - 날짜: 2026-09-03\n  - 반복: 매일'});assert(made.ok);
  const data=ok(hydrateProgramLegacy(createProgramData(),{version:1,flows:[made.flow]},createPersonalWorkspacePocState(now),{actorId,preserveUnsupported:true})).data;
  const binding=data.spaces[actorId].savedBindings.find(binding=>binding.flowRef===made.flow.ref)!;assert(binding);
  const r=readProgramExecutionOccurrences(data,{actorId,flowRef:made.flow.ref,localToday:today,window:{windowOffsetWeeks:12,windowWeeks:1}});assert(r.ok);
  const row=r.rows[4],d=destination(binding.documentId,programOccurrenceTargetKey(row)),before=JSON.stringify(data),found=readProgramOutputReturnTarget(data,d,today);
  assert.equal(found.kind,'occurrence');if(found.kind==='occurrence')assert.equal(found.row.key,row.key);assert.equal(JSON.stringify(data),before);
  const wrong=JSON.parse(d.executionKey);wrong[1]='foreign-workspace';assert.equal(readProgramOutputReturnTarget(data,{...d,executionKey:JSON.stringify(wrong)},today).kind,'unavailable');
  data.spaces[actorId].archivedDocumentIds.push(binding.documentId);const archived=readProgramOutputReturnTarget(data,d,today);assert.equal(archived.kind,'unavailable');assert.match(JSON.stringify(archived),/보관/);
});
