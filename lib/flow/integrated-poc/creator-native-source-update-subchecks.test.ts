import test from 'node:test';
import assert from 'node:assert/strict';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createAuthoringSourceUpdateCandidate} from './native-creator-vendor/text-authoring/source-update';
import {applyAuthoringOperation} from './native-creator-vendor/text-authoring/operations';
import {stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import {validateTextAuthoringDocument} from './native-creator-vendor/text-authoring/validation';
import {normalizeNativeSourceSubcheckProbe,clearAcceptedSubcheckSessionScheduleProperties,applyNativeSourceSubcheckResult} from './creator-native-source-update-subchecks';
import {normalizeNativeSourceRecurrenceProbe,applyNativeSourceRecurrenceResult} from './creator-native-source-update-recurrence';
import {replayNativeSourceApply} from './creator-native-source-update-apply';
import {createNativeCreatorDocumentOwner,applyNativeCreatorDocumentOperation,applyNativeCreatorSourceDecision,applyNativeCreatorSourceSession,validateNativeCreatorDocumentOwner,readNativeCreatorDocument,restoreNativeCreatorDocument} from './native-creator-document';
import {createCreatorNativeSourceEnvelope,stageCreatorNativeSourceCandidate,readCreatorNativeSourceSession,transitionCreatorNativeSourceSession,serializeCreatorNativeSourceSession,hydrateCreatorNativeSourceSession,validateCreatorNativeSourceSession} from './creator-native-source-update';
import type {NativeCreatorDocumentOwner,AuthoringCorrectionOperation} from './native-creator-document-contract';
import type {ProgramNativeSourceChange} from './creator-native-source-update-contract';

const NOW='2026-09-13T08:00:00.000Z';
const raw=(children='  - [ ] 여권 확인',time='09:30',repeat='')=>`# 여행 준비\n- [ ] 출발 전 확인\n  - 날짜: 2026-09-20\n  - 시간: ${time}\n  - 시간대: Asia/Seoul\n  - 설명: ${time==='09:30'?'이전 출발 확인 설명':'변경된 출발 확인 설명'}\n${repeat}${children}`;
const copy=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const same=(a:unknown,b:unknown)=>assert.equal(stableAuthoringJson(a),stableAuthoringJson(b));
function initial(source=raw()){
 const document=createTextAuthoringDocument(source,{documentId:'subcheck-source',ownership:'creator',sourceExternalVersion:'a',now:NOW});
 const result=createNativeCreatorDocumentOwner({id:'subcheck-owner',source:{storageKey:'flow:text-authoring:drafts:v1',draftId:'actual-draft',versionId:'actual-a',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)}},NOW);assert(result.ok);return result.owner;
}
function incoming(owner:NativeCreatorDocumentOwner,source:string,version='b'){
 const document=createTextAuthoringDocument(source,{documentId:owner.document.documentId,ownership:'creator',sourceExternalVersion:version,now:NOW});
 const candidate=createAuthoringSourceUpdateCandidate(document,{capturedAt:NOW,externalVersion:version,matches:[{activeItemId:owner.document.parseResult.canonical.items[0].itemId,incomingItemId:document.parseResult.canonical.items[0].itemId,basis:'explicit'}]});
 return{document,candidate};
}
function operation(owner:NativeCreatorDocumentOwner,op:AuthoringCorrectionOperation,id:string){const r=applyNativeCreatorDocumentOperation(owner,{expectedOwner:owner,requestId:id,operation:op},NOW);assert(r.ok,JSON.stringify(r));return r.owner;}
function stage(owner:NativeCreatorDocumentOwner,source:string,version='b'){const f=incoming(owner,source,version);return{...f,owner:operation(owner,{type:'stage_source_update',candidate:f.candidate},'stage-'+version)};}
function changes(owner:NativeCreatorDocumentOwner):ProgramNativeSourceChange[]{const s=owner.document.sourceState;assert(s&&s.status!=='current');return[...s.changes,...(owner.sourceRecurrences?.pending?.changes??[]),...(owner.sourceSubchecks?.pending?.changes??[])];}
function decide(owner:NativeCreatorDocumentOwner,children:'keep_working'|'use_incoming',id:string,other:'keep_working'|'use_incoming'='use_incoming'){
 for(const c of changes(owner)){const r=applyNativeCreatorSourceDecision(owner,{expectedOwner:owner,requestId:id+c.changeId,decision:{decisionVersion:1,changeId:c.changeId,decision:c.kind==='changed'&&c.field==='subchecks'?children:other}},NOW);assert(r.ok,JSON.stringify(r));owner=r.owner;}return owner;
}
function apply(owner:NativeCreatorDocumentOwner,id='apply'){
 const r=applyNativeCreatorSourceSession(owner,{expectedOwner:owner,requestId:id},NOW);
 if(!r.ok){
  const state=owner.document.sourceState;assert(state&&state.status!=='current');
  let probe=owner.sourceSubchecks?.pending?normalizeNativeSourceSubcheckProbe(owner.document,state.incoming):owner.document;
  if(owner.sourceRecurrences?.pending)probe=normalizeNativeSourceRecurrenceProbe(probe,state.incoming);
  let next=replayNativeSourceApply(probe,NOW,2);assert(next,'normalized source apply rejected');
  if(owner.sourceSubchecks?.pending)next=clearAcceptedSubcheckSessionScheduleProperties(owner.document,next);
  if(owner.sourceRecurrences?.pending)next=applyNativeSourceRecurrenceResult(owner.document,next,owner.sourceRecurrences).document;
  if(owner.sourceSubchecks?.pending)next=applyNativeSourceSubcheckResult(owner.document,next,owner.sourceSubchecks).document;
  assert(validateTextAuthoringDocument(next).valid,JSON.stringify({validation:validateTextAuthoringDocument(next),properties:next.parseResult.canonical.items[0].properties.map(p=>({key:p.key,owner:p.owner,value:p.value,rows:p.sourceRowIds})),beforeRows:owner.document.parseResult.canonical.sourceRows.map(r=>r.sourceRowId),candidateRows:state.incoming.parseResult.canonical.sourceRows.map(r=>r.sourceRowId)}));
 }
 assert(r.ok,JSON.stringify(r));return r.owner;
}
const item=(owner:NativeCreatorDocumentOwner)=>owner.document.parseResult.canonical.items[0];

