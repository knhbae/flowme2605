import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData, validateProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { readProgramLegacySourceMapping, transitionProgramLegacySourcePayload } from './legacy-source-lifecycle';
import { inspectProgramLegacySnapshotPayload } from './legacy-snapshot';
import { applyProgramLegacySourceAction, applyProgramLegacyAction, prepareProgramLegacyView } from './legacy-transaction';
import { textWorkspaceModel as M } from './text-workspace';
import { programLegacyTaskQualityHold, programPreservesLegacyQualityHold } from './legacy-map-review';
import { createProgramController } from './controller';
import { createProgramLegacyPort } from './legacy-port';
import { PROGRAM_STATE_KEY } from './contract';
import { programExecutionTasks } from './execution';
import { programLegacySourceChanges } from './legacy-source-lifecycle-contract';
import { readProgramLegacySourceLifecycle, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { updateProgramTask, recordProgramTaskProgress } from './private-space';

const now='2026-09-12T13:00:00.000Z', actorId='local-user';
function fixture(archive=false) {
 const made=materializePersonalWorkspacePocAuthoring({handoffId:'partial',documentId:'partial-doc',revisionId:'v1',rawText:'# 행 연결\n- [ ] 같은 제목\n  - 시간: 10:00\n- [ ] 같은 제목\n  - 시간: 14:00\n- [ ] 원문에만 둘 행\n',committedAt:now});assert.ok(made.ok);
 const {source:_s,parsedItems:_p,sourceLineItemIdentityMap:_m,fidelityManifest:_f,...authoring}=made.flow.authoring;
 const old={...made.flow,authoring,items:made.flow.items.slice(0,2)},state=createPersonalWorkspacePocState(now);state.authoredFlows=[old];state.authoringReceipts=[{handoffId:authoring.handoffId,flowRef:old.ref,committedAt:now}];
 const payload={model:{version:1 as const,flows:[]},state};assert.ok(inspectProgramLegacySnapshotPayload(payload).ok);
 const mapping=readProgramLegacySourceMapping(payload,old.ref,{partial:true});assert.ok(mapping.ok);
 const hydrated=hydrateProgramLegacy(createProgramData(),payload.model,state,{actorId,preserveUnsupported:true});assert.ok(hydrated.ok);
 const action={type:'map-partial-items' as const,flowRef:old.ref,requestId:'explicit-partial',expectedSourceToken:mapping.sourceToken,now,
 rowChoices:{[made.flow.items[0].ref]:{kind:'existing' as const,itemRef:old.items[1].ref},[made.flow.items[1].ref]:{kind:'new' as const},[made.flow.items[2].ref]:{kind:'source-only' as const}},
 unmatchedItems:{[old.items[0].ref]:archive?'archive-execution' as const:'keep-personal' as const}};
 return{payload,action,data:hydrated.data,old};
}
test('PM01 mismatched source has explicit existing/new/source-only and preserved old item, no guessed mapping',()=>{
 const f=fixture(),before=JSON.stringify(f.payload);assert.equal(readProgramLegacySourceMapping(f.payload,f.old.ref).ok,false);
 const result=transitionProgramLegacySourcePayload(f.payload,f.action);assert.ok(result.ok,JSON.stringify(result));const checked=inspectProgramLegacySnapshotPayload(result.payload);assert.ok(checked.ok);
 assert.equal(checked.model.flows[0].items.length,3);assert.equal(checked.sourceContextByFlow.get(f.old.ref)!.get(f.old.items[1].ref)!.attributes.time,'10:00');assert.equal(checked.sourceContextByFlow.get(f.old.ref)!.has(f.old.items[0].ref),false);
 assert.equal(JSON.stringify(f.payload),before);assert.deepEqual(result.payload.state,f.payload.state);assert.ok(inspectProgramLegacySnapshotPayload(JSON.parse(JSON.stringify(result.payload))).ok);
});
test('PM02 choices must cover exact rows and unmatched old IDs; duplicates/stale/foreign fail closed',()=>{
 const f=fixture();for(const action of [{...f.action,rowChoices:{}},{...f.action,unmatchedItems:{}},{...f.action,expectedSourceToken:'stale'},{...f.action,rowChoices:{...f.action.rowChoices,foreign:{kind:'new' as const}}}]){const r=transitionProgramLegacySourcePayload(f.payload,action);assert.equal(r.ok,false);assert.equal(r.payload,f.payload);}
});
test('PM03 one transaction keeps private records and archived exact item blocks while other item edits remain allowed',()=>{
 const f=fixture(true),space=f.data.spaces[actorId],binding=space.savedBindings[0],id=binding.itemLines[f.old.items[0].ref];
 space.text=M.updateTask(space.text,id,{title:'보존할 개인 제목',note:'개인 메모',date:'2026-10-01'});space.text=M.recordProgress(space.text,id,'2026-09-12',55);
 const view=prepareProgramLegacyView(f.data,{actorId,now,onlyFlowRef:f.old.ref});assert.ok(view.ok,JSON.stringify(view));
 const result=applyProgramLegacySourceAction(f.data,{actorId,expectedToken:view.token,action:f.action});assert.ok(result.transition.ok,JSON.stringify({issues:result.issues,conflicts:result.conflicts}));
 const next=result.transition.data.spaces[actorId],task=M.tasks(next.text).find(t=>t.id===id)!;assert.equal(task.note,'개인 메모');assert.equal(M.latestProgress(next.text,id)?.percent,55);assert.ok(programLegacyTaskQualityHold(next,id));
 assert.equal(programPreservesLegacyQualityHold(next,M.updateTask(next.text,id,{title:'보관항목 우회수정'})),false);
 assert.equal(programPreservesLegacyQualityHold(next,M.recordProgress(next.text,id,'2026-09-13',100)),false);
 const other=next.savedBindings[0].itemLines[f.old.items[1].ref];assert.equal(programPreservesLegacyQualityHold(next,M.updateTask(next.text,other,{note:'다른 항목 메모'})),true);assert.ok(validateProgramData(result.transition.data));
 assert.equal(programExecutionTasks(next,{period:'all'}).some(t=>t.id===id),false);
 const linked=M.addDocument(next.text,{title:'보관 항목 참조'}),linkedId=linked.documents.at(-1)!.id,reference=M.linkTask(linked,linkedId,0,id);
 assert.equal(programPreservesLegacyQualityHold({...next,text:reference},M.recordProgress(reference,id,'2026-09-13',100)),false);
 const fresh=prepareProgramLegacyView(result.transition.data,{actorId,now,onlyFlowRef:f.old.ref});assert.ok(fresh.ok);
 const denied=applyProgramLegacyAction(result.transition.data,{actorId,expectedToken:fresh.token,now,executionDate:'2026-09-13',action:{type:'complete',itemRef:f.old.items[0].ref,completed:true,now}});assert.equal(denied.transition.ok,false);assert.equal(denied.transition.data,result.transition.data);
 assert.equal(updateProgramTask(result.transition.data,{actorId,requestId:'archive-edit',expectedSpace:next,taskId:id,patch:{title:'우회'}}).ok,false);
 assert.equal(recordProgramTaskProgress(result.transition.data,{actorId,requestId:'archive-progress',expectedSpace:next,taskId:id,date:'2026-09-13',percent:100}).ok,false);
});
test('PM04 controller quota/CAS/reload/Undo preserve 19 unrelated Flows and all original namespaces',async()=>{
 const f=fixture(true);let data=f.data;
 // Start with the real parser/materializer and ordinary canonical serialization,
 // not a reduced one-document surrogate.
 const state=structuredClone(f.payload.state);
 for(let i=0;i<19;i++){const made=materializePersonalWorkspacePocAuthoring({handoffId:`unrelated-${i}`,documentId:`unrelated-doc-${i}`,revisionId:'v1',rawText:`# 무관한 계획 ${i}\n- [ ] 기록 유지 ${i}\n`,committedAt:now});assert.ok(made.ok);state.authoredFlows!.push(made.flow);state.authoringReceipts!.push({handoffId:made.flow.authoring.handoffId,flowRef:made.flow.ref,committedAt:now});}
 const h=hydrateProgramLegacy(createProgramData(),f.payload.model,state,{actorId,preserveUnsupported:true});assert.ok(h.ok);data=h.data;
 const id=data.spaces[actorId].savedBindings.find(b=>b.flowRef===f.old.ref)!.itemLines[f.old.items[0].ref];data.spaces[actorId].text=M.recordProgress(data.spaces[actorId].text,id,'2026-09-12',45);
 const baseline=JSON.stringify(data.spaces[actorId]),values=new Map([['flow:operating','unchanged'],['nonPoC-sentinel','exact bytes']]),writes:string[]=[];let quota=true;
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,raw:string)=>{assert.equal(key,PROGRAM_STATE_KEY);writes.push(key);if(quota)throw Error('QuotaExceeded');values.set(key,raw);},removeItem:(key:string)=>{assert.equal(key,PROGRAM_STATE_KEY);values.delete(key);}};
 const controller=createProgramController({initialData:data,storage,exclusive:async work=>work()});assert.ok(controller.ok);
 const port=createProgramLegacyPort({actorId,readData:()=>controller.snapshot().envelope.data,mutate:(label,build,options)=>controller.mutate(label,build,{actorId,...options})});const view=port.read(now,f.old.ref);assert.ok(view.ok);
 assert.equal((await port.commitSource({expectedToken:view.token,action:f.action})).ok,false);assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId],JSON.parse(baseline));
 quota=false;assert.ok((await port.commitSource({expectedToken:view.token,action:f.action})).ok);const count=writes.length;
 assert.equal((await port.commitSource({expectedToken:view.token,action:f.action})).ok,false);assert.equal(writes.length,count);
 const after=controller.snapshot().envelope.data.spaces[actorId];assert.equal(after.text.flows.length,20);for(const doc of data.spaces[actorId].text.flows.filter(d=>!d.lines.some(l=>l.id===id)))assert.deepEqual(after.text.flows.find(d=>d.id===doc.id),doc);
 const reloaded=createProgramController({initialData:createProgramData(),storage,exclusive:async work=>work()});assert.ok(reloaded.ok);assert.deepEqual(reloaded.snapshot().envelope.data.spaces[actorId],after);assert.ok(programLegacyTaskQualityHold(after,id));
 assert.ok((await controller.undo(actorId)).ok);assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId],JSON.parse(baseline));assert.equal(programLegacyTaskQualityHold(controller.snapshot().envelope.data.spaces[actorId],id),null);
 assert.equal(values.get('flow:operating'),'unchanged');assert.equal(values.get('nonPoC-sentinel'),'exact bytes');
});
test('PM05 subsequent source comparison/apply/Undo retains unmatched items and explicit source-only raw',()=>{
 const f=fixture();let data=f.data;
 const commit=(action:ProgramLegacySourceAction)=>{const view=prepareProgramLegacyView(data,{actorId,now,onlyFlowRef:f.old.ref});assert.ok(view.ok,JSON.stringify(view));const result=applyProgramLegacySourceAction(data,{actorId,expectedToken:view.token,action});assert.ok(result.transition.ok,JSON.stringify({issues:result.issues,conflicts:result.conflicts}));data=result.transition.data;};
 commit(f.action);commit({type:'stage',flowRef:f.old.ref,requestId:'later',rawText:f.old.authoring.rawText.replace('10:00','11:00'),now});
 const read=readProgramLegacySourceLifecycle(JSON.parse(data.spaces[actorId].legacySnapshot!.raw),f.old.ref);assert.ok(read.ok);
 for(const change of programLegacySourceChanges(read.owner,'program-source:later'))commit({type:'choice',flowRef:f.old.ref,reviewId:'later',changeId:change.id,choice:'incoming',now});
 commit({type:'apply',flowRef:f.old.ref,reviewId:'later',now});commit({type:'undo',flowRef:f.old.ref,now});
 const checked=inspectProgramLegacySnapshotPayload(JSON.parse(data.spaces[actorId].legacySnapshot!.raw));assert.ok(checked.ok);assert.equal(checked.model.flows[0].items.length,3);assert.ok(checked.payload.sourceLifecycle!.owners[f.old.ref].revisions['program-source:later'].authoring.rawText.includes('원문에만 둘 행'));assert.deepEqual(checked.payload.state.authoredFlows,f.payload.state.authoredFlows);
});

