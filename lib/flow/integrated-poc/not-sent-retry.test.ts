import assert from 'node:assert/strict';
import test from 'node:test';
import {createProgramData,createProgramEnvelope} from './program-data';
import {programClone} from './contract';
import {textWorkspaceModel as M} from './text-workspace';
import {captureAlphaAccount,commandFromProgramTransition} from './alpha-persistence/program-adapter';
import {createAlphaFakeServer} from './alpha-persistence/fake-server';
import {createAlphaLocalRecovery} from './alpha-persistence/local-recovery';
import {isAccountForOwner} from './alpha-auth/account-access';
import {createAlphaHttpRepository} from './alpha-sync/http-repository';
import {createAlphaSyncController} from './alpha-sync/controller';
import {ALPHA_ENVIRONMENT_POLICY} from './alpha-persistence/environment';
import {computeWriting} from './writing-compute.worker';
import {createWritingCompute} from './writing-compute';
import {programTextTransition} from './program-text-transition';

// int7b r3 (11/11, 기타 int7b QA P1): a save refused before it was sent (the preflight GET /auth/v1/user 503) shows
// '보내지 못함 · 다시 저장'. Any read after it (the 20 s poll, a return to the tab, here the click on [다시 저장]) made the
// draft 'recovery-required' and no longer retryable: [다시 저장] was 'unresolved' (POST 0) and the next read called it
// '다른 변경이 먼저 저장됨', also after a reload. Only a change that really came first keeps the draft protected.
const OWNER='11111111-1111-4111-8111-111111111111';
const CONFIG={stage:'test' as const,url:`https://${ALPHA_ENVIRONMENT_POLICY.developmentProject}.supabase.co`,publishableKey:'sb_publishable_synthetic_r3',redirectUrl:'http://localhost:3000/auth/callback'};
function memoryStorage(){const map=new Map<string,string>();return{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);},key:(i:number)=>[...map.keys()][i]??null,get length(){return map.size;},clear:()=>map.clear()};}
function inlineWorker(){
  const listeners:((event:MessageEvent)=>void)[]=[];
  return{postMessage(message:{identity:Parameters<typeof computeWriting>[0];payload:Parameters<typeof computeWriting>[1]}){
    const reply=(()=>{try{return computeWriting(message.identity,message.payload);}catch(error){return{identity:message.identity,ok:false,reason:String(error),metrics:{computeMs:0}};}})();
    setTimeout(()=>{for(const listen of listeners)listen({data:JSON.parse(JSON.stringify(reply))} as MessageEvent);},0);},
    terminate(){},addEventListener(type:string,listen:(event:MessageEvent)=>void){if(type==='message')listeners.push(listen);}} as unknown as Worker;
}
function setup(){
  const data=createProgramData(),space=data.spaces[data.activeActorId];
  space.text=M.addDocument(M.addDocument(space.text,{title:'합성 S'}),{title:'합성 T'});
  const A=space.text.documents.find(d=>d.title==='합성 S')!.id,B=space.text.documents.find(d=>d.title==='합성 T')!.id;
  space.text=M.editText(M.editText(space.text,A,'- [ ] 할 일 둘'),B,'- [ ] 다른 문서');
  data.actors=[{id:OWNER,name:'합성',simulated:true}];data.spaces={[OWNER]:space};data.activeActorId=OWNER;
  const seed=captureAlphaAccount(createProgramEnvelope(data),OWNER,OWNER),server=createAlphaFakeServer([seed]);
  const port=server.connect(server.issueSession(OWNER));
  const state={auth:'ok',posts:0};
  const context={schema:'flowme-alpha-social-context/1',revision:0,ownActorId:'member-'+OWNER,actors:[{id:'member-'+OWNER,name:'합성'}],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}};
  const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
  const request=(async(input:RequestInfo|URL,init:RequestInit={})=>{
    const url=String(input),path=url.startsWith('/')?url:new URL(url).pathname;
    if(path==='/auth/v1/user'){if(state.auth!=='ok'){const code=Number(state.auth);state.auth='ok';return response({},code);}return response({id:OWNER,is_anonymous:false});}
    if(path.endsWith('flowme_alpha_social_open_v1'))return response({ok:true,value:true});
    if(path.endsWith('flowme_alpha_social_read_v1'))return response({ok:true,value:{account:server.exportForBackup(OWNER).account,context}});
    const body=JSON.parse(String(init.body));
    if(body.kind==='lookup')return response(await port.lookup(body.requestId));
    state.posts++;return response(await port.execute(body.command));
  }) as typeof fetch;
  const storage=memoryStorage();
  const open=()=>{
    const repository=createAlphaHttpRepository(CONFIG,{userId:OWNER,accessToken:'synthetic-r3-only'},request,{social:true});
    const compute=createWritingCompute(inlineWorker);
    const recovery=createAlphaLocalRecovery(storage as never,isAccountForOwner as never,{compact:true,writingCompute:compute});
    const controller=createAlphaSyncController({recovery,writingCompute:compute});
    controller.bindSession(OWNER,repository);
    const save=(expected:typeof space.text,next:typeof space.text,generation:number)=>controller.mutate('쓰기',current=>programTextTransition(current,{actorId:OWNER,documentId:A,expected,next}),
      {groupId:`text:${A}`,alphaWriting:{documentId:A,expected,next,workingGeneration:generation}});
    return{controller,save};
  };
  /** Another device's save (the server's revision moves on). */
  const external=async()=>{const account=server.exportForBackup(OWNER).account;
    const command=commandFromProgramTransition(account,seed.references,'other-device',current=>{const next=programClone(current);next.spaces[OWNER].text=M.editText(next.spaces[OWNER].text,B,'- [ ] 다른 기기');return{ok:true as const,data:next,changed:true,result:B};});
    assert((await port.execute(command)).ok);};
  return{A,state,open,external,stored:()=>M.raw(M.getDocument(server.exportForBackup(OWNER).account.space.text,A)!)};
}
async function notSent(s:ReturnType<typeof setup>,session:ReturnType<ReturnType<typeof setup>['open']>){
  assert(await session.controller.refresh());
  const before=session.controller.snapshot().account!.space.text,typed=M.editText(before,s.A,'- [ ] 할 일 둘x');
  s.state.auth='503';
  assert(!(await session.save(before,typed,1)).ok);assert.equal(s.state.posts,0);
  const failed=session.controller.snapshot();
  assert.equal(failed.status,'not-sent');assert.equal(failed.retryableRejectedDraft,true);
  return{before,typed};
}

