import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData,validateProgramData,validateProgramEnvelope } from './program-data';
import { programClone,PROGRAM_STATE_KEY,type ProgramData } from './contract';
import { createProgramController } from './controller';
import { loadProgramStore } from './program-store';
import { decodeNativeCreatorHistory,readNativeCreatorHistory } from './creator-history-codec';
import { importNativeCreatorSavedHistory,previewProgramCreatorSavedRestore,restoreProgramCreatorSavedRevision } from './creator-history';
import { TEXT_AUTHORING_HISTORY_KEY } from './creator-history-contract';
import { setProgramCreatorWorking,applyProgramCreatorAction,handoffProgramCreatorDraft } from './creator-workspace';
import { fingerprintPersonalWorkspacePocAuthoringSource as fp } from '../personal-workspace-poc-authoring';
import { textWorkspaceModel as M } from './text-workspace';
import { createTextAuthoringDocument } from './native-creator-vendor/text-authoring/parser';

const NOW='2026-09-13T01:00:00.000Z',BEFORE='2026-09-12T01:00:00.000Z';
const A='# 옛 원문\r\n\r\n- [ ] 원래 준비\r\n  - 날짜: 2026-09-20\r\n';
const B='# 새 원문\n\n- [ ] 새 준비\n  - 날짜: 2026-09-22';
/** Genuine D2 factory output with explicit test source version IDs. */
export function nativeHistoryFixture(){
  const doc=(rawText:string,revisionId:string)=>{const value=createTextAuthoringDocument(rawText,{documentId:'native-document',ownership:'creator',title:'기존 제작',now:BEFORE});return {...value,revision:{...value.revision,revisionId}};};
  return JSON.stringify({schemaVersion:1,drafts:{'native-draft':{draftId:'native-draft',title:'기존 제작',ownership:'creator',status:'draft',document:doc(B,'revision-b'),revisionId:'revision-b',
    history:[{versionId:'save-a',kind:'saved',savedAt:BEFORE,revisionId:'revision-a',document:doc(A,'revision-a')},{versionId:'save-b',kind:'saved',savedAt:NOW,revisionId:'revision-b',document:doc(B,'revision-b')}] }},recoveries:{privateRecovery:{untouched:true}}});
}
function imported(){const raw=nativeHistoryFixture(),data=createProgramData();const input={actorId:data.activeActorId,requestId:'import-history',draftId:'native-draft',expectedSpace:data.spaces[data.activeActorId],expectedRaw:raw};
  const result=importNativeCreatorSavedHistory(data,input,raw,NOW);assert(result.ok);return{raw,data:result.data,draftId:result.result,input,original:data};}
function preview(f:ReturnType<typeof imported>){const actorId=f.data.activeActorId,entry=f.data.spaces[actorId].creatorWorkspace!.savedHistory!.drafts[f.draftId][0];const p=previewProgramCreatorSavedRestore(f.data,actorId,f.draftId,entry.id,f.raw);assert(p.ok);return p.value;}
function save(data:ProgramData,raw:string,id:string){const actorId=data.activeActorId,own=data.spaces[actorId].creatorWorkspace!,w=own.working!;const changed=setProgramCreatorWorking(data,{actorId,expectedWorking:w,working:{...w,rawText:raw,sourceIdentity:undefined}},NOW);
  // JSON DTOs never contain explicit undefined.
  if(!changed.ok){const working={...w,rawText:raw};delete working.sourceIdentity;const next=setProgramCreatorWorking(data,{actorId,expectedWorking:w,working},NOW);assert(next.ok);data=next.data;}else data=changed.data;
  const next=data.spaces[actorId].creatorWorkspace!,working=next.working!;
  const saved=applyProgramCreatorAction(data,{actorId,requestId:id,action:{type:'save',draftId:working.draftId,title:working.title,rawText:raw,sourceFingerprint:fp(raw),expectedLibraryRevision:next.library.revision,expectedRecordRevision:working.baseRecordRevision!,now:NOW}},NOW);assert(saved.ok);return saved.data;}
