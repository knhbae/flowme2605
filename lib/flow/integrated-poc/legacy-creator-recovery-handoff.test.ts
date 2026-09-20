import assert from 'node:assert/strict';
import test from 'node:test';
import {createMemoryTextAuthoringStorage,createTextAuthoringDraftRepository} from './native-creator-vendor/text-authoring/storage';
import {createTextAuthoringServiceState,beginTextAuthoringWorkingSourceEdit} from './native-creator-vendor/text-authoring/service-state';
import {createProgramData,validateProgramData,validateProgramEnvelope} from './program-data';
import {PROGRAM_STATE_KEY,programClone,type ProgramData} from './contract';
import {createProgramController} from './controller';
import {loadProgramStore} from './program-store';
import {setProgramCreatorWorking} from './creator-workspace';
import {LEGACY_CREATOR_RECOVERY_KEY as KEY} from './legacy-creator-recovery-codec';
import {prepareLegacyCreatorRecoveryHandoff,handoffLegacyCreatorRecovery} from './legacy-creator-recovery-handoff';

const START='2026-09-20T01:00:00.000Z',RECOVERY='2026-09-20T01:01:00.000Z',NOW='2026-09-20T01:02:00.000Z';
const RAW='# 개인 준비\n- [ ] 문서 확인';
function fixture(pending:string|undefined=undefined,saved=false){
 const storage=createMemoryTextAuthoringStorage();let at=START,counter=0;
 const repository=createTextAuthoringDraftRepository(storage,{now:()=>at,idFactory:prefix=>`${prefix}-${++counter}`});
 let state=createTextAuthoringServiceState(RAW,{ownership:'creator',draftId:'legacy-draft',documentId:'legacy-document',now:START});
 if(saved)repository.save(state.canonicalDraft.document,{draftId:state.draftId});at=RECOVERY;
 if(pending!==undefined)state=beginTextAuthoringWorkingSourceEdit(state,pending,RECOVERY);
 const recovery=repository.saveCoherentRecovery(state,{activeStage:'result',selectedItemId:state.canonicalDraft.document.parseResult.canonical.items[0].itemId,primaryArtifact:'calendar'});
 const raw=storage.getItem(KEY)!,data=createProgramData();
 const input={actorId:'local-user',requestId:'recovery-request',targetDraftId:'creator-recovery-target',selection:{draftId:recovery.draftId,recoveryId:recovery.recoveryId},now:NOW};
 const prepared=prepareLegacyCreatorRecoveryHandoff(data,input,raw);assert(prepared.ok,JSON.stringify(prepared));
 return{data,raw,state,recovery,input,prepared,request:prepared.request};
}
test('LRH01 preparation is pure and maps genuine coherent canonical/pending source without saved version',()=>{
 for(const pending of [undefined,'',' \r\n한글 미반영\r\n']){const f=fixture(pending,true),before=programClone(f.data),w=f.request.working;
  assert.deepEqual(f.data,before);assert.equal(w.baseRecordRevision,null);assert.equal(w.rawText,RAW);assert.equal(w.nativePendingRawText,pending);assert.deepEqual(w.nativeDocument!.document,f.recovery.document);assert.equal(w.nativeDocument!.source.draftId,f.recovery.draftId);assert(!('versionId' in w.nativeDocument!.source));
  assert.equal(w.nativeDocument!.recordUi.activeStage,pending===undefined?'result':'input');assert.equal(f.prepared.preview.existingDraftId,null);assert.equal(f.request.expectedRaw,f.raw);
 }
});
test('LRH02 handoff changes only working and one private-safe receipt, not library/personal/public/source',()=>{
 const f=fixture('미반영'),before=programClone(f.data),result=handoffLegacyCreatorRecovery(f.data,f.request,f.raw);assert(result.ok);assert(validateProgramData(result.data));
 const own=result.data.spaces['local-user'].creatorWorkspace!;assert.deepEqual(own.working,f.request.working);assert.equal(Object.keys(own.library.records).length,0);assert.equal(own.savedHistory,undefined);assert.equal(own.handoffs&&Object.keys(own.handoffs).length,0);
 assert.deepEqual(result.data.public,before.public);assert.deepEqual(result.data.spaces['local-user'].text,before.spaces['local-user'].text);for(const actor of Object.keys(before.spaces).filter(id=>id!=='local-user'))assert.deepEqual(result.data.spaces[actor],before.spaces[actor]);
 assert.equal(result.data.receipts.length,before.receipts.length+1);assert(!JSON.stringify(result.data.receipts).includes('미반영'));assert.deepEqual(f.data,before);
});
test('LRH03 exact source/space/actor CAS and forged mapping fail before any transition',()=>{
 const f=fixture('미반영');for(const request of [{...f.request,expectedRaw:f.raw+' '},{...f.request,actorId:'example-helper'},{...f.request,working:{...f.request.working,rawText:'forged'}},{...f.request,mode:'existing' as const}])assert(!handoffLegacyCreatorRecovery(f.data,request,f.raw).ok);
 const changed=programClone(f.data);changed.spaces['local-user'].text.folders[0].title+=' changed';assert(!handoffLegacyCreatorRecovery(changed,f.request,f.raw).ok);assert(!handoffLegacyCreatorRecovery(f.data,f.request,f.raw+' ').ok);
});
test('LRH04 unsaved current input blocks replacement even when automatically persisted',()=>{
 const f=fixture(),draft={draftId:'other-working',title:'보호',rawText:'미저장 원문',baseRecordRevision:null};const changed=setProgramCreatorWorking(f.data,{actorId:'local-user',expectedWorking:null,working:draft},NOW);assert(changed.ok);
 const result=prepareLegacyCreatorRecoveryHandoff(changed.data,f.input,f.raw);assert(!result.ok);assert.equal(result.reason,'dirty-working');assert.deepEqual(changed.data.spaces['local-user'].creatorWorkspace!.working,draft);
});
test('LRH05 same request and another selection reopen only exact existing result, edited result is not overwritten',()=>{
 const f=fixture('pending'),first=handoffLegacyCreatorRecovery(f.data,f.request,f.raw);assert(first.ok);const repeat=handoffLegacyCreatorRecovery(first.data,f.request,f.raw);assert(repeat.ok);assert(!repeat.changed);
 const again=prepareLegacyCreatorRecoveryHandoff(first.data,{...f.input,requestId:'another-request',targetDraftId:'unused-new-id'},f.raw);assert(again.ok);assert.equal(again.request.mode,'existing');assert.equal(again.preview.existingDraftId,f.request.targetDraftId);const opened=handoffLegacyCreatorRecovery(first.data,again.request,f.raw);assert(opened.ok);assert(!opened.changed);
 const changed=programClone(first.data);changed.spaces['local-user'].creatorWorkspace!.working!.nativePendingRawText='changed pending';const blocked=prepareLegacyCreatorRecoveryHandoff(changed,f.input,f.raw);assert(!blocked.ok);assert.equal(blocked.reason,'already-changed');assert(!handoffLegacyCreatorRecovery(changed,f.request,f.raw).ok);
});
test('LRH06 unknown original selection and artifact are preserved as provenance, never fake first item/default',()=>{
 const f=fixture(),wire=JSON.parse(f.raw);const entry=wire.recoveries[f.recovery.draftId];entry.selectedItemId='missing-item';entry.primaryArtifact='old-unsupported-view';entry.focusTarget='do-not-execute';const raw=JSON.stringify(wire),p=prepareLegacyCreatorRecoveryHandoff(f.data,f.input,raw);assert(p.ok);assert.equal(p.preview.working.nativeDocument!.recordUi.selectedItemId,undefined);assert.equal(p.preview.working.nativeDocument!.recordUi.primaryArtifact,undefined);assert.equal(p.preview.contextWarnings.length,3);assert.equal(p.preview.candidate.focusTarget,'do-not-execute');
});
test('LRH07 unavailable corrupt unsupported empty and not-newer inputs have explicit no-mutation outcomes',()=>{
 const f=fixture(undefined,true);for(const raw of [null,'{','{"schemaVersion":2}'])assert(!prepareLegacyCreatorRecoveryHandoff(f.data,f.input,raw).ok);
 const wire=JSON.parse(f.raw);wire.drafts[f.recovery.draftId].lastSavedAt=RECOVERY;const p=prepareLegacyCreatorRecoveryHandoff(f.data,f.input,JSON.stringify(wire));assert(!p.ok);assert.equal(p.reason,'not-newer');
});
test('LRH08 controller quota same-request retry, duplicate, Undo/reload and no automatic resurrection',async()=>{
 const f=fixture(' \r\npending\r\n'),values=new Map([[KEY,f.raw],['flow:sentinel',' exact bytes ']]),writes:string[]=[];let denied=true;
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{assert.equal(key,PROGRAM_STATE_KEY);writes.push(key);if(denied)throw Error('quota');values.set(key,value);},removeItem:(key:string)=>{throw Error('unexpected remove '+key);}};
 const c=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert(c.ok);const build=(data:ProgramData)=>handoffLegacyCreatorRecovery(data,f.request,storage.getItem(KEY));
 assert(!(await c.mutate('임시 작업 인계',build,{actorId:'local-user'})).ok);assert.equal(values.get(PROGRAM_STATE_KEY),undefined);denied=false;writes.length=0;assert((await c.mutate('임시 작업 인계',build,{actorId:'local-user'})).ok);assert.deepEqual(writes,[PROGRAM_STATE_KEY]);assert((await c.mutate('임시 작업 인계',build,{actorId:'local-user'})).ok);assert.equal(writes.length,1);
 const loaded=loadProgramStore(storage,validateProgramEnvelope);assert.equal(loaded.kind,'ready');assert((await c.undo('local-user')).ok);assert.deepEqual(c.snapshot().envelope.data.spaces['local-user'],f.data.spaces['local-user']);const writesBefore=writes.length;assert(!(await c.mutate('임시 작업 인계',build,{actorId:'local-user'})).ok);assert.equal(writes.length,writesBefore);
 const other=prepareLegacyCreatorRecoveryHandoff(c.snapshot().envelope.data,{...f.input,requestId:'new-after-undo',targetDraftId:'new-target'},f.raw);assert(!other.ok);assert.equal(other.reason,'already-changed');
 const reload=createProgramController({initialData:createProgramData(),storage,exclusive:async work=>work()});assert(reload.ok);assert.deepEqual(reload.snapshot(),c.snapshot());assert.equal(values.get(KEY),f.raw);assert.equal(values.get('flow:sentinel'),' exact bytes ');
});
test('LRH09 saved commit with presentation error stays committed, refresh is not a second handoff',async()=>{
 const f=fixture(),values=new Map<string,string>(),writes:string[]=[];let failPresentation=true;
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{assert.equal(key,PROGRAM_STATE_KEY);writes.push(key);values.set(key,value);},removeItem:()=>assert.fail('remove')};
 const c=createProgramController({initialData:f.data,storage,exclusive:async work=>work(),onChange:()=>{if(failPresentation)throw Error('view');}});assert(c.ok);const build=(data:ProgramData)=>handoffLegacyCreatorRecovery(data,f.request,f.raw);
 const result=await c.mutate('임시 작업 인계',build,{actorId:'local-user'});assert(result.ok&&result.presentationPending);assert.equal(writes.length,1);assert(!(await c.mutate('임시 작업 인계',build,{actorId:'local-user'})).ok);failPresentation=false;assert((await c.refresh()).ok);assert.equal(writes.length,1);
});

