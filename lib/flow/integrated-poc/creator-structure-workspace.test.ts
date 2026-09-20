import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramData,validateProgramData,validateProgramEnvelope } from './program-data';
import { PROGRAM_STATE_KEY,programClone,type ProgramData,type ProgramTransition } from './contract';
import { createProgramController } from './controller';
import { loadProgramStore } from './program-store';
import { createProgramCreatorStructure,prepareProgramCreatorStructure,type ProgramCreatorStructureSidecar } from './creator-structure-sidecar';
import { listPersonalWorkspacePocStructureTemplatePreviews } from '../personal-workspace-poc-structure-template/preview-adapter';
import { setProgramCreatorWorking,applyProgramCreatorAction,creatorWorkingFromRecord } from './creator-workspace';
import { previewProgramCreatorSavedRestore,restoreProgramCreatorSavedRevision } from './creator-history';
import { fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../personal-workspace-poc-authoring';
import { creatorSourceIdentity } from './creator-source-order';
const NOW='2026-09-13T04:00:00.000Z',LATER='2026-09-13T04:00:01.000Z';
function ok(r:ProgramTransition<string>){if(!r.ok)assert.fail(r.reason);assert(validateProgramData(r.data));return r;}
function saved(){const entry=listPersonalWorkspacePocStructureTemplatePreviews()[4],draftId='structure-working';
  const before={catalogVersion:entry.catalogVersion,draft:{...entry.inputDraft,draftId}},prepared=prepareProgramCreatorStructure(before,{draftId,rawText:'',now:NOW});assert(prepared.ok);
  let data=createProgramData(),actorId=data.activeActorId;
  data=ok(setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:{draftId,title:'폼에서 만든 여행',rawText:prepared.value.command.nextRawText,baseRecordRevision:null,structure:prepared.value.after}},NOW)).data;
  data=ok(save(data,'save-first',NOW)).data;return{data,actorId,draftId,structure:prepared.value.after};}
function save(data:ProgramData,requestId:string,now=LATER,expected?:ProgramCreatorStructureSidecar|null){const actorId=data.activeActorId,own=data.spaces[actorId].creatorWorkspace!,w=own.working!;
  return applyProgramCreatorAction(data,{actorId,requestId,expectedStructure:expected===undefined?w.structure??null:expected,action:{type:'save',draftId:w.draftId,title:w.title,rawText:w.rawText,sourceFingerprint:fp(w.rawText),expectedLibraryRevision:own.library.revision,...(w.baseRecordRevision?{expectedRecordRevision:w.baseRecordRevision}:{}),now}},now);}
function detach(data:ProgramData){const actorId=data.activeActorId,w=data.spaces[actorId].creatorWorkspace!.working!,working={...w};delete working.structure;return ok(setProgramCreatorWorking(data,{actorId,expectedWorking:w,working},LATER)).data;}

