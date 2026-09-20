import test from 'node:test';import assert from 'node:assert/strict';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createNativeCreatorDocumentOwner} from './native-creator-document';
import {prepareProgramNativeSourceInput,programNativeSourceDefaultMatches,programNativeSourceMatches} from './creator-native-source-input';
const AT='2026-09-12T20:00:00.000Z';
function owner(){const document=createTextAuthoringDocument('# 원문\r\n- [ ] 같은 제목\r\n- [ ] 같은 제목',{documentId:'source-input',ownership:'creator',now:AT});const result=createNativeCreatorDocumentOwner({id:'source-input',source:{storageKey:'flow:text-authoring:drafts:v1',draftId:'original',versionId:'original-version',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)}},AT);assert(result.ok);return result.owner;}
test('NSI01 local input uses original parser and exact raw, never source fetch or operating mutation',()=>{
 const original=owner(),before=JSON.stringify(original),raw='# 원문\r\n- [ ] 바뀐 제목\r\n  detail: 개인화하지 않은 새 원본';const prepared=prepareProgramNativeSourceInput(original,{rawText:raw,version:'로컬 수정 비교',actorId:'me'},AT);assert(prepared);assert.equal(prepared.candidateDocument.rawText,raw);assert.equal(prepared.envelope.rawText,raw);assert.equal(prepared.envelope.sourceOwnerClaim,'local-user-provided-unverified');assert.equal(JSON.stringify(original),before);
});
test('NSI02 empty/oversized source or empty comparison name never fabricates a candidate',()=>{
 for(const input of [{rawText:' ',version:'b'},{rawText:'- [ ] task',version:''},{rawText:'a'.repeat(100001),version:'b'}])assert.equal(prepareProgramNativeSourceInput(owner(),{...input,actorId:'me'},AT),null);
});
test('NSI03 repeated titles are not matched by title or index; explicit one-to-one mapping is required',()=>{
 const prepared=prepareProgramNativeSourceInput(owner(),{rawText:'# 다른 원문\n- [ ] 새 첫째\n- [ ] 새 둘째',version:'b',actorId:'me'},AT);assert(prepared);
 const active=prepared.owner.document.parseResult.canonical.items,incoming=prepared.candidateDocument.parseResult.canonical.items,defaults=programNativeSourceDefaultMatches(prepared);
 for(const item of active)assert.equal(defaults[item.itemId],incoming.some(next=>next.itemId===item.itemId)?item.itemId:'');
 const selected={[active[0].itemId]:incoming[1].itemId,[active[1].itemId]:incoming[0].itemId};assert.deepEqual(programNativeSourceMatches(prepared,selected)?.map(row=>row.incomingItemId),[incoming[1].itemId,incoming[0].itemId]);
 assert.equal(programNativeSourceMatches(prepared,{[active[0].itemId]:incoming[0].itemId,[active[1].itemId]:incoming[0].itemId}),null);
 assert.equal(programNativeSourceMatches(prepared,{invented:incoming[0].itemId}),null);assert.deepEqual(programNativeSourceMatches(prepared,{}),[]);
});