test('LRH10 real 32-bit identity collision cannot alias two distinct recoveries after an explicit save',async()=>{
 const {stableAuthoringHash,stableAuthoringJson}=await import('./native-creator-vendor/text-authoring/identity');
 const {applyProgramCreatorAction}=await import('./creator-workspace');
 const {fingerprintPersonalWorkspacePocAuthoringSource}=await import('../personal-workspace-poc-authoring');
 const f=fixture(),idA='audit-recovery-43908',idB='audit-recovery-190996';
 const tuple=(id:string)=>stableAuthoringJson([KEY,'legacy-draft',id]);
 assert.notEqual(tuple(idA),tuple(idB));assert.equal(stableAuthoringHash(tuple(idA)),stableAuthoringHash(tuple(idB)));assert.equal(stableAuthoringHash(tuple(idA)),'0uteapu');
 const wire=(id:string)=>{const root=JSON.parse(f.raw),entry=root.recoveries['legacy-draft'];entry.recoveryId=id;entry.serviceRecovery.recoveryId=id;return JSON.stringify(root);};
 const rawA=wire(idA),rawB=wire(idB),preparedA=prepareLegacyCreatorRecoveryHandoff(f.data,{...f.input,requestId:'collision-a',targetDraftId:'collision-target-a',selection:{draftId:'legacy-draft',recoveryId:idA}},rawA);assert(preparedA.ok);
 const first=handoffLegacyCreatorRecovery(f.data,preparedA.request,rawA);assert(first.ok);const workspace=first.data.spaces['local-user'].creatorWorkspace!,working=workspace.working!;
 const saved=applyProgramCreatorAction(first.data,{actorId:'local-user',requestId:'collision-save-a',expectedNativeDocument:working.nativeDocument,expectedNativeSelection:working.nativeSelection,expectedStructure:null,
  action:{type:'save',draftId:working.draftId,title:working.title,rawText:working.rawText,sourceFingerprint:fingerprintPersonalWorkspacePocAuthoringSource(working.rawText),expectedLibraryRevision:workspace.library.revision,now:NOW}},NOW);assert(saved.ok);
 const savedRecord=programClone(saved.data.spaces['local-user'].creatorWorkspace!.library.records['collision-target-a']);
 const preparedB=prepareLegacyCreatorRecoveryHandoff(saved.data,{...f.input,requestId:'collision-b',targetDraftId:'collision-target-b',selection:{draftId:'legacy-draft',recoveryId:idB}},rawB);assert(preparedB.ok,JSON.stringify(preparedB));assert.equal(preparedB.request.mode,'create');
 const second=handoffLegacyCreatorRecovery(saved.data,preparedB.request,rawB);assert(second.ok);assert(validateProgramData(second.data));
 assert.equal(second.data.spaces['local-user'].creatorWorkspace!.working!.draftId,'collision-target-b');assert.deepEqual(second.data.spaces['local-user'].creatorWorkspace!.library.records['collision-target-a'],savedRecord);
 const receipts=second.data.receipts.filter(r=>r.kind==='legacy-recovery-handoff');assert.equal(receipts.length,2);assert.notEqual(receipts[0].fingerprint,receipts[1].fingerprint);assert(!JSON.stringify(receipts).includes(RAW));
});
