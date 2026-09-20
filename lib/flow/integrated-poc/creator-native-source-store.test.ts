import test from 'node:test';import assert from 'node:assert/strict';
import {createProgramData,validateProgramData} from './program-data';
import {PROGRAM_STATE_KEY,type ProgramData} from './contract';
import {createProgramController} from './controller';
import {setProgramCreatorWorking,applyProgramCreatorAction} from './creator-workspace';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createNativeCreatorDocumentOwner} from './native-creator-document';
import {createCreatorNativeSourceEnvelope} from './creator-native-source-update';
import {stageProgramNativeSourceUpdate,transitionProgramNativeSourceUpdate,readProgramNativeSourceUpdate} from './creator-native-source-store';
import {fingerprintPersonalWorkspacePocAuthoringSource as fp} from '../personal-workspace-poc-authoring';
import {textWorkspaceModel as M} from './text-workspace';
import {creatorSourceIdentity} from './creator-source-order';
const BASE='2026-09-12T17:00:00.000Z',AT='2026-09-12T18:00:00.000Z',NOW='2026-09-12T19:00:00.000Z',ID='native-source-store';
const RAW='# Original\n- [ ] Review\n  detail: old detail',INCOMING='# Original\n- [ ] Review updated\n  detail: new detail\n- [ ] New action';
function fixture(){
 let data=createProgramData();const actorId=data.activeActorId;
 const document=createTextAuthoringDocument(RAW,{documentId:'native-original',ownership:'creator',sourceTitle:'Local source',sourceUrl:'https://example.test/source',sourceExternalVersion:'a',now:BASE});
 const made=createNativeCreatorDocumentOwner({id:ID,source:{storageKey:'flow:text-authoring:drafts:v1',draftId:'d2-draft',versionId:'d2-saved-a',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)}},BASE);assert(made.ok);
 const working={draftId:ID,title:'Review source',rawText:RAW,baseRecordRevision:null,nativeDocument:made.owner,sourceIdentity:creatorSourceIdentity(RAW,RAW.split('\n').map((text,index)=>({id:`original-line-${index}`,text})))};
 const set=setProgramCreatorWorking(data,{actorId,expectedWorking:null,working},BASE);assert(set.ok);data=set.data;
 const save=applyProgramCreatorAction(data,{actorId,requestId:'save-initial',expectedNativeDocument:made.owner,expectedStructure:null,action:{type:'save',draftId:ID,title:working.title,rawText:RAW,sourceFingerprint:fp(RAW),expectedLibraryRevision:0,now:BASE}},BASE);assert(save.ok);data=save.data;
 const envelope=createCreatorNativeSourceEnvelope(made.owner,{rawText:INCOMING,externalVersion:'b',providedBy:'explicit-local-test',sourceOwnerClaim:'local example only',collectedAt:AT,receivedAt:AT});assert(envelope.ok);
 const candidateDocument=createTextAuthoringDocument(INCOMING,{documentId:document.documentId,ownership:'creator',sourceTitle:document.sourceTitle,sourceUrl:document.sourceUrl,sourceExternalVersion:'b',now:AT});
 const candidate={envelope:envelope.value,candidateDocument,matches:[{activeItemId:document.parseResult.canonical.items[0].itemId,incomingItemId:candidateDocument.parseResult.canonical.items[0].itemId,basis:'explicit' as const}]};
 return{data,actorId,candidate};
}
function head(data:ProgramData){const actorId=data.activeActorId,workspace=data.spaces[actorId].creatorWorkspace!;return{actorId,draftId:ID,expectedWorking:workspace.working,expectedSession:workspace.sourceUpdateSessions?.[ID]?.session??null};}
function stage(f=fixture()){const result=stageProgramNativeSourceUpdate(f.data,{...head(f.data),...f.candidate},AT);assert(result.ok,JSON.stringify(result.ok?{}:result.reason));return{...f,data:result.data};}
function run(data:ProgramData,event:Parameters<typeof transitionProgramNativeSourceUpdate>[1]['event'],requestId:string){const result=transitionProgramNativeSourceUpdate(data,{...head(data),event,requestId},NOW);assert(result.ok,JSON.stringify(result.ok?{}:result.reason));return result.data;}
function ready(){const f=stage();let data=f.data;const view=readProgramNativeSourceUpdate(data,f.actorId,ID);assert(view?.ok);for(const row of view.value.changes)data=run(data,{kind:'decision',changeId:row.changeId,decision:'use_incoming'},row.changeId);return{...f,data};}
const protectedLayers=(data:ProgramData)=>{const s=data.spaces[data.activeActorId],w=s.creatorWorkspace!;return JSON.stringify({public:data.public,text:s.text,library:w.library,saved:w.structureDrafts,handoffs:w.handoffs,other:Object.entries(data.spaces).filter(([id])=>id!==data.activeActorId)});};
test('NSS01 stage stores private candidate only; duplicate staging preserves decisions and original saved bytes',()=>{
 const f=fixture(),before=protectedLayers(f.data),working=JSON.stringify(head(f.data).expectedWorking),s=stage(f);assert.equal(protectedLayers(s.data),before);assert.equal(JSON.stringify(head(s.data).expectedWorking),working);
 const view=readProgramNativeSourceUpdate(s.data,f.actorId,ID);assert(view?.ok);const data=run(s.data,{kind:'decision',changeId:view.value.changes[0].changeId,decision:'keep_working'},'keep');
 const duplicate=stageProgramNativeSourceUpdate(data,{...head(data),...f.candidate},NOW);assert(duplicate.ok&&!duplicate.changed);assert.deepEqual(duplicate.data,data);
});
test('NSS02 apply and exact source Undo share one owner transaction without touching saved/public/execution layers',()=>{
 const f=ready(),before=protectedLayers(f.data),baseOwner=head(f.data).expectedWorking!.nativeDocument,applied=run(f.data,{kind:'apply'},'apply');assert.equal(protectedLayers(applied),before);assert.notDeepEqual(head(applied).expectedWorking!.nativeDocument,baseOwner);
 assert.equal(head(applied).expectedWorking!.rawText,head(applied).expectedWorking!.nativeDocument!.document.rawText);const repeated=transitionProgramNativeSourceUpdate(applied,{...head(applied),event:{kind:'apply'},requestId:'apply'},NOW);assert(repeated.ok&&!repeated.changed);
 const unrelated=structuredClone(applied);unrelated.spaces[f.actorId].text=M.addDocument(unrelated.spaces[f.actorId].text,{title:'Keep this personal document'});const personal=JSON.stringify(unrelated.spaces[f.actorId].text);
 const undone=run(unrelated,{kind:'undo'},'source-undo');assert.deepEqual(head(undone).expectedWorking,head(f.data).expectedWorking);assert.equal(JSON.stringify(undone.spaces[f.actorId].text),personal);assert(validateProgramData(undone));
 const capturedRetry=transitionProgramNativeSourceUpdate(applied,{...head(f.data),event:{kind:'apply'},requestId:'apply'},NOW);assert(capturedRetry.ok&&!capturedRetry.changed);
 const changedPayload=transitionProgramNativeSourceUpdate(applied,{...head(f.data),event:{kind:'reject'},requestId:'apply'},NOW);assert(!changedPayload.ok);
});
test('NSS03 controller quota leaves bytes unchanged; retry once and reload recover session+owner together',async()=>{
 const f=ready(),values=new Map([['flow:operating',' { "keep": 1 } ']]),writes:string[]=[];let fail=true;
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{if(fail)throw Error('quota');writes.push(key);values.set(key,value);},removeItem:()=>{throw Error('forbidden');}};
 const controller=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert(controller.ok);const input={...head(f.data),event:{kind:'apply' as const},requestId:'apply'},mutate=(data:ProgramData)=>transitionProgramNativeSourceUpdate(data,input,NOW);
 assert(!(await controller.mutate('Apply source',mutate,{actorId:f.actorId})).ok);assert.equal(writes.length,0);assert.deepEqual(controller.snapshot().envelope.data,f.data);
 fail=false;assert((await controller.mutate('Retry source',mutate,{actorId:f.actorId})).ok);assert.deepEqual(writes,[PROGRAM_STATE_KEY]);assert.equal(values.get('flow:operating'),' { "keep": 1 } ');
 const reloaded=createProgramController({initialData:f.data,storage,exclusive:async work=>work()});assert(reloaded.ok);assert.deepEqual(reloaded.snapshot(),controller.snapshot());assert((await reloaded.undo(f.actorId)).ok);assert.deepEqual(head(reloaded.snapshot().envelope.data).expectedWorking,head(f.data).expectedWorking);
});
test('NSS04 changed working/session, archived owner, pending raw and other actor are rejected without mutation',()=>{
 const f=ready(),captured=head(f.data);
 for(const change of [(d:ProgramData)=>{d.spaces[f.actorId].creatorWorkspace!.working!.title='later input';},(d:ProgramData)=>{const workspace=d.spaces[f.actorId].creatorWorkspace!,library=workspace.library;workspace.library={...library,records:{...library.records,[ID]:{...library.records[ID],status:'archived'}}};},(d:ProgramData)=>{d.spaces[f.actorId].creatorWorkspace!.working!.nativePendingRawText='not synchronized';},(d:ProgramData)=>{d.activeActorId=d.actors.find(a=>a.id!==f.actorId)!.id;}]){
  const data=structuredClone(f.data);change(data);const before=JSON.stringify(data),result=transitionProgramNativeSourceUpdate(data,{...captured,event:{kind:'apply'},requestId:'apply'},NOW);assert(!result.ok);assert.equal(JSON.stringify(data),before);
 }
});
test('NSS05 persisted cross-actor sessions, altered receipts and invented authority fields fail closed',()=>{
 const f=ready();for(const change of [(s:any)=>s.actorId='other',(s:any)=>s.authorityConstraint='allow',(s:any)=>s.permission=true,(s:any)=>s.events[0].changeId='other']){const data=structuredClone(f.data);change(data.spaces[f.actorId].creatorWorkspace!.sourceUpdateSessions![ID].session);assert(!validateProgramData(data));}
});
test('NSS06 defer focus and scroll survive reload; new candidate cannot silently replace unfinished decisions',()=>{
 const f=stage(),view=readProgramNativeSourceUpdate(f.data,f.actorId,ID);assert(view?.ok);let data=run(f.data,{kind:'focus',selectedChangeId:view.value.changes[0].changeId,scrollTop:320},'focus');data=run(data,{kind:'defer'},'defer');
 const read=readProgramNativeSourceUpdate(JSON.parse(JSON.stringify(data)),f.actorId,ID);assert(read?.ok);assert.equal(read.value.status,'deferred');assert.equal(read.value.scrollTop,320);
 const modified={...f.candidate,envelope:{...f.candidate.envelope,externalVersion:'different'}},blocked=stageProgramNativeSourceUpdate(data,{...head(data),...modified},NOW);assert(!blocked.ok);assert.equal(readProgramNativeSourceUpdate(data,f.actorId,ID)?.ok,true);
});