test('PM06 mixed source time update after free prose preserves semantic property identity, records, references and Undo',()=>{
 const f=fixture(true);let data=f.data;
 const commit=(action:ProgramLegacySourceAction)=>{const view=prepareProgramLegacyView(data,{actorId,now,onlyFlowRef:f.old.ref,sourceReview:true});assert.ok(view.ok,JSON.stringify(view));const result=applyProgramLegacySourceAction(data,{actorId,expectedToken:view.token,action});assert.ok(result.transition.ok,JSON.stringify({issues:result.issues,conflicts:result.conflicts}));data=result.transition.data;};
 commit(f.action);
 const space=data.spaces[actorId],binding=space.savedBindings[0],mappedId=binding.itemLines[f.old.items[1].ref];
 space.text=M.updateTask(space.text,mappedId,{date:'2026-10-21'});
 const doc=M.getDocument(space.text,binding.documentId)!,timeLine=doc.lines.find(l=>l.text==='  - 시간: 10:00')!;
 doc.lines.splice(doc.lines.indexOf(timeLine),0,{id:'private-prose-before-time',text:'  자유 메모는 시간 속성의 소유자를 바꾸지 않습니다.'});
 for(const [i,id] of Object.values(binding.itemLines).entries())space.text=M.recordProgress(space.text,id,'2026-09-12',[25,45,65][i]);
 space.text=M.addDocument(space.text,{title:'기존 기록 참조'});const referenceId=space.text.documents.at(-1)!.id;
 for(const id of Object.values(binding.itemLines))space.text=M.linkTask(space.text,referenceId,M.getDocument(space.text,referenceId)!.lines.length,id);
 space.text=M.addTask(space.text,{docId:referenceId,title:'다른 문서의 독립 항목'});
 const privateId=M.tasks(space.text).find(t=>t.docId===referenceId&&t.isCanonical)!.id;
 space.text=M.updateTask(space.text,privateId,{time:'19:30',date:'2026-11-01',note:'이 문서 속성은 원본 항목에 결합하지 않음'});
 assert.ok(validateProgramData(data));const personal=structuredClone(space.text),sourceBytes=JSON.stringify(JSON.parse(space.legacySnapshot!.raw).state.authoredFlows);
 commit({type:'stage',flowRef:f.old.ref,requestId:'mixed-time',rawText:f.old.authoring.rawText.replace('10:00','11:00'),now});
 const owner=readProgramLegacySourceLifecycle(JSON.parse(data.spaces[actorId].legacySnapshot!.raw),f.old.ref);assert.ok(owner.ok);
 for(const change of programLegacySourceChanges(owner.owner,'program-source:mixed-time'))commit({type:'choice',flowRef:f.old.ref,reviewId:'mixed-time',changeId:change.id,choice:change.kind==='removed'?'mine':'incoming',now});
 commit({type:'apply',flowRef:f.old.ref,reviewId:'mixed-time',now});
 const next=data.spaces[actorId],lines=M.getDocument(next.text,binding.documentId)!.lines;
 assert.equal(M.tasks(next.text).find(t=>t.id===mappedId)!.time,'11:00');assert.equal(M.tasks(next.text).find(t=>t.id===mappedId)!.date,'2026-10-21');
 assert.equal(lines.filter(l=>l.id===timeLine.id).length,1);assert.equal(lines.find(l=>l.id===timeLine.id)!.text,'  - 시간: 11:00');
 assert.deepEqual(lines.find(l=>l.id==='private-prose-before-time'),doc.lines.find(l=>l.id==='private-prose-before-time'));
 assert.deepEqual(next.text.progressRecords,personal.progressRecords);assert.deepEqual(next.text.documents,personal.documents);assert.deepEqual(next.text.bindings,personal.bindings);
 assert.deepEqual(next.savedBindings[0].itemLines,binding.itemLines);assert.ok(programLegacyTaskQualityHold(next,binding.itemLines[f.old.items[0].ref]));
 for(const beforeTask of M.tasks(personal).filter(t=>t.isCanonical&&t.id!==mappedId)){
  const afterTask=M.tasks(next.text).find(t=>t.id===beforeTask.id)!;
  for(const field of ['title','date','time','note','done','docId','parentTaskId'] as const)assert.deepEqual(afterTask[field],beforeTask[field],`${beforeTask.id}:${field}`);
 }
 assert.equal(JSON.stringify(JSON.parse(next.legacySnapshot!.raw).state.authoredFlows),sourceBytes);
 commit({type:'undo',flowRef:f.old.ref,now});
 assert.equal(M.tasks(data.spaces[actorId].text).find(t=>t.id===mappedId)!.time,'10:00');
 assert.deepEqual(data.spaces[actorId].text,personal);assert.ok(validateProgramData(data));
});
