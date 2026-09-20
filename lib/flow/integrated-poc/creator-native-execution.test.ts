import test from 'node:test';import assert from 'node:assert/strict';
import {createProgramData,validateProgramData} from './program-data';
import {programClone,type ProgramData,type ProgramTransition} from './contract';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createNativeCreatorDocumentOwner} from './native-creator-document';
import {setProgramCreatorWorking,applyProgramCreatorAction} from './creator-workspace';
import {applyProgramNativeCreatorOperation} from './creator-native-workspace';
import {inspectProgramNativeCreatorHandoff,applyProgramNativeCreatorHandoff} from './creator-native-execution-adapter';
import {fingerprintPersonalWorkspacePocAuthoringSource as fp} from '../personal-workspace-poc-authoring';
import {textWorkspaceModel as M} from './text-workspace';
export const NATIVE_EXEC_NOW='2026-09-13T08:00:00.000Z';
export function nativeExecOk(r:ProgramTransition<string>){if(!r.ok)assert.fail(r.reason);assert(validateProgramData(r.data));return r;}
export function saveNativeExecutionFixture(data:ProgramData,requestId:string){const actorId=data.activeActorId,own=data.spaces[actorId].creatorWorkspace!,w=own.working!;return nativeExecOk(applyProgramCreatorAction(data,{actorId,requestId,expectedStructure:w.structure??null,expectedNativeDocument:w.nativeDocument??null,expectedNativeSelection:w.nativeSelection??null,action:{type:'save',draftId:w.draftId,title:w.title,rawText:w.rawText,sourceFingerprint:fp(w.rawText),expectedLibraryRevision:own.library.revision,...(w.baseRecordRevision?{expectedRecordRevision:w.baseRecordRevision}:{}),now:NATIVE_EXEC_NOW}},NATIVE_EXEC_NOW)).data;}
export function nativeExecutionFixture(raw='# 여행\n\n- [ ] 준비\n  - 날짜: 2026-09-20\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 자료: https://example.com/resource\n\n- [ ] 매일 확인\n  - 날짜: 2026-09-21\n  - 반복: 매일\n  - 반복 종료: 5회',reviewRequirements?:NonNullable<Parameters<typeof createTextAuthoringDocument>[1]>['reviewRequirements']){
 const doc=createTextAuthoringDocument(raw,{documentId:'actual-native-document',ownership:'creator',now:NATIVE_EXEC_NOW,...(reviewRequirements?{reviewRequirements}:{})}),source={storageKey:'flow:text-authoring:drafts:v1' as const,draftId:'original-native',versionId:'actual-version',revisionId:doc.revision.revisionId,documentJson:JSON.stringify(doc)};
 const owner=createNativeCreatorDocumentOwner({id:'native-draft',source},NATIVE_EXEC_NOW);assert(owner.ok);let data=createProgramData();const actorId=data.activeActorId;
 data=nativeExecOk(setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:{draftId:'native-draft',title:'제작 여행',rawText:raw,baseRecordRevision:null,nativeDocument:owner.owner,nativeSelection:source}},NATIVE_EXEC_NOW)).data;
 return{data:saveNativeExecutionFixture(data,'save-native'),actorId,draftId:'native-draft',source};
}
export function handoffNativeFixture(data:ProgramData,requestId='handoff'){
 const read=inspectProgramNativeCreatorHandoff(data,{actorId:data.activeActorId,draftId:'native-draft'},NATIVE_EXEC_NOW);assert(read.ok,read.ok?'':read.reason);
 const choices=Object.fromEntries(read.preview.rows.map(row=>[row.itemId,{source:'incoming' as const,date:'keep' as const,time:'keep' as const,children:'keep' as const}]));
 return nativeExecOk(applyProgramNativeCreatorHandoff(data,{actorId:data.activeActorId,requestId,preview:read.preview,choices},NATIVE_EXEC_NOW));
}
test('NE01 genuine native context handoff preserves source IDs/resources/timezone with independent unchecked personal target',()=>{
 const f=nativeExecutionFixture(),before=programClone(f.data),result=handoffNativeFixture(f.data),space=result.data.spaces[f.actorId],owner=space.creatorWorkspace!.nativeExecutionSources![f.draftId];
 assert.equal(owner.revisions[0].nativeDocument.source.documentJson,f.source.documentJson);const selection=owner.revisions[0].nativeSelection;assert('versionId' in selection);assert.equal(selection.versionId,'actual-version');assert.equal(owner.revisions[0].rows.length,2);assert.equal(M.tasks(space.text).filter(t=>t.docId===result.result).length,1);
 assert(M.raw(M.getDocument(space.text,result.result)).includes('Asia/Seoul'));assert(M.raw(M.getDocument(space.text,result.result)).includes('https://example.com/resource'));
 const task=M.tasks(space.text).find(t=>t.docId===result.result)!;assert.equal(task.date,'2026-09-20');assert.equal(task.time,'09:30');assert.equal(task.done,false);
 assert.deepEqual(result.data.public,before.public);assert.equal(space.legacySnapshot,before.spaces[f.actorId].legacySnapshot);assert.equal(space.text.progressRecords.length,0);
});
test('NE02 same raw canonical exclusion rehandoff retains exact personal identity and bytes in accessible retention',()=>{
 const f=nativeExecutionFixture();f.data=handoffNativeFixture(f.data).data;let space=f.data.spaces[f.actorId],own=space.creatorWorkspace!,w=own.working!,itemId=w.nativeDocument!.document.parseResult.canonical.items[0].itemId;
 const row=own.nativeExecutionSources![f.draftId].revisions[0].rows[0];space.text=M.updateTask(space.text,row.lineId,{date:'2026-10-01',note:'PRIVATE NOTE',done:true});const taskBefore=M.tasks(space.text).find(t=>t.id===row.lineId)!;
 f.data=nativeExecOk(applyProgramNativeCreatorOperation(f.data,{actorId:f.actorId,requestId:'exclude',draftId:f.draftId,expectedWorking:w,expectedOwner:w.nativeDocument!,operation:{type:'exclude',itemId}},NATIVE_EXEC_NOW)).data;f.data=saveNativeExecutionFixture(f.data,'save-excluded');const result=handoffNativeFixture(f.data,'re-handoff');space=result.data.spaces[f.actorId];
 assert.equal(space.creatorWorkspace!.nativeExecutionSources![f.draftId].selections[itemId].disposition,'retained');const task=M.tasks(space.text).find(t=>t.id===row.lineId)!;assert(task);assert(space.archivedDocumentIds.includes(task.docId));assert.equal(task.date,taskBefore.date);assert.equal(task.done,taskBefore.done);assert.equal(task.note,taskBefore.note);assert.equal(space.creatorWorkspace!.nativeExecutionSources![f.draftId].revisions[0].nativeDocument.source.documentJson,f.source.documentJson);
});
test('NE03 preview cancellation and stale source/foreign actor do not write',()=>{
 const f=nativeExecutionFixture(),read=inspectProgramNativeCreatorHandoff(f.data,{actorId:f.actorId,draftId:f.draftId},NATIVE_EXEC_NOW);assert(read.ok);const input={actorId:f.actorId,requestId:'cancel',preview:read.preview,choices:{}};
 const cancel=nativeExecOk(applyProgramNativeCreatorHandoff(f.data,input,NATIVE_EXEC_NOW));assert(!cancel.changed);assert.equal(cancel.data,f.data);
 const changed=programClone(f.data);changed.spaces[f.actorId].text=M.addDocument(changed.spaces[f.actorId].text,{title:'다른 문서'});assert(!applyProgramNativeCreatorHandoff(changed,input,NATIVE_EXEC_NOW).ok);assert(!applyProgramNativeCreatorHandoff(f.data,{...input,actorId:'creator-minji'},NATIVE_EXEC_NOW).ok);
});
