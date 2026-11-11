import assert from 'node:assert/strict';
import test from 'node:test';
import {createProgramData,createProgramEnvelope} from './program-data';
import {programClone} from './contract';
import {textWorkspaceModel as M} from './text-workspace';
import {captureAlphaAccount} from './alpha-persistence/program-adapter';
import {createAlphaFakeServer} from './alpha-persistence/fake-server';
import {createAlphaMemoryRecovery} from './alpha-persistence/local-recovery';
import {createAlphaHttpRepository} from './alpha-sync/http-repository';
import {createAlphaSyncController} from './alpha-sync/controller';
import {ALPHA_ENVIRONMENT_POLICY} from './alpha-persistence/environment';

// authprobe (운영 r3, 11/11 08:27 태블릿): waking up, the SDK refreshed the token twice 300ms apart; the workspace rebinds
// its fixed-token repository on each refresh (AlphaWorkspace: bindSession, then resolvePending when a save waits, else
// the automatic read). Repro of what the screen then showed.
const OWNER='11111111-1111-4111-8111-111111111111';
const CONFIG={stage:'test' as const,url:`https://${ALPHA_ENVIRONMENT_POLICY.developmentProject}.supabase.co`,publishableKey:'sb_publishable_synthetic_authprobe',redirectUrl:'http://localhost:3000/auth/callback'};
function setup(){
  const data=createProgramData(),space=data.spaces[data.activeActorId];
  space.text=M.addDocument(space.text,{title:'합성 A'});const A=space.text.documents[0].id;space.text=M.editText(space.text,A,'- [ ] 합성 할 일');
  data.actors=[{id:OWNER,name:'합성',simulated:true}];data.spaces={[OWNER]:space};data.activeActorId=OWNER;
  const seed=captureAlphaAccount(createProgramEnvelope(data),OWNER,OWNER),server=createAlphaFakeServer([seed]),port=server.connect(server.issueSession(OWNER));
  const build=(raw:string)=>(current:typeof data)=>{const next=programClone(current);next.spaces[OWNER].text=M.editText(next.spaces[OWNER].text,A,raw);return{ok:true as const,data:next,changed:true,result:A};};
  // Tokens: one valid at a time; an older one answers 401 (as an expired JWT does after the wake-up refresh).
  const net={valid:'token-0',post:'ok' as 'ok'|'after',posts:0,lookups:0,delay:0,offline:false,log:[] as string[]};
  const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
  const request=(token:string)=>(async(input:RequestInfo|URL,init:RequestInit={})=>{
    const url=String(input),path=url.startsWith('/')?url:new URL(url).pathname;
    if(net.delay)await new Promise(r=>setTimeout(r,net.delay));
    if(net.offline){net.log.push('offline');throw Error('synthetic: asleep');}
    const ok=token===net.valid;net.log.push(`${path.replace(/^.*\//,'')}:${token}:${ok?200:401}`);
    if(path==='/auth/v1/user')return ok?response({id:OWNER,is_anonymous:false}):response({},401);
    if(!ok)return response({message:'JWT expired'},401);
    if(path.endsWith('flowme_alpha_social_open_v1'))return response({ok:true,value:true});
    if(path.endsWith('flowme_alpha_social_read_v1'))return response({ok:true,value:{account:server.exportForBackup(OWNER).account,context:{schema:'flowme-alpha-social-context/1',revision:0,ownActorId:'member-'+OWNER,actors:[{id:'member-'+OWNER,name:'합성'}],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}}}});
    const body=JSON.parse(String(init.body));
    if(body.kind==='lookup'){net.lookups++;return response(await port.lookup(body.requestId));}
    net.posts++;const result=await port.execute(body.command);
    if(net.post==='after'){net.offline=true;return new Response('<html>lost reply</html>',{status:502});}
    return response(result);
  }) as typeof fetch;
  const repo=(token:string)=>createAlphaHttpRepository(CONFIG,{userId:OWNER,accessToken:token},request(token),{social:true});
  return{A,net,repo,build};
}

test('authprobe: a save waiting when the tablet wakes is settled through the second of two quick token refreshes', async()=>{
  const s=setup(),controller=createAlphaSyncController({recovery:createAlphaMemoryRecovery(),requestId:()=>'save-1'});
  controller.bindSession(OWNER,s.repo('token-0'));assert(await controller.refresh());
  // The save went out before the sleep and its answer was lost: it waits ('저장 여부 확인 못 함').
  s.net.post='after';await controller.mutate('합성 저장',s.build('- [ ] 합성 할 일 고침'));s.net.post='ok';
  assert(controller.snapshot().pending,'a save waits');
  // Wake: the old token has expired; refresh 1 gives token A, the host rebinds and checks the waiting save; 300ms later
  // refresh 2 gives token B (A stays valid as a JWT until it expires; the server here accepts only the latest).
  s.net.offline=false;s.net.valid='token-a';s.net.delay=150;
  controller.bindSession(OWNER,s.repo('token-a'));const first=controller.resolvePending(false);
  await new Promise(r=>setTimeout(r,100));
  s.net.valid='token-b';
  controller.bindSession(OWNER,s.repo('token-b'));const second=controller.snapshot().pending?controller.resolvePending(false):Promise.resolve(true);
  const results=await Promise.all([first,second]);
  const snap=controller.snapshot();
  // The second rebind checks the waiting save with its own session and settles it; nothing stays at 'checking-result'.
  assert.equal(results[1],true);assert.equal(snap.status,'saved');assert.equal(snap.pending,null);assert.equal(snap.lastError,null);
  assert(s.net.log.includes('user:token-b:200'),'checked with the fresh session');
});
