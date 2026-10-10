import assert from 'node:assert/strict';
import test from 'node:test';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {createNativeCreatorDocumentOwner,applyNativeCreatorDocumentOperation,updateNativeCreatorRecordUi,restoreNativeCreatorDocument,validateNativeCreatorDocument,validateNativeCreatorDocumentOwner} from './native-creator-document';
import {NATIVE_CREATOR_DOCUMENT_JSON_LIMIT,type NativeCreatorDocumentOwner} from './native-creator-document-contract';
import {createProgramPrivateSpace} from './program-data';
import {setProgramCreatorWorking} from './creator-workspace';
import {materializeAccount,validateAlphaAccount} from './alpha-persistence/program-adapter';
import {type AlphaAccount} from './alpha-persistence/contract';
import {dispatchAlphaCreatorCommand} from './alpha-creator/dispatch-source';
import {applyProgramNativeCreatorOperation} from './creator-native-workspace';

const NOW='2026-09-23T10:00:00.000Z',ACTOR='11111111-1111-4111-8111-111111111111';
function fixture(nearLimit=false){
 const doc=JSON.parse(JSON.stringify(createTextAuthoringDocument('# Synthetic fixture\n- [ ] task',{documentId:'capacity-source',ownership:'creator',now:NOW})));
 // Artificial metadata padding isolates the size gate; not real user content.
 if(nearLimit){doc.sourceTitle='';doc.sourceTitle='x'.repeat(NATIVE_CREATOR_DOCUMENT_JSON_LIMIT-JSON.stringify(doc).length);}
 assert(validateNativeCreatorDocument(doc));
 const source={storageKey:'flow:text-authoring:drafts:v1' as const,draftId:'synthetic-capacity-source',versionId:'capacity-v1',revisionId:doc.revision.revisionId,documentJson:JSON.stringify(doc)};
 const result=createNativeCreatorDocumentOwner({id:'capacity-draft',source},NOW);assert(result.ok);return result.owner;
}
const rename=(owner:NativeCreatorDocumentOwner)=>({type:'rename' as const,itemId:owner.document.parseResult.canonical.items[0].itemId,title:'Changed task'});
function historyFull(){
 const owner=fixture();
 // Valid UI event fixture: replay validates each event and the final state.
 owner.actions=Array.from({length:128},(_,i)=>({kind:'ui' as const,requestId:`ui-${i}`,at:NOW,recordUi:{activeStage:(i%2?'input':'structure') as 'input'|'structure'}}));
 owner.recordUi={activeStage:'input'};owner.revision=129;assert(validateNativeCreatorDocumentOwner(owner));return owner;
}
const refs={actorIds:[ACTOR],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}};
function accountFixture(owner:NativeCreatorDocumentOwner){
 const account:AlphaAccount={schema:'flowme-alpha-account/1',ownerId:ACTOR,revision:0,source:{schema:'flowme-integrated-product-poc/1',actorId:ACTOR,revision:0},space:createProgramPrivateSpace(),legacyReceipts:[],legacyUndo:[]};
 const working={draftId:owner.id,title:owner.document.title,rawText:owner.document.rawText,baseRecordRevision:null,nativeDocument:owner,nativeSelection:owner.source};
 const transition=setProgramCreatorWorking(materializeAccount(account,refs).data,{actorId:ACTOR,expectedWorking:null,working},NOW);assert(transition.ok);account.space=transition.data.spaces[ACTOR];assert(validateAlphaAccount(account,refs,ACTOR));return account;
}