test('NSS01 original rejection stays pinned; Program v2 stages the actual unchanged child with explicit whole-list comparison',()=>{
 const before=initial(),f=incoming(before,raw(undefined,'11:00'));
 assert.equal(item(before).subchecks![0].title,f.document.parseResult.canonical.items[0].subchecks![0].title);
 assert.notEqual(item(before).subchecks![0].subcheckId,f.document.parseResult.canonical.items[0].subchecks![0].subcheckId);
 const original=copy(before),candidate=copy(f.candidate);
 assert.throws(()=>applyAuthoringOperation(before.document,{type:'stage_source_update',candidate:f.candidate},{actorLane:'creator',now:NOW}),/unsupported semantic changes/);
 const staged=stage(before,raw(undefined,'11:00')).owner,action=staged.actions.at(-1);assert(action?.kind==='source-stage'&&action.stageVersion===2);
 same(item(staged),item(before));same(staged.document.rawText,before.document.rawText);same(before,original);same(f.candidate,candidate);
 const c=staged.sourceSubchecks!.pending!.changes[0];same(c.oldSourceValue,item(before).subchecks);same(c.userValue,item(before).subchecks);same(c.incomingSourceValue,f.document.parseResult.canonical.items[0].subchecks);assert.equal(c.state,'open');assert.equal(staged.sourceRecurrences,undefined);
 assert(validateNativeCreatorDocumentOwner(copy(staged)));assert(staged.document.sourceState?.status!=='current');same(staged.document.sourceState!.incoming,candidate);
});

test('NSS02 keep preserves actual child IDs and rows; next candidate uses true accepted source and explicit incoming replaces the whole list',()=>{
 const before=initial(),b=stage(before,raw('  - [x] 여권 갱신\n  - [ ] 표 확인','11:00')),kept=apply(decide(b.owner,'keep_working','b'));
 same(item(kept).subchecks,item(before).subchecks);same(kept.sourceSubchecks!.sourceLists[0].checks,b.document.parseResult.canonical.items[0].subchecks);assert.equal(item(kept).schedule?.time,'11:00');
 for(const id of item(before).subchecks![0].sourceRowIds){assert(item(kept).sourceRowIds.includes(id));const row=kept.document.parseResult.canonical.sourceRows.find(r=>r.sourceRowId===id);assert(row);assert.equal(row.state,'tombstone');assert(row.sourceSnapshotId);}
 const c=stage(kept,raw('  - [ ] 새로운 확인','12:00'),'c'),diff=c.owner.sourceSubchecks!.pending!.changes[0];same(diff.oldSourceValue,b.document.parseResult.canonical.items[0].subchecks);same(diff.userValue,item(before).subchecks);
 const accepted=apply(decide(c.owner,'use_incoming','c'),'apply-c');same(item(accepted).subchecks,c.document.parseResult.canonical.items[0].subchecks);assert(!item(accepted).subchecks!.some(check=>check.subcheckId===item(before).subchecks![0].subcheckId));
 assert(readNativeCreatorDocument(copy(accepted)).ok);assert.equal(accepted.source.documentJson,before.source.documentJson);
 const undo=operation(accepted,{type:'undo'},'undo-c');same(undo.document.parseResult.canonical,c.owner.document.parseResult.canonical);same(undo.sourceSubchecks,c.owner.sourceSubchecks&&decide(c.owner,'use_incoming','c').sourceSubchecks);
 assert('versionId' in before.source);const restored=restoreNativeCreatorDocument(accepted,{expectedOwner:accepted,requestId:'restore-a',source:before.source},NOW);assert(restored.ok);assert.equal(restored.owner.sourceSubchecks,undefined);same(item(restored.owner),item(before));
});

