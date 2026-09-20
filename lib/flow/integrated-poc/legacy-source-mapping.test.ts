import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { hydrateProgramLegacy } from './legacy-projection';
import { createProgramData } from './program-data';
import { readProgramLegacySourceMapping, transitionProgramLegacySourcePayload, readProgramLegacySourceLifecycle } from './legacy-source-lifecycle';
import { applyProgramLegacySourceAction, prepareProgramLegacyView } from './legacy-transaction';
import { programLegacySourceChanges } from './legacy-source-lifecycle-contract';
import { inspectProgramLegacySnapshotPayload } from './legacy-snapshot';
import { createProgramController } from './controller';
import { createProgramLegacyPort } from './legacy-port';
import { PROGRAM_STATE_KEY } from './contract';
import { textWorkspaceModel as M } from './text-workspace';
import { toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef } from '../personal-workspace-poc-contract';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { applyPersonalWorkspacePocSourceCandidate, createPersonalWorkspacePocLocalFixtureEnvelope, createPersonalWorkspacePocSourceCandidateStore,
 resolvePersonalWorkspacePocSourceCandidateChange, stagePersonalWorkspacePocSourceCandidate } from '../personal-workspace-poc-source-candidates';
const NOW = '2026-09-12T11:30:00.000Z', actorId = 'local-user';
function fixture() {
 const made = materializePersonalWorkspacePocAuthoring({handoffId:'raw-handoff',documentId:'raw-doc',revisionId:'old',rawText:'# 원본\n- [ ] 같은 제목\n  - 시간: 10:00\n- [ ] 같은 제목\n  - 시간: 14:00\n',committedAt:NOW});assert.ok(made.ok);
 const {source:_s,parsedItems:_p,sourceLineItemIdentityMap:_m,fidelityManifest:_f,...raw}=made.flow.authoring;
 const flow={...made.flow,authoring:raw};const state=createPersonalWorkspacePocState(NOW);state.authoredFlows=[flow];state.authoringReceipts=[{handoffId:raw.handoffId,flowRef:flow.ref,committedAt:NOW}];
 const payload={model:{version:1 as const,flows:[]},state};const hydrated=hydrateProgramLegacy(createProgramData(),payload.model,state,{actorId,preserveUnsupported:true});assert.ok(hydrated.ok);
 const mapping=readProgramLegacySourceMapping(payload,flow.ref);assert.ok(mapping.ok);
 // Deliberately reversed choices despite identical titles: only explicit IDs decide.
 const itemRefs=Object.fromEntries(mapping.materialized.items.map((item,i)=>[item.ref,flow.items[1-i].ref]));
 const action={type:'map-items' as const,flowRef:flow.ref,requestId:'mapping-one',expectedSourceToken:mapping.sourceToken,itemRefs,now:NOW};
 return {payload,flow,mapping,action,data:hydrated.data};
}
test('KM01 explicit raw-only bijection preserves authentic bytes and uses choices not titles/order',()=>{
 const f=fixture(),raw=JSON.stringify(f.payload);const result=transitionProgramLegacySourcePayload(f.payload,f.action);assert.ok(result.ok,JSON.stringify(result));
 assert.equal(JSON.stringify(f.payload),raw);const checked=inspectProgramLegacySnapshotPayload(result.payload);assert.ok(checked.ok);
 assert.equal(checked.sourceContextByFlow.get(f.flow.ref)!.get(f.flow.items[1].ref)!.attributes.time,'10:00');
 assert.equal(checked.sourceContextByFlow.get(f.flow.ref)!.get(f.flow.items[0].ref)!.attributes.time,'14:00');
 assert.deepEqual(result.payload.state,f.payload.state);assert.equal(JSON.stringify(result.payload.sourceLifecycle!.owners[f.flow.ref].revisions['program-source:mapped-base']),JSON.stringify(f.mapping.materialized));
 const staged=transitionProgramLegacySourcePayload(result.payload,{type:'stage',flowRef:f.flow.ref,requestId:'later',rawText:f.mapping.materialized.authoring.rawText.replace('10:00','11:00'),now:NOW});assert.ok(staged.ok);
 const source=readProgramLegacySourceLifecycle(staged.payload,f.flow.ref);assert.ok(source.ok);assert.deepEqual(programLegacySourceChanges(source.owner,'program-source:later').map(x=>x.itemRef),[f.flow.items[1].ref]);
});
test('KM02 missing/duplicate/foreign mapping and stale token do not mutate',()=>{
 const f=fixture();for(const itemRefs of [{},{[f.flow.items[0].ref]:f.flow.items[0].ref,[f.flow.items[1].ref]:f.flow.items[0].ref},{...f.action.itemRefs,foreign:f.flow.items[0].ref}]){
 const result=transitionProgramLegacySourcePayload(f.payload,{...f.action,itemRefs});assert.equal(result.ok,false);assert.equal(result.payload,f.payload);}
 const stale=transitionProgramLegacySourcePayload(f.payload,{...f.action,expectedSourceToken:'stale'});assert.equal(stale.ok,false);assert.equal(stale.payload,f.payload);
});
test('KM03 raw-only mapping uses common transaction with stable canonical bindings',()=>{
 const f=fixture(),view=prepareProgramLegacyView(f.data,{actorId,now:NOW,onlyFlowRef:f.flow.ref});assert.ok(view.ok,JSON.stringify(view));
 const result=applyProgramLegacySourceAction(f.data,{actorId,expectedToken:view.token,action:f.action});assert.ok(result.transition.ok,JSON.stringify({issues:result.issues,conflicts:result.conflicts}));
 assert.deepEqual(result.transition.data.spaces[actorId].savedBindings[0].itemLines,f.data.spaces[actorId].savedBindings[0].itemLines);
 assert.equal(result.transition.data.spaces[actorId].savedBindings[0].documentId,f.data.spaces[actorId].savedBindings[0].documentId);
});
test('KM04 actual old local-fixture effective source gains typed time without changing the old candidate store',()=>{
 const f=fixture();const made=materializePersonalWorkspacePocAuthoring({handoffId:'raw-handoff',documentId:'raw-doc',revisionId:'old',rawText:f.flow.authoring.rawText,committedAt:NOW});assert.ok(made.ok);
 const update=createPersonalWorkspacePocLocalFixtureEnvelope(made.flow,{candidateId:'old-candidate',incomingRevisionId:'old-incoming',incomingRawText:made.flow.authoring.rawText.replace('10:00','11:15').replace('# 원본','# 이전 K3 적용'),createdAt:NOW});assert.ok(update.ok);
 let store=stagePersonalWorkspacePocSourceCandidate(createPersonalWorkspacePocSourceCandidateStore(NOW),update.envelope,update.current,NOW).store;
 for(const change of update.envelope.changes) store=resolvePersonalWorkspacePocSourceCandidateChange(store,{candidateId:update.envelope.candidateId,changeId:change.changeId,resolution:'use-incoming',now:NOW}).store;
 const applied=applyPersonalWorkspacePocSourceCandidate(store,{candidateId:update.envelope.candidateId,current:update.current,now:NOW});assert.equal(applied.code,'applied');
 const payload={...f.payload,state:{...f.payload.state,authoredFlows:[made.flow]},sourceCandidateStore:applied.store},before=JSON.stringify(payload);
 const mapping=readProgramLegacySourceMapping(payload,f.flow.ref);assert.ok(mapping.ok,JSON.stringify(mapping));
 const result=transitionProgramLegacySourcePayload(payload,{...f.action,expectedSourceToken:mapping.sourceToken,itemRefs:Object.fromEntries(mapping.materialized.items.map(item=>[item.ref,item.ref]))});assert.ok(result.ok,JSON.stringify(result));
 const read=readProgramLegacySourceLifecycle(result.payload,f.flow.ref);assert.ok(read.ok);assert.equal(read.projection.contexts.get(f.flow.items[0].ref)!.attributes.time,'11:15');
 assert.equal(JSON.stringify(payload),before);assert.deepEqual(result.payload.sourceCandidateStore,applied.store);
 const corrupt=JSON.parse(JSON.stringify(result.payload));corrupt.sourceLifecycle.owners[f.flow.ref].mapping.sourceToken='foreign source';assert.equal(inspectProgramLegacySnapshotPayload(corrupt).ok,false);
});
test('KM05 mapping quota/CAS/idempotent retry and source apply/Undo retain personal records and immutable raw',async()=>{
 const f=fixture(),values=new Map<string,string>([['flow:operating-sentinel','untouched']]),writes:string[]=[];let quota=true;
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{assert.equal(key,PROGRAM_STATE_KEY);writes.push(key);if(quota)throw Error('QuotaExceeded');values.set(key,value);},removeItem:(key:string)=>{assert.equal(key,PROGRAM_STATE_KEY);values.delete(key);}};
 const controller=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert.ok(controller.ok);
 const port=createProgramLegacyPort({actorId,readData:()=>controller.snapshot().envelope.data,mutate:(label,build,options)=>controller.mutate(label,build,{actorId,...options})});
 const view=port.read(NOW,f.flow.ref);assert.ok(view.ok);assert.equal((await port.commitSource({expectedToken:view.token,action:f.action})).ok,false);assert.equal(values.has(PROGRAM_STATE_KEY),false);
 quota=false;assert.ok((await port.commitSource({expectedToken:view.token,action:f.action})).ok);const count=writes.length;
 assert.equal((await port.commitSource({expectedToken:view.token,action:{...f.action,requestId:'other'}})).ok,false);assert.equal(writes.length,count);
 const latest=port.read(NOW,f.flow.ref);assert.ok(latest.ok);assert.ok((await port.commitSource({expectedToken:latest.token,action:f.action})).ok);assert.equal(writes.length,count);
 const undo=await controller.undo(actorId);assert.ok(undo.ok);assert.equal(JSON.parse(controller.snapshot().envelope.data.spaces[actorId].legacySnapshot!.raw).sourceLifecycle,undefined);
 const again=port.read(NOW,f.flow.ref);assert.ok(again.ok);assert.ok((await port.commitSource({expectedToken:again.token,action:f.action})).ok);
 const line=controller.snapshot().envelope.data.spaces[actorId].savedBindings[0].itemLines[f.flow.items[1].ref];
 let data=controller.snapshot().envelope.data;data=JSON.parse(JSON.stringify(data));data.spaces[actorId].text=M.updateTask(data.spaces[actorId].text,line,{title:'내 제목',note:'보존 메모',date:'2026-10-01'});data.spaces[actorId].text=M.recordProgress(data.spaces[actorId].text,line,'2026-09-12',45);
 const commit=(action:Parameters<typeof applyProgramLegacySourceAction>[1]['action'])=>{const current=prepareProgramLegacyView(data,{actorId,now:NOW,onlyFlowRef:f.flow.ref});assert.ok(current.ok);const result=applyProgramLegacySourceAction(data,{actorId,expectedToken:current.token,action});assert.ok(result.transition.ok,JSON.stringify({issues:result.issues,conflicts:result.conflicts}));data=result.transition.data;};
 commit({type:'stage',flowRef:f.flow.ref,requestId:'later',rawText:f.mapping.materialized.authoring.rawText.replace('10:00','11:00'),now:NOW});
 const source=readProgramLegacySourceLifecycle(JSON.parse(data.spaces[actorId].legacySnapshot!.raw),f.flow.ref);assert.ok(source.ok);
 for(const change of programLegacySourceChanges(source.owner,'program-source:later'))commit({type:'choice',flowRef:f.flow.ref,reviewId:'later',changeId:change.id,choice:'incoming',now:NOW});
 commit({type:'apply',flowRef:f.flow.ref,reviewId:'later',now:NOW});assert.equal(M.tasks(data.spaces[actorId].text).find(t=>t.id===line)!.time,'11:00');
 commit({type:'undo',flowRef:f.flow.ref,now:NOW});const task=M.tasks(data.spaces[actorId].text).find(t=>t.id===line)!;assert.equal(task.time,'10:00');assert.equal(task.title,'내 제목');assert.equal(task.note,'보존 메모');assert.equal(task.date,'2026-10-01');assert.equal(M.latestProgress(data.spaces[actorId].text,line)!.percent,45);
 const snapshot=JSON.parse(data.spaces[actorId].legacySnapshot!.raw);assert.ok(inspectProgramLegacySnapshotPayload(snapshot).ok);assert.deepEqual(snapshot.model,f.payload.model);assert.deepEqual(snapshot.state.authoredFlows,f.payload.state.authoredFlows);assert.equal(values.get('flow:operating-sentinel'),'untouched');
});
test('KM06 legacy custom tuple stays stable without rewriting authentic materializer IDs',()=>{
 const f=fixture(),savedCopyId='old-copy',flowId='old-flow',ref=toPersonalWorkspacePocFlowRef(savedCopyId,flowId);
 const flow={...f.flow,savedCopyId,flowId,ref,items:f.flow.items.map((item,index)=>({...item,savedCopyId,flowId,itemId:`old-${index}`,ref:toPersonalWorkspacePocFlowItemRef(savedCopyId,flowId,`old-${index}`)}))};
 const payload={...f.payload,state:{...f.payload.state,authoredFlows:[flow],authoringReceipts:[{handoffId:flow.authoring.handoffId,flowRef:ref,committedAt:NOW}]}};
 assert.ok(inspectProgramLegacySnapshotPayload(payload).ok);const mapping=readProgramLegacySourceMapping(payload,ref);assert.ok(mapping.ok);
 const itemRefs=Object.fromEntries(mapping.materialized.items.map((item,i)=>[item.ref,flow.items[i].ref]));const action={...f.action,flowRef:ref,expectedSourceToken:mapping.sourceToken,itemRefs};
 const result=transitionProgramLegacySourcePayload(payload,action);assert.ok(result.ok,JSON.stringify(result));const checked=inspectProgramLegacySnapshotPayload(result.payload);assert.ok(checked.ok);
 assert.deepEqual(checked.model.flows[0].items.map(item=>[item.savedCopyId,item.flowId,item.itemId,item.ref]),flow.items.map(item=>[item.savedCopyId,item.flowId,item.itemId,item.ref]));
 assert.equal(checked.model.flows[0].ref,ref);assert.equal(checked.sourceContextByFlow.get(ref)!.get(flow.items[0].ref)!.attributes.time,'10:00');
 const hydrated=hydrateProgramLegacy(createProgramData(),payload.model,payload.state,{actorId,preserveUnsupported:true});assert.ok(hydrated.ok);const view=prepareProgramLegacyView(hydrated.data,{actorId,now:NOW,onlyFlowRef:ref});assert.ok(view.ok);
 const transaction=applyProgramLegacySourceAction(hydrated.data,{actorId,expectedToken:view.token,action});assert.ok(transaction.transition.ok,JSON.stringify({issues:transaction.issues,conflicts:transaction.conflicts}));
});
test('KM07 real Map quality holds cannot be bypassed with invented raw/item mapping',()=>{
 for(const mapId of ['moving-d30','baby-health-schedule','year-end-tax-submit','curated-funmom-learning-park','curated-child-vaccination-schedule','baby-food-map']) {
  const saved=buildSourceBackedFlowMapSavedSnapshot(mapId,{savedAt:NOW,anchor:'2026-09-30'}),persisted=buildSourceBackedFlowMapPersistenceRecord(mapId,{savedAt:NOW,anchor:'2026-09-30'});assert.ok(saved&&persisted);
  const entries:Record<string,string>={[`flow:map:saved:${mapId}`]:JSON.stringify(saved),[`flow:map:persistence:${mapId}`]:JSON.stringify(persisted)};
  const read=buildPersonalWorkspacePocReadModel({length:2,key:i=>Object.keys(entries)[i]??null,getItem:key=>entries[key]??null},sourceBackedMyFlowBundles);assert.ok(read.ok);
  const payload={model:read.model,state:createPersonalWorkspacePocState(NOW)},raw=JSON.stringify(payload),flowRef=read.model.flows[0].ref;
  const mapping=readProgramLegacySourceMapping(payload,flowRef);assert.equal(mapping.ok,false);
  const attempt=transitionProgramLegacySourcePayload(payload,{type:'map-items',flowRef,requestId:'not-authorized',expectedSourceToken:'fake',itemRefs:{},now:NOW});assert.equal(attempt.ok,false);assert.equal(attempt.payload,payload);assert.equal(JSON.stringify(payload),raw);
 }
});
