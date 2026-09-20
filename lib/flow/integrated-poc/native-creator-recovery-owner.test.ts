import assert from 'node:assert/strict';
import test from 'node:test';
import {createMemoryTextAuthoringStorage,createTextAuthoringDraftRepository} from './native-creator-vendor/text-authoring/storage';
import {createTextAuthoringServiceState,beginTextAuthoringWorkingSourceEdit} from './native-creator-vendor/text-authoring/service-state';
import {decodeLegacyCreatorRecoveries,LEGACY_CREATOR_RECOVERY_KEY} from './legacy-creator-recovery-codec';
import {createNativeCreatorRecoverySource,readNativeCreatorRecoverySource} from './native-creator-recovery-source';
import {createNativeCreatorDocumentOwner,readNativeCreatorSavedDocument,readNativeCreatorSourceDocument,readNativeCreatorDocument,validateNativeCreatorDocumentOwner,applyNativeCreatorDocumentOperation,restoreNativeCreatorDocument} from './native-creator-document';
import {isNativeCreatorRecoverySource,nativeCreatorSourceIdentity} from './native-creator-document-contract';
import {programCreatorNativeSelection,validateProgramCreatorNativeContext} from './creator-native-context';
import {createProgramData,validateProgramData} from './program-data';
import {setProgramCreatorWorking,applyProgramCreatorAction,creatorWorkingFromRecord} from './creator-workspace';
import {applyProgramNativeCreatorOperation,buildProgramNativeCreatorRawSyncOperation} from './creator-native-workspace';
import {inspectProgramNativeCreatorHandoff,applyProgramNativeCreatorHandoff} from './creator-native-execution-adapter';
import {fingerprintPersonalWorkspacePocAuthoringSource as fingerprint} from '../personal-workspace-poc-authoring';
import {previewProgramCreatorSavedRestore,restoreProgramCreatorSavedRevision} from './creator-history';
import type {ProgramData,ProgramTransition} from './contract';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createAuthoringSourceUpdateCandidate} from './native-creator-vendor/text-authoring/source-update';

const NOW='2026-09-20T01:00:00.000Z',NEXT='2026-09-20T01:01:00.000Z',AFTER='2026-09-20T01:02:00.000Z';
const RAW='# 출국 준비\n- [ ] 여권 확인\n  - 날짜: 2026-10-05\n- [ ] 짐 확인';
const accept=(result:ProgramTransition<string>)=>{assert(result.ok,result.ok?'':result.reason);assert(validateProgramData(result.data));return result;};
function fixture(pending?:string){
 const storage=createMemoryTextAuthoringStorage(),repo=createTextAuthoringDraftRepository(storage,{now:()=>NEXT,idFactory:prefix=>`${prefix}-actual`});
 let state=createTextAuthoringServiceState(RAW,{ownership:'creator',draftId:'original-draft',documentId:'original-document',now:NOW});
 if(pending!==undefined)state=beginTextAuthoringWorkingSourceEdit(state,pending,NEXT);
 repo.saveCoherentRecovery(state,{activeStage:'structure'});
 const raw=storage.getItem(LEGACY_CREATOR_RECOVERY_KEY)!,read=decodeLegacyCreatorRecoveries(raw);assert(read.kind==='ready');const candidate=read.candidates[0];
 const source=createNativeCreatorRecoverySource(candidate);assert(source);
 const created=createNativeCreatorDocumentOwner({id:'recovered-program',source,currentRecordUi:{activeStage:'structure'}},AFTER);assert(created.ok);
 let data=createProgramData();const actorId=data.activeActorId;
 data=accept(setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:{draftId:created.owner.id,title:candidate.title,rawText:candidate.canonicalRawText,baseRecordRevision:null,nativeDocument:created.owner,nativeSelection:source,
  ...(candidate.workingRawText===candidate.canonicalRawText?{}:{nativePendingRawText:candidate.workingRawText})}},AFTER)).data;
 return{data,actorId,draftId:created.owner.id,owner:created.owner,source,candidate,raw,storage};
}
function save(data:ProgramData,requestId='explicit-save'){
 const actorId=data.activeActorId,workspace=data.spaces[actorId].creatorWorkspace!,w=workspace.working!;
 return applyProgramCreatorAction(data,{actorId,requestId,expectedStructure:w.structure??null,expectedNativeDocument:w.nativeDocument??null,expectedNativeSelection:w.nativeSelection??null,
  action:{type:'save',draftId:w.draftId,title:w.title,rawText:w.rawText,sourceFingerprint:fingerprint(w.rawText),expectedLibraryRevision:workspace.library.revision,...(w.baseRecordRevision===null?{}:{expectedRecordRevision:w.baseRecordRevision}),now:AFTER}},AFTER);
}
function edit(data:ProgramData,requestId:string,operation:Parameters<typeof applyProgramNativeCreatorOperation>[1]['operation']){
 const actorId=data.activeActorId,w=data.spaces[actorId].creatorWorkspace!.working!;
 return applyProgramNativeCreatorOperation(data,{actorId,draftId:w.draftId,requestId,expectedWorking:w,expectedOwner:w.nativeDocument!,operation},AFTER);
}

