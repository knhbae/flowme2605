import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
// Original D2 functions generate actual wire in memory only; no browser/profile or
// original repository files are changed. Production codec never imports these.
import {createMemoryTextAuthoringStorage,createTextAuthoringDraftRepository} from './native-creator-vendor/text-authoring/storage';
import {createTextAuthoringServiceState,beginTextAuthoringWorkingSourceEdit} from './native-creator-vendor/text-authoring/service-state';
import {decodeLegacyCreatorRecoveries,readLegacyCreatorRecoveries,LEGACY_CREATOR_RECOVERY_KEY as KEY} from './legacy-creator-recovery-codec';

const NOW='2026-09-20T01:00:00.000Z',NEXT='2026-09-20T01:01:00.000Z',LATER='2026-09-20T01:02:00.000Z';
const RAW='# 출국 준비\n- [ ] 여권 확인\n  - 날짜: 2026-10-05';
function fixture(options:{coherent?:boolean;pending?:string;save?:boolean;coherentSave?:boolean;raw?:string}={}) {
 const storage=createMemoryTextAuthoringStorage();let at=NOW,counter=0;
 const repo=createTextAuthoringDraftRepository(storage,{now:()=>at,idFactory:prefix=>`${prefix}-${++counter}`});
 let state=createTextAuthoringServiceState(options.raw??RAW,{ownership:'creator',draftId:'draft-actual',documentId:'document-actual',now:NOW});
 if(options.save)repo.save(state.canonicalDraft.document,{draftId:state.draftId});
 if(options.coherentSave)repo.saveCoherentDraft(state);
 at=NEXT;
 if(options.pending!==undefined)state=beginTextAuthoringWorkingSourceEdit(state,options.pending,NEXT);
 const recovery=options.coherent?repo.saveCoherentRecovery(state,{activeStage:'structure',selectedItemId:state.canonicalDraft.document.parseResult.canonical.items[0]?.itemId,primaryArtifact:'calendar'}):repo.autosave(state.canonicalDraft.document,{draftId:state.draftId});
 const raw=storage.getItem(KEY)!;
 return{raw,recovery,storage,repo,setTime:(value:string)=>{at=value;},state};
}
function ready(raw:string){const result=decodeLegacyCreatorRecoveries(raw);assert.equal(result.kind,'ready');assert(result.kind==='ready');return result;}