test('NSS03 additions/removal and duplicate titles never infer child identity; retained absence does not resurrect',()=>{
 const empty=initial(raw('')),added=stage(empty,raw('  - [ ] 같은 이름\n  - [ ] 같은 이름','11:00'));
 const c=added.owner.sourceSubchecks!.pending!.changes[0];assert.equal(c.oldSourceValue,null);assert.equal(c.userValue,null);assert.equal(c.incomingSourceValue!.length,2);assert.notEqual(c.incomingSourceValue![0].subcheckId,c.incomingSourceValue![1].subcheckId);
 const kept=apply(decide(added.owner,'keep_working','keep'));assert.equal(item(kept).subchecks,undefined);
 const accepted=apply(decide(stage(kept,raw('  - [ ] 新 원문','12:00'),'c').owner,'use_incoming','accept'),'apply-c');assert.equal(item(accepted).subchecks!.length,1);
 const removed=stage(accepted,raw('','13:00'),'d'),removedKeep=apply(decide(removed.owner,'keep_working','keep-remove'),'keep-d');same(item(removedKeep).subchecks,item(accepted).subchecks);assert.equal(removedKeep.sourceSubchecks!.sourceLists[0].checks,null);
 const deleted=apply(decide(removed.owner,'use_incoming','accept-remove'),'accept-d');assert.equal(item(deleted).subchecks,undefined);assert(readNativeCreatorDocument(deleted).ok);
});

test('NSS04 unresolved, forged rows/decisions/sidecar, stale expected owner and unrelated unsupported semantics fail closed',()=>{
 const before=initial(),f=stage(before,raw(undefined,'11:00'));
 assert(!applyNativeCreatorSourceSession(f.owner,{expectedOwner:f.owner,requestId:'unresolved'},NOW).ok);
 const decided=decide(f.owner,'keep_working','choose');
 assert(!applyNativeCreatorSourceSession(decided,{expectedOwner:before,requestId:'stale'},NOW).ok);
 for(const alter of [(o:NativeCreatorDocumentOwner)=>{o.sourceSubchecks!.pending!.changes[0].incomingSourceValue![0].title='forged';},(o:NativeCreatorDocumentOwner)=>{delete o.sourceSubchecks;},(o:NativeCreatorDocumentOwner)=>{o.sourceSubchecks!.sourceLists[0].checks![0].subcheckId='forged';},(o:NativeCreatorDocumentOwner)=>{o.document.parseResult.canonical.items[0].subchecks![0].title='forged';}]){const bad=copy(decided);alter(bad);assert(!validateNativeCreatorDocumentOwner(bad));}
 for(const alter of [(c:ReturnType<typeof incoming>['candidate'])=>{c.parseResult.canonical.items[0].subchecks![0].sourceRowIds=['unknown'];},(c:ReturnType<typeof incoming>['candidate'])=>{(c.parseResult.canonical.items[0].subchecks![0] as any).extra='do not silently strip';},(c:ReturnType<typeof incoming>['candidate'])=>{c.parseResult.canonical.items[0].intent='act';},(c:ReturnType<typeof incoming>['candidate'])=>{c.parseResult.canonical.items[0].subchecks![0].title='forged';},(c:ReturnType<typeof incoming>['candidate'])=>{c.parseResult.canonical.items[0].subchecks![0].sourceChecked=true;},(c:ReturnType<typeof incoming>['candidate'])=>{c.parseResult.canonical.items[0].subchecks![0].subcheckId='forged';}]){
  const c=incoming(before,raw(undefined,'11:00')).candidate;alter(c);assert(!applyNativeCreatorDocumentOperation(before,{expectedOwner:before,requestId:'bad',operation:{type:'stage_source_update',candidate:c}},NOW).ok);
 }
 const unrelated=incoming(before,raw(undefined,'11:00').replace('# 여행 준비','# 다른 Flow'));
 assert(!applyNativeCreatorDocumentOperation(before,{expectedOwner:before,requestId:'other',operation:{type:'stage_source_update',candidate:unrelated.candidate}},NOW).ok);
 const rejected=operation(decided,{type:'reject_source_update'},'reject');assert.equal(rejected.sourceSubchecks?.pending,undefined);same(item(rejected),item(before));
});

