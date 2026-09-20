import test from 'node:test';import assert from 'node:assert/strict';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createAuthoringSourceUpdateCandidate} from './native-creator-vendor/text-authoring/source-update';
import {createNativeCreatorDocumentOwner,applyNativeCreatorDocumentOperation,applyNativeCreatorSourceDecision,applyNativeCreatorSourceSession,validateNativeCreatorDocumentOwner} from './native-creator-document';
import {programNativeExecutionIdentity,programNativeSourceItemId} from './creator-native-execution-identity';
import {nativeExecutionTexts} from './creator-native-execution-render';
import {programNativeExecutionItemFacts} from './creator-native-execution-facts';
import type {NativeCreatorDocumentOwner} from './native-creator-document-contract';
import type {ProgramNativeExecutionRevision} from './creator-native-execution-contract';
const NOW='2026-09-12T08:00:00.000Z',raw='# 준비\r\n- [ ] 같은 제목\r\n  - 날짜: 2026-09-20\r\n- [ ] 같은 제목\r\n  - 날짜: 2026-09-21';
function initial(){const doc=createTextAuthoringDocument(raw,{documentId:'native-identity-source',ownership:'creator',now:NOW}),r=createNativeCreatorDocumentOwner({id:'native-identity',source:{storageKey:'flow:text-authoring:drafts:v1',draftId:'native-identity-draft',versionId:'a',revisionId:doc.revision.revisionId,documentJson:JSON.stringify(doc)}},NOW);assert(r.ok);return r.owner;}
function revision(owner:NativeCreatorDocumentOwner,prior:ProgramNativeExecutionRevision[]=[],id='a'):ProgramNativeExecutionRevision{const identities=programNativeExecutionIdentity(prior,owner);return{id,recordRevision:prior.length+1,contextRevision:prior.length+1,committedAt:NOW,nativeDocument:owner,nativeSelection:owner.source,anchor:null,rows:owner.document.parseResult.canonical.items.map(item=>{const itemId=identities.get(item.itemId)!,facts=programNativeExecutionItemFacts(item),lineId='line-'+itemId;return{itemId,...(itemId!==item.itemId?{sourceItemId:item.itemId}:{}),sourceRowIds:item.sourceRowIds,rowId:'row-'+itemId,lineId,kind:facts.kind,lines:nativeExecutionTexts(item,facts.date).map((text,i)=>({id:i?lineId+'-'+i:lineId,text}))};})};}
function stage(owner:NativeCreatorDocumentOwner,text:string,id:string,reverse=false){const doc=createTextAuthoringDocument(text,{documentId:owner.document.documentId,ownership:'creator',sourceExternalVersion:id,now:NOW}),items=doc.parseResult.canonical.items,active=owner.document.parseResult.canonical.items;
 const candidate=createAuthoringSourceUpdateCandidate(doc,{capturedAt:NOW,externalVersion:id,matches:active.map((item,i)=>({activeItemId:item.itemId,incomingItemId:items[reverse?items.length-1-i:i].itemId,basis:'explicit'}))});
 const r=applyNativeCreatorDocumentOperation(owner,{expectedOwner:owner,requestId:'stage-'+id,operation:{type:'stage_source_update',candidate}},NOW);assert(r.ok,JSON.stringify(r));return r.owner;}
function apply(staged:NativeCreatorDocumentOwner,id:string){let owner=staged;const state=owner.document.sourceState;assert(state&&state.status!=='current');for(const c of state.changes){const r=applyNativeCreatorSourceDecision(owner,{expectedOwner:owner,requestId:id+c.changeId,decision:{decisionVersion:1,changeId:c.changeId,decision:'use_incoming'}},NOW);assert(r.ok);owner=r.owner;}const r=applyNativeCreatorSourceSession(owner,{expectedOwner:owner,requestId:'apply-'+id},NOW);assert(r.ok,JSON.stringify(r));assert(validateNativeCreatorDocumentOwner(r.owner));return r.owner;}
test('NEI01 CRLF and duplicate titles use accepted explicit tuples, not title or order',()=>{
 const a=initial(),before=revision(a),b=apply(stage(a,raw.replaceAll('\r\n','\n'),'b',true),'b'),r=revision(b,[before],'b');
 assert.notEqual(a.document.parseResult.canonical.items[0].itemId,b.document.parseResult.canonical.items[0].itemId);
 assert.equal(r.rows[0].itemId,before.rows[1].itemId);assert.equal(r.rows[1].itemId,before.rows[0].itemId);assert.equal(programNativeSourceItemId(r.rows[0]),b.document.parseResult.canonical.items[0].itemId);
 assert.deepEqual(before.nativeDocument,a);assert.equal(a.document.rawText,raw);
});
test('NEI02 multiple accepted source changes retain one execution identity and genuine per-version IDs',()=>{
 const a=initial(),ra=revision(a),b=apply(stage(a,raw.replaceAll('\r\n','\n'),'b'),'b'),rb=revision(b,[ra],'b');
 const c=apply(stage(b,b.document.rawText.replaceAll('\n','\r\n'),'c'),'c'),rc=revision(c,[ra,rb],'c');
 assert.deepEqual(rc.rows.map(r=>r.itemId),ra.rows.map(r=>r.itemId));assert.notDeepEqual(rc.rows.map(programNativeSourceItemId),rb.rows.map(programNativeSourceItemId));
 assert.deepEqual(programNativeExecutionIdentity([ra,rb,rc],a),new Map(ra.rows.map(r=>[r.itemId,r.itemId])));
});
test('NEI03 staged or rejected candidates do not create a completed cross-ID edge',()=>{
 const a=initial(),ra=revision(a),staged=stage(a,raw.replaceAll('\r\n','\n'),'b');
 assert.deepEqual(programNativeExecutionIdentity([ra],staged),new Map(ra.rows.map(r=>[r.itemId,r.itemId])));
 const rejected=applyNativeCreatorDocumentOperation(staged,{expectedOwner:staged,requestId:'reject-b',operation:{type:'reject_source_update'}},NOW);assert(rejected.ok);
 assert.deepEqual(programNativeExecutionIdentity([ra],rejected.owner),new Map(ra.rows.map(r=>[r.itemId,r.itemId])));
 const unrelated=structuredClone(a),doc=createTextAuthoringDocument(raw.replaceAll('\r\n','\n'),{documentId:a.document.documentId,ownership:'creator',now:NOW});unrelated.document=doc;
 // Helper receives a separately validated owner in production. No fabricated
 // accepted match is used here; absent evidence leaves the real native IDs.
 assert.deepEqual([...programNativeExecutionIdentity([ra],unrelated).values()],doc.parseResult.canonical.items.map(i=>i.itemId));
});
test('NEI04 foreign owners and ambiguous historical execution identities fail closed',()=>{
 const a=initial(),ra=revision(a),foreign=structuredClone(a);foreign.id='foreign';assert.throws(()=>programNativeExecutionIdentity([ra],foreign),/foreign/);
 const duplicate=structuredClone(ra);duplicate.rows[0].sourceItemId=duplicate.rows[0].itemId;duplicate.rows[0].itemId='different-execution';assert.throws(()=>programNativeExecutionIdentity([ra,duplicate],a),/ambiguous/);
});
