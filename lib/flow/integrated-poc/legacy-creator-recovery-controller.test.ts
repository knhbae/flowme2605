import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createProgramData} from './program-data';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {prepareLegacyCreatorRecoveryHandoff} from './legacy-creator-recovery-handoff';
import {commitLegacyCreatorRecoveryHandoff} from './legacy-creator-recovery-controller';
import type {ProgramMutate} from './ui-contract';
const NOW='2026-09-20T02:00:00.000Z';
function fixture(){
 const document=createTextAuthoringDocument('# 복구\n- [ ] 확인',{documentId:'doc-native',ownership:'creator',now:NOW});
 const raw=JSON.stringify({schemaVersion:1,drafts:{},recoveries:{'legacy-draft':{draftId:'legacy-draft',recoveryId:'actual-recovery',revisionId:document.revision.revisionId,document,activeStage:'input',recoveredAt:NOW}}}),data=createProgramData();
 const p=prepareLegacyCreatorRecoveryHandoff(data,{actorId:'local-user',requestId:'request-parent',targetDraftId:'creator-parent',selection:{draftId:'legacy-draft',recoveryId:'actual-recovery'},now:NOW},raw);assert(p.ok);return{data,raw,request:p.request};
}
test('LRP01 parent locks before exclusive read and never flushes, returns real transition result',async()=>{
 const f=fixture(),events:string[]=[];
 const mutate:ProgramMutate=async(label,build)=>{events.push('exclusive');assert.equal(label,'개발2 임시 작업 이어가기');const result=build(f.data);assert(result.ok);events.push('commit');return{ok:true,result:result.result,changed:result.changed};};
 const result=await commitLegacyCreatorRecoveryHandoff(f.request,{current:()=>f.data,blocked:()=>false,lockInput:()=>{events.push('lock');return()=>{events.push('release');};},mutate,readSource:()=>{events.push('read');return f.raw;}});
 assert(result.ok);assert.deepEqual(events,['lock','exclusive','read','commit','release']);
});
test('LRP02 parent pending input blocks before lock/read/mutate and retains input',async()=>{
 const f=fixture(),result=await commitLegacyCreatorRecoveryHandoff(f.request,{current:()=>f.data,blocked:()=>true,lockInput:()=>assert.fail('lock'),mutate:()=>assert.fail('mutate'),readSource:()=>assert.fail('read')});assert(!result.ok);assert.equal(result.reason,'pending-input');
});
test('LRP03 pending appears during lock: release only, no source read or transaction',async()=>{
 const f=fixture();let blocked=false,releases=0;
 const result=await commitLegacyCreatorRecoveryHandoff(f.request,{current:()=>f.data,blocked:()=>blocked,lockInput:()=>{blocked=true;return()=>{releases++;};},mutate:()=>assert.fail('mutate'),readSource:()=>assert.fail('read')});assert(!result.ok);assert.equal(releases,1);
});
test('LRP04 source changes in queue are read inside callback and rejected without changing data',async()=>{
 const f=fixture();let raw=f.raw,released=false;
 const mutate:ProgramMutate=async(_label,build)=>{raw+=' ';const result=build(f.data);assert(!result.ok);assert.equal(result.data,f.data);return{ok:false,reason:result.reason};};
 const result=await commitLegacyCreatorRecoveryHandoff(f.request,{current:()=>f.data,blocked:()=>false,lockInput:()=>()=>{released=true;},mutate,readSource:()=>raw});assert(!result.ok);assert.equal(result.reason,'conflict');assert(released);
});
test('LRP05 queued actor change rejects before original read',async()=>{
 const f=fixture();let current=f.data;
 const mutate:ProgramMutate=async(_label,build)=>{current={...f.data,activeActorId:'foreign'};const result=build(f.data);assert(!result.ok);return{ok:false,reason:result.reason};};
 const result=await commitLegacyCreatorRecoveryHandoff(f.request,{current:()=>current,blocked:()=>false,lockInput:()=>()=>{},mutate,readSource:()=>assert.fail('read')});assert(!result.ok);
});
test('LRP06 presentation pending is successful and not resubmitted by parent',async()=>{
 const f=fixture();let count=0,released=false;
 const result=await commitLegacyCreatorRecoveryHandoff(f.request,{current:()=>f.data,blocked:()=>false,lockInput:()=>()=>{released=true;},mutate:async()=>{count++;return{ok:true,result:f.request.targetDraftId,changed:true,presentationPending:true};},readSource:()=>f.raw});assert(result.ok&&result.presentationPending);assert.equal(count,1);assert(released);
});
test('LRP07 actual root wires explicit read/prepare/protected commit and library pending latch',()=>{
 const app=readFileSync(new URL('../../../components/flow/integrated-poc/ProgramApp.tsx',import.meta.url),'utf8');
 assert.match(app,/prepareLegacyCreatorRecoveryHandoff\(currentData/);assert.match(app,/handoff:request=>commitLegacyCreatorRecoveryHandoff/);assert.match(app,/readSource:\(\)=>window.localStorage.getItem\(LEGACY_CREATOR_RECOVERY_KEY\)/);assert.match(app,/blocked:recoveryInputBlocked,lockInput:lockEditors,mutate:scopedMutate/);
 const library=readFileSync(new URL('../../../components/flow/integrated-poc/ProgramCreatorDraftLibrary.tsx',import.meta.url),'utf8');assert.match(library,/ProgramLegacyCreatorRecovery \{\.\.\.recovery\}/);assert.match(library,/onPendingChange=\{value=>\{pending.current=value;setBusy\(value\);\}\}/);
});
test('LRP08 releasing UI lock failure never changes a confirmed successful receipt',async()=>{
 const f=fixture();const result=await commitLegacyCreatorRecoveryHandoff(f.request,{current:()=>f.data,blocked:()=>false,lockInput:()=>()=>{throw Error('release');},mutate:async()=>({ok:true,result:f.request.targetDraftId,changed:true}),readSource:()=>f.raw});assert(result.ok&&result.changed);
});
