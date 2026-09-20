import test from 'node:test';import assert from 'node:assert/strict';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createAuthoringSourceUpdateCandidate} from './native-creator-vendor/text-authoring/source-update';
import {applyAuthoringOperation} from './native-creator-vendor/text-authoring/operations';
import {stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import {createNativeCreatorDocumentOwner,applyNativeCreatorDocumentOperation,applyNativeCreatorSourceDecision,applyNativeCreatorSourceSession,validateNativeCreatorDocumentOwner,readNativeCreatorDocument,restoreNativeCreatorDocument} from './native-creator-document';
import {createCreatorNativeSourceEnvelope,stageCreatorNativeSourceCandidate,readCreatorNativeSourceSession,transitionCreatorNativeSourceSession,validateCreatorNativeSourceSession,serializeCreatorNativeSourceSession,hydrateCreatorNativeSourceSession} from './creator-native-source-update';
import type {NativeCreatorDocumentOwner,TextAuthoringDocument,AuthoringCorrectionOperation} from './native-creator-document-contract';
import type {ProgramNativeSourceChange,CreatorNativeSourceSession} from './creator-native-source-update-contract';
import {createProgramData,validateProgramData} from './program-data';
import {setProgramCreatorWorking,applyProgramCreatorAction} from './creator-workspace';
import {stageProgramNativeSourceUpdate,transitionProgramNativeSourceUpdate,readProgramNativeSourceUpdate} from './creator-native-source-store';
import {createProgramController} from './controller';
import {PROGRAM_STATE_KEY,type ProgramData} from './contract';
import {fingerprintPersonalWorkspacePocAuthoringSource} from '../personal-workspace-poc-authoring';
const NOW='2026-09-13T08:00:00.000Z',RAW='# Absent\n- [ ] Work';
const raw=(count=3,date='2026-09-20')=>RAW+`\n  date: ${date}\n  time: 10:00\n  timezone: Asia/Seoul\n  repeat: 매일\n  repeat_end: ${count}회\n  completion: SOURCE COMPLETION`;
const copy=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const same=(a:unknown,b:unknown)=>assert.equal(stableAuthoringJson(a),stableAuthoringJson(b));
function initial(source=RAW){const doc=createTextAuthoringDocument(source,{documentId:'recurrence-source-doc',ownership:'creator',sourceExternalVersion:'a',now:NOW}),result=createNativeCreatorDocumentOwner({id:'recurrence-source-owner',source:{storageKey:'flow:text-authoring:drafts:v1',draftId:'saved-source',versionId:'genuine-a',revisionId:doc.revision.revisionId,documentJson:JSON.stringify(doc)}},NOW);assert(result.ok);return result.owner;}
function incoming(owner:NativeCreatorDocumentOwner,source:string,version='b'){const doc=createTextAuthoringDocument(source,{documentId:owner.document.documentId,ownership:'creator',sourceExternalVersion:version,now:NOW}),candidate=createAuthoringSourceUpdateCandidate(doc,{capturedAt:NOW,externalVersion:version,matches:[{activeItemId:owner.document.parseResult.canonical.items[0].itemId,incomingItemId:doc.parseResult.canonical.items[0].itemId,basis:'explicit'}]});return{doc,candidate};}
function changes(owner:NativeCreatorDocumentOwner):ProgramNativeSourceChange[]{const state=owner.document.sourceState;assert(state&&state.status!=='current');return[...state.changes,...(owner.sourceRecurrences?.pending?.changes??[])];}
function operation(owner:NativeCreatorDocumentOwner,op:AuthoringCorrectionOperation,id:string){const r=applyNativeCreatorDocumentOperation(owner,{expectedOwner:owner,requestId:id,operation:op},NOW);assert(r.ok,JSON.stringify(r));return r.owner;}
function stage(owner:NativeCreatorDocumentOwner,source:string,version='b'){const f=incoming(owner,source,version);return{...f,owner:operation(owner,{type:'stage_source_update',candidate:f.candidate},'stage-'+version)};}
function decide(owner:NativeCreatorDocumentOwner,decision:'keep_working'|'use_incoming',prefix:string,recurrence?:'keep_working'|'use_incoming'){for(const change of changes(owner)){const r=applyNativeCreatorSourceDecision(owner,{expectedOwner:owner,requestId:prefix+change.changeId,decision:{decisionVersion:1,changeId:change.changeId,decision:change.kind==='changed'&&change.field==='recurrence'&&recurrence?recurrence:decision}},NOW);assert(r.ok,JSON.stringify(r));owner=r.owner;}return owner;}
function apply(owner:NativeCreatorDocumentOwner,id='apply'){const r=applyNativeCreatorSourceSession(owner,{expectedOwner:owner,requestId:id},NOW);assert(r.ok,JSON.stringify(r));return r.owner;}
function projected(owner:NativeCreatorDocumentOwner){const r=readNativeCreatorDocument(owner);assert(r.ok,JSON.stringify(r));return r;}

test('NSR01 pinned vendor rejection reproduced; Program exact recurrence/end stage preserves candidate and working bytes',()=>{
 const before=initial(),f=incoming(before,raw()),original=stableAuthoringJson(before),candidate=stableAuthoringJson(f.candidate);
 assert.throws(()=>applyAuthoringOperation(before.document,{type:'stage_source_update',candidate:f.candidate},{actorLane:'creator',now:NOW}),/unsupported semantic changes/);
 const staged=stage(before,raw()).owner;
 assert.equal(staged.actions.at(-1)?.kind,'source-stage');assert.equal(staged.sourceRecurrences?.pending?.changes.length,1);
 const change=staged.sourceRecurrences!.pending!.changes[0];assert.equal(change.oldSourceValue,null);assert.equal(change.userValue,null);same(change.incomingSourceValue,f.doc.parseResult.canonical.items[0].recurrence);
 same(staged.document.parseResult.canonical,before.document.parseResult.canonical);assert.equal(stableAuthoringJson(before),original);assert.equal(stableAuthoringJson(f.candidate),candidate);
 assert(staged.document.sourceState?.status!=='current');same(staged.document.sourceState!.incoming,f.candidate);assert(validateNativeCreatorDocumentOwner(copy(staged)));
});
test('NSR02 keep absence followed by genuine second candidate retains exact typed baselines without recurrence/property resurrection',()=>{
 const before=initial(),b=stage(before,raw()),after=apply(decide(b.owner,'keep_working','keep-b'));
 const read=projected(after),item=read.document.parseResult.canonical.items[0];assert.equal(item.schedule,undefined);assert.equal(item.recurrence,undefined);assert.equal(item.completion,undefined);assert(!item.properties.some(p=>['repeat','repeat_end','completion','date','time','timezone'].includes(p.key)));assert.equal(read.projection.artifacts.calendar.rows.length,0);
 same(after.sourceRecurrences!.sourceRules[0].rule,b.doc.parseResult.canonical.items[0].recurrence);assert.equal(after.sourceRecurrences!.sourceRules[0].workingRule,null);assert.equal(after.source.documentJson,before.source.documentJson);
 const c=stage(after,raw(5,'2026-09-21'),'c'),change=c.owner.sourceRecurrences!.pending!.changes[0];same(change.oldSourceValue,b.doc.parseResult.canonical.items[0].recurrence);assert.equal(change.userValue,null);same(change.incomingSourceValue,c.doc.parseResult.canonical.items[0].recurrence);
 const twice=apply(decide(c.owner,'keep_working','keep-c'),'apply-c');assert.equal(projected(twice).projection.artifacts.calendar.rows.length,0);assert(validateNativeCreatorDocumentOwner(copy(twice)));
 const undo=operation(twice,{type:'undo'},'undo-c');same(undo.document.parseResult.canonical,c.owner.document.parseResult.canonical);assert.equal(undo.sourceRecurrences?.pending?.changes[0].incomingSourceValue?.end?.mode,'count');same(undo.sourceRecurrences?.sourceRules,after.sourceRecurrences?.sourceRules);
});
test('NSR03 incoming recurrence uses real finite projection; end-only change independently compares and keeps working rule',()=>{
 const b=stage(initial(),raw()),accepted=apply(decide(b.owner,'use_incoming','accept-b'));
 const dates=projected(accepted).projection.artifacts.calendar.rows.map(row=>row.date);assert.deepEqual(dates,['2026-09-20','2026-09-21','2026-09-22']);
 const c=stage(accepted,raw(5),'c'),rec=c.owner.sourceRecurrences!.pending!.changes[0];assert.equal(rec.oldSourceValue?.end?.mode,'count');assert.equal(rec.userValue?.end?.mode,'count');assert.equal(rec.incomingSourceValue?.end?.mode,'count');
 assert(!changes(c.owner).some(change=>change.kind==='changed'&&change.field==='schedule'));
 const kept=apply(decide(c.owner,'use_incoming','accept-c','keep_working'),'apply-c');assert.deepEqual(projected(kept).projection.artifacts.calendar.rows.map(row=>row.date),dates);same(kept.sourceRecurrences!.sourceRules[0].rule,c.doc.parseResult.canonical.items[0].recurrence);same(kept.sourceRecurrences!.sourceRules[0].workingRule,b.doc.parseResult.canonical.items[0].recurrence);
 const keptItem=kept.document.parseResult.canonical.items[0];for(const id of keptItem.recurrence!.sourceRowIds){assert(keptItem.sourceRowIds.includes(id));assert(kept.document.parseResult.canonical.sourceRows.some(row=>row.sourceRowId===id));}
 const d=stage(kept,raw(7),'d'),next=d.owner.sourceRecurrences!.pending!.changes[0];same(next.oldSourceValue,c.doc.parseResult.canonical.items[0].recurrence);same(next.userValue,b.doc.parseResult.canonical.items[0].recurrence);
 const adopted=apply(decide(d.owner,'use_incoming','accept-d'),'apply-d');assert.equal(projected(adopted).projection.artifacts.calendar.rows.length,7);assert(!Object.hasOwn(adopted.sourceRecurrences!.sourceRules[0],'workingRule'));
 const source=initial().source;assert('versionId' in source);const restored=restoreNativeCreatorDocument(adopted,{expectedOwner:adopted,requestId:'restore-a',source},NOW);assert(restored.ok);assert.equal(restored.owner.sourceRecurrences,undefined);
});
test('NSR04 unresolved recurrence, stale current edit, malformed match, unrelated semantics and forged derived state fail closed',()=>{
 const base=initial(),f=stage(base,raw());let ordinary=f.owner;
 for(const c of changes(ordinary).filter(c=>c.kind!=='changed'||c.field!=='recurrence')){const r=applyNativeCreatorSourceDecision(ordinary,{expectedOwner:ordinary,requestId:'normal-'+c.changeId,decision:{decisionVersion:1,changeId:c.changeId,decision:'use_incoming'}},NOW);assert(r.ok);ordinary=r.owner;}
 assert(!applyNativeCreatorSourceSession(ordinary,{expectedOwner:ordinary,requestId:'unresolved'},NOW).ok);
 const decided=decide(f.owner,'use_incoming','all'),bad=copy(decided);bad.sourceRecurrences!.pending!.changes[0].incomingSourceValue!.interval=77;assert(!validateNativeCreatorDocumentOwner(bad));
 const missing=copy(decided);delete missing.sourceRecurrences;assert(!validateNativeCreatorDocumentOwner(missing));
 const changed=operation(decided,{type:'set_property',itemId:decided.document.parseResult.canonical.items[0].itemId,key:'repeat',value:'매주 월요일'},'new-working');assert(!applyNativeCreatorSourceSession(changed,{expectedOwner:changed,requestId:'old-comparison'},NOW).ok);
 const duplicate=incoming(base,raw());duplicate.candidate.matches.push({...duplicate.candidate.matches[0]});assert(!applyNativeCreatorDocumentOperation(base,{expectedOwner:base,requestId:'duplicate',operation:{type:'stage_source_update',candidate:{...duplicate.candidate,matches:[...duplicate.candidate.matches,{activeItemId:duplicate.candidate.matches[0].activeItemId,incomingItemId:'unknown',basis:'explicit'}]}}},NOW).ok);
 const unrelated=incoming(base,raw().replace('# Absent','# A different Flow'));assert(!applyNativeCreatorDocumentOperation(base,{expectedOwner:base,requestId:'other-semantics',operation:{type:'stage_source_update',candidate:unrelated.candidate}},NOW).ok);
 const tampered=incoming(base,raw());tampered.candidate.rawText+=' forged';assert(!applyNativeCreatorDocumentOperation(base,{expectedOwner:base,requestId:'tampered',operation:{type:'stage_source_update',candidate:tampered.candidate}},NOW).ok);
 for(const alter of [(i:any)=>i.recurrence.interval=99,(i:any)=>i.recurrence.end.count=99,(i:any)=>i.recurrence.sourceRowIds=['unknown-source-row'],(i:any)=>i.recurrence.unrecognized=true]){const bad=incoming(base,raw());alter(bad.candidate.parseResult.canonical.items[0]);assert(!applyNativeCreatorDocumentOperation(base,{expectedOwner:base,requestId:'bad-rule',operation:{type:'stage_source_update',candidate:bad.candidate}},NOW).ok);}
});
test('NSR05 session recurrence choices survive defer/reentry, exact receipt/reload/Undo and fresh authority/CAS checks',()=>{
 const base=initial(),f=incoming(base,raw()),authority={actorId:'creator-a',draftId:base.id,lane:'creator' as const,permission:true,archived:false};
 const envelope=createCreatorNativeSourceEnvelope(base,{rawText:f.doc.rawText,externalVersion:'b',providedBy:'explicit local fixture',sourceOwnerClaim:'creator',collectedAt:NOW,receivedAt:NOW});assert(envelope.ok);
 const start=stageCreatorNativeSourceCandidate(base,{envelope:envelope.value,candidateDocument:f.doc,matches:f.candidate.matches,authority},NOW);assert(start.ok,JSON.stringify(start));let session=start.value,owner=base;
 function event(value:Parameters<typeof transitionCreatorNativeSourceSession>[2]['event'],id:string){const r=transitionCreatorNativeSourceSession(session,owner,{expectedSession:session,requestId:id,event:value,authority},NOW);assert(r.ok,JSON.stringify(r));session=r.value.session;owner=r.value.owner;return r;}
 event({kind:'defer'},'defer');const view=readCreatorNativeSourceSession(session,owner,authority);assert(view.ok);assert.equal(view.value.status,'deferred');assert(view.value.changes.some(c=>c.kind==='changed'&&c.field==='recurrence'));
 for(const c of view.value.changes)event({kind:'decision',changeId:c.changeId,decision:'keep_working'},'choose-'+c.changeId);
 const before=copy(session);assert(!transitionCreatorNativeSourceSession(session,owner,{expectedSession:session,requestId:'denied',event:{kind:'apply'},authority:{...authority,permission:false}},NOW).ok);assert(!transitionCreatorNativeSourceSession(session,owner,{expectedSession:start.value,requestId:'stale',event:{kind:'apply'},authority},NOW).ok);same(session,before);
 event({kind:'apply'},'apply');assert.equal(projected(owner).projection.artifacts.calendar.rows.length,0);const serialized=serializeCreatorNativeSourceSession(session);assert(serialized.ok);const loaded=hydrateCreatorNativeSourceSession(serialized.value);assert(loaded.ok);assert(validateCreatorNativeSourceSession(loaded.value));
 const bad=copy(session);const receipt=bad.events.find(e=>e.kind==='apply');assert(receipt?.kind==='apply');receipt.receipt.decisionSetHash='forged';assert(!validateCreatorNativeSourceSession(bad));
 const retry=transitionCreatorNativeSourceSession(session,owner,{expectedSession:start.value,requestId:'apply',event:{kind:'apply'},authority},NOW);assert(retry.ok&&retry.value.replayed&&!retry.value.changed);
 event({kind:'undo'},'undo');same(owner,base);const reloaded=hydrateCreatorNativeSourceSession(serializeCreatorNativeSourceSession(session).ok?stableAuthoringJson(session):'');assert(reloaded.ok);same(reloaded.value.baseOwner,base);
});
test('NSR06 end-only session after previous keep roundtrips exact source/working rules and receipt; repeated source is no-op',()=>{
 const accepted=apply(decide(stage(initial(),raw()).owner,'use_incoming','b'));
 const kept=apply(decide(stage(accepted,raw(5),'c').owner,'use_incoming','c','keep_working'),'c-apply');
 const f=incoming(kept,raw(7),'d'),authority={actorId:'creator',draftId:kept.id,lane:'creator' as const,permission:true,archived:false};const envelope=createCreatorNativeSourceEnvelope(kept,{rawText:f.doc.rawText,externalVersion:'d',providedBy:'explicit fixture',sourceOwnerClaim:'creator',collectedAt:NOW,receivedAt:NOW});assert(envelope.ok);
 const started=stageCreatorNativeSourceCandidate(kept,{envelope:envelope.value,candidateDocument:f.doc,matches:f.candidate.matches,authority},NOW);assert(started.ok);let session=started.value;
 const view=readCreatorNativeSourceSession(session,kept,authority);assert(view.ok);const recurrence=view.value.changes.find(c=>c.kind==='changed'&&c.field==='recurrence');assert(recurrence?.kind==='changed'&&recurrence.field==='recurrence');assert.equal(recurrence.oldSourceValue?.end?.mode,'count');same(recurrence.userValue,kept.document.parseResult.canonical.items[0].recurrence);
 for(const c of view.value.changes){const next=transitionCreatorNativeSourceSession(session,kept,{expectedSession:session,requestId:'keep-'+c.changeId,event:{kind:'decision',changeId:c.changeId,decision:'keep_working'},authority},NOW);assert(next.ok);session=next.value.session;}
 const result=transitionCreatorNativeSourceSession(session,kept,{expectedSession:session,requestId:'apply-d',event:{kind:'apply'},authority},NOW);assert(result.ok,JSON.stringify(result));const loaded=hydrateCreatorNativeSourceSession(stableAuthoringJson(result.value.session));assert(loaded.ok);const read=readCreatorNativeSourceSession(loaded.value,copy(result.value.owner),authority);assert(read.ok);same(read.value.receipt,result.value.session.events.at(-1)?.kind==='apply'?(result.value.session.events.at(-1) as any).receipt:null);assert.equal(projected(result.value.owner).projection.artifacts.calendar.rows.length,3);
 const repeat=incoming(result.value.owner,raw(7),'d'),noop=applyNativeCreatorDocumentOperation(result.value.owner,{expectedOwner:result.value.owner,requestId:'same-source',operation:{type:'stage_source_update',candidate:repeat.candidate}},NOW);assert(noop.ok&&!noop.changed);same(noop.owner,result.value.owner);
});
test('NSR07 actual Program store commits recurrence session+owner once, quota/retry/globalUndo preserve independent layers and original bytes',async()=>{
 const base=initial();let data=createProgramData();const actorId=data.activeActorId,draftId=base.id;
 const set=setProgramCreatorWorking(data,{actorId,expectedWorking:null,working:{draftId,title:'Recurrence source',rawText:base.document.rawText,baseRecordRevision:null,nativeDocument:base}},NOW);assert(set.ok);data=set.data;
 const save=applyProgramCreatorAction(data,{actorId,requestId:'save-base',expectedNativeDocument:base,expectedStructure:null,action:{type:'save',draftId,title:'Recurrence source',rawText:base.document.rawText,sourceFingerprint:fingerprintPersonalWorkspacePocAuthoringSource(base.document.rawText),expectedLibraryRevision:0,now:NOW}},NOW);assert(save.ok);data=save.data;
 const head=(d:ProgramData)=>({actorId,draftId,expectedWorking:d.spaces[actorId].creatorWorkspace!.working,expectedSession:d.spaces[actorId].creatorWorkspace!.sourceUpdateSessions?.[draftId]?.session??null});
 const protectedFacts=(d:ProgramData)=>{const w=d.spaces[actorId].creatorWorkspace!;return{public:d.public,text:d.spaces[actorId].text,library:w.library,saved:w.structureDrafts,other:Object.entries(d.spaces).filter(([id])=>id!==actorId)};};const original=copy(protectedFacts(data));
 const f=incoming(base,raw()),envelope=createCreatorNativeSourceEnvelope(base,{rawText:f.doc.rawText,externalVersion:'b',providedBy:'explicit fixture',sourceOwnerClaim:'creator',collectedAt:NOW,receivedAt:NOW});assert(envelope.ok);
 const staged=stageProgramNativeSourceUpdate(data,{...head(data),envelope:envelope.value,candidateDocument:f.doc,matches:f.candidate.matches},NOW);assert(staged.ok);data=staged.data;const view=readProgramNativeSourceUpdate(data,actorId,draftId);assert(view?.ok);
 for(const c of view.value.changes){const next=transitionProgramNativeSourceUpdate(data,{...head(data),requestId:'choose-'+c.changeId,event:{kind:'decision',changeId:c.changeId,decision:'keep_working'}},NOW);assert(next.ok);data=next.data;}
 const values=new Map([['flow:original',' exact protected original bytes ']]),writes:string[]=[];let quota=true;const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{if(quota)throw Error('quota');writes.push(key);values.set(key,value);},removeItem:()=>{throw Error('forbidden');}};
 const controller=createProgramController({initialData:data,storage,exclusive:async work=>work()});assert(controller.ok);const input={...head(data),requestId:'apply',event:{kind:'apply' as const}},build=(current:ProgramData)=>transitionProgramNativeSourceUpdate(current,input,NOW);
 assert(!(await controller.mutate('Apply recurrence source',build,{actorId})).ok);assert.equal(writes.length,0);same(controller.snapshot().envelope.data,data);
 quota=false;assert((await controller.mutate('Retry recurrence source',build,{actorId})).ok);assert.deepEqual(writes,[PROGRAM_STATE_KEY]);const loaded=createProgramController({initialData:data,storage,exclusive:async work=>work()});assert(loaded.ok);const after=loaded.snapshot().envelope.data;same(protectedFacts(after),original);assert(validateProgramData(after));assert.equal(projected(head(after).expectedWorking!.nativeDocument!).projection.artifacts.calendar.rows.length,0);assert.equal(head(after).expectedWorking!.nativeDocument!.source.documentJson,base.source.documentJson);
 assert((await loaded.undo(actorId)).ok);same(loaded.snapshot().envelope.data,data);assert.equal(values.get('flow:original'),' exact protected original bytes ');
});
