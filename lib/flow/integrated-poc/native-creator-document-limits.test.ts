import assert from 'node:assert/strict';
import test from 'node:test';
import {buildCatalogContent} from './catalog-content-source';
import {applyAuthoringOperation} from './native-creator-vendor/text-authoring/operations';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createNativeCreatorDocumentOwner,readNativeCreatorSavedDocument,updateNativeCreatorRecordUi,validateNativeCreatorDocument,validateNativeCreatorDocumentOwner} from './native-creator-document';
import {NATIVE_CREATOR_ACTION_LIMIT,NATIVE_CREATOR_DOCUMENT_JSON_LIMIT,NATIVE_CREATOR_OWNER_JSON_LIMIT,type NativeCreatorDocumentSource,type TextAuthoringDocument} from './native-creator-document-contract';

const NOW='2026-09-23T10:00:00.000Z';
const dto=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
function source(document:TextAuthoringDocument):NativeCreatorDocumentSource{return {storageKey:'flow:text-authoring:drafts:v1',draftId:'limit-fixture',versionId:'synthetic-saved',revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)};}
function small(){return dto(createTextAuthoringDocument('# Public fixture\n- [ ] task',{documentId:'limit-source',ownership:'creator',now:NOW}));}
let hundred:TextAuthoringDocument|undefined;
function publicHundred(){
 if(hundred)return hundred;
 const projected=buildCatalogContent('home-cafe-daily');assert(projected.ok);
 let document=dto(projected.document);
 for(let i=1;i<=100;i++)document=dto(applyAuthoringOperation(document,{type:'rename',itemId:document.parseResult.canonical.items[0].itemId,title:`Compact simulation ${i}`},{actorLane:'creator',now:NOW}));
 hundred=document;return document;
}
// Artificial sourceTitle metadata padding tests serialization boundaries only;
// it is not an observed authoring workload or a realistic source title.
function padded(chars:number,pad='x'){
 const document={...small(),sourceTitle:''};
 const missing=chars-JSON.stringify(document).length;assert(missing>=0);
 document.sourceTitle=pad.repeat(Math.floor(missing/pad.length))+'x'.repeat(missing%pad.length);
 assert.equal(JSON.stringify(document).length,chars);return document;
}

test('document cap is 4M UTF16 code units; owner16M and actions128 are unchanged',()=>{
 assert.equal(NATIVE_CREATOR_DOCUMENT_JSON_LIMIT,4_000_000);
 assert.equal(NATIVE_CREATOR_OWNER_JSON_LIMIT,16_000_000);
 assert.equal(NATIVE_CREATOR_ACTION_LIMIT,128);
});
test('public home-cafe vendor100 DTO above previous2M validates and saved reader roundtrips',()=>{
 const document=publicHundred(),serialized=JSON.stringify(document);
 assert(serialized.length>2_000_000);assert(serialized.length<=4_000_000);
 assert(validateNativeCreatorDocument(document));
 assert.deepEqual(readNativeCreatorSavedDocument(source(document)),document);
});
test('public100 saved-source owner has matching source and document with zero invented actions',()=>{
 const document=publicHundred(),result=createNativeCreatorDocumentOwner({id:'saved100',source:source(document)},NOW);assert(result.ok);
 assert.equal(result.owner.actions.length,0);assert.equal(result.owner.revision,1);
 assert.deepEqual(result.owner.document,document);assert(validateNativeCreatorDocumentOwner(result.owner));
});
test('synthetic metadata padding at exactly4M is accepted by document and saved reader',()=>{
 const document=padded(4_000_000);assert(validateNativeCreatorDocument(document));assert(readNativeCreatorSavedDocument(source(document)));
});
test('synthetic metadata padding at4M+1 is rejected by document and saved reader',()=>{
 const document=padded(4_000_001);assert.equal(validateNativeCreatorDocument(document),false);assert.equal(readNativeCreatorSavedDocument(source(document)),null);
});
test('Unicode limit counts UTF16 rather than UTF8 bytes including surrogate pairs',()=>{
 const document=padded(4_000_000,'😀한'),serialized=JSON.stringify(document);
 assert.equal(serialized.length,4_000_000);assert(Buffer.byteLength(serialized,'utf8')>4_000_000);
 assert(validateNativeCreatorDocument(document));
 document.sourceTitle+='한';assert.equal(JSON.stringify(document).length,4_000_001);assert.equal(validateNativeCreatorDocument(document),false);
});
test('under-cap malformed DTO and saved revision tampering remain rejected',()=>{
 const document=small();
 for(const bad of [{...document,unexpected:true},{...document,ownership:'viewer'},{...document,createdAt:'invalid'},{...document,parseResult:{...document.parseResult,canonical:{...document.parseResult.canonical,items:null}}}])assert.equal(validateNativeCreatorDocument(bad),false);
 assert.equal(readNativeCreatorSavedDocument({...source(document),revisionId:'tampered'}),null);
 const native=createNativeCreatorDocumentOwner({id:'tamper-fixture',source:source(document)},NOW);assert(native.ok);
 const forged=dto(native.owner);forged.document.title='forged outside journal';assert.equal(validateNativeCreatorDocumentOwner(forged),false);
});
test('raw100001 remains rejected even when total DTO is below4M',()=>{
 const document={...small(),rawText:'x'.repeat(100001)};assert(JSON.stringify(document).length<4_000_000);assert.equal(validateNativeCreatorDocument(document),false);
});
test('128 real UI journal actions replay;129th change returns history-capacity without mutation',()=>{
 const initial=createNativeCreatorDocumentOwner({id:'ui-capacity',source:source(small())},NOW);assert(initial.ok);let owner=initial.owner;
 for(let i=0;i<128;i++){
  const result=updateNativeCreatorRecordUi(owner,{expectedOwner:owner,requestId:`ui-${i}`,recordUi:{activeStage:i%2?'input':'structure'}},NOW);
  assert(result.ok&&result.changed);owner=result.owner;
 }
 assert.equal(owner.actions.length,128);assert(validateNativeCreatorDocumentOwner(owner));
 const before=JSON.stringify(owner),next=updateNativeCreatorRecordUi(owner,{expectedOwner:owner,requestId:'ui-129',recordUi:{activeStage:'structure'}},NOW);
 assert.deepEqual(next,{ok:false,reason:'history-capacity'});assert.equal(JSON.stringify(owner),before);
});
