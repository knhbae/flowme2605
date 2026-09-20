import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramData,validateProgramData } from './program-data';
import { programClone,PROGRAM_STATE_KEY,type ProgramData,type ProgramTransition } from './contract';
import { createProgramController } from './controller';
import { createTextAuthoringDocument } from './native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner } from './native-creator-document';
import { setProgramCreatorWorking,applyProgramCreatorAction,creatorWorkingFromRecord,handoffProgramCreatorDraft } from './creator-workspace';
import { applyProgramNativeCreatorOperation,buildProgramNativeCreatorRawSyncOperation } from './creator-native-workspace';
import { importNativeCreatorSavedHistory,previewProgramCreatorSavedRestore,restoreProgramCreatorSavedRevision } from './creator-history';
import { fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../personal-workspace-poc-authoring';
const NOW='2026-09-13T06:00:00.000Z',LATER='2026-09-13T06:01:00.000Z';
const RAW='# 원래 제작\r\n\r\n- [ ] 첫 항목\r\n  - 날짜: 2026-09-20\r\n- [ ] 둘째 항목';
function ok(r:ProgramTransition<string>){if(!r.ok)assert.fail(r.reason);assert(validateProgramData(r.data));return r;}
function save(data:ProgramData,id:string){const own=data.spaces[data.activeActorId].creatorWorkspace!,w=own.working!;return applyProgramCreatorAction(data,{actorId:data.activeActorId,requestId:id,expectedStructure:w.structure??null,expectedNativeDocument:w.nativeDocument??null,expectedNativeSelection:w.nativeSelection??null,action:{type:'save',draftId:w.draftId,title:w.title,rawText:w.rawText,sourceFingerprint:fp(w.rawText),expectedLibraryRevision:own.library.revision,...(w.baseRecordRevision?{expectedRecordRevision:w.baseRecordRevision}:{}),now:LATER}},LATER);}
function fixture(){let data=createProgramData();const actorId=data.activeActorId,draftId='program-native';
  const document=createTextAuthoringDocument(RAW,{documentId:'real-document',ownership:'creator',now:NOW,sourceUrl:'https://example.com/original',sourceTitle:'실제 원문',reviewRequirements:[{kind:'rights',reasonKey:'source-rights'}]});
  const source={storageKey:'flow:text-authoring:drafts:v1' as const,draftId:'original-draft',versionId:'original-save-a',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)};
  const native=createNativeCreatorDocumentOwner({id:draftId,source},NOW);assert(native.ok);
  data=ok(setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:{draftId,title:'제작',rawText:RAW,baseRecordRevision:null,nativeDocument:native.owner,nativeSelection:source}},NOW)).data;
  data=ok(save(data,'initial')).data;return{data,actorId,draftId,source};}
function operation(data:ProgramData,id:string,operation:Parameters<typeof applyProgramNativeCreatorOperation>[1]['operation']){const working=data.spaces[data.activeActorId].creatorWorkspace!.working!;return applyProgramNativeCreatorOperation(data,{actorId:data.activeActorId,requestId:id,draftId:working.draftId,expectedWorking:working,expectedOwner:working.nativeDocument!,operation},LATER);}