for(const way of ['same-draft','typed-on','read-between','read-twice'] as const)test(`r3: not sent (preflight 503), then ${way}: sent, saved, no conflict`,async()=>{
  const s=setup(),session=s.open(),{before,typed}=await notSent(s,session);
  if(way==='read-between'||way==='read-twice'){
    // The QA path: a read comes between the refusal and [다시 저장] (the poll, the return to the tab).
    for(let i=0;i<(way==='read-twice'?2:1);i++)assert(await session.controller.refresh());
    const read=session.controller.snapshot();
    assert.equal(read.status,'not-sent','still not sent, not recovery-required or a conflict');assert.equal(read.retryableRejectedDraft,true);
  }
  const next=way==='typed-on'?M.editText(before,s.A,'- [ ] 할 일 둘xz'):typed;
  const second=await session.save(before,next,way==='typed-on'?2:1);
  assert(second.ok,second.ok?'':second.reason);
  assert.equal(s.state.posts,1);assert.equal(s.stored(),M.raw(M.getDocument(next,s.A)!));
  const done=session.controller.snapshot();assert.equal(done.draft,null);assert.equal(done.status,'saved');
  session.controller.dispose();
});

test('r3: a draft already stuck (reloaded after it) is not a conflict once read: the next save goes', async()=>{
  const s=setup(),first=s.open();await notSent(s,first);first.controller.dispose();
  // Reload: the recovered draft has no rejection proof of this session.
  const again=s.open();assert.equal(again.controller.snapshot().status,'recovery-required');
  assert(await again.controller.refresh());
  const read=again.controller.snapshot();
  assert.equal(read.status,'not-sent');assert.equal(read.retryableRejectedDraft,true);assert(read.draft,'the draft is kept until a save replaces it');
  const before=read.account!.space.text,next=M.editText(before,s.A,'- [ ] 할 일 둘z');
  const saved=await again.save(before,next,1);
  assert(saved.ok,saved.ok?'':saved.reason);assert.equal(s.state.posts,1);assert.equal(s.stored(),'- [ ] 할 일 둘z');
  assert.equal(again.controller.snapshot().draft,null);again.controller.dispose();
});

test('r3: a change from another device first keeps the draft protected (a conflict; nothing sent)', async()=>{
  for(const reload of [false,true]){
    const s=setup();let session=s.open();const{before,typed}=await notSent(s,session);
    await s.external();
    if(reload){session.controller.dispose();session=s.open();}
    assert(await session.controller.refresh());
    const read=session.controller.snapshot();
    assert.equal(read.status,'conflict',`reload ${reload}`);assert.equal(read.retryableRejectedDraft,false);
    const refused=await session.save(before,typed,1);
    assert(!refused.ok);assert.equal(s.state.posts,0);assert.notEqual(s.stored(),'- [ ] 할 일 둘x');
    session.controller.dispose();
  }
});
