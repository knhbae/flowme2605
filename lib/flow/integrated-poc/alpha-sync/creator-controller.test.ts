import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlphaSyncController } from './controller';
import { createAlphaMemoryRecovery } from '../alpha-persistence/local-recovery';
import { ALPHA_SCHEMA, type AlphaAccount, type AlphaCommand, type AlphaReceipt, type AlphaRepository } from '../alpha-persistence/contract';
import { createProgramPrivateSpace } from '../program-data';
import { canonicalJson, detached } from '../alpha-persistence/json';
import { privateChanges } from '../alpha-persistence/program-adapter';
import { dispatchAlphaCreatorCommand, executeAlphaCreatorIntent } from '../alpha-creator/dispatch-source';
import type { AlphaCreatorIntent } from '../alpha-creator/contract';
import { fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../../personal-workspace-poc-authoring';
import { CATALOG_LIBRARY_VERSION } from '../catalog-library';
import { buildCatalogContent } from '../catalog-content-source';
const now='2026-09-21T12:00:00.000Z';
function setup() {
  let account:AlphaAccount={schema:ALPHA_SCHEMA,ownerId:'a',revision:0,source:{schema:'flowme-integrated-product-poc/1',actorId:'a',revision:0},space:createProgramPrivateSpace(),legacyUndo:[],legacyReceipts:[]};
  const ledger=new Map<string,{command:AlphaCommand;receipt:AlphaReceipt;inverse:ReturnType<typeof privateChanges>}>();
  const calls:AlphaCommand[]=[];
  const repo:AlphaRepository={read:async()=>({ok:true,value:detached(account)}),lookup:async id=>({ok:true,value:detached(ledger.get(id)?.receipt??null)}),execute:async command=>{
    calls.push(detached(command)); const prior=ledger.get(command.requestId);
    if(prior)return canonicalJson(prior.command)===canonicalJson(command)?{ok:true,value:detached(prior.receipt)}:{ok:false,reason:'idempotency-conflict'};
    if(command.expectedRevision!==account.revision)return{ok:false,reason:'revision-conflict'};
    const before=detached(account); let resultId:string|undefined,changes:ReturnType<typeof privateChanges>;
    if(command.kind==='creator') {const result=dispatchAlphaCreatorCommand(account,command);if(!result.ok)return{ok:false,reason:'invalid'};if(!result.changed)return{ok:false,reason:'no-change'};changes=result.changes;resultId=result.result;}
    else if(command.kind==='undo-creator'){const old=ledger.get(command.operationId);if(!old||old.receipt.revision!==account.revision)return{ok:false,reason:'undo-conflict'};changes=old.inverse;}
    else return{ok:false,reason:'invalid'};
    for(const change of changes) {if(change.present)(account.space as any)[change.field]=detached(change.value);else delete (account.space as any)[change.field];}
    account.revision++;
    const receipt:AlphaReceipt={kind:command.kind,requestId:command.requestId,revision:account.revision,changed:true,...(resultId?{resultId}:{})};
    ledger.set(command.requestId,{command:detached(command),receipt,inverse:privateChanges(account.space,before.space)});return{ok:true,value:detached(receipt)};
  }};
  const recovery=createAlphaMemoryRecovery(); let serial=0;
  const controller=createAlphaSyncController({recovery,requestId:()=>`wire-${++serial}`});controller.bindSession('a',repo);
  return{controller,repo,recovery,calls,account:()=>detached(account)};
}
const working:AlphaCreatorIntent={type:'working',now,working:{draftId:'draft-a',title:'제작 제목',rawText:'# 제작 제목\n## 준비\n- [ ] 한글 작업',baseRecordRevision:null}};
test('server-only creator limit reaches UI reason without changing confirmed data or losing draft',async()=>{
  const f=setup();f.controller.bindSession('a',{...f.repo,execute:async()=>({ok:false,reason:'limit'})});await f.controller.refresh();
  const before=f.controller.snapshot().account;
  assert.deepEqual(await run(f,working,false),{ok:false,reason:'limit'});
  assert.deepEqual(f.controller.snapshot().account,before);assert.equal(f.controller.snapshot().pending,null);
  assert(f.controller.snapshot().draft);assert.equal(f.controller.snapshot().status,'recovery-required');
});
async function run(f:ReturnType<typeof setup>,intent:AlphaCreatorIntent,history=true) {
  return f.controller.mutate('creator', data=>executeAlphaCreatorIntent(data,'a',intent,'local-id'),{alphaCreator:intent,history});
}
function save(f:ReturnType<typeof setup>):AlphaCreatorIntent {
  const w=f.account().space.creatorWorkspace!;
  return {type:'library-action',now,action:{type:'save',draftId:w.working!.draftId,rawText:w.working!.rawText,title:w.working!.title,sourceFingerprint:fingerprint(w.working!.rawText),expectedLibraryRevision:w.library.revision,now}};
}
test('M4 working autosave does not offer server Undo or synthesize saved history; explicit save Undo/Redo use server ledger',async()=>{
  const f=setup();await f.controller.refresh();assert((await run(f,working,false)).ok);assert.equal(f.controller.snapshot().canUndo,false);
  assert.equal(Object.keys(f.account().space.creatorWorkspace!.library.records).length,0);
  assert((await run(f,save(f))).ok);assert.equal(f.controller.snapshot().canUndo,true);assert.equal(f.account().space.creatorWorkspace!.library.records['draft-a'].recordRevision,1);
  assert((await f.controller.undo()).ok);assert.equal(Object.keys(f.account().space.creatorWorkspace!.library.records).length,0);
  assert((await f.controller.redo()).ok);assert.equal(f.account().space.creatorWorkspace!.library.records['draft-a'].recordRevision,1);
  assert.deepEqual(f.calls.map(c=>c.kind),['creator','creator','undo-creator','undo-creator']);
});
test('M4 lazy intent is read after local transition and server result ID replaces client random handoff ID',async()=>{
  const f=setup();await f.controller.refresh();await run(f,working,false);await run(f,save(f));
  const intent:AlphaCreatorIntent={type:'raw-handoff',draftId:'draft-a',expectedRecordRevision:1,today:'2026-09-21',now};let built=false;
  const outcome=await f.controller.mutate('handoff',data=>{built=true;const result=executeAlphaCreatorIntent(data,'a',intent,'local-handoff');return result.ok?{...result,result:'incorrect-local-random-id'}:result;},{alphaCreator:()=>{assert(built);return intent;}});
  assert(outcome.ok,JSON.stringify(outcome));assert.equal(outcome.result,f.account().space.creatorWorkspace!.handoffs['draft-a'].documentId);assert.notEqual(outcome.result,'incorrect-local-random-id');
});
test('M4 lost working response survives reload with same semantic ID and never becomes explicit Undo',async()=>{
  const f=setup();f.controller.bindSession('a',{...f.repo,execute:async command=>{await f.repo.execute(command);throw Error('response lost');}});await f.controller.refresh();
  assert(!(await run(f,working,false)).ok);const pending=f.controller.snapshot().pending;assert.equal(pending?.kind,'creator');
  const reload=createAlphaSyncController({recovery:f.recovery});reload.bindSession('a',f.repo);assert(await reload.resolvePending());assert.equal(reload.snapshot().canUndo,false);assert.equal(f.account().revision,1);assert.equal(f.calls.length,1);
});
test('M4 creator mutation without semantic intent remains forbidden',async()=>{
  const f=setup();await f.controller.refresh();const result=await f.controller.mutate('forged',data=>executeAlphaCreatorIntent(data,'a',working,'local'));
  assert(!result.ok);assert.equal(f.calls.length,0);assert.equal(f.account().revision,0);
});

test('catalog intents execute on server without invoking a browser source builder', async () => {
  const f = setup(); await f.controller.refresh();
  const source = buildCatalogContent('moving-d30-basic'); assert(source.ok);
  const intents: AlphaCreatorIntent[] = [
    { type: 'catalog-library-import', catalogVersion: CATALOG_LIBRARY_VERSION, now },
    { type: 'catalog-content-import', draftId: 'catalog-draft', sourceSlug: source.content.sourceSlug, sourceVersionId: source.content.versionId, now },
  ];
  for (const intent of intents) {
    const result = await f.controller.mutate('catalog', () => { throw Error('client-source-builder-called'); }, { alphaCreator: intent });
    assert(result.ok, JSON.stringify(result));
  }
  assert.deepEqual(f.calls.map(row => row.kind), ['creator', 'creator']);
  assert.equal(f.account().space.catalogLibrary?.catalogVersion, CATALOG_LIBRARY_VERSION);
  assert.equal(f.account().space.creatorWorkspace?.library.records['catalog-draft']?.status, 'active');
});

test('M4 snapshot exposes in-flight read busy state and clears it after settlement',async()=>{
  const f=setup();let finish!:()=>void;
  f.controller.bindSession('a',{...f.repo,read:async()=>{await new Promise<void>(resolve=>{finish=resolve;});return f.repo.read();}});
  const read=f.controller.refresh();assert.equal(f.controller.snapshot().busy,true);assert.equal(await f.controller.discardConflict(),false);
  finish();assert(await read);assert.equal(f.controller.snapshot().busy,false);assert.equal(f.calls.length,0);
});