test('CNW01 same raw canonical exclude is saved as context and full context history restore, no fake source revision',()=>{
  const f=fixture(),before=programClone(f.data),own=f.data.spaces[f.actorId].creatorWorkspace!,initial=own.savedHistory!.drafts[f.draftId][0];
  f.data=ok(operation(f.data,'exclude',{type:'exclude',itemId:own.working!.nativeDocument!.document.parseResult.canonical.items[0].itemId})).data;
  f.data=ok(save(f.data,'save-exclude')).data;const current=f.data.spaces[f.actorId].creatorWorkspace!;
  assert.equal(current.library.records[f.draftId].recordRevision,1);assert.equal(current.structureDrafts![f.draftId].contextRevision,2);assert.equal(current.working!.rawText,RAW);
  assert.equal(current.working!.nativeDocument!.document.parseResult.canonical.items[0].included,false);
  const p=previewProgramCreatorSavedRestore(f.data,f.actorId,f.draftId,initial.id,null);assert(p.ok);assert.equal(p.value.mode,'full-document');
  const restored=ok(restoreProgramCreatorSavedRevision(f.data,{actorId:f.actorId,requestId:'restore',preview:p.value},null,LATER));
  assert.deepEqual(restored.data.spaces[f.actorId].creatorWorkspace!.working!.nativeDocument,before.spaces[f.actorId].creatorWorkspace!.working!.nativeDocument);
  assert.deepEqual(restored.data.public,before.public);assert.deepEqual(restored.data.spaces[f.actorId].text,before.spaces[f.actorId].text);
});
test('CNW02 pending input survives JSON reload, refuses save/structure/handoff, exact sync preserves requirements and origin',()=>{
  const f=fixture(),w=f.data.spaces[f.actorId].creatorWorkspace!.working!,pending=RAW+'\r\n- [ ] 새 항목';
  f.data=ok(setProgramCreatorWorking(f.data,{actorId:f.actorId,expectedWorking:w,working:{...w,nativePendingRawText:pending}},LATER)).data;
  f.data=JSON.parse(JSON.stringify(f.data));assert(validateProgramData(f.data));assert.equal(f.data.spaces[f.actorId].creatorWorkspace!.working!.nativePendingRawText,pending);
  assert(!save(f.data,'blocked').ok);assert(!operation(f.data,'block-operation',{type:'exclude',itemId:w.nativeDocument!.document.parseResult.canonical.items[0].itemId}).ok);
  assert(!handoffProgramCreatorDraft(f.data,{actorId:f.actorId,requestId:'handoff',draftId:f.draftId,expectedRecordRevision:1,today:'2026-09-13'},LATER).ok);
  const sync=buildProgramNativeCreatorRawSyncOperation(w.nativeDocument!,pending);assert(sync.ok);
  assert(!operation(f.data,'bad-gates',{...sync.operation,reviewRequirements:[]}).ok);
  f.data=ok(operation(f.data,'sync',sync.operation)).data;const next=f.data.spaces[f.actorId].creatorWorkspace!.working!;
  assert.equal(next.nativePendingRawText,undefined);assert.equal(next.rawText,pending);assert.equal(next.nativeDocument!.document.rawText,pending);
  assert.deepEqual(next.nativeDocument!.source,f.source);assert.equal(next.nativeDocument!.document.sourceUrl,'https://example.com/original');
  assert.equal(next.nativeDocument!.document.reviewGates![0].reasonKey,'source-rights');assert.equal(next.nativeDocument!.document.reviewGates![0].status,'required');
  assert.equal(next.nativeDocument!.document.reviewGates![0].sourceRowIds.length,next.nativeDocument!.document.parseResult.canonical.sourceRows.length);
});
test('CNW03 stale working, foreign actor, corrupt canonical and same-version tampering fail without writes',()=>{
  const f=fixture(),w=f.data.spaces[f.actorId].creatorWorkspace!.working!,op={type:'exclude' as const,itemId:w.nativeDocument!.document.parseResult.canonical.items[0].itemId};
  for(const input of [{actorId:'creator-minji',requestId:'foreign',draftId:f.draftId,expectedWorking:w,expectedOwner:w.nativeDocument!,operation:op},{actorId:f.actorId,requestId:'stale',draftId:f.draftId,expectedWorking:{...w,title:'stale'},expectedOwner:w.nativeDocument!,operation:op}]){const r=applyProgramNativeCreatorOperation(f.data,input,LATER);assert(!r.ok);assert.equal(r.data,f.data);}
  const bad=programClone(f.data);bad.spaces[f.actorId].creatorWorkspace!.working!.nativeDocument!.document.parseResult.canonical.items[0].included=false;assert(!validateProgramData(bad));
  assert(!setProgramCreatorWorking(f.data,{actorId:f.actorId,expectedWorking:w,working:{...w,rawText:RAW+'stale'}},LATER).ok);
});
test('CNW04 controller one native operation commit, quota retry, duplicate, Undo and reload leave protected source untouched',async()=>{
  const f=fixture(),values=new Map([['flow:text-authoring:drafts:v1',f.source.documentJson],['flow:sentinel',' unchanged ']]),writes:string[]=[];let quota=true;
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{if(quota)throw Error('quota');writes.push(key);values.set(key,value);},removeItem:(key:string)=>{throw Error(`unexpected remove ${key}`);}};
  const controller=createProgramController({initialData:f.data,storage,exclusive:async run=>run()});assert(controller.ok);
  const w=f.data.spaces[f.actorId].creatorWorkspace!.working!,input={actorId:f.actorId,requestId:'canonical',draftId:f.draftId,expectedWorking:w,expectedOwner:w.nativeDocument!,operation:{type:'exclude' as const,itemId:w.nativeDocument!.document.parseResult.canonical.items[0].itemId}};
  const build=(data:ProgramData)=>applyProgramNativeCreatorOperation(data,input,LATER);
  assert(!(await controller.mutate('구조 변경',build,{actorId:f.actorId})).ok);assert.deepEqual(writes,[]);assert.deepEqual(controller.snapshot().envelope.data,f.data);
  quota=false;assert((await controller.mutate('구조 변경',build,{actorId:f.actorId})).ok);assert.deepEqual(writes,[PROGRAM_STATE_KEY]);
  assert((await controller.mutate('중복',build,{actorId:f.actorId})).ok);assert.equal(writes.length,1);
  assert((await controller.undo(f.actorId)).ok);const reloaded=createProgramController({initialData:createProgramData(),storage,exclusive:async run=>run()});assert(reloaded.ok);
  assert.deepEqual(reloaded.snapshot().envelope.data.spaces,f.data.spaces);assert.equal(values.get('flow:sentinel'),' unchanged ');assert.equal(values.get('flow:text-authoring:drafts:v1'),f.source.documentJson);
});
test('CNW05 duplicate preserves immutable original IDs but creates a new owner and no handoff claim',()=>{
  const f=fixture(),own=f.data.spaces[f.actorId].creatorWorkspace!;
  const copied=ok(applyProgramCreatorAction(f.data,{actorId:f.actorId,requestId:'duplicate',action:{type:'duplicate',sourceDraftId:f.draftId,newDraftId:'program-copy',expectedLibraryRevision:own.library.revision,expectedSourceRecordRevision:1,now:LATER}},LATER));
  const context=copied.data.spaces[f.actorId].creatorWorkspace!.structureDrafts!['program-copy'];assert.equal(context.nativeDocument!.id,'program-copy');assert.deepEqual(context.nativeDocument!.source,f.source);assert.equal(context.copiedFromDraftId,f.draftId);
  assert.equal(copied.data.spaces[f.actorId].creatorWorkspace!.handoffs['program-copy'],undefined);
  assert.deepEqual(creatorWorkingFromRecord(copied.data.spaces[f.actorId].creatorWorkspace!,'program-copy')!.nativeSelection,f.source);
});
test('CNW06 opaque historical imports remain read-only when strict native codec is unsupported, never raw fallback success',()=>{
  const f=fixture(),doc=JSON.parse(f.source.documentJson);delete doc.inputKinds;
  const raw=JSON.stringify({schemaVersion:1,drafts:{'original-draft':{draftId:'original-draft',title:'원래',ownership:'creator',status:'draft',document:doc,revisionId:doc.revision.revisionId,history:[{versionId:'save',kind:'saved',savedAt:NOW,revisionId:doc.revision.revisionId,document:doc}]}},recoveries:{}});
  const data=createProgramData(),actorId=data.activeActorId,imported=ok(importNativeCreatorSavedHistory(data,{actorId,requestId:'import',draftId:'original-draft',expectedSpace:data.spaces[actorId],expectedRaw:raw},raw,LATER));
  const entry=imported.data.spaces[actorId].creatorWorkspace!.savedHistory!.drafts[imported.result][0];
  const preview=previewProgramCreatorSavedRestore(imported.data,actorId,imported.result,entry.id,raw);assert(!preview.ok);assert.equal(preview.reason,'unsupported-native-document-codec');
});
test('CNW07 identical document with distinct actual saved version changes only context, and saved selection is CAS protected',()=>{
  const f=fixture(),w=f.data.spaces[f.actorId].creatorWorkspace!.working!,selection={...f.source,versionId:'actual-save-b'};
  const next=ok(setProgramCreatorWorking(f.data,{actorId:f.actorId,expectedWorking:w,working:{...w,nativeSelection:selection}},LATER)).data;
  const saved=ok(save(next,'save-selection')).data,own=saved.spaces[f.actorId].creatorWorkspace!;
  assert.equal(own.library.records[f.draftId].recordRevision,1);assert.equal(own.structureDrafts![f.draftId].contextRevision,2);assert.deepEqual(own.working!.nativeDocument,w.nativeDocument);
  assert(!applyProgramCreatorAction(next,{actorId:f.actorId,requestId:'stale-selection',expectedStructure:null,expectedNativeDocument:w.nativeDocument,expectedNativeSelection:f.source,action:{type:'save',draftId:f.draftId,title:w.title,rawText:RAW,sourceFingerprint:fp(RAW),expectedLibraryRevision:own.library.revision,expectedRecordRevision:1,now:LATER}},LATER).ok);
});
test('CNW08 genuine identical saved versions restore exact source identity without a native document Undo action',()=>{
  const f=fixture(),doc=JSON.parse(f.source.documentJson),raw=JSON.stringify({schemaVersion:1,drafts:{'original-draft':{draftId:'original-draft',title:'원래',ownership:'creator',status:'draft',document:doc,revisionId:doc.revision.revisionId,
    history:['save-a','save-b'].map(versionId=>({versionId,kind:'saved',savedAt:NOW,revisionId:doc.revision.revisionId,document:doc}))}},recoveries:{}});
  const base=createProgramData(),actorId=base.activeActorId;let result=ok(importNativeCreatorSavedHistory(base,{actorId,requestId:'native-import',draftId:'original-draft',expectedSpace:base.spaces[actorId],expectedRaw:raw},raw,LATER));
  const draftId=result.result;
  for(const versionId of ['save-a','save-b']){const p=previewProgramCreatorSavedRestore(result.data,actorId,draftId,`native:original-draft:${versionId}`,raw);assert(p.ok);assert.equal(p.value.mode,'full-document');result=ok(restoreProgramCreatorSavedRevision(result.data,{actorId,requestId:`restore-${versionId}`,preview:p.value},raw,LATER));}
  const own=result.data.spaces[actorId].creatorWorkspace!,w=own.working!;const selection=w.nativeSelection,source=w.nativeDocument?.source;assert(selection&&'versionId' in selection);assert(source&&'versionId' in source);assert.equal(selection.versionId,'save-b');assert.equal(source.versionId,'save-a');assert.equal(w.nativeDocument!.actions.length,0);assert.equal(own.library.records[draftId].recordRevision,1);assert.equal(own.structureDrafts![draftId].contextRevision,2);
});
test('CNW09 native handoff is not silently reparsed and known version JSON cannot be redefined',()=>{
  const f=fixture(),w=f.data.spaces[f.actorId].creatorWorkspace!.working!;
  const handoff=handoffProgramCreatorDraft(f.data,{actorId:f.actorId,requestId:'handoff',draftId:f.draftId,expectedRecordRevision:1,today:'2026-09-13'},LATER);assert(!handoff.ok);assert.equal(handoff.data,f.data);
  const changed=JSON.parse(f.source.documentJson);changed.title='forged same version';
  assert(!setProgramCreatorWorking(f.data,{actorId:f.actorId,expectedWorking:w,working:{...w,nativeSelection:{...f.source,documentJson:JSON.stringify(changed)}}},LATER).ok);
  const pending=ok(setProgramCreatorWorking(f.data,{actorId:f.actorId,expectedWorking:w,working:{...w,nativePendingRawText:''}},LATER)).data;
  assert(validateProgramData(JSON.parse(JSON.stringify(pending))));assert(!save(pending,'empty-pending').ok);
});
