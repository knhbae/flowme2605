import assert from 'node:assert/strict';
import test from 'node:test';
import {createProgramData,createProgramEnvelope} from './program-data';
import {programClone} from './contract';
import {textWorkspaceModel as M} from './text-workspace';
import {captureAlphaAccount,commandFromProgramTransition} from './alpha-persistence/program-adapter';
import {createAlphaFakeServer} from './alpha-persistence/fake-server';
import {createAlphaClient} from './alpha-persistence/client';
import {createAlphaMemoryRecovery} from './alpha-persistence/local-recovery';
import {privateReceiptMatches} from './alpha-persistence/private-receipt';
import {isAccountForOwner} from './alpha-auth/account-access';
import {createAlphaHttpRepository} from './alpha-sync/http-repository';
import {createAlphaSyncController} from './alpha-sync/controller';
import {ALPHA_ENVIRONMENT_POLICY} from './alpha-persistence/environment';
import {canonicalJson,detached} from './alpha-persistence/json';
import {computeWriting} from './writing-compute.worker';
import type {WritingCompute} from './writing-compute';
import {programErrorMessage} from './ui-contract';
import {createProgramTextDraft} from './program-text-draft';
import {mergeProgramTextWorkspace} from './text-merge';
import type {AlphaRepository,AlphaAccount,AlphaCommand,AlphaReceipt} from './alpha-persistence/contract';