test('synthetic near4M valid owner rename returns document-capacity without mutation',()=>{
 const owner=fixture(true),before=JSON.stringify(owner);
 assert.deepEqual(applyNativeCreatorDocumentOperation(owner,{expectedOwner:owner,requestId:'oversize',operation:rename(owner)},NOW),{ok:false,reason:'document-capacity'});
 assert.equal(JSON.stringify(owner),before);
});
test('valid128 UI journal changed rename returns history-capacity without mutation',()=>{
 const owner=historyFull(),before=JSON.stringify(owner);
 assert.deepEqual(applyNativeCreatorDocumentOperation(owner,{expectedOwner:owner,requestId:'new-rename',operation:rename(owner)},NOW),{ok:false,reason:'history-capacity'});assert.equal(JSON.stringify(owner),before);
});
test('valid128 journal UI no-op and idempotent retry stay successful',()=>{
 const owner=historyFull(),before=JSON.stringify(owner);
 for(const requestId of ['new-noop','ui-127']){const result=updateNativeCreatorRecordUi(owner,{expectedOwner:owner,requestId,recordUi:{activeStage:'input'}},NOW);assert(result.ok);assert.equal(result.changed,false);assert.equal(JSON.stringify(result.owner),before);}
 assert.equal(JSON.stringify(owner),before);
});
for(const nearLimit of [true,false])test(`capacity maps to workspace and alpha limit; ${nearLimit?'document':'history'} account remains exact`,()=>{
 const owner=nearLimit?fixture(true):historyFull(),account=accountFixture(owner),before=JSON.stringify(account),data=materializeAccount(account,refs).data,programBefore=JSON.stringify(data),working=account.space.creatorWorkspace!.working!;
 const transition=applyProgramNativeCreatorOperation(data,{actorId:ACTOR,requestId:'workspace-capacity',draftId:owner.id,expectedWorking:working,expectedOwner:owner,operation:rename(owner)},NOW);
 assert.equal(transition.ok,false);if(!transition.ok)assert.equal(transition.reason,'limit');assert.equal(JSON.stringify(data),programBefore);
 const result=dispatchAlphaCreatorCommand(account,{schema:'flowme-alpha-creator-command/1',kind:'creator',requestId:'alpha-capacity',expectedRevision:account.revision,intent:{type:'native-operation',draftId:owner.id,operation:rename(owner),now:NOW}},refs);
 assert.deepEqual(result,{ok:false,reason:'limit'});assert.equal(JSON.stringify(account),before);assert.equal(account.revision,0);
});
test('invalid forged and stale inputs retain non-capacity errors',()=>{
 const owner=fixture(true),before=JSON.stringify(owner),forged=structuredClone(owner);forged.document.title='outside journal';
 assert.deepEqual(applyNativeCreatorDocumentOperation(forged,{expectedOwner:forged,requestId:'forged',operation:rename(owner)},NOW),{ok:false,reason:'invalid'});
 const stale=structuredClone(owner);stale.revision++;
 assert.deepEqual(applyNativeCreatorDocumentOperation(owner,{expectedOwner:stale,requestId:'stale',operation:rename(owner)},NOW),{ok:false,reason:'conflict'});
 const result=applyNativeCreatorDocumentOperation(owner,{expectedOwner:owner,requestId:'invalid',operation:{type:'rename',itemId:owner.document.parseResult.canonical.items[0].itemId,title:42} as never},NOW);
 assert.equal(result.ok,false);if(!result.ok)assert.notEqual(result.reason,'document-capacity');assert.equal(JSON.stringify(owner),before);
});
test('valid restore journal reaches owner16M capacity while each document stays within4M',()=>{
 let owner=fixture(true),successfulRestores=0,rejected=false;
 for(let i=0;i<4;i++){
  const document=structuredClone(owner.document);document.title=`R${i}`;assert(validateNativeCreatorDocument(document));
  const source={storageKey:'flow:text-authoring:drafts:v1' as const,draftId:owner.source.draftId,versionId:`large-restore-${i}`,revisionId:document.revision.revisionId,documentJson:JSON.stringify(document)};
  assert(source.documentJson.length<=NATIVE_CREATOR_DOCUMENT_JSON_LIMIT);
  const before=JSON.stringify(owner),result=restoreNativeCreatorDocument(owner,{expectedOwner:owner,requestId:`restore-${i}`,source},NOW);
  if(!result.ok){assert.equal(result.reason,'document-capacity');assert.equal(JSON.stringify(owner),before);rejected=true;break;}
  assert(result.changed);owner=result.owner;successfulRestores++;assert(validateNativeCreatorDocumentOwner(owner));
 }
 assert(successfulRestores>=1);assert(rejected);
});
