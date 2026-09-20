import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyTextWorkspace,textWorkspaceModel as M,type TextWorkspaceState} from './text-workspace';
import {createProgramData} from './program-data';
import {createProgramController,programSame} from './controller';
import {PROGRAM_STATE_KEY,programResult,programFailure} from './contract';

const RAW='# 선택 수용 QA\n## 준비\n- [ ] 수용 준비\n  - 날짜: 2026-09-14\n  - 설명: 이전 설명\n  - [ ] 이전 하위\n반복 규칙: 반복 걷기\n  - 날짜: 2026-09-14\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 반복: 매일\n  - 반복 종료: 3회';
function fixture(raw=RAW){let state=M.addDocument(createEmptyTextWorkspace(),{title:'명시 날짜'});const id=state.documents[0].id;state=M.editText(state,id,raw);assert.equal(M.raw(state.documents[0]),raw);return{state,id};}
const items=(state:TextWorkspaceState,id:string)=>M.parseDocument(M.getDocument(state,id)!,state).items;
test('actual 13:09 Creator capture: parent date text changes inherited child without inserting an old-date pin',()=>{
  let{state,id}=fixture();const parent=items(state,id)[0],child=items(state,id)[1];state=M.recordProgress(state,parent.id,'2026-09-11',30);state=M.recordProgress(state,child.id,'2026-09-11',100);
  const before=structuredClone(state),raw=M.raw(state.documents[0]).replace('2026-09-14','2026-09-22'),next=M.editText(state,id,raw);
  assert.equal(M.raw(next.documents[0]),raw);assert.equal(items(next,id)[1].date,'2026-09-22');assert.deepEqual(next.progressRecords,before.progressRecords);assert.deepEqual(next.documents[0].lines.map(line=>line.id),state.documents[0].lines.map(line=>line.id));assert.deepEqual(state,before);
});
test('compound source input keeps date intention, numeric semantics, memo and child identity',()=>{
  const{state,id}=fixture(),ids=items(state,id).map(item=>item.id),raw=RAW.replace('[ ] 수용 준비','[40%] 수용 준비').replace('2026-09-14','2026-09-22').replace('  - 설명: 이전 설명','  - 메모: PRIVATE\n  - 설명: 이전 설명').replace('[ ] 이전 하위','[x] 개인 완료 하위');
  const next=M.editText(state,id,raw,{progressDate:'2026-09-12'});assert.equal(M.raw(next.documents[0]),raw);assert.deepEqual(items(next,id).map(item=>item.id),ids);assert.equal(items(next,id)[1].date,'2026-09-22');assert.equal(M.latestProgress(next,ids[0])?.percent,40);
  assert.equal(M.editText(next,id,raw,{progressDate:'2026-09-12'}),next);
});
test('explicit descendant date stays fixed; grandchild inherits only its immediate unchanged source lineage',()=>{
  const raw='- [ ] 부모\n  - 날짜: 2026-09-14\n  - [ ] 자식\n    - [ ] 손자\n  - [ ] 고정 자식\n    - 날짜: 2026-09-18\n    - [ ] 고정 손자';
  const{state,id}=fixture(raw),input=raw.replace('2026-09-14','2026-09-22'),next=M.editText(state,id,input);assert.equal(M.raw(next.documents[0]),input);
  assert.deepEqual(items(next,id).map(item=>item.date),['2026-09-22','2026-09-22','2026-09-22','2026-09-18','2026-09-18']);
});
test('removing explicit parent date restores section inheritance; explicit undated and child property edits are intentional',()=>{
  const raw='[2026-09-10]\n- [ ] 부모\n  - 날짜: 2026-09-14\n  - [ ] 자식\n    - [ ] 손자';const{state,id}=fixture(raw);
  for(const input of [raw.replace('  - 날짜: 2026-09-14\n',''),raw.replace('2026-09-14','미정'),raw.replace('  - [ ] 자식','  - [ ] 자식\n    - 날짜: 2026-09-25')]){const next=M.editText(state,id,input);assert.equal(M.raw(next.documents[0]),input);assert(M.validate(next));}
});
test('actual hierarchy movement still pins dates rather than treating movement as parent date input',()=>{
  const raw='- [ ] 부모\n  - 날짜: 2026-09-14\n  - [ ] 옮길 자식\n- [ ] 다른 부모\n  - 날짜: 2026-09-20';const{state,id}=fixture(raw),child=items(state,id).find(item=>item.title==='옮길 자식')!;
  const input='- [ ] 부모\n  - 날짜: 2026-09-22\n- [ ] 다른 부모\n  - 날짜: 2026-09-20\n  - [ ] 옮길 자식';const next=M.editText(state,id,input);assert(M.validate(next));const moved=items(next,id).find(item=>item.id===child.id);assert(moved);assert.equal(moved.date,'2026-09-14');
});
test('date property edit uses normal controller atomic persistence, stale CAS and quota protections',async()=>{
  const initial=createProgramData(),actorId=initial.activeActorId,{state,id}=fixture();initial.spaces[actorId].text=state;
  const values=new Map([['flow:protected','unchanged']]);let quota=false,writes=0;
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{assert.equal(key,PROGRAM_STATE_KEY);if(quota)throw Error('quota');writes++;values.set(key,value);},removeItem:()=>{throw Error('remove');}};
  const controller=createProgramController({storage,initialData:initial,exclusive:async work=>work()});assert(controller.ok);
  const expected=structuredClone(controller.snapshot().envelope.data.spaces[actorId]),raw=RAW.replace('2026-09-14','2026-09-22');
  const edit=(data:typeof initial)=>{if(!programSame(data.spaces[actorId],expected))return programFailure(data,'conflict');const next=structuredClone(data);next.spaces[actorId].text=M.editText(next.spaces[actorId].text,id,raw);return programResult(data,next,id);};
  const before=values.get(PROGRAM_STATE_KEY),count=writes;quota=true;assert.equal((await controller.mutate('date quota',edit,{actorId})).ok,false);assert.equal(writes,count);assert.equal(values.get(PROGRAM_STATE_KEY),before);quota=false;
  assert.equal((await controller.mutate('date apply',edit,{actorId})).ok,true);const persisted=writes;assert.equal((await controller.mutate('date stale',edit,{actorId})).ok,false);assert.equal(writes,persisted);
  assert.equal((await controller.undo(actorId)).ok,true);assert.equal(M.raw(controller.snapshot().envelope.data.spaces[actorId].text.documents[0]),RAW);assert.equal(values.get('flow:protected'),'unchanged');
});