test('LRC01 original general first-save-before is full native recovery, never a saved version',()=>{
 const f=fixture(),r=ready(f.raw);assert.equal(r.raw,f.raw);assert.equal(r.issues.length,0);assert.equal(r.candidates.length,1);
 const c=r.candidates[0];assert.equal(c.eligibility,'first-save-before');assert(c.eligible);assert.equal(c.durableRecordJson,null);assert.equal(c.lastSavedAt,null);
 assert.equal(c.recoveryId,f.recovery.recoveryId);assert.equal(c.revisionId,f.recovery.revisionId);assert.deepEqual(JSON.parse(c.documentJson),f.recovery.document);assert.deepEqual(JSON.parse(c.recoveryJson),f.recovery);assert(!('versionId' in c));
});
test('LRC02 original coherent current pair exact identities preserved without ready/public capability',()=>{
 const f=fixture({coherent:true,save:true}),r=ready(f.raw),c=r.candidates[0];assert.equal(c.eligibility,'newer-than-saved');assert(c.eligible);assert.equal(c.canonicalRawText,c.workingRawText);assert(c.selectionAvailable);
 assert.equal(c.primaryArtifact,'calendar');assert.equal(c.activeStage,'structure');assert.notEqual(f.recovery.revisionId,f.recovery.document.revision.revisionId);
 assert.deepEqual(JSON.parse(c.recoveryJson).serviceRecovery,f.recovery.serviceRecovery);assert(c.durableRecordJson);assert(!('ready' in c));assert(!('versionId' in c));
});
test('LRC03 original pending coherent recovery keeps canonical and working revisions distinct and pair absent',()=>{
 const f=fixture({coherent:true,pending:RAW+'\n미반영 입력',save:true}),c=ready(f.raw).candidates[0];
 assert.equal(c.canonicalRawText,RAW);assert.equal(c.workingRawText,RAW+'\n미반영 입력');assert.equal(JSON.parse(c.recoveryJson).serviceRecovery.currentRevisionPair,undefined);assert.equal(c.revisionId,f.state.workingSource.revisionId);
});
test('LRC04 empty and whitespace pending first-save-before survive exact CRLF with full wire spelling',()=>{
 for(const pending of ['',' \r\n\t','첫 줄\r\n두 번째 줄']){const f=fixture({coherent:true,pending}),r=ready(f.raw);assert.equal(r.candidates[0].workingRawText,pending);assert.equal(r.raw,f.raw);assert.equal(r.candidates[0].eligibility,'first-save-before');}
 const empty=ready(fixture({coherent:true,raw:''}).raw);assert.equal(empty.candidates[0].canonicalRawText,'');
});
test('LRC05 original newer-than-saved semantics keep older/equal visible but ineligible',()=>{
 for(const at of [NEXT,LATER]){const f=fixture({coherent:true});f.setTime(at);f.repo.save(f.state.canonicalDraft.document,{draftId:f.state.draftId});
  const raw=f.storage.getItem(KEY)!;const root=JSON.parse(raw);root.recoveries[f.state.draftId]=f.recovery;
  const c=ready(JSON.stringify(root)).candidates[0];assert.equal(c.eligibility,'not-newer-than-saved');assert.equal(c.eligible,false);assert.equal(c.recoveredAt,NEXT);assert.equal(c.lastSavedAt,at);
 }
});
test('LRC06 old savedAt alias is read-derived only and conflicting timestamps are surfaced',()=>{
 const root=JSON.parse(fixture().raw);delete root.recoveries['draft-actual'].recoveredAt;const raw=JSON.stringify(root),r=ready(raw);assert.equal(r.candidates[0].timestampSource,'savedAt-alias');assert(!('recoveredAt' in JSON.parse(r.candidates[0].recoveryJson)));assert.equal(r.raw,raw);
 root.recoveries['draft-actual'].recoveredAt=LATER;const invalid=ready(JSON.stringify(root));assert.equal(invalid.candidates.length,0);assert.equal(invalid.issues[0].reason,'invalid-entry');
});
test('LRC07 service identity, time, owner, source linkage, fingerprint, pair forgery fail without raw fallback',()=>{
 const mutations=[(e:any)=>e.serviceRecovery.draftId='foreign',(e:any)=>e.serviceRecovery.recoveryId='foreign',(e:any)=>e.serviceRecovery.owner='creator_draft',(e:any)=>e.serviceRecovery.recoveredAt=LATER,
  (e:any)=>e.serviceRecovery.workingSource.sourceSnapshotId='foreign',(e:any)=>e.serviceRecovery.workingSource.revisionId='foreign',(e:any)=>e.serviceRecovery.workingSource.updatedAt=LATER,
  (e:any)=>e.serviceRecovery.workingSource.revisionNumber=0,(e:any)=>e.serviceRecovery.sourceSnapshot.contentFingerprint='forged',(e:any)=>e.serviceRecovery.currentRevisionPair.canonicalRevisionId='forged',
  (e:any)=>e.serviceRecovery.currentRevisionPair.projectionRevisionId='forged',(e:any)=>e.serviceRecovery.currentRevisionPair.parserResultRevisionId='forged',(e:any)=>e.serviceRecovery.workingSource.rawText='forged'];
 for(const mutation of mutations){const root=JSON.parse(fixture({coherent:true}).raw);mutation(root.recoveries['draft-actual']);const r=ready(JSON.stringify(root));assert.equal(r.candidates.length,0);assert.equal(r.issues.length,1);}
});
test('LRC08 general revision mismatch, unsupported native DTO and unknown important fields never accepted',()=>{
 for(const mutate of [(e:any)=>e.revisionId='different',(e:any)=>e.document.schemaVersion='future',(e:any)=>e.unrecognizedOwnerState={rawText:'private'}]){const root=JSON.parse(fixture().raw);mutate(root.recoveries['draft-actual']);const r=ready(JSON.stringify(root));assert.equal(r.candidates.length,0);assert.equal(r.issues.length,1);}
});
test('LRC09 independent bad/noncreator entries remain visible as issues alongside a valid candidate',()=>{
 const root=JSON.parse(fixture().raw);root.recoveries.bad={bad:true};const other=structuredClone(root.recoveries['draft-actual']);other.draftId='personal';other.recoveryId='personal-rec';other.document.documentId='personal-doc';other.document.ownership='personal';root.recoveries.personal=other;
 const r=ready(JSON.stringify(root));assert.equal(r.candidates.length,1);assert.deepEqual(r.issues,[{draftId:'bad',reason:'invalid-entry'},{draftId:'personal',reason:'non-creator'}]);
});
test('LRC10 duplicate ownership or ambiguous durable relationship invalidates the root',()=>{
 for(const mutate of [(r:any)=>r.recoveries['draft-actual'].draftId='foreign',(r:any)=>{r.recoveries.other={...r.recoveries['draft-actual'],draftId:'other'};},(r:any)=>r.drafts['draft-actual'].document.documentId='foreign',(r:any)=>r.drafts['draft-actual'].lastSavedAt='invalid']){
  const root=JSON.parse(fixture({save:true}).raw);mutate(root);assert.equal(decodeLegacyCreatorRecoveries(JSON.stringify(root)).kind,'corrupt');
 }
});
test('LRC11 root duplicate keys including escaped names, dangerous keys and malformed wire fail closed',()=>{
 for(const raw of ['{"schemaVersion":1,"schemaVersion":2,"drafts":{},"recoveries":{}}','{"schemaVersion":1,"drafts":{},"recoveries":{},"\\u0064rafts":{}}','{"schemaVersion":1,"drafts":{},"recoveries":{"__proto__":{}}}','{','null'])assert(['corrupt','unsupported'].includes(decodeLegacyCreatorRecoveries(raw).kind));
 assert.equal(decodeLegacyCreatorRecoveries(null).kind,'empty');assert.equal(decodeLegacyCreatorRecoveries('{"schemaVersion":2}').kind,'unsupported');
});
test('LRC12 getItem-only port performs one exact-key read, never accesses writers or global storage',()=>{
 const f=fixture({coherent:true}),before=f.storage.getItem(KEY);let reads=0;
 const port=new Proxy({getItem(key:string){reads++;assert.equal(key,KEY);return before;}},{get(target,key){assert.equal(key,'getItem');return Reflect.get(target,key);}});
 assert.equal(readLegacyCreatorRecoveries(port).kind,'ready');assert.equal(reads,1);assert.equal(f.storage.getItem(KEY),before);
 assert.equal(readLegacyCreatorRecoveries({getItem(){throw Error('private raw must not leak');}}).kind,'unavailable');
});
test('LRC13 bounded input rejects over-limit wire, nested JSON and raw without evaluating any content',()=>{
 assert.equal(decodeLegacyCreatorRecoveries(' '.repeat(10_000_001)).kind,'unsupported');
 assert.equal(decodeLegacyCreatorRecoveries('['.repeat(101)+'0'+']'.repeat(101)).kind,'corrupt');
 const root=JSON.parse(fixture().raw);root.recoveries['draft-actual'].document.rawText='x'.repeat(100_001);assert.equal(ready(JSON.stringify(root)).candidates.length,0);
});
test('LRC14 codec runtime imports only vendored pure primitives, not Program owner/controller or original repository',()=>{
 const source=readFileSync(new URL('./legacy-creator-recovery-codec.ts',import.meta.url),'utf8');
 const imports=[...source.matchAll(/from '([^']+)'/gu)].map(match=>match[1]);assert.equal(imports.length,3);assert(imports.every(path=>path.startsWith('./native-creator-vendor/text-authoring/')));
 assert(!/\b(localStorage|sessionStorage|setItem|removeItem|fetch|XMLHttpRequest)\b/u.test(source));
});
test('LRC15 missing original selection is preserved and marked unavailable, never replaced by first item',()=>{
 const root=JSON.parse(fixture({coherent:true}).raw);root.recoveries['draft-actual'].selectedItemId='deleted-item';root.recoveries['draft-actual'].focusTarget='unknown-original-focus';
 const candidate=ready(JSON.stringify(root)).candidates[0];assert.equal(candidate.selectedItemId,'deleted-item');assert.equal(candidate.selectionAvailable,false);assert.equal(candidate.focusTarget,'unknown-original-focus');
});
test('LRC16 unknown root fields, nonfinite numbers and excessive entry counts fail closed',()=>{
 const root=JSON.parse(fixture().raw);root.unknown=1;assert.equal(decodeLegacyCreatorRecoveries(JSON.stringify(root)).kind,'corrupt');
 assert.equal(decodeLegacyCreatorRecoveries('{"schemaVersion":1,"drafts":{},"recoveries":{},"unknown":1e999}').kind,'corrupt');
 const many={schemaVersion:1,drafts:{},recoveries:Object.fromEntries(Array.from({length:201},(_,index)=>[String(index),{}]))};assert.equal(decodeLegacyCreatorRecoveries(JSON.stringify(many)).kind,'unsupported');
});
test('LRC17 actual coherent durable relationship is validated including save receipt and parser pair',()=>{
 const f=fixture({coherent:true,coherentSave:true,pending:RAW+'\n수정'}),r=ready(f.raw);assert.equal(r.candidates.length,1);assert.equal(r.candidates[0].eligibility,'newer-than-saved');
 for(const mutate of [(d:any)=>d.explicitSaveReceipt.draftId='foreign',(d:any)=>d.coherentRevisionPair.canonicalRevisionId='forged',(d:any)=>d.workingSource.sourceSnapshotId='forged',(d:any)=>d.explicitSaveReceipt.savedAt=LATER]){
  const root=JSON.parse(f.raw);mutate(root.drafts['draft-actual']);assert.equal(decodeLegacyCreatorRecoveries(JSON.stringify(root)).kind,'corrupt');
 }
});