const OWNER='11111111-1111-4111-8111-111111111111';
const CONFIG={stage:'test' as const,url:`https://${ALPHA_ENVIRONMENT_POLICY.developmentProject}.supabase.co`,publishableKey:'sb_publishable_synthetic_delivery',redirectUrl:'http://localhost:3000/auth/callback'};
for(const duringFlight of [false,true])test(`A3 newer read during a draft flight preserves other documents on the next save (${duringFlight})`,async()=>{
  const s=setup(),initial=s.account().space.text;let latest=initial,writes=0;
  const draft=createProgramTextDraft(initial,s.A,async(next,_label,options)=>{
    const merged=mergeProgramTextWorkspace(options!.expectedWorkspace!,next,latest);assert(merged);latest=merged;writes++;
    if(writes===1){latest=M.editText(latest,s.B,'- [ ] 원격 문서 최신 원문');assert.equal(draft.synchronize(latest),false,'an in-flight editor does not replace its input');if(duringFlight)assert(draft.updateRaw('- [ ] 보관할 입력 첫째 둘째'));}
    return true;
  },()=>{});
  assert(draft.updateRaw('- [ ] 보관할 입력 첫째'));assert(await draft.save());
  if(!duringFlight){assert(draft.updateRaw('- [ ] 보관할 입력 첫째 둘째'));assert(await draft.save());}
  assert.equal(writes,2);assert.equal(M.raw(M.getDocument(latest,s.A)),'- [ ] 보관할 입력 첫째 둘째');assert.equal(M.raw(M.getDocument(latest,s.B)),'- [ ] 원격 문서 최신 원문');assert.equal(draft.getState().dirty,false);
});
function setup(){
  const data=createProgramData(),space=data.spaces[data.activeActorId];
  space.text=M.addDocument(M.addDocument(space.text,{title:'합성 A'}),{title:'합성 B'});
  const A=space.text.documents.find(d=>d.title==='합성 A')!.id,B=space.text.documents.find(d=>d.title==='합성 B')!.id;
  space.text=M.editText(M.editText(space.text,A,'- [ ] 보관할 입력'),B,'- [ ] 다른 문서');
  data.actors=[{id:OWNER,name:'합성',simulated:true}];data.spaces={[OWNER]:space};data.activeActorId=OWNER;
  const seed=captureAlphaAccount(createProgramEnvelope(data),OWNER,OWNER),server=createAlphaFakeServer([seed]);
  const port=server.connect(server.issueSession(OWNER));
  const build=(documentId:string,raw:string)=>(current:typeof data)=>{const next=programClone(current);next.spaces[OWNER].text=M.editText(next.spaces[OWNER].text,documentId,raw);return{ok:true as const,data:next,changed:true,result:documentId};};
  const command=(account:AlphaAccount,id:string,documentId=A,raw='- [ ] 보관할 입력 고침')=>commandFromProgramTransition(account,seed.references,id,build(documentId,raw));
  return{A,B,seed,server,port,build,command,account:()=>server.exportForBackup(OWNER).account};
}
function http(s:ReturnType<typeof setup>){
  const state={auth:'ok',post:'ok',posts:0,lookups:0};
  const context={schema:'flowme-alpha-social-context/1',revision:0,ownActorId:'member-'+OWNER,actors:[{id:'member-'+OWNER,name:'합성'}],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}};
  const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
  const request=(async(input:RequestInfo|URL,init:RequestInit={})=>{
    const url=String(input),path=url.startsWith('/')?url:new URL(url).pathname;
    if(path==='/auth/v1/user'){
      if(state.auth==='throw')throw Error('synthetic preflight timeout');
      if(state.auth==='invalid')return response({id:'different-synthetic-owner'});
      if(state.auth!=='ok')return response({},Number(state.auth));
      return response({id:OWNER,is_anonymous:false});
    }
    if(path.endsWith('flowme_alpha_social_open_v1'))return response({ok:true,value:true});
    if(path.endsWith('flowme_alpha_social_read_v1'))return response({ok:true,value:{account:s.account(),context}});
    const body=JSON.parse(String(init.body));
    if(body.kind==='lookup'){state.lookups++;return response(await s.port.lookup(body.requestId));}
    state.posts++;
    if(state.post==='before')return new Response('<html>unavailable</html>',{status:502});
    if(state.post==='throw')throw Error('synthetic post timeout');
    const result=await s.port.execute(body.command);
    if(state.post==='after')return new Response('<html>lost reply</html>',{status:502});
    return response(result);
  }) as typeof fetch;
  return{state,port:createAlphaHttpRepository(CONFIG,{userId:OWNER,accessToken:'synthetic-delivery-only'},request,{social:true})};
}
for(const auth of ['503','throw','401','403','invalid'])test(`A1 preflight ${auth}: POST 0, pending 0, draft unchanged`,async()=>{
  const s=setup(),h=http(s),client=createAlphaClient(isAccountForOwner);client.bindSession(OWNER,h.port);assert(await client.refresh());
  h.state.auth=auth;const command=s.command(client.snapshot().state!.confirmed!,'preflight-'+auth);
  assert.equal(await client.execute(command),false);const snap=client.snapshot();
  assert.equal(h.state.posts,0);assert.equal(snap.state!.pending,null);assert.equal(canonicalJson(snap.state!.draft),canonicalJson(command));assert.equal(s.account().revision,0);
  assert.equal(h.port.wasNotSubmitted!({...command,requestId:'different'}),false,'proof belongs to the exact command');
  if(auth==='503'||auth==='throw'){
    assert.equal(snap.status,'not-sent');assert.equal(snap.retryableRejectedDraft,true);h.state.auth='ok';
    const next={...command,requestId:'retry-'+auth};assert(await client.execute(next,{retryRejectedDraft:true}));assert.equal(s.account().revision,1);
  }else assert.equal(snap.status,'session-expired');
});
for(const post of ['before','throw','after'])test(`A1 POST ${post}: uncertain outcome keeps exact request`,async()=>{
  const s=setup(),h=http(s),client=createAlphaClient(isAccountForOwner);client.bindSession(OWNER,h.port);assert(await client.refresh());h.state.post=post;
  const command=s.command(client.snapshot().state!.confirmed!,'post-'+post);assert.equal(await client.execute(command),false);
  assert.equal(canonicalJson(client.snapshot().state!.pending),canonicalJson(command));assert.equal(h.port.wasNotSubmitted!(command),false);
  h.state.auth='503';assert.equal(await client.resolvePending(true),false);assert.equal(canonicalJson(client.snapshot().state!.pending),canonicalJson(command));
});
test('A1 preflight proof cannot clear an earlier ambiguous request on replay',async()=>{
  const s=setup();let attempted=0;const port:AlphaRepository={...s.port,references:()=>s.seed.references,execute:async()=>{attempted++;return{ok:false,reason:'unavailable'};},wasNotSubmitted:()=>attempted>1};
  const client=createAlphaClient(isAccountForOwner);client.bindSession(OWNER,port);assert(await client.refresh());const command=s.command(s.account(),'replay');
  assert.equal(await client.execute(command),false);assert.equal(await client.resolvePending(true),false);assert.equal(attempted,2);assert.equal(client.snapshot().state!.pending!.requestId,'replay');
});
for(const mode of ['lost-after','lost-before','lookup-fails','wrong-receipt','session-switch'])test(`A2 bounded private confirmation ${mode}`,async()=>{
  const s=setup();let writes=0,lookups=0;const bodies:string[]=[];let controller:ReturnType<typeof createAlphaSyncController>;
  const port:AlphaRepository={...s.port,references:()=>s.seed.references,execute:async command=>{
    bodies.push(canonicalJson(command));writes++;
    if(writes===1){if(mode!=='lost-before'&&mode!=='session-switch')await s.port.execute(command);return{ok:false,reason:'unavailable'};}
    return s.port.execute(command);
  },lookup:async requestId=>{lookups++;
    if(mode==='lookup-fails')return{ok:false,reason:'unavailable'};
    if(mode==='wrong-receipt')return{ok:true,value:{requestId:'wrong',revision:1,changed:true,kind:'change-private'}};
    return s.port.lookup(requestId);
  }};
  controller=createAlphaSyncController({recovery:createAlphaMemoryRecovery(),requestId:()=>`auto-${mode}`});controller.bindSession(OWNER,port);assert(await controller.refresh());
  const operation=controller.mutate('합성 저장',s.build(s.A,'- [ ] 자동 확인 입력'));
  if(mode==='session-switch')controller.bindSession(null,null);
  const result=await operation;
  if(mode==='lost-after'||mode==='lost-before'){
    assert(result.ok);assert.equal(controller.snapshot().pending,null);assert.equal(s.account().revision,1);assert.equal(writes,mode==='lost-after'?1:2);
    assert(bodies.every(body=>body===bodies[0]));assert.equal(M.raw(M.getDocument(s.account().space.text,s.A)),'- [ ] 자동 확인 입력');
  }else{assert(!result.ok);assert.equal(writes,1);if(mode!=='session-switch')assert(controller.snapshot().pending);}
  assert(lookups<=2);controller.dispose();
});
async function receiptFixture(){const s=setup(),before=s.account(),command=s.command(before,'receipt');assert(command.kind==='change-private');const result=await s.port.execute(command);assert(result.ok);return{...s,makeCommand:s.command,before,command,receipt:result.value,expected:s.account()};}
test('A3 newer unrelated document + position is accepted by client and worker; undo cannot overwrite it',async()=>{
  const s=await receiptFixture();assert((await s.port.execute(s.makeCommand(s.account(),'remote',s.B,'- [ ] 원격 문서 고침'))).ok);
  const candidate=s.account();candidate.space.position={...candidate.space.position,scrollTop:12};
  assert(privateReceiptMatches(s.before,s.command,candidate,s.receipt));
  assert(computeWriting({ownerId:OWNER,docId:s.A,workingGeneration:1,baseRevision:0,requestId:'worker-check'},{kind:'receipt',before:s.before,command:s.command,candidate,receipt:s.receipt}).ok);
  const recovery=createAlphaMemoryRecovery();assert(recovery.save({schema:'flowme-alpha-recovery/1',ownerId:OWNER,confirmed:s.before,pending:s.command,draft:s.command,references:s.seed.references}));
  const controller=createAlphaSyncController({recovery});controller.bindSession(OWNER,{...s.port,references:()=>s.seed.references,read:async()=>({ok:true,value:candidate})});
  assert(await controller.resolvePending(false));assert.equal(controller.snapshot().account!.revision,2);assert.equal(controller.snapshot().canUndo,false);controller.dispose();
});
for(const change of ['same-document','same-document-id','metadata','owner','wrong-request','wrong-revision','same-revision-different','document-order','other-private'])test(`A3 preserves guard ${change}`,async()=>{
  const s=await receiptFixture(),candidate=detached(s.expected),receipt=detached(s.receipt);candidate.revision++;
  if(change==='same-document')candidate.space.text=M.editText(candidate.space.text,s.A,'- [ ] 다른 입력');
  if(change==='same-document-id')M.getDocument(candidate.space.text,s.A)!.lines[0].id+='-other';
  if(change==='metadata')candidate.space.text.folders[0].title+='변경';
  if(change==='owner')candidate.ownerId='22222222-2222-4222-8222-222222222222';
  if(change==='wrong-request')receipt.requestId='wrong';
  if(change==='wrong-revision')receipt.revision++;
  if(change==='same-revision-different'){candidate.revision--;candidate.space.text=M.editText(candidate.space.text,s.B,'- [ ] 무관하지만 같은 판본');}
  if(change==='document-order')candidate.space.text.documents.reverse();
  if(change==='other-private')candidate.space.archivedDocumentIds.push(s.B);
  assert.equal(privateReceiptMatches(s.before,s.command,candidate,receipt),false);
});
test('A3 recovery failure never clears the pending obligation',async()=>{
  const s=setup();let failClear=false;
  const client=createAlphaClient(isAccountForOwner,{load:()=>({ok:true,value:null}),save:value=>!failClear||value.pending!==null});
  client.bindSession(OWNER,{...s.port,references:()=>s.seed.references,execute:async command=>{const reply=await s.port.execute(command);failClear=true;return reply;}});
  assert(await client.refresh());assert.equal(await client.execute(s.command(s.account(),'storage-block')),false);
  assert.equal(s.account().revision,1);assert.equal(client.snapshot().state!.pending!.requestId,'storage-block');assert.equal(client.snapshot().status,'recovery-required');
});
for(const reason of ['alpha-domain-conflict','alpha-non-private-transition','worker-timeout','worker-identity'])test(`A1 worker ${reason} never claims another device saved`,async()=>{
  const s=setup();let writes=0;
  const compute={cancel(){},note(){},run:async(identity,payload)=>payload.kind==='save'?{identity,ok:false,reason,metrics:{computeMs:0}}:computeWriting(identity,payload)} as WritingCompute;
  const controller=createAlphaSyncController({recovery:createAlphaMemoryRecovery(),writingCompute:compute,requestId:()=>`worker-${reason}`});
  controller.bindSession(OWNER,{...s.port,references:()=>s.seed.references,execute:async command=>{writes++;return s.port.execute(command);}});assert(await controller.refresh());
  const before=controller.snapshot().account!.space.text,next=M.editText(before,s.A,'- [ ] 입력 유지');
  const result=await controller.mutate('쓰기',s.build(s.A,'- [ ] 입력 유지'),{alphaWriting:{documentId:s.A,expected:before,next,workingGeneration:1}});
  assert(!result.ok);assert.equal(result.reason,reason.startsWith('worker-')?'worker-error':'writing-preservation');assert.equal(writes,0);assert.equal(controller.snapshot().pending,null);assert.equal(s.account().revision,0);controller.dispose();
});
test('A3 Flow changes and metadata-only submitted text do not enter the newer-document exception',async()=>{
  const s=await receiptFixture(),candidate=detached(s.expected);candidate.revision++;
  candidate.space.text.flows.push({...candidate.space.text.documents[0],id:'synthetic-flow',private:true,sourceVersion:'synthetic-version'});
  assert.equal(privateReceiptMatches(s.before,s.command,candidate,s.receipt),false);
  const metadata=detached(s.before);metadata.space.text.folders[0].title+=' 이름';metadata.revision++;
  const command={...s.command,changes:[{field:'text' as const,present:true as const,value:metadata.space.text}]};
  const later=detached(metadata);later.revision++;later.space.text=M.editText(later.space.text,s.A,'- [ ] 같은 문서 바뀜');
  assert.equal(privateReceiptMatches(s.before,command,later,s.receipt),false);
});
test('A1 copy separates not sent, invalid readback, preservation, worker failure and conflict',()=>{
  const reasons=['not-sent','readback-invalid','writing-preservation','worker-error','conflict'];
  assert.equal(new Set(reasons.map(programErrorMessage)).size,reasons.length);
  for(const reason of reasons.slice(0,4))assert(!programErrorMessage(reason).includes('다른 변경이 먼저'));
});