test('CSW01 blank working recovers structure atomically and explicit discard has no saved sidecar orphan',()=>{
  const data=createProgramData(),actorId=data.activeActorId,r=createProgramCreatorStructure({draftId:'empty-creator',templateId:'moving-dday-v1',rawText:'',now:NOW});assert(r.ok);
  const changed=ok(setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:{draftId:'empty-creator',title:'',rawText:'',baseRecordRevision:null,structure:r.value}},NOW)).data;
  const reloaded=JSON.parse(JSON.stringify(changed));assert(validateProgramData(reloaded));assert.deepEqual(reloaded.spaces[actorId].creatorWorkspace!.working!.structure,r.value);
  assert.equal(changed.spaces[actorId].creatorWorkspace!.structureDrafts,undefined);assert.equal(Object.keys(changed.spaces[actorId].creatorWorkspace!.library.records).length,0);
  const discarded=ok(setProgramCreatorWorking(changed,{actorId,expectedWorking:changed.spaces[actorId].creatorWorkspace!.working,working:null},LATER)).data;
  assert.equal(discarded.spaces[actorId].creatorWorkspace!.working,null);assert.equal(discarded.spaces[actorId].creatorWorkspace!.structureDrafts,undefined);
});
test('CSW02 explicit save captures sidecar, detach-only save advances private context not Creator revision',()=>{
  const f=saved(),own=f.data.spaces[f.actorId].creatorWorkspace!,before=JSON.stringify(own.library),initialHistory=own.savedHistory!.drafts[f.draftId];
  assert.equal(own.structureDrafts![f.draftId].contextRevision,1);assert.deepEqual(creatorWorkingFromRecord(own,f.draftId)!.structure,f.structure);
  const detached=detach(f.data),savedData=ok(save(detached,'save-detach')).data,next=savedData.spaces[f.actorId].creatorWorkspace!;
  assert.equal(JSON.stringify(next.library),before);assert.equal(next.structureDrafts![f.draftId].contextRevision,2);assert.equal(next.structureDrafts![f.draftId].savedAt,LATER);assert.equal(next.structureDrafts![f.draftId].structure,undefined);
  assert.equal(next.working!.structure,undefined);assert.deepEqual(next.savedHistory!.drafts[f.draftId].slice(0,initialHistory.length),initialHistory);assert.equal(next.savedHistory!.drafts[f.draftId].length,2);
  assert.equal(next.savedHistory!.drafts[f.draftId][0].rawText,next.savedHistory!.drafts[f.draftId][1].rawText);
  const noop=ok(save(savedData,'save-noop'));assert.equal(noop.changed,false);
});
test('CSW03 same raw different structure history restores with fresh context and no source/public changes',()=>{
  const f=saved(),initial=f.data.spaces[f.actorId].creatorWorkspace!,entry=initial.savedHistory!.drafts[f.draftId][0],detached=ok(save(detach(f.data),'detach-save')).data;
  const p=previewProgramCreatorSavedRestore(detached,f.actorId,f.draftId,entry.id,null);assert(p.ok);
  const restored=ok(restoreProgramCreatorSavedRevision(detached,{actorId:f.actorId,requestId:'restore-structure',preview:p.value},null,LATER));
  const own=restored.data.spaces[f.actorId].creatorWorkspace!;assert.equal(own.library.records[f.draftId].recordRevision,1);assert.equal(own.structureDrafts![f.draftId].contextRevision,3);assert.deepEqual(own.working!.structure,f.structure);
  assert.deepEqual(restored.data.public,f.data.public);assert.deepEqual(restored.data.spaces[f.actorId].text,f.data.spaces[f.actorId].text);
  const twice=ok(restoreProgramCreatorSavedRevision(restored.data,{actorId:f.actorId,requestId:'restore-structure',preview:p.value},null,LATER));assert.equal(twice.changed,false);
});
test('CSW04 stale/missing captured structure rejects with original data and altered retry fingerprint',()=>{
  const f=saved(),detached=detach(f.data);const stale=save(detached,'wrong-expectation',LATER,f.structure);assert(!stale.ok);assert.equal(stale.data,detached);
  const own=detached.spaces[f.actorId].creatorWorkspace!,w=own.working!,action={type:'save' as const,draftId:f.draftId,title:w.title,rawText:w.rawText,sourceFingerprint:fp(w.rawText),expectedLibraryRevision:own.library.revision,expectedRecordRevision:1,now:LATER};
  assert(!applyProgramCreatorAction(detached,{actorId:f.actorId,requestId:'missing-expectation',action},LATER).ok);
  const good=ok(applyProgramCreatorAction(detached,{actorId:f.actorId,requestId:'context-receipt',action,expectedStructure:null},LATER));
  assert.equal(ok(applyProgramCreatorAction(good.data,{actorId:f.actorId,requestId:'context-receipt',action,expectedStructure:null},LATER)).changed,false);
  const altered=applyProgramCreatorAction(good.data,{actorId:f.actorId,requestId:'context-receipt',action,expectedStructure:f.structure},LATER);assert(!altered.ok);assert.equal(altered.reason,'duplicate-request');
});
test('CSW05 duplicate rebases pinned structure under new draft and copy context, never inherits native journal/handoff',()=>{
  const f=saved(),own=f.data.spaces[f.actorId].creatorWorkspace!,before=JSON.stringify(own),copy=ok(applyProgramCreatorAction(f.data,{actorId:f.actorId,requestId:'copy',action:{type:'duplicate',sourceDraftId:f.draftId,newDraftId:'structure-copy-draft',expectedLibraryRevision:own.library.revision,expectedSourceRecordRevision:1,now:LATER}},LATER)).data;
  const next=copy.spaces[f.actorId].creatorWorkspace!,context=next.structureDrafts!['structure-copy-draft'],s=context.structure!;
  assert.equal(context.copiedFromDraftId,f.draftId);assert.equal(context.contextRevision,1);assert.equal(s.draft.draftId,'structure-copy-draft');assert.equal(s.draft.templateVersion,f.structure.draft.templateVersion);assert.deepEqual(s.draft.values,f.structure.draft.values);assert.deepEqual(s.draft.groups,f.structure.draft.groups);
  assert.match(s.materialization!.transactionId,/^structure-copy-/);assert.notEqual(s.materialization!.transactionId,f.structure.materialization!.transactionId);assert.equal(next.handoffs['structure-copy-draft'],undefined);assert.equal(next.executionSources?.['structure-copy-draft'],undefined);assert.equal(JSON.stringify(own),before);
});
test('CSW06 forged/foreign context and history snapshot payload are rejected',()=>{
  const f=saved();for(const change of [(v:any)=>v.structureDrafts[f.draftId].contextRevision=0,(v:any)=>v.structureDrafts[f.draftId].recordRevision=2,(v:any)=>v.structureDrafts[f.draftId].structure.draft.draftId='foreign',(v:any)=>v.structureDrafts[f.draftId].extra='unknown',(v:any)=>v.savedHistory.drafts[f.draftId][0].context.structure.draft.schemaVersion='bad']){const d=programClone(f.data);change(d.spaces[f.actorId].creatorWorkspace);assert.equal(validateProgramData(d),false);}
});
test('CSW07 controller metadata save quota0, retry1, Undo/reload preserve paired source/form and protected original bytes',async()=>{
  const f=saved(),initial=detach(f.data),values=new Map<string,string>([['flow:source-sentinel',' exact operating raw ']]),writes:string[]=[];let fail=true;
  const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{if(fail)throw Error('quota');writes.push(k);values.set(k,v);},removeItem:()=>assert.fail('remove')};
  const c=createProgramController({initialData:initial,storage,exclusive:async run=>run()});assert(c.ok);
  assert(!(await c.mutate('폼 명시 저장',d=>save(d,'controller-context'),{actorId:f.actorId})).ok);assert.equal(writes.length,0);assert.deepEqual(c.snapshot().envelope.data,initial);
  fail=false;assert((await c.mutate('폼 명시 저장',d=>save(d,'controller-context'),{actorId:f.actorId})).ok);assert.deepEqual(writes,[PROGRAM_STATE_KEY]);const loaded=loadProgramStore(storage,validateProgramEnvelope);assert.equal(loaded.kind,'ready');if(loaded.kind!=='ready')return;assert(validateProgramEnvelope(loaded.envelope));assert.deepEqual(loaded.envelope,c.snapshot().envelope);
  assert((await c.undo(f.actorId)).ok);const undone=c.snapshot().envelope.data;
  // Whole-Program Undo intentionally retains request receipts; business owners restore.
  assert.deepEqual(undone.spaces,initial.spaces);assert.deepEqual(undone.public,initial.public);
  const reload=createProgramController({initialData:createProgramData(),storage,exclusive:async run=>run()});assert(reload.ok);assert.deepEqual(reload.snapshot().envelope.data,undone);assert.equal(values.get('flow:source-sentinel'),' exact operating raw ');
});
test('CSW08 rename/archive/restore retain pinned context and current record linkage',()=>{
  const f=saved();let data=f.data;
  for(const type of ['rename','archive','restore'] as const){const own=data.spaces[f.actorId].creatorWorkspace!,record=own.library.records[f.draftId];
    const base={draftId:f.draftId,expectedLibraryRevision:own.library.revision,expectedRecordRevision:record.recordRevision,now:LATER};
    const action=type==='rename'?{...base,type,title:'다른 이름'}:{...base,type};
    data=ok(applyProgramCreatorAction(data,{actorId:f.actorId,requestId:`lifecycle-${type}`,action},LATER)).data;
    const next=data.spaces[f.actorId].creatorWorkspace!;assert.deepEqual(next.structureDrafts![f.draftId].structure,f.structure);assert.equal(next.structureDrafts![f.draftId].contextRevision,1);assert.equal(next.structureDrafts![f.draftId].recordRevision,next.library.records[f.draftId].recordRevision);assert.deepEqual(next.working,creatorWorkingFromRecord(next,f.draftId));
  }
});
test('CSW09 source identity-only save and same-raw historical identity restore use context, not a fake source revision',()=>{
  const f=saved(),w=f.data.spaces[f.actorId].creatorWorkspace!.working!,entry=f.data.spaces[f.actorId].creatorWorkspace!.savedHistory!.drafts[f.draftId][0];
  const sourceIdentity=creatorSourceIdentity(w.rawText,w.rawText.replace(/\r\n?/g,'\n').split('\n').map((text,n)=>({id:`actual-source-line-${n}`,text})));
  const working=ok(setProgramCreatorWorking(f.data,{actorId:f.actorId,expectedWorking:w,working:{...w,sourceIdentity}},LATER)).data;
  const changed=ok(save(working,'identity-save')).data,own=changed.spaces[f.actorId].creatorWorkspace!;assert.equal(own.library.records[f.draftId].recordRevision,1);assert.equal(own.structureDrafts![f.draftId].contextRevision,2);assert.deepEqual(own.working!.sourceIdentity,sourceIdentity);
  const p=previewProgramCreatorSavedRestore(changed,f.actorId,f.draftId,entry.id,null);assert(p.ok);
  const restored=ok(restoreProgramCreatorSavedRevision(changed,{actorId:f.actorId,requestId:'identity-restore',preview:p.value},null,LATER)).data;
  assert.equal(restored.spaces[f.actorId].creatorWorkspace!.working!.sourceIdentity,undefined);assert.deepEqual(restored.spaces[f.actorId].creatorWorkspace!.working!.structure,f.structure);
});