test('NRO01 full recovery owner roundtrip preserves exact canonical IDs, pending provenance and no saved identity',()=>{
 const f=fixture(RAW+'\r\n미반영 메모'),copy=JSON.parse(JSON.stringify(f.data));assert(validateProgramData(copy));assert(validateNativeCreatorDocumentOwner(f.owner));
 assert.equal(readNativeCreatorSavedDocument(f.source),null);assert.deepEqual(readNativeCreatorSourceDocument(f.source),JSON.parse(f.candidate.documentJson));assert(readNativeCreatorDocument(f.owner).ok);
 assert.deepEqual(programCreatorNativeSelection(f.owner),f.source);assert(validateProgramCreatorNativeContext(f.owner,f.source,f.draftId,RAW));assert.equal(f.owner.actions.length,0);assert.equal(f.owner.revision,1);assert(!('versionId' in f.source));
 const workspace=copy.spaces[f.actorId].creatorWorkspace;assert(workspace);const w=workspace.working;assert(w);assert.equal(w.baseRecordRevision,null);assert.deepEqual(workspace.library.records,{});assert.equal(w.nativePendingRawText,RAW+'\r\n미반영 메모');assert.equal(f.storage.getItem(LEGACY_CREATOR_RECOVERY_KEY),f.raw);
});
test('NRO02 incomplete or forged provenance and same-ID sibling recovery selections fail closed',()=>{
 const f=fixture();
 for(const mutate of [(s:any)=>s.revisionId='wrong',(s:any)=>s.recoveredAt=NOW,(s:any)=>s.recoveryId='wrong',(s:any)=>s.documentJson=s.documentJson.replace('여권 확인','forged'),(s:any)=>s.versionId='fake',(s:any)=>s.recoveryJson=s.recoveryJson.replace('"workingSource":','"workingSource":{},"workingSource":')]){
  const source=structuredClone(f.source);mutate(source);assert.equal(readNativeCreatorSourceDocument(source),null);assert.equal(readNativeCreatorRecoverySource(source),null);
 }
 const sibling=structuredClone(f.source),entry=JSON.parse(sibling.recoveryJson);entry.focusTarget='other';sibling.recoveryJson=JSON.stringify(entry);assert(readNativeCreatorSourceDocument(sibling));assert.equal(validateProgramCreatorNativeContext(f.owner,sibling,f.draftId,RAW),false);
});
test('NRO03 unsaved pending sync is explicit and preserves review/owner provenance without generating a library save',()=>{
 const f=fixture(RAW+'\r\n- [ ] 미반영 할 일'),before=structuredClone(f.data),working=f.data.spaces[f.actorId].creatorWorkspace!.working!;
 assert(!save(f.data).ok);assert(!edit(f.data,'blocked',{type:'exclude',itemId:f.owner.document.parseResult.canonical.items[0].itemId}).ok);
 const sync=buildProgramNativeCreatorRawSyncOperation(f.owner,working.nativePendingRawText!);assert(sync.ok);
 f.data=accept(edit(f.data,'sync',sync.operation)).data;const own=f.data.spaces[f.actorId].creatorWorkspace!;
 assert.deepEqual(own.library,before.spaces[f.actorId].creatorWorkspace!.library);assert.equal(own.working!.baseRecordRevision,null);assert.equal(own.working!.nativePendingRawText,undefined);assert.equal(own.working!.rawText,working.nativePendingRawText);assert.equal(own.working!.title,working.title);
 assert.equal(own.working!.nativeDocument!.document.rawText,working.nativePendingRawText);assert.deepEqual(own.working!.nativeDocument!.source,f.source);assert.deepEqual(f.data.public,before.public);assert.deepEqual(f.data.spaces[f.actorId].text,before.spaces[f.actorId].text);
 const saved=accept(save(f.data));assert.equal(saved.data.spaces[f.actorId].creatorWorkspace!.library.records[f.draftId].recordRevision,1);assert.deepEqual(saved.data.spaces[f.actorId].creatorWorkspace!.structureDrafts![f.draftId].nativeSelection,f.source);
});
test('NRO04 first-save-before canonical operation and Undo retain unsaved status and original recovery',()=>{
 const f=fixture();f.data=accept(edit(f.data,'exclude',{type:'exclude',itemId:f.owner.document.parseResult.canonical.items[0].itemId})).data;
 assert.equal(f.data.spaces[f.actorId].creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items[0].included,false);
 f.data=accept(edit(f.data,'undo',{type:'undo'})).data;const w=f.data.spaces[f.actorId].creatorWorkspace!.working!;assert.equal(w.nativeDocument!.document.parseResult.canonical.items[0].included,true);assert.equal(w.baseRecordRevision,null);assert.deepEqual(f.data.spaces[f.actorId].creatorWorkspace!.library.records,{});assert.deepEqual(w.nativeDocument!.source,f.source);
});
test('NRO05 later explicit save, same-raw context save, Program history restore and duplicate preserve recovery lineage',()=>{
 const f=fixture();f.data=accept(save(f.data)).data;const first=f.data.spaces[f.actorId].creatorWorkspace!.savedHistory!.drafts[f.draftId][0];
 f.data=accept(edit(f.data,'exclude',{type:'exclude',itemId:f.owner.document.parseResult.canonical.items[0].itemId})).data;f.data=accept(save(f.data,'save-context')).data;
 const preview=previewProgramCreatorSavedRestore(f.data,f.actorId,f.draftId,first.id,null);assert(preview.ok);f.data=accept(restoreProgramCreatorSavedRevision(f.data,{actorId:f.actorId,requestId:'restore-program',preview:preview.value},null,AFTER)).data;
 let own=f.data.spaces[f.actorId].creatorWorkspace!;assert.deepEqual(own.working!.nativeDocument!.source,f.source);assert(own.working!.nativeDocument!.document.parseResult.canonical.items[0].included);
 f.data=accept(applyProgramCreatorAction(f.data,{actorId:f.actorId,requestId:'duplicate',action:{type:'duplicate',sourceDraftId:f.draftId,newDraftId:'recovery-copy',expectedLibraryRevision:own.library.revision,expectedSourceRecordRevision:own.library.records[f.draftId].recordRevision,now:AFTER}},AFTER)).data;
 own=f.data.spaces[f.actorId].creatorWorkspace!;const copy=creatorWorkingFromRecord(own,'recovery-copy');assert(copy);assert.equal(copy.nativeDocument!.id,'recovery-copy');assert.deepEqual(copy.nativeDocument!.source,f.source);assert.deepEqual(copy.nativeSelection,f.source);assert.equal(own.handoffs['recovery-copy'],undefined);assert.equal(f.storage.getItem(LEGACY_CREATOR_RECOVERY_KEY),f.raw);
});
test('NRO06 explicit saved recovery handoff uses a recovery ID, never a fabricated version ID',()=>{
 const f=fixture();f.data=accept(save(f.data)).data;const before=structuredClone(f.data),preview=inspectProgramNativeCreatorHandoff(f.data,{actorId:f.actorId,draftId:f.draftId},AFTER);assert(preview.ok);
 assert.equal(preview.preview.sourceVersionId,null);assert.equal(preview.preview.sourceRecoveryId,f.source.recoveryId);
 const choices=Object.fromEntries(preview.preview.rows.map(row=>[row.itemId,{source:'incoming' as const,date:'keep' as const,time:'keep' as const,children:'keep' as const}]));
 f.data=accept(applyProgramNativeCreatorHandoff(f.data,{actorId:f.actorId,requestId:'handoff',preview:preview.preview,choices},AFTER)).data;
 const revision=f.data.spaces[f.actorId].creatorWorkspace!.nativeExecutionSources![f.draftId].revisions[0];assert.deepEqual(revision.nativeSelection,f.source);assert.deepEqual(revision.nativeDocument.source,f.source);assert.deepEqual(f.data.public,before.public);assert(validateProgramData(JSON.parse(JSON.stringify(f.data))));
});
test('NRO07 saved restore remains saved-only and cannot reinterpret recovery payload as a saved revision',()=>{
 const f=fixture(),before=JSON.stringify(f.owner);const rejected=restoreNativeCreatorDocument(f.owner,{expectedOwner:f.owner,requestId:'illegal-recovery-restore',source:f.source as any},AFTER);assert(!rejected.ok);assert.equal(JSON.stringify(f.owner),before);
 const saved={storageKey:f.source.storageKey,draftId:f.source.draftId,versionId:f.source.recoveryId,revisionId:f.owner.document.revision.revisionId,documentJson:f.source.documentJson};assert.notEqual(nativeCreatorSourceIdentity(saved),nativeCreatorSourceIdentity(f.source));
 const changed=applyNativeCreatorDocumentOperation(f.owner,{expectedOwner:f.owner,requestId:'exclude',operation:{type:'exclude',itemId:f.owner.document.parseResult.canonical.items[0].itemId}},AFTER);assert(changed.ok);
 const restored=restoreNativeCreatorDocument(changed.owner,{expectedOwner:changed.owner,requestId:'actual-saved-restore',source:saved},AFTER);assert(restored.ok);assert(validateNativeCreatorDocumentOwner(restored.owner));assert(isNativeCreatorRecoverySource(restored.owner.source));assert.deepEqual(programCreatorNativeSelection(restored.owner),saved);
});
test('NRO08 first-save-before operations reject stale working/foreign actor and preserve pending bytes',()=>{
 const f=fixture(''),w=f.data.spaces[f.actorId].creatorWorkspace!.working!,prepared=buildProgramNativeCreatorRawSyncOperation(f.owner,'');assert(prepared.ok);
 for(const override of [{actorId:'creator-minji'},{expectedWorking:{...w,title:'stale'}}]){const result=applyProgramNativeCreatorOperation(f.data,{actorId:f.actorId,draftId:f.draftId,requestId:'sync',expectedWorking:w,expectedOwner:f.owner,operation:prepared.operation,...override},AFTER);assert(!result.ok);assert.equal(result.data,f.data);assert.equal(w.nativePendingRawText,'');}
 f.data=accept(edit(f.data,'empty-sync',prepared.operation)).data;assert.equal(f.data.spaces[f.actorId].creatorWorkspace!.working!.rawText,'');assert.equal(f.data.spaces[f.actorId].creatorWorkspace!.working!.nativePendingRawText,undefined);
});
test('NRO09 source update staging reads the genuine recovery initial document and preserves recovery provenance',()=>{
 const f=fixture(),incoming=createTextAuthoringDocument(RAW.replace('여권 확인','여권 만료일 확인')+'\n- [ ] 매일 확인\n  - 날짜: 2026-10-05\n  - 반복: 매일\n  - 반복 종료: 3회',{documentId:'original-document',ownership:'creator',now:AFTER});
 const candidate=createAuthoringSourceUpdateCandidate(incoming,{capturedAt:AFTER});
 const result=applyNativeCreatorDocumentOperation(f.owner,{expectedOwner:f.owner,requestId:'stage-recovery-source',operation:{type:'stage_source_update',candidate}},AFTER);assert(result.ok,result.ok?'':result.reason);assert(result.changed);assert(validateNativeCreatorDocumentOwner(JSON.parse(JSON.stringify(result.owner))));assert.deepEqual(result.owner.source,f.source);assert.notEqual(result.owner.document.sourceState?.status,'current');
});