test('NSS05 mixed recurrence and subchecks retain independent source facts, absence choices and real native Undo',()=>{
 const before=initial(),b=stage(before,raw('  - [ ] 새 하위 확인','11:00','  - 반복: 매일\n  - 반복 종료: 3회\n'));
 assert(b.owner.sourceRecurrences?.pending?.changes.length);assert(b.owner.sourceSubchecks?.pending?.changes.length);
 const kept=apply(decide(b.owner,'keep_working','keep','keep_working'));
 same(item(kept).subchecks,item(before).subchecks);assert.equal(item(kept).recurrence,undefined);assert.equal(item(kept).schedule?.time,'09:30');assert(readNativeCreatorDocument(kept).ok);
 const c=stage(kept,raw('  - [x] 마지막 확인','12:00','  - 반복: 매일\n  - 반복 종료: 5회\n'),'c'),accepted=apply(decide(c.owner,'use_incoming','accept'),'c-apply');
 assert(item(accepted).recurrence);same(item(accepted).subchecks,c.document.parseResult.canonical.items[0].subchecks);
 assert.equal(item(accepted).schedule?.time,'12:00');assert(!item(accepted).properties.some(p=>p.owner==='creator'&&p.key==='time'));
 assert(validateNativeCreatorDocumentOwner(copy(accepted)));
 const undo=operation(accepted,{type:'undo'},'undo'),beforeApply=decide(c.owner,'use_incoming','accept');same(undo.document.parseResult.canonical,beforeApply.document.parseResult.canonical);same(undo.sourceSubchecks,beforeApply.sourceSubchecks);same(undo.sourceRecurrences,beforeApply.sourceRecurrences);
});

test('NSS06 real source session includes explicit child decision, defer/reload/apply receipt and source Undo; authority and tampering stay guarded',()=>{
 const base=initial(),f=incoming(base,raw(undefined,'11:00')),authority={actorId:'creator',draftId:base.id,lane:'creator' as const,permission:true,archived:false};
 const envelope=createCreatorNativeSourceEnvelope(base,{rawText:f.document.rawText,externalVersion:'b',providedBy:'actual parser fixture',sourceOwnerClaim:'creator',collectedAt:NOW,receivedAt:NOW});assert(envelope.ok);
 const started=stageCreatorNativeSourceCandidate(base,{envelope:envelope.value,candidateDocument:f.document,matches:f.candidate.matches,authority},NOW);assert(started.ok,JSON.stringify(started));let session=started.value,owner=base;
 function event(value:Parameters<typeof transitionCreatorNativeSourceSession>[2]['event'],id:string){const result=transitionCreatorNativeSourceSession(session,owner,{expectedSession:session,requestId:id,event:value,authority},NOW);assert(result.ok,JSON.stringify(result));session=result.value.session;owner=result.value.owner;}
 event({kind:'defer'},'defer');const read=readCreatorNativeSourceSession(session,owner,authority);assert(read.ok);assert.equal(read.value.status,'deferred');assert(read.value.changes.some(c=>c.kind==='changed'&&c.field==='subchecks'));
 for(const c of read.value.changes)event({kind:'decision',changeId:c.changeId,decision:c.kind==='changed'&&c.field==='subchecks'?'keep_working':'use_incoming'},'choose-'+c.changeId);
 assert(!transitionCreatorNativeSourceSession(session,owner,{expectedSession:session,requestId:'denied',event:{kind:'apply'},authority:{...authority,permission:false}},NOW).ok);
 event({kind:'apply'},'apply');same(item(owner).subchecks,item(base).subchecks);assert.equal(item(owner).schedule?.time,'11:00');
 const serialized=serializeCreatorNativeSourceSession(session);assert(serialized.ok);const hydrated=hydrateCreatorNativeSourceSession(serialized.value);assert(hydrated.ok);assert(validateCreatorNativeSourceSession(hydrated.value));
 const altered=copy(session),applied=altered.events.find(e=>e.kind==='apply');assert(applied?.kind==='apply');applied.receipt.decisionSetHash='forged';assert(!validateCreatorNativeSourceSession(altered));
 event({kind:'undo'},'undo');same(owner,base);assert(validateCreatorNativeSourceSession(copy(session)));
});