test('CH01 read-only codec reads actual IDs/order/raw and retains every saved document field; no recovery merge',()=>{
  const raw=nativeHistoryFixture(),calls:string[]=[];const read=readNativeCreatorHistory({getItem:key=>{calls.push(key);return raw;}});assert.equal(read.kind,'ready');if(read.kind!=='ready')return;
  assert.deepEqual(calls,[TEXT_AUTHORING_HISTORY_KEY]);assert.equal(read.records[0].history[0].rawText,A);const entry=read.records[0].history[0];assert(entry.kind==='text-authoring-v1');
  assert.deepEqual(JSON.parse(entry.origin.documentJson),JSON.parse(raw).drafts['native-draft'].history[0].document);assert.equal(read.records[0].history.length,2);
});
test('CH02 corrupt/version/duplicate/foreign document and mismatched revision fail closed',()=>{
  assert.equal(decodeNativeCreatorHistory(null).kind,'empty');assert.equal(decodeNativeCreatorHistory('{').kind,'corrupt');
  for(const alter of [(v:any)=>v.schemaVersion=2,(v:any)=>v.drafts['native-draft'].history.push(v.drafts['native-draft'].history[0]),(v:any)=>v.drafts['native-draft'].history[0].document.documentId='foreign',(v:any)=>v.drafts['native-draft'].history[0].revisionId='wrong']){const v=JSON.parse(nativeHistoryFixture());alter(v);assert.notEqual(decodeNativeCreatorHistory(JSON.stringify(v)).kind,'ready');}
  assert.equal(readNativeCreatorHistory({getItem:()=>{throw Error('denied');}}).kind,'unavailable');
});
test('CH03 import preserves original source and other documents/public, exact full native context and no inferred identity',()=>{
  const f=imported(),own=f.data.spaces[f.data.activeActorId].creatorWorkspace!;assert.equal(own.working!.rawText,B);assert.equal(own.working!.sourceIdentity,undefined);
  assert.deepEqual(f.data.public,f.original.public);assert.deepEqual(f.data.spaces[f.data.activeActorId].text,f.original.spaces[f.data.activeActorId].text);assert.equal(f.raw,nativeHistoryFixture());assert(validateProgramData(f.data));
  assert.equal(importNativeCreatorSavedHistory(f.data,f.input,f.raw,NOW).ok,true);
});
test('CH04 source raw CAS, stale space and actor fail without a transition',()=>{
  const f=imported();for(const input of [{...f.input,actorId:'other'},{...f.input,expectedRaw:f.raw+' '},{...f.input,expectedSpace:f.data.spaces[f.data.activeActorId]}]){
    const r=importNativeCreatorSavedHistory(f.original,input,f.raw,NOW);assert(!r.ok);assert.equal(r.data,f.original);}
});
test('CH05 explicit previous source restore creates a new Program save and retains old private/public facts',()=>{
  const f=imported();const linked=handoffProgramCreatorDraft(f.data,{actorId:f.data.activeActorId,requestId:'handoff',draftId:f.draftId,expectedRecordRevision:1,today:'2026-09-13'},NOW);assert(linked.ok);f.data=linked.data;
  const actorId=f.data.activeActorId,space=f.data.spaces[actorId],doc=M.getDocument(space.text,linked.result)!;space.text=M.editText(space.text,doc.id,M.raw(doc)+'\nprivate original note');
  const p=preview(f),before=programClone(f.data);const result=restoreProgramCreatorSavedRevision(f.data,{actorId,requestId:'restore',preview:p},f.raw,NOW);assert(result.ok);const own=result.data.spaces[actorId].creatorWorkspace!;
  assert.equal(own.working!.rawText,A);assert.equal(own.library.records[f.draftId].recordRevision,2);assert.deepEqual(own.handoffs,before.spaces[actorId].creatorWorkspace!.handoffs);assert.deepEqual(own.executionSources,before.spaces[actorId].creatorWorkspace!.executionSources);
  assert.deepEqual(result.data.spaces[actorId].text,before.spaces[actorId].text);assert.deepEqual(result.data.public,before.public);
  const again=restoreProgramCreatorSavedRevision(result.data,{actorId,requestId:'restore',preview:p},f.raw,NOW);assert(again.ok);assert(!again.changed);
});
test('CH06 changed source or preview tampering and private edits after comparison are atomic failures',()=>{
  const f=imported(),p=preview(f),actorId=f.data.activeActorId;
  const changed=programClone(f.data);changed.spaces[actorId].text=M.addDocument(changed.spaces[actorId].text,{title:'new private'});
  for(const [data,review,raw] of [[f.data,p,f.raw+' '],[changed,p,f.raw],[f.data,{...p,entry:{...p.entry,rawText:'tamper'}},f.raw]] as const){const r=restoreProgramCreatorSavedRevision(data,{actorId,requestId:'restore',preview:review},raw,NOW);assert(!r.ok);assert.equal(r.data,data);}
});
test('CH07 pending working input rejects preview and restore, no implicit autosave/discard',()=>{
  const f=imported(),p=preview(f),actorId=f.data.activeActorId,w=f.data.spaces[actorId].creatorWorkspace!.working!;
  const changed=setProgramCreatorWorking(f.data,{actorId,expectedWorking:w,working:{...w,rawText:B+'\nnot saved'}},NOW);assert(changed.ok);
  assert(!previewProgramCreatorSavedRestore(changed.data,actorId,f.draftId,p.entry.id,f.raw).ok);
  const restored=restoreProgramCreatorSavedRevision(changed.data,{actorId,requestId:'restore',preview:p},f.raw,NOW);assert(!restored.ok);assert.equal(restored.data,changed.data);
});
test('CH08 only actual Program saves form bounded history; native snapshots remain intact',()=>{
  const f=imported(),actorId=f.data.activeActorId,native=f.data.spaces[actorId].creatorWorkspace!.savedHistory!.drafts[f.draftId].filter(r=>r.kind==='text-authoring-v1');
  for(let n=0;n<7;n++)f.data=save(f.data,B+`\n변경${n}`,`save-${n}`);
  const rows=f.data.spaces[actorId].creatorWorkspace!.savedHistory!.drafts[f.draftId];assert.equal(rows.filter(r=>r.kind==='program').length,5);assert.deepEqual(rows.filter(r=>r.kind==='text-authoring-v1'),native);assert(validateProgramData(f.data));
});
test('CH09 stored validation rejects forged native context, oversized JSON and unknown fields',()=>{
  const f=imported();for(const change of [(r:any)=>r.origin.revisionId='foreign',(r:any)=>r.origin.documentJson='x'.repeat(2_000_001),(r:any)=>r.secret='field',(r:any)=>r.rawText='wrong']){const data=programClone(f.data),row=data.spaces[data.activeActorId].creatorWorkspace!.savedHistory!.drafts[f.draftId][0];change(row);assert.equal(validateProgramData(data),false);}
});
test('CH10 controller restore is one Program write; quota retry, duplicate, Undo and reload preserve source',async()=>{
  const f=imported(),values=new Map<string,string>([[TEXT_AUTHORING_HISTORY_KEY,f.raw],['flow:sentinel',' keep bytes ']]),writes:string[]=[];let fail=true;
  const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{writes.push(k);if(fail)throw Error('quota');values.set(k,v);},removeItem:(k:string)=>{throw Error(`unexpected remove ${k}`);}};
  const controller=createProgramController({initialData:f.data,storage,exclusive:async run=>run()});assert(controller.ok);const p=preview(f),actorId=f.data.activeActorId,input={actorId,requestId:'restore-controller',preview:p};
  const build=(data:ProgramData)=>restoreProgramCreatorSavedRevision(data,input,storage.getItem(TEXT_AUTHORING_HISTORY_KEY),NOW);
  assert(!(await controller.mutate('복구',build,{actorId})).ok);assert.equal(values.get(PROGRAM_STATE_KEY),undefined);assert.deepEqual(controller.snapshot().envelope.data,f.data);
  fail=false;writes.length=0;assert((await controller.mutate('복구',build,{actorId})).ok);assert.deepEqual(writes,[PROGRAM_STATE_KEY]);const loaded=loadProgramStore(storage,validateProgramEnvelope);assert.equal(loaded.kind,'ready');if(loaded.kind!=='ready')return;const saved=loaded.envelope;assert(validateProgramEnvelope(saved));assert.deepEqual(saved,controller.snapshot().envelope);assert.equal(saved.data.spaces[actorId].creatorWorkspace!.working!.rawText,A);
  assert((await controller.mutate('복구',build,{actorId})).ok);assert.equal(writes.length,1);
  assert((await controller.undo(actorId)).ok);const undone=JSON.parse(values.get(PROGRAM_STATE_KEY)!);assert.equal(undone.data.spaces[actorId].creatorWorkspace.working.rawText,B);assert.equal(values.get(TEXT_AUTHORING_HISTORY_KEY),f.raw);assert.equal(values.get('flow:sentinel'),' keep bytes ');
  const reload=createProgramController({initialData:createProgramData(),storage,exclusive:async run=>run()});assert(reload.ok);assert.deepEqual(reload.snapshot().envelope.data,undone.data);
});
